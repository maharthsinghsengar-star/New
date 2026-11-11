// "The History of Hot Wheels" — thick 2D stick figures in a cel-shaded 3D world (16:9).
// Fully deterministic: window.renderFrame(t) draws the frame for time t (seconds).
import * as THREE from 'three';

const W = 1920, H = 1080;
const TL = await (await fetch('build/timeline.json')).json();
const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 900);
const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 140 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
// cel shading: three flat light bands
const RAMP = new THREE.DataTexture(new Uint8Array([140, 205, 255]), 3, 1, THREE.RedFormat);
RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.needsUpdate = true;
const M = (c, o = {}) => { const { roughness, metalness, flatShading, ...rest } = o; return new THREE.MeshToonMaterial({ color: c, gradientMap: RAMP, ...rest }); };
const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? M(mat) : mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
}
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r1, r2, h, c, x, y, z, s = 22) => mesh(new THREE.CylinderGeometry(r1, r2, h, Math.max(s, 12)), c, x, y, z);
const sph = (r, c, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), c, x, y, z);
const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };
const noShadow = (m) => { m.castShadow = false; return m; };
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const sky = (stops) => canvasTex(4, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); });
const speckle = (base, cols, n, sz, seed = 9) => (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h); const r = RNG(seed);
  for (let i = 0; i < n; i++) { x.globalAlpha = 0.25 + r() * 0.3; x.fillStyle = cols[r() * cols.length | 0]; x.fillRect(r() * w, r() * h, sz * (1 + r() * 2), sz * (1 + r() * 2)); }
};
const texOf = (draw, rx, ry) => canvasTex(256, 256, draw, [rx, ry]);
const GRASS = (base, a, b) => (x, w, h) => { speckle(base, [a, b], 500, 2, 4)(x, w, h); const r = RNG(2); x.lineWidth = 2; for (let i = 0; i < 260; i++) { x.globalAlpha = 0.5; x.strokeStyle = r() < 0.5 ? a : b; const px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 5, py - 5 - r() * 8); x.stroke(); } };
const ASPHALT = speckle('#8d9099', ['#7b7e87', '#9da0a8', '#6d7079', '#a9acb3'], 2600, 1.4);
const DIRT = speckle('#dcb27a', ['#c99c63', '#ecc890', '#b98a55'], 1600, 2);
const COBBLE = (x, w, h) => { x.fillStyle = '#9c8463'; x.fillRect(0, 0, w, h); const r = RNG(6), cols = ['#d9c39a', '#cdb486', '#e3d0aa', '#c4a878']; for (let y = 0; y < h; y += 32) { let px = -(y / 32 % 2) * 22; while (px < w) { const sw = 36 + r() * 22; x.fillStyle = cols[r() * 4 | 0]; x.beginPath(); x.roundRect(px + 2, y + 2, sw - 4, 28, 7); x.fill(); px += sw; } } };
function ground(tex, w, d, x, z, y = 0) { const m = mesh(new THREE.PlaneGeometry(w, d), M(0xffffff, { map: tex }), x, y, z); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; }
function wheel(r, { tire = 0x2a2a2a, spoke = 0x8a5a2b, n = 5, thick = 0.07 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r - thick, thick, 10, 36), tire));
  g.add(rot(cyl(0.1, 0.1, thick * 2.6, spoke), Math.PI / 2));
  for (let i = 0; i < n; i++) g.add(rot(box((r - thick) * 2, 0.04, 0.04, spoke), 0, 0, i * Math.PI / n));
  return g;
}
const glowTex = canvasTex(128, 128, (x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});
const puffTex = canvasTex(128, 128, (x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.55, 'rgba(255,255,255,.8)'); g.addColorStop(0.8, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});
function glow(color, size, x, y, z, op = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, fog: false }));
  sp.scale.setScalar(size); sp.position.set(x, y, z); return sp;
}
// soft sprite puffs: steam, exhaust and road dust
function puffs(n, color = 0xffffff) {
  const g = new THREE.Group(), list = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, depthWrite: false })); g.add(m); list.push(m); }
  g.userData.update = (t, rate, dx, dy, size = 1, strength = 1) => list.forEach((m, i) => {
    const a = ((t * rate + i / n) % 1 + 1) % 1, w = Math.sin(i * 12.9) * 0.25;
    m.position.set(dx * a + w * a, dy * a + Math.abs(w) * a, w * a * 1.5);
    m.scale.setScalar((0.5 + a * 2.2) * size);
    m.material.opacity = (1 - a) ** 1.3 * 0.8 * strength;
  });
  return g;
}
const tick = (g, f) => (g.userData.tick ||= []).push(f);
function birds(g, n, seed, y0 = 11, z0 = -16, col = 0x222222) {   // little 2D "V" birds
  const r = RNG(seed), m = B(col, { side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(), wings = [1, -1].map(sg => { const p = new THREE.Group(); const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.07), m); w.position.x = 0.25 * sg; p.add(w); b.add(p); return p; });
    const bx = -20 + r() * 70, by = y0 + r() * 5, bz = z0 - r() * 10, ph = r() * 6, sp = 0.8 + r() * 0.8; g.add(b);
    tick(g, t => { b.position.set(bx + t * sp, by + 0.3 * Math.sin(t * 1.3 + ph), bz); const a = 0.55 * Math.sin(t * 9 + ph); wings[0].rotation.z = a; wings[1].rotation.z = -a; });
  }
}
function confetti(g, n, seed, x0, x1) {
  const r = RNG(seed), cols = [0xff4d6d, 0xffd23f, 0x3ddc97, 0x4cc9f0, 0xb388ff, 0xff9f1c];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), B(cols[i % 6], { side: THREE.DoubleSide }));
    const cx = x0 + r() * (x1 - x0), cz = -2.5 + r() * 4.5, ph = r() * 9, sp = 0.9 + r() * 0.8; g.add(m);
    tick(g, t => { const y = 9 - ((t * sp + ph) % 9); m.position.set(cx + 0.5 * Math.sin(t * 2 + ph), y, cz); m.rotation.set(t * 4 + ph, t * 3 + ph, ph); });
  }
}
const FLOWERS = [0xff4d6d, 0xffd23f, 0xffffff, 0xff8fab, 0xb388ff, 0xff9f1c];


// ---------- painted props (anime-style billboards) ----------
const blobs = (x, r, n, cx, cy, rx, ry, rad, col) => { x.fillStyle = col; for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()); x.beginPath(); x.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rad * (0.6 + r() * 0.6), 0, 6.3); x.fill(); } };
const TREE_TEX = [0, 1, 2].map(k => canvasTex(256, 320, (x) => {
  const r = RNG(40 + k);
  x.fillStyle = '#6b4226'; x.beginPath(); x.moveTo(112, 318); x.lineTo(120, 170); x.lineTo(138, 170); x.lineTo(148, 318); x.fill();
  x.fillStyle = '#8a5a35'; x.beginPath(); x.moveTo(112, 318); x.lineTo(120, 170); x.lineTo(127, 170); x.lineTo(126, 318); x.fill();
  blobs(x, r, 26, 128, 128, 88, 84, 40, ['#1f7a3a', '#23803f', '#2b7d33'][k]);
  blobs(x, r, 20, 116, 112, 74, 68, 32, ['#3fae4a', '#45b552', '#57b83f'][k]);
  blobs(x, r, 12, 98, 88, 52, 42, 22, ['#7edc5e', '#86e36a', '#a3e05a'][k]);
}));
const PINE_TEX = [0, 1].map(k => canvasTex(160, 400, (x) => {
  x.fillStyle = '#5b3a22'; x.fillRect(72, 340, 16, 60);
  for (let i = 0; i < 7; i++) { const y = 20 + i * 48, w = 22 + i * 9; x.fillStyle = k ? '#17603f' : '#1c6b45'; x.beginPath(); x.moveTo(80, y - 22); x.lineTo(80 + w, y + 62); x.lineTo(80 - w, y + 62); x.fill(); x.fillStyle = k ? '#2f8f5c' : '#38a066'; x.beginPath(); x.moveTo(80, y - 22); x.lineTo(80 - w * 0.25, y + 62); x.lineTo(80 - w, y + 62); x.fill(); }
}));
const CLOUD_TEX = [0, 1, 2, 3].map(k => canvasTex(512, 256, (x) => {
  const r = RNG(70 + k), bl = [];
  for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9, hh = Math.sin(u * Math.PI) ** 0.7; bl.push([70 + u * 372 + r() * 20, 172 - hh * (40 + r() * 55), 34 + hh * 34 + r() * 10]); }
  const draw = (col, dy, sc) => { x.fillStyle = col; bl.forEach(([cx, cy, rr]) => { x.beginPath(); x.arc(cx, cy + dy, rr * sc, 0, 6.3); x.fill(); }); x.beginPath(); x.roundRect(50, 150 + dy, 412, 46, 23); x.fill(); };
  draw('#b9d3f5', 10, 1.0); draw('#ffffff', -4, 0.94);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(160,196,240,.55)'; x.fillRect(0, 176, 512, 80);
}));
const shadowMat = B(0x0a2a12, { transparent: true, opacity: 0.25, depthWrite: false });
function tree(r, tint = 0xffffff) {
  const g = new THREE.Group(), pine = r() < 0.3, s = 0.85 + r() * 0.7;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pine ? PINE_TEX[r() * 2 | 0] : TREE_TEX[r() * 3 | 0], color: tint, alphaTest: 0.5 }));
  sp.center.set(0.5, 0); sp.scale.set(pine ? 2.6 * s : 5.2 * s, pine ? 6.5 * s : 6.5 * s, 1); g.add(sp);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7 * s, 16), shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0.5, 0.04, 0.2); sh.scale.y = 0.45; g.add(sh);
  return g;
}
function clouds(g, seed, tint = 0xffffff, x0 = -260, x1 = 360) {
  const r = RNG(seed);
  for (let i = 0; i < 26; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD_TEX[i % 4], color: tint, transparent: true, depthWrite: false, fog: false }));
    const s = 55 + r() * 80; sp.scale.set(s, s / 2, 1); sp.position.set(x0 + r() * (x1 - x0), 28 + r() * r() * 150, -330 - r() * 60); sp.renderOrder = -5; g.add(sp);
  }
}
// modern cars: smooth extruded body with wheel arches, tinted glass cabin, detailed wheels
function car({ color = 0xe01f2d, type = 'sedan', driver = false, redline = false } = {}) {
  const P = { sedan: { L: 2.25, hb: 0.95, roof: 1.45, wr: 0.36, fx: 1.38, rx: -1.35, W: 1.72, cab: [-1.7, -0.95, 0.3, 1.2] },
    coupe: { L: 2.2, hb: 0.86, roof: 1.28, wr: 0.36, fx: 1.36, rx: -1.3, W: 1.76, cab: [-1.95, -0.55, 0.25, 1.2] },
    suv: { L: 2.3, hb: 1.1, roof: 1.82, wr: 0.44, fx: 1.42, rx: -1.4, W: 1.84, cab: [-2.2, -1.95, 0.4, 1.2] } }[type];
  const { L, hb, roof, wr, fx, rx, W, cab } = P, y0 = 0.3, ra = wr + 0.08, g = new THREE.Group(), dark = 0x17181c;
  const s = new THREE.Shape();
  s.moveTo(-L, y0 + 0.12); s.lineTo(-L - 0.03, hb - 0.22); s.quadraticCurveTo(-L, hb, -L + 0.3, hb);
  s.lineTo(cab[3] + 0.15, hb); s.quadraticCurveTo(L - 0.25, hb - 0.04, L - 0.04, hb - 0.3); s.lineTo(L, y0 + 0.16); s.quadraticCurveTo(L, y0, L - 0.15, y0);
  s.lineTo(fx + ra, y0); s.lineTo(fx + ra, wr); s.absarc(fx, wr, ra, 0, Math.PI, false); s.lineTo(fx - ra, y0);
  s.lineTo(rx + ra, y0); s.lineTo(rx + ra, wr); s.absarc(rx, wr, ra, 0, Math.PI, false); s.lineTo(rx - ra, y0); s.lineTo(-L + 0.12, y0); s.lineTo(-L, y0 + 0.12);
  const bev = 0.1, paint = M(color);
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: W - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 16 }), paint, 0, 0, -(W - 2 * bev) / 2));
  g.add(box(2 * L - 0.3, hb - y0 - 0.12, W - 0.5, dark, 0, (hb + y0) / 2 - 0.02, 0));
  const c = new THREE.Shape();
  c.moveTo(cab[0], hb - 0.03); c.quadraticCurveTo(cab[0] + (cab[1] - cab[0]) * 0.25, roof, cab[1] + 0.2, roof); c.lineTo(cab[2] - 0.1, roof);
  c.quadraticCurveTo(cab[2] + (cab[3] - cab[2]) * 0.5, roof - 0.06, cab[3], hb - 0.03); c.lineTo(cab[0], hb - 0.03);
  const glass = noShadow(mesh(new THREE.ExtrudeGeometry(c, { depth: W - 0.56, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 12 }), M(0x16283a, { transparent: true, opacity: 0.5, depthWrite: false }), 0, 0, -(W - 0.56) / 2));
  glass.renderOrder = 3; g.add(glass);
  const rl = cab[2] - cab[1] - 0.1, rxm = (cab[1] + cab[2]) / 2 + 0.05;
  g.add(mesh(new THREE.BoxGeometry(rl, 0.07, W - 0.42), paint, rxm, roof + 0.045, 0));
  for (const z of [1, -1]) {
    const zz = z * (W / 2 - 0.2);
    if (type !== 'coupe') g.add(box(0.1, roof - hb, 0.05, paint, rxm - 0.1, (roof + hb) / 2, zz));
    g.add(noShadow(box(2 * L - 0.7, 0.035, 0.02, B(0xffffff, { transparent: true, opacity: 0.35 }), 0, hb - 0.07, z * (W / 2 + 0.006))), box(fx - rx - 2 * ra, 0.1, 0.03, dark, (fx + rx) / 2, y0 + 0.05, z * (W / 2 + 0.004)), rot(box(0.07, (roof - hb) * 1.25, 0.05, paint, (cab[2] + cab[3]) / 2 + 0.02, (roof + hb) / 2, zz), 0, 0, Math.atan2(cab[3] - cab[2], roof - hb) * 0.9));
    g.add(box(0.02, hb - y0 - 0.2, 0.02, dark, rxm - 0.1, (hb + y0) / 2 + 0.05, z * (W / 2 + 0.005)), box(0.02, hb - y0 - 0.2, 0.02, dark, cab[3] - 0.1, (hb + y0) / 2 + 0.05, z * (W / 2 + 0.005)));
    g.add(box(0.18, 0.035, 0.03, 0xd9dde3, rxm + 0.25, hb - 0.16, z * (W / 2 + 0.01)), box(0.16, 0.11, 0.22, paint, cab[3] - 0.22, hb + 0.07, z * (W / 2 + 0.1)));
    g.add(box(0.07, 0.13, 0.44, M(0xffffff, { emissive: 0xfff6d0, emissiveIntensity: 1 }), L - 0.02, hb - 0.34, z * (W / 2 - 0.34)), box(0.07, 0.12, 0.46, M(0xff2030, { emissive: 0xff2030, emissiveIntensity: 0.8 }), -L - 0.01, hb - 0.3, z * (W / 2 - 0.34)));
    if (type === 'suv') g.add(box(rl * 0.8, 0.05, 0.05, dark, rxm, roof + 0.13, z * (W / 2 - 0.4)));
  }
  g.add(box(0.06, 0.2, W - 0.7, dark, L + 0.005, y0 + 0.3, 0), box(0.1, 0.1, W - 0.1, dark, L - 0.02, y0 + 0.07, 0), box(0.1, 0.12, W - 0.1, dark, -L + 0.02, y0 + 0.08, 0), box(0.02, 0.1, 0.5, 0xf2f2f2, -L - 0.03, y0 + 0.3, 0));
  const wh = [];
  for (const [x, z] of [[fx, 1], [fx, -1], [rx, 1], [rx, -1]]) {
    const w = new THREE.Group();
    w.add(rot(cyl(wr, wr, 0.27, 0x1b1b1e, 0, 0, 0, 28), Math.PI / 2), rot(cyl(wr * 0.66, wr * 0.66, 0.29, 0xcfd4da, 0, 0, 0, 24), Math.PI / 2), rot(cyl(wr * 0.2, wr * 0.2, 0.31, 0x8d939b, 0, 0, 0, 12), Math.PI / 2));
    for (let i = 0; i < 5; i++) w.add(rot(box(wr * 0.3, 0.09, 0.3, 0x2b2c31, 0, 0, 0), 0, 0, i * Math.PI * 0.4).translateX(wr * 0.42));
    if (redline) w.add(rot(cyl(wr * 0.84, wr * 0.84, 0.28, 0xe01f2d, 0, 0, 0, 24), Math.PI / 2));
    w.position.set(x, wr, z * (W / 2 - 0.1)); g.add(w); wh.push(w);
  }
  let man = null;
  if (driver) { man = stickman({ scale: 0.85 }); man.position.set(cab[2] - 0.62, roof - 0.96, 0); g.add(man); g.add(box(0.12, 0.6, W - 0.8, 0x2a2b31, cab[2] - 0.95, hb - 0.1, 0)); }
  g.userData.update = (x, t) => { g.position.x = x; g.position.y = 0.008 * Math.sin(t * 17 + x); wh.forEach(w => w.rotation.z = -x / wr); if (man) pose(man, sitPose(0.75, 0.03 * Math.sin(t * 2))); };
  g.userData.L = L; g.userData.wh = wh; g.userData.wr = wr; g.userData.hb = hb; g.userData.roof = roof;
  return g;
}

// ---------- 2D stick figure (thick, clearly visible build) ----------
const flatMat = (c, o = {}) => B(c, { side: THREE.DoubleSide, ...o });
const INK = flatMat(0x141414), PAPER = flatMat(0xffffff);
const figures = [];
const capG = (th, len) => new THREE.CapsuleGeometry(th / 2, len, 4, 12).scale(1, 1, 0.1);
const ell = (rx, ry) => new THREE.CircleGeometry(1, 30).scale(rx, ry, 1);
function seg(len, th, up = false) {            // limb: pivot at origin, extends down (or up), white outline behind
  const g = new THREE.Group(), y = up ? len / 2 : -len / 2;
  const a = new THREE.Mesh(capG(th, len), INK); a.position.y = y; a.castShadow = true;
  const b = new THREE.Mesh(capG(th + 0.085, len), PAPER); b.position.set(0, y, -0.03);
  g.add(a, b); return g;
}
function flatPart(geo, mat, x, y, z, parent, grow = 0.04) {
  const a = new THREE.Mesh(geo, mat); a.position.set(x, y, z); a.castShadow = true; parent.add(a);
  if (grow) { geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3()), c = geo.boundingBox.getCenter(new THREE.Vector3());
    const b = new THREE.Mesh(geo, PAPER), sx = 1 + 2 * grow / s.x, sy = 1 + 2 * grow / s.y; b.scale.set(sx, sy, 1); b.position.set(x - c.x * (sx - 1), y - c.y * (sy - 1), -0.03); parent.add(b); }
  return a;
}
function guy({ scale = 1, face = 1, hat = null, tie = null, glasses = false } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.set(scale * face, scale, scale);
  const u = root.userData = { body, scale };
  const limb = (l1, l2, y, parent, foot) => {
    const a = seg(l1, 0.15); a.position.y = y; const b = seg(l2, 0.14); b.position.y = -l1; a.add(b); parent.add(a);
    if (foot) flatPart(new THREE.CapsuleGeometry(0.075, 0.14, 4, 10).rotateZ(Math.PI / 2).scale(1, 1, 0.1), INK, 0.08, -l2 - 0.02, 0.002, b);
    else flatPart(ell(0.1, 0.1), INK, 0, -l2 - 0.02, 0.002, b);
    return [a, b];
  };
  u.legL = limb(0.44, 0.44, 0, body, true); u.legR = limb(0.44, 0.44, 0, body, true);
  const torsoP = u.torsoP = new THREE.Group(); body.add(torsoP);
  torsoP.add(seg(0.6, 0.24, true));
  if (tie) flatPart(new THREE.ShapeGeometry(new THREE.Shape([[0.02, 0.6], [0.1, 0.52], [0.07, 0.2], [0.02, 0.12], [-0.03, 0.2], [-0.06, 0.52]].map(([x, y]) => new THREE.Vector2(x + 0.04, y)))), flatMat(tie), 0, 0, 0.012, torsoP, 0);
  const head = u.head = new THREE.Group(); head.position.y = 0.92; torsoP.add(head);
  flatPart(ell(0.285, 0.285), INK, 0, 0, 0, head, 0.045);
  flatPart(ell(0.2, 0.2), PAPER, 0.01, 0, 0.012, head, 0);
  u.eye = flatPart(ell(0.042, 0.05), INK, 0.09, 0.04, 0.016, head, 0);
  u.mouth = flatPart(ell(0.07, 0.03), INK, 0.09, -0.09, 0.016, head, 0);
  if (glasses) { const r = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.1, 24), INK); r.position.set(0.09, 0.04, 0.018); head.add(r); flatPart(new THREE.PlaneGeometry(0.2, 0.025), INK, -0.09, 0.05, 0.018, head, 0); }
  if (hat === 'top') { flatPart(new THREE.PlaneGeometry(0.34, 0.32), INK, 0, 0.42, 0.006, head); flatPart(new THREE.PlaneGeometry(0.62, 0.07), INK, 0, 0.26, 0.006, head); }
  if (hat === 'cap') { flatPart(new THREE.PlaneGeometry(0.46, 0.13), flatMat(0xe63946), -0.01, 0.27, 0.014, head, 0.035); flatPart(new THREE.PlaneGeometry(0.26, 0.06), flatMat(0xe63946), 0.31, 0.225, 0.014, head, 0.035); }
  if (hat === 'bow') { for (const sx of [-1, 1]) flatPart(new THREE.ShapeGeometry(new THREE.Shape([[0, 0], [0.17 * sx, 0.1], [0.17 * sx, -0.1]].map(([x, y]) => new THREE.Vector2(x, y)))), flatMat(0xff4d8d), -0.08, 0.3, 0.014, head, 0.03); }
  u.armL = limb(0.34, 0.34, 0.52, torsoP, false); u.armR = limb(0.34, 0.34, 0.52, torsoP, false);
  figures.push(root); return root;
}
function pose(f, p) {
  const u = f.userData;
  u.torsoP.rotation.z = -(p.lean || 0);
  u.legL[0].rotation.z = p.hipL ?? 0; u.legL[1].rotation.z = p.kneeL ?? 0;
  u.legR[0].rotation.z = p.hipR ?? 0; u.legR[1].rotation.z = p.kneeR ?? 0;
  u.armL[0].rotation.z = p.shL ?? 0; u.armL[1].rotation.z = p.elL ?? 0;
  u.armR[0].rotation.z = p.shR ?? 0; u.armR[1].rotation.z = p.elR ?? 0;
  u.head.rotation.z = p.head ?? 0;
  const m = p.mouth ?? 0.25; u.mouth.scale.set(1 - 0.35 * Math.min(1, m), 0.5 + m * 2.2, 1);
  u.eye.scale.y = p.blink ? 0.15 : 1;
}
const STAND_Y = 0.99;
const face = (f, dir) => { const b = f.userData.body; b.scale.x = Math.abs(b.scale.x) * dir; };
const place = (f, x, z, dir = 1, dy = 0) => { f.position.set(x, STAND_Y * f.userData.scale + dy, z); face(f, dir); };
const standPose = (t = 0) => ({ hipL: 0.09, hipR: -0.09, shL: 0.14 + 0.04 * Math.sin(t * 2), shR: -0.14, elL: 0.15, elR: 0.15 });
const cheerPose = (t) => ({ hipL: 0.1, hipR: -0.1, shL: 2.7 + 0.35 * Math.sin(t * 9), elL: 0.3, shR: -2.7 - 0.35 * Math.sin(t * 9 + 1), elR: -0.3, head: 0.1, mouth: 1 });
const thinkPose = (t) => ({ hipL: 0.09, hipR: -0.09, shL: 1.0, elL: 2.1, shR: -0.25, elR: 1.3, lean: 0.05, head: 0.12 + 0.04 * Math.sin(t * 1.5) });
const boredPose = (t) => ({ hipL: 0.09, hipR: -0.09, shL: 0.12, shR: -0.05, elL: 0.05, elR: 0.05, lean: 0.3, head: -0.3 + 0.05 * Math.sin(t * 1.2), mouth: 0.1 + 0.5 * Math.max(0, Math.sin(t * 1.3)) });
const pointPose = (t) => ({ hipL: 0.1, hipR: -0.1, shL: 1.55 + 0.06 * Math.sin(t * 6), elL: 0.05, shR: -0.3, elR: 1.0, lean: 0.08, mouth: 0.6 });
const hop = (t, k = 0) => 0.16 * Math.abs(Math.sin(t * 6.5 + k));
// floating emotes / signs
const txt = (x, s, px, cx, cy, fill, stroke, lw = 14) => { x.font = `900 ${px}px Poppins, sans-serif`; x.textAlign = 'center'; x.lineJoin = 'round'; if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.strokeText(s, cx, cy); } x.fillStyle = fill; x.fillText(s, cx, cy); };
function emote(draw, w, h, size) {
  let sp = null;
  const api = { show(x, y, z, a) { if (!sp) return; sp.visible = a > 0.01; sp.position.set(x, y, z); const pop = a < 1 ? 0.6 + 0.4 * smooth(a) + 0.25 * Math.sin(a * Math.PI) : 1; sp.scale.set(size * pop, size * pop * h / w, 1); sp.material.opacity = clamp(a * 2); },
    build(parent) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(w, h, draw), transparent: true, depthWrite: false, depthTest: false, fog: false })); sp.renderOrder = 20; sp.visible = false; parent.add(sp); return api; }, hide() { if (sp) sp.visible = false; } };
  return api;
}
const bubble = (x, w, h, tail = true) => { x.fillStyle = '#fff'; x.strokeStyle = '#141414'; x.lineWidth = 12; x.beginPath(); x.roundRect(10, 10, w - 20, h - 70, 46); x.fill(); x.stroke(); if (tail) { x.beginPath(); x.moveTo(90, h - 64); x.lineTo(70, h - 12); x.lineTo(150, h - 64); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.fillRect(96, h - 76, 50, 18); } };
const EM = {
  bulb: emote((x) => { x.fillStyle = '#ffd23f'; x.strokeStyle = '#141414'; x.lineWidth = 12; x.beginPath(); x.arc(128, 104, 68, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = '#9aa3ad'; x.beginPath(); x.roundRect(98, 168, 60, 50, 10); x.fill(); x.stroke(); x.strokeStyle = '#ffb300'; x.lineWidth = 10; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(128 + Math.cos(a) * 88, 104 + Math.sin(a) * 88); x.lineTo(128 + Math.cos(a) * 112, 104 + Math.sin(a) * 112); x.stroke(); } }, 256, 256, 1.1),
  zzz: emote((x) => { txt(x, 'z', 90, 60, 220, '#fff', '#141414'); txt(x, 'z', 120, 130, 150, '#fff', '#141414'); txt(x, 'Z', 150, 200, 110, '#fff', '#141414'); }, 256, 256, 1.2),
  quote: emote((x) => { bubble(x, 768, 384); txt(x, 'Those are some', 62, 384, 120, '#141414'); txt(x, 'HOT WHEELS!', 104, 384, 240, '#ff5a00', '#141414', 12); }, 768, 384, 4.0),
  tag: emote((x) => { x.fillStyle = '#ffd23f'; x.strokeStyle = '#141414'; x.lineWidth = 12; x.beginPath(); x.roundRect(10, 30, 492, 180, 34); x.fill(); x.stroke(); txt(x, '$150,000+', 96, 256, 155, '#141414'); }, 512, 256, 3.0),
  bang: emote((x) => { txt(x, '!', 230, 128, 215, '#ff2d2d', '#fff', 26); }, 256, 256, 1.2),
  wow: emote((x) => { txt(x, 'WOW!', 110, 192, 150, '#ffd23f', '#141414', 16); }, 384, 200, 2.0),
};

// ---------- toy cars ----------
function toy(color, type = 'coupe', sc = 0.16) {
  const c = car({ color, type, redline: true }), g = new THREE.Group(); c.scale.setScalar(sc); g.add(c);
  g.userData = { c, sc, roll(dist) { c.userData.wh.forEach(w => w.rotation.z = -dist / (c.userData.wr * sc)); } };
  return g;
}
const CANDY = [0xff2d55, 0x00b4ff, 0xffc21a, 0x23c16b, 0xb14cff, 0xff7a1a, 0x16d0c9, 0xff5fa8, 0x3d5afe, 0x9be22d, 0xe01f2d, 0x00c2a8, 0xffd23f, 0x8a5cf6, 0xff8a3d, 0x1b3fa0];
const TYPES = ['coupe', 'sedan', 'suv'];
// lightweight car for crowds
const miniG = (() => {
  const s = new THREE.Shape(); s.moveTo(-0.36, 0.05); s.lineTo(-0.37, 0.13); s.quadraticCurveTo(-0.36, 0.17, -0.3, 0.17); s.lineTo(0.2, 0.17); s.quadraticCurveTo(0.34, 0.15, 0.37, 0.1); s.lineTo(0.37, 0.05); s.lineTo(-0.36, 0.05);
  const c = new THREE.Shape(); c.moveTo(-0.27, 0.165); c.quadraticCurveTo(-0.2, 0.27, -0.1, 0.27); c.lineTo(0.03, 0.27); c.quadraticCurveTo(0.12, 0.25, 0.18, 0.165); c.lineTo(-0.27, 0.165);
  const ex = (sh, d) => new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -d / 2);
  return { body: ex(s, 0.27), cab: ex(c, 0.2), wheel: new THREE.CylinderGeometry(0.062, 0.062, 0.05, 14).rotateX(Math.PI / 2), rim: new THREE.CylinderGeometry(0.036, 0.036, 0.054, 10).rotateX(Math.PI / 2), tire: M(0x1b1b1e), rimM: M(0xdfe3e8), glass: M(0x1c2c3e) };
})();
function mini(color) {
  const g = new THREE.Group(); g.add(mesh(miniG.body, M(color)), mesh(miniG.cab, miniG.glass));
  for (const [x, z] of [[0.22, 0.14], [0.22, -0.14], [-0.21, 0.14], [-0.21, -0.14]]) g.add(mesh(miniG.wheel, miniG.tire, x, 0.062, z), noShadow(mesh(miniG.rim, miniG.rimM, x, 0.062, z)));
  return g;
}
// ---------- textures ----------
const PLANKS = (base, line) => (x, w, h) => { speckle(base, [line], 300, 2, 3)(x, w, h); x.globalAlpha = 0.55; x.fillStyle = line; for (let y = 0; y < h; y += 32) { x.fillRect(0, y, w, 2); for (let k = 0; k < 2; k++) x.fillRect((y * 7 + k * 131) % w, y, 2, 32); } };
const TILES = (a, b) => (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); };
const poster = (draw, w, h, x, y, z) => { const g = new THREE.Group(); g.add(box(w + 0.16, h + 0.16, 0.06, 0xffffff, 0, 0, 0), noShadow(mesh(new THREE.PlaneGeometry(w, h), B(0xffffff, { map: canvasTex(256, Math.round(256 * h / w), draw) }), 0, 0, 0.04))); g.position.set(x, y, z); return g; };
const SETS = {};
const newSet = (name) => { const g = new THREE.Group(); g.visible = false; scene.add(g); SETS[name] = g; return g; };

// ---------- orange track with a loop and a jump ----------
const PATH = (() => {
  const raw = [], R = 1.25, Y0 = 0.12, add = (x, y, z, d = true) => raw.push({ x, y, z, d });
  for (let u = 0; u < 1; u += 0.01) add(-10 + 4.5 * u, Y0 + 3.2 * (0.5 + 0.5 * Math.cos(Math.PI * u)), 0);
  for (let u = 0; u < 1; u += 0.02) add(-5.5 + 4 * u, Y0, 0);
  for (let u = 0; u < 1; u += 0.005) { const a = -Math.PI / 2 + u * 2 * Math.PI; add(-1.5 + R * Math.cos(a), Y0 + R + R * Math.sin(a), 0.62 * u); }
  for (let u = 0; u < 1; u += 0.02) add(-1.5 + 4.5 * u, Y0, 0.62);
  for (let u = 0; u < 1; u += 0.02) add(3 + 1.2 * u, Y0 + 0.7 * u * u, 0.62);
  for (let u = 0; u < 1; u += 0.02) add(4.2 + 2.4 * u, Y0 + 0.7 + 2.8 * u - 2.9 * u * u, 0.62, false);
  for (let u = 0; u < 1; u += 0.02) add(6.6 + 1.0 * u, Y0 + 0.6 * (1 - u) * (1 - u), 0.62);
  for (let u = 0; u <= 1; u += 0.01) add(7.6 + 8.4 * u, Y0, 0.62);
  const P = [], ds = 0.04; let acc = 0, len = 0;      // resample evenly by arc length
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1], b = raw[i], L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    while (acc <= L) { const f = L ? acc / L : 0; P.push({ x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f), d: a.d && b.d }); acc += ds; }
    acc -= L; len += L;
  }
  P.forEach((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], L = Math.hypot(b.x - a.x, b.y - a.y) || 1; p.tx = (b.x - a.x) / L; p.ty = (b.y - a.y) / L; });
  const table = []; let s = 0; const g = 4.6, y0 = P[0].y;                                   // gravity-driven run
  while (s < (P.length - 1) * ds) { table.push(s); const p = P[Math.min(P.length - 1, s / ds | 0)]; s += Math.sqrt(1.4 + 2 * g * Math.max(0, y0 - p.y)) / 120; }
  return { P, ds, table, runTime: table.length / 120,
    at(tt) { const s = table[Math.min(table.length - 1, Math.max(0, tt * 120 | 0))], i = Math.min(P.length - 2, s / ds | 0), f = s / ds - i, a = P[i], b = P[i + 1];
      return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f), ang: Math.atan2(lerp(a.ty, b.ty, f), lerp(a.tx, b.tx, f)), s }; } };
})();
function trackMesh() {
  const pos = [], w = 0.26, lip = 0.07, P = PATH.P;
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < P.length - 1; i++) {
    const p = P[i], q = P[i + 1]; if (!p.d || !q.d) continue;
    const v = (pt, z, n) => [pt.x - pt.ty * n, pt.y + pt.tx * n, pt.z + z];
    quad(v(p, -w, 0), v(p, w, 0), v(q, w, 0), v(q, -w, 0));
    quad(v(p, w, 0), v(p, w, lip), v(q, w, lip), v(q, w, 0)); quad(v(p, -w, lip), v(p, -w, 0), v(q, -w, 0), v(q, -w, lip));
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
  return mesh(geo, M(0xff7a00, { side: THREE.DoubleSide }));
}

// ---------- SET: bedroom ----------
const bed = newSet('bedroom'), runners = [], kids = [];
{
  const g = bed, r = RNG(21);
  g.add(ground(texOf(PLANKS('#e9b06f', '#b9793f'), 22, 9), 70, 28, 0, 3));
  g.add(box(70, 16, 0.4, M(0x62c4ff, { emissive: 0x62c4ff, emissiveIntensity: 0.32 }), 0, 8, -5.4), box(70, 0.5, 0.5, 0xffffff, 0, 0.25, -5.2), box(70, 0.25, 0.46, 0xffd23f, 0, 4.4, -5.25));
  for (let x = -30; x < 30; x += 2.2) g.add(noShadow(mesh(new THREE.CircleGeometry(0.16, 5), B(0xffffff, { transparent: true, opacity: 0.55 }), x + r() * 1.5, 5.2 + r() * 5, -5.18)));
  // window
  g.add(box(5.4, 4.0, 0.2, 0xffffff, 3.4, 7.6, -5.25), noShadow(mesh(new THREE.PlaneGeometry(5, 3.6), B(0xa8e4ff), 3.4, 7.6, -5.13)), noShadow(mesh(new THREE.CircleGeometry(0.7, 24), B(0xfff2a8), 4.7, 8.5, -5.12)), box(0.14, 3.6, 0.22, 0xffffff, 3.4, 7.6, -5.1), box(5, 0.14, 0.22, 0xffffff, 3.4, 7.6, -5.1));
  for (const sx of [-1, 1]) g.add(box(1.0, 4.6, 0.18, 0xff4d6d, 3.4 + sx * 3.1, 7.5, -5.0));
  g.add(poster((x) => { x.fillStyle = '#1b2a6b'; x.fillRect(0, 0, 256, 340); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(128, 50); x.quadraticCurveTo(180, 130, 165, 240); x.lineTo(91, 240); x.quadraticCurveTo(76, 130, 128, 50); x.fill(); x.fillStyle = '#ff3b3b'; x.beginPath(); x.moveTo(91, 240); x.lineTo(60, 290); x.lineTo(100, 262); x.fill(); x.beginPath(); x.moveTo(165, 240); x.lineTo(196, 290); x.lineTo(156, 262); x.fill(); x.fillStyle = '#4cc9f0'; x.beginPath(); x.arc(128, 140, 22, 0, 6.3); x.fill(); x.fillStyle = '#ffb21a'; x.beginPath(); x.moveTo(106, 262); x.lineTo(128, 320); x.lineTo(150, 262); x.fill(); }, 2.2, 2.9, -3.6, 7.6, -5.15));
  g.add(poster((x) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 2 ? '#141414' : '#fff'; x.fillRect(i * 32, j * 32, 32, 32); } }, 2.6, 1.95, 10.5, 8.0, -5.15));
  // bed + stack of books under the start of the track
  g.add(box(6, 1.0, 3.6, 0xfff7e8, -14.5, 1.3, -3.3), box(4.2, 1.06, 3.7, 0xff4d6d, -13.7, 1.3, -3.3), box(1.5, 0.45, 2.4, 0xffffff, -16.6, 2.0, -3.3), box(0.3, 3.6, 3.8, 0x3d5afe, -17.6, 1.8, -3.3), box(6, 0.8, 3.4, 0x8a5a2b, -14.5, 0.4, -3.3));
  [0x3d5afe, 0xffc21a, 0x23c16b, 0xff4d6d, 0xb14cff, 0xff7a1a].forEach((c, i) => g.add(box(1.5 - (i % 2) * 0.15, 0.52, 1.1, c, -10.35 + (i % 3) * 0.06, 0.26 + i * 0.52, 0.02), noShadow(box(0.04, 0.42, 1.0, 0xfff7e8, -9.62 + (i % 3) * 0.06 - (i % 2) * 0.075, 0.26 + i * 0.52, 0.02))));
  g.add(box(0.3, 0.1, 1.5, 0x9aa3ad, -1.5, 0.05, 0.31), box(0.2, 0.36, 0.7, 0x9aa3ad, 4.0, 0.3, 0.62), box(0.2, 0.26, 0.7, 0x9aa3ad, 6.9, 0.22, 0.62));
  const rug = noShadow(mesh(new THREE.CircleGeometry(4.6, 40), M(0x7b61ff), 1.5, 0.012, 1.2)); rug.rotation.x = -Math.PI / 2; g.add(rug);
  const rug2 = noShadow(mesh(new THREE.RingGeometry(3.4, 3.8, 40), M(0xffd23f), 1.5, 0.016, 1.2)); rug2.rotation.x = -Math.PI / 2; g.add(rug2);
  // shelf, toy chest, toys
  g.add(box(4.2, 5, 1, 0xffffff, 12.5, 2.5, -4.6), box(3.8, 0.12, 1.02, 0xffd23f, 12.5, 1.7, -4.55), box(3.8, 0.12, 1.02, 0xffd23f, 12.5, 3.3, -4.55));
  for (let i = 0; i < 14; i++) g.add(box(0.22, 1.0 + r() * 0.3, 0.7, CANDY[i], 10.9 + i * 0.24, (i % 2 ? 2.35 : 3.95), -4.2));
  g.add(sph(0.7, 0xff4d6d, 11.5, 0.7, -2.6), sph(0.5, 0x00b4ff, 16.5, 0.5, -1.4), box(0.9, 0.9, 0.9, 0x23c16b, 15, 0.45, -3.2), box(0.9, 0.9, 0.9, 0xffc21a, 15.5, 1.35, -3.3), box(0.9, 0.9, 0.9, 0xb14cff, 16.1, 0.45, -3.4));
  g.add(trackMesh());
  for (let k = 0; k < 5; k++) { const c = toy(CANDY[[0, 1, 2, 3, 5][k]], TYPES[k % 3], 0.15); g.add(c); runners.push(c); }
  kids.push(guy({ scale: 0.98, hat: 'cap' }), guy({ scale: 0.92, hat: 'bow', face: -1 })); g.add(...kids);
}
const RUN_GAP = 1.25, RUN_PERIOD = Math.ceil((PATH.runTime + 0.4) / RUN_GAP) * RUN_GAP;
function runCars(tt) {
  runners.forEach((c, k) => { const lt = (((tt - k * RUN_GAP) % RUN_PERIOD) + RUN_PERIOD) % RUN_PERIOD, p = PATH.at(lt);
    c.position.set(p.x - Math.sin(p.ang) * 0.005, p.y + 0.01, p.z); c.rotation.z = p.ang; c.userData.roll(p.s); c.userData.p = p; });
}

// ---------- SET: toy shop ----------
const shop = newSet('shop'), dull = new THREE.Group(), first16 = new THREE.Group(), hero = toy(0x1b3fa0, 'coupe', 0.34), turntable = new THREE.Group();
{
  const g = shop, r = RNG(33);
  g.add(ground(texOf(TILES('#ffffff', '#58d6c9'), 26, 11), 70, 30, 0, 3));
  g.add(box(70, 16, 0.4, M(0xffc93c, { emissive: 0xffc93c, emissiveIntensity: 0.32 }), 0, 8, -4.9), box(70, 0.5, 0.5, 0xff7a1a, 0, 0.25, -4.7));
  for (let x = -24; x < 24; x += 1.2) g.add(box(1.2, 1.1, 0.5, (x / 1.2 | 0) % 2 ? 0xff4d6d : 0xffffff, x + 0.6, 10.4, -4.5));
  for (const y of [2.2, 4.3, 6.4]) { g.add(box(40, 0.16, 1.2, 0xffffff, 0, y, -4.2));
    for (let x = -19; x < 19; x += 1.0 + r() * 0.5) { const k = r(), c = CANDY[r() * 16 | 0]; g.add(k < 0.45 ? box(0.7 + r() * 0.3, 0.8 + r() * 0.7, 0.7, c, x, y + 0.5 + (k * 0.6), -4.2) : k < 0.75 ? sph(0.42, c, x, y + 0.5, -4.2) : cyl(0.3, 0.38, 0.9, c, x, y + 0.53, -4.2)); } }
  g.add(poster((x) => { x.fillStyle = '#ff4d6d'; x.fillRect(0, 0, 256, 96); txt(x, 'TOYS', 78, 128, 76, '#fff', '#141414', 10); }, 5.4, 2.0, 0, 9.0, -4.6));
  g.add(box(8, 0.2, 2.6, 0xffffff, 0, 1.1, 0.2), box(7.6, 1.0, 2.2, 0xff4d6d, 0, 0.5, 0.2));
  [0x8a8f98, 0x9a8468, 0x7d8a6b, 0x8d8292, 0xa39c8a].forEach((c, i) => { const t = toy(c, i % 2 ? 'suv' : 'sedan', 0.16); t.position.set(-2.6 + i * 1.3, 1.2, 0.3 + (i % 2) * 0.3); t.rotation.y = 0.25 * (i % 2 ? 1 : -1); dull.add(t); });
  first16.add(box(7.6, 0.5, 1.0, 0xffffff, 0, 1.45, -0.45), box(7.6, 0.08, 1.02, 0xff7a1a, 0, 1.72, -0.45));
  CANDY.forEach((c, i) => { const row = i < 8 ? 0 : 1, t = toy(c, TYPES[(i * 7) % 3], 0.125); t.position.set(-3.15 + (i % 8) * 0.9, row ? 1.76 : 1.2, row ? -0.45 : 0.55); t.rotation.y = 0.35; first16.add(t); });
  turntable.add(cyl(1.25, 1.35, 0.5, 0xffffff, 0, 0.25, 0, 32), cyl(1.15, 1.15, 0.1, 0xffd23f, 0, 0.55, 0, 32), hero); hero.position.y = 0.6; turntable.position.set(0, 0, 3.0);
  g.add(dull, first16, turntable);
}
const boredKid = guy({ scale: 0.8, hat: 'cap' }), handler = guy({ tie: 0xe63946, glasses: true }), shopKids = [guy({ scale: 0.8, hat: 'cap' }), guy({ scale: 0.76, hat: 'bow', face: -1 }), guy({ scale: 0.7 }), guy({ scale: 0.78, face: -1 })];
shop.add(boredKid, handler, ...shopKids);

// ---------- SET: design studio ----------
const studio = newSet('studio'), proto = toy(0xcfd6de, 'coupe', 0.2), zoomCar = toy(0xff5a00, 'coupe', 0.2), streak = puffs(10, 0xffb347);
const designer = guy({ glasses: true }), engineer = guy({ face: -1, hat: 'cap' }), boss = guy({ tie: 0xe63946, glasses: true });
{
  const g = studio;
  g.add(ground(texOf(PLANKS('#f2c98f', '#c9955a'), 22, 9), 70, 28, 0, 3));
  g.add(box(70, 16, 0.4, M(0x21c7b5, { emissive: 0x21c7b5, emissiveIntensity: 0.32 }), 0, 8, -4.9), box(70, 0.5, 0.5, 0xffffff, 0, 0.25, -4.7), box(70, 0.3, 0.46, 0x129d8f, 0, 3.2, -4.75));
  g.add(box(7.4, 4.2, 0.2, 0xffffff, -10, 7.2, -4.75), noShadow(mesh(new THREE.PlaneGeometry(7, 3.8), B(0xa8e4ff), -10, 7.2, -4.62)), box(0.14, 3.8, 0.22, 0xffffff, -10, 7.2, -4.6));
  g.add(poster((x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 150); x.strokeStyle = '#141414'; x.lineWidth = 6; for (const cx of [70, 186]) { x.beginPath(); x.arc(cx, 80, 36, 0, 6.3); x.stroke(); x.beginPath(); x.arc(cx, 80, 8, 0, 6.3); x.fill(); } x.strokeStyle = '#ff5a00'; x.lineWidth = 4; x.beginPath(); x.moveTo(70, 80); x.lineTo(186, 80); x.stroke(); txt(x, 'thin axle', 20, 128, 30, '#ff5a00'); txt(x, 'low friction', 20, 128, 142, '#3d5afe'); }, 4.6, 2.7, 6.4, 6.6, -4.6));
  // drafting table with blueprint
  const board = new THREE.Group(); board.add(box(3.6, 2.4, 0.12, 0xf7ecd4, 0, 0, 0), noShadow(mesh(new THREE.PlaneGeometry(3.2, 2.0), B(0xffffff, { map: canvasTex(384, 240, (x) => { x.fillStyle = '#2a5fd0'; x.fillRect(0, 0, 384, 240); x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; for (let i = 0; i < 384; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 240); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(384, i); x.stroke(); } x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(40, 160); x.lineTo(46, 120); x.quadraticCurveTo(110, 112, 140, 70); x.lineTo(230, 68); x.quadraticCurveTo(290, 112, 340, 124); x.lineTo(346, 160); x.closePath(); x.stroke(); for (const cx of [105, 285]) { x.beginPath(); x.arc(cx, 162, 30, 0, 6.3); x.stroke(); } }) }), 0, 0, 0.07)));
  board.position.set(-4.6, 2.9, -1.6); board.rotation.x = -0.32; g.add(board, box(0.16, 2.4, 0.16, 0x6b4a2b, -5.8, 1.2, -1.8), box(0.16, 2.4, 0.16, 0x6b4a2b, -3.4, 1.2, -1.8));
  // rocket model on a side table
  g.add(box(2.0, 0.14, 1.3, 0xffffff, 5.6, 1.5, -1.6), box(0.14, 1.5, 0.14, 0x6b4a2b, 4.8, 0.75, -1.6), box(0.14, 1.5, 0.14, 0x6b4a2b, 6.4, 0.75, -1.6), cyl(0.28, 0.28, 1.5, 0xffffff, 5.6, 2.5, -1.6), mesh(new THREE.ConeGeometry(0.28, 0.6, 20), 0xe63946, 5.6, 3.55, -1.6), cyl(0.3, 0.3, 0.16, 0x3d5afe, 5.6, 2.7, -1.6));
  for (let i = 0; i < 3; i++) g.add(rot(box(0.5, 0.5, 0.05, 0xe63946, 5.6 + Math.cos(i * 2.1) * 0.36, 1.9, -1.6 + Math.sin(i * 2.1) * 0.36), 0, -i * 2.1, 0));
  // workbench with a little test ramp
  g.add(box(4.4, 0.16, 1.7, 0xffffff, 0.5, 1.5, -1.2), box(4.0, 1.4, 1.3, 0xffb21a, 0.5, 0.72, -1.2));
  g.add(rot(box(1.8, 0.05, 0.5, M(0xff7a00), -0.75, 1.93, -1.2), 0, 0, -0.42), box(0.12, 0.72, 0.5, 0x9aa3ad, -1.5, 1.94, -1.2), box(2.2, 0.05, 0.5, M(0xff7a00), 1.15, 1.6, -1.2));
  g.add(proto, zoomCar, streak, designer, engineer, boss);
}

// ---------- SET: museum ----------
const museum = newSet('museum'), van = toy(0xff5fa8, 'suv', 0.3), sparkles = [], collector = guy({ glasses: true, hat: 'top' }), visitor = guy({ scale: 0.8, hat: 'bow', face: -1 });
{
  const g = museum;
  g.add(ground(texOf(TILES('#5a4ab8', '#4a3aa0'), 20, 9), 70, 30, 0, 3));
  g.add(box(70, 16, 0.4, M(0x2a2f9a, { emissive: 0x2a2f9a, emissiveIntensity: 0.32 }), 0, 8, -5.2), box(70, 0.6, 0.5, 0xffc93c, 0, 0.3, -5.0), box(70, 0.3, 0.46, 0xffc93c, 0, 9.6, -5.05));
  [[-9, 0xff4d6d, 0x00b4ff], [-4.6, 0x23c16b, 0xffc21a], [4.6, 0xb14cff, 0xff7a1a], [9, 0x16d0c9, 0xff2d55]].forEach(([x, bg, cc]) => { g.add(box(3.4, 2.6, 0.16, 0xffc93c, x, 6.2, -5.05), noShadow(box(3.0, 2.2, 0.18, bg, x, 6.2, -5.02))); const m = mini(cc); m.scale.setScalar(3); m.position.set(x, 5.6, -4.8); g.add(m); });
  g.add(cyl(1.0, 1.15, 1.7, 0xffffff, 0, 0.85, 0, 32), cyl(1.2, 1.2, 0.14, 0xffc93c, 0, 1.75, 0, 32), cyl(1.25, 1.3, 0.14, 0xffc93c, 0, 0.07, 0, 32));
  van.position.set(0, 1.83, 0); van.rotation.y = 0.5; g.add(van);
  for (const [z, c] of [[0.1, 0xffd23f], [-0.1, 0x00b4ff]]) { const sb = mesh(new THREE.CapsuleGeometry(0.4, 3.2, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.16, 1), M(c), -2.6, 1.42, z * 3); van.userData.c.add(sb); }
  const dome = noShadow(mesh(new THREE.SphereGeometry(1.15, 32, 16, 0, 6.3, 0, Math.PI / 2), M(0xcfefff, { transparent: true, opacity: 0.2, depthWrite: false }), 0, 1.8, 0)); dome.renderOrder = 5; g.add(dome);
  g.add(noShadow(mesh(new THREE.ConeGeometry(2.6, 9, 32, 1, true), B(0xfff0a8, { transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 6.2, 0)), glow(0xfff0a8, 6, 0, 2.4, 0.4, 0.5));
  for (const x of [-3.6, -1.8, 1.8, 3.6]) g.add(cyl(0.07, 0.07, 1.3, 0xffc93c, x, 0.65, 2.3, 10), sph(0.13, 0xffc93c, x, 1.36, 2.3), cyl(0.22, 0.26, 0.1, 0xffc93c, x, 0.05, 2.3, 14));
  g.add(box(1.8, 0.09, 0.09, 0xe01f2d, -2.7, 1.12, 2.3), box(1.8, 0.09, 0.09, 0xe01f2d, 2.7, 1.12, 2.3));
  for (let i = 0; i < 12; i++) { const s = glow(0xffffff, 0.5, Math.cos(i * 1.9) * (1.0 + (i % 3) * 0.35), 2.0 + (i % 5) * 0.32, 0.6 + Math.sin(i * 1.9) * 0.6, 0); g.add(s); sparkles.push(s); }
  const mag = new THREE.Group(); mag.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24), B(0x141414)), noShadow(mesh(new THREE.CircleGeometry(0.2, 20), B(0xbfeaff, { transparent: true, opacity: 0.5 }))), rot(box(0.06, 0.34, 0.04, B(0x141414), 0.2, -0.33, 0), 0, 0, 0.5)); mag.position.set(0, -0.56, 0.02); collector.userData.armL[1].add(mag);
  g.add(collector, visitor);
}

// ---------- SET: outdoors — a river of cars ----------
const outdoor = newSet('outdoor'), crowd = [], fans = [];
{
  const g = outdoor, r = RNG(55);
  g.add(ground(texOf(GRASS('#5fcf3f', '#48b432', '#86e25a'), 120, 70), 900, 440, 60, -60));
  g.add(box(900, 0.08, 2.5, M(0xff7a00), 60, 0.04, 0), box(900, 0.22, 0.1, M(0xff9a2e), 60, 0.11, 1.28), box(900, 0.22, 0.1, M(0xff9a2e), 60, 0.11, -1.28));
  for (const z of [-0.62, 0, 0.62]) g.add(noShadow(box(900, 0.01, 0.03, B(0xffb866), 60, 0.085, z)));
  for (let x = -40; x < 200; x += 1.7) { const t = tree(r); t.position.set(x + r() * 2, 0, -7 - r() * r() * 40); g.add(t);
    if (r() < 0.5) g.add(sph(0.4 + r() * 0.35, 0x3fae4a, x + r() * 2, 0.15, -3.4 - r() * 1.5));
    for (let k = 0; k < 3; k++) g.add(noShadow(sph(0.07, FLOWERS[r() * 6 | 0], x + r() * 2, 0.1, r() < 0.5 ? -1.8 - r() * 2 : 1.8 + r() * 1.6))); }
  for (let i = 0; i < 18; i++) { const h = noShadow(mesh(new THREE.SphereGeometry(22 + r() * 16, 24, 12), M(0x3fae4a), -90 + i * 18 + r() * 8, -9, -80 - r() * 35)); h.scale.y = 0.5 + r() * 0.3; g.add(h); }
  clouds(g, 60); birds(g, 6, 3, 9, -12);
  for (let i = 0; i < 90; i++) { const m = mini(CANDY[i % 16]); m.userData = { lane: i % 4, x0: i * 1.55 + r() * 0.5, v: 5.5 + (i % 4) * 0.7 + r() * 0.4 }; m.position.z = -0.93 + (i % 4) * 0.62; m.position.y = 0.085; g.add(m); crowd.push(m); }
  for (let i = 0; i < 6; i++) { const f = guy({ scale: 0.78, hat: [null, 'cap', 'bow'][i % 3], face: 1 }); f.userData.fx = i * 7.5; g.add(f); fans.push(f); }
}
EM.zzz.build(shop); EM.bulb.build(shop); EM.quote.build(studio); EM.bang.build(studio); EM.tag.build(museum); EM.wow.build(museum);
const kneel = (t) => ({ hipL: 1.35, kneeL: -1.5, hipR: -0.1, kneeR: -1.5, shL: 1.0 + 0.1 * Math.sin(t * 2), elL: 0.35, shR: 0.7, elR: 0.3, lean: 0.45, mouth: 0.6 });

// ---------- moods ----------
const MOOD = {
  room: { bg: 0x62c4ff, fog: [0x62c4ff, 60, 200], sun: [0xfff6e0, 2.3, [-8, 18, 14]], hemi: [0xffffff, 0xe9b06f, 1.6] },
  shop: { bg: 0xffc93c, fog: [0xffc93c, 60, 200], sun: [0xfff6e0, 2.3, [8, 18, 14]], hemi: [0xffffff, 0x9fe8df, 1.65] },
  studio: { bg: 0x21c7b5, fog: [0x21c7b5, 60, 200], sun: [0xfff6e0, 2.3, [-10, 18, 14]], hemi: [0xffffff, 0xf2c98f, 1.6] },
  museum: { bg: 0x2a2f9a, fog: [0x2a2f9a, 40, 160], sun: [0xffe9b0, 1.7, [3, 20, 10]], hemi: [0xc8c4ff, 0x5a4ab8, 1.25] },
  day: { bg: sky([[0, '#1668e0'], [0.4, '#3f9cf5'], [0.62, '#8fd0ff'], [0.75, '#d6f1ff']]), fog: [0xd6f1ff, 90, 420], sun: [0xfff6e0, 2.6, [10, 22, 14]], hemi: [0xe6f4ff, 0x6fd44b, 1.55] },
  sunset: { bg: 0xff9a6a, fog: [0xffb38a, 60, 200], sun: [0xffc08a, 2.9, [14, 9, 12]], hemi: [0xffe6d8, 0xf0a868, 1.75] },
};
const focus = new THREE.Vector3();
function look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); focus.set(tx, 0, 0); }
const L0 = (i, k) => TL.scenes[i].lines[k].t0 - TL.scenes[i].start;   // local start time of line k in scene i
const bedroomKids = (t, cheer) => {
  place(kids[0], -6.0, -1.6, 1, cheer ? hop(t) : 0); place(kids[1], 2.4, -1.7, -1, cheer ? hop(t, 1.3) : 0);
  kids.forEach((k, i) => pose(k, cheer ? cheerPose(t + i) : { ...standPose(t), mouth: 0.5 }));
};
const S = [
  // 0 — hook: a car flies down the track; then the whole room; then the title
  { set: 'bedroom', mood: 'room', update(t, d) {
    const a = L0(0, 1), b = L0(0, 2); runCars(t + 0.2); bedroomKids(t, t > a);
    if (t < a) { const p = runners[0].userData.p, cx = clamp(p.x, -9.5, 13); look(cx + 0.8, p.y * 0.6 + 0.6, 2.9, cx + 0.25, p.y * 0.85 + 0.15, 0.3); }
    else if (t < b) { const q = smooth((t - a) / (b - a)); look(lerp(-6.5, -1, q), 2.7, 10.2, lerp(-4.5, -0.5, q), 1.7, 0); }
    else { const q = smooth((t - b) / (d - b)); look(lerp(1.5, 0.5, q), lerp(2.2, 1.9, q), lerp(8.6, 7.2, q), -0.9, 1.9, 0.3); }
  } },
  // 1 — the 1960s: plain toy cars, and a man with an idea
  { set: 'shop', mood: 'shop', label: ['1960s', 'Toy cars were… a little plain'], update(t, d) {
    const a = L0(1, 1), b = L0(1, 2); dull.visible = true; first16.visible = turntable.visible = false; shopKids.forEach(k => k.visible = false);
    boredKid.visible = handler.visible = true;
    place(boredKid, -4.9, 0.4, 1); pose(boredKid, boredPose(t)); place(handler, 6.0, 0.6, -1, t > b ? hop(t) * (t < b + 1 ? 1 : 0) : 0);
    pose(handler, t > b ? { ...pointPose(t), shL: 2.6, head: 0.15 } : t > a ? thinkPose(t) : standPose(t));
    EM.zzz.show(-4.3, 3.3 + 0.1 * Math.sin(t * 2), 0.4, t < a ? clamp((t - 1) / 0.4) : 0);
    EM.bulb.show(6.0, 3.75 + 0.06 * Math.sin(t * 5), 0.6, clamp((t - b - 0.1) / 0.3));
    if (t < a) { const q = smooth(t / a); look(lerp(-4.6, -3.2, q), 2.3, lerp(8.6, 7.2, q), lerp(-3.0, -2.6, q), 1.6, 0.2); }
    else { const q = smooth((t - a) / (d - a)); look(lerp(3.4, 4.6, q), 2.3, lerp(8.2, 6.6, q), lerp(3.8, 5.0, q), 1.95, 0.4); }
  } },
  // 2 — the dream team, and the fast wheels
  { set: 'studio', mood: 'studio', label: ['The team', 'A car designer + a missile engineer'], update(t, d) {
    const a = L0(2, 1), fly = a + 3.6; boss.visible = false; zoomCar.visible = false; streak.visible = false;
    place(designer, -6.6, -0.9, 1); pose(designer, { hipL: 0.09, hipR: -0.09, shL: 1.5 + 0.12 * Math.sin(t * 7), elL: 0.5 + 0.1 * Math.sin(t * 9), shR: -0.2, elR: 0.6, lean: 0.12 });
    place(engineer, 7.3, -1.0, -1); pose(engineer, { hipL: 0.09, hipR: -0.09, shL: 1.2 + 0.2 * Math.sin(t * 4), elL: 0.9, shR: -0.1, elR: 0.4, lean: 0.1, mouth: 0.5 });
    // prototype rolls down the little ramp again and again, then shoots off
    const cyc = (t - a) % 1.8, u = t < a ? 0 : t > fly ? 1 + (t - fly) * 5 : clamp(cyc / 1.0) ** 2;
    const px = lerp(-1.45, 0.05, Math.min(u, 1)) + Math.max(0, u - 1) * 2.2, ramp = px < 0.05;
    proto.position.set(px, ramp ? 1.63 + (0.05 - px) * 0.447 : 1.63, -1.2); proto.rotation.z = ramp ? -0.42 : 0; proto.userData.roll(px * (t > fly ? 1 : 1) + t * (t > a ? 6 : 0));
    if (t < a) { const q = smooth(t / a); look(lerp(-2, 2, q), 2.6, 10.8, lerp(-0.6, 0.6, q), 2.25, -1); }
    else { const q = smooth((t - a) / (d - a)); look(lerp(-1.2, 1.6, q), 2.25, lerp(3.4, 4.2, q), lerp(-0.6, 0.9, q), 1.75, -1.2); }
  } },
  // 3 — "Those are some hot wheels!"
  { set: 'studio', mood: 'studio', label: ['The name', '“Those are some hot wheels!”'], update(t, d) {
    const a = L0(3, 1), b = L0(3, 2), tz = 3.0, x = -16 + (t - 1.6) * 13; boss.visible = zoomCar.visible = streak.visible = true;
    proto.position.set(0.4, 1.63, -1.2); proto.rotation.z = 0;
    zoomCar.position.set(x, 0.01, 1.7); zoomCar.userData.roll(x); streak.position.set(x - 0.5, 0.25, 1.7); streak.userData.update(t, 1.6, -3.2, 0.5, 0.55, x > -15 && x < 22 ? 0.9 : 0);
    const jump = t > tz && t < tz + 0.7 ? 0.7 * Math.sin((t - tz) / 0.7 * Math.PI) : 0, said = t > a;
    place(boss, 1.6, 0.2, x > 1.6 || said ? 1 : -1, jump + (t > b ? hop(t) : 0));
    pose(boss, t > b ? cheerPose(t) : said ? pointPose(t) : jump ? { hipL: 0.5, hipR: -0.5, shL: 2.4, shR: -2.4, elL: 0.3, elR: -0.3, mouth: 1.2 } : { ...standPose(t), head: t > 1.8 ? -0.1 : 0 });
    place(designer, -6.6, -0.9, 1, t > b ? hop(t, 1) : 0); pose(designer, t > b ? cheerPose(t + 1) : standPose(t));
    place(engineer, 7.3, -1.0, -1, t > b ? hop(t, 2) : 0); pose(engineer, t > b ? cheerPose(t + 2) : standPose(t));
    EM.bang.show(1.6, 3.9, 0.2, t < a ? clamp((t - tz) / 0.2) * (1 - smooth((t - tz - 1.2) / 0.3)) : 0);
    EM.quote.show(4.5, 4.45, 0.2, clamp((t - a) / 0.3) * (1 - smooth((t - d + 0.5) / 0.3)));
    const q = smooth(t / d); look(lerp(-1.2, 2.2, q), lerp(2.5, 2.3, q), lerp(10.6, 8.8, q), lerp(0.6, 2.6, q), 2.4, 0);
  } },
  // 4 — 1968: the first sixteen
  { set: 'shop', mood: 'shop', label: ['1968', 'The first sixteen cars'], update(t, d) {
    const a = L0(4, 1); dull.visible = false; first16.visible = turntable.visible = true; boredKid.visible = handler.visible = false;
    shopKids.forEach((k, i) => { k.visible = true; place(k, [-5.6, 5.6, -3.4, 3.5][i], [0.6, 0.6, -1.4, -1.4][i], i % 2 ? -1 : 1, hop(t, i * 1.1)); pose(k, cheerPose(t + i)); });
    turntable.rotation.y = t * 0.9; hero.userData.roll(t * 2);
    if (t < a) { const q = smooth(t / a), ang = lerp(-0.7, 0.5, q), dist = lerp(3.4, 8.5, smooth((t - 2.5) / (a - 2.5))); look(Math.sin(ang) * dist, lerp(1.7, 2.9, q), 3.0 + Math.cos(ang) * dist, 0, lerp(1.0, 1.5, q), lerp(3.0, 1.2, q)); }
    else { const q = smooth((t - a) / (d - a)); look(lerp(-3.6, 3.2, q), 2.3, 4.6, lerp(-2.6, 2.4, q), 1.5, 0); }
  } },
  // 5 — orange track: loops and jumps
  { set: 'bedroom', mood: 'room', label: ['Orange track', 'Loops · jumps · gravity'], update(t, d) {
    runCars(t + 3.1); bedroomKids(t, true); const q = smooth(t / d); look(lerp(-7, 5.5, q), lerp(3.0, 2.2, q), lerp(11.5, 9.5, q), lerp(-5, 4, q), 1.5, 0.3);
  } },
  // 6 — the treasure
  { set: 'museum', mood: 'museum', label: ['1969', 'The pink Beach Bomb prototype'], update(t, d) {
    const a = L0(6, 1), price = a + 5.3;
    place(collector, -3.0, 1.2, 1); pose(collector, { hipL: 0.09, hipR: -0.09, shL: 1.45, elL: 0.75 + 0.06 * Math.sin(t * 2), shR: -0.3, elR: 1.1, lean: 0.3, head: -0.05 });
    place(visitor, 3.3, 1.3, -1, t > price ? hop(t) : 0); pose(visitor, t > price ? cheerPose(t) : { ...standPose(t), shL: 1.3, elL: 1.9, mouth: 0.9 });
    van.rotation.y = 0.5 + 0.25 * Math.sin(t * 0.6);
    sparkles.forEach((s, i) => { s.material.opacity = Math.max(0, Math.sin(t * 3 + i * 1.7)) ** 3; s.scale.setScalar(0.3 + 0.5 * Math.max(0, Math.sin(t * 3 + i * 1.7))); });
    EM.tag.show(2.9, 4.55, 0.5, clamp((t - price) / 0.3) * (1 - smooth((t - d + 0.5) / 0.3))); EM.wow.show(3.3, 3.35, 1.3, 0);
    if (t < a) { const q = smooth(t / a); look(lerp(-3, -1, q), 3.0, lerp(11, 9.4, q), 0, 2.3, 0); }
    else { const q = smooth((t - a) / (d - a)); look(lerp(-1.4, 1.2, q), lerp(2.6, 2.9, q), lerp(6.2, 8.6, smooth((t - price + 1) / 1.5)), lerp(0, 0.6, smooth((t - price + 1) / 1.5)), lerp(2.2, 2.6, q), 0); }
  } },
  // 7 — today: eight billion
  { set: 'outdoor', mood: 'day', label: ['Today', ''], update(t, d) {
    const cx = 20 + t * 5.2;
    crowd.forEach(m => { const u = m.userData, x = ((u.x0 + u.v * t) % 140 + 140) % 140 - 30; m.position.x = x + Math.floor((cx - x + 70) / 140) * 140; });
    fans.forEach((f, i) => { const fx = cx - 12 + ((f.userData.fx - cx * 0.0 + 4500) % 45); place(f, f.userData.fx + Math.floor((cx - f.userData.fx + 22) / 45) * 45, -2.3 - (i % 2) * 0.5, 1, hop(t, i)); pose(f, cheerPose(t + i)); });
    const q = smooth(t / d); look(cx + lerp(7.5, 5.5, q), lerp(1.2, 2.0, q), lerp(4.2, 5.2, q), cx - 0.5, 0.75, -0.5);
  } },
  // 8 — small cars, big dreams
  { set: 'bedroom', mood: 'sunset', update(t, d) {
    runners.forEach((c, k) => { c.position.set(6.2 + k * 0.95, 0.13, 0.62); c.rotation.z = 0; });
    const x = -2.6 + 0.5 * t; runners[0].position.set(x + 0.9, 0.01, 2.2); runners[0].userData.roll(x);
    place(kids[0], x, 2.2, 1, -0.5); pose(kids[0], kneel(t)); place(kids[1], x + 3.4, 1.6, -1, hop(t) * 0.5); pose(kids[1], cheerPose(t));
    const q = smooth(t / d); look(lerp(0.5, -0.4, q) + x * 0.6, lerp(1.5, 2.4, q), lerp(6.2, 8.6, q), x * 0.6 + 0.6, lerp(0.9, 1.5, q), 1.6);
  } },
];

// ---------- overlay + frame loop ----------
const subs = TL.scenes.flatMap(s => s.subs), fmt = (n) => Math.round(n).toLocaleString('en-US');
function overlay(t, i, lt, d) {
  const s = S[i], last = i === S.length - 1;
  const c = subs.find(c => t >= c.t0 - 0.05 && t < c.t1 + 0.1);
  $('sub').style.opacity = c ? 1 : 0; if (c) $('sub').textContent = c.text;
  const la = s.label ? smooth((lt - 0.4) / 0.4) * (1 - smooth((lt - d + 0.5) / 0.3)) : 0;
  $('chip').style.opacity = la; $('chip').style.transform = `translateX(${(1 - la) * -40}px)`;
  if (s.label) { $('year').textContent = s.label[0]; $('note').textContent = s.label[1]; $('note').style.display = s.label[1] ? '' : 'none'; }
  const ta = i === 0 ? smooth((lt - L0(0, 2) + 0.1) / 0.5) * (1 - smooth((lt - d + 0.45) / 0.3)) : 0;
  $('title').style.opacity = ta; $('title').style.transform = `scale(${0.9 + 0.1 * ta})`;
  const ea = last ? smooth((lt - 4.3) / 0.7) : 0; $('end').style.opacity = ea; $('endShade').style.opacity = ea * 0.9;
  if (i === 7) { const b = L0(7, 1), n = 8e9 * smooth((lt - 0.6) / 2.6) ** 2, a = smooth((lt - 0.5) / 0.4) * (1 - smooth((lt - d + 0.5) / 0.3));
    $('count').style.opacity = a; $('num').textContent = fmt(n) + (n >= 8e9 - 1 ? '+' : ''); $('rate').style.opacity = smooth((lt - b) / 0.3); $('sold').textContent = fmt(Math.max(0, lt - b) * 16.5); }
  else $('count').style.opacity = 0;
  let f = Math.max(1 - lt / 0.35, 1 - (d - lt) / 0.35, 0);
  if (i === 0) f = Math.max(1 - lt / 0.7, 1 - (d - lt) / 0.35, 0);
  if (last) f = Math.max(1 - lt / 0.35, 1 - (d - lt) / 1.1, 0);
  $('fade').style.opacity = clamp(f); $('bar').style.width = (t / TL.duration * 100) + '%';
}
const camPos = new THREE.Vector3(), wp = new THREE.Vector3();
window.renderFrame = (t) => {
  t = clamp(t, 0, TL.duration - 1e-3);
  let i = TL.scenes.findIndex(s => t < s.end); if (i < 0) i = S.length - 1;
  const sc = TL.scenes[i], lt = t - sc.start, d = sc.end - sc.start, s = S[i], m = MOOD[s.mood];
  Object.entries(SETS).forEach(([k, g]) => g.visible = k === s.set);
  scene.background = m.bg.isTexture ? m.bg : new THREE.Color(m.bg); scene.fog = new THREE.Fog(...m.fog);
  sun.color.set(m.sun[0]); sun.intensity = m.sun[1]; hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
  Object.values(EM).forEach(e => e.hide()); s.update(lt, d);
  (SETS[s.set].userData.tick || []).forEach(f => f(t));
  sun.target.position.copy(focus); sun.position.set(focus.x + m.sun[2][0] * 2, m.sun[2][1] * 2, m.sun[2][2] * 2);
  camera.updateMatrixWorld(); camPos.copy(camera.position);
  figures.forEach(f => { f.getWorldPosition(wp); f.rotation.y = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) * 0.85; });
  renderer.render(scene, camera); overlay(t, i, lt, d);
};
window.DURATION = TL.duration;
await document.fonts.ready;
await Promise.all(['600', '800'].map(w => document.fonts.load(`${w} 40px Poppins`)));
window.renderFrame(0);
window.READY = true;
