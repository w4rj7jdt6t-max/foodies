/* ================= foodies ================= */
const CATEGORIES = [
  { id: "haupt", label: "Hauptgericht", emoji: "🍲" },
  { id: "pasta", label: "Pasta", emoji: "🍝" },
  { id: "fruehstueck", label: "Frühstück", emoji: "🥐" },
  { id: "suppe", label: "Suppe", emoji: "🥣" },
  { id: "salat", label: "Salat", emoji: "🥗" },
  { id: "snack", label: "Snack", emoji: "🥨" },
  { id: "backen", label: "Backen", emoji: "🥖" },
  { id: "dessert", label: "Dessert", emoji: "🍰" },
  { id: "getraenk", label: "Getränk", emoji: "🍹" },
];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

/* Genauere Filter-Merkmale (nur für „Kochen“) */
const TAGS = [
  { id: "fruehstueck", label: "Frühstück", emoji: "🥐" },
  { id: "hauptgericht", label: "Hauptgericht", emoji: "🍲" },
  { id: "haehnchen", label: "Hähnchen", emoji: "🍗" },
  { id: "hack", label: "Hackfleisch", emoji: "🥩" },
  { id: "vegetarisch", label: "Vegetarisch", emoji: "🥦" },
  { id: "pasta", label: "Pasta", emoji: "🍝" },
  { id: "reis", label: "Reis", emoji: "🍚" },
  { id: "kartoffeln", label: "Kartoffeln", emoji: "🥔" },
  { id: "warm", label: "Warm", emoji: "🔥" },
  { id: "kalt", label: "Kalt", emoji: "🧊" },
];
/* Eigene Filter-Merkmale für „Backen“ */
const BAKE_TAGS = [
  { id: "kuchen", label: "Kuchen", emoji: "🍰" },
  { id: "kekse", label: "Kekse & Plätzchen", emoji: "🍪" },
  { id: "muffins", label: "Muffins & Cupcakes", emoji: "🧁" },
  { id: "brot", label: "Brot", emoji: "🍞" },
  { id: "broetchen", label: "Brötchen", emoji: "🥖" },
];
/** Platzhalter-Emoji: bei Backrezepten das erste Merkmal (🍪, 🍞 …), sonst die Kategorie */
const recipeEmoji = (r) => (r.type === "backen" && r.tags?.length && tagById(r.tags[0])?.emoji) || catById(r.category).emoji;
const tagsFor = (type) => (type === "backen" ? BAKE_TAGS : TAGS);
const tagById = (id) => TAGS.find((t) => t.id === id) || BAKE_TAGS.find((t) => t.id === id);
const TYPES = { kochen: { label: "Kochen", emoji: "🍳" }, backen: { label: "Backen", emoji: "🧁" } };

/** ältere Rezepte ohne Art/Merkmale auf das neue Format bringen */
function normalize(r) {
  if (!r.type) r.type = r.category === "backen" ? "backen" : "kochen";
  if (!Array.isArray(r.tags)) r.tags = SAMPLE_RECIPES.find((s) => s.title === r.title)?.tags || [];
  r.tags = r.tags.filter((t) => tagById(t)); // entfernte Merkmale aussortieren
  return r;
}

const SAMPLE_RECIPES = [
  {
    title: "Cremige Tomaten-Pasta", type: "kochen", category: "pasta", tags: ["hauptgericht", "pasta", "vegetarisch", "warm"], servings: 2, time: 25,
    ingredients: [
      { amount: 250, unit: "g", name: "Spaghetti" },
      { amount: 1, unit: "Dose", name: "gehackte Tomaten (400 g)" },
      { amount: 2, unit: "Zehe", name: "Knoblauch" },
      { amount: 100, unit: "ml", name: "Sahne" },
      { amount: 2, unit: "EL", name: "Olivenöl" },
      { amount: 0.5, unit: "Bund", name: "Basilikum" },
      { amount: null, unit: "", name: "Salz, Pfeffer, Parmesan" },
    ],
    steps: [
      "Nudeln in reichlich Salzwasser al dente kochen.",
      "Knoblauch fein hacken und im Olivenöl bei mittlerer Hitze kurz anschwitzen.",
      "Tomaten dazugeben und ca. 10 Minuten einköcheln lassen. Sahne einrühren und abschmecken.",
      "Nudeln mit etwas Nudelwasser in die Soße geben, gut schwenken und mit Basilikum und Parmesan servieren.",
    ],
    tips: ["Ein Schuss Nudelwasser macht die Soße extra cremig.", "Mit Chiliflocken wird's schön scharf."],
  },
  {
    title: "Shakshuka", type: "kochen", category: "fruehstueck", tags: ["fruehstueck", "vegetarisch", "warm"], servings: 2, time: 30,
    ingredients: [
      { amount: 4, unit: "Stk.", name: "Eier" },
      { amount: 1, unit: "Dose", name: "stückige Tomaten" },
      { amount: 1, unit: "Stk.", name: "rote Paprika" },
      { amount: 1, unit: "Stk.", name: "Zwiebel" },
      { amount: 1, unit: "TL", name: "Kreuzkümmel" },
      { amount: 1, unit: "TL", name: "Paprikapulver, edelsüß" },
      { amount: 50, unit: "g", name: "Feta" },
    ],
    steps: [
      "Zwiebel und Paprika würfeln und in einer Pfanne mit etwas Öl weich braten.",
      "Gewürze kurz mitrösten, dann die Tomaten dazugeben und 10 Minuten köcheln lassen.",
      "Mit einem Löffel kleine Mulden formen, die Eier hineinschlagen und mit Deckel stocken lassen.",
      "Mit zerbröseltem Feta und frischen Kräutern bestreuen.",
    ],
    tips: ["Dazu passt frisches Fladenbrot zum Dippen."],
  },
];

/* ---------- State ---------- */
const state = {
  recipes: [], search: "", category: "all", type: "kochen", tags: new Set(),
  current: null, servings: 2, editing: null, image: null, editType: "kochen", editTags: new Set(),
};
try { if (localStorage.getItem("foodies-type") === "backen") state.type = "backen"; } catch {}

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const phClass = (r) => "ph-" + (Math.abs([...(r.id || r.title)].reduce((a, c) => a + c.charCodeAt(0), 0)) % 4);

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/** "1,5" / "1/2" / "1 1/2" → Zahl (oder null) */
function parseAmount(str) {
  str = String(str || "").trim().replace(",", ".");
  if (!str) return null;
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + mixed[2] / mixed[3];
  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) return frac[1] / frac[2];
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

const FRACTIONS = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];
/** Zahl → schön lesbare Menge (deutsch) */
function formatAmount(v, unit = "") {
  if (v == null) return "";
  const metric = /^(g|ml)$/i.test(unit);
  if (metric && v >= 100) return String(Math.round(v / 5) * 5);
  if (v >= 10) return String(Math.round(v));
  const whole = Math.floor(v), rest = v - whole;
  if (rest < 0.05) return String(whole);
  if (rest > 0.95) return String(whole + 1);
  if (!metric) {
    for (const [f, sym] of FRACTIONS) if (Math.abs(rest - f) < 0.05) return whole ? `${whole} ${sym}` : sym;
  }
  return (Math.round(v * 10) / 10).toString().replace(".", ",");
}
const amountForInput = (v) => (v == null ? "" : String(Math.round(v * 100) / 100).replace(".", ","));

/** Bild verkleinern & als JPEG-DataURL zurückgeben */
function compressImage(file, max = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht gelesen werden")); };
    img.src = url;
  });
}

/* ---------- Modal-Helfer ---------- */
function openModal(dlg) { dlg.showModal(); document.body.classList.add("modal-open"); dlg.querySelector(".modal-inner").scrollTop = 0; }
function closeModal(dlg) { dlg.close(); }
document.querySelectorAll(".modal").forEach((dlg) => {
  dlg.addEventListener("close", () => { if (!document.querySelector(".modal[open]")) document.body.classList.remove("modal-open"); });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) closeModal(dlg); // Klick auf Hintergrund
    if (e.target.closest("[data-close]")) closeModal(dlg);
  });
});

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab); });
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("is-active", p.id === "panel-" + tab.dataset.tab));
    tab.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    try { localStorage.setItem("foodies-tab", tab.dataset.tab); } catch {}
  });
});
try {
  const saved = localStorage.getItem("foodies-tab");
  if (saved) document.querySelector(`.tab[data-tab="${saved}"]`)?.click();
} catch {}

/* ================= Rezeptliste ================= */
function renderChips() {
  const used = new Set(state.recipes.filter((r) => r.type === state.type).map((r) => r.category));
  const cats = CATEGORIES.filter((c) => used.has(c.id));
  if (state.category !== "all" && !used.has(state.category)) state.category = "all";
  $("#category-chips").innerHTML = cats.length < 2 ? "" :
    [`<button class="chip ${state.category === "all" ? "is-active" : ""}" data-cat="all">Alle</button>`,
     ...cats.map((c) => `<button class="chip ${state.category === c.id ? "is-active" : ""}" data-cat="${c.id}">${c.emoji} ${esc(c.label)}</button>`)].join("");
}
$("#category-chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  state.category = b.dataset.cat;
  renderList();
});

function thumbHTML(r, cls = "thumb") {
  return r.image
    ? `<div class="${cls}"><img src="${r.image}" alt="" loading="lazy" width="64" height="64" /></div>`
    : `<div class="${cls} ${phClass(r)}">${recipeEmoji(r)}</div>`;
}

/* ---------- Kochen / Backen ---------- */
document.querySelectorAll(".subtab").forEach((b) => b.addEventListener("click", () => {
  if (state.type !== b.dataset.type) state.tags.clear(); // Merkmale gehören zur jeweiligen Art
  state.type = b.dataset.type;
  state.category = "all";
  try { localStorage.setItem("foodies-type", state.type); } catch {}
  renderList();
}));

/* ---------- Filter-Merkmale ---------- */
function tagButtons(selected, list = TAGS) {
  return list.map((t) => `<button type="button" class="tag" data-tag="${t.id}" aria-pressed="${selected.has(t.id)}">${t.emoji} ${esc(t.label)}</button>`).join("");
}
function renderFilter() {
  const btn = $("#btn-filter"), n = state.tags.size;
  btn.setAttribute("aria-expanded", String(!$("#filter-panel").hidden));
  btn.classList.toggle("has-active", n > 0);
  $("#filter-badge").hidden = !n;
  $("#filter-badge").textContent = n;
  $("#filter-tags").innerHTML = tagButtons(state.tags, tagsFor(state.type));
}
$("#btn-filter").addEventListener("click", () => { $("#filter-panel").hidden = !$("#filter-panel").hidden; renderFilter(); });
$("#filter-tags").addEventListener("click", (e) => {
  const t = e.target.closest(".tag");
  if (!t) return;
  state.tags.has(t.dataset.tag) ? state.tags.delete(t.dataset.tag) : state.tags.add(t.dataset.tag);
  renderList();
});
$("#filter-reset").addEventListener("click", () => { state.tags.clear(); renderList(); });

function renderList() {
  document.querySelectorAll(".subtab").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.type === state.type);
    b.setAttribute("aria-selected", b.dataset.type === state.type);
  });
  renderChips();
  renderFilter();
  const q = state.search.trim().toLowerCase();
  const ofType = state.recipes.filter((r) => r.type === state.type);
  const useTags = state.tags.size;
  const list = ofType
    .filter((r) => state.category === "all" || r.category === state.category)
    .filter((r) => !useTags || [...state.tags].every((t) => r.tags.includes(t)))
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt - a.createdAt);

  const total = state.recipes.length, n = ofType.length;
  $("#recipe-count").textContent = total === 0 ? "Noch leer – auf geht's!" : total === 1 ? "1 Rezept in unserer Sammlung" : `${total} Rezepte in unserer Sammlung`;
  $("#recipe-empty").hidden = n !== 0;
  $("#empty-emoji").textContent = state.type === "backen" ? "🧁" : "🥄";
  $("#empty-text").innerHTML = state.type === "backen"
    ? "<strong>Noch keine Backrezepte.</strong><br />Legt mit „＋ Neu“ euren ersten Kuchen, euer erstes Brot … an."
    : "<strong>Noch keine Kochrezepte.</strong><br />Legt mit „＋ Neu“ euer erstes Lieblingsrezept an.";

  $("#recipe-list").innerHTML = list.length || !n ? list.map((r) => {
    const cat = catById(r.category);
    return `<li><button class="recipe-bar" data-id="${r.id}">
      ${thumbHTML(r)}
      <div class="bar-body">
        <p class="bar-title">${esc(r.title)}</p>
        <div class="bar-meta">
          <span>${cat.emoji} ${esc(cat.label)}</span>
          ${r.time ? `<span>⏱️ ${r.time} Min.</span>` : ""}
          <span>👥 ${r.servings} ${r.servings === 1 ? "Portion" : "Portionen"}</span>
          <span>🧂 ${r.ingredients.length} Zutaten</span>
          ${r.tags.length ? `<span class="bar-tags" title="${esc(r.tags.map((t) => tagById(t)?.label).filter(Boolean).join(", "))}">${r.tags.map((t) => tagById(t)?.emoji || "").join(" ")}</span>` : ""}
        </div>
      </div>
      <span class="bar-chevron" aria-hidden="true">›</span>
    </button></li>`;
  }).join("") : `<li class="muted" style="text-align:center;padding:24px">Nichts gefunden 🤔</li>`;
}

$("#recipe-list").addEventListener("click", (e) => {
  const bar = e.target.closest(".recipe-bar");
  if (bar) openDetail(bar.dataset.id);
});
$("#search").addEventListener("input", (e) => { state.search = e.target.value; renderList(); });

/* ================= Detailansicht ================= */
function openDetail(id) {
  const r = state.recipes.find((x) => x.id === id);
  if (!r) return;
  state.current = r;
  state.servings = r.servings;
  renderDetail();
  openModal($("#detail-modal"));
}

function renderDetail() {
  const r = state.current, cat = catById(r.category);
  const hero = r.image ? `<img src="${r.image}" alt="${esc(r.title)}" />` : recipeEmoji(r);
  $("#detail-content").innerHTML = `
    <div class="hero ${r.image ? "" : phClass(r)}">
      ${hero}
      <div class="hero-actions">
        <button class="icon-btn" data-action="edit" aria-label="Bearbeiten" title="Bearbeiten">✏️</button>
        <button class="icon-btn" data-action="delete" aria-label="Löschen" title="Löschen">🗑️</button>
        <button class="icon-btn" data-close aria-label="Schließen" title="Schließen">✕</button>
      </div>
    </div>
    <div class="detail-body">
      <h2 class="detail-title">${esc(r.title)}</h2>
      <div class="meta-chips">
        <span class="meta-chip">${TYPES[r.type].emoji} ${TYPES[r.type].label}</span>
        <span class="meta-chip">${cat.emoji} ${esc(cat.label)}</span>
        ${r.tags.map((t) => tagById(t)).filter(Boolean).map((t) => `<span class="meta-chip tag-chip">${t.emoji} ${esc(t.label)}</span>`).join("")}
        ${r.time ? `<span class="meta-chip">⏱️ ${r.time} Min.</span>` : ""}
        <span class="meta-chip">🧂 ${r.ingredients.length} Zutaten</span>
        <span class="meta-chip">👩‍🍳 ${r.steps.length} Schritte</span>
      </div>

      <div class="detail-grid">
        <section class="card">
          <h3>Zutaten</h3>
          <div class="servings">
            <span class="servings-label">Für</span>
            <div class="stepper">
              <button data-action="minus" aria-label="Weniger Portionen" ${state.servings <= 1 ? "disabled" : ""}>−</button>
              <output id="servings-out">${state.servings} ${state.servings === 1 ? "Portion" : "Portionen"}</output>
              <button data-action="plus" aria-label="Mehr Portionen" ${state.servings >= 50 ? "disabled" : ""}>+</button>
            </div>
          </div>
          <ul class="ing-list" id="ing-list">${ingredientsHTML(r)}</ul>
          <p class="hint">Tipp: Antippen zum Abhaken ✓</p>
        </section>

        <section class="card">
          <h3>Zubereitung</h3>
          ${r.steps.length ? `<ol class="step-list">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : `<p class="muted">Keine Schritte hinterlegt.</p>`}
        </section>
      </div>

      ${r.tips.length ? `<section class="card tips-card"><h3>Tipps &amp; Hinweise</h3><ul>${r.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
    </div>`;
}

function ingredientsHTML(r) {
  const factor = state.servings / r.servings;
  if (!r.ingredients.length) return `<li class="muted">Keine Zutaten hinterlegt.</li>`;
  return r.ingredients.map((i) => {
    const amt = i.amount == null ? "" : formatAmount(i.amount * factor, i.unit);
    return `<li><span class="ing-amt">${esc([amt, i.unit].filter(Boolean).join(" "))}</span><span>${esc(i.name)}</span></li>`;
  }).join("");
}

function setServings(n) {
  state.servings = Math.max(1, Math.min(50, n));
  const m = $("#detail-content");
  m.querySelector("#servings-out").textContent = `${state.servings} ${state.servings === 1 ? "Portion" : "Portionen"}`;
  m.querySelector('[data-action="minus"]').disabled = state.servings <= 1;
  m.querySelector('[data-action="plus"]').disabled = state.servings >= 50;
  // Abgehakte Zutaten merken
  const done = [...m.querySelectorAll("#ing-list li")].map((li) => li.classList.contains("done"));
  m.querySelector("#ing-list").innerHTML = ingredientsHTML(state.current);
  m.querySelectorAll("#ing-list li").forEach((li, i) => li.classList.toggle("done", !!done[i]));
}

$("#detail-content").addEventListener("click", async (e) => {
  const act = e.target.closest("[data-action]")?.dataset.action;
  if (act === "minus") return setServings(state.servings - 1);
  if (act === "plus") return setServings(state.servings + 1);
  if (act === "edit") { closeModal($("#detail-modal")); return openEditor(state.current); }
  if (act === "delete") {
    // Zweistufig: erster Tipp fragt nach, zweiter löscht (statt confirm()-Dialog)
    const btn = e.target.closest("[data-action]");
    if (!btn.classList.contains("armed")) {
      btn.classList.add("armed");
      btn.textContent = "Wirklich löschen?";
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove("armed"); btn.textContent = "🗑️"; }, 3000);
      return;
    }
    await DB.remove(state.current.id);
    state.recipes = state.recipes.filter((r) => r.id !== state.current.id);
    closeModal($("#detail-modal"));
    renderList();
    return toast("Rezept gelöscht 🗑️");
  }
  const li = e.target.closest(".ing-list li, .step-list li");
  if (li) li.classList.toggle("done");
});

/* ================= Editor (Vorlage) ================= */
const form = $("#editor-form");
$("#f-category").innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${esc(c.label)}</option>`).join("");

function ingRow(i = {}) {
  const div = document.createElement("div");
  div.className = "ing-row";
  div.innerHTML = `
    <input type="text" inputmode="decimal" class="i-amount" placeholder="200" value="${esc(amountForInput(i.amount))}" aria-label="Menge" />
    <input type="text" class="i-unit" list="units" placeholder="g" value="${esc(i.unit || "")}" aria-label="Einheit" />
    <input type="text" class="i-name" placeholder="z. B. Mehl" value="${esc(i.name || "")}" aria-label="Zutat" />
    <button type="button" class="row-del" aria-label="Entfernen">✕</button>`;
  return div;
}

function textRow(value = "", kind = "step") {
  const div = document.createElement("div");
  div.className = "text-row";
  div.innerHTML = `
    <span class="num ${kind === "tip" ? "tip" : ""}">${kind === "tip" ? "💡" : ""}</span>
    <textarea rows="2" placeholder="${kind === "tip" ? "z. B. Schmeckt am nächsten Tag noch besser." : "Was ist zu tun?"}">${esc(value)}</textarea>
    <button type="button" class="row-del" aria-label="Entfernen">✕</button>`;
  return div;
}

function renumberSteps() {
  $("#step-rows").querySelectorAll(".num").forEach((n, i) => (n.textContent = i + 1));
}

function addRow(container, el, focus = true) {
  container.appendChild(el);
  renumberSteps();
  if (focus) el.querySelector("input, textarea").focus();
}

$("#add-ing").addEventListener("click", () => addRow($("#ing-rows"), ingRow()));
$("#add-step").addEventListener("click", () => addRow($("#step-rows"), textRow("", "step")));
$("#add-tip").addEventListener("click", () => addRow($("#tip-rows"), textRow("", "tip")));

form.addEventListener("click", (e) => {
  const del = e.target.closest(".row-del");
  if (!del) return;
  const row = del.parentElement, box = row.parentElement;
  row.remove();
  if (!box.children.length) box.appendChild(box.id === "ing-rows" ? ingRow() : textRow("", box.id === "tip-rows" ? "tip" : "step"));
  renumberSteps();
});

// Enter in letzter Zutat → neue Zeile
$("#ing-rows").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const row = e.target.closest(".ing-row");
    if (row === $("#ing-rows").lastElementChild) addRow($("#ing-rows"), ingRow());
    else row.nextElementSibling.querySelector("input").focus();
  }
});

// Textareas automatisch mitwachsen lassen
form.addEventListener("input", (e) => {
  if (e.target.tagName === "TEXTAREA") { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }
  if (e.target.classList.contains("invalid")) e.target.classList.remove("invalid");
});

/* --- Bild --- */
function setImage(dataUrl) {
  state.image = dataUrl;
  const img = $("#image-preview");
  img.hidden = !dataUrl;
  if (dataUrl) img.src = dataUrl; else img.removeAttribute("src");
  $("#image-hint").hidden = !!dataUrl;
  $("#image-remove").hidden = !dataUrl;
}
async function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  try { setImage(await compressImage(file)); } catch (err) { toast(err.message); }
}
$("#image-input").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
$("#image-remove").addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setImage(null); });
const drop = $("#image-drop");
["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

/* --- Art & Merkmale --- */
function setEditType(type) {
  state.editType = type;
  document.querySelectorAll("#f-type .seg-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.type === type)));
  // Merkmale der jeweiligen Art anzeigen; nicht passende fallen beim Speichern weg
  $("#f-tags").innerHTML = tagButtons(state.editTags, tagsFor(type));
}
$("#f-type").addEventListener("click", (e) => { const b = e.target.closest(".seg-btn"); if (b) setEditType(b.dataset.type); });
$("#f-tags").addEventListener("click", (e) => {
  const t = e.target.closest(".tag");
  if (!t) return;
  const on = !state.editTags.has(t.dataset.tag);
  on ? state.editTags.add(t.dataset.tag) : state.editTags.delete(t.dataset.tag);
  t.setAttribute("aria-pressed", String(on));
});

/* --- Öffnen / Speichern --- */
function openEditor(recipe = null, { draft = false } = {}) {
  // draft: vorausgefüllte Vorlage (z. B. aus Inspiration), wird als neues Rezept gespeichert
  state.editing = draft ? null : recipe;
  $("#editor-title").textContent = draft ? "Idee übernehmen" : recipe ? "Rezept bearbeiten" : "Neues Rezept";
  $("#f-title").value = recipe?.title || "";
  $("#f-title").classList.remove("invalid");
  $("#f-category").value = recipe?.category || (state.type === "backen" ? "backen" : "haupt");
  state.editTags = new Set(recipe?.tags || []);
  setEditType(recipe?.type || state.type);
  $("#f-servings").value = recipe?.servings || 2;
  $("#f-time").value = recipe?.time || "";
  setImage(recipe?.image || null);

  const fill = (box, items, make) => {
    box.innerHTML = "";
    (items.length ? items : [undefined]).forEach((it) => box.appendChild(make(it)));
  };
  fill($("#ing-rows"), recipe?.ingredients || [{}, {}, {}], (i) => ingRow(i));
  fill($("#step-rows"), recipe?.steps || ["", ""], (s) => textRow(s, "step"));
  fill($("#tip-rows"), recipe?.tips || [""], (t) => textRow(t, "tip"));
  renumberSteps();
  openModal($("#editor-modal"));
  form.querySelectorAll("textarea").forEach((t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; });
  if (!recipe) $("#f-title").focus();
}
$("#btn-new").addEventListener("click", () => openEditor());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#f-title").value.trim();
  if (!title) {
    $("#f-title").classList.add("invalid");
    $("#f-title").focus();
    return toast("Bitte gib dem Rezept einen Titel ✍️");
  }
  const ingredients = [...$("#ing-rows").children].map((row) => ({
    amount: parseAmount(row.querySelector(".i-amount").value),
    unit: row.querySelector(".i-unit").value.trim(),
    name: row.querySelector(".i-name").value.trim(),
  })).filter((i) => i.name);
  const texts = (box) => [...box.querySelectorAll("textarea")].map((t) => t.value.trim()).filter(Boolean);

  const now = Date.now();
  const recipe = {
    id: state.editing?.id || uid(),
    createdAt: state.editing?.createdAt || now,
    updatedAt: now,
    title,
    type: state.editType,
    category: $("#f-category").value,
    tags: tagsFor(state.editType).map((t) => t.id).filter((id) => state.editTags.has(id)),
    servings: Math.max(1, Math.min(50, parseInt($("#f-servings").value, 10) || 2)),
    time: parseInt($("#f-time").value, 10) || null,
    image: state.image,
    ingredients,
    steps: texts($("#step-rows")),
    tips: texts($("#tip-rows")),
  };

  try {
    await DB.put(recipe);
  } catch (err) {
    console.error(err);
    return toast("Speichern fehlgeschlagen 😕");
  }
  const idx = state.recipes.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) state.recipes[idx] = recipe; else state.recipes.push(recipe);
  closeModal($("#editor-modal"));
  if (recipe.type !== state.type) { state.type = recipe.type; state.category = "all"; }
  if (!state.editing) document.querySelector('.tab[data-tab="rezepte"]').click();
  renderList();
  toast(state.editing ? "Änderungen gespeichert ✨" : "Rezept angelegt 🎉");
  if (state.editing) openDetail(recipe.id);
});

/* ================= Start ================= */
(async function init() {
  try {
    state.recipes = (await DB.all()).map(normalize);
    let seeded = false;
    try { seeded = localStorage.getItem("foodies-seeded") === "1"; } catch {}
    if (!state.recipes.length && !seeded) {
      const base = Date.now();
      for (const [i, s] of SAMPLE_RECIPES.entries()) {
        const r = { ...s, id: uid(), image: null, createdAt: base - i * 1000, updatedAt: base };
        await DB.put(r);
        state.recipes.push(r);
      }
    }
    try { localStorage.setItem("foodies-seeded", "1"); } catch {}
  } catch (err) {
    console.error(err);
    toast("Speicher nicht verfügbar – Rezepte werden nicht gesichert.");
  }
  renderList();
})();
