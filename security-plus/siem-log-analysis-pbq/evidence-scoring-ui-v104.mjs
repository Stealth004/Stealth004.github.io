// SIEM PBQ v1.0.4 — runtime evidence/timeline scoring and review overlay.
// Preserves the stable v1.0.3 app while correcting evidence taxonomy and
// separating timeline completeness from ordering.
import "./training-integrity.mjs";
import {getScenario,getEvents,scoreAttempt as baseScoreAttempt} from "./model.mjs";
import {
  EVIDENCE_SCORING_VERSION,
  taxonomyFor,
  classifyEvidence,
  evidenceAnalysis,
  timelineAnalysis,
  requirementStatus
} from "./evidence-scoring-core-v104.mjs";

const round2=(n)=>Math.round(n*100)/100;
const escapeHtml=(v="")=>String(v).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function containmentPreservesEvidence(scenario,value){
  return Boolean(scenario.options.containment.find((item)=>item.value===value)?.preservesEvidence);
}

export function scoreAttemptV104(scenarioId,attempt,difficulty="standard"){
  const scenario=getScenario(scenarioId);
  const base=baseScoreAttempt(scenarioId,attempt,difficulty);
  const evidence=evidenceAnalysis(scenarioId,attempt?.evidenceIds||[]);
  const timeline=timelineAnalysis(scenarioId,attempt?.timelineIds||[]);
  const relevantSelected=[...(attempt?.evidenceIds||[])].filter((id)=>classifyEvidence(scenarioId,id)!=="noise");
  const eventById=new Map(getEvents(scenarioId,difficulty).map((event)=>[event.id,event]));
  const selectedSourceTypes=new Set(relevantSelected.map((id)=>eventById.get(id)?.sourceType).filter(Boolean));

  const relationships=base.relationships.map((relationship)=>{
    if(relationship.id==="chronology") return {
      ...relationship,
      label:"Core chronology complete and selected relevant events ordered correctly",
      pass:timeline.coverage===1&&timeline.order===1&&timeline.noiseSelected.length===0
    };
    if(relationship.id==="corroboration") return {
      ...relationship,
      label:"Core evidence is corroborated across at least two telemetry source types",
      pass:evidence.coverage>=.8&&selectedSourceTypes.size>=2
    };
    if(relationship.id==="noise") return {
      ...relationship,
      label:"Evidence selection excludes unrelated noise",
      pass:evidence.noiseSelected.length===0
    };
    return relationship;
  });

  const metrics={
    ...base.metrics,
    evidence:round2(evidence.fraction*20),
    timeline:round2(timeline.fraction*15),
    relationships:round2((relationships.filter((r)=>r.pass).length/relationships.length)*15)
  };
  const score=round2(Object.values(metrics).reduce((sum,value)=>sum+value,0));
  const allRelationshipsPass=relationships.every((r)=>r.pass);
  const coreRelationshipPass=["scope","containment","evidence"].every((id)=>relationships.find((r)=>r.id===id)?.pass);
  const secure=score>=80&&!base.criticalFailure&&coreRelationshipPass;
  const rating=base.criticalFailure
    ?"Critical reasoning failure"
    :score>=90&&allRelationshipsPass
      ?"Excellent investigation"
      :secure
        ?"Secure / competent"
        :score>=65
          ?"Developing / review required"
          :"Needs remediation";

  return {...base,score,metrics,relationships,secure,rating,evidenceV104:evidence,timelineV104:timeline,
    preservesEvidence:containmentPreservesEvidence(scenario,attempt?.containment)};
}

function readAttemptFromDom(){
  const evidenceIds=[...document.querySelectorAll("#evidenceList [data-unpin]")].map((el)=>el.dataset.unpin).filter(Boolean);
  const timelineIds=[...document.querySelectorAll("#timelineList [data-remove-timeline]")].map((el)=>el.dataset.removeTimeline).filter(Boolean);
  const scope={};
  document.querySelectorAll("#scopeList [data-scope]").forEach((select)=>{scope[select.dataset.scope]=select.value;});
  const classification={
    attackType:document.getElementById("attackType")?.value||"",
    successState:document.getElementById("successState")?.value||"",
    initialEntity:document.getElementById("initialEntity")?.value||"",
    indicator:document.getElementById("indicator")?.value||""
  };
  const containment=document.querySelector('input[name="containment"]:checked')?.value||"";
  return {evidenceIds,timelineIds,scope,classification,containment};
}

function metricClass(value,max){
  const fraction=value/max;
  return fraction>=.9?"score-good":fraction>=.65?"score-mid":"score-bad";
}

function eventMap(scenarioId,difficulty){
  return new Map(getEvents(scenarioId,difficulty).map((event)=>[event.id,event]));
}

function coreLabelForId(scenarioId,id){
  const requirement=taxonomyFor(scenarioId).coreRequirements.find((r)=>r.ids.includes(id));
  return requirement?.ids.length>1?"Core pattern evidence":"Core evidence";
}

function renderEvidenceReviewV104(scenarioId,attempt,difficulty,analysis){
  const target=document.getElementById("evidenceReview");
  if(!target) return;
  const map=eventMap(scenarioId,difficulty);
  const selected=[...new Set(attempt.evidenceIds||[])];
  const rows=[];

  for(const id of selected){
    const event=map.get(id); if(!event) continue;
    const category=classifyEvidence(scenarioId,id);
    const label=category==="core"
      ?`${coreLabelForId(scenarioId,id)} — selected`
      :category==="supporting"
        ?"Supporting evidence — selected"
        :"Selected noise";
    rows.push(`<div class="review-item ${category==="noise"?"bad":"good"}"><strong>${escapeHtml(id)} — ${escapeHtml(label)}</strong><small>${escapeHtml(event.sourceType)} • ${escapeHtml(event.message)}</small></div>`);
  }

  for(const requirement of analysis.statuses.filter((item)=>!item.satisfied)){
    rows.push(`<div class="review-item bad"><strong>Missed core requirement</strong><small>${escapeHtml(requirement.label)}${requirement.ids.length>1?` • need at least ${requirement.min} event(s) from ${escapeHtml(requirement.ids.join(", "))}`:""}</small></div>`);
  }
  target.innerHTML=rows.join("")||'<div class="review-item bad"><strong>No evidence selected</strong><small>Identify the core incident evidence before submitting.</small></div>';
}

function renderTimelineReviewV104(scenarioId,attempt,difficulty,analysis){
  const target=document.getElementById("canonicalTimeline");
  if(!target) return;
  const map=eventMap(scenarioId,difficulty);
  const statuses=requirementStatus(scenarioId,attempt.timelineIds||[]);
  const rows=[`<div class="review-item ${analysis.order===1?"good":"bad"}"><strong>Timeline scoring model</strong><small>Core completeness: ${(analysis.coverage*100).toFixed(0)}% • Selected relevant-event order: ${(analysis.order*100).toFixed(0)}% • True noise in timeline: ${analysis.noiseSelected.length}</small></div>`];
  statuses.forEach((requirement,index)=>{
    if(requirement.ids.length>1){
      rows.push(`<div class="review-item ${requirement.satisfied?"good":"bad"}"><strong>${index+1}. ${escapeHtml(requirement.label)}</strong><small>${requirement.satisfied?"Satisfied":"Missing"} • selected ${escapeHtml(requirement.picked.join(", ")||"none")} • minimum ${requirement.min}</small></div>`);
      return;
    }
    const id=requirement.ids[0],event=map.get(id);
    rows.push(`<div class="review-item ${requirement.satisfied?"good":"bad"}"><strong>${index+1}. ${escapeHtml(requirement.label)}</strong><small>${event?`${escapeHtml(event.timestamp.replace("T"," ").replace("-07:00"," PDT"))} • ${escapeHtml(event.sourceType)} • ${escapeHtml(event.host||event.user||"—")} • ${escapeHtml(event.result)}`:escapeHtml(id)}</small></div>`);
  });
  target.innerHTML=rows.join("");
}

function reclassifyVisibleLogRows(scenarioId){
  if(!document.getElementById("results")?.classList.contains("show")) return;
  document.querySelectorAll("#logBody input[data-pin]").forEach((checkbox)=>{
    const row=checkbox.closest("tr"); if(!row) return;
    row.classList.remove("post-evidence","post-noise");
    row.classList.add(classifyEvidence(scenarioId,checkbox.dataset.pin)==="noise"?"post-noise":"post-evidence");
  });
}

function renderV104Results(){
  const results=document.getElementById("results");
  if(!results?.classList.contains("show")) return;
  const scenarioId=document.getElementById("scenarioSelect")?.value||"credential";
  const difficulty=document.getElementById("difficultySelect")?.value||"standard";
  const attempt=readAttemptFromDom();
  const result=scoreAttemptV104(scenarioId,attempt,difficulty);

  const resultTitle=document.getElementById("resultTitle");
  if(resultTitle) resultTitle.textContent=`${result.score.toFixed(2)} / 100 — ${result.rating}`;
  const resultSummary=document.getElementById("resultSummary");
  if(resultSummary) resultSummary.textContent=result.criticalFailure
    ?"A critical reasoning condition remains. Review containment, evidence preservation, and affected-scope decisions."
    :"v1.0.4 separates core evidence, supporting evidence, true noise, timeline completeness, and timeline ordering.";
  const resultBadge=document.getElementById("resultBadge");
  if(resultBadge) resultBadge.textContent=result.secure?"Secure reasoning":"Review required";

  const metricInfo=[["Evidence",result.metrics.evidence,20],["Timeline",result.metrics.timeline,15],["Classification",result.metrics.classification,15],["Scope",result.metrics.scope,20],["Containment",result.metrics.containment,15],["Relationships",result.metrics.relationships,15]];
  const resultGrid=document.getElementById("resultGrid");
  if(resultGrid) resultGrid.innerHTML=metricInfo.map(([label,value,max])=>`<div class="score-card"><small>${label}</small><strong class="${metricClass(value,max)}">${value.toFixed(2)} / ${max}</strong></div>`).join("");

  const relationshipList=document.getElementById("relationshipList");
  if(relationshipList) relationshipList.innerHTML=result.relationships.map((relationship)=>`<div class="rel-row"><div><strong>${escapeHtml(relationship.label)}</strong></div><div class="rel-icon">${relationship.pass?"✅":"❌"}</div></div>`).join("");

  renderEvidenceReviewV104(scenarioId,attempt,difficulty,result.evidenceV104);
  renderTimelineReviewV104(scenarioId,attempt,difficulty,result.timelineV104);
  reclassifyVisibleLogRows(scenarioId);

  const examLogic=document.getElementById("examLogic");
  if(examLogic&&!examLogic.querySelector("[data-v104-evidence-model]")){
    const p=document.createElement("p");
    p.dataset.v104EvidenceModel="true";
    p.innerHTML="<strong>Evidence model:</strong> CORE/PATTERN evidence establishes required incident anchors • SUPPORTING evidence is relevant corroboration or scope evidence and is never treated as noise • TRUE NOISE is unrelated to this incident. Timeline completeness and ordering are scored separately.";
    examLogic.append(p);
  }
}

function addStudyEvidenceCue(){
  const grid=document.querySelector("#studyPanel .study-grid");
  if(!grid||document.getElementById("studyEvidenceModelV104")) return;
  const card=document.createElement("div");
  card.className="study-item";
  card.id="studyEvidenceModelV104";
  card.innerHTML="<strong>Evidence categories</strong><span>CORE/PATTERN = establishes the incident • SUPPORTING = relevant corroboration/scope evidence • NOISE = unrelated. Supporting evidence should not be penalized as noise.</span>";
  grid.append(card);
}

export function applyEvidenceScoringIntegrity(){
  document.body.dataset.siemEvidenceScoringVersion=EVIDENCE_SCORING_VERSION;
  addStudyEvidenceCue();
  document.getElementById("submitBtn")?.addEventListener("click",()=>queueMicrotask(renderV104Results));
  const logBody=document.getElementById("logBody");
  if(logBody) new MutationObserver(()=>queueMicrotask(()=>reclassifyVisibleLogRows(document.getElementById("scenarioSelect")?.value||"credential"))).observe(logBody,{childList:true,subtree:false});
}
