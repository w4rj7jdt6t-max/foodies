/* ================= Automatisches Rezeptbild =================
 * Rezeptname → (auf Englisch übersetzt) → passende Fotos aus
 *   1. TheMealDB (saubere Gerichtsfotos, wenn der Name passt)
 *   2. Openverse (Millionen frei lizenzierter Fotos, u. a. Flickr/Wikimedia)
 * Das gewählte Foto wird heruntergeladen und wie ein eigenes gespeichert.
 */
const AutoImage = (() => {
  const cache = new Map();
  const STOP = new Set(["with", "and", "the", "a", "of", "in", "on", "style", "recipe", "my", "our", "homemade", "classic", "easy", "quick"]);
  const words = (s) => String(s).toLowerCase().replace(/[^a-zäöüß\s-]/g, " ").split(/[\s-]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

  async function toEnglish(title) {
    if (typeof TR === "undefined") return title;
    try { const [en] = await withTimeout(TR.many([title]), 6000, [title]); return en || title; } catch { return title; }
  }

  async function fromMealDb(en) {
    try {
      const res = await fetch("https://www.themealdb.com/api/json/v1/1/search.php?s=" + encodeURIComponent(en));
      const meals = (await res.json()).meals || [];
      const want = words(en);
      return meals
        .map((m) => ({ m, score: words(m.strMeal).filter((w) => want.includes(w)).length }))
        .filter((x) => x.score >= Math.min(2, want.length))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ m }) => ({ src: m.strMealThumb, credit: { title: m.strMeal, by: "TheMealDB", license: "", link: `https://www.themealdb.com/meal/${m.idMeal}` } }));
    } catch { return []; }
  }

  async function fromOpenverse(q) {
    try {
      const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&mature=false`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .filter((r) => r.thumbnail && (!r.width || !r.height || (r.width / r.height >= 0.9 && r.width / r.height <= 2.2)))
        .slice(0, 12)
        .map((r) => ({
          src: r.thumbnail,
          credit: { title: r.title || "", by: r.creator || "", license: r.license ? `CC ${String(r.license).toUpperCase()}${r.license_version ? " " + r.license_version : ""}` : "", link: r.foreign_landing_url || "" },
        }));
    } catch { return []; }
  }

  /** passende Bild-Kandidaten für einen Rezeptnamen */
  function candidates(title) {
    const key = title.trim().toLowerCase();
    if (!cache.has(key)) {
      cache.set(key, (async () => {
        const en = await toEnglish(title.trim());
        const [meal, ov] = await Promise.all([fromMealDb(en), fromOpenverse(en)]);
        let list = [...meal, ...ov];
        if (list.length < 3) {
          // kürzer suchen: die zwei wichtigsten Wörter (z. B. „tomato pasta“), notfalls der deutsche Name
          const short = words(en).slice(-2).join(" ");
          if (short && short !== en.toLowerCase()) list = [...list, ...(await fromOpenverse(short))];
          if (list.length < 3 && en !== title) list = [...list, ...(await fromOpenverse(title))];
        }
        const seen = new Set();
        return list.filter((c) => !seen.has(c.src) && seen.add(c.src));
      })().catch(() => []));
    }
    return cache.get(key);
  }

  /** Kandidat herunterladen → verkleinerte JPEG-DataURL (wird dann wie ein eigenes Foto gespeichert) */
  async function load(c) {
    const res = await fetch(c.src);
    if (!res.ok) throw new Error("Bild nicht erreichbar");
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) throw new Error("Kein Bild");
    return compressImage(blob, 1200, 0.85);
  }

  /** erstes ladbares Bild ab Position start */
  async function pick(title, start = 0) {
    const list = await candidates(title);
    for (let i = 0; i < list.length; i++) {
      const idx = (start + i) % list.length;
      try { return { dataUrl: await load(list[idx]), credit: list[idx].credit, idx, total: list.length }; } catch {}
    }
    return null;
  }

  return { candidates, pick };
})();
