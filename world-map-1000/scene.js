// Realistic globe with time-morphing political borders. Deterministic: window.renderFrame(t).
import * as THREE from 'three';

const W = 1080, H = 1920, FPS = 30;
const TL = await (await fetch('build/timeline.json')).json();
const LB = await (await fetch('out/labels.json')).json();
window.DURATION = TL.duration;
const BEAT = Object.fromEntries(TL.beats.map(b => [b.id, b]));

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const MAXTEX = renderer.capabilities.maxTextureSize, ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x01030a);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 200);

const loader = new THREE.TextureLoader();
async function tex(url, mip = true) {
  const t = await loader.loadAsync(url);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = ANISO; t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}
const [tEarth, tLand] = await Promise.all([tex('out/earth.jpg'), tex('out/land.png')]);

// ---------------------------------------------------------------- globe
const ll2v = (lon, lat, r = 1) => { const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) * Math.PI / 180;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r); };
const U = { tEarth: { value: tEarth }, tLand: { value: tLand }, tFA: { value: null }, tFB: { value: null }, tBA: { value: null }, tBB: { value: null },
  uMix: { value: 0 }, uBG: { value: 1 }, uFill: { value: 0.5 }, uSun: { value: new THREE.Vector3(0, 0, 1) }, uCam: { value: new THREE.Vector3() }, uOn: { value: 1 } };
const earthMat = new THREE.ShaderMaterial({ uniforms: U,
  vertexShader: `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
  uniform sampler2D tEarth, tLand, tFA, tFB, tBA, tBB; uniform float uMix, uBG, uFill, uOn; uniform vec3 uSun, uCam;
  varying vec2 vUv; varying vec3 vP;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 1.7; a *= .5; } return s; }
  void main(){
    vec3 N = normalize(vP), V = normalize(uCam - vP);
    vec3 base = texture2D(tEarth, vUv).rgb;
    float land = texture2D(tLand, vUv).r;
    float n = (fbm(vP.xy * 9.) + fbm(vP.yz * 9. + 3.1) + fbm(vP.zx * 9. + 7.3)) / 3.;
    float m = smoothstep(n - .07, n + .07, uMix * 1.3 - .15);
    vec4 fa = texture2D(tFA, vUv), fb = texture2D(tFB, vUv);
    vec4 f = mix(fa, fb, m);
    vec3 col = f.rgb / max(f.a, .002);
    vec3 bo = mix(texture2D(tBA, vUv).rgb, texture2D(tBB, vUv).rgb, m);
    float lum = dot(base, vec3(.299, .587, .114));
    float ice = smoothstep(.55, .8, lum);
    base = mix(base, base * vec3(.80, .86, .93), smoothstep(.6, .95, lum));   // keep ice caps from glaring
    float a = f.a * land * (uFill + .28 * bo.g) * (1. - ice * .85) * uOn;
    vec3 tint = col * (.30 + 1.30 * lum) + base * .12;
    vec3 c = mix(base, tint, a);
    float line = clamp(bo.r * uBG, 0., 1.) * land * uOn;
    c = mix(c, c * .45, clamp(bo.g * .35 * uOn, 0., .3));         // soft shadow either side of a border
    c = mix(c, mix(vec3(1., .98, .93), col, .18 * f.a), line * .9);
    // light
    float dif = clamp(dot(N, uSun) * .8 + .3, .12, 1.04);
    c *= dif;
    vec3 R = reflect(-uSun, N); float sp = pow(max(dot(R, V), 0.), 90.) * (1. - land) * .22;
    c += sp * vec3(1., .95, .85);
    float fr = pow(1. - max(dot(N, V), 0.), 2.6);
    c = mix(c, vec3(.42, .66, 1.), fr * .6);
    gl_FragColor = vec4(c, 1.);
  }` });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), earthMat); scene.add(globe);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.075, 128, 64), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vN = normalize(wp.xyz); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float d = dot(vN, vV); float i = pow(clamp(-d / .37, 0., 1.), 3.2); gl_FragColor = vec4(vec3(.30, .56, 1.) * i * 0.95, 1.); }` }));
scene.add(atmo);
{ // stars
  const g = new THREE.BufferGeometry(), N = 2600, p = new Float32Array(N * 3), c = new Float32Array(N * 3); let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - u * u); p.set([q * Math.cos(a) * 80, u * 80, q * Math.sin(a) * 80], i * 3);
    const b = 0.25 + Math.pow(r(), 3) * 0.75, w = r(); c.set([b * (0.85 + w * 0.15), b * 0.92, b * (1.0 - w * 0.1)], i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false })));
}

// ---------------------------------------------------------------- year textures (two live at a time)
const cache = new Map();
function ensure(y) {
  if (!cache.has(y)) cache.set(y, Promise.all([tex(`out/fill_${y}.png`), tex(`out/bord_${y}.png`)]).then(([f, b]) => ({ f, b })));
  return cache.get(y);
}
function prune(keep) { for (const [y, p] of cache) if (!keep.includes(y)) { p.then(o => { o.f.dispose(); o.b.dispose(); }); cache.delete(y); } }
const MORPHS = TL.beats.flatMap(b => b.morph).sort((a, b) => a.start - b.start);
function yearState(t) {
  let cur = 1000;
  for (const mo of MORPHS) {
    if (t >= mo.start + mo.dur) { cur = mo.year; continue; }
    if (t >= mo.start) return { A: cur, B: mo.year, m: (t - mo.start) / mo.dur, next: mo.year };
    return { A: cur, B: cur, m: 0, next: mo.year };
  }
  return { A: cur, B: cur, m: 0, next: cur };
}

// ---------------------------------------------------------------- camera path: keys per beat [fraction, lon, lat, dist]
const KEYS = {
  hook: [[0, -95, 12, 7.8], [1, 28, 32, 6.4]],
  eu1000: [[0.05, 14, 47, 3.15], [1, 22, 44, 2.9]],
  as1000: [[0, 32, 33, 3.7], [0.42, 38, 30, 3.6], [1, 104, 33, 3.7]],
  mongol: [[0, 88, 46, 4.7], [1, 82, 46, 5.3]],
  split: [[0.1, 62, 45, 4.6], [1, 33, 40, 3.2]],
  americas: [[0.05, -82, 6, 4.8], [1, -76, -2, 4.5]],
  conquest: [[0.1, -70, 0, 5.4], [0.55, -62, 4, 5.6], [1, -35, 18, 7.2]],
  russia: [[0.05, 98, 55, 5.3], [0.5, 105, 57, 5.4], [1, 80, 24, 3.7]],
  usa: [[0, -82, 38, 3.4], [1, -86, 40, 3.7]],
  latam: [[0.05, -64, -12, 4.9], [1, -62, -16, 4.7]],
  africa: [[0.05, 18, 4, 4.6], [1, 20, 2, 4.9]],
  brit: [[0, -55, 22, 7.4], [1, 85, 5, 7.4]],
  ww1: [[0.05, 22, 47, 3.5], [1, 30, 42, 3.8]],
  ww2: [[0, 16, 50, 3.3], [1, 18, 50, 3.6]],
  decol: [[0, 78, 22, 3.9], [0.45, 72, 20, 4.1], [1, 14, 6, 4.8]],
  ussr: [[0.05, 72, 53, 5.2], [1, 66, 52, 5.5]],
  today: [[0, 25, 28, 7.2], [1, 70, 22, 7.0]],
  outro: [[0, 75, 20, 7.0], [1, 165, 18, 8.4]],
};
const PATH = []; for (const b of TL.beats) for (const [f, lon, lat, d] of KEYS[b.id]) PATH.push([b.start + f * (b.end - b.start), lon, lat, d]);
PATH[0][0] = 0; PATH.sort((a, b) => a[0] - b[0]);
for (let i = 1; i < PATH.length; i++) { let l = PATH[i][1]; while (l - PATH[i - 1][1] > 180) l -= 360; while (l - PATH[i - 1][1] < -180) l += 360; PATH[i][1] = l; }
const sm = x => x * x * (3 - 2 * x);
function target(t) {
  if (t <= PATH[0][0]) return PATH[0].slice(1);
  for (let i = 1; i < PATH.length; i++) if (t <= PATH[i][0]) { const a = PATH[i - 1], b = PATH[i], k = sm((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, Math.exp(Math.log(a[3]) + (Math.log(b[3]) - Math.log(a[3])) * k)]; }
  return PATH[PATH.length - 1].slice(1);
}
// critically damped follow, precomputed so every frame is reproducible
const CAM = []; { const dt = 1 / 120, w = 3.2; let x = target(0), v = [0, 0, 0];
  for (let i = 0, n = Math.ceil(TL.duration * 120) + 240; i <= n; i++) { const tg = target(i * dt);
    for (let j = 0; j < 3; j++) { const a = w * w * (tg[j] - x[j]) - 2 * w * v[j]; v[j] += a * dt; x[j] += v[j] * dt; }
    if (i % 4 === 0) CAM.push(x.slice()); } }
const camAt = t => { const f = t * FPS, i = Math.min(CAM.length - 2, Math.floor(f)), k = f - i; return CAM[i].map((v, j) => v + (CAM[i + 1][j] - v) * k); };

// ---------------------------------------------------------------- overlays
const FOCUS = { eu1000: ['Holy Roman Empire', 'Byzantine Empire'], as1000: ['Fatimid Caliphate', 'Song Empire'], mongol: ['Golden Horde', 'Ilkhanate', 'Chagatai Khanate', 'Yuan (Mongol)'],
  split: ['Ottoman Empire'], americas: ['Aztec Empire', 'Inca Empire'], conquest: ['Spain', 'Portugal', 'Viceroyalty of New Spain', 'Viceroyalty of Peru'],
  russia: ['Tsardom of Russia', 'Mughal Empire'], usa: ['United States'], brit: ['British Raj', 'Canada', 'Australia'], ww1: ['Poland', 'Czechoslovakia', 'Yugoslavia', 'Soviet Union', 'Turkey'],
  decol: ['India', 'Pakistan'], ussr: ['Russia', 'Ukraine', 'Kazakhstan'], africa: [] };
const CALL = { mongol: ['Mongol Empire', 'Largest contiguous land empire ever', 0.25], americas: ['Aztec & Inca Empires', '', 0.05], africa: ['Scramble for Africa', '1880 → 1914', 0.02],
  brit: ['British Empire', '≈ ¼ of the world’s land', 0.0], ww1: ['World War I', '1914 – 1918', 0.0], ww2: ['World War II', '1939 – 1945', 0.0], decol: ['Decolonization', '', 0.02],
  ussr: ['USSR dissolves', '15 new countries · 1991', 0.05], today: ['≈ 195 countries', '', 0.15], usa: ['United States', 'Independence · 1783', 0.1] };
const elLab = document.getElementById('labels'), elYear = document.getElementById('year'), elCall = document.getElementById('call'), elSub = document.getElementById('sub'),
  elTitle = document.getElementById('title'), elCredit = document.getElementById('credit');
const pool = []; const lab = i => { while (pool.length <= i) { const d = document.createElement('div'); d.className = 'lb'; elLab.appendChild(d); pool.push(d); } return pool[i]; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const tmp = new THREE.Vector3();
function proj(v) { tmp.copy(v).project(camera); return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H]; }
function split2(s) { if (s.length < 13 || !s.includes(' ')) return [s]; const mid = s.length / 2; let best = -1, bd = 1e9;
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); best = i; } return [s.slice(0, best), s.slice(best + 1)]; }

function drawLabels(st, beat, camDir) {
  const sets = st.A === st.B ? [[st.A, 1]] : [[st.A, 1 - ss(0.3, 0.6, st.m)], [st.B, ss(0.45, 0.8, st.m)]];
  const focus = FOCUS[beat?.id] || [], boxes = [[0, 0, W, 470], [40, 1360, W - 40, 1640]]; let n = 0;
  const cand = [];
  for (const [y, op] of sets) { if (op < 0.02) continue;
    for (const L of LB.labels[y]) cand.push({ L, op, f: focus.includes(L.name) }); }
  cand.sort((a, b) => (b.f - a.f) || (b.L.area - a.L.area));
  for (const { L, op, f } of cand) {
    if (n >= 16) break;
    const p = ll2v(L.lon, L.lat), facing = p.dot(camDir); if (facing < 0.42) continue;
    const [x, y] = proj(p), q = ll2v(L.lon, L.lat + Math.max(0.6, L.r)), [x2, y2] = proj(q);
    const rpx = Math.hypot(x2 - x, y2 - y);
    const lines = split2(L.name), len = Math.max(...lines.map(s => s.length));
    let fs = clamp(rpx * (lines.length > 1 ? 0.55 : 0.42), 0, f ? 50 : 40);
    fs = Math.min(fs, rpx * 4.2 / len);
    if (f) fs = Math.max(fs, 24);
    if (fs < 15) continue;
    const w = len * fs * 0.74, h = lines.length * fs * 1.08, bx = [x - w / 2 - 6, y - h / 2 - 4, x + w / 2 + 6, y + h / 2 + 4];
    if (bx[0] < 10 || bx[2] > W - 10) continue;
    if (boxes.some(b => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) continue;
    boxes.push(bx);
    const d = lab(n++); d.innerHTML = lines.join('<br>'); d.className = 'lb' + (f ? ' f' : '');
    d.style.fontSize = fs.toFixed(1) + 'px'; d.style.opacity = (op * ss(0.42, 0.6, facing)).toFixed(3);
    d.style.transform = `translate(${(x).toFixed(1)}px, ${(y).toFixed(1)}px) translate(-50%, -50%)`; d.style.display = 'block';
  }
  for (let i = n; i < pool.length; i++) pool[i].style.display = 'none';
}

function drawText(t, st, beat) {
  // title during the hook, year counter afterwards
  const hook = BEAT.hook, tIn = ss(0.2, 0.9, t), tOut = 1 - ss(hook.end - 0.6, hook.end + 0.2, t);
  elTitle.style.opacity = (tIn * tOut).toFixed(3); elTitle.style.transform = `translateY(${(1 - tIn) * 30}px)`;
  const yOn = ss(hook.end - 0.1, hook.end + 0.6, t);
  const e = st.m <= 0 ? 0 : st.m >= 1 ? 1 : sm(st.m);
  const yr = Math.round(st.A + (st.B - st.A) * e);
  elYear.innerHTML = `${yr}<small>${yr >= 2026 ? 'TODAY' : 'AD'}</small>`; elYear.style.opacity = yOn.toFixed(3);
  // callout
  const c = beat && CALL[beat.id]; let co = 0;
  if (c) { const t0 = beat.start + c[2] * (beat.end - beat.start); co = ss(t0, t0 + 0.35, t) * (1 - ss(beat.end - 0.35, beat.end, t));
    const html = `<div class="t">${c[0]}</div>${c[1] ? `<div class="s">${c[1]}</div>` : ''}`; if (elCall.innerHTML !== html) elCall.innerHTML = html; }
  elCall.style.opacity = co.toFixed(3); elCall.style.transform = `translateX(-50%) scale(${(0.94 + 0.06 * co).toFixed(3)})`;
  // captions
  let s = null; for (const b of TL.beats) for (const x of b.subs) if (t >= x.start - 0.05 && t < x.end + 0.12) s = x;
  if (s) { const k = ss(s.start - 0.05, s.start + 0.08, t); elSub.innerHTML = s.text.replace(/(\d[\d,]*s?|¼)/g, '<b>$1</b>'); elSub.style.opacity = 1;
    elSub.style.transform = `scale(${(0.9 + 0.1 * k).toFixed(3)})`; } else elSub.style.opacity = 0;
  // credits in the final hold
  const cr = ss(TL.duration - 3.0, TL.duration - 2.4, t);
  elCredit.style.opacity = cr.toFixed(3);
  elCredit.innerHTML = 'Borders: historical-basemaps (A. Ourednik, GPL-3.0) · Natural Earth<br>Imagery: NASA Blue Marble · Solar System Scope (CC BY 4.0)';
  elSub.style.display = cr > 0.5 ? 'none' : 'block';
}

let READY_FONTS = document.fonts.ready;
window.renderFrame = async t => {
  await READY_FONTS;
  const st = yearState(t);
  const [a, b] = await Promise.all([ensure(st.A), ensure(st.B)]);
  ensure(st.next); prune([st.A, st.B, st.next]);
  U.tFA.value = a.f; U.tBA.value = a.b; U.tFB.value = b.f; U.tBB.value = b.b; U.uMix.value = st.A === st.B ? 0 : clamp(st.m, 0, 1);
  const beat = TL.beats.find(x => t >= x.start && t < x.end) || TL.beats[TL.beats.length - 1];
  const [lon, lat, d] = camAt(t);
  camera.position.copy(ll2v(lon, lat, d)); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const back = camera.position.clone().normalize(), right = new THREE.Vector3().crossVectors(camera.up, back).normalize(), up = new THREE.Vector3().crossVectors(back, right);
  U.uSun.value.copy(back).multiplyScalar(0.8).addScaledVector(up, 0.5).addScaledVector(right, -0.45).normalize();
  U.uCam.value.copy(camera.position);
  U.uBG.value = 1.1 + clamp((d - 3) / 4.5, 0, 1) * 1.5;
  U.uOn.value = 1 - 0.0 * t;
  drawLabels(st, beat, back);
  drawText(t, st, beat);
  renderer.render(scene, camera);
};
console.log('maxTexture', MAXTEX, 'aniso', ANISO);
window.READY = true;
