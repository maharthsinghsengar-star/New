// THE STRANGE NEIGHBOUR — flat 2D cartoon characters in a vibrant cel-shaded 3D world (16:9).
// Fully deterministic: window.renderFrame(t) draws the frame for time t (seconds).
import * as THREE from 'three';

const W = 1280, H = 720;
const TL = await (await fetch('build/timeline.json')).json();
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 400);
const amb = new THREE.AmbientLight(0xffffff, 1), sun = new THREE.DirectionalLight(0xffffff, 1);
scene.add(amb, sun, sun.target);

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));           // progress of t through [a,b]
const RAMP = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat); RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.needsUpdate = true;
const L = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: RAMP, ...o });
const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, typeof mat === 'number' ? L(mat) : mat); m.position.set(x, y, z); return m; }
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r1, r2, h, c, x, y, z, s = 7) => mesh(new THREE.CylinderGeometry(r1, r2, h, Math.max(s, 12)), c, x, y, z);
const sph = (r, c, x, y, z) => mesh(new THREE.SphereGeometry(r, 18, 12), c, x, y, z);
const plane = (w, h, c, x, y, z) => mesh(new THREE.PlaneGeometry(w, h), c, x, y, z);
const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };
const G = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
// small, soft textures (the PS2 look: low-res, bilinear filtered)
function tex(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
const noisy = (base, cols, n = 220, extra) => (x, s) => { x.fillStyle = base; x.fillRect(0, 0, s, s); const r = RNG(base.length * 7 + n); for (let i = 0; i < n; i++) { x.globalAlpha = 0.25 + r() * 0.35; x.fillStyle = cols[r() * cols.length | 0]; x.fillRect(r() * s, r() * s, 1 + r() * 3, 1 + r() * 3); } x.globalAlpha = 1; if (extra) extra(x, s, r); };
const T = (base, cols, rx, ry, extra, n) => { const t = tex(64, noisy(base, cols, n, extra), rx, ry); t.anisotropy = 8; return t; };
const planksX = (line) => (x, s) => { x.fillStyle = line; x.globalAlpha = 0.7; for (let y = 0; y < s; y += 16) { x.fillRect(0, y, s, 1); x.fillRect((y * 5) % s, y, 1, 16); } x.globalAlpha = 1; };
const bricksX = (line) => (x, s) => { x.fillStyle = line; x.globalAlpha = 0.6; for (let y = 0; y < s; y += 8) { x.fillRect(0, y, s, 1); for (let k = (y / 8 % 2) * 8; k < s; k += 16) x.fillRect(k, y, 1, 8); } x.globalAlpha = 1; };
const TX = {
  asphalt: (rx, ry) => T('#5d6276', ['#52576a', '#6a6f84', '#585d70'], rx, ry, null, 500),
  grass: (rx, ry) => T('#4fc93a', ['#3fb42e', '#6fe052', '#45bd34'], rx, ry, null, 500),
  deadgrass: (rx, ry) => T('#a8a244', ['#94903a', '#bdb655', '#8a8634'], rx, ry, null, 500),
  walk: (rx, ry) => T('#d8d0c0', ['#c8c0b0', '#e6dfd0'], rx, ry, (x, s) => { x.fillStyle = '#b0a898'; x.fillRect(0, 0, s, 1); x.fillRect(0, 0, 1, s); }),
  siding: (c, l, rx, ry) => T(c, [l], rx, ry, (x, s) => { x.fillStyle = l; x.globalAlpha = 0.5; for (let y = 0; y < s; y += 8) x.fillRect(0, y, s, 1); x.globalAlpha = 1; }, 120),
  shingle: (c, l, rx, ry) => T(c, [l], rx, ry, bricksX(l), 200),
  brick: (c, l, rx, ry) => T(c, ['#c0503a', '#e06a4a'], rx, ry, bricksX(l), 200),
  planks: (c, l, rx, ry) => T(c, [l], rx, ry, planksX(l), 200),
  paper: (c, l, rx, ry) => T(c, [l], rx, ry, (x, s) => { x.fillStyle = l; x.globalAlpha = 0.35; for (let k = 0; k < s; k += 16) x.fillRect(k, 0, 6, s); x.globalAlpha = 1; }, 150),
  stone: (rx, ry) => T('#5d70a0', ['#52659a', '#6c80b4', '#566a98'], rx, ry, bricksX('#3a4a7a'), 400),
  rust: (rx, ry) => T('#a8522a', ['#c4622c', '#7a3a22', '#d07a30'], rx, ry, null, 500),
};
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function glow(color, size, x, y, z, op = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, fog: false })); sp.scale.setScalar(size); sp.position.set(x, y, z); return sp; }
const blobMat = B(0x0a0830, { transparent: true, opacity: 0.3, depthWrite: false });
const blob = (r) => { const m = mesh(new THREE.CircleGeometry(r, 20), blobMat, 0, 0.03, 0); m.rotation.x = -Math.PI / 2; return m; };

// ---------- flat 2D cartoon people (outlined, jointed, always turned to the camera) ----------
const flatMat = (c, o = {}) => B(c, { side: THREE.DoubleSide, ...o });
const OUT = flatMat(0x1c1430);
const ell = (rx, ry) => new THREE.CircleGeometry(1, 28).scale(rx, ry, 1);
const capG = (th, len) => new THREE.CapsuleGeometry(th / 2, len, 4, 10).scale(1, 1, 0.1);
const poly = (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
const shade = (c, k = 0.74) => new THREE.Color(c).multiplyScalar(k).getHex();
function Pt(geo, fill, x, y, z, parent, grow = 0.03) {
  const a = new THREE.Mesh(geo, typeof fill === 'number' ? flatMat(fill) : fill); a.position.set(x, y, z); parent.add(a);
  if (grow) { geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3()), c = geo.boundingBox.getCenter(new THREE.Vector3());
    const b = new THREE.Mesh(geo, OUT), sx = 1 + 2 * grow / s.x, sy = 1 + 2 * grow / s.y; b.scale.set(sx, sy, 1); b.position.set(x - c.x * (sx - 1), y - c.y * (sy - 1), z - 0.004); parent.add(b); }
  return a;
}
function limbC(len, th, fill, z = 0) { const g = new THREE.Group(); Pt(capG(th, len).translate(0, -len / 2, 0), fill, 0, 0, z, g); return g; }
const people = [];
function faceOf(kind, hr, head) {
  const g = new THREE.Group(), W_ = 0xffffff, D = 0x1c1430, old = kind[0] === 'w', ex = [0.12 * hr, 0.58 * hr], ey = 0.12 * hr, mx = 0.36 * hr, my = -0.42 * hr;
  const big = kind === 'scared' || kind === 'wgrin' ? 1.3 : 1;
  ex.forEach(x => {
    if (old) Pt(ell(0.24 * hr, 0.27 * hr), 0x3a2f55, x, ey, 0, g, 0);
    if (kind === 'cry') { Pt(ell(0.17 * hr, 0.035 * hr), D, x, ey, 0.002, g, 0); Pt(ell(0.06 * hr, 0.16 * hr), 0x6fcfff, x, ey - 0.26 * hr, 0.002, g, 0); }
    else { Pt(ell(0.15 * hr * big, 0.19 * hr * big), old ? 0xf4f0d8 : W_, x, ey, 0.002, g, 0.012); Pt(ell((old ? 0.045 : 0.075) * hr, (old ? 0.055 : 0.09) * hr), D, x + 0.03 * hr, ey, 0.004, g, 0); }
    if (kind === 'scared') { const b = Pt(ell(0.16 * hr, 0.03 * hr), D, x, ey + 0.38 * hr, 0.004, g, 0); b.rotation.z = x < 0.3 * hr ? 0.35 : -0.25; }
    if (old) { const b = Pt(ell(0.2 * hr, 0.035 * hr), 0xe8e8e8, x, ey + 0.34 * hr, 0.004, g, 0.01); b.rotation.z = kind === 'wgrin' ? (x < 0.3 * hr ? -0.5 : 0.5) : 0; }
  });
  if (kind === 'wgrin') { Pt(new THREE.CircleGeometry(0.52 * hr, 20, Math.PI, Math.PI).scale(1, 0.72, 1), 0xf4f0d8, mx, my + 0.12 * hr, 0.004, g, 0.025); for (let k = -3; k <= 3; k++) Pt(new THREE.PlaneGeometry(0.018 * hr, 0.3 * hr), D, mx + k * 0.13 * hr, my - 0.02 * hr, 0.006, g, 0); Pt(new THREE.PlaneGeometry(1.0 * hr, 0.02 * hr), D, mx, my - 0.04 * hr, 0.006, g, 0); }
  else if (kind === 'smile' || kind === 'wpolite') Pt(new THREE.RingGeometry(kind === 'smile' ? 0 : 0.17 * hr, 0.24 * hr, 14, 1, Math.PI, Math.PI), kind === 'smile' ? 0x8a2030 : D, mx, my + 0.08 * hr, 0.004, g, 0);
  else if (kind === 'scared' || kind === 'cry') Pt(ell(0.13 * hr, 0.17 * hr), 0x5a1020, mx, my - 0.02 * hr, 0.004, g, 0);
  else Pt(ell(old ? 0.3 * hr : 0.18 * hr, 0.03 * hr), D, mx, my, 0.004, g, 0);
  g.position.z = 0.03; g.visible = false; head.add(g); return g;
}
function human(o) {
  const s = o.h / 1.75, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const u = root.userData = { o, s, body, ry: 0, faces: {}, cur: null };
  const hr = 0.25 * (o.head ?? 1), legM = o.dress ? o.skin : o.bottom;
  const limb = (l1, l2, y, parent, c1, c2, far, kind) => {
    const z = far ? -0.016 : 0.016, a = limbC(l1, 0.15, far ? shade(c1) : c1, z); a.position.y = y; const b = limbC(l2, 0.13, far ? shade(c2) : c2, z); b.position.y = -l1; a.add(b); parent.add(a);
    if (kind === 'foot') Pt(new THREE.CapsuleGeometry(0.075, 0.15, 4, 10).rotateZ(Math.PI / 2).scale(1, 1, 0.1), far ? shade(o.shoes ?? 0x2a2a3a) : (o.shoes ?? 0x2a2a3a), 0.08, -l2 - 0.02, z + 0.002, b);
    else Pt(ell(0.09, 0.09), far ? shade(o.skin) : o.skin, 0, -l2 - 0.02, z + 0.002, b, 0.025);
    return [a, b];
  };
  u.legL = limb(0.44, 0.44, 0, body, legM, legM, true, 'foot');
  const torsoP = u.torsoP = new THREE.Group(); body.add(torsoP);
  u.armL = limb(0.33, 0.33, 0.5, torsoP, o.top, o.sleeve === false ? o.skin : o.top, true, 'hand');
  Pt(capG(0.3, 0.4).translate(0, 0.3, 0), o.top, 0, 0, 0, torsoP);
  if (o.badge) Pt(ell(0.05, 0.06), 0xffd23f, 0.08, 0.45, 0.004, torsoP, 0.012);
  if (o.dress) Pt(poly([[-0.17, 0.12], [0.17, 0.12], [0.38, -0.5], [-0.38, -0.5]]), o.dress, 0, 0, 0.006, body);
  if (o.coat) Pt(poly([[-0.17, 0.14], [0.17, 0.14], [0.25, -0.66], [-0.25, -0.66]]), o.coat, 0, 0, 0.006, body);
  u.legR = limb(0.44, 0.44, 0, body, legM, legM, false, 'foot');
  const head = u.head = new THREE.Group(); head.position.y = 0.6 + hr * 0.9; torsoP.add(head);
  if (o.hairStyle === 'long') Pt(new THREE.PlaneGeometry(hr * 1.2, hr * 2.0), o.hair, -hr * 0.65, -hr * 0.55, 0.008, head);
  if (o.hairStyle === 'tails') { Pt(ell(hr * 0.4, hr * 0.42), o.hair, -hr * 1.05, hr * 0.05, 0.008, head); Pt(ell(hr * 0.16, hr * 0.16), 0xff4d8d, -hr * 0.82, hr * 0.42, 0.03, head, 0.012); }
  if (o.hairStyle !== 'bald') Pt(ell(hr * 1.06, hr * 1.04), o.hair, -hr * 0.14, hr * 0.14, 0.01, head);
  Pt(ell(hr, hr), o.skin, 0, 0, 0.016, head); Pt(ell(hr * 0.13, hr * 0.11), o.skin, hr * 0.98, -hr * 0.1, 0.014, head, 0.02);
  if (o.hairStyle === 'bald') { Pt(ell(hr * 0.3, hr * 0.34), o.hair, -hr * 0.88, -hr * 0.05, 0.02, head, 0.015); }
  else Pt(new THREE.CircleGeometry(hr * 1.02, 20, Math.PI * 0.28, Math.PI * 0.86), o.hair, 0, hr * 0.04, 0.02, head, 0);
  if (o.cap) { Pt(new THREE.PlaneGeometry(hr * 2.1, hr * 0.6), o.cap, -hr * 0.05, hr * 0.86, 0.034, head, 0.02); Pt(new THREE.PlaneGeometry(hr * 0.9, hr * 0.16), shade(o.cap, 0.6), hr * 1.0, hr * 0.6, 0.034, head, 0.02); Pt(ell(hr * 0.14, hr * 0.14), 0xffd23f, hr * 0.3, hr * 0.9, 0.036, head, 0); }
  if (o.moustache) Pt(ell(hr * 0.26, hr * 0.07), 0xbdbdbd, hr * 0.42, -hr * 0.26, 0.036, head, 0.01);
  (o.faces ?? ['neutral']).forEach(k => u.faces[k] = faceOf(k, hr, head)); u.cur = Object.values(u.faces)[0]; u.cur.visible = true;
  u.back = Pt(ell(hr * 1.0, hr * 1.0), o.hairStyle === 'bald' ? o.skin : o.hair, 0, 0, 0.04, head, 0); u.back.visible = false;
  u.armR = limb(0.33, 0.33, 0.5, torsoP, o.top, o.sleeve === false ? o.skin : o.top, false, 'hand');
  u.blob = blob(0.36 * s); root.add(u.blob); root.visible = false; body.scale.setScalar(s); people.push(root); return root;
}
// same pose vocabulary as a 3D rig (arm = [raise, sideways, elbow], negative raise = forward), mapped onto the flat figure
function pose(f, p = {}) {
  const u = f.userData, w = p.walk, ph = w ? w[0] : 0, am = w ? (w[1] ?? 1) : 0, cr = p.crouch ?? 0, sit = p.sit ?? 0, lie = p.lie ?? 0;
  u.body.position.y = (0.99 - 0.36 * cr - 0.74 * sit) * u.s * (1 - lie) + lie * 0.2 * u.s + (w ? 0.03 * u.s * am * Math.abs(Math.cos(ph)) : 0);
  u.body.rotation.z = lie * Math.PI / 2;
  u.torsoP.rotation.z = -(p.lean ?? cr * 0.45); u.head.rotation.z = -(p.headPitch ?? 0) * 0.8 + (p.lean ?? cr * 0.45) * 0.6;
  const leg = (l, sg) => { l[0].rotation.z = 0.55 * am * Math.sin(ph) * sg + cr * 1.15 + sit * 1.45; l[1].rotation.z = -(am * (0.1 + 0.6 * Math.max(0, Math.cos(ph) * sg)) + cr * 2.0 + sit * 1.25); };
  leg(u.legR, 1); leg(u.legL, -1);
  const arm = (a, v, sg) => { a[0].rotation.z = v ? -v[0] : -0.5 * am * Math.sin(ph) * sg + 0.06 * sg; a[1].rotation.z = v ? -(v[2] ?? 0) : 0.25 * am + 0.12; };
  arm(u.armR, p.armR, 1); arm(u.armL, p.armL, -1);
  if (p.face && u.faces[p.face]) u.want = u.faces[p.face]; else u.want = u.want ?? u.cur;
  u.blob.visible = (p.blob ?? true) && !lie; u.yaw = p.headYaw ?? 0;
}
const facing = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
function put(f, x, z, ry = 0, y = 0) { f.visible = true; f.position.set(x, y, z); f.userData.ry = ry; }
function lookAt(f, x, z) { f.userData.ry = facing(f.position.x, f.position.z, x, z); }
function walk(f, pts, u, t, p = {}, pace = 7.5) {
  u = clamp(u); let tot = 0; const ls = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
  let d = u * tot, i = 0; while (i < ls.length - 1 && d > ls[i]) { d -= ls[i]; i++; }
  const a = pts[i], b = pts[i + 1], k = ls[i] ? d / ls[i] : 0, moving = u > 0 && u < 1;
  put(f, lerp(a[0], b[0], k), lerp(a[1], b[1], k), facing(a[0], a[1], b[0], b[1]), p.y ?? 0);
  pose(f, { ...p, walk: moving ? [t * pace, p.amp ?? 1] : undefined }); return moving;
}
// turn every figure to the camera; flip it left/right by where it is heading; show the back of the head when it faces away
function billboard() {
  people.forEach(f => { if (!f.visible) return; const u = f.userData, yaw = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z), ry = u.ry + u.yaw;
    f.rotation.set(0, yaw, 0); const side = Math.sin(ry) * Math.cos(yaw) - Math.cos(ry) * Math.sin(yaw), toCam = Math.sin(ry) * Math.sin(yaw) + Math.cos(ry) * Math.cos(yaw);
    if (Math.abs(side) > 0.18) u.flip = side > 0 ? 1 : -1; u.flip = u.flip ?? 1; u.body.scale.set(u.s * u.flip, u.s, u.s);
    const away = toCam < -0.45; Object.values(u.faces).forEach(g => g.visible = false); u.back.visible = away; if (!away) (u.want ?? u.cur).visible = true; });
}
const SKIN = 0xffcfa0;
const alex = human({ h: 1.6, skin: SKIN, top: 0x2f7fff, bottom: 0x3a3f8a, hair: 0x4a2a16, shoes: 0xffffff, faces: ['neutral', 'scared'] });
const lily = human({ h: 1.08, head: 1.25, skin: SKIN, top: 0xff6fa8, bottom: 0xff6fa8, dress: 0xff4d8d, hair: 0x6b3a1a, hairStyle: 'tails', shoes: 0xff9ec4, sleeve: false, faces: ['smile', 'neutral', 'scared', 'cry'] });
const dad = human({ h: 1.82, skin: SKIN, top: 0x2fb86a, bottom: 0x4a4f6a, hair: 0x3a2416, faces: ['neutral', 'smile'] });
const mom = human({ h: 1.68, skin: SKIN, top: 0xff7a3d, bottom: 0x7a4fd0, dress: 0x7a4fd0, hair: 0x8a4a1a, hairStyle: 'long', faces: ['neutral', 'smile'] });
const gramps = human({ h: 1.66, skin: 0xf2b890, top: 0xd9a83a, bottom: 0x6a5a4a, hair: 0xe8e8e8, moustache: true, faces: ['neutral', 'smile'] });
const wilson = human({ h: 2.02, skin: 0xcfd8c0, top: 0x2a2440, bottom: 0x1c1830, coat: 0x2a2440, hair: 0xe8e8e8, hairStyle: 'bald', shoes: 0x14101e, faces: ['wneutral', 'wpolite', 'wgrin'] });
const cop1 = human({ h: 1.84, skin: SKIN, top: 0x2440b0, bottom: 0x1c2a6a, hair: 0x2a1c14, cap: 0x1c2a6a, badge: true, faces: ['neutral'] });
const cop2 = human({ h: 1.78, skin: 0xd9a070, top: 0x2440b0, bottom: 0x1c2a6a, hair: 0x2a1c14, cap: 0x1c2a6a, badge: true, faces: ['neutral'] });
people.forEach(p => scene.add(p));
// flashlight: a small prop in Alex's hand, and a real spotlight that points where he is heading
const torch = Pt(new THREE.PlaneGeometry(0.1, 0.26), 0x2a2a3a, 0, -0.42, 0.03, alex.userData.armR[1], 0.02); torch.visible = false;
const spot = new THREE.SpotLight(0xfff0c8, 0, 18, 0.5, 0.6, 1.0), beam = mesh(new THREE.ConeGeometry(1.5, 6, 20, 1, true), B(0xfff0c8, { transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
const torchG = new THREE.Group(); beam.rotation.x = -Math.PI / 2; beam.position.z = 3.1; spot.target.position.set(0, -0.6, 6); torchG.add(spot, spot.target, beam); scene.add(torchG);
function torchOn(on, k = 1) { spot.intensity = on ? 70 * k : 0; beam.visible = on; torch.visible = true; }
function aimTorch() { const u = alex.userData, ry = u.ry; torchG.position.set(alex.position.x + Math.sin(ry) * 0.35, alex.position.y + u.body.position.y + 0.25 * u.s, alex.position.z + Math.cos(ry) * 0.35); torchG.rotation.set(0, ry, 0); }

// ---------- EXTERIOR: the street, the family house (+z side) and the mansion (-z side) ----------
const ext = new THREE.Group(); scene.add(ext);
const MW = { lit: B(0x140f3a), bed: B(0x140f3a), hall: B(0x140f3a) };          // mansion window back-walls (light on/off)
const mGate = [new THREE.Group(), new THREE.Group()], mDoor = new THREE.Group(), curtainL = [], curtainR = [], tape = new THREE.Group();
const lampGlow = [], houseWin = [], car = new THREE.Group(), boxes = new THREE.Group(), police = new THREE.Group(), policeLights = [];
const ball = sph(0.16, 0xe03a3a, 0, 0.16, 0), doll = new THREE.Group(), sandal = box(0.09, 0.03, 0.2, 0xff8fc0, 0, 0.02, 0), teddy = new THREE.Group(), moon = new THREE.Group();
{
  const g = ext, r = RNG(4);
  const gp = (t, w, d, x, z, y = 0) => { const m = plane(w, d, L(0xffffff, { map: t }), x, y, z); m.rotation.x = -Math.PI / 2; return m; };
  g.add(gp(TX.asphalt(40, 2), 240, 8, 0, 0, 0.01), gp(TX.walk(120, 1), 240, 1.5, 0, 4.75, 0.05), gp(TX.walk(120, 1), 240, 1.5, 0, -4.75, 0.05));
  g.add(gp(TX.grass(60, 12), 240, 60, 0, 35.5), gp(TX.deadgrass(60, 12), 240, 60, 0, -35.5));
  for (let x = -60; x < 60; x += 4) g.add(box(1.6, 0.012, 0.12, B(0xb9b9a8), x, 0.02, 0));
  // --- family house
  const wall = L(0xffffff, { map: TX.siding('#fff0c4', '#f0d498', 4, 3) }), trim = L(0xf6f2e8), roofM = L(0xffffff, { map: TX.shingle('#e8503a', '#b83a2a', 6, 3) });
  g.add(mesh(new THREE.BoxGeometry(12, 6, 9), wall, 0, 3, 13.5));
  const prism = (w, h, d, m) => { const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]); return mesh(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }), m); };
  const rf = prism(13.2, 3.4, 9.8, roofM); rf.position.set(0, 6, 8.6); g.add(rf);
  g.add(box(1.3, 2.4, 0.12, 0xd0553a, -2, 1.2, 8.96), box(1.6, 0.14, 0.2, trim, -2, 2.47, 8.95), box(2.4, 0.2, 1.4, 0x9a9a94, -2, 0.1, 8.3), box(0.08, 0.08, 0.06, 0xd9b84a, -1.5, 1.2, 8.88));
  for (const [x, y] of [[3, 1.6], [-4.6, 1.6], [3, 4.6], [-3, 4.6]]) { const m = B(0x8fb2c8); g.add(box(1.9, 0.15, 0.1, trim, x, y + 0.78, 8.97), box(1.9, 0.15, 0.1, trim, x, y - 0.78, 8.97), box(0.15, 1.7, 0.1, trim, x - 0.88, y, 8.97), box(0.15, 1.7, 0.1, trim, x + 0.88, y, 8.97), plane(1.6, 1.4, m, x, y, 8.9).rotateY(Math.PI), box(0.06, 1.4, 0.04, trim, x, y, 8.88), box(1.6, 0.06, 0.04, trim, x, y, 8.88)); houseWin.push(m); }
  g.add(gp(TX.walk(1, 3), 1.4, 3.5, -2, 6.9, 0.04), gp(TX.walk(2, 4), 3.4, 5, 8.6, 6.6, 0.04));
  for (let x = -11; x <= 11; x += 0.5) if (Math.abs(x + 2) > 0.9 && (x < 6.8 || x > 10.4)) g.add(box(0.1, 0.8, 0.05, trim, x, 0.4, 5.6));
  g.add(box(8.2, 0.07, 0.06, trim, -6.95, 0.58, 5.6), box(7.9, 0.07, 0.06, trim, 2.9, 0.58, 5.6));
  for (const [x, z, s] of [[-8.5, 8, 1.2], [11.6, 8.6, 0.9], [-10.5, 15, 1.4]]) g.add(cyl(0.16 * s, 0.22 * s, 1.8 * s, 0x4a3320, x, 0.9 * s, z), sph(1.3 * s, 0x3fbf4f, x, 2.6 * s, z, 7, 5), sph(0.9 * s, 0x59d35c, x + 0.6 * s, 2.2 * s, z + 0.3, 6, 5));
  for (let i = 0; i < 9; i++) g.add(sph(0.35, 0x3fbf4f, -5.6 + i * 1.3 + (i > 2 ? 1.4 : 0), 0.3, 8.6, 6, 4));
  // family car + luggage
  const cm = L(0x2f8fe8); car.add(box(1.8, 0.7, 4.2, cm, 0, 0.75, 0), box(1.6, 0.65, 2.2, cm, 0, 1.4, -0.3), box(1.62, 0.5, 1.9, L(0x1c2630), 0, 1.42, -0.3), box(1.5, 0.12, 0.1, 0xd0d0d0, 0, 0.6, 2.1));
  for (const [x, z] of [[0.9, 1.35], [-0.9, 1.35], [0.9, -1.35], [-0.9, -1.35]]) car.add(rot(cyl(0.36, 0.36, 0.22, 0x141414, x, 0.36, z, 10), 0, 0, Math.PI / 2));
  car.position.set(8.6, 0, 6.6); g.add(car);
  [[7.2, 0.3, 3.6, 0x9a7446, 0.6], [7.3, 0.85, 3.6, 0x8a6638, 0.5], [6.5, 0.25, 4.0, 0xa58450, 0.5], [9.9, 0.3, 4.2, 0x7a4a3a, 0.6]].forEach(([x, y, z, c, s]) => boxes.add(box(s * 1.2, s, s, c, x, y, z))); g.add(boxes);
  // --- the mansion
  const mw = L(0xffffff, { map: TX.siding('#6a55a8', '#4a3a80', 5, 4) }), mroof = L(0xffffff, { map: TX.shingle('#33295e', '#221b44', 6, 3) }), mtrim = L(0x2a2050);
  g.add(mesh(new THREE.BoxGeometry(14, 8.5, 8.6), mw, 0, 4.25, -15.8));                                    // rear block
  g.add(mesh(new THREE.BoxGeometry(14, 4.9, 0.3), mw, 0, 2.45, -10.15), mesh(new THREE.BoxGeometry(14, 1.5, 0.3), mw, 0, 7.75, -10.15));
  g.add(mesh(new THREE.BoxGeometry(14, 0.5, 0.3), mw, 0, 5.15, -10.15));
  for (const [x, w] of [[-6.15, 1.7], [-2.15, 2.7], [2.15, 2.7], [6.15, 1.7]]) g.add(mesh(new THREE.BoxGeometry(w, 1.8, 0.3), mw, x, 6.1, -10.15));
  g.add(box(0.3, 8.5, 1.4, mw, -6.85, 4.25, -10.9), box(0.3, 8.5, 1.4, mw, 6.85, 4.25, -10.9), box(14, 0.2, 1.4, 0x1a1816, 0, 4.9, -10.9));
  const rf2 = prism(15.4, 4.6, 11, mroof); rf2.position.set(0, 8.5, -20.6); g.add(rf2);
  g.add(box(1.2, 3, 1.2, 0x8a3a4a, -4.5, 11.2, -16), box(1.5, 0.3, 1.5, 0x5a2434, -4.5, 12.8, -16));
  [[-4.3, 'hall'], [0, 'lit'], [4.3, 'bed']].forEach(([x, k]) => {                                           // upstairs windows with curtains
    g.add(plane(1.9, 2.2, MW[k], x, 6.1, -11.55), box(1.7, 0.1, 0.12, mtrim, x, 5.2, -9.98), box(0.05, 1.8, 0.05, mtrim, x, 6.1, -10.0), box(1.5, 0.05, 0.05, mtrim, x, 6.3, -10.0));
    const cm = L(0xc0203a), cl = box(0.62, 1.84, 0.04, cm, x - 0.44, 6.1, -10.32), cr = box(0.62, 1.84, 0.04, cm, x + 0.44, 6.1, -10.32); g.add(cl, cr); curtainL.push(cl); curtainR.push(cr);
  });
  for (const x of [-4.3, 4.3]) { g.add(plane(1.5, 1.9, B(0x140f3a), x, 2.2, -9.98), box(1.7, 0.1, 0.12, mtrim, x, 1.2, -9.96), box(0.05, 1.9, 0.05, mtrim, x, 2.2, -9.96), box(1.5, 0.05, 0.05, mtrim, x, 2.3, -9.96), box(0.5, 1.9, 0.04, 0xa01c34, x - 0.5, 2.2, -9.97), box(0.5, 1.9, 0.04, 0xa01c34, x + 0.5, 2.2, -9.97));
    g.add(rot(box(0.5, 0.04, 0.02, B(0x9fb0c0), x + 0.2, 2.75, -9.95), 0, 0, 0.7), rot(box(0.4, 0.04, 0.02, B(0x9fb0c0), x - 0.25, 1.8, -9.95), 0, 0, -0.5)); }   // cracks
  // porch + front door
  g.add(box(4.4, 0.3, 2.2, 0x4f4288, 0, 0.15, -8.9), box(3.4, 0.15, 0.5, 0x4f4288, 0, 0.08, -7.6), box(4.8, 0.18, 2.5, 0x33295e, 0, 3.4, -8.9), box(0.16, 3.1, 0.16, 0x2a2050, -2, 1.85, -7.95), box(0.16, 3.1, 0.16, 0x2a2050, 2, 1.85, -7.95));
  g.add(plane(1.4, 2.6, B(0x0c0828), 0, 1.6, -9.99), box(1.7, 0.14, 0.14, mtrim, 0, 2.95, -9.95));
  mDoor.add(box(1.36, 2.56, 0.08, L(0xffffff, { map: TX.planks('#8a3a2a', '#5a2218', 1, 2) }), 0.68, 1.28, 0), sph(0.05, 0xb9963a, 1.2, 1.25, 0.07)); mDoor.position.set(-0.68, 0.3, -9.93); g.add(mDoor);
  // kitchen side window (east wall) and basement window (back, east)
  g.add(plane(1.0, 0.9, B(0x140f3a), 7.16, 1.7, -13.2).rotateY(Math.PI / 2), box(0.1, 1.0, 1.1, mtrim, 7.12, 1.7, -13.2), plane(0.9, 0.4, B(0x140f3a), 7.16, 0.45, -17.6).rotateY(Math.PI / 2));
  // iron fence + gate, dead trees, weeds
  const iron = L(0xffffff, { map: TX.rust(1, 2) });
  for (let x = -11; x <= 11; x += 0.42) if (Math.abs(x) > 1.05) g.add(cyl(0.035, 0.035, 1.9, iron, x, 0.95, -5.6, 4), mesh(new THREE.ConeGeometry(0.06, 0.16, 4), iron, x, 1.98, -5.6));
  g.add(box(9.9, 0.07, 0.07, iron, -6.05, 1.6, -5.6), box(9.9, 0.07, 0.07, iron, 6.05, 1.6, -5.6), box(9.9, 0.07, 0.07, iron, -6.05, 0.3, -5.6), box(9.9, 0.07, 0.07, iron, 6.05, 0.3, -5.6), box(0.3, 2.5, 0.3, 0x5a4f8a, -1.2, 1.25, -5.6), box(0.3, 2.5, 0.3, 0x5a4f8a, 1.2, 1.25, -5.6));
  mGate.forEach((gt, i) => { const sg = i ? -1 : 1; for (let k = 0; k < 5; k++) gt.add(cyl(0.035, 0.035, 2.0, iron, sg * (0.12 + k * 0.21), 1.0, 0, 4)); gt.add(box(1.0, 0.07, 0.07, iron, sg * 0.52, 1.75, 0), box(1.0, 0.07, 0.07, iron, sg * 0.52, 0.3, 0)); gt.position.set(i ? 1.05 : -1.05, 0, -5.6); g.add(gt); });
  g.add(gp(TX.walk(1, 3), 1.6, 3.4, 0, -7.2, 0.04));
  const dead = (x, z, s) => { const t = new THREE.Group(), bm = L(0x3a2a5a); t.add(cyl(0.12 * s, 0.22 * s, 3.2 * s, bm, 0, 1.6 * s, 0, 5)); for (let i = 0; i < 6; i++) { const b = cyl(0.03 * s, 0.07 * s, (1.4 + r()) * s, bm, 0, 0, 0, 4), a = i * 1.05 + r(), tl = 0.6 + r() * 0.5; b.position.set(Math.sin(a) * 0.5 * s, (2.4 + i * 0.28) * s, Math.cos(a) * 0.5 * s); b.rotation.set(Math.cos(a) * tl, 0, -Math.sin(a) * tl); t.add(b); } t.position.set(x, 0, z); return t; };
  g.add(dead(-5.2, -7.8, 1.25), dead(5.6, -8.2, 1.0), dead(-9.5, -12, 1.4), dead(9.8, -9, 1.15), dead(10.5, -17, 1.3));
  for (let i = 0; i < 40; i++) g.add(mesh(new THREE.ConeGeometry(0.1, 0.5 + r() * 0.4, 4), 0x8a9a3a, -10 + r() * 20, 0.25, -6.2 - r() * 3.2));
  // police tape (after the arrest)
  for (const y of [1.1, 0.7]) tape.add(rot(box(3.4, 0.09, 0.02, B(0xe8c820), 0, y, -5.45), 0, 0, y > 1 ? 0.05 : -0.06)); tape.add(rot(box(1.8, 0.09, 0.02, B(0xe8c820), 0, 1.5, -9.85), 0, 0, 0.5), rot(box(1.8, 0.09, 0.02, B(0xe8c820), 0, 1.5, -9.84), 0, 0, -0.5)); g.add(tape);
  // neighbourhood: other houses, trees, street lamps
  for (const sgn of [1, -1]) for (const x of [-44, -29, -15.5, 16, 30, 45]) { if (sgn < 0 && Math.abs(x) < 20) { g.add(dead(x * 0.95, -11 - r() * 5, 1.2)); continue; }
    const h = new THREE.Group(), c = ['#bfeaa8', '#ffd0a0', '#a8d4f5', '#f7e6a0'][r() * 4 | 0]; h.add(mesh(new THREE.BoxGeometry(9, 5, 7), L(0xffffff, { map: TX.siding(c, '#d8c890', 3, 3) }), 0, 2.5, 0)); const pr = prism(10, 2.8, 7.6, L(0xffffff, { map: TX.shingle('#d0603a', '#a0482a', 5, 3) })); pr.position.set(0, 5, -3.8); h.add(pr);
    const wm = B(0x8fb2c8); h.add(plane(1.4, 1.3, wm, 2, 2.9, 3.52), plane(1.4, 1.3, wm, -2.2, 2.9, 3.52), box(1.1, 2.1, 0.1, 0x5a3a26, 0, 1.05, 3.5)); houseWin.push(wm); h.position.set(x, 0, sgn * 13.5); if (sgn < 0) h.rotation.y = Math.PI; g.add(h); }
  for (const x of [-24, -8, 12, 26]) { for (const sgn of [1, -1]) { const lx = x + (sgn > 0 ? 0 : 6); g.add(cyl(0.06, 0.09, 4.6, 0x2a2c30, lx, 2.3, sgn * 4.3, 5), box(0.9, 0.08, 0.14, 0x2a2c30, lx, 4.6, sgn * 3.95), box(0.36, 0.1, 0.22, B(0xfff0c0), lx, 4.52, sgn * 3.6)); const gl = glow(0xffd9a0, 3.4, lx, 4.4, sgn * 3.6, 0); g.add(gl); lampGlow.push(gl); } }
  // police car
  const pm = L(0xe8e8e8); police.add(box(1.8, 0.7, 4.3, pm, 0, 0.75, 0), box(1.6, 0.6, 2.2, pm, 0, 1.38, -0.2), box(1.62, 0.46, 1.9, L(0x1c2630), 0, 1.4, -0.2), box(1.82, 0.3, 1.5, 0x1c2748, 0, 0.8, 0.1));
  for (const [x, z] of [[0.9, 1.35], [-0.9, 1.35], [0.9, -1.35], [-0.9, -1.35]]) police.add(rot(cyl(0.36, 0.36, 0.22, 0x141414, x, 0.36, z, 10), 0, 0, Math.PI / 2));
  for (const [x, c] of [[-0.35, 0xff2020], [0.35, 0x2050ff]]) { const m = B(c), gl = glow(c, 5, x, 1.9, -0.2, 0); police.add(box(0.5, 0.16, 0.3, m, x, 1.76, -0.2), gl); policeLights.push([m, gl, c]); }
  g.add(police);
  doll.add(box(0.12, 0.2, 0.07, 0x7a5ad0, 0, 0.1, 0), sph(0.07, SKIN, 0, 0.26, 0, 6, 5), sph(0.075, 0xd9a83a, 0, 0.28, -0.02, 6, 5), box(0.3, 0.04, 0.04, SKIN, 0, 0.16, 0)); g.add(doll, ball, sandal);
  teddy.add(sph(0.14, 0xe89a3a, 0, 0, 0), sph(0.1, 0xe89a3a, 0, 0.2, 0), sph(0.04, 0xe89a3a, 0.08, 0.28, 0), sph(0.04, 0xe89a3a, -0.08, 0.28, 0), box(0.12, 0.05, 0.02, 0xe03a3a, 0, 0.1, 0.1)); teddy.position.set(0.05, -0.52, 0.05); teddy.scale.setScalar(0.9); wilson.userData.armR[1].add(teddy);
  moon.add(sph(5, B(0xfff6d8, { fog: false }), 0, 0, 0), glow(0xb8c8ff, 50, 0, 0, 1, 0.6)); moon.position.set(-38, 62, -150); g.add(moon);
}
const cloudMats = [], stars = new THREE.Group();
{ const r = RNG(9), CT = [0, 1, 2].map(k => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), q = RNG(70 + k), bl = []; for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8, hh = Math.sin(u * Math.PI) ** 0.7; bl.push([36 + u * 184 + q() * 10, 86 - hh * (20 + q() * 26), 17 + hh * 17 + q() * 5]); } const dr = (col, dy, sc) => { x.fillStyle = col; bl.forEach(([cx, cy, rr]) => { x.beginPath(); x.arc(cx, cy + dy, rr * sc, 0, 6.3); x.fill(); }); x.beginPath(); x.roundRect(25, 75 + dy, 206, 23, 11); x.fill(); }; dr('#b9d3f5', 5, 1); dr('#ffffff', -2, 0.94); return new THREE.CanvasTexture(c); });
  for (let i = 0; i < 22; i++) { const m = new THREE.SpriteMaterial({ map: CT[i % 3], transparent: true, depthWrite: false, fog: false }), sp = new THREE.Sprite(m), s = 40 + r() * 50; sp.scale.set(s, s / 2, 1); const side = i % 2 ? -1 : 1; sp.position.set(-200 + r() * 400, 30 + r() * r() * 90, side * (230 + r() * 40)); sp.renderOrder = -5; ext.add(sp); cloudMats.push(m); }
  const sm = B(0xffffff, { fog: false }); for (let i = 0; i < 160; i++) { const a = r() * 6.28, e = 0.15 + r() * 1.2; stars.add(mesh(new THREE.SphereGeometry(0.35 + r() * 0.5, 4, 3), sm, Math.cos(a) * Math.cos(e) * 300, Math.sin(e) * 300, Math.sin(a) * Math.cos(e) * 300)); } ext.add(stars); }
// Alex's bedroom (upstairs front of the family house; the window looks straight at the mansion)
const bedroom = new THREE.Group(), bedCurt = [], bedLamp = new THREE.PointLight(0xffc890, 0, 9, 1.4), tvLight = new THREE.PointLight(0x8fb0ff, 0, 7, 1.4), phone = new THREE.Group();
{
  const g = bedroom, wp = L(0xffffff, { map: TX.paper('#5fb0f0', '#4a9ae0', 3, 1) }), fl = L(0xffffff, { map: TX.planks('#d99a55', '#a86a35', 3, 3) });
  g.add(box(6, 0.1, 5, fl, 3, 3.15, 11.5), box(6, 0.1, 5, 0xd8d4cc, 3, 5.95, 11.5), box(0.1, 2.8, 5, wp, 0.05, 4.55, 11.5), box(0.1, 2.8, 5, wp, 5.95, 4.55, 11.5), box(6, 2.8, 0.1, wp, 3, 4.55, 13.95));
  g.add(box(6, 0.8, 0.1, wp, 3, 3.6, 9.05), box(6, 0.5, 0.1, wp, 3, 5.7, 9.05), box(2.2, 1.5, 0.1, wp, 1.1, 4.7, 9.05), box(2.2, 1.5, 0.1, wp, 4.9, 4.7, 9.05));
  g.add(box(1.7, 0.08, 0.2, 0xf0ece0, 3, 3.98, 9.12), box(0.05, 1.5, 0.05, 0xf0ece0, 3, 4.7, 9.02), box(1.6, 0.05, 0.05, 0xf0ece0, 3, 4.7, 9.02));
  for (const sg of [-1, 1]) { const c = box(0.5, 1.7, 0.05, 0x34507a, 3 + sg * 0.95, 4.75, 9.16); g.add(c); bedCurt.push(c); }
  g.add(box(2.0, 0.4, 3.2, 0x5a4030, 1.2, 3.45, 12.2), box(1.9, 0.22, 2.3, 0x3a5a8a, 1.2, 3.75, 12.6), box(1.5, 0.2, 0.6, 0xe8e4dc, 1.2, 3.78, 10.95), box(2.0, 0.9, 0.12, 0x4a3426, 1.2, 3.9, 13.82));
  g.add(box(0.6, 0.6, 0.6, 0x5a4030, 2.6, 3.5, 13.5), cyl(0.04, 0.06, 0.3, 0x2a2a2a, 2.6, 3.95, 13.5), mesh(new THREE.ConeGeometry(0.2, 0.26, 8, 1, true), L(0xe8d8a8, { side: THREE.DoubleSide }), 2.6, 4.2, 13.5));
  g.add(box(1.6, 0.08, 0.7, 0x5a4030, 5.2, 3.95, 12.6), box(0.08, 0.75, 0.6, 0x4a3426, 4.5, 3.57, 12.6), box(0.9, 0.62, 0.1, 0x16161a, 5.55, 4.32, 12.6).rotateY(-Math.PI / 2), plane(0.74, 0.5, B(0x8fb0ff), 5.49, 4.32, 12.6).rotateY(-Math.PI / 2));
  g.add(plane(1.0, 1.3, B(0x9a4a3a), 0.11, 4.9, 12).rotateY(Math.PI / 2), plane(2.6, 1.8, L(0x7a3a3a), 3, 3.21, 11.4).rotateX(-Math.PI / 2));
  bedLamp.position.set(2.6, 4.3, 13.3); tvLight.position.set(5.1, 4.4, 12.6); g.add(bedLamp, tvLight);
  const scr = tex(128, (x) => { x.fillStyle = '#0c0f14'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#8a8f98'; x.font = '9px sans-serif'; x.fillText('Unknown number', 10, 22); x.fillStyle = '#d8dce4'; x.font = '10px sans-serif'; ['YOU SHOULD NEVER', 'HAVE OPENED MY', 'BASEMENT DOOR.'].forEach((s, i) => x.fillText(s, 10, 50 + i * 15)); });
  phone.add(box(0.36, 0.02, 0.62, 0x101014, 0, 0, 0), mesh(new THREE.PlaneGeometry(0.32, 0.56), B(0xffffff, { map: scr }), 0, 0.012, 0).rotateX(-Math.PI / 2)); g.add(phone);
  scene.add(g);
}

// ---------- MANSION INTERIOR (its own space) ----------
const IX = 0, IZ = -300, inner = new THREE.Group(); inner.position.set(IX, 0, IZ); scene.add(inner);
const evidence = new THREE.Group(), clockPend = new THREE.Group(), bDoor = new THREE.Group(), drawer = box(0.7, 0.2, 0.5, 0x4a3020, -7.6, 0.75, 10.55), smallKey = box(0.1, 0.02, 0.04, 0xd9b84a, -7.6, 0.87, 10.4), winLight = new THREE.PointLight(0x6f8fc8, 0, 9, 1.2);
{
  const g = inner, wp = L(0xffffff, { map: TX.paper('#8a5fc0', '#6f48a8', 6, 1) }), fl = L(0xffffff, { map: TX.planks('#c07a42', '#8a5028', 6, 5) }), kw = L(0xffffff, { map: TX.paper('#3fb8a4', '#2f9a88', 6, 1) });
  g.add(mesh(new THREE.PlaneGeometry(17, 11), fl, -0.5, 0, 5.5).rotateX(-Math.PI / 2), mesh(new THREE.PlaneGeometry(17, 11), L(0x4a3a80), -0.5, 3.2, 5.5).rotateX(Math.PI / 2));
  const w = (wd, x, z, ry = 0, m = wp, h = 3.2, y = 1.6) => { const b = box(wd, h, 0.16, m, x, y, z); b.rotation.y = ry; g.add(b); };
  w(17, -0.5, 0); w(17, -0.5, 11); w(11, -9, 5.5, Math.PI / 2); w(3, 8, 1.5, Math.PI / 2, kw); w(6.8, 8, 7.6, Math.PI / 2, kw); w(1.2, 8, 3.6, Math.PI / 2, kw, 1.25, 0.625); w(1.2, 8, 3.6, Math.PI / 2, kw, 0.85, 2.775);
  w(3, 0, 1.5, Math.PI / 2); w(2.9, 0, 6.05, Math.PI / 2); w(1.6, 0, 3.8, Math.PI / 2, wp, 0.8, 2.8);
  w(3.5, -7.25, 7.5); w(4, -2, 7.5); w(1.5, -4.75, 7.5, 0, wp, 0.8, 2.8); w(3, 1.5, 7.5); w(3.5, 6.25, 7.5); w(1.5, 3.75, 7.5, 0, wp, 0.8, 2.8);
  // living room
  const sheet = L(0xe8e4f0), dark = L(0x7a4424);
  g.add(box(2.6, 0.5, 1.0, 0xd03a4a, -4.8, 0.3, 4.0), box(2.6, 0.8, 0.25, 0xa82a3a, -4.8, 0.75, 4.4), box(0.25, 0.7, 1.0, 0xa82a3a, -6.2, 0.6, 4.0), box(0.25, 0.7, 1.0, 0xa82a3a, -3.4, 0.6, 4.0));
  g.add(box(1.0, 1.0, 1.0, sheet, -1.6, 0.5, 5.6), box(1.4, 0.4, 0.8, dark, -4.8, 0.2, 2.3), mesh(new THREE.PlaneGeometry(4.2, 3), L(0x2f9a88), -4.8, 0.012, 3.2).rotateX(-Math.PI / 2));
  g.add(box(0.7, 2.4, 0.45, dark, -8.55, 1.2, 5.6), mesh(new THREE.CircleGeometry(0.22, 10), B(0xd8d0b8), -8.3, 2.0, 5.6).rotateY(Math.PI / 2)); clockPend.add(box(0.03, 0.7, 0.03, 0xb9963a, 0, -0.35, 0), sph(0.08, 0xb9963a, 0, -0.7, 0, 6, 4)); clockPend.position.set(-8.3, 1.6, 5.6); g.add(clockPend);
  for (const [z, c] of [[1.6, 0x3a2a3a], [3.4, 0x2a3a30]]) g.add(box(0.08, 1.5, 1.1, 0x6a5020, -8.9, 2.0, z), plane(0.9, 1.3, L(c), -8.84, 2.0, z).rotateY(Math.PI / 2), mesh(new THREE.CircleGeometry(0.22, 8), L(0x8a8478), -8.83, 2.2, z).rotateY(Math.PI / 2));
  // the wall of photographs (evidence, hidden when the house is "clean")
  const names = ['EMMA  1987', 'TOM  1991', 'SARA  1996', 'BEN  2003', 'MIA  2011', 'NOAH  2019'], shirts = ['#c05050', '#5070c0', '#50a070', '#c0a040', '#9060c0', '#c07040'];
  names.forEach((n, i) => { const t = tex(64, (x) => { x.fillStyle = '#8a8474'; x.fillRect(0, 0, 64, 64); x.fillStyle = shirts[i]; x.fillRect(16, 40, 32, 24); x.fillStyle = '#d8b090'; x.beginPath(); x.arc(32, 28, 12, 0, 6.3); x.fill(); x.fillStyle = ['#3a2416', '#d9a83a', '#1a1410'][i % 3]; x.fillRect(20, 13, 24, 8); x.fillStyle = '#1a1410'; x.fillRect(26, 27, 3, 3); x.fillRect(35, 27, 3, 3); });
    const lt = tex(64, (x) => { x.fillStyle = '#e8e2d0'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2a2018'; x.font = '11px serif'; x.textAlign = 'center'; x.fillText(n.split('  ')[0], 32, 28); x.fillText(n.split('  ')[1], 32, 48); }); lt.repeat.set(1, 1);
    const px = -7.6 + i * 1.12, py = 1.95 + (i % 2) * 0.12; evidence.add(box(0.74, 0.86, 0.05, 0x1e1612, px, py, 0.12), mesh(new THREE.PlaneGeometry(0.62, 0.74), L(0xffffff, { map: t }), px, py, 0.15), mesh(new THREE.PlaneGeometry(0.56, 0.24), L(0xffffff, { map: lt }), px, py - 0.62, 0.1)); });
  // kitchen
  g.add(box(1.6, 0.08, 1.0, dark, 4, 0.9, 3.6), box(0.1, 0.9, 0.1, dark, 3.3, 0.45, 3.2), box(0.1, 0.9, 0.1, dark, 4.7, 0.45, 3.2), box(0.1, 0.9, 0.1, dark, 3.3, 0.45, 4.0), box(0.1, 0.9, 0.1, dark, 4.7, 0.45, 4.0), box(0.5, 0.5, 0.5, dark, 4, 0.25, 2.6));
  g.add(box(6, 0.95, 0.7, 0x4a4a44, 4, 0.475, 0.45), box(6.1, 0.06, 0.76, 0x8a8a80, 4, 0.98, 0.45), box(6, 0.8, 0.4, 0x3a3a34, 4, 2.4, 0.3), box(0.8, 1.9, 0.7, 0xb8b8b0, 7.4, 0.95, 6.4), box(0.9, 0.08, 0.6, 0x8a8a80, 7.6, 1.2, 3.6));
  g.add(plane(1.2, 1.0, B(0x0a1020), 8.12, 1.75, 3.6).rotateY(-Math.PI / 2)); winLight.position.set(7, 1.9, 3.6); g.add(winLight);
  evidence.add(box(0.36, 0.06, 0.26, 0x6a2a3a, 4.1, 0.97, 3.5), box(0.3, 0.02, 0.2, 0x2a1a14, 4.1, 0.99, 3.5), rot(box(0.38, 0.02, 0.28, 0x7a3040, 4.42, 0.96, 3.8), 0, 0.5, 0), rot(box(0.09, 0.03, 0.2, 0xff8fc0, 3.6, 0.96, 3.7), 0, 0.6, 0));
  [[3.6, 5.4], [3.7, 6.6], [3.2, 8.2], [1.0, 9.0], [-2.0, 9.3], [-5.2, 9.2]].forEach(([x, z], i) => evidence.add(i % 2 ? rot(box(0.12, 0.02, 0.07, [0xd9b84a, 0xc03030, 0x3070c0][i % 3], x, 0.02, z), 0, i, 0) : sph(0.05, [0xff6fa8, 0x7a5ad0, 0xe8c820][i % 3], x, 0.05, z, 5, 4)));
  g.add(evidence);
  // hallway: the basement door, the drawers
  g.add(plane(1.3, 2.4, B(0x0c0828), -8.9, 1.2, 9.25).rotateY(Math.PI / 2), box(0.1, 2.6, 0.12, dark, -8.88, 1.3, 8.55), box(0.1, 2.6, 0.12, dark, -8.88, 1.3, 9.95), box(0.1, 0.12, 1.5, dark, -8.88, 2.55, 9.25));
  bDoor.add(box(0.08, 2.36, 1.26, L(0xffffff, { map: TX.planks('#3a2418', '#1e120c', 1, 2) }), 0, 1.18, 0.63), sph(0.05, 0xb9963a, 0.07, 1.15, 1.1)); bDoor.position.set(-8.82, 0, 8.62); g.add(bDoor);
  g.add(box(0.9, 0.9, 0.5, 0x3a2418, -7.6, 0.45, 10.7), drawer, smallKey, box(0.9, 0.04, 0.5, 0x2a1a10, -7.6, 0.92, 10.7), mesh(new THREE.PlaneGeometry(1.2, 6), L(0x4a2226), -2, 0.012, 9.25).rotateX(-Math.PI / 2).rotateZ(Math.PI / 2));
}
// ---------- BASEMENT ----------
const BX = 60, BZ = -300, base = new THREE.Group(); base.position.set(BX, 0, BZ); scene.add(base);
const cell = new THREE.Group(), cellGate = new THREE.Group(), keyring = new THREE.Group(), cupboard = new THREE.Group(), hiddenWall = new THREE.Group(), hiddenRoom = new THREE.Group(), blankWall = new THREE.Group(), bulb = new THREE.PointLight(0xffc890, 0, 12, 1.3), bulbMesh = sph(0.07, B(0xffe0a0), 5, 2.35, 0, 6, 4), gardenLight = new THREE.PointLight(0x6f8fc8, 0, 6, 1.2);
{
  const g = base, st = L(0xffffff, { map: TX.stone(6, 2) }), fl = L(0xffffff, { map: T('#4a5684', ['#404c78', '#566292'], 8, 6, null, 500) }), wood = L(0xffffff, { map: TX.planks('#a8683a', '#74421f', 2, 2) });
  g.add(mesh(new THREE.PlaneGeometry(18, 13), fl, 4, 0, 1).rotateX(-Math.PI / 2), mesh(new THREE.PlaneGeometry(18, 13), L(0x2a3260), 4, 2.8, 1).rotateX(Math.PI / 2));
  const w = (wd, x, z, ry = 0, h = 2.8, y = 1.4) => { const b = box(wd, h, 0.2, st, x, y, z); b.rotation.y = ry; g.add(b); return b; };
  w(3.5, 1.75, -4); w(5, 9.5, -4); hiddenWall.add(box(3.5, 2.8, 0.2, st, 5.25, 1.4, -4)); g.add(hiddenWall);
  w(1.0, 0.5, 4); w(9.5, 7.25, 4); w(1.5, 1.75, 4, 0, 0.7, 2.45); w(8, 12, 0, Math.PI / 2); w(3, 0, -2.5, Math.PI / 2); w(3, 0, 2.5, Math.PI / 2); w(2, 0, 0, Math.PI / 2, 0.4, 2.6);
  // stairwell coming down from the west
  w(4.4, -2.2, -1.05); w(4.4, -2.2, 1.05); for (let i = 0; i < 9; i++) g.add(box(0.5, 0.3, 1.9, wood, -0.25 - i * 0.48, 0.15 + i * 0.3, 0));
  g.add(plane(1.9, 2.4, B(0x0c0828), -4.4, 3.9, 0).rotateY(Math.PI / 2));
  // the cell
  const iron = L(0x8a94b8);
  for (let z = -3.9; z <= 3.9; z += 0.3) if (Math.abs(z) > 0.62) cell.add(cyl(0.035, 0.035, 2.8, iron, 8.5, 1.4, z, 4));
  cell.add(box(0.08, 0.1, 8, iron, 8.5, 2.2, 0), box(0.08, 0.5, 1.3, iron, 8.5, 2.5, 0), box(1.6, 0.12, 0.8, 0x4a4438, 11, 0.06, 2.6), box(0.5, 0.1, 0.5, 0x6a6458, 11.3, 0.16, 2.6));
  for (let k = 0; k < 5; k++) cellGate.add(cyl(0.035, 0.035, 2.2, iron, 0, 1.1, 0.12 + k * 0.26, 4)); cellGate.add(box(0.07, 0.08, 1.2, iron, 0, 2.15, 0.6), box(0.07, 0.08, 1.2, iron, 0, 0.2, 0.6), box(0.12, 0.2, 0.12, 0x6a5a2a, 0, 1.1, 1.12)); cellGate.position.set(8.5, 0, -0.6); cell.add(cellGate);
  g.add(cell); blankWall.add(box(8, 2.8, 0.2, st, 8.5, 1.4, 0).rotateY(Math.PI / 2)); g.add(blankWall);
  // table + keys, cupboard, shelves, junk
  g.add(box(1.6, 0.08, 0.7, wood, 5.5, 0.85, 3.5), box(0.08, 0.85, 0.08, wood, 4.8, 0.42, 3.25), box(0.08, 0.85, 0.08, wood, 6.2, 0.42, 3.25), box(0.08, 0.85, 0.08, wood, 4.8, 0.42, 3.75), box(0.08, 0.85, 0.08, wood, 6.2, 0.42, 3.75));
  keyring.add(mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 8), L(0x9a9a9a)), box(0.03, 0.14, 0.01, 0xd9b84a, 0.05, -0.1, 0), box(0.03, 0.12, 0.01, 0x9a9a9a, -0.04, -0.1, 0), box(0.03, 0.15, 0.01, 0xb98a3a, 0, -0.12, 0)); keyring.rotation.x = -Math.PI / 2; keyring.position.set(5.5, 0.91, 3.5); g.add(keyring);
  cupboard.add(box(2.2, 2.2, 0.7, wood, 0, 1.1, 0), box(0.04, 2.0, 0.02, 0x140c08, 0, 1.1, 0.36), sph(0.04, 0xb9963a, 0.12, 1.1, 0.38, 5, 4), sph(0.04, 0xb9963a, -0.12, 1.1, 0.38, 5, 4)); cupboard.position.set(5.2, 0, -2.5); g.add(cupboard);
  g.add(box(0.6, 0.5, 0.5, 0x4a4030, 2, 0.25, -3.4), box(0.5, 0.4, 0.5, 0x3a3428, 2.1, 0.7, -3.45), cyl(0.3, 0.3, 0.8, 0x3a2e24, 10.8, 0.4, -3.2), cyl(0.02, 0.02, 0.4, 0x1a1a1a, 5, 2.6, 0, 4), bulbMesh);
  bulb.position.set(5, 2.2, 0); g.add(bulb);
  // storage room (south) with the narrow garden window
  g.add(mesh(new THREE.PlaneGeometry(4.4, 3.2), fl, 2.2, 0.001, 5.6).rotateX(-Math.PI / 2)); w(4.4, 2.2, 7.2, 0, 1.8, 0.9); w(4.4, 2.2, 7.2, 0, 0.35, 2.62); w(1.5, 0.75, 7.2, 0, 0.7, 2.15); w(1.5, 3.65, 7.2, 0, 0.7, 2.15); w(3.2, 0, 5.6, Math.PI / 2); w(3.2, 4.4, 5.6, Math.PI / 2);
  g.add(plane(1.4, 0.7, B(0x16223a), 2.2, 2.15, 7.4).rotateY(Math.PI), box(0.9, 0.9, 0.9, 0x4a4030, 2.2, 0.45, 6.7), box(0.6, 0.5, 0.6, 0x3a3428, 3.6, 0.25, 6.5)); gardenLight.position.set(2.2, 2.0, 6.6); g.add(gardenLight);
  // the hidden room behind the cupboard
  hiddenRoom.add(box(3.5, 2.8, 0.2, st, 5.25, 1.4, -6.6), box(2.6, 2.8, 0.2, st, 3.5, 1.4, -5.3).rotateY(Math.PI / 2), box(2.6, 2.8, 0.2, st, 7, 1.4, -5.3).rotateY(Math.PI / 2), mesh(new THREE.PlaneGeometry(3.5, 2.6), fl, 5.25, 0.001, -5.3).rotateX(-Math.PI / 2), box(3.2, 0.06, 0.4, wood, 5.25, 1.0, -6.3), box(3.2, 0.06, 0.4, wood, 5.25, 1.7, -6.3));
  for (let i = 0; i < 6; i++) hiddenRoom.add(box(0.4, 0.5, 0.03, 0x1e1612, 3.95 + i * 0.52, 2.25, -6.48), plane(0.32, 0.42, L([0x8a7a70, 0x7a8478, 0x84786a][i % 3]), 3.95 + i * 0.52, 2.25, -6.46));
  [[4.1, 0xc88a3a, 1], [4.7, 0xe03a3a, 0], [5.3, 0x7a5ad0, 2], [5.9, 0xff8fc0, 3], [6.4, 0x3a70c0, 0]].forEach(([x, c, k]) => hiddenRoom.add(k === 0 ? sph(0.13, c, x, 1.17, -6.3, 6, 5) : k === 1 ? G(sph(0.12, c, x, 1.15, -6.3, 6, 5), sph(0.09, c, x, 1.33, -6.3, 6, 5)) : box(0.14, k === 3 ? 0.05 : 0.22, 0.2, c, x, 1.06 + (k === 3 ? 0 : 0.1), -6.3)));
  [[4.3, 0xd9b84a], [5.0, 0x50a070], [5.7, 0xc05050], [6.3, 0x9060c0]].forEach(([x, c]) => hiddenRoom.add(box(0.2, 0.12, 0.24, c, x, 1.79, -6.3)));
  g.add(hiddenRoom);
}
// ---------- moods ----------
const skyT = (stops) => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); stops.forEach(([p, col]) => g.addColorStop(p, col)); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const MOODS = {
  day: { bg: skyT([[0, '#1668e0'], [0.45, '#3f9cf5'], [0.7, '#9fd8ff']]), fog: [0xbfe6ff, 40, 220], amb: [0xffffff, 1.9], sun: [0xfff2dc, 2.3, [6, 14, 9]], lamps: 0, win: 0x9fe0ff, cloud: 0xffffff },
  grey: { bg: skyT([[0, '#3a5fd0'], [0.45, '#7a8ff0'], [0.72, '#f0b8d8']]), fog: [0xe8c0e0, 36, 200], amb: [0xf0e8ff, 1.75], sun: [0xffe0c8, 2.0, [4, 12, 9]], lamps: 0, win: 0x9fe0ff, cloud: 0xffd0e8 },
  evening: { bg: skyT([[0, '#4a2fb0'], [0.35, '#d0459a'], [0.58, '#ff7a59'], [0.75, '#ffc247']]), fog: [0xff9a6a, 34, 190], amb: [0xffc8b0, 1.55], sun: [0xff9a5a, 2.2, [-12, 6, 9]], lamps: 0.7, win: 0xffe08a, cloud: 0xffa8c0 },
  morning: { bg: skyT([[0, '#3f8ae8'], [0.5, '#9fd0ff'], [0.75, '#ffe0c0']]), fog: [0xffe6d0, 36, 200], amb: [0xffffff, 1.8], sun: [0xfff0d0, 2.0, [10, 10, 9]], lamps: 0, win: 0x9fe0ff, cloud: 0xfff0e0 },
  night: { bg: skyT([[0, '#0a0d4a'], [0.45, '#2a1f8a'], [0.75, '#6a2fa0']]), fog: [0x2a1f7a, 26, 170], amb: [0x8a96ff, 1.55], sun: [0xa8b8ff, 1.5, [-8, 14, 6]], lamps: 1, win: 0xffd060, cloud: 0x5a4fc0 },
  inNight: { bg: 0x120a3a, fog: [0x160d44, 8, 36], amb: [0x8a80f0, 1.2], sun: [0x7a8aff, 0.5, [4, 8, 4]], lamps: 0, win: 0xffd060, cloud: 0 },
  inDay: { bg: 0x8a5fc0, fog: [0x8a5fc0, 16, 60], amb: [0xffffff, 2.0], sun: [0xfff0d8, 0.9, [4, 8, 6]], lamps: 0, win: 0x9fe0ff, cloud: 0 },
  basNight: { bg: 0x0a0c30, fog: [0x0c0e36, 6, 30], amb: [0x7a8af0, 1.05], sun: [0x000000, 0, [0, 1, 0]], lamps: 0, win: 0xffd060, cloud: 0 },
};
let NOW = 0;
const fillL = new THREE.PointLight(0xffe0c0, 0, 7, 1.4); scene.add(fillL);
const fill = (x, y, z, i, c = 0x8fa6d8) => { fillL.position.set(x, y, z); fillL.intensity = i; fillL.color.set(c); };
function mood(k) {
  const m = MOODS[k]; scene.background = m.bg.isTexture ? m.bg : new THREE.Color(m.bg); scene.fog = new THREE.Fog(...m.fog);
  amb.color.set(m.amb[0]); amb.intensity = m.amb[1]; sun.color.set(m.sun[0]); sun.intensity = m.sun[1]; sun.position.set(...m.sun[2]); sun.target.position.set(0, 0, 0);
  lampGlow.forEach(g => g.material.opacity = m.lamps * 0.8); houseWin.forEach(w => w.color.set(m.win)); moon.visible = stars.visible = k === 'night'; cloudMats.forEach(c => { c.color.set(m.cloud || 0xffffff); c.visible = !!m.cloud; });
}
function cam(px, py, pz, tx, ty, tz, fov = 45, sway = 1) {
  const s = 0.012 * sway; camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(px + Math.sin(NOW * 0.7) * s, py + Math.sin(NOW * 0.9 + 1) * s, pz);
  camera.up.set(0, 1, 0); camera.lookAt(tx + Math.sin(NOW * 0.5 + 2) * s * 2, ty + Math.cos(NOW * 0.6) * s * 2, tz);
}
const camL = (a, b, u, f = smooth) => { const k = f(u); cam(...a.map((v, i) => lerp(v, b[i] ?? v, k))); };
const HIDE = -80;
function setCurt(i, gap) { curtainL[i].position.x = [-4.3, 0, 4.3][i] - gap / 2 - 0.31; curtainR[i].position.x = [-4.3, 0, 4.3][i] + gap / 2 + 0.31; }
function gateOpen(a) { mGate[0].rotation.y = -a; mGate[1].rotation.y = a; }
function reset() {
  people.forEach(p => { p.visible = false; p.userData.want = null; p.userData.yaw = 0; });
  gateOpen(0); mDoor.rotation.y = 0; [0, 1, 2].forEach(i => setCurt(i, 0.34)); Object.values(MW).forEach(m => m.color.set(0x140f3a));
  tape.visible = false; boxes.visible = false; car.visible = true; car.position.set(8.6, 0, 6.6); car.rotation.y = 0; police.visible = false; policeLights.forEach(([m, g]) => g.material.opacity = 0);
  for (const o of [ball, doll, sandal]) o.position.set(0, HIDE, 0); doll.rotation.set(0, 0, 0); teddy.visible = false; torchOn(false); torch.visible = false; beam.visible = false;
  fillL.intensity = 0; bedLamp.intensity = 0; tvLight.intensity = 0; winLight.intensity = 0; bulb.intensity = 0; bulbMesh.material.color.set(0x3a3020); gardenLight.intensity = 0; phone.visible = false;
  bedCurt[0].position.x = 3 - 0.95; bedCurt[1].position.x = 3 + 0.95; bedCurt.forEach(c => c.scale.x = 1);
  evidence.visible = true; cell.visible = true; blankWall.visible = false; hiddenWall.visible = true; cupboard.position.set(5.2, 0, -2.5); cellGate.rotation.y = 0; keyring.visible = true; keyring.position.set(5.5, 0.91, 3.5);
  bDoor.rotation.y = 0; drawer.position.z = 10.55; smallKey.visible = true; clockPend.rotation.x = 0.25 * Math.sin(NOW * Math.PI);
}
// police car lights
function flash(on) { policeLights.forEach(([m, g, c], i) => { const k = on && Math.sin(NOW * 9 + i * Math.PI) > 0 ? 1 : 0; g.material.opacity = k * 0.9; m.color.set(k ? c : 0x30303a); }); }
function policeAt(x, z = -1.7, lights = true) { police.visible = true; police.position.set(x, 0, z); police.rotation.y = Math.PI / 2; flash(lights); }
// Mr. Wilson standing behind an upstairs window (i: 0 hall, 1 middle, 2 bedroom)
function inWindow(i, o = {}) { put(wilson, [-4.3, 0, 4.3][i] + (o.dx ?? 0), -10.95, 0, 4.72); pose(wilson, { face: o.face ?? 'wneutral', blob: false, armR: o.armR, headPitch: o.pitch ?? 0.12 }); setCurt(i, o.gap ?? 0.62); }
const lit = (k, c = 0xffd040) => MW[k].color.set(c);
const P = { idle: {}, phone: { armR: [-0.5, 0.25, -2.3] }, point: (a = -1.45) => ({ armR: [a, 0, 0] }), shh: { armR: [-1.05, -0.28, -2.05] }, carry: { armR: [-0.9, 0, -0.5], armL: [-0.9, 0, -0.5] }, torch: { armR: [-0.75, 0, -0.75] }, call: { armR: [-1.2, 0.3, -1.9], armL: [-1.2, 0.3, -1.9] }, back: { armR: [0.5, -0.15, 0.4], armL: [0.5, -0.15, 0.4] } };
const withTorch = (on = true, k = 1) => { torchOn(on, k); return P.torch; };
// Alex at his bedroom window, seen over his shoulder or as his zoomed-in point of view
function atWindow(p = {}) { put(alex, 3.35, 9.85, Math.PI, 3.2); pose(alex, { face: p.face ?? 'neutral', ...p }); }
const overShoulder = (u, fov = 34) => camL([2.3, 4.95, 12.3, 4.2, 5.7, -10, fov], [2.55, 4.95, 11.5, 4.2, 5.8, -10, fov - 6], u);
const pov = (tx, ty, f0, f1, u, tz = -10.4) => camL([3.4, 4.85, 8.5, tx, ty, tz, f0], [3.4, 4.85, 8.5, tx, ty, tz, f1], u);
const stairY = (x) => clamp((-(x + 0.05) / 0.48) * 0.3 + 0.3, 0, 2.85);
const gx = (f) => f.position.x, gz = (f) => f.position.z;
const BXY = (x, z) => [BX + x, BZ + z], IXY = (x, z) => [IX + x, IZ + z];
const putB = (f, x, z, ry, y = 0) => put(f, BX + x, BZ + z, ry, y), putI = (f, x, z, ry, y = 0) => put(f, IX + x, IZ + z, ry, y);
const camB = (a, b, u) => camL([a[0] + BX, a[1], a[2] + BZ, a[3] + BX, a[4], a[5] + BZ, a[6] ?? 50], [b[0] + BX, b[1], b[2] + BZ, b[3] + BX, b[4], b[5] + BZ, b[6] ?? a[6] ?? 50], u);
const camI = (a, b, u) => camL([a[0] + IX, a[1], a[2] + IZ, a[3] + IX, a[4], a[5] + IZ, a[6] ?? 50], [b[0] + IX, b[1], b[2] + IZ, b[3] + IX, b[4], b[5] + IZ, b[6] ?? a[6] ?? 50], u);
const family = (t, faceCam) => { [[dad, 5.6, 6.5], [mom, 4.5, 6.9], [alex, 3.4, 6.5], [lily, 2.5, 6.9]].forEach(([f, x, z], i) => { put(f, x, z, faceCam ? Math.PI + (3.8 - x) * 0.12 : 0.1 * (i - 1.5)); pose(f, { face: f === alex ? 'neutral' : 'smile', headYaw: 0.1 * Math.sin(t * 0.8 + i) }); }); };
const copsPorch = (t) => { put(cop1, -0.95, -8.5, Math.PI); put(cop2, 1.5, -8.3, Math.PI); pose(cop1, {}); pose(cop2, { headYaw: 0.3 * Math.sin(t * 0.5) }); };
const wilsonDoor = (face = 'wpolite', p = {}) => { mDoor.rotation.y = -1.9; put(wilson, 0, -9.7, 0, 0.3); pose(wilson, { face, ...p }); };

// ---------- the shots: one function per story beat (t = seconds into the beat, d = its length, l(i)/e(i) = start/end of line i) ----------
const SHOT = {
  title(t, d) { mood('night'); lit('lit', 0xc89040); lit('bed', 0x1a1410); inWindow(2, { gap: 0.5 }); camL([5, 0.9, 3.5, 1, 5.2, -11, 50], [3.5, 1.1, -1.5, 1.5, 5.6, -11, 50], t / d); },
  family(t, d, l) { mood('day'); boxes.visible = true; const c = t < l(1); family(t, !c);
    if (c) camL([-6, 1.9, -1, 4, 2.2, 9, 48], [-3, 1.8, 0.5, 4, 2.2, 9, 48], t / l(1)); else camL([6.4, 1.45, 3.9, 5.4, 1.4, 6.6, 30], [1.9, 1.2, 4.2, 2.6, 1.0, 6.9, 30], seg(t, l(1) + 0.6, d - 0.8)); },
  house(t, d) { mood('day'); boxes.visible = true; family(t, false); camL([-1, 1.6, -2.5, 0, 3.2, 12, 50], [-1, 4.6, -3.5, 0, 4.2, 12, 50], t / d); },
  mansion(t, d, l) { mood('grey'); const a = l(1), k = Math.min(4, (t - a) / ((d - a) / 5) | 0);
    if (t < a) camL([0, 1.7, 5, 0, 4.4, -11, 52], [0, 1.6, 0.5, 0, 4.8, -11, 52], t / a);
    else [() => camL([-3.2, 1.7, -6.6, -4.3, 2.2, -10, 30], [-3.6, 1.9, -7.4, -4.3, 2.3, -10, 30], 0.5), () => camL([1.8, 1.0, -3.6, 0, 1.2, -5.6, 40], [0.6, 1.1, -3.9, 0, 1.3, -5.6, 40], seg(t, a, d)), () => camL([-2.5, 0.7, -5.9, -5.2, 4.2, -7.8, 50], [-2.5, 0.7, -5.9, -5.2, 4.6, -7.8, 50], 0.5), () => camL([1, 1.6, -4, 2.4, 6.1, -10.2, 28], [1.4, 1.6, -4, 4.3, 6.1, -10.2, 22], seg(t, a + (d - a) * 0.6, d)), () => camL([1, 1.6, -4, 2.4, 6.1, -10.2, 28], [1.4, 1.6, -4, 4.3, 6.1, -10.2, 22], seg(t, a + (d - a) * 0.6, d))][k](); },
  neighbour(t, d, l) { mood('evening'); boxes.visible = true;
    walk(dad, [[7.6, 5.2], [3, 6.8], [-1.6, 8.2]], (t % 9) / 9, t, P.carry); walk(alex, [[7.4, 4.4], [6.2, 5.9]], seg(t, 1, 4), t, P.carry); put(mom, 6.7, 3.9, -0.6); pose(mom, { lean: 0.25, armR: [-0.7, 0, -0.4] }); put(lily, 4.6, 6.3, 2.6); pose(lily, { face: 'smile' });
    const u = seg(t, 0.5, l(1) - 0.2); walk(gramps, [[-9, 4.8], [4.4, 4.8]], u, t, {}, 6); if (u >= 1) { lookAt(gramps, 6.2, 5.9); pose(gramps, { face: 'smile', armR: [-2.6 + 0.3 * Math.sin(t * 7), 0.4, -0.5] }); }
    camL([11, 1.9, 0.8, 4.5, 1.3, 5.6, 46], [9.5, 1.8, 1.6, 4.5, 1.3, 5.4, 46], t / d); },
  warning(t, d, l) { mood('evening'); boxes.visible = true; const g2 = t > l(0) + 1.2; put(gramps, 4.4, 4.8, 0); if (g2) lookAt(gramps, 1, -6); else lookAt(gramps, 5.6, 6.3); pose(gramps, g2 ? { ...P.point(-1.5), headYaw: t > l(1) ? 2.6 : 0 } : {});
    put(dad, 5.6, 6.3, Math.PI + 0.2); pose(dad, {}); put(mom, 6.7, 6.6, Math.PI + 0.35); pose(mom, {}); put(alex, 4.6, 6.9, Math.PI - 0.1); pose(alex, {}); put(lily, 3.7, 7.0, Math.PI - 0.2); pose(lily, {});
    camL([6.6, 2.0, 9.2, 3.6, 1.9, 0, 44], [6.0, 1.9, 8.6, 3.2, 2.2, 0, 44], t / d); },
  why(t, d) { mood('evening'); put(dad, 5.6, 6.3, Math.PI + 0.2); pose(dad, { headYaw: 0.15 * Math.sin(t) }); put(mom, 6.7, 6.6, Math.PI + 0.35); pose(mom, {}); put(gramps, 4.4, 4.8, 0.4); pose(gramps, {}); camL([4.9, 1.75, 4.3, 5.7, 1.68, 6.3, 32], [5.0, 1.75, 4.6, 5.7, 1.68, 6.3, 32], t / d); },
  wilsonname(t, d, l) { mood('evening'); const a = l(1), b = l(2);
    if (t >= a && t < b) { lit('bed', 0x1a1410); inWindow(2, { gap: 0.5 }); camL([2, 1.7, 2, 4.3, 6.1, -10.3, 26], [2.6, 1.7, 0, 4.3, 6.1, -10.3, 13], seg(t, a, b)); }
    else { put(gramps, 4.4, 4.8, 0); lookAt(gramps, t < a ? 1 : 5.6, t < a ? -6 : 6.3); pose(gramps, { headYaw: 0.1 * Math.sin(t * 2) }); put(dad, 5.6, 6.3, Math.PI + 0.2); pose(dad, {}); t < a ? camL([6.4, 1.8, 7.6, 3.4, 2.4, -2, 40], [6.4, 1.8, 7.6, 3.2, 2.6, -2, 40], t / a) : camL([5.2, 1.6, 6.0, 4.4, 1.55, 4.8, 28], [5.0, 1.6, 5.8, 4.4, 1.55, 4.8, 28], seg(t, b, d)); } },
  days(t, d, l) { mood(t < l(1) ? 'day' : 'grey'); walk(alex, [[-2, 8.6], [-2, 6.2], [1.5, 6.4]], seg(t, 0.5, l(1)), t); if (t > l(1)) { lookAt(alex, 2, -10); pose(alex, { headPitch: -0.2 }); }
    t < l(1) ? camL([-8, 2.4, 2.5, 0, 1.6, 8, 46], [-7, 2.4, 3, 0, 1.6, 8, 46], t / l(1)) : camL([3.4, 1.5, 9.2, 0.8, 2.6, -4, 40], [3.0, 1.5, 8.6, 0.8, 3.0, -4, 40], seg(t, l(1), d)); },
  window1(t, d, l) { mood('grey'); const gone = seg(t, d - 1.6, d - 0.9); atWindow(); inWindow(2, { dx: gone * 1.3, gap: 0.62 - gone * 0.2 });
    t < l(0) + 3.4 ? overShoulder(t / (l(0) + 3.4)) : pov(4.3, 6.05, 16, 9.5, seg(t, l(0) + 3.4, d)); },
  window2(t, d, l) { mood('grey'); const a = l(1); put(lily, 1.6, 7.0, 2.2); pose(lily, { sit: 1, face: 'smile', armR: [-0.9, 0, -0.6] }); doll.position.set(1.9, 0.0, 6.7); ball.position.set(2.3, 0.16, 7.3);
    if (t < a) { camL([4.3, 6.4, -9.85, 1.9, 0.4, 7, 30], [4.3, 6.4, -9.85, 1.7, 0.4, 7, 22], t / a); setCurt(2, 0.7); }
    else { const k = seg(t, a + 2.2, a + 2.7); put(alex, 3.6, 7.6, Math.PI); pose(alex, { headPitch: -0.3 }); inWindow(2, { dx: k * 1.4, gap: 0.62 - k * 0.25 }); t < a + 1.6 ? camL([5.4, 1.5, 8.7, 2.2, 2.4, -2, 40], [5.2, 1.5, 8.4, 2.2, 2.8, -2, 40], seg(t, a, a + 1.6)) : camL([3.6, 1.5, 7.2, 4.3, 6.05, -10.3, 12, 0.3], [3.6, 1.5, 7.2, 4.3, 6.05, -10.3, 11, 0.3], seg(t, a + 1.6, d)); } },
  gate(t, d, l) { mood('grey'); const a = l(1); gateOpen(0.9); put(wilson, 0, -5.85, 0); pose(wilson, { face: t > a + 0.4 ? 'wgrin' : 'wpolite', lean: 0.12, headYaw: 0.08 });
    const th = (t * 0.8) % 2, u = th < 1 ? th : 2 - th; put(alex, 4.0, 7.3, -1.5); put(lily, 1.4, 7.5, 1.5); pose(alex, { armR: th < 1 ? [-1.2 * (1 - u), 0, -0.6] : undefined, headYaw: t > l(0) + 5 ? -1.2 : 0 }); pose(lily, { face: 'smile', armR: [-1.0, 0, -0.5], armL: [-1.0, 0, -0.5] }); ball.position.set(lerp(3.7, 1.7, u), 0.9 + Math.sin(u * Math.PI) * 0.7, 7.4);
    if (t < l(0) + 5) camL([6.5, 1.5, 10, 2.5, 1.0, 7, 44], [6.2, 1.5, 9.6, 2.5, 1.0, 7, 44], t / 5); else if (t < a) camL([5.6, 1.6, 9, 0.6, 1.3, -5.8, 30], [5.2, 1.6, 8.6, 0.2, 1.5, -5.8, 18], seg(t, l(0) + 5, a)); else camL([0.9, 1.75, -3.3, 0, 1.92, -5.85, 26], [0.5, 1.8, -3.9, 0, 1.95, -5.85, 20], seg(t, a, d)); },
  inside(t, d, l) { mood('grey'); const a = l(1), u = seg(t, 0.3, a); walk(alex, [[4.0, 7.3], [1.6, 7.6], [-2, 8.7]], u, t, { armL: [-0.6, 0.5, -0.4] }, 9); walk(lily, [[1.4, 7.5], [1.0, 7.8], [-2, 8.95]], seg(t, 0.8, a + 0.3), t, {}, 11); ball.position.set(2.6, 0.16, 7.2);
    const c = seg(t, a + 0.8, d - 0.8); gateOpen(0.9 * (1 - smooth(c))); put(wilson, 0, -5.85 - c * 0.6, 0); pose(wilson, { face: 'wgrin', lean: 0.1 });
    t < a ? camL([5.5, 1.6, 5.2, 0, 1.2, 8.4, 44], [4.5, 1.6, 5.0, -1, 1.2, 8.6, 44], t / a) : camL([0.8, 1.5, -2.2, 0, 1.5, -5.8, 34], [0.8, 1.5, -2.6, 0, 1.6, -5.8, 30], seg(t, a, d)); },
  call(t, d, l) { mood('day'); const a = l(1); if (t < a) { put(dad, 4.8, 7, Math.PI + 0.3); pose(dad, { ...P.phone, headYaw: 0.2 * Math.sin(t * 1.3) }); put(mom, 5.9, 7.3, Math.PI + 0.9); pose(mom, {}); camL([3.0, 1.7, 4.4, 5.1, 1.6, 7.1, 36], [3.4, 1.7, 4.8, 5.1, 1.6, 7.1, 36], t / a); }
    else { const u = seg(t, a + 1.5, d); car.position.set(8.6 + smooth(seg(u, 0.3, 1)) * 40, 0, lerp(6.6, 1.6, smooth(seg(u, 0, 0.3)))); car.rotation.y = -smooth(seg(u, 0.15, 0.4)) * Math.PI / 2 + Math.PI; put(alex, -1.2, 6.2, 1.4); pose(alex, { armR: [-2.6 + 0.3 * Math.sin(t * 7), 0.4, -0.4] }); put(lily, -0.4, 6.4, 1.4); pose(lily, { face: 'smile', armR: [-2.6 + 0.3 * Math.sin(t * 8), 0.4, -0.4] }); camL([-5, 1.8, 3.2, 6, 1.2, 4, 46], [-5, 1.8, 3.2, 14, 1.2, 2, 46], u); } },
  mother(t, d, l) { mood('day'); put(mom, -1.0, 7.2, -2.0); pose(mom, { face: 'neutral', armR: t > l(1) && t < l(2) ? [-1.1 + 0.15 * Math.sin(t * 6), 0, -0.9] : undefined, lean: 0.1 }); put(alex, -2.2, 7.7, 1.1); pose(alex, { headPitch: t > l(2) ? 0.2 * Math.abs(Math.sin(t * 5)) : 0 }); put(lily, -2.6, 6.9, 0.9); pose(lily, { face: 'smile' });
    t < l(2) ? camL([-3.6, 1.6, 8.9, -1.0, 1.5, 7.2, 34], [-3.3, 1.6, 8.6, -1.0, 1.5, 7.2, 34], t / l(2)) : camL([-0.2, 1.6, 6.2, -2.2, 1.45, 7.7, 30], [-0.4, 1.6, 6.4, -2.2, 1.45, 7.7, 30], seg(t, l(2), d)); },
  dolls(t, d) { const a = d * 0.55; if (t < a) { mood('grey'); car.visible = false; put(lily, 1.6, 7.0, 2.6); pose(lily, { sit: 1, face: 'smile', armR: [-0.9 + 0.2 * Math.sin(t * 3), 0, -0.6] }); doll.position.set(1.95, 0.02 + 0.08 * Math.abs(Math.sin(t * 3)), 6.65); ball.position.set(2.5, 0.16, 6.9); camL([3.6, 0.9, 5.0, 1.7, 0.5, 6.9, 40], [3.2, 0.9, 5.4, 1.7, 0.5, 6.9, 40], t / a); }
    else { mood('grey'); put(alex, 3.6, 12.6, Math.PI / 2, 3.2); pose(alex, { sit: 0.62, blob: false }); tvLight.intensity = 5 + 3 * Math.sin(t * 13) * Math.sin(t * 5.3); camL([2.2, 4.5, 10.4, 4.6, 4.25, 12.6, 46], [2.5, 4.5, 10.6, 4.6, 4.25, 12.6, 46], seg(t, a, d)); } },
  ball(t, d, l) { mood('grey'); car.visible = false; const a = l(1), u = seg(t, 0.4, a - 0.6), pts = [[2.5, 6.9], [-1.4, 6.2], [-2, 5.2], [0.5, -5.0]]; let k = u * 3, i = Math.min(2, k | 0), f = k - i; ball.position.set(lerp(pts[i][0], pts[i + 1][0], f), 0.16, lerp(pts[i][1], pts[i + 1][1], f)); ball.rotation.x = t * 6; doll.position.set(1.95, 0.02, 6.65);
    const lu = seg(t, a - 2.5, d - 1.2); if (lu <= 0) { put(lily, 1.6, 7.0, 2.6); pose(lily, { sit: t < 1.2 ? 1 : 0, face: 'neutral', headYaw: 0.4 }); } else walk(lily, [[1.6, 7.0], [-2, 6.0], [-2, 4.8], [0.5, -4.2]], lu, t, { face: 'neutral' }, 11);
    const g = seg(t, a + 1.6, a + 3.2); gateOpen(smooth(g) * 1.0); if (g > 0.2) { put(wilson, 0, -6.1 + 0.25 * g, 0); pose(wilson, { face: 'wpolite', lean: 0.1 }); }
    t < a ? camL([-6, 1.2, 2.6, 0, 0.3, 2.2, 44], [-4, 1.0, -1.5, 0.5, 0.3, -4.6, 44], u) : camL([3.6, 1.3, -1.6, 0.3, 1.1, -5.0, 40], [3.0, 1.3, -2.4, 0.3, 1.2, -5.2, 40], seg(t, a, d)); },
  _gateTalk(t, wp = {}, lp = {}, lz = -4.2) { mood('grey'); car.visible = false; gateOpen(1.0); put(wilson, 0, -5.85, 0); pose(wilson, { face: 'wpolite', lean: 0.2, headPitch: 0.25, ...wp }); put(lily, 0.5, lz, Math.PI + 0.25); pose(lily, { face: 'neutral', headPitch: -0.35, ...lp }); ball.position.set(0.75, 0.16, -4.75); doll.position.set(1.95, 0.02, 6.65); },
  hello(t, d, l) { SHOT._gateTalk(t); t < l(1) ? camL([2.9, 1.25, -3.7, 0.2, 1.25, -5.2, 40], [2.6, 1.25, -3.9, 0.2, 1.25, -5.2, 40], t / l(1)) : camL([-0.95, 1.3, -6.7, 0.5, 0.92, -4.2, 28], [-0.9, 1.25, -6.6, 0.5, 0.92, -4.2, 26], seg(t, l(1), d)); },
  chocolates(t, d) { SHOT._gateTalk(t, { armR: [-0.5, 0.2, -0.9] }); camL([0.55, 0.95, -4.3, 0, 1.92, -5.85, 34], [0.5, 0.9, -4.6, 0, 1.95, -5.85, 30], t / d); },
  nothanks(t, d, l) { SHOT._gateTalk(t, {}, { headYaw: t < l(1) ? 0.5 * Math.sin(t * 5) : 0 }); camL([-0.95, 1.3, -6.7, 0.5, 0.92, -4.2, 26], [-0.9, 1.25, -6.6, 0.5, 0.92, -4.2, 24], t / d); },
  teddy(t, d, l) { const a = l(2); SHOT._gateTalk(t, t > l(1) + 3 ? { armR: [-1.1, 0, -0.5], face: 'wgrin' } : {}, { face: t > a ? 'smile' : 'neutral' }, -4.2 - smooth(seg(t, a + 1.5, d)) * 0.9); teddy.visible = t > l(1) + 3;
    t < a ? camL([0.6, 1.0, -4.5, 0, 1.9, -5.85, 34], [0.9, 1.1, -4.4, -0.2, 1.5, -5.6, 30], seg(t, 0, a)) : camL([3.0, 1.2, -3.2, 0.2, 1.2, -5.3, 36], [2.4, 1.2, -3.6, 0.2, 1.2, -5.3, 32], seg(t, a, d)); },
  grab(t, d, l) { mood('grey'); car.visible = false; const u = seg(t, l(0) + 1.0, l(1) + 1.2), sl = seg(t, d - 1.5, d - 1.25); gateOpen(1.0); doll.position.set(1.95, 0.02, 6.65); ball.position.set(0.75, 0.16, -4.75); sandal.position.set(0.45, 0.02, -5.1); sandal.rotation.y = 0.7;
    mDoor.rotation.y = -1.9 * smooth(seg(t, l(0) + 1.5, l(0) + 2.4)) * (1 - sl);
    if (u < 1) { walk(wilson, [[0, -5.85], [0, -7.6], [0, -10.6]], u, t, { face: 'wgrin', armL: [-0.4, 0.5, -0.3], y: u > 0.4 ? 0.3 : 0 }, 10); walk(lily, [[0.5, -5.1], [0.4, -7.3], [0.3, -10.3]], u, t, { face: 'scared', armR: [-1.6, 0.3, 0], y: u > 0.4 ? 0.3 : 0 }, 16); }
    camL([-5.5, 1.3, 3.2, 0, 1.6, -8, 40], [-5.0, 1.3, 2.4, 0, 1.7, -8.6, 34], t / d); camera.rotation.z += 0.06; },
  search(t, d, l) { mood('grey'); car.visible = false; doll.position.set(1.2, 0.02, 3.9); doll.rotation.z = 1.5; sandal.position.set(0.45, 0.02, -5.1); const a = l(1), b = l(2);
    if (t < b) { walk(alex, [[-2, 8.7], [-2, 6.6], [1.8, 7.0]], seg(t, 0.4, a), t, {}, 9); if (t > a) pose(alex, { ...P.call, headYaw: Math.sin(t * 1.2) * 0.8, face: 'scared' }); camL([4.6, 1.6, 4.6, 0, 1.3, 7.4, 44], [4.0, 1.6, 5.0, 1, 1.3, 7.2, 40], t / b); }
    else { walk(alex, [[1.8, 7.0], [-2, 6.0], [-2, 4.6], [-9, 4.6]], seg(t, b, d), t, { face: 'scared', headYaw: 0.6 * Math.sin(t * 2) }, 11); camL([-14, 3.2, 1.0, -2, 1.2, 4.5, 46], [-14, 3.2, 1.0, -4, 1.2, 4.5, 46], seg(t, b, d)); } },
  doll(t, d, l) { mood('grey'); car.visible = false; doll.position.set(1.2, 0.02, 3.9); doll.rotation.z = 1.5; sandal.position.set(0.45, 0.02, -5.1); sandal.rotation.y = 0.7; const a = l(1);
    if (t < a) { walk(alex, [[-5, 4.6], [0.6, 4.3]], seg(t, 0.2, 2.6), t, { face: 'scared' }, 10); if (t > 2.6) { lookAt(alex, 1.2, 3.9); pose(alex, { crouch: smooth(seg(t, 2.6, 3.4)), face: 'scared', armR: [-0.9, 0, -0.3] }); } camL([2.6, 0.35, 2.6, 1.1, 0.25, 4.0, 38], [2.2, 0.4, 2.9, 1.1, 0.3, 4.0, 34], t / a); }
    else { walk(alex, [[0.6, 4.3], [0.5, -3.9]], seg(t, a, a + 3), t, { face: 'scared' }, 10); camL([1.6, 0.25, -3.8, 0.3, 0.5, -5.4, 42], [1.3, 0.22, -4.1, 0.2, 2.2, -8, 42], seg(t, a + 1, d)); } },
  knock(t, d, l) { mood('grey'); car.visible = false; sandal.position.set(0.45, 0.02, -5.1); gateOpen(1.0); const a = l(1), b = l(2), u = seg(t, l(0) + 2.4, a - 0.6);
    walk(alex, [[0.5, -3.9], [0, -6], [0.25, -9.25]], u, t, { face: 'scared', y: u > 0.75 ? 0.3 : 0 }, 14); if (u >= 1) { lookAt(alex, 0.2, -10); const kn = t < a || t > b + 1.2; pose(alex, { face: 'scared', armR: kn ? [-1.5 + 0.35 * Math.sin(t * 16), 0, -1.0] : P.call.armR, armL: kn ? undefined : P.call.armL }); }
    if (t < a) camL([2.4, 1.0, -4.6, 0, 1.6, -8.5, 44], [1.8, 1.1, -6.2, 0, 1.6, -9.6, 44], seg(t, 0, a)); else if (t < b) camL([1.2, 1.7, -8.3, 0.2, 1.55, -9.4, 34], [1.1, 1.7, -8.2, 0.2, 1.55, -9.4, 32], seg(t, a, b)); else camL([0.6, 0.6, -5.0, 0.5, 5.4, -10.5, 50], [0.6, 0.5, -4.6, 0.5, 6.4, -10.5, 50], seg(t, b, d)); },
  police1(t, d, l) { mood('grey'); car.visible = false; sandal.position.set(0.45, 0.02, -5.1); gateOpen(1.0); const u = seg(t, 0.3, l(1));
    walk(alex, [[0.25, -9.25], [0, -5.6], [-1.5, 4.6], [-2, 7.6]], u, t, { face: 'scared' }, 15); if (u >= 1) { lookAt(alex, 0, -8); pose(alex, { ...P.phone, face: 'scared' }); }
    t < l(1) ? camL([-7, 2.0, 0, -1, 1.2, -1, 46], [-7, 2.0, 0, -2, 1.3, 6, 46], u) : camL([-3.8, 1.55, 6.2, -2, 1.42, 7.6, 30], [-3.6, 1.55, 6.4, -2, 1.42, 7.6, 30], seg(t, l(1), d)); },
  arrive(t, d, l) { mood('grey'); car.visible = false; sandal.position.set(0.45, 0.02, -5.1); gateOpen(1.0); const u = smooth(seg(t, 0, l(1) - 0.5)); policeAt(lerp(46, 3.2, u));
    put(alex, 0.6, 3.6, 1.2); if (t > l(1)) { put(cop1, 1.5, 0.6, 0.2); put(cop2, 2.6, 1.0, -0.3); pose(cop1, {}); pose(cop2, {}); lookAt(alex, 0, -8); pose(alex, { ...P.point(-1.5), face: 'scared', headYaw: 2.4 }); lookAt(cop1, 0.6, 3.6); lookAt(cop2, 0.6, 3.6); } else pose(alex, { face: 'scared' });
    t < l(1) ? camL([-6, 1.5, 4.8, 10, 1.2, -1.5, 46], [-5, 1.5, 4.8, 3, 1.2, -1.5, 46], u) : camL([3.2, 1.7, 5.6, 1, 1.5, 1.5, 40], [2.8, 1.7, 5.2, 0.6, 1.7, 0, 40], seg(t, l(1), d)); },
  officersdoor(t, d, l) { mood('grey'); car.visible = false; policeAt(3.2); gateOpen(1.0); put(alex, 0.9, -4.6, Math.PI); pose(alex, { face: 'scared' }); const u = seg(t, 0.2, l(0) + 3.6), a = l(1);
    walk(cop1, [[1.5, 0.6], [0, -5.6], [-0.95, -8.5]], u, t, { y: u > 0.8 ? 0.3 : 0 }, 8); walk(cop2, [[2.6, 1.0], [0.3, -4.8], [1.5, -8.3]], seg(t, 0.6, l(0) + 4), t, { y: u > 0.85 ? 0.3 : 0 }, 8); if (u >= 1) { lookAt(cop1, 0, -10); pose(cop1, { armR: t < a ? [-1.5 + 0.3 * Math.sin(t * 15), 0, -1.0] : undefined }); }
    const o = smooth(seg(t, a + 1.2, a + 2.4)); mDoor.rotation.y = -1.9 * o; if (o > 0.3) { put(wilson, 0, -9.7, 0, 0.3); pose(wilson, { face: 'wpolite', armR: [-0.3, 0.3, -0.6], armL: [-0.3, 0.3, -0.6] }); }
    t < a ? camL([4.2, 1.6, -2.8, 0, 1.4, -7.5, 44], [3.2, 1.6, -4.4, 0, 1.6, -9, 44], t / a) : camL([0.3, 2.1, -6.9, 0, 2.05, -9.8, 38], [0.3, 2.1, -7.3, 0, 2.1, -9.8, 32], seg(t, a, d)); },
  _porch(t, w = {}) { mood('grey'); car.visible = false; policeAt(3.2); gateOpen(1.0); copsPorch(t); wilsonDoor('wpolite', w); put(alex, 0.9, -4.6, Math.PI); pose(alex, { face: 'scared' }); },
  ask(t, d, l) { SHOT._porch(t, { headYaw: t > l(2) ? 0.25 * Math.sin(t * 1.5) : 0, armR: t > l(3) ? [-0.5, 0.5, -0.9] : undefined, armL: t > l(3) ? [-0.5, 0.5, -0.9] : undefined });
    t < l(2) ? camL([-1.5, 1.9, -6.3, 0.4, 1.9, -9.4, 42], [-1.3, 1.9, -6.6, 0.4, 1.9, -9.4, 38], t / l(2)) : camL([0.3, 2.1, -7.2, 0, 2.1, -9.8, 32], [0.3, 2.1, -7.5, 0, 2.12, -9.8, 28], seg(t, l(2), d)); },
  welcome(t, d, l) { SHOT._porch(t, { armL: t > l(3) ? [-0.6, 1.1, -0.2] : undefined, twist: t > l(3) ? 0.35 : 0 });
    t < l(2) ? camL([-1.5, 1.9, -6.3, 0.4, 1.9, -9.4, 42], [-1.3, 1.9, -6.6, 0.4, 1.9, -9.4, 38], t / l(2)) : camL([0.3, 2.1, -7.2, 0, 2.1, -9.8, 30], [0.3, 2.1, -7.6, 0, 2.12, -9.8, 26], seg(t, l(2), d)); },
  normal(t, d, l) { mood('inDay'); evidence.visible = false; winLight.intensity = 6; const u = t / d;
    walk(cop1, [IXY(-1, 6.2), IXY(-5, 5.8), IXY(-6.5, 2.2)], seg(t, 0, d * 0.6), t, { headYaw: 0.6 * Math.sin(t) }, 7); walk(cop2, [IXY(1.5, 6.4), IXY(4.5, 5.4), IXY(5.6, 2.6)], seg(t, 1, d * 0.7), t, { headYaw: 0.6 * Math.sin(t + 2) }, 7); putI(wilson, -0.8, 6.9, 2.4); pose(wilson, { face: 'wpolite', armR: [-0.3, 0.3, -0.6], armL: [-0.3, 0.3, -0.6] });
    u < 0.55 ? camI([-1.2, 2.1, 7.0, -6, 1.5, 1.5, 58], [-2.2, 2.0, 6.6, -6.4, 1.5, 0.5, 58], u / 0.55) : camI([0.6, 2.0, 6.9, 5, 1.2, 1.5, 58], [1.4, 2.0, 6.5, 5.6, 1.1, 1.2, 58], seg(u, 0.55, 1)); },
  nothing(t, d, l) { mood('grey'); car.visible = false; policeAt(3.2); gateOpen(1.0); wilsonDoor('wpolite'); const a = l(1), u = seg(t, a, l(2));
    put(alex, 0.9, -4.6, Math.PI); pose(alex, { face: 'scared', armR: t < a ? [-1.0, 0, -0.8] : undefined, armL: t < a ? [-1.0, 0, -0.8] : undefined });
    if (t >= a) { walk(cop1, [[-0.95, -8.5], [0, -7], [2.0, -5.0]], u, t, { y: u < 0.3 ? 0.3 : 0 }, 8); walk(cop2, [[1.5, -8.3], [0.6, -7], [-1.7, -5.2]], seg(t, a + 0.6, l(2)), t, { y: u < 0.3 ? 0.3 : 0 }, 8); if (u >= 1) { lookAt(cop1, 0.9, -4.6); pose(cop1, { armR: [-0.6, 0.3, -0.8] }); } }
    t < a ? camL([1.5, 1.5, -3.2, 0.2, 1.6, -9, 40], [1.3, 1.5, -3.5, 0.2, 1.8, -9.6, 34], t / a) : camL([3.4, 1.6, -3.2, 1.4, 1.5, -4.8, 36], [3.1, 1.6, -3.4, 1.4, 1.5, -4.8, 32], seg(t, a, d)); },
  guilt(t, d, l) { mood('grey'); car.visible = false; policeAt(3.2); gateOpen(1.0); wilsonDoor('wpolite'); put(alex, 0.9, -4.6, Math.PI); pose(alex, { face: 'scared' }); put(cop1, 2.0, -5.0, 0.5); put(cop2, -1.7, -5.2, 0.2); pose(cop1, {}); pose(cop2, {});
    t < l(0) + 3.2 ? camL([0.5, 1.5, -6.4, 0.9, 1.45, -4.6, 26], [0.6, 1.5, -6.2, 0.9, 1.45, -4.6, 22], t / 3.2) : camL([0.4, 1.5, -6.2, 0, 2.0, -9.7, 26], [0.4, 1.5, -6.2, 0, 2.1, -9.7, 18], seg(t, 3.2, d)); },
  smile(t, d, l) { mood('grey'); car.visible = false; policeAt(3.2); gateOpen(1.0); const a = l(1), b = l(2), turn = smooth(seg(t, l(0) + 4.5, a)); wilsonDoor(t > b + 2.0 ? 'wgrin' : t > a ? 'wneutral' : 'wpolite', { headYaw: lerp(0.5, 0.09, turn), headPitch: 0.05 });
    walk(cop1, [[2.0, -5.0], [2.0, -3.5], [2.2, -1.0]], seg(t, 0.5, 5), t, {}, 8); walk(cop2, [[-1.7, -5.2], [0.8, -3.2], [4.4, -0.6]], seg(t, 1, 6), t, {}, 8);
    if (t < l(0) + 4.0) camL([-3.5, 1.6, -3.0, 1.5, 1.2, -2.5, 46], [-3.5, 1.6, -3.0, 2.5, 1.2, -1.5, 46], t / 4); else camL([0.4, 1.5, -6.2, 0, 2.08, -9.7, 20, 0.4], [0.4, 1.5, -6.2, 0, 2.14, -9.7, t > b + 2.0 ? 9 : 12, 0.4], seg(t, l(0) + 4, b + 2.4)); },
  finger(t, d, l) { mood('grey'); car.visible = false; policeAt(3.2); gateOpen(1.0); const a = l(1), k = smooth(seg(t, 0.4, 1.8)); wilsonDoor('wgrin', { headYaw: 0.09, armR: [-1.05 * k, -0.28 * k, -2.05 * k] });
    const back = smooth(seg(t, a, a + 1.6)); put(alex, 0.9, -4.6 + back * 1.5, Math.PI); pose(alex, { face: 'scared', walk: back > 0 && back < 1 ? [-t * 8, 0.6] : undefined });
    t < a ? cam(0.4, 1.5, -6.2, 0, 2.08, -9.7, 9, 0.4) : camL([0.2, 1.5, -6.6, 0.9, 1.45, -4.4, 26], [0.3, 1.5, -6.2, 0.9, 1.45, -3.2, 26], seg(t, a, d)); },
  night(t, d, l) { mood('night'); car.visible = false; lit('lit'); lit('hall'); bedLamp.intensity = 1.6; const a = l(1);
    if (t < a) { put(alex, 2.25, 12.2, Math.PI / 2, 3.42); pose(alex, { sit: 0.62, blob: false, headPitch: 0.3, face: 'scared' }); camL([4.8, 4.6, 10.4, 2.2, 4.3, 12.3, 44], [4.4, 4.6, 10.6, 2.2, 4.3, 12.3, 40], t / a); }
    else { atWindow({ face: 'scared' }); t < a + 3 ? overShoulder(seg(t, a, a + 3)) : pov(0, 5.8, 30, 22, seg(t, a + 3, d)); } },
  lightsout(t, d, l) { mood('night'); car.visible = false; const a = l(1), b = l(2), off = t > a + (b - a) * 0.75; atWindow();
    if (!off) { lit('lit'); lit('hall'); const u = seg(t, l(0) + 3.2, a - 0.4); if (u > 0 && u < 1) { put(wilson, lerp(-5.4, 5.6, u), -11.0, Math.PI / 2, 4.72); pose(wilson, { walk: [t * 5, 0.7], blob: false, face: 'wneutral' }); } if (u > 0.82) lit('bed'); if (u >= 1) { lit('lit', 0x140f3a); lit('hall', 0x140f3a); } [0, 1, 2].forEach(i => setCurt(i, 0.9)); pov(0, 6.0, 26, 24, t / a); }
    else if (t < b + 4) pov(2.5, 6.0, 24, 20, seg(t, a, b + 4)); else { lit('bed', 0x141a28); setCurt(2, 0.8); put(wilson, 4.3, -11.0, 0, 5.25); pose(wilson, { blob: false, lie: 1 }); pov(4.3, 6.0, 14, 10, seg(t, b + 4, d)); } },
  flashlight(t, d, l) { mood('night'); const a = l(1), b = l(2); car.visible = false; gateOpen(0.45); lit('bed', 0x140f3a);
    if (t < a) { put(alex, 4.4, 12.4, 1.2, 3.2); pose(alex, { armR: [-0.9, 0, -0.6], face: 'scared' }); torch.visible = true; bedLamp.intensity = 1.2; camL([2.6, 4.7, 10.6, 4.6, 4.3, 12.5, 40], [2.9, 4.7, 10.9, 4.6, 4.3, 12.5, 36], t / a); }
    else { const u = seg(t, a + 0.5, d - 0.5); walk(alex, [[-2, 8.7], [-2, 5.2], [0, -4.8], [0, -7.2]], u, t, { ...withTorch(true), face: 'scared' }, 7); t < b ? camL([-6, 1.4, 6.6, -2, 1.2, 8, 44], [-5.5, 1.4, 5.6, -2, 1.2, 6, 44], seg(t, a, b)) : camL([4.2, 0.9, 1.2, 0, 1.2, -1, 46], [3.2, 1.0, -1.8, 0, 1.6, -6.5, 46], seg(t, b, d)); } },
  kitchenwindow(t, d, l) { mood('night'); car.visible = false; gateOpen(0.45); const a = l(1), u = seg(t, 0.3, a + 2.2), cl = smooth(seg(t, a + 4.2, d - 0.3));
    if (cl <= 0) { walk(alex, [[0, -7.2], [0.3, -9.2], [3, -8.4], [8.1, -9.4], [8.0, -13.2]], u, t, { ...withTorch(true), face: 'scared', y: 0 }, 7); if (u >= 1) { lookAt(alex, 7, -13.2); pose(alex, { ...withTorch(true), face: 'scared' }); } }
    else { put(alex, lerp(8.0, 6.9, cl), -13.2, -Math.PI / 2, Math.sin(cl * Math.PI) * 0.4 + cl * 0.9); pose(alex, { crouch: cl, armR: [-1.6, 0, 0], armL: [-1.6, 0, 0], face: 'scared' }); alex.visible = cl < 0.85; }
    t < a ? camL([3.5, 1.2, -5.6, 0.5, 1.5, -9.5, 46], [10.5, 1.4, -6.6, 8, 1.3, -11, 46], seg(t, 0, a)) : camL([10.6, 1.6, -10.6, 7.4, 1.4, -13.2, 40], [10.0, 1.6, -11.6, 7.2, 1.5, -13.2, 34], seg(t, a, d)); },
  dark(t, d, l) { mood('inNight'); winLight.intensity = 5; const a = l(1), on = t > a + 1.2;
    if (t < l(0) + 3.4) { putI(alex, 7.0, 3.6, -Math.PI / 2); pose(alex, { crouch: 1 - smooth(seg(t, 0.4, 2)), face: 'scared', armR: P.torch.armR }); torch.visible = true; camI([3.2, 1.5, 5.2, 7, 1.2, 3.6, 50], [3.6, 1.5, 4.8, 7, 1.2, 3.6, 50], t / 3.4); }
    else if (t < a) camI([-6.2, 1.7, 5.6, -8.4, 1.7, 5.6, 40], [-6.8, 1.7, 5.6, -8.4, 1.6, 5.6, 34], seg(t, l(0) + 3.4, a));
    else { walk(alex, [IXY(7, 3.6), IXY(5.6, 4.6)], seg(t, a + 1.6, d), t, { ...withTorch(on), face: 'scared', headYaw: 0.5 * Math.sin(t * 1.3) }, 6); if (t <= a + 1.6) pose(alex, { ...withTorch(on), face: 'scared' }); camI([2.4, 1.5, 6.2, 6.4, 1.2, 4, 50], [2.2, 1.5, 6.0, 6, 1.2, 4.2, 50], seg(t, a, d)); } },
  photos(t, d, l) { mood('inNight'); const a = l(1), u = seg(t, 0, l(0) + 5);
    if (t < l(0) + 5) { walk(alex, [IXY(0.6, 3.8), IXY(-2, 4.4), IXY(-5, 5.6)], u, t, { ...withTorch(true), face: 'scared', twist: 0.5 * Math.sin(t * 0.9) }, 6); camI([-0.6, 1.9, 6.8, -5, 1.2, 3, 56], [-1.2, 1.9, 6.6, -6, 1.2, 2.2, 56], u); }
    else { const k = seg(t, l(0) + 5, d); walk(alex, [IXY(-5, 5.6), IXY(-5.0, 3.0)], seg(k, 0, 0.5), t, { ...withTorch(true, 0.5), face: 'scared' }, 6); if (k >= 0.5) { lookAt(alex, IX - 5.0 + (seg(t, a, d - 0.5) - 0.5) * 4, IZ); pose(alex, { ...withTorch(true, t > a ? 0.1 : 0.4), face: 'scared' }); if (t > a) alex.visible = false; }
      t < a ? camI([-3.2, 1.7, 3.4, -5.6, 1.9, 0, 48], [-3.6, 1.7, 2.8, -5.6, 1.9, 0, 44], seg(t, l(0) + 5, a)) : camI([-7.2, 1.75, 1.5, -6.2, 1.75, 0.1, 30, 0.5], [-3.6, 1.75, 1.5, -2.6, 1.75, 0.1, 30, 0.5], seg(t, a, d - 0.5), (x) => x); } },
  creak(t, d, l) { mood('inNight'); const a = l(1), off = t > a + 1.0, u = seg(t, a + 0.6, a + 2.6);
    if (t < a) { putI(alex, -5.0, 3.0, Math.PI); pose(alex, { ...withTorch(true, 0.5), face: 'scared', headYaw: 2.6, headPitch: -0.5 }); camI([-5.6, 1.5, 0.5, -5.2, 2.6, 4, 50], [-5.6, 1.5, 0.5, -5.2, 3.2, 5, 50], t / a); camera.rotation.z += 0.05 * Math.sin(t * 14) * (t < 1.4 ? 1 : 0); }
    else { walk(alex, [IXY(-5.0, 3.0), IXY(-3.0, 3.6), IXY(-4.6, 5.0)], u, t, { ...withTorch(!off), face: 'scared', crouch: 0.4 }, 12); if (u >= 1) { lookAt(alex, IX - 4.6, IZ); pose(alex, { crouch: 1, face: 'scared', armR: P.torch.armR, headPitch: -0.2 }); torch.visible = true; } amb.intensity = 1.0;
      camI([-7.6, 0.7, 6.9, -4.4, 0.9, 4.4, 46], [-7.2, 0.7, 6.6, -4.4, 1.0, 4.2, 42], seg(t, a, d)); fill(IX - 5.6, 1.2, IZ + 6.2, 2.5); } },
  chocbox(t, d, l) { mood('inNight'); winLight.intensity = 5; const a = l(1), u = seg(t, 0, l(0) + 3);
    walk(alex, [IXY(-1.5, 4.0), IXY(1.5, 3.9), IXY(3.2, 4.6)], u, t, { ...withTorch(true, 1.2), face: 'scared' }, 6); if (u >= 1) { lookAt(alex, IX + 4.2, IZ + 3.5); pose(alex, { ...withTorch(true, 1.2), face: 'scared', lean: 0.2 }); }
    if (t < l(0) + 3) camI([6.6, 1.6, 6.6, 2.5, 1.2, 4, 52], [6.4, 1.6, 6.2, 3, 1.1, 4, 52], u); else if (t < a + 2.2) { camI([5.0, 1.45, 2.5, 4.05, 0.95, 3.62, 34, 0.5], [4.9, 1.4, 2.7, 4.0, 0.95, 3.65, 28, 0.5], seg(t, l(0) + 3, a + 2.2)); fill(IX + 4.2, 1.8, IZ + 3.4, 1.6, 0xfff0d0); } else { camI([4.4, 1.5, 3.4, 3.2, 1.42, 4.6, 26], [4.3, 1.5, 3.5, 3.2, 1.42, 4.6, 22], seg(t, a + 2.2, d)); fill(IX + 4.0, 1.5, IZ + 3.7, 1.2, 0xfff0d0); } },
  key(t, d, l) { mood('inNight'); const a = l(1), u = seg(t, 0, l(0) + 5.2), k = smooth(seg(t, a + 1, a + 2));
    if (t < a) { walk(alex, [IXY(3.6, 5.6), IXY(3.6, 8.6), IXY(-6.6, 9.3), IXY(-8.0, 9.25)], u, t, { ...withTorch(true, 1.2), face: 'scared', lean: 0.15 }, 6); if (u >= 1) pose(alex, { face: 'scared', armL: [-1.2 + 0.2 * Math.sin(t * 9), 0, -0.6], ...withTorch(true, 1.2) });
      u < 0.55 ? camI([4.6, 0.5, 9.8, 3.4, 0.2, 6.5, 50], [1.0, 0.6, 10.4, -3, 0.3, 9.2, 50], u / 0.55) : camI([-3.0, 1.6, 10.2, -8.6, 1.3, 9.2, 46], [-4.4, 1.6, 10.2, -8.8, 1.3, 9.2, 40], seg(u, 0.55, 1)); }
    else { putI(alex, -6.55, 10.1, 0.3); lookAt(alex, IX - 7.6, IZ + 10.6); pose(alex, { ...withTorch(true, 0.5), face: 'scared', lean: 0.3, armL: [-0.9, 0, -0.5] }); drawer.position.z = 10.55 - k * 0.3; camI([-8.4, 1.55, 9.3, -7.5, 0.85, 10.45, 40, 0.5], [-8.3, 1.5, 9.5, -7.55, 0.86, 10.4, 30, 0.5], seg(t, a, d)); fill(IX - 7.8, 1.6, IZ + 9.9, 1.2, 0xfff0d0); } },
  bhaiya(t, d, l) { mood('inNight'); smallKey.visible = false; const o = smooth(seg(t, l(0) + 1.4, l(1))) * 0.5; bDoor.rotation.y = -o; putI(alex, -7.9, 9.25, -Math.PI / 2); pose(alex, { ...withTorch(true, 1.2), face: 'scared', armL: t < l(1) ? [-1.1, 0, -0.5] : undefined, headYaw: t > l(1) ? 0.2 * Math.sin(t * 9) * (1 - seg(t, l(1), l(1) + 1)) : 0 });
    t < l(1) ? camI([-5.8, 1.6, 10.3, -8.7, 1.3, 9.2, 40], [-6.4, 1.6, 10.1, -8.8, 1.3, 9.2, 34], t / l(1)) : (camI([-8.8, 1.6, 9.0, -7.9, 1.6, 9.25, 50, 0.4], [-8.8, 1.6, 9.05, -7.9, 1.62, 9.25, 44, 0.4], seg(t, l(1), d)), fill(IX - 8.5, 1.6, IZ + 8.9, 1.5), torchOn(false), torch.visible = true); },
  stairs(t, d, l) { mood('basNight'); const a = l(1), u = seg(t, l(0) + 2.2, a + 1.5), x = lerp(-4.0, 1.4, u), mv = u > 0 && u < 1;
    putB(alex, x, 0, Math.PI / 2, stairY(x)); pose(alex, { ...withTorch(true, 1.2), face: 'scared', walk: mv ? [t * 5, 0.7] : undefined }); if (u >= 1) { walk(alex, [BXY(1.4, 0), BXY(6.6, 0)], seg(t, a + 1.5, a + 5), t, { ...withTorch(true, 1.3), face: 'scared' }, 6); }
    putB(lily, 10.6, 1.4, -1.8); pose(lily, { sit: 1, face: 'cry', armR: [-1.9, 0.3, -2.2], armL: [-1.9, 0.3, -2.2], headPitch: 0.5 });
    if (t < a) camB([3.4, 0.8, 0.6, -2, 1.9, 0, 52], [3.0, 0.9, 0.5, -1, 1.5, 0, 52], t / a); else if (t < a + 5) camB([0.8, 1.9, -1.9, 9, 0.9, 0.4, 50], [2.6, 1.8, -1.6, 9.5, 0.8, 0.6, 46], seg(t, a, a + 5)); else camB([7.4, 1.1, -0.6, 10.6, 0.5, 1.4, 34], [7.9, 1.0, -0.4, 10.6, 0.5, 1.4, 28], seg(t, a + 5, d)); },
  lily(t, d, l) { mood('basNight'); const u = seg(t, l(1) + 0.3, l(2)); putB(alex, 7.75, 0.15, Math.PI / 2); pose(alex, { ...withTorch(true, 0.8), face: 'scared', armL: [-1.2, 0, -0.4], crouch: 0.25 });
    if (u <= 0) { putB(lily, 10.6, 1.4, -1.8); pose(lily, { sit: 1, face: 'cry', headYaw: -0.3 }); } else { walk(lily, [BXY(10.6, 1.4), BXY(8.95, 0.2)], u, t, { face: 'cry' }, 14); if (u >= 1) { lookAt(lily, BX + 7.7, BZ); pose(lily, { face: 'cry', armR: [-1.4, 0, -0.3], armL: [-1.4, 0, -0.3] }); } }
    t < l(2) ? camB([6.6, 1.5, -1.5, 9.6, 0.8, 0.8, 42], [6.9, 1.4, -1.3, 9.2, 0.8, 0.4, 38], t / l(2)) : camB([6.4, 1.3, 1.9, 8.6, 0.95, 0.2, 46], [6.6, 1.25, 1.7, 8.6, 0.95, 0.2, 42], seg(t, l(2), d)); },
  keys(t, d, l) { mood('basNight'); const a = l(1), c = l(2), u1 = seg(t, l(0) + 2.4, a - 0.3), got = u1 > 0.5, open = smooth(seg(t, a + 2.6, a + 3.6));
    if (t < a - 0.3) walk(alex, [BXY(7.75, 0.15), BXY(5.6, 2.9), BXY(7.75, 0.5)], u1, t, { ...withTorch(true), face: 'scared', armL: t < l(0) + 2 ? [-1.3 + 0.2 * Math.sin(t * 12), 0, -0.3] : undefined }, 8); else { putB(alex, 7.75, 0.4, Math.PI / 2 - 0.3); pose(alex, { ...withTorch(true, 0.8), face: 'scared', armL: [-1.25 + 0.1 * Math.sin(t * 9), 0, -0.5], crouch: open >= 1 ? 0.55 : 0.1 }); }
    keyring.visible = !got || t >= a - 0.3; if (got) keyring.position.set(8.38, 1.12, 0.52); cellGate.rotation.y = open * 1.5;
    const out = seg(t, a + 3.6, a + 5); if (out <= 0) { putB(lily, 8.95, 0.2, -Math.PI / 2); pose(lily, { face: 'cry', armR: [-1.4, 0, -0.3], armL: [-1.4, 0, -0.3] }); } else { walk(lily, [BXY(8.95, 0.0), BXY(8.1, 0.25)], out, t, { face: 'cry' }, 12); if (out >= 1) { lookAt(lily, BX + 7.75, BZ + 0.4); pose(lily, { face: 'cry', armR: [-1.5, -0.4, -0.2], armL: [-1.5, -0.4, -0.2] }); lookAt(alex, BX + 8.1, BZ + 0.25); pose(alex, { face: 'scared', crouch: 0.55, armR: [-1.2, -0.5, -0.4], armL: [-1.2, -0.5, -0.4] }); torch.visible = false; amb.intensity = 1.0; } }
    if (t < a - 0.3) camB([8.6, 1.9, -2.6, 6, 0.9, 2.2, 50], [8.2, 1.9, -2.4, 6, 0.9, 2.4, 50], t / a); else if (t < c - 0.5) camB([6.2, 1.4, 2.4, 8.3, 1.1, 0.3, 48], [6.4, 1.35, 2.2, 8.3, 1.1, 0.2, 44], seg(t, a, c)); else camB([5.8, 1.3, 2.3, 7.95, 0.95, 0.3, 44], [6.0, 1.25, 2.1, 7.95, 0.95, 0.3, 40], seg(t, c - 0.5, d)); },
  creak3(t, d, l) { mood('basNight'); cellGate.rotation.y = 1.5; keyring.visible = false; const a = l(4), k = [1, 2, 3].filter(i => t > l(i)).length;
    putB(alex, 7.75, 0.4, -Math.PI / 2); pose(alex, { ...withTorch(true, 0.8), face: 'scared', crouch: 0.3, headPitch: -0.3 }); putB(lily, 8.1, 0.9, -Math.PI / 2); pose(lily, { face: 'scared', armR: [-0.8, -0.6, -0.4] });
    if (k > 0) { const sx = -4.0 + k * 0.55; putB(wilson, sx, 0, Math.PI / 2, stairY(sx)); pose(wilson, { blob: false, face: 'wneutral' }); }
    const j = [1, 2, 3].reduce((s, i) => s + (t > l(i) && t < l(i) + 0.35 ? Math.sin((t - l(i)) * 40) * 0.03 : 0), 0);
    t < l(1) ? camB([5.6, 1.4, 2.4, 8, 1.1, 0.5, 46], [5.8, 1.35, 2.2, 8, 1.1, 0.5, 42], t / l(1)) : camB([4.6, 1.0, 0.4, -2.5, 2.2 + j * 6, 0, 40, 0.5], [3.4, 1.1, 0.3, -2.5, 2.3 + j * 6, 0, 34, 0.5], seg(t, l(1), d)); },
  _hide(t) { mood('basNight'); cellGate.rotation.y = 1.5; keyring.visible = false; putB(alex, 5.75, -3.35, -Math.PI / 2 + 0.3); pose(alex, { crouch: 1, face: 'scared', armL: [-1.0, -0.7, -0.4] }); torch.visible = true; putB(lily, 5.1, -3.42, -Math.PI / 2 + 0.3); pose(lily, { crouch: 0.6, face: 'scared', armR: [-1.9, 0.2, -2.2], armL: [-1.9, 0.2, -2.2] }); bulb.intensity = 9 + Math.sin(NOW * 31) * 1.2; bulbMesh.material.color.set(0xffe0a0); },
  cupboard(t, d, l) { const a = l(1), b = l(2);
    if (t < l(0) + 3.2) { mood('basNight'); cellGate.rotation.y = 1.5; keyring.visible = false; const u = seg(t, 1.0, 3.2); walk(alex, [BXY(7.75, 0.4), BXY(6.9, -2.0), BXY(5.75, -3.35)], u, t, { ...withTorch(t < l(0) + 1.0, 0.8), face: 'scared', crouch: 0.4 }, 14); walk(lily, [BXY(8.1, 0.9), BXY(6.6, -2.4), BXY(5.1, -3.42)], seg(t, 1.2, 3.2), t, { face: 'scared', crouch: 0.3 }, 16); amb.intensity = 1.0; camB([9.2, 1.5, -0.6, 6, 0.8, -3, 46], [8.6, 1.4, -1.0, 5.6, 0.8, -3.2, 46], t / 3.2); return; }
    SHOT._hide(t); const u = seg(t, l(0) + 3.2, a + 1.8), x = lerp(-3.4, 1.0, u); putB(wilson, x, 0, Math.PI / 2, stairY(x)); pose(wilson, { face: 'wneutral', blob: u >= 1, walk: u < 1 ? [t * 4, 0.6] : undefined, headYaw: u >= 1 && t < b - 2 ? 0.9 * Math.sin((t - a) * 1.6) : 0 });
    if (t > b - 2.2) { lookAt(wilson, BX + 8.5, BZ); pose(wilson, { face: 'wneutral' }); }
    t < a ? camB([7.0, 0.85, -3.75, 2.5, 1.5, -1.2, 50, 0.6], [7.0, 0.85, -3.75, 2.2, 1.6, -0.6, 50, 0.6], seg(t, l(0) + 3.2, a)) : camB([3.6, 1.3, 2.2, 1.0, 1.7, 0, 40], [3.2, 1.4, 1.6, 1.0, 1.9, 0, 30], seg(t, a, d)); },
  who(t, d, l) { SHOT._hide(t); const a = l(2), u = seg(t, a + 2.0, d + 0.5); if (t < a + 2) { putB(wilson, 1.0, 0, Math.PI / 2); pose(wilson, { face: t > l(1) ? 'wgrin' : 'wneutral', lean: t > l(1) ? -0.1 : 0, armR: t > l(1) ? [-0.4, 0.5, -0.8] : undefined, armL: t > l(1) ? [-0.4, 0.5, -0.8] : undefined }); } else walk(wilson, [BXY(1.0, 0), BXY(3.2, -0.6), BXY(4.5, -1.5)], u, t, { face: 'wneutral', lean: 0.12 }, 4);
    if (t < l(1)) camB([3.0, 1.4, 1.4, 1.0, 1.9, 0, 30], [3.0, 1.4, 1.4, 1.0, 1.9, 0, 30], 0); else if (t < a) { camB([2.3, 1.2, 0.5, 1.0, 2.0, 0, 30, 0.3], [2.1, 1.25, 0.45, 1.0, 2.02, 0, 26, 0.3], seg(t, l(1), a)); camera.rotation.z += 0.03 * Math.sin(t * 30) * (1 - seg(t, l(1), l(1) + 0.8)); } else if (t < a + 2.2) camB([6.4, 0.75, -3.2, 5.4, 0.8, -3.4, 34], [6.3, 0.75, -3.2, 5.4, 0.8, -3.4, 30], seg(t, a, a + 2.2)); else camB([7.0, 0.85, -3.75, 3.5, 1.5, -1.6, 50, 0.6], [7.0, 0.85, -3.75, 4, 1.6, -1.5, 46, 0.6], seg(t, a + 2.2, d)); },
  phone(t, d, l) { SHOT._hide(t); const r = l(0) + (l(1) - l(0)) * 0.62, a = l(1), u = seg(t, a + 2.6, d + 1.5);
    if (t < a + 2.6) { putB(wilson, 4.5, -1.5, 0); lookAt(wilson, BX + 5.2, BZ - 2.5); pose(wilson, { face: 'wneutral', lean: 0.1, armR: t < r ? [-1.25 * smooth(seg(t, 0.5, 2.5)), 0, -0.3] : undefined, headYaw: t > r + 0.4 ? -1.9 * smooth(seg(t, r + 0.4, r + 1.4)) : 0 }); } else { const x = lerp(4.5, -3.6, u); walk(wilson, [BXY(4.5, -1.5), BXY(1.0, 0), BXY(-0.2, 0)], seg(u, 0, 0.55), t, { face: 'wneutral' }, 5); if (u > 0.55) { const sx = lerp(-0.2, -3.8, seg(u, 0.55, 1)); putB(wilson, sx, 0, -Math.PI / 2, stairY(sx)); pose(wilson, { walk: [t * 5, 0.7], blob: false }); } }
    t < a ? camB([6.9, 0.85, -3.72, 4.6, 1.3, -1.9, 46, 0.6], [6.9, 0.85, -3.72, 4.6, 1.5, -1.8, 40, 0.6], t / a) : camB([7.4, 1.6, 1.6, 2, 1.3, -0.6, 46], [7.4, 1.6, 1.6, 0, 1.6, 0, 46], seg(t, a, d)); },
  escape(t, d, l) { mood('basNight'); cellGate.rotation.y = 1.5; keyring.visible = false; bulb.intensity = 9; bulbMesh.material.color.set(0xffe0a0); gardenLight.intensity = 6; const a = l(1), u = seg(t, l(0) + 2.2, a);
    if (t < a) { walk(alex, [BXY(5.75, -3.35), BXY(6.8, -2), BXY(3.5, 2.6), BXY(1.75, 4.6)], u, t, { face: 'scared', crouch: 0.35, armL: [-0.7, 0.9, -0.3] }, 9); walk(lily, [BXY(5.1, -3.42), BXY(6.6, -1.6), BXY(3.9, 2.2), BXY(2.2, 4.3)], seg(t, l(0) + 2.6, a + 0.3), t, { face: 'scared' }, 14); camB([9.4, 1.7, 2.6, 5, 0.8, -1, 50], [8.0, 1.6, 3.0, 2.6, 0.9, 2.6, 50], t / a); }
    else { const k = seg(t, a + 2.5, a + 5.0), k2 = seg(t, a + 5.2, d - 0.3); putB(lily, 2.2, lerp(5.2, 7.0, smooth(k)), 0, smooth(seg(k, 0, 0.6)) * 1.45); pose(lily, { face: 'scared', armR: [-2.6, 0, -0.3], armL: [-2.6, 0, -0.3], crouch: k > 0.6 ? 0.8 : 0, blob: false }); lily.visible = k < 0.92;
      putB(alex, 2.0 + 0.5 * (1 - k2), lerp(5.6, 6.9, smooth(k2)), 0.15, smooth(seg(k2, 0, 0.6)) * 1.3); pose(alex, { face: 'scared', armR: k < 0.9 || k2 > 0 ? [-2.4, 0, -0.4] : undefined, armL: k < 0.9 || k2 > 0 ? [-2.4, 0, -0.4] : undefined, crouch: k2 > 0.6 ? 0.8 : 0, blob: false }); alex.visible = k2 < 0.9;
      camB([0.8, 1.5, 4.5, 2.4, 1.5, 7.0, 54], [0.9, 1.3, 4.7, 2.4, 1.9, 7.0, 50], seg(t, a, d)); } },
  run(t, d, l) { mood('night'); car.visible = false; gateOpen(1.0); const a = l(1), b = l(2), u = seg(t, 0.2, b + 2.5);
    walk(alex, [[8.2, -17.6], [8.4, -9.5], [3, -7.6], [0.2, -5.6], [-1.5, 4.6], [-2, 8.7]], u, t, { face: 'scared', armL: [-0.5, 0.6, -0.4] }, 16); walk(lily, [[8.0, -16.6], [8.2, -9.0], [2.6, -7.2], [-0.2, -5.4], [-1.9, 4.8], [-2.2, 8.9]], seg(t, 0, b + 2.3), t, { face: 'scared' }, 22);
    if (t > a) { lit('lit'); lit('hall'); const o = smooth(seg(t, a + 0.6, a + 1.6)); mDoor.rotation.y = -1.9 * o; if (o > 0.4) { put(wilson, 0, -9.6, 0, 0.3); pose(wilson, { face: 'wgrin', armR: [-1.4, 0, 0] }); } }
    if (t < a) camL([12, 1.0, -6, 8.3, 1.0, -14, 50], [5.5, 1.1, -3.6, 3, 1.0, -8, 50], seg(t, 0, a)); else if (t < b) camL([1.4, 0.8, -3.2, 0, 2.6, -10, 46], [1.6, 0.8, -2.6, 0, 3.0, -10, 46], seg(t, a, b)); else camL([-6.5, 1.3, 9.2, 0, 1.0, -3, 46], [-6.0, 1.3, 9.6, -1.5, 1.0, 5, 46], seg(t, b, d)); },
  police2(t, d, l) { mood('night'); car.visible = false; gateOpen(1.0); const a = l(1), c = l(2);
    if (t < a) { put(alex, -2.2, 7.9, 0.4); pose(alex, { ...P.phone, face: 'scared' }); put(lily, -1.4, 8.0, -0.4); pose(lily, { face: 'cry', armR: [-1.2, -0.5, -0.5] }); camL([-0.2, 1.5, 5.6, -1.9, 1.3, 8, 34], [-0.4, 1.5, 5.9, -1.9, 1.3, 8, 30], t / a); return; }
    const u = smooth(seg(t, a, a + 2.4)); policeAt(lerp(46, 3.2, u)); lit('lit'); lit('hall');
    if (t > a + 2.4) { const k = seg(t, a + 2.4, c - 1.2); walk(cop1, [[1.5, 0.6], [0, -5.6], [-0.95, -8.5]], k, t, { y: k > 0.8 ? 0.3 : 0 }, 10); walk(cop2, [[2.6, 1.0], [0.3, -4.8], [1.5, -8.3]], seg(t, a + 2.8, c - 0.8), t, { y: k > 0.85 ? 0.3 : 0 }, 10); if (k >= 1) { lookAt(cop1, 0, -10); pose(cop1, { armR: t < c ? [-1.5 + 0.3 * Math.sin(t * 15), 0, -1.0] : undefined }); } }
    const o = smooth(seg(t, c + 0.4, c + 1.5)); mDoor.rotation.y = -1.9 * o; if (o > 0.3) { put(wilson, 0, -9.7, 0, 0.3); pose(wilson, { face: 'wpolite', armR: [-0.3, 0.3, -0.6], armL: [-0.3, 0.3, -0.6] }); }
    t < c ? camL([-7, 1.5, 3.4, 4, 1.4, -4, 46], [-5.5, 1.5, 1.6, 1, 1.6, -7, 46], seg(t, a, c)) : camL([0.3, 2.1, -7.0, 0, 2.08, -9.8, 34], [0.3, 2.1, -7.4, 0, 2.1, -9.8, 28], seg(t, c, d)); },
  empty(t, d, l) { const a = l(1), b = l(2), k = seg(t, a, b);
    if (t < a) { mood('basNight'); amb.intensity = 1.1; bulb.intensity = 16; bulbMesh.material.color.set(0xffe0a0); cell.visible = false; blankWall.visible = true; keyring.visible = false; walk(cop1, [BXY(0.4, 0), BXY(4, 0.5)], seg(t, 0.5, 5), t, { headYaw: 0.7 * Math.sin(t) }, 6); walk(cop2, [BXY(-1.6, 0), BXY(1.2, -0.3)], seg(t, 2.5, 6.5), t, { y: 0 }, 6); cop2.position.y = stairY(cop2.position.x - BX); camB([7.4, 1.8, -2.8, 2, 1.2, 0.6, 54], [6.6, 1.8, -2.4, 2, 1.2, 0.8, 54], t / a); }
    else if (k < 0.55) { mood('basNight'); amb.intensity = 1.1; bulb.intensity = 16; bulbMesh.material.color.set(0xffe0a0); cell.visible = false; blankWall.visible = true; keyring.visible = false; putB(cop1, 5.6, 0.4, Math.PI / 2); pose(cop1, { headYaw: 0.4 * Math.sin(t * 1.5) }); camB([2.4, 1.6, -1.8, 8.4, 1.3, 0.4, 50], [3.2, 1.6, -1.2, 8.4, 1.3, 0.2, 46], k / 0.55); }
    else if (t < b) { mood('inDay'); amb.intensity = 0.9; evidence.visible = false; putI(cop2, -4.2, 3.4, Math.PI); pose(cop2, { headYaw: 0.5 * Math.sin(t * 1.3) }); camI([-2.2, 1.8, 4.6, -5.8, 1.8, 0, 50], [-3.0, 1.8, 4.2, -6.2, 1.8, 0, 46], seg(k, 0.55, 1)); }
    else { mood('inDay'); amb.intensity = 0.9; evidence.visible = false; camI([5.4, 1.5, 2.3, 4.05, 0.95, 3.6, 36], [5.2, 1.45, 2.5, 4.05, 0.95, 3.6, 30], seg(t, b, d)); } },
  sure(t, d, l) { mood('night'); car.visible = false; policeAt(3.2); gateOpen(1.0); lit('lit'); lit('hall'); wilsonDoor('wpolite', { armR: t < l(1) ? [-0.4, 0.6, -0.9] : undefined, armL: t < l(1) ? [-0.4, 0.6, -0.9] : undefined, headYaw: t < l(1) ? 0.3 * Math.sin(t * 1.4) : 0 });
    const pt = t > l(3) && t < l(5); put(alex, 0.8, -6.6, Math.PI - 0.2); pose(alex, { face: 'scared', armR: pt ? [-1.45, 0.2, 0] : undefined, headPitch: t > l(3) && t < l(3) + 1.2 ? 0.25 * Math.abs(Math.sin(t * 6)) : 0 }); put(cop2, 1.5, -8.3, Math.PI); pose(cop2, {});
    put(cop1, -0.95, -8.2, t > l(1) ? 0.55 : Math.PI); pose(cop1, { headPitch: t > l(5) ? 0.3 : 0, armR: t > l(5) ? [-0.4, 0.4, -1.4] : undefined });
    if (t < l(1)) camL([0.25, 2.1, -7.1, 0, 2.08, -9.8, 32], [0.25, 2.1, -7.4, 0, 2.1, -9.8, 28], t / l(1)); else if (t < l(3)) camL([1.4, 1.6, -5.6, -0.4, 1.7, -8.0, 30], [1.3, 1.6, -5.8, -0.4, 1.7, -8.0, 28], seg(t, l(1), l(3))); else if (t < l(5)) camL([-1.7, 1.7, -7.5, 0.8, 1.45, -6.6, 30], [-1.6, 1.7, -7.4, 0.8, 1.45, -6.6, 26], seg(t, l(3), l(5))); else camL([2.6, 1.6, -4.6, -0.2, 1.6, -8.4, 36], [2.9, 1.6, -4.2, -0.2, 1.7, -8.6, 36], seg(t, l(5), d)); },
  wave(t, d, l) { mood('night'); car.visible = false; gateOpen(1.0); lit('lit'); lit('hall'); const a = l(1), b = l(2), c = l(3), up = smooth(seg(t, a + 0.4, a + 2.4)), wv = smooth(seg(t, c + 0.5, c + 2.0));
    policeAt(lerp(3.2, 60, smooth(seg(t, l(0) + 4.5, a)))); const jerk = seg(t, d - 2.2, d - 1.6); atWindow({ face: 'scared' }); alex.position.x += jerk * 1.6; alex.position.z += jerk * 0.8;
    wilsonDoor(t > a + 3.0 ? 'wgrin' : 'wpolite', { headPitch: -0.42 * up, headYaw: -0.14 * up, armR: wv > 0 ? [-2.7 * wv, 0.35 * wv + 0.22 * Math.sin(t * 5) * wv, -0.3] : undefined });
    if (t < l(0) + 4.5) camL([-4.5, 1.5, -5.2, 0.6, 1.6, -9, 44], [-4.0, 1.5, -4.6, 0.6, 1.6, -9, 44], t / 4.5); else if (t < a) overShoulder(seg(t, l(0) + 4.5, a), 36); else if (t < d - 2.4) pov(0, 2.1, 14, t > b ? 6.5 : 9, seg(t, a, c), -9.7); else camL([4.9, 4.9, 12.6, 3.2, 4.6, 9.6, 44], [4.9, 4.9, 12.6, 3.6, 4.5, 10.4, 44], seg(t, d - 2.4, d)); },
  warrant(t, d, l) { const a = l(0) + 4.6, b = l(1);
    if (t < a) { mood('morning'); car.visible = false; policeAt(3.2, -1.7, false); gateOpen(1.0); mDoor.rotation.y = -1.9; walk(cop1, [[1.5, 0.6], [0, -5.6], [0, -9.6]], seg(t, 0.3, a), t, { armR: [-0.9, 0, -0.9], y: 0 }, 8); walk(cop2, [[2.6, 1.0], [0.3, -4.8], [0.6, -8.4]], seg(t, 0.8, a + 0.5), t, {}, 8); camL([4.5, 1.6, 2.5, 0, 2.2, -8, 46], [3.5, 1.6, 0.5, 0, 2.8, -9, 46], t / a); return; }
    mood('basNight'); amb.intensity = 1.15; bulb.intensity = 16; bulbMesh.material.color.set(0xffe0a0); cell.visible = false; blankWall.visible = true; keyring.visible = false; const k = smooth(seg(t, a + 2.5, a + 5.5)); cupboard.position.x = 5.2 + k * 2.6; hiddenWall.visible = k < 0.25;
    putB(cop1, 6.2 + k * 2.6, -1.75, Math.PI + 0.3); pose(cop1, { armR: [-1.3, 0, -0.3], armL: [-1.3, 0, -0.3], lean: 0.3, walk: k > 0 && k < 1 ? [t * 6, 0.4] : undefined }); putB(cop2, 3.6, -1.2, Math.PI - 0.5); pose(cop2, { armR: t > b ? [-1.2, 0, -0.2] : undefined }); if (t > b) { spot.intensity = 0; }
    t < b ? camB([5.0, 1.6, 2.4, 5.4, 1.3, -3, 50], [5.2, 1.6, 1.6, 5.3, 1.3, -4, 50], seg(t, a, b)) : camB([5.2, 1.6, -1.6, 5.25, 1.55, -6.4, 50, 0.5], [5.25, 1.6, -4.3, 5.25, 1.6, -6.4, 44, 0.5], seg(t, b, d - 1)); if (t > b) amb.intensity = 1.5; },
  arrest(t, d, l) { mood('morning'); const a = l(1); gateOpen(1.0);
    if (t < a) { car.visible = false; policeAt(3.2, -1.7, true); const u = seg(t, 0.2, a - 0.3); mDoor.rotation.y = -1.9; walk(wilson, [[0, -9.6], [0, -5.6], [2.0, -2.6]], u, t, { face: 'wneutral', ...P.back, lean: 0.15, y: u < 0.2 ? 0.3 : 0 }, 6); walk(cop1, [[-0.6, -9.2], [-0.5, -5.4], [1.4, -2.8]], u, t, { armL: [-0.8, 0.6, -0.4] }, 8); walk(cop2, [[0.7, -9.3], [0.6, -5.6], [2.7, -2.9]], u, t, { armR: [-0.8, 0.6, -0.4] }, 8); camL([-4.2, 1.5, -1.8, 0.4, 1.6, -8, 44], [-3.6, 1.6, -0.8, 1.6, 1.5, -4, 40], t / a); }
    else { put(dad, 0.3, 7.2, Math.PI + 0.4); pose(dad, { face: 'smile', armL: [-0.7, 0.7, -0.5] }); put(mom, -0.9, 7.0, Math.PI - 0.3); pose(mom, { face: 'smile', crouch: 0.5, armR: [-1.2, -0.4, -0.5], armL: [-1.2, -0.4, -0.5] }); put(lily, -0.75, 6.5, 0.2); pose(lily, { face: 'smile', armR: [-1.5, -0.3, -0.3], armL: [-1.5, -0.3, -0.3] }); put(alex, 0.9, 6.6, -2.4); pose(alex, {}); camL([-2.6, 1.3, 3.8, -0.4, 1.1, 6.8, 36], [-2.2, 1.3, 4.2, -0.4, 1.1, 6.8, 32], seg(t, a, d)); } },
  tape(t, d, l) { mood('night'); tape.visible = true; bedLamp.intensity = 1.6; const a = l(1);
    if (t < l(0) + 4) { put(alex, 2.25, 12.2, Math.PI / 2, 3.42); pose(alex, { sit: 0.62, blob: false, headYaw: -0.9 }); camL([4.9, 4.7, 10.2, 2.4, 4.3, 12, 46], [4.6, 4.7, 10.5, 2.6, 4.4, 11.6, 42], t / 4); }
    else if (t < a) { atWindow(); pov(0.5, 5.2, 34, 28, seg(t, l(0) + 4, a)); } else camL([2.4, 1.3, -2.2, 0, 1.4, -6.4, 44], [1.2, 1.4, -3.4, 0, 2.4, -9.6, 44], seg(t, a, d)); },
  shadow(t, d, l) { mood('night'); tape.visible = true; atWindow({ face: t > l(1) ? 'scared' : 'neutral' }); const a = l(1), mv = seg(t, l(0) + 4.6, a), ap = smooth(seg(t, a + 1.3, a + 2.6));
    setCurt(2, 0.34 + 0.25 * Math.sin(mv * Math.PI * 2) * (mv < 1 ? 1 : 0) + ap * 0.4); if (ap > 0) { lit('bed', new THREE.Color(0x140f3a).lerp(new THREE.Color(0x2a2c36), ap).getHex()); inWindow(2, { gap: 0.34 + ap * 0.4, dx: (1 - ap) * 1.2 }); }
    t < l(0) + 3.6 ? overShoulder(t / 3.6) : pov(4.3, 6.05, 16, 8.5, seg(t, l(0) + 3.6, d)); },
  points(t, d, l) { mood('night'); tape.visible = true; const a = l(1), b = l(2), off = t > a + (b - a) * 0.8, pt = smooth(seg(t, l(0) + 2.6, l(0) + 4.4));
    if (t < b) { atWindow({ face: 'scared' }); if (!off) { lit('bed', 0x2a2c36); inWindow(2, { gap: 0.74, armR: [-1.5 * pt, 0, 0] }); } t < l(0) + 2 ? camL([4.6, 4.8, 11.6, 3.2, 4.6, 9.6, 40], [4.3, 4.8, 11.0, 3.2, 4.6, 9.6, 40], t / 2) : pov(4.3, 6.05, 9, 7, seg(t, l(0) + 2, a)); }
    else if (t < b + 3.2) { const k = smooth(seg(t, b + 0.3, b + 1.1)); bedCurt[0].position.x = 3 - 0.95 + k * 0.52; bedCurt[1].position.x = 3 + 0.95 - k * 0.52; bedCurt.forEach(c => c.scale.x = 1 + k * 0.9); walk(alex, [[3.35, 9.85], [4.6, 11.5], [5.6, 13.6]], seg(t, b + 1.1, b + 3.0), t, { face: 'scared', y: 3.2 }, 16); bedLamp.intensity = 1.6; camL([1.2, 4.9, 12.8, 3.6, 4.5, 9.8, 50], [1.2, 4.9, 12.8, 4.4, 4.5, 11, 50], seg(t, b, b + 3.2)); }
    else { bedCurt[0].position.x = 2.57; bedCurt[1].position.x = 3.43; bedCurt.forEach(c => c.scale.x = 1.9); bedLamp.intensity = 2.2; put(alex, 3.0, 11.2, 0.2, 3.2); pose(alex, { face: 'scared', armR: [-1.4, 0.3, 0], twist: 0.3 }); put(mom, 3.7, 12.5, Math.PI + 0.3, 3.2); pose(mom, { armR: [-1.0, 0, -0.6] }); put(dad, 2.5, 12.8, Math.PI - 0.2, 3.2); pose(dad, { headYaw: 0.25 * Math.sin(t * 2.2) }); camL([5.2, 4.8, 10.2, 3.1, 4.6, 12.2, 46], [4.9, 4.8, 10.4, 3.1, 4.6, 12.2, 42], seg(t, b + 3.2, d)); } },
  message(t, d, l) { mood('night'); tape.visible = true; bedCurt[0].position.x = 2.57; bedCurt[1].position.x = 3.43; bedCurt.forEach(c => c.scale.x = 1.9); const a = l(1), bz = l(0) + (l(1) - l(0)) * 0.72, on = t > bz;
    put(alex, 0.9, 12.3, 0, 3.86); pose(alex, { blob: false, lie: 1, face: on ? 'scared' : 'neutral' }); phone.visible = true; phone.position.set(1.85, 3.88, 12.2); phone.children[1].visible = on; amb.intensity = 0.9; tvLight.position.set(5.1, 4.4, 12.6); if (on) fill(1.9, 4.5, 12.1, 2.2, 0x9fc0ff);
    t < a ? camL([3.9, 5.2, 11.2, 1.6, 3.9, 12.9, 46], [3.4, 5.0, 11.8, 2.2, 3.9, 13.2, 40], t / a) : camL([1.85, 4.95, 12.2, 1.85, 3.88, 12.2, 40, 0], [1.85, 4.6, 12.2, 1.85, 3.88, 12.2, 34, 0], seg(t, a, d)); if (t >= a) { camera.up.set(0, 0, -1); camera.lookAt(1.85, 3.88, 12.2); } },
  registered(t, d, l) { mood('night'); tape.visible = true; const a = l(1), b = l(2);
    if (t < a) { bedLamp.intensity = 2; bedCurt[0].position.x = 2.57; bedCurt[1].position.x = 3.43; bedCurt.forEach(c => c.scale.x = 1.9); put(alex, 2.25, 12.2, Math.PI / 2, 3.42); pose(alex, { sit: 0.62, blob: false, face: 'scared', armR: [-0.5 + 0.06 * Math.sin(t * 30), 0.25, -2.3] }); camL([4.6, 4.5, 11.0, 2.3, 4.35, 12.2, 34], [4.4, 4.5, 11.2, 2.3, 4.35, 12.2, 30], t / a); }
    else if (t < b) { put(alex, -2.3, 8.0, Math.PI - 0.5); pose(alex, { face: 'scared' }); put(cop1, -1.0, 6.9, -0.7); pose(cop1, { armR: [-0.9, -0.2, -1.3], headPitch: 0.35 }); put(dad, -3.0, 8.3, Math.PI - 0.6); pose(dad, {}); policeAt(-3, 1.7, true); police.rotation.y = -Math.PI / 2; camL([-3.6, 1.6, 5.2, -1.4, 1.5, 7.2, 36], [-3.3, 1.6, 5.4, -1.2, 1.5, 7.0, 30], seg(t, a, b)); }
    else { mood('inNight'); evidence.visible = false; walk(cop1, [IXY(-1, 6.4), IXY(-4.5, 5.4)], seg(t, b, d), t, { armR: P.torch.armR, headYaw: 0.6 * Math.sin(t) }, 6); spot.intensity = 0; camI([-0.6, 2.0, 7.0, -6, 1.3, 1.5, 58], [-1.6, 2.0, 6.6, -6.4, 1.3, 1.0, 58], seg(t, b, d)); amb.intensity = 1.0; } },
  custody(t, d, l) { mood('basNight'); amb.intensity = 1.25; amb.color.set(0x6a7a90); bulb.intensity = 14 + Math.sin(NOW * 23) * 1.5; bulbMesh.material.color.set(0xd0e0ff); keyring.visible = false; cupboard.position.x = 30; const up = smooth(seg(t, l(1), l(2)));
    putB(wilson, 11.0, 2.6, -Math.PI / 2 - 0.5, 0.0); pose(wilson, { sit: 0.78, blob: false, face: t > l(2) + 0.5 ? 'wgrin' : 'wneutral', headPitch: 0.6 * (1 - up), armR: [-0.5, 0, -0.9], armL: [-0.5, 0, -0.9], lean: 0.25 * (1 - up) });
    camB([5.4, 1.4, -1.6, 10.6, 0.9, 2.3, 40], [7.6, 1.2, 0.9, 10.9, 1.0, 2.5, 18], seg(t, 0, d - 0.5)); },
  eleventhirty(t, d, l) { mood('night'); tape.visible = true; const a = l(1), on = t > a - 1.4, fl = on && (t < a - 1.1 ? Math.sin(t * 60) > 0 : true);
    if (fl) { lit('lit'); lit('hall'); lit('bed'); }
    if (t < a) camL([6, 1.0, 4.2, 0.5, 4.6, -11, 50], [3.5, 1.0, 0.5, 0.5, 5.0, -11, 50], t / a);
    else { atWindow({ face: 'scared' }); const k = t > d - 2.6; inWindow(2, { gap: 0.8, face: k ? 'wgrin' : 'wneutral' }); t < a + 3 ? overShoulder(seg(t, a, a + 3)) : pov(4.3, 6.1, 15, 5.6, seg(t, a + 3, d - 0.6)); } },
  end(t, d) { mood('night'); tape.visible = true; if (t < 1.4) { lit('bed'); inWindow(2, { gap: 0.8, face: 'wgrin' }); } pov(4.3, 6.1, 5.6, 5.4, t / d); },
};

// ---------- frame loop ----------
const FADE = { days: 1, call: 1, dolls: 1, search: 1, night: 1, dark: 1, stairs: 1, run: 1, warrant: 1, arrest: 1, tape: 1, message: 1, custody: 1, eleventhirty: 1 };
window.renderFrame = (T) => {
  T = clamp(T, 0, TL.duration - 1e-3); NOW = T;
  let i = TL.beats.findIndex(b => T < b.end); if (i < 0) i = TL.beats.length - 1;
  const b = TL.beats[i], t = T - b.start, d = b.end - b.start, l = (k) => b.lines[Math.min(k, b.lines.length - 1)].t0 - b.start;
  reset(); SHOT[b.id](t, d, l);
  aimTorch(); billboard(); camera.updateMatrixWorld(); renderer.render(scene, camera);
  let f = 0; if (FADE[b.id]) f = Math.max(f, 1 - t / 0.5); const nx = TL.beats[i + 1]; if (nx && FADE[nx.id]) f = Math.max(f, 1 - (d - t) / 0.5);
  if (i === 0) f = Math.max(f, 1 - t / 2.5); if (b.id === 'end') f = Math.max(f, seg(t, 1.4, 1.5), 0); if (b.id === 'grab') f = Math.max(f, seg(t, d - 1.2, d - 1.15));
  $('fade').style.opacity = clamp(f);
};
window.DURATION = TL.duration;
window.renderFrame(0);
window.READY = true;
