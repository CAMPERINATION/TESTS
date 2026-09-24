// Props: coloring-page animals, activity objects, page cards, desk/room sets.
(function () {
  'use strict';
  const K = window.KDP;
  const { W, H, COL, clamp, lerp, E, rr, fillStroke, circle, ellipse, line, star, text, rng } = K;

  // ---------- animals (coloring-book line art) ----------
  // Draws an animal face centered at (x, y), head radius s. fill: colour or null for line art.
  function drawAnimal(ctx, kind, x, y, s, fill, lw) {
    const f = fill || '#fff';
    lw = lw || Math.max(2.5, s * 0.08);
    const st = (fc = f) => fillStroke(ctx, fc, COL.ink, lw);
    const inner = fill ? 'rgba(255,255,255,0.55)' : '#fff';
    ctx.save(); ctx.translate(x, y);
    if (kind === 'hedgehog') {
      ctx.beginPath();
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 0.95 + (i / n) * Math.PI * 1.1;
        const r = i % 2 ? s * 1.05 : s * 1.45;
        const px = Math.cos(a) * r, py = Math.sin(a) * r + s * 0.05;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); st(fill ? '#b98a5e' : '#fff');
    }
    if (kind === 'cat' || kind === 'fox') {
      const tip = kind === 'fox' ? [1.05, 1.3] : [0.85, 1.25];
      for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sd * 0.25 * s, -0.8 * s); ctx.lineTo(sd * tip[0] * s, -tip[1] * s); ctx.lineTo(sd * 0.92 * s, -0.25 * s); ctx.closePath(); st();
        ctx.beginPath(); ctx.moveTo(sd * 0.45 * s, -0.75 * s); ctx.lineTo(sd * (tip[0] - 0.12) * s, -(tip[1] - 0.2) * s); ctx.lineTo(sd * 0.8 * s, -0.45 * s); ctx.closePath(); fillStroke(ctx, kind === 'fox' ? inner : '#ffd6de', COL.ink, lw * 0.6);
      }
    }
    if (kind === 'rabbit') {
      for (const sd of [-1, 1]) {
        ellipse(ctx, sd * 0.38 * s, -1.35 * s, 0.24 * s, 0.68 * s, sd * 0.12); st();
        ellipse(ctx, sd * 0.38 * s, -1.3 * s, 0.1 * s, 0.45 * s, sd * 0.12); fillStroke(ctx, '#ffd6de', COL.ink, lw * 0.5);
      }
    }
    if (kind === 'bear' || kind === 'mouse') {
      const r = kind === 'mouse' ? 0.5 : 0.33, d = kind === 'mouse' ? 0.85 : 0.72;
      for (const sd of [-1, 1]) { circle(ctx, sd * d * s, -d * s, r * s); st(); circle(ctx, sd * d * s, -d * s, r * 0.55 * s); fillStroke(ctx, kind === 'mouse' ? '#ffd6de' : inner, COL.ink, lw * 0.6); }
    }
    if (kind === 'dog') {
      for (const sd of [-1, 1]) { ellipse(ctx, sd * 0.95 * s, 0.05 * s, 0.3 * s, 0.62 * s, -sd * 0.35); st(fill ? '#a0703f' : '#fff'); }
    }
    if (kind === 'owl') {
      ctx.beginPath(); ctx.moveTo(-0.95 * s, 0.1 * s);
      ctx.lineTo(-0.9 * s, -1.05 * s); ctx.lineTo(-0.45 * s, -0.8 * s); ctx.quadraticCurveTo(0, -0.95 * s, 0.45 * s, -0.8 * s);
      ctx.lineTo(0.9 * s, -1.05 * s); ctx.lineTo(0.95 * s, 0.1 * s);
      ctx.bezierCurveTo(0.95 * s, 0.9 * s, -0.95 * s, 0.9 * s, -0.95 * s, 0.1 * s); ctx.closePath(); st();
    } else {
      // head
      ctx.beginPath();
      if (kind === 'fox') {
        ctx.moveTo(-s, -0.2 * s); ctx.bezierCurveTo(-s, -1.05 * s, s, -1.05 * s, s, -0.2 * s);
        ctx.lineTo(1.1 * s, 0.35 * s); ctx.lineTo(0.45 * s, 0.5 * s); ctx.quadraticCurveTo(0, 0.95 * s, -0.45 * s, 0.5 * s); ctx.lineTo(-1.1 * s, 0.35 * s); ctx.closePath();
      } else ctx.ellipse(0, 0, s, s * 0.92, 0, 0, Math.PI * 2);
      st();
      if (kind === 'fox') { ctx.beginPath(); ctx.moveTo(-0.8 * s, 0.25 * s); ctx.quadraticCurveTo(0, 0.1 * s, 0.8 * s, 0.25 * s); ctx.lineTo(0.4 * s, 0.45 * s); ctx.quadraticCurveTo(0, 0.85 * s, -0.4 * s, 0.45 * s); ctx.closePath(); fillStroke(ctx, inner, COL.ink, lw * 0.6); }
      if (kind === 'bear' || kind === 'dog') { ellipse(ctx, 0, 0.35 * s, 0.42 * s, 0.32 * s); fillStroke(ctx, inner, COL.ink, lw * 0.7); }
    }
    // eyes
    const ey = kind === 'owl' ? -0.1 * s : -0.08 * s, ex = kind === 'owl' ? 0.4 * s : 0.36 * s;
    if (kind === 'owl') { for (const sd of [-1, 1]) { circle(ctx, sd * ex, ey, 0.33 * s); fillStroke(ctx, '#fff', COL.ink, lw * 0.8); } }
    for (const sd of [-1, 1]) { circle(ctx, sd * ex, ey, (kind === 'owl' ? 0.15 : 0.1) * s); ctx.fillStyle = COL.ink; ctx.fill(); circle(ctx, sd * ex - 0.03 * s, ey - 0.04 * s, 0.035 * s); ctx.fillStyle = '#fff'; ctx.fill(); }
    // nose / beak
    if (kind === 'owl') { ctx.beginPath(); ctx.moveTo(-0.12 * s, 0.18 * s); ctx.lineTo(0.12 * s, 0.18 * s); ctx.lineTo(0, 0.42 * s); ctx.closePath(); fillStroke(ctx, COL.sun, COL.ink, lw * 0.6); }
    else {
      const ny = kind === 'bear' || kind === 'dog' ? 0.25 * s : 0.2 * s;
      ellipse(ctx, 0, ny, 0.11 * s, 0.075 * s); ctx.fillStyle = COL.ink; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.16 * s, ny + 0.14 * s); ctx.quadraticCurveTo(-0.08 * s, ny + 0.22 * s, 0, ny + 0.1 * s); ctx.quadraticCurveTo(0.08 * s, ny + 0.22 * s, 0.16 * s, ny + 0.14 * s);
      ctx.strokeStyle = COL.ink; ctx.lineWidth = lw * 0.6; ctx.stroke();
      if (kind === 'cat' || kind === 'mouse' || kind === 'rabbit') {
        for (const sd of [-1, 1]) for (const k of [-1, 1]) line(ctx, [sd * 0.3 * s, ny + 0.05 * s + k * 0.05 * s, sd * 0.85 * s, ny + k * 0.12 * s], COL.ink, lw * 0.45);
      }
    }
    ctx.restore();
  }

  // ---------- activity props ----------
  function drawProp(ctx, kind, x, y, s, fill) {
    const lw = Math.max(2.5, s * 0.09);
    const st = (fc) => fillStroke(ctx, fill ? fc : '#fff', COL.ink, lw);
    ctx.save(); ctx.translate(x, y);
    switch (kind) {
      case 'mug':
        rr(ctx, -0.5 * s, -0.4 * s, 0.9 * s, 0.9 * s, 0.12 * s); st(COL.coral);
        ctx.beginPath(); ctx.arc(0.45 * s, 0.05 * s, 0.25 * s, -1.3, 1.3); ctx.strokeStyle = COL.ink; ctx.lineWidth = lw; ctx.stroke();
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 0.22 * s - 0.05 * s, -0.55 * s); ctx.quadraticCurveTo(i * 0.22 * s + 0.1 * s, -0.75 * s, i * 0.22 * s - 0.05 * s, -0.95 * s); ctx.lineWidth = lw * 0.7; ctx.stroke(); }
        break;
      case 'book':
        ctx.beginPath(); ctx.moveTo(0, -0.3 * s); ctx.quadraticCurveTo(-0.45 * s, -0.5 * s, -0.9 * s, -0.35 * s); ctx.lineTo(-0.9 * s, 0.45 * s); ctx.quadraticCurveTo(-0.45 * s, 0.3 * s, 0, 0.5 * s); ctx.closePath(); st(COL.sky);
        ctx.beginPath(); ctx.moveTo(0, -0.3 * s); ctx.quadraticCurveTo(0.45 * s, -0.5 * s, 0.9 * s, -0.35 * s); ctx.lineTo(0.9 * s, 0.45 * s); ctx.quadraticCurveTo(0.45 * s, 0.3 * s, 0, 0.5 * s); ctx.closePath(); st(COL.sky);
        for (let i = 0; i < 3; i++) { line(ctx, [-0.75 * s, -0.15 * s + i * 0.18 * s, -0.15 * s, -0.08 * s + i * 0.18 * s], COL.ink, lw * 0.4); line(ctx, [0.15 * s, -0.08 * s + i * 0.18 * s, 0.75 * s, -0.15 * s + i * 0.18 * s], COL.ink, lw * 0.4); }
        break;
      case 'can':
        ctx.beginPath(); ctx.moveTo(-0.45 * s, -0.3 * s); ctx.lineTo(0.35 * s, -0.3 * s); ctx.lineTo(0.45 * s, 0.5 * s); ctx.lineTo(-0.55 * s, 0.5 * s); ctx.closePath(); st(COL.teal);
        ctx.beginPath(); ctx.moveTo(0.35 * s, -0.05 * s); ctx.lineTo(0.95 * s, -0.5 * s); ctx.lineTo(1.05 * s, -0.4 * s); ctx.lineTo(0.42 * s, 0.15 * s); ctx.closePath(); st(COL.teal);
        ctx.beginPath(); ctx.arc(-0.05 * s, -0.3 * s, 0.35 * s, Math.PI, 0); ctx.strokeStyle = COL.ink; ctx.lineWidth = lw; ctx.stroke();
        for (let i = 0; i < 3; i++) { circle(ctx, 1.15 * s + i * 0.08 * s, -0.25 * s + i * 0.25 * s, 0.06 * s); fillStroke(ctx, fill ? COL.sky : '#fff', COL.ink, lw * 0.5); }
        break;
      case 'pan':
        line(ctx, [0.4 * s, 0, 1.15 * s, -0.1 * s], COL.ink, lw * 3.2); line(ctx, [0.4 * s, 0, 1.15 * s, -0.1 * s], fill ? '#8b5e3c' : '#fff', lw * 1.6);
        ellipse(ctx, -0.1 * s, 0, 0.62 * s, 0.4 * s); st('#6b6b7a');
        ellipse(ctx, -0.15 * s, -0.02 * s, 0.3 * s, 0.2 * s); fillStroke(ctx, '#fff', COL.ink, lw * 0.6);
        circle(ctx, -0.12 * s, -0.03 * s, 0.1 * s); fillStroke(ctx, COL.sun, COL.ink, lw * 0.5);
        break;
      case 'basket':
        ctx.beginPath(); ctx.moveTo(-0.7 * s, -0.2 * s); ctx.lineTo(0.7 * s, -0.2 * s); ctx.lineTo(0.55 * s, 0.5 * s); ctx.lineTo(-0.55 * s, 0.5 * s); ctx.closePath(); st('#d9a066');
        for (let i = -2; i <= 2; i++) line(ctx, [i * 0.22 * s, -0.2 * s, i * 0.18 * s, 0.5 * s], COL.ink, lw * 0.4);
        ctx.beginPath(); ctx.moveTo(-0.5 * s, -0.2 * s); ctx.quadraticCurveTo(-0.3 * s, -0.6 * s, 0, -0.35 * s); ctx.quadraticCurveTo(0.3 * s, -0.65 * s, 0.55 * s, -0.2 * s); st(COL.sky);
        break;
      case 'yarn':
        circle(ctx, 0, 0.1 * s, 0.45 * s); st(COL.coral);
        ctx.save(); circle(ctx, 0, 0.1 * s, 0.45 * s); ctx.clip();
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * 0.15 * s, 0.1 * s, 0.2 * s, 0.6 * s, 0.6, 0, Math.PI * 2); ctx.strokeStyle = COL.ink; ctx.lineWidth = lw * 0.4; ctx.stroke(); }
        ctx.restore();
        line(ctx, [-0.6 * s, -0.7 * s, 0.2 * s, 0.35 * s], COL.ink, lw * 1.4); line(ctx, [0.6 * s, -0.7 * s, -0.2 * s, 0.35 * s], COL.ink, lw * 1.4);
        circle(ctx, -0.6 * s, -0.7 * s, 0.08 * s); fillStroke(ctx, fill ? COL.sun : '#fff', COL.ink, lw * 0.5); circle(ctx, 0.6 * s, -0.7 * s, 0.08 * s); fillStroke(ctx, fill ? COL.sun : '#fff', COL.ink, lw * 0.5);
        break;
      case 'dish':
        ellipse(ctx, 0, 0.2 * s, 0.75 * s, 0.25 * s); st('#dfe8f5');
        ellipse(ctx, 0, 0.15 * s, 0.45 * s, 0.13 * s); fillStroke(ctx, fill ? '#fff' : '#fff', COL.ink, lw * 0.5);
        for (const [bx, by, br] of [[-0.35, -0.2, 0.16], [0.05, -0.4, 0.22], [0.4, -0.15, 0.13], [0.2, -0.75, 0.1]]) { circle(ctx, bx * s, by * s, br * s); fillStroke(ctx, fill ? '#e9f7ff' : '#fff', COL.ink, lw * 0.5); }
        break;
      case 'rocket':
        ctx.save(); ctx.rotate(0.6);
        ctx.beginPath(); ctx.moveTo(0, -0.8 * s); ctx.quadraticCurveTo(0.35 * s, -0.3 * s, 0.25 * s, 0.4 * s); ctx.lineTo(-0.25 * s, 0.4 * s); ctx.quadraticCurveTo(-0.35 * s, -0.3 * s, 0, -0.8 * s); st('#e9eef7');
        circle(ctx, 0, -0.2 * s, 0.12 * s); fillStroke(ctx, COL.sky, COL.ink, lw * 0.6);
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 0.25 * s, 0.1 * s); ctx.lineTo(sd * 0.5 * s, 0.55 * s); ctx.lineTo(sd * 0.22 * s, 0.4 * s); ctx.closePath(); st(COL.coral); }
        ctx.beginPath(); ctx.moveTo(-0.15 * s, 0.42 * s); ctx.quadraticCurveTo(0, 0.95 * s, 0.15 * s, 0.42 * s); st(COL.sun);
        ctx.restore();
        break;
      case 'heart':
        ctx.beginPath(); ctx.moveTo(0, 0.45 * s); ctx.bezierCurveTo(-0.9 * s, -0.1 * s, -0.4 * s, -0.8 * s, 0, -0.3 * s); ctx.bezierCurveTo(0.4 * s, -0.8 * s, 0.9 * s, -0.1 * s, 0, 0.45 * s); st('#ff8fb0');
        break;
    }
    ctx.restore();
  }

  // ---------- page card (one planned coloring page) ----------
  // o: {animal, prop, label, fill, tilt, flip (0..1 scaleX), highlight, dim}
  function drawPageCard(ctx, x, y, w, h, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    if (o.sx != null) ctx.scale(o.sx, 1);
    if (o.scale != null) ctx.scale(o.scale, o.scale);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    // shadow
    ctx.save(); ctx.translate(8, 12); rr(ctx, -w / 2, -h / 2, w, h, 18); ctx.fillStyle = 'rgba(30,16,50,0.22)'; ctx.fill(); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, 18); fillStroke(ctx, o.bg || '#fff', COL.ink, 5);
    // folded corner
    ctx.beginPath(); ctx.moveTo(w / 2 - 40, -h / 2); ctx.lineTo(w / 2, -h / 2 + 40); ctx.lineTo(w / 2 - 40, -h / 2 + 40); ctx.closePath(); fillStroke(ctx, '#ece4f5', COL.ink, 4);
    const artY = o.label ? -h * 0.1 : 0;
    const as = Math.min(w, h) * (o.label ? 0.2 : 0.26);
    if (o.animal) drawAnimal(ctx, o.animal, o.prop ? -as * 0.55 : 0, artY, as, o.fill ? o.fill : null);
    if (o.prop) drawProp(ctx, o.prop, as * 1.05, artY + as * 0.45, as * 0.7, !!o.fill);
    if (o.label) {
      const fs = o.labelSize || Math.min(46, w * 0.11);
      text(ctx, o.label, 0, h / 2 - fs * 0.95, fs, { color: o.labelColor || COL.ink, weight: 600 });
    }
    if (o.dim) { rr(ctx, -w / 2, -h / 2, w, h, 18); ctx.fillStyle = `rgba(90,80,110,${0.45 * o.dim})`; ctx.fill(); }
    ctx.restore();
  }

  // scribbled "idea note" page for the messy pile
  function drawNote(ctx, x, y, w, h, rot, seed, o = {}) {
    const r = rng(seed);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const colors = ['#fff', '#fff6c9', '#e6f7ff', '#ffe8ee', '#effbe9'];
    ctx.save(); ctx.translate(6, 8); rr(ctx, -w / 2, -h / 2, w, h, 10); ctx.fillStyle = 'rgba(20,10,40,0.25)'; ctx.fill(); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, 10); fillStroke(ctx, colors[Math.floor(r() * colors.length)], COL.ink, 5);
    const kinds = ['cat', 'dog', 'rabbit', 'bear', 'fox', 'owl', 'mouse', 'hedgehog'];
    if (r() < 0.6) drawAnimal(ctx, kinds[Math.floor(r() * kinds.length)], (r() - 0.5) * w * 0.2, -h * 0.12, Math.min(w, h) * 0.2, null, 4);
    for (let i = 0; i < 3; i++) {
      const ly = h * 0.18 + i * h * 0.1, lw_ = w * (0.4 + r() * 0.35);
      ctx.beginPath(); ctx.moveTo(-lw_ / 2, ly);
      for (let k = 1; k <= 8; k++) ctx.lineTo(-lw_ / 2 + (k / 8) * lw_, ly + (r() - 0.5) * 8);
      ctx.strokeStyle = '#8a8399'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  }

  // sticky note with text
  function drawSticky(ctx, x, y, w, h, str, color, rot, p, size = 52) {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const sc = E.back(clamp(p));
    ctx.scale(sc, sc);
    ctx.save(); ctx.translate(8, 12); rr(ctx, -w / 2, -h / 2, w, h, 8); ctx.fillStyle = 'rgba(30,16,50,0.22)'; ctx.fill(); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, 8); fillStroke(ctx, color, COL.ink, 6);
    // tape
    ctx.save(); ctx.rotate(-0.05); rr(ctx, -55, -h / 2 - 18, 110, 36, 4); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill(); ctx.restore();
    const lines = str.split('\n');
    lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.15 + 8, size, { color: COL.ink }));
    ctx.restore();
  }

  // ---------- sets ----------
  function drawDesk(ctx, y, o = {}) {
    // desk top and front
    const top = y;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-50, top); ctx.lineTo(W + 50, top); ctx.lineTo(W + 50, top + 46); ctx.lineTo(-50, top + 46); ctx.closePath();
    fillStroke(ctx, o.top || '#c98b5a', COL.ink, 7);
    ctx.fillStyle = o.front || '#a86c42'; ctx.fillRect(-50, top + 46, W + 100, H);
    line(ctx, [-50, top + 46, W + 50, top + 46], COL.ink, 7);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 5; i++) line(ctx, [60 + i * 230, top + 16, 190 + i * 230, top + 16], '#fff', 6);
    ctx.restore();
  }

  function drawLaptop(ctx, x, y, s, screenFn) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // screen back
    rr(ctx, -260, -330, 520, 340, 24); fillStroke(ctx, '#d9d4e8', COL.ink, 7);
    rr(ctx, -236, -308, 472, 296, 12); fillStroke(ctx, '#1c2040', COL.ink, 5);
    if (screenFn) { ctx.save(); rr(ctx, -236, -308, 472, 296, 12); ctx.clip(); ctx.translate(-236, -308); screenFn(ctx, 472, 296); ctx.restore(); }
    // base
    ctx.beginPath(); ctx.moveTo(-300, 10); ctx.lineTo(300, 10); ctx.lineTo(330, 40); ctx.lineTo(-330, 40); ctx.closePath(); fillStroke(ctx, '#c4bdd8', COL.ink, 7);
    ctx.restore();
  }

  function drawMug(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rr(ctx, -45, -60, 90, 100, 16); fillStroke(ctx, COL.teal, COL.ink, 6);
    ctx.beginPath(); ctx.arc(48, -10, 24, -1.3, 1.3); ctx.strokeStyle = COL.ink; ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = COL.teal; ctx.lineWidth = 5; ctx.stroke();
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 2; i++) {
      const ph = t * 1.5 + i * 1.7;
      ctx.beginPath(); ctx.moveTo(-15 + i * 30, -75); ctx.bezierCurveTo(-30 + i * 30 + Math.sin(ph) * 10, -100, 0 + i * 30, -120, -15 + i * 30 + Math.sin(ph) * 8, -150);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  }

  function drawLamp(ctx, x, y, s, on = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (on > 0) {
      const g = ctx.createRadialGradient(40, -250, 10, 40, -150, 380);
      g.addColorStop(0, `rgba(255,230,150,${0.5 * on})`); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-20, -270); ctx.lineTo(320, 160); ctx.lineTo(-240, 160); ctx.closePath(); ctx.fill();
    }
    ellipse(ctx, 0, 0, 80, 20); fillStroke(ctx, COL.coral, COL.ink, 6);
    line(ctx, [0, -10, -30, -170, 20, -250], COL.ink, 16); line(ctx, [0, -10, -30, -170, 20, -250], COL.coralDk, 7);
    ctx.save(); ctx.translate(30, -255); ctx.rotate(0.5);
    ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(40, -30); ctx.lineTo(70, 40); ctx.lineTo(-70, 40); ctx.closePath(); fillStroke(ctx, COL.coral, COL.ink, 6);
    ctx.restore();
    ctx.restore();
  }

  // shelf of coloring books (years of work)
  function drawShelf(ctx, x, y, w, t, o = {}) {
    ctx.save(); ctx.translate(x, y);
    const r = rng(o.seed || 7);
    const colors = [COL.coral, COL.teal, COL.sun, COL.lilac, COL.sky, '#ff9bb3', COL.mint, '#f4a261'];
    const kinds = ['cat', 'fox', 'owl', 'bear', 'rabbit', 'dog', 'hedgehog', 'mouse'];
    let bx = 0, i = 0;
    while (bx < w - 60) {
      const bw = 58 + r() * 30, bh = 170 + r() * 60;
      const lift = o.pop ? o.pop(i) : 0;
      ctx.save(); ctx.translate(bx + bw / 2, -lift * 60);
      const lean = i % 7 === 6 ? 0.12 : 0;
      ctx.rotate(lean);
      rr(ctx, -bw / 2, -bh, bw, bh, 8); fillStroke(ctx, colors[i % colors.length], COL.ink, 6);
      line(ctx, [-bw / 2 + 10, -bh + 30, bw / 2 - 10, -bh + 30], 'rgba(43,33,64,0.6)', 5);
      line(ctx, [-bw / 2 + 10, -30, bw / 2 - 10, -30], 'rgba(43,33,64,0.6)', 5);
      drawAnimal(ctx, kinds[i % kinds.length], 0, -bh / 2, bw * 0.28, '#fff', 3);
      ctx.restore();
      bx += bw + 6; i++;
    }
    rr(ctx, -20, 0, w + 40, 34, 8); fillStroke(ctx, '#9b6a45', COL.ink, 6);
    ctx.restore();
  }

  function drawWindow(ctx, x, y, w, h, t, o = {}) {
    ctx.save(); ctx.translate(x, y);
    rr(ctx, -12, -12, w + 24, h + 24, 22); fillStroke(ctx, '#fff4e4', COL.ink, 7);
    ctx.save(); rr(ctx, 0, 0, w, h, 14); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.dusk ? '#6b5bb8' : '#8fd3ff'); g.addColorStop(1, o.dusk ? '#ffb27a' : '#dff4ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 3; i++) {
      const cx = ((t * 12 + i * 160) % (w + 200)) - 100, cy = 50 + i * 60;
      ctx.fillStyle = o.dusk ? '#ffd1c1' : '#fff';
      circle(ctx, cx, cy, 26); ctx.fill(); circle(ctx, cx + 30, cy - 10, 32); ctx.fill(); circle(ctx, cx + 62, cy, 24); ctx.fill();
    }
    ctx.restore();
    line(ctx, [w / 2, 0, w / 2, h], COL.ink, 7); line(ctx, [0, h / 2, w, h / 2], COL.ink, 7);
    rr(ctx, 0, 0, w, h, 14); ctx.strokeStyle = COL.ink; ctx.lineWidth = 7; ctx.stroke();
    ctx.restore();
  }

  function drawPlant(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin(t * 1.3 + i) * 0.04;
      ctx.save(); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(45, -90, 0, -170); ctx.quadraticCurveTo(-45, -90, 0, 0);
      fillStroke(ctx, i % 2 ? '#4cc38a' : '#34a871', COL.ink, 6);
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-70, -10); ctx.lineTo(70, -10); ctx.lineTo(55, 110); ctx.lineTo(-55, 110); ctx.closePath(); fillStroke(ctx, COL.coral, COL.ink, 6);
    ctx.restore();
  }

  function wallBg(ctx, c1, c2, dots = '#00000010') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800);
    ctx.fillStyle = dots;
    for (let y = -300; y < H + 300; y += 60) for (let x = -300 + ((y / 60) % 2) * 30; x < W + 300; x += 60) { circle(ctx, x, y, 4); ctx.fill(); }
  }

  // Speech / thought bubble
  function bubble(ctx, x, y, w, h, tailX, tailY, p, o = {}) {
    if (p <= 0) return;
    ctx.save();
    const sc = E.back(clamp(p));
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(p * 2);
    if (o.thought) {
      const r = rng(o.seed || 3);
      ctx.beginPath();
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = Math.cos(a) * w / 2, py = Math.sin(a) * h / 2;
        const a2 = ((i + 0.5) / n) * Math.PI * 2;
        const bulge = 1.2 + (o.fuzzy ? Math.sin(K.lastT * 6 + i) * 0.06 : 0);
        if (i === 0) ctx.moveTo(px, py); else ctx.quadraticCurveTo(Math.cos(a2 - Math.PI / n) * w / 2 * bulge, Math.sin(a2 - Math.PI / n) * h / 2 * bulge, px, py);
      }
      ctx.closePath(); fillStroke(ctx, o.bg || '#fff', COL.ink, 6);
      const tx = tailX - x, ty = tailY - y;
      for (let i = 1; i <= 2; i++) { circle(ctx, tx * (0.55 + i * 0.18) , ty * (0.55 + i * 0.18), 22 - i * 7); fillStroke(ctx, o.bg || '#fff', COL.ink, 5); }
    } else {
      rr(ctx, -w / 2, -h / 2, w, h, Math.min(60, h / 2)); fillStroke(ctx, o.bg || '#fff', COL.ink, 6);
      const tx = tailX - x, ty = tailY - y;
      ctx.beginPath(); ctx.moveTo(-26, h / 2 - 4); ctx.lineTo(tx, ty); ctx.lineTo(26, h / 2 - 4); ctx.closePath(); fillStroke(ctx, o.bg || '#fff', COL.ink, 6);
      rr(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.min(58, h / 2)); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    }
    if (o.draw) o.draw(ctx);
    ctx.restore();
  }

  // Folder that holds the concept package
  function drawFolder(ctx, x, y, w, h, open, o = {}) {
    ctx.save(); ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    ctx.rotate(o.rot || 0);
    // back
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2 + 40); ctx.lineTo(-w / 2, h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(w / 2, -h / 2 + 40);
    ctx.lineTo(-w / 2 + 250, -h / 2 + 40); ctx.lineTo(-w / 2 + 220, -h / 2); ctx.lineTo(-w / 2 + 20, -h / 2); ctx.closePath();
    fillStroke(ctx, o.back || '#e0962a', COL.ink, 7);
    if (o.contents) o.contents(ctx);
    // front flap (rotates down when open)
    const fh = h - 60;
    ctx.save();
    ctx.translate(0, h / 2);
    ctx.scale(1, lerp(1, -0.25, open));
    rr(ctx, -w / 2, -fh, w, fh, 16); fillStroke(ctx, o.front || COL.sun, COL.ink, 7);
    ctx.restore();
    if (open < 0.5 && o.label) o.label(ctx, fh);
    ctx.restore();
  }

  Object.assign(K, { drawAnimal, drawProp, drawPageCard, drawNote, drawSticky, drawDesk, drawLaptop, drawMug, drawLamp, drawShelf, drawWindow, drawPlant, wallBg, bubble, drawFolder });
})();
