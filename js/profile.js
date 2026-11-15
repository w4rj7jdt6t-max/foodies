/* ================= Profil & Freunde =================
 * Profil: Anzeigename, @Benutzername (eindeutig, zum Finden) und Profilbild – unabhängig vom Login.
 * Freunde: Anfrage → Annahme. Freunde sehen gegenseitig NUR die Rezepte (schreibgeschützt),
 * nie Kalender, Einkaufsliste oder Kühlschrank. Das erzwingt die Datenbank.
 */
const DEFAULT_AVATAR = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#d9ece2"/><circle cx="32" cy="25" r="11" fill="#8cc5ad"/><path d="M12 54c3-11 11-17 20-17s17 6 20 17" fill="#8cc5ad"/></svg>`;
function avatarHTML(p) {
  return p?.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" loading="lazy" />` : DEFAULT_AVATAR;
}

const Profile = (() => {
  let me = null, available = true, friends = [];
  const errText = (e) => {
    const m = String(e?.message || "");
    if (/profiles_username_key|duplicate/i.test(m)) return "Dieser Benutzername ist schon vergeben – bitte einen anderen wählen.";
    if (/username_format/i.test(m)) return "Benutzername: 3–20 Zeichen, nur Kleinbuchstaben, Zahlen, Punkt und _.";
    if (/display_name_len/i.test(m)) return "Bitte gib einen Namen ein (max. 40 Zeichen).";
    return m.replace(/^.*?ERROR:\s*/, "") || "Das hat nicht geklappt. Seid ihr online?";
  };
  const suggestUsername = (name) => String(name || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9._]+/g, "").slice(0, 20);
  const cleanUsername = (u) => String(u || "").trim().toLowerCase().replace(/^@/, "");

  function paintMe() {
    $("#btn-profile").hidden = !me;
    $("#my-avatar").innerHTML = avatarHTML(me);
  }

  /* ---------- Beim Start: Profil vorhanden? Sonst einmalig anlegen ---------- */
  let resolveSetup = null, pendingAvatar = null;
  async function ensure() {
    try { me = await Store.profiles.mine(); }
    catch (err) {
      if (err?.missingTable) { available = false; return true; } // Profil-SQL noch nicht ausgeführt → ohne Profile weiter
      console.error(err);
      toast("Profil konnte nicht geladen werden – seid ihr online?");
      return false;
    }
    if (me) { paintMe(); refreshFriends(); return true; }
    // Einmalige Einrichtung
    document.body.classList.add("locked");
    $("#login").hidden = true;
    $("#profile-setup").hidden = false;
    $("#ps-avatar").innerHTML = DEFAULT_AVATAR;
    setTimeout(() => $("#ps-name").focus(), 50);
    return new Promise((res) => { resolveSetup = res; });
  }
  let usernameTouched = false;
  $("#ps-name").addEventListener("input", () => { if (!usernameTouched) $("#ps-username").value = suggestUsername($("#ps-name").value); });
  $("#ps-username").addEventListener("input", () => { usernameTouched = true; });
  $("#ps-avatar-input").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try { pendingAvatar = await compressImage(f, 400, 0.85); $("#ps-avatar").innerHTML = `<img src="${pendingAvatar}" alt="" />`; } catch (err) { toast(err.message); }
  });
  $("#ps-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#ps-submit"), err = $("#ps-error");
    err.hidden = true;
    const display_name = $("#ps-name").value.trim(), username = cleanUsername($("#ps-username").value);
    if (!display_name) return $("#ps-name").focus();
    btn.disabled = true;
    try {
      let av = {};
      if (pendingAvatar) { try { const u = await Store.profiles.uploadAvatar(pendingAvatar); av = { avatar_url: u.url, avatar_path: u.path }; } catch (ex) { console.error(ex); toast("Profilbild konnte nicht hochgeladen werden – du kannst es später ändern."); } }
      me = await Store.profiles.save({ display_name, username, ...av });
      pendingAvatar = null;
      $("#profile-setup").hidden = true;
      document.body.classList.remove("locked");
      paintMe();
      toast(`Hallo ${display_name}! 👋`);
      const r = resolveSetup; resolveSetup = null; r(true);
    } catch (ex) { err.textContent = errText(ex); err.hidden = false; }
    finally { btn.disabled = false; }
  });

  /* ---------- Freunde laden (für Hinweis-Punkt & Liste) ---------- */
  async function refreshFriends() {
    if (!available || !me) return;
    try { friends = (await Store.households.rpc("my_friends")) || []; } catch { friends = []; }
    $("#friend-dot").hidden = !friends.some((f) => f.status === "incoming");
  }

  /* ---------- Profil-Fenster ---------- */
  async function open() {
    if (!me) return;
    openModal($("#profile-modal"));
    await refreshFriends();
    render();
  }
  $("#btn-profile").addEventListener("click", open);

  const personRow = (p, actions) => `<li class="pf-person">
      <span class="avatar avatar-sm">${avatarHTML(p)}</span>
      <span class="hh-who"><b>${esc(p.display_name)}</b> <small>@${esc(p.username)}</small></span>
      ${actions}</li>`;

  function render() {
    const incoming = friends.filter((f) => f.status === "incoming");
    const outgoing = friends.filter((f) => f.status === "outgoing");
    const mates = friends.filter((f) => f.status === "friends");
    $("#pf-body").innerHTML = `
      <section class="card hh-card pf-me">
        <label class="ps-avatar pf-avatar" title="Profilbild ändern">
          <input type="file" accept="image/*" id="pf-avatar-input" hidden />
          <span class="avatar avatar-xl" id="pf-avatar">${avatarHTML(me)}</span>
          <span class="ps-avatar-hint">📷 Ändern</span>
        </label>
        ${me.avatar_url ? `<button type="button" class="link-btn pf-remove-avatar" data-pf="remove-avatar">Bild entfernen</button>` : ""}
        <label class="field"><span>Dein Name</span><input type="text" id="pf-name" maxlength="40" value="${esc(me.display_name)}" /></label>
        <label class="field"><span>Benutzername</span><span class="at-field"><span>@</span><input type="text" id="pf-username" maxlength="20" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(me.username)}" /></span></label>
        <button type="button" class="btn btn-soft" data-pf="save">Speichern</button>
      </section>

      <section class="card hh-card">
        <h3>Freunde finden</h3>
        <p class="muted pf-note">Befreundete sehen gegenseitig eure <b>Rezepte</b> – nie Kalender, Einkaufsliste oder Kühlschrank.</p>
        <label class="search pf-search"><span aria-hidden="true">🔎</span><input type="search" id="pf-search" placeholder="@benutzername oder Name" autocomplete="off" autocapitalize="off" /></label>
        <ul class="hh-list" id="pf-results"></ul>
      </section>

      ${incoming.length ? `<section class="card hh-card pf-incoming">
        <h3>Anfragen an dich</h3>
        <ul class="hh-list">${incoming.map((f) => personRow(f, `<button type="button" class="btn btn-primary hh-mini" data-pf="accept" data-user="${f.user_id}">Annehmen</button><button type="button" class="shop-del" data-pf="decline" data-user="${f.user_id}" aria-label="Ablehnen">✕</button>`)).join("")}</ul>
      </section>` : ""}

      <section class="card hh-card">
        <h3>Meine Freunde ${mates.length ? `<span class="shop-cat-count">${mates.length}</span>` : ""}</h3>
        ${mates.length ? `<ul class="hh-list">${mates.map((f) => personRow(f, `<button type="button" class="btn btn-soft hh-mini" data-pf="view" data-user="${f.user_id}">📖 Rezepte</button><button type="button" class="shop-del" data-pf="unfriend" data-user="${f.user_id}" aria-label="Freundschaft beenden">✕</button>`)).join("")}</ul>`
          : `<p class="muted pf-note">Noch keine Freunde – such oben nach einem @Benutzernamen.</p>`}
        ${outgoing.length ? `<p class="muted hh-open">Gesendete Anfragen:</p><ul class="hh-list">${outgoing.map((f) => personRow(f, `<span class="hh-badge">wartet</span><button type="button" class="shop-del" data-pf="unfriend" data-user="${f.user_id}" aria-label="Anfrage zurückziehen">✕</button>`)).join("")}</ul>` : ""}
      </section>`;
  }

  let searchTimer;
  $("#pf-body").addEventListener("input", (e) => {
    if (e.target.id !== "pf-search") return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(search, 300);
  });
  async function search() {
    const q = $("#pf-search")?.value.trim() || "";
    const out = $("#pf-results");
    if (q.replace(/^@/, "").length < 2) { out.innerHTML = ""; return; }
    let list = [];
    try { list = (await Store.households.rpc("search_profiles", { p_query: q })) || []; } catch (err) { console.error(err); }
    const label = { none: `<button type="button" class="btn btn-primary hh-mini" data-pf="request" data-user="{id}">＋ Anfragen</button>`, outgoing: `<span class="hh-badge">angefragt</span>`, incoming: `<button type="button" class="btn btn-primary hh-mini" data-pf="accept" data-user="{id}">Annehmen</button>`, friends: `<span class="hh-badge">✓ Freunde</span>` };
    out.innerHTML = list.length ? list.map((p) => personRow(p, label[p.status].replace("{id}", p.user_id))).join("") : `<li class="muted pf-none">Niemand gefunden.</li>`;
  }

  $("#pf-body").addEventListener("change", async (e) => {
    if (e.target.id !== "pf-avatar-input") return;
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const dataUrl = await compressImage(f, 400, 0.85);
      $("#pf-avatar").innerHTML = `<img src="${dataUrl}" alt="" />`;
      const u = await Store.profiles.uploadAvatar(dataUrl);
      const old = me.avatar_path;
      me = await Store.profiles.save({ ...me, avatar_url: u.url, avatar_path: u.path });
      Store.profiles.removeAvatar(old);
      paintMe(); render(); toast("Profilbild gespeichert ✓");
    } catch (ex) { toast(errText(ex)); render(); }
  });

  $("#pf-body").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-pf]");
    if (!b) return;
    const act = b.dataset.pf, user = b.dataset.user;
    try {
      if (act === "save") {
        const display_name = $("#pf-name").value.trim(), username = cleanUsername($("#pf-username").value);
        me = await Store.profiles.save({ ...me, display_name, username });
        paintMe(); toast("Profil gespeichert ✓"); return render();
      }
      if (act === "remove-avatar") {
        const old = me.avatar_path;
        me = await Store.profiles.save({ ...me, avatar_url: null, avatar_path: null });
        Store.profiles.removeAvatar(old);
        paintMe(); return render();
      }
      if (act === "request") {
        const st = await Store.households.rpc("send_friend_request", { p_user: user });
        toast(st === "friends" ? "Ihr seid jetzt befreundet 🎉" : "Anfrage gesendet ✓");
        await refreshFriends(); render(); return;
      }
      if (act === "accept" || act === "decline") {
        await Store.households.rpc("respond_friend_request", { p_user: user, p_accept: act === "accept" });
        toast(act === "accept" ? "Ihr seid jetzt befreundet 🎉" : "Anfrage abgelehnt");
        await refreshFriends(); render(); return;
      }
      if (act === "unfriend") {
        if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Sicher?"; setTimeout(() => { if (b.isConnected) render(); }, 3000); return; }
        await Store.households.rpc("remove_friend", { p_user: user });
        if (state.viewing?.user.user_id === user) leaveFriendView();
        await refreshFriends(); render(); return;
      }
      if (act === "view") {
        closeModal($("#profile-modal"));
        return viewFriend(friends.find((f) => f.user_id === user));
      }
    } catch (ex) { toast(errText(ex)); }
  });

  /* ---------- Rezepte eines Freundes ansehen ---------- */
  async function viewFriend(f) {
    if (!f) return;
    toast(`Lade Rezepte von ${f.display_name} …`);
    let recipes = [];
    try { recipes = (await Store.profiles.friendRecipes(f.user_id)).map(normalize); }
    catch (err) { console.error(err); return toast("Rezepte konnten nicht geladen werden"); }
    state.viewing = { user: f, recipes };
    state.category = "all"; state.tags.clear(); state.search = ""; $("#search").value = "";
    document.body.classList.add("friend-view");
    $("#friend-banner").hidden = false;
    $("#fb-avatar").innerHTML = avatarHTML(f);
    $("#fb-text").innerHTML = `<b>${esc(f.display_name)}</b> <small>@${esc(f.username)} · nur ansehen</small>`;
    document.querySelector('.tab[data-tab="rezepte"]').click();
    renderList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function leaveFriendView() {
    state.viewing = null;
    state.category = "all"; state.tags.clear();
    document.body.classList.remove("friend-view");
    $("#friend-banner").hidden = true;
    renderList();
  }
  $("#fb-back").addEventListener("click", leaveFriendView);

  /** Profile mehrerer Nutzer (z. B. für die Mitgliederliste im Haushalt) */
  const byIds = (ids) => (available ? Store.profiles.byIds(ids) : Promise.resolve({}));

  return { ensure, byIds, refreshFriends, leaveFriendView, get me() { return me; }, get available() { return available; } };
})();
