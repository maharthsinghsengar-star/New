// WHY DO RAILWAY TRACKS HAVE GAPS? — 2.5D stickman story: flat outlined characters (big white heads, noodle limbs)
// in textured, warmly lit 3D sets with depth-of-field (9:16). Deterministic: window.renderFrame(t).
import * as THREE from 'three';

const W = 1080, H = 1920;
const TL = await (await fetch('build/timeline.json')).json();
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 900);
const hemi = new THREE.HemisphereLight(0xfff1dc, 0x8a6a4a, 1.25), sun = new THREE.DirectionalLight(0xffe2b8, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
scene.add(hemi, sun, sun.target);
let NOW = 0, BEAT = TL.beats[0];

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hit = (t, t0, len = 0.5) => (t >= t0 && t < t0 + len) ? 1 - (t - t0) / len : 0;
const backOut = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function canvasTex(w, h, draw, rx = 1, ry = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
const speckle = (base, cols, n, extra) => (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); const r = RNG(n + base.length); for (let i = 0; i < n; i++) { x.globalAlpha = 0.25 + r() * 0.5; x.fillStyle = cols[r() * cols.length | 0]; const s = 1 + r() * 4; x.fillRect(r() * w, r() * h, s, s); } x.globalAlpha = 1; if (extra) extra(x, w, h, r); };
const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(geo, typeof mat === 'number' ? S(mat) : mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; }
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (r1, r2, h, mat, x, y, z, s = 20) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat, x, y, z);
const sph = (r, mat, x, y, z) => mesh(new THREE.SphereGeometry(r, 20, 14), mat, x, y, z);
const G = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
const glowTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
function glow(c, s, x, y, z, op = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op })); sp.scale.setScalar(s); sp.position.set(x, y, z); return sp; }
function textPlane(w, h, draw, mat = {}) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), S(0xffffff, { map: canvasTex(Math.round(w * 200), Math.round(h * 200), draw), ...mat })); }

// ---------- flat 2.5D characters: big white outlined heads, thin black limbs, white circle hands ----------
const INK = 0x141218;
const flatMat = (c, o = {}) => B(c, { side: THREE.DoubleSide, ...o });
const OUT = flatMat(INK);
const ellG = (rx, ry) => new THREE.CircleGeometry(1, 36).scale(rx, ry, 1);
const capG = (th, len) => new THREE.CapsuleGeometry(th / 2, len, 4, 10).scale(1, 1, 0.1);
const poly = (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
const rrect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return new THREE.ShapeGeometry(s, 8); };
function Pt(geo, fill, x, y, z, parent, grow = 0.022) {
  const a = new THREE.Mesh(geo, typeof fill === 'number' ? flatMat(fill) : fill); a.position.set(x, y, z); parent.add(a);
  if (grow) { geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3()), c = geo.boundingBox.getCenter(new THREE.Vector3());
    const b = new THREE.Mesh(geo, OUT), sx = 1 + 2 * grow / s.x, sy = 1 + 2 * grow / s.y; b.scale.set(sx, sy, 1); b.position.set(x - c.x * (sx - 1), y - c.y * (sy - 1), z - 0.003); parent.add(b); }
  return a;
}
const people = [];
function faceOf(kind, hr, head) {
  const g = new THREE.Group(), ex = [-0.02 * hr, 0.44 * hr], ey = 0.08 * hr;
  const sc = kind === 'shock' ? 1.35 : 1;
  ex.forEach((x, i) => {
    if (kind === 'happy') Pt(new THREE.RingGeometry(0.07 * hr, 0.12 * hr, 12, 1, 0, Math.PI), INK, x, ey - 0.03 * hr, 0.002, g, 0);
    else Pt(ellG(0.075 * hr * sc, 0.12 * hr * sc), INK, x, ey, 0.002, g, 0);
    const br = { worried: i ? -0.35 : 0.35, grit: i ? 0.3 : -0.3, shock: i ? -0.2 : 0.2, happy: i ? -0.15 : 0.15, talk: i ? 0.12 : -0.12, smile: i ? -0.1 : 0.1, wise: i ? 0.05 : -0.05 }[kind] ?? 0;
    const b = Pt(new THREE.PlaneGeometry(0.24 * hr, 0.06 * hr), INK, x, ey + (kind === 'shock' ? 0.34 : 0.27) * hr, 0.003, g, 0); b.rotation.z = br;
  });
  const m = new THREE.Group(); m.position.set(0.21 * hr, -0.42 * hr, 0.004); g.add(m);
  if (kind === 'grit' || kind === 'worried') { Pt(rrect(0.46 * hr, 0.17 * hr, 0.04 * hr), 0xffffff, 0, 0, 0, m, 0.018); for (let k = -2; k <= 2; k++) Pt(new THREE.PlaneGeometry(0.014 * hr, 0.15 * hr), INK, k * 0.08 * hr, 0, 0.002, m, 0); Pt(new THREE.PlaneGeometry(0.44 * hr, 0.012 * hr), INK, 0, 0, 0.002, m, 0); }
  else if (kind === 'smile' || kind === 'wise') Pt(new THREE.RingGeometry(0.13 * hr, 0.18 * hr, 16, 1, Math.PI * 1.1, Math.PI * 0.8), INK, 0, 0.12 * hr, 0, m, 0);
  else if (kind === 'happy' || kind === 'talk') { Pt(new THREE.CircleGeometry(0.2 * hr, 20, Math.PI, Math.PI), 0x6a1a22, 0, 0.05 * hr, 0, m, 0.016); Pt(new THREE.PlaneGeometry(0.3 * hr, 0.05 * hr), 0xffffff, 0, 0.025 * hr, 0.002, m, 0); }
  else if (kind === 'shock') Pt(ellG(0.1 * hr, 0.14 * hr), 0x6a1a22, 0, -0.02 * hr, 0, m, 0.016);
  else Pt(new THREE.PlaneGeometry(0.2 * hr, 0.03 * hr), INK, 0, 0, 0, m, 0);
  g.userData.mouth = m; g.position.z = 0.04; g.visible = false; head.add(g); return g;
}
function toon(o) {
  const s = o.h / 1.75, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hr = o.hr ?? 0.3, u = root.userData = { o, s, hr, body, ry: 0, yaw: 0, flip: 1, faces: {}, cur: null };
  const limb = (l1, l2, th, hand, far) => { const z = far ? -0.03 : 0.06, a = new THREE.Group(), b = new THREE.Group(); Pt(capG(th, l1).translate(0, -l1 / 2, 0), INK, 0, 0, z, a, 0); b.position.y = -l1; a.add(b); Pt(capG(th * 0.92, l2).translate(0, -l2 / 2, 0), INK, 0, 0, z, b, 0);
    if (hand) Pt(ellG(0.062, 0.062), 0xffffff, 0, -l2 - 0.03, z + 0.004, b, 0.018); else Pt(ellG(0.1, 0.05), o.shoes ?? INK, 0.06, -l2 - 0.02, z + 0.004, b, 0.012); return [a, b]; };
  const legLen = o.legs ?? 0.36;
  u.hipY = legLen * 2 + 0.06;
  u.legL = limb(legLen, legLen, 0.045, false, true); body.add(u.legL[0]);
  u.legR = limb(legLen, legLen, 0.045, false, false); body.add(u.legR[0]);
  const torsoP = u.torsoP = new THREE.Group(); body.add(torsoP);
  const tw = o.tw ?? 0.42, th = o.th ?? 0.5;
  Pt(rrect(tw, th, 0.1), o.top, 0, th / 2 - 0.04, 0.01, torsoP, 0.02);
  if (o.pants) Pt(rrect(tw * 0.98, 0.14, 0.05), o.pants, 0, 0.0, 0.012, torsoP, 0.016);
  if (o.stripe) Pt(new THREE.PlaneGeometry(tw * 0.96, 0.06), o.stripe, 0, th * 0.5, 0.013, torsoP, 0);
  if (o.vest) { Pt(poly([[-tw / 2 + 0.02, th - 0.1], [-0.05, th - 0.16], [-0.05, 0.02], [-tw / 2 + 0.02, 0.02]]), o.vest, 0, 0, 0.014, torsoP, 0.012); Pt(poly([[tw / 2 - 0.02, th - 0.1], [0.05, th - 0.16], [0.05, 0.02], [tw / 2 - 0.02, 0.02]]), o.vest, 0, 0, 0.014, torsoP, 0.012); [0.32, 0.2, 0.08].forEach(y => Pt(ellG(0.018, 0.018), 0xe8c040, 0.09, y, 0.016, torsoP, 0)); Pt(poly([[-0.16, 0.36], [-0.08, 0.36], [-0.1, 0.27], [-0.14, 0.27]]), 0xe8c040, 0, 0, 0.016, torsoP, 0.01); }
  if (o.tie) Pt(poly([[-0.03, th - 0.12], [0.03, th - 0.12], [0.04, th * 0.35], [0, th * 0.28], [-0.04, th * 0.35]]), o.tie, 0, 0, 0.015, torsoP, 0.01);
  if (o.straps) [-0.1, 0.1].forEach(x => Pt(new THREE.PlaneGeometry(0.04, th * 0.6), o.straps, x, th * 0.62, 0.015, torsoP, 0));
  u.armL = limb(0.27, 0.26, 0.04, true, true); u.armL[0].position.y = th - 0.12; torsoP.add(u.armL[0]);
  u.armR = limb(0.27, 0.26, 0.04, true, false); u.armR[0].position.y = th - 0.12; torsoP.add(u.armR[0]);
  u.hand = new THREE.Group(); u.hand.position.set(0, -0.29, 0.08); u.armR[1].add(u.hand);
  const head = u.head = new THREE.Group(); head.position.y = th - 0.06 + hr * 0.82; torsoP.add(head);
  if (o.hair === 'spiky') { [[-0.6, 0.85, 0.5], [-0.25, 1.05, 0.2], [0.15, 1.05, -0.2], [-0.85, 0.5, 0.9]].forEach(([x, y, r]) => { const m = Pt(poly([[-0.16, 0], [0.16, 0], [0, 0.32]].map(([a, b]) => [a * hr, b * hr])), INK, x * hr, y * hr - 0.1 * hr, 0.01, head, 0); m.rotation.z = r; }); Pt(new THREE.CircleGeometry(hr * 1.04, 30, Math.PI * 0.18, Math.PI * 0.85), INK, -0.04 * hr, 0.02 * hr, 0.008, head, 0); }
  if (o.hair === 'sides') { Pt(ellG(0.24 * hr, 0.34 * hr), 0xd8d8d8, -0.86 * hr, -0.05 * hr, 0.008, head, 0.012); }
  Pt(ellG(hr, hr), 0xf4f2ec, 0, 0, 0.02, head, 0.028);
  Pt(ellG(hr * 0.14, hr * 0.17), 0xf4f2ec, -hr * 0.92, -hr * 0.05, 0.022, head, 0.018);
  if (o.hair === 'spiky') { const m = Pt(new THREE.CircleGeometry(hr * 1.0, 30, Math.PI * 0.32, Math.PI * 0.62), INK, 0, 0, 0.025, head, 0); }
  if (o.moustache) Pt(poly([[-0.24, 0], [0.24, 0], [0.18, 0.1], [0, 0.06], [-0.18, 0.1]].map(([a, b]) => [a * hr, b * hr])), o.moustache, 0.21 * hr, -0.27 * hr, 0.05, head, 0.012);
  if (o.glasses) [-0.02, 0.44].forEach(x => { Pt(new THREE.RingGeometry(0.15 * hr, 0.19 * hr, 20), INK, x * hr, 0.08 * hr, 0.05, head, 0); }), Pt(new THREE.PlaneGeometry(0.14 * hr, 0.035 * hr), INK, 0.21 * hr, 0.1 * hr, 0.05, head, 0);
  if (o.cap) { Pt(rrect(hr * 2.0, hr * 0.62, hr * 0.18), o.cap, -0.02 * hr, hr * 0.86, 0.06, head, 0.024); Pt(rrect(hr * 2.2, hr * 0.16, hr * 0.06), INK, 0.12 * hr, hr * 0.56, 0.062, head, 0.012); if (o.badge) Pt(ellG(hr * 0.13, hr * 0.13), o.badge, 0.25 * hr, hr * 0.88, 0.064, head, 0.012); }
  if (o.helmet) { Pt(rrect(hr * 1.5, hr * 1.4, hr * 0.2), o.helmet, 0.25 * hr, 0.02 * hr, 0.07, head, 0.024); Pt(rrect(hr * 0.9, hr * 0.32, hr * 0.06), 0x2a3a48, 0.42 * hr, 0.1 * hr, 0.072, head, 0.012); }
  (o.faces ?? ['smile']).forEach(k => u.faces[k] = faceOf(k, hr, head)); u.cur = Object.values(u.faces)[0];
  u.back = Pt(ellG(hr * 0.99, hr * 0.99), o.hair === 'spiky' ? INK : 0xf4f2ec, 0, 0, 0.1, head, 0); u.back.visible = false;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34 * s, 24), B(0x000000, { transparent: true, opacity: 0.28, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; root.add(blob); u.blob = blob;
  body.scale.setScalar(s); root.visible = false; people.push(root); scene.add(root); return root;
}
function pose(f, p = {}) {
  const u = f.userData, w = p.walk, ph = w ? w[0] : 0, am = w ? (w[1] ?? 1) : 0, cr = p.crouch ?? 0, sit = p.sit ?? 0;
  u.body.position.y = (u.hipY - 0.2 * cr - 0.38 * sit) * u.s + (w ? 0.025 * u.s * am * Math.abs(Math.cos(ph)) : 0) + (p.hop ?? 0);
  u.torsoP.rotation.z = -(p.lean ?? cr * 0.35); u.head.rotation.z = -(p.tilt ?? 0) + (p.lean ?? cr * 0.35) * 0.5;
  const leg = (l, sg) => { l[0].rotation.z = 0.5 * am * Math.sin(ph) * sg + cr * 1.2 + sit * 1.5 + (w ? 0 : 0.07 * sg); l[1].rotation.z = -(am * (0.1 + 0.6 * Math.max(0, Math.cos(ph) * sg)) + cr * 2.1 + sit * 1.5); };
  leg(u.legR, 1); leg(u.legL, -1);
  const arm = (a, v, sg) => { a[0].rotation.z = v ? -v[0] : -0.45 * am * Math.sin(ph) * sg + 0.12 * sg; a[1].rotation.z = v ? -(v[2] ?? 0) : 0.25 * am + 0.15; };
  arm(u.armR, p.armR, 1); arm(u.armL, p.armL, -1);
  u.want = (p.face && u.faces[p.face]) || u.cur; u.talk = p.talk ?? 0; u.yaw = p.headYaw ?? 0; u.blob.visible = p.blob ?? true;
}
const facing = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
function put(f, x, z, ry = 0, y = 0) { f.visible = true; f.position.set(x, y, z); f.userData.ry = ry; }
function billboard() {
  people.forEach(f => { if (!f.visible) return; const u = f.userData, yaw = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z), ry = u.ry + u.yaw;
    f.rotation.set(0, yaw, 0); const side = Math.sin(ry) * Math.cos(yaw) - Math.cos(ry) * Math.sin(yaw), toCam = Math.sin(ry) * Math.sin(yaw) + Math.cos(ry) * Math.cos(yaw);
    u.flip = side < -0.15 ? -1 : 1; u.body.scale.set(u.s * u.flip, u.s, u.s);
    const away = toCam < -0.5; Object.values(u.faces).forEach(g => g.visible = false); u.back.visible = away;
    if (!away) { let fc = u.want ?? u.cur; if (u.talk > 0 && u.faces.talk && Math.sin(NOW * 24) > 0) fc = u.faces.talk; fc.visible = true; } });
}
const talking = (who) => BEAT.lines.some(l => l.who === who && NOW >= l.t0 && NOW <= l.t1) ? 1 : 0;
const FACES = ['smile', 'talk', 'grit', 'worried', 'shock', 'happy', 'wise', 'neutral'];
const leo = toon({ h: 1.22, hr: 0.29, legs: 0.25, tw: 0.36, th: 0.4, top: 0xd94a3a, stripe: 0xf2c94c, pants: 0x34507a, hair: 'spiky', shoes: 0x2a2a3a, faces: FACES });
const gramps = toon({ h: 1.78, hr: 0.31, legs: 0.37, tw: 0.46, th: 0.54, top: 0xe9e2d0, vest: 0x24345e, tie: 0x8a2a2a, pants: 0x24345e, hair: 'sides', moustache: 0xe8e8e8, glasses: true, cap: 0x24345e, badge: 0xe8c040, faces: FACES });
const driver = toon({ h: 1.7, hr: 0.3, top: 0x3a6ea8, straps: 0x2a4a78, pants: 0x2a4a78, hair: 'spiky', cap: 0x2a4a78, faces: ['grit', 'shock', 'worried'] });
const welder = toon({ h: 1.72, hr: 0.3, top: 0xf08a24, stripe: 0xe8e8e0, pants: 0x3a3a44, helmet: 0xf2c230, faces: ['grit'] });

// ---------- railway track builder ----------
const RAIL_Z = 0.7175, RAIL_TOP = 0.42;
const texBallast = canvasTex(256, 256, speckle('#a49a90', ['#867d74', '#bcb2a6', '#70685f', '#cec2b4', '#948a7e'], 4200), 30, 2);
const texSleeper = canvasTex(256, 64, speckle('#9a6236', ['#86522c', '#b07444', '#704422'], 500, (x, w, h, r) => { x.strokeStyle = 'rgba(40,24,12,0.5)'; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, 6 + i * 10 + r() * 4); x.lineTo(w, 8 + i * 10 + r() * 4); x.stroke(); } }));
const matRail = S(0x9a6a4a, { roughness: 0.55, metalness: 0.25 }), matRailTop = S(0xeef0f4, { roughness: 0.25, metalness: 0.7 }), matSleeper = S(0xffffff, { map: texSleeper }), matPlate = S(0x5a4a42, { roughness: 0.5, metalness: 0.5 });
function track(x0, x1, segLen, gap, z0 = 0, opts = {}) {
  const g = new THREE.Group(); g.position.z = z0; scene.add(g);
  const len = x1 - x0, mid = (x0 + x1) / 2;
  const bal = mesh(new THREE.BoxGeometry(len, 0.22, 4.2), S(0xffffff, { map: texBallast }), mid, 0.11, 0); bal.castShadow = false; g.add(bal);
  [-1, 1].forEach(s => { const sl = mesh(new THREE.BoxGeometry(len, 0.22, 0.9), S(0xffffff, { map: texBallast }), mid, 0.03, s * 2.3); sl.rotation.x = s * 0.45; sl.castShadow = false; g.add(sl); });
  const sleepers = []; for (let x = x0 + 0.3; x < x1; x += 0.62) { const m = mesh(new THREE.BoxGeometry(0.26, 0.13, 2.6), matSleeper, x, 0.285, 0); g.add(m); sleepers.push(m); }
  const segs = [], plates = [];
  const n = Math.round(len / segLen);
  for (let i = 0; i < n; i++) {
    const a = x0 + i * segLen + gap / 2, L = segLen - gap, c = a + L / 2;
    [-1, 1].forEach(side => {
      const geo = new THREE.BoxGeometry(L, 0.11, 0.075, Math.max(1, Math.round(L * 3)), 1, 1), r = mesh(geo, matRail, c, RAIL_TOP - 0.06, side * RAIL_Z);
      const top = mesh(new THREE.BoxGeometry(L, 0.035, 0.085, Math.max(1, Math.round(L * 3)), 1, 1), matRailTop, c, RAIL_TOP - 0.003, side * RAIL_Z);
      const foot = mesh(new THREE.BoxGeometry(L, 0.025, 0.15, Math.max(1, Math.round(L * 3)), 1, 1), matRail, c, RAIL_TOP - 0.125, side * RAIL_Z);
      [r, top, foot].forEach(m => { m.userData.base = m.geometry.attributes.position.array.slice(); m.userData.cx = c; m.userData.side = side; m.userData.L = L; g.add(m); });
      segs.push({ parts: [r, top, foot], c, L, side });
    });
    if (!opts.welded) { const jx = x0 + i * segLen; if (i > 0) [-1, 1].forEach(side => [-1, 1].forEach(f => { const p = mesh(new THREE.BoxGeometry(0.6, 0.08, 0.02), matPlate, jx, RAIL_TOP - 0.07, side * RAIL_Z + f * 0.05); g.add(p); plates.push(p); for (let b = -1; b <= 1; b += 2) g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8).rotateX(Math.PI / 2), matPlate, jx + b * 0.17, RAIL_TOP - 0.07, side * RAIL_Z + f * 0.065)); })); }
  }
  return { g, segs, sleepers, plates, x0, x1, gap, segLen };
}
// sideways buckle ("sun kink") centred at xk; amplitude A metres; also exaggerated expansion e (fraction)
function bend(tr, xk, A, wdt = 3.2) {
  const off = (x) => A * Math.exp(-(((x - xk) / wdt) ** 2));
  tr.segs.forEach(sg => sg.parts.forEach(m => { const p = m.geometry.attributes.position, b = m.userData.base; for (let i = 0; i < p.count; i++) { const wx = m.position.x + b[i * 3]; p.array[i * 3 + 2] = b[i * 3 + 2] + off(wx); } p.needsUpdate = true; }));
  tr.sleepers.forEach(s => s.position.z = off(s.position.x) * 0.85);
  tr.plates.forEach(p => { p.userData.z0 ??= p.position.z; p.position.z = p.userData.z0 + off(p.position.x); });
}
function expand(tr, k) { tr.segs.forEach(sg => sg.parts.forEach(m => m.scale.x = 1 + k * (tr.gap * 0.86) / m.userData.L)); }

// ---------- sets ----------
const sky = canvasTex(8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1f7ae8'); g.addColorStop(0.5, '#5fb2ff'); g.addColorStop(0.8, '#b8e2ff'); g.addColorStop(1, '#e8f6ff'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const skyHot = canvasTex(8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff7a1a'); g.addColorStop(0.5, '#ffaa3a'); g.addColorStop(0.8, '#ffd870'); g.addColorStop(1, '#fff0b0'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), B(0xffffff, { map: sky, side: THREE.BackSide, fog: false })); scene.add(skyDome);
scene.fog = new THREE.Fog(0xcfe6f8, 80, 380);
// STATION (origin): track along x at z = 0, platform on +z
const station = new THREE.Group(); scene.add(station);
const trS = track(-48, 48, 6, 0.07); station.add(trS.g);
const texConc = canvasTex(256, 256, speckle('#d8d2c8', ['#c8c2b8', '#e6e0d6', '#bcb6ac'], 2600, (x, w, h) => { x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 2; x.strokeRect(0, 0, w, h); }), 24, 3);
station.add(mesh(new THREE.BoxGeometry(96, 0.95, 7), S(0xffffff, { map: texConc }), 0, 0.475, 5.1));
station.add(mesh(new THREE.BoxGeometry(96, 0.02, 0.32), S(0xf2c230), 0, 0.96, 2.05));
station.add(mesh(new THREE.BoxGeometry(96, 0.06, 0.25), S(0xe8e2d6), 0, 0.93, 1.69));
const texBrick = canvasTex(256, 256, speckle('#e8743e', ['#d8622e', '#f2884e', '#c8562a'], 900, (x, w, h) => { x.fillStyle = 'rgba(230,210,190,0.75)'; for (let y = 0; y < h; y += 16) { x.fillRect(0, y, w, 3); for (let k = (y / 16 % 2) * 24; k < w; k += 48) x.fillRect(k, y, 3, 16); } }), 30, 3);
station.add(mesh(new THREE.BoxGeometry(96, 5.2, 0.4), S(0xffffff, { map: texBrick }), 0, 3.5, 8.6));
station.add(mesh(new THREE.BoxGeometry(96, 0.25, 7.6), S(0xe23a3a), 0, 5.1, 5.0), mesh(new THREE.BoxGeometry(96, 0.5, 0.2), S(0xe8e0cc), 0, 4.9, 1.3));
for (let x = -38.5; x <= 42; x += 7) station.add(cyl(0.12, 0.12, 4.2, S(0x14a88a, { roughness: 0.4 }), x, 3.0, 2.0, 14));
const poster = (x, c1, c2, title) => { const p = textPlane(1.4, 2.0, (c, w, h) => { c.fillStyle = c1; c.fillRect(0, 0, w, h); c.fillStyle = c2; c.beginPath(); c.arc(w / 2, h * 0.4, w * 0.3, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${w * 0.13}px Poppins`; c.textAlign = 'center'; c.fillText(title, w / 2, h * 0.85); c.strokeStyle = '#2a2a2a'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12); }); p.position.set(x, 2.3, 8.38); p.rotation.y = Math.PI; station.add(p); };
poster(-3.2, '#1aa0d8', '#ffd93a', 'VISIT THE SEA'); poster(2.8, '#ff4a5a', '#fff2c0', 'EXPRESS'); poster(7.5, '#3ac25a', '#ffa83a', 'HILLS');
const sign = textPlane(4.2, 0.8, (c, w, h) => { c.fillStyle = '#1a5ad8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f4f0e4'; c.lineWidth = 10; c.strokeRect(12, 12, w - 24, h - 24); c.fillStyle = '#f4f0e4'; c.font = `800 ${h * 0.45}px Poppins`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MAPLE JUNCTION', w / 2, h / 2 + 4); });
sign.position.set(0.4, 4.25, 1.45); station.add(sign, cyl(0.02, 0.02, 0.4, S(0x2a2a2a), -1.4, 4.75, 1.45, 6), cyl(0.02, 0.02, 0.4, S(0x2a2a2a), 2.2, 4.75, 1.45, 6));
const clockS = G(cyl(0.45, 0.45, 0.12, S(0x2a2a2a), 0, 0, 0, 28)); clockS.children[0].rotation.x = Math.PI / 2; const face = textPlane(0.8, 0.8, (c, w) => { c.fillStyle = '#f6f2e8'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2, w * 0.18); c.moveTo(w / 2, w / 2); c.lineTo(w * 0.72, w * 0.55); c.stroke(); }); face.position.z = -0.07; face.rotation.y = Math.PI; clockS.add(face); clockS.position.set(-5.5, 4.25, 1.45); station.add(clockS);
const bench = G(box(2.2, 0.08, 0.5, S(0x8a5a32), 0, 0.5, 0), box(2.2, 0.4, 0.06, S(0x8a5a32), 0, 0.8, 0.25), box(0.08, 0.5, 0.45, S(0x2a2a2a), -0.9, 0.25, 0), box(0.08, 0.5, 0.45, S(0x2a2a2a), 0.9, 0.25, 0)); bench.position.set(-3.6, 0.95, 6.6); station.add(bench);
const lampP = (x) => station.add(cyl(0.05, 0.05, 3.4, S(0x2a2a2a), x, 2.65, 3.6, 8), sph(0.18, S(0xfff0c8, { emissive: 0xffd890, emissiveIntensity: 0.6 }), x, 4.4, 3.6));
lampP(-9); lampP(9);
const texGrass = canvasTex(256, 256, speckle('#5fc23a', ['#4fb02e', '#72d44a', '#46a428', '#86e05a'], 3000), 60, 60);
const grass = mesh(new THREE.PlaneGeometry(400, 400), S(0xffffff, { map: texGrass }), 0, 0, 0); grass.rotation.x = -Math.PI / 2; grass.castShadow = false; station.add(grass);
for (let x = -46; x <= 46; x += 2.4) station.add(box(0.08, 1.0, 0.08, S(0xe8e0d0), x, 0.5, -4.2)); station.add(box(96, 0.08, 0.06, S(0xe8e0d0), 0, 0.85, -4.2), box(96, 0.08, 0.06, S(0xe8e0d0), 0, 0.45, -4.2));
const treeA = (x, z, s) => { const t = G(cyl(0.18, 0.26, 2.4, S(0x6a4a30), 0, 1.2, 0, 10), sph(1.5, S(0x3ab83a), 0, 3.2, 0), sph(1.1, S(0x5ad04a), 0.8, 3.8, 0.3), sph(1.0, S(0x2aa034), -0.8, 2.9, 0.2)); t.position.set(x, 0, z); t.scale.setScalar(s); station.add(t); };
[[-14, -9, 1.2], [-4, -11, 1.4], [8, -10, 1.1], [17, -12, 1.5], [26, -9, 1.2], [-24, -12, 1.4]].forEach(a => treeA(...a));
for (let i = 0; i < 8; i++) { const hh = G(box(5, 3.4, 4, S([0xffe08a, 0xff9a7a, 0x9ad8ff, 0xc8f08a][i % 4]), 0, 1.7, 0), mesh(new THREE.ConeGeometry(3.8, 2.0, 4).rotateY(Math.PI / 4), S(0xe2443a), 0, 4.4, 0)); hh.position.set(-40 + i * 11.5, 0, -22 - (i % 3) * 4); station.add(hh); }
station.add(mesh(new THREE.SphereGeometry(80, 24, 12), S(0x5ac24a), -60, -50, -170), mesh(new THREE.SphereGeometry(70, 24, 12), S(0x4ab04a), 70, -45, -180));
// THE LINE (x ~ 300): open country for the flashback, the kink, the train, the wheel and the welding
const LX = 300, line = new THREE.Group(); scene.add(line);
const trL = track(LX - 60, LX + 60, 6, 0.07); line.add(trL.g);
const trW = track(LX - 60, LX + 60, 120, 0.0, 9, { welded: true }); line.add(trW.g);
const texSand = canvasTex(256, 256, speckle('#f2b45a', ['#e8a44a', '#ffc46a', '#d8943e', '#ffd080'], 3200), 60, 60);
const sand = mesh(new THREE.PlaneGeometry(500, 500), S(0xffffff, { map: texSand }), LX, 0, 0); sand.rotation.x = -Math.PI / 2; sand.castShadow = false; line.add(sand);
const lgrass = mesh(new THREE.PlaneGeometry(500, 500), S(0xffffff, { map: texGrass }), LX, 0.005, 0); lgrass.rotation.x = -Math.PI / 2; lgrass.castShadow = false; line.add(lgrass);
for (let i = 0; i < 7; i++) { const m = mesh(new THREE.CylinderGeometry(14 + i * 3, 20 + i * 3, 18 + (i % 3) * 8, 7), S(0xe8783a), LX - 150 + i * 50, 8, -120 - (i % 2) * 30); line.add(m); }
const cactus = (x, z, s) => { const c = G(cyl(0.22, 0.25, 2.2, S(0x3ab04a), 0, 1.1, 0, 12), cyl(0.16, 0.16, 0.9, S(0x3ab04a), 0.45, 1.3, 0, 10), cyl(0.15, 0.15, 0.7, S(0x3ab04a), -0.42, 1.6, 0, 10)); c.children[1].rotation.z = 0; c.position.set(x, 0, z); c.scale.setScalar(s); line.add(c); return c; };
const cacti = [[LX - 8, -6, 1.2], [LX + 6, -8, 1.0], [LX - 20, -5, 1.4], [LX + 18, -7, 1.3], [LX + 2, -13, 0.9]].map(a => cactus(...a));
const sunS = glow(0xfff0c0, 90, LX - 60, 150, -300, 0.95); line.add(sunS);
const thermo = G(cyl(0.16, 0.16, 2.6, S(0xf4f4f0, { roughness: 0.3 }), 0, 1.6, 0, 16), sph(0.32, S(0xd83a2a), 0, 0.3, 0)); const thermoFill = cyl(0.09, 0.09, 1, S(0xd83a2a), 0, 0, 0.06, 12); thermo.add(thermoFill);
const thermoLbl = textPlane(1.1, 0.5, (c, w, h) => { c.fillStyle = '#f4f0e4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#222'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#c02a1a'; c.font = `800 ${h * 0.6}px Poppins`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('50°C', w / 2, h / 2 + 4); }); thermoLbl.position.set(0, 3.3, 0); thermo.add(thermoLbl); thermo.position.set(LX - 1.5, 0, 2.6); line.add(thermo);
const setThermo = (k) => { thermoFill.scale.y = 0.1 + 2.0 * k; thermoFill.position.y = 0.45 + (0.1 + 2.0 * k) / 2; thermoLbl.visible = k > 0.85; };
// growing-rail prop with a tape measure
const tape = G(); line.add(tape);
const tapeStrip = mesh(new THREE.BoxGeometry(1, 0.01, 0.12), S(0xf2c230), 0, 0, 0); tape.add(tapeStrip);
const tapeLbl = textPlane(1.6, 0.6, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#222'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#c02a1a'; c.font = `800 ${h * 0.55}px Poppins`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+60 cm', w / 2, h / 2 + 4); }); tape.add(tapeLbl);
// the train: red-and-cream locomotive + two carriages; front faces -x
const train = new THREE.Group(); scene.add(train);
const red = S(0xe8302a, { roughness: 0.4, metalness: 0.1 }), cream = S(0xfff2d0, { roughness: 0.45 }), dark = S(0x2a2a30, { roughness: 0.6 }), glass = S(0x2a3a4a, { roughness: 0.15, metalness: 0.4 });
function car(x, loco) { const g = new THREE.Group(); g.position.x = x; train.add(g);
  g.add(box(loco ? 7 : 8, 2.4, 2.9, red, 0, 2.2, 0), box(loco ? 7 : 8, 0.6, 2.95, cream, 0, 2.6, 0), box(loco ? 7.2 : 8.2, 0.25, 3.0, dark, 0, 3.5, 0), box(loco ? 7 : 8, 0.3, 2.6, dark, 0, 0.85, 0));
  const n = loco ? 1 : 4; for (let i = 0; i < n; i++) [-1, 1].forEach(s => g.add(box(loco ? 1.2 : 1.1, 0.7, 0.04, glass, (loco ? -2.3 : -2.8 + i * 1.85), 2.65, s * 1.48)));
  for (const wx of [-2.4, -1.4, 1.4, 2.4]) [-1, 1].forEach(s => { const w = cyl(0.46, 0.46, 0.12, dark, wx, 0.92, s * RAIL_Z, 20); w.rotation.x = Math.PI / 2; g.add(w); g.userData.wheels = (g.userData.wheels || []).concat(w); });
  if (loco) { g.add(box(0.3, 2.2, 2.9, red, -3.6, 2.1, 0), box(0.06, 0.8, 2.2, S(0x9ab8c8, { transparent: true, opacity: 0.25, roughness: 0.1 }), -3.76, 2.85, 0), box(0.04, 0.5, 2.92, cream, -3.77, 2.0, 0), box(0.5, 0.22, 2.0, S(0xf2c230), -3.8, 1.25, 0), glow(0xfff4c0, 1.6, -3.85, 1.6, 0, 0.9), sph(0.18, S(0xfff4d0, { emissive: 0xfff0c0, emissiveIntensity: 1.2 }), -3.78, 1.6, 0), box(0.5, 0.35, 2.4, dark, -3.75, 0.95, 0)); }
  return g; }
const cars = [car(0, true), car(7.8, false), car(16.2, false)];
const sparks = Array.from({ length: 14 }, () => { const s = glow(0xffb040, 0.35, 0, 0, 0, 1); s.visible = false; scene.add(s); return s; });
// close-up wheel for the clickety-clack shot
const bigWheel = G(); { const w = cyl(0.46, 0.46, 0.13, dark, 0, 0, 0, 36); w.rotation.x = Math.PI / 2; const fl = cyl(0.52, 0.52, 0.03, dark, 0, 0, -0.07, 36); fl.rotation.x = Math.PI / 2; bigWheel.add(w, fl); for (let i = 0; i < 6; i++) { const sp = box(0.06, 0.8, 0.02, S(0x5a5a62), 0, 0, 0.075); sp.rotation.z = i * Math.PI / 6; bigWheel.add(sp); } bigWheel.add(cyl(0.1, 0.1, 0.4, S(0x8a8a92), 0, 0, 0.1, 14).rotateX(Math.PI / 2)); }
const wheelArm = G(bigWheel, box(2.2, 0.3, 0.1, dark, 0, 0.62, 0.1)); scene.add(wheelArm);
// welding props: sparks + rail clips
const clips = []; for (let i = 0; i < 6; i++) [-1, 1].forEach(s => { const c = G(box(0.14, 0.05, 0.12, S(0x3a3a3a, { metalness: 0.4 }), 0, 0, 0), box(0.04, 0.06, 0.12, S(0x3a3a3a, { metalness: 0.4 }), -0.05 * s, 0.04, 0)); c.userData.x = LX + 4 + i * 0.62 - 1.2; c.userData.s = s; line.add(c); clips.push(c); });
const weldGlow = glow(0xbfe6ff, 1.6, 0, 0, 0, 1); scene.add(weldGlow);

// ---------- post: depth of field + warm grade ----------
const rtMain = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H) });
const rtA = new THREE.WebGLRenderTarget(W / 4, H / 4, { type: THREE.HalfFloatType }), rtB = rtA.clone();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadScene = new THREE.Scene(); quadScene.add(quad);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = vec3(0.); float w[5]; w[0]=.227; w[1]=.195; w[2]=.122; w[3]=.054; w[4]=.016; c += texture2D(tex, vUv).rgb*w[0]; for(int i=1;i<5;i++){ c += texture2D(tex, vUv + dir*float(i)).rgb*w[i]; c += texture2D(tex, vUv - dir*float(i)).rgb*w[i]; } gl_FragColor = vec4(c, 1.); }' });
const compMat = new THREE.ShaderMaterial({ uniforms: { sharp: { value: rtMain.texture }, blur: { value: rtB.texture }, depth: { value: rtMain.depthTexture }, near: { value: 0.05 }, far: { value: 900 }, focus: { value: 3 }, range: { value: 2 }, maxB: { value: 1 }, tint: { value: new THREE.Vector3(1.03, 1.0, 0.96) }, heat: { value: 0 }, time: { value: 0 }, flash: { value: 0 }, flashC: { value: new THREE.Vector3(1, 1, 1) } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D sharp, blur, depth; uniform float near, far, focus, range, maxB, heat, time, flash; uniform vec3 tint, flashC; varying vec2 vUv;
  float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
  void main(){ vec2 uv = vUv; uv.x += heat * 0.0025 * sin(uv.y * 140. + time * 9.) * smoothstep(0.75, 0.3, uv.y);
    float z = lin(texture2D(depth, uv).r); float coc = clamp(abs(z - focus) / range - 0.15, 0., 1.) * maxB;
    vec3 c = mix(texture2D(sharp, uv).rgb, texture2D(blur, uv).rgb, coc);
    c *= tint * 1.18; c = c / (1. + c * 0.08) * 1.06; float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, 1.42); c = max(c, 0.);
    vec2 v = vUv - .5; c *= 1. - dot(v * vec2(0.9, 0.6), v * vec2(0.9, 0.6)) * 0.45;
    c = mix(c, flashC, flash); c = pow(clamp(c, 0., 1.), vec3(1. / 2.2)); gl_FragColor = vec4(c, 1.); }` });
function postRender(dof) {
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  quad.material = blurMat; blurMat.uniforms.tex.value = rtMain.texture; blurMat.uniforms.dir.value.set(1.6 / (W / 4), 0); renderer.setRenderTarget(rtA); renderer.render(quadScene, quadCam);
  blurMat.uniforms.tex.value = rtA.texture; blurMat.uniforms.dir.value.set(0, 1.6 / (H / 4)); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
  blurMat.uniforms.tex.value = rtB.texture; blurMat.uniforms.dir.value.set(2.4 / (W / 4), 0); renderer.setRenderTarget(rtA); renderer.render(quadScene, quadCam);
  blurMat.uniforms.tex.value = rtA.texture; blurMat.uniforms.dir.value.set(0, 2.4 / (H / 4)); renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
  const u = compMat.uniforms; u.focus.value = dof[0]; u.range.value = dof[1]; u.maxB.value = dof[2] ?? 1; u.time.value = NOW;
  quad.material = compMat; renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}

// ---------- staging ----------
let DOF = [3, 2, 1];
function cam(px, py, pz, tx, ty, tz, fov = 50, sway = 1) {
  const s = 0.01 * sway; camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(px + Math.sin(NOW * 0.7) * s, py + Math.sin(NOW * 0.9 + 1) * s, pz); camera.lookAt(tx + Math.sin(NOW * 0.5) * s, ty + Math.cos(NOW * 0.6) * s, tz);
  DOF = [Math.hypot(tx - px, ty - py, tz - pz), DOF[1], DOF[2]];
}
const camL = (a, b, u, f = smooth) => { const k = f(u); cam(...a.map((v, i) => lerp(v, b[i] ?? v, k))); };
const shake = (a) => { camera.position.x += Math.sin(NOW * 61) * a; camera.position.y += Math.cos(NOW * 73) * a; };
function mood(k) {
  const hot = k === 'hot';
  skyDome.material.map = hot ? skyHot : sky; scene.fog.color.set(hot ? 0xf8dca0 : 0xcfe6f8);
  hemi.intensity = hot ? 1.75 : 1.8; hemi.color.set(hot ? 0xfff4d8 : 0xeaf4ff); hemi.groundColor.set(hot ? 0xc88a4a : 0x9a8a6a); sun.intensity = hot ? 3.4 : 3.2; sun.color.set(hot ? 0xffe0b0 : 0xfff0d8);
  compMat.uniforms.tint.value.set(...(hot ? [1.1, 0.99, 0.84] : [1.03, 1.0, 0.96])); compMat.uniforms.heat.value = hot ? 1 : 0;
  sand.visible = hot; lgrass.visible = !hot; cacti.forEach(c => c.visible = hot); sunS.visible = hot;
  matRail.emissive.set(0xff5a1a); matRail.emissiveIntensity = 0; matRailTop.emissive.set(0xff7a2a); matRailTop.emissiveIntensity = 0;
}
function sunAt(x, y, z) { sun.position.set(x - 12, y + 22, z - 12); sun.target.position.set(x, y, z); }
function reset() {
  people.forEach(p => { p.visible = false; const u = p.userData; u.want = null; u.yaw = 0; u.talk = 0; });
  station.visible = true; line.visible = true; train.visible = false; wheelArm.visible = false; tape.visible = false; thermo.visible = false; weldGlow.visible = false;
  sparks.forEach(s => s.visible = false); clips.forEach(c => c.visible = false);
  bend(trL, LX, 0); expand(trL, 0); bend(trS, 0, 0);
  compMat.uniforms.flash.value = 0; DOF = [3, 2.2, 1]; mood('day');
}
function trainAt(x, z = 0, y = 0) { train.visible = true; train.position.set(x, y, z); cars.forEach(c => (c.userData.wheels || []).forEach(w => w.rotation.y = -x / 0.46)); }
const DEF = { leo: [0.3, 2.55], gp: [-0.55, 2.95] };
function duo(lf = {}, gf = {}) { put(leo, DEF.leo[0], DEF.leo[1], Math.PI, 0.95); pose(leo, { face: 'smile', talk: talking('l'), ...lf }); put(gramps, DEF.gp[0], DEF.gp[1], Math.PI, 0.95); pose(gramps, { face: 'smile', talk: talking('g'), ...gf }); }

// ---------- shots: one per narration beat. t = seconds into the beat, d = its length, l(k)/e(k) = start/end of line k ----------
const SHOT = {
  station(t, d) { sunAt(0, 0, 2); duo({ face: t > 2.2 ? 'worried' : 'smile', headYaw: t > 2.2 ? 0 : 0.0 }, { face: 'smile' });
    trainAt(-80); camL([5.5, 3.4, -3.6, -0.2, 1.4, 2.4, 50], [3.2, 2.4, -1.6, -0.1, 1.5, 2.6, 46], t / d); DOF[1] = 6; DOF[2] = 0.7; },
  gap(t, d) { sunAt(0, 0, 0); put(leo, 0.15, 2.05, Math.PI, 0.95); pose(leo, { crouch: 0.8, face: 'worried', armR: [-1.3, 0, 0.2] }); put(gramps, -0.7, 2.9, Math.PI, 0.95); pose(gramps, {});
    camL([0.9, 1.1, -0.1, 0.0, 0.42, 0.72, 40], [0.55, 0.95, 0.15, 0.0, 0.42, 0.72, 34], t / d); DOF[1] = 0.45; DOF[2] = 1; },
  ask(t, d) { sunAt(0, 0, 2); duo({ face: 'worried', armR: [-1.4, 0, 0.1], headYaw: 0 }, { face: 'smile' }); camL([0.15, 1.75, -1.3, -0.15, 1.7, 2.75, 45], [0.1, 1.75, -0.95, -0.15, 1.7, 2.75, 43], t / d); DOF[1] = 1.6; },
  laugh(t, d, l) { sunAt(0, 0, 2); const lg = t < l(1); duo({ face: lg ? 'worried' : 'smile' }, { face: lg ? 'happy' : 'wise', hop: lg ? Math.abs(Math.sin(t * 10)) * 0.02 : 0, armR: lg ? undefined : [-2.0, 0, -0.6], armL: [0.6, 0, -1.8] });
    camL([-0.15, 2.2, -0.2, -0.55, 2.15, 2.95, 44], [-0.3, 2.2, 0.3, -0.55, 2.15, 2.95, 42], t / d); DOF[1] = 1.2; },
  heat(t, d) { mood('hot'); sunAt(LX, 0, 0); thermo.visible = true; const k = smooth(seg(t, 1.6, 5.4)); setThermo(k); matRail.emissiveIntensity = 0.35 * k; matRailTop.emissiveIntensity = 0.25 * k;
    camL([LX + 3.0, 1.7, 7.4, LX - 1.0, 1.4, 1.8, 46], [LX + 2.4, 1.6, 6.4, LX - 1.0, 1.5, 1.9, 44], t / d); DOF[1] = 6; DOF[2] = 0.6; },
  grow(t, d) { mood('hot'); sunAt(LX, 0, 0); matRail.emissiveIntensity = 0.3; const k = smooth(seg(t, 1.0, 2.6)); expand(trL, 0);
    tape.visible = true; const x0 = LX + 60 - 0.035; tapeStrip.scale.x = Math.max(0.01, 0.6 * k); tapeStrip.position.set(x0 + 0.3 * k, RAIL_TOP + 0.02, RAIL_Z + 0.2); tapeLbl.position.set(x0 + 0.3, RAIL_TOP + 0.7, RAIL_Z + 0.25); tapeLbl.visible = k > 0.95; tapeLbl.lookAt(camera.position);
    trL.segs.forEach(sg => { if (Math.abs(sg.c - (LX + 57)) < 0.1 && sg.side === 1) sg.parts.forEach(m => { m.scale.x = 1 + 0.6 * k / m.userData.L; m.position.x = sg.c + 0.3 * k; }); });
    camL([LX + 60.9, 1.5, 2.6, LX + 59.9, 0.5, 0.72, 42], [LX + 60.7, 1.25, 2.2, LX + 60.0, 0.5, 0.72, 40], t / d); DOF[1] = 1.4; },
  kink(t, d, l) { mood('hot'); sunAt(LX, 0, 0); matRail.emissiveIntensity = 0.35; const A = 0.75 * smooth(seg(t, l(0) + 2.0, l(0) + 4.4));
    bend(trL, LX, A); if (A > 0.05 && A < 0.74) shake(0.004);
    camL([LX - 9, 3.2, 1.2, LX + 1, 0.4, 0.3, 44], [LX - 7.5, 2.4, 2.4, LX, 0.4, 0.4, 42], t / d); DOF[1] = 8; DOF[2] = 0.6; },
  danger(t, d) { mood('hot'); sunAt(LX, 0, 0); bend(trL, LX, 0.75); const stop = smooth(seg(t, 0.2, 2.0)), x = lerp(LX + 30, LX + 6.5, 1 - (1 - stop) * (1 - stop)); trainAt(x);
    put(driver, x - 3.3, 0.0, -Math.PI / 2, 1.05); pose(driver, { face: t > 0.9 ? 'shock' : 'grit', blob: false, armR: [-1.6, 0, 0.2] });
    if (t > 0.9 && t < 1.95) sparks.forEach((s, i) => { const k = (t * 3 + i / sparks.length) % 1; s.visible = true; s.position.set(x - 2.4 + k * 0.6, 0.5 + Math.sin(i * 2) * 0.2 * k + k * 0.4, (i % 2 ? 1 : -1) * (RAIL_Z + 0.1 + k * 0.4)); s.material.opacity = 1 - k; s.scale.setScalar(0.25 + 0.2 * k); });
    cam(LX + 0.4, 1.5, 4.4, LX + 7.5, 1.4, 0, 46); shake(t > 0.9 && t < 2 ? 0.02 : 0); DOF[1] = 10; DOF[2] = 0.5; },
  fix(t, d, l) { const p1 = t < 1.6;
    if (p1) { sunAt(0, 0, 2); duo({ face: 'smile' }, { face: 'talk', talk: 1, armR: [-1.5, 0, -0.3] }); cam(-0.3, 2.2, 0.3, -0.55, 2.15, 2.95, 42); DOF[1] = 1.2; return; }
    mood('hot'); sunAt(LX, 0, 0); thermo.visible = true; const k = smooth(seg(t, 2.6, 5.0)); setThermo(0.2 + 0.8 * k); expand(trL, k); matRail.emissiveIntensity = 0.3 * k;
    thermo.position.set(LX - 0.9, 0, 1.9);
    camL([LX + 1.1, 1.15, 2.0, LX, 0.42, 0.72, 34], [LX + 0.9, 1.0, 1.7, LX, 0.42, 0.72, 32], seg(t, 1.6, d)); DOF[1] = 0.9; thermo.position.set(LX - 1.5, 0, 2.6); },
  clack(t, d) { sunAt(LX, 0, 0); wheelArm.visible = true; const x = lerp(LX + 2.6, LX - 2.6, t / d), j = Math.abs(x - LX) < 0.05 ? 1 : 0;
    wheelArm.position.set(x, RAIL_TOP + 0.46 - 0.012 * (Math.abs(x - LX) < 0.08 ? 1 : 0), RAIL_Z - 0.02); bigWheel.rotation.z = (x - LX) / 0.46;
    cam(LX + 0.1, 0.8, RAIL_Z + 2.7, LX, 0.55, RAIL_Z, 40, 0.3); if (Math.abs(x - LX) < 0.12) shake(0.006); DOF[1] = 0.8; },
  leo(t, d) { sunAt(0, 0, 2); duo({ face: 'happy', hop: Math.abs(Math.sin(t * 9)) * 0.06, armR: [-2.7, 0, -0.2], armL: [-2.5, 0, -0.2] }, { face: 'happy', armR: [-1.6, 0, -1.2] }); cam(0.1, 1.75, -1.0, -0.15, 1.7, 2.75, 44); DOF[1] = 1.6; },
  welded(t, d, l, e) { sunAt(LX, 0, 9); const wk = t < e(0) - 1.6;
    put(welder, LX + 0.45, 9 + 0.2, -Math.PI / 2, 0.28); pose(welder, { crouch: 0.8, blob: false, armR: [-1.4 + 0.08 * Math.sin(t * 20), 0, 0.3], armL: [-1.1, 0, 0.6] });
    if (wk) { weldGlow.visible = true; weldGlow.position.set(LX - 0.05, RAIL_TOP + 0.05, 9 + RAIL_Z + 0.08); weldGlow.scale.setScalar(0.8 + 0.6 * Math.abs(Math.sin(t * 37))); compMat.uniforms.flash.value = 0.05 * Math.abs(Math.sin(t * 23));
      sparks.forEach((s, i) => { const k = (t * 2.5 + i / sparks.length) % 1, a = i * 2.4; s.visible = true; s.position.set(LX + Math.cos(a) * k * 0.6, RAIL_TOP + 0.05 + Math.abs(Math.sin(a)) * k * 0.5 - k * k * 0.4, 9 + RAIL_Z + 0.1 + Math.sin(a * 1.3) * 0.2 * k); s.material.opacity = 1 - k; s.scale.setScalar(0.12); }); }
    clips.forEach((c, i) => { const t0 = e(0) - 1.3 + Math.floor(i / 2 % 3) * 0.32, k = smooth(seg(t, t0 - 0.2, t0)); c.visible = t > t0 - 0.2; c.position.set(c.userData.x, RAIL_TOP - 0.1 + (1 - k) * 0.35, 9 + c.userData.s * (RAIL_Z + 0.1)); });
    if (t < e(0) - 1.6) cam(LX + 1.3, 1.25, 9 + 3.6, LX + 0.15, 0.7, 9 + 0.4, 40); else camL([LX + 4.6, 1.3, 9 + 2.4, LX + 3.9, 0.35, 9.3, 40], [LX + 4.5, 1.2, 9 + 2.2, LX + 3.9, 0.35, 9.3, 40], seg(t, e(0) - 1.6, d)); DOF[1] = 1.2; },
  breathe(t, d) { sunAt(0, 0, 2); duo({ face: 'smile', headYaw: 0 }, { face: 'wise', armR: [-2.4, 0, -0.4], armL: [0.6, 0, -1.8] }); camL([0.2, 1.8, -1.2, -0.2, 1.75, 2.8, 45], [0.05, 1.85, -0.7, -0.3, 1.8, 2.85, 42], t / d); DOF[1] = 1.6; },
  arrive(t, d) { sunAt(0, 0, 2); const k = smooth(seg(t, 0, 3.6)), x = lerp(-70, -12, 1 - (1 - k) * (1 - k)); trainAt(x);
    put(driver, x - 3.3, 0.0, -Math.PI / 2, 1.05); pose(driver, { face: 'grit', blob: false, armR: [-2.6, 0, -0.3] });
    duo({ face: 'happy', armR: [-2.7 + 0.3 * Math.sin(t * 10), 0, -0.3], hop: Math.abs(Math.sin(t * 8)) * 0.04 }, { face: 'happy' }); leo.userData.ry = -Math.PI / 2 + 0.6; gramps.userData.ry = -Math.PI / 2 + 0.6;
    camL([3.6, 2.0, 5.2, -3.5, 1.5, 1.2, 50], [4.4, 2.3, 5.8, -4.5, 1.5, 1.0, 52], t / d); DOF[1] = 8; DOF[2] = 0.5; },
};

// ---------- frame loop ----------
window.renderFrame = (T) => {
  T = clamp(T, 0, TL.duration - 1e-3); NOW = T;
  let i = TL.beats.findIndex(b => T < b.end); if (i < 0) i = TL.beats.length - 1;
  const b = BEAT = TL.beats[i], t = T - b.start, d = b.end - b.start, ln = (k) => b.lines[Math.min(k, b.lines.length - 1)];
  reset(); SHOT[b.id](t, d, (k) => ln(k).t0 - b.start, (k) => ln(k).t1 - b.start);
  billboard(); scene.updateMatrixWorld(); camera.updateMatrixWorld(); postRender(DOF);
  $('fade').style.opacity = clamp(Math.max(1 - T / 0.4, seg(T, TL.duration - 0.8, TL.duration - 0.05)));
  $('flash').style.opacity = 0;
};
window.DURATION = TL.duration;
window.renderFrame(0);
window.READY = true;
