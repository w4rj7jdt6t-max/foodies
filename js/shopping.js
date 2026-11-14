/* ================= Einkaufsliste ================= */
const Shop = (() => {
  let items = [];

  /* ---------- Laden & Speichern ----------
   * Einträge und eigene Zutaten liegen in derselben Tabelle;
   * eigene Zutaten erkennt man an kind: "custom". */
  let customs = [];
  let extras = []; // weitere Einträge in derselben Tabelle, z. B. der Kühlschrank-Inhalt („Reste“)
  let lastSig = "";
  // Vergleich unabhängig von der Feldreihenfolge (die Datenbank sortiert JSON-Felder um)
  const signature = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((o) => JSON.stringify(o, Object.keys(o).sort())).join("\n");
  async function load() {
    try {
      const all = await Store.shop.all();
      // eigene Änderungen kommen über die Live-Synchronisation zurück – dann nichts neu zeichnen
      const sig = signature(all);
      if (sig === lastSig) return;
      lastSig = sig;
      customs = all.filter((i) => i.kind === "custom");
      extras = all.filter((i) => i.kind && i.kind !== "custom");
      items = all.filter((i) => !i.kind);
      setCustomGroceries(customs);
      if (typeof Reste !== "undefined") Reste.onData(extras);
      $("#shop-setup").hidden = true;
    } catch (err) {
      console.error(err);
      items = [];
      if (err?.missingTable) $("#shop-setup").hidden = false;
      else toast("Einkaufsliste konnte nicht geladen werden");
    }
    render();
    renderCustoms();
    refreshRecipeButtons();
  }

  const syncSig = () => { lastSig = signature([...customs, ...extras, ...items]); };
  /** Zusatz-Eintrag (z. B. Kühlschrank) speichern, ohne die Liste neu zu zeichnen */
  async function putExtra(doc) {
    extras = [...extras.filter((x) => x.id !== doc.id), doc];
    await save([doc]);
  }
  async function save(list) {
    syncSig();
    try { await Store.shop.putMany(list); }
    catch (err) { console.error(err); toast(err?.missingTable ? "Einkaufsliste ist noch nicht eingerichtet" : "Speichern fehlgeschlagen 😕"); }
  }
  async function drop(ids) {
    syncSig();
    try { await Store.shop.removeMany(ids); }
    catch (err) { console.error(err); toast("Löschen fehlgeschlagen 😕"); }
  }

  /* ---------- Eingabe „2 l Milch“ zerlegen ---------- */
  const UNIT_ALIASES = { "stk": "Stk.", "stück": "Stk.", "liter": "l", "pck": "Packung", "pkg": "Packung", "packungen": "Packung", "dosen": "Dose", "flaschen": "Flasche", "gläser": "Glas", "zehen": "Zehe", "scheiben": "Scheibe", "becher": "Becher", "el": "EL", "tl": "TL", "prise": "Prise" };
  function normUnit(u) {
    const k = u.toLowerCase().replace(/\.$/, "");
    return UNIT_ALIASES[k] || SHOP_UNITS.find((x) => x.toLowerCase().replace(/\.$/, "") === k) || ["Zehe", "Scheibe", "Tasse"].find((x) => x.toLowerCase() === k) || null;
  }
  function parseEntry(text) {
    const m = text.trim().match(/^(\d+(?:[.,]\d+)?|\d+\/\d+|½|¼|¾)\s*(\S+)?\s*(.*)$/);
    if (!m) return { amount: null, unit: "", name: text.trim() };
    const amount = parseAmount(m[1].replace("½", "1/2").replace("¼", "1/4").replace("¾", "3/4"));
    let unit = m[2] || "", name = m[3];
    const u = normUnit(unit);
    if (u) unit = u;
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

  /** Manuell hinzugefügt: gleiche offene Zutat (Name + Einheit) wird zusammengezählt */
  async function addManual(list) {
    const changed = [];
    for (const it of list) {
      const same = items.find((i) => !i.checked && !i.recipeId && i.name.toLowerCase() === it.name.toLowerCase() && (i.unit || "") === (it.unit || ""));
      if (same && same.amount != null && it.amount != null) { same.amount += it.amount; changed.push(same); }
      else { items.push(it); changed.push(it); }
    }
    render();
    await save(changed);
  }

  /* ---------- Darstellung ---------- */
  function amountText(i) {
    return [i.amount == null ? "" : formatAmount(i.amount, i.unit), i.unit].filter(Boolean).join(" ");
  }

  function renderCounts() {
    const open = items.filter((i) => !i.checked).length, done = items.length - open;
    $("#shop-count").textContent = !items.length ? "Noch nichts auf der Liste" : `${open} offen · ${done} erledigt`;
    $("#shop-empty").hidden = items.length > 0;
    $("#shop-actions").hidden = items.length === 0;
    $("#shop-clear-done").disabled = done === 0;
    document.querySelectorAll("#shop-sections .shop-cat").forEach((sec) => {
      const left = items.filter((i) => i.cat === sec.dataset.cat && !i.checked).length;
      sec.querySelector(".shop-cat-count").textContent = left ? left : "✓";
    });
  }

  function render() {
    const y = window.scrollY; // Scrollposition beim Neuzeichnen halten (Safari hat kein Scroll-Anchoring)
    // feste Reihenfolge: Einträge bleiben beim Abhaken an ihrem Platz
    $("#shop-sections").innerHTML = SHOP_CATS.map((c) => {
      const list = items.filter((i) => i.cat === c.id).sort((a, b) => a.createdAt - b.createdAt);
      if (!list.length) return "";
      const left = list.filter((i) => !i.checked).length;
      return `<section class="shop-cat" data-cat="${c.id}">
        <h3 class="shop-cat-head"><span class="shop-cat-emoji">${c.emoji}</span>${esc(c.label)}<span class="shop-cat-count">${left ? left : "✓"}</span></h3>
        <ul class="shop-list">${list.map(itemHTML).join("")}</ul>
      </section>`;
    }).join("");
    renderCounts();
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }

  function itemHTML(i) {
    const amt = amountText(i);
    return `<li class="shop-item ${i.checked ? "is-checked" : ""}" data-id="${i.id}">
      <button type="button" class="shop-check" data-act="toggle" aria-pressed="${i.checked}" aria-label="${esc(i.name)} ${i.checked ? "nicht mehr abhaken" : "abhaken"}">
        <span class="shop-emoji" aria-hidden="true">${esc(i.emoji)}</span>
        <span class="shop-text">
          <span class="shop-name">${amt ? `<b>${esc(amt)}</b> ` : ""}${esc(i.name)}</span>
          ${i.recipeTitle ? `<span class="shop-src">für ${esc(i.recipeTitle)}</span>` : ""}
        </span>
        <span class="shop-tick" aria-hidden="true">✓</span>
      </button>
      <label class="shop-move" title="Kategorie ändern">
        <span aria-hidden="true">⇄</span>
        <select data-act="move" aria-label="Kategorie ändern">${catOptions(i.cat)}</select>
      </label>
      <button type="button" class="shop-del" data-act="delete" aria-label="${esc(i.name)} entfernen">✕</button>
    </li>`;
  }
  const catOptions = (sel) => SHOP_CATS.map((c) => `<option value="${c.id}" ${c.id === sel ? "selected" : ""}>${c.emoji} ${esc(c.label)}</option>`).join("");
  const unitOptions = (sel) => [...new Set([...SHOP_UNITS, sel].filter(Boolean))].map((u) => `<option value="${esc(u)}" ${u === sel ? "selected" : ""}>${esc(u)}</option>`).join("");

  /* ---------- Suchen & Vorschläge ---------- */
  const input = $("#shop-input"), suggestBox = $("#shop-suggest");
  let suggestions = [], active = -1;

  function renderSuggest() {
    const q = input.value.trim();
    if (!q || q.includes(",") || /^\d/.test(q)) { suggestBox.hidden = true; return; }
    suggestions = suggestGroceries(q);
    const exact = isKnownGrocery(q);
    const rows = suggestions.map((s, k) => `<li role="option" class="sugg ${k === active ? "is-active" : ""}" data-k="${k}">
        <span class="sugg-emoji">${esc(s.emoji)}</span><span class="sugg-name">${esc(s.name)}</span>
        ${s.custom ? `<span class="sugg-star" title="Eigene Zutat">⭐</span>` : ""}<span class="sugg-cat">${esc(shopCatById(s.cat).label)}</span></li>`);
    if (!exact) {
      const auto = categorize(q);
      rows.push(`<li role="option" class="sugg sugg-free" data-free="1"><span class="sugg-emoji">${esc(auto.emoji)}</span><span class="sugg-name">„${esc(q)}“ hinzufügen</span><span class="sugg-cat">${esc(shopCatById(auto.cat).label)}</span></li>`);
      rows.push(`<li role="option" class="sugg sugg-new" data-new="1"><span class="sugg-emoji">⭐</span><span class="sugg-name">„${esc(q)}“ als eigene Zutat anlegen</span></li>`);
    }
    suggestBox.innerHTML = rows.join("");
    suggestBox.hidden = false;
  }
  input.addEventListener("input", () => { active = -1; renderSuggest(); });
  input.addEventListener("focus", renderSuggest);
  input.addEventListener("keydown", (e) => {
    if (suggestBox.hidden || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, suggestions.length - 1); renderSuggest(); }
    if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, -1); renderSuggest(); }
    if (e.key === "Escape") suggestBox.hidden = true;
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".shop-adder")) suggestBox.hidden = true; });
  suggestBox.addEventListener("mousedown", (e) => e.preventDefault()); // Fokus im Feld behalten
  suggestBox.addEventListener("click", (e) => {
    const li = e.target.closest(".sugg");
    if (!li) return;
    const q = input.value.trim();
    if (li.dataset.new) return openCustoms({ name: q });
    if (li.dataset.free) return openQty({ name: q });
    const s = suggestions[+li.dataset.k];
    openQty({ name: s.name, cat: s.cat, emoji: s.emoji });
  });

  $("#shop-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return input.focus();
    if (!suggestBox.hidden && active >= 0 && suggestions[active]) {
      const s = suggestions[active];
      return openQty({ name: s.name, cat: s.cat, emoji: s.emoji });
    }
    const parts = text.split(/\s*[,;]\s*/).filter(Boolean);
    // Schnell-Eingabe mit Menge („2 l Milch“) oder mehrere Dinge → direkt auf die Liste
    if (parts.length > 1 || /^\d|^[½¼¾]/.test(text)) {
      input.value = "";
      suggestBox.hidden = true;
      await addManual(parts.map((p) => newItem(parseEntry(p))));
      toast(parts.length > 1 ? `${parts.length} Einträge hinzugefügt` : "Hinzugefügt ✓");
      return;
    }
    openQty({ name: cap(text) });
  });

  /* ---------- Menge einstellen ---------- */
  let qty = null; // { name, cat, emoji }
  $("#qty-cat").innerHTML = catOptions("allgemein");
  function openQty({ name, cat, emoji }) {
    const auto = categorize(name);
    const s = suggestQty(name);
    qty = { name, emoji: emoji || auto.emoji };
    $("#qty-emoji").textContent = qty.emoji;
    $("#qty-name").textContent = name;
    $("#qty-cat").innerHTML = catOptions(cat || auto.cat);
    $("#qty-unit").innerHTML = unitOptions(s.unit);
    $("#qty-amount").value = amountForInput(s.amount);
    suggestBox.hidden = true;
    $("#qty-panel").hidden = false;
    $("#qty-panel").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function closeQty() { $("#qty-panel").hidden = true; qty = null; }
  const qtyVal = () => parseAmount($("#qty-amount").value) ?? 0;
  function stepQty(dir) {
    const unit = $("#qty-unit").value, v = qtyVal();
    const step = qtyStep(unit, dir > 0 ? v : Math.max(v - 1, 0));
    const next = Math.max(step, nextQty(v, step, dir));
    $("#qty-amount").value = amountForInput(next);
  }
  $("#qty-minus").addEventListener("click", () => stepQty(-1));
  $("#qty-plus").addEventListener("click", () => stepQty(1));
  $("#qty-unit").addEventListener("change", () => {
    // beim Wechsel z. B. auf g eine sinnvolle Zahl vorschlagen
    const u = $("#qty-unit").value, v = qtyVal();
    if ((u === "g" || u === "ml") && v < 10) $("#qty-amount").value = "250";
    if (!(u === "g" || u === "ml") && v >= 50) $("#qty-amount").value = "1";
  });
  $("#qty-close").addEventListener("click", closeQty);
  async function addFromQty(withAmount) {
    if (!qty) return;
    const item = newItem({ name: qty.name, cat: $("#qty-cat").value, amount: withAmount ? qtyVal() || null : null, unit: withAmount ? $("#qty-unit").value : "" });
    item.emoji = qty.emoji;
    closeQty();
    input.value = "";
    await addManual([item]);
    toast(`${item.emoji} ${[amountText(item), item.name].filter(Boolean).join(" ")} → ${shopCatById(item.cat).label}`);
    input.focus();
  }
  $("#qty-add").addEventListener("click", () => addFromQty(true));
  $("#qty-nomount").addEventListener("click", () => addFromQty(false));
  $("#qty-amount").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFromQty(true); } });

  /* ---------- Eigene Zutaten ---------- */
  let editingCustom = null;
  $("#c-cat").innerHTML = catOptions("allgemein");
  $("#c-unit").innerHTML = unitOptions("Stk.");
  $("#c-emoji-grid").innerHTML = EMOJI_CHOICES.map((e) => `<button type="button" class="emoji-pick" data-e="${e}">${e}</button>`).join("");
  $("#c-emoji-grid").addEventListener("click", (e) => {
    const b = e.target.closest(".emoji-pick");
    if (!b) return;
    $("#c-emoji").value = b.dataset.e;
    markEmoji();
  });
  const markEmoji = () => document.querySelectorAll(".emoji-pick").forEach((b) => b.classList.toggle("is-on", b.dataset.e === $("#c-emoji").value));
  $("#c-emoji").addEventListener("input", markEmoji);
  // Beim Tippen des Namens Emoji/Kategorie/Menge vorschlagen, solange nicht selbst gewählt
  let touched = false;
  ["#c-emoji", "#c-cat", "#c-unit", "#c-amount"].forEach((sel) => $(sel).addEventListener("input", () => (touched = true)));
  ["#c-cat", "#c-unit"].forEach((sel) => $(sel).addEventListener("change", () => (touched = true)));
  $("#c-name").addEventListener("input", () => { if (!touched && !editingCustom) fillCustomDefaults($("#c-name").value); });
  function fillCustomDefaults(name) {
    const auto = _categorizeBase(name), s = suggestQty(name);
    $("#c-emoji").value = auto.emoji;
    $("#c-cat").value = auto.cat;
    $("#c-unit").innerHTML = unitOptions(s.unit);
    $("#c-amount").value = amountForInput(s.amount);
    markEmoji();
  }

  function resetCustomForm(prefill = {}) {
    editingCustom = prefill.id ? prefill : null;
    touched = !!prefill.id;
    $("#custom-form-title").textContent = editingCustom ? "Zutat bearbeiten" : "Neue Zutat";
    $("#c-save").textContent = editingCustom ? "Änderungen speichern" : "Zutat speichern";
    $("#c-cancel").hidden = !editingCustom;
    $("#c-name").value = prefill.name || "";
    if (editingCustom) {
      $("#c-emoji").value = prefill.emoji;
      $("#c-cat").value = prefill.cat;
      $("#c-unit").innerHTML = unitOptions(prefill.unit || "Stk.");
      $("#c-amount").value = amountForInput(prefill.amount ?? 1);
      markEmoji();
    } else fillCustomDefaults(prefill.name || "");
  }

  function renderCustoms() {
    $("#custom-list").innerHTML = customs.length
      ? [...customs].sort((a, b) => a.name.localeCompare(b.name, "de")).map((c) => `<li class="custom-item" data-id="${c.id}">
          <span class="shop-emoji">${esc(c.emoji)}</span>
          <span class="custom-info"><strong>${esc(c.name)}</strong><small>${esc(shopCatById(c.cat).label)} · ${esc([amountForInput(c.amount ?? 1), c.unit].join(" "))}</small></span>
          <button type="button" class="shop-move" data-cact="add" title="Auf die Liste" aria-label="${esc(c.name)} auf die Liste">🛒</button>
          <button type="button" class="shop-move" data-cact="edit" title="Bearbeiten" aria-label="${esc(c.name)} bearbeiten">✏️</button>
          <button type="button" class="shop-del" data-cact="delete" aria-label="${esc(c.name)} löschen">✕</button>
        </li>`).join("")
      : `<li class="muted custom-empty">Noch keine eigenen Zutaten. Legt oben eure erste an – sie wird dann automatisch erkannt und vorgeschlagen.</li>`;
  }

  let onCustomSaved = null; // Rückruf, z. B. aus dem Rezept-Editor
  function openCustoms(prefill = {}, onSaved = null) {
    onCustomSaved = onSaved;
    suggestBox.hidden = true;
    resetCustomForm(prefill);
    renderCustoms();
    openModal($("#custom-modal"));
    if (!prefill.name) setTimeout(() => $("#c-name").focus(), 50);
  }
  $("#btn-custom").addEventListener("click", () => openCustoms());
  $("#c-cancel").addEventListener("click", () => resetCustomForm());

  $("#custom-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#c-name").value.trim();
    if (!name) { $("#c-name").classList.add("invalid"); return $("#c-name").focus(); }
    const dup = customs.find((c) => c.name.toLowerCase() === name.toLowerCase() && c !== editingCustom);
    if (dup) return toast(`„${name}“ gibt es schon`);
    const c = {
      ...(editingCustom || { id: uid(), kind: "custom", createdAt: Date.now() }),
      name, emoji: $("#c-emoji").value.trim() || "🛒", cat: $("#c-cat").value,
      unit: $("#c-unit").value, amount: parseAmount($("#c-amount").value) ?? 1,
    };
    if (editingCustom) Object.assign(editingCustom, c); else customs.push(c);
    setCustomGroceries(customs);
    renderCustoms();
    toast(`${c.emoji} ${c.name} gespeichert`);
    const fromSearch = !editingCustom && input.value.trim().toLowerCase() === name.toLowerCase();
    resetCustomForm();
    await save([c]);
    if (onCustomSaved && !editingCustom) {
      const cb = onCustomSaved;
      onCustomSaved = null;
      closeModal($("#custom-modal"));
      cb(c);
      return;
    }
    if (fromSearch) { closeModal($("#custom-modal")); openQty({ name: c.name, cat: c.cat, emoji: c.emoji }); }
  });

  $("#custom-list").addEventListener("click", async (e) => {
    const li = e.target.closest(".custom-item");
    const act = e.target.closest("[data-cact]")?.dataset.cact;
    if (!li || !act) return;
    const c = customs.find((x) => x.id === li.dataset.id);
    if (act === "edit") { resetCustomForm(c); $("#custom-form").scrollIntoView({ behavior: "smooth" }); }
    if (act === "add") { closeModal($("#custom-modal")); openQty({ name: c.name, cat: c.cat, emoji: c.emoji }); }
    if (act === "delete") {
      customs = customs.filter((x) => x !== c);
      setCustomGroceries(customs);
      renderCustoms();
      if (editingCustom === c) resetCustomForm();
      toast(`${c.name} gelöscht`);
      await drop([c.id]);
    }
  });

  /* ---------- Abhaken, verschieben, löschen ---------- */
  $("#shop-sections").addEventListener("click", async (e) => {
    const li = e.target.closest(".shop-item");
    if (!li) return;
    const item = items.find((i) => i.id === li.dataset.id);
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "toggle") {
      item.checked = !item.checked;
      // nur diesen Eintrag ändern – kein Neuzeichnen, nichts verrutscht
      li.classList.toggle("is-checked", item.checked);
      const btn = li.querySelector(".shop-check");
      btn.setAttribute("aria-pressed", String(item.checked));
      btn.setAttribute("aria-label", `${item.name} ${item.checked ? "nicht mehr abhaken" : "abhaken"}`);
      btn.blur();
      renderCounts();
      await save([item]);
    } else if (act === "delete") {
      e.target.closest("[data-act]").blur();
      items = items.filter((i) => i !== item);
      removeLi(li, true);
      refreshRecipeButtons();
      await drop([item.id]);
    }
  });
  $("#shop-sections").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "move") return;
    const sel = e.target, li = sel.closest(".shop-item");
    const item = items.find((i) => i.id === li.dataset.id);
    sel.blur(); // sonst scrollt Safari nach dem Schließen der Auswahl zum (verschobenen) Feld
    item.cat = sel.value;
    // Ansicht an dem Element verankern, das jetzt an der Stelle des Eintrags steht
    const anchor = li.nextElementSibling || li.closest(".shop-cat").nextElementSibling || li.previousElementSibling;
    keepInPlace(anchor, () => {
      removeLi(li, false);
      insertLi(item);
    });
    toast(`${item.emoji} ${item.name} → ${shopCatById(item.cat).label}`);
    await save([item]);
  });

  /* ---------- Gezielte Änderungen statt Neuzeichnen (nichts springt) ---------- */
  function keepInPlace(anchor, fn) {
    const before = anchor && anchor.isConnected ? anchor.getBoundingClientRect().top : null;
    const y = window.scrollY;
    fn();
    if (before != null && anchor.isConnected) window.scrollBy(0, anchor.getBoundingClientRect().top - before);
    else if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }
  function removeLi(li, animate) {
    const sec = li.closest(".shop-cat");
    const finish = () => {
      li.remove();
      if (sec && !sec.querySelector(".shop-item")) sec.remove();
      renderCounts();
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce || !li.animate) return finish();
    li.style.pointerEvents = "none";
    li.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(24px)" }], { duration: 160, easing: "ease-in" }).onfinish = () => {
      li.style.opacity = "0";
      const h = li.offsetHeight;
      li.animate([{ height: h + "px", marginBottom: "0px" }, { height: "0px", marginBottom: "-6px" }], { duration: 160, easing: "ease-out" }).onfinish = finish;
    };
  }
  function sectionFor(cat) {
    let sec = $(`#shop-sections .shop-cat[data-cat="${cat}"]`);
    if (sec) return sec;
    const c = shopCatById(cat);
    const tpl = document.createElement("template");
    tpl.innerHTML = `<section class="shop-cat" data-cat="${c.id}">
        <h3 class="shop-cat-head"><span class="shop-cat-emoji">${c.emoji}</span>${esc(c.label)}<span class="shop-cat-count"></span></h3>
        <ul class="shop-list"></ul></section>`;
    sec = tpl.content.firstElementChild;
    // in der festen Kategorien-Reihenfolge einsortieren
    const order = SHOP_CATS.map((x) => x.id);
    const next = [...document.querySelectorAll("#shop-sections .shop-cat")].find((s) => order.indexOf(s.dataset.cat) > order.indexOf(cat));
    $("#shop-sections").insertBefore(sec, next || null);
    return sec;
  }
  function insertLi(item) {
    const ul = sectionFor(item.cat).querySelector(".shop-list");
    const tpl = document.createElement("template");
    tpl.innerHTML = itemHTML(item).trim();
    const li = tpl.content.firstElementChild;
    const next = [...ul.children].find((el) => (items.find((i) => i.id === el.dataset.id)?.createdAt ?? 0) > item.createdAt);
    ul.insertBefore(li, next || null);
    renderCounts();
    return li;
  }

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

  $("#custom-modal").addEventListener("close", () => { onCustomSaved = null; });

  /** mehrere Zutaten eines Rezepts auf einmal (z. B. nur die fehlenden) */
  async function addSome(recipe, idxs, factor) {
    const added = idxs.filter((idx) => !onList(recipe.id, idx)).map((idx) => {
      const ing = recipe.ingredients[idx];
      return newItem({ name: ing.name, unit: ing.unit, amount: ing.amount == null ? null : ing.amount * factor, recipeId: recipe.id, recipeTitle: recipe.title, ingIndex: idx });
    });
    if (!added.length) return toast("Steht schon alles auf der Liste ✓");
    items.push(...added);
    render();
    refreshRecipeButtons();
    toast(`${added.length} ${added.length === 1 ? "Zutat" : "Zutaten"} auf die Einkaufsliste 🛒`);
    await save(added);
  }

  return { load, toggleIngredient, addAll, addSome, onList, refreshRecipeButtons, openCustoms, putExtra };
})();
