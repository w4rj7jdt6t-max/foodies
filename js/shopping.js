/* ================= Einkaufsliste ================= */
const Shop = (() => {
  let items = [];
  let manualCat = null; // vom Nutzer gewählte Kategorie beim Hinzufügen

  /* ---------- Laden & Speichern ---------- */
  async function load() {
    try {
      items = await Store.shop.all();
      $("#shop-setup").hidden = true;
    } catch (err) {
      console.error(err);
      items = [];
      if (err?.missingTable) $("#shop-setup").hidden = false;
      else toast("Einkaufsliste konnte nicht geladen werden");
    }
    render();
    refreshRecipeButtons();
  }

  async function save(list) {
    try { await Store.shop.putMany(list); }
    catch (err) { console.error(err); toast(err?.missingTable ? "Einkaufsliste ist noch nicht eingerichtet" : "Speichern fehlgeschlagen 😕"); }
  }
  async function drop(ids) {
    try { await Store.shop.removeMany(ids); }
    catch (err) { console.error(err); toast("Löschen fehlgeschlagen 😕"); }
  }

  /* ---------- Eingabe „2 l Milch“ zerlegen ---------- */
  const UNITS = ["g", "kg", "ml", "l", "EL", "TL", "Prise", "Stk.", "Stk", "Stück", "Zehe", "Zehen", "Dose", "Dosen", "Bund", "Becher", "Pck.", "Packung", "Packungen", "Pkg.", "Flasche", "Flaschen", "Kiste", "Glas", "Gläser", "Scheibe", "Scheiben", "Tasse", "Netz", "Beutel", "Liter"];
  function parseEntry(text) {
    const m = text.trim().match(/^(\d+(?:[.,]\d+)?|\d+\/\d+|½|¼|¾)\s*(\S+)?\s*(.*)$/);
    if (!m) return { amount: null, unit: "", name: text.trim() };
    const amount = parseAmount(m[1].replace("½", "1/2").replace("¼", "1/4").replace("¾", "3/4"));
    let unit = m[2] || "", name = m[3];
    const u = UNITS.find((x) => x.toLowerCase() === unit.toLowerCase().replace(/\.$/, "") || x.toLowerCase() === unit.toLowerCase());
    if (u) unit = u === "Liter" ? "l" : u;
    else { name = [unit, name].filter(Boolean).join(" "); unit = ""; }
    return { amount, unit, name: name.trim() };
  }

  function newItem({ name, amount = null, unit = "", recipeId = null, recipeTitle = "", ingIndex = null, cat = null }) {
    const auto = categorize(name, unit);
    return {
      id: uid(), name, amount, unit, recipeId, recipeTitle, ingIndex,
      cat: cat || auto.cat, emoji: auto.emoji, checked: false, createdAt: Date.now(),
    };
  }

  /* ---------- Darstellung ---------- */
  function amountText(i) {
    return [i.amount == null ? "" : formatAmount(i.amount, i.unit), i.unit].filter(Boolean).join(" ");
  }

  function render() {
    const open = items.filter((i) => !i.checked).length, done = items.length - open;
    $("#shop-count").textContent = !items.length ? "Noch nichts auf der Liste" : `${open} offen · ${done} erledigt`;
    $("#shop-empty").hidden = items.length > 0;
    $("#shop-actions").hidden = items.length === 0;
    $("#shop-clear-done").disabled = done === 0;

    $("#shop-sections").innerHTML = SHOP_CATS.map((c) => {
      const list = items.filter((i) => i.cat === c.id).sort((a, b) => a.checked - b.checked || a.createdAt - b.createdAt);
      if (!list.length) return "";
      const left = list.filter((i) => !i.checked).length;
      return `<section class="shop-cat">
        <h3 class="shop-cat-head"><span class="shop-cat-emoji">${c.emoji}</span>${esc(c.label)}<span class="shop-cat-count">${left ? left : "✓"}</span></h3>
        <ul class="shop-list">${list.map(itemHTML).join("")}</ul>
      </section>`;
    }).join("");
  }

  function itemHTML(i) {
    const amt = amountText(i);
    return `<li class="shop-item ${i.checked ? "is-checked" : ""}" data-id="${i.id}">
      <button type="button" class="shop-check" data-act="toggle" aria-pressed="${i.checked}" aria-label="${esc(i.name)} ${i.checked ? "nicht mehr abhaken" : "abhaken"}">
        <span class="shop-emoji" aria-hidden="true">${i.emoji}</span>
        <span class="shop-text">
          <span class="shop-name">${amt ? `<b>${esc(amt)}</b> ` : ""}${esc(i.name)}</span>
          ${i.recipeTitle ? `<span class="shop-src">für ${esc(i.recipeTitle)}</span>` : ""}
        </span>
        <span class="shop-tick" aria-hidden="true">✓</span>
      </button>
      <label class="shop-move" title="Kategorie ändern">
        <span aria-hidden="true">⇄</span>
        <select data-act="move" aria-label="Kategorie ändern">${SHOP_CATS.map((c) => `<option value="${c.id}" ${c.id === i.cat ? "selected" : ""}>${c.emoji} ${esc(c.label)}</option>`).join("")}</select>
      </label>
      <button type="button" class="shop-del" data-act="delete" aria-label="${esc(i.name)} entfernen">✕</button>
    </li>`;
  }

  /* ---------- Hinzufügen ---------- */
  function updateCatPreview() {
    const text = $("#shop-input").value;
    const sel = $("#shop-cat");
    if (!manualCat) sel.value = text.trim() ? categorize(parseEntry(text).name, parseEntry(text).unit).cat : "allgemein";
  }
  $("#shop-cat").innerHTML = SHOP_CATS.map((c) => `<option value="${c.id}">${c.emoji} ${esc(c.label)}</option>`).join("");
  $("#shop-input").addEventListener("input", updateCatPreview);
  $("#shop-cat").addEventListener("change", () => { manualCat = $("#shop-cat").value; });

  $("#shop-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("#shop-input").value.trim();
    if (!text) return $("#shop-input").focus();
    // mehrere Einträge mit Komma: „Gurke, Milch, 2 Paprika“
    const parts = text.split(/\s*[,;]\s*/).filter(Boolean);
    const added = parts.map((p) => newItem({ ...parseEntry(p), cat: parts.length === 1 ? manualCat : null }));
    items.push(...added);
    $("#shop-input").value = "";
    manualCat = null;
    updateCatPreview();
    render();
    $("#shop-input").focus();
    await save(added);
  });

  /* ---------- Abhaken, verschieben, löschen ---------- */
  $("#shop-sections").addEventListener("click", async (e) => {
    const li = e.target.closest(".shop-item");
    if (!li) return;
    const item = items.find((i) => i.id === li.dataset.id);
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "toggle") {
      item.checked = !item.checked;
      li.classList.toggle("is-checked", item.checked); // sofortiges Feedback, dann sortieren
      setTimeout(render, 350);
      await save([item]);
    } else if (act === "delete") {
      items = items.filter((i) => i !== item);
      render();
      refreshRecipeButtons();
      await drop([item.id]);
    }
  });
  $("#shop-sections").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "move") return;
    const item = items.find((i) => i.id === e.target.closest(".shop-item").dataset.id);
    item.cat = e.target.value;
    render();
    toast(`Verschoben nach ${shopCatById(item.cat).label}`);
    await save([item]);
  });

  $("#shop-clear-done").addEventListener("click", async () => {
    const ids = items.filter((i) => i.checked).map((i) => i.id);
    items = items.filter((i) => !i.checked);
    render();
    refreshRecipeButtons();
    toast(`${ids.length} erledigte entfernt`);
    await drop(ids);
  });
  $("#shop-clear-all").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!btn.classList.contains("armed")) {
      btn.classList.add("armed");
      btn.textContent = "Wirklich alles löschen?";
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove("armed"); btn.textContent = "Liste leeren"; }, 3000);
      return;
    }
    btn.classList.remove("armed");
    btn.textContent = "Liste leeren";
    const ids = items.map((i) => i.id);
    items = [];
    render();
    refreshRecipeButtons();
    await drop(ids);
  });

  /* ---------- Verbindung zu den Rezepten ---------- */
  const onList = (recipeId, idx) => items.find((i) => i.recipeId === recipeId && i.ingIndex === idx);

  /** Zutat (in aktueller Portionenzahl) auf die Liste setzen bzw. wieder herunternehmen */
  async function toggleIngredient(recipe, idx, factor) {
    const existing = onList(recipe.id, idx);
    if (existing) {
      items = items.filter((i) => i !== existing);
      render();
      toast(`${existing.name} von der Liste genommen`);
      await drop([existing.id]);
      return false;
    }
    const ing = recipe.ingredients[idx];
    const item = newItem({ name: ing.name, unit: ing.unit, amount: ing.amount == null ? null : ing.amount * factor, recipeId: recipe.id, recipeTitle: recipe.title, ingIndex: idx });
    items.push(item);
    render();
    toast(`${item.emoji} ${ing.name} → ${shopCatById(item.cat).label}`);
    await save([item]);
    return true;
  }

  async function addAll(recipe, factor) {
    const added = recipe.ingredients.map((ing, idx) => (onList(recipe.id, idx) ? null
      : newItem({ name: ing.name, unit: ing.unit, amount: ing.amount == null ? null : ing.amount * factor, recipeId: recipe.id, recipeTitle: recipe.title, ingIndex: idx })))
      .filter(Boolean);
    if (!added.length) return toast("Alle Zutaten stehen schon auf der Liste ✓");
    items.push(...added);
    render();
    refreshRecipeButtons();
    toast(`${added.length} ${added.length === 1 ? "Zutat" : "Zutaten"} auf die Einkaufsliste 🛒`);
    await save(added);
  }

  // Warenkorb-Knöpfe in einer offenen Rezeptansicht aktualisieren
  function refreshRecipeButtons() {
    const r = state.current;
    if (!r || !$("#detail-modal").open) return;
    document.querySelectorAll("#ing-list .ing-cart").forEach((b) => {
      const on = !!onList(r.id, +b.dataset.idx);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  Store.shop.onChange(() => load());
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Store.cloud && !document.body.classList.contains("locked")) load(); });

  return { load, toggleIngredient, addAll, onList, refreshRecipeButtons };
})();
