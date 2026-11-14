/* ================= Inspiration =================
 * Zwei Quellen:
 *  - Auf claude.ai (veröffentlichte Seite): Claude schlägt passende Rezepte vor.
 *  - Sonst (lokal / gehostet): freie Rezept-Datenbank TheMealDB (englisch).
 * Immer dabei: Links zum Weitersuchen bei Chefkoch und Google.
 */
const insp = { tags: new Set(), ideas: [], provider: null, sample: null, loading: false, ctl: null, started: false, lastQuery: "" };

/* ---------- Filter-UI (gleiche Merkmale wie bei Rezepte) ---------- */
function renderInspFilter() {
  const n = insp.tags.size, btn = $("#insp-filter-btn");
  btn.classList.toggle("has-active", n > 0);
  btn.setAttribute("aria-expanded", String(!$("#insp-filter-panel").hidden));
  $("#insp-filter-badge").hidden = !n;
  $("#insp-filter-badge").textContent = n;
  $("#insp-filter-tags").innerHTML = tagButtons(insp.tags);
}
$("#insp-filter-btn").addEventListener("click", () => { $("#insp-filter-panel").hidden = !$("#insp-filter-panel").hidden; renderInspFilter(); });
$("#insp-filter-tags").addEventListener("click", (e) => {
  const t = e.target.closest(".tag");
  if (!t) return;
  insp.tags.has(t.dataset.tag) ? insp.tags.delete(t.dataset.tag) : insp.tags.add(t.dataset.tag);
  renderInspFilter();
  if (insp.started) runSearch();
});
$("#insp-filter-reset").addEventListener("click", () => { insp.tags.clear(); renderInspFilter(); if (insp.started) runSearch(); });

$("#insp-form").addEventListener("submit", (e) => { e.preventDefault(); $("#insp-search").blur(); runSearch(); });
$("#insp-quick").addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  if (c.hasAttribute("data-random")) { $("#insp-search").value = ""; runSearch({ random: true }); }
  else { $("#insp-search").value = c.dataset.q; runSearch(); }
});

/* ---------- Status & Ergebnisse ---------- */
function setStatus(html, { spinner = false } = {}) {
  const s = $("#insp-status");
  s.hidden = !html;
  s.innerHTML = html ? (spinner ? `<span class="spinner" aria-hidden="true"></span><span>${html}</span>` : `<div>${html}</div>`) : "";
}

function moreLinks(q) {
  const words = [q, ...[...insp.tags].map((t) => tagById(t)?.label)].filter(Boolean).join(" ").trim();
  const term = words || "schnelle Gerichte";
  const chefkoch = `https://www.chefkoch.de/rs/s0/${encodeURIComponent(term)}/Rezepte.html`;
  const google = `https://www.google.com/search?q=${encodeURIComponent(term + " Rezept")}`;
  $("#insp-more").innerHTML = `Mehr zu „${esc(term)}“ finden: <a href="${chefkoch}" target="_blank" rel="noopener">Chefkoch ↗</a><a href="${google}" target="_blank" rel="noopener">Google ↗</a>`;
}

function ideaImg(idea) {
  return idea.image
    ? `<div class="idea-img"><img src="${esc(idea.image)}" alt="" loading="lazy" width="400" height="300" /></div>`
    : `<div class="idea-img ${phClass({ title: idea.title })}">${esc(idea.emoji || catById(idea.category).emoji)}</div>`;
}

function renderIdeas() {
  $("#insp-results").innerHTML = insp.ideas.map((idea, i) => `
    <li><button class="idea-card" data-i="${i}">
      ${ideaImg(idea)}
      <div class="idea-body">
        <p class="idea-title">${esc(idea.title)}</p>
        ${idea.summary ? `<span class="idea-sub">${esc(idea.summary)}</span>` : ""}
        ${idea.tags.length ? `<span class="idea-tags" title="${esc(idea.tags.map((t) => tagById(t)?.label).join(", "))}">${idea.tags.map((t) => tagById(t)?.emoji || "").join(" ")}</span>` : ""}
      </div>
    </button></li>`).join("");
}

async function runSearch({ random = false } = {}) {
  const q = $("#insp-search").value.trim();
  moreLinks(q);
  if (!insp.provider) return setStatus("Einen Moment, die Ideen-Suche startet gerade …", { spinner: true });
  if (insp.provider === "none") return;
  insp.started = true;
  insp.ctl?.abort();
  const ctl = (insp.ctl = new AbortController());
  insp.ideas = [];
  renderIdeas();
  setStatus(insp.provider === "claude" ? "Claude sucht passende Ideen … das dauert einen Moment" : "Suche Rezeptideen …", { spinner: true });
  try {
    const ideas = insp.provider === "claude"
      ? await claudeIdeas(q, [...insp.tags], random, ctl.signal)
      : await mealdbIdeas(q, [...insp.tags], random);
    if (ctl !== insp.ctl) return; // inzwischen neue Suche gestartet
    if (insp.provider === "mealdb" && ideas.length) {
      setStatus("Übersetze ins Deutsche …", { spinner: true });
      // höchstens 8 s warten – sonst lieber englisch anzeigen als gar nichts
      await Promise.race([translateCards(ideas), new Promise((r) => setTimeout(r, 8000))]);
      if (ctl !== insp.ctl) return;
    }
    insp.ideas = ideas;
    renderIdeas();
    setStatus(ideas.length ? "" : `<span class="big">🤷</span>Dazu haben wir nichts gefunden.<br />Probiert weniger Filter oder ein anderes Stichwort – oder sucht über die Links unten weiter.`);
  } catch (err) {
    if (ctl !== insp.ctl) return;
    console.error(err);
    setStatus(`<span class="big">😕</span>${esc(errorText(err))}<br />Über die Links unten könnt ihr direkt im Netz weitersuchen.`);
  }
}

function errorText(err) {
  switch (err?.code) {
    case "not_granted": return "Claude darf auf dieser Seite gerade nicht antworten (Freigabe abgelehnt).";
    case "rate_limited": return "Gerade zu viele Anfragen – bitte in einer Minute nochmal versuchen.";
    case "aborted": return "Suche abgebrochen.";
    default: return insp.provider === "claude" ? "Claude konnte gerade keine Ideen liefern." : "Die Rezept-Datenbank ist gerade nicht erreichbar.";
  }
}

/* ---------- Detail ---------- */
$("#insp-results").addEventListener("click", async (e) => {
  const card = e.target.closest(".idea-card");
  if (!card) return;
  const k = +card.dataset.i;
  let idea = insp.ideas[k];
  if (idea.lazy || (insp.provider === "mealdb" && !idea.translated)) {
    if (card.dataset.loading) return;
    card.dataset.loading = "1";
    card.style.opacity = ".6";
    try {
      if (idea.lazy) idea = await mealdbLookup(idea.id);
      idea = insp.ideas[k] = await translateIdea(idea);
    } catch {
      return toast("Rezept konnte nicht geladen werden 😕");
    } finally {
      card.style.opacity = "";
      delete card.dataset.loading;
    }
  }
  openIdea(idea);
});

let currentIdea = null;
function openIdea(idea) {
  currentIdea = idea;
  const cat = catById(idea.category);
  const hero = idea.image ? `<img src="${esc(idea.image)}" alt="${esc(idea.title)}" />` : esc(idea.emoji || cat.emoji);
  $("#idea-content").innerHTML = `
    <div class="hero ${idea.image ? "" : phClass({ title: idea.title })}">
      ${hero}
      <div class="hero-actions"><button class="icon-btn" data-close aria-label="Schließen">✕</button></div>
    </div>
    <div class="detail-body">
      <h2 class="detail-title">${esc(idea.title)}</h2>
      <div class="meta-chips">
        <span class="meta-chip">${cat.emoji} ${esc(cat.label)}</span>
        ${idea.time ? `<span class="meta-chip">⏱️ ${idea.time} Min.</span>` : ""}
        ${idea.servings ? `<span class="meta-chip">👥 ${idea.servings} Portionen</span>` : ""}
        ${idea.tags.map((t) => tagById(t)).filter(Boolean).map((t) => `<span class="meta-chip tag-chip">${t.emoji} ${esc(t.label)}</span>`).join("")}
      </div>
      ${idea.summary ? `<p class="idea-summary">${esc(idea.summary)}</p>` : ""}
      <div class="detail-grid">
        <section class="card">
          <h3>Zutaten</h3>
          <ul class="simple-ing">${idea.ingredients.map((i) => `<li><span class="ing-amt">${esc([i.amount == null ? "" : formatAmount(i.amount, i.unit), i.unit].filter(Boolean).join(" "))}</span><span>${esc(i.name)}</span></li>`).join("")}</ul>
        </section>
        <section class="card">
          <h3>Zubereitung</h3>
          <ol class="step-list">${idea.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        </section>
      </div>
      ${idea.tips.length ? `<section class="card tips-card"><h3>Tipps &amp; Hinweise</h3><ul>${idea.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
      <div class="idea-actions">
        <button class="btn btn-primary" data-action="import">📥 Zu unseren Rezepten</button>
        ${idea.source ? `<a class="btn btn-soft" href="${esc(idea.source.url)}" target="_blank" rel="noopener">${esc(idea.source.label)} ↗</a>` : ""}
      </div>
      <p class="origin-note">${esc(idea.origin)}</p>
    </div>`;
  openModal($("#idea-modal"));
}

$("#idea-content").addEventListener("click", (e) => {
  if (e.target.closest('[data-action="import"]')) {
    const i = currentIdea;
    closeModal($("#idea-modal"));
    openEditor({
      title: i.title, type: "kochen", category: i.category, tags: i.tags,
      servings: i.servings || 4, time: i.time || null, image: i.image || null,
      ingredients: i.ingredients, steps: i.steps,
      tips: [...i.tips, ...(i.source ? [`Quelle: ${i.source.url}`] : [])],
    }, { draft: true });
  }
  if (e.target.closest("li") && e.target.closest(".step-list")) e.target.closest("li").classList.toggle("done");
});

/* ================= Quelle 1: Claude ================= */
const CAT_IDS = CATEGORIES.map((c) => c.id);
const TAG_IDS = TAGS.map((t) => t.id);

async function claudeIdeas(q, tags, random, signal) {
  const month = new Date().toLocaleDateString("de-DE", { month: "long" });
  const tagText = tags.length ? tags.map((t) => tagById(t).label).join(", ") : "keine";
  const prompt = `Du bist eine kreative Kochberaterin für ein Paar, das gern zu Hause kocht. Schlage 6 abwechslungsreiche, alltagstaugliche Rezeptideen auf Deutsch vor.

Wunsch / Suchbegriff: ${q && !random ? `"${q}"` : `keiner – überrasche mit saisonalen Ideen für ${month}`}
Pflicht-Merkmale (JEDES Rezept muss ALLE erfüllen): ${tagText}

Merkmal-IDs und Bedeutung: fruehstueck=Frühstücksgericht, hauptgericht=sättigendes Hauptgericht (Mittag-/Abendessen), haehnchen=enthält Hähnchen, hack=enthält Hackfleisch, vegetarisch=ohne Fleisch und Fisch, pasta=Nudelgericht, reis=mit Reis, kartoffeln=mit Kartoffeln, warm=wird warm gegessen, kalt=wird kalt gegessen.
Kategorie-IDs: ${CAT_IDS.join(", ")}.

Antworte NUR mit einem JSON-Array aus 6 Objekten in genau dieser Form:
{"title": string, "emoji": ein passendes Essens-Emoji, "summary": ein appetitlicher Satz, "time": Minuten als Zahl, "servings": 2, "category": Kategorie-ID, "tags": [alle zutreffenden Merkmal-IDs], "ingredients": [{"amount": Zahl oder null, "unit": "g"|"ml"|"EL"|"TL"|"Stk."|"Zehe"|"Dose"|"Prise"|"Bund"|"", "name": string}], "steps": [3 bis 6 kurze Schritte], "tips": [1 bis 2 Tipps]}
Mengen für 2 Portionen, metrische Einheiten.`;
  const data = await insp.sample.json(prompt, { signal, modelTier: "default", cache: random ? false : undefined });
  const arr = Array.isArray(data) ? data : Array.isArray(data?.ideas) ? data.ideas : [];
  return arr.slice(0, 8).map((d) => ({
    title: String(d.title || "Idee").slice(0, 90),
    emoji: typeof d.emoji === "string" ? [...d.emoji].slice(0, 2).join("") : "",
    summary: String(d.summary || "").slice(0, 220),
    time: Number.isFinite(+d.time) && +d.time > 0 ? Math.round(+d.time) : null,
    servings: Number.isFinite(+d.servings) && +d.servings > 0 ? Math.round(+d.servings) : 2,
    category: CAT_IDS.includes(d.category) ? d.category : "haupt",
    tags: Array.isArray(d.tags) ? TAG_IDS.filter((id) => d.tags.includes(id)) : [],
    ingredients: (Array.isArray(d.ingredients) ? d.ingredients : []).map((i) => ({
      amount: Number.isFinite(+i?.amount) && i?.amount !== null && i?.amount !== "" ? +i.amount : null,
      unit: String(i?.unit || "").slice(0, 12), name: String(i?.name || "").slice(0, 80),
    })).filter((i) => i.name),
    steps: (Array.isArray(d.steps) ? d.steps : []).map(String).filter(Boolean),
    tips: (Array.isArray(d.tips) ? d.tips : []).map(String).filter(Boolean),
    image: null, source: null,
    origin: "Vorschlag von Claude – Mengen und Zeiten vor dem Kochen kurz prüfen.",
  })).filter((i) => i.ingredients.length && i.steps.length);
}

/* ================= Quelle 2: TheMealDB ================= */
const MEALDB = "https://www.themealdb.com/api/json/v1/1/";
const mealdb = async (path) => {
  const res = await fetch(MEALDB + path);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return (await res.json()).meals || [];
};

// Merkmale → Datenbank-Abfrage (warm/kalt werden anhand des Gerichts geschätzt)
const MAIN_CATS = ["Beef", "Chicken", "Lamb", "Pork", "Seafood", "Pasta", "Vegetarian", "Vegan", "Goat", "Miscellaneous"];
const TAG_QUERY = {
  fruehstueck: "filter.php?c=Breakfast",
  hauptgericht: MAIN_CATS.map((c) => "filter.php?c=" + c), // mehrere Kategorien → Vereinigung
  haehnchen: "filter.php?c=Chicken", hack: "filter.php?i=Minced_Beef", vegetarisch: "filter.php?c=Vegetarian",
  pasta: "filter.php?c=Pasta", reis: "filter.php?i=Rice", kartoffeln: "filter.php?i=Potatoes",
};
const COLD = /salad|gazpacho|ceviche|cold|sushi|tartare|carpaccio|slaw|ice cream|sorbet|overnight|smoothie|cheesecake|mousse|tiramisu|trifle|parfait|summer rolls|poke/i;

// kleine Übersetzungshilfe für Suchbegriffe (DB ist englisch)
const DE_EN = {
  "hähnchen": "chicken", "huhn": "chicken", "hühnchen": "chicken", "rind": "beef", "rindfleisch": "beef", "hack": "beef", "hackfleisch": "beef",
  "schwein": "pork", "lamm": "lamb", "lachs": "salmon", "fisch": "fish", "garnelen": "prawn", "thunfisch": "tuna",
  "nudeln": "pasta", "spaghetti": "spaghetti", "lasagne": "lasagne", "reis": "rice", "kartoffel": "potato", "kartoffeln": "potato",
  "suppe": "soup", "eintopf": "stew", "salat": "salad", "auflauf": "bake", "kürbis": "pumpkin", "curry": "curry", "pfannkuchen": "pancake",
  "kuchen": "cake", "torte": "tart", "brot": "bread", "käse": "cheese", "pilze": "mushroom", "champignons": "mushroom", "spinat": "spinach",
  "tomate": "tomato", "tomaten": "tomato", "ei": "egg", "eier": "egg", "bohnen": "bean", "linsen": "lentil", "kichererbsen": "chickpea",
  "burger": "burger", "pizza": "pizza", "tacos": "taco", "wok": "stir fry", "gemüse": "vegetable", "dessert": "dessert", "schokolade": "chocolate",
  "apfel": "apple", "zucchini": "courgette", "aubergine": "aubergine", "paprika": "pepper", "lauch": "leek", "frühstück": "breakfast",
};
const toEnglish = (q) => q.toLowerCase().split(/\s+/).map((w) => DE_EN[w] || w).join(" ");

function warmColdOk(name, tags) {
  const cold = COLD.test(name);
  if (tags.includes("kalt") && !cold) return false;
  if (tags.includes("warm") && cold) return false;
  return true;
}

async function mealdbIdeas(q, tags, random) {
  const query = (q) => (Array.isArray(q) ? Promise.all(q.map(mealdb)).then((l) => l.flat()) : mealdb(q));
  const lists = await Promise.all(tags.filter((t) => TAG_QUERY[t]).map((t) => query(TAG_QUERY[t])));
  let pool = null; // Map id -> meal (kurz oder vollständig)
  const intersect = (meals) => {
    const m = new Map(meals.map((x) => [x.idMeal, x]));
    pool = pool ? new Map([...pool].filter(([id]) => m.has(id)).map(([id, v]) => [id, m.get(id).strInstructions ? m.get(id) : v])) : m;
  };
  lists.forEach(intersect);

  if (q && !random) {
    const en = toEnglish(q);
    let found = await mealdb("search.php?s=" + encodeURIComponent(en));
    if (!found.length) found = await mealdb("filter.php?i=" + encodeURIComponent(en.replace(/\s+/g, "_")));
    if (!found.length && en.includes(" ")) found = await mealdb("search.php?s=" + encodeURIComponent(en.split(" ")[0]));
    intersect(found);
  }

  if (!pool) {
    // keine Suche, keine Datenbank-Filter → Zufallsideen
    const r = await Promise.all(Array.from({ length: 10 }, () => mealdb("random.php").catch(() => [])));
    pool = new Map(r.flat().map((x) => [x.idMeal, x]));
  }

  let meals = [...pool.values()].filter((m) => warmColdOk(m.strMeal, tags));
  if (random || !q) meals.sort(() => Math.random() - 0.5);
  return meals.slice(0, 12).map((m) => (m.strInstructions ? mealToIdea(m) : {
    id: m.idMeal, lazy: true, title: m.strMeal, image: m.strMealThumb, summary: "",
    tags: [...new Set([...tags.filter((t) => t !== "warm" && t !== "kalt"), COLD.test(m.strMeal) ? "kalt" : "warm"])],
    category: "haupt",
  }));
}

async function mealdbLookup(id) {
  const [m] = await mealdb("lookup.php?i=" + encodeURIComponent(id));
  if (!m) throw new Error("not found");
  return mealToIdea(m);
}

const UNI_FRAC = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3" };
function parseMeasure(measure) {
  let s = String(measure || "").trim().replace(/[½¼¾⅓⅔]/g, (c) => " " + UNI_FRAC[c]).replace(/\s+/g, " ").trim();
  const m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { amount: null, unit: "", note: s };
  return { amount: parseAmount(m[1]), unit: m[2].slice(0, 14), note: "" };
}

const CAT_MAP = { Pasta: "pasta", Breakfast: "fruehstueck", Dessert: "dessert", Starter: "snack", Side: "snack" };
function mealToIdea(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m["strIngredient" + i] || "").trim();
    if (!name) continue;
    const { amount, unit, note } = parseMeasure(m["strMeasure" + i]);
    ingredients.push({ amount, unit: unit || note, name }); // Einheit/Hinweis noch englisch → translateIdea
  }
  const all = ingredients.map((i) => i.name.toLowerCase()).join(" | ");
  const tags = [];
  if (m.strCategory === "Chicken" || /chicken/.test(all)) tags.push("haehnchen");
  if (/minced beef|ground beef|mince|minced/.test(all)) tags.push("hack");
  if (["Vegetarian", "Vegan"].includes(m.strCategory)) tags.push("vegetarisch");
  if (m.strCategory === "Pasta" || /spaghetti|penne|pasta|linguine|fusilli|tagliatelle|macaroni|lasagne/.test(all)) tags.push("pasta");
  if (/\brice\b/.test(all)) tags.push("reis");
  if (/potato/.test(all)) tags.push("kartoffeln");
  tags.push(COLD.test(m.strMeal) ? "kalt" : "warm");
  if (m.strCategory === "Breakfast") tags.push("fruehstueck");
  if (MAIN_CATS.includes(m.strCategory)) tags.push("hauptgericht");
  const steps = String(m.strInstructions || "").split(/\r?\n+/).map((s) => s.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, "").trim()).filter((s) => s.length > 3);
  const url = m.strSource || `https://www.themealdb.com/meal/${m.idMeal}`;
  return {
    id: m.idMeal, title: m.strMeal, image: m.strMealThumb, emoji: "",
    meta: { area: m.strArea, cat: m.strCategory },
    summary: [m.strArea, m.strCategory].filter(Boolean).join(" · "),
    time: null, servings: null,
    category: CAT_MAP[m.strCategory] || (/soup/i.test(m.strMeal) ? "suppe" : /salad/i.test(m.strMeal) ? "salat" : "haupt"),
    tags: TAG_IDS.filter((t) => tags.includes(t)),
    ingredients, steps, tips: [],
    source: { label: m.strSource ? "Originalrezept" : "Bei TheMealDB", url },
    origin: "Aus der freien Rezept-Datenbank TheMealDB.",
  };
}

/* ================= Start ================= */
(async function initInspiration() {
  renderInspFilter();
  moreLinks("");
  const welcome = `<span class="big">✨</span>Sucht nach etwas, wählt Filter – oder lasst euch mit 🎲 überraschen.`;
  setStatus(welcome);
  const inViewer = !!window.claude?.use;
  if (inViewer) {
    try { insp.sample = await window.claude.use("sample"); } catch { insp.sample = null; }
  }
  // Im claude.ai-Viewer sind fremde Websites gesperrt → ohne Claude bleibt nur „Weitersuchen“
  insp.provider = insp.sample ? "claude" : inViewer ? "none" : "mealdb";
  if (insp.provider === "none") {
    $("#insp-source").textContent = "Rezeptideen zum Weitersuchen im Netz";
    setStatus(`<span class="big">🔗</span>Die Ideen-Suche ist in dieser Ansicht nicht verfügbar.<br />Gebt oben einen Begriff ein und nutzt die Links zu Chefkoch und Google unten.`);
    return;
  }
  $("#insp-source").textContent = insp.provider === "claude"
    ? "Rezeptideen von Claude – plus Links zum Weitersuchen im Netz"
    : "Rezeptideen aus dem Internet, automatisch auf Deutsch – plus Chefkoch & Google";
  if (insp.provider === "claude") {
    if (!insp.started) setStatus(welcome);
  } else {
    // Datenbank kostet nichts → beim ersten Öffnen des Tabs direkt Zufallsideen zeigen
    const tab = document.querySelector('.tab[data-tab="inspiration"]');
    const autoload = () => { if (!insp.started) runSearch({ random: true }); };
    if (tab.classList.contains("is-active")) autoload(); else { setStatus(welcome); tab.addEventListener("click", autoload, { once: true }); }
  }
})();
