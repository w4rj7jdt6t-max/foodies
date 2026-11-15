/* ================= Haushalte: Einladungen, Gründen, Beitreten, Verwalten =================
 * Jeder Account gehört zu einem (oder mehreren) Haushalten und sieht nur dessen Daten.
 * - „Neues Paar“-Einladung (nur der Verwalter): gründet einen eigenen Haushalt
 * - „Haushalt beitreten“-Einladung (Mitglieder mit Bearbeiten-Recht): tritt genau diesem Haushalt bei
 * Die Datenbank erzwingt diese Regeln – die App zeigt nur die passenden Knöpfe.
 */
const Household = (() => {
  const INVITE_KEY = "foodies-invite", HH_KEY = "foodies-household";
  const ROLE_LABEL = { owner: "Eigentümer", editor: "Bearbeiten", viewer: "Nur ansehen" };
  let mine = [], current = null, isAdmin = false, myId = null;

  /* ---------- Einladungscode aus Link/Text ---------- */
  const codeFrom = (text) => {
    const t = String(text || "").trim();
    const m = t.match(/[?&]invite=([a-z0-9]+)/i);
    return (m ? m[1] : t).replace(/[^a-z0-9]/gi, "").toLowerCase() || null;
  };
  const pending = () => { try { return localStorage.getItem(INVITE_KEY); } catch { return null; } };
  const setPending = (c) => { try { c ? localStorage.setItem(INVITE_KEY, c) : localStorage.removeItem(INVITE_KEY); } catch {} };
  const inviteLink = (code) => `${location.origin}${location.pathname}?invite=${code}`;

  // Link mit ?invite=… geöffnet → merken und aus der Adresszeile entfernen
  const fromUrl = new URLSearchParams(location.search).get("invite");
  if (fromUrl) {
    setPending(codeFrom(fromUrl));
    history.replaceState(null, "", location.pathname + location.hash);
  }

  async function inviteInfo(code) {
    try { return await Store.households.rpc("invite_info", { p_code: code }); } catch { return null; }
  }
  const errText = (e) => String(e?.message || "").replace(/^.*?ERROR:\s*/, "") || "Das hat nicht geklappt. Seid ihr online?";

  /* ---------- Anmeldeseite: Einladung anzeigen & Registrierung anbieten ---------- */
  let signupMode = false;
  function setLoginMode(signup) {
    signupMode = signup;
    $("#login-form").dataset.mode = signup ? "signup" : "login";
    $("#login-title").textContent = signup ? "Konto erstellen" : "Willkommen zurück";
    $("#login-sub").textContent = signup ? "Wähle deine E-Mail und ein Passwort (mind. 6 Zeichen)." : "Meldet euch an, um eure gemeinsame Rezeptsammlung zu sehen.";
    $("#login-submit").textContent = signup ? "Registrieren" : "Anmelden";
    $("#login-password").setAttribute("autocomplete", signup ? "new-password" : "current-password");
    $("#login-switch").textContent = signup ? "Ich habe schon ein Konto – anmelden" : "Noch kein Konto? Mit Einladung registrieren";
    $("#login-error").hidden = true;
  }
  $("#login-switch").addEventListener("click", () => setLoginMode(!signupMode));

  async function prepareLogin() {
    const code = pending();
    const box = $("#invite-box");
    if (!code) { box.hidden = true; $("#login-switch").hidden = true; setLoginMode(false); return; }
    const info = await inviteInfo(code);
    if (!info || !info.valid) {
      box.innerHTML = `⚠️ Diese Einladung ist ${info ? "abgelaufen oder schon benutzt" : "ungültig"}. Bitte lass dir einen neuen Link schicken.`;
      box.className = "invite-box is-bad";
      box.hidden = false;
      setPending(null);
      $("#login-switch").hidden = true;
      return setLoginMode(false);
    }
    box.className = "invite-box";
    box.innerHTML = info.kind === "household"
      ? `🎉 <strong>Du wurdest zu foodies eingeladen!</strong><br />Nach der Registrierung gründet ihr euren eigenen Haushalt.`
      : `🎉 <strong>Einladung in den Haushalt „${esc(info.household || "")}“</strong><br />Rolle: ${esc(ROLE_LABEL[info.role] || info.role)}`;
    box.hidden = false;
    $("#login-emoji").textContent = "💌";
    $("#login-switch").hidden = false;
    setLoginMode(true);
  }

  /* ---------- Nach der Anmeldung: Haushalt bestimmen (ggf. Einladung annehmen) ---------- */
  let resolveSetup = null;
  async function setup() {
    try {
      const s = await Store.auth.session();
      myId = s?.user?.id || null;
      mine = await Store.households.mine();
    } catch (err) {
      console.error(err);
      if (err?.missingTable) {
        // Datenbank noch ohne Haushalte → wie bisher ohne Haushalt weiterarbeiten
        Store.activate(null);
        return true;
      }
      toast("Haushalt konnte nicht geladen werden – seid ihr online?");
      return false;
    }
    const code = pending();
    if (code) {
      const info = await inviteInfo(code);
      if (info?.valid) return showOnboarding(info.kind === "household" ? "found" : "join", { code, info });
      setPending(null);
      if (!mine.length) toast("Diese Einladung ist abgelaufen oder schon benutzt.");
    }
    if (!mine.length) return showOnboarding("none");
    return choose();
  }

  function choose(preferId) {
    let saved = preferId;
    if (!saved) { try { saved = localStorage.getItem(HH_KEY); } catch {} }
    current = mine.find((h) => h.id === saved) || mine[0];
    try { localStorage.setItem(HH_KEY, current.id); } catch {}
    Store.activate(current.id);
    applyCurrent();
    Store.households.rpc("is_app_admin").then((v) => { isAdmin = !!v; }).catch(() => {});
    return true;
  }

  function applyCurrent() {
    $("#onboard").hidden = true;
    $("#btn-household").hidden = false;
    $("#hh-name").textContent = current.name;
    $("#brand-sub").textContent = current.subtitle || "by toem";
    const ro = current.role === "viewer";
    document.body.classList.toggle("readonly", ro);
    $("#readonly-pill").hidden = !ro;
  }

  /* ---------- Gründen / Beitreten / „Einladung nötig“ ---------- */
  let ob = null;
  function showOnboarding(mode, data = {}) {
    ob = { mode, ...data };
    document.body.classList.add("locked");
    $("#login").hidden = true;
    $("#onboard").hidden = false;
    $("#ob-error").hidden = true;
    $("#ob-name-field").hidden = mode !== "found";
    $("#ob-code-field").hidden = mode !== "none";
    $("#ob-logout").hidden = false;
    // wer schon in einem Haushalt ist, kann die Einladung auch einfach verwerfen
    $("#ob-skip").hidden = !(mine.length && mode !== "none");
    if (mode === "found") {
      $("#ob-emoji").textContent = "🏡";
      $("#ob-title").textContent = "Gründet euren Haushalt";
      $("#ob-text").textContent = "Gebt eurem Haushalt einen Namen. Danach könnt ihr euren Partner oder eure Partnerin einladen.";
      $("#ob-submit").textContent = "Haushalt gründen";
      setTimeout(() => $("#ob-name").focus(), 50);
    } else if (mode === "join") {
      $("#ob-emoji").textContent = "👋";
      $("#ob-title").textContent = `„${data.info.household}“ beitreten`;
      $("#ob-text").textContent = `Du wurdest in diesen Haushalt eingeladen (Rolle: ${ROLE_LABEL[data.info.role] || data.info.role}).`;
      $("#ob-submit").textContent = "Beitreten";
    } else {
      $("#ob-emoji").textContent = "💌";
      $("#ob-title").textContent = "Du brauchst eine Einladung";
      $("#ob-text").textContent = "foodies ist nur auf Einladung nutzbar. Hast du einen Einladungslink bekommen? Füge ihn hier ein.";
      $("#ob-submit").textContent = "Einladung einlösen";
    }
    // beim ersten Mal wartet setup() auf das Ergebnis; bei Moduswechsel bleibt es dieselbe Wartestelle
    return resolveSetup ? null : new Promise((res) => { resolveSetup = res; });
  }

  $("#onboard-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#ob-submit"), err = $("#ob-error");
    err.hidden = true;
    if (ob.mode === "none") {
      const code = codeFrom($("#ob-code").value);
      if (!code) return;
      const info = await inviteInfo(code);
      if (!info?.valid) { err.textContent = info ? "Diese Einladung ist abgelaufen oder schon benutzt." : "Diese Einladung gibt es nicht."; err.hidden = false; return; }
      setPending(code);
      showOnboarding(info.kind === "household" ? "found" : "join", { code, info });
      return;
    }
    const name = $("#ob-name").value.trim();
    if (ob.mode === "found" && !name) { $("#ob-name").focus(); return; }
    btn.disabled = true;
    try {
      const hhId = await Store.households.rpc("accept_invite", { p_code: ob.code, p_household_name: ob.mode === "found" ? name : null });
      setPending(null);
      mine = await Store.households.mine();
      document.body.classList.remove("locked");
      const r = resolveSetup;
      resolveSetup = null;
      r(choose(hhId));
      toast(ob.mode === "found" ? `🏡 Willkommen in „${name}“!` : "👋 Willkommen im Haushalt!");
      if (ob.mode === "found") setTimeout(() => open(), 900); // gleich Partner einladen
    } catch (ex) {
      err.textContent = errText(ex);
      err.hidden = false;
    } finally { btn.disabled = false; }
  });
  $("#ob-skip").addEventListener("click", () => {
    setPending(null);
    $("#onboard").hidden = true;
    document.body.classList.remove("locked");
    const r = resolveSetup; resolveSetup = null;
    r?.(choose());
  });
  $("#ob-logout").addEventListener("click", async () => { await Store.auth.signOut(); location.href = location.pathname; });

  /* ---------- Haushalt-Fenster ---------- */
  async function open() {
    if (!current) return;
    openModal($("#hh-modal"));
    await render();
  }
  $("#btn-household").addEventListener("click", open);

  async function render() {
    const body = $("#hh-body");
    const canWrite = current.role !== "viewer", isOwner = current.role === "owner";
    let members = [], invites = [], adminData = null, profs = {};
    try {
      members = await Store.households.members(current.id);
      profs = await Profile.byIds(members.map((m) => m.user_id));
      if (canWrite) invites = await Store.households.rpc("list_invites", { p_household: current.id });
      if (isAdmin) adminData = { invites: await Store.households.rpc("list_invites", { p_household: null }), list: await Store.households.rpc("admin_households") };
    } catch (err) { console.error(err); }

    body.innerHTML = `
      ${mine.length > 1 || isAdmin ? `<div class="hh-pills" role="tablist" aria-label="Haushalt wechseln">
        ${mine.map((h) => `<button type="button" class="subtab hh-pill ${h.id === current.id ? "is-active" : ""}" data-hh="switch" data-id="${h.id}" aria-selected="${h.id === current.id}">${esc(h.name)}</button>`).join("")}
        ${isAdmin ? `<button type="button" class="subtab hh-pill hh-new" data-hh="new-open">＋ Neu</button>` : ""}
      </div>
      <form class="card hh-card hh-new-form" id="hh-new-form" hidden>
        <h3>Neuer Haushalt</h3>
        <p class="muted pf-note">Z. B. „Urlaub Toskana“ – danach lädst du die anderen ein. Eure bisherigen Haushalte bleiben getrennt.</p>
        <label class="field"><span>Name</span><input type="text" id="hh-new-name" maxlength="60" placeholder="z. B. Urlaub" /></label>
        <div class="hh-invite-btns"><button type="submit" class="btn btn-primary">Haushalt anlegen</button><button type="button" class="btn btn-ghost" data-hh="new-cancel">Abbrechen</button></div>
      </form>` : ""}

      <section class="card hh-card">
        <h3>${esc(current.name)}</h3>
        <p class="muted hh-role">Deine Rolle: <b>${esc(ROLE_LABEL[current.role])}</b></p>
        ${isOwner ? `<div class="hh-edit">
          <label class="field"><span>Name</span><input type="text" id="hh-edit-name" maxlength="60" value="${esc(current.name)}" /></label>
          <label class="field"><span>Untertitel oben auf der Seite</span><input type="text" id="hh-edit-sub" maxlength="80" value="${esc(current.subtitle || "")}" placeholder="by toem" /></label>
          <button type="button" class="btn btn-soft" data-hh="save">Speichern</button>
        </div>` : ""}
      </section>

      <section class="card hh-card">
        <h3>Mitglieder</h3>
        <ul class="hh-list">${members.map((m) => { const p = profs[m.user_id]; return `<li>
          <span class="avatar avatar-sm">${avatarHTML(p)}</span>
          <span class="hh-who"><b>${esc(p?.display_name || m.email || "Unbekannt")}</b>${p ? ` <small>@${esc(p.username)}</small>` : ""}${m.user_id === myId ? " <small>(du)</small>" : ""}</span>
          ${isOwner && m.user_id !== myId
            ? `<select class="hh-role-sel" data-user="${m.user_id}" aria-label="Rolle">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${k === m.role ? "selected" : ""}>${v}</option>`).join("")}</select>
               <button type="button" class="shop-del" data-hh="remove" data-user="${m.user_id}" aria-label="Entfernen">✕</button>`
            : `<span class="hh-badge">${esc(ROLE_LABEL[m.role])}</span>`}
        </li>`; }).join("")}</ul>
        ${canWrite ? `<div class="hh-invite">
          <p class="muted">Jemanden in <b>diesen</b> Haushalt einladen – der Link gilt einmal und 14 Tage:</p>
          <div class="hh-invite-btns">
            <button type="button" class="btn btn-primary" data-hh="invite" data-role="editor">＋ Einladen (Bearbeiten)</button>
            <button type="button" class="btn btn-soft" data-hh="invite" data-role="viewer">＋ Einladen (Nur ansehen)</button>
          </div>
          <div id="hh-link-out"></div>
          ${invites.length ? `<p class="muted hh-open">Offene Einladungen:</p><ul class="hh-list">${invites.map((i) => `<li>
            <span class="hh-who">${esc(ROLE_LABEL[i.role])} · bis ${new Date(i.expires_at).toLocaleDateString("de-DE")}</span>
            <button type="button" class="btn btn-ghost hh-mini" data-hh="share" data-code="${i.code}">Link</button>
            <button type="button" class="shop-del" data-hh="revoke" data-code="${i.code}" aria-label="Zurückziehen">✕</button></li>`).join("")}</ul>` : ""}
        </div>` : ""}
        <button type="button" class="link-btn hh-leave" data-hh="leave">Haushalt verlassen</button>
      </section>

      ${adminData ? `<section class="card hh-card hh-admin">
        <h3>⭐ Verwaltung</h3>
        <p class="muted">Nur du siehst diesen Bereich. Mit einem „Neues Paar“-Link gründet jemand einen eigenen, leeren Haushalt (gilt einmal, 30 Tage).</p>
        <div class="hh-row">
          <input type="text" id="hh-new-label" placeholder="Für wen? z. B. Lisa & Ben (optional)" maxlength="60" />
          <button type="button" class="btn btn-primary" data-hh="new-couple">＋ Neues Paar einladen</button>
        </div>
        <div id="hh-admin-out"></div>
        ${adminData.invites.length ? `<p class="muted hh-open">Offene Paar-Einladungen:</p><ul class="hh-list">${adminData.invites.map((i) => `<li>
          <span class="hh-who">${esc(i.label || "ohne Namen")} · bis ${new Date(i.expires_at).toLocaleDateString("de-DE")}</span>
          <button type="button" class="btn btn-ghost hh-mini" data-hh="share" data-code="${i.code}">Link</button>
          <button type="button" class="shop-del" data-hh="revoke" data-code="${i.code}" aria-label="Zurückziehen">✕</button></li>`).join("")}</ul>` : ""}
        <p class="muted hh-open">Haushalte in foodies:</p>
        <ul class="hh-list">${adminData.list.map((h) => `<li><span class="hh-avatar">🏡</span><span class="hh-who"><b>${esc(h.name)}</b><small> · ${h.members} Mitgl. · ${h.recipes} Rezepte</small></span></li>`).join("")}</ul>
      </section>` : ""}`;
  }

  function showLink(target, code, text) {
    const link = inviteLink(code);
    $(target).innerHTML = `<div class="hh-link">
      <p>${esc(text)}</p>
      <input type="text" readonly value="${esc(link)}" class="hh-link-input" />
      <div class="hh-invite-btns">
        ${navigator.share ? `<button type="button" class="btn btn-primary" data-hh="do-share" data-link="${esc(link)}">Teilen …</button>` : ""}
        <button type="button" class="btn btn-soft" data-hh="copy" data-link="${esc(link)}">Kopieren</button>
      </div></div>`;
  }

  $("#hh-body").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-hh]");
    if (!b) return;
    const act = b.dataset.hh;
    try {
      if (act === "switch") {
        if (b.dataset.id === current.id) return;
        try { localStorage.setItem(HH_KEY, b.dataset.id); } catch {}
        location.reload(); // sauber mit den Daten des anderen Haushalts neu starten
        return;
      }
      if (act === "new-open") { $("#hh-new-form").hidden = false; $("#hh-new-name").focus(); return; }
      if (act === "new-cancel") { $("#hh-new-form").hidden = true; return; }
      if (act === "save") {
        const name = $("#hh-edit-name").value.trim(), sub = $("#hh-edit-sub").value.trim();
        await Store.households.rpc("update_household", { p_household: current.id, p_name: name, p_subtitle: sub });
        Object.assign(current, { name, subtitle: sub });
        applyCurrent(); toast("Gespeichert ✓"); return render();
      }
      if (act === "invite") {
        const code = await Store.households.rpc("create_member_invite", { p_household: current.id, p_role: b.dataset.role });
        await render();
        return showLink("#hh-link-out", code, `Schick diesen Link an die Person (${ROLE_LABEL[b.dataset.role]}):`);
      }
      if (act === "new-couple") {
        const code = await Store.households.rpc("create_household_invite", { p_label: $("#hh-new-label").value.trim() || null });
        await render();
        return showLink("#hh-admin-out", code, "Schick diesen Link an das Paar – damit gründen sie ihren eigenen Haushalt:");
      }
      if (act === "share") return showLink(b.closest(".hh-admin") ? "#hh-admin-out" : "#hh-link-out", b.dataset.code, "Einladungslink:");
      if (act === "do-share") { try { await navigator.share({ title: "Einladung zu foodies", text: "Komm zu foodies 🌿", url: b.dataset.link }); } catch {} return; }
      if (act === "copy") {
        try { await navigator.clipboard.writeText(b.dataset.link); toast("Link kopiert 📋"); }
        catch { const i = b.closest(".hh-link").querySelector("input"); i.select(); toast("Link markiert – jetzt kopieren"); }
        return;
      }
      if (act === "revoke") { await Store.households.rpc("revoke_invite", { p_code: b.dataset.code }); toast("Einladung zurückgezogen"); return render(); }
      if (act === "remove" || act === "leave") {
        const self = act === "leave";
        if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = self ? "Wirklich verlassen?" : "Sicher?"; setTimeout(() => { if (b.isConnected) render(); }, 3000); return; }
        await Store.households.rpc("remove_member", { p_household: current.id, p_user: self ? myId : b.dataset.user });
        if (self) { try { localStorage.removeItem(HH_KEY); } catch {} location.reload(); return; }
        toast("Mitglied entfernt"); return render();
      }
    } catch (ex) { toast(errText(ex)); }
  });
  $("#hh-body").addEventListener("submit", async (e) => {
    if (e.target.id !== "hh-new-form") return;
    e.preventDefault();
    const name = $("#hh-new-name").value.trim();
    if (!name) return $("#hh-new-name").focus();
    try {
      const id = await Store.households.rpc("create_household", { p_name: name });
      try { localStorage.setItem(HH_KEY, id); } catch {}
      toast(`🏡 „${name}“ angelegt`);
      setTimeout(() => location.reload(), 600);
    } catch (ex) { toast(errText(ex)); }
  });
  $("#hh-body").addEventListener("change", async (e) => {
    if (e.target.classList.contains("hh-role-sel")) {
      try {
        await Store.households.rpc("set_member_role", { p_household: current.id, p_user: e.target.dataset.user, p_role: e.target.value });
        toast("Rolle geändert ✓");
      } catch (ex) { toast(errText(ex)); }
      render();
    }
  });

  return { get mine() { return mine; }, setup, prepareLogin, get signupMode() { return signupMode; }, get current() { return current; }, get readOnly() { return current?.role === "viewer"; }, pending };
})();
