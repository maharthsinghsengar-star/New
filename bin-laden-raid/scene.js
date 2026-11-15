// THE RAID ON ABBOTTABAD — documentary reconstruction (16:9). PBR sets, film / night-vision / thermal / satellite looks.
// Real people appear only as faceless silhouettes. Deterministic: window.renderFrame(t).
import * as THREE from 'three';

const W = 1280, H = 720;
const TL = await (await fetch('build/timeline.json')).json();
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 6000);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x5a4a3a, 1.0), sun = new THREE.DirectionalLight(0xfff0dc, 3.0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);
let NOW = 0, BEAT = TL.beats[0];

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hit = (t, t0, len = 0.5) => (t >= t0 && t < t0 + len) ? 1 - (t - t0) / len : 0;
function canvasTex(w, h, draw, rx = 1, ry = 1, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
const speckle = (base, cols, n, extra, seed = 1) => (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); const r = RNG(n + seed); for (let i = 0; i < n; i++) { x.globalAlpha = 0.15 + r() * 0.35; x.fillStyle = cols[r() * cols.length | 0]; const s = 1 + r() * 5; x.fillRect(r() * w, r() * h, s, s * (0.5 + r())); } x.globalAlpha = 1; if (extra) extra(x, w, h, r); };
const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(geo, typeof mat === 'number' ? S(mat) : mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m; }
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (r1, r2, h, mat, x, y, z, s = 16) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat, x, y, z);
const sph = (r, mat, x, y, z) => mesh(new THREE.SphereGeometry(r, 16, 12), mat, x, y, z);
const G = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
const glowTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
function glow(c, s, x, y, z, op = 1, add = true) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, transparent: true, opacity: op })); sp.scale.setScalar(s); sp.position.set(x, y, z); return sp; }
const smokeTex = canvasTex(128, 128, (x) => { const r = RNG(5); for (let i = 0; i < 40; i++) { const px = 64 + (r() - 0.5) * 60, py = 64 + (r() - 0.5) * 60, rr = 14 + r() * 26, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
function puff(c, op = 0.6) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: c, transparent: true, opacity: op, depthWrite: false })); sp.visible = false; scene.add(sp); return sp; }
function textTex(w, h, draw) { return canvasTex(w, h, draw); }
function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }

// ---------- value noise / fbm for terrain ----------
const PERM = (() => { const r = RNG(1234), p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
const hash2 = (x, y) => PERM[(PERM[x & 255] + y) & 255] / 255;
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return lerp(lerp(a, b, u), lerp(c, d, u), v); }
function fbm(x, y, o = 6) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
function ridged(x, y, o = 6) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { const n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1); s += a * n * n; f *= 2.1; a *= 0.5; } return s; }
// world layout (metres, compressed): compound at the origin in the Abbottabad valley; Jalalabad far to the west; Tora Bora peaks south-west
const JAL = new THREE.Vector2(-2200, 300), TORA = new THREE.Vector2(-1500, -900);
function terrainH(x, z) {
  const d = Math.hypot(x, z), valley = smooth((d - 380) / 700);
  const route = (() => { const t = clamp((x - JAL.x) / (0 - JAL.x)), cz = lerp(JAL.y, 0, t) + Math.sin(t * 6) * 120; return Math.exp(-(((z - cz) / 180) ** 2)) * (t > 0 && t < 1 ? 1 : 0); })();
  const tora = Math.exp(-(((x - TORA.x) ** 2 + (z - TORA.y) ** 2) / (700 * 700)));
  const mount = ridged(x * 0.0011 + 3.1, z * 0.0011 - 1.7) * 520 + fbm(x * 0.004, z * 0.004) * 90;
  const hills = fbm(x * 0.003 + 10, z * 0.003) * 60;
  let h = lerp(hills * 0.25 + 4, mount * (1 - 0.55 * route) + hills, valley) + tora * 380 * ridged(x * 0.003, z * 0.003);
  if (d < 420) h = lerp(2.0, h, smooth((d - 300) / 120));
  return h;
}

// ---------- terrain ----------
const TX0 = -2900, TX1 = 900, TZ0 = -1900, TZ1 = 1300;
const terrain = (() => {
  const geo = new THREE.PlaneGeometry(TX1 - TX0, TZ1 - TZ0, 380, 320); geo.rotateX(-Math.PI / 2); geo.translate((TX0 + TX1) / 2, 0, (TZ0 + TZ1) / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = terrainH(x, z); p.setY(i, h); }
  geo.computeVertexNormals(); const nr = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const h = p.getY(i), slope = 1 - nr.getY(i), x = p.getX(i), z = p.getZ(i), n = fbm(x * 0.02, z * 0.02, 3);
    const grass = new THREE.Color().setHSL(0.22 + n * 0.05, 0.32, 0.26 + n * 0.08), rock = new THREE.Color().setHSL(0.08, 0.14, 0.34 + n * 0.1), snow = new THREE.Color(0xeef2f6), dry = new THREE.Color().setHSL(0.1, 0.25, 0.4 + n * 0.1);
    c.copy(grass).lerp(dry, clamp((h - 120) / 200)).lerp(rock, clamp(slope * 2.2 - 0.25 + (h > 260 ? 0.3 : 0))).lerp(snow, clamp((h - 420 + n * 60) / 80) * clamp(1.3 - slope * 2));
    col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const detail = canvasTex(256, 256, speckle('#b0b0b0', ['#909090', '#c8c8c8', '#787878', '#d8d8d8'], 5000), 600, 500);
  const m = mesh(geo, S(0xffffff, { vertexColors: true, map: detail, roughness: 0.95 }), 0, 0, 0, false); m.receiveShadow = true; scene.add(m); return m; })();
const groundT = canvasTex(512, 512, speckle('#6b7344', ['#5a6236', '#7c8450', '#8a7a58', '#6a5e44', '#4e5a30'], 9000), 60, 60);
const ground = mesh(new THREE.CircleGeometry(300, 64).rotateX(-Math.PI / 2), S(0xffffff, { map: groundT, roughness: 0.95 }), 0, 2.02, 0, false); scene.add(ground);

// ---------- sky ----------
const skyT = (stops) => canvasTex(8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const SKY = { day: skyT([[0, '#3d6fb0'], [0.45, '#7aa6d6'], [0.62, '#c8d8e6'], [1, '#d8d4c8']]), night: skyT([[0, '#02040a'], [0.45, '#08101e'], [0.6, '#16223a'], [1, '#0a0e16']]),
  dawn: skyT([[0, '#2a3a5e'], [0.4, '#7a7aa0'], [0.55, '#e8a07a'], [0.62, '#f2c49a'], [1, '#6a6a7a']]), dusk: skyT([[0, '#1a2440'], [0.42, '#4a4a6e'], [0.56, '#c87a5a'], [0.62, '#e0a070'], [1, '#3a3440']]),
  overcast: skyT([[0, '#6a7480'], [0.5, '#9aa2aa'], [0.62, '#b8bcbe'], [1, '#8a8a88']]) };
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), B(0xffffff, { map: SKY.day, side: THREE.BackSide, fog: false, depthWrite: false })); skyDome.renderOrder = -10; scene.add(skyDome);
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute((() => { const a = [], r = RNG(77); for (let i = 0; i < 2500; i++) { const th = r() * Math.PI * 2, ph = 0.05 + r() * 1.45; a.push(Math.cos(th) * Math.cos(ph) * 4800, Math.sin(ph) * 4800, Math.sin(th) * Math.cos(ph) * 4800); } return a; })(), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
scene.add(stars);
const moon = G(new THREE.Mesh(new THREE.CircleGeometry(60, 32), B(0xf4f0e0, { fog: false })), glow(0xc8d8ff, 600, 0, 0, -1, 0.5)); scene.add(moon);
scene.fog = new THREE.FogExp2(0xaabbd0, 0.00035);

// ---------- Abbottabad: houses, trees, roads, the military academy ----------
const plaster = canvasTex(256, 256, speckle('#d8cfc0', ['#c8bfb0', '#e6ddd0', '#b8ae9e', '#a89e8e'], 1600, (x, w, h, r) => {
  for (let fy = 0; fy < 2; fy++) for (let k = 0; k < 3; k++) { const wx = 30 + k * 80 + r() * 10, wy = 40 + fy * 128; x.fillStyle = '#3a3a3e'; x.fillRect(wx, wy, 34, 46); x.fillStyle = 'rgba(120,140,160,0.5)'; x.fillRect(wx + 3, wy + 3, 28, 18); }
  x.fillStyle = 'rgba(60,50,40,0.25)'; for (let i = 0; i < 6; i++) x.fillRect(r() * w, 0, 2 + r() * 6, h * (0.3 + r() * 0.5)); }));
const houseGeo = new THREE.BoxGeometry(1, 1, 1); houseGeo.translate(0, 0.5, 0);
const HOUSES = []; { const r = RNG(91); for (let i = 0; i < 900; i++) { const a = r() * Math.PI * 2, d = 60 + Math.pow(r(), 0.7) * 520; const x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (Math.abs(z + 60) < 9 || Math.abs(x - 40) < 8) continue; if (Math.hypot(x - 260, z + 170) < 120) continue; if (Math.hypot(x, z) < 62) continue;
  HOUSES.push({ x, z, w: 9 + r() * 9, d: 9 + r() * 9, h: [3.4, 6.6, 6.6, 9.6][r() * 4 | 0], ry: Math.round(r() * 4) * Math.PI / 2 + (r() - 0.5) * 0.15, c: ['#e2d8c6', '#d6cab4', '#e8e2d6', '#cfc2a8', '#d8c8b8', '#c8c4bc', '#e0cfc0'][r() * 7 | 0] }); } }
const houses = new THREE.InstancedMesh(houseGeo, S(0xffffff, { map: plaster, roughness: 0.9 }), HOUSES.length); houses.castShadow = houses.receiveShadow = true;
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); HOUSES.forEach((h, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.ry); m.compose(new THREE.Vector3(h.x, terrainH(h.x, h.z) - 0.3, h.z), q, new THREE.Vector3(h.w, h.h, h.d)); houses.setMatrixAt(i, m); houses.setColorAt(i, c.set(h.c)); }); }
scene.add(houses);
const treeGeo = new THREE.IcosahedronGeometry(1, 3); treeGeo.translate(0, 1.6, 0); const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6); trunkGeo.translate(0, 0.8, 0);
const TREES = []; { const r = RNG(17); for (let i = 0; i < 1400; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 620, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x, z) < 85) continue; TREES.push({ x, z, s: 2.2 + r() * 3, c: new THREE.Color().setHSL(0.24 + r() * 0.06, 0.35, 0.18 + r() * 0.1) }); }
  [[18, 22], [26, 14], [-8, -24], [30, -18]].forEach(([x, z]) => TREES.push({ x, z, s: 3, c: new THREE.Color().setHSL(0.25, 0.35, 0.22) })); }
const trees = new THREE.InstancedMesh(treeGeo, S(0xffffff, { roughness: 0.95 }), TREES.length), trunks = new THREE.InstancedMesh(trunkGeo, S(0x4a3a2a), TREES.length);
trees.castShadow = trees.receiveShadow = trunks.castShadow = true;
{ const m = new THREE.Matrix4(); TREES.forEach((t, i) => { const y = terrainH(t.x, t.z); m.makeScale(t.s, t.s * 1.1, t.s); m.setPosition(t.x, y + t.s * 0.3, t.z); trees.setMatrixAt(i, m); trees.setColorAt(i, t.c); m.makeScale(t.s * 0.6, t.s * 0.6, t.s * 0.6); m.setPosition(t.x, y, t.z); trunks.setMatrixAt(i, m); }); }
scene.add(trees, trunks);
const roadT = canvasTex(256, 256, speckle('#4a4846', ['#3e3c3a', '#58544e', '#6a645a'], 2600), 1, 60);
[[0, -60, 1400, 8, 0], [40, 0, 1400, 7, Math.PI / 2]].forEach(([x, z, l, w, r]) => { const rd = mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), S(0xffffff, { map: roadT }), x, 2.05, z, false); rd.rotation.y = r; scene.add(rd); });
const academy = new THREE.Group(); academy.position.set(260, 2, -170); scene.add(academy);
academy.add(mesh(new THREE.PlaneGeometry(200, 140).rotateX(-Math.PI / 2), S(0x5c7a3a), 0, 0.06, 0, false));
[[-60, -90, 60, 14, 12], [20, -90, 50, 10, 12], [90, -40, 14, 10, 50], [-90, 20, 14, 8, 40]].forEach(([x, z, w, h, d]) => academy.add(box(w, h, d, S(0xc8a888), x, h / 2, z)));
// telephone / power poles along the street that skip the compound
const poles = new THREE.Group(); scene.add(poles);
for (let i = -12; i <= 12; i++) { const x = i * 22; poles.add(cyl(0.12, 0.15, 8, S(0x5a4a3a), x, 6, -66, 6), box(1.6, 0.12, 0.12, S(0x3a3a3a), x, 9.6, -66)); }
for (let i = -12; i < 12; i++) [-0.6, 0.6].forEach(dx => { const a = new THREE.Vector3(i * 22 + dx, 9.6, -66), b = new THREE.Vector3((i + 1) * 22 + dx, 9.6, -66), mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 0.8;
  poles.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 8, 0.02, 4), B(0x1a1a1a))); });

// ---------- the compound ----------
const compound = new THREE.Group(); scene.add(compound);
const concT = canvasTex(512, 512, speckle('#d6d0c4', ['#c4bdb0', '#e2ddd2', '#b0a898', '#9a9284'], 3000, (x, w, h, r) => { for (let i = 0; i < 26; i++) { const sx = r() * w, g = x.createLinearGradient(sx, 0, sx, h); g.addColorStop(0, 'rgba(70,60,50,0.35)'); g.addColorStop(1, 'rgba(70,60,50,0)'); x.fillStyle = g; x.fillRect(sx, 0, 3 + r() * 14, h * (0.3 + r() * 0.6)); } x.strokeStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 64) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } }), 4, 1);
const concM = S(0xffffff, { map: concT, roughness: 0.92 });
const PLOT = [[-38, -26], [30, -32], [42, 8], [6, 32], [-34, 22]];
function wall(a, b, hgt, th = 0.4, mat = concM, parent = compound) { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); const w = box(L + th, hgt, th, mat, (a[0] + b[0]) / 2, 2 + hgt / 2, (a[1] + b[1]) / 2); w.rotation.y = -Math.atan2(dz, dx); parent.add(w);
  const n = Math.floor(L / 0.7); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, coil = mesh(new THREE.TorusGeometry(0.22, 0.012, 4, 10), S(0x8a8a8a, { metalness: 0.7, roughness: 0.4 }), a[0] + dx * t, 2 + hgt + 0.22, a[1] + dz * t, false); coil.rotation.y = -Math.atan2(dz, dx); parent.add(coil); } return w; }
const WALLH = [4.6, 5.5, 4.6, 4.2, 4.6];
PLOT.forEach((p, i) => { if (i === 4) { wall(p, [-36, 4], 4.6); wall([-35.4, -6], PLOT[0], 4.6); } else wall(p, PLOT[(i + 1) % 5], WALLH[i]); });
const gate = box(0.25, 4.0, 10, S(0x2e4a3a, { metalness: 0.5, roughness: 0.5 }), -35.7, 4.0, -1); compound.add(gate);
wall([-14, -29], [-8, 28], 3.8); wall([-14, -6], [-35, -6], 3.2); wall([4, -10], [26, -12], 3.0);
const mainH = new THREE.Group(); mainH.position.set(14, 2, 10); mainH.rotation.y = -0.12; compound.add(mainH);
mainH.add(box(22, 3.3, 15, concM, 0, 1.65, 0), box(22.4, 0.3, 15.4, S(0xb8b0a0), 0, 3.35, 0), box(22, 3.1, 15, concM, 0, 5.0, 0), box(22.4, 0.3, 15.4, S(0xb8b0a0), 0, 6.6, 0), box(12, 3.0, 9, concM, -3, 8.2, 2), box(12.4, 0.3, 9.4, S(0xb8b0a0), -3, 9.8, 2));
mainH.add(box(9, 2.1, 0.3, concM, 7.5, 7.8, -2.6), box(0.3, 2.1, 9, concM, 11.9, 7.8, 2), box(9, 2.1, 0.3, concM, 7.5, 7.8, 6.4));   // the two-metre terrace privacy wall
const winM = S(0x1e2228, { roughness: 0.4, metalness: 0.2 });
for (let f = 0; f < 2; f++) for (let k = -3; k <= 3; k++) if ((k + f) % 2 === 0) mainH.add(box(1.2, 1.0, 0.1, winM, k * 3, 2.0 + f * 3.3, -7.55));
for (let k = -1; k <= 1; k++) mainH.add(box(1.0, 0.9, 0.1, winM, -3 + k * 3, 8.4, -2.55));
mainH.add(box(1.6, 2.4, 0.15, S(0x4a3a2a), -6, 1.2, -7.6));
const guestH = G(box(13, 3.2, 8, concM, 0, 1.6, 0), box(13.4, 0.3, 8.4, S(0xb8b0a0), 0, 3.3, 0), box(1.3, 2.3, 0.12, S(0x4a3a2a), 3, 1.15, -4.06), box(1.0, 0.9, 0.1, winM, -3, 1.8, -4.05)); guestH.position.set(-24, 2, -16); compound.add(guestH);
compound.add(mesh(new THREE.PlaneGeometry(16, 10).rotateX(-Math.PI / 2), S(0x4e6a2e), 20, 2.06, -16, false), mesh(new THREE.PlaneGeometry(12, 8).rotateX(-Math.PI / 2), S(0x6a5a3e), -24, 2.05, 10, false));
const trashFire = new THREE.Group(); trashFire.position.set(-4, 2, -22); compound.add(trashFire); trashFire.add(cyl(0.5, 0.45, 0.8, S(0x3a3a3a, { metalness: 0.4 }), 0, 0.4, 0, 12));
const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(PLOT.map(([x, z]) => new THREE.Vector3(x, 8.5, z))), new THREE.LineBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0, depthTest: false, fog: false })); outline.renderOrder = 5; scene.add(outline);
const neighOutline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-6, -6], [6, -6], [6, 6], [-6, 6]].map(([x, z]) => new THREE.Vector3(x + 80, 6, z - 30))), new THREE.LineBasicMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0, depthTest: false, fog: false })); scene.add(neighOutline);
const rubble = new THREE.Group(); rubble.visible = false; scene.add(rubble);
{ const r = RNG(55); for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * 60, z = (r() - 0.5) * 50; if (!pointInPlot(x, z)) continue; const s = 0.3 + r() * 1.4; const m = mesh(new THREE.DodecahedronGeometry(s, 0), S([0xc8c0b0, 0xa89e8e, 0x8a8070][i % 3], { flatShading: true }), x, 2 + s * 0.4, z); m.rotation.set(r() * 3, r() * 3, r() * 3); rubble.add(m); } }
function pointInPlot(x, z) { let ins = false; for (let i = 0, j = PLOT.length - 1; i < PLOT.length; j = i++) { const [xi, zi] = PLOT[i], [xj, zj] = PLOT[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }

// ---------- aircraft & vehicles ----------
const darkPaint = S(0x2c3034, { roughness: 0.55, metalness: 0.35 }), glassM = S(0x0e1418, { roughness: 0.08, metalness: 0.6 }), rubberM = S(0x141414, { roughness: 0.8 });
function profileMesh(pts, depth, mat, bevel = 0.08) { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 }); g.translate(0, 0, -depth / 2); return mesh(g, mat); }
function blackhawk() {   // faceted "stealth" Black Hawk: x = forward (nose at -x)
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(profileMesh([[-4.2, 0.2], [-3.2, -0.6], [2.2, -0.7], [3.0, 0.1], [2.6, 1.4], [-1.6, 1.6], [-3.3, 1.2]], 2.0, darkPaint, 0.12));
  body.add(profileMesh([[-4.25, 0.35], [-3.4, 1.1], [-2.0, 1.3], [-2.4, 0.4]], 1.7, glassM, 0.05));
  const boom = profileMesh([[2.6, 0.5], [9.5, 1.0], [9.5, 1.5], [2.6, 1.5]], 0.7, darkPaint, 0.06); body.add(boom);
  body.add(profileMesh([[9.0, 1.2], [10.4, 1.4], [10.8, 3.2], [9.8, 3.3]], 0.25, darkPaint, 0.04), box(0.3, 0.05, 3.2, darkPaint, 9.6, 1.5, 0));
  const tr = new THREE.Group(); tr.position.set(10.1, 2.4, 0.25); for (let i = 0; i < 4; i++) { const b = box(0.12, 1.4, 0.03, darkPaint, 0, 0, 0); b.rotation.z = i * Math.PI / 4; tr.add(b); } body.add(tr);
  body.add(box(1.8, 0.6, 1.6, darkPaint, -0.2, 1.9, 0), cyl(0.5, 0.6, 0.35, darkPaint, -0.2, 2.35, 0, 12));
  [-1, 1].forEach(s => { body.add(cyl(0.32, 0.32, 0.18, rubberM, -2.6, -0.9, s * 1.05, 14).rotateX(Math.PI / 2), box(0.1, 0.6, 0.1, darkPaint, -2.6, -0.55, s * 0.95)); body.add(box(0.8, 0.7, 0.05, glassM, -1.0, 0.7, s * 1.06)); });
  body.add(cyl(0.18, 0.18, 0.12, rubberM, 8.6, 0.6, 0, 10).rotateX(Math.PI / 2));
  const rotor = new THREE.Group(); rotor.position.set(-0.2, 2.6, 0); for (let i = 0; i < 4; i++) { const b = box(8.0, 0.05, 0.5, darkPaint, 4.0, 0, 0); const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2; arm.add(b); rotor.add(arm); } body.add(rotor);
  const disc = mesh(new THREE.CircleGeometry(8.1, 48).rotateX(-Math.PI / 2), B(0x30343a, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), -0.2, 2.62, 0, false); body.add(disc);
  g.userData = { rotor, tr, body, boom }; g.scale.setScalar(1); return g;
}
function chinook() {
  const g = new THREE.Group(), p = S(0x4a5038, { roughness: 0.6, metalness: 0.25 });
  g.add(profileMesh([[-7.5, 0.4], [-6.8, -0.8], [6.8, -0.8], [7.4, 0.2], [7.4, 2.4], [-6.6, 2.6], [-7.6, 1.6]], 3.4, p, 0.2), profileMesh([[-7.6, 1.0], [-7.0, 2.2], [-5.6, 2.4], [-6.2, 1.0]], 3.0, glassM, 0.05));
  g.add(box(3, 1.6, 2, p, 5.6, 3.4, 0), box(1.6, 0.8, 1.6, p, -5.8, 2.9, 0));
  const r1 = new THREE.Group(), r2 = new THREE.Group(); r1.position.set(-5.8, 3.5, 0); r2.position.set(5.8, 4.4, 0);
  [r1, r2].forEach(r => { for (let i = 0; i < 3; i++) { const arm = new THREE.Group(); arm.rotation.y = i * Math.PI * 2 / 3; arm.add(box(9, 0.06, 0.6, p, 4.5, 0, 0)); r.add(arm); } g.add(r, mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), B(0x30343a, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), r.position.x, r.position.y + 0.02, 0, false)); });
  [-4, 4].forEach(x => [-1, 1].forEach(s => g.add(cyl(0.4, 0.4, 0.3, rubberM, x, -1.1, s * 1.5, 14).rotateX(Math.PI / 2))));
  g.userData = { r1, r2 }; return g;
}
function suzuki(col = 0xeeeeea) {
  const g = new THREE.Group(), p = S(col, { roughness: 0.35, metalness: 0.4 });
  g.add(box(3.7, 0.9, 1.65, p, 0, 0.75, 0), box(2.3, 0.75, 1.55, p, 0.35, 1.55, 0), box(0.05, 0.6, 1.4, glassM, -0.83, 1.55, 0), box(2.2, 0.55, 0.05, glassM, 0.35, 1.6, 0.79), box(2.2, 0.55, 0.05, glassM, 0.35, 1.6, -0.79), box(0.2, 0.3, 1.6, S(0x222222), -1.9, 0.6, 0));
  [-1.2, 1.2].forEach(x => [-1, 1].forEach(s => { const w = cyl(0.36, 0.36, 0.26, rubberM, x, 0.36, s * 0.82, 14); w.rotation.x = Math.PI / 2; g.add(w); }));
  g.add(cyl(0.34, 0.34, 0.2, rubberM, 1.95, 1.0, 0, 14).rotateZ(Math.PI / 2)); return g;
}
function car(col) { const g = new THREE.Group(), p = S(col, { roughness: 0.4, metalness: 0.4 }); g.add(box(4.2, 0.7, 1.7, p, 0, 0.6, 0), box(2.2, 0.6, 1.5, p, 0.2, 1.2, 0), box(2.1, 0.45, 1.52, glassM, 0.2, 1.22, 0));
  [-1.3, 1.3].forEach(x => [-1, 1].forEach(s => { const w = cyl(0.32, 0.32, 0.22, rubberM, x, 0.32, s * 0.85, 12); w.rotation.x = Math.PI / 2; g.add(w); })); return g; }
function b2() { const g = new THREE.Group(); g.add(profileMesh([[0, -0.0], [-26, 12], [-24, 14], [-14, 9], [-8, 12], [0, 8], [8, 12], [14, 9], [24, 14], [26, 12]], 1.2, S(0x3a3e44, { roughness: 0.5, metalness: 0.3 }), 0.4)); g.children[0].rotation.x = -Math.PI / 2; return g; }
function reaper() { const g = new THREE.Group(), p = S(0x9aa0a6, { roughness: 0.5, metalness: 0.3 }); g.add(cyl(0.4, 0.25, 11, p, 0, 0, 0, 12).rotateZ(Math.PI / 2), box(1.2, 0.08, 20, p, -0.5, 0.1, 0), box(1.0, 1.4, 0.08, p, 5.0, 0.6, 0), sph(0.55, p, -5.2, 0.1, 0)); g.children[0].scale.set(1, 1, 1); return g; }
function f16() { const g = new THREE.Group(), p = S(0x8a9096, { roughness: 0.45, metalness: 0.45 }); g.add(cyl(0.6, 0.5, 14, p, 0, 0, 0, 14).rotateZ(Math.PI / 2), profileMesh([[-2, 0], [4, 4.5], [5, 4.5], [5, 0]], 0.15, p, 0.04), box(3, 3, 0.12, p, 6.2, 1.6, 0), sph(0.5, glassM, -3.5, 0.6, 0));
  g.children[1].rotation.x = Math.PI / 2; const g2 = g.children[1].clone(); g2.rotation.x = -Math.PI / 2; g.add(g2); const ab = glow(0xffa860, 4, 7.6, 0, 0, 1); g.add(ab); g.userData.ab = ab; return g; }
function carrier() { const g = new THREE.Group(), p = S(0x6e747a, { roughness: 0.75, metalness: 0.2 }), deck = S(0x3e4246, { roughness: 0.9 });
  g.add(profileMesh([[-170, 0], [-160, -16], [150, -16], [168, 0], [170, 6], [-172, 6]], 40, p, 1), box(330, 1.2, 76, deck, 0, 6.5, 6), box(18, 22, 10, p, 30, 18, 30), box(10, 10, 8, p, 30, 33, 30), cyl(0.6, 0.6, 14, p, 30, 44, 30, 8));
  g.add(box(320, 0.1, 0.6, B(0xd8d0a0), 0, 7.15, 6), box(200, 0.1, 0.6, B(0xd8d0a0), 20, 7.15, -12)); return g; }
const BH1 = blackhawk(), BH2 = blackhawk(), CH47 = chinook(), JEEP = suzuki(), B2 = b2(), DRONE = reaper(), JET = f16(), CVN = carrier();
[BH1, BH2, CH47, JEEP, B2, DRONE, JET, CVN].forEach(o => { o.visible = false; o.traverse(m => { if (m.isMesh) { m.castShadow = true; } }); scene.add(o); });
const CARS = [0xaa2a2a, 0x2a4a8a, 0x8a8a8a, 0xd8d0b8, 0x1a1a1a, 0x5a6a3a, 0xc8a040].map(c => { const o = car(c); o.visible = false; scene.add(o); return o; });

// ---------- faceless figures (mannequins): SEALs, officials, civilians ----------
const suitM = S(0x23262c, { roughness: 0.7 }), skinM = S(0x8a6a58, { roughness: 0.7 }), kitM = S(0x3a3e34, { roughness: 0.85 }), shirtM = S(0xd8d4cc, { roughness: 0.8 });
function figure(kind = 'seal', seed = 0) {
  const r = RNG(seed + 3), root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.95;
  const mat = kind === 'seal' ? kitM : kind === 'suit' ? suitM : S(new THREE.Color().setHSL(0.08 + r() * 0.1, 0.2, 0.3 + r() * 0.3).getHex());
  const limb = (len, rad, m) => { const g = new THREE.Group(); const c = mesh(new THREE.CapsuleGeometry(rad, len - rad * 2, 4, 8), m, 0, -len / 2, 0); g.add(c); return g; };
  const torso = new THREE.Group(); hips.add(torso);
  torso.add(mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), mat, 0, 0.32, 0)); torso.children[0].scale.set(1.15, 1, 0.75);
  if (kind === 'seal') { torso.add(box(0.36, 0.42, 0.26, S(0x2e322a), 0, 0.36, 0.02)); torso.add(box(0.3, 0.32, 0.12, S(0x2a2e26), 0, 0.3, -0.18)); }
  if (kind === 'suit') torso.add(box(0.12, 0.3, 0.02, shirtM, 0, 0.45, 0.13));
  const head = new THREE.Group(); head.position.y = 0.78; torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.115, 16, 12), kind === 'suit' || kind === 'civ' ? skinM : S(0x5a4a40), 0, 0, 0));
  if (kind === 'seal') { head.add(mesh(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.9), kitM, 0, 0.02, 0));
    const nvg = new THREE.Group(); nvg.position.set(0, 0.03, 0.13); [-0.06, -0.02, 0.02, 0.06].forEach(x => nvg.add(cyl(0.017, 0.02, 0.08, S(0x1a1a1a), x, 0, 0.02, 8).rotateX(Math.PI / 2))); head.add(nvg); }
  if (kind === 'civ' && r() > 0.5) head.add(mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), S(0xe8e4dc), 0, 0.02, 0));
  const armL = limb(0.58, 0.05, mat), armR = limb(0.58, 0.05, mat); armL.position.set(-0.22, 0.6, 0); armR.position.set(0.22, 0.6, 0); torso.add(armL, armR);
  const legL = limb(0.9, 0.07, kind === 'suit' ? suitM : mat), legR = limb(0.9, 0.07, kind === 'suit' ? suitM : mat); legL.position.set(-0.1, 0, 0); legR.position.set(0.1, 0, 0); hips.add(legL, legR);
  let rifle = null; if (kind === 'seal') { rifle = G(box(0.06, 0.08, 0.8, S(0x161616), 0, 0, 0.3), box(0.04, 0.12, 0.08, S(0x161616), 0, -0.08, 0.1)); rifle.position.set(0, 0.34, 0.25); torso.add(rifle); }
  root.userData = { hips, torso, head, armL, armR, legL, legR, rifle, kind }; root.traverse(m => { if (m.isMesh) m.castShadow = true; }); root.visible = false; scene.add(root); return root;
}
function posef(f, p = {}) {   // p: walk phase, aim (0..1), sit, crouch, look (yaw), arms
  const u = f.userData, w = p.walk, ph = w ?? 0, am = w === undefined ? 0 : (p.amp ?? 1), cr = p.crouch ?? 0, sit = p.sit ?? 0;
  u.hips.position.y = 0.95 - 0.25 * cr - 0.45 * sit + (w === undefined ? 0 : Math.abs(Math.cos(ph)) * 0.03);
  u.legL.rotation.x = Math.sin(ph) * 0.55 * am - cr * 0.9 - sit * 1.5; u.legR.rotation.x = -Math.sin(ph) * 0.55 * am - cr * 0.9 - sit * 1.5;
  u.torso.rotation.x = (p.lean ?? (cr * 0.35)) ; u.head.rotation.y = p.look ?? 0; u.head.rotation.x = p.nod ?? 0;
  const aim = p.aim ?? (u.kind === 'seal' ? 1 : 0);
  if (aim) { u.armR.rotation.set(-1.25, 0, -0.25); u.armL.rotation.set(-1.4, 0, 0.55); if (u.rifle) { u.rifle.visible = true; u.rifle.position.set(0.05, 0.42, 0.32); } }
  else { u.armL.rotation.set(-Math.sin(ph) * 0.4 * am + (p.armL ?? 0), 0, 0.08); u.armR.rotation.set(Math.sin(ph) * 0.4 * am + (p.armR ?? 0), 0, -0.08); if (u.rifle) u.rifle.visible = false; }
}
function putf(f, x, y, z, ry = 0) { f.visible = true; f.position.set(x, y, z); f.rotation.set(0, ry, 0); }
const SEALS = Array.from({ length: 10 }, (_, i) => figure('seal', i));
const SUITS = Array.from({ length: 9 }, (_, i) => figure('suit', 20 + i));
const CIVS = Array.from({ length: 6 }, (_, i) => figure('civ', 40 + i));
const TALL = figure('civ', 99); TALL.scale.set(1, 1.1, 1);

// ---------- interiors (built far below the terrain so nothing outside leaks in) ----------
const IY = -600;
function room(cx, cz, w, d, h, wallM, floorM, ceilM) { const g = new THREE.Group(); g.position.set(cx, IY, cz); scene.add(g);
  g.add(box(w, 0.1, d, floorM, 0, -0.05, 0), box(w, 0.1, d, ceilM, 0, h + 0.05, 0), box(w, h, 0.1, wallM, 0, h / 2, -d / 2), box(w, h, 0.1, wallM, 0, h / 2, d / 2), box(0.1, h, d, wallM, -w / 2, h / 2, 0), box(0.1, h, d, wallM, w / 2, h / 2, 0)); return g; }
const woodT = canvasTex(512, 512, speckle('#5a3a24', ['#4a2e1c', '#6a4630', '#3e2618'], 1200, (x, w, h, r) => { x.strokeStyle = 'rgba(30,18,10,0.4)'; for (let i = 0; i < 60; i++) { x.lineWidth = 1 + r() * 2; x.beginPath(); const y = r() * h; x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + r() * 8, w * 0.6, y - r() * 8, w, y + r() * 4); x.stroke(); } }), 2, 2);
const carpetT = canvasTex(256, 256, speckle('#2e3446', ['#262c3c', '#363c50'], 3000), 6, 6);
const paperM = (draw) => S(0xffffff, { map: textTex(512, 660, draw), roughness: 0.9 });
const redact = (x, w, r, y0, n) => { x.fillStyle = '#1a1a1a'; for (let i = 0; i < n; i++) { const y = y0 + i * 26; x.fillStyle = r() > 0.6 ? '#141414' : '#7a7a7a'; x.fillRect(48, y, (w - 96) * (0.4 + r() * 0.6), r() > 0.6 ? 14 : 4); } };
const docTop = (title) => (x, w, h) => { const r = RNG(title.length * 7); x.fillStyle = '#efe9da'; x.fillRect(0, 0, w, h); x.fillStyle = '#9a1a1a'; x.font = '600 26px Poppins'; x.textAlign = 'center'; x.fillText('SECRET // EYES ONLY', w / 2, 40); x.fillText('SECRET // EYES ONLY', w / 2, h - 22);
  x.fillStyle = '#1a1a1a'; x.font = '600 30px Poppins'; x.fillText(title, w / 2, 110); x.textAlign = 'left'; redact(x, w, r, 150, 18); };
// OFFICE (CIA): desk, lamp, cork board with photos and string
const OFFICE = new THREE.Vector3(0, IY, 0);
const office = room(0, 0, 9, 7, 3.0, S(0x6a6458), S(0xffffff, { map: carpetT }), S(0xd8d4cc)); office.visible = false;
office.add(box(2.8, 0.08, 1.4, S(0xffffff, { map: woodT, roughness: 0.6 }), 0, 0.78, 0.6), box(2.7, 0.74, 1.3, S(0x3a2a1c), 0, 0.37, 0.6));
const lampO = new THREE.PointLight(0xffd8a0, 0, 7, 1.6); lampO.position.set(-1.0, 1.5, 0.4); lampO.castShadow = false; office.add(lampO, cyl(0.04, 0.04, 0.5, S(0x2a2a2a, { metalness: 0.6 }), -1.0, 1.07, 0.3, 8), cyl(0.18, 0.08, 0.2, S(0x2a4a2a, { metalness: 0.3 }), -1.0, 1.35, 0.4, 16));
const docs = [['ABU AHMED AL-KUWAITI'], ['COURIER NETWORK'], ['ABBOTTABAD COMPOUND'], ['COURSES OF ACTION']].map(([t], i) => { const m = mesh(new THREE.PlaneGeometry(0.42, 0.54).rotateX(-Math.PI / 2), paperM(docTop(t)), -0.6 + i * 0.5, 0.825 + i * 0.002, 0.65 + (i % 2) * 0.12, false); m.rotation.y = (i - 1.5) * 0.12; office.add(m); return m; });
const board = box(4.2, 2.0, 0.06, S(0xa8865a, { roughness: 1 }), 0, 1.7, -3.42); office.add(board);
const satRT = new THREE.WebGLRenderTarget(768, 768); satRT.texture.colorSpace = THREE.SRGBColorSpace;
const mapTex = textTex(800, 600, (x, w, h) => { x.fillStyle = '#d8d2b8'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8c8d0'; x.fillRect(0, 0, w, 40); x.strokeStyle = '#7a6a4a'; x.lineWidth = 3; x.setLineDash([12, 8]); x.beginPath(); x.moveTo(60, 120); x.bezierCurveTo(300, 80, 420, 300, 560, 260); x.bezierCurveTo(640, 240, 700, 420, 760, 560); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#2a2a2a'; x.font = '600 26px Poppins'; [['AFGHANISTAN', 120, 300], ['PAKISTAN', 560, 470], ['Jalalabad', 230, 190], ['Peshawar', 470, 230], ['Abbottabad', 640, 160], ['Kabul', 90, 170], ['Islamabad', 600, 320]].forEach(([s, a, b]) => x.fillText(s, a, b)); [[230, 200], [470, 240], [640, 170], [90, 180], [600, 330]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b - 28, 8, 0, 7); x.fill(); }); });
const pin = (tex, x, y, w, h, rot = 0) => { const m = mesh(new THREE.PlaneGeometry(w, h), S(0xffffff, { map: tex, roughness: 0.9 }), x, y, -3.385, false); m.rotation.z = rot; office.add(m); return m; };
const satPhoto = pin(satRT.texture, -1.2, 1.85, 0.9, 0.9, 0.03), mapPhoto = pin(mapTex, 0.6, 1.75, 1.2, 0.9, -0.02);
const silhouette = textTex(300, 380, (x, w, h) => { x.fillStyle = '#c8c4bc'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3a3e'; x.beginPath(); x.arc(w / 2, h * 0.38, w * 0.2, 0, 7); x.fill(); x.fillRect(w * 0.2, h * 0.6, w * 0.6, h * 0.4); x.fillStyle = '#e8e4da'; x.font = '600 150px Poppins'; x.textAlign = 'center'; x.fillText('?', w / 2, h * 0.47); });
const sil1 = pin(silhouette, 1.6, 2.1, 0.45, 0.58, 0.05), sil2 = pin(silhouette, 1.65, 1.25, 0.42, 0.54, -0.04);
office.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-1.2, 1.85, -3.37), new THREE.Vector3(0.1, 1.5, -3.37), new THREE.Vector3(0.6, 1.75, -3.37), new THREE.Vector3(1.6, 2.1, -3.37)]), 30, 0.006, 4), S(0xb01a1a), 0, 0, 0, false));
const blinds = textTex(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a3446'); g.addColorStop(1, '#5a4a40'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(220,200,170,0.85)'; for (let y = 0; y < h; y += 16) x.fillRect(0, y, w, 9); });
office.add(mesh(new THREE.PlaneGeometry(2.2, 1.6), S(0xffffff, { map: blinds, emissive: 0xffffff, emissiveMap: blinds, emissiveIntensity: 0.25 }), 4.44, 1.7, -0.5, false)); office.children[office.children.length - 1].rotation.y = -Math.PI / 2;
const panettaFig = SUITS[8];
// SITUATION ROOM: long table, leather chairs, wall screens showing the drone feed
const sit = room(60, 0, 7.5, 5.2, 2.7, S(0xffffff, { map: woodT, roughness: 0.55 }), S(0xffffff, { map: carpetT }), S(0xcfcac0)); sit.visible = false;
sit.add(box(4.8, 0.08, 1.5, S(0xffffff, { map: woodT, roughness: 0.4 }), 0, 0.76, 0), box(4.6, 0.7, 1.3, S(0x2a1a10), 0, 0.37, 0));
const feedCanvas = document.createElement('canvas'); feedCanvas.width = 512; feedCanvas.height = 288; const feedTex = new THREE.CanvasTexture(feedCanvas); feedTex.colorSpace = THREE.SRGBColorSpace;
const screens = [-1.5, 0, 1.5].map((x, i) => { const s = mesh(new THREE.PlaneGeometry(1.3, 0.75), B(0xffffff, { map: i === 1 ? feedTex : textTex(256, 144, (c, w, h) => { c.fillStyle = '#0a1a2a'; c.fillRect(0, 0, w, h); c.fillStyle = '#4a8ac0'; c.font = '600 18px Poppins'; c.fillText(i ? 'SECURE VTC' : 'MAP', 14, 28); c.strokeStyle = '#3a6a9a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(14, 50 + k * 14); c.lineTo(w - 14 - k * 20, 50 + k * 14); c.stroke(); } }) }), x, 1.75, -2.54, false); sit.add(s, box(1.36, 0.8, 0.04, S(0x111111), x, 1.75, -2.57)); return s; });
const screenLight = new THREE.PointLight(0x8ab0d0, 0, 7, 1.5); screenLight.position.set(0, 1.6, -1.8); sit.add(screenLight);
const sitLight = new THREE.PointLight(0xfff0d8, 0, 9, 1.6); sitLight.position.set(0, 2.5, 0.5); sit.add(sitLight);
const chairs = []; for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, x = -1.8 + Math.floor(i / 2) * 1.2; const c = G(box(0.55, 0.12, 0.55, S(0x1a1a1a, { roughness: 0.5 }), 0, 0.48, 0), box(0.55, 0.65, 0.1, S(0x1a1a1a, { roughness: 0.5 }), 0, 0.85, 0.25 * side)); c.position.set(x, 0, side * 1.05); sit.add(c); chairs.push(c); }
function drawFeed(t, mode = 0) { const x = feedCanvas.getContext('2d'), w = 512, h = 288; x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, w, h); const r = RNG(Math.floor(t * 12));
  x.save(); x.translate(w / 2, h / 2); x.rotate(0.3 + t * 0.01); x.fillStyle = '#5a5a5a'; for (let i = 0; i < 24; i++) x.fillRect(-260 + (i % 6) * 90, -200 + Math.floor(i / 6) * 100, 60, 60);
  x.fillStyle = '#9a9a9a'; x.beginPath(); PLOT.forEach(([a, b], i) => i ? x.lineTo(a * 2.4, b * 2.4) : x.moveTo(a * 2.4, b * 2.4)); x.closePath(); x.fill(); x.fillStyle = '#c8c8c8'; x.fillRect(4 * 2.4, -2, 22 * 2.4, 15 * 2.4); x.fillRect(-30 * 2.4, -20 * 2.4, 13 * 2.4, 8 * 2.4);
  if (mode) { x.fillStyle = '#f0f0f0'; x.save(); x.translate(-22 * 2.4, 8 * 2.4); x.rotate(0.6); x.fillRect(-16, -5, 32, 10); x.fillRect(16, -2, 26, 4); x.restore(); for (let i = 0; i < 6; i++) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(-30 + i * 9 + Math.sin(t * 3 + i) * 3, -20 + Math.cos(t * 2 + i) * 4, 2.5, 0, 7); x.fill(); } }
  x.restore(); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.12})`; x.fillRect(r() * w, r() * h, 1, 1); }
  x.strokeStyle = '#e8e8e8'; x.lineWidth = 2; x.beginPath(); x.moveTo(w / 2 - 40, h / 2); x.lineTo(w / 2 - 12, h / 2); x.moveTo(w / 2 + 12, h / 2); x.lineTo(w / 2 + 40, h / 2); x.moveTo(w / 2, h / 2 - 40); x.lineTo(w / 2, h / 2 - 12); x.moveTo(w / 2, h / 2 + 12); x.lineTo(w / 2, h / 2 + 40); x.stroke();
  x.fillStyle = '#e8e8e8'; x.font = '600 12px Poppins'; x.fillText('WHT  ' + (34.169 + Math.sin(t) * 0.0001).toFixed(4) + 'N  73.242E', 12, 20); x.fillText('ALT 15200', w - 90, 20); feedTex.needsUpdate = true; }
// STAIRWELL (main house, night)
const stairs = room(120, 0, 3.2, 9, 8.5, concM, S(0xa8a090), S(0xb8b0a0)); stairs.visible = false;
for (let i = 0; i < 16; i++) stairs.add(box(1.4, 0.2, 0.32, S(0xb8b0a0), -0.6, 0.1 + i * 0.2, 2.6 - i * 0.32), box(1.4, 0.2 + i * 0.2, 0.32, S(0xb0a898), -0.6, (0.2 + i * 0.2) / 2, 2.6 - i * 0.32));
stairs.add(box(3.2, 0.25, 4.2, S(0xb0a898), 0, 3.3, -2.3), box(1.0, 2.1, 0.08, S(0x2a1e14), 0.9, 4.45, -4.45));
const doorGap = mesh(new THREE.PlaneGeometry(0.9, 2.05), B(0x3a3a3a), 0.9, 4.45, -4.4, false); stairs.add(doorGap);
// INTEL ROOM (computers, drives, papers)
const intel = room(170, 0, 6, 5, 2.9, concM, S(0xa8a090), S(0xb8b0a0)); intel.visible = false;
intel.add(box(2.2, 0.06, 0.8, S(0xffffff, { map: woodT }), -1.2, 0.76, -1.9), box(2.1, 0.72, 0.7, S(0x3a2a1c), -1.2, 0.37, -1.9));
[-1.8, -0.7].forEach(x => intel.add(box(0.45, 0.35, 0.05, S(0x1a1a1a), x, 1.0, -2.1), box(0.2, 0.42, 0.42, S(0xd8d0c0), x + 0.35, 0.21, -1.7)));
for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) intel.add(box(0.18, 0.11, 0.025, S([0x2a2a2a, 0x8a1a1a, 0x1a3a6a][(i + j) % 3]), 1.6 + j * 0.2, 0.9 + i * 0.35, -2.35));
intel.add(box(1.4, 1.6, 0.4, S(0x6a5a44), 2.1, 0.8, -2.25));
const bags = [0, 1, 2].map(i => { const b = mesh(new THREE.SphereGeometry(0.25, 10, 8), S(0x2a2e26), 0.5 + i * 0.4, 0.2, 0.6); b.scale.set(1.2, 0.8, 1); intel.add(b); return b; });
const papers = []; { const r = RNG(8); for (let i = 0; i < 30; i++) { const p = mesh(new THREE.PlaneGeometry(0.22, 0.3).rotateX(-Math.PI / 2), S(0xe8e2d4), (r() - 0.5) * 3, 0.01 + i * 0.001, (r() - 0.5) * 2, false); p.rotation.y = r() * 3; intel.add(p); papers.push(p); } }
const roomLights = [stairs, intel].map(g => { const l = new THREE.PointLight(0xa8c8a8, 0, 8, 1.4); g.add(l); return l; });

// ---------- exterior sets far from the valley ----------
// NEW YORK: skyline at night with two beams of light
const NY = new THREE.Group(); NY.position.set(6000, 0, 0); scene.add(NY); NY.visible = false;
const winT = canvasTex(128, 256, (x, w, h) => { const r = RNG(4); x.fillStyle = '#0a0c12'; x.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 8) for (let k = 4; k < w; k += 8) { const on = r() > 0.55; x.fillStyle = on ? `rgba(255,${200 + r() * 40},${120 + r() * 60},${0.5 + r() * 0.5})` : '#12161e'; x.fillRect(k, y, 5, 5); } }, 1, 1);
NY.add(mesh(new THREE.PlaneGeometry(4000, 1400).rotateX(-Math.PI / 2), S(0x0a1420, { roughness: 0.15, metalness: 0.5 }), 0, 0, 400, false));
{ const r = RNG(3); for (let i = 0; i < 140; i++) { const x = -900 + r() * 1800, z = -200 - r() * 600, w = 20 + r() * 40, h = 40 + r() * r() * 300; const m = box(w, h, w, S(0x0c0e14, { emissive: 0xffffff, emissiveMap: winT, emissiveIntensity: 0.9 }), x, h / 2, z); m.material.map = null; NY.add(m); } }
const beams = [-14, 14].map(x => { const m = mesh(new THREE.CylinderGeometry(9, 4, 4000, 24, 1, true), B(0x9ab8ff, { transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), x, 2000, -380, false); NY.add(m); return m; });
// SEA: the carrier at dawn
const SEA = new THREE.Group(); SEA.position.set(9000, 0, 0); scene.add(SEA); SEA.visible = false;
const oceanGeo = new THREE.PlaneGeometry(3000, 3000, 160, 160).rotateX(-Math.PI / 2), oceanBase = oceanGeo.attributes.position.array.slice();
const ocean = mesh(oceanGeo, S(0x1a3a52, { roughness: 0.25, metalness: 0.3 }), 0, 0, 0, false); SEA.add(ocean);
CVN.position.set(9000, 0, -200); CVN.rotation.y = 0.35;
// WASHINGTON: the White House at night, crowds and flags
const WH = new THREE.Group(); WH.position.set(12000, 0, 0); scene.add(WH); WH.visible = false;
const whiteM = S(0xf2f0ea, { roughness: 0.7 });
WH.add(mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), S(0x2a3a22), 0, 0, 0, false), box(52, 16, 26, whiteM, 0, 8, -60), box(54, 1.2, 28, whiteM, 0, 16.6, -60));
for (let k = -3; k <= 3; k++) WH.add(cyl(0.7, 0.8, 12, whiteM, k * 3.2, 8, -45.5, 14)); WH.add(box(24, 2, 4, whiteM, 0, 15, -45.5), mesh(new THREE.ConeGeometry(14, 4, 3).rotateY(Math.PI / 6), whiteM, 0, 18, -46.5));
for (let r_ = 0; r_ < 2; r_++) for (let k = -7; k <= 7; k++) if (Math.abs(k) > 2) WH.add(box(1.6, 2.6, 0.2, S(0x3a2a1a, { emissive: 0xffc070, emissiveIntensity: 0.8 }), k * 3.4, 4 + r_ * 6, -46.9));
for (let k = -40; k <= 40; k++) WH.add(box(0.06, 2.0, 0.06, S(0x1a1a1a), k * 1.0, 1.0, -20)); WH.add(box(80, 0.08, 0.08, S(0x1a1a1a), 0, 1.9, -20));
const whLight = [-20, 20].map(x => { const l = new THREE.SpotLight(0xffe8c0, 0, 120, 0.6, 0.6, 1); l.position.set(x, 4, -20); l.target.position.set(x * 0.3, 8, -50); WH.add(l, l.target); return l; });
const CROWD = []; { const r = RNG(12); const geoB = new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), geoH = new THREE.SphereGeometry(0.13, 10, 8);
  const bodies = new THREE.InstancedMesh(geoB, S(0xffffff, { roughness: 0.8 }), 420), heads = new THREE.InstancedMesh(geoH, S(0x8a6a58), 420); const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < 420; i++) { const x = (r() - 0.5) * 70, z = -16 + r() * 30; CROWD.push({ x, z, ph: r() * 6, h: 1.0 + r() * 0.2 }); m.makeTranslation(x, 0.75, z); bodies.setMatrixAt(i, m); bodies.setColorAt(i, c.setHSL(r(), 0.3, 0.15 + r() * 0.3)); m.makeTranslation(x, 1.55, z); heads.setMatrixAt(i, m); }
  WH.add(bodies, heads); WH.userData = { bodies, heads }; }
const flagT = canvasTex(192, 100, (x, w, h) => { for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#f4f4f4' : '#b8202a'; x.fillRect(0, i * h / 13, w, h / 13 + 1); } x.fillStyle = '#1c2a6a'; x.fillRect(0, 0, w * 0.42, h * 7 / 13); x.fillStyle = '#fff'; for (let i = 0; i < 30; i++) x.fillRect(6 + (i % 6) * 13, 5 + Math.floor(i / 6) * 10, 3, 3); });
const flags = []; { const r = RNG(6); for (let i = 0; i < 26; i++) { const g = new THREE.PlaneGeometry(1.2, 0.65, 8, 1); const f = mesh(g, S(0xffffff, { map: flagT, side: THREE.DoubleSide, roughness: 0.8 }), (r() - 0.5) * 60, 2.6 + r() * 0.6, -14 + r() * 26, false); f.userData.base = g.attributes.position.array.slice(); f.userData.ph = r() * 6; WH.add(f, cyl(0.015, 0.015, 1.4, S(0x8a7a5a), f.position.x - 0.6, f.position.y - 0.4, f.position.z, 4)); flags.push(f); } }
// PESHAWAR: a crowded street
const PSH = new THREE.Group(); PSH.position.set(15000, 0, 0); scene.add(PSH); PSH.visible = false;
PSH.add(mesh(new THREE.PlaneGeometry(400, 12).rotateX(-Math.PI / 2), S(0xffffff, { map: roadT }), 0, 0.02, 0, false), mesh(new THREE.PlaneGeometry(400, 60).rotateX(-Math.PI / 2), S(0x8a7a64), 0, 0, 0, false));
const signCols = ['#c8302a', '#2a6a3a', '#e8b030', '#2a4a9a', '#e86a2a', '#7a2a6a'];
{ const r = RNG(31); for (let side = -1; side <= 1; side += 2) for (let x = -190; x < 190;) { const w = 6 + r() * 8, h = 7 + r() * 10, d = 8; const bld = box(w, h, d, S(new THREE.Color().setHSL(0.08 + r() * 0.05, 0.2 + r() * 0.15, 0.45 + r() * 0.2).getHex(), { map: plaster }), x + w / 2, h / 2, side * (6 + d / 2 + 2)); PSH.add(bld);
    const sg = mesh(new THREE.PlaneGeometry(w * 0.9, 1.4), S(0xffffff, { map: textTex(256, 64, (c, cw, ch) => { c.fillStyle = signCols[(r() * 6) | 0]; c.fillRect(0, 0, cw, ch); c.fillStyle = '#fff'; c.font = '600 30px Poppins'; c.fillText(['STORE', 'HOTEL', 'MOBILE', 'BANK', 'TEA', 'PHARMACY'][(r() * 6) | 0], 12, 42); }) }), x + w / 2, 4.2, side * 7.9, false); sg.rotation.y = side < 0 ? 0 : Math.PI; PSH.add(sg); x += w + 0.4; } }
for (let i = 0; i < 18; i++) { const a = new THREE.Vector3(-180 + i * 20, 9, -8), b = new THREE.Vector3(-170 + i * 20, 9.5, 8), mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 1.2; PSH.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 8, 0.03, 4), B(0x111111))); }
// NEVADA-STYLE REPLICA: plywood walls on sand, daylight
const REP = new THREE.Group(); REP.position.set(18000, 0, 0); scene.add(REP); REP.visible = false;
const sandT = canvasTex(256, 256, speckle('#c8a878', ['#b89868', '#d8b888', '#a88858'], 4000), 80, 80);
REP.add(mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), S(0xffffff, { map: sandT }), 0, 0, 0, false));
const plyM = S(0xc8a070, { roughness: 0.9 });
PLOT.forEach((p, i) => { const q = PLOT[(i + 1) % 5], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz); const w = box(L, 4.2, 0.12, plyM, (p[0] + q[0]) / 2, 2.1, (p[1] + q[1]) / 2); w.rotation.y = -Math.atan2(dz, dx); REP.add(w); });
REP.add(box(22, 6.4, 15, plyM, 14, 3.2, 10), box(12, 3, 9, plyM, -24, 1.5, -16));
for (let i = 0; i < 6; i++) REP.add(mesh(new THREE.DodecahedronGeometry(60 + i * 15, 1), S(0x9a7a58, { flatShading: true }), -400 + i * 160, -30, -700 - (i % 2) * 120));
// AIRBASE RUNWAY at night (Pakistani jets scramble)
const RWY = new THREE.Group(); RWY.position.set(21000, 0, 0); scene.add(RWY); RWY.visible = false;
RWY.add(mesh(new THREE.PlaneGeometry(3000, 2000).rotateX(-Math.PI / 2), S(0x1a1e18), 0, 0, 0, false), mesh(new THREE.PlaneGeometry(1600, 45).rotateX(-Math.PI / 2), S(0x2a2a2c, { roughness: 0.6 }), 0, 0.02, 0, false));
for (let k = -40; k <= 40; k++) [-23, 23].forEach(z => RWY.add(glow(k % 5 ? 0xfff0c0 : 0xff8040, 1.6, k * 20, 0.4, z, 0.9)));

// ---------- extra props: route line, night lights in town, smoke, flashes, lasers, TV ----------
const ROUTE = new THREE.CatmullRomCurve3((() => { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, x = lerp(JAL.x, 0, t), z = lerp(JAL.y, 0, t) + Math.sin(t * 6) * 120 * (1 - t * 0.3); pts.push(new THREE.Vector3(x, Math.max(terrainH(x, z), 0) + 70, z)); } return pts; })());
const routeTube = mesh(new THREE.TubeGeometry(ROUTE, 400, 6, 6), B(0xffc040, { fog: false, transparent: true, opacity: 0.95, depthTest: false }), 0, 0, 0, false); routeTube.renderOrder = 6; routeTube.visible = false; scene.add(routeTube);
const routeIdx = routeTube.geometry.index.count;
const markers = [JAL, new THREE.Vector2(0, 0)].map(p => { const g = glow(0xffd070, 140, p.x, terrainH(p.x, p.y) + 90, p.y, 1); g.material.depthTest = false; g.material.fog = false; g.visible = false; scene.add(g); return g; });
const townLights = new THREE.Group(); scene.add(townLights);
{ const r = RNG(44); HOUSES.forEach((h, i) => { if (r() > 0.32) return; const s = glow(r() > 0.3 ? 0xffc880 : 0xc8e0ff, 3 + r() * 3, h.x + (r() - 0.5) * 4, terrainH(h.x, h.z) + 2 + r() * 4, h.z + (r() - 0.5) * 4, 0.9); townLights.add(s); }); for (let i = -12; i <= 12; i++) townLights.add(glow(0xffb060, 6, i * 22, 9.4, -66, 0.8)); }
const puffs = Array.from({ length: 30 }, () => puff(0xb8b0a8, 0.5));
const flashL = new THREE.PointLight(0xffe0b0, 0, 40, 1.4); scene.add(flashL);
const fireL = new THREE.PointLight(0xff8a3a, 0, 60, 1.3); scene.add(fireL);
const fireGlows = Array.from({ length: 8 }, () => { const g = glow(0xff9a40, 6, 0, 0, 0, 0.9); g.visible = false; scene.add(g); return g; });
const lasers = Array.from({ length: 4 }, () => { const m = mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4).translate(0, 0.5, 0).rotateX(Math.PI / 2), B(0xffffff, { transparent: true, opacity: 0.9, fog: false }), 0, 0, 0, false); m.visible = false; scene.add(m); return m; });
const tvCanvas = document.createElement('canvas'); tvCanvas.width = 256; tvCanvas.height = 192; const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace;
const tv = G(box(0.9, 0.7, 0.6, S(0x2a2a2a), 0, 0, 0), mesh(new THREE.PlaneGeometry(0.72, 0.54), B(0xffffff, { map: tvTex }), 0, 0, 0.301, false)); tv.position.set(3.2, 1.25, -3.0); tv.rotation.y = -0.5; office.add(tv, box(1.1, 0.9, 0.7, S(0x3a2a1c), 3.2, 0.45, -3.0));
const tvLight = new THREE.PointLight(0xa8c0ff, 0, 5, 1.5); tvLight.position.set(2.8, 1.3, -2.4); office.add(tvLight);
function drawTV(t) { const x = tvCanvas.getContext('2d'), w = 256, h = 192, r = RNG(Math.floor(t * 20)); x.fillStyle = '#3a4a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8c0a8'; x.fillRect(0, h * 0.62, w, h); x.fillStyle = '#2a2622'; x.beginPath(); x.arc(w * 0.5, h * 0.42, 22, 0, 7); x.fill(); x.fillRect(w * 0.5 - 34, h * 0.52, 68, 70);
  for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.25})`; x.fillRect(r() * w, r() * h, 2, 1); } x.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1); tvTex.needsUpdate = true; }
const vaccDoc = mesh(new THREE.PlaneGeometry(0.42, 0.54).rotateX(-Math.PI / 2), paperM((x, w, h) => { x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a6a8a'; x.fillRect(0, 0, w, 90); x.fillStyle = '#fff'; x.font = '600 34px Poppins'; x.textAlign = 'center'; x.fillText('HEPATITIS B', w / 2, 42); x.fillText('VACCINATION', w / 2, 80);
  x.fillStyle = '#2a2a2a'; x.font = '600 22px Poppins'; x.fillText('FREE · ABBOTTABAD · 2011', w / 2, 140); x.textAlign = 'left'; redact(x, w, RNG(3), 190, 14); }), 0.9, 0.83, 0.5, false); vaccDoc.visible = false; office.add(vaccDoc);

// ---------- post: film / night vision / thermal / satellite ----------
const rtMain = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H) });
const rtA = new THREE.WebGLRenderTarget(W / 4, H / 4, { type: THREE.HalfFloatType }), rtB = rtA.clone();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadScene = new THREE.Scene(); quadScene.add(quad);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb*.227; c += (texture2D(tex, vUv+dir).rgb + texture2D(tex, vUv-dir).rgb)*.195; c += (texture2D(tex, vUv+dir*2.).rgb + texture2D(tex, vUv-dir*2.).rgb)*.122; c += (texture2D(tex, vUv+dir*3.).rgb + texture2D(tex, vUv-dir*3.).rgb)*.054; c += (texture2D(tex, vUv+dir*4.).rgb + texture2D(tex, vUv-dir*4.).rgb)*.016; gl_FragColor = vec4(c, 1.); }' });
const U = { sharp: { value: rtMain.texture }, blur: { value: rtB.texture }, depth: { value: rtMain.depthTexture }, near: { value: 0.1 }, far: { value: 6000 }, focus: { value: 10 }, range: { value: 10 }, maxB: { value: 0 },
  mode: { value: 0 }, expo: { value: 1 }, sat: { value: 0.92 }, tint: { value: new THREE.Vector3(1, 1, 1) }, time: { value: 0 }, grain: { value: 0.05 }, flash: { value: 0 }, track: { value: new THREE.Vector4(0, 0, 0, 0) }, fade: { value: 0 } };
const compMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: `uniform sampler2D sharp, blur, depth; uniform float near, far, focus, range, maxB, mode, expo, sat, time, grain, flash, fade; uniform vec3 tint; uniform vec4 track; varying vec2 vUv;
  float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
  float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  void main(){ vec2 uv = vUv; vec2 px = gl_FragCoord.xy; float n = hash(px + fract(time * 13.7) * 91.7) - .5;
    float z = lin(texture2D(depth, uv).r); float coc = clamp(abs(z - focus) / range - 0.1, 0., 1.) * maxB;
    vec3 sh = texture2D(sharp, uv).rgb, bl = texture2D(blur, uv).rgb; vec3 c = mix(sh, bl, coc); vec3 col;
    if (mode < 0.5) {   // film
      vec2 d = (uv - .5) * 0.0025; c.r = mix(texture2D(sharp, uv + d).r, bl.r, coc); c.b = mix(texture2D(sharp, uv - d).b, bl.b, coc);
      c += max(bl - 0.85, 0.) * 0.8; c *= expo; c = aces(c); float l = luma(c);
      c = mix(c, c * vec3(.9, 1.0, 1.08), 1. - smoothstep(0., .45, l)); c = mix(c, c * vec3(1.06, 1.0, .9), smoothstep(.5, 1., l)); c = mix(vec3(l), c, sat) * tint;
      col = pow(clamp(c, 0., 1.), vec3(1. / 2.2)); col += n * grain; vec2 v = uv - .5; col *= 1. - dot(v, v) * 0.9;
    } else if (mode < 1.5) {   // night vision (green phosphor)
      float l = luma(mix(sh, bl, 0.35) * expo); l = 1. - exp(-l * 2.6); l += luma(max(bl * expo - 0.6, 0.)) * 0.8; l = clamp(l + n * 0.22, 0., 1.);
      col = vec3(0.16, 1.0, 0.34) * pow(l, 0.9) + vec3(0.0, 0.05, 0.02); col *= 0.92 + 0.08 * sin(px.y * 1.6); vec2 v = (uv - .5) * vec2(1.6, 1.); col *= smoothstep(0.98, 0.55, length(v));
    } else if (mode < 2.5) {   // thermal drone feed (white-hot)
      float l = luma(mix(sh, bl, 0.4) * expo); l = pow(clamp(l, 0., 1.), 0.6); l = clamp(l + n * 0.12, 0., 1.); col = vec3(l);
      vec2 cpx = px - vec2(${W / 2}., ${H / 2}.); float cr = (abs(cpx.x) < 1.2 && abs(cpx.y) > 14. && abs(cpx.y) < 60.) || (abs(cpx.y) < 1.2 && abs(cpx.x) > 14. && abs(cpx.x) < 60.) ? 1. : 0.; col = mix(col, vec3(1.), cr * 0.85);
    } else if (mode < 3.5) {   // satellite still
      vec3 s = mix(sh, bl, 0.25) * expo; float l = luma(aces(s)); col = mix(vec3(l), pow(aces(s), vec3(1. / 2.2)), 0.35) * vec3(0.95, 1.0, 1.02); col = pow(col, vec3(0.9)); col += n * 0.06;
      vec2 g = fract(px / 120.); col = mix(col, vec3(0.8, 0.9, 1.0), (step(g.x, 0.008) + step(g.y, 0.008)) * 0.25);
    } else { col = vec3(0.0); }
    if (track.z > 0.) { vec2 a = track.xy - track.zw * .5, b = track.xy + track.zw * .5, q = uv; float L = 0.25; float bx = 0.;
      vec2 e = vec2(1.5 / ${W}., 1.5 / ${H}.); bool inx = q.x > a.x - e.x && q.x < b.x + e.x, iny = q.y > a.y - e.y && q.y < b.y + e.y;
      if (inx && iny) { float dx = min(q.x - a.x, b.x - q.x), dy = min(q.y - a.y, b.y - q.y); bool edgeX = abs(q.x - a.x) < e.x || abs(q.x - b.x) < e.x, edgeY = abs(q.y - a.y) < e.y || abs(q.y - b.y) < e.y;
        if ((edgeX && dy < track.w * L) || (edgeY && dx < track.z * L)) bx = 1.; }
      col = mix(col, vec3(1.0, 0.75, 0.2), bx); }
    col = mix(col, vec3(1.), flash); col *= 1. - fade; gl_FragColor = vec4(clamp(col, 0., 1.), 1.); }` });
function postRender() {
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  quad.material = blurMat; blurMat.uniforms.tex.value = rtMain.texture; blurMat.uniforms.dir.value.set(1.5 / (W / 4), 0); renderer.setRenderTarget(rtA); renderer.render(quadScene, quadCam);
  blurMat.uniforms.tex.value = rtA.texture; blurMat.uniforms.dir.value.set(0, 1.5 / (H / 4)); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
  blurMat.uniforms.tex.value = rtB.texture; blurMat.uniforms.dir.value.set(2.5 / (W / 4), 0); renderer.setRenderTarget(rtA); renderer.render(quadScene, quadCam);
  blurMat.uniforms.tex.value = rtA.texture; blurMat.uniforms.dir.value.set(0, 2.5 / (H / 4)); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
  U.time.value = NOW; quad.material = compMat; renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}

// ---------- moods & staging ----------
const MOOD = {
  day: { sky: 'day', fog: [0xb8c4d0, 0.00032], hemi: [0xdfe8ff, 0x6a5a48, 1.15], sun: [0xfff0dc, 3.2], dir: [-0.5, 0.75, 0.45], stars: 0, expo: 1.0, tint: [1, 1, 1], sat: 0.92 },
  dawn: { sky: 'dawn', fog: [0xc8a898, 0.00045], hemi: [0xe0c8d8, 0x4a3a40, 0.8], sun: [0xffb888, 2.2], dir: [-0.85, 0.22, -0.3], stars: 0, expo: 1.05, tint: [1.04, 0.98, 0.95], sat: 0.95 },
  dusk: { sky: 'dusk', fog: [0x8a7a80, 0.0005], hemi: [0xc0a8c0, 0x3a3038, 0.7], sun: [0xff9a68, 1.8], dir: [0.8, 0.18, -0.4], stars: 0, expo: 1.05, tint: [1.03, 0.98, 0.96], sat: 0.95 },
  overcast: { sky: 'overcast', fog: [0x9aa0a6, 0.0006], hemi: [0xd8dce0, 0x5a5a58, 1.4], sun: [0xe8ecf0, 1.0], dir: [-0.3, 0.9, 0.3], stars: 0, expo: 1.0, tint: [1, 1, 1], sat: 0.8 },
  night: { sky: 'night', fog: [0x060a12, 0.00042], hemi: [0x50628a, 0x10121a, 0.32], sun: [0x9ab0ff, 0.55], dir: [0.3, 0.8, -0.5], stars: 1, expo: 1.35, tint: [0.92, 0.98, 1.1], sat: 0.8 },
  inside: { sky: 'night', fog: [0x000000, 0.0], hemi: [0x8090a8, 0x201810, 0.12], sun: [0xffffff, 0.0], dir: [0, 1, 0], stars: 0, expo: 1.0, tint: [1.03, 1.0, 0.95], sat: 0.9 },
};
let SHADOW = 60;
function mood(k) { const m = MOOD[k]; skyDome.material.map = SKY[m.sky]; scene.fog.color.set(m.fog[0]); scene.fog.density = m.fog[1];
  hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2]; sun.color.set(m.sun[0]); sun.intensity = m.sun[1]; sun.userData.dir = m.dir;
  stars.visible = !!m.stars; moon.visible = !!m.stars; U.expo.value = m.expo; U.tint.value.set(...m.tint); U.sat.value = m.sat; townLights.visible = k === 'night'; }
let LOOK = new THREE.Vector3();
function cam(px, py, pz, tx, ty, tz, fov = 40, hand = 0.6) {
  const s = 0.06 * hand; camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(px + (Math.sin(NOW * 0.9) + Math.sin(NOW * 2.3) * 0.3) * s, py + (Math.sin(NOW * 1.1 + 1) + Math.sin(NOW * 2.9) * 0.3) * s, pz + Math.sin(NOW * 0.7 + 2) * s);
  LOOK.set(tx, ty, tz); camera.lookAt(LOOK); U.focus.value = camera.position.distanceTo(LOOK);
}
const camL = (a, b, u, f = smooth) => { const k = f(u); cam(...a.map((v, i) => lerp(v, b[i] ?? v, k))); };
const shake = (a) => { camera.position.x += Math.sin(NOW * 61) * a; camera.position.y += Math.cos(NOW * 73) * a; };
function dof(range, maxB = 1) { U.range.value = range; U.maxB.value = maxB; }
function placeSun() { const d = sun.userData.dir ?? [0, 1, 0], t = LOOK; sun.target.position.copy(t); sun.position.set(t.x + d[0] * 400, t.y + d[1] * 400, t.z + d[2] * 400);
  const c = sun.shadow.camera; c.left = c.bottom = -SHADOW; c.right = c.top = SHADOW; c.near = 10; c.far = 1200; c.updateProjectionMatrix(); }
const SETS = [office, sit, stairs, intel, NY, SEA, WH, PSH, REP, RWY];
function reset() {
  SETS.forEach(s => s.visible = false); terrain.visible = ground.visible = houses.visible = trees.visible = trunks.visible = compound.visible = poles.visible = academy.visible = true; rubble.visible = false;
  [BH1, BH2, CH47, JEEP, B2, DRONE, JET, CVN, ...CARS].forEach(o => o.visible = false); [...SEALS, ...SUITS, ...CIVS, TALL].forEach(f => f.visible = false);
  puffs.forEach(p => p.visible = false); fireGlows.forEach(g => { g.visible = false; g.material.opacity = 0.9; }); lasers.forEach(l => l.visible = false); markers.forEach(m => m.visible = false); routeTube.visible = false;
  outline.material.opacity = 0; neighOutline.material.opacity = 0; flashL.intensity = 0; fireL.intensity = 0; lampO.intensity = 0; tvLight.intensity = 0; sitLight.intensity = 0; screenLight.intensity = 0; roomLights.forEach(l => l.intensity = 0); whLight.forEach(l => l.intensity = 0);
  vaccDoc.visible = false; U.mode.value = 0; U.flash.value = 0; U.track.value.set(0, 0, 0, 0); U.grain.value = 0.045; dof(10, 0); SHADOW = 60; mood('day');
  BH1.rotation.set(0, 0, 0); BH1.userData.body.rotation.set(0, 0, 0);
}
function heli(h, x, y, z, ry = 0, pitch = 0, roll = 0, spin = 1) { h.visible = true; h.position.set(x, y, z); h.rotation.set(0, ry, 0); if (h.userData.body) h.userData.body.rotation.set(roll, 0, pitch); else h.rotation.set(roll, ry, pitch); const u = h.userData; if (u.rotor) { u.rotor.rotation.y = NOW * 28 * spin; u.tr.rotation.z = NOW * 60 * spin; } if (u.r1) { u.r1.rotation.y = NOW * 20; u.r2.rotation.y = -NOW * 20; } }
const routeAt = (t) => ROUTE.getPointAt(clamp(t)), routeDir = (t) => ROUTE.getTangentAt(clamp(t));
function onRoute(h, t, lift = 0, lat = 0) { const p = routeAt(t), d = routeDir(t); const side = new THREE.Vector3(-d.z, 0, d.x).normalize(); const y = Math.max(terrainH(p.x + side.x * lat, p.z + side.z * lat) + 38, p.y - 30) + lift; heli(h, p.x + side.x * lat, y, p.z + side.z * lat, Math.atan2(d.z, -d.x) - 0, 0.08, 0); return h.position; }
function dust(cx, cz, t, n = 16, r0 = 6, op = 0.5, col = 0xb8a890) { for (let i = 0; i < n; i++) { const p = puffs[i], k = (t * 0.5 + i / n) % 1, a = i * 2.39; p.visible = true; p.material.color.set(col); p.material.opacity = op * (1 - k); p.scale.setScalar(3 + k * 10); p.position.set(cx + Math.cos(a) * (r0 + k * 14), 2.5 + k * 3, cz + Math.sin(a) * (r0 + k * 14)); } }
function smokeCol(cx, cy, cz, t, n = 10, op = 0.45, col = 0x9a948c, rise = 30, from = 0) { for (let i = 0; i < n; i++) { const p = puffs[from + i], k = (t * 0.12 + i / n) % 1; p.visible = true; p.material.color.set(col); p.material.opacity = op * Math.sin(k * Math.PI); p.scale.setScalar(4 + k * 18); p.position.set(cx + Math.sin(i * 2.1 + t * 0.2) * 3 * k, cy + k * rise, cz + Math.cos(i * 1.7) * 3 * k); } }
function trackObj(o, w = 0.12, h = 0.12) { const v = o.position.clone(); v.y += 1; v.project(camera); U.track.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5, w, h); }
function figWalk(f, a, b, u, t, opts = {}) { const x = lerp(a[0], b[0], clamp(u)), z = lerp(a[2], b[2], clamp(u)), y = lerp(a[1], b[1], clamp(u)); putf(f, x, y, z, Math.atan2(b[0] - a[0], b[2] - a[2])); posef(f, { walk: u > 0 && u < 1 ? t * (opts.pace ?? 8) : undefined, amp: opts.amp ?? 1, aim: opts.aim, crouch: opts.crouch }); }
const OF = (x, y, z) => [x, IY + y, z], SR = (x, y, z) => [60 + x, IY + y, z];

// ---------- shots: one per narration beat. t = seconds into the beat, d = its length, l(k)/e(k) = start/end of line k ----------
const SHOT = {
  open1(t, d) { mood('night'); U.mode.value = 1; U.expo.value = 10; const u = 0.55 + t * 0.006, p = onRoute(BH1, u, 0, 0); onRoute(BH2, u - 0.012, 6, 30); SHADOW = 80;
    const dd = routeDir(u); cam(p.x - dd.x * 40 + 26, p.y + 8, p.z - dd.z * 40 + 34, p.x, p.y, p.z, 42, 1.2); dof(200, 0); },
  open2(t, d, l) { mood('night'); U.mode.value = 1; U.expo.value = 10; const u = 0.62 + t * 0.006, p = onRoute(BH1, u, 0, 0); const dd = routeDir(u);
    if (t < l(1)) cam(p.x + dd.x * 6 - 2, p.y + 1.5, p.z + dd.z * 6 + 18, p.x, p.y + 0.5, p.z, 32, 1.2);
    else { const q = routeAt(u - 0.01); cam(q.x, q.y + 20, q.z, 0, 4, 0, 34, 0.8); onRoute(BH2, u - 0.004, 2, 18); } dof(200, 0); },
  open3(t, d) { mood('night'); U.expo.value = 2.6; camL([-260, 160, 220, 0, 4, 0, 26], [-120, 90, 110, 0, 4, 0, 18], t / d, x => x); dof(80, 0.3); },
  title(t, d) { mood('dawn'); camL([-900, 520, 400, -400, 260, -200, 40], [-760, 470, 300, -300, 230, -260, 40], t / d, x => x); },
  ch1: blank, ch2: blank, ch3: blank, ch4: blank, ch5: blank, ch6: blank, ch7: blank, credits: blank,
  nyc(t, d) { mood('night'); terrain.visible = false; NY.visible = true; U.expo.value = 1.6; beams.forEach(b => b.material.opacity = 0.1 + 0.02 * Math.sin(NOW * 2)); camL([5600, 30, 900, 6000, 200, -400, 40], [5750, 40, 780, 6000, 260, -400, 40], t / d, x => x); },
  binladen(t, d, l) { mood('inside'); office.visible = true; lampO.intensity = 7; if (t < l(1)) camL(OF(1.5, 1.95, -2.2), OF(1.6, 1.95, -2.7), t / l(1)); else camL(OF(0.4, 1.8, -2.4), OF(0.2, 1.75, -2.8), seg(t, l(1), d));
    const a = camera.position; cam(a.x, a.y, a.z, t < l(1) ? 1.6 : 0.4, IY + (t < l(1) ? 1.7 : 1.55), -3.4, 34, 0.3); dof(0.6, 1); },
  torabora(t, d, l) { mood('dusk'); const c = TORA; camL([c.x + 900, 560, c.y + 700, c.x, 260, c.y, 34], [c.x + 760, 520, c.y + 560, c.x, 240, c.y, 34], t / d, x => x);
    [l(0) + 3.0, l(0) + 4.4].forEach((tt, i) => { const k = t - tt; if (k > 0) { const x = c.x + 60 - i * 140, z = c.y + 80 + i * 90, y = terrainH(x, z); if (k < 0.5) { flashL.position.set(x, y + 30, z); flashL.intensity = 4e5 * (1 - k / 0.5); flashL.distance = 900; } smokeCol(x, y + 10, z, t, 8, 0.55 * (1 - seg(t, d - 1, d)), 0x6a6460, 140, i * 10); } });
    U.expo.value = lerp(1.05, 0.7, seg(t, l(1), d)); },
  decade(t, d, l) { if (t < l(2)) { mood('overcast'); camL([-600, 420, 900, -900, 200, -300, 46], [-800, 380, 820, -1000, 180, -400, 46], t / l(2), x => x); }
    else { mood('inside'); office.visible = true; tvLight.intensity = 3; drawTV(t); camL(OF(1.9, 1.35, -1.9), OF(2.3, 1.3, -2.3), seg(t, l(2), d)); const a = camera.position; cam(a.x, a.y, a.z, 3.2, IY + 1.25, -3.0, 34, 0.2); dof(0.5, 1); } },
  courier1(t, d, l) { mood('inside'); office.visible = true; lampO.intensity = 7; if (t < l(1)) camL(OF(-0.9, 1.7, 1.6), OF(-0.2, 1.55, 1.4), t / l(1)); else camL(OF(-0.5, 1.25, 1.25), OF(0.1, 1.15, 1.1), seg(t, l(1), d));
    const a = camera.position; cam(a.x, a.y, a.z, t < l(1) ? -0.1 : 0.2, IY + 0.82, 0.7, 36, 0.25); dof(0.5, 1); },
  courier2(t, d, l) { mood('inside'); office.visible = true; lampO.intensity = 7; if (t < l(1)) { camL(OF(-0.6, 1.25, 1.0), OF(-0.6, 1.1, 0.9), t / l(1)); const a = camera.position; cam(a.x, a.y, a.z, -0.6, IY + 0.82, 0.62, 30, 0.2); }
    else { camL(OF(0.9, 1.9, -2.0), OF(1.2, 1.85, -2.4), seg(t, l(1), d)); const a = camera.position; cam(a.x, a.y, a.z, 1.6, IY + 1.75, -3.4, 34, 0.2); } dof(0.8, 1); },
  jeep(t, d) { mood('day'); terrain.visible = false; PSH.visible = true; const X0 = 15000; JEEP.visible = true; JEEP.position.set(X0 + 60 - t * 9, 0, -2.2); JEEP.rotation.y = 0;
    CARS.forEach((c, i) => { c.visible = true; c.position.set(X0 + 20 + i * 14 - t * (6 + (i % 3)), 0, i % 2 ? -2.6 : 2.6); c.rotation.y = i % 2 ? 0 : Math.PI; });
    for (let i = 0; i < 6; i++) { putf(CIVS[i], X0 + 10 + i * 9 - t * (i % 2 ? 1 : -1), 0, i % 2 ? 7 : -7, i % 2 ? -Math.PI / 2 : Math.PI / 2); posef(CIVS[i], { walk: t * 6 + i, amp: 0.9 }); }
    const jx = JEEP.position.x; cam(jx + 30, 34, 26, jx, 0.8, -2.2, 30, 0.5); trackObj(JEEP, 0.16, 0.16); U.sat.value = 0.75; },
  abbottabad(t, d, l) { mood('day'); if (t < l(1) - 0.2) camL([380, 260, 520, 60, 10, -40, 40], [260, 200, 420, 40, 10, -40, 40], t / l(1), x => x);
    else { const k = seg(t, l(1), d - 0.5); JEEP.visible = true; const x = lerp(-120, -42, smooth(k)); JEEP.position.set(x, 2.05, -62 + 0 * k); JEEP.rotation.y = 0; if (k > 0.8) { JEEP.position.set(-42, 2.05, lerp(-62, -12, seg(k, 0.8, 1))); JEEP.rotation.y = -Math.PI / 2; }
      cam(-70, 44, -120, JEEP.position.x, 2, JEEP.position.z, 30, 0.4); } },
  walls(t, d) { mood('day'); const a = 0.5 + t * 0.05; camL([Math.cos(a) * 180, 120, Math.sin(a) * 180, 0, 2, 0, 34], [Math.cos(a) * 150, 100, Math.sin(a) * 150, 0, 2, 0, 34], t / d, x => x);
    outline.material.opacity = smooth(seg(t, 0.4, 1.4)) * (0.8 + 0.2 * Math.sin(NOW * 4)); neighOutline.material.opacity = smooth(seg(t, 1.5, 2.5)) * 0.9; },
  house(t, d) { mood('day'); const a = 1.4 + t * 0.04; cam(14 + Math.cos(a) * 46, 22 - t * 0.4, 10 + Math.sin(a) * 46, 12, 9, 8, 30, 0.4); dof(60, 0.2); },
  trash(t, d, l) { mood('day'); if (t < l(1) - 0.2) camL([-120, 4, -72, 40, 8, -66, 34], [-90, 4, -72, 60, 8, -66, 34], t / l(1));
    else { camL([-30, 12, -60, -4, 4, -22, 34], [-24, 10, -52, -4, 4, -22, 34], seg(t, l(1), d)); smokeCol(-4, 3.2, -22, t, 10, 0.5, 0xa8a49c, 22); fireGlows[0].visible = true; fireGlows[0].position.set(-4, 3.0, -22); fireGlows[0].scale.setScalar(1.2 + 0.3 * Math.sin(NOW * 20)); } },
  pacer(t, d, l) { mood('day'); U.mode.value = 3; const a = t * 0.45; putf(TALL, 20 + Math.cos(a) * 4, 2, -16 + Math.sin(a) * 3, a + Math.PI); posef(TALL, { walk: t * 6 }); camL([12, 160, -10, 12, 0, -12, 34], [18, 70, -15, 18, 0, -15.5, 22], t / d); camera.up.set(0, 0, -1); camera.lookAt(LOOK); },
  dna(t, d, l) { mood('inside'); office.visible = true; lampO.intensity = 7; vaccDoc.visible = true; if (t < l(1)) camL(OF(0.9, 1.35, 1.3), OF(0.9, 1.2, 1.0), t / l(1)); else camL(OF(1.4, 1.9, -2.2), OF(1.55, 1.75, -2.6), seg(t, l(1), d));
    const a = camera.position; cam(a.x, a.y, a.z, t < l(1) ? 0.9 : 1.62, IY + (t < l(1) ? 0.83 : 1.68), t < l(1) ? 0.5 : -3.4, 34, 0.2); dof(0.5, 1); },
  panetta(t, d, l) { mood('inside'); office.visible = true; lampO.intensity = 5; putf(panettaFig, 3.6, IY, -0.5, -Math.PI / 2 + 0.3); posef(panettaFig, { aim: 0 }); if (t < l(1)) camL(OF(-2.5, 1.6, 2.8), OF(-1.8, 1.6, 2.3), t / l(1));
    else camL(OF(-0.4, 1.3, 1.3), OF(-0.2, 1.2, 1.1), seg(t, l(1), d)); const a = camera.position; cam(a.x, a.y, a.z, t < l(1) ? 3.0 : 0.4, IY + (t < l(1) ? 1.4 : 0.83), t < l(1) ? -0.4 : 0.66, 36, 0.3); dof(t < l(1) ? 2 : 0.5, 1); },
  options(t, d, l) { if (t < l(1) - 0.2) { mood('dusk'); B2.visible = true; const x = -300 + t * 60; B2.position.set(x, 520, 200); B2.rotation.set(0, Math.PI / 2, 0); cam(x - 160, 470, 320, x, 520, 200, 30, 0.4); }
    else if (t < l(2) - 0.2) { mood('night'); U.expo.value = 2.2; DRONE.visible = true; const k = t - l(1); DRONE.position.set(-200 + k * 25, 380, 100); DRONE.rotation.y = Math.PI; cam(DRONE.position.x - 30, 376, 130, DRONE.position.x, 380, 100, 28, 0.3); }
    else if (t < l(3) - 0.2) { mood('dusk'); const u = 0.4 + (t - l(2)) * 0.008, p = onRoute(BH1, u, 10, 0); onRoute(BH2, u - 0.01, 14, 30); const dd = routeDir(u); cam(p.x - dd.x * 50 + 30, p.y + 10, p.z - dd.z * 50 + 40, p.x, p.y, p.z, 36, 0.8); }
    else { mood('inside'); office.visible = true; lampO.intensity = 6; camL(OF(0.3, 1.9, -2.0), OF(0.5, 1.8, -2.5), seg(t, l(3), d)); const a = camera.position; cam(a.x, a.y, a.z, 0.6, IY + 1.75, -3.4, 30, 0.2); dof(0.5, 1); } },
  replica(t, d, l) { if (t < l(1) - 0.2) { mood('day'); terrain.visible = false; REP.visible = true; const X0 = 18000; heli(BH1, X0 - 22, 14 - 2 * Math.sin(t * 0.5), 8, 0.6, 0, 0.03);
      SEALS.slice(0, 6).forEach((f, i) => { const u = seg(t, 1 + i * 0.3, 5 + i * 0.3); figWalk(f, [X0 - 60, 0, -40 + i * 2], [X0 - 36, 0, -2 + i * 1.2], u, t, { pace: 10, aim: 1 }); });
      dust(X0 - 22, 8, t, 12, 4, 0.35, 0xc8a878); camL([X0 - 90, 18, -70, X0 - 30, 4, -10, 38], [X0 - 80, 16, -60, X0 - 28, 4, -6, 38], t / l(1)); }
    else { mood('inside'); office.visible = true; lampO.intensity = 5; hemi.intensity = 0.6; camL(OF(-1.6, 1.4, 2.2), OF(-0.6, 1.3, 1.6), seg(t, l(1), d)); const a = camera.position; cam(a.x, a.y, a.z, 4.4, IY + 1.6, -0.5, 36, 0.2); dof(1.5, 0.6); } },
  takeoff(t, d, l) { if (t < l(1) - 0.2) { mood('night'); terrain.visible = false; RWY.visible = true; U.mode.value = 1; U.expo.value = 10; const X0 = 21000, up = smooth(seg(t, 2, 10));
      heli(BH1, X0, 1.4 + up * 30, 60, 0.3, -0.05 * up); heli(BH2, X0 + 40, 1.4 + smooth(seg(t, 3.5, 11)) * 30, 75, 0.3, -0.05 * up); dust(X0, 60, t, 10, 4, 0.14 * (1 - up), 0x6a6a60); cam(X0 - 70, 6, 140, X0 + 20, 6 + up * 20, 65, 40, 0.6); }
    else if (t < l(2) - 0.2) { mood('night'); U.mode.value = 1; U.expo.value = 10; const u = 0.2 + (t - l(1)) * 0.01, p = onRoute(BH1, u, 0, 0); onRoute(BH2, u - 0.01, 5, 25); const dd = routeDir(u); cam(p.x + dd.x * 70 + 20, p.y + 4, p.z + dd.z * 70 - 30, p.x, p.y, p.z, 36, 1); }
    else { mood('night'); U.expo.value = 2.6; routeTube.visible = true; markers.forEach(m => m.visible = true); const k = smooth(seg(t, l(2), d - 0.3)); routeTube.geometry.setDrawRange(0, Math.floor(routeIdx * k / 6) * 6); cam(-1000, 2600, 1300, -1100, 0, 100, 40, 0.2); } },
  sitroom(t, d) { mood('inside'); sit.visible = true; sitLight.intensity = 2.5; screenLight.intensity = 4; drawFeed(t);
    SUITS.slice(0, 8).forEach((f, i) => { const c = chairs[i]; putf(f, 60 + c.position.x, IY, c.position.z, i % 2 ? Math.PI : 0); posef(f, { sit: 1, aim: 0, armL: -0.9, armR: -0.9, look: (i % 2 ? 1 : -1) * 0.5 }); });
    camL(SR(2.6, 1.7, 2.2), SR(1.8, 1.6, 1.6), t / d); const a = camera.position; cam(a.x, a.y, a.z, 60 - 0.4, IY + 1.4, -1.4, 40, 0.3); dof(2.5, 0.6); },
  arrive(t, d, l) { mood('night'); U.mode.value = 1; U.expo.value = 10; SHADOW = 40; const k = t - l(1), hx = -20, hz = 8;
    if (t < l(1) + 3.6) { const y = t < l(1) + 1.0 ? 14 + Math.sin(t * 1.3) * 0.6 : lerp(14, 9, seg(t, l(1) + 1.0, l(1) + 3.6)); heli(BH1, hx, y, hz, 0.7, 0.03 * Math.sin(t * 2.3), 0.06 * Math.sin(t * 1.7) + (t > l(1) ? 0.1 * Math.sin(t * 4) : 0)); }
    else { const c = smooth(seg(t, l(1) + 3.6, l(1) + 4.3)); heli(BH1, hx, lerp(9, 3.4, c), hz, 0.7, lerp(0, -0.14, c), lerp(0, 0.1, c), 1 - 0.6 * seg(t, l(1) + 4.3, d)); if (k > 4.2 && k < 4.6) shake(0.4); }
    dust(hx, hz, t, 18, 6, 0.18, 0x6a6a60); cam(-66, 3.2, 40, hx, 9, hz, 44, 1.0); dof(100, 0); },
  second(t, d, l) { if (t < l(2) - 0.2) { mood('night'); U.mode.value = 1; U.expo.value = 10; heli(BH1, -20, 3.4, 8, 0.7, -0.14, 0.1, 0.3); heli(BH2, -10, 2 + 16 * (1 - smooth(seg(t, 0, 3.5))), 48, -0.4, 0.04);
      SEALS.slice(0, 6).forEach((f, i) => { const u = seg(t, 4 + i * 0.25, 9 + i * 0.25); figWalk(f, [-10 + (i % 3) * 1.5, 2, 46 + Math.floor(i / 3)], [-2 + (i % 3) * 1.2, 2, 33 + Math.floor(i / 3) * 1.2], u, t, { pace: 10, aim: 1 }); });
      dust(-10, 48, t, 14, 5, 0.16 * (1 - seg(t, 5, 9)), 0x6a6a60); cam(28, 8, 78, -6, 4, 36, 36, 0.9); }
    else { mood('night'); U.mode.value = 2; U.expo.value = 2.6; heli(BH1, -20, 3.4, 8, 0.7, -0.14, 0.1, 0); heli(BH2, -10, 2, 48, -0.4, 0, 0, 1);
      SEALS.forEach((f, i) => { const a = (i / 10) * Math.PI * 2; putf(f, 6 + Math.cos(a) * (6 + i % 3) + Math.sin(t + i) * 0.5, 2, 6 + Math.sin(a) * 5, a); posef(f, { aim: 1 }); });
      camL([0, 260, 0.1, 0, 0, 0, 24], [0, 240, 0.1, 0, 0, 0, 22], seg(t, l(2), d)); camera.up.set(0, 0, -1); camera.lookAt(LOOK); } },
  breach(t, d, l) { mood('night'); U.mode.value = 1; U.expo.value = 10; SHADOW = 30; const bt = l(0) + 1.6, st = l(0) + 4.6;
    SEALS.slice(0, 5).forEach((f, i) => { putf(f, -24.0 + i * 0.7, 2, -21.6 - (i % 2) * 0.6, Math.PI * 0.08); posef(f, { aim: 1, crouch: 0.4 }); });
    if (t > bt && t < bt + 0.45) { const k = (t - bt) / 0.45; flashL.position.set(-24, 4, -22); flashL.intensity = 2000 * (1 - k); U.flash.value = 0.6 * (1 - k); }
    if (t > bt) smokeCol(-24, 3, -21, t - bt, 8, 0.16 * (1 - seg(t, bt + 3, bt + 6)), 0x5a5650, 10);
    if (t > st && t < st + 0.6) { flashL.position.set(-21, 3.5, -20); flashL.intensity = Math.sin((t - st) * 60) > 0 ? 300 : 0; }
    if (t > l(1)) { const k = t - l(1); if (k > 1.0 && k < 1.5) { flashL.position.set(16, 4, 4); flashL.intensity = Math.sin(k * 55) > 0 ? 400 : 0; } }
    if (t < l(1)) camL([-31, 3.0, -24.5, -21, 3.0, -20.5, 44], [-30, 3.0, -24.8, -21, 3.0, -20.5, 44], t / l(1)); else camL([-6, 3.5, -16, 12, 4, 2, 40], [-4, 3.5, -12, 12, 4, 2, 40], seg(t, l(1), d)); dof(100, 0); },
  stairs(t, d, l) { mood('inside'); stairs.visible = true; U.mode.value = 1; U.expo.value = 6; roomLights[0].intensity = 0.6; roomLights[0].position.set(0, 4, 0);
    if (t < l(1)) { SEALS.slice(0, 3).forEach((f, i) => { const u = seg(t, 0.5 + i * 0.6, 7 + i * 0.6), s = clamp(u * 16); const y = s * 0.2, z = 2.6 - s * 0.32 + 0.5; putf(f, 120 - 0.6 + (i - 1) * 0.25, IY + y, z + i * 0.7, Math.PI); posef(f, { aim: 1, walk: t * 7, amp: 0.6 }); });
      SEALS.slice(0, 3).forEach((f, i) => { const L = lasers[i]; L.visible = true; L.position.set(f.position.x + 0.05, f.position.y + 1.3, f.position.z - 0.5); L.lookAt(f.position.x + (i - 1) * 0.3, f.position.y + 2.6, f.position.z - 6); L.scale.z = 6; });
      const sh = l(0) + 6.7; if (t > sh && t < sh + 0.5) U.flash.value = Math.sin((t - sh) * 50) > 0 ? 0.4 : 0;
      camL(SR(60 + 0.7, 0.9, 4.2), SR(60 + 0.6, 1.4, 3.9), t / l(1)); const a = camera.position; cam(a.x, a.y, a.z, 120 - 0.6, IY + 2.8, 0, 46, 1.0); }
    else { putf(TALL, 120 + 0.9, IY + 3.42, -4.3, 0); posef(TALL, { aim: 0, look: 0.3 }); TALL.visible = t < l(1) + 2.2; const L = lasers[0]; L.visible = true; L.position.set(120 - 0.4, IY + 3.0, 0.6); L.lookAt(120 + 0.9, IY + 4.4, -4.3); L.scale.z = 5.2;
      camL(SR(60 - 0.6, 3.1, 1.2), SR(60 - 0.5, 3.2, 0.6), seg(t, l(1), d)); const a = camera.position; cam(a.x, a.y, a.z, 120 + 0.9, IY + 4.3, -4.4, 40, 1.0);
      const sh = l(1) + 4.5; if (t > sh && t < sh + 0.5) U.flash.value = Math.sin((t - sh) * 50) > 0 ? 0.4 : 0; } dof(10, 0); },
  geronimo(t, d, l) { mood('inside'); sit.visible = true; sitLight.intensity = 2.0; screenLight.intensity = 4; drawFeed(t, 1);
    SUITS.slice(0, 8).forEach((f, i) => { const c = chairs[i]; putf(f, 60 + c.position.x, IY, c.position.z, i % 2 ? Math.PI : 0); posef(f, { sit: 1, aim: 0, armL: -0.9, armR: -0.9, look: (i % 2 ? 1 : -1) * 0.5, nod: t > l(2) ? 0.15 : 0 }); });
    if (t < l(1)) { camL(SR(0.3, 1.6, -0.6), SR(0.1, 1.65, -1.3), t / l(1)); const a = camera.position; cam(a.x, a.y, a.z, 60, IY + 1.75, -2.55, 34, 0.3); }
    else if (t < l(2)) { camL(SR(-2.6, 1.4, 1.8), SR(-2.2, 1.4, 1.5), seg(t, l(1), l(2))); const a = camera.position; cam(a.x, a.y, a.z, 60, IY + 1.2, 0, 38, 0.2); }
    else { camL(SR(3.0, 1.5, 0.3), SR(2.4, 1.45, 0.2), seg(t, l(2), d)); const a = camera.position; cam(a.x, a.y, a.z, 60 - 1.0, IY + 1.2, 0, 34, 0.15); } dof(1.5, 0.8); },
  intel(t, d) { mood('inside'); intel.visible = true; U.mode.value = 1; U.expo.value = 6; roomLights[1].intensity = 0.8; roomLights[1].position.set(170, IY + 2.4, 0);
    SEALS.slice(0, 3).forEach((f, i) => { putf(f, 170 - 1.4 + i * 1.3, IY, -1.0 + (i % 2) * 0.6, Math.PI + (i - 1) * 0.4); posef(f, { aim: i === 2 ? 1 : 0, crouch: i === 1 ? 0.7 : 0.2, armR: -1.2, armL: -1.0 }); });
    camL([170 + 2.4, IY + 1.7, 2.0, 170 - 0.8, IY + 1.0, -1.6, 44], [170 + 1.8, IY + 1.6, 1.4, 170 - 0.8, IY + 1.0, -1.8, 44], t / d); dof(10, 0); },
  destroy(t, d, l) { if (t < l(1) - 0.2) { mood('night'); U.mode.value = 1; U.expo.value = 10; const xt = l(0) + 3.8; heli(BH1, -20, 3.4, 8, 0.7, -0.14, 0.1, 0); BH1.visible = t < xt + 0.15;
      if (t > xt) { const k = t - xt; flashL.position.set(-20, 6, 8); flashL.intensity = 6000 * Math.exp(-k * 2); U.flash.value = 0.8 * Math.exp(-k * 4); fireGlows.forEach((g, i) => { g.visible = true; g.material.opacity = 0.05; g.position.set(-20 + Math.sin(i * 2.1) * 3, 4 + (i % 3) * 1.5, 8 + Math.cos(i * 1.7) * 3); g.scale.setScalar(4 + Math.sin(NOW * 12 + i)); }); smokeCol(-20, 6, 8, k, 12, 0.07, 0x3a3630, 30); }
      heli(CH47, 10, 2 + 20 * (1 - smooth(seg(t, 0, 4))), 70, -0.3); dust(10, 70, t, 10, 6, 0.14, 0x6a6a60); cam(-80, 12, 60, -14, 6, 30, 40, 0.8); if (t > xt && t < xt + 0.6) shake(0.6); }
    else if (t < l(2) - 0.2) { mood('night'); U.expo.value = 2.2; const tail = BH1.userData; heli(BH1, -20, 3.4, 8, 0.7, -0.14, 0.1, 0); tail.body.children.forEach((c, i) => c.visible = c === tail.boom || i > 2 && i < 5); fireL.position.set(-16, 4, 4); fireL.intensity = 90 + 30 * Math.sin(NOW * 17); smokeCol(-15, 5, 3, t, 10, 0.5, 0x4a4440, 26);
      fireGlows.slice(0, 4).forEach((g, i) => { g.visible = true; g.material.opacity = 0.7; g.position.set(-15 + i * 0.6, 4 + Math.sin(NOW * 9 + i) * 0.3, 3); g.scale.setScalar(2.5 + Math.sin(NOW * 13 + i)); }); cam(-30, 4.5, -6, -15, 4, 3, 34, 0.6); }
    else { mood('night'); terrain.visible = false; RWY.visible = true; U.expo.value = 1.8; const X0 = 21000, k = t - l(2); JET.visible = true; JET.position.set(X0 + 300 - k * k * 14, 1.6 + Math.max(0, k - 4) * 6, 0); JET.rotation.set(0, 0, Math.max(0, k - 4) * 0.12); JET.userData.ab.scale.setScalar(4 + Math.sin(NOW * 40)); cam(X0 + 120, 6, 60, JET.position.x, 2, 0, 34, 0.5); }
    if (t >= l(2) - 0.2 || t < l(1) - 0.2) BH1.userData.body.children.forEach(c => c.visible = true); },
  sea(t, d, l) { mood('dawn'); terrain.visible = false; SEA.visible = true; CVN.visible = true; U.expo.value = 1.1; const p = ocean.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = oceanBase[i * 3], z = oceanBase[i * 3 + 2]; p.array[i * 3 + 1] = Math.sin(x * 0.02 + NOW * 0.8) * 0.8 + Math.sin(z * 0.035 + NOW * 1.1 + x * 0.01) * 0.6 + Math.sin((x + z) * 0.07 + NOW * 1.7) * 0.25; } p.needsUpdate = true; ocean.geometry.computeVertexNormals();
    if (t < l(1)) camL([9000 + 520, 30, 420, 9000, 18, -200, 34], [9000 + 460, 34, 360, 9000, 18, -200, 34], t / l(1), x => x); else camL([9000 - 300, 8, 600, 9000 - 900, 40, -2000, 40], [9000 - 300, 10, 560, 9000 - 900, 60, -2000, 40], seg(t, l(1), d), x => x); },
  crowds(t, d) { mood('night'); terrain.visible = false; WH.visible = true; whLight.forEach(l => l.intensity = 20); U.expo.value = 1.15; const bh = WH.userData.bodies;
    flags.forEach(f => { const p = f.geometry.attributes.position, b = f.userData.base; for (let i = 0; i < p.count; i++) p.array[i * 3 + 2] = b[i * 3 + 2] + Math.sin(b[i * 3] * 4 + NOW * 6 + f.userData.ph) * 0.12 * (b[i * 3] + 0.6); p.needsUpdate = true; f.position.y = 2.6 + Math.abs(Math.sin(NOW * 3 + f.userData.ph)) * 0.4; });
    camL([12000 + 26, 3.0, 30, 12000, 6, -40, 40], [12000 + 14, 3.2, 26, 12000, 7, -40, 40], t / d); dof(40, 0.4); },
  pakistan(t, d, l) { if (t < l(2) - 0.2) { mood('day'); const a = -0.3 + t * 0.012; camL([Math.cos(a) * 700, 320, Math.sin(a) * 700 + 200, 120, 10, -80, 34], [Math.cos(a) * 560, 260, Math.sin(a) * 560 + 160, 120, 10, -80, 34], t / l(2), x => x); }
    else { mood('inside'); office.visible = true; lampO.intensity = 7; camL(OF(0.2, 1.3, 1.4), OF(0.6, 1.15, 1.1), seg(t, l(2), d)); const a = camera.position; cam(a.x, a.y, a.z, 0.6, IY + 0.82, 0.62, 34, 0.2); dof(0.5, 1); } },
  afridi(t, d) { mood('inside'); office.visible = true; lampO.intensity = 5; vaccDoc.visible = true; camL(OF(1.0, 1.9, -1.9), OF(1.5, 1.8, -2.6), t / d); const a = camera.position; cam(a.x, a.y, a.z, 1.65, IY + 1.25, -3.4, 30, 0.2); dof(0.6, 1); },
  demolish(t, d) { mood('overcast'); compound.visible = false; rubble.visible = true; const a = 2.2 + t * 0.04; cam(Math.cos(a) * 90, 50 - t, Math.sin(a) * 90, 0, 2, 0, 34, 0.4); },
  zawahiri(t, d) { mood('dawn'); U.mode.value = 2; U.expo.value = 2.2; const c = HOUSES[40]; cam(c.x + 30 * Math.cos(t * 0.05), 320, c.z + 30 * Math.sin(t * 0.05), c.x, 0, c.z, 10, 0.2); },
  end(t, d, l) { if (t < l(2) - 0.2) { mood('dusk'); camL([400, 180, 600, 0, 10, 0, 40], [700, 420, 1100, 0, 10, 0, 40], t / l(2), x => x); }
    else { mood('dusk'); camL([-52, 15, -50, 6, 6, 4, 32], [-46, 14, -46, 6, 6, 4, 32], seg(t, l(2), d)); U.fade.value = seg(t, d - 1.6, d); } },
};
function blank() { mood('inside'); U.mode.value = 4; cam(0, IY + 50, 0, 0, IY + 50, -1, 40, 0); }

// ---------- one-off satellite photo for the CIA board ----------
{ mood('day'); const sc = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 400); sc.position.set(4, 200, 0); sc.up.set(0, 0, -1); sc.lookAt(4, 0, 0); LOOK.set(4, 0, 0); placeSun(); renderer.setRenderTarget(satRT); renderer.render(scene, sc); renderer.setRenderTarget(null); }

// ---------- frame loop ----------
window.renderFrame = (T) => {
  T = clamp(T, 0, TL.duration - 1e-3); NOW = T;
  let i = TL.beats.findIndex(b => T < b.end); if (i < 0) i = TL.beats.length - 1;
  const b = BEAT = TL.beats[i], t = T - b.start, d = b.end - b.start, ln = (k) => b.lines[Math.min(k, b.lines.length - 1)] ?? { t0: b.start, t1: b.end };
  reset(); U.fade.value = 0; camera.up.set(0, 1, 0);
  SHOT[b.id](t, d, (k) => ln(k).t0 - b.start, (k) => ln(k).t1 - b.start);
  // short dips to black between beats; longer at chapter cards
  let f = U.fade.value; if (t < 0.25 && i > 0) f = Math.max(f, 1 - t / 0.25); if (d - t < 0.25 && i < TL.beats.length - 1) f = Math.max(f, 1 - (d - t) / 0.25); if (i === 0) f = Math.max(f, 1 - t / 1.5); U.fade.value = f;
  skyDome.position.copy(camera.position); stars.position.copy(camera.position); moon.position.set(camera.position.x + 1500, camera.position.y + 2200, camera.position.z - 3600); moon.lookAt(camera.position);
  placeSun(); scene.updateMatrixWorld(); postRender();
};
window.DURATION = TL.duration;
window.renderFrame(0);
window.READY = true;
