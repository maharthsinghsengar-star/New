// "The Invention of the Car" — 2D stick figures in a low-poly 3D world.
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
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 700);
const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? M(mat) : mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
}
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r1, r2, h, c, x, y, z, s = 14) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), c, x, y, z);
const sph = (r, c, x, y, z, d = 1) => mesh(new THREE.IcosahedronGeometry(r, d), c, x, y, z);
const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };
function sky(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([p, col]) => gr.addColorStop(p, col));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function wheel(r, { tire = 0x2a2a2a, spoke = 0x8a5a2b, n = 5, thick = 0.07 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r - thick, thick, 8, 26), tire));
  g.add(rot(cyl(0.1, 0.1, thick * 2.6, spoke), Math.PI / 2));
  for (let i = 0; i < n; i++) g.add(rot(box((r - thick) * 2, 0.04, 0.04, spoke), 0, 0, i * Math.PI / n));
  return g;
}
function puffs(n, color = 0xffffff) {
  const g = new THREE.Group(), list = [];
  for (let i = 0; i < n; i++) {
    const m = sph(0.3, M(color, { transparent: true, flatShading: true }), 0, 0, 0, 1);
    m.castShadow = false; g.add(m); list.push(m);
  }
  // rate: puffs/sec cycle speed, drift: vector travelled over a lifetime
  g.userData.update = (t, rate, dx, dy, size = 1, strength = 1) => list.forEach((m, i) => {
    const a = ((t * rate + i / n) % 1 + 1) % 1, w = Math.sin(i * 12.9) * 0.25;
    m.position.set(dx * a + w * a, dy * a, w * a * 1.5);
    m.scale.setScalar((0.35 + a * 1.5) * size);
    m.material.opacity = (1 - a) * 0.85 * strength;
    m.rotation.set(i, a * 2 + i, 0);
  });
  return g;
}

const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
function glow(color, size, x, y, z, op = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, fog: false }));
  sp.scale.setScalar(size); sp.position.set(x, y, z); return sp;
}
const tick = (g, f) => (g.userData.tick ||= []).push(f);
function birds(g, n, seed, y0 = 11, z0 = -16, col = 0x222222) {   // little 2D "V" birds
  const r = RNG(seed), m = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(), wings = [1, -1].map(sg => { const p = new THREE.Group(); const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.07), m); w.position.x = 0.25 * sg; p.add(w); b.add(p); return p; });
    const bx = -20 + r() * 70, by = y0 + r() * 5, bz = z0 - r() * 10, ph = r() * 6, sp = 0.8 + r() * 0.8; g.add(b);
    tick(g, t => { b.position.set(bx + t * sp, by + 0.3 * Math.sin(t * 1.3 + ph), bz); const a = 0.55 * Math.sin(t * 9 + ph); wings[0].rotation.z = a; wings[1].rotation.z = -a; });
  }
}
function confetti(g, n, seed, x0, x1) {
  const r = RNG(seed), cols = [0xff4d6d, 0xffd23f, 0x3ddc97, 0x4cc9f0, 0xb388ff, 0xff9f1c];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: cols[i % 6], side: THREE.DoubleSide }));
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
const STAND_Y = 0.9;
const sitPose = (reach = 0.95, w = 0) => ({ hipL: 1.5, kneeL: -1.4, hipR: 1.36, kneeR: -1.3, shL: reach + w, elL: 0.5, shR: reach - 0.12 - w, elR: 0.45, lean: 0.04, skirt: 0.75 });
const standPose = (w = 0) => ({ hipL: 0.07, hipR: -0.07, shL: 0.1 + w, shR: -0.1, elL: 0.1, elR: 0.1 });
const cheerPose = (t) => ({ hipL: 0.08, hipR: -0.08, shL: 2.7 + 0.35 * Math.sin(t * 9), elL: 0.3, shR: -2.7 - 0.35 * Math.sin(t * 9 + 1), elR: -0.3, head: 0.1 });

// ---------- props ----------
function tree(r) {
  const g = new THREE.Group(), s = 0.8 + r() * 0.9, greens = [0x3fbf4f, 0x59d35c, 0x2fa84f, 0x7ee05a];
  if (r() < 0.35) {
    g.add(cyl(0.12, 0.16, 1, 0x6b4a2b, 0, 0.5, 0, 6));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(1.1 - i * 0.28, 1.5, 7), [0x1f9d55, 0x23b05e, 0x2fc46b][i], 0, 1.5 + i * 0.95, 0));
  } else {
    g.add(cyl(0.14, 0.2, 1.6, 0x6b4a2b, 0, 0.8, 0, 6));
    g.add(sph(1.15, greens[r() * 4 | 0], 0, 2.4, 0)); g.add(sph(0.8, greens[r() * 4 | 0], 0.6, 2.0, 0.3)); g.add(sph(0.75, greens[r() * 4 | 0], -0.55, 2.1, -0.2));
  }
  g.scale.setScalar(s); g.rotation.y = r() * 6; return g;
}
function cloud(r) {
  const g = new THREE.Group(), m = M(0xffffff, { roughness: 1 });
  for (let i = 0; i < 5; i++) { const p = sph(1.2 + r() * 1.3, m, (i - 2) * 1.7, r() * 0.8, r() * 1.2); p.castShadow = false; p.scale.y = 0.7; g.add(p); }
  return g;
}
function countryside(seed, { grass = 0x6fd44b, road = 0xe3b469, hill = 0x3fae4a, cloudTint = 0xffffff, mount = 0x6f7fd6, birdCol = 0x222222 } = {}) {
  const g = new THREE.Group(), r = RNG(seed);
  const ground = mesh(new THREE.PlaneGeometry(700, 400), grass, 60, 0, -60); ground.rotation.x = -Math.PI / 2; ground.castShadow = false; g.add(ground);
  const rd = box(700, 0.04, 3.4, road, 60, 0.02, 0); rd.castShadow = false; g.add(rd);
  for (let x = -40; x < 120; x += 2.2) {
    const t = tree(r); t.position.set(x + r() * 2, 0, -5 - r() * r() * 34); g.add(t);
    if (r() < 0.5) g.add(sph(0.35 + r() * 0.3, 0x4f9d4a, x + r() * 2, 0.2, -2.6 - r() * 1.2));
    if (r() < 0.6) g.add(mesh(new THREE.ConeGeometry(0.12, 0.4, 5), 0x6bb85a, x + r() * 2, 0.2, 2.2 + r() * 3));
    for (let k = 0; k < 5; k++) { const fl = sph(0.1, FLOWERS[r() * 6 | 0], x + r() * 2.2, 0.16, 2.2 + r() * 3.2); fl.castShadow = false; g.add(fl); }
    for (let k = 0; k < 3; k++) { const fl = sph(0.11, FLOWERS[r() * 6 | 0], x + r() * 2.2, 0.16, -2.5 - r() * 2.2); fl.castShadow = false; g.add(fl); }
    if (r() < 0.12) g.add(cyl(0.7, 0.8, 0.7, 0xf2c94c, x, 0.35, -5 - r() * 3, 10), sph(0.72, 0xf2c94c, x, 0.7, -5.5, 1));
  }
  // windmill, pond
  const mill = new THREE.Group(), blades = new THREE.Group();
  mill.add(cyl(1.0, 1.7, 6, 0xfff3e0, 0, 3, 0, 8), mesh(new THREE.ConeGeometry(1.25, 1.5, 8), 0xe63946, 0, 6.75, 0), box(0.8, 1.5, 0.1, 0x7a4a2a, 0, 0.75, 1.62));
  for (let i = 0; i < 4; i++) blades.add(rot(box(0.5, 4.6, 0.06, 0xfdfdfd, 0, 0, 0), 0, 0, i * Math.PI / 2 + 0.4).translateY(2.6));
  blades.position.set(0, 5.6, 1.5); mill.add(blades, sph(0.25, 0x7a4a2a, 0, 5.6, 1.5)); mill.position.set(13, 0, -17); g.add(mill);
  tick(g, t => blades.rotation.z = t * 0.9);
  const pond = mesh(new THREE.CircleGeometry(4.5, 24), M(0x3ec5ff, { roughness: 0.2, flatShading: false }), 2, 0.03, -10); pond.rotation.x = -Math.PI / 2; pond.scale.y = 0.5; pond.castShadow = false; g.add(pond);
  birds(g, 7, seed + 1, 10, -14, birdCol);
  for (let x = -40; x < 120; x += 2) g.add(box(0.12, 0.9, 0.12, 0x9a7446, x, 0.45, -2.2));
  g.add(box(170, 0.08, 0.06, 0x9a7446, 40, 0.75, -2.2), box(170, 0.08, 0.06, 0x9a7446, 40, 0.45, -2.2));
  for (let i = 0; i < 16; i++) { const h = sph(18 + r() * 14, hill, -70 + i * 15 + r() * 8, -6, -62 - r() * 30, 2); h.scale.y = 0.5 + r() * 0.3; h.castShadow = false; g.add(h); }
  for (let i = 0; i < 9; i++) { const mh = 34 + r() * 22, mr = 26 + r() * 16, mx = -90 + i * 30 + r() * 10, mz = -150 - r() * 30; const m = mesh(new THREE.ConeGeometry(mr, mh, 6), mount, mx, mh / 2 - 3, mz); m.castShadow = false; const cap = mesh(new THREE.ConeGeometry(mr * 0.3, mh * 0.3, 6), 0xffffff, mx, mh * 0.85 - 2.9, mz); cap.castShadow = false; g.add(m, cap); }
  for (let i = 0; i < 14; i++) { const c = cloud(r); c.position.set(-50 + i * 13 + r() * 6, 15 + r() * 12, -45 - r() * 40); c.traverse(o => { if (o.material) o.material = M(cloudTint, { roughness: 1 }); }); g.add(c); }
  return g;
}
function house(r, w, h, d, col, roofCol) {
  const g = new THREE.Group();
  g.add(box(w, h, d, col, 0, h / 2, 0));
  const rh = 1.4 + r() * 1.3;
  const roof = mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2 - 0.2, 0), new THREE.Vector2(w / 2 + 0.2, 0), new THREE.Vector2(0, rh)]), { depth: d + 0.3, bevelEnabled: false }), roofCol, 0, h, -d / 2 - 0.15);
  g.add(roof);
  const floors = Math.max(1, Math.round((h - 2.4) / 1.9)), cols = Math.max(2, Math.round(w / 1.4));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const x = (c + 0.5) / cols * w - w / 2, y = 3.1 + f * 1.9;
    g.add(box(0.72, 1.06, 0.08, 0xf4ecd8, x, y, d / 2 + 0.02), box(0.56, 0.9, 0.1, r() < 0.3 ? 0xffd98a : 0x3d4f66, x, y, d / 2 + 0.03));
  }
  for (let c = 0; c < cols; c++) {   // flower boxes
    const x = (c + 0.5) / cols * w - w / 2; g.add(box(0.8, 0.16, 0.24, 0x7a4a2a, x, 2.5, d / 2 + 0.14));
    for (let k = 0; k < 4; k++) g.add(sph(0.1, FLOWERS[r() * 6 | 0], x - 0.3 + k * 0.2, 2.66, d / 2 + 0.16));
  }
  const dx = (r() - 0.5) * w * 0.4, aw = [0xe63946, 0x1d9bf0, 0x2a9d8f, 0xff9f1c][r() * 4 | 0];
  g.add(box(0.95, 1.8, 0.1, [0x8b3a2f, 0x1f6f8b, 0x2d6a4f, 0x6b4a2b][r() * 4 | 0], dx, 0.9, d / 2 + 0.03));
  for (let k = 0; k < 5; k++) g.add(rot(box(0.32, 0.06, 0.9, k % 2 ? 0xffffff : aw, dx - 0.64 + k * 0.32, 2.1, d / 2 + 0.42), 0.35));
  if (r() < 0.6) g.add(box(0.5, 1.3, 0.5, 0x8a4b3a, w * 0.25, h + rh * 0.6, 0));
  return g;
}
function town(seed, { road = 0xc9b08a, walk = 0xead9b8, pal = [0xffd166, 0xf28b6b, 0x7fd8c2, 0xf9a8c4, 0x8ec5f5, 0xfff0b3, 0xc4a5ef] } = {}) {
  const g = new THREE.Group(), r = RNG(seed);
  const ground = mesh(new THREE.PlaneGeometry(400, 200), road, 30, 0, -20); ground.rotation.x = -Math.PI / 2; ground.castShadow = false; g.add(ground);
  g.add(box(400, 0.16, 3, walk, 30, 0.08, -3.6));
  for (let x = -40; x < 90; x += 0.9) for (let k = 0; k < 2; k++) {   // cobbles
    const c = box(0.5, 0.03, 0.36, [0xb39a74, 0xd8c29a, 0xa88d68][r() * 3 | 0], x + r() * 0.5, 0.012, -1.6 + r() * 8); c.castShadow = false; g.add(c);
  }
  let x = -44;
  while (x < 90) {
    const w = 3.4 + r() * 2.2, h = 4.6 + r() * 4.2;
    const hs = house(r, w, h, 5, pal[r() * pal.length | 0], [0xd1493a, 0xb5372e, 0x4a5fa8, 0xe07a3f][r() * 4 | 0]);
    hs.position.set(x + w / 2, 0, -7.7); g.add(hs); x += w + 0.05;
  }
  for (let x = -38; x < 90; x += 7.5) {   // street lamps
    g.add(cyl(0.05, 0.07, 3, 0x2e2e2e, x, 1.5, -2.5, 6), box(0.3, 0.4, 0.3, M(0xfff1b8, { emissive: 0xffd36b, emissiveIntensity: 0.6 }), x, 3.15, -2.5), mesh(new THREE.ConeGeometry(0.28, 0.2, 4), 0x2e2e2e, x, 3.45, -2.5));
  }
  for (let i = 0; i < 8; i++) { const c = cloud(r); c.position.set(-40 + i * 18, 20 + r() * 8, -40 - r() * 20); g.add(c); }
  for (let x = -38; x < 90; x += 7.5) {   // lamp glow, bunting, planters, foreground props
    g.add(glow(0xffd98a, 2.2, x, 3.15, -2.4, 0.7));
    for (let k = 0; k < 10; k++) { const u = (k + 0.5) / 10; g.add(rot(mesh(new THREE.ConeGeometry(0.17, 0.34, 3), FLOWERS[(k + (x | 0)) % 6 === 2 ? 4 : (k + (x | 0) & 7) % 6], x + u * 7.5, 3.5 - 0.55 * Math.sin(u * Math.PI), -2.5), Math.PI)); }
    const tr = new THREE.Group(); tr.add(cyl(0.45, 0.35, 0.6, 0xc8553d, 0, 0.3, 0, 8), cyl(0.08, 0.1, 1.2, 0x6b4a2b, 0, 1.1, 0, 5), sph(0.75, 0x3fbf4f, 0, 2.1, 0)); tr.position.set(x + 3.7, 0.16, -3.2); g.add(tr);
    const px = x + 1 + r() * 4, pz = 5.0 + r() * 0.8;
    if (r() < 0.5) g.add(cyl(0.36, 0.3, 0.8, 0x9c6b3c, px, 0.4, pz, 10), cyl(0.38, 0.38, 0.06, 0x3b3b40, px, 0.6, pz, 10));
    else { g.add(cyl(0.4, 0.28, 0.5, 0xd1603d, px, 0.25, pz, 8), sph(0.42, 0x3fbf4f, px, 0.7, pz)); for (let k = 0; k < 5; k++) g.add(sph(0.12, FLOWERS[r() * 6 | 0], px - 0.3 + r() * 0.6, 0.95 + r() * 0.15, pz - 0.2 + r() * 0.5)); }
  }
  birds(g, 5, seed + 2, 12, -4);
  return g;
}

// ---------- vehicles (front = +X) ----------
function horseCart() {
  const g = new THREE.Group(), wood = 0x9c6b3c, dark = 0x6f4a26;
  g.add(box(2.1, 0.14, 1.2, wood, 0, 0.9, 0), box(2.1, 0.32, 0.07, dark, 0, 1.1, 0.6), box(2.1, 0.32, 0.07, dark, 0, 1.1, -0.6), box(0.07, 0.32, 1.2, dark, -1.02, 1.1, 0));
  g.add(box(0.5, 0.1, 1.15, dark, 0.6, 1.34, 0), box(0.08, 0.4, 1.1, dark, 0.38, 1.16, 0));
  g.add(sph(0.42, 0xe3c56b, -0.5, 1.22, 0.1), sph(0.36, 0xd9b95c, -0.1, 1.2, -0.2), box(0.5, 0.4, 0.5, 0xb98a55, -0.75, 1.17, -0.25));
  const wh = [wheel(0.62), wheel(0.62)]; wh[0].position.set(-0.15, 0.62, 0.74); wh[1].position.set(-0.15, 0.62, -0.74); g.add(...wh);
  g.add(box(2.3, 0.07, 0.07, dark, 2.1, 1.0, 0.36), box(2.3, 0.07, 0.07, dark, 2.1, 1.0, -0.36));
  const h = new THREE.Group(), c = 0x8b5a2b, d = 0x4e2f14; h.position.x = 3.1; g.add(h);
  h.add(box(1.55, 0.62, 0.52, c, 0, 1.3, 0), rot(box(0.38, 0.95, 0.36, c, 0.82, 1.82, 0), 0, 0, -0.5), rot(box(0.66, 0.32, 0.32, c, 1.27, 2.2, 0), 0, 0, -0.4));
  h.add(rot(box(0.12, 0.8, 0.12, d, 0.62, 1.95, 0), 0, 0, -0.5), box(0.08, 0.2, 0.08, c, 1.02, 2.5, 0.1), box(0.08, 0.2, 0.08, c, 1.02, 2.5, -0.1));
  const tail = new THREE.Group(); tail.position.set(-0.78, 1.5, 0); tail.add(box(0.12, 0.8, 0.12, d, 0, -0.4, 0)); h.add(tail);
  const legs = [[0.58, 0.17, 0], [0.58, -0.17, Math.PI], [-0.58, 0.17, Math.PI], [-0.58, -0.17, 0]].map(([x, z, o]) => {
    const p = new THREE.Group(); p.position.set(x, 1.02, z); p.add(box(0.15, 1.02, 0.15, c, 0, -0.5, 0), box(0.17, 0.14, 0.17, d, 0, -0.95, 0)); p.userData.o = o; h.add(p); return p;
  });
  const man = stickman(); man.position.set(0.6, 1.47, 0); g.add(man);
  g.userData.update = (x, t) => {
    g.position.x = x; wh.forEach(w => w.rotation.z = -x / 0.62);
    legs.forEach(l => l.rotation.z = 0.5 * Math.sin(t * 7 + l.userData.o));
    h.position.y = 0.05 * Math.abs(Math.sin(t * 7)); tail.rotation.z = -0.4 + 0.2 * Math.sin(t * 5);
    pose(man, sitPose(0.8, 0.06 * Math.sin(t * 7))); man.position.y = 1.47 + 0.02 * Math.sin(t * 14);
  };
  return g;
}
function fardier() {
  const g = new THREE.Group(), wood = 0x7a5230, iron = 0x3b3b40, copper = M(0xc27a3e, { metalness: 0.5, roughness: 0.45 });
  g.add(box(4.0, 0.2, 0.16, wood, 0.1, 1.05, 0.42), box(4.0, 0.2, 0.16, wood, 0.1, 1.05, -0.42));
  for (const x of [-1.7, -0.6, 0.5, 1.4]) g.add(box(0.16, 0.16, 1.0, wood, x, 1.05, 0));
  g.add(box(1.5, 0.1, 1.0, wood, -1.0, 1.2, 0), rot(cyl(0.22, 0.22, 0.6, 0x5b4630, -1.3, 1.5, 0.15), Math.PI / 2), rot(cyl(0.22, 0.22, 0.6, 0x6a5238, -0.8, 1.5, -0.1), Math.PI / 2));
  const wh = [wheel(0.72, { n: 6 }), wheel(0.72, { n: 6 }), wheel(0.62, { n: 6, tire: iron, spoke: 0x555560 })];
  wh[0].position.set(-1.3, 0.72, 0.64); wh[1].position.set(-1.3, 0.72, -0.64); wh[2].position.set(1.6, 0.62, 0); g.add(...wh);
  const boiler = sph(0.72, copper, 2.75, 1.1, 0, 2); boiler.scale.y = 0.92; g.add(boiler);
  g.add(rot(mesh(new THREE.TorusGeometry(0.72, 0.04, 6, 24), iron, 2.75, 1.1, 0), 0, Math.PI / 2), cyl(0.1, 0.13, 0.7, iron, 2.75, 1.95, 0), box(0.9, 0.1, 0.1, iron, 2.2, 1.1, 0.3), box(0.9, 0.1, 0.1, iron, 2.2, 1.1, -0.3));
  g.add(cyl(0.13, 0.13, 0.55, copper, 1.6, 1.6, 0.2), cyl(0.13, 0.13, 0.55, copper, 1.6, 1.6, -0.2));
  g.add(box(0.6, 0.1, 0.85, wood, 0.15, 1.4, 0), box(0.08, 0.5, 0.85, wood, -0.15, 1.65, 0), rot(box(0.06, 0.8, 0.06, iron, 1.05, 1.55, 0), 0, 0, 0.5), box(0.06, 0.06, 0.6, iron, 0.86, 1.9, 0));
  const steam = puffs(9); steam.position.set(2.75, 2.35, 0); g.add(steam);
  const man = stickman({ hat: 'tricorn' }); man.position.set(0.15, 1.53, 0); g.add(man);
  g.userData.update = (x, t, burst = 0, panic = 0) => {
    g.position.x = x; wh.forEach((w, i) => w.rotation.z = -x / (i < 2 ? 0.72 : 0.62));
    steam.userData.update(t, 0.5, -1.6 - burst, 2.2 + burst * 1.5, 1 + burst * 1.6);
    const p = sitPose(0.8, 0.05 * Math.sin(t * 5));
    if (panic) { p.shL = 2.6 + 0.3 * Math.sin(t * 16); p.shR = 2.3 + 0.3 * Math.sin(t * 16 + 2); p.elL = p.elR = 0.2; p.lean = -0.15; }
    pose(man, p); man.position.y = 1.53 + 0.015 * Math.sin(t * 11);
  };
  return g;
}
function motorwagen(driver) {
  const g = new THREE.Group(), fr = 0x2f4f3a, brass = M(0xc9a23f, { metalness: 0.6, roughness: 0.4 }), lea = 0x7a4a2a;
  const wopt = { tire: 0x333333, spoke: 0xb9b9b9, n: 8, thick: 0.035 };
  const wh = [wheel(0.66, wopt), wheel(0.66, wopt), wheel(0.4, wopt)];
  wh[0].position.set(-0.65, 0.66, 0.62); wh[1].position.set(-0.65, 0.66, -0.62); wh[2].position.set(1.15, 0.4, 0); g.add(...wh);
  g.add(box(1.9, 0.08, 0.08, fr, 0.1, 0.72, 0.36), box(1.9, 0.08, 0.08, fr, 0.1, 0.72, -0.36), box(0.08, 0.08, 1.24, fr, -0.65, 0.66, 0), box(0.08, 0.08, 0.8, fr, 0.6, 0.72, 0));
  g.add(rot(box(0.06, 0.75, 0.06, fr, 1.05, 0.72, 0.06), 0, 0, -0.35), rot(box(0.06, 0.75, 0.06, fr, 1.05, 0.72, -0.06), 0, 0, -0.35));
  g.add(box(0.75, 0.12, 0.95, lea, -0.2, 1.08, 0), box(0.1, 0.5, 0.95, lea, -0.55, 1.36, 0), box(0.7, 0.3, 0.08, fr, -0.2, 0.9, 0.44), box(0.7, 0.3, 0.08, fr, -0.2, 0.9, -0.44));
  g.add(box(0.45, 0.4, 0.35, 0x444448, -1.0, 0.95, 0), cyl(0.09, 0.09, 0.5, brass, -1.0, 1.35, 0.0));
  const fly = cyl(0.42, 0.42, 0.06, brass, -1.05, 0.66, 0, 18); fly.add(box(0.8, 0.07, 0.07, 0x555555, 0, 0, 0)); g.add(fly);
  g.add(cyl(0.025, 0.025, 0.85, 0x222222, 0.52, 1.15, 0, 6), box(0.05, 0.05, 0.4, brass, 0.52, 1.58, 0));
  const ex = puffs(5, 0xdddddd); ex.position.set(-1.35, 0.8, 0); g.add(ex);
  driver.position.set(-0.2, 1.24, 0); g.add(driver);
  g.userData.update = (x, t) => {
    g.position.x = x; g.position.y = 0.012 * Math.sin(t * 23);
    wh.forEach((w, i) => w.rotation.z = -x / (i < 2 ? 0.66 : 0.4)); fly.rotation.y = t * 9;
    ex.userData.update(t, 0.9, -1.1, 0.6, 0.45, 0.7);
    pose(driver, sitPose(0.72, 0.05 * Math.sin(t * 4)));
  };
  return g;
}
function modelT() {
  const g = new THREE.Group(), blk = M(0x1c1c1f, { roughness: 0.35, metalness: 0.3 }), brass = M(0xc9a23f, { metalness: 0.6, roughness: 0.4 });
  const st = [new THREE.Group(), new THREE.Group(), new THREE.Group()]; g.add(...st);
  st[0].add(box(3.0, 0.14, 0.9, 0x2a2a2e, 0, 0.56, 0));
  const wopt = { tire: 0xdedad0, spoke: 0x9a6a3a, n: 6, thick: 0.06 };
  for (const [x, z] of [[1.05, 0.62], [1.05, -0.62], [-1.05, 0.62], [-1.05, -0.62]]) { const w = wheel(0.44, wopt); w.position.set(x, 0.44, z); st[0].add(w); }
  st[0].add(box(0.5, 0.35, 0.5, 0x55555a, 0.95, 0.8, 0));
  st[1].add(mesh(new THREE.BoxGeometry(0.85, 0.52, 0.72), blk, 1.0, 0.92, 0), box(0.08, 0.62, 0.78, brass, 1.45, 0.92, 0));
  st[1].add(mesh(new THREE.BoxGeometry(1.75, 0.5, 1.15), blk, -0.35, 0.9, 0), box(0.5, 0.12, 1.0, 0x5a3a22, -0.2, 1.2, 0), box(0.5, 0.12, 1.0, 0x5a3a22, -0.95, 1.2, 0), box(0.1, 0.5, 1.0, 0x5a3a22, -0.45, 1.4, 0), box(0.1, 0.5, 1.0, 0x5a3a22, -1.2, 1.4, 0));
  for (const z of [0.72, -0.72]) st[1].add(mesh(new THREE.BoxGeometry(0.95, 0.05, 0.3), blk, 1.05, 0.93, z), mesh(new THREE.BoxGeometry(0.95, 0.05, 0.3), blk, -1.05, 0.93, z), mesh(new THREE.BoxGeometry(1.2, 0.05, 0.26), blk, 0, 0.52, z));
  st[2].add(mesh(new THREE.BoxGeometry(2.0, 0.08, 1.2), blk, -0.3, 2.05, 0));
  for (const [x, z] of [[0.55, 0.55], [0.55, -0.55], [-1.2, 0.55], [-1.2, -0.55]]) st[2].add(box(0.05, 0.95, 0.05, 0x1c1c1f, x, 1.6, z));
  st[2].add(box(0.04, 0.5, 1.05, M(0xbfe3ff, { transparent: true, opacity: 0.35 }), 0.56, 1.5, 0), sph(0.13, M(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.7 }), 1.52, 0.95, 0.5), sph(0.13, M(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.7 }), 1.52, 0.95, -0.5));
  rot(st[2].children[0], 0, 0, -0.02);
  g.userData.stage = (n) => st.forEach((s, i) => s.visible = i <= n);
  return g;
}
function carProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.1, 0.3); s.lineTo(-2.18, 0.62); s.quadraticCurveTo(-2.15, 0.9, -1.75, 0.95); s.lineTo(1.0, 0.95);
  s.quadraticCurveTo(1.9, 0.85, 2.15, 0.62); s.lineTo(2.18, 0.34); s.lineTo(-2.1, 0.3);
  return s;
}
function ev(color, withDriver = true) {
  const g = new THREE.Group(), paint = M(color, { roughness: 0.25, metalness: 0.45, flatShading: false });
  g.add(mesh(new THREE.ExtrudeGeometry(carProfile(), { depth: 1.6, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 10 }), paint, 0, 0, -0.8));
  const cab = new THREE.Shape(); cab.moveTo(-1.5, 0.95); cab.quadraticCurveTo(-1.2, 1.66, -0.6, 1.68); cab.lineTo(0.2, 1.66); cab.quadraticCurveTo(0.8, 1.5, 1.2, 0.95); cab.lineTo(-1.5, 0.95);
  const glass = mesh(new THREE.ExtrudeGeometry(cab, { depth: 1.4, bevelEnabled: false, curveSegments: 10 }), M(0xbfe6ff, { transparent: true, opacity: 0.3, roughness: 0.1, flatShading: false, depthWrite: false }), 0, 0, -0.7);
  glass.castShadow = false; glass.renderOrder = 2; g.add(glass);
  const wh = [];
  for (const [x, z] of [[1.35, 0.84], [1.35, -0.84], [-1.3, 0.84], [-1.3, -0.84]]) {
    const w = new THREE.Group(); w.add(rot(cyl(0.4, 0.4, 0.26, 0x18181b, 0, 0, 0, 20), Math.PI / 2), rot(cyl(0.25, 0.25, 0.28, 0xd8dde3, 0, 0, 0, 5), Math.PI / 2));
    w.position.set(x, 0.4, z); g.add(w); wh.push(w);
  }
  const glowM = (c, i) => M(c, { emissive: c, emissiveIntensity: i });
  g.add(box(0.06, 0.07, 1.5, glowM(0xdff6ff, 2), 2.2, 0.66, 0), box(0.06, 0.07, 1.5, glowM(0xff3344, 2), -2.22, 0.72, 0), box(4.0, 0.04, 0.05, glowM(0x6fe3ff, 1.2), 0, 0.36, 0.9));
  g.add(glow(0xcfefff, 3.2, 2.5, 0.66, 0, 0.9), glow(0xff3344, 2.4, -2.5, 0.72, 0, 0.8), glow(color, 6, 0, 0.1, 0.9, 0.35));
  let man = null;
  if (withDriver) { man = stickman(); man.position.set(-0.25, 0.78, 0); g.add(man); }
  g.userData.update = (x, t) => { g.position.x = x; wh.forEach(w => w.rotation.z = -x / 0.4); if (man) pose(man, sitPose(0.75, 0.03 * Math.sin(t * 2))); };
  return g;
}

// ---------- scenes ----------
const S = [];
const focus = new THREE.Vector3();
function look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); focus.set(tx, 0, 0); }

// 1 — the age of the horse
{
  const g = countryside(11), rig = horseCart(); g.add(rig);
  const s = sph(4, new THREE.MeshBasicMaterial({ color: 0xfff4c2, fog: false }), 30, 42, -160, 2); s.castShadow = false; g.add(s, glow(0xfff0b0, 60, 30, 42, -159, 0.9));
  S.push({ g, year: 'LONG AGO', label: 'The Age of the Horse', sky: sky([[0, '#1e7bff'], [0.45, '#5fc0ff'], [0.72, '#c9f0ff']]), fog: [0xc9f0ff, 80, 300],
    sun: [0xfff2d6, 2.6, [12, 22, 14]], hemi: [0xdff1ff, 0x6fd44b, 1.55],
    update(t, d) { const x = -7 + 1.55 * t; rig.userData.update(x, t); look(x + 7.5 - 2.5 * smooth(t / d), 3.0, 13.5, x + 1.7, 1.75, 0); } });
}
// 2 — Cugnot's steam wagon, 1769
{
  const g = town(22), rig = fardier(); g.add(rig);
  const wall = new THREE.Group(), r = RNG(5);
  for (let y = 0; y < 8; y++) for (let z = 0; z < 9; z++) wall.add(box(0.5, 0.3, 0.68, [0xa8553f, 0x9c4a3a, 0xb5644a][r() * 3 | 0], 0, 0.15 + y * 0.31, -2.6 + z * 0.7 + (y % 2) * 0.35));
  g.add(wall);
  S.push({ g, year: '1769', label: "Cugnot's Steam Wagon · France", sky: sky([[0, '#2a86ff'], [0.5, '#7fd0ff'], [0.75, '#ffe9c2']]), fog: [0xffe9c2, 70, 220],
    sun: [0xffeccc, 2.5, [10, 20, 16]], hemi: [0xe8f2ff, 0xc9b08a, 1.55],
    update(t, d) {
      const tHit = d - 1.75, v = 0.92, x0 = -3.2 - v * tHit;
      wall.position.x = -3.2 + 3.75;
      const after = Math.max(0, t - tHit), hit = after > 0;
      const x = hit ? -3.2 - 0.22 * (1 - Math.exp(-after * 6)) : x0 + v * t;
      rig.userData.update(x, t, hit ? Math.exp(-after * 1.2) : 0, hit);
      rig.rotation.z = hit ? 0.04 * Math.exp(-after * 5) * Math.sin(after * 30) : 0;
      wall.rotation.z = hit ? -0.05 * (1 - Math.exp(-after * 8)) : 0;
      const sh = hit ? 0.22 * Math.exp(-after * 5) * Math.sin(after * 55) : 0;
      look(x + 6.5 - 2 * smooth(t / d), 3.1 + sh, 14, x + 1.0 + sh, 1.9, 0);
    } });
}
// 3 — Otto's four-stroke engine, 1876
let engineAngle = 0;
{
  const g = new THREE.Group(), r = RNG(3);
  const floor = mesh(new THREE.PlaneGeometry(40, 16), 0xd9a066, 0, 0, 2); floor.rotation.x = -Math.PI / 2; g.add(floor);
  for (let i = -20; i < 20; i++) { const p = box(0.04, 0.01, 16, 0xb07a45, i, 0.006, 2); p.castShadow = false; g.add(p); }
  g.add(box(40, 12, 0.4, 0x2a9d8f, 0, 6, -3.6), box(40, 2.6, 0.5, 0xc8553d, 0, 1.3, -3.5), box(40, 0.16, 0.56, 0xffd166, 0, 2.66, -3.5));
  const shaft = mesh(new THREE.PlaneGeometry(2.6, 9), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), -1.6, 2.6, -1.4); shaft.rotation.set(-0.5, 0, -0.55); shaft.castShadow = shaft.receiveShadow = false; g.add(shaft);
  g.add(glow(0xffe2a0, 7, -3.4, 5.2, -3.1, 0.6), glow(0xffd98a, 5, 0.6, 6.4, -0.5, 0.8));
  const gears = [[5.6, 5.4, 0.7, 0xffb703], [6.55, 4.75, 0.45, 0xe63946], [-6.2, 4.6, 0.6, 0xffb703]].map(([x, y, rr, c], i) => { const w = wheel(rr, { tire: c, spoke: c, n: 4, thick: 0.09 }); w.position.set(x, y, -3.3); g.add(w); tick(g, t => w.rotation.z = t * (i % 2 ? -1.6 : 1) ); return w; });
  g.add(box(1.0, 0.6, 0.6, 0xe63946, -4.4, 0.3, -2.4), box(0.7, 0.5, 0.5, 0x1d9bf0, -4.3, 0.85, -2.4), cyl(0.4, 0.4, 1.0, 0xffb703, 5.3, 0.5, -2.3, 10), cyl(0.3, 0.22, 0.5, 0xd1603d, -5.6, 0.25, -2.2, 8), sph(0.5, 0x3fbf4f, -5.6, 0.85, -2.2));
  g.add(box(2.6, 3.2, 0.2, 0x5a3d28, -3.4, 5.2, -3.4), box(2.3, 2.9, 0.22, M(0xfff0c0, { emissive: 0xffe2a0, emissiveIntensity: 0.9 }), -3.4, 5.2, -3.36), box(0.1, 2.9, 0.26, 0x5a3d28, -3.4, 5.2, -3.34), box(2.3, 0.1, 0.26, 0x5a3d28, -3.4, 5.2, -3.34));
  g.add(box(2.0, 1.4, 0.06, 0x2f5f9e, 2.9, 5.6, -3.36), box(1.5, 0.04, 0.08, 0xdfeaf7, 2.9, 5.9, -3.33), box(1.1, 0.04, 0.08, 0xdfeaf7, 2.75, 5.6, -3.33), mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 20), 0xdfeaf7, 3.2, 5.35, -3.3));
  g.add(box(3.4, 0.12, 0.6, 0x6f4a33, 2.6, 3.4, -3.2));
  for (let i = 0; i < 6; i++) g.add(box(0.3 + r() * 0.25, 0.3 + r() * 0.45, 0.35, [0xc0563f, 0x3f7fb0, 0xd9a441, 0x6a8f4e][r() * 4 | 0], 1.2 + i * 0.55, 3.7, -3.2));
  g.add(box(4.4, 0.16, 1.5, 0x7a5230, 0.9, 1.05, -1.2));
  for (const [x, z] of [[-1.1, -0.6], [2.9, -0.6], [-1.1, -1.8], [2.9, -1.8]]) g.add(box(0.16, 1.0, 0.16, 0x5f3f25, x, 0.5, z));
  const iron = M(0x4a4d55, { metalness: 0.6, roughness: 0.45 }), brass = M(0xc9a23f, { metalness: 0.6, roughness: 0.4 });
  const E = new THREE.Group(); E.position.set(0.7, 1.13, -1.2); g.add(E);
  E.add(mesh(new THREE.BoxGeometry(3.0, 0.2, 0.9), iron, 0.2, 0.1, 0), mesh(new THREE.BoxGeometry(0.3, 0.7, 0.7), iron, -0.3, 0.5, 0), mesh(new THREE.BoxGeometry(0.3, 0.9, 0.5), iron, 1.5, 0.6, -0.1));
  E.add(rot(mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 18), M(0x7c8089, { metalness: 0.5, roughness: 0.4, flatShading: false }), -0.75, 0.85, 0), 0, 0, Math.PI / 2));
  for (let i = 0; i < 4; i++) E.add(rot(mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 20), iron, -1.15 + i * 0.26, 0.85, 0), 0, Math.PI / 2));
  const rod = rot(cyl(0.06, 0.06, 1.3, brass, 0, 0.85, 0, 8), 0, 0, Math.PI / 2); E.add(rod);
  const fly = wheel(0.85, { tire: 0x3a3d45, spoke: 0x6a6e78, n: 3, thick: 0.1 }); fly.position.set(1.5, 1.0, 0.45); E.add(fly);
  const pin = sph(0.09, brass, 0, 0, 0); E.add(pin);
  const conn = box(1.0, 0.07, 0.07, brass, 0, 0, 0.42); E.add(conn);
  E.add(cyl(0.07, 0.07, 1.0, iron, -1.0, 1.6, 0, 8), cyl(0.1, 0.07, 0.16, iron, -1.0, 2.15, 0, 8));
  const spark = sph(0.2, new THREE.MeshBasicMaterial({ color: 0xffd45e, transparent: true }), -1.38, 0.85, 0.3); spark.castShadow = false; E.add(spark); const sg = glow(0xffb347, 2.6, -1.38, 0.85, 0.5, 0); E.add(sg);
  const ex = puffs(6, 0xe8e8e8); ex.position.set(-1.0, 2.3, 0); E.add(ex);
  g.add(cyl(0.02, 0.02, 3.4, 0x222222, 0.6, 8.3, -0.6, 5), mesh(new THREE.ConeGeometry(0.55, 0.4, 12, 1, true), M(0x2f4f3a, { side: THREE.DoubleSide }), 0.6, 6.6, -0.6), sph(0.16, new THREE.MeshBasicMaterial({ color: 0xfff0b0 }), 0.6, 6.45, -0.6));
  const lamp = new THREE.PointLight(0xffd9a0, 60, 30, 1.6); lamp.position.set(0.6, 6.2, -0.6); g.add(lamp);
  const otto = stickman(); otto.position.set(-1.55, STAND_Y, 0.5); g.add(otto);
  const helper = stickman({ scale: 0.92, face: -1 }); helper.position.set(3.35, STAND_Y * 0.92, 0.6); g.add(helper);
  S.push({ g, year: '1876', label: "Otto's Four-Stroke Engine · Germany", sky: sky([[0, '#1f6f66'], [1, '#2a9d8f']]), fog: [0x2a9d8f, 60, 160],
    sun: [0xffe6c4, 1.9, [-6, 14, 16]], hemi: [0xfff3e0, 0xd9a066, 1.35],
    update(t, d) {
      const a = engineAngle = t * 4.2; fly.rotation.z = -a;
      const cx = 1.5 + 0.5 * Math.cos(-a), cy = 1.0 + 0.5 * Math.sin(-a), px = cx - Math.sqrt(1.15 * 1.15 - (cy - 0.85) ** 2);
      pin.position.set(cx, cy, 0.42); rod.position.x = px - 0.65;
      conn.position.set((cx + px) / 2, (cy + 0.85) / 2, 0.42); conn.rotation.z = Math.atan2(cy - 0.85, cx - px); conn.scale.x = 1.15;
      const cyc = (a / (4 * Math.PI)) % 1, fire = cyc > 0.5 && cyc < 0.62;
      spark.material.opacity = fire ? 1 : 0; sg.material.opacity = fire ? 1 : 0; spark.scale.setScalar(fire ? 1 + (cyc - 0.5) * 12 : 0.01);
      ex.userData.update(t, 0.33, 0.5, 2.0, 0.5, 0.8);
      pose(otto, { hipL: 0.1, hipR: -0.1, shL: 1.25 + 0.12 * Math.sin(t * 2.1), elL: 0.25, shR: -0.25, elR: 0.9, lean: 0.08, head: -0.05 });
      pose(helper, t > d * 0.55 ? cheerPose(t) : { hipL: 0.08, hipR: -0.08, shL: 0.5, elL: 1.6, shR: -0.1, lean: 0.05 });
      helper.position.y = STAND_Y * 0.92 + (t > d * 0.55 ? 0.12 * Math.abs(Math.sin(t * 6)) : 0);
      const p = smooth(t / d); look(lerp(-1.6, 2.4, p), lerp(3.8, 3.2, p), lerp(16, 13.6, p), 0.9, 2.3, -1);
    } });
}
// 4 — Benz Patent-Motorwagen, 1886
{
  const g = town(44, { pal: [0xffc857, 0xff8c69, 0x6fd6b5, 0xffa3c0, 0x7fbcf7, 0xfff2b8, 0xb99cf0] });
  confetti(g, 110, 9, -8, 16);
  const benz = stickman({ hat: 'top' }), rig = motorwagen(benz); g.add(rig);
  const crowd = [];
  for (let i = 0; i < 9; i++) { const f = stickman({ hat: [null, 'top', 'bonnet', 'cap'][i % 4], skirt: i % 4 === 2, scale: i % 3 === 1 ? 0.7 : 1 }); f.position.set(-4 + i * 2.7 + (i % 2) * 0.6, STAND_Y * (i % 3 === 1 ? 0.7 : 1) + 0.16, -2.9 - (i % 2) * 0.5); g.add(f); crowd.push(f); }
  S.push({ g, year: '1886', label: 'Benz Patent-Motorwagen · The First Car', sky: sky([[0, '#2f6fff'], [0.5, '#6fc8ff'], [0.75, '#d9f6ff']]), fog: [0xd9f6ff, 70, 220],
    sun: [0xfff1d6, 2.6, [-10, 22, 15]], hemi: [0xe8f2ff, 0xc9b08a, 1.55],
    update(t, d) {
      const x = -6 + 1.7 * t; rig.userData.update(x, t);
      crowd.forEach((f, i) => { const near = Math.abs(f.position.x - x) < 3.2; pose(f, near ? cheerPose(t + i) : standPose(0.05 * Math.sin(t * 2 + i))); f.userData.body.scale.x = Math.abs(f.userData.body.scale.x) * (f.position.x > x ? -1 : 1); });
      const p = smooth(t / d); look(x + lerp(6, 2.5, p), lerp(3.2, 2.5, p), lerp(13, 10.5, p), x + 0.2, 1.55, 0);
    } });
}
// 5 — Bertha Benz's road trip, 1888
{
  const g = countryside(55, { grass: 0x9fd43f, road: 0xf0b25e, hill: 0x4fae45, cloudTint: 0xffb3c6, mount: 0x8a63d2, birdCol: 0x3a1f4a });
  const bertha = stickman({ hat: 'bonnet', skirt: true }), rig = motorwagen(bertha); g.add(rig);
  const s = sph(9, new THREE.MeshBasicMaterial({ color: 0xffc27a, fog: false }), 25, 14, -200, 2); s.castShadow = false; g.add(s, glow(0xffa24a, 150, 25, 14, -199, 1), glow(0xff6f91, 260, 25, 14, -198, 0.45));
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x2 = c.getContext('2d');
  x2.fillStyle = '#f7efd9'; x2.fillRect(0, 0, 512, 256); x2.strokeStyle = '#3a2a1a'; x2.lineWidth = 12; x2.strokeRect(6, 6, 500, 244);
  x2.fillStyle = '#3a2a1a'; x2.textAlign = 'center'; x2.font = 'bold 76px sans-serif'; x2.fillText('PFORZHEIM', 256, 110); x2.font = 'bold 84px sans-serif'; x2.fillText('106 km  →', 256, 210);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Group(); sign.add(box(0.14, 2.4, 0.14, 0x6b4a2b, 0, 1.2, 0), mesh(new THREE.BoxGeometry(2.2, 1.1, 0.08), [0, 0, 0, 0, 1, 0].map(k => k ? new THREE.MeshStandardMaterial({ map: tex }) : M(0x6b4a2b)), 0, 2.5, 0.08));
  sign.position.set(9.5, 0, -2.9); g.add(sign);
  const fans = [stickman({ scale: 0.7 }), stickman({ scale: 0.75, hat: 'cap' })];
  fans[0].position.set(13.2, STAND_Y * 0.7, -2.9); fans[1].position.set(14.3, STAND_Y * 0.75, -3.1); g.add(...fans);
  S.push({ g, year: '1888', label: "Bertha Benz · The First Road Trip", sky: sky([[0, '#3b2fb0'], [0.3, '#c2459a'], [0.5, '#ff7a59'], [0.66, '#ffc247'], [0.78, '#fff0a8']]), fog: [0xffc98a, 60, 260],
    sun: [0xffc48a, 2.7, [16, 11, 12]], hemi: [0xffd9d0, 0x9fd43f, 1.45],
    update(t, d) {
      const x = -8 + 2.3 * t; rig.userData.update(x, t);
      fans.forEach((f, i) => { pose(f, cheerPose(t + i)); f.position.y = STAND_Y * (0.7 + i * 0.05) + 0.1 * Math.abs(Math.sin(t * 6 + i)); f.userData.body.scale.x = Math.abs(f.userData.body.scale.x) * (f.position.x > x ? -1 : 1); });
      const p = smooth(t / d); look(x + lerp(8, 3.2, p), lerp(5.0, 2.5, p), lerp(16, 10.5, p), x + 0.3, 1.6, 0);
    } });
}
// 6 — Ford Model T & the assembly line, 1908
{
  const g = new THREE.Group();
  const floor = mesh(new THREE.PlaneGeometry(90, 30), 0x6fa8dc, 0, 0, 4); floor.rotation.x = -Math.PI / 2; g.add(floor);
  g.add(box(90, 14, 0.5, 0xffe2a8, 0, 7, -6.5), box(90, 2.4, 0.6, 0xd1493a, 0, 1.2, -6.4));
  { const st = box(90, 0.02, 0.5, 0xffd23f, 0, 0.012, 2.9); st.castShadow = false; const st2 = box(90, 0.02, 2.4, 0x4f86c6, 0, 0.011, 4.6); st2.castShadow = false; g.add(st, st2); }
  for (let x = -36; x <= 36; x += 4.5) {
    g.add(box(2.6, 5.5, 0.2, M(0xdff1ff, { emissive: 0x8fd4ff, emissiveIntensity: 0.9 }), x, 6.2, -6.2), box(0.1, 5.5, 0.26, 0x55585e, x, 6.2, -6.18), box(2.6, 0.1, 0.26, 0x55585e, x, 6.2, -6.18), box(2.6, 0.1, 0.26, 0x55585e, x, 7.8, -6.18), box(2.6, 0.1, 0.26, 0x55585e, x, 4.6, -6.18));
    g.add(box(0.5, 14, 0.5, 0x2a9d8f, x + 2.25, 7, -6.0), box(1.1, 2.4, 0.06, [0xe63946, 0x1d9bf0, 0xffb703][((x + 36) / 4.5 | 0) % 3], x + 2.25, 8.2, -5.7));
    const sh = mesh(new THREE.PlaneGeometry(2.4, 11), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), x + 1.2, 3.6, -3.4); sh.rotation.set(-0.55, 0, -0.35); sh.castShadow = sh.receiveShadow = false; g.add(sh);
  }
  g.add(box(90, 0.5, 2.6, 0x2f3b52, 0, 0.25, 0), box(90, 0.06, 0.16, 0xf2c230, 0, 0.5, 1.3), box(90, 0.06, 0.16, 0xf2c230, 0, 0.5, -1.3));
  const rollers = []; for (let i = 0; i < 60; i++) { const b = box(0.12, 0.03, 2.2, 0x5a5e66, 0, 0.515, 0); b.castShadow = false; g.add(b); rollers.push(b); }
  for (let x = -30; x <= 30; x += 7.5) { g.add(box(0.3, 0.3, 12, 0xe63946, x, 9.6, -1), cyl(0.02, 0.02, 1.6, 0x222222, x + 2, 8.8, 0.5, 5), mesh(new THREE.ConeGeometry(0.6, 0.4, 12, 1, true), M(0x2f4f3a, { side: THREE.DoubleSide }), x + 2, 7.9, 0.5), sph(0.17, new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), x + 2, 7.75, 0.5), glow(0xffe08a, 4.5, x + 2, 7.7, 0.7, 0.7));
    g.add(box(1.1, 1.1, 1.1, [0xe63946, 0xffb703, 0x2a9d8f][(x / 7.5 + 4 | 0) % 3], x + 1, 0.55, 5.6), box(0.9, 0.9, 0.9, [0x1d9bf0, 0xe63946, 0xffb703][(x / 7.5 + 4 | 0) % 3], x + 2.2, 0.45, 5.9), cyl(0.4, 0.4, 1.0, 0x1d9bf0, x - 1.2, 0.5, 5.4, 10)); }
  g.add(box(90, 0.3, 0.3, 0xe63946, 0, 9.6, 0.5));
  const cars = []; for (let i = 0; i < 7; i++) { const c = modelT(); c.position.y = 0.5; g.add(c); cars.push(c); }
  const crew = [[-3.1, 1.9, 1, 'cap'], [1.6, 1.9, -1, null], [-5.2, -1.9, 1, null], [-0.8, -1.9, 1, 'cap'], [3.6, -1.9, -1, null]].map(([x, z, face, hat], i) => {
    const f = stickman({ hat, face }); f.position.set(x, STAND_Y, z); f.userData.i = i; g.add(f);
    const sp = glow(0xffc247, 1.1, x + face * 0.75, 1.75, z + 0.05, 0); g.add(sp); tick(g, t => { const k = Math.sin(t * 8 + i * 1.7); sp.material.opacity = k > 0.75 ? 1 : 0; sp.scale.setScalar(0.8 + ((t * 37 + i) % 1) * 0.9); });
    return f;
  });
  const ford = stickman({ hat: 'top', face: -1 }); ford.position.set(3.9, STAND_Y, 3.4); g.add(ford);
  S.push({ g, year: '1908', label: 'Ford Model T · The Assembly Line', sky: sky([[0, '#e8b86a'], [1, '#ffe2a8']]), fog: [0xffe2a8, 60, 160],
    sun: [0xfff4e0, 2.3, [-8, 18, 14]], hemi: [0xf7fbff, 0x6fa8dc, 1.6],
    update(t, d) {
      const v = 1.5, sp = 4.5, off = (t * v) % sp;
      cars.forEach((c, i) => { const x = -13.5 + i * sp + off; c.position.x = x; c.userData.stage(x < -5.2 ? 0 : x < -0.7 ? 1 : 2); });
      rollers.forEach((b, i) => b.position.x = -22 + ((i * 0.75 + t * v) % 45));
      crew.forEach(f => { const k = f.userData.i, w = Math.sin(t * 8 + k * 1.7); pose(f, { hipL: 0.12, hipR: -0.12, shL: 1.35 + 0.35 * w, elL: 0.35 - 0.3 * w, shR: 1.0 - 0.3 * w, elR: 0.6, lean: 0.14 + 0.05 * w }); });
      pose(ford, { hipL: 0.08, hipR: -0.08, shL: 1.7 + 0.1 * Math.sin(t * 3), elL: 0.1, shR: -0.2, elR: 1.2 });
      const p = smooth(t / d); look(lerp(-4.5, 4.0, p), lerp(6.2, 5.0, p), lerp(21, 18.5, p), lerp(-1.2, 0.6, p), 1.7, 0);
    } });
}
// 7 — today
{
  const g = new THREE.Group(), r = RNG(77);
  const ground = mesh(new THREE.PlaneGeometry(500, 300), 0x2b2f5a, 40, 0, -60); ground.rotation.x = -Math.PI / 2; ground.castShadow = false; g.add(ground);
  const rd = box(500, 0.04, 8.6, 0x1f2347, 40, 0.02, -1.6); rd.castShadow = false; g.add(rd);
  g.add(box(500, 0.2, 2.6, 0x5a5fa8, 40, 0.1, -7.2), box(500, 0.2, 2.2, 0x5a5fa8, 40, 0.1, 3.8), box(500, 0.03, 0.12, new THREE.MeshBasicMaterial({ color: 0x00e5ff }), 40, 0.21, -5.95), box(500, 0.03, 0.12, new THREE.MeshBasicMaterial({ color: 0xff3df0 }), 40, 0.21, 2.75));
  for (let x = -40; x < 200; x += 3.2) { const dsh = box(1.5, 0.02, 0.14, 0xe8e8e8, x, 0.05, -1.6); dsh.castShadow = false; g.add(dsh); }
  const winTex = (seed) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'), q = RNG(seed);
    x.fillStyle = '#000'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) if (q() < 0.62) { x.fillStyle = ['#ffd23f', '#fff1c9', '#4cc9f0', '#ff8a3d', '#ff5fd2', '#7dffb0'][q() * 6 | 0]; x.fillRect(i * 8 + 2, j * 8 + 2, 4, 5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
  };
  const texs = [winTex(1), winTex(2), winTex(3)];
  for (let row = 0; row < 3; row++) {
    let x = -50;
    while (x < 200) {
      const w = 5 + r() * 5, h = (row === 0 ? 9 : 16) + r() * (row === 0 ? 14 : 30), dp = 6 + r() * 3;
      const b = mesh(new THREE.BoxGeometry(w, h, dp), new THREE.MeshStandardMaterial({ color: [0x3a3f9e, 0x5a3fa8, 0x2f4fb8, 0x7a3f9a][r() * 4 | 0], emissive: 0xffffff, emissiveMap: texs[r() * 3 | 0], emissiveIntensity: 1.15, roughness: 0.6 }), x + w / 2, h / 2, -12.5 - row * 12 - r() * 3);
      b.castShadow = row === 0; g.add(b);
      const nc = [0x00e5ff, 0xff3df0, 0xffd23f, 0x7dff6a, 0xff6b35][r() * 5 | 0], bz = b.position.z + dp / 2;
      g.add(box(w + 0.1, 0.18, dp + 0.1, new THREE.MeshBasicMaterial({ color: nc }), x + w / 2, h + 0.09, b.position.z));
      if (row === 0) { const sy = 3.5 + r() * 3; g.add(box(w * 0.55, 0.9, 0.12, new THREE.MeshBasicMaterial({ color: nc }), x + w / 2, sy, bz + 0.08), glow(nc, 7, x + w / 2, sy, bz + 0.6, 0.55), box(0.35, 3.2, 0.3, new THREE.MeshBasicMaterial({ color: [0xff3df0, 0x00e5ff, 0xffd23f][r() * 3 | 0] }), x + 0.5, h * 0.6, bz + 0.2)); }
      if (r() < 0.3) g.add(cyl(0.05, 0.05, 4, 0x8890a8, x + w / 2, h + 2, -12.5 - row * 12, 5), sph(0.14, new THREE.MeshBasicMaterial({ color: 0xff5566 }), x + w / 2, h + 4, -12.5 - row * 12));
      x += w + 0.6 + r() * 2;
    }
  }
  for (let x = -38; x < 200; x += 8) {
    g.add(cyl(0.06, 0.08, 4.4, 0x9aa3b8, x, 2.2, -6.3, 6), box(1.2, 0.07, 0.1, 0x9aa3b8, x, 4.4, -5.8), box(0.5, 0.06, 0.2, new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), x, 4.34, -5.3), glow(0xffe9a8, 4.5, x, 4.3, -5.2, 0.8), glow(0xffe9a8, 5, x, 0.3, -5.2, 0.18));
    const tr = new THREE.Group(); tr.add(cyl(0.1, 0.13, 1.3, 0x4a3a2e, 0, 0.65, 0, 6), sph(0.95, 0x1fd18a, 0, 2.0, 0)); for (let k = 0; k < 6; k++) tr.add(sph(0.07, new THREE.MeshBasicMaterial({ color: FLOWERS[k] }), Math.cos(k * 1.1) * 0.9, 2 + Math.sin(k * 2.3) * 0.6, Math.sin(k * 1.1) * 0.9)); tr.position.set(x + 4, 0.2, -7.4); g.add(tr);
  }
  // charging station
  const ch = new THREE.Group(); ch.add(box(0.5, 1.6, 0.4, 0xeef2f7, 0, 0.9, 0), box(0.34, 0.4, 0.05, new THREE.MeshBasicMaterial({ color: 0x38e0a0 }), 0, 1.25, 0.22), box(0.52, 0.08, 0.42, new THREE.MeshBasicMaterial({ color: 0x38e0a0 }), 0, 1.74, 0));
  g.add(ch);
  const st = new THREE.Group(), sm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  for (let i = 0; i < 90; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.22 + r() * 0.25, 4, 3), sm); p.position.set(-150 + r() * 400, 70 + r() * 150, -260); st.add(p); }
  g.add(st);
  const moon = sph(7, new THREE.MeshBasicMaterial({ color: 0xfff6dd, fog: false }), -22, 132, -255, 2); moon.castShadow = false; g.add(moon, glow(0xcfe0ff, 70, -22, 132, -254, 0.7));
  const car = ev(0x00b4ff); g.add(car);
  const traffic = [[0xff5a5f, -3.4, -5.5, 30], [0xf2f2f2, -3.4, -6.5, 68], [0xffc93c, -3.4, -5, 104], [0x8a6cff, 2.0, 4.2, -30]].map(([c, z, v, x0]) => { const e = ev(c, false); e.position.z = z; if (v < 0) e.rotation.y = Math.PI; e.userData.v = v; e.userData.x0 = x0; g.add(e); return e; });
  const pals = [stickman({ face: -1 }), stickman({ face: -1, skirt: true, scale: 0.95 }), stickman({ face: -1, scale: 0.6 })];
  g.add(...pals);
  S.push({ g, year: 'TODAY', label: '1+ Billion Cars on the Road', sky: sky([[0, '#0a0f4a'], [0.3, '#4b1fa8'], [0.52, '#e0408f'], [0.66, '#ff8a3d'], [0.78, '#ffd76a']]), fog: [0x7a2f9a, 70, 260],
    sun: [0xffb48a, 2.0, [-14, 12, 14]], hemi: [0xc4b8ff, 0x5a4fa8, 1.8],
    update(t, d) {
      const tStop = d - 4.6, xEnd = 44, v = 4.2;
      const x = t < tStop - 2 ? xEnd - 4.2 - v * (tStop - 2 - t) : xEnd - 4.2 * (1 - smooth((t - (tStop - 2)) / 2)) ** 1;
      car.userData.update(x, t);
      ch.position.set(xEnd + 0.2, 0.2, 2.9);
      traffic.forEach(e => { const tx = e.userData.x0 + e.userData.v * t; e.position.x = tx; e.children.forEach(o => { if (o.type === 'Group') o.rotation.z = -tx / 0.4; }); });
      pals.forEach((f, i) => { const sc = [1, 0.95, 0.6][i]; f.position.set(xEnd + 3.2 + i * 0.95, STAND_Y * sc + 0.2 + (t > tStop - 2.5 ? 0.1 * Math.abs(Math.sin(t * 6 + i)) : 0), 3.3 + (i % 2) * 0.3); pose(f, t > tStop - 2.5 ? cheerPose(t + i) : standPose()); });
      const e = smooth((t - tStop) / 4);
      look(x + 6.5 - 3 * smooth(t / tStop) + e * 4, 3.0 + e * 4.5, 13 + e * 7, x + 0.6 + e * 1.5, 1.6 + e * 2.2, 0);
    } });
}
S.forEach(s => { s.g.visible = false; scene.add(s.g); });

// ---------- overlay ----------
const STROKES = ['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'];
$('strokes').innerHTML = STROKES.map(s => `<span>${s}</span>`).join('');
const subs = TL.scenes.flatMap(s => s.subs);
function overlay(t, i, lt, d) {
  const s = S[i], first = i === 0, last = i === S.length - 1;
  const tIn = first ? 3.4 : 0.35, tOut = last ? d - 4.0 : d - 0.45;
  const a = smooth((lt - tIn) / 0.5) * (1 - smooth((lt - tOut) / 0.4));
  $('year').textContent = s.year; $('label').textContent = s.label;
  $('head').style.opacity = a; $('head').style.transform = `translateY(${(1 - smooth((lt - tIn) / 0.5)) * -40}px)`;
  const ta = first ? smooth(lt / 0.8) * (1 - smooth((lt - 2.7) / 0.5)) : 0;
  $('title').style.opacity = ta; $('title').style.transform = `scale(${0.94 + 0.06 * smooth(lt / 3)})`;
  const ea = last ? smooth((lt - (d - 3.6)) / 0.8) : 0;
  $('end').style.opacity = ea; $('endShade').style.opacity = ea; $('end').style.transform = `translateY(${(1 - ea) * 30}px)`;
  $('strokes').style.opacity = i === 2 ? smooth((lt - 1) / 0.5) * (1 - smooth((lt - tOut) / 0.4)) : 0;
  if (i === 2) { const k = Math.floor(((engineAngle / (4 * Math.PI)) % 1) * 4);[...$('strokes').children].forEach((el, j) => el.className = j === k ? 'on' : ''); }
  const c = subs.find(c => t >= c.t0 - 0.05 && t < c.t1 + 0.12);
  $('sub').style.opacity = c ? 1 : 0;
  if (c) { $('sub').textContent = c.text; $('sub').style.transform = `translateX(-50%) scale(${0.92 + 0.08 * smooth((t - c.t0 + 0.05) / 0.12)})`; }
  let f = Math.max(1 - lt / 0.4, 1 - (d - lt) / 0.4, 0);
  if (first) f = Math.max(1 - lt / 0.8, 1 - (d - lt) / 0.4, 0);
  if (last) f = Math.max(1 - lt / 0.4, 1 - (d - lt) / 1.1, 0);
  $('fade').style.opacity = clamp(f);
  $('bar').style.width = (t / TL.duration * 100) + '%';
}

const camPos = new THREE.Vector3(), wp = new THREE.Vector3();
window.renderFrame = (t) => {
  t = clamp(t, 0, TL.duration - 1e-3);
  let i = TL.scenes.findIndex(s => t < s.end); if (i < 0) i = S.length - 1;
  const sc = TL.scenes[i], lt = t - sc.start, d = sc.end - sc.start, s = S[i];
  S.forEach((o, j) => o.g.visible = j === i);
  scene.background = s.sky; scene.fog = new THREE.Fog(...s.fog);
  sun.color.set(s.sun[0]); sun.intensity = s.sun[1];
  hemi.color.set(s.hemi[0]); hemi.groundColor.set(s.hemi[1]); hemi.intensity = s.hemi[2];
  s.update(lt, d);
  (s.g.userData.tick || []).forEach(f => f(lt));
  sun.target.position.copy(focus); sun.position.set(focus.x + s.sun[2][0] * 2, s.sun[2][1] * 2, s.sun[2][2] * 2);
  camera.updateMatrixWorld(); camPos.copy(camera.position);
  figures.forEach(f => { f.getWorldPosition(wp); f.rotation.y = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) * 0.85; });
  renderer.render(scene, camera);
  overlay(t, i, lt, d);
};
window.DURATION = TL.duration;
await document.fonts.ready;
await Promise.all(['500', '600', '800'].map(w => document.fonts.load(`${w} 40px Poppins`)));
window.renderFrame(0);
window.READY = true;
