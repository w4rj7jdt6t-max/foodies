/* ================= Bild zuschneiden (rund für Profilbilder, 4:3 für Rezeptfotos) =================
 * Cropper.open(quelle, { crop, aspect }) → Promise<{ image, crop, original } | null>
 *   aspect: Seitenverhältnis (Breite/Höhe); 1 = rund (Profil/Haushalt), z. B. 4/3 = rechteckig (Rezept)
 *   quelle: Datei (neu gewählt) oder URL (bestehendes Original → Ausschnitt erneut bearbeiten)
 *   crop:   gespeicherter Ausschnitt { cx, cy, z } – Mittelpunkt (0–1) und Zoom
 *   image:  der Ausschnitt als JPEG-DataURL (512×512)
 *   original: verkleinertes Original als DataURL (nur bei einer neu gewählten Datei)
 * Verschieben (Finger/Maus), Zoomen (zwei Finger, Schieberegler, Mausrad).
 * Ergebnis: quadratisches JPEG 512×512 des sichtbaren Ausschnitts.
 */
const Cropper = (() => {
  const OUT = 512, ORIG_MAX = 1600;
  const dlg = document.getElementById("crop-modal");
  const view = document.getElementById("crop-view");
  const img = document.getElementById("crop-img");
  const zoom = document.getElementById("crop-zoom");
  let W = 280, H = 280, OW = OUT, OH = OUT, nw = 0, nh = 0, minS = 1, s = 1, x = 0, y = 0, resolve = null, url = null;
  const pointers = new Map();
  let pinch = null;

  function clamp() {
    s = Math.min(Math.max(s, minS), minS * 5);
    x = Math.min(0, Math.max(W - nw * s, x));
    y = Math.min(0, Math.max(H - nh * s, y));
  }
  function paint() {
    clamp();
    img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    zoom.value = String(Math.round(((s / minS) - 1) * 100));
  }
  /** um einen Punkt (px, py) im Ausschnitt zoomen, sodass dieser Punkt stehen bleibt */
  function zoomAt(newS, px = W / 2, py = H / 2) {
    newS = Math.min(Math.max(newS, minS), minS * 5);
    x = px - ((px - x) / s) * newS;
    y = py - ((py - y) / s) * newS;
    s = newS;
    paint();
  }

  let isFile = false, startCrop = null;
  async function open(source, { crop = null, aspect = 1 } = {}) {
    isFile = source instanceof Blob;
    startCrop = crop;
    let blob = source;
    if (!isFile) {
      // über fetch laden, damit das Bild auf die Leinwand darf (CORS)
      const r = await fetch(source, { mode: "cors", cache: "no-cache" });
      if (!r.ok) throw new Error("Bild konnte nicht geladen werden");
      blob = await r.blob();
    }
    return new Promise((res, rej) => {
      resolve = res;
      url = URL.createObjectURL(blob);
      img.onload = () => {
        nw = img.naturalWidth; nh = img.naturalHeight;
        const room = Math.min(aspect > 1 ? 340 : 300, window.innerWidth - 64);
        W = Math.round(room); H = Math.round(room / aspect);
        OW = aspect > 1 ? 1200 : OUT; OH = Math.round(OW / aspect);
        view.style.width = W + "px"; view.style.height = H + "px";
        view.classList.toggle("rect", aspect !== 1);
        img.style.width = nw + "px"; img.style.height = nh + "px";
        minS = Math.max(W / nw, H / nh);
        s = minS;
        x = (W - nw * s) / 2; y = (H - nh * s) / 2; // mittig
        if (startCrop) { // gespeicherten Ausschnitt wiederherstellen
          s = minS * (startCrop.z || 1);
          x = W / 2 - startCrop.cx * nw * s;
          y = H / 2 - startCrop.cy * nh * s;
        }
        paint();
      };
      img.onerror = () => { cleanup(); rej(new Error("Bild konnte nicht gelesen werden")); };
      img.src = url;
      dlg.showModal();
      document.body.classList.add("modal-open");
    });
  }
  function cleanup() {
    if (url) URL.revokeObjectURL(url);
    url = null; pointers.clear(); pinch = null;
    if (dlg.open) dlg.close();
  }
  function finish(ok) {
    let out = null;
    if (ok && nw) {
      const c = document.createElement("canvas");
      c.width = OW; c.height = OH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, -x / s, -y / s, W / s, H / s, 0, 0, OW, OH);
      out = { image: c.toDataURL("image/jpeg", 0.86), crop: { cx: (W / 2 - x) / (s * nw), cy: (H / 2 - y) / (s * nh), z: s / minS }, original: null };
      if (isFile) { // Original verkleinert aufheben, damit man später wieder herauszoomen kann
        const k = Math.min(1, ORIG_MAX / Math.max(nw, nh));
        const o = document.createElement("canvas");
        o.width = Math.round(nw * k); o.height = Math.round(nh * k);
        const octx = o.getContext("2d");
        octx.imageSmoothingQuality = "high";
        octx.drawImage(img, 0, 0, o.width, o.height);
        out.original = o.toDataURL("image/jpeg", 0.85);
      }
    }
    const r = resolve; resolve = null;
    cleanup();
    r?.(out);
  }

  /* --- Gesten --- */
  view.addEventListener("pointerdown", (e) => {
    view.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s };
    }
  });
  view.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pointers.size === 1) {
      x += cur.x - prev.x; y += cur.y - prev.y;
      paint();
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const rect = view.getBoundingClientRect();
      zoomAt(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
    }
  });
  const up = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
  view.addEventListener("pointerup", up);
  view.addEventListener("pointercancel", up);
  view.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = view.getBoundingClientRect();
    zoomAt(s * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });
  zoom.addEventListener("input", () => zoomAt(minS * (1 + zoom.value / 100)));

  document.getElementById("crop-ok").addEventListener("click", () => finish(true));
  document.getElementById("crop-cancel").addEventListener("click", () => finish(false));
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); finish(false); });
  dlg.addEventListener("close", () => { if (!document.querySelector(".modal[open]")) document.body.classList.remove("modal-open"); });

  /**
   * Neues Bild wählen (file) oder den Ausschnitt des bestehenden Bilds ändern (file = null).
   * cur: { url, path, src } – src = { url, path, crop } ist das gespeicherte Original
   * upload(dataUrl, suffix) → { url, path }
   * → { url, path, src, remove: [alte Pfade, die nach dem Speichern weg können] } oder null (abgebrochen)
   */
  async function edit(cur, file, upload) {
    const src = cur.src?.url ? cur.src : cur.url ? { url: cur.url, path: cur.path, crop: null } : null;
    const res = await open(file || src.url, { crop: file ? null : src?.crop });
    if (!res) return null;
    const pic = await upload(res.image, "");
    let newSrc = null;
    const remove = [];
    if (file) {
      try { const o = await upload(res.original, "-orig"); newSrc = { url: o.url, path: o.path, crop: res.crop }; }
      catch (err) { console.warn("Original nicht gespeichert", err); }
      remove.push(cur.path, cur.src?.path);
    } else {
      newSrc = { ...src, crop: res.crop };
      if (cur.path !== src.path) remove.push(cur.path); // altes Ausschnitt-Bild; das Original bleibt
    }
    return { url: pic.url, path: pic.path, src: newSrc, remove: [...new Set(remove.filter(Boolean))].filter((p) => p !== newSrc?.path) };
  }

  /** Bild-Bereich für Profil/Haushalt: Bild antippen = Ausschnitt bearbeiten, darunter „Neues Bild“ und „Entfernen“ */
  function pickerHTML({ inputId, imgId, url, fallback, editAttr, removeAttr, label }) {
    const img = url ? `<img src="${esc(url)}" alt="" />` : fallback;
    return `<div class="img-picker">
      <input type="file" accept="image/*" id="${inputId}" hidden />
      ${url
        ? `<button type="button" class="img-picker-pic" ${editAttr} title="Ausschnitt anpassen" aria-label="${esc(label)}: Ausschnitt anpassen">
             <span class="avatar avatar-xl" id="${imgId}">${img}</span><span class="img-picker-badge" aria-hidden="true">✂️</span></button>`
        : `<label class="img-picker-pic" for="${inputId}" title="${esc(label)} wählen"><span class="avatar avatar-xl" id="${imgId}">${img}</span></label>`}
      ${url ? `<p class="img-picker-tip">Bild antippen, um Ausschnitt & Zoom anzupassen</p>` : ""}
      <div class="img-picker-links">
        <label class="ps-avatar-hint img-picker-new" for="${inputId}">📷 ${url ? "Neues Bild" : `${esc(label)} hinzufügen`}</label>
        ${url ? `<button type="button" class="link-btn" ${removeAttr}>Entfernen</button>` : ""}
      </div>
    </div>`;
  }

  return { open, edit, pickerHTML };
})();
