/* ================= Reste: Was ist da? → passende eigene Rezepte =================
 * Kühlschrank-Inhalt: ein Eintrag { id: "pantry", kind: "pantry", items: [{ name, emoji }] }
 * in der Einkaufslisten-Tabelle (wird zwischen den Geräten abgeglichen).
 */
const Reste = (() => {
  let pantry = []; // [{ name, emoji }]
  const pantryId = () => (Store.households?.current ? `pantry-${Store.households.current}` : "pantry");
  let useStaples = true;
  const rs = { type: "kochen", tags: new Set() };
  try { useStaples = localStorage.getItem("foodies-staples") !== "0"; } catch {}
  $("#rest-staples").checked = useStaples;

  /* ---------- Daten ---------- */
  function onData(extras) {
    // pro Haushalt ein eigener Kühlschrank-Eintrag (älterer Eintrag „pantry“ wird weiter gelesen)
    const doc = extras.find((x) => x.id === pantryId()) || extras.find((x) => x.kind === "pantry");
    pantry = doc?.items || [];
    render();
  }
  let saveTimer;
  function persist() {
    clearTimeout(saveTimer);
    // kurz sammeln, damit schnelles Antippen nicht viele Speichervorgänge auslöst
    saveTimer = setTimeout(() => Shop.putExtra({ id: pantryId(), kind: "pantry", items: pantry, updatedAt: Date.now() }), 400);
  }
  const pantryKeys = () => new Set(pantry.map((p) => ingredientKey(p.name)));
  const has = (name) => pantryKeys().has(ingredientKey(name));

  function addPantry(name, emoji) {
    name = cap(name.trim());
    if (!name || has(name)) return;
    pantry.push({ name, emoji: emoji || categorize(name).emoji });
    render();
    persist();
  }
  function removePantry(name) {
    const k = ingredientKey(name);
    pantry = pantry.filter((p) => ingredientKey(p.name) !== k);
    render();
    persist();
  }

  /* ---------- Suche & Vorschläge ---------- */
  const input = $("#rest-input"), box = $("#rest-suggest");
  let sugg = [], active = -1;
  function renderSuggest() {
    const q = input.value.trim();
    if (!q) { box.hidden = true; renderQuick(); return; }
    sugg = suggestGroceries(q, 6).filter((s) => !has(s.name));
    box.innerHTML = sugg.map((s, k) => `<li class="sugg ${k === active ? "is-active" : ""}" data-k="${k}"><span class="sugg-emoji">${esc(s.emoji)}</span><span class="sugg-name">${esc(s.name)}</span>${s.custom ? `<span class="sugg-star">⭐</span>` : ""}<span class="sugg-cat">${esc(shopCatById(s.cat).label)}</span></li>`).join("")
      + (isKnownGrocery(q) || has(q) ? "" : `<li class="sugg sugg-free" data-free="1"><span class="sugg-emoji">${esc(categorize(q).emoji)}</span><span class="sugg-name">„${esc(q)}“ hinzufügen</span></li>`);
    box.hidden = !box.innerHTML;
    renderQuick();
  }
  input.addEventListener("input", () => { active = -1; renderSuggest(); });
  input.addEventListener("focus", renderSuggest);
  input.addEventListener("keydown", (e) => {
    if (box.hidden || !sugg.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, sugg.length - 1); renderSuggest(); }
    if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, -1); renderSuggest(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".rest-adder")) box.hidden = true; });
  box.addEventListener("mousedown", (e) => e.preventDefault());
  box.addEventListener("click", (e) => {
    const li = e.target.closest(".sugg");
    if (!li) return;
    if (li.dataset.free) addPantry(input.value);
    else { const s = sugg[+li.dataset.k]; addPantry(s.name, s.emoji); }
    input.value = "";
    renderSuggest();
    input.focus();
  });
  $("#rest-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const pick = active >= 0 ? sugg[active] : sugg.find((s) => s.name.toLowerCase() === q.toLowerCase()) || sugg[0];
    // mehrere mit Komma: „Zucchini, Feta, Eier“
    if (q.includes(",")) q.split(/\s*,\s*/).filter(Boolean).forEach((n) => addPantry(n));
    else if (pick && pick.name.toLowerCase().startsWith(q.toLowerCase())) addPantry(pick.name, pick.emoji);
    else addPantry(q);
    input.value = "";
    active = -1;
    renderSuggest();
  });

  /* ---------- Chips ---------- */
  $("#rest-have").addEventListener("click", (e) => { const c = e.target.closest(".rchip"); if (c) removePantry(c.dataset.name); });
  $("#rest-quick").addEventListener("click", (e) => {
    const c = e.target.closest(".rchip");
    if (!c) return;
    has(c.dataset.name) ? removePantry(c.dataset.name) : addPantry(c.dataset.name, c.dataset.emoji);
  });
  $("#rest-clear").addEventListener("click", () => { pantry = []; render(); persist(); });
  $("#rest-staples").addEventListener("change", (e) => {
    useStaples = e.target.checked;
    try { localStorage.setItem("foodies-staples", useStaples ? "1" : "0"); } catch {}
    renderResults();
  });

  // alle Zutaten aus den eigenen Rezepten (ohne Grundzutaten), je Schlüssel einmal
  function recipeIngredients() {
    const seen = new Map();
    for (const r of state.recipes) for (const i of r.ingredients) {
      if (!i.name || isStaple(i.name)) continue;
      const k = ingredientKey(i.name);
      if (!seen.has(k)) seen.set(k, { name: cleanName(i.name), emoji: categorize(i.name).emoji, count: 0 });
      seen.get(k).count++;
    }
    return [...seen.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
  }
  const cleanName = (n) => cap(String(n).replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim());

  function renderQuick() {
    const q = input.value.trim().toLowerCase();
    const list = recipeIngredients().filter((i) => !has(i.name) && (!q || i.name.toLowerCase().includes(q)));
    $("#rest-quick").innerHTML = list.length
      ? list.map((i) => `<button type="button" class="rchip" data-name="${esc(i.name)}" data-emoji="${esc(i.emoji)}"><span>${esc(i.emoji)}</span>${esc(i.name)}</button>`).join("")
      : `<p class="muted rest-none">${state.recipes.length ? (q ? "Keine passende Zutat in euren Rezepten – oben über die Suche hinzufügen." : "Alle Zutaten aus euren Rezepten sind ausgewählt 🎉") : "Sobald ihr Rezepte habt, erscheinen deren Zutaten hier."}</p>`;
  }

  /* ---------- Filter ---------- */
  function renderFilter() {
    document.querySelectorAll(".rest-type").forEach((b) => { b.classList.toggle("is-active", b.dataset.type === rs.type); b.setAttribute("aria-selected", b.dataset.type === rs.type); });
    const n = rs.tags.size, btn = $("#rest-filter-btn");
    btn.classList.toggle("has-active", n > 0);
    btn.setAttribute("aria-expanded", String(!$("#rest-filter-panel").hidden));
    $("#rest-filter-badge").hidden = !n;
    $("#rest-filter-badge").textContent = n;
    $("#rest-filter-tags").innerHTML = tagButtons(rs.tags, tagsFor(rs.type));
  }
  document.querySelectorAll(".rest-type").forEach((b) => b.addEventListener("click", () => {
    if (rs.type !== b.dataset.type) rs.tags.clear();
    rs.type = b.dataset.type;
    renderFilter(); renderResults();
  }));
  $("#rest-filter-btn").addEventListener("click", () => { $("#rest-filter-panel").hidden = !$("#rest-filter-panel").hidden; renderFilter(); });
  $("#rest-filter-tags").addEventListener("click", (e) => {
    const t = e.target.closest(".tag");
    if (!t) return;
    rs.tags.has(t.dataset.tag) ? rs.tags.delete(t.dataset.tag) : rs.tags.add(t.dataset.tag);
    renderFilter(); renderResults();
  });
  $("#rest-filter-reset").addEventListener("click", () => { rs.tags.clear(); renderFilter(); renderResults(); });

  /* ---------- Abgleich ---------- */
  function analyse(r) {
    const keys = pantryKeys();
    const rows = r.ingredients.map((i, idx) => {
      const staple = isStaple(i.name);
      const ok = keys.has(ingredientKey(i.name)) || (useStaples && staple);
      return { ...i, idx, ok, staple };
    }).filter((x) => x.name);
    const need = rows.length, have = rows.filter((x) => x.ok).length;
    const realHits = rows.filter((x) => x.ok && !(useStaples && x.staple)).length; // echte Treffer aus dem Kühlschrank
    return { rows, need, have, missing: rows.filter((x) => !x.ok), realHits, ratio: need ? have / need : 0 };
  }

  function renderResults() {
    const out = $("#rest-results");
    if (!pantry.length) {
      out.innerHTML = `<div class="empty"><div class="empty-emoji">🧊</div><p><strong>Was habt ihr noch da?</strong><br />Wählt oben ein paar Zutaten aus – dann zeigen wir euch, was ihr daraus kochen könnt.</p></div>`;
      return;
    }
    const list = state.recipes
      .filter((r) => r.type === rs.type && r.ingredients.length)
      .filter((r) => !rs.tags.size || [...rs.tags].every((t) => r.tags.includes(t)))
      .map((r) => ({ r, a: analyse(r) }))
      .filter((x) => x.a.realHits > 0)
      .sort((x, y) => x.a.missing.length - y.a.missing.length || y.a.ratio - x.a.ratio || y.a.realHits - x.a.realHits);

    const groups = [
      { title: "✅ Alles da – kann losgehen!", cls: "g-all", items: list.filter((x) => x.a.missing.length === 0) },
      { title: "🛒 Fast alles da", cls: "g-most", items: list.filter((x) => x.a.missing.length > 0 && (x.a.ratio >= 0.6 || x.a.missing.length <= 2)) },
      { title: "🤏 Teilweise da", cls: "g-some", items: list.filter((x) => x.a.missing.length > 2 && x.a.ratio < 0.6) },
    ].filter((g) => g.items.length);

    out.innerHTML = groups.length ? groups.map((g) => `
      <section class="rest-group ${g.cls}">
        <h3 class="rest-group-head">${g.title}<span class="shop-cat-count">${g.items.length}</span></h3>
        <ul class="rest-list">${g.items.map(({ r, a }) => `<li><button type="button" class="rest-card" data-id="${r.id}">
          ${thumbHTML(r)}
          <span class="rest-info">
            <span class="bar-title">${esc(r.title)}</span>
            <span class="rest-progress" aria-hidden="true"><span style="width:${Math.round(a.ratio * 100)}%"></span></span>
            <span class="rest-stat">${a.have} von ${a.need} Zutaten da</span>
            ${a.missing.length ? `<span class="rest-missing">Fehlt: ${a.missing.slice(0, 5).map((m) => `<b>${esc(cleanName(m.name))}</b>`).join(" · ")}${a.missing.length > 5 ? ` +${a.missing.length - 5}` : ""}</span>` : ""}
          </span>
          <span class="bar-chevron" aria-hidden="true">›</span>
        </button></li>`).join("")}</ul>
      </section>`).join("")
      : `<div class="empty"><div class="empty-emoji">🤔</div><p><strong>Kein passendes Rezept gefunden.</strong><br />${rs.tags.size ? "Probiert es mit weniger Filtern" : "Wählt noch ein paar Zutaten mehr aus"} – oder schaut unter ✨ Inspiration.</p></div>`;
  }

  function render() {
    $("#rest-have-wrap").hidden = !pantry.length;
    $("#rest-have").innerHTML = pantry.map((p) => `<button type="button" class="rchip is-on" data-name="${esc(p.name)}" aria-label="${esc(p.name)} entfernen"><span>${esc(p.emoji)}</span>${esc(p.name)}<i aria-hidden="true">✕</i></button>`).join("");
    $("#rest-count").textContent = pantry.length
      ? `${pantry.length} ${pantry.length === 1 ? "Zutat" : "Zutaten"} im Kühlschrank`
      : "Wählt aus, was im Kühlschrank ist – wir finden passende Rezepte.";
    renderQuick();
    renderFilter();
    renderResults();
  }

  /* ---------- Rezept-Fenster ---------- */
  let cur = null, curServ = 2;
  $("#rest-results").addEventListener("click", (e) => {
    const c = e.target.closest(".rest-card");
    if (!c) return;
    cur = state.recipes.find((r) => r.id === c.dataset.id);
    curServ = cur.servings;
    renderModal();
    openModal($("#rest-modal"));
  });
  function renderModal() {
    const r = cur, a = analyse(r), factor = curServ / r.servings;
    $("#rest-modal-content").innerHTML = `
      <div class="modal-top">
        <div class="meal-head">
          ${thumbHTML(r, "plan-thumb big")}
          <div><p class="meal-date">${a.missing.length ? `${a.have} von ${a.need} Zutaten da` : "Alles da ✓"}</p><h2>${esc(r.title)}</h2></div>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Schließen">✕</button>
      </div>
      <div class="pick-body">
        <div class="rest-actions">
          <button type="button" class="btn btn-soft" data-ract="recipe">📖 Zum Rezept</button>
          <button type="button" class="btn btn-soft" data-ract="plan">🗓️ In den Kalender</button>
        </div>
        <section class="card">
          <h3>Zutaten</h3>
          <div class="servings">
            <span class="servings-label">Für</span>
            <div class="stepper">
              <button data-ract="minus" aria-label="Weniger Portionen" ${curServ <= 1 ? "disabled" : ""}>−</button>
              <output>${curServ} ${curServ === 1 ? "Portion" : "Portionen"}</output>
              <button data-ract="plus" aria-label="Mehr Portionen" ${curServ >= 50 ? "disabled" : ""}>+</button>
            </div>
          </div>
          <ul class="ing-list rest-ings">${a.rows.map((i) => {
            const amt = i.amount == null ? "" : formatAmount(i.amount * factor, i.unit);
            const on = !!Shop.onList(r.id, i.idx);
            return `<li class="${i.ok ? "is-have" : "is-missing"}"><span class="rest-mark" aria-hidden="true">${i.ok ? "✓" : "✕"}</span><span class="ing-amt">${esc([amt, i.unit].filter(Boolean).join(" "))}</span><span class="ing-name">${esc(i.name)}${i.ok ? "" : ` <small>fehlt</small>`}</span>
              <button type="button" class="ing-cart ${on ? "is-on" : ""}" data-idx="${i.idx}" aria-pressed="${on}" aria-label="${esc(i.name)} auf die Einkaufsliste">🛒</button></li>`;
          }).join("")}</ul>
          <div class="rest-buy">
            ${a.missing.length ? `<button type="button" class="btn btn-primary" data-ract="missing">🛒 Fehlende auf die Einkaufsliste (${a.missing.length})</button>` : ""}
            <button type="button" class="btn btn-soft" data-ract="all">🛒 Alle auf die Einkaufsliste</button>
          </div>
        </section>
      </div>`;
  }
  $("#rest-modal-content").addEventListener("click", async (e) => {
    const act = e.target.closest("[data-ract]")?.dataset.ract;
    const r = cur, factor = () => curServ / r.servings;
    if (act === "minus" || act === "plus") { curServ = Math.max(1, Math.min(50, curServ + (act === "plus" ? 1 : -1))); return renderModal(); }
    if (act === "missing") { await Shop.addSome(r, analyse(r).missing.map((m) => m.idx), factor()); return renderModal(); }
    if (act === "all") { await Shop.addAll(r, factor()); return renderModal(); }
    if (act === "plan") return Plan.openDayPicker(r);
    if (act === "recipe") {
      closeModal($("#rest-modal"));
      if (state.type !== r.type) { state.type = r.type; state.category = "all"; state.tags.clear(); }
      document.querySelector('.tab[data-tab="rezepte"]').click();
      renderList();
      openDetail(r.id);
      if (curServ !== r.servings) setServings(curServ);
      return;
    }
    const cart = e.target.closest(".ing-cart");
    if (cart) {
      const on = await Shop.toggleIngredient(r, +cart.dataset.idx, factor());
      cart.classList.toggle("is-on", on);
      cart.setAttribute("aria-pressed", String(on));
    }
  });

  // Rezepte haben sich geändert → Vorschläge aktualisieren
  document.querySelector('.tab[data-tab="reste"]').addEventListener("click", () => render());

  render();
  return { onData, render };
})();
