import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "./training-integrity.mjs";

// Re-run the complete released v1.0.2 regression suite against the v1.0.3
// runtime-mutated scenario objects before checking the new integrity contract.
await import("./qa.mjs");
const {SCENARIOS,getScenario,canonicalAttempt,scoreAttempt} = await import("./model.mjs");
const {TRAINING_INTEGRITY_VERSION} = await import("./training-integrity.mjs");

assert.equal(TRAINING_INTEGRITY_VERSION, "1.0.3");

const requiredInsufficient = [
  ["credential","FILE-02"],
  ["credential","DB-02"],
  ["malware","WS-04"],
  ["exfil","WS-18"]
];
for (const [scenarioId, entity] of requiredInsufficient) {
  const scenario = getScenario(scenarioId);
  assert.equal(scenario.answers.scope[entity], "insufficient", `${scenarioId}/${entity}: unsupported clean state must become insufficient`);
  assert.deepEqual(scenario.answers.scopeEvidenceIds[entity], [], `${scenarioId}/${entity}: insufficient scope must not claim direct evidence`);
}

for (const scenario of SCENARIOS) {
  assert.deepEqual(Object.keys(scenario.answers.scopeEvidenceIds), scenario.entities, `${scenario.id}: scope evidence keys must match entities`);
  assert.deepEqual(Object.keys(scenario.answers.scopeRationale), scenario.entities, `${scenario.id}: scope rationale keys must match entities`);
  const eventIds = new Set(scenario.events.map((event) => event.id));
  for (const entity of scenario.entities) {
    const state = scenario.answers.scope[entity];
    const ids = scenario.answers.scopeEvidenceIds[entity];
    assert.ok(scenario.answers.scopeRationale[entity].length >= 40, `${scenario.id}/${entity}: rationale must explain the evidence boundary`);
    for (const id of ids) assert.ok(eventIds.has(id), `${scenario.id}/${entity}: scope evidence ${id} must exist`);
    if (state === "insufficient") assert.equal(ids.length, 0, `${scenario.id}/${entity}: insufficient must have no claimed direct scope evidence`);
    else assert.ok(ids.length >= 1, `${scenario.id}/${entity}: non-insufficient state needs explicit evidence support`);
  }
  const canonical = canonicalAttempt(scenario.id);
  const result = scoreAttempt(scenario.id, canonical, "advanced");
  assert.equal(result.score, 100, `${scenario.id}: v1.0.3 canonical answer must remain 100/100`);
  assert.equal(result.relationships.filter((r) => r.pass).length, 10, `${scenario.id}: v1.0.3 canonical relationships must remain 10/10`);
}

const overlay = readFileSync(new URL("./training-integrity.mjs", import.meta.url), "utf8");
const wrapper = readFileSync(new URL("./app-v103.mjs", import.meta.url), "utf8");
for (const marker of [
  "Telemetry Source",
  "SRC / Originator → DST / Target",
  "No telemetry ≠ clean",
  "Insufficient telemetry to determine",
  ".review-item small{display:block;margin-top:4px",
  "scope-basis",
  "No direct scope telemetry"
]) assert.ok(overlay.includes(marker), `v1.0.3 UI/training contract missing ${marker}`);
assert.ok(wrapper.includes('await import("./app.mjs")'), "v1.0.3 wrapper must preserve the stable app after patching scenario state");

console.log("SIEM PBQ v1.0.3 training-integrity QA passed: base regression suite preserved; unsupported clean states corrected; four-scenario scope evidence/rationale audit passed; canonical 100/100 and 10/10 preserved; SRC/DST terminology, Study Mode scope rule, review-card spacing, and post-submit scope evidence basis contracts present.");
