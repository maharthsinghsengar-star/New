// WHAT IF YOUR LUCK DOUBLED EVERY DAY? — bright stylised 3D city, 16:9, captions only, meditative.
// Deterministic: window.renderFrame(t) draws the frame for time t (seconds).
// WHAT IF EVERYONE EXCEPT YOU BECAME GHOSTS AND ZOMBIES? — bright stylised 3D city, 16:9.
// Deterministic: window.renderFrame(t) draws the frame for time t (seconds). Shot timing follows build/timeline.json (narration).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
const mergeGeometries = gs => mergeRaw(gs.map(g => g.index ? g.toNonIndexed() : g));

const RW = 1280, RH = 720;
const $ = id => document.getElementById(id);
await Promise.all(['800', '600', '500'].map(w => document.fonts.load(`${w} 40px Poppins`)));
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
// tight depth range: no z-fighting on the road (the old near=0.08 / far=18000 caused the flicker)
const camera = new THREE.PerspectiveCamera(50, RW / RH, 0.15, 1500); scene.add(camera);
const hemi = new THREE.HemisphereLight(0xbfe0ff, 0xb89f7a, 1.0);
const sun = new THREE.DirectionalLight(0xfff2dd, 3.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(hemi, sun, sun.target);
scene.fog = new THREE.FogExp2(0xbcdcf5, 0.0028);

// ---------- helpers ----------
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const C = h => new THREE.Color(h);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
const MATC = {};
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, typeof mat === 'number' ? (MATC[mat] ||= STD(mat)) : mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r1, r2, h, c, x, y, z, s = 14) => mesh(new THREE.CylinderGeometry(r1, r2, h, s), c, x, y, z);
function canvasTex(w, h, draw, srgb = true, rep = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const noise = new SimplexNoise({ random: RNG(7) });
const ease = K => t => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) { const [a, va] = K[i], [b, vb] = K[i + 1]; if (t <= b) return lerp(va, vb, smooth((t - a) / (b - a))); } return K[K.length - 1][1]; };
function hermite(keys) {   // keys: [t, x, y, z]
  const n = keys.length, P = keys.map(k => new THREE.Vector3(k[1], k[2], k[3])), T = keys.map(k => k[0]);
  const M = P.map((p, i) => { if (i === 0 || i === n - 1) return new THREE.Vector3(); return P[i + 1].clone().sub(P[i - 1]).divideScalar(T[i + 1] - T[i - 1]); });
  return t => { let i = 0; while (i < n - 2 && t > T[i + 1]) i++; const h = T[i + 1] - T[i], s = clamp((t - T[i]) / h), s2 = s * s, s3 = s2 * s;
    return new THREE.Vector3().addScaledVector(P[i], 2 * s3 - 3 * s2 + 1).addScaledVector(M[i], (s3 - 2 * s2 + s) * h).addScaledVector(P[i + 1], -2 * s3 + 3 * s2).addScaledVector(M[i + 1], (s3 - s2) * h); };
}
const glowTex = canvasTex(128, 128, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, true, false);
const glow = (c, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.scale.setScalar(s); return sp; };
// instance colours above 1.0 glow (used for glowing eyes and the pre-ghost glow)
const GLOWSRC = '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += max(vColor - 1.0, 0.0) * 0.9;\n#endif';
const glowPatch = m => { m.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', GLOWSRC); }; m.customProgramCacheKey = () => 'glow'; return m; };

// =====================================================================================
// sky: gradient + clouds + stars, presets per day (morning, day, storm, night, golden)
// =====================================================================================
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SKYU = { top: { value: C('#1f6fe0') }, hor: { value: C('#a6d6ff') }, bot: { value: C('#cfe6f7') }, sunDir: { value: V3(0.5, 0.6, 0.6).normalize() }, sunCol: { value: C('#fff3d6') },
  cloudCol: { value: C('#ffffff') }, cloudShade: { value: C('#b9cde6') }, clouds: { value: 1 }, cover: { value: 0.5 }, stars: { value: 0 }, off: { value: 0 } };
const SKYMAT = new THREE.ShaderMaterial({ uniforms: SKYU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 top, hor, bot, sunDir, sunCol, cloudCol, cloudShade; uniform float clouds, cover, stars, off; varying vec3 vDir;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  void main(){ vec3 d = normalize(vDir); float h = d.y;
    vec3 c = mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5)); c = mix(c, bot, clamp(-h * 4.0, 0.0, 1.0));
    float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 1200.0) * 8.0 + pow(s, 12.0) * 0.28 + pow(s, 3.0) * 0.1);
    if (h > 0.0) {
      vec2 st = d.xz / (h + 0.02) * 70.0; float sn = h21(floor(st)); c += vec3(1.0, 0.97, 0.9) * step(0.993, sn) * stars * smoothstep(0.04, 0.35, h) * (0.6 + 0.4 * h21(floor(st) + 3.0));
      vec2 p = d.xz / (h + 0.12) * 1.1 + vec2(off, 0.0); float n = fbm(p); float n2 = fbm(p * 2.1 + 3.1);
      float cm = smoothstep(cover, cover + 0.26, n) * clouds * smoothstep(0.0, 0.14, h);
      vec3 cc = mix(cloudShade, cloudCol, smoothstep(0.35, 0.85, n2 * 0.6 + n * 0.55)); cc += sunCol * pow(s, 6.0) * 0.35;
      c = mix(c, cc, cm * 0.95); }
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const SKY = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), SKYMAT); SKY.renderOrder = -10; SKY.frustumCulled = false; scene.add(SKY);
const PP = o => ({ top: '#2a7be4', hor: '#b4dcff', bot: '#cfe6f7', sunDir: V3(0.5, 0.7, 0.42), sunCol: '#fff3d6', cloudCol: '#ffffff', cloudShade: '#b9cde6', cover: 0.52, clouds: 1, stars: 0,
  fog: '#c4e0f6', fogD: 0.0026, hemiSky: '#cfe8ff', hemiGnd: '#b89f7a', hemiI: 1.15, sunLight: '#fff2dd', sunI: 3.3, exposure: 1.12, envI: 0.75, ...o });
const PRE = {
  morning: PP({ top: '#3f86e0', hor: '#ffd9b0', sunDir: V3(0.45, 0.38, 0.75), sunCol: '#ffd29a', cloudShade: '#e6b9a0', fog: '#f2dcc8', sunLight: '#ffe2b8', hemiSky: '#ffe9d0', sunI: 3.2 }),
  day: PP({}),
  storm: PP({ top: '#56657c', hor: '#a9b4c2', bot: '#8d97a3', cover: 0.18, clouds: 1.3, cloudCol: '#c9d0da', cloudShade: '#5c6675', sunCol: '#000000', fog: '#9aa6b4', fogD: 0.006, hemiSky: '#b9c6d6', hemiGnd: '#6c6a66', hemiI: 1.0, sunI: 0.8, exposure: 1.05, envI: 0.5 }),
  night: PP({ top: '#050b26', hor: '#26356e', bot: '#0c1230', cover: 0.62, clouds: 0.35, cloudCol: '#3a4a80', cloudShade: '#121a3a', sunDir: V3(-0.3, 0.6, -0.7), sunCol: '#000000', stars: 1.4, fog: '#1c2650', fogD: 0.005,
    hemiSky: '#8fa4ff', hemiGnd: '#2e3050', hemiI: 1.05, sunLight: '#a9b8ff', sunI: 0.75, exposure: 1.3, envI: 0.35 }),
  gold: PP({ top: '#4a78d8', hor: '#ffcf7a', bot: '#f0c890', sunDir: V3(0.2, 0.22, -0.95), sunCol: '#ffc060', cloudCol: '#fff0d0', cloudShade: '#f0a070', cover: 0.5, fog: '#f6d9a0', fogD: 0.003, hemiSky: '#ffe2a8', hemiGnd: '#c09060', sunLight: '#ffd080', sunI: 3.4, exposure: 1.15 }),
};
const pmrem = new THREE.PMREMGenerator(renderer);
function applySky(P) {
  for (const k of ['top', 'hor', 'bot', 'cloudCol', 'cloudShade', 'sunCol']) SKYU[k].value.set(P[k]);
  SKYU.sunDir.value.copy(P.sunDir).normalize(); SKYU.clouds.value = P.clouds; SKYU.cover.value = P.cover; SKYU.stars.value = P.stars;
  scene.fog.color.set(P.fog); scene.fog.density = P.fogD; hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGnd); hemi.intensity = P.hemiI; sun.color.set(P.sunLight); sun.intensity = P.sunI; renderer.toneMappingExposure = P.exposure;
  if (!P._env) { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), SKYMAT)); P._env = pmrem.fromScene(s, 0, 0.1, 400).texture; }
  scene.environment = P._env; scene.environmentIntensity = P.envI;
}

// =====================================================================================
// textures
// =====================================================================================
const ROADT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5b5f68'; x.fillRect(0, 0, w, h); const r = RNG(31);
  for (let i = 0; i < 60; i++) { const cx = r() * w, cy = r() * h, rr = 18 + r() * 40, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); const v = r() < 0.5 ? '0,0,0' : '255,255,255'; g.addColorStop(0, `rgba(${v},0.05)`); g.addColorStop(1, `rgba(${v},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h); } });
ROADT.repeat.set(1, 1);
const WALKT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#ddd6ca'; x.fillRect(0, 0, w, h); const r = RNG(12);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 214 + (r() - 0.5) * 14; x.fillStyle = `rgb(${v},${v - 6},${v - 16})`; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } });
// facades: 8 x 8 window cells per texture (one cell = 3 m x 3.3 m)
const CW = 3, CH = 3.3;
function facadeTex(wall, seed, glassy = false) {
  const r = RNG(seed), map = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = wall; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const px = i * 64, py = j * 64;
      if (glassy) { const g = x.createLinearGradient(px, py, px + 64, py + 64); g.addColorStop(0, '#9fd3f5'); g.addColorStop(0.5, '#3f7fb8'); g.addColorStop(1, '#7ab8e6'); x.fillStyle = g; x.fillRect(px + 3, py + 3, 58, 58); continue; }
      x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(px + 10, py + 9, 44, 46);
      const g = x.createLinearGradient(px, py + 12, px + 40, py + 54); g.addColorStop(0, '#a9d9f7'); g.addColorStop(0.55, '#4f86b8'); g.addColorStop(1, '#2d5d8f'); x.fillStyle = g; x.fillRect(px + 13, py + 12, 38, 40);
      x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(px + 31, py + 12, 2, 40); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(px + 8, py + 55, 48, 3); }
  });
  const emi = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (r() < 0.3) { x.fillStyle = r() < 0.75 ? '#ffd29a' : '#9ad8ff'; if (glassy) x.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); else x.fillRect(i * 64 + 13, j * 64 + 12, 38, 40); } });
  return { map, emi };
}
const FACADES = ['#ff8a65', '#ffd54f', '#4fc3f7', '#81c784', '#ba68c8', '#f06292', '#4db6ac', '#fff1dc', '#ffb74d', '#9fa8da'].map((c, i) => facadeTex(c, 100 + i)).concat([facadeTex('#cfd8dc', 301, true), facadeTex('#b0bec5', 302, true)]);
const FMAT = FACADES.map(f => STD(0xffffff, { map: f.map, emissiveMap: f.emi, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.75 }));
const SHOPT = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#e9e4da'; x.fillRect(0, 0, w, h); const r = RNG(77);
  for (let i = 0; i < 4; i++) { const px = i * 128;
    const g = x.createLinearGradient(px, 60, px + 90, 250); g.addColorStop(0, '#bfe3f7'); g.addColorStop(0.5, '#3d6f99'); g.addColorStop(1, '#22476b'); x.fillStyle = g; x.fillRect(px + 8, 64, 112, 186);
    for (let k = 0; k < 16; k++) { x.fillStyle = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ffab40'][(r() * 6) | 0]; x.fillRect(px + 14 + r() * 92, 190 + r() * 50, 8 + r() * 12, 8 + r() * 14); }
    x.fillStyle = '#3b3b40'; x.fillRect(px + 6, 60, 116, 5); x.fillRect(px + 6, 60, 5, 196); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px + 22, 70, 10, 170); }
  x.fillStyle = '#3b3b40'; x.fillRect(0, 0, w, 14); });
SHOPT.wrapT = THREE.ClampToEdgeWrapping;
const SHOPM = STD(0xffffff, { map: SHOPT, roughness: 0.4 });
const AWN = ['#ff4d4d', '#ffb300', '#00b894', '#3d7bff', '#e84393', '#6c5ce7'].map(c => STD(0xffffff, { map: canvasTex(128, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : c; x.fillRect(i * 16, 0, 16, h); } }, true, false), roughness: 0.7 }));
const NAMES = ['COFFEE', 'PIZZA', 'BOOKS', 'BAKERY', 'SHOES', 'TOYS', 'FLOWERS', 'MARKET', 'DINER', 'PHARMACY', 'GAMES', 'SUSHI', 'TACOS', 'MUSIC', 'DONUTS', 'BURGERS', 'SALON', 'JUICE', 'GYM', 'TECH'];
const SIGNC = ['#ff3d71', '#00c2a8', '#ffb400', '#3d5afe', '#8e24aa', '#ff6d00', '#00b0ff', '#d81b60'];
function signMat(text, i) { const c = SIGNC[i % SIGNC.length]; const t = canvasTex(512, 128, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, w, 10); x.fillStyle = '#fff'; x.font = '800 72px Poppins'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 4); }, true, false);
  return STD(0xffffff, { map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.5 }); }

// =====================================================================================
// city layout. main road |x| < 7 (along z), cross road |z| < 7 (along x); sidewalks to |x| 12 / |z| 11 at +0.15
// =====================================================================================
const CITY = new THREE.Group(); scene.add(CITY);
const groundY = (x, z) => { const g = Math.min(Math.abs(x) - 7, Math.abs(z) - 7); return 0.15 * smooth((g + 0.12) / 0.24); };
// ground under everything sits 30 cm lower, so nothing is coplanar with the road
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), STD(0x9a9a92, { roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.y = -0.3; g.receiveShadow = true; CITY.add(g); }
const ROADM = STD(0xffffff, { map: ROADT, roughness: 0.92 });
function roadPlane(x0, x1, z0, z1) { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 9, p.getZ(i) / 9); const m = new THREE.Mesh(g, ROADM); m.receiveShadow = true; CITY.add(m); }
roadPlane(-7, 7, -600, 600); roadPlane(7, 600, -7, 7); roadPlane(-600, -7, -7, 7);
const WALKM = STD(0xffffff, { map: WALKT, roughness: 0.9 });
function walkBox(x0, x1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, 0.45, z1 - z0); g.translate((x0 + x1) / 2, -0.075, (z0 + z1) / 2);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { if (n.getY(i) > 0.5) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); else uv.setXY(i, 0.02, 0.02); }
  const m = new THREE.Mesh(g, WALKM); m.receiveShadow = true; CITY.add(m); }
for (const s of [-1, 1]) { walkBox(s > 0 ? 7 : -12, s > 0 ? 12 : -7, 7, 600); walkBox(s > 0 ? 7 : -12, s > 0 ? 12 : -7, -600, -7); walkBox(s > 0 ? 12 : -600, s > 0 ? 600 : -12, 7, 11); walkBox(s > 0 ? 12 : -600, s > 0 ? 600 : -12, -11, -7); }
// curbs
const CURBM = STD(0xf2efe8, { roughness: 0.8 });
for (const s of [-1, 1]) { for (const zz of [[7, 600], [-600, -7]]) CITY.add(mesh(new THREE.BoxGeometry(0.22, 0.46, zz[1] - zz[0]), CURBM, s * 7.1, -0.07, (zz[0] + zz[1]) / 2));
  for (const xx of [[7, 600], [-600, -7]]) CITY.add(mesh(new THREE.BoxGeometry(xx[1] - xx[0], 0.46, 0.22), CURBM, (xx[0] + xx[1]) / 2, -0.07, s * 7.1)); }
// markings: thin planes lifted 1 cm with polygon offset (no shimmer / z-fight)
const MARKW = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
const MARKY = new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
{ const W = [], Y = []; const q = (arr, xa, xb, za, zb) => { const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), z0 = Math.min(za, zb), z1 = Math.max(za, zb); const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0.01, (z0 + z1) / 2); arr.push(g); };
  for (const sg of [1, -1]) { for (let z = 9; z < 520; z += 7) { q(W, -3.56, -3.44, sg * z, sg * (z + 3.2)); q(W, 3.44, 3.56, sg * z, sg * (z + 3.2)); }
    q(Y, -0.2, -0.08, sg * 7.6, sg * 560); q(Y, 0.08, 0.2, sg * 7.6, sg * 560);
    for (let x = 13; x < 520; x += 7) { q(W, sg * x, sg * (x + 3.2), -3.56, -3.44); q(W, sg * x, sg * (x + 3.2), 3.44, 3.56); }
    q(Y, sg * 12.6, sg * 560, -0.2, -0.08); q(Y, sg * 12.6, sg * 560, 0.08, 0.2);
    // zebra crossings over the cross road (along the main sidewalks) and over the main road
    for (let z = -6.2; z < 6.3; z += 1.1) q(W, sg * 8.0, sg * 11.4, z - 0.27, z + 0.27);
    for (let x = -6.2; x < 6.3; x += 1.1) q(W, x - 0.27, x + 0.27, sg * 7.9, sg * 10.9);
    q(W, sg > 0 ? 0 : -7, sg > 0 ? 7 : 0, sg * 11.3, sg * 11.65); }
  const fix = g => { g.deleteAttribute('uv'); return g; };
  const mw = new THREE.Mesh(mergeGeometries(W.map(fix)), MARKW), my = new THREE.Mesh(mergeGeometries(Y.map(fix)), MARKY); mw.receiveShadow = my.receiveShadow = true; CITY.add(mw, my); }

// ---------- buildings ----------
function bldGeo(w, h, d, y0, vOff) {   // box with metre-scaled facade UVs; w along x, d along z
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y0 + h / 2, 0);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(ny) > 0.5) { uv.setXY(i, 0.003, 0.997); continue; }
    const hor = Math.abs(nx) > 0.5 ? (nx > 0 ? -z : z) + d / 2 : (nz > 0 ? x : -x) + w / 2;
    uv.setXY(i, hor / (CW * 8), (y - y0 + vOff) / (CH * 8)); }
  return g;
}
const BLD = new THREE.Group(); CITY.add(BLD);
const RB = RNG(55), rb = (a, b) => a + RB() * (b - a);
let signI = 0; const LOTTO = {};
function building(cx, cz, w, d, h, face, opt = {}) {   // face: outward normal of the street side ([nx, nz])
  const fm = FMAT[opt.mat ?? (RB() * 10 | 0)], shopH = opt.noShop ? 0 : 4.2;
  const b = mesh(bldGeo(w, h - shopH, d, shopH, 0), fm, cx, 0, cz); BLD.add(b);
  if (opt.noShop) return;
  if (!opt.hollow) { const gs = new THREE.BoxGeometry(w - 0.3, shopH, d - 0.3); gs.translate(0, shopH / 2, 0); const p = gs.attributes.position, n = gs.attributes.normal, uv = gs.attributes.uv;
    for (let i = 0; i < p.count; i++) { const nx = n.getX(i), nz = n.getZ(i), x = p.getX(i), z = p.getZ(i); const hor = Math.abs(nx) > 0.5 ? z : x; uv.setXY(i, hor / 8, Math.abs(n.getY(i)) > 0.5 ? 0.99 : p.getY(i) / shopH); }
    BLD.add(mesh(gs, SHOPM, cx, 0, cz)); }
  // awning + sign on the street side
  const along = face[0] !== 0 ? d : w, fx = cx + face[0] * (w / 2), fz = cz + face[1] * (d / 2), yaw = Math.atan2(face[0], face[1]);
  if (!opt.noAwn) { const aw = mesh(new THREE.BoxGeometry(along * 0.82, 0.07, 1.5), AWN[(RB() * AWN.length) | 0], 0, 0, 0); aw.position.set(fx + face[0] * 0.62, 3.25, fz + face[1] * 0.62); aw.rotation.set(0, yaw, 0); aw.rotateX(0.32); BLD.add(aw); }
  const name = opt.sign || NAMES[signI % NAMES.length]; const sm = signMat(name, signI++);
  const sg = mesh(new THREE.BoxGeometry(Math.min(along * 0.6, 7), 0.75, 0.14), sm, fx + face[0] * 0.08, 3.85, fz + face[1] * 0.08); sg.rotation.y = yaw; BLD.add(sg); if (name === 'LOTTERY') { sg.userData.keep = true; LOTTO.sign = sg; }
}
// main street, both sides
const STORE = { x0: 12, x1: 22, z0: -31, z1: -17, door: [-24.8, -23.2] };
for (const s of [-1, 1]) for (const dir of [1, -1]) {
  let z = dir * 11; const forced = s === 1 && dir === -1 ? [[6, 0], [14, 1]] : s === -1 && dir === 1 ? [[14, 2]] : [];
  while (Math.abs(z) < 300) {
    const f = forced.shift(), w = f ? f[0] : rb(9, 18), zc = z + dir * w / 2, near = Math.abs(z) < 120;
    if (f && f[1] === 1) building(s * 21, zc, 18, w, 22, [-s, 0], { hollow: true, sign: 'LOTTERY', noAwn: true, mat: 2 });
    else building(s * 20, zc, 16, w - 0.2, near ? rb(12, 34) : rb(16, 48), [-s, 0], f && f[1] === 2 ? { sign: 'COFFEE', mat: 7 } : {});
    z += dir * w;
  }
}
// cross street buildings and the skyline behind
for (const sz of [-1, 1]) for (const dir of [1, -1]) { let x = dir * 29; while (Math.abs(x) < 260) { const w = rb(10, 20); building(x + dir * w / 2, sz * 19, w - 0.2, 16, rb(14, 40), [0, -sz]); x += dir * w; } }
for (let i = 0; i < 170; i++) { const x = (RB() < 0.5 ? -1 : 1) * rb(32, 260), z = (RB() < 0.5 ? -1 : 1) * rb(30, 320); if (Math.abs(z) < 30) continue;
  const w = rb(14, 26), d = rb(14, 26), h = rb(25, 95); BLD.add(mesh(bldGeo(w, h, d, 0, 0), FMAT[RB() < 0.3 ? 10 + (RB() * 2 | 0) : (RB() * 10 | 0)], x, 0, z)); }

// ---------- the 24/7 store (interior for the chase) ----------
const STOREG = new THREE.Group(); CITY.add(STOREG);
const CEILM = STD(0xf7f7f4, { emissive: 0xf7f7f4, emissiveIntensity: 0.18 });
const FRIDGEM = STD(0xdff3ff, { emissive: 0xbfe6ff, emissiveIntensity: 0.9, roughness: 0.2 });
const FL = canvasTex(128, 128, (x, w, h) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#f2f2ee' : '#d9e6ee'; x.fillRect(i * 64, j * 64, 64, 64); } });
{ const fx = STORE.x0, bx = STORE.x1, z0 = STORE.z0, z1 = STORE.z1, H = 4.2;
  const fg = new THREE.PlaneGeometry(bx - fx, z1 - z0); fg.rotateX(-Math.PI / 2); const p = fg.attributes.position, uv = fg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2, p.getZ(i) / 1.2);
  const floor = new THREE.Mesh(fg, STD(0xffffff, { map: FL, roughness: 0.35 })); floor.position.set((fx + bx) / 2, 0.16, (z0 + z1) / 2); floor.receiveShadow = true; STOREG.add(floor);
  const wallM = STD(0xfff6e6, { roughness: 0.9 });
  STOREG.add(box(0.3, H, z1 - z0, wallM, bx + 0.15, H / 2, (z0 + z1) / 2), box(bx - fx, H, 0.3, wallM, (fx + bx) / 2, H / 2, z0 - 0.15), box(bx - fx, H, 0.3, wallM, (fx + bx) / 2, H / 2, z1 + 0.15));
  STOREG.add(box(30 - bx, H, z1 - z0 + 0.6, 0xd0c8bc, (30 + bx) / 2 + 0.3, H / 2, (z0 + z1) / 2));
  const ceil = box(bx - fx, 0.1, z1 - z0, CEILM, (fx + bx) / 2, 3.65, (z0 + z1) / 2); ceil.castShadow = false; STOREG.add(ceil);
  STOREG.add(box(bx - fx + 0.3, H - 3.7, z1 - z0 + 0.6, 0x2b2f3a, (fx + bx) / 2, 3.7 + (H - 3.7) / 2, (z0 + z1) / 2));
  // shelves with colourful products
  const shelfM = STD(0xf0f0f0, { roughness: 0.6 }), prodGeo = new THREE.BoxGeometry(1, 1, 1), PR = RNG(9);
  const prods = []; const PC = ['#ff3b3b', '#ffcf2e', '#2ee66b', '#2e9bff', '#ff4fd8', '#ff8a1f', '#ffffff', '#7a4dff'].map(C);
  for (const zc of [-29.4, -26.7, -21.3, -18.6]) { STOREG.add(box(5.6, 0.12, 1.0, shelfM, 17.8, 0.25, zc), box(5.6, 1.8, 0.08, shelfM, 17.8, 1.05, zc));
    for (const y of [0.32, 0.8, 1.28, 1.76]) { STOREG.add(box(5.6, 0.04, 1.0, shelfM, 17.8, y, zc));
      if (y < 1.7) for (const side of [-1, 1]) for (let x = 15.2; x < 20.5; x += 0.2 + PR() * 0.12) { const w = 0.12 + PR() * 0.1, h = 0.14 + PR() * 0.22; prods.push({ x, y: y + 0.02 + h / 2, z: zc + side * 0.25, w, h, c: PC[(PR() * PC.length) | 0] }); } } }
  const PI = new THREE.InstancedMesh(prodGeo, STD(0xffffff, { roughness: 0.5 }), prods.length); prods.forEach((q, i) => { PI.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(q.x, q.y, q.z), new THREE.Quaternion(), new THREE.Vector3(q.w, q.h, 0.32))); PI.setColorAt(i, q.c); }); PI.castShadow = true; STOREG.add(PI);
  // glowing fridges on the back wall
  const fr = FRIDGEM;
  for (let z = -30.2; z < -17.6; z += 1.3) { STOREG.add(box(0.12, 2.1, 1.18, fr, bx - 0.08, 1.2, z + 0.6)); STOREG.add(box(0.1, 2.2, 0.08, 0x9aa3ad, bx - 0.1, 1.2, z)); }
  // counter
  STOREG.add(box(1.4, 1.05, 2.6, 0x3d7bff, 13.6, 0.68, -29.2), box(1.5, 0.06, 2.7, 0xf5f5f5, 13.6, 1.22, -29.2));
  // ceiling light panels
  for (const x of [14.2, 17.4, 20.6]) for (const z of [-27.5, -20.5]) { const lp = box(1.6, 0.04, 0.5, STD(0xffffff, { emissive: 0xffffff, emissiveIntensity: 2 }), x, 3.6, z); lp.castShadow = false; STOREG.add(lp); }
  // glass front + mullions
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.5 });
  const frameM = STD(0x2b2f3a, { roughness: 0.4, metalness: 0.4 });
  const [d0, d1] = STORE.door;
  for (const [a, b] of [[z0, d0], [d1, z1]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 3.5), glassM); g.position.set(fx + 0.2, 0.15 + 1.75, (a + b) / 2); g.rotation.y = -Math.PI / 2; g.renderOrder = 2; STOREG.add(g); }
  for (const z of [z0, -28, d0 - 0.05, d1 + 0.05, -20, z1]) STOREG.add(box(0.12, 3.6, 0.12, frameM, fx + 0.2, 1.95, z));
  STOREG.add(box(0.14, 0.12, z1 - z0, frameM, fx + 0.2, 0.2, (z0 + z1) / 2), box(0.14, 0.14, z1 - z0, frameM, fx + 0.2, 3.66, (z0 + z1) / 2));
  // door (hinged at d1, swings inward)
  const door = new THREE.Group(); door.position.set(fx + 0.2, 0.15, d1); const dl = d1 - d0;
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(dl - 0.1, 3.0), glassM); dg.position.set(0, 1.55, -dl / 2); dg.rotation.y = -Math.PI / 2; dg.renderOrder = 2; door.add(dg);
  door.add(box(0.08, 3.1, 0.08, frameM, 0, 1.55, -dl + 0.04), box(0.08, 3.1, 0.08, frameM, 0, 1.55, -0.04), box(0.08, 0.1, dl, frameM, 0, 0.05, -dl / 2), box(0.08, 0.1, dl, frameM, 0, 3.05, -dl / 2), box(0.06, 0.6, 0.06, 0xd8d8d8, 0.08, 1.2, -dl + 0.2));
  STOREG.add(door); STORE.doorG = door;
}

// ---------- street furniture: trees, lamps, lights, hydrants ----------
const FURN = new THREE.Group(); CITY.add(FURN);
const LEAF = ['#43b649', '#5cc93f', '#2fa35a', '#7ad04a'].map(c => STD(c, { roughness: 0.85 }));
function leafGeo(r, seed) { const g = new THREE.IcosahedronGeometry(r, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + 0.18 * noise.noise3d(v.x * 1.3 + seed, v.y * 1.3, v.z * 1.3); p.setXYZ(i, v.x * k, v.y * k * 0.9, v.z * k); } g.computeVertexNormals(); return g; }
const LEAFG = [0, 1, 2, 3].map(i => leafGeo(1, i * 3.7));
function tree(x, z, s = 1) { FURN.add(cyl(0.12 * s, 0.17 * s, 3.2 * s, 0x7a5236, x, 0.15 + 1.6 * s, z, 8)); const r = RNG((x * 31 + z * 7) | 0);
  for (let i = 0; i < 3; i++) { const m = mesh(LEAFG[(r() * 4) | 0], LEAF[(r() * 4) | 0], x + (r() - 0.5) * 1.2 * s, (3.6 + r() * 1.1) * s, z + (r() - 0.5) * 1.2 * s); m.scale.setScalar((1.25 + r() * 0.5) * s); FURN.add(m); } }
const LAMPS = [];
const LAMPHEAD = STD(0xfff4d8, { emissive: 0xffc070, emissiveIntensity: 0 });
for (const s of [-1, 1]) for (let z = -280; z <= 280; z += 16) {
  if (Math.abs(z) > 9 && !(s > 0 && z + 8 > -36 && z + 8 < -12)) tree(s * 7.6, z + 8 * (s > 0 ? 1 : 0.5), Math.abs(z) < 120 ? 1 : 0.9);
  if (((z + 280) / 16) % 2 === 0 && Math.abs(z) > 9) { FURN.add(cyl(0.07, 0.09, 6.6, 0x39404d, s * 7.45, 3.45, z + 2), box(1.7, 0.08, 0.08, 0x39404d, s * 6.65, 6.7, z + 2)); FURN.add(box(0.7, 0.16, 0.34, LAMPHEAD, s * 5.95, 6.62, z + 2)); LAMPS.push(new THREE.Vector3(s * 5.95, 6.35, z + 2)); }
}
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { FURN.add(cyl(0.08, 0.08, 4.2, 0x2c313a, sx * 7.7, 2.25, sz * 7.7, 10)); const hb = box(0.38, 1.0, 0.32, 0x2c313a, sx * 7.7, 4.1, sz * 7.7); FURN.add(hb);
  for (let i = 0; i < 3; i++) FURN.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), STD(['#ff3b30', '#ffcc00', '#34c759'][i], { emissive: ['#ff3b30', '#ffcc00', '#34c759'][i], emissiveIntensity: i === 2 ? 1.2 : 0.1 }), sx * 7.7 - sx * 0.17, 4.42 - i * 0.3, sz * 7.7)); }
for (const [x, z] of [[7.75, 22], [-7.75, -26], [7.75, -46], [-7.75, 40]]) { FURN.add(cyl(0.13, 0.15, 0.6, 0xe53935, x, 0.45, z, 12), cyl(0.15, 0.15, 0.08, 0xe53935, x, 0.78, z, 12)); }
// coffee shop tables (left side, z 13..25)
const TABLES = [[-10.9, 15.5], [-10.9, 19], [-10.9, 22.5]];
for (const [x, z] of TABLES) { FURN.add(cyl(0.45, 0.45, 0.05, 0xffffff, x, 0.9, z, 20), cyl(0.04, 0.04, 0.75, 0x444444, x, 0.52, z, 8)); for (const dz of [-0.75, 0.75]) FURN.add(box(0.45, 0.06, 0.45, 0xff7043, x, 0.6, z + dz), box(0.45, 0.5, 0.05, 0xff7043, x, 0.85, z + dz * 1.45)); }
// big clock screen on the corner building across the road
// merge static meshes per material
function bake(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), dead = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.geometry.attributes.uv || o.material.transparent || o.userData.keep || o === STORE.doorG || isUnder(o, STORE.doorG)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 's' : ''); if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, list: [] }); groups.get(key).list.push(g); dead.push(o); });
  for (const o of dead) o.parent.remove(o);
  for (const { mat, cast, list } of groups.values()) for (let i = 0; i < list.length; i += 500) { const m = new THREE.Mesh(mergeGeometries(list.slice(i, i + 500)), mat); m.castShadow = cast; m.receiveShadow = true; root.add(m); }
}
const isUnder = (o, s) => { for (let p = o; p; p = p.parent) if (p === s) return true; return false; };
bake(BLD); bake(FURN); bake(STOREG);
// lamp glows (night)
const LAMPGLOW = LAMPS.map(p => { const g = glow(0xffb866, 3.2, 0); g.position.copy(p); CITY.add(g); return g; });
const CARG = (() => {
  const paint = mergeGeometries([new RoundedBoxGeometry(1.86, 0.62, 4.3, 3, 0.18).translate(0, 0.62, 0), new RoundedBoxGeometry(1.6, 0.08, 1.95, 2, 0.035).translate(0, 1.5, -0.25)].map(g => g.deleteAttribute('uv')));
  const glass = new RoundedBoxGeometry(1.64, 0.56, 2.15, 3, 0.14).deleteAttribute('uv').translate(0, 1.2, -0.25);
  const wheels = mergeGeometries([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => new THREE.CylinderGeometry(0.35, 0.35, 0.26, 18).deleteAttribute('uv').rotateZ(Math.PI / 2).translate(sx * 0.84, 0.35, sz * 1.38)));
  const hubs = mergeGeometries([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14).deleteAttribute('uv').rotateZ(Math.PI / 2).translate(sx * 0.97, 0.35, sz * 1.38)));
  const headl = mergeGeometries([-1, 1].map(s => new RoundedBoxGeometry(0.42, 0.15, 0.06, 2, 0.02).deleteAttribute('uv').translate(s * 0.6, 0.74, 2.14)));
  const taill = mergeGeometries([-1, 1].map(s => new RoundedBoxGeometry(0.4, 0.13, 0.06, 2, 0.02).deleteAttribute('uv').translate(s * 0.62, 0.78, -2.14)));
  return { paint, glass, wheels, hubs, headl, taill };
})();

import { Crowd, looks, gaitJ, POSE, freqOf, baseJ, blendJ, handPos, headPos } from './people.js';

// =====================================================================================
// timeline: ten "days", each with a dissolve to warm white between them
// =====================================================================================
const DUR = 98;
const BEATS = [
  { id: 'd1', t0: 0, t1: 14.8, day: 1, sky: 'morning' }, { id: 'd4', t0: 14.8, t1: 25.8, day: 4, sky: 'day' }, { id: 'd7', t0: 25.8, t1: 35.8, day: 7, sky: 'day' },
  { id: 'd10', t0: 35.8, t1: 45.8, day: 10, sky: 'day' }, { id: 'd14', t0: 45.8, t1: 55.8, day: 14, sky: 'day' }, { id: 'd18', t0: 55.8, t1: 65.8, day: 18, sky: 'storm' },
  { id: 'd22', t0: 65.8, t1: 75.3, day: 22, sky: 'day' }, { id: 'd26', t0: 75.3, t1: 84.8, day: 26, sky: 'night' }, { id: 'd30', t0: 84.8, t1: 92, day: 30, sky: 'gold' }, { id: 'end', t0: 92, t1: DUR + 1, day: 30, sky: 'gold' }];
const BI = Object.fromEntries(BEATS.map(b => [b.id, b]));
const DISS = BEATS.slice(1, 9).map(b => b.t0);     // dissolve centres
const beatAt = t => BEATS.find(b => t >= b.t0 && t < b.t1) || BEATS[BEATS.length - 1];
const CAPS = [[0.7, 6.0, 'What if your luck <b>doubled</b> every day?', 'title'], [7.2, 13.8, '<b>Day 1</b> · luck ×1 — just a normal morning'],
  [15.9, 19.9, '<b>Day 4</b> · ×8 — every light turns green for you'], [20.4, 25.0, '…and a coin is waiting on the sidewalk'],
  [26.8, 35.0, '<b>Day 7</b> · ×64 — money simply finds you'], [36.8, 45.0, '<b>Day 10</b> · ×512 — four-leaf clovers grow wherever you walk'],
  [46.8, 55.0, '<b>Day 14</b> · ×8,192 — your very first ticket wins the jackpot'], [56.8, 65.0, '<b>Day 18</b> · ×131,072 — the rain politely steps aside'],
  [66.8, 74.6, '<b>Day 22</b> · ×2,097,152 — the whole city blooms as you pass'], [76.3, 84.2, '<b>Day 26</b> · ×33,554,432 — shooting stars arrive right on cue'],
  [85.8, 91.6, '<b>Day 30</b> · ×536,870,912 — the luckiest person who ever lived'], [92.6, 97.0, 'Would <b>you</b> want this luck?', 'title']];
const dayAt = t => { let d = 1; for (const b of BEATS) if (t >= b.t0 - 0.55) d = b.day;
  for (let i = 0; i < DISS.length; i++) { const c = DISS[i], a = BEATS[i].day, b = BEATS[i + 1].day; if (t > c - 0.55 && t < c + 0.55) d = Math.round(lerp(a, b, smooth((t - c + 0.55) / 1.1))); }
  return d; };
const luckOf = d => (2 ** (d - 1)).toLocaleString('en-US');

// =====================================================================================
// you (green hoodie) and everybody else
// =====================================================================================
const RP = RNG(2025), rp = (a, b) => a + RP() * (b - a);
const YOU = looks(RP, { skin: C('#e3b08a'), hair: C('#3a2414'), long: false, shirt: C('#22c55e'), trs: C('#24457e'), iris: C('#3b2414'), sc: 1.0, seed: 4, short: false });
const walkJ = (v, t, s = 4) => gaitJ(v, 1.3 + TAU * freqOf(v) * t, t, s);
const D2_CUT = 4.6, COIN = V3(9.6, 0.165, -9.75), T_PICK = BI.d4.t0 + 7.55, T_CATCH = BI.d7.t0 + 7.0, T_WIN = BI.d14.t0 + 2.6;
function youRaw(t) {
  const b = beatAt(t), u = t - b.t0;
  if (b.id === 'd1') { const J = walkJ(1.3, t); J.headY = 0.25 * Math.sin(t * 0.5); return { x: 9.6, z: 34 - 1.3 * t, yaw: Math.PI, J }; }
  if (b.id === 'd4') {
    if (u < D2_CUT) { const J = walkJ(1.35, t); J.headP = -0.1 + 0.08 * smooth((u - 2.5) / 0.6); return { x: 9.6, z: 16 - 1.35 * u, yaw: Math.PI, J }; }
    const w = Math.min(u - D2_CUT, 2.3), z = -6.3 - 1.3 * w + 0.65 * Math.max(0, w - 1.8) ** 2, walking = u - D2_CUT < 2.4;
    let J = walking ? walkJ(1.3 * smooth((2.4 - (u - D2_CUT)) / 0.5), t) : POSE.idle(t, 4);
    const bend = smooth((u - 7.0) / 0.45) * (1 - smooth((u - 7.9) / 0.6));
    J.lean = lerp(J.lean, 0.95, bend); J.hipY = lerp(J.hipY, 0.62, bend); J.lh = lerp(J.lh, 0.9, bend); J.rh = lerp(J.rh, 0.9, bend); J.lk = lerp(J.lk, 1.5, bend); J.rk = lerp(J.rk, 1.5, bend);
    J.rs = lerp(J.rs, 0.95, bend); J.re = lerp(J.re, 0.1, bend); J.headP = lerp(J.headP, 0.3, bend);
    const look = smooth((u - 8.2) / 0.6); J.rs = lerp(J.rs, 1.35, look); J.re = lerp(J.re, 1.55, look); J.headP = lerp(J.headP, 0.38, look); J.mo = 0.25 * look;
    J.headP -= 0.25 * smooth((u - 6.0) / 0.6) * (1 - bend) * (1 - look);
    return { x: 9.6, z, yaw: Math.PI, J }; }
  if (b.id === 'd7') { const w = Math.min(u, 4.2), z = -13.4 - 1.3 * w + 0.15 * Math.max(0, w - 3.2) ** 2, walking = u < 4.3;
    const J = walking ? walkJ(1.3 * smooth((4.3 - u) / 0.6), t) : POSE.idle(t, 4); const up = smooth((u - 4.0) / 0.8); J.headP -= 0.6 * up;
    const c = smooth((u - 6.0) / 0.5) * (1 - smooth((u - 7.6) / 0.6)); J.ls = lerp(J.ls, 2.0, c); J.rs = lerp(J.rs, 2.1, c); J.le = lerp(J.le, 0.45, c); J.re = lerp(J.re, 0.4, c); J.la = lerp(J.la, -0.1, c); J.ra = lerp(J.ra, -0.1, c);
    const hold = smooth((u - 7.4) / 0.6); J.rs = lerp(J.rs, 1.3, hold); J.re = lerp(J.re, 1.6, hold); J.headP = lerp(J.headP, 0.35, hold); J.mo = 0.35 * hold;
    return { x: 9.6, z, yaw: Math.PI, J }; }
  if (b.id === 'd10') { const J = walkJ(1.3, t); J.headY = 0.3 * Math.sin(u * 0.6); J.headP = 0.05; return { x: -9.6, z: 33 - 1.3 * u, yaw: Math.PI, J }; }
  if (b.id === 'd14') { let J = POSE.idle(t, 4); const hold = 1 - smooth((u - 2.4) / 0.3); J.rs = lerp(J.rs, 1.45, hold); J.re = lerp(J.re, 1.15, hold); J.headP = lerp(J.headP, 0.3, hold);
    const ch = smooth((u - 2.75) / 0.35); if (ch > 0) J = blendJ(J, POSE.cheer(t, 4), ch * (1 - smooth((u - 7.2) / 0.8))); if (u > 7.2) J = blendJ(J, POSE.clap(t, 4), smooth((u - 7.2) / 0.8));
    J.hipY += 0.07 * Math.max(0, Math.sin((u - 2.8) * 6.5)) * ch * (u < 6 ? 1 : 0); return { x: 11.0, z: -24.0, yaw: Math.PI / 2 - 0.15 * ch, J }; }
  if (b.id === 'd18') { const J = walkJ(1.25, t); J.headP = -0.35 * smooth((u - 2.5) / 1) * (1 - smooth((u - 6.5) / 1)); J.ls += 0.3; J.rs += 0.3; J.la = 0.35; J.ra = 0.35; return { x: 9.6, z: -38 - 1.25 * u, yaw: Math.PI, J }; }
  if (b.id === 'd22') { const J = walkJ(1.25, t); J.headY = 0.45 * Math.sin(u * 0.8); J.headP = -0.1; J.mo = 0.3; return { x: -9.6, z: 30 + 1.25 * u, yaw: 0, J }; }
  if (b.id === 'd26') { let J = POSE.idle(t, 4); J.headP = -0.62; const w = smooth((u - 5.0) / 0.8); J.ls = lerp(J.ls, 1.15, w); J.rs = lerp(J.rs, 1.15, w); J.le = lerp(J.le, 2.05, w); J.re = lerp(J.re, 2.05, w); J.la = lerp(J.la, -0.42, w); J.ra = lerp(J.ra, -0.42, w); J.headP = lerp(J.headP, -0.42, w);
    return { x: 9.6, z: 12.4, yaw: Math.PI, J }; }
  // day 30 + end: centre of the crossroads, arms slowly rising
  const tt = t - BI.d30.t0; let J = POSE.idle(t, 4); const up = smooth((tt - 1.0) / 2.8); J.ls = lerp(J.ls, 2.55, up); J.rs = lerp(J.rs, 2.55, up); J.la = lerp(J.la, 0.55, up); J.ra = lerp(J.ra, 0.55, up); J.le = lerp(J.le, 0.25, up); J.re = lerp(J.re, 0.25, up);
  J.headP = lerp(0, -0.3, up) + 0.04 * Math.sin(t * 0.8); J.mo = 0.3 * up; J.lean = -0.06 * up;
  return { x: 0, z: 0.5, yaw: Math.PI * 0.85, J };
}
const _yc = new Map(); YOU.frame = t => { const k = t.toFixed(4); if (!_yc.has(k)) { if (_yc.size > 64) _yc.clear(); _yc.set(k, youRaw(t)); } return _yc.get(k); };
const PEOPLE = [YOU];

// =====================================================================================
// shots (slow and smooth)
// =====================================================================================
const SHOTS = [], shot = (t0, t1, f) => SHOTS.push({ t0, t1, f }); const yp = t => { const s = YOU.frame(t); return V3(s.x, groundY(s.x, s.z), s.z); };
{ const a = hermite([[0, -34, 82, 130], [3.2, -6, 34, 70], [6.5, 11.6, 2.2, 30.6]]), l = hermite([[0, 4, 0, 20], [3.2, 8, 0, 34], [6.5, 9.6, 1.35, 25.0]]); shot(0, 6.5, t => ({ p: a(t), l: l(t), fov: 50 })); }
shot(6.5, BI.d4.t0, t => { const y = yp(t), u = (t - 6.5) / 8.3; return { p: V3(y.x - 1.5 + 0.4 * u, 1.55, y.z - 4.2 + 0.8 * u), l: V3(y.x, 1.3, y.z), fov: 42 }; });
shot(BI.d4.t0, BI.d4.t0 + D2_CUT, t => { const y = yp(t), u = smooth((t - BI.d4.t0) / D2_CUT); return { p: V3(y.x + 1.0, 1.75, y.z + 4.3), l: V3(lerp(8.4, 9.2, u), lerp(2.6, 1.6, u), lerp(7.6, y.z - 6, u)), fov: 46 }; });
shot(BI.d4.t0 + D2_CUT, BI.d7.t0, t => { const u = smooth((t - BI.d4.t0 - D2_CUT) / 6.4); return { p: V3(8.55 + 0.2 * u, 0.42 + 0.2 * u, -12.2 + 0.3 * u), l: V3(9.6, lerp(0.75, 1.15, smooth((t - T_PICK - 0.3) / 1.5)), -9.2), fov: 50 }; });
shot(BI.d7.t0, BI.d10.t0, t => { const u = t - BI.d7.t0, k = smooth((u - 6.4) / 1.4); return { p: V3(10.7, 0.95, -14.4 - 0.25 * Math.min(u, 4.2)), l: V3(lerp(8.6, 9.3, k), lerp(3.8, 1.5, k), lerp(-20.5, -19.2, k)), fov: 58 }; });
shot(BI.d10.t0, BI.d14.t0, t => { const y = yp(t), u = (t - BI.d10.t0) / 10; return { p: V3(y.x + 0.75, 1.05 + 0.25 * u, y.z + 3.4 - 0.4 * u), l: V3(y.x - 0.1, 0.75, y.z - 1.2), fov: 50 }; });
shot(BI.d14.t0, BI.d18.t0, t => { const u = t - BI.d14.t0; if (u < 2.55) return { p: V3(8.3 - 0.08 * u, 2.0, -21.6 - 0.12 * u), l: V3(12.1, 2.4, -24.3), fov: 48 };
  const k = smooth((u - 2.55) / 7.4), a = Math.PI + lerp(-0.5, 0.48, k); return { p: V3(11.0 + Math.cos(a) * 3.3, 1.65, -24.0 + Math.sin(a) * 3.3), l: V3(11.6, 1.75 + 0.5 * (1 - k), -24.0), fov: 50 }; });
shot(BI.d18.t0, BI.d22.t0, t => { const y = yp(t), u = smooth((t - BI.d18.t0) / 10); return { p: V3(5.6 - 0.4 * u, 3.0 + 3.6 * u, y.z + 8.5 + 2 * u), l: V3(y.x - 0.6 * u, 1.3 + 2.4 * u, y.z - 3 - 11 * u), fov: 54 }; });
shot(BI.d22.t0, BI.d26.t0, t => { const y = yp(t), u = (t - BI.d22.t0) / 9.5; return { p: V3(-6.85, 1.55 + 0.6 * u, y.z - 2.6), l: V3(-9.0, 2.0 + 0.8 * u, y.z + 5.5), fov: 52 }; });
shot(BI.d26.t0, BI.d30.t0, t => { const u = smooth((t - BI.d26.t0) / 9.5); return { p: V3(10.45, 0.6, 15.9 + 0.5 * u), l: V3(8.9, 6.5 + 2 * u, 2.0), fov: 64 }; });
shot(BI.d30.t0, BI.end.t0, t => { const u = smooth((t - BI.d30.t0) / 7.2), a = lerp(0.4, 1.9, u); return { p: V3(Math.cos(a) * 5.6, 1.35 + 0.5 * u, 0.5 + Math.sin(a) * 5.6), l: V3(0, 1.55, 0.5), fov: 48 }; });
shot(BI.end.t0, DUR + 1, t => { const u = smooth((t - BI.end.t0) / 6); return { p: V3(lerp(3.85, 2.0, u), lerp(2.25, 58, u), lerp(5.75, 62, u)), l: V3(0, lerp(1.6, 0, u), lerp(0.5, -6, u)), fov: lerp(48, 54, u) }; });
const camAt = t => { const s = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; return s.f(t); };

// walkers that never cross you or the camera
const CAMP = []; for (let t = 0; t < DUR; t += 0.2) { const c = camAt(t); if (c.p.y < 3.2) CAMP.push({ t, x: c.p.x, z: c.p.z }); }
const YOUP = []; for (let t = 0; t < DUR; t += 0.2) { const s = YOU.frame(t); YOUP.push({ t, x: s.x, z: s.z }); }
const wrap = (z, W = 300) => ((z + W / 2) % W + W) % W - W / 2;
const walkerAt = (q, t) => ({ x: q.x0 + q.dir[0] * q.v * t, z: wrap(q.z0 + q.dir[1] * q.v * t) });
function addWalker(q) {
  for (const P of [YOUP, CAMP]) for (const c of P) { const a = walkerAt(q, c.t); if (Math.hypot(a.x - c.x, a.z - c.z) < (P === YOUP ? 1.3 : 0.95)) return; }
  for (const o of PEOPLE) if (o.walk) for (let t = 0; t < DUR; t += 0.5) { const a = walkerAt(q, t), b = walkerAt(o, t); if (Math.hypot(a.x - b.x, a.z - b.z) < 0.7) return; }
  q.walk = true; q.night = RP() < 0.3;
  q.frame = t => { const b = beatAt(t); if (b.id === 'd26' && !q.night) return null; const a = walkerAt(q, t);
    if ((b.id === 'd14' && Math.abs(a.x - 11) < 5 && Math.abs(a.z + 24) < 6) || ((b.id === 'd30' || b.id === 'end') && Math.hypot(a.x, a.z) < 13)) return null;
    let yaw = Math.atan2(q.dir[0], q.dir[1]), J = walkJ(q.v, t + q.seed, q.seed);
    if (b.id === 'd22') { const y = YOU.frame(t), d = Math.hypot(y.x - a.x, y.z - a.z); if (d < 7.5) { const k = smooth((7.5 - d) / 2); yaw = yaw + wrapA(Math.atan2(y.x - a.x, y.z - a.z) - yaw) * k; J = blendJ(J, POSE.wave(t, q.seed), k); } }
    return { x: a.x, z: a.z, y: groundY(a.x, a.z), yaw, J }; };
  PEOPLE.push(q);
}
for (const s of [-1, 1]) for (let i = 0; i < 52; i++) { const dz = RP() < 0.5 ? -1 : 1; addWalker(looks(RP, { x0: s * (dz < 0 ? rp(10.2, 11.2) : rp(8.2, 9.0)), z0: rp(-150, 150), dir: [0, dz], v: rp(1.05, 1.45) })); }
for (const sz of [-1, 1]) for (let i = 0; i < 14; i++) { const dx = RP() < 0.5 ? -1 : 1; const x0 = (RP() < 0.5 ? -1 : 1) * rp(16, 90); const q = looks(RP, { x0: 0, z0: 0, dir: [0, 0], v: 0 });
  q.cross = { x0, z: sz * rp(7.8, 10.4), dx, v: rp(1.05, 1.4) }; q.frame = t => { const b = beatAt(t); if (b.id === 'd26') return null; const x = q.cross.x0 + q.cross.dx * q.cross.v * t; if (Math.abs(x) < 13 || Math.abs(x) > 120) return null; return { x, z: q.cross.z, y: 0.15, yaw: Math.atan2(q.cross.dx, 0), J: walkJ(q.cross.v, t, q.seed) }; }; PEOPLE.push(q); }
// the lottery crowd (day 14) and the crowd at the crossroads (day 30)
for (let i = 0; i < 10; i++) { const side = i % 2 ? 1 : -1, x = rp(9.0, 11.6), z = -24 + side * rp(3.0, 5.0); if (Math.abs(z + 24) < 2.7) continue;
  const q = looks(RP, { short: RP() < 0.5 }); const pose = i % 3 === 0 ? 'cheer' : 'clap'; q.frame = t => { const b = beatAt(t); if (b.id !== 'd14') return null; const yaw = Math.atan2(11 - x, -24 - z);
    return { x, z, y: 0.15, yaw, J: t > T_WIN + 0.3 + i * 0.07 ? POSE[pose](t, q.seed) : POSE.idle(t, q.seed) }; }; PEOPLE.push(q); }
for (let i = 0; i < 18; i++) { const sx = i % 4 < 2 ? 1 : -1, sz = i % 2 ? 1 : -1, x = sx * rp(8.2, 11), z = sz * rp(8.2, 11.5); const q = looks(RP, { short: RP() < 0.5 }); const pose = ['cheer', 'clap', 'wave'][i % 3];
  q.frame = t => { const b = beatAt(t); if (b.id !== 'd30' && b.id !== 'end') return null; return { x, z, y: 0.15, yaw: Math.atan2(-x, 0.5 - z), J: t - BI.d30.t0 > 1.5 + (i % 5) * 0.3 ? POSE[pose](t, q.seed) : POSE.idle(t, q.seed) }; }; PEOPLE.push(q); }
const CROWD = new Crowd(scene, PEOPLE);

// =====================================================================================
// cars: traffic on the main road (hidden around you on day 30), waiting cars on the cross road
// =====================================================================================
const CARS = [], CARCOL = ['#ff1744', '#ffd600', '#2979ff', '#ff4081', '#ffffff', '#ff9100', '#d500f9', '#00b8d4', '#212121', '#ffea00'].map(C), RC = RNG(808);
for (const [x, dirZ, v] of [[1.75, -1, 11.5], [5.25, -1, 9], [-1.75, 1, 11], [-5.25, 1, 8.5]]) { let z = -280 + RC() * 20; while (z < 280) { CARS.push({ x, dirZ, v, z0: z, c: CARCOL[(RC() * CARCOL.length) | 0], moving: true }); z += 18 + RC() * 26; } }
for (const [sx, zl] of [[1, -1.75], [1, -5.25], [-1, 1.75], [-1, 5.25]]) { let x = 13.5 + RC() * 3; for (let k = 0; k < 3; k++) { CARS.push({ x: sx * x, z0: zl, yaw: sx > 0 ? -Math.PI / 2 : Math.PI / 2, c: CARCOL[(RC() * CARCOL.length) | 0], moving: false }); x += 6 + RC() * 3; } }
function carPos(c, t) { if (!c.moving) return { x: c.x, z: c.z0, yaw: c.yaw }; return { x: c.x, z: wrap(c.z0 + c.dirZ * c.v * t, 600), yaw: c.dirZ > 0 ? 0 : Math.PI }; }
const CARI = (() => { const n = CARS.length, M = (g, mat) => { const m = new THREE.InstancedMesh(g, mat, n); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const o = { paint: M(CARG.paint, STD(0xffffff, { roughness: 0.25, metalness: 0.35 })), glass: M(CARG.glass, STD(0x1c2a3a, { roughness: 0.08, metalness: 0.6 })), wheels: M(CARG.wheels, STD(0x1a1a1a, { roughness: 0.9 })), hubs: M(CARG.hubs, STD(0xd0d4d8, { metalness: 0.8, roughness: 0.3 })),
    headl: M(CARG.headl, new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff2c0, emissiveIntensity: 0.3 })), taill: M(CARG.taill, new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 0.5 })) };
  CARS.forEach((c, i) => o.paint.setColorAt(i, c.c)); return o; })();
const HL = CARS.map(() => [-1, 1].map(() => { const g = glow(0xfff1c8, 2.4, 0); scene.add(g); return g; }));
const ZM = new THREE.Matrix4().makeScale(0, 0, 0), mT = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z), mRY = a => new THREE.Matrix4().makeRotationY(a);
function updateCars(t, night, hideR) {
  CARS.forEach((c, i) => { const p = carPos(c, t), hid = hideR && Math.hypot(p.x, p.z) < hideR && c.moving, m = hid ? ZM : mT(p.x, 0, p.z).multiply(mRY(p.yaw)); for (const k of Object.keys(CARI)) CARI[k].setMatrixAt(i, m);
    HL[i].forEach((g, k) => { g.position.set(p.x + Math.cos(p.yaw) * (k ? -0.6 : 0.6) + Math.sin(p.yaw) * 2.3, 0.74, p.z - Math.sin(p.yaw) * (k ? -0.6 : 0.6) + Math.cos(p.yaw) * 2.3); g.material.opacity = hid ? 0 : 0.6 * night; }); });
  for (const k of Object.keys(CARI)) CARI[k].instanceMatrix.needsUpdate = true; CARI.headl.material.emissiveIntensity = lerp(0.3, 3, night);
}

// =====================================================================================
// the lucky things
// =====================================================================================
const FX = new THREE.Group(); scene.add(FX);
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); FX.add(m); return m; };
// day 4: pedestrian signal that turns green for you; the coin
const sigTex = (on) => canvasTex(128, 160, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.fillStyle = on ? '#3dff7a' : '#ff4a3d'; x.shadowColor = x.fillStyle; x.shadowBlur = 18;
  if (on) { x.beginPath(); x.arc(64, 34, 12, 0, TAU); x.fill(); x.fillRect(56, 50, 18, 46); x.save(); x.translate(60, 92); x.rotate(0.35); x.fillRect(-5, 0, 10, 44); x.restore(); x.save(); x.translate(70, 92); x.rotate(-0.4); x.fillRect(-5, 0, 10, 44); x.restore(); x.save(); x.translate(58, 56); x.rotate(0.7); x.fillRect(-4, 0, 8, 34); x.restore(); x.save(); x.translate(72, 56); x.rotate(-0.8); x.fillRect(-4, 0, 8, 34); x.restore(); }
  else { x.fillRect(40, 50, 48, 62); for (let i = 0; i < 4; i++) x.fillRect(40 + i * 12, 22, 9, 34); x.fillRect(84, 70, 18, 10); } }, true, false);
const SIG = { red: sigTex(false), green: sigTex(true) };
const SIGM = basic(0xffffff, { map: SIG.red, toneMapped: false });
FX.add(box(0.12, 2.6, 0.12, 0x2c313a, 8.25, 1.45, 7.55)); const sigBox = add(new THREE.BoxGeometry(0.5, 0.62, 0.22), STD(0x1a1d22), 8.25, 2.9, 7.55); const sig = add(new THREE.PlaneGeometry(0.42, 0.52), SIGM, 8.25, 2.9, 7.67);
const sigGlow = glow(0x3dff7a, 1.6, 0); sigGlow.position.set(8.25, 2.9, 7.8); FX.add(sigGlow);
const coin = add(new THREE.CylinderGeometry(0.075, 0.075, 0.014, 24), STD(0xffc928, { metalness: 1, roughness: 0.22, emissive: 0x6b4a00, emissiveIntensity: 0.4 }), COIN.x, COIN.y, COIN.z);
const coinGlint = glow(0xfff2b0, 0.6, 0); FX.add(coinGlint);
// day 7: a $100 bill floating down
const noteTex = canvasTex(256, 112, (x, w, h) => { x.fillStyle = '#cfe8c4'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2f6b3a'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#2f6b3a'; x.font = '800 54px Poppins'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$100', w / 2, h / 2 + 2); x.beginPath(); x.arc(42, h / 2, 22, 0, TAU); x.stroke(); x.beginPath(); x.arc(w - 42, h / 2, 22, 0, TAU); x.stroke(); }, true, false);
const note = add(new THREE.PlaneGeometry(0.34, 0.15), STD(0xffffff, { map: noteTex, side: THREE.DoubleSide, roughness: 0.7 }));
const noteSparkle = glow(0xfff6c8, 1.0, 0); FX.add(noteSparkle);
// day 10: four-leaf clovers sprouting behind you + butterflies
const cloverGeo = (() => { const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.bezierCurveTo(-0.07, 0.03, -0.09, 0.11, -0.04, 0.12); leaf.bezierCurveTo(-0.015, 0.125, 0, 0.1, 0, 0.09); leaf.bezierCurveTo(0, 0.1, 0.015, 0.125, 0.04, 0.12); leaf.bezierCurveTo(0.09, 0.11, 0.07, 0.03, 0, 0);
  const parts = []; for (let k = 0; k < 4; k++) { const g = new THREE.ShapeGeometry(leaf, 6); g.rotateX(-Math.PI / 2 + 0.35); g.rotateY(k * Math.PI / 2); g.translate(0, 0.12, 0); parts.push(g); }
  const st = new THREE.CylinderGeometry(0.007, 0.009, 0.12, 5); st.translate(0, 0.06, 0); parts.push(st); return mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g; })); })();
const CLV = []; { let z = 32.0, k = 0; while (z > 19.5) { CLV.push({ x: -9.6 + (k % 2 ? 1 : -1) * rp(0.25, 0.75), z: z + rp(-0.1, 0.1), rot: RP() * TAU, s: rp(1.6, 2.4) }); z -= rp(0.22, 0.42); k++; } }
const CLVM = new THREE.InstancedMesh(cloverGeo, STD(0x2fbf4a, { side: THREE.DoubleSide, roughness: 0.6, emissive: 0x0f5a1e, emissiveIntensity: 0.35 }), CLV.length); CLVM.castShadow = true; CLVM.frustumCulled = false; FX.add(CLVM);
const BFLY = [0, 1, 2, 3, 4].map(i => { const c = ['#ff9f1c', '#3ab0ff', '#ff5ca8', '#ffd23f', '#9b5cff'][i]; const tx = canvasTex(64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.fillStyle = c; x.beginPath(); x.ellipse(30, 22, 26, 18, -0.3, 0, TAU); x.fill(); x.beginPath(); x.ellipse(28, 48, 16, 12, 0.4, 0, TAU); x.fill(); x.fillStyle = '#222'; x.beginPath(); x.arc(30, 22, 5, 0, TAU); x.fill(); x.strokeStyle = '#222'; x.lineWidth = 3; x.strokeRect(1, 0, 3, 64); }, true, false);
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, alphaTest: 0.5 }); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), m); w.geometry.translate(0.06, 0, 0); w.scale.x = s; g.add(w); } FX.add(g); return g; });
// day 14: the ticket, the sign turning into JACKPOT, confetti
const ticketTex = canvasTex(128, 80, (x, w, h) => { x.fillStyle = '#fff6d6'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8452c'; x.fillRect(0, 0, w, 20); x.fillStyle = '#fff'; x.font = '800 16px Poppins'; x.textAlign = 'center'; x.fillText('LOTTO', w / 2, 16); x.fillStyle = '#333'; x.font = '600 14px Poppins'; x.fillText('7  14  21  30', w / 2, 46); x.fillText('★ 2 ★ 4', w / 2, 68); }, true, false);
const ticket = add(new THREE.PlaneGeometry(0.16, 0.1), STD(0xffffff, { map: ticketTex, side: THREE.DoubleSide, roughness: 0.6 }));
const JACKM = (() => { const t = canvasTex(512, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#ffb300'); g.addColorStop(0.5, '#fff176'); g.addColorStop(1, '#ffb300'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#b3261e'; x.font = '800 78px Poppins'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('JACKPOT!', w / 2, h / 2 + 4); }, true, false); return STD(0xffffff, { map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.6 }); })();
const SIGNM0 = LOTTO.sign.material;
const CONF = Array.from({ length: 320 }, () => ({ x: rp(8.4, 13.2), z: rp(-28.5, -19.5), y0: rp(4.5, 8), t0: rp(0, 2.2), v: rp(0.7, 1.3), ph: RP() * TAU, sw: rp(0.2, 0.6), c: C(['#ff3d71', '#ffd23f', '#3ddc62', '#3ab0ff', '#ff9f1c', '#b26bff', '#ffffff'][(RP() * 7) | 0]) }));
const CONFM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.045), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF.length); CONF.forEach((q, i) => CONFM.setColorAt(i, q.c)); CONFM.frustumCulled = false; FX.add(CONFM);
const jackGlow = glow(0xffe08a, 6, 0); jackGlow.position.set(11.8, 3.85, -24); FX.add(jackGlow);
// day 18: rain everywhere except around you, a beam of sunlight, a rainbow
const RAIN = Array.from({ length: 1500 }, () => ({ x: rp(-15, 15), z: rp(-20, 14), o: RP() * 14 }));
const RAINM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.028, 0.85, 0.028), new THREE.MeshBasicMaterial({ color: 0xf2f6fb, transparent: true, opacity: 0.55, depthWrite: false }), RAIN.length); RAINM.frustumCulled = false; FX.add(RAINM);
const beam = add(new THREE.CylinderGeometry(0.9, 2.4, 30, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
const pool = add(new THREE.CircleGeometry(2.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
const rainbow = (() => { const g = new THREE.RingGeometry(70, 82, 96, 1, 0, Math.PI); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - 70) / 12, 0.5);
  const t = canvasTex(256, 4, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); ['#8b00ff', '#4b3bff', '#00a2ff', '#2bd96b', '#ffe600', '#ff8a00', '#ff2a2a'].forEach((c, i) => gr.addColorStop(i / 6, c)); x.fillStyle = gr; x.fillRect(0, 0, w, h); }, true, false);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false })); FX.add(m); return m; })();
// day 22: blossom bursting out of every tree, petals drifting
const TREES = []; for (const s of [-1, 1]) for (let z = -280; z <= 280; z += 16) { const tz = z + 8 * (s > 0 ? 1 : 0.5); if (tz > 6 && tz < 150) TREES.push({ x: s * 7.6, z: tz }); }
const BLOS = []; TREES.forEach((tr, ti) => { const r = RNG((tr.x * 31 + tr.z * 7) | 0); for (let i = 0; i < 4; i++) BLOS.push({ ti, x: tr.x + (r() - 0.5) * 1.5, y: 3.7 + r() * 1.3, z: tr.z + (r() - 0.5) * 1.5, s: 1.35 + r() * 0.5 }); });
const BLOSM = new THREE.InstancedMesh(LEAFG[1], STD(0xff9ccc, { roughness: 0.8, emissive: 0x803050, emissiveIntensity: 0.25 }), BLOS.length); BLOSM.castShadow = true; BLOSM.frustumCulled = false; FX.add(BLOSM);
const bloomAt = (tr, t) => { const tb = BI.d22.t0 + 0.8 + Math.abs(tr.z - 31) / 5.5 + (tr.x > 0 ? 0.5 : 0); return smooth((t - tb) / 1.0); };
const PET = Array.from({ length: 420 }, () => ({ ti: (RP() * TREES.length) | 0, dx: rp(-1, 1), dz: rp(-1, 1), o: RP() * 6, v: rp(0.5, 0.9), ph: RP() * TAU }));
const PETM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0xffb3d9, side: THREE.DoubleSide }), PET.length); PETM.frustumCulled = false; FX.add(PETM);
// day 26: shooting stars and a four-leaf-clover constellation
const streakTex = canvasTex(256, 16, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(200,225,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, h * 0.3, w, h * 0.4); }, true, false);
const STARS = Array.from({ length: 16 }, (_, i) => ({ t: BI.d26.t0 + 0.6 + i * 0.55 + rp(-0.2, 0.2), a: V3(rp(-160, 200), rp(170, 260), rp(-420, -260)), d: V3(rp(-1, -0.5), rp(-0.45, -0.25), rp(0.1, 0.3)).normalize(), L: rp(40, 75),
  m: (() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.6), new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 })); FX.add(m); return m; })() }));
const CONST = (() => { const pts = []; const c = V3(-20, 240, -380), S = 58; for (let k = 0; k < 4; k++) for (let i = 0; i <= 10; i++) { const u = i / 10 * TAU, hx = 16 * Math.sin(u) ** 3, hy = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u); const v = V3(hx / 17, (hy + 5) / 17 + 0.9, 0).applyAxisAngle(V3(0, 0, 1), k * Math.PI / 2); pts.push(c.clone().add(v.multiplyScalar(S))); }
  const sp = pts.map(p => { const g = glow(0xdfeaff, 9, 0); g.position.copy(p); FX.add(g); return g; }); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, fog: false })); FX.add(line); return { pts, sp, line }; })();
// day 30: golden light rising around you
const GOLDN = 700, GOLD = Array.from({ length: GOLDN }, () => ({ r: rp(0.5, 7), a: RP() * TAU, o: RP() * 5, v: rp(0.4, 1.1), w: rp(-0.6, 0.6) }));
const goldGeo = new THREE.BufferGeometry(); goldGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(GOLDN * 3), 3));
const goldPts = new THREE.Points(goldGeo, new THREE.PointsMaterial({ color: 0xffd25a, size: 0.12, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); goldPts.frustumCulled = false; FX.add(goldPts);
const aura = glow(0xffd070, 4, 0); FX.add(aura); const sparkle = glow(0xfff6d0, 1.2, 0); FX.add(sparkle);

// =====================================================================================
// HUD: luck counter + captions
// =====================================================================================
const capEls = CAPS.map(([t0, t1, html, cls]) => { const d = document.createElement('div'); d.className = 'cap' + (cls ? ' ' + cls : ''); d.innerHTML = html; $('caps').appendChild(d); return { el: d, t0, t1 }; });
let lastDay = -1;
function hud(t) {
  const d = dayAt(t); if (d !== lastDay) { lastDay = d; $('luck').querySelector('.day').textContent = `DAY ${d}`; $('luck').querySelector('.val').innerHTML = `LUCK <b>×${luckOf(d)}</b>`; $('luck').classList.toggle('gold', d >= 30); }
  let k = 0; for (const c of DISS) k = Math.max(k, Math.exp(-(((t - c) / 0.35) ** 2))); const pulse = 1 + 0.08 * k;
  $('luck').style.transform = `scale(${pulse.toFixed(3)})`; $('luck').style.transformOrigin = 'left top'; $('luck').style.opacity = clamp((t - 0.4) / 0.6);
  for (const c of capEls) { const a = smooth((t - c.t0) / 0.5) * (1 - smooth((t - c.t1) / 0.5)); c.el.style.opacity = a; c.el.style.transform = `translateX(-50%) translateY(${((1 - smooth((t - c.t0) / 0.6)) * 10).toFixed(1)}px)`; }
}

// =====================================================================================
// frame
// =====================================================================================
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _e = new THREE.Euler();
let curSky = null;
window.DURATION = DUR;
window.renderFrame = (t) => {
  const b = beatAt(t), u = t - b.t0;
  if (curSky !== b.sky) { curSky = b.sky; applySky(PRE[b.sky]); }
  SKYU.off.value = t * 0.006;
  const night = b.sky === 'night' ? 1 : 0;
  const c = camAt(t); const p = c.p.clone(), l = c.l.clone(); const shk = 0.005; p.x += shk * noise.noise(t * 0.7, 1); p.y += shk * noise.noise(t * 0.8, 2); l.x += shk * 2 * noise.noise(t * 0.5, 3); l.y += shk * 2 * noise.noise(t * 0.5, 4);
  camera.position.copy(p); camera.lookAt(l); camera.fov = c.fov; camera.updateProjectionMatrix(); SKY.position.copy(p);
  const you = YOU.frame(t);
  // sun + shadow around the subject (wide for the aerials)
  const aerial = t < 4.5 || (b.id === 'end' && u > 2) || (b.id === 'd18' && u > 6);
  const focus = aerial ? V3(4, 0, 4) : V3(you.x, 0, you.z).lerp(l, 0.3), ext = aerial ? 120 : 30;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 700 }); sun.shadow.camera.updateProjectionMatrix();
  sun.position.copy(focus).addScaledVector(SKYU.sunDir.value, 300); sun.target.position.copy(focus);
  for (const m of FMAT) m.emissiveIntensity = night * 0.6; LAMPHEAD.emissiveIntensity = night * 2.2; LAMPGLOW.forEach(g => g.material.opacity = night * 0.8);
  // --- day 4: signal + coin
  const d4 = b.id === 'd4'; SIGM.map = d4 && u < 3.1 ? SIG.red : SIG.green; sigGlow.material.color.set(d4 && u < 3.1 ? 0xff4a3d : 0x3dff7a); sigGlow.material.opacity = d4 && u < D2_CUT ? 0.55 : 0.25;
  const picked = t >= T_PICK; coin.visible = d4 && u > D2_CUT; if (coin.visible) { if (!picked) { coin.position.copy(COIN); coin.rotation.set(0, t, 0); } else { const h = handPos(YOU, you, 1); coin.position.copy(h.p).add(V3(0, 0.03, 0)); coin.rotation.set(Math.PI / 2, t * 2.5, 0); } }
  coinGlint.material.opacity = coin.visible ? 0.55 + 0.45 * Math.max(0, Math.sin(t * 5)) : 0; coinGlint.position.copy(coin.position).add(V3(0.02, 0.03, 0.02)); coinGlint.scale.setScalar(picked ? 0.35 : 0.55 + 0.25 * Math.sin(t * 5));
  // --- day 7: the note
  note.visible = b.id === 'd7' && u > 1.5; noteSparkle.material.opacity = 0;
  if (note.visible) { const tc = T_CATCH - b.t0; if (u < tc) { const k = clamp((u - 1.5) / (tc - 1.5)), hand = handPos(YOU, YOU.frame(T_CATCH), 1).p; const a0 = V3(8.2, 10.5, -21.8); const pos = a0.clone().lerp(hand, smooth(k) * 0.35 + k * 0.65);
      const r = 0.9 * (1 - k); pos.x += Math.cos(u * 2.4) * r; pos.z += Math.sin(u * 2.4) * r; note.position.copy(pos); note.rotation.set(0.6 * Math.sin(u * 3.1), u * 1.7, 0.5 * Math.cos(u * 2.6)); noteSparkle.material.opacity = 0.7; noteSparkle.position.copy(pos); }
    else { const h = handPos(YOU, you, 1); note.position.copy(h.p).add(V3(0, 0.05, -0.04)); note.rotation.set(-1.1, Math.PI, 0); } }
  // --- day 10: clovers + butterflies
  const d10 = b.id === 'd10'; CLV.forEach((q, i) => { let s = 0; if (d10 || b.id === 'd14' && false) { const tp = b.t0 + (33 - q.z) / 1.3 + 0.45; s = d10 ? q.s * clamp((t - tp) / 0.35) * (1 + 0.25 * Math.sin(clamp((t - tp) / 0.5) * Math.PI)) : 0; }
    _m.compose(_s.set(q.x, 0.155, q.z), _q.setFromEuler(_e.set(0, q.rot, 0)), V3(s, s, s)); CLVM.setMatrixAt(i, s > 0.001 ? _m : ZM); }); CLVM.instanceMatrix.needsUpdate = true;
  BFLY.forEach((g, i) => { g.visible = d10; if (!d10) return; const a = u * (0.9 + i * 0.13) + i * 1.3, r = 0.8 + 0.35 * Math.sin(u * 0.7 + i); g.position.set(you.x + Math.cos(a) * r, 1.2 + 0.45 * Math.sin(u * 1.3 + i * 2), you.z + Math.sin(a) * r - 0.3); g.rotation.set(0.2, -a, 0); const f = Math.sin(t * 22 + i) * 0.9; g.children[0].rotation.y = f; g.children[1].rotation.y = -f; });
  // --- day 14: ticket, jackpot sign, confetti
  const d14 = b.id === 'd14'; ticket.visible = d14; if (d14) { const h = handPos(YOU, you, 1); ticket.position.copy(h.p).add(V3(0.02, 0.05, 0)); ticket.quaternion.setFromRotationMatrix(h.m); ticket.rotateX(-Math.PI / 2 + 0.2); }
  const win = d14 && t > T_WIN; LOTTO.sign.material = win && (t * 3) % 1 < 0.7 ? JACKM : SIGNM0; jackGlow.material.opacity = win ? 0.45 + 0.3 * Math.sin(t * 9) : 0;
  CONF.forEach((q, i) => { const tt = t - T_WIN - q.t0; if (!d14 || tt < 0) { CONFM.setMatrixAt(i, ZM); return; } const y = q.y0 - q.v * tt; if (y < 0.16) { CONFM.setMatrixAt(i, ZM); return; }
    _m.compose(_s.set(q.x + q.sw * Math.sin(tt * 2 + q.ph), y, q.z + q.sw * Math.cos(tt * 1.7 + q.ph)), _q.setFromEuler(_e.set(tt * 4 + q.ph, tt * 3, tt * 2)), V3(1, 1, 1)); CONFM.setMatrixAt(i, _m); }); CONFM.instanceMatrix.needsUpdate = true;
  // --- day 18: rain, beam, rainbow
  const d18 = b.id === 'd18'; RAIN.forEach((q, i) => { if (!d18) { RAINM.setMatrixAt(i, ZM); return; } const x = you.x + q.x, z = you.z + q.z, y = 14 - ((t * 11 + q.o) % 14); const dy = Math.hypot(q.x, q.z);
    RAINM.setMatrixAt(i, dy < 2.5 || y < 0.15 ? ZM : _m.makeTranslation(x, y, z)); }); RAINM.instanceMatrix.needsUpdate = true;
  beam.visible = pool.visible = d18; if (d18) { beam.position.set(you.x, 15, you.z); pool.position.set(you.x, 0.16, you.z); beam.material.opacity = 0.14 + 0.03 * Math.sin(t * 1.3); }
  rainbow.material.opacity = d18 ? 0.7 * smooth((u - 2.0) / 3) : 0; rainbow.position.set(-2, -34, you.z - 115); rainbow.lookAt(camera.position.x, -34, camera.position.z);
  // --- day 22: blossoms + petals
  const d22 = b.id === 'd22'; BLOS.forEach((q, i) => { const k = d22 ? bloomAt(TREES[q.ti], t) : 0; const s = q.s * k * (1 + 0.15 * Math.sin(k * Math.PI)); BLOSM.setMatrixAt(i, k > 0.001 ? _m.compose(_s.set(q.x, q.y, q.z), _q.identity(), V3(s, s * 0.9, s)) : ZM); }); BLOSM.instanceMatrix.needsUpdate = true;
  PET.forEach((q, i) => { const tr = TREES[q.ti], k = d22 ? bloomAt(tr, t) : 0; if (k < 0.5) { PETM.setMatrixAt(i, ZM); return; } const tt = (t * q.v + q.o) % 6, y = 4.8 - tt * 0.8; if (y < 0.17) { PETM.setMatrixAt(i, ZM); return; }
    _m.compose(_s.set(tr.x + q.dx + tt * 0.5 + 0.2 * Math.sin(tt * 2 + q.ph), y, tr.z + q.dz + 0.25 * Math.cos(tt * 1.6 + q.ph)), _q.setFromEuler(_e.set(tt * 3 + q.ph, tt * 2, 0)), V3(1, 1, 1)); PETM.setMatrixAt(i, _m); }); PETM.instanceMatrix.needsUpdate = true;
  // --- day 26: shooting stars + constellation
  const d26 = b.id === 'd26'; for (const s of STARS) { const k = (t - s.t) / 1.3; s.m.visible = d26 && k > 0 && k < 1; if (!s.m.visible) continue; const head = s.a.clone().addScaledVector(s.d, s.L * 3 * k);
    s.m.position.copy(head).addScaledVector(s.d, -s.L * 0.5); s.m.scale.set(s.L, 1.6, 1); s.m.quaternion.copy(camera.quaternion); const sd = s.d.clone().project(camera).sub(V3().project(camera)); s.m.rotateZ(Math.atan2(-s.d.y, -s.d.x) * 0 + Math.atan2(sd.y, sd.x) + Math.PI);
    s.m.material.opacity = Math.sin(k * Math.PI); }
  CONST.sp.forEach((g, i) => { const k = d26 ? smooth((u - 2.8 - i * 0.09) / 0.5) : 0; g.material.opacity = k * (0.75 + 0.25 * Math.sin(t * 4 + i)); }); CONST.line.material.opacity = d26 ? 0.5 * smooth((u - 6.6) / 1.2) : 0;
  // --- day 30: gold
  const gk = b.id === 'd30' || b.id === 'end' ? smooth((t - BI.d30.t0 - 0.6) / 2.5) : 0; goldPts.visible = gk > 0; aura.material.opacity = 0.55 * gk; sparkle.material.opacity = gk * (0.5 + 0.5 * Math.sin(t * 6));
  if (gk > 0) { const pa = goldGeo.attributes.position; GOLD.forEach((q, i) => { const tt = (t * q.v + q.o) % 5, a = q.a + tt * q.w; pa.setXYZ(i, you.x + Math.cos(a) * q.r * (1 - tt * 0.08), tt * 2.2, you.z + Math.sin(a) * q.r * (1 - tt * 0.08)); }); pa.needsUpdate = true;
    goldPts.material.opacity = gk; const hp = headPos(YOU, you); aura.position.set(you.x, 1.2, you.z); aura.scale.setScalar(4.5 + 0.4 * Math.sin(t * 2)); sparkle.position.copy(hp).add(V3(0.2, 0.25, 0)); }
  updateCars(t, night, gk > 0 ? 34 : 0);
  CROWD.update(t);
  // overlays: dissolves to warm white, tints, fades
  let gl = 0; for (const cc of DISS) gl = Math.max(gl, 1 - smooth(Math.abs(t - cc) / 0.6));
  $('glow').style.opacity = gl * 0.95;
  $('fade').style.opacity = Math.max(1 - smooth(t / 0.8), smooth((t - DUR + 1.6) / 1.4));
  $('tint').style.background = b.sky === 'gold' ? '#ffb030' : b.sky === 'storm' ? '#4a6080' : '#ffffff'; $('tint').style.opacity = b.sky === 'gold' ? 0.35 * Math.max(gk, 0.3) : b.sky === 'storm' ? 0.25 : 0;
  hud(t);
  renderer.render(scene, camera);
};
window.TRACK = { duration: DUR, beats: BEATS.map(b => ({ id: b.id, t0: b.t0, t1: Math.min(b.t1, DUR), day: b.day })), diss: DISS, pick: T_PICK, catch: T_CATCH, win: T_WIN, green: BI.d4.t0 + 3.1,
  clovers: CLV.map(q => +(BI.d10.t0 + (33 - q.z) / 1.3 + 0.45).toFixed(3)), stars: STARS.map(s => +s.t.toFixed(3)), bloom: TREES.map(tr => +(BI.d22.t0 + 0.8 + Math.abs(tr.z - 31) / 5.5 + (tr.x > 0 ? 0.5 : 0)).toFixed(3)).filter(x => x < BI.d26.t0) };
window.READY = true;
