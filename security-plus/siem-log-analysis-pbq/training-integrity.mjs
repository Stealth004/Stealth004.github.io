// SIEM PBQ v1.0.3 training-integrity overlay.
// Keeps the released v1.0.2 model/UI stable while correcting evidence-supported
// scope states and clarifying learner-facing SIEM terminology.
import {SCENARIOS} from "./model.mjs";

export const TRAINING_INTEGRITY_VERSION = "1.0.3";

const byId = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));

function patchScenario(id, {scope, evidenceIds, rationale, studyScope}) {
  const scenario = byId.get(id);
  if (!scenario) throw new Error(`Unknown SIEM training-integrity scenario: ${id}`);
  Object.assign(scenario.answers.scope, scope);
  scenario.answers.scopeEvidenceIds = evidenceIds;
  scenario.answers.scopeRationale = rationale;
  scenario.study.scope = studyScope;
}

patchScenario("credential", {
  scope: {
    "admin account": "confirmed",
    "APP-ADMIN-01": "confirmed",
    "FILE-02": "insufficient",
    "DB-02": "insufficient"
  },
  evidenceIds: {
    "admin account": ["C1","C2","C5","C6","C7"],
    "APP-ADMIN-01": ["C7","C8","C9"],
    "FILE-02": [],
    "DB-02": []
  },
  rationale: {
    "admin account": "Repeated privileged VPN failures from 203.0.113.55 are followed by a successful login and privileged remote session, confirming credential compromise.",
    "APP-ADMIN-01": "The compromised admin session reaches APP-ADMIN-01, launches encoded PowerShell, and creates new outbound HTTPS activity from the jump host.",
    "FILE-02": "No FILE-02 telemetry is present in this case, so the available evidence cannot establish either compromise or a clean state.",
    "DB-02": "No DB-02 telemetry is present in this case, so the available evidence cannot establish either compromise or a clean state."
  },
  studyScope: "FILE-02 and DB-02 have no direct telemetry in this case. Do not infer clean from silence; classify them as Insufficient telemetry to determine."
});

patchScenario("malware", {
  scope: {
    "WS-01": "confirmed",
    "WS-02": "confirmed",
    "WS-03": "suspicious",
    "WS-04": "insufficient"
  },
  evidenceIds: {
    "WS-01": ["M1","M2","M3","M4"],
    "WS-02": ["M5","M6","M7","M8","M9"],
    "WS-03": ["M10","M11"],
    "WS-04": []
  },
  rationale: {
    "WS-01": "Execution, rare-domain resolution, outbound C2, and beaconing establish the earliest confirmed infected workstation.",
    "WS-02": "Lateral authentication is followed by suspicious DLL execution, the same rare-domain/C2 pattern, and later quarantine, confirming infection before the control acted.",
    "WS-03": "The same rare-domain lookup was attempted, but sinkhole blocking and a clean EDR scan prevent confirmation; the host remains suspicious rather than confirmed infected.",
    "WS-04": "Only routine backup activity is visible; that benign event is not sufficient investigation telemetry to prove the workstation is clean."
  },
  studyScope: "WS-03 is suspicious because it attempted the rare-domain lookup despite a blocked resolution and clean scan. WS-04 has only routine backup activity, so there is insufficient telemetry to determine its incident state."
});

patchScenario("web", {
  scope: {
    "WEB-01 application": "confirmed",
    "DB-01 data": "confirmed",
    "WAF-01": "clean",
    "WEB-02": "clean"
  },
  evidenceIds: {
    "WEB-01 application": ["W1","W2","W3","W5","W6"],
    "DB-01 data": ["W3","W4"],
    "WAF-01": ["W1","W8"],
    "WEB-02": ["W7"]
  },
  rationale: {
    "WEB-01 application": "The unblocked injection request reaches WEB-01, returns HTTP 200, triggers unauthorized data retrieval, and sends a large response to the same client.",
    "DB-01 data": "The application log records 47 unexpected finance-export rows and the DB firewall corroborates the WEB-01 service connection to DB-01.",
    "WAF-01": "WAF-01 is visibly operating according to its configured modes (alert-only on the vulnerable path and blocking an unrelated traversal attempt); no compromise of the control is indicated.",
    "WEB-02": "WEB-02 shows its expected health-check activity and has no correlation to the attack chain; available evidence indicates it is unaffected."
  },
  studyScope: "WEB-01 and DB-01 have direct compromise evidence. WAF-01 and WEB-02 show separate expected/control behavior with no correlation to the successful attack chain."
});

patchScenario("exfil", {
  scope: {
    "jdoe account": "confirmed",
    "WS-17": "confirmed",
    "FIN-FILE-01 data": "confirmed",
    "WS-18": "insufficient"
  },
  evidenceIds: {
    "jdoe account": ["E1","E2","E3","E4","E5","E6","E7"],
    "WS-17": ["E1","E3","E4","E5","E6","E7"],
    "FIN-FILE-01 data": ["E2","E5","E6","E7"],
    "WS-18": []
  },
  rationale: {
    "jdoe account": "The jdoe session performs unauthorized finance access, staging, and a completed external upload, confirming misuse of the account.",
    "WS-17": "WS-17 stages the finance archive and originates the DLP/proxy/firewall-confirmed external transfer, confirming the workstation is involved.",
    "FIN-FILE-01 data": "Restricted finance data is read, detected by DLP during upload, transferred externally, and accepted by the remote service.",
    "WS-18": "No WS-18 investigation telemetry is present in the exfiltration case; the dataset cannot support a clean or compromised conclusion."
  },
  studyScope: "jdoe, WS-17, and FIN-FILE-01 are directly tied to the transfer chain. No WS-18 investigation telemetry is present, so its state is Insufficient telemetry to determine."
});

const scopeLabelReplacement = new Map([
  ["Clean / no compromise evidence", "No compromise indicated by available evidence"],
  ["Not enough information", "Insufficient telemetry to determine"]
]);

function replaceScopeOptionLabels() {
  document.querySelectorAll("#scopeList option").forEach((option) => {
    const replacement = scopeLabelReplacement.get(option.textContent.trim());
    if (replacement) option.textContent = replacement;
  });
}

function updateStudyScopeCue() {
  const cue = document.getElementById("studyScopeCue");
  const selected = document.getElementById("scenarioSelect")?.value || SCENARIOS[0].id;
  const scenario = byId.get(selected) || SCENARIOS[0];
  if (cue) cue.textContent = scenario.study.scope;
}

function annotateDecisionReview() {
  const selected = document.getElementById("scenarioSelect")?.value || SCENARIOS[0].id;
  const scenario = byId.get(selected) || SCENARIOS[0];
  document.querySelectorAll("#decisionReview .review-item").forEach((item) => {
    const title = item.querySelector("strong")?.textContent || "";
    if (!title.startsWith("Scope: ") || item.querySelector(".scope-basis")) return;
    const entity = title.slice(7);
    const ids = scenario.answers.scopeEvidenceIds?.[entity] || [];
    const rationale = scenario.answers.scopeRationale?.[entity] || "";
    const detail = item.querySelector("small");
    if (!detail || !rationale) return;
    const span = document.createElement("span");
    span.className = "scope-basis";
    span.textContent = `${ids.length ? `Evidence: ${ids.join(", ")}` : "No direct scope telemetry"} — ${rationale}`;
    detail.append(document.createElement("br"), span);
  });
}

export function applyUiIntegrity() {
  document.body.dataset.siemTrainingVersion = TRAINING_INTEGRITY_VERSION;

  const style = document.createElement("style");
  style.id = "siem-training-integrity-v103";
  style.textContent = `
    .review-item strong{display:block;overflow-wrap:anywhere}
    .review-item small{display:block;margin-top:4px;overflow-wrap:anywhere;line-height:1.42}
    .scope-basis{display:block;margin-top:6px;color:#c9dae6}
  `;
  document.head.append(style);

  const headers = document.querySelectorAll(".log-table thead th");
  if (headers[2]) headers[2].textContent = "Telemetry Source";
  if (headers[4]) headers[4].textContent = "SRC / Originator → DST / Target";

  const studyItems = [...document.querySelectorAll("#studyPanel .study-item")];
  for (const item of studyItems) {
    const title = item.querySelector("strong")?.textContent?.trim();
    const text = item.querySelector("span");
    if (title === "2. SOURCE → DEST") {
      item.querySelector("strong").textContent = "2. SRC → DST";
      if (text) text.textContent = "SRC/originator initiated the activity; DST/target received it. Telemetry Source is the log category, not the source IP.";
    } else if (title === "5. SCOPE" && text) {
      text.textContent = "No telemetry ≠ clean. Use Insufficient when the available logs cannot support a determination.";
    } else if (title === "T-U-S-D-A-R" && text) {
      text.textContent = "Time • User • SRC/originator • DST/target • Action • Result";
    }
  }

  const grid = document.querySelector("#studyPanel .study-grid");
  if (grid && !document.getElementById("studyScopeCue")) {
    const card = document.createElement("div");
    card.className = "study-item";
    card.innerHTML = '<strong>Scenario scope cue</strong><span id="studyScopeCue"></span>';
    grid.append(card);
  }

  replaceScopeOptionLabels();
  updateStudyScopeCue();

  const scopeList = document.getElementById("scopeList");
  if (scopeList) new MutationObserver(replaceScopeOptionLabels).observe(scopeList, {childList:true, subtree:true});

  const decisionReview = document.getElementById("decisionReview");
  if (decisionReview) new MutationObserver(annotateDecisionReview).observe(decisionReview, {childList:true, subtree:true});

  const refreshCue = () => queueMicrotask(updateStudyScopeCue);
  document.getElementById("scenarioSelect")?.addEventListener("change", refreshCue);
  document.getElementById("newBtn")?.addEventListener("click", refreshCue);
}
