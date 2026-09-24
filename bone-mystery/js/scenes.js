/* =====================================================================
   scenes.js — THE CASE OF THE VANISHING BONE
   Each scene: { name, dur, base, draw(ctx, u), cues }
     dur  = seconds on screen (change these to retime the film)
     base = the length the scene was authored at; all inner timings are
            in base seconds and stretch automatically when dur changes.
   Character poses are sampled at 12 fps (step(u, 12)); cameras are smooth.
   ===================================================================== */
'use strict';

SET.vent.x = 2300;   // the small opening sits under the evidence board

// ---------------------------------------------------------------------
// shared scene helpers
// ---------------------------------------------------------------------
const C12 = (u) => step(u, 12);
const hold = (u, a, b) => u >= a && u < b;

function lightOverlay(ctx, cam, lamp, o = {}) {
  const [px, py] = toScreen(cam, 930, 1060);
  const R = 1000 * cam.zoom;
  const edge = lerp(0.97, 0.66, lamp) + (o.dark || 0);
  const g = ctx.createRadialGradient(px, py, R * 0.12, px, py, R);
  g.addColorStop(0, `rgba(10,8,16,${lerp(0.97, 0.02, lamp)})`);
  g.addColorStop(0.55, `rgba(10,8,16,${lerp(0.97, 0.35, lamp)})`);
  g.addColorStop(1, `rgba(8,7,14,${Math.min(0.98, edge)})`);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (lamp < 0.5) {
    // moonlight through the blinds
    const [wx, wy] = toScreen(cam, SET.window.x + 150, SET.window.y + 200);
    ctx.globalCompositeOperation = 'screen';
    const mg = ctx.createRadialGradient(wx, wy, 10, wx, wy, 700 * cam.zoom);
    mg.addColorStop(0, 'rgba(80,110,170,0.35)'); mg.addColorStop(1, 'rgba(30,40,80,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// the whole office, lit by the lamp. o: {lamp, bone, thread, print, dog, board, clockT, drawer, extra(ctx), front(ctx), smallPrints}
function office(ctx, cam, t, o = {}) {
  const lamp = o.lamp == null ? 1 : o.lamp;
  const world = (lens) => {
    drawOfficeWall(ctx, lamp, { clockT: o.clockT || t, drawer: o.drawer });
    drawBoard(ctx, o.board || {});
    drawFloor(ctx);
    if (o.smallPrints) for (let i = 0; i < 7; i++) drawPrintFloor(ctx, 1260 + i * 150, 1396 - (i % 2) * 4, 0.32, o.smallPrints, 0.2);
    if (o.print !== false) drawPrintFloor(ctx, SET.print.x, SET.print.y, 0.62, 1, 0.1);
    drawPedestal(ctx, { bone: o.bone, thread: o.thread !== false, t });
    drawLampFloor(ctx, lamp > 0.5);
    if (o.extra) o.extra(ctx, lens);
    if (o.dog && !lens) drawDog(ctx, o.dog, t);
  };
  inWorld(ctx, cam, t, () => world(false));
  if (o.screen) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); o.screen(ctx); ctx.restore(); }
  lightOverlay(ctx, cam, lamp, o);
  inWorld(ctx, cam, t, () => drawLampLight(ctx, lamp, { t }));
  if (o.front) inWorld(ctx, cam, t, () => o.front(ctx));
  Info.cam = cam;
  return world;
}

// speed lines (manga focus lines) around a point
function focusLines(ctx, cx, cy, n, inner, alpha = 0.9, color = '#fff', seed = 1) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = color; ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(i + seed * 99 + BOIL.variant * 7) * 0.12;
    const w = 0.006 + hash(i * 3 + seed) * 0.014;
    const r0 = inner * (0.9 + hash(i * 7 + BOIL.variant) * 0.5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - w) * 2400, cy + Math.sin(a - w) * 2400);
    ctx.lineTo(cx + Math.cos(a + w) * 2400, cy + Math.sin(a + w) * 2400);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function speedLinesH(ctx, dir, alpha, seed = 3, color = 'rgba(255,245,230,0.8)') {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = hash(i * 13 + seed + BOIL.variant * 31) * H;
    const x = hash(i * 7 + seed + BOIL.variant * 17) * W;
    const L = 200 + hash(i + seed) * 500;
    ctx.lineWidth = 2 + hash(i * 5) * 6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * L, y); ctx.stroke();
  }
  ctx.restore();
}
function flash(ctx, a, color = '#fff') {
  if (a <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function fadeBlack(ctx, a) { flash(ctx, a, '#000'); }
function screenBG(ctx, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// in-scene handwritten label (chalky, part of the picture)
function clueLabel(ctx, str, x, y, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || -0.06);
  brushTextReveal(ctx, str, 0, 0, o.size || 60, p * 1.4, { color: o.color || '#fff4dc', width: 2.2, shadow: 'rgba(0,0,0,0.55)', align: o.align || 'left' });
  if (p > 0.7 && o.underline !== false) {
    const w = brushTextWidth(str, o.size || 60);
    const q = clamp((p - 0.7) / 0.3);
    inkLine(ctx, [[0, 18], [w * 0.5 * q, 24], [w * q, 16]], 5, o.color || '#fff4dc', 777, 1.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// top-down floor (POV + inserts). Screen-sized world 1080×1920.
// ---------------------------------------------------------------------
function floorTop(ctx, o = {}) {
  ctx.fillStyle = PAL.woodDk; ctx.fillRect(-600, -600, 2300, 3200);
  for (let i = -3; i < 12; i++) {
    ctx.save(); ctx.translate(i * 190, -600); ctx.rotate(Math.PI / 2);
    ctx.drawImage(TEX.wood, 0, -190, 3200, 190);
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,8,4,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(i * 190, -600); ctx.lineTo(i * 190, 2600); ctx.stroke();
  }
  // pedestal base (top-left) + dangling thread lying on the floor
  if (o.pedestal !== false) {
    shape(ctx, [[-200, -300], [360, -300], [380, 420], [-200, 440]], { fill: '#3c2c25', lw: 9, seed: 150, tension: 0.2, shade: (c) => { c.fillStyle = 'rgba(255,220,160,0.1)'; c.fillRect(-200, -300, 560, 60); } });
    ctx.strokeStyle = PAL.red; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(360, 300); ctx.bezierCurveTo(420, 380, 470, 360, 500, 440); ctx.bezierCurveTo(520, 500, 470, 540, 520, 580); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(520, 580); ctx.lineTo(540, 600); ctx.moveTo(520, 580); ctx.lineTo(530, 604); ctx.stroke();
  }
  if (o.print !== false) printShape(ctx, 3, 560, 1160, 2.3, '#3a2213', true);
  if (o.small) for (let i = 0; i < 6; i++) printShape(ctx, 3, 280 + i * 150 + (i % 2) * 30, 1500 - i * 190, 0.8, `rgba(58,34,19,${o.small})`);
  // lamp pool
  const g = ctx.createRadialGradient(560, 1000, 50, 560, 1000, 1100);
  g.addColorStop(0, 'rgba(255,210,140,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(-600, -600, 2300, 3200);
}

// ---------------------------------------------------------------------
// SCENE 1 — THE CRIME
// ---------------------------------------------------------------------
function insertEye(ctx, u, open, o = {}) {
  screenBG(ctx, '#1d1410', '#0c0806');
  ctx.save();
  ctx.translate(540, 960);
  const k = o.k || 5.2;
  ctx.scale(k, k);
  ctx.translate(38 - (o.dx || 0), -2);
  const p = pose(Object.assign({ blink: 1 - open, browL: 1.1, browR: 1.1, eyeX: 0.2, eyeY: 0.1 }, o.pose || {}));
  drawHeadFront(ctx, p, 1500);
  ctx.restore();
  // anime eye-strip lighting
  ctx.save();
  const g1 = ctx.createLinearGradient(0, 560, 0, 760); g1.addColorStop(0, 'rgba(0,0,0,0.85)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, 760);
  const g2 = ctx.createLinearGradient(0, 1160, 0, 1400); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = g2; ctx.fillRect(0, 1160, W, H);
  ctx.restore();
}
function insertPedestalEmpty(ctx, u) {
  screenBG(ctx, '#2a1714', '#0e0706');
  ctx.save(); ctx.translate(540, 1080); ctx.scale(4.2, 4.2); ctx.translate(-900, -1010);
  drawPedestal(ctx, { thread: false });
  ctx.restore();
  focusLines(ctx, 540, 980, 90, 360, 0.75, '#fff');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(200,60,50,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function insertPrint(ctx, u, o = {}) {
  ctx.save();
  const z = o.zoom || 1;
  ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-560, -1160 + (o.dy || 0));
  floorTop(ctx, { pedestal: false, small: o.small });
  ctx.restore();
}
function insertThread(ctx, u) {
  screenBG(ctx, '#2a1d17', '#120b08');
  ctx.save(); ctx.translate(540, 900); ctx.scale(5.5, 5.5); ctx.translate(-SET.thread.x + 10, -SET.thread.y - 20);
  drawPedestal(ctx, { thread: true, t: u });
  ctx.restore();
  focusLines(ctx, 540, 1000, 60, 520, 0.3, '#fff', 4);
}

const S1 = {
  name: 'THE CRIME', dur: 4.2, base: 4.2,
  cues: [[0.1, 'tick'], [0.5, 'tock'], [0.9, 'tick'], [1.3, 'tock', 0.8], [1.7, 'tick', 0.7], [2.1, 'tock', 0.6], [2.25, 'click'],
    [2.35, 'patter', 0.9], [2.62, 'drawer'], [2.84, 'slide'], [2.95, 'click'], [3.38, 'sting', 0.8],
    [3.4, 'hit'], [3.6, 'hit', 0.9], [3.8, 'hit', 0.9], [4.0, 'hit', 0.8], [4.02, 'whoosh', 0.6]],
  draw(ctx, u) {
    const t = u;
    if (u < 1.25) {
      // black: only the ticking — a faint glint of the clock hand every tick
      screenBG(ctx, '#000', '#000');
      const tickP = (u % 0.4) / 0.4;
      if (u > 0.05) { ctx.save(); ctx.globalAlpha = (1 - tickP) * 0.25; ctx.fillStyle = '#ffdca0'; ctx.beginPath(); ctx.arc(540, 900, 3, 0, TAU); ctx.fill(); ctx.restore(); }
      return { vignette: 0.8 };
    }
    if (u < 3.4) {
      const lampOn = u < 2.25 || u >= 2.95 ? 1 : 0;
      const gone = u >= 2.95;
      const cam = camKeys(u, [[1.25, { x: 902, y: 950, zoom: 3.6 }], [2.25, { x: 902, y: 955, zoom: 4.1 }, Ease.sine], [2.95, { x: 902, y: 955, zoom: 4.1 }], [3.4, { x: 902, y: 955, zoom: 4.2 }]]);
      office(ctx, cam, t, {
        lamp: lampOn, bone: !gone, thread: gone,
        drawer: u > 2.62 && u < 2.9 ? 1 : 0,
        extra: (c) => {
          // in the dark: a small shape passes through the moonlight
          if (!lampOn && u > 2.45 && u < 2.8) {
            const q = inv(2.45, 2.8, u);
            c.save(); c.globalAlpha = 0.85; drawCulprit(c, lerp(760, 1060, q), 1010, 0.35, u); c.restore();
          }
        },
      });
      if (!lampOn) fadeBlack(ctx, 0.55);
      return { vignette: 0.75 };
    }
    // shock cuts
    const k = Math.floor((u - 3.4) / 0.2);
    const lu = (u - 3.4) % 0.2;
    if (k === 0) insertPedestalEmpty(ctx, u);
    else if (k === 1) { insertPrint(ctx, u, { zoom: 1.25 }); focusLines(ctx, 540, 960, 70, 480, 0.35, '#fff', 2); }
    else if (k === 2) insertThread(ctx, u);
    else insertEye(ctx, u, lu < 0.06 ? 0 : lu < 0.11 ? 0.45 : 1, { k: 11 });
    flash(ctx, lu < 1 / 24 ? 0.9 : 0, k % 2 ? '#fff' : '#000');
    return { vignette: 0.7 };
  },
};

// ---------------------------------------------------------------------
// SCENE 2 — THE DETECTIVE ARRIVES
// ---------------------------------------------------------------------
const S2poseKeys = [
  [0, { x: 1560, y: 1400, s: 1.25, turn: -0.6, legs: 'walk', phase: 0, browL: 0.9, browR: 0.9, mouth: 'flat', eyeX: -0.6, armL: { x: -96, y: -120 }, armR: { x: 96, y: -118 } }],
  [1.7, { x: 1180, phase: 2.6 }, Ease.lin],
  [1.85, { legs: 'stand', phase: 0 }],
  [2.1, { armR: { x: 70, y: -420 }, handR: 'fist', hatTilt: -0.05, headTilt: 0.04 }],
  [2.35, { armR: { x: 64, y: -430 }, hatTilt: 0.02 }],
  [2.6, { armR: { x: 96, y: -118 }, handR: 'paw', hatTilt: 0, headTilt: 0 }],
];
const S2 = {
  name: 'THE DETECTIVE ARRIVES', dur: 5.0, base: 5.0,
  cues: [[0.25, 'step', 0.7], [0.6, 'step', 0.6], [0.95, 'step', 0.7], [1.3, 'step', 0.6], [1.65, 'step', 0.7], [2.15, 'paper', 0.4],
    [2.75, 'whoosh', 0.4], [3.25, 'ping'], [4.1, 'ping', 0.8], [4.62, 'hit', 0.4]],
  draw(ctx, u) {
    const uc = C12(u);
    if (u < 2.75) {
      // low-angle: floor-level camera, then a tilt up
      const cam = camKeys(u, [[0, { x: 1320, y: 990, zoom: 1.7, rot: 0.045 }], [1.8, { x: 1210, y: 985, zoom: 1.75, rot: 0.03 }], [2.75, { x: 1180, y: 860, zoom: 2.0, rot: 0 }]]);
      let p = withSecondary((q) => keyPose(q, S2poseKeys), uc);
      if (p.legs === 'walk') { p.bob = -Math.abs(Math.sin(p.phase * Math.PI * 2)) * 6; p.coatFlutter = 0.25; }
      office(ctx, cam, u, { lamp: 1, bone: false, dog: p });
      Info.pose = p.legs === 'walk' ? 'walking' : uc > 1.9 ? 'adjust hat' : 'neutral';
      return {};
    }
    if (u < 3.0) {
      // raising the glass to his eye (close-up, lens magnifies the eye)
      const q = inv(2.75, 3.0, uc);
      const p = pose({ x: 560, y: 2750, s: 4.2, turn: -0.25, browL: lerp(0.8, 1.3, q), browR: lerp(0.8, 1.2, q), mouth: 'frown', eyeX: -0.3, eyeY: 0.4,
        glass: { x: lerp(-60, -30, q), y: lerp(-200, -336, Ease.back(q)), r: 46, ang: 2.2, hand: 'L', face: q > 0.6 } });
      const cam = { x: W / 2, y: H / 2, zoom: 1, rot: 0 };
      office(ctx, { x: 1150, y: 900, zoom: 1.6 }, u, { lamp: 1, print: false, dark: 0.1, screen: (c) => drawDog(c, p, u) });
      Info.pose = 'lookingThroughMagnifier';
      return {};
    }
    if (u < 4.5) {
      // POV through the magnifying glass: clue #1 then clue #2
      const cam = camKeys(u, [[3.0, { x: 560, y: 1150, zoom: 1.0 }], [3.7, { x: 560, y: 1150, zoom: 1.02 }], [4.05, { x: 470, y: 470, zoom: 1.02 }]]);
      const world = () => floorTop(ctx, {});
      inWorld(ctx, cam, u, world);
      ctx.save(); ctx.fillStyle = 'rgba(8,5,4,0.62)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      const lx = 540 + Math.sin(u * 2.3) * 8, ly = 900 + Math.cos(u * 1.7) * 6, r = 330;
      lensPass(ctx, cam, u, lx, ly, r, 1.8, () => world());
      ctx.save(); ctx.translate(lx, ly); ctx.scale(3.3, 3.3); drawGlass(ctx, 0, 0, r / 3.3, 0.95, 0, null);
      drawPaw(ctx, Math.cos(0.95) * (r / 3.3 + 78), Math.sin(0.95) * (r / 3.3 + 78), 0.95 + Math.PI, 'hold', 1777);
      ctx.restore();
      clueLabel(ctx, 'CLUE #1', 90, 380, inv(3.15, 3.4, u) * (1 - inv(3.75, 3.85, u)), { size: 70 });
      clueLabel(ctx, 'CLUE #2', 90, 380, inv(4.05, 4.3, u), { size: 70 });
      Info.pose = 'POV magnifier';
      return {};
    }
    // eyes dart off-screen right (2-frame move)
    const dart = uc >= 4.72 ? 1 : uc >= 4.66 ? 0.5 : 0;
    const p = pose({ x: 500, y: 2800, s: 4.0, turn: 0.35, browL: 1.1, browR: 1.2, mouth: 'frown', eyeX: lerp(-0.2, 1, dart), eyeY: -0.1, headTilt: dart * 0.03, earL: -dart * 0.08, earR: -dart * 0.08 });
    office(ctx, { x: 1050, y: 820, zoom: 1.7 }, u, { lamp: 1, print: false, screen: (c) => drawDog(c, p, u) });
    Info.pose = 'seriousCloseup';
    return {};
  },
};

// ---------------------------------------------------------------------
// SCENE 3 — THE SUSPECTS
// ---------------------------------------------------------------------
const BOARD_CX = SET.board.x + SET.board.w / 2, BOARD_CY = SET.board.y + SET.board.h / 2;
function cardPos(k) { const c = boardLayout()[k]; return c; }
function boardState(u) {
  return {
    detail: { cat: u > 1.5, rabbit: u > 2.8, moose: u > 4.6, fox: false },
    x: { cat: inv(2.3, 2.6, u), rabbit: inv(3.55, 3.85, u), moose: inv(4.9, 5.2, u) },
    lit: u > 5.4 ? 'fox' : null,
    dim: u > 5.4 ? { cat: 1, rabbit: 1, moose: 1 } : null,
  };
}
function markerPaw(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.save(); ctx.rotate(-0.7);
  shape(ctx, [[-10, -14], [150, -14], [150, 14], [-10, 14]], { fill: PAL.red, lw: 5, seed: 1901, tension: 0.2 });
  shape(ctx, [[-10, -14], [-40, 0], [-10, 14]], { fill: '#f1d6a8', lw: 5, seed: 1902, tension: 0.2 });
  ctx.restore();
  drawPaw(ctx, 60, -50, -0.7 + Math.PI, 'hold', 1903);
  // sleeve
  ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 70; ctx.beginPath(); ctx.moveTo(110, -90); ctx.lineTo(400, -330); ctx.stroke();
  ctx.strokeStyle = PAL.coat; ctx.lineWidth = 56; ctx.stroke();
  ctx.restore();
}
function montageShot(ctx, u, key, focus, o = {}) {
  const c = cardPos(key);
  const z = o.zoom || 3.1;
  const cam = camKeys(u, [[o.a, { x: c.x + (o.dx || 0), y: c.y + 20, zoom: z * 0.94 }], [o.b, { x: c.x + (o.dx || 0), y: c.y + 20, zoom: z }]], Ease.sine);
  office(ctx, cam, u, { lamp: 1, board: boardState(u), print: false, extra: o.extra });
  Info.cam = cam;
  return cam;
}
const S3 = {
  name: 'THE SUSPECTS', dur: 7.0, base: 7.0,
  cues: [[0.0, 'whip'], [0.4, 'paper', 0.5], [1.55, 'ping', 0.5], [1.95, 'hit', 0.4], [2.3, 'marker'], [2.62, 'stamp'],
    [2.85, 'ping', 0.5], [3.2, 'paper', 0.6], [3.55, 'marker'], [3.87, 'stamp'], [4.15, 'slide', 0.5], [4.6, 'hit', 0.4], [4.9, 'marker'], [5.22, 'stamp'],
    [5.45, 'whoosh', 0.5], [6.1, 'sting', 0.5]],
  draw(ctx, u) {
    const uc = C12(u);
    if (u < 0.35) {
      // whip pan with motion smear
      const q = Ease.inOut(inv(0, 0.35, u));
      const cam = { x: lerp(1050, BOARD_CX, q), y: lerp(820, BOARD_CY + 60, q), zoom: 1.3, rot: 0 };
      for (let i = 2; i >= 0; i--) { ctx.save(); ctx.globalAlpha = i ? 0.35 : 1; office(ctx, Object.assign({}, cam, { x: cam.x - i * 90 }), u, { lamp: 1, board: boardState(u), print: false }); ctx.restore(); }
      speedLinesH(ctx, 1, 0.7, 7, 'rgba(20,12,8,0.6)');
      return {};
    }
    if (u < 1.5) {
      // board wide + over-the-shoulder detective
      const cam = camKeys(u, [[0.35, { x: BOARD_CX, y: BOARD_CY + 120, zoom: 1.02 }], [1.5, { x: BOARD_CX - 20, y: BOARD_CY + 110, zoom: 1.1 }]], Ease.sine);
      const p = pose({ view: 'back', turn: -0.45, x: SET.board.x + 120, y: 1760, s: 1.9, headTilt: -0.05 + (uc > 0.9 ? 0.04 : 0) });
      office(ctx, cam, u, { lamp: 1, board: boardState(u), print: false, front: (c) => { c.save(); c.filter = 'blur(3px)'; drawDog(c, p, u); c.restore(); } });
      Info.pose = 'studying board (OTS)';
      return {};
    }
    if (u < 2.8) {
      // CAT — clean paws vs the muddy print
      if (u >= 1.95 && u < 2.25) { insertPrint(ctx, u, { zoom: 1.1 }); focusLines(ctx, 540, 960, 50, 520, 0.25, '#fff'); return {}; }
      const cat = cardPos('cat');
      montageShot(ctx, u, 'cat', 0, { a: 1.5, b: 2.8 });
      if (u > 2.25 && u < 2.62) { const q = inv(2.3, 2.6, u); const [sx, sy] = toScreen(Info.cam, cat.x + lerp(-90, 90, q < 0.5 ? q * 2 : q * 2 - 1), cat.y - 110 + lerp(0, 200, q < 0.5 ? q * 2 : q * 2 - 1)); markerPaw(ctx, sx, sy, 1.2); }
      ctx.save(); const [sx, sy] = toScreen(Info.cam, cat.x, cat.y + 60); drawStamp(ctx, 'ELIMINATED', sx, sy, 62, inv(2.6, 2.72, u)); ctx.restore();
      return {};
    }
    if (u < 4.1) {
      // RABBIT — blue scarf vs the red thread
      const rab = cardPos('rabbit');
      montageShot(ctx, u, 'rabbit', 0, { a: 2.8, b: 4.1, dx: -40 });
      if (u > 3.15 && u < 3.55) {
        const q = Ease.back(inv(3.15, 3.35, u));
        const [sx, sy] = toScreen(Info.cam, rab.x + 150, rab.y - 40);
        ctx.save(); ctx.translate(sx + (1 - q) * 400, sy);
        ctx.strokeStyle = PAL.red; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-20, 80, 30, 140, 0, 240 + Math.sin(u * 9) * 10); ctx.stroke();
        drawPaw(ctx, 10, -20, -Math.PI / 2, 'hold', 1910);
        ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 70; ctx.beginPath(); ctx.moveTo(30, -40); ctx.lineTo(420, -200); ctx.stroke(); ctx.strokeStyle = PAL.coat; ctx.lineWidth = 56; ctx.stroke();
        ctx.restore();
      }
      if (u > 3.5 && u < 3.87) { const q = inv(3.55, 3.85, u); const [sx, sy] = toScreen(Info.cam, rab.x + lerp(-90, 90, q < 0.5 ? q * 2 : q * 2 - 1), rab.y - 110 + lerp(0, 200, q < 0.5 ? q * 2 : q * 2 - 1)); markerPaw(ctx, sx, sy, 1.2); }
      const [sx, sy] = toScreen(Info.cam, rab.x, rab.y + 60); drawStamp(ctx, 'ELIMINATED', sx, sy, 62, inv(3.85, 3.97, u), 0.1);
      return {};
    }
    if (u < 5.4) {
      // MOOSE — far too big for the opening
      if (u < 4.6) {
        const v = cardPos('vent');
        montageShot(ctx, u, 'vent', 0, { a: 4.1, b: 4.6, zoom: 3.8 });
        // measuring ruler slides across the opening
        const q = Ease.out(inv(4.12, 4.45, u));
        const [sx, sy] = toScreen(Info.cam, v.x, v.y + 20);
        ctx.save(); ctx.translate(sx + (1 - q) * 700, sy - 180); ctx.rotate(0.02);
        shape(ctx, [[-240, -30], [240, -30], [240, 30], [-240, 30]], { fill: '#e6c569', lw: 6, seed: 1920, tension: 0.2 });
        ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3;
        for (let i = 0; i <= 24; i++) { ctx.beginPath(); ctx.moveTo(-230 + i * 19, -30); ctx.lineTo(-230 + i * 19, i % 4 ? -16 : -4); ctx.stroke(); }
        ctx.restore();
        return {};
      }
      const m = cardPos('moose');
      montageShot(ctx, u, 'moose', 0, { a: 4.6, b: 5.4, zoom: 2.6 });
      if (u > 4.85 && u < 5.22) { const q = inv(4.9, 5.2, u); const [sx, sy] = toScreen(Info.cam, m.x + lerp(-90, 90, q < 0.5 ? q * 2 : q * 2 - 1), m.y - 110 + lerp(0, 200, q < 0.5 ? q * 2 : q * 2 - 1)); markerPaw(ctx, sx, sy, 1.2); }
      const [sx, sy] = toScreen(Info.cam, m.x, m.y + 60); drawStamp(ctx, 'ELIMINATED', sx, sy, 52, inv(5.2, 5.32, u), -0.08);
      return {};
    }
    if (u < 6.1) {
      // only the fox remains
      const f = cardPos('fox');
      const cam = camKeys(u, [[5.4, { x: BOARD_CX + 40, y: BOARD_CY + 60, zoom: 1.15 }], [6.1, { x: f.x - 60, y: f.y - 20, zoom: 1.6 }]], Ease.inOut);
      office(ctx, cam, u, { lamp: 1, board: boardState(u), print: false });
      // spotlight on the fox
      const [sx, sy] = toScreen(cam, f.x, f.y);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 330 * cam.zoom); g.addColorStop(0, 'rgba(255,220,150,0.35)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      return {};
    }
    // detective pauses: eyes narrow — something doesn't fit
    const narrow = uc >= 6.45 ? 1 : uc >= 6.38 ? 0.5 : 0;
    const p = pose({ x: 560, y: 2800, s: 4.0, turn: 0.45, browL: lerp(1.0, 1.45, narrow), browR: lerp(1.0, 0.4, narrow), lid: 0.38 * narrow, mouth: narrow ? 'flat' : 'frown', eyeX: 0.6, eyeY: -0.2, headTilt: -0.03 * narrow });
    office(ctx, { x: 1900, y: 700, zoom: 1.3 }, u, { lamp: 1, print: false, board: boardState(u), screen: (c) => { c.save(); c.filter = 'blur(2px)'; c.restore(); drawDog(c, p, u); } });
    Info.pose = 'thinking (suspicious)';
    return {};
  },
};

// ---------------------------------------------------------------------
// SCENE 4 — SOMETHING IS WRONG
// ---------------------------------------------------------------------
function reflectionView(ctx, r) {
  // what the flipped lens reflects: a trail of small three-toed prints running under the evidence board
  ctx.save();
  ctx.scale(-1, 1);
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.globalAlpha = 0.6;
  for (let i = -3; i < 4; i++) { ctx.save(); ctx.translate(i * 90, -r); ctx.rotate(Math.PI / 2); ctx.drawImage(TEX.wood, 0, -90, r * 2.2, 90); ctx.restore(); }
  ctx.globalAlpha = 1;
  // the board's dark underside the trail disappears beneath
  ctx.fillStyle = '#120b07'; ctx.fillRect(-r, -r, r * 2, r * 0.5);
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(-r, -r * 0.5); ctx.lineTo(r, -r * 0.5); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const q = i / 5;
    const x = lerp(-r * 0.55, r * 0.35, q) + (i % 2 ? 22 : -22), y = lerp(r * 0.7, -r * 0.42, q);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); printShape(ctx, 3, 0, 0, lerp(0.62, 0.42, q), 'rgba(28,14,6,0.95)'); ctx.restore();
  }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const gg = ctx.createRadialGradient(-r * 0.2, r * 0.3, 10, 0, 0, r); gg.addColorStop(0, 'rgba(255,225,160,0.3)'); gg.addColorStop(1, 'rgba(120,160,220,0.08)');
  ctx.fillStyle = gg; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
}
const S4 = {
  name: 'SOMETHING IS WRONG', dur: 7.0, base: 7.0,
  cues: [[1.6, 'tick', 0.7], [1.85, 'tick', 0.7], [2.1, 'tick', 0.7], [2.45, 'whip', 0.4], [2.52, 'tick', 0.6], [2.64, 'tick', 0.6], [2.76, 'tick', 0.6], [2.88, 'tick', 0.8],
    [3.5, 'impact', 0.6], [3.9, 'hit', 0.4], [4.05, 'hit', 0.4], [4.2, 'hit', 0.4], [4.35, 'hit', 0.4], [4.5, 'hit', 0.4], [4.65, 'hit', 0.4],
    [4.95, 'whoosh', 0.4], [5.3, 'ping', 1], [6.1, 'step', 0.5], [6.5, 'step', 0.4]],
  draw(ctx, u) {
    const uc = C12(u);
    if (u < 1.2) {
      const cam = camKeys(u, [[0, { x: 1090, y: 820, zoom: 1.7 }], [1.2, { x: 1090, y: 840, zoom: 1.85 }]], Ease.sine);
      const p = pose({ x: 1180, y: 1400, s: 1.3, turn: -0.4, browL: 1.1, browR: 1.1, mouth: 'flat', eyeX: -0.4, eyeY: 0.9, headTilt: -0.06, lid: 0.15 });
      office(ctx, cam, u, { lamp: 1, dog: p });
      Info.pose = 'looking back at print';
      return { vignette: 0.7 };
    }
    if (u < 2.4) {
      // extreme push-in: three toes, lit one by one
      const z = lerp(1.2, 1.9, Ease.inOut(inv(1.2, 2.4, u)));
      insertPrint(ctx, u, { zoom: z, dy: -60 });
      const toes = [[-36, -30], [0, -46], [36, -30]];
      toes.forEach(([tx, ty], i) => {
        const a = inv(1.6 + i * 0.25, 1.7 + i * 0.25, u);
        if (a <= 0) return;
        const sx = 540 + tx * 2.3 * z, sy = 960 + (ty * 2.3 - 60) * z;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(sx, sy, 5, sx, sy, 120 * z * 0.6); g.addColorStop(0, `rgba(255,230,170,${0.6 * a})`); g.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - 200, sy - 200, 400, 400); ctx.restore();
        ctx.save(); ctx.strokeStyle = `rgba(255,244,220,${a})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, 60 * z * 0.55, 0, TAU * a); ctx.stroke(); ctx.restore();
      });
      return { vignette: 0.75 };
    }
    if (u < 3.2) {
      // the fox's paw: FOUR toes — against the THREE of the muddy print
      screenBG(ctx, '#2a1d17', '#120b08');
      ctx.save(); ctx.translate(300, 520); ctx.scale(1.55, 1.55); drawPhoto(ctx, 'fox', 0, 0, 260, 320, -0.05, { detail: true, lit: true }); ctx.restore();
      // card: fox print (big) and the muddy print (small, for comparison)
      ctx.save(); ctx.translate(560, 1260); ctx.rotate(0.03);
      shape(ctx, [[-420, -330], [420, -330], [420, 330], [-420, 330]], { fill: PAL.paper, lw: 7, seed: 3100, tension: 0.2 });
      printShape(ctx, 3, -210, 40, 1.9, '#3a2213', true);
      printShape(ctx, 4, 200, 40, 1.9, '#5b4636');
      inkLine(ctx, [[0, -250], [4, 0], [0, 250]], 5, 'rgba(58,34,19,0.4)', 3101, 1.5);
      ctx.restore();
      const rings = (cx, cy, pts, t0, dt, col) => pts.forEach(([tx, ty], i) => {
        const a = inv(t0 + i * dt, t0 + i * dt + 0.06, u);
        if (a <= 0) return;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(cx + tx * 1.9, cy + ty * 1.9, 36, -Math.PI / 2, -Math.PI / 2 + TAU * a); ctx.stroke(); ctx.restore();
      });
      rings(560 - 210, 1300, [[-36, -30], [0, -46], [36, -30]], 2.42, 0.07, '#ffe7b0');
      rings(560 + 200, 1300, [[-46, -18], [-18, -44], [18, -44], [46, -18]], 2.5, 0.12, PAL.red);
      focusLines(ctx, 540, 1100, 60, 760, 0.18, '#fff', 9);
      return {};
    }
    if (u < 3.9) {
      // realization: hold → snap → hold
      const snap = uc >= 3.54 ? 1 : uc >= 3.5 ? 0.6 : 0;
      insertEye(ctx, u, 1, { k: lerp(3.3, 3.5, snap), dx: -38, pose: { eyeSize: lerp(1, 1.14, snap), browL: lerp(1.0, 0.1, snap), browR: lerp(1.0, 0.1, snap), browRaise: 0.3 * snap, lid: 0, eyeX: 0, eyeY: 0 } });
      if (snap >= 1) focusLines(ctx, 540, 960, 80, 560, 0.35, '#fff', 12);
      flash(ctx, uc >= 3.5 && uc < 3.55 ? 0.6 : 0);
      return {};
    }
    if (u < 4.8) {
      // flash frames of earlier clues
      const k = Math.floor((u - 3.9) / 0.15);
      const lu = (u - 3.9) % 0.15;
      const shots = [
        () => insertPrint(ctx, u, { zoom: 1.3 }),
        () => insertThread(ctx, u),
        () => office(ctx, { x: SET.window.x + 150, y: SET.window.y + 210, zoom: 2.6 }, u, { lamp: 1 }),
        () => office(ctx, { x: SET.clock.x, y: SET.clock.y, zoom: 4.2 }, u, { lamp: 1 }),
        () => insertPedestalEmpty(ctx, u),
        () => office(ctx, { x: BOARD_CX, y: BOARD_CY, zoom: 1.2 }, u, { lamp: 1, board: boardState(7) }),
      ];
      shots[clamp(k, 0, 5)]();
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.8)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      flash(ctx, lu < 1 / 24 ? 0.7 : 0);
      return {};
    }
    if (u < 6.0) {
      // flips the magnifying glass — the reflection shows a second trail
      screenBG(ctx, '#2b1d16', '#0f0907');
      office(ctx, { x: 1400, y: 1100, zoom: 1.2 }, u, { lamp: 1, print: false });
      ctx.save(); ctx.fillStyle = 'rgba(10,6,4,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      const fl = Ease.inOut(inv(4.9, 5.3, u)) * Math.PI;
      const showRef = fl > Math.PI * 0.55;
      const lx = 540, ly = 860, r = 330, k = 3.2;
      ctx.save(); ctx.translate(lx, ly); ctx.scale(k, k);
      drawGlass(ctx, 0, 0, r / k, 1.2, fl, showRef ? (c) => { c.scale(1 / k, 1 / k); reflectionView(c, r); } : null);
      drawPaw(ctx, Math.cos(1.2) * (r / k + 78), Math.sin(1.2) * (r / k + 78), 1.2 + Math.PI, 'hold', 1930);
      ctx.restore();
      if (showRef) {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(lx, ly, 20, lx, ly, r * 1.4); g.addColorStop(0, `rgba(255,230,180,${0.2 * inv(5.2, 5.6, u)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      return {};
    }
    // he turns, slowly, toward the board
    const q = inv(6.0, 7.0, uc);
    const cam = camKeys(u, [[6.0, { x: 1350, y: 900, zoom: 1.35, rot: -0.02 }], [7.0, { x: 1520, y: 920, zoom: 1.45, rot: 0.02 }]], Ease.sine);
    const p = q < 0.45
      ? pose({ x: 1250, y: 1400, s: 1.35, turn: lerp(-0.3, 0.7, q / 0.45), browL: 1.2, browR: 1.2, mouth: 'flat', eyeX: 1, lid: 0.2, glass: { x: 100, y: -250, r: 44, ang: 1.9, hand: 'R' } })
      : pose({ view: 'back', x: 1250, y: 1400, s: 1.35, turn: lerp(0.55, 0.2, (q - 0.45) / 0.55), browR: 1.2 });
    office(ctx, cam, u, { lamp: 1, dog: p, smallPrints: 0.8 });
    Info.pose = 'turning';
    return {};
  },
};

// ---------------------------------------------------------------------
// SCENE 5 — THE CHASE
// ---------------------------------------------------------------------
const S5 = {
  name: 'THE CHASE', dur: 8.0, base: 8.0,
  cues: [[0.05, 'whoosh', 0.8], [0.62, 'thud', 0.4], [0.86, 'impact', 0.7], [0.9, 'whoosh'], [1.3, 'patter', 0.8], [1.7, 'patter', 0.8], [2.1, 'patter', 0.8], [2.5, 'patter', 0.8], [2.9, 'patter', 0.8],
    [3.3, 'whoosh', 0.9], [3.55, 'paper', 1], [3.95, 'step', 0.8], [4.3, 'slide', 1], [4.75, 'thud', 0.8], [5.5, 'whoosh', 0.6], [6.1, 'ping', 0.6], [6.15, 'hit', 0.5],
    [6.6, 'patter', 0.8], [7.0, 'whip', 0.9], [7.45, 'skrrt', 1.1]],
  draw(ctx, u) {
    const uc = C12(u);
    if (u < 0.6) {
      // a shadow darts across towards the hallway, carrying the bone
      const cam = { x: 1900, y: 1000, zoom: 0.95, rot: 0 };
      const q = inv(0.05, 0.5, u);
      office(ctx, cam, u, { lamp: 1, print: false, extra: (c) => {
        if (q > 0 && q < 1) {
          const x = lerp(1500, 3000, Ease.in(q) * 0.3 + q * 0.7);
          c.save(); c.globalAlpha = 0.9;
          for (let i = 3; i >= 1; i--) { c.save(); c.globalAlpha = 0.15 * (4 - i); drawCulprit(c, x - i * 60, 1398, 0.62, u); c.restore(); }
          drawCulprit(c, x, 1398, 0.62, u);
          drawBone(c, x + 10, 1300, 0.34, 0.2);
          c.restore();
        }
      } });
      speedLinesH(ctx, 1, 0.35 * Math.sin(q * Math.PI), 21, 'rgba(255,240,220,0.6)');
      return {};
    }
    if (u < 1.2) {
      // anticipation (crouch) → lunge (smear)
      const cam = { x: 1300, y: 1100, zoom: 1.25, rot: 0, shake: u > 0.86 ? 10 : 0 };
      const crouch = uc < 0.85;
      const p = pose({ view: 'side', dir: 1, x: crouch ? 1150 : lerp(1150, 1900, Ease.in(inv(0.86, 1.1, u))), y: 1400, s: 1.3, legs: crouch ? 'crouch' : 'leap', squash: crouch ? lerp(1, 0.88, inv(0.6, 0.8, uc)) : 1.06, lean: crouch ? 0.15 : 0.35, mouth: 'grit', browR: 1.4, earFlow: crouch ? 0 : -0.8, coatLag: crouch ? 0 : 0.35 });
      office(ctx, cam, u, { lamp: 1, print: false, extra: (c) => { if (crouch) drawDog(c, p, u); else drawDogSmear(c, p, u, 260); } });
      if (!crouch) speedLinesH(ctx, 1, 0.8, 5, 'rgba(255,240,220,0.7)');
      Info.pose = crouch ? 'anticipation' : 'lunge (smear)';
      return {};
    }
    // hallway run segments
    const scroll = (u - 1.2) * 1900;
    const run = (extra) => {
      const hallCam = { x: 540, y: 1100, zoom: 1.0, rot: -0.02 + Math.sin(u * 3) * 0.01, shake: 6 };
      inWorld(ctx, hallCam, u, () => {
        ctx.save(); ctx.translate(0, 0); drawHallway(ctx, scroll * 0.9); ctx.restore();
        if (extra && extra.mid) extra.mid(ctx);
      });
      Info.cam = hallCam;
      return hallCam;
    };
    const runPose = (o = {}) => pose(Object.assign({ view: 'side', dir: 1, x: 380, y: 1500, s: 1.25, legs: 'run', phase: C12(u) * 2.6, lean: 0.32, mouth: 'grit', browR: 1.4, earFlow: -0.9, coatLag: 0.45, coatFlutter: 1, bob: -Math.abs(Math.sin(C12(u) * 2.6 * TAU)) * 14 }, o));
    if (u < 3.2) {
      run({ mid: (c) => { drawDog(c, runPose(), u); if (u > 1.6 && u < 3.1) { drawCulprit(c, 1250 - (u - 1.6) * 60, 1500, 0.55, u); drawBone(c, 1260 - (u - 1.6) * 60, 1405, 0.3, 0.3); } } });
      speedLinesH(ctx, 1, 0.55, 11);
      // foreground papers flying past
      for (let i = 0; i < 5; i++) {
        const x = 1300 - ((u * 2400 + i * 520) % 1800), y = 1500 + hash(i) * 380;
        ctx.save(); ctx.translate(x, y); ctx.rotate(u * 6 + i); ctx.globalAlpha = 0.9;
        shape(ctx, [[-60, -40], [60, -40], [60, 40], [-60, 40]], { fill: PAL.paper, lw: 5, seed: 2100 + i, tension: 0.3 }); ctx.restore();
      }
      Info.pose = 'running';
      return {};
    }
    if (u < 4.2) {
      // jump over a stack of case files
      const q = inv(3.3, 3.95, u);
      const stackX = lerp(1300, 300, inv(3.2, 4.2, u));
      run({ mid: (c) => {
        drawFileStack(c, stackX, 1500, 1.3, 3);
        const jumpY = -Math.sin(clamp(q) * Math.PI) * 360;
        const p = runPose({ y: 1500 + jumpY, legs: q > 0 && q < 1 ? 'leap' : 'run', lean: q > 0 && q < 1 ? 0.15 : 0.32 });
        drawDog(c, p, u);
        if (q > 0.2) for (let i = 0; i < 8; i++) { const a = inv(3.55, 4.1, u); c.save(); c.translate(stackX + (hash(i) - 0.5) * 500 * a, 1300 - a * 500 * hash(i + 3) + a * a * 400); c.rotate(i + a * 8); shape(c, [[-40, -28], [40, -28], [40, 28], [-40, 28]], { fill: PAL.paper, lw: 4, seed: 2200 + i, tension: 0.3 }); c.restore(); }
      } });
      speedLinesH(ctx, 1, 0.4, 13);
      Info.pose = q > 0 && q < 1 ? 'jumping' : 'running';
      return {};
    }
    if (u < 5.4) {
      // slide beneath a closing shutter
      const q = inv(4.25, 4.8, u);
      const shutX = lerp(1100, 200, inv(4.2, 5.4, u));
      const bottom = lerp(1130, 1500, Ease.in(inv(4.3, 4.78, u)));
      run({ mid: (c) => {
        const sliding = q > 0 && q < 1.2 && u < 5.0;
        const p = runPose(sliding ? { legs: 'slide', lean: -0.55, y: 1500, x: 380 + Math.sin(q * Math.PI) * 60, bob: 0 } : {});
        drawDog(c, p, u);
        drawShutter(c, shutX, 700, bottom, 300);
        if (sliding) { c.save(); c.globalAlpha = 0.5; for (let i = 0; i < 6; i++) { c.fillStyle = '#e8d8b8'; c.beginPath(); c.arc(300 - i * 40, 1490 - hash(i) * 30, 8 + hash(i + 2) * 10, 0, TAU); c.fill(); } c.restore(); }
      } });
      speedLinesH(ctx, 1, 0.45, 17);
      Info.pose = 'sliding';
      return {};
    }
    if (u < 6.6) {
      // the magnifying glass slips — caught at the last second, still running
      screenBG(ctx, '#2a1f22', '#120d0e');
      speedLinesH(ctx, 1, 0.8, 23, 'rgba(255,235,210,0.5)');
      const q = inv(5.4, 6.1, u);
      const gx = 540 + Math.sin(q * 5) * 60, gy = lerp(650, 1100, Ease.in(q));
      const K = 3.4;
      const reach = Ease.out(inv(5.75, 6.1, u));
      ctx.save();
      if (u < 6.1) { ctx.translate(gx, gy); ctx.scale(K, K); drawGlass(ctx, 0, 0, 58, 1 + u * 9, Math.sin(u * 11) * 0.8, null); }
      else { ctx.translate(560, 1100); ctx.scale(K, K); drawGlass(ctx, 0, 0, 58, 1.0, 0, null); }
      ctx.restore();
      // arm + paw sweep in and close around the handle
      const hx = u < 6.1 ? lerp(1300, 560 + Math.cos(1.0) * 136 * K, reach) : 560 + Math.cos(1.0) * 136 * K;
      const hy = u < 6.1 ? lerp(1800, 1100 + Math.sin(1.0) * 136 * K, reach) : 1100 + Math.sin(1.0) * 136 * K;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 170; ctx.beginPath(); ctx.moveTo(hx + 60, hy + 60); ctx.lineTo(hx + 520, hy + 700); ctx.stroke();
      ctx.strokeStyle = PAL.coat; ctx.lineWidth = 140; ctx.stroke();
      ctx.strokeStyle = PAL.coatSh; ctx.lineWidth = 150; ctx.beginPath(); ctx.moveTo(hx + 90, hy + 100); ctx.lineTo(hx + 130, hy + 160); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(hx, hy); ctx.scale(K, K); drawPaw(ctx, 0, 0, 1.0 + Math.PI, u < 6.1 ? 'paw' : 'hold', 2300); ctx.restore();
      if (u >= 6.1 && u < 6.2) flash(ctx, 0.5);
      Info.pose = 'catching glass';
      return { vignette: 0.7 };
    }
    if (u < 7.4) {
      // the shadow turns a corner; the detective leans into it
      const q = inv(6.6, 7.4, u);
      const cam = { x: 540 + q * 200, y: 1100, zoom: 1 + q * 0.15, rot: lerp(0, 0.08, q), shake: 8 };
      inWorld(ctx, cam, u, () => {
        drawHallway(ctx, scroll * 0.9);
        // corner: dark opening at the end
        ctx.fillStyle = '#060405'; ctx.fillRect(1250, 600, 700, 900);
        inkLine(ctx, [[1250, 600], [1250, 1500]], 12, PAL.ink, 2400, 1);
        if (q < 0.45) { drawCulprit(ctx, lerp(1150, 1400, q / 0.45), 1500, 0.55, u); drawBone(ctx, lerp(1160, 1410, q / 0.45), 1405, 0.3, 0.3); }
        drawDog(ctx, runPose({ x: lerp(420, 1150, Ease.in(q)), lean: 0.32 + q * 0.2 }), u);
      });
      speedLinesH(ctx, 1, 0.5, 29);
      Info.cam = cam; Info.pose = 'cornering';
      return {};
    }
    screenBG(ctx, '#000', '#000');
    return { vignette: 0 };
  },
};

// ---------------------------------------------------------------------
// SCENE 6 — THE REVEAL WITHOUT THE ANSWER
// ---------------------------------------------------------------------
function storeroom(ctx, cam, t, o) {
  inWorld(ctx, cam, t, () => {
    screenBG(ctx, '#0c0a0f', '#16100e');
    // shelves in darkness
    for (let i = 0; i < 4; i++) {
      const x = -200 + i * 420;
      ctx.fillStyle = '#17120f'; ctx.fillRect(x, 300, 300, 1200);
      for (let j = 0; j < 6; j++) { ctx.fillStyle = '#231a14'; ctx.fillRect(x, 400 + j * 190, 300, 16); ctx.fillStyle = '#1d1511'; ctx.fillRect(x + 30, 330 + j * 190, 60 + hash(i * 9 + j) * 100, 70); }
    }
    // floor
    ctx.fillStyle = '#1a1210'; ctx.fillRect(-400, 1500, 2000, 800);
    // shaft of light from a high window
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(760, 0, 640, 1560);
    g.addColorStop(0, 'rgba(255,215,150,0.45)'); g.addColorStop(1, 'rgba(255,200,130,0.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(700, -100); ctx.lineTo(880, -100); ctx.lineTo(1000, 1560); ctx.lineTo(480, 1560); ctx.closePath(); ctx.fill();
    const pool = ctx.createRadialGradient(740, 1560, 20, 740, 1560, 420); pool.addColorStop(0, 'rgba(255,210,140,0.5)'); pool.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = pool; ctx.fillRect(200, 1200, 1100, 700);
    ctx.restore();
    // the missing bone + the culprit (silhouette only)
    drawBone(ctx, 700, 1535, 0.55, 0.1);
    drawCulprit(ctx, 900, 1560, 0.95, t, { thread: true });
    // a crate half-hides the culprit
    shape(ctx, [[930, 1400], [1200, 1390], [1210, 1565], [925, 1570]], { fill: '#1c1411', lw: 7, seed: 3300, tension: 0.2, shade: (c) => { c.strokeStyle = 'rgba(80,55,35,0.5)'; c.lineWidth = 6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(925, 1420 + i * 45); c.lineTo(1210, 1415 + i * 45); c.stroke(); } } });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = 'rgba(255,200,120,0.3)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(932, 1402); ctx.lineTo(1000, 1399); ctx.stroke(); ctx.restore();
    if (o.text) o.text(ctx);
    if (o.dog) drawDog(ctx, o.dog, t);
  });
}
const S6 = {
  name: 'THE REVEAL', dur: 7.0, base: 7.0,
  cues: [[0.2, 'thud', 0.3], [2.45, 'slide', 0.3], [2.9, 'whoosh', 0.4], [3.5, 'ping', 0.5], [5.4, 'paper', 0.6], [6.15, 'close', 1.1]],
  draw(ctx, u) {
    const uc = C12(u);
    if (u < 5.2) {
      const cam = camKeys(u, [[0, { x: 560, y: 1150, zoom: 1.0 }], [2.4, { x: 560, y: 1170, zoom: 1.08 }, Ease.sine], [2.85, { x: 560, y: 1170, zoom: 1.08 }], [3.3, { x: 400, y: 1070, zoom: 1.75 }, Ease.expoOut], [5.2, { x: 400, y: 1060, zoom: 1.85 }, Ease.sine]]);
      let p;
      if (uc < 2.5) p = pose({ view: 'back', x: 320, y: 1600, s: 1.6, turn: 0 });
      else if (uc < 2.8) p = pose({ view: 'back', x: 320, y: 1600, s: 1.6, turn: 0.55, headTilt: 0.04 });
      else {
        // over-the-shoulder look to camera, one eyebrow raised
        const q = inv(2.8, 3.4, uc);
        p = pose({ x: 320, y: 1600, s: 1.6, turn: lerp(0.85, 0.35, q), browL: lerp(1, -0.9, inv(3.1, 3.4, uc)), browR: 1.2, eyeX: lerp(0.8, -0.1, q), eyeY: 0, mouth: 'smirk', headTilt: 0.05, glass: null, lid: 0.1 });
      }
      storeroom(ctx, cam, u, { dog: p, text: (c) => {
        const tp = inv(3.6, 4.6, u);
        if (tp > 0) { c.save(); c.globalAlpha = 0.9; c.translate(420, 640); c.rotate(-0.05); brushTextReveal(c, 'FIGURED IT OUT?', 0, 0, 44, tp, { color: '#f7e7c4', width: 2, shadow: 'rgba(0,0,0,0.6)' }); c.restore(); }
      } });
      if (uc >= 2.8 && uc < 2.85) flash(ctx, 0.25);
      fadeBlack(ctx, 1 - inv(0, 0.9, u));
      Info.cam = cam; Info.pose = uc < 2.8 ? 'back to camera' : 'look to camera';
      return { vignette: 0.8 };
    }
    // closes the case file
    screenBG(ctx, '#1a120e', '#0b0706');
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(540, 700, 50, 540, 900, 900); g.addColorStop(0, 'rgba(255,205,140,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    const open = 1 - Ease.inOut(inv(5.75, 6.15, u));
    drawCaseFile(ctx, 540, 900, 896, 1157, open, 0);
    // paws on the file edges
    ctx.save(); ctx.translate(120, 1380); ctx.scale(3, 3); drawPaw(ctx, 0, 0, -0.4, 'paw', 2600); ctx.restore();
    if (open > 0.02) { const k = lerp(1, -1, open); const ex = 540 - 448 + 896 * (k * 0.5 + 0.5); ctx.save(); ctx.translate(ex, 560); ctx.scale(3, 3); drawPaw(ctx, 0, 0, 0.4 + (1 - open) * 0.6, 'paw', 2601); ctx.restore(); }
    if (u >= 6.15 && u < 6.2) flash(ctx, 0.35);
    return {};
  },
};

// ---------------------------------------------------------------------
// SCENE 7 — THE BOOK
// ---------------------------------------------------------------------
const S7 = {
  name: 'THE BOOK', dur: 7.0, base: 7.0,
  cues: [[0.0, 'thud', 0.3], [1.55, 'hit', 0.4], [1.6, 'ping', 0.6], [2.6, 'paper', 0.3], [4.3, 'paper', 0.3]],
  draw(ctx, u) {
    const cam = camKeys(u, [[0, { x: 540, y: 900, zoom: 1.6 }], [2.2, { x: 560, y: 920, zoom: 1.5 }, Ease.sine], [4.6, { x: 560, y: 980, zoom: 0.78 }], [7.0, { x: 560, y: 990, zoom: 0.74 }, Ease.sine]]);
    const bookW = 560, bookH = 723;
    inWorld(ctx, cam, u, () => {
      drawDeskTop(ctx, u);
      drawBookCover(ctx, 540, 900, bookW, bookH, u, 0);
      // the paw sets the magnifying glass down beside the book
      const q = Ease.out(inv(0.6, 1.55, u));
      const gx = lerp(1350, 1020, q), gy = lerp(1500, 1180, q);
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.35 * q})`; ctx.beginPath(); ctx.ellipse(gx + 30, gy + 40, 150, 120, 0, 0, TAU); ctx.fill(); ctx.restore();
      drawGlass(ctx, gx, gy, 120, 0.9, 0, null);
      const pawOut = Ease.in(inv(1.7, 2.4, u));
      if (u < 2.4) {
        const px = gx + Math.cos(0.9) * 330 + pawOut * 500, py = gy + Math.sin(0.9) * 330 + pawOut * 400;
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 80; ctx.beginPath(); ctx.moveTo(px + 30, py + 30); ctx.lineTo(px + 600, py + 520); ctx.stroke(); ctx.strokeStyle = PAL.coat; ctx.lineWidth = 64; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(px, py); ctx.scale(1.8, 1.8); drawPaw(ctx, 0, 0, 0.9 + Math.PI, 'hold', 2700); ctx.restore();
      }
    });
    Info.cam = cam;
    // text: quiet, part of the scene
    const t1 = inv(2.6, 3.4, u) * (1 - inv(4.1, 4.4, u));
    if (t1 > 0) brushTextReveal(ctx, 'EVERY CASE HAS ONE ANSWER.', 540, 300, 50, t1 * 1.2, { color: '#f7e7c4', width: 2, shadow: 'rgba(0,0,0,0.6)' });
    const t2 = inv(4.3, 5.1, u);
    if (t2 > 0) { ctx.save(); ctx.globalAlpha = 1 - inv(6.9, 7.0, u) * 0; brushTextReveal(ctx, 'CAN YOU ELIMINATE THE REST?', 540, 1690, 50, t2 * 1.2, { color: '#f7e7c4', width: 2, shadow: 'rgba(0,0,0,0.6)' }); ctx.restore(); }
    const t3 = inv(5.2, 5.9, u);
    if (t3 > 0) {
      ctx.save(); ctx.globalAlpha = t3;
      brushText(ctx, 'WHO STOLE THE BONE?', 540, 300, 72, { color: '#f7e7c4', width: 2.6, shadow: 'rgba(0,0,0,0.65)', seed: 88 });
      brushText(ctx, 'AN ELIMINATION PUZZLE BOOK', 540, 380, 36, { color: '#f2d777', width: 1.8, shadow: 'rgba(0,0,0,0.6)', seed: 89 });
      ctx.restore();
    }
    return {};
  },
};

const SCENES = [S1, S2, S3, S4, S5, S6, S7];

// music sections (global times via at(sceneIndex, baseSeconds))
function musicSections(at) {
  return [
    { from: at(1, 0.2), to: at(2, 6.95), bpm: 96, kind: 'mystery', v: 0.8 },   // stops dead at scene 4
    { from: at(4, 1.2), to: at(4, 7.35), bpm: 150, kind: 'chase' },
    { from: at(5, 0.3), to: at(5, 6.0), bpm: 60, kind: 'drone' },
    { from: at(6, 4.5), to: at(6, 7.0), bpm: 60, kind: 'resolve' },
  ];
}
