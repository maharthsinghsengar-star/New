// SAHI CLICK – Mega Visitor Day: human-like 2D characters in vibrant 3D Diwali sets. Deterministic window.renderFrame(t).
import * as THREE from 'three';
import { drawPerson, SPECS, defaultState, CW, CH } from './toon.js';

const RW = 720, RH = 1280, FPS = 30;
const TL = await (await fetch('build/timeline.json')).json();
window.DURATION = TL.duration;
await Promise.all(['500', '600', '700', '800'].map(w => document.fonts.load(`${w} 40px Pop`, 'अ SAHI ₹')));

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, RW / RH, 0.05, 400);
// ---- toon post: ink outlines from depth + colour edges, saturation, soft glow; UI layer drawn on top afterwards
const rtMain = new THREE.WebGLRenderTarget(RW, RH, { samples: 4, depthTexture: new THREE.DepthTexture(RW, RH) });
rtMain.texture.colorSpace = THREE.SRGBColorSpace;
const rtA = new THREE.WebGLRenderTarget(RW / 4, RH / 4), rtB = rtA.clone();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadScene = new THREE.Scene(); quadScene.add(quad);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb * .227; float w[4]; w[0]=.195; w[1]=.122; w[2]=.054; w[3]=.016; for(int i=0;i<4;i++){ c += texture2D(tex, vUv + dir*float(i+1)).rgb*w[i]; c += texture2D(tex, vUv - dir*float(i+1)).rgb*w[i]; } gl_FragColor = vec4(c, 1.); }' });
const compMat = new THREE.ShaderMaterial({ uniforms: { sharp: { value: rtMain.texture }, blur: { value: rtB.texture }, depth: { value: rtMain.depthTexture }, glowK: { value: 0.6 }, inkK: { value: 1 } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D sharp, blur, depth; uniform float glowK, inkK; varying vec2 vUv;
  float lin(float d){ float z = d * 2. - 1.; return 2. * .05 * 400. / (400. + .05 - z * (400. - .05)); }
  void main(){ vec2 o = vec2(1.25 / ${RW}., 1.25 / ${RH}.);
    vec3 c = texture2D(sharp, vUv).rgb; float z = lin(texture2D(depth, vUv).r);
    float zl = lin(texture2D(depth, vUv - vec2(o.x, 0.)).r), zr = lin(texture2D(depth, vUv + vec2(o.x, 0.)).r), zu = lin(texture2D(depth, vUv + vec2(0., o.y)).r), zd = lin(texture2D(depth, vUv - vec2(0., o.y)).r);
    float de = smoothstep(0.04, 0.1, abs(zl + zr + zu + zd - 4. * z) / z);
    vec3 cl = texture2D(sharp, vUv - vec2(o.x, 0.)).rgb, cr = texture2D(sharp, vUv + vec2(o.x, 0.)).rgb, cu = texture2D(sharp, vUv + vec2(0., o.y)).rgb, cd = texture2D(sharp, vUv - vec2(0., o.y)).rgb;
    float ce = smoothstep(0.22, 0.45, length(cl - cr) + length(cu - cd));
    float ink = clamp(max(de, ce * 0.7), 0., 1.) * inkK;
    c = pow(max(c, 0.), vec3(1. / 2.2));
    float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, 1.35);
    vec3 b = pow(max(texture2D(blur, vUv).rgb, 0.), vec3(1. / 2.2)); c += max(b - 0.75, 0.) * glowK * 1.6;
    c = mix(c, vec3(.09, .067, .12), ink);
    gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }` });
const bloom = { strength: 0.5 };
const UI = 2;   // render layer for graphics drawn over the ink pass
function postRender() {
  camera.layers.set(0); renderer.setRenderTarget(rtMain); renderer.clear(); renderer.render(scene, camera);
  quad.material = blurMat; const pass = (src, dst, x, y) => { blurMat.uniforms.tex.value = src.texture; blurMat.uniforms.dir.value.set(x, y); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); };
  pass(rtMain, rtA, 2 / (RW / 4), 0); pass(rtA, rtB, 0, 2 / (RH / 4)); pass(rtB, rtA, 3.5 / (RW / 4), 0); pass(rtA, rtB, 0, 3.5 / (RH / 4));
  compMat.uniforms.glowK.value = bloom.strength; quad.material = compMat; renderer.setRenderTarget(null); renderer.clear(); renderer.render(quadScene, quadCam);
  renderer.autoClear = false; renderer.clearDepth(); camera.layers.set(UI); const bg = scene.background; scene.background = null; renderer.render(scene, camera); scene.background = bg; renderer.autoClear = true; camera.layers.set(0);
}

// ---------------------------------------------------------------- helpers
let NOW = 0;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const easeOutBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function RNG(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const GRAD = (() => { const d = new Uint8Array([155, 215, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const std = (c, o = {}) => { const { roughness, metalness, ...rest } = o; return new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, ...rest }); };
const glowM = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
const box = (w, h, d, mat, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p);
const cyl = (r1, r2, h, mat, x, y, z, p, seg = 20) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat, x, y, z, p);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
const glowTex = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
function glow(color, size, x, y, z, parent, op = 1) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s; }
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
const LOGO = await loadImg('assets/logo.png'), LOGOW = await loadImg('assets/logo_white.png');

// ---------------------------------------------------------------- sets (each in its own region of space)
const SETS = {};
function makeSet(name, x) { const g = new THREE.Group(); g.position.x = x; scene.add(g); g.visible = false; SETS[name] = g; return g; }
const fireworks = [];   // {group, bursts}
const twinklers = [];   // instanced string lights
const flames = [];      // diya flames

function stringLights(parent, pts, n, colors, size = 0.05) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < n; i++) { m4.setPosition(curve.getPoint(i / (n - 1))); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(colors[i % colors.length])); }
  parent.add(im); const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.006, 4), std(0x222222)); parent.add(wire);
  twinklers.push({ im, n, colors, ph: Math.random() * 10 }); return im;
}
const sag = (a, b, d = 0.4, n = 6) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * d, lerp(a[2], b[2], k)]; });
function diya(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  const bowl = mesh(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xb5532a, { roughness: 0.9 }), 0, 0.055, 0, g); bowl.scale.set(1, 0.7, 1);
  mesh(new THREE.TorusGeometry(0.066, 0.008, 6, 20).rotateX(Math.PI / 2), std(0xe8b04a, { metalness: 0.3 }), 0, 0.055, 0, g);
  const f = mesh(new THREE.SphereGeometry(0.018, 10, 8), glowM(0xffd27a), 0.02, 0.085, 0, g, false); f.scale.set(1, 2.2, 1);
  const gl = glow(0xff9a2a, 0.32, 0.02, 0.1, 0, g, 0.85);
  flames.push({ f, gl, ph: x * 7.3 + z * 3.1 + y }); return g;
}
function marigold(parent, pts, n = 40) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.SphereGeometry(0.045, 8, 6), mats = [std(0xff8c00, { roughness: 0.95 }), std(0xffc300, { roughness: 0.95 })];
  for (let i = 0; i < n; i++) { const p = curve.getPoint(i / (n - 1)); const m = new THREE.Mesh(geo, mats[i % 2]); m.position.copy(p); parent.add(m); }
}
function bunting(parent, a, b, n, d = 0.35) {
  const cols = [0xff3b6b, 0xffd23f, 0x3bc9ff, 0x7ee06a, 0xff8c2a, 0xb06bff];
  const tri = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.12, 0), new THREE.Vector2(0.12, 0), new THREE.Vector2(0, -0.26)]));
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, p = [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * d, lerp(a[2], b[2], k)];
    const m = new THREE.Mesh(tri, std(cols[i % cols.length], { side: THREE.DoubleSide })); m.position.set(...p); parent.add(m); }
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sag(a, b, d, 12).map(q => new THREE.Vector3(...q))), 40, 0.008, 4), std(0x333333)));
}
function hangingStrand(parent, x, y, z, len = 0.7) { for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), std(i % 2 ? 0xff8c00 : 0xffc300, { roughness: 0.95 })); m.position.set(x, y - i * len / 9, z); parent.add(m); } }
function lantern(parent, x, y, z, color) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.6 }), 0, 0, 0, g, false).scale.set(1, 1.25, 1);
  for (let i = 0; i < 6; i++) { const t = mesh(new THREE.PlaneGeometry(0.03, 0.35), glowM(color), Math.cos(i) * 0.08, -0.4, Math.sin(i) * 0.08, g, false); t.material.side = THREE.DoubleSide; }
  glow(color, 1.1, 0, 0, 0, g, 0.6); return g;
}
function fireworkSystem(parent, area, seed, count, t0, t1) {
  const r = RNG(seed), bursts = [], N = 140;
  for (let i = 0; i < count; i++) bursts.push({ t: t0 + r() * (t1 - t0), x: area[0] + r() * (area[1] - area[0]), y: area[2] + r() * (area[3] - area[2]), z: area[4] + r() * (area[5] - area[4]),
    c: new THREE.Color().setHSL(r(), 0.95, 0.6), sp: 2.5 + r() * 2.5, dirs: Array.from({ length: N }, () => { const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - u * u); return [q * Math.cos(a), u, q * Math.sin(a), 0.7 + r() * 0.3]; }) });
  const total = count * (N + 6), pos = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true }));
  pts.frustumCulled = false; parent.add(pts);
  const fw = { bursts, pos, col, geo, N }; fireworks.push(fw); return fw;
}
function updateFireworks(fw, t, period) {
  let k = 0; const { pos, col, N } = fw;
  for (const b of fw.bursts) {
    let dt = (t - b.t) % period; if (dt < 0) dt += period;
    const rise = 0.9;
    for (let i = 0; i < N + 6; i++, k++) {
      let x = 0, y = -999, z = 0, a = 0;
      if (i >= N) { if (dt < rise) { const j = i - N, d = dt - j * 0.03; if (d > 0) { x = b.x; y = b.y - 9 * (1 - d / rise); z = b.z; a = 0.7; } } }
      else if (dt >= rise && dt < rise + 2.6) { const d = dt - rise, [dx, dy, dz, sp] = b.dirs[i], v = b.sp * sp, damp = (1 - Math.exp(-2.2 * d)) / 2.2;
        x = b.x + dx * v * damp; y = b.y + dy * v * damp - 1.2 * d * d; z = b.z + dz * v * damp; a = Math.pow(1 - d / 2.6, 1.5) * (0.7 + 0.3 * Math.sin(d * 30 + i)); }
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      const c = i >= N ? [1, 0.8, 0.5] : [b.c.r, b.c.g, b.c.b]; col[k * 3] = c[0] * a; col[k * 3 + 1] = c[1] * a; col[k * 3 + 2] = c[2] * a;
    }
  }
  fw.geo.attributes.position.needsUpdate = true; fw.geo.attributes.color.needsUpdate = true;
}

// ---------- EXTERIOR: house on Diwali night
const EXT = makeSet('ext', 0);
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){ float y = vP.y; vec3 c = mix(vec3(1.,.55,.6), vec3(.55,.5,1.), smoothstep(-.02,.14,y)); c = mix(c, vec3(.15,.42,1.), smoothstep(.14,.55,y));
      vec3 q = floor(vP * 260.); float s = step(.9975, h(q)) * smoothstep(.1,.4,y); gl_FragColor = vec4(c + s * .9, 1.); }` }));
  EXT.add(sky);
  const tiles = canvasTex(512, 512, (x, w) => { x.fillStyle = '#e8789a'; x.fillRect(0, 0, w, w); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#ffd0dc' : '#ffb0c4'; x.fillRect(i * 128 + 3, j * 128 + 3, 122, 122); } }, [14, 14]);
  const ground = mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), std(0xffffff, { map: tiles, roughness: 0.55 }), 0, 0, 0, EXT); ground.castShadow = false;
  // house facade
  const wallM = std(0xfff0b8, { roughness: 0.85 }), trimM = std(0x2f7de1, { roughness: 0.6 }), woodM = std(0xe8322c, { roughness: 0.5 }), goldM = std(0xe7b542, { metalness: 0.6, roughness: 0.35 });
  box(12, 7.6, 0.5, wallM, 0, 3.8, -2.6, EXT);
  box(12.4, 0.35, 0.8, trimM, 0, 3.5, -2.3, EXT); box(12.4, 0.4, 0.9, trimM, 0, 7.6, -2.3, EXT);
  for (const x of [-5.9, 5.9]) box(0.5, 7.6, 0.8, trimM, x, 3.8, -2.3, EXT);
  // doorway (open) glowing inside
  box(2.0, 2.9, 0.2, trimM, 0, 1.45, -2.28, EXT);
  mesh(new THREE.PlaneGeometry(1.5, 2.5), new THREE.MeshBasicMaterial({ color: 0xbbbbbb, map: canvasTex(300, 500, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7d6cf7'); g.addColorStop(0.6, '#9b8fff'); g.addColorStop(1, '#ff9ec4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffd27a'; x.beginPath(); x.arc(150, 70, 26, 0, 7); x.fill(); const rg = x.createRadialGradient(150, 70, 10, 150, 70, 140); rg.addColorStop(0, 'rgba(255,210,120,.6)'); rg.addColorStop(1, 'rgba(255,210,120,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, 260);
    x.fillStyle = '#4a2410'; x.fillRect(30, 250, 240, 12); for (let i = 0; i < 5; i++) { x.fillStyle = '#ffb347'; x.beginPath(); x.arc(55 + i * 48, 240, 7, 0, 7); x.fill(); }
    x.fillStyle = '#c9952e'; x.fillRect(80, 120, 140, 100); x.fillStyle = '#2a6f97'; x.fillRect(90, 130, 120, 80); x.fillStyle = '#1c7c8c'; x.fillRect(20, 380, 260, 70); x.fillStyle = '#ffc300'; x.fillRect(40, 360, 60, 40); x.fillStyle = '#d81b60'; x.fillRect(190, 360, 60, 40); }) }), 0, 1.3, -2.17, EXT, false);
  const doorL = box(0.74, 2.45, 0.08, woodM, -0.95, 1.27, -1.85, EXT); doorL.rotation.y = 1.2;
  const doorR = box(0.74, 2.45, 0.08, woodM, 0.95, 1.27, -1.85, EXT); doorR.rotation.y = -1.2;
  for (const d of [doorL, doorR]) { box(0.6, 0.9, 0.02, goldM, 0, 0.5, 0.05, d); box(0.6, 0.6, 0.02, goldM, 0, -0.5, 0.05, d); }
  // steps
  box(3.2, 0.16, 1.0, std(0xd9c2a3), 0, 0.08, -1.8, EXT); box(2.6, 0.16, 0.7, std(0xd9c2a3), 0, 0.24, -1.95, EXT);
  // windows
  const winM = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffa040, emissiveIntensity: 0.75 });
  for (const [x, y] of [[-3.4, 1.7], [3.4, 1.7], [-3.4, 5.4], [3.4, 5.4], [0, 5.4]]) {
    box(1.6, 1.7, 0.1, winM, x, y, -2.32, EXT); box(1.9, 0.15, 0.3, trimM, x, y + 0.92, -2.2, EXT); box(1.9, 0.15, 0.35, trimM, x, y - 0.92, -2.18, EXT);
    box(0.06, 1.7, 0.14, woodM, x, y, -2.25, EXT); box(1.6, 0.06, 0.14, woodM, x, y, -2.25, EXT);
    if (y > 4) { box(2.1, 0.12, 0.7, trimM, x, y - 1.05, -1.95, EXT); for (let i = 0; i < 9; i++) box(0.04, 0.5, 0.04, goldM, x - 0.95 + i * 0.237, y - 0.75, -1.65, EXT); box(2.1, 0.05, 0.05, goldM, x, y - 0.5, -1.65, EXT); }
    stringLights(EXT, sag([x - 0.95, y + 1.05, -2.0], [x + 0.95, y + 1.05, -2.0], 0.25), 22, ['#ffd27a', '#fff2c0', '#ffb347']);
  }
  // roof-line string lights in many colours + vertical curtains
  stringLights(EXT, sag([-6, 7.3, -1.9], [6, 7.3, -1.9], 0.5, 10), 70, ['#ff3b6b', '#ffd23f', '#3bd1ff', '#7dff6a', '#ff8c2a', '#c66bff']);
  stringLights(EXT, sag([-6, 3.4, -1.9], [6, 3.4, -1.9], 0.35, 10), 64, ['#ffd27a', '#fff2c0', '#ffb347']);
  for (let i = 0; i < 12; i++) { const x = -5.5 + i * 1.0; if (Math.abs(x) < 1.3) continue; stringLights(EXT, [[x, 7.2, -1.85], [x + 0.02, 5.8 - (i % 3) * 0.3, -1.85]], 12, ['#fff2c0', '#ffd27a']); }
  // toran
  marigold(EXT, sag([-1.05, 2.95, -2.05], [1.05, 2.95, -2.05], 0.18), 30);
  for (let i = 0; i < 7; i++) { const lf = mesh(new THREE.PlaneGeometry(0.09, 0.22), std(0x2f8a2f, { side: THREE.DoubleSide }), -0.9 + i * 0.3, 2.72 - Math.sin(i / 6 * Math.PI) * 0.15, -2.03, EXT, false); lf.rotation.z = (i - 3) * 0.08; }
  for (const x of [-1.05, 1.05]) hangingStrand(EXT, x, 2.95, -2.05, 0.9);
  // rangoli
  const rang = canvasTex(1024, 1024, (x, w) => { const c = w / 2; x.translate(c, c);
    const ring = (n, r, len, wd, col, rot = 0) => { for (let i = 0; i < n; i++) { x.save(); x.rotate(i / n * Math.PI * 2 + rot); x.fillStyle = col; x.beginPath(); x.ellipse(0, -r, wd, len, 0, 0, Math.PI * 2); x.fill(); x.restore(); } };
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(0, 0, 500, 0, 7); x.fill(); x.fillStyle = '#d0105a'; x.beginPath(); x.arc(0, 0, 488, 0, 7); x.fill();
    ring(24, 420, 70, 34, '#ffc300'); ring(24, 420, 46, 18, '#ff6a00', Math.PI / 24); ring(16, 320, 70, 40, '#18b7c9'); ring(16, 320, 44, 20, '#ffffff');
    ring(12, 220, 60, 36, '#7ac943', Math.PI / 12); ring(12, 220, 34, 16, '#ffe14d', Math.PI / 12); ring(8, 120, 60, 34, '#8e3bd6'); x.fillStyle = '#ffc300'; x.beginPath(); x.arc(0, 0, 60, 0, 7); x.fill();
    x.fillStyle = '#fff'; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * 470, Math.sin(a) * 470, 9, 0, 7); x.fill(); } });
  const rg = mesh(new THREE.CircleGeometry(1.0, 48).rotateX(-Math.PI / 2), std(0xffffff, { map: rang, roughness: 0.9 }), 0, 0.012, -0.55, EXT, false); rg.receiveShadow = true;
  // diyas: steps, rangoli ring, boundary walls
  for (let i = 0; i < 7; i++) diya(EXT, -1.35 + i * 0.45, 0.16, -1.36);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; diya(EXT, Math.cos(a) * 1.12, 0.0, -0.55 + Math.sin(a) * 1.12); }
  const wallLow = std(0xff7eb3);
  for (const s of [-1, 1]) { box(3.6, 0.8, 0.35, wallLow, s * 4.2, 0.4, -0.6, EXT); box(3.7, 0.08, 0.42, trimM, s * 4.2, 0.82, -0.6, EXT); for (let i = 0; i < 7; i++) diya(EXT, s * (2.6 + i * 0.52), 0.86, -0.6); }
  // potted plants
  for (const s of [-1, 1]) { cyl(0.28, 0.2, 0.5, std(0xb5532a), s * 1.7, 0.25, -1.7, EXT); mesh(new THREE.SphereGeometry(0.42, 14, 10), std(0x2e7d32, { roughness: 0.9 }), s * 1.7, 0.85, -1.7, EXT).scale.set(1, 1.2, 1); }
  bunting(EXT, [-6, 6.3, -1.7], [6, 6.3, -1.7], 34, 0.5); bunting(EXT, [-5.5, 3.2, -1.4], [-1.3, 3.2, -1.4], 12, 0.3); bunting(EXT, [1.3, 3.2, -1.4], [5.5, 3.2, -1.4], 12, 0.3);
  lantern(EXT, -1.6, 2.6, -1.6, 0xff4d6d); lantern(EXT, 1.6, 2.6, -1.6, 0xffb000); lantern(EXT, -4.5, 6.4, -1.5, 0x3bd1ff); lantern(EXT, 4.5, 6.4, -1.5, 0xc66bff);
  // neighbours' houses in the distance with lights
  const r = RNG(4);
  for (let i = 0; i < 10; i++) { const x = -26 + i * 5.6 + r() * 2, h = 4 + r() * 6, z = -14 - r() * 6; box(4.5, h, 3, std(['#ff6b9a', '#4fc3f7', '#ffd23f', '#7ee06a', '#b388ff', '#ff8a65'][i % 6]), x, h / 2, z, EXT);
    stringLights(EXT, sag([x - 2.2, h - 0.1, z + 1.55], [x + 2.2, h - 0.1, z + 1.55], 0.3, 8), 20, ['#ffd27a', '#ff3b6b', '#3bd1ff', '#7dff6a']);
    for (let k = 0; k < 4; k++) box(0.7, 0.8, 0.05, winM, x - 1.5 + k * 1.0, h * 0.55, z + 1.52, EXT); }
  // lights
  EXT.add(new THREE.HemisphereLight(0xeef3ff, 0xb08ab0, 1.9));
  const moon = new THREE.DirectionalLight(0xfff0e0, 1.6); moon.position.set(-8, 14, 10); EXT.add(moon);
  const key = new THREE.SpotLight(0xffc27a, 10, 30, 0.7, 0.6, 1.4); key.position.set(3, 6, 6); key.target.position.set(0, 1, -1); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); EXT.add(key, key.target);
  const doorLight = new THREE.PointLight(0xffc27a, 2.5, 9, 1.5); doorLight.position.set(0, 2.2, -1.2); EXT.add(doorLight);
  for (const s of [-1, 1]) { const p = new THREE.PointLight(0xff8a2a, 1.6, 5, 1.6); p.position.set(s * 4, 1.2, 0); EXT.add(p); }
  fireworkSystem(EXT, [-16, 16, 11, 20, -30, -20], 7, 14, 0, 6);
}

// ---------- INTERIOR: festive living room
const INT = makeSet('int', 100);
{
  const floorT = canvasTex(512, 512, (x, w) => { x.fillStyle = '#f0b860'; x.fillRect(0, 0, w, w); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const g = x.createLinearGradient(i * 256, j * 256, i * 256 + 256, j * 256 + 256); g.addColorStop(0, (i + j) % 2 ? '#fff4d6' : '#ffe08a'); g.addColorStop(1, (i + j) % 2 ? '#ffe9b8' : '#ffd166'); x.fillStyle = g; x.fillRect(i * 256 + 2, j * 256 + 2, 252, 252); } }, [8, 8]);
  mesh(new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), std(0xffffff, { map: floorT, roughness: 0.28, metalness: 0.05 }), 0, 0, 0, INT).castShadow = false;
  const wallT = canvasTex(512, 512, (x, w) => { x.fillStyle = '#7d6cf7'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 6;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 128 + 64 + (j % 2) * 64, cy = j * 128 + 64; x.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; x.ellipse(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 22, 9, a, 0, 7); } x.stroke(); } }, [4, 2]);
  box(12, 6, 0.2, std(0xffffff, { map: wallT, roughness: 0.9 }), 0, 3, -3, INT);
  box(0.2, 6, 10, std(0x9b8fff, { roughness: 0.9 }), -5.5, 3, 2, INT); box(0.2, 6, 10, std(0x9b8fff, { roughness: 0.9 }), 5.5, 3, 2, INT);
  box(12, 0.25, 0.3, std(0xffffff), 0, 0.12, -2.86, INT);
  // window on the back wall (night outside, string lights)
  mesh(new THREE.PlaneGeometry(2.2, 1.9), glowM(0x3a5cff), -3.2, 2.6, -2.88, INT, false);
  for (let i = 0; i < 18; i++) glow(['#ffd27a', '#ff3b6b', '#3bd1ff'][i % 3], 0.18, -4.2 + i * 0.12, 3.3 - Math.sin(i / 17 * Math.PI) * 0.2, -2.87, INT, 0.9);
  for (let i = 0; i < 5; i++) glow(0xffc070, 0.25, -4 + i * 0.4, 1.95 + (i % 2) * 0.3, -2.87, INT, 0.6);
  box(2.4, 0.1, 0.2, std(0xff5722), -3.2, 1.6, -2.8, INT); box(2.4, 0.1, 0.12, std(0xff5722), -3.2, 3.6, -2.82, INT);
  for (const x of [-4.55, -1.85]) { const cur = box(0.5, 2.6, 0.08, std(0xc2185b, { roughness: 0.95 }), x, 2.4, -2.75, INT); }
  // framed art + shelf with diyas + toran across wall
  for (const [x, w, h, c] of [[0.6, 1.3, 0.9, '#2a6f97'], [2.4, 0.8, 1.1, '#9c27b0']]) {
    box(w + 0.12, h + 0.12, 0.05, std(0xc9952e, { metalness: 0.5, roughness: 0.4 }), x, 3.4, -2.88, INT);
    mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, { map: canvasTex(256, 256, (g, s) => { const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, c); gr.addColorStop(1, '#ffd23f'); g.fillStyle = gr; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.22, 0, 7); g.fill(); }) }), x, 3.4, -2.85, INT, false);
  }
  box(3.4, 0.08, 0.32, std(0xff5722), 1.4, 2.35, -2.75, INT); for (let i = 0; i < 7; i++) diya(INT, 0 + i * 0.46, 2.39, -2.72);
  marigold(INT, sag([-5.4, 5.6, -2.85], [5.4, 5.6, -2.85], 0.45, 8), 80); for (let i = 0; i < 11; i++) hangingStrand(INT, -5 + i * 1.0, 5.55 - Math.sin(i / 10 * Math.PI) * 0.45, -2.82, 0.6 + (i % 2) * 0.3);
  stringLights(INT, sag([-5.4, 5.3, -2.8], [5.4, 5.3, -2.8], 0.4, 10), 60, ['#ffd27a', '#fff2c0', '#ffb347', '#ff6b9a']);
  bunting(INT, [-5.4, 4.9, -2.7], [5.4, 4.9, -2.7], 30, 0.45);
  lantern(INT, -4.6, 4.2, -2.2, 0xff4d6d); lantern(INT, 4.6, 4.2, -2.2, 0x3bc9ff); lantern(INT, 0.4, 4.5, -2.4, 0xffb000);
  // sofa
  const sofaM = std(0x00c8d8, { roughness: 0.85 }), cushM = [std(0xffc300), std(0xd81b60), std(0xff7043)];
  box(3.2, 0.45, 0.95, sofaM, 2.6, 0.42, -2.25, INT); box(3.2, 0.75, 0.25, sofaM, 2.6, 0.95, -2.68, INT); for (const s of [-1, 1]) box(0.25, 0.65, 0.95, sofaM, 2.6 + s * 1.48, 0.62, -2.25, INT);
  for (let i = 0; i < 3; i++) { const c = box(0.5, 0.45, 0.15, cushM[i], 1.7 + i * 0.9, 0.9, -2.48, INT); c.rotation.z = (i - 1) * 0.12; }
  // side table + lamp
  cyl(0.3, 0.3, 0.6, std(0xff9800), -1.6, 0.3, -2.4, INT); const lamp = cyl(0.25, 0.35, 0.4, new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffb860, emissiveIntensity: 1.4 }), -1.6, 1.25, -2.4, INT); cyl(0.03, 0.03, 0.5, std(0xc9952e), -1.6, 0.85, -2.4, INT);
  glow(0xffb860, 1.4, -1.6, 1.25, -2.35, INT, 0.3);
  // rug + coffee table with sweets
  const rugT = canvasTex(512, 320, (x, w, h) => { x.fillStyle = '#ff3d7f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffe14d'; x.lineWidth = 14; x.strokeRect(20, 20, w - 40, h - 40); x.strokeStyle = '#18b7c9'; x.lineWidth = 6; x.strokeRect(46, 46, w - 92, h - 92);
    x.fillStyle = '#ffc300'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(w / 2, h / 2, 110 - i * 16, 0, 7); x.fillStyle = ['#ffc300', '#d81b60', '#18b7c9', '#ff7043', '#ffffff', '#7ac943'][i]; x.fill(); } });
  mesh(new THREE.PlaneGeometry(4.4, 2.8).rotateX(-Math.PI / 2), std(0xffffff, { map: rugT, roughness: 1 }), 0.6, 0.01, -0.9, INT, false);
  box(1.4, 0.06, 0.7, std(0xffd23f, { roughness: 0.4 }), 2.6, 0.45, -1.4, INT); for (const [x, z] of [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]]) box(0.06, 0.42, 0.06, std(0x4a2a14), 2.6 + x, 0.21, -1.4 + z, INT);
  box(0.36, 0.14, 0.26, std(0xe8336d), 2.35, 0.55, -1.45, INT); for (let i = 0; i < 3; i++) diya(INT, 2.75 + i * 0.16, 0.48, -1.3, 0.8);
  // plant
  cyl(0.25, 0.2, 0.55, std(0xd9c2a3), -4.6, 0.28, -2.3, INT); for (let i = 0; i < 7; i++) { const l = mesh(new THREE.SphereGeometry(0.22, 10, 8), std(0x2e7d32, { roughness: 0.9 }), -4.6 + Math.cos(i) * 0.25, 0.85 + i * 0.12, -2.3 + Math.sin(i) * 0.2, INT); l.scale.set(0.6, 1.4, 0.6); }
  // lights
  INT.add(new THREE.HemisphereLight(0xfff6ee, 0xc09a9a, 1.9)); { const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(-3, 6, 6); INT.add(d); }
  const key = new THREE.SpotLight(0xfff0dd, 8, 25, 0.75, 0.7, 1.3); key.position.set(-2, 5.5, 5); key.target.position.set(0.5, 1, -1.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); INT.add(key, key.target);
  const lampL = new THREE.PointLight(0xffb060, 3, 7, 1.5); lampL.position.set(-1.6, 1.4, -2.0); INT.add(lampL);
  const shelfL = new THREE.PointLight(0xff9a3a, 2, 5, 1.5); shelfL.position.set(1.4, 2.7, -2.3); INT.add(shelfL);
}

// ---------- NETWORK: glowing business network
const NET = makeSet('net', 200);
const netNodes = [], netEdges = [], netPills = [];
{
  const bg = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vP; void main(){ float y = vP.y * .5 + .5; vec3 c = mix(vec3(.05,.02,.2), vec3(.32,.05,.42), y); c += vec3(.0,.25,.45) * pow(max(0., -vP.z), 4.) * .5; gl_FragColor = vec4(c, 1.); }` }));
  NET.add(bg);
  const r = RNG(11), dust = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) dust.set([(r() - 0.5) * 40, (r() - 0.5) * 30, -r() * 40 + 5], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  NET.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.12, map: glowTex, color: 0x9ad8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
  // professions: [title, kurta/top colour, skin, female?]
  const PROF = [['दुकानदार', '#e53935', '#b97a52', 0], ['डॉक्टर', '#ffffff', '#c68e68', 1], ['IT', '#3949ab', '#a8714c', 0], ['डिज़ाइनर', '#8e24aa', '#c98c66', 1], ['बिल्डर', '#f9a825', '#9a6440', 0],
    ['CA', '#00897b', '#bf8560', 0], ['बेकरी', '#ff7043', '#c48a62', 1], ['टीचर', '#43a047', '#b77b55', 1], ['फ़ैक्टरी', '#546e7a', '#a46c47', 0], ['ब्यूटी', '#d81b60', '#cf9470', 1], ['ट्रैवल', '#039be5', '#b0764e', 0], ['फ़ैशन', '#fb8c00', '#c8906a', 1]];
  const nodeTex = (p, i) => canvasTex(512, 600, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, ['#4fc3f7', '#ffb74d', '#ba68c8', '#81c784'][i % 4]); g.addColorStop(1, '#1a237e');
    x.save(); x.beginPath(); x.arc(256, 256, 240, 0, 7); x.fillStyle = g; x.fill(); x.clip();
    const spec = { ...(p[3] ? SPECS.W : (i % 2 ? SPECS.R : SPECS.J)), skin: p[2] };
    if (p[3]) { spec.saree = p[1]; spec.sareeDark = p[1]; } else { spec.kurta = p[1]; spec.jacket = null; spec.placket = '#f4c64a'; spec.moustache = i % 3 === 0; spec.stubble = i % 3 === 1; }
    const st = defaultState(); st.smile = 0.9; st.yaw = (i % 3 - 1) * 0.25;
    x.translate(256, 256); x.scale(0.62, 0.62); x.translate(-CW / 2, -(CH - 30) + spec.H * 0.86); drawPerson(x, spec, st, 0); x.restore();
    x.lineWidth = 16; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(256, 256, 240, 0, 7); x.stroke();
    x.fillStyle = '#ffd23f'; rr(x, 96, 500, 320, 84, 42); x.fill(); x.fillStyle = '#1a1030'; x.font = '700 50px Pop'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(p[0], 256, 544);
  });
  const pos = [];
  PROF.forEach((p, i) => { const a = i / PROF.length * Math.PI * 2 + 0.3, ring = i % 2 ? 4.2 : 3.0; pos.push(new THREE.Vector3(Math.cos(a) * ring, Math.sin(a) * ring * 1.35 + 0.2, -2 - (i % 3) * 1.2)); });
  pos.forEach((p, i) => { const m = mesh(new THREE.PlaneGeometry(1.25, 1.46), new THREE.MeshBasicMaterial({ map: nodeTex(PROF[i], i), transparent: true, alphaTest: 0.5, toneMapped: false }), p.x, p.y, p.z, NET, false);
    const gl = glow(0x6ad7ff, 2.4, p.x, p.y, p.z - 0.05, NET, 0.35); netNodes.push({ m, gl, p, i }); });
  // centre: logo node
  const ct = canvasTex(600, 600, (x) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(300, 300, 290, 0, 7); x.fill(); x.drawImage(LOGO, 300 - 220, 300 - 220 * LOGO.height / LOGO.width - 40, 440, 440 * LOGO.height / LOGO.width); });
  const center = mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: ct, color: 0xd0d0d0, transparent: true, alphaTest: 0.5, toneMapped: false }), 0, 0.2, -1, NET, false);
  glow(0x6ad7ff, 3.2, 0, 0.2, -1.1, NET, 0.18); netNodes.center = center;
  // edges: centre to all + ring neighbours + some chords
  const edgeList = []; pos.forEach((p, i) => { edgeList.push([null, i]); edgeList.push([i, (i + 1) % pos.length]); if (i % 3 === 0) edgeList.push([i, (i + 5) % pos.length]); });
  for (const [a, b] of edgeList) {
    const A = a === null ? new THREE.Vector3(0, 0.2, -1) : pos[a], Bv = pos[b];
    const curve = new THREE.QuadraticBezierCurve3(A, A.clone().add(Bv).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 0.8)), Bv);
    const tube = mesh(new THREE.TubeGeometry(curve, 24, 0.022, 5), new THREE.MeshBasicMaterial({ color: 0x4fd3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, 0, 0, NET, false);
    const pulse = glow(0xffffff, 0.45, 0, 0, 0, NET, 0); netEdges.push({ tube, curve, pulse, a, b, ph: r() });
  }
  // growth: rising golden arrow + bars
  const arrowShape = new THREE.Shape(); arrowShape.moveTo(-0.12, 0); arrowShape.lineTo(0.12, 0); arrowShape.lineTo(0.12, 2.4); arrowShape.lineTo(0.35, 2.4); arrowShape.lineTo(0, 3.0); arrowShape.lineTo(-0.35, 2.4); arrowShape.lineTo(-0.12, 2.4); arrowShape.closePath();
  const arrow = mesh(new THREE.ExtrudeGeometry(arrowShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0xff9a00, emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.3 }), 0, -2.6, 0.6, NET, false);
  arrow.rotation.z = -0.5; arrow.position.set(1.6, -2.6, -0.5); NET.userData.arrow = arrow;
  const bars = []; for (let i = 0; i < 5; i++) { const b = mesh(new THREE.BoxGeometry(0.42, 1, 0.42), new THREE.MeshStandardMaterial({ color: 0x2ee59d, emissive: 0x0f9d58, emissiveIntensity: 0.9, roughness: 0.4 }), -1.6 + i * 0.6, -2.6, 0.3, NET, false); bars.push(b); } NET.userData.bars = bars;
  NET.add(new THREE.AmbientLight(0xffffff, 0.8)); const pl = new THREE.PointLight(0xffffff, 20, 20); pl.position.set(0, 2, 5); NET.add(pl);
}

// ---------- FINALE background: bokeh + diyas row
const FIN = makeSet('fin', 300);
const finBokeh = [];
{
  const bg = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vP; void main(){ float y = vP.y * .5 + .5; vec3 c = mix(vec3(.55,.08,.32), vec3(.07,.12,.42), smoothstep(.3,.75,y)); c = mix(vec3(.95,.45,.12), c, smoothstep(.15,.42,y)); gl_FragColor = vec4(c, 1.); }` }));
  FIN.add(bg);
  const r = RNG(21); for (let i = 0; i < 70; i++) finBokeh.push({ s: glow(['#ffd27a', '#ff6b9a', '#6ad7ff', '#fff2c0', '#ffb347'][i % 5], 0.4 + r() * 1.3, (r() - 0.5) * 9, (r() - 0.5) * 16, -3 - r() * 8, FIN, 0.35 + r() * 0.35), y0: 0, sp: 0.1 + r() * 0.3, ph: r() * 6 });
  for (let i = 0; i < 9; i++) diya(FIN, -2.4 + i * 0.6, -3.55, -1.5, 1.7);
  FIN.add(new THREE.AmbientLight(0xffffff, 1.0));
}

// ---------------------------------------------------------------- holo cards (graphics floating in 3D)
const cards = [];
function card(set, w, h, draw, opts = {}) {
  const tex = canvasTex(Math.round(w * 400), Math.round(h * 400), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xd8d8d8, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  m.renderOrder = 10; m.layers.set(UI); SETS[set].add(m); m.visible = false; const c = { m, ...opts }; cards.push(c); return c;
}
const pillDraw = (txt, bg = '#ffd23f', fg = '#1a1030', icon = null) => (x, w, h) => { x.fillStyle = 'rgba(0,0,0,.25)'; rr(x, 8, 14, w - 16, h - 20, (h - 20) / 2); x.fill();
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bg); g.addColorStop(1, shadeHex(bg, 0.82)); x.fillStyle = g; rr(x, 4, 4, w - 16, h - 20, (h - 20) / 2); x.fill();
  x.fillStyle = fg; x.font = `700 ${Math.round(h * 0.38)}px Pop`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((icon ? icon + '  ' : '') + txt, w / 2 - 6, h / 2 - 6); };
function shadeHex(c, k) { const n = parseInt(c.slice(1), 16); const f = v => Math.round(clamp(v * k, 0, 255)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
const holo = (x, w, h, hue = '#38d7ff') => { x.fillStyle = 'rgba(10,20,50,.78)'; rr(x, 6, 6, w - 12, h - 12, 36); x.fill(); x.lineWidth = 8; x.strokeStyle = hue; rr(x, 6, 6, w - 12, h - 12, 36); x.stroke(); };
// S2 problem graphics (living room, near Raj)
const L = TL.lines;
const C_MONEY = card('int', 1.5, 0.8, (x, w, h) => { holo(x, w, h, '#ffd23f'); x.fillStyle = '#ffd23f'; x.font = '800 150px Pop'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('₹50,000', w / 2, h * 0.42); x.fillStyle = '#fff'; x.font = '600 66px Pop'; x.fillText('हर महीने मार्केटिंग', w / 2, h * 0.78); });
const C_ADS = card('int', 1.2, 0.8, (x, w, h) => { holo(x, w, h, '#ff6b9a'); x.font = '700 64px Pop'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('विज्ञापन', w / 2, 110);
  x.fillStyle = '#ff6b9a'; x.beginPath(); x.moveTo(110, 200); x.lineTo(200, 170); x.lineTo(200, 290); x.lineTo(110, 260); x.closePath(); x.fill(); x.fillRect(80, 200, 34, 60); x.beginPath(); x.moveTo(200, 170); x.lineTo(320, 120); x.lineTo(320, 340); x.lineTo(200, 290); x.fill();
  for (let i = 0; i < 3; i++) { x.strokeStyle = '#ffd23f'; x.lineWidth = 10; x.beginPath(); x.arc(330, 230, 40 + i * 30, -0.6, 0.6); x.stroke(); }
  for (let i = 0; i < 3; i++) { x.fillStyle = ['#3bd1ff', '#ffd23f', '#7dff6a'][i]; rr(x, 300 + i * 0, 0, 0, 0, 0); } });
const C_DOWN = card('int', 1.5, 1.0, (x, w, h) => { holo(x, w, h, '#ff5252'); x.font = '700 60px Pop'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('बिजनेस ग्रोथ', w / 2, 92);
  const bars = [0.8, 0.65, 0.7, 0.45, 0.3]; bars.forEach((b, i) => { x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(90 + i * 85, 340 - b * 200, 60, b * 200); });
  x.strokeStyle = '#ff5252'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(100, 160); x.lineTo(260, 240); x.lineTo(330, 210); x.lineTo(470, 330); x.stroke();
  x.fillStyle = '#ff5252'; x.beginPath(); x.moveTo(500, 355); x.lineTo(430, 345); x.lineTo(485, 290); x.closePath(); x.fill(); });
const C_REACH = card('int', 1.6, 0.95, (x, w, h) => { holo(x, w, h, '#ffb74d'); x.font = '700 54px Pop'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('सही लोग?  भरोसेमंद कनेक्शन?', w / 2, 86);
  const P = [[140, 250], [320, 200], [500, 260]]; x.setLineDash([16, 14]); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 7; x.beginPath(); x.moveTo(140, 250); x.lineTo(320, 200); x.lineTo(500, 260); x.stroke(); x.setLineDash([]);
  P.forEach(([px, py], i) => { x.fillStyle = ['#4fc3f7', '#ffd23f', '#ba68c8'][i]; x.beginPath(); x.arc(px, py - 22, 26, 0, 7); x.fill(); x.beginPath(); x.ellipse(px, py + 34, 40, 30, 0, Math.PI, 0); x.fill(); });
  x.fillStyle = '#ff5252'; x.font = '800 70px Pop'; x.fillText('✕', 230, 245); x.fillText('✕', 410, 250); });
const C_CITY = card('int', 1.6, 1.0, (x, w, h) => { holo(x, w, h, '#b388ff'); x.font = '700 56px Pop'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('नया शहर', w / 2, 84);
  const r = RNG(3); for (let i = 0; i < 12; i++) { const bw = 36 + r() * 30, bh = 60 + r() * 150, bx = 50 + i * 45; x.fillStyle = `rgba(179,136,255,${0.45 + r() * 0.4})`; x.fillRect(bx, 360 - bh, bw, bh); }
  x.fillStyle = '#ffd23f'; x.font = '800 120px Pop'; x.fillText('?', 200, 250); x.fillText('?', 470, 220); x.fillStyle = '#fff'; x.font = '600 40px Pop'; x.fillText('न पहचान • न नेटवर्क', w / 2, 330); });
// S3 network labels
const NETP = [['उद्यमी', '#ffd23f'], ['नए कनेक्शन', '#4fc3f7'], ['एक-दूसरे से सीखना', '#81c784'], ['नए अवसर', '#ff8a65']].map(([t, c], i) => card('net', 1.9, 0.5, pillDraw(t, c), { i }));
const C_GROW = card('net', 3.6, 0.62, pillDraw('तरक्की के रास्ते खुलते हैं!', '#2ee59d'));
// logo reveal (living room)
const C_LOGO = card('int', 2.0, 2.0, (x, w, h) => { x.fillStyle = '#ffffff'; rr(x, 20, 20, w - 40, h - 40, 120); x.fill(); x.lineWidth = 18; x.strokeStyle = '#ffd23f'; rr(x, 20, 20, w - 40, h - 40, 120); x.stroke();
  const lw = w * 0.8, lh = lw * LOGO.height / LOGO.width; x.drawImage(LOGO, (w - lw) / 2, (h - lh) / 2, lw, lh); });
const rays = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (x, w) => { x.translate(w / 2, w / 2); for (let i = 0; i < 24; i++) { x.rotate(Math.PI * 2 / 24); const g = x.createLinearGradient(0, 0, 0, -w / 2); g.addColorStop(0, 'rgba(255,230,140,.9)'); g.addColorStop(1, 'rgba(255,230,140,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(-14, 0); x.lineTo(14, 0); x.lineTo(40, -w / 2); x.lineTo(-40, -w / 2); x.fill(); } }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
rays.renderOrder = 9; rays.layers.set(UI); INT.add(rays); rays.visible = false;
// confetti
const confetti = (() => { const N = 500, r = RNG(5), im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), N); const data = [];
  const cols = ['#ffd23f', '#ff3b6b', '#3bd1ff', '#7dff6a', '#ff8c2a', '#c66bff', '#ffffff']; const c = new THREE.Color();
  for (let i = 0; i < N; i++) { data.push({ v: new THREE.Vector3((r() - 0.5) * 6, 2 + r() * 4, (r() - 0.5) * 2), w: new THREE.Vector3(r() * 8, r() * 8, r() * 8), d: r() * 0.4 }); im.setColorAt(i, c.set(cols[i % cols.length])); }
  im.frustumCulled = false; im.visible = false; im.layers.set(UI); scene.add(im); return { im, data, N }; })();
function updateConfetti(t, t0, origin) {
  const { im, data, N } = confetti, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const dt = t - t0; im.visible = dt > 0 && dt < 4.5; if (!im.visible) return;
  data.forEach((d, i) => { const k = Math.max(0, dt - d.d), damp = (1 - Math.exp(-1.6 * k)) / 1.6;
    p.set(origin.x + d.v.x * damp, origin.y + d.v.y * damp - 1.6 * k * k * 0.5 + Math.sin(k * 3 + i) * 0.05, origin.z + d.v.z * damp); e.set(d.w.x * k, d.w.y * k, d.w.z * k); q.setFromEuler(e);
    m4.compose(p, q, s); im.setMatrixAt(i, m4); });
  im.instanceMatrix.needsUpdate = true;
}
// S4: calendar card + benefit pills (exterior)
const C_CAL = card('ext', 1.5, 1.7, (x, w, h) => { x.fillStyle = 'rgba(0,0,0,.3)'; rr(x, 22, 30, w - 36, h - 40, 50); x.fill(); x.fillStyle = '#ffffff'; rr(x, 12, 12, w - 36, h - 40, 50); x.fill();
  x.fillStyle = '#e53935'; rr(x, 12, 12, w - 36, 190, 50); x.fill(); x.fillRect(12, 120, w - 36, 82);
  x.fillStyle = '#fff'; x.font = '800 92px Pop'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NOVEMBER', w / 2 - 12, 112);
  x.fillStyle = '#1a1030'; x.font = '800 330px Pop'; x.fillText('21', w / 2 - 12, 400);
  x.fillStyle = '#325f97'; x.font = '800 60px Pop'; x.fillText('MEGA VISITOR DAY', w / 2 - 12, 580);
  for (const cx of [140, w - 176]) { x.fillStyle = '#9e9e9e'; x.beginPath(); x.arc(cx, 30, 22, 0, 7); x.fill(); } });
const BEN = [['नए लोग', '#ffd23f', '🤝'], ['बिजनेस आइडियाज', '#4fc3f7', '💡'], ['मजबूत कनेक्शन', '#81c784', '🔗'], ['नया नजरिया', '#ff8a65', '🚀']].map(([t, c], i) => card('ext', 1.7, 0.46, pillDraw(t, c), { i }));

// ---------------------------------------------------------------- characters (canvas billboards)
const PX2M = 1.72 / 1500;
const chars = {};
for (const k of ['J', 'R', 'W']) {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const w = CW * PX2M, h = CH * PX2M;
  const geo = new THREE.PlaneGeometry(w, h).translate(0, h / 2 - 30 * PX2M, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, toneMapped: false });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 5;
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
  sh.scale.set(1, 1, 0.45);
  const g = new THREE.Group(); g.add(m, sh); scene.add(g); g.visible = false;
  chars[k] = { k, cv, ctx, tex, m, g, sh, st: defaultState() };
}
function placeChar(c, set, x, z, st, tint = 1) {
  c.g.visible = true; SETS[set].add(c.g); c.g.position.set(x, 0, z);
  const cam = camera.position.clone(); SETS[set].worldToLocal(cam); c.m.rotation.y = Math.atan2(cam.x - x, cam.z - z);
  c.ctx.clearRect(0, 0, CW, CH); drawPerson(c.ctx, SPECS[c.k], st, NOW); c.tex.needsUpdate = true;
  tint = 1;
  if (Array.isArray(tint)) c.m.material.color.setRGB(...tint); else c.m.material.color.setScalar(tint);
}

// ---------------------------------------------------------------- direction
const SC = TL.scenes;
const lineAt = (t, who) => L.find(l => t >= l.start && t < l.end && (who ? l.who.includes(who) : true));
function mouthOf(k, t) { const l = lineAt(t, k); if (!l) return 0; const i = Math.floor((t - l.start) * FPS), e = l.env;
  const v = ((e[i - 1] ?? 0) + 2 * (e[i] ?? 0) + (e[i + 1] ?? 0)) / 4; return clamp((v - 0.12) * 1.25, 0, 1); }
function blink(k, t) { const p = { J: 0.3, R: 1.7, W: 2.9 }[k], period = 3.3 + p * 0.4, x = ((t + p) % period); return x < 0.13 ? Math.abs(x - 0.065) / 0.065 : 1; }
const ARM = { relax: [0.1, 0.18, 'relax'], chest: [0.22, 1.95, 'open'], present: [0.4, -0.85, 'open'], up: [0.32, 2.75, 'point'], hold: [0.12, 1.55, 'hold'], worry: [0.42, 3.05, 'open'],
  cheer: [2.55, 0.25, 'fist'], thumb: [0.28, 2.0, 'thumb'], wave: [1.3, 1.5, 'open'], hip: [0.55, -1.2, 'fist'], explain: [0.4, 1.6, 'open'], shrug: [0.3, -1.25, 'open'] };
function armMix(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), k < 0.5 ? a[2] : b[2]]; }
// gesture sequences while speaking (per line index) -> list of [armR, armL]
function talkArms(k, t, seq) { const l = lineAt(t, k); if (!l || !seq) return null; const d = t - l.start, n = seq.length, per = Math.max(1.3, (l.end - l.start) / n), i = Math.min(n - 1, Math.floor(d / per)), f = ss(0, 0.35, d - i * per);
  const prev = seq[Math.max(0, i - 1)], cur = seq[i]; return [armMix(ARM[i ? prev[0] : 'relax'], ARM[cur[0]], i || d > 0.35 ? f : f), armMix(ARM[i ? prev[1] : 'relax'], ARM[cur[1]], f)]; }

function charState(k, t, o = {}) {
  const st = defaultState(), sp = lineAt(t, k);
  st.breathe = Math.sin(t * 2.1 + k.charCodeAt(0)); st.tilt = Math.sin(t * 0.9 + k.charCodeAt(0)) * 0.02 + (sp ? Math.sin(t * 3.1) * 0.025 : 0);
  st.mouth = mouthOf(k, t); st.open = blink(k, t); st.smile = o.smile ?? 0.3; st.brow = o.brow ?? 0; st.yaw = o.yaw ?? 0; st.lookX = o.lookX ?? st.yaw * 0.6;
  st.armR = o.armR ? ARM[o.armR] : ARM.relax; st.armL = o.armL ? ARM[o.armL] : ARM.relax; st.prop = o.prop ?? null; st.walk = o.walk ?? -1; st.lean = o.lean ?? 0; st.shoulderUp = o.shoulderUp ?? 0;
  if (sp && o.talk) { const a = talkArms(k, t, o.talk); if (a) { st.armR = a[0]; st.armL = a[1]; } }
  if (o.armBlend) { st.armR = armMix(st.armR, ARM[o.armBlend[0]], o.armBlend[2]); st.armL = armMix(st.armL, ARM[o.armBlend[1]], o.armBlend[2]); }
  st.armR = st.armR.slice(); st.armL = st.armL.slice();
  // small arm sway while idle
  st.armR[0] += Math.sin(t * 1.3 + 1) * 0.02; st.armL[0] += Math.sin(t * 1.2) * 0.02;
  return st;
}

// camera keys: [time, [px,py,pz], [tx,ty,tz], fov, cut?]  (positions local to the set)
function camPath(keys, t) {
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)];
  if (b[4] || a === b) { const k = a === b ? 0 : 0; return [a[1], a[2], a[3]]; }
  const k = ss(a[0], b[0], t);
  return [a[1].map((v, j) => lerp(v, b[1][j], k)), a[2].map((v, j) => lerp(v, b[2][j], k)), lerp(a[3], b[3], k)];
}
function setCam(set, pos, tgt, fov) { const o = SETS[set].position; camera.position.set(o.x + pos[0], o.y + pos[1], o.z + pos[2]); camera.lookAt(o.x + tgt[0], o.y + tgt[1], o.z + tgt[2]); camera.fov = fov; camera.updateProjectionMatrix(); }

const elWM = document.getElementById('wm'), elCap = document.getElementById('cap'), elFin = document.getElementById('fin'), elFade = document.getElementById('fade');
const WHO = { J: ['जीतू भैया', '#ffd23f'], R: ['राज', '#4fc3f7'], W: ['राज की पत्नी', '#ff8ab3'], JRW: ['तीनों', '#b9f6ca'], N: ['', ''] };
function chunkCaption(l, t) {
  const words = l.text.split(' '), chunks = []; let cur = '';
  for (const w of words) { if (cur && (cur + ' ' + w).length > 34) { chunks.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) chunks.push(cur);
  const pairs = []; for (let i = 0; i < chunks.length; i += 2) pairs.push(chunks.slice(i, i + 2).join('<br>'));
  const tot = pairs.reduce((s, p) => s + p.length, 0); let acc = l.start;
  for (const p of pairs) { const d = (l.end - l.start) * p.length / tot; if (t < acc + d + 0.05) return p; acc += d; }
  return pairs[pairs.length - 1];
}

function showCard(c, set, x, y, z, t0, t1, t, opts = {}) {
  const on = t >= t0 - 0.01 && t < t1 + 0.4; c.m.visible = on; if (!on) return;
  const kIn = easeOutBack(clamp((t - t0) / 0.45, 0, 1)), kOut = 1 - ss(t1, t1 + 0.35, t);
  const s = Math.max(0.001, kIn * kOut) * (opts.scale ?? 1);
  c.m.scale.setScalar(s); c.m.position.set(x, y + Math.sin((t - t0) * 2) * 0.04, z);
  c.m.lookAt(camera.position);
  if (opts.flip) c.m.rotation.y += (1 - ss(t0, t0 + 0.6, t)) * Math.PI;
}

// screen-anchored card: u,v in [-1,1] (screen coords), wf = fraction of screen width, dist from camera
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
function showUI(c, set, u, v, wf, t0, t1, t, opts = {}) {
  const on = t >= t0 - 0.01 && t < t1 + 0.4; c.m.visible = on; if (!on) return;
  const kIn = easeOutBack(clamp((t - t0) / 0.45, 0, 1)), kOut = 1 - ss(t1, t1 + 0.35, t);
  const dist = opts.dist ?? 1.6, hh = dist * Math.tan(camera.fov * Math.PI / 360), hw = hh * camera.aspect;
  camera.getWorldDirection(_f); _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
  const p = camera.position.clone().addScaledVector(_f, dist).addScaledVector(_r, u * hw).addScaledVector(_u, (v + Math.sin((t - t0) * 2) * 0.008) * hh);
  SETS[set].worldToLocal(p); c.m.position.copy(p); c.m.quaternion.copy(camera.quaternion);
  const w = c.m.geometry.parameters.width; c.m.scale.setScalar(Math.max(0.001, kIn * kOut) * wf * 2 * hw / w);
  if (opts.flip) c.m.rotateY((1 - ss(t0, t0 + 0.6, t)) * Math.PI);
}

window.renderFrame = async t => {
  NOW = t;
  for (const s of Object.values(SETS)) s.visible = false;
  for (const c of Object.values(chars)) c.g.visible = false;
  for (const c of cards) c.m.visible = false;
  rays.visible = false; confetti.im.visible = false;
  let set, fade = 0, bloomS = 0.45;
  const [s1, s2, s3, s4, s5] = [SC[1], SC[2], SC[3], SC[4], SC[5]];
  const lj = i => L[i];
  // ---------------- SCENE 1: exterior, Jitu arrives with sweets
  if (t < s1[1]) {
    set = 'ext';
    setCam(set, ...camPath([[0, [0.5, 9, 13], [0, 6, -2], 42], [2.4, [0.2, 1.75, 6.2], [0, 1.35, -1], 38], [lj(0).start + 0.2, [0.05, 1.55, 4.9], [0.05, 1.3, -0.3], 44],
      [lj(1).start, [0.0, 1.55, 4.6], [0.0, 1.32, -0.3], 43, 1], [lj(1).start + 0.01, [0.9, 1.62, 2.9], [0.45, 1.45, -0.5], 32], [s1[1], [0.75, 1.6, 2.6], [0.45, 1.48, -0.5], 30]], t));
    const arrive = ss(0, 2.6, t), jx = lerp(-4.0, -0.5, arrive), walking = t < 2.6;
    placeChar(chars.J, set, jx, 0.25, charState('J', t, { yaw: 0.45, smile: 0.9, prop: 'box', armR: 'hold', armL: 'hold', walk: walking ? t * 7 : -1, brow: 0.3,
      talk: null }), [0.95, 0.88, 0.8]);
    placeChar(chars.R, set, 0.55, -0.5, charState('R', t, { yaw: -0.4, smile: t < lj(1).start ? 0.35 : -0.45, brow: t < lj(1).start ? 0.1 : -0.9,
      talk: [['relax', 'worry'], ['shrug', 'relax']], armR: 'relax', armL: 'relax' }), 1.0);
    updateFireworks(fireworks[0], t, 6.5); fade = Math.max(1 - ss(0, 0.5, t), ss(s1[1] - 0.25, s1[1], t) * 0);
  }
  // ---------------- SCENE 2: living room, the problem
  else if (t < s2[1]) {
    set = 'int';
    const wIn = ss(lj(5).start - 1.6, lj(5).start + 0.2, t);
    const keys = [[s2[0], [0.0, 1.6, 5.0], [0.0, 1.3, -1], 42], [lj(2).end, [0.0, 1.6, 4.8], [0.0, 1.3, -1], 42],
      [lj(3).start, [1.0, 1.6, 3.4], [0.55, 1.55, -1], 34, 1], [lj(3).start + 0.01, [1.2, 1.6, 3.6], [0.7, 1.6, -1], 36], [lj(4).start, [0.8, 1.6, 3.2], [0.5, 1.55, -1], 33],
      [lj(5).start - 1.2, [0.85, 1.6, 4.8], [0.85, 1.3, -1], 42, 1], [lj(5).start - 1.19, [0.85, 1.6, 4.8], [0.85, 1.3, -1], 42], [lj(5).start + 1.5, [1.6, 1.55, 3.0], [1.4, 1.5, -1], 32], [s2[1], [1.7, 1.55, 2.7], [1.45, 1.52, -1], 30]];
    setCam(set, ...camPath(keys, t));
    placeChar(chars.J, set, -0.6, -0.6, charState('J', t, { yaw: 0.45, smile: t < lj(3).start ? 0.2 : -0.1, brow: lineAt(t, 'J') ? 0.6 : -0.2, armR: 'relax', armL: 'relax', talk: [['explain', 'relax']] }), 1.02);
    placeChar(chars.R, set, 0.45, -0.9, charState('R', t, { yaw: lineAt(t, 'W') ? 0.35 : -0.25, smile: -0.5, brow: -0.9, talk: [['explain', 'relax'], ['present', 'relax'], ['chest', 'relax'], ['shrug', 'shrug'], ['worry', 'relax']] }), 1.02);
    if (t > lj(5).start - 1.6) placeChar(chars.W, set, lerp(3.0, 1.3, wIn), -0.75, charState('W', t, { yaw: -0.4, smile: -0.2, brow: -0.6, walk: wIn < 1 ? t * 7 : -1, talk: [['relax', 'chest'], ['relax', 'present'], ['shrug', 'shrug']] }), 1.02);
    // problem graphics
    const r3 = lj(3), r4 = lj(4), w5 = lj(5), D3 = r3.end - r3.start;
    showUI(C_MONEY, set, 0, 0.56, 0.72, r3.start + 0.6, r3.start + D3 * 0.42, t);
    showUI(C_ADS, set, 0, 0.56, 0.6, r3.start + D3 * 0.42, r3.start + D3 * 0.66, t);
    showUI(C_DOWN, set, 0, 0.54, 0.7, r3.start + D3 * 0.66, r3.end + 0.1, t);
    showUI(C_REACH, set, 0, 0.54, 0.78, r4.start + 0.3, r4.end, t);
    showUI(C_CITY, set, 0, 0.54, 0.76, w5.start + 0.6, w5.end, t);
  }
  // ---------------- SCENE 3: Jitu explains, SAHI CLICK reveal, network
  else if (t < s3[1]) {
    const j6 = lj(6), j7 = lj(7), j8 = lj(8), j9 = lj(9);
    if (t < j8.start - 0.2) {
      set = 'int';
      setCam(set, ...camPath([[s3[0], [-0.2, 1.62, 3.5], [-0.4, 1.5, -1], 38], [j6.end, [-0.4, 1.62, 2.8], [-0.55, 1.55, -1], 33], [j7.start - 0.05, [-0.4, 1.62, 2.8], [-0.55, 1.55, -1], 33, 1],
        [j7.start, [0.35, 1.7, 5.2], [0.35, 1.7, -1], 44], [j8.start, [0.35, 1.7, 4.5], [0.35, 1.75, -1], 42]], t));
      const reveal = t >= j7.start;
      placeChar(chars.J, set, -0.6, -0.6, charState('J', t, { yaw: reveal ? 0.0 : 0.35, smile: 0.85, brow: 0.5, talk: reveal ? [['present', 'present']] : [['up', 'relax'], ['explain', 'relax'], ['chest', 'relax'], ['present', 'relax']] }), 1.02);
      placeChar(chars.R, set, 0.45, -0.9, charState('R', t, { yaw: -0.35, smile: reveal ? 0.6 : -0.1, brow: reveal ? 0.6 : 0.1, armR: 'relax', armL: 'relax' }), 1.02);
      placeChar(chars.W, set, 1.3, -0.75, charState('W', t, { yaw: -0.45, smile: reveal ? 0.7 : 0.1, brow: reveal ? 0.7 : 0.1, armR: 'relax', armL: 'relax' }), 1.02);
      if (reveal) { showUI(C_LOGO, set, 0, 0.18, 0.72, j7.start + 0.05, j8.start + 0.5, t); rays.visible = true; rays.position.copy(C_LOGO.m.position); rays.position.z -= 0.15; rays.scale.setScalar(1);
        rays.quaternion.copy(camera.quaternion); rays.rotateZ(t * 0.4); rays.material.opacity = ss(j7.start, j7.start + 0.3, t) * 0.4; rays.scale.setScalar((0.6 + ss(j7.start, j7.start + 0.6, t) * 0.4) * 0.7);
        updateConfetti(t, j7.start + 0.05, new THREE.Vector3(100.2, 1.6, 0.4)); bloomS = 0.35; fade = Math.max(0, 1 - (t - j7.start) / 0.2) * 0.3; }
    } else {
      set = 'net';
      const k = ss(j8.start - 0.2, j9.end, t), a = lerp(-0.35, 0.35, k);
      setCam(set, [Math.sin(a) * lerp(5.5, 9.5, ss(j8.start - 0.2, j8.start + 2, t)), lerp(0.4, 0.9, k), Math.cos(a) * lerp(5.5, 9.5, ss(j8.start - 0.2, j8.start + 2, t))], [0, 0.1, -1.4], 46);
      const D8 = j8.end - j8.start;
      netNodes.forEach(n => { const on = ss(j8.start + n.i * 0.18, j8.start + n.i * 0.18 + 0.4, t); n.m.scale.setScalar(Math.max(0.001, easeOutBack(on))); n.gl.material.opacity = 0.3 * on;
        n.m.lookAt(camera.position); });
      netNodes.center.scale.setScalar(Math.max(0.001, easeOutBack(ss(j8.start - 0.2, j8.start + 0.3, t)))); netNodes.center.lookAt(camera.position);
      const gold = ss(j9.start, j9.start + 1.2, t);
      netEdges.forEach((e, i) => { const on = ss(j8.start + D8 * 0.25 + i * 0.05, j8.start + D8 * 0.25 + i * 0.05 + 0.5, t); e.tube.material.opacity = on * 0.85;
        e.tube.material.color.setRGB(lerp(0.3, 1.0, gold), lerp(0.83, 0.78, gold), lerp(1.0, 0.2, gold));
        const u = ((t * 0.45 + e.ph) % 1); e.pulse.position.copy(e.curve.getPoint(u)); e.pulse.material.opacity = on; });
      NETP.forEach((c, i) => showUI(c, set, [-0.38, 0.38, -0.38, 0.38][i], [0.62, 0.48, -0.42, -0.56][i], 0.52, j8.start + D8 * (0.08 + i * 0.22), j9.start + 0.2, t));
      const ar = NET.userData.arrow; ar.position.y = lerp(-6, -2.0, ss(j9.start, j9.start + 1.4, t)); ar.scale.setScalar(lerp(0.3, 0.75, ss(j9.start, j9.start + 1.4, t)));
      NET.userData.bars.forEach((b, i) => { const h = ss(j9.start + 0.2 + i * 0.15, j9.start + 0.8 + i * 0.15, t) * (0.6 + i * 0.5); b.visible = h > 0.01; b.scale.y = Math.max(0.001, h); b.position.y = -3.4 + h / 2; b.position.z = -0.6; });
      showUI(C_GROW, set, 0, 0.6, 0.86, j9.start + 0.3, s3[1], t);
      bloomS = 0.45; fade = Math.max(0, 1 - (t - (j8.start - 0.2)) / 0.3) * 0.5;
    }
  }
  // ---------------- SCENE 4: the invitation (exterior, fireworks)
  else if (t < s4[1]) {
    set = 'ext';
    const j10 = lj(10), r11 = lj(11), j12 = lj(12), all = lj(13);
    setCam(set, ...camPath([[s4[0], [-0.2, 1.65, 5.0], [-0.2, 1.75, -1], 44], [j10.end, [-0.25, 1.65, 4.5], [-0.25, 1.8, -1], 42], [r11.start, [0.25, 1.6, 3.4], [0.15, 1.55, -1], 33, 1],
      [r11.start + 0.01, [0.3, 1.6, 3.2], [0.2, 1.55, -1], 33], [j12.start, [-0.3, 1.65, 4.6], [-0.3, 1.8, -1], 42, 1], [j12.start + 0.01, [-0.3, 1.65, 4.6], [-0.3, 1.8, -1], 42],
      [all.start, [0.1, 1.9, 6.4], [0.1, 1.9, -1], 42, 1], [all.start + 0.01, [0.1, 1.9, 6.4], [0.1, 1.9, -1], 42], [s4[1], [0.1, 1.8, 5.6], [0.1, 1.9, -1], 40]], t));
    const cheer = t >= all.start;
    placeChar(chars.J, set, -0.65, 0.2, charState('J', t, { yaw: cheer ? 0 : 0.25, smile: 0.9, brow: 0.5, talk: cheer ? [['cheer', 'cheer']] : [['present', 'relax'], ['thumb', 'relax'], ['explain', 'relax'], ['up', 'relax'], ['present', 'present']] }), 1.0);
    placeChar(chars.R, set, 0.12, 0.0, charState('R', t, { yaw: cheer ? 0 : -0.3, smile: t > r11.start ? 0.85 : 0.6, brow: t > r11.start ? 0.8 : 0.4, talk: cheer ? [['cheer', 'cheer']] : [['shrug', 'relax']] }), 1.0);
    placeChar(chars.W, set, 0.85, 0.1, charState('W', t, { yaw: cheer ? 0 : -0.35, smile: 0.85, brow: 0.5, talk: cheer ? [['cheer', 'cheer']] : null, armR: 'relax', armL: 'relax' }), 1.0);
    showUI(C_CAL, set, 0, 0.5, 0.48, j10.start + 0.5, r11.end, t, { flip: 1 });
    const D12 = j12.end - j12.start;
    BEN.forEach((c, i) => showUI(c, set, [-0.4, 0.4, -0.4, 0.4][i], [0.66, 0.66, 0.5, 0.5][i], 0.47, j12.start + D12 * (0.03 + i * 0.22), all.start - 0.1, t));
    updateFireworks(fireworks[0], t - s4[0] + 0.5, cheer ? 3.2 : 6.5);
    if (cheer) updateConfetti(t, all.start, new THREE.Vector3(0.1, 3.4, 0.6));
    fade = Math.max(0, 1 - (t - s4[0]) / 0.3) * 0.8;
  }
  // ---------------- SCENE 5: final card
  else {
    set = 'fin';
    setCam(set, [0, 0, 6], [0, -0.2, 0], 50);
    finBokeh.forEach(b => { b.s.position.y = ((b.s.position.y + 8 + 0.0) % 16) - 8; b.s.material.opacity = 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.5 + b.ph)); b.s.position.y += 0; b.s.position.x += Math.sin(t * b.sp + b.ph) * 0.002; });
    fade = Math.max(0, 1 - (t - s5[0]) / 0.35) * 0.8;
  }
  SETS[set].visible = true;
  // flames + twinkling string lights
  for (const f of flames) { const k = 0.85 + 0.15 * Math.sin(t * 13 + f.ph) * Math.sin(t * 7.3 + f.ph * 2); f.f.scale.set(1, 2.2 * k, 1); f.gl.material.opacity = 0.7 * k; }
  const col = new THREE.Color();
  for (const tw of twinklers) { for (let i = 0; i < tw.n; i++) { const k = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7 + tw.ph); col.set(tw.colors[(i + Math.floor(t * 1.5)) % tw.colors.length]).multiplyScalar(0.55 + 0.9 * k); tw.im.setColorAt(i, col); } tw.im.instanceColor.needsUpdate = true; }
  bloom.strength = bloomS;
  // overlays
  elWM.style.opacity = t < s5[0] - 0.1 ? 1 : 0;
  const l = L.find(x => t >= x.start - 0.05 && t < x.end + 0.25 && x.who !== 'N');
  if (l && t < s5[0]) { const w = WHO[l.who]; elCap.innerHTML = `<span class="who" style="background:${w[1]}">${w[0]}</span><br><span class="box">${chunkCaption(l, t)}</span>`; elCap.style.opacity = 1; } else elCap.style.opacity = 0;
  const fk = ss(s5[0], s5[0] + 0.8, t); elFin.style.opacity = fk;
  [...elFin.children].forEach((e, i) => { const k = ss(s5[0] + 0.2 + i * 0.25, s5[0] + 0.7 + i * 0.25, t); e.style.opacity = k; e.style.transform = `translateY(${(1 - k) * 40}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  elFade.style.opacity = fade.toFixed(3);
  postRender();
};
window.READY = true;
