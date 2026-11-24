// Usage: node render.js <page.html> preview <outdir> t1 t2 ...   -> writes preview JPGs
//        node render.js <page.html> video <out.mp4>               -> renders silent video
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const FPS = 30, DURATION = +(process.env.DUR || 43.6);
const FONT_DIR = '/usr/share/fonts/opentype/inter';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf' };

function serve() {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = url.startsWith('/fonts/') ? path.join(FONT_DIR, path.basename(url)) : path.join(__dirname, path.normalize(url));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const [pageFile, mode, ...args] = process.argv.slice(2);
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/${pageFile}`);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.ready);
  const grab = t => page.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92); }, t);
  if (mode === 'preview') {
    const dir = args.shift(); fs.mkdirSync(dir, { recursive: true });
    for (const t of args) { const s = Date.now(); const d = await grab(parseFloat(t)); fs.writeFileSync(path.join(dir, `f_${t}.jpg`), Buffer.from(d.split(',')[1], 'base64')); console.log(t, Date.now() - s, 'ms'); }
  } else {
    const out = args[0];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(DURATION * FPS), t0 = Date.now();
    const i0 = +(args[1] ?? 0), i1 = Math.min(n, +(args[2] ?? n));
    for (let i = i0; i < i1; i++) {
      const d = await grab(i / FPS);
      if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 100 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); srv.close();
})();
