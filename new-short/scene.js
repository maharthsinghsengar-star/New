// Major Somnath Sharma, Battle of Badgam 1947 — short round cartoon soldiers in a realistic 3D world
// (physical sky + image-based lighting, PBR materials, procedural terrain, 3D Lee-Enfield rifles, Bren gun, C-47 Dakota).
// Deterministic: window.renderFrame(t).
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { drawPerson, SPECS, defaultState, CW, CH } from './chibi.js';

const RW = 720, RH = 1280;
const TL = await (await fetch('build/timeline.json')).json();
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, RW / RH, 0.1, 3000);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6a5a3a, 0.5);
const sun = new THREE.DirectionalLight(0xffffff, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 200 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, typeof mat === 'number' ? STD(mat) : mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r1, r2, h, c, x, y, z, s = 20) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), c, x, y, z);
const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };
function canvasTex(w, h, draw, rep, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const tick = (g, f) => (g.userData.tick ||= []).push(f);
const noise = new SimplexNoise({ random: RNG(7) });
const fbm = (x, z, o = 5) => { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise.noise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
const ridge = (x, z, o = 5) => { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(noise.noise(x * f, z * f))); n += a; a *= 0.5; f *= 2.1; } return s / n; };
// textures
const grainTex = (base, spread, rep, seed = 1) => canvasTex(512, 512, (x, w, h) => { const r = RNG(seed), img = x.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = base + (r() - 0.5) * spread; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = clamp(v, 0, 255); img.data[i * 4 + 3] = 255; } x.putImageData(img, 0, 0); }, rep, false);
const DETAIL = grainTex(215, 70, [140, 140], 3);
const BRICK = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#b8a48c'; x.fillRect(0, 0, w, h); const r = RNG(5); for (let y = 0; y < h; y += 32) for (let i = -1; i < 9; i++) { const bx = i * 64 + ((y / 32) % 2) * 32; x.fillStyle = `rgb(${150 + r() * 40},${72 + r() * 25},${50 + r() * 20})`; x.fillRect(bx + 2, y + 2, 60, 28); } }, [2, 2]);
const TIN = (col) => canvasTex(256, 256, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { const g = x.createLinearGradient(i, 0, i + 16, 0); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.5, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(255,255,255,.18)'); x.fillStyle = g; x.fillRect(i, 0, 16, h); } const r = RNG(2); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(120,60,20,${r() * 0.25})`; x.fillRect(r() * w, r() * h, 4 + r() * 20, 2 + r() * 30); } }, [3, 2]);
const BURLAP = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#b59b6c'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(80,60,30,.35)'; x.lineWidth = 1; for (let i = 0; i < w; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }, [2, 1]);
const WOOD = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#6b3a1c'; x.fillRect(0, 0, w, h); const r = RNG(3); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${40 + r() * 40},${20 + r() * 15},10,.5)`; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(0, r() * h); x.bezierCurveTo(w * 0.3, r() * h, w * 0.6, r() * h, w, r() * h); x.stroke(); } });
const softTex = canvasTex(128, 128, (x) => { const r = RNG(4); for (let i = 0; i < 26; i++) { const cx = 64 + (r() - 0.5) * 50, cy = 64 + (r() - 0.5) * 50, rr = 18 + r() * 26, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
const glowTex = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
const glow = (c, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(s); return sp; };

// ---------- sky + image-based lighting presets ----------
const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const pmrem = new THREE.PMREMGenerator(renderer);
const PRESETS = {
  day: { elev: 38, azim: 160, turb: 2.5, ray: 1.5, mie: 0.004, exp: 0.85, sun: [0xfff4e2, 3.0], hemi: [0xdfe8ff, 0x6a5a3a, 0.55], fog: [0xbcd2ee, 0.0012] },
  battle: { elev: 30, azim: 150, turb: 5, ray: 1.3, mie: 0.006, exp: 0.82, sun: [0xffeccc, 2.8], hemi: [0xe8e0d0, 0x6a5a3a, 0.55], fog: [0xc8ccd0, 0.0022] },
  dusk: { elev: 2.5, azim: 200, turb: 8, ray: 3, mie: 0.006, exp: 0.64, sun: [0xffa060, 2.6], hemi: [0xffb8a0, 0x4a3a4a, 0.5], fog: [0xd89a7a, 0.0022] },
  sunrise: { elev: 7, azim: 120, turb: 5, ray: 2.2, mie: 0.005, exp: 0.76, sun: [0xffc890, 2.9], hemi: [0xffe0c8, 0x5a4a3a, 0.55], fog: [0xe8c4a8, 0.0015] },
  studio: { elev: 25, azim: 180, turb: 2, ray: 0.5, mie: 0.003, exp: 0.9, sun: [0xfff2e0, 2.2], hemi: [0xb8b0ff, 0x2a2240, 0.4], fog: [0x0c0a24, 0.0] },
};
const SUNDIR = {};
for (const [k, p] of Object.entries(PRESETS)) {
  const v = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - p.elev), THREE.MathUtils.degToRad(p.azim)); SUNDIR[k] = v;
  const u = sky.material.uniforms; u.turbidity.value = p.turb; u.rayleigh.value = p.ray; u.mieCoefficient.value = p.mie; u.mieDirectionalG.value = 0.8; u.sunPosition.value.copy(v);
  const s2 = new THREE.Scene(); const sk = new Sky(); sk.scale.setScalar(4000); Object.keys(u).forEach(n => { if (sk.material.uniforms[n]) sk.material.uniforms[n].value = u[n].value.clone ? u[n].value.clone() : u[n].value; }); s2.add(sk);
  p.env = pmrem.fromScene(s2, 0.02).texture;
}
let PRE = 'day';
function applyPreset(k, focus) {
  PRE = k; const p = PRESETS[k], u = sky.material.uniforms;
  u.turbidity.value = p.turb; u.rayleigh.value = p.ray; u.mieCoefficient.value = p.mie; u.sunPosition.value.copy(SUNDIR[k]);
  sky.visible = k !== 'studio'; scene.background = k === 'studio' ? new THREE.Color(0x0c0a24) : null; scene.environment = p.env;
  renderer.toneMappingExposure = p.exp; sun.color.set(p.sun[0]); sun.intensity = p.sun[1]; hemi.color.set(p.hemi[0]); hemi.groundColor.set(p.hemi[1]); hemi.intensity = p.hemi[2];
  scene.fog = p.fog[1] > 0 ? new THREE.FogExp2(p.fog[0], p.fog[1]) : null;
  sun.position.copy(focus).addScaledVector(SUNDIR[k], 80); sun.target.position.copy(focus);
}

// ---------- terrain ----------
function terrain(size, seg, hFn, cFn, rep = 140) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2), p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = hFn(x, z); p.setY(i, y); cFn(x, y, z, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  // slope darkening for rock faces
  const nrm = geo.attributes.normal; for (let i = 0; i < p.count; i++) { const sl = 1 - nrm.getY(i); if (sl > 0.25 && p.getY(i) < 85) { const k = clamp((sl - 0.25) * 2.2); col[i * 3] = lerp(col[i * 3], 0.32, k); col[i * 3 + 1] = lerp(col[i * 3 + 1], 0.3, k); col[i * 3 + 2] = lerp(col[i * 3 + 2], 0.28, k); } }
  const map = DETAIL.clone(); map.repeat.set(rep, rep); map.needsUpdate = true;
  const m = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness: 0.97 })); m.castShadow = false; return m;
}
const valleyH = (seed, flat = 34) => (x, z) => { const d = Math.hypot(x, z); const roll = fbm(x * 0.012 + seed, z * 0.012) * 3.5 * smooth((d - flat) / 40);
  const mz = -z; const mount = Math.pow(Math.max(0, ridge(x * 0.0045 + seed, z * 0.0045, 3) - 0.28), 1.35) * 520 * smooth((d - 220) / 240); return roll + mount; };
const C = (h) => new THREE.Color(h);
const FIELD = [C('#c8a24a'), C('#a77b3c'), C('#7d8f3a'), C('#d8b860'), C('#8a6a3a'), C('#9aa84a')];
const valleyCol = (seed) => (x, y, z, c) => {
  if (y > 80 + fbm(x * 0.02, z * 0.02) * 20) { c.setRGB(0.95, 0.96, 1.0); return; }
  if (y > 40) { c.setRGB(0.38, 0.4, 0.36).lerp(C('#2f4a2c'), clamp(1 - (y - 40) / 50) * 0.7); return; }
  const cell = Math.floor((x + 1000) / 14 + Math.floor(fbm(x * 0.03, z * 0.03) * 2)) * 7 + Math.floor((z + 1000) / 11), f = FIELD[Math.abs(cell) % FIELD.length];
  c.copy(f).lerp(C('#6f8a3a'), 0.25 + 0.2 * fbm(x * 0.1 + seed, z * 0.1));
};

// ---------- vegetation (merged meshes, shared between clones) ----------
const BARK = STD(0x4a3626, { roughness: 1 });
function foliageGeo(r, n, spread, h, seed, cols) {
  const rr = RNG(seed), parts = [], cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const g = mergeVertices(new THREE.IcosahedronGeometry(r * (0.55 + rr() * 0.5), 3).deleteAttribute('normal').deleteAttribute('uv')); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), s = 1 + 0.28 * noise.noise3d(x * 1.3 + i, y * 1.3, z * 1.3 + seed); p.setXYZ(k, x * s, y * s * 0.85, z * s); }
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * spread; g.translate(Math.cos(a) * d, h + rr() * r * 1.4 - r * 0.3, Math.sin(a) * d);
    const col = new Float32Array(p.count * 3); for (let k = 0; k < p.count; k++) { cc.set(cols[(rr() * cols.length) | 0]).multiplyScalar(0.8 + 0.4 * (p.getY(k) - h + r) / (r * 3)); col.set([cc.r, cc.g, cc.b], k * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); parts.push(g); }
  return mergeGeometries(parts);
}
const FOLM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const PROTOS = [];
for (let k = 0; k < 4; k++) {   // chinar (autumn plane trees)
  const g = new THREE.Group(); const tr = cyl(0.32, 0.55, 5, BARK, 0, 2.5, 0, 10); g.add(tr);
  for (let b = 0; b < 3; b++) { const br = cyl(0.12, 0.22, 3, BARK, 0, 0, 0, 8); br.position.set(Math.cos(b * 2.1) * 0.8, 4.6, Math.sin(b * 2.1) * 0.8); br.rotation.set(Math.sin(b * 2.1) * 0.6, 0, -Math.cos(b * 2.1) * 0.6); g.add(br); }
  const pal = [['#b5300f', '#d9480f', '#f08c00', '#c92a2a'], ['#e8590c', '#f59f00', '#d9480f', '#fab005'], ['#c2410c', '#ea580c', '#a61e4d', '#f76707'], ['#9a7a1a', '#c0a020', '#e8b830', '#8a9a2a']][k];
  g.add(mesh(foliageGeo(1.9, 14, 2.6, 6.2, 10 + k, pal), FOLM)); PROTOS.push(g);
}
const POPLAR = (() => { const g = new THREE.Group(); g.add(cyl(0.12, 0.2, 3, BARK, 0, 1.5, 0, 8)); const f = mesh(foliageGeo(0.9, 9, 0.4, 4.5, 33, ['#d4b020', '#b8a020', '#e0c040', '#8a9a30']), FOLM); f.scale.set(1, 1.8, 1); f.position.y = -3.4; g.add(f); return g; })();
function plant(g, proto, x, z, s, ry, H) { const t = proto.clone(); t.position.set(x, H(x, z) - 0.1, z); t.scale.setScalar(s); t.rotation.y = ry; g.add(t); return t; }

// ---------- buildings & props ----------
function kashmiriHouse(roof = '#3b6e4a') {
  const g = new THREE.Group(), wall = STD(0xffffff, { map: BRICK, roughness: 0.95 }), wood = STD(0xffffff, { map: WOOD, roughness: 0.7 });
  g.add(box(7, 5.4, 5.5, wall, 0, 2.7, 0), box(7.2, 0.3, 5.7, wood, 0, 2.75, 0), box(7.2, 0.3, 5.7, wood, 0, 5.45, 0));
  for (const s of [-1, 1]) for (const lv of [0, 1]) { g.add(box(1.0, 1.3, 0.08, 0x1a1a22, s * 2.2, 1.6 + lv * 2.7, 2.78), box(1.2, 0.12, 0.15, wood, s * 2.2, 0.9 + lv * 2.7, 2.8), box(1.2, 0.12, 0.15, wood, s * 2.2, 2.3 + lv * 2.7, 2.8)); }
  g.add(box(1.2, 2.0, 0.1, wood, 0, 1.0, 2.78), box(3.2, 0.12, 1.0, wood, 0, 4.1, 3.2));
  for (let i = 0; i < 9; i++) g.add(box(0.06, 0.8, 0.06, wood, -1.5 + i * 0.375, 4.55, 3.65));
  const tm = STD(0xffffff, { map: TIN(roof), roughness: 0.55, metalness: 0.45, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(7.8, 0.08, 3.75), tm, 0, 6.72, s * 1.48); p.rotation.x = s * 0.68; g.add(p); }
  const gable = new THREE.Shape([[-2.85, 0], [2.85, 0], [0, 2.2]].map(([a, b]) => new THREE.Vector2(a, b))); for (const s of [-1, 1]) { const gm = mesh(new THREE.ShapeGeometry(gable), wood, s * 3.45, 5.6, 0); gm.rotation.y = Math.PI / 2; gm.material = STD(0xffffff, { map: WOOD, side: THREE.DoubleSide }); g.add(gm); }
  g.add(box(0.5, 1.6, 0.5, wall, 2, 8, -1));
  return g;
}
const SANDBAG_GEO = (() => { const g = new THREE.SphereGeometry(0.5, 16, 10); g.scale(1.0, 0.42, 0.55); return g; })();
function sandbagRing(g, cx, cz, R, a0, a1, rows = 3) { const list = []; const r = RNG(9);
  for (let row = 0; row < rows; row++) for (let a = a0 + (row % 2) * 0.09; a <= a1; a += 0.95 / R) list.push([cx + Math.cos(a) * R, 0.2 + row * 0.36, cz + Math.sin(a) * R, -a + Math.PI / 2 + (r() - 0.5) * 0.12, r()]);
  const im = new THREE.InstancedMesh(SANDBAG_GEO, STD(0xffffff, { map: BURLAP, roughness: 1 }), list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  list.forEach(([x, y, z, ry, k], i) => { e.set((k - 0.5) * 0.1, ry, (k - 0.5) * 0.08); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setRGB(0.9 + k * 0.1, 0.85 + k * 0.1, 0.75 + k * 0.1)); });
  im.castShadow = im.receiveShadow = true; g.add(im);
}
// Lee-Enfield No.1 Mk III (scaled to the cartoon soldiers)
const STEEL = STD(0x3a3d42, { metalness: 0.85, roughness: 0.38 }), WALNUT = STD(0xffffff, { map: WOOD, roughness: 0.55 }), BRASS = STD(0xc9a227, { metalness: 0.9, roughness: 0.3 });
function leeEnfield() {
  const g = new THREE.Group();
  const stock = new THREE.Shape(); stock.moveTo(0, 0); stock.lineTo(0.22, -0.06); stock.lineTo(0.25, 0.06); stock.quadraticCurveTo(0.34, 0.07, 0.42, 0.03); stock.lineTo(0.42, 0.035); stock.lineTo(0.95, 0.03); stock.lineTo(0.95, 0.065); stock.lineTo(0.32, 0.075); stock.quadraticCurveTo(0.24, 0.1, 0.18, 0.09); stock.lineTo(0.0, 0.13); stock.closePath();
  const sg = new THREE.ExtrudeGeometry(stock, { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }); sg.translate(0, 0, -0.02); g.add(mesh(sg, WALNUT));
  g.add(rot(cyl(0.012, 0.012, 0.42, STEEL, 1.12, 0.06, 0, 10), 0, 0, Math.PI / 2), rot(cyl(0.02, 0.02, 0.06, STEEL, 0.96, 0.06, 0, 10), 0, 0, Math.PI / 2));
  g.add(box(0.2, 0.05, 0.035, STEEL, 0.38, 0.08, 0), box(0.07, 0.06, 0.03, STEEL, 0.36, 0.01, 0), mesh(new THREE.SphereGeometry(0.018, 10, 8), STEEL, 0.33, 0.06, 0.045), rot(cyl(0.006, 0.006, 0.05, STEEL, 0.34, 0.07, 0.03, 6), Math.PI / 2, 0, 0));
  g.add(box(0.02, 0.02, 0.025, STEEL, 0.92, 0.1, 0), mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12), STEEL, 0.26, 0.03, 0));
  g.add(rot(box(0.7, 0.01, 0.015, STD(0x5a5a2a, { roughness: 1 }), 0.45, -0.03, 0.03), 0, 0, 0.12));
  return g;
}
function brenGun() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.09, 0.07, STEEL, 0, 0.12, 0), rot(cyl(0.018, 0.02, 0.55, STEEL, 0.5, 0.13, 0, 10), 0, 0, Math.PI / 2), rot(cyl(0.03, 0.03, 0.06, STEEL, 0.78, 0.13, 0, 10), 0, 0, Math.PI / 2));
  const mag = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16, 1.1), STEEL); mag.rotation.z = 1.0; mag.position.set(0.02, 0.0, 0); g.add(mag);
  g.add(rot(box(0.28, 0.07, 0.045, WALNUT, -0.32, 0.09, 0), 0, 0, -0.08), box(0.06, 0.12, 0.04, WALNUT, -0.05, 0.03, 0));
  for (const s of [-1, 1]) g.add(rot(cyl(0.008, 0.008, 0.3, STEEL, 0.62, -0.02, s * 0.08, 6), s * 0.45, 0, 0.15));
  g.add(rot(cyl(0.008, 0.008, 0.12, STEEL, 0.25, 0.22, 0, 6), 0, 0, 0)); g.scale.setScalar(1.6); return g;
}
// Douglas C-47 Dakota (natural metal)
function dakota() {
  const g = new THREE.Group(), AL = STD(0xc9ccd1, { metalness: 0.85, roughness: 0.32 }), DARK = STD(0x15181c, { metalness: 0.2, roughness: 0.15 }), props = [];
  const prof = [[0.0, 0], [0.35, 0.12], [0.75, 0.5], [1.0, 1.1], [1.12, 2.0], [1.16, 3.2], [1.16, 9.5], [1.05, 11.6], [0.82, 13.4], [0.5, 15.0], [0.22, 16.2], [0.05, 16.8]].map(([r, y]) => new THREE.Vector2(r, y));
  const fg = new THREE.LatheGeometry(prof, 32); fg.rotateZ(Math.PI / 2); fg.translate(8.4, 0, 0);
  const fp = fg.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); if (x < -2) fp.setY(i, fp.getY(i) + (-2 - x) * 0.07); } fg.computeVertexNormals();
  const fus = mesh(fg, AL); fus.scale.set(1, 1, 0.97); g.add(fus);
  g.add(rot(box(0.9, 0.35, 1.3, DARK, 6.25, 0.82, 0), 0, 0, -0.55));
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.42, 0.34, 0.02), DARK, 3.6 - i * 1.25, 0.32, s * 1.155));
  g.add(box(1.0, 1.6, 0.03, STD(0xb8bcc2, { metalness: 0.8, roughness: 0.4 }), -3.4, -0.1, 1.15));
  const wingShape = new THREE.Shape([[0, 0], [3.3, 0], [2.4, 13.5], [1.3, 13.5]].map(([a, b]) => new THREE.Vector2(a, b)));
  for (const s of [-1, 1]) { const wgeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }); wgeo.rotateX(Math.PI / 2); const w = mesh(wgeo, AL, -1.0, -0.55, 0); w.scale.z = s; w.rotation.x = s * 0.08; g.add(w);
    const nac = new THREE.Group(); nac.position.set(2.2, -0.35, s * 3.6); g.add(nac);
    nac.add(rot(cyl(0.62, 0.55, 3.0, AL, 0, 0, 0, 24), 0, 0, Math.PI / 2), rot(mesh(new THREE.TorusGeometry(0.64, 0.1, 10, 28), AL), 0, Math.PI / 2, 0), rot(cyl(0.5, 0.5, 0.2, DARK, 1.58, 0, 0, 20), 0, 0, Math.PI / 2));
    const hub = new THREE.Group(); hub.position.set(1.85, 0, 0); nac.add(hub); hub.add(rot(mesh(new THREE.ConeGeometry(0.22, 0.5, 16), AL), 0, 0, -Math.PI / 2));
    const blades = new THREE.Group(); hub.add(blades); for (let b = 0; b < 3; b++) { const bl = box(0.04, 1.45, 0.18, STD(0x1a1a1a, { roughness: 0.5 }), 0, 0.75, 0); bl.rotation.y = 0.3; const p = new THREE.Group(); p.rotation.x = b * Math.PI * 2 / 3; p.add(bl); blades.add(p); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.y = Math.PI / 2; hub.add(disc); props.push({ blades, disc });
    const gear = new THREE.Group(); gear.position.set(1.0, -0.9, s * 3.6); g.add(gear); gear.add(cyl(0.08, 0.08, 1.1, STEEL, 0, -0.3, 0, 8)); const tire = mesh(new THREE.TorusGeometry(0.42, 0.17, 12, 24), STD(0x1a1a1a, { roughness: 0.9 }), 0, -0.85, 0); g.add(tire); tire.position.set(1.0, -1.75, s * 3.6);
    const st = new THREE.Shape([[0, 0], [2.0, 0], [1.6, 4.6], [0.9, 4.6]].map(([a, b]) => new THREE.Vector2(a, b))); const sgeo = new THREE.ExtrudeGeometry(st, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }); sgeo.rotateX(Math.PI / 2); const stab = mesh(sgeo, AL, -8.3, 0.75, 0); stab.scale.z = s; g.add(stab); }
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(3.2, 0); fin.quadraticCurveTo(2.6, 2.0, 1.4, 3.6); fin.quadraticCurveTo(0.5, 3.8, 0.2, 3.0); fin.closePath();
  const fgeo = new THREE.ExtrudeGeometry(fin, { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }); fgeo.translate(0, 0, -0.07); g.add(mesh(fgeo, AL, -8.6, 0.85, 0));
  g.add(mesh(new THREE.TorusGeometry(0.18, 0.08, 8, 16), STD(0x1a1a1a), -7.6, -0.4, 0));
  g.userData.spin = (t, rpm = 1) => props.forEach(({ blades, disc }) => { blades.rotation.x = t * 45 * rpm; disc.material.opacity = 0.18 * rpm; blades.visible = rpm < 0.6 || true; });
  return g;
}
function soldierCap() { const g = new THREE.Group(), K = STD(0x8a7d55, { roughness: 0.9 }); g.add(cyl(0.2, 0.17, 0.12, K, 0, 0.06, 0, 24)); const top = cyl(0.25, 0.22, 0.05, K, 0, 0.13, 0, 24); top.scale.z = 0.92; g.add(top); g.add(cyl(0.18, 0.18, 0.05, STD(0x4a3a26), 0, 0.03, 0, 24)); const visor = cyl(0.17, 0.17, 0.015, STD(0x1a1410, { roughness: 0.3, metalness: 0.2 }), 0.1, 0.0, 0, 20); visor.scale.set(1, 1, 0.75); visor.rotation.z = -0.25; g.add(visor); g.add(box(0.04, 0.05, 0.01, BRASS, 0.1, 0.07, 0.17)); return g; }
const FLAG_TEX = canvasTex(768, 512, (x, w, h) => { x.fillStyle = '#ff9933'; x.fillRect(0, 0, w, h / 3); x.fillStyle = '#ffffff'; x.fillRect(0, h / 3, w, h / 3); x.fillStyle = '#138808'; x.fillRect(0, 2 * h / 3, w, h / 3);
  x.strokeStyle = '#000080'; x.lineWidth = 7; x.beginPath(); x.arc(w / 2, h / 2, 70, 0, 7); x.stroke(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.cos(a) * 70, h / 2 + Math.sin(a) * 70); x.lineWidth = 3; x.stroke(); } x.fillStyle = '#000080'; x.beginPath(); x.arc(w / 2, h / 2, 12, 0, 7); x.fill(); });
function flag(g, x, y, z, w, h) {
  const geo = new THREE.PlaneGeometry(w, h, 30, 12), base = geo.attributes.position.array.slice();
  const f = mesh(geo, STD(0xffffff, { map: FLAG_TEX, side: THREE.DoubleSide, roughness: 0.8 }), x + w / 2 + 0.05, y, z); g.add(f, cyl(0.05, 0.06, y + h / 2 + 0.3, STD(0xd9d9d9, { metalness: 0.8, roughness: 0.3 }), x, (y + h / 2 + 0.3) / 2, z, 12), mesh(new THREE.SphereGeometry(0.1, 12, 8), BRASS, x, y + h / 2 + 0.35, z));
  tick(g, t => { const p = geo.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const u = (base[i] + w / 2) / w; p[i + 2] = Math.sin(base[i] * 2.4 - t * 6.5) * 0.18 * w / 3 * u + Math.sin(base[i + 1] * 3 - t * 4) * 0.04 * u; } geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); });
}
// smoke + blasts
const smokeMat = c => new THREE.SpriteMaterial({ map: softTex, color: c, transparent: true, depthWrite: false, opacity: 0 });
function smokeColumn(g, x, z, n = 12, col = 0x5a5650, sc = 1) {
  const sp = Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(smokeMat(col)); g.add(s); return s; });
  return (t, strength = 1) => sp.forEach((s, i) => { const a = ((t * 0.12 + i / n) % 1); s.position.set(x + Math.sin(i * 7.1) * 1.2 * a + a * 4, 0.6 + a * 16 * sc, z + Math.cos(i * 3.3) * a); s.scale.setScalar((2 + a * 9) * sc); s.material.opacity = (1 - a) * 0.55 * strength * smooth(a * 6); s.material.rotation = i + a; });
}
function blasts(g, list) {
  const L = new THREE.PointLight(0xffa040, 0, 40, 1.6); g.add(L);
  const items = list.map(([t0, x, z, s]) => { const fl = glow(0xffa040, 4 * s, 0); fl.position.set(x, 1.2, z); g.add(fl); const sp = Array.from({ length: 9 }, () => { const m = new THREE.Sprite(smokeMat(0x4a4540)); g.add(m); return m; });
    const dirt = Array.from({ length: 10 }, (_, i) => { const d = box(0.15, 0.1, 0.12, 0x5a4630, 0, 0, 0); d.castShadow = false; g.add(d); return d; }); return { t0, x, z, s, fl, sp, dirt }; });
  return t => { let li = 0;
    items.forEach(({ t0, x, z, s, fl, sp, dirt }) => { const k = t - t0, on = k > 0 && k < 3.5;
      fl.material.opacity = k > 0 && k < 0.35 ? 1 - k / 0.35 : 0; fl.scale.setScalar(4 * s * (0.6 + k * 2)); if (k > 0 && k < 0.3) li = Math.max(li, (1 - k / 0.3) * 60 * s), L.position.set(x, 2, z);
      sp.forEach((m, i) => { m.visible = on; if (!on) return; const a = clamp(k / 3.5); m.position.set(x + Math.sin(i * 2.3) * (0.6 + a * 2.5) * s, 0.5 + a * 5 * s + (i % 3) * 0.5, z + Math.cos(i * 1.7) * (0.6 + a * 2) * s); m.scale.setScalar((1.5 + a * 6) * s); m.material.opacity = (1 - a) * 0.75 * smooth(k * 5); m.material.color.setHex(k < 0.25 ? 0x8a5a30 : 0x4a4540); });
      dirt.forEach((d, i) => { d.visible = k > 0 && k < 1.6; if (!d.visible) return; const a = i / 10 * Math.PI * 2, v = 5 + (i % 3) * 2; d.position.set(x + Math.cos(a) * k * 2.2, Math.max(0.05, 0.3 + v * k - 9.8 * k * k / 2), z + Math.sin(a) * k * 2.2); d.rotation.set(k * 9 + i, k * 7, 0); }); });
    L.intensity = li; };
}

// ---------- short round cartoon soldiers (canvas billboards, lit, casting shadows, holding 3D rifles) ----------
const PX2M = 1.35 / 900;
const chars = [];
function makeChar(spec, opt = {}) {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const w = CW * PX2M, h = CH * PX2M, geo = new THREE.PlaneGeometry(w, h).translate(0, h / 2 - 26 * PX2M, 0);
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.38 });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.4 });
  const g = new THREE.Group(); g.add(m);
  const c = { spec: SPECS[spec], cv, ctx, tex, m, g, static: opt.static, drawn: -1 };
  if (SPECS[spec].rifle) { c.rifle = leeEnfield(); c.rifle.scale.setScalar(0.95); m.add(c.rifle); }
  chars.push(c); return c;
}
function placeC(c, x, z, st, t, y = 0) {
  c.g.visible = true; c.g.position.set(x, y, z);
  const key = c.static ? Math.floor(Math.max(0, st.walk) * 1.2) % 2 : t;
  const s2 = { ...st, rifleOn: false };
  if (c.drawn !== key) { c.ctx.clearRect(0, 0, CW, CH); drawPerson(c.ctx, c.spec, s2, t); c.tex.needsUpdate = true; c.drawn = key; c.hand = s2.armR.hand; }
  if (c.rifle) { const on = st.rifleOn !== false && c.hand; c.rifle.visible = !!on; if (on) { const [hx, hy] = c.hand; c.rifle.position.set(hx * PX2M - 0.1, -hy * PX2M + 0.03 - 26 * PX2M, 0.06); c.rifle.rotation.set(0, 0, st.rifleAim ? 0.05 : 1.15); if (st.rifleAim) c.rifle.position.x -= 0.35; } }
}
const S0 = (o = {}) => Object.assign(defaultState(), o);
const blink = (t, p) => (((t + p) % 3.4) < 0.12 ? 0 : 1);
const ARM = { relax: [0.12, 0.25, 'fist'], point: [0.55, 1.15, 'point'], up: [0.4, 2.7, 'point'], rifle: [0.2, 1.6, 'fist'], aim: [1.05, 0.15, 'fist'], chest: [0.25, 1.9, 'fist'], thumb: [0.3, 1.9, 'thumb'], binoc: [0.75, 2.4, 'fist'] };

// ---------- sets ----------
const SETS = {}; const makeSet = n => { const g = new THREE.Group(); g.visible = false; scene.add(g); SETS[n] = g; return g; };
// Badgam valley
const VAL = makeSet('val'), VH = valleyH(0.3);
{
  const g = VAL, r = RNG(11);
  g.add(terrain(1600, 260, VH, valleyCol(0.3)));
  const near = (x, z) => Math.hypot(x, z) < 9;
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 14 + r() * 110, x = Math.cos(a) * d, z = Math.sin(a) * d - 20; if (near(x, z) || (z > -6 && Math.abs(x) < 14)) continue; plant(g, PROTOS[(r() * 4) | 0], x, z, 0.8 + r() * 0.6, r() * 6, VH); }
  for (let i = 0; i < 26; i++) plant(g, POPLAR, -60 + i * 4.8 + r() * 1.5, -46 - r() * 4, 0.9 + r() * 0.3, 0, VH);
  for (const [x, z, roof, ry] of [[-22, -34, '#3b6e4a', 0.3], [-10, -40, '#8a2d22', -0.2], [12, -38, '#2d4e8a', 0.15], [24, -33, '#3b6e4a', -0.4], [36, -41, '#8a2d22', 0.25], [-34, -42, '#2d4e8a', 0.1]]) { const h = kashmiriHouse(roof); h.position.set(x, VH(x, z), z); h.rotation.y = ry; g.add(h); }
  sandbagRing(g, 0, 0.4, 3.0, Math.PI * 0.95, Math.PI * 2.05, 3);
  const bren = brenGun(); bren.position.set(0.0, 1.12, -2.55); bren.rotation.y = Math.PI / 2; g.add(bren);
  for (let i = 0; i < 6; i++) g.add(box(0.35, 0.22, 0.25, STD(0x4a5a2a), -2.4 + i * 0.3, 0.11, 1.8 + (i % 2) * 0.2));
}
const VAL_BLASTS = blasts(VAL, [[0.3, -7, -10, 1], [1.1, 6, -13, 1.2], [1.9, -2, -15, 0.9], [2.6, 8, -8, 1], [3.6, -9, -7, 1.1], [4.4, 3, -12, 1], [5.2, -4, -9, 1.2], [6.3, 7, -14, 0.9], [7.4, -8, -11, 1], [8.6, 2, -8, 1.1], [9.6, -5, -13, 1], [10.8, 5, -9, 1.2], [12, -3, -11, 1], [13.2, 6, -10, 1]]);
const vSmoke = smokeColumn(VAL, 18, -60, 14, 0x6a645a, 1.6), vSmoke2 = smokeColumn(VAL, -30, -70, 12, 0x5a5650, 1.3);

// Srinagar airfield
const AIR = makeSet('air'), AH = (x, z) => (Math.abs(z) < 40 ? 0 : valleyH(1.7, 0)(x, z) * smooth((Math.abs(z) - 40) / 30));
{
  const g = AIR, r = RNG(21);
  g.add(terrain(1600, 240, AH, (x, y, z, c) => { valleyCol(1.7)(x, y, z, c); if (Math.abs(z) < 40 && y < 1) c.set('#7a9a46').lerp(C('#a8a050'), 0.3 + 0.3 * fbm(x * 0.05, z * 0.05)); }));
  const rw = mesh(new THREE.PlaneGeometry(500, 16), STD(0xffffff, { map: canvasTex(1024, 64, (x, w, h) => { x.fillStyle = '#8a8478'; x.fillRect(0, 0, w, h); const rr = RNG(3); for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${60 + rr() * 80},${60 + rr() * 70},${50 + rr() * 60},.35)`; x.fillRect(rr() * w, rr() * h, 2 + rr() * 6, 1 + rr() * 3); } x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < w; i += 64) x.fillRect(i, h / 2 - 2, 30, 4); }, [6, 1]), roughness: 0.95 }), 0, 0.03, 0); rw.rotation.x = -Math.PI / 2; rw.castShadow = false; g.add(rw);
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 24, 32, 1, true, 0, Math.PI), STD(0xffffff, { map: TIN('#9aa0a6'), metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide })); hang.rotation.set(0, 0, Math.PI / 2); hang.rotation.order = 'ZYX'; hang.position.set(34, 0, -30); hang.rotation.set(Math.PI / 2, 0, Math.PI / 2); hang.castShadow = hang.receiveShadow = true; g.add(hang);
  for (let i = 0; i < 8; i++) g.add(cyl(0.3, 0.3, 0.9, STD([0x4a5a2a, 0x8a2d22][i % 2], { metalness: 0.5, roughness: 0.5 }), 18 + (i % 4) * 0.7, 0.45, -14 - (i >> 2) * 0.7, 16));
  const sock = new THREE.Group(); sock.position.set(-18, 0, -12); sock.add(cyl(0.06, 0.06, 6, 0xdddddd, 0, 3, 0, 8)); const sk = mesh(new THREE.ConeGeometry(0.45, 2.4, 14, 1, true), STD(0xff6d00, { side: THREE.DoubleSide }), 1.2, 5.8, 0); sk.rotation.z = Math.PI / 2; sock.add(sk); g.add(sock);
  for (let i = 0; i < 40; i++) plant(g, POPLAR, -120 + i * 6 + r() * 2, -44 - r() * 4, 0.9 + r() * 0.3, 0, AH);
  for (let i = 0; i < 20; i++) plant(g, PROTOS[(r() * 4) | 0], -90 + i * 9 + r() * 3, -60 - r() * 15, 0.8 + r() * 0.5, r() * 6, AH);
}
const plane1 = dakota(), plane2 = dakota(); AIR.add(plane1, plane2);
const dust = smokeColumn(AIR, 0, 0, 10, 0xc8b898, 0.5);

// memorial at sunset
const MEM = makeSet('mem'), MH = (x, z) => Math.max(0, 1.2 - Math.hypot(x, z) * 0.08) + valleyH(2.4, 20)(x, z);
{
  const g = MEM, r = RNG(31);
  g.add(terrain(1600, 240, MH, valleyCol(2.4)));
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 10 + r() * 70; plant(g, PROTOS[(r() * 3) | 0], Math.cos(a) * d, Math.sin(a) * d - 12, 0.8 + r() * 0.5, r() * 6, MH); }
  const base = MH(0, 0);
  const rifle = leeEnfield(); rifle.scale.setScalar(1.25); rifle.rotation.z = -Math.PI / 2; rifle.position.set(0, base + 1.25, 0); g.add(rifle);
  const bay = box(0.02, 0.4, 0.015, STEEL, 0, base + 0.05, 0); g.add(bay);
  const cap = soldierCap(); cap.scale.setScalar(1.5); cap.position.set(0, base + 1.3, 0); cap.rotation.y = -0.4; g.add(cap);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), STD(i % 2 ? 0xff8c00 : 0xffc300, { roughness: 1 }), Math.cos(a) * 0.12, base + 0.95 - Math.abs(Math.sin(a)) * 0.25, Math.sin(a) * 0.12 + 0.07)); }
  for (let i = 0; i < 60; i++) g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), STD([0xff8c00, 0xffc300, 0xfff3e0][i % 3], { roughness: 1 }), (r() - 0.5) * 2.2, base + 0.05, (r() - 0.5) * 1.4));
  flag(g, 0.75, base + 1.4, -0.4, 0.75, 0.5);
  for (let i = 0; i < 30; i++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.11), STD([0xd9480f, 0xf59f00, 0xb5300f][i % 3], { side: THREE.DoubleSide })); const ph = r() * 9, x0 = (r() - 0.5) * 8, z0 = -1 - r() * 5; g.add(lf); tick(g, t => { lf.position.set(x0 + Math.sin(t + ph) * 0.6, base + 5 - ((t * 0.55 + ph) % 5), z0); lf.rotation.set(t * 2 + ph, t + ph, 0); }); }
  g.userData.base = base;
}
// medal studio
const MED = makeSet('med'), medal = new THREE.Group();
{
  const g = MED; g.add(medal);
  const emb = canvasTex(512, 512, (x, w) => { const c = w / 2; x.fillStyle = '#808080'; x.fillRect(0, 0, w, w); x.fillStyle = '#c8c8c8';
    for (let i = 0; i < 4; i++) { x.save(); x.translate(c, c); x.rotate(i * Math.PI / 2); x.beginPath(); x.ellipse(0, -150, 22, 42, 0, 0, 7); x.fill(); x.fillRect(-8, -112, 16, 36); for (const s of [-1, 1]) { x.lineWidth = 10; x.strokeStyle = '#c8c8c8'; x.beginPath(); x.moveTo(0, -188); x.quadraticCurveTo(s * 42, -172, s * 26, -128); x.stroke(); } x.restore(); }
    x.beginPath(); x.arc(c, c, 64, 0, 7); x.fill(); x.fillStyle = '#ffffff'; for (const dx of [-24, 0, 24]) { x.beginPath(); x.arc(c + dx, c - 10, 15, 0, 7); x.fill(); } x.fillRect(c - 36, c + 14, 72, 14);
    x.strokeStyle = '#d0d0d0'; x.lineWidth = 12; x.beginPath(); x.arc(c, c, w / 2 - 18, 0, 7); x.stroke(); }, null, false);
  const BRONZE = new THREE.MeshStandardMaterial({ color: 0xc58a4e, metalness: 1, roughness: 0.32, bumpMap: emb, bumpScale: 2.5 });
  const disc = mesh(new THREE.CylinderGeometry(1, 1, 0.1, 96), BRONZE); disc.rotation.x = Math.PI / 2; medal.add(disc);
  for (const s of [1, -1]) { const f = mesh(new THREE.CircleGeometry(0.985, 96), BRONZE, 0, 0, s * 0.051); if (s < 0) f.rotation.y = Math.PI; medal.add(f); }
  medal.add(mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 24), BRONZE, 0, 1.1, 0), mesh(new THREE.BoxGeometry(0.95, 0.1, 0.07), BRONZE, 0, 1.24, 0));
  const rib = mesh(new THREE.PlaneGeometry(0.9, 1.3, 10, 10), STD(0x2a0a4a, { roughness: 0.75, side: THREE.DoubleSide }), 0, 1.92, 0); medal.add(rib);
  const key = new THREE.SpotLight(0xffe6c0, 120, 20, 0.5, 0.6, 1.2); key.position.set(3, 4, 6); key.target = medal; g.add(key);
  const rim = new THREE.PointLight(0x9a8aff, 30, 20); rim.position.set(-3, 2, -3); g.add(rim);
  const sp = []; const r = RNG(41); for (let i = 0; i < 40; i++) { const s = glow([0xffe08a, 0xffffff, 0xff9933][i % 3], 0.18, 0.8); s.position.set((r() - 0.5) * 6, (r() - 0.5) * 9, -1.5 + r()); g.add(s); sp.push([s, r() * 6]); } g.userData.sparks = sp;
}
// hero: sunrise, the flag, mountains
const HERO = makeSet('hero'), HH = (x, z) => Math.max(0, 1.5 - Math.hypot(x, z + 1) * 0.1) + valleyH(3.1, 25)(x, z);
{
  const g = HERO, r = RNG(51);
  g.add(terrain(1600, 240, HH, valleyCol(3.1)));
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 12 + r() * 80; plant(g, PROTOS[(r() * 4) | 0], Math.cos(a) * d, Math.sin(a) * d - 20, 0.8 + r() * 0.5, r() * 6, HH); }
  flag(g, 1.2, HH(1.2, -1.2) + 4.6, -1.2, 3.6, 2.4);
}

// ---------- cast ----------
const MAJOR = makeChar('MAJOR'), MEN = ['SOLDIER', 'SOLDIER2', 'SOLDIER3', 'SOLDIER', 'SOLDIER2', 'SOLDIER3'].map(k => makeChar(k)), RAIDERS = Array.from({ length: 14 }, () => makeChar('RAIDER', { static: true }));
const REINF = ['SOLDIER2', 'SOLDIER', 'SOLDIER3', 'SOLDIER2'].map(k => makeChar(k));
const addTo = (set, list) => list.forEach(c => set.add(c.g));

// ---------- staging ----------
const TLB = Object.fromEntries(TL.beats.map(b => [b.id, b]));
const focus = new THREE.Vector3();
function look(px, py, pz, tx, ty, tz, fov = 42) { camera.fov = fov; camera.updateProjectionMatrix(); camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); focus.set(tx, 0, tz); }
function majorState(t, o = {}) { return S0({ yaw: 0.2, brow: -0.25, smile: 0.15, open: blink(t, 0.3), armR: ARM.point, armL: ARM.chest, ...o }); }
function soldierState(t, i, o = {}) { return S0({ yaw: (i % 3 - 1) * 0.3, smile: 0.1, brow: -0.1, open: blink(t, i * 0.7), armR: ARM.rifle, armL: ARM.rifle, ...o }); }
const POS = [[-2.2, -1.2], [-0.9, -1.9], [0.9, -1.9], [2.2, -1.2], [-1.6, 0.2], [1.6, 0.2]];
function staffValley(t, mode) {
  addTo(VAL, [MAJOR, ...MEN, ...RAIDERS]);
  MEN.forEach((c, i) => { const [x, z] = POS[i]; const aim = mode === 'fight' && i < 4; placeC(c, x, z, soldierState(t, i, aim ? { armR: ARM.aim, armL: [0.8, 0.3, 'fist'], rifleAim: true, yaw: 0, brow: -0.6, smile: -0.2 } : {}), t); });
}
function raiders(t, adv, spread = 1) { RAIDERS.forEach((c, i) => { const row = i % 7, grp = Math.floor(i / 7); const x = (row - 3) * 2.6 * spread + grp * 1.3, z = lerp(-40, -16, adv) - grp * 2.4; placeC(c, x, z, S0({ walk: t * 4 + i }), t, VH(x, z)); }); }
let CUR = 'day'; const L_ = k => { CUR = k; };
const SHOT = {
  intro(t, d) { L_('battle'); staffValley(t, 'idle'); raiders(t, 0.05 + t * 0.012); vSmoke(t + 4); vSmoke2(t + 2);
    placeC(MAJOR, 0, 0.6, majorState(t, { armR: ARM.binoc, armL: ARM.chest, lookY: -0.2, brow: -0.4, smile: 0 }), t);
    look(lerp(2.2, 1.4, t / d), 1.15, lerp(3.2, 2.5, t / d), 0, 1.05, 0.2, 42); },
  retreat(t, d) { SHOT.intro(t + 6.4, 7.8); look(0.5, 1.05, 1.9 - t * 0.15, 0, 1.08, 0.6, 38); },
  refused(t, d) { L_('battle'); staffValley(t, 'idle'); raiders(t, 0.15); vSmoke(t + 10); vSmoke2(t + 8);
    placeC(MAJOR, 0, 0.6, majorState(t, { brow: -0.6, smile: 0.25, yaw: Math.sin(t * 9) * 0.25 * Math.max(0, 1 - t), armR: ARM.relax }), t);
    look(0.9, 1.2, 3.0, 0, 1.0, 0.4, 40); },
  date(t, d) { L_('day'); staffValley(t, 'idle'); raiders(t, 0.15); placeC(MAJOR, 0, 0.6, majorState(t), t); vSmoke(t + 13); vSmoke2(t + 11);
    look(lerp(26, 18, t / d), lerp(20, 14, t / d), lerp(38, 28, t / d), 0, 1, -10, 45); },
  badgam(t, d) { L_('day'); staffValley(t, 'idle'); raiders(t, 0.2 + t * 0.05, 1.3); placeC(MAJOR, 0, 0.6, majorState(t), t); vSmoke(t + 16); vSmoke2(t + 14);
    const a = 0.6 - t * 0.08; look(Math.sin(a) * 24, lerp(14, 9, t / d), Math.cos(a) * 24, 0, 1, -8, 45); },
  among(t, d) { L_('day'); staffValley(t, 'idle'); raiders(t, 0.5); vSmoke(t + 22);
    placeC(MAJOR, 0, 0.6, majorState(t, { armR: ARM.point, smile: 0.3, brow: 0 }), t);
    look(lerp(1.8, 1.0, t / d), 1.2, lerp(3.4, 2.6, t / d), 0, 1.0, 0.5, 40); },
  despite(t, d) { L_('day'); addTo(VAL, [MAJOR, ...MEN, ...RAIDERS]); raiders(t, 0.55); vSmoke(t + 28);
    const z = lerp(3.5, 0.6, smooth(t / d));
    placeC(MAJOR, 0, z, majorState(t, { walk: t * 7, armR: ARM.up, brow: -0.3, smile: 0.2, yaw: 0 }), t);
    MEN.forEach((c, i) => placeC(c, (i - 2.5) * 0.9, z + 1.4 + (i % 2) * 0.6, soldierState(t, i, { walk: t * 7 + i, yaw: 0 }), t));
    look(lerp(1.6, 0.8, t / d), 1.15, z - 3.6, 0, 1.0, z + 1.2, 44); },
  desperate(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.6); VAL_BLASTS(t); vSmoke(t + 30); vSmoke2(t + 30);
    placeC(MAJOR, 0, 0.6, majorState(t, { brow: -0.7, smile: -0.2, mouth: 0.4, armR: ARM.point }), t);
    look(-2.6 + Math.sin(t * 30) * 0.02, 1.4, 3.8, 0, 1.0, -4, 44); },
  advancing(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.62 + t * 0.04, 1.4); VAL_BLASTS(t + 3); vSmoke(t + 33); vSmoke2(t + 33); placeC(MAJOR, 0, 0.6, majorState(t, { brow: -0.7 }), t);
    look(lerp(-4, 4, t / d), 2.6, -30, 0, 1.2, 0, 42); },
  hold(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.75); VAL_BLASTS(t + 7); vSmoke(t + 37);
    placeC(MAJOR, 0, 0.6, majorState(t, { armR: ARM.up, brow: -0.8, smile: 0.1, mouth: 0.5, yaw: 0 }), t);
    look(0.2, 0.75, 2.3, 0, 1.25, 0.2, 40); },
  moved(t, d) { L_('battle'); staffValley(t, 'fight'); raiders(t, 0.78); VAL_BLASTS(t + 10); vSmoke(t + 40);
    const k = (t / d) * 2 - 1, mx = Math.sin(k * 1.4) * 2.2;
    placeC(MAJOR, mx, -0.5, majorState(t, { walk: t * 8, armR: Math.floor(t * 1.2) % 2 ? ARM.thumb : ARM.point, smile: 0.4, brow: 0, yaw: Math.cos(k * 1.4) * 0.6 }), t);
    look(mx * 0.6, 1.6, 3.6, mx * 0.8, 1.0, -1, 44); },
  reinforce(t, d) { L_('day'); addTo(AIR, REINF);
    const k = smooth(t / (d * 0.75)); plane1.position.set(lerp(-60, 4, k), lerp(14, 2.25, Math.min(1, k * 1.25)), -3); plane1.rotation.z = lerp(-0.1, 0.17, Math.min(1, k * 1.25)); plane1.userData.spin(t, 1);
    plane2.position.set(-12, 2.25, 7); plane2.rotation.set(0, 0.55, 0.17); plane2.userData.spin(t * 0.25, 0.3);
    dust(t * 3, k > 0.75 ? 1 : 0);
    REINF.forEach((c, i) => placeC(c, -7 + i * 1.2 + t * 1.1, 12.5 - i * 0.5, soldierState(t, i, { walk: t * 8 + i, smile: 0.5, yaw: 0.6 }), t));
    look(lerp(12, 8, t / d), lerp(4.5, 3.6, t / d), lerp(30, 25, t / d), lerp(-8, -2, t / d), 2.6, 2, 50); },
  tragic(t, d) { L_('dusk'); const b = MEM.userData.base; look(lerp(3.2, 2.2, t / d), b + lerp(1.4, 1.3, t / d), lerp(5.5, 4.2, t / d), 0, b + 1.2, 0, 40); },
  never(t, d) { L_('dusk'); const b = MEM.userData.base; look(lerp(2.2, 0.8, t / d), b + lerp(1.3, 2.2, t / d), lerp(4.2, 6.5, t / d), 0, b + 1.6, -3, 42); },
  medal(t, d) { L_('studio'); medal.rotation.y = Math.sin(t * 0.9) * 0.55 + t * 0.12; medal.position.y = 0.2 + Math.sin(t * 1.4) * 0.05; medal.scale.setScalar(0.6 + 0.4 * easeOutBack(clamp(t / 0.8)));
    MED.userData.sparks.forEach(([s, ph]) => s.material.opacity = 0.4 + 0.4 * Math.sin(t * 3 + ph));
    look(0, 0.6, lerp(6.4, 5.6, t / d), 0, 0.7, 0, 45); },
  spirit(t, d) { L_('sunrise'); addTo(HERO, [MAJOR, ...MEN.slice(0, 4)]); const y0 = HH(0, 1.5);
    placeC(MAJOR, 0, 1.5, majorState(t, { armR: ARM.relax, smile: 0.5, brow: 0.2, yaw: 0 }), t, y0);
    MEN.slice(0, 4).forEach((c, i) => { const x = [-2.2, -1.2, 1.2, 2.2][i], z = 0.4 - Math.abs(i - 1.5) * 0.3; placeC(c, x, z, soldierState(t, i, { smile: 0.5 }), t, HH(x, z)); });
    look(lerp(1.5, 0.4, t / d), y0 + lerp(0.6, 0.9, t / d), lerp(8, 6.5, t / d), 0, y0 + 1.2, 0, 44); },
  jai(t, d) { L_('sunrise'); addTo(HERO, [MAJOR, ...MEN.slice(0, 4)]); const y0 = HH(0, 1.5), k = smooth(t / 0.4);
    placeC(MAJOR, 0, 1.5, majorState(t, { armR: [lerp(0.12, 2.0, k), lerp(0.25, -1.95, k), 'open'], smile: 0.6, brow: 0.3, yaw: 0, mouth: t < 0.8 ? 0.6 : 0 }), t, y0);
    MEN.slice(0, 4).forEach((c, i) => { const x = [-2.2, -1.2, 1.2, 2.2][i], z = 0.4 - Math.abs(i - 1.5) * 0.3; placeC(c, x, z, soldierState(t, i, { smile: 0.6, armR: [lerp(0.2, 2.0, k), lerp(1.6, -1.95, k), 'open'], rifleOn: false }), t, HH(x, z)); });
    look(0.4, y0 + 0.9, lerp(6.5, 6.0, t / d), 0, y0 + 1.2, 0, 44); },
};
const SETOF = { intro: 'val', retreat: 'val', refused: 'val', date: 'val', badgam: 'val', among: 'val', despite: 'val', desperate: 'val', advancing: 'val', hold: 'val', moved: 'val', reinforce: 'air', tragic: 'mem', never: 'mem', medal: 'med', spirit: 'hero', jai: 'hero' };

// ---------- overlay ----------
const caps = (() => { const out = []; let cur = null;
  for (const w of TL.words) { if (cur && (cur.text + ' ' + w.w).length <= 12 && w.t0 - cur.t1 < 0.25) { cur.text += ' ' + w.w; cur.t1 = w.t1; } else { if (cur) out.push(cur); cur = { text: w.w, t0: w.t0, t1: w.t1 }; } }
  out.push(cur); return out; })();
const PHOTO_T = (TL.words.find(w => /Somnath/.test(w.w)) || { t0: 8 }).t0 - 0.15;
function overlay(t, b, lt, d) {
  const tIn = TLB.date.start + 0.1, tOut = TLB.among.start - 0.3, a = smooth((t - tIn) / 0.4) * (1 - smooth((t - tOut) / 0.4));
  $('year').textContent = '3 NOV 1947'; $('label').textContent = 'Badgam · Kashmir';
  $('head').style.opacity = a; $('head').style.transform = `translateY(${(1 - smooth((t - tIn) / 0.4)) * -40}px)`;
  const ta = smooth(t / 0.5) * (1 - smooth((t - 2.6) / 0.5)); $('title').style.opacity = ta; $('title').style.transform = `scale(${0.94 + 0.06 * smooth(t / 3)})`;
  const ma = b.id === 'medal' ? smooth((lt - 3.6) / 0.5) : 0; $('medalT').style.opacity = ma; $('medalT').style.transform = `translateY(${(1 - ma) * 30}px)`;
  const air = b.id === 'reinforce' ? smooth(lt / 0.4) * (1 - smooth((lt - d + 0.5) / 0.4)) : 0; $('place').style.opacity = air;
  const ea = t > TL.duration - 2.8 ? smooth((t - (TL.duration - 2.8)) / 0.6) : 0; $('end').style.opacity = ea; $('endShade').style.opacity = ea * 0.8;
  const p0 = PHOTO_T, pk = t >= p0 - 0.18 && t < p0 + 1.18 ? Math.min(smooth((t - p0 + 0.18) / 0.18), 1 - smooth((t - p0 - 1.0) / 0.18)) : 0;
  $('photo').style.opacity = pk; $('photo').style.transform = `translate(-50%, -50%) rotate(-3deg) scale(${0.86 + 0.14 * pk + 0.02 * (t - p0)})`;
  const c = caps.find(c => t >= c.t0 - 0.05 && t < c.t1 + 0.15);
  $('sub').style.opacity = c && pk < 0.5 ? 1 : 0;
  if (c) { $('sub').textContent = c.text; $('sub').style.transform = `translateX(-50%) scale(${0.92 + 0.08 * smooth((t - c.t0 + 0.05) / 0.12)})`; }
  let f = 0; if (b.id === 'intro') f = Math.max(1 - lt / 0.6, 0); else if (['date', 'reinforce', 'tragic', 'medal', 'spirit'].includes(b.id)) f = Math.max(1 - lt / 0.3, 0);
  if (t > TL.duration - 0.8) f = Math.max(f, (t - (TL.duration - 0.8)) / 0.8);
  $('fade').style.opacity = clamp(f); $('bar').style.width = (t / TL.duration * 100) + '%';
}

const camPos = new THREE.Vector3(), wp = new THREE.Vector3();
window.renderFrame = (t) => {
  t = clamp(t, 0, TL.duration - 1e-3);
  const b = TL.beats.find(x => t < x.end) || TL.beats[TL.beats.length - 1], lt = t - b.start, d = b.end - b.start;
  Object.values(SETS).forEach(s => s.visible = false); chars.forEach(c => c.g.visible = false);
  const set = SETS[SETOF[b.id]]; set.visible = true;
  SHOT[b.id](lt, d);
  applyPreset(CUR, focus);
  (set.userData.tick || []).forEach(f => f(lt));
  camera.updateMatrixWorld(); camPos.copy(camera.position);
  chars.forEach(c => { if (!c.g.visible) return; c.g.getWorldPosition(wp); c.m.rotation.y = Math.atan2(camPos.x - wp.x, camPos.z - wp.z); });
  renderer.render(scene, camera);
  overlay(t, b, lt, d);
};
window.DURATION = TL.duration;
await document.fonts.ready;
await Promise.all(['500', '600', '800'].map(w => document.fonts.load(`${w} 40px Poppins`)));
window.renderFrame(0);
window.READY = true;
