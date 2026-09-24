// Word-synced captions built from the script words (same wording as the voiceover).
(function () {
  'use strict';
  const K = window.KDP;
  const { COL, clamp, E, rr } = K;

  // Key phrases drawn in berry.
  const EMPHASIS = [
    'pretty homepage', 'something useful', 'the details the baker needs', 'the first test', 'three separate messages',
    'a request form', 'in one place', 'a clearer starting point', 'scattered messages', 'what the business needs to happen',
    "who's using it", 'what information do they need', 'what should happen', 'testing the form on mobile',
    'the job the website needs to do',
  ];
  const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');

  let CHUNKS = [];
  K.buildCaptions = function (words) {
    const emph = new Array(words.length).fill(false);
    const n = words.map((w) => norm(w.w));
    for (const ph of EMPHASIS) {
      const toks = ph.split(/\s+/).map(norm);
      for (let i = 0; i + toks.length <= n.length; i++) {
        if (toks.every((tk, j) => n[i + j] === tk)) for (let j = 0; j < toks.length; j++) emph[i + j] = true;
      }
    }
    CHUNKS = [];
    let cur = [];
    const flush = () => { if (cur.length) CHUNKS.push(cur); cur = []; };
    words.forEach((w, i) => {
      cur.push({ w: w.w.replace(/—/g, ''), t0: w.t0, t1: w.t1, e: emph[i] });
      const chars = cur.map((x) => x.w).join(' ').length;
      const punct = /[.,?!:;]["”]?$/.test(w.w);
      const next = words[i + 1];
      const gap = next ? next.t0 - w.t1 : 1;
      if (punct && (cur.length >= 3 || /[.?!:]/.test(w.w.slice(-1)))) flush();
      else if (cur.length >= 6 || chars > 30 || gap > 0.35) flush();
    });
    flush();
    CHUNKS.forEach((c, i) => {
      c.start = c[0].t0 - 0.08;
      const nextStart = CHUNKS[i + 1] ? CHUNKS[i + 1][0].t0 - 0.08 : Infinity;
      c.end = Math.min(nextStart, c[c.length - 1].t1 + 0.6);
    });
  };

  K.captionY = 1200;
  K.captionsOff = false;
  K.drawCaptions = function (ctx, t) {
    if (K.captionsOff) return;
    const c = CHUNKS.find((c) => t >= c.start && t < c.end);
    if (!c) return;
    const size = 60, gapW = 16, maxW = 940;
    // layout words into lines
    const ws = c.map((x) => ({ ...x, width: K.textWidth(ctx, x.w, size, 700) }));
    const lines = [[]]; let lw = 0;
    ws.forEach((x) => { if (lw + x.width > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(x); lw += x.width + gapW; });
    const lh = size * 1.22;
    const widths = lines.map((l) => l.reduce((a, x) => a + x.width, 0) + gapW * (l.length - 1));
    const bw = Math.max(...widths) + 64, bh = lh * lines.length + 34;
    const appear = E.out(clamp((t - c.start) / 0.18));
    const y = K.captionY;
    ctx.save();
    ctx.globalAlpha *= appear;
    ctx.translate(540, y + (1 - appear) * 14);
    rr(ctx, -bw / 2, -bh / 2, bw, bh, 30); ctx.fillStyle = 'rgba(58,36,25,0.94)'; ctx.fill();
    lines.forEach((l, li) => {
      let x = -widths[li] / 2;
      const ly = -bh / 2 + 17 + lh * (li + 0.5) + 2;
      l.forEach((wd) => {
        const spoken = t >= wd.t0 - 0.02;
        K.text(ctx, wd.w, x, ly, size, { align: 'left', color: wd.e ? '#ffb3c4' : '#fff8ee', alpha: spoken ? 1 : 0.45 });
        x += wd.width + gapW;
      });
    });
    ctx.restore();
  };
  K.captionChunks = () => CHUNKS;
})();
