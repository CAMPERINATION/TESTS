// Scenes: animation frames the real Lovable footage (clips.json) — never replaces it.
(function () {
  'use strict';
  const K = window.KDP;
  const { W, H, COL, clamp, lerp, inv, E, A, pop, rr, fillStroke, circle, ellipse, line, star, text, rng } = K;
  const SC = (K.SCENES = {});

  // ---------------- shared pieces ----------------
  const LOVABLE_FULL = { x: 250, y: 95, w: 1655, h: 930 };   // Lovable UI without browser chrome/taskbar
  const PREVIEW = { x: 748, y: 135, w: 1157, h: 887 };       // the live preview panel
  const FOOT_BOX = { cx: 540, cy: 720, w: 1000, h: 780 };     // default footage area (captions sit below)
  const show = (s, a, b, fin = 0.35, fout = 0.25) => (s < a ? 0 : s > b ? Math.max(0, 1 - (s - b) / fout) : clamp((s - a) / fin));

  function headline(ctx, str, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 58;
    const lines = str.split('\n');
    const w = Math.max(...lines.map((l) => K.textWidth(ctx, l, size, 700))) + 70;
    const h = size * 1.2 * lines.length + 34;
    ctx.save();
    ctx.globalAlpha *= clamp(p * 2);
    ctx.translate(540, (o.y || 235) + (1 - E.out(clamp(p))) * -20);
    ctx.rotate(o.rot || -0.015);
    ctx.save(); ctx.translate(6, 8); rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = 'rgba(58,36,25,0.22)'; ctx.fill(); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, 26); fillStroke(ctx, o.bg || COL.berry, COL.cocoaDk, 5);
    lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.2 + 3, size, { color: o.color || '#fff8ee' }));
    ctx.restore();
  }

  function bakeryBg(ctx, cam, t, o = {}) {
    K.layer(ctx, cam, 0.3, () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, o.c1 || '#fbeedd'); g.addColorStop(1, o.c2 || '#f3dcc3');
      ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
      // subtle tile grid
      ctx.strokeStyle = 'rgba(91,58,41,0.06)'; ctx.lineWidth = 3;
      for (let y = -300; y < H + 300; y += 110) { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(W + 300, y); ctx.stroke(); }
      for (let x = -300; x < W + 300; x += 110) { ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, H + 300); ctx.stroke(); }
    });
    if (o.props !== false) {
      K.layer(ctx, cam, 0.55, () => {
        // shelf with jars and a cake stand, kept away from content areas
        rr(ctx, -40, 1335, 300, 22, 8); fillStroke(ctx, '#b98463', COL.ink, 5);
        jar(ctx, 40, 1335, 60, 90, COL.pink); jar(ctx, 120, 1335, 55, 70, COL.butter); jar(ctx, 195, 1335, 50, 100, COL.sage);
        rr(ctx, 820, 1335, 320, 22, 8); fillStroke(ctx, '#b98463', COL.ink, 5);
        jar(ctx, 900, 1335, 60, 80, COL.butter); jar(ctx, 985, 1335, 55, 105, COL.pink);
      });
    }
  }
  function jar(ctx, x, y, w, h, c) {
    rr(ctx, x - w / 2, y - h, w, h, 14); fillStroke(ctx, 'rgba(255,255,255,0.7)', COL.ink, 5);
    rr(ctx, x - w / 2 + 6, y - h * 0.6, w - 12, h * 0.6 - 6, 10); ctx.fillStyle = c; ctx.fill();
    rr(ctx, x - w / 2 - 4, y - h - 14, w + 8, 18, 6); fillStroke(ctx, COL.cocoa, COL.ink, 5);
  }

  function counter(ctx, y = 1790) {
    rr(ctx, -40, y, W + 80, 40, 12); fillStroke(ctx, '#fff4ea', COL.ink, 6);
    ctx.fillStyle = COL.cocoa; ctx.fillRect(-40, y + 40, W + 80, H);
    line(ctx, [-40, y + 40, W + 40, y + 40], COL.ink, 6);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) line(ctx, [i * 200 + 40, y + 80, i * 200 + 40, H], '#f4c2c9', 6);
    ctx.globalAlpha = 1;
  }

  const BAKER = { x: 540, y: 1900, s: 0.85, hLx: -130, hLy: -140, hRx: 130, hRy: -140, handL: 'fist', handR: 'fist', mouth: 'smile', seed: 2 };
  function baker(ctx, keys, s, t, o = {}) {
    const pose = K.poseAt(s, K.PERSON_DEFAULTS, [[-1, Object.assign({}, BAKER, o.base || {})], ...keys]);
    K.drawPerson(ctx, pose, K.PAL.baker, t);
    return pose;
  }

  // illustrated cake (not the real photo)
  function cake(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ellipse(ctx, 0, 70, 120, 16); fillStroke(ctx, '#fff', COL.ink, 5);
    rr(ctx, -12, 70, 24, 40, 6); fillStroke(ctx, COL.cocoa, COL.ink, 5);
    rr(ctx, -95, -20, 190, 90, 18); fillStroke(ctx, COL.pink, COL.ink, 6);
    rr(ctx, -65, -85, 130, 70, 16); fillStroke(ctx, '#fff8ee', COL.ink, 6);
    ctx.beginPath(); ctx.moveTo(-95, 10); for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(-95 + i * 23.75 - 12, 30, -95 + i * 23.75, 10); ctx.strokeStyle = '#fff8ee'; ctx.lineWidth = 6; ctx.stroke();
    for (const [bx, by, c] of [[-35, -92, COL.berry], [0, -98, COL.berryDk], [35, -92, COL.berry], [-12, -100, COL.pinkDk]]) { circle(ctx, bx, by, 12); fillStroke(ctx, c, COL.ink, 4); }
    ctx.restore();
  }

  // message bubble card
  function msg(ctx, str, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 46;
    const w = K.textWidth(ctx, str, size, 600) + 60, h = size * 1.7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const sc = E.back(clamp(p)) * (o.scale || 1); ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(p * 3) * (o.alpha == null ? 1 : o.alpha);
    ctx.save(); ctx.translate(5, 8); rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(58,36,25,0.2)'; ctx.fill(); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, h / 2); fillStroke(ctx, o.bg || '#fff', COL.ink, 5);
    ctx.beginPath(); ctx.moveTo(-w / 2 + 40, h / 2 - 3); ctx.lineTo(-w / 2 + 26, h / 2 + 22); ctx.lineTo(-w / 2 + 70, h / 2 - 3); ctx.closePath(); fillStroke(ctx, o.bg || '#fff', COL.ink, 5);
    rr(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, h / 2); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    text(ctx, str, 0, 2, size, { color: COL.cocoaDk, weight: 600 });
    ctx.restore();
  }

  // simple icons (illustrative only)
  function icon(ctx, kind, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 60, s / 60);
    const lw = 6;
    if (kind === 'person') { circle(ctx, 0, -18, 20); fillStroke(ctx, COL.pink, COL.ink, lw); ctx.beginPath(); ctx.arc(0, 38, 36, Math.PI, 0); ctx.closePath(); fillStroke(ctx, COL.sage, COL.ink, lw); }
    else if (kind === 'calendar') { rr(ctx, -34, -30, 68, 62, 10); fillStroke(ctx, '#fff', COL.ink, lw); ctx.fillStyle = COL.berry; ctx.fillRect(-31, -27, 62, 16); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { circle(ctx, -18 + i * 18, 4 + j * 16, 4); ctx.fillStyle = COL.ink; ctx.fill(); } }
    else if (kind === 'cake') cake(ctx, 0, -5, 0.3);
    else if (kind === 'size') { rr(ctx, -34, 10, 68, 22, 5); fillStroke(ctx, COL.pink, COL.ink, lw); rr(ctx, -24, -12, 48, 22, 5); fillStroke(ctx, '#fff8ee', COL.ink, lw); rr(ctx, -14, -32, 28, 20, 5); fillStroke(ctx, COL.pink, COL.ink, lw); }
    else if (kind === 'pencil') { ctx.rotate(0.7); rr(ctx, -10, -40, 20, 64, 4); fillStroke(ctx, COL.butter, COL.ink, lw); ctx.beginPath(); ctx.moveTo(-10, 24); ctx.lineTo(0, 44); ctx.lineTo(10, 24); ctx.closePath(); fillStroke(ctx, '#fbe2c8', COL.ink, lw); }
    else if (kind === 'leaf') { ctx.beginPath(); ctx.moveTo(-30, 30); ctx.quadraticCurveTo(-30, -30, 32, -32); ctx.quadraticCurveTo(30, 30, -30, 30); fillStroke(ctx, COL.sage, COL.ink, lw); line(ctx, [-30, 30, 16, -16], COL.ink, 4); }
    else if (kind === 'list') { rr(ctx, -30, -38, 60, 76, 8); fillStroke(ctx, '#fff', COL.ink, lw); for (let i = 0; i < 4; i++) line(ctx, [-18, -20 + i * 15, 18, -20 + i * 15], COL.greyDk, 5); }
    else if (kind === 'inbox') { ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(-28, -30); ctx.lineTo(28, -30); ctx.lineTo(40, -6); ctx.lineTo(40, 30); ctx.lineTo(-40, 30); ctx.closePath(); fillStroke(ctx, '#fff', COL.ink, lw); ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(-14, -6); ctx.lineTo(-10, 6); ctx.lineTo(10, 6); ctx.lineTo(14, -6); ctx.lineTo(40, -6); ctx.strokeStyle = COL.ink; ctx.lineWidth = lw; ctx.stroke(); }
    else if (kind === 'palette') { ctx.beginPath(); ctx.ellipse(0, 0, 40, 32, 0, 0, Math.PI * 2); fillStroke(ctx, '#fbe2c8', COL.ink, lw); for (const [px, py, c] of [[-18, -10, COL.berry], [2, -16, COL.pink], [20, -6, COL.sage], [-14, 12, COL.butter]]) { circle(ctx, px, py, 7); ctx.fillStyle = c; ctx.fill(); } }
    else if (kind === 'gear') { ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 26 : 36; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); fillStroke(ctx, COL.butter, COL.ink, lw); circle(ctx, 0, 0, 10); fillStroke(ctx, '#fff', COL.ink, lw); }
    else if (kind === 'req') { rr(ctx, -30, -22, 60, 44, 8); fillStroke(ctx, '#fff', COL.ink, lw); line(ctx, [-18, -8, 18, -8], COL.berry, 5); line(ctx, [-18, 6, 8, 6], COL.greyDk, 5); }
    ctx.restore();
  }
  K.bakeIcon = icon;

  // ================= 1. OPENING QUESTION =================
  SC.open = function (ctx, c) {
    const { s, t } = c;
    const tSplit = c.at('more than just'), tPretty = c.at('pretty homepage');
    const cam = K.camAt(s, [[0, { z: 1.04 }], [c.d, { z: 1 }]]);
    bakeryBg(ctx, cam, t);
    // browser window
    const bx = 90, by = 330, bw = 900, bh = 560;
    const win = E.back(inv(0.05, 0.6, s));
    const split = A(s, tSplit - 0.1, 0.7, E.inOut);
    K.layer(ctx, cam, 1, () => {
      ctx.save(); ctx.translate(540, by + bh / 2 + Math.sin(t * 1.6) * 6); ctx.scale(win, win); ctx.translate(-540, -(by + bh / 2));
      const gap = 30 * split;
      const panels = split > 0 ? [[bx - gap / 2 - 10 * split, (bw - 40 * split) / 2], [bx + bw / 2 + gap / 2 + 10 * split - 20 * split, (bw - 40 * split) / 2]] : [[bx, bw]];
      if (split <= 0) {
        rr(ctx, bx, by, bw, bh, 26); fillStroke(ctx, '#fff', COL.ink, 7);
        rr(ctx, bx, by, bw, 56, 26); ctx.fillStyle = COL.cream2; ctx.fill(); line(ctx, [bx, by + 56, bx + bw, by + 56], COL.ink, 5);
        for (let i = 0; i < 3; i++) { circle(ctx, bx + 36 + i * 30, by + 28, 9); ctx.fillStyle = [COL.berry, COL.butter, COL.sage][i]; ctx.fill(); }
        // loading shimmer
        const sh = (t * 0.8) % 1;
        ctx.save(); rr(ctx, bx + 40, by + 100, bw - 80, bh - 140, 18); ctx.clip();
        ctx.fillStyle = '#f7efe6'; ctx.fillRect(bx, by, bw, bh);
        const gx = bx + sh * (bw + 400) - 200; const g = ctx.createLinearGradient(gx - 150, 0, gx + 150, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh); ctx.restore();
      } else {
        const lw = (bw - 40) / 2;
        const lx = bx - 10 * split, rx = bx + lw + 40 + 10 * split;
        // left: pretty page
        rr(ctx, lx, by, lw, bh, 24); fillStroke(ctx, '#fff', COL.ink, 7);
        rr(ctx, lx, by, lw, 48, 24); ctx.fillStyle = COL.pink; ctx.fill(); line(ctx, [lx, by + 48, lx + lw, by + 48], COL.ink, 5);
        rr(ctx, lx + 30, by + 80, lw - 60, 250, 18); fillStroke(ctx, '#fbe2c8', COL.ink, 5);
        cake(ctx, lx + lw / 2, by + 215, 0.95);
        line(ctx, [lx + 40, by + 370, lx + lw - 60, by + 370], COL.cocoa, 16); line(ctx, [lx + 40, by + 410, lx + lw - 120, by + 410], COL.grey, 10); line(ctx, [lx + 40, by + 440, lx + lw - 100, by + 440], COL.grey, 10);
        rr(ctx, lx + 40, by + 475, 170, 50, 25); ctx.fillStyle = COL.berry; ctx.fill();
        // right: inquiry card with empty fields
        ctx.save(); ctx.globalAlpha *= split;
        rr(ctx, rx, by, lw, bh, 24); fillStroke(ctx, '#fff', COL.ink, 7);
        text(ctx, 'Inquiry', rx + 40, by + 60, 44, { align: 'left', color: COL.cocoaDk });
        for (let i = 0; i < 4; i++) {
          const fy = by + 115 + i * 95;
          line(ctx, [rx + 40, fy, rx + 150, fy], COL.greyDk, 10);
          ctx.save(); ctx.setLineDash([14, 12]); rr(ctx, rx + 40, fy + 18, lw - 80, 52, 12); ctx.strokeStyle = COL.grey; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
        }
        text(ctx, '?', rx + lw - 60, by + 60, 60, { color: COL.berry });
        ctx.restore();
      }
      ctx.restore();
    });
    // scattered messages around the baker
    K.layer(ctx, cam, 1, () => {
      msg(ctx, 'What size?', 250, 1000, pop(s, 0.15, 0.45), { rot: -0.06 });
      msg(ctx, 'Can you do Saturday?', 720, 965, pop(s, 0.5, 0.45), { rot: 0.05 });
      msg(ctx, 'Any dairy-free options?', 470, 1110, pop(s, 0.85, 0.45), { rot: -0.03, bg: '#fff3f5' });
      baker(ctx, [
        [0, { lookY: -0.4, lookX: 0.2, mouth: 'smile' }],
        [tSplit + 0.2, { lookX: -1, lookY: -1, turn: -0.35, tilt: -0.05 }],
        [tPretty + 0.4, { lookX: 1, lookY: -1, turn: 0.35, tilt: 0.06, browL: 0.5, browR: 0.5, mouth: 'flat' }],
        [c.d - 0.2, { hRx: 45, hRy: -300, handR: 'fist' }],
      ], s, t);
      counter(ctx);
    });
    headline(ctx, 'A pretty page… or a useful one?', show(s, tSplit + 0.2, c.d + 1), { size: 54 });
    K.captionY = 1290;
  };

  // ================= 2. INTRODUCE THE BUILD (real prompt + real plan) =================
  const PROMPT_BUBBLE = { x: 372, y: 146, w: 356, h: 140 };
  const PLAN_FIELDS = { x: 1004, y: 575, w: 648, h: 50 };
  SC.build = function (ctx, c) {
    const { s, t } = c;
    const tBiz = c.at('custom cake business'), tHelp = c.at('help customers');
    const crop = K.rectAt(s, [
      [0, LOVABLE_FULL],
      [0.4, LOVABLE_FULL],
      [1.5, { x: 300, y: 115, w: 480, h: 205 }],
      [tHelp - 0.5, { x: 300, y: 115, w: 480, h: 205 }],
      [tHelp + 0.5, { x: 975, y: 470, w: 700, h: 330 }],
    ]);
    bakeryBg(ctx, { x: 0, y: 0, z: 1 }, t, { props: false });
    const fm = K.footage(ctx, { clip: 'plan', st: 0, crop, box: { cx: 540, cy: 690, w: 1000, h: 700 } });
    K.callout(ctx, fm, PROMPT_BUBBLE, show(s, 1.7, tHelp - 0.6, 0.6), { pad: 12 });
    K.tag(ctx, 'Real prompt in Lovable', 540, fm.rect.y + fm.rect.h + 50, show(s, 1.9, tHelp - 0.6));
    K.callout(ctx, fm, PLAN_FIELDS, show(s, tHelp + 0.6, c.d + 1, 0.7), { pad: 3 });
    K.tag(ctx, "Lovable's plan: the form fields", 540, fm.rect.y + fm.rect.h + 50, show(s, tHelp + 0.7, c.d + 1));
    headline(ctx, 'Custom cake business', show(s, tBiz - 0.1, c.d + 1));
    K.captionY = 1260;
    K.layer(ctx, { x: 0, y: 0, z: 1 }, 1, () => { baker(ctx, [[0, { lookY: -1, lookX: 0 }], [tHelp, { eye: 'normal', mouth: 'o', mo: 0.2 }], [tHelp + 1.2, { mouth: 'smile', eye: 'happy' }]], s, t, { base: { y: 1960 } }); counter(ctx, 1850); });
  };

  // ================= 3. REVEAL THE PAGE (real preview) =================
  SC.page = function (ctx, c) {
    const { s, t } = c;
    const tPhoto = c.at('cake photo'), tMsg = c.at('a clear custom-cake'), tTest = c.at('only the first test');
    const TL = 1.5; // build timelapse duration
    bakeryBg(ctx, { x: 0, y: 0, z: 1 }, t, { props: false });
    const pull = A(s, tTest - 0.2, 0.9, E.inOut);
    const box = { cx: 540, cy: lerp(700, 640, pull), w: 1000, h: lerp(760, 640, pull) };
    if (s < TL) {
      const m = K.FRAMES.build;
      const fm = K.footage(ctx, { clip: 'build', st: (s / TL) * (m.count - 1) / m.fps, crop: LOVABLE_FULL, box });
      K.tag(ctx, 'Building… (sped up)', 540, fm.rect.y + fm.rect.h + 50, 1);
    } else {
      const crop = K.rectAt(s, [
        [TL, LOVABLE_FULL],
        [TL + 1.2, PREVIEW],
        [tPhoto - 0.2, PREVIEW],
        [tPhoto + 0.8, { x: 1330, y: 270, w: 560, h: 560 }],
        [tMsg - 0.3, { x: 1330, y: 270, w: 560, h: 560 }],
        [tMsg + 0.6, { x: 760, y: 300, w: 580, h: 480 }],
        [tTest - 0.2, { x: 760, y: 300, w: 580, h: 480 }],
        [tTest + 0.7, PREVIEW],
      ]);
      const fm = K.footage(ctx, { clip: 'home', st: s - TL, crop, box });
      K.tag(ctx, 'Real Lovable preview', 540, fm.rect.y + fm.rect.h + 50, show(s, TL + 0.3, c.d + 1));
    }
    headline(ctx, 'The first test: the page', show(s, tTest, c.d + 1));
    K.captionY = 1270;
    const up = E.back(inv(tTest, tTest + 0.7, s));
    K.layer(ctx, { x: 0, y: 0, z: 1 }, 1, () => {
      baker(ctx, [[0, { lookY: -1 }], [tTest + 0.3, { lookY: -1, eye: 'normal', mouth: 'smile', hRx: 45, hRy: -300, handR: 'fist', browL: 0.2, browR: 0.2 }]], s, t, { base: { y: lerp(2500, 1900, up) } });
      counter(ctx, lerp(2040, 1790, up));
    });
  };

  // ================= 4. THE TENSION =================
  SC.tension = function (ctx, c) {
    const { s, t } = c;
    const tIf = c.at('if a customer'), t3 = c.at('three separate'), tSep = c.at('separate messages'), tMsgs = c.at('messages just'), tExplain = c.at('just to explain');
    const cam = K.camAt(s, [[0, { z: 1 }], [t3, { z: 1.03, y: 20 }], [c.d, { z: 1.05, y: 30 }]]);
    bakeryBg(ctx, cam, t);
    // the (real) page, now small
    K.footage(ctx, { clip: 'home', st: 6, crop: PREVIEW, box: { cx: 540, cy: 520, w: 560, h: 420 }, alpha: 1 - 0.35 * A(s, t3 - 0.3, 0.5) });
    const org = s > tExplain ? Math.sin((s - tExplain) * 5) * (1 - A(s, tExplain + 1.6, 0.4)) : 0;
    K.layer(ctx, cam, 1, () => {
      const jig = (i) => Math.sin(t * 3 + i * 2) * 5;
      msg(ctx, 'What size?', 250 + org * 60, 870 + jig(0), pop(s, t3 - 0.15, 0.45), { rot: -0.08 + org * 0.1 });
      msg(ctx, 'What date?', 800 - org * 50, 830 + jig(1), pop(s, tSep + 0.2, 0.45), { rot: 0.07 - org * 0.1 });
      msg(ctx, 'Any dietary requirements?', 520 + org * 30, 1040 + jig(2), pop(s, tMsgs - 0.05, 0.45), { rot: -0.03, bg: '#fff3f5' });
      msg(ctx, '…and the flavour?', 820, 1000 + jig(3), pop(s, tMsgs + 0.5, 0.45), { rot: 0.1, size: 36, alpha: 0.9 });
      baker(ctx, [
        [0, { lookY: -1, mouth: 'smile' }],
        [t3, { eye: 'wide', mouth: 'o', mo: 0.4, lookX: -1, lookY: -0.8 }],
        [tSep + 0.3, { lookX: 1 }],
        [tExplain, { eye: 'normal', lid: 0.3, mouth: 'wavy', sweat: 1, lookX: 0, lookY: -0.6, hLx: -280, hLy: -380, hRx: 280, hRy: -380, handL: 'open', handR: 'open' }],
        [tExplain + 0.5, { hLx: -150, hLy: -420, hRx: 330, hRy: -330 }],
        [tExplain + 1.0, { hLx: -320, hLy: -330, hRx: 150, hRy: -420 }],
        [tExplain + 1.5, { hLx: -130, hLy: -140, hRx: 130, hRy: -140, handL: 'fist', handR: 'fist' }],
      ], s, t);
      counter(ctx);
    });
    headline(ctx, 'The details get scattered', show(s, tIf - 0.1, c.d + 1));
    K.captionY = 1290;
  };

  // ================= 5. THE INQUIRY FORM (real form + illustrated panel) =================
  const CHIPS = [["collect the customer's", 'Details', 'person'], ['the date they', 'Date', 'calendar'], ['the size', 'Size', 'size'], ['the design', 'Design', 'pencil'], ['any dietary', 'Dietary', 'leaf']];
  SC.form = function (ctx, c) {
    const { s, t } = c;
    const tIdea = c.at('The idea is simple'), tCollect = c.at("collect the customer's"), tDiet = c.at('any dietary'), tOne = c.at('in one place');
    bakeryBg(ctx, { x: 0, y: 0, z: 1 }, t, { props: false });
    const box = { cx: 540, cy: 600, w: 1000, h: 560 };
    let fm;
    if (s < tCollect) {
      const crop = K.rectAt(s, [[0, { x: 995, y: 150, w: 650, h: 440 }], [tCollect, { x: 995, y: 330, w: 650, h: 440 }]], E.sine);
      fm = K.footage(ctx, { clip: 'formTop', st: Math.min(s * 0.5, 2.4), crop, box });
    } else {
      const u = s - tCollect;
      const crop = K.rectAt(s, [[tCollect, { x: 995, y: 160, w: 650, h: 420 }], [tDiet - 0.3, { x: 995, y: 160, w: 650, h: 420 }], [tDiet + 0.5, { x: 995, y: 420, w: 650, h: 420 }], [tOne + 0.3, { x: 995, y: 420, w: 650, h: 420 }], [c.d, { x: 995, y: 560, w: 650, h: 420 }]]);
      fm = K.footage(ctx, { clip: 'formLow', st: Math.min(u * 0.4, 1.2), crop, box });
    }
    K.tag(ctx, 'Real form in the Lovable preview', 540, fm.rect.y + fm.rect.h + 36, show(s, 0.3, tIdea - 0.4), COL.cocoaDk, '#fff8ee', 32);

    // illustrated explanation panel (clearly an illustration, not a screenshot)
    const pIn = E.back(inv(tIdea - 0.3, tIdea + 0.3, s));
    if (pIn > 0) {
      ctx.save(); ctx.translate(540, 1010); ctx.scale(pIn, pIn);
      ctx.save(); ctx.rotate(-0.01);
      rr(ctx, -470, -115, 940, 230, 30); fillStroke(ctx, '#fffaf2', COL.ink, 6);
      ctx.save(); ctx.setLineDash([16, 12]); rr(ctx, -452, -97, 904, 194, 22); ctx.strokeStyle = COL.pinkDk; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      text(ctx, 'What the prompt asked for (illustration)', 0, -78, 30, { color: COL.greyDk, weight: 600 });
      const gather = A(s, tOne - 0.5, 0.7, E.inOut);
      CHIPS.forEach(([ph, label, ic], i) => {
        const p = pop(s, c.at(ph) - 0.05, 0.45);
        if (p <= 0) return;
        const x0 = -370 + i * 185, y0 = 20;
        const x = lerp(x0, -330 + i * 165, gather), y = lerp(y0, 40, gather);
        ctx.save(); ctx.translate(x, y); ctx.scale(p * lerp(1, 0.8, gather), p * lerp(1, 0.8, gather));
        rr(ctx, -82, -58, 164, 116, 22); fillStroke(ctx, i % 2 ? COL.pink : '#fdebd2', COL.ink, 5);
        icon(ctx, ic, 0, -14, 52);
        text(ctx, label, 0, 36, 32, { color: COL.cocoaDk });
        ctx.restore();
      });
      if (gather > 0) {
        ctx.save(); ctx.globalAlpha *= gather;
        text(ctx, 'One request', 0, -32, 40, { color: COL.berry });
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    }
    // scattered bubbles fly into the panel
    const fly = A(s, tOne - 0.9, 0.8, E.inOut);
    if (fly > 0 && fly < 1) {
      const src = [['What size?', 250, 870], ['What date?', 800, 830], ['Any dietary requirements?', 520, 1040]];
      src.forEach(([str, x0, y0], i) => {
        const sx = [-200, 1280, 540][i], sy = [1300, 1300, 1500][i];
        msg(ctx, str, lerp(sx, 540, fly), lerp(sy, 1010, fly), 1, { scale: lerp(0.9, 0.3, fly), alpha: 1 - fly });
      });
    }
    headline(ctx, 'Put the useful details in one place', show(s, tOne - 0.5, c.d + 1), { size: 50 });
    headline(ctx, 'The request form', show(s, 0.2, tOne - 0.9, 0.35, 0.3), { bg: COL.cocoa });
    K.captionY = 1235;
    K.layer(ctx, { x: 0, y: 0, z: 1 }, 1, () => {
      baker(ctx, [[0, { lookY: -1, mouth: 'smile' }], [tOne, { eye: 'happy', mouth: 'grin', hRx: 250, hRy: -300, handR: 'thumb' }]], s, t, { base: { y: 1985 } });
      counter(ctx, 1875);
    });
  };

  // ================= 6. THE BAKER'S VIEW (real dashboard with sample requests) =================
  SC.dash = function (ctx, c) {
    const { s, t } = c;
    const tSee = c.at('They can see'), tInstead = c.at('instead of trying'), tScatter = c.at('scattered messages');
    bakeryBg(ctx, { x: 0, y: 0, z: 1 }, t, { props: false });
    const crop = K.rectAt(s, [
      [0, { x: 760, y: 150, w: 1130, h: 720 }],
      [tSee - 0.3, { x: 760, y: 150, w: 1130, h: 720 }],
      [tSee + 0.7, { x: 785, y: 460, w: 540, h: 400 }],
      [tInstead - 0.2, { x: 785, y: 460, w: 540, h: 400 }],
      [tInstead + 0.7, { x: 760, y: 150, w: 1130, h: 720 }],
    ]);
    const fm = K.footage(ctx, { clip: 'dash', st: s, crop, box: { cx: 540, cy: 690, w: 1000, h: 740 } });
    K.tag(ctx, 'Real preview · sample requests', 540, fm.rect.y + fm.rect.h + 50, show(s, 0.3, c.d + 1));
    headline(ctx, 'A clearer starting point', show(s, 0.2, c.d + 1));
    K.captionY = 1265;
    // scattered bubbles near the baker fade away
    const sp = pop(s, tScatter - 0.9, 0.4), gone = A(s, tScatter + 0.4, 0.5, E.in);
    K.layer(ctx, { x: 0, y: 0, z: 1 }, 1, () => {
      if (sp > 0 && gone < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - gone;
        msg(ctx, 'size?', 180, 1440 - gone * 60, sp, { rot: -0.1, size: 38 });
        msg(ctx, 'date??', 900, 1420 - gone * 60, sp, { rot: 0.1, size: 38 });
        msg(ctx, 'allergies?', 170, 1590 - gone * 60, sp, { rot: 0.06, size: 36 });
        ctx.restore();
      }
      baker(ctx, [[0, { lookY: -1, mouth: 'smile' }], [tSee, { eye: 'normal', mouth: 'smile', lookY: -1, lookX: 0.3 }], [tScatter - 0.3, { lookX: -1, lookY: 0, hLx: -300, hLy: -280, handL: 'open', mouth: 'flat' }], [tScatter + 0.6, { lookX: 0, eye: 'happy', mouth: 'grin', hLx: -130, hLy: -140, handL: 'fist' }]], s, t, { base: { y: 1985 } });
      counter(ctx, 1875);
    });
  };

  // ================= 7. THE LESSON =================
  const QUESTIONS = [["Who's using it", 'Who is using it?', ['person']], ['What information do they need', 'What do they need to provide?', ['cake', 'calendar', 'list']], ['What should happen after', 'What should happen next?', ['req', 'inbox']]];
  SC.lesson = function (ctx, c) {
    const { s, t } = c;
    const tLook = c.at("Don't only describe"), tJob = c.at('Describe what the business'), tQ = QUESTIONS.map((q) => c.at(q[0]));
    const cam = K.camAt(s, [[0, { z: 1.03 }], [c.d, { z: 1, y: 10 }]]);
    bakeryBg(ctx, cam, t, { c1: '#fdf1e4', c2: '#f6d9cf' });
    const out = A(s, tQ[0] - 0.6, 0.5, E.inOut);
    // look vs job cards
    K.layer(ctx, cam, 1, () => {
      const card = (x, y, title, ic, p, dim, bg) => {
        if (p <= 0) return;
        ctx.save(); ctx.translate(x, y - out * 900); ctx.rotate((x < 540 ? -0.04 : 0.04)); const k = E.back(clamp(p)); ctx.scale(k, k);
        ctx.globalAlpha *= 1 - dim * 0.45;
        ctx.save(); ctx.translate(6, 10); rr(ctx, -210, -190, 420, 380, 30); ctx.fillStyle = 'rgba(58,36,25,0.2)'; ctx.fill(); ctx.restore();
        rr(ctx, -210, -190, 420, 380, 30); fillStroke(ctx, bg, COL.ink, 6);
        icon(ctx, ic, 0, -40, 130);
        text(ctx, title, 0, 110, 50, { color: COL.cocoaDk });
        ctx.restore();
      };
      // intro: a prompt note being written
      const np = pop(s, 0.3, 0.5) * (1 - A(s, tLook - 0.4, 0.4, E.in));
      if (np > 0) {
        ctx.save(); ctx.translate(540, 640); ctx.rotate(-0.03); ctx.scale(np, np);
        ctx.save(); ctx.translate(8, 12); rr(ctx, -330, -230, 660, 460, 20); ctx.fillStyle = 'rgba(58,36,25,0.2)'; ctx.fill(); ctx.restore();
        rr(ctx, -330, -230, 660, 460, 20); fillStroke(ctx, '#fff3b8', COL.ink, 6);
        text(ctx, 'My prompt', -280, -165, 52, { align: 'left', color: COL.berry });
        const typedW = [460, 520, 380, 300];
        typedW.forEach((lw, i) => { const p2 = clamp((s - 0.8 - i * 0.6) / 0.6); if (p2 > 0) line(ctx, [-280, -80 + i * 70, -280 + lw * p2, -80 + i * 70], COL.greyDk, 12); });
        icon(ctx, 'pencil', 220, 150, 90);
        ctx.restore();
      }
      card(290, 640, 'The look', 'palette', pop(s, tLook, 0.5), A(s, tJob, 0.5), '#fff');
      card(790, 640, 'The job', 'gear', pop(s, tJob, 0.5), 0, COL.butter);
      if (s > tLook + 0.5 && s < tQ[0]) text(ctx, 'not only…', 290, 880 - out * 900, 40, { color: COL.greyDk, alpha: A(s, tJob + 0.3, 0.4) });
      // question cards
      QUESTIONS.forEach(([, title, icons], i) => {
        const p = E.out(inv(tQ[i] - 0.2, tQ[i] + 0.35, s));
        if (p <= 0) return;
        const y = 440 + i * 235;
        ctx.save(); ctx.translate(lerp(1500, 540, p), y);
        ctx.save(); ctx.translate(6, 10); rr(ctx, -470, -95, 940, 190, 30); ctx.fillStyle = 'rgba(58,36,25,0.18)'; ctx.fill(); ctx.restore();
        rr(ctx, -470, -95, 940, 190, 30); fillStroke(ctx, i === 1 ? COL.pink : i === 2 ? '#fdebd2' : '#fff', COL.ink, 6);
        const fs = Math.min(54, 54 * 590 / K.textWidth(ctx, title, 54, 700));
        text(ctx, title, -430, -2, fs, { align: 'left', color: COL.cocoaDk });
        // icon slot
        ctx.save(); ctx.setLineDash([10, 10]); rr(ctx, 190, -70, 250, 140, 22); ctx.strokeStyle = COL.pinkDk; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
        ctx.restore();
        // baker places icons: they fly from the baker's hand into the slot
        icons.forEach((ic, k) => {
          const ft = tQ[i] + 0.55 + k * 0.18;
          const f = E.inOut(inv(ft, ft + 0.5, s));
          if (f <= 0) return;
          const tx = 540 + 315 + (k - (icons.length - 1) / 2) * 75, ty = y;
          const x = lerp(430, tx, f), yy = lerp(1560, ty, f) - Math.sin(f * Math.PI) * 160;
          if (ic === 'req' && i === 2) {
            const slide = A(s, ft + 0.7, 0.6, E.inOut);
            icon(ctx, 'req', lerp(x, tx + 70, slide), lerp(yy, ty + 8, slide), 60 * (1 - slide * 0.35));
          } else icon(ctx, ic, x, yy, icons.length > 1 ? 58 : 80);
        });
      });
      baker(ctx, [
        [0, { x: 540, lookY: -0.6, mouth: 'smile' }],
        [tLook, { lookX: -1, lookY: -1, turn: -0.3, hLx: -300, hLy: -380, handL: 'point' }],
        [tJob, { lookX: 1, turn: 0.3, hLx: -130, hLy: -140, handL: 'fist', hRx: 300, hRy: -380, handR: 'point' }],
        ...tQ.flatMap((tq) => [[tq + 0.3, { lookX: 1, lookY: -1, turn: 0.35, hRx: 150, hRy: -250, handR: 'open', eye: 'normal', mouth: 'smile' }], [tq + 0.75, { hRx: 330, hRy: -440, handR: 'open' }], [tq + 1.3, { hRx: 130, hRy: -140, handR: 'fist' }]]),
      ], s, t, { base: { x: 540 } });
      counter(ctx);
    });
    headline(ctx, 'Prompting tip', show(s, 0.2, tJob - 0.2), { bg: COL.cocoa });
    headline(ctx, 'Describe the job', show(s, tJob, c.d + 1));
    K.captionY = 1200;
  };

  // ================= 8. HONEST ENDING =================
  SC.honest = function (ctx, c) {
    const { s, t } = c;
    const tForm = c.at('inquiry form'), tReal = c.at('For a real business'), tMobile = c.at('testing the form on mobile'), tField = c.at('every field');
    bakeryBg(ctx, { x: 0, y: 0, z: 1 }, t, { props: false });
    const leave = A(s, tReal - 0.3, 0.5, E.inOut);
    if (leave < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - leave;
      let fm;
      if (s < tForm) fm = K.footage(ctx, { clip: 'home2', st: s, crop: K.rectAt(s, [[0, LOVABLE_FULL], [1.2, PREVIEW]]), box: { cx: 540, cy: 690, w: 1000, h: 740 } });
      else fm = K.footage(ctx, { clip: 'formTop', st: 2.4, crop: { x: 995, y: 150, w: 650, h: 600 }, box: { cx: 540, cy: 690, w: 1000, h: 740 } });
      K.tag(ctx, 'Built in Lovable · a prototype', 540, fm.rect.y + fm.rect.h + 50, show(s, 0.3, c.d + 1));
      ctx.restore();
    }
    // neutral phone outline — nothing shown as tested
    const ph = E.back(inv(tReal, tReal + 0.6, s));
    if (ph > 0) {
      ctx.save(); ctx.translate(330, 700); ctx.scale(ph, ph);
      rr(ctx, -170, -330, 340, 660, 50); fillStroke(ctx, '#fff', COL.ink, 8);
      rr(ctx, -150, -290, 300, 570, 26); ctx.fillStyle = '#f7efe6'; ctx.fill();
      rr(ctx, -40, -312, 80, 12, 6); ctx.fillStyle = COL.ink; ctx.fill();
      ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = COL.grey; ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) { rr(ctx, -120, -230 + i * 110, 240, 70, 14); ctx.stroke(); }
      ctx.restore();
      text(ctx, '?', 0, 250, 60, { color: COL.berry });
      ctx.restore();
      // checklist (unchecked on purpose)
      const items = [[tMobile, 'Try the form\non a phone'], [tField, 'Is every field\nused by the baker?']];
      items.forEach(([tt, str], i) => {
        const p = pop(s, tt - 0.1, 0.5);
        if (p <= 0) return;
        ctx.save(); ctx.translate(785, 560 + i * 230); ctx.scale(p, p);
        rr(ctx, -250, -95, 500, 190, 26); fillStroke(ctx, i ? COL.pink : '#fff', COL.ink, 6);
        rr(ctx, -215, -30, 60, 60, 12); fillStroke(ctx, '#fff', COL.ink, 5);
        str.split('\n').forEach((l, li, arr) => text(ctx, l, -135, (li - (arr.length - 1) / 2) * 46, 38, { align: 'left', color: COL.cocoaDk }));
        ctx.restore();
      });
      K.tag(ctx, 'Not tested yet', 330, 1075, show(s, tReal + 0.6, c.d + 1), COL.berry);
    }
    headline(ctx, 'Next: test on mobile', show(s, tReal, c.d + 1));
    K.captionY = 1235;
    K.layer(ctx, { x: 0, y: 0, z: 1 }, 1, () => {
      baker(ctx, [[0, { lookY: -1, mouth: 'smile' }], [tReal + 0.3, { lookX: -0.8, lookY: -1, hRx: 45, hRy: -300, handR: 'fist', mouth: 'flat', browL: 0.3, browR: 0.3 }], [tField + 0.5, { lookX: 0.8 }]], s, t, { base: { y: 1985 } });
      counter(ctx, 1875);
    });
  };

  // ================= 9. TAKEAWAY =================
  SC.end = function (ctx, c) {
    const { s, t } = c;
    const tWeb = c.at('ask for a website'), tJob = c.at('It explains the job');
    bakeryBg(ctx, { x: 0, y: 0, z: 1 }, t, { c1: '#fdf1e4', c2: '#f6d9cf' });
    const grow = A(s, tWeb + 0.4, 0.8, E.inOut);
    // real finished preview (still), baker looks at it
    K.footage(ctx, { clip: 'home', st: 6, crop: PREVIEW, box: { cx: lerp(360, 300, grow), cy: 640, w: 600, h: 520 }, scale: lerp(1, 0.85, grow) });
    // the prompt as a small note → "website" expands into three questions
    ctx.save();
    const nx = lerp(820, 720, grow), ny = lerp(640, 660, grow);
    ctx.translate(nx, ny); ctx.rotate(lerp(0.05, 0.02, grow));
    const w = lerp(380, 560, grow), h = lerp(300, 560, grow);
    ctx.save(); ctx.translate(8, 12); rr(ctx, -w / 2, -h / 2, w, h, 16); ctx.fillStyle = 'rgba(58,36,25,0.2)'; ctx.fill(); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, 16); fillStroke(ctx, '#fff3b8', COL.ink, 6);
    const hl = A(s, tWeb + 0.1, 0.3);
    const top = -h / 2 + 60;
    text(ctx, 'Build a', -w / 2 + 34, top, 42, { align: 'left', color: COL.cocoaDk });
    const ww = K.textWidth(ctx, 'website', 42, 700);
    const wx = -w / 2 + 34 + K.textWidth(ctx, 'Build a ', 42, 700);
    if (hl > 0) { ctx.save(); ctx.globalAlpha *= hl; rr(ctx, wx - 8, top - 28, ww + 16, 56, 12); ctx.fillStyle = COL.pink; ctx.fill(); ctx.restore(); }
    text(ctx, 'website', wx, top, 42, { align: 'left', color: hl > 0.5 ? COL.berryDk : COL.cocoaDk });
    text(ctx, 'for my cake', -w / 2 + 34, top + 54, 42, { align: 'left', color: COL.cocoaDk, alpha: 1 - grow });
    text(ctx, 'business', -w / 2 + 34, top + 108, 42, { align: 'left', color: COL.cocoaDk, alpha: 1 - grow });
    const qs = [['person', 'Who it serves'], ['list', 'What it collects'], ['inbox', 'What happens next']];
    qs.forEach(([ic, str], i) => {
      const p = pop(s, tWeb + 0.8 + i * 0.3, 0.5);
      if (p <= 0) return;
      ctx.save(); ctx.translate(-w / 2 + 70, top + 110 + i * 120); ctx.scale(p, p);
      icon(ctx, ic, 0, 0, 62);
      text(ctx, str, 60, 2, 44, { align: 'left', color: COL.cocoaDk });
      ctx.restore();
    });
    if (grow > 0) line(ctx, [wx + ww / 2, top + 30, wx + ww / 2, top + 30 + 40 * grow], COL.berry, 5);
    ctx.restore();
    K.layer(ctx, { x: 0, y: 0, z: 1 }, 1, () => {
      baker(ctx, [[0, { lookX: -1, lookY: -1, turn: -0.3, mouth: 'smile' }], [tWeb + 0.6, { lookX: 1, turn: 0.3, eye: 'normal', mouth: 'smile' }], [tJob + 0.4, { lookX: 0, lookY: 0, turn: 0, eye: 'happy', mouth: 'grin' }]], s, t, { base: { y: 1985 } });
      counter(ctx, 1875);
    });
    K.captionY = 1235;
    // final card
    const fc = A(s, tJob - 0.15, 0.6, E.out);
    if (fc > 0) {
      K.captionsOff = true;
      ctx.save(); ctx.globalAlpha = fc * 0.55; ctx.fillStyle = '#fbeedd'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.translate(540, 760); const k = lerp(0.9, 1, E.back(fc)); ctx.scale(k, k); ctx.globalAlpha *= fc;
      ctx.save(); ctx.translate(10, 14); rr(ctx, -470, -330, 940, 660, 44); ctx.fillStyle = 'rgba(58,36,25,0.25)'; ctx.fill(); ctx.restore();
      rr(ctx, -470, -330, 940, 660, 44); fillStroke(ctx, COL.berry, COL.cocoaDk, 8);
      const L = [['A good prompt', '#fff8ee'], ['explains the job', '#ffd9e1'], ['the website', '#ffd9e1'], ['needs to do.', '#ffd9e1']];
      L.forEach(([l, col], i) => text(ctx, l, 0, -195 + i * 130, i === 0 ? 76 : 92, { color: col }));
      ctx.restore();
    }
  };
})();
