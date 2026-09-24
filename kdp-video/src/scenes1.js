// Scenes 1–5: hook, experience, service idea, basic prompt, generic output.
(function () {
  'use strict';
  const K = window.KDP;
  const { W, H, COL, clamp, lerp, inv, E, A, pop, rr, fillStroke, circle, ellipse, line, star, text, caption, rng } = K;
  const SC = (K.SCENES = K.SCENES || {});

  // ---------- shared helpers ----------
  K.DESK_Y = 1480;
  K.DESK_POSE = { x: 540, y: 1560, s: 1.15, hLx: -120, hLy: -80, hRx: 120, hRy: -80, handL: 'fist', handR: 'fist' };

  // Room set: wall, window, shelf (parallax layers), desk.
  K.room = function (ctx, cam, t, o = {}) {
    K.layer(ctx, cam, 0.35, () => {
      K.wallBg(ctx, o.wall1 || '#ffe3c4', o.wall2 || '#f7c9a0', 'rgba(160,90,60,0.10)');
      K.drawWindow(ctx, 70, 640, 250, 330, t, { dusk: o.dusk });
    });
    K.layer(ctx, cam, 0.7, () => {
      // pinboard with small coloring pages
      rr(ctx, 700, 640, 300, 250, 16); fillStroke(ctx, '#d6a877', COL.ink, 7);
      K.drawPageCard(ctx, 780, 740, 110, 130, { animal: 'cat', rot: -0.1 });
      K.drawPageCard(ctx, 915, 770, 110, 130, { animal: 'owl', rot: 0.08 });
    });
    K.layer(ctx, cam, 1, () => {
      K.drawShelf(ctx, 60, 560, 960, t, { pop: o.shelfPop, seed: 7 });
    });
  };
  K.deskFront = function (ctx, cam, t, o = {}) {
    K.layer(ctx, cam, 1, () => {
      K.drawLamp(ctx, 120, K.DESK_Y + 4, 0.9, o.lamp == null ? 0.6 : o.lamp);
      K.drawDesk(ctx, K.DESK_Y);
      if (o.mug !== false) K.drawMug(ctx, 900, K.DESK_Y - 36, 0.9, t);
      if (o.pages !== false) {
        K.drawPageCard(ctx, 330, K.DESK_Y + 110, 200, 150, { animal: 'fox', rot: -0.12 });
        K.drawPageCard(ctx, 720, K.DESK_Y + 140, 200, 150, { animal: 'rabbit', prop: 'can', rot: 0.1 });
      }
    });
  };
  K.wrap = function (ctx, str, maxW, size, weight = 700) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const tryL = cur ? cur + ' ' + w : w;
      if (K.textWidth(ctx, tryL, size, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  // Screen-space caption at the top safe area
  K.topCaption = function (ctx, str, p, o = {}) {
    caption(ctx, str, W / 2, o.y || 290, o.size || 66, p, Object.assign({ bg: COL.paper }, o));
  };
  // Fade p for a caption shown from a to b
  K.showP = (s, a, b) => (s < a ? 0 : s > b ? Math.max(0, 1 - (s - b) / 0.25) : clamp((s - a) / 0.45));

  // ================= 1. HOOK =================
  const hookNotes = (() => {
    const r = rng(42), out = [];
    for (let i = 0; i < 22; i++) {
      const x = 70 + r() * 940, y = 1330 + r() * 540;
      out.push({ x, y, w: 190 + r() * 60, h: 230 + r() * 60, rot: (r() - 0.5) * 1.2, rot0: (r() - 0.5) * 3, delay: r() * 1.5, seed: 100 + i, push: 200 + r() * 250 });
    }
    return out.sort((a, b) => a.y - b.y);
  })();

  SC.hook = function (ctx, c) {
    const { s, t } = c;
    const tUse = c.at('Use AI'), tMoney = c.at('make money'), tBut = c.at('But I always');
    const tQ1 = c.at('what are you making'), tQ2 = c.at("who's it for"), tQ3 = c.at('what makes it worth');
    const tp = tBut - 0.3;
    const sh = K.shake(s, tMoney + 0.1, 0.4, 18);
    const sh2 = K.shake(s, tp + 0.15, 0.3, 10);
    const cam = K.camAt(s, [[0, { z: 1.0 }], [c.d, { z: 1.07, y: -20 }]], E.lin);
    cam.x += sh.x + sh2.x; cam.y += sh.y + sh2.y;

    K.layer(ctx, cam, 0.3, () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3a2360'); g.addColorStop(1, '#221638');
      ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
      // hype rays
      ctx.save(); ctx.translate(W / 2, 620); ctx.rotate(t * 0.15);
      ctx.globalAlpha = 0.08 + 0.05 * A(s, tMoney, 0.4);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-90, -1600); ctx.lineTo(90, -1600); ctx.closePath(); ctx.fillStyle = COL.sun; ctx.fill(); }
      ctx.restore();
    });

    // slogan
    const move = A(s, tp, 0.8, E.inOut);
    K.layer(ctx, cam, 0.7, () => {
      const y1 = lerp(560, 300, move), y2 = lerp(720, 410, move), sc = lerp(1, 0.72, move);
      const p1 = pop(s, tUse - 0.05, 0.5);
      if (p1 > 0) {
        ctx.save(); ctx.translate(W / 2, y1); ctx.scale(sc * p1, sc * p1);
        text(ctx, 'Use AI to', 0, 0, 104, { color: '#fff', outline: COL.ink, outlineWidth: 16 });
        ctx.restore();
      }
      const st = inv(tMoney - 0.1, tMoney + 0.25, s);
      if (st > 0) {
        ctx.save(); ctx.translate(W / 2, y2); ctx.rotate(-0.04);
        const k = lerp(2.6, 1, E.out(st)) * sc;
        ctx.scale(k, k); ctx.globalAlpha = clamp(st * 3);
        text(ctx, 'make money.', 0, 0, 150, { color: COL.sun, outline: COL.ink, outlineWidth: 20 });
        ctx.restore();
        // sparkles
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + 0.3, r = 430 * sc + Math.sin(t * 3 + i) * 12;
          const tw = 0.6 + 0.4 * Math.sin(t * 7 + i * 2);
          star(ctx, W / 2 + Math.cos(a) * r, (y1 + y2) / 2 + Math.sin(a) * r * 0.45, 26 * tw * clamp(st * 2) * sc, 4, 0.3);
          ctx.fillStyle = COL.sun; ctx.fill();
        }
      }
      // quote marks once the creator questions it
      if (move > 0) {
        ctx.save(); ctx.globalAlpha = move;
        text(ctx, '“', W / 2 - 330 * sc, y1 - 20, 200 * sc, { color: COL.coral, outline: COL.ink, outlineWidth: 12 });
        text(ctx, '”', W / 2 + 500 * sc, y2 - 10, 200 * sc, { color: COL.coral, outline: COL.ink, outlineWidth: 12 });
        ctx.restore();
      }
    });

    // notes + creator
    const bulge = inv(tp - 0.5, tp, s) * (1 - inv(tp, tp + 0.1, s));
    const burst = A(s, tp, 0.7, E.out);
    const noteAt = (n) => {
      const f = A(s, n.delay, 0.65, E.out);
      let x = n.x, y = lerp(-300, n.y, f), rot = lerp(n.rot0, n.rot, f);
      const near = Math.abs(n.x - 540) < 330 && n.y < 1700;
      if (near) {
        const dir = n.x < 540 ? -1 : 1;
        y -= bulge * 30;
        x += dir * burst * n.push;
        y -= Math.sin(burst * Math.PI) * 160 - burst * 60;
        rot += dir * burst * 0.8;
      }
      return { x, y, rot };
    };
    K.layer(ctx, cam, 1, () => {
      const cy = s < tp ? 2400 : lerp(2400, 1760, E.back(inv(tp, tp + 0.55, s)));
      const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
        [0, { eye: 'wide', mouth: 'o', mo: 1, hLx: -250, hLy: -430, hRx: 250, hRy: -430, handL: 'open', handR: 'open', mark: 'lines', markP: 0 }],
        [tp + 0.1, { markP: 1 }],
        [tp + 0.7, { eye: 'wide', mark: 'lines' }],
        [tp + 1.3, { eye: 'normal', lid: 0.38, browL: 0.55, browR: -0.45, mouth: 'flat', hLx: -160, hLy: -40, hRx: 40, hRy: -305, handR: 'fist', handL: 'fist', mark: null, tilt: 0.06 }],
        [tQ1 - 0.15, { lookX: -0.2 }],
        [tQ1 + 0.25, { lookX: -1, turn: -0.4, tilt: -0.06 }],
        [tQ2 - 0.1, { lookX: -1 }],
        [tQ2 + 0.3, { lookX: 1, turn: 0.45, tilt: 0.07, browL: -0.3, browR: 0.55 }],
        [tQ3 - 0.1, {}],
        [tQ3 + 0.35, { lookX: 0, lookY: -0.6, turn: 0, tilt: 0, lid: 0, browL: 0.7, browR: 0.7, mouth: 'wavy', hLx: -270, hLy: -210, hRx: 270, hRy: -210, handL: 'open', handR: 'open' }],
      ]);
      Object.assign(pose, { x: 540, y: cy, s: 1.1, seed: 1, squash: 1 + Math.sin(inv(tp, tp + 0.45, s) * Math.PI) * 0.06 });
      hookNotes.forEach((n) => { if (n.y < 1560) { const q = noteAt(n); K.drawNote(ctx, q.x, q.y, n.w, n.h, q.rot, n.seed); } });
      if (s > tp - 0.05) K.drawPerson(ctx, pose, K.PAL.creator, t);
      hookNotes.forEach((n) => { if (n.y >= 1560) { const q = noteAt(n); K.drawNote(ctx, q.x, q.y, n.w, n.h, q.rot, n.seed); } });
    });

    // questions
    const q = (str, tq, x, y, rot, bg) => caption(ctx, str, x, y, 66, pop(s, tq - 0.1, 0.5), { rot, bg });
    q('Making what?', tQ1, 285, 800, -0.07, '#fff');
    q('For who?', tQ2, 800, 930, 0.06, '#fff');
    q('Worth paying for?', tQ3, 540, 610, -0.03, COL.mint);
  };

  // ================= 2. EXPERIENCE =================
  const pileNotes = (() => { const r = rng(9), o = []; for (let i = 0; i < 7; i++) o.push({ dx: (r() - 0.5) * 60, dy: -i * 16, rot: (r() - 0.5) * 0.5, vx: (r() - 0.5) * 1500, vy: -600 - r() * 700, vr: (r() - 0.5) * 8, seed: 300 + i, from: r() < 0.5 ? -1 : 1, delay: i * 0.12 }); return o; })();

  SC.experience = function (ctx, c) {
    const { s, t } = c;
    const tKnow = c.at('something I know'), tInstead = c.at('instead of asking'), tHustle = c.at('random side hustle');
    const tYears = c.at("I've worked on"), tLearn = c.at('one thing you learn'), tBunch = c.at('bunch of pages');
    const tR1 = c.at('The ideas have'), tR2 = c.at('the pages need'), tR3 = c.at('and the whole thing'), tOne = c.at('like one book');
    const cam = K.camAt(s, [
      [0, { z: 1.05, y: 30 }], [tYears - 0.4, { z: 1, y: 0 }], [tYears + 0.5, { y: -420, z: 1.3 }],
      [tLearn - 0.3, { y: -420, z: 1.3, x: 30 }], [tLearn + 0.5, { y: 0, z: 1 }], [tR1 - 0.3, { y: 0, z: 1 }], [tOne + 1.5, { y: -30, z: 1.04 }],
    ]);
    const pop_ = (i) => A(s, tYears + 0.3 + i * 0.12, 0.25, E.out) * (1 - A(s, tYears + 0.55 + i * 0.12, 0.35, E.inOut));
    K.room(ctx, cam, t, { shelfPop: pop_ });

    // creator
    const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
      [0, Object.assign({}, K.DESK_POSE, { eye: 'normal', mouth: 'smile' })],
      [tKnow - 0.2, {}],
      [tKnow + 0.3, { hRx: -10, hRy: -225, handR: 'open', eye: 'happy', mouth: 'smile', tilt: -0.05 }],
      [tInstead + 0.1, { eye: 'normal', lookX: 1, lookY: -0.6, turn: 0.35, hRx: 120, hRy: -80, handR: 'fist', mouth: 'flat', browL: 0.3, browR: 0.3 }],
      [tHustle + 0.4, { lid: 0.4, mouth: 'frown' }],
      [tHustle + 0.75, { hRx: 330, hRy: -380, handR: 'open', tilt: -0.1 }],
      [tHustle + 1.1, { hRx: -60, hRy: -330, tilt: 0.08 }],
      [tYears - 0.2, { hRx: 120, hRy: -80, handR: 'fist', lid: 0, lookX: 0, lookY: -1, turn: 0, tilt: 0, mouth: 'smile', browL: 0, browR: 0 }],
      [tLearn + 0.3, { lookY: 0, hRx: 150, hRy: -420, handR: 'point', eye: 'normal', mouth: 'talk', mo: 0.4, browL: -0.2, browR: -0.2 }],
      [tBunch - 0.3, { hRx: 120, hRy: -80, handR: 'fist', lookY: -1, mouth: 'flat' }],
      [tBunch + 0.9, { eye: 'wide', mouth: 'o', mo: 0.5 }],
      [tR1 - 0.3, { eye: 'normal', mouth: 'smile', lookX: -1, lookY: -1, turn: -0.4, hLx: -250, hLy: -460, handL: 'point' }],
      [tR2 - 0.3, { lookX: -1 }],
      [tR2 + 0.1, { lookX: 1, turn: 0.4, hLx: -120, hLy: -80, handL: 'fist', hRx: 250, hRy: -460, handR: 'point' }],
      [tR3 - 0.2, { lookX: 1 }],
      [tR3 + 0.3, { lookX: 0, lookY: -1, turn: 0, hRx: 60, hRy: -470, hLx: -60, hLy: -470, handL: 'open', handR: 'open' }],
      [tOne, { eye: 'happy', mouth: 'grin', mark: 'sparkle', markP: 0, hRx: 120, hRy: -80, hLx: -120, hLy: -80, handL: 'fist', handR: 'thumb' }],
      [tOne + 0.4, { markP: 1 }],
    ]);
    Object.assign(pose, { seed: 1 });
    K.layer(ctx, cam, 1, () => K.drawPerson(ctx, pose, K.PAL.creator, t));
    K.deskFront(ctx, cam, t);

    // side-hustle thought bubble
    const bIn = pop(s, tInstead + 0.2, 0.5), bOut = A(s, tHustle + 1.0, 0.25, E.in);
    if (bIn > 0 && bOut < 1) {
      K.layer(ctx, cam, 1, () => {
        const icons = ['dice', 'rocket', 'box', 'bolt'];
        K.bubble(ctx, 770, 740, 460, 340, 600, 960, bIn * (1 - bOut), {
          thought: true, draw: (g) => {
            for (let i = 0; i < 3; i++) {
              const x = -120 + i * 120;
              rr(g, x - 50, -110, 100, 130, 16); fillStroke(g, '#f3eefe', COL.ink, 5);
              g.save(); rr(g, x - 50, -110, 100, 130, 16); g.clip();
              const spin = t * (9 + i * 3);
              for (let k = -1; k <= 1; k++) {
                const idx = Math.floor(spin) + k, fy = (spin % 1) * 110 - k * 110 - 45;
                drawIcon(g, icons[((idx % 4) + 4) % 4], x, fy, 34);
              }
              g.restore();
            }
            text(g, 'random side hustle?', 0, 65, 38, { color: COL.greyDk });
          },
        });
        if (bOut > 0) for (let i = 0; i < 8; i++) { const a = i * 0.785; circle(ctx, 770 + Math.cos(a) * 260 * bOut, 760 + Math.sin(a) * 180 * bOut, 26 * (1 - bOut)); ctx.fillStyle = '#fff'; ctx.fill(); }
      });
    }

    // "years of books" caption
    K.topCaption(ctx, 'Years of KDP coloring books', K.showP(s, tYears + 0.3, tLearn - 0.2), { y: 1280, size: 62, bg: COL.sun });

    // pages thrown together
    const pIn = tBunch - 0.4, pBurst = tBunch + 0.9;
    K.layer(ctx, cam, 1, () => {
      pileNotes.forEach((n, i) => {
        const f = A(s, pIn + n.delay, 0.4, E.out);
        if (f <= 0) return;
        let x = lerp(540 + n.from * 900, 540 + n.dx, f), y = 770 + n.dy, rot = lerp(n.from * 1.2, n.rot, f);
        const b = s - pBurst;
        if (b > 0) { x += n.vx * b; y += n.vy * b + 1800 * b * b; rot += n.vr * b; }
        if (y < 2400) K.drawNote(ctx, x, y, 240, 300, rot, n.seed);
      });
      const xp = A(s, pBurst - 0.05, 0.3);
      if (xp > 0 && s < tR1) {
        ctx.save(); ctx.globalAlpha = 1 - A(s, tR1 - 0.6, 0.4);
        K.strike(ctx, 400, 630, 680, 910, xp, COL.red, 26); K.strike(ctx, 680, 630, 400, 910, clamp(xp * 1.3 - 0.3), COL.red, 26);
        ctx.restore();
      }
    });
    caption(ctx, '≠ a book', 540, 1010, 64, K.showP(s, pBurst + 0.2, tR1 - 0.4), { bg: '#fff', rot: 0.04 });

    // the three rules
    K.layer(ctx, cam, 1, () => {
      K.drawSticky(ctx, 255, 700, 330, 230, 'Fits the\naudience', COL.mint, -0.08, pop(s, tR1 - 0.1, 0.5), 54);
      K.drawSticky(ctx, 825, 700, 330, 230, 'Every page\ndistinct', COL.sky, 0.07, pop(s, tR2 - 0.1, 0.5), 54);
      K.drawSticky(ctx, 540, 400, 560, 170, 'Feels like ONE book', '#ffd98a', -0.03, pop(s, tR3 + 0.2, 0.5), 56);
    });
  };

  function drawIcon(ctx, kind, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    if (kind === 'dice') { rr(ctx, -s, -s, 2 * s, 2 * s, s * 0.3); fillStroke(ctx, '#fff', COL.ink, 5); for (const [a, b] of [[-0.45, -0.45], [0, 0], [0.45, 0.45]]) { circle(ctx, a * s, b * s, s * 0.16); ctx.fillStyle = COL.ink; ctx.fill(); } }
    else if (kind === 'rocket') K.drawProp(ctx, 'rocket', 0, 0, s * 1.2, true);
    else if (kind === 'box') { rr(ctx, -s, -s * 0.7, 2 * s, 1.6 * s, 6); fillStroke(ctx, '#d9a066', COL.ink, 5); line(ctx, [0, -s * 0.7, 0, s * 0.9], COL.ink, 4); line(ctx, [-s, -s * 0.2, s, -s * 0.2], COL.ink, 4); }
    else if (kind === 'bolt') { ctx.beginPath(); ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.6, s * 0.15); ctx.lineTo(0, s * 0.15); ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.6, -s * 0.15); ctx.lineTo(0, -s * 0.15); ctx.closePath(); fillStroke(ctx, COL.sun, COL.ink, 5); }
    ctx.restore();
  }
  K.drawIcon = drawIcon;

  // ================= 3. SERVICE IDEA =================
  SC.service = function (ctx, c) {
    const { s, t } = c;
    const tService = c.at('into a service'), tAuthors = c.at('independent authors'), tVague = c.at('a vague'), tPlan = c.at('to a plan'), tBuild = c.at('actually build');
    const cam = K.camAt(s, [[0, { z: 1.08, x: -40 }], [tVague, { z: 1.0, x: 0 }], [c.d, { z: 1.04, y: -20 }]]);
    K.layer(ctx, cam, 0.3, () => {
      K.wallBg(ctx, '#d7f5ea', '#a6e3cf', 'rgba(30,120,100,0.12)');
      // blueprint grid
      ctx.strokeStyle = 'rgba(30,120,100,0.12)'; ctx.lineWidth = 3;
      for (let x = -300; x < W + 300; x += 90) line(ctx, [x, -300, x, H + 300], 'rgba(30,120,100,0.1)', 3);
    });
    const morph = A(s, tPlan - 0.3, 1.0, E.inOut);
    const fly = A(s, tPlan - 0.6, 0.9, E.inOut);
    K.layer(ctx, cam, 1, () => {
      // shared table
      K.drawDesk(ctx, 1540, { top: '#8fd0b8', front: '#6cb79c' });
      // author
      const aPose = K.poseAt(s, K.PERSON_DEFAULTS, [
        [0, { x: 280, y: 1640, s: 0.92, hLx: -110, hLy: -90, hRx: 60, hRy: -300, handR: 'fist', handL: 'fist', mouth: 'flat', lookX: 0.3, lookY: -1, browL: 0.4, browR: 0.4, seed: 4, tilt: 0.08, mark: 'question', markP: 0 }],
        [tVague - 0.3, { markP: 1 }],
        [tPlan + 0.2, { lookX: 1, lookY: -0.3, tilt: 0, mark: null, hRx: 110, hRy: -90, mouth: 'o', mo: 0.2, browL: 0.2, browR: 0.2 }],
        [tBuild + 0.2, { mouth: 'smile', eye: 'normal' }],
      ]);
      K.drawPerson(ctx, aPose, K.PAL.bun, t);
      const cPose = K.poseAt(s, K.PERSON_DEFAULTS, [
        [0, { x: 810, y: 1640, s: 0.92, turn: -0.5, lookX: -1, hLx: -120, hLy: -90, hRx: 120, hRy: -90, handL: 'fist', handR: 'fist', mouth: 'smile', seed: 1 }],
        [tAuthors + 0.2, { hLx: -300, hLy: -300, handL: 'open', mouth: 'talk', mo: 0.3 }],
        [tPlan - 0.4, { hLx: -300, hLy: -420, hRx: 200, hRy: -300, handR: 'open', lookY: -1, lookX: -0.6, mouth: 'determined' }],
        [tPlan + 0.6, { hLx: -320, hLy: -470, hRx: 150, hRy: -60, handR: 'fist', eye: 'sparkle' }],
        [tBuild + 0.2, { hLx: -120, hLy: -90, hRx: 120, hRy: -90, handL: 'fist', handR: 'thumb', eye: 'happy', mouth: 'grin' }],
      ]);
      K.drawPerson(ctx, cPose, K.PAL.creator, t);

      // idea cloud → plan board
      const cx = lerp(330, 540, fly), cy = lerp(840, 800, fly);
      const cp = pop(s, 0.3, 0.6);
      if (morph < 1) {
        ctx.save(); ctx.globalAlpha = 1 - morph;
        K.bubble(ctx, cx, cy, 440 * (1 - morph * 0.3), 330 * (1 - morph * 0.3), 300, 1150, cp, {
          thought: true, fuzzy: true, bg: '#f4f1fb', seed: 5, draw: (g) => {
            const r = rng(12);
            g.save(); g.globalAlpha *= 0.55;
            for (let i = 0; i < 5; i++) {
              g.beginPath(); let px = -140 + r() * 40, py = -80 + i * 38;
              g.moveTo(px, py);
              for (let k = 0; k < 8; k++) { px += 30 + r() * 10; g.lineTo(px, py + Math.sin(t * 5 + k + i) * 10); }
              g.strokeStyle = COL.greyDk; g.lineWidth = 7; g.lineCap = 'round'; g.stroke();
            }
            g.restore();
            K.drawAnimal(g, 'cat', 100, -30, 45, null, 4);
            text(g, '?', -120, -60, 70, { color: COL.lilacDk });
          },
        });
        ctx.restore();
      }
      if (morph > 0) {
        ctx.save(); ctx.translate(cx, cy); const k = lerp(0.6, 1, E.back(morph)); ctx.scale(k, k); ctx.globalAlpha = clamp(morph * 2);
        rr(ctx, -270, -210, 540, 420, 26); fillStroke(ctx, '#2f63b8', COL.ink, 8);
        ctx.save(); rr(ctx, -270, -210, 540, 420, 26); ctx.clip();
        for (let x = -270; x < 270; x += 36) line(ctx, [x, -210, x, 210], 'rgba(255,255,255,0.12)', 2);
        for (let y = -210; y < 210; y += 36) line(ctx, [-270, y, 270, y], 'rgba(255,255,255,0.12)', 2);
        ctx.restore();
        const rows = ['Audience', 'Theme', 'Page plan', 'Style notes'];
        rows.forEach((r_, i) => {
          const rp = A(s, tPlan + 0.3 + i * 0.25, 0.4);
          if (rp <= 0) return;
          ctx.save(); ctx.globalAlpha *= rp;
          rr(ctx, -220, -165 + i * 88, 34, 34, 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
          K.check(ctx, -203, -148 + i * 88, 34, '#9ff0c8', rp);
          text(ctx, r_, -160, -148 + i * 88, 44, { color: '#fff', align: 'left', weight: 600 });
          ctx.restore();
        });
        ctx.restore();
      }
      // arrow from vague to plan
    });
    caption(ctx, 'vague idea', 330, 1110, 50, K.showP(s, tVague, tPlan - 0.3), { bg: '#fff', rot: -0.04 });
    caption(ctx, 'buildable plan', 540, 1090, 56, K.showP(s, tPlan + 0.5, c.d + 1), { bg: COL.sun, rot: 0.03 });
    K.topCaption(ctx, 'A service for\nindie authors', K.showP(s, tService, c.d + 1), { size: 64, y: 330 });
  };

  // ================= 4. BASIC PROMPT =================
  const PROMPT = 'Give me ideas for an animal coloring book.';
  SC.prompt = function (ctx, c) {
    const { s, t } = c;
    const tGive = c.at('Give me ideas'), tEnd = c.end('coloring book');
    const typeP = inv(tGive - 0.1, tEnd - 0.3, s);
    const sent = A(s, tEnd, 0.5, E.out);
    const cam = K.camAt(s, [[0, { z: 0.92, y: 60 }], [tGive, { z: 1.0, y: 0 }], [c.d, { z: 1.05, y: -20 }]]);
    K.layer(ctx, cam, 0.3, () => K.wallBg(ctx, '#2d2250', '#1d1535', 'rgba(255,255,255,0.05)'));
    K.layer(ctx, cam, 0.6, () => {
      // desk lamp glow
      const g = ctx.createRadialGradient(540, 900, 50, 540, 900, 800);
      g.addColorStop(0, 'rgba(120,200,255,0.25)'); g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-200, 0, W + 400, H);
    });
    K.layer(ctx, cam, 1, () => {
      K.drawDesk(ctx, 1330, { top: '#6d4c7d', front: '#553a63' });
      K.drawLaptop(ctx, 540, 1300, 2.05, (g, w, h) => {
        g.fillStyle = '#1c2040'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2a3160'; g.fillRect(0, 0, w, 40);
        circle(g, 22, 20, 7); g.fillStyle = '#6ef0b0'; g.fill();
        text(g, 'AI helper', 38, 21, 18, { color: '#fff', align: 'left', weight: 600 });
        // sent bubble
        if (sent > 0) {
          const lines = K.wrap(g, PROMPT, 250, 18);
          const bh = lines.length * 24 + 20, by = lerp(236, 56, sent);
          g.save(); g.globalAlpha = clamp(sent * 2);
          rr(g, w - 290, by, 276, bh, 16); fillStroke(g, COL.coral, COL.ink, 3);
          lines.forEach((l, i) => text(g, l, w - 276, by + 22 + i * 24, 18, { color: '#fff', align: 'left', weight: 600 }));
          g.restore();
          // AI "typing" dots
          const dp = A(s, tEnd + 0.6, 0.3);
          if (dp > 0) {
            rr(g, 14, 170, 90, 44, 20); g.fillStyle = '#343c75'; g.fill();
            for (let i = 0; i < 3; i++) { circle(g, 38 + i * 20, 192 - Math.max(0, Math.sin(t * 8 - i)) * 6, 6); g.fillStyle = '#9ff'; g.fill(); }
          }
        }
        // input box
        rr(g, 12, 228, w - 24, 58, 14); fillStroke(g, '#fff', COL.ink, 3);
        const shown = sent > 0 ? '' : K.typed(PROMPT, typeP);
        const lines = K.wrap(g, shown, w - 70, 18);
        const last = lines.length ? lines[lines.length - 1] : '';
        const lineShow = lines.slice(-2);
        lineShow.forEach((l, i) => text(g, l, 26, 245 + i * 22 + (lineShow.length === 1 ? 12 : 0), 18, { color: COL.ink, align: 'left', weight: 600 }));
        if (sent === 0 && Math.floor(t * 2.5) % 2 === 0) {
          const cxp = 26 + K.textWidth(g, last, 18, 600) + 3, cyp = 245 + (lineShow.length - 1) * 22 + (lineShow.length === 1 ? 12 : 0);
          line(g, [cxp, cyp - 10, cxp, cyp + 10], COL.ink, 2.5);
        }
        // send button
        circle(g, w - 38, 257, 18); g.fillStyle = typeP >= 1 ? COL.coral : '#ccc'; g.fill();
        g.beginPath(); g.moveTo(w - 45, 249); g.lineTo(w - 28, 257); g.lineTo(w - 45, 265); g.closePath(); g.fillStyle = '#fff'; g.fill();
      });
    });
    // Pip peeks in from the right edge
    const peek = E.back(inv(tGive + 0.2, tGive + 0.8, s));
    K.drawPip(ctx, { x: lerp(1300, 935, peek), y: 560, s: 0.75, rot: -0.35, mood: sent > 0.5 ? 'eager' : 'calm', lookX: -1, armL: 1.2 + Math.sin(t * 10) * 0.3 * (sent > 0.5 ? 1 : 0), seed: 2 }, t);
    // hands typing (foreground)
    K.layer(ctx, cam, 1.15, () => {
      const typing = typeP > 0 && typeP < 1;
      for (const side of [-1, 1]) {
        const jig = typing ? Math.max(0, Math.sin(t * 22 + side * 1.7)) * 16 : 0;
        const hx = 540 + side * 190, hy = 1460 - jig;
        const sx = 540 + side * 420, sy = 2050;
        line(ctx, [sx, sy, hx + side * 30, hy + 40], COL.ink, 104); line(ctx, [sx, sy, hx + side * 30, hy + 40], COL.sun, 90);
        line(ctx, [hx + side * 50, hy + 70, hx + side * 30, hy + 40], COL.ink, 108); line(ctx, [hx + side * 50, hy + 70, hx + side * 30, hy + 40], '#e8922b', 94);
        ctx.save(); ctx.translate(hx, hy); ctx.scale(1.4, 1.4); ellipse(ctx, 0, 0, 34, 30); fillStroke(ctx, K.PAL.creator.skin, COL.ink, 5); ctx.restore();
      }
    });
    K.topCaption(ctx, 'Round 1: a basic prompt', K.showP(s, 0.3, c.d + 1), { size: 62, y: 300 });
  };

  // ================= 5. GENERIC OUTPUT =================
  const LIST = ['Cute cat playing', 'Dog at the park', 'Cat with yarn', 'Happy bunny', 'Cat taking a nap', 'Dog playing fetch', 'Cute cat in a box'];
  const REPEATS = [0, 2, 4, 6]; // cats
  SC.generic = function (ctx, c) {
    const { s, t } = c;
    const tNot = c.at("doesn't tell the AI"), tWho = c.at('who the book is for'), tDetail = c.at('how detailed'), tDiff = c.at('whether every page'), tUsed = c.at('what kinds of scenes');
    const tList = c.at('so it gives me'), tPlaus = c.at('sounds plausible'), tStill = c.at('but I still'), tThink = c.at('the thinking myself');
    const cam = K.camAt(s, [[0, { z: 1.02 }], [tList - 0.2, { z: 1 }], [tList + 0.6, { y: 120, z: 1.0 }], [tStill - 0.3, { y: 150, z: 1.0 }], [tStill + 0.6, { y: 260, x: 60, z: 1.06 }]]);
    K.layer(ctx, cam, 0.3, () => K.wallBg(ctx, '#efe7ff', '#d8c9ff', 'rgba(90,60,160,0.10)'));
    const tagsOut = A(s, tList - 0.3, 0.4, E.in);
    // Pip
    const confused = s > tNot + 0.2 && s < tList;
    const listing = s >= tList;
    const pipAway = A(s, tStill - 0.4, 0.8, E.inOut);
    const pipPos = { x: lerp(lerp(540, 690, A(s, tList - 0.2, 0.6, E.inOut)), 880, pipAway), y: lerp(lerp(900, 640, A(s, tList - 0.2, 0.6, E.inOut)), 1060, pipAway) };
    const hop = listing ? Math.abs(Math.sin((s - tList) * 7)) * 30 * (1 - A(s, tList + 1.6, 0.4)) : 0;
    K.layer(ctx, cam, 1, () => {
      K.drawPip(ctx, { x: pipPos.x, y: pipPos.y - hop, s: lerp(1.35, 0.95, A(s, tList - 0.2, 0.6)), mood: confused ? 'confused' : 'eager', lookX: confused ? Math.sin(s * 1.5) : -0.6, armL: listing ? 2.2 : 0.3, armR: confused ? 1.8 : 0.4, rot: confused ? Math.sin(s * 1.2) * 0.12 : 0, seed: 3 }, t);
    });
    // missing-info tags
    const tag = (str, tt, x, y, rot) => {
      const p = pop(s, tt - 0.1, 0.5) * (1 - tagsOut);
      if (p <= 0) return;
      K.layer(ctx, cam, 1, () => {
        const fl = Math.sin(t * 2 + x) * 8;
        caption(ctx, str, x, y + fl, 54, p, { rot, bg: '#f7f5fb', border: COL.greyDk, color: COL.greyDk });
      });
    };
    tag("Who's it for?", tWho, 270, 560, -0.06);
    tag('How detailed?', tDetail, 810, 610, 0.05);
    tag('New animal\neach page?', tDiff, 260, 1280, 0.04);
    tag('Already used?', tUsed, 810, 1320, -0.05);
    K.topCaption(ctx, 'Not enough context', K.showP(s, tNot, tList - 0.4), { size: 64, y: 300, bg: '#fff' });

    // the generic list (scroll)
    const un = A(s, tList + 0.1, 1.2, E.out);
    if (un > 0) {
      K.layer(ctx, cam, 1, () => {
        const x = 390, top = 820, w = 560, fullH = LIST.length * 104 + 60;
        const hgt = fullH * un;
        ctx.save(); ctx.translate(x, top); ctx.rotate(-0.03);
        rr(ctx, -w / 2, 0, w, hgt, 16); fillStroke(ctx, '#fffdf6', COL.ink, 6);
        ctx.save(); rr(ctx, -w / 2, 0, w, hgt, 16); ctx.clip();
        LIST.forEach((it, i) => {
          const y = 60 + i * 104;
          const ip = A(s, tList + 0.2 + i * 0.16, 0.3);
          if (ip <= 0) return;
          const isRep = REPEATS.includes(i);
          const flag = isRep ? A(s, tStill + 0.3 + REPEATS.indexOf(i) * 0.45, 0.35) : 0;
          ctx.save(); ctx.globalAlpha *= ip;
          if (flag > 0) { ctx.save(); ctx.globalAlpha *= 0.25 * flag; rr(ctx, -w / 2 + 12, y - 40, w - 24, 80, 12); ctx.fillStyle = COL.red; ctx.fill(); ctx.restore(); }
          text(ctx, `${i + 1}.`, -w / 2 + 40, y, 44, { color: COL.greyDk, align: 'left' });
          text(ctx, it, -w / 2 + 100, y, 46, { color: COL.ink, align: 'left', weight: 600 });
          ctx.restore();
        });
        ctx.restore();
        // curled bottom
        ellipse(ctx, 0, hgt, w / 2 + 10, 22); fillStroke(ctx, '#efe8d8', COL.ink, 6);
        // red marks
        REPEATS.forEach((i, k) => {
          const mp = A(s, tStill + 0.3 + k * 0.45, 0.35);
          K.markCircle(ctx, -w / 2 + 250, 60 + i * 104, 150, 44, mp, COL.red, 8, i + 3);
        });
        ctx.restore();
      });
    }
    caption(ctx, 'Sounds plausible…', 690, 380, 60, K.showP(s, tPlaus, tStill - 0.2), { bg: COL.sun, rot: 0.04 });
    caption(ctx, 'cat… cat… cat…', 740, 520, 52, K.showP(s, tStill + 1.4, c.d + 1), { bg: '#fff', rot: 0.06, color: COL.red });

    // creator enters, flipping through
    const enter = E.back(inv(tStill - 0.4, tStill + 0.3, s));
    if (enter > 0) {
      K.layer(ctx, cam, 1, () => {
        const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
          [tStill - 0.4, { eye: 'normal', mouth: 'smile', lookX: -1, lookY: -0.2, turn: -0.4, hLx: -330, hLy: -330, handL: 'open', hRx: 60, hRy: -60, handR: 'fist', seed: 1 }],
          [tStill + 0.8, { lookY: 0.3, mouth: 'flat', browL: 0.3, browR: 0.3 }],
          [tStill + 1.6, { lid: 0.45, mouth: 'flat', sweat: 1, browL: 0.1, browR: 0.1, lookY: 0.4 }],
          [tThink, { lookX: 0, lookY: 0, turn: 0, lid: 0.5, mouth: 'wavy', sweat: 1 }],
        ]);
        Object.assign(pose, { x: 860, y: lerp(2600, 2080, enter), s: 1.1 });
        K.drawPerson(ctx, pose, K.PAL.creator, t);
      });
    }
    K.topCaption(ctx, 'I still do the thinking.', K.showP(s, tThink - 0.4, c.d + 1), { size: 62, y: 300, bg: '#fff' });
  };
})();
