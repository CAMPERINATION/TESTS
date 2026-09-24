/* =====================================================================
   dog.js — the detective dog character rig (redrawn in code from the
   supplied character sheet). Units: ~470 units tall, origin at the
   ground between the feet, y up = negative.

   PROPORTIONS lives at the top: change the numbers there to adjust him.
   ===================================================================== */
'use strict';

const PROPORTIONS = {
  headY: -338,       // head centre above the ground
  neckY: -262,       // where the head sits on the coat
  headScale: 1.0,    // overall head size (1 = matches the sheet)
  shoulderX: 74, shoulderY: -236,
  upperArm: 72, foreArm: 66,
  hipY: -60,
  earLength: 1.0,
  coatHem: -56,
};

// Default pose. Every field can be keyed in a scene.
const POSE0 = {
  view: 'front',        // 'front' (use turn for 3/4), 'side', 'back'
  turn: 0,              // -1..1: 0 = front, ±0.6 = 3/4 left/right
  dir: 1,               // side view facing: 1 right, -1 left
  x: 0, y: 0, s: 1,
  lean: 0, bob: 0, squash: 1,
  headTilt: 0, headX: 0, headY: 0,
  eyeX: 0, eyeY: 0, blink: 0, lid: 0, eyeSize: 1,
  browL: 0.6, browR: 0.6, browRaise: 0,   // brow angle: + = determined (inner end down)
  mouth: 'frown',                          // frown | flat | o | smirk | grit | open
  earL: 0, earR: 0, earFlow: 0,            // ear swing (radians) and trailing (running)
  armL: null, armR: null,                  // {x,y} paw targets in body units; null = hanging
  handL: 'paw', handR: 'paw',              // paw | fist | point | chin | hold
  glass: null,                             // {x,y,ang,r,flip, hand:'L'|'R', face:true} lens centre in body units
  legs: 'stand', phase: 0,                 // stand | walk | run | crouch | leap | slide
  coatLag: 0, coatFlutter: 0,
  tail: 0,
  hatTilt: 0,
  smear: 0,
};

function pose(o) { return Object.assign({}, POSE0, o); }
// interpolate two poses (numbers + {x,y} targets); strings switch at the midpoint
function poseLerp(a, b, t) {
  const out = {};
  for (const k in b) {
    const va = a[k], vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') out[k] = lerp(va, vb, t);
    else if (va && vb && typeof va === 'object' && typeof vb === 'object') {
      out[k] = {};
      for (const kk in vb) out[k][kk] = typeof va[kk] === 'number' && typeof vb[kk] === 'number' ? lerp(va[kk], vb[kk], t) : (t < 0.5 ? va[kk] : vb[kk]);
    } else out[k] = t < 0.5 ? va : vb;
  }
  for (const k in a) if (!(k in out)) out[k] = a[k];
  return out;
}
/* keyPose(t, keys): pose-to-pose. keys = [[time, poseObj, ease?], ...].
   Each key's pose inherits from the previous one. */
function keyPose(t, keys) {
  const full = []; let acc = Object.assign({}, POSE0);
  for (const [kt, p, e] of keys) { acc = Object.assign({}, acc, p); full.push([kt, acc, e]); }
  if (t <= full[0][0]) return full[0][1];
  for (let i = 0; i < full.length - 1; i++) {
    const [t0, a] = full[i], [t1, b, e] = full[i + 1];
    if (t < t1) return poseLerp(a, b, (e || Ease.inOut)(inv(t0, t1, t)));
  }
  return full[full.length - 1][1];
}
// Secondary motion: ears/coat lag behind horizontal movement
function withSecondary(fn, t) {
  const p = fn(t), q = fn(t - 1 / 12), r = fn(t - 2 / 12);
  const v = (p.x - q.x) * 12, a = ((p.x - q.x) - (q.x - r.x)) * 144;
  const vt = (p.headTilt - q.headTilt) * 12;
  const sgn = p.view === 'side' ? p.dir : 1;
  p.earL += clamp(-v * 0.0009 - a * 0.00005 - vt * 0.25, -0.5, 0.5);
  p.earR += clamp(-v * 0.0009 - a * 0.00005 - vt * 0.25, -0.5, 0.5);
  p.coatLag += clamp(-v * 0.0006 * sgn, -0.35, 0.35);
  p.tail += clamp(v * 0.001, -0.4, 0.4);
  return p;
}

// ---------------------------------------------------------------------
// shared parts
// ---------------------------------------------------------------------
function furTex(dir = Math.PI / 2, color = PAL.furSh, n = 26, len = 22) { return { dir, color, color2: PAL.furHi, n, len, alpha: 0.4, width: 2.6, spread: 0.5 }; }

function drawPaw(ctx, x, y, ang, kind, seed) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  // paw local: +x points along the forearm
  if (kind === 'fist' || kind === 'hold') {
    shape(ctx, [[-10, -17], [8, -19], [20, -12], [24, 0], [20, 13], [6, 19], [-10, 16], [-15, 0]], { fill: PAL.cream, lw: 5, seed, tex: { dir: 0, color: PAL.creamSh, n: 6, len: 10, alpha: 0.5 } });
    inkLine(ctx, [[14, -10], [18, -2], [14, 4]], 3, PAL.ink, seed + 1, 0.4);
    inkLine(ctx, [[8, 4], [13, 11]], 3, PAL.ink, seed + 2, 0.4);
  } else if (kind === 'point') {
    shape(ctx, [[-10, -16], [10, -16], [40, -10], [44, -4], [38, 1], [18, 2], [16, 15], [-6, 17], [-14, 0]], { fill: PAL.cream, lw: 5, seed });
  } else {
    // open paw with three finger pads
    shape(ctx, [[-10, -18], [10, -20], [22, -16], [30, -8], [33, 0], [31, 8], [24, 16], [10, 21], [-8, 18], [-15, 0]], { fill: PAL.cream, lw: 5, seed, tex: { dir: 0, color: PAL.creamSh, n: 6, len: 10, alpha: 0.5 } });
    inkLine(ctx, [[22, -8], [28, -3]], 3, PAL.ink, seed + 3, 0.4);
    inkLine(ctx, [[23, 5], [29, 7]], 3, PAL.ink, seed + 4, 0.4);
  }
  ctx.restore();
}

function ik(sx, sy, tx, ty, l1, l2, bendSign) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.5;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  d = Math.max(d, 20);
  const a = Math.atan2(dy, dx);
  const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ea = a + al * bendSign;
  return { ex: sx + Math.cos(ea) * l1, ey: sy + Math.sin(ea) * l1, wx: sx + dx, wy: sy + dy };
}

// sleeve tube + cuff + paw
function drawArm(ctx, sx, sy, target, bend, hand, seed, dark) {
  const { ex, ey, wx, wy } = ik(sx, sy, target.x, target.y, PROPORTIONS.upperArm, PROPORTIONS.foreArm, bend);
  const col = dark ? PAL.coatSh : PAL.coat;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = boiled([[sx, sy], [ex, ey], [wx, wy]], seed, 0.9);
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.quadraticCurveTo(pts[1][0], pts[1][1], (pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2); ctx.lineTo(pts[2][0], pts[2][1]); };
  path(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 48; ctx.stroke();
  path(); ctx.strokeStyle = col; ctx.lineWidth = 36; ctx.stroke();
  // fold line at elbow
  inkLine(ctx, [[ex - 8, ey - 6], [ex + 2, ey + 2], [ex + 10, ey - 2]], 3.2, PAL.coatDk, seed + 5, 0.5);
  // cuff
  const ang = Math.atan2(wy - ey, wx - ex);
  const cx = wx - Math.cos(ang) * 14, cy = wy - Math.sin(ang) * 14;
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * 8, cy - Math.sin(ang) * 8); ctx.lineTo(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 52; ctx.stroke();
  ctx.strokeStyle = dark ? PAL.coatDk : PAL.coatSh; ctx.lineWidth = 40; ctx.stroke();
  ctx.restore();
  drawPaw(ctx, wx + Math.cos(ang) * 8, wy + Math.sin(ang) * 8, ang, hand, seed + 9);
  return { wx, wy, ang };
}

// magnifying glass: lens centre (x,y), handle direction ang (radians, pointing from lens to handle)
function drawGlass(ctx, x, y, r, ang, flip, lensFn) {
  ctx.save();
  ctx.translate(x, y);
  // handle
  const hx = Math.cos(ang), hy = Math.sin(ang);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx * (r + 4), hy * (r + 4)); ctx.lineTo(hx * (r + 78), hy * (r + 78));
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 20; ctx.stroke();
  ctx.strokeStyle = PAL.glassHandle; ctx.lineWidth = 13; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx * (r + 10), hy * (r + 10)); ctx.lineTo(hx * (r + 70), hy * (r + 70));
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3; ctx.stroke();
  // lens (flip squashes it: the glass turning in the paw)
  ctx.rotate(ang + Math.PI / 2);
  ctx.scale(Math.max(0.08, Math.abs(Math.cos(flip || 0))), 1);
  ctx.rotate(-(ang + Math.PI / 2));
  if (lensFn) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); lensFn(ctx); ctx.restore(); }
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.6, 'rgba(210,235,255,0.08)'); g.addColorStop(1, 'rgba(120,150,170,0.25)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  // glare arcs
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, Math.PI * 1.55, Math.PI * 1.63); ctx.stroke();
  // rim
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = r * 0.3; ctx.stroke();
  ctx.strokeStyle = PAL.glassRim; ctx.lineWidth = r * 0.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = r * 0.04;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.02, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
// HEAD — front / 3/4 (turn), head-local coordinates, origin = head centre
// ---------------------------------------------------------------------
const HEAD_FUR = [[-70, -62], [-88, -40], [-95, -10], [-97, 16], [-106, 28], [-94, 36], [-103, 50], [-86, 56], [-90, 68], [-68, 70], [-50, 80], [-27, 88], [0, 92], [27, 88], [50, 80], [68, 70], [90, 68], [86, 56], [103, 50], [94, 36], [106, 28], [97, 16], [95, -10], [88, -40], [70, -62], [36, -78], [0, -82], [-36, -78]];
const HEAD_MASK = [[-10, -56], [10, -56], [22, -28], [36, -2], [58, 22], [64, 46], [50, 68], [26, 82], [0, 86], [-26, 82], [-50, 68], [-64, 46], [-58, 22], [-36, -2], [-22, -28]];
const EAR_L = [[6, -6], [-14, 2], [-32, 22], [-44, 54], [-50, 88], [-52, 112], [-45, 130], [-53, 142], [-38, 148], [-33, 161], [-18, 154], [-6, 164], [4, 150], [14, 126], [18, 94], [18, 58], [15, 26], [10, 6]];
const HAT_CROWN = [[-100, -36], [-101, -62], [-88, -94], [-58, -118], [-20, -130], [20, -130], [58, -118], [88, -94], [101, -62], [100, -36], [60, -30], [0, -26], [-60, -30]];
const HAT_BRIM_FRONT = [[-92, -42], [-60, -34], [-20, -28], [20, -28], [60, -34], [92, -42], [86, -26], [50, -14], [0, -8], [-50, -14], [-86, -26]];

function squashX(pts, f, k = 0.14) {
  // compress the far side when the head turns
  return pts.map(([x, y]) => [x * (Math.sign(x) === Math.sign(f) ? 1 - k * Math.abs(f) : 1 + k * 0.3 * Math.abs(f)) + f * 6, y]);
}

function drawEar(ctx, side, ax, ay, swing, flow, seed, dark) {
  ctx.save(); ctx.translate(ax, ay);
  ctx.rotate(side * -0.05 + swing + flow);
  const L = PROPORTIONS.earLength;
  const pts = EAR_L.map(([x, y]) => [side < 0 ? x : -x, y * L]);
  shape(ctx, pts, {
    fill: dark ? PAL.earSh : PAL.ear, lw: 6.5, seed,
    tex: { dir: Math.PI / 2 + side * 0.1, color: PAL.earSh, color2: PAL.earHi, n: 22, len: 30, alpha: 0.55, width: 3, spread: 0.35 },
    shade: (c) => { c.fillStyle = 'rgba(60,25,10,0.28)'; c.beginPath(); c.ellipse(side * 10, 60, 18, 90, 0, 0, TAU); c.fill(); },
  });
  ctx.restore();
}

function drawEye(ctx, x, y, sx, p, seed, flip) {
  const s = p.eyeSize;
  const rx = 20 * s * sx, ry = 24 * s;
  ctx.save();
  if (p.blink >= 0.85) {
    inkLine(ctx, [[x - rx, y + 2], [x, y + 7], [x + rx, y + 2]], 6, PAL.ink, seed, 0.4);
    ctx.restore(); return;
  }
  const open = 1 - p.blink;
  ctx.translate(x, y); ctx.scale(1, open);
  // sclera (thin) + iris
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = '#fbf6ec'; ctx.fill();
  const ix = clamp(p.eyeX, -1, 1) * 5 * sx, iy = clamp(p.eyeY, -1, 1) * 5;
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
  const irx = rx * 0.88, iry = ry * 0.9;
  ctx.beginPath(); ctx.ellipse(ix, iy + 1, irx, iry, 0, 0, TAU); ctx.fillStyle = '#1b120d'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(ix + irx * 0.2, iy + iry * 0.45, irx * 0.55, iry * 0.35, 0, 0, TAU); ctx.fillStyle = 'rgba(90,55,35,0.55)'; ctx.fill();
  // upper-lid shadow
  ctx.fillStyle = 'rgba(40,20,10,0.25)'; ctx.fillRect(-rx, -ry, rx * 2, ry * 0.35);
  ctx.restore();
  // highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ix - irx * 0.32 * (flip ? -1 : 1), iy - iry * 0.38, 7.2 * s, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + irx * 0.34 * (flip ? -1 : 1), iy + iry * 0.36, 3.2 * s, 0, TAU); ctx.fill();
  // outline
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4.5 / Math.max(open, 0.3); ctx.stroke();
  // lid (narrowing / suspicion)
  if (p.lid > 0.01) {
    const ly = -ry + ry * 2 * p.lid * 0.55;
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx + 3, ry + 3, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = PAL.fur; ctx.fillRect(-rx - 4, -ry - 4, rx * 2 + 8, ly + ry + 4);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-rx - 2, ly + 2); ctx.quadraticCurveTo(0, ly - 3, rx + 2, ly + 2);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.stroke();
  }
  ctx.restore();
}

function drawBrow(ctx, ex, ey, side, ang, raise, sx, seed) {
  // side: -1 left eye, +1 right eye. inner end = toward the nose
  const inner = [ex - side * 12 * sx, ey - 30 + ang * 9 - raise * 12];
  const mid = [ex + side * 4 * sx, ey - 38 - ang * 1 - raise * 15];
  const outer = [ex + side * 24 * sx, ey - 36 - ang * 6 - raise * 12];
  ctx.save();
  const P = boiled([inner, mid, outer], seed, 0.6);
  // tapered filled brow
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1] + 5);
  ctx.quadraticCurveTo(P[1][0], P[1][1] + 5, P[2][0], P[2][1] + 2);
  ctx.quadraticCurveTo(P[1][0], P[1][1] - 6, P[0][0], P[0][1] - 5);
  ctx.closePath();
  ctx.fillStyle = PAL.ink; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.restore();
}

function drawMouth(ctx, x, y, kind, seed) {
  ctx.save();
  ctx.lineCap = 'round';
  // philtrum from nose
  inkLine(ctx, [[x, y - 12], [x, y - 3]], 4, PAL.ink, seed, 0.3);
  if (kind === 'frown') inkLine(ctx, [[x - 14, y + 7], [x - 7, y], [x, y - 2], [x + 7, y], [x + 14, y + 7]], 4.2, PAL.ink, seed + 1, 0.4);
  else if (kind === 'flat') inkLine(ctx, [[x - 12, y + 2], [x, y], [x + 12, y + 2]], 4.2, PAL.ink, seed + 1, 0.4);
  else if (kind === 'smirk') inkLine(ctx, [[x - 12, y + 3], [x, y + 1], [x + 9, y - 1], [x + 15, y - 6]], 4.2, PAL.ink, seed + 1, 0.4);
  else if (kind === 'o') {
    ctx.beginPath(); ctx.ellipse(x, y + 6, 7, 9, 0, 0, TAU); ctx.fillStyle = '#5a2a22'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.stroke();
  } else if (kind === 'grit') {
    ctx.beginPath(); ctx.moveTo(x - 15, y + 2); ctx.quadraticCurveTo(x, y - 4, x + 15, y + 2); ctx.quadraticCurveTo(x, y + 12, x - 15, y + 2);
    ctx.fillStyle = '#fff6ea'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.stroke();
    inkLine(ctx, [[x - 13, y + 3], [x + 13, y + 3]], 2, PAL.ink, seed + 2, 0.3);
  } else if (kind === 'open') {
    ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.quadraticCurveTo(x, y - 4, x + 13, y); ctx.quadraticCurveTo(x, y + 16, x - 13, y);
    ctx.fillStyle = '#5a2a22'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.stroke();
  }
  ctx.restore();
}

function drawHatFront(ctx, f, tilt, seed) {
  ctx.save();
  ctx.rotate(tilt);
  const crown = squashX(HAT_CROWN, f, 0.08);
  shape(ctx, crown, {
    fill: PAL.hat, lw: 7, seed: seed + 1,
    shade: (c) => {
      // plaid: curved panel seams + cross lines
      c.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        const bx = i * 28 + f * 14;
        c.strokeStyle = i % 2 ? PAL.hatLine : 'rgba(110,66,30,0.55)'; c.lineWidth = i % 2 ? 4 : 2.5;
        c.beginPath(); c.moveTo(bx * 0.25, -132); c.quadraticCurveTo(bx * 0.9, -95, bx * 1.12, -26); c.stroke();
      }
      for (let j = 0; j < 5; j++) {
        const yy = -118 + j * 20;
        c.strokeStyle = j % 2 ? PAL.hatLine : 'rgba(110,66,30,0.5)'; c.lineWidth = j % 2 ? 3.5 : 2.2;
        c.beginPath(); c.moveTo(-110, yy + 8); c.quadraticCurveTo(f * 20, yy - 8, 110, yy + 8); c.stroke();
      }
      c.strokeStyle = 'rgba(230,185,120,0.45)'; c.lineWidth = 2;
      for (let j = 0; j < 5; j++) { const yy = -110 + j * 20; c.beginPath(); c.moveTo(-110, yy + 8); c.quadraticCurveTo(f * 20, yy - 8, 110, yy + 8); c.stroke(); }
      // side shading + highlight
      c.fillStyle = 'rgba(80,45,20,0.28)'; c.beginPath(); c.ellipse(80 - f * 20, -60, 40, 80, 0.2, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,225,170,0.22)'; c.beginPath(); c.ellipse(-40 + f * 10, -100, 40, 22, -0.3, 0, TAU); c.fill();
    },
  });
  // folded ear-flap edges on the sides
  inkLine(ctx, [[-96 + f * 6, -44], [-84 + f * 6, -86], [-50, -112]], 3.5, PAL.hatLine, seed + 4, 0.5);
  inkLine(ctx, [[96 + f * 6, -44], [84 + f * 6, -86], [50, -112]], 3.5, PAL.hatLine, seed + 5, 0.5);
  // front brim
  const brim = HAT_BRIM_FRONT.map(([x, y]) => [x + f * 16, y]);
  shape(ctx, brim, {
    fill: PAL.hatSh, lw: 6.5, seed: seed + 2,
    shade: (c) => {
      c.strokeStyle = PAL.hatLine; c.lineWidth = 3;
      for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 22 + f * 16, -40); c.lineTo(i * 24 + f * 16, -6); c.stroke(); }
      c.strokeStyle = 'rgba(230,185,120,0.4)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-90, -24); c.quadraticCurveTo(f * 16, -12, 90, -24); c.stroke();
    },
  });
  // bow on top
  const bx = f * 6;
  shape(ctx, [[bx - 4, -130], [bx - 30, -146], [bx - 36, -134], [bx - 26, -124]], { fill: PAL.bow, lw: 5, seed: seed + 6 });
  shape(ctx, [[bx + 4, -130], [bx + 30, -146], [bx + 36, -134], [bx + 26, -124]], { fill: PAL.bow, lw: 5, seed: seed + 7 });
  shape(ctx, ellipsePts(bx, -131, 9, 8, 8), { fill: PAL.bow, lw: 5, seed: seed + 8 });
  ctx.restore();
}

function drawHeadFront(ctx, p, seed) {
  const f = clamp(p.turn, -1, 1);
  const hs = PROPORTIONS.headScale;
  ctx.save();
  ctx.scale(hs, hs);
  // ears (behind head). Far ear tucks behind when turned.
  const earFlow = p.earFlow || 0;
  drawEar(ctx, -1, -80 + f * (f > 0 ? 6 : 14), -40, p.earL + f * 0.05, earFlow, seed + 10, f > 0.45);
  drawEar(ctx, 1, 80 + f * (f < 0 ? 6 : 14), -40, p.earR + f * 0.05, -earFlow, seed + 20, f < -0.45);
  // head fur
  const fur = squashX(HEAD_FUR, f, 0.18);
  shape(ctx, fur, {
    fill: PAL.fur, lw: 7, seed: seed + 1,
    tex: { dir: Math.PI / 2, color: PAL.furSh, color2: PAL.furHi, n: 30, len: 20, alpha: 0.35, width: 2.4 },
    shade: (c) => {
      c.fillStyle = 'rgba(150,85,40,0.28)';
      c.beginPath(); c.ellipse(70 - f * 30, 20, 40, 80, 0, 0, TAU); c.fill();
    },
  });
  // cream mask + muzzle
  const mask = squashX(HEAD_MASK, f, 0.16).map(([x, y]) => [x + f * 20, y]);
  shape(ctx, mask, { fill: PAL.cream, noLine: true, seed: seed + 2, tex: { dir: Math.PI / 2, color: PAL.creamSh, n: 14, len: 14, alpha: 0.35 } });
  const mx = f * 36;
  shape(ctx, ellipsePts(mx, 46, 34 - Math.abs(f) * 4, 24, 12), { fill: '#fcf0da', noLine: true, seed: seed + 3 });
  inkLine(ctx, [[mx - 33, 50], [mx - 26, 64]], 2.6, 'rgba(34,22,15,0.28)', seed + 12, 0.4);
  inkLine(ctx, [[mx + 33, 50], [mx + 26, 64]], 2.6, 'rgba(34,22,15,0.28)', seed + 13, 0.4);
  // cheek fluff strokes
  inkLine(ctx, [[-66 + f * 8, 46], [-56 + f * 8, 56], [-60 + f * 8, 66]], 3, PAL.furSh, seed + 4, 0.5);
  inkLine(ctx, [[66 + f * 8, 46], [56 + f * 8, 56], [60 + f * 8, 66]], 3, PAL.furSh, seed + 5, 0.5);
  // eyes
  const eyeY = 2 + p.headY * 0;
  const exL = -38 * (1 - 0.2 * Math.abs(f)) + f * 30, exR = 38 * (1 - 0.2 * Math.abs(f)) + f * 30;
  const sxL = f > 0 ? 1 + 0.08 * f : 1 - 0.28 * -f, sxR = f < 0 ? 1 + 0.08 * -f : 1 - 0.28 * f;
  drawEye(ctx, exL, eyeY, sxL, p, seed + 30, false);
  drawEye(ctx, exR, eyeY, sxR, p, seed + 31, false);
  drawBrow(ctx, exL, eyeY, -1, p.browL, p.browRaise, sxL, seed + 32);
  drawBrow(ctx, exR, eyeY, 1, p.browR, p.browRaise, sxR, seed + 33);
  // nose
  const nx = f * 44;
  shape(ctx, [[nx - 18, 26], [nx, 23], [nx + 18, 26], [nx + 15, 37], [nx, 46], [nx - 15, 37]], { fill: PAL.nose, lw: 4, seed: seed + 6 });
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(nx - 6, 29, 5, 3, -0.2, 0, TAU); ctx.fill();
  drawMouth(ctx, nx * 0.9, 58, p.mouth, seed + 7);
  // chin tuft
  inkLine(ctx, [[mx - 8, 86], [mx - 2, 94], [mx + 4, 88], [mx + 8, 95]], 3, PAL.furSh, seed + 8, 0.4);
  // hat
  drawHatFront(ctx, f, p.hatTilt, seed + 40);
  ctx.restore();
}

// ---------------------------------------------------------------------
// HEAD — side profile (facing +x)
// ---------------------------------------------------------------------
function drawHeadSide(ctx, p, seed) {
  const hs = PROPORTIONS.headScale;
  ctx.save(); ctx.scale(hs, hs);
  // back hat brim (behind head)
  const flow = p.earFlow || 0;
  shape(ctx, [[-62, -44], [-112, -36], [-106, -24], [-58, -30]], { fill: PAL.hatSh, lw: 6, seed: seed + 50 });
  // skull + snout
  const skull = [[-80, -22], [-84, 16], [-72, 46], [-80, 60], [-60, 66], [-44, 80], [-8, 90], [26, 86], [52, 74], [72, 62], [90, 50], [98, 34], [96, 16], [86, 6], [74, -4], [70, -40], [40, -70], [0, -80], [-46, -70]];
  shape(ctx, skull, {
    fill: PAL.fur, lw: 7, seed: seed + 1,
    tex: { dir: 0.2, color: PAL.furSh, color2: PAL.furHi, n: 28, len: 22, alpha: 0.35 },
  });
  // cream muzzle + chin
  shape(ctx, [[22, 14], [56, 6], [86, 6], [96, 18], [98, 34], [90, 50], [72, 62], [52, 74], [26, 84], [6, 70], [10, 40]], { fill: PAL.cream, lw: 0, noLine: true, seed: seed + 2, tex: { dir: 0.1, color: PAL.creamSh, n: 10, len: 14, alpha: 0.35 } });
  inkLine(ctx, [[86, 6], [96, 16], [98, 34], [90, 50], [72, 62]], 6, PAL.ink, seed + 3, 0.6);
  // nose
  shape(ctx, [[84, 4], [100, 2], [108, 10], [106, 22], [94, 26], [86, 20]], { fill: PAL.nose, lw: 4, seed: seed + 4 });
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(97, 8, 5, 3, 0, 0, TAU); ctx.fill();
  // mouth
  if (p.mouth === 'grit' || p.mouth === 'open') {
    ctx.beginPath(); ctx.moveTo(94, 36); ctx.quadraticCurveTo(80, 44, 64, 42); ctx.quadraticCurveTo(80, 56, 92, 44); ctx.closePath();
    ctx.fillStyle = p.mouth === 'grit' ? '#fff6ea' : '#5a2a22'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.stroke();
  } else if (p.mouth === 'o') {
    ctx.beginPath(); ctx.ellipse(84, 42, 6, 8, 0, 0, TAU); ctx.fillStyle = '#5a2a22'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.stroke();
  } else inkLine(ctx, [[94, 28], [90, 38], [80, 42], [68, 46]], 4, PAL.ink, seed + 5, 0.4);
  // eye (profile)
  const ep = Object.assign({}, p, { eyeSize: p.eyeSize * 0.92 });
  drawEye(ctx, 40, -2, 0.72, ep, seed + 6, false);
  drawBrow(ctx, 40, -2, 1, p.browR, p.browRaise, 0.8, seed + 7);
  // ear (covers side of head)
  ctx.save(); ctx.translate(-10, -44); ctx.rotate(0.08 + p.earR * 0.7 + flow);
  shape(ctx, [[10, -4], [-16, 0], [-40, 20], [-52, 58], [-56, 96], [-50, 126], [-58, 138], [-42, 146], [-36, 160], [-20, 152], [-6, 164], [4, 148], [16, 124], [22, 88], [24, 50], [20, 18]], {
    fill: PAL.ear, lw: 6.5, seed: seed + 8,
    tex: { dir: Math.PI / 2 - 0.15, color: PAL.earSh, color2: PAL.earHi, n: 22, len: 30, alpha: 0.55, width: 3, spread: 0.35 },
  });
  ctx.restore();
  // hat crown + front brim
  shape(ctx, [[-84, -34], [-86, -70], [-60, -110], [-10, -130], [44, -120], [78, -88], [88, -44], [40, -34], [-20, -30]], {
    fill: PAL.hat, lw: 7, seed: seed + 9,
    shade: (c) => {
      for (let i = -4; i <= 4; i++) { c.strokeStyle = i % 2 ? PAL.hatLine : 'rgba(110,66,30,0.5)'; c.lineWidth = i % 2 ? 4 : 2.4; c.beginPath(); c.moveTo(i * 8, -132); c.quadraticCurveTo(i * 20, -80, i * 26, -28); c.stroke(); }
      for (let j = 0; j < 5; j++) { const yy = -116 + j * 20; c.strokeStyle = j % 2 ? PAL.hatLine : 'rgba(110,66,30,0.5)'; c.lineWidth = j % 2 ? 3.5 : 2.2; c.beginPath(); c.moveTo(-100, yy + 6); c.quadraticCurveTo(0, yy - 8, 100, yy + 6); c.stroke(); }
      c.fillStyle = 'rgba(80,45,20,0.25)'; c.beginPath(); c.ellipse(-60, -60, 40, 70, 0, 0, TAU); c.fill();
    },
  });
  shape(ctx, [[60, -46], [120, -40], [130, -30], [96, -28], [56, -32]], { fill: PAL.hatSh, lw: 6, seed: seed + 10 });
  inkLine(ctx, [[-60, -46], [-40, -90], [0, -112]], 3.2, PAL.hatLine, seed + 11, 0.5);
  shape(ctx, [[-6, -128], [-32, -146], [-38, -132], [-26, -122]], { fill: PAL.bow, lw: 5, seed: seed + 12 });
  shape(ctx, [[2, -128], [26, -146], [34, -134], [22, -122]], { fill: PAL.bow, lw: 5, seed: seed + 13 });
  shape(ctx, ellipsePts(-2, -129, 8, 7, 8), { fill: PAL.bow, lw: 5, seed: seed + 14 });
  ctx.restore();
}

// HEAD — back view
function drawHeadBack(ctx, p, seed) {
  const hs = PROPORTIONS.headScale;
  ctx.save(); ctx.scale(hs, hs);
  const t = p.turn || 0;
  shape(ctx, HEAD_FUR.map(([x, y]) => [x * 0.98, y]), { fill: PAL.furSh, lw: 7, seed: seed + 1, tex: furTex(Math.PI / 2, PAL.earSh, 30, 22) });
  // a hint of cheek/muzzle when turning (3/4 back)
  if (Math.abs(t) > 0.05) {
    const sx = Math.sign(t);
    shape(ctx, [[sx * 80, 10], [sx * 104, 30], [sx * 100, 60], [sx * 78, 70]], { fill: PAL.fur, lw: 5, seed: seed + 5 });
    if (Math.abs(t) > 0.3) {
      // brow + eye corner visible past the cheek
      const ex = sx * (86 + 10 * Math.abs(t));
      ctx.save(); ctx.beginPath(); ctx.rect(sx > 0 ? 70 : -140, -60, 70, 140); ctx.clip();
      drawEye(ctx, ex, 4, 0.45, p, seed + 6, sx < 0);
      drawBrow(ctx, ex, 4, sx, p.browR, p.browRaise, 0.6, seed + 7);
      ctx.restore();
    }
  }
  drawEar(ctx, -1, -84, -40, p.earL, 0, seed + 10, false);
  drawEar(ctx, 1, 84, -40, p.earR, 0, seed + 20, false);
  // hat back: crown + back brim
  shape(ctx, HAT_CROWN, {
    fill: PAL.hat, lw: 7, seed: seed + 30,
    shade: (c) => {
      for (let i = -3; i <= 3; i++) { c.strokeStyle = i % 2 ? PAL.hatLine : 'rgba(110,66,30,0.5)'; c.lineWidth = i % 2 ? 4 : 2.4; c.beginPath(); c.moveTo(i * 8, -132); c.quadraticCurveTo(i * 26, -95, i * 32, -26); c.stroke(); }
      for (let j = 0; j < 5; j++) { const yy = -118 + j * 20; c.strokeStyle = j % 2 ? PAL.hatLine : 'rgba(110,66,30,0.5)'; c.lineWidth = j % 2 ? 3.5 : 2.2; c.beginPath(); c.moveTo(-110, yy + 8); c.quadraticCurveTo(0, yy - 8, 110, yy + 8); c.stroke(); }
    },
  });
  shape(ctx, HAT_BRIM_FRONT.map(([x, y]) => [x * 0.95, y + 6]), { fill: PAL.hatSh, lw: 6.5, seed: seed + 31, shade: (c) => { c.strokeStyle = PAL.hatLine; c.lineWidth = 3; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 22, -34); c.lineTo(i * 24, 0); c.stroke(); } } });
  shape(ctx, [[-4, -130], [-30, -146], [-36, -134], [-26, -124]], { fill: PAL.bow, lw: 5, seed: seed + 32 });
  shape(ctx, [[4, -130], [30, -146], [36, -134], [26, -124]], { fill: PAL.bow, lw: 5, seed: seed + 33 });
  shape(ctx, ellipsePts(0, -131, 9, 8, 8), { fill: PAL.bow, lw: 5, seed: seed + 34 });
  ctx.restore();
}

// ---------------------------------------------------------------------
// BODY parts (front / back / side)
// ---------------------------------------------------------------------
function legOffsets(p) {
  // returns [left, right] leg data: {dx, lift, ang}
  const ph = p.phase;
  if (p.legs === 'walk') {
    const a = Math.sin(ph * TAU), b = Math.cos(ph * TAU);
    return [{ dx: a * 12, lift: Math.max(0, b) * 12, ang: 0 }, { dx: -a * 12, lift: Math.max(0, -b) * 12, ang: 0 }];
  }
  if (p.legs === 'crouch') return [{ dx: -8, lift: 0, ang: 0 }, { dx: 8, lift: 0, ang: 0 }];
  return [{ dx: 0, lift: 0, ang: 0 }, { dx: 0, lift: 0, ang: 0 }];
}

function drawLegFront(ctx, x, lift, seed, dark) {
  const y0 = PROPORTIONS.hipY, y1 = -12 - lift;
  shape(ctx, [[x - 22, y0], [x + 20, y0], [x + 18, y1 - 4], [x - 20, y1 - 4]], { fill: dark ? PAL.earSh : '#a8642f', lw: 6, seed, tex: furTex(Math.PI / 2, PAL.earSh, 8, 16) });
  // big cream paw
  shape(ctx, [[x - 34, y1 + 2], [x - 30, y1 - 12], [x - 8, y1 - 18], [x + 16, y1 - 16], [x + 32, y1 - 8], [x + 34, y1 + 4], [x + 18, y1 + 12], [x - 18, y1 + 12]], { fill: PAL.cream, lw: 6, seed: seed + 1, tex: { dir: 0, color: PAL.creamSh, n: 8, len: 12, alpha: 0.45 } });
  inkLine(ctx, [[x - 8, y1 - 4], [x - 9, y1 + 8]], 3.2, PAL.ink, seed + 2, 0.4);
  inkLine(ctx, [[x + 10, y1 - 4], [x + 10, y1 + 8]], 3.2, PAL.ink, seed + 3, 0.4);
}

function coatPtsFront(f, lag, flutter, t) {
  const hem = PROPORTIONS.coatHem;
  const k = 1 - 0.1 * Math.abs(f);
  const fl = (i) => flutter * Math.sin(t * 18 + i) * 6;
  return [[-60 * k + f * 6, -266], [-80 * k, -250], [-94 * k, -212], [-98 * k, -150], [-102 * k + lag * 30, -100], [-110 * k + lag * 60 + fl(1), hem - 2],
    [-56 + lag * 50 + fl(2), hem + 6], [0 + lag * 44 + fl(3), hem + 4], [56 + lag * 40 + fl(4), hem + 6],
    [110 * k + lag * 30 + fl(5), hem - 2], [102 * k + lag * 20, -100], [98 * k, -150], [94 * k, -212], [80 * k, -250], [60 * k + f * 6, -266]];
}

function drawCoatFront(ctx, p, t, seed) {
  const f = clamp(p.turn, -1, 1);
  const pts = coatPtsFront(f, p.coatLag, p.coatFlutter, t);
  shape(ctx, pts, {
    fill: PAL.coat, lw: 7, seed: seed + 1,
    tex: { dir: Math.PI / 2, color: PAL.coatSh, color2: PAL.coatHi, n: 40, len: 30, alpha: 0.35, width: 2.6, spread: 0.3 },
    shade: (c) => {
      c.fillStyle = 'rgba(90,55,25,0.3)';
      c.beginPath(); c.moveTo(60 - f * 30, -266); c.quadraticCurveTo(110, -150, 116, -40); c.lineTo(160, -40); c.lineTo(160, -270); c.fill();
      c.fillStyle = 'rgba(255,220,160,0.14)';
      c.beginPath(); c.ellipse(-50 + f * 10, -180, 24, 70, 0.1, 0, TAU); c.fill();
    },
  });
  const cx = f * 14;
  // shirt V
  shape(ctx, [[cx - 26, -266], [cx + 26, -266], [cx + 6, -196], [cx - 6, -196]], { fill: PAL.shirt, lw: 5, seed: seed + 2 });
  // lapels
  shape(ctx, [[cx - 28, -270], [cx - 58, -262], [cx - 48, -222], [cx - 34, -200], [cx - 4, -168], [cx - 10, -206], [cx - 22, -236]], { fill: PAL.coatHi, lw: 5.5, seed: seed + 3, tex: { dir: 1.2, color: PAL.coatSh, n: 8, len: 16, alpha: 0.35 } });
  shape(ctx, [[cx + 28, -270], [cx + 58, -262], [cx + 48, -222], [cx + 34, -200], [cx + 4, -168], [cx + 10, -206], [cx + 22, -236]], { fill: PAL.coat, lw: 5.5, seed: seed + 4, tex: { dir: 2, color: PAL.coatSh, n: 8, len: 16, alpha: 0.35 } });
  // popped collar tips
  shape(ctx, [[cx - 34, -270], [cx - 66, -288], [cx - 78, -258], [cx - 58, -256]], { fill: PAL.coatSh, lw: 5, seed: seed + 5 });
  shape(ctx, [[cx + 34, -270], [cx + 66, -288], [cx + 78, -258], [cx + 58, -256]], { fill: PAL.coatSh, lw: 5, seed: seed + 6 });
  // front opening line
  inkLine(ctx, [[cx + 2, -170], [cx + 3, -120], [cx + 4, PROPORTIONS.coatHem + 4 + p.coatLag * 40]], 4.5, PAL.ink, seed + 7, 0.6);
  // buttons
  for (const by of [-150, -110]) {
    shape(ctx, ellipsePts(cx + 20, by, 8, 8, 8), { fill: PAL.button, lw: 4, seed: seed + by });
    ctx.fillStyle = 'rgba(255,230,190,0.5)'; ctx.beginPath(); ctx.arc(cx + 17, by - 3, 2.5, 0, TAU); ctx.fill();
  }
  // pocket flaps
  shape(ctx, [[cx - 78, -104], [cx - 30, -106], [cx - 32, -90], [cx - 76, -88]], { fill: PAL.coatSh, lw: 4.5, seed: seed + 8 });
  shape(ctx, [[cx + 34, -106], [cx + 80, -104], [cx + 78, -88], [cx + 36, -90]], { fill: PAL.coatSh, lw: 4.5, seed: seed + 9 });
  // side seam folds
  inkLine(ctx, [[-70, -200], [-74, -150]], 3, PAL.coatDk, seed + 10, 0.5);
  inkLine(ctx, [[72, -190], [76, -140]], 3, PAL.coatDk, seed + 11, 0.5);
}

function drawTail(ctx, x, y, ang, seed, tipUp = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const pts = [[0, 0], [-16, -6], [-34, -24], [-44, -48], [-40, -70], [-26, -80], [-30, -66], [-22, -60], [-24, -46], [-12, -38], [2, -22], [10, -10]];
  shape(ctx, pts, {
    fill: PAL.ear, lw: 6, seed,
    tex: furTex(-1.2, PAL.earSh, 10, 20),
    shade: (c) => { c.fillStyle = PAL.cream; c.beginPath(); c.ellipse(-36, -70, 22, 18, 0.3, 0, TAU); c.fill(); },
  });
  ctx.restore();
}

// ---------------------------------------------------------------------
// FULL CHARACTER
// ---------------------------------------------------------------------
function drawDog(ctx, p, t) {
  if (p.view === 'side') return drawDogSide(ctx, p, t);
  ctx.save();
  ctx.translate(p.x, p.y + p.bob);
  ctx.scale(p.s, p.s * p.squash);
  ctx.rotate(p.lean);
  const f = clamp(p.turn, -1, 1);
  const back = p.view === 'back';
  const seed = 1000;
  const legs = legOffsets(p);

  if (!back) drawTail(ctx, -96 - f * 10, -86, -0.2 + p.tail, seed + 900);
  // legs + paws
  drawLegFront(ctx, -40 + legs[0].dx + f * 6, legs[0].lift, seed + 100, false);
  drawLegFront(ctx, 40 + legs[1].dx + f * 6, legs[1].lift, seed + 110, false);

  // arms that hang behind/at the sides are drawn before the coat front? They are in front in all poses we use.
  // coat
  if (back) {
    const pts = coatPtsFront(0, p.coatLag, p.coatFlutter, t);
    shape(ctx, pts, {
      fill: PAL.coat, lw: 7, seed: seed + 200,
      tex: { dir: Math.PI / 2, color: PAL.coatSh, color2: PAL.coatHi, n: 40, len: 30, alpha: 0.35, width: 2.6, spread: 0.3 },
      shade: (c) => { c.fillStyle = 'rgba(90,55,25,0.25)'; c.fillRect(20, -270, 120, 260); },
    });
    // collar, back seam, belt tab with buttons
    shape(ctx, [[-62, -268], [0, -282], [62, -268], [50, -248], [0, -256], [-50, -248]], { fill: PAL.coatSh, lw: 5.5, seed: seed + 201 });
    inkLine(ctx, [[0, -250], [2, -160], [0, PROPORTIONS.coatHem + 4]], 4, PAL.coatDk, seed + 202, 0.5);
    shape(ctx, [[-56, -142], [56, -142], [58, -120], [-58, -120]], { fill: PAL.coatSh, lw: 5, seed: seed + 203 });
    for (const bx of [-40, 40]) { shape(ctx, ellipsePts(bx, -131, 7, 7, 8), { fill: PAL.button, lw: 3.5, seed: seed + bx }); }
    drawTail(ctx, 10, -58, 2.9 + p.tail, seed + 900);
  } else drawCoatFront(ctx, p, t, seed + 200);

  const sh = PROPORTIONS;
  // arms (non-glass arm first)
  const hang = (side) => ({ x: side * 96, y: -130 });
  const glassHand = p.glass ? (p.glass.hand || 'R') : null;
  const armFor = (side) => (side < 0 ? p.armL : p.armR) || hang(side);
  let glassPaw = null;
  const drawSideArm = (side) => {
    const hand = side < 0 ? p.handL : p.handR;
    const isGlass = glassHand && ((glassHand === 'L') === (side < 0));
    let target = armFor(side);
    if (isGlass) {
      const g = p.glass;
      const hx = g.x + Math.cos(g.ang) * (g.r + 70), hy = g.y + Math.sin(g.ang) * (g.r + 70);
      target = { x: hx, y: hy };
    }
    return drawArm(ctx, side * sh.shoulderX + f * 6, sh.shoulderY, target, side < 0 ? -1 : 1, isGlass ? 'hold' : hand, seed + 300 + side * 10, false);
  };
  const raisedHigh = (side) => { const a = armFor(side); return a.y < -225; };
  // arms at rest are drawn before the head
  const later = [];
  for (const side of [-1, 1]) {
    const isGlass = glassHand && ((glassHand === 'L') === (side < 0));
    if (isGlass || raisedHigh(side)) later.push(side); else drawSideArm(side);
  }
  // head
  ctx.save();
  ctx.translate(p.headX, sh.neckY + p.headY);
  ctx.rotate(p.headTilt);
  ctx.translate(0, sh.headY - sh.neckY);
  if (back) drawHeadBack(ctx, p, seed + 500); else drawHeadFront(ctx, p, seed + 500);
  ctx.restore();
  // raised arms + glass
  for (const side of later) {
    const isGlass = glassHand && ((glassHand === 'L') === (side < 0));
    if (isGlass) {
      const g = p.glass;
      drawGlass(ctx, g.x, g.y, g.r, g.ang, g.flip, g.face ? (c) => {
        // magnified view of the face behind the lens (signature effect)
        c.translate(g.x, g.y); c.scale(1.45, 1.45); c.translate(-g.x, -g.y);
        c.save(); c.translate(p.headX, sh.neckY + p.headY); c.rotate(p.headTilt); c.translate(0, sh.headY - sh.neckY);
        drawHeadFront(c, p, seed + 500); c.restore();
      } : g.lensFn);
    }
    drawSideArm(side);
  }
  ctx.restore();
}

function drawDogSide(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y + p.bob);
  ctx.scale(p.s * p.dir, p.s * p.squash);
  const seed = 2000;
  const sh = PROPORTIONS;
  // run / walk leg cycle (side)
  const ph = p.phase;
  let nearLeg, farLeg;
  if (p.legs === 'run') {
    const a = Math.sin(ph * TAU);
    nearLeg = { hip: 0.9 * a, knee: Math.max(0, -a) * 0.9, lift: Math.max(0, Math.cos(ph * TAU)) * 22 };
    farLeg = { hip: -0.9 * a, knee: Math.max(0, a) * 0.9, lift: Math.max(0, -Math.cos(ph * TAU)) * 22 };
  } else if (p.legs === 'walk') {
    const a = Math.sin(ph * TAU);
    nearLeg = { hip: 0.35 * a, knee: Math.max(0, -a) * 0.3, lift: Math.max(0, Math.cos(ph * TAU)) * 8 };
    farLeg = { hip: -0.35 * a, knee: Math.max(0, a) * 0.3, lift: Math.max(0, -Math.cos(ph * TAU)) * 8 };
  } else if (p.legs === 'leap') {
    nearLeg = { hip: 0.9, knee: 0.6, lift: 0 }; farLeg = { hip: -0.8, knee: 0.2, lift: 0 };
  } else if (p.legs === 'slide') {
    nearLeg = { hip: 1.3, knee: 0.05, lift: 0 }; farLeg = { hip: 0.6, knee: 0.9, lift: 0 };
  } else if (p.legs === 'crouch') {
    nearLeg = { hip: 0.4, knee: 0.8, lift: 0 }; farLeg = { hip: -0.3, knee: 0.7, lift: 0 };
  } else { nearLeg = { hip: 0.05, knee: 0, lift: 0 }; farLeg = { hip: -0.05, knee: 0, lift: 0 }; }

  const legDraw = (L, dark, sd) => {
    ctx.save();
    ctx.translate(dark ? -14 : 12, sh.hipY);
    ctx.rotate(-L.hip);
    const kx = 0, ky = 26;
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(L.knee);
    shape(ctx, [[-18, -40], [18, -40], [18, 22], [-18, 22]], { fill: dark ? PAL.earSh : '#a8642f', lw: 6, seed: sd, tex: furTex(Math.PI / 2, PAL.earSh, 6, 14) });
    shape(ctx, [[-20, 18], [0, 12], [26, 14], [44, 22], [46, 34], [26, 40], [-16, 38], [-24, 30]], { fill: dark ? PAL.creamSh : PAL.cream, lw: 6, seed: sd + 1 });
    inkLine(ctx, [[28, 26], [30, 38]], 3, PAL.ink, sd + 2, 0.4);
    ctx.restore();
    ctx.restore();
  };
  // body transform (lean around hips)
  ctx.save();
  ctx.translate(0, sh.hipY); ctx.rotate(p.lean); ctx.translate(0, -sh.hipY);
  // tail
  drawTail(ctx, -70, -86, -0.5 + p.tail - p.lean * 0.5, seed + 900);
  // far arm
  const armTarget = (a, def) => a || def;
  const farDef = { x: -30, y: -140 };
  ctx.save(); ctx.globalAlpha = 1;
  drawArm(ctx, -8, sh.shoulderY + 4, armTarget(p.armL, farDef), 1, p.handL, seed + 300, true);
  ctx.restore();
  ctx.restore(); // (legs are not leaned)
  legDraw(farLeg, true, seed + 400);
  ctx.save();
  ctx.translate(0, sh.hipY); ctx.rotate(p.lean); ctx.translate(0, -sh.hipY);
  // coat (profile) with trailing tails
  const lag = p.coatLag, fl = p.coatFlutter;
  const w = (i) => fl * Math.sin(t * 20 + i * 1.3) * 8;
  const hem = sh.coatHem;
  const coat = [[-36, -268], [-62, -246], [-74, -196], [-80, -130], [-92 - lag * 60 + w(1), hem - 6 - lag * 30], [-60 - lag * 70 + w(2), hem + 4 - lag * 20], [-10 - lag * 40 + w(3), hem + 6], [40 - lag * 10, hem + 4], [70, hem - 2], [62, -120], [60, -190], [52, -240], [30, -266]];
  shape(ctx, coat, {
    fill: PAL.coat, lw: 7, seed: seed + 500,
    tex: { dir: Math.PI / 2 + 0.1, color: PAL.coatSh, color2: PAL.coatHi, n: 34, len: 30, alpha: 0.35, width: 2.6, spread: 0.3 },
    shade: (c) => { c.fillStyle = 'rgba(90,55,25,0.3)'; c.beginPath(); c.ellipse(-60, -150, 34, 120, 0, 0, TAU); c.fill(); },
  });
  shape(ctx, [[30, -268], [60, -282], [70, -254], [48, -238]], { fill: PAL.coatSh, lw: 5, seed: seed + 501 });
  shape(ctx, [[-8, -272], [-40, -286], [-54, -260], [-30, -252]], { fill: PAL.coatSh, lw: 5, seed: seed + 502 });
  shape(ctx, [[8, -110], [52, -108], [50, -94], [10, -94]], { fill: PAL.coatSh, lw: 4.5, seed: seed + 503 });
  inkLine(ctx, [[-20, -200], [-30, -150], [-36, -100]], 3, PAL.coatDk, seed + 504, 0.5);
  ctx.restore();
  legDraw(nearLeg, false, seed + 410);
  ctx.save();
  ctx.translate(0, sh.hipY); ctx.rotate(p.lean); ctx.translate(0, -sh.hipY);
  // head
  ctx.save();
  ctx.translate(14 + p.headX, sh.neckY + p.headY);
  ctx.rotate(p.headTilt - p.lean * 0.4);
  ctx.translate(0, sh.headY - sh.neckY);
  drawHeadSide(ctx, p, seed + 600);
  ctx.restore();
  // near arm (+ glass)
  if (p.glass) {
    const g = p.glass;
    drawGlass(ctx, g.x, g.y, g.r, g.ang, g.flip, g.lensFn);
    const hx = g.x + Math.cos(g.ang) * (g.r + 70), hy = g.y + Math.sin(g.ang) * (g.r + 70);
    drawArm(ctx, 16, sh.shoulderY + 6, { x: hx, y: hy }, 1, 'hold', seed + 310, false);
  } else drawArm(ctx, 16, sh.shoulderY + 6, armTarget(p.armR, { x: 30, y: -134 }), 1, p.handR, seed + 310, false);
  ctx.restore();
  ctx.restore();
}

// A smear frame: stretched ghost copies trailing the motion (used for 1–2 frames)
function drawDogSmear(ctx, p, t, dx, dy = 0) {
  for (let i = 3; i >= 1; i--) {
    ctx.save(); ctx.globalAlpha = 0.18 * (4 - i);
    const q = Object.assign({}, p, { x: p.x - dx * i * 0.28, y: p.y - dy * i * 0.28 });
    ctx.translate(q.x, q.y); ctx.scale(1 + Math.abs(dx) * 0.0006 * i, 1); ctx.translate(-q.x, -q.y);
    drawDog(ctx, q, t);
    ctx.restore();
  }
  drawDog(ctx, p, t);
  // streaks
  ctx.save(); ctx.strokeStyle = 'rgba(34,22,15,0.55)'; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const yy = p.y - 60 - i * 55 * p.s + hash(i * 7 + BOIL.variant) * 20;
    ctx.lineWidth = 3 + hash(i) * 4;
    ctx.beginPath(); ctx.moveTo(p.x - Math.sign(dx) * 80 * p.s, yy); ctx.lineTo(p.x - dx * (0.9 + hash(i + 9) * 0.6), yy); ctx.stroke();
  }
  ctx.restore();
}
