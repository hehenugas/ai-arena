/* AI Arena console. Data comes from /models.json (served next to this file). */

const MODELS_URL = "/models.json";
const PROBE_TIMEOUT = 2500;
const HEARTBEAT = 10000;
const TOAST_MS = 2600;

const state = {
  models: [],
  load: "loading", // loading | ready | error
  loadError: "",
  telemetry: new Map(), // id -> { up: boolean, status: number, ms: number }
  view: "index",
  filters: { q: "", tag: "ALL", status: "ALL" },
  frameWidth: "desktop",
  heartbeat: null,
};

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

function init() {
  el("hostLabel").textContent = location.host;
  setupTheme();
  setupTabs();
  setupShortcuts();
  setupActions();
  loadModels();
}

/* -------------------------------------------------------------------------
   Theme
   ------------------------------------------------------------------------- */

function setupTheme() {
  const button = el("themeBtn");
  const dark = document.documentElement.dataset.theme === "dark";
  button.setAttribute("aria-checked", String(dark));
  button.textContent = dark ? "Light" : "Dark";
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("ai-arena-theme", next);
    } catch (err) {
      /* private mode: theme still works for this page view */
    }
    button.setAttribute("aria-checked", String(next === "dark"));
    button.textContent = next === "dark" ? "Light" : "Dark";
  });
}

/* -------------------------------------------------------------------------
   Views
   ------------------------------------------------------------------------- */

const VIEWS = ["index", "duo", "quad"];

function setupTabs() {
  const tabs = VIEWS.map((v) => el(`tab-${v}`));

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => showView(VIEWS[i]));
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      let next = null;
      if (step) next = (i + step + VIEWS.length) % VIEWS.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = VIEWS.length - 1;
      if (next === null) return;
      event.preventDefault();
      tabs[next].focus();
      showView(VIEWS[next]);
    });
  });
}

function showView(view) {
  state.view = view;
  VIEWS.forEach((v) => {
    const tab = el(`tab-${v}`);
    const panel = el(`view-${v}`);
    const on = v === view;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    panel.classList.toggle("is-active", on);
  });

  // Frames get their src only when their view opens: six live WebGL pages at
  // once is a lot of GPU for a page you are only scanning.
  if (view === "duo") syncDuo();
  if (view === "quad") syncQuad();
}

/* -------------------------------------------------------------------------
   Data
   ------------------------------------------------------------------------- */

async function loadModels() {
  try {
    const res = await fetch(MODELS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("expected a JSON array");
    state.models = data;
    state.load = "ready";
  } catch (err) {
    state.load = "error";
    state.loadError = err.message;
    state.models = [];
  }

  renderIndex();
  populateProviders();
  populateModels();
  startHeartbeat();
}

function startHeartbeat() {
  if (state.models.length === 0) return;
  probeAll();

  clearInterval(state.heartbeat);
  state.heartbeat = setInterval(() => {
    if (!document.hidden) probeAll();
  }, HEARTBEAT);

  // Coming back to the tab should show current status, not wait out the tick.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) probeAll();
  });
}

async function probeAll() {
  await Promise.all(
    state.models.map(async (model) => {
      const started = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
      let up = false;
      let status = 0;
      try {
        const res = await fetch(model.path, {
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        up = res.ok || res.status === 304;
        status = res.status;
      } catch (err) {
        status = 0;
      } finally {
        clearTimeout(timer);
      }
      state.telemetry.set(model.id, {
        up,
        status,
        ms: Math.round(performance.now() - started),
      });
    }),
  );

  renderCounter();

  // With a status filter on, rows have to appear and disappear; otherwise the
  // status cell is patched in place so a hover or a scroll position survives.
  if (state.filters.status !== "ALL") renderIndex();
  else patchStatuses();

  if (state.view === "duo") syncDuo();
  else if (state.view === "quad") syncQuad();
}

function renderCounter() {
  const total = state.models.length;
  const up = state.models.filter((m) => state.telemetry.get(m.id)?.up).length;
  const counter = el("liveCounter");
  counter.textContent = total ? `${up} of ${total} up` : "no models";
  counter.dataset.state = up === total && total > 0 ? "all-up" : "some-down";
}

/* -------------------------------------------------------------------------
   Index view
   ------------------------------------------------------------------------- */

function statusMarkup(model) {
  const id = escapeHtml(model.id);
  const t = state.telemetry.get(model.id);
  if (!t) {
    return `<span class="status" data-up="pending" data-status-for="${id}"><span class="status__mark"></span><span>checking</span></span>`;
  }
  const label = t.up ? "up" : "down";
  const ms = t.up ? `<span class="status__ms">${t.ms} ms</span>` : "";
  return `<span class="status" data-up="${t.up}" data-status-for="${id}" title="${
    t.up ? `HTTP ${t.status}` : `no answer within ${PROBE_TIMEOUT} ms`
  }"><span class="status__mark"></span><span>${label}</span>${ms}</span>`;
}

function filteredModels() {
  const q = state.filters.q.trim().toLowerCase();
  return state.models.filter((model) => {
    const t = state.telemetry.get(model.id);
    if (state.filters.tag !== "ALL" && model.tag !== state.filters.tag) return false;
    if (state.filters.status === "UP" && !t?.up) return false;
    if (state.filters.status === "DOWN" && t?.up) return false;
    if (!q) return true;
    return [model.name, model.id, model.tag, String(model.port)].some((field) =>
      String(field).toLowerCase().includes(q),
    );
  });
}

function renderIndex() {
  const body = el("indexBody");
  const count = el("indexCount");
  const clearBtn = el("clearFilters");
  const hasFilter =
    state.filters.q.trim() !== "" ||
    state.filters.tag !== "ALL" ||
    state.filters.status !== "ALL";
  clearBtn.disabled = !hasFilter;

  if (state.load === "loading") {
    count.textContent = "";
    body.innerHTML = stateMarkup(
      "Reading the model list",
      `Fetching <span class="mono">${MODELS_URL}</span> from this Caddy route.`,
    );
    return;
  }

  if (state.load === "error") {
    count.textContent = "";
    body.innerHTML = stateMarkup(
      "The model list could not be read",
      `<span class="mono">${escapeHtml(state.loadError)}</span>. Caddy serves this page, so
       <span class="mono">${MODELS_URL}</span> has to sit in <span class="mono">aggregator/</span>
       next to <span class="mono">index.html</span>.`,
      `<button class="btn btn--primary" data-act="retry">Try again</button>`,
    );
    return;
  }

  if (state.models.length === 0) {
    count.textContent = "";
    body.innerHTML = stateMarkup(
      "No models in the list",
      `<span class="mono">${MODELS_URL}</span> parsed as an empty array, so there is nothing to
       route to yet. Add a model to that file, then reload.`,
    );
    return;
  }

  const rows = filteredModels();
  count.textContent = `${rows.length} of ${state.models.length} shown`;

  if (rows.length === 0) {
    body.innerHTML = stateMarkup(
      "No model matches these filters",
      `Nothing matched <span class="mono">${escapeHtml(state.filters.q || "the current selection")}</span>.
       Clear the filters to see all ${state.models.length} models.`,
      `<button class="btn" data-act="clear">Clear filters</button>`,
    );
    return;
  }

  body.innerHTML = `
    <ol class="roster">
      <li class="roster__head" aria-hidden="true">
        <span class="eyebrow">№</span>
        <span class="eyebrow">Model</span>
        <span class="eyebrow col--tag">Provider</span>
        <span class="eyebrow">Route</span>
        <span class="eyebrow col--port">Port</span>
        <span class="eyebrow">Status</span>
        <span class="eyebrow" style="text-align:right">Actions</span>
      </li>
      ${rows.map(rowMarkup).join("")}
    </ol>`;
}

function rowMarkup(model) {
  const no = String(state.models.indexOf(model) + 1).padStart(2, "0");
  return `
    <li class="row" data-id="${escapeHtml(model.id)}">
      <span class="row__no">${no}</span>
      <div class="row__name-cell">
        <div class="row__name">${escapeHtml(model.name)}</div>
        <div class="row__id">${escapeHtml(model.id)}</div>
      </div>
      <div class="row__tag col--tag">${escapeHtml(model.tag)}</div>
      <a class="row__route" href="${escapeHtml(model.path)}" target="_blank" rel="noopener"
         title="Open ${escapeHtml(model.name)} in a new tab">${escapeHtml(model.path)}</a>
      <div class="row__port col--port">:${escapeHtml(model.port)}</div>
      ${statusMarkup(model)}
      <div class="row__acts">
        <button class="btn" data-act="compare" data-id="${escapeHtml(model.id)}">Compare</button>
        <a class="btn" href="${escapeHtml(model.path)}" target="_blank" rel="noopener">Open in tab</a>
      </div>
    </li>`;
}

function patchStatuses() {
  state.models.forEach((model) => {
    const cell = document.querySelector(`[data-status-for="${CSS.escape(model.id)}"]`);
    if (cell) cell.outerHTML = statusMarkup(model);
  });
}

function stateMarkup(title, body, acts = "") {
  return `
    <div class="state">
      <h2 class="state__title">${title}</h2>
      <p class="state__body">${body}</p>
      ${acts ? `<div class="state__acts">${acts}</div>` : ""}
    </div>`;
}

/* -------------------------------------------------------------------------
   Comparison frames
   ------------------------------------------------------------------------- */

function populateModels() {
  const options = state.models
    .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`)
    .join("");

  const last = state.models.length - 1;
  const defaults = {
    selectModelA: 0,
    selectModelB: Math.min(1, last),
    selectQuad1: 0,
    selectQuad2: Math.min(1, last),
    selectQuad3: Math.min(2, last),
    selectQuad4: Math.min(3, last),
  };

  Object.entries(defaults).forEach(([id, fallback]) => {
    const select = el(id);
    const held = state.models.findIndex((m) => m.id === select.value);
    select.innerHTML = options;
    // Keep a choice the user already made, otherwise open on a different model
    // per slot so the four frames start out comparable rather than identical.
    select.selectedIndex = held >= 0 ? held : fallback;
  });
}

function modelById(id) {
  return state.models.find((m) => m.id === id);
}

function syncDuo() {
  applyFrame("A", modelById(el("selectModelA").value));
  applyFrame("B", modelById(el("selectModelB").value));
}

function syncQuad() {
  [1, 2, 3, 4].forEach((n) => applyFrame(`Q${n}`, modelById(el(`selectQuad${n}`).value)));
}

function applyFrame(slot, model) {
  const frame = el(`frame${slot}`);
  const ident = el(`ident${slot}`);
  if (!frame || !ident) return;

  if (!model) {
    ident.innerHTML = `<span class="frame__name">No model selected</span>`;
    return;
  }

  // Only touch src when the model actually changed, so a status refresh does
  // not reload a live scene the user is looking at.
  if (frame.dataset.model !== model.id) {
    frame.src = model.path;
    frame.dataset.model = model.id;
    frame.title = `${model.name} preview at ${model.path}`;
  }

  ident.innerHTML = `
    <h3 class="frame__name">${escapeHtml(model.name)}</h3>
    <a class="frame__route" href="${escapeHtml(model.path)}" target="_blank" rel="noopener"
       title="Open ${escapeHtml(model.name)} in a new tab">${escapeHtml(model.path)}</a>
    ${statusMarkup(model)}`;
}

function setFrameWidth(width) {
  state.frameWidth = width;
  ["wrapFrameA", "wrapFrameB"].forEach((id) => {
    el(id).dataset.width = width;
  });
}

function reloadFrame(slot) {
  const frame = el(`frame${slot}`);
  if (!frame || !frame.src || frame.src === "about:blank") return;
  const src = frame.src;
  frame.src = "about:blank";
  setTimeout(() => {
    frame.src = src;
  }, 50);
}

function openFrame(slot) {
  const frame = el(`frame${slot}`);
  if (frame && frame.src && frame.src !== "about:blank") {
    window.open(frame.src, "_blank", "noopener");
  }
}

function swapPanes() {
  const a = el("selectModelA");
  const b = el("selectModelB");
  const held = a.selectedIndex;
  a.selectedIndex = b.selectedIndex;
  b.selectedIndex = held;
  syncDuo();
}

function compareFrom(modelId) {
  el("selectModelA").value = modelId;
  showView("duo");
  syncDuo();
}

/* -------------------------------------------------------------------------
   Filters
   ------------------------------------------------------------------------- */

function populateProviders() {
  const select = el("tagFilter");
  const tags = [...new Set(state.models.map((m) => m.tag))].sort((a, b) => a.localeCompare(b));
  select.innerHTML =
    `<option value="ALL">All providers</option>` +
    tags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

function readFilters() {
  state.filters.q = el("searchInput").value;
  state.filters.tag = el("tagFilter").value;
  state.filters.status = el("statusFilter").value;
}

function clearFilters() {
  el("searchInput").value = "";
  el("tagFilter").value = "ALL";
  el("statusFilter").value = "ALL";
  readFilters();
  renderIndex();
}

/* -------------------------------------------------------------------------
   Commands, toast
   ------------------------------------------------------------------------- */

let toastTimer = null;
function toast(message) {
  const node = el("toast");
  node.textContent = message;
  node.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("is-on"), TOAST_MS);
}

/* -------------------------------------------------------------------------
   Events
   ------------------------------------------------------------------------- */

function setupActions() {
  el("searchInput").addEventListener("input", () => {
    readFilters();
    renderIndex();
  });
  el("tagFilter").addEventListener("change", () => {
    readFilters();
    renderIndex();
  });
  el("statusFilter").addEventListener("change", () => {
    readFilters();
    renderIndex();
  });
  el("clearFilters").addEventListener("click", clearFilters);
  el("recheckBtn").addEventListener("click", () => {
    probeAll().then(() => toast("Route check finished."));
  });

  el("swapPanes").addEventListener("click", swapPanes);
  el("reloadDuo").addEventListener("click", () => {
    reloadFrame("A");
    reloadFrame("B");
  });
  el("reloadQuad").addEventListener("click", () => {
    [1, 2, 3, 4].forEach((n) => reloadFrame(`Q${n}`));
  });
  el("selectModelA").addEventListener("change", syncDuo);
  el("selectModelB").addEventListener("change", syncDuo);
  [1, 2, 3, 4].forEach((n) => el(`selectQuad${n}`).addEventListener("change", syncQuad));
  el("frameWidth").addEventListener("change", (event) => setFrameWidth(event.target.value));

  // One delegated listener for every generated row and frame button.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-act]");
    if (!trigger) return;
    const act = trigger.dataset.act;
    const id = trigger.dataset.id;
    if (act === "compare") compareFrom(id);
    else if (act === "clear") clearFilters();
    else if (act === "retry") window.location.reload();
    else if (act === "reload-frame") reloadFrame(trigger.dataset.slot);
    else if (act === "open-frame") openFrame(trigger.dataset.slot);
  });
}

function setupShortcuts() {
  window.addEventListener("keydown", (event) => {
    const tag = event.target.tagName;
    const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

    if (typing) {
      if (event.key === "Escape") {
        event.target.blur();
        if (event.target.id === "searchInput") clearFilters();
      }
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const view = { 1: "index", 2: "duo", 3: "quad" }[event.key];
    if (view) {
      showView(view);
      el(`tab-${view}`).focus();
      return;
    }

    if (event.key === "/") {
      event.preventDefault();
      el("searchInput").focus();
    } else if (event.key === "r" || event.key === "R") {
      probeAll().then(() => toast("Route check finished."));
    } else if (event.key === "Escape") {
      clearFilters();
    }
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char],
  );
}
