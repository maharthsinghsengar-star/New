// THE GREATEST PRISON ESCAPES — 2.5D stickman story: flat outlined characters (big white heads, noodle limbs)
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
  if (o.hair === 'flat') Pt(new THREE.CircleGeometry(hr * 1.06, 30, Math.PI * 0.12, Math.PI * 0.86), o.hairCol ?? INK, -0.04 * hr, 0.02 * hr, 0.008, head, 0);
  if (o.hair === 'sides') { Pt(ellG(0.24 * hr, 0.34 * hr), 0xd8d8d8, -0.86 * hr, -0.05 * hr, 0.008, head, 0.012); }
  Pt(ellG(hr, hr), 0xf4f2ec, 0, 0, 0.02, head, 0.028);
  Pt(ellG(hr * 0.14, hr * 0.17), 0xf4f2ec, -hr * 0.92, -hr * 0.05, 0.022, head, 0.018);
  if (o.hair === 'spiky' || o.hair === 'flat') { const m = Pt(new THREE.CircleGeometry(hr * 1.0, 30, Math.PI * 0.32, Math.PI * 0.62), o.hairCol ?? INK, 0, 0, 0.025, head, 0); }
  if (o.moustache) Pt(poly([[-0.24, 0], [0.24, 0], [0.18, 0.1], [0, 0.06], [-0.18, 0.1]].map(([a, b]) => [a * hr, b * hr])), o.moustache, 0.21 * hr, -0.27 * hr, 0.05, head, 0.012);
  if (o.glasses) [-0.02, 0.44].forEach(x => { Pt(new THREE.RingGeometry(0.15 * hr, 0.19 * hr, 20), INK, x * hr, 0.08 * hr, 0.05, head, 0); }), Pt(new THREE.PlaneGeometry(0.14 * hr, 0.035 * hr), INK, 0.21 * hr, 0.1 * hr, 0.05, head, 0);
  if (o.cap) { Pt(rrect(hr * 2.0, hr * 0.62, hr * 0.18), o.cap, -0.02 * hr, hr * 0.86, 0.06, head, 0.024); Pt(rrect(hr * 2.2, hr * 0.16, hr * 0.06), INK, 0.12 * hr, hr * 0.56, 0.062, head, 0.012); if (o.badge) Pt(ellG(hr * 0.13, hr * 0.13), o.badge, 0.25 * hr, hr * 0.88, 0.064, head, 0.012); }
  if (o.helmet) { Pt(rrect(hr * 1.5, hr * 1.4, hr * 0.2), o.helmet, 0.25 * hr, 0.02 * hr, 0.07, head, 0.024); Pt(rrect(hr * 0.9, hr * 0.32, hr * 0.06), 0x2a3a48, 0.42 * hr, 0.1 * hr, 0.072, head, 0.012); }
  (o.faces ?? ['smile']).forEach(k => u.faces[k] = faceOf(k, hr, head)); u.cur = Object.values(u.faces)[0];
  u.back = Pt(ellG(hr * 0.99, hr * 0.99), (o.hair === 'spiky' || o.hair === 'flat') ? (o.hairCol ?? INK) : 0xf4f2ec, 0, 0, 0.1, head, 0); u.back.visible = false;
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
// ---------- cast ----------
const BLUE = { top: 0x7fb4e8, pants: 0x2a4a7a, faces: FACES };
const morris = toon({ h: 1.74, ...BLUE, hair: 'spiky' });
const john = toon({ h: 1.8, ...BLUE, top: 0x8ac0ee, hair: 'flat' });
const clar = toon({ h: 1.7, ...BLUE, top: 0x74a8e0, hair: 'flat', hairCol: 0x6a3a1a, moustache: 0x6a3a1a });
const guard = toon({ h: 1.82, top: 0x24345e, tie: 0x141218, pants: 0x1c2848, hair: 'flat', cap: 0x1c2848, badge: 0xf2c230, faces: FACES });
const chapo = toon({ h: 1.6, top: 0xd8c08a, pants: 0x8a7650, hair: 'flat', moustache: INK, faces: FACES });
const payet = toon({ h: 1.76, top: 0xff7a1a, pants: 0xe8661a, hair: 'sides', glasses: true, faces: FACES });
const pilot = toon({ h: 1.72, top: 0x3a3a44, pants: 0x2a2a30, helmet: 0xf2f2f2, faces: ['grit', 'smile'] });
function spoonProp(f) { const g = new THREE.Group(); f.userData.hand.add(g); Pt(new THREE.PlaneGeometry(0.03, 0.26), 0xd8dde4, 0, 0.12, 0.01, g, 0.012); Pt(ellG(0.05, 0.07), 0xeef2f6, 0, 0.27, 0.012, g, 0.014); g.visible = false; return g; }
const spoonM = spoonProp(morris), spoonJ = spoonProp(john);
const fakeHead = (() => { const g = new THREE.Group(), hr = 0.3; Pt(new THREE.CircleGeometry(hr * 1.06, 30, Math.PI * 0.12, Math.PI * 0.86), INK, -0.04 * hr, 0.02 * hr, 0.008, g, 0); Pt(ellG(hr, hr), 0xf2e6d4, 0, 0, 0.02, g, 0.028); Pt(new THREE.CircleGeometry(hr * 1.0, 30, Math.PI * 0.32, Math.PI * 0.62), INK, 0, 0, 0.025, g, 0);
  [-0.02, 0.44].forEach(x => Pt(new THREE.PlaneGeometry(0.18 * hr, 0.04 * hr), INK, x * hr, 0.06 * hr, 0.04, g, 0)); Pt(new THREE.PlaneGeometry(0.16 * hr, 0.03 * hr), INK, 0.21 * hr, -0.4 * hr, 0.04, g, 0); g.visible = false; scene.add(g); return g; })();
const billboardObj = (o) => { o.rotation.set(0, Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z), o.userData.roll ?? 0); };

// ---------- sky / water ----------
const skyT = (stops) => canvasTex(8, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const SKIES = { day: skyT([[0, '#1f7ae8'], [0.5, '#5fb2ff'], [0.8, '#b8e2ff'], [1, '#e8f6ff']]), dusk: skyT([[0, '#3a2a8a'], [0.45, '#c84a8a'], [0.7, '#ff8a4a'], [1, '#ffd27a']]),
  night: skyT([[0, '#0a1440'], [0.5, '#1a3a8a'], [0.8, '#3a6ac0'], [1, '#6a8ad0']]) };
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), B(0xffffff, { map: SKIES.day, side: THREE.BackSide, fog: false })); scene.add(skyDome);
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => { const r = RNG(i)(), a = RNG(i + 99)() * Math.PI * 2, e = 0.15 + RNG(i + 7)() * 1.2; return [Math.cos(a) * Math.cos(e) * 420, Math.sin(e) * 420, Math.sin(a) * Math.cos(e) * 420][i % 3]; }), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })); scene.add(stars);
const moon = glow(0xfff4d0, 40, 0, 0, 0, 1); scene.add(moon); const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 32), B(0xfff6dc, { fog: false })); scene.add(moonDisc);
scene.fog = new THREE.Fog(0xcfe6f8, 90, 420);
const lamp = new THREE.PointLight(0xffd8a0, 0, 14, 1.6); scene.add(lamp);

// ---------- ALCATRAZ CELL BLOCK (origin): cells along x, open to a corridor at +z ----------
const block = new THREE.Group(); scene.add(block);
const texConc = canvasTex(256, 256, speckle('#cfc8bc', ['#bcb4a8', '#ded6ca', '#b0a89c'], 2400), 10, 10);
const texMint = canvasTex(256, 256, speckle('#8fdcc0', ['#80d0b2', '#a0e6ca', '#74c4a6'], 900), 2, 2);
const floorB = mesh(new THREE.PlaneGeometry(60, 40), S(0xffffff, { map: texConc }), 0, 0, 2); floorB.rotation.x = -Math.PI / 2; floorB.castShadow = false; block.add(floorB);
const matBar = S(0x3a4a5a, { roughness: 0.35, metalness: 0.6 }), mint = S(0xffffff, { map: texMint }), cream = S(0xfff2d8);
const CELLS = [-4.8, -3.2, -1.6, 0, 1.6, 3.2, 4.8];
const ventGrille = []; const holes = [];
CELLS.forEach((cx, i) => {
  block.add(box(1.6, 1.3, 0.12, mint, cx, 0.65, -2.76), box(1.6, 1.1, 0.12, cream, cx, 1.85, -2.76));
  block.add(box(0.1, 2.4, 2.8, mint, cx - 0.8, 1.2, -1.4));
  for (let k = -6; k <= 6; k++) block.add(cyl(0.017, 0.017, 2.4, matBar, cx + k * 0.12, 1.2, 0.02, 6));
  [0.12, 1.25, 2.36].forEach(y => block.add(box(1.6, 0.05, 0.05, matBar, cx, y, 0.02)));
  const bed = G(box(0.62, 0.08, 1.9, S(0x5a6a7a, { metalness: 0.4 }), 0, 0.42, 0), box(0.58, 0.12, 1.86, S(0xf4ecd8), 0, 0.52, 0), box(0.4, 0.1, 0.32, S(0xffffff), 0, 0.62, -0.72)); bed.position.set(cx - 0.42, 0, -1.55); block.add(bed);
  block.add(cyl(0.16, 0.12, 0.32, S(0xf0f4f6, { roughness: 0.2 }), cx + 0.5, 0.16, -2.45), box(0.36, 0.05, 0.26, S(0xf0f4f6, { roughness: 0.2 }), cx + 0.5, 0.8, -2.55), box(0.5, 0.04, 0.22, S(0x8a5a32), cx + 0.3, 1.45, -2.6));
  const vg = G(box(0.3, 0.38, 0.02, S(0x9aa4ac, { metalness: 0.5 }), 0, 0, 0)); for (let k = 0; k < 6; k++) vg.add(box(0.26, 0.02, 0.03, S(0x4a5258), 0, -0.15 + k * 0.06, 0.012)); vg.position.set(cx + 0.05, 0.32, -2.69); block.add(vg); ventGrille.push(vg);
  const hole = mesh(new THREE.PlaneGeometry(0.28, 0.36), B(0x0a0a10), cx + 0.05, 0.32, -2.695, false); hole.visible = false; block.add(hole); holes.push(hole);
});
block.add(box(0.1, 2.4, 2.8, mint, 5.6, 1.2, -1.4), box(14, 0.2, 3, cream, 0, 2.5, -1.4));
block.add(box(30, 6, 0.3, S(0xe8dcc4), 0, 3, 4.6), box(30, 0.3, 8, S(0xd8ccb4), 0, 5.5, 1));
for (let x = -9; x <= 9; x += 3) block.add(box(1.2, 1.6, 0.05, S(0x9ac4f0, { emissive: 0x3a5a9a, emissiveIntensity: 0.6 }), x, 3.8, 4.44));
const bedDummy = { lump: mesh(new THREE.CapsuleGeometry(0.2, 1.1, 6, 12).rotateX(Math.PI / 2), S(0x6a8aa8), 0, 0.68, -1.45) }; block.add(bedDummy.lump); bedDummy.lump.scale.set(1.2, 0.7, 1);
const wanted = textPlane(1.5, 2.1, (c, w, h) => { c.fillStyle = '#f6e8c4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2a1a'; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#c02a1a'; c.textAlign = 'center'; c.font = `800 ${w * 0.17}px Poppins`; c.fillText('WANTED', w / 2, h * 0.13);
  [[0.25, 0.33], [0.75, 0.33], [0.5, 0.58]].forEach(([x, y], i) => { c.fillStyle = '#f4f2ec'; c.strokeStyle = '#141218'; c.lineWidth = 10; c.beginPath(); c.arc(w * x, h * y, w * 0.13, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#141218'; c.beginPath(); c.arc(w * x, h * y, w * 0.135, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillRect(w * x - w * 0.05, h * y - 6, 10, 18); c.fillRect(w * x + w * 0.03, h * y - 6, 10, 18); });
  c.fillStyle = '#3a2a1a'; c.font = `800 ${w * 0.075}px Poppins`; c.fillText('MORRIS · J. ANGLIN · C. ANGLIN', w / 2, h * 0.8); c.fillStyle = '#c02a1a'; c.font = `800 ${w * 0.12}px Poppins`; c.fillText('NEVER FOUND', w / 2, h * 0.92); });
wanted.position.set(-1.2, 1.8, 4.43); wanted.rotation.y = Math.PI; block.add(wanted);

// ---------- THE ISLAND (x = 300): rock, cell house, lighthouse, the bay, the city lights ----------
const IX = 300, island = new THREE.Group(); scene.add(island);
const texWater = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#1a6ac8'; x.fillRect(0, 0, w, h); const r = RNG(3); for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(160,220,255,${0.25 + r() * 0.4})`; x.lineWidth = 2 + r() * 2; const y = r() * h, xx = r() * w; x.beginPath(); x.moveTo(xx, y); x.quadraticCurveTo(xx + 12, y - 5, xx + 26, y); x.stroke(); } }, 32, 44);
const water = mesh(new THREE.PlaneGeometry(360, 500), S(0xffffff, { map: texWater, roughness: 0.25, metalness: 0.2 }), IX, 0, 0); water.rotation.x = -Math.PI / 2; water.castShadow = false; island.add(water);
const rockM = S(0x9a7a5a, { flatShading: true }), rock2 = S(0x7a6a5a, { flatShading: true });
[[0, 0, 0, 16, 0.55], [-12, 0, 6, 9, 0.6], [10, 0, 8, 10, 0.55], [-6, 0, -9, 10, 0.55], [8, 0, -8, 9, 0.6]].forEach(([x, y, z, r, sy], i) => { const m = mesh(new THREE.DodecahedronGeometry(r, 1), i % 2 ? rock2 : rockM, IX + x, -r * 0.2, z); m.scale.y = sy; island.add(m); });
const ch = new THREE.Group(); ch.position.set(IX, 6.6, -1); island.add(ch);
ch.add(box(18, 5, 7, S(0xf2ead8), 0, 2.5, 0), box(18.4, 0.5, 7.4, S(0xb8a890), 0, 5.2, 0));
const winMat = S(0x2a3a5a, { emissive: 0xffc860, emissiveIntensity: 0 });
for (let r = 0; r < 2; r++) for (let k = -7; k <= 7; k++) ch.add(box(0.6, 1.1, 0.05, winMat, k * 1.15, 1.4 + r * 2.0, 3.53));
const roofVent = G(box(1.2, 0.5, 1.2, S(0x8a8a92), 0, 0.25, 0), box(1.3, 0.08, 1.3, S(0x5a5a62), 0, 0.52, 0)); roofVent.position.set(-3, 5.45, 1.2); ch.add(roofVent);
const roofHatch = box(1.2, 0.06, 1.2, S(0x6a6a72), 0, 0, 0); roofHatch.position.set(-3, 5.98, 1.2); ch.add(roofHatch);
const lh = G(cyl(0.8, 1.1, 12, S(0xf6f2ea), 0, 6, 0, 18), cyl(1.2, 1.2, 0.4, S(0x2a2a30), 0, 12.2, 0, 18), cyl(0.7, 0.7, 1.4, S(0xfff2c0, { emissive: 0xffe08a, emissiveIntensity: 1 }), 0, 13.1, 0, 14), mesh(new THREE.ConeGeometry(1.0, 1.0, 14), S(0xc02a2a), 0, 14.3, 0)); lh.position.set(IX + 11, 6.6, -2); island.add(lh);
const beamL = mesh(new THREE.ConeGeometry(4, 40, 20, 1, true), B(0xfff0b0, { transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), 0, 0, 0, false); beamL.rotation.z = Math.PI / 2; beamL.position.x = 20; const beamG = G(beamL); beamG.position.set(IX + 11, 19.7, -2); island.add(beamG);
const city = new THREE.Group(); island.add(city);
for (let i = 0; i < 40; i++) { const r = RNG(i * 3), w = 4 + r() * 6, h = 6 + r() * 30; const bld = box(w, h, 5, S(0x2a3048, { emissive: 0xffc070, emissiveIntensity: 0 }), IX - 160 + i * 8.2, h / 2, -170 - r() * 30); bld.castShadow = false; city.add(bld); }
const raft = G(mesh(new THREE.TorusGeometry(0.85, 0.28, 10, 24).rotateX(Math.PI / 2).scale(1.5, 1, 1), S(0xf2c230, { roughness: 0.6 }), 0, 0.22, 0), mesh(new THREE.CircleGeometry(1.2, 20).rotateX(-Math.PI / 2).scale(1.3, 1, 0.8), S(0xd8a820), 0, 0.12, 0)); scene.add(raft);
const paddles = [0, 1].map(() => { const p = G(cyl(0.03, 0.03, 1.4, S(0x8a5a32), 0, 0, 0, 6), box(0.18, 0.32, 0.03, S(0x8a5a32), 0, -0.7, 0)); scene.add(p); return p; });
const searchG = new THREE.Group(); const searchB = mesh(new THREE.ConeGeometry(3.5, 30, 20, 1, true), B(0xffffe0, { transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), 0, -15, 0, false); searchG.add(searchB); scene.add(searchG);

// ---------- EL CHAPO (x = 600): cell with a tiled shower, the hole, and the tunnel underneath ----------
const CX = 600, chapoSet = new THREE.Group(); scene.add(chapoSet);
const texTile = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e8f6ff'; x.fillRect(0, 0, w, h); x.fillStyle = '#5ab8e8'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); x.strokeStyle = '#a8c8d8'; x.lineWidth = 3; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, h); x.moveTo(0, i * 32); x.lineTo(w, i * 32); x.stroke(); } }, 2, 2);
const texPeach = canvasTex(256, 256, speckle('#f2c49a', ['#e8b48a', '#f8d0aa'], 900), 2, 2);
const cfloor = mesh(new THREE.PlaneGeometry(12, 12), S(0xffffff, { map: texConc }), CX, 0, 0); cfloor.rotation.x = -Math.PI / 2; cfloor.castShadow = false; chapoSet.add(cfloor);
chapoSet.add(box(4, 2.6, 0.15, S(0xffffff, { map: texPeach }), CX, 1.3, -2), box(0.15, 2.6, 4, S(0xffffff, { map: texPeach }), CX - 2, 1.3, 0), box(0.15, 2.6, 4, S(0xffffff, { map: texPeach }), CX + 2, 1.3, 0));
chapoSet.add(box(1.3, 2.4, 0.06, S(0xffffff, { map: texTile }), CX + 1.3, 1.2, -1.9), box(0.06, 2.4, 1.3, S(0xffffff, { map: texTile }), CX + 1.9, 1.2, -1.3), box(1.3, 1.0, 0.1, S(0xffffff, { map: texTile }), CX + 1.3, 0.5, -0.6));
chapoSet.add(cyl(0.02, 0.02, 0.5, S(0xc0c8d0, { metalness: 0.8 }), CX + 1.3, 2.2, -1.75, 8), cyl(0.12, 0.06, 0.08, S(0xc0c8d0, { metalness: 0.8 }), CX + 1.3, 1.95, -1.65, 14));
const bedC = G(box(0.9, 0.5, 2.0, S(0x8a7a6a), 0, 0.25, 0), box(0.85, 0.1, 1.95, S(0xe8e0d0), 0, 0.55, 0)); bedC.position.set(CX - 1.4, 0, -0.5); chapoSet.add(bedC);
for (let k = -16; k <= 16; k++) chapoSet.add(cyl(0.02, 0.02, 2.6, matBar, CX + k * 0.125, 1.3, 2, 6));
const showerHole = mesh(new THREE.PlaneGeometry(0.5, 0.5), B(0x060608), CX + 1.3, 0.012, -1.25, false); showerHole.rotation.x = -Math.PI / 2; chapoSet.add(showerHole);
const ladder = G(); [-0.15, 0.15].forEach(x => ladder.add(box(0.03, 1.2, 0.03, S(0x9a9aa2), x, -0.4, 0))); for (let k = 0; k < 4; k++) ladder.add(box(0.3, 0.025, 0.025, S(0x9a9aa2), 0, -0.9 + k * 0.28, 0)); ladder.position.set(CX + 1.3, 0, -1.4); chapoSet.add(ladder);
const drops = Array.from({ length: 16 }, (_, i) => { const m = mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), B(0xbfe8ff), 0, 0, 0, false); chapoSet.add(m); return m; });
// the tunnel (along -z, starting at z = 0 under x = 900)
const TX = 900, tunnel = new THREE.Group(); scene.add(tunnel);
const texDirt = canvasTex(256, 256, speckle('#a8703e', ['#946032', '#bc804a', '#7a4a26', '#c89058'], 3000), 2, 40);
const tun = mesh(new THREE.BoxGeometry(0.9, 1.75, 120), S(0xffffff, { map: texDirt, side: THREE.BackSide }), TX, 0.875, -58); tun.castShadow = false; tunnel.add(tun);
tunnel.add(box(0.025, 0.02, 120, S(0x9aa0a8, { metalness: 0.7 }), TX - 0.2, 0.03, -58), box(0.025, 0.02, 120, S(0x9aa0a8, { metalness: 0.7 }), TX + 0.2, 0.03, -58));
for (let z = 1; z > -118; z -= 0.6) tunnel.add(box(0.6, 0.03, 0.08, S(0x6a4a30), TX, 0.012, z));
tunnel.add(cyl(0.07, 0.07, 120, S(0xff8a2a), TX + 0.32, 1.55, -58, 10).rotateX(Math.PI / 2));
const bulbs = []; for (let z = -1; z > -118; z -= 3) { const b = sph(0.05, S(0xfff4d0, { emissive: 0xffe8a0, emissiveIntensity: 2 }), TX - 0.25, 1.62, z); b.castShadow = false; tunnel.add(b, glow(0xffd890, 0.7, TX - 0.25, 1.62, z, 0.7)); bulbs.push(b); }
const tunLight = new THREE.PointLight(0xffd8a0, 0, 6, 1.2); scene.add(tunLight);
const bike = new THREE.Group(); scene.add(bike);
[-0.42, 0.42].forEach(z => { const w = mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 20), S(0x141218), 0, 0.2, z); w.rotation.y = Math.PI / 2; bike.add(w); });
bike.add(box(0.12, 0.12, 0.8, S(0xe0302a, { roughness: 0.4, metalness: 0.2 }), 0, 0.34, 0), box(0.16, 0.08, 0.32, S(0x141218), 0, 0.45, 0.1), cyl(0.015, 0.015, 0.5, S(0x8a8a92), 0, 0.56, -0.36, 6).rotateZ(Math.PI / 2), sph(0.06, S(0xfff4d0, { emissive: 0xfff0c0, emissiveIntensity: 2 }), 0, 0.44, -0.44));

// ---------- THE YARD (x = 1200): high walls, razor wire, a watchtower, and a helicopter ----------
const YX = 1200, yard = new THREE.Group(); scene.add(yard);
const texWall = canvasTex(256, 256, speckle('#d8d0c4', ['#c8c0b4', '#e6ded2', '#bcb4a8'], 2000, (x, w, h) => { x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 3; for (let y = 0; y < h; y += 64) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } }), 8, 2);
const yfloor = mesh(new THREE.PlaneGeometry(200, 200), S(0xffffff, { map: canvasTex(256, 256, speckle('#b8a890', ['#a89880', '#c8b8a0'], 2400), 40, 40) }), YX, 0, 0); yfloor.rotation.x = -Math.PI / 2; yfloor.castShadow = false; yard.add(yfloor);
[[0, -9, 30, 0], [-14, 0, 18, Math.PI / 2], [14, 0, 18, Math.PI / 2]].forEach(([x, z, len, r]) => { const w = box(len, 6, 0.6, S(0xffffff, { map: texWall }), YX + x, 3, z); w.rotation.y = r; yard.add(w); for (let k = -len / 2; k < len / 2; k += 0.9) { const c = mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 16), S(0xb8c0c8, { metalness: 0.8 }), 0, 0, 0); const along = new THREE.Vector3(Math.cos(r), 0, -Math.sin(r)); c.position.set(YX + x + along.x * k, 6.3, z + along.z * k); c.rotation.y = r; yard.add(c); } });
const tower = G(box(0.4, 9, 0.4, S(0x8a8a92), -1.2, 4.5, -1.2), box(0.4, 9, 0.4, S(0x8a8a92), 1.2, 4.5, -1.2), box(0.4, 9, 0.4, S(0x8a8a92), -1.2, 4.5, 1.2), box(0.4, 9, 0.4, S(0x8a8a92), 1.2, 4.5, 1.2), box(3.4, 2.2, 3.4, S(0x6a7a8a), 0, 10, 0), mesh(new THREE.ConeGeometry(2.6, 1.2, 4).rotateY(Math.PI / 4), S(0xc02a2a), 0, 11.7, 0));
tower.position.set(YX - 11, 0, -7); yard.add(tower);
const heli = new THREE.Group(); scene.add(heli);
heli.add(mesh(new THREE.SphereGeometry(1.3, 24, 16).scale(1.5, 1, 1), S(0xe8302a, { roughness: 0.35, metalness: 0.2 }), 0, 0, 0), mesh(new THREE.SphereGeometry(0.95, 20, 14).scale(1.2, 0.8, 1).translate(-0.85, 0.15, 0), S(0x8ac8ff, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 })));
heli.add(cyl(0.22, 0.12, 3.6, S(0xe8302a), 2.8, 0.35, 0, 12).rotateZ(Math.PI / 2), box(0.6, 0.9, 0.08, S(0xffffff), 4.5, 0.75, 0), cyl(0.1, 0.1, 0.5, S(0x2a2a30), 0, 1.45, 0, 10));
[-0.75, 0.75].forEach(z => heli.add(box(3.2, 0.08, 0.08, S(0x2a2a30), -0.2, -1.45, z), box(0.08, 0.5, 0.08, S(0x2a2a30), -1.0, -1.2, z), box(0.08, 0.5, 0.08, S(0x2a2a30), 0.6, -1.2, z)));
heli.add(mesh(new THREE.PlaneGeometry(1.2, 0.5), S(0xffffff, { map: canvasTex(240, 100, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8302a'; c.font = '800 60px Poppins'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F-HELI', w / 2, h / 2 + 4); }) }), 0.6, -0.1, 1.31));
const rotor = G(box(7.5, 0.04, 0.3, S(0x2a2a30), 0, 0, 0), box(0.3, 0.04, 7.5, S(0x2a2a30), 0, 0, 0)); rotor.position.y = 1.72; heli.add(rotor);
const rotorBlur = mesh(new THREE.CircleGeometry(3.8, 40).rotateX(-Math.PI / 2), B(0x2a2a30, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), 0, 1.74, 0, false); heli.add(rotorBlur);
const tailRotor = G(box(0.05, 1.0, 0.12, S(0x2a2a30), 0, 0, 0)); tailRotor.position.set(4.6, 0.75, 0.12); heli.add(tailRotor);
const dust = Array.from({ length: 16 }, () => { const s = glow(0xe8d8b8, 2, 0, 0, 0, 0.5); s.material.blending = THREE.NormalBlending; s.visible = false; scene.add(s); return s; });
const sparkle = glow(0xffffff, 0.5, 0, 0, 0, 1); scene.add(sparkle);
const bigSpoon = G(); { const s = G(mesh(new THREE.BoxGeometry(0.035, 0.012, 0.26), S(0xdfe4ea, { metalness: 0.9, roughness: 0.2 }), 0, 0, 0.15), mesh(new THREE.SphereGeometry(0.06, 20, 12).scale(1, 0.25, 1.35), S(0xeef2f6, { metalness: 0.9, roughness: 0.15 }), 0, 0, -0.03)); bigSpoon.add(s); bigSpoon.position.set(0.25, 0.012, -2.3); bigSpoon.rotation.y = 0.6; block.add(bigSpoon); }
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
const MOODS = {
  day: { sky: 'day', fog: 0xcfe6f8, hemi: [0xeaf4ff, 0x9a8a6a, 1.8], sun: [0xfff0d8, 3.2], tint: [1.03, 1.0, 0.96], night: false },
  dusk: { sky: 'dusk', fog: 0xf0a888, hemi: [0xffd8e8, 0x8a5a6a, 1.6], sun: [0xffb070, 3.0], tint: [1.08, 0.98, 0.95], night: false },
  night: { sky: 'night', fog: 0x2a4a8a, hemi: [0x8ab0ff, 0x2a3050, 1.5], sun: [0xa8c4ff, 1.8], tint: [0.95, 1.0, 1.12], night: true },
  cellN: { sky: 'night', fog: 0x2a4a8a, hemi: [0x9ab8ff, 0x4a4a60, 1.35], sun: [0xa8c4ff, 0.6], tint: [0.98, 1.0, 1.1], night: true },
  cellD: { sky: 'day', fog: 0xcfe6f8, hemi: [0xfff4e4, 0x8a7a6a, 1.9], sun: [0xfff0d8, 1.2], tint: [1.04, 1.0, 0.95], night: false },
  tunnel: { sky: 'night', fog: 0x3a2a1a, hemi: [0xffd8a0, 0x4a3020, 0.7], sun: [0xffffff, 0], tint: [1.08, 0.98, 0.9], night: true },
};
function mood(k) {
  const m = MOODS[k]; skyDome.material.map = SKIES[m.sky]; scene.fog.color.set(m.fog); scene.fog.near = k === 'tunnel' ? 6 : 90; scene.fog.far = k === 'tunnel' ? 40 : 420;
  hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2]; sun.color.set(m.sun[0]); sun.intensity = m.sun[1];
  compMat.uniforms.tint.value.set(...m.tint); stars.visible = m.night; moon.visible = moonDisc.visible = m.night;
  winMat.emissiveIntensity = m.night ? 1.2 : k === 'dusk' ? 0.5 : 0; city.children.forEach(b => b.material.emissiveIntensity = m.night ? 0.55 : k === 'dusk' ? 0.25 : 0); beamG.visible = m.night || k === 'dusk';
}
function sunAt(x, y, z) { sun.position.set(x - 12, y + 22, z + 10); sun.target.position.set(x, y, z); }
function reset() {
  people.forEach(p => { p.visible = false; p.scale.setScalar(1); const u = p.userData; u.want = null; u.yaw = 0; u.talk = 0; });
  [spoonM, spoonJ].forEach(s => s.visible = false); fakeHead.visible = false; fakeHead.userData.roll = 0;
  raft.visible = false; paddles.forEach(p => p.visible = false); searchG.visible = false; bike.visible = false; heli.visible = false; dust.forEach(d => d.visible = false); sparkle.visible = false; drops.forEach(d => d.visible = false);
  ventGrille.forEach(v => { v.visible = true; v.position.y = 0.32; v.rotation.z = 0; }); holes.forEach(h => h.visible = false); bedDummy.lump.visible = false; roofHatch.rotation.x = 0; roofHatch.position.y = 5.98;
  lamp.intensity = 0; tunLight.intensity = 0; compMat.uniforms.flash.value = 0; compMat.uniforms.heat.value = 0; DOF = [3, 2.2, 1]; mood('day');
  const ph = NOW * 0.04; texWater.offset.set(ph, ph * 0.6);
}
function sky() { skyDome.position.copy(camera.position); stars.position.copy(camera.position); moon.position.set(camera.position.x - 90, camera.position.y + 120, camera.position.z - 300); moonDisc.position.copy(moon.position); moonDisc.lookAt(camera.position); }

// ---------- shots: one per narration beat. t = seconds into the beat, d = its length, l(k)/e(k) = start/end of line k ----------
const SHOT = {
  intro(t, d, l) {
    mood('cellN'); sunAt(0, 0, 0); lamp.position.set(0, 3.2, 2.2); lamp.intensity = 8;
    if (t < l(1) - 0.1) { put(guard, lerp(-4.5, 1.2, t / l(1)), 1.4, Math.PI / 2, 0); pose(guard, { walk: [t * 7.5, 1], face: 'grit' });
      for (let i = 0; i < 2; i++) { const p = KX(i); put(p.f, p.x, -1.0, 0, 0); pose(p.f, { face: 'worried' }); }
      const gx = guard.position.x; cam(gx + 1.5, 0.45, 3.9, gx + 0.1, 1.45, 0.6, 50); shake(0.04 * hit(t, 0.1, 0.5)); DOF[1] = 4; }
    else { put(morris, 0.1, -1.7, 0); spoonM.visible = true; pose(morris, { face: 'smile', armR: [-0.9 + 0.12 * Math.sin(t * 9), 0, -1.3], tilt: 0.06, lean: -0.03 }); spoonM.rotation.z = t * 6;
      camL([0.35, 1.55, -0.12, 0.1, 1.55, -1.7, 44], [0.3, 1.6, -0.3, 0.1, 1.6, -1.7, 42], seg(t, l(1), d)); DOF[1] = 1.0; }
  },
  rock(t, d) { mood('dusk'); sunAt(IX, 0, 0); const a = -0.6 + t * 0.045; cam(IX + Math.sin(a) * 58, 16 - t * 0.6, Math.cos(a) * 58, IX, 6, 0, 46); beamG.rotation.y = t * 0.8; DOF[1] = 60; DOF[2] = 0.3; },
  dig(t, d) { mood('cellN'); sunAt(0, 0, 0); lamp.position.set(0, 2.2, 1.6); lamp.intensity = 5; const two = t > d * 0.62, cx = two ? -1.6 : 0, f = two ? john : morris, sp = two ? spoonJ : spoonM;
    put(f, cx - 0.32, -2.25, Math.PI / 2 + 0.6, 0); pose(f, { crouch: 0.85, face: 'grit', armR: [-1.4 + 0.25 * Math.sin(t * 14), 0, -0.2], armL: [-1.1, 0, 0.4] }); sp.visible = true; sp.rotation.z = 1.7;
    const vi = CELLS.indexOf(cx); ventGrille[vi].visible = false; holes[vi].visible = true; holes[vi].scale.setScalar(two ? 1 : 0.55 + 0.45 * smooth(seg(t, 0, d * 0.6)));
    for (let i = 0; i < 6; i++) { const k = (t * 1.6 + i / 6) % 1, s = dust[i]; s.visible = true; s.material.opacity = 0.6 * (1 - k); s.scale.setScalar(0.08 + k * 0.12); s.position.set(cx + 0.05 + Math.sin(i * 2.1) * 0.15 * k, 0.32 - k * 0.3, -2.55 + k * 0.2); }
    camL([cx + 0.65, 1.75, -0.15, cx - 0.1, 0.55, -2.5, 52], [cx + 0.6, 1.6, -0.35, cx - 0.1, 0.5, -2.5, 50], (two ? seg(t, d * 0.62, d) : seg(t, 0, d * 0.62))); DOF[1] = 0.7; },
  heads(t, d, l, e) { mood('cellN'); sunAt(0, 0, 0); lamp.position.set(0, 2.2, 1.6); lamp.intensity = 5; const place = e(0) - 1.6;
    if (t < place) { put(morris, 0.3, -1.55, -Math.PI / 2, 0); pose(morris, { face: 'smile', armR: [-1.5, 0, -0.7], armL: [-1.5, 0, -0.7] }); fakeHead.visible = true; fakeHead.scale.setScalar(0.8); fakeHead.position.set(0.0, 0.98, -1.1); fakeHead.userData.roll = 0.15 * Math.sin(t * 3);
      camL([0.6, 1.45, -0.15, 0.1, 1.25, -1.4, 44], [0.5, 1.4, -0.3, 0.1, 1.25, -1.4, 42], t / place); DOF[1] = 1.0; }
    else { bedDummy.lump.visible = true; bedDummy.lump.position.set(-0.42, 0.66, -1.35); fakeHead.visible = true; fakeHead.scale.setScalar(0.85 * backOut(seg(t, place, place + 0.3))); fakeHead.position.set(-0.42, 0.85, -2.25);
      camL([0.5, 1.25, -0.6, -0.42, 0.75, -1.8, 42], [0.4, 1.1, -0.8, -0.42, 0.75, -1.9, 40], seg(t, place, d)); DOF[1] = 0.9; } },
  roof(t, d, l, e) { mood('night'); sunAt(IX, 6, 0); const sp = 2.5;
    if (t < sp) { roofHatch.rotation.x = -1.6 * smooth(seg(t, 0, 0.4)); roofHatch.position.y = 6.0 + 0.3 * smooth(seg(t, 0, 0.4));
      [morris, john, clar].forEach((f, i) => { const k = seg(t, 0.2 + i * 0.5, 1.0 + i * 0.5), ry = 0.6; put(f, IX - 3 + i * 0.9 + k * 1.5, 1.2 + 0.6 * k, ry, 6.6 + 5.5 - 1.8 * (1 - smooth(k * 2)) ); pose(f, { face: 'grit', walk: k > 0.4 && k < 1 ? [t * 9, 0.8] : undefined, crouch: 0.35, armR: [-1.2, 0, 0.3] }); });
      searchG.visible = true; searchG.position.set(IX + 11, 19.7, -2); searchG.rotation.set(0, 0, 0.6 + 0.35 * Math.sin(t * 1.5)); searchG.rotation.order = 'YXZ'; searchG.rotation.y = t * 0.6;
      camL([IX - 6.5, 13.6, 7.5, IX - 2, 12.2, 1.2, 46], [IX - 5.8, 13.2, 6.6, IX - 2, 12.3, 1.3, 46], t / sp); DOF[1] = 6; DOF[2] = 0.5; }
    else { const k = seg(t, sp, d), x = IX - 22 - k * 5, z = 26 + k * 6, bob = Math.sin(t * 2.4) * 0.06; raft.visible = true; raft.position.set(x, bob, z); raft.rotation.set(0.03 * Math.sin(t * 2), -0.6, 0.03 * Math.cos(t * 2.3));
      [morris, john, clar].forEach((f, i) => { const o = [[-0.6, 0.3], [0.5, -0.2], [0.05, 0.55]][i]; put(f, x + o[0], z + o[1], -Math.PI / 2, bob + 0.05); pose(f, { face: 'grit', crouch: 0.75, blob: false, armR: [-1.1 + 0.5 * Math.sin(t * 5 + i), 0, 0.2], armL: [-1.0 + 0.5 * Math.sin(t * 5 + i), 0, 0.2] }); });
      paddles.forEach((p, i) => { p.visible = true; p.position.set(x + (i ? 0.9 : -1.1), 0.4 + bob, z + (i ? -0.5 : 0.6)); p.rotation.set(0.5 * Math.sin(t * 5 + i * 2), 0, 0.6 * (i ? -1 : 1)); });
      cam(x + 6.5, 2.4, z + 5.5, x, 0.8, z, 44); beamG.rotation.y = t * 0.8; DOF[1] = 6; DOF[2] = 0.6; } },
  morning(t, d, l) { mood('cellD'); sunAt(0, 0, 0); lamp.position.set(0, 2.6, 2); lamp.intensity = 6; const roll = seg(t, l(1) + 0.15, l(1) + 0.6), bnc = hit(t, l(1) + 0.6, 0.3);
    bedDummy.lump.visible = true; bedDummy.lump.position.set(-0.42, 0.66, -1.35);
    fakeHead.visible = true; fakeHead.scale.setScalar(0.85); const hx = lerp(-0.42, 0.15, roll), hy = roll < 1 ? lerp(0.85, 0.22, roll * roll) + Math.sin(roll * Math.PI) * 0.18 : 0.22 + bnc * 0.12; fakeHead.position.set(hx, hy, lerp(-2.25, -1.9, roll)); fakeHead.userData.roll = -roll * 4.5 - (roll >= 1 ? 0.3 : 0);
    put(guard, 0.1, 0.55, Math.PI, 0); pose(guard, { face: t > l(1) + 0.3 ? 'shock' : 'grit', talk: talking('g'), armR: t < l(1) ? [-1.5 + 0.3 * Math.sin(t * 20), 0, -0.3] : [-2.4, 0, -0.2], armL: t > l(1) + 0.3 ? [-2.4, 0, -0.2] : undefined, hop: hit(t, l(1) + 0.4, 0.3) * 0.08 });
    if (t < l(1)) { cam(0.35, 1.6, -1.4, 0.1, 1.65, 0.55, 46); DOF[1] = 1.2; } else { cam(0.7, 1.05, -0.8, -0.1, 0.45, -2.0, 46); DOF[1] = 1.0; } shake(0.02 * bnc); },
  gone(t, d) { mood('cellD'); sunAt(0, 0, 0); lamp.position.set(-1, 2.6, 3); lamp.intensity = 6; camL([-1.2, 1.8, 1.4, -1.2, 1.8, 4.43, 46], [-1.2, 1.8, 2.6, -1.2, 1.78, 4.43, 46], t / d); DOF[1] = 3; },
  chapo(t, d, l, e) { mood('cellD'); sunAt(CX, 0, 0); lamp.position.set(CX, 2.4, 0.5); lamp.intensity = 6; const w = seg(t, 0.2, 2.2), drop = smooth(seg(t, 3.0, 3.9));
    if (drop < 1) { put(chapo, lerp(CX - 0.9, CX + 1.3, smooth(w)), lerp(0.4, -1.25, smooth(w)), w < 1 ? facing(CX - 0.9, 0.4, CX + 1.3, -1.25) : 0, -drop * 1.7); pose(chapo, { walk: w > 0 && w < 1 ? [t * 8, 1] : undefined, face: t > 2.4 ? 'smile' : 'neutral', crouch: drop * 0.6 }); }
    drops.forEach((m, i) => { const k = (t * 2.2 + i / drops.length) % 1; m.visible = t > 0.6; m.position.set(CX + 1.3 + Math.sin(i * 2.3) * 0.12, 1.9 - k * 1.85, -1.6 + Math.cos(i * 1.7) * 0.12 + k * 0.1); });
    camL([CX - 0.6, 1.9, 1.7, CX + 0.6, 1.0, -1.0, 50], [CX + 0.85, 2.3, -0.85, CX + 1.3, 0.0, -1.3, 46], seg(t, 3.4, d)); DOF[1] = 2.2; },
  tunnel(t, d, l, e) {
    if (t < l(1) - 0.05) { mood('tunnel'); sunAt(TX, 0, 0); const k = smooth(seg(t, 0.2, l(1) - 0.3)), z = lerp(-40, -2.2, k); bike.visible = true; bike.position.set(TX, 0.03, z); tunLight.position.set(TX, 1.4, z - 0.6); tunLight.intensity = 4;
      put(chapo, TX, z + 0.08, Math.PI, 0.3); pose(chapo, { face: 'grit', sit: 0.9, blob: false, armR: [-1.3, 0, 0.1], armL: [-1.3, 0, 0.1], lean: 0.15 });
      cam(TX + 0.12, 0.9, 0.5, TX, 0.85, -6, 46, 0.4); shake(0.006); DOF[1] = 8; DOF[2] = 0.5; }
    else { mood('cellD'); sunAt(CX, 0, 0); lamp.position.set(CX, 2.4, 2.5); lamp.intensity = 6; put(chapo, CX - 0.2, 1.2, 0, 0); pose(chapo, { face: 'worried', armR: [-0.6, 0, -1.6], armL: [-0.6, 0, -1.6] });
      put(guard, CX + 1.05, 2.35, Math.PI + 0.6, 0); pose(guard, { face: 'smile', armR: [-0.6, 0, -1.8], armL: [0.6, 0, -1.8] });
      camL([CX - 0.3, 1.5, 5.2, CX + 0.25, 1.35, 1.5, 44], [CX - 0.3, 1.5, 4.8, CX + 0.25, 1.4, 1.5, 42], seg(t, l(1), d)); DOF[1] = 2.2; } },
  heli(t, d, l) { mood('day'); sunAt(YX, 0, 0); heli.visible = true; const dn = smooth(seg(t, 0, 1.4)), grab = 1.7, up = smooth(seg(t, 2.1, d));
    const hx = YX + lerp(-2, 9, up * up), hy = lerp(18, 3.4, dn) + up * 14, hz = lerp(-12, -1, dn) - up * 6; heli.position.set(hx, hy, hz); heli.rotation.set(0, 0.25, -0.12 * up + 0.05 * Math.sin(t * 3)); rotor.rotation.y = t * 30; tailRotor.rotation.z = t * 40;
    if (t < grab) { put(payet, lerp(YX + 4, hx - 0.2, seg(t, 0.7, grab)), lerp(3, -1, seg(t, 0.7, grab)), -Math.PI / 2 - 0.4, 0); pose(payet, { walk: t > 0.7 ? [t * 11, 1.2] : undefined, face: 'happy', armR: t > 1.2 ? [-2.8, 0, 0] : undefined }); }
    else { put(payet, hx - 0.2, hz + 0.75, -Math.PI / 2, hy - 1.45 - 0.98); pose(payet, { face: 'happy', blob: false, armR: [-3.0, 0, 0], armL: [-2.2 + 0.4 * Math.sin(t * 12), 0, -0.6], lean: 0.05 * Math.sin(t * 4) }); }
    put(guard, YX - 6, 2.5, Math.PI / 2, 0); pose(guard, { face: t > 1.0 ? 'shock' : 'grit', armR: t > 1.0 ? [-2.5, 0, -0.3] : undefined, armL: t > 1.0 ? [-2.5, 0, -0.3] : undefined, hop: Math.abs(Math.sin(t * 7)) * 0.03 * (t > 1 ? 1 : 0) });
    if (hy < 9) dust.forEach((s, i) => { const k = (t * 1.3 + i / dust.length) % 1, a = i * 2.4; s.visible = true; s.material.opacity = 0.45 * (1 - k) * (1 - seg(hy, 4, 9)); s.scale.setScalar(1 + 2.5 * k); s.position.set(hx + Math.cos(a) * (1 + k * 6), 0.3 + k * 0.6, hz + Math.sin(a) * (1 + k * 6)); });
    cam(YX - 2.5, 1.5, 12, lerp(YX, hx, 0.7), lerp(4.5, hy - 0.4, 0.6), lerp(-2, hz, 0.5), 52); shake(0.01); DOF[1] = 14; DOF[2] = 0.4; },
  outro(t, d, l, e) {
    if (t < l(1)) {
      if (t < 0.8) { mood('cellN'); sunAt(0, 0, 0); lamp.position.set(0, 3, 2); lamp.intensity = 8; cam(-0.4, 0.4, 1.4, 0.8, 2.0, 0.0, 46); DOF[1] = 3; }
      else if (t < 1.55) { mood('dusk'); sunAt(YX, 0, 0); cam(YX - 6, 1.2, 4, YX - 11, 9, -7, 46); DOF[1] = 20; DOF[2] = 0.3; }
      else { mood('night'); sunAt(IX, 0, 0); cam(IX - 30, 1.2, 40, IX, 4, 0, 40); beamG.rotation.y = t * 0.8; DOF[1] = 60; DOF[2] = 0.3; }
    } else { mood('cellN'); sunAt(0, 0, 0); lamp.position.set(0.3, 1.4, -1.0); lamp.intensity = 4; ventGrille[3].visible = false; holes[3].visible = true;
      sparkle.visible = t > e(1) - 0.9; sparkle.position.set(0.2, 0.05, -2.24); sparkle.scale.setScalar(0.22 * Math.max(0, Math.sin((t - (e(1) - 0.9)) * 4)) + 0.02);
      camL([0.75, 0.55, -1.2, 0.2, 0.02, -2.3, 40], [0.45, 0.32, -1.75, 0.22, 0.02, -2.3, 34], seg(t, l(1), e(1))); DOF[1] = 0.4; }
  },
};
const PRIS = [john, clar];
const KX = (i) => ({ f: PRIS[i], x: [-1.6, 1.6][i] });

// ---------- frame loop ----------
window.renderFrame = (T) => {
  T = clamp(T, 0, TL.duration - 1e-3); NOW = T;
  let i = TL.beats.findIndex(b => T < b.end); if (i < 0) i = TL.beats.length - 1;
  const b = BEAT = TL.beats[i], t = T - b.start, d = b.end - b.start, ln = (k) => b.lines[Math.min(k, b.lines.length - 1)];
  reset(); SHOT[b.id](t, d, (k) => ln(k).t0 - b.start, (k) => ln(k).t1 - b.start);
  billboard(); sky(); camera.updateMatrixWorld(); if (fakeHead.visible) billboardObj(fakeHead); scene.updateMatrixWorld(); postRender(DOF);
  $('fade').style.opacity = clamp(Math.max(1 - T / 0.4, seg(T, TL.duration - 0.9, TL.duration - 0.05)));
  $('flash').style.opacity = 0;
};
window.DURATION = TL.duration;
window.renderFrame(0);
window.READY = true;
