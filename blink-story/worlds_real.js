// ---------- realistic worlds ----------
const pmrem = new THREE.PMREMGenerator(renderer);
let roomEnvTex = null;
function getRoomEnv() { return roomEnvTex ??= pmrem.fromScene(new RoomEnvironment(), 0.04).texture; }
function hashi(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y, p) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const w = a => p ? ((a % p) + p) % p : a; const s = t => t * t * (3 - 2 * t); const a = hashi(w(xi), w(yi)), b = hashi(w(xi + 1), w(yi)), c = hashi(w(xi), w(yi + 1)), d = hashi(w(xi + 1), w(yi + 1)); const u = s(xf), v = s(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 4, p = 0) { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, p ? p * f : 0); n += a; f *= 2; a *= 0.5; } return v / n; }
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TEXC = {};
function genTex(key, size, fn) {
  if (TEXC[key]) return TEXC[key];
  const c1 = document.createElement('canvas'), c2 = document.createElement('canvas'); c1.width = c1.height = c2.width = c2.height = size;
  const g1 = c1.getContext('2d'), g2 = c2.getContext('2d'); const d1 = g1.createImageData(size, size), d2 = g2.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = fn(x / size, y / size, x, y), i = (y * size + x) * 4;
    d1.data[i] = r[0]; d1.data[i + 1] = r[1]; d1.data[i + 2] = r[2]; d1.data[i + 3] = 255;
    const h = clamp(r[3] ?? 0.5, 0, 1) * 255; d2.data[i] = d2.data[i + 1] = d2.data[i + 2] = h; d2.data[i + 3] = 255;
  }
  g1.putImageData(d1, 0, 0); g2.putImageData(d2, 0, 0);
  return TEXC[key] = { c1, c2 };
}
function texRep(c, rx, ry, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
function pbr(tx, rx, ry, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: texRep(tx.c1, rx, ry), bumpMap: texRep(tx.c2, rx, ry, false), bumpScale: o.bump ?? 1.5, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, color: o.color || '#ffffff', envMapIntensity: o.env ?? 1 });
  if (o.em) { m.emissiveMap = texRep(o.em, rx, ry); m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = o.emi ?? 1; }
  return m;
}
const TX = {
  grass: () => genTex('grass', 256, (u, v, x, y) => { const n = fbm(u * 8, v * 8, 5, 8), m = fbm(u * 32, v * 32, 2, 32), s = hashi(x, y); let c = mixc([66, 132, 42], [132, 194, 76], n * 0.75 + m * 0.25); if (s > 0.92) c = mixc(c, [44, 98, 30], 0.5); if (s < 0.04) c = mixc(c, [176, 220, 104], 0.6); return [...c, n * 0.6 + s * 0.4]; }),
  asphalt: () => genTex('asphalt', 256, (u, v, x, y) => { const n = fbm(u * 10, v * 10, 4, 10), s = hashi(x + 7, y); const g = 62 + n * 28 + (s > 0.9 ? 26 : 0) - (s < 0.05 ? 14 : 0); return [g, g + 2, g + 6, s * 0.7 + n * 0.3]; }),
  concrete: () => genTex('concrete', 256, (u, v, x, y) => { const n = fbm(u * 12, v * 12, 4, 12), s = hashi(x, y + 3); const edge = (x % 128 < 3 || y % 128 < 3); let g = 200 + n * 30 + (s - 0.5) * 12; if (edge) g -= 60; return [g, g - 2, g - 7, edge ? 0.1 : 0.5 + n * 0.3]; }),
  sand: () => genTex('sand', 256, (u, v, x, y) => { const n = fbm(u * 6, v * 6, 4, 6); const rip = Math.sin((v * 24 + fbm(u * 4, v * 4, 3, 4) * 4) * PI * 2) * 0.5 + 0.5; const s = hashi(x, y); const c = mixc([224, 178, 112], [250, 218, 160], n * 0.55 + rip * 0.3 + s * 0.15); return [...c, rip * 0.6 + n * 0.4]; }),
  snow: () => genTex('snow', 256, (u, v, x, y) => { const n = fbm(u * 6, v * 6, 5, 6), s = hashi(x, y); if (s > 0.994) return [255, 255, 255, 1]; const c = mixc([212, 226, 248], [255, 255, 255], 0.45 + n * 0.55); return [...c, n]; }),
  rock: () => genTex('rock', 256, (u, v) => { const n = fbm(u * 8, v * 8, 5, 8), m = fbm(u * 3 + 5, v * 3, 3, 3); const c = mixc([52, 42, 40], [112, 94, 86], n * 0.7 + m * 0.3); return [...c, n]; }),
  lavacrack: () => genTex('lavacrack', 256, (u, v) => { const k = Math.abs(fbm(u * 5, v * 5, 4, 5) - 0.5); const t = 1 - smooth(0.0, 0.035, k); return [255 * t, 110 * t, 20 * t, t]; }),
  moon: () => genTex('moon', 256, (u, v, x, y) => { const n = fbm(u * 8, v * 8, 5, 8), s = hashi(x, y); const g = 120 + n * 70 + (s - 0.5) * 22; return [g, g, g + 5, n]; }),
  wood: () => genTex('wood', 512, (u, v, x, y) => { const row = Math.floor(v * 8), off = hashi(row, 1); const col = Math.floor((u + off) * 2); const tone = hashi(row, col + 9); const grain = Math.sin((u * 50 + fbm(u * 4, v * 30, 3) * 8) * PI) * 0.5 + 0.5; let c = mixc([176, 110, 60], [222, 160, 100], tone * 0.6 + grain * 0.25 + 0.1); const seam = (y % 64) < 2 || ((((u + off) * 2) % 1) < 0.004); if (seam) c = mixc(c, [86, 50, 24], 0.7); return [...c, seam ? 0 : 0.5 + grain * 0.3]; }),
  metal: () => genTex('metal', 256, (u, v, x, y) => { const n = vnoise(u * 3, v * 140, 0), s = hashi(x, y); const g = 168 + n * 40 + s * 12; return [g, g + 4, g + 10, n]; }),
  marble: () => genTex('marble', 256, (u, v) => { const n = fbm(u * 4, v * 4, 5, 4); const vein = Math.abs(Math.sin((u * 6 + n * 5) * PI)); const c = mixc([238, 236, 244], [176, 172, 190], Math.pow(1 - vein, 10) * 0.9 + n * 0.12); return [...c, n]; }),
  bark: () => genTex('bark', 128, (u, v) => { const n = fbm(u * 16, v * 2, 4, 16); const c = mixc([72, 46, 28], [138, 98, 64], n); return [...c, n]; }),
  litter: () => genTex('litter', 256, (u, v, x, y) => { const n = fbm(u * 8, v * 8, 5, 8), s = hashi(x, y); const leaf = fbm(u * 30, v * 30, 2, 30); let c = mixc([64, 92, 34], [118, 150, 54], n); if (leaf > 0.62) c = mixc(c, [140, 98, 46], 0.6); if (s > 0.95) c = mixc(c, [36, 60, 20], 0.6); return [...c, n * 0.5 + leaf * 0.5]; }),
  burlap: () => genTex('burlap', 128, (u, v, x, y) => { const w = ((x >> 2) + (y >> 2)) % 2 ? 0.8 : 1; const n = fbm(u * 8, v * 8, 3, 8); const c = mixc([170, 136, 84], [214, 182, 126], n * w); return [...c, w * 0.8]; }),
  plaster: (col) => genTex('pl' + col, 128, (u, v) => { const n = fbm(u * 8, v * 8, 4, 8); const b = hex2rgb(col); const c = mixc(b.map(q => q * 0.93), b.map(q => Math.min(255, q * 1.03)), n); return [...c, n]; }),
};
function posterTex(fn, w = 256, h = 320) { return ctex(canvas(w, h, fn)); }

// --- sky dome + clouds ---
function skyDome(scene, o) {
  const c = canvas(1024, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, o.top); gr.addColorStop(0.3, o.mid); gr.addColorStop(0.49, o.hor); gr.addColorStop(0.52, o.low || o.hor); gr.addColorStop(1, o.low || o.hor);
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    if (o.stars) { const R = rng(17); for (let i = 0; i < (o.stars === 2 ? 1400 : 400); i++) { const y = R() * (o.stars === 2 ? 512 : 230); g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; const s = R() > 0.97 ? 2.5 : 1.3; g.fillRect(R() * 1024, y, s, s); } }
    if (o.milky) { g.save(); g.translate(512, 200); g.rotate(-0.35); const mg = g.createLinearGradient(0, -70, 0, 70); mg.addColorStop(0, 'rgba(180,160,255,0)'); mg.addColorStop(0.5, 'rgba(210,190,255,0.35)'); mg.addColorStop(1, 'rgba(180,160,255,0)'); g.fillStyle = mg; g.fillRect(-700, -70, 1400, 140); g.restore(); }
    if (o.sun) { const x = o.sun[0] * 1024, y = o.sun[1] * 512; const rg = g.createRadialGradient(x, y, 0, x, y, o.sunR || 240); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.05, o.sunCol || 'rgba(255,248,215,1)'); rg.addColorStop(0.25, 'rgba(255,236,180,0.35)'); rg.addColorStop(1, 'rgba(255,236,180,0)'); g.fillStyle = rg; g.fillRect(0, 0, 1024, 512); }
  });
  const tex = ctex(c); tex.mapping = THREE.EquirectangularReflectionMapping;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false, depthWrite: false }));
  dome.renderOrder = -1; scene.add(dome);
  scene.environment = pmrem.fromEquirectangular(tex).texture; scene.environmentIntensity = o.envI ?? 0.7;
  return dome;
}
let cloudTexC = null;
function cloudTex() {
  return cloudTexC ??= ctex(canvas(512, 256, (g) => {
    const R = rng(5);
    for (let i = 0; i < 46; i++) { const x = 90 + R() * 330, y = 140 + (R() - 0.5) * 60 - Math.sin((x - 90) / 330 * PI) * 55, r = 28 + R() * 55; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); }
    g.globalCompositeOperation = 'source-atop'; const sh = g.createLinearGradient(0, 80, 0, 230); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(140,160,195,0.55)'); g.fillStyle = sh; g.fillRect(0, 0, 512, 256);
  }));
}
function cloudSprites(scene, R, n, o = {}) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: cloudTex(), transparent: true, depthWrite: false, fog: false, opacity: o.op ?? 0.95, color: o.tint || '#ffffff' });
    const s = new THREE.Sprite(m); const sc = 110 + R() * 120; s.scale.set(sc, sc / 2, 1);
    s.position.set(-600 + R() * 1200, (o.y ?? 120) + R() * 110, -450 - R() * 400); s.userData.x0 = s.position.x; s.userData.sp = 2 + R() * 3;
    scene.add(s); list.push(s);
  }
  return list;
}
const moveClouds = (list, T) => list.forEach(c => c.position.x = ((c.userData.x0 + T * c.userData.sp + 700) % 1400) - 700);

// --- nature ---
const foliageGeos = [];
function foliageGeo(i) {
  return foliageGeos[i] ??= (() => {
    const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const n = fbm(v.x * 1.6 + i * 3 + 10, v.y * 1.6 + v.z * 1.2 + 10, 3); v.multiplyScalar(0.8 + n * 0.4); p.setXYZ(k, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  })();
}
let barkM = null;
const getBark = () => barkM ??= pbr(TX.bark(), 1, 3, { rough: 0.95, bump: 3 });
function treeReal(scene, x, z, s = 1, R = Math.random, cols = ['#3f8f3a', '#4fa844', '#5cb84f', '#367d33']) {
  const G = new THREE.Group(); G.position.set(x, 0, z); scene.add(G);
  mesh(new THREE.CylinderGeometry(0.45 * s, 0.8 * s, 11 * s, 10), getBark(), { y: 5.5 * s, parent: G });
  for (const a of [0.7, -0.8]) mesh(new THREE.CylinderGeometry(0.2 * s, 0.35 * s, 4 * s, 8), getBark(), { y: 8.5 * s, x: a * 1.2 * s, rz: -a, parent: G });
  const crown = new THREE.Group(); crown.position.y = 12 * s; G.add(crown);
  for (let i = 0; i < 7; i++) { const f = mesh(foliageGeo(i % 4), mat(cols[i % cols.length], { rough: 0.9 }), { x: (R() - 0.5) * 6 * s, y: (R() - 0.3) * 4 * s, z: (R() - 0.5) * 5 * s, parent: crown }); f.scale.setScalar((3.2 + R() * 1.8) * s); }
  G.userData.crown = crown; return G;
}
function bush(scene, x, z, s = 1, col = '#4a9a3c') { for (let i = 0; i < 3; i++) { const f = mesh(foliageGeo((i + 2) % 4), mat(i % 2 ? col : shade(col, 1.15), { rough: 0.9 }), { x: x + (i - 1) * 1.4 * s, y: 1.1 * s, z: z + (i % 2) * 0.6, parent: scene }); f.scale.setScalar(1.6 * s); } }
const leafGeo = (() => { const g = new THREE.SphereGeometry(1, 16, 8); g.translate(1, 0, 0); return g; })();
function palm(scene, x, y, z, s = 1, R = Math.random) {
  const G = new THREE.Group(); G.position.set(x, y, z); scene.add(G);
  const pts = [V3(0, 0, 0), V3(0.6, 5, 0), V3(1.8, 10, 0), V3(3.4, 14, 0)].map(p => p.multiplyScalar(s));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.5 * s, 10), mat('#a07c52', { rough: 0.9 }), { parent: G });
  const top = pts[3];
  for (let i = 0; i < 9; i++) { const pv = new THREE.Group(); pv.position.copy(top); pv.rotation.y = i / 9 * PI * 2 + R() * 0.3; G.add(pv); const lf = mesh(leafGeo, mat(i % 2 ? '#2f8f3a' : '#3aa346', { rough: 0.8 }), { rz: -0.35 - R() * 0.3, parent: pv }); lf.scale.set(4.8 * s, 0.14 * s, 1.0 * s); }
  for (let i = 0; i < 3; i++) sphere(0.55 * s, '#6b4a2a', { x: top.x + Math.cos(i * 2) * 0.7 * s, y: top.y - 0.6 * s, z: top.z + Math.sin(i * 2) * 0.7 * s, parent: G });
  return G;
}
function pine(scene, x, z, s = 1, snowy = false) {
  const G = new THREE.Group(); G.position.set(x, 0, z); scene.add(G);
  mesh(new THREE.CylinderGeometry(0.4 * s, 0.6 * s, 4 * s, 8), getBark(), { y: 2 * s, parent: G });
  for (let k = 0; k < 5; k++) {
    const r = (4.2 - k * 0.75) * s, y = (3.5 + k * 2.6) * s;
    cone(r, 4.2 * s, '#1f5f3c', { seg: 14, y, parent: G, rough: 0.9 });
    if (snowy) cone(r * 0.78, 1.6 * s, '#f6fbff', { seg: 14, y: y + 1.45 * s, parent: G, rough: 0.7 });
  }
  return G;
}
function terrain(size, seg, hfn, material, o = {}) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hfn(p.getX(i), p.getZ(i)));
  g.computeVertexNormals(); const m = mesh(g, material, { cast: false, ...o }); return m;
}
function mountainGeo(rBot, rTop, h, seed, cols) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 64, 24, true); const p = g.attributes.position; const colors = [];
  const c1 = new THREE.Color(cols[0]), c2 = new THREE.Color(cols[1]), c3 = new THREE.Color(cols[2] || cols[1]);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x), t = (y + h / 2) / h;
    const n = fbm(a * 3 + seed, t * 6 + seed, 4); const k = 1 + (n - 0.5) * 0.45 * (1 - t * 0.5);
    p.setXYZ(i, x * k, y + (n - 0.5) * h * 0.08, z * k);
    const col = t > 0.62 + (n - 0.5) * 0.2 ? c3 : c1.clone().lerp(c2, clamp(t * 1.3 + (n - 0.5) * 0.4, 0, 1)); colors.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals(); return g;
}
function rockGeo(seed) { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, v = new THREE.Vector3(); for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); v.multiplyScalar(0.7 + fbm(v.x * 2 + seed, v.y * 2 + v.z * 2, 3) * 0.6); p.setXYZ(k, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }
function puffSprites(scene, n, tint, o = {}) { const list = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(), transparent: true, depthWrite: false, color: tint, opacity: o.op ?? 0.8, fog: false })); scene.add(s); s.userData.ph = i / n; list.push(s); } return list; }
let dotTexC = null;
const dotTex = () => dotTexC ??= ctex(canvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
function particles(scene, n, col, size, add = false) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size, map: dotTex(), transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
  scene.add(p); return p;
}

// --- city props ---
const uvGeoCache = {};
function boxUV(w, h, d, su, sv) {
  const k = [w, h, d, su, sv].join(','); if (uvGeoCache[k]) return uvGeoCache[k];
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k2 = f * 4 + i; uv.setXY(k2, uv.getX(k2) * dims[f][0] / su, uv.getY(k2) * dims[f][1] / sv); }
  return uvGeoCache[k] = g;
}
function cylUV(r, h, su, sv) { const g = new THREE.CylinderGeometry(r, r, h, 40); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * PI * 2 * r / su, uv.getY(i) * h / sv); return g; }
const shMatCache = new Map();
function sharedMat(c, fn) { if (!shMatCache.has(c)) shMatCache.set(c, fn(c)); return shMatCache.get(c); }
const FACADE_COLS = ['#f2c9a0', '#e8a87c', '#f6e3b4', '#bfe3dc', '#f4b6b6', '#d7c4ec', '#f7d98b', '#b8d8f0', '#ece6d6', '#d98b6f', '#a8d5a2', '#ffd0a8'];
const SIGN_COLS = ['#e63946', '#2a9d8f', '#f4a261', '#3a86ff', '#8338ec', '#ff006e', '#06d6a0', '#fb5607'];
function facadeCanvas(col, trim, seed) {
  const k = 'fac' + col + trim + seed; if (TEXC[k]) return TEXC[k];
  const R = rng(seed * 97 + 13);
  return TEXC[k] = canvas(512, 512, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 7000; i++) { g.fillStyle = R() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'; g.fillRect(R() * 512, R() * 512, 2 + R() * 3, 2 + R() * 3); }
    for (const yy of [0, 256]) { g.fillStyle = shade(col, 0.86); g.fillRect(0, yy, 512, 10); g.fillStyle = shade(col, 1.12); g.fillRect(0, yy + 10, 512, 4); }
    for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
      const x = bx * 256 + 70, y = by * 256 + 50, w = 116, h = 156;
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x - 14, y - 14, w + 30, h + 30);
      g.fillStyle = trim; g.fillRect(x - 10, y - 10, w + 20, h + 20);
      const lit = R(); const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
      if (lit > 0.78) { gr.addColorStop(0, '#ffe9be'); gr.addColorStop(1, '#f0b768'); } else { gr.addColorStop(0, '#e2f3ff'); gr.addColorStop(0.5, '#86b8e0'); gr.addColorStop(1, '#3f6d99'); }
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (R() > 0.45) { g.fillStyle = ['#ffffff', '#ffd6e0', '#fff1c1', '#d4f0ff', '#e7d4ff'][Math.floor(R() * 5)]; g.globalAlpha = 0.9; g.fillRect(x, y, w * 0.26, h); g.fillRect(x + w * 0.74, y, w * 0.26, h); g.globalAlpha = 1; }
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(x + 24, y); g.lineTo(x + 62, y); g.lineTo(x + 8, y + h); g.lineTo(x - 30, y + h); g.fill(); g.restore();
      g.fillStyle = trim; g.fillRect(x + w / 2 - 4, y, 8, h); g.fillRect(x, y + h * 0.36, w, 7);
      g.fillStyle = shade(trim, 1.05); g.fillRect(x - 18, y + h + 10, w + 36, 12); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 18, y + h + 22, w + 36, 6);
      if (R() > 0.68) { g.fillStyle = '#7a4a2a'; g.fillRect(x - 6, y + h - 4, w + 12, 16); for (let q = 0; q < 10; q++) { g.fillStyle = q % 2 ? '#3f8f3a' : ['#ff4d6d', '#ffd60a', '#ff8fab', '#ffffff'][q % 4]; g.beginPath(); g.arc(x + q * (w / 9), y + h - 6, 8, 0, PI * 2); g.fill(); } }
    }
  });
}
const SHOP_NAMES = ['CAFE', 'TOYS', 'PIZZA', 'BOOKS', 'GAMES', 'DELI', 'BAKERY', 'FLOWERS'];
function storeCanvas(col, sign, seed) {
  col = '#e9e2d6'; const k = 'st' + sign + seed; if (TEXC[k]) return TEXC[k];
  return TEXC[k] = canvas(512, 288, (g) => {
    g.fillStyle = shade(col, 0.92); g.fillRect(0, 0, 512, 288);
    g.fillStyle = sign; g.fillRect(0, 12, 512, 50); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 12, 512, 6);
    g.fillStyle = '#fff'; g.font = '800 32px IX'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SHOP_NAMES[seed % 8], 128, 38); g.fillText(SHOP_NAMES[(seed + 3) % 8], 384, 38);
    for (let bx = 0; bx < 2; bx++) {
      const x = bx * 256 + 18, y = 78, w = 220, h = 196;
      g.fillStyle = '#2d2a32'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
      const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#cfe8f7'); gr.addColorStop(0.5, '#ffe2b0'); gr.addColorStop(1, '#f6c27a'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      for (let s = 0; s < 3; s++) { g.fillStyle = 'rgba(90,60,40,0.55)'; g.fillRect(x + 8, y + 60 + s * 45, w * 0.55, 5); for (let q = 0; q < 6; q++) { g.fillStyle = ['#e63946', '#3a86ff', '#ffd60a', '#06d6a0', '#ff70a6'][(q + s + seed) % 5]; g.fillRect(x + 14 + q * 18, y + 38 + s * 45, 12, 22); } }
      g.fillStyle = '#5a3d2b'; g.fillRect(x + w - 70, y + 20, 64, h - 20); g.fillStyle = 'rgba(200,230,255,0.6)'; g.fillRect(x + w - 62, y + 30, 48, 90); g.fillStyle = '#d4a017'; g.fillRect(x + w - 20, y + 120, 6, 18);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(x + 30, y); g.lineTo(x + 80, y); g.lineTo(x + 20, y + h); g.lineTo(x - 30, y + h); g.fill();
    }
  });
}
const awnCache = {};
function awningMat(c) { return awnCache[c] ??= new THREE.MeshStandardMaterial({ map: texRep(canvas(64, 64, (g) => { g.fillStyle = c; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 64); g.fillRect(32, 0, 16, 64); }), 8, 1), roughness: 0.8, side: THREE.DoubleSide }); }
function bldReal(scene, x, z, w, h, d, col, seed) {
  const R = rng(seed * 7 + 3);
  const trim = ['#ffffff', '#3b3b45'][Math.floor(R() * 2)], sign = SIGN_COLS[seed % SIGN_COLS.length];
  const fm = sharedMat(facadeCanvas(col, trim, seed % 2), c => new THREE.MeshStandardMaterial({ map: texRep(c, 1, 1), roughness: 0.8, envMapIntensity: 0.5 }));
  const roofM = mat(col, { rough: 0.9, color2: 1 });
  const up = new THREE.Mesh(boxUV(w, h - 9, d, 16, 18), [fm, fm, roofM, roofM, fm, fm]); up.position.set(x, 9 + (h - 9) / 2, z); up.castShadow = up.receiveShadow = true; scene.add(up);
  const sm = sharedMat(storeCanvas(col, sign, seed % 8), c => new THREE.MeshStandardMaterial({ map: texRep(c, 1, 1), roughness: 0.45, envMapIntensity: 0.6 }));
  const gf = new THREE.Mesh(boxUV(w, 9, d, 16, 9), [sm, sm, roofM, roofM, sm, sm]); gf.position.set(x, 4.5, z); gf.castShadow = gf.receiveShadow = true; scene.add(gf);
  box(w + 1.2, 1.2, d + 1.2, shade(col, 1.12), { r: 0.3, x, y: h + 0.6, z, parent: scene });
  box(w + 0.5, 0.6, d + 0.5, trim, { x, y: 9.2, z, parent: scene });
  if (R() > 0.3) box(w * 0.85, 0.2, 3.4, null, { m: awningMat(sign), x, y: 7.7, z: z + d / 2 + 1.5, rx: 0.35, parent: scene });
  if (R() > 0.4) box(3, 2, 3, '#b8bec6', { r: 0.2, x: x - w / 4, y: h + 2.2, z, parent: scene, metal: 0.4 });
  if (R() > 0.6) { cyl(2, 2, 4, '#8b6b4a', { x: x + w / 4, y: h + 5, z: z - 1, parent: scene, seg: 16 }); cone(2.3, 1.6, '#6b4f35', { x: x + w / 4, y: h + 7.8, z: z - 1, parent: scene, seg: 16 }); for (const s of [-1, 1]) box(0.3, 3, 0.3, '#444', { x: x + w / 4 + s * 1.5, y: h + 1.5, z: z - 1, parent: scene }); }
}
function glassCanvas(seed, em) {
  const k = 'gl' + seed + em; if (TEXC[k]) return TEXC[k]; const R = rng(seed + 5);
  return TEXC[k] = canvas(256, 256, (g) => {
    g.fillStyle = em ? '#000' : '#2a2f63'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const r = R();
      if (em) g.fillStyle = r > 0.85 ? '#7ff6ff' : r > 0.75 ? '#ff9be8' : r > 0.68 ? '#ffd98a' : '#000';
      else { const gr = g.createLinearGradient(x * 64, y * 32, x * 64 + 64, y * 32 + 32); gr.addColorStop(0, '#6b7fd6'); gr.addColorStop(1, '#2b2f6e'); g.fillStyle = gr; }
      g.fillRect(x * 64 + 3, y * 32 + 3, 58, 26);
    }
  });
}
function towerReal(scene, x, z, w, h, d, seed, round) {
  const m = sharedMat(glassCanvas(seed % 4, false), c => new THREE.MeshStandardMaterial({ map: texRep(c, 1, 1), emissiveMap: texRep(glassCanvas(seed % 4, true), 1, 1), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.6, metalness: 0.55, roughness: 0.12, envMapIntensity: 1.4 }));
  const me = round ? mesh(cylUV(w / 2, h, 10, 12), m, { x, y: h / 2, z, parent: scene }) : mesh(boxUV(w, h, d, 10, 12), m, { x, y: h / 2, z, parent: scene });
  const nc = seed % 2 ? '#00f5ff' : '#ff4fd8';
  if (!round) for (const sx of [-1, 1]) box(0.5, h, 0.5, '#000', { x: x + sx * w / 2, y: h / 2, z: z + d / 2, parent: scene, em: nc, emi: 2.5, cast: false });
  box(round ? w * 0.9 : w + 0.6, 0.6, round ? w * 0.9 : d + 0.6, '#000', { x, y: h * 0.66, z, parent: scene, em: nc, emi: 2.5, cast: false });
  cyl(0.3, 0.5, 14, '#c0c4d0', { x, y: h + 7, z, parent: scene, metal: 0.8, rough: 0.3 });
  sphere(0.7, '#ff2040', { x, y: h + 14.5, z, parent: scene, em: '#ff2040', emi: 3, cast: false });
}
function lampReal(scene, x, z, on, fut) {
  const G = new THREE.Group(); G.position.set(x, 0, z); scene.add(G);
  const pm = mat(fut ? '#c9d2ff' : '#2d3436', { metal: 0.6, rough: 0.35 });
  cyl(0.6, 0.75, 1.4, null, { m: pm, y: 0.7, parent: G, seg: 16 });
  cyl(0.22, 0.3, 15, null, { m: pm, y: 7.5, parent: G, seg: 12 });
  mesh(new THREE.TorusGeometry(1.6, 0.16, 8, 20, PI / 2), pm, { x: 1.6, y: 15, rz: PI / 2, parent: G });
  const head = new THREE.Group(); head.position.set(3.2, 16.4, 0); G.add(head);
  cyl(0.6, 1.0, 0.8, null, { m: pm, parent: head, seg: 16 });
  cyl(0.85, 0.85, 0.12, '#fff', { y: -0.45, parent: head, em: on ? (fut ? '#bffcff' : '#fff2c4') : '#f4f4f4', emi: on ? 3 : 0.3, cast: false, seg: 16 });
  if (on) { const l = new THREE.PointLight(fut ? '#9ff6ff' : '#ffe2a8', 60, 30); l.position.set(3.2, 15.4, 0); G.add(l); }
}
function bench(scene, x, z, ry = 0) {
  const G = new THREE.Group(); G.position.set(x, 0.3, z); G.rotation.y = ry; scene.add(G);
  for (let i = 0; i < 3; i++) box(6, 0.25, 0.5, '#a0663a', { r: 0.08, y: 1.6, z: -0.6 + i * 0.6, parent: G });
  for (let i = 0; i < 2; i++) box(6, 0.5, 0.2, '#a0663a', { r: 0.08, y: 2.4 + i * 0.7, z: -0.95, rx: -0.15, parent: G });
  for (const s of [-1, 1]) box(0.2, 1.6, 1.8, '#2d3436', { x: s * 2.6, y: 0.8, parent: G, metal: 0.6 });
}
function hydrant(scene, x, z) { cyl(0.45, 0.5, 2.2, '#e63946', { x, y: 1.4, z, parent: scene, rough: 0.4, seg: 16 }); sphere(0.5, '#e63946', { x, y: 2.5, z, parent: scene, rough: 0.4 }); cyl(0.2, 0.2, 1.5, '#c1121f', { x, y: 1.8, z, rz: PI / 2, parent: scene }); }
const carGeos = {};
function carGeo() {
  if (carGeos.body) return carGeos;
  const s = new THREE.Shape(); s.moveTo(-6, 0.9); s.lineTo(6, 0.9); s.quadraticCurveTo(6.5, 0.9, 6.4, 2.0); s.lineTo(6.0, 2.45); s.lineTo(2.6, 2.7); s.quadraticCurveTo(1.3, 4.1, -0.5, 4.1); s.lineTo(-3, 4.1); s.quadraticCurveTo(-4.6, 4.0, -5.4, 2.75); s.lineTo(-6.2, 2.5); s.quadraticCurveTo(-6.5, 1.4, -6, 0.9);
  carGeos.body = new THREE.ExtrudeGeometry(s, { depth: 4.4, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 4, curveSegments: 16 }); carGeos.body.translate(0, 0, -2.2);
  const w = new THREE.Shape(); w.moveTo(2.25, 2.8); w.quadraticCurveTo(1.2, 3.85, -0.4, 3.85); w.lineTo(-2.9, 3.85); w.quadraticCurveTo(-4.2, 3.78, -4.95, 2.8); w.lineTo(2.25, 2.8);
  carGeos.win = new THREE.ExtrudeGeometry(w, { depth: 5.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.08, bevelSegments: 2, curveSegments: 12 }); carGeos.win.translate(0, 0, -2.5);
  return carGeos;
}
function carReal(scene, x, z, col, ry = 0) {
  const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = ry; scene.add(G);
  const cg = carGeo();
  mesh(cg.body, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }), { parent: G });
  mesh(cg.win, new THREE.MeshPhysicalMaterial({ color: '#1c2633', roughness: 0.05, metalness: 0.3, envMapIntensity: 1.6 }), { parent: G });
  const tire = mat('#1d1d1f', { rough: 0.8 }), rim = mat('#d9dde3', { metal: 0.9, rough: 0.25 });
  for (const [a, b] of [[-3.8, 2.3], [3.8, 2.3], [-3.8, -2.3], [3.8, -2.3]]) { cyl(1.15, 1.15, 0.9, null, { m: tire, x: a, y: 1.15, z: b, rx: PI / 2, parent: G, seg: 24 }); cyl(0.65, 0.65, 0.95, null, { m: rim, x: a, y: 1.15, z: b, rx: PI / 2, parent: G, seg: 16 }); }
  for (const s of [-1, 1]) { box(0.2, 0.5, 1.0, '#fff', { x: 6.55, y: 1.95, z: s * 1.6, parent: G, em: '#fff6d8', emi: 1.5, cast: false }); box(0.2, 0.45, 1.0, '#ff2040', { x: -6.6, y: 2.1, z: s * 1.6, parent: G, em: '#ff2040', emi: 1.2, cast: false }); }
  return G;
}

// --- worlds ---
function makeCity(fut) {
  const scene = new THREE.Scene(); const R = rng(fut ? 77 : 7);
  if (!fut) skyDome(scene, { top: '#2a7ee0', mid: '#69b4f2', hor: '#dff2ff', low: '#cfe6f5', sun: [0.83, 0.36], envI: 0.75 });
  else skyDome(scene, { top: '#3b1d8f', mid: '#a052d8', hor: '#ffb8c9', low: '#ffd2ae', sun: [0.79, 0.46], sunCol: 'rgba(255,214,170,1)', stars: true, envI: 0.85 });
  scene.fog = new THREE.Fog(fut ? '#e6a8d2' : '#d6eeff', 140, 700);
  const L = lights(scene, fut ? { sky: '#ecdcff', ground: '#ffb8dc', hemi: 1.0, sun: 1.8, sunCol: '#ffd3b5', sunPos: [-35, 45, 35], shadow: 45 } : { hemi: 0.95, sun: 2.3, sunPos: [35, 55, 40], shadow: 45 });
  mesh(new THREE.PlaneGeometry(1600, 1600), pbr(TX.grass(), 220, 220, { bump: 1, color: fut ? '#8fd6c0' : '#ffffff' }), { rx: -PI / 2, y: -0.02, parent: scene, cast: false });
  const conc = (wd, dd) => pbr(TX.concrete(), wd / 8, dd / 8, { rough: 0.9, bump: 0.8, color: fut ? '#c8c2ea' : '#ffffff' });
  mesh(geo(900, 0.3, 12), conc(900, 12), { y: 0.15, z: 0, parent: scene, cast: false });
  mesh(geo(900, 0.3, 8), conc(900, 8), { y: 0.15, z: -30, parent: scene, cast: false });
  for (const zc of [-6.2, -25.8]) box(900, 0.42, 0.7, fut ? '#a19dc4' : '#e4e4e4', { y: 0.2, z: zc, parent: scene, cast: false });
  mesh(new THREE.PlaneGeometry(900, 20), pbr(TX.asphalt(), 90, 2, { rough: 0.85, bump: 0.6, color: fut ? '#8a86b8' : '#ffffff' }), { rx: -PI / 2, y: 0.02, z: -16, parent: scene, cast: false });
  const dash = texRep(canvas(64, 8, (g) => { g.fillStyle = fut ? '#00f5ff' : '#ffd23f'; g.fillRect(0, 0, 36, 8); }), 110, 1);
  mesh(new THREE.PlaneGeometry(900, 0.4), new THREE.MeshStandardMaterial({ map: dash, transparent: true, roughness: 0.6, emissive: fut ? '#00f5ff' : '#000000', emissiveMap: fut ? dash : null, emissiveIntensity: fut ? 2 : 0 }), { rx: -PI / 2, y: 0.05, z: -16, parent: scene, cast: false });
  for (const zc of [-7.4, -24.6]) mesh(new THREE.PlaneGeometry(900, 0.3), new THREE.MeshStandardMaterial({ color: fut ? '#ff4fd8' : '#ffffff', emissive: fut ? '#ff4fd8' : '#000', emissiveIntensity: fut ? 1.5 : 0 }), { rx: -PI / 2, y: 0.05, z: zc, parent: scene, cast: false });
  for (let i = 0; i < 8; i++) mesh(new THREE.PlaneGeometry(1.3, 15), mat('#f4f4f4', { rough: 0.6 }), { rx: -PI / 2, x: -34 + i * 2.4, y: 0.05, z: -16, parent: scene, cast: false });
  const rows = fut ? [[-41, 14, [60, 160]], [-85, 20, [110, 240]], [-190, 30, [160, 320]]] : [[-41, 14, [27, 63]], [-80, 18, [45, 90]], [-180, 24, [72, 144]]];
  rows.forEach(([zc, d, [hMin, hMax]], ri) => {
    let x = -260 - R() * 20;
    while (x < 260) {
      const w = fut ? 16 + Math.floor(R() * 3) * 8 : [16, 24, 32][Math.floor(R() * 3)];
      const h = fut ? hMin + R() * (hMax - hMin) : Math.max(27, Math.round((hMin + R() * (hMax - hMin)) / 18) * 18 + 9);
      const seed = Math.floor(R() * 1000);
      if (fut) towerReal(scene, x + w / 2, zc - R() * 6, w, h, d, seed, R() > 0.75); else bldReal(scene, x + w / 2, zc, w, h, d, FACADE_COLS[seed % FACADE_COLS.length], seed);
      x += w + (fut ? 6 + R() * 10 : (ri ? 2 + R() * 4 : 0.1));
    }
  });
  const W2 = { scene, sun: L.sun, clouds: cloudSprites(scene, R, fut ? 6 : 10, fut ? { tint: '#ffc6e6', op: 0.8, y: 140 } : {}), cars: [], trees: [] };
  if (!fut) {
    for (const x of [-22, 22, -62, 62]) { W2.trees.push(treeReal(scene, x, -3.4, 1, R)); box(4, 0.35, 4, '#5a3d2b', { x, y: 0.2, z: -3.4, parent: scene, cast: false }); }
    for (const x of [-12, 12, -42, 42]) lampReal(scene, x, -5.2, false, false);
    hydrant(scene, 16, -4.6); bench(scene, -32, -3.2);
    bush(scene, -50, -28, 1.2); bush(scene, 48, -28, 1.1);
    carReal(scene, 6, -10.5, '#e63946', 0);
    for (const [col, lane, sp, x0] of [['#3a86ff', -21, -16, 80], ['#ffd23f', -21, -13, -60], ['#ffffff', -21, -18, 200]]) { const c = carReal(scene, x0, lane, col, PI); c.userData = { lane, sp, x0 }; W2.cars.push(c); }
  } else {
    for (const x of [-12, 12, -42, 42]) lampReal(scene, x, -5.2, true, true);
    const ht = ctex(canvas(512, 280, (g) => {
      g.fillStyle = 'rgba(0,245,255,0.16)'; rr(6, 6, 500, 268, 30, g); g.fill(); g.strokeStyle = '#00f5ff'; g.lineWidth = 10; rr(6, 6, 500, 268, 30, g); g.stroke();
      g.fillStyle = '#d6fdff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 40px IX'; g.fillText('WELCOME TO', 256, 60); g.font = '900 150px IB'; g.fillText('2073', 256, 170);
    }));
    W2.holo = plane(28, 15.3, ht, { x: -16, y: 34, z: -30, parent: scene, add: true, depthWrite: false });
    const planet = new THREE.Group(); planet.position.set(120, 220, -900); scene.add(planet);
    sphere(60, '#ffc2e8', { parent: planet, em: '#ff8ad0', emi: 0.5, cast: false, fog: false });
    mesh(new THREE.TorusGeometry(95, 3, 8, 96), new THREE.MeshBasicMaterial({ color: '#ffe6f6', toneMapped: false, fog: false }), { rx: 1.3, ry: 0.3, parent: planet, cast: false });
    const cc = ['#ff4fd8', '#00f5ff', '#ffd60a', '#7cff6b'];
    for (let i = 0; i < 7; i++) {
      const G = new THREE.Group(); scene.add(G);
      const bm = new THREE.MeshPhysicalMaterial({ color: ['#f2f4ff', '#ffe0f4', '#d6f7ff'][i % 3], roughness: 0.2, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.3 });
      const body = mesh(new THREE.CapsuleGeometry(1.3, 5, 8, 16), bm, { rz: PI / 2, parent: G }); body.scale.set(1, 1, 1.4);
      const dome = sphere(1.3, '#7fdcff', { y: 0.9, x: 0.6, parent: G, rough: 0.05, metal: 0.4 }); dome.scale.set(1.6, 0.8, 1.1);
      const glow = box(5.5, 0.2, 2.6, '#000', { y: -1.2, parent: G, em: cc[i % 4], emi: 4, cast: false });
      G.userData = { ph: R(), y: 14 + R() * 26, z: -14 - R() * 40, dir: i % 2 ? 1 : -1, sp: 10 + R() * 8 };
      W2.cars.push(G);
    }
  }
  W2.update = (T) => {
    moveClouds(W2.clouds, T);
    W2.trees.forEach((t, i) => { t.userData.crown.rotation.z = Math.sin(T * 1.3 + i) * 0.025; t.userData.crown.rotation.x = Math.sin(T * 1.1 + i * 2) * 0.02; });
    if (!fut) W2.cars.forEach(c => { const u = c.userData; c.position.x = ((u.x0 + u.sp * T + 300) % 600 + 600) % 600 - 300; });
    else W2.cars.forEach(c => { const u = c.userData; c.position.set(((u.ph * 300 + T * u.sp * u.dir) % 300 + 450) % 300 - 150, u.y + Math.sin(T * 2 + u.ph * 9) * 0.5, u.z); c.rotation.y = u.dir > 0 ? 0 : PI; });
    if (W2.holo) W2.holo.material.opacity = 0.85 + 0.15 * Math.sin(T * 20);
  };
  return W2;
}
function makeVault() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#9aa6b6');
  scene.environment = getRoomEnv(); scene.environmentIntensity = 0.55;
  lights(scene, { sky: '#ffffff', ground: '#cfc6b6', hemi: 0.9, sun: 1.6, sunPos: [6, 22, 16], shadow: 22 });
  const mt = TX.metal();
  const panel = canvas(256, 256, (g) => {
    g.drawImage(mt.c1, 0, 0); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 4; g.strokeRect(2, 2, 252, 252); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.strokeRect(7, 7, 242, 242);
    for (const [x, y] of [[16, 16], [240, 16], [16, 240], [240, 240], [128, 16], [128, 240]]) { const rg = g.createRadialGradient(x - 2, y - 2, 0, x, y, 7); rg.addColorStop(0, '#ffffff'); rg.addColorStop(1, '#7d8694'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 6, 0, PI * 2); g.fill(); }
  });
  const wm = new THREE.MeshStandardMaterial({ map: texRep(panel, 8, 5), metalness: 0.7, roughness: 0.38, color: '#eef3fa' });
  mesh(geo(40, 24, 0.5), wm, { y: 12, z: -10, parent: scene });
  const dep = canvas(256, 256, (g) => { g.fillStyle = '#8c96a3'; g.fillRect(0, 0, 256, 256); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + 4, y = r * 64 + 4; const gr = g.createLinearGradient(x, y, x, y + 56); gr.addColorStop(0, '#eef2f7'); gr.addColorStop(1, '#aab4c0'); g.fillStyle = gr; g.fillRect(x, y, 56, 56); g.strokeStyle = '#6b7480'; g.lineWidth = 2; g.strokeRect(x, y, 56, 56); g.fillStyle = '#c9a227'; g.beginPath(); g.arc(x + 28, y + 32, 6, 0, PI * 2); g.fill(); g.fillStyle = '#333'; g.fillRect(x + 27, y + 30, 2, 8); g.fillStyle = '#555'; g.font = '700 11px IX'; g.fillText(String(100 + r * 4 + c), x + 6, y + 15); } });
  const dm = new THREE.MeshStandardMaterial({ map: texRep(dep, 6, 5), metalness: 0.6, roughness: 0.35 });
  for (const s of [-1, 1]) mesh(geo(0.5, 24, 30), dm, { x: s * 20, y: 12, z: 3, parent: scene });
  mesh(new THREE.PlaneGeometry(40, 30), pbr(TX.marble(), 3, 2.25, { rough: 0.12, bump: 0.2, env: 1.2 }), { rx: -PI / 2, z: 3, parent: scene, cast: false });
  box(40, 0.5, 30, '#d8dde4', { y: 24, z: 3, parent: scene });
  for (let i = 0; i < 3; i++) box(14, 0.2, 2.2, '#fff', { y: 23.7, z: -4 + i * 8, parent: scene, em: '#f4f8ff', emi: 1.6, cast: false });
  const steel = mat('#c9d1dc', { metal: 0.9, rough: 0.28 }), dark = mat('#7c8796', { metal: 0.85, rough: 0.35 }), chrome = mat('#f2f4f7', { metal: 1, rough: 0.12 });
  mesh(new THREE.TorusGeometry(8.2, 0.9, 16, 64), dark, { x: 0, y: 9, z: -9.6, parent: scene });
  const D = new THREE.Group(); D.position.set(0, 9, -9.3); scene.add(D);
  cyl(7.5, 7.5, 1.4, null, { m: steel, rx: PI / 2, parent: D, seg: 64 });
  for (const r of [6.4, 4.8, 2.4]) mesh(new THREE.TorusGeometry(r, 0.22, 12, 64), dark, { z: 0.72, parent: D });
  for (let i = 0; i < 20; i++) { const a = i * PI / 10; cyl(0.32, 0.32, 0.4, null, { m: chrome, x: Math.cos(a) * 7.0, y: Math.sin(a) * 7.0, z: 0.75, rx: PI / 2, parent: D, seg: 12 }); }
  const wheel = new THREE.Group(); wheel.position.z = 1.1; D.add(wheel);
  cyl(1.0, 1.0, 0.7, null, { m: chrome, rx: PI / 2, parent: wheel, seg: 32 });
  for (let i = 0; i < 4; i++) { const sp = new THREE.Group(); sp.rotation.z = i * PI / 2; wheel.add(sp); cyl(0.2, 0.2, 3.6, null, { m: chrome, y: 1.8, parent: sp, seg: 12 }); sphere(0.42, null, { m: chrome, y: 3.6, parent: sp }); }
  mesh(new THREE.TorusGeometry(3.6, 0.22, 12, 48), chrome, { parent: wheel });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#ffc94a', metalness: 1, roughness: 0.18, clearcoat: 0.5, envMapIntensity: 1.5 });
  const barG = new THREE.CylinderGeometry(0.62, 0.85, 0.6, 4); barG.rotateY(PI / 4); barG.scale(1.9, 1, 0.9); barG.computeVertexNormals();
  const pallet = (x0, z0) => { box(9.6, 0.5, 4.2, '#a0763f', { x: x0 + 4.2, y: 0.25, z: z0 + 0.55, parent: scene }); };
  const stack = (x0, z0, n) => { pallet(x0, z0); for (let r = 0; r < n; r++) for (let c = 0; c < n - r; c++) for (let dd = 0; dd < 2; dd++) mesh(barG, gold, { x: x0 + c * 2.15 + r * 1.07, y: 0.82 + r * 0.62, z: z0 + dd * 1.1, parent: scene }); };
  stack(-14, -6, 4); stack(6.5, -6, 4); stack(-14, -1.5, 3);
  const bagPts = [[0, 0], [1.1, 0.08], [1.55, 0.55], [1.65, 1.3], [1.4, 2.0], [0.75, 2.45], [0.38, 2.62], [0.5, 2.95], [0.6, 3.15], [0.01, 3.2]].map(([a, b]) => new THREE.Vector2(a, b));
  const bagG = new THREE.LatheGeometry(bagPts, 28), bagM = pbr(TX.burlap(), 4, 2, { rough: 0.95, bump: 2 });
  const dollar = ctex(canvas(128, 128, (g) => { g.fillStyle = '#1b7a3a'; g.font = '900 100px IB'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 64, 70); }));
  for (const [x, z, s] of [[-10, 4, 1], [10, 4, 1.1], [12.5, 7.5, 0.8], [-12.5, 8, 0.7], [-7.5, 6.5, 0.75]]) { mesh(bagG, bagM, { x, z, parent: scene }).scale.setScalar(s); mesh(new THREE.TorusGeometry(0.42 * s, 0.08 * s, 8, 20), mat('#7a5a2a'), { x, y: 2.62 * s, z, rx: PI / 2, parent: scene }); plane(1.4 * s, 1.4 * s, dollar, { x, y: 1.3 * s, z: z + 1.62 * s, parent: scene }); }
  const alarm = new THREE.PointLight('#ff2040', 0, 45); alarm.position.set(0, 18, 4); scene.add(alarm);
  const bulb = sphere(0.8, '#ff2040', { x: 0, y: 22.5, z: -9, parent: scene, em: '#ff2040', emi: 2, rough: 0.1 });
  const beamT = ctex(canvas(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,40,70,0.55)'); gr.addColorStop(1, 'rgba(255,40,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); }));
  const beam = new THREE.Group(); beam.position.set(0, 22.5, -9); scene.add(beam);
  for (const s of [-1, 1]) { const b = plane(3, 30, beamT, { parent: beam, add: true, depthWrite: false, side: THREE.DoubleSide }); b.position.set(0, -15, 0); const pv = new THREE.Group(); pv.add(b); pv.rotation.z = s * 0.9; beam.add(pv); }
  return { scene, update: (T) => { wheel.rotation.z = T * 0.6; const a = 0.5 + 0.5 * Math.sin(T * 10); alarm.intensity = 90 * a; bulb.material.emissiveIntensity = 1 + 2 * a; beam.rotation.y = T * 4; } };
}
function makeOcean() {
  const scene = new THREE.Scene(); const R = rng(3);
  skyDome(scene, { top: '#1b74d6', mid: '#5fb0ee', hor: '#e6f7ff', low: '#2f8fd0', sun: [0.8, 0.34], envI: 1.0 });
  scene.fog = new THREE.Fog('#d9f0ff', 160, 1100);
  lights(scene, { hemi: 0.9, sun: 2.4, sunPos: [30, 50, 20] });
  const cl = cloudSprites(scene, R, 10);
  const wm = new THREE.MeshPhysicalMaterial({ color: '#0d78b8', roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.94, envMapIntensity: 1.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const wg = new THREE.PlaneGeometry(320, 320, 160, 160); wg.rotateX(-PI / 2); const base = wg.attributes.position.array.slice();
  const water = mesh(wg, wm, { parent: scene, cast: false });
  mesh(new THREE.PlaneGeometry(4000, 4000), wm, { rx: -PI / 2, y: -0.4, parent: scene, cast: false }).renderOrder = -0.5;
  const isl = new THREE.Group(); isl.position.set(-55, 0, -150); scene.add(isl);
  sphere(22, '#f2d59b', { parent: isl, y: -4 }).scale.set(1, 0.3, 0.8);
  palm(isl, -4, 2, 0, 1.2, R); palm(isl, 6, 2, 4, 1.0, R); palm(isl, 2, 2, -6, 0.9, R);
  bush(isl, -10, 6, 1.4, '#3f9a3c');
  const mtn = new THREE.Mesh(mountainGeo(120, 8, 55, 4, ['#3d7a3a', '#5ea24e', '#7fbf6a']), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); mtn.position.set(160, 20, -480); scene.add(mtn);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.6, 1.6, 1.4, 2.8); sh.quadraticCurveTo(1.7, 1.4, 2.9, 0); sh.lineTo(0, 0);
  const fin = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 16 }), mat('#4d5c6e', { rough: 0.35 }), { parent: scene });
  const foam = mesh(new THREE.TorusGeometry(1.9, 0.22, 10, 48), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.85 }), { rx: -PI / 2, parent: scene, cast: false });
  const gulls = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(); scene.add(g); for (const s of [-1, 1]) box(1.6, 0.08, 0.4, '#ffffff', { x: s * 0.75, parent: g, rz: s * 0.3, cast: false }); g.userData.ph = R() * 10; gulls.push(g); }
  const update = (T) => {
    const p = wg.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = base[i], z = base[i + 2]; p[i + 1] = Math.sin(x * 0.12 + T * 1.6) * 0.5 + Math.cos(z * 0.16 + T * 1.3) * 0.4 + Math.sin((x + z) * 0.45 + T * 2.8) * 0.12 + Math.sin(x * 0.8 - z * 0.6 + T * 4) * 0.04; }
    wg.attributes.position.needsUpdate = true; wg.computeVertexNormals();
    moveClouds(cl, T);
    const a = T * 0.7; fin.position.set(Math.cos(a) * 9, -0.4 + Math.sin(T * 3) * 0.1, Math.sin(a) * 9 - 3); fin.rotation.y = -a + PI;
    foam.scale.setScalar(1 + 0.08 * Math.sin(T * 5));
    gulls.forEach((g, i) => { const u = g.userData.ph; g.position.set(Math.sin(T * 0.3 + u) * 40, 30 + i * 4 + Math.sin(T + u) * 2, -60 - i * 15); g.children.forEach((w, k) => w.rotation.z = (k ? 1 : -1) * (0.3 + Math.sin(T * 8 + u) * 0.35)); });
  };
  return { scene, update, foam };
}
function makeSnow() {
  const scene = new THREE.Scene(); const R = rng(4);
  skyDome(scene, { top: '#4c95e0', mid: '#a5d0f5', hor: '#f2f8ff', sun: [0.78, 0.38], envI: 0.9 });
  scene.fog = new THREE.Fog('#eaf4ff', 60, 420);
  lights(scene, { sky: '#eef6ff', ground: '#dfe9ff', hemi: 1.0, sun: 2.2 });
  terrain(600, 120, (x, z) => fbm(x * 0.012 + 5, z * 0.012 + 5, 4) * 26 * smooth(25, 110, Math.hypot(x, z)), pbr(TX.snow(), 60, 60, { rough: 0.7, bump: 1.2 }), { parent: scene });
  const mm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  for (const [x, z, r, h, sd] of [[-120, -320, 140, 160, 1], [80, -420, 170, 210, 2], [260, -300, 120, 140, 3]]) { const m = new THREE.Mesh(mountainGeo(r, 4, h, sd, ['#6f7b8c', '#9aa6b6', '#ffffff']), mm); m.position.set(x, h / 2 - 5, z); scene.add(m); }
  for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 140, z = -10 - R() * 90; if (Math.abs(x) < 8 && z > -20) continue; pine(scene, x, z, 0.9 + R() * 0.9, true); }
  for (let i = 0; i < 6; i++) { const r = mesh(rockGeo(i), mat('#8b95a3', { rough: 0.9 }), { x: (R() - 0.5) * 50, y: 0.5, z: -6 - R() * 20, parent: scene }); r.scale.set(2 + R() * 2, 1.2 + R(), 2 + R() * 2); sphere(1, '#ffffff', { parent: r, y: 0.6, rough: 0.7 }).scale.set(0.9, 0.35, 0.9); }
  const pts = particles(scene, 500, '#ffffff', 0.45); const seeds = Array.from({ length: 500 }, () => [R(), R(), R(), R()]);
  return { scene, update: (T) => { const p = pts.geometry.attributes.position.array; seeds.forEach((s, i) => { p[i * 3] = (s[0] - 0.5) * 40 + Math.sin(T + s[3] * 9) * 0.6; p[i * 3 + 1] = 22 - ((T * (1.5 + s[3] * 2) + s[1] * 22) % 22); p[i * 3 + 2] = 8 - s[2] * 30; }); pts.geometry.attributes.position.needsUpdate = true; } };
}
function makeVolcano() {
  const scene = new THREE.Scene(); const R = rng(8);
  skyDome(scene, { top: '#5e1730', mid: '#d0432a', hor: '#ffb36b', low: '#5a2a20', envI: 0.6 });
  scene.fog = new THREE.Fog('#c8644a', 80, 520);
  lights(scene, { sky: '#ffc2a0', ground: '#ff6a2a', hemi: 0.9, sun: 2.2, sunCol: '#ffc08a', sunPos: [-20, 40, 30] });
  terrain(600, 120, (x, z) => fbm(x * 0.02, z * 0.02, 4) * 10 * smooth(18, 80, Math.hypot(x, z)), pbr(TX.rock(), 50, 50, { rough: 0.95, bump: 2.5, em: TX.lavacrack().c1, emi: 1.6 }), { parent: scene });
  const vm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const vol = new THREE.Mesh(mountainGeo(150, 26, 130, 7, ['#3a2a26', '#5a4038', '#4a3530']), vm); vol.position.set(0, 60, -260); scene.add(vol);
  mesh(new THREE.CircleGeometry(24, 40), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false }), { rx: -PI / 2, x: 0, y: 124, z: -260, parent: scene, cast: false });
  const lavaM = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a00', emissiveIntensity: 2.6, roughness: 0.6 });
  for (let k = 0; k < 4; k++) { const a0 = -0.55 + k * 0.38, pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, a = a0 + Math.sin(t * 6 + k) * 0.06; const rad = 24 + 124 * t; pts.push(V3(Math.sin(a) * rad, 124 - 128 * t + 1.5, -260 + Math.cos(a) * rad)); } mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 3.2, 8), lavaM, { parent: scene, cast: false }); }
  const pl = new THREE.PointLight('#ff6a00', 900, 140, 1.4); pl.position.set(0, 20, -60); scene.add(pl);
  const pl2 = new THREE.PointLight('#ff6a00', 300, 50); pl2.position.set(8, 4, 2); scene.add(pl2);
  for (const [x, z, r] of [[14, 3, 5], [-16, -8, 4]]) mesh(new THREE.CircleGeometry(r, 32), lavaM, { rx: -PI / 2, x, y: 0.15, z, parent: scene, cast: false });
  for (let i = 0; i < 10; i++) { const r = mesh(rockGeo(i + 4), mat('#3d302c', { rough: 0.95 }), { x: (R() - 0.5) * 70, y: 1, z: -6 - R() * 40, parent: scene }); r.scale.set(2 + R() * 4, 1.5 + R() * 3, 2 + R() * 4); }
  const smoke = puffSprites(scene, 12, '#5a4a48', { op: 0.85 });
  const emb = particles(scene, 300, '#ffb347', 0.9, true); const es = Array.from({ length: 300 }, () => [R(), R(), R()]);
  return { scene, update: (T) => {
    smoke.forEach(s => { const p = (T * 0.12 + s.userData.ph) % 1; s.position.set(Math.sin(s.userData.ph * 20) * 20 * p, 135 + p * 140, -260 - p * 30); const sc = 60 + p * 200; s.scale.set(sc, sc * 0.6, 1); s.material.opacity = 0.85 * (1 - p); });
    const a = emb.geometry.attributes.position.array; es.forEach((s, i) => { const p = (T * 0.25 * (0.5 + s[2]) + s[0]) % 1; const ang = s[1] * PI * 2; a[i * 3] = Math.cos(ang) * (8 + p * 60); a[i * 3 + 1] = 124 + p * 90 - p * p * 120; a[i * 3 + 2] = -260 + Math.sin(ang) * (8 + p * 60); }); emb.geometry.attributes.position.needsUpdate = true;
    pl2.intensity = 300 + Math.sin(T * 7) * 60;
  } };
}
function makeJungle() {
  const scene = new THREE.Scene(); const R = rng(9);
  skyDome(scene, { top: '#6fbf8e', mid: '#b5e2a2', hor: '#eef8cf', sun: [0.76, 0.3], envI: 0.8 });
  scene.fog = new THREE.Fog('#b9df9c', 30, 220);
  lights(scene, { sky: '#f0ffd8', ground: '#7aa84a', hemi: 1.0, sun: 2.4, sunPos: [20, 40, 10] });
  mesh(new THREE.PlaneGeometry(600, 600), pbr(TX.litter(), 70, 70, { rough: 0.95, bump: 2 }), { rx: -PI / 2, parent: scene, cast: false });
  const greens = ['#2f7d32', '#3d9a3e', '#4fb24c', '#287a3a', '#5cbf55'];
  const trees = [];
  for (let i = 0; i < 34; i++) { const x = (R() - 0.5) * 140, z = -12 - R() * 110; const s = 1.3 + R() * 0.9; trees.push(treeReal(scene, x, z, s, R, greens)); }
  for (const [x, z] of [[-12, -5], [13, -6], [-20, 2], [20, 3]]) treeReal(scene, x, z, 1.2, R, greens);
  for (let i = 0; i < 18; i++) { const x = (R() - 0.5) * 50, z = -2 - R() * 22; if (Math.abs(x) < 5 && z > -8) continue; const G = new THREE.Group(); G.position.set(x, 0, z); scene.add(G); for (let k = 0; k < 7; k++) { const pv = new THREE.Group(); pv.rotation.y = k / 7 * PI * 2; G.add(pv); const lf = mesh(leafGeo, mat(greens[k % 5], { rough: 0.7 }), { rz: 0.5 + R() * 0.4, parent: pv }); lf.scale.set(2.6, 0.12, 0.9); } }
  const vines = [];
  for (let i = 0; i < 9; i++) { const x = -24 + i * 6 + R() * 2, z = -6 - R() * 6; const pts = [V3(x, 30, z), V3(x + 1, 22, z + 1), V3(x - 0.5, 14, z), V3(x + 0.5, 8 + R() * 4, z + 0.5)]; const v = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.18, 6), mat('#3a7a2a'), { parent: scene }); vines.push(v); for (let k = 0; k < 6; k++) { const p = pts[1].clone().lerp(pts[3], k / 6); const lf = mesh(leafGeo, mat('#4fb24c'), { x: p.x, y: p.y, z: p.z, ry: k, parent: v }); lf.scale.set(0.6, 0.06, 0.3); } }
  const rayT = ctex(canvas(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,220,0.35)'); gr.addColorStop(1, 'rgba(255,255,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); }));
  for (let i = 0; i < 5; i++) plane(6, 60, rayT, { x: -20 + i * 11, y: 22, z: -18, rz: -0.35, parent: scene, add: true, depthWrite: false });
  for (let i = 0; i < 14; i++) sphere(0.35, ['#ff4d6d', '#ff9f1c', '#ff70a6', '#ffd60a'][i % 4], { x: (R() - 0.5) * 30, y: 0.5 + R() * 1.5, z: -3 - R() * 14, parent: scene, rough: 0.5 });
  const parrot = new THREE.Group(); parrot.position.set(6, 12, -6); scene.add(parrot);
  const pm = mat('#e63946', { rough: 0.5 });
  mesh(new THREE.CapsuleGeometry(0.55, 1.1, 8, 16), pm, { parent: parrot, rz: 0.2 }); sphere(0.55, null, { m: pm, y: 1.1, x: -0.15, parent: parrot });
  cone(0.22, 0.5, '#ffd23f', { x: -0.3, y: 1.0, z: 0.5, rx: PI / 2 + 0.4, parent: parrot });
  for (const s of [-1, 1]) { const w = mesh(new THREE.CapsuleGeometry(0.25, 1.2, 6, 12), mat('#2b7de9'), { x: s * 0.55, y: 0.1, parent: parrot, rz: s * 0.25 }); }
  mesh(new THREE.CapsuleGeometry(0.18, 1.4, 6, 12), mat('#ffd23f'), { y: -1.1, x: 0.2, rz: 0.3, parent: parrot });
  box(4, 0.4, 0.4, '#6f4518', { x: 6, y: 10.9, z: -6, parent: scene });
  return { scene, update: (T) => { trees.forEach((t, i) => t.userData.crown.rotation.z = Math.sin(T * 1.2 + i) * 0.02); vines.forEach((v, i) => v.rotation.z = Math.sin(T * 1.5 + i) * 0.015); parrot.position.y = 12 + Math.abs(Math.sin(T * 3)) * 0.3; parrot.rotation.y = Math.sin(T * 2) * 0.4; } };
}
function makeDesert() {
  const scene = new THREE.Scene(); const R = rng(12);
  skyDome(scene, { top: '#2f85dc', mid: '#86c3f0', hor: '#fff0d0', sun: [0.76, 0.4], sunR: 300, envI: 0.6 });
  scene.fog = new THREE.Fog('#f6e2b8', 120, 800);
  lights(scene, { sky: '#fff4d8', ground: '#e0a860', hemi: 0.8, sun: 2.4, sunPos: [15, 40, 30] });
  terrain(900, 140, (x, z) => (Math.sin(x * 0.025 + z * 0.012) * 7 + Math.sin(x * 0.011 - z * 0.02) * 9 + fbm(x * 0.01 + 3, z * 0.01, 4) * 14) * smooth(20, 90, Math.hypot(x, z)) - 1, pbr(TX.sand(), 90, 90, { rough: 0.95, bump: 2 }), { parent: scene });
  const blocks = canvas(256, 256, (g) => { g.fillStyle = '#e2b877'; g.fillRect(0, 0, 256, 256); const Rb = rng(4); for (let y = 0; y < 256; y += 16) { g.fillStyle = 'rgba(120,80,30,0.45)'; g.fillRect(0, y, 256, 2); for (let x = (y / 16 % 2) * 20; x < 256; x += 40) g.fillRect(x, y, 2, 16); } for (let i = 0; i < 3000; i++) { g.fillStyle = Rb() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; g.fillRect(Rb() * 256, Rb() * 256, 3, 3); } });
  const pm = new THREE.MeshStandardMaterial({ map: texRep(blocks, 6, 4), roughness: 0.9, flatShading: true });
  for (const [x, z, r, h] of [[40, -330, 110, 100], [-120, -420, 80, 72], [150, -480, 60, 52]]) { const p = mesh(new THREE.ConeGeometry(r, h, 4, 1), pm, { x, y: h / 2 - 2, z, ry: PI / 4, parent: scene }); }
  const ribs = texRep(canvas(64, 8, (g) => { g.fillStyle = '#3f8f4a'; g.fillRect(0, 0, 64, 8); g.fillStyle = '#2d6e38'; for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 8); }), 2, 1);
  const cm = new THREE.MeshStandardMaterial({ map: ribs, roughness: 0.7 });
  for (let i = 0; i < 12; i++) { const x = (R() - 0.5) * 120, z = -8 - R() * 70; if (Math.abs(x) < 6 && z > -15) continue; const s = 0.8 + R() * 0.7; const G = new THREE.Group(); G.position.set(x, 0, z); scene.add(G); mesh(new THREE.CapsuleGeometry(1.0 * s, 9 * s, 8, 16), cm, { y: 5.4 * s, parent: G }); for (const sd of [-1, 1]) { if (R() > 0.3) { const y0 = (4 + R() * 3) * s; mesh(new THREE.CapsuleGeometry(0.6 * s, 1.8 * s, 6, 12), cm, { x: sd * 1.9 * s, y: y0, rz: PI / 2, parent: G }); mesh(new THREE.CapsuleGeometry(0.6 * s, 3 * s, 6, 12), cm, { x: sd * 2.9 * s, y: y0 + 1.8 * s, parent: G }); } } }
  for (let i = 0; i < 8; i++) { const r = mesh(rockGeo(i + 9), mat('#c07a4a', { rough: 0.95 }), { x: (R() - 0.5) * 80, y: 0.5, z: -6 - R() * 40, parent: scene }); r.scale.set(2 + R() * 3, 1 + R() * 2, 2 + R() * 3); }
  const dust = particles(scene, 200, '#f4d9a0', 0.35); const ds = Array.from({ length: 200 }, () => [R(), R(), R()]);
  return { scene, update: (T) => { const a = dust.geometry.attributes.position.array; ds.forEach((s, i) => { a[i * 3] = ((s[0] * 60 + T * 6) % 60) - 30; a[i * 3 + 1] = 0.5 + s[1] * 5 + Math.sin(T * 2 + i) * 0.3; a[i * 3 + 2] = 6 - s[2] * 30; }); dust.geometry.attributes.position.needsUpdate = true; } };
}
function makeSpace() {
  const scene = new THREE.Scene(); const R = rng(21);
  skyDome(scene, { top: '#04021a', mid: '#0b0836', hor: '#1a1350', stars: 2, milky: true, envI: 0.35 });
  lights(scene, { sky: '#c9c2ff', ground: '#555566', hemi: 0.7, sun: 3.2, sunPos: [-25, 30, 25] });
  const craters = Array.from({ length: 26 }, () => [(R() - 0.5) * 300, -R() * 260 + 40, 4 + R() * 16, 1 + R() * 2.5]);
  terrain(600, 160, (x, z) => { let h = fbm(x * 0.03 + 9, z * 0.03, 4) * 4; for (const [cx, cz, r, d] of craters) { const q = Math.hypot(x - cx, z - cz) / r; if (q < 1) h -= d * (1 - q * q) * 1.4; else if (q < 1.35) h += d * 0.45 * (1 - (q - 1) / 0.35); } return h * smooth(6, 30, Math.hypot(x, z)); }, pbr(TX.moon(), 60, 60, { rough: 0.95, bump: 2 }), { parent: scene });
  const earthC = canvas(1024, 512, (g) => { const d = g.createImageData(1024, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) { const u = x / 1024, v = y / 512; const n = fbm(u * 6, v * 4, 5, 6); const lat = Math.abs(v - 0.5) * 2; let c; if (lat > 0.86) c = [240, 246, 255]; else if (n > 0.53) c = mixc([70, 150, 60], [170, 140, 80], clamp((n - 0.53) * 6, 0, 1)); else c = mixc([12, 60, 160], [40, 120, 220], n * 1.6); const i = (y * 1024 + x) * 4; d.data[i] = c[0]; d.data[i + 1] = c[1]; d.data[i + 2] = c[2]; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); });
  const cloudsC = canvas(1024, 512, (g) => { const d = g.createImageData(1024, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) { const n = fbm(x / 1024 * 10 + 4, y / 512 * 6, 5, 10); const a = clamp((n - 0.52) * 5, 0, 1); const i = (y * 1024 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a * 230; } g.putImageData(d, 0, 0); });
  const earth = new THREE.Group(); earth.position.set(70, 95, -260); scene.add(earth);
  mesh(new THREE.SphereGeometry(42, 64, 32), new THREE.MeshStandardMaterial({ map: ctex(earthC), roughness: 0.6, emissive: '#0a2a6a', emissiveIntensity: 0.25, fog: false }), { parent: earth, cast: false });
  const ecl = mesh(new THREE.SphereGeometry(42.8, 64, 32), new THREE.MeshStandardMaterial({ map: ctex(cloudsC), transparent: true, roughness: 1, depthWrite: false, fog: false }), { parent: earth, cast: false });
  const atm = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#6fb6ff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); atm.scale.set(125, 125, 1); earth.add(atm); atm.position.z = -5;
  for (let i = 0; i < 6; i++) { const r = mesh(rockGeo(i + 20), mat('#9a9aa6', { rough: 0.95 }), { x: (R() - 0.5) * 50, y: 0.3, z: -6 - R() * 30, parent: scene }); r.scale.set(1 + R() * 2, 0.8 + R(), 1 + R() * 2); }
  return { scene, update: (T) => { earth.rotation.y = T * 0.15; ecl.rotation.y = T * 0.05; } };
}
function room(scene, o) {
  const wallM = pbr(TX.plaster(o.wall), 6, 3, { rough: 0.9, bump: 0.4 });
  mesh(geo(o.w, o.h, 0.5), wallM, { y: o.h / 2, z: o.back, parent: scene });
  for (const s of [-1, 1]) mesh(geo(0.5, o.h, 34), wallM, { x: s * o.w / 2, y: o.h / 2, z: o.back + 17, parent: scene });
  mesh(new THREE.PlaneGeometry(o.w, 34), pbr(TX.wood(), o.w / 10, 3.4, { rough: o.floorRough ?? 0.4, bump: 0.8, env: 1.0, color: o.floorCol || '#ffffff' }), { rx: -PI / 2, z: o.back + 17, parent: scene, cast: false });
  box(o.w, 0.5, 34, '#fbfbf8', { y: o.h, z: o.back + 17, parent: scene });
  box(o.w, 0.7, 0.2, '#ffffff', { y: 0.35, z: o.back + 0.35, parent: scene });
  box(o.w, 0.4, 0.3, '#ffffff', { y: o.h - 0.2, z: o.back + 0.4, parent: scene });
}
function curtain(scene, x, y, z, w, h, col) { const g = new THREE.PlaneGeometry(w, h, 24, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / w * PI * 6) * 0.25); g.computeVertexNormals(); return mesh(g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.DoubleSide }), { x, y, z, parent: scene }); }
function windowFrame(scene, x, y, z, w, h, viewTex) {
  plane(w, h, viewTex, { x, y, z: z + 0.05, parent: scene, transparent: false });
  const fm = mat('#ffffff', { rough: 0.4 });
  for (const s of [-1, 1]) { box(0.4, h + 0.8, 0.5, null, { m: fm, x: x + s * (w / 2 + 0.2), y, z: z + 0.2, parent: scene }); box(w + 0.8, 0.4, 0.5, null, { m: fm, x, y: y + s * (h / 2 + 0.2), z: z + 0.2, parent: scene }); }
  box(0.2, h, 0.3, null, { m: fm, x, y, z: z + 0.2, parent: scene }); box(w, 0.2, 0.3, null, { m: fm, x, y: y + h * 0.1, z: z + 0.2, parent: scene });
  box(w + 1.4, 0.3, 1.0, null, { m: fm, x, y: y - h / 2 - 0.45, z: z + 0.5, parent: scene });
  const glass = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.02, envMapIntensity: 1.5 }), { x, y, z: z + 0.15, parent: scene, cast: false });
}
function makeBedroom() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dcd0ff');
  scene.environment = getRoomEnv(); scene.environmentIntensity = 0.45;
  lights(scene, { sky: '#ffffff', ground: '#ffd8e8', hemi: 1.1, sun: 2.0, sunPos: [10, 16, 18], shadow: 18 });
  room(scene, { w: 34, h: 12, back: -8, wall: '#dccbff' });
  const view = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4fa6f0'); gr.addColorStop(0.65, '#cdeaff'); gr.addColorStop(0.66, '#7cc36a'); gr.addColorStop(1, '#4f9a45'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,0.9)'; for (const [x, y, r] of [[60, 70, 22], [85, 62, 28], [110, 72, 20], [190, 40, 16], [205, 36, 20]]) { g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); } g.fillStyle = '#3d8a3a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(20 + i * 45, 170, 26, 0, PI * 2); g.fill(); } g.fillStyle = '#f6d35a'; g.beginPath(); g.arc(215, 110, 18, 0, PI * 2); g.fill(); }, 256, 256);
  windowFrame(scene, 7, 6.6, -7.75, 7, 5.6, view);
  for (const s of [-1, 1]) curtain(scene, 7 + s * 5.2, 6.4, -7.2, 3, 8.4, '#ff8fb8');
  box(13, 0.25, 0.25, '#c0c0c8', { x: 7, y: 10.7, z: -7.2, parent: scene, metal: 0.8, rough: 0.3 });
  const p1 = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 256, 320); gr.addColorStop(0, '#ff9a3c'); gr.addColorStop(1, '#ff2e63'); g.fillStyle = gr; g.fillRect(0, 0, 256, 320); star(128, 140, 80, 34, '#fff15c', g); g.fillStyle = '#fff'; g.font = '900 40px IB'; g.textAlign = 'center'; g.fillText('LEVEL UP', 128, 280); });
  const p2 = posterTex((g) => { g.fillStyle = '#06d6a0'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#073b4c'; g.font = '900 120px IB'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GG', 128, 135); }, 256, 256);
  for (const [tx, x, y, w, h] of [[p1, -12, 7.4, 3.2, 4], [p2, -6.5, 8, 2.8, 2.8]]) { box(w + 0.4, h + 0.4, 0.2, '#2d2d34', { x, y, z: -7.65, parent: scene }); plane(w, h, tx, { x, y, z: -7.52, parent: scene, transparent: false }); }
  box(6, 0.25, 1.4, '#c08552', { x: -9, y: 5.2, z: -7.1, parent: scene });
  const bc = ['#e63946', '#3a86ff', '#ffd23f', '#06d6a0', '#8338ec', '#ff70a6', '#fb5607'];
  for (let i = 0; i < 9; i++) box(0.35, 1.3 + (i % 3) * 0.2, 1.0, bc[i % 7], { x: -11.6 + i * 0.42, y: 5.95 + (i % 3) * 0.1, z: -7.1, parent: scene, rough: 0.6 });
  cyl(0.3, 0.45, 0.25, '#e0b030', { x: -7.6, y: 5.45, z: -7.1, parent: scene, metal: 1, rough: 0.2 }); cyl(0.12, 0.12, 0.6, '#e0b030', { x: -7.6, y: 5.85, z: -7.1, parent: scene, metal: 1, rough: 0.2 }); cyl(0.55, 0.25, 0.7, '#ffcf40', { x: -7.6, y: 6.5, z: -7.1, parent: scene, metal: 1, rough: 0.15 });
  const wood = mat('#b5794a', { rough: 0.55 });
  box(9, 5, 0.6, null, { m: wood, r: 0.25, x: -11, y: 2.5, z: -7.4, parent: scene });
  box(8.4, 1.4, 11, null, { m: wood, r: 0.2, x: -11, y: 0.9, z: -1.6, parent: scene });
  box(8, 1.1, 10.6, '#fbfbff', { r: 0.45, x: -11, y: 2.1, z: -1.6, parent: scene, rough: 0.9 });
  box(8.3, 0.7, 7.8, '#4f86f7', { r: 0.35, x: -11, y: 2.75, z: 0.0, parent: scene, rough: 0.95 });
  box(8.3, 0.25, 1.2, '#ffffff', { r: 0.12, x: -11, y: 3.05, z: -3.9, parent: scene, rough: 0.95 });
  for (const s of [-1, 1]) box(3.3, 1.1, 1.8, '#fffaf0', { r: 0.5, x: -11 + s * 2, y: 3.1, z: -5.6, rx: -0.25, parent: scene, rough: 0.95 });
  box(2.6, 2.4, 2.4, null, { m: wood, r: 0.15, x: -4.6, y: 1.2, z: -6.4, parent: scene });
  cyl(0.5, 0.7, 1.6, '#f2f2f2', { x: -4.6, y: 3.2, z: -6.4, parent: scene, rough: 0.3 });
  cyl(0.8, 1.3, 1.4, '#fff', { x: -4.6, y: 4.6, z: -6.4, parent: scene, em: '#ffe1b0', emi: 1.2, cast: false });
  const lampL = new THREE.PointLight('#ffd9a8', 40, 18); lampL.position.set(-4.6, 4.2, -5.6); scene.add(lampL);
  box(9, 0.35, 4, null, { m: wood, r: 0.1, x: 11.5, y: 4.1, z: -5.6, parent: scene });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.15, 0.15, 3.9, '#2d3436', { x: 11.5 + sx * 4, y: 2, z: -5.6 + sz * 1.6, parent: scene, metal: 0.7, rough: 0.3 });
  box(5, 3.1, 0.3, '#18181f', { r: 0.12, x: 11.5, y: 6.4, z: -6.8, parent: scene, rough: 0.3 });
  const scr = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#5fd0ff'); gr.addColorStop(1, '#bff1ff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160); g.fillStyle = '#4caf50'; g.fillRect(0, 118, 256, 42); g.fillStyle = '#ffd23f'; g.fillRect(40, 78, 26, 40); g.fillStyle = '#ff2e63'; g.fillRect(150, 60, 50, 58); g.fillStyle = '#fff'; g.font = '800 18px IX'; g.fillText('SCORE 9999', 12, 22); }, 256, 160);
  plane(4.7, 2.8, scr, { x: 11.5, y: 6.4, z: -6.63, parent: scene, transparent: false });
  box(0.5, 1.2, 0.5, '#18181f', { x: 11.5, y: 4.85, z: -6.8, parent: scene });
  box(3.2, 0.15, 1.1, '#2d2d34', { r: 0.05, x: 11.5, y: 4.35, z: -4.8, parent: scene });
  box(3.4, 0.6, 3.2, '#e63946', { r: 0.25, x: 11.5, y: 2.6, z: -2.4, parent: scene }); box(3.4, 4, 0.6, '#e63946', { r: 0.25, x: 11.5, y: 4.6, z: -0.9, rx: 0.12, parent: scene }); cyl(0.2, 0.2, 2.2, '#2d3436', { x: 11.5, y: 1.2, z: -2.4, parent: scene, metal: 0.7 });
  cyl(6.5, 6.5, 0.08, '#ff8fb8', { y: 0.04, z: 1.5, parent: scene, cast: false, seg: 48, rough: 1 }); cyl(4.6, 4.6, 0.1, '#ffd1e3', { y: 0.06, z: 1.5, parent: scene, cast: false, seg: 48, rough: 1 }); cyl(2.6, 2.6, 0.12, '#ff8fb8', { y: 0.07, z: 1.5, parent: scene, cast: false, seg: 48, rough: 1 });
  cyl(1.0, 0.75, 1.8, '#d9784a', { x: 15, y: 0.9, z: -1, parent: scene, rough: 0.8 });
  for (let i = 0; i < 4; i++) { const f = mesh(foliageGeo(i), mat(i % 2 ? '#3f9a3c' : '#56b84e', { rough: 0.85 }), { x: 15 + (i - 1.5) * 0.5, y: 2.6 + (i % 2) * 0.8, z: -1, parent: scene }); f.scale.setScalar(1.1); }
  return { scene, update: () => {} };
}
function makeLiving(photoTex) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#ffd9c8');
  scene.environment = getRoomEnv(); scene.environmentIntensity = 0.4;
  lights(scene, { sky: '#fff2e8', ground: '#f0b8a0', hemi: 1.1, sun: 1.6, sunCol: '#ffe2c8', sunPos: [-12, 18, 16], shadow: 18 });
  room(scene, { w: 40, h: 13, back: -7, wall: '#ffd7c2', floorCol: '#f0d6c0' });
  const nv = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1d2a6e'); gr.addColorStop(0.6, '#7a4fb0'); gr.addColorStop(1, '#ff9f8a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(70, 60, 24, 0, PI * 2); g.fill(); g.fillStyle = '#fff'; for (let i = 0; i < 25; i++) g.fillRect((i * 53) % 256, (i * 37) % 120, 2, 2); g.fillStyle = '#2a2350'; for (let i = 0; i < 9; i++) { const h = 40 + (i * 37) % 60; g.fillRect(i * 30, 256 - h, 26, h); g.fillStyle = '#ffd98a'; for (let k = 0; k < 4; k++) g.fillRect(i * 30 + 5 + (k % 2) * 10, 256 - h + 8 + Math.floor(k / 2) * 14, 5, 6); g.fillStyle = '#2a2350'; } }, 256, 256);
  windowFrame(scene, -12, 7, -6.75, 7, 6.5, nv);
  for (const s of [-1, 1]) curtain(scene, -12 + s * 5.2, 6.8, -6.2, 3, 9, '#b56cc9');
  box(14.4, 0.5, 3.8, '#a86d3f', { r: 0.12, x: 0, y: 2.45, z: -1, parent: scene, rough: 0.5 });
  box(14.6, 0.08, 4.0, '#ffffff', { x: 0, y: 2.74, z: -1, parent: scene, rough: 0.9 });
  box(14.6, 1.2, 0.06, '#ffffff', { x: 0, y: 2.15, z: 1.02, parent: scene, rough: 0.9 });
  for (const [x, z] of [[-6.6, -2.5], [6.6, -2.5], [-6.6, 0.5], [6.6, 0.5]]) cyl(0.22, 0.18, 2.2, '#7f5539', { x, y: 1.1, z, parent: scene });
  const fr = new THREE.Group(); fr.position.set(1.8, 4.75, -1.8); fr.rotation.x = -0.08; scene.add(fr);
  box(2.8, 3.5, 0.3, '#7a4a28', { r: 0.1, parent: fr, rough: 0.4 });
  box(2.45, 3.15, 0.05, '#f4e9d8', { z: 0.16, parent: fr });
  plane(2.1, 2.75, photoTex, { z: 0.2, parent: fr, transparent: false });
  const rib = new THREE.Shape(); rib.moveTo(0, 0); rib.lineTo(1.1, 0); rib.lineTo(1.1, -1.1); rib.closePath();
  mesh(new THREE.ShapeGeometry(rib), new THREE.MeshBasicMaterial({ color: '#111' }), { x: 0.3, y: 1.75, z: 0.22, parent: fr, cast: false });
  box(0.4, 1.2, 0.4, '#7a4a28', { x: 0, y: -1.4, z: -0.6, rx: 0.4, parent: fr });
  const candles = [];
  for (const [x, z, h] of [[-4.5, -1, 1.4], [-3.4, -0.3, 1.0], [4.0, -0.6, 1.2], [-1.0, -0.2, 0.8]]) {
    cyl(0.28, 0.28, h, '#fff6e0', { x, y: 2.78 + h / 2, z, parent: scene, rough: 0.6 });
    const fl = sphere(0.15, '#ffb703', { x, y: 2.78 + h + 0.25, z, parent: scene, em: '#ffb703', emi: 3, cast: false }); fl.scale.y = 1.8;
    const l = new THREE.PointLight('#ffb35c', 12, 12); l.position.set(x, 2.78 + h + 0.6, z + 0.5); scene.add(l);
    candles.push({ fl, l, ph: x });
  }
  mesh(new THREE.LatheGeometry([[0, 0], [0.55, 0.05], [0.7, 0.6], [0.45, 1.3], [0.4, 1.6], [0.5, 1.7]].map(([a, b]) => new THREE.Vector2(a, b)), 24), new THREE.MeshPhysicalMaterial({ color: '#7fd3ff', roughness: 0.05, transparent: true, opacity: 0.6 }), { x: 5.4, y: 2.78, z: -1.3, parent: scene });
  ['#ff4d6d', '#ffd60a', '#ffffff', '#ff70a6', '#ff9f1c', '#c77dff'].forEach((c, i) => { const a = (i - 2.5) * 0.25; cyl(0.04, 0.04, 2, '#2b9348', { x: 5.4 + Math.sin(a) * 0.4, y: 5.2, z: -1.3, rz: -a, parent: scene }); for (let k = 0; k < 5; k++) sphere(0.18, c, { x: 5.4 + Math.sin(a) * 1.0 + Math.cos(k * 1.25) * 0.2, y: 6.2 + Math.sin(k * 1.25) * 0.2, z: -1.3 + (k % 2) * 0.1, parent: scene, rough: 0.6 }); sphere(0.12, '#ffd23f', { x: 5.4 + Math.sin(a) * 1.0, y: 6.2, z: -1.15, parent: scene }); });
  const sofa = mat('#3aa6a0', { rough: 0.95 });
  box(10, 2, 4, null, { m: sofa, r: 0.5, x: 13.5, y: 1.6, z: -4.6, parent: scene }); box(10, 3.2, 1.2, null, { m: sofa, r: 0.5, x: 13.5, y: 3.4, z: -6.2, parent: scene }); for (const s of [-1, 1]) box(1.2, 2.6, 4, null, { m: sofa, r: 0.5, x: 13.5 + s * 5, y: 2.2, z: -4.6, parent: scene });
  box(2.2, 1.6, 0.6, '#ffd23f', { r: 0.5, x: 11, y: 3.2, z: -5.4, rx: -0.2, parent: scene }); box(2.2, 1.6, 0.6, '#ff70a6', { r: 0.5, x: 15.5, y: 3.2, z: -5.4, rx: -0.2, parent: scene });
  cyl(0.15, 0.15, 9, '#2d3436', { x: -18, y: 4.5, z: -4, parent: scene, metal: 0.7 }); cyl(1, 1.6, 1.6, '#fff', { x: -18, y: 9.5, z: -4, parent: scene, em: '#ffe1b0', emi: 1.3, cast: false });
  const fl2 = new THREE.PointLight('#ffd7a0', 60, 26); fl2.position.set(-18, 8.6, -3); scene.add(fl2);
  cyl(7, 7, 0.06, '#c77dff', { y: 0.04, z: 2, parent: scene, cast: false, seg: 48, rough: 1 }); cyl(5, 5, 0.08, '#e6c8ff', { y: 0.05, z: 2, parent: scene, cast: false, seg: 48, rough: 1 });
  return { scene, update: (T) => candles.forEach(c => { const f = 1 + 0.2 * Math.sin(T * 23 + c.ph) + 0.1 * Math.sin(T * 37 + c.ph); c.fl.scale.set(1, 1.8 * f, 1); c.l.intensity = 12 * f; }) };
}
