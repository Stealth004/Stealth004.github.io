import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "./training-integrity.mjs";

// Preserve the complete released v1.0.3 regression suite first.
await import("./qa-v103.mjs");
const {SCENARIOS,canonicalAttempt} = await import("./model.mjs");
const {
  EVIDENCE_SCORING_VERSION,
  classifyEvidence,
  evidenceAnalysis,
  timelineAnalysis,
  requirementStatus
} = await import("./evidence-scoring-core-v104.mjs");
const {scoreAttemptV104} = await import("./evidence-scoring-ui-v104.mjs");

assert.equal(EVIDENCE_SCORING_VERSION,"1.0.4");

// Credential regression from the learner's Study Mode run: C3 is part of the
// repeated-failure pattern, not noise. Missing the final C9 pivot should reduce
// completeness once, not collapse both completeness and ordering.
const learnerCredential=["C1","C2","C3","C5","C6","C7","C8"];
assert.equal(classifyEvidence("credential","C3"),"core");
assert.equal(classifyEvidence("credential","credential-N08"),"noise");
const learnerEvidence=evidenceAnalysis("credential",learnerCredential);
assert.equal(learnerEvidence.noiseSelected.length,0);
assert.equal(learnerEvidence.coverage,.8);
assert.equal(learnerEvidence.fraction,.8);
const learnerTimeline=timelineAnalysis("credential",learnerCredential);
assert.equal(learnerTimeline.coverage,.8);
assert.equal(learnerTimeline.order,1);
assert.equal(learnerTimeline.fraction,.87);

const perfectCredential=[...learnerCredential,"C9"];
assert.equal(timelineAnalysis("credential",perfectCredential).fraction,1);
assert.ok(timelineAnalysis("credential",[...perfectCredential,"credential-N08"]).fraction<1,"true timeline noise must still reduce credit");
assert.ok(evidenceAnalysis("credential",[...perfectCredential,"credential-N08"]).fraction<1,"true evidence noise must still reduce credit");

// Scope-supporting telemetry must never be mislabeled as noise.
for(const id of ["M10","M11"]) assert.equal(classifyEvidence("malware",id),"supporting",`${id} must be supporting scope evidence`);
for(const id of ["W7","W8"]) assert.equal(classifyEvidence("web",id),"supporting",`${id} must be supporting scope/control evidence`);
assert.equal(classifyEvidence("exfil","E10"),"noise","approved exception remains unrelated to the exfil incident");

// Core requirement groups are explicit: repeated failures are a pattern, so no
// single arbitrary failure event is required by itself.
const failureRequirement=requirementStatus("credential",["C2","C3"])[0];
assert.equal(failureRequirement.satisfied,true);
assert.deepEqual(failureRequirement.picked,["C2","C3"]);

// Canonical attempts remain perfect under the v1.0.4 scoring layer.
for(const scenario of SCENARIOS){
  const result=scoreAttemptV104(scenario.id,canonicalAttempt(scenario.id),"advanced");
  assert.equal(result.score,100,`${scenario.id}: v1.0.4 canonical attempt must remain 100/100`);
  assert.equal(result.relationships.filter((r)=>r.pass).length,10,`${scenario.id}: v1.0.4 canonical relationships must remain 10/10`);
}

const core=readFileSync(new URL("./evidence-scoring-core-v104.mjs",import.meta.url),"utf8");
const ui=readFileSync(new URL("./evidence-scoring-ui-v104.mjs",import.meta.url),"utf8");
const entry=readFileSync(new URL("./app-v103.mjs",import.meta.url),"utf8");
for(const marker of ["coreRequirements","supportingEvidenceIds","noisePenalty",".65*coverage+.35*order"])
  assert.ok(core.includes(marker),`v1.0.4 core contract missing ${marker}`);
for(const marker of ["Core pattern evidence","Supporting evidence — selected","Selected noise","Evidence categories","Timeline scoring model"])
  assert.ok(ui.includes(marker),`v1.0.4 UI/review contract missing ${marker}`);
assert.ok(entry.includes("applyEvidenceScoringIntegrity"),"runtime entrypoint must activate the v1.0.4 scoring overlay");

console.log("SIEM PBQ v1.0.4 evidence-scoring QA passed: v1.0.3 regression suite preserved; Credential C3/repeated-failure pattern is relevant; supporting Malware/Web scope evidence is not noise; core requirement-group scoring works; timeline completeness and order are separated; true noise remains penalized; canonical 100/100 and 10/10 preserved.");
