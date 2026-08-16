import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const file = new URL("./diagnostic.html", import.meta.url);
const html = fs.readFileSync(file, "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);

assert.equal(scripts.length, 2, "expected one model script and one UI script");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(scripts[0], context, { filename: "vpn-diagnostic-model.js" });
new vm.Script(scripts[1], { filename: "vpn-diagnostic-ui.js" });

const model = context.window.VPN_DIAGNOSTIC_MODEL;
assert.ok(model, "diagnostic model is exported for deterministic QA");
assert.equal(model.incidents.length, 7, "seven adaptive incidents exist");
assert.equal(model.fieldKeys.length, 24, "each incident has 24 scored decisions");
assert.equal(Object.values(model.categories).reduce((sum, category) => sum + category.weight, 0), 100, "category weights total 100");

const expectedCategoryShape = {
  baseline: [2, 10],
  evidence: [6, 25],
  layer: [4, 15],
  cause: [4, 20],
  remediation: [4, 15],
  validation: [4, 15]
};
for (const [category, [count, weight]] of Object.entries(expectedCategoryShape)) {
  assert.equal(model.fieldKeys.filter(key => model.fields[key].category === category).length, count, `${category} field count`);
  assert.equal(model.categories[category].weight, weight, `${category} category weight`);
}

const ids = new Set();
let mutations = 0;
for (const incident of model.incidents) {
  assert.ok(!ids.has(incident.id), `unique incident id ${incident.id}`);
  ids.add(incident.id);
  assert.equal(incident.evidence.length, 8, `${incident.id} has eight cross-source records`);
  assert.deepEqual(Object.keys(incident.answers).sort(), [...model.fieldKeys].sort(), `${incident.id} defines all canonical answers`);
  assert.match(incident.peers[0], /^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/, `${incident.id} initiator uses TEST-NET`);
  assert.match(incident.peers[1], /^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/, `${incident.id} responder uses TEST-NET`);

  const grade = model.grade(incident.id, incident.answers);
  assert.equal(grade.score, 100, `${incident.id} canonical solution scores 100`);
  assert.equal(grade.correct, 24, `${incident.id} canonical solution gets every decision correct`);
  assert.equal(grade.answered, 24, `${incident.id} canonical solution has no blanks`);
  assert.equal(model.diagnose(incident.id, incident.answers).code, "DATA-PASS", `${incident.id} canonical repair reaches DATA-PASS`);
  assert.equal(model.diagnose(incident.id, {}).code, "REPAIR-INCOMPLETE", `${incident.id} incomplete repair is blocked`);

  for (const key of model.fieldKeys) {
    const alternative = model.fields[key].options.find(option => option[0] !== incident.answers[key]);
    assert.ok(alternative, `${incident.id}/${key} has an alternate option`);
    const changed = { ...incident.answers, [key]: alternative[0] };
    const changedGrade = model.grade(incident.id, changed);
    assert.ok(changedGrade.score < 100, `${incident.id}/${key} mutation lowers score`);
    assert.equal(changedGrade.results.find(result => result.key === key).correct, false, `${incident.id}/${key} mutation is isolated`);
    mutations += 1;
  }

  const wrongRepair = { ...incident.answers, repairAction: model.fields.repairAction.options.find(option => option[0] !== incident.answers.repairAction)[0] };
  assert.equal(model.diagnose(incident.id, wrongRepair).code, incident.fault.code, `${incident.id} wrong repair preserves original first failure`);
  const overbroad = { ...incident.answers, preserveControl: model.fields.preserveControl.options.find(option => option[0] !== incident.answers.preserveControl)[0] };
  assert.equal(model.diagnose(incident.id, overbroad).code, "PARTIAL-REPAIR", `${incident.id} insecure repair is only partial`);
}
assert.equal(mutations, 168, "all 168 single-field mutations were exercised");

const byId = Object.fromEntries(model.incidents.map(incident => [incident.id, incident]));
assert.equal(byId["IKE-PROPOSAL"].answers.decisiveStatus, "no_proposal");
assert.equal(byId["IKE-PSK"].answers.rootCause, "psk_version_mismatch");
assert.equal(byId["IKE-CERT"].answers.rootCause, "certificate_expired");
assert.equal(byId["CHILD-SELECTOR"].answers.childState, "rejected");
assert.equal(byId["NATT-PATH"].answers.repairAction, "allow_peer_udp4500");
assert.equal(byId["POST-ROUTE"].answers.firstFailed, "route");
assert.equal(byId["POST-ACL"].answers.firstFailed, "acl");
assert.equal(byId["POST-ROUTE"].answers.ikeState, "established");
assert.equal(byId["POST-ACL"].answers.childState, "installed");

const requiredMarkup = [
  "<!doctype html>",
  "Broken VPN Diagnostic PBQ",
  "CompTIA Security+ SY0-701",
  "time → component and layer",
  "last known-good dependency",
  "smallest safe repair",
  "ordered retest",
  "NO_PROPOSAL_CHOSEN",
  "AUTHENTICATION_FAILED",
  "TS_UNACCEPTABLE",
  "UDP 4500",
  "DATA-PASS",
  "role=\"img\" aria-labelledby=\"topologyTitle topologyDesc\"",
  "aria-live=\"polite\"",
  "<dialog id=\"resetDialog\"",
  "<input type=\"radio\" name=\"confidence\"",
  "@media (prefers-reduced-motion: reduce)",
  "exam-mode:not(.submitted)",
  "Unanswered controls receive no credit",
  "Site-to-site IPsec Core",
  "Remote-access TLS Transfer",
  "Independent Security+ SY0-701 practice simulation",
  "Not affiliated with or endorsed by CompTIA"
];
for (const marker of requiredMarkup) assert.ok(html.includes(marker), `required markup exists: ${marker}`);

assert.equal((html.match(/class="screen(?: active)?" data-screen=/g) || []).length, 9, "nine workflow screens exist");
assert.equal((html.match(/<input type="radio" name="confidence"/g) || []).length, 5, "five confidence choices exist");
assert.equal((html.match(/<option[^>]*selected/gi) || []).length, 0, "no answer is preselected in markup");

const staticIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(staticIds).size, staticIds.length, "static HTML ids are unique");
for (const forbidden of ["data-answer=", "data-correct=", "correctAnswer", "brain dump", "exam dump"]) {
  assert.ok(!html.includes(forbidden), `forbidden leakage marker absent: ${forbidden}`);
}
assert.ok(!/https?:\/\/[^"']+\.(?:js|css)(?:[?"'])/i.test(html), "lab has no external JS or CSS dependency");

console.log("Broken VPN Diagnostic PBQ QA passed");
console.log(`Incidents: ${model.incidents.length}`);
console.log(`Decisions per incident: ${model.fieldKeys.length}`);
console.log("Canonical outcomes: 7 × 100/100 + DATA-PASS");
console.log("Mutation coverage: 168 scored-field mutations + 14 repair-state isolations");
