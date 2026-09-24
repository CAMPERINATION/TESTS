// Core helpers: math, easing, seeded randomness, text, shapes, camera.
(function () {
  'use strict';
  const KDP = (window.KDP = window.KDP || {});

  const W = 1080, H = 1920;
  const FONT = '"Fredoka", "Trebuchet MS", "DejaVu Sans", sans-serif';

  const COL = {
    ink: '#2b2140',
    paper: '#fffaf1',
    cream: '#fff1d6',
    coral: '#ff6b5b',
    coralDk: '#e0483a',
    teal: '#2ec4b6',
    tealDk: '#1f9c90',
    sun: '#ffc93c',
    lilac: '#b8a4ff',
    lilacDk: '#8e76ee',
    mint: '#a6ecd0',
    sky: '#8fd3ff',
    plum: '#2b2140',
    plum2: '#4a2e6d',
    grey: '#b9b3c6',
    greyDk: '#8a8399',
    green: '#34c47c',
    red: '#e8403a',
    white: '#ffffff',
  };

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
  const E = {
    lin: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    out5: (t) => 1 - Math.pow(1 - t, 5),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
    back: (t) => {
      const c1 = 1.9, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    elastic: (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },
  };
  // progress of an animation that starts at `start` and lasts `dur` seconds
  const A = (s, start, dur, ease = E.out) => ease(inv(start, start + dur, s));
  // 0 → 1 with overshoot (for pops)
  const pop = (s, start, dur = 0.5) => E.back(inv(start, start + dur, s));
  // fade in at a, fade out at b
  const window01 = (s, a, b, fin = 0.3, fout = 0.3) =>
    Math.min(A(s, a, fin, E.out), 1 - A(s, b - fout, fout, E.in));

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth deterministic noise
  const noise = (t, seed = 0) =>
    Math.sin(t * 1.3 + seed * 12.9) * 0.5 + Math.sin(t * 2.7 + seed * 4.1) * 0.3 + Math.sin(t * 5.1 + seed * 7.3) * 0.2;

  // ---------- shapes ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillStroke(ctx, fill, stroke = COL.ink, lw = 6) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); }
  function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); }
  function line(ctx, pts, color = COL.ink, lw = 6) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function star(ctx, x, y, r, points = 4, inner = 0.35, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i * Math.PI) / points - Math.PI / 2;
      const rr_ = i % 2 === 0 ? r : r * inner;
      const px = x + Math.cos(a) * rr_, py = y + Math.sin(a) * rr_;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  // soft drop shadow ellipse
  function shadow(ctx, x, y, rx, ry, a = 0.18) {
    ctx.save(); ctx.globalAlpha *= a; ellipse(ctx, x, y, rx, ry); ctx.fillStyle = '#1b1030'; ctx.fill(); ctx.restore();
  }
  // hand-drawn check mark
  function check(ctx, x, y, s, color = COL.green, prog = 1) {
    const pts = [[-0.5, 0], [-0.15, 0.38], [0.6, -0.5]];
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
    const p1 = clamp(prog * 2), p2 = clamp(prog * 2 - 1);
    ctx.lineTo(lerp(pts[0][0], pts[1][0], p1) * s, lerp(pts[0][1], pts[1][1], p1) * s);
    if (p2 > 0) ctx.lineTo(lerp(pts[1][0], pts[2][0], p2) * s, lerp(pts[1][1], pts[2][1], p2) * s);
    ctx.strokeStyle = color; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }
  // hand-drawn loop circle (for marking things), prog 0..1
  function markCircle(ctx, x, y, rx, ry, prog, color = COL.red, lw = 10, seed = 1) {
    if (prog <= 0) return;
    const r = rng(seed);
    const jit = r() * 0.3;
    ctx.beginPath();
    const steps = 60, end = prog * 1.12;
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * end;
      const a = -2.2 + u * Math.PI * 2;
      const wob = 1 + Math.sin(u * 9 + jit * 10) * 0.035 + u * 0.06;
      const px = x + Math.cos(a) * rx * wob, py = y + Math.sin(a) * ry * wob;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function strike(ctx, x0, y0, x1, y1, prog, color = COL.red, lw = 10) {
    if (prog <= 0) return;
    line(ctx, [x0, y0, lerp(x0, x1, prog), lerp(y0, y1, prog)], color, lw);
  }

  // ---------- text ----------
  function font(size, weight = 700) { return `${weight} ${size}px ${FONT}`; }
  function text(ctx, str, x, y, size, o = {}) {
    ctx.save();
    ctx.font = font(size, o.weight || 700);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.outline) {
      ctx.lineWidth = o.outlineWidth || size * 0.18;
      ctx.strokeStyle = o.outline; ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || COL.ink;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function textWidth(ctx, str, size, weight = 700) { ctx.save(); ctx.font = font(size, weight); const w = ctx.measureText(str).width; ctx.restore(); return w; }

  // A pill caption. p: 0..1 appear progress (pop). Lines allowed via \n.
  function caption(ctx, str, x, y, size, p, o = {}) {
    if (p <= 0.001) return;
    const lines = str.split('\n');
    const lh = size * 1.18;
    const w = Math.max(...lines.map((l) => textWidth(ctx, l, size, o.weight || 700)));
    const pad = o.pad != null ? o.pad : size * 0.45;
    const bw = w + pad * 2, bh = lh * lines.length + pad * 1.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    const sc = o.noScale ? 1 : lerp(0.6, 1, E.back(clamp(p)));
    ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(p * 2.2);
    if (o.bg !== null) {
      ctx.save(); ctx.translate(8, 10); rr(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(bh / 2, size * 0.7)); ctx.fillStyle = 'rgba(30,16,50,0.25)'; ctx.fill(); ctx.restore();
      rr(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(bh / 2, size * 0.7));
      fillStroke(ctx, o.bg || COL.paper, o.border === undefined ? COL.ink : o.border, o.borderWidth || 6);
    }
    lines.forEach((l, i) => {
      text(ctx, l, 0, (i - (lines.length - 1) / 2) * lh + size * 0.04, size, { color: o.color || COL.ink, weight: o.weight });
    });
    ctx.restore();
  }
  // Text revealed left to right (typewriter by characters), returns visible string
  function typed(str, p) { return str.slice(0, Math.round(str.length * clamp(p))); }

  // ---------- camera ----------
  // cam: {x, y, z, r}; factor: parallax depth (0 = static, 1 = normal, >1 foreground)
  function applyCam(ctx, cam, factor = 1) {
    const z = 1 + (cam.z - 1) * factor;
    ctx.translate(W / 2, H / 2);
    ctx.rotate((cam.r || 0) * factor);
    ctx.scale(z, z);
    ctx.translate(-W / 2 - cam.x * factor, -H / 2 - cam.y * factor);
  }
  function layer(ctx, cam, factor, fn) { ctx.save(); applyCam(ctx, cam, factor); fn(); ctx.restore(); }
  // interpolate camera keyframes: keys = [[time, {x,y,z,r}], ...]
  function camAt(s, keys, ease = E.inOut) {
    const base = { x: 0, y: 0, z: 1, r: 0 };
    const k = keys.map(([t, c]) => [t, Object.assign({}, base, c)]);
    if (s <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) {
      const [t0, c0] = k[i], [t1, c1] = k[i + 1];
      if (s <= t1) {
        const u = ease(inv(t0, t1, s));
        return { x: lerp(c0.x, c1.x, u), y: lerp(c0.y, c1.y, u), z: lerp(c0.z, c1.z, u), r: lerp(c0.r, c1.r, u) };
      }
    }
    return k[k.length - 1][1];
  }
  function shake(s, at, dur = 0.35, amp = 14) {
    const u = inv(at, at + dur, s);
    if (u <= 0 || u >= 1) return { x: 0, y: 0 };
    const k = (1 - u) * amp;
    return { x: Math.sin(s * 90) * k, y: Math.cos(s * 77) * k };
  }

  // ---------- generic pose interpolation ----------
  // keys: [[time, partialPose], ...]; numeric fields interpolate, others step.
  function poseAt(s, defaults, keys, ease = E.inOut) {
    const full = [];
    let acc = Object.assign({}, defaults);
    for (const [t, p] of keys) { acc = Object.assign({}, acc, p); full.push([t, acc]); }
    if (!full.length) return Object.assign({}, defaults);
    if (s <= full[0][0]) return Object.assign({}, full[0][1]);
    for (let i = 0; i < full.length - 1; i++) {
      const [t0, a] = full[i], [t1, b] = full[i + 1];
      if (s < t1) {
        const u = ease(inv(t0, t1, s));
        const out = {};
        for (const key in b) {
          const va = a[key], vb = b[key];
          if (typeof va === 'number' && typeof vb === 'number') out[key] = lerp(va, vb, u);
          else out[key] = u < 0.35 ? va : vb;
        }
        return out;
      }
    }
    return Object.assign({}, full[full.length - 1][1]);
  }

  Object.assign(KDP, {
    W, H, FONT, COL, clamp, lerp, inv, E, A, pop, window01, rng, noise,
    rr, fillStroke, circle, ellipse, line, star, shadow, check, markCircle, strike,
    font, text, textWidth, caption, typed, applyCam, layer, camAt, shake, poseAt,
  });
})();
