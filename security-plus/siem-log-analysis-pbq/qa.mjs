import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  VERSION,
  SCENARIOS,
  getScenario,
  getEvents,
  sortChronologically,
  scoreAttempt,
  canonicalAttempt,
  evaluateRelationships,
  SCOPE_OPTIONS
} from "./model.mjs";

assert.equal(VERSION, "1.0.0");
assert.equal(SCENARIOS.length, 4, "v1 must ship four scenario families");
assert.deepEqual(SCENARIOS.map(s => s.id), ["credential","malware","web","exfil"]);

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
for (const marker of [
  'id="sourceTabs"','id="filterInput"','id="sortBtn"','id="evidenceList"',
  'id="timelineList"','id="scopeList"','id="attackType"','id="successState"',
  'id="initialEntity"','id="indicator"','id="containmentOptions"','id="results"',
  'id="relationshipList"','id="rawDialog"','Study Mode: Off','type="module"',
  'from "./model.mjs"','prefers-reduced-motion'
]) assert.ok(html.includes(marker), `UI contract missing ${marker}`);

assert.ok(html.includes('Sort: Display Order'), "Exam workspace must begin in display-order mode");
assert.ok(html.includes('state.submitted?'), "Post-submit evidence highlighting must be gated by submission");
assert.ok(html.includes('ONE LOG = clue'), "Memory aid must be present in post-submit review");

for (const scenario of SCENARIOS) {
  assert.ok(scenario.caseId.startsWith("INC-701-"));
  assert.ok(scenario.events.length >= 10, `${scenario.id}: base event model too thin`);
  assert.equal(new Set(scenario.events.map(e => e.id)).size, scenario.events.length, `${scenario.id}: duplicate event IDs`);

  for (const difficulty of ["standard","advanced"]) {
    const events = getEvents(scenario.id, difficulty);
    const again = getEvents(scenario.id, difficulty);
    assert.deepEqual(events, again, `${scenario.id}/${difficulty}: event generation must be deterministic`);
    assert.equal(events.length, difficulty === "advanced" ? 32 : 22, `${scenario.id}/${difficulty}: event count contract`);
    assert.equal(new Set(events.map(e => e.id)).size, events.length, `${scenario.id}/${difficulty}: duplicate generated IDs`);

    const eventIds = new Set(events.map(e => e.id));
    for (const id of scenario.answers.evidenceIds) assert.ok(eventIds.has(id), `${scenario.id}: missing evidence ${id}`);
    for (const id of scenario.answers.timelineIds) assert.ok(eventIds.has(id), `${scenario.id}: missing timeline ${id}`);

    const chrono = sortChronologically(events).map(e => e.id);
    const displayed = events.map(e => e.id);
    assert.notDeepEqual(displayed, chrono, `${scenario.id}/${difficulty}: PBQ should preserve chronology trap`);

    for (const event of events) {
      assert.ok(!Number.isNaN(new Date(event.timestamp).valueOf()), `${scenario.id}: invalid timestamp ${event.id}`);
      assert.ok(event.sourceType && event.action && event.result && event.message, `${scenario.id}: incomplete normalized event ${event.id}`);
      assert.ok(event.raw.includes("ts=") && event.raw.includes("result="), `${scenario.id}: raw event missing core fields ${event.id}`);
    }
  }

  const eventIds = new Set(scenario.events.map(e => e.id));
  assert.ok(scenario.answers.evidenceIds.length >= 6, `${scenario.id}: need multi-event evidence chain`);
  assert.ok(scenario.answers.timelineIds.length >= 5, `${scenario.id}: timeline too short`);
  assert.ok(new Set(scenario.answers.evidenceIds.map(id => scenario.events.find(e => e.id === id)?.sourceType)).size >= 3,
    `${scenario.id}: evidence must correlate at least three source types`);

  for (const id of scenario.answers.evidenceIds) assert.ok(eventIds.has(id));
  for (const id of scenario.answers.timelineIds) assert.ok(scenario.answers.evidenceIds.includes(id), `${scenario.id}: timeline event should also be evidence-bearing`);

  assert.deepEqual(Object.keys(scenario.answers.scope), scenario.entities, `${scenario.id}: scope entity order/keys contract`);
  for (const state of Object.values(scenario.answers.scope)) assert.ok(SCOPE_OPTIONS.includes(state), `${scenario.id}: invalid scope state`);
  for (const [key, value] of Object.entries(scenario.answers.classification)) {
    assert.ok(scenario.options[key].includes(value), `${scenario.id}: canonical ${key} missing from options`);
  }
  assert.ok(scenario.options.containment.some(x => x.value === scenario.answers.containment && x.preservesEvidence),
    `${scenario.id}: canonical containment must preserve evidence`);

  const canonical = canonicalAttempt(scenario.id);
  const result = scoreAttempt(scenario.id, canonical, "advanced");
  assert.equal(result.score, 100, `${scenario.id}: canonical answer must score 100`);
  assert.equal(result.relationships.filter(r => r.pass).length, 10, `${scenario.id}: canonical answer must pass 10/10 relationships`);
  assert.equal(result.criticalFailure, false);
  assert.equal(result.secure, true);

  const rels = evaluateRelationships(scenario.id, canonical);
  assert.equal(new Set(rels.map(r => r.id)).size, 10, `${scenario.id}: duplicate relationship IDs`);

  const destructive = scenario.options.containment.find(x => x.critical);
  assert.ok(destructive, `${scenario.id}: destructive distractor required`);
  const bad = {...canonical, containment: destructive.value};
  const badResult = scoreAttempt(scenario.id, bad);
  assert.equal(badResult.criticalFailure, true, `${scenario.id}: destructive response must be critical failure`);
  assert.ok(badResult.score < 100);

  const confirmedEntity = Object.entries(scenario.answers.scope).find(([,v]) => v === "confirmed")[0];
  const scopeBad = canonicalAttempt(scenario.id);
  scopeBad.scope[confirmedEntity] = "clean";
  const scopeBadResult = scoreAttempt(scenario.id, scopeBad);
  assert.equal(scopeBadResult.criticalFailure, true, `${scenario.id}: confirmed->clean should trip critical gate`);

  const noiseIds = getEvents(scenario.id, "advanced").filter(e => e.noise).slice(0, 5).map(e => e.id);
  const noiseAttempt = canonicalAttempt(scenario.id);
  noiseAttempt.evidenceIds = noiseIds;
  const noiseResult = scoreAttempt(scenario.id, noiseAttempt);
  assert.equal(noiseResult.relationships.find(r => r.id === "corroboration").pass, false);
  assert.equal(noiseResult.relationships.find(r => r.id === "noise").pass, false);
  assert.ok(noiseResult.score < 90);
}

console.log(
  `SIEM Log Analysis PBQ QA passed: ${SCENARIOS.length} scenarios, ` +
  `22/32 deterministic Standard/Advanced events, 3+ source corroboration, ` +
  `canonical 100/100, 10/10 relationships, chronology traps, raw/normalized log contracts, ` +
  `critical containment and scope gates.`
);
