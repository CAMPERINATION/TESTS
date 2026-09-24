#!/usr/bin/env node
// Optional: render the film to MP4 (1080×1920, 30 fps, H.264 + AAC) with the synthesized soundtrack.
//   npm i -D playwright && npx playwright install chromium    (and ffmpeg on PATH, or FFMPEG_PATH)
//   node tools/render.mjs [--fps 30] [--out out/case-of-the-vanishing-bone.mp4]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const fps = Number(opt('fps', 30));
const out = path.resolve(root, opt('out', 'out/case-of-the-vanishing-bone.mp4'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const ff = process.env.FFMPEG_PATH || 'ffmpeg';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`http://localhost:${srv.address().port}/index.html?render=1`);
await page.waitForFunction(() => window.FILM);
const total = await page.evaluate(() => window.FILM.total);

// soundtrack (Web Audio, rendered offline in the page)
const wavPath = path.join(path.dirname(out), 'soundtrack.wav');
fs.writeFileSync(wavPath, Buffer.from(await page.evaluate(() => window.FILM.wav()), 'base64'));

const n = Math.round(total * fps);
const proc = spawn(ff, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', wavPath,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => proc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
const t0 = Date.now();
for (let i = 0; i < n; i += 4) {
  const ts = []; for (let k = i; k < Math.min(n, i + 4); k++) ts.push(k / fps);
  const urls = await page.evaluate((ts) => ts.map((t) => window.FILM.frame(t)), ts);
  for (const u of urls) { const b = Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'); if (!proc.stdin.write(b)) await new Promise((r) => proc.stdin.once('drain', r)); }
  if (i % 120 === 0) process.stdout.write(`\r${Math.round((i / n) * 100)}%  ${((Date.now() - t0) / 1000).toFixed(0)}s   `);
}
proc.stdin.end(); await done; await browser.close(); srv.close();
console.log(`\nwrote ${out} (${total.toFixed(1)}s)`);
