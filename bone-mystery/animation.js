/* =====================================================================
   animation.js — playback engine: timeline, camera, lens pass,
   post-processing (paper, grain, vignette), audio scheduling, UI.
   Scenes live in js/scenes.js (SCENES array).
   ===================================================================== */
'use strict';

const DEV_MODE = false;   // true: FPS, scene, time, camera and pose overlay
const LOOP = true;        // restart automatically after the final hold

// ---------------------------------------------------------------------
// timeline
// ---------------------------------------------------------------------
const Film = { scenes: [], total: 0, cues: [] };
function buildFilm() {
  let t = 0;
  Film.scenes = SCENES.map((s, i) => { const o = Object.assign({ index: i + 1, start: t }, s); t += s.dur; o.end = t; return o; });
  Film.total = t;
  // sound cues: scene-local (base seconds) → global seconds
  const cues = [];
  for (const s of Film.scenes) for (const [u, name, v, p] of (s.cues || [])) cues.push([s.start + u * (s.dur / s.base), name, v == null ? 1 : v, p]);
  const at = (i, u) => Film.scenes[i].start + u * (Film.scenes[i].dur / Film.scenes[i].base);
  for (const c of buildMusic(musicSections(at))) cues.push(c);
  Film.cues = cues.sort((a, b) => a[0] - b[0]);
}
function sceneAt(t) {
  for (const s of Film.scenes) if (t < s.end) return s;
  return Film.scenes[Film.scenes.length - 1];
}

// ---------------------------------------------------------------------
// camera
// ---------------------------------------------------------------------
const CAM0 = { x: W / 2, y: H / 2, zoom: 1, rot: 0, shake: 0 };
function camKeys(u, keys, ease = Ease.inOut) {
  const k = keys.map(([t, c, e]) => [t, Object.assign({}, CAM0, c), e]);
  let acc = k[0][1];
  for (let i = 0; i < k.length; i++) { k[i][1] = Object.assign({}, acc, keys[i][1]); acc = k[i][1]; }
  if (u <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, a] = k[i], [t1, b, e] = k[i + 1];
    if (u < t1) { const q = (e || ease)(inv(t0, t1, u)); const o = {}; for (const f in b) o[f] = typeof b[f] === 'number' ? lerp(a[f], b[f], q) : b[f]; return o; }
  }
  return k[k.length - 1][1];
}
function applyCam(ctx, c, t) {
  const sh = c.shake || 0;
  const sx = sh ? smoothNoise(t * 38, 1) * sh : 0, sy = sh ? smoothNoise(t * 41, 2) * sh : 0;
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.rotate(c.rot || 0);
  ctx.scale(c.zoom, c.zoom);
  ctx.translate(-c.x, -c.y);
}
function inWorld(ctx, cam, t, fn) { ctx.save(); applyCam(ctx, cam, t); fn(); ctx.restore(); }
// world → screen for a point under a camera (no shake)
function toScreen(cam, x, y) {
  const dx = (x - cam.x) * cam.zoom, dy = (y - cam.y) * cam.zoom;
  const c = Math.cos(cam.rot || 0), s = Math.sin(cam.rot || 0);
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}

/* Magnifying-glass lens pass: re-render the world inside a circle,
   enlarged, brighter, with a refracted edge. */
function lensPass(ctx, cam, t, lx, ly, r, zoom, drawWorld) {
  ctx.save();
  ctx.beginPath(); ctx.arc(lx, ly, r, 0, TAU); ctx.clip();
  ctx.fillStyle = '#000'; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  ctx.save();
  ctx.translate(lx, ly); ctx.scale(zoom, zoom); ctx.translate(-lx, -ly);
  inWorld(ctx, cam, t, () => drawWorld(true));
  ctx.restore();
  // brighter + a touch more contrast inside the glass
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,240,210,0.45)'; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,230,190,0.1)'; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
  // refraction ring: darkened, slightly offset edge
  const g = ctx.createRadialGradient(lx, ly, r * 0.72, lx, ly, r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.85, 'rgba(20,30,40,0.18)'); g.addColorStop(1, 'rgba(10,15,20,0.55)');
  ctx.fillStyle = g; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  ctx.restore();
}

// ---------------------------------------------------------------------
// post-processing
// ---------------------------------------------------------------------
function postFX(ctx, t, o = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.paper !== false) {
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.15;
    ctx.drawImage(TEX.paper, 0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.55;
  const gv = TEX.grain[Math.floor(t * 12) % 3];
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(gv, x, y);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.78);
  v.addColorStop(0, 'rgba(10,8,14,0)'); v.addColorStop(1, `rgba(8,6,12,${o.vignette == null ? 0.55 : o.vignette})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------------
// render one frame
// ---------------------------------------------------------------------
const Info = { cam: null, pose: '', fps: 0 };
function renderFrame(ctx, t) {
  const s = sceneAt(t);
  const u = (t - s.start) * (s.base / s.dur);
  setBoil(t);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  Info.cam = null; Info.pose = '';
  const post = s.draw(ctx, u, { t, scene: s }) || {};
  ctx.restore();
  if (!post.skipPost) postFX(ctx, t, post);
  if (DEV_MODE) drawDev(ctx, t, s);
}
function drawDev(ctx, t, s) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 20, 560, 190);
  ctx.fillStyle = '#9f9'; ctx.font = '28px monospace';
  const c = Info.cam;
  const lines = [`FPS ${Info.fps.toFixed(0)}`, `scene ${s.index}/${Film.scenes.length} ${s.name}`, `time ${t.toFixed(2)}s  (local ${(t - s.start).toFixed(2)})`,
    c ? `cam x${c.x.toFixed(0)} y${c.y.toFixed(0)} z${c.zoom.toFixed(2)} r${(c.rot || 0).toFixed(2)}` : 'cam —', `pose ${Info.pose || '—'}`];
  lines.forEach((l, i) => ctx.fillText(l, 36, 60 + i * 34));
  ctx.restore();
}

// ---------------------------------------------------------------------
// playback + audio scheduling + UI
// ---------------------------------------------------------------------
const Player = { t: 0, playing: true, last: 0, cueIdx: 0, fpsAcc: [], ended: false };
function seek(t) {
  Player.t = clamp(t, 0, Film.total);
  Player.cueIdx = Film.cues.findIndex((c) => c[0] >= Player.t - 1e-6);
  if (Player.cueIdx < 0) Player.cueIdx = Film.cues.length;
  Player.ended = false;
}
function scheduleAudio(dt) {
  const A = Audio;
  if (!A.ac || A.muted || !Player.playing) return;
  const horizon = Player.t + 0.12;
  while (Player.cueIdx < Film.cues.length && Film.cues[Player.cueIdx][0] <= horizon) {
    const [ct, name, v, p] = Film.cues[Player.cueIdx++];
    if (ct >= Player.t - 0.05) A.play(name, A.ac.currentTime + Math.max(0, ct - Player.t), v, p);
  }
}

function initPlayer() {
  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d');
  const ui = {
    play: document.getElementById('btnPlay'), restart: document.getElementById('btnRestart'), mute: document.getElementById('btnMute'),
    bar: document.getElementById('progress'), fill: document.getElementById('progressFill'), replay: document.getElementById('replay'),
  };
  const setPlayIcon = () => { ui.play.textContent = Player.playing ? '❚❚' : '▶'; ui.play.setAttribute('aria-label', Player.playing ? 'Pause' : 'Play'); };
  const setMuteIcon = () => { ui.mute.textContent = Audio.muted ? '🔇' : '🔊'; ui.mute.setAttribute('aria-label', Audio.muted ? 'Unmute' : 'Mute'); };
  ui.play.onclick = () => { if (Player.ended) { seek(0); } Player.playing = !Player.playing; if (Audio.ac) Player.playing ? Audio.ac.resume() : Audio.ac.suspend(); setPlayIcon(); ui.replay.hidden = true; };
  ui.restart.onclick = () => { seek(0); Player.playing = true; ui.replay.hidden = true; setPlayIcon(); if (Audio.ac) Audio.ac.resume(); };
  ui.replay.onclick = ui.restart.onclick;
  ui.mute.onclick = () => { Audio.ensure(); Audio.muted = !Audio.muted; if (Audio.ac) Audio.ac.resume(); seek(Player.t); setMuteIcon(); };
  ui.bar.onclick = (e) => { const r = ui.bar.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * Film.total); };
  document.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); ui.play.onclick(); } if (e.key === 'r') ui.restart.onclick(); if (e.key === 'm') ui.mute.onclick(); });
  setPlayIcon(); setMuteIcon();

  function frame(now) {
    const dt = Player.last ? Math.min(0.1, (now - Player.last) / 1000) : 0;
    Player.last = now;
    if (dt > 0) { Player.fpsAcc.push(1 / dt); if (Player.fpsAcc.length > 30) Player.fpsAcc.shift(); Info.fps = Player.fpsAcc.reduce((a, b) => a + b, 0) / Player.fpsAcc.length; }
    if (Player.playing && !Player.ended) {
      Player.t += dt;
      if (Player.t >= Film.total) {
        if (LOOP) { seek(0); }
        else { Player.t = Film.total; Player.ended = true; Player.playing = false; ui.replay.hidden = false; setPlayIcon(); }
      }
    }
    scheduleAudio(dt);
    renderFrame(ctx, Math.min(Player.t, Film.total - 1e-4));
    ui.fill.style.width = `${(Player.t / Film.total) * 100}%`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------
// boot (also exposes a small API for the offline renderer)
// ---------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  buildTextures();
  buildFilm();
  const params = new URLSearchParams(location.search);
  if (params.has('render')) {
    document.body.classList.add('render');
    const canvas = document.getElementById('film'), ctx = canvas.getContext('2d');
    window.FILM = {
      total: Film.total,
      frame: (t) => { renderFrame(ctx, t); return canvas.toDataURL('image/jpeg', 0.93); },
      draw: (t) => renderFrame(ctx, t),
      wav: () => renderSoundtrackWav(Film.cues, Film.total),
    };
    return;
  }
  initPlayer();
});
