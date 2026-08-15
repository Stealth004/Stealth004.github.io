// SIEM PBQ v1.0.4 — pure evidence/timeline scoring contract.
// Distinguishes core requirements, supporting evidence, and true noise.

export const EVIDENCE_SCORING_VERSION = "1.0.4";

const singleton = (id, label) => ({key:id, ids:[id], min:1, label});

export const EVIDENCE_TAXONOMY = Object.freeze({
  credential: {
    coreRequirements: [
      {key:"failure-cluster", ids:["C1","C2","C3","C5"], min:2, label:"Repeated privileged VPN authentication failures"},
      singleton("C6","Privileged VPN login succeeds"),
      singleton("C7","Privileged remote session is created"),
      singleton("C8","Encoded PowerShell executes on APP-ADMIN-01"),
      singleton("C9","APP-ADMIN-01 initiates new outbound HTTPS activity")
    ],
    supportingEvidenceIds: [],
    relevantOrder: ["C1","C2","C3","C5","C6","C7","C8","C9"]
  },
  malware: {
    coreRequirements: [
      singleton("M1","Initial suspicious execution on WS-01"),
      singleton("M2","Rare-domain lookup from WS-01"),
      singleton("M3","WS-01 outbound C2 connection"),
      singleton("M5","Lateral authentication from WS-01 to WS-02"),
      singleton("M6","Suspicious execution on WS-02"),
      singleton("M7","Same rare-domain lookup from WS-02"),
      singleton("M8","WS-02 outbound C2 connection"),
      singleton("M9","EDR quarantine after WS-02 execution")
    ],
    supportingEvidenceIds: ["M4","M10","M11"],
    relevantOrder: ["M1","M2","M3","M4","M5","M6","M7","M8","M10","M9","M11"]
  },
  web: {
    coreRequirements: [
      singleton("W1","WAF detects but does not block the injection request"),
      singleton("W2","WEB-01 returns HTTP 200 to the suspicious request"),
      singleton("W3","Application retrieves unauthorized finance rows"),
      singleton("W4","WEB-01 service reaches DB-01"),
      singleton("W5","Large response returns to the same external client")
    ],
    supportingEvidenceIds: ["W6","W7","W8"],
    relevantOrder: ["W7","W1","W2","W3","W4","W5","W6","W8"]
  },
  exfil: {
    coreRequirements: [
      singleton("E1","jdoe authenticates from WS-17"),
      singleton("E2","jdoe reads restricted finance data"),
      singleton("E3","WS-17 stages the data into an archive"),
      singleton("E4","External upload session begins"),
      singleton("E5","DLP detects finance content in monitor-only mode"),
      singleton("E6","Large external transfer completes"),
      singleton("E7","External service confirms object creation")
    ],
    supportingEvidenceIds: [],
    relevantOrder: ["E1","E2","E3","E4","E5","E6","E7"]
  }
});

const uniq = (values=[]) => [...new Set(values)];

export function taxonomyFor(scenarioId){
  const taxonomy = EVIDENCE_TAXONOMY[scenarioId];
  if(!taxonomy) throw new Error(`Unknown v1.0.4 evidence taxonomy: ${scenarioId}`);
  return taxonomy;
}

export function coreIdsFor(scenarioId){
  return uniq(taxonomyFor(scenarioId).coreRequirements.flatMap((r)=>r.ids));
}

export function relevantIdsFor(scenarioId){
  const t=taxonomyFor(scenarioId);
  return uniq([...coreIdsFor(scenarioId),...t.supportingEvidenceIds]);
}

export function requirementStatus(scenarioId, selectedIds=[]){
  const selected=new Set(selectedIds);
  return taxonomyFor(scenarioId).coreRequirements.map((requirement)=>{
    const picked=requirement.ids.filter((id)=>selected.has(id));
    return {...requirement,picked,satisfied:picked.length>=requirement.min};
  });
}

export function classifyEvidence(scenarioId,id){
  const t=taxonomyFor(scenarioId);
  if(t.coreRequirements.some((r)=>r.ids.includes(id))) return "core";
  if(t.supportingEvidenceIds.includes(id)) return "supporting";
  return "noise";
}

export function evidenceAnalysis(scenarioId,selectedIds=[]){
  const selected=uniq(selectedIds);
  const statuses=requirementStatus(scenarioId,selected);
  const satisfied=statuses.filter((r)=>r.satisfied).length;
  const coverage=statuses.length?satisfied/statuses.length:0;
  const supportingSelected=selected.filter((id)=>classifyEvidence(scenarioId,id)==="supporting");
  const coreSelected=selected.filter((id)=>classifyEvidence(scenarioId,id)==="core");
  const noiseSelected=selected.filter((id)=>classifyEvidence(scenarioId,id)==="noise");
  // Supporting evidence is relevant and never reduces precision. True unrelated noise does.
  const noisePenalty=Math.min(.40,noiseSelected.length*.08);
  const fraction=Math.max(0,Math.min(1,coverage-noisePenalty));
  return {fraction,coverage,noisePenalty,statuses,coreSelected,supportingSelected,noiseSelected};
}

function pairwiseOrderFraction(selectedRelevant,order){
  if(!selectedRelevant.length) return 0;
  if(selectedRelevant.length===1) return 1;
  const rank=new Map(order.map((id,index)=>[id,index]));
  let total=0,correct=0;
  for(let i=0;i<selectedRelevant.length;i++){
    for(let j=i+1;j<selectedRelevant.length;j++){
      const a=rank.get(selectedRelevant[i]);
      const b=rank.get(selectedRelevant[j]);
      if(a===undefined||b===undefined) continue;
      total++;
      if(a<b) correct++;
    }
  }
  return total?correct/total:1;
}

export function timelineAnalysis(scenarioId,selectedIds=[]){
  const selected=uniq(selectedIds);
  const t=taxonomyFor(scenarioId);
  const statuses=requirementStatus(scenarioId,selected);
  const satisfied=statuses.filter((r)=>r.satisfied).length;
  const coverage=statuses.length?satisfied/statuses.length:0;
  const relevantSet=new Set(relevantIdsFor(scenarioId));
  const selectedRelevant=selected.filter((id)=>relevantSet.has(id));
  const noiseSelected=selected.filter((id)=>!relevantSet.has(id));
  const order=pairwiseOrderFraction(selectedRelevant,t.relevantOrder);
  // Completeness and order are separate. Missing one late anchor should not also
  // count as an ordering failure for every pair involving that missing event.
  const noisePenalty=Math.min(.25,noiseSelected.length*.05);
  const fraction=Math.max(0,Math.min(1,.65*coverage+.35*order-noisePenalty));
  return {fraction,coverage,order,noisePenalty,statuses,selectedRelevant,noiseSelected};
}
