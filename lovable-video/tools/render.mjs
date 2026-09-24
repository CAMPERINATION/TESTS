#!/usr/bin/env node
// Frame-exact render to MP4 (1080x1920, H.264 + AAC): animation + real screen-recording frames,
// with the mixed soundtrack (voiceover + music bed + SFX, see tools/mix.py).
//
//   node tools/render.mjs                      -> out/bakery-prompt-short.mp4
//   node tools/render.mjs --fps 30 --out out/x.mp4
//   node tools/render.mjs --stills 3,12.5,60   -> out/still-3.00.png ... (quick visual checks)
//   node tools/render.mjs --from 50 --to 60    -> render only a time range (preview)
//
// Needs: playwright (Chromium) and ffmpeg (on PATH, or FFMPEG_PATH, or the ffmpeg-static package).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const fps = Number(opt('fps', 30));
const out = path.resolve(root, opt('out', 'out/bakery-prompt-short.mp4'));
const audio = path.resolve(root, opt('audio', 'media/voiceover.wav'));
const stills = opt('stills', null);
const from = Number(opt('from', 0));
const toArg = opt('to', null);
fs.mkdirSync(path.dirname(out), { recursive: true });

async function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { const m = await import('ffmpeg-static'); if (m.default) return m.default; } catch {}
  return 'ffmpeg';
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.error('page:', m.text()); });
await page.goto(`http://localhost:${port}/index.html?render=1`);
await page.waitForFunction(() => window.KDP_READY);
const { total, cues } = await page.evaluate(() => window.KDP_READY);

if (stills) {
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(async (t) => { await window.renderFrame(t); }, t);
    const f = path.join(path.dirname(out), `still-${t.toFixed(2)}.png`);
    await page.locator('canvas').screenshot({ path: f });
    console.log(f);
  }
  await browser.close(); server.close();
  process.exit(0);
}

const to = toArg != null ? Math.min(Number(toArg), total) : total;

// soundtrack: voiceover + music + SFX
const cuesPath = path.join(path.dirname(out), 'cues.json');
const mixPath = path.join(path.dirname(out), 'mix.wav');
fs.writeFileSync(cuesPath, JSON.stringify(cues));
await new Promise((res, rej) => spawn('python3', [path.join(root, 'tools/mix.py'), cuesPath, audio, mixPath, String(total)], { stdio: 'inherit' })
  .on('close', (c) => (c === 0 ? res() : rej(new Error('mix.py failed')))));
const n = Math.ceil((to - from) * fps);
const ff = await ffmpegPath();
const ffArgs = [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-ss', String(from), '-i', mixPath,
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', `apad=whole_dur=${(to - from).toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11`,
  '-t', (to - from).toFixed(3), '-movflags', '+faststart', out,
];
const proc = spawn(ff, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => proc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));

const t0 = Date.now();
const BATCH = 6;
for (let i = 0; i < n; i += BATCH) {
  const times = [];
  for (let k = i; k < Math.min(n, i + BATCH); k++) times.push(from + k / fps);
  const urls = await page.evaluate(async (ts) => { const o = []; for (const t of ts) o.push(await window.renderFrameJPEG(t, 0.93)); return o; }, times);
  for (const u of urls) {
    const buf = Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
    if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
  }
  if ((i / BATCH) % 25 === 0) {
    const el = (Date.now() - t0) / 1000, pct = (i + times.length) / n;
    process.stdout.write(`\r${(pct * 100).toFixed(1)}%  frame ${i + times.length}/${n}  eta ${Math.round(el / pct - el)}s   `);
  }
}
proc.stdin.end();
await done;
await browser.close(); server.close();
console.log(`\nwrote ${out} (${(to - from).toFixed(2)}s @ ${fps}fps) in ${Math.round((Date.now() - t0) / 1000)}s`);
