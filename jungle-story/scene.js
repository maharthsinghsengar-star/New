// "हिरण और बंदर" — a Hindi moral story. 2D cartoon characters in a cel-shaded 3D jungle.
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
function stickman({ hat = null, skirt = false, scale = 1, face = 1 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.scale.set(scale * face, scale, scale);
  const torsoP = new THREE.Group(); body.add(torsoP);
  torsoP.add(rot(seg(0.62, 0.09), 0, 0, Math.PI));
  const head = new THREE.Group(); head.position.y = 0.83; torsoP.add(head);
  flat(new THREE.CircleGeometry(0.215, 28), 0, 0, head, 0.034);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), PAPER); inner.position.z = 0.012; head.add(inner);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.026, 10), INK); eye.position.set(0.07, 0.02, 0.016); head.add(eye);
  if (hat === 'top') { flat(new THREE.PlaneGeometry(0.27, 0.27), 0, 0.33, head); flat(new THREE.PlaneGeometry(0.5, 0.055), 0, 0.2, head); }
  if (hat === 'tricorn') flat(tri([[-0.34, 0.15], [0.34, 0.15], [0.12, 0.3], [0, 0.38], [-0.12, 0.3]]), 0, 0, head);
  if (hat === 'cap') { flat(new THREE.PlaneGeometry(0.36, 0.1), -0.01, 0.22, head); flat(new THREE.PlaneGeometry(0.2, 0.045), 0.24, 0.185, head); }
  if (hat === 'bonnet') { flat(new THREE.PlaneGeometry(0.6, 0.055), 0, 0.19, head); flat(new THREE.PlaneGeometry(0.28, 0.14), 0, 0.27, head); }
  const limb = (l1, l2, y, parent) => { const a = seg(l1); a.position.y = y; const b = seg(l2); b.position.y = -l1; a.add(b); parent.add(a); return [a, b]; };
  const u = root.userData = { body, torsoP, head };
  u.armL = limb(0.33, 0.33, 0.55, torsoP); u.armR = limb(0.33, 0.33, 0.55, torsoP);
  u.legL = limb(0.43, 0.43, 0, body); u.legR = limb(0.43, 0.43, 0, body);
  if (skirt) { u.skirt = new THREE.Group(); body.add(u.skirt); flat(tri([[0, 0.12], [-0.36, -0.6], [0.36, -0.6]]), 0, 0, u.skirt); }
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
  if (u.skirt) u.skirt.rotation.z = p.skirt ?? 0;
}
const standPose = (w = 0) => ({ hipL: 0.07, hipR: -0.07, shL: 0.1 + w, shR: -0.1, elL: 0.1, elR: 0.1 });
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
const STAND_Y = 0.9;
// ---------- 2D cartoon animals (flat, outlined, jointed) ----------
const flatMat = (c, o = {}) => B(c, { side: THREE.DoubleSide, ...o });
const OUT = flatMat(0x2b1a0e);
const ell = (rx, ry) => new THREE.CircleGeometry(1, 30).scale(rx, ry, 1);
const capG = (th, len) => new THREE.CapsuleGeometry(th / 2, len, 4, 12).scale(1, 1, 0.1);
function P(geo, fill, x, y, z, parent, grow = 0.032) {   // flat part with a dark outline just behind it
  const a = new THREE.Mesh(geo, fill); a.position.set(x, y, z); a.castShadow = true; parent.add(a);
  if (grow) {
    geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3()), c = geo.boundingBox.getCenter(new THREE.Vector3());
    const b = new THREE.Mesh(geo, OUT), sx = 1 + 2 * grow / s.x, sy = 1 + 2 * grow / s.y;
    b.scale.set(sx, sy, 1); b.position.set(x - c.x * (sx - 1), y - c.y * (sy - 1), z - 0.004); parent.add(b);
  }
  return a;
}
function limbC(len, th, fill, z = 0, up = false) {   // pivot at origin, extends down (or up)
  const g = new THREE.Group(); P(capG(th, len).translate(0, up ? len / 2 : -len / 2, 0), fill, 0, 0, z, g); return g;
}
function makeDeer() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const TAN = flatMat(0xe69a4c), TAN2 = flatMat(0xc47c38), CREAM = flatMat(0xfff0d6), DK = flatMat(0x4a2a12), WH = flatMat(0xffffff), BK = flatMat(0x1a1a1a);
  const u = root.userData = { body, legs: [] };
  const leg = (x, far) => {
    const z = far ? -0.012 : 0.012, up = limbC(0.46, 0.14, far ? TAN2 : TAN, z); up.position.set(x, 0.98, 0);
    const lo = limbC(0.42, 0.085, far ? TAN2 : TAN, z); lo.position.y = -0.44; up.add(lo);
    const hoof = limbC(0.06, 0.1, DK, z + 0.001); hoof.position.y = -0.4; lo.add(hoof); body.add(up); u.legs.push([up, lo]);
  };
  leg(0.42, true); leg(-0.42, true);
  u.tail = new THREE.Group(); u.tail.position.set(-0.64, 1.36, 0); P(ell(0.09, 0.16).translate(-0.04, 0.1, 0), WH, 0, 0, -0.002, u.tail); body.add(u.tail);
  P(new THREE.CapsuleGeometry(0.34, 0.74, 4, 16).rotateZ(Math.PI / 2).scale(1, 1, 0.1), TAN, 0, 1.2, 0, body);
  P(ell(0.44, 0.13), CREAM, 0, 0.99, 0.004, body, 0);
  [[-0.5, 1.36], [-0.3, 1.42], [-0.12, 1.34], [-0.42, 1.22], [0.08, 1.42]].forEach(([x, y]) => P(ell(0.045, 0.045), WH, x, y, 0.005, body, 0));
  leg(0.42, false); leg(-0.42, false);
  u.neck = new THREE.Group(); u.neck.position.set(0.5, 1.32, 0); body.add(u.neck);
  P(capG(0.3, 0.62).translate(0, 0.3, 0), TAN, 0, 0, 0.006, u.neck);
  const head = u.head = new THREE.Group(); head.position.set(0, 0.68, 0); u.neck.add(head);
  for (const [ax, rz] of [[-0.06, 0.25], [0.04, -0.1]]) {   // antlers
    const st = limbC(0.42, 0.05, DK, 0.008, true); st.position.set(ax, 0.16, 0); st.rotation.z = rz; head.add(st);
    for (const [ty, tz] of [[0.2, 0.8], [0.34, -0.7]]) { const tn = limbC(0.15, 0.045, DK, 0.008, true); tn.position.y = ty; tn.rotation.z = tz; st.add(tn); }
  }
  u.ear = new THREE.Group(); u.ear.position.set(-0.14, 0.12, 0); head.add(u.ear);
  P(ell(0.075, 0.17).translate(0, 0.14, 0), TAN, 0, 0, 0.012, u.ear); P(ell(0.035, 0.1).translate(0, 0.14, 0), flatMat(0xffb9b0), 0, 0, 0.014, u.ear, 0);
  P(ell(0.26, 0.215), TAN, 0, 0, 0.016, head); P(ell(0.17, 0.125), CREAM, 0.25, -0.06, 0.02, head); P(ell(0.05, 0.04), BK, 0.4, -0.03, 0.024, head, 0);
  P(ell(0.05, 0.03), flatMat(0xff9f9f, { transparent: true, opacity: 0.7 }), 0.0, -0.08, 0.022, head, 0);
  P(ell(0.08, 0.09), WH, 0.09, 0.05, 0.024, head, 0.014);
  u.pupil = P(ell(0.048, 0.058), BK, 0.105, 0.045, 0.028, head, 0); u.hl = P(ell(0.017, 0.017), WH, 0.122, 0.07, 0.03, head, 0);
  u.closed = new THREE.Group(); head.add(u.closed); P(ell(0.088, 0.098), TAN, 0.09, 0.05, 0.032, u.closed, 0); P(ell(0.075, 0.013), DK, 0.09, 0.035, 0.034, u.closed, 0);
  u.brow = P(ell(0.075, 0.014), DK, 0.09, 0.17, 0.034, head, 0);
  u.wet = P(ell(0.06, 0.022), flatMat(0x7fd6ff), 0.09, -0.035, 0.036, head, 0);
  u.tears = [0, 1].map(() => P(ell(0.028, 0.045), flatMat(0x6fcfff, { transparent: true }), 0.09, -0.05, 0.038, head, 0));
  u.mouth = P(ell(0.05, 0.03), DK, 0.26, -0.15, 0.03, head, 0);
  figures.push(root); return root;
}
function poseDeer(f, t, { walk = 0, neck = 0, head = 0, eyes = 1, sad = 0, talk = 0, tear = 0, pace = 9 } = {}) {
  const u = f.userData, ph = t * pace;
  u.legs.forEach(([up, lo], i) => { const o = [0, Math.PI, Math.PI, 0][i]; up.rotation.z = walk * 0.55 * Math.sin(ph + o); lo.rotation.z = -walk * (0.12 + 0.5 * Math.max(0, Math.cos(ph + o))); });
  u.body.position.y = walk * 0.06 * Math.abs(Math.sin(ph));
  u.neck.rotation.z = -0.5 + neck + walk * 0.04 * Math.sin(ph * 2); u.head.rotation.z = 0.5 - neck * 0.6 + head;
  u.ear.rotation.z = 0.7 + sad * 0.7 + 0.12 * Math.sin(t * 3.1) * (1 - sad); u.tail.rotation.z = 0.25 * Math.sin(t * (sad ? 1 : 7)) - sad * 0.8;
  const blink = (t * 0.31) % 1 < 0.035, shut = eyes < 0.5 || blink;
  u.closed.visible = shut; u.pupil.visible = u.hl.visible = !shut;
  u.brow.visible = sad > 0.3; u.brow.rotation.z = 0.5 * sad; u.wet.visible = sad > 0.6 && !shut;
  u.tears.forEach((m, i) => { const a = (t * 0.55 + i * 0.5) % 1; m.visible = tear > 0; m.position.y = -0.06 - a * 0.42; m.position.x = 0.09 - a * 0.03; m.material.opacity = tear * (1 - a) ** 0.6; });
  u.mouth.scale.set(1, 0.3 + talk * (0.5 + 0.9 * Math.abs(Math.sin(t * 13))), 1); u.mouth.position.y = -0.15 - sad * 0.01;
}
function makeMonkey() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(0.82);
  const BR = flatMat(0x8a5630), BR2 = flatMat(0x6f4424), CREAM = flatMat(0xffe2b8), DK = flatMat(0x2b1a0e), WH = flatMat(0xffffff);
  const u = root.userData = { body };
  const limb = (l1, l2, y, parent, far) => {
    const z = far ? -0.012 : 0.012, a = limbC(l1, 0.11, far ? BR2 : BR, z); a.position.y = y; const b = limbC(l2, 0.1, far ? BR2 : BR, z); b.position.y = -l1; a.add(b);
    P(ell(0.075, 0.075), CREAM, 0, -l2 - 0.02, z + 0.002, b, 0.02); parent.add(a); return [a, b];
  };
  // tail
  u.tail = new THREE.Group(); u.tail.position.set(-0.08, 0.05, 0); body.add(u.tail);
  const curve = new THREE.CatmullRomCurve3([[0, 0], [-0.28, -0.1], [-0.52, 0.12], [-0.5, 0.45], [-0.3, 0.55], [-0.24, 0.4]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  u.tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.07, 8).scale(1, 1, 0.1).translate(0, 0, -0.02), OUT));
  const tl = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.042, 8).scale(1, 1, 0.1).translate(0, 0, -0.016), BR); tl.castShadow = true; u.tail.add(tl);
  u.legR = limb(0.3, 0.3, 0, body, true);
  const torsoP = u.torsoP = new THREE.Group(); body.add(torsoP);
  u.armR = limb(0.3, 0.3, 0.46, torsoP, true);
  P(capG(0.3, 0.4).translate(0, 0.27, 0), BR, 0, 0, 0, torsoP); P(ell(0.1, 0.17), CREAM, 0.03, 0.25, 0.004, torsoP, 0);
  const head = u.head = new THREE.Group(); head.position.y = 0.76; torsoP.add(head);
  P(ell(0.1, 0.1), BR, -0.23, 0.03, 0.006, head); P(ell(0.055, 0.055), CREAM, -0.23, 0.03, 0.008, head, 0);
  P(ell(0.255, 0.235), BR, 0, 0, 0.016, head); P(ell(0.19, 0.165), CREAM, 0.06, -0.035, 0.02, head, 0);
  u.eyes = [0.0, 0.14].map(x => P(ell(0.032, 0.042), DK, x, 0.02, 0.024, head, 0)); [0.01, 0.15].forEach(x => P(ell(0.011, 0.011), WH, x, 0.035, 0.026, head, 0));
  u.lids = [0.0, 0.14].map(x => P(ell(0.045, 0.03), CREAM, x, 0.05, 0.028, head, 0));
  u.brows = [[-0.005, -0.45], [0.145, 0.45]].map(([x, rz]) => { const m = P(ell(0.05, 0.012), DK, x, 0.085, 0.03, head, 0); m.rotation.z = rz; return m; });
  P(ell(0.012, 0.012), DK, 0.06, -0.04, 0.024, head, 0); P(ell(0.012, 0.012), DK, 0.09, -0.04, 0.024, head, 0);
  u.mouth = P(ell(0.06, 0.02), DK, 0.075, -0.11, 0.024, head, 0);
  u.legL = limb(0.3, 0.3, 0, body, false); u.armL = limb(0.3, 0.3, 0.46, torsoP, false);
  figures.push(root); return root;
}
const MONKEY_Y = 0.58;
function poseMonkey(f, t, p, { talk = 0, sly = 0, shame = 0 } = {}) {
  pose(f, p); const u = f.userData;
  u.tail.rotation.z = 0.25 * Math.sin(t * (shame ? 1.2 : 4)) - shame * 0.5;
  u.mouth.scale.set(1 - shame * 0.5, 0.6 + talk * 1.8 * Math.abs(Math.sin(t * 14)), 1);
  u.brows.forEach(b => b.visible = sly > 0.5); u.lids.forEach(l => l.visible = sly > 0.5 || shame > 0.5);
  u.eyes.forEach(e => e.position.y = 0.02 - shame * 0.02);
}
const walkPose = (ph, a = 1) => ({ hipL: 0.55 * a * Math.sin(ph), kneeL: -(0.1 + 0.6 * a * Math.max(0, Math.cos(ph))), hipR: -0.55 * a * Math.sin(ph), kneeR: -(0.1 + 0.6 * a * Math.max(0, -Math.cos(ph))), shL: -0.5 * a * Math.sin(ph), elL: 0.35, shR: 0.5 * a * Math.sin(ph), elR: 0.35, lean: 0.08 });
const idlePose = (t) => ({ hipL: 0.08, hipR: -0.08, shL: 0.15 + 0.05 * Math.sin(t * 2), shR: -0.15, elL: 0.2, elR: 0.2 });
// floating emotes
const emoteTex = {
  heart: canvasTex(256, 256, (x) => { x.lineWidth = 18; x.strokeStyle = '#fff'; x.fillStyle = '#ff3b5c'; x.beginPath(); x.moveTo(128, 222); x.bezierCurveTo(-20, 120, 60, 10, 128, 84); x.bezierCurveTo(196, 10, 276, 120, 128, 222); x.stroke(); x.fill(); }),
  bang: canvasTex(256, 256, (x) => { x.font = '900 230px sans-serif'; x.textAlign = 'center'; x.lineJoin = 'round'; x.lineWidth = 26; x.strokeStyle = '#fff'; x.strokeText('!', 128, 215); x.fillStyle = '#ff2d2d'; x.fillText('!', 128, 215); }),
  ask: canvasTex(256, 256, (x) => { x.font = '900 220px sans-serif'; x.textAlign = 'center'; x.lineJoin = 'round'; x.lineWidth = 26; x.strokeStyle = '#1b1b1b'; x.strokeText('?', 128, 210); x.fillStyle = '#ffd23f'; x.fillText('?', 128, 210); }),
  dots: canvasTex(256, 256, (x) => { x.fillStyle = '#fff'; x.strokeStyle = '#1b1b1b'; x.lineWidth = 10; x.beginPath(); x.roundRect(18, 70, 220, 110, 55); x.fill(); x.stroke(); x.beginPath(); x.moveTo(70, 176); x.lineTo(60, 222); x.lineTo(112, 178); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.fillRect(74, 160, 34, 16); x.fillStyle = '#1b1b1b'; for (const cx of [78, 128, 178]) { x.beginPath(); x.arc(cx, 125, 15, 0, 6.3); x.fill(); } }),
  fruit: canvasTex(384, 384, (x) => {
    x.fillStyle = '#fff'; x.strokeStyle = '#1b1b1b'; x.lineWidth = 10;
    const cl = () => { x.beginPath(); for (const [cx, cy, r] of [[130, 150, 90], [230, 120, 95], [280, 190, 75], [170, 215, 85], [90, 205, 60]]) { x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, 6.3); } };
    cl(); x.stroke(); cl(); x.fill(); for (const [cx, cy, r] of [[92, 318, 24], [58, 358, 13]]) { x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill(); x.stroke(); }
    const fr = (cx, cy, rx, ry, col) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 6.3); x.fill(); x.lineWidth = 6; x.stroke(); x.fillStyle = '#3fbf4f'; x.beginPath(); x.ellipse(cx + 8, cy - ry - 6, 14, 7, -0.6, 0, 6.3); x.fill(); };
    fr(135, 165, 40, 44, '#ff3b3b'); fr(225, 150, 44, 52, '#ffb21a'); fr(185, 225, 34, 34, '#ff7a1a'); fr(270, 215, 30, 32, '#b04cff');
  }),
};
function emote(kind, size = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTex[kind], transparent: true, depthWrite: false, depthTest: false, fog: false }));
  sp.renderOrder = 20; sp.visible = false;
  sp.userData.show = (x, y, z, a) => { sp.visible = a > 0.01; sp.position.set(x, y, z); const pop = a < 1 ? 0.6 + 0.4 * smooth(a) + 0.25 * Math.sin(a * Math.PI) : 1; sp.scale.setScalar(size * pop); sp.material.opacity = clamp(a * 2); };
  return sp;
}

// ---------- the jungle (one continuous world; scenes change place, light and mood) ----------
const world = new THREE.Group(); scene.add(world);
const TRAP_X = 41.5;
{
  const g = world, r = RNG(31);
  g.add(ground(texOf(GRASS('#4fc93a', '#39a82c', '#7fe05a'), 130, 75), 900, 500, 50, -60));
  const path = noShadow(mesh(new THREE.PlaneGeometry(900, 3.6), M(0xffffff, { map: texOf(DIRT, 170, 1) }), 50, 0.02, 0.3)); path.rotation.x = -Math.PI / 2; g.add(path);
  for (let x = -45; x < 140; x += 1.5) {
    for (let k = 0; k < 2; k++) { const t = tree(r); t.position.set(x + r() * 1.5, 0, -5.5 - r() * r() * 46); if (Math.abs(t.position.x - TRAP_X - 1.5) > 2.5 || t.position.z < -9) g.add(t); }
    if (r() < 0.6) g.add(sph(0.45 + r() * 0.4, [0x2fa84f, 0x3fbf4f, 0x59d35c][r() * 3 | 0], x + r() * 2, 0.15, -3.0 - r() * 1.6));
    if (r() < 0.45) { const fx = x + r() * 2, fz = -2.4 - r() * 1.6; for (let k = 0; k < 5; k++) g.add(rot(mesh(new THREE.ConeGeometry(0.07, 0.55 + r() * 0.3, 5), 0x2fb04a, fx + (k - 2) * 0.09, 0.28, fz), (r() - 0.5) * 0.5, 0, (k - 2) * 0.28)); }
    for (let k = 0; k < 3; k++) g.add(noShadow(sph(0.06, FLOWERS[r() * 6 | 0], x + r() * 2, 0.09, r() < 0.5 ? -2.2 - r() * 2 : 2.5 + r() * 1.4)));
    if (r() < 0.14) { const mx = x + r(), mz = -2.3 - r() * 1.5; g.add(cyl(0.05, 0.07, 0.26, 0xfff0d6, mx, 0.13, mz), mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, 6.3, 0, 1.6), 0xe63946, mx, 0.24, mz)); }
    if (r() < 0.12) { const k = sph(0.5 + r() * 0.5, 0x9aa3ad, x, 0.1, -2.6 - r() * 2); k.scale.set(1.3, 0.6, 1); g.add(k); }
  }
  for (let x = -40; x < 140; x += 9 + r() * 5) {   // giant jungle trunks with vines
    const tx = x + r() * 3, tz = -3.6 - r() * 1.5; if (Math.abs(tx - TRAP_X) < 5) continue;
    g.add(cyl(0.5, 0.75, 16, 0x6b4226, tx, 8, tz, 14), cyl(0.9, 1.2, 0.5, 0x5b3a22, tx, 0.25, tz, 14));
    for (let k = 0; k < 3; k++) { const vx = tx - 1.6 + r() * 3.2, vl = 2 + r() * 4; g.add(noShadow(box(0.05, vl, 0.05, 0x2f9a45, vx, 13 - vl / 2, tz + 0.7))); for (let j = 0; j < 4; j++) g.add(noShadow(sph(0.13, 0x4fd162, vx + (j % 2 ? 0.12 : -0.12), 13 - vl * (j + 0.5) / 4, tz + 0.72))); }
    for (let k = 0; k < 5; k++) g.add(noShadow(sph(1.6 + r(), [0x2fa84f, 0x23923f, 0x3fbf4f][k % 3], tx - 3 + k * 1.5, 14.5 + r() * 1.2, tz + 0.3)));
  }
  for (let i = 0; i < 18; i++) { const h = noShadow(mesh(new THREE.SphereGeometry(22 + r() * 16, 24, 12), M(0x2f9e45), -90 + i * 16 + r() * 8, -9, -85 - r() * 35)); h.scale.y = 0.5 + r() * 0.3; g.add(h); }
  for (let i = 0; i < 11; i++) { const mh = 44 + r() * 30, mr = 34 + r() * 20, mx = -130 + i * 34 + r() * 10, mz = -210 - r() * 30; g.add(noShadow(mesh(new THREE.ConeGeometry(mr, mh, 5), B(0x6f8fd8), mx, mh / 2 - 3, mz)), noShadow(mesh(new THREE.ConeGeometry(mr * 0.32, mh * 0.32, 5), B(0xffffff), mx, mh * 0.84 - 2.9, mz))); }
  clouds(g, 34); birds(g, 6, 5, 11, -14);
  // butterflies
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group(), m = B(FLOWERS[i % 6], { side: THREE.DoubleSide }), wings = [1, -1].map(sg => { const p = new THREE.Group(); const w = new THREE.Mesh(new THREE.CircleGeometry(0.11, 10), m); w.position.x = 0.1 * sg; p.add(w); b.add(p); return p; });
    const bx = -5 + r() * 34, by = 0.9 + r() * 1.6, bz = -1.8 + r() * 3.2, ph = r() * 6; g.add(b);
    tick(g, t => { b.position.set(bx + 0.8 * Math.sin(t * 0.7 + ph), by + 0.3 * Math.sin(t * 2.1 + ph), bz + 0.5 * Math.cos(t * 0.5 + ph)); const a = 1.1 * Math.sin(t * 16 + ph); wings[0].rotation.y = a; wings[1].rotation.y = -a; });
  }
}
// sun-ray shafts and fireflies (opacity set per mood)
const rays = [], flies = [];
{ const r = RNG(8);
  for (let x = -12; x < 70; x += 4.5) { const m = noShadow(mesh(new THREE.PlaneGeometry(1.6 + r() * 1.4, 16), B(0xfff3b0, { transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), x + r() * 3, 6, -2.2 - r() * 2)); m.rotation.z = -0.42; m.receiveShadow = false; world.add(m); rays.push(m); }
  for (let i = 0; i < 46; i++) { const f = glow(0xeaff7a, 0.45, 0, 0, 0, 0); const fx = TRAP_X + 6 + r() * 30, fy = 0.6 + r() * 3.4, fz = -4 + r() * 7, ph = r() * 6; world.add(f); flies.push(f); tick(world, t => { f.position.set(fx + 0.6 * Math.sin(t * 0.5 + ph), fy + 0.4 * Math.sin(t * 0.8 + ph * 2), fz); f.userData.tw = 0.5 + 0.5 * Math.sin(t * 2.3 + ph * 3); }); }
}
// the fruit tree, the bait and the hunter's net
const netFlat = new THREE.Group(), bag = new THREE.Group(), bait = new THREE.Group(), rope = noShadow(box(0.05, 1, 0.05, 0xd9c28a, TRAP_X, 0, 0.3));
{
  const tx = TRAP_X + 1.9, tz = -1.9, r = RNG(12);
  world.add(cyl(0.38, 0.55, 5, 0x7a4a2a, tx, 2.5, tz, 14));
  for (const [x, y, z, s] of [[0, 6.3, 0, 2.3], [-1.9, 5.7, 0.6, 1.7], [1.7, 5.6, 0.2, 1.8], [-0.4, 7.4, -0.3, 1.7], [-2.6, 5.0, 1.4, 1.1]]) world.add(sph(s, [0x2fa84f, 0x3fbf4f, 0x34b34a][(x * 3 + 9 | 0) % 3], tx + x, y, tz + z));
  for (let i = 0; i < 16; i++) { const a = r() * 6.28; world.add(sph(0.2, [0xff3b3b, 0xffb21a, 0xff7a1a][i % 3], tx - 0.4 + Math.cos(a) * (1.4 + r() * 1.3), 4.6 + r() * 2.2, tz + 1.3 + r() * 1.2)); }
  [[0, 0, 0xff3b3b], [0.32, 0.1, 0xffb21a], [-0.3, 0.12, 0xff7a1a], [0.05, -0.3, 0xffd23f], [0.12, 0.05, 0xff3b3b]].forEach(([x, z, c], i) => bait.add(sph(0.2, c, x, 0.2 + (i === 4 ? 0.3 : 0), z)));
  const rc = 0xe6d3a0;
  for (let i = -4; i <= 4; i++) netFlat.add(noShadow(box(2.7, 0.035, 0.035, rc, 0, 0.05, i * 0.33)), noShadow(box(0.035, 0.035, 2.7, rc, i * 0.33, 0.05, 0)));
  for (const [x, z] of [[1.35, 1.35], [-1.35, 1.35], [1.35, -1.35], [-1.35, -1.35]]) netFlat.add(cyl(0.05, 0.05, 0.4, 0x7a4a2a, x, 0.15, z, 8));
  bag.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 2), B(rc, { wireframe: true })));
  netFlat.position.set(TRAP_X, 0, 0.3); bag.position.set(TRAP_X, 0, 0.3); bait.position.set(TRAP_X, 0, 0.3);
  world.add(netFlat, bag, bait, rope);
  world.add(cyl(0.5, 0.7, 7, 0x6b4226, TRAP_X + 4.6, 3.5, -1.2, 14));   // trunk the hunter hides behind
}
const hunter = stickman({ hat: 'cap', face: -1 }); hunter.position.set(TRAP_X + 5.45, STAND_Y, -0.9); world.add(hunter);
function setTrap(lift) {   // 0 = lying in wait, 1 = sprung and hanging
  netFlat.visible = lift < 0.05; bag.visible = lift >= 0.05;
  const y = 0.7 + lift * 2.3, sw = lift * 0.25 * Math.sin(lift * 14);
  bag.position.set(TRAP_X + sw, y, 0.3); bag.scale.set(1, 1.15, 1); bag.rotation.y = lift * 2;
  bait.position.set(TRAP_X + sw, lift < 0.05 ? 0 : y - 0.75, 0.3);
  rope.visible = lift >= 0.05; rope.scale.y = Math.max(0.01, 5.6 - y - 0.8); rope.position.set(TRAP_X + sw * 0.5, (5.6 + y + 0.8) / 2, 0.3);
}
const deer = makeDeer(), monkey = makeMonkey(); world.add(deer, monkey);
const EM = { heart: emote('heart', 0.8), heart2: emote('heart', 0.55), bang: emote('bang', 1.3), ask: emote('ask', 1.1), dots: emote('dots', 1.2), fruit: emote('fruit', 1.9) };
Object.values(EM).forEach(e => world.add(e));
const face = (f, dir) => { const b = f.userData.body; b.scale.x = Math.abs(b.scale.x) * dir; };
const treeMats = [], cloudMats = [];
world.traverse(o => { if (o.isSprite && o.material.map) { if (CLOUD_TEX.includes(o.material.map)) cloudMats.push(o.material); else if (TREE_TEX.includes(o.material.map) || PINE_TEX.includes(o.material.map)) treeMats.push(o.material); } });

// ---------- moods ----------
const MOOD = {
  day: { sky: sky([[0, '#1668e0'], [0.4, '#3f9cf5'], [0.62, '#8fd0ff'], [0.75, '#d6f1ff']]), fog: [0xd6f1ff, 90, 420], sun: [0xfff6e0, 2.6, [10, 22, 14]], hemi: [0xe6f4ff, 0x6fd44b, 1.55], tree: 0xffffff, cloud: 0xffffff, rays: 0.09, flies: 0 },
  deep: { sky: sky([[0, '#0f4d6e'], [0.45, '#2f8f86'], [0.72, '#9fd6b0']]), fog: [0x6fb89a, 30, 170], sun: [0xd6ffe0, 1.5, [-8, 20, 12]], hemi: [0xa8d8c8, 0x2f7a45, 1.1], tree: 0x86b89a, cloud: 0xa8d0c0, rays: 0.05, flies: 0 },
  dusk: { sky: sky([[0, '#3b2fb0'], [0.32, '#c2459a'], [0.52, '#ff7a59'], [0.68, '#ffc247'], [0.8, '#fff0a8']]), fog: [0xffb98a, 60, 380], sun: [0xffb070, 2.5, [16, 9, 12]], hemi: [0xffd0c8, 0x7fae3f, 1.35], tree: 0xffc49a, cloud: 0xffb0c4, rays: 0.1, flies: 0 },
  night: { sky: sky([[0, '#0b1050'], [0.4, '#3a2a8e'], [0.62, '#a04a9a'], [0.78, '#ff9a6a']]), fog: [0x5a3f8a, 50, 300], sun: [0xb8b0ff, 1.5, [14, 12, 12]], hemi: [0xb0a8ff, 0x3a5a6a, 1.25], tree: 0x8a86d0, cloud: 0xc09ad8, rays: 0, flies: 1 },
};
const bigSun = [noShadow(sph(13, B(0xffe08a, { fog: false }), 0, 0, -330)), glow(0xffa24a, 240, 0, 0, -329, 1), glow(0xff6f91, 400, 0, 0, -328, 0.4)];
bigSun.forEach(o => world.add(o));

// ---------- scenes ----------
const focus = new THREE.Vector3();
function look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); focus.set(tx, 0, 0); }
function orbit(x, yaw, dist, h, ly, lx = 0) { look(x + lx + dist * Math.sin(yaw), h, dist * Math.cos(yaw), x + lx, ly, 0.3); }
const lineOf = (i, k) => TL.scenes[i].lines[k], sStart = (i) => TL.scenes[i].start;
const during = (i, k, lt, pad = 0) => { const l = lineOf(i, k), t = sStart(i) + lt; return t >= l.t0 - pad && t <= l.t1 + pad; };
const since = (i, k, lt) => sStart(i) + lt - lineOf(i, k).t0;      // seconds since line k began
const DZ = 0.3, MZ = 0.75;
function put(f, x, y, z, dir) { f.position.set(x, y, z); face(f, dir); }
function hideEmotes() { Object.values(EM).forEach(e => e.visible = false); }
const S = [
  // 0 — the quote: the deer alone at dusk
  { mood: 'dusk', sunX: 30, update(t, d) {
    put(deer, 58, 0, DZ, 1); poseDeer(deer, t, { neck: -0.25, sad: 1, tear: 0 }); put(monkey, -30, MONKEY_Y, MZ, 1); setTrap(1);
    orbit(58, lerp(0.75, 0.55, smooth(t / d)), lerp(9.5, 8, smooth(t / d)), 1.3, 1.5, 0.3);
  } },
  // 1 — best friends: the monkey rides on the deer
  { mood: 'day', update(t, d) {
    const x = -4 + 1.9 * t; put(deer, x, 0, DZ, 1); poseDeer(deer, t, { walk: 1, pace: 10 });
    put(monkey, x - 0.15, 1.5 + deer.userData.body.position.y, DZ + 0.02, 1);
    poseMonkey(monkey, t, { hipL: 1.3, kneeL: -1.5, hipR: 1.1, kneeR: -1.4, shL: 2.7 + 0.3 * Math.sin(t * 8), elL: 0.3, shR: 2.3 + 0.3 * Math.sin(t * 8 + 1), elR: 0.3, lean: -0.1 });
    setTrap(0); EM.heart.userData.show(x + 0.3, 3.5 + 0.2 * Math.sin(t * 3), DZ, smooth((t - 2.2) / 0.5) * (1 - smooth((t - d + 0.8) / 0.5)));
    orbit(x, lerp(0.8, 0.45, smooth(t / d)), 9, 1.4, 1.7, 0.4);
  } },
  // 2 — "just trust me"
  { mood: 'day', update(t, d) {
    const mTalk = during(2, 1, t), dLine = since(2, 2, t), trust = smooth(dLine / 0.6);
    put(deer, -1.0, 0, DZ, 1); poseDeer(deer, t, { neck: 0.05 + 0.08 * trust * Math.sin(t * 3), eyes: dLine > 0.4 ? 0 : 1 });
    put(monkey, 1.25, MONKEY_Y + (mTalk ? 0.04 * Math.abs(Math.sin(t * 7)) : 0), MZ, -1);
    poseMonkey(monkey, t, mTalk ? { hipL: 0.1, hipR: -0.1, shL: 1.5 + 0.25 * Math.sin(t * 5), elL: 1.6, shR: 0.9 + 0.3 * Math.sin(t * 4 + 1), elR: 0.5, lean: 0.12 } : idlePose(t), { talk: mTalk ? 1 : 0 });
    setTrap(0);
    EM.heart.userData.show(-0.4, 3.0 + 0.25 * dLine, DZ, clamp(dLine / 0.5) * (1 - smooth((dLine - 2.6) / 0.6)));
    EM.heart2.userData.show(-0.95, 2.8 + 0.2 * (dLine - 0.5), DZ, clamp((dLine - 0.5) / 0.5) * (1 - smooth((dLine - 2.8) / 0.6)));
    if (dLine < 0) orbit(0, lerp(-0.2, 0.15, smooth(t / d)), lerp(8.6, 7.6, t / d), 1.5, 1.35, 0.1);
    else orbit(-0.7, lerp(0.75, 0.55, smooth(dLine / 3)), 6.2, 1.5, 1.6, -0.25);
  } },
  // 3 — "come, I know a place full of sweet fruit"
  { mood: 'day', update(t, d) {
    const mTalk = during(3, 1, t), mt = since(3, 1, t), a = clamp(mt / 0.5) * (1 - smooth((t - d + 0.7) / 0.4));
    put(deer, -1.0, (mt > 3 ? 0.18 * Math.abs(Math.sin(t * 7)) : 0), DZ, 1); poseDeer(deer, t, { neck: 0.1, walk: mt > 3 ? 0.25 : 0 });
    put(monkey, 1.25, MONKEY_Y + 0.05 * Math.abs(Math.sin(t * 6)), MZ, mt > 0.3 ? 1 : -1);
    poseMonkey(monkey, t, mt > 0.3 ? { hipL: 0.15, hipR: -0.15, shL: 1.7 + 0.1 * Math.sin(t * 6), elL: 0.05, shR: -0.5, elR: 1.2, lean: 0.1, head: -0.15 } : idlePose(t), { talk: mTalk ? 1 : 0 });
    setTrap(0); EM.fruit.userData.show(1.35, 3.25 + 0.08 * Math.sin(t * 2.5), MZ, a);
    orbit(0.2, lerp(0.1, -0.2, smooth(t / d)), lerp(8.4, 7.8, t / d), 1.6, 1.75, 0.2);
  } },
  // 4 — off they go
  { mood: 'day', update(t, d) {
    const x = 8 + 2.7 * t; put(deer, x, 0, DZ, 1); poseDeer(deer, t, { walk: 1, pace: 11, neck: 0.08 });
    put(monkey, x + 2.3, MONKEY_Y + 0.05 * Math.abs(Math.sin(t * 9)), MZ, 1); poseMonkey(monkey, t, walkPose(t * 9));
    setTrap(0); orbit(x + 1.1, lerp(-0.5, -0.2, smooth(t / d)), 9, 1.5, 1.4, 0);
  } },
  // 5 — the trap
  { mood: 'deep', update(t, d) {
    const l2 = since(5, 1, t), arrive = smooth(t / 3.0), x = lerp(TRAP_X - 6.5, TRAP_X - 2.2, arrive), walking = arrive < 0.98;
    put(deer, x, 0, DZ, 1); poseDeer(deer, t, { walk: walking ? 1 : 0, neck: l2 > 0 ? -0.2 : 0.05 });
    const mx = lerp(TRAP_X - 5.2, TRAP_X - 4.6, smooth(t / 1.4)); put(monkey, mx - (arrive > 0.5 ? (arrive - 0.5) * 2.6 : 0), MONKEY_Y, MZ, 1);
    poseMonkey(monkey, t, t < 1.4 ? walkPose(t * 9) : { hipL: 0.05, hipR: -0.05, shL: 0.4, elL: 1.9, shR: -0.2, elR: 0.3, lean: -0.05 }, { sly: l2 > 0 ? 1 : 0 });
    setTrap(0); pose(hunter, { hipL: 0.1, hipR: -0.1, shL: 1.2, elL: 0.8, shR: 0.9, elR: 1.2, lean: 0.25 });
    EM.bang.userData.show(x + 0.9, 3.2, DZ, clamp(l2 / 0.25) * (1 - smooth((t - d + 0.5) / 0.3)));
    $('alarm').style.opacity = l2 > 0 ? 0.55 * (0.6 + 0.4 * Math.sin(l2 * 9)) * (1 - smooth((t - d + 0.5) / 0.4)) : 0;
    if (l2 < 0) orbit(x + 1.2, lerp(-0.45, -0.25, arrive), 9.5, 1.6, 1.5, 0);
    else look(TRAP_X + 3.6 - 0.5 * smooth(l2 / 3), 0.75, 3.4, TRAP_X - 1.3, 1.25, 0.2);
  } },
  // 6 — the net snaps; the deer escapes and turns to the monkey
  { mood: 'deep', update(t, d) {
    const j = clamp((t - 0.55) / 0.75), lift = smooth((t - 0.55) / 0.5), q = since(6, 1, t), turned = t > 3.2;
    const x = lerp(TRAP_X - 2.0, TRAP_X - 4.0, smooth(j));
    put(deer, x, 1.3 * Math.sin(j * Math.PI) + (j >= 1 && t < 3.2 ? 0.03 * Math.sin(t * 16) : 0), DZ, turned ? -1 : 1);
    poseDeer(deer, t, { walk: j > 0 && j < 1 ? 0.8 : 0, neck: turned ? 0 : -0.15, talk: during(6, 1, t) ? 1 : 0, sad: turned ? 0.5 : 0, pace: 14 });
    put(monkey, TRAP_X - 6.9, MONKEY_Y, MZ, 1); poseMonkey(monkey, t, { hipL: 0.05, hipR: -0.05, shL: 0.3, elL: 0.4, shR: -0.2, elR: 0.3, lean: -0.08 }, { shame: turned ? 0.6 : 0 });
    setTrap(lift); pose(hunter, { hipL: 0.1, hipR: -0.1, shL: 2.6, elL: 0.3, shR: 2.4, elR: 0.3, lean: -0.1 });
    $('alarm').style.opacity = 0.5 * clamp(1 - Math.abs(t - 0.7) / 0.5);
    EM.ask.userData.show(x - 0.75, 3.1, DZ, clamp(q / 0.3) * (1 - smooth((t - d + 0.5) / 0.3)));
    const sh = 0.12 * Math.exp(-Math.max(0, t - 0.55) * 5) * Math.sin(t * 60) * (t > 0.55 ? 1 : 0);
    if (!turned) orbit(TRAP_X - 2.4 + sh, lerp(0.2, 0.05, smooth(t / 3.2)), 10.2, 1.8 + sh, 1.9, 0);
    else orbit(TRAP_X - 5.4, lerp(-0.1, 0.1, smooth((t - 3.2) / (d - 3.2))), 7.8, 1.5, 1.4, 0);
  } },
  // 7 — the monkey's silence
  { mood: 'deep', update(t, d) {
    put(deer, TRAP_X - 4.0, 0, DZ, -1); poseDeer(deer, t, { sad: 0.6 });
    put(monkey, TRAP_X - 6.9, MONKEY_Y, MZ, t > 1.2 ? -1 : 1);
    poseMonkey(monkey, t, { hipL: 0.05, hipR: -0.05, shL: 0.1, elL: 0.15, shR: -0.1, elR: 0.1, lean: 0.22, head: t > 1.2 ? 0.35 : -0.3 * smooth(t / 0.8) }, { shame: 1 });
    setTrap(1); pose(hunter, standPose());
    EM.dots.userData.show(TRAP_X - 6.9, 2.5, MZ, clamp((t - 0.5) / 0.4) * (1 - smooth((t - d + 0.5) / 0.3)));
    orbit(TRAP_X - 6.6, lerp(-0.45, -0.25, smooth(t / d)), lerp(6.4, 5.6, t / d), 1.2, 0.95, 0);
  } },
  // 8 — tears, and the deer's words
  { mood: 'dusk', sunX: TRAP_X - 60, update(t, d) {
    const talk = during(8, 1, t) || during(8, 2, t), p = smooth(t / d);
    put(deer, TRAP_X - 4.0, 0, DZ, -1); poseDeer(deer, t, { sad: 1, tear: smooth((t - 1) / 1.5), neck: -0.12 + (talk ? 0.04 * Math.sin(t * 4) : 0), talk: talk ? 1 : 0 });
    put(monkey, TRAP_X - 6.9, MONKEY_Y, MZ, -1); poseMonkey(monkey, t, { hipL: 0.05, hipR: -0.05, shL: 0.1, elL: 0.15, shR: -0.1, elR: 0.1, lean: 0.25, head: 0.35 }, { shame: 1 });
    setTrap(1);
    orbit(TRAP_X - 4.5, lerp(-0.75, -0.5, p), lerp(6.0, 4.6, p), 1.55, lerp(1.25, 1.45, p), -0.2);
  } },
  // 9 — the deer walks away
  { mood: 'dusk', sunX: TRAP_X + 40, update(t, d) {
    const x = TRAP_X - 4 + 1.25 * t; put(deer, x, 0, DZ + 1.3 * smooth(t / 2.5), 1); poseDeer(deer, t, { walk: 0.8, pace: 6.5, sad: 1, neck: -0.25 });
    put(monkey, TRAP_X - 6.9, MONKEY_Y, MZ, 1); poseMonkey(monkey, t, { hipL: 0.05, hipR: -0.05, shL: 0.1, elL: 0.15, shR: -0.1, elR: 0.1, lean: 0.25, head: -0.3 }, { shame: 1 });
    setTrap(1); const p = smooth(t / d);
    look(TRAP_X - 11 + p, 2.0 + 1.6 * p, 7.5 + 2 * p, TRAP_X - 2 + 1.5 * p, 1.3, 0);
  } },
  // 10 — the moral
  { mood: 'night', sunX: TRAP_X + 75, update(t, d) {
    const x = TRAP_X + 14 + 0.45 * Math.min(t, 6); put(deer, x, 0, DZ, 1); poseDeer(deer, t, { walk: t < 6 ? 0.6 : 0, pace: 5.5, neck: t < 6 ? -0.05 : 0.2 * smooth((t - 6) / 2) });
    put(monkey, -30, MONKEY_Y, MZ, 1); setTrap(1); const p = smooth(t / d);
    orbit(x, lerp(0.9, 0.6, p), lerp(11, 8.5, p), 1.3, 1.9, 0.6);
  } },
];

// ---------- overlay + frame loop ----------
const subs = TL.scenes.flatMap(s => s.subs), WHO = { n: '#ffffff', m: '#ffd23f', d: '#8fe6ff' };
function overlay(t, i, lt, d) {
  const last = i === S.length - 1;
  const c = subs.find(c => t >= c.t0 - 0.05 && t < c.t1 + 0.1);
  $('sub').style.opacity = c ? 1 : 0;
  if (c) { $('sub').textContent = c.text; $('sub').style.color = WHO[c.who]; $('sub').className = i === 0 ? 'big' : ''; $('sub').style.transform = `translateX(-50%) scale(${0.94 + 0.06 * smooth((t - c.t0 + 0.05) / 0.12)})`; }
  $('tag').style.opacity = i === 1 ? smooth((lt - 0.3) / 0.5) * (1 - smooth((lt - d + 0.6) / 0.4)) : 0;
  $('moral').style.opacity = last ? smooth((lt - 0.4) / 0.6) * (1 - smooth((lt - d + 1.4) / 0.6)) : 0;
  if (i !== 5 && i !== 6) $('alarm').style.opacity = 0;
  let f = Math.max(1 - lt / 0.4, 1 - (d - lt) / 0.4, 0);
  if (i === 0) f = Math.max(1 - lt / 0.9, 1 - (d - lt) / 0.4, 0);
  if (last) f = Math.max(1 - lt / 0.4, 1 - (d - lt) / 1.2, 0);
  $('fade').style.opacity = clamp(f);
  $('bar').style.width = (t / TL.duration * 100) + '%';
}
const camPos = new THREE.Vector3(), wp = new THREE.Vector3();
window.renderFrame = (t) => {
  t = clamp(t, 0, TL.duration - 1e-3);
  let i = TL.scenes.findIndex(s => t < s.end); if (i < 0) i = S.length - 1;
  const sc = TL.scenes[i], lt = t - sc.start, d = sc.end - sc.start, s = S[i], m = MOOD[s.mood];
  scene.background = m.sky; scene.fog = new THREE.Fog(...m.fog);
  sun.color.set(m.sun[0]); sun.intensity = m.sun[1];
  hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
  treeMats.forEach(x => x.color.set(m.tree)); cloudMats.forEach(x => x.color.set(m.cloud));
  hideEmotes(); s.update(lt, d);
  (world.userData.tick || []).forEach(f => f(t));
  rays.forEach(r => r.material.opacity = m.rays); flies.forEach(f => f.material.opacity = m.flies * (f.userData.tw || 0));
  bigSun.forEach(o => { o.visible = s.sunX !== undefined; if (o.visible) { o.position.x = s.sunX; o.position.y = s.mood === 'night' ? 6 : 24; } });
  sun.target.position.copy(focus); sun.position.set(focus.x + m.sun[2][0] * 2, m.sun[2][1] * 2, m.sun[2][2] * 2);
  camera.updateMatrixWorld(); camPos.copy(camera.position);
  figures.forEach(f => { f.getWorldPosition(wp); f.rotation.y = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) * 0.85; });
  renderer.render(scene, camera);
  overlay(t, i, lt, d);
};
window.DURATION = TL.duration;
await document.fonts.ready;
await Promise.all(['600', '700', '800'].map(w => document.fonts.load(`${w} 40px Poppins`, 'हिरण और बंदर abc')));
window.renderFrame(0);
window.READY = true;
