/* =====================================================================
   props.js — environments, clues, suspects, the book cover.
   The office is one continuous "set" in world units so the camera can
   move through it:  floor at y = 1400, x from 0 to 3200.
   ===================================================================== */
'use strict';

const SET = {
  floorY: 1400,
  pedestal: { x: 900, top: 1010 },
  lampHead: { x: 900, y: 690 },
  print: { x: 1085, y: 1392 },
  thread: { x: 968, y: 1022 },
  window: { x: 250, y: 420, w: 300, h: 420 },
  clock: { x: 1360, y: 520 },
  board: { x: 1640, y: 360, w: 900, h: 660 },
  vent: { x: 2640, y: 1262, w: 110, h: 96 },
  cabinet: { x: 1180, y: 1060 },
  hallDoor: { x: 2860 },
};

// ---------------------------------------------------------------------
// the bone
// ---------------------------------------------------------------------
function drawBone(ctx, x, y, s, rot = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const pts = [[-70, -12], [-80, -30], [-98, -30], [-106, -14], [-98, 0], [-106, 14], [-98, 30], [-80, 30], [-70, 12], [70, 12], [80, 30], [98, 30], [106, 14], [98, 0], [106, -14], [98, -30], [80, -30], [70, -12]];
  if (o.ghost) {
    ctx.globalAlpha *= o.ghost;
    ctx.beginPath(); curvePath(ctx, boiled(pts, 71, 1.5), true);
    ctx.strokeStyle = 'rgba(255,250,240,0.9)'; ctx.lineWidth = 7; ctx.setLineDash([22, 14]); ctx.stroke(); ctx.setLineDash([]);
  } else {
    shape(ctx, pts, {
      fill: '#fbf1dd', lw: 6, seed: 71,
      shade: (c) => {
        c.fillStyle = 'rgba(190,150,100,0.35)'; c.fillRect(-110, 6, 220, 30);
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-20, -5, 44, 4, 0, 0, TAU); c.fill();
      },
    });
    if (o.glint) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,250,230,${o.glint})`; star4(ctx, -60, -24, 26); ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
}

function star4(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.18 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }

// ---------------------------------------------------------------------
// office set
// ---------------------------------------------------------------------
function drawOfficeWall(ctx, light, o = {}) {
  const F = SET.floorY;
  // wall
  const g = ctx.createLinearGradient(0, 0, 0, F);
  g.addColorStop(0, '#2a2226'); g.addColorStop(1, '#3a2c28');
  ctx.fillStyle = g; ctx.fillRect(-400, -600, 4200, F + 600);
  // wallpaper stripes
  ctx.globalAlpha = 0.12;
  for (let x = -400; x < 3800; x += 70) { ctx.fillStyle = x % 140 === 0 ? '#5a4238' : '#1f181a'; ctx.fillRect(x, -600, 34, F + 600); }
  ctx.globalAlpha = 1;
  // picture rail + wainscot
  ctx.fillStyle = '#3d2a20'; ctx.fillRect(-400, 1130, 4200, 270);
  ctx.fillStyle = '#4c3426'; ctx.fillRect(-400, 1120, 4200, 18);
  for (let x = -400; x < 3800; x += 240) { ctx.strokeStyle = 'rgba(15,8,5,0.5)'; ctx.lineWidth = 4; ctx.strokeRect(x + 20, 1160, 200, 200); }
  // window with blinds + moon
  const w = SET.window;
  ctx.fillStyle = '#131a2c'; ctx.fillRect(w.x, w.y, w.w, w.h);
  const mg = ctx.createRadialGradient(w.x + 200, w.y + 110, 10, w.x + 200, w.y + 110, 180);
  mg.addColorStop(0, 'rgba(210,225,255,0.55)'); mg.addColorStop(1, 'rgba(40,60,110,0)');
  ctx.fillStyle = mg; ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = '#e8eefc'; ctx.beginPath(); ctx.arc(w.x + 200, w.y + 110, 34, 0, TAU); ctx.fill();
  for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(30,26,30,0.85)'; ctx.fillRect(w.x, w.y + 14 + i * 34, w.w, 12); }
  shape(ctx, [[w.x - 16, w.y - 16], [w.x + w.w + 16, w.y - 16], [w.x + w.w + 16, w.y + w.h + 16], [w.x - 16, w.y + w.h + 16]], { fill: null, lw: 22, line: '#2b1c14', seed: 5, amp: 0.8, tension: 0.2 });
  ctx.fillStyle = '#3a271c'; ctx.fillRect(w.x - 30, w.y + w.h + 10, w.w + 60, 26);
  // bookshelves (left of window + right of board)
  bookshelf(ctx, -330, 360, 520, 740, 3);
  bookshelf(ctx, 2600, 300, 380, 800, 8);
  // clock
  drawClock(ctx, SET.clock.x, SET.clock.y, 1, o.clockT || 0);
  // filing cabinet
  const c = SET.cabinet;
  shape(ctx, [[c.x, c.y], [c.x + 220, c.y], [c.x + 220, F], [c.x, F]], { fill: '#4a3d33', lw: 7, seed: 31, tension: 0.2, tex: { dir: 0, color: '#2e2520', n: 20, len: 30, alpha: 0.3 } });
  for (let i = 0; i < 3; i++) {
    const dy = c.y + 20 + i * 110 + (i === 1 ? 0 : 0);
    const out = i === 1 ? (o.drawer || 0) * 30 : 0;
    shape(ctx, [[c.x + 16 - out * 0.2, dy], [c.x + 204 + out * 0.2, dy], [c.x + 204 + out * 0.2, dy + 96], [c.x + 16 - out * 0.2, dy + 96]], { fill: '#5b4b3f', lw: 5, seed: 32 + i, tension: 0.2 });
    shape(ctx, [[c.x + 84, dy + 40], [c.x + 136, dy + 40], [c.x + 136, dy + 52], [c.x + 84, dy + 52]], { fill: '#b89a6a', lw: 3, seed: 40 + i, tension: 0.2 });
  }
  // the small vent near the floor (the "opening")
  const v = SET.vent;
  shape(ctx, [[v.x, v.y], [v.x + v.w, v.y], [v.x + v.w, v.y + v.h], [v.x, v.y + v.h]], { fill: '#0b0908', lw: 6, seed: 51, tension: 0.2 });
  ctx.save(); ctx.translate(v.x + v.w + 6, v.y); ctx.rotate(0.5);
  shape(ctx, [[0, 0], [v.w * 0.9, 0], [v.w * 0.9, v.h], [0, v.h]], { fill: '#6b6660', lw: 5, seed: 52, tension: 0.2, shade: (cc) => { cc.strokeStyle = '#2a2724'; cc.lineWidth = 5; for (let i = 1; i < 6; i++) { cc.beginPath(); cc.moveTo(4, i * v.h / 6); cc.lineTo(v.w * 0.9 - 4, i * v.h / 6); cc.stroke(); } } });
  ctx.restore();
  // hallway door (dark, ajar)
  const d = SET.hallDoor.x;
  ctx.fillStyle = '#0c0a0b'; ctx.fillRect(d, 520, 300, F - 520);
  shape(ctx, [[d - 24, 500], [d + 324, 500], [d + 324, F], [d - 24, F]], { fill: null, lw: 26, line: '#2a1b12', seed: 61, tension: 0.2, amp: 0.6 });
}

function bookshelf(ctx, x, y, w, h, seed) {
  shape(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { fill: '#2c1c14', lw: 8, seed, tension: 0.2 });
  const r = rng(seed * 13);
  const cols = ['#6e2f25', '#35463d', '#5a4a2c', '#2d3446', '#7a5a33', '#4a2a2f', '#5d5a4a'];
  for (let row = 0; row < 4; row++) {
    const sy = y + 20 + row * (h / 4);
    ctx.fillStyle = '#3d2718'; ctx.fillRect(x + 10, sy + h / 4 - 26, w - 20, 14);
    let bx = x + 16;
    while (bx < x + w - 40) {
      const bw = 18 + r() * 26, bh = h / 4 - 50 - r() * 40;
      const lean = r() < 0.1 ? 0.12 : 0;
      ctx.save(); ctx.translate(bx, sy + h / 4 - 26); ctx.rotate(lean);
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      ctx.fillRect(0, -bh, bw, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2.5; ctx.strokeRect(0, -bh, bw, bh);
      ctx.fillStyle = 'rgba(230,200,150,0.35)'; ctx.fillRect(3, -bh + 12, bw - 6, 4);
      ctx.restore();
      bx += bw + 3;
    }
  }
}

function drawClock(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, ellipsePts(0, 0, 92, 92, 16), { fill: '#e9dcc0', lw: 10, seed: 81, shade: (c) => { c.fillStyle = 'rgba(80,50,30,0.25)'; c.beginPath(); c.arc(20, 20, 90, 0, TAU); c.fill(); } });
  ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 70, Math.sin(a) * 70); ctx.lineTo(Math.cos(a) * 82, Math.sin(a) * 82); ctx.stroke(); }
  const sec = Math.floor(t) * TAU / 60 - Math.PI / 2 + TAU * 0.35;
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-2.2) * 44, Math.sin(-2.2) * 44); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-0.9) * 64, Math.sin(-0.9) * 64); ctx.stroke();
  ctx.strokeStyle = PAL.red; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-Math.cos(sec) * 14, -Math.sin(sec) * 14); ctx.lineTo(Math.cos(sec) * 76, Math.sin(sec) * 76); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawFloor(ctx, o = {}) {
  const F = SET.floorY;
  ctx.drawImage(TEX.wood, -400, F, 4200, 700);
  const g = ctx.createLinearGradient(0, F, 0, F + 700);
  g.addColorStop(0, 'rgba(20,10,5,0.2)'); g.addColorStop(1, 'rgba(10,5,2,0.7)');
  ctx.fillStyle = g; ctx.fillRect(-400, F, 4200, 700);
  ctx.strokeStyle = 'rgba(15,8,4,0.55)'; ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) { const yy = F + Math.pow(i / 6, 1.6) * 700; ctx.beginPath(); ctx.moveTo(-400, yy); ctx.lineTo(3800, yy); ctx.stroke(); }
  inkLine(ctx, [[-400, F], [1200, F + 1], [3800, F]], 7, PAL.ink, 91, 0.6);
}

function drawPedestal(ctx, o = {}) {
  const p = SET.pedestal, F = SET.floorY;
  // column
  shape(ctx, [[p.x - 60, p.top + 34], [p.x + 60, p.top + 34], [p.x + 70, F - 30], [p.x - 70, F - 30]], {
    fill: '#4d3b33', lw: 7, seed: 101, tension: 0.3,
    shade: (c) => { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(p.x + 18, p.top, 60, F); c.fillStyle = 'rgba(255,220,160,0.12)'; c.fillRect(p.x - 50, p.top, 24, F); },
  });
  shape(ctx, [[p.x - 100, F - 34], [p.x + 100, F - 34], [p.x + 108, F], [p.x - 108, F]], { fill: '#3c2c25', lw: 7, seed: 102, tension: 0.3 });
  shape(ctx, [[p.x - 96, p.top], [p.x + 96, p.top], [p.x + 90, p.top + 38], [p.x - 90, p.top + 38]], { fill: '#5d473c', lw: 7, seed: 103, tension: 0.3 });
  // velvet cushion
  shape(ctx, [[p.x - 80, p.top - 4], [p.x - 70, p.top - 22], [p.x + 70, p.top - 22], [p.x + 80, p.top - 4], [p.x + 40, p.top + 4], [p.x - 40, p.top + 4]], { fill: '#6d2230', lw: 5, seed: 104 });
  // torn red thread snagged on the corner
  if (o.thread) {
    const t = SET.thread;
    ctx.save(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    const sw = Math.sin((o.t || 0) * 2) * 3;
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.bezierCurveTo(t.x - 10, t.y + 18, t.x - 24 + sw, t.y + 26, t.x - 18 + sw, t.y + 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x - 18 + sw, t.y + 44); ctx.lineTo(t.x - 24 + sw, t.y + 50); ctx.moveTo(t.x - 18 + sw, t.y + 44); ctx.lineTo(t.x - 12 + sw, t.y + 51); ctx.stroke();
    ctx.restore();
  }
  if (o.bone) drawBone(ctx, p.x, p.top - 44, 0.62, -0.06, { glint: 0.5 + 0.5 * Math.sin((o.t || 0) * 5) });
}

function drawLampFloor(ctx, on, o = {}) {
  const L = SET.lampHead, F = SET.floorY;
  // pole
  ctx.save();
  inkLine(ctx, [[1190, F - 10], [1190, 560], [1100, 520], [980, 580], [L.x + 40, L.y - 40]], 16, PAL.ink, 111, 0.5);
  inkLine(ctx, [[1190, F - 10], [1190, 560], [1100, 520], [980, 580], [L.x + 40, L.y - 40]], 8, '#2c2622', 112, 0.5);
  shape(ctx, [[1130, F - 6], [1250, F - 6], [1240, F - 26], [1140, F - 26]], { fill: '#2c2622', lw: 6, seed: 113, tension: 0.3 });
  // shade
  ctx.translate(L.x, L.y); ctx.rotate(-0.25);
  shape(ctx, [[-30, -60], [30, -64], [74, 30], [-84, 36]], { fill: PAL.lamp, lw: 7, seed: 114, shade: (c) => { c.fillStyle = 'rgba(120,170,140,0.3)'; c.fillRect(-60, -60, 40, 100); } });
  // bulb
  ctx.beginPath(); ctx.ellipse(-4, 36, 50, 13, 0, 0, TAU); ctx.fillStyle = on ? '#fff3c4' : '#3d3a30'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.restore();
}

// volumetric lamp cone + pool of light (drawn with 'screen'/additive layers)
function drawLampLight(ctx, on, o = {}) {
  if (on <= 0) return;
  const L = SET.lampHead, F = SET.floorY;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = on;
  const g = ctx.createLinearGradient(L.x, L.y, L.x + 60, F);
  g.addColorStop(0, 'rgba(255,215,140,0.3)'); g.addColorStop(1, 'rgba(255,200,120,0.02)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(L.x - 50, L.y + 20); ctx.lineTo(L.x + 44, L.y + 8); ctx.lineTo(L.x + 330, F + 40); ctx.lineTo(L.x - 300, F + 40); ctx.closePath(); ctx.fill();
  const pool = ctx.createRadialGradient(L.x + 20, F - 380, 20, L.x + 20, F - 380, 520);
  pool.addColorStop(0, 'rgba(255,210,130,0.3)'); pool.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = pool; ctx.fillRect(L.x - 600, L.y - 200, 1200, 1200);
  // dust in the beam
  for (let i = 0; i < 40; i++) {
    const r1 = hash(i * 3 + 1), r2 = hash(i * 7 + 2);
    const yy = L.y + 40 + r1 * (F - L.y - 60) - ((o.t || 0) * 12 * (0.3 + r2)) % 300;
    const spread = (yy - L.y) / (F - L.y);
    const xx = L.x + (r2 - 0.5) * 2 * (40 + spread * 280);
    ctx.fillStyle = `rgba(255,240,200,${0.25 + 0.4 * hash(i + 99)})`;
    ctx.beginPath(); ctx.arc(xx, yy, 1.6 + hash(i + 5) * 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// muddy three-toed print (world, on the floor, seen at a grazing angle)
function drawPrintFloor(ctx, x, y, s = 1, alpha = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s * 0.32); ctx.rotate(rot); ctx.globalAlpha *= alpha;
  printShape(ctx, 3, 0, 0, 1, '#3b2414');
  ctx.restore();
}
// a paw print: toes 3 or 4, drawn top-down
function printShape(ctx, toes, x, y, s, color, detail) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color;
  const pad = [[-30, 10], [0, -6], [30, 10], [36, 36], [16, 52], [0, 50], [-16, 52], [-36, 36]];
  ctx.beginPath(); curvePath(ctx, boiled(pad, 121, 1), true); ctx.fill();
  const toePos = toes === 3 ? [[-36, -30], [0, -46], [36, -30]] : [[-46, -18], [-18, -44], [18, -44], [46, -18]];
  toePos.forEach(([tx, ty], i) => { ctx.beginPath(); curvePath(ctx, boiled(ellipsePts(tx, ty, 13, 17, 9, (tx / 60)), 130 + i, 1), true); ctx.fill(); });
  if (detail) {
    // mud splatter + highlights
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((hash(i) - 0.5) * 140, (hash(i + 20) - 0.5) * 140, 2 + hash(i + 40) * 5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,230,190,0.25)';
    ctx.beginPath(); ctx.ellipse(-8, 18, 16, 6, -0.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// suspects: original silhouettes (cat, rabbit, moose, fox)
// ---------------------------------------------------------------------
const SUSPECT_SHAPES = {
  cat: [[-40, 120], [-46, 60], [-56, 10], [-52, -40], [-40, -70], [-50, -120], [-22, -92], [0, -96], [22, -92], [50, -120], [40, -70], [52, -40], [56, 10], [70, 50], [96, 30], [104, 50], [80, 80], [52, 120]],
  rabbit: [[-44, 120], [-54, 60], [-48, 0], [-40, -40], [-44, -120], [-36, -170], [-20, -176], [-14, -120], [-6, -70], [6, -70], [14, -120], [20, -176], [36, -170], [44, -120], [40, -40], [48, 0], [54, 60], [44, 120]],
  moose: [[-60, 120], [-66, 40], [-56, -10], [-30, -40], [-40, -54], [-96, -70], [-120, -110], [-100, -104], [-96, -130], [-80, -104], [-70, -130], [-60, -100], [-40, -84], [-20, -70], [20, -70], [40, -84], [60, -100], [70, -130], [80, -104], [96, -130], [100, -104], [120, -110], [96, -70], [40, -54], [30, -40], [20, 10], [24, 60], [10, 110], [60, 120]],
  fox: [[-40, 120], [-48, 60], [-46, 0], [-36, -40], [-50, -110], [-20, -76], [0, -60], [20, -76], [50, -110], [36, -40], [60, -20], [30, -4], [46, 40], [80, 60], [110, 40], [96, 80], [60, 110], [44, 120]],
};
function drawSuspect(ctx, kind, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const base = o.color || '#1d1716';
  shape(ctx, SUSPECT_SHAPES[kind], { fill: base, lw: 5, seed: 200 + kind.length, line: '#0b0908' });
  // eyes glint
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  const ey = kind === 'moose' ? -48 : kind === 'rabbit' ? -34 : -44;
  ctx.beginPath(); ctx.arc(-14, ey, 4, 0, TAU); ctx.arc(14, ey, 4, 0, TAU); ctx.fill();
  if (o.detail) {
    if (kind === 'cat') { // clean white paws
      ctx.fillStyle = '#f5f1e8'; for (const px of [-30, 30]) { shape(ctx, ellipsePts(px, 114, 18, 9, 8), { fill: '#f7f3ea', lw: 3, seed: 210 + px }); }
    } else if (kind === 'rabbit') { // blue scarf
      shape(ctx, [[-46, -8], [46, -8], [48, 10], [-48, 10]], { fill: '#3f73c6', lw: 4, seed: 220 });
      shape(ctx, [[20, 6], [40, 6], [44, 60], [28, 62]], { fill: '#3563ad', lw: 4, seed: 221 });
    } else if (kind === 'moose') { // antlers highlighted (sheer size)
      ctx.strokeStyle = 'rgba(255,220,160,0.6)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-120, -110); ctx.lineTo(-40, -84); ctx.moveTo(120, -110); ctx.lineTo(40, -84); ctx.stroke();
    } else if (kind === 'fox') { // four-toed paw
      printShape(ctx, 4, -24, 104, 0.34, '#f0e3cc');
    }
  }
  ctx.restore();
}
// polaroid-style suspect photo
function drawPhoto(ctx, kind, x, y, w, h, rot, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(10,5,3,0.35)'; ctx.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
  shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], { fill: '#efe6d2', lw: 5, seed: 300 + kind.length, tension: 0.2 });
  const iw = w - 28, ih = h - 70;
  ctx.save(); ctx.beginPath(); ctx.rect(-iw / 2, -h / 2 + 14, iw, ih); ctx.clip();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, o.lit ? '#8f7a62' : '#6d6258'); g.addColorStop(1, '#3a332d');
  ctx.fillStyle = g; ctx.fillRect(-iw / 2, -h / 2 + 14, iw, ih);
  drawSuspect(ctx, kind, 0, -h / 2 + 14 + ih * 0.52, ih / 330, { detail: o.detail });
  ctx.restore();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.strokeRect(-iw / 2, -h / 2 + 14, iw, ih);
  // pin
  shape(ctx, ellipsePts(0, -h / 2 + 4, 11, 11, 8), { fill: PAL.red, lw: 4, seed: 310 + kind.length });
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-3, -h / 2, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
// red X drawn with a marker, p = 0..1 stroke progress
function drawX(ctx, x, y, s, p, seed = 7) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  const seg = (a, b, q) => {
    if (q <= 0) return;
    const P = boiled([a, [lerp(a[0], b[0], 0.5) + 6, lerp(a[1], b[1], 0.5) - 4], b], seed, 3);
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    const e = [lerp(P[0][0], P[2][0], q), lerp(P[0][1], P[2][1], q)];
    ctx.quadraticCurveTo(lerp(P[0][0], P[1][0], q), lerp(P[0][1], P[1][1], q), e[0], e[1]);
    ctx.strokeStyle = PAL.red; ctx.lineWidth = 16 * s; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,110,0.35)'; ctx.lineWidth = 5 * s; ctx.stroke();
  };
  seg([-90 * s, -100 * s], [90 * s, 100 * s], clamp(p * 2));
  seg([90 * s, -100 * s], [-90 * s, 100 * s], clamp(p * 2 - 1));
  ctx.restore();
}
function drawStamp(ctx, text, x, y, size, p, rot = -0.15) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const k = lerp(1.8, 1, Ease.out(clamp(p))); ctx.scale(k, k); ctx.globalAlpha *= clamp(p * 3);
  const w = brushTextWidth(text, size) + size * 1.2;
  ctx.strokeStyle = PAL.red; ctx.lineWidth = size * 0.16;
  ctx.strokeRect(-w / 2, -size * 0.95, w, size * 1.9);
  brushText(ctx, text, 0, size * 0.5, size, { color: PAL.red, width: 2.4, rough: 1.4 });
  ctx.restore();
}

function drawBoard(ctx, o = {}) {
  const b = SET.board;
  // frame + cork
  shape(ctx, [[b.x - 30, b.y - 30], [b.x + b.w + 30, b.y - 30], [b.x + b.w + 30, b.y + b.h + 30], [b.x - 30, b.y + b.h + 30]], { fill: '#4a2d1a', lw: 8, seed: 401, tension: 0.2 });
  ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  ctx.fillStyle = ctx.createPattern(TEX.cork, 'repeat'); ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(20,10,5,0.25)'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
  // clue cards
  const cards = boardLayout();
  // strings first
  ctx.save(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 3.5;
  for (const [a, c] of [['print', 'cat'], ['thread', 'rabbit'], ['vent', 'moose'], ['print', 'fox'], ['thread', 'fox'], ['vent', 'fox']]) {
    const A = cards[a], C = cards[c];
    ctx.beginPath(); ctx.moveTo(A.x, A.y - A.h / 2 + 4); ctx.quadraticCurveTo((A.x + C.x) / 2, (A.y + C.y) / 2 + 40, C.x, C.y - C.h / 2 + 4); ctx.stroke();
  }
  ctx.restore();
  // evidence cards
  clueCard(ctx, 'print', cards.print);
  clueCard(ctx, 'thread', cards.thread);
  clueCard(ctx, 'vent', cards.vent);
  for (const k of ['cat', 'rabbit', 'moose', 'fox']) {
    const c = cards[k];
    drawPhoto(ctx, k, c.x, c.y, c.w, c.h, c.rot, { detail: o.detail && o.detail[k], lit: o.lit === k });
    if (o.x && o.x[k]) drawX(ctx, c.x, c.y - 10, c.w / 220, o.x[k], 7 + k.length);
    if (o.dim && o.dim[k]) { ctx.save(); ctx.globalAlpha = o.dim[k] * 0.45; ctx.fillStyle = '#120c0a'; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore(); }
  }
  // the "?" card for the unknown
  if (o.question) {
    const q = cards.q;
    shape(ctx, [[q.x - 60, q.y - 70], [q.x + 60, q.y - 70], [q.x + 60, q.y + 70], [q.x - 60, q.y + 70]], { fill: '#f3d56a', lw: 5, seed: 440, tension: 0.2 });
    brushText(ctx, '?', q.x, q.y + 40, 90, { color: PAL.ink, width: 2.6 });
  }
}
function boardLayout() {
  const b = SET.board;
  return {
    cat: { x: b.x + 150, y: b.y + 170, w: 210, h: 250, rot: -0.05 },
    rabbit: { x: b.x + 370, y: b.y + 150, w: 210, h: 250, rot: 0.04 },
    moose: { x: b.x + 590, y: b.y + 175, w: 210, h: 250, rot: -0.03 },
    fox: { x: b.x + 780, y: b.y + 420, w: 210, h: 250, rot: 0.05 },
    print: { x: b.x + 150, y: b.y + 480, w: 170, h: 150, rot: 0.03 },
    thread: { x: b.x + 360, y: b.y + 500, w: 170, h: 150, rot: -0.04 },
    vent: { x: b.x + 565, y: b.y + 480, w: 170, h: 150, rot: 0.02 },
    q: { x: b.x + 780, y: b.y + 150, w: 120, h: 140, rot: 0 },
  };
}
function clueCard(ctx, kind, c) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
  ctx.fillStyle = 'rgba(10,5,3,0.35)'; ctx.fillRect(-c.w / 2 + 6, -c.h / 2 + 8, c.w, c.h);
  shape(ctx, [[-c.w / 2, -c.h / 2], [c.w / 2, -c.h / 2], [c.w / 2, c.h / 2], [-c.w / 2, c.h / 2]], { fill: PAL.paper, lw: 4.5, seed: 450 + kind.length, tension: 0.2 });
  if (kind === 'print') printShape(ctx, 3, 0, 4, 0.8, '#4a2c17', true);
  if (kind === 'thread') { ctx.strokeStyle = PAL.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-50, -30); ctx.bezierCurveTo(-10, 40, 20, -40, 50, 30); ctx.stroke(); }
  if (kind === 'vent') {
    ctx.fillStyle = '#141010'; ctx.fillRect(-36, -30, 72, 62);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.strokeRect(-36, -30, 72, 62);
    ctx.strokeStyle = '#c9a44f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-36, 46); ctx.lineTo(36, 46); ctx.stroke();
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(-36 + i * 12, 46); ctx.lineTo(-36 + i * 12, i % 3 ? 40 : 36); ctx.stroke(); }
  }
  shape(ctx, ellipsePts(0, -c.h / 2 + 2, 9, 9, 8), { fill: '#d8c24a', lw: 3.5, seed: 460 + kind.length });
  ctx.restore();
}

// ---------------------------------------------------------------------
// hallway (chase)
// ---------------------------------------------------------------------
function drawHallway(ctx, scroll, o = {}) {
  const F = 1500;
  const g = ctx.createLinearGradient(0, 0, 0, F);
  g.addColorStop(0, '#221c22'); g.addColorStop(1, '#35282a');
  ctx.fillStyle = g; ctx.fillRect(-2000, -500, 8000, F + 500);
  // doors + frames repeating (parallax handled by caller's scroll)
  for (let i = -2; i < 14; i++) {
    const x = i * 700 - (scroll % 700);
    ctx.fillStyle = '#2e2019'; ctx.fillRect(x + 80, 700, 240, F - 700);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 10; ctx.strokeRect(x + 80, 700, 240, F - 700);
    ctx.fillStyle = '#c9a15a'; ctx.beginPath(); ctx.arc(x + 290, 1120, 10, 0, TAU); ctx.fill();
    // frame on wall
    ctx.fillStyle = '#4a3222'; ctx.fillRect(x + 440, 820, 160, 200);
    ctx.fillStyle = '#6a7a6a'; ctx.fillRect(x + 458, 838, 124, 164);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.strokeRect(x + 440, 820, 160, 200);
    // sconce light pool
    const lg = ctx.createRadialGradient(x + 520, 700, 10, x + 520, 700, 320);
    lg.addColorStop(0, 'rgba(255,205,130,0.35)'); lg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lg; ctx.fillRect(x + 200, 380, 640, 700);
  }
  ctx.fillStyle = '#3d2a20'; ctx.fillRect(-2000, 1250, 8000, F - 1250);
  ctx.fillStyle = '#4c3426'; ctx.fillRect(-2000, 1240, 8000, 16);
  // floor
  ctx.drawImage(TEX.wood, -2000 - (scroll % 512), F, 8000, 600);
  ctx.fillStyle = 'rgba(10,5,2,0.45)'; ctx.fillRect(-2000, F, 8000, 600);
  inkLine(ctx, [[-2000, F], [6000, F]], 7, PAL.ink, 93, 0.5);
}
function drawFileStack(ctx, x, y, s, seed = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const cols = ['#d7b779', '#c9a466', '#e1c48a', '#b8925a'];
  for (let i = 0; i < 6; i++) {
    const yy = -i * 28, dx = (hash(i + seed) - 0.5) * 20;
    shape(ctx, [[-110 + dx, yy - 26], [110 + dx, yy - 26], [112 + dx, yy], [-112 + dx, yy]], { fill: cols[i % 4], lw: 5, seed: 500 + i + seed, tension: 0.2 });
    ctx.fillStyle = '#f5ecd9'; ctx.fillRect(-100 + dx, yy - 30, 60, 6);
  }
  ctx.restore();
}
function drawShutter(ctx, x, top, bottom, w) {
  shape(ctx, [[x - 20, top - 60], [x + w + 20, top - 60], [x + w + 20, top], [x - 20, top]], { fill: '#3b2a20', lw: 6, seed: 520, tension: 0.2 });
  ctx.fillStyle = '#5a5048'; ctx.fillRect(x, top, w, bottom - top);
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 5;
  for (let y = top + 20; y < bottom; y += 34) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 8; ctx.strokeRect(x, top, w, bottom - top);
  ctx.fillStyle = '#c9a15a'; ctx.fillRect(x + w / 2 - 30, bottom - 22, 60, 12);
}

// the culprit silhouette (never revealed)
function drawCulprit(ctx, x, y, s, t, o = {}) {
  // deliberately ambiguous: a hunched shape in shadow, one curled tuft, a long thin tail — no species tells
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const bob = Math.sin(t * 3) * 3;
  const pts = [[-70, 0], [-84, -40], [-72, -84], [-40, -108], [-6, -112], [8, -128], [2, -146], [18, -140], [22, -116], [48, -102], [72, -70], [80, -30], [74, 0]];
  // tail
  ctx.strokeStyle = '#0d0a0b'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(60, -10); ctx.bezierCurveTo(130, -10, 150, -70, 118, -90); ctx.stroke();
  shape(ctx, pts.map(([a, b]) => [a, b + (b < -60 ? bob : 0)]), { fill: '#0d0a0b', lw: 5, line: '#050404', seed: 600 });
  // rim light
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(255,200,120,0.35)'; ctx.lineWidth = 4;
  ctx.beginPath(); curvePath(ctx, [[-60, -96], [-30, -114], [0, -116]].map(([a, b]) => [a, b - 2 + bob]), false); ctx.stroke();
  ctx.restore();
  // eyes
  const blink = (Math.floor(t * 12) % 40) < 2;
  if (!blink) { ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.ellipse(-26, -70 + bob, 7, 4, 0, 0, TAU); ctx.ellipse(8, -70 + bob, 7, 4, 0, 0, TAU); ctx.fill(); }
  // the faintest glint of a red thread end
  if (o.thread) { ctx.strokeStyle = 'rgba(200,50,42,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(46, -44); ctx.quadraticCurveTo(62, -24, 54, -8); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------------
// case file + book cover
// ---------------------------------------------------------------------
function drawCaseFile(ctx, x, y, w, h, open, rot = 0) {
  // open: 1 = cover open (flipped up), 0 = closed
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-w / 2 + 10, -h / 2 + 14, w, h);
  shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], { fill: '#caa66a', lw: 6, seed: 700, tension: 0.2 });
  // pages inside
  if (open > 0.02) {
    shape(ctx, [[-w / 2 + 16, -h / 2 + 16], [w / 2 - 16, -h / 2 + 16], [w / 2 - 16, h / 2 - 16], [-w / 2 + 16, h / 2 - 16]], { fill: PAL.paper, lw: 4, seed: 701, tension: 0.2 });
    ctx.strokeStyle = 'rgba(60,40,25,0.35)'; ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 50, -h / 2 + 80 + i * 60); ctx.lineTo(w / 2 - 60 - hash(i) * 120, -h / 2 + 80 + i * 60); ctx.stroke(); }
    drawPhoto(ctx, 'fox', w * 0.18, -h * 0.12, 150, 180, 0.06, {});
  }
  // cover rotating down from the top (hinge at left edge): scaleX from -1 (open) to 1 (closed)
  const k = lerp(1, -1, clamp(open));
  if (Math.abs(k) > 0.02) {
    ctx.save(); ctx.translate(-w / 2, 0); ctx.scale(k, 1); ctx.translate(w / 2, 0);
    shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], { fill: k > 0 ? '#d6b477' : '#b8935a', lw: 6, seed: 702, tension: 0.2 });
    if (k > 0) {
      // tab + red paw stamp
      printShape(ctx, 3, w * 0.22, h * 0.18, 0.9, 'rgba(180,40,34,0.75)');
      ctx.fillStyle = 'rgba(80,50,20,0.25)'; ctx.fillRect(-w / 2 + 30, -h / 2 + 40, w * 0.5, 16);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawBookCover(ctx, x, y, w, h, t, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-w / 2 + 12, -h / 2 + 16, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  ctx.fillStyle = '#f7efdf'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalAlpha = 0.25; ctx.drawImage(TEX.paper, -w / 2, -h / 2, w, h); ctx.globalAlpha = 1;
  const k = w / 1100; // cover drawn in 1100 × 1420 units
  ctx.scale(k, k);
  const cx = -550, cy = -710;
  // board right
  ctx.save(); ctx.translate(cx, cy);
  shape(ctx, [[800, 540], [1110, 530], [1110, 1260], [790, 1270]], { fill: '#8a5c35', lw: 8, seed: 801, tension: 0.2 });
  ctx.fillStyle = ctx.createPattern(TEX.cork, 'repeat'); ctx.fillRect(820, 560, 290, 690);
  drawSuspect(ctx, 'cat', 910, 700, 0.42, { color: '#3a2e2a' });
  drawSuspect(ctx, 'rabbit', 1050, 720, 0.38, { color: '#3a2e2a' });
  drawSuspect(ctx, 'moose', 990, 930, 0.34, { color: '#3a2e2a' });
  ctx.strokeStyle = PAL.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(940, 640); ctx.lineTo(1040, 660); ctx.lineTo(990, 860); ctx.stroke();
  shape(ctx, [[1010, 1030], [1100, 1030], [1100, 1140], [1010, 1140]], { fill: '#f3d56a', lw: 5, seed: 802, tension: 0.2 });
  brushText(ctx, '?', 1055, 1115, 70, { color: PAL.ink });
  // lamp top-left
  shape(ctx, [[0, 470], [120, 480], [210, 560], [20, 640]], { fill: PAL.lamp, lw: 8, seed: 803 });
  const lg = ctx.createRadialGradient(130, 620, 10, 130, 620, 260); lg.addColorStop(0, 'rgba(255,220,130,0.7)'); lg.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = lg; ctx.fillRect(-100, 400, 500, 500);
  // book stack left
  const labels = ['CLUES', 'SUSPECTS', 'DEDUCE', 'ELIMINATE', 'SOLVE'];
  const bc = ['#a8553a', '#b0663e', '#9a6a42', '#8f5a36', '#a4583a'];
  labels.forEach((lb, i) => {
    const by = 760 + i * 92;
    shape(ctx, [[-10, by], [150 + (i % 2) * 14, by + 4], [154 + (i % 2) * 14, by + 84], [-10, by + 84]], { fill: bc[i], lw: 6, seed: 810 + i, tension: 0.2 });
  });
  labels.forEach((lb, i) => brushText(ctx, lb.length > 7 ? lb.slice(0, 7) : lb, 70, 760 + i * 92 + 58, 30, { color: PAL.ink, width: 1.6, dry: false }));
  // desk
  shape(ctx, [[-20, 1260], [1120, 1240], [1120, 1440], [-20, 1440]], { fill: '#6b3f22', lw: 8, seed: 820, tension: 0.2 });
  ctx.restore();
  // the detective (same rig), big, looking through the glass
  const dp = pose({ x: 0, y: 0, s: 1, browL: 1, browR: 1, mouth: 'frown', turn: 0.05, glass: { x: -40, y: -336, r: 50, ang: 2.2, hand: 'L', face: true } });
  ctx.save(); ctx.translate(cx + 520, cy + 1600); ctx.scale(1.9, 1.9);
  drawDog(ctx, dp, t);
  ctx.restore();
  // ghost bone on the desk
  ctx.save(); ctx.translate(cx + 560, cy + 1300); drawBone(ctx, 0, 0, 1.2, 0, { ghost: 0.8 }); ctx.restore();
  // title
  ctx.save(); ctx.translate(cx, cy);
  brushText(ctx, 'WHO STOLE', 550, 230, 150, { color: '#1a1412', width: 3.2, rough: 1.6, seed: 31 });
  brushText(ctx, 'THE BONE?', 550, 450, 190, { color: '#d8332a', width: 3.4, rough: 1.8, seed: 47 });
  // tape label
  ctx.save(); ctx.translate(780, 560); ctx.rotate(-0.04);
  ctx.fillStyle = '#f2d777'; ctx.fillRect(-250, -62, 500, 124);
  brushText(ctx, 'AN ELIMINATION', -20, -10, 34, { color: PAL.ink, width: 1.7, dry: false });
  brushText(ctx, 'PUZZLE BOOK', -40, 44, 34, { color: PAL.ink, width: 1.7, dry: false });
  printShape(ctx, 4, 200, 10, 0.34, PAL.ink);
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,12,8,0.8)'; ctx.lineWidth = 5; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

// desk-top clutter for the final shot (top-down)
function drawDeskTop(ctx, t, o = {}) {
  ctx.save();
  ctx.fillStyle = PAL.woodDk; ctx.fillRect(-1200, -1600, 3500, 4200);
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 9; i++) ctx.drawImage(TEX.wood, -1200, -1600 + i * 470, 3500, 470);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-1200, -1600, 3500, 4200);
  // lamp glow from top-left
  const lg = ctx.createRadialGradient(80, 200, 50, 80, 200, 1300);
  lg.addColorStop(0, 'rgba(255,210,130,0.45)'); lg.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lg; ctx.fillRect(-1200, -1600, 3500, 4200); ctx.globalCompositeOperation = 'source-over';
  // lamp base seen from above
  shape(ctx, ellipsePts(-420, -180, 130, 110, 12), { fill: PAL.lamp, lw: 8, seed: 901 });
  ctx.fillStyle = 'rgba(255,240,190,0.9)'; ctx.beginPath(); ctx.ellipse(-420, -180, 60, 50, 0, 0, TAU); ctx.fill();
  // mug
  shape(ctx, ellipsePts(1280, 320, 110, 110, 14), { fill: '#e7d9c2', lw: 8, seed: 902 });
  shape(ctx, ellipsePts(1280, 320, 82, 82, 14), { fill: '#4a2a18', lw: 5, seed: 903 });
  shape(ctx, [[1380, 290], [1440, 290], [1440, 350], [1380, 350]], { fill: '#e7d9c2', lw: 7, seed: 904 });
  // notes with crossed-out suspects
  const note = (x, y, rot, kind, crossed, seed) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    shape(ctx, [[-150, -110], [150, -110], [150, 110], [-150, 110]], { fill: PAL.paper, lw: 5, seed, tension: 0.2 });
    drawSuspect(ctx, kind, -60, 30, 0.5, { color: '#3a302b' });
    ctx.strokeStyle = 'rgba(60,40,25,0.5)'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10, -50 + i * 40); ctx.lineTo(120, -50 + i * 40); ctx.stroke(); }
    if (crossed) drawX(ctx, 0, 0, 0.9, 1, seed);
    ctx.restore();
  };
  note(-620, 820, -0.12, 'cat', true, 910);
  note(-640, 1140, 0.08, 'rabbit', true, 911);
  note(1260, 900, 0.1, 'moose', true, 912);
  note(1240, 1240, -0.06, 'fox', false, 913);
  // red string across
  ctx.strokeStyle = PAL.red; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-560, 760); ctx.bezierCurveTo(-200, 600, 300, 1400, 1180, 1160); ctx.stroke();
  // pencil
  ctx.save(); ctx.translate(900, 1500); ctx.rotate(-0.6);
  shape(ctx, [[-180, -12], [150, -12], [150, 12], [-180, 12]], { fill: '#e8b93a', lw: 5, seed: 920, tension: 0.2 });
  shape(ctx, [[150, -12], [196, 0], [150, 12]], { fill: '#f1d6a8', lw: 5, seed: 921, tension: 0.2 });
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.moveTo(182, -4); ctx.lineTo(196, 0); ctx.lineTo(182, 4); ctx.fill();
  shape(ctx, [[-200, -12], [-180, -12], [-180, 12], [-200, 12]], { fill: '#d98a8a', lw: 5, seed: 922, tension: 0.2 });
  ctx.restore();
  // evidence photos
  ctx.save(); ctx.translate(-560, 1480); ctx.rotate(0.15); clueCard(ctx, 'print', { x: 0, y: 0, w: 220, h: 190, rot: 0 }); ctx.restore();
  ctx.save(); ctx.translate(-300, 1620); ctx.rotate(-0.1); clueCard(ctx, 'thread', { x: 0, y: 0, w: 220, h: 190, rot: 0 }); ctx.restore();
  ctx.restore();
}
