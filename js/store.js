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
    const { data, error } = await sb.from("recipes").select("data").order("created_at", { ascending: true });
    if (error) throw error;
    return data.map((row) => row.data);
  }

  /** speichert ein Rezept; lädt ein neues Bild hoch und räumt das alte auf. Gibt das gespeicherte Rezept zurück. */
  async function cloudPut(recipe, prev = null) {
    let r = { ...recipe, imagePath: prev?.imagePath || recipe.imagePath || null };
    if (r.image && r.image.startsWith("data:")) {
      const path = `${r.id}/${Date.now().toString(36)}.jpg`;
      const { error } = await sb.storage.from(BUCKET).upload(path, dataUrlToBlob(r.image), { contentType: "image/jpeg", upsert: true });
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
    const { error } = await sb.from("recipes").upsert({ id: r.id, data: r, updated_at: new Date().toISOString() });
    if (error) throw error;
    return r;
  }

  async function cloudRemove(recipe) {
    const { error } = await sb.from("recipes").delete().eq("id", recipe.id);
    if (error) throw error;
    await removeImage(recipe.imagePath);
  }

  function onChange(cb, table = "recipes") {
    if (!cloud) return;
    let t;
    sb.channel(table + "-sync")
      .on("postgres_changes", { event: "*", schema: "public", table }, () => { clearTimeout(t); t = setTimeout(cb, 300); })
      .subscribe();
  }

  /* --- Einfache Sammlungen ohne Bilder (Einkaufsliste, Kalender) --- */
  const missingTable = (e) => /PGRST205|42P01|Could not find the table|does not exist/i.test((e?.code || "") + " " + (e?.message || ""));
  const check = ({ error }) => { if (error) { if (missingTable(error)) error.missingTable = true; throw error; } };
  const row = (item) => ({ id: item.id, data: item, updated_at: new Date().toISOString() });
  const simple = (table, localStore) => cloud ? {
    all: async () => {
      const res = await sb.from(table).select("data").order("created_at", { ascending: true });
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
    async signOut() { await sb.auth.signOut(); },
  };

  return {
    cloud, auth, onChange, shop, plan,
    all: () => (cloud ? cloudAll() : DB.all()),
    put: async (recipe, prev) => (cloud ? cloudPut(recipe, prev) : (await DB.put(recipe), recipe)),
    remove: (recipe) => (cloud ? cloudRemove(recipe) : DB.remove(recipe.id)),
    localAll: () => DB.all().catch(() => []),
  };
})();
