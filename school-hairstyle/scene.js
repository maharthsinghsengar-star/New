// SCHOOL KA HAIRSTYLE CHECKING — flat 2D cartoon characters in a vibrant cel-shaded 3D school (9:16).
// Fully deterministic: window.renderFrame(t) draws the frame for time t (seconds).
import * as THREE from 'three';

const W = 1080, H = 1920;
const TL = await (await fetch('build/timeline.json')).json();
await document.fonts.load('80px Bangers');
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
const amb = new THREE.AmbientLight(0xffffff, 1.9), sun = new THREE.DirectionalLight(0xfff2dc, 2.3);
sun.position.set(-6, 14, 12); scene.add(amb, sun, sun.target);
let NOW = 0, BEAT = TL.beats[0];

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

function label(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const starG = (() => { const p = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 0.2 : 1; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return poly(p); })();
const stars = [];
function star(parent, x, y, z, size, color = 0xffffff) { const m = new THREE.Mesh(starG, flatMat(color)); m.position.set(x, y, z); m.userData.size = size; m.visible = false; parent.add(m); stars.push(m); return m; }
const twinkle = (m, ph = 0, on = 1, sp = 6) => { const k = on * Math.max(0, Math.sin(NOW * sp + ph)); m.scale.setScalar(Math.max(1e-3, m.userData.size * k)); m.rotation.z = NOW * 1.2 + ph; m.visible = k > 0.03; };

// ---------- faces ----------
function faceOf(kind, hr, head) {
  const g = new THREE.Group(), D = 0x1c1430, ex = [0.1 * hr, 0.6 * hr], ey = 0.1 * hr, closed = kind === 'laugh' || kind === 'pray', big = kind === 'scared' ? 1.3 : 1;
  ex.forEach((x, i) => {
    if (closed) Pt(new THREE.RingGeometry(0.11 * hr, 0.165 * hr, 12, 1, 0, Math.PI), D, x, ey - 0.05 * hr, 0.002, g, 0);
    else { Pt(ell(0.17 * hr * big, 0.21 * hr * big), 0xffffff, x, ey, 0.002, g, 0.012); Pt(ell(0.08 * hr, 0.1 * hr), D, x + (kind === 'side' ? 0.08 : 0.03) * hr, ey - (kind === 'sad' ? 0.05 : 0) * hr, 0.004, g, 0); }
    const br = { angry: i ? 0.5 : -0.5, sad: i ? -0.3 : 0.4, scared: i ? -0.25 : 0.35, smug: i ? 0.25 : 0 }[kind];
    if (br !== undefined) { const b = Pt(ell(0.2 * hr, (kind === 'angry' ? 0.06 : 0.035) * hr), D, x, ey + (kind === 'angry' ? 0.3 : 0.38) * hr + (kind === 'smug' && i ? 0.08 * hr : 0), 0.006, g, 0); b.rotation.z = br; }
  });
  const m = new THREE.Group(); m.position.set(0.38 * hr, -0.45 * hr, 0.004); g.add(m); let tk = 0.5;
  if (kind === 'neutral') { Pt(ell(0.16 * hr, 0.035 * hr), D, 0, 0, 0, m, 0); tk = 5; }
  else if (kind === 'smile') Pt(new THREE.RingGeometry(0, 0.24 * hr, 14, 1, Math.PI, Math.PI), 0x8a2030, 0, 0.08 * hr, 0, m, 0);
  else if (kind === 'laugh') { Pt(new THREE.RingGeometry(0, 0.36 * hr, 16, 1, Math.PI, Math.PI), 0x8a2030, 0, 0.14 * hr, 0, m, 0.012); Pt(new THREE.PlaneGeometry(0.5 * hr, 0.08 * hr), 0xffffff, 0, 0.1 * hr, 0.002, m, 0); }
  else if (kind === 'pray' || kind === 'smug') Pt(new THREE.RingGeometry(0.13 * hr, 0.18 * hr, 12, 1, Math.PI * 1.05, Math.PI * 0.9), D, 0, 0.1 * hr, 0, m, 0);
  else if (kind === 'scared') Pt(ell(0.14 * hr, 0.19 * hr), 0x5a1020, 0, -0.03 * hr, 0, m, 0);
  else if (kind === 'sad') Pt(new THREE.RingGeometry(0.13 * hr, 0.18 * hr, 12, 1, 0.1, Math.PI - 0.2), D, 0, -0.14 * hr, 0, m, 0);
  else if (kind === 'angry') { Pt(ell(0.3 * hr, 0.19 * hr), 0x5a1020, 0, 0, 0, m, 0.012); Pt(new THREE.PlaneGeometry(0.4 * hr, 0.08 * hr), 0xffffff, 0, 0.1 * hr, 0.002, m, 0); Pt(new THREE.PlaneGeometry(0.3 * hr, 0.06 * hr), 0xffffff, 0, -0.12 * hr, 0.002, m, 0); }
  else if (kind === 'side') { Pt(ell(0.075 * hr, 0.085 * hr), D, 0.1 * hr, 0, 0, m, 0); tk = 0; }
  g.userData = { mouth: m, tk }; g.position.z = 0.03; g.visible = false; head.add(g); return g;
}
// ---------- people ----------
function human(o) {
  const s = o.h / 1.75, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hr = 0.25 * (o.head ?? 1), fat = o.fat ?? 1, shoe = o.shoes ?? 0x1c1c2a, legU = o.dress ? o.skin : o.bottom, legL = (o.dress || o.shorts) ? o.skin : o.bottom;
  const u = root.userData = { o, s, hr, body, ry: 0, yaw: 0, flip: 1, talk: 0, faces: {}, cur: null };
  const limb = (l1, l2, y, parent, c1, c2, far, kind) => {
    const z = kind === 'foot' ? (far ? -0.016 : 0.016) : (far ? -0.022 : 0.06), th = (kind === 'foot' ? 0.15 : 0.14) * Math.min(fat, 1.25), a = limbC(l1, th, far ? shade(c1) : c1, z); a.position.y = y; const b = limbC(l2, th - 0.02, far ? shade(c2) : c2, z); b.position.y = -l1; a.add(b); parent.add(a);
    if (kind === 'foot') Pt(new THREE.CapsuleGeometry(0.075, 0.15, 4, 10).rotateZ(Math.PI / 2).scale(1, 1, 0.1), far ? shade(shoe) : shoe, 0.08, -l2 - 0.02, z + 0.002, b);
    else Pt(ell(0.09, 0.09), far ? shade(o.skin) : o.skin, 0, -l2 - 0.02, z + 0.002, b, 0.025);
    return [a, b];
  };
  u.legL = limb(0.44, 0.44, 0, body, legU, legL, true, 'foot');
  const torsoP = u.torsoP = new THREE.Group(); body.add(torsoP);
  u.armL = limb(0.33, 0.33, 0.5, torsoP, o.top, o.sleeve === false ? o.skin : o.top, true, 'hand');
  Pt(capG(0.3, 0.4).scale(fat, 1, 1).translate(0, 0.3, 0), o.top, 0, 0, 0, torsoP);
  if (o.stripe) { Pt(new THREE.PlaneGeometry(0.3 * fat, 0.07), o.stripe, 0, 0.38, 0.0174, torsoP, 0); Pt(new THREE.PlaneGeometry(0.025, 0.5), o.stripe, 0.07, 0.3, 0.0176, torsoP, 0); }
  if (o.tie) Pt(poly([[0.03, 0.57], [0.11, 0.57], [0.1, 0.34], [0.07, 0.27], [0.04, 0.34]]), o.tie, 0, 0, 0.019, torsoP, 0.014);
  if (o.belt) { Pt(new THREE.PlaneGeometry(0.3 * fat, 0.08), 0xff3b4a, 0, 0.115, 0.0176, torsoP, 0.012); Pt(new THREE.PlaneGeometry(0.085, 0.085), 0xffd23f, 0.07, 0.115, 0.0195, torsoP, 0.012); }
  if (o.whistle) { u.whistle = new THREE.Group(); torsoP.add(u.whistle); const a = Pt(new THREE.PlaneGeometry(0.014, 0.3), 0x1c1430, 0.02, 0.44, 0.0185, u.whistle, 0); a.rotation.z = -0.35; const b = Pt(new THREE.PlaneGeometry(0.014, 0.3), 0x1c1430, 0.12, 0.44, 0.0185, u.whistle, 0); b.rotation.z = 0.35; Pt(ell(0.055, 0.045), 0xffd23f, 0.07, 0.3, 0.0205, u.whistle, 0.014); }
  if (o.dress) Pt(poly([[-0.17, 0.5], [0.17, 0.5], [0.17, 0.12], [0.36, -0.42], [-0.36, -0.42], [-0.17, 0.12]]), o.dress, 0, 0, 0.026, body);
  u.slate = new THREE.Group(); u.slate.visible = false; torsoP.add(u.slate);
  u.legR = limb(0.44, 0.44, 0, body, legU, legL, false, 'foot');
  const head = u.head = new THREE.Group(); head.position.y = 0.6 + hr * 0.9; torsoP.add(head);
  if (o.hairStyle === 'tails') { Pt(ell(hr * 0.4, hr * 0.42), o.hair, -hr * 1.05, hr * 0.05, 0.008, head); Pt(ell(hr * 0.16, hr * 0.16), 0xff3b8d, -hr * 0.82, hr * 0.42, 0.03, head, 0.012); }
  u.spikes = new THREE.Group(); u.spikes.position.z = 0.012; head.add(u.spikes); u.spk = []; u.spkM = [];
  if (o.spikes) [38, 63, 88, 113, 138, 163].forEach((deg, i) => { const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), len = [1.75, 1.95, 2.05, 1.95, 1.85, 1.65][i] * hr, w = 0.3 * hr, b = 0.72 * hr, sg = new THREE.Group();
    const m = Pt(poly([[c * b + sn * w, sn * b - c * w], [c * len, sn * len], [c * b - sn * w, sn * b + c * w]]), o.hair, 0, 0, i * 0.0004, sg, 0.028); u.spikes.add(sg); u.spk.push(sg); u.spkM.push(m.material); });
  if (o.hairStyle !== 'bald') Pt(ell(hr * 1.06, hr * 1.04), o.hair, -hr * 0.14, hr * 0.14, 0.01, head);
  Pt(ell(hr, hr), o.skin, 0, 0, 0.016, head); Pt(ell(hr * 0.13, hr * 0.11), o.skin, hr * 0.98, -hr * 0.1, 0.014, head, 0.02);
  if (o.rage) { u.rage = flatMat(0xff2010, { transparent: true, opacity: 0, depthWrite: false }); Pt(ell(hr * 0.985, hr * 0.985), u.rage, 0, 0, 0.018, head, 0); }
  if (o.hairStyle === 'bald') Pt(ell(hr * 0.3, hr * 0.34), o.hair, -hr * 0.88, -hr * 0.05, 0.02, head, 0.015);
  else Pt(new THREE.CircleGeometry(hr * 1.02, 20, Math.PI * 0.28, Math.PI * 0.86), o.hair, 0, hr * 0.04, 0.02, head, 0);
  if (o.flat) { const f = u.flat = new THREE.Group(); f.visible = false; head.add(f); Pt(new THREE.CircleGeometry(hr * 1.07, 24, Math.PI * 0.16, Math.PI * 0.92), o.hair, 0, hr * 0.02, 0.024, f, 0.02);
    const p = Pt(new THREE.PlaneGeometry(hr * 0.05, hr * 0.62), 0xfff4d0, hr * 0.36, hr * 0.74, 0.026, f, 0); p.rotation.z = -0.5; Pt(new THREE.RingGeometry(hr * 0.74, hr * 0.84, 12, 1, Math.PI * 0.55, Math.PI * 0.3), 0xffffff, 0, hr * 0.02, 0.026, f, 0); }
  if (o.glasses) { const g = u.glasses = new THREE.Group(); g.visible = false; head.add(g); [0.08, 0.62].forEach(x => { [[0, 0.24, 0.5, 0.06], [0, -0.24, 0.5, 0.06], [-0.23, 0, 0.06, 0.5], [0.23, 0, 0.06, 0.5]].forEach(([dx, dy, w, h]) => Pt(new THREE.PlaneGeometry(hr * w, hr * h), 0x1c1430, (x + dx) * hr, hr * (0.1 + dy), 0.05, g, 0)); }); Pt(new THREE.PlaneGeometry(hr * 0.55, hr * 0.06), 0x1c1430, -hr * 0.42, hr * 0.14, 0.05, g, 0); }
  if (o.cap) { const g = u.capG = new THREE.Group(); head.add(g); Pt(new THREE.CircleGeometry(hr * 1.14, 22, 0, Math.PI), o.cap, 0, hr * 0.3, 0.045, g, 0.028); Pt(new THREE.PlaneGeometry(hr * 0.95, hr * 0.2), o.capBrim ?? shade(o.cap, 0.7), hr * 1.3, hr * 0.38, 0.044, g, 0.026); Pt(ell(hr * 0.12, hr * 0.1), 0xffd23f, 0, hr * 1.42, 0.046, g, 0.014); }
  if (o.moustache) Pt(ell(hr * 0.34, hr * 0.1), o.moustache, hr * 0.42, -hr * 0.24, 0.036, head, 0.01);
  (o.faces ?? ['neutral']).forEach(k => u.faces[k] = faceOf(k, hr, head)); u.cur = Object.values(u.faces)[0]; u.cur.visible = true;
  u.back = Pt(ell(hr * 1.0, hr * 1.0), o.hairStyle === 'bald' ? o.skin : o.hair, 0, 0, 0.04, head, 0); u.back.visible = false;
  u.armR = limb(0.33, 0.33, 0.5, torsoP, o.top, o.sleeve === false ? o.skin : o.top, false, 'hand');
  u.hand = new THREE.Group(); u.hand.position.set(0, -0.36, 0.075); u.armR[1].add(u.hand);
  if (o.kada) { Pt(new THREE.PlaneGeometry(0.2, 0.085), 0xc8d6ea, 0, -0.25, 0.066, u.armR[1], 0.014); u.kadaStar = star(u.armR[1], 0.03, -0.25, 0.09, 0.2); }
  u.blob = blob(0.36 * s * fat); root.add(u.blob); root.visible = false; body.scale.setScalar(s); people.push(root); scene.add(root); return root;
}
// arm = [raise, sideways, elbow]; negative raise = forward / up
function pose(f, p = {}) {
  const u = f.userData, w = p.walk, ph = w ? w[0] : 0, am = w ? (w[1] ?? 1) : 0, cr = p.crouch ?? 0, lie = p.lie ?? 0;
  u.body.position.y = (0.99 - 0.36 * cr) * u.s * (1 - lie) + lie * 0.22 * u.s + (w ? 0.03 * u.s * am * Math.abs(Math.cos(ph)) : 0) + (p.hop ?? 0);
  u.body.rotation.z = lie * Math.PI / 2 + (p.tilt ?? 0);
  u.torsoP.rotation.z = -(p.lean ?? cr * 0.45); u.head.rotation.z = -(p.headPitch ?? 0) * 0.8 + (p.lean ?? cr * 0.45) * 0.6; u.head.scale.setScalar(p.headS ?? 1);
  const leg = (l, sg) => { l[0].rotation.z = 0.55 * am * Math.sin(ph) * sg + cr * 1.15 + (w ? 0 : 0.09 * sg); l[1].rotation.z = -(am * (0.1 + 0.6 * Math.max(0, Math.cos(ph) * sg)) + cr * 2.0); };
  leg(u.legR, 1); leg(u.legL, -1);
  const arm = (a, v, sg) => { a[0].rotation.z = v ? -v[0] : -0.5 * am * Math.sin(ph) * sg + 0.06 * sg; a[1].rotation.z = v ? -(v[2] ?? 0) : 0.25 * am + 0.12; };
  arm(u.armR, p.armR, 1); arm(u.armL, p.armL, -1);
  u.want = (p.face && u.faces[p.face]) || u.cur; u.talk = p.talk ?? 0;
  u.blob.visible = (p.blob ?? true) && !lie; u.yaw = p.headYaw ?? 0;
}
const facing = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
function put(f, x, z, ry = 0, y = 0) { f.visible = true; f.position.set(x, y, z); f.userData.ry = ry; }
function walk(f, pts, u, t, p = {}, pace = 7.5) {
  u = clamp(u); let tot = 0; const ls = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
  let d = u * tot, i = 0; while (i < ls.length - 1 && d > ls[i]) { d -= ls[i]; i++; }
  const a = pts[i], b = pts[i + 1], k = ls[i] ? d / ls[i] : 0, moving = u > 0 && u < 1;
  put(f, lerp(a[0], b[0], k), lerp(a[1], b[1], k), p.ry ?? facing(a[0], a[1], b[0], b[1]), p.y ?? 0);
  pose(f, { ...p, walk: moving ? [t * pace, p.amp ?? 1] : undefined }); return moving;
}
function billboard() {
  people.forEach(f => { if (!f.visible) return; const u = f.userData, yaw = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z), ry = u.ry + u.yaw;
    f.rotation.set(0, yaw, 0); const side = Math.sin(ry) * Math.cos(yaw) - Math.cos(ry) * Math.sin(yaw), toCam = Math.sin(ry) * Math.sin(yaw) + Math.cos(ry) * Math.cos(yaw);
    u.flip = side < -0.18 ? -1 : 1; u.body.scale.set(u.s * u.flip, u.s, u.s);
    const away = toCam < -0.45, fc = u.want ?? u.cur; Object.values(u.faces).forEach(g => g.visible = false); u.back.visible = away; if (!away) { fc.visible = true; fc.userData.mouth.scale.y = 1 + fc.userData.tk * u.talk; } });
}
const talking = (who) => BEAT.lines.some(l => l.who === who && NOW >= l.t0 && NOW <= l.t1) ? 0.55 + 0.45 * Math.sin(NOW * 26) : 0;
const headY = (f) => f.userData.body.position.y + (0.6 + f.userData.hr * 0.9) * f.userData.s;

const SK = [0xf7c59a, 0xe6a878, 0xcf9060, 0xffd7b0], HC = [0x1a1426, 0x2a1a14, 0x3b2416], KF = ['neutral', 'smile', 'laugh', 'scared', 'sad', 'pray', 'side', 'smug'];
const kr = RNG(7), UNI = { top: 0xffffff, bottom: 0x2b3aa0, shorts: true, sleeve: false, tie: 0xff3b4a, belt: true, head: 1.22, faces: KF };
const kid = (i, o = {}) => human({ ...UNI, h: 1.24 + kr() * 0.18, skin: SK[i % 4], hair: HC[i % 3], ...o });
const girl = { dress: 0x2b3aa0, hairStyle: 'tails', belt: false };
const bunty = human({ ...UNI, h: 1.38, head: 1.25, skin: 0xf7c59a, hair: 0x1a1430, spikes: true, flat: true, glasses: true, cap: 0xff3b6b, capBrim: 0xffd23f });
const KIDS = [];
for (let i = 0; i < 20; i++) KIDS.push(i === 3 ? bunty : kid(i, i === 1 || i === 5 ? { spikes: true, hair: i === 1 ? 0x3b2416 : 0x1a1426 } : i === 4 ? { shoes: 0xff7ac0 } : (i % 3 === 2 ? girl : {})));
const HOME = KIDS.map((_, i) => i < 7 ? [(i - 3) * 0.85, 0] : i < 14 ? [(i - 10) * 0.85 + 0.42, -1.1] : [(i - 16.5) * 0.9, -2.2]);
const pappu = KIDS[1], golu = KIDS[5];
const TRACK = { fat: 1.35, skin: 0xe8a878, bottom: 0x1c2a6a, whistle: true, shoes: 0xffffff, faces: ['neutral', 'angry', 'smile', 'scared', 'sad', 'smug', 'laugh'] };
const pt = human({ ...TRACK, h: 1.95, top: 0xff3b30, stripe: 0xffffff, hair: 0x1c1420, cap: 0xffffff, capBrim: 0xff3b30, moustache: 0x1c1420, kada: true, rage: true });
const bigB = human({ ...TRACK, h: 1.85, fat: 1.2, skin: 0xf7c59a, top: 0x19b36b, stripe: 0xffe14a, hair: 0x1a1430, hairStyle: 'bald', cap: 0xff3b6b, capBrim: 0xffd23f, moustache: 0x1a1430 });
// Bunty's extras: sweat, wifi arcs, a bird, a cactus flower, sparkles, the gel tub, the mugshot slate
const BU = bunty.userData, bh = BU.head, bhr = BU.hr;
const sweat = G(); bh.add(sweat); [[-0.5, 0.75], [-0.85, 0.3]].forEach(([x, y]) => Pt(poly([[0, 0.14], [0.07, 0], [0, -0.06], [-0.07, 0]].map(([a, b]) => [a * bhr * 2.2, b * bhr * 2.2])), 0x5fd0ff, x * bhr, y * bhr, 0.06, sweat, 0.012));
const wifi = G(); wifi.position.set(0, 2.25 * bhr, 0.05); bh.add(wifi); const wifiM = [0.22, 0.4, 0.58].map(r => { const m = flatMat(0xff2a6a, { transparent: true }); Pt(new THREE.RingGeometry(r * bhr * 2, (r + 0.085) * bhr * 2, 20, 1, Math.PI * 0.25, Math.PI * 0.5), m, 0, 0, 0, wifi, 0); return m; }); Pt(ell(0.1 * bhr, 0.1 * bhr), 0xff2a6a, 0, 0.12 * bhr, 0, wifi, 0);
const bird = G(); bh.add(bird); { const q = 0.16; Pt(ell(q * 0.62, q * 0.5), 0xffd23f, 0, q * 0.5, 0.05, bird, 0.014); Pt(ell(q * 0.36, q * 0.34), 0xffd23f, q * 0.55, q * 0.95, 0.052, bird, 0.014); Pt(poly([[0, 0.07], [0.3, 0], [0, -0.07]].map(([a, b]) => [a * q, b * q * 1.4])), 0xff7a1a, q * 0.86, q * 0.95, 0.053, bird, 0.01); Pt(ell(q * 0.07, q * 0.08), 0x1c1430, q * 0.62, q * 1.02, 0.056, bird, 0); Pt(ell(q * 0.36, q * 0.24), 0xffa81a, -q * 0.12, q * 0.52, 0.054, bird, 0.01); }
const flower = star(bh, Math.cos(1.1) * 2.0 * bhr, Math.sin(1.1) * 2.0 * bhr, 0.06, 0.09, 0xff5fa8);
const bStars = [[88, 2.1], [38, 1.8], [138, 1.9]].map(([d, r]) => star(bh, Math.cos(d * Math.PI / 180) * r * bhr, Math.sin(d * Math.PI / 180) * r * bhr, 0.07, 0.12, 0xfff7b0));
const gel = G(); gel.visible = false; BU.armL[1].add(gel); Pt(new THREE.PlaneGeometry(0.2, 0.17), 0x3ddc6a, 0.02, -0.44, -0.01, gel, 0.02); Pt(new THREE.PlaneGeometry(0.22, 0.05), 0xffffff, 0.02, -0.34, -0.008, gel, 0.014);
Pt(new THREE.PlaneGeometry(0.94, 0.6), 0x2a2a3a, 0.04, 0.2, 0.1, BU.slate, 0.03);
BU.slate.add(mesh(new THREE.PlaneGeometry(0.9, 0.56), B(0xffffff, { map: label(496, 336, (x, w, h) => { x.fillStyle = '#2a2a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '92px Bangers'; x.fillText('QAIDI No. 420', w / 2, 140); x.fillStyle = '#ffd23f'; x.font = '84px Bangers'; x.fillText('JURM: SPIKES', w / 2, 262); }) }), 0.04, 0.2, 0.104));
// PT sir's extras: the whistle in his hand, the scanner beam, the little oil bottle; grown-up Bunty's bald shine
const PU = pt.userData, pWh = G(); pWh.visible = false; PU.hand.add(pWh); Pt(ell(0.07, 0.055), 0xffd23f, 0.06, 0.02, 0.01, pWh, 0.014); Pt(new THREE.PlaneGeometry(0.1, 0.035), 0xffd23f, 0.14, 0.04, 0.012, pWh, 0.012);
const beam = G(); beam.visible = false; beam.position.set(0.5 * PU.hr, 0.1 * PU.hr, 0.07); PU.head.add(beam); const beamM = flatMat(0xff1a2a, { transparent: true, opacity: 0.4, depthWrite: false });
beam.add(new THREE.Mesh(poly([[0, 0.02], [2.6, 0.34], [2.6, -0.34], [0, -0.02]]), beamM), mesh(new THREE.PlaneGeometry(2.6, 0.03), flatMat(0xffffff, { transparent: true, opacity: 0.8 }), 1.3, 0, 0.002));
const pBot = G(); pBot.visible = false; PU.hand.add(pBot); Pt(new THREE.PlaneGeometry(0.15, 0.3), 0x2a8cff, 0.02, 0.1, 0.01, pBot, 0.018); Pt(new THREE.PlaneGeometry(0.08, 0.07), 0x19c06a, 0.02, 0.29, 0.012, pBot, 0.014); Pt(new THREE.PlaneGeometry(0.15, 0.1), 0xffffff, 0.02, 0.1, 0.014, pBot, 0);
const buckle = star(KIDS[0].userData.torsoP, 0.1, 0.14, 0.08, 0.16, 0xffffff);
const baldStar = star(bigB.userData.head, -0.2 * bigB.userData.hr, 0.75 * bigB.userData.hr, 0.07, 0.2);
const baldShine = Pt(new THREE.RingGeometry(bigB.userData.hr * 0.66, bigB.userData.hr * 0.8, 12, 1, Math.PI * 0.5, Math.PI * 0.32), 0xffffff, 0, 0, 0.022, bigB.userData.head, 0);
// world-space particles: steam puffs and flying oil drops
const dotTex = label(64, 64, (x) => { x.fillStyle = '#1c1430'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 24, 0, 7); x.fill(); });
const puffs = Array.from({ length: 10 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false })); sp.visible = false; scene.add(sp); return sp; });
const drops = Array.from({ length: 12 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffe14a, transparent: true, depthWrite: false })); sp.visible = false; scene.add(sp); return sp; });

// ---------- the school ----------
const world = new THREE.Group(); scene.add(world);
const add = (...m) => { m.forEach(x => world.add(x)); return m[0]; };
scene.background = label(4, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f6be8'); g.addColorStop(0.45, '#35a2ff'); g.addColorStop(0.8, '#a8e4ff'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
scene.fog = new THREE.Fog(0xbfe9ff, 60, 260);
const grassT = T('#4fd03c', ['#3fbb2e', '#74e658', '#46c436'], 70, 70, null, 500), tileT = T('#ffd79c', ['#ffcc88', '#ffe6bc'], 17, 13, (x, s) => { x.fillStyle = '#eeb06a'; x.fillRect(0, 0, s, 2); x.fillRect(0, 0, 2, s); }, 160);
add(rot(mesh(new THREE.PlaneGeometry(280, 280), L(0xffffff, { map: grassT })), -Math.PI / 2));
add(rot(mesh(new THREE.PlaneGeometry(34, 26), L(0xffffff, { map: tileT }), 0, 0.02, -0.5), -Math.PI / 2));
[[-2.6, 0x2fd0ff], [0, 0xff5fa8], [2.6, 0xffe14a]].forEach(([z, c]) => add(rot(mesh(new THREE.PlaneGeometry(22, 0.12), B(c), 0, 0.03, z + 3.4), -Math.PI / 2)));
function win(g, x, y, z, ry = 0, w = 1.5, h = 1.7) { const f = G(box(w + 0.26, h + 0.26, 0.12, 0xffffff, 0, 0, 0), mesh(new THREE.PlaneGeometry(w, h), B(0x58c8ff), 0, 0, 0.07), mesh(new THREE.PlaneGeometry(w * 0.3, h), B(0xb4ecff), -w * 0.2, 0, 0.072), box(0.09, h, 0.14, 0xffffff, 0, 0, 0.02), box(w, 0.09, 0.14, 0xffffff, 0, 0.1, 0.02), box(w + 0.5, 0.16, 0.34, 0xff4a5a, 0, -h / 2 - 0.2, 0.1)); f.position.set(x, y, z); f.rotation.y = ry; g.add(f); }
const sch = new THREE.Group(); world.add(sch);
sch.add(box(26, 8, 6, 0xffd23f, 0, 4, -14), box(26.3, 0.9, 6.3, 0xff7a2f, 0, 0.45, -14), box(26.3, 0.28, 6.3, 0xffffff, 0, 4.2, -14), box(27.2, 0.5, 7.2, 0xff3b4a, 0, 8.25, -14), box(26.6, 0.5, 6.6, 0xffffff, 0, 8.7, -14));
for (let i = 0; i < 7; i++) { const x = -11 + i * 3.667; if (i !== 3) win(sch, x, 2.6, -10.94); win(sch, x, 6.2, -10.94); }
sch.add(box(2.8, 3.3, 0.2, 0x2f6bff, 0, 1.65, -10.9), box(0.08, 3.3, 0.24, 0xffffff, 0, 1.65, -10.88), box(3.3, 0.3, 0.3, 0xffffff, 0, 3.4, -10.85), box(5, 0.35, 2.6, 0xff3b4a, 0, 3.75, -9.8), cyl(0.2, 0.2, 3.6, 0xffffff, -2.1, 1.8, -8.8), cyl(0.2, 0.2, 3.6, 0xffffff, 2.1, 1.8, -8.8), box(5.4, 0.2, 3.2, 0xe8e0d0, 0, 0.1, -9.6), box(4.8, 0.2, 2.6, 0xf4ecdc, 0, 0.3, -9.8));
sch.add(mesh(new THREE.PlaneGeometry(9, 1.25), B(0xffffff, { map: label(1152, 160, (x, w, h) => { x.fillStyle = '#2456e0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '112px Bangers'; x.fillText('SUNRISE PUBLIC SCHOOL', w / 2, 120); }) }), 0, 4.95, -10.93));
sch.add(box(5.4, 3.4, 6.4, 0xffe680, 0, 10.6, -14), box(5.8, 0.3, 6.8, 0xff3b4a, 0, 12.4, -14), rot(mesh(new THREE.ConeGeometry(4.3, 2.6, 4), L(0xff3b4a), 0, 13.8, -14), 0, Math.PI / 4));
const clock = G(mesh(new THREE.CircleGeometry(1.25, 28), B(0x1c1430), 0, 0, 0), mesh(new THREE.CircleGeometry(1.08, 28), B(0xffffff), 0, 0, 0.01), rot(mesh(new THREE.PlaneGeometry(0.12, 0.7), B(0x1c1430), -0.2, 0.22, 0.02), 0, 0, 0.75), rot(mesh(new THREE.PlaneGeometry(0.08, 0.95), B(0xff3b4a), 0.3, -0.3, 0.02), 0, 0, -2.35)); clock.position.set(0, 10.6, -10.78); sch.add(clock);
[[-1, 0xff7f6a], [1, 0x2fd6c0]].forEach(([sg, c]) => { sch.add(box(6, 8, 13, c, sg * 16.2, 4, -4.5), box(6.3, 0.9, 13.3, 0xff7a2f, sg * 16.2, 0.45, -4.5), box(7, 0.5, 14, 0xff3b4a, sg * 16.2, 8.25, -4.5));
  for (let j = 0; j < 3; j++) for (const y of [2.6, 6.2]) win(sch, sg * 13.14, y, -8.4 + j * 3.6, -sg * Math.PI / 2); for (const y of [2.6, 6.2]) win(sch, sg * 16.2, y, 2.06, 0, 2.2); });
function tree(x, z, s = 1, c = 0x2fc24a) { const g = G(cyl(0.2, 0.3, 2, 0x9a5a2a, 0, 1, 0), sph(1.45, c, 0, 3, 0), sph(1.05, 0x5fe06a, 0.75, 3.7, 0.3), sph(0.95, 0x25ad42, -0.85, 2.7, 0.2)); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g); }
[[-10.5, -8.6, 1.25], [10.5, -8.6, 1.3], [-21, -1, 1.5], [21, -2, 1.4], [-23, 8, 1.6], [23, 9, 1.5], [-9, 15.5, 1.4], [9, 16, 1.5], [0, 18, 1.7]].forEach(([x, z, s]) => tree(x, z, s));
for (let i = 0; i < 12; i++) tree(-44 + i * 8 + (i % 2) * 2, -24 - (i % 3) * 3, 1.8 + (i % 3) * 0.4, i % 2 ? 0x2fc24a : 0x3ad05a);
for (let i = 0; i < 9; i++) { const x = -11 + i * 2.75; if (Math.abs(x) < 3) continue; add(sph(0.55, 0x35c24a, x, 0.45, -10.2), sph(0.14, [0xff5fa8, 0xffe14a, 0xffffff][i % 3], x + 0.2, 0.9, -9.95), sph(0.12, [0xffe14a, 0xff5fa8, 0xff8a3d][i % 3], x - 0.25, 0.75, -9.8)); }
add(rot(sph(40, 0x62d86e, -42, -6, -85), 0, 0, 0), sph(34, 0x4fca62, 30, -8, -90), sph(26, 0x7be07a, 70, -6, -80));
add(box(70, 1.8, 0.4, 0xff9a4a, 0, 0.9, 13), box(70, 0.25, 0.6, 0xffffff, 0, 1.9, 13));
// bunting, flag, basketball hoop
const BC = [0xff3b6b, 0xffd23f, 0x2fd0ff, 0x7a5cff, 0x3ddc6a, 0xff8a3d], flags = [];
[[-4.6, 6.4], [-8.6, 7.2]].forEach(([z, y0], r) => { for (let i = 0; i <= 24; i++) { const k = i / 24, m = new THREE.Mesh(poly([[-0.34, 0], [0.34, 0], [0, -0.72]]), B(BC[(i + r * 2) % 6], { side: THREE.DoubleSide })); m.position.set(-13 + 26 * k, y0 - 1.5 * Math.sin(Math.PI * k), z); world.add(m); flags.push(m); } });
add(cyl(0.07, 0.09, 9, 0xe8e8f0, 7.2, 4.5, -8.4), sph(0.16, 0xffd23f, 7.2, 9.05, -8.4));
const flagG = new THREE.PlaneGeometry(2.3, 1.4, 12, 1), flagP = flagG.attributes.position.array.slice();
add(mesh(flagG, B(0xffffff, { side: THREE.DoubleSide, map: label(230, 140, (x, w, h) => { x.fillStyle = '#2456e0'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(w / 2, h / 2, 34, 0, 7); x.fill(); x.fillStyle = '#ff3b4a'; x.fillRect(0, 0, w, 16); x.fillRect(0, h - 16, w, 16); }) }), 8.4, 8.2, -8.4));
add(cyl(0.09, 0.09, 3.6, 0x2a2a3a, -11.2, 1.8, -5.5), box(0.1, 1.3, 1.9, 0xffffff, -11.0, 3.6, -5.5), box(0.12, 0.5, 0.7, 0xff3b4a, -10.96, 3.4, -5.5), rot(mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 20), L(0xff7a1a), -10.6, 3.2, -5.5), Math.PI / 2));
const CT = label(256, 128, (x) => { x.fillStyle = '#fff'; [[70, 80, 44], [120, 62, 56], [176, 80, 46], [100, 90, 40], [150, 92, 40]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }); });
const clouds = [[-30, 30, -110, 44], [18, 40, -120, 56], [52, 26, -105, 38], [-62, 44, -115, 50], [0, 58, -130, 60], [-12, 22, -100, 30]].map(([x, y, z, s]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: CT, transparent: true, depthWrite: false, fog: false })); sp.scale.set(s, s / 2, 1); sp.position.set(x, y, z); sp.userData.x = x; world.add(sp); return sp; });
world.add(glow(0xfff2a0, 70, -38, 62, -120, 0.9));
// the mugshot wall (far to the side) and the "studio" with spinning rays for hero shots (high above the school)
const MX = 60, SX = -70, SY = 40;
add(mesh(new THREE.PlaneGeometry(7, 6), B(0xffffff, { map: label(700, 600, (x, w, h) => { x.fillStyle = '#ffe9a8'; x.fillRect(0, 0, w, h); x.fillStyle = '#1c1430'; x.font = '34px Bangers'; for (let i = 0; i < 12; i++) { const y = h - i * 50 - 20; x.fillRect(0, y, w, i % 2 ? 3 : 6); if (i % 2 === 0) { x.fillText(String(60 + i * 10), 16, y - 8); x.fillText(String(60 + i * 10), w - 70, y - 8); } } }) }), MX, 3, -0.6));
const rays = mesh(new THREE.CircleGeometry(14, 48), B(0xffc428, { fog: false, map: label(512, 512, (x, w) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); x.fillStyle = '#d2d2d2'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.beginPath(); x.moveTo(256, 256); x.arc(256, 256, 400, a, a + Math.PI / 12); x.fill(); } }) }), SX, SY, -5); add(rays);
const bottle = G(cyl(0.34, 0.34, 0.95, 0x2a8cff, 0, 0, 0, 20), cyl(0.14, 0.34, 0.22, 0x2a8cff, 0, 0.585, 0, 20), cyl(0.15, 0.15, 0.2, 0x19c06a, 0, 0.78, 0, 20),
  mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.6, 24, 1, true, -1.1, 2.2), L(0xffffff, { map: label(512, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#19c06a'; x.fillRect(0, 0, w, 26); x.fillRect(0, h - 26, w, 26); x.fillStyle = '#8a4a1a'; x.beginPath(); x.arc(256, 96, 50, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(256, 96, 32, 0, 7); x.fill(); x.fillStyle = '#2456e0'; x.textAlign = 'center'; x.font = '70px Bangers'; x.fillText('NARIYAL TEL', w / 2, 216); }) }), 0, -0.05, 0),
  rot(mesh(new THREE.CapsuleGeometry(0.2, 2.4, 4, 12), L(0xff3b30), 0.1, -2.1, -0.1), 0, 0, 0.06), sph(0.3, 0xe8a878, 0, -0.62, 0.05));
bottle.position.set(SX, SY, 0); add(bottle); const botGlow = glow(0xffffff, 5, SX, SY + 0.2, -1.5, 0.9); add(botGlow);

// ---------- staging ----------
function cam(px, py, pz, tx, ty, tz, fov = 45, sway = 1) {
  const s = 0.012 * sway; camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(px + Math.sin(NOW * 0.7) * s, py + Math.sin(NOW * 0.9 + 1) * s, pz); camera.up.set(0, 1, 0); camera.lookAt(tx + Math.sin(NOW * 0.5 + 2) * s * 2, ty + Math.cos(NOW * 0.6) * s * 2, tz);
}
const camL = (a, b, u, f = smooth) => { const k = f(u); cam(...a.map((v, i) => lerp(v, b[i] ?? v, k))); };
const shake = (a) => { if (a > 0) { camera.position.x += Math.sin(NOW * 61) * a; camera.position.y += Math.cos(NOW * 73) * a; } };
const hit = (t, t0, len = 0.5) => (t >= t0 && t < t0 + len) ? 1 - (t - t0) / len : 0;      // decaying impulse after t0
const elastic = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 + Math.pow(2, -9 * x) * Math.sin((x * 6 - 0.4) * Math.PI) * 1.25 - Math.pow(2, -9 * x) * 0.0 - (1 - x) * 0;
const P = { pray: { armR: [-0.9, 0, -1.9], armL: [-0.85, 0, -1.9] }, hips: { armR: [0.55, 0, -1.8], armL: [0.5, 0, -1.8] }, hands: { armR: [-1.45, 0, 0.1], armL: [-1.38, 0, 0.1] }, blow: { armR: [-1.0, 0, -2.0] } };
let FLASH = 0, FLASHC = '#fff';
function reset() {
  people.forEach(p => { p.visible = false; const u = p.userData; u.want = null; u.yaw = 0; u.flip = 1; u.talk = 0; u.slate.visible = false; if (u.whistle) u.whistle.visible = true; if (u.capG) { u.capG.visible = true; u.capG.position.set(0, 0, 0); u.capG.rotation.z = 0; } });
  stars.forEach(s => s.visible = false); puffs.forEach(s => s.visible = false); drops.forEach(s => s.visible = false);
  BU.spikes.visible = true; BU.spikes.scale.setScalar(1); BU.spk.forEach(g => g.scale.setScalar(1)); BU.spkM.forEach(m => m.color.set(0x1a1430)); BU.flat.visible = false; BU.glasses.visible = false; BU.capG.visible = false;
  sweat.visible = wifi.visible = bird.visible = gel.visible = pWh.visible = beam.visible = pBot.visible = false; PU.rage.opacity = 0; baldShine.visible = false;
  FLASH = 0; FLASHC = '#fff'; amb.intensity = 1.9;
  flags.forEach((m, i) => m.rotation.x = 0.25 * Math.sin(NOW * 2.4 + i * 0.9)); clouds.forEach((c, i) => c.position.x = c.userData.x + NOW * (0.25 + i * 0.05));
  const fp = flagG.attributes.position; for (let i = 0; i < fp.count; i++) { const x = flagP[i * 3] + 1.15; fp.array[i * 3 + 2] = Math.sin(x * 2.6 - NOW * 5) * 0.14 * x / 2.3; } fp.needsUpdate = true;
  rays.rotation.z = NOW * 0.35; bottle.visible = false; botGlow.visible = false;
}
// the whole class in its rows; face / extra pose can depend on the kid's index
function crowd(face = 'neutral', extra = () => ({}), skip = []) {
  KIDS.forEach((k, i) => { if (skip.includes(k)) return; put(k, HOME[i][0], HOME[i][1], 0); pose(k, { face: typeof face === 'function' ? face(i) : face, lean: 0.03 * Math.sin(NOW * 1.6 + i * 1.7), ...extra(i) }); });
}
const laughing = (i) => ({ hop: Math.abs(Math.sin(NOW * 9 + i * 1.3)) * 0.07, armR: i % 2 ? [-1.3, 0, -0.4] : undefined });
const spikes = (k) => { BU.spikes.scale.setScalar(Math.max(k, 0.01)); BU.spikes.visible = k > 0.42; };
function steam(f, t, amt = 1) { const u = f.userData; puffs.forEach((sp, j) => { const life = (t * 0.8 + j / puffs.length) % 1, sd = j % 2 ? 1 : -1; sp.visible = true; sp.position.set(f.position.x + sd * (0.26 + life * 0.25) * u.s, headY(f) + 0.12 + life * 0.75, f.position.z + 0.1); sp.scale.setScalar((0.12 + life * 0.3) * amt); sp.material.opacity = (1 - life) * 0.95; }); }
function splash(x, y, z, t) { drops.forEach((sp, j) => { const life = (t * 1.6 + j / drops.length) % 1, a = j * 2.4, v = 1.2 + (j % 3) * 0.4; sp.visible = true; sp.position.set(x + Math.cos(a) * v * life * 0.7, y + Math.abs(Math.sin(a)) * v * life - 1.6 * life * life, z + 0.15); sp.scale.setScalar(0.07 + (j % 3) * 0.02); sp.material.opacity = 1 - life * life; }); }
const studio = (c) => { rays.material.color.set(c); };

// ---------- shots: one per narration beat. t = seconds into the beat, d = its length, l(k) = start of line k, e(k) = its end ----------
const SHOT = {
  title(t, d) { crowd('pray', () => P.pray); camL([0, 10, 17, 0, 5.5, -11, 46], [0, 5.2, 11.5, 0, 5.2, -11, 46], t / d); },
  intro(t, d, l) { const a = l(1) - 0.45;
    if (t < a) { crowd(i => i === 3 ? 'side' : 'pray', (i) => ({ ...P.pray, headYaw: 0 })); camL([-0.9, 2.7, 3.6, -0.45, 0.95, -0.9, 38], [0.8, 2.7, 3.5, 0.4, 0.95, -0.9, 38], t / a, x => x); }
    else { const k = t - a, z = smooth(seg(t, l(1) + 1.75, l(1) + 2.05)), bl = k > 0.1 && k < 0.95; crowd('scared', (i) => ({ hop: hit(t, a + 0.1, 0.4) * 0.12 }));
      put(pt, 0, 3.0, 0); pose(pt, { face: 'angry', ...(k < 1.2 ? P.blow : P.hips), headS: bl ? 1.05 + 0.03 * Math.sin(NOW * 40) : 1, talk: z }); pWh.visible = k < 1.2; PU.whistle.visible = k >= 1.2; PU.rage.opacity = 0.35 * z;
      cam(0.3, 0.5, 5.9, -0.1, lerp(1.45, 1.8, z), 3.0, lerp(56, 36, z)); shake(0.02 * (bl ? 1 : 0) + 0.05 * hit(t, l(1) + 1.9, 0.6)); } },
  checks(t, d, l) { const hs = t >= l(2) - 0.2 && t < l(3) - 0.2;
    crowd(i => i === 4 && t < l(1) - 0.2 ? 'side' : 'neutral', () => hs ? P.hands : {}, [bunty]); put(bunty, 0, 0, 0); pose(bunty, { face: t > l(4) - 0.1 ? 'smug' : 'neutral', ...(hs ? P.hands : {}) });
    if (t < l(1) - 0.2) camL([0.2, 0.3, 2.2, 0.75, 0.2, 0, 30], [0.95, 0.3, 2.0, 0.85, 0.2, 0, 30], t / l(1));
    else if (t < l(2) - 0.2) { pose(KIDS[0], { armR: [0.7, 0, 0.3], armL: [0.7, 0, 0.3] }); camL([-2.3, 0.85, 2.6, -2.5, 0.82, 0, 30], [-2.45, 0.85, 2.1, -2.5, 0.82, 0, 30], seg(t, l(1) - 0.2, l(2) - 0.2)); twinkle(buckle, 0, 1, 9); }
    else if (hs) camL([-2.1, 1.02, 1.5, 0.7, 0.95, 0.2, 34], [-1.8, 1.02, 1.4, 1.0, 0.95, 0.2, 34], seg(t, l(2), l(3)));
    else if (t < l(4) - 0.1) camL([0.45, 0.35, 2.5, 0, 0.3, 0, 32], [0.45, 0.95, 2.5, 0, 1.1, 0, 32], seg(t, l(3) - 0.2, l(4) - 0.15), x => x * x);
    else { const z = elastic(seg(t, l(4) - 0.1, l(4) + 0.5)); cam(0.4, 0.9, lerp(3.4, 2.5, z), 0.02, 1.68, 0, 40); bStars.forEach((s, i) => twinkle(s, i * 2.1, 1, 7)); shake(0.03 * hit(t, l(4), 0.5)); } },
  bunty(t, d, l) { const a = l(1) - 0.2, b = l(2) - 0.2;
    if (t < a) { crowd(i => i % 2 ? 'smile' : 'neutral', () => ({}), [bunty]); put(bunty, 0, 1.3, 0.25); pose(bunty, { face: 'smug', ...P.hips, lean: -0.06 }); bStars.forEach((s, i) => twinkle(s, i * 2.1, 1, 7)); camL([-0.8, 0.55, 3.7, 0, 1.2, 1.3, 40], [0.6, 0.65, 3.3, 0, 1.3, 1.3, 36], t / a); }
    else if (t < b) { studio(0xff6fb5); const bo = [l(1) + 1.3, l(1) + 2.1, l(1) + 2.9], rub = t < bo[2] + 0.3; put(bunty, SX, 0, 0.2, SY - 1.3); gel.visible = true;
      pose(bunty, { blob: false, face: t > bo[2] + 0.3 ? 'smug' : 'smile', armR: rub ? [-2.8 + 0.14 * Math.sin(t * 22), 0, -0.55 + 0.3 * Math.cos(t * 22)] : P.hips.armR, armL: [-0.7, 0, -1.4], headPitch: rub ? 0.08 * Math.sin(t * 22) : 0 });
      BU.spk.forEach((g, i) => g.scale.setScalar(Math.max(0.3, 0.3 + 0.7 * elastic(seg(t, bo[i >> 1], bo[i >> 1] + 0.55))))); if (!rub) bStars.forEach((s, i) => twinkle(s, i * 2.1, 1, 7));
      camL([SX + 0.15, SY + 0.05, 3.3, SX, SY + 0.1, 0, 38], [SX + 0.15, SY + 0.1, 2.9, SX, SY + 0.2, 0, 38], seg(t, a, b)); }
    else { const k = t - b, land = smooth(seg(k, 1.3, 1.9)); crowd('neutral', () => ({}), [bunty]); put(bunty, 0, 0.6, 0.2); pose(bunty, { face: 'smug', ...P.hips }); wifi.visible = true; wifiM.forEach((m, i) => m.opacity = (Math.floor(k * 4) % 4) > i ? 1 : 0.18);
      bird.visible = k > 1.3; bird.position.set(Math.cos(2.41) * 1.85 * bhr - (1 - land) * 0.5, Math.sin(2.41) * 1.85 * bhr - 0.02 + (1 - land) * 0.9 + (land >= 1 ? Math.abs(Math.sin(k * 6)) * 0.02 : 0), 0);
      camL([0.5, 0.9, 2.9, 0, 1.45, 0.6, 40], [0.3, 0.45, 2.1, -0.05, 1.85, 0.6, 44], seg(k, 0, 1.2)); } },
  ptsir(t, d, l) { const a = l(1) - 0.25, b = l(2) - 0.25, c = l(3) - 0.25; crowd(t > 0.5 ? 'scared' : 'neutral', () => ({}));
    if (t < a) { const st = [0.55, 1.15, 1.75, 2.35]; walk(pt, [[-3.6, 1.3], [-0.5, 1.3]], seg(t, 0.2, 2.65), t, { face: 'angry', armR: [0.5, 0, -1.8], armL: [0.5, 0, -1.8] }, 10.5); cam(pt.position.x + 1.9, 0.4, 4.4, pt.position.x + 0.1, 1.4, 1.3, 46); shake(0.06 * Math.max(...st.map(s => hit(t, s, 0.3)))); }
    else if (t < b) { const bl = t > l(1) + 1.25 && t < l(1) + 2.0; put(pt, -0.5, 1.3, Math.PI / 2); pose(pt, { face: 'angry', ...P.blow, headS: bl ? 1.06 + 0.03 * Math.sin(NOW * 40) : 1 }); pWh.visible = true; PU.whistle.visible = false; camL([-0.1, 1.75, 3.6, -0.4, 1.85, 1.3, 34], [0.0, 1.8, 3.2, -0.38, 1.9, 1.3, 34], seg(t, a, b)); shake(bl ? 0.015 : 0); }
    else if (t < c) { put(pt, -0.5, 1.3, Math.PI / 2); pose(pt, { face: 'smug', armR: [-1.25, 0, -1.75], armL: [0.5, 0, -1.8] }); PU.kadaStar.visible = true; PU.kadaStar.scale.setScalar(0.2 * (0.35 + 0.65 * Math.abs(Math.sin(t * 7))) * smooth(seg(t, l(2) + 0.9, l(2) + 1.3))); PU.kadaStar.rotation.z = t * 2; camL([0.5, 1.8, 4.5, -0.1, 1.9, 1.3, 34], [0.4, 1.8, 4.1, -0.05, 1.95, 1.3, 34], seg(t, b, c)); }
    else { const k = t - c, lock = k > 2.75, sw = lock ? -0.36 : lerp(0.25, -0.75, 0.5 - 0.5 * Math.cos(k * 3.2)); put(pt, -0.95, 0.9, Math.PI / 2); pose(pt, { face: 'angry', ...P.hips, lean: 0.12 }); beam.visible = k > 0.5; beam.rotation.z = sw; beamM.opacity = lock ? 0.35 + 0.3 * (Math.sin(NOW * 30) > 0) : 0.4;
      if (lock) { FLASH = 0.22 * (Math.sin(NOW * 30) > 0 ? 1 : 0); FLASHC = '#ff1030'; pose(bunty, { face: 'scared', hop: hit(k, 2.75, 0.3) * 0.15 }); }
      camL([0.5, 1.5, 4.9, -0.35, 1.55, 0.4, 44], [0.4, 1.5, 4.5, -0.35, 1.55, 0.4, 44], seg(k, 0, 3)); } },
  caught(t, d, l) { const a = l(1) - 0.25, b = l(2) - 0.25, cac = t > l(0) + 1.75 && t < a;
    crowd('scared', () => ({}), [bunty]); put(bunty, 0.5, 0.7, -Math.PI / 2);
    if (t < a) { put(pt, -0.8, 0.8, Math.PI / 2); pose(pt, { face: 'angry', lean: 0.2, armR: [-2.3 + 0.06 * Math.sin(t * 14), 0, 0.1], armL: [0.5, 0, -1.8], talk: talking('p') }); pose(bunty, { face: 'scared' });
      if (cac) { BU.spkM.forEach(m => m.color.set(0x2fbf4f)); twinkle(flower, 0, 1, 0); flower.scale.setScalar(0.09 * elastic(seg(t, l(0) + 1.75, l(0) + 2.2))); flower.visible = true; }
      camL([0.1, 1.35, 5.2, -0.15, 1.5, 0.75, 38], [0.0, 1.4, 4.7, -0.15, 1.5, 0.75, 38], t / a); }
    else if (t < b) { put(pt, -0.62, 0.8, Math.PI / 2); pose(pt, { face: 'angry', lean: 0.28, ...P.hips }); pose(bunty, { face: 'smile', talk: talking('b'), headPitch: 0.05 * Math.sin(t * 9) }); sweat.visible = true; sweat.position.y = -((t * 0.5) % 0.4) * bhr;
      camL([1.1, 1.4, 2.7, 0.4, 1.45, 0.7, 34], [1.0, 1.4, 2.5, 0.4, 1.45, 0.7, 34], seg(t, a, b)); }
    else { const r = smooth(seg(t, b, l(2) + 2.0)); put(pt, -0.5, 0.8, 0.5); pose(pt, { face: 'angry', lean: 0.1, ...P.hips, tilt: 0.03 * r * Math.sin(t * 30), talk: talking('p'), headS: 1 + 0.14 * r }); PU.rage.opacity = 0.75 * r; pose(bunty, { face: 'scared', crouch: 0.25 * r }); sweat.visible = true;
      if (r > 0.45) steam(pt, t, r); camL([-0.1, 1.0, 3.6, -0.45, 1.75, 0.8, 44], [-0.2, 0.9, 3.0, -0.45, 1.95, 0.8, 40], seg(t, b, d)); shake(0.035 * r); } },
  parade(t, d, l) { const a = l(1) - 0.25, b = l(2) - 0.3, trio = [pappu, bunty, golu];
    if (t < a) { crowd(i => i % 2 ? 'smile' : 'laugh', (i) => i % 2 ? {} : laughing(i), trio); trio.forEach((k, j) => { const i = [1, 3, 5][j]; walk(k, [[HOME[i][0], 0], [(j - 1) * 0.95, 1.9]], seg(t, 0.3 + j * 0.25, 1.9 + j * 0.25), t, { face: 'sad', headPitch: 0.5, ry: 0 }, 9); });
      put(pt, 2.3, 1.2, -Math.PI / 2); pose(pt, { face: 'angry', armR: [-1.5, 0, 0], armL: [0.5, 0, -1.8] }); camL([-0.4, 3.4, 6.4, 0, 0.9, 0.9, 42], [0, 3.0, 5.9, 0, 0.95, 1.0, 42], t / a); }
    else if (t < b) { const u = seg(t, a, b), x0 = lerp(-2.6, 2.2, u); crowd('laugh', laughing, trio); trio.forEach((k, j) => { put(k, x0 - j * 0.95 + 0.95, 2.0, Math.PI / 2); pose(k, { face: 'sad', headPitch: 0.55, walk: [t * 10 + j * 2, 0.8], armR: [0.5, 0, 0.6], armL: [0.5, 0, 0.6] }); });
      put(pt, x0 - 2.3, 2.1, Math.PI / 2); pose(pt, { face: 'smile', walk: [t * 10, 1.1], armR: [-2.2, 0, -0.4] }); camL([x0 + 0.5, 1.25, 6.4, x0 - 0.2, 1.05, 1.2, 44], [x0 + 0.5, 1.25, 6.4, x0 - 0.2, 1.05, 1.2, 44], 0); }
    else { const f1 = l(2) + 1.4, f2 = l(2) + 2.85, side = t > f2 - 0.45; put(bunty, MX, 0, side ? Math.PI / 2 : 0); pose(bunty, { face: 'sad', armR: [0.3, 0, -0.9], armL: [0.3, 0, -0.9], blob: false }); BU.slate.visible = true;
      FLASH = Math.max(hit(t, f1, 0.35), hit(t, f2, 0.35)); camL([MX + 0.1, 1.2, 3.5, MX + 0.05, 1.22, 0, 36], [MX + 0.1, 1.25, 3.1, MX + 0.05, 1.25, 0, 36], seg(t, b, d)); } },
  oil(t, d, l) { const a = l(1) - 0.3, b = l(2) - 0.35, c = l(3) - 0.15;
    if (t < a) { const r = smooth(seg(t, 1.0, 2.8)); crowd('scared', () => ({}), [bunty]); put(bunty, 0.4, 0.7, -Math.PI / 2); pose(bunty, { face: 'scared' }); sweat.visible = true; put(pt, -0.62, 0.8, Math.PI / 2); pose(pt, { face: 'smug', armR: [0.9 * r, 0, -0.6 * r], armL: [0.5, 0, -1.8], lean: -0.05 * r }); camL([0.1, 1.45, 4.8, -0.15, 1.55, 0.75, 38], [-0.1, 1.6, 3.4, -0.3, 1.8, 0.75, 38], t / a); }
    else if (t < b) { const k = t - a, up = elastic(seg(k, 0.1, 0.9)); studio(0xffc428); bottle.visible = botGlow.visible = true; bottle.position.set(SX, SY - 2.6 + 2.5 * up, 0); bottle.rotation.set(0, 0.35 * Math.sin(k * 2.2), 0.08 * Math.sin(k * 3)); botGlow.position.y = bottle.position.y + 0.2; botGlow.scale.setScalar(4.5 + 0.6 * Math.sin(k * 5));
      camL([SX, SY + 0.05, 4.6, SX, SY + 0.05, 0, 40, 0], [SX, SY + 0.05, 3.9, SX, SY + 0.05, 0, 40, 0], seg(t, a, b)); }
    else if (t < c) { const k = t - b, sq = smooth(seg(k, 0.7, 2.9)), w = Math.sin(t * 24); crowd('scared', () => ({}), [bunty]); put(bunty, 0.25, 0.7, 0.2); spikes(1 - sq); BU.flat.visible = sq > 0.58;
      pose(bunty, { face: 'scared', headPitch: 0.12 * w, tilt: 0.03 * w, crouch: 0.12 + 0.05 * w }); put(pt, -0.42, 0.8, Math.PI / 2); pose(pt, { face: 'angry', lean: 0.32, armR: [-1.35 + 0.16 * w, 0, 0.25 - 0.2 * w], armL: [-1.25 - 0.16 * w, 0, 0.2 + 0.2 * w] });
      if (k > 0.4) splash(0.25, headY(bunty) + 0.2, 0.7, t); camL([0.3, 1.25, 4.3, -0.05, 1.4, 0.75, 38], [0.2, 1.3, 3.9, -0.05, 1.4, 0.75, 38], seg(t, b, c)); shake(0.012); }
    else { const k = t - c, z = elastic(seg(k, 0, 0.6)); crowd(i => i % 2 ? 'laugh' : 'smile', (i) => i % 2 ? laughing(i) : {}, [bunty]); put(bunty, 0.25, 1.0, 0.2); spikes(0); BU.flat.visible = true; BU.glasses.visible = k > 0.25; pose(bunty, { face: 'sad', armR: [0.2, 0, 0.1], armL: [0.2, 0, 0.1] });
      put(pt, -0.75, 0.4, 0.3); pose(pt, { face: 'smile', armR: [-2.3, 0, -0.5], armL: [0.5, 0, -1.8] }); bStars.forEach((s, i) => twinkle(s, i * 2.1, k < 1.6 ? 0.7 : 0, 8)); bStars[0].position.y = 1.0 * bhr; bStars[1].position.y = 0.8 * bhr; bStars[2].position.y = 0.9 * bhr;
      cam(0.5, 1.25, lerp(3.6, 2.9, z), 0.15, 1.38, 1.0, 36); } },
  cap(t, d, l) { const a = l(1) - 0.5, b = l(2) - 0.25, c = l(3) - 0.3, bo = l(3) - 0.25, f = e_(3) + 0.2;
    BU.capG.visible = true; spikes(0.3);
    if (t < a) { crowd(i => i === 2 || i === 4 ? 'side' : 'neutral', () => ({}), [bunty]); put(bunty, 0, 0, 0); pose(bunty, { face: 'side', tilt: 0.04 * Math.sin(t * 5), headPitch: -0.05, armR: [0.4, 0, 0.3], armL: [0.4, 0, 0.3] }); camL([-0.7, 1.25, 3.0, 0, 1.3, 0, 38], [0.25, 1.3, 2.5, 0, 1.4, 0, 38], t / a); }
    else if (t < b) { crowd('scared', () => ({}), [bunty]); put(bunty, 0.5, 0.7, -Math.PI / 2); pose(bunty, { face: 'scared', hop: hit(t, l(1), 0.3) * 0.12 }); put(pt, -0.8, 0.8, Math.PI / 2); pose(pt, { face: 'angry', lean: 0.2, armR: [-2.3 + 0.06 * Math.sin(t * 14), 0, 0.1], armL: [0.5, 0, -1.8], talk: talking('p') }); PU.rage.opacity = 0.4;
      camL([0.1, 1.35, 5.2, -0.15, 1.5, 0.75, 38], [0.0, 1.4, 4.7, -0.15, 1.5, 0.75, 38], seg(t, a, b)); shake(0.03 * hit(t, l(1), 0.5)); }
    else if (t < 8.6) { const lift = smooth(seg(t, b + 0.3, c)), k = t - bo, out = k > 0; crowd(out ? 'scared' : 'neutral', () => ({}), [bunty]); put(bunty, 0, 0.7, 0.15);
      if (!out) { BU.capG.position.y = lift * 0.22 * bhr; pose(bunty, { face: 'scared', armR: [2.2 + 0.25 * lift, 0, 1.25], armL: [0.3, 0, 0.2] }); sweat.visible = true; }
      else { const s = 0.3 + 1.45 * elastic(seg(k, 0, 0.9)); spikes(s); BU.spikes.scale.set(s * 0.85, s * 1.15, 1); BU.capG.position.set(k * 1.6 * bhr, (0.3 + k * 9 - 6.5 * k * k) * bhr, 0); BU.capG.rotation.z = -k * 7; pose(bunty, { face: k > 0.5 ? 'laugh' : 'scared', armR: [2.55, 0, 0.3], armL: [2.9, 0, 0.3], hop: hit(k, 0, 0.4) * 0.1 }); bStars.forEach((st, i) => { st.position.y *= 1; twinkle(st, i * 2.1, k > 0.5 ? 1 : 0, 8); }); }
      camL([0.4, 1.0, 3.3, 0.02, 1.5, 0.7, 40], [0.45, 0.85, out ? 3.5 : 2.7, 0.02, out ? 1.7 : 1.55, 0.7, out ? 46 : 40], out ? elastic(seg(k, 0, 0.5)) : seg(t, b, c)); shake(0.04 * hit(k, 0, 0.5)); }
    else { const fall = smooth(seg(t, f, f + 0.75)); spikes(1.75); BU.spikes.scale.set(1.5, 2.0, 1); BU.capG.visible = false; crowd('laugh', laughing, [bunty]); put(bunty, 0.75, 0.7, -Math.PI / 2); pose(bunty, { face: 'laugh', ...P.hips });
      put(pt, -0.55, 0.9, Math.PI / 2); pose(pt, { face: 'scared', lie: fall, armR: [2.3 + 0.5 * fall, 0, 0.2], armL: [2.7 + 0.4 * fall, 0, 0.2], hop: fall >= 1 ? hit(t, f + 0.75, 0.3) * 0.08 : 0 }); PU.whistle.visible = false; pWh.visible = false;
      camL([0.2, 1.1, 5.4, 0.0, 1.35, 0.8, 44], [0.1, 0.9, 5.0, -0.1, 1.1, 0.8, 44], fall); shake(0.06 * hit(t, f + 0.75, 0.4)); } },
  twist(t, d, l) { const a = l(1) - 0.2, lift = smooth(seg(t, a + 0.2, l(2) - 0.1)), off = t > l(2) - 0.1, k = t - (l(2) - 0.1), U = bigB.userData;
    crowd(i => off ? 'laugh' : (i === 1 || i === 5 ? 'scared' : 'neutral'), (i) => off ? laughing(i) : {}, [bunty]); put(pappu, 0.45, 0.7, -Math.PI / 2); pose(pappu, { face: off ? 'laugh' : 'scared', ...(off ? laughing(1) : {}) });
    put(bigB, -0.55, 0.85, Math.PI / 2); pose(bigB, { face: off ? 'sad' : 'angry', ...(t < a ? P.hips : off ? { armR: [0.3, 0, 0.2], armL: [0.3, 0, 0.2] } : { armR: [2.2 + 0.2 * lift, 0, 1.25], armL: [0.5, 0, -1.8] }), lean: t < a ? 0.15 : 0 });
    if (!off) U.capG.position.y = lift * 0.3 * U.hr; else { U.capG.position.set(-k * 2.2 * U.hr, (0.3 + k * 7 - 6 * k * k) * U.hr, 0); U.capG.rotation.z = k * 6; baldShine.visible = true; twinkle(baldStar, 0.5, 1, 7); }
    if (t < a) camL([0.5, 0.7, 4.6, -0.1, 1.45, 0.8, 44], [0.4, 0.8, 4.2, -0.1, 1.5, 0.8, 44], t / a); else camL([0.3, 1.5, 4.3, -0.2, 1.7, 0.85, 38], [0.1, 1.55, 3.7, -0.3, 1.8, 0.85, 38], seg(t, a, l(2) + 0.5)); },
  end(t, d) { crowd('laugh', laughing, [bunty]); put(bunty, 0, 0, 0); spikes(1.5); pose(bunty, { face: 'laugh', armR: [2.55, 0, 0.3], armL: [2.9, 0, 0.3], hop: Math.abs(Math.sin(NOW * 8)) * 0.1 });
    put(bigB, -2.2, 1.0, 0.4); pose(bigB, { face: 'smile', armR: [2.6 + 0.3 * Math.sin(NOW * 9), 0, 0.4] }); bigB.userData.capG.visible = false; baldShine.visible = true; twinkle(baldStar, 0.5, 1, 7);
    camL([0, 1.6, 6.5, 0, 1.6, 0, 46], [0, 6.5, 15, 0, 4.6, -8, 46], t / d); },
};
let e_ = () => 0;

// ---------- frame loop ----------
const CUT = { bunty: 1, parade: 1, cap: 1, twist: 1 };
window.renderFrame = (T) => {
  T = clamp(T, 0, TL.duration - 1e-3); NOW = T;
  let i = TL.beats.findIndex(b => T < b.end); if (i < 0) i = TL.beats.length - 1;
  const b = BEAT = TL.beats[i], t = T - b.start, d = b.end - b.start, ln = (k) => b.lines[Math.min(k, b.lines.length - 1)];
  e_ = (k) => ln(k).t1 - b.start;
  reset(); SHOT[b.id](t, d, (k) => ln(k).t0 - b.start);
  billboard(); camera.updateMatrixWorld(); renderer.render(scene, camera);
  let f = 0; if (i === 0) f = 1 - t / 0.6; if (b.id === 'end') f = seg(t, d - 0.9, d - 0.1);
  $('fade').style.opacity = clamp(f); $('flash').style.background = FLASHC; $('flash').style.opacity = clamp(FLASH);
};
window.DURATION = TL.duration;
window.renderFrame(0);
window.READY = true;
