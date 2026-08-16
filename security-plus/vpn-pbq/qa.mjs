import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);

if (scripts.length !== 2) throw new Error(`Expected two inline script blocks; found ${scripts.length}`);
scripts.forEach((source, index) => new vm.Script(source, { filename: `inline-${index + 1}.js` }));

const context = { window: {} };
vm.createContext(context);
new vm.Script(scripts[0], { filename: 'vpn-model.js' }).runInContext(context);
const model = context.window.VPN_MODEL;

if (!model) throw new Error('VPN_MODEL was not exposed');
if (model.SCENARIOS.length < 3) throw new Error('Expected at least three adaptive Core scenarios');
if (model.allFieldRefs().length !== 40) throw new Error(`Expected 40 scored decisions; got ${model.allFieldRefs().length}`);
if (model.ENDPOINT_FIELDS.length !== 12) throw new Error(`Expected 12 decisions per VPN endpoint; got ${model.ENDPOINT_FIELDS.length}`);

const weightTotal = Object.values(model.CATEGORY_WEIGHTS).reduce((sum, value) => sum + value, 0);
if (weightTotal !== 100) throw new Error(`Category weights total ${weightTotal}, not 100`);

const ids = new Set();
for (const scenario of model.SCENARIOS) {
  if (ids.has(scenario.id)) throw new Error(`Duplicate scenario id: ${scenario.id}`);
  ids.add(scenario.id);
  for (const key of ['id', 'title', 'auth', 'summary', 'requirement']) {
    if (!scenario[key]) throw new Error(`${scenario.id}: missing ${key}`);
  }
  for (const side of ['hq', 'branch']) {
    for (const key of ['public', 'network', 'identity']) {
      if (!scenario[side][key]) throw new Error(`${scenario.id}.${side}: missing ${key}`);
    }
  }
  if (!scenario.hq.app || !scenario.branch.users) throw new Error(`${scenario.id}: missing least-privilege source or destination`);
  if (!/^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(scenario.hq.public)) throw new Error(`${scenario.id}: HQ public address is not TEST-NET documentation space`);
  if (!/^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(scenario.branch.public)) throw new Error(`${scenario.id}: Branch public address is not TEST-NET documentation space`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonical(scenario) {
  const value = clone(model.expected(scenario));
  value.validation.ran = { ike: true, child: true, data: true };
  return value;
}

for (const scenario of model.SCENARIOS) {
  const expected = model.expected(scenario);
  if (expected.hq.peer !== scenario.branch.public || expected.branch.peer !== scenario.hq.public) throw new Error(`${scenario.id}: public peers do not mirror`);
  if (expected.hq.localNetwork !== expected.branch.remoteNetwork || expected.hq.remoteNetwork !== expected.branch.localNetwork) throw new Error(`${scenario.id}: protected selectors do not mirror`);
  if (expected.hq.dataProtocol !== 'ESP' || expected.branch.dataProtocol !== 'ESP') throw new Error(`${scenario.id}: canonical data protocol is not ESP`);
  if (expected.hq.dataMode !== 'Tunnel mode' || expected.branch.dataMode !== 'Tunnel mode') throw new Error(`${scenario.id}: canonical mode is not tunnel mode`);
  if (!/GCM/.test(expected.hq.espSuite) || !/GCM/.test(expected.branch.espSuite)) throw new Error(`${scenario.id}: canonical ESP suite does not use authenticated encryption`);
  if (model.ENDPOINT_FIELDS.includes('espIntegrity')) throw new Error('AES-GCM model incorrectly requires a separate ESP integrity field');

  if (scenario.nat) {
    if (expected.path.udp4500 !== 'Allow' || expected.path.esp50 !== 'Block') throw new Error(`${scenario.id}: NAT-T path is incorrect`);
    if (!/NAT-T/.test(expected.path.natPolicy)) throw new Error(`${scenario.id}: NAT scenario does not select NAT-T`);
  } else {
    if (expected.path.udp4500 !== 'Block' || expected.path.esp50 !== 'Allow') throw new Error(`${scenario.id}: direct ESP path is incorrect`);
  }
  if (expected.path.udp500 !== 'Allow' || expected.path.ah51 !== 'Block' || expected.path.tcp443 !== 'Block' || expected.path.udp443 !== 'Block') throw new Error(`${scenario.id}: minimum path choices are incorrect`);

  const answer = canonical(scenario);
  const perfect = model.score(scenario, answer);
  if (perfect.pct !== 100 || perfect.points !== 100 || perfect.misses.length !== 0) throw new Error(`${scenario.id}: canonical configuration does not score 100`);
  for (const category of Object.keys(model.CATEGORY_WEIGHTS)) {
    if (perfect.categories[category].pct !== 100) throw new Error(`${scenario.id}.${category}: canonical category is not perfect`);
  }

  for (const [group, key] of model.allFieldRefs()) {
    const mutated = clone(answer);
    mutated[group][key] = `wrong-${group}-${key}`;
    const result = model.score(scenario, mutated);
    if (result.points >= 100 || result.misses.length !== 1) throw new Error(`${scenario.id}.${group}.${key}: isolated field mutation was not detected`);
  }
  for (const check of ['ike', 'child', 'data']) {
    const mutated = clone(answer);
    mutated.validation.ran[check] = false;
    const result = model.score(scenario, mutated);
    if (result.categories.validation.pct !== 90) throw new Error(`${scenario.id}.validation.${check}: missing validation run did not remove 10% of validation credit`);
  }

  for (const layer of ['ike', 'child', 'data']) {
    const diagnostic = model.diagnose(scenario, answer, layer);
    if (!diagnostic.ok) throw new Error(`${scenario.id}.${layer}: canonical diagnostic failed with ${diagnostic.code}`);
  }

  const wrongPeer = clone(answer);
  wrongPeer.hq.peer = scenario.hq.public;
  if (model.diagnose(scenario, wrongPeer, 'ike').code !== 'IKE-PEER-UNREACHABLE') throw new Error(`${scenario.id}: wrong peer was not isolated`);

  const wrongIke = clone(answer);
  wrongIke.branch.ikeVersion = 'IKEv1 aggressive mode';
  if (model.diagnose(scenario, wrongIke, 'ike').code !== 'IKE-NO-MATCH') throw new Error(`${scenario.id}: IKE mismatch was not isolated`);

  const wrongSelector = clone(answer);
  wrongSelector.branch.localNetwork = scenario.hq.network;
  if (model.diagnose(scenario, wrongSelector, 'child').code !== 'CHILD-TS-MISMATCH') throw new Error(`${scenario.id}: selector mismatch was not isolated`);

  const wrongIpsec = clone(answer);
  wrongIpsec.hq.dataMode = 'Transport mode';
  if (model.diagnose(scenario, wrongIpsec, 'child').code !== 'CHILD-PROPOSAL-MISMATCH') throw new Error(`${scenario.id}: IPsec proposal mismatch was not isolated`);

  const blockedIke = clone(answer);
  blockedIke.path.udp500 = 'Block';
  if (model.diagnose(scenario, blockedIke, 'ike').code !== 'PATH-IKE-BLOCKED') throw new Error(`${scenario.id}: blocked UDP 500 was not isolated`);

  const wrongAccess = clone(answer);
  wrongAccess.access.service = 'Any service';
  if (model.diagnose(scenario, wrongAccess, 'data').code !== 'DATA-POLICY-DENY') throw new Error(`${scenario.id}: post-tunnel policy failure was not isolated`);
}

const requiredMarkup = [
  '<!doctype html>',
  'SecureLink VPN Lab',
  'CompTIA Security+ SY0-701',
  'data-screen="mission"',
  'data-screen="topology"',
  'data-screen="architecture"',
  'data-screen="hq"',
  'data-screen="branch"',
  'data-screen="path"',
  'data-screen="validate"',
  'data-screen="submit"',
  'data-screen="review"',
  'role="progressbar"',
  'aria-live="polite"',
  'aria-current="step"',
  'prefers-reduced-motion',
  'Mode: Learn',
  'Mode: Exam',
  'IKE SA',
  'CHILD_SA',
  'IP protocol 50',
  'UDP 4500',
  'AES-GCM',
  'Independent Security+ SY0-701 practice simulation',
  'Not affiliated with or endorsed by CompTIA'
];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Missing required markup: ${marker}`);
}

for (const forbidden of ['data-answer=', 'data-correct=', 'correctAnswer', 'brain dump', 'exam dump']) {
  if (html.includes(forbidden)) throw new Error(`Potential answer leakage or prohibited content marker: ${forbidden}`);
}

if (/https?:\/\/[^"']+\.(?:js|css)(?:[?"'])/i.test(html)) throw new Error('PBQ depends on an external JS or CSS asset');
if (!/keyboard|focus-visible/i.test(html)) throw new Error('Keyboard/focus accessibility contract is missing');
if (!/NAT-T changes the outer path/.test(html)) throw new Error('NAT-T explanation is missing');
if (!/A VPN does not grant blanket access/.test(html)) throw new Error('VPN versus authorization distinction is missing');
if (!/AES-GCM already provides authenticated encryption/.test(html)) throw new Error('AES-GCM integrity nuance is missing');
if (!/familiar “Phase 1”/.test(html) || !/more precise model/.test(html)) throw new Error('Legacy phase terminology translation is missing');

console.log(`SecureLink VPN PBQ QA passed: ${model.SCENARIOS.length} adaptive scenarios, 40 scored decisions, 12 decisions per endpoint, 100-point weighted scoring, symmetric peers/selectors, NAT-T and direct-ESP variants, layered diagnostics, misconception checks, answer-leakage guards, and accessibility markers.`);
