// FPV on foot: Hiroshima, 6 August 1945. A walk down a busy street, the bomber, the flash, the cloud,
// running for cover in a bank, the blast wave, and the ruined city minutes later. Deterministic: window.renderFrame(t).
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
const camera = new THREE.PerspectiveCamera(72, RW / RH, 0.08, 18000); camera.rotation.order = 'YXZ'; scene.add(camera);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6a5a3a, 0.7);
const sun = new THREE.DirectionalLight(0xffffff, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 500 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);
scene.fog = new THREE.FogExp2(0xbcd3ec, 0.00011);

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
// constants
// =====================================================================================
const V3 = THREE.Vector3, deg = THREE.MathUtils.degToRad;
const TB = TL.burst, TBL = TL.blast, TOUT = TL.after;
const HYPO = new V3(0, 600, -4200);                                   // burst point: 600 m up, ~4 km north
const SUNV = new V3().setFromSphericalCoords(1, deg(90 - 35), deg(66));  // 8:15 am sun, east-south-east
const BEFORE = new THREE.Group(), AFTER = new THREE.Group(), COMMON = new THREE.Group(); scene.add(BEFORE, AFTER, COMMON);
const BSTAT = new THREE.Group(); BEFORE.add(BSTAT);
const ASTAT = new THREE.Group(); AFTER.add(ASTAT);
const norm2 = ([a, b]) => { const l = Math.hypot(a, b) || 1; return [a / l, b / l]; };
const bump = (t, a, b, f = 0.5) => smooth((t - a) / f) * (1 - smooth((t - b) / f));

// =====================================================================================
// sky
// =====================================================================================
const sky = new Sky(); sky.scale.setScalar(15000); scene.add(sky);
const SKYU = sky.material.uniforms;
const setSky = (turb, ray, mie, g, dir) => { SKYU.turbidity.value = turb; SKYU.rayleigh.value = ray; SKYU.mieCoefficient.value = mie; SKYU.mieDirectionalG.value = g; SKYU.sunPosition.value.copy(dir); };
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV_DAY = (() => { const s2 = new THREE.Scene(), sk = new Sky(); sk.scale.setScalar(4000); const u = sk.material.uniforms;
  u.turbidity.value = 1.8; u.rayleigh.value = 0.7; u.mieCoefficient.value = 0.003; u.mieDirectionalG.value = 0.8; u.sunPosition.value.copy(SUNV); s2.add(sk); return pmrem.fromScene(s2, 0.02).texture; })();
// after the blast: a low brown sky of smoke and dust, glowing toward the burning centre, a dim red sun
const ASHMAT = new THREE.ShaderMaterial({ uniforms: { sunDir: { value: SUNV }, hypoDir: { value: new V3(0, 0.04, -1).normalize() } }, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `uniform vec3 sunDir, hypoDir; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float h = clamp(d.y, -0.2, 1.0);
      vec3 c = mix(vec3(0.52, 0.38, 0.27), vec3(0.17, 0.15, 0.14), pow(clamp(h * 1.5, 0.0, 1.0), 0.55));
      float g = pow(max(dot(d, hypoDir), 0.0), 5.0) * (1.0 - clamp(h * 2.5, 0.0, 1.0)); c += vec3(0.5, 0.2, 0.06) * g;
      float s = max(dot(d, sunDir), 0.0); c += vec3(1.0, 0.42, 0.16) * (pow(s, 1400.0) * 2.5 + pow(s, 10.0) * 0.22);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const ASH = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), ASHMAT); ASH.frustumCulled = false; ASH.renderOrder = -1; scene.add(ASH);
const ENV_ASH = (() => { const s2 = new THREE.Scene(); s2.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), ASHMAT)); return pmrem.fromScene(s2, 0.04).texture; })();

// =====================================================================================
// textures
// =====================================================================================
const DIRT = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#a3977f'; x.fillRect(0, 0, w, h); const r = RNG(31);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '90,78,60' : '190,178,155'},${0.05 + r() * 0.07})`; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 70, 10 + r() * 35, r() * 3, 0, 7); x.fill(); }
  for (let i = 0; i < 12000; i++) { const v = 110 + r() * 100; x.fillStyle = `rgba(${v | 0},${v * 0.93 | 0},${v * 0.8 | 0},${0.2 + r() * 0.35})`; const s = 1 + r() * 2.5; x.fillRect(r() * w, r() * h, s, s); } });
const ROAD = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#9d9483'; x.fillRect(0, 0, w, h); const r = RNG(32);
  for (const c of [0.22, 0.4, 0.62, 0.8]) { const g = x.createLinearGradient((c - 0.06) * w, 0, (c + 0.06) * w, 0); g.addColorStop(0, 'rgba(60,52,42,0)'); g.addColorStop(0.5, 'rgba(60,52,42,.16)'); g.addColorStop(1, 'rgba(60,52,42,0)'); x.fillStyle = g; x.fillRect((c - 0.06) * w, 0, 0.12 * w, h); }
  for (let i = 0; i < 9000; i++) { const v = 105 + r() * 110; x.fillStyle = `rgba(${v | 0},${v * 0.95 | 0},${v * 0.86 | 0},${0.18 + r() * 0.3})`; const s = 1 + r() * 2; x.fillRect(r() * w, r() * h, s, s); }
  for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(70,60,48,${0.04 + r() * 0.06})`; x.beginPath(); x.ellipse(r() * w, r() * h, 10 + r() * 40, 30 + r() * 80, 0, 0, 7); x.fill(); } });
const SETTS = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5e5b55'; x.fillRect(0, 0, w, h); const r = RNG(33); for (let j = 0; j < h; j += 16) for (let i = 0; i < w; i += 24) { const v = 100 + r() * 40; x.fillStyle = `rgb(${v},${v - 3},${v - 8})`; x.fillRect(i + 1 + ((j / 16) % 2) * 12, j + 1, 22, 14); } });
const PAVE = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#8e877b'; x.fillRect(0, 0, w, h); const r = RNG(34); for (let j = 0; j < h; j += 64) for (let i = 0; i < w; i += 64) { const v = 160 + r() * 40; x.fillStyle = `rgb(${v},${v - 6},${v - 16})`; x.fillRect(i + 2, j + 2, 60, 60); }
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.08})`; x.fillRect(r() * w, r() * h, 2, 2); } });
const FLOORT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#2a2a26'; x.fillRect(0, 0, w, h); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { x.fillStyle = (i + j) % 2 ? '#3d5a4a' : '#e2d8c0'; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); } });
const winTex = (base, glass, seed) => canvasTex(256, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); const r = RNG(seed); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.06})`; x.fillRect(r() * w, r() * h, 3, 3); }
  x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 0, w, 10); x.fillStyle = '#5a554c'; x.fillRect(56, 46, 144, 168); x.fillStyle = glass; x.fillRect(62, 52, 132, 156);
  x.fillStyle = '#5a554c'; x.fillRect(124, 52, 8, 156); x.fillRect(62, 120, 132, 6); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(66, 56, 54, 60); });
const BANKTEX = winTex('#cbbfa6', '#2c3438', 35), WINTEX = winTex('#b9b2a4', '#30383c', 36), WINTEX2 = winTex('#a89a86', '#283034', 37);
const glyph = (x, cx, cy, s, r, col) => { x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = s * 0.13; const n = 3 + (r() * 4 | 0);
  for (let k = 0; k < n; k++) { x.beginPath(); const t = r();
    if (t < 0.45) { const y = cy + (r() - 0.5) * s * 0.8; x.moveTo(cx - s * (0.2 + r() * 0.25), y); x.lineTo(cx + s * (0.2 + r() * 0.25), y); }
    else if (t < 0.8) { const xx = cx + (r() - 0.5) * s * 0.7; x.moveTo(xx, cy - s * (0.2 + r() * 0.25)); x.lineTo(xx, cy + s * (0.2 + r() * 0.25)); }
    else { x.moveTo(cx + (r() - 0.5) * s * 0.3, cy - s * 0.3); x.lineTo(cx + (r() < 0.5 ? -1 : 1) * s * 0.35, cy + s * 0.35); } x.stroke(); } };
const SIGNS = canvasTex(512, 256, (x, w, h) => { const r = RNG(40), sch = [['#1d1a17', '#f2ead8'], ['#f3eee2', '#1d1a17'], ['#a8261e', '#f6efe0'], ['#6b4a2a', '#f3e6c8'], ['#1f3466', '#f3eee2'], ['#f3eee2', '#a8261e'], ['#2f2a24', '#e8c860'], ['#d8c8a0', '#2a2018']];
  sch.forEach(([bg, fg], k) => { x.fillStyle = bg; x.fillRect(k * 64, 0, 64, 256); x.strokeStyle = fg; x.lineWidth = 3; x.strokeRect(k * 64 + 5, 5, 54, 246); for (let j = 0; j < 4; j++) glyph(x, k * 64 + 32, 36 + j * 58, 42, r, fg); }); }, true, false);
const FLAGS = canvasTex(512, 256, (x, w, h) => { const r = RNG(41), sch = [['#b8322a', '#f6efe0'], ['#f6efe0', '#1f3a7a'], ['#1f3a7a', '#f6efe0'], ['#e0b040', '#7a2a1a'], ['#2a6a4a', '#f6efe0'], ['#f6efe0', '#b8322a'], ['#7a2a5a', '#f6efe0'], ['#d86a2a', '#f6efe0']];
  sch.forEach(([bg, fg], k) => { x.fillStyle = bg; x.fillRect(k * 64, 0, 64, 256); x.fillStyle = fg; x.fillRect(k * 64, 0, 64, 18); for (let j = 0; j < 3; j++) glyph(x, k * 64 + 32, 60 + j * 62, 44, r, fg); }); }, true, false);
const AWN = canvasTex(256, 256, (x, w, h) => { const sch = [['#f4efe2', '#1f3a7a'], ['#f4efe2', '#b8322a'], ['#e8d8a8', '#2a6a4a'], ['#f4efe2', '#6a4a2a']];
  sch.forEach(([a, b], k) => { for (let i = 0; i < w; i += 32) { x.fillStyle = a; x.fillRect(i, k * 64, 16, 64); x.fillStyle = b; x.fillRect(i + 16, k * 64, 16, 64); } x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, k * 64 + 58, w, 6); }); }, true, false);
const CLOCKTEX = canvasTex(256, 256, (x) => { x.fillStyle = '#3a2a1a'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(128, 128, 110, 0, 7); x.fill();
  x.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillRect(128 + Math.sin(a) * 92 - 3, 128 - Math.cos(a) * 92 - 3, 6, 6); }
  const hand = (a, l, wd) => { x.save(); x.translate(128, 128); x.rotate(a); x.fillRect(-wd / 2, -l, wd, l + 10); x.restore(); };
  hand((8.25 / 12) * Math.PI * 2, 58, 9); hand((15 / 60) * Math.PI * 2, 86, 6); }, true, false);
const FLAME = canvasTex(128, 256, (x) => { const g = x.createRadialGradient(64, 205, 4, 64, 170, 120); g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(0.25, 'rgba(255,205,95,0.95)'); g.addColorStop(0.55, 'rgba(255,110,30,0.6)'); g.addColorStop(1, 'rgba(170,40,10,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(64, 0); x.bezierCurveTo(12, 110, 2, 200, 64, 252); x.bezierCurveTo(126, 200, 116, 110, 64, 0); x.fill(); }, true, false);
const MPUFF = canvasTex(256, 256, (x) => { const r = RNG(91);
  for (let i = 0; i < 120; i++) { const a = r() * 6.28, d = Math.pow(r(), 0.6) * 84, cx = 128 + Math.cos(a) * d, cy = 128 + Math.sin(a) * d, rr = 14 + r() * 34 * (1 - d / 120), g = x.createRadialGradient(cx, cy - rr * 0.25, 0, cx, cy, rr);
    const v = 190 + r() * 65 | 0; g.addColorStop(0, `rgba(${v},${v},${v},0.5)`); g.addColorStop(0.7, `rgba(${v - 40},${v - 40},${v - 40},0.24)`); g.addColorStop(1, 'rgba(150,150,150,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); } }, false, false);

// =====================================================================================
// camera keys (needed early: crowds avoid the walker's path)
// =====================================================================================
function mono(keys) {   // monotone cubic Hermite per column (no overshoot); keys: [t, v1, v2, ...]
  const n = keys.length, D = keys[0].length - 1, T = keys.map(k => k[0]), M = [];
  for (let d = 0; d < D; d++) {
    const V = keys.map(k => k[d + 1]), del = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) del.push((V[i + 1] - V[i]) / (T[i + 1] - T[i]));
    m[0] = del[0]; m[n - 1] = del[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = del[i - 1] * del[i] <= 0 ? 0 : (del[i - 1] + del[i]) / 2;
    for (let i = 0; i < n - 1; i++) { if (del[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; } const a = m[i] / del[i], b = m[i + 1] / del[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * del[i]; m[i + 1] = k * b * del[i]; } }
    M.push({ V, m });
  }
  return t => { let i = 0; while (i < n - 2 && t > T[i + 1]) i++; const h = T[i + 1] - T[i], s = clamp((t - T[i]) / h), s2 = s * s, s3 = s2 * s;
    const a0 = 2 * s3 - 3 * s2 + 1, a1 = s3 - 2 * s2 + s, a2 = -2 * s3 + 3 * s2, a3 = s3 - s2;
    return M.map(({ V, m }) => a0 * V[i] + a1 * h * m[i] + a2 * V[i + 1] + a3 * h * m[i + 1]); };
}
const CAM1 = mono([[0, 3.4, 1.58, 20], [6, 3.3, 1.58, 11.6], [12, 3.0, 1.58, 3.2], [16, 3.1, 1.58, -2.4], [18.4, 3.2, 1.58, -5.0], [19.6, 3.25, 1.58, -5.6], [27.5, 3.25, 1.58, -5.7],
  [28.8, 3.3, 1.56, -5.2], [30.2, 3.35, 1.55, -5.4], [31.4, 3.9, 1.5, -9.4], [33.2, 5.6, 1.5, -18.0], [35.0, 8.3, 1.52, -27.6], [36.0, 10.3, 1.86, -33.2], [36.7, 12.4, 2.0, -35.0],
  [37.7, 15.6, 2.0, -38.6], [39.0, 19.0, 2.0, -42.8], [40.2, 20.4, 1.92, -45.6], [41.5, 20.5, 1.9, -46.1],
  [41.75, 20.6, 1.8, -45.0], [42.1, 20.9, 1.0, -43.0], [42.5, 21.0, 0.66, -42.2], [46.0, 21.0, 0.66, -42.1], [47.2, 21.0, 0.95, -42.0], [48.2, 21.0, 1.28, -41.8], [54.0, 21.2, 1.32, -41.4], [56.6, 21.2, 1.0, -41.4]]);
const CAM2 = mono([[TOUT, 4.4, 1.52, -38.5], [63.5, 4.1, 1.52, -42.0], [68.5, 3.5, 1.52, -45.8], [73.5, 2.9, 1.52, -49.2], [78.5, 2.7, 1.52, -51.4], [84, 2.7, 1.52, -52.0]]);
const LOOK1 = mono([[0, 0.05, -0.04], [2.5, 0.3, -0.02], [4.5, 0.35, -0.03], [6.2, 0.8, -0.06], [8.0, 0.35, -0.02], [9.5, 0.05, 0.0], [11.5, -0.55, -0.06], [13.5, -0.35, -0.02], [15.5, 0.08, 0.02], [17.0, 0.0, 0.06], [18.2, 0.0, 0.2],
  [30.2, 0.0, 0.1], [31.0, -0.04, -0.06], [33.2, -0.15, -0.04], [35.0, -0.5, -0.06], [36.0, -0.8, -0.12], [36.7, -0.75, -0.05], [37.7, -0.6, 0.0], [39.0, -0.2, 0.12], [40.2, 0.0, 0.42], [41.5, 0.02, 0.48],
  [41.8, 0.3, 0.3], [42.1, 0.5, 0.95], [42.5, 0.7, 0.35], [46.0, 1.3, 0.05], [47.2, 1.6, -0.55], [48.2, 2.0, -0.12], [50.2, 2.5, -0.1], [52.2, 3.0, -0.14], [54.0, 3.4, -0.1], [56.6, 3.5, -0.45]]);
const LOOK2 = mono([[TOUT, 0.25, -0.05], [61.5, 0.6, -0.12], [63.5, 0.2, -0.04], [65.5, -0.5, -0.1], [67.5, -0.2, 0.0], [69.5, 0.1, 0.04], [72, 0.0, 0.14], [74.5, -0.05, 0.42], [78.5, 0.0, 0.5], [84, 0.0, 0.52]]);
const ROLL1 = mono([[0, 0], [41.5, 0], [41.8, 0.5], [42.5, 1.2], [46.0, 1.05], [47.2, 0.25], [48.2, 0.05], [54, 0], [56.6, 0.3]]);
const FOVT = mono([[0, 72], [18.2, 72], [20.4, 30], [23.4, 30], [25.6, 50], [27.5, 58], [27.6, 74], [60, 74], [84, 76]]);
const camPosRaw = t => t >= TOUT - 0.5 ? CAM2(t) : CAM1(t);
const camSpeed = t => { const a = camPosRaw(t - 0.05), b = camPosRaw(t + 0.05); return Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.1; };
const walkMask = t => t < TBL ? 1 : t < 48.2 ? 0 : t < 54 ? 0.25 : t < TOUT ? 0 : 1;
const PH = (() => { const dt = 1 / 120, N = Math.ceil(TL.duration / dt) + 2, a = new Float32Array(N), s = new Float32Array(N); let ph = 0;
  for (let i = 0; i < N; i++) { const t = i * dt, sp = camSpeed(t); s[i] = sp; a[i] = ph; ph += 2 * Math.PI * (sp < 0.08 ? 0 : 0.5 + 0.21 * sp) * dt; }
  return { a, s, dt }; })();

// =====================================================================================
// ground, street, rails
// =====================================================================================
const planeUV = (w, h, tw, th) => { const g = new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tw, uv.getY(i) * h / th); return g; };
{ const g = mesh(planeUV(6000, 6000, 10, 10), STD(0xffffff, { map: DIRT, roughness: 0.97 }), 0, -0.01, 0); g.castShadow = false; COMMON.add(g);
  const road = mesh(planeUV(16, 1300, 8, 8), STD(0xffffff, { map: ROAD, roughness: 0.95 }), 0, 0.005, -400); road.castShadow = false; COMMON.add(road);
  const rail = STD(0x6a6460, { roughness: 0.35, metalness: 0.8 });
  for (const c of [-3.6, -0.4]) { const s = mesh(planeUV(1.7, 1300, 1.2, 1.2), STD(0xffffff, { map: SETTS, roughness: 0.9 }), c, 0.012, -400); s.castShadow = false; COMMON.add(s);
    for (const o of [-0.535, 0.535]) COMMON.add(box(0.07, 0.05, 1300, rail, c + o, 0.03, -400)); }
  for (const s of [-1, 1]) { const p = mesh(planeUV(3.2, 1300, 2, 2), STD(0xffffff, { map: PAVE, roughness: 0.92 }), s * 9.6, 0.15, -400); p.castShadow = false; COMMON.add(p);
    COMMON.add(box(0.22, 0.15, 1300, STD(0x9a9488, { map: DETAIL }), s * 8.1, 0.075, -400)); }
}
const groundY = (x, z) => (Math.abs(x) >= 8 && Math.abs(x) <= 11.2) ? 0.15 : (x > 11 && x < 30 && z > -50 && z < -20) ? 0.4 : 0;

// =====================================================================================
// houses along the street (three rows each side)
// =====================================================================================
const GAPS = [[38, 46], [-58, -50], [-138, -130], [-226, -218], [-330, -322], [-450, -442], [-560, -552]];
const EXCL = [ { s: 1, x0: 11, x1: 31, z0: -50.5, z1: -19.5 },          // the bank
  { s: 1, x0: 11, x1: 70, z0: -76, z1: -57.5 },                           // cleared firebreak lot
  { s: 1, x0: 11, x1: 25, z0: -172, z1: -148 }, { s: -1, x0: 11, x1: 27, z0: -202, z1: -175 }, { s: 1, x0: 11, x1: 25, z0: -286, z1: -261 },
  { s: -1, x0: 11, x1: 26, z0: -320, z1: -298 }, { s: -1, x0: 11, x1: 24, z0: -39, z1: -23 } ];
const CONC = [ { s: 1, z0: -170, z1: -150, w: 13, h: 15, tex: WINTEX }, { s: -1, z0: -200, z1: -177, w: 15, h: 19, tex: WINTEX2 }, { s: 1, z0: -284, z1: -263, w: 13, h: 13, tex: WINTEX },
  { s: -1, z0: -318, z1: -300, w: 14, h: 16, tex: WINTEX2 }, { s: -1, z0: -38, z1: -24, w: 12, h: 9.5, tex: WINTEX } ];
const LOTS = [];
for (const s of [-1, 1]) for (let row = 0; row < 3; row++) {
  const r = RNG(100 + row * 7 + (s > 0 ? 1 : 0)); let z = 160;
  while (z > -1100) {
    const near = row < 2 && z > -520, L = pickLot(r, 0, 0, 0, 0, near, row === 0 ? 0.42 : 0), z0 = z - L.w, z1 = z;
    const g = GAPS.find(([a, b]) => z0 < b && z1 > a); if (g) { z = g[0] - 0.1; continue; }
    const xin = 11 + row * 10.5, xout = xin + L.d;
    const e = EXCL.find(R => R.s === s && xin < R.x1 && xout > R.x0 && z0 < R.z1 && z1 > R.z0); if (e) { z = e.z0 - 0.1; continue; }
    Object.assign(L, { x: s * (xin + L.d / 2), z: (z0 + z1) / 2, row, s }); LOTS.push(L); z = z0 - 0.2 - (row ? r() * 1.4 : 0);
  }
}
buildHouses(BEFORE, LOTS, true);
// concrete buildings (survive, gutted)
for (const c of CONC) { const d = c.z1 - c.z0, b = facadeBox(c.w, c.h, d, c.tex, 4.2, 3.4); b.position.set(c.s * (11 + c.w / 2), 0, (c.z0 + c.z1) / 2); COMMON.add(b); }
// signboards, nobori flags, awnings and goods in front of the street-side shops
{ const r = RNG(55), signMat = STD(0xffffff, { map: SIGNS, roughness: 0.7, side: THREE.DoubleSide }), flagMat = STD(0xffffff, { map: FLAGS, roughness: 0.9, side: THREE.DoubleSide }), awnMat = STD(0xffffff, { map: AWN, roughness: 0.9, side: THREE.DoubleSide });
  const atlasPlane = (w, h, k, n, rowK = 0, rows = 1) => { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (k + uv.getX(i)) / n, (rowK + uv.getY(i)) / rows); return g; };
  const goods = ['#c84a2a', '#e0b040', '#6a8a3a', '#d8d0c0', '#7a5a3a', '#b8a070', '#8a3a2a'];
  for (const L of LOTS) { if (L.row !== 0 || L.z < -420) continue; const s = L.s, fx = s * 11;
    if (r() < 0.55) { const sg = mesh(atlasPlane(0.55, 2.0, (r() * 8) | 0, 8), signMat, fx - s * 0.5, 3.4 + r() * 1.2, L.z + (r() - 0.5) * L.w * 0.6); sg.rotation.y = Math.PI / 2 * 0; BSTAT.add(sg); }
    if (r() < 0.35) { const k = (r() * 8) | 0, zz = L.z + (r() - 0.5) * L.w * 0.7; BSTAT.add(cyl(0.025, 0.025, 2.9, DARKW, fx - s * 0.9, 1.6, zz, 5)); const f = mesh(atlasPlane(0.55, 2.0, k, 8), flagMat, fx - s * 0.9, 1.95, zz + 0.3); BSTAT.add(f); }
    if (L.v === 'D' || (L.v === 'A' && r() < 0.4)) { const row = (r() * 4) | 0, v0 = row / 4 + 0.01, v1 = (row + 1) / 4 - 0.03, hw = L.w * 0.46, gb = new GB(); gb.quad([fx - s * 0.02, 2.95, L.z - hw], [fx - s * 0.02, 2.95, L.z + hw], [fx - s * 1.6, 2.35, L.z + hw], [fx - s * 1.6, 2.35, L.z - hw], [0, v0], [L.w / 4, v0], [L.w / 4, v1], [0, v1]); const aw = mesh(gb.geo(), awnMat); BSTAT.add(aw);
      for (let i = 0; i < 3; i++) if (r() < 0.7) BSTAT.add(box(0.5 + r() * 0.4, 0.3 + r() * 0.35, 0.4 + r() * 0.3, STD(goods[(r() * goods.length) | 0], { roughness: 0.8 }), fx - s * (0.5 + r() * 0.4), 0.3, L.z + (r() - 0.5) * L.w * 0.7)); }
    if (r() < 0.2) BSTAT.add(cyl(0.3, 0.26, 0.6, STD(0x7a5a3a, { roughness: 0.85 }), fx - s * 0.5, 0.45, L.z + (r() - 0.5) * 3, 10));
  }
}
// far mountains (taller to the north)
{ const pos = [], col = [], idx = [], N = 180;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, R = 7600 + 2400 * (0.5 + 0.5 * fbm(Math.cos(a) * 2, Math.sin(a) * 2, 3)),
      hgt = (220 + 700 * ridge(Math.cos(a) * 3 + 9, Math.sin(a) * 3, 4)) * (0.5 + 0.7 * smooth((Math.cos(a) + 0.3) / 1.3)), x = Math.sin(a) * R, z = -Math.cos(a) * R;
    pos.push(x * 1.06, -40, z * 1.06, x, hgt, z); col.push(0.2, 0.27, 0.24, 0.3, 0.4, 0.34); if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  COMMON.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }))); }
// utility poles + wires, tram span poles + contact wires
const POLES = [];
{ const wood = STD(0x5a4632, { roughness: 0.9 }), wire = STD(0x222222, { roughness: 0.6 }), grey = STD(0x6a6a66, { roughness: 0.7, metalness: 0.4 });
  for (const s of [-1, 1]) for (let z = 150 + (s > 0 ? 14 : 0); z > -720; z -= 28) { if (s > 0 && z < -18 && z > -52) continue; BSTAT.add(cyl(0.11, 0.14, 9.2, wood, s * 7.85, 4.6, z, 7), box(1.7, 0.1, 0.12, wood, s * 7.85, 8.3, z), box(1.2, 0.08, 0.1, wood, s * 7.85, 7.6, z)); POLES.push({ x: s * 7.85, z }); }
  for (const s of [-1, 1]) for (const o of [-0.7, 0, 0.7]) BSTAT.add(box(0.025, 0.025, 880, wire, s * 7.85 + o, o === 0 ? 8.45 : 8.36, -285)), BSTAT.add(box(0.02, 0.02, 880, wire, s * 7.85 + o * 0.8, 7.68, -285));
  for (let z = 140; z > -720; z -= 32) { for (const s of [-1, 1]) BSTAT.add(cyl(0.09, 0.12, 7.2, grey, s * 6.4, 3.6, z, 8)); BSTAT.add(box(12.8, 0.03, 0.03, wire, 0, 6.6, z)); }
  for (const c of [-3.6, -0.4]) BSTAT.add(box(0.03, 0.03, 880, wire, c, 5.9, -285));
}
// willows along the kerb
const TREES = [];
{ const r = RNG(61); for (const s of [-1, 1]) for (let z = 130; z > -520; z -= s < 0 ? 17 : 31) { if (s > 0 && z < -15 && z > -80) continue; if (GAPS.some(([a, b]) => z > a - 2 && z < b + 2)) continue; TREES.push({ p: 'willow', x: s * 8.55, y: 0.15, z: z + (r() - 0.5) * 3, s: 0.8 + r() * 0.25, ry: r() * 6 }); }
  buildTrees(BEFORE, TREES); }
// high summer clouds
{ const r = RNG(71); for (const [x, y, z, R] of [[-3800, 1700, -6400, 420], [4600, 2000, -6000, 480], [-6500, 2100, 1500, 520], [5200, 1800, 3200, 450], [1500, 2300, 7000, 520], [-2600, 1900, -9500, 600], [8000, 2200, -2500, 500]]) { const c = cloud((r() * 1000) | 0, R); c.position.set(x, y, z); BEFORE.add(c); } }

// =====================================================================================
// the bank (reinforced concrete) — where we take cover
// =====================================================================================
const BANKG = new THREE.Group(); COMMON.add(BANKG);
const BWALL = STD(0xd6ccb8, { map: DETAIL, roughness: 0.92 }), IRON = STD(0x3a4440, { roughness: 0.5, metalness: 0.5 }), GLASSM = new THREE.MeshStandardMaterial({ color: 0xc8dce0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
const GLASS = [], WINS = [];
function holedWall(axis, c0, c1, a0, a1, y0, y1, holes) {
  const add = (p0, p1, q0, q1) => { if (p1 - p0 < 0.01 || q1 - q0 < 0.01) return; const w = c1 - c0, L = p1 - p0, H = q1 - q0, cm = (c0 + c1) / 2, pm = (p0 + p1) / 2, qm = (q0 + q1) / 2;
    BANKG.add(axis === 'x' ? box(w, H, L, BWALL, cm, qm, pm) : box(L, H, w, BWALL, pm, qm, cm)); };
  let cur = a0; for (const [h0, h1, hy0, hy1, glass] of holes.sort((a, b) => a[0] - b[0])) { add(cur, h0, y0, y1); add(h0, h1, y0, hy0); add(h0, h1, hy1, y1); cur = h1;
    if (glass === false) continue; const cm = (c0 + c1) / 2, pm = (h0 + h1) / 2, qm = (hy0 + hy1) / 2, W = h1 - h0, H = hy1 - hy0, fr = [];
    if (axis === 'x') { fr.push(box(0.12, H, 0.08, IRON, cm, qm, pm), box(0.12, 0.08, W, IRON, cm, hy0 + H * 0.68, pm)); }
    else { fr.push(box(0.08, H, 0.12, IRON, pm, qm, cm), box(W, 0.08, 0.12, IRON, pm, hy0 + H * 0.68, cm)); }
    fr.forEach(f => BANKG.add(f)); const g = new THREE.Mesh(new THREE.PlaneGeometry(W, H), GLASSM); g.position.set(axis === 'x' ? cm : pm, qm, axis === 'x' ? pm : cm); if (axis === 'x') g.rotation.y = Math.PI / 2; BANKG.add(g); GLASS.push(g);
    WINS.push({ axis, c: cm, p0: h0, p1: h1, y0: hy0, y1: hy1, frames: fr }); }
  add(cur, a1, y0, y1);
}
holedWall('x', 11, 11.5, -50, -20, 0, 6.4, [[-25, -23, 1.6, 4.6], [-30, -28, 1.6, 4.6], [-36.5, -33.5, 0.4, 4.0, false], [-42, -40, 1.6, 4.6], [-47, -45, 1.6, 4.6]]);
holedWall('z', -50, -49.5, 11.5, 29.5, 0, 6.4, [[14.3, 16.7, 1.3, 5.8], [19.3, 21.7, 1.3, 5.8], [24.3, 26.7, 1.3, 5.8]]);
const SIDEWIN = WINS.filter(w => w.axis === 'z');
BANKG.add(box(0.5, 6.4, 30, BWALL, 29.75, 3.2, -35), box(18, 6.4, 0.5, BWALL, 20.5, 3.2, -20.25), box(19, 0.4, 30, BWALL, 20.5, 0.2, -35));
BANKG.add(box(18.4, 0.4, 29.4, STD(0xe6e0d2, { roughness: 0.9 }), 20.5, 6.2, -35));
{ const f = mesh(planeUV(18, 29, 1, 1), STD(0xffffff, { map: FLOORT, roughness: 0.35 }), 20.5, 0.405, -35); f.castShadow = false; BANKG.add(f);
  const up = facadeBox(19, 6.4, 30, BANKTEX, 4.75, 3.2); up.position.set(20.5, 6.4, -35); BANKG.add(up);
  BANKG.add(box(19.6, 0.45, 30.6, STD(0xbcb09a, { map: DETAIL }), 20.5, 6.6, -35), box(19.8, 0.6, 30.8, STD(0xbcb09a, { map: DETAIL }), 20.5, 12.9, -35));
  BANKG.add(box(1.4, 0.13, 5, BWALL, 10.3, 0.2, -35), box(0.7, 0.13, 5, BWALL, 10.65, 0.33, -35));
  for (const z of [-37.1, -32.9]) BANKG.add(box(0.7, 4.8, 0.7, STD(0xc4b8a0, { map: DETAIL }), 10.9, 2.4, z));
  for (const z of [-36.4, -33.6]) { const d = box(0.08, 3.5, 1.4, DARKW, 11.8, 2.15, z + (z < -35 ? 0.7 : -0.7)); d.rotation.y = z < -35 ? 1.3 : -1.3; d.position.set(11.6 + 0.6, 2.15, z + (z < -35 ? 0.15 : -0.15)); BANKG.add(d); }
  for (const x of [17.5, 23.5]) for (const z of [-28, -42]) BANKG.add(box(0.7, 5.8, 0.7, BWALL, x, 3.3, z));
  BANKG.add(box(1.0, 1.1, 22, DARKW, 26, 0.95, -35), box(1.2, 0.08, 22.2, STD(0xd8d4cc, { roughness: 0.3 }), 26, 1.54, -35));
  for (const z of [-27, -43]) BANKG.add(box(0.5, 0.45, 3, DARKW, 13.4, 0.62, z));
  const ck = mesh(new THREE.CircleGeometry(0.55, 32), STD(0xffffff, { map: CLOCKTEX, roughness: 0.6 }), 20.5, 3.7, -20.48); ck.rotation.y = Math.PI; BANKG.add(ck);
}
const LAMPS = [];
for (const [x, z] of [[16, -31], [16, -39], [24, -31], [24, -39], [20, -46]]) { const g = new THREE.Group(); g.position.set(x, 6.0, z); g.add(box(0.03, 1.2, 0.03, IRON, 0, -0.6, 0));
  const gl = mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xffe8c0, emissiveIntensity: 0.8, roughness: 0.4 }), 0, -1.3, 0); g.add(gl); g.userData.gl = gl; COMMON.add(g); LAMPS.push(g); }
const WINL = SIDEWIN.map(w => { const l = new THREE.PointLight(0xfff4e4, 0, 16, 2); l.position.set((w.p0 + w.p1) / 2, 3.3, -48.4); COMMON.add(l); return l; });
{ const l = new THREE.PointLight(0xfff4e4, 0, 14, 2); l.position.set(12.6, 2.6, -35); COMMON.add(l); WINL.push(l); }
// firebreak lot north of the bank: cleared ground with stacked timber from demolished houses
{ const r = RNG(81); for (let i = 0; i < 9; i++) { const x = 18 + r() * 40, z = -62 - r() * 11, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r() * 3;
    for (let k = 0; k < 7; k++) g.add(box(0.2, 0.2, 3 + r() * 2, STD(0x7a5a3c, { roughness: 0.9 }), (k % 4) * 0.24 - 0.36, 0.1 + Math.floor(k / 4) * 0.2, 0)); COMMON.add(g); } }

// =====================================================================================
// trams, bicycles, carts
// =====================================================================================
const TRAMA = tram(), TRAMB = tram(); BEFORE.add(TRAMA, TRAMB);
const tramAz = t => t < TB ? 40 - 4.5 * t : (40 - 4.5 * TB) - 4.5 * (Math.min(t - TB, 2) - Math.min(t - TB, 2) ** 2 / 4);
const tramBz = t => t < TB ? -120 + 7 * t : (-120 + 7 * TB) + 7 * (Math.min(t - TB, 2) - Math.min(t - TB, 2) ** 2 / 4);
function bicycle() { const g = new THREE.Group(), dk = STD(0x1c1c1c, { roughness: 0.45, metalness: 0.6 }); g.userData.wheels = [];
  for (const z of [-0.52, 0.52]) { const w = mesh(new THREE.TorusGeometry(0.33, 0.02, 6, 22), dk, 0, 0.35, z); w.rotation.set(0, Math.PI / 2, 0); g.add(w); g.userData.wheels.push(w); }
  const bar = (a, b, r = 0.018) => { const A = new V3(...a), B = new V3(...b), m = mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 5), dk); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), B.clone().sub(A).normalize()); g.add(m); };
  bar([0, 0.35, -0.52], [0, 0.85, -0.2]); bar([0, 0.85, -0.2], [0, 0.88, 0.38]); bar([0, 0.35, -0.52], [0, 0.4, 0.05]); bar([0, 0.4, 0.05], [0, 0.85, -0.2]); bar([0, 0.4, 0.05], [0, 0.88, 0.38]); bar([0, 0.88, 0.38], [0, 0.35, 0.52]); bar([0, 0.88, 0.38], [0, 1.02, 0.42]);
  g.add(box(0.5, 0.03, 0.03, dk, 0, 1.02, 0.42), box(0.12, 0.05, 0.24, STD(0x3a2a1c), 0, 0.92, -0.24), box(0.28, 0.03, 0.34, dk, 0, 0.72, -0.62)); return g; }
function cart() { const g = new THREE.Group(), wd = STD(0x7a5a3a, { roughness: 0.9 }); g.userData.wheels = [];
  for (const x of [-0.62, 0.62]) { const w = mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 18), DARKW, x, 0.44, 0); w.rotation.y = Math.PI / 2; g.add(w); g.userData.wheels.push(w); }
  g.add(box(1.2, 0.12, 1.7, wd, 0, 0.62, 0)); for (const x of [-0.5, 0.5]) g.add(box(0.06, 0.06, 1.6, wd, x, 0.68, 1.3));
  const r = RNG(9); for (let i = 0; i < 5; i++) g.add(box(0.4 + r() * 0.2, 0.3 + r() * 0.2, 0.4, STD(['#b8a070', '#8a6a4a', '#d8d0c0', '#6a8a3a'][i % 4]), (r() - 0.5) * 0.6, 0.85 + (i > 2 ? 0.3 : 0), (r() - 0.5) * 1.0)); return g; }

// =====================================================================================
// people: articulated low-poly figures (instanced), with walk/run/look/shield/crouch/cry poses
// =====================================================================================
const PG = (() => {
  const cap = (r, l, y) => { const g = new THREE.CapsuleGeometry(r, l, 4, 10).deleteAttribute('uv'); g.translate(0, y, 0); return g; };
  const torso = cap(0.15, 0.3, 0.3); { const p = torso.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1.18 + 0.16 * smooth((y - 0.28) / 0.25); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * 0.74); } torso.computeVertexNormals(); }
  const head = new THREE.SphereGeometry(0.105, 14, 10).deleteAttribute('uv'); head.scale(0.92, 1.05, 1); head.translate(0, 0.14, 0);
  const neck = new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8).deleteAttribute('uv'); neck.translate(0, 0.03, 0);
  const hg = mergeGeometries([neck, head]), hp = hg.attributes.position, hc = new Float32Array(hp.count * 3);
  for (let i = 0; i < hp.count; i++) { const y = hp.getY(i), z = hp.getZ(i); const hair = y > 0.215 || (y > 0.18 && z < 0.07) || (z < -0.035 && y > 0.1); hc.set(hair ? [0.05, 0.045, 0.04] : [1, 1, 1], i * 3); }
  hg.setAttribute('color', new THREE.BufferAttribute(hc, 3));
  const hat = mergeGeometries([new THREE.CylinderGeometry(0.112, 0.114, 0.075, 14).deleteAttribute('uv').translate(0, 0.235, 0), new THREE.BoxGeometry(0.15, 0.012, 0.1).deleteAttribute('uv').translate(0, 0.205, 0.1)]);
  const thigh = cap(0.07, 0.31, -0.215), shin = mergeGeometries([cap(0.056, 0.32, -0.215), new THREE.BoxGeometry(0.09, 0.06, 0.21).deleteAttribute('uv').translate(0, -0.44, 0.045)]);
  const uarm = cap(0.05, 0.2, -0.145), farm = cap(0.042, 0.19, -0.135), hand = new THREE.SphereGeometry(0.045, 8, 6).deleteAttribute('uv'); hand.scale(0.8, 1.2, 0.6); hand.translate(0, -0.3, 0);
  return { torso, head: hg, hat, thigh, shin, uarm, farm, hand };
})();
const _m4 = () => new THREE.Matrix4(), mT = (x, y, z) => _m4().makeTranslation(x, y, z), mRX = a => _m4().makeRotationX(a), mRY = a => _m4().makeRotationY(a), mRZ = a => _m4().makeRotationZ(a);
const ZERO = _m4().makeScale(0, 0, 0);
const baseJ = () => ({ hipY: 0.86, lean: 0.02, twist: 0, headP: 0, headY: 0, lh: 0, rh: 0, lk: 0.05, rk: 0.05, ls: 0, rs: 0, la: 0.07, ra: 0.07, le: 0.15, re: 0.15 });
function gaitJ(sp, ph, t, seed = 0) {
  const J = baseJ(), a = clamp((sp - 1.9) / 2.4), g = clamp(sp / 0.7), amp = lerp(0.34, 0.85, a) * g, s1 = Math.sin(ph);
  J.lh = s1 * amp + 0.22 * a; J.rh = -s1 * amp + 0.22 * a;
  J.lk = 0.06 + lerp(0.1, 0.3, a) * g + Math.max(0, Math.sin(ph + 1.9)) * lerp(0.55, 1.5, a) * g;
  J.rk = 0.06 + lerp(0.1, 0.3, a) * g + Math.max(0, Math.sin(ph + Math.PI + 1.9)) * lerp(0.55, 1.5, a) * g;
  J.ls = -s1 * amp * lerp(0.7, 1.05, a); J.rs = s1 * amp * lerp(0.7, 1.05, a); J.le = J.re = lerp(0.2, 1.5, a * g); J.lean = lerp(0.03, 0.3, a);
  J.hipY = 0.86 - 0.05 * amp - 0.05 * a + Math.abs(Math.cos(ph)) * lerp(0.02, 0.06, a) * g;
  const idle = 1 - g; J.twist += idle * 0.05 * Math.sin(t * 0.7 + seed); J.headY += idle * 0.3 * Math.sin(t * 0.43 + seed * 3); J.headP += idle * 0.06 * Math.sin(t * 0.31 + seed);
  return J;
}
const POSE = {
  crouchCry(t, s) { const J = baseJ(), sob = 0.5 + 0.5 * Math.sin(t * 0.9 + s); Object.assign(J, { hipY: 0.44, lh: 1.95, rh: 1.95, lk: 2.35, rk: 2.35, lean: 0.75 + 0.05 * Math.sin(t * 8 + s) * sob, headP: 0.45 + 0.06 * Math.sin(t * 8 + s) * sob, ls: 1.35, rs: 1.35, le: 2.1, re: 2.1, la: 0.28, ra: 0.28 }); return J; },
  kneelCry(t, s) { const J = baseJ(), sob = 0.5 + 0.5 * Math.sin(t * 1.1 + s); Object.assign(J, { hipY: 0.5, lh: 0.15, rh: 0.15, lk: 1.6, rk: 1.6, lean: 0.55 + 0.06 * Math.sin(t * 7.5 + s) * sob, headP: 0.5, ls: 1.55, rs: 1.55, le: 2.05, re: 2.05, la: 0.25, ra: 0.25 }); return J; },
  sitHug(t, s) { const J = baseJ(); Object.assign(J, { hipY: 0.2, lh: 2.0, rh: 2.0, lk: 1.7, rk: 1.7, lean: 0.4 + 0.03 * Math.sin(t * 1.3 + s), headP: 0.6, ls: 1.1, rs: 1.1, le: 0.95, re: 0.95, la: 0.12, ra: 0.12 }); return J; },
  mother(t, s) { const J = baseJ(); Object.assign(J, { hipY: 0.17, lh: 1.45, rh: 1.45, lk: 1.9, rk: 1.9, lean: 0.3 + 0.03 * Math.sin(t * 2.2), headP: 0.5, ls: 0.95, rs: 0.95, le: 1.5, re: 1.5, la: 0.32, ra: 0.32, twist: 0.04 * Math.sin(t * 1.1) }); return J; },
  child(t, s) { const J = POSE.crouchCry(t, s); J.hipY = 0.36; J.lean = 0.25; J.headP = -0.1; J.ls = J.rs = 1.7; J.le = J.re = 0.6; J.la = J.ra = 0.5; return J; },
  dazed(t, s) { const J = baseJ(); Object.assign(J, { lean: 0.12 + 0.05 * Math.sin(t * 0.8 + s), twist: 0.15 * Math.sin(t * 0.5 + s), headP: 0.35, ls: 2.6, le: 2.1, la: 0.55, rs: 0.1, lk: 0.1, rk: 0.12, lh: 0.05, rh: -0.05 }); return J; },
  sitVendor(t, s) { const J = baseJ(); Object.assign(J, { hipY: 0.45, lh: 1.45, rh: 1.45, lk: 1.45, rk: 1.45, lean: 0.12, ls: 0.45, rs: 0.5, le: 1.1, re: 1.2, headY: 0.4 * Math.sin(t * 0.4 + s) }); return J; },
  search(t, s) { const J = POSE.kneelCry(t, s); J.lean = 0.85; J.headP = 0.4; J.ls = 0.9 + 0.4 * Math.sin(t * 1.6 + s); J.rs = 0.9 + 0.4 * Math.sin(t * 1.6 + s + 2); J.le = J.re = 0.3; return J; },
  stand(t, s) { return gaitJ(0, 0, t, s); },
};
const SK = ['#c99a76', '#d4a684', '#b88a68', '#deb08c', '#c4926c'].map(C);
const CL = { white: C('#efece4'), cream: C('#e8dcc0'), khaki: C('#9e9270'), khaki2: C('#7f7556'), grey: C('#8a8a86'), dark: C('#36363a'), navy: C('#272f46'), lblue: C('#b8cadb'), pink: C('#d9b4b0'), monpe1: C('#3a4a6a'), monpe2: C('#6a5242'), monpe3: C('#4e4a46'), black: C('#1c1c1e'), olive: C('#6e6a48') };
class Crowd {
  constructor(parent, people) {
    this.p = people; const n = people.length, M = (g, cnt, vc) => { const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: !!vc }), Math.max(1, cnt)); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m; };
    Object.assign(this, { T: M(PG.torso, n), H: M(PG.head, n, 1), C: M(PG.hat, n), TH: M(PG.thigh, 2 * n), SH: M(PG.shin, 2 * n), UA: M(PG.uarm, 2 * n), FA: M(PG.farm, 2 * n), HA: M(PG.hand, 2 * n) });
    people.forEach((q, i) => { this.T.setColorAt(i, q.shirt); this.H.setColorAt(i, q.skin); this.C.setColorAt(i, q.hat || q.shirt);
      for (const k of [0, 1]) { this.TH.setColorAt(i * 2 + k, q.trs); this.SH.setColorAt(i * 2 + k, q.bare ? q.skin : q.trs); this.UA.setColorAt(i * 2 + k, q.shirt); this.FA.setColorAt(i * 2 + k, q.short ? q.skin : q.shirt); this.HA.setColorAt(i * 2 + k, q.skin); } });
  }
  update(t) {
    const { T, H, C: HT, TH, SH, UA, FA, HA } = this;
    this.p.forEach((q, i) => {
      const st = q.state(t);
      if (!st) { for (const m of [T, H, HT]) m.setMatrixAt(i, ZERO); for (const m of [TH, SH, UA, FA, HA]) { m.setMatrixAt(i * 2, ZERO); m.setMatrixAt(i * 2 + 1, ZERO); } return; }
      const J = st.J, sc = st.sc, B = mT(st.x, st.y, st.z).multiply(mRY(st.yaw)).multiply(_m4().makeScale(sc, sc, sc));
      const hip = B.clone().multiply(mT(0, J.hipY, 0)), tor = hip.clone().multiply(mRY(J.twist)).multiply(mRX(J.lean));
      T.setMatrixAt(i, tor); const hd = tor.clone().multiply(mT(0, 0.6, 0)).multiply(mRY(J.headY)).multiply(mRX(J.headP)); H.setMatrixAt(i, hd); HT.setMatrixAt(i, q.hat ? hd : ZERO);
      for (const k of [0, 1]) { const s = k ? -1 : 1, hf = k ? J.rh : J.lh, kn = k ? J.rk : J.lk, sf = k ? J.rs : J.ls, el = k ? J.re : J.le, ab = k ? J.ra : J.la;
        const th = hip.clone().multiply(mT(s * 0.09, 0, 0)).multiply(mRX(-hf)); TH.setMatrixAt(i * 2 + k, th); SH.setMatrixAt(i * 2 + k, th.clone().multiply(mT(0, -0.43, 0)).multiply(mRX(kn)));
        const ua = tor.clone().multiply(mT(s * 0.2, 0.52, 0)).multiply(mRZ(s * ab)).multiply(mRX(-sf)); UA.setMatrixAt(i * 2 + k, ua);
        const fa = ua.clone().multiply(mT(0, -0.29, 0)).multiply(mRX(-el)); FA.setMatrixAt(i * 2 + k, fa); HA.setMatrixAt(i * 2 + k, fa); }
    });
    for (const m of [T, H, HT, TH, SH, UA, FA, HA]) m.instanceMatrix.needsUpdate = true;
  }
}
const RP = RNG(2024), rp = (a, b) => a + RP() * (b - a), pick = a => a[(RP() * a.length) | 0];
function dress(kind) {
  const q = { skin: pick(SK).clone().multiplyScalar(rp(0.94, 1.05)), sc: 1, hat: null, short: false, bare: false };
  if (kind === 'man') Object.assign(q, { shirt: pick([CL.white, CL.white, CL.khaki, CL.grey, CL.lblue, CL.cream]), trs: pick([CL.khaki2, CL.dark, CL.navy, CL.khaki2, CL.olive]), short: RP() < 0.6, hat: RP() < 0.4 ? pick([CL.khaki, CL.black, CL.khaki2]) : null, sc: rp(0.95, 1.03) });
  if (kind === 'woman') Object.assign(q, { shirt: pick([CL.white, CL.cream, CL.lblue, CL.pink, CL.white]), trs: pick([CL.monpe1, CL.monpe2, CL.monpe3, CL.monpe1]), short: RP() < 0.5, sc: rp(0.9, 0.96) });
  if (kind === 'girl') Object.assign(q, { shirt: pick([CL.white, CL.navy, CL.white]), trs: CL.navy, short: true, sc: rp(0.86, 0.92) });
  if (kind === 'boy') Object.assign(q, { shirt: pick([CL.dark, CL.white, CL.khaki]), trs: CL.dark, hat: CL.black, short: RP() < 0.5, sc: rp(0.86, 0.93) });
  if (kind === 'child') Object.assign(q, { shirt: pick([CL.white, CL.cream, CL.lblue]), trs: pick([CL.navy, CL.khaki2, CL.dark]), bare: true, short: true, sc: rp(0.6, 0.74) });
  return q;
}
const kindPick = () => { const k = RP(); return k < 0.4 ? 'man' : k < 0.7 ? 'woman' : k < 0.8 ? 'girl' : k < 0.9 ? 'boy' : 'child'; };
const ashen = q => { q.shirt = q.shirt.clone().lerp(C('#6a6058'), 0.55); q.trs = q.trs.clone().lerp(C('#4a4440'), 0.5); q.skin = q.skin.clone().lerp(C('#8a7a70'), 0.45); q.hat = null; return q; };

// ---------- street agents: simulated walk -> stop/look up -> flash -> run ----------
const SIMN = Math.ceil(TBL * 30) + 2, freqOf = sp => sp < 0.05 ? 0 : 0.5 + 0.21 * sp;
function simulate(o) {
  const X = new Float32Array(SIMN), Z = new Float32Array(SIMN), Y = new Float32Array(SIMN), S = new Float32Array(SIMN), P = new Float32Array(SIMN);
  let x = o.x0, z = o.z0, sp = o.v, ph = o.ph0 || 0; const a0 = Math.atan2(o.dir[0], o.dir[1]), a1 = Math.atan2(o.runDir[0], o.runDir[1]); let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
  for (let i = 0; i < SIMN; i++) { const t = i / 30; let tgt = o.v, acc = o.acc || 1.4, ang = a0;
    if (t > o.tStop) tgt = 0;
    if (t > o.runT) { tgt = o.runV; acc = 6; ang = a0 + da * smooth((t - o.runT) / 0.45); }
    sp += clamp(tgt - sp, -acc / 30, acc / 30); x += Math.sin(ang) * sp / 30; z += Math.cos(ang) * sp / 30; ph += 2 * Math.PI * (o.ride && t < o.runT ? sp * 0.28 : freqOf(sp)) / 30;
    X[i] = x; Z[i] = z; Y[i] = ang; S[i] = sp; P[i] = ph; }
  return { X, Z, Y, S, P };
}
function sampleSim(sm, t) { const f = clamp(t * 30, 0, SIMN - 1.001), i = Math.floor(f), u = f - i; let dy = sm.Y[i + 1] - sm.Y[i]; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  return { x: lerp(sm.X[i], sm.X[i + 1], u), z: lerp(sm.Z[i], sm.Z[i + 1], u), sp: lerp(sm.S[i], sm.S[i + 1], u), ph: lerp(sm.P[i], sm.P[i + 1], u), yaw: sm.Y[i] + dy * u }; }
function agentState(q, t) {
  const s = sampleSim(q.sim, t); let J;
  if (q.ride && t < q.runT) { J = baseJ(); const ph = s.ph; Object.assign(J, { hipY: 0.93, lean: 0.3, lh: 1.05 + 0.38 * Math.sin(ph), rh: 1.05 - 0.38 * Math.sin(ph), lk: 1.3 + 0.45 * Math.sin(ph + 1.3), rk: 1.3 - 0.45 * Math.sin(ph + 1.3), ls: 1.0, rs: 1.0, le: 0.35, re: 0.35, la: 0.16, ra: 0.16 }); }
  else if (q.sit && t < q.runT) J = POSE.sitVendor(t, q.seed);
  else { J = gaitJ(s.sp, s.ph, t, q.seed); if (q.pull && t < q.runT) { J.ls = J.rs = 0.5; J.le = J.re = 0.3; J.lean = 0.2; } }
  const lookW = q.look ? smooth((t - q.tStop - 0.4) / 1.2) * (1 - smooth((t - TB) / 0.25)) : 0;
  J.headP -= 0.8 * lookW; J.lean -= 0.08 * lookW;
  if (q.point) { const w = lookW * smooth((t - q.tStop - 1.6) / 0.6); J.rs = lerp(J.rs, 2.6, w); J.re = lerp(J.re, 0.1, w); J.ra = lerp(J.ra, 0.15, w); }
  if (q.shield) { const w = smooth((t - TB) / 0.2) * (1 - smooth((t - q.runT) / 0.5)); J.ls = lerp(J.ls, 2.1, w); J.le = lerp(J.le, 2.0, w); J.la = lerp(J.la, 0.35, w); J.rs = lerp(J.rs, 1.7, w * 0.7); J.re = lerp(J.re, 2.2, w * 0.7); J.headP = lerp(J.headP, 0.35, w); J.lean = lerp(J.lean, 0.2, w); J.twist += 0.4 * w * q.tw; }
  const off = q.ride && t < q.runT ? -0.15 : 0;
  return { x: s.x + Math.sin(s.yaw) * off, y: q.ride && t < q.runT ? 0 : groundY(s.x, s.z), z: s.z + Math.cos(s.yaw) * off, yaw: s.yaw, sc: q.sc, J };
}
const STREET = [], VEH = [];
function okPath(q) { for (let i = 0; i < SIMN; i += 2) { const t = i / 30, x = q.sim.X[i], z = q.sim.Z[i]; if (x > 11.2 && x < 31 && z > -51 && z < -19) return false; if (t < 36.3) { const c = camPosRaw(t); if (Math.hypot(x - c[0], z - c[2]) < (q.ride || q.pull ? 1.6 : 0.9)) return false; } } return true; }
function addAgent(kind, o) {
  const q = { ...dress(kind), ph0: RP() * 6.28, seed: RP() * 10, tw: RP() < 0.5 ? -1 : 1, acc: 1.4, ...o };
  for (let tries = 0; tries < 4; tries++) { q.sim = simulate(q); if (okPath(q)) { q.state = t => t > TBL ? null : agentState(q, t); STREET.push(q); return q; } q.x0 += (RP() < 0.5 ? -1 : 1) * 1.3; }
  return null;
}
function walker(kind, x, zMid, dir, v, extra = {}) {
  const stopper = RP() < 0.72, side = x > 0 ? 1 : -1, away = RP() < 0.72;
  return addAgent(kind, { x0: x - dir[0] * v * 13, z0: zMid - dir[1] * v * 13, dir, v, tStop: stopper ? rp(17.3, 20.5) : 99, look: stopper && RP() < 0.9, point: stopper && RP() < 0.15,
    shield: RP() < 0.65, runT: TB + rp(1.9, 3.6), runV: kind === 'child' ? rp(2.6, 3.4) : rp(3.6, 5.4), runDir: norm2(away ? [rp(-0.35, 0.35), 1] : [side, rp(-0.3, 0.5)]), ...extra });
}
for (const s of [-1, 1]) for (let i = 0; i < 52; i++) walker(kindPick(), s * rp(8.7, 10.4), rp(-150, 55), [0, RP() < 0.5 ? -1 : 1], rp(1.0, 1.45));
for (let i = 0; i < 26; i++) { const dz = RP() < 0.5 ? -1 : 1; walker(kindPick(), rp(-7.2, 7.2), rp(-130, 45), norm2([rp(-0.15, 0.15), dz]), rp(1.05, 1.4)); }
for (let i = 0; i < 9; i++) { const s = RP() < 0.5 ? -1 : 1; walker(kindPick(), 0, rp(-90, 30), norm2([s, rp(-0.25, 0.25)]), rp(1.0, 1.3)); }
for (let i = 0; i < 24; i++) { const s = RP() < 0.5 ? -1 : 1; walker(kindPick(), s * rp(10.0, 10.8), rp(-125, 40), RP() < 0.6 ? [-s, 0.001] : [0, RP() < 0.5 ? 1 : -1], 0, { tStop: 0 }); }
for (let i = 0; i < 6; i++) { const s = RP() < 0.5 ? -1 : 1; walker('man', s * 10.5, rp(-110, 30), [-s, 0.001], 0, { tStop: 0, sit: true, look: false }); }
for (let i = 0; i < 7; i++) walker('girl', -9.5 + (i % 3) * 0.55, -22 - i * 0.9, [0, 1], 1.2, { tStop: 18.2 + i * 0.15, look: true });
for (let i = 0; i < 44; i++) walker(kindPick(), (RP() < 0.5 ? -1 : 1) * rp(1, 10.4), rp(-420, -150), [0, RP() < 0.5 ? -1 : 1], rp(1.0, 1.4));
for (const [x, dz, v] of [[1.4, -1, 3.6], [6.2, 1, 3.3], [-6.0, -1, 4.0], [5.6, -1, 3.8], [-5.2, 1, 3.4], [0.9, 1, 4.2], [6.4, -1, 3.0]]) {
  const q = walker(RP() < 0.75 ? 'man' : 'boy', x, rp(-60, 30), [0, dz], v, { ride: true, tStop: TB + rp(0.3, 1.0), acc: 3, look: false, point: false, runT: TB + rp(2.2, 3.4) });
  if (q) { const b = bicycle(); BEFORE.add(b); VEH.push({ g: b, q, kind: 'bike', tip: (RP() < 0.5 ? -1 : 1) }); } }
for (const [x, dz] of [[6.5, -1], [-6.4, 1]]) { const q = walker('man', x, rp(-50, 10), [0, dz], 0.9, { pull: true, look: true, tStop: rp(18, 19.5) }); if (q) { const c = cart(); BEFORE.add(c); VEH.push({ g: c, q, kind: 'cart' }); } }
const CROWD_ST = new Crowd(BEFORE, STREET);
// inside the bank: two people at the windows before the blast; after it, people crouched and crying in the dust
const fixedP = (kind, x, z, yaw, pose, vis, extra = {}) => { const q = { ...dress(kind), seed: RP() * 10, ...extra }; q.state = t => vis(t) ? { x, y: groundY(x, z), z, yaw, sc: q.sc, J: POSE[pose](t, q.seed) } : null; return q; };
const visI1 = t => t > 35.5 && t < TBL, visI2 = t => t >= TBL && t < TOUT, visA = t => t >= TOUT;
const INSIDE = [
  fixedP('man', 16.2, -48.0, Math.PI, 'stand', visI1), fixedP('woman', 24.8, -48.1, Math.PI + 0.2, 'stand', visI1),
  fixedP('woman', 17.4, -39.6, 2.4, 'crouchCry', visI2), fixedP('woman', 16.6, -37.3, 2.0, 'mother', visI2), fixedP('child', 16.45, -37.0, 2.0 + Math.PI, 'child', visI2),
  fixedP('man', 19.1, -36.9, 2.9, 'kneelCry', visI2), fixedP('man', 20.9, -34.0, 3.4, 'dazed', visI2), fixedP('girl', 22.6, -37.3, -2.6, 'sitHug', visI2), fixedP('boy', 14.0, -40.6, 1.4, 'crouchCry', visI2),
  fixedP('woman', 24.6, -31.0, -2.0, 'sitHug', visI2) ].map(q => q.kind === 'child' ? q : q);
INSIDE[4].sc = 0.58; INSIDE[4].state = (st => t => { const s = st(t); if (s) { s.sc = 0.58; s.x = 16.6 + Math.sin(2.0) * 0.28; s.z = -37.3 + Math.cos(2.0) * 0.28; s.y = 0.4; } return s; })(INSIDE[4].state);
const CROWD_IN = new Crowd(COMMON, INSIDE);
// aftermath: dazed survivors
const AFTERP = [];
{ const mk = (kind, x, z, dirZ, v, arms) => { const q = ashen(dress(kind)); q.seed = RP() * 10; const ph0 = RP() * 6;
    q.state = t => { if (t < TOUT) return null; const dt = t - TOUT, zz = z + dirZ * v * dt, J = gaitJ(v, ph0 + 2 * Math.PI * freqOf(v) * dt, t, q.seed); J.lean += 0.12; J.headP += 0.3;
      if (arms) { J.ls = J.rs = 1.25 + 0.05 * Math.sin(t); J.le = J.re = 0.35; J.la = J.ra = 0.06; } return { x, y: groundY(x, zz), z: zz, yaw: dirZ > 0 ? 0 : Math.PI, sc: q.sc, J }; }; AFTERP.push(q); };
  mk('man', 0.6, -66, 1, 0.5, true); mk('woman', -2.2, -78, 1, 0.45, true); mk('man', 6.6, -90, 1, 0.55, false); mk('boy', -4.8, -72, 1, 0.5, true); mk('woman', 1.5, -98, 1, 0.42, false); mk('man', -1.0, -104, 1, 0.5, true); mk('girl', 5.4, -60, 1, 0.38, false);
  const fx = (kind, x, z, yaw, pose) => { const q = ashen(dress(kind)); q.seed = RP() * 10; q.state = t => t < TOUT ? null : { x, y: groundY(x, z), z, yaw, sc: q.sc, J: POSE[pose](t, q.seed) }; AFTERP.push(q); };
  fx('man', 7.3, -47, -1.2, 'sitHug'); fx('woman', -6.6, -44, 1.6, 'crouchCry'); fx('woman', -5.0, -61, 0.6, 'mother'); fx('man', -9.4, -53, -1.4, 'search'); fx('woman', 9.5, -38, -1.8, 'kneelCry'); fx('man', 0.4, -63, Math.PI, 'dazed'); fx('boy', -7.6, -80, 1.0, 'search');
  { const q = ashen(dress('child')); q.seed = 3; q.state = t => t < TOUT ? null : { x: -5.0 + Math.sin(0.6) * 0.28, y: 0, z: -61 + Math.cos(0.6) * 0.28, yaw: 0.6 + Math.PI, sc: 0.58, J: POSE.child(t, 3) }; AFTERP.push(q); } }
const CROWD_AF = new Crowd(AFTER, AFTERP);

// =====================================================================================
// the bomber and the bomb
// =====================================================================================
const PLANE = b29(); PLANE.scale.setScalar(3.5); PLANE.rotation.order = 'YXZ'; BEFORE.add(PLANE);
PLANE.traverse(o => { if (o.isMesh && o.material.transparent) o.visible = false; });   // no contrails
const P23 = new V3(180, 2600, -1900 - 75 * 7.4), TURN_R = 250;
const planePos = t => { if (t < 23.4) return new V3(180, 2600, -1900 - 75 * (t - 16)); const th = 0.3 * (t - 23.4); return new V3(P23.x + TURN_R - TURN_R * Math.cos(th), 2600 + 30 * (t - 23.4), P23.z - TURN_R * Math.sin(th)); };
const bombPos = t => { const s = clamp((t - 23.4) / (TB - 23.4)); return new V3(lerp(P23.x, HYPO.x, s), P23.y - (P23.y - HYPO.y) * s * s, lerp(P23.z, HYPO.z, s)); };
const BOMB = new THREE.Group(); BOMB.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 3, 12).rotateX(Math.PI / 2), STD(0x3c4034, { roughness: 0.5, metalness: 0.4 }))); BOMB.scale.setScalar(7); BEFORE.add(BOMB);
const BOMBGL = glow(0xfff6e0, 40, 0.5); BEFORE.add(BOMBGL);
const PLANE2GL = glow(0xfff6e0, 30, 0.4); BEFORE.add(PLANE2GL);
const BURSTGL = glow(0xfff2d0, 3000, 0); scene.add(BURSTGL);

// =====================================================================================
// puff renderer: camera-facing soft billboards, lit by the sun, sorted back to front
// =====================================================================================
const PMAX = 2800, PGEO = new THREE.InstancedBufferGeometry();
{ const pl = new THREE.PlaneGeometry(1, 1); PGEO.index = pl.index; PGEO.setAttribute('position', pl.attributes.position); PGEO.setAttribute('uv', pl.attributes.uv); }
const PA = { pos: new Float32Array(PMAX * 3), a: new Float32Array(PMAX * 4), b: new Float32Array(PMAX * 4), e: new Float32Array(PMAX * 4) };
const iattr = (arr, n) => { const at = new THREE.InstancedBufferAttribute(arr, n); at.setUsage(THREE.DynamicDrawUsage); return at; };
PGEO.setAttribute('iPos', iattr(PA.pos, 3)); PGEO.setAttribute('iA', iattr(PA.a, 4)); PGEO.setAttribute('iB', iattr(PA.b, 4)); PGEO.setAttribute('iE', iattr(PA.e, 4)); PGEO.instanceCount = 0;
const PU = { map: { value: MPUFF }, sunDir: { value: SUNV.clone() }, sunCol: { value: new THREE.Color(1.6, 1.5, 1.35) }, amb: { value: new THREE.Color(0.42, 0.48, 0.6) }, hazeCol: { value: new THREE.Color(0.8, 0.9, 1.05) }, hazeK: { value: 0.00009 }, camR: { value: new V3() }, camU: { value: new V3() } };
const PMAT = new THREE.ShaderMaterial({ uniforms: PU, transparent: true, depthWrite: false,
  vertexShader: `attribute vec3 iPos; attribute vec4 iA; attribute vec4 iB; attribute vec4 iE; uniform vec3 camR, camU;
    varying vec2 vUv; varying vec2 vQ; varying vec4 vB; varying vec4 vE; varying float vAl; varying vec3 vWP;
    void main(){ float c = cos(iA.y), s = sin(iA.y); vec2 q = position.xy; vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
      vec3 wp = iPos + (camR * r.x + camU * r.y) * iA.x; vUv = uv; vQ = q * 2.0; vB = iB; vE = iE; vAl = iA.z; vWP = iPos;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 sunDir, sunCol, amb, hazeCol, camR, camU; uniform float hazeK;
    varying vec2 vUv; varying vec2 vQ; varying vec4 vB; varying vec4 vE; varying float vAl; varying vec3 vWP;
    void main(){ vec4 tx = texture2D(map, vUv); float a = tx.a * vAl; if (a < 0.004) discard;
      vec3 toC = normalize(cameraPosition - vWP); float rr = dot(vQ, vQ);
      vec3 n = normalize(camR * vQ.x + camU * vQ.y + toC * sqrt(max(0.05, 1.0 - rr)));
      float dif = clamp(dot(n, sunDir) * 0.6 + 0.4, 0.0, 1.0);
      vec3 col = vB.rgb * (amb + sunCol * dif * vB.a) * (0.7 + 0.3 * tx.r);
      float h = 1.0 - exp(-length(cameraPosition - vWP) * hazeK); col = mix(col, hazeCol, h * 0.85) + vE.rgb * vE.a * (0.7 + 0.3 * tx.r) * (1.0 - h * 0.35);
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const PUFFS = new THREE.Mesh(PGEO, PMAT); PUFFS.frustumCulled = false; PUFFS.renderOrder = 5; scene.add(PUFFS);
const PL = [];
const puff = (x, y, z, s, rot, a, r, g, b, lit, er = 0, eg = 0, eb = 0, em = 0) => { if (a > 0.004) PL.push([x, y, z, s, rot, a, r, g, b, lit, er, eg, eb, em]); };
function flushPuffs() {
  const cp = camera.position, f = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  for (const p of PL) p.d = (p[0] - cp.x) * f.x + (p[1] - cp.y) * f.y + (p[2] - cp.z) * f.z;
  const L = PL.filter(p => p.d > -p[3] * 0.6).sort((a, b) => b.d - a.d).slice(-PMAX);
  L.forEach((p, i) => { PA.pos[i * 3] = p[0]; PA.pos[i * 3 + 1] = p[1]; PA.pos[i * 3 + 2] = p[2]; PA.a.set([p[3], p[4], p[5], 0], i * 4); PA.b.set([p[6], p[7], p[8], p[9]], i * 4); PA.e.set([p[10], p[11], p[12], p[13]], i * 4); });
  PGEO.instanceCount = L.length; for (const k of ['iPos', 'iA', 'iB', 'iE']) PGEO.attributes[k].needsUpdate = true;
  PU.camR.value.set(1, 0, 0).applyQuaternion(camera.quaternion); PU.camU.value.set(0, 1, 0).applyQuaternion(camera.quaternion); PL.length = 0;
}

// ---------- the mushroom cloud ----------
const capH = tau => 600 + 2900 * (1 - Math.exp(-tau / 14)) + 22 * Math.max(0, tau - 20);
const capR = tau => 260 + 820 * (1 - Math.exp(-tau / 11)) + 11 * Math.max(0, tau - 18);
const MB = (() => { const r = RNG(77), U = () => { const z = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - z * z); return new V3(s * Math.cos(a), z, s * Math.sin(a)); };
  return { fb: Array.from({ length: 160 }, () => ({ d: U(), k: Math.cbrt(r()), sz: 0.5 + r() * 0.5, rot: r() * 6.28 })),
    cap: Array.from({ length: 430 }, () => ({ th: r() * 6.283, ph: r() * 6.283, k: 0.35 + 0.65 * Math.sqrt(r()), sz: r(), rot: r() * 6.28 })),
    dome: Array.from({ length: 250 }, () => ({ th: r() * 6.283, v: r(), k: Math.cbrt(r()), sz: r(), rot: r() * 6.28 })),
    stem: Array.from({ length: 300 }, () => ({ s0: r(), a: r() * 6.283, k: Math.sqrt(r()), sz: r(), rot: r() * 6.28 })),
    base: Array.from({ length: 200 }, () => ({ a: r() * 6.283, k: r(), h: r(), sz: r(), rot: r() * 6.28 })),
    skirt: Array.from({ length: 50 }, () => ({ a: r() * 6.283, k: r(), sz: r(), rot: r() * 6.28 })) }; })();
const FC = new THREE.Color();
function mushroom(tau) {
  const cx = HYPO.x, cz = HYPO.z, H = capH(tau), Rm = capR(tau), rm = 0.5 * Rm + 40;
  if (tau < 6.5) { const R = 430 * (1 - Math.exp(-tau * 2.6)) + 30, cy = 600 + 45 * tau, a = 1 - smooth((tau - 3.0) / 3.0), em = 6 * Math.exp(-tau / 1.2) + 3.4 * Math.exp(-tau / 2.5) + 0.8 + 6 * Math.exp(-tau / 0.4), k = clamp(tau / 4.5);
    FC.setRGB(1, lerp(0.45, 0.2, Math.sqrt(k)), lerp(0.1, 0.025, Math.sqrt(k)));
    for (const f of MB.fb) puff(cx + f.d.x * f.k * R * 0.8, cy + f.d.y * f.k * R * 0.8, cz + f.d.z * f.k * R * 0.8, R * 0.85 * (0.6 + f.sz * 0.6) + 40, f.rot, a * 0.95, 0.3, 0.22, 0.16, 0.12, FC.r, FC.g, FC.b, em * (1.2 - f.k * 0.5)); }
  const capA = smooth((tau - 2.2) / 3.0);
  if (capA > 0) { const roll = 0.55 * Math.log(1 + tau / 2.5), gl = 2.4 * Math.exp(-tau / 4);
    for (const c of MB.cap) { const ph = c.ph + roll, rr = rm * c.k, rho = Rm + rr * Math.cos(ph), sn = Math.sin(ph), y = H + rr * sn * 0.72, low = Math.max(0, -sn), br = lerp(0.95, 0.5, low * 0.85);
      puff(cx + rho * Math.cos(c.th), y, cz + rho * Math.sin(c.th), rm * (0.75 + c.sz * 0.6), c.rot + tau * 0.01, capA * 0.85, br, br * 0.95, br * lerp(0.9, 0.82, low), 1, 1, 0.32, 0.05, gl * (0.35 + low) * (1.1 - c.k * 0.6)); }
    for (const d of MB.dome) { const pol = Math.acos(1 - d.v), th = d.th + tau * 0.012, R = (Rm + rm * 0.45) * d.k;
      puff(cx + Math.cos(th) * Math.sin(pol) * R, H + rm * 0.15 + Math.cos(pol) * rm * 0.95 * d.k, cz + Math.sin(th) * Math.sin(pol) * R, rm * (0.7 + d.sz * 0.5), d.rot, capA * 0.8, 0.97, 0.95, 0.91, 1, 1, 0.32, 0.05, gl * 0.4 * (1 - d.k * 0.5)); } }
  const Htop = H - rm * 0.5, grow = smooth((tau - 2.4) / 8);
  if (grow > 0) for (const s of MB.stem) { const u = (s.s0 + tau * 0.018) % 1; if (u > grow) continue;
    const R = Rm * (0.17 + 0.14 * u ** 3) + Rm * 0.5 * (1 - u) ** 8, a = s.a + tau * 0.04, rr = R * s.k * 0.85;
    puff(cx + Math.cos(a) * rr, u * Htop + 30, cz + Math.sin(a) * rr, R * 0.95 * (0.7 + s.sz * 0.5) + 60, s.rot, 0.8 * smooth(u / 0.04) * smooth((grow - u) / 0.06),
      lerp(0.42, 0.8, u), lerp(0.35, 0.76, u), lerp(0.29, 0.72, u), 1, 1, 0.4, 0.1, tau > 2 ? 0.8 * (1 - u) ** 6 * Math.exp(-tau / 30) : 0); }
  const Rb = 2400 * (1 - Math.exp(-tau / 4.5)) + 300, ba = smooth((tau - 0.6) / 2);
  for (const b of MB.base) { const r = Rb * (0.25 + 0.75 * b.k);
    puff(cx + Math.cos(b.a) * r, 70 + b.h * (200 + Math.min(tau, 60) * 6), cz + Math.sin(b.a) * r, 260 + b.h * 200 + Math.min(tau, 60) * 4 + b.sz * 120, b.rot, 0.75 * ba, 0.36, 0.31, 0.27, 0.8, 1, 0.35, 0.1, 0.8 * Math.exp(-tau / 5)); }
  const sk = bump(tau, 2.5, 9.5, 1.5);
  if (sk > 0) for (const s of MB.skirt) { const r = Rm * (0.75 + 0.35 * s.k); puff(cx + Math.cos(s.a) * r, H * 0.62, cz + Math.sin(s.a) * r * 0.9, Rm * 0.3 * (0.6 + s.sz * 0.6), s.rot, 0.55 * sk, 0.96, 0.97, 1.0, 1); }
}

// =====================================================================================
// aftermath: ruins, fires, smoke, ash, black rain
// =====================================================================================
const MOUND = (detail) => { const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.38 * noise.noise3d(x * 2.2, y * 2.2, z * 2.2) + 0.16 * noise.noise3d(x * 6, y * 6, z * 6); p.setXYZ(i, x * n * 0.5, Math.max(0, y * n), z * n * 0.5); }
  g.computeVertexNormals(); return g; };
const CHAR = STD(0xffffff, { map: DETAIL, roughness: 0.97 });
const FIRES = [];
{ const r = RNG(303), near = [], far = [], beams = [], roofs = {}, walls = {}, kept = [];
  for (const L of LOTS) {
    const isNear = L.row < 2 && L.z > -270 && L.z < 60, ash = C('#4a4038').lerp(C('#7a6a5a'), r()).multiplyScalar(0.8 + r() * 0.4);
    if (L.v === 'C' && r() < 0.75) { kept.push(L); continue; }                           // earthen storehouses often survived
    const hh = isNear ? 0.9 + r() * 1.5 : 0.7 + r() * 1.0; (isNear ? near : far).push({ x: L.x + (r() - 0.5) * 0.8, z: L.z, sx: L.d * 1.05, sy: hh, sz: L.w * 1.05, ry: r() * 0.4, c: ash });
    if (!isNear) continue;
    const k = r();
    if (k < 0.6) (roofs[L.v] ||= []).push({ L, y: hh * 0.55 + r() * 0.5, tx: (r() - 0.5) * 0.5, tz: (r() - 0.5) * 0.5, ry: (r() - 0.5) * 0.3, c: L.roof.clone().multiplyScalar(0.35 + r() * 0.2) });
    else if (k < 0.82) { (walls[L.v] ||= []).push({ L, hs: 0.3 + r() * 0.25, c: [0.32, 0.27, 0.23] }); (roofs[L.v] ||= []).push({ L, y: 1.2 + r() * 0.8, tx: (r() - 0.5) * 0.7, tz: (r() - 0.5) * 0.6, ry: (r() - 0.5) * 0.4, c: L.roof.clone().multiplyScalar(0.3) }); }
    for (let i = 0; i < 9; i++) { const len = 1.5 + r() * 4, up = r() < 0.35; beams.push({ x: L.x + (r() - 0.5) * L.d, y: up ? len * 0.4 : hh * 0.6 + r() * 0.5, z: L.z + (r() - 0.5) * L.w, sx: 0.16, sy: up ? len : 0.16, sz: up ? 0.16 : len, rx: up ? (r() - 0.5) * 0.6 : (r() - 0.5) * 0.5, ry: r() * 3, rz: up ? (r() - 0.5) * 0.6 : 0, c: r() < 0.7 ? 0.08 + r() * 0.08 : 0.25 + r() * 0.1 }); }
    if (r() < 0.42) FIRES.push({ x: L.x + (r() - 0.5) * L.d * 0.5, y: hh * 0.75, z: L.z + (r() - 0.5) * L.w * 0.5, s: 1.4 + r() * 2.2, ph: r() * 10 });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const inst = (geo, mat, list, f) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((o, i) => { f(o, m4); im.setMatrixAt(i, m4); im.setColorAt(i, o.c.isColor ? o.c : C('#000').setRGB(...(Array.isArray(o.c) ? o.c : [o.c, o.c * 0.9, o.c * 0.8]))); }); im.castShadow = im.receiveShadow = true; ASTAT.add(im); return im; };
  inst(MOUND(2), CHAR, near, (o, m) => { e.set(0, o.ry, 0); q.setFromEuler(e); m.compose(new V3(o.x, 0, o.z), q, new V3(o.sx, o.sy, o.sz)); });
  inst(MOUND(1), CHAR, far, (o, m) => { e.set(0, o.ry, 0); q.setFromEuler(e); m.compose(new V3(o.x, 0, o.z), q, new V3(o.sx, o.sy, o.sz)); });
  inst(new THREE.BoxGeometry(1, 1, 1), CHAR, beams, (o, m) => { e.set(o.rx, o.ry, o.rz); q.setFromEuler(e); m.compose(new V3(o.x, o.y, o.z), q, new V3(o.sx, o.sy, o.sz)); });
  const WH = { A: 3.3, B: 6.1, C: 5.8, D: 6.4, F: 4.2 };
  for (const [v, list] of Object.entries(roofs)) inst(VARS[v].roof, ROOFMAT, list, (o, m) => { const sy = o.L.hs * 0.75; e.set(o.tx, o.ry, o.tz); q.setFromEuler(e); m.compose(new V3(o.L.x, o.y - WH[v] * sy, o.L.z), q, new V3(o.L.d * 0.96, sy, o.L.w * 0.96)); });
  for (const [v, list] of Object.entries(walls)) inst(VARS[v].walls, CHAR, list, (o, m) => { m.compose(new V3(o.L.x, 0, o.L.z), new THREE.Quaternion(), new V3(o.L.d, o.hs, o.L.w)); });
  if (kept.length) { const k2 = kept.map(L => ({ ...L, wt: [0.55, 0.52, 0.5], roof: L.roof.clone().multiplyScalar(0.55) })); buildHouses(ASTAT, k2, true); }
  // debris across the street
  const deb = []; for (let i = 0; i < 650; i++) { const t = r(); deb.push({ x: (r() - 0.5) * 17, y: 0.05, z: 25 - r() * 230, s: [0.15 + r() * 0.7, 0.04 + r() * 0.12, 0.1 + r() * 0.5], ry: r() * 6, c: t < 0.5 ? 0.1 + r() * 0.1 : t < 0.8 ? 0.35 + r() * 0.15 : 0.22 }); }
  inst(new THREE.BoxGeometry(1, 1, 1), CHAR, deb, (o, m) => { e.set((r() - 0.5) * 0.3, o.ry, (r() - 0.5) * 0.3); q.setFromEuler(e); m.compose(new V3(o.x, o.y, o.z), q, new V3(...o.s)); });
  // fallen and leaning poles, burnt trees
  const poles = POLES.filter(p => p.z > -300).map(p => ({ x: p.x, z: p.z, rx: (r() - 0.5) * 0.5, rz: (r() - 0.5) * 0.6 + (r() < 0.2 ? Math.sign(p.x) * 1.2 : 0), c: 0.12 }));
  inst(new THREE.CylinderGeometry(0.11, 0.14, 9.2, 6).translate(0, 4.6, 0), CHAR, poles, (o, m) => { e.set(o.rx, 0, o.rz); q.setFromEuler(e); m.compose(new V3(o.x, 0, o.z), q, new V3(1, 1, 1)); });
  const trunk = mergeGeometries([new THREE.CylinderGeometry(0.16, 0.24, 3.6, 6).translate(0, 1.8, 0), new THREE.CylinderGeometry(0.05, 0.09, 1.8, 5).rotateZ(0.7).translate(0.55, 3.6, 0), new THREE.CylinderGeometry(0.05, 0.09, 1.6, 5).rotateZ(-0.8).rotateY(2).translate(-0.4, 3.4, 0.3)]);
  inst(trunk, CHAR, TREES.filter(t => t.z > -300).map(t => ({ ...t, c: 0.07 })), (o, m) => { e.set(0, o.ry, 0); q.setFromEuler(e); m.compose(new V3(o.x, 0.15, o.z), q, new V3(o.s, o.s, o.s)); });
  // burnt tram where tram A stopped
  const bt = new THREE.Group(), tb = STD(0x45403a, { map: TRAMTEX, roughness: 0.9 }); bt.add(box(11.5, 2.5, 2.3, tb, 0, 1.85, 0), box(11.8, 0.25, 2.45, CHAR, 0, 3.2, 0), box(11, 0.5, 2.0, STD(0x1a1816), 0, 0.45, 0));
  bt.position.set(-0.4, 0.05, tramAz(TB + 5)); bt.rotation.set(0, Math.PI / 2, 0.03); ASTAT.add(bt);
  // ash over the ground
  const ashP = new THREE.Mesh(planeUV(60, 320, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6a645e, map: DIRT, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false })); ashP.position.set(0, 0.17, -90); ashP.receiveShadow = true; ASTAT.add(ashP);
}
// flames: additive sprites per fire, a few flickering lights following the nearest fires
const FLAMEMAT = [0xffd28a, 0xffa860, 0xff8a40].map(c => new THREE.SpriteMaterial({ map: FLAME, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
const FLAMES = [];
for (const f of FIRES) for (let k = 0; k < 4; k++) { const s = new THREE.Sprite(FLAMEMAT[k % 3]); s.center.set(0.5, 0.04); AFTER.add(s); FLAMES.push({ s, f, k }); }
const FIREL = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xff8a3a, 0, 26, 2); AFTER.add(l); return l; });
// embers + floating ash
const EMB = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(FIRES.length * 8 * 3), 3)), new THREE.PointsMaterial({ color: 0xffa040, size: 0.07, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); EMB.frustumCulled = false; AFTER.add(EMB);
const ASHN = 900, ASHPTS = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(ASHN * 3), 3)), new THREE.PointsMaterial({ color: 0x8a8580, size: 0.045, transparent: true, opacity: 0.8, depthWrite: false })); ASHPTS.frustumCulled = false; scene.add(ASHPTS);
const RAINN = 1600, RAIN = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAINN * 6), 3)), new THREE.LineBasicMaterial({ color: 0x1c1c1c, transparent: true, opacity: 0.5 })); RAIN.frustumCulled = false; AFTER.add(RAIN);
const RS = (() => { const r = RNG(505); return Array.from({ length: Math.max(RAINN, ASHN) }, () => [r(), r(), r(), r()]); })();
// glass shards and falling plaster in the bank
const SHARDS = (() => { const r = RNG(606), list = [];
  for (const w of SIDEWIN) for (let i = 0; i < 130; i++) list.push({ p: new V3(lerp(w.p0, w.p1, r()), lerp(w.y0, w.y1, r()), -49.75), v: new V3((r() - 0.5) * 5, (r() - 0.2) * 4, 9 + r() * 20), s: 0.025 + r() * 0.07, rv: new V3(r() * 20, r() * 20, r() * 20), dl: r() * 0.08 });
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.4, 0, 0.55, -0.3, 0, -0.05, 0.6, 0], 3)); g.computeVertexNormals();
  const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xeaf6f6, emissive: 0x8a9a9a, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), list.length); im.frustumCulled = false; COMMON.add(im);
  return { list, im }; })();
const PLASTER = (() => { const r = RNG(607), list = Array.from({ length: 36 }, () => ({ x: 14 + r() * 14, z: -47 + r() * 22, d: r() * 1.6, s: [0.2 + r() * 0.5, 0.05 + r() * 0.08, 0.2 + r() * 0.5], ry: r() * 6 }));
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), STD(0xe0d8c8, { map: DETAIL }), list.length); im.castShadow = true; im.frustumCulled = false; COMMON.add(im); return { list, im }; })();
const SHAFT = SIDEWIN.map(w => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd8a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set((w.p0 + w.p1) / 2, 2.4, -45.5); m.rotation.set(-1.1, 0, 0); COMMON.add(m); return m; });

// =====================================================================================
// first-person arms
// =====================================================================================
const ARMS = [-1, 1].map(s => { const g = new THREE.Group(), sl = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.32, 4, 10), STD(0xeeeae0, { roughness: 0.9 })), hd = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), STD(0xc99a76, { roughness: 0.7 }));
  hd.scale.set(0.9, 1.3, 0.65); g.add(sl, hd); camera.add(g); g.userData = { s, sl, hd }; return g; });
const _a = new V3(), _b = new V3();
function placeArm(A, elbow, hand) { const { sl, hd } = A.userData; _a.copy(elbow); _b.copy(hand); sl.position.copy(_a).add(_b).multiplyScalar(0.5); sl.quaternion.setFromUnitVectors(new V3(0, 1, 0), _b.clone().sub(_a).normalize()); sl.scale.set(1, _a.distanceTo(_b) / 0.41, 1); hd.position.copy(_b); hd.quaternion.copy(sl.quaternion); }

// =====================================================================================
// overlay
// =====================================================================================
const capEls = TL.captions.map(c => { const d = document.createElement('div'); d.className = 'cap' + (c.mid ? ' mid' : ''); d.innerHTML = c.text; (c.mid ? $('capsM') : $('caps')).appendChild(d); return d; });
const titleEls = TL.titles.map(c => { const d = document.createElement('div'); d.className = 'title'; d.innerHTML = `<b>${c.big}</b><small>${c.small}</small>`; $('titles').appendChild(d); return d; });
const fadeIO = (t, t0, t1, a = 0.6) => smooth((t - t0) / a) * smooth((t1 - t) / a);
function overlay(t) {
  TL.captions.forEach((c, i) => { const o = fadeIO(t, c.t0, c.t1, 0.55), el = capEls[i]; el.style.opacity = o; el.style.transform = `translateY(${(1 - o) * 14}px)`; el.style.filter = `blur(${(1 - o) * 5}px)`; });
  TL.titles.forEach((c, i) => { const o = fadeIO(t, c.t0, c.t1, 0.9), el = titleEls[i]; el.style.opacity = o; el.style.transform = `scale(${1 + (t - c.t0) * 0.008})`; el.style.filter = `blur(${(1 - o) * 6}px)`; });
  const ck = TL.clock[0];
  if (t >= ck.t0 - 1 && t < TB) { $('clock').style.opacity = fadeIO(t, ck.t0, ck.t1 + 5, 0.7); $('clock').querySelector('.place').textContent = ck.place;
    let i = 0; while (i < ck.keys.length - 1 && t >= ck.keys[i + 1][0]) i++; const k = smooth((t - ck.keys[i][0]) / 0.45);
    $('ckA').textContent = ck.keys[i][1]; $('ckA').style.opacity = i === 0 ? 1 : k; $('ckB').textContent = i > 0 ? ck.keys[i - 1][1] : ''; $('ckB').style.opacity = i > 0 ? 1 - k : 0;
  } else $('clock').style.opacity = 0;
  const tau = t - TB; let fl = 0;
  if (tau >= 0 && tau < 5) fl = tau < 0.05 ? tau / 0.05 : tau < 0.8 ? 1 : Math.exp(-(tau - 0.8) * 2.4);
  $('flash').style.opacity = fl;
  let tint = 'rgba(0,0,0,0)', to = 0;
  if (tau > 0.8 && tau < 9) { tint = 'rgb(255,150,70)'; to = 0.22 * Math.exp(-(tau - 0.8) / 2.5); }
  if (t >= TBL && t < TBL + 4) { tint = 'rgb(205,175,135)'; to = 0.85 * Math.exp(-(t - TBL) * 1.6); }
  $('tint').style.background = tint; $('tint').style.opacity = to;
  let r0 = 100, op = 0;
  if (t >= TBL && t < 48.6) { op = 0.8 * (1 - smooth((t - 46) / 2.6)); r0 = 32; }
  if (t >= 53.6 && t < TOUT) { const k = smooth((t - 53.6) / 3.0); op = Math.max(op, k); r0 = lerp(45, 0, k); }
  $('tunnel').style.background = `radial-gradient(ellipse 70% 58% at 50% 48%, rgba(0,0,0,0) ${r0}%, rgba(0,0,0,1) ${Math.min(100, r0 + 50)}%)`; $('tunnel').style.opacity = op;
  $('fade').style.opacity = Math.max(1 - smooth(t / 1.4), t > 56.2 && t < TOUT + 1.6 ? Math.min(smooth((t - 56.2) / 0.6), 1 - smooth((t - TOUT) / 1.5)) : 0, smooth((t - 78.6) / 1.6));
  let bl = 0; if (t >= TBL && t < 50) bl = 7 * Math.exp(-(t - TBL) * 0.45) + 0.6; if (t >= 53.6 && t < TOUT) bl = Math.max(bl, 6 * smooth((t - 53.6) / 3));
  $('c').style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : 'none';
}

// =====================================================================================
// camera state
// =====================================================================================
function gaze(t) {
  if (t < 18.2 || t > 31.4) return null;
  const w = smooth((t - 18.2) / 1.7) * (1 - smooth((t - 30.2) / 1.1)); let p;
  if (t < 23.4) p = planePos(t); else if (t < TB) p = bombPos(t);
  else { const tau = t - TB; p = new V3(HYPO.x, lerp(600 + 45 * tau, capH(tau) * 0.62, smooth((tau - 1) / 3)), HYPO.z); }
  return { p, w };
}
function camState(t) {
  const aft = t >= TOUT - 0.5, [px, py, pz] = camPosRaw(t); let [yaw, pitch] = (aft ? LOOK2 : LOOK1)(t), [roll] = aft ? [0] : ROLL1(t), [fov] = FOVT(t);
  const g = gaze(t);
  if (g) { const d = g.p.clone().sub(new V3(px, py, pz)), ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z)); let dy = ty - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * g.w; pitch += (tp - pitch) * g.w; }
  const fl = smooth((t - TB) / 0.12) * (1 - smooth((t - TB - 0.8) / 1.0)); pitch -= 0.45 * fl; yaw -= 0.3 * fl;
  const i = clamp(Math.round(t / PH.dt), 0, PH.a.length - 1);
  return { p: new V3(px, py, pz), yaw, pitch, roll, fov, ph: PH.a[i], sp: PH.s[i] };
}

// =====================================================================================
// frame
// =====================================================================================
const fwd = new V3(), tmp = new V3(), SDIR = new V3(), FBDIR = HYPO.clone().sub(new V3(0, 1.6, -6)).normalize();
const cDust = new THREE.Color(0.55, 0.47, 0.38), cAft = new THREE.Color(0.42, 0.34, 0.27);
window.DURATION = TL.duration;
window.renderFrame = (t) => {
  const S = t < TBL ? 0 : t < TOUT ? 1 : 2, tau = t < TOUT ? t - TB : (TBL - TB) + 45 + (t - TOUT);
  BEFORE.visible = S === 0; AFTER.visible = S >= 1; RAIN.visible = S === 2;
  GLASS.forEach(g => g.visible = S === 0); SHARDS.im.visible = S === 1; PLASTER.im.visible = S === 1;
  // ---------- camera ----------
  const cs = camState(t), a = clamp((cs.sp - 1.9) / 2.5), m = walkMask(t) * clamp(cs.sp / 0.7);
  const bobY = (-Math.abs(Math.sin(cs.ph)) * lerp(0.035, 0.08, a) + 0.02) * m - (S === 2 ? 0.03 * Math.max(0, Math.sin(cs.ph)) * m : 0), sway = Math.sin(cs.ph) * lerp(0.02, 0.045, a) * m;
  let A = 0.002 + 0.006 * a * m; if (t > TB && t < TB + 4) A += 0.012 * (1 - (t - TB) / 4); if (t >= TBL && t < TOUT) A += 0.2 * Math.exp(-(t - TBL) * 3) + 0.015 * Math.exp(-(t - TBL) * 0.3);
  camera.position.copy(cs.p).add(new V3(Math.cos(cs.yaw) * sway, bobY, -Math.sin(cs.yaw) * sway));
  if (t >= TBL && t < TBL + 1.2) camera.position.add(new V3(noise.noise(t * 31, 7), noise.noise(t * 29, 8), noise.noise(t * 27, 9)).multiplyScalar(0.08 * Math.exp(-(t - TBL) * 3)));
  camera.rotation.set(cs.pitch + Math.cos(2 * cs.ph) * lerp(0.008, 0.025, a) * m + noise.noise(t * 13, 1) * A + 0.003 * Math.sin(t * 1.5), cs.yaw + noise.noise(t * 11, 2) * A, cs.roll + Math.sin(cs.ph) * lerp(0.006, 0.018, a) * m + noise.noise(t * 9, 3) * A * 0.7);
  camera.fov = cs.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const kIn = S === 0 ? smooth((cs.p.x - 10.8) / 1.6) : S === 1 ? 1 : 0;
  // ---------- light, sky, fog ----------
  if (S === 0) {
    sky.visible = true; ASH.visible = false; scene.background = null; scene.environment = ENV_DAY;
    const fb = tau > 0 ? Math.exp(-tau / 0.5) : 0, w = tau > 0 ? 1 - smooth((tau - 1) / 4) : 0;
    SDIR.copy(SUNV).lerp(FBDIR, w).normalize();
    setSky(lerp(1.8, 4, w), lerp(0.7, 1.2, w), lerp(0.003, 0.008, w), lerp(0.8, 0.95, w), SDIR);
    sun.color.setRGB(1, lerp(0.95, 0.85, w), lerp(0.88, 0.65, w)); sun.intensity = 3.4 + 40 * fb;
    hemi.color.set(0xd4e2ff); hemi.groundColor.set(0x7a6a4a); hemi.intensity = lerp(0.75, 0.1, kIn);
    scene.environmentIntensity = lerp(1, 0.15, kIn); scene.fog.color.set(0xbcd3ec); scene.fog.density = 0.00011;
    renderer.toneMappingExposure = lerp(0.66, 0.85, kIn) * (1 + 7 * fb);
    WINL.forEach(l => l.intensity = 22 * kIn);
    PU.amb.value.setRGB(0.42, 0.48, 0.6); PU.sunCol.value.setRGB(1.6, 1.5, 1.35); PU.hazeCol.value.setRGB(0.8, 0.9, 1.05); PU.hazeK.value = 0.00009;
  } else if (S === 1) {
    sky.visible = false; ASH.visible = false; const k = smooth((t - TBL) / 10); scene.background = cDust; scene.environment = ENV_ASH; scene.environmentIntensity = 0.35;
    SDIR.copy(SUNV); sun.color.setRGB(1, 0.72, 0.5); sun.intensity = 0.6; hemi.color.setRGB(0.95, 0.8, 0.62); hemi.groundColor.setRGB(0.3, 0.25, 0.2); hemi.intensity = 0.32;
    scene.fog.color.copy(cDust); scene.fog.density = lerp(0.07, 0.022, k); renderer.toneMappingExposure = 0.95;
    WINL.forEach(l => l.intensity = 30);
    PU.amb.value.setRGB(0.5, 0.42, 0.34); PU.sunCol.value.setRGB(0.4, 0.3, 0.2); PU.hazeCol.value.copy(cDust); PU.hazeK.value = 0.03;
  } else {
    sky.visible = false; ASH.visible = true; scene.background = null; scene.environment = ENV_ASH; scene.environmentIntensity = 0.6;
    SDIR.copy(SUNV); sun.color.setRGB(1, 0.6, 0.4); sun.intensity = 1.5; hemi.color.setRGB(0.82, 0.62, 0.5); hemi.groundColor.setRGB(0.28, 0.22, 0.17); hemi.intensity = 0.8;
    scene.fog.color.copy(cAft); scene.fog.density = 0.0095; renderer.toneMappingExposure = 0.95; WINL.forEach(l => l.intensity = 0);
    PU.amb.value.setRGB(0.3, 0.24, 0.2); PU.sunCol.value.setRGB(1.1, 0.75, 0.5); PU.hazeCol.value.setRGB(0.48, 0.36, 0.27); PU.hazeK.value = 0.00008;
  }
  LAMPS.forEach((L, i) => { const dt = t - TBL; L.rotation.set(dt > 0 ? 0.45 * Math.exp(-dt * 0.22) * Math.sin(dt * 2.1 + i) : 0, 0, dt > 0 ? 0.3 * Math.exp(-dt * 0.25) * Math.sin(dt * 1.7 + i * 2) : 0); L.userData.gl.material.emissiveIntensity = S === 0 ? 0.8 : 0; });
  // ---------- street life ----------
  if (S === 0) {
    TRAMA.position.set(-0.4, 0.05, tramAz(t)); TRAMA.rotation.y = -Math.PI / 2; TRAMB.position.set(-3.6, 0.05, tramBz(t)); TRAMB.rotation.y = Math.PI / 2;
    CROWD_ST.update(t);
    for (const V of VEH) { const q = V.q, tt = Math.min(t, q.runT), s = sampleSim(q.sim, tt); V.g.position.set(s.x, 0, s.z); V.g.rotation.set(0, s.yaw, 0);
      if (V.kind === 'bike') { V.g.rotation.z = V.tip * 1.35 * smooth((t - q.runT + 0.2) / 0.6); V.g.position.y = 0.33 * Math.sin(Math.abs(V.g.rotation.z)) * 0; } else { V.g.position.x += Math.sin(s.yaw) * -1.3; V.g.position.z += Math.cos(s.yaw) * -1.3; }
      V.g.userData.wheels.forEach(w => w.rotation.z = -s.ph * (V.kind === 'bike' ? 3.6 : 2)); }
    const pp = planePos(t); PLANE.position.copy(pp); const vv = planePos(t + 0.1).sub(pp); PLANE.rotation.set(0.5 * smooth((t - 23.6) / 1.5), Math.atan2(-vv.z, vv.x), 0);
    PLANE.userData.glint.material.opacity = 0.35 + 0.3 * Math.sin(t * 2.3); PLANE.visible = t < 29;
    PLANE2GL.position.set(-420, 2750, -2300 - 75 * (t - 16)); PLANE2GL.material.opacity = t < TB ? 0.3 : 0;
    BOMB.visible = BOMBGL.visible = t > 23.4 && t < TB; if (BOMB.visible) { const bp = bombPos(t), bv = bombPos(t + 0.05).sub(bp); BOMB.position.copy(bp); BOMB.lookAt(bp.clone().add(bv)); BOMBGL.position.copy(bp); BOMBGL.material.opacity = 0.25 + 0.2 * Math.sin(t * 9); }
  }
  CROWD_IN.update(t);
  if (S === 2) CROWD_AF.update(t);
  BURSTGL.visible = S === 0 && tau > 0 && tau < 8; if (BURSTGL.visible) { BURSTGL.position.set(HYPO.x, 600 + 45 * tau, HYPO.z); BURSTGL.scale.setScalar(4200 * Math.exp(-tau / 1.5) + 900); BURSTGL.material.opacity = Math.exp(-tau / 0.7) + 0.12 * Math.exp(-tau / 3); }
  // ---------- bank interior after the blast ----------
  if (S === 1) { const dt = t - TBL, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    SHARDS.list.forEach((s, i) => { const u = Math.max(0, dt - s.dl), ty = (s.v.y + Math.sqrt(s.v.y ** 2 + 2 * 9.8 * (s.p.y - 0.42))) / 9.8, uu = Math.min(u, ty), drag = 1 - Math.exp(-uu * 1.2);
      const p = new V3(s.p.x + s.v.x * drag / 1.2, s.p.y + s.v.y * uu - 4.9 * uu * uu, s.p.z + s.v.z * drag / 1.2); if (u >= ty) p.y = 0.42;
      e.set(s.rv.x * uu, s.rv.y * uu, s.rv.z * uu); if (u >= ty) e.set(Math.PI / 2, s.rv.y, 0); q.setFromEuler(e); m4.compose(p, q, new V3(s.s, s.s, s.s)); SHARDS.im.setMatrixAt(i, m4); });
    SHARDS.im.instanceMatrix.needsUpdate = true;
    PLASTER.list.forEach((p, i) => { const u = Math.max(0, dt - p.d), y = Math.max(0.42 + p.s[1] / 2, 6.0 - 4.9 * u * u); e.set(u * 2 * (y > 0.5 ? 1 : 0), p.ry, 0); q.setFromEuler(e); m4.compose(new V3(p.x, u > 0 ? y : 6.0, p.z), q, new V3(...p.s)); PLASTER.im.setMatrixAt(i, m4); });
    PLASTER.im.instanceMatrix.needsUpdate = true;
    SHAFT.forEach((m, i) => m.material.opacity = 0.16 * smooth((dt - 1.5) / 3) * (0.8 + 0.2 * Math.sin(t * 0.7 + i)));
    const r = RNG(808); for (let i = 0; i < 240; i++) { const w = SIDEWIN[i % 3], age = Math.max(0, dt - r() * 0.3), x0 = lerp(w.p0, w.p1, r()), y0 = lerp(w.y0, w.y1, r()), d = 10 * (1 - Math.exp(-age * 1.4)) * (0.4 + r());
      const s = 0.8 + Math.min(age, 8) * 0.9 * (0.5 + r()), al = (0.6 * Math.exp(-age / 1.8) + 0.06) * smooth(age / 0.15) * (0.6 + 0.4 * r());
      puff(x0 + (r() - 0.5) * d * 0.9 + noise.noise(i, t * 0.1) * 1.5, Math.max(0.6, y0 + (r() - 0.5) * d * 0.4 - age * 0.05), -49.3 + d, s, r() * 6, al, 0.66, 0.58, 0.5, 0.25, 1, 0.75, 0.5, 0.06); }
  } else SHAFT.forEach(m => m.material.opacity = 0);
  // ---------- mushroom ----------
  if (tau > 0 && S !== 1) mushroom(tau);
  // ---------- fires, smoke, embers, ash, rain ----------
  if (S >= 1) {
    for (const F of FLAMES) { const f = F.f, n1 = noise.noise(t * 3 + f.ph, F.k * 3), n2 = noise.noise(t * 4.1 + f.ph, F.k * 5 + 1), s = f.s * (1 - F.k * 0.18);
      F.s.position.set(f.x + (F.k - 1.5) * f.s * 0.25 + n1 * 0.2, f.y, f.z + n2 * 0.25); F.s.scale.set(s * (0.75 + 0.25 * n1), s * 2.1 * (0.8 + 0.35 * n2), 1); F.s.material.opacity = 0.9; }
    const cp = camera.position, near = FIRES.map(f => ({ f, d: Math.hypot(f.x - cp.x, f.z - cp.z) })).sort((a, b) => a.d - b.d);
    FIREL.forEach((l, i) => { const f = near[i]?.f; if (!f) return; l.position.set(f.x, f.y + 1.5, f.z); l.intensity = (S === 2 ? 60 : 25) * f.s * (0.75 + 0.25 * noise.noise(t * 6 + i, 3)); });
    const ep = EMB.geometry.attributes.position; FIRES.forEach((f, j) => { for (let k = 0; k < 8; k++) { const r = RS[j * 8 + k], u = (r[0] + t * (0.25 + r[1] * 0.3)) % 1;
      ep.setXYZ(j * 8 + k, f.x + (r[2] - 0.5) * f.s + noise.noise(u * 3 + j, k) * 1.5 + u * 2, f.y + u * 9, f.z + (r[3] - 0.5) * f.s); } }); ep.needsUpdate = true;
    if (S === 2) for (const { f } of near.slice(0, 18)) for (let k = 0; k < 18; k++) { const u = ((k / 18) + t * 0.06 + f.ph) % 1, jx = noise.noise(f.ph * 3 + k, 1.7) , jz = noise.noise(k, f.ph * 3 + 4.1);
      puff(f.x + u * u * 16 + (jx * 1.5 + noise.noise(f.ph, u * 3)) * (1 + u * 5), f.y + 1 + u * 30, f.z + (jz * 1.5 + noise.noise(u * 3, f.ph)) * (1 + u * 4), 2.2 + u * 13 * (0.7 + 0.5 * Math.abs(jx)), f.ph + k, 0.42 * (1 - u) * smooth(u / 0.08), 0.15, 0.13, 0.12, 0.35, 1, 0.45, 0.15, 0.9 * (1 - smooth(u / 0.15))); }
    if (S === 2) { const r = RNG(909); for (let c = 0; c < 12; c++) { const ang = -1.2 + r() * 2.4, dist = 220 + r() * 700, x = Math.sin(ang) * dist, z = -45 - Math.cos(ang) * dist;
      for (let k = 0; k < 16; k++) { const u = ((k / 16) + t * 0.02) % 1, j = noise.noise(c * 7 + k, 0.3); puff(x + u * 90 + j * 25 * (1 + u * 2), u * 260, z + noise.noise(k, c * 5) * 25, (30 + u * 90) * (0.8 + 0.4 * Math.abs(j)), k, 0.5 * (1 - u) * smooth(u / 0.05), 0.12, 0.1, 0.1, 0.4, 1, 0.4, 0.12, 0.5 * (1 - smooth(u / 0.2))); } } }
  }
  { const ap = ASHPTS.geometry.attributes.position, cp = camera.position, on = S >= 1; ASHPTS.visible = on;
    if (on) for (let i = 0; i < ASHN; i++) { const r = RS[i], W = S === 1 ? 14 : 30, x = cp.x + ((r[0] * W - cp.x + noise.noise(i, t * 0.15) * 2 + t * 0.4) % W + W) % W - W / 2, z = cp.z + ((r[2] * W - cp.z + noise.noise(t * 0.15, i) * 2) % W + W) % W - W / 2;
      const y = (S === 1 ? 0.4 : 0) + (((r[1] * 6 - t * 0.12 * (0.5 + r[3])) % 6) + 6) % 6; ap.setXYZ(i, x, y, z); } ap.needsUpdate = true; }
  if (S === 2) { const rp2 = RAIN.geometry.attributes.position, cp = camera.position, k = smooth((t - 63) / 5), n = Math.floor(RAINN * k);
    for (let i = 0; i < RAINN; i++) { const r = RS[i]; if (i >= n) { rp2.setXYZ(i * 2, 0, -999, 0); rp2.setXYZ(i * 2 + 1, 0, -999, 0); continue; }
      const W = 28, x = cp.x + ((r[0] * W - cp.x) % W + W) % W - W / 2 + 0, z = cp.z + ((r[2] * W - cp.z) % W + W) % W - W / 2, y = (((r[1] * 14 - t * 9) % 14) + 14) % 14;
      rp2.setXYZ(i * 2, x, y, z); rp2.setXYZ(i * 2 + 1, x + 0.06, y + 0.55, z + 0.02); } rp2.needsUpdate = true; }
  // ---------- first-person arms ----------
  { const run = S === 0 && t > 30.4 && t < 40.4 ? smooth((t - 30.4) / 0.4) * (1 - smooth((t - 40) / 0.4)) : 0, getup = t > 46.2 && t < 48.6 ? bump(t, 46.4, 48.2, 0.3) : 0;
    ARMS.forEach(A => { const s = A.userData.s; A.visible = run > 0.01 || getup > 0.01; if (!A.visible) return;
      if (run > 0) { const p = cs.ph + (s > 0 ? 0 : Math.PI), up = Math.max(0, Math.sin(p)); placeArm(A, new V3(s * 0.26, -0.68, 0.02), new V3(s * lerp(0.2, 0.13, up), lerp(-0.62, -0.25 - 0.02 * Math.cos(p), run) + up * 0.06 * run, -0.44 - 0.12 * up)); }
      else { const hw = camera.position.clone().add(new V3(Math.sin(-cs.yaw) * 0 , 0, 0)), f2 = new V3(-Math.sin(cs.yaw), 0, -Math.cos(cs.yaw)), rt = new V3(Math.cos(cs.yaw), 0, -Math.sin(cs.yaw));
        const handW = new V3(cs.p.x, 0.43, cs.p.z).addScaledVector(f2, 0.42).addScaledVector(rt, s * 0.24), elW = handW.clone().add(new V3(0, 0.38, 0)).addScaledVector(f2, -0.12).addScaledVector(rt, s * 0.08);
        const yo = (1 - getup) * -0.6; handW.y += yo; elW.y += yo; placeArm(A, camera.worldToLocal(elW.clone()), camera.worldToLocal(handW.clone())); } }); }
  // ---------- shadows follow the walker ----------
  fwd.set(-Math.sin(cs.yaw), 0, -Math.cos(cs.yaw)); tmp.copy(cs.p).addScaledVector(fwd, 14); tmp.y = 0;
  sun.target.position.copy(tmp); sun.position.copy(tmp).addScaledVector(SDIR, 220); sun.target.updateMatrixWorld();
  sky.position.copy(camera.position); ASH.position.copy(camera.position);
  flushPuffs();
  overlay(t);
  renderer.render(scene, camera);
};
// data for the sound design: walker speed, indoors, footsteps, tram distances/pans
window.TRACK = (() => { const rows = [], steps = []; let lastK = 0;
  for (let i = 0; i < PH.a.length; i++) { const t = i * PH.dt; if (t > TL.duration) break; const k = Math.floor(PH.a[i] / Math.PI);
    if (k > lastK) { lastK = k; if (walkMask(t) > 0.5 || (t > 48 && t < 54 && i % 2 === 0 && false)) { const [x] = camPosRaw(t); steps.push([+t.toFixed(3), t >= TOUT ? 3 : x > 11.3 ? 2 : PH.s[i] > 2.6 ? 1 : 0]); } } }
  for (let t = 0; t < TL.duration; t += 0.05) { const cs = camState(t), f = new V3(-Math.sin(cs.yaw), 0, -Math.cos(cs.yaw)), r = new V3(Math.cos(cs.yaw), 0, -Math.sin(cs.yaw));
    const src = p => { const d = p.clone().sub(cs.p); d.y = 0; const L = d.length() || 1; return [+L.toFixed(1), +(0.5 + 0.5 * d.dot(r) / L).toFixed(2)]; };
    rows.push([+t.toFixed(2), +cs.sp.toFixed(2), cs.p.x > 11.3 && t < TOUT ? 1 : 0, ...src(new V3(-0.4, 0, tramAz(t))), ...src(new V3(-3.6, 0, tramBz(t)))]); }
  return { rows, steps }; })();
renderer.compile(scene, camera);
window.__dbg = { renderer, scene, sun, camera }; window.READY = true;
