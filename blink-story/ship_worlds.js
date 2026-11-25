// ---------- ship story worlds ----------
const DECK_Y = 28;
function hullCanvas() {
  return TEXC.hull ??= canvas(1024, 512, (g) => {
    const row = y => 512 - (y + 6) / 34 * 512;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#c8102e'; g.fillRect(0, row(0), 1024, 512 - row(0));
    g.fillStyle = '#1d3557'; g.fillRect(0, row(3.2), 1024, row(0.6) - row(3.2));
    g.fillStyle = '#ffd23f'; g.fillRect(0, row(3.6), 1024, 5);
    for (const yy of [8, 12.5]) for (let x = 30; x < 1024; x += 60) { const gr = g.createRadialGradient(x - 3, row(yy) - 3, 1, x, row(yy), 13); gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(1, '#1f4e7a'); g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(x, row(yy), 16, 0, PI * 2); g.fill(); g.fillStyle = gr; g.beginPath(); g.arc(x, row(yy), 12, 0, PI * 2); g.fill(); }
    for (let x = 10; x < 1024; x += 128) { const gr = g.createLinearGradient(0, row(22), 0, row(17.5)); gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(1, '#2f5f8f'); g.fillStyle = gr; g.fillRect(x, row(22), 108, row(17.5) - row(22)); }
    g.fillStyle = '#d5dae2'; g.fillRect(0, 0, 1024, row(26.6));
  });
}
function tierCanvas() {
  return TEXC.tier ??= canvas(512, 160, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 160);
    for (let i = 0; i < 4; i++) {
      const x = i * 128 + 10, gr = g.createLinearGradient(0, 20, 0, 140); gr.addColorStop(0, '#d6f0ff'); gr.addColorStop(0.6, '#5d9bd0'); gr.addColorStop(1, '#2c5f8e');
      g.fillStyle = gr; g.fillRect(x, 18, 108, 104);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x + 14, 18); g.lineTo(x + 40, 18); g.lineTo(x + 18, 122); g.lineTo(x - 8 + 10, 122); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(x + 52, 18, 5, 104);
      g.fillStyle = ['#ff8fab', '#ffd23f', '#06d6a0', '#4cc9f0'][i]; g.globalAlpha = 0.8; g.fillRect(x, 18, 16, 104); g.globalAlpha = 1;
      g.fillStyle = 'rgba(160,220,255,0.45)'; g.fillRect(x - 4, 92, 116, 40); g.fillStyle = '#c9ced6'; g.fillRect(x - 4, 90, 116, 4);
    }
    g.fillStyle = '#e3e7ed'; g.fillRect(0, 140, 512, 20);
  });
}
function makeShip(parent) {
  const G = new THREE.Group(); parent.add(G);
  const sh = new THREE.Shape(); sh.moveTo(-140, -30); sh.lineTo(90, -30); sh.quadraticCurveTo(140, -27, 156, 0); sh.quadraticCurveTo(140, 27, 90, 30); sh.lineTo(-140, 30); sh.quadraticCurveTo(-156, 30, -156, 0); sh.quadraticCurveTo(-156, -30, -140, -30);
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 34, bevelEnabled: false, curveSegments: 24 }); hg.rotateX(-PI / 2); hg.translate(0, -6, 0);
  const pos = hg.attributes.position, uv = hg.attributes.uv;
  for (const gr of hg.groups) for (let i = gr.start; i < gr.start + gr.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (gr.materialIndex === 1) uv.setXY(i, x / 68 + (z < 0 ? 0.37 : 0), (y + 6) / 34); else uv.setXY(i, x / 16, z / 16); }
  const hullM = new THREE.MeshStandardMaterial({ map: texRep(hullCanvas(), 1, 1), roughness: 0.45, metalness: 0.05, envMapIntensity: 0.9 });
  const deckM = pbr(TX.wood(), 1, 1, { rough: 0.6, bump: 0.6 });
  const hull = new THREE.Mesh(hg, [deckM, hullM]); hull.castShadow = hull.receiveShadow = true; G.add(hull);
  // railings
  const pts = sh.getSpacedPoints(160).map(p => V3(p.x * 0.985, 0, -p.y * 0.985));
  const railM = mat('#f2f4f7', { metal: 0.6, rough: 0.3 });
  for (const yy of [DECK_Y + 3.4, DECK_Y + 1.8]) mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(p.x, yy, p.z)), true), 400, 0.12, 6, true), railM, { parent: G, cast: false });
  for (let i = 0; i < pts.length; i += 2) cyl(0.09, 0.09, 3.4, null, { m: railM, x: pts[i].x, y: DECK_Y + 1.7, z: pts[i].z, parent: G, seg: 6, cast: false });
  // superstructure tiers
  const tm = sharedMat('tierM', () => new THREE.MeshStandardMaterial({ map: texRep(tierCanvas(), 1, 1), roughness: 0.4, envMapIntensity: 0.9 }));
  const roofM = pbr(TX.wood(), 1, 1, { rough: 0.6 });
  const tiers = [[-130, 70, 24, DECK_Y, 10], [-120, 55, 21, DECK_Y + 10, 9], [-100, 44, 17, DECK_Y + 19, 8]];
  for (const [x0, x1, hw, y0, h] of tiers) {
    const w = x1 - x0, gtier = boxUV(w, h, hw * 2, 32, 10);
    const m = new THREE.Mesh(gtier, [tm, tm, mat('#e9edf2', { rough: 0.6 }), tm, tm, tm]); m.position.set((x0 + x1) / 2, y0 + h / 2, 0); m.castShadow = m.receiveShadow = true; G.add(m);
    box(w + 1.2, 0.5, hw * 2 + 1.2, '#ffffff', { x: (x0 + x1) / 2, y: y0 + h + 0.25, z: 0, parent: G });
    const tp = [V3(x1 + 0.4, y0 + h + 3.2, -hw), V3(x1 + 0.4, y0 + h + 3.2, hw)];
    mesh(new THREE.TubeGeometry(new THREE.LineCurve3(tp[0], tp[1]), 4, 0.12, 6), railM, { parent: G, cast: false });
    for (let z = -hw; z <= hw; z += 2) cyl(0.08, 0.08, 3, null, { m: railM, x: x1 + 0.4, y: y0 + h + 1.75, z, parent: G, seg: 6, cast: false });
    mesh(new THREE.PlaneGeometry(0.1, 0.1), railM, { parent: G });
  }
  // terrace glass on tier-1 roof front
  mesh(new THREE.PlaneGeometry(hwT1() * 2, 2.6), new THREE.MeshPhysicalMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.3, roughness: 0.05 }), { x: 70.4, y: DECK_Y + 11.8, ry: PI / 2, parent: G, cast: false });
  // bridge
  box(22, 8, 56, '#ffffff', { x: 34, y: DECK_Y + 31, z: 0, parent: G, r: 0.4 });
  box(0.4, 3.2, 54, '#1f3b5c', { x: 45.1, y: DECK_Y + 32, z: 0, parent: G, rough: 0.1, metal: 0.4 });
  box(23, 0.6, 57, '#e3e7ed', { x: 34, y: DECK_Y + 35.3, z: 0, parent: G });
  sphere(2.4, '#ffffff', { x: 30, y: DECK_Y + 37.5, z: 0, parent: G }); cyl(0.3, 0.3, 14, '#c9ced6', { x: 24, y: DECK_Y + 42, z: 0, parent: G, metal: 0.7 });
  // funnels
  for (const fx of [-92, -60]) {
    const f = cyl(6.2, 7.4, 18, '#d62828', { x: fx, y: DECK_Y + 36, z: 0, parent: G, seg: 32, rough: 0.35 }); f.scale.z = 0.62; f.rotation.z = 0.08;
    const t = cyl(6.25, 6.25, 3, '#141414', { x: fx + 0.7, y: DECK_Y + 44, z: 0, parent: G, seg: 32 }); t.scale.z = 0.62; t.rotation.z = 0.08;
    const lg = posterTex((g) => { g.clearRect(0, 0, 128, 128); star(64, 64, 52, 22, '#ffffff', g); }, 128, 128);
    for (const s of [-1, 1]) plane(6, 6, lg, { x: fx - 0.3, y: DECK_Y + 35, z: s * 4.62, ry: s < 0 ? PI : 0, parent: G, depthWrite: false });
  }
  // lifeboats
  const lbM = mat('#ff7b00', { rough: 0.45 });
  for (const s of [-1, 1]) for (let x = -112; x <= 38; x += 25) { const lb = mesh(new THREE.CapsuleGeometry(1.7, 8, 8, 16), lbM, { x, y: DECK_Y + 6, z: s * 25.6, rz: PI / 2, parent: G }); lb.scale.set(1, 1, 0.8); box(8, 0.8, 3.2, '#ffffff', { x, y: DECK_Y + 7.4, z: s * 25.6, parent: G, r: 0.3 }); }
  // pool deck
  box(32, 0.6, 15, '#ffffff', { x: 112, y: DECK_Y + 0.3, z: 0, parent: G });
  const pw = mesh(new THREE.PlaneGeometry(30, 13), new THREE.MeshPhysicalMaterial({ color: '#2ec4f1', roughness: 0.05, emissive: '#0a6f9a', emissiveIntensity: 0.35, clearcoat: 1 }), { rx: -PI / 2, x: 112, y: DECK_Y + 0.62, z: 0, parent: G, cast: false });
  const umb = ['#ff4d6d', '#ffd23f', '#06d6a0', '#3a86ff', '#ff70a6', '#fb8500'];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = 99 + i * 9, z = s * 15.5;
    box(2.4, 0.5, 5.4, '#ffffff', { x, y: DECK_Y + 1.3, z, parent: G, r: 0.2 }); box(2.4, 2.2, 0.5, '#ffffff', { x, y: DECK_Y + 2.4, z: z + s * 2.6, rx: s * 0.5, parent: G, r: 0.2 });
    box(2.2, 0.25, 4.8, umb[(i + (s > 0 ? 2 : 0)) % 6], { x, y: DECK_Y + 1.62, z, parent: G, r: 0.1 });
    for (const sx of [-0.9, 0.9]) cyl(0.08, 0.08, 1.1, '#c9ced6', { x: x + sx, y: DECK_Y + 0.55, z, parent: G, seg: 6 });
    if (i % 2 === 0) { cyl(0.12, 0.12, 6.5, '#ffffff', { x: x + 4.5, y: DECK_Y + 3.25, z: s * 11.5, parent: G, seg: 8 }); cone(4.2, 1.8, umb[(i + 1 + (s > 0 ? 3 : 0)) % 6], { x: x + 4.5, y: DECK_Y + 6.9, z: s * 11.5, parent: G, seg: 12 }); }
  }
  
  // bow mast + flags
  cyl(0.3, 0.4, 24, '#ffffff', { x: 140, y: DECK_Y + 12, z: 0, parent: G });
  const flagCols = ['#e63946', '#ffd23f', '#06d6a0', '#3a86ff', '#ff70a6'];
  for (let i = 0; i < 10; i++) { const t = i / 10; const x = lerp(140, 64, t), y = lerp(DECK_Y + 23, DECK_Y + 10.5, t) - Math.sin(t * PI) * 2.5; const f = mesh(new THREE.ConeGeometry(0.7, 1.6, 3), mat(flagCols[i % 5], { rough: 0.8 }), { x, y, z: 0, rx: PI, parent: G, cast: false }); }
  // hatch door on tier-1 front (captain's private stairs)
  box(0.4, 7.4, 4.6, '#ffffff', { x: 70.2, y: DECK_Y + 3.7, z: -12, parent: G });
  box(0.3, 6.6, 3.8, '#2b2f3a', { x: 70.45, y: DECK_Y + 3.3, z: -12, parent: G, rough: 0.6 });
  return { group: G, hull, pool: pw };
}
function hwT1() { return 24; }
function seaWater(scene, size, seg, center = [0, 0]) {
  const wm = new THREE.MeshPhysicalMaterial({ color: '#0a8ad1', roughness: 0.06, metalness: 0.05, transparent: true, opacity: 0.95, envMapIntensity: 1.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const wg = new THREE.PlaneGeometry(size, size, seg, seg); wg.rotateX(-PI / 2); wg.translate(center[0], 0, center[1]);
  const base = wg.attributes.position.array.slice();
  mesh(wg, wm, { parent: scene, cast: false });
  mesh(new THREE.PlaneGeometry(6000, 6000), wm, { rx: -PI / 2, y: -0.45, parent: scene, cast: false });
  return (T, flow = 0) => {
    const p = wg.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = base[i] + flow * T, z = base[i + 2]; p[i + 1] = Math.sin(x * 0.11 + T * 1.5) * 0.55 + Math.cos(z * 0.15 + T * 1.2) * 0.45 + Math.sin((x + z) * 0.42 + T * 2.6) * 0.13 + Math.sin(x * 0.8 - z * 0.6 + T * 4) * 0.04; }
    wg.attributes.position.needsUpdate = true; wg.computeVertexNormals();
  };
}
function islandGroup(scene, x, z, s = 1) {
  const G = new THREE.Group(); G.position.set(x, 0, z); G.scale.setScalar(s); scene.add(G);
  sphere(140, '#ffe2a6', { parent: G, y: -16 }).scale.set(1, 0.16, 0.7);
  const m = new THREE.Mesh(mountainGeo(110, 12, 70, 3, ['#3d8a3a', '#5ea24e', '#8cc47a']), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); m.position.set(20, 30, 0); m.scale.set(1, 1, 0.6); G.add(m);
  const R = rng(66); for (let i = 0; i < 18; i++) { const a = R() * PI * 2, r = 100 + R() * 25; palm(G, Math.cos(a) * r, 2, Math.sin(a) * r * 0.6, 2.4, R); }
  return G;
}
function makeSea() {
  const scene = new THREE.Scene(); const R = rng(31);
  skyDome(scene, { top: '#1f7ae0', mid: '#5ab3f2', hor: '#e2f6ff', low: '#2f8fd0', sun: [0.8, 0.34], envI: 0.9 });
  scene.fog = new THREE.Fog('#d9f0ff', 260, 2200);
  lights(scene, { hemi: 1.0, sun: 2.4, sunPos: [140, 110, 60], target: [95, 28, 0], shadow: 70 });
  const cl = cloudSprites(scene, R, 12);
  const water = seaWater(scene, 460, 150);
  const ship = makeShip(scene);
  const foamT = texRep(canvas(256, 64, (g) => { const Rf = rng(3); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + Rf() * 0.6})`; g.beginPath(); g.ellipse(Rf() * 256, 32 + (Rf() - 0.5) * 50 * Rf(), 6 + Rf() * 14, 1.5 + Rf() * 2, 0, 0, PI * 2); g.fill(); } }), 3, 1);
  const wake = mesh(new THREE.PlaneGeometry(320, 46), new THREE.MeshBasicMaterial({ map: foamT, transparent: true, opacity: 0.85, depthWrite: false }), { rx: -PI / 2, x: -315, y: 0.6, z: 0, parent: scene, cast: false });
  const bowT = foamT.clone(); bowT.needsUpdate = true;
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(70, 6), new THREE.MeshBasicMaterial({ map: bowT, transparent: true, opacity: 0.9, depthWrite: false }), { rx: -PI / 2, x: 120, y: 0.7, z: s * 27, ry: 0, rz: s * 0.22, parent: scene, cast: false });
  const island = islandGroup(scene, 900, -60, 1.2); island.visible = false;
  const sb = new THREE.Group(); scene.add(sb); sb.visible = false;
  return { scene, ship, island, speedboatSlot: sb, update: (T) => { water(T, 18); moveClouds(cl, T); foamT.offset.x = -T * 0.08; bowT.offset.x = T * 0.15; } };
}
function porthole(scene, x, y, z, r, view) {
  mesh(new THREE.TorusGeometry(r, 0.25, 12, 40), mat('#c9a227', { metal: 1, rough: 0.25 }), { x, y, z: z + 0.2, parent: scene });
  mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: view, toneMapped: false }), { x, y, z: z + 0.12, parent: scene, cast: false });
  mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.02 }), { x, y, z: z + 0.22, parent: scene, cast: false });
}
let seaViewT = null, nightSeaViewT = null;
function seaView() { return seaViewT ??= posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4aa8f0'); gr.addColorStop(0.55, '#d6f1ff'); gr.addColorStop(0.56, '#1f9ad6'); gr.addColorStop(1, '#0a5c96'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(70, 70, 18, 0, PI * 2); g.arc(92, 62, 22, 0, PI * 2); g.arc(114, 72, 16, 0, PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(20 + i * 40, 170 + (i % 3) * 20); g.lineTo(50 + i * 40, 170 + (i % 3) * 20); g.stroke(); } }, 256, 256); }
function nightSeaView() { return nightSeaViewT ??= posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0e1a4a'); gr.addColorStop(0.55, '#3a5aa8'); gr.addColorStop(0.56, '#13306a'); gr.addColorStop(1, '#0a1a40'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; for (let i = 0; i < 30; i++) g.fillRect((i * 53) % 256, (i * 37) % 130, 2, 2); g.fillStyle = '#fbf6de'; g.beginPath(); g.arc(180, 60, 22, 0, PI * 2); g.fill(); g.fillStyle = 'rgba(251,246,222,0.5)'; g.fillRect(150, 160, 60, 4); g.fillRect(160, 190, 40, 3); }, 256, 256); }
function interior(o) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(o.bg || '#e8f4ff');
  scene.environment = getRoomEnv(); scene.environmentIntensity = o.night ? 0.2 : 0.45;
  lights(scene, o.night ? { sky: '#9aa8ff', ground: '#403060', hemi: 0.55, sun: 0.35, sunCol: '#8899ff', sunPos: [-10, 18, 16], shadow: 22 } : { sky: '#ffffff', ground: '#f0d8c0', hemi: 1.1, sun: 1.7, sunPos: [-10, 18, 16], shadow: 22 });
  room(scene, { w: o.w, h: o.h, back: o.back, wall: o.wall, floorCol: o.floorCol });
  return scene;
}
function ceilLamps(scene, xs, y, z, on = true) { for (const x of xs) { box(4, 0.25, 1.6, '#fff', { x, y, z, parent: scene, em: '#fff6e0', emi: on ? 1.6 : 0.15, cast: false }); } }
function wainscot(scene, w, back, col) { box(w, 3.4, 0.25, col, { y: 1.7, z: back + 0.38, parent: scene, rough: 0.6 }); box(w, 0.3, 0.4, '#ffffff', { y: 3.45, z: back + 0.45, parent: scene }); }
function makeDining() {
  const scene = interior({ w: 44, h: 12, back: -7, wall: '#fff1d6', floorCol: '#ffe8cc' });
  wainscot(scene, 44, -7, '#9c6644');
  for (const x of [-14, -2, 10]) porthole(scene, x, 7, -6.75, 1.6, seaView());
  const chand = (x) => { sphere(1.2, '#fff', { x, y: 10, z: 0, parent: scene, em: '#ffe9b0', emi: 2, cast: false }); cyl(0.05, 0.05, 1.6, '#c9a227', { x, y: 11.2, z: 0, parent: scene }); };
  chand(-6); chand(8);
  const l = new THREE.PointLight('#ffe2b0', 80, 30); l.position.set(0, 9, 2); scene.add(l);
  for (const [x, z] of [[-6, 0], [9, -1]]) { cyl(3.7, 3.7, 0.25, '#ffffff', { x, y: 3.0, z, parent: scene, seg: 40, rough: 0.8 }); cyl(3.75, 3.75, 1.6, '#ffffff', { x, y: 2.2, z, parent: scene, seg: 40, rough: 0.9 }); cyl(0.5, 0.8, 2.2, '#7a4a2a', { x, y: 1.1, z, parent: scene }); }
  box(10, 4.2, 2.4, '#9c6644', { r: 0.12, x: 15, y: 2.1, z: -5.6, parent: scene }); for (let i = 0; i < 4; i++) sphere(0.5, ['#4cc9f0', '#ffffff', '#ff8fab', '#ffd23f'][i], { x: 11.5 + i * 2.3, y: 4.7, z: -5.6, parent: scene, rough: 0.2 });
  return { scene, update: () => {} };
}
function hazardCanvas() { return TEXC.haz ??= canvas(128, 128, (g) => { g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#1a1a1a'; for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + 128, 128); g.lineTo(i + 128, 128); g.fill(); } }); }
function secretDoor(scene, x, back) {
  const z = back + 0.3;
  mesh(new THREE.PlaneGeometry(5.6, 9), new THREE.MeshStandardMaterial({ map: texRep(hazardCanvas(), 2, 3.2) }), { x, y: 4.5, z: z + 0.05, parent: scene, cast: false });
  const dark = mesh(new THREE.PlaneGeometry(4.2, 7.8), new THREE.MeshBasicMaterial({ map: posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1b1f2a'); gr.addColorStop(1, '#05060a'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(255,255,255,0.07)'; for (let i = 0; i < 6; i++) g.fillRect(10, 150 + i * 18, 108, 6); }, 128, 256) }), { x, y: 3.9, z: z + 0.1, parent: scene, cast: false });
  const piv = new THREE.Group(); piv.position.set(x - 2.1, 0, z + 0.15); scene.add(piv);
  box(4.2, 7.8, 0.35, '#6c7584', { x: 2.1, y: 3.9, parent: piv, metal: 0.7, rough: 0.35 });
  cyl(0.5, 0.5, 0.2, '#c0c4cc', { x: 3.4, y: 3.9, z: 0.25, rx: PI / 2, parent: piv, metal: 1, rough: 0.2 });
  for (const yy of [2, 6]) box(3.8, 0.25, 0.1, '#8a94a3', { x: 2.1, y: yy, z: 0.2, parent: piv, metal: 0.8 });
  const sign = posterTex((g) => { g.fillStyle = '#c1121f'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ffffff'; g.font = '900 34px IB'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CAPTAIN ONLY', 128, 34); g.font = '800 24px IX'; g.fillText('KEEP OUT', 128, 70); }, 256, 96);
  plane(4.4, 1.65, sign, { x, y: 9.8, z: z + 0.12, parent: scene, transparent: false });
  return piv;
}
function makeCorridor(night) {
  const scene = interior({ w: 56, h: 11, back: -6, wall: '#f6ead8', floorCol: '#e8d2b8', night, bg: night ? '#141a33' : '#e8f4ff' });
  wainscot(scene, 56, -6, '#7a4a2a');
  const carpet = texRep(canvas(128, 128, (g) => { g.fillStyle = '#b3203a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.strokeRect(6, -10, 116, 148); g.fillStyle = 'rgba(255,210,63,0.35)'; g.beginPath(); g.arc(64, 64, 18, 0, PI * 2); g.fill(); }), 10, 1);
  mesh(new THREE.PlaneGeometry(56, 7), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }), { rx: -PI / 2, y: 0.03, z: 0.5, parent: scene, cast: false });
  for (const [x, n] of [[-20, '101'], [-8, '102']]) { box(4.6, 8.2, 0.3, '#ffffff', { x, y: 4.1, z: -5.7, parent: scene }); box(3.8, 7.6, 0.35, '#8b5a2b', { x, y: 3.8, z: -5.55, parent: scene, r: 0.08, rough: 0.5 }); sphere(0.2, '#e0b030', { x: x + 1.3, y: 3.8, z: -5.3, parent: scene, metal: 1 }); plane(1.4, 0.6, posterTex((g) => { g.fillStyle = '#c9a227'; g.fillRect(0, 0, 128, 56); g.fillStyle = '#3a2a10'; g.font = '800 36px IX'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 64, 30); }, 128, 56), { x, y: 6.4, z: -5.35, parent: scene, transparent: false }); }
  porthole(scene, 0, 6.6, -6.0, 1.3, night ? nightSeaView() : seaView());
  const door = secretDoor(scene, 8, -6);
  box(2.2, 11, 6, '#f6ead8', { x: 18.5, y: 5.5, z: -3, parent: scene }); box(2.3, 3.4, 6.1, '#7a4a2a', { x: 18.5, y: 1.7, z: -3, parent: scene });
  ceilLamps(scene, [-18, -6, 6, 20], 10.8, 0.5, !night);
  if (night) { const em = new THREE.PointLight('#ff3040', 30, 20); em.position.set(8, 10, -4); scene.add(em); sphere(0.4, '#ff3040', { x: 8, y: 10.4, z: -5.6, parent: scene, em: '#ff3040', emi: 3, cast: false }); }
  else { const l = new THREE.PointLight('#fff2d8', 70, 34); l.position.set(0, 9.5, 3); scene.add(l); }
  return { scene, door, update: () => {} };
}
function crate(parent, x, y, z, s = 1, fruitCol) {
  const G = new THREE.Group(); G.position.set(x, y, z); G.scale.setScalar(s); parent.add(G);
  const wm = mat('#c08a4f', { rough: 0.8 });
  for (const yy of [0.3, 1.3]) for (const sz of [-1, 1]) box(4, 0.7, 0.2, null, { m: wm, y: yy, z: sz * 1.4, parent: G });
  for (const yy of [0.3, 1.3]) for (const sx of [-1, 1]) box(0.2, 0.7, 2.8, null, { m: wm, y: yy, x: sx * 1.9, parent: G });
  box(3.8, 0.15, 2.6, null, { m: wm, y: 0.05, parent: G });
  const R = rng(Math.floor(x * 7 + z * 13 + 99));
  for (let i = 0; i < 12; i++) sphere(0.42, fruitCol || ['#e63946', '#ff9f1c', '#ffd23f', '#70e000'][i % 4], { x: -1.4 + (i % 4) * 0.95, y: 1.75 + R() * 0.2, z: -0.8 + Math.floor(i / 4) * 0.8, parent: G, rough: 0.35 });
  return G;
}
function banana(parent, x, y, z, rz = 0) { const c = new THREE.QuadraticBezierCurve3(V3(-0.6, 0.2, 0), V3(0, -0.3, 0), V3(0.6, 0.2, 0)); return mesh(new THREE.TubeGeometry(c, 12, 0.14, 8), mat('#ffd23f', { rough: 0.5 }), { x, y, z, rz, parent }); }
function grapes(parent, x, y, z) { for (let i = 0; i < 12; i++) { const r = Math.floor(i / 4); sphere(0.16, '#7b2cbf', { x: x + ((i % 4) - 1.5) * 0.22 * (1 - r * 0.25), y: y - r * 0.22, z: z + (i % 2) * 0.12, parent, rough: 0.3 }); } }
function watermelon(parent, x, y, z, ry = 0) { const G = new THREE.Group(); G.position.set(x, y, z); G.rotation.y = ry; parent.add(G); mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16, 1, false, 0, PI), mat('#ff4d6d', { rough: 0.5 }), { rx: PI / 2, parent: G }); mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 16, PI), mat('#2b9348'), { parent: G }); return G; }
function pineapple(parent, x, y, z) { sphere(0.45, '#d4a017', { x, y, z, parent, rough: 0.7 }).scale.y = 1.5; for (let i = 0; i < 6; i++) cone(0.12, 0.8, '#2b9348', { x: x + Math.cos(i) * 0.12, y: y + 0.95, z: z + Math.sin(i) * 0.12, rz: Math.cos(i) * 0.35, rx: Math.sin(i) * 0.35, parent }); }
function fruitSpread(parent, x, y, z) {
  const bowl = mesh(new THREE.SphereGeometry(1.3, 24, 12, 0, PI * 2, PI / 2, PI / 2), mat('#ffffff', { rough: 0.2 }), { x, y: y + 1.1, z, parent }); bowl.scale.y = 0.6;
  for (let i = 0; i < 6; i++) sphere(0.38, ['#e63946', '#ff9f1c', '#70e000', '#e63946', '#ffd23f', '#ff9f1c'][i], { x: x + Math.cos(i) * 0.6, y: y + 1.05 + (i % 2) * 0.3, z: z + Math.sin(i) * 0.6, parent, rough: 0.3 });
  banana(parent, x - 2.4, y + 0.2, z + 0.6, 0.2); banana(parent, x - 2.2, y + 0.25, z + 0.9, -0.1);
  grapes(parent, x + 2.4, y + 0.6, z + 0.4); watermelon(parent, x + 0.4, y + 0.3, z + 1.8, 0.3); watermelon(parent, x - 1.0, y + 0.3, z + 1.7, -0.4);
  pineapple(parent, x + 1.2, y + 0.65, z - 1.4);
}
function speedboat(parent, col = '#e63946') {
  const G = new THREE.Group(); parent.add(G);
  const s = new THREE.Shape(); s.moveTo(-8, -3); s.lineTo(3.5, -3); s.quadraticCurveTo(8, -2.6, 9.5, 0); s.quadraticCurveTo(8, 2.6, 3.5, 3); s.lineTo(-8, 3); s.lineTo(-8, -3);
  const hg = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 4, curveSegments: 20 }); hg.rotateX(-PI / 2);
  mesh(hg, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }), { parent: G });
  const s2 = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.38, bevelSegments: 2, curveSegments: 20 }); s2.rotateX(-PI / 2);
  mesh(s2, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1 }), { y: 2.55, parent: G });
  box(14, 0.2, 5, '#c08a4f', { x: -1.2, y: 2.8, parent: G, rough: 0.6 });
  const ws = box(0.15, 1.6, 4.6, '#bfe8ff', { x: 2.4, y: 3.9, rz: -0.45, parent: G, rough: 0.05, metal: 0.3 }); ws.material = new THREE.MeshPhysicalMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.45, roughness: 0.02 });
  for (const x of [-1.5, -4.5]) box(2, 1.4, 4, '#ffffff', { x, y: 3.6, parent: G, r: 0.4, rough: 0.6 });
  mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 20), mat('#222'), { x: 1.2, y: 4.2, ry: PI / 2, rz: 0.4, parent: G });
  box(1.6, 2.6, 1.4, '#1d1d1f', { x: -8.8, y: 2.6, parent: G, r: 0.3, rough: 0.4 }); cyl(0.25, 0.25, 2.2, '#2d2d34', { x: -9.1, y: 0.8, parent: G });
  return G;
}
function makeBasement(night) {
  const scene = interior({ w: 56, h: 13, back: -8, wall: '#cfe3e8', floorCol: '#b8c4cc', night, bg: night ? '#0c1020' : '#dfeff5' });
  const panel = canvas(256, 256, (g) => { g.drawImage(TX.metal().c1, 0, 0); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 4; g.strokeRect(2, 2, 252, 252); for (const [x, y] of [[16, 16], [240, 16], [16, 240], [240, 240]]) { g.fillStyle = '#9aa4b2'; g.beginPath(); g.arc(x, y, 6, 0, PI * 2); g.fill(); } });
  mesh(new THREE.PlaneGeometry(56, 13), new THREE.MeshStandardMaterial({ map: texRep(panel, 9, 2), metalness: 0.4, roughness: 0.45, color: '#d6e8ee' }), { y: 6.5, z: -7.7, parent: scene, cast: false });
  for (const [y, c] of [[11.5, '#e63946'], [10.6, '#3a86ff'], [12.2, '#ffd23f']]) cyl(0.35, 0.35, 56, c, { y, z: -6.8 + (y - 11) * 1.4, rz: PI / 2, parent: scene, metal: 0.6, rough: 0.3 });
  // string lights
  const bulbs = [];
  for (let i = 0; i < 18; i++) { const x = -26 + i * 3, y = 11.6 - Math.sin((i % 6) / 6 * PI) * 0.8; bulbs.push(sphere(0.22, '#fff', { x, y, z: -1, parent: scene, em: ['#ffd23f', '#ff70a6', '#06d6a0', '#4cc9f0'][i % 4], emi: night ? 0.4 : 2.5, cast: false })); }
  // fruit nook: table + crates
  const wood = mat('#9c6644', { rough: 0.5 });
  box(8, 0.45, 4.6, null, { m: wood, r: 0.12, x: -14, y: 3.0, z: 0.4, parent: scene });
  for (const [x, z] of [[-17.4, -1.4], [-10.6, -1.4], [-17.4, 2.2], [-10.6, 2.2]]) cyl(0.2, 0.2, 2.9, '#6b4a2a', { x, y: 1.45, z, parent: scene });
  fruitSpread(scene, -14, 3.22, 0.2);
  for (const [x, y, z] of [[-24, 0, -5.4], [-19.6, 0, -5.4], [-24, 2.2, -5.4], [-21.8, 4.4, -5.4], [-6, 0, -5.6]]) crate(scene, x, y, z, 1);
  // chairs
  for (const [x, z, ry] of [[-14, -2.8, 0], [-18.6, 0.6, PI / 2], [-9.4, 0.8, -PI / 2]]) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; scene.add(c); box(2.2, 0.3, 2.2, null, { m: wood, y: 2.0, parent: c }); box(2.2, 2.6, 0.3, null, { m: wood, y: 3.3, z: -1.0, parent: c }); for (const sx of [-0.9, 0.9]) for (const sz of [-0.9, 0.9]) cyl(0.1, 0.1, 2, '#6b4a2a', { x: sx, y: 1, z: sz, parent: c }); }
  // door to corridor (back wall, left)
  const dark = mesh(new THREE.PlaneGeometry(4.2, 7.8), new THREE.MeshBasicMaterial({ color: night ? '#05060c' : '#2a2f3a' }), { x: -3, y: 3.9, z: -7.6, parent: scene, cast: false });
  box(5, 8.4, 0.4, '#8a94a3', { x: -3, y: 4.2, z: -7.75, parent: scene, metal: 0.6 });
  dark.position.z = -7.5;
  const piv = new THREE.Group(); piv.position.set(-5.1, 0, -7.4); scene.add(piv); piv.rotation.y = 1.15;
  box(4.2, 7.8, 0.35, '#6c7584', { x: 2.1, y: 3.9, parent: piv, metal: 0.7, rough: 0.35 });
  // boat bay
  const bay = new THREE.Group(); bay.position.set(14, 0, -1); scene.add(bay);
  for (const sx of [-5, 0, 5]) box(1, 1.6, 7, '#5c677d', { x: sx, y: 0.8, parent: bay, metal: 0.6 });
  const boat = speedboat(bay); boat.position.y = 1.6;
  box(0.5, 11, 14, '#ffd23f', { x: 27.6, y: 5.5, z: -0.5, parent: scene });
  mesh(new THREE.PlaneGeometry(13, 10), new THREE.MeshStandardMaterial({ map: texRep(hazardCanvas(), 3, 0.5), metalness: 0.3, roughness: 0.5 }), { x: 27.3, y: 5.5, z: -0.5, ry: -PI / 2, parent: scene, cast: false });
  if (!night) { const l = new THREE.PointLight('#fff0d0', 90, 40); l.position.set(-8, 10, 4); scene.add(l); const l2 = new THREE.PointLight('#fff0d0', 60, 30); l2.position.set(14, 10, 4); scene.add(l2); }
  else { const l = new THREE.PointLight('#7080ff', 70, 50); l.position.set(6, 10, 4); scene.add(l); const l2 = new THREE.PointLight('#9fb0ff', 50, 30); l2.position.set(16, 9, 6); scene.add(l2); }
  return { scene, boat, update: (T) => { if (!night) bulbs.forEach((b, i) => b.material.emissiveIntensity = 2 + Math.sin(T * 3 + i) * 0.6); } };
}
function makeCabin() {
  const scene = interior({ w: 34, h: 11, back: -7, wall: '#cde7f7', floorCol: '#f2dcc4' });
  wainscot(scene, 34, -7, '#d98c4a');
  porthole(scene, 2, 6.8, -6.75, 1.7, seaView());
  const wood = mat('#b5794a', { rough: 0.55 });
  for (const y of [1.2, 6.0]) { box(9, 0.6, 4.8, null, { m: wood, x: -11.5, y, z: -3.8, parent: scene, r: 0.1 }); box(8.6, 0.7, 4.4, '#ffffff', { x: -11.5, y: y + 0.6, z: -3.8, parent: scene, r: 0.3 }); box(8.6, 0.4, 3.0, y < 3 ? '#4f86f7' : '#ff8fab', { x: -10.8, y: y + 1.05, z: -3.3, parent: scene, r: 0.2 }); box(2.2, 0.6, 3.6, '#fffaf0', { x: -15, y: y + 1.15, z: -3.8, parent: scene, r: 0.3 }); }
  for (const sx of [-15.8, -7.2]) box(0.5, 9, 0.5, null, { m: wood, x: sx, y: 4.5, z: -1.6, parent: scene }); for (const sx of [-15.8, -7.2]) box(0.5, 9, 0.5, null, { m: wood, x: sx, y: 4.5, z: -6.0, parent: scene });
  box(0.3, 3.6, 0.3, null, { m: wood, x: -7.2, y: 8.2, z: -1.6, parent: scene });
  box(6, 0.4, 3.6, null, { m: wood, x: 10.5, y: 3.0, z: -4.2, parent: scene, r: 0.1 }); for (const [x, z] of [[8, -5.6], [13, -5.6], [8, -2.8], [13, -2.8]]) cyl(0.18, 0.18, 2.9, '#7a4a2a', { x, y: 1.45, z, parent: scene });
  cyl(0.8, 0.8, 0.15, '#ffffff', { x: 10, y: 3.3, z: -4.2, parent: scene }); cyl(0.3, 0.35, 0.8, '#ff70a6', { x: 12, y: 3.6, z: -4.4, parent: scene });
  const pic = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#5ab3f2'); gr.addColorStop(0.6, '#d6f1ff'); gr.addColorStop(0.61, '#1f9ad6'); gr.addColorStop(1, '#0a5c96'); g.fillStyle = gr; g.fillRect(0, 0, 160, 128); g.fillStyle = '#fff'; g.fillRect(40, 55, 80, 22); g.fillStyle = '#c8102e'; g.fillRect(40, 77, 80, 8); g.fillStyle = '#d62828'; g.fillRect(70, 38, 12, 18); }, 160, 128);
  box(4.4, 3.6, 0.2, '#7a4a2a', { x: 10.5, y: 7.4, z: -6.7, parent: scene }); plane(3.8, 3.0, pic, { x: 10.5, y: 7.4, z: -6.58, parent: scene, transparent: false });
  cyl(6, 6, 0.06, '#ffd23f', { y: 0.04, z: 2, parent: scene, cast: false, seg: 48, rough: 1 }); cyl(4.2, 4.2, 0.08, '#ff9f1c', { y: 0.05, z: 2, parent: scene, cast: false, seg: 48, rough: 1 });
  const l = new THREE.PointLight('#fff2d8', 60, 30); l.position.set(0, 9.5, 4); scene.add(l);
  ceilLamps(scene, [-4, 6], 10.8, 1);
  return { scene, update: () => {} };
}
function makeBridge() {
  const scene = interior({ w: 34, h: 11, back: -7, wall: '#f2f4f7', floorCol: '#d0d6de' });
  const view = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#3a9cf0'); gr.addColorStop(0.58, '#d9f2ff'); gr.addColorStop(0.59, '#1f9ad6'); gr.addColorStop(1, '#0a5c96'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#ffe2a6'; g.beginPath(); g.ellipse(620, 150, 120, 10, 0, 0, PI * 2); g.fill(); g.fillStyle = '#3d8a3a'; g.beginPath(); g.moveTo(520, 150); g.quadraticCurveTo(600, 70, 700, 150); g.fill(); g.fillStyle = '#5ea24e'; g.beginPath(); g.moveTo(560, 150); g.quadraticCurveTo(640, 95, 730, 150); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; for (const [x, y, r] of [[200, 60, 20], [225, 52, 26], [250, 62, 18], [820, 40, 16], [840, 34, 20]]) { g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); } }, 1024, 256);
  mesh(new THREE.PlaneGeometry(30, 7.5), new THREE.MeshBasicMaterial({ map: view, toneMapped: false }), { y: 6.2, z: -6.65, parent: scene, cast: false });
  for (let i = 0; i <= 5; i++) box(0.35, 7.8, 0.4, '#ffffff', { x: -15 + i * 6, y: 6.2, z: -6.45, parent: scene });
  box(30.6, 0.4, 0.6, '#ffffff', { y: 10.1, z: -6.45, parent: scene }); box(30.6, 0.4, 0.8, '#ffffff', { y: 2.3, z: -6.4, parent: scene });
  box(22, 3.2, 2.6, '#2d3436', { y: 1.6, z: -4.6, parent: scene, r: 0.2, rough: 0.4 });
  const scr = posterTex((g) => { g.fillStyle = '#0b1b2b'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#3cf0a0'; g.lineWidth = 3; g.beginPath(); g.arc(70, 64, 46, 0, PI * 2); g.stroke(); g.beginPath(); g.moveTo(70, 64); g.lineTo(110, 40); g.stroke(); g.fillStyle = '#4cc9f0'; g.fillRect(150, 30, 80, 10); g.fillRect(150, 55, 60, 10); g.fillRect(150, 80, 70, 10); }, 256, 128);
  for (const x of [-7, 7]) mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }), { x, y: 3.3, z: -3.25, rx: -0.6, parent: scene, cast: false });
  const wheel = new THREE.Group(); wheel.position.set(0, 3.4, -2.4); wheel.scale.setScalar(0.7); scene.add(wheel);
  const wm = mat('#8b5a2b', { rough: 0.45 });
  mesh(new THREE.TorusGeometry(1.9, 0.16, 10, 40), wm, { parent: wheel });
  for (let i = 0; i < 8; i++) { const sp = new THREE.Group(); sp.rotation.z = i * PI / 4; wheel.add(sp); cyl(0.09, 0.09, 2.7, null, { m: wm, y: 1.35, parent: sp, seg: 8 }); cyl(0.13, 0.1, 0.8, null, { m: wm, y: 2.4, parent: sp, seg: 8 }); }
  cyl(0.45, 0.45, 0.4, '#c9a227', { rx: PI / 2, parent: wheel, metal: 1, rough: 0.25 });
  cyl(0.3, 0.4, 3.4, '#2d3436', { x: 0, y: 1.7, z: -3.0, parent: scene });
  const l = new THREE.PointLight('#fff2d8', 50, 30); l.position.set(0, 9, 4); scene.add(l);
  return { scene, wheel, update: () => {} };
}
function islandH(x, z) {
  let b = z > -12 ? Math.min(0.25 + (z + 12) * 0.05, 4.2) : Math.max(-6, -(-12 - z) * 0.22);
  b += smooth(70, 260, z) * fbm(x * 0.01 + 3, z * 0.01 + 7, 4) * 46;
  b += smooth(60, 200, Math.abs(x)) * smooth(0, 60, z) * fbm(x * 0.02, z * 0.02, 3) * 14;
  return b;
}
function makeIsland() {
  const scene = new THREE.Scene(); const R = rng(77);
  skyDome(scene, { top: '#1f7ae0', mid: '#5ab3f2', hor: '#e2f6ff', low: '#2f8fd0', sun: [0.25, 0.34], envI: 0.85 });
  scene.fog = new THREE.Fog('#d9f0ff', 200, 1600);
  lights(scene, { hemi: 1.0, sun: 2.4, sunPos: [-30, 70, 50], target: [0, 2, 10], shadow: 55 });
  const cl = cloudSprites(scene, R, 12);
  const g = new THREE.PlaneGeometry(900, 900, 180, 180); g.rotateX(-PI / 2); g.translate(0, 0, 300);
  const p = g.attributes.position, cols = [];
  const sand = new THREE.Color('#ffe2a6'), grass = new THREE.Color('#6cc24a'), deep = new THREE.Color('#e8c27a'), dg = new THREE.Color('#4f9a3a');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const y = islandH(x, z); p.setY(i, y); const t = smooth(22, 42, z + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 14); const c = (z < -12 ? deep.clone() : sand.clone()).lerp(grass, t).lerp(dg, smooth(120, 260, z) * 0.6); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: texRep(TX.sand().c1, 140, 140), bumpMap: texRep(TX.sand().c2, 140, 140, false), bumpScale: 1 }), { parent: scene, cast: false });
  const wm = new THREE.MeshPhysicalMaterial({ color: '#19b3d9', roughness: 0.05, transparent: true, opacity: 0.82, envMapIntensity: 1.2, clearcoat: 1 });
  const wg = new THREE.PlaneGeometry(500, 500, 120, 120); wg.rotateX(-PI / 2); wg.translate(0, 0, -240); const base = wg.attributes.position.array.slice();
  mesh(wg, wm, { parent: scene, cast: false }); mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshPhysicalMaterial({ color: '#0a8ad1', roughness: 0.06, envMapIntensity: 1.2 }), { rx: -PI / 2, y: -0.6, z: -3500, parent: scene, cast: false });
  // shoreline foam
  mesh(new THREE.PlaneGeometry(500, 3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), { rx: -PI / 2, y: 0.25, z: -13, parent: scene, cast: false });
  // pier
  const pw = pbr(TX.wood(), 1, 8, { rough: 0.7, color: '#d9a066' });
  mesh(geo(8, 0.6, 104), pw, { x: 0, y: 2.2, z: -60, parent: scene });
  for (let z = -10; z > -112; z -= 8) for (const s of [-1, 1]) cyl(0.35, 0.35, 8, '#7a4a2a', { x: s * 3.7, y: -1.5, z, parent: scene, seg: 10 });
  for (const s of [-1, 1]) mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V3(s * 3.8, 4.6, -8), V3(s * 3.8, 4.6, -112)), 4, 0.12, 6), mat('#7a4a2a'), { parent: scene });
  for (let i = 0; i < 3; i++) box(8, 0.5, 1.6, '#c08a4f', { x: 0, y: 1.6 - i * 0.55, z: -7.4 + i * 1.6, parent: scene });
  // palms + fruit trees
  const palms = [];
  for (const [x, z, s] of [[-14, 6, 1.0], [16, 3, 1.1], [-30, 14, 1.2], [32, 16, 0.95], [-48, 4, 1.15], [52, 6, 1.05], [-34, 30, 1.0], [40, 32, 1.2], [-64, 22, 1.1], [68, 26, 1.0], [-62, 50, 0.9], [44, 52, 1.1]]) palms.push(palm(scene, x, islandH(x, z), z, s, R));
  const fruitTrees = [];
  for (const [x, z] of [[18, 48], [-18, 58], [36, 72], [-40, 68], [4, 80]]) { const t = treeReal(scene, x, z, 0.9, R, ['#3f9a3c', '#4fb24c', '#5cbf55']); t.position.y = islandH(x, z); fruitTrees.push(t); for (let i = 0; i < 12; i++) sphere(0.55, ['#ff9f1c', '#e63946', '#ffd23f'][i % 3], { x: (R() - 0.5) * 8, y: 9 + (R() - 0.3) * 4, z: (R() - 0.5) * 7 + 1.5, parent: t, rough: 0.35 }); }
  for (let i = 0; i < 24; i++) { const x = (R() - 0.5) * 160, z = 20 + R() * 90; bush(scene, x, z, 0.9 + R() * 0.5, ['#4a9a3c', '#5cbf55', '#3f8f3a'][i % 3]); const b = scene.children[scene.children.length - 1]; }
  for (let i = 0; i < 30; i++) { const x = (R() - 0.5) * 120, z = 22 + R() * 70; sphere(0.45, ['#ff4d6d', '#ffd23f', '#ff70a6', '#c77dff', '#ffffff'][i % 5], { x, y: islandH(x, z) + 0.4, z, parent: scene, rough: 0.5, cast: false }); }
  for (let i = 0; i < 8; i++) { const x = (R() - 0.5) * 140, z = -4 + R() * 16; if (Math.abs(x) < 10) continue; const r = mesh(rockGeo(i + 40), mat('#a8a29a', { rough: 0.9 }), { x, y: islandH(x, z) + 0.3, z, parent: scene }); r.scale.set(1.5 + R() * 2, 1 + R(), 1.5 + R() * 2); }
  const shipHolder = new THREE.Group(); shipHolder.position.set(40, 0, -400); scene.add(shipHolder); makeShip(shipHolder);
  return { scene, palms, fruitTrees, update: (T) => { moveClouds(cl, T); palms.forEach((pl, i) => pl.rotation.z = Math.sin(T * 1.2 + i) * 0.015); const q = wg.attributes.position.array; for (let i = 0; i < q.length; i += 3) { const x = base[i], z = base[i + 2]; q[i + 1] = Math.sin(x * 0.12 + T * 1.4) * 0.3 + Math.cos(z * 0.16 + T * 1.1) * 0.25; } wg.attributes.position.needsUpdate = true; wg.computeVertexNormals(); } };
}
