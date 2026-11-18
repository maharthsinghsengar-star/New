// Core: renderer, two-pass camera (world + first-person "view" layer), helpers, sky, procedural textures.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, RoundedBoxGeometry };
export const mergeGeometries = gs => mergeRaw(gs.map(g => { g = g.index ? g.toNonIndexed() : g; return g; }));

export const RW = 1280, RH = 720;
export const $ = id => document.getElementById(id);
export const FLAGS = new URLSearchParams(location.search);
export const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: !FLAGS.has('noaa'), preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = !FLAGS.has('noshadow'); renderer.shadowMap.type = THREE.PCFShadowMap; renderer.autoClear = false;

// world pass: near 0.35 m (nothing in the world is closer than that to the eye); view pass (cockpit, hands): near 0.02, far 40
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, RW / RH, 0.35, 9000);
export const VIEW = new THREE.Scene();
export const vcam = new THREE.PerspectiveCamera(60, RW / RH, 0.02, 60);
export const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xa89a80, 1.1);
export const sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
{ const c = sun.shadow.camera; c.left = c.bottom = -70; c.right = c.top = 70; c.near = 1; c.far = 600; }
scene.add(hemi, sun, sun.target);
export const vhemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a8070, 1.1), vsun = new THREE.DirectionalLight(0xfff1dc, 2.2);
VIEW.add(vhemi, vsun, vsun.target);
scene.fog = new THREE.FogExp2(0xbcdcf5, 0.0012);

// ---------- helpers ----------
export function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
export const C = h => new THREE.Color(h), V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MC = new Map();
export const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
export const LAM = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
export const lam = c => { const k = 'L' + c; if (!MC.has(k)) MC.set(k, LAM(c)); return MC.get(k); };
export const std = (c, r = 0.6, m = 0) => { const k = `S${c}_${r}_${m}`; if (!MC.has(k)) MC.set(k, STD(c, { roughness: r, metalness: m })); return MC.get(k); };
export function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(geo, typeof mat === 'number' || typeof mat === 'string' ? lam(mat) : mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadow; return m; }
export const box = (w, h, d, c, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
export const cyl = (r1, r2, h, c, x = 0, y = 0, z = 0, s = 14) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), c, x, y, z);
export function canvasTex(w, h, draw, srgb = true, rep = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
export const noise = new SimplexNoise({ random: RNG(7) });
export const ease = K => t => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) { const [a, va] = K[i], [b, vb] = K[i + 1]; if (t <= b) return lerp(va, vb, smooth((t - a) / (b - a))); } return K[K.length - 1][1]; };
export const linK = K => t => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) { const [a, va] = K[i], [b, vb] = K[i + 1]; if (t <= b) return lerp(va, vb, (t - a) / (b - a)); } return K[K.length - 1][1]; };
export const glowTex = canvasTex(128, 128, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, true, false);
export const glow = (c, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.scale.setScalar(s); return sp; };
export const blobTex = canvasTex(128, 128, x => { const g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, true, false);
export const _m4 = () => new THREE.Matrix4(), mT = (x, y, z) => _m4().makeTranslation(x, y, z), mRX = a => _m4().makeRotationX(a), mRY = a => _m4().makeRotationY(a), mRZ = a => _m4().makeRotationZ(a), mS = (x, y, z) => _m4().makeScale(x, y, z);
export const ZERO = _m4().makeScale(0, 0, 0);

// merge static meshes per material (keeps uv when present)
export function bake(root, keep = () => false) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), dead = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.material.transparent || Array.isArray(o.material) || keep(o)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : ''); if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, rec: o.receiveShadow, list: [] }); groups.get(key).list.push(g); dead.push(o); });
  for (const o of dead) o.parent.remove(o);
  for (const { mat, cast, rec, list } of groups.values()) for (let i = 0; i < list.length; i += 400) { const m = new THREE.Mesh(mergeGeometries(list.slice(i, i + 400)), mat); m.castShadow = cast; m.receiveShadow = rec; root.add(m); }
}
export function disposeTree(root) { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

// =====================================================================================
// sky: gradient + procedural clouds + sun, presets per country
// =====================================================================================
const SKYU = { top: { value: C('#1f6fe0') }, hor: { value: C('#a6d6ff') }, bot: { value: C('#cfe6f7') }, sunDir: { value: V3(0.5, 0.6, 0.6).normalize() }, sunCol: { value: C('#fff3d6') },
  cloudCol: { value: C('#ffffff') }, cloudShade: { value: C('#b9cde6') }, clouds: { value: 1 }, cover: { value: 0.5 }, stars: { value: 0 }, off: { value: 0 } };
export const SKYMAT = new THREE.ShaderMaterial({ uniforms: SKYU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 top, hor, bot, sunDir, sunCol, cloudCol, cloudShade; uniform float clouds, cover, stars, off; varying vec3 vDir;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  void main(){ vec3 d = normalize(vDir); float h = d.y;
    vec3 c = mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5)); c = mix(c, bot, clamp(-h * 4.0, 0.0, 1.0));
    float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 1200.0) * 8.0 + pow(s, 12.0) * 0.25 + pow(s, 3.0) * 0.08);
    if (h > 0.0) {
      vec2 st = d.xz / (h + 0.02) * 60.0; float sn = h21(floor(st)); c += vec3(1.0) * step(0.995, sn) * stars * smoothstep(0.05, 0.4, h);
      vec2 p = d.xz / (h + 0.12) * 1.1 + vec2(off, 0.0); float n = fbm(p); float n2 = fbm(p * 2.1 + 3.1);
      float cm = smoothstep(cover, cover + 0.26, n) * clouds * smoothstep(0.0, 0.14, h);
      vec3 cc = mix(cloudShade, cloudCol, smoothstep(0.35, 0.85, n2 * 0.6 + n * 0.55)); cc += sunCol * pow(s, 6.0) * 0.35;
      c = mix(c, cc, cm * 0.95); }
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
export const SKY = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), SKYMAT); SKY.renderOrder = -10; SKY.frustumCulled = false; scene.add(SKY); if (FLAGS.has('nosky')) SKY.visible = false;
const pmrem = new THREE.PMREMGenerator(renderer);
export function setSky(P) {
  for (const k of ['top', 'hor', 'bot', 'cloudCol', 'cloudShade', 'sunCol']) SKYU[k].value.set(P[k]);
  SKYU.sunDir.value.copy(P.sunDir).normalize(); SKYU.clouds.value = P.clouds ?? 1; SKYU.cover.value = P.cover ?? 0.5; SKYU.stars.value = P.stars ?? 0;
  scene.fog.color.set(P.fog); scene.fog.density = P.fogD;
  hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGnd); hemi.intensity = P.hemiI; vhemi.color.set(P.hemiSky); vhemi.groundColor.set(P.hemiGnd); vhemi.intensity = P.hemiI * 0.95;
  sun.color.set(P.sunLight); sun.intensity = P.sunI; vsun.color.set(P.sunLight); vsun.intensity = P.sunI * 0.7;
  renderer.toneMappingExposure = P.exposure ?? 1.1;
  if (!P._env) { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), SKYMAT)); P._env = pmrem.fromScene(s, 0, 0.1, 400).texture;
    // bake the sky (clouds are static within a country) into a cube map: much cheaper than the per-pixel shader
    const rt = new THREE.WebGLCubeRenderTarget(1024, { type: THREE.HalfFloatType, generateMipmaps: false }); const cc = new THREE.CubeCamera(1, 1000, rt); s.add(cc); cc.update(renderer, s); P._bg = rt.texture; }
  scene.background = FLAGS.has('livesky') ? null : P._bg; SKY.visible = FLAGS.has('livesky');
  scene.environment = VIEW.environment = P._env; scene.environmentIntensity = VIEW.environmentIntensity = P.envI ?? 0.9;
}
export const SKYU_ = SKYU;

// =====================================================================================
// procedural textures
// =====================================================================================
const tcache = new Map();
export const cached = (k, f) => { if (!tcache.has(k)) tcache.set(k, f()); return tcache.get(k); };
function speckle(x, w, h, base, n, a, rng, sz = 2) { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = rng(); x.fillStyle = v < 0.5 ? `rgba(0,0,0,${a * rng()})` : `rgba(255,255,255,${a * rng() * 0.8})`; x.fillRect(rng() * w, rng() * h, sz * (0.5 + rng()), sz * (0.5 + rng())); } }
// road cross-section texture (u across the full width, v along 16 m). spec: { lanes: [..widths], marks: [{u (m), kind}], total }
export function roadTex(key, total, marks, base = '#55585e') {
  return cached('road' + key, () => { const PX = 40, W = Math.ceil(total * PX), Hh = 640; const r = RNG(key.length * 77 + 3);
    const t = canvasTex(W, Hh, (x, w, h) => { speckle(x, w, h, base, 30000, 0.1, r, 1.5);
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(20,20,22,${0.05 + r() * 0.08})`; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 80, 10 + r() * 30, r() * 3, 0, TAU); x.fill(); }
      for (const m of marks) { const px = m.u * PX; x.fillStyle = m.c || '#f4f4ee';
        if (m.k === 'solid') x.fillRect(px - 0.075 * PX, 0, 0.15 * PX, h);
        else if (m.k === 'dash') { x.fillRect(px - 0.075 * PX, 0, 0.15 * PX, h * 0.38); }
        else if (m.k === 'double') { x.fillRect(px - 0.25 * PX, 0, 0.12 * PX, h); x.fillRect(px + 0.13 * PX, 0, 0.12 * PX, h); }
        else if (m.k === 'track') { x.fillStyle = 'rgba(25,25,28,.16)'; x.fillRect(px - 1.0 * PX, 0, 0.5 * PX, h); x.fillRect(px + 0.5 * PX, 0, 0.5 * PX, h); } }
      x.globalAlpha = 0.08; for (let i = 0; i < 9000; i++) { x.fillStyle = r() < 0.5 ? '#000' : '#fff'; x.fillRect(r() * w, r() * h, 1.5, 1.5); } x.globalAlpha = 1; }, true, true);
    t.repeat.set(1, 1); return t; });
}
export function groundTex(kind) {
  return cached('g' + kind, () => { const r = RNG(kind.length * 13 + 5);
    const P = { grass: ['#5da23e', '#4a8c31', '#78b84b'], dry: ['#a9a35a', '#8d8a4c', '#c2b56e'], sand: ['#e6c992', '#d9b67a', '#f0d9a8'], dirt: ['#a07a52', '#8c6a45', '#b58f63'], walk: ['#c9c6c0', '#b5b2ac', '#d8d5cf'], tarmac: ['#6d7076', '#62656b', '#787b81'], park: ['#6bb048', '#5a9c3b', '#86c45a'] }[kind];
    return canvasTex(512, 512, (x, w, h) => { x.fillStyle = P[0]; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { x.fillStyle = P[1 + (i % 2)]; x.globalAlpha = 0.18 + r() * 0.25; x.beginPath(); x.ellipse(r() * w, r() * h, 10 + r() * 50, 6 + r() * 30, r() * 3, 0, TAU); x.fill(); }
      x.globalAlpha = 1; for (let i = 0; i < 14000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; x.fillRect(r() * w, r() * h, 2, 2); }
      if (kind === 'walk') { x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); } } });
  });
}
// facades. style: { wall, wall2, win, frame, kind: 'grid'|'shutter'|'haussmann'|'brick'|'glass'|'indian'|'neon'|'adobe'|'japan', cols, rows }
export function facadeTex(st, seed, night = false) {
  const key = 'f' + JSON.stringify(st) + seed + night;
  return cached(key, () => { const r = RNG(seed * 911 + 17), cols = 4, rows = 4, CW = 128, CH = 128; let em = null;
    const draw = (x, w, h, emissive) => {
      x.fillStyle = emissive ? '#000' : st.wall; x.fillRect(0, 0, w, h);
      if (!emissive) { for (let i = 0; i < 2500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; x.fillRect(r() * w, r() * h, 3, 3); }
        if (st.kind === 'brick') { x.strokeStyle = 'rgba(70,30,20,.35)'; x.lineWidth = 1; for (let y = 0; y < h; y += 8) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); for (let xx = (y / 8 % 2) * 8; xx < w; xx += 16) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 8); x.stroke(); } } }
        if (st.kind === 'glass') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, st.win); g.addColorStop(0.5, st.wall2 || '#bfe3ff'); g.addColorStop(1, st.win); x.fillStyle = g; x.fillRect(0, 0, w, h); } }
      const rr = RNG(seed * 911 + 99);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const X = i * CW, Y = j * CH, lit = rr() < (st.lit ?? 0.35);
        let wx = X + 30, wy = Y + 22, ww = CW - 60, wh = CH - 46;
        if (st.kind === 'glass') { wx = X + 4; wy = Y + 6; ww = CW - 8; wh = CH - 12; }
        if (st.kind === 'haussmann' || st.kind === 'shutter' || st.kind === 'adobe') { wx = X + 38; ww = CW - 76; wy = Y + 16; wh = CH - 34; }
        if (emissive) { if (lit) { x.fillStyle = st.litc || (rr() < 0.5 ? '#ffd9a0' : '#fff0d0'); x.fillRect(wx, wy, ww, wh); } continue; }
        // window
        if (st.kind !== 'glass') { x.fillStyle = st.frame || '#e9e6df'; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 10); }
        const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, st.win); g.addColorStop(0.55, lit && night ? '#ffd9a0' : '#9fc6e6'); g.addColorStop(1, st.win);
        x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
        if (st.kind === 'glass') { x.strokeStyle = 'rgba(30,40,55,.55)'; x.lineWidth = 4; x.strokeRect(wx, wy, ww, wh); continue; }
        x.fillStyle = st.frame || '#e9e6df'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh); x.fillRect(wx, wy + wh * 0.4, ww, 3);
        if (!lit && rr() < 0.5) { x.fillStyle = 'rgba(240,235,225,.75)'; x.fillRect(wx, wy, ww, wh * (0.2 + rr() * 0.4)); }   // curtains
        if (st.kind === 'shutter' || st.kind === 'adobe') { x.fillStyle = st.shut || '#2f7d4a'; x.fillRect(wx - 22, wy - 4, 18, wh + 8); x.fillRect(wx + ww + 4, wy - 4, 18, wh + 8); x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < wh; k += 7) { x.fillRect(wx - 22, wy + k, 18, 2); x.fillRect(wx + ww + 4, wy + k, 18, 2); } }
        if (st.kind === 'haussmann') { x.fillStyle = '#222'; for (let k = 0; k < ww + 16; k += 6) x.fillRect(wx - 8 + k, wy + wh - 26, 2, 26); x.fillRect(wx - 8, wy + wh - 28, ww + 16, 4); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(X, Y + CH - 6, CW, 6); }
        if (st.kind === 'indian' && rr() < 0.4) { x.fillStyle = ['#e53935', '#1e88e5', '#43a047', '#fdd835'][(rr() * 4) | 0]; x.fillRect(X + 6, wy + wh + 6, CW - 12, 10); }
        if (st.kind === 'japan' && rr() < 0.3) { x.fillStyle = '#d7d2c8'; x.fillRect(wx, wy + wh - 18, ww, 18); }
        x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(wx - 5, wy + wh + 5, ww + 10, 4);
      }
      if (st.kind === 'haussmann') { x.fillStyle = 'rgba(0,0,0,.08)'; for (let j = 0; j < rows; j++) x.fillRect(0, j * CH, w, 8); }
    };
    const t = canvasTex(cols * CW, rows * CH, (x, w, h) => draw(x, w, h, false));
    if (night) { em = canvasTex(cols * CW, rows * CH, (x, w, h) => draw(x, w, h, true)); }
    return { map: t, em };
  });
}
// a shop-front band (ground floor), repeating every 8 m
export function shopTex(style, seed, names, night) {
  return cached('shop' + JSON.stringify(style) + seed + night, () => { const r = RNG(seed * 31 + 7); let signs = [];
    const map = canvasTex(1024, 256, (x, w, h) => { x.fillStyle = style.base || '#d8d2c4'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 2; k++) { const X = k * 512, col = style.signs[(r() * style.signs.length) | 0], name = names[(r() * names.length) | 0];
        x.fillStyle = '#20252b'; x.fillRect(X + 20, 92, 472, 164);
        const g = x.createLinearGradient(X, 100, X + 470, 250); g.addColorStop(0, '#5d7f99'); g.addColorStop(0.5, '#cfe5f5'); g.addColorStop(1, '#4a6a85'); x.fillStyle = g; x.fillRect(X + 30, 102, 300, 154);
        x.fillStyle = '#33393f'; x.fillRect(X + 350, 102, 132, 154); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(X + 356, 108, 60, 142);
        for (let i = 0; i < 6; i++) { x.fillStyle = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa'][(r() * 6) | 0]; x.fillRect(X + 40 + i * 46, 200 + r() * 20, 30, 50); }
        x.fillStyle = col; x.fillRect(X + 10, 14, 492, 70); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(X + 10, 14, 492, 8);
        x.fillStyle = style.ink || '#fff'; x.font = `900 46px ${style.font || 'Poppins'}, 'WenQuanYi Zen Hei', 'IPAGothic', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, X + 256, 52, 470);
        signs.push(col); } });
    const em = night ? canvasTex(1024, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const r2 = RNG(seed * 31 + 7);
      for (let k = 0; k < 2; k++) { const X = k * 512; r2(); const name = names[(r2() * names.length) | 0]; x.fillStyle = signs[k]; x.fillRect(X + 10, 14, 492, 70); x.fillStyle = '#fff'; x.font = `900 46px ${style.font || 'Poppins'}, 'WenQuanYi Zen Hei', 'IPAGothic', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, X + 256, 52, 470);
        x.fillStyle = '#ffe2b0'; x.globalAlpha = 0.85; x.fillRect(X + 30, 102, 300, 154); x.globalAlpha = 1; } }) : null;
    return { map, em };
  });
}
export function signTex(text, bg, fg = '#fff', w = 512, h = 128, font = 'Poppins') {
  return cached('sign' + text + bg + fg + w + h, () => canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = `900 ${h * 0.56}px ${font}, 'WenQuanYi Zen Hei', 'IPAGothic', 'DejaVu Sans', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 3, w * 0.92); }, true, false));
}
