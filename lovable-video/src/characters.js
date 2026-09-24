// Original characters: the creator (and fictional authors, via palettes) and "Pip", the AI helper.
(function () {
  'use strict';
  const K = window.KDP;
  const { COL, clamp, lerp, E, rr, fillStroke, circle, ellipse, line, star, text } = K;

  const PAL = {
    baker: { hair: '#4a2c1f', hairHi: '#7a4a33', top: '#f4c2c9', topSh: '#e39aa7', skin: '#f7d3b5', skinSh: '#e6b08f', iris: '#7a4a33', style: 'bun', apron: true, scarf: true },
    customer: { hair: '#2e2a3a', hairHi: '#55506a', top: '#a9c4a0', topSh: '#88a880', skin: '#fde0c8', skinSh: '#eab896', iris: '#3d6a8a', style: 'messy' },
    creator: { hair: '#2d3a5c', hairHi: '#5a74b0', top: '#ffb938', topSh: '#e8922b', skin: '#ffe1c9', skinSh: '#f2bb99', iris: '#27a095', style: 'messy', pencil: true },
    bun: { hair: '#8a4b2a', hairHi: '#b8703f', top: '#6fcf97', topSh: '#4cae78', skin: '#ffe4cf', skinSh: '#f0bf9f', iris: '#7a5230', style: 'bun' },
    long: { hair: '#231d38', hairHi: '#4b4072', top: '#8fc9ff', topSh: '#62a6e6', skin: '#f7d2b4', skinSh: '#e2ad8b', iris: '#5b4fd0', style: 'long' },
    curly: { hair: '#d9774a', hairHi: '#f0a070', top: '#ff9bb3', topSh: '#e8718f', skin: '#c98d65', skinSh: '#ae7250', iris: '#3a8a4c', style: 'curly' },
  };

  const PERSON_DEFAULTS = {
    x: 540, y: 1500, s: 1, lean: 0, bob: 0, squash: 1, tilt: 0, turn: 0,
    lookX: 0, lookY: 0, eye: 'normal', open: 1, lid: 0,
    browL: 0, browR: 0, browUp: 0, mouth: 'smile', mo: 0.5,
    blush: 0, sweat: 0, mark: null, markP: 1,
    hLx: -150, hLy: -20, hRx: 150, hRy: -20, handL: 'open', handR: 'open',
    blink: true, seed: 0,
  };

  // blink amount 0..1 (1 = closed) from time
  function blinkAt(t, seed) {
    const period = 3.3 + (seed % 3) * 0.7;
    const ph = (t + seed * 1.37) % period;
    if (ph < 0.07) return ph / 0.07;
    if (ph < 0.15) return 1 - (ph - 0.07) / 0.08;
    return 0;
  }

  function ik(sx, sy, tx, ty, l1, l2, side) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const maxd = l1 + l2 - 0.5;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    d = Math.max(d, 25);
    const a = Math.atan2(dy, dx);
    const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const al = Math.acos(c);
    const e1 = [sx + Math.cos(a + al) * l1, sy + Math.sin(a + al) * l1];
    const e2 = [sx + Math.cos(a - al) * l1, sy + Math.sin(a - al) * l1];
    // prefer elbow pointing outward and down
    const score = (e) => side * e[0] + 0.35 * e[1];
    const e = score(e1) > score(e2) ? e1 : e2;
    return { ex: e[0], ey: e[1], wx: sx + dx, wy: sy + dy };
  }

  function drawHand(ctx, x, y, ang, type, pal, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang - Math.PI / 2); // local +y along forearm direction
    const skin = pal.skin;
    if (type === 'pen' || type === 'redpen') {
      // pencil held, pointing forward-down
      ctx.save(); ctx.rotate(0.5);
      rr(ctx, -9, 0, 18, 110, 5); fillStroke(ctx, type === 'redpen' ? COL.red : COL.sun, COL.ink, 5);
      ctx.beginPath(); ctx.moveTo(-9, 108); ctx.lineTo(0, 135); ctx.lineTo(9, 108); ctx.closePath(); fillStroke(ctx, '#ffe2b8', COL.ink, 5);
      ctx.beginPath(); ctx.moveTo(-3.5, 126); ctx.lineTo(0, 135); ctx.lineTo(3.5, 126); ctx.closePath(); ctx.fillStyle = type === 'redpen' ? COL.red : COL.ink; ctx.fill();
      ctx.restore();
    }
    if (type === 'glass') {
      ctx.save(); ctx.rotate(0.3);
      line(ctx, [0, 0, 0, 70], COL.ink, 22); line(ctx, [0, 0, 0, 70], '#8b5e3c', 13);
      circle(ctx, 0, 125, 58); ctx.fillStyle = 'rgba(190,235,255,0.35)'; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 12; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 125, 40, -2.6, -1.8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.stroke();
      ctx.restore();
    }
    // palm
    ellipse(ctx, 0, 14, 29, 31); fillStroke(ctx, skin, COL.ink, 5);
    if (type === 'point') {
      rr(ctx, -8, 26, 16, 52, 8); fillStroke(ctx, skin, COL.ink, 5);
    } else if (type === 'thumb') {
      rr(ctx, -30, -20, 16, 40, 8); fillStroke(ctx, skin, COL.ink, 5);
    } else if (type === 'open' || type === 'wave') {
      // splayed fingers
      for (let i = -1.5; i <= 1.5; i++) {
        ctx.save(); ctx.rotate(i * 0.28);
        rr(ctx, -7, 30, 14, 30, 7); fillStroke(ctx, skin, COL.ink, 4.5);
        ctx.restore();
      }
      ellipse(ctx, 0, 14, 25, 27); ctx.fillStyle = skin; ctx.fill();
      ctx.save(); ctx.rotate(-1.2); rr(ctx, -7, 18, 14, 28, 7); fillStroke(ctx, skin, COL.ink, 4.5); ctx.restore();
    } else {
      // fist: knuckle line
      ctx.beginPath(); ctx.moveTo(-14, 30); ctx.quadraticCurveTo(0, 38, 14, 30); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  }

  function drawArm(ctx, side, p, pal) {
    const sx = side * 128, sy = -250;
    const tx = side < 0 ? p.hLx : p.hRx, ty = side < 0 ? p.hLy : p.hRy;
    const { ex, ey, wx, wy } = ik(sx, sy, tx, ty, 135, 128, side);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 70; ctx.stroke();
    ctx.strokeStyle = pal.top; ctx.lineWidth = 58; ctx.stroke();
    // shade stripe
    ctx.beginPath(); ctx.moveTo(lerp(sx, ex, 0.2) + side * 12, lerp(sy, ey, 0.2)); ctx.lineTo(ex + side * 12, ey);
    ctx.strokeStyle = pal.topSh; ctx.lineWidth = 16; ctx.stroke();
    // cuff
    const ang = Math.atan2(wy - ey, wx - ex);
    const cx = wx - Math.cos(ang) * 8, cy = wy - Math.sin(ang) * 8;
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * 10, cy - Math.sin(ang) * 10); ctx.lineTo(cx, cy);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 72; ctx.stroke();
    ctx.strokeStyle = pal.topSh; ctx.lineWidth = 60; ctx.stroke();
    ctx.restore();
    drawHand(ctx, wx, wy, ang, side < 0 ? p.handL : p.handR, pal);
  }

  function drawEye(ctx, x, y, side, p, pal, t) {
    const bl = p.blink ? blinkAt(t, p.seed) : 0;
    let open = p.open * (1 - bl);
    const style = p.eye;
    ctx.save();
    ctx.translate(x, y);
    if (style === 'happy' || (open < 0.12 && style !== 'closed')) {
      ctx.beginPath();
      if (style === 'happy') { ctx.moveTo(-26, 8); ctx.quadraticCurveTo(0, -26, 26, 8); }
      else { ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, 12, 26, 0); }
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
      return;
    }
    if (style === 'closed') {
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, 14, 26, 0);
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore(); return;
    }
    const rx = 30, ry = 40 * open;
    // eye white
    ctx.save();
    ellipse(ctx, 0, 0, rx, ry); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.clip();
    const wide = style === 'wide';
    const ir = wide ? 16 : 23;
    const ix = p.lookX * 10, iy = p.lookY * 10 + (wide ? 0 : 5);
    ellipse(ctx, ix, iy, ir, ir * 1.25); ctx.fillStyle = pal.iris; ctx.fill();
    // iris gradient band
    ellipse(ctx, ix, iy + ir * 0.45, ir * 0.85, ir * 0.6); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
    ellipse(ctx, ix, iy, ir * 0.5, ir * 0.66); ctx.fillStyle = '#1a1030'; ctx.fill();
    if (style === 'sparkle') {
      circle(ctx, ix - ir * 0.3, iy - ir * 0.4, ir * 0.36); ctx.fillStyle = '#fff'; ctx.fill();
      star(ctx, ix + ir * 0.35, iy + ir * 0.35, ir * 0.42 * (0.8 + 0.2 * Math.sin(t * 9)), 4, 0.35, 0); ctx.fill();
    } else {
      circle(ctx, ix - ir * 0.35, iy - ir * 0.45, ir * 0.32); ctx.fillStyle = '#fff'; ctx.fill();
      circle(ctx, ix + ir * 0.35, iy + ir * 0.45, ir * 0.15); ctx.fill();
    }
    // flat upper lid (deadpan / focused)
    if (p.lid > 0) {
      ctx.fillStyle = pal.skin;
      ctx.fillRect(-rx - 5, -ry - 5, rx * 2 + 10, (ry * 2 + 5) * p.lid * 0.5 + 5);
    }
    ctx.restore();
    // lash line
    ctx.beginPath();
    if (p.lid > 0) {
      const ly = -ry + (ry * 2) * p.lid * 0.5;
      ctx.moveTo(-rx - 4, ly); ctx.lineTo(rx + 4, ly);
    } else {
      ctx.ellipse(0, 0, rx + 2, ry + 2, 0, Math.PI * 1.08, Math.PI * 1.92);
    }
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
    // outer flick
    ctx.beginPath(); ctx.moveTo(side * (rx - 2), -ry * 0.55 + (p.lid > 0 ? ry * p.lid : 0)); ctx.lineTo(side * (rx + 12), -ry * 0.8 + (p.lid > 0 ? ry * p.lid : 0));
    ctx.stroke();
    // lower line
    ctx.beginPath(); ctx.ellipse(0, 0, rx - 4, ry + 1, 0, Math.PI * 0.3, Math.PI * 0.7);
    ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
  }

  function drawMouth(ctx, x, y, p) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const m = p.mouth, o = clamp(p.mo);
    const mouthFill = (path) => { path(); ctx.fillStyle = '#7a2a3a'; ctx.fill(); ctx.stroke(); };
    if (m === 'smile') {
      ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(0, 16, 22, -4); ctx.stroke();
    } else if (m === 'grin') {
      mouthFill(() => { ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(0, -4, 30, -8); ctx.quadraticCurveTo(24, 24 + o * 14, 0, 26 + o * 14); ctx.quadraticCurveTo(-24, 24 + o * 14, -30, -8); ctx.closePath(); });
      ctx.save(); ctx.clip(); ellipse(ctx, 0, 26 + o * 14, 18, 12); ctx.fillStyle = '#ff8e9a'; ctx.fill(); ctx.restore();
    } else if (m === 'o') {
      mouthFill(() => ellipse(ctx, 0, 4, 10 + o * 6, 12 + o * 12));
    } else if (m === 'talk') {
      mouthFill(() => { ctx.beginPath(); ctx.moveTo(-18, -2); ctx.quadraticCurveTo(0, -6, 18, -2); ctx.quadraticCurveTo(12, 6 + o * 22, 0, 8 + o * 22); ctx.quadraticCurveTo(-12, 6 + o * 22, -18, -2); ctx.closePath(); });
    } else if (m === 'flat') {
      ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(16, 2); ctx.stroke();
    } else if (m === 'frown') {
      ctx.beginPath(); ctx.moveTo(-18, 8); ctx.quadraticCurveTo(0, -8, 18, 8); ctx.stroke();
    } else if (m === 'wavy') {
      ctx.beginPath(); ctx.moveTo(-24, 2);
      for (let i = 1; i <= 6; i++) ctx.lineTo(-24 + i * 8, i % 2 ? -5 : 5);
      ctx.stroke();
    } else if (m === 'smirk') {
      ctx.beginPath(); ctx.moveTo(-18, 4); ctx.quadraticCurveTo(4, 10, 22, -6); ctx.stroke();
    } else if (m === 'determined') {
      mouthFill(() => { ctx.beginPath(); ctx.moveTo(-22, -2); ctx.lineTo(22, -2); ctx.quadraticCurveTo(10, 16, 0, 16); ctx.quadraticCurveTo(-10, 16, -22, -2); ctx.closePath(); });
      ctx.fillStyle = '#fff'; ctx.fillRect(-18, -1, 36, 6);
    }
    ctx.restore();
  }

  function drawHairBack(ctx, pal, t, p) {
    ctx.save();
    ellipse(ctx, 0, -40, 128, 124); fillStroke(ctx, pal.hair, COL.ink, 7);
    if (pal.style === 'bun') {
      circle(ctx, 0, -175, 52); fillStroke(ctx, pal.hair, COL.ink, 7);
      ctx.beginPath(); ctx.arc(0, -175, 34, -2.5, -1.2); ctx.strokeStyle = pal.hairHi; ctx.lineWidth = 8; ctx.stroke();
    }
    if (pal.style === 'curly') {
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI * 1.05 + (i / 12) * Math.PI * 1.1;
        circle(ctx, Math.cos(a) * 120, -40 + Math.sin(a) * 118, 42); fillStroke(ctx, pal.hair, COL.ink, 6);
      }
      ellipse(ctx, 0, -40, 125, 120); ctx.fillStyle = pal.hair; ctx.fill();
    }
    ctx.restore();
  }

  function drawHairFront(ctx, pal, t, p) {
    ctx.save();
    ctx.fillStyle = pal.hair; ctx.strokeStyle = COL.ink; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    if (pal.style === 'messy') {
      ctx.beginPath();
      ctx.moveTo(-128, 10);
      ctx.bezierCurveTo(-140, -110, -60, -170, 10, -165);
      ctx.bezierCurveTo(90, -165, 145, -100, 128, 15);
      ctx.lineTo(108, -20); ctx.lineTo(96, 12); ctx.lineTo(72, -38); ctx.lineTo(40, -8); ctx.lineTo(28, -48);
      ctx.lineTo(-8, -18); ctx.lineTo(-22, -52); ctx.lineTo(-58, -12); ctx.lineTo(-70, -44); ctx.lineTo(-104, 2);
      ctx.lineTo(-104, -20); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // ahoge (springy strand) with secondary motion
      const w = Math.sin(t * 5.3) * 0.12 + p.tilt * -1.2 + p.bob * -0.01;
      ctx.save(); ctx.translate(10, -160); ctx.rotate(w);
      ctx.beginPath(); ctx.moveTo(-10, 5); ctx.bezierCurveTo(-5, -50, 40, -70, 50, -40); ctx.bezierCurveTo(30, -55, 10, -35, 10, 5); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
      // highlight
      ctx.beginPath(); ctx.arc(-10, -60, 85, -2.5, -1.7); ctx.strokeStyle = pal.hairHi; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    } else if (pal.style === 'bun' || pal.style === 'long') {
      ctx.beginPath();
      ctx.moveTo(-128, 20);
      ctx.bezierCurveTo(-140, -110, -60, -168, 0, -166);
      ctx.bezierCurveTo(60, -168, 140, -110, 128, 20);
      ctx.bezierCurveTo(110, -30, 60, -50, 20, -40);
      ctx.bezierCurveTo(0, -60, -30, -40, -40, -30);
      ctx.bezierCurveTo(-80, -40, -115, -20, -128, 20);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-20, -60, 85, -2.4, -1.7); ctx.strokeStyle = pal.hairHi; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    } else if (pal.style === 'curly') {
      for (let i = 0; i < 7; i++) {
        const x = -100 + i * 33, y = -70 - Math.sin((i / 6) * Math.PI) * 45;
        circle(ctx, x, y, 36); ctx.fill(); ctx.stroke();
      }
      for (let i = 0; i < 7; i++) { circle(ctx, -100 + i * 33, -70 - Math.sin((i / 6) * Math.PI) * 45, 30); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawMark(ctx, p, t) {
    if (!p.mark || p.markP <= 0) return;
    const s = E.back(clamp(p.markP));
    ctx.save();
    if (p.mark === 'question') {
      ctx.translate(150, -170); ctx.scale(s, s); ctx.rotate(0.2 + Math.sin(t * 3) * 0.08);
      text(ctx, '?', 0, 0, 110, { color: COL.coral, outline: COL.ink, outlineWidth: 12 });
    } else if (p.mark === 'exclaim') {
      ctx.translate(150, -180); ctx.scale(s, s); ctx.rotate(0.15);
      text(ctx, '!', 0, 0, 120, { color: COL.sun, outline: COL.ink, outlineWidth: 12 });
    } else if (p.mark === 'sparkle') {
      for (let i = 0; i < 3; i++) {
        const a = -2.4 + i * 0.7, r = 190 + Math.sin(t * 4 + i) * 8;
        star(ctx, Math.cos(a) * r, -40 + Math.sin(a) * r, (18 + i * 6) * s * (0.8 + 0.2 * Math.sin(t * 6 + i)), 4, 0.3);
        ctx.fillStyle = COL.sun; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke();
      }
    } else if (p.mark === 'dots') {
      for (let i = 0; i < 3; i++) {
        const ph = clamp((t * 2.5 - i * 0.3) % 1.6);
        circle(ctx, 120 + i * 34, -175 - Math.sin(ph * Math.PI) * 10, 11 * s); ctx.fillStyle = COL.ink; ctx.fill();
      }
    } else if (p.mark === 'vein') {
      ctx.translate(95, -110); ctx.scale(s, s);
      ctx.strokeStyle = COL.red; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate((i * Math.PI) / 2 + 0.785);
        ctx.beginPath(); ctx.moveTo(6, -14); ctx.quadraticCurveTo(14, -14, 14, -6); ctx.stroke(); ctx.restore();
      }
    } else if (p.mark === 'lines') {
      // shock lines
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = -2.3 + i * 0.35;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 160, -30 + Math.sin(a) * 160); ctx.lineTo(Math.cos(a) * (160 + 50 * s), -30 + Math.sin(a) * (160 + 50 * s)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Draw a person. p: pose (merged with defaults), pal: palette, t: global seconds.
  function drawPerson(ctx, pose, pal, t) {
    const p = Object.assign({}, PERSON_DEFAULTS, pose);
    pal = pal || PAL.creator;
    const breath = Math.sin(t * 2.1 + p.seed) * 3;
    ctx.save();
    ctx.translate(p.x, p.y + p.bob);
    ctx.scale(p.s, p.s * p.squash);
    ctx.rotate(p.lean);

    if (pal.style === 'long') {
      ctx.save(); ctx.translate(0, -420 + breath); ctx.rotate(p.tilt * 0.4);
      ctx.beginPath(); ctx.moveTo(-122, 0); ctx.bezierCurveTo(-150, 140, -140, 230, -110, 300); ctx.lineTo(110, 300); ctx.bezierCurveTo(140, 230, 150, 140, 122, 0); ctx.closePath();
      fillStroke(ctx, pal.hair, COL.ink, 7); ctx.restore();
    }

    // torso (hoodie)
    ctx.save();
    ctx.translate(0, breath * 0.4);
    ctx.beginPath();
    ctx.moveTo(-118, -292);
    ctx.quadraticCurveTo(-172, -282, -176, -200);
    ctx.lineTo(-165, 40); ctx.lineTo(165, 40);
    ctx.lineTo(176, -200);
    ctx.quadraticCurveTo(172, -282, 118, -292);
    ctx.closePath();
    fillStroke(ctx, pal.top, COL.ink, 7);
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(60, -300); ctx.quadraticCurveTo(150, -150, 120, 60); ctx.lineTo(200, 60); ctx.lineTo(200, -300); ctx.closePath();
    ctx.fillStyle = pal.topSh; ctx.fill();
    ctx.restore();
    // hood collar
    ctx.beginPath(); ctx.moveTo(-105, -292); ctx.quadraticCurveTo(0, -205, 105, -292); ctx.quadraticCurveTo(0, -250, -105, -292);
    fillStroke(ctx, pal.topSh, COL.ink, 6);
    if (pal === PAL.creator || pal.style === 'messy') {
      line(ctx, [-30, -262, -34, -170], COL.ink, 5); line(ctx, [30, -262, 34, -170], COL.ink, 5);
      circle(ctx, -34, -165, 8); fillStroke(ctx, '#fff', COL.ink, 4); circle(ctx, 34, -165, 8); fillStroke(ctx, '#fff', COL.ink, 4);
    }
    ctx.restore();

    if (pal.apron) {
      ctx.save(); ctx.translate(0, breath * 0.4);
      ctx.beginPath(); ctx.moveTo(-80, -205); ctx.lineTo(80, -205); ctx.quadraticCurveTo(95, -120, 120, -60); ctx.lineTo(125, 45); ctx.lineTo(-125, 45); ctx.lineTo(-120, -60); ctx.quadraticCurveTo(-95, -120, -80, -205); ctx.closePath();
      fillStroke(ctx, '#fff8ee', COL.ink, 6);
      line(ctx, [-70, -205, -40, -285], COL.ink, 12); line(ctx, [-70, -205, -40, -285], '#fff8ee', 5);
      line(ctx, [70, -205, 40, -285], COL.ink, 12); line(ctx, [70, -205, 40, -285], '#fff8ee', 5);
      rr(ctx, -55, -90, 110, 60, 12); fillStroke(ctx, '#fbeedd', COL.ink, 5);
      circle(ctx, 0, -150, 16); fillStroke(ctx, '#e39aa7', COL.ink, 4);
      ctx.restore();
    }
    // neck
    rr(ctx, -30, -330, 60, 60, 18); fillStroke(ctx, pal.skinSh, COL.ink, 6);

    // head
    ctx.save();
    ctx.translate(0, -310 + breath);
    ctx.rotate(p.tilt);
    ctx.translate(0, -110);
    drawHairBack(ctx, pal, t, p);
    // ears
    const fx = p.turn * 20;
    ellipse(ctx, -104 + fx * 0.3, 10, 18, 26); fillStroke(ctx, pal.skin, COL.ink, 6);
    ellipse(ctx, 104 + fx * 0.3, 10, 18, 26); fillStroke(ctx, pal.skin, COL.ink, 6);
    // face
    ctx.beginPath();
    ctx.moveTo(-104, -20);
    ctx.bezierCurveTo(-104, -140, 104, -140, 104, -20);
    ctx.bezierCurveTo(104, 50, 62 + fx * 0.3, 104, fx * 0.4, 112);
    ctx.bezierCurveTo(-62 + fx * 0.3, 104, -104, 50, -104, -20);
    ctx.closePath();
    fillStroke(ctx, pal.skin, COL.ink, 7);
    // cheek shade
    ctx.save(); ctx.clip();
    ellipse(ctx, 110, 10, 40, 110); ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fill();
    ctx.restore();
    // blush
    if (p.blush > 0) {
      ctx.save(); ctx.globalAlpha *= p.blush;
      ellipse(ctx, -60 + fx, 50, 24, 12); ctx.fillStyle = '#ff8fa0'; ctx.fill();
      ellipse(ctx, 60 + fx, 50, 24, 12); ctx.fill();
      ctx.strokeStyle = '#e8607a'; ctx.lineWidth = 3;
      for (const sx of [-60, 60]) for (let i = -1; i <= 1; i++) line(ctx, [sx + fx + i * 12 - 4, 56, sx + fx + i * 12 + 4, 44], '#e8607a', 3);
      ctx.restore();
    }
    // eyes
    drawEye(ctx, -46 + fx, 12, -1, p, pal, t);
    drawEye(ctx, 46 + fx, 12, 1, p, pal, t);
    // brows
    const by = -40 - p.browUp * 14;
    for (const side of [-1, 1]) {
      const b = side < 0 ? p.browL : p.browR;
      const ex = side * 46 + fx;
      const inner = [ex - side * 24, by - b * 14], outer = [ex + side * 26, by + b * 6];
      line(ctx, [inner[0], inner[1], outer[0], outer[1] - 4], COL.ink, 9);
    }
    // nose
    line(ctx, [fx * 1.1 + 2, 48, fx * 1.1 - 4, 56], COL.ink, 4);
    drawMouth(ctx, fx * 1.15, 78, p);
    drawHairFront(ctx, pal, t, p);
    if (pal.scarf) {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-128, -40); ctx.bezierCurveTo(-120, -150, 120, -150, 128, -40); ctx.bezierCurveTo(110, -95, -110, -95, -128, -40); ctx.closePath();
      fillStroke(ctx, '#9c3d5c', COL.ink, 6);
      for (let i = -3; i <= 3; i++) { circle(ctx, i * 32, -98 + Math.abs(i) * 6, 5); ctx.fillStyle = '#f4c2c9'; ctx.fill(); }
      ctx.translate(118, -70); ctx.rotate(0.5 + Math.sin(t * 3) * 0.08);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, -10, 55, 20); ctx.quadraticCurveTo(30, 10, 0, 18); ctx.closePath(); fillStroke(ctx, '#9c3d5c', COL.ink, 5);
      ctx.restore();
    }
    if (pal.pencil) {
      ctx.save(); ctx.translate(112, -40); ctx.rotate(-0.9);
      rr(ctx, -8, -55, 16, 100, 4); fillStroke(ctx, COL.coral, COL.ink, 5);
      ctx.beginPath(); ctx.moveTo(-8, 45); ctx.lineTo(0, 66); ctx.lineTo(8, 45); ctx.closePath(); fillStroke(ctx, '#ffe2b8', COL.ink, 5);
      ctx.restore();
    }
    // sweat drop
    if (p.sweat > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(p.sweat * 2);
      const sy = -70 + p.sweat * 30;
      ctx.translate(118, sy);
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(14, -6, 22, 10, 0, 18); ctx.bezierCurveTo(-22, 10, -14, -6, 0, -30);
      fillStroke(ctx, '#9fdcff', COL.ink, 5);
      ellipse(ctx, -5, 4, 4, 7); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
    }
    drawMark(ctx, p, t);
    ctx.restore();

    // arms in front
    drawArm(ctx, -1, p, pal);
    drawArm(ctx, 1, p, pal);
    ctx.restore();
  }

  // ---------------- Pip, the AI helper ----------------
  const PIP_DEFAULTS = { x: 540, y: 800, s: 1, mood: 'eager', lookX: 0, lookY: 0, armL: 0.4, armR: 0.4, squash: 1, rot: 0, glow: 0, seed: 3, screenText: null };
  function drawPip(ctx, st, t) {
    const p = Object.assign({}, PIP_DEFAULTS, st);
    const bob = Math.sin(t * 3 + p.seed) * 12;
    ctx.save();
    // hover shadow
    K.shadow(ctx, p.x, p.y + 190 * p.s, 110 * p.s * (1 - bob / 200), 18 * p.s, 0.18);
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.rot + Math.sin(t * 1.7 + p.seed) * 0.03);
    ctx.scale(p.s / Math.sqrt(p.squash), p.s * p.squash);

    // antenna with springy bulb
    const sway = Math.sin(t * 4.2 + p.seed) * 0.18 - p.rot * 1.5;
    ctx.save(); ctx.translate(0, -100);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.sin(sway) * 20, -40, Math.sin(sway) * 40, -70);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 7; ctx.stroke();
    circle(ctx, Math.sin(sway) * 40, -78, 17); fillStroke(ctx, p.mood === 'confused' ? COL.sun : COL.coral, COL.ink, 6);
    circle(ctx, Math.sin(sway) * 40 - 5, -83, 5); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();

    // arms (noodles)
    for (const side of [-1, 1]) {
      const a = side < 0 ? p.armL : p.armR;
      const sx = side * 118, sy = 20;
      const ex = sx + side * Math.cos(a) * 70, ey = sy - Math.sin(a) * 70;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + side * 40, sy + 10, ex, ey);
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = COL.lilacDk; ctx.lineWidth = 10; ctx.stroke();
      circle(ctx, ex, ey, 20); fillStroke(ctx, COL.lilac, COL.ink, 6);
    }
    // body
    rr(ctx, -125, -105, 250, 215, 70); fillStroke(ctx, COL.lilac, COL.ink, 8);
    ctx.save(); rr(ctx, -125, -105, 250, 215, 70); ctx.clip();
    ellipse(ctx, 90, 80, 80, 90); ctx.fillStyle = COL.lilacDk; ctx.globalAlpha = 0.4; ctx.fill(); ctx.restore();
    // screen
    rr(ctx, -95, -75, 190, 145, 45); fillStroke(ctx, '#1c2040', COL.ink, 6);
    if (p.glow > 0) { ctx.save(); ctx.globalAlpha *= p.glow; rr(ctx, -95, -75, 190, 145, 45); ctx.fillStyle = '#2e3d7a'; ctx.fill(); ctx.restore(); }
    // screen glare
    ctx.beginPath(); ctx.moveTo(-70, -60); ctx.lineTo(-40, -60); ctx.lineTo(-75, -10); ctx.lineTo(-80, -30); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();

    const eyeC = '#7ff5ea';
    const ex = p.lookX * 12, ey = p.lookY * 8;
    ctx.fillStyle = eyeC; ctx.strokeStyle = eyeC; ctx.lineCap = 'round'; ctx.lineWidth = 9;
    const blink = blinkAt(t, p.seed + 5);
    const m = p.mood;
    if (p.screenText) {
      text(ctx, p.screenText, 0, -2, 64, { color: eyeC });
    } else if (m === 'eager') {
      for (const s of [-1, 1]) { star(ctx, s * 40 + ex, -12 + ey, 26 + Math.sin(t * 8) * 3, 4, 0.36, 0); ctx.fill(); }
      ctx.beginPath(); ctx.arc(ex, 30 + ey, 18, 0.1, Math.PI - 0.1); ctx.stroke();
    } else if (m === 'happy' || m === 'proud') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 40 + ex, -4 + ey, 18, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(ex, 22 + ey, 16, 0.2, Math.PI - 0.2); ctx.stroke();
      if (m === 'proud') { ctx.globalAlpha = 0.5; ellipse(ctx, -62, 26, 14, 7); ctx.fillStyle = '#ff8fb0'; ctx.fill(); ellipse(ctx, 62, 26, 14, 7); ctx.fill(); ctx.globalAlpha = 1; }
    } else if (m === 'confused') {
      ellipse(ctx, -40 + ex, -10 + ey, 14, 20 * (1 - blink)); ctx.fill();
      ellipse(ctx, 40 + ex, -6 + ey, 9, 12 * (1 - blink)); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18 + ex, 32 + ey); for (let i = 1; i <= 4; i++) ctx.lineTo(-18 + i * 9 + ex, 32 + (i % 2 ? -6 : 6) + ey); ctx.stroke();
    } else if (m === 'think') {
      for (const s of [-1, 1]) { ellipse(ctx, s * 38 + 8, -18, 13, 18 * (1 - blink)); ctx.fill(); }
      for (let i = 0; i < 3; i++) { circle(ctx, -24 + i * 24, 32, 6 + 3 * Math.max(0, Math.sin(t * 6 - i))); ctx.fill(); }
    } else { // calm / listen
      for (const s of [-1, 1]) { ellipse(ctx, s * 40 + ex, -8 + ey, 14, 21 * (1 - blink) + 1); ctx.fill(); }
      ctx.beginPath(); ctx.arc(ex, 26 + ey, 12, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    ctx.restore();
  }

  Object.assign(K, { PAL, PERSON_DEFAULTS, drawPerson, drawPip, blinkAt });
})();
