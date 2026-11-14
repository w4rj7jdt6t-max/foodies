/* Kleine IndexedDB-Hülle – speichert Rezepte (inkl. Bilder) lokal im Browser. */
const DB = (() => {
  const NAME = "foodies", VERSION = 1, STORE = "recipes";
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const result = fn(store);
      t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }

  return {
    all: () => tx("readonly", (s) => s.getAll()),
    put: (recipe) => tx("readwrite", (s) => s.put(recipe)),
    remove: (id) => tx("readwrite", (s) => s.delete(id)),
  };
})();
