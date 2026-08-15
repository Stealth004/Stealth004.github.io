import {SCENARIOS,getScenario,getEvents,sortChronologically,SCOPE_OPTIONS,scoreAttempt} from "./model.mjs";

const $ = (id) => document.getElementById(id);
const state = {
  scenarioId: SCENARIOS[0].id,
  difficulty: "standard",
  study:false,
  activeSource:"All",
  filter:"",
  chronological:false,
  evidenceIds:[],
  timelineIds:[],
  scope:{},
  classification:{attackType:"",successState:"",initialEntity:"",indicator:""},
  containment:"",
  submitted:false,
  startedAt:Date.now()
};

const scopeLabels = {confirmed:"Confirmed affected / compromised",suspicious:"Suspicious — needs more evidence",clean:"Clean / no compromise evidence",insufficient:"Not enough information"};

function scenario(){ return getScenario(state.scenarioId); }
function events(){ return getEvents(state.scenarioId,state.difficulty); }
function eventMap(){ return new Map(events().map(e => [e.id,e])); }

function optionize(select, values, placeholder="Select…"){
  select.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`).join("");
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function escapeAttr(v=""){return escapeHtml(v);}

function resetAttempt(preserveScenario=true){
  if(!preserveScenario) state.scenarioId = SCENARIOS[0].id;
  state.study=false; state.activeSource="All"; state.filter=""; state.chronological=false;
  state.evidenceIds=[];state.timelineIds=[];state.scope={};state.classification={attackType:"",successState:"",initialEntity:"",indicator:""};state.containment="";
  state.submitted=false;state.startedAt=Date.now();
  $("filterInput").value="";
  renderAll();
}
function markDirty(){ if(state.submitted){state.submitted=false;$("results").classList.remove("show");} updateProgress(); }

function renderCase(){
  const s=scenario();
  $("caseMeta").textContent=s.caseId;$("familyMeta").textContent=s.family;$("severityMeta").textContent=s.severity;
  $("eventMeta").textContent=`${events().length} (${state.difficulty})`;
  $("evidenceMeta").textContent=state.evidenceIds.length;
  $("caseId").textContent=s.caseId;$("caseTitle").textContent=s.title;$("caseSummary").textContent=s.summary;
  $("facts").innerHTML=s.facts.map((f,i)=>`<div class="fact"><small>Context ${i+1}</small><strong>${escapeHtml(f)}</strong></div>`).join("");
  $("studyPanel").classList.toggle("show",state.study);
  $("studyBtn").textContent=`Study Mode: ${state.study?"On":"Off"}`;$("studyBtn").setAttribute("aria-pressed",String(state.study));
  $("modeBadge").textContent=state.study?"Study Mode":"Exam Mode";
}

function renderTabs(){
  const sources=["All",...new Set(events().map(e=>e.sourceType))];
  if(!sources.includes(state.activeSource)) state.activeSource="All";
  $("sourceTabs").innerHTML=sources.map(src=>`<button class="tab ${src===state.activeSource?"active":""}" data-source="${escapeAttr(src)}" type="button">${escapeHtml(src)}</button>`).join("");
  $("sourceTabs").querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{state.activeSource=btn.dataset.source;renderTabs();renderLogs();}));
}

function filteredEvents(){
  let rows=events();
  if(state.activeSource!=="All") rows=rows.filter(e=>e.sourceType===state.activeSource);
  const q=state.filter.trim().toLowerCase();
  if(q) rows=rows.filter(e=>[e.timestamp,e.sourceType,e.host,e.user,e.src,e.dst,e.action,e.result,e.message].join(" ").toLowerCase().includes(q));
  if(state.chronological) rows=sortChronologically(rows);
  return rows;
}
function resultClass(result){
  const r=String(result).toUpperCase();
  if(["SUCCESS","ALLOWED","200","201 CREATED"].includes(r)) return "success";
  if(["FAILED","BLOCKED"].includes(r)) return "bad";
  return "warn";
}
function renderLogs(){
  const s=scenario(), expected=new Set(s.answers.evidenceIds);
  $("sortBtn").textContent=`Sort: ${state.chronological?"Chronological":"Display Order"}`;
  $("logBody").innerHTML=filteredEvents().map(e=>{
    const checked=state.evidenceIds.includes(e.id);
    const postClass=state.submitted?(expected.has(e.id)?"post-evidence":"post-noise"):"";
    return `<tr class="${postClass}">
      <td><label class="pin"><input type="checkbox" data-pin="${e.id}" ${checked?"checked":""}> Pin</label></td>
      <td>${escapeHtml(e.timestamp.replace("T"," ").replace("-07:00"," PDT"))}</td>
      <td>${escapeHtml(e.sourceType)}</td>
      <td><strong>${escapeHtml(e.host||"—")}</strong><br><span class="muted">${escapeHtml(e.user||"—")}</span></td>
      <td>${escapeHtml(e.src||"—")}<br><span class="muted">→ ${escapeHtml(e.dst||"—")}</span></td>
      <td>${escapeHtml(e.action)}</td>
      <td><span class="result-chip ${resultClass(e.result)}">${escapeHtml(e.result)}</span></td>
      <td class="message">${escapeHtml(e.message)}</td>
      <td><button class="btn btn-small" type="button" data-raw="${e.id}">View</button></td>
    </tr>`;
  }).join("");
  $("logBody").querySelectorAll("[data-pin]").forEach(box=>box.addEventListener("change",()=>{
    const id=box.dataset.pin;
    if(box.checked){if(!state.evidenceIds.includes(id)) state.evidenceIds.push(id);}
    else {state.evidenceIds=state.evidenceIds.filter(x=>x!==id);state.timelineIds=state.timelineIds.filter(x=>x!==id);}
    markDirty();renderLogs();renderEvidence();renderTimeline();renderCase();
  }));
  $("logBody").querySelectorAll("[data-raw]").forEach(btn=>btn.addEventListener("click",()=>showRaw(btn.dataset.raw)));
}

function renderEvidence(){
  const map=eventMap();
  $("evidenceCount").textContent=`${state.evidenceIds.length} selected`;
  if(!state.evidenceIds.length){$("evidenceList").innerHTML=`<div class="empty">No evidence pinned yet.</div>`;return;}
  $("evidenceList").innerHTML=state.evidenceIds.map(id=>{
    const e=map.get(id);if(!e)return"";
    const inTimeline=state.timelineIds.includes(id);
    return `<div class="evidence-row"><div class="evidence-main"><strong>${escapeHtml(e.timestamp.slice(11,19))} • ${escapeHtml(e.sourceType)} • ${escapeHtml(e.host||e.user||id)}</strong><small>${escapeHtml(e.action)} — ${escapeHtml(e.result)} — ${escapeHtml(e.message)}</small></div><div class="actions"><button class="btn btn-small" data-timeline="${id}" type="button">${inTimeline?"Remove timeline":"Add timeline"}</button><button class="btn btn-small btn-danger" data-unpin="${id}" type="button">Unpin</button></div></div>`;
  }).join("");
  $("evidenceList").querySelectorAll("[data-timeline]").forEach(btn=>btn.addEventListener("click",()=>{
    const id=btn.dataset.timeline;
    if(state.timelineIds.includes(id)) state.timelineIds=state.timelineIds.filter(x=>x!==id); else state.timelineIds.push(id);
    markDirty();renderEvidence();renderTimeline();
  }));
  $("evidenceList").querySelectorAll("[data-unpin]").forEach(btn=>btn.addEventListener("click",()=>{
    const id=btn.dataset.unpin;state.evidenceIds=state.evidenceIds.filter(x=>x!==id);state.timelineIds=state.timelineIds.filter(x=>x!==id);
    markDirty();renderLogs();renderEvidence();renderTimeline();renderCase();
  }));
}
function moveTimeline(index,delta){
  const next=index+delta;if(next<0||next>=state.timelineIds.length)return;
  [state.timelineIds[index],state.timelineIds[next]]=[state.timelineIds[next],state.timelineIds[index]];
  markDirty();renderTimeline();
}
function renderTimeline(){
  const map=eventMap();$("timelineCount").textContent=`${state.timelineIds.length} events`;
  if(!state.timelineIds.length){$("timelineList").innerHTML=`<div class="empty">Add pinned evidence to the timeline, then order it by timestamp.</div>`;return;}
  $("timelineList").innerHTML=state.timelineIds.map((id,i)=>{
    const e=map.get(id);if(!e)return"";
    return `<div class="timeline-row"><div class="timeline-index">${i+1}</div><div class="evidence-main"><strong>${escapeHtml(e.timestamp.replace("T"," ").replace("-07:00"," PDT"))}</strong><small>${escapeHtml(e.sourceType)} • ${escapeHtml(e.host||e.user||"—")} • ${escapeHtml(e.action)} • ${escapeHtml(e.result)}</small></div><div class="actions"><button class="btn btn-small" data-up="${i}" type="button" aria-label="Move event up">↑</button><button class="btn btn-small" data-down="${i}" type="button" aria-label="Move event down">↓</button><button class="btn btn-small btn-danger" data-remove-timeline="${id}" type="button">×</button></div></div>`;
  }).join("");
  $("timelineList").querySelectorAll("[data-up]").forEach(btn=>btn.addEventListener("click",()=>moveTimeline(Number(btn.dataset.up),-1)));
  $("timelineList").querySelectorAll("[data-down]").forEach(btn=>btn.addEventListener("click",()=>moveTimeline(Number(btn.dataset.down),1)));
  $("timelineList").querySelectorAll("[data-remove-timeline]").forEach(btn=>btn.addEventListener("click",()=>{state.timelineIds=state.timelineIds.filter(x=>x!==btn.dataset.removeTimeline);markDirty();renderEvidence();renderTimeline();}));
}

function renderScope(){
  const s=scenario();
  $("scopeList").innerHTML=s.entities.map(entity=>`<div class="scope-row"><strong>${escapeHtml(entity)}</strong><select data-scope="${escapeAttr(entity)}"><option value="">Choose scope…</option>${SCOPE_OPTIONS.map(v=>`<option value="${v}" ${state.scope[entity]===v?"selected":""}>${escapeHtml(scopeLabels[v])}</option>`).join("")}</select></div>`).join("");
  $("scopeList").querySelectorAll("[data-scope]").forEach(sel=>sel.addEventListener("change",()=>{state.scope[sel.dataset.scope]=sel.value;markDirty();}));
}
function renderClassification(){
  const s=scenario();
  for(const key of ["attackType","successState","initialEntity","indicator"]){
    const el=$(key);optionize(el,s.options[key]);el.value=state.classification[key]||"";
    el.onchange=()=>{state.classification[key]=el.value;markDirty();};
  }
}
function renderContainment(){
  const s=scenario();
  $("containmentOptions").innerHTML=s.options.containment.map((x,i)=>`<label class="containment-option"><input type="radio" name="containment" value="${escapeAttr(x.value)}" ${state.containment===x.value?"checked":""}><span><strong>Option ${String.fromCharCode(65+i)}</strong><br>${escapeHtml(x.value)}</span></label>`).join("");
  $("containmentOptions").querySelectorAll("input").forEach(r=>r.addEventListener("change",()=>{state.containment=r.value;markDirty();}));
}
function showRaw(id){
  const e=eventMap().get(id);if(!e)return;
  $("rawTitle").textContent=`${e.id} • ${e.sourceType}`;$("rawContent").textContent=e.raw;$("rawDialog").showModal();
}
function attempt(){
  return {evidenceIds:[...state.evidenceIds],timelineIds:[...state.timelineIds],scope:{...state.scope},classification:{...state.classification},containment:state.containment};
}
function completion(){
  const s=scenario();let done=0,total=0;
  total+=1; if(state.evidenceIds.length)done++;
  total+=1; if(state.timelineIds.length>=3)done++;
  total+=s.entities.length;done+=s.entities.filter(e=>state.scope[e]).length;
  total+=4;done+=Object.values(state.classification).filter(Boolean).length;
  total+=1;if(state.containment)done++;
  return Math.round((done/total)*100);
}
function updateProgress(){$("progressFill").style.width=`${completion()}%`;}
function metricClass(v,max){const pct=v/max;return pct>=.9?"score-good":pct>=.65?"score-mid":"score-bad";}
function renderResults(){
  const s=scenario(),a=attempt(),r=scoreAttempt(state.scenarioId,a,state.difficulty);
  state.submitted=true;
  $("results").classList.add("show");$("resultTitle").textContent=`${r.score.toFixed(2)} / 100 — ${r.rating}`;
  $("resultSummary").textContent=r.criticalFailure?"A critical reasoning condition remains even if some category scores are strong. Review containment and affected-scope decisions.":"Review the evidence chain, chronology, scope, and first-response logic below.";
  $("resultBadge").textContent=r.secure?"Secure reasoning":"Review required";
  const metricInfo=[["Evidence",r.metrics.evidence,20],["Timeline",r.metrics.timeline,15],["Classification",r.metrics.classification,15],["Scope",r.metrics.scope,20],["Containment",r.metrics.containment,15],["Relationships",r.metrics.relationships,15]];
  $("resultGrid").innerHTML=metricInfo.map(([label,val,max])=>`<div class="score-card"><small>${label}</small><strong class="${metricClass(val,max)}">${val.toFixed(2)} / ${max}</strong></div>`).join("");
  $("criticalBox").innerHTML=r.criticalFailure?`<div class="critical"><strong>Critical gate triggered.</strong> A destructive response or a confirmed compromised entity classified as clean prevents a secure rating.</div>`:"";
  $("relationshipList").innerHTML=r.relationships.map(x=>`<div class="rel-row"><div><strong>${escapeHtml(x.label)}</strong></div><div class="rel-icon">${x.pass?"✅":"❌"}</div></div>`).join("");
  const map=eventMap();
  $("canonicalTimeline").innerHTML=s.answers.timelineIds.map((id,i)=>{const e=map.get(id);return `<div class="review-item ${state.timelineIds[i]===id?"good":"bad"}"><strong>${i+1}. ${escapeHtml(e.timestamp.replace("T"," ").replace("-07:00"," PDT"))}</strong><small>${escapeHtml(e.sourceType)} • ${escapeHtml(e.host||e.user||"—")} • ${escapeHtml(e.action)} • ${escapeHtml(e.result)}</small></div>`;}).join("");
  const expected=new Set(s.answers.evidenceIds), selected=new Set(state.evidenceIds);
  const all=[...new Set([...s.answers.evidenceIds,...state.evidenceIds])];
  $("evidenceReview").innerHTML=all.map(id=>{const e=map.get(id);if(!e)return"";const needed=expected.has(id),picked=selected.has(id);let label=needed&&picked?"Correct evidence":needed&&!picked?"Missed evidence":"Selected noise";return `<div class="review-item ${needed&&picked?"good":"bad"}"><strong>${escapeHtml(id)} — ${escapeHtml(label)}</strong><small>${escapeHtml(e.sourceType)} • ${escapeHtml(e.message)}</small></div>`;}).join("");
  const decisionRows=[
    ["Attack type",state.classification.attackType,s.answers.classification.attackType],
    ["Outcome",state.classification.successState,s.answers.classification.successState],
    ["Initial entity",state.classification.initialEntity,s.answers.classification.initialEntity],
    ["Indicator",state.classification.indicator,s.answers.classification.indicator],
    ["Containment",state.containment,s.answers.containment],
    ...s.entities.map(entity=>[`Scope: ${entity}`,scopeLabels[state.scope[entity]]||"—",scopeLabels[s.answers.scope[entity]]])
  ];
  $("decisionReview").innerHTML=decisionRows.map(([label,given,expectedVal])=>`<div class="review-item ${given===expectedVal?"good":"bad"}"><strong>${escapeHtml(label)}</strong><small>Your answer: ${escapeHtml(given||"—")}<br>Required: ${escapeHtml(expectedVal)}</small></div>`).join("");
  $("examLogic").innerHTML=`<strong>Exam Logic & Memory Aid</strong><p>${escapeHtml(s.study.clue)}</p><p><strong>Distinction:</strong> ${escapeHtml(s.study.distinction)}</p><p><strong>Fast rule:</strong> ${escapeHtml(s.study.exam)}</p><p><strong>Memory:</strong> ONE LOG = clue • TWO SOURCES = corroboration • TIMELINE = story • SCOPE = blast radius • CONTAINMENT = stop active risk.</p>`;
  renderLogs();
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderAll(){
  renderCase();renderTabs();renderLogs();renderEvidence();renderTimeline();renderScope();renderClassification();renderContainment();updateProgress();
}
function loadScenario(id){
  state.scenarioId=id;state.activeSource="All";state.filter="";state.chronological=false;
  state.evidenceIds=[];state.timelineIds=[];state.scope={};state.classification={attackType:"",successState:"",initialEntity:"",indicator:""};state.containment="";state.submitted=false;state.startedAt=Date.now();
  $("filterInput").value="";$("results").classList.remove("show");renderAll();
}
function nextScenario(){
  const idx=SCENARIOS.findIndex(s=>s.id===state.scenarioId);
  const next=SCENARIOS[(idx+1)%SCENARIOS.length].id;$("scenarioSelect").value=next;loadScenario(next);
}

$("scenarioSelect").innerHTML=SCENARIOS.map(s=>`<option value="${s.id}">${escapeHtml(s.family)}</option>`).join("");
$("scenarioSelect").value=state.scenarioId;
$("scenarioSelect").addEventListener("change",()=>loadScenario($("scenarioSelect").value));
$("difficultySelect").addEventListener("change",()=>{
  state.difficulty=$("difficultySelect").value;
  state.activeSource="All";state.filter="";state.chronological=false;
  state.evidenceIds=[];state.timelineIds=[];state.scope={};
  state.classification={attackType:"",successState:"",initialEntity:"",indicator:""};
  state.containment="";state.submitted=false;state.startedAt=Date.now();
  $("filterInput").value="";$("results").classList.remove("show");renderAll();
});
$("studyBtn").addEventListener("click",()=>{state.study=!state.study;renderCase();});
$("newBtn").addEventListener("click",nextScenario);
$("resetBtn").addEventListener("click",()=>resetAttempt(true));
$("submitBtn").addEventListener("click",renderResults);
$("filterInput").addEventListener("input",()=>{state.filter=$("filterInput").value;renderLogs();});
$("clearFilterBtn").addEventListener("click",()=>{state.filter="";$("filterInput").value="";renderLogs();});
$("sortBtn").addEventListener("click",()=>{state.chronological=!state.chronological;renderLogs();});
$("closeRaw").addEventListener("click",()=>$("rawDialog").close());
$("rawDialog").addEventListener("click",(e)=>{if(e.target===$("rawDialog"))$("rawDialog").close();});

setInterval(()=>{
  const sec=Math.floor((Date.now()-state.startedAt)/1000);
  $("timer").textContent=`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
},1000);

renderAll();
