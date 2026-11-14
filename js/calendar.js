/* ================= Kalender: geplante Mahlzeiten der nächsten 7 Tage =================
 * Eintrag: { id, date: "YYYY-MM-DD", recipeId, recipeTitle, servings, createdAt }
 */
const Plan = (() => {
  let entries = [];
  let lastSig = "";
  const DAYS = 7;

  /* ---------- Datum ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function days() {
    const out = [], t = new Date();
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i);
      out.push({ key: ymd(d), date: d, offset: i });
    }
    return out;
  }
  function dayLabel(day) {
    const wd = day.date.toLocaleDateString("de-DE", { weekday: "long" });
    const dm = day.date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }) ;
    return { main: day.offset === 0 ? "Heute" : day.offset === 1 ? "Morgen" : wd, sub: day.offset < 2 ? `${wd}, ${dm}` : dm };
  }
  const labelForKey = (key) => {
    const d = days().find((x) => x.key === key);
    if (d) return dayLabel(d).main;
    const [y, m, dd] = key.split("-").map(Number);
    return new Date(y, m - 1, dd).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "numeric" });
  };
  const recipeOf = (e) => state.recipes.find((r) => r.id === e.recipeId);

  /* ---------- Laden & Speichern ---------- */
  const signature = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1)).map((o) => JSON.stringify(o, Object.keys(o).sort())).join("\n");
  async function load() {
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

  /* ---------- Wochenansicht ---------- */
  function mealThumb(r, cls = "plan-thumb") {
    if (r?.image) return `<span class="${cls}"><img src="${esc(r.image)}" alt="" loading="lazy" width="48" height="48" /></span>`;
    return `<span class="${cls} ${r ? phClass(r) : "ph-0"}">${r ? recipeEmoji(r) : "🍽️"}</span>`;
  }
  function render() {
    const y = window.scrollY;
    const ds = days(), keys = new Set(ds.map((d) => d.key));
    const upcoming = entries.filter((e) => keys.has(e.date));
    $("#plan-count").textContent = upcoming.length
      ? `${upcoming.length} ${upcoming.length === 1 ? "Mahlzeit" : "Mahlzeiten"} in den nächsten 7 Tagen geplant`
      : "Noch nichts geplant – worauf habt ihr diese Woche Lust?";
    $("#week").innerHTML = ds.map((d) => {
      const l = dayLabel(d);
      const meals = entries.filter((e) => e.date === d.key).sort((a, b) => a.createdAt - b.createdAt);
      return `<section class="day ${d.offset === 0 ? "is-today" : ""}" data-date="${d.key}">
        <header class="day-head"><strong>${esc(l.main)}</strong><span>${esc(l.sub)}</span></header>
        <ul class="day-meals">${meals.map((e) => {
          const r = recipeOf(e);
          return `<li><button type="button" class="meal" data-id="${e.id}">
            ${mealThumb(r)}
            <span class="meal-text"><span class="meal-title">${esc(r?.title || e.recipeTitle)}</span>
            <span class="meal-sub">${r ? `👥 ${e.servings} ${e.servings === 1 ? "Portion" : "Portionen"}` : "Rezept wurde gelöscht"}</span></span>
            <span class="bar-chevron" aria-hidden="true">›</span>
          </button></li>`;
        }).join("")}</ul>
        <button type="button" class="day-add" data-date="${d.key}">＋ Mahlzeit</button>
      </section>`;
    }).join("");
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }

  $("#week").addEventListener("click", (e) => {
    const add = e.target.closest(".day-add");
    if (add) return openPicker(add.dataset.date);
    const meal = e.target.closest(".meal");
    if (meal) openMeal(meal.dataset.id);
  });

  async function addEntry(date, recipe) {
    const entry = { id: uid(), date, recipeId: recipe.id, recipeTitle: recipe.title, servings: recipe.servings || 2, createdAt: Date.now() };
    entries.push(entry);
    render();
    toast(`${recipeEmoji(recipe)} ${recipe.title} → ${labelForKey(date)}`);
    await save([entry]);
  }

  /* ---------- Rezept wählen (aus dem Kalender) ---------- */
  let pickDate = null;
  function openPicker(date) {
    pickDate = date;
    $("#plan-pick-title").textContent = `Rezept für ${labelForKey(date)}`;
    $("#plan-pick-search").value = "";
    renderPicker();
    openModal($("#plan-pick-modal"));
  }
  function renderPicker() {
    const q = $("#plan-pick-search").value.trim().toLowerCase();
    const list = [...state.recipes]
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
      .sort((a, b) => a.title.localeCompare(b.title, "de"));
    $("#plan-pick-list").innerHTML = list.length ? list.map((r) => `<li><button type="button" class="pick-item" data-id="${r.id}">
        ${mealThumb(r)}
        <span class="meal-text"><span class="meal-title">${esc(r.title)}</span>
        <span class="meal-sub">${TYPES[r.type].emoji} ${TYPES[r.type].label}${r.time ? ` · ⏱️ ${r.time} Min.` : ""}</span></span>
        <span class="pick-plus" aria-hidden="true">＋</span>
      </button></li>`).join("")
      : `<li class="muted pick-empty">${state.recipes.length ? "Kein Rezept gefunden." : "Ihr habt noch keine Rezepte gespeichert."}</li>`;
  }
  $("#plan-pick-search").addEventListener("input", renderPicker);
  $("#plan-pick-list").addEventListener("click", async (e) => {
    const b = e.target.closest(".pick-item");
    if (!b) return;
    const r = state.recipes.find((x) => x.id === b.dataset.id);
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
    const others = days().map((d) => `<option value="${d.key}" ${d.key === e.date ? "selected" : ""}>${esc(dayLabel(d).main)} · ${esc(d.date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }))}</option>`).join("");
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
