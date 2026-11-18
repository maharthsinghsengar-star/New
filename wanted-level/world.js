// World: one road "route" per country (landing runway -> streets/highway -> take-off airfield) with country-styled
// roadside buildings, props, landmarks and a big textured ground for the flights.
import { THREE, RoundedBoxGeometry, mergeGeometries, RNG, clamp, smooth, lerp, TAU, C, V3, STD, LAM, lam, std, mesh, box, cyl, canvasTex, noise,
  roadTex, groundTex, facadeTex, shopTex, signTex, glow, bake, cached } from './core.js';
import { makeAircraft, makeCar, makeBoxy, paint } from './vehicles.js';

// ---------- route ----------
export class Route {
  constructor(S0, S1, turns = []) {
    this.S0 = S0; this.S1 = S1; this.step = 2; const n = Math.ceil((S1 - S0) / 2) + 1; this.X = new Float64Array(n); this.Z = new Float64Array(n); this.H = new Float64Array(n);
    const hf = s => turns.reduce((a, [a0, a1, dh]) => a + dh * smooth((s - a0) / (a1 - a0)), 0);
    let x = 0, z = 0; const i0 = Math.round(-S0 / 2);
    for (let i = i0; i < n; i++) { const s = S0 + i * 2, h = hf(s); this.H[i] = h; this.X[i] = x; this.Z[i] = z; x += Math.sin(h + (hf(s + 2) - h) / 2) * 2; z += Math.cos(h + (hf(s + 2) - h) / 2) * 2; }
    x = 0; z = 0; for (let i = i0 - 1; i >= 0; i--) { const s = S0 + i * 2, h = hf(s); x -= Math.sin(h) * 2; z -= Math.cos(h) * 2; this.H[i] = h; this.X[i] = x; this.Z[i] = z; }
    this.n = n;
  }
  at(s) { const f = clamp((s - this.S0) / 2, 0, this.n - 1.001), i = Math.floor(f), u = f - i; const h = lerp(this.H[i], this.H[i + 1], u);
    return { x: lerp(this.X[i], this.X[i + 1], u), z: lerp(this.Z[i], this.Z[i + 1], u), h, fx: Math.sin(h), fz: Math.cos(h), rx: -Math.cos(h), rz: Math.sin(h) }; }
  p(s, d = 0, y = 0) { const a = this.at(s); if (s > this.S1) { const e = this.at(this.S1); return V3(e.x + e.fx * (s - this.S1) + e.rx * d, y, e.z + e.fz * (s - this.S1) + e.rz * d); } return V3(a.x + a.rx * d, y, a.z + a.rz * d); }
  yaw(s) { return this.at(s).h; }
}

// ---------- country styles ----------
const F = (wall, kind, o = {}) => ({ wall, kind, win: '#2d4660', frame: '#ece8df', ...o });
export const STY = {
  usa: { ground: 'grass', facades: [F('#c7b293', 'grid'), F('#a85f44', 'brick', { frame: '#f2efe6' }), F('#d9d2c2', 'grid', { frame: '#5b5f66' }), F('#8e9aa5', 'grid'), F('#e7d3ad', 'grid', { frame: '#7a4b2a' })],
    towers: [F('#5f8fbf', 'glass', { win: '#2b4d73', wall2: '#cfe6ff' }), F('#9fb3c4', 'glass', { win: '#45627e' }), F('#c9c3b5', 'grid')], floors: [2, 4], tower: [14, 42], roof: 'flat',
    shop: { signs: ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#ef6c00'], names: ['DINER', 'PHARMACY', 'BURGERS', 'DONUTS', 'LAUNDRY', 'HARDWARE', 'PIZZA', 'BANK', 'TACOS', 'BOOKS'] },
    tree: ['round'], lamp: '#6b7078', traffic: ['sedan', 'suv', 'pickup', 'hatch', 'coupe', 'van'], cab: 'taxi', colors: ['#e8261c', '#1e5bc6', '#f4f4f4', '#222', '#9aa3ad', '#2f7d4a', '#f2c200', '#7b1f1f', '#d9d9d9'] },
  mex: { ground: 'dry', facades: [F('#e86b8c', 'adobe', { shut: '#1d6f8c' }), F('#f6c445', 'adobe', { shut: '#2f7d4a' }), F('#38b6b0', 'adobe', { shut: '#8a3b12' }), F('#f08a3c', 'adobe', { shut: '#1d4f8c' }), F('#f3ece0', 'adobe', { shut: '#7a2b2b' }), F('#9b5de5', 'adobe', { shut: '#f6c445' })],
    towers: [F('#d9cbb3', 'grid')], floors: [1, 3], tower: [5, 9], roof: 'parapet',
    shop: { signs: ['#d32f2f', '#2e7d32', '#f9a825', '#1565c0', '#8e24aa'], names: ['TAQUERÍA', 'FARMACIA', 'PANADERÍA', 'TIENDA', 'ABARROTES', 'CAFÉ', 'MERCADO', 'ZAPATOS'] },
    tree: ['palm', 'cactus', 'round'], lamp: '#555', traffic: ['pickup', 'sedan', 'hatch', 'van', 'suv'], colors: ['#f4f4f4', '#c62828', '#1e5bc6', '#2e7d32', '#e0c050', '#555', '#d98b2b'] },
  esp: { ground: 'dry', facades: [F('#f5f1e6', 'shutter', { shut: '#2f6b3e' }), F('#efe0c4', 'shutter', { shut: '#1f4f7a' }), F('#f7e6b8', 'shutter', { shut: '#7a2b2b' }), F('#ead2b6', 'haussmann'), F('#fbfbf7', 'shutter', { shut: '#3a6fa8' })],
    towers: [F('#e8dcc8', 'grid')], floors: [3, 5], tower: [8, 14], roof: 'tile',
    shop: { signs: ['#c62828', '#f9a825', '#1565c0', '#2e7d32', '#6d4c41'], names: ['TAPAS', 'FARMACIA', 'PANADERÍA', 'CAFÉ BAR', 'HELADOS', 'MERCADO', 'LIBRERÍA'] },
    tree: ['palm', 'round'], lamp: '#2b2b2b', traffic: ['hatch', 'sedan', 'suv', 'van'], colors: ['#f4f4f4', '#c62828', '#1e5bc6', '#333', '#9aa3ad', '#e0c050'] },
  fra: { ground: 'grass', facades: [F('#eadfca', 'haussmann'), F('#e3d6bd', 'haussmann'), F('#efe6d2', 'haussmann'), F('#d9cbb0', 'haussmann')], towers: [F('#eadfca', 'haussmann')], floors: [5, 7], tower: [6, 8], roof: 'mansard',
    shop: { signs: ['#1f3a5f', '#7a1f2b', '#2e5e3e', '#3b3b3b', '#b8860b'], names: ['CAFÉ', 'BOULANGERIE', 'PHARMACIE', 'BRASSERIE', 'FROMAGERIE', 'TABAC', 'LIBRAIRIE', 'PÂTISSERIE'] },
    tree: ['round'], lamp: '#25302a', traffic: ['hatch', 'sedan', 'van', 'suv'], colors: ['#f4f4f4', '#2b2b2b', '#9aa3ad', '#1e5bc6', '#c62828', '#d8c8a8'] },
  uk: { ground: 'park', facades: [F('#9c4a32', 'brick', { frame: '#fafafa' }), F('#b5603e', 'brick', { frame: '#fafafa' }), F('#e9e2d0', 'grid', { frame: '#fafafa' }), F('#8a3e2b', 'brick', { frame: '#f2f2f2' })],
    towers: [F('#a8b8c8', 'glass', { win: '#3c5670' }), F('#d8d0bc', 'grid')], floors: [3, 5], tower: [10, 20], roof: 'tile',
    shop: { signs: ['#1d3557', '#7a1f2b', '#2e5e3e', '#111111', '#c62828', '#0b6e4f'], names: ['THE CROWN', 'CHEMIST', 'FISH & CHIPS', 'NEWSAGENT', 'TEA ROOM', 'BAKERY', 'BOOKSHOP', 'PUB'] },
    tree: ['round'], lamp: '#1d1d1d', traffic: ['cab', 'hatch', 'sedan', 'van', 'ddbus'], colors: ['#111', '#f4f4f4', '#9aa3ad', '#1d3557', '#c62828', '#2e5e3e'] },
  ger: { ground: 'grass', facades: [F('#efe6d0', 'grid', { frame: '#ffffff' }), F('#d7d9db', 'grid'), F('#f2d7a6', 'grid'), F('#c8d6c8', 'grid')], towers: [F('#b9c7d6', 'glass', { win: '#3b5672' })], floors: [3, 5], tower: [8, 20], roof: 'tile',
    shop: { signs: ['#1d3557', '#c62828', '#f9a825', '#2e7d32'], names: ['BÄCKEREI', 'APOTHEKE', 'IMBISS', 'CAFÉ', 'BIERGARTEN'] },
    tree: ['pine', 'round'], lamp: '#555', traffic: ['sedan', 'hatch', 'suv', 'van', 'truck'], colors: ['#d6d9dd', '#111', '#f4f4f4', '#1e3f8a', '#9aa3ad', '#7a1f1f'] },
  uae: { ground: 'sand', facades: [F('#e9dcc1', 'grid', { frame: '#cdbb94' })], towers: [F('#4f8dc9', 'glass', { win: '#21476e', wall2: '#d6ecff' }), F('#8fb9d6', 'glass', { win: '#2f5b80' }), F('#c7d6e0', 'glass', { win: '#5b7894' }), F('#3d6e8f', 'glass', { win: '#173a55', wall2: '#9fd0f0' })],
    floors: [3, 5], tower: [25, 70], roof: 'flat', shop: { signs: ['#0a7a3a', '#c62828', '#b8860b'], names: ['MALL', 'GOLD', 'CAFÉ', 'SHAWARMA'] },
    tree: ['palm'], lamp: '#cfcfcf', traffic: ['suv', 'super', 'sedan', 'coupe', 'pickup'], colors: ['#f4f4f4', '#111', '#c9a227', '#9aa3ad', '#c62828', '#f4f4f4'] },
  ind: { ground: 'dirt', facades: [F('#f2a541', 'indian'), F('#e45c8f', 'indian'), F('#5cc2c7', 'indian'), F('#f7e27a', 'indian'), F('#a7d06a', 'indian'), F('#f4ede0', 'indian'), F('#e96d4c', 'indian')], towers: [F('#e8dccb', 'grid')], floors: [2, 5], tower: [8, 16], roof: 'flat',
    shop: { signs: ['#d32f2f', '#f9a825', '#1565c0', '#2e7d32', '#8e24aa', '#ef6c00'], names: ['CHAI', 'SWEETS', 'MOBILE', 'TAILOR', 'MEDICAL', 'DHABA', 'SAREES', 'BOOKS'] },
    tree: ['round', 'palm'], lamp: '#444', traffic: ['tuk', 'hatch', 'suv', 'sedan', 'truck'], colors: ['#f4f4f4', '#c62828', '#1e5bc6', '#9aa3ad', '#f2c200'] },
  chn: { ground: 'park', facades: [F('#c9ccd2', 'grid', { lit: 0.6 }), F('#e6d9c6', 'grid', { lit: 0.6 })], towers: [F('#4f6f9a', 'glass', { win: '#1d2f4a', wall2: '#7fb2e6', lit: 0.7 }), F('#6f7f96', 'glass', { win: '#25374f', lit: 0.65 }), F('#2d4a6e', 'glass', { win: '#122236', wall2: '#5f9bd6', lit: 0.7 })],
    floors: [4, 8], tower: [25, 60], roof: 'flat', night: true, shop: { signs: ['#d32f2f', '#ff1f6b', '#00b8d4', '#f9a825', '#7c4dff'], names: ['饭店', '茶馆', '超市', '面馆', '药店', '火锅', '书店'] },
    tree: ['round'], lamp: '#555', traffic: ['sedan', 'suv', 'hatch', 'van', 'truck'], colors: ['#f4f4f4', '#111', '#9aa3ad', '#c62828', '#1e5bc6'] },
  jpn: { ground: 'park', facades: [F('#d8d4cc', 'japan', { lit: 0.6 }), F('#cfd6dc', 'japan', { lit: 0.6 }), F('#e9e3d6', 'japan', { lit: 0.6 }), F('#b9b2a6', 'japan', { lit: 0.6 })], towers: [F('#58708f', 'glass', { win: '#20304a', lit: 0.7 })],
    floors: [4, 9], tower: [18, 40], roof: 'flat', night: true, shop: { signs: ['#ff1f6b', '#00b8d4', '#ffd400', '#7c4dff', '#ff6d00', '#00c853'], names: ['ラーメン', 'カラオケ', '寿司', 'カフェ', 'ゲーム', '居酒屋', '書店', '薬局'] },
    tree: ['sakura', 'round'], lamp: '#555', traffic: ['hatch', 'van', 'sedan', 'suv'], colors: ['#f4f4f4', '#111', '#9aa3ad', '#c62828', '#1e5bc6', '#f2c200'] },
};
STY.usa2 = { ...STY.usa };

// ---------- geometry helpers ----------
function ribbon(R, s0, s1, pts, mat, vScale = 16, step = 2) {   // pts: [[d, y, u], ...] across; builds a strip along s
  const pos = [], uv = [], idx = []; const ns = Math.max(1, Math.ceil((s1 - s0) / step)), m = pts.length;
  for (let i = 0; i <= ns; i++) { const s = s0 + (s1 - s0) * i / ns; for (const [d, y, u] of pts) { const p = R.p(s, d, y); pos.push(p.x, p.y, p.z); uv.push(u, s / vScale); } }
  for (let i = 0; i < ns; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // the indexed strip's winding: make sure normals point up
  const nrm = g.attributes.normal; let up = 0; for (let i = 0; i < nrm.count; i++) up += nrm.getY(i); if (up < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  const ms = new THREE.Mesh(g, mat); ms.receiveShadow = true; return ms;
}
function wallsGeo(w, h, d, CW, FH, y0 = 0) {   // 4 walls with metre-scaled facade uvs (4 x 4 cells per texture), centred at origin, base at y0
  const pos = [], uv = [], nr = []; const faces = [[[w / 2, -d / 2], [w / 2, d / 2], [1, 0]], [[-w / 2, d / 2], [-w / 2, -d / 2], [-1, 0]], [[-w / 2, -d / 2], [w / 2, -d / 2], [0, -1]], [[w / 2, d / 2], [-w / 2, d / 2], [0, 1]]];
  for (const [a, b, n] of faces) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u1 = L / (4 * CW), v0 = 0, v1 = h / (4 * FH);
    const P = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y0 + h, b[1]], [a[0], y0 + h, a[1]]], U = [[0, v0], [u1, v0], [u1, v1], [0, v1]];
    for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(...P[k]); uv.push(...U[k]); nr.push(n[0], 0, n[1]); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nr, 3)); return g;
}
const leafGeo = (r, seed, det = 2) => { const g = new THREE.IcosahedronGeometry(r, det); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V3().fromBufferAttribute(p, i); const k = 1 + 0.2 * noise.noise3d(v.x * 1.3 + seed, v.y * 1.3, v.z * 1.3); p.setXYZ(i, v.x * k, v.y * k * 0.9, v.z * k); } g.computeVertexNormals(); return g; };
const LEAF = cached('leafgeo', () => [0, 1, 2].map(i => leafGeo(1, i * 3.1)));

function tree(G, kind, x, z, s, r) {
  if (kind === 'round' || kind === 'sakura') { G.add(cyl(0.14 * s, 0.2 * s, 3 * s, '#6d4c35', x, 1.5 * s, z, 7)); const c = kind === 'sakura' ? (r() < 0.5 ? '#f7b6cf' : '#f4a3c2') : ['#4f9a3a', '#3f8a2f', '#5aa844', '#6cae45'][(r() * 4) | 0];
    for (let k = 0; k < 3; k++) { const m = mesh(LEAF[k], c, x + (r() - 0.5) * 1.4 * s, (3.4 + r() * 1.2) * s, z + (r() - 0.5) * 1.4 * s); m.scale.setScalar((1.3 + r() * 0.6) * s); G.add(m); } }
  else if (kind === 'pine') { G.add(cyl(0.15 * s, 0.22 * s, 2.2 * s, '#5d4330', x, 1.1 * s, z, 6)); const c = r() < 0.5 ? '#2f6b3a' : '#3b7a42'; for (let k = 0; k < 3; k++) G.add(mesh(new THREE.ConeGeometry((2.2 - k * 0.55) * s, 3.2 * s, 9), c, x, (2.6 + k * 1.8) * s, z)); }
  else if (kind === 'palm') { const h = (7 + r() * 3) * s, lean = (r() - 0.5) * 0.25; const tr = cyl(0.18 * s, 0.26 * s, h, '#9b7b55', x, h / 2, z, 7); tr.rotation.z = lean; G.add(tr); const tx = x - Math.sin(lean) * h / 2 * 2 * 0.5;
    for (let k = 0; k < 8; k++) { const f = mesh(new THREE.BoxGeometry(0.5 * s, 0.06, 3.6 * s), '#3f8f3a', tx, h - 0.2, z); f.geometry.translate(0, 0, 1.8 * s); f.rotation.set(0, k / 8 * TAU, 0); f.rotateX(0.45); G.add(f); } }
  else if (kind === 'cactus') { const h = (3 + r() * 2) * s; G.add(cyl(0.28 * s, 0.3 * s, h, '#4f8a3a', x, h / 2, z, 8)); for (const sd of [-1, 1]) if (r() < 0.8) { const a = cyl(0.18 * s, 0.18 * s, 1.4 * s, '#4f8a3a', x + sd * 0.7 * s, h * 0.55 + 0.7 * s, z, 7); G.add(a); G.add(mesh(new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.7 * s, 7).rotateZ(Math.PI / 2), '#4f8a3a', x + sd * 0.38 * s, h * 0.5, z)); } }
}

// ---------- buildings ----------
function building(G, st, R, s, side, dist, w, d, floors, rng, opt = {}) {
  const fac = st.facades[(rng() * st.facades.length) | 0], night = !!st.night;
  const FH = opt.tower ? 3.6 : 3.3, CW = opt.tower ? 3.2 : 3.4, h = floors * FH + (opt.tower ? 0 : 1.2);
  const ft = facadeTex(opt.towerFac || fac, (rng() * 6) | 0, night);
  const m = STD(0xffffff, { map: ft.map, roughness: (opt.towerFac || fac).kind === 'glass' ? 0.25 : 0.85, metalness: (opt.towerFac || fac).kind === 'glass' ? 0.35 : 0, emissive: night ? 0xffffff : 0, emissiveMap: ft.em, emissiveIntensity: night ? 0.9 : 0 });
  const grp = new THREE.Group(); const c = R.p(s, side * (dist + d / 2)); grp.position.copy(c); grp.rotation.y = R.yaw(s);
  const shop = !opt.tower && st.shop && opt.shop !== false;
  const y0 = shop ? 4.2 : 0;
  const walls = new THREE.Mesh(wallsGeo(w, h - y0, d, CW, FH, y0), m); walls.castShadow = walls.receiveShadow = true; grp.add(walls);
  if (shop) { const sm = shopTex(st.shop, (rng() * 5) | 0, st.shop.names, night); const mt = STD(0xffffff, { map: sm.map, roughness: 0.6, emissive: night ? 0xffffff : 0, emissiveMap: sm.em, emissiveIntensity: night ? 1.2 : 0 });
    const g = wallsGeo(w, 4.2, d, 2, 1.05, 0); { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 1); } const sh = new THREE.Mesh(g, mt); sh.castShadow = sh.receiveShadow = true; grp.add(sh);
    if (rng() < 0.6) { const aw = mesh(new THREE.BoxGeometry(w * 0.9, 0.12, 1.6), ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6d4c41'][(rng() * 5) | 0], 0, 3.3, -side * (d / 2 + 0.8)); aw.rotation.x = side * 0.25; grp.add(aw); } }
  // roofs
  const rc = { flat: '#8a8d92', parapet: fac.wall, tile: '#b8573a', mansard: '#5d6670' }[st.roof] || '#8a8d92';
  if (st.roof === 'tile' && !opt.tower) { const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.72, Math.min(w, d) * 0.35, 4, 1), lam(rc)); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); rf.position.y = h + Math.min(w, d) * 0.175; rf.castShadow = true; grp.add(rf); }
  else if (st.roof === 'mansard' && !opt.tower) { const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.71, 1, 4, 1), lam(rc)); rf.rotation.y = Math.PI / 4; rf.scale.set(w * 1.0, 3.2, d * 1.0); rf.position.y = h + 1.6; rf.castShadow = true; grp.add(rf);
    for (let k = -1; k <= 1; k++) grp.add(box(1.2, 1.4, 0.8, '#e9e4da', k * w * 0.3, h + 1.5, -side * (d / 2 - 0.2))); grp.add(box(w * 0.6, 0.12, d * 0.42, rc, 0, h + 3.25, 0)); }
  else { grp.add(box(w, 0.3, d, rc, 0, h + 0.15, 0)); if (st.roof === 'parapet' || !opt.tower) grp.add(box(w + 0.2, 0.6, 0.25, fac.wall, 0, h + 0.3, -side * d / 2));
    if (rng() < 0.6) grp.add(box(1.6, 1.2, 1.4, '#a5a9ae', (rng() - 0.5) * w * 0.5, h + 0.9, (rng() - 0.5) * d * 0.4));
    if (opt.tower && rng() < 0.5) grp.add(box(w * 0.5, 4, d * 0.5, '#6f747a', 0, h + 2, 0)); }
  if (night && opt.tower && rng() < 0.7) { const col = ['#ff2d95', '#00e5ff', '#ffea00', '#7c4dff', '#ff3d00'][(rng() * 5) | 0]; const nm = STD(0x000000, { emissive: col, emissiveIntensity: 2.2 }); grp.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.25, d + 0.1), nm, 0, h - 0.2, 0, false)); }
  G.add(grp); return h;
}

// vertical neon signs (Japan / China), pointing to the street
function neonSign(G, R, s, side, dist, h, text, col, rng) {
  const t = cached('vsign' + text + col, () => canvasTex(128, 512, (x, w, hh) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, hh); x.fillStyle = col; x.fillRect(6, 6, w - 12, hh - 12); x.fillStyle = '#fff'; x.font = `900 92px 'IPAGothic', 'WenQuanYi Zen Hei', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; const ch = [...text]; ch.forEach((c, i) => x.fillText(c, w / 2, (i + 0.5) * hh / ch.length)); }, true, false));
  const m = STD(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.4 }); const sg = mesh(new THREE.BoxGeometry(0.25, 4.5, 1.1), m, 0, 0, 0, false);
  const p = R.p(s, side * (dist - 0.8), h); sg.position.copy(p); sg.rotation.y = R.yaw(s) + Math.PI / 2; G.add(sg);
}

// ---------- landmarks ----------
function lattice(col) { return STD(col, { roughness: 0.6, metalness: 0.3, alphaTest: 0.5, side: THREE.DoubleSide, map: cached('lat' + col, () => canvasTex(128, 128, (x) => { x.clearRect(0, 0, 128, 128); x.strokeStyle = '#fff'; x.lineWidth = 9; x.beginPath(); x.moveTo(0, 0); x.lineTo(128, 128); x.moveTo(128, 0); x.lineTo(0, 128); x.stroke(); x.lineWidth = 12; x.strokeRect(0, 0, 128, 128); }, true, true)) }); }
export function landmark(type) {
  const g = new THREE.Group();
  if (type === 'eiffel' || type === 'tokyotower') { const col = type === 'eiffel' ? '#7a5c45' : '#e8442c', m = lattice(col), H = type === 'eiffel' ? 300 : 333;
    const prof = [[62, 0], [38, 57], [24, 115], [12, 180], [5, 260], [2, 300]];
    for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, 4, 3, true), m); seg.rotation.y = Math.PI / 4; seg.position.y = (y0 + y1) / 2; if (m.map) { m.map.repeat.set(4, 4); } g.add(seg);
      if (i < 3) { const pl = mesh(new THREE.BoxGeometry(r1 * 1.55, 3, r1 * 1.55), type === 'eiffel' ? '#6b4f3a' : '#f2f2f2', 0, y1, 0, false); g.add(pl); } }
    g.add(mesh(new THREE.CylinderGeometry(0.6, 1.2, 40, 6), col, 0, 320, 0, false)); if (type === 'tokyotower') { g.scale.setScalar(1.0); for (const y of [125, 225]) g.add(mesh(new THREE.BoxGeometry(18, 8, 18), '#f4f4f4', 0, y, 0, false)); } }
  if (type === 'bigben') { const st = '#d9c48f'; g.add(box(14, 70, 14, st, 0, 35, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(1.2, 70, 1.2, '#cdb57c', sx * 7, 35, sz * 7));
    const ct = canvasTex(256, 256, (x) => { x.fillStyle = '#d9c48f'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#f7f3e6'; x.beginPath(); x.arc(128, 128, 110, 0, TAU); x.fill(); x.strokeStyle = '#222'; x.lineWidth = 8; x.stroke(); x.lineWidth = 9; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 50); x.moveTo(128, 128); x.lineTo(185, 150); x.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.fillRect(128 + Math.cos(a) * 92 - 4, 128 + Math.sin(a) * 92 - 4, 8, 8); } }, true, false);
    g.add(mesh(new THREE.BoxGeometry(16, 16, 16), STD(0xffffff, { map: ct }), 0, 78, 0)); g.add(box(15, 8, 15, st, 0, 90, 0)); g.add(mesh(new THREE.ConeGeometry(10.5, 26, 4), '#3f4a52', 0, 107, 0)); g.children.at(-1).rotation.y = Math.PI / 4; g.add(cyl(0.4, 0.8, 10, '#c9a227', 0, 124, 0, 6));
    g.add(box(220, 26, 30, st, 125, 13, 0)); for (let i = 0; i < 12; i++) g.add(mesh(new THREE.ConeGeometry(2.4, 10, 4), '#3f4a52', 25 + i * 18, 31, -12)); }
  if (type === 'eye') { const m = std('#f2f2f2', 0.4, 0.5); const rim = new THREE.Mesh(new THREE.TorusGeometry(65, 1.4, 8, 90), m); g.add(rim); const rim2 = rim.clone(); rim2.position.z = 4; g.add(rim2);
    for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; const sp = mesh(new THREE.CylinderGeometry(0.25, 0.25, 65, 4), m, Math.cos(a) * 32.5, Math.sin(a) * 32.5, 2, false); sp.rotation.z = a + Math.PI / 2; g.add(sp); const cap = mesh(new THREE.SphereGeometry(2.2, 10, 8), STD(0xffffff, { roughness: 0.1, metalness: 0.4, color: '#dfefff' }), Math.cos(a) * 67, Math.sin(a) * 67, 2, false); cap.scale.set(1, 1, 1.4); g.add(cap); }
    for (const s of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(1.2, 1.6, 80, 6), m, s * 14, -30, 0, false); l.rotation.z = s * 0.2; g.add(l); } g.position.y = 70; const w = new THREE.Group(); w.add(g); return w; }
  if (type === 'tvtower') { g.add(cyl(4, 8, 200, '#cfd3d8', 0, 100, 0, 16)); g.add(mesh(new THREE.SphereGeometry(16, 24, 16), std('#b8c2cc', 0.3, 0.6), 0, 210, 0)); g.add(cyl(1.2, 2.5, 80, '#e04040', 0, 260, 0, 8)); }
  if (type === 'burj') { const m = STD(0xffffff, { map: facadeTex({ wall: '#9cc7e6', kind: 'glass', win: '#4f86b8', wall2: '#e0f2ff' }, 1).map, roughness: 0.2, metalness: 0.5 }); m.map.repeat.set(3, 40);
    const tiers = [[30, 0, 160], [24, 160, 300], [18, 300, 420], [12, 420, 520], [7, 520, 600], [3, 600, 680]];
    for (const [r, y0, y1] of tiers) { const t = mesh(new THREE.CylinderGeometry(r * 0.8, r, y1 - y0, 6), m, 0, (y0 + y1) / 2, 0); g.add(t); for (let k = 0; k < 3; k++) { const wg = mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.55, (y1 - y0) * 0.92, 6), m, Math.cos(k * TAU / 3) * r * 0.9, (y0 + y1) / 2 - (y1 - y0) * 0.04, Math.sin(k * TAU / 3) * r * 0.9); g.add(wg); } }
    g.add(cyl(0.8, 2.5, 140, '#cfd8e0', 0, 750, 0, 6)); }
  if (type === 'sail') { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(70, 120, 10, 320); s.lineTo(-5, 320); s.lineTo(-5, 0); s.closePath(); const sg = new THREE.ExtrudeGeometry(s, { depth: 40, bevelEnabled: false }); sg.translate(0, 0, -20); g.add(mesh(sg, std('#f4f7fa', 0.3, 0.2))); g.add(cyl(2, 2, 330, '#e6ebf0', -8, 165, 0, 8)); }
  if (type === 'taj') { const wm = std('#f6f3ec', 0.5, 0); g.add(box(90, 6, 90, '#e8e0cf', 0, 3, 0)); g.add(box(56, 34, 56, wm, 0, 23, 0)); g.add(cyl(13, 14, 10, wm, 0, 45, 0, 24)); const d = mesh(new THREE.SphereGeometry(18, 32, 20, 0, TAU, 0, Math.PI * 0.62), wm, 0, 50, 0); d.scale.set(1, 1.35, 1); g.add(d); g.add(cyl(0.6, 1.2, 14, '#c9a227', 0, 79, 0, 8));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.add(cyl(2.3, 3, 62, wm, sx * 40, 37, sz * 40, 12)); g.add(mesh(new THREE.SphereGeometry(3.2, 12, 8), wm, sx * 40, 70, sz * 40)); g.add(mesh(new THREE.SphereGeometry(6, 16, 10), wm, sx * 18, 42, sz * 18)); } }
  if (type === 'pagoda') { const rc = '#3a3f46', wc = '#b3262c'; for (let k = 0; k < 7; k++) { const w = 26 - k * 2.6, y = k * 10; g.add(box(w * 0.7, 8, w * 0.7, wc, 0, y + 4, 0)); const r = mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.78, 2.6, 4), rc, 0, y + 9, 0); r.rotation.y = Math.PI / 4; g.add(r); } g.add(cyl(0.5, 1, 14, '#c9a227', 0, 78, 0, 6)); }
  if (type === 'pearl') { g.add(cyl(3, 4, 300, '#d8d0d8', 0, 150, 0, 10)); for (const [y, r] of [[95, 25], [250, 15], [330, 6]]) g.add(mesh(new THREE.SphereGeometry(r, 24, 16), std('#d9387a', 0.3, 0.4), 0, y, 0)); for (let k = 0; k < 3; k++) { const l = cyl(2.2, 3, 110, '#d8d0d8', Math.cos(k * TAU / 3) * 18, 50, Math.sin(k * TAU / 3) * 18, 8); l.rotation.set(Math.sin(k * TAU / 3) * 0.18, 0, -Math.cos(k * TAU / 3) * 0.18); g.add(l); } g.add(cyl(0.6, 1.4, 60, '#d8d0d8', 0, 365, 0, 6)); }
  if (type === 'fuji') { const fm = std('#5b6a8a', 0.95, 0); g.add(mesh(new THREE.CylinderGeometry(120, 1700, 1300, 48, 1, true), fm, 0, 650, 0, false)); const sn = mesh(new THREE.CylinderGeometry(120, 560, 430, 48, 1, true), std('#f4f7fb', 0.8, 0), 0, 1085, 0, false); g.add(sn); }
  if (type === 'mountains') { for (let k = 0; k < 10; k++) { const r = 500 + (k * 137 % 400), h = 300 + (k * 211 % 400); g.add(mesh(new THREE.ConeGeometry(r, h, 7), std(k % 2 ? '#8a7a6a' : '#9c8670', 1, 0), (k - 5) * 700, h / 2 - 20, (k % 3) * 300, false)); } }
  if (type === 'church') { const wc = '#efe0c4'; g.add(box(24, 22, 50, wc, 0, 11, 0)); for (const sx of [-1, 1]) { g.add(box(8, 40, 8, wc, sx * 10, 20, 22)); g.add(mesh(new THREE.SphereGeometry(4.5, 16, 10, 0, TAU, 0, Math.PI / 2), '#d9a441', sx * 10, 40, 22)); } g.add(cyl(8, 8, 8, wc, 0, 26, -6, 16)); g.add(mesh(new THREE.SphereGeometry(8, 20, 12, 0, TAU, 0, Math.PI / 2), '#e0b14a', 0, 30, -6)); }
  if (type === 'sagrada') { const st = '#c9b48a'; g.add(box(60, 30, 40, st, 0, 15, 0)); for (let k = 0; k < 8; k++) { const h = 90 + (k % 4) * 18, x = (k % 4 - 1.5) * 13, z = k < 4 ? 18 : -18; g.add(cyl(2.5, 4.5, h, st, x, h / 2, z, 10)); g.add(mesh(new THREE.ConeGeometry(2.8, 14, 10), '#d9a441', x, h + 6, z)); } }
  if (type === 'gate') { const st = '#e3d6b8'; for (let k = 0; k < 6; k++) g.add(box(2.6, 22, 9, st, (k - 2.5) * 11.5, 11, 0)); g.add(box(66, 6, 11, st, 0, 25, 0)); g.add(box(12, 6, 4, '#4d6b4a', 0, 31, 0)); }
  if (type === 'turbine') { g.add(cyl(1.3, 2.4, 90, '#f2f2f2', 0, 45, 0, 10)); g.add(box(3, 3, 9, '#f2f2f2', 0, 91, 0)); const hub = new THREE.Group(); hub.position.set(0, 91, 4.8); for (let k = 0; k < 3; k++) { const b = mesh(new THREE.BoxGeometry(2.2, 42, 0.5), '#f7f7f7', 0, 21, 0, false); const h = new THREE.Group(); h.rotation.z = k * TAU / 3; h.add(b); hub.add(h); } g.add(hub); g.userData.hub = hub; }
  if (type === 'torii') { const rc = '#d8342a'; for (const s of [-1, 1]) g.add(cyl(0.6, 0.7, 12, rc, s * 6, 6, 0, 12)); g.add(box(17, 1.1, 1.4, '#222', 0, 12.4, 0)); g.add(box(14, 0.8, 1.0, rc, 0, 10, 0)); }
  if (type === 'skyline') {}
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}

// ---------- airport bits ----------
function runwayTex() { return cached('runway', () => canvasTex(1024, 1024, (x, w, h) => { const r = RNG(5); x.fillStyle = '#4b4e53'; x.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.07)'; x.fillRect(r() * w, r() * h, 2, 2); }
  for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(20,20,20,.25)'; x.fillRect(w * 0.42 + r() * w * 0.16, r() * h, 6 + r() * 10, 60 + r() * 140); }
  x.fillStyle = '#f4f4ee'; x.fillRect(w / 2 - 6, 0, 12, h * 0.5); x.fillRect(18, 0, 10, h); x.fillRect(w - 28, 0, 10, h); }, true, true)); }
export function hangar(G, p, yaw, col = '#c9ced4') { const g = new THREE.Group(); g.position.copy(p); g.rotation.y = yaw; const hm = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 36, 20, 1, false, -Math.PI / 2, Math.PI), std(col, 0.7, 0.3)); hm.rotation.x = Math.PI / 2; hm.rotation.y = 0; hm.rotation.z = Math.PI / 2; hm.scale.set(1, 1, 0.7); hm.castShadow = hm.receiveShadow = true; g.add(hm); g.add(box(26, 9, 0.4, '#3c4148', 0, 4.5, 18)); G.add(g); }
export function tower(G, p) { G.add(cyl(2.4, 3.2, 26, '#e8e8e8', p.x, 13, p.z, 12)); G.add(mesh(new THREE.CylinderGeometry(5.5, 4.2, 4.5, 8), GL(), p.x, 28, p.z)); G.add(cyl(5.8, 5.8, 0.6, '#d0d0d0', p.x, 30.6, p.z, 8)); }
const GL = () => cached('twglass', () => std('#3a6f95', 0.1, 0.6));
export function terminal(G, R, s, side, dist) { const p = R.p(s, side * dist); const g = new THREE.Group(); g.position.copy(p); g.rotation.y = R.yaw(s);
  const m = STD(0xffffff, { map: facadeTex({ wall: '#8fb8d8', kind: 'glass', win: '#3b6788', wall2: '#dff1ff' }, 3).map, roughness: 0.2, metalness: 0.4 }); g.add(mesh(wallsGeo(140, 16, 40, 3.2, 3.5), m, 0, 0, 0)); g.add(box(146, 1.4, 46, '#e9ecef', 0, 16.6, 0)); G.add(g); }

// =====================================================================================
// build a chapter world.  cfg: { style, S0, S1, turns, sections: [{ s0, s1, type }], road: { n, laneW }, center, landmarks, night, seed }
// =====================================================================================
export function buildWorld(cfg) {
  const st = STY[cfg.style], G = new THREE.Group(), R = new Route(cfg.S0, cfg.S1, cfg.turns || []), rng = RNG(cfg.seed || 11);
  const n = cfg.road.n, lw = cfg.road.laneW || 3.5, sh = cfg.road.shoulder ?? 0.8, med = cfg.road.median || 0;
  const W = n * lw + sh + med / 2;   // road half width
  const dyn = { turbines: [], glows: [], flash: [] };
  // road texture marks (u in metres from the left edge)
  const total = 2 * W, marks = [];
  for (const sd of [-1, 1]) { marks.push({ u: W + sd * (W - sh * 0.6), k: 'solid' }); for (let i = 1; i < n; i++) marks.push({ u: W + sd * (med / 2 + i * lw), k: 'dash' }); for (let i = 0; i < n; i++) marks.push({ u: W + sd * (med / 2 + (i + 0.5) * lw), k: 'track' }); }
  if (cfg.road.center === 'dyellow') marks.push({ u: W, k: 'double', c: '#f2c200' }); else if (cfg.road.center === 'white') marks.push({ u: W, k: 'dash' }); else if (cfg.road.center === 'solid') marks.push({ u: W, k: 'solid' });
  if (med) for (const sd of [-1, 1]) marks.push({ u: W + sd * (med / 2 + 0.25), k: 'solid', c: cfg.road.medC || '#f2c200' });
  const rmat = LAM(0xffffff, { map: roadTex(cfg.style + n + med + cfg.road.center, total, marks) });
  const gk = cfg.ground || st.ground, gmat = LAM(0xffffff, { map: groundTex(gk) }); gmat.map.repeat.set(1, 1);
  const vmat = LAM(0xffffff, { map: groundTex(gk === 'sand' ? 'sand' : gk === 'dirt' ? 'dirt' : gk === 'dry' ? 'dry' : 'grass') });
  const walk = LAM(0xffffff, { map: groundTex('walk') }), tarm = LAM(0xffffff, { map: groundTex('tarmac') });
  const rw = LAM(0xffffff, { map: runwayTex() });
  // ground: large plane 30 cm below the road (nothing coplanar with the road)
  { const c = R.p((cfg.S0 + cfg.S1) / 2); const gg = new THREE.PlaneGeometry(16000, 16000, 100, 100); gg.rotateX(-Math.PI / 2); const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 400, uv.getY(i) * 400);
    const gm = new THREE.Mesh(gg, gmat); gm.position.set(c.x, -0.3, c.z); gm.receiveShadow = true; G.add(gm); }
  // sections
  const secs = cfg.sections; const isTown = t => t === 'city' || t === 'town';
  for (const sc of secs) {
    const { s0, s1, type } = sc;
    if (type === 'runway') { G.add(ribbon(R, s0, s1, [[-24, 0, 0], [24, 0, 1]], rw, 60, 6)); G.add(ribbon(R, s0, s1, [[-34, -0.3, 0], [-24, 0, 1]], tarm, 16, 6)); G.add(ribbon(R, s0, s1, [[24, 0, 0], [34, -0.3, 1]], tarm, 16, 6));
      // threshold bars and runway lights
      for (const ss of [s0 + 20, s1 - 50]) for (let k = -7; k <= 7; k++) { if (Math.abs(k) < 1) continue; const p = R.p(ss, k * 2.6, 0.012); const d = mesh(new THREE.PlaneGeometry(1.4, 30).rotateX(-Math.PI / 2), STD(0xf4f4ee, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), p.x, p.y, p.z, false); d.rotation.y = R.yaw(ss); d.receiveShadow = true; G.add(d); }
      for (let s = s0; s < s1; s += 30) for (const sd of [-1, 1]) { const p = R.p(s, sd * 25.5, 0.15); G.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), STD(0xffffff, { emissive: 0xfff2c0, emissiveIntensity: cfg.night ? 2 : 0.6 }), p.x, p.y, p.z, false)); }
      continue; }
    if (type === 'apron') { G.add(ribbon(R, s0, s1, [[-60, 0, 0], [60, 0, 120 / 16]], tarm, 16, 6)); G.add(ribbon(R, s0, s1, [[-70, -0.3, 0], [-60, 0, 1]], tarm, 16, 6)); G.add(ribbon(R, s0, s1, [[60, 0, 0], [70, -0.3, 1]], tarm, 16, 6)); continue; }
    // normal road
    G.add(ribbon(R, s0, s1, [[-W, 0, 0], [W, 0, 1]], rmat, 16, 2));
    if (isTown(type)) {
      // sidewalks with curbs, interrupted at cross streets
      const gaps = []; for (let s = s0 + 60 + rng() * 40; s < s1 - 40; s += 85 + rng() * 50) { if ((cfg.reserve || []).some(([a, b]) => s > a - 25 && s < b + 25)) s += 40; gaps.push(s); }
      sc.gaps = gaps; let a = s0;
      for (const gs of [...gaps, s1 + 7]) { const b = gs - 7; if (b > a + 2) for (const sd of [-1, 1]) { const P = sd < 0 ? [[-W - 4.5, 0.15, 0], [-W, 0.15, 4.5 / 4], [-W, 0, 4.5 / 4 + 0.04]] : [[W, 0, 0], [W, 0.15, 0.04], [W + 4.5, 0.15, 4.5 / 4 + 0.04]]; G.add(ribbon(R, a, b, P, walk, 4, 2)); }
        if (gs <= s1) { for (const sd of [-1, 1]) G.add(ribbon(R, gs - 7, gs + 7, sd < 0 ? [[-W - 4.5, 0.15, 0], [-W, 0, 0.3]] : [[W, 0, 0], [W + 4.5, 0.15, 0.3]], rmat, 16, 2));
          // cross street (perpendicular), starts beyond the sidewalk line
          for (const sd of [-1, 1]) { const p0 = R.p(gs, sd * (W + 4.5)), p1 = R.p(gs, sd * (W + 90)); const len = p0.distanceTo(p1); const cg = new THREE.PlaneGeometry(14, len).rotateX(-Math.PI / 2); const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 16);
            const cm = new THREE.Mesh(cg, rmat); cm.position.copy(p0.clone().lerp(p1, 0.5)); cm.rotation.y = R.yaw(gs) + Math.PI / 2; cm.receiveShadow = true; G.add(cm);
            // zebra crossing on the main road edge
          }
          for (let k = -Math.floor(W / 1.2); k <= Math.floor(W / 1.2); k++) { const p = R.p(gs - 9, k * 1.2, 0.012); const z = mesh(new THREE.PlaneGeometry(0.6, 3.5).rotateX(-Math.PI / 2), cached('zebra', () => STD(0xf4f4ee, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })), p.x, p.y, p.z, false); z.rotation.y = R.yaw(gs); z.receiveShadow = true; G.add(z); }
          // traffic lights
          for (const sd of [-1, 1]) { const p = R.p(gs + sd * 9, sd * (W + 0.8)); G.add(cyl(0.1, 0.12, 5.2, '#2b2f34', p.x, 2.6, p.z, 6)); const arm = R.p(gs + sd * 9, sd * (W - 2.2)); const hb = box(0.45, 1.1, 0.4, '#1d2024', arm.x, 5.3, arm.z); hb.rotation.y = R.yaw(gs); G.add(hb); const ab = R.p(gs + sd * 9, sd * (W - 0.7)); const am = box(0.1, 0.1, 3.0, '#2b2f34', ab.x, 5.6, ab.z); am.rotation.y = R.yaw(gs) + Math.PI / 2; G.add(am);
            const lc = sd < 0 ? 0x22ff66 : 0xff2222; const l = mesh(new THREE.SphereGeometry(0.13, 8, 6), STD(lc, { emissive: lc, emissiveIntensity: 1.5 }), arm.x, 5.0, arm.z, false); G.add(l); } }
        a = gs + 7; }
      // buildings both sides
      for (const sd of [-1, 1]) { let s = s0 + 2; const fl = st.floors;
        while (s < s1 - 6) { const w = 10 + rng() * 14; const gap = gaps.find(g => s + w > g - 9 && s < g + 9); if (gap) { s = gap + 9.5; continue; }
          const rs = (cfg.reserve || []).find(([a, b, sd2]) => sd2 === sd && s + w > a && s < b); if (rs) { s = rs[1] + 0.5; continue; }
          const d = 12 + rng() * 10, floors = Math.round(fl[0] + rng() * (fl[1] - fl[0]));
          const h = building(G, st, R, s + w / 2, sd, W + 4.7, w, d, floors, rng);
          if (st.night && rng() < 0.6) neonSign(G, R, s + w * 0.3, sd, W + 4.7, 7 + rng() * Math.min(10, h - 9), st.shop.names[(rng() * st.shop.names.length) | 0], st.shop.signs[(rng() * st.shop.signs.length) | 0], rng);
          s += w + 0.3; }
        // second row of taller buildings
        for (let s2 = s0; s2 < s1; s2 += 30 + rng() * 25) { const fl2 = st.tower; if (rng() < 0.3) continue; building(G, st, R, s2, sd, W + 30 + rng() * 25, 16 + rng() * 14, 16 + rng() * 10, Math.round(fl2[0] + rng() * (fl2[1] - fl2[0]) * (type === 'city' ? 1 : 0.4)), rng, { tower: true, towerFac: st.towers[(rng() * st.towers.length) | 0] }); } }
      // street furniture: lamps, trees, hydrants, parked cars
      for (let s = s0 + 10; s < s1; s += 26) for (const sd of [-1, 1]) { if (sc.gaps.some(g => Math.abs(g - s) < 12)) continue; const p = R.p(s, sd * (W + 0.6)); G.add(cyl(0.08, 0.12, 7.5, st.lamp, p.x, 3.75, p.z, 6)); const ah = R.p(s, sd * (W - 0.6)); const arm = box(0.1, 0.1, 2.4, st.lamp, (p.x + ah.x) / 2, 7.5, (p.z + ah.z) / 2); arm.rotation.y = R.yaw(s) + Math.PI / 2; G.add(arm);
        const hd = mesh(new THREE.BoxGeometry(0.35, 0.15, 0.7), STD(0xfff6dd, { emissive: 0xffe2a8, emissiveIntensity: cfg.night ? 2.5 : 0.2 }), ah.x, 7.4, ah.z, false); hd.rotation.y = R.yaw(s); G.add(hd); if (cfg.night) { const gl = glow(0xffcf80, 6, 0.55); gl.position.set(ah.x, 7.2, ah.z); G.add(gl); } }
      for (let s = s0 + 5; s < s1; s += 13 + rng() * 6) for (const sd of [-1, 1]) { if (sc.gaps.some(g => Math.abs(g - s) < 10) || rng() < 0.35 || (cfg.reserve || []).some(([a, b, sd2]) => sd2 === sd && s > a - 3 && s < b + 3)) continue; const p = R.p(s, sd * (W + 3.6)); tree(G, st.tree[(rng() * st.tree.length) | 0] === 'cactus' ? 'round' : st.tree[0] === 'palm' && rng() < 0.4 ? 'round' : st.tree[0], p.x, p.z, 0.7 + rng() * 0.25, rng); }
      continue; }
    if (type === 'highway' || type === 'rural' || type === 'desert') {
      for (const sd of [-1, 1]) G.add(ribbon(R, s0, s1, sd < 0 ? [[-W - 4, -0.3, 0], [-W, 0, 0.25]] : [[W, 0, 0], [W + 4, -0.3, 0.25]], vmat, 4, 4));
      if (med) { G.add(ribbon(R, s0, s1, [[-0.3, 0, 0], [-0.2, 0.8, 0.3], [0.2, 0.8, 0.6], [0.3, 0, 1]], lam('#b9b6ae'), 4, 4)); }
      if (type === 'highway') { // sound walls + power poles with wires + pines (like the reference)
        for (const sd of [-1, 1]) { G.add(ribbon(R, s0, s1, sd < 0 ? [[-W - 6, 3.6, 0], [-W - 6, -0.3, 1]] : [[W + 6, -0.3, 0], [W + 6, 3.6, 1]], LAM(0xffffff, { map: cached('wallt', () => canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#d9d6cf'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 3, h); x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, h - 14, w, 14); })), side: THREE.DoubleSide }), 8, 4)); }
        const wire = new THREE.LineBasicMaterial({ color: 0x222222 }); let prev = null;
        for (let s = s0; s < s1; s += 45) { const p = R.p(s, W + 9); G.add(cyl(0.16, 0.22, 11, '#6b5a48', p.x, 5.5, p.z, 6)); const cb = box(2.6, 0.15, 0.15, '#6b5a48', p.x, 10.4, p.z); cb.rotation.y = R.yaw(s) + Math.PI / 2; G.add(cb);
          if (prev) for (const k of [-1, 1]) { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; const a = prev.clone().lerp(p, u); const off = R.at(s).rx * k * 1.1; pts.push(V3(a.x + off, 10.5 - Math.sin(u * Math.PI) * 0.9, a.z + R.at(s).rz * k * 1.1)); } G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire)); }
          prev = p; }
        for (let s = s0; s < s1; s += 9 + rng() * 9) for (const sd of [-1, 1]) { const p = R.p(s, sd * (W + 10 + rng() * 25)); tree(G, rng() < 0.4 ? 'pine' : st.tree[0] === 'cactus' ? 'round' : st.tree[0] === 'sakura' ? 'round' : st.tree[0], p.x, p.z, 0.9 + rng() * 0.6, rng); } }
      else { for (let s = s0; s < s1; s += 6 + rng() * 10) for (const sd of [-1, 1]) { if (type === 'desert' && rng() < 0.6) continue; const p = R.p(s, sd * (W + 7 + rng() * 40)); tree(G, st.tree[(rng() * st.tree.length) | 0], p.x, p.z, 0.8 + rng() * 0.6, rng); }
        // guard rails
        for (const sd of [-1, 1]) G.add(ribbon(R, s0, s1, sd < 0 ? [[-W - 1, 0.75, 0], [-W - 1, 0.45, 1]] : [[W + 1, 0.45, 0], [W + 1, 0.75, 1]], std('#c9cdd3', 0.4, 0.7), 4, 4)); }
      // lamps along highways
      for (let s = s0 + 20; s < s1; s += 50) for (const sd of med ? [0] : [-1, 1]) { const p = R.p(s, sd * (W + 1.5)); G.add(cyl(0.1, 0.14, 10, '#8b9097', p.x, 5, p.z, 6)); if (cfg.night) { for (const k of med ? [-1, 1] : [sd]) { const q = R.p(s, sd * (W + 1.5) - k * 2); const gl = glow(0xffd090, 6, 0.5); gl.position.set(q.x, 9.8, q.z); G.add(gl); } } }
      // buildings set back
      if (cfg.backdrop !== false) for (let s = s0; s < s1; s += 26 + rng() * 30) for (const sd of [-1, 1]) { if (rng() < 0.35) continue; const tw = rng() < (cfg.towerP ?? 0.35); building(G, st, R, s, sd, W + 45 + rng() * 80, 14 + rng() * 14, 14 + rng() * 12, tw ? Math.round(st.tower[0] + rng() * (st.tower[1] - st.tower[0])) : Math.round(st.floors[0] + rng() * 2), rng, tw ? { tower: true, towerFac: st.towers[(rng() * st.towers.length) | 0] } : { shop: false }); }
    }
  }
  // airport furniture at both ends
  const runs = secs.filter(s => s.type === 'runway');
  for (const r of runs) { const mid = (r.s0 + r.s1) / 2; hangar(G, R.p(mid - 300, 95), R.yaw(mid) + Math.PI / 2); hangar(G, R.p(mid - 230, 95), R.yaw(mid) + Math.PI / 2); tower(G, R.p(mid + 100, -110)); terminal(G, R, mid + 250, 1, 140);
    // fence
    for (const sd of [-1, 1]) G.add(ribbon(R, r.s0, r.s1, sd < 0 ? [[-150, 2.4, 0], [-150, -0.3, 1]] : [[150, -0.3, 0], [150, 2.4, 1]], LAM(0x9aa0a6, { transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, map: cached('fence', () => canvasTex(64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(64, 64); x.moveTo(64, 0); x.lineTo(0, 64); x.stroke(); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 4); })) }), 3, 6)); }
  // far skyline / countryside scatter so flights have something below
  const scat = cfg.scatter || 'town';
  for (let s = cfg.S0 - 600; s < cfg.S1 + 2600; s += 60) for (const sd of [-1, 1]) { for (let k = 0; k < 3; k++) { const d = 200 + rng() * 1400, p = R.p(s, sd * d);
    if (scat === 'forest' || (scat === 'mix' && rng() < 0.5)) { tree(G, rng() < 0.6 ? 'pine' : 'round', p.x, p.z, 2 + rng() * 2, rng); continue; }
    if (scat === 'desert') { if (rng() < 0.3) G.add(mesh(new THREE.SphereGeometry(30 + rng() * 40, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1.6, 0.25, 1), '#e3c38a', p.x, -1, p.z, false)); continue; }
    const tw = rng() < (cfg.skyP ?? 0.25), w = 18 + rng() * 22, h = tw ? 30 + rng() * (cfg.skyH || 90) : 8 + rng() * 14; const fac = tw ? st.towers[(rng() * st.towers.length) | 0] : st.facades[(rng() * st.facades.length) | 0]; const ft = facadeTex(fac, (rng() * 6) | 0, !!st.night);
    const m = cached('scm' + JSON.stringify(fac) + st.night, () => STD(0xffffff, { map: ft.map, roughness: 0.7, emissive: st.night ? 0xffffff : 0, emissiveMap: ft.em, emissiveIntensity: st.night ? 0.9 : 0 }));
    const b = new THREE.Mesh(wallsGeo(w, h, w, 3.4, 3.4), m); b.position.copy(p); b.rotation.y = rng() * 3; G.add(b); G.add(box(w, 0.4, w, '#8a8d92', p.x, h + 0.2, p.z)); } }
  // landmarks
  for (const L of cfg.landmarks || []) { const g = landmark(L.type); const p = R.p(L.s, L.d); g.position.set(p.x, L.y || 0, p.z); g.rotation.y = R.yaw(L.s) + (L.rot || 0); if (L.scale) g.scale.setScalar(L.scale); G.add(g); if (g.userData.hub) dyn.turbines.push(g.userData.hub); }
  for (const T of cfg.turbines || []) for (let k = 0; k < T.n; k++) { const g = landmark('turbine'); const p = R.p(T.s + k * T.ds, T.d + (k % 2) * 60); g.position.copy(p); g.rotation.y = R.yaw(T.s) + 0.3; G.add(g); dyn.turbines.push(g.children.at(-1)); }
  bake(G, o => !!o.userData.keep || dyn.turbines.some(h => isUnder(o, h)));
  return { G, R, W, n, lw, med, dyn, st };
}
const isUnder = (o, s) => { for (let p = o; p; p = p.parent) if (p === s) return true; return false; };
