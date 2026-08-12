import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);

if (scripts.length !== 2) throw new Error(`Expected two inline script blocks; found ${scripts.length}`);
scripts.forEach((source, index) => new vm.Script(source, { filename: `inline-${index + 1}.js` }));

const context = { window: {} };
vm.createContext(context);
new vm.Script(scripts[0], { filename: 'model.js' }).runInContext(context);
const model = context.window.PORTS_MODEL;

if (!model) throw new Error('PORTS_MODEL was not exposed');
if (model.LEGACY.length !== 26) throw new Error(`Expected 26 legacy placements; got ${model.LEGACY.length}`);
if (model.CORE.length < 40) throw new Error(`Expected at least 40 core records; got ${model.CORE.length}`);
if (model.EXTENDED.length < 10) throw new Error(`Expected at least 10 extended records; got ${model.EXTENDED.length}`);

function record(id, tier = 'core') {
  const source = tier === 'core' ? model.CORE : model.EXTENDED;
  const found = source.find(item => item.id === id);
  if (!found) throw new Error(`Missing ${tier} record ${id}`);
  return found;
}

const allModern = [...model.CORE, ...model.EXTENDED];
const ids = new Set();
for (const item of allModern) {
  if (ids.has(item.id)) throw new Error(`Duplicate modern id: ${item.id}`);
  ids.add(item.id);
  for (const key of ['id', 'tier', 'category', 'service', 'port', 'transport', 'scenario', 'function', 'security', 'icon', 'hint', 'confusedWith']) {
    if (!item[key]) throw new Error(`${item.id}: missing ${key}`);
  }
  if (!Array.isArray(item.objectives) || !item.objectives.length) throw new Error(`${item.id}: missing objective references`);
}

const corrections = [
  ['tftp', '69', 'UDP'],
  ['l2tp', '1701', 'UDP'],
  ['dns-query', '53', 'UDP'],
  ['dns-tcp', '53', 'TCP'],
  ['dhcp-server', '67', 'UDP'],
  ['dhcp-client', '68', 'UDP'],
  ['snmp-poll', '161', 'UDP'],
  ['snmp-trap', '162', 'UDP'],
  ['radius-auth', '1812', 'UDP'],
  ['radius-account', '1813', 'UDP'],
  ['ike', '500', 'UDP'],
  ['ipsec-natt', '4500', 'UDP'],
  ['esp', '50', 'IP protocol'],
  ['ah', '51', 'IP protocol'],
  ['pptp', '1723 + 47', 'TCP + IP protocol']
];
for (const [id, port, transport] of corrections) {
  const item = record(id);
  if (item.port !== port || item.transport !== transport) {
    throw new Error(`${id}: expected ${transport} ${port}, got ${item.transport} ${item.port}`);
  }
}

if (model.CORE.some(item => /stelnet/i.test(item.service))) throw new Error('Modern bank contains sTelnet');
if (!model.LEGACY.some(item => /stelnet/i.test(item.service))) throw new Error('Historical sTelnet reconstruction is missing');
if (record('esp').transport !== 'IP protocol' || record('ah').transport !== 'IP protocol') throw new Error('ESP/AH type separation failed');
if (!/IP protocol/.test(record('pptp').transport)) throw new Error('PPTP does not preserve GRE protocol distinction');

const port22 = model.CORE.filter(item => item.port === '22').map(item => item.service);
for (const service of ['SSH', 'SFTP', 'SCP']) {
  if (!port22.includes(service)) throw new Error(`TCP 22 service missing: ${service}`);
}

for (const profile of ['training', 'exam', 'extended']) {
  const size = profile === 'exam' ? 12 : 10;
  const a = model.selectAttempt(profile, 'mixed', 'QA-SEED', size);
  const b = model.selectAttempt(profile, 'mixed', 'QA-SEED', size);
  if (a.map(x => x.id).join('|') !== b.map(x => x.id).join('|')) throw new Error(`${profile}: seeded selection is not deterministic`);
  if (new Set(a.map(x => x.id)).size !== a.length) throw new Error(`${profile}: repeated scenario in one attempt`);
  if (a.length !== Math.min(size, profile === 'extended' ? model.EXTENDED.length : model.CORE.length)) throw new Error(`${profile}: wrong attempt size`);
  if (!a.some(x => x.securePair)) throw new Error(`${profile}: mixed attempt lacks a secure/insecure distinction`);
  if (!a.some(x => x.paired) && profile !== 'extended') throw new Error(`${profile}: mixed attempt lacks a paired-port distinction`);
  if (profile !== 'extended' && new Set(a.map(x => x.category)).size < 4) throw new Error(`${profile}: mixed attempt is not category balanced`);
}

const modernAttempt = model.selectAttempt('training', 'mixed', 'SCORING', 10);
const canonical = model.canonicalAnswers(modernAttempt, 'training');
const perfect = model.scoreAttempt(modernAttempt, canonical, 'training');
if (perfect.correct !== perfect.total || perfect.pct !== 100) throw new Error('Canonical modern attempt does not score 100%');

for (const item of modernAttempt) {
  for (const field of model.FIELDS) {
    const mutated = JSON.parse(JSON.stringify(canonical));
    mutated[item.id][field] = `wrong-${field}`;
    const score = model.scoreAttempt(modernAttempt, mutated, 'training');
    if (score.correct !== perfect.total - 1) throw new Error(`${item.id}.${field}: isolated mutation did not remove exactly one point`);
  }
}

const critical = JSON.parse(JSON.stringify(canonical));
critical[modernAttempt[0].id].security = model.DANGEROUS_SECURITY[0];
if (!model.scoreAttempt(modernAttempt, critical, 'training').risks.length) throw new Error('Critical exposure was not detected');

const legacyCanonical = model.canonicalAnswers(model.LEGACY, 'legacy');
const legacyPerfect = model.scoreAttempt(model.LEGACY, legacyCanonical, 'legacy');
if (legacyPerfect.pct !== 100 || legacyPerfect.total !== 52) throw new Error('Legacy fidelity profile does not score 52/52');

const options = model.fieldOptions(modernAttempt, 'training');
for (const item of modernAttempt) {
  for (const field of model.FIELDS) {
    if (!options[field].includes(item[field])) throw new Error(`${item.id}.${field}: canonical answer is unavailable in UI options`);
  }
}

const requiredMarkup = [
  'id="profileSelect"',
  'id="categorySelect"',
  'id="seedInput"',
  'id="portBank"',
  'id="trainingDrawer"',
  'id="results" aria-live="polite"',
  'draggable="true"',
  'Apply selected reusable endpoint',
  'prefers-reduced-motion',
  'Advanced Firewall Rules',
  'Legacy Reconstruction',
  'SY0-701 Training',
  'SY0-701 Exam',
  'Extended Practice',
  'Independent Security+ SY0-701 practice simulation',
  'i-file',
  'i-mail',
  'i-key',
  'i-tunnel',
  'i-database',
  'critical-risk',
  'TCP + IP protocol',
  'IP protocol'
];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Missing required markup: ${marker}`);
}

if (!/neutral artwork/i.test(html)) throw new Error('Exam Mode icon leakage rule is not visible in the interface');
if (!/click-to-place/i.test(html) && !/Click after selecting/i.test(html)) throw new Error('Click placement fallback is missing');
if (!/keyboard/i.test(html)) throw new Error('Keyboard accessibility contract is missing');

console.log(`Ports & Protocols PBQ QA passed: ${model.LEGACY.length} legacy placements, ${model.CORE.length} core records, ${model.EXTENDED.length} extended records, historical corrections, deterministic balanced attempts, five-field isolation, critical-risk gating, reusable endpoint placement, icon leakage controls, and accessibility markers.`);
