// Major Somnath Sharma, Battle of Badgam 1947 — short round cartoon soldiers in a vibrant cel-shaded (anime-style) 3D world.
// Fully deterministic: window.renderFrame(t) draws the frame for time t (seconds).
import * as THREE from 'three';

const W = 1080, H = 1920;
const TL = await (await fetch('build/timeline.json')).json();
const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 900);
const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 140 });
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

// ---------- 2D stick figure ----------
const INK = new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.DoubleSide });
const PAPER = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const figures = [];
function seg(len, th = 0.085) {            // limb: pivot at origin, extends along -Y
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.CapsuleGeometry(th / 2, len, 3, 10), INK);
  a.position.y = -len / 2; a.scale.z = 0.12; a.castShadow = true;
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(th / 2 + 0.032, len, 3, 10), PAPER);
  b.position.set(0, -len / 2, -0.03); b.scale.z = 0.08;
  g.add(a, b); return g;
}
function flat(geo, x, y, parent, grow = 0.035) {   // flat inked shape with paper outline
  const a = new THREE.Mesh(geo, INK); a.position.set(x, y, 0.006); a.castShadow = true;
  geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3());
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  const b = new THREE.Mesh(geo, PAPER);
  const sx = 1 + 2 * grow / s.x, sy = 1 + 2 * grow / s.y;
  b.scale.set(sx, sy, 1); b.position.set(x - c.x * (sx - 1), y - c.y * (sy - 1), -0.03);
  parent.add(a, b);
}
const tri = (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
function pose(f, p) {
  const u = f.userData;
  u.torsoP.rotation.z = -(p.lean || 0);
  u.legL[0].rotation.z = p.hipL ?? 0; u.legL[1].rotation.z = p.kneeL ?? 0;
  u.legR[0].rotation.z = p.hipR ?? 0; u.legR[1].rotation.z = p.kneeR ?? 0;
  u.armL[0].rotation.z = p.shL ?? 0; u.armL[1].rotation.z = p.elL ?? 0;
  u.armR[0].rotation.z = p.shR ?? 0; u.armR[1].rotation.z = p.elR ?? 0;
  u.head.rotation.z = p.head ?? 0;
  if (u.skirt) u.skirt.rotation.z = p.skirt ?? 0;
}
const STAND_Y = 0.9;
const sitPose = (reach = 0.95, w = 0) => ({ hipL: 1.5, kneeL: -1.4, hipR: 1.36, kneeR: -1.3, shL: reach + w, elL: 0.5, shR: reach - 0.12 - w, elR: 0.45, lean: 0.04, skirt: 0.75 });
const standPose = (w = 0) => ({ hipL: 0.07, hipR: -0.07, shL: 0.1 + w, shR: -0.1, elL: 0.1, elR: 0.1 });
const cheerPose = (t) => ({ hipL: 0.08, hipR: -0.08, shL: 2.7 + 0.35 * Math.sin(t * 9), elL: 0.3, shR: -2.7 - 0.35 * Math.sin(t * 9 + 1), elR: -0.3, head: 0.1 });

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

// ---------- short round cartoon soldiers (canvas billboards) ----------
import { drawPerson, SPECS, defaultState, CW, CH } from './chibi.js';
const PX2M = 1.35 / 900;
const chars = [];
const blobTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
function makeChar(spec, opt = {}) {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const w = CW * PX2M, h = CH * PX2M, geo = new THREE.PlaneGeometry(w, h).translate(0, h / 2 - 26 * PX2M, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
  const g = new THREE.Group(); g.add(m, sh); const c = { spec: SPECS[spec], cv, ctx, tex, m, g, st: defaultState(), static: opt.static, drawn: -1, scale: opt.scale ?? 1 };
  g.scale.setScalar(c.scale); chars.push(c); return c;
}
function placeC(c, x, z, st, t, y = 0) {
  c.g.visible = true; c.g.position.set(x, y, z);
  const key = c.static ? Math.floor(Math.max(0, st.walk) * 1.2) % 2 : t;
  if (c.drawn !== key) { c.ctx.clearRect(0, 0, CW, CH); drawPerson(c.ctx, c.spec, st, t); c.tex.needsUpdate = true; c.drawn = key; }
}
const S0 = (o = {}) => Object.assign(defaultState(), o);
const blink = (t, p) => (((t + p) % 3.4) < 0.12 ? 0 : 1);
const ARM = { relax: [0.12, 0.25, 'fist'], point: [0.55, 1.15, 'point'], up: [0.4, 2.7, 'point'], rifle: [0.2, 1.6, 'fist'], aim: [1.05, 0.15, 'fist'], cheer: [2.6, 0.2, 'fist'],
  salute: [2.0, -1.95, 'open'], wave: [1.3, 1.5, 'open'], chest: [0.25, 1.9, 'fist'], thumb: [0.3, 1.9, 'thumb'], binoc: [0.75, 2.4, 'fist'] };

// ---------- props ----------
const sandbagGeo = new THREE.SphereGeometry(0.5, 14, 10);
function sandbags(g, cx, cz, R, a0, a1, rows = 2) {
  for (let r = 0; r < rows; r++) for (let a = a0; a <= a1; a += 0.55 / R) { const m = mesh(sandbagGeo, [0xd8c08a, 0xcdb27a, 0xe2cc98][Math.round(a * 10) % 3], cx + Math.cos(a) * R, 0.22 + r * 0.38, cz + Math.sin(a) * R); m.scale.set(0.62, 0.42, 0.42); m.rotation.y = -a; g.add(m); }
}
function house(g, x, z, roofCol, wall = 0xe9c49a, rot0 = 0) {
  const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = rot0; g.add(h);
  h.add(box(4.2, 2.8, 3.4, wall, 0, 1.4, 0), box(4.3, 0.3, 3.5, 0x8a5a35, 0, 2.85, 0));
  const roof = mesh(new THREE.CylinderGeometry(0.01, 2.9, 1.6, 4, 1), roofCol, 0, 3.8, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.85); h.add(roof);
  h.add(box(0.8, 1.3, 0.1, 0x6b3a1e, 0, 0.65, 1.72), box(0.7, 0.6, 0.1, 0x3a5a8a, -1.3, 1.6, 1.72), box(0.7, 0.6, 0.1, 0x3a5a8a, 1.3, 1.6, 1.72));
}
const CHINAR_TEX = [0, 1, 2].map(k => canvasTex(256, 320, (x) => {
  const r = RNG(90 + k);
  x.fillStyle = '#6b4226'; x.beginPath(); x.moveTo(112, 318); x.lineTo(120, 170); x.lineTo(138, 170); x.lineTo(148, 318); x.fill();
  blobs(x, r, 26, 128, 128, 88, 84, 40, ['#c2410c', '#b91c1c', '#c2410c'][k]);
  blobs(x, r, 20, 116, 112, 74, 68, 32, ['#f97316', '#ef4444', '#fb923c'][k]);
  blobs(x, r, 12, 98, 88, 52, 42, 22, ['#fdba74', '#fca5a5', '#fde68a'][k]);
}));
function chinar(r) { const g = new THREE.Group(), s = 0.85 + r() * 0.7;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: CHINAR_TEX[r() * 3 | 0], alphaTest: 0.5 })); sp.center.set(0.5, 0); sp.scale.set(5.2 * s, 6.5 * s, 1); g.add(sp);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7 * s, 16), shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0.5, 0.04, 0.2); sh.scale.y = 0.45; g.add(sh); return g; }
function mountains(g, z, n, seed, col = 0x7f9ae6) { const r = RNG(seed); for (let i = 0; i < n; i++) { const mh = 50 + r() * 40, mr = 38 + r() * 22, mx = -170 + i * 34 + r() * 10, mz = z - r() * 30; g.add(noShadow(mesh(new THREE.ConeGeometry(mr, mh, 6), B(col), mx, mh / 2 - 3, mz)), noShadow(mesh(new THREE.ConeGeometry(mr * 0.36, mh * 0.36, 6), B(0xffffff), mx, mh * 0.82 - 2.9, mz))); } }
function flagTex() { return canvasTex(384, 256, (x, w, h) => { x.fillStyle = '#ff9933'; x.fillRect(0, 0, w, h / 3); x.fillStyle = '#ffffff'; x.fillRect(0, h / 3, w, h / 3); x.fillStyle = '#138808'; x.fillRect(0, 2 * h / 3, w, h / 3);
  x.strokeStyle = '#000080'; x.lineWidth = 4; x.beginPath(); x.arc(w / 2, h / 2, 34, 0, 7); x.stroke(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.cos(a) * 34, h / 2 + Math.sin(a) * 34); x.lineWidth = 2; x.stroke(); } x.fillStyle = '#000080'; x.beginPath(); x.arc(w / 2, h / 2, 6, 0, 7); x.fill(); }); }
function flag(g, x, y, z, w = 3, h = 2) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 8), base = geo.attributes.position.array.slice();
  const f = mesh(geo, M(0xffffff, { map: flagTex(), side: THREE.DoubleSide }), x + w / 2, y, z); f.castShadow = false; g.add(f, cyl(0.06, 0.06, y + h / 2 + 0.3, 0xd9d9d9, x, (y + h / 2 + 0.3) / 2, z, 10), sph(0.1, 0xffd23f, x, y + h / 2 + 0.35, z));
  tick(g, t => { const p = geo.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const u = (base[i] + w / 2) / w; p[i + 2] = Math.sin(base[i] * 2.2 - t * 6) * 0.22 * u; p[i + 1] = base[i + 1] + Math.sin(base[i] * 1.5 - t * 5) * 0.05 * u; } geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); });
  return f;
}
// explosions: flash + rising smoke, scheduled
function blasts(g, list) {
  const items = list.map(([t0, x, z, s]) => { const fl = glow(0xffa030, 3 * s, x, 1, z, 0); const sm = puffs(7, 0x8a8478); sm.position.set(x, 0.3, z); g.add(fl, sm); return { t0, fl, sm, s }; });
  return t => items.forEach(({ t0, fl, sm, s }) => { const k = t - t0; fl.material.opacity = k > 0 && k < 0.5 ? (1 - k / 0.5) : 0; fl.scale.setScalar(3 * s * (0.6 + k)); sm.visible = k > 0 && k < 3; if (sm.visible) sm.userData.update(k, 0.35, 0.3, 3 * s, 1.6 * s, 1 - k / 3); });
}
function dakota(col = 0xc8ccd2) {
  const g = new THREE.Group(), props = [];
  const fus = mesh(new THREE.CapsuleGeometry(1.1, 9, 8, 16), col, 0, 0, 0); fus.rotation.z = Math.PI / 2; fus.scale.set(1, 1, 1); g.add(fus);
  g.add(rot(mesh(new THREE.ConeGeometry(1.0, 3, 16), col, -6.4, 0.2, 0), 0, 0, Math.PI / 2));
  g.add(box(2.6, 0.22, 18, col, 0.5, -0.3, 0), box(1.6, 0.18, 6, col, -6.8, 0.4, 0), box(1.8, 2.6, 0.18, col, -6.9, 1.6, 0));
  for (const z of [-3.6, 3.6]) { g.add(rot(cyl(0.55, 0.6, 2.6, 0x9aa0a8, 1.6, -0.3, z, 14), 0, 0, Math.PI / 2)); const p = new THREE.Group(); p.position.set(2.95, -0.3, z); p.add(box(0.08, 3.0, 0.25, 0x2a2a2a, 0, 0, 0)); g.add(p); props.push(p); }
  g.add(box(1.4, 0.7, 0.05, 0x5bb0ff, 4.2, 0.5, 0.85), box(1.4, 0.7, 0.05, 0x5bb0ff, 4.2, 0.5, -0.85));
  for (const z of [-6.5, 6.5]) { g.add(rot(cyl(0.7, 0.7, 0.05, 0xff9933, 0.5, -0.17, z, 20), 0, 0, 0)); g.add(rot(cyl(0.46, 0.46, 0.06, 0xffffff, 0.5, -0.16, z, 20), 0, 0, 0)); g.add(rot(cyl(0.22, 0.22, 0.07, 0x138808, 0.5, -0.15, z, 20), 0, 0, 0)); }
  for (const z of [-3.6, 3.6]) { g.add(cyl(0.06, 0.06, 1.4, 0x333333, 1.6, -1.2, z, 8)); const w = wheel(0.5); w.position.set(1.6, -1.9, z); g.add(w); }
  g.userData.spin = t => props.forEach(p => p.rotation.x = t * 40);
  return g;
}
function medalTex() { return canvasTex(512, 512, (x, w) => { const c = w / 2; const g = x.createRadialGradient(c - 60, c - 80, 20, c, c, c); g.addColorStop(0, '#f6c77a'); g.addColorStop(0.6, '#c98a3e'); g.addColorStop(1, '#8a5524'); x.fillStyle = g; x.beginPath(); x.arc(c, c, c - 6, 0, 7); x.fill();
  x.strokeStyle = '#6b3f16'; x.lineWidth = 10; x.beginPath(); x.arc(c, c, c - 14, 0, 7); x.stroke();
  // four vajras around a central emblem
  for (let i = 0; i < 4; i++) { x.save(); x.translate(c, c); x.rotate(i * Math.PI / 2); x.fillStyle = '#7a4a1c'; x.strokeStyle = '#5a3412'; x.lineWidth = 4;
    x.beginPath(); x.ellipse(0, -150, 22, 40, 0, 0, 7); x.fill(); x.stroke(); x.fillRect(-8, -112, 16, 34); for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, -185); x.quadraticCurveTo(s * 40, -170, s * 26, -128); x.stroke(); } x.restore(); }
  x.fillStyle = '#7a4a1c'; x.beginPath(); x.arc(c, c, 62, 0, 7); x.fill(); x.fillStyle = '#e3b066';
  x.fillRect(c - 34, c + 14, 68, 14); for (const dx of [-26, 0, 26]) { x.beginPath(); x.arc(c + dx, c - 10, 16, 0, 7); x.fill(); } x.fillRect(c - 40, c + 30, 80, 8); }); }

// ---------- sets ----------
const SETS = {};
function makeSet(name) { const g = new THREE.Group(); g.visible = false; scene.add(g); SETS[name] = g; return g; }
const DAY = [[0, '#1668e0'], [0.4, '#3f9cf5'], [0.62, '#8fd0ff'], [0.75, '#d6f1ff']];
const DUSK = [[0, '#3b2fb0'], [0.32, '#c2459a'], [0.52, '#ff7a59'], [0.68, '#ffc247'], [0.8, '#fff0a8']];
const NIGHTBLUE = [[0, '#0b1446'], [0.5, '#2a2f8a'], [1, '#5a3aa8']];
const SKY = { day: sky(DAY), dusk: sky(DUSK), night: sky(NIGHTBLUE), sunrise: sky([[0, '#2f6be0'], [0.4, '#7cb8ff'], [0.62, '#ffd1a0'], [0.78, '#ffb070']]) };

// Badgam: autumn fields, chinar trees, village, mountains, a sandbagged position on a low rise
const VAL = makeSet('val');
{
  const g = VAL, r = RNG(11);
  g.add(ground(texOf(GRASS('#7cc94a', '#5fb43a', '#a7d85a'), 120, 70), 800, 500, 0, -80));
  for (let i = 0; i < 9; i++) { const f = noShadow(mesh(new THREE.PlaneGeometry(14 + r() * 10, 9 + r() * 6), M([0xe8c25a, 0xd9a443, 0x9ed04a, 0xf0d070][i % 4], { map: texOf(DIRT, 4, 4) }), -40 + i * 11 + r() * 4, 0.02, -18 - r() * 18)); f.rotation.x = -Math.PI / 2; g.add(f); }
  for (let i = 0; i < 26; i++) { const t2 = i % 4 === 3 ? tree(r) : chinar(r); t2.position.set(-50 + i * 4.2 + r() * 2, 0, -12 - r() * 26); g.add(t2); }
  for (let i = 0; i < 10; i++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: PINE_TEX[i % 2], color: 0xd8ff8a, alphaTest: 0.5 })); p.center.set(0.5, 0); p.scale.set(2.2, 8, 1); p.position.set(-30 + i * 7 + r() * 3, 0, -32 - r() * 6); g.add(p); }
  for (const [x, z, c, ry] of [[-14, -22, 0x2aa8a0, 0.3], [-7, -26, 0xe0453a, -0.2], [9, -24, 0x3a7ad8, 0.1], [16, -21, 0x2aa8a0, -0.4], [24, -27, 0xe0453a, 0.2]]) house(g, x, z, c, 0xe9c49a, ry);
  mountains(g, -210, 11, 4); clouds(g, 7); birds(g, 6, 2, 12, -18);
  // the defensive position on a gentle mound
  sandbags(g, 0, 0.4, 3.0, Math.PI * 0.85, Math.PI * 2.15);
  for (let i = 0; i < 70; i++) g.add(noShadow(sph(0.06, FLOWERS[i % 6], -12 + r() * 24, 0.06, 2 + r() * 6)));
}
const VAL_BLASTS = blasts(VAL, [[0.3, -6, -8, 1], [1.1, 5, -10, 1.2], [1.9, -2, -12, 0.9], [2.6, 7, -6, 1], [3.6, -8, -5, 1.1], [4.4, 3, -9, 1], [5.2, -4, -7, 1.2], [6.3, 6, -11, 0.9], [7.4, -7, -9, 1], [8.6, 2, -6, 1.1], [9.6, -5, -11, 1], [10.8, 5, -7, 1.2], [12, -3, -9, 1], [13.2, 6, -8, 1]]);
const vSmoke = puffs(9, 0xd8c8a8); vSmoke.position.set(0, 0.2, -30); VAL.add(vSmoke);

// Srinagar airfield: reinforcements land
const AIR = makeSet('air');
{
  const g = AIR, r = RNG(21);
  g.add(ground(texOf(GRASS('#6fd04a', '#55bb3c', '#9be25e'), 120, 70), 800, 500, 0, -60));
  const rw = noShadow(mesh(new THREE.PlaneGeometry(400, 14), M(0x8d9099, { map: texOf(ASPHALT, 80, 3) }), 0, 0.03, 0)); rw.rotation.x = -Math.PI / 2; g.add(rw);
  for (let x = -190; x < 200; x += 12) g.add(noShadow(rot(mesh(new THREE.PlaneGeometry(5, 0.5), B(0xffffff), x, 0.05, 0), -Math.PI / 2)));
  const hangar = mesh(new THREE.CylinderGeometry(9, 9, 22, 24, 1, false, 0, Math.PI), 0xb8c4cf, 30, 0, -26); hangar.rotation.z = Math.PI / 2; hangar.rotation.y = Math.PI / 2; g.add(hangar, box(18, 9, 0.3, 0x5a6470, 30, 4.5, -15));
  const sock = new THREE.Group(); sock.position.set(-16, 0, -10); sock.add(cyl(0.08, 0.08, 6, 0xffffff, 0, 3, 0, 8), rot(mesh(new THREE.ConeGeometry(0.5, 2.4, 12, 1, true), M(0xff6d00, { side: THREE.DoubleSide }), 1.2, 5.8, 0), 0, 0, Math.PI / 2)); g.add(sock);
  for (let i = 0; i < 18; i++) { const t2 = i % 3 === 2 ? tree(r) : chinar(r); t2.position.set(-80 + i * 9 + r() * 3, 0, -40 - r() * 20); g.add(t2); }
  mountains(g, -220, 11, 9); clouds(g, 13); birds(g, 6, 5, 14, -30);
}
const plane1 = dakota(), plane2 = dakota(0xb8c0c8); AIR.add(plane1, plane2);

// memorial at sunset
const MEM = makeSet('mem');
{
  const g = MEM, r = RNG(31);
  g.add(ground(texOf(GRASS('#7cc94a', '#5fb43a', '#a7d85a'), 120, 70), 800, 500, 0, -80));
  const hill = noShadow(mesh(new THREE.SphereGeometry(10, 32, 16), M(0x8fcf52), 0, -8.4, 0)); g.add(hill);
  for (let i = 0; i < 20; i++) { const t2 = chinar(r); t2.position.set(-60 + i * 6 + r() * 3, 0, -20 - r() * 20); g.add(t2); }
  mountains(g, -200, 11, 12, 0x9a7ad8); clouds(g, 17, 0xffc0d0);
  // rifle planted upright, cap on the butt, marigold garland
  const mm = new THREE.Group(); mm.position.set(0, 1.55, 0); g.add(mm);
  mm.add(box(0.12, 1.5, 0.08, 0x8a4a1e, 0, 0.2, 0), box(0.05, 0.7, 0.05, 0x444444, 0, -0.9, 0), box(0.18, 0.35, 0.12, 0x7a3e18, 0, 1.05, 0));
  const cap = new THREE.Group(); cap.position.y = 1.32; mm.add(cap); cap.add(cyl(0.3, 0.26, 0.18, 0x8f8257, 0, 0, 0, 20), cyl(0.27, 0.27, 0.07, 0x5a4630, 0, -0.08, 0, 20), rot(cyl(0.18, 0.18, 0.02, 0x2a1e18, 0.14, -0.1, 0, 14), 0, 0, -0.25), box(0.06, 0.08, 0.02, 0xffd23f, 0, 0.02, 0.27));
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; mm.add(sph(0.06, i % 2 ? 0xff8c00 : 0xffc300, Math.cos(a) * 0.14, 0.75 - Math.abs(Math.sin(a)) * 0.25, Math.sin(a) * 0.14 + 0.08)); }
  for (let i = 0; i < 40; i++) g.add(noShadow(sph(0.08, [0xff8c00, 0xffc300, 0xffffff][i % 3], (r() - 0.5) * 2.4, 1.45, (r() - 0.5) * 1.6)));
  flag(g, 0.7, 2.5, -0.3, 0.9, 0.6);
  for (let i = 0; i < 30; i++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), B([0xff6d00, 0xffa000, 0xd84315][i % 3], { side: THREE.DoubleSide })); const ph = r() * 9, x0 = (r() - 0.5) * 10, z0 = -1 - r() * 6; g.add(lf); tick(g, t => { lf.position.set(x0 + Math.sin(t + ph) * 0.6, 6 - ((t * 0.6 + ph) % 6), z0); lf.rotation.set(t * 2 + ph, t + ph, 0); }); }
}
// medal studio
const MED = makeSet('med');
const medal = new THREE.Group();
{
  const g = MED; g.add(medal);
  const disc = mesh(new THREE.CylinderGeometry(1, 1, 0.12, 64), M(0xc98a3e), 0, 0, 0); disc.rotation.x = Math.PI / 2; medal.add(disc);
  const faceM = new THREE.MeshBasicMaterial({ map: medalTex() });
  for (const s of [1, -1]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.98, 64), faceM); f.position.z = s * 0.065; if (s < 0) f.rotation.y = Math.PI; medal.add(f); }
  medal.add(mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), 0xc98a3e, 0, 1.1, 0), box(0.9, 1.3, 0.05, 0x6a1b9a, 0, 1.85, 0), box(0.95, 0.12, 0.08, 0xc98a3e, 0, 1.22, 0));
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (x, w) => { x.translate(w / 2, w / 2); for (let i = 0; i < 20; i++) { x.rotate(Math.PI * 2 / 20); const gr = x.createLinearGradient(0, 0, 0, -w / 2); gr.addColorStop(0, 'rgba(255,215,120,.7)'); gr.addColorStop(1, 'rgba(255,215,120,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(-12, 0); x.lineTo(12, 0); x.lineTo(46, -w / 2); x.lineTo(-46, -w / 2); x.fill(); } }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  rays.position.z = -2; g.add(rays); g.userData.rays = rays;
  const sp = []; const r = RNG(41); for (let i = 0; i < 40; i++) { const s = glow([0xffe08a, 0xffffff, 0xff9933][i % 3], 0.3, (r() - 0.5) * 6, (r() - 0.5) * 9, -1 + r(), 0.8); g.add(s); sp.push([s, r() * 6]); } g.userData.sparks = sp;
}
// hero: sunrise, the flag
const HERO = makeSet('hero');
{
  const g = HERO, r = RNG(51);
  g.add(ground(texOf(GRASS('#7cc94a', '#5fb43a', '#a7d85a'), 120, 70), 800, 500, 0, -80));
  const hill = noShadow(mesh(new THREE.SphereGeometry(12, 32, 16), M(0x8fcf52), 0, -10.5, -1)); g.add(hill);
  for (let i = 0; i < 22; i++) { const t2 = i % 4 === 3 ? tree(r) : chinar(r); t2.position.set(-60 + i * 6 + r() * 3, 0, -22 - r() * 20); g.add(t2); }
  mountains(g, -200, 11, 14); clouds(g, 21, 0xffe0c0); birds(g, 6, 7, 14, -20);
  flag(g, 1.0, 4.4, -1.2, 3.4, 2.2);
}

// ---------- cast ----------
const MAJOR = makeChar('MAJOR'), MEN = ['SOLDIER', 'SOLDIER2', 'SOLDIER3', 'SOLDIER', 'SOLDIER2', 'SOLDIER3'].map(k => makeChar(k)), RAIDERS = Array.from({ length: 14 }, () => makeChar('RAIDER', { static: true }));
const REINF = ['SOLDIER2', 'SOLDIER', 'SOLDIER3', 'SOLDIER2'].map(k => makeChar(k));
function addTo(set, list) { list.forEach(c => set.add(c.g)); }

// ---------- staging ----------
const TLB = Object.fromEntries(TL.beats.map(b => [b.id, b]));
const focus = new THREE.Vector3();
function look(px, py, pz, tx, ty, tz, fov = 45) { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); focus.set(tx, 0, tz); }
const LIGHT = {
  day: { sky: 'day', fog: [0xd6f1ff, 90, 520], sun: [0xfff6e0, 2.5, [10, 22, 14]], hemi: [0xe6f4ff, 0x6fd44b, 1.6] },
  battle: { sky: 'day', fog: [0xe8dcc8, 60, 360], sun: [0xfff0d8, 2.4, [10, 20, 14]], hemi: [0xf0ecff, 0x8fb04b, 1.5] },
  dusk: { sky: 'dusk', fog: [0xffb0a0, 60, 380], sun: [0xffc29a, 2.3, [-12, 12, 14]], hemi: [0xffe0f0, 0x9a6a8a, 1.6] },
  studio: { sky: 'night', fog: [0x2a2f8a, 30, 200], sun: [0xfff2d6, 2.6, [6, 10, 14]], hemi: [0xffffff, 0x6a5aa8, 1.8] },
  sunrise: { sky: 'sunrise', fog: [0xffd8b0, 90, 520], sun: [0xffe2b8, 2.6, [-8, 12, 16]], hemi: [0xfff0e0, 0x8fb04b, 1.6] },
};
function majorState(t, o = {}) { return S0({ yaw: 0.2, brow: -0.25, smile: 0.15, open: blink(t, 0.3), armR: ARM.point, armL: ARM.chest, ...o }); }
function soldierState(t, i, o = {}) { return S0({ yaw: (i % 3 - 1) * 0.3, smile: 0.1, brow: -0.1, open: blink(t, i * 0.7), armR: ARM.rifle, armL: ARM.rifle, ...o }); }
const POS = [[-2.2, -1.2], [-0.9, -1.9], [0.9, -1.9], [2.2, -1.2], [-1.6, 0.2], [1.6, 0.2]];
function staffValley(t, mode) {
  addTo(VAL, [MAJOR, ...MEN, ...RAIDERS]);
  MEN.forEach((c, i) => { const [x, z] = POS[i]; const aim = mode === 'fight' && i < 4; placeC(c, x, z, soldierState(t, i, aim ? { armR: ARM.aim, armL: [0.8, 0.3, 'fist'], rifleAim: true, yaw: 0, brow: -0.6, smile: -0.2 } : {}), t); });
}
function raiders(t, adv, spread = 1) { RAIDERS.forEach((c, i) => { const row = i % 7, grp = Math.floor(i / 7); const x = (row - 3) * 2.6 * spread + grp * 1.3, z = lerp(-34, -14, adv) - grp * 2.4; placeC(c, x, z, S0({ walk: t * 4 + i }), t); }); }

const SHOT = {
  intro(t, d) { L_('battle'); staffValley(t, 'idle'); raiders(t, 0.05 + t * 0.012);
    placeC(MAJOR, 0, 0.6, majorState(t, { armR: ARM.binoc, armL: ARM.chest, lookY: -0.2, brow: -0.4, smile: 0 }), t);
    vSmoke.userData.update(t, 0.25, 6, 3, 3, 0.8);
    look(lerp(2.2, 1.4, t / d), 1.15, lerp(3.2, 2.5, t / d), 0, 1.05, 0.2, 42); },
  retreat(t, d) { SHOT.intro(t + 6.4, 7.8); look(0.5, 1.05, 1.9 - t * 0.15, 0, 1.08, 0.6, 38); },
  refused(t, d) { L_('battle'); staffValley(t, 'idle'); raiders(t, 0.15);
    placeC(MAJOR, 0, 0.6, majorState(t, { brow: -0.6, smile: 0.25, yaw: Math.sin(t * 9) * 0.25 * Math.max(0, 1 - t), armR: ARM.relax }), t);
    look(0.9, 1.2, 3.0, 0, 1.0, 0.4, 40); },
  date(t, d) { L_('day'); staffValley(t, 'idle'); raiders(t, 0.15); placeC(MAJOR, 0, 0.6, majorState(t), t);
    look(lerp(18, 12, t / d), lerp(16, 11, t / d), lerp(30, 22, t / d), 0, 1, -8, 45); },
  badgam(t, d) { L_('day'); staffValley(t, 'idle'); raiders(t, 0.2 + t * 0.05, 1.3); placeC(MAJOR, 0, 0.6, majorState(t), t);
    const a = 0.6 - t * 0.08; look(Math.sin(a) * 22, lerp(13, 8, t / d), Math.cos(a) * 22, 0, 1, -6, 45); },
  among(t, d) { L_('day'); staffValley(t, 'idle'); raiders(t, 0.5);
    placeC(MAJOR, 0, 0.6, majorState(t, { armR: ARM.point, smile: 0.3, brow: 0 }), t);
    look(lerp(1.8, 1.0, t / d), 1.2, lerp(3.4, 2.6, t / d), 0, 1.0, 0.5, 40); },
  despite(t, d) { L_('day'); addTo(VAL, [MAJOR, ...MEN, ...RAIDERS]); raiders(t, 0.55);
    const x = lerp(0, 0, 1), z = lerp(3.5, 0.6, smooth(t / d));
    placeC(MAJOR, 0, z, majorState(t, { walk: t * 7, armR: ARM.up, brow: -0.3, smile: 0.2, yaw: 0 }), t);
    MEN.forEach((c, i) => placeC(c, (i - 2.5) * 0.9, z + 1.4 + (i % 2) * 0.6, soldierState(t, i, { walk: t * 7 + i, yaw: 0 }), t));
    look(lerp(1.6, 0.8, t / d), 1.15, z - 3.6, 0, 1.0, z + 1.2, 44); },
  desperate(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.6); VAL_BLASTS(t); placeC(MAJOR, 0, 0.6, majorState(t, { brow: -0.7, smile: -0.2, mouth: 0.4, armR: ARM.point }), t);
    look(-2.6 + Math.sin(t * 30) * 0.03, 1.4, 3.8, 0, 1.0, -4, 44); },
  advancing(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.62 + t * 0.04, 1.4); VAL_BLASTS(t + 3); placeC(MAJOR, 0, 0.6, majorState(t, { brow: -0.7 }), t);
    look(lerp(-4, 4, t / d), 2.6, -26, 0, 1.2, 0, 42); },
  hold(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.75); VAL_BLASTS(t + 7);
    placeC(MAJOR, 0, 0.6, majorState(t, { armR: ARM.up, brow: -0.8, smile: 0.1, mouth: 0.5, yaw: 0 }), t);
    look(0.2, 0.75, 2.3, 0, 1.25, 0.2, 40); },
  moved(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.78); VAL_BLASTS(t + 10);
    const k = (t / d) * 2 - 1, mx = Math.sin(k * 1.4) * 2.2;
    placeC(MAJOR, mx, -0.5, majorState(t, { walk: t * 8, armR: Math.floor(t * 1.2) % 2 ? ARM.thumb : ARM.point, smile: 0.4, brow: 0, yaw: Math.cos(k * 1.4) * 0.6 }), t);
    look(mx * 0.6, 1.6, 3.6, mx * 0.8, 1.0, -1, 44); },
  reinforce(t, d) { L_('day'); addTo(AIR, REINF);
    const k = smooth(t / (d * 0.75)); plane1.position.set(lerp(-42, 6, k), lerp(9, 2.0, Math.min(1, k * 1.3)), -2); plane1.rotation.z = lerp(-0.14, 0, Math.min(1, k * 1.3)); plane1.userData.spin(t);
    plane2.position.set(-9, 2.0, 5); plane2.rotation.y = 0.5; plane2.userData.spin(t * 0.4);
    REINF.forEach((c, i) => placeC(c, -6.5 + i * 1.2 + t * 1.1, 9.5 - i * 0.5, soldierState(t, i, { walk: t * 8 + i, smile: 0.5, yaw: 0.6 }), t));
    look(lerp(9, 6, t / d), lerp(4.5, 3.6, t / d), lerp(24, 20, t / d), lerp(-6, -1, t / d), 2.4, 2, 52); },
  tragic(t, d) { L_('dusk'); look(lerp(3.2, 2.2, t / d), lerp(2.0, 1.8, t / d), lerp(5.5, 4.2, t / d), 0, 2.0, 0, 40); },
  never(t, d) { L_('dusk'); look(lerp(2.2, 0.8, t / d), lerp(1.8, 2.6, t / d), lerp(4.2, 6.2, t / d), 0, 2.4, -3, 42); },
  medal(t, d) { L_('studio'); medal.rotation.y = Math.sin(t * 0.9) * 0.5 + t * 0.15; medal.position.y = 0.2 + Math.sin(t * 1.4) * 0.05; const sc = 0.6 + 0.4 * easeOutBack(clamp(t / 0.8, 0, 1)); medal.scale.setScalar(sc);
    MED.userData.rays.rotation.z = t * 0.2; MED.userData.sparks.forEach(([s, ph]) => s.material.opacity = 0.4 + 0.4 * Math.sin(t * 3 + ph));
    look(0, 0.6, lerp(6.4, 5.6, t / d), 0, 0.7, 0, 45); },
  spirit(t, d) { L_('sunrise'); addTo(HERO, [MAJOR, ...MEN.slice(0, 4)]);
    placeC(MAJOR, 0, 1.5, majorState(t, { armR: ARM.relax, smile: 0.5, brow: 0.2, yaw: 0 }), t, 1.45);
    MEN.slice(0, 4).forEach((c, i) => placeC(c, [-2.2, -1.2, 1.2, 2.2][i], 0.4 - Math.abs(i - 1.5) * 0.3, soldierState(t, i, { smile: 0.5 }), t, 1.1));
    look(lerp(1.5, 0.4, t / d), lerp(1.6, 2.1, t / d), lerp(8, 6.5, t / d), 0, 2.5, 0, 44); },
  jai(t, d) { L_('sunrise'); addTo(HERO, [MAJOR, ...MEN.slice(0, 4)]);
    const k = smooth(t / 0.4);
    placeC(MAJOR, 0, 1.5, majorState(t, { armR: [lerp(0.12, 2.0, k), lerp(0.25, -1.95, k), 'open'], smile: 0.6, brow: 0.3, yaw: 0, mouth: t < 0.8 ? 0.6 : 0 }), t, 1.45);
    MEN.slice(0, 4).forEach((c, i) => placeC(c, [-2.2, -1.2, 1.2, 2.2][i], 0.4 - Math.abs(i - 1.5) * 0.3, soldierState(t, i, { smile: 0.6, armR: [lerp(0.2, 2.0, k), lerp(1.6, -1.95, k), 'open'], rifleOn: false }), t, 1.1));
    look(0.4, 2.1, lerp(6.5, 6.0, t / d), 0, 2.5, 0, 44); },
};
let CUR = 'day';
function L_(k) { CUR = k; }
const SETOF = { intro: 'val', retreat: 'val', refused: 'val', date: 'val', badgam: 'val', among: 'val', despite: 'val', desperate: 'val', advancing: 'val', hold: 'val', moved: 'val', reinforce: 'air', tragic: 'mem', never: 'mem', medal: 'med', spirit: 'hero', jai: 'hero' };

// ---------- overlay ----------
const caps = (() => { const out = []; let cur = null;
  for (const w of TL.words) { if (cur && (cur.text + ' ' + w.w).length <= 12 && w.t0 - cur.t1 < 0.25) { cur.text += ' ' + w.w; cur.t1 = w.t1; } else { if (cur) out.push(cur); cur = { text: w.w, t0: w.t0, t1: w.t1 }; } }
  out.push(cur); return out; })();
function overlay(t, b, lt, d) {
  const date = TLB.date, tIn = date.start + 0.1, tOut = TLB.among.start - 0.3;
  const a = smooth((t - tIn) / 0.4) * (1 - smooth((t - tOut) / 0.4));
  $('year').textContent = '3 NOV 1947'; $('label').textContent = 'Badgam · Kashmir';
  $('head').style.opacity = a; $('head').style.transform = `translateY(${(1 - smooth((t - tIn) / 0.4)) * -40}px)`;
  const ta = smooth(t / 0.5) * (1 - smooth((t - 2.6) / 0.5)); $('title').style.opacity = ta; $('title').style.transform = `scale(${0.94 + 0.06 * smooth(t / 3)})`;
  const ma = b.id === 'medal' ? smooth((lt - 3.6) / 0.5) : 0; $('medalT').style.opacity = ma; $('medalT').style.transform = `translateY(${(1 - ma) * 30}px)`;
  const air = b.id === 'reinforce' ? smooth(lt / 0.4) * (1 - smooth((lt - d + 0.5) / 0.4)) : 0; $('place').style.opacity = air;
  const ea = t > TL.duration - 2.8 ? smooth((t - (TL.duration - 2.8)) / 0.6) : 0; $('end').style.opacity = ea; $('endShade').style.opacity = ea * 0.8;
  // the real photograph: 1 second, as his name is first spoken
  const p0 = PHOTO_T, pk = t >= p0 - 0.18 && t < p0 + 1.18 ? Math.min(smooth((t - p0 + 0.18) / 0.18), 1 - smooth((t - p0 - 1.0) / 0.18)) : 0;
  $('photo').style.opacity = pk; $('photo').style.transform = `translate(-50%, -50%) rotate(-3deg) scale(${0.86 + 0.14 * pk + 0.02 * (t - p0)})`;
  const c = caps.find(c => t >= c.t0 - 0.05 && t < c.t1 + 0.15);
  $('sub').style.opacity = c && pk < 0.5 ? 1 : 0;
  if (c) { $('sub').textContent = c.text; $('sub').style.transform = `translateX(-50%) scale(${0.92 + 0.08 * smooth((t - c.t0 + 0.05) / 0.12)})`; }
  let f = Math.max(1 - lt / 0.3, 0); if (b.id === 'intro') f = Math.max(1 - lt / 0.6, 0);
  const sceneChange = ['date', 'reinforce', 'tragic', 'medal', 'spirit'].includes(b.id); if (!sceneChange && b.id !== 'intro') f = 0;
  if (t > TL.duration - 0.8) f = Math.max(f, (t - (TL.duration - 0.8)) / 0.8);
  $('fade').style.opacity = clamp(f);
  $('bar').style.width = (t / TL.duration * 100) + '%';
}
const PHOTO_T = (TL.words.find(w => /Somnath/.test(w.w)) || { t0: 8 }).t0 - 0.15;

const camPos = new THREE.Vector3();
window.renderFrame = (t) => {
  t = clamp(t, 0, TL.duration - 1e-3);
  const b = TL.beats.find(x => t < x.end) || TL.beats[TL.beats.length - 1], lt = t - b.start, d = b.end - b.start;
  Object.values(SETS).forEach(s => s.visible = false); chars.forEach(c => c.g.visible = false);
  const set = SETS[SETOF[b.id]]; set.visible = true;
  SHOT[b.id](lt, d);
  const Lc = LIGHT[CUR]; scene.background = SKY[Lc.sky]; scene.fog = new THREE.Fog(...Lc.fog);
  sun.color.set(Lc.sun[0]); sun.intensity = Lc.sun[1]; hemi.color.set(Lc.hemi[0]); hemi.groundColor.set(Lc.hemi[1]); hemi.intensity = Lc.hemi[2];
  (set.userData.tick || []).forEach(f => f(lt));
  sun.target.position.copy(focus); sun.position.set(focus.x + Lc.sun[2][0] * 2, Lc.sun[2][1] * 2, focus.z + Lc.sun[2][2] * 2);
  camera.updateMatrixWorld(); camPos.copy(camera.position);
  chars.forEach(c => { if (!c.g.visible) return; const p = c.g.getWorldPosition(new THREE.Vector3()); c.m.rotation.y = Math.atan2(camPos.x - p.x, camPos.z - p.z); });
  renderer.render(scene, camera);
  overlay(t, b, lt, d);
};
const easeOutBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
window.DURATION = TL.duration;
await document.fonts.ready;
await Promise.all(['500', '600', '800'].map(w => document.fonts.load(`${w} 40px Poppins`)));
window.renderFrame(0);
window.READY = true;
