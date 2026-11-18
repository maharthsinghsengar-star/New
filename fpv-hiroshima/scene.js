// FPV: "1 hour before" — Hiroshima (6 Aug 1945) and Nagasaki (9 Aug 1945).
// Realistic, vibrant procedural cities; one continuous drone camera per city. Deterministic: window.renderFrame(t).
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const RW = 720, RH = 1280;
const TL = await (await fetch('timeline.json')).json();
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(80, RW / RH, 0.3, 14000);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6a5a3a, 0.6);
const sun = new THREE.DirectionalLight(0xffffff, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 900 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
scene.add(hemi, sun, sun.target);

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, typeof mat === 'number' ? STD(mat) : mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r1, r2, h, c, x, y, z, s = 16) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), c, x, y, z);
function canvasTex(w, h, draw, srgb = true, rep = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const noise = new SimplexNoise({ random: RNG(7) });
const fbm = (x, z, o = 5) => { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise.noise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
const ridge = (x, z, o = 5) => { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(noise.noise(x * f, z * f))); n += a; a *= 0.5; f *= 2.1; } return s / n; };
const C = h => new THREE.Color(h);
const glowTex = canvasTex(128, 128, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, true, false);
const softTex = canvasTex(128, 128, x => { const r = RNG(4); for (let i = 0; i < 26; i++) { const cx = 64 + (r() - 0.5) * 50, cy = 64 + (r() - 0.5) * 50, rr = 18 + r() * 26, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } }, true, false);
const glow = (c, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.scale.setScalar(s); return sp; };

// simple triangle builder (non-indexed, flat normals)
class GB {
  constructor() { this.p = []; this.u = []; }
  tri(a, b, c, ta = [0, 0], tb = [1, 0], tc = [0.5, 1]) { this.p.push(...a, ...b, ...c); this.u.push(...ta, ...tb, ...tc); return this; }
  quad(a, b, c, d, ta = [0, 0], tb = [1, 0], tc = [1, 1], td = [0, 1]) { this.tri(a, b, c, ta, tb, tc); return this.tri(a, c, d, ta, tc, td); }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.computeVertexNormals(); return g; }
}

// ---------- textures ----------
const DETAIL = canvasTex(512, 512, (x, w, h) => { const r = RNG(3), img = x.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 215 + (r() - 0.5) * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; } x.putImageData(img, 0, 0); }, false);
const tileDraw = (bump) => (x, w, h) => {
  x.fillStyle = bump ? '#808080' : '#c8c8c8'; x.fillRect(0, 0, w, h); const r = RNG(11);
  for (let i = 0; i < w; i += 16) { const g = x.createLinearGradient(i, 0, i + 16, 0); const a = bump ? ['#606060', '#d0d0d0', '#606060'] : ['rgba(0,0,0,.28)', 'rgba(255,255,255,.18)', 'rgba(0,0,0,.28)']; g.addColorStop(0, a[0]); g.addColorStop(0.5, a[1]); g.addColorStop(1, a[2]); x.fillStyle = g; x.fillRect(i, 0, 16, h); }
  for (let j = 0; j < h; j += 32) { x.fillStyle = bump ? '#303030' : 'rgba(0,0,0,.35)'; x.fillRect(0, j, w, 4); }
  if (!bump) for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.08})`; x.fillRect((r() * 16 | 0) * 16, (r() * 8 | 0) * 32, 16, 32); }
  x.fillStyle = bump ? '#202020' : '#2a2622'; x.fillRect(0, h - 6, w, 6);       // fascia strip at v≈0
};
const TILE = canvasTex(256, 256, tileDraw(false)), TILEB = canvasTex(256, 256, tileDraw(true), false);
// facades (v=0 ground .. v=1 eave). drawn top-down on canvas
function facade(kind) {
  return canvasTex(256, 256, (x, w, h) => {
    const r = RNG(kind.length * 7), wood = '#5a3a22', dark = '#2c1d12', plaster = '#efe7d6';
    const lattice = (y0, y1, col = wood) => { x.fillStyle = dark; x.fillRect(0, y0, w, y1 - y0); x.fillStyle = col; for (let i = 0; i < w; i += 7) x.fillRect(i, y0, 4, y1 - y0); x.fillRect(0, y0, w, 5); x.fillRect(0, y1 - 5, w, 5); for (const px of [0, 84, 170, 250]) { x.fillStyle = '#3a2616'; x.fillRect(px, y0, 7, y1 - y0); } };
    x.fillStyle = plaster; x.fillRect(0, 0, w, h);
    if (kind === 'm1') { lattice(78, 236); x.fillStyle = '#4a3020'; x.fillRect(0, 70, w, 10); x.fillStyle = '#8a8a86'; x.fillRect(0, 236, w, 20); }
    if (kind === 'm2') { lattice(140, 240); x.fillStyle = '#2a2420'; x.fillRect(0, 118, w, 22); x.fillStyle = '#4a3020'; x.fillRect(0, 0, w, 8); x.fillRect(0, 110, w, 8);
      for (const px of [30, 150]) { x.fillStyle = '#e8e0cc'; x.fillRect(px, 34, 80, 60); x.fillStyle = '#3a2a1a'; for (let i = 0; i < 80; i += 9) x.fillRect(px + i, 34, 4, 60); } x.fillStyle = '#8a8a86'; x.fillRect(0, 240, w, 16); }
    if (kind === 'kura') { x.fillStyle = '#f6f4ee'; x.fillRect(0, 0, w, h); x.fillStyle = '#1f2226'; x.fillRect(0, 180, w, 76); x.strokeStyle = '#e8e8e4'; x.lineWidth = 4; for (let i = -256; i < 256; i += 26) { x.beginPath(); x.moveTo(i, 180); x.lineTo(i + 76, 256); x.stroke(); x.beginPath(); x.moveTo(i + 76, 180); x.lineTo(i, 256); x.stroke(); }
      x.fillStyle = '#1f2226'; x.fillRect(100, 50, 56, 44); x.fillStyle = '#d8d4c8'; x.fillRect(96, 46, 64, 6); }
    if (kind === 'shop') { const nc = ['#1f3a7a', '#b8322a', '#2a6a4a', '#7a2a5a', '#1f3a7a'][(r() * 5) | 0];
      x.fillStyle = '#1a140e'; x.fillRect(0, 150, w, 100); for (let i = 0; i < 40; i++) { x.fillStyle = ['#c84a2a', '#e0b040', '#6a8a3a', '#d8d0c0', '#7a5a3a'][(r() * 5) | 0]; x.fillRect(r() * w, 205 + r() * 40, 8 + r() * 18, 6 + r() * 12); }
      x.fillStyle = nc; for (let i = 0; i < w; i += 32) x.fillRect(i + 2, 150, 28, 44); x.fillStyle = '#f5efe0'; for (let i = 0; i < w; i += 32) { x.beginPath(); x.arc(i + 16, 168, 7, 0, 7); x.fill(); }
      x.fillStyle = '#3a2616'; x.fillRect(0, 124, w, 26); x.fillStyle = '#e8d8a8'; x.font = 'bold 18px serif'; x.fillText('', 0, 0);
      for (const px of [24, 140]) { x.fillStyle = '#3a2a1a'; x.fillRect(px, 40, 92, 60); x.fillStyle = '#e8e0cc'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) x.fillRect(px + 4 + i * 22, 44 + j * 19, 18, 15); }
      x.fillStyle = '#8a8a86'; x.fillRect(0, 248, w, 8); }
  });
}
const FAC = { m1: facade('m1'), m2: facade('m2'), kura: facade('kura'), shop: facade('shop') };
for (const t of Object.values(FAC)) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
const STONE = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#7d7a72'; x.fillRect(0, 0, w, h); const r = RNG(21); for (let j = 0; j < h; j += 32) for (let i = -1; i < 5; i++) { const bx = i * 64 + ((j / 32) % 2) * 32; const v = 105 + r() * 50; x.fillStyle = `rgb(${v},${v - 3},${v - 10})`; x.fillRect(bx + 2, j + 2, 60, 28); } });
const BRICK = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c8bca8'; x.fillRect(0, 0, w, h); const r = RNG(5); for (let y = 0; y < h; y += 16) for (let i = -1; i < 9; i++) { const bx = i * 32 + ((y / 16) % 2) * 16; x.fillStyle = `rgb(${150 + r() * 40},${62 + r() * 22},${44 + r() * 16})`; x.fillRect(bx + 1, y + 1, 30, 14); } });
const HALLTEX = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#cfae7c'; x.fillRect(0, 0, w, h); x.fillStyle = '#efe4cc'; x.fillRect(0, 0, w, 18); x.fillRect(0, 236, w, 20);
  x.fillStyle = '#e8dcc0'; x.fillRect(20, 40, 216, 176); x.fillStyle = '#26323a'; x.beginPath(); x.moveTo(48, 210); x.lineTo(48, 90); x.arc(128, 90, 80, Math.PI, 0); x.lineTo(208, 210); x.fill();
  x.strokeStyle = '#d8ccb0'; x.lineWidth = 6; x.beginPath(); x.moveTo(128, 20); x.lineTo(128, 210); x.moveTo(48, 130); x.lineTo(208, 130); x.stroke(); });
const FACTORY = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#8c8f92'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(i, 0, 3, h); } x.fillStyle = '#3a4a52'; x.fillRect(0, 40, w, 50); x.fillStyle = '#9aa4a8'; for (let i = 0; i < w; i += 32) x.fillRect(i, 40, 4, 50); x.fillStyle = '#5a5a58'; x.fillRect(0, 230, w, 26); });
const TRAMTEX = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#efe6c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f7d4f'; x.fillRect(0, 70, w, 58); x.fillStyle = '#1e2a30'; for (let i = 8; i < w - 10; i += 30) x.fillRect(i, 22, 24, 38); x.fillStyle = '#c8a040'; x.fillRect(0, 66, w, 4); });
// water normal map (tileable sum of integer waves)
const WATERN = (() => { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), r = RNG(8);
  const waves = Array.from({ length: 14 }, () => ({ kx: Math.round((r() - 0.5) * 16), ky: Math.round((r() - 0.5) * 16) || 1, ph: r() * 6.28, a: 0.5 + r() }));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let dx = 0, dy = 0; for (const w of waves) { const ar = 2 * Math.PI * (w.kx * i + w.ky * j) / N + w.ph, cs = Math.cos(ar) * w.a / Math.hypot(w.kx, w.ky); dx += cs * w.kx; dy += cs * w.ky; }
    const nx = -dx * 0.06, ny = -dy * 0.06, l = Math.hypot(nx, ny, 1), k = (j * N + i) * 4; img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2200, 2200); return t; })();
const WATER = new THREE.MeshStandardMaterial({ color: 0x17606f, roughness: 0.05, metalness: 0.05, normalMap: WATERN, normalScale: new THREE.Vector2(0.32, 0.32), envMapIntensity: 1.2 });
const waterPlane = () => { const w = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000).rotateX(-Math.PI / 2), WATER); w.position.y = -2.5; w.receiveShadow = true; return w; };

// ---------- sky presets ----------
const sky = new Sky(); sky.scale.setScalar(13000); scene.add(sky);
const pmrem = new THREE.PMREMGenerator(renderer);
const PRESETS = {
  morning: { elev: 25, azim: 85, turb: 1.6, ray: 0.75, mie: 0.0025, exp: 0.62, sun: [0xfff0d8, 3.3], hemi: [0xcfe0ff, 0x7a6a4a, 0.7], fog: [0xbcd3ec, 0.00026] },
  nagasaki: { elev: 46, azim: 15, turb: 2.0, ray: 0.85, mie: 0.003, exp: 0.6, sun: [0xfffaf0, 3.1], hemi: [0xd8e4f4, 0x6a6a5a, 0.7], fog: [0xc4d3e3, 0.0003] },
  dusk: { elev: 0.8, azim: -95, turb: 6, ray: 3.4, mie: 0.006, exp: 0.62, sun: [0xff9a5a, 1.2], hemi: [0xffb4a0, 0x2a2a48, 0.55], fog: [0xb88a88, 0.00045] },
};
const SUNDIR = {};
for (const [k, p] of Object.entries(PRESETS)) {
  const v = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - p.elev), THREE.MathUtils.degToRad(p.azim)); SUNDIR[k] = v;
  const s2 = new THREE.Scene(), sk = new Sky(); sk.scale.setScalar(4000); const u = sk.material.uniforms;
  u.turbidity.value = p.turb; u.rayleigh.value = p.ray; u.mieCoefficient.value = p.mie; u.mieDirectionalG.value = 0.8; u.sunPosition.value.copy(v); s2.add(sk);
  p.env = pmrem.fromScene(s2, 0.02).texture;
}
let PRE = null;
function applyPreset(k) {
  if (PRE === k) return; PRE = k; const p = PRESETS[k], u = sky.material.uniforms;
  u.turbidity.value = p.turb; u.rayleigh.value = p.ray; u.mieCoefficient.value = p.mie; u.mieDirectionalG.value = 0.8; u.sunPosition.value.copy(SUNDIR[k]);
  scene.environment = p.env; renderer.toneMappingExposure = p.exp; sun.color.set(p.sun[0]); sun.intensity = p.sun[1];
  hemi.color.set(p.hemi[0]); hemi.groundColor.set(p.hemi[1]); hemi.intensity = p.hemi[2]; scene.fog = new THREE.FogExp2(p.fog[0], p.fog[1]);
}

// ---------- terrain: one mesh, dense in the core and geometrically coarser outwards ----------
function warpAxis(N, core, coreSeg, extent) {
  const half = N / 2, cs = core / coreSeg, ch = coreSeg / 2, out = half - ch, need = extent - core / 2;
  let lo = 1.0001, hi = 1.5; for (let k = 0; k < 60; k++) { const r = (lo + hi) / 2, s = cs * r * (Math.pow(r, out) - 1) / (r - 1); if (s > need) hi = r; else lo = r; }
  const r = lo, a = [0]; let acc = 0; for (let i = 1; i <= half; i++) { acc += i <= ch ? cs : cs * Math.pow(r, i - ch); a.push(acc); }
  return [...a.slice(1).reverse().map(v => -v), ...a];
}
function warpTerrain(N, core, coreSeg, extent, hFn, cFn) {
  const ax = warpAxis(N, core, coreSeg, extent), n = ax.length, pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), c = new THREE.Color();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i, x = ax[i], z = ax[j], y = hFn(x, z); pos.set([x, y, z], k * 3); cFn(x, y, z, c); col.set([c.r, c.g, c.b], k * 3); uv.set([x / 9, z / 9], k * 2); }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6); let q = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, cc = a + n, d = cc + 1; idx.set([a, cc, b, b, cc, d], q); q += 6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: DETAIL, roughness: 0.96 }), grp = new THREE.Group(), K = 14, cs = Math.ceil((n - 1) / K);
  for (let bj = 0; bj < K; bj++) for (let bi = 0; bi < K; bi++) {
    const i0 = bi * cs, i1 = Math.min(n - 1, i0 + cs), j0 = bj * cs, j1 = Math.min(n - 1, j0 + cs); if (i0 >= i1 || j0 >= j1) continue;
    const ix = []; let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) { const a = j * n + i, b = a + 1, c2 = a + n, d = c2 + 1; ix.push(a, c2, b, b, c2, d); }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = (j * n + i) * 3; for (let q = 0; q < 3; q++) { lo[q] = Math.min(lo[q], pos[k + q]); hi[q] = Math.max(hi[q], pos[k + q]); } }
    const cg = new THREE.BufferGeometry(); for (const nm of ['position', 'normal', 'color', 'uv']) cg.setAttribute(nm, g.attributes[nm]); cg.setIndex(ix);
    const ctr = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2); cg.boundingSphere = new THREE.Sphere(ctr, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2); cg.boundingBox = new THREE.Box3(new THREE.Vector3(...lo), new THREE.Vector3(...hi));
    const m = new THREE.Mesh(cg, mat); m.receiveShadow = true; grp.add(m); }
  return grp;
}

// ---------- rivers ----------
const hwOf = (r, z) => typeof r.hw === 'function' ? r.hw(z) : r.hw;
function riverSD(r, x, z) { if (z < r.z0 || z > r.z1) return 1e9; const xc = r.x(z), s = (r.x(z + 1) - r.x(z - 1)) / 2, k = Math.sqrt(1 + s * s); return (Math.abs(x - xc) - hwOf(r, z) * k) / k; }
const riversSD = (R, x, z, skip) => { let d = 1e9; for (const r of R) if (r !== skip) d = Math.min(d, riverSD(r, x, z)); return d; };
// embankment walls + promenades along every river edge
function ribbons(R, landSD, inBounds) {
  const W = { p: [], u: [] }, P = { p: [], u: [] };
  const push = (o, a, b, c, d, ua, ub, uc, ud) => { o.p.push(...a, ...b, ...c, ...a, ...c, ...d); o.u.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud); };
  for (const r of R) {
    const pts = []; let last = null, acc = 0;
    for (let z = Math.max(r.z0, -3000); z <= Math.min(r.z1, 3000); z += 0.5) { const p = [r.x(z), z]; if (!last) { pts.push([...p, z, 0]); last = p; continue; } acc += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; if (acc >= 3) { pts.push([...p, z, pts[pts.length - 1][3] + acc]); acc = 0; } }
    for (const s of [-1, 1]) {
      let prev = null;
      for (const [x, zz, z, L] of pts) {
        const sl = (r.x(z + 1) - r.x(z - 1)) / 2, nl = Math.hypot(1, sl), nx = 1 / nl, nz = -sl / nl, hw = hwOf(r, z);
        const e = [x + nx * s * hw, zz + nz * s * hw], o = [e[0] + nx * s * 4, e[1] + nz * s * 4];
        const ok = inBounds(e[0], e[1]) && riversSD(R, e[0], e[1], r) > 0.6 && landSD(o[0], o[1]) > 0.5 && riversSD(R, o[0], o[1], r) > 0.5;
        if (ok && prev) { push(W, [prev.e[0], 0.45, prev.e[1]], [e[0], 0.45, e[1]], [e[0], -5.5, e[1]], [prev.e[0], -5.5, prev.e[1]], [prev.L / 4, 1.5], [L / 4, 1.5], [L / 4, -1.5], [prev.L / 4, -1.5]);
          push(P, [prev.e[0], 0.07, prev.e[1]], [prev.o[0], 0.07, prev.o[1]], [o[0], 0.07, o[1]], [e[0], 0.07, e[1]], [prev.L / 3, 0], [prev.L / 3, 1], [L / 3, 1], [L / 3, 0]); }
        prev = ok ? { e, o, L } : null;
      }
    }
  }
  const mk = (o, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m; };
  return [mk(W, STD(0xffffff, { map: STONE, roughness: 0.92, side: THREE.DoubleSide })), mk(P, STD(0xb8ab92, { map: DETAIL, roughness: 0.95 }))];
}

// ---------- house kit (instanced) ----------
function roofGeo(h, o, hip, y0 = 0, rz = 0.22) {
  const a = 0.5 + o, b = 0.5 + o, z2 = hip ? rz : b, g = new GB(), Y = y => y + y0;
  const E1 = [a, Y(0), -b], E2 = [a, Y(0), b], E3 = [-a, Y(0), b], E4 = [-a, Y(0), -b], R1 = [0, Y(h), -z2], R2 = [0, Y(h), z2];
  const f = (b - z2) / (2 * b);
  g.quad(E1, E2, R2, R1, [0, 0.03], [1, 0.03], [1 - f, 1], [f, 1]).quad(E3, E4, R1, R2, [0, 0.03], [1, 0.03], [1 - f, 1], [f, 1]);
  if (hip) g.tri(E2, E3, R2, [0, 0.03], [1, 0.03], [0.5, 1]).tri(E4, E1, R1, [0, 0.03], [1, 0.03], [0.5, 1]);
  g.quad(E1, E4, E3, E2, [0, 0], [0, 0], [0, 0], [0, 0]);                                   // soffit (dark fascia strip of the texture)
  const fd = -0.14; for (const [p, q] of [[E1, E2], [E2, E3], [E3, E4], [E4, E1]]) g.quad(p, q, [q[0], q[1] + fd, q[2]], [p[0], p[1] + fd, p[2]], [0, 0.01], [1, 0.01], [1, 0], [0, 0]);
  return g.geo();
}
function wallsGeo(H, gh = 0) {
  const g = new GB(), y0 = -3, v = y => y / H;
  g.quad([0.5, y0, 0.5], [0.5, y0, -0.5], [0.5, H, -0.5], [0.5, H, 0.5], [0, v(y0)], [1, v(y0)], [1, 1], [0, 1]);
  g.quad([-0.5, y0, -0.5], [-0.5, y0, 0.5], [-0.5, H, 0.5], [-0.5, H, -0.5], [0, v(y0)], [1, v(y0)], [1, 1], [0, 1]);
  g.quad([-0.5, y0, 0.5], [0.5, y0, 0.5], [0.5, H, 0.5], [-0.5, H, 0.5], [0, v(y0)], [1, v(y0)], [1, 1], [0, 1]);
  g.quad([0.5, y0, -0.5], [-0.5, y0, -0.5], [-0.5, H, -0.5], [0.5, H, -0.5], [0, v(y0)], [1, v(y0)], [1, 1], [0, 1]);
  if (gh) { g.tri([-0.5, H, 0.5], [0.5, H, 0.5], [0, H + gh, 0.5], [0, 0.97], [1, 0.97], [0.5, 1]); g.tri([0.5, H, -0.5], [-0.5, H, -0.5], [0, H + gh, -0.5], [0, 0.97], [1, 0.97], [0.5, 1]); }
  return g.geo();
}
const pent = (H) => { const g = new GB(); for (const s of [1, -1]) g.quad([s * 0.5, H + 0.35, -0.53], [s * 0.5, H + 0.35, 0.53], [s * 0.63, H - 0.05, 0.53], [s * 0.63, H - 0.05, -0.53], [0, 1], [1, 1], [1, 0.05], [0, 0.05]); return g.geo(); };
const ROOFMAT = new THREE.MeshStandardMaterial({ color: 0xffffff, map: TILE, bumpMap: TILEB, bumpScale: 2.5, roughness: 0.5, metalness: 0.08, side: THREE.DoubleSide });
TILE.repeat.set(1, 1);
const VARS = {
  A: { walls: wallsGeo(3.3), roof: roofGeo(2.1, 0.12, true, 3.3), fac: FAC.m1 },
  B: { walls: wallsGeo(6.1, 2.3), roof: mergeGeometries([roofGeo(2.3, 0.12, false, 6.1), pent(3.1)]), fac: FAC.m2 },
  C: { walls: wallsGeo(5.8, 1.9), roof: roofGeo(1.9, 0.1, false, 5.8), fac: FAC.kura },
  D: { walls: wallsGeo(6.4), roof: mergeGeometries([roofGeo(2.5, 0.12, true, 6.4, 0.18), pent(3.2)]), fac: FAC.shop },
  F: { walls: wallsGeo(4.2), roof: roofGeo(2.0, 0.08, true, 4.2), fac: null },
};
const ROOFS = ['#6b7a90', '#5d6a7e', '#4a5262', '#b86440', '#a5583a', '#c06a42', '#7f8c9c', '#8a6450', '#6b7a90', '#b86440'].map(C);
const tileKey = (o) => Math.floor(o.x / 260) + ',' + Math.floor(o.z / 260);
function buildHouses(group, lots, near) {
  const by = {}; for (const L of lots) (by[L.v + '|' + tileKey(L)] ||= []).push(L);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const WM = {};
  for (const [key, list] of Object.entries(by)) {
    const v = key.split('|')[0], V = VARS[v], wm = WM[v] ||= V.fac ? STD(0xffffff, { map: V.fac, roughness: 0.88 }) : STD(0xe8e0d0, { roughness: 0.9 });
    const W = new THREE.InstancedMesh(V.walls, wm, list.length), R = new THREE.InstancedMesh(V.roof, ROOFMAT, list.length);
    list.forEach((L, i) => { e.set(0, L.rot, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(L.x, L.y, L.z), q, new THREE.Vector3(L.d, L.hs, L.w)); W.setMatrixAt(i, m4); R.setMatrixAt(i, m4);
      W.setColorAt(i, col.setRGB(L.wt[0], L.wt[1], L.wt[2])); R.setColorAt(i, L.roof); });
    W.castShadow = R.castShadow = near; W.receiveShadow = R.receiveShadow = true; group.add(W, R);
  }
}
function pickLot(r, x, y, z, rot, near, shopBias = 0) {
  const k = r(); let v = near ? (k < shopBias ? 'D' : k < 0.36 ? 'A' : k < 0.8 ? 'B' : k < 0.9 ? 'C' : 'D') : 'F';
  const kura = v === 'C', w = kura ? 4.6 + r() * 1.2 : 6.4 + r() * 2.2, d = kura ? 6 + r() : 7.4 + r() * 1.8, wv = 0.92 + r() * 0.12;
  return { v, x, y, z, rot, w, d, hs: 0.92 + r() * 0.14, roof: ROOFS[(r() * ROOFS.length) | 0].clone().multiplyScalar(0.9 + r() * 0.25), wt: [wv, wv * (0.97 + r() * 0.03), wv * (0.9 + r() * 0.08)] };
}

// ---------- trees (instanced, vertex-coloured) ----------
function foliageGeo(r, n, spread, h, seed, cols, det = 1) {
  const rr = RNG(seed), parts = [], cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const g = mergeVertices(new THREE.IcosahedronGeometry(r * (0.6 + rr() * 0.5), det).deleteAttribute('normal').deleteAttribute('uv')); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), s = 1 + 0.25 * noise.noise3d(x * 1.1 + i, y * 1.1, z * 1.1 + seed); p.setXYZ(k, x * s, y * s * 0.85, z * s); }
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * spread; g.translate(Math.cos(a) * d, h + rr() * r * 1.2 - r * 0.3, Math.sin(a) * d);
    const col = new Float32Array(p.count * 3); for (let k = 0; k < p.count; k++) { cc.set(cols[(rr() * cols.length) | 0]).multiplyScalar(0.72 + 0.5 * clamp((p.getY(k) - h + r) / (r * 2.6))); col.set([cc.r, cc.g, cc.b], k * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); parts.push(g); }
  return mergeGeometries(parts);
}
function trunkGeo(r, h) { const g = new THREE.CylinderGeometry(r * 0.7, r, h, 7).deleteAttribute('uv'); g.translate(0, h / 2, 0); const col = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < col.length; i += 3) col.set([0.25, 0.18, 0.12], i); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
const GREENS = ['#4f9a2e', '#6bb03a', '#3f8a2a', '#5aa53a', '#7dbb46'], WILLOW = ['#8cc45a', '#7ab84a', '#a0d06a', '#6aa840'], PINE = ['#2f5e2a', '#3a6e30', '#28502a'];
const TREEP = {
  broad: mergeGeometries([trunkGeo(0.35, 4), foliageGeo(2.3, 6, 1.9, 5.6, 41, GREENS)]),
  willow: (() => { const f = foliageGeo(1.7, 7, 1.5, 4.6, 52, WILLOW); f.scale(1, 1.35, 1); f.translate(0, -1.4, 0); return mergeGeometries([trunkGeo(0.3, 3.6), f]); })(),
  pine: (() => { const parts = [trunkGeo(0.3, 6)]; for (let i = 0; i < 3; i++) { const f = foliageGeo(1.6 - i * 0.3, 4, 2.2 - i * 0.5, 3.8 + i * 2.0, 60 + i, PINE); f.scale(1, 0.55, 1); f.translate(0, 1.6 + i * 0.9, 0); parts.push(f); } return mergeGeometries(parts); })(),
  cheap: (() => { const g = mergeVertices(new THREE.IcosahedronGeometry(3, 1).deleteAttribute('uv').deleteAttribute('normal')); g.computeVertexNormals(); g.scale(1, 0.85, 1); g.translate(0, 4.5, 0); const c = new Float32Array(g.attributes.position.count * 3), r = RNG(3); for (let i = 0; i < c.length; i += 3) { const cc = C(GREENS[(r() * 5) | 0]).multiplyScalar(0.7 + r() * 0.4); c.set([cc.r, cc.g, cc.b], i); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return mergeGeometries([trunkGeo(0.3, 2.5), g]); })(),
};
const TREEMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
function buildTrees(group, list) {   // list: {p, x, y, z, s, ry, near}
  const by = {}; for (const T of list) (by[T.p + '|' + tileKey(T)] ||= []).push(T);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [key, l] of Object.entries(by)) { const p = key.split('|')[0], im = new THREE.InstancedMesh(TREEP[p], TREEMAT, l.length); l.forEach((T, i) => { e.set(0, T.ry, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(T.x, T.y, T.z), q, new THREE.Vector3(T.s, T.s * (0.9 + (i % 5) * 0.05), T.s)); im.setMatrixAt(i, m4); }); im.castShadow = p !== 'cheap'; im.receiveShadow = true; group.add(im); }
}

// ---------- props ----------
const CONCRETE = STD(0xbdb8ac, { map: DETAIL, roughness: 0.9 }), TIMBER = STD(0x6a4a30, { roughness: 0.85 }), DARKW = STD(0x3a2a1c, { roughness: 0.9 });
function bridge(g, x0, z0, x1, z1, width, deckY, mat = CONCRETE, piers = [], ramps = [-1, 1]) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, grp = new THREE.Group();
  grp.position.set(cx, 0, cz); grp.rotation.y = ang; g.add(grp);
  grp.add(box(len, 0.7, width, mat, 0, deckY - 0.35, 0));
  for (const s of [-1, 1]) { grp.add(box(len, 0.25, 0.25, mat, 0, deckY + 0.95, s * (width / 2 - 0.15))); for (let u = -len / 2; u <= len / 2; u += 2.5) grp.add(box(0.22, 0.95, 0.22, mat, u, deckY + 0.45, s * (width / 2 - 0.15))); }
  for (const u of piers) grp.add(box(1.4, deckY + 6, width * 0.9, mat, u, (deckY - 6) / 2 - 0.3, 0));
  for (const s of ramps) { const ramp = box(14, 0.6, width, mat, s * (len / 2 + 6.7), deckY / 2 - 0.3, 0); ramp.rotation.z = -s * Math.atan2(deckY, 14); grp.add(ramp); }
  return grp;
}
function tram() {
  const g = new THREE.Group(), body = STD(0xffffff, { map: TRAMTEX, roughness: 0.55 }), darkM = STD(0x222428, { roughness: 0.6, metalness: 0.5 });
  g.add(box(11.5, 2.5, 2.3, body, 0, 1.85, 0), box(11.8, 0.25, 2.45, STD(0x5a5e62, { roughness: 0.6 }), 0, 3.2, 0), box(11, 0.5, 2.0, darkM, 0, 0.45, 0));
  for (const s of [-1, 1]) { g.add(box(0.05, 1.2, 2.0, STD(0x1e2a30, { roughness: 0.15, metalness: 0.3 }), s * 5.78, 2.3, 0)); const hl = glow(0xfff2c0, 0.7, 0.55); hl.position.set(s * 5.85, 1.3, 0); g.add(hl); }
  const pole = cyl(0.04, 0.04, 5.2, darkM, -1.5, 5.2, 0, 6); pole.rotation.z = 1.05; g.add(pole); return g;
}
function torii(g, x, z, rot, s = 1) {
  const t = new THREE.Group(), red = STD(0xd8402a, { roughness: 0.6 }), blk = STD(0x1c1c1c, { roughness: 0.6 }); t.position.set(x, 0, z); t.rotation.y = rot; t.scale.setScalar(s); g.add(t);
  for (const k of [-1, 1]) t.add(cyl(0.32, 0.36, 6.6, red, 0, 3.3, k * 2.6, 14), cyl(0.42, 0.42, 0.5, blk, 0, 0.25, k * 2.6, 14));
  t.add(box(0.5, 0.5, 6.6, red, 0, 5.3, 0), box(0.7, 0.5, 8.4, blk, 0, 6.85, 0), box(0.6, 0.35, 7.8, red, 0, 6.5, 0), box(0.3, 1.0, 0.4, red, 0, 5.9, 0));
}
function facadeBox(w, h, d, tex, bw, bh, color = 0xffffff, rough = 0.85) {   // 4 walls with world-scaled UV repeats + flat top
  const g = new THREE.Group(), mk = (W, rotY, px, pz) => { const pg = new THREE.PlaneGeometry(W, h); const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / bw, uv.getY(i) * h / bh); const m = mesh(pg, STD(color, { map: tex, roughness: rough })); m.rotation.y = rotY; m.position.set(px, h / 2, pz); g.add(m); };
  mk(w, 0, 0, d / 2); mk(w, Math.PI, 0, -d / 2); mk(d, Math.PI / 2, w / 2, 0); mk(d, -Math.PI / 2, -w / 2, 0); g.add(box(w, 0.3, d, STD(0x8a8478), 0, h + 0.15, 0)); return g;
}
function boat(sail = false, seed = 1) {
  const r = RNG(seed), g = new THREE.Group(), geo = new THREE.BoxGeometry(6 + r() * 2, 0.9, 1.8, 6, 1, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); let z = p.getZ(i); if (x > 0) z *= 1 - Math.pow(x / 3.5, 2) * 0.85; if (y < 0) z *= 0.6; p.setZ(i, z); if (x > 2) p.setY(i, y + (x - 2) * 0.15); }
  geo.computeVertexNormals(); g.add(mesh(geo, STD(0x7a5234, { roughness: 0.8 }), 0, 0.2, 0));
  if (sail) { g.add(cyl(0.06, 0.06, 6, DARKW, 0.3, 3.4, 0, 6)); const s = mesh(new THREE.PlaneGeometry(3.4, 4.6), STD(0xf3ead2, { side: THREE.DoubleSide, roughness: 0.9 }), -1.2, 3.8, 0); s.rotation.y = 0.15; g.add(s); }
  return g;
}
function cloudGeo(seed, n = 9, R = 120) {
  const r = RNG(seed), parts = [], cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const rad = R * (0.45 + r() * 0.5), g = new THREE.IcosahedronGeometry(rad, 2).deleteAttribute('uv'); const a = r() * 6.28, d = Math.sqrt(r()) * R * 1.4; g.translate(Math.cos(a) * d, rad * 0.3 + r() * R * 0.3, Math.sin(a) * d * 0.7); parts.push(g); }
  const g = mergeGeometries(parts), p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.15); const k = clamp(p.getY(i) / (R * 0.9)); cc.setRGB(0.78 + 0.22 * k, 0.8 + 0.2 * k, 0.86 + 0.14 * k); col.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const PUFF = canvasTex(256, 256, (x) => { const r = RNG(12); for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = Math.pow(r(), 0.7) * 78, cx = 128 + Math.cos(a) * d, cy = 128 + Math.sin(a) * d * 0.8, rr = 22 + r() * 40, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.6, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); } }, true, false);
const PUFFMAT = [0, 1, 2, 3].map(k => new THREE.SpriteMaterial({ map: PUFF, color: new THREE.Color().setRGB(0.9 + k * 0.04, 0.92 + k * 0.03, 0.96 + k * 0.016), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
function cloud(seed, R) {   // cumulus made of soft billboard puffs: grey-blue flat base, bright tops
  const r = RNG(seed), g = new THREE.Group();
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()), h = Math.pow(r(), 1.4) * (1 - d * 0.6), s = new THREE.Sprite(PUFFMAT[Math.min(3, Math.floor(h * 4.5))]);
    s.position.set(Math.cos(a) * d * R * 1.5, h * R * 1.1, Math.sin(a) * d * R); s.scale.setScalar(R * (1.1 + r() * 0.7) * (1 - h * 0.35)); g.add(s); }
  return g;
}
// Boeing B-29 Superfortress (natural metal), nose along +x
function b29() {
  const g = new THREE.Group(), AL = STD(0xd4d8de, { metalness: 1, roughness: 0.22 });
  const fus = mesh(new THREE.CylinderGeometry(1.45, 1.45, 22, 20).rotateZ(Math.PI / 2), AL); g.add(fus);
  g.add(mesh(new THREE.SphereGeometry(1.45, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2), STD(0x9fb4c4, { metalness: 0.6, roughness: 0.1 }), 11, 0, 0));
  g.add(mesh(new THREE.ConeGeometry(1.45, 6, 20).rotateZ(Math.PI / 2), AL, -14, 0.3, 0));
  const wing = new THREE.Shape([[0, 0], [5.2, 0], [3.8, 21.5], [1.9, 21.5]].map(([a, b]) => new THREE.Vector2(a, b)));
  for (const s of [-1, 1]) { const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.4, bevelEnabled: false }); wg.rotateX(Math.PI / 2); const w = mesh(wg, AL, -2.5, -0.3, 0); w.scale.z = s; g.add(w);
    for (const off of [6.5, 12.5]) g.add(mesh(new THREE.CylinderGeometry(0.75, 0.6, 5.5, 12).rotateZ(Math.PI / 2), AL, 2.4, -0.4, s * off));
    const st = new THREE.Shape([[0, 0], [3.6, 0], [2.6, 7], [1.2, 7]].map(([a, b]) => new THREE.Vector2(a, b))); const sg = new THREE.ExtrudeGeometry(st, { depth: 0.25, bevelEnabled: false }); sg.rotateX(Math.PI / 2); const sm = mesh(sg, AL, -16.5, 0.6, 0); sm.scale.z = s; g.add(sm); }
  const fin = new THREE.Shape([[0, 0], [5, 0], [3.2, 6], [1.0, 6.5]].map(([a, b]) => new THREE.Vector2(a, b))); const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: false }); fg.translate(0, 0, -0.15); g.add(mesh(fg, AL, -17, 1, 0));
  const trail = new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }, true, false), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) for (const off of [6.5, 12.5]) { const tg = new THREE.PlaneGeometry(2.2, 700); tg.rotateZ(Math.PI / 2); tg.translate(-352, 0, 0); const t = new THREE.Mesh(tg, trail); t.position.set(0, -0.4, s * off); t.rotation.x = Math.PI / 2; g.add(t); const t2 = t.clone(); t2.rotation.x = 0; g.add(t2); }
  const gl = glow(0xfffbe8, 26, 0); g.add(gl); g.userData.glint = gl;
  return g;
}
// low-poly townspeople
const PEOPLE = (() => {
  const leg = new THREE.BoxGeometry(0.13, 0.82, 0.16); leg.translate(0, -0.41, 0);
  const torso = mergeGeometries([new THREE.CylinderGeometry(0.17, 0.2, 0.62, 8).translate(0, 0.31, 0), new THREE.BoxGeometry(0.09, 0.58, 0.11).translate(0.24, 0.28, 0), new THREE.BoxGeometry(0.09, 0.58, 0.11).translate(-0.24, 0.28, 0)].map(g => g.deleteAttribute('uv')));
  const head = new THREE.SphereGeometry(0.125, 10, 8).deleteAttribute('uv'); head.translate(0, 0.76, 0); const hp = head.attributes.position, hc = new Float32Array(hp.count * 3);
  for (let i = 0; i < hp.count; i++) { const hair = hp.getY(i) > 0.79 || (hp.getZ(i) < -0.06 && hp.getY(i) > 0.7); hc.set(hair ? [0.06, 0.05, 0.05] : [0.85, 0.62, 0.45], i * 3); } head.setAttribute('color', new THREE.BufferAttribute(hc, 3));
  return { leg, torso, head };
})();
function crowd(group, people) {   // people: {x,z,y,yaw,dir:[dx,dz],speed,shirt,trs,mode,ph}
  const n = people.length, L = new THREE.InstancedMesh(PEOPLE.leg, STD(0xffffff, { roughness: 0.9 }), n * 2), T = new THREE.InstancedMesh(PEOPLE.torso, STD(0xffffff, { roughness: 0.9 }), n), H = new THREE.InstancedMesh(PEOPLE.head, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), n);
  people.forEach((p, i) => { L.setColorAt(i * 2, p.trs); L.setColorAt(i * 2 + 1, p.trs); T.setColorAt(i, p.shirt); H.setColorAt(i, C('#ffffff')); });
  for (const m of [L, T, H]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }
  const base = new THREE.Matrix4(), loc = new THREE.Matrix4(), rx = new THREE.Matrix4(), out = new THREE.Matrix4();
  return t => people.forEach((p, i) => {
    let x = p.x, z = p.z, yaw = p.yaw, sw = 0, bend = 0;
    if (p.mode === 'walk') { const d = p.speed * (t - 20); x += p.dir[0] * d; z += p.dir[1] * d; sw = Math.sin(t * p.speed * 5.2 + p.ph) * 0.45; }
    else { bend = (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph)) * 0.7; sw = 0.1 * Math.sin(t * 1.6 + p.ph); }
    base.makeRotationY(yaw).setPosition(x, p.y + 0.82 + Math.abs(sw) * 0.03, z);
    for (const s of [0, 1]) { loc.makeTranslation(s ? 0.09 : -0.09, 0, 0).multiply(rx.makeRotationX(s ? sw : -sw)); L.setMatrixAt(i * 2 + s, out.multiplyMatrices(base, loc)); }
    loc.makeRotationX(-bend); T.setMatrixAt(i, out.multiplyMatrices(base, loc)); H.setMatrixAt(i, out);
  }) || (L.instanceMatrix.needsUpdate = T.instanceMatrix.needsUpdate = H.instanceMatrix.needsUpdate = true);
}

// ---------- merge static meshes per material (far fewer draw calls) ----------
function bake(root, skip = []) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), dead = [];
  root.traverse(o => { if (skip.some(s => s === o || o.parent && isUnder(o, s))) return; if (!o.isMesh || o.isInstancedMesh || o.isSprite || !o.geometry.attributes.uv || o.material.transparent || o.material.vertexColors) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 's' : ''); if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, list: [] }); groups.get(key).list.push(g); dead.push(o); });
  for (const o of dead) o.parent.remove(o);
  for (const { mat, cast, list } of groups.values()) { for (let i = 0; i < list.length; i += 400) { const m = new THREE.Mesh(mergeGeometries(list.slice(i, i + 400)), mat); m.castShadow = cast; m.receiveShadow = true; root.add(m); } }
}
const isUnder = (o, s) => { for (let p = o; p; p = p.parent) if (p === s) return true; return false; };

// ---------- camera tracks ----------
function track(keys) {
  const n = keys.length, P = keys.map(k => new THREE.Vector3(k[1], k[2], k[3])), T = keys.map(k => k[0]);
  const M = P.map((p, i) => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); return P[b].clone().sub(P[a]).divideScalar(T[b] - T[a]); });
  return t => { let i = 0; while (i < n - 2 && t > T[i + 1]) i++; const h = T[i + 1] - T[i], s = clamp((t - T[i]) / h), s2 = s * s, s3 = s2 * s;
    return new THREE.Vector3().addScaledVector(P[i], 2 * s3 - 3 * s2 + 1).addScaledVector(M[i], (s3 - 2 * s2 + s) * h).addScaledVector(P[i + 1], -2 * s3 + 3 * s2).addScaledVector(M[i + 1], (s3 - s2) * h); };
}
const pathDist = (pts) => (x, z) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, u = clamp(((x - ax) * vx + (z - az) * vz) / l2); d = Math.min(d, Math.hypot(x - ax - u * vx, z - az - u * vz)); } return d; };

// =====================================================================================
// HIROSHIMA
// =====================================================================================
const HG = new THREE.Group(); scene.add(HG); HG.add(waterPlane());
const HR = [
  { id: 'main', x: z => 30 * Math.sin(z / 260), z0: -4000, z1: 25, hw: z => z < -10 ? 33 : 33 - 13 * (z + 10) / 35 },
  { id: 'W', x: z => -160 * smooth(z / 170) + 12 * Math.sin(z / 210) * smooth(z / 120), z0: 0, z1: 1700, hw: 24 },
  { id: 'E', x: z => 80 * smooth(z / 160) + 10 * Math.sin(z / 190) * smooth(z / 200), z0: 0, z1: 1700, hw: 22 },
  { id: 'T', x: z => -470 + 22 * Math.sin(z / 300), z0: -4000, z1: 1700, hw: 28 },
  { id: 'K', x: z => 450 + 26 * Math.sin(z / 280 + 1), z0: -4000, z1: 1700, hw: 32 },
];
const Wx = HR[1].x, Ex = HR[2].x, Mx = HR[0].x;
const coastZ = x => 1250 + 50 * Math.sin(x / 230) + 30 * Math.sin(x / 97 + 2);
const hLandSD = (x, z) => Math.min(coastZ(x) - z, riversSD(HR, x, z));
const CASTLE = [-150, -640];
function hiroH(x, z) {
  const sd = hLandSD(x, z), rd = riversSD(HR, x, z);
  let y = sd >= 4 ? 0 : sd > 0 ? -5 + 5 * smooth(sd / 4) : -5 - clamp(-sd * 0.04, 0, 14);
  const r = Math.hypot(x * 0.95, z + 250);
  const hills = Math.pow(Math.max(0, ridge(x * 0.0015 + 3, z * 0.0015, 4) - 0.25), 1.15) * 650 * smooth((r - 1250) / 650) * smooth((1150 - z) / 350) * smooth((rd - 15) / 220);
  y += hills;
  const isl = (cx, cz, R, H) => { const d = Math.hypot(x - cx, z - cz) / R; return d < 1 ? H * Math.pow(1 - d, 1.6) * (0.85 + 0.3 * ridge(x * 0.004, z * 0.004, 3)) - 7 : -99; };
  y = Math.max(y, isl(700, 2950, 900, 300), isl(-900, 2300, 600, 140), isl(1500, 1900, 500, 120));
  const cd = Math.max(Math.abs(x - CASTLE[0]), Math.abs(z - CASTLE[1])); if (cd > 72 && cd < 88) y = Math.min(y, -5);   // castle moat
  return y;
}
const FIRE = { x0: -150, x1: 75, z0: 425, z1: 505 };
const inFire = (x, z, m = 0) => x > FIRE.x0 - m && x < FIRE.x1 + m && z > FIRE.z0 - m && z < FIRE.z1 + m;
function hiroC(x, y, z, c) {
  const sd = hLandSD(x, z), n = fbm(x * 0.02, z * 0.02, 3);
  if (y < -3.5) { c.setRGB(0.25, 0.24, 0.18); return; }
  if (y > 3) { const k = clamp(y / 300); c.set('#4f9a36').lerp(C('#2c6a2a'), clamp(0.45 + n * 0.6)).lerp(C('#3a6a3a'), k * 0.4); if (y < 12 && sd < 30) c.lerp(C('#d8c89a'), 0.5); return; }
  if (sd < 14 && coastZ(x) - z < 14) { c.set('#d9c79c'); return; }
  if (inFire(x, z)) { c.set('#b89c72').lerp(C('#9a8060'), clamp(0.5 + n)); return; }
  const cd = Math.hypot(x - CASTLE[0], z - CASTLE[1]);
  if (sd < 13 || cd < 72) { c.set('#6aa63e').lerp(C('#4f8a30'), clamp(0.5 + n)); return; }
  c.set('#9c8a70').lerp(C('#857660'), clamp(0.5 + n * 0.8));
}
HG.add(warpTerrain(700, 2300, 460, 9000, hiroH, hiroC));
HG.add(...ribbons(HR, hLandSD, (x, z) => Math.abs(x) < 2600 && z > -2600 && z < coastZ(x) - 2));

// camera path (Hiroshima)
const KH = [
  [0.0, 120, 85, 1650], [2.5, 20, 52, 1480], [5.0, Wx(1320) + 10, 14, 1320], [7.5, Wx(1170) - 4, -0.4, 1170], [10.0, Wx(1060) + 5, -0.8, 1060],
  [11.2, Wx(1008) + 2, -0.9, 1008], [12.8, Wx(940) - 4, -0.3, 940], [14.2, Wx(880) + 22, 7, 880], [15.6, -85, 16, 830], [17.0, -40, 6, 780],
  [19.5, -40, 4.3, 690], [22.0, -40, 4.4, 600], [23.6, -40, 7, 535], [25.4, -15, 13, 470], [27.4, 25, 20, 410], [29.8, 45, 30, 300],
  [32.0, Ex(200) - 2, 8, 200], [34.0, Ex(125) - 3, -0.4, 125], [36.0, 12, -0.6, 36], [37.0, 7, -0.9, 0], [38.0, 3, 3.5, -34], [39.6, -1, 16, -66],
  [41.6, -4, 30, -90], [45.6, -8, 55, -120]];
const camH = track(KH), routeH = KH.map(k => [k[1], k[3]]), distH = pathDist(routeH);

// landmarks: T-shaped Aioi Bridge, Industrial Promotion Hall, castle, shrine
const BR = []; // {x,z,r} exclusion for houses
bridge(HG, -46, 0, 46, 0, 15, 3.4, CONCRETE, [-18, 18]);
bridge(HG, 0, 6, 0, 62, 8, 3.4, CONCRETE, [-6], [1]);
for (const s of [-1, 1]) for (let u = -40; u <= 40; u += 16) { HG.add(cyl(0.12, 0.14, 5, STD(0x3a3a38, { metalness: 0.6, roughness: 0.4 }), u, 3.4 + 2.5, s * 7.2, 8)); HG.add(mesh(new THREE.SphereGeometry(0.35, 12, 8), STD(0xfff6e0, { emissive: 0xfff0d0, emissiveIntensity: 0.3 }), u, 6.1, s * 7.2)); }
const hallX = (() => { let m = 0; for (let z = 25; z <= 90; z += 2) m = Math.max(m, Ex(z) + 22 * 1.15); return m + 9; })(), hallZ = 58;
const HALL = new THREE.Group(); HALL.position.set(hallX + 11, 0, hallZ); HG.add(HALL);
HALL.add(facadeBox(22, 15, 44, HALLTEX, 4.4, 5));
{ const rg = roofGeo(2.6, 0.04, true, 15.3, 0.3); const r = mesh(rg, STD(0x5f6670, { roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide })); r.scale.set(22, 1, 44); HALL.add(r);
  const tw = facadeBox(13, 25, 13, HALLTEX, 4.3, 5); tw.position.x = -8; HALL.add(tw);
  const cop = STD(0x4c9a80, { metalness: 0.55, roughness: 0.42 });
  HALL.add(cyl(6.2, 6.2, 2.6, STD(0xd8c8a0), -8, 26.6, 0, 32), cyl(6.6, 6.6, 0.5, STD(0xefe4cc), -8, 27.9, 0, 32));
  const dome = mesh(new THREE.SphereGeometry(6.0, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), cop, -8, 28.1, 0); dome.scale.y = 1.35; HALL.add(dome);
  for (let i = 0; i < 12; i++) { const rib = mesh(new THREE.TorusGeometry(6.02, 0.12, 6, 24, Math.PI / 2), cop, -8, 28.1, 0); rib.scale.y = 1.35; rib.rotation.set(0, i * Math.PI / 6, Math.PI / 2); HALL.add(rib); }
  HALL.add(cyl(0.9, 1.2, 1.6, cop, -8, 36.8, 0, 12), mesh(new THREE.SphereGeometry(0.5, 12, 8), cop, -8, 38, 0));
  const wing = facadeBox(16, 9, 30, HALLTEX, 4.4, 4.5); wing.position.set(16, 0, 4); HALL.add(wing); }
// Hiroshima Castle keep with moat
const CASTLEG = new THREE.Group(); CASTLEG.position.set(CASTLE[0], 0, CASTLE[1]); HG.add(CASTLEG);
{ const base = mesh(new THREE.CylinderGeometry(19, 24, 8, 4, 1).rotateY(Math.PI / 4), STD(0xffffff, { map: STONE, roughness: 0.9 }), 0, 4, 0); CASTLEG.add(base);
  const wallM = STD(0xf4f2ec, { roughness: 0.8 }), roofM = STD(0x3c4250, { roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
  let y = 8; [20, 17, 14, 11, 8].forEach((w, i) => { CASTLEG.add(box(w, 3.8, w * 0.9, wallM, 0, y + 1.9, 0)); CASTLEG.add(box(w + 0.05, 0.8, w * 0.9 + 0.05, STD(0x1e1e22), 0, y + 0.4, 0)); const r = mesh(roofGeo(i === 4 ? 3.4 : 1.6, 0.18, true, 0, i === 4 ? 0.25 : 0.1), roofM, 0, y + 3.8, 0); r.scale.set(w, 1, w * 0.9); CASTLEG.add(r); y += 4.6; }); }
torii(HG, -62, 618, 0, 1.2);
{ const sh = new THREE.Group(); sh.position.set(-78, 0, 618); HG.add(sh); sh.add(box(7, 3.5, 9, STD(0xf0e8d8), 0, 1.75, 0)); const r = mesh(roofGeo(3.2, 0.25, false, 3.5), STD(0x3a4a3e, { roughness: 0.5, side: THREE.DoubleSide })); r.scale.set(7, 1, 9); sh.add(r); }
// wooden + concrete bridges across the other rivers
bridge(HG, Wx(1008) - 32, 1008, Wx(1008) + 32, 1008, 7, 2.2, TIMBER, [-10, 10]);
for (const [r, zs] of [[HR[1], [640, 300]], [HR[2], [560, 900]], [HR[0], [-420, -820]], [HR[3], [-300, 200, 700]], [HR[4], [-200, 300, 800]]]) for (const z of zs) { const x = r.x(z), w = hwOf(r, z) + 9; bridge(HG, x - w, z, x + w, z, 8, 2.6, CONCRETE, [-w / 3, w / 3]); }

// houses + trees
{ const r = RNG(101), lots = [], trees = [], P = 44, ST = 7, L = (P - ST) / 4;
  for (let bx = -26; bx <= 26; bx++) for (let bz = -26; bz <= 29; bz++) {
    const X0 = bx * P + 0.5, Z0 = bz * P;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = X0 + ST + L * (i + 0.5) + (r() - 0.5) * 0.8, cz = Z0 + ST + L * (j + 0.5) + (r() - 0.5) * 0.8;
      if (Math.abs(cx) > 1180 || cz < -1180 || cz > coastZ(cx) - 16) continue;
      const sd = hLandSD(cx, cz); if (sd < 10 || hiroH(cx, cz) > 1.0) continue;
      if (Math.abs(cx + 40) < 16 && cz > 200 && cz < 1150) continue;
      if (inFire(cx, cz, 4)) continue;
      if (Math.abs(cx - HALL.position.x) < 26 && Math.abs(cz - hallZ) < 34) continue;
      if (Math.hypot(cx - CASTLE[0], cz - CASTLE[1]) < 95) continue;
      if (Math.hypot(cx + 74, cz - 618) < 18) continue;
      if (Math.abs(cz) < 14 && Math.abs(cx) < 70) continue;
      const near = distH(cx, cz) < 270;
      if (r() < 0.08) { trees.push({ p: near ? 'broad' : 'cheap', x: cx, y: 0, z: cz, s: 0.8 + r() * 0.5, ry: r() * 6 }); continue; }
      const face = i === 0 ? Math.PI : i === 3 ? 0 : j === 0 ? Math.PI / 2 : j === 3 ? -Math.PI / 2 : [0, Math.PI][(r() * 2) | 0];
      lots.push(pickLot(r, cx, 0, cz, face, near, Math.abs(cx + 40) < 30 ? 0.6 : 0));
    }
  }
  buildHouses(HG, lots.filter(l => l.v !== 'F'), true); buildHouses(HG, lots.filter(l => l.v === 'F'), false);
  // riverbank willows / broadleaf
  for (const rv of HR) for (let z = Math.max(rv.z0, -1500); z < Math.min(rv.z1, 1300); z += 11 + r() * 6) for (const s of [-1, 1]) {
    const sl = (rv.x(z + 1) - rv.x(z - 1)) / 2, nl = Math.hypot(1, sl), off = hwOf(rv, z) + 7 + r() * 3, x = rv.x(z) + s * off / nl, zz = z - s * off * sl / nl;
    if (hLandSD(x, zz) < 5 || Math.abs(x) > 1500 || hiroH(x, zz) > 3 || (Math.abs(zz) < 12 && Math.abs(x) < 60)) continue;
    const near = distH(x, zz) < 300; trees.push({ p: near ? (r() < 0.6 ? 'willow' : 'broad') : 'cheap', x, y: 0, z: zz, s: 0.85 + r() * 0.4, ry: r() * 6 }); }
  for (let z = 210; z < 1150; z += 15) for (const s of [-1, 1]) if (!inFire(-40, z, 3) && Math.abs(z - 618) > 10) trees.push({ p: 'broad', x: -40 + s * 14, y: 0, z, s: 0.7 + r() * 0.2, ry: r() * 6 });
  for (let k = 0; k < 160; k++) { const a = r() * 6.28, d = 30 + r() * 40, x = CASTLE[0] + Math.cos(a) * d, z = CASTLE[1] + Math.sin(a) * d; trees.push({ p: 'pine', x, y: 0, z, s: 0.9 + r() * 0.4, ry: r() * 6 }); }
  for (let k = 0; k < 5500; k++) { const x = (r() - 0.5) * 5200, z = -2600 + r() * 3900, y = hiroH(x, z); if (y > 6 && y < 380 && hLandSD(x, z) > 8) trees.push({ p: 'cheap', x, y: y - 1, z, s: 1.5 + r() * 1.6, ry: r() * 6 }); }
  buildTrees(HG, trees);
}
// firebreak: demolished lots, timber piles, half-pulled house frames with ropes
const FIREG = new THREE.Group(); HG.add(FIREG);
{ const r = RNG(5), tim = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), STD(0x8a6a48, { roughness: 0.9 }), 900), tile = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), STD(0x5a606a, { roughness: 0.7 }), 500);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let ti = 0, tl = 0;
  for (let p = 0; p < 26; p++) { const cx = lerp(FIRE.x0 + 12, FIRE.x1 - 12, r()), cz = lerp(FIRE.z0 + 8, FIRE.z1 - 8, r());
    for (let k = 0; k < 32 && ti < 900; k++) { e.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6); q.setFromEuler(e); m4.compose(new THREE.Vector3(cx + (r() - 0.5) * 5, 0.1 + r() * 1.3, cz + (r() - 0.5) * 4), q, new THREE.Vector3(3 + r() * 3, 0.16, 0.18)); tim.setMatrixAt(ti++, m4); }
    for (let k = 0; k < 18 && tl < 500; k++) { e.set(0, r() * 6, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(cx + 4 + (r() - 0.5) * 3, 0.15 + r() * 0.5, cz + (r() - 0.5) * 3), q, new THREE.Vector3(0.9, 0.3, 0.6)); tile.setMatrixAt(tl++, m4); } }
  tim.count = ti; tile.count = tl; tim.castShadow = tile.castShadow = true; FIREG.add(tim, tile);
  for (let f = 0; f < 5; f++) { const fx = lerp(FIRE.x0 + 20, FIRE.x1 - 20, f / 4), fz = FIRE.z0 + 10 + r() * 10, fr = new THREE.Group(); fr.position.set(fx, 0, fz); fr.rotation.set(0, r(), -0.12 - r() * 0.15); FIREG.add(fr);
    for (const [a, b] of [[-3, -4], [3, -4], [-3, 4], [3, 4]]) fr.add(box(0.22, 5.5, 0.22, TIMBER, a, 2.75, b)); fr.add(box(6.4, 0.25, 0.25, TIMBER, 0, 5.4, -4), box(6.4, 0.25, 0.25, TIMBER, 0, 5.4, 4), box(0.25, 0.25, 8.4, TIMBER, -3, 5.4, 0), box(0.25, 0.25, 8.4, TIMBER, 3, 5.4, 0));
    const rope = cyl(0.025, 0.025, 14, STD(0xc8b48a), 0, 0, 0, 4); rope.position.set(fx + 7, 2.8, fz + 6); rope.rotation.set(0.9, 0, 1.15); FIREG.add(rope); } }
// trams, rails, poles
const TRAMS = [tram(), tram(), tram()]; TRAMS.forEach(t => HG.add(t));
for (const xr of [-41.6 - 0.53, -41.6 + 0.53, -38.4 - 0.53, -38.4 + 0.53]) HG.add(box(0.07, 0.06, 920, STD(0x6a6a6a, { metalness: 0.8, roughness: 0.35 }), xr, 0.04, 680));
for (let z = 230; z < 1140; z += 32) if (!inFire(-40, z, 2)) { for (const s of [-1, 1]) HG.add(cyl(0.12, 0.15, 7.2, DARKW, -40 + s * 6.5, 3.6, z, 6)); const cb = cyl(0.02, 0.02, 13, STD(0x222222), -40, 6.4, z, 4); cb.rotation.z = Math.PI / 2; HG.add(cb); }
for (const xw of [-41.6, -38.4]) { const w = cyl(0.015, 0.015, 920, STD(0x222222), xw, 5.9, 680, 4); w.rotation.x = Math.PI / 2; w.castShadow = false; HG.add(w); }
// boats
const BOATS = [];
{ const r = RNG(77); for (let k = 0; k < 7; k++) { const b = boat(true, k); b.position.set(-400 + r() * 900, -2.6, 1330 + r() * 500); b.rotation.y = r() * 6; HG.add(b); BOATS.push(b); }
  for (const [rv, zs] of [[HR[1], [1230, 1100, 890, 760]], [HR[2], [260, 330]], [HR[0], [-160, -260, -330]]]) for (const z of zs) { const b = boat(false, z); b.position.set(rv.x(z) + (r() - 0.5) * hwOf(rv, z), -2.65, z); b.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.4; HG.add(b); BOATS.push(b); } }
// clouds on the horizon
{ const r = RNG(31); for (let k = 0; k < 16; k++) { const a = -Math.PI * 0.95 + r() * Math.PI * 1.4, d = 3500 + r() * 3500, c = cloud(k + 3, 170 + r() * 160); c.position.set(Math.sin(a) * d, 1000 + r() * 700, -Math.cos(a) * d * 0.8 - 400); HG.add(c); } }
// people
const PEOPLEH = [];
{ const r = RNG(202), SH = ['#f2f0e8', '#ece6d6', '#8a7d55', '#c9b48a', '#3b4a6b', '#e8dcc8', '#a8b49a', '#7a6a50', '#f2f0e8', '#d9c2a0'].map(C), TR = ['#3a3a42', '#5a4e3a', '#2f3a52', '#6a5a40', '#4a4038', '#8a7d55'].map(C);
  const walker = (x, z, dir, speed) => PEOPLEH.push({ x, z, y: 0, yaw: Math.atan2(dir[0], dir[1]), dir, speed, shirt: SH[(r() * SH.length) | 0], trs: TR[(r() * TR.length) | 0], mode: 'walk', ph: r() * 6 });
  for (let k = 0; k < 900; k++) { const tt = 14 + r() * 23, p = camH(tt); let x = p.x + (r() - 0.5) * 180, z = p.z + (r() - 0.5) * 180;
    const sx = Math.round((x - 4) / 44) * 44 + 4, sz = Math.round((z - 3.5) / 44) * 44 + 3.5, alongZ = Math.abs(x - sx) < Math.abs(z - sz);
    if (alongZ) x = sx + (r() - 0.5) * 4; else z = sz + (r() - 0.5) * 4;
    if (hLandSD(x, z) < 8 || inFire(x, z, 2) || hiroH(x, z) > 0.5 || (Math.abs(x + 40) < 13 && z > 200)) continue;
    const sg = r() < 0.5 ? 1 : -1; walker(x, z, alongZ ? [0, sg] : [sg, 0], 1.1 + r() * 0.5); }
  for (let k = 0; k < 160; k++) { const s = r() < 0.5 ? -1 : 1, z = 520 + r() * 420; if (Math.abs(z - 618) < 8) continue; walker(-40 + s * (10 + r() * 2.5), z, [0, r() < 0.5 ? 1 : -1], 1.1 + r() * 0.4); }
  for (let k = 0; k < 24; k++) walker(-40 + r() * 80, (r() - 0.5) * 10, [r() < 0.5 ? 1 : -1, 0], 1.2 + r() * 0.3);
  PEOPLEH.slice(-24).forEach(p => p.y = 3.4);
  for (let k = 0; k < 240; k++) { const x = lerp(FIRE.x0 + 6, FIRE.x1 - 6, r()), z = lerp(FIRE.z0 + 5, FIRE.z1 - 5, r()); PEOPLEH.push({ x, z, y: 0, yaw: r() * 6, dir: [0, 0], speed: 0, shirt: C(r() < 0.8 ? '#f4f4ef' : '#e6e0cc'), trs: TR[(r() * 3) | 0], mode: 'work', ph: r() * 6 }); } }
const CROWDH = new THREE.Group(); HG.add(CROWDH); const animH = crowd(CROWDH, PEOPLEH);
for (const g of [HALL, CASTLEG, FIREG]) bake(g);
bake(HG, [HALL, CASTLEG, FIREG, CROWDH, ...TRAMS, ...BOATS]);
const HOUSESH = HG.children.filter(o => o.isInstancedMesh && o.material !== TREEMAT && o.geometry !== TREEP.cheap);

// =====================================================================================
// NAGASAKI (own world, offset far east)
// =====================================================================================
const OX = 30000, NG = new THREE.Group(); NG.position.x = OX; scene.add(NG); NG.add(waterPlane());
const NRV = [{ id: 'urakami', x: z => -20 + 18 * Math.sin(z / 160), z0: -3000, z1: 430, hw: z => 12 + 8 * smooth((z - 250) / 150) }];
const NRx = NRV[0].x, xv = z => -20 + 0.06 * z;
const shoreZ = x => 360 + 0.0016 * (x - 20) * (x - 20);
const nLandSD = (x, z) => Math.min(shoreZ(x) - z, riversSD(NRV, x, z));
const flatHalf = z => z < 350 ? 260 : 260 + (z - 350) * 0.42;
const CATH = [150, -160];
function nagH(x, z) {
  const sd = nLandSD(x, z);
  let y = sd >= 4 ? 0 : sd > 0 ? -5 + 5 * smooth(sd / 4) : -5 - clamp(-sd * 0.05, 0, 14);
  const dv = Math.abs(x - xv(z)) - flatHalf(z);
  y += (300 + 140 * fbm(x * 0.0025 + 9, z * 0.0025)) * Math.pow(smooth(dv / 480), 1.2) + 18 * fbm(x * 0.01, z * 0.01) * smooth(dv / 100);
  const cd = Math.hypot(x - CATH[0], z - CATH[1]) / 95; if (cd < 1) y += 13 * (1 - cd * cd);
  return y;
}
function nagC(x, y, z, c) {
  const n = fbm(x * 0.02, z * 0.02, 3), sd = nLandSD(x, z);
  if (y < -3.5) { c.setRGB(0.24, 0.24, 0.2); return; }
  if (y > 2.5 && Math.hypot(x - CATH[0], z - CATH[1]) > 95) { if (y < 140) { const band = Math.floor(y / 6) % 2; c.set(band ? '#8cbf4a' : '#6aa83a').lerp(C('#b8b060'), clamp(n * 0.8)); } else c.set('#3f7a30').lerp(C('#2a5a28'), clamp(0.5 + n)); return; }
  if (sd < 12) { c.set('#6aa63e'); return; }
  c.set('#9c8a70').lerp(C('#857660'), clamp(0.5 + n * 0.8));
}
NG.add(warpTerrain(560, 1700, 340, 7000, nagH, nagC));
NG.add(...ribbons(NRV, nLandSD, (x, z) => z > -1600 && z < 440));
const KN = [[45.6, -60, 46, 980], [48.0, -40, 30, 800], [50.5, -28, 12, 600], [52.6, NRx(430) + 2, 1.5, 430], [55.0, NRx(270) - 3, 0.4, 270], [57.4, NRx(120) + 2, 1.5, 120],
  [58.6, NRx(55) + 3, 14, 55], [59.8, 40, 28, -10], [61.4, 102, 40, -102], [64.0, 118, 70, -205], [65.6, 124, 82, -240]].map(k => [k[0], k[1] + OX, k[2], k[3]]);
const camN = track(KN), routeN = KN.map(k => [k[1] - OX, k[3]]), distN = pathDist(routeN);
// factories along the river, chimneys
const FACT = [];
{ const r = RNG(9);
  for (const [s, z0, len, w] of [[1, 60, 110, 46], [-1, 70, 90, 40], [1, 190, 120, 50], [-1, 180, 130, 44]]) {
    const zc = z0 + len / 2, x = NRx(zc) + s * (hwOf(NRV[0], zc) + 14 + w / 2), g = new THREE.Group(); g.position.set(x, 0, zc); NG.add(g); FACT.push([x, zc, w / 2 + 6, len / 2 + 6]);
    g.add(facadeBox(w, 12, len, FACTORY, 8, 12));
    for (let k = 0; k < Math.floor(len / 10); k++) { const gb = new GB(), zz = -len / 2 + k * 10; gb.quad([-w / 2, 12, zz], [w / 2, 12, zz], [w / 2, 16, zz + 0.01], [-w / 2, 16, zz + 0.01]); gb.quad([-w / 2, 16, zz], [w / 2, 16, zz], [w / 2, 12, zz + 10], [-w / 2, 12, zz + 10]); g.add(mesh(gb.geo(), STD(0x6e757c, { roughness: 0.6, metalness: 0.35, side: THREE.DoubleSide }))); }
  }
  for (const [x, z] of [[NRx(120) + 60, 110], [NRx(240) - 62, 236], [NRx(300) + 70, 300]]) { NG.add(cyl(1.4, 2.0, 38, STD(0xffffff, { map: BRICK, roughness: 0.9 }), x, 19, z, 14)); NG.add(cyl(1.5, 1.5, 1.2, STD(0x2a2a2a), x, 38.4, z, 14)); }
}
bridge(NG, NRx(190) - 30, 190, NRx(190) + 30, 190, 8, 3.2, CONCRETE, [-8, 8]);
bridge(NG, NRx(20) - 26, 20, NRx(20) + 26, 20, 8, 3.2, CONCRETE, [-8, 8]);
// Urakami Cathedral (red brick, twin bell towers with green domes)
const CATHG = new THREE.Group(); CATHG.position.set(CATH[0], nagH(CATH[0], CATH[1]) - 0.3, CATH[1]); NG.add(CATHG);
{ const brick = (w, h, d) => facadeBox(w, h, d, BRICK, 3, 3), wht = STD(0xf0ece2, { roughness: 0.8 }), cop = STD(0x4c9a80, { metalness: 0.55, roughness: 0.42 });
  CATHG.add(brick(22, 17, 56)); const nr = mesh(roofGeo(8, 0.04, false, 17), STD(0x4a4e58, { roughness: 0.6, side: THREE.DoubleSide })); nr.scale.set(22, 1, 56); CATHG.add(nr);
  { const gb = new GB(); for (const s of [1, -1]) gb.tri([-11, 17, s * 28], [11, 17, s * 28], [0, 25, s * 28], [0, 0], [7, 0], [3.5, 2.6]); CATHG.add(mesh(gb.geo(), STD(0xffffff, { map: BRICK, side: THREE.DoubleSide }))); }
  for (const s of [-1, 1]) { const a = brick(8, 9, 50); a.position.x = s * 15; CATHG.add(a); const ar = mesh(roofGeo(2.5, 0.05, false, 9), STD(0x4a4e58, { side: THREE.DoubleSide })); ar.scale.set(8, 1, 50); ar.position.x = s * 15; CATHG.add(ar);
    const tw = brick(8, 27, 8); tw.position.set(s * 9, 0, 30); CATHG.add(tw); for (const hy of [9, 18, 27]) CATHG.add(box(8.6, 0.6, 8.6, wht, s * 9, hy, 30));
    CATHG.add(cyl(3.3, 3.3, 3.2, wht, s * 9, 28.9, 30, 8)); const d = mesh(new THREE.SphereGeometry(3.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cop, s * 9, 30.5, 30); d.scale.y = 1.25; CATHG.add(d);
    CATHG.add(box(0.25, 2.6, 0.25, STD(0xd8c060, { metalness: 0.8, roughness: 0.3 }), s * 9, 36.1, 30), box(1.3, 0.25, 0.25, STD(0xd8c060, { metalness: 0.8, roughness: 0.3 }), s * 9, 36.5, 30)); }
  const rose = mesh(new THREE.CircleGeometry(2.6, 32), STD(0x3a4a7a, { roughness: 0.2, metalness: 0.3, emissive: 0x1a2a5a, emissiveIntensity: 0.3 }), 0, 12, 28.05); CATHG.add(rose); CATHG.add(mesh(new THREE.TorusGeometry(2.7, 0.3, 8, 32), wht, 0, 12, 28.1)); }
// shipyard cranes + ships
{ const r = RNG(15), red = STD(0xc8452a, { roughness: 0.6, metalness: 0.4 });
  for (let z = 470; z <= 800; z += 75) { let x = xv(z) - 30; while (nagH(x, z) < 0.5 && x > -900) x -= 4; x -= 10; const c = new THREE.Group(); c.position.set(x, nagH(x, z), z); NG.add(c);
    for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) c.add(box(0.6, 42, 0.6, red, a, 21, b)); for (let y = 4; y < 42; y += 6) c.add(box(4.6, 0.4, 4.6, red, 0, y, 0)); c.add(box(54, 3, 3, red, 14, 43.5, 0), box(10, 4, 4, STD(0x3a3a3a), -10, 45, 0), cyl(0.05, 0.05, 30, STD(0x222222), 30, 28, 0, 4)); }
  const ship = (L, x, z, rot, hull = 0x1e1e22) => { const g = new THREE.Group(); g.position.set(x, -2.5, z); g.rotation.y = rot; NG.add(g); const hg = new THREE.BoxGeometry(L, 9, L * 0.14, 8, 1, 1), p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (L / 2); if (u > 0.55) p.setZ(i, p.getZ(i) * (1 - (u - 0.55) / 0.45 * 0.92)); if (u < -0.8) p.setZ(i, p.getZ(i) * 0.75); } hg.computeVertexNormals();
    g.add(mesh(hg, STD(hull, { roughness: 0.6, metalness: 0.3 }), 0, 1.5, 0), box(L * 0.98, 1.2, L * 0.142, STD(0xb83a2a), 0, -2.4, 0)); g.add(box(L * 0.18, 7, L * 0.11, STD(0xf2efe6), -L * 0.22, 9.5, 0), cyl(1.6, 1.6, 7, STD(0x1e1e22), -L * 0.18, 15, 0, 14), box(L * 0.6, 0.4, L * 0.135, STD(0x8a6a4a), L * 0.1, 6.1, 0)); return g; };
  ship(130, 60, 720, 0.4); ship(90, -150, 640, -0.2, 0x2a3a4a); ship(110, 210, 860, 1.2); ship(70, -40, 1080, 0.8, 0x3a2a22); }
// houses + trees (Nagasaki)
{ const r = RNG(303), lots = [], trees = [], P = 40, ST = 6, L = (P - ST) / 4;
  for (let bx = -22; bx <= 22; bx++) for (let bz = -30; bz <= 18; bz++) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const cx = bx * P + ST + L * (i + 0.5), cz = bz * P + ST + L * (j + 0.5);
    const sd = nLandSD(cx, cz); if (sd < 9) continue; const y = nagH(cx, cz); if (y > 75 || y < -0.5) continue;
    const gx = nagH(cx + 4, cz) - nagH(cx - 4, cz), gz = nagH(cx, cz + 4) - nagH(cx, cz - 4); if (Math.hypot(gx, gz) > 2.6) continue;
    if (FACT.some(([fx, fz, hx, hz]) => Math.abs(cx - fx) < hx && Math.abs(cz - fz) < hz)) continue;
    if (Math.hypot(cx - CATH[0], cz - CATH[1]) < 55 || (Math.abs(cz - 190) < 10 || Math.abs(cz - 20) < 10) && Math.abs(cx - NRx(cz)) < 50) continue;
    if (cx < xv(cz) - 120 && cz > 440) continue;
    if (r() < 0.07) { trees.push({ p: 'cheap', x: cx, y: y - 0.3, z: cz, s: 0.8 + r() * 0.5, ry: r() * 6 }); continue; }
    const near = distN(cx, cz) < 260, face = i === 0 ? Math.PI : i === 3 ? 0 : j === 0 ? Math.PI / 2 : j === 3 ? -Math.PI / 2 : 0;
    lots.push(pickLot(r, cx, y - 0.6, cz, face, near)); }
  buildHouses(NG, lots.filter(l => l.v !== 'F'), true); buildHouses(NG, lots.filter(l => l.v === 'F'), false);
  for (let z = -1500; z < 420; z += 12 + r() * 6) for (const s of [-1, 1]) { const x = NRx(z) + s * (hwOf(NRV[0], z) + 7); if (nLandSD(x, z) > 4 && !FACT.some(([fx, fz, hx, hz]) => Math.abs(x - fx) < hx && Math.abs(z - fz) < hz)) trees.push({ p: distN(x, z) < 250 ? 'willow' : 'cheap', x, y: 0, z, s: 0.8 + r() * 0.3, ry: r() * 6 }); }
  for (let k = 0; k < 4500; k++) { const x = (r() - 0.5) * 4200, z = -2400 + r() * 3600, y = nagH(x, z); if (y > 60 && y < 420 && nLandSD(x, z) > 6) trees.push({ p: 'cheap', x, y: y - 1, z, s: 1.6 + r() * 1.6, ry: r() * 6 }); }
  for (let k = 0; k < 40; k++) { const a = r() * 6.28, d = 25 + r() * 25; trees.push({ p: 'broad', x: CATH[0] + Math.cos(a) * d * 1.2, y: nagH(CATH[0] + Math.cos(a) * d * 1.2, CATH[1] + Math.sin(a) * d) - 0.3, z: CATH[1] + Math.sin(a) * d, s: 0.8 + r() * 0.3, ry: r() * 6 }); }
  buildTrees(NG, trees); }
// cloud deck with a break above the valley
const PLANEN = b29(); NG.add(PLANEN);
const camEndN = camN(64.0).sub(new THREE.Vector3(OX, 0, 0));
const planeNPos = t => new THREE.Vector3(200 - 92 * (t - 60), 1150, -1250 + 20 * (t - 60));
{ const r = RNG(61), pv = planeNPos(63.5).sub(camEndN).normalize();
  for (let k = 0; k < 70; k++) { const x = (r() - 0.5) * 5000, z = -3200 + r() * 4600, y = 800 + r() * 260, d = new THREE.Vector3(x, y, z).sub(camEndN).normalize(); if (d.angleTo(pv) < 0.5) continue; const c = cloud(k + 100, 150 + r() * 120); c.position.set(x, y, z); NG.add(c); } }
// harbour boats
{ const r = RNG(88); for (let k = 0; k < 8; k++) { const b = boat(r() < 0.5, 50 + k); b.position.set(-200 + r() * 420, -2.6, 480 + r() * 600); b.rotation.y = r() * 6; NG.add(b); BOATS.push(b); } }

bake(NG, [...BOATS, PLANEN]);
// =====================================================================================
// planes, lanterns
// =====================================================================================
const PLANEH = b29(); HG.add(PLANEH);
const planeHPos = t => new THREE.Vector3(420 - 95 * (t - 36), 1050, -900 + 15 * (t - 36));
const LANT = new THREE.Group(); HG.add(LANT); const LANTS = [];
{ const r = RNG(404), cols = ['#ffb347', '#ff7b5a', '#ffd166', '#fff3dc', '#ff8fab', '#ffa94d', '#ffe08a'], base = STD(0x2a1a10);
  const pool = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let k = 0; k < 150; k++) { const z = -340 + r() * 300, hw = 26, x = Mx(z) + (r() - 0.5) * 2 * (hw - 3), c = C(cols[(r() * cols.length) | 0]), g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), base, 0, 0.06, 0), mesh(new THREE.BoxGeometry(0.42, 0.5, 0.42), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.2, roughness: 0.9 }), 0, 0.37, 0));
    const gl = glow(c, 2.2, 0.55); gl.position.y = 0.5; g.add(gl); const pm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), pool.clone()); pm.material.color = c; pm.material.opacity = 0.45; pm.position.y = 0.02; g.add(pm);
    LANT.add(g); LANTS.push({ g, x, z, ph: r() * 6, sp: 0.25 + r() * 0.2 }); } }
const KE = [[65.6, Mx(-28) + 2, -1.45, -28], [79, Mx(-112) + 1, -1.2, -112]], camE = track(KE);

// =====================================================================================
// overlay
// =====================================================================================
const capEls = TL.captions.map(c => { const d = document.createElement('div'); d.className = 'cap' + (c.onWhite ? ' onWhite' : ''); d.innerHTML = c.text; (c.onWhite ? $('capsW') : $('caps')).appendChild(d); return d; });
const titleEls = TL.titles.map(c => { const d = document.createElement('div'); d.className = 'title'; d.innerHTML = `<b>${c.big}</b><small>${c.small}</small>`; $('titles').appendChild(d); return d; });
const fadeIO = (t, t0, t1, a = 0.6) => smooth((t - t0) / a) * smooth((t1 - t) / a);
function overlay(t) {
  TL.captions.forEach((c, i) => { const o = fadeIO(t, c.t0, c.t1, 0.55), el = capEls[i]; el.style.opacity = o; el.style.transform = `translateY(${(1 - o) * 14}px)`; el.style.filter = `blur(${(1 - o) * 5}px)`; });
  TL.titles.forEach((c, i) => { const o = fadeIO(t, c.t0, c.t1, 0.9), el = titleEls[i]; el.style.opacity = o; el.style.transform = `scale(${1 + (t - c.t0) * 0.008})`; el.style.filter = `blur(${(1 - o) * 6}px)`; });
  const ck = TL.clock.find(c => t >= c.t0 - 1 && t <= c.t1 + 1);
  if (ck) { const o = fadeIO(t, ck.t0, ck.t1, 0.7); $('clock').style.opacity = o; $('clock').querySelector('.place').textContent = ck.place;
    let i = 0; while (i < ck.keys.length - 1 && t >= ck.keys[i + 1][0]) i++; const k = smooth((t - ck.keys[i][0]) / 0.45);
    $('ckA').textContent = ck.keys[i][1]; $('ckA').style.opacity = i === 0 ? 1 : k; $('ckB').textContent = i > 0 ? ck.keys[i - 1][1] : ''; $('ckB').style.opacity = i > 0 ? 1 - k : 0;
  } else $('clock').style.opacity = 0;
  let fl = 0; const [F1, F2] = TL.flashes;
  if (t >= F1 && t < TL.nagStart + 1.2) fl = Math.min(smooth((t - F1) / 0.22), 1 - smooth((t - TL.nagStart) / 1.2));
  if (t >= F2 && t < TL.endStart + 1.4) fl = Math.min(smooth((t - F2) / 0.22), 1 - smooth((t - TL.endStart) / 1.4));
  $('flash').style.opacity = fl;
  $('fade').style.opacity = Math.max(1 - smooth(t / 1.4), smooth((t - (TL.duration - 1.6)) / 1.5));
}

// =====================================================================================
// frame
// =====================================================================================
const tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
function camAt(tr, t) { const p = tr(t), d = tr(t + 0.45).sub(tr(t - 0.1)).normalize(); return { p, d }; }
const heading = d => Math.atan2(d.x, -d.z);
function setCamera(tr, t, look) {
  const { p, d } = camAt(tr, t), d1 = camAt(tr, t - 0.15).d, d2 = camAt(tr, t + 0.15).d;
  let dh = heading(d2) - heading(d1); dh = Math.atan2(Math.sin(dh), Math.cos(dh)); let roll = clamp(-dh / 0.3 * 0.42, -0.6, 0.6);
  const target = p.clone().addScaledVector(d, 60);
  if (look) { target.lerp(look.pos, look.w); roll *= 1 - look.w; }
  const zf = look && look.zoom ? look.w : 0; camera.fov = 80 - 34 * zf; camera.updateProjectionMatrix();
  camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(target);
  const sp = tr(t + 0.05).distanceTo(tr(t - 0.05)) / 0.1, sh = 0.0016 + sp * 0.00006;
  camera.rotateZ(roll + noise.noise(t * 1.3, 4) * 0.02); camera.rotateX(noise.noise(t * 9, 1) * sh); camera.rotateY(noise.noise(t * 8, 2) * sh);
  return p;
}
window.DURATION = TL.duration;
window.renderFrame = (t) => {
  const stage = t < TL.nagStart ? 'H' : t < TL.endStart ? 'N' : 'E';
  HG.visible = stage !== 'N'; NG.visible = stage === 'N';
  for (const m of HOUSESH) m.visible = stage === 'H'; HALL.visible = CASTLEG.visible = FIREG.visible = CROWDH.visible = stage === 'H'; TRAMS.forEach(m => m.visible = stage === 'H');
  LANT.visible = stage === 'E'; PLANEH.visible = stage === 'H';
  applyPreset(stage === 'H' ? 'morning' : stage === 'N' ? 'nagasaki' : 'dusk');
  WATERN.offset.set(t * 0.012, t * 0.008);
  let p;
  if (stage === 'H') {
    const pp = planeHPos(t); PLANEH.position.copy(pp); PLANEH.rotation.set(0, Math.PI - 0.16, 0.06); PLANEH.userData.glint.material.opacity = smooth((t - 30) / 4) * (0.55 + 0.4 * Math.sin(t * 2.3));
    p = setCamera(camH, t, { pos: pp, w: smooth((t - 38.3) / 2.2), zoom: true });
    TRAMS[0].position.set(-38.4, 0.05, 760 - 6 * (t - 14)); TRAMS[0].rotation.y = Math.PI / 2;
    TRAMS[1].position.set(-41.6, 0.05, 520 + 7 * (t - 14)); TRAMS[1].rotation.y = -Math.PI / 2;
    TRAMS[2].position.set(30 - 6 * (t - 33), 3.45, -3.6); TRAMS[2].rotation.y = Math.PI;
    animH(t);
  } else if (stage === 'N') {
    const pp = planeNPos(t); PLANEN.position.copy(pp); PLANEN.rotation.set(0, Math.PI + 0.2, 0.05); PLANEN.userData.glint.material.opacity = 0.5 + 0.35 * Math.sin(t * 2.1);
    p = setCamera(camN, t, { pos: pp.clone().add(NG.position), w: smooth((t - 61.6) / 2.0), zoom: true });
  } else {
    p = setCamera(camE, t, { pos: camE(t).add(new THREE.Vector3(0, 9, -60)), w: 0.35 });
    LANTS.forEach(L => { const dt = t - TL.endStart, z = L.z + L.sp * dt; L.g.position.set(L.x + Math.sin(dt * 0.3 + L.ph) * 0.6, -2.52 + Math.sin(t * 1.4 + L.ph) * 0.03, z); L.g.rotation.y = L.ph + dt * 0.05; });
  }
  BOATS.forEach((b, i) => { b.position.y = -2.62 + Math.sin(t * 1.3 + i) * 0.05; b.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.03; });
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion); fwd.y = 0; fwd.normalize();
  tmp.copy(p).addScaledVector(fwd, 55); tmp.y = stage === 'N' ? Math.max(0, p.y - 20) : 0;
  sun.target.position.copy(tmp); sun.position.copy(tmp).addScaledVector(SUNDIR[PRE], 400);
  sky.position.copy(camera.position);
  overlay(t);
  renderer.render(scene, camera);
};
// sampled camera data for the sound design
window.TRACK = (() => { const out = []; for (let t = 0; t < TL.duration; t += 0.1) { const tr = t < TL.nagStart ? camH : t < TL.endStart ? camN : camE, a = tr(t), b = tr(t + 0.1), local = t < TL.nagStart || t >= TL.endStart ? a : a.clone().sub(new THREE.Vector3(OX, 0, 0));
  const sd = t < TL.nagStart || t >= TL.endStart ? hLandSD(local.x, local.z) : nLandSD(local.x, local.z); out.push([+t.toFixed(1), +(a.distanceTo(b) / 0.1).toFixed(1), +a.y.toFixed(1), sd < 0 ? 1 : 0]); } return out; })();
renderer.compile(scene, camera);
window.__dbg = { renderer, scene, sun }; window.READY = true;
