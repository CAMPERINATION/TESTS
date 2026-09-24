// Dev helper: screenshot a page's canvas. usage: node tools/shot.mjs <page> <out.png> [js to eval before]
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [,, page, out, js] = process.argv;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1400 } });
p.on('pageerror', (e) => console.log('pageerror:', e.message)); p.on('console', (m) => { if (m.type() !== 'log') console.log(m.type(), m.text()); });
await p.goto(`http://localhost:${srv.address().port}/${page}`); await p.waitForTimeout(400);
if (js) await p.evaluate(js);
await p.locator('canvas').first().screenshot({ path: out });
await b.close(); srv.close();
