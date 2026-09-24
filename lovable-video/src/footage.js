// Real screen-recording footage: frame loading, cropped/framed drawing, callouts.
(function () {
  'use strict';
  const K = window.KDP;
  const { COL, clamp, lerp, E, inv, rr, fillStroke } = K;

  const SRC_W = 1912, SRC_H = 1080;
  const cache = new Map(); // key -> {img, ok}
  let need = null;         // when set, collects frame keys required by a render pass
  const MAX_CACHE = 90;

  K.FRAMES = null; // frames/index.json

  function keyFor(clip, st) {
    const m = K.FRAMES[clip];
    const i = clamp(Math.floor(st * m.fps + 1e-6), 0, m.count - 1) + 1;
    return `frames/${clip}/${String(i).padStart(4, '0')}.jpg`;
  }
  function load(key) {
    let e = cache.get(key);
    if (e) { cache.delete(key); cache.set(key, e); return e; } // LRU touch
    const img = new Image();
    e = { img, ok: false };
    e.p = new Promise((res) => { img.onload = () => { e.ok = true; res(); }; img.onerror = () => res(); });
    img.src = key;
    cache.set(key, e);
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return e;
  }
  // Render-mode helpers: collect required frames, wait until decoded.
  K.beginCollect = () => { need = new Set(); };
  K.endCollect = async () => { const keys = [...need]; need = null; await Promise.all(keys.map((k) => load(k).p)); };
  K.preloadClip = (clip) => { const m = K.FRAMES[clip]; for (let i = 0; i < Math.min(m.count, 40); i++) load(keyFor(clip, i / m.fps)); };

  // Interpolate crop rectangles: keys [[time, {x,y,w,h}], ...]
  K.rectAt = function (s, keys, ease = E.inOut) {
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a] = keys[i], [t1, b] = keys[i + 1];
      if (s <= t1) { const u = ease(inv(t0, t1, s)); return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u) }; }
    }
    return keys[keys.length - 1][1];
  };

  // Fit a crop into a max box (keeps the crop's aspect; no invented pixels).
  function fitBox(crop, box) {
    const a = crop.w / crop.h;
    let w = box.w, h = w / a;
    if (h > box.h) { h = box.h; w = h * a; }
    return { x: box.cx - w / 2, y: box.cy - h / 2, w, h };
  }

  // Draw real footage. o: {clip, st, crop, box:{cx,cy,w,h}, alpha, scale}
  // Returns a mapper from source coords to canvas coords (for callouts).
  K.footage = function (ctx, o) {
    const crop = o.crop;
    const b = fitBox(crop, o.box);
    const k = o.scale || 1;
    const d = { x: o.box.cx - (b.w * k) / 2, y: o.box.cy - (b.h * k) / 2, w: b.w * k, h: b.h * k };
    const key = keyFor(o.clip, o.st);
    if (need) need.add(key);
    const e = load(key);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    // soft shadow + frame
    ctx.save(); ctx.translate(0, 14); rr(ctx, d.x - 6, d.y - 6, d.w + 12, d.h + 12, 26); ctx.fillStyle = 'rgba(58,36,25,0.18)'; ctx.fill(); ctx.restore();
    rr(ctx, d.x - 6, d.y - 6, d.w + 12, d.h + 12, 26); ctx.fillStyle = COL.cocoaDk; ctx.fill();
    ctx.save(); rr(ctx, d.x, d.y, d.w, d.h, 20); ctx.clip();
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(d.x, d.y, d.w, d.h);
    if (e.ok) ctx.drawImage(e.img, crop.x, crop.y, crop.w, crop.h, d.x, d.y, d.w, d.h);
    ctx.restore();
    ctx.restore();
    const sc = d.w / crop.w;
    return { rect: d, map: (x, y) => [d.x + (x - crop.x) * sc, d.y + (y - crop.y) * sc], scale: sc };
  };

  // Outline callout around a source-space rect (never covers the content).
  K.callout = function (ctx, fm, r, p, o = {}) {
    if (p <= 0 || !fm) return;
    const [x0, y0] = fm.map(r.x, r.y), [x1, y1] = fm.map(r.x + r.w, r.y + r.h);
    const pad = o.pad || 10;
    const x = x0 - pad, y = y0 - pad, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
    ctx.save();
    ctx.globalAlpha *= clamp(p * 2) * (o.alpha == null ? 1 : o.alpha);
    rr(ctx, x, y, w, h, 16);
    ctx.strokeStyle = o.color || COL.berry; ctx.lineWidth = 8; ctx.setLineDash([Math.max(1, (w + h) * 2 * E.out(clamp(p))), 99999]);
    ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    if (o.label) K.tag(ctx, o.label, o.labelX != null ? o.labelX : x + w / 2, o.labelY != null ? o.labelY : y - 34, p, o.labelColor || COL.berry);
  };

  // Small label pill ("Real Lovable preview", "sped up", ...)
  K.tag = function (ctx, str, x, y, p, bg = COL.cocoaDk, color = '#fff8ee', size = 34) {
    if (p <= 0) return;
    const w = K.textWidth(ctx, str, size, 600) + 40;
    ctx.save(); ctx.globalAlpha *= clamp(p * 2);
    ctx.translate(x, y); const sc = lerp(0.8, 1, E.back(clamp(p))); ctx.scale(sc, sc);
    rr(ctx, -w / 2, -size * 0.75, w, size * 1.5, size * 0.75); ctx.fillStyle = bg; ctx.fill();
    K.text(ctx, str, 0, 2, size, { color, weight: 600 });
    ctx.restore();
  };

  K.SRC_W = SRC_W; K.SRC_H = SRC_H;
})();
