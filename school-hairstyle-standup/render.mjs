// Renders frames with headless Chromium (WebGL) and saves them as JPEGs.
// usage: node render.mjs            -> all frames, 4 parallel pages
//        node render.mjs 3.5 12 40  -> preview stills at the given times (seconds)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // resolves a global install via NODE_PATH too
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FPS = 24, WORKERS = 4;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
async function open() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url);
  await page.waitForFunction('window.READY === true', null, { timeout: 40000 });
  if (process.env.CLEAN) await page.addStyleTag({ content: '#sub, .pill { display: none !important; }' });   // CLEAN=1: no captions or labels
  return page;
}
const shot = async (page, t, file) => {
  await page.evaluate(t => window.renderFrame(t), t);
  await page.screenshot({ path: file, type: 'jpeg', quality: 96 });
};

const times = process.argv.slice(2).map(Number);
if (times.length) {
  fs.mkdirSync(path.join(ROOT, 'build/stills'), { recursive: true });
  const page = await open();
  for (const t of times) await shot(page, t, path.join(ROOT, `build/stills/t${t.toFixed(1).padStart(5, '0')}.jpg`));
} else {
  const START = Number(process.env.START || 0);   // START=n resumes an interrupted render at frame n
  const dir = path.join(ROOT, process.env.CLEAN ? 'build/frames-clean' : 'build/frames'); if (!START) fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const pages = await Promise.all(Array.from({ length: WORKERS }, open));
  const total = Math.ceil((await pages[0].evaluate('window.DURATION')) * FPS);
  let done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async (page, w) => {
    const END = Number(process.env.END || total);   // END=n stops before frame n (re-render a range)
    for (let f = START + w; f < Math.min(END, total); f += WORKERS) {
      await shot(page, f / FPS, path.join(dir, `f${String(f).padStart(5, '0')}.jpg`));
      if (++done % 200 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  console.log('frames:', total);
}
await browser.close(); server.close();
