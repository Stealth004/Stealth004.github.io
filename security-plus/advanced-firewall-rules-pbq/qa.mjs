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
for (const profile of model.PROFILES) {
  const errors = model.validateProfile(profile);
  if (errors.length) throw new Error(`${profile.id}: ${errors.join(', ')}`);
  const fieldCount = Object.values(profile.answers).flat().length * model.fieldNames(profile).length;
  if (fieldCount !== 60) throw new Error(`${profile.id}: expected 60 selectable fields, got ${fieldCount}`);
  const canonical = model.cloneAnswers(profile);
  const fields = model.fieldsCorrect(profile, canonical);
  if (fields.correct !== 60 || fields.total !== 60) throw new Error(`${profile.id}: canonical field score is not 60/60`);
  if (!profile.historical) {
    const relationships = model.relationships(profile, canonical);
    if (relationships.length !== 10 || relationships.some(check => !check.ok)) {
      throw new Error(`${profile.id}: canonical relationships are not 10/10`);
    }
    for (const test of profile.tests) {
      const result = model.evaluatePacket(canonical[test.device], test);
      if (result.action !== test.expect) throw new Error(`${profile.id}: failed traffic test ${test.id}`);
    }
  }
}

const requiredMarkup = [
  'id="topology"',
  'id="trainingDrawer"',
  'id="topologySummary"',
  'Test Connections',
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

console.log('Advanced Firewall Rules PBQ QA passed: 5 profiles, 60 fields each, 10 modern relationships, traffic tests, topology, and training content.');
