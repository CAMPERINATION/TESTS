/* =====================================================================
   core.js — math, easing, deterministic noise, hand-drawn line system,
   procedural textures and a hand-lettered brush alphabet.
   Everything here is drawn with Canvas 2D; no external assets.
   ===================================================================== */
'use strict';

const W = 1080, H = 1920;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
const TAU = Math.PI * 2;
const Ease = {
  lin: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  back: (t) => { const c = 1.7, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoIn: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
};
// eased progress of an action starting at a, lasting d
const prog = (t, a, d, e = Ease.inOut) => e(inv(a, a + d, t));
// time quantised to a frame rate (anime "on twos/threes")
const step = (t, fps) => Math.floor(t * fps + 1e-6) / fps;

// deterministic hash → [0,1)
function hash(n) {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smoothNoise = (t, s = 0) => Math.sin(t * 1.7 + s * 3.1) * 0.5 + Math.sin(t * 3.3 + s * 1.3) * 0.3 + Math.sin(t * 6.1 + s * 7.7) * 0.2;

// ---------- palette ----------
const PAL = {
  ink: '#22160f',
  fur: '#dba264', furSh: '#b97a41', furHi: '#f0c48a',
  ear: '#9a5a2c', earSh: '#723d1c', earHi: '#b8743d',
  cream: '#f8e6c4', creamSh: '#e5c595',
  nose: '#1a110c',
  coat: '#b98049', coatSh: '#94602f', coatHi: '#d19b5f', coatDk: '#6f4520',
  hat: '#b27c45', hatSh: '#8c5a2b', hatLine: '#6e421e', hatLine2: '#d9a868', bow: '#5e3517',
  shirt: '#4b2c17',
  button: '#3f2512',
  glassRim: '#1f1814', glassHandle: '#2a1d15',
  paper: '#f5ecd9', paperSh: '#e3d3b4',
  red: '#c8322a', redDk: '#8e1f19',
  navy: '#1a1f2e', charcoal: '#1c1a1d',
  wood: '#6b4127', woodDk: '#4a2b19', woodHi: '#8a5a37',
  lamp: '#2f4a3f', lampHi: '#4f7564',
  light: '#ffd98a',
};

// ---------- line boil ----------
// Three deterministic variants of every outline, cycled at ~10 fps.
const BOIL = { variant: 0, amp: 1.1 };
function setBoil(t, fps = 10) { BOIL.variant = Math.floor(t * fps) % 3; }
function jit(seed, i, axis) {
  return (hash(seed * 7919 + i * 131 + axis * 17 + BOIL.variant * 104729) - 0.5) * 2;
}

// Smooth closed/open curve through points (Catmull-Rom → Bézier)
function curvePath(ctx, pts, closed = true, tension = 1) {
  const n = pts.length;
  if (n < 2) return;
  const P = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 6;
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
function boiled(pts, seed, amp) {
  const a = amp == null ? BOIL.amp : amp;
  return pts.map((p, i) => [p[0] + jit(seed, i, 0) * a, p[1] + jit(seed, i, 1) * a]);
}

// Painterly texture strokes that follow a direction (cached per seed)
const TEX_CACHE = new Map();
function texStrokes(ctx, seed, box, o) {
  const key = seed + ':' + o.n;
  let list = TEX_CACHE.get(key);
  if (!list) {
    const r = rng(seed * 31 + 7);
    list = [];
    for (let i = 0; i < o.n; i++) list.push([r(), r(), r(), r(), r()]);
    TEX_CACHE.set(key, list);
  }
  const [x0, y0, x1, y1] = box;
  ctx.lineCap = 'round';
  for (const [a, b, c, d, e] of list) {
    const x = lerp(x0, x1, a), y = lerp(y0, y1, b);
    const ang = (o.dir || 0) + (c - 0.5) * (o.spread == null ? 0.6 : o.spread);
    const L = (o.len || 18) * (0.6 + d * 0.8);
    const dx = Math.cos(ang) * L, dy = Math.sin(ang) * L;
    ctx.beginPath();
    ctx.moveTo(x - dx / 2, y - dy / 2);
    ctx.quadraticCurveTo(x + dy * 0.15 * (e - 0.5), y - dx * 0.15 * (e - 0.5), x + dx / 2, y + dy / 2);
    ctx.strokeStyle = e > 0.55 ? o.color : (o.color2 || o.color);
    ctx.globalAlpha = (o.alpha || 0.35) * (0.5 + e * 0.5);
    ctx.lineWidth = (o.width || 2.4) * (0.6 + d * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* shape(): the basic hand-drawn primitive.
   pts: control points of a smooth outline. o: {fill, line, lw, seed, amp, closed, tex, shade(ctx), noLine} */
function shape(ctx, pts, o = {}) {
  const seed = o.seed || 1;
  const P = boiled(pts, seed, o.amp);
  const closed = o.closed !== false;
  ctx.beginPath(); curvePath(ctx, P, closed, o.tension || 1);
  if (o.fill && closed) { ctx.fillStyle = o.fill; ctx.fill(); }
  if ((o.tex || o.shade) && closed) {
    ctx.save(); ctx.clip();
    if (o.shade) o.shade(ctx);
    if (o.tex) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      texStrokes(ctx, seed, [x0, y0, x1, y1], o.tex);
    }
    ctx.restore();
    ctx.beginPath(); curvePath(ctx, P, closed, o.tension || 1);
  }
  if (!o.noLine) inkStroke(ctx, o.lw == null ? 6 : o.lw, o.line || PAL.ink, seed);
}
// Variable-width ink: main stroke + an offset thinner pass that thickens "shadow side" edges
function inkStroke(ctx, lw, color, seed = 1) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
  ctx.save();
  ctx.translate(lw * 0.22, lw * 0.3);
  ctx.globalAlpha *= 0.55; ctx.lineWidth = lw * 0.55; ctx.stroke();
  ctx.restore();
}
// A single hand-drawn line (open) with tapered ends
function inkLine(ctx, pts, lw, color = PAL.ink, seed = 3, amp) {
  const P = boiled(pts, seed, amp);
  // taper: draw 3 passes with decreasing width over shrinking sub-ranges
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.beginPath(); curvePath(ctx, P, false); ctx.lineWidth = lw * 0.55; ctx.stroke();
  if (P.length >= 3) {
    const mid = P.slice(1, -1);
    if (mid.length >= 2) { ctx.beginPath(); curvePath(ctx, mid, false); ctx.lineWidth = lw; ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(mid[0][0], mid[0][1]); ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]); ctx.lineWidth = lw * 0.85; ctx.stroke(); }
  }
}
function ellipsePts(cx, cy, rx, ry, n = 12, rot = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

// ---------- procedural textures ----------
const TEX = {};
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function buildTextures() {
  // film grain, 3 variants (stepped at 12 fps)
  TEX.grain = [0, 1, 2].map((v) => {
    const c = makeCanvas(256, 256), g = c.getContext('2d');
    const img = g.createImageData(256, 256), r = rng(900 + v);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = r();
      const val = n * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = Math.abs(n - 0.5) > 0.35 ? 38 : 0;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
  // paper: soft blotches + fibres
  const p = makeCanvas(512, 512), g = p.getContext('2d'), r = rng(77);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, rad = 6 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const v = r() > 0.5 ? 255 : 0;
    gr.addColorStop(0, `rgba(${v},${v},${v},${0.035 + r() * 0.03})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 1400; i++) {
    const x = r() * 512, y = r() * 512, a = r() * TAU, L = 3 + r() * 10;
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
    g.lineWidth = 0.6 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
  TEX.paper = p;
  // screen-tone dots
  const d = makeCanvas(12, 12), dg = d.getContext('2d');
  dg.fillStyle = 'rgba(20,12,8,1)'; dg.beginPath(); dg.arc(3, 3, 1.6, 0, TAU); dg.arc(9, 9, 1.6, 0, TAU); dg.fill();
  TEX.tone = d;
  // cork board
  const ck = makeCanvas(256, 256), cg = ck.getContext('2d'), rc = rng(55);
  cg.fillStyle = '#9c6b3f'; cg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = rc();
    cg.fillStyle = v > 0.5 ? `rgba(70,40,18,${0.25 + rc() * 0.35})` : `rgba(210,160,100,${0.15 + rc() * 0.3})`;
    cg.fillRect(rc() * 256, rc() * 256, 1 + rc() * 2.5, 1 + rc() * 2.5);
  }
  TEX.cork = ck;
  // wood grain
  const wd = makeCanvas(512, 128), wg = wd.getContext('2d'), rw = rng(12);
  wg.fillStyle = PAL.wood; wg.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 90; i++) {
    const y = rw() * 128;
    wg.strokeStyle = rw() > 0.5 ? 'rgba(40,20,10,0.25)' : 'rgba(160,110,70,0.18)';
    wg.lineWidth = 0.8 + rw() * 2;
    wg.beginPath(); wg.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) wg.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (rw() - 0.5) * 2);
    wg.stroke();
  }
  TEX.wood = wd;
}

function tonePattern(ctx) { return ctx.createPattern(TEX.tone, 'repeat'); }

// ---------- hand-lettered brush alphabet ----------
// Each glyph: array of strokes; each stroke: points in a 0..10 (x) × 0..14 (y) box. Width in the same units.
const GLYPHS = {
  A: { w: 9, s: [[[0, 14], [4.5, 0], [9, 14]], [[2, 9], [7, 9]]] },
  B: { w: 8, s: [[[1, 0], [1, 14]], [[1, 0], [5.5, 0], [7.5, 2], [7, 5.5], [4.5, 7], [1, 7]], [[4.5, 7], [7.5, 8.5], [8, 11.5], [6, 14], [1, 14]]] },
  C: { w: 8, s: [[[8, 2], [5.5, 0], [2, 1.5], [0.5, 7], [2, 12.5], [5.5, 14], [8, 12]]] },
  D: { w: 8.5, s: [[[1, 0], [1, 14]], [[1, 0], [5, 0.5], [8, 4], [8, 10], [5, 13.5], [1, 14]]] },
  E: { w: 7.5, s: [[[7.5, 0], [1, 0], [1, 14], [7.5, 14]], [[1, 7], [6, 7]]] },
  F: { w: 7, s: [[[7, 0], [1, 0], [1, 14]], [[1, 7], [5.5, 7]]] },
  G: { w: 8.5, s: [[[8, 2], [5.5, 0], [2, 1.5], [0.5, 7], [2, 12.5], [5.5, 14], [8.2, 12], [8.2, 8], [5, 8]]] },
  H: { w: 8.5, s: [[[1, 0], [1, 14]], [[7.5, 0], [7.5, 14]], [[1, 7], [7.5, 7]]] },
  I: { w: 3, s: [[[1.5, 0], [1.5, 14]]] },
  L: { w: 7, s: [[[1, 0], [1, 14], [7, 14]]] },
  M: { w: 10, s: [[[0.5, 14], [1, 0], [5, 9], [9, 0], [9.5, 14]]] },
  N: { w: 8.5, s: [[[1, 14], [1, 0], [7.5, 14], [7.5, 0]]] },
  O: { w: 9, s: [[[4.5, 0], [1, 2.5], [0.3, 7], [1.2, 11.5], [4.5, 14], [7.8, 11.5], [8.7, 7], [8, 2.5], [4.5, 0], [3.5, 0.3]]] },
  P: { w: 7.5, s: [[[1, 14], [1, 0], [5, 0], [7.5, 2], [7.5, 5.5], [5, 7.5], [1, 7.5]]] },
  R: { w: 8, s: [[[1, 14], [1, 0], [5, 0], [7.5, 2], [7.5, 5.5], [5, 7.5], [1, 7.5]], [[4, 7.5], [8, 14]]] },
  S: { w: 7.5, s: [[[7, 1.8], [4.5, 0], [1.5, 1], [1, 4], [4, 6.8], [6.8, 9], [6.8, 12.3], [4, 14], [0.8, 12.5]]] },
  T: { w: 8, s: [[[0, 0.5], [8, 0.2]], [[4, 0.3], [4, 14]]] },
  U: { w: 8.5, s: [[[1, 0], [1, 10], [3, 13.8], [5.5, 13.8], [7.5, 10], [7.5, 0]]] },
  V: { w: 9, s: [[[0, 0], [4.5, 14], [9, 0]]] },
  W: { w: 12, s: [[[0, 0], [2.8, 14], [6, 3], [9.2, 14], [12, 0]]] },
  Y: { w: 8.5, s: [[[0, 0], [4.25, 7]], [[8.5, 0], [4.25, 7], [4.25, 14]]] },
  Z: { w: 8, s: [[[0.5, 0.5], [7.5, 0.5], [0.5, 13.5], [7.8, 13.5]]] },
  K: { w: 8, s: [[[1, 0], [1, 14]], [[7.5, 0], [1.5, 8]], [[3.5, 6], [8, 14]]] },
  '?': { w: 7, s: [[[0.8, 3], [2.5, 0.3], [5.5, 0.5], [6.5, 3], [5, 6], [3.5, 8], [3.5, 10]]], dot: [3.5, 13.3] },
  '.': { w: 3, s: [], dot: [1.5, 13.3] },
  ',': { w: 3, s: [[[1.8, 12.5], [1, 15]]] },
  '#': { w: 9, s: [[[3, 1], [2, 13]], [[7, 1], [6, 13]], [[0.5, 4.5], [9, 4.5]], [[0, 9.5], [8.5, 9.5]]] },
  '1': { w: 5, s: [[[0.5, 3], [3.5, 0], [3.5, 14]], [[0.5, 14], [5.5, 14]]] },
  '2': { w: 7.5, s: [[[0.8, 3], [3, 0.2], [6, 0.8], [6.8, 3.8], [4.5, 7.5], [0.5, 13.8], [7.5, 13.8]]] },
  '3': { w: 7.5, s: [[[0.8, 1.8], [3.5, 0.2], [6.5, 1.2], [6.5, 4.5], [3.5, 6.8], [6.8, 9], [6.8, 12.3], [3.8, 14], [0.6, 12.5]]] },
  '4': { w: 8, s: [[[6, 14], [6, 0], [0.5, 9.5], [8, 9.5]]] },
  '/': { w: 6, s: [[[5.5, 0], [0.5, 14]]] },
  ' ': { w: 4.5, s: [] },
};
/* brushText: draw hand-lettered text. size = cap height in px.
   o: {color, width (relative 0..), align, spacing, rough, seed, shadow} */
function brushText(ctx, str, x, y, size, o = {}) {
  const k = size / 14;
  const sp = (o.spacing == null ? 2.2 : o.spacing);
  const glyphs = [...str.toUpperCase()].map((c) => GLYPHS[c] || GLYPHS[' ']);
  const total = glyphs.reduce((a, g) => a + g.w + sp, -sp) * k;
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  const lw = (o.width || 2.1) * k;
  const seed = o.seed || 11;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const draw = (color, dx, dy, wmul, pass) => {
    let gx = cx;
    glyphs.forEach((g, gi) => {
      g.s.forEach((st, si) => {
        const pts = st.map(([px, py], pi) => [gx + px * k + dx + jit(seed + gi * 13 + si, pi, 0) * k * 0.28 * (o.rough || 1), y - 14 * k + py * k + dy + jit(seed + gi * 13 + si, pi, 1) * k * 0.28 * (o.rough || 1)]);
        ctx.strokeStyle = color;
        ctx.beginPath();
        if (pts.length === 2) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); }
        else curvePath(ctx, pts, false, 0.6);
        ctx.lineWidth = lw * wmul; ctx.stroke();
        // dry-brush second pass
        if (pass === 0 && o.dry !== false) {
          ctx.save(); ctx.globalAlpha *= 0.5; ctx.lineWidth = lw * wmul * 0.45;
          ctx.translate(lw * 0.18, -lw * 0.15); ctx.stroke(); ctx.restore();
        }
      });
      if (g.dot) {
        ctx.fillStyle = color; ctx.beginPath();
        ctx.arc(gx + g.dot[0] * k + dx, y - 14 * k + g.dot[1] * k + dy, lw * wmul * 0.62, 0, TAU); ctx.fill();
      }
      gx += (g.w + sp) * k;
    });
  };
  if (o.shadow) draw(o.shadow, lw * 0.35, lw * 0.4, 1, 1);
  if (o.outline) draw(o.outline, 0, 0, 1.9, 1);
  draw(o.color || PAL.ink, 0, 0, 1, 0);
  ctx.restore();
  return total;
}
function brushTextWidth(str, size, spacing = 2.2) {
  const k = size / 14;
  return [...str.toUpperCase()].map((c) => GLYPHS[c] || GLYPHS[' ']).reduce((a, g) => a + g.w + spacing, -spacing) * k;
}
// Reveal a string letter by letter (hand-writing feel)
function brushTextReveal(ctx, str, x, y, size, p, o = {}) {
  const n = Math.floor(str.length * clamp(p) + 0.999);
  if (n <= 0) return;
  const full = brushTextWidth(str, size, o.spacing);
  const part = str.slice(0, n);
  const startX = o.align === 'left' ? x : o.align === 'right' ? x - full : x - full / 2;
  brushText(ctx, part, startX, y, size, Object.assign({}, o, { align: 'left' }));
}
