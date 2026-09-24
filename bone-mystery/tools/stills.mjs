// Dev helper: render stills at given times → PNG files + contact sheet. usage: node tools/stills.mjs outDir t1,t2,...
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [,, outDir, times] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('pageerror:', e.message)); p.on('console', (m) => { if (m.type() !== 'log') console.log(m.type(), m.text()); });
await p.goto(`http://localhost:${srv.address().port}/index.html?render=1`); await p.waitForFunction(() => window.FILM);
const ts = times.split(',').map(Number);
const urls = [];
for (const t of ts) { const u = await p.evaluate((t) => window.FILM.frame(t), t); urls.push(u); }
// contact sheet via canvas in page
const sheet = await p.evaluate(async (urls) => {
  const cols = Math.min(5, urls.length), rows = Math.ceil(urls.length / cols), w = 270, h = 480;
  const c = document.createElement('canvas'); c.width = cols * w; c.height = rows * h; const g = c.getContext('2d');
  for (let i = 0; i < urls.length; i++) { const im = new Image(); im.src = urls[i]; await im.decode(); g.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h); }
  return c.toDataURL('image/png');
}, urls);
fs.writeFileSync(path.join(outDir, 'sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
urls.forEach((u, i) => fs.writeFileSync(path.join(outDir, `t${ts[i].toFixed(2)}.jpg`), Buffer.from(u.split(',')[1], 'base64')));
await b.close(); srv.close();
console.log('ok', ts.length);
