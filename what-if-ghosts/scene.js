// WHAT IF EVERYONE EXCEPT YOU BECAME GHOSTS AND ZOMBIES? — bright stylised 3D city, 16:9.
// Deterministic: window.renderFrame(t) draws the frame for time t (seconds). Shot timing follows build/timeline.json (narration).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
const mergeGeometries = gs => mergeRaw(gs.map(g => g.index ? g.toNonIndexed() : g));

const RW = 1280, RH = 720;
const TL = await (await fetch('build/timeline.json')).json();
const DUR = TL.duration;
const $ = id => document.getElementById(id);
await Promise.all([document.fonts.load('800 40px Poppins'), document.fonts.load('600 40px Poppins')]);
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
function ghostMat(op) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, transparent: true, opacity: op, depthWrite: false, emissive: 0x1d8fff, emissiveIntensity: 0.75 });
  m.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', GLOWSRC + '\n float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0); totalEmissiveRadiance += vec3(0.3, 0.82, 1.0) * fr * 2.8; diffuseColor.a *= 0.45 + 0.8 * fr;'); };
  m.customProgramCacheKey = () => 'ghost'; return m;
}

// ---------- timeline ----------
const B = {}; for (const b of TL.beats) B[b.id] = b;
const L = (id, i, end = 0) => B[id].lines[i][end ? 't1' : 't0'];
const T_CLK = L('freeze', 0) + 1.75;           // "...at exactly eight o'clock"
const T_FRZ = L('freeze', 1) - 0.05;           // "stops."
const T_PALE = L('stare', 1);                  // skin turns pale
const T_EYE = T_PALE + 2.4;                    // eyes go white
const T_GH = B.ghosts.start + 0.45;            // first ghosts rise
const T_ZB = B.zombies.start + 0.3;            // zombies twitch
const T_DARK = B.dark.start + 0.2;
const T_CHASE = L('chase', 1) + 0.15;          // "so they all start coming"
const T_RUN = L('chase', 1) + 0.6;
const T_SLAM = L('store', 0, 1) - 0.3;
const T_SCARE = L('ghost', 0, 1) + 1.25;
const T_TURN = L('zombies', 0, 1) - 1.25;
const SFXT = name => TL.beats.flatMap(b => b.sfx).filter(s => s.name === name).map(s => s.t);
const THUNDER = SFXT('thunder');

// =====================================================================================
// sky (gradient + procedural clouds + sun / red moon), day <-> horror
// =====================================================================================
const SKYU = { top: { value: C('#1f6fe0') }, hor: { value: C('#a6d6ff') }, bot: { value: C('#cfe6f7') }, sunDir: { value: new THREE.Vector3(0.5, 0.62, 0.6).normalize() }, sunCol: { value: C('#fff3d6') },
  cloudCol: { value: C('#ffffff') }, cloudShade: { value: C('#b9cde6') }, clouds: { value: 1 }, moon: { value: 0 }, moonDir: { value: new THREE.Vector3(0.32, 0.3, 0.9).normalize() }, moonCol: { value: C('#ff4636') }, off: { value: 0 } };
const SKYMAT = new THREE.ShaderMaterial({ uniforms: SKYU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 top, hor, bot, sunDir, sunCol, cloudCol, cloudShade, moonDir, moonCol; uniform float clouds, moon, off; varying vec3 vDir;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  void main(){ vec3 d = normalize(vDir); float h = d.y;
    vec3 c = mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.55)); c = mix(c, bot, clamp(-h * 5.0, 0.0, 1.0));
    float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 1400.0) * 9.0 + pow(s, 14.0) * 0.22);
    float m = dot(d, moonDir); c += moonCol * pow(max(m, 0.0), 60.0) * 0.5 * moon;
    if (h > 0.0) { vec2 p = d.xz / (h + 0.1) * 1.25 + vec2(off, 0.0); float n = fbm(p); float n2 = fbm(p * 2.0 + 3.1);
      float cm = smoothstep(0.5, 0.78, n) * clouds * smoothstep(0.0, 0.18, h);
      c = mix(c, mix(cloudShade, cloudCol, smoothstep(0.45, 0.85, n2 * 0.6 + n * 0.5)), cm * 0.92); }
    c = mix(c, moonCol * 1.6, smoothstep(0.9982, 0.9986, m) * moon);
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const SKY = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), SKYMAT); SKY.renderOrder = -10; SKY.frustumCulled = false; scene.add(SKY);
const DAY = { top: '#1f6fe0', hor: '#a6d6ff', bot: '#cfe6f7', cloudCol: '#ffffff', cloudShade: '#b9cde6', sunCol: '#fff3d6', fog: '#bcdcf5', fogD: 0.0028 };
const NIGHT = { top: '#07040f', hor: '#3a1532', bot: '#140c1a', cloudCol: '#3a1e3a', cloudShade: '#0f0a18', sunCol: '#000000', fog: '#22183a', fogD: 0.0125 };
function setSky(k) {
  for (const key of ['top', 'hor', 'bot', 'cloudCol', 'cloudShade', 'sunCol']) SKYU[key].value.copy(C(DAY[key])).lerp(C(NIGHT[key]), k);
  SKYU.moon.value = smooth((k - 0.4) / 0.6);
  scene.fog.color.copy(C(DAY.fog)).lerp(C(NIGHT.fog), k); scene.fog.density = lerp(DAY.fogD, NIGHT.fogD, k);
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envOf = k => { setSky(k); const s = new THREE.Scene(); const m = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), SKYMAT); s.add(m); const rt = pmrem.fromScene(s, 0, 0.1, 400); return rt.texture; };
const ENV_DAY = envOf(0), ENV_NIGHT = envOf(1); setSky(0);
scene.environment = ENV_DAY;

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
let signI = 0;
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
  const sg = mesh(new THREE.BoxGeometry(Math.min(along * 0.6, 7), 0.75, 0.14), sm, fx + face[0] * 0.08, 3.85, fz + face[1] * 0.08); sg.rotation.y = yaw; BLD.add(sg);
}
// main street, both sides
const STORE = { x0: 12, x1: 22, z0: -31, z1: -17, door: [-24.8, -23.2] };
for (const s of [-1, 1]) for (const dir of [1, -1]) {
  let z = dir * 11; const forced = s === 1 && dir === -1 ? [[6, 0], [14, 1]] : s === -1 && dir === 1 ? [[14, 2]] : [];
  while (Math.abs(z) < 300) {
    const f = forced.shift(), w = f ? f[0] : rb(9, 18), zc = z + dir * w / 2, near = Math.abs(z) < 120;
    if (f && f[1] === 1) building(s * 21, zc, 18, w, 22, [-s, 0], { hollow: true, sign: '24/7 MART', noAwn: true, mat: 2 });
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
const CLOCKW = 7, CLOCKH = 3.4;
const clockTex = txt => canvasTex(512, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#13213f'); g.addColorStop(1, '#0a1226'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#2bd3ff'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); x.fillStyle = '#ffe14a'; x.font = '800 150px Poppins'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 - 8);
  x.fillStyle = '#7fe3ff'; x.font = '600 34px Poppins'; x.fillText('MONDAY', w / 2, h - 38); }, true, false);
const CK = { a: clockTex('7:59'), b: clockTex('8:00') };
const CLOCKM = new THREE.MeshStandardMaterial({ map: CK.a, emissiveMap: CK.a, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 });
const CLOCK = new THREE.Mesh(new THREE.PlaneGeometry(CLOCKW, CLOCKH), CLOCKM); CLOCK.position.set(-11.75, 8.6, -16.5); CLOCK.rotation.y = Math.PI / 2; CITY.add(CLOCK);
CITY.add(box(0.3, CLOCKH + 0.4, CLOCKW + 0.4, 0x1c2230, -11.92, 8.6, -16.5));

// merge static meshes per material
function bake(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), dead = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.geometry.attributes.uv || o.material.transparent || o === STORE.doorG || isUnder(o, STORE.doorG)) return;
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

// =====================================================================================
// people: articulated instanced figures with faces (eyes, nose, mouth) and hair
// =====================================================================================
const PG = (() => {
  const cap = (r, l, y, rs = 10) => { const g = new THREE.CapsuleGeometry(r, l, 3, rs).deleteAttribute('uv'); g.translate(0, y, 0); return g; };
  const torso = cap(0.15, 0.3, 0.3, 14); { const p = torso.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1.18 + 0.16 * smooth((y - 0.28) / 0.25); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * 0.74); } torso.computeVertexNormals(); }
  const sk = new THREE.SphereGeometry(0.105, 24, 18).deleteAttribute('uv'); sk.scale(0.9, 1.07, 0.97); sk.translate(0, 0.14, 0);
  const neck = new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10).deleteAttribute('uv'); neck.translate(0, 0.02, 0);
  const nose = new THREE.SphereGeometry(0.018, 10, 8).deleteAttribute('uv'); nose.scale(0.8, 1.05, 1.1); nose.translate(0, 0.128, 0.099);
  const ears = [-1, 1].map(s => { const e = new THREE.SphereGeometry(0.024, 8, 6).deleteAttribute('uv'); e.scale(0.45, 1, 0.75); e.translate(s * 0.094, 0.138, -0.004); return e; });
  const head = mergeGeometries([sk, neck, nose, ...ears]);
  const hc = new THREE.SphereGeometry(0.112, 24, 14, 0, TAU, 0, Math.PI * 0.56).deleteAttribute('uv'); hc.rotateX(-0.5); hc.scale(0.93, 1.06, 1.0); hc.translate(0, 0.143, -0.006);
  const hairS = hc.clone();
  const back = new RoundedBoxGeometry(0.21, 0.3, 0.07, 2, 0.03).deleteAttribute('uv'); back.translate(0, 0.03, -0.072);
  const hairL = mergeGeometries([hc.clone(), back]);
  const eyeW = new THREE.SphereGeometry(0.019, 12, 8).deleteAttribute('uv'); eyeW.scale(1, 0.85, 0.6);
  const iris = new THREE.SphereGeometry(0.0115, 10, 8).deleteAttribute('uv'); iris.scale(1, 1, 0.5);
  const mouth = new THREE.SphereGeometry(0.021, 14, 8).deleteAttribute('uv'); mouth.scale(1, 0.3, 0.45);
  const thigh = cap(0.072, 0.31, -0.215), shin = mergeGeometries([cap(0.058, 0.32, -0.215), new RoundedBoxGeometry(0.1, 0.07, 0.24, 2, 0.03).deleteAttribute('uv').translate(0, -0.44, 0.045)]);
  const uarm = cap(0.052, 0.2, -0.145), farm = cap(0.044, 0.19, -0.135), hand = new THREE.SphereGeometry(0.046, 10, 8).deleteAttribute('uv'); hand.scale(0.8, 1.2, 0.6); hand.translate(0, -0.3, 0);
  const phone = new THREE.BoxGeometry(0.075, 0.15, 0.012).deleteAttribute('uv');
  return { torso, head, hairS, hairL, eyeW, iris, mouth, thigh, shin, uarm, farm, hand, phone };
})();
const _m4 = () => new THREE.Matrix4(), mT = (x, y, z) => _m4().makeTranslation(x, y, z), mRX = a => _m4().makeRotationX(a), mRY = a => _m4().makeRotationY(a), mRZ = a => _m4().makeRotationZ(a), mS = (x, y, z) => _m4().makeScale(x, y, z);
const ZERO = _m4().makeScale(0, 0, 0);
const JK = ['hipY', 'lean', 'twist', 'headP', 'headY', 'headR', 'lh', 'rh', 'lk', 'rk', 'ls', 'rs', 'la', 'ra', 'le', 're', 'mo'];
const baseJ = () => ({ hipY: 0.86, lean: 0.02, twist: 0, headP: 0, headY: 0, headR: 0, lh: 0, rh: 0, lk: 0.05, rk: 0.05, ls: 0, rs: 0, la: 0.07, ra: 0.07, le: 0.15, re: 0.15, mo: 0 });
const blendJ = (a, b, w) => { const o = {}; for (const k of JK) o[k] = lerp(a[k], b[k], w); return o; };
const freqOf = sp => sp < 0.05 ? 0 : 0.5 + 0.21 * sp;
function gaitJ(sp, ph, t, seed = 0) {
  const J = baseJ(), a = clamp((sp - 1.9) / 2.4), g = clamp(sp / 0.7), amp = lerp(0.34, 0.85, a) * g, s1 = Math.sin(ph);
  J.lh = s1 * amp + 0.22 * a; J.rh = -s1 * amp + 0.22 * a;
  J.lk = 0.06 + lerp(0.1, 0.3, a) * g + Math.max(0, Math.sin(ph + 1.9)) * lerp(0.55, 1.5, a) * g;
  J.rk = 0.06 + lerp(0.1, 0.3, a) * g + Math.max(0, Math.sin(ph + Math.PI + 1.9)) * lerp(0.55, 1.5, a) * g;
  J.ls = -s1 * amp * lerp(0.7, 1.05, a); J.rs = s1 * amp * lerp(0.7, 1.05, a); J.le = J.re = lerp(0.2, 1.5, a * g); J.lean = lerp(0.03, 0.3, a);
  J.hipY = 0.86 - 0.05 * amp - 0.05 * a + Math.abs(Math.cos(ph)) * lerp(0.02, 0.06, a) * g;
  const idle = 1 - g; J.twist += idle * 0.05 * Math.sin(t * 0.7 + seed); J.headY += idle * 0.25 * Math.sin(t * 0.43 + seed * 3); J.headP += idle * 0.05 * Math.sin(t * 0.31 + seed);
  return J;
}
const jerk = (t, s) => { const n = noise.noise(t * 5.5, s * 7.1); return Math.sign(n) * Math.pow(Math.abs(n), 0.35); };
const POSE = {
  idle: (t, s) => gaitJ(0, 0, t, s),
  phone(t, s) { const J = baseJ(); Object.assign(J, { rs: 0.55, re: 1.95, ra: 0.06, ls: 0.06, le: 0.25, headP: 0.42 + 0.03 * Math.sin(t * 0.7 + s), headY: 0.05 * Math.sin(t * 0.5 + s), twist: 0.03 * Math.sin(t * 0.4 + s) }); return J; },
  chat(t, s) { const J = baseJ(), g = Math.sin(t * 2.3 + s), g2 = Math.sin(t * 1.4 + s * 2); Object.assign(J, { rs: 0.6 + 0.25 * g, re: 1.3 + 0.35 * g2, ra: 0.22, ls: 0.25 + 0.12 * g2, le: 0.8, headY: 0.18 * Math.sin(t * 0.9 + s), headP: -0.04 + 0.05 * Math.sin(t * 1.9 + s), twist: 0.05 * g, mo: 0.4 + 0.4 * Math.sin(t * 11 + s) * (g > 0 ? 1 : 0.2) }); return J; },
  laugh(t, s) { const J = POSE.chat(t, s); J.headP = -0.18 + 0.05 * Math.sin(t * 9 + s); J.lean = -0.05; J.mo = 0.8; return J; },
  sit(t, s) { const J = baseJ(); Object.assign(J, { hipY: 0.5, lh: 1.5, rh: 1.5, lk: 1.5, rk: 1.5, lean: 0.06, ls: 0.55, rs: 0.6 + 0.1 * Math.sin(t * 0.8 + s), le: 1.2, re: 1.5, headY: 0.25 * Math.sin(t * 0.5 + s), headP: 0.05 }); return J; },
  ghost(t, s) { const J = baseJ(); Object.assign(J, { lh: 0.14 + 0.06 * Math.sin(t * 1.1 + s), rh: 0.04, lk: 0.42, rk: 0.3, ls: 0.6 + 0.16 * Math.sin(t * 1.2 + s), rs: 0.55 + 0.16 * Math.sin(t * 1.2 + s + 1), le: 0.45, re: 0.5, la: 0.32, ra: 0.32, headP: 0.12, lean: 0.06, mo: 0.35 }); return J; },
  zombie(t, s) { const J = baseJ(); Object.assign(J, { lean: 0.22 + 0.04 * Math.sin(t * 1.1 + s), headP: 0.28, headR: 0.35 * Math.sign(Math.sin(s * 13) + 0.01), ls: 1.25 + 0.12 * Math.sin(t * 1.3 + s), rs: 1.42 + 0.1 * Math.sin(t * 1.1 + s + 2), le: 0.25, re: 0.18, la: 0.14, ra: 0.1, lk: 0.18, rk: 0.3, twist: 0.12 * Math.sin(t * 0.8 + s), mo: 0.55 + 0.25 * Math.sin(t * 2.3 + s) }); J.headR += 0.35 * jerk(t, s); J.headY += 0.22 * jerk(t + 9, s); return J; },
  bang(t, s) { const J = POSE.zombie(t, s); const b = Math.sin(t * 8.5 + s), b2 = Math.sin(t * 8.5 + s + 2.2); Object.assign(J, { ls: 1.95 + 0.25 * b, rs: 1.95 + 0.25 * b2, le: 0.55 + 0.35 * Math.max(0, b), re: 0.55 + 0.35 * Math.max(0, b2), lean: 0.3, headP: 0.1, mo: 0.9 }); return J; },
};
function zombieGait(sp, ph, t, s) { const J = gaitJ(sp, ph, t, s), a = clamp((sp - 1.9) / 2.4); J.ls = 1.3 + 0.18 * Math.sin(ph); J.rs = 1.45 - 0.18 * Math.sin(ph); J.le = J.re = 0.2; J.la = J.ra = 0.12; J.lean += 0.15; J.headP = 0.18; J.headR = 0.25 * Math.sign(Math.sin(s * 13) + 0.01) + 0.2 * jerk(t, s); J.rk *= 0.7; J.mo = 0.8; return J; }

const SKINS = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f5d2b8'].map(C);
const HAIRS = ['#2b1d14', '#3b2a1e', '#0f0d0c', '#6b4325', '#c99a4e', '#a33a1f', '#1a1a1a'].map(C);
const SHIRTS = ['#ffca28', '#29b6f6', '#66bb6a', '#ab47bc', '#ff7043', '#ec407a', '#26a69a', '#ffffff', '#5c6bc0', '#ffa726', '#8d6e63', '#212121', '#7e57c2'].map(C);
const PANTS = ['#283593', '#37474f', '#212121', '#4e342e', '#1565c0', '#795548', '#f5f5f5', '#455a64'].map(C);
const IRIS = ['#3b2414', '#2a1a10', '#2f5d8a', '#3f6b3a', '#1a1a1a'].map(C);
const PALE = C('#dfe2dc'), ZSKIN = C('#8fae63'), ZSKIN2 = C('#7fa58b'), DIRT = C('#3d3226'), EYEW = new THREE.Color(4.2, 4.2, 3.9), GHOSTC = C('#7fd8ff'), GLOWC = new THREE.Color(1.9, 2.5, 2.9), MOUTH = C('#7a2e2e'), SCL = C('#f4f2ee');
const RP = RNG(2024), rp = (a, b) => a + RP() * (b - a), pick = a => a[(RP() * a.length) | 0];
function looks(o = {}) {
  const fem = RP() < 0.5;
  return { skin: pick(SKINS).clone(), hair: pick(HAIRS).clone(), long: fem && RP() < 0.75, shirt: pick(SHIRTS).clone(), trs: pick(PANTS).clone(), iris: pick(IRIS).clone(), sc: fem ? rp(0.92, 0.98) : rp(0.98, 1.06), seed: RP() * 10, ...o };
}
const PEOPLE = [];

// ---------- YOU ----------
const YV = 1.35, YX = 9.6, YZ0 = 2.0 + YV * T_FRZ;
const RUNP = [[YX, 2.0 - 0.53], [YX, -20.5], [10.6, -23.3], [12.4, -24.0], [13.7, -24.0]];
const RUNL = []; { let s = 0; RUNL.push(0); for (let i = 1; i < RUNP.length; i++) { s += Math.hypot(RUNP[i][0] - RUNP[i - 1][0], RUNP[i][1] - RUNP[i - 1][1]); RUNL.push(s); } }
const RUN = (() => { const S = [], V = []; let s = 0, v = 0; const tot = RUNL[RUNL.length - 1];
  for (let i = 0; i < 30 * 8; i++) { const rem = tot - s; const vt = rem < 2.2 ? Math.max(1.0, 6.4 * rem / 2.2) : 6.4; v += clamp(vt - v, -9 / 30, 8 / 30); s = Math.min(tot, s + v / 30); S.push(s); V.push(rem <= 0.01 ? 0 : v); } return { S, V, tot }; })();
const T_ARR = T_RUN + RUN.S.findIndex(s => s >= RUN.tot - 0.01) / 30;
const T_DOOR = T_RUN + RUN.S.findIndex(s => s >= RUNL[3] - 0.9) / 30;
const runAt = s => { let i = 1; while (i < RUNL.length - 1 && s > RUNL[i]) i++; const u = clamp((s - RUNL[i - 1]) / (RUNL[i] - RUNL[i - 1])); const a = RUNP[i - 1], b = RUNP[i]; return { x: lerp(a[0], b[0], u), z: lerp(a[1], b[1], u), yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) }; };
const youYaw = ease([[T_FRZ + 0.8, Math.PI], [B.stare.start + 0.9, Math.PI + 0.35], [B.stare.start + 2.6, Math.PI - 0.45], [T_PALE + 0.5, Math.PI - 0.2], [T_GH + 1.0, Math.PI - 0.2], [T_GH + 4.0, Math.PI + 0.6],
  [B.zombies.start + 0.6, Math.PI + 0.7], [B.zombies.start + 2.2, TAU + 0.05], [B.dark.start + 2, TAU + 0.05], [B.dark.start + 4.5, TAU - 0.5], [B.chase.start + 0.5, TAU - 0.3], [B.chase.start + 1.6, TAU + 0.6], [B.chase.start + 2.8, TAU - 0.2]]);
const youHeadY = ease([[T_FRZ + 0.6, 0], [T_FRZ + 1.2, 0.6], [T_FRZ + 1.9, -0.55], [B.stare.start + 1.4, 0.7], [B.stare.start + 2.6, -0.4], [T_PALE + 0.8, 0.1], [T_GH + 3, 0.25], [T_GH + 6, -0.3], [B.zombies.start, 0], [B.dark.start + 1, 0.4], [B.dark.start + 3, -0.5], [B.dark.start + 5, 0]]);
const youHeadP = ease([[T_GH - 0.2, 0], [T_GH + 1.2, -0.55], [B.zombies.start - 0.4, -0.4], [B.zombies.start + 0.8, 0.05], [T_DARK + 0.5, 0.05], [T_DARK + 2.0, -0.45], [T_DARK + 5, -0.15], [B.chase.start + 0.5, 0.05]]);
const youScare = ease([[B.zombies.start + 1.0, 0], [B.zombies.start + 2.5, 1]]);
const YOU = { ...looks({ skin: C('#e3b08a'), hair: C('#3a2414'), long: false, shirt: C('#ff2e2e'), trs: C('#1e4fa8'), iris: C('#3b2414'), sc: 1.0, seed: 4 }), you: true };
YOU.base = t => {
  if (t < T_FRZ) { const z = YZ0 - YV * t; return { x: YX, z, yaw: Math.PI, J: gaitJ(YV, 1.3 + TAU * freqOf(YV) * t, t, 4) }; }
  if (t < T_RUN) { const d = t - T_FRZ, dd = Math.min(d, 0.8), z = 2.0 - YV * (dd - dd * dd / 1.6), sp = YV * Math.max(0, 1 - d / 0.8);
    const J = blendJ(gaitJ(sp, 1.3 + TAU * freqOf(YV) * (T_FRZ + dd * 0.7), t, 4), POSE.idle(t, 4), smooth(d / 0.8));
    J.headY += youHeadY(t); J.headP += youHeadP(t);
    const sc = youScare(t); J.ls = lerp(J.ls, 0.55 + 0.05 * Math.sin(t * 3), sc); J.rs = lerp(J.rs, 0.5, sc); J.le = lerp(J.le, 1.5, sc); J.re = lerp(J.re, 1.6, sc); J.lean = lerp(J.lean, -0.06, sc);
    if (t > T_CHASE - 0.6) { const k = smooth((t - T_CHASE + 0.6) / 0.6); J.lean = lerp(J.lean, -0.15, k); }
    return { x: YX, z, yaw: youYaw(t), J };
  }
  const i = clamp((t - T_RUN) * 30, 0, RUN.S.length - 1.001), i0 = Math.floor(i), s = lerp(RUN.S[i0], RUN.S[i0 + 1], i - i0), v = RUN.V[i0];
  if (t < T_ARR) { const p = runAt(s); let ph = 0; for (let k = 0; k < i0; k++) ph += TAU * freqOf(RUN.V[k]) / 30; const y0 = youYaw(T_RUN); return { x: p.x, z: p.z, yaw: y0 + wrapA(p.yaw - y0) * smooth((t - T_RUN) / 0.35), J: gaitJ(v, ph, t, 4) }; }
  // inside the store: turn to the door, push it shut, back away, then (later) turn round to the ghost
  const end = RUNP[RUNP.length - 1], yawIn = ease([[T_ARR, Math.PI / 2], [T_ARR + 0.45, -Math.PI / 2]])(t);
  const back = smooth((t - T_SLAM - 0.2) / 2.2), x = end[0] + back * 3.3;
  const J = gaitJ(back > 0 && back < 1 ? 0.9 : 0, -(t - T_SLAM) * TAU * 0.95, t, 4);
  const push = smooth((t - T_SLAM + 0.45) / 0.25) * (1 - smooth((t - T_SLAM - 0.15) / 0.4));
  J.ls = lerp(J.ls, 1.5, push); J.rs = lerp(J.rs, 1.5, push); J.le = lerp(J.le, 0.3, push); J.re = lerp(J.re, 0.3, push); J.lean = lerp(J.lean, 0.25, push);
  const breath = Math.sin(t * 7) * 0.03 * smooth((t - T_SLAM) / 1); J.lean += breath; J.ls += 0.5 * smooth((t - T_SLAM - 0.4) / 0.8); J.le += 1.1 * smooth((t - T_SLAM - 0.4) / 0.8); J.rs += 0.45 * smooth((t - T_SLAM - 0.4) / 0.8); J.re += 1.2 * smooth((t - T_SLAM - 0.4) / 0.8);
  let yaw = yawIn; const turn = smooth((t - (T_SCARE - 1.0)) / 0.9); yaw += turn * 2.62; J.headY = -0.5 * smooth((t - (T_SCARE - 1.4)) / 0.4) * (1 - turn);
  return { x, z: end[1], yaw, J };
};
PEOPLE.push(YOU);

// ---------- everybody else ----------
const WRAPZ = 600;
function walkerPos(q, t) { const tb = Math.min(t, T_FRZ); return { x: q.x0 + q.dir[0] * q.v * tb, z: q.z0 + q.dir[1] * q.v * tb }; }
const youPos = t => { const b = YOU.base(t); return { x: b.x, z: b.z }; };
function clashes(q) {
  for (let t = 0; t <= T_FRZ + 0.01; t += 0.4) { const a = q.walk ? walkerPos(q, t) : { x: q.x, z: q.z };
    const y = youPos(t); if (Math.hypot(a.x - y.x, a.z - y.z) < 0.75) return true;
    for (const o of PEOPLE) { if (o.you) continue; const b = o.walk ? walkerPos(o, t) : { x: o.x, z: o.z }; if (Math.hypot(a.x - b.x, a.z - b.z) < 0.62) return true; }
    for (const [tx, tz] of TABLES) if (!q.sitting && Math.abs(a.x - tx) < 1.0 && Math.abs(a.z - tz) < 1.6) return true; }
  return false;
}
let CAMS = null;   // filled after the shots are defined
function addWalker(o) { const q = { ...looks(), walk: true, ...o }; q.ph0 = RP() * TAU; for (let k = 0; k < 6; k++) { if (!clashes(q)) { PEOPLE.push(q); return q; } q.z0 += rp(-3, 3); q.x0 += rp(-0.2, 0.2); } return null; }
function addStand(o) { const q = { ...looks(), walk: false, ...o }; if (clashes(q)) return null; PEOPLE.push(q); return q; }
const laneX = (s, dz) => s * (dz < 0 ? rp(10.15, 10.9) : rp(8.15, 8.9));      // -z walkers keep to the shop side, +z to the curb side
const placeWalker = (s, zAtFreeze, dz, v, extra = {}) => addWalker({ x0: laneX(s, dz), z0: zAtFreeze - dz * v * T_FRZ, dir: [0, dz], v, ...extra });

// special people first (they get their spot)
const FACEW = addWalker({ ...looks({ skin: C('#f0c4a2'), hair: C('#6b3a1e'), long: true, shirt: C('#ffca28'), trs: C('#283593'), iris: C('#2f5d8a'), sc: 0.95 }), x0: 10.45, z0: 0.35 + 1.22 * T_FRZ, dir: [0, -1], v: 1.22, fate: 'zombie', face: true });
const GH6 = [], ZB7 = [];
for (const [x, zf, dz, v] of [[8.4, -3.2, 1, 1.15], [10.6, -5.4, -1, 1.3], [8.7, -7.6, 1, 1.25], [10.3, -9.4, -1, 1.2], [8.3, -12.5, 1, 1.3]]) GH6.push(addWalker({ x0: x, z0: zf - dz * v * T_FRZ, dir: [0, dz], v, fate: 'ghost' }));
for (const [x, zf, dz, v] of [[8.6, 9.6, 1, 1.2], [10.5, 11.2, -1, 1.25], [8.4, 13.4, 1, 1.15], [10.7, 7.9, -1, 1.3]]) ZB7.push(addWalker({ x0: x, z0: zf - dz * v * T_FRZ, dir: [0, dz], v, fate: 'zombie' }));
// crowd on the right-hand crossing with you
for (let i = 0; i < 7; i++) { const dz = RP() < 0.5 ? -1 : 1; placeWalker(1, rp(-6, 6), dz, rp(1.1, 1.45)); }
for (let i = 0; i < 9; i++) { const dz = RP() < 0.5 ? -1 : 1; placeWalker(-1, rp(-6, 6), dz, rp(1.1, 1.45)); }
// sidewalks
for (const s of [-1, 1]) for (let i = 0; i < 46; i++) { const dz = RP() < 0.5 ? -1 : 1; placeWalker(s, rp(-80, 95), dz, rp(1.05, 1.5)); }
for (const s of [-1, 1]) for (let i = 0; i < 16; i++) { const dz = RP() < 0.5 ? -1 : 1; placeWalker(s, (RP() < 0.5 ? -1 : 1) * rp(95, 190), dz, rp(1.05, 1.45)); }
// cross street sidewalks
for (const sz of [-1, 1]) for (let i = 0; i < 16; i++) { const dx = RP() < 0.5 ? -1 : 1, v = rp(1.05, 1.4), xf = (RP() < 0.5 ? -1 : 1) * rp(16, 70), x0 = xf - dx * v * T_FRZ;
  if (Math.sign(x0) !== Math.sign(xf) || Math.abs(x0) < 14) continue; addWalker({ x0, z0: sz * rp(7.8, 10.4), dir: [dx, 0], v }); }
// people standing about: phones, chats, coffee
const standers = [[11.45, 26, -Math.PI / 2, 'phone'], [11.5, 31.5, -Math.PI / 2 - 0.4, 'chat'], [11.3, 32.6, -Math.PI / 2 - 2.6, 'laugh'], [11.4, 18.2, -Math.PI / 2 + 0.3, 'phone'], [11.5, 40, -1.2, 'phone'],
  [-11.45, 30, Math.PI / 2, 'phone'], [-11.5, 4.2, Math.PI / 2 - 0.3, 'chat'], [-11.2, 5.3, Math.PI / 2 + 2.5, 'chat'], [-11.4, -14, 1.2, 'phone'], [11.45, -12.6, -1.7, 'phone'], [11.5, -40, -1.4, 'chat'], [11.3, -38.9, -2.6, 'laugh'],
  [-11.4, -34, 1.6, 'phone'], [-11.5, 48, 1.3, 'chat'], [-11.3, 49.1, 2.9, 'chat'], [11.4, 55, -1.6, 'phone'], [9.2, 9.0, Math.PI - 0.2, 'phone'], [-8.8, 7.6, 0.2, 'phone'], [-9.5, 8.3, 2.8, 'chat']];
for (const [x, z, yaw, pose] of standers) addStand({ x, z, yaw, pose, phone: pose === 'phone' });
for (const [x, z] of TABLES) for (const dz of [-1, 1]) addStand({ x, z: z + dz * 0.75, yaw: dz < 0 ? 0 : Math.PI, pose: 'sit', sitting: true });
// fates: ghosts and zombies (the special groups were set above)
for (const q of PEOPLE) { if (q.you) continue;
  if (!q.fate) q.fate = q.sitting || RP() < 0.42 ? 'ghost' : 'zombie';
  q.tg = T_GH + (GH6.includes(q) ? 0.25 + GH6.indexOf(q) * 0.38 : rp(0.6, 4.6)); q.gh = rp(1.0, 3.6); q.drR = rp(0.6, 3.0); q.drW = rp(0.12, 0.3) * (RP() < 0.5 ? -1 : 1); q.drP = RP() * TAU;
  q.tz = T_ZB + (ZB7.includes(q) ? ZB7.indexOf(q) * 0.25 : rp(0.1, 1.6)); q.td = rp(0, 0.45); q.cd = rp(0, 0.9); q.vmax = RP() < 0.25 ? rp(1.6, 2.4) : rp(3.8, 5.9); q.zsk = RP() < 0.5 ? ZSKIN : ZSKIN2;
  { const p0 = q.walk ? walkerPos(q, T_FRZ) : { x: q.x, z: q.z }; q.toStore = q.fate === 'ghost' && Math.hypot(p0.x - 8, p0.z + 10) < 48 && RP() < 0.75; } }

// ---------- the store ghost (last scene) ----------
const SGHOST = { ...looks({ skin: GHOSTC.clone(), hair: C('#0b0b10'), long: true, shirt: C('#e8f6ff'), trs: C('#cfe9f5'), iris: C('#ffffff'), sc: 0.97 }), storeGhost: true };

// =====================================================================================
// zombie chase simulation (30 Hz from T_CHASE): seek you, then the store window; separation, cars
// =====================================================================================
const CARS = [];
const SIMN = Math.ceil((DUR - T_CHASE) * 30) + 2;
function simZombies() {
  const Z = PEOPLE.filter(q => q.fate === 'zombie');
  const yc = youPos(T_CHASE), st = Z.map(q => { const f = baseFrame(q, T_CHASE); return { q, x: f.x, z: f.z, yaw: Math.atan2(yc.x - f.x, yc.z - f.z), sp: 0, ph: RP() * TAU }; });
  const carC = CARS.flatMap(c => { const p = carPos(c, T_CHASE + 5); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); return [[p.x + fx * 1.2, p.z + fz * 1.2], [p.x - fx * 1.2, p.z - fz * 1.2]]; });
  const slots = []; for (let row = 0; row < 7; row++) for (let z = -30.6 + (row % 2) * 0.4; z < -17.4; z += 0.78) slots.push([11.5 - row * 0.72, z]);
  let assigned = null;
  for (const s of st) { s.X = new Float32Array(SIMN); s.Z = new Float32Array(SIMN); s.Y = new Float32Array(SIMN); s.S = new Float32Array(SIMN); s.P = new Float32Array(SIMN); s.Bg = new Uint8Array(SIMN); s.q.sim = s; }
  for (let i = 0; i < SIMN; i++) { const t = T_CHASE + i / 30, y = youPos(Math.min(t, T_ARR - 0.3));
    if (t >= T_ARR - 0.6 && !assigned) { assigned = true; const free = slots.slice(); const order = st.slice().sort((a, b) => Math.hypot(a.x - 11.5, a.z + 24) - Math.hypot(b.x - 11.5, b.z + 24));
      for (const s of order) { let bi = 0, bd = 1e9; for (let k = 0; k < free.length; k++) { const d = Math.hypot(free[k][0] - s.x, free[k][1] - s.z) * 0.35 + (11.5 - free[k][0]) * 2.2; if (d < bd) { bd = d; bi = k; } } s.slot = free.splice(bi, 1)[0] || [s.x, s.z]; } }
    for (const s of st) {
      const go = smooth((t - T_CHASE - s.q.cd) / 1.6);
      let tx = y.x, tz = y.z, stop = 0.9; if (assigned) { tx = s.slot[0]; tz = s.slot[1]; stop = 0.05; }
      let dx = tx - s.x, dz = tz - s.z; const dist = Math.hypot(dx, dz) || 1; dx /= dist; dz /= dist;
      let vt = s.q.vmax * go * clamp((dist - stop) / 1.2);
      let ax = dx * vt, az = dz * vt;
      for (const o of st) { if (o === s) continue; const ex = s.x - o.x, ez = s.z - o.z, d = Math.hypot(ex, ez); if (d < 0.62 && d > 1e-4) { ax += ex / d * (0.62 - d) * 9; az += ez / d * (0.62 - d) * 9; } }
      for (const [cx, cz] of carC) { const ex = s.x - cx, ez = s.z - cz, d = Math.hypot(ex, ez); if (d < 1.55 && d > 1e-4) { ax += ex / d * (1.55 - d) * 12; az += ez / d * (1.55 - d) * 12; } }
      const sp = Math.min(Math.hypot(ax, az), s.q.vmax * 1.1);
      if (sp > 0.02) { const a = Math.atan2(ax, az); s.x += Math.sin(a) * sp / 30; s.z += Math.cos(a) * sp / 30; s.yaw = s.yaw + wrapA(a - s.yaw) * clamp(sp * 0.12); }
      if (Math.abs(s.x) > 11.55 && Math.abs(s.z) > 10.6) s.x = Math.sign(s.x) * 11.55;
      if (Math.abs(s.z) > 10.6 && Math.abs(s.x) > 11.55) s.z = Math.sign(s.z) * 10.6;
      s.sp = lerp(s.sp, sp, 0.25); s.ph += TAU * freqOf(s.sp) / 30;
      if (assigned && Math.hypot(s.x - tx, s.z - tz) < 0.5 && s.slot[0] > 11) { s.Bg[i] = 1; s.yaw = s.yaw + wrapA(Math.PI / 2 - s.yaw) * 0.2; }
      s.X[i] = s.x; s.Z[i] = s.z; s.Y[i] = s.yaw; s.S[i] = s.sp; s.P[i] = s.ph;
    }
  }
}
const sampleSim = (s, t) => { const f = clamp((t - T_CHASE) * 30, 0, SIMN - 1.001), i = Math.floor(f), u = f - i; return { x: lerp(s.X[i], s.X[i + 1], u), z: lerp(s.Z[i], s.Z[i + 1], u), yaw: s.Y[i] + wrapA(s.Y[i + 1] - s.Y[i]) * u, sp: lerp(s.S[i], s.S[i + 1], u), ph: lerp(s.P[i], s.P[i + 1], u), bang: s.Bg[i] }; };

// =====================================================================================
// per-person state: base motion -> freeze -> pale -> ghost / zombie
// =====================================================================================
function baseFrame(q, t) {
  if (q.you) return YOU.base(t);
  const tb = Math.min(t, T_FRZ);
  if (q.walk) { const p = walkerPos(q, t); return { x: p.x, z: p.z, yaw: Math.atan2(q.dir[0], q.dir[1]), J: gaitJ(q.v, q.ph0 + TAU * freqOf(q.v) * tb, tb, q.seed) }; }
  return { x: q.x, z: q.z, yaw: q.yaw, J: POSE[q.pose](tb, q.seed) };
}
const youAt = t => YOU.base(t);
function sghostFrame(q, t) {
  const t0 = B.ghost.start + 0.2; if (t < t0 || t > T_SCARE + 0.4) return null;
  const u = t - t0, lunge = smooth((t - T_SCARE + 0.05) / 0.24);
  let x = lerp(23.2, 18.3, smooth(u / 2.6)), z = -23.25, y = 0.18 + 0.05 * Math.sin(t * 2.2);
  const J = POSE.ghost(t, 3); J.headP = 0.2; J.mo = 0.25 + 0.75 * smooth((t - T_SCARE + 0.6) / 0.5);
  const reach = smooth((t - T_SCARE + 0.9) / 0.7); J.ls = lerp(J.ls, 1.5, reach); J.rs = lerp(J.rs, 1.55, reach); J.le = J.re = lerp(0.45, 0.1, reach); J.headP = lerp(J.headP, -0.05, reach);
  let yaw = -Math.PI / 2;
  if (lunge > 0) { const c = CAMNOW.p, d = CAMNOW.d, u = lunge, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), e = u * u;
    const P2 = [c.x + d.x * 0.5, c.y - 1.5 + d.y * 0.5, c.z + d.z * 0.5], P1 = [17.0, 1.0, -23.7];
    x = a * x + b * P1[0] + e * P2[0]; y = a * y + b * P1[1] + e * P2[1]; z = a * z + b * P1[2] + e * P2[2]; yaw = Math.atan2(c.x - x, c.z - z); J.lean = 0.35 * u; J.mo = 1; }
  return { x, y, z, yaw, J, ghost: true };
}
function personFrame(q, t) {
  if (q._t === t) return q._f; q._t = t;
  if (q.hide) return (q._f = null);
  const col = { skin: q.skin.clone(), shirt: q.shirt.clone(), trs: q.trs.clone(), hair: q.hair.clone(), scl: SCL.clone(), iris: q.iris.clone(), mouth: MOUTH.clone() };
  if (q.storeGhost) { const f = sghostFrame(q, t); if (!f) return (q._f = null);
    col.skin.copy(GHOSTC); col.shirt.set('#e6f7ff'); col.scl.set(0x020304); col.iris.copy(EYEW).multiplyScalar(1.4); col.mouth.set(0x020304); return (q._f = { ...f, col, sc: q.sc, ghost: 2 }); }
  const bf = baseFrame(q, t); let { x, z, yaw, J } = bf, y = 0, ghost = false, phone = !!q.phone, glowK = 0;
  if (q.you) return (q._f = { x, y: groundY(x, z), z, yaw, J, col, ghost, phone: false, sc: q.sc });
  if (t > T_PALE) { const k = smooth((t - T_PALE) / 2.6); col.skin.lerp(PALE, k * 0.85); col.mouth.lerp(C('#5a4a4c'), k); }
  if (t > T_EYE) { const k = smooth((t - T_EYE) / 0.7); col.iris.lerp(EYEW, k); col.scl.lerp(EYEW, k); }
  if (q.fate === 'ghost' && t > q.tg - 0.8) {
    if (t < q.tg) { const k = smooth((t - q.tg + 0.8) / 0.8); for (const c of [col.skin, col.shirt, col.trs, col.hair]) c.lerp(GLOWC, k * 0.85); glowK = k; }
    else { ghost = true; const u = t - q.tg; phone = false;
      col.skin.copy(GHOSTC); col.shirt.lerp(GHOSTC, 0.7); col.trs.lerp(GHOSTC, 0.75); col.hair.lerp(GHOSTC, 0.45); col.scl.copy(EYEW); col.iris.copy(EYEW); col.mouth.set(0x0a1420);
      y = q.gh * smooth(u / 3.2) + 0.1 * Math.sin(t * 1.6 + q.seed) * smooth(u / 2);
      J = blendJ(J, POSE.ghost(t, q.seed), smooth(u / 1.4)); J.hipY = 0.86;
      const d = Math.max(0, u - 1.2), r = q.drR * smooth(d / 6); x += Math.sin(q.drP + d * q.drW) * r - Math.sin(q.drP) * r; z += Math.cos(q.drP + d * q.drW) * r - Math.cos(q.drP) * r;
      yaw += 0.4 * Math.sin(d * 0.2 + q.seed) * smooth(d / 4); glowK = 1 + 1.5 * Math.exp(-u * 2.5);
      if (q.toStore && t > T_CHASE + q.cd) { const k = smooth((t - T_CHASE - q.cd) / 7), ang = q.drP + t * 0.16 * Math.sign(q.drW), R = 3.5 + q.drR * 2;
        x = lerp(x, 6.5 + Math.cos(ang) * R * 0.7, k); z = lerp(z, -24 + Math.sin(ang) * R, k); y += k * 1.2; yaw = lerp(yaw, ang + Math.PI / 2 * Math.sign(q.drW), k); } }
  }
  if (q.fate === 'zombie' && t > q.tz) {
    const u = t - q.tz, k = smooth(u / 1.6);
    col.skin.lerp(q.zsk, k); col.shirt.lerp(q.shirt.clone().multiplyScalar(0.5).lerp(DIRT, 0.35), k * 0.8); col.trs.lerp(q.trs.clone().multiplyScalar(0.5).lerp(DIRT, 0.3), k * 0.8); col.hair.multiplyScalar(lerp(1, 0.7, k)); col.mouth.lerp(C('#2a0606'), k);
    col.scl.copy(EYEW); col.iris.copy(EYEW).lerp(new THREE.Color(2.6, 2.4, 1.2), 0.5 * k);
    if (u > 0.4) phone = false;
    const Zp = POSE.zombie(t, q.seed); J = blendJ(J, Zp, smooth(u / 1.1)); if (q.sitting) { J.hipY = lerp(0.5, Zp.hipY, smooth((t - T_CHASE) / 0.6)); }
    const ty = T_TURN + q.td, y0 = youAt(t), ang = Math.atan2(y0.x - x, y0.z - z);
    if (t > ty) { const hk = smooth((t - ty) / 0.16); J.headY = lerp(J.headY, clamp(wrapA(ang - yaw), -1.25, 1.25), hk); J.headR *= 1 - 0.6 * hk; }
    if (t > ty + 0.45) { const bk = smooth((t - ty - 0.45) / 1.5); const rel = wrapA(ang - yaw); yaw += rel * bk; J.headY = lerp(J.headY, clamp(wrapA(ang - yaw), -1.25, 1.25), bk); }
    if (q.sim && t > T_CHASE) { const s = sampleSim(q.sim, t), w = smooth((t - T_CHASE) / 0.4); x = lerp(x, s.x, w); z = lerp(z, s.z, w); yaw = yaw + wrapA(s.yaw - yaw) * w;
      const G = zombieGait(s.sp, s.ph, t, q.seed); J = blendJ(J, s.bang && t > T_SLAM + 0.2 ? POSE.bang(t, q.seed) : G, w); if (q.sitting) J.hipY = lerp(0.5, J.hipY, smooth((t - T_CHASE) / 0.6)); }
  }
  return (q._f = { x, y: groundY(x, z) + y, z, yaw, J, col, ghost, phone, glowK, sc: q.sc });
}

// ---------- crowd renderer ----------
class Crowd {
  constructor(parent, people, ghost) {
    const n = people.length; this.p = people; this.ghost = ghost;
    const body = ghost ? ghostMat(ghost === 2 ? 0.93 : 0.74) : glowPatch(new THREE.MeshStandardMaterial({ roughness: 0.68 }));
    const legs = ghost ? ghostMat(ghost === 2 ? 0.55 : 0.32) : body, face = glowPatch(new THREE.MeshStandardMaterial({ roughness: 0.3 }));
    const M = (g, cnt, mat) => { const m = new THREE.InstancedMesh(g, mat, cnt); m.castShadow = !ghost; m.receiveShadow = !ghost; m.frustumCulled = false; if (ghost) m.renderOrder = 3;
      for (let i = 0; i < cnt; i++) { m.setMatrixAt(i, ZERO); m.setColorAt(i, C('#ffffff')); } parent.add(m); return m; };
    Object.assign(this, { T: M(PG.torso, n, body), H: M(PG.head, n, body), HS: M(PG.hairS, n, body), HL: M(PG.hairL, n, body), EW: M(PG.eyeW, 2 * n, face), EI: M(PG.iris, 2 * n, face), MO: M(PG.mouth, n, face),
      TH: M(PG.thigh, 2 * n, legs), SH: M(PG.shin, 2 * n, legs), UA: M(PG.uarm, 2 * n, body), FA: M(PG.farm, 2 * n, body), HA: M(PG.hand, 2 * n, body), PH: M(PG.phone, n, STD(0x222630, { roughness: 0.3, metalness: 0.4 })) });
    this.all = [this.T, this.H, this.HS, this.HL, this.EW, this.EI, this.MO, this.TH, this.SH, this.UA, this.FA, this.HA, this.PH];
  }
  update(t) {
    const { T, H, HS, HL, EW, EI, MO, TH, SH, UA, FA, HA, PH } = this;
    this.p.forEach((q, i) => {
      const st = personFrame(q, t);
      const z1 = [T, H, HS, HL, MO, PH], z2 = [EW, EI, TH, SH, UA, FA, HA];
      if (!st || !!st.ghost !== !!this.ghost) { for (const m of z1) m.setMatrixAt(i, ZERO); for (const m of z2) { m.setMatrixAt(2 * i, ZERO); m.setMatrixAt(2 * i + 1, ZERO); } return; }
      const J = st.J, sc = st.sc, c = st.col, Bm = mT(st.x, st.y, st.z).multiply(mRY(st.yaw)).multiply(mS(sc, sc, sc));
      const hip = Bm.clone().multiply(mT(0, J.hipY, 0)), tor = hip.clone().multiply(mRY(J.twist)).multiply(mRX(J.lean));
      T.setMatrixAt(i, tor); T.setColorAt(i, c.shirt);
      const hd = tor.clone().multiply(mT(0, 0.6, 0)).multiply(mRY(J.headY)).multiply(mRX(J.headP)).multiply(mRZ(J.headR));
      H.setMatrixAt(i, hd); H.setColorAt(i, c.skin);
      HS.setMatrixAt(i, q.long ? ZERO : hd); HL.setMatrixAt(i, q.long ? hd : ZERO); HS.setColorAt(i, c.hair); HL.setColorAt(i, c.hair);
      const sk = q.storeGhost ? 1.7 : 1, ik = q.storeGhost ? 0.6 : 1; for (const k of [0, 1]) { const s = k ? -1 : 1; EW.setMatrixAt(2 * i + k, hd.clone().multiply(mT(s * 0.034, 0.153, 0.084)).multiply(mS(sk, sk * 1.15, 1))); EI.setMatrixAt(2 * i + k, hd.clone().multiply(mT(s * 0.034, 0.151, 0.0985)).multiply(mS(ik, ik, 1))); EW.setColorAt(2 * i + k, c.scl); EI.setColorAt(2 * i + k, c.iris); }
      MO.setMatrixAt(i, hd.clone().multiply(mT(0, 0.091 - 0.006 * J.mo, 0.094)).multiply(mS(1 - 0.15 * J.mo, 1 + 4.5 * J.mo, 1))); MO.setColorAt(i, c.mouth);
      for (const k of [0, 1]) { const s = k ? -1 : 1, hf = k ? J.rh : J.lh, kn = k ? J.rk : J.lk, sf = k ? J.rs : J.ls, el = k ? J.re : J.le, ab = k ? J.ra : J.la;
        const th = hip.clone().multiply(mT(s * 0.09, 0, 0)).multiply(mRX(-hf)); TH.setMatrixAt(i * 2 + k, th); SH.setMatrixAt(i * 2 + k, th.clone().multiply(mT(0, -0.43, 0)).multiply(mRX(kn)));
        const ua = tor.clone().multiply(mT(s * 0.2, 0.52, 0)).multiply(mRZ(s * ab)).multiply(mRX(-sf)); UA.setMatrixAt(i * 2 + k, ua);
        const fa = ua.clone().multiply(mT(0, -0.29, 0)).multiply(mRX(-el)); FA.setMatrixAt(i * 2 + k, fa); HA.setMatrixAt(i * 2 + k, fa);
        if (k === 1) PH.setMatrixAt(i, st.phone ? fa.clone().multiply(mT(0, -0.31, 0.045)).multiply(mRX(-0.35)) : ZERO);
        TH.setColorAt(i * 2 + k, c.trs); SH.setColorAt(i * 2 + k, c.trs); UA.setColorAt(i * 2 + k, c.shirt); FA.setColorAt(i * 2 + k, q.short ? c.skin : c.shirt); HA.setColorAt(i * 2 + k, c.skin); }
    });
    for (const m of this.all) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}
for (const q of PEOPLE) q.short = !q.you && RP() < 0.45;
const HUMANS = new Crowd(scene, PEOPLE, false), GHOSTS = new Crowd(scene, PEOPLE, 1), GHOST2 = new Crowd(scene, [SGHOST], 2);
const SGLOW = glow(0x9feaff, 3.2, 0); scene.add(SGLOW); const SGL = new THREE.PointLight(0x7fdcff, 0, 9, 1.4); scene.add(SGL);
const headWorld = (q, t) => { const st = personFrame(q, t); const J = st.J, sc = st.sc; const m = mT(st.x, st.y, st.z).multiply(mRY(st.yaw)).multiply(mS(sc, sc, sc)).multiply(mT(0, J.hipY, 0)).multiply(mRY(J.twist)).multiply(mRX(J.lean)).multiply(mT(0, 0.6, 0)).multiply(mRY(J.headY)).multiply(mRX(J.headP));
  return { p: new THREE.Vector3(0, 0.14, 0).applyMatrix4(m), f: new THREE.Vector3(0, 0, 1).transformDirection(m) }; };
// ghost glows
const GGLOW = PEOPLE.map(q => { const g = glow(0x8fe8ff, 2.4, 0); scene.add(g); return g; });

// =====================================================================================
// cars (instanced): moving on the main road until the freeze, waiting on the cross road
// =====================================================================================
const CARG = (() => {
  const paint = mergeGeometries([new RoundedBoxGeometry(1.86, 0.62, 4.3, 3, 0.18).translate(0, 0.62, 0), new RoundedBoxGeometry(1.6, 0.08, 1.95, 2, 0.035).translate(0, 1.5, -0.25)].map(g => g.deleteAttribute('uv')));
  const glass = new RoundedBoxGeometry(1.64, 0.56, 2.15, 3, 0.14).deleteAttribute('uv').translate(0, 1.2, -0.25);
  const wheels = mergeGeometries([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => new THREE.CylinderGeometry(0.35, 0.35, 0.26, 18).deleteAttribute('uv').rotateZ(Math.PI / 2).translate(sx * 0.84, 0.35, sz * 1.38)));
  const hubs = mergeGeometries([[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14).deleteAttribute('uv').rotateZ(Math.PI / 2).translate(sx * 0.97, 0.35, sz * 1.38)));
  const headl = mergeGeometries([-1, 1].map(s => new RoundedBoxGeometry(0.42, 0.15, 0.06, 2, 0.02).deleteAttribute('uv').translate(s * 0.6, 0.74, 2.14)));
  const taill = mergeGeometries([-1, 1].map(s => new RoundedBoxGeometry(0.4, 0.13, 0.06, 2, 0.02).deleteAttribute('uv').translate(s * 0.62, 0.78, -2.14)));
  return { paint, glass, wheels, hubs, headl, taill };
})();
const CARCOL = ['#ff1744', '#ffd600', '#2979ff', '#00e676', '#ffffff', '#ff9100', '#d500f9', '#00b8d4', '#212121', '#ffea00'].map(C);
const RC = RNG(808);
for (const [x, dirZ, v] of [[1.75, -1, 11.5], [5.25, -1, 9], [-1.75, 1, 11], [-5.25, 1, 8.5]]) { let z = -260 + RC() * 20; while (z < 260) { CARS.push({ x, dirZ, v, z0: z, c: CARCOL[(RC() * CARCOL.length) | 0], moving: true }); z += 16 + RC() * 24; } }
for (const [sx, zl] of [[1, -1.75], [1, -5.25], [-1, 1.75], [-1, 5.25]]) { let x = 13.5 + RC() * 3; for (let k = 0; k < 3; k++) { CARS.push({ x: sx * x, z0: zl, yaw: sx > 0 ? -Math.PI / 2 : Math.PI / 2, c: CARCOL[(RC() * CARCOL.length) | 0], moving: false }); x += 6 + RC() * 3; } }
const wrapZ = z => ((z + WRAPZ / 2) % WRAPZ + WRAPZ) % WRAPZ - WRAPZ / 2;
function carPos(c, t) {
  if (!c.moving) return { x: c.x, z: c.z0, yaw: c.yaw };
  const tf = Math.min(t, T_FRZ), d = Math.max(0, Math.min(t - T_FRZ, 0.6)), extra = c.v * (d - d * d / 1.2);
  return { x: c.x, z: wrapZ(c.z0 + c.dirZ * (c.v * tf + extra)), yaw: c.dirZ > 0 ? 0 : Math.PI };
}
const CARI = (() => { const n = CARS.length, M = (g, mat) => { const m = new THREE.InstancedMesh(g, mat, n); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const o = { paint: M(CARG.paint, STD(0xffffff, { roughness: 0.25, metalness: 0.35 })), glass: M(CARG.glass, STD(0x1c2a3a, { roughness: 0.08, metalness: 0.6 })), wheels: M(CARG.wheels, STD(0x1a1a1a, { roughness: 0.9 })), hubs: M(CARG.hubs, STD(0xd0d4d8, { metalness: 0.8, roughness: 0.3 })),
    headl: M(CARG.headl, new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff2c0, emissiveIntensity: 0.3 })), taill: M(CARG.taill, new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 0.5 })) };
  CARS.forEach((c, i) => o.paint.setColorAt(i, c.c)); return o; })();
const HLGLOW = CARS.map(() => [-1, 1].map(() => { const g = glow(0xfff1c8, 2.2, 0); scene.add(g); return g; }));
function updateCars(t, night) {
  CARS.forEach((c, i) => { const p = carPos(c, t), m = mT(p.x, 0, p.z).multiply(mRY(p.yaw)); for (const k of ['paint', 'glass', 'wheels', 'hubs', 'headl', 'taill']) CARI[k].setMatrixAt(i, m);
    HLGLOW[i].forEach((g, k) => { g.position.set(p.x + Math.cos(p.yaw) * (k ? -0.6 : 0.6) + Math.sin(p.yaw) * 2.3, 0.74, p.z - Math.sin(p.yaw) * (k ? -0.6 : 0.6) + Math.cos(p.yaw) * 2.3); g.material.opacity = 0.55 * night; }); });
  for (const k of Object.keys(CARI)) CARI[k].instanceMatrix.needsUpdate = true;
  CARI.headl.material.emissiveIntensity = lerp(0.3, 3.0, night);
}

// =====================================================================================
// shots
// =====================================================================================
const SHOTS = [];
const shot = (t0, t1, f) => SHOTS.push({ t0, t1, f });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const yp = t => { const b = YOU.base(t); return V3(b.x, groundY(b.x, b.z), b.z); };
const S1 = 5.05, S3 = 17.0, S4 = B.freeze.start + 2.6, S5 = T_PALE - 0.1, S6 = B.ghosts.start + 4.4, S7 = L('zombies', 0, 1) - 1.6, S9 = T_RUN + 0.25;
{ const a = hermite([[0, -26, 92, 150], [2.6, -4, 46, 95], [S1, 15.5, 6.5, 52]]), l = hermite([[0, 2, 0, 20], [2.6, 6, 0, 30], [S1, 9, 1.2, 26]]);
  shot(0, S1, t => ({ p: a(t), l: l(t), fov: 50 })); }
shot(S1, B.normal.start, t => { const y = yp(t), u = t - S1; return { p: V3(y.x - 0.7 + u * 0.05, 1.62, y.z - 3.3 - u * 0.25), l: V3(y.x - 0.05, 1.42, y.z), fov: 38 }; });
shot(B.normal.start, B.people.start, t => { const y = yp(t), u = (t - B.normal.start) / (B.people.start - B.normal.start); return { p: V3(6.85, 1.45 + 0.3 * u, y.z - 1.6 + 2.2 * u), l: V3(y.x + 0.3, 1.25, y.z - 0.6), fov: 44 }; });
shot(B.people.start, S3, t => { const u = t - B.people.start; return { p: V3(6.85, 1.55, 26 - u * 1.25), l: V3(11.2, 1.35, 21 - u * 1.25), fov: 46 }; });
shot(S3, B.freeze.start, t => { const y = yp(t); return { p: V3(y.x - 0.85, 1.95, y.z + 3.7), l: V3(y.x - 0.6, 1.3, y.z - 6), fov: 52 }; });
shot(B.freeze.start, S4, t => { const u = smooth((t - B.freeze.start) / (S4 - B.freeze.start)); return { p: V3(8.3, 1.65, 4.6), l: V3(-11.75, 8.4 + u * 0.2, -16.5), fov: lerp(30, 21, u) }; });
shot(S4, B.stare.start, t => { const u = smooth((t - S4) / (B.stare.start - S4)); return { p: V3(12.2 - u * 0.5, 1.75, -9.3 + u * 1.2), l: V3(8.9, 1.25, 2.6), fov: 46 }; });
shot(B.stare.start, S5, t => { const u = (t - B.stare.start) / (S5 - B.stare.start), a = 2.6 + u * 0.75, c = yp(t); return { p: V3(c.x + Math.sin(a) * 3.3, 1.65, c.z + Math.cos(a) * 3.3), l: V3(c.x, 1.45, c.z), fov: 44 }; });
shot(S5, B.ghosts.start, t => { const h = headWorld(FACEW, T_FRZ + 0.01), u = smooth((t - S5) / (B.ghosts.start - S5)), d = lerp(0.95, 0.62, u); return { p: h.p.clone().addScaledVector(h.f, d).add(V3(0.08, 0.02, 0)), l: h.p.clone().add(V3(0, -0.01, 0)), fov: 34 }; });
shot(B.ghosts.start, S6, t => { const u = smooth((t - B.ghosts.start) / (S6 - B.ghosts.start)); return { p: V3(3.6, 1.0, -7.2 + u * 0.4), l: V3(10, lerp(1.7, 3.7, u), -7.6), fov: 60 }; });
shot(S6, B.zombies.start, t => { const u = smooth((t - S6) / (B.zombies.start - S6)); return { p: V3(-9.2, 2.6 + 3.2 * u, 22 - 2 * u), l: V3(7.5, 3.4 + u * 0.6, -3), fov: 56 }; });
shot(B.zombies.start, S7, t => { const u = t - B.zombies.start; return { p: V3(6.4 - u * 0.12, 1.45, 5.3 + u * 0.2), l: V3(9.8, 1.45, 10.6), fov: 46 }; });
shot(S7, B.dark.start, t => { const y = yp(t), u = smooth((t - S7) / (B.dark.start - S7)); return { p: V3(y.x - 0.6, 1.8, y.z - 2.2 - 0.3 * u), l: V3(y.x + 0.1, 1.45, y.z + 8), fov: lerp(48, 40, u) }; });
{ shot(B.dark.start, B.chase.start, t => { const u = smooth((t - B.dark.start) / (B.chase.start - B.dark.start)), y = yp(B.dark.start); return { p: V3(lerp(y.x + 2.4, 4, u), lerp(1.7, 46, u), lerp(y.z - 3.2, -34, u)), l: V3(lerp(y.x, 2, u), lerp(1.4, 0, u), lerp(y.z, 8, u)), fov: lerp(46, 58, u) }; }); }
shot(B.chase.start, S9, t => { const u = (t - B.chase.start) / (S9 - B.chase.start); return { p: V3(7.6, 0.75, -2.6 - u * 0.4), l: V3(9.7, 1.45, 3.0), fov: 50 }; });
shot(S9, B.store.start, t => { const y = yp(t); return { p: V3(y.x - 1.0, 1.55, y.z - 4.8), l: V3(y.x - 0.2, 1.25, y.z + 2.5), fov: 56 }; });
shot(B.store.start, B.ghost.start, t => { const u = smooth((t - B.store.start) / (B.ghost.start - B.store.start)); return { p: V3(20.6 - u * 0.6, 1.7, -25.6 + u * 0.3), l: V3(12.4, 1.25, -23.8), fov: 54 }; });
shot(B.ghost.start, B.end.start, t => { const u = smooth((t - B.ghost.start) / (T_SCARE - B.ghost.start)); return { p: V3(14.3 + u * 0.35, 1.62, -24.85 + u * 0.15), l: V3(17.6, 1.48, -23.85), fov: lerp(46, 40, u) }; });
shot(B.end.start, DUR + 1, t => { const u = smooth((t - B.end.start) / (DUR - B.end.start)); return { p: V3(lerp(3.2, 0.5, u), lerp(3.2, 12, u), lerp(-13.5, -4, u)), l: V3(11, lerp(2.2, 1.0, u), -24.5), fov: 52 }; });
const CAMNOW = { p: V3(0, 0, 0), d: V3(0, 0, -1) };
function camAt(t) { let s = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; return { ...s.f(t), s }; }
// hide anyone the camera would pass through (positions frozen after T_FRZ; aerial cameras ignored)
CAMS = []; for (let t = 0; t <= DUR; t += 0.1) { const c = camAt(t); CAMS.push({ t, x: c.p.x, y: c.p.y, z: c.p.z }); }
for (const q of PEOPLE) { if (q.you || q.storeGhost || q.face) continue;
  const until = q.fate === 'ghost' ? q.tg + 1.0 : T_CHASE;
  for (const c of CAMS) { if (c.y > 3.2 || c.t > until) continue; const a = q.walk ? walkerPos(q, c.t) : { x: q.x, z: q.z }; if (Math.hypot(a.x - c.x, a.z - c.z) < 0.85) { q.hide = true; break; } } }
// keep stopped cars clear of every street-level camera position after the freeze
{ const CP = CAMS.filter(c => c.t > T_FRZ && c.y < 4 && !(c.t >= B.store.start && c.t < B.end.start));
  for (const c of CARS) if (c.moving) for (let k = 0; k < 14; k++) { const p = carPos(c, T_FRZ + 2);
    const hitCam = CP.some(q => Math.abs(q.x - p.x) < 1.7 && Math.abs(q.z - p.z) < 3.2);
    const hitCar = CARS.some(o => o !== c && o.moving && o.x === c.x && Math.abs(carPos(o, T_FRZ + 2).z - p.z) < 6.5);
    if (!hitCam && !hitCar) break; c.z0 += 5 * c.dirZ; } }
simZombies();

// =====================================================================================
// lights pool (street lamps at night, store ceiling)
// =====================================================================================
const FILL = new THREE.PointLight(0xa9b8ff, 0, 30, 1.2); scene.add(FILL);
const POOL = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xffb866, 0, 22, 1.6); scene.add(l); return l; });
const STOREL = [V3(14.2, 3.3, -24), V3(17.4, 3.3, -24), V3(20.6, 3.3, -24)];
const flick = (t, i) => { const n = noise.noise(t * 9 + i * 13.1, i * 3.3); return n < -0.45 ? 0.05 : 0.75 + 0.25 * noise.noise(t * 23 + i, 2); };

// =====================================================================================
// overlays and captions
// =====================================================================================
const capEls = [];
const HL = [[/\byou(?![a-z'’])[.?]?/gi, 'hy'], [/\b(ghosts?\.?|glow\.?|see-through)/gi, 'hg'], [/\b(zombies?\.?)/gi, 'hz'], [/\b(stops\.|white\.|dark\.|8:00 a\.m\.,)/gi, 'hr']];
for (const b of TL.beats) for (const s of b.subs) { const d = document.createElement('div'); d.className = 'cap' + (b.id === 'end' ? ' big' : ''); let h = s.text; for (const [re, c] of HL) h = h.replace(re, m => `<span class="${c}">${m}</span>`); d.innerHTML = h; $('caps').appendChild(d); capEls.push({ el: d, ...s }); }
function overlay(t, night) {
  const cur = capEls.filter(c => t >= c.t0 - 0.05 && t < c.t1 + 0.35).pop();
  for (const c of capEls) { const a = c === cur ? smooth((t - c.t0 + 0.05) / 0.06) * (1 - smooth((t - c.t1 - 0.25) / 0.1)) : 0, pop = 0.86 + 0.14 * smooth((t - c.t0 + 0.05) / 0.12);
    c.el.style.opacity = (t > T_SCARE - 0.1 && t < B.end.start) ? 0 : a; c.el.style.transform = `scale(${pop})`; }
  let fade = 1 - smooth(t / 0.5);
  if (t > T_SCARE + 0.25 && t < B.end.start + 0.6) fade = Math.max(fade, t < B.end.start ? 1 : 1 - smooth((t - B.end.start) / 0.6));
  fade = Math.max(fade, smooth((t - DUR + 1.3) / 1.2));
  $('fade').style.opacity = fade;
  let fl = 0; for (const th of THUNDER) if (t > th) fl = Math.max(fl, 0.55 * Math.exp(-(t - th) * 7) + 0.25 * Math.exp(-Math.abs(t - th - 0.25) * 18));
  const sc = t > T_SCARE ? Math.exp(-(t - T_SCARE) * 9) : 0;
  $('flash').style.opacity = Math.max(fl, sc); $('flash').style.background = sc > fl ? '#ffffff' : '#d8ccff';
  $('vig').style.opacity = lerp(0.3, 0.85, night);
  const frz = Math.exp(-Math.max(0, t - T_FRZ) * 3) * (t > T_FRZ ? 1 : 0);
  $('tint').style.background = '#9aa4c2'; $('tint').style.opacity = 0.35 * frz;
  $('c').style.filter = t > T_FRZ && t < T_FRZ + 1.2 ? `saturate(${lerp(0.4, 1, smooth((t - T_FRZ) / 1.2))})` : 'none';
}

// =====================================================================================
// frame
// =====================================================================================
const nightK = t => smooth((t - T_DARK) / 2.6);
window.DURATION = DUR;
window.renderFrame = (t) => {
  const night = nightK(t);
  const c = camAt(t); let p = c.p.clone(), l = c.l.clone();
  // handheld feel, stronger in the horror part
  const shk = lerp(0.006, 0.02, night) + (t > T_RUN && t < B.store.start ? 0.03 : 0) + (t > T_SCARE - 0.05 && t < T_SCARE + 0.3 ? 0.06 : 0);
  p.x += shk * noise.noise(t * 1.3, 1); p.y += shk * noise.noise(t * 1.4, 2); l.x += shk * 2 * noise.noise(t * 0.9, 3); l.y += shk * 2 * noise.noise(t * 0.8, 4);
  camera.position.copy(p); camera.lookAt(l); camera.fov = c.fov; camera.updateProjectionMatrix();
  CAMNOW.p.copy(p); CAMNOW.d.copy(l).sub(p).normalize();
  SKY.position.copy(p);
  // sky / light
  setSky(night); SKYU.off.value = t * 0.004;
  scene.environment = night > 0.5 ? ENV_NIGHT : ENV_DAY; scene.environmentIntensity = night > 0.5 ? lerp(0.15, 0.5, (night - 0.5) * 2) : lerp(0.65, 0.3, night * 2);
  let fl = 0; for (const th of THUNDER) if (t > th) fl = Math.max(fl, Math.exp(-(t - th) * 6));
  const gdark = t > B.ghost.start && t < B.end.start ? smooth((t - B.ghost.start - 0.25) / 0.6) : 0;
  hemi.color.copy(C('#bfe0ff')).lerp(C('#6c58b8'), night); hemi.groundColor.copy(C('#b89f7a')).lerp(C('#24361f'), night); hemi.intensity = (lerp(1.05, 0.85, night) + fl * 2.5) * lerp(1, 0.1, gdark);
  const sd = V3(0.5, 0.75, 0.42).normalize().lerp(V3(-0.35, 0.6, -0.72).normalize(), night).normalize();
  sun.color.copy(C('#fff2dd')).lerp(C('#a48cff'), night); sun.intensity = lerp(3.4, 0.75, night) + fl * 2;
  const focus = (t >= B.end.start || (t > B.dark.start + 2 && t < B.chase.start) || t < S1 * 0.9) ? V3(4, 0, -5) : l.clone().lerp(p, 0.4);
  const ext = (t >= B.end.start || (t > B.dark.start + 2 && t < B.chase.start) || t < S1 * 0.9) ? 110 : 34;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 600 }); sun.shadow.camera.updateProjectionMatrix();
  sun.position.copy(focus).addScaledVector(sd, 250); sun.target.position.copy(focus);
  renderer.toneMappingExposure = lerp(1.12, 1.35, night) * lerp(1, 0.8, gdark);
  for (const m of FMAT) m.emissiveIntensity = night * 0.55 * (0.85 + 0.15 * flick(t * 0.3, 5));
  LAMPHEAD.emissiveIntensity = night * 2.2; scene.environmentIntensity *= lerp(1, 0.12, gdark); CEILM.emissiveIntensity = 0.18 * (1 - gdark);
  FRIDGEM.emissiveIntensity = t > B.ghost.start + 0.3 && t < B.end.start ? 0.45 : 0.9;
  CLOCKM.map = CLOCKM.emissiveMap = t < T_CLK ? CK.a : CK.b; CLOCKM.emissiveIntensity = 0.9 * (1 - smooth((t - T_DARK - 1.2) / 0.3)) * (t > T_DARK && t < T_DARK + 1.5 ? (flick(t, 9) > 0.3 ? 1 : 0.1) : 1);
  // light pool: store lights when inside, otherwise the street lamps nearest the view
  const inStore = t >= B.store.start && t < B.end.start;
  const cands = LAMPS.map((v, i) => ({ v, i, d: v.distanceTo(l) + v.distanceTo(p) * 0.5 })).sort((a, b) => a.d - b.d);
  POOL.forEach((pl, k) => { if (inStore && k < 3) { pl.position.copy(STOREL[k]); pl.color.set(0xeaf4ff); pl.distance = 14; const gk = t > B.ghost.start + 0.15 ? (t < B.ghost.start + 0.9 ? (flick(t * 3, k + 20) > 0.5 ? 0.6 : 0.05) : 0.1 + 0.05 * flick(t * 2, k)) : 1; pl.intensity = 7 * gk; return; }
    const cd = cands[inStore ? k - 3 : k]; pl.position.copy(cd.v); pl.color.set(0xffb060); pl.distance = 22; pl.intensity = night * 26 * flick(t, cd.i); });
  { const inside = t >= B.store.start && t < B.end.start; FILL.intensity = inside ? 0 : night * 55; FILL.position.copy(p).lerp(l, 0.35).add(V3(0, 3.5, 0)); }
  LAMPGLOW.forEach((g, i) => g.material.opacity = night * 0.85 * flick(t, i));
  // people
  for (const q of PEOPLE) q._t = -1;
  SGHOST._t = -1; HUMANS.update(t); GHOSTS.update(t); GHOST2.update(t);
  { const sg = personFrame(SGHOST, t); SGLOW.material.opacity = sg ? 0.7 : 0; SGL.intensity = sg ? 9 : 0; if (sg) { SGLOW.position.set(sg.x, sg.y + 1.2, sg.z); SGL.position.set(sg.x, sg.y + 1.3, sg.z); } }
  PEOPLE.forEach((q, i) => { const g = GGLOW[i]; if (q.hide) { g.material.opacity = 0; return; } const st = personFrame(q, t); if (!st || !(st.ghost || st.glowK > 0)) { g.material.opacity = 0; return; }
    g.position.set(st.x, st.y + 1.15 * st.sc, st.z); const k = st.glowK || 0; const near = clamp((V3(st.x, st.y + 1, st.z).distanceTo(p) - 2) / 10); g.material.opacity = (st.ghost ? lerp(0.4, 0.5, night) * Math.min(1, k) + 0.5 * Math.max(0, k - 1) : 0.7 * k) * lerp(0.25, 1, near); g.scale.setScalar(st.ghost ? 2.6 + 2.0 * Math.max(0, k - 1) : 1.8 + 2.0 * k); });
  updateCars(t, night);
  // store door
  STORE.doorG.rotation.y = 1.35 * smooth((t - T_DOOR + 0.3) / 0.3) * (1 - smooth((t - T_SLAM + 0.22) / 0.22));
  overlay(t, night);
  for (const lt of [...POOL, FILL, SGL]) lt.visible = lt.intensity > 1e-4;   // dark lights cost nothing
  renderer.render(scene, camera);
};
window.TRACK = { T_CLK, T_FRZ, T_PALE, T_EYE, T_GH, T_ZB, T_TURN, T_DARK, T_CHASE, T_RUN, T_DOOR, T_ARR, T_SLAM, T_SCARE, ghostT: PEOPLE.filter(q => q.fate === 'ghost' && !q.hide).map(q => q.tg).sort((a, b) => a - b) };
window.READY = true;
