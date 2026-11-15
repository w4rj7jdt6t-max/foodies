/* ================= Bild zuschneiden (rund, für Profilbilder) =================
 * Cropper.open(file) → Promise<DataURL | null>
 * Verschieben (Finger/Maus), Zoomen (zwei Finger, Schieberegler, Mausrad).
 * Ergebnis: quadratisches JPEG 512×512 des sichtbaren Ausschnitts.
 */
const Cropper = (() => {
  const OUT = 512;
  const dlg = document.getElementById("crop-modal");
  const view = document.getElementById("crop-view");
  const img = document.getElementById("crop-img");
  const zoom = document.getElementById("crop-zoom");
  let S = 280, nw = 0, nh = 0, minS = 1, s = 1, x = 0, y = 0, resolve = null, url = null;
  const pointers = new Map();
  let pinch = null;

  function clamp() {
    s = Math.min(Math.max(s, minS), minS * 5);
    x = Math.min(0, Math.max(S - nw * s, x));
    y = Math.min(0, Math.max(S - nh * s, y));
  }
  function paint() {
    clamp();
    img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    zoom.value = String(Math.round(((s / minS) - 1) * 100));
  }
  /** um einen Punkt (px, py) im Ausschnitt zoomen, sodass dieser Punkt stehen bleibt */
  function zoomAt(newS, px = S / 2, py = S / 2) {
    newS = Math.min(Math.max(newS, minS), minS * 5);
    x = px - ((px - x) / s) * newS;
    y = py - ((py - y) / s) * newS;
    s = newS;
    paint();
  }

  function open(file) {
    return new Promise((res, rej) => {
      resolve = res;
      url = URL.createObjectURL(file);
      img.onload = () => {
        nw = img.naturalWidth; nh = img.naturalHeight;
        S = Math.round(Math.min(300, window.innerWidth - 64));
        view.style.width = view.style.height = S + "px";
        img.style.width = nw + "px"; img.style.height = nh + "px";
        minS = Math.max(S / nw, S / nh);
        s = minS;
        x = (S - nw * s) / 2; y = (S - nh * s) / 2; // mittig
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
      c.width = c.height = OUT;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, -x / s, -y / s, S / s, S / s, 0, 0, OUT, OUT);
      out = c.toDataURL("image/jpeg", 0.88);
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

  return { open };
})();
