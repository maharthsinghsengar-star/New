// "The Building of the Taj Mahal" — human-faced stick figures in a cel-shaded (anime-style) 3D world.
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

// ---------- human-faced stick figures: painted head + clothed torso, stick arms and legs ----------
import { drawHead, drawTorso, HEAD_W, HEAD_H, TORSO_W, TORSO_H, HIP_Y } from './humans.js';
const texCache = new Map();
function paintTex(key, w, h, draw) { if (!texCache.has(key)) texCache.set(key, canvasTex(w, h, draw)); return texCache.get(key); }
const EXPRS = ['smile', 'happy', 'sad', 'focus', 'wow', 'blink'];
const PX = 0.6 / TORSO_W;                                   // world units per torso pixel
function human(S, { scale = 1, face = 1, id = Math.random().toString(36) } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.set(scale * face, scale, scale);
  const torsoP = new THREE.Group(); body.add(torsoP);
  const key = JSON.stringify(S);
  const tt = paintTex('T' + key, TORSO_W, TORSO_H, x => drawTorso(x, S));
  const tw = TORSO_W * PX, th = TORSO_H * PX;
  const torso = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), new THREE.MeshBasicMaterial({ map: tt, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  torso.position.set(0, th / 2 - (TORSO_H - HIP_Y) * PX, 0.02); torso.castShadow = true; torsoP.add(torso);
  const heads = Object.fromEntries(EXPRS.map(e => [e, paintTex(`H${e}${key}`, HEAD_W, HEAD_H, x => drawHead(x, S, e))]));
  const hs = 0.66 / HEAD_W * 1.12, hw = HEAD_W * hs, hh = HEAD_H * hs;
  const head = new THREE.Group(); head.position.y = 0.93; torsoP.add(head);
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(hw, hh), new THREE.MeshBasicMaterial({ map: heads.smile, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  hm.position.set(0.02, (HEAD_H / 2 - 200) * hs, 0.04); hm.castShadow = true; head.add(hm);
  const limb = (l1, l2, y, parent, z) => { const a = seg(l1); a.position.set(0, y, z); const b = seg(l2); b.position.y = -l1; a.add(b); parent.add(a); return [a, b]; };
  const u = root.userData = { body, torsoP, head, hm, heads, expr: 'smile', seed: (id.charCodeAt(0) || 3) * 0.37 };
  u.armL = limb(0.33, 0.33, 0.56, torsoP, -0.05); u.armR = limb(0.33, 0.33, 0.56, torsoP, 0.07);
  u.legL = limb(0.43, 0.43, 0, body, -0.03); u.legR = limb(0.43, 0.43, 0, body, -0.01);
  u.prop = new THREE.Group(); u.armR[1].add(u.prop); u.prop.position.y = -0.36;
  figures.push(root); return root;
}
function face(f, expr, t) { const u = f.userData; let e = expr; if (e !== 'happy' && e !== 'sad' && ((t + u.seed * 7) % 3.7) < 0.12) e = 'blink'; if (u.expr !== e) { u.hm.material.map = u.heads[e]; u.expr = e; } }
const walkPose = (ph, carry = 0, sw = 1) => ({ hipL: 0.5 * Math.sin(ph) * sw, kneeL: -0.55 * Math.max(0, Math.sin(ph + 1.2)) * sw, hipR: -0.5 * Math.sin(ph) * sw, kneeR: -0.55 * Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * sw,
  shL: carry ? 2.9 : -0.45 * Math.sin(ph), elL: carry ? 0.35 : 0.2, shR: carry ? -2.9 : 0.45 * Math.sin(ph), elR: carry ? -0.35 : 0.2, lean: 0.04 });
const hammerPose = (t, sp = 9) => ({ hipL: 0.35, kneeL: -0.25, hipR: -0.25, kneeR: -0.1, shL: 0.6, elL: 0.9, shR: 1.0 + 0.9 * Math.max(0, Math.sin(t * sp)), elR: 0.9 + 0.5 * Math.sin(t * sp), lean: 0.22 });
const pointPose = (w = 0) => ({ hipL: 0.08, hipR: -0.08, shL: 0.15, elL: 0.2, shR: 1.55 + w, elR: 0.15, head: 0.08 });
const sadPose = (t) => ({ hipL: 0.1, hipR: -0.1, shL: 0.35, elL: 1.5, shR: 0.4, elR: 1.6, lean: 0.12, head: -0.2 });
const kneelPose = { hipL: 1.55, kneeL: -2.0, hipR: 0.25, kneeR: -1.9, shL: 0.6, elL: 1.4, shR: 0.7, elR: 1.5, lean: 0.25, head: -0.25 };
const vowPose = (t) => ({ hipL: 0.1, hipR: -0.1, shL: 0.1, elL: 0.2, shR: 2.6 + 0.08 * Math.sin(t * 3), elR: 0.2, head: 0.25 });
const handsTogether = { hipL: 0.06, hipR: -0.06, shL: 0.75, elL: 1.25, shR: 0.75, elR: 1.25 };
const cheer2 = (t, k = 0) => ({ hipL: 0.08, hipR: -0.08, shL: 2.7 + 0.3 * Math.sin(t * 8 + k), elL: 0.3, shR: -2.7 - 0.3 * Math.sin(t * 8 + k + 1), elR: -0.3, head: 0.1 });
const photoPose = { hipL: 0.08, hipR: -0.08, shL: 1.35, elL: 0.5, shR: 1.45, elR: 0.45, head: 0.05 };

// character wardrobe
const SKINS = ['#b9784a', '#c68a5c', '#a86d42', '#d39a6c', '#c07a50'];
const VIVID = ['#ff3d57', '#ffb300', '#00c853', '#2979ff', '#d500f9', '#ff6d00', '#00b8d4', '#f50057', '#7c4dff', '#64dd17', '#ffd600', '#1de9b6'];
const SHAHJAHAN = { skin: '#d9a072', beard: '#1b1210', hair: '#1b1210', turban: '#fff4dc', turbanBand: '#ffc93c', jewel: '#e0102f', kind: 'royal', cloth: '#ffb020', sash: '#e91e63', trim: '#ffc93c', pattern: 'rgba(255,255,255,.45)' };
const MUMTAZ = { skin: '#ecb990', female: true, hair: '#1b1210', veil: '#14c3b5', tikka: '#ffc93c', kind: 'lehenga', cloth: '#ff2d7a', top: '#ffc93c', trim: '#ffc93c', pattern: 'rgba(255,220,120,.6)', lips: '#d8264a' };
const ARCHITECT = { skin: '#c68a5c', beard: '#4a3a30', hair: '#1b1210', turban: '#00c853', turbanBand: '#ffd23f', kind: 'jama', cloth: '#7e57c2', sash: '#ffd23f', trim: '#ffd23f' };
function workerSpec(r) { const c = VIVID[r() * VIVID.length | 0]; let tb = VIVID[r() * VIVID.length | 0]; if (tb === c) tb = '#ffffff';
  return { skin: SKINS[r() * SKINS.length | 0], hair: '#1b1210', moustache: r() < 0.6, beard: r() < 0.15 ? '#1b1210' : undefined, turban: tb, kind: 'worker', cloth: c, sash: r() < 0.5 ? VIVID[r() * VIVID.length | 0] : undefined, pattern: r() < 0.3 ? 'rgba(255,255,255,.35)' : undefined }; }
function touristSpec(r) { const fem = r() < 0.5, c = VIVID[r() * VIVID.length | 0];
  return fem ? { skin: SKINS[r() * 5 | 0], female: true, hair: '#1b1210', longHair: true, kind: 'tourist', long: true, cloth: c, pattern: r() < 0.5 ? 'rgba(255,255,255,.4)' : undefined }
             : { skin: ['#e8b48a', '#d39a6c', '#f1c9a5', '#b9784a'][r() * 4 | 0], hair: ['#1b1210', '#4a3020', '#c99a50'][r() * 3 | 0], cap: r() < 0.5 ? VIVID[r() * VIVID.length | 0] : undefined, kind: 'tourist', cloth: c, logo: r() < 0.5, bag: r() < 0.4 ? '#333a5a' : undefined }; }
function placeFig(f, x, z, pose_, t, expr = 'smile') { f.position.set(x, STAND_Y * f.userData.body.scale.y, z); pose(f, pose_); face(f, expr, t); }
const basket = (c = 0xc8902a) => { const g = new THREE.Group(); g.add(cyl(0.22, 0.15, 0.18, c, 0, 0, 0, 14), box(0.3, 0.12, 0.3, 0xf2efe8, 0, 0.12, 0)); return g; };

// ---------- the Taj Mahal (procedural) ----------
const MARBLE = 0xfdfaf2, MARBLE2 = 0xe9e3d6, GOLD = 0xffc93c, SAND = 0xd4573b, SAND2 = 0xb8442d;
function onion(R, H, col, seg = 40) {
  const pts = [[R, 0], [1.08 * R, 0.14 * H], [1.13 * R, 0.3 * H], [1.04 * R, 0.48 * H], [0.8 * R, 0.66 * H], [0.45 * R, 0.83 * H], [0.16 * R, 0.94 * H], [0.001, H]].map(([a, b]) => new THREE.Vector2(a, b));
  return mesh(new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(36), seg), col);
}
function finial(h, col = GOLD) { const g = new THREE.Group(); g.add(cyl(0.12 * h, 0.18 * h, 0.12 * h, col, 0, 0.06 * h, 0, 12), sph(0.14 * h, col, 0, 0.25 * h, 0), sph(0.1 * h, col, 0, 0.45 * h, 0), cyl(0.02 * h, 0.04 * h, 0.4 * h, col, 0, 0.7 * h, 0, 8), mesh(new THREE.TorusGeometry(0.09 * h, 0.02 * h, 6, 16), col, 0, 0.88 * h, 0)); return g; }
const ARCH_TEX = (w, h, opt = {}) => canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
  // marble panel with a pointed-arch recess, inlay borders and a calligraphy frame
  x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, W, H);
  const pad = W * 0.08, fw = W - pad * 2, top = H * 0.08;
  if (opt.frame !== false) { x.strokeStyle = '#2a2a2a'; x.lineWidth = W * 0.012; x.strokeRect(pad * 0.6, top * 0.6, W - pad * 1.2, H - top * 0.6); x.fillStyle = '#1b1b1b';
    for (let i = 0; i < 70; i++) { const k = i / 70, px = pad * 0.6 + k * (W - pad * 1.2); x.fillRect(px, top * 0.6 + W * 0.018 + Math.sin(i * 1.7) * 2, W * 0.008, W * 0.016); } }
  const ax = W / 2, aw = fw * 0.42, ab = H * 0.98, at = top + H * 0.08;
  const arch = (w2, t2) => { x.beginPath(); x.moveTo(ax - w2, ab); x.lineTo(ax - w2, t2 + w2 * 0.9); x.quadraticCurveTo(ax - w2, t2, ax, t2 - w2 * 0.15); x.quadraticCurveTo(ax + w2, t2, ax + w2, t2 + w2 * 0.9); x.lineTo(ax + w2, ab); x.closePath(); };
  arch(aw + W * 0.02, at - W * 0.02); x.fillStyle = '#d9cfbd'; x.fill();
  arch(aw, at); const g = x.createLinearGradient(0, at, 0, ab); g.addColorStop(0, '#b8c4d8'); g.addColorStop(1, '#8c97ad'); x.fillStyle = g; x.fill();
  arch(aw * 0.45, at + (ab - at) * 0.45); x.fillStyle = '#6d7891'; x.fill();
  x.strokeStyle = '#c0392b'; x.lineWidth = W * 0.006; arch(aw + W * 0.012, at - W * 0.012); x.stroke();
  // little inlaid flowers in the spandrels
  for (const s of [-1, 1]) { const fx = ax + s * aw * 1.25, fy = at + W * 0.02; x.fillStyle = '#2e9d5b'; x.fillRect(fx - 1.5, fy, 3, W * 0.05); ['#c0392b', '#2f6bd8', '#e8a317'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(fx + (i - 1) * W * 0.014, fy - W * 0.006, W * 0.01, 0, 7); x.fill(); }); }
});
function tajMahal({ minarets = true, flankers = true } = {}) {
  const g = new THREE.Group(), parts = {};
  // plinth with a small arcade
  const plinthTex = canvasTex(1024, 96, (x, W, H) => { x.fillStyle = '#f6f1e6'; x.fillRect(0, 0, W, H); for (let i = 0; i < 24; i++) { const cx = (i + 0.5) * W / 24; x.fillStyle = '#c9bfae'; x.beginPath(); x.moveTo(cx - 14, H); x.lineTo(cx - 14, H * 0.45); x.quadraticCurveTo(cx, H * 0.2, cx + 14, H * 0.45); x.lineTo(cx + 14, H); x.fill(); } x.fillStyle = '#d8cfbe'; x.fillRect(0, 0, W, 8); });
  const plinth = new THREE.Group(); g.add(plinth); parts.plinth = plinth;
  const pm = M(0xffffff, { map: plinthTex });
  plinth.add(mesh(new THREE.BoxGeometry(84, 6, 84), M(MARBLE), 0, 3, 0));
  for (const [x, z, ry] of [[0, 42.05, 0], [0, -42.05, Math.PI], [42.05, 0, Math.PI / 2], [-42.05, 0, -Math.PI / 2]]) { const p = mesh(new THREE.PlaneGeometry(84, 6), pm, x, 3, z); p.rotation.y = ry; plinth.add(p); }
  // tomb body: chamfered block with arch facades
  const body = new THREE.Group(); body.position.y = 6; g.add(body); parts.body = body;
  const s = 25, c = 8.5, bh = 30;
  const shape = new THREE.Shape([[-s + c, -s], [s - c, -s], [s, -s + c], [s, s - c], [s - c, s], [-s + c, s], [-s, s - c], [-s, -s + c]].map(([a, b]) => new THREE.Vector2(a, b)));
  const core = mesh(new THREE.ExtrudeGeometry(shape, { depth: bh, bevelEnabled: false }), MARBLE); core.rotation.x = -Math.PI / 2; body.add(core);
  const bigT = ARCH_TEX(30, 30), sideT = ARCH_TEX(10, 13, { frame: false });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, fx = Math.sin(a), fz = Math.cos(a);
    const pish = mesh(new THREE.BoxGeometry(22, bh + 3, 1.2), MARBLE, fx * (s + 0.4), bh / 2 + 1.5, fz * (s + 0.4)); pish.rotation.y = a; body.add(pish);
    const fp = mesh(new THREE.PlaneGeometry(20, bh + 1.5), M(0xffffff, { map: bigT }), fx * (s + 1.05), bh / 2 + 0.9, fz * (s + 1.05)); fp.rotation.y = a; body.add(fp);
    for (const side of [-1, 1]) for (const lvl of [0, 1]) {
      const ox = side * 13.6; const sp = mesh(new THREE.PlaneGeometry(5.6, 13), M(0xffffff, { map: sideT }), fx * (s + 0.02) + Math.cos(a) * ox, 7 + lvl * 14.5, fz * (s + 0.02) - Math.sin(a) * ox); sp.rotation.y = a; body.add(sp); }
    // chamfer faces
    const ca = a + Math.PI / 4, d = (s - c / 2) * Math.SQRT2 * 0.5 + c * 0.36;
    for (const lvl of [0, 1]) { const cp = mesh(new THREE.PlaneGeometry(9, 13), M(0xffffff, { map: sideT }), Math.sin(ca) * (s - c / 2 + 0.05) * 1.0, 7 + lvl * 14.5, Math.cos(ca) * (s - c / 2 + 0.05)); cp.rotation.y = ca; body.add(cp); }
  }
  body.add(box(2 * s + 2, 1.2, 2 * s + 2, MARBLE2, 0, bh + 0.6, 0));
  // drum, dome, finial
  const domeG = new THREE.Group(); domeG.position.y = 6 + bh; g.add(domeG); parts.domeG = domeG;
  domeG.add(cyl(13, 13, 7, MARBLE, 0, 3.5, 0, 40), cyl(13.4, 13.4, 0.8, MARBLE2, 0, 7.2, 0, 40));
  const dome = onion(14, 27, MARBLE); dome.position.y = 7.4; domeG.add(dome); parts.dome = dome;
  const fin = finial(9); fin.position.y = 7.4 + 26.6; domeG.add(fin); parts.finial = fin;
  // four chhatris
  parts.chhatris = [];
  for (const [x, z] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) {
    const ch = new THREE.Group(); ch.position.set(x, 6 + bh, z); g.add(ch); parts.chhatris.push(ch);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ch.add(cyl(0.35, 0.35, 5, MARBLE, Math.cos(a) * 3.6, 2.5, Math.sin(a) * 3.6, 10)); }
    ch.add(cyl(4.4, 4.4, 0.8, MARBLE2, 0, 5.4, 0, 24)); const od = onion(3.8, 6.5, MARBLE, 24); od.position.y = 5.8; ch.add(od); const f = finial(2.2); f.position.y = 12; ch.add(f);
  }
  // minarets
  parts.minarets = [];
  if (minarets) for (const [x, z] of [[-38, -38], [38, -38], [-38, 38], [38, 38]]) {
    const mn = new THREE.Group(); mn.position.set(x, 6, z); g.add(mn); parts.minarets.push(mn);
    mn.add(cyl(2.6, 3.0, 1.4, MARBLE2, 0, 0.7, 0, 20));
    let y = 1.4; for (let k = 0; k < 3; k++) { const h = 12 - k * 1.5, r0 = 2.4 - k * 0.3; mn.add(cyl(r0 - 0.25, r0, h, MARBLE, 0, y + h / 2, 0, 20)); y += h; mn.add(cyl(r0 + 0.9, r0 + 0.5, 1.0, MARBLE2, 0, y + 0.3, 0, 20)); y += 1.0; }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; mn.add(cyl(0.2, 0.2, 3, MARBLE, Math.cos(a) * 1.8, y + 1.5, Math.sin(a) * 1.8, 8)); }
    mn.add(cyl(2.4, 2.4, 0.5, MARBLE2, 0, y + 3.2, 0, 20)); const od = onion(2, 3.6, MARBLE, 20); od.position.y = y + 3.4; mn.add(od); const f = finial(1.6); f.position.y = y + 6.9; mn.add(f);
  }
  // red sandstone mosque + guest house on the flanks
  if (flankers) for (const sx of [-1, 1]) {
    const fl = new THREE.Group(); fl.position.set(sx * 92, 0, 0); g.add(fl);
    fl.add(box(20, 3, 64, SAND2, 0, 1.5, 0), box(16, 14, 56, SAND, 0, 10, 0), box(17, 1, 57, 0xfbe6d8, 0, 17.4, 0));
    const ft = ARCH_TEX(12, 12, { frame: false }); for (const z of [-18, 0, 18]) { const p = mesh(new THREE.PlaneGeometry(10, 11), M(0xffc8b8, { map: ft }), -sx * 8.05, 8.5, z); p.rotation.y = -sx * Math.PI / 2; fl.add(p); }
    for (const z of [-20, 0, 20]) { fl.add(cyl(4.5, 4.5, 2, MARBLE, 0, 19, z, 20)); const od = onion(4.4, 7, MARBLE, 24); od.position.set(0, 20, z); fl.add(od); }
  }
  g.userData.parts = parts; return g;
}
// brick scaffold around the tomb and dome (for the construction scenes)
function scaffold() {
  const g = new THREE.Group(), r = RNG(3);
  const pos = []; const add = (x, y, z, sx, sy, sz) => pos.push([x, y, z, sx, sy, sz]);
  for (let ring = 0; ring < 2; ring++) {
    const R = ring ? 20 : 31, y0 = ring ? 36 : 6, y1 = ring ? 52 : 37, n = ring ? 22 : 30;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; add(x, (y0 + y1) / 2, z, 1.4, y1 - y0, 1.4); }
    for (let y = y0 + 3; y < y1; y += 3.2) for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R; add(x, y, z, 2 * Math.PI * R / n, 0.7, 1.2); }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(geo, M(0xc4622d), pos.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  pos.forEach(([x, y, z, sx, sy, sz], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(z, x) + Math.PI / 2); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); im.setMatrixAt(i, m4); im.setColorAt(i, col.set([0xc4622d, 0xb5542a, 0xd4733a][i % 3])); });
  im.castShadow = im.receiveShadow = true; g.add(im); return g;
}
// ---------- animals ----------
function elephant(cloth = 0xe91e63) {
  const g = new THREE.Group(), grey = 0x8d9aae, leg = [];
  const bodyM = sph(1, grey, 0, 2.3, 0); bodyM.scale.set(1.7, 1.15, 1.05); g.add(bodyM);
  const headM = sph(0.85, grey, 1.7, 2.75, 0); g.add(headM);
  for (const s of [-1, 1]) { const ear = mesh(new THREE.CircleGeometry(0.75, 20), M(0x7d8aa0, { side: THREE.DoubleSide }), 1.45, 2.8, s * 0.75); ear.rotation.y = s * 0.5; g.add(ear); g.add(rot(mesh(new THREE.ConeGeometry(0.09, 0.8, 8), 0xfffbf0, 2.25, 2.15, s * 0.35), 0, 0, -2.0)); g.add(sph(0.1, 0x141414, 2.2, 3.0, s * 0.55)); }
  const trunk = new THREE.Group(); trunk.position.set(2.3, 2.6, 0); g.add(trunk); let p = trunk;
  for (let i = 0; i < 6; i++) { const sgm = new THREE.Group(); sgm.position.y = i ? -0.32 : 0; p.add(sgm); sgm.add(cyl(0.22 - i * 0.025, 0.24 - i * 0.025, 0.36, grey, 0, -0.16, 0, 12)); p = sgm; trunk.userData['s' + i] = sgm; }
  for (const [x, z] of [[0.9, 0.55], [0.9, -0.55], [-0.95, 0.55], [-0.95, -0.55]]) { const l = new THREE.Group(); l.position.set(x, 1.6, z); l.add(cyl(0.34, 0.36, 1.6, grey, 0, -0.8, 0, 14), cyl(0.38, 0.38, 0.12, 0xe9e4da, 0, -1.55, 0, 14)); g.add(l); leg.push(l); }
  g.add(rot(cyl(0.06, 0.03, 0.9, grey, -1.85, 2.3, 0, 8), 0, 0, 0.9));
  // caparison + head cloth
  const cap = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#' + new THREE.Color(cloth).getHexString(); x.fillRect(0, 0, w, h); x.fillStyle = '#ffc93c'; x.fillRect(0, h - 22, w, 22); x.fillRect(0, 0, w, 8); for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(14 + i * 28, h - 30, 9, 0, 7); x.fill(); } x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(30 + i * 48, 50, 14, 0, 7); x.fill(); } });
  const cm = M(0xffffff, { map: cap, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const c = mesh(new THREE.PlaneGeometry(2.2, 1.3), cm, -0.1, 2.5, s * 1.13); g.add(c); }
  g.add(box(2.2, 0.1, 2.28, cm, -0.1, 3.42, 0));
  g.add(rot(mesh(new THREE.PlaneGeometry(0.8, 0.9), cm, 2.25, 3.05, 0), 0, Math.PI / 2, 0));
  g.userData.walk = (t, sp = 1) => { leg.forEach((l, i) => l.rotation.z = 0.32 * Math.sin(t * 4 * sp + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0))); for (let i = 0; i < 6; i++) trunk.userData['s' + i].rotation.z = 0.12 * Math.sin(t * 2 + i * 0.5) - 0.04; };
  return g;
}
function cart(blocks = 3) { const g = new THREE.Group(); g.add(box(3.4, 0.25, 1.9, 0x9c5a2c, 0, 1.0, 0)); for (const z of [-1.05, 1.05]) for (const x of [-1.1, 1.1]) { const w = wheel(0.62, { spoke: 0x7a4422 }); w.position.set(x, 0.62, z); g.add(w); }
  for (let i = 0; i < blocks; i++) g.add(box(1.0, 0.8, 1.4, MARBLE, -1.1 + i * 1.1, 1.55, 0)); g.add(box(0.12, 0.12, 2.6, 0x7a4422, 2.4, 1.1, 0)); return g; }
function ox() { const g = new THREE.Group(), w = 0xf3eee4, leg = []; const b = sph(0.7, w, 0, 1.3, 0); b.scale.set(1.6, 0.9, 0.85); g.add(b, sph(0.42, w, 1.25, 1.55, 0), sph(0.32, w, 0.35, 1.95, 0));
  for (const s of [-1, 1]) g.add(rot(mesh(new THREE.ConeGeometry(0.07, 0.5, 8), 0x3a2a1a, 1.3, 2.0, s * 0.25), s * 0.6, 0, 0));
  for (const [x, z] of [[0.6, 0.3], [0.6, -0.3], [-0.6, 0.3], [-0.6, -0.3]]) { const l = new THREE.Group(); l.position.set(x, 0.95, z); l.add(cyl(0.12, 0.12, 0.95, w, 0, -0.47, 0, 10)); g.add(l); leg.push(l); }
  g.add(box(0.2, 0.9, 1.0, 0xe91e63, 0.05, 1.5, 0)); g.userData.walk = t => leg.forEach((l, i) => l.rotation.z = 0.4 * Math.sin(t * 6 + (i % 2) * Math.PI + (i > 1 ? 1.5 : 0))); return g; }

// ---------- environments ----------
const DAY = [[0, '#1668e0'], [0.4, '#3f9cf5'], [0.62, '#8fd0ff'], [0.75, '#d6f1ff']];
const DUSK = [[0, '#3b2fb0'], [0.32, '#c2459a'], [0.52, '#ff7a59'], [0.68, '#ffc247'], [0.8, '#fff0a8']];
const SUNSET = [[0, '#2a3fb8'], [0.3, '#8a4fd8'], [0.5, '#ff6f91'], [0.66, '#ffa45c'], [0.8, '#ffe08a']];
const GRASSY = texOf(GRASS('#5fcf3f', '#48b432', '#86e25a'), 120, 70);
const SANDT = texOf(speckle('#f2c46d', ['#e6b55c', '#f8d68a', '#dba54d'], 1800, 2, 5), 90, 90);
const DIRTT = texOf(DIRT, 60, 60);
function river(g, z, w = 600, d = 60, col = 0x2f9be8) {
  const water = noShadow(mesh(new THREE.PlaneGeometry(w, d), M(col, { transparent: true, opacity: 0.95 }), 0, 0.05, z)); water.rotation.x = -Math.PI / 2; g.add(water);
  const r = RNG(31); for (let i = 0; i < 60; i++) { const m = noShadow(mesh(new THREE.PlaneGeometry(1.5 + r() * 3, 0.12), B(0xd8f0ff, { transparent: true, opacity: 0.8 }), -120 + r() * 240, 0.07, z - d / 2 + r() * d)); m.rotation.x = -Math.PI / 2; g.add(m); tick(g, t => m.position.x += 0.0); }
}
function cypressRow(g, x0, x1, z, step = 6) { for (let x = x0; x <= x1; x += step) { g.add(mesh(new THREE.ConeGeometry(1.1, 6.5, 10), 0x1f7a3a, x, 3.6, z), cyl(0.15, 0.2, 0.6, 0x6b4226, x, 0.3, z, 8)); } }
function fountains(g, x0, x1, z, step) { for (let x = x0; x <= x1; x += step) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })); sp.scale.set(0.6, 1.8, 1); sp.position.set(x, 1.0, z); g.add(sp); tick(g, t => { sp.scale.y = 1.6 + 0.3 * Math.sin(t * 7 + x); }); } }
function gardens(g, { poolLen = 120 } = {}) {
  g.add(ground(GRASSY, 700, 500, 0, 0));
  const pathM = M(0xf4efe4);
  g.add(noShadow(rot(mesh(new THREE.PlaneGeometry(16, poolLen + 30), pathM, 0, 0.03, 42 + (poolLen + 30) / 2), -Math.PI / 2)));
  const pool = noShadow(rot(mesh(new THREE.PlaneGeometry(6, poolLen), M(0x3aa8f0), 0, 0.06, 45 + poolLen / 2), -Math.PI / 2)); g.add(pool);
  g.add(noShadow(rot(mesh(new THREE.PlaneGeometry(1.2, poolLen), B(0xbfe8ff, { transparent: true, opacity: 0.6 }), 0.8, 0.07, 45 + poolLen / 2), -Math.PI / 2)));
  fountains(g, 0, 0, 0, 1); for (let z = 52; z < 45 + poolLen; z += 9) { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })); f.scale.set(0.5, 1.5, 1); f.position.set(0, 0.9, z); g.add(f); }
  for (const s of [-1, 1]) { for (let z = 50; z < 45 + poolLen; z += 7) g.add(mesh(new THREE.ConeGeometry(1.0, 6, 10), 0x1f7a3a, s * 6.2, 3.3, z)); }
  for (const s of [-1, 1]) for (let z = 50; z < 45 + poolLen; z += 3) g.add(noShadow(sph(0.28, FLOWERS[(z / 3 | 0) % 6], s * 9, 0.2, z)));
}

// ---------- scenes ----------
const subT = (i, prefix, fb) => { const c = TL.scenes[i].subs.find(s => s.text.startsWith(prefix)); return c ? c.t0 - TL.scenes[i].start : fb; };
const S = [];
const focus = new THREE.Vector3();
function look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); focus.set(tx, 0, tz); }

// 1 — 1631: Shah Jahan and Mumtaz Mahal in the palace garden; her loss; the vow
{
  const g = new THREE.Group(); g.add(ground(GRASSY, 400, 300, 0, -40));
  river(g, -36, 600, 30, 0x4a9ee8);
  // red sandstone pavilion (baradari) with white domes
  const pav = new THREE.Group(); pav.position.set(-6, 0, -16); g.add(pav);
  pav.add(box(18, 1.2, 8, SAND2, 0, 0.6, 0));
  const arc = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#d4573b'; x.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { const cx = 51 + i * 102; x.fillStyle = '#5a1f14'; x.beginPath(); x.moveTo(cx - 36, h); x.lineTo(cx - 36, 110); for (let k = 0; k <= 6; k++) { const a = Math.PI + k / 6 * Math.PI; x.lineTo(cx + Math.cos(a) * 36 + (k % 2 ? Math.cos(a) * 6 : 0), 110 + Math.sin(a) * 50 + (k % 2 ? Math.sin(a) * 6 : 0)); } x.lineTo(cx + 36, h); x.fill(); } x.fillStyle = '#fff4e6'; x.fillRect(0, 0, w, 22); x.fillRect(0, 34, w, 6); });
  pav.add(mesh(new THREE.BoxGeometry(18, 5.2, 7), [M(SAND), M(SAND), M(0xfff4e6), M(SAND), M(0xffffff, { map: arc }), M(SAND)], 0, 3.8, 0));
  pav.add(box(19, 0.6, 8, 0xfff4e6, 0, 6.7, 0));
  for (const x of [-6, 0, 6]) { const d = onion(1.6, 3.2, MARBLE, 24); d.position.set(x, 7.0, 0); pav.add(d, cyl(1.7, 1.7, 0.5, MARBLE2, x, 7.0, 0, 20)); const f = finial(1); f.position.set(x, 10.2, 0); pav.add(f); }
  // fountain pool + flower beds
  const pool = noShadow(rot(mesh(new THREE.PlaneGeometry(10, 4), M(0x3aa8f0), 0, 0.05, -2.2), -Math.PI / 2)); g.add(pool, box(10.6, 0.3, 0.3, 0xfff4e6, 0, 0.15, -4.35), box(10.6, 0.3, 0.3, 0xfff4e6, 0, 0.15, -0.05));
  fountains(g, -3, 3, -2.2, 3);
  const r = RNG(12); for (let i = 0; i < 120; i++) g.add(noShadow(sph(0.12, FLOWERS[i % 6], -14 + r() * 28, 0.1, 1.5 + r() * 3)));
  cypressRow(g, -16, 16, -15, 4);
  for (let i = 0; i < 14; i++) { const t2 = tree(r); t2.position.set(-60 + i * 9, 0, -26 - r() * 6); g.add(t2); }
  clouds(g, 5, 0xffd0e0); birds(g, 6, 3, 12, -20, 0x2a1a3a);
  const sj = human(SHAHJAHAN, { scale: 1.05, id: 'sj' }), mm = human(MUMTAZ, { scale: 0.98, face: -1, id: 'mm' }); g.add(sj, mm);
  const mmMats = []; mm.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; mmMats.push(o.material); } });
  // golden outline of the dream monument in the sky
  // golden line drawing of the dream monument, glowing in the sky
  const dreamTex = canvasTex(1024, 768, (x, W, H) => {
    x.lineJoin = x.lineCap = 'round'; x.strokeStyle = '#ffe27a'; x.shadowColor = '#ffb02e'; x.shadowBlur = 24; x.lineWidth = 7;
    const cx = W / 2, base = 690;
    const path = () => { x.beginPath();
      x.rect(cx - 330, base - 40, 660, 40);                                            // plinth
      x.rect(cx - 170, base - 260, 340, 220);                                          // tomb body
      x.moveTo(cx - 60, base - 40); x.lineTo(cx - 60, base - 170); x.quadraticCurveTo(cx - 60, base - 225, cx, base - 240); x.quadraticCurveTo(cx + 60, base - 225, cx + 60, base - 170); x.lineTo(cx + 60, base - 40);   // great arch
      for (const s2 of [-1, 1]) for (const lv of [0, 1]) { const ax = cx + s2 * 115, ay = base - 60 - lv * 100; x.moveTo(ax - 22, ay); x.lineTo(ax - 22, ay - 50); x.quadraticCurveTo(ax, ay - 75, ax + 22, ay - 50); x.lineTo(ax + 22, ay); }
      x.rect(cx - 95, base - 300, 190, 40);                                            // drum
      x.moveTo(cx - 95, base - 300); x.bezierCurveTo(cx - 140, base - 380, cx - 90, base - 470, cx, base - 520); x.bezierCurveTo(cx + 90, base - 470, cx + 140, base - 380, cx + 95, base - 300);   // onion dome
      x.moveTo(cx, base - 520); x.lineTo(cx, base - 580); x.moveTo(cx - 10, base - 545); x.arc(cx, base - 545, 10, Math.PI, 3 * Math.PI);
      for (const s2 of [-1, 1]) { const kx = cx + s2 * 135; x.moveTo(kx - 30, base - 260); x.lineTo(kx - 30, base - 300); x.moveTo(kx + 30, base - 260); x.lineTo(kx + 30, base - 300); x.moveTo(kx - 36, base - 300); x.quadraticCurveTo(kx, base - 360, kx + 36, base - 300); x.closePath(); }
      for (const s2 of [-1, 1]) { const mx = cx + s2 * 300; x.moveTo(mx - 16, base - 40); x.lineTo(mx - 12, base - 360); x.moveTo(mx + 16, base - 40); x.lineTo(mx + 12, base - 360); for (const yy of [140, 250, 360]) { x.moveTo(mx - 26, base - yy); x.lineTo(mx + 26, base - yy); } x.moveTo(mx - 18, base - 370); x.quadraticCurveTo(mx, base - 410, mx + 18, base - 370); }
    };
    x.fillStyle = 'rgba(255,214,120,.12)'; path(); x.fill(); path(); x.stroke(); x.shadowBlur = 0; x.lineWidth = 3; x.strokeStyle = '#fff6d0'; path(); x.stroke();
  });
  const dream = new THREE.Sprite(new THREE.SpriteMaterial({ map: dreamTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending }));
  dream.scale.set(18, 13.5, 1); dream.position.set(0, 16, -28); dream.renderOrder = 20; g.add(dream);
  const dglow = glow(0xffc04a, 1, 0, 0, 0, 0); g.add(dglow);
  const petals = []; for (let i = 0; i < 40; i++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: [0xff7ab6, 0xffd23f, 0xffffff][i % 3], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.scale.setScalar(0.25); g.add(p); petals.push(p); }
  S.push({ g, year: '1631', label: 'Agra · The Mughal Empire', sky: sky(DUSK), fog: [0xffb0a0, 60, 300], sun: [0xffd6b0, 2.3, [-10, 14, 12]], hemi: [0xffe0f0, 0x9a6a8a, 1.6],
    update(t, d) {
      const lose = 4.2, vow = subT(0, 'Heartbroken', 8.5);
      const walk = t < lose - 0.6, x = -2.2 + Math.min(t, lose - 0.6) * 0.45;
      if (walk) { placeFig(sj, x, 1.2, walkPose(t * 5, 0, 0.7), t, 'smile'); placeFig(mm, x + 1.0, 1.0, walkPose(t * 5 + 2, 0, 0.6), t, 'smile'); mm.userData.body.scale.x = 0.98; }
      else { placeFig(sj, x, 1.2, t < vow ? (t < lose + 1.5 ? sadPose(t) : kneelPose) : vowPose(t), t, t < vow ? 'sad' : 'focus'); placeFig(mm, x + 1.0, 1.0, handsTogether, t, 'smile'); mm.userData.body.scale.x = -0.98; }
      if (!walk && t >= lose + 1.5 && t < vow) sj.position.y -= 0.35;
      const fadeK = smooth((t - lose) / 1.6); mmMats.forEach(m => m.opacity = 1 - fadeK); mm.position.y += fadeK * 0.8; mm.visible = fadeK < 0.99;
      petals.forEach((p, i) => { const k = clamp((t - lose - i * 0.03) / 3); p.visible = k > 0 && k < 1; p.position.set(x + 1.0 + Math.sin(i * 2.1) * 0.8 * k, 1.2 + k * 5 + Math.sin(i) * 0.5, 1.0 + Math.cos(i * 1.3) * 0.6 * k); p.material.opacity = (1 - k); });
      dream.material.opacity = smooth((t - vow - 0.8) / 1.5); dream.position.y = 16 + 0.3 * Math.sin(t * 1.5); dglow.position.set(0, 16, -30); dglow.scale.setScalar(26); dglow.material.opacity = 0.55 * smooth((t - vow - 0.8) / 1.5);
      const p = t / d;
      if (t < lose) look(x + 0.6 + 4.2, 1.9, 6.4 - t * 0.2, x + 0.5, 1.5, 0.5);
      else if (t < vow) look(x + 2.4, 1.7, 4.3, x + 0.2, 1.3, 1);
      else look(lerp(x + 2.4, x + 0.8, smooth((t - vow) / 2)), lerp(1.7, 1.0, smooth((t - vow) / 2)), lerp(4.3, 9.5, smooth((t - vow) / 2)), x, lerp(1.3, 9.5, smooth((t - vow) / 2.2)), -20);
    } });
}
// 2 — 1632: work begins on the Yamuna
{
  const g = new THREE.Group(); g.add(ground(DIRTT, 500, 400, 0, -60)); river(g, -128, 700, 60, 0x3a9ee0);
  const taj = tajMahal({ minarets: false, flankers: false }); taj.position.set(0, 0, -60); g.add(taj);
  const P = taj.userData.parts; P.body.visible = false; P.domeG.visible = false; P.chhatris.forEach(c => c.visible = false); P.plinth.scale.y = 0.3;
  const r = RNG(7);
  for (let i = 0; i < 60; i++) g.add(box(1 + r(), 0.7, 1.2, r() < 0.6 ? MARBLE : 0xd4733a, -40 + r() * 80, 0.35, -10 - r() * 10));
  for (const [x, z, c] of [[-22, -14, 0xff3d57], [24, -12, 0xffb300], [-34, -6, 0x2979ff]]) { const tent = mesh(new THREE.ConeGeometry(3.4, 3.4, 4), c, x, 1.7, z); tent.rotation.y = Math.PI / 4; g.add(tent); }
  clouds(g, 9); birds(g, 6, 4, 14, -30);
  const crew = []; for (let i = 0; i < 18; i++) { const f = human(workerSpec(r), { scale: 0.95 + r() * 0.1, face: i % 2 ? 1 : -1, id: 'w' + i }); g.add(f); const b = basket(); b.position.y = 1.32; f.userData.torsoP.add(b); b.visible = i % 3 === 0; f.userData.carry = b.visible; crew.push({ f, x0: -20 + r() * 40, z: 1.5 - r() * 9, sp: 0.8 + r() * 0.6, ph: r() * 6, job: i % 3 }); }
  const arch = human(ARCHITECT, { scale: 1.02, id: 'arch' }); g.add(arch); const scroll = cyl(0.06, 0.06, 0.55, 0xfff4d6, 0, 0, 0, 8); scroll.rotation.x = Math.PI / 2; arch.userData.prop.add(scroll);
  S.push({ g, year: '1632', label: 'Work Begins on the Yamuna', sky: sky(DAY), fog: [0xd6f1ff, 90, 520], sun: [0xfff2d6, 2.6, [12, 22, 14]], hemi: [0xe6f4ff, 0xc8a070, 1.6],
    update(t, d) {
      crew.forEach(({ f, x0, z, sp, ph, job }) => { if (job === 2) placeFig(f, x0, z, hammerPose(t + ph), t, 'focus'); else { const x = x0 + ((t * sp * (f.userData.body.scale.x > 0 ? 1 : -1)) % 30); placeFig(f, x, z, walkPose(t * 6 * sp + ph, f.userData.carry ? 1 : 0), t, 'smile'); } });
      placeFig(arch, 2.5, 3, pointPose(0.1 * Math.sin(t * 2)), t, 'happy');
      const p = t / d;
      if (p < 0.5) look(lerp(14, 8, smooth(p / 0.5)), lerp(16, 6, smooth(p / 0.5)), lerp(30, 16, smooth(p / 0.5)), 0, 3, -20);
      else look(lerp(7, 3, smooth((p - 0.5) / 0.5)), 2.0, lerp(10, 8, smooth((p - 0.5) / 0.5)), 1, 1.4, -1);
    } });
}
// 3 — marble from Makrana: elephants on the desert road
{
  const g = new THREE.Group(); g.add(ground(SANDT, 900, 500, 0, -60));
  const road = noShadow(rot(mesh(new THREE.PlaneGeometry(900, 7), M(0xffffff, { map: texOf(DIRT, 160, 1) }), 0, 0.03, 0), -Math.PI / 2)); g.add(road);
  const r = RNG(21);
  for (let i = 0; i < 26; i++) { const h = noShadow(mesh(new THREE.SphereGeometry(18 + r() * 14, 20, 10), M([0xf2b65a, 0xe9a64b, 0xf7c873][i % 3]), -200 + i * 18, -6, -70 - r() * 60)); h.scale.y = 0.35 + r() * 0.2; g.add(h); }
  for (let i = 0; i < 20; i++) { const t2 = tree(r, 0xffe0a0); t2.position.set(-60 + i * 7 + r() * 3, 0, -8 - r() * 20); t2.scale.setScalar(0.7); g.add(t2); }
  clouds(g, 13); birds(g, 5, 9, 14, -25);
  const herd = []; for (let i = 0; i < 4; i++) { const e = elephant([0xe91e63, 0x7c4dff, 0x00b8d4, 0xff6d00][i]); const c = cart(3); c.position.x = -4.6; e.add(c); g.add(e); herd.push({ e, x0: -i * 11 }); const mh = human(workerSpec(r), { scale: 0.8, id: 'mh' + i }); mh.position.set(0.6, 3.6, 0); pose(mh, sitPose(0.9)); e.add(mh); herd[i].mh = mh; }
  const walkers = []; for (let i = 0; i < 8; i++) { const f = human(workerSpec(r), { scale: 0.95, id: 'wk' + i }); g.add(f); walkers.push({ f, x0: -6 - i * 5.3, z: 2.8 + (i % 2) * 0.6 }); }
  S.push({ g, year: 'THE MARBLE', label: 'White Marble from Makrana', sky: sky(DAY), fog: [0xffe8c0, 100, 600], sun: [0xfff0d0, 2.7, [10, 22, 12]], hemi: [0xeef6ff, 0xe8b860, 1.65],
    update(t, d) {
      const v = 1.6;
      herd.forEach(({ e, x0, mh }) => { e.position.set(x0 + v * t, 0, -0.6); e.userData.walk(t); face(mh, 'smile', t); });
      walkers.forEach(({ f, x0, z }) => placeFig(f, x0 + v * t, z, walkPose(t * 7.5, 0), t, 'happy'));
      const lead = v * t, p = t / d;
      if (p < 0.45) look(lead + 9, 2.2, 9.5, lead - 1, 2.3, 0);
      else if (p < 0.75) look(lead - 4, 1.4, 6.5, lead - 6, 2.6, 0);
      else look(lead + lerp(14, 22, smooth((p - 0.75) / 0.25)), lerp(5, 11, smooth((p - 0.75) / 0.25)), lerp(14, 24, smooth((p - 0.75) / 0.25)), lead - 12, 2, -2);
    } });
}
// 4 — the brick scaffold and the rising dome
{
  const g = new THREE.Group(); g.add(ground(DIRTT, 600, 500, 0, -40)); river(g, -150, 700, 60, 0x3a9ee0);
  const taj = tajMahal({ minarets: false, flankers: false }); g.add(taj);
  const P = taj.userData.parts; P.minarets.forEach(m => m.visible = false);
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 40);
  P.domeG.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = [clip]; } });
  const sc = scaffold(); g.add(sc);
  const ramp = mesh(new THREE.BoxGeometry(6, 0.6, 120), 0xc4622d, 0, 0, 0); ramp.position.set(-42, 18, 85); ramp.rotation.x = -Math.atan2(36, 120); g.add(ramp);
  const oxen = [0, 1].map(i => { const o = ox(); o.rotation.y = Math.PI / 2; g.add(o); return o; }); const blk = box(2, 1.4, 2, MARBLE, 0, 0, 0); g.add(blk);
  const r = RNG(17); clouds(g, 21); birds(g, 6, 2, 30, -40);
  const builders = []; for (let i = 0; i < 12; i++) { const f = human(workerSpec(r), { scale: 1, face: i % 2 ? 1 : -1, id: 'b' + i }); g.add(f); builders.push({ f, a: i / 12 * Math.PI * 2, lvl: i % 3 }); }
  S.push({ g, year: 'THE DOME', label: 'Raising the Great Dome', sky: sky(DAY), fog: [0xd6f1ff, 120, 700], sun: [0xfff2d6, 2.6, [14, 24, 16]], hemi: [0xe6f4ff, 0xc8a070, 1.6],
    update(t, d) {
      const k2 = subT(3, 'Slowly', d * 0.45);
      const grow = smooth((t - k2 + 0.5) / (d - k2 - 1.0)); clip.constant = 6 + 30 + 7.4 + lerp(0.5, 36, grow);
      P.chhatris.forEach((c, i) => c.visible = grow > 0.3 + i * 0.1); P.finial.visible = grow > 0.95;
      sc.position.y = 0;
      const u = (t * 0.06) % 1; oxen.forEach((o, i) => { const s = u * 120 - 60 - i * 3; o.position.set(-42 + 1.2, 18 + s * Math.sin(Math.atan2(36, 120)) + 0.3, 85 - s * Math.cos(Math.atan2(36, 120))); o.rotation.y = Math.PI; o.rotation.x = Math.atan2(36, 120) * 0; o.userData.walk(t); });
      blk.position.set(-42, oxen[1].position.y + 0.6, oxen[1].position.z + 3.5);
      builders.forEach(({ f, a, lvl }) => { const R = 31.8, y = 6 + 3.2 * (1 + lvl * 3); f.position.set(Math.cos(a) * R, y + 0.9, Math.sin(a) * R); pose(f, hammerPose(t + a)); face(f, 'focus', t); });
      const p = t / d;
      if (p < 0.4) look(lerp(70, 55, smooth(p / 0.4)), lerp(12, 22, smooth(p / 0.4)), lerp(95, 80, smooth(p / 0.4)), 0, 30, 0);
      else look(lerp(55, 62, smooth((p - 0.4) / 0.6)), lerp(26, 40, smooth((p - 0.4) / 0.6)), lerp(80, 100, smooth((p - 0.4) / 0.6)), 0, lerp(36, 52, smooth((p - 0.4) / 0.6)), 0);
    } });
}
// 5 — pietra dura: flowers of precious stone, and calligraphy
const inlay = (() => { const cv = document.createElement('canvas'); cv.width = 768; cv.height = 1024; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return { cv, tex }; })();
function drawInlay(k, k2) {
  const x = inlay.cv.getContext('2d'), W = 768, H = 1024; x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, W, H);
  const r = RNG(5); x.globalAlpha = 0.06; for (let i = 0; i < 40; i++) { x.strokeStyle = '#9a9488'; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(r() * W, r() * H); x.bezierCurveTo(r() * W, r() * H, r() * W, r() * H, r() * W, r() * H); x.stroke(); } x.globalAlpha = 1;
  // border of calligraphy (stylised strokes, revealed with k2)
  x.fillStyle = '#e9e1d0'; x.fillRect(30, 30, W - 60, 120); x.fillRect(30, H - 150, W - 60, 120);
  x.strokeStyle = '#1b1b1b'; x.lineCap = 'round'; x.lineWidth = 9;
  const strokes = Math.floor(k2 * 28);
  for (let i = 0; i < strokes; i++) { const bx = 60 + (i % 14) * 48, by = i < 14 ? 90 : H - 90; x.beginPath(); x.moveTo(bx, by + 30); x.quadraticCurveTo(bx + 10, by - 40 + (i % 3) * 14, bx + 24, by + 10); x.stroke(); x.beginPath(); x.arc(bx + 30, by - 30 + (i % 2) * 10, 5, 0, 7); x.fillStyle = '#1b1b1b'; x.fill(); }
  // vase + flowers grow with k
  const cx = W / 2, base = H - 200;
  const stems = [[-120, 380], [0, 470], [120, 380], [-60, 300], [70, 310]];
  stems.forEach(([dx, h], i) => { const kk = clamp(k * 1.6 - i * 0.12); if (kk <= 0) return; x.strokeStyle = '#2e9d5b'; x.lineWidth = 12; x.beginPath(); x.moveTo(cx, base); x.quadraticCurveTo(cx + dx * 0.3, base - h * 0.5, cx + dx, base - h * kk); x.stroke();
    for (const s of [-1, 1]) { const lx = cx + dx * 0.6 * kk, ly = base - h * 0.55 * kk; x.fillStyle = '#3cbf6a'; x.beginPath(); x.ellipse(lx + s * 34, ly, 40 * kk, 14 * kk, s * 0.5, 0, 7); x.fill(); x.strokeStyle = '#1e6e3a'; x.lineWidth = 3; x.stroke(); } });
  const blooms = [[-120, 380, '#c0392b'], [0, 470, '#2f6bd8'], [120, 380, '#e8a317'], [-60, 300, '#8e44ad'], [70, 310, '#e74c3c']];
  blooms.forEach(([dx, h, col], i) => { const kk = clamp(k * 1.8 - 0.6 - i * 0.14); if (kk <= 0) return; const fx = cx + dx, fy = base - h;
    for (let p = 0; p < 7; p++) { const a = p / 7 * Math.PI * 2; x.fillStyle = col; x.beginPath(); x.ellipse(fx + Math.cos(a) * 34 * kk, fy + Math.sin(a) * 34 * kk, 30 * kk, 16 * kk, a, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.stroke(); }
    x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(fx, fy, 16 * kk, 0, 7); x.fill(); });
  // vase
  x.fillStyle = '#2f6bd8'; x.beginPath(); x.moveTo(cx - 70, base + 110); x.quadraticCurveTo(cx - 110, base + 20, cx - 34, base - 10); x.lineTo(cx + 34, base - 10); x.quadraticCurveTo(cx + 110, base + 20, cx + 70, base + 110); x.closePath(); x.fill();
  x.fillStyle = '#e8a317'; x.fillRect(cx - 60, base + 40, 120, 14);
  inlay.tex.needsUpdate = true;
}
{
  const g = new THREE.Group(); g.add(ground(texOf(speckle('#e94b6b', ['#ffd23f', '#ff8fab', '#c2185b'], 900, 3, 2), 30, 30), 300, 300, 0, 0));
  // striped canopy
  const stripes = canvasTex(512, 64, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#ffd23f' : '#ff3d57'; x.fillRect(i * 32, 0, 32, h); } });
  const can = mesh(new THREE.PlaneGeometry(26, 18), M(0xffffff, { map: stripes, side: THREE.DoubleSide }), 0, 6, -2); can.rotation.x = Math.PI / 2; g.add(can);
  for (const [x, z] of [[-12.5, -10.5], [12.5, -10.5], [-12.5, 6.5], [12.5, 6.5]]) g.add(cyl(0.18, 0.18, 6, 0xffd23f, x, 3, z, 10));
  for (let i = 0; i < 9; i++) g.add(rot(mesh(new THREE.PlaneGeometry(2.9, 0.9), M(0xffffff, { map: stripes, side: THREE.DoubleSide }), -11.5 + i * 2.88, 5.55, 6.5), 0, 0, 0));
  const r = RNG(41);
  const slab = (x, z) => { g.add(box(2.4, 0.5, 1.4, MARBLE, x, 0.55, z), box(2.2, 0.3, 1.2, 0x8a5a35, x, 0.15, z)); for (let i = 0; i < 6; i++) g.add(noShadow(sph(0.07, [0xc0392b, 0x2f6bd8, 0x2e9d5b, 0xe8a317][i % 4], x - 0.8 + i * 0.3, 0.84, z + 0.3))); };
  const artisans = [];
  for (const [x, z, fc] of [[-6, -3, 1], [0, -4, 1], [6, -3, -1], [-3, 1.5, 1], [4, 1.5, -1]]) { slab(x + fc * 1.6, z); const f = human(workerSpec(r), { scale: 0.95, face: fc, id: 'a' + x }); g.add(f); artisans.push({ f, x, z }); }
  // big panel for the close-up
  const panel = mesh(new THREE.PlaneGeometry(3.6, 4.8), B(0xffffff, { map: inlay.tex }), 0, 2.5, 3.6); g.add(panel, box(3.9, 5.1, 0.25, MARBLE2, 0, 2.5, 3.45));
  const master = human(ARCHITECT, { scale: 1, face: 1, id: 'master' }); g.add(master);
  S.push({ g, year: 'THE DETAILS', label: 'Pietra Dura · Flowers in Stone', sky: sky([[0, '#ff9a3c'], [1, '#ffd36b']]), fog: [0xffd6a0, 60, 300], sun: [0xfff2d6, 2.4, [6, 18, 14]], hemi: [0xfff4e6, 0xd08060, 1.7],
    update(t, d) {
      const k2t = subT(4, 'And', d * 0.55);
      drawInlay(smooth(t / (k2t - 0.5)), smooth((t - k2t) / (d - k2t - 0.6)));
      artisans.forEach(({ f, x, z }) => { f.position.set(x, 0.62, z); pose(f, { ...sitPose(0.85, 0.15 * Math.sin(t * 8 + x)), elR: 0.45 + 0.35 * Math.abs(Math.sin(t * 8 + x)) }); face(f, 'focus', t); });
      placeFig(master, -2.6, 4.4, pointPose(0.15 * Math.sin(t * 1.5)), t, 'happy');
      const p = t / d;
      if (p < 0.22) look(lerp(10, 6, smooth(p / 0.22)), 4.5, lerp(17, 14, smooth(p / 0.22)), 0, 1.2, -1);
      else look(lerp(0.6, 0.2, smooth((p - 0.22) / 0.78)), 2.6, lerp(9.5, 7.6, smooth((p - 0.22) / 0.78)), 0, 2.5, 3.6);
    } });
}
// 6 — 1653: complete, at sunset; Shah Jahan laid to rest beside her
{
  const g = new THREE.Group(); gardens(g); river(g, -110, 700, 60, 0x6a7ff0);
  const taj = tajMahal(); g.add(taj);
  const r = RNG(61); clouds(g, 33, 0xffc0d0); birds(g, 8, 6, 60, -40, 0x2a1a3a);
  const sj = human(SHAHJAHAN, { scale: 1.05, face: -1, id: 'sj2' }); g.add(sj);
  const crowd = []; for (let i = 0; i < 10; i++) { const f = human(workerSpec(r), { scale: 0.95, face: -1, id: 'c' + i }); g.add(f); crowd.push({ f, x: (i % 2 ? 1 : -1) * (12 + (i >> 1) * 1.4), z: 160 + (i % 3) }); }
  const spirits = [0xff7ab6, 0xffd23f].map(c => { const s = glow(c, 1.6, 0, 0, 0, 0.9); g.add(s); return s; });
  S.push({ g, year: '1653', label: 'Complete after 22 Years', sky: sky(SUNSET), fog: [0xffb0a0, 200, 900], sun: [0xffc29a, 2.5, [-20, 14, 30]], hemi: [0xffe0f0, 0x9a6a8a, 1.65],
    update(t, d) {
      const later = subT(5, 'Years', d * 0.6);
      placeFig(sj, -3, 168, t < later ? handsTogether : sadPose(t), t, t < later ? 'happy' : 'smile');
      crowd.forEach(({ f, x, z }, i) => placeFig(f, x, z, cheer2(t, i), t, 'happy'));
      const k = smooth((t - later) / (d - later - 0.3));
      spirits.forEach((s, i) => { s.visible = t > later; s.position.set((i ? 6 : -6) * (1 - k), lerp(4, 70, k) + Math.sin(t * 2 + i) * 0.5, lerp(150, 0, k)); s.scale.setScalar(lerp(1.8, 7, k)); });
      const p = t / d;
      if (p < 0.55) look(lerp(4, 0, smooth(p / 0.55)), lerp(3, 7, smooth(p / 0.55)), lerp(178, 230, smooth(p / 0.55)), 0, lerp(8, 32, smooth(p / 0.55)), 0);
      else look(lerp(0, 18, smooth((p - 0.55) / 0.45)), lerp(7, 24, smooth((p - 0.55) / 0.45)), lerp(230, 190, smooth((p - 0.55) / 0.45)), 0, lerp(32, 42, smooth((p - 0.55) / 0.45)), 0);
    } });
}
// 7 — today: visitors from all over the world
{
  const g = new THREE.Group(); gardens(g); river(g, -110, 700, 60, 0x3a9ee0);
  const taj = tajMahal(); g.add(taj);
  const r = RNG(77); clouds(g, 44); birds(g, 10, 8, 50, -30);
  const people = []; for (let i = 0; i < 26; i++) { const f = human(touristSpec(r), { scale: 0.85 + r() * 0.2, face: r() < 0.5 ? 1 : -1, id: 't' + i }); g.add(f);
    const phone = box(0.12, 0.2, 0.03, 0x1b1b1b, 0, 0, 0.05); if (i % 3 === 0) f.userData.prop.add(phone);
    people.push({ f, x: (r() - 0.5) * 22, z: 140 + r() * 40, mode: i % 3, ph: r() * 6, sp: 0.5 + r() * 0.6 }); }
  S.push({ g, year: 'TODAY', label: 'UNESCO World Heritage Site', sky: sky(DAY), fog: [0xd6f1ff, 220, 1000], sun: [0xfff6e0, 2.6, [14, 26, 30]], hemi: [0xe6f4ff, 0x6fd44b, 1.6],
    update(t, d) {
      people.forEach(({ f, x, z, mode, ph, sp }) => { if (mode === 0) placeFig(f, x, z, photoPose, t, 'happy'); else if (mode === 1) { const dir = f.userData.body.scale.x > 0 ? 1 : -1; placeFig(f, x + ((t * sp * dir + 30) % 12) - 6, z, walkPose(t * 6 * sp + ph, 0, 0.6), t, 'smile'); } else placeFig(f, x, z, cheer2(t, ph), t, 'wow'); });
      const p = t / d;
      look(lerp(8, 0, smooth(p)), lerp(3.2, 12, smooth(p)), lerp(175, 250, smooth(p)), 0, lerp(6, 34, smooth(p)), lerp(140, 0, smooth(p)));
    } });
}
S.forEach(s => { s.g.visible = false; scene.add(s.g); });
renderer.localClippingEnabled = true;

// ---------- overlay ----------
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
  sun.target.position.copy(focus); sun.position.set(focus.x + s.sun[2][0] * 2, s.sun[2][1] * 2, focus.z + s.sun[2][2] * 2);
  camera.updateMatrixWorld(); camPos.copy(camera.position);
  figures.forEach(f => { if (!f.visible) return; f.getWorldPosition(wp); f.rotation.y = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) * 0.85 - (f.parent && f.parent.rotation ? f.parent.rotation.y : 0); });
  renderer.render(scene, camera);
  overlay(t, i, lt, d);
};
window.DURATION = TL.duration;
await document.fonts.ready;
await Promise.all(['500', '600', '800'].map(w => document.fonts.load(`${w} 40px Poppins`)));
window.renderFrame(0);
window.READY = true;
