/* ================= foodies ================= */
/* Kategorien (Kochen): Gang bzw. Mahlzeit. „backen“ ist die feste Kategorie aller Backrezepte. */
const CATEGORIES = [
  { id: "vorspeise", label: "Vorspeise", emoji: "🥟" },
  { id: "haupt", label: "Hauptgericht", emoji: "🍲" },
  { id: "nachtisch", label: "Nachtisch", emoji: "🍮" },
  { id: "fruehstueck", label: "Frühstück", emoji: "🥐" },
  { id: "backen", label: "Backen", emoji: "🥖" },
];
const COOK_CATS = ["vorspeise", "haupt", "nachtisch", "fruehstueck"];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[1];
/* frühere Kategorien, die jetzt Merkmale sind (alte Rezepte werden beim Laden umgestellt) */
const LEGACY_CAT_TAG = { pasta: "pasta", suppe: "suppe", salat: "salat", snack: "snack", getraenk: "getraenk" };

/* Genauere Filter-Merkmale (nur für „Kochen“) */
const TAGS = [
  { id: "haehnchen", label: "Hähnchen", emoji: "🍗" },
  { id: "hack", label: "Hackfleisch", emoji: "🥩" },
  { id: "rind", label: "Rindfleisch", emoji: "🐄" },
  { id: "schwein", label: "Schweinefleisch", emoji: "🐖" },
  { id: "fisch", label: "Fisch", emoji: "🐟" },
  { id: "vegetarisch", label: "Vegetarisch", emoji: "🥦" },
  { id: "pasta", label: "Pasta", emoji: "🍝" },
  { id: "reis", label: "Reis", emoji: "🍚" },
  { id: "kartoffeln", label: "Kartoffeln", emoji: "🥔" },
  { id: "suppe", label: "Suppe", emoji: "🥣" },
  { id: "salat", label: "Salat", emoji: "🥗" },
  { id: "snack", label: "Snack", emoji: "🥨" },
  { id: "getraenk", label: "Getränk", emoji: "🍹" },
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
const DISH_TAGS = ["pasta", "suppe", "salat", "snack", "getraenk"];
const recipeEmoji = (r) => {
  if (r.emoji) return r.emoji; // selbst gewählt
  if (r.type === "backen") return (r.tags?.length && tagById(r.tags[0])?.emoji) || catById("backen").emoji;
  const dish = r.category === "haupt" || !COOK_CATS.includes(r.category) ? DISH_TAGS.find((t) => r.tags?.includes(t)) || LEGACY_CAT_TAG[r.category] : null;
  return (dish && tagById(dish)?.emoji) || catById(r.category).emoji;
};
const tagsFor = (type) => (type === "backen" ? BAKE_TAGS : TAGS);
/* zusätzliche Filter nur für „Inspiration“ */
const INSP_EXTRA_TAGS = [
  { id: "fruehstueck", label: "Frühstück", emoji: "🥐" },
  { id: "hauptgericht", label: "Hauptgericht", emoji: "🍲" },
];
const tagById = (id) => TAGS.find((t) => t.id === id) || BAKE_TAGS.find((t) => t.id === id) || INSP_EXTRA_TAGS.find((t) => t.id === id);
const TYPES = { kochen: { label: "Kochen", emoji: "🍳" }, backen: { label: "Backen", emoji: "🧁" } };

/** ältere Rezepte ohne Art/Merkmale auf das neue Format bringen */
function normalize(r) {
  if (!r.type) r.type = r.category === "backen" ? "backen" : "kochen";
  if (!Array.isArray(r.tags)) r.tags = SAMPLE_RECIPES.find((s) => s.title === r.title)?.tags || [];
  if (r.type === "backen") r.category = "backen";
  else {
    // alte Kategorien (Pasta, Suppe …) → Merkmal; Frühstück/Hauptgericht sind jetzt Kategorien statt Merkmale
    const tags = [...r.tags];
    if (LEGACY_CAT_TAG[r.category]) { tags.push(LEGACY_CAT_TAG[r.category]); r.category = "haupt"; }
    if (r.category === "dessert") r.category = "nachtisch";
    if (!COOK_CATS.includes(r.category)) r.category = "haupt";
    if (tags.includes("fruehstueck") && r.category === "haupt") r.category = "fruehstueck";
    r.tags = [...new Set(tags)].filter((t) => t !== "fruehstueck" && t !== "hauptgericht");
  }
  r.tags = r.tags.filter((t) => tagById(t)); // entfernte Merkmale aussortieren
  if (!Array.isArray(r.links)) r.links = [];
  return r;
}

/* ---------- Links ---------- */
/** Eingabe → sichere https-Adresse (oder null). Nur http(s) ist erlaubt. */
function cleanUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.href;
  } catch { return null; }
}
const linkHost = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

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
// einheitlicher, leicht grüner Hintergrund hinter Emoji-Titelbildern
const phClass = () => "ph-0";
/** Emojis für Titelbilder ohne Foto */
const RECIPE_EMOJIS = ["🍝","🍲","🍛","🍜","🥘","🫕","🥗","🍕","🍔","🌭","🥪","🌮","🌯","🥙","🧆","🫔","🍣","🍱","🍙","🍚","🍘","🥟","🥠","🥡","🍤","🍢",
  "🍗","🍖","🥩","🥓","🐟","🐠","🦐","🦞","🦀","🦑","🐙","🦪","🍳","🥚","🧇","🥞","🥐","🥯","🍞","🥖","🥨","🧀","🫓","🥫","🍟",
  "🥔","🍠","🥕","🌽","🥦","🥬","🥒","🍅","🍆","🫑","🌶️","🧄","🧅","🍄","🥜","🫘","🌰","🥑","🫒","🍋","🍎","🍐","🍊","🍌","🍓","🍒",
  "🍑","🥭","🍍","🥥","🥝","🍉","🍇","🫐","🍰","🎂","🧁","🥧","🍮","🍫","🍪","🍩","🍨","🍧","🍦","🍯","🥛","☕","🍵","🧃","🥤","🍹","🍷","🍺","🍽️"];

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
  const metric = /^(g|kg|ml|l)$/i.test(unit);
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
    // Klick auf den Hintergrund schließt – aber nie den Rezept-Editor (sonst gehen Eingaben verloren)
    if (e.target === dlg && dlg.id !== "editor-modal") closeModal(dlg);
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
  const cats = state.type === "backen" ? [] : CATEGORIES.filter((c) => COOK_CATS.includes(c.id));
  if (state.category !== "all" && !cats.some((c) => c.id === state.category)) state.category = "all";
  // Kategorien stecken im Filter-Fenster – beim Kochen immer alle vier, Backen hat keine
  $("#category-group").hidden = state.type === "backen";
  $("#category-chips").innerHTML = cats.map((c) => `<button type="button" class="tag" data-cat="${c.id}" aria-pressed="${state.category === c.id}">${c.emoji} ${esc(c.label)}</button>`).join("");
}
$("#category-chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  state.category = state.category === b.dataset.cat ? "all" : b.dataset.cat; // nochmal tippen = abwählen
  renderList();
});

function thumbHTML(r, cls = "thumb") {
  return r.image
    ? `<div class="${cls}"><img src="${r.image}" alt="" loading="lazy" width="64" height="64" /></div>`
    : `<div class="${cls} ${phClass(r)}">${recipeEmoji(r)}</div>`;
}

/** Rezepte, die die Liste gerade zeigt: eigene oder (schreibgeschützt) die eines Freundes */
const listRecipes = () => (state.viewing ? state.viewing.recipes : state.recipes);

/** Rezept aus einem anderen Haushalt (bzw. Kalender-Kopie) ansehen – ohne Bearbeiten, mit „Übernehmen“ */
function openRecipeReadOnly(r, fromName, { note = null, attribution = null, friend = null } = {}) {
  state.current = normalize({ ...r, tags: [...(r.tags || [])] });
  // Freundesrezept → darf (als Kopie im Kalender) eingeplant werden
  state.planFriend = friend;
  $("#detail-modal").classList.toggle("ro-plan", !!friend);
  state.servings = r.servings || 2;
  state.readOnlyFrom = fromName || "einem anderen Haushalt";
  state.readOnlyNote = note || `🏡 Aus „${state.readOnlyFrom}“ · nur ansehen`;
  state.readOnlyAttribution = attribution;
  renderDetail();
  $("#detail-modal").classList.add("ro");
  openModal($("#detail-modal"));
}

/** Rezept eines Freundes als eigene Kopie anlegen (Foto wird mitkopiert) */
async function copyFriendRecipe(r) {
  closeModal($("#detail-modal"));
  let image = null;
  if (r.image) {
    try { const res = await fetch(r.image); if (res.ok) image = await compressImage(await res.blob()); } catch {}
  }
  const { id, createdAt, updatedAt, imagePath, imageSrc, imageAuto, imageCredit, ...rest } = r;
  const from = state.viewing?.user;
  const { _from, ...clean } = rest;
  const note = from ? `Rezept von ${from.display_name} (@${from.username})` : state.readOnlyAttribution || (state.readOnlyFrom ? `Übernommen aus „${state.readOnlyFrom}“` : null);
  openEditor({ ...clean, image, tips: [...(r.tips || []), ...(note ? [note] : [])] }, { draft: true });
}

/* ---------- Kochen / Backen ---------- */
document.querySelectorAll("#panel-rezepte .subtab").forEach((b) => b.addEventListener("click", () => {
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
  const btn = $("#btn-filter"), n = state.tags.size + (state.category !== "all" ? 1 : 0);
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
$("#filter-reset").addEventListener("click", () => { state.tags.clear(); state.category = "all"; renderList(); });

function renderList() {
  document.querySelectorAll("#panel-rezepte .subtab").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.type === state.type);
    b.setAttribute("aria-selected", b.dataset.type === state.type);
  });
  renderChips();
  renderFilter();
  const q = state.search.trim().toLowerCase();
  const ofType = listRecipes().filter((r) => r.type === state.type);
  const useTags = state.tags.size;
  const list = ofType
    .filter((r) => state.category === "all" || r.category === state.category)
    .filter((r) => !useTags || [...state.tags].every((t) => r.tags.includes(t)))
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt - a.createdAt);

  const total = listRecipes().length, n = ofType.length;
  $("#recipes-title").textContent = state.viewing ? `Rezepte von ${state.viewing.user.display_name}` : "Unsere Rezepte";
  $("#recipe-count").textContent = state.viewing
    ? `${total} ${total === 1 ? "Rezept" : "Rezepte"} von ${state.viewing.user.display_name}`
    : total === 0 ? "Noch leer – auf geht's!" : total === 1 ? "1 Rezept in unserer Sammlung" : `${total} Rezepte in unserer Sammlung`;
  $("#recipe-empty").hidden = n !== 0;
  $("#empty-emoji").textContent = state.type === "backen" ? "🧁" : "🥄";
  $("#empty-text").innerHTML = state.type === "backen"
    ? "<strong>Noch keine Backrezepte.</strong><br />Legt mit „＋ Neu“ euren ersten Kuchen, euer erstes Brot … an."
    : "<strong>Noch keine Kochrezepte.</strong><br />Legt mit „＋ Neu“ euer erstes Lieblingsrezept an.";
  if (state.viewing) $("#empty-text").innerHTML = `<strong>Hier gibt es noch keine ${state.type === "backen" ? "Backrezepte" : "Kochrezepte"}.</strong>`;

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
  if (typeof Plan !== "undefined") Plan.render(); // Titel/Bilder im Kalender aktuell halten
  if (typeof Reste !== "undefined" && $("#panel-reste").classList.contains("is-active")) Reste.render();
}

$("#recipe-list").addEventListener("click", (e) => {
  const bar = e.target.closest(".recipe-bar");
  if (bar) openDetail(bar.dataset.id);
});
$("#search").addEventListener("input", (e) => { state.search = e.target.value; renderList(); });

/* ================= Detailansicht ================= */
function openDetail(id) {
  $("#detail-modal").classList.remove("ro");
  state.readOnlyFrom = null;
  // in der Rezeptliste eines Freundes: Einplanen erlaubt, Bearbeiten nicht
  const f = state.viewing?.user;
  state.planFriend = f ? { name: f.display_name, attribution: `Rezept von ${f.display_name} (@${f.username})` } : null;
  $("#detail-modal").classList.toggle("ro-plan", !!f);
  const r = listRecipes().find((x) => x.id === id);
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
      ${state.readOnlyFrom ? `<p class="ro-note">${esc(state.readOnlyNote || "")}</p>` : ""}
      <div class="meta-chips">
        <span class="meta-chip">${TYPES[r.type].emoji} ${TYPES[r.type].label}</span>
        <span class="meta-chip">${cat.emoji} ${esc(cat.label)}</span>
        ${r.tags.map((t) => tagById(t)).filter(Boolean).map((t) => `<span class="meta-chip tag-chip">${t.emoji} ${esc(t.label)}</span>`).join("")}
        ${r.time ? `<span class="meta-chip">⏱️ ${r.time} Min.</span>` : ""}
        <span class="meta-chip">🧂 ${r.ingredients.length} Zutaten</span>
        <span class="meta-chip">👩‍🍳 ${r.steps.length} Schritte</span>
      </div>
      <button type="button" class="btn btn-soft plan-btn" data-action="plan">🗓️ In den Kalender</button>
      <button type="button" class="btn btn-primary plan-btn copy-btn" data-action="copy">📥 In unsere Rezepte übernehmen</button>

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
          <p class="hint">Antippen zum Abhaken ✓ · 🛒 setzt die Zutat auf die Einkaufsliste</p>
          ${r.ingredients.length ? `<button type="button" class="btn btn-soft add-all-btn" data-action="add-all">🛒 Alle auf die Einkaufsliste</button>` : ""}
        </section>

        <section class="card">
          <h3>Zubereitung</h3>
          ${r.steps.length ? `<ol class="step-list">${r.steps.map((s) => { const p = stepParts(s); return `<li>${p.title ? `<strong class="step-title">${esc(p.title)}</strong>` : ""}${p.text ? `<span class="step-text">${esc(p.text)}</span>` : ""}</li>`; }).join("")}</ol>` : `<p class="muted">Keine Schritte hinterlegt.</p>`}
        </section>
      </div>

      ${r.tips.length ? `<section class="card tips-card"><h3>Tipps &amp; Hinweise</h3><ul>${r.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
      ${(r.links || []).length ? `<section class="card links-card"><h3>Links</h3><ul class="link-list">${r.links.map((l) => `<li>
        <a class="link-item" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
          <span class="link-icon" aria-hidden="true">🔗</span>
          <span class="link-text"><strong>${esc(l.title || linkHost(l.url))}</strong><small>${esc(linkHost(l.url))}</small></span>
          <span class="link-go" aria-hidden="true">↗</span>
        </a></li>`).join("")}</ul></section>` : ""}
    </div>`;
}

function ingredientsHTML(r) {
  const factor = state.servings / r.servings;
  if (!r.ingredients.length) return `<li class="muted">Keine Zutaten hinterlegt.</li>`;
  return r.ingredients.map((i) => {
    const amt = i.amount == null ? "" : formatAmount(i.amount * factor, i.unit);
    const idx = r.ingredients.indexOf(i);
    const on = typeof Shop !== "undefined" && !!Shop.onList(r.id, idx);
    return `<li><span class="ing-amt">${esc([amt, i.unit].filter(Boolean).join(" "))}</span><span class="ing-name">${esc(i.name)}</span>
      <button type="button" class="ing-cart ${on ? "is-on" : ""}" data-idx="${idx}" aria-pressed="${on}" aria-label="${esc(i.name)} auf die Einkaufsliste" title="Auf die Einkaufsliste">🛒</button></li>`;
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
    try { await Store.remove(state.current); }
    catch (err) { console.error(err); return toast("Löschen fehlgeschlagen 😕"); }
    state.recipes = state.recipes.filter((r) => r.id !== state.current.id);
    closeModal($("#detail-modal"));
    renderList();
    return toast("Rezept gelöscht 🗑️");
  }
  if (act === "add-all") return Shop.addAll(state.current, state.servings / state.current.servings);
  if (act === "plan") return Plan.openDayPicker(state.current, { friend: state.planFriend });
  if (act === "copy") return copyFriendRecipe(state.current);
  const cart = e.target.closest(".ing-cart");
  if (cart) {
    const on = await Shop.toggleIngredient(state.current, +cart.dataset.idx, state.servings / state.current.servings);
    cart.classList.toggle("is-on", on);
    cart.setAttribute("aria-pressed", String(on));
    return;
  }
  const li = e.target.closest(".ing-list li, .step-list li");
  if (li) li.classList.toggle("done");
});

/* ================= Editor (Vorlage) ================= */
const form = $("#editor-form");
$("#f-category").innerHTML = CATEGORIES.filter((c) => c.id !== "backen").map((c) => `<option value="${c.id}">${c.emoji} ${esc(c.label)}</option>`).join("");

function ingRow(i = {}) {
  const div = document.createElement("div");
  div.className = "ing-row";
  const unit = i.unit || "";
  const units = [...new Set([...RECIPE_UNITS, unit])];
  div.innerHTML = `
    <div class="i-step">
      <button type="button" class="i-minus" aria-label="Weniger">−</button>
      <input type="text" inputmode="decimal" class="i-amount" placeholder="–" value="${esc(amountForInput(i.amount))}" aria-label="Menge" />
      <button type="button" class="i-plus" aria-label="Mehr">+</button>
    </div>
    <select class="i-unit" aria-label="Einheit">${units.map((u) => `<option value="${esc(u)}" ${u === unit ? "selected" : ""}>${u ? esc(u) : "–"}</option>`).join("")}</select>
    <div class="i-name-wrap">
      <span class="i-emoji" aria-hidden="true">${i.name ? esc(categorize(i.name).emoji) : "🔎"}</span>
      <input type="text" class="i-name" placeholder="Zutat suchen …" value="${esc(i.name || "")}" aria-label="Zutat" autocomplete="off" />
    </div>
    <button type="button" class="row-del" aria-label="Entfernen">✕</button>
    <ul class="ing-suggest" role="listbox" hidden></ul>`;
  return div;
}

/* --- Zutaten: Vorschläge, Menge & Einheit --- */
function ingSuggest(row) {
  const input = row.querySelector(".i-name"), box = row.querySelector(".ing-suggest");
  const q = input.value.trim();
  row.querySelector(".i-emoji").textContent = q ? categorize(q).emoji : "🔎";
  if (!q || document.activeElement !== input) { box.hidden = true; return; }
  const list = suggestGroceries(q, 5);
  row._sugg = list;
  row._active = Math.min(row._active ?? -1, list.length - 1);
  const known = isKnownGrocery(q);
  box.innerHTML = list.map((s, k) => `<li class="sugg ${k === row._active ? "is-active" : ""}" data-k="${k}"><span class="sugg-emoji">${esc(s.emoji)}</span><span class="sugg-name">${esc(s.name)}</span>${s.custom ? `<span class="sugg-star">⭐</span>` : ""}</li>`).join("")
    + (known ? "" : `<li class="sugg sugg-new" data-new="1"><span class="sugg-emoji">⭐</span><span class="sugg-name">„${esc(q)}“ als eigene Zutat anlegen</span></li>`);
  box.hidden = !box.innerHTML;
}
function pickIngredient(row, name) {
  row.querySelector(".i-name").value = name;
  row.querySelector(".i-emoji").textContent = categorize(name).emoji;
  row.querySelector(".ing-suggest").hidden = true;
  row._active = -1;
  const amt = row.querySelector(".i-amount");
  if (!amt.value.trim()) {
    const s = suggestRecipeQty(name);
    setRowUnit(row, s.unit);
    amt.value = amountForInput(s.amount);
  }
}
function setRowUnit(row, unit) {
  const sel = row.querySelector(".i-unit");
  if (![...sel.options].some((o) => o.value === unit)) sel.add(new Option(unit, unit));
  sel.value = unit;
}
function stepRow(row, dir) {
  const amt = row.querySelector(".i-amount"), unit = row.querySelector(".i-unit").value;
  const v = parseAmount(amt.value) ?? 0;
  const step = qtyStep(unit, dir > 0 ? v : Math.max(v - 0.001, 0));
  const next = nextQty(v, step, dir);
  amt.value = next > 0 ? amountForInput(next) : "";
}

const ingBox = $("#ing-rows");
ingBox.addEventListener("input", (e) => { if (e.target.classList.contains("i-name")) { const r = e.target.closest(".ing-row"); r._active = -1; ingSuggest(r); } });
ingBox.addEventListener("focusin", (e) => { if (e.target.classList.contains("i-name")) ingSuggest(e.target.closest(".ing-row")); });
ingBox.addEventListener("focusout", (e) => {
  if (!e.target.classList.contains("i-name")) return;
  const row = e.target.closest(".ing-row");
  setTimeout(() => { if (!row.contains(document.activeElement)) row.querySelector(".ing-suggest").hidden = true; }, 150);
});
ingBox.addEventListener("mousedown", (e) => { if (e.target.closest(".ing-suggest")) e.preventDefault(); });
ingBox.addEventListener("click", (e) => {
  const row = e.target.closest(".ing-row");
  if (!row) return;
  if (e.target.closest(".i-minus")) return stepRow(row, -1);
  if (e.target.closest(".i-plus")) return stepRow(row, 1);
  const li = e.target.closest(".ing-suggest .sugg");
  if (!li) return;
  if (li.dataset.new) {
    const name = row.querySelector(".i-name").value.trim();
    row.querySelector(".ing-suggest").hidden = true;
    return Shop.openCustoms({ name }, (c) => pickIngredient(row, c.name));
  }
  pickIngredient(row, row._sugg[+li.dataset.k].name);
});

/** Schritt: früher nur Text, jetzt { title, text } – beides wird verstanden */
const stepParts = (s) => (s && typeof s === "object" ? { title: s.title || "", text: s.text || "" } : { title: "", text: String(s || "") });

function prepStepRow(value = "") {
  const p = stepParts(value);
  const div = document.createElement("div");
  div.className = "text-row step-row";
  div.innerHTML = `
    <span class="num"></span>
    <div class="step-fields">
      <input type="text" class="s-title" placeholder="Überschrift, z. B. Anbraten" value="${esc(p.title)}" aria-label="Überschrift des Schritts" />
      <textarea rows="2" placeholder="Was ist genau zu tun?" aria-label="Beschreibung des Schritts">${esc(p.text)}</textarea>
    </div>
    <button type="button" class="row-del" aria-label="Entfernen">✕</button>`;
  return div;
}

function textRow(value = "", kind = "step") {
  if (kind === "step") return prepStepRow(value);
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
  if (focus) el.querySelector(".i-name, input, textarea").focus();
}

$("#add-ing").addEventListener("click", () => addRow($("#ing-rows"), ingRow()));
$("#add-step").addEventListener("click", () => addRow($("#step-rows"), textRow("", "step")));
$("#add-tip").addEventListener("click", () => addRow($("#tip-rows"), textRow("", "tip")));
$("#add-link").addEventListener("click", () => addRow($("#link-rows"), linkRow()));

function linkRow(l = {}) {
  const div = document.createElement("div");
  div.className = "link-row";
  div.innerHTML = `
    <span class="num link-num" aria-hidden="true">🔗</span>
    <div class="link-fields">
      <input type="url" class="l-url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://www.chefkoch.de/…" value="${esc(l.url || "")}" aria-label="Link" />
      <input type="text" class="l-title" placeholder="Bezeichnung (optional), z. B. Originalrezept" value="${esc(l.title || "")}" aria-label="Bezeichnung" />
    </div>
    <button type="button" class="row-del" aria-label="Entfernen">✕</button>`;
  return div;
}

form.addEventListener("click", (e) => {
  const del = e.target.closest(".row-del");
  if (!del) return;
  const row = del.parentElement, box = row.parentElement;
  row.remove();
  if (!box.children.length) box.appendChild(box.id === "ing-rows" ? ingRow() : box.id === "link-rows" ? linkRow() : textRow("", box.id === "tip-rows" ? "tip" : "step"));
  renumberSteps();
});

// Enter in letzter Zutat → neue Zeile
$("#ing-rows").addEventListener("keydown", (e) => {
  const row = e.target.closest(".ing-row");
  // Pfeiltasten in den Vorschlägen
  if (e.target.classList.contains("i-name") && !row.querySelector(".ing-suggest").hidden && row._sugg?.length) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      row._active = Math.max(-1, Math.min(row._sugg.length - 1, (row._active ?? -1) + (e.key === "ArrowDown" ? 1 : -1)));
      return ingSuggest(row);
    }
    if (e.key === "Enter" && row._active >= 0) { e.preventDefault(); return pickIngredient(row, row._sugg[row._active].name); }
    if (e.key === "Escape") { row.querySelector(".ing-suggest").hidden = true; return; }
  }
  if (e.key === "Enter") {
    e.preventDefault();
    if (row === $("#ing-rows").lastElementChild) addRow($("#ing-rows"), ingRow());
    else row.nextElementSibling.querySelector(".i-name").focus();
  }
});

// Textareas automatisch mitwachsen lassen
form.addEventListener("input", (e) => {
  if (e.target.tagName === "TEXTAREA") { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }
  if (e.target.classList.contains("invalid")) e.target.classList.remove("invalid");
});

/* --- Bild (nur eigene Fotos; ohne Foto zeigt die Seite ein Emoji) --- */
const RECIPE_ASPECT = 4 / 3;
/** src: Original zum Nachjustieren { url, path?, crop } – url ist bei neu gewählten Fotos eine DataURL */
function setImage(dataUrl, src = null) {
  state.image = dataUrl;
  state.imageSrc = dataUrl ? src : null;
  const img = $("#image-preview");
  img.hidden = !dataUrl;
  if (dataUrl) img.src = dataUrl; else img.removeAttribute("src");
  $("#image-hint").hidden = !!dataUrl;
  $("#image-drop").classList.toggle("ph-0", !dataUrl);
  $("#emoji-pick").hidden = !!dataUrl; // Emoji nur, solange kein Foto da ist
  $("#image-remove").hidden = $("#image-new").hidden = $("#image-adjust").hidden = !dataUrl;
  $("#image-drop").setAttribute("aria-label", dataUrl ? "Bildausschnitt anpassen" : "Bild hinzufügen");
}
async function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  try {
    const res = await Cropper.open(file, { aspect: RECIPE_ASPECT });
    if (!res) return; // abgebrochen
    setImage(res.image, { url: res.original, crop: res.crop });
    saveDraftSoon();
  } catch (err) { toast(err.message); }
}
/** vorhandenes Bild erneut zuschneiden (vom Original, sonst vom aktuellen Bild) */
async function recropImage() {
  const src = state.imageSrc?.url ? state.imageSrc
    : { url: state.image, path: state.editing?.image === state.image ? state.editing?.imagePath || null : null, crop: null };
  try {
    const res = await Cropper.open(src.url, { crop: src.crop, aspect: RECIPE_ASPECT });
    if (!res) return;
    setImage(res.image, { ...src, crop: res.crop });
    saveDraftSoon();
  } catch (err) { console.error(err); toast("Dieses Bild lässt sich nicht bearbeiten – wähl es mit 📷 neu aus."); }
}
$("#image-input").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });
$("#image-remove").addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setImage(null); saveDraftSoon(); });
$("#image-new").addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); $("#image-input").click(); });
const drop = $("#image-drop");
drop.addEventListener("click", (e) => {
  if (e.target.closest("input")) return;
  if (state.image) recropImage(); else $("#image-input").click();
});
drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drop.click(); } });
["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

/* --- Art & Merkmale --- */
function setEditType(type) {
  state.editType = type;
  document.querySelectorAll("#f-type .seg-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.type === type)));
  // Merkmale der jeweiligen Art anzeigen; nicht passende fallen beim Speichern weg
  $("#f-tags").innerHTML = tagButtons(state.editTags, tagsFor(type));
  // Backrezepte haben keine Gang-Kategorie
  $("#f-category").closest(".field").hidden = type === "backen";
  paintEmoji();
}
$("#f-type").addEventListener("click", (e) => { const b = e.target.closest(".seg-btn"); if (b) setEditType(b.dataset.type); });
/* --- Emoji-Titelbild (wenn kein Foto) --- */
const editorEmoji = () => state.editEmoji || recipeEmoji({ type: state.editType, category: $("#f-category").value, tags: [...state.editTags] });
function paintEmoji() {
  const e = editorEmoji();
  $("#emoji-current").textContent = e;
  $("#image-emoji").textContent = e;
  $("#emoji-auto").hidden = !state.editEmoji;
  $("#emoji-grid").querySelectorAll("[data-emoji]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.emoji === state.editEmoji)));
}
$("#emoji-grid").innerHTML = RECIPE_EMOJIS.map((e) => `<button type="button" class="rx-emoji-opt" data-emoji="${e}" aria-label="${e}" aria-pressed="false">${e}</button>`).join("");
$("#emoji-btn").addEventListener("click", () => {
  const g = $("#emoji-grid"); g.hidden = !g.hidden;
  $("#emoji-btn").setAttribute("aria-expanded", String(!g.hidden));
});
$("#emoji-grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-emoji]");
  if (!b) return;
  state.editEmoji = b.dataset.emoji;
  paintEmoji(); saveDraftSoon();
});
$("#emoji-auto").addEventListener("click", () => { state.editEmoji = null; paintEmoji(); saveDraftSoon(); });
$("#f-category").addEventListener("change", paintEmoji);

$("#f-tags").addEventListener("click", (e) => {
  const t = e.target.closest(".tag");
  if (!t) return;
  const on = !state.editTags.has(t.dataset.tag);
  on ? state.editTags.add(t.dataset.tag) : state.editTags.delete(t.dataset.tag);
  t.setAttribute("aria-pressed", String(on));
  paintEmoji();
});

/* --- Öffnen / Speichern --- */
/* --- Entwurf: ungespeicherte Eingaben im Browser sichern --- */
const DRAFT_KEY = "foodies-draft";
let draftTimer;
function readEditor() {
  return {
    title: $("#f-title").value,
    type: state.editType,
    category: state.editType === "backen" ? "backen" : $("#f-category").value,
    tags: [...state.editTags],
    servings: parseInt($("#f-servings").value, 10) || 2,
    time: parseInt($("#f-time").value, 10) || null,
    image: state.image,
    emoji: state.editEmoji || null,
    // neu gewähltes Original ist zu groß für den Entwurf → nur gespeicherte Originale merken
    imageSrc: state.imageSrc?.url && !state.imageSrc.url.startsWith("data:") ? state.imageSrc : null,
    ingredients: [...$("#ing-rows").children].map((row) => ({
      amount: parseAmount(row.querySelector(".i-amount").value),
      unit: row.querySelector(".i-unit").value,
      name: row.querySelector(".i-name").value,
    })).filter((i) => i.name.trim() || i.amount != null),
    steps: [...$("#step-rows").children].map((row) => ({ title: row.querySelector(".s-title").value, text: row.querySelector("textarea").value })).filter((x) => x.title.trim() || x.text.trim()),
    tips: [...$("#tip-rows").querySelectorAll("textarea")].map((t) => t.value).filter((t) => t.trim()),
    links: [...$("#link-rows").children].map((row) => ({ url: row.querySelector(".l-url").value, title: row.querySelector(".l-title").value })).filter((l) => l.url.trim()),
  };
}
function saveDraft() {
  if (!$("#editor-modal").open) return;
  const d = readEditor();
  if (!d.title.trim() && !d.ingredients.length && !d.steps.length && !d.tips.length) return;
  const entry = { forId: state.editing?.id || null, savedAt: Date.now(), data: d };
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(entry)); }
  catch { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...entry, data: { ...d, image: null } })); } catch {} } // zu groß → ohne Foto
}
function saveDraftSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); }
function clearDraft() { clearTimeout(draftTimer); try { localStorage.removeItem(DRAFT_KEY); } catch {} }
function readDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; } }
["input", "change"].forEach((ev) => form.addEventListener(ev, saveDraftSoon));
form.addEventListener("click", (e) => { if (e.target.closest("button")) saveDraftSoon(); });

function showDraftBanner(recipe) {
  const d = readDraft();
  const banner = $("#draft-banner");
  banner.hidden = !(d && d.forId === (recipe?.id || null) && d.data);
  if (banner.hidden) return;
  const time = new Date(d.savedAt).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  $("#draft-text").textContent = `Nicht gespeicherter Entwurf${d.data.title ? ` „${d.data.title}“` : ""} von ${time} gefunden.`;
  $("#draft-restore").onclick = () => {
    const base = state.editing;
    banner.hidden = true;
    openEditor(base ? { ...base, ...d.data } : d.data, { draft: !base, fromDraft: true });
    if (!base) $("#editor-title").textContent = "Neues Rezept";
    toast("Entwurf wiederhergestellt ✍️");
  };
  $("#draft-discard").onclick = () => { clearDraft(); banner.hidden = true; };
}

function openEditor(recipe = null, { draft = false, fromDraft = false } = {}) {
  // draft: vorausgefüllte Vorlage (z. B. aus Inspiration), wird als neues Rezept gespeichert
  state.editing = draft ? null : recipe;
  $("#editor-title").textContent = draft ? "Idee übernehmen" : recipe ? "Rezept bearbeiten" : "Neues Rezept";
  $("#f-title").value = recipe?.title || "";
  $("#f-title").classList.remove("invalid");
  // ältere Kategorien/Merkmale auf das aktuelle Schema bringen (ohne das Original zu verändern)
  const norm = recipe ? normalize({ ...recipe, tags: [...(recipe.tags || [])] }) : null;
  $("#f-category").value = norm && norm.category !== "backen" ? norm.category : "haupt";
  state.editTags = new Set(norm?.tags || []);
  state.editEmoji = recipe?.emoji || null;
  $("#emoji-grid").hidden = true; $("#emoji-btn").setAttribute("aria-expanded", "false");
  setEditType(recipe?.type || state.type);
  $("#f-servings").value = recipe?.servings || 2;
  $("#f-time").value = recipe?.time || "";
  setImage(recipe?.image || null, recipe?.imageSrc || null);

  const fill = (box, items, make) => {
    box.innerHTML = "";
    (items.length ? items : [undefined]).forEach((it) => box.appendChild(make(it)));
  };
  fill($("#ing-rows"), recipe?.ingredients || [{}, {}, {}], (i) => ingRow(i));
  fill($("#step-rows"), recipe?.steps || ["", ""], (s) => prepStepRow(s));
  fill($("#tip-rows"), recipe?.tips || [""], (t) => textRow(t, "tip"));
  fill($("#link-rows"), recipe?.links || [], (l) => linkRow(l));
  renumberSteps();
  if (fromDraft) $("#draft-banner").hidden = true; else showDraftBanner(draft ? null : recipe);
  if (!$("#editor-modal").open) openModal($("#editor-modal"));
  form.querySelectorAll("textarea").forEach((t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; });
  if (!recipe) $("#f-title").focus();
}
$("#btn-new").addEventListener("click", () => openEditor());

/** Bild-Felder fürs Speichern: neues Original wird hochgeladen, ein gespeichertes behält nur den neuen Ausschnitt */
function imageFields() {
  const src = state.imageSrc;
  if (!state.image || !src?.url) return { imageSrc: null };
  if (!src.path && src.url.startsWith("data:")) return { imageOriginal: src.url, imageSrc: { crop: src.crop } };
  return { imageSrc: { url: src.url, path: src.path || null, crop: src.crop } };
}
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
  const links = [];
  for (const row of $("#link-rows").children) {
    const raw = row.querySelector(".l-url").value.trim();
    if (!raw) continue;
    const url = cleanUrl(raw);
    if (!url) {
      row.querySelector(".l-url").classList.add("invalid");
      row.querySelector(".l-url").focus();
      return toast("Dieser Link sieht nicht richtig aus 🔗");
    }
    links.push({ url, title: row.querySelector(".l-title").value.trim() });
  }

  const now = Date.now();
  let recipe = {
    id: state.editing?.id || uid(),
    createdAt: state.editing?.createdAt || now,
    updatedAt: now,
    title,
    type: state.editType,
    category: state.editType === "backen" ? "backen" : $("#f-category").value,
    tags: tagsFor(state.editType).map((t) => t.id).filter((id) => state.editTags.has(id)),
    servings: Math.max(1, Math.min(50, parseInt($("#f-servings").value, 10) || 2)),
    time: parseInt($("#f-time").value, 10) || null,
    image: state.image,
    emoji: state.editEmoji || null,
    ...imageFields(),
    ingredients,
    steps: [...$("#step-rows").children].map((row) => ({
      title: row.querySelector(".s-title").value.trim(),
      text: row.querySelector("textarea").value.trim(),
    })).filter((s) => s.title || s.text),
    tips: texts($("#tip-rows")),
    links: links,
  };

  const saveBtn = form.querySelector('button[type="submit"]');
  saveBtn.disabled = true;
  saveBtn.textContent = "Speichere …";
  let photoFailed = false;
  try {
    try {
      recipe = await Store.put(recipe, state.editing);
    } catch (err) {
      // Klappt nur das Hochladen des Fotos nicht, das Rezept trotzdem (ohne neues Foto) sichern
      if (!(recipe.image && recipe.image.startsWith("data:"))) throw err;
      console.error(err);
      const { imageOriginal, ...rest } = recipe;
      recipe = await Store.put({ ...rest, image: state.editing?.image || null, imageSrc: state.editing?.imageSrc || null }, state.editing);
      photoFailed = true;
    }
  } catch (err) {
    console.error(err);
    return toast(Store.cloud ? "Speichern fehlgeschlagen – seid ihr online? Euer Entwurf bleibt erhalten." : "Speichern fehlgeschlagen 😕");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Rezept speichern";
  }
  const idx = state.recipes.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) state.recipes[idx] = recipe; else state.recipes.push(recipe);
  closeModal($("#editor-modal"));
  if (state.viewing) Profile.leaveFriendView(); // kopiertes Freundesrezept → eigene Sammlung zeigen
  if (recipe.type !== state.type) { state.type = recipe.type; state.category = "all"; }
  if (!state.editing) document.querySelector('.tab[data-tab="rezepte"]').click();
  renderList();
  toast(photoFailed ? "Rezept gespeichert – das Foto konnte aber nicht hochgeladen werden 📷" : state.editing ? "Änderungen gespeichert ✨" : "Rezept angelegt 🎉");
  clearDraft();
  if (state.editing) openDetail(recipe.id);
});

/* ================= Start ================= */
async function loadRecipes() {
  state.recipes = (await Store.all()).map(normalize);
  if (state.current && !state.recipes.some((r) => r.id === state.current.id) && $("#detail-modal").open
      && !$("#detail-modal").classList.contains("ro") && !state.viewing) closeModal($("#detail-modal"));
  renderList();
}

/* --- Anmeldung (nur gemeinsame Sammlung) --- */
function showLogin(show) {
  document.body.classList.toggle("locked", show);
  $("#login").hidden = !show;
  $("#btn-logout").hidden = show || !Store.cloud || !!(typeof Profile !== "undefined" && Profile.me);
}
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#login-error"), btn = $("#login-submit");
  err.hidden = true;
  btn.disabled = true;
  const signup = Household.signupMode;
  btn.textContent = signup ? "Registriere …" : "Melde an …";
  try {
    const email = $("#login-email").value.trim(), pw = $("#login-password").value;
    if (signup) {
      if (pw.length < 6) throw { code: "short" };
      const hasSession = await Store.auth.signUp(email, pw);
      if (!hasSession) throw { code: "confirm" };
    } else {
      await Store.auth.signIn(email, pw);
    }
    $("#login-password").value = "";
    showLogin(false);
    keepStorage();
    await startCloud();
  } catch (ex) {
    const msg = String(ex?.message || "");
    err.textContent = ex?.code === "short" || /password.*(6|short|weak)/i.test(msg) ? "Das Passwort braucht mindestens 6 Zeichen."
      : ex?.code === "confirm" ? "Fast geschafft: Bitte bestätige zuerst die E-Mail, die wir dir geschickt haben, und melde dich dann an."
      : /already|registered|exists/i.test(msg) ? "Für diese E-Mail gibt es schon ein Konto – bitte unten auf „anmelden“ tippen."
      : /signups? not allowed|disabled/i.test(msg) ? "Registrieren ist gerade nicht freigeschaltet. Bitte gib der Person Bescheid, die dich eingeladen hat."
      : /invalid/i.test(msg) ? "E-Mail oder Passwort stimmt nicht."
      : "Das hat nicht geklappt. Seid ihr online?";
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = Household.signupMode ? "Registrieren" : "Anmelden";
  }
});
$("#btn-logout").addEventListener("click", async () => {
  await Store.auth.signOut();
  location.href = location.pathname; // sauber neu starten (auch Haushalt zurücksetzen)
});

/** Browser bitten, die gespeicherte Anmeldung nicht automatisch zu löschen (wo unterstützt) */
function keepStorage() { try { navigator.storage?.persist?.().catch(() => {}); } catch {} }

/* --- Lokale Rezepte in die gemeinsame Sammlung übernehmen --- */
async function offerMigration() {
  try { if (localStorage.getItem("foodies-migrated") === "1") return; } catch {}
  const cloudIds = new Set(state.recipes.map((r) => r.id));
  const local = (await Store.localAll()).filter((r) => !cloudIds.has(r.id));
  if (!local.length) return;
  $("#migrate-text").textContent = local.length === 1
    ? "Auf diesem Gerät liegt noch 1 Rezept, das nicht in eurer gemeinsamen Sammlung ist."
    : `Auf diesem Gerät liegen noch ${local.length} Rezepte, die nicht in eurer gemeinsamen Sammlung sind.`;
  $("#migrate-banner").hidden = false;
  const done = () => { $("#migrate-banner").hidden = true; try { localStorage.setItem("foodies-migrated", "1"); } catch {} };
  $("#migrate-no").onclick = done;
  $("#migrate-yes").onclick = async () => {
    $("#migrate-yes").disabled = true;
    $("#migrate-yes").textContent = "Übertrage …";
    let ok = 0;
    for (const r of local) {
      try { await Store.put(normalize(r)); ok++; } catch (err) { console.error(err); }
    }
    done();
    await loadRecipes();
    toast(ok === local.length ? `${ok} Rezepte übernommen ☁️` : `${ok} von ${local.length} Rezepten übernommen`);
  };
}

let cloudStarted = false;
async function startCloud() {
  // zuerst Profil (einmalig anlegen), dann Haushalt klären (ggf. Einladung annehmen / gründen)
  if (!(await Profile.ensure())) return;
  if (!(await Household.setup())) return;
  try {
    await loadRecipes();
  } catch (err) {
    console.error(err);
    return toast("Rezepte konnten nicht geladen werden – seid ihr online?");
  }
  if (!cloudStarted) {
    cloudStarted = true;
    Store.onChange(() => loadRecipes().catch(console.error)); // Änderungen vom anderen Gerät
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadRecipes().catch(() => {}); });
  }
  Shop.load();
  Plan.load();
  if (typeof enableFriendsSource === "function") enableFriendsSource();
  offerMigration();
  removeAutoImages();
}

// erst starten, wenn alle Skripte (Einkaufsliste, Inspiration …) geladen sind
document.addEventListener("DOMContentLoaded", async function init() {
  if (Store.cloud) {
    renderList();
    const session = await Store.auth.session().catch(() => null);
    if (!session) { await Household.prepareLogin(); return showLogin(true); }
    showLogin(false);
    keepStorage();
    return startCloud();
  }
  try {
    state.recipes = (await Store.all()).map(normalize);
    let seeded = false;
    try { seeded = localStorage.getItem("foodies-seeded") === "1"; } catch {}
    if (!state.recipes.length && !seeded) {
      const base = Date.now();
      for (const [i, s] of SAMPLE_RECIPES.entries()) {
        const r = normalize({ ...s, id: uid(), image: null, createdAt: base - i * 1000, updatedAt: base });
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
  Shop.load();
  Plan.load();
  removeAutoImages();
});

/* --- Früher automatisch gesetzte Bilder wieder entfernen (eigene Fotos bleiben) --- */
let cleanupRunning = false;
async function removeAutoImages() {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    for (const r of state.recipes.filter((x) => x.imageAuto && x.image)) {
      const { imageAuto, imageCredit, autoImageCheckedAt, autoImageTried, ...rest } = r;
      try {
        const saved = await Store.put({ ...rest, image: null }, r);
        const i = state.recipes.findIndex((x) => x.id === r.id);
        if (i >= 0) state.recipes[i] = normalize(saved);
      } catch (err) { console.error(err); }
    }
    renderList();
  } finally { cleanupRunning = false; }
}

/* ================= Neue Version automatisch laden =================
 * Besonders iPhones (v. a. als App auf dem Home-Bildschirm) behalten eine geöffnete Seite
 * sehr lange im Speicher. Wir vergleichen deshalb die Versionsnummer der Skripte mit der
 * auf dem Server und laden neu, sobald es passt (nie während ein Rezept bearbeitet wird).
 */
const APP_VERSION = (document.querySelector('script[src*="js/app.js"]')?.getAttribute("src").match(/v=(\d+)/) || [])[1] || "?";
$("#app-version").textContent = `foodies · Version ${APP_VERSION}`;
let updatePending = false;
async function checkForUpdate() {
  try {
    const res = await fetch(`index.html?check=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const remote = ((await res.text()).match(/js\/app\.js\?v=(\d+)/) || [])[1];
    if (remote && APP_VERSION !== "?" && remote !== APP_VERSION) {
      updatePending = true;
      reloadIfIdle();
    }
  } catch {}
}
function reloadIfIdle() {
  if (!updatePending) return;
  // nicht mitten in der Bearbeitung neu laden – Entwurf wird ohnehin gesichert
  if ($("#editor-modal").open || $("#custom-modal").open) { toast("Neue Version verfügbar – wird nach dem Speichern geladen ✨"); return; }
  location.reload();
}
$("#editor-modal").addEventListener("close", () => setTimeout(reloadIfIdle, 1500));
$("#custom-modal").addEventListener("close", () => setTimeout(reloadIfIdle, 500));
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });
window.addEventListener("pageshow", (e) => { if (e.persisted) checkForUpdate(); }); // aus dem Zwischenspeicher zurück
setTimeout(checkForUpdate, 3000);
setInterval(checkForUpdate, 10 * 60 * 1000);
