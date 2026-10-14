"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const nodes = [...document.querySelectorAll("[data-device]")];
  const controls = [...document.querySelectorAll("[data-control]")];
  const names = {
    gateway: "Router SVI (gateway)",
    server: "File server",
    core: "SW-CORE1 distribution switch",
    ws03: "acct-ws03",
    ws05: "acct-ws05",
    ws08: "acct-ws08",
    printer: "Network printer"
  };
  const storageKey = "networkplus-layer2-pbq-v1";
  let selected = null;
  let previousFocus = null;

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        selected,
        attack: $("attack").value,
        indicator: $("indicator").value,
        controls: Object.fromEntries(controls.map(c => [c.dataset.control, c.checked]))
      }));
    } catch (_) { /* Browser storage may be unavailable. */ }
  }

  function invalidate() {
    $("results").hidden = true;
    $("score-status").textContent = "NOT SCORED";
    save();
  }

  function choose(device, silent = false) {
    selected = device;
    nodes.forEach(node => {
      const active = node.dataset.device === device;
      node.classList.toggle("selected", active);
      node.setAttribute("aria-pressed", String(active));
    });
    $("selected-device").textContent = names[device] || "None selected";
    if (!silent) invalidate();
  }

  nodes.forEach(node => {
    node.addEventListener("click", () => choose(node.dataset.device));
    node.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(node.dataset.device);
      }
    });
  });

  controls.forEach(control => control.addEventListener("change", invalidate));
  $("attack").addEventListener("change", invalidate);
  $("indicator").addEventListener("change", invalidate);

  function reset() {
    choose(null, true);
    controls.forEach(control => { control.checked = false; });
    $("attack").value = "";
    $("indicator").value = "";
    invalidate();
  }

  function addResult(body, title, fraction, correct) {
    const tr = document.createElement("tr");
    const task = document.createElement("td");
    const checks = document.createElement("td");
    const result = document.createElement("td");
    task.textContent = title;
    checks.textContent = fraction;
    result.textContent = correct ? "CORRECT" : "REVIEW";
    result.className = correct ? "correct" : "incorrect";
    tr.append(task, checks, result);
    body.append(tr);
  }

  function finish() {
    const host = selected === "ws08";
    const attack = $("attack").value === "on-path";
    const indicator = $("indicator").value === "duplicate-gateway";
    const expected = {
      "port-security": true,
      "password-reset": false,
      "mac-table-increase": false,
      "disable-svi": false
    };
    let mitigation = 0;
    controls.forEach(control => {
      if (control.checked === expected[control.dataset.control]) mitigation++;
    });
    const score = Number(host) + Number(attack) + Number(indicator) + mitigation;
    const body = $("result-rows");
    body.replaceChildren();
    addResult(body, "Attack in progress", "1/1", attack);
    addResult(body, "Primary MAC table indicator", "1/1", indicator);
    addResult(body, "Mitigating controls", mitigation + "/4", mitigation === 4);
    addResult(body, "Compromised / offending host", "1/1", host);
    const passing = score === 7;
    $("grade").textContent = (passing ? "PASS" : "REVIEW") + " — " + score + " / 7 checks (" + Math.round(score / 7 * 100) + "%)";
    $("grade").className = "grade " + (passing ? "good" : "partial");
    $("score-status").textContent = "SCORED · " + score + "/7";
    $("results").hidden = false;
    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const modal = $("situation-modal");
  function openModal() {
    previousFocus = document.activeElement;
    modal.hidden = false;
    $("close-situation").focus();
  }
  function closeModal() {
    modal.hidden = true;
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }
  $("open-situation").addEventListener("click", openModal);
  $("close-situation").addEventListener("click", closeModal);
  $("start-practice").addEventListener("click", closeModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
    if (event.key === "Tab" && !modal.hidden) {
      const focusable = [...modal.querySelectorAll("button:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  $("reset").addEventListener("click", reset);
  $("try-again").addEventListener("click", () => {
    reset();
    $("topology-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("finish").addEventListener("click", finish);

  try {
    const state = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (state && typeof state === "object") {
      if (Object.prototype.hasOwnProperty.call(names, state.selected)) choose(state.selected, true);
      if ([...$("attack").options].some(o => o.value === state.attack)) $("attack").value = state.attack;
      if ([...$("indicator").options].some(o => o.value === state.indicator)) $("indicator").value = state.indicator;
      controls.forEach(c => { c.checked = state.controls && state.controls[c.dataset.control] === true; });
    }
  } catch (_) { /* Ignore invalid or blocked storage. */ }
  $("start-practice").focus();
})();
