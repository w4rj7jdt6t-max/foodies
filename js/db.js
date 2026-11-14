/* Kleine IndexedDB-Hülle – lokaler Speicher, falls keine gemeinsame Sammlung eingerichtet ist. */
const DB = (() => {
  const NAME = "foodies", VERSION = 3, STORES = ["recipes", "shopping", "plan"];
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          STORES.forEach((s) => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" }); });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const result = fn(t.objectStore(store));
      t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }

  const coll = (store) => ({
    all: () => tx(store, "readonly", (s) => s.getAll()),
    put: (item) => tx(store, "readwrite", (s) => s.put(item)),
    putMany: (items) => tx(store, "readwrite", (s) => { items.forEach((i) => s.put(i)); }),
    remove: (id) => tx(store, "readwrite", (s) => s.delete(id)),
    removeMany: (ids) => tx(store, "readwrite", (s) => { ids.forEach((id) => s.delete(id)); }),
  });

  const recipes = coll("recipes");
  return { ...recipes, coll };
})();
