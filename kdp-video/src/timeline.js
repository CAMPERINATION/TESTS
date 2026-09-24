// Timeline: word-timestamp lookup, scene sequencing, transitions, final frame render.
(function () {
  'use strict';
  const K = window.KDP;
  const { W, H, COL, clamp, lerp, E, inv } = K;

  const TAIL = 2.2;        // seconds of end card held after the voiceover finishes
  const WIPE = 0.5;        // transition length
  const LEAD = 0.2;        // visuals start slightly before the words

  // Scenes start at these phrases (see script.txt).
  const SCENE_STARTS = [
    ['hook', null],
    ['experience', 'So I decided'],
    ['service', 'I wanted to see'],
    ['prompt', 'I started with'],
    ['generic', 'The problem is'],
    ['brief', 'This time'],
    ['plan', 'Now the output'],
    ['package', 'From there'],
    ['value', 'And this is the part'],
    ['test', 'Could that become'],
    ['end', "So AI hasn't"],
  ];

  const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');

  let TM = null;
  function setTiming(timing, audioDuration) {
    const dur = audioDuration || timing.duration;
    const k = dur / timing.duration; // if a different-length recording is used, scale
    const words = timing.words.map((w) => ({ n: norm(w.w), t0: w.t0 * k, t1: w.t1 * k }));
    TM = { words, duration: dur, total: dur + TAIL, cache: new Map() };
    buildScenes();
  }

  // Find the phrase; search starts at `from` seconds. Returns {t0, t1}.
  function find(phrase, from = 0) {
    const key = phrase + '@' + from.toFixed(2);
    if (TM.cache.has(key)) return TM.cache.get(key);
    const toks = phrase.split(/[\s—]+/).map(norm).filter(Boolean);
    const ws = TM.words;
    let res = null;
    for (let i = 0; i < ws.length && !res; i++) {
      if (ws[i].t0 < from - 0.6) continue;
      let ok = true;
      for (let j = 0; j < toks.length; j++) {
        if (!ws[i + j] || ws[i + j].n !== toks[j]) { ok = false; break; }
      }
      if (ok) res = { t0: ws[i].t0, t1: ws[i + toks.length - 1].t1 };
    }
    if (!res) { console.warn('phrase not found:', phrase); res = { t0: from, t1: from + 1 }; }
    TM.cache.set(key, res);
    return res;
  }

  let SCENES = [];
  function buildScenes() {
    SCENES = SCENE_STARTS.map(([id, ph], i) => ({ id, start: ph ? Math.max(0, find(ph).t0 - LEAD) : 0 }));
    SCENES.forEach((s, i) => { s.end = i + 1 < SCENES.length ? SCENES[i + 1].start : TM.total; });
  }

  function sceneCtx(sc, t) {
    const from = sc.start;
    return {
      t, s: t - sc.start, d: sc.end - sc.start,
      at: (ph) => find(ph, from).t0 - sc.start,
      end: (ph) => find(ph, from).t1 - sc.start,
    };
  }

  function drawScene(ctx, sc, t) {
    const fn = K.SCENES[sc.id];
    ctx.save();
    fn(ctx, sceneCtx(sc, t));
    ctx.restore();
  }

  // Diagonal paper wipe between scenes.
  function wipeMask(ctx, p) {
    const e = E.inOut(p);
    const x = lerp(-700, W + 700, e);
    ctx.beginPath();
    ctx.moveTo(x - 400, -50); ctx.lineTo(x + 400, H + 50); ctx.lineTo(-1200, H + 50); ctx.lineTo(-1200, -50); ctx.closePath();
  }
  function wipeBand(ctx, p) {
    const e = E.inOut(p);
    const x = lerp(-700, W + 700, e);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 400 - 40, -50); ctx.lineTo(x + 400 - 40, H + 50); ctx.lineTo(x + 400 + 40, H + 50); ctx.lineTo(x - 400 + 40, -50); ctx.closePath();
    ctx.fillStyle = COL.sun; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 8; ctx.stroke();
    ctx.restore();
  }

  function render(ctx, t) {
    K.lastT = t;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COL.plum; ctx.fillRect(0, 0, W, H);
    let i = SCENES.findIndex((s) => t >= s.start && t < s.end);
    if (i < 0) i = t < 0 ? 0 : SCENES.length - 1;
    const sc = SCENES[i];
    const into = t - sc.start;
    if (i > 0 && into < WIPE) {
      drawScene(ctx, SCENES[i - 1], t);
      ctx.save(); wipeMask(ctx, into / WIPE); ctx.clip();
      drawScene(ctx, sc, t);
      ctx.restore();
      wipeBand(ctx, into / WIPE);
    } else {
      drawScene(ctx, sc, t);
    }
    // soft vignette
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(20,10,40,0)'); g.addColorStop(1, 'rgba(20,10,40,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  Object.assign(K, {
    setTiming, find, render,
    sceneAt: (t) => (SCENES.find((s) => t >= s.start && t < s.end) || SCENES[SCENES.length - 1]).id,
  });
  Object.defineProperties(K, {
    scenes: { get: () => SCENES },
    total: { get: () => (TM ? TM.total : 0) },
    voDuration: { get: () => (TM ? TM.duration : 0) },
  });
})();
