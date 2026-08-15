import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./diagnostic.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length !== 2) throw new Error(`Expected two inline scripts; found ${scripts.length}`);
scripts.forEach((source, i) => new vm.Script(source, { filename: `diag-inline-${i + 1}.js` }));

const context = { window: {} };
vm.createContext(context);
new vm.Script(scripts[0], { filename: 'diag-model.js' }).runInContext(context);
const M = context.window.FW_DIAG_MODEL;
if (!M) throw new Error('FW_DIAG_MODEL was not exposed');

if (M.PROFILES.length !== 4) throw new Error(`Expected four modern profiles; got ${M.PROFILES.length}`);
if (M.MUTATIONS.length < 10) throw new Error(`Expected at least 10 diagnostic mutations; got ${M.MUTATIONS.length}`);

for (const p of M.PROFILES) {
  const canonical = M.clonePolicy(p);
  const rel = M.relationships(p, canonical);
  if (rel.length !== 10 || rel.some(x => !x.ok)) throw new Error(`${p.id}: canonical relationship checks are not 10/10`);
  if (M.criticalRisks(canonical).length) throw new Error(`${p.id}: canonical policy has critical risk`);
  for (const t of M.testsFor(p)) {
    const got = M.evaluatePacket(canonical[t.device], t);
    if (got.action !== t.expect) throw new Error(`${p.id}: canonical traffic test failed: ${t.id}`);
    if (t.match && (!got.rule || got.rule.key !== t.match)) throw new Error(`${p.id}: test ${t.id} matched wrong rule`);
  }
}

for (const p of M.PROFILES) {
  for (const difficulty of ['standard', 'advanced']) {
    for (let n = 0; n < 40; n++) {
      const seed = `QA-${p.id}-${difficulty}-${n}`;
      const a = M.createAttempt(p, difficulty, seed);
      const b = M.createAttempt(p, difficulty, seed);
      const sig = x => JSON.stringify({ muts: x.mutations.map(m => [m.id, m.changes]), start: M.allLocations(x.starting) });
      if (sig(a) !== sig(b)) throw new Error(`${p.id}/${difficulty}: attempt is not deterministic for ${seed}`);
      if (a.mutations.length < 2 || a.mutations.length > 4) throw new Error(`${p.id}/${difficulty}: mutation count ${a.mutations.length} outside 2..4`);
      if (difficulty === 'standard' && a.mutations.length > 3) throw new Error(`${p.id}: standard attempt exceeded 3 defects`);
      if (difficulty === 'advanced' && !a.mutations.some(m => m.id === 'shadow-default')) throw new Error(`${p.id}: advanced attempt lacks order/shadow defect`);
      if (a.mutations.filter(m => m.severity === 'critical').length > 1) throw new Error(`${p.id}/${difficulty}: more than one seeded critical mutation`);
      if (new Set(a.defectiveLocations).size !== a.defectiveLocations.length) throw new Error(`${p.id}/${difficulty}: overlapping defective locations`);
      if (!a.defectiveLocations.length) throw new Error(`${p.id}/${difficulty}: no defective locations`);

      const startDiff = M.diffLocations(a.canonical, a.starting);
      const expected = [...a.defectiveLocations].sort();
      if (JSON.stringify([...startDiff].sort()) !== JSON.stringify(expected)) throw new Error(`${p.id}/${difficulty}: defective location contract differs from actual start state`);

      const startScore = M.scoreAttempt(a, a.starting, new Set());
      if (startScore.repaired.length === startScore.totalDefects) throw new Error(`${p.id}/${difficulty}: broken start state already scores all defects repaired`);

      const repaired = M.clonePolicy({ answers: a.starting });
      for (const loc of a.defectiveLocations) {
        const parts = loc.split(':');
        if (parts[0] === 'field') M.getRule(repaired, parts[1], parts[2])[parts[3]] = M.getRule(a.canonical, parts[1], parts[2])[parts[3]];
        else {
          const order = a.canonical[parts[1]].map(r => r.key);
          repaired[parts[1]].sort((x,y) => order.indexOf(x.key) - order.indexOf(y.key));
        }
      }
      const clean = M.scoreAttempt(a, repaired, new Set(a.defectiveLocations));
      if (clean.pct !== 100 || clean.repaired.length !== clean.totalDefects || clean.relationPass !== 10 || clean.risks.length) throw new Error(`${p.id}/${difficulty}: minimal canonical repair did not return secure 100% state`);
      if (clean.unnecessary.length) throw new Error(`${p.id}/${difficulty}: necessary repair was classified as unnecessary`);
    }
  }
}

for (const mutation of M.MUTATIONS) {
  const p = M.PROFILES.find(x => M.mutationAllowed(mutation, x));
  if (!p) throw new Error(`${mutation.id}: no compatible profile`);
  let witnessed = false;
  for (let n = 0; n < 80 && !witnessed; n++) {
    const attempt = M.createAttempt(p, 'advanced', `WITNESS-${mutation.id}-${n}`);
    witnessed = attempt.mutations.some(m => m.id === mutation.id);
    if (witnessed) {
      const entry = attempt.mutations.find(m => m.id === mutation.id);
      if (!entry.changes.length) throw new Error(`${mutation.id}: no changed locations`);
      if (entry.changes.some(loc => M.locationValue(attempt.starting, loc) === M.locationValue(attempt.canonical, loc))) throw new Error(`${mutation.id}: witness location is not actually defective`);
    }
  }
  if (!witnessed) throw new Error(`${mutation.id}: could not generate isolated witness in seeded attempts`);
}

const riskWitnesses = [
  ['public DB', p => { M.getRule(p,'db','workload').source='INTERNET'; }],
  ['public management', p => { M.getRule(p,'nas','management').source='ANY'; }],
  ['allow all', p => { M.getRule(p,'api','default').action='PERMIT'; }],
  ['external DNS', p => { M.getRule(p,'db','dns').destination='INTERNET'; }],
  ['WAF bypass', p => { M.getRule(p,'api','workload').source='INTERNET'; }]
];
for (const [name, mutate] of riskWitnesses) {
  const p = M.clonePolicy(M.PROFILES[0]);
  mutate(p);
  if (!M.criticalRisks(p).length) throw new Error(`Critical-risk witness not detected: ${name}`);
}

const requiredMarkup = [
  'Diagnostic Repair Mode','Build Mode','Diagnose Mode','Troubleshooting Ticket',
  'REQ → FLOW → MATCH → ORDER → FIX → TEST','Final policy accuracy','Defects repaired',
  'Unnecessary changes','Critical risk','starting value → final value → required value',
  'Observed result:','First matched rule:','Study Mode: Off','prefers-reduced-motion','aria-current="page"'
];
for (const marker of requiredMarkup) if (!html.includes(marker)) throw new Error(`Missing required markup: ${marker}`);

if (!html.includes("submitted?`<br>Required outcome:")) throw new Error('Expected outcome is not gated behind submission');

console.log(`Firewall Diagnostic Repair v1.1 QA passed: ${M.PROFILES.length} profiles, ${M.MUTATIONS.length} controlled mutations, deterministic 2–4 defect attempts, advanced order defects, single-critical cap, exact canonical repair, 10/10 relationship recovery, critical-risk witnesses, Exam/Study gating markers, and diagnostic result contracts.`);
