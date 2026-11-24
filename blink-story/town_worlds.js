// ---------- town worlds ----------
const HOUSE_COLS = ['#f6d6a8', '#c9e4f2', '#f4c2c2', '#d4ecd0', '#fff1c1', '#e3d4f5', '#ffd8b1', '#cfe8e0'];
const ROOF_COLS = ['#b5523b', '#5a6b8c', '#7a4a3a', '#3f6e58', '#8c5a8c'];
const DOOR_COLS = ['#c1121f', '#1d4e89', '#2a9d8f', '#f4a261', '#6a4c93', '#e9c46a'];
function planeUV(w, h, su, sv) { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / su, uv.getY(i) * h / sv); return g; }
function shingleCanvas(col) { const k = 'sh' + col; return TEXC[k] ??= canvas(128, 128, (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 16) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y + 14, 128, 2); for (let x = ((y / 16) % 2) * 8; x < 128; x += 16) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, 2, 16); g.fillStyle = `rgba(255,255,255,${0.04 + ((x * 7 + y) % 5) * 0.015})`; g.fillRect(x + 2, y, 14, 14); } } }); }
function houseWinCanvas(night) {
  const k = 'hw' + night;
  return TEXC[k] ??= canvas(128, 160, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 160);
    const gr = g.createLinearGradient(0, 0, 0, 160);
    if (night) { gr.addColorStop(0, '#ffe6a8'); gr.addColorStop(1, '#f5b552'); } else { gr.addColorStop(0, '#e2f3ff'); gr.addColorStop(0.5, '#8cbde4'); gr.addColorStop(1, '#4b78a3'); }
    g.fillStyle = gr; g.fillRect(10, 10, 108, 140);
    if (!night) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(24, 10); g.lineTo(54, 10); g.lineTo(24, 150); g.lineTo(10, 150); g.lineTo(10, 70); g.fill(); }
    g.fillStyle = night ? 'rgba(255,236,210,0.6)' : 'rgba(255,255,255,0.88)'; g.fillRect(10, 10, 26, 140); g.fillRect(92, 10, 26, 140);
    g.fillStyle = '#ffffff'; g.fillRect(60, 10, 8, 140); g.fillRect(10, 72, 108, 7);
  });
}
let fenceM = null;
function fenceMat() { return fenceM ??= new THREE.MeshStandardMaterial({ map: texRep(canvas(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.fillStyle = '#ffffff'; g.fillRect(8, 10, 20, 54); poly([8, 10, 18, 0, 28, 10], '#ffffff', g); g.fillRect(0, 24, 64, 6); g.fillRect(0, 48, 64, 6); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(26, 10, 2, 54); }), 1, 1), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }); }
function fence(scene, x, z, w) { mesh(planeUV(w, 3, 2.6, 3), fenceMat(), { x, y: 1.5, z, parent: scene, cast: true }); }
function houseWinMat(night) { return sharedMat('hwm' + night, () => { const t = texRep(houseWinCanvas(night), 1, 1); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 }); if (night) { m.emissiveMap = t; m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = 0.95; } return m; }); }
function roofMat(rc) { return sharedMat('roof' + rc, () => new THREE.MeshStandardMaterial({ map: texRep(shingleCanvas(rc), 0.14, 0.14), roughness: 0.85 })); }
function prism(w, d, h) { const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.lineTo(-d / 2, 0); const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(PI / 2); return g; }
function houseReal(scene, x, zf, w, seed, night) {
  const R = rng(seed * 31 + 7);
  const col = HOUSE_COLS[seed % HOUSE_COLS.length], rc = ROOF_COLS[seed % ROOF_COLS.length], dc = DOOR_COLS[seed % DOOR_COLS.length];
  const d = 16, h = 14, zc = zf - d / 2;
  const wm = sharedMat('wall' + col, () => pbr(TX.plaster(col), 3, 2, { rough: 0.9, bump: 0.4 }));
  mesh(geo(w, h, d), wm, { x, y: h / 2, z: zc, parent: scene });
  box(w + 0.6, 0.6, d + 0.6, '#f2f2f2', { x, y: 0.3, z: zc, parent: scene });
  box(w + 0.8, 0.45, d + 0.8, '#ffffff', { x, y: h, z: zc, parent: scene });
  mesh(prism(w + 2, d + 2.4, 7.5), roofMat(rc), { x, y: h + 0.2, z: zc, parent: scene });
  box(2, 6, 2, '#a0523d', { x: x + w * 0.3, y: h + 5, z: zc - 3, parent: scene });
  const winM = houseWinMat(night), shut = shade(dc, 0.85);
  for (const [wx, wy] of [[-w * 0.3, 4.4], [w * 0.3, 4.4], [-w * 0.3, 10.4], [w * 0.3, 10.4], [0, 10.4]]) {
    mesh(new THREE.PlaneGeometry(3.2, 4), winM, { x: x + wx, y: wy, z: zf + 0.06, parent: scene, cast: false });
    if (wx !== 0) for (const s of [-1, 1]) box(1.1, 4.2, 0.2, shut, { x: x + wx + s * 2.25, y: wy, z: zf + 0.15, parent: scene, cast: false });
    box(4.0, 0.3, 0.6, '#ffffff', { x: x + wx, y: wy - 2.2, z: zf + 0.3, parent: scene, cast: false });
    if (wy < 6 && R() > 0.4) { box(3.8, 0.7, 0.8, '#7a4a2a', { x: x + wx, y: wy - 2.7, z: zf + 0.45, parent: scene, cast: false }); for (let k = 0; k < 5; k++) sphere(0.28, ['#ff4d6d', '#ffd60a', '#ff8fab', '#ffffff', '#c77dff'][(k + seed) % 5], { x: x + wx - 1.5 + k * 0.75, y: wy - 2.2, z: zf + 0.5, parent: scene, cast: false }); }
  }
  box(3.8, 7.2, 0.3, '#ffffff', { x, y: 4.1, z: zf + 0.1, parent: scene });
  box(3.0, 6.6, 0.35, dc, { r: 0.08, x, y: 3.9, z: zf + 0.2, parent: scene, rough: 0.5 });
  sphere(0.18, '#e0b030', { x: x + 1.05, y: 3.7, z: zf + 0.45, parent: scene, metal: 1, rough: 0.2 });
  box(5.6, 0.35, 2.6, '#ffffff', { x, y: 8.1, z: zf + 1.3, parent: scene });
  for (const s of [-1, 1]) cyl(0.16, 0.16, 7.7, '#ffffff', { x: x + s * 2.5, y: 4.1, z: zf + 2.4, parent: scene, seg: 12 });
  box(5.2, 0.5, 1.6, '#d8d8d8', { x, y: 0.25, z: zf + 0.8, parent: scene }); box(5.2, 0.25, 1.0, '#e4e4e4', { x, y: 0.12, z: zf + 2.0, parent: scene });
  if (night) { sphere(0.35, '#fff', { x: x + 2.4, y: 6.5, z: zf + 0.4, parent: scene, em: '#ffe2a0', emi: 3, cast: false }); }
  const pathLen = -24 - (zf + 2.5);
  mesh(new THREE.PlaneGeometry(3, Math.abs(pathLen)), sharedMat('pathM', () => pbr(TX.concrete(), 0.4, 1.5, { rough: 0.9 })), { rx: -PI / 2, x, y: 0.03, z: (zf + 2.5 - 24) / 2, parent: scene, cast: false });
  fence(scene, x - w / 4 - 1, -24.4, w / 2 - 2); fence(scene, x + w / 4 + 1, -24.4, w / 2 - 2);
  bush(scene, x - 4.2, zf + 1.4, 0.8); bush(scene, x + 4.2, zf + 1.4, 0.8);
  cyl(0.12, 0.12, 3.2, '#5c4033', { x: x + 2.4, y: 1.6, z: -25.2, parent: scene }); box(0.9, 0.8, 1.5, ['#1d4e89', '#c1121f', '#2d3436'][seed % 3], { r: 0.3, x: x + 2.4, y: 3.4, z: -25.2, parent: scene });
}
function townHall(scene, night) {
  const zf = -34, w = 46, h = 20, d = 20, zc = zf - d / 2;
  mesh(geo(w, h, d), pbr(TX.plaster('#f3ead8'), 5, 2, { rough: 0.85, bump: 0.4 }), { x: 0, y: h / 2, z: zc, parent: scene });
  const winM = houseWinMat(night);
  for (let i = 0; i < 4; i++) for (const wy of [5, 13.5]) { const wx = [-19, -14.5, 14.5, 19][i]; mesh(new THREE.PlaneGeometry(3, 4.6), winM, { x: wx, y: wy, z: zf + 0.06, parent: scene, cast: false }); box(3.8, 0.35, 0.6, '#ffffff', { x: wx, y: wy - 2.6, z: zf + 0.3, parent: scene, cast: false }); }
  for (let i = 0; i < 3; i++) box(32 - i * 2, 0.7, 5.5 - i * 1.5, '#e8e4dc', { x: 0, y: 0.35 + i * 0.7, z: zf + 2.75 - i * 0.75, parent: scene });
  const colM = mat('#fbfaf6', { rough: 0.6 });
  for (let i = 0; i < 6; i++) { const cx = -12.5 + i * 5; cyl(0.85, 0.95, 15.4, null, { m: colM, x: cx, y: 2.1 + 7.7, z: zf + 3.2, parent: scene, seg: 20 }); box(2.2, 0.5, 2.2, '#f2efe8', { x: cx, y: 17.6, z: zf + 3.2, parent: scene }); }
  box(32, 1.8, 7, '#f7f4ee', { x: 0, y: 18.7, z: zf + 2.7, parent: scene });
  const ped = prism(7, 32, 6); ped.rotateY(PI / 2); mesh(ped, mat('#f7f4ee', { rough: 0.6 }), { x: 0, y: 19.6, z: zf + 2.7, parent: scene });
  const sign = posterTex((g) => { g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#7a5a2a'; g.font = '900 46px IB'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TOWN HALL', 256, 34); }, 512, 64);
  plane(14, 1.75, sign, { x: 0, y: 18.7, z: zf + 6.22, parent: scene, transparent: false });
  const clock = posterTex((g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 124, 0, PI * 2); g.fill(); g.lineWidth = 10; g.strokeStyle = '#7a5a2a'; g.stroke(); g.fillStyle = '#333'; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; g.fillRect(128 + Math.cos(a) * 100 - 4, 128 + Math.sin(a) * 100 - 4, 8, 8); } g.lineCap = 'round'; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(180, 150); g.stroke(); }, 256, 256);
  mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshStandardMaterial({ map: clock, roughness: 0.5 }), { x: 0, y: 22, z: zf + 6.25, parent: scene, cast: false });
  cyl(7, 7, 4, '#f3ead8', { x: 0, y: h + 2, z: zc, parent: scene, seg: 32 });
  const dome = sphere(7, '#5fa89a', { x: 0, y: h + 4, z: zc, parent: scene, rough: 0.4, metal: 0.4 }); dome.scale.y = 0.85;
  cyl(0.2, 0.2, 6, '#c9a227', { x: 0, y: h + 13, z: zc, parent: scene, metal: 1 });
  box(4.4, 8, 0.4, '#5a3d2b', { r: 0.1, x: 0, y: 6.1, z: zf + 0.15, parent: scene });
  const flags = [];
  for (const s of [-1, 1]) { cyl(0.15, 0.15, 14, '#c0c4d0', { x: s * 21, y: 7, z: zf + 6, parent: scene, metal: 0.8 }); const fg = new THREE.PlaneGeometry(4.5, 2.8, 12, 1); const fl = mesh(fg, new THREE.MeshStandardMaterial({ color: s < 0 ? '#2a9d8f' : '#e76f51', side: THREE.DoubleSide, roughness: 0.8 }), { x: s * 21 + 2.25, y: 12.4, z: zf + 6, parent: scene }); flags.push(fl); }
  mesh(new THREE.PlaneGeometry(50, 10), sharedMat('plaza', () => pbr(TX.concrete(), 6, 1.25, { rough: 0.85, color: '#f1e6d6' })), { rx: -PI / 2, x: 0, y: 0.04, z: -29, parent: scene, cast: false });
  const wood = mat('#8b5a2b', { rough: 0.6 });
  box(16, 1.5, 5.2, '#7a1f2b', { r: 0.1, x: 0, y: 0.75, z: -26.1, parent: scene, rough: 0.8 });
  box(16.2, 0.2, 5.4, '#c9a227', { x: 0, y: 1.55, z: -26.1, parent: scene, metal: 0.8, rough: 0.3 });
  box(2.6, 3.4, 1.4, null, { m: wood, r: 0.12, x: 0, y: 3.2, z: -24.6, parent: scene });
  cyl(0.45, 0.45, 0.1, '#c9a227', { x: 0, y: 3.6, z: -23.85, rx: PI / 2, parent: scene, metal: 1, rough: 0.2 });
  cyl(0.05, 0.05, 1.4, '#222', { x: 0, y: 5.4, z: -24.6, rx: 0.4, parent: scene }); sphere(0.18, '#333', { x: 0, y: 6.05, z: -24.3, parent: scene, rough: 0.4 });
  const ban = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, '#1d3557'); gr.addColorStop(1, '#2b4c7e'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 96); g.fillStyle = '#ffd23f'; g.font = '900 52px IB'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SLEEP BY DAY  •  WORK BY NIGHT', 512, 52); }, 1024, 96);
  plane(15, 1.4, ban, { x: 0, y: 0.75, z: -23.47, parent: scene, transparent: false });
  return flags;
}
function makeTown(night) {
  const scene = new THREE.Scene(); const R = rng(night ? 51 : 50);
  if (!night) skyDome(scene, { top: '#2a7ee0', mid: '#69b4f2', hor: '#dff2ff', low: '#cfe6f5', sun: [0.83, 0.36], envI: 0.75 });
  else {
    skyDome(scene, { top: '#0e1a4a', mid: '#25428a', hor: '#6a86cc', low: '#33467a', sun: [0.82, 0.3], sunCol: 'rgba(235,240,255,1)', sunR: 110, stars: true, envI: 0.5 });
    mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: '#fbf6de', fog: false, toneMapped: false }), { x: -160, y: 260, z: -900, parent: scene, cast: false });
  }
  scene.fog = new THREE.Fog(night ? '#33487f' : '#d6eeff', 120, 650);
  lights(scene, night ? { sky: '#a9b8ff', ground: '#5a4f80', hemi: 1.25, sun: 1.2, sunCol: '#c4d0ff', sunPos: [-30, 50, 30], shadow: 45 } : { hemi: 0.95, sun: 2.3, sunPos: [35, 55, 40], shadow: 45 });
  mesh(new THREE.PlaneGeometry(1600, 1600), pbr(TX.grass(), 220, 220, { bump: 1 }), { rx: -PI / 2, y: -0.02, parent: scene, cast: false });
  const conc = (wd, dd) => pbr(TX.concrete(), wd / 8, dd / 8, { rough: 0.9, bump: 0.8 });
  mesh(geo(900, 0.3, 8), conc(900, 8), { y: 0.15, z: 0, parent: scene, cast: false });
  mesh(geo(900, 0.3, 6), conc(900, 6), { y: 0.15, z: -21, parent: scene, cast: false });
  for (const zc of [-4.2, -17.8]) box(900, 0.42, 0.6, '#e4e4e4', { y: 0.2, z: zc, parent: scene, cast: false });
  mesh(new THREE.PlaneGeometry(900, 14), pbr(TX.asphalt(), 90, 1.4, { rough: 0.85, bump: 0.6 }), { rx: -PI / 2, y: 0.02, z: -11, parent: scene, cast: false });
  const dash = texRep(canvas(64, 8, (g) => { g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 36, 8); }), 110, 1);
  mesh(new THREE.PlaneGeometry(900, 0.4), new THREE.MeshStandardMaterial({ map: dash, transparent: true, roughness: 0.6 }), { rx: -PI / 2, y: 0.05, z: -11, parent: scene, cast: false });
  for (let i = 0; i < 7; i++) mesh(new THREE.PlaneGeometry(1.3, 11), mat('#f4f4f4', { rough: 0.6 }), { rx: -PI / 2, x: -7.2 + i * 2.4, y: 0.05, z: -11, parent: scene, cast: false });
  const flags = townHall(scene, night);
  [-34, -60, -86, -112, 34, 60, 86, 112].forEach((x, i) => houseReal(scene, x, -34, 22, i + (x > 0 ? 3 : 0), night));
  const trees = [];
  for (let i = 0; i < 22; i++) { const x = -140 + i * 13 + R() * 6; trees.push(treeReal(scene, x, -62 - R() * 14, 1.1 + R() * 0.5, R)); }
  for (const x of [-20, 20, -47, 47]) { trees.push(treeReal(scene, x, 2.6, 0.95, R)); box(3.6, 0.35, 3.6, '#5a3d2b', { x, y: 0.2, z: 2.6, parent: scene, cast: false }); }
  const mm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  for (const [x, z, r, hh, sd] of [[-200, -520, 160, 70, 2], [160, -560, 200, 90, 5]]) { const m = new THREE.Mesh(mountainGeo(r, 10, hh, sd, ['#4f8f4a', '#6fae5f', '#8cc47a']), mm); m.position.set(x, hh / 2 - 4, z); scene.add(m); }
  for (const x of [-10, 10, -40, 40]) lampReal(scene, x, -3.6, night, false);
  carReal(scene, 26, -7, '#3a86ff', 0); carReal(scene, -46, -7, '#e63946', 0); carReal(scene, 72, -15, '#ffd23f', PI);
  bench(scene, -28, 2.6); hydrant(scene, 14, 2.8);
  const cl = night ? [] : cloudSprites(scene, R, 10);
  return { scene, update: (T) => { moveClouds(cl, T); trees.forEach((t, i) => t.userData.crown.rotation.z = Math.sin(T * 1.3 + i) * 0.02); flags.forEach((f, i) => { const p = f.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(x * 1.4 - T * 6 + i) * 0.25 * (x + 2.25) / 4.5); } p.needsUpdate = true; }); } };
}
function nightViewCanvas() {
  return TEXC.nightview ??= canvas(256, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#13205a'); gr.addColorStop(0.7, '#3d5aa8'); gr.addColorStop(1, '#2a3870'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#fff'; for (let i = 0; i < 30; i++) g.fillRect((i * 53) % 256, (i * 37) % 130, 2, 2);
    g.fillStyle = '#fbf6de'; g.beginPath(); g.arc(196, 60, 24, 0, PI * 2); g.fill();
    for (let i = 0; i < 5; i++) { const x = i * 56 - 10, hh = 60 + (i % 2) * 20; g.fillStyle = '#1d2550'; g.fillRect(x, 256 - hh, 48, hh); poly([x - 4, 256 - hh, x + 24, 226 - hh, x + 52, 256 - hh], '#1d2550', g); g.fillStyle = '#ffd98a'; g.fillRect(x + 10, 256 - hh + 14, 10, 12); g.fillRect(x + 28, 256 - hh + 14, 10, 12); }
  });
}
function makeHome(night) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(night ? '#2a2f55' : '#e8f4ff');
  scene.environment = getRoomEnv(); scene.environmentIntensity = night ? 0.25 : 0.45;
  lights(scene, night ? { sky: '#c4c8ff', ground: '#806090', hemi: 0.75, sun: 0.6, sunCol: '#aab8ff', sunPos: [-12, 18, 16], shadow: 18 } : { sky: '#ffffff', ground: '#f0d8c0', hemi: 1.1, sun: 1.9, sunPos: [-12, 18, 16], shadow: 18 });
  room(scene, { w: 38, h: 12, back: -7, wall: '#cfe8d6', floorCol: '#f2dcc4' });
  const dayView = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4fa6f0'); gr.addColorStop(0.62, '#cdeaff'); gr.addColorStop(0.63, '#7cc36a'); gr.addColorStop(1, '#4f9a45'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,0.9)'; for (const [x, y, r] of [[60, 60, 20], [84, 52, 26], [108, 62, 18]]) { g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); } g.fillStyle = '#f2c9a0'; g.fillRect(150, 110, 70, 60); poly([140, 110, 185, 80, 230, 110], '#b5523b', g); g.fillStyle = '#3d8a3a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(20 + i * 40, 160, 22, 0, PI * 2); g.fill(); } }, 256, 256);
  windowFrame(scene, -11, 6.6, -6.75, 7, 5.6, night ? ctex(nightViewCanvas()) : dayView);
  for (const s of [-1, 1]) curtain(scene, -11 + s * 5.2, 6.4, -6.2, 3, 8.4, '#f4a261');
  const wood = mat('#9c6644', { rough: 0.5 });
  box(7, 9, 1.8, null, { m: wood, r: 0.1, x: -1, y: 4.5, z: -6.0, parent: scene });
  const bc = ['#e63946', '#3a86ff', '#ffd23f', '#06d6a0', '#8338ec', '#ff70a6', '#fb5607'];
  for (let r = 0; r < 3; r++) { box(6.6, 0.2, 1.6, null, { m: wood, x: -1, y: 1.6 + r * 2.6, z: -5.6, parent: scene }); for (let i = 0; i < 11; i++) box(0.4, 1.6 + ((i + r) % 3) * 0.25, 1.1, bc[(i + r * 3) % 7], { x: -3.8 + i * 0.55, y: 2.5 + r * 2.6 + ((i + r) % 3) * 0.12, z: -5.5, parent: scene, rough: 0.6 }); }
  box(6, 4.2, 2.6, null, { m: wood, r: 0.12, x: 7, y: 2.1, z: -5.6, parent: scene });
  for (let r = 0; r < 2; r++) { box(5.4, 1.6, 0.15, '#b07a4f', { r: 0.05, x: 7, y: 1.2 + r * 1.9, z: -4.25, parent: scene }); sphere(0.16, '#e0b030', { x: 7, y: 1.2 + r * 1.9, z: -4.1, parent: scene, metal: 1, rough: 0.2 }); }
  box(1.6, 0.9, 1.1, '#7a1f2b', { r: 0.15, x: 6, y: 4.65, z: -5.6, parent: scene }); sphere(0.5, '#4cc9f0', { x: 8.2, y: 4.7, z: -5.6, parent: scene, rough: 0.1 });
  const clockT = posterTex((g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, PI * 2); g.fill(); g.lineWidth = 6; g.strokeStyle = '#333'; g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.moveTo(64, 64); g.lineTo(92, 76); g.stroke(); }, 128, 128);
  mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshStandardMaterial({ map: clockT }), { x: 7, y: 9, z: -6.7, parent: scene, cast: false });
  const sofa = mat('#e76f51', { rough: 0.95 });
  box(10, 2, 4, null, { m: sofa, r: 0.5, x: 14.5, y: 1.6, z: -3.8, parent: scene }); box(10, 3.2, 1.2, null, { m: sofa, r: 0.5, x: 14.5, y: 3.4, z: -5.4, parent: scene }); for (const s of [-1, 1]) box(1.2, 2.6, 4, null, { m: sofa, r: 0.5, x: 14.5 + s * 5, y: 2.2, z: -3.8, parent: scene });
  box(2.2, 1.6, 0.6, '#ffd23f', { r: 0.5, x: 12, y: 3.2, z: -4.6, rx: -0.2, parent: scene }); box(2.2, 1.6, 0.6, '#2a9d8f', { r: 0.5, x: 16.8, y: 3.2, z: -4.6, rx: -0.2, parent: scene });
  cyl(0.15, 0.15, 9, '#2d3436', { x: -17.5, y: 4.5, z: -4, parent: scene, metal: 0.7 }); cyl(1, 1.6, 1.6, '#fff', { x: -17.5, y: 9.5, z: -4, parent: scene, em: '#ffe1b0', emi: night ? 2 : 1, cast: false });
  const fl = new THREE.PointLight('#ffd7a0', night ? 140 : 40, 30); fl.position.set(-17, 8.6, -3); scene.add(fl);
  if (night) { const l2 = new THREE.PointLight('#ffd7a0', 90, 26); l2.position.set(6, 9, 4); scene.add(l2); }
  cyl(7.5, 7.5, 0.06, '#e9c46a', { y: 0.04, z: 1.5, parent: scene, cast: false, seg: 48, rough: 1 }); cyl(5.2, 5.2, 0.08, '#f4a261', { y: 0.05, z: 1.5, parent: scene, cast: false, seg: 48, rough: 1 });
  for (const [x, y, c] of [[-16, 8, '#ff70a6'], [12, 8.5, '#3a86ff']]) { box(2.6, 2, 0.2, '#2d2d34', { x, y, z: -6.65, parent: scene }); box(2.2, 1.6, 0.05, c, { x, y, z: -6.53, parent: scene }); }
  return { scene, update: () => {} };
}
