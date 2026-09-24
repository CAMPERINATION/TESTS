// Scenes 6–11: brief, plan + review, concept package, the value, the test, ending question.
(function () {
  'use strict';
  const K = window.KDP;
  const { W, H, COL, clamp, lerp, inv, E, A, pop, rr, fillStroke, circle, ellipse, line, star, text, caption, rng } = K;
  const SC = K.SCENES;

  // ================= 6. THE BRIEF =================
  const BRIEF = [
    ['Audience: adults', 'for adults'],
    ['Simple animal scenes', 'simple animal scenes'],
    ['1 animal + 1 everyday\nactivity per page', 'one animal doing'],
    ['Consistent line style', 'rules for the drawing'],
    ['No repeated combos', 'avoid repeating'],
  ];
  SC.brief = function (ctx, c) {
    const { s, t } = c;
    const tBrief = c.at('a real brief'), tEnd = c.end('combination');
    const times = BRIEF.map(([, ph]) => c.at(ph));
    const cam = K.camAt(s, [[0, { z: 1.1, y: 80 }], [tBrief + 0.3, { z: 1, y: 0 }], [times[2], { z: 1.02, y: -20 }], [c.d, { z: 1.06, y: -30 }]]);
    K.layer(ctx, cam, 0.3, () => K.wallBg(ctx, '#fff0cf', '#ffd79a', 'rgba(170,110,20,0.12)'));

    // clipboard
    const cbIn = E.back(inv(tBrief - 0.5, tBrief + 0.2, s));
    K.layer(ctx, cam, 1, () => {
      ctx.save(); ctx.translate(560, lerp(-700, 880, cbIn)); ctx.rotate(0.02);
      ctx.save(); ctx.translate(12, 16); rr(ctx, -420, -470, 840, 1000, 36); ctx.fillStyle = 'rgba(40,20,60,0.2)'; ctx.fill(); ctx.restore();
      rr(ctx, -420, -470, 840, 1000, 36); fillStroke(ctx, '#b8804f', COL.ink, 8);
      rr(ctx, -380, -420, 760, 910, 18); fillStroke(ctx, COL.paper, COL.ink, 6);
      rr(ctx, -130, -500, 260, 80, 20); fillStroke(ctx, '#9aa3b5', COL.ink, 7);
      text(ctx, 'THE BRIEF', 0, -335, 76, { color: COL.coral });
      line(ctx, [-300, -280, 300, -280], COL.ink, 5);
      BRIEF.forEach(([str], i) => {
        const tt = times[i];
        const y = -190 + i * 145 + (i > 2 ? 40 : 0);
        const p = A(s, tt - 0.15, 0.25);
        rr(ctx, -330, y - 30, 60, 60, 12); fillStroke(ctx, '#fff', COL.ink, 5);
        if (p > 0) {
          const lines = str.split('\n');
          const shown = K.typed(str.replace('\n', ' '), A(s, tt - 0.1, 0.55, E.lin));
          // render with the original line break
          let rem = shown;
          lines.forEach((l, li) => {
            const part = rem.slice(0, l.length); rem = rem.slice(l.length + 1);
            text(ctx, part, -245, y + li * 56, 50, { color: COL.ink, align: 'left', weight: 600 });
          });
          K.check(ctx, -300, y, 58, COL.green, A(s, tt + 0.35, 0.3));
        }
      });
      ctx.restore();
    });

    // creator: rolls up sleeves, conducts each line
    const beat = (i) => times[i];
    const keys = [
      [0, { x: 250, y: 2050, s: 1.12, eye: 'normal', mouth: 'flat', lid: 0.2, hLx: -140, hLy: -60, hRx: 140, hRy: -60, handL: 'fist', handR: 'fist', seed: 1, squash: 1 }],
      [tBrief - 0.5, { squash: 0.92, eye: 'closed', mouth: 'flat', hLx: -60, hLy: -200, hRx: 170, hRy: -230, handL: 'fist', handR: 'fist' }],
      [tBrief, { squash: 1.05, eye: 'sparkle', lid: 0, mouth: 'determined', browL: -0.6, browR: -0.6, hRx: 220, hRy: -470, handR: 'redpen', lookX: 1, lookY: -1, turn: 0.4, mark: 'sparkle', markP: 1 }],
      [tBrief + 0.4, { squash: 1, mark: null }],
    ];
    times.forEach((tt, i) => {
      keys.push([tt - 0.2, { hRx: 250, hRy: -520 + i * 25, mouth: 'determined' }]);
      keys.push([tt + 0.25, { hRx: 300, hRy: -560 + i * 25, mouth: 'talk', mo: 0.4 }]);
    });
    keys.push([tEnd + 0.1, { eye: 'happy', mouth: 'grin', hRx: 140, hRy: -60, handR: 'thumb', browL: 0, browR: 0 }]);
    const pose = K.poseAt(s, K.PERSON_DEFAULTS, keys);
    K.layer(ctx, cam, 1, () => K.drawPerson(ctx, pose, K.PAL.creator, t));

    // Pip listening, nodding on each item
    let nod = 0; times.forEach((tt) => { const u = inv(tt + 0.3, tt + 0.7, s); nod += Math.sin(u * Math.PI) * 0.18; });
    K.layer(ctx, cam, 1, () => K.drawPip(ctx, { x: 860, y: 1640, s: 0.85, mood: s > tEnd ? 'happy' : 'calm', lookX: -0.4, lookY: -1, rot: nod, squash: 1 - nod * 0.3, seed: 3 }, t));
  };

  // ================= 7. PLAN + REVIEW =================
  const CARDS = [
    { animal: 'fox', prop: 'pan', label: 'Fox · cooking breakfast' },
    { animal: 'owl', prop: 'book', label: 'Owl · reading' },
    { animal: 'bear', prop: 'basket', label: 'Bear · laundry day' },
    { animal: 'owl', prop: 'book', label: 'Owl · reading', swap: { animal: 'mouse', prop: 'yarn', label: 'Mouse · knitting' } },
    { animal: 'dog', prop: 'heart', label: 'Dog · being cute', swap: { animal: 'dog', prop: 'dish', label: 'Dog · washing dishes' } },
    { animal: 'rabbit', prop: 'can', label: 'Rabbit · watering plants' },
  ];
  const GRID = [[290, 650], [790, 650], [290, 1020], [790, 1020], [290, 1390], [790, 1390]];
  const COLORS = ['#ffe9c7', '#e3f4ff', '#e9ffe9', '#e3f4ff', '#ffe6ee', '#f3ebff'];
  SC.plan = function (ctx, c) {
    const { s, t } = c;
    const tDir = c.at('has a direction'), tPlan = c.at('page-by-page plan'), tReview = c.at('review the ideas'), tReplace = c.at('replace the weak'), tRep = c.at("doesn't feel repetitive");
    const tShoot = Math.min(tPlan - 0.4, tDir + 1.5);
    const cam = K.camAt(s, [[0, { z: 1.05 }], [tShoot, { z: 1 }], [tReview - 0.2, { z: 1 }], [tReview + 0.5, { z: 1.05, y: 60 }], [tRep - 0.2, { z: 1.05, y: 60 }], [tRep + 0.6, { z: 1, y: 0 }]]);
    K.layer(ctx, cam, 0.3, () => K.wallBg(ctx, '#e4f7ff', '#b9e4ff', 'rgba(40,110,160,0.10)'));

    // Pip: happy, compass arrow, then moves to corner
    const away = A(s, tShoot + 0.9, 0.7, E.inOut);
    K.layer(ctx, cam, 1, () => {
      K.drawPip(ctx, { x: lerp(540, 900, away), y: lerp(1000, 1740, away), s: lerp(1.3, 0.7, away), mood: 'happy', screenText: s > tDir - 0.1 && s < tShoot + 0.2 ? '→' : null, armL: 0.5 + Math.sin(t * 6) * 0.2, armR: s > tShoot && s < tShoot + 1.2 ? 2.4 : 0.4, seed: 3 }, t);
    });

    // cards
    K.layer(ctx, cam, 1, () => {
      CARDS.forEach((cd, i) => {
        const f = A(s, tShoot + i * 0.15, 0.55, E.out);
        if (f <= 0) return;
        const [gx, gy] = GRID[i];
        const x = lerp(540, gx, f), y = lerp(1000, gy, f) - Math.sin(f * Math.PI) * 120, rot = lerp(1.2, (i % 2 ? 0.03 : -0.03), f), sc = lerp(0.2, 1, f);
        let data = cd, sx = 1;
        if (cd.swap) {
          const fl = inv(tReplace + (i === 4 ? 0.35 : 0), tReplace + 0.5 + (i === 4 ? 0.35 : 0), s);
          sx = Math.abs(Math.cos(fl * Math.PI));
          if (fl >= 0.5) data = cd.swap;
        }
        K.drawPageCard(ctx, x, y, 450, 340, { animal: data.animal, prop: data.prop, label: data.label, fill: null, rot, scale: sc, sx, bg: COLORS[i], labelSize: 40 });
      });
      // review marks
      const fade = 1 - A(s, tReplace - 0.1, 0.3);
      const m1 = A(s, tReview + 0.1, 0.45), m2 = A(s, tReview + 0.7, 0.45);
      ctx.save(); ctx.globalAlpha *= fade;
      K.markCircle(ctx, GRID[3][0], GRID[3][1], 250, 190, m1, COL.red, 11, 4);
      K.markCircle(ctx, GRID[4][0], GRID[4][1], 250, 190, m2, COL.red, 11, 8);
      ctx.restore();
      caption(ctx, 'Repeat!', GRID[3][0] + 120, GRID[3][1] - 170, 54, pop(s, tReview + 0.35, 0.45) * fade, { bg: COL.red, color: '#fff', rot: 0.08 });
      caption(ctx, 'Weak', GRID[4][0] - 110, GRID[4][1] - 170, 54, pop(s, tReview + 0.95, 0.45) * fade, { bg: COL.red, color: '#fff', rot: -0.08 });
      // stamp
      const sp = inv(tRep - 0.1, tRep + 0.15, s);
      if (sp > 0) {
        ctx.save(); ctx.translate(540, 1030); ctx.rotate(-0.12); const k = lerp(2, 1, E.out(sp)); ctx.scale(k, k); ctx.globalAlpha *= clamp(sp * 3);
        rr(ctx, -330, -85, 660, 170, 30); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.strokeStyle = COL.green; ctx.lineWidth = 14; ctx.stroke();
        text(ctx, 'No repeats ✓', 0, 5, 84, { color: COL.green });
        ctx.restore();
      }
    });

    // creator with red pen, lower left foreground
    const enter = E.back(inv(tReview - 0.8, tReview - 0.1, s));
    if (enter > 0) {
      const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
        [tReview - 0.8, { eye: 'normal', lid: 0.3, browL: -0.5, browR: -0.5, mouth: 'flat', lookX: 1, lookY: -1, turn: 0.4, hLx: -150, hLy: -60, hRx: 250, hRy: -420, handR: 'redpen', handL: 'fist', seed: 1 }],
        [tReview + 0.3, { hRx: 330, hRy: -560 }],
        [tReview + 0.8, { hRx: 170, hRy: -320, lookX: 0.6, lookY: -0.5 }],
        [tReplace, { hRx: 290, hRy: -480, mouth: 'determined', lid: 0.2 }],
        [tReplace + 0.9, { hRx: 150, hRy: -350 }],
        [tRep - 0.2, {}],
        [tRep + 0.3, { eye: 'happy', mouth: 'grin', lid: 0, browL: 0, browR: 0, hRx: 220, hRy: -200, handR: 'thumb' }],
      ]);
      Object.assign(pose, { x: 120, y: lerp(2700, 2330, enter), s: 1.2 });
      K.layer(ctx, cam, 1.1, () => K.drawPerson(ctx, pose, K.PAL.creator, t));
    }
    K.topCaption(ctx, 'Page-by-page plan', K.showP(s, tPlan - 0.2, tReview - 0.2), { size: 64, y: 300 });
    K.topCaption(ctx, 'Review → replace', K.showP(s, tReview, c.d + 1), { size: 64, y: 300, bg: COL.sun });
  };

  // ================= 8. CONCEPT PACKAGE =================
  const DOCS = [
    ['Audience', 'adults · calm, simple scenes', 'the audience', COL.mint],
    ['Book theme', 'Everyday Animals', 'the book theme', COL.sky],
    ['Page descriptions', 'one animal + one activity each', 'page descriptions', '#ffd98a'],
    ['Illustration notes', 'clean lines · consistent style', 'illustration notes', '#ffc2d1'],
    ['Listing draft', 'title · description · keywords', 'first draft', COL.lilac],
  ];
  SC.package = function (ctx, c) {
    const { s, t } = c;
    const tPkg = c.at('concept package');
    const times = DOCS.map((d) => c.at(d[2]));
    const tClose = Math.max(times[4] + 1.0, c.d - 0.9);
    const cam = K.camAt(s, [[0, { z: 1.08 }], [tPkg, { z: 1 }], [times[4], { z: 1.02, y: -10 }], [c.d, { z: 1.08, y: -20 }]]);
    K.layer(ctx, cam, 0.3, () => {
      K.wallBg(ctx, '#fff4d6', '#ffd98a', 'rgba(170,110,20,0.12)');
      ctx.save(); ctx.translate(540, 1000); ctx.rotate(t * 0.1); ctx.globalAlpha = 0.18;
      for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-80, -1500); ctx.lineTo(80, -1500); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.restore();
    });
    const fIn = E.back(inv(0.1, 0.7, s));
    const closeP = A(s, tClose, 0.5, E.inOut);
    K.layer(ctx, cam, 1, () => {
      K.drawFolder(ctx, 540, lerp(1900, 1080, fIn), 860, 900, 1 - closeP, {
        scale: 1 - closeP * 0.08,
        contents: (g) => {
          DOCS.forEach(([title, sub, , col], i) => {
            const f = A(s, times[i] - 0.25, 0.6, E.out);
            if (f <= 0) return;
            const side = i % 2 ? 1 : -1;
            const y = -330 + i * 150;
            g.save();
            g.translate(lerp(side * 1100, 0, f), y + Math.sin(f * Math.PI) * -80);
            g.rotate(lerp(side * 0.6, (i % 2 ? 0.015 : -0.015), f));
            g.save(); g.translate(8, 10); rr(g, -370, -62, 740, 130, 16); g.fillStyle = 'rgba(40,20,60,0.2)'; g.fill(); g.restore();
            rr(g, -370, -62, 740, 130, 16); fillStroke(g, '#fff', COL.ink, 6);
            rr(g, -370, -62, 34, 130, 10); fillStroke(g, col, COL.ink, 6);
            text(g, title, -310, -20, 50, { align: 'left', color: COL.ink });
            text(g, sub, -310, 30, 38, { align: 'left', color: COL.greyDk, weight: 500 });
            g.restore();
          });
        },
        label: (g, fh) => {
          const lp = A(s, tClose + 0.3, 0.4);
          g.save(); g.globalAlpha *= lp;
          text(g, 'CONCEPT PACKAGE', 0, 450 - fh / 2 - 60, 60, { color: COL.ink });
          text(g, 'Everyday Animals', 0, 450 - fh / 2 + 30, 72, { color: COL.coral, outline: COL.ink, outlineWidth: 8 });
          K.drawAnimal(g, 'fox', -160, 450 - fh / 2 + 170, 60, '#ffb070', 5);
          K.drawAnimal(g, 'owl', 0, 450 - fh / 2 + 170, 60, '#c9b08a', 5);
          K.drawAnimal(g, 'rabbit', 160, 450 - fh / 2 + 180, 60, '#f3eefe', 5);
          g.restore();
        },
      });
    });
    // creator peeks from bottom-left, pleased
    const cp = K.poseAt(s, K.PERSON_DEFAULTS, [
      [0, { x: 140, y: 2330, s: 1.05, eye: 'normal', mouth: 'smile', lookX: 1, lookY: -1, turn: 0.4, hLx: -150, hLy: -60, hRx: 150, hRy: -60, handL: 'fist', handR: 'fist', seed: 1 }],
      [tClose, {}],
      [tClose + 0.4, { eye: 'happy', mouth: 'grin', hRx: 230, hRy: -300, handR: 'thumb' }],
    ]);
    K.layer(ctx, cam, 1.1, () => K.drawPerson(ctx, cp, K.PAL.creator, t));
    K.layer(ctx, cam, 1.1, () => K.drawPip(ctx, { x: 920, y: 1760, s: 0.75, mood: s > tClose ? 'proud' : 'happy', lookX: -1, lookY: -1, armL: 0.5 + 0.5 * Math.sin(t * 5), seed: 6 }, t));
    K.topCaption(ctx, 'Concept package', K.showP(s, tPkg - 0.2, tClose - 0.1), { size: 66, y: 300, bg: '#fff' });
  };

  // ================= 9. THE VALUE =================
  SC.value = function (ctx, c) {
    const { s, t } = c;
    const tClear = c.at('clear about'), tRaw = c.at('raw AI list'), tPretend = c.at('pretend the book'), tSell = c.at("I'd be selling"),
      tExp = c.at('experience helps catch'), tFine = c.at('look fine at first'), tBelong = c.at("don't belong");
    const partD = A(s, tExp - 0.9, 0.8, E.inOut);
    const cam = K.camAt(s, [[0, { z: 1.08, y: 40 }], [tRaw - 0.2, { z: 1 }], [tExp - 0.9, { z: 1 }], [tExp - 0.1, { z: 1.0, y: 0 }], [c.d, { z: 1.06 }]]);
    K.layer(ctx, cam, 0.3, () => K.wallBg(ctx, lerp(0, 1, partD) > 0.5 ? '#e8e2ff' : '#ffe8e0', lerp(0, 1, partD) > 0.5 ? '#c9bcff' : '#ffc9b8', 'rgba(120,60,90,0.10)'));

    if (partD < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - partD;
      K.layer(ctx, cam, 1, () => {
        const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
          [0, Object.assign({}, K.DESK_POSE, { hRx: -20, hRy: -215, handR: 'open', browL: 0.4, browR: 0.4, mouth: 'talk', mo: 0.3, seed: 1 })],
          [tClear + 0.3, { mouth: 'flat' }],
          [tRaw - 0.2, { lookX: -1, turn: -0.3, hRx: 120, hRy: -80, handR: 'fist' }],
          [tPretend + 0.2, { lookX: 0, turn: 0, browL: -0.4, browR: -0.4, mouth: 'frown', hLx: 70, hLy: -300, hRx: -70, hRy: -300, handL: 'open', handR: 'open', tilt: 0 }],
          [tPretend + 0.6, { tilt: 0.08 }], [tPretend + 0.9, { tilt: -0.08 }], [tPretend + 1.2, { tilt: 0 }],
          [tSell, { browL: 0, browR: 0, mouth: 'smile', eye: 'sparkle', hLx: -120, hLy: -80, handL: 'fist', hRx: 200, hRy: -470, handR: 'point' }],
        ]);
        K.drawPerson(ctx, pose, K.PAL.creator, t);
        K.drawDesk(ctx, K.DESK_Y);
        // raw list + "done" book
        const rp = E.back(inv(tRaw - 0.3, tRaw + 0.3, s)), away = A(s, tSell - 0.3, 0.5, E.in);
        if (rp > 0) {
          ctx.save(); ctx.translate(lerp(-400, 290, rp) - away * 900, 760); ctx.rotate(-0.06);
          rr(ctx, -200, -250, 400, 500, 16); fillStroke(ctx, '#f1eff4', COL.ink, 6);
          text(ctx, 'Raw AI list', 0, -195, 44, { color: COL.greyDk });
          for (let i = 0; i < 7; i++) line(ctx, [-150, -120 + i * 55, 60 + (i * 37) % 90, -120 + i * 55], '#b9b3c6', 12);
          ctx.restore();
          const bp = E.back(inv(tPretend - 0.3, tPretend + 0.3, s));
          ctx.save(); ctx.translate(lerp(1400, 790, bp) + away * 900, 760); ctx.rotate(0.06);
          rr(ctx, -170, -230, 340, 460, 20); fillStroke(ctx, COL.sky, COL.ink, 7);
          rr(ctx, -130, -180, 260, 250, 14); fillStroke(ctx, '#fff', COL.ink, 5);
          K.drawAnimal(ctx, 'cat', 0, -60, 70, null, 5);
          caption(ctx, 'DONE!', 0, 150, 56, bp, { bg: COL.sun, rot: -0.1 });
          ctx.restore();
          // stamp
          const sp = inv(tPretend + 0.5, tPretend + 0.8, s);
          if (sp > 0 && away < 1) {
            ctx.save(); ctx.translate(540, 760); ctx.rotate(-0.15); const k = lerp(2.2, 1, E.out(sp)); ctx.scale(k, k); ctx.globalAlpha *= clamp(sp * 3) * (1 - away);
            rr(ctx, -340, -80, 680, 160, 24); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.strokeStyle = COL.red; ctx.lineWidth = 14; ctx.stroke();
            text(ctx, '✕ Not the product', 0, 5, 70, { color: COL.red });
            ctx.restore();
          }
        }
        // planning + review
        const pp = pop(s, tSell + 0.1, 0.6);
        if (pp > 0) {
          ctx.save(); ctx.translate(540, 700); ctx.scale(pp, pp);
          rr(ctx, -400, -150, 800, 300, 40); fillStroke(ctx, COL.sun, COL.ink, 8);
          text(ctx, 'The product:', 0, -70, 54, { color: COL.ink, weight: 600 });
          text(ctx, 'Planning + review', 0, 25, 84, { color: COL.ink });
          ctx.restore();
          for (let i = 0; i < 5; i++) { const a = i * 1.26 + t; star(ctx, 540 + Math.cos(a) * 470, 700 + Math.sin(a) * 200, 22 * pp, 4, 0.3); ctx.fillStyle = '#fff'; ctx.fill(); }
        }
      });
      K.topCaption(ctx, 'To be clear:', K.showP(s, 0.2, tRaw - 0.3), { size: 70, y: 320, bg: '#fff' });
      ctx.restore();
    }

    if (partD > 0) {
      ctx.save(); ctx.globalAlpha *= partD;
      K.layer(ctx, cam, 1, () => {
        // cards under review: most fine, one that "looks fine" but doesn't belong
        const out = A(s, tBelong + 1.3, 0.9, E.in);
        K.drawPageCard(ctx, 250, 600, 330, 260, { animal: 'bear', prop: 'mug', label: 'Bear · tea time', rot: -0.05, labelSize: 34, bg: '#fff' });
        K.drawPageCard(ctx, 830, 600, 330, 260, { animal: 'hedgehog', prop: 'book', label: 'Hedgehog · reading', rot: 0.05, labelSize: 34, bg: '#fff' });
        const shine = s < tBelong ? 1 : 0;
        ctx.save();
        ctx.translate(520 + out * 900, 1110 + out * 300); ctx.rotate(out * 0.8);
        K.drawPageCard(ctx, 0, 0, 500, 390, { animal: 'fox', prop: 'rocket', label: 'Fox · riding a rocket', labelSize: 42, bg: '#fff7e6', fill: '#ffb070' });
        if (shine) for (let i = 0; i < 4; i++) { const a = i * 1.57 + t * 1.5; star(ctx, Math.cos(a) * 280, Math.sin(a) * 220, 20 + 6 * Math.sin(t * 6 + i), 4, 0.3); ctx.fillStyle = COL.sun; ctx.fill(); }
        K.markCircle(ctx, 0, 0, 290, 230, A(s, tBelong + 0.05, 0.4), COL.red, 11, 5);
        ctx.restore();
        caption(ctx, 'Looks fine…', 250, 850, 54, K.showP(s, tFine - 0.1, tBelong + 0.3) * (1 - out), { bg: '#fff', rot: -0.06 });
        caption(ctx, 'Not an everyday activity', 540, 850, 50, pop(s, tBelong + 0.1, 0.5) * (1 - A(s, c.d - 0.8, 0.4)), { bg: COL.red, color: '#fff', rot: 0.03 });
        // creator sweeping a magnifier over the card
        const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
          [0, { x: 860, y: 1930, s: 1.05, eye: 'normal', lid: 0.25, browL: -0.3, browR: -0.3, mouth: 'flat', lookX: -1, lookY: -1, turn: -0.4, hLx: -330, hLy: -400, handL: 'glass', hRx: 140, hRy: -60, handR: 'fist', seed: 1 }],
          [tExp + 0.4, { hLx: -250, hLy: -470 }],
          [tFine - 0.2, { hLx: -340, hLy: -420 }],
          [tFine + 0.4, { hLx: -230, hLy: -490, mouth: 'smile' }],
          [tBelong - 0.1, { eye: 'wide', mouth: 'o', mo: 0.4, mark: 'exclaim', markP: 0 }],
          [tBelong + 0.2, { markP: 1 }],
          [tBelong + 0.8, { eye: 'normal', lid: 0, mouth: 'smirk', mark: null, hLx: -150, hLy: -60, handL: 'fist', hRx: 200, hRy: -330, handR: 'thumb' }],
        ]);
        K.drawPerson(ctx, pose, K.PAL.creator, t);
      });
      K.topCaption(ctx, 'Experience catches this', K.showP(s, tExp - 0.2, c.d + 1), { size: 62, y: 300, bg: COL.sun });
      ctx.restore();
    }
  };

  // ================= 10. THE TEST =================
  const AUTHORS = [['bun', 210], ['long', 540], ['curly', 870]];
  SC.test = function (ctx, c) {
    const { s, t } = c;
    const tMaybe = c.at('Maybe'), tProved = c.at("I haven't proved"), tTest = c.at('The test would be'), tShow = c.at('show it to actual'), tSolve = c.at('and see if');
    const cam = K.camAt(s, [[0, { z: 1.1, y: 140 }], [tTest - 0.3, { z: 1.1, y: 140 }], [tTest + 0.5, { z: 1, y: 0 }], [c.d, { z: 1.03 }]]);
    K.room(ctx, cam, t, {});
    // creator
    const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
      [0, Object.assign({}, K.DESK_POSE, { hRx: 45, hRy: -300, handR: 'fist', lookX: 0.5, lookY: -1, mouth: 'flat', browL: 0.3, browR: 0.3, seed: 1, mark: 'dots', markP: 1 })],
      [tMaybe - 0.3, { mark: null }],
      [tMaybe + 0.1, { hLx: -270, hLy: -250, hRx: 270, hRy: -250, handL: 'open', handR: 'open', lookX: 1, lookY: 0, turn: 0.2, mouth: 'wavy', browL: 0.6, browR: 0.6, tilt: -0.08, squash: 0.97 }],
      [tProved - 0.1, { squash: 1 }],
      [tProved + 0.3, { hLx: -120, hLy: -80, hRx: 120, hRy: -80, handL: 'fist', handR: 'fist', lookX: 0, lookY: 0.3, turn: 0, tilt: 0, mouth: 'flat', browL: 0.2, browR: 0.2, sweat: 0.6 }],
      [tTest, { sweat: 0, lookY: 0.5, mouth: 'smile', browL: 0, browR: 0 }],
      [tShow - 0.6, { hRx: 60, hRy: -110, handR: 'open' }],
      [tShow + 0.2, { hRx: 200, hRy: -330, lookY: -1, lookX: 0.2, mouth: 'talk', mo: 0.3 }],
      [tSolve, { lookY: -1, mouth: 'flat', browL: 0.3, browR: 0.3, hRx: 45, hRy: -300, handR: 'fist' }],
    ]);
    K.layer(ctx, cam, 1, () => K.drawPerson(ctx, pose, K.PAL.creator, t));
    K.deskFront(ctx, cam, t, { pages: false, mug: true });
    // sample package on desk
    const pkgIn = E.back(inv(tTest + 0.3, tTest + 0.9, s));
    if (pkgIn > 0) {
      K.layer(ctx, cam, 1, () => K.drawFolder(ctx, 560, K.DESK_Y + 120, 300, 260, 0, { scale: pkgIn, label: (g, fh) => { text(g, 'SAMPLE', 0, 130 - fh / 2, 44, {}); K.drawAnimal(g, 'fox', 0, 130 - fh / 2 + 70, 34, '#ffb070', 4); } }));
    }
    // authors in panels, receiving the package
    const panelsIn = A(s, tShow - 0.9, 0.6);
    if (panelsIn > 0) {
      AUTHORS.forEach(([pal, x], i) => {
        const pin = E.back(inv(tShow - 0.9 + i * 0.12, tShow - 0.4 + i * 0.12, s));
        ctx.save(); ctx.translate(x, 640); ctx.scale(pin, pin);
        rr(ctx, -150, -210, 300, 400, 30); fillStroke(ctx, ['#e9ffe9', '#e3f4ff', '#ffe6ee'][i], COL.ink, 7);
        ctx.save(); rr(ctx, -150, -210, 300, 400, 30); ctx.clip();
        const arrive = tShow + 0.4 + i * 0.25;
        const got = A(s, arrive, 0.3);
        const ap = K.poseAt(s, K.PERSON_DEFAULTS, [
          [0, { x: 0, y: 300, s: 0.55, eye: 'normal', mouth: 'flat', hLx: -140, hLy: -40, hRx: 140, hRy: -40, handL: 'fist', handR: 'fist', seed: 5 + i }],
          [arrive, {}],
          [arrive + 0.4, { lookY: 1, lookX: 0.2 * (i - 1), hLx: -80, hLy: -150, hRx: 80, hRy: -150, handL: 'open', handR: 'open' }],
          [tSolve + 0.2 + i * 0.3, { mark: 'dots', markP: 1, mouth: i === 1 ? 'flat' : 'o', mo: 0.1, browL: 0.25, browR: 0.25, tilt: (i - 1) * 0.08 }],
        ]);
        K.drawPerson(ctx, ap, K.PAL[pal], t);
        if (got > 0) K.drawFolder(ctx, 0, 190, 150, 110, 0, { scale: got, rot: 0.05 });
        ctx.restore();
        text(ctx, 'KDP author', 0, -165, 34, { color: COL.greyDk });
        ctx.restore();
        // paper plane flight from desk to panel
        const fp = inv(tShow + i * 0.25 - 0.4, tShow + 0.4 + i * 0.25, s);
        if (fp > 0 && fp < 1) {
          const k = E.inOut(fp);
          const px = lerp(560, x, k), py = lerp(1500, 740, k) - Math.sin(k * Math.PI) * 260;
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(740 - 1500, x - 560) * 0.4 - 0.3);
          ctx.beginPath(); ctx.moveTo(50, 0); ctx.lineTo(-40, -30); ctx.lineTo(-20, 0); ctx.lineTo(-40, 30); ctx.closePath(); fillStroke(ctx, '#fff', COL.ink, 5);
          line(ctx, [50, 0, -20, 0], COL.ink, 4);
          ctx.restore();
        }
      });
    }
    // captions
    K.topCaption(ctx, 'A real service?', K.showP(s, 0.1, tMaybe - 0.2), { size: 66, y: 320, bg: '#fff' });
    K.topCaption(ctx, 'Maybe.', K.showP(s, tMaybe - 0.1, tProved - 0.1), { size: 80, y: 320, bg: COL.sun });
    K.topCaption(ctx, 'Not proven yet.', K.showP(s, tProved, tTest - 0.3), { size: 70, y: 320, bg: '#fff' });
    K.topCaption(ctx, 'Test: make a sample', K.showP(s, tTest, tShow - 0.9), { size: 62, y: 320, bg: COL.mint });
    K.topCaption(ctx, 'Show real KDP authors', K.showP(s, tShow - 0.2, tSolve - 0.1), { size: 60, y: 300, bg: COL.mint });
    K.topCaption(ctx, 'Does it solve a real problem?', K.showP(s, tSolve, c.d + 1), { size: 56, y: 300, bg: '#fff' });
  };

  // ================= 11. ENDING =================
  SC.end = function (ctx, c) {
    const { s, t } = c;
    const tPrompt = c.at('writing a prompt'), tHelped = c.at("It's helped me"), tQ = c.at('Now the question'), tWants = c.at('anyone wants');
    const cam = K.camAt(s, [[0, { z: 1.0 }], [tQ - 0.3, { z: 1.0 }], [tQ + 2.5, { z: 1.18, y: 120 }], [c.d, { z: 1.2, y: 130 }]], E.inOut);
    K.room(ctx, cam, t, { dusk: true, wall1: '#e8c7c9', wall2: '#b995b8' });
    const pose = K.poseAt(s, K.PERSON_DEFAULTS, [
      [0, Object.assign({}, K.DESK_POSE, { lookY: 0.6, lookX: 0.3, mouth: 'flat', seed: 1 })],
      [tPrompt - 0.3, { hRx: 250, hRy: -300, handR: 'open', lookX: 1, lookY: -0.4, turn: 0.3, browL: 0.3, browR: 0.3 }],
      [tHelped, { hRx: 120, hRy: -80, handR: 'fist', lookX: 0.3, lookY: 0.7, turn: 0, mouth: 'smile', browL: 0, browR: 0 }],
      [tHelped + 1.2, { hLx: -40, hLy: -110, handL: 'open', lookY: 0.8 }],
      [tQ, { lookY: 0.6 }],
      [tQ + 0.8, { lookX: 0, lookY: 0, mouth: 'flat', browL: 0.35, browR: 0.35, hLx: -120, hLy: -80, handL: 'fist', hRx: 45, hRy: -300, handR: 'fist', tilt: 0.05 }],
    ]);
    K.layer(ctx, cam, 1, () => K.drawPerson(ctx, pose, K.PAL.creator, t));
    K.deskFront(ctx, cam, t, { pages: false, lamp: 1, mug: false });
    K.layer(ctx, cam, 1, () => {
      K.drawFolder(ctx, 560, K.DESK_Y + 120, 340, 280, 0, { label: (g, fh) => { text(g, 'CONCEPT', 0, 140 - fh / 2, 40, {}); text(g, 'PACKAGE', 0, 140 - fh / 2 + 44, 40, {}); } });
      K.drawPip(ctx, { x: 890, y: 1330, s: 0.55, mood: 'calm', lookX: -1, lookY: 0.4, seed: 8 }, t);
    });
    // prompt bubble that doesn't print money
    const bp = K.showP(s, 0.2, tHelped - 0.3);
    if (bp > 0) {
      K.layer(ctx, cam, 1, () => K.bubble(ctx, 760, 760, 420, 150, 690, 950, bp, { draw: (g) => text(g, 'prompt → ???', 0, 0, 50, { color: COL.greyDk }) }));
    }
    K.topCaption(ctx, 'No money from a prompt.', K.showP(s, 0.3, tHelped - 0.3), { size: 60, y: 320, bg: '#fff' });
    K.topCaption(ctx, 'A service idea\nfrom work I know', K.showP(s, tHelped + 0.2, tQ - 0.3), { size: 60, y: 330, bg: COL.sun });
    // final question card
    const qp = pop(s, tQ + 0.4, 0.7);
    if (qp > 0) {
      ctx.save(); ctx.globalAlpha = clamp(qp * 1.5) * 0.35; ctx.fillStyle = COL.plum; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.translate(W / 2, 560 + Math.sin(t * 1.5) * 6); ctx.rotate(-0.02); ctx.scale(qp, qp);
      ctx.save(); ctx.translate(12, 16); rr(ctx, -470, -250, 940, 500, 50); ctx.fillStyle = 'rgba(20,10,40,0.35)'; ctx.fill(); ctx.restore();
      rr(ctx, -470, -250, 940, 500, 50); fillStroke(ctx, COL.paper, COL.ink, 10);
      text(ctx, 'Would a KDP author', 0, -110, 78, { color: COL.ink });
      text(ctx, 'pay for this?', 0, 10, 110, { color: COL.coral, outline: COL.ink, outlineWidth: 12 });
      // unresolved: blinking cursor-ish dots
      for (let i = 0; i < 3; i++) { const on = (Math.floor(t * 2) % 4) > i; circle(ctx, -40 + i * 40, 150, 12); ctx.fillStyle = on ? COL.ink : '#d9d2e6'; ctx.fill(); }
      ctx.restore();
    }
  };
})();
