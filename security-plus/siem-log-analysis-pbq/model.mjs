// Security+ SY0-701 — SIEM / Log Analysis / Incident Correlation PBQ
// Canonical vendor-neutral scenario and scoring model.

export const VERSION = "1.0.1";

const clone = (value) => JSON.parse(JSON.stringify(value));
const pad = (n) => String(n).padStart(2, "0");

export function formatRaw(e) {
  const pairs = [
    `ts=${e.timestamp}`,
    `source=${e.sourceType}`,
    e.host ? `host=${e.host}` : "",
    e.user ? `user=${e.user}` : "",
    e.src ? `src=${e.src}` : "",
    e.dst ? `dst=${e.dst}` : "",
    `action=${JSON.stringify(e.action)}`,
    `result=${e.result}`,
    `severity=${e.severity}`,
    `msg=${JSON.stringify(e.message)}`
  ].filter(Boolean);
  return pairs.join(" ");
}

function makeEvent(id, timestamp, sourceType, host, user, src, dst, action, result, severity, message, extra = {}) {
  return { id, timestamp, sourceType, host, user, src, dst, action, result, severity, message, ...extra };
}

const commonNoise = [
  ["Authentication","IDP-01","jsmith","10.20.5.21","IDP-01","Interactive login","SUCCESS","info","Routine staff login"],
  ["Authentication","VPN-GW","mlee","198.51.100.18","VPN-GW","VPN login","SUCCESS","info","Approved remote-access session"],
  ["Firewall / Network","EDGE-FW","","10.20.30.40","10.20.40.10:443","HTTPS session","ALLOWED","info","Routine internal application traffic"],
  ["DNS / Proxy","DNS-01","","10.20.6.31","DNS-01","DNS query: time.example.net","SUCCESS","info","Routine NTP-related lookup"],
  ["Endpoint / OS","WS-04","alex","","","Process start: teams.exe","SUCCESS","info","User collaboration application started"],
  ["Endpoint / OS","WS-18","backupsvc","","","Scheduled backup agent","SUCCESS","info","Expected backup task"],
  ["Web / Application","WEB-02","","203.0.113.24","WEB-02:443","GET /health","200","info","Health-check request"],
  ["IDS / IPS","IDS-01","","192.0.2.18","10.20.50.12","Port scan signature","BLOCKED","low","Blocked reconnaissance probe"],
  ["Firewall / Network","EDGE-FW","","10.20.8.19","198.51.100.8:443","HTTPS session","ALLOWED","info","Approved software update"],
  ["Authentication","IDP-01","svc-monitor","10.20.1.50","IDP-01","Service authentication","SUCCESS","info","Monitoring service login"],
  ["DNS / Proxy","DNS-01","","10.20.11.10","DNS-01","DNS query: docs.example.net","SUCCESS","info","Routine documentation lookup"],
  ["Endpoint / OS","WS-03","rpatel","","","Process start: outlook.exe","SUCCESS","info","Mail client launched"],
  ["Web / Application","APP-02","api-svc","10.20.40.12","DB-02:5432","Application DB query","SUCCESS","info","Expected business application query"],
  ["Firewall / Network","EDGE-FW","","10.20.7.20","203.0.113.10:443","HTTPS session","ALLOWED","info","Approved SaaS access"],
  ["IDS / IPS","IDS-01","","198.51.100.66","10.20.60.14","Known scanner signature","BLOCKED","medium","Blocked known scanning source"],
  ["Authentication","IDP-01","dlee","10.20.5.44","IDP-01","Interactive login","FAILED","info","Single mistyped password"],
  ["Endpoint / OS","WS-12","dlee","","","Process start: chrome.exe","SUCCESS","info","Browser launched"],
  ["DNS / Proxy","DNS-01","","10.20.5.44","DNS-01","DNS query: portal.example.net","SUCCESS","info","Routine portal lookup"],
  ["Firewall / Network","EDGE-FW","","10.20.5.44","10.20.70.20:443","HTTPS session","ALLOWED","info","Routine intranet traffic"],
  ["Web / Application","WEB-02","","192.0.2.31","WEB-02:443","GET /robots.txt","404","info","Ordinary missing-resource request"],
];

function formatLocalPdt(ms) {
  // All synthetic v1 scenarios occur during PDT (UTC-07:00). Preserve local clock
  // time so generated noise stays visually comparable to the scenario telemetry.
  return `${new Date(ms - 7 * 60 * 60 * 1000).toISOString().slice(0, 19)}-07:00`;
}

function generatedNoise(scenario, count) {
  const out = [];
  const anchorMs = new Date(scenario.events[0].timestamp).getTime();
  for (let i = 0; i < count; i++) {
    const t = commonNoise[i % commonNoise.length];
    // Deterministic noise within roughly four minutes before to ten minutes after
    // the incident start. Advanced mode therefore adds ambiguity, not an obvious
    // off-hour block of events that can be discarded without analysis.
    const offsetSeconds = -240 + ((i * 97 + scenario.id.length * 41) % 841);
    out.push(makeEvent(
      `${scenario.id}-N${pad(i + 1)}`,
      formatLocalPdt(anchorMs + offsetSeconds * 1000),
      t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8],
      { noise: true }
    ));
  }
  return out;
}

const credential = {
  id: "credential",
  caseId: "INC-701-0147",
  title: "Privileged Authentication Anomaly",
  family: "Credential Compromise / Unauthorized Access",
  severity: "High",
  reportedAsset: "APP-ADMIN-01 / admin",
  alertEventId: "C6",
  firstObserved: "2026-08-15 09:14:10 PDT",
  summary: "The SOC received an alert for repeated privileged authentication failures followed by a successful login. Determine whether the activity progressed to compromise.",
  facts: ["Remote administration is allowed only through VPN-GW.", "The admin account normally originates from ADMIN-NET.", "APP-ADMIN-01 is an administrative jump host.", "MFA was temporarily exempted for this legacy admin workflow."],
  events: [
    makeEvent("C1","2026-08-15T09:14:03-07:00","Authentication","VPN-GW","admin","203.0.113.55","VPN-GW","VPN authentication","FAILED","medium","Privileged login failure"),
    makeEvent("C2","2026-08-15T09:14:05-07:00","Authentication","VPN-GW","admin","203.0.113.55","VPN-GW","VPN authentication","FAILED","medium","Privileged login failure"),
    makeEvent("C3","2026-08-15T09:14:06-07:00","Authentication","VPN-GW","admin","203.0.113.55","VPN-GW","VPN authentication","FAILED","medium","Privileged login failure"),
    makeEvent("C4","2026-08-15T09:15:44-07:00","Authentication","IDP-01","jsmith","10.20.5.20","IDP-01","Interactive login","SUCCESS","info","Normal employee login",{noise:true}),
    makeEvent("C5","2026-08-15T09:14:08-07:00","Authentication","VPN-GW","admin","203.0.113.55","VPN-GW","VPN authentication","FAILED","medium","Privileged login failure"),
    makeEvent("C6","2026-08-15T09:14:10-07:00","Authentication","VPN-GW","admin","203.0.113.55","VPN-GW","VPN authentication","SUCCESS","high","Privileged VPN login succeeded"),
    makeEvent("C7","2026-08-15T09:14:12-07:00","Authentication","APP-ADMIN-01","admin","203.0.113.55","APP-ADMIN-01","Remote administrative session","SUCCESS","high","New privileged remote session created"),
    makeEvent("C8","2026-08-15T09:14:18-07:00","Endpoint / OS","APP-ADMIN-01","admin","","","PowerShell launched with encoded command","SUCCESS","high","Unusual process execution under admin session"),
    makeEvent("C9","2026-08-15T09:14:24-07:00","Firewall / Network","EDGE-FW","admin","10.20.9.15","198.51.100.77:443","Outbound HTTPS session","ALLOWED","high","New external connection from admin jump host"),
    makeEvent("C10","2026-08-15T09:13:40-07:00","Authentication","IDP-01","mlee","10.20.5.31","IDP-01","Interactive login","SUCCESS","info","Normal employee login",{noise:true}),
    makeEvent("C11","2026-08-15T09:12:22-07:00","Authentication","IDP-01","admin","10.20.1.40","IDP-01","Interactive login","SUCCESS","info","Known admin login from ADMIN-NET",{noise:true}),
    makeEvent("C12","2026-08-15T09:18:01-07:00","IDS / IPS","IDS-01","","192.0.2.90","10.20.50.20","Generic scanner signature","BLOCKED","low","Unrelated blocked scan",{noise:true}),
  ],
  answers: {
    evidenceIds: ["C1","C2","C5","C6","C7","C8","C9"],
    timelineIds: ["C1","C5","C6","C7","C8","C9"],
    scope: {
      "admin account": "confirmed",
      "APP-ADMIN-01": "confirmed",
      "FILE-02": "clean",
      "DB-02": "clean"
    },
    classification: {
      attackType: "Successful brute-force account compromise",
      successState: "Successful",
      initialEntity: "admin account via VPN-GW",
      indicator: "203.0.113.55"
    },
    containment: "Disable/reset the admin account, revoke active sessions, isolate APP-ADMIN-01, and preserve evidence"
  },
  options: {
    attackType: ["Successful brute-force account compromise","Password spraying","Credential stuffing","Benign user error"],
    successState: ["Attempted only","Blocked","Successful","Indeterminate"],
    initialEntity: ["admin account via VPN-GW","APP-ADMIN-01 via outbound HTTPS","jsmith account","DB-02"],
    indicator: ["203.0.113.55","198.51.100.18","10.20.5.20","192.0.2.90"],
    containment: [
      {value:"Disable/reset the admin account, revoke active sessions, isolate APP-ADMIN-01, and preserve evidence", preservesEvidence:true},
      {value:"Block 203.0.113.55 only and leave the admin credential active", preservesEvidence:true},
      {value:"Delete the authentication logs and rebuild the jump host immediately", preservesEvidence:false, critical:true},
      {value:"Email all users to change passwords before containing the known compromise", preservesEvidence:true}
    ]
  },
  entities: ["admin account","APP-ADMIN-01","FILE-02","DB-02"],
  study: {
    clue: "Same user + same external source + rapid failures + immediate success becomes stronger when a second source shows a remote session.",
    distinction: "Brute force targets one account with many guesses; password spraying tries one/few passwords across many accounts.",
    exam: "A SUCCESS after repeated failures can be the most important event because it changes an attempt into probable compromise."
  }
};

const malware = {
  id: "malware",
  caseId: "INC-701-0226",
  title: "Endpoint Beaconing and Lateral Activity",
  family: "Malware Infection / C2 / Host Spread",
  severity: "Critical",
  reportedAsset: "WS-02",
  alertEventId: "M9",
  firstObserved: "2026-08-15 10:04:08 PDT",
  summary: "EDR quarantined a suspicious file on WS-02. Determine the true infection order, affected scope, and the first containment action.",
  facts: ["EDR quarantine timestamps may occur after initial execution.", "DNS-SRV logs all workstation lookups.", "Outbound HTTPS is generally allowed.", "WS-01 and WS-02 are user workstations on the same segment."],
  events: [
    makeEvent("M1","2026-08-15T10:02:11-07:00","Endpoint / OS","WS-01","jgarcia","","","Process start: invoice_viewer.exe","SUCCESS","high","Unsigned executable launched from Downloads"),
    makeEvent("M2","2026-08-15T10:02:18-07:00","DNS / Proxy","DNS-01","","10.20.21.11","DNS-01","DNS query: sync-update.invalid","SUCCESS","high","Newly observed domain lookup from WS-01"),
    makeEvent("M3","2026-08-15T10:02:21-07:00","Firewall / Network","EDGE-FW","","10.20.21.11","198.51.100.44:443","Outbound HTTPS session","ALLOWED","high","WS-01 connected to rare external destination"),
    makeEvent("M4","2026-08-15T10:02:36-07:00","IDS / IPS","IDS-01","","10.20.21.11","198.51.100.44","Periodic beacon pattern","ALERT","high","Repeated low-volume callbacks detected"),
    makeEvent("M5","2026-08-15T10:03:07-07:00","Authentication","WS-02","svc-helpdesk","10.20.21.11","WS-02","Remote authentication","SUCCESS","high","New lateral authentication from WS-01"),
    makeEvent("M6","2026-08-15T10:03:15-07:00","Endpoint / OS","WS-02","svc-helpdesk","","","rundll32.exe C:\\ProgramData\\cache.dll","SUCCESS","high","Suspicious DLL execution"),
    makeEvent("M7","2026-08-15T10:03:21-07:00","DNS / Proxy","DNS-01","","10.20.21.12","DNS-01","DNS query: sync-update.invalid","SUCCESS","high","Same rare domain lookup from WS-02"),
    makeEvent("M8","2026-08-15T10:03:25-07:00","Firewall / Network","EDGE-FW","","10.20.21.12","198.51.100.44:443","Outbound HTTPS session","ALLOWED","critical","WS-02 connected to same rare external destination"),
    makeEvent("M9","2026-08-15T10:04:08-07:00","Endpoint / OS","WS-02","SYSTEM","","","EDR quarantine: cache.dll","QUARANTINED","high","Suspicious DLL quarantined after execution"),
    makeEvent("M10","2026-08-15T10:03:50-07:00","DNS / Proxy","DNS-01","","10.20.21.13","DNS-01","DNS query: sync-update.invalid","BLOCKED","medium","WS-03 attempted same lookup; sinkhole blocked resolution"),
    makeEvent("M11","2026-08-15T10:04:18-07:00","Endpoint / OS","WS-03","rpatel","","","Full EDR scan","CLEAN","info","No malicious process or file found"),
    makeEvent("M12","2026-08-15T10:01:30-07:00","Endpoint / OS","WS-04","backupsvc","","","Backup agent task","SUCCESS","info","Scheduled backup",{noise:true}),
  ],
  answers: {
    evidenceIds: ["M1","M2","M3","M4","M5","M6","M7","M8","M9"],
    timelineIds: ["M1","M2","M3","M5","M6","M7","M8","M9"],
    scope: {
      "WS-01": "confirmed",
      "WS-02": "confirmed",
      "WS-03": "suspicious",
      "WS-04": "clean"
    },
    classification: {
      attackType: "Malware infection with C2 and lateral spread",
      successState: "Successful",
      initialEntity: "WS-01",
      indicator: "sync-update.invalid / 198.51.100.44"
    },
    containment: "Isolate WS-01 and WS-02, block the confirmed C2 indicator, and preserve evidence"
  },
  options: {
    attackType: ["Malware infection with C2 and lateral spread","Benign software update","Password spraying","Denial-of-service attack"],
    successState: ["Attempted only","Blocked","Successful","Indeterminate"],
    initialEntity: ["WS-01","WS-02","WS-03","IDS-01"],
    indicator: ["sync-update.invalid / 198.51.100.44","time.example.net","203.0.113.10","10.20.21.13"],
    containment: [
      {value:"Isolate WS-01 and WS-02, block the confirmed C2 indicator, and preserve evidence", preservesEvidence:true},
      {value:"Treat WS-02 as patient zero because it was quarantined first and leave WS-01 online", preservesEvidence:true},
      {value:"Reimage all four workstations immediately without preserving logs or volatile evidence", preservesEvidence:false, critical:true},
      {value:"Block DNS for the entire company and take no endpoint containment action", preservesEvidence:true}
    ]
  },
  entities: ["WS-01","WS-02","WS-03","WS-04"],
  study: {
    clue: "Execution → DNS → outbound C2 on WS-01 occurs before lateral authentication and the same pattern on WS-02.",
    distinction: "Quarantined tells you the control acted; it does not prove the host was never infected.",
    exam: "Patient zero is the earliest host with corroborated malicious execution/communication, not necessarily the first host that generated an alert."
  }
};

const web = {
  id: "web",
  caseId: "INC-701-0318",
  title: "Web Application Attack Correlation",
  family: "Web Application Intrusion",
  severity: "High",
  reportedAsset: "WEB-01",
  alertEventId: "W1",
  firstObserved: "2026-08-15 11:27:03 PDT",
  summary: "A WAF signature identified a suspicious request. Determine whether the request was merely detected, blocked, or likely succeeded.",
  facts: ["WAF-01 is currently in alert-only mode for one legacy application path.", "WEB-01 connects to DB-01 using an application service account.", "Normal external users should never retrieve finance export rows.", "WEB-02 hosts only a health endpoint."],
  events: [
    makeEvent("W1","2026-08-15T11:27:03-07:00","Web / Application","WAF-01","","203.0.113.88","WEB-01:443","SQL injection signature on /search","ALERT_ONLY","high","Request matched SQL injection signature but was not blocked"),
    makeEvent("W2","2026-08-15T11:27:04-07:00","Web / Application","WEB-01","","203.0.113.88","WEB-01:443","GET /search?q=' UNION SELECT ...","200","high","Suspicious request returned HTTP 200"),
    makeEvent("W3","2026-08-15T11:27:05-07:00","Web / Application","APP-01","app-svc","WEB-01","DB-01","Search query execution","SUCCESS","critical","Unexpected query returned 47 finance-export rows"),
    makeEvent("W4","2026-08-15T11:27:06-07:00","Firewall / Network","DB-FW","app-svc","10.20.50.11","10.20.60.20:5432","Application DB session","ALLOWED","medium","WEB-01 application service accessed DB-01"),
    makeEvent("W5","2026-08-15T11:27:08-07:00","Web / Application","WEB-01","","203.0.113.88","WEB-01:443","Response body transfer","200","high","Large response sent to the same external client"),
    makeEvent("W6","2026-08-15T11:28:30-07:00","IDS / IPS","IDS-01","","203.0.113.88","WEB-01","Repeated web exploit pattern","ALERT","medium","Additional injection-like requests observed"),
    makeEvent("W7","2026-08-15T11:26:10-07:00","Web / Application","WEB-02","","203.0.113.24","WEB-02:443","GET /health","200","info","Normal health check",{noise:true}),
    makeEvent("W8","2026-08-15T11:29:02-07:00","Web / Application","WAF-01","","192.0.2.77","WEB-01:443","Directory traversal signature","BLOCKED","medium","Unrelated traversal attempt blocked",{noise:true}),
    makeEvent("W9","2026-08-15T11:25:45-07:00","Firewall / Network","EDGE-FW","","10.20.50.12","203.0.113.10:443","Software update","ALLOWED","info","Routine update traffic",{noise:true}),
    makeEvent("W10","2026-08-15T11:30:11-07:00","Authentication","IDP-01","webadmin","10.20.1.40","WEB-01","Admin login","SUCCESS","info","Known maintenance login after alert",{noise:true}),
  ],
  answers: {
    evidenceIds: ["W1","W2","W3","W4","W5","W6"],
    timelineIds: ["W1","W2","W3","W4","W5"],
    scope: {
      "WEB-01 application": "confirmed",
      "DB-01 data": "confirmed",
      "WAF-01": "clean",
      "WEB-02": "clean"
    },
    classification: {
      attackType: "SQL injection",
      successState: "Successful",
      initialEntity: "WEB-01 application",
      indicator: "203.0.113.88"
    },
    containment: "Block the malicious source/request pattern, disable the vulnerable application path, and preserve web/application logs"
  },
  options: {
    attackType: ["SQL injection","Directory traversal","Cross-site request forgery","Password spraying"],
    successState: ["Attempted only","Blocked","Successful","Indeterminate"],
    initialEntity: ["WEB-01 application","DB-01 administrator account","WEB-02","WAF-01"],
    indicator: ["203.0.113.88","192.0.2.77","10.20.1.40","203.0.113.24"],
    containment: [
      {value:"Block the malicious source/request pattern, disable the vulnerable application path, and preserve web/application logs", preservesEvidence:true},
      {value:"Assume the WAF blocked the request because it generated an alert and take no action", preservesEvidence:true},
      {value:"Delete WEB-01 logs and immediately rebuild the server before preserving evidence", preservesEvidence:false, critical:true},
      {value:"Shut down the entire corporate network without validating application scope", preservesEvidence:true}
    ]
  },
  entities: ["WEB-01 application","DB-01 data","WAF-01","WEB-02"],
  study: {
    clue: "A WAF alert is not the final verdict. Read its action, then corroborate with web response and application/DB behavior.",
    distinction: "Detection ≠ blocking. HTTP 200 alone also does not prove exploitation; the application log showing unauthorized data retrieval is decisive.",
    exam: "Classify success from result fields plus corroboration, not from the scary-looking payload."
  }
};

const exfil = {
  id: "exfil",
  caseId: "INC-701-0409",
  title: "Sensitive Data Egress Investigation",
  family: "Suspicious Data Access / Exfiltration",
  severity: "Critical",
  reportedAsset: "WS-17 / jdoe",
  alertEventId: "E5",
  firstObserved: "2026-08-15 08:03:11 PDT",
  summary: "DLP identified sensitive finance data during an external transfer. Determine whether the event reflects access only, attempted transfer, or confirmed exfiltration.",
  facts: ["jdoe works in Operations, not Finance.", "WS-17 is assigned to jdoe.", "DLP is configured in monitor-only mode for the legacy upload service.", "Finance exports are stored on FIN-FILE-01."],
  events: [
    makeEvent("E1","2026-08-15T07:58:12-07:00","Authentication","IDP-01","jdoe","10.20.17.17","IDP-01","Interactive login","SUCCESS","medium","Login from assigned workstation outside normal shift"),
    makeEvent("E2","2026-08-15T08:01:03-07:00","Web / Application","FIN-FILE-01","jdoe","10.20.17.17","FIN-FILE-01","Read /finance/Q3-forecast.xlsx","SUCCESS","high","User read restricted finance file"),
    makeEvent("E3","2026-08-15T08:02:18-07:00","Endpoint / OS","WS-17","jdoe","","","7z.exe create finance_q3.7z","SUCCESS","high","Sensitive file staged into archive"),
    makeEvent("E4","2026-08-15T08:03:05-07:00","DNS / Proxy","PROXY-01","jdoe","10.20.17.17","upload-box.invalid","HTTPS upload","ALLOWED","high","External upload session started"),
    makeEvent("E5","2026-08-15T08:03:11-07:00","DLP","DLP-01","jdoe","10.20.17.17","upload-box.invalid","Sensitive-content match: finance","ALERT_ONLY","critical","DLP detected finance content; policy was monitor-only"),
    makeEvent("E6","2026-08-15T08:04:42-07:00","Firewall / Network","EDGE-FW","jdoe","10.20.17.17","198.51.100.201:443","Outbound HTTPS transfer 428 MB","ALLOWED","critical","Large upload completed to external destination"),
    makeEvent("E7","2026-08-15T08:05:00-07:00","Web / Application","PROXY-01","jdoe","10.20.17.17","upload-box.invalid","Upload response","201 CREATED","critical","External service confirmed object creation"),
    makeEvent("E8","2026-08-15T07:57:20-07:00","Web / Application","FIN-FILE-01","finance-svc","10.20.30.15","FIN-FILE-01","Scheduled report export","SUCCESS","info","Expected automated export",{noise:true}),
    makeEvent("E9","2026-08-15T08:00:22-07:00","Authentication","IDP-01","mlee","10.20.5.31","IDP-01","Interactive login","SUCCESS","info","Normal employee login",{noise:true}),
    makeEvent("E10","2026-08-15T08:06:30-07:00","DLP","DLP-01","finance-svc","10.20.30.15","approved.partner.example","Sensitive-content match: finance","ALLOWED_EXCEPTION","info","Approved finance transfer exception",{noise:true}),
  ],
  answers: {
    evidenceIds: ["E1","E2","E3","E4","E5","E6","E7"],
    timelineIds: ["E1","E2","E3","E4","E5","E6","E7"],
    scope: {
      "jdoe account": "confirmed",
      "WS-17": "confirmed",
      "FIN-FILE-01 data": "confirmed",
      "WS-18": "clean"
    },
    classification: {
      attackType: "Confirmed data exfiltration",
      successState: "Successful",
      initialEntity: "jdoe on WS-17",
      indicator: "upload-box.invalid / 198.51.100.201"
    },
    containment: "Disable the jdoe session/account, isolate WS-17, block the upload destination, and preserve evidence"
  },
  options: {
    attackType: ["Confirmed data exfiltration","Authorized bulk transfer","Attempted exfiltration only","Denial-of-service attack"],
    successState: ["Attempted only","Blocked","Successful","Indeterminate"],
    initialEntity: ["jdoe on WS-17","finance-svc on FIN-FILE-01","mlee on WS-18","DLP-01"],
    indicator: ["upload-box.invalid / 198.51.100.201","approved.partner.example","10.20.30.15","10.20.5.31"],
    containment: [
      {value:"Disable the jdoe session/account, isolate WS-17, block the upload destination, and preserve evidence", preservesEvidence:true},
      {value:"Treat the file read as the only issue and leave the active user session online", preservesEvidence:true},
      {value:"Delete proxy/DLP logs and wipe WS-17 before preserving evidence", preservesEvidence:false, critical:true},
      {value:"Notify all staff of a possible breach before containing the known account and workstation", preservesEvidence:true}
    ]
  },
  entities: ["jdoe account","WS-17","FIN-FILE-01 data","WS-18"],
  study: {
    clue: "File access proves access; the firewall/proxy transfer plus 201 CREATED proves external egress.",
    distinction: "DLP ALERT_ONLY means detection without prevention. Read the action/result before assuming the data was blocked.",
    exam: "To call exfiltration successful, look for evidence that data actually left or the external service accepted it."
  }
};

export const SCENARIOS = [credential, malware, web, exfil];

export function getScenario(id) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return clone(scenario);
}

function stableRank(id) {
  let h = 2166136261;
  for (const c of id) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getEvents(scenarioId, difficulty = "standard") {
  const scenario = getScenario(scenarioId);
  const target = difficulty === "advanced" ? 32 : 22;
  const needed = Math.max(0, target - scenario.events.length);
  const events = [...scenario.events, ...generatedNoise(scenario, needed)].map((e) => ({
    ...e,
    raw: e.raw || formatRaw(e)
  }));
  // Deliberately non-chronological display order; advanced is more aggressively scrambled.
  return events.sort((a, b) => {
    const ra = stableRank(`${difficulty}-${a.id}`);
    const rb = stableRank(`${difficulty}-${b.id}`);
    return ra - rb;
  });
}

export function sortChronologically(events) {
  return [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp) || a.id.localeCompare(b.id));
}

export const SCOPE_OPTIONS = ["confirmed","suspicious","clean","insufficient"];

function f1Score(selected, expected) {
  const s = new Set(selected || []);
  const e = new Set(expected || []);
  let tp = 0;
  for (const id of s) if (e.has(id)) tp++;
  const fp = [...s].filter((id) => !e.has(id)).length;
  const fn = [...e].filter((id) => !s.has(id)).length;
  if (!tp) return 0;
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  return (2 * precision * recall) / (precision + recall);
}

function timelineScore(selected, expected, allowedRelevant = expected) {
  if (!selected?.length) return 0;
  const uniqueSelected = [...new Set(selected)];
  const position = new Map(uniqueSelected.map((id, i) => [id, i]));
  const expectedSet = new Set(expected);
  const allowedSet = new Set(allowedRelevant);
  let pairTotal = 0;
  let pairCorrect = 0;
  for (let i = 0; i < expected.length; i++) {
    for (let j = i + 1; j < expected.length; j++) {
      pairTotal++;
      const a = position.get(expected[i]);
      const b = position.get(expected[j]);
      if (a !== undefined && b !== undefined && a < b) pairCorrect++;
    }
  }
  const expectedSelected = uniqueSelected.filter((id) => expectedSet.has(id)).length;
  const noiseExtras = uniqueSelected.filter((id) => !allowedSet.has(id)).length;
  const coverage = expectedSelected / expected.length;
  const precision = expectedSelected / (expectedSelected + noiseExtras);
  const order = pairTotal ? pairCorrect / pairTotal : 0;
  // A condensed key timeline may legitimately include additional evidence-bearing
  // events. Penalize actual noise, not defensible corroborating evidence.
  return Math.max(0, Math.min(1, coverage * precision * order));
}

function classificationScore(given, expected) {
  const keys = ["attackType","successState","initialEntity","indicator"];
  return keys.filter((k) => given?.[k] === expected[k]).length / keys.length;
}

function scopeScore(given, expected) {
  const keys = Object.keys(expected);
  return keys.filter((k) => given?.[k] === expected[k]).length / keys.length;
}

function containmentMeta(scenario, value) {
  return scenario.options.containment.find((x) => x.value === value) || { value, preservesEvidence:false, critical:false };
}

export function evaluateRelationships(scenarioId, attempt) {
  const s = getScenario(scenarioId);
  const a = attempt || {};
  const evidenceSet = new Set(a.evidenceIds || []);
  const eventById = new Map(s.events.map((e) => [e.id, e]));
  const selectedSourceTypes = new Set([...evidenceSet].map((id) => eventById.get(id)?.sourceType).filter(Boolean));
  const scopeEntries = Object.entries(s.answers.scope);
  const scopeConsistent = scopeEntries.every(([entity, expectedState]) => a.scope?.[entity] === expectedState);
  const tl = timelineScore(a.timelineIds || [], s.answers.timelineIds, s.answers.evidenceIds);
  const cmeta = containmentMeta(s, a.containment);
  const relationships = [
    {id:"chronology", label:"Canonical incident chronology reconstructed", pass: tl === 1},
    {id:"corroboration", label:"Evidence corroborates across at least two source types", pass:selectedSourceTypes.size >= 2 && f1Score(a.evidenceIds, s.answers.evidenceIds) >= 0.70},
    {id:"source", label:"Initial compromised entity identified", pass:a.classification?.initialEntity === s.answers.classification.initialEntity},
    {id:"indicator", label:"Primary malicious indicator identified", pass:a.classification?.indicator === s.answers.classification.indicator},
    {id:"attack", label:"Incident/attack class matches the evidence", pass:a.classification?.attackType === s.answers.classification.attackType},
    {id:"success", label:"Attempted/blocked/successful state interpreted correctly", pass:a.classification?.successState === s.answers.classification.successState},
    {id:"scope", label:"Affected, suspicious, and clean entities scoped consistently", pass:scopeConsistent},
    {id:"noise", label:"Evidence selection is not dominated by benign noise", pass:f1Score(a.evidenceIds, s.answers.evidenceIds) >= 0.75},
    {id:"containment", label:"First containment action targets the active risk", pass:a.containment === s.answers.containment},
    {id:"evidence", label:"Response preserves evidence", pass:Boolean(cmeta.preservesEvidence)}
  ];
  return relationships;
}

export function scoreAttempt(scenarioId, attempt, difficulty = "standard") {
  const s = getScenario(scenarioId);
  const evidence = f1Score(attempt?.evidenceIds, s.answers.evidenceIds);
  const timeline = timelineScore(attempt?.timelineIds, s.answers.timelineIds, s.answers.evidenceIds);
  const classification = classificationScore(attempt?.classification, s.answers.classification);
  const scope = scopeScore(attempt?.scope, s.answers.scope);
  const containment = attempt?.containment === s.answers.containment ? 1 : 0;
  const relationships = evaluateRelationships(scenarioId, attempt);
  const relationshipFraction = relationships.filter((r) => r.pass).length / relationships.length;

  const metrics = {
    evidence: Math.round(evidence * 2000) / 100,
    timeline: Math.round(timeline * 1500) / 100,
    classification: Math.round(classification * 1500) / 100,
    scope: Math.round(scope * 2000) / 100,
    containment: Math.round(containment * 1500) / 100,
    relationships: Math.round(relationshipFraction * 1500) / 100
  };
  const score = Math.round(Object.values(metrics).reduce((a,b) => a + b, 0) * 100) / 100;
  const cmeta = containmentMeta(s, attempt?.containment);
  const criticalScopeFailure = Object.entries(s.answers.scope).some(([entity, state]) =>
    state === "confirmed" && attempt?.scope?.[entity] === "clean"
  );
  const criticalFailure = Boolean(cmeta.critical || criticalScopeFailure);
  const allRelationshipsPass = relationships.every((r) => r.pass);
  const coreRelationshipPass = ["scope","containment","evidence"].every((id) => relationships.find((r) => r.id === id)?.pass);
  const secure = score >= 80 && !criticalFailure && coreRelationshipPass;
  const rating = criticalFailure
    ? "Critical reasoning failure"
    : score >= 90 && allRelationshipsPass
      ? "Excellent investigation"
      : secure
        ? "Secure / competent"
        : score >= 65
          ? "Developing / review required"
          : "Needs remediation";

  return { scenarioId, difficulty, score, metrics, relationships, criticalFailure, secure, rating };
}

export function canonicalAttempt(scenarioId) {
  const s = getScenario(scenarioId);
  return {
    evidenceIds: [...s.answers.evidenceIds],
    timelineIds: [...s.answers.timelineIds],
    scope: {...s.answers.scope},
    classification: {...s.answers.classification},
    containment: s.answers.containment
  };
}
