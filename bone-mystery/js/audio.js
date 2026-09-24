/* =====================================================================
   audio.js — every sound is synthesized with the Web Audio API.
   The same functions drive live playback and the offline render.
   ===================================================================== */
'use strict';

const SFX = (() => {
  function noiseBuffer(ac) {
    if (ac._noise) return ac._noise;
    const b = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = b.getChannelData(0); const r = rng(4242);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    ac._noise = b; return b;
  }
  function env(ac, g, t, a, peak, dec, sus = 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dec);
  }
  function noise(ac, out, t, o) {
    const src = ac.createBufferSource(); src.buffer = noiseBuffer(ac);
    const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.dur || 0.2));
    const g = ac.createGain(); env(ac, g.gain ? g : g, t, o.a || 0.005, o.v || 0.3, o.dur || 0.2);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, hash(Math.floor(t * 1000)) * 0.5); src.stop(t + (o.a || 0.005) + (o.dur || 0.2) + 0.05);
  }
  function tone(ac, out, t, o) {
    const osc = ac.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.dur || 0.2));
    const g = ac.createGain(); env(ac, g, t, o.a || 0.005, o.v || 0.2, o.dur || 0.3);
    let node = osc;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + (o.a || 0.005) + (o.dur || 0.3) + 0.05);
  }
  const S = {
    tick: (ac, o, t, v = 1) => { noise(ac, o, t, { f: 3200, q: 4, v: 0.22 * v, dur: 0.035 }); tone(ac, o, t, { f: 1900, v: 0.05 * v, dur: 0.04 }); tone(ac, o, t, { f: 180, v: 0.08 * v, dur: 0.06 }); },
    tock: (ac, o, t, v = 1) => { noise(ac, o, t, { f: 2200, q: 4, v: 0.2 * v, dur: 0.04 }); tone(ac, o, t, { f: 140, v: 0.09 * v, dur: 0.07 }); },
    click: (ac, o, t, v = 1) => { noise(ac, o, t, { f: 1800, q: 3, v: 0.35 * v, dur: 0.02 }); noise(ac, o, t + 0.035, { f: 2600, q: 3, v: 0.2 * v, dur: 0.02 }); tone(ac, o, t, { f: 90, v: 0.1 * v, dur: 0.05 }); },
    step: (ac, o, t, v = 1) => { tone(ac, o, t, { f: 110, f2: 55, v: 0.18 * v, dur: 0.09 }); noise(ac, o, t, { type: 'lowpass', f: 500, v: 0.12 * v, dur: 0.06 }); },
    patter: (ac, o, t, v = 1) => { for (let i = 0; i < 4; i++) { tone(ac, o, t + i * 0.09, { f: 160, f2: 80, v: 0.08 * v, dur: 0.05 }); noise(ac, o, t + i * 0.09, { f: 900, q: 2, v: 0.06 * v, dur: 0.03 }); } },
    drawer: (ac, o, t, v = 1) => { noise(ac, o, t, { f: 600, f2: 1100, q: 2, a: 0.08, v: 0.16 * v, dur: 0.35 }); tone(ac, o, t, { f: 70, v: 0.07 * v, a: 0.05, dur: 0.35 }); noise(ac, o, t + 0.4, { f: 1500, q: 3, v: 0.12 * v, dur: 0.04 }); },
    slide: (ac, o, t, v = 1) => noise(ac, o, t, { type: 'lowpass', f: 1400, f2: 500, a: 0.04, v: 0.12 * v, dur: 0.35 }),
    whoosh: (ac, o, t, v = 1) => noise(ac, o, t, { f: 300, f2: 2400, q: 1.2, a: 0.08, v: 0.2 * v, dur: 0.32 }),
    whip: (ac, o, t, v = 1) => noise(ac, o, t, { f: 2600, f2: 400, q: 1.5, a: 0.02, v: 0.22 * v, dur: 0.22 }),
    impact: (ac, o, t, v = 1) => { tone(ac, o, t, { f: 90, f2: 40, v: 0.35 * v, dur: 0.35 }); noise(ac, o, t, { type: 'lowpass', f: 900, v: 0.25 * v, dur: 0.15 }); },
    hit: (ac, o, t, v = 1) => { tone(ac, o, t, { f: 220, f2: 110, v: 0.2 * v, dur: 0.12 }); noise(ac, o, t, { f: 1800, q: 1, v: 0.18 * v, dur: 0.06 }); },
    ping: (ac, o, t, v = 1) => { tone(ac, o, t, { f: 1318.5, v: 0.07 * v, a: 0.004, dur: 0.9 }); tone(ac, o, t, { f: 1975.5, v: 0.035 * v, a: 0.004, dur: 0.6 }); tone(ac, o, t + 0.005, { f: 2637, v: 0.015 * v, a: 0.004, dur: 0.4 }); },
    paper: (ac, o, t, v = 1) => { for (let i = 0; i < 3; i++) noise(ac, o, t + i * 0.05, { type: 'highpass', f: 2500 + i * 400, v: 0.08 * v, dur: 0.06 }); },
    marker: (ac, o, t, v = 1) => { noise(ac, o, t, { f: 3500, q: 2, a: 0.02, v: 0.1 * v, dur: 0.16 }); noise(ac, o, t + 0.2, { f: 3200, q: 2, a: 0.02, v: 0.1 * v, dur: 0.16 }); },
    stamp: (ac, o, t, v = 1) => { tone(ac, o, t, { f: 140, f2: 70, v: 0.22 * v, dur: 0.12 }); noise(ac, o, t, { type: 'lowpass', f: 1200, v: 0.15 * v, dur: 0.05 }); },
    close: (ac, o, t, v = 1) => { noise(ac, o, t, { type: 'highpass', f: 1800, v: 0.1 * v, a: 0.03, dur: 0.08 }); tone(ac, o, t + 0.08, { f: 120, f2: 60, v: 0.3 * v, dur: 0.18 }); noise(ac, o, t + 0.08, { type: 'lowpass', f: 700, v: 0.2 * v, dur: 0.08 }); },
    skrrt: (ac, o, t, v = 1) => { noise(ac, o, t, { f: 2600, f2: 700, q: 6, a: 0.02, v: 0.3 * v, dur: 0.5 }); tone(ac, o, t, { type: 'sawtooth', f: 520, f2: 260, v: 0.03 * v, dur: 0.45, lp: 1500 }); },
    thud: (ac, o, t, v = 1) => { tone(ac, o, t, { f: 70, f2: 38, v: 0.32 * v, dur: 0.3 }); },
    sting: (ac, o, t, v = 1) => { for (const f of [146.8, 174.6, 207.7]) tone(ac, o, t, { type: 'triangle', f, v: 0.05 * v, a: 0.01, dur: 1.4, lp: 900 }); },
    // --- music voices ---
    pluck: (ac, o, t, v = 1, p = {}) => tone(ac, o, t, { type: 'triangle', f: p.f, v: 0.09 * v, a: 0.004, dur: p.d || 0.35, lp: 1400 }),
    pad: (ac, o, t, v = 1, p = {}) => { for (const f of p.fs) tone(ac, o, t, { type: 'sine', f, v: 0.03 * v, a: 0.4, dur: p.d || 2, lp: 800 }); },
    bell: (ac, o, t, v = 1, p = {}) => { tone(ac, o, t, { f: p.f, v: 0.04 * v, a: 0.004, dur: 1.4 }); tone(ac, o, t, { f: p.f * 2.01, v: 0.012 * v, a: 0.004, dur: 0.8 }); },
  };
  return S;
})();

/* Build music cues for the given global time sections.
   Each section: {from, to, bpm, kind: 'mystery'|'chase'|'drone'|'resolve'} */
function buildMusic(sections) {
  const out = [];
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
  for (const s of sections) {
    const beat = 60 / s.bpm;
    if (s.kind === 'mystery') {
      const line = [50, 53, 57, 56, 55, 53, 52, 49]; // D F A G# G F E C#  (walking minor line)
      let i = 0;
      for (let t = s.from; t < s.to - 0.05; t += beat, i++) {
        out.push([t, 'pluck', s.v || 0.9, { f: N(line[i % 8] - 12), d: 0.4 }]);
        if (i % 4 === 2) out.push([t + beat / 2, 'pluck', 0.4, { f: N(line[(i + 2) % 8]), d: 0.25 }]);
      }
      for (let t = s.from; t < s.to - 0.5; t += beat * 8) out.push([t, 'pad', 0.9, { fs: [N(50), N(53), N(57)], d: Math.min(beat * 8, s.to - t) }]);
    } else if (s.kind === 'chase') {
      const line = [50, 50, 53, 50, 55, 50, 56, 55];
      let i = 0;
      for (let t = s.from; t < s.to - 0.05; t += beat / 2, i++) out.push([t, 'pluck', i % 2 ? 0.55 : 0.95, { f: N(line[i % 8] - 12), d: 0.18 }]);
      for (let t = s.from; t < s.to - 0.3; t += beat * 2) out.push([t, 'tick', 0.35]);
    } else if (s.kind === 'drone') {
      out.push([s.from, 'pad', 1, { fs: [N(38), N(45)], d: s.to - s.from }]);
    } else if (s.kind === 'resolve') {
      out.push([s.from, 'pad', 1.1, { fs: [N(50), N(54), N(57), N(64)], d: s.to - s.from }]);
      [74, 69, 66, 62].forEach((m, i) => out.push([s.from + 0.6 + i * 0.55, 'bell', 0.9, { f: N(m) }]));
    }
  }
  return out;
}

const Audio = {
  ac: null, master: null, muted: true,
  ensure() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ac = new AC();
      this.master = this.ac.createGain(); this.master.gain.value = 2.4;
      const comp = this.ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      this.master.connect(comp); comp.connect(this.ac.destination);
    }
    return this.ac;
  },
  play(name, when, v, p) {
    if (this.muted || !this.ac || !SFX[name]) return;
    SFX[name](this.ac, this.master, Math.max(this.ac.currentTime, when), v, p);
  },
};

// Offline render of the whole soundtrack to a WAV (base64) — used by tools/render.mjs
async function renderSoundtrackWav(cues, total) {
  const sr = 48000;
  const ac = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const master = ac.createGain(); master.gain.value = 2.4;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ac.destination);
  for (const [t, name, v, p] of cues) if (SFX[name]) SFX[name](ac, master, t, v, p);
  const buf = await ac.startRendering();
  const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const wstr = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  wstr(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); wstr(8, 'WAVE'); wstr(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true);
  out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); wstr(36, 'data'); out.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { out.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true); o += 2; }
  const bytes = new Uint8Array(out.buffer); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
