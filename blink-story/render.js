// Usage: node render.js preview t1 t2 ...   -> writes preview PNGs
//        node render.js video out.mp4        -> renders silent video frames to ffmpeg
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30, DURATION = 43.6;
(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e));
  await page.goto('file://' + path.resolve(__dirname, 'scene.html'));
  await page.evaluate(() => window.ready);
  const grab = t => page.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92); }, t);
  if (mode === 'preview') {
    const dir = args.shift();
    fs.mkdirSync(dir, { recursive: true });
    for (const t of args) {
      const d = await grab(parseFloat(t));
      fs.writeFileSync(path.join(dir, `f_${t}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
  } else {
    const out = args[0];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(DURATION * FPS);
    for (let i = 0; i < n; i++) {
      const d = await grab(i / FPS);
      if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${n}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
