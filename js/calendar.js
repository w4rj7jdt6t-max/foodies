/* ================= Kalender: geplante Mahlzeiten der nächsten 7 Tage =================
 * Eintrag: { id, date: "YYYY-MM-DD", recipeId, recipeTitle, servings, createdAt }
 */
const Plan = (() => {
  let entries = [];
  let lastSig = "";
  const DAYS = 7;

  /* ---------- Datum ----------
   * Sichtbar: aktuelle Kalenderwoche (Mo–So) + die nächste Kalenderwoche.
   * Vergangene Tage werden grau gezeigt, planen kann man ab heute. */
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function range() {
    const t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const out = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const offset = Math.round((d - today) / 86400000);
      out.push({ key: ymd(d), date: d, offset, past: offset < 0 });
    }
    return out;
  }
  const days = () => range().filter((d) => !d.past); // planbare Tage
  function isoWeek(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
    return Math.ceil(((x - new Date(Date.UTC(x.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  }
  function dayLabel(day) {
    const wd = day.date.toLocaleDateString("de-DE", { weekday: "long" });
    const dm = day.date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
    return { main: day.offset === 0 ? "Heute" : day.offset === 1 ? "Morgen" : wd, sub: day.offset === 0 || day.offset === 1 ? `${wd}, ${dm}` : dm };
  }
  const longDate = (d) => d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const labelForKey = (key) => {
    const d = range().find((x) => x.key === key);
    if (d) return dayLabel(d).main;
    const [y, m, dd] = key.split("-").map(Number);
    return new Date(y, m - 1, dd).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "numeric" });
  };
  // Rezept eines Eintrags: aus diesem Haushalt, aus einem anderen eigenen Haushalt oder die gespeicherte Kopie
  let others = []; // Rezepte aus meinen ANDEREN Haushalten: [{ ...rezept, _from: "Name" }]
  const recipeOf = (e) => state.recipes.find((r) => r.id === e.recipeId) || others.find((r) => r.id === e.recipeId) || (e.snapshot ? { ...e.snapshot, id: e.recipeId } : null);
  const isOwn = (e) => state.recipes.some((r) => r.id === e.recipeId);

  async function loadOthers() {
    const mine = typeof Household !== "undefined" ? Household.mine : [];
    const cur = Store.households.current;
    const ids = mine.map((h) => h.id).filter((id) => id !== cur);
    if (!ids.length) { others = []; return; }
    try {
      const list = await Store.households.recipesOf(ids);
      const names = Object.fromEntries(mine.map((h) => [h.id, h.name]));
      others = list.map((x) => ({ ...normalize(x.data), _from: names[x.household_id] || "anderer Haushalt" }));
    } catch (err) { console.error(err); others = []; }
  }
  let selected = null; // ausgewählter Tag im Kalender

  /* ---------- Laden & Speichern ---------- */
  const signature = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1)).map((o) => JSON.stringify(o, Object.keys(o).sort())).join("\n");
  async function load() {
    loadOthers().then(() => render());
    try {
      const all = await Store.plan.all();
      $("#plan-setup").hidden = true;
      const sig = signature(all);
      if (sig === lastSig && $("#week").childElementCount) return;
      lastSig = sig;
      entries = all;
    } catch (err) {
      console.error(err);
      entries = [];
      if (err?.missingTable) $("#plan-setup").hidden = false;
    }
    render();
  }
  const syncSig = () => { lastSig = signature(entries); };
  async function save(list) {
    syncSig();
    try { await Store.plan.putMany(list); }
    catch (err) { console.error(err); toast(err?.missingTable ? "Der Kalender ist noch nicht eingerichtet" : "Speichern fehlgeschlagen 😕"); }
  }
  async function drop(ids) {
    syncSig();
    try { await Store.plan.removeMany(ids); }
    catch (err) { console.error(err); toast("Löschen fehlgeschlagen 😕"); }
  }

  /* ---------- Kalenderansicht ---------- */
  function mealThumb(r, cls = "plan-thumb") {
    if (r?.image) return `<span class="${cls}"><img src="${esc(r.image)}" alt="" loading="lazy" width="48" height="48" /></span>`;
    return `<span class="${cls} ${r ? phClass(r) : "ph-0"}">${r ? recipeEmoji(r) : "🍽️"}</span>`;
  }
  const mealsOn = (key) => entries.filter((e) => e.date === key).sort((a, b) => a.createdAt - b.createdAt);

  function mealListHTML(key, { canAdd = true } = {}) {
    const meals = mealsOn(key);
    return `<ul class="day-meals">${meals.map((e) => {
        const r = recipeOf(e);
        return `<li><button type="button" class="meal" data-id="${e.id}">
          ${mealThumb(r)}
          <span class="meal-text"><span class="meal-title">${esc(r?.title || e.recipeTitle)}</span>
          <span class="meal-sub">${r ? `👥 ${e.servings} ${e.servings === 1 ? "Portion" : "Portionen"}${!isOwn(e) && e.fromHousehold ? ` · aus „${esc(e.fromHousehold)}“` : ""}` : "Rezept wurde gelöscht"}</span></span>
          <span class="bar-chevron" aria-hidden="true">›</span>
        </button></li>`;
      }).join("")}</ul>
      ${!meals.length && !canAdd ? `<p class="muted day-none">An diesem Tag war nichts geplant.</p>` : ""}
      ${canAdd ? `<button type="button" class="day-add" data-date="${key}">＋ Mahlzeit</button>` : ""}`;
  }

  function render() {
    const y = window.scrollY;
    const all = range(), today = all.find((d) => d.offset === 0);
    const upcoming = entries.filter((e) => days().some((d) => d.key === e.date));
    $("#plan-count").textContent = upcoming.length
      ? `${upcoming.length} ${upcoming.length === 1 ? "Mahlzeit" : "Mahlzeiten"} geplant`
      : "Noch nichts geplant – worauf habt ihr Lust?";

    const weeks = [all.slice(0, 7), all.slice(7)];
    const cell = (d) => {
      const meals = mealsOn(d.key);
      const firstOfMonth = d.date.getDate() === 1;
      const num = firstOfMonth || d === all[0] ? d.date.toLocaleDateString("de-DE", { day: "numeric", month: "short" }).replace(".", "") : d.date.getDate();
      return `<button type="button" class="cal-cell ${d.past ? "is-past" : ""} ${d.offset === 0 ? "is-today" : ""} ${d.key === selected ? "is-selected" : ""}"
          data-date="${d.key}" aria-label="${esc(longDate(d.date))}${meals.length ? `, ${meals.length} geplant` : ""}" aria-pressed="${d.key === selected}">
        <span class="cal-num">${esc(String(num))}</span>
        <span class="cal-meals">${meals.slice(0, 3).map((e) => {
          const r = recipeOf(e);
          return `<span class="cal-meal"><span class="cal-meal-emoji">${r ? recipeEmoji(r) : "🍽️"}</span><span class="cal-meal-title">${esc(r?.title || e.recipeTitle)}</span></span>`;
        }).join("")}${meals.length > 3 ? `<span class="cal-more">+${meals.length - 3}</span>` : ""}</span>
      </button>`;
    };

    $("#week").innerHTML = `
      <section class="day today-card is-today" data-date="${today.key}">
        <header class="day-head"><strong>Heute</strong><span>${esc(longDate(today.date))}</span></header>
        ${mealListHTML(today.key)}
      </section>

      <div class="cal" role="grid" aria-label="Kalender">
        <div class="cal-weekdays" aria-hidden="true">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w, i) => `<span class="${i > 4 ? "is-weekend" : ""}">${w}</span>`).join("")}</div>
        ${weeks.map((w, i) => `
          <div class="cal-kw">KW ${isoWeek(w[0].date)} · ${i === 0 ? "diese Woche" : "nächste Woche"}</div>
          <div class="cal-row" role="row">${w.map(cell).join("")}</div>`).join("")}
      </div>

      <p class="cal-hint muted">Tippe auf einen Tag, um ein Rezept einzuplanen.</p>`;
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }

  $("#week").addEventListener("click", (e) => {
    const add = e.target.closest(".day-add");
    if (add) return openPicker(add.dataset.date);
    const meal = e.target.closest(".meal");
    if (meal) return openMeal(meal.dataset.id);
    const c = e.target.closest(".cal-cell");
    if (c) openPicker(c.dataset.date); // Tag antippen → direkt für diesen Tag planen
  });

  async function addEntry(date, recipe) {
    const entry = { id: uid(), date, recipeId: recipe.id, recipeTitle: recipe.title, servings: recipe.servings || 2, createdAt: Date.now() };
    // Rezept aus einem anderen Haushalt → Kopie mitspeichern, damit die Mitglieder HIER es sehen
    // (ohne Zugriff auf den anderen Haushalt zu bekommen)
    if (!state.recipes.some((r) => r.id === recipe.id)) {
      const { _from, imagePath, imageAuto, imageCredit, autoImageCheckedAt, ...snap } = recipe;
      entry.snapshot = snap;
      entry.fromHousehold = _from || "";
    }
    entries.push(entry);
    selected = date;
    render();
    toast(`${recipeEmoji(recipe)} ${recipe.title} → ${labelForKey(date)}`);
    await save([entry]);
  }

  /* ---------- Rezept wählen (aus dem Kalender) ---------- */
  let pickDate = null;
  function openPicker(date) {
    pickDate = date;
    selected = date;
    const d = range().find((x) => x.key === date);
    const past = d ? d.past : false;
    const nice = d ? d.date.toLocaleDateString("de-DE", { day: "numeric", month: "long" }) : "";
    $("#plan-pick-title").textContent = d ? `${dayLabel(d).main}, ${nice}` : labelForKey(date);
    const meals = mealsOn(date);
    $("#plan-pick-planned").innerHTML = meals.length || past ? `
      <h3 class="pick-h">${past ? "Das gab es" : "Schon geplant"}</h3>
      ${mealListHTML(date, { canAdd: false })}` : "";
    $("#plan-pick-add").hidden = past;
    $("#plan-pick-search").value = "";
    renderPicker();
    render();
    openModal($("#plan-pick-modal"));
  }
  $("#plan-pick-modal").addEventListener("close", () => { selected = null; render(); });
  $("#plan-pick-planned").addEventListener("click", (e) => {
    const meal = e.target.closest(".meal");
    if (!meal) return;
    closeModal($("#plan-pick-modal"));
    openMeal(meal.dataset.id);
  });
  function renderPicker() {
    const q = $("#plan-pick-search").value.trim().toLowerCase();
    const match = (r) => !q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q));
    const sort = (a, b) => a.title.localeCompare(b.title, "de");
    const item = (r, src) => `<li><button type="button" class="pick-item" data-id="${r.id}" data-src="${src}">
        ${mealThumb(r)}
        <span class="meal-text"><span class="meal-title">${esc(r.title)}</span>
        <span class="meal-sub">${TYPES[r.type]?.emoji || ""} ${TYPES[r.type]?.label || ""}${r.time ? ` · ⏱️ ${r.time} Min.` : ""}</span></span>
        <span class="pick-plus" aria-hidden="true">＋</span>
      </button></li>`;
    const own = state.recipes.filter(match).sort(sort);
    // Rezepte aus meinen anderen Haushalten, gruppiert
    const groups = {};
    others.filter(match).sort(sort).forEach((r) => (groups[r._from] = groups[r._from] || []).push(r));
    const curName = typeof Household !== "undefined" && Household.current ? Household.current.name : "";
    const hasOthers = Object.keys(groups).length > 0;
    $("#plan-pick-list").innerHTML =
      (hasOthers ? `<li class="pick-group">🏡 ${esc(curName || "Dieser Haushalt")}</li>` : "") +
      (own.length ? own.map((r) => item(r, "own")).join("") : `<li class="muted pick-empty">${state.recipes.length ? "Kein Rezept gefunden." : "In diesem Haushalt gibt es noch keine Rezepte."}</li>`) +
      Object.entries(groups).map(([name, list]) => `<li class="pick-group">🏡 Aus „${esc(name)}“ <small>– wird als Kopie eingeplant</small></li>` + list.map((r) => item(r, "other")).join("")).join("");
  }
  $("#plan-pick-search").addEventListener("input", renderPicker);
  $("#plan-pick-list").addEventListener("click", async (e) => {
    const b = e.target.closest(".pick-item");
    if (!b) return;
    const r = (b.dataset.src === "other" ? others : state.recipes).find((x) => x.id === b.dataset.id);
    closeModal($("#plan-pick-modal"));
    await addEntry(pickDate, r);
  });

  /* ---------- Tag wählen (aus dem Rezept) ---------- */
  let dayRecipe = null;
  function openDayPicker(recipe) {
    dayRecipe = recipe;
    $("#plan-day-sub").textContent = `${recipe.title} einplanen für …`;
    $("#plan-day-list").innerHTML = days().map((d) => {
      const l = dayLabel(d), meals = entries.filter((e) => e.date === d.key);
      const already = meals.some((e) => e.recipeId === recipe.id);
      return `<li><button type="button" class="day-pick-btn ${already ? "has-it" : ""}" data-date="${d.key}">
        <span class="dp-main">${esc(l.main)}</span><span class="dp-sub">${esc(l.sub)}</span>
        <span class="dp-meals">${already ? "✓ schon geplant" : meals.length ? meals.map((e) => esc(recipeOf(e)?.title || e.recipeTitle)).join(", ") : "noch frei"}</span>
      </button></li>`;
    }).join("");
    openModal($("#plan-day-modal"));
  }
  $("#plan-day-list").addEventListener("click", async (e) => {
    const b = e.target.closest(".day-pick-btn");
    if (!b) return;
    closeModal($("#plan-day-modal"));
    await addEntry(b.dataset.date, dayRecipe);
  });

  /* ---------- Geplante Mahlzeit: nur Zutaten ---------- */
  let current = null;
  function openMeal(id) {
    current = entries.find((e) => e.id === id);
    if (!current) return;
    renderMeal();
    openModal($("#plan-meal-modal"));
  }
  function renderMeal() {
    const e = current, r = recipeOf(e);
    const opts = days();
    if (!opts.some((d) => d.key === e.date)) { const [yy, mm, dd] = e.date.split("-").map(Number); opts.unshift({ key: e.date, date: new Date(yy, mm - 1, dd), offset: -1 }); }
    const others = opts.map((d) => `<option value="${d.key}" ${d.key === e.date ? "selected" : ""}>${esc(d.offset < 0 ? d.date.toLocaleDateString("de-DE", { weekday: "long" }) : dayLabel(d).main)} · ${esc(d.date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }))}</option>`).join("");
    const factor = r ? e.servings / r.servings : 1;
    $("#plan-meal-content").innerHTML = `
      <div class="modal-top">
        <div class="meal-head">
          ${mealThumb(r, "plan-thumb big")}
          <div><p class="meal-date">${esc(labelForKey(e.date))}</p><h2>${esc(r?.title || e.recipeTitle)}</h2></div>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Schließen">✕</button>
      </div>
      <div class="pick-body">
        ${r ? `
        <button type="button" class="btn btn-soft to-recipe" data-pact="recipe">📖 Zum Rezept</button>
        <section class="card">
          <h3>Zutaten</h3>
          <div class="servings">
            <span class="servings-label">Für</span>
            <div class="stepper">
              <button data-pact="minus" aria-label="Weniger Portionen" ${e.servings <= 1 ? "disabled" : ""}>−</button>
              <output>${e.servings} ${e.servings === 1 ? "Portion" : "Portionen"}</output>
              <button data-pact="plus" aria-label="Mehr Portionen" ${e.servings >= 50 ? "disabled" : ""}>+</button>
            </div>
          </div>
          <ul class="ing-list">${r.ingredients.map((i, idx) => {
            const amt = i.amount == null ? "" : formatAmount(i.amount * factor, i.unit);
            const on = !!Shop.onList(r.id, idx);
            return `<li><span class="ing-amt">${esc([amt, i.unit].filter(Boolean).join(" "))}</span><span class="ing-name">${esc(i.name)}</span>
              <button type="button" class="ing-cart ${on ? "is-on" : ""}" data-idx="${idx}" aria-pressed="${on}" aria-label="${esc(i.name)} auf die Einkaufsliste">🛒</button></li>`;
          }).join("") || `<li class="muted">Keine Zutaten hinterlegt.</li>`}</ul>
          ${r.ingredients.length ? `<button type="button" class="btn btn-soft add-all-btn" data-pact="all">🛒 Alle auf die Einkaufsliste</button>` : ""}
        </section>` : `<p class="muted">Dieses Rezept wurde gelöscht.</p>`}
        <div class="meal-manage">
          <label class="field"><span>Verschieben auf</span><select data-pact="move">${others}</select></label>
          <button type="button" class="btn btn-ghost meal-remove" data-pact="remove">Aus dem Kalender entfernen</button>
        </div>
      </div>`;
  }

  $("#plan-meal-content").addEventListener("click", async (ev) => {
    const act = ev.target.closest("[data-pact]")?.dataset.pact;
    const e = current, r = recipeOf(e);
    if (act === "minus" || act === "plus") {
      e.servings = Math.max(1, Math.min(50, e.servings + (act === "plus" ? 1 : -1)));
      renderMeal();
      render();
      return save([e]);
    }
    if (act === "recipe") {
      closeModal($("#plan-meal-modal"));
      // zum Tab „Rezepte“ wechseln und das Rezept mit der geplanten Portionenzahl öffnen
      if (!isOwn(e)) {
        // Rezept aus einem anderen Haushalt bzw. Kopie → nur ansehen (mit Übernehmen-Möglichkeit)
        openRecipeReadOnly(r, e.fromHousehold || (others.find((x) => x.id === r.id)?._from) || "");
        if (e.servings !== r.servings) setServings(e.servings);
        return;
      }
      if (state.type !== r.type) { state.type = r.type; state.category = "all"; state.tags.clear(); }
      document.querySelector('.tab[data-tab="rezepte"]').click();
      renderList();
      openDetail(r.id);
      if (e.servings !== r.servings) setServings(e.servings);
      return;
    }
    if (act === "all") {
      await Shop.addAll(r, e.servings / r.servings);
      return renderMeal();
    }
    if (act === "remove") {
      const btn = ev.target.closest("[data-pact]");
      if (!btn.classList.contains("armed")) {
        btn.classList.add("armed");
        btn.textContent = "Wirklich entfernen?";
        setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.textContent = "Aus dem Kalender entfernen"; } }, 3000);
        return;
      }
      entries = entries.filter((x) => x !== e);
      closeModal($("#plan-meal-modal"));
      render();
      toast("Aus dem Kalender entfernt");
      return drop([e.id]);
    }
    const cart = ev.target.closest(".ing-cart");
    if (cart && r) {
      const on = await Shop.toggleIngredient(r, +cart.dataset.idx, e.servings / r.servings);
      cart.classList.toggle("is-on", on);
      cart.setAttribute("aria-pressed", String(on));
    }
  });
  $("#plan-meal-content").addEventListener("change", async (ev) => {
    if (ev.target.dataset.pact !== "move") return;
    current.date = ev.target.value;
    selected = current.date;
    ev.target.blur();
    renderMeal();
    render();
    toast(`Verschoben auf ${labelForKey(current.date)}`);
    await save([current]);
  });

  Store.plan.onChange(() => load());
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Store.cloud && !document.body.classList.contains("locked")) load(); });
  // um Mitternacht / beim Wiederöffnen stimmt „Heute“ wieder
  document.querySelector('.tab[data-tab="kalender"]').addEventListener("click", () => render());

  return { load, render, openDayPicker };
})();
