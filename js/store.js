/* ================= Speicher =================
 * Einheitliche Schnittstelle für Rezepte:
 *  - lokal: IndexedDB im Browser (DB aus db.js)
 *  - cloud: Supabase (Tabelle „recipes“, Bilder im Bucket „recipe-images“)
 */
const Store = (() => {
  const cfg = window.FOODIES_CONFIG || {};
  const cloud = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
  const sb = cloud ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const BUCKET = "recipe-images";
  let hh = null; // aktueller Haushalt (nur Cloud)
  const scoped = (q) => (hh ? q.eq("household_id", hh) : q);

  function dataUrlToBlob(dataUrl) {
    const [head, b64] = dataUrl.split(",");
    const mime = head.match(/data:([^;]+)/)?.[1] || "image/jpeg";
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function removeImage(path) {
    if (path) await sb.storage.from(BUCKET).remove([path]).catch(() => {});
  }

  /* --- Cloud --- */
  async function cloudAll() {
    const { data, error } = await scoped(sb.from("recipes").select("data")).order("created_at", { ascending: true });
    if (error) throw error;
    return data.map((row) => row.data);
  }

  /** speichert ein Rezept; lädt ein neues Bild hoch und räumt das alte auf. Gibt das gespeicherte Rezept zurück. */
  async function cloudPut(recipe, prev = null) {
    let r = { ...recipe, imagePath: prev?.imagePath || recipe.imagePath || null };
    if (r.image && r.image.startsWith("data:")) {
      // neue Bilder liegen im Ordner des Haushalts; jeder Upload bekommt einen neuen Namen (kein Überschreiben nötig)
      const path = `${hh ? hh + "/" : ""}${r.id}/${Date.now().toString(36)}.jpg`;
      const { error } = await sb.storage.from(BUCKET).upload(path, dataUrlToBlob(r.image), { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      if (r.imagePath && r.imagePath !== path) await removeImage(r.imagePath);
      r = { ...r, image: url, imagePath: path };
    } else if (!r.image && r.imagePath) {
      await removeImage(r.imagePath); // Bild wurde entfernt
      r.imagePath = null;
    } else if (r.image && r.imagePath && !r.image.includes(r.imagePath)) {
      await removeImage(r.imagePath); // durch fremdes Bild (z. B. aus Inspiration) ersetzt
      r.imagePath = null;
    }
    const { error } = await sb.from("recipes").upsert({ id: r.id, data: r, updated_at: new Date().toISOString(), ...(hh ? { household_id: hh } : {}) });
    if (error) throw error;
    return r;
  }

  async function cloudRemove(recipe) {
    const { error } = await sb.from("recipes").delete().eq("id", recipe.id);
    if (error) throw error;
    await removeImage(recipe.imagePath);
  }

  // Live-Abos erst starten, wenn der Haushalt feststeht (dann nur dessen Änderungen)
  const listeners = [];
  let active = false;
  function subscribe({ cb, table }) {
    let t;
    sb.channel(`${table}-${hh || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(hh ? { filter: `household_id=eq.${hh}` } : {}) }, () => { clearTimeout(t); t = setTimeout(cb, 300); })
      .subscribe();
  }
  function onChange(cb, table = "recipes") {
    if (!cloud) return;
    const l = { cb, table };
    listeners.push(l);
    if (active) subscribe(l);
  }
  /** Haushalt festlegen und Live-Abos starten (bei Wechsel lädt die App neu) */
  function activate(householdId) {
    hh = householdId || null;
    if (!active) { active = true; listeners.forEach(subscribe); }
  }

  /* --- Einfache Sammlungen ohne Bilder (Einkaufsliste, Kalender) --- */
  const missingTable = (e) => /PGRST205|42P01|Could not find the table|does not exist/i.test((e?.code || "") + " " + (e?.message || ""));
  const check = ({ error }) => { if (error) { if (missingTable(error)) error.missingTable = true; throw error; } };
  const row = (item) => ({ id: item.id, data: item, updated_at: new Date().toISOString(), ...(hh ? { household_id: hh } : {}) });
  const simple = (table, localStore) => cloud ? {
    all: async () => {
      const res = await scoped(sb.from(table).select("data")).order("created_at", { ascending: true });
      check(res);
      return res.data.map((r) => r.data);
    },
    put: async (item) => check(await sb.from(table).upsert(row(item))),
    putMany: async (items) => items.length && check(await sb.from(table).upsert(items.map(row))),
    remove: async (id) => check(await sb.from(table).delete().eq("id", id)),
    removeMany: async (ids) => ids.length && check(await sb.from(table).delete().in("id", ids)),
    onChange: (cb) => onChange(cb, table),
  } : { ...DB.coll(localStore), onChange: () => {} };
  const shop = simple("shopping_items", "shopping");
  const plan = simple("meal_plan", "plan");

  /* --- Anmeldung --- */
  const auth = {
    async session() { return cloud ? (await sb.auth.getSession()).data.session : null; },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    /** Registrierung (nur mit Einladung sinnvoll). Gibt zurück, ob direkt eine Sitzung besteht. */
    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      return !!data.session;
    },
    async signOut() { await sb.auth.signOut(); },
  };

  /* --- Haushalte --- */
  async function rpc(fn, args = {}) {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw error;
    return data;
  }
  const households = {
    /** eigene Mitgliedschaften: [{ id, name, role }] */
    async mine() {
      const s = await auth.session();
      if (!s) return [];
      const q = (cols) => sb.from("household_members").select(`household_id, role, households(${cols})`).eq("user_id", s.user.id);
      let { data, error } = await q("name, subtitle, image_url, image_path, image_src");
      // Bild-SQL noch nicht (vollständig) ausgeführt → mit weniger Feldern weiter
      if (error && /image_src/.test(error.message || "")) ({ data, error } = await q("name, subtitle, image_url, image_path"));
      if (error && /image_(url|path)/.test(error.message || "")) ({ data, error } = await q("name, subtitle"));
      if (error) { if (missingTable(error)) error.missingTable = true; throw error; }
      return data.map((m) => ({ id: m.household_id, role: m.role, name: m.households?.name || "Haushalt", subtitle: m.households?.subtitle || "",
        image_url: m.households?.image_url || null, image_path: m.households?.image_path || null, image_src: m.households?.image_src || null }));
    },
    async members(id) {
      const { data, error } = await sb.from("household_members").select("user_id, role, email, joined_at").eq("household_id", id).order("joined_at");
      if (error) throw error;
      return data;
    },
    rpc,
    /** Haushaltsbild hochladen (DataURL) → { url, path } – liegt im Ordner des Haushalts */
    async uploadImage(hh, dataUrl, suffix = "") {
      const path = `${hh}/haushalt/${Date.now().toString(36)}${suffix}.jpg`;
      const { error } = await sb.storage.from(BUCKET).upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      return { url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path };
    },
    /** Dateien entfernen (Verwalter beim Löschen eines Haushalts) */
    async removeFiles(bucket, paths) {
      if (!paths?.length) return;
      const { error } = await sb.storage.from(bucket).remove(paths);
      if (error) throw error;
    },
    /** Rezepte bestimmter (eigener) Haushalte: [{ data, household_id }] */
    async recipesOf(ids) {
      if (!ids.length) return [];
      const { data, error } = await sb.from("recipes").select("data, household_id").in("household_id", ids);
      if (error) throw error;
      return data;
    },
    get current() { return hh; },
  };

  /* --- Profile & Freunde --- */
  const profiles = {
    async myId() { return (await auth.session())?.user?.id || null; },
    /** eigenes Profil (null = noch keins; wirft missingTable, wenn das Profil-SQL fehlt) */
    async mine() {
      const id = await this.myId();
      if (!id) return null;
      const { data, error } = await sb.from("profiles").select("*").eq("user_id", id).maybeSingle();
      if (error) { if (missingTable(error)) error.missingTable = true; throw error; }
      return data;
    },
    async save(p) {
      const id = await this.myId();
      const row = { user_id: id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url ?? null, avatar_path: p.avatar_path ?? null, avatar_src: p.avatar_src ?? null, updated_at: new Date().toISOString() };
      let { data, error } = await sb.from("profiles").upsert(row).select().single();
      // Bild-SQL noch nicht ausgeführt → ohne Original speichern
      if (error && /avatar_src/.test(error.message || "")) { delete row.avatar_src; ({ data, error } = await sb.from("profiles").upsert(row).select().single()); }
      if (error) throw error;
      return data;
    },
    async byIds(ids) {
      if (!ids.length) return {};
      const { data, error } = await sb.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids);
      if (error) return {};
      return Object.fromEntries(data.map((p) => [p.user_id, p]));
    },
    /** Profilbild hochladen (DataURL) → { url, path } */
    async uploadAvatar(dataUrl, suffix = "") {
      const id = await this.myId();
      const path = `${id}/${Date.now().toString(36)}${suffix}.jpg`;
      const { error } = await sb.storage.from("avatars").upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      return { url: sb.storage.from("avatars").getPublicUrl(path).data.publicUrl, path };
    },
    async removeAvatar(path) { if (path) await sb.storage.from("avatars").remove([path]).catch(() => {}); },
    /** Rezepte eines Freundes (nur lesbar, wenn befreundet) */
    async friendRecipes(userId) {
      const ids = await rpc("friend_households", { p_user: userId });
      if (!ids?.length) return [];
      const { data, error } = await sb.from("recipes").select("data").in("household_id", ids).order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((r) => r.data);
    },
  };

  return {
    cloud, auth, onChange, activate, households, profiles, shop, plan,
    all: () => (cloud ? cloudAll() : DB.all()),
    put: async (recipe, prev) => (cloud ? cloudPut(recipe, prev) : (await DB.put(recipe), recipe)),
    remove: (recipe) => (cloud ? cloudRemove(recipe) : DB.remove(recipe.id)),
    localAll: () => DB.all().catch(() => []),
  };
})();
