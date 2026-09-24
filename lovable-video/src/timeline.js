// Scene order, phrase → time lookup, transitions, captions and sound cues.
(function () {
  'use strict';
  const K = window.KDP;
  const { W, H, COL, clamp, lerp, E } = K;

  const TAIL = 3.2;   // hold the final card after the last word
  const WIPE = 0.45;
  const LEAD = 0.15;

  const SCENE_STARTS = [
    ['open', null],
    ['build', 'I asked Lovable'],
    ['page', 'The first thing that appeared'],
    ['tension', 'A nice-looking page'],
    ['form', 'So I asked for a request form'],
    ['dash', 'That gives the baker'],
    ['lesson', "And that's the part"],
    ['honest', 'Lovable turned that idea'],
    ['end', 'A good prompt'],
  ];

  const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
  let TM = null, SCENES = [];

  function setTiming(timing) {
    const words = timing.words.map((w) => ({ w: w.w, n: norm(w.w), t0: w.t0, t1: w.t1 }));
    const last = words[words.length - 1].t1;
    TM = { words, duration: timing.duration, total: last + TAIL, cache: new Map() };
    SCENES = SCENE_STARTS.map(([id, ph]) => ({ id, start: ph ? Math.max(0, find(ph).t0 - LEAD) : 0 }));
    SCENES.forEach((s, i) => { s.end = i + 1 < SCENES.length ? SCENES[i + 1].start : TM.total; });
    K.buildCaptions(timing.words);
  }

  function find(phrase, from = 0) {
    const key = phrase + '@' + from.toFixed(2);
    if (TM.cache.has(key)) return TM.cache.get(key);
    const toks = phrase.split(/[\s—]+/).map(norm).filter(Boolean);
    const ws = TM.words;
    let res = null;
    for (let i = 0; i < ws.length && !res; i++) {
      if (ws[i].t0 < from - 0.6) continue;
      if (toks.every((tk, j) => ws[i + j] && ws[i + j].n === tk)) res = { t0: ws[i].t0, t1: ws[i + toks.length - 1].t1 };
    }
    if (!res) { console.warn('phrase not found:', phrase); res = { t0: from, t1: from + 1 }; }
    TM.cache.set(key, res);
    return res;
  }

  function sceneCtx(sc, t) {
    return {
      t, s: t - sc.start, d: sc.end - sc.start, start: sc.start,
      at: (ph) => find(ph, sc.start).t0 - sc.start,
      end: (ph) => find(ph, sc.start).t1 - sc.start,
    };
  }
  function drawScene(ctx, sc, t) { ctx.save(); K.SCENES[sc.id](ctx, sceneCtx(sc, t)); ctx.restore(); }

  function render(ctx, t) {
    K.lastT = t;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COL.cream; ctx.fillRect(0, 0, W, H);
    let i = SCENES.findIndex((s) => t >= s.start && t < s.end);
    if (i < 0) i = t < 0 ? 0 : SCENES.length - 1;
    const sc = SCENES[i], into = t - sc.start;
    K.captionY = 1200; K.captionsOff = false;
    if (i > 0 && into < WIPE) {
      const p = E.inOut(into / WIPE);
      drawScene(ctx, SCENES[i - 1], t);
      K.captionY = 1200; K.captionsOff = false; // the incoming scene sets caption placement
      const r = lerp(0, Math.hypot(W, H) * 0.6, p);
      ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H * 0.45, r, 0, Math.PI * 2); ctx.clip();
      drawScene(ctx, sc, t);
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H * 0.45, r, 0, Math.PI * 2);
      ctx.strokeStyle = COL.pink; ctx.lineWidth = 26 * (1 - p) + 4; ctx.stroke(); ctx.restore();
    } else {
      drawScene(ctx, sc, t);
    }
    K.drawCaptions(ctx, t);
    ctx.restore();
  }

  // Sound cues: [time, type, gain]. Built from the same phrase timings as the visuals.
  function cues() {
    const out = [];
    const f = (ph, from = 0) => find(ph, from).t0;
    SCENES.slice(1).forEach((s) => out.push([s.start, 'whoosh', 0.5]));
    const add = (t, type, g = 1) => out.push([t, type, g]);
    // opening messages + split
    add(0.15, 'pop'); add(0.5, 'pop', 0.9); add(0.85, 'pop', 0.8); add(f('more than just') - 0.1, 'card', 0.8);
    // tension bubbles
    const t3 = f('three separate'); add(t3 - 0.1, 'pop'); add(f('separate messages') + 0.25, 'pop', 0.9); add(f('messages just') , 'pop', 0.9);
    // form chips + gather
    for (const ph of ["collect the customer's", 'the date they', 'the size', 'the design', 'any dietary']) add(f(ph, 30) + 0.05, 'tick', 0.7);
    add(f('in one place') - 0.4, 'card', 0.9);
    // lesson cards + icons
    add(f("Don't only describe"), 'card', 0.7); add(f('Describe what the business'), 'card', 0.7);
    for (const ph of ["Who's using it", 'What information do they need', 'What should happen after']) { add(f(ph) - 0.1, 'card', 0.8); add(f(ph) + 0.75, 'tick', 0.8); }
    // honest ending
    add(f('For a real business') + 0.1, 'card', 0.6);
    // final
    add(f('ask for a website') + 0.3, 'pop', 0.8); add(f('It explains the job') - 0.1, 'card', 0.9);
    return out.sort((a, b) => a[0] - b[0]);
  }

  Object.assign(K, { setTiming, find, render, cues, sceneAt: (t) => (SCENES.find((s) => t >= s.start && t < s.end) || SCENES[SCENES.length - 1]).id });
  Object.defineProperties(K, {
    scenes: { get: () => SCENES },
    total: { get: () => (TM ? TM.total : 0) },
    voDuration: { get: () => (TM ? TM.duration : 0) },
  });
})();
