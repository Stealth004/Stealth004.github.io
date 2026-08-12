import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);

if (scripts.length !== 2) throw new Error(`Expected 2 script blocks; found ${scripts.length}`);
scripts.forEach((source, index) => new vm.Script(source, { filename: `inline-${index + 1}.js` }));

const context = { window: {} };
vm.createContext(context);
new vm.Script(scripts[0], { filename: 'model.js' }).runInContext(context);
const model = context.window.FW_MODEL;

if (!model) throw new Error('FW_MODEL was not exposed');
if (model.PROFILES.length !== 5) throw new Error('Expected four modern profiles and one historical profile');

function ruleByKey(current, device, key) {
  const found = current[device].find(rule => rule.key === key);
  if (!found) throw new Error(`Missing ${device}.${key}`);
  return found;
}

for (const profile of model.PROFILES) {
  const errors = model.validateProfile(profile);
  if (errors.length) throw new Error(`${profile.id}: ${errors.join(', ')}`);

  const fieldCount = Object.values(profile.answers).flat().length * model.fieldNames(profile).length;
  if (fieldCount !== model.expectedFieldCount(profile)) {
    throw new Error(`${profile.id}: expected ${model.expectedFieldCount(profile)} selectable fields, got ${fieldCount}`);
  }

  const canonical = model.cloneAnswers(profile);
  const fields = model.fieldsCorrect(profile, canonical);
  if (fields.correct !== fieldCount || fields.total !== fieldCount) {
    throw new Error(`${profile.id}: canonical field score is not ${fieldCount}/${fieldCount}`);
  }

  for (const [device, rules] of Object.entries(profile.answers)) {
    for (const expected of rules) {
      for (const field of model.fieldNames(profile)) {
        const options = model.fieldOptions(profile, field);
        if (!options.includes(expected[field])) {
          throw new Error(`${profile.id}: UI cannot select ${device}.${expected.key}.${field}=${expected[field]}`);
        }

        const isolated = model.cloneAnswers(profile);
        const target = ruleByKey(isolated, device, expected.key);
        const alternative = options.find(value => value && value !== expected[field]);
        if (!alternative) throw new Error(`${profile.id}: no isolation alternative for ${field}`);
        target[field] = alternative;
        const isolatedScore = model.fieldsCorrect(profile, isolated);
        if (isolatedScore.correct !== fieldCount - 1 || isolatedScore.total !== fieldCount) {
          throw new Error(`${profile.id}: isolated field failure changed more than one field point for ${device}.${expected.key}.${field}`);
        }
      }
    }
  }

  if (!profile.historical) {
    const relationships = model.relationships(profile, canonical);
    if (relationships.length !== 10 || relationships.some(check => !check.ok || !check.detail)) {
      throw new Error(`${profile.id}: canonical relationships are not 10/10 with remediation detail`);
    }

    for (const test of profile.tests) {
      const result = model.evaluatePacket(canonical[test.device], test);
      if (result.action !== test.expect) throw new Error(`${profile.id}: failed traffic test ${test.id}`);
      if (test.match && (!result.rule || result.rule.key !== test.match)) {
        throw new Error(`${profile.id}: traffic test ${test.id} did not match ${test.match}`);
      }
    }

    for (const device of model.DEVICES) {
      const ids = new Set(profile.tests.filter(test => test.device === device.id).map(test => test.id));
      for (const suffix of ['workload', 'mgmt', 'untrusted', 'dns', 'external-dns', 'telnet']) {
        if (!ids.has(`${device.id}-${suffix}`)) throw new Error(`${profile.id}: missing ${device.id}-${suffix} traffic test`);
      }
    }
  }
}

const prod = model.PROFILES.find(profile => profile.id === 'FW-701-PROD-01');
const waf = model.PROFILES.find(profile => profile.id === 'FW-701-WAF-02');
const legacy = model.PROFILES.find(profile => profile.historical);

if (model.expectedFieldCount(prod) !== 60 || model.expectedFieldCount(waf) !== 65 || model.expectedFieldCount(legacy) !== 60) {
  throw new Error('Profile field-count contract is incorrect');
}
if (!ruleByKey(waf.answers, 'api', 'dns') || !ruleByKey(waf.answers, 'api', 'audit')) {
  throw new Error('WAF profile must retain API DNS and add the explicit HTTP audit deny');
}
if (!waf.tests.some(test => test.id === 'api-http-audit' && test.match === 'audit')) {
  throw new Error('WAF profile lacks an explicit HTTP audit witness');
}

const witnesses = [
  ['workload_service', prod, current => { ruleByKey(current, 'db', 'workload').service = 'SMB'; }],
  ['management_scope', prod, current => { ruleByKey(current, 'db', 'management').source = 'APP-ZONE'; }],
  ['no_insecure_management', prod, current => { ruleByKey(current, 'db', 'management').service = 'TELNET'; }],
  ['dns_scope', prod, current => { ruleByKey(current, 'db', 'dns').destination = 'INTERNET'; }],
  ['no_public_data', prod, current => { ruleByKey(current, 'db', 'workload').source = 'INTERNET'; }],
  ['api_path', prod, current => { ruleByKey(current, 'api', 'workload').logging = 'NO LOG'; }],
  ['specific_scope', prod, current => { ruleByKey(current, 'db', 'workload').source = 'ANY'; }],
  ['ordered_paths', prod, current => { [current.db[0], current.db[3]] = [current.db[3], current.db[0]]; }],
  ['final_deny', prod, current => { ruleByKey(current, 'db', 'default').logging = 'NO LOG'; }],
  ['audit_stateful', waf, current => { current.api.splice(current.api.findIndex(rule => rule.key === 'audit'), 1); }]
];
for (const [id, profile, mutate] of witnesses) {
  const current = model.cloneAnswers(profile);
  mutate(current);
  const check = model.relationships(profile, current).find(item => item.id === id);
  if (!check || check.ok) throw new Error(`Relationship witness did not fail: ${id}`);
}

const critical = model.deploymentRating(94, 1);
if (critical.level !== 'critical' || critical.headline.includes('strong')) {
  throw new Error('Critical exposure can still receive a secure rating');
}
if (model.deploymentRating(94, 0).level !== 'secure') throw new Error('Clean high score should receive a secure rating');

const sampleTest = prod.tests[0];
if (/expected\s+(PERMIT|DENY)/i.test(model.testOptionLabel(sampleTest, false))) {
  throw new Error('Exam Mode test label leaks the expected outcome');
}
if (!/expected\s+(PERMIT|DENY)/i.test(model.testOptionLabel(sampleTest, true))) {
  throw new Error('Study Mode test label should reveal the expected outcome');
}

for (const cidr of ['10.10.10.1/26', '10.80.80.1/28', '10.80.50.1/28']) {
  const available = model.fieldOptions(legacy, 'source').includes(cidr) || model.fieldOptions(legacy, 'destination').includes(cidr);
  if (!available) throw new Error(`Legacy CIDR is unavailable in the UI: ${cidr}`);
}

const requiredMarkup = [
  'id="topology"',
  'id="trainingDrawer"',
  'id="topologySummary"',
  'TRAFFIC SOURCES',
  'NETWORK CORE + ENFORCEMENT',
  'PROTECTED SERVICES',
  'stateful policy enforcement points',
  'id="tracePath"',
  'id="node-core"',
  'id="node-dns"',
  'id="node-waf"',
  'id="match-db"',
  'Permitted connection',
  'Denied connection',
  'Test Connections',
  'Mode: Exam',
  'draggable="true"',
  'aria-describedby=',
  'scope="col"',
  'prefers-reduced-motion',
  'id="dbScore"',
  'id="nasScore"',
  'id="apiScore"',
  '↑ Up',
  '↓ Down',
  'Stateful',
  'TCP 27017',
  'TCP 445',
  'TCP 443',
  'TCP 22',
  'TCP/UDP 53'
];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Missing required markup: ${marker}`);
}

console.log('Advanced Firewall Rules PBQ QA passed: selectable legacy answers, 60/65-field profiles, field isolation, 10 relationship witnesses, expanded traffic tests, Exam/Study separation, critical-risk gating, topology, ordering, accessibility markers, and remediation detail.');
