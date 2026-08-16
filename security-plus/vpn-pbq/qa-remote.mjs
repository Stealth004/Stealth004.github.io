import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const file = new URL("./remote-access.html", import.meta.url);
const html = fs.readFileSync(file, "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);

assert.equal(scripts.length, 2, "expected an isolated model script and one UI script");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(scripts[0], context, { filename: "remote-access-model.js" });
new vm.Script(scripts[1], { filename: "remote-access-ui.js" });
const model = context.window.TLS_VPN_MODEL;

assert.ok(model, "model is exported for deterministic QA");
assert.equal(model.scenarios.length, 3, "three adaptive missions exist");
assert.equal(model.fieldKeys.length, 30, "each mission has 30 scored decisions");
assert.equal(Object.values(model.categories).reduce((sum, category) => sum + category.weight, 0), 100, "category weights total 100");

const expectedCategoryShape = {
  architecture: [4, 20],
  tls: [5, 15],
  identity: [5, 15],
  traffic: [7, 20],
  access: [5, 15],
  validation: [4, 15]
};

for (const [category, [fieldCount, weight]] of Object.entries(expectedCategoryShape)) {
  assert.equal(model.fieldKeys.filter(key => model.fields[key].category === category).length, fieldCount, `${category} field count`);
  assert.equal(model.categories[category].weight, weight, `${category} weight`);
}

for (const scenario of model.scenarios) {
  assert.deepEqual(Object.keys(scenario.answers).sort(), [...model.fieldKeys].sort(), `${scenario.id} defines every answer`);
  const grade = model.grade(scenario.id, scenario.answers);
  assert.equal(grade.score, 100, `${scenario.id} canonical solution scores 100`);
  assert.equal(grade.correct, 30, `${scenario.id} canonical solution gets all decisions correct`);
  assert.equal(grade.answered, 30, `${scenario.id} canonical solution has no blanks`);
  assert.equal(model.diagnose(scenario.id, scenario.answers).code, "DATA-PASS", `${scenario.id} canonical path reaches data pass`);

  for (const key of model.fieldKeys) {
    const alternative = model.fields[key].options.find(option => option[0] !== scenario.answers[key]);
    assert.ok(alternative, `${key} has an alternative choice`);
    const mutation = { ...scenario.answers, [key]: alternative[0] };
    const mutatedGrade = model.grade(scenario.id, mutation);
    assert.ok(mutatedGrade.score < 100, `${scenario.id}/${key} mutation lowers the score`);
    assert.equal(mutatedGrade.results.find(result => result.key === key).correct, false, `${scenario.id}/${key} mutation is identified`);
  }
}

const [secureControl, bandwidth, contractor] = model.scenarios;
assert.equal(secureControl.answers.accessMethod, "client_tls");
assert.equal(secureControl.answers.tunnelPolicy, "full");
assert.equal(secureControl.answers.internetPath, "org_egress");
assert.equal(bandwidth.answers.accessMethod, "client_tls");
assert.equal(bandwidth.answers.tunnelPolicy, "split");
assert.equal(bandwidth.answers.corporateRoutes, "corporate_prefixes");
assert.equal(bandwidth.answers.dnsResolver, "split_corporate");
assert.equal(contractor.answers.accessMethod, "clientless_portal");
assert.equal(contractor.answers.sessionBoundary, "application_proxy");
assert.equal(contractor.answers.corporateRoutes, "no_client_routes");
assert.equal(contractor.answers.authorizationScope, "single_proxy_app");

function mutatedDiagnostic(key, value, expectedCode, scenario = secureControl) {
  const answers = { ...scenario.answers, [key]: value };
  assert.equal(model.diagnose(scenario.id, answers).code, expectedCode, `${key} isolates ${expectedCode}`);
}

assert.equal(model.diagnose(secureControl.id, {}).code, "CONFIG-INCOMPLETE");
mutatedDiagnostic("accessMethod", "site_ipsec", "ARCHITECTURE-MISMATCH");
mutatedDiagnostic("certificateName", "access.corp.example", "TLS-NAME-MISMATCH");
mutatedDiagnostic("certificateTrust", "self_signed", "TLS-UNTRUSTED");
mutatedDiagnostic("tlsVersion", "tls10", "TLS-OBSOLETE");
mutatedDiagnostic("transport", "udp500", "TLS-TRANSPORT-BLOCKED");
mutatedDiagnostic("authSecond", "none", "MFA-MISSING");
mutatedDiagnostic("identitySource", "local_gateway_users", "IDENTITY-POLICY");
mutatedDiagnostic("tunnelPolicy", "split", "ROUTE-POLICY");
mutatedDiagnostic("dnsResolver", "local_only", "DNS-POLICY");
mutatedDiagnostic("authorizationScope", "full_internal_network", "ACCESS-OVERBROAD");

assert.match(html, /<svg class="topology"/i, "exact inline SVG topology exists");
assert.match(html, /role="img" aria-labelledby="topologyTitle topologyDesc"/, "topology is labelled accessibly");
assert.match(html, /<dialog id="resetDialog"/, "reset uses an explicit confirmation dialog");
assert.match(html, /<input type="radio" name="confidence"/, "pre-submit confidence capture exists");
assert.equal((html.match(/<input type="radio" name="confidence"/g) || []).length, 5, "five confidence choices exist");
assert.match(html, /aria-live="polite"/, "dynamic status uses live announcements");
assert.match(html, /@media \(prefers-reduced-motion: reduce\)/, "reduced-motion support exists");
assert.match(html, /Mode: Learn/, "Learn mode is the explicit default");
assert.match(html, /exam-mode:not\(\.submitted\)/, "Exam mode hides pre-submit coaching only");
assert.match(html, /Unanswered controls receive no credit/, "submission behavior for blanks is explicit");
assert.match(html, /Site-to-site IPsec Core/, "the transfer lab links back to Core");
assert.equal((html.match(/class="screen(?: active)?" data-screen=/g) || []).length, 9, "nine workflow screens exist");
assert.equal((html.match(/<option[^>]*selected/gi) || []).length, 0, "no answer is preselected in markup");

for (const code of ["TLS-NAME-MISMATCH", "TLS-UNTRUSTED", "TLS-OBSOLETE", "MFA-MISSING", "ROUTE-POLICY", "DNS-POLICY", "ACCESS-OVERBROAD", "DATA-PASS"]) {
  assert.ok(html.includes(code), `${code} is implemented`);
}

console.log("Remote-access VPN PBQ QA passed");
console.log(`Scenarios: ${model.scenarios.length}`);
console.log(`Decisions per scenario: ${model.fieldKeys.length}`);
console.log("Canonical outcomes: 3 × 100/100 + DATA-PASS");
console.log("Mutation coverage: 90 scored-field mutations + 10 diagnostic isolations");
