// ---------- story scenes ----------
const MAYOR = { skin: '#ffd23f', shirt: '#1d2b53', pants: '#1d2b53', hair: 'tophat', detail: 'sash', mustache: true, shoe: '#111111' };
const BOY = { skin: '#ffd23f', shirt: '#ff7f11', pants: '#2b50c8', hair: 'spiky', hairCol: '#5a3a1a', detail: 'stripe', detailCol: '#ffffff' };
const DAD = { skin: '#ffd23f', shirt: '#3a86ff', pants: '#5c4033', hair: 'flat', hairCol: '#3b2416', detail: 'plaid', detailCol: '#1d3557' };
const COP = { skin: '#c68642', shirt: '#1d3557', pants: '#14213d', hair: 'police', detail: 'badge', shoe: '#111111' };
const BS = 0.78;
const built = {}, worldsC = {};
const getWorld = (k, fn) => worldsC[k] ??= fn();
const W_ = {
  townD: () => getWorld('townD', () => makeTown(false)), townN: () => getWorld('townN', () => makeTown(true)),
  bedD: () => getWorld('bedD', () => makeBedroom(false)), bedN: () => getWorld('bedN', () => makeBedroom(true)),
  homeD: () => getWorld('homeD', () => makeHome(false)), homeN: () => getWorld('homeN', () => makeHome(true)),
};
function addRoot(w) { const g = new THREE.Group(); w.scene.add(g); return g; }
function getScene(key, fn) { return built[key] ??= fn(); }
function av(root, o) { const a = new Avatar(o); root.add(a.group); return a; }
const sackPts = [[0, 0], [1.1, 0.08], [1.55, 0.55], [1.65, 1.3], [1.4, 2.0], [0.75, 2.45], [0.38, 2.62], [0.5, 2.95], [0.6, 3.15], [0.01, 3.2]].map(([a, b]) => new THREE.Vector2(a, b));
let sackGeo = null, sackMat = null;
const goldM = () => sharedMat('goldM', () => new THREE.MeshPhysicalMaterial({ color: '#ffc94a', metalness: 1, roughness: 0.2, clearcoat: 0.5 }));
function makeSack(parent, s = 1, full = true) {
  const G = new THREE.Group(); parent.add(G);
  sackGeo ??= new THREE.LatheGeometry(sackPts, 24); sackMat ??= pbr(TX.burlap(), 3, 2, { rough: 0.95, bump: 2, color: '#d9c9a8' });
  mesh(sackGeo, sackMat, { parent: G });
  mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 20), mat('#7a5a2a'), { y: 2.62, rx: PI / 2, parent: G });
  if (full) { for (let i = 0; i < 4; i++) sphere(0.22, null, { m: goldM(), x: Math.cos(i * 1.7) * 0.25, y: 3.25 + (i % 2) * 0.15, z: Math.sin(i * 1.7) * 0.25, parent: G }); mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 24), goldM(), { y: 3.35, rx: 1.0, parent: G }); }
  G.scale.setScalar(s); return G;
}
function necklace(parent) { const G = new THREE.Group(); parent.add(G); mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 32), goldM(), { parent: G }); sphere(0.16, '#e63946', { y: -0.55, parent: G, rough: 0.05, em: '#7a0010', emi: 0.4 }); for (let i = 0; i < 6; i++) { const a = -PI / 2 + (i - 2.5) * 0.35; sphere(0.08, ['#4cc9f0', '#ffffff'][i % 2], { x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5, parent: G, rough: 0.05 }); } return G; }
function coinsPile(root, x, z, n, seed) { const R = rng(seed); for (let i = 0; i < n; i++) { const a = R() * PI * 2, r = R() * 2.6; cyl(0.32, 0.32, 0.1, null, { m: goldM(), x: x + Math.cos(a) * r, y: 0.36 + R() * 0.05, z: z + Math.sin(a) * r, rx: (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.6, parent: root, seg: 16 }); } }
function hedge(root, x, z, w, h = 2.9) { box(w, h, 2.2, '#3a8a34', { r: 0.7, x, y: h / 2, z, parent: root, rough: 0.95 }); for (let i = 0; i < Math.floor(w / 1.5); i++) { const f = mesh(foliageGeo(i % 4), mat(i % 2 ? '#4a9a3c' : '#3f8f3a', { rough: 0.95 }), { x: x - w / 2 + 0.8 + i * 1.5, y: h - 0.85, z: z + (i % 2 ? 0.35 : -0.35), parent: root }); f.scale.setScalar(1.05); } }
function cuffs(a) { for (const A of [a.armL, a.armR]) mesh(new THREE.TorusGeometry(0.36, 0.08, 8, 20), mat('#c0c4cc', { metal: 0.9, rough: 0.25 }), { y: -1.45, rx: PI / 2, parent: A }); }
function blanket(root, x, z0, z1, w, col) { return box(w, 0.95, z1 - z0, col, { r: 0.45, x, y: 3.35, z: (z0 + z1) / 2, parent: root, rough: 0.95 }); }
function lying(a, x, zFeet, s, face, t, extra = {}) { a.pose({ x, y: 3.1 + 0.15 * s, z: zFeet, rx: -PI / 2, scale: s, t, face, armL: 0.05, armR: -0.05, ...extra }); }
function crowdFaces(i, T) { return ['shock', 'doubt', 'sad', 'shock', 'doubt', 'sad', 'shock'][i % 7]; }
const S = {};

// 1. Mayor's order (day, town hall)
S.speech = () => {
  const w = W_.townD(), root = addRoot(w);
  const mayor = av(root, MAYOR);
  const folks = [NPCS[1], NPCS[0], NPCS[4], DAD, NPCS[3], NPCS[2], NPCS[5]].map(o => av(root, o));
  const boy = av(root, BOY);
  const pos = [[-4.6, -15.2], [-1.6, -14.4], [1.6, -15.0], [4.4, -14.2], [-3.2, -11.8], [0.4, -12.0], [3.4, -11.6]];
  return { w, root, update(t, T) {
    w.update(T);
    mayor.pose({ x: 0, y: 1.6, z: -26.6, t: T, face: 'talk', armRx: -1.3 - 0.45 * Math.sin(T * 4), armR: -0.25, armL: 0.08, headZ: Math.sin(T * 2) * 0.05 });
    folks.forEach((a, i) => a.pose({ x: pos[i][0], y: 0.3, z: pos[i][1], ry: PI + (pos[i][0]) * 0.02, t: T + i, face: crowdFaces(i, T), blink: (Math.sin(T * 2 + i * 3) > 0.97) ? 1 : 0, armL: 0.06, armR: -0.06, headYaw: Math.sin(T * 0.8 + i) * 0.15 }));
    boy.pose({ x: -1.0, y: 0.3, z: -10.0, ry: PI, scale: BS, t: T, face: 'doubt' });
    if (t < 2.5) { const p = t / 2.5; look(lerp(2.4, 1.2, p), 6.9, lerp(-17.6, -19.4, p), 0, 6.0, -26.6, 0, 40); }
    else { const p = (t - 2.5) / 2.6; look(lerp(1.4, 0.6, p), 6.2, lerp(-22.8, -21.8, p), 0, 4.2, -13.5, 0, 42); }
  } };
};
// 2. Night work, noticing something strange
S.night1 = () => {
  const w = W_.townN(), root = addRoot(w);
  const a = av(root, NPCS[4]), b = av(root, NPCS[2]);
  box(1.4, 0.9, 0.7, '#e63946', { r: 0.1, y: -1.9, z: 0.1, parent: a.armL, metal: 0.3 }); box(0.6, 0.2, 0.2, '#333', { y: -1.35, z: 0.1, parent: a.armL });
  const lan = new THREE.Group(); lan.position.set(0, -2.1, 0.2); b.armR.add(lan); cyl(0.35, 0.35, 0.8, '#fff', { parent: lan, em: '#ffcf70', emi: 2.5, cast: false }); cyl(0.4, 0.4, 0.12, '#333', { y: 0.45, parent: lan });
  return { w, root, update(t, T) {
    w.update(T);
    const turn = ease(prog(t, 0.6, 1.4));
    a.pose({ x: -1.6, y: 0.3, z: 0.4, ry: lerp(0.15, 0.6, turn), t: T, face: 'doubt', armL: 0.05, headYaw: lerp(0, 0.4, turn) });
    b.pose({ x: 1.7, y: 0.3, z: 0.0, ry: lerp(-0.15, -0.6, turn), t: T, face: t > 1.6 ? 'shock' : 'doubt', armR: -0.05, headYaw: lerp(0, -0.4, turn) - (t > 1.6 ? Math.sin(T * 3) * 0.3 : 0) });
    const p = t / 2.9; look(lerp(0.6, -0.2, p), 5.1, lerp(10.2, 8.6, p), 0, 4.2, 0.2, 0, 42);
  } };
};
// 3. Someone sleeping during the day
S.sleeper = () => {
  const w = W_.bedD(), root = addRoot(w);
  const s = av(root, NPCS[1]); const bl = blanket(root, -11, -4.6, -0.5, 7.6, '#4f86f7');
  return { w, root, update(t, T) {
    lying(s, -11, -0.8, 1, 'sleep', T);
    bl.scale.y = 1 + Math.sin(T * 2.2) * 0.04;
    CAMK = 1.05; const p = t / 2.3; look(lerp(-7.4, -7.8, p), 9.6, lerp(-1.0, -1.6, p), -11, 3.5, -5.3, 0, 42);
  } };
};
// 4. A robbed house
S.robbed = () => {
  const w = W_.homeD(), root = addRoot(w);
  const o = av(root, NPCS[5]);
  const safe = new THREE.Group(); safe.position.set(2.5, 0, -5.2); root.add(safe);
  box(3, 3.4, 2.6, '#4a4e57', { r: 0.1, y: 1.7, parent: safe, metal: 0.6, rough: 0.4 }); box(2.6, 3.0, 0.1, '#14161a', { y: 1.7, z: 1.31, parent: safe });
  const door = new THREE.Group(); door.position.set(1.5, 1.7, 1.3); safe.add(door); door.rotation.y = 1.9; box(3, 3.2, 0.3, '#5c626e', { x: -1.5, parent: door, metal: 0.6, rough: 0.35 }); cyl(0.4, 0.4, 0.2, '#c0c4cc', { x: -1.5, z: 0.2, rx: PI / 2, parent: door, metal: 1 });
  for (let r = 0; r < 2; r++) { const dr = box(5.2, 1.5, 2.2, '#b07a4f', { r: 0.05, x: 9 + r * 2.5, y: 0.75, z: -1 + r * 1.8, ry: 0.3 + r * 0.4, rz: r ? 0.2 : 0, parent: root }); }
  const Rr = rng(4); for (let i = 0; i < 16; i++) box(1.0, 0.03, 1.3, '#ffffff', { x: -4 + Rr() * 14, y: 0.08, z: -3 + Rr() * 8, ry: Rr() * 3, parent: root, cast: false });
  for (let i = 0; i < 5; i++) mesh(rockGeo(i + 30), mat('#4cc9f0', { rough: 0.1 }), { x: 7.8 + Rr() * 2, y: 0.2, z: -3.2 + Rr() * 1.5, parent: root }).scale.setScalar(0.35);
  box(3.2, 0.4, 3.2, '#5c4033', { x: -5, y: 0.35, z: -1.5, rz: PI / 2, parent: root });
  return { w, root, update(t, T) {
    o.pose({ x: -1.2, y: 0, z: 2.4, ry: 0.25, t: T, face: 'shock', armL: 2.5 + Math.sin(T * 9) * 0.15, armR: -2.5 - Math.sin(T * 9) * 0.15 });
    const p = t / 2.35; const sh = t < 0.4 ? 0.15 * (1 - t / 0.4) : 0;
    look(lerp(3.4, 2.2, p) + Math.sin(T * 80) * sh, 5.6, lerp(11, 9.6, p), -1.0, 4.0, 2.0, 0, 44);
  } };
};
// 5. Nobody knew who
S.shrug = () => {
  const w = W_.townN(), root = addRoot(w);
  const P = [[-3.2, -1.4, 0.5], [-1.0, 0.9, 0.15], [1.4, 0.7, -0.2], [3.4, -1.2, -0.5]];
  const folks = [NPCS[0], NPCS[3], NPCS[5], DAD].map(o => av(root, o));
  return { w, root, update(t, T) {
    w.update(T);
    folks.forEach((a, i) => { const sh = 0.5 + 0.25 * Math.sin(T * 3 + i); a.pose({ x: P[i][0], y: 0.3, z: P[i][1], ry: P[i][2], t: T + i, face: ['doubt', 'sad', 'doubt', 'shock'][i], armLx: -0.7, armL: sh, armRx: -0.7, armR: -sh, headZ: Math.sin(T * 2 + i) * 0.12, headYaw: Math.sin(T * 1.3 + i * 2) * 0.35 }); });
    const a = lerp(-0.28, 0.28, t / 2.36); look(Math.sin(a) * 10.5, 5.3, Math.cos(a) * 10.5, 0, 4.1, 0, 0, 44);
  } };
};
// 6. The boy can't sleep
S.boybed = () => {
  const w = W_.bedD(), root = addRoot(w);
  const b = av(root, BOY); const bl = blanket(root, -11, -4.8, -1.3, 7.0, '#ff9f1c');
  return { w, root, update(t, T) {
    const blink = (t > 0.8 && t < 0.95) || (t > 1.9 && t < 2.05) ? 1 : 0;
    lying(b, -11, -1.8, BS, 'doubt', T, { lookX: Math.sin(T * 1.8), blink, rz: Math.sin(T * 1.2) * 0.18 });
    bl.rotation.z = Math.sin(T * 1.2) * 0.05;
    CAMK = 1.05; const p = t / 2.4; look(lerp(-7.6, -8.0, p), 9.4, lerp(-1.2, -1.7, p), -10.9, 3.4, -5.4, 0, 40);
  } };
};
// 7. Boy sneaks outside (day, empty street)
S.sneak = () => {
  const w = W_.townD(), root = addRoot(w);
  const b = av(root, BOY);
  return { w, root, update(t, T) {
    w.update(T);
    const bx = lerp(-5, 2.6, t / 3.17);
    b.pose({ x: bx, y: 0.3, z: 0.6, ry: PI / 2, scale: BS, walk: T * 5.5, walkAmp: 0.35, armLx: -0.55 + Math.sin(T * 5.5) * 0.1, armRx: -0.55 - Math.sin(T * 5.5) * 0.1, t: T, face: 'sneaky', headYaw: -0.7 + Math.sin(T * 2.2) * 0.7 });
    look(bx + 2.2, 3.7, 6.8, bx + 0.3, 2.9, 0.6, 0, 40);
  } };
};
// 8. Boy discovers the mayor (peek over hedge)
S.peek = () => {
  const w = W_.townD(), root = addRoot(w);
  hedge(root, 34, -23, 9);
  const b = av(root, BOY), m = av(root, MAYOR);
  makeSack(m.body, 0.7).position.set(1.0, 3.9, -0.9);
  return { w, root, update(t, T) {
    w.update(T);
    b.pose({ x: 34.2, y: 0.3, z: -21.2, ry: PI, scale: BS, t: T, face: t < 1.33 ? 'doubt' : 'shock', armLx: -0.9, armRx: -0.9, armL: 0.1, armR: -0.1 });
    const mz = lerp(-32.2, -30.6, t / 2.95);
    m.pose({ x: 34 + Math.sin(T * 2) * 0.3, y: 0.3, z: mz, ry: 0.1, t: T, face: 'sneaky', walk: T * 4, walkAmp: 0.3, armRx: -2.6, armR: 0.25, armLx: -0.4, headYaw: Math.sin(T * 2.5) * 0.6 });
    if (t < 1.33) look(36.2, 4.9, -15.8, 33.8, 4.4, -30.5, 0, 36);
    else { CAMK = 1.55; const p = (t - 1.33) / 1.62; look(34.5, 4.1, lerp(-26.2, -25.4, p), 34.2, 3.6, -21.2, 0, lerp(40, 34, easeOut(p))); }
  } };
};
// 9. The mayor is stealing
S.loot = () => {
  const w = W_.townD(), root = addRoot(w);
  const m = av(root, MAYOR);
  makeSack(m.body, 0.7).position.set(1.0, 3.9, -0.9);
  necklace(m.armL).position.set(0, -2.0, 0.35);
  return { w, root, update(t, T) {
    w.update(T);
    if (t < 2.78) {
      const mz = lerp(-31.5, -28.6, t / 2.78);
      m.pose({ x: 34, y: 0.3, z: mz, ry: 0.15 * Math.sin(T * 2), t: T, face: 'sneaky', walk: T * 4.5, walkAmp: 0.32, armRx: -2.6, armR: 0.25, armLx: -0.3, headYaw: Math.sin(T * 2.6) * 0.7 });
      look(31.8, 5.6, lerp(-22.0, -22.6, t / 2.78), 34, 4.3, mz, 0, 42);
    } else {
      const lt = t - 2.78;
      m.pose({ x: 34, y: 0.3, z: -28.6, ry: 0.2, t: T, face: 'sneaky', armRx: -2.6, armR: 0.25, armLx: -1.6 - Math.sin(T * 3) * 0.1, armL: -0.2, headX: 0.12, headZ: Math.sin(T * 6) * 0.06 });
      look(lerp(32.0, 32.6, lt / 2.7), 5.6, lerp(-22.6, -22.2, lt / 2.7), 34.0, 4.6, -28.6, 0, 40);
    }
  } };
};
// 10. Boy tells his father; father refuses
S.tell = () => {
  const w = W_.homeN(), root = addRoot(w);
  const b = av(root, BOY), d = av(root, DAD);
  return { w, root, update(t, T) {
    const phase2 = T >= 31.93;
    const wave = Math.sin(T * 7);
    b.pose({ x: -1.8, y: 0, z: 1.8, ry: 0.75, scale: BS, t: T, face: phase2 ? 'sad' : 'talk', armL: phase2 ? 0.1 : 0.7 + wave * 0.4, armR: phase2 ? -0.1 : -0.7 + wave * 0.4, armLx: phase2 ? 0 : -0.6, armRx: phase2 ? 0 : -0.6, lift: phase2 ? 0 : Math.abs(Math.sin(T * 7)) * 0.15 });
    d.pose({ x: 2.2, y: 0, z: 0.8, ry: -0.8, t: T, face: phase2 ? 'doubt' : 'smile', armLx: phase2 ? -1.3 : 0, armL: phase2 ? -0.62 : 0.06, armRx: phase2 ? -1.15 : 0, armR: phase2 ? 0.62 : -0.06, headYaw: phase2 ? Math.sin(T * 7) * 0.35 : 0.1, headX: phase2 ? 0 : 0.15 });
    if (!phase2) { const p = prog(T, 28.99, 31.93); look(lerp(4.6, 4.0, p), 5.5, lerp(6.4, 5.6, p), -1.4, 3.1, 1.6, 0, 40); }
    else { const p = prog(T, 31.93, 34.26); look(lerp(-2.8, -2.2, p), 5.6, lerp(7.6, 6.8, p), 2.2, 4.5, 0.8, 0, 40); }
  } };
};
// 11. The boy makes a plan (night, bedroom)
S.plan = () => {
  const w = W_.bedN(), root = addRoot(w);
  const b = av(root, BOY);
  return { w, root, update(t, T) {
    b.pose({ x: 0, y: 0, z: 1.4, ry: 0.15, scale: BS, t: T, face: 'sneaky', armRx: -2.3 - Math.sin(T * 4) * 0.08, armR: 0.2, armL: 0.08, headZ: 0.12, headX: -0.05 });
    const p = t / 2.1; look(lerp(1.6, 1.0, p), 3.9, lerp(6.4, 5.4, p), 0.1, 3.4, 1.4, 0, 40);
  } };
};
// 12. Pretending to sleep
S.pretend = () => {
  const w = W_.bedD(), root = addRoot(w);
  const d = av(root, DAD), b = av(root, BOY);
  blanket(root, -11, -4.8, -0.4, 7.8, '#4f86f7');
  return { w, root, update(t, T) {
    const awake = t > 0.9;
    lying(d, -12.8, -0.8, 1, awake ? 'sneaky' : 'sleep', T, { lookX: awake ? 0.9 : 0, armL: 0.05, armR: 0.05 });
    lying(b, -9.3, -0.9, BS, awake ? 'sneaky' : 'sleep', T, { lookX: awake ? 0.9 : 0, y: 3.45 });
    CAMK = 1.0; const p = t / 1.94; look(-11, 10.8, lerp(0.8, 0.2, p), -11, 3.4, -5.4, 0, 46);
  } };
};
// 13. Watching the mayor and catching him red-handed
S.catchem = () => {
  const w = W_.townD(), root = addRoot(w);
  hedge(root, -34, -23, 11);
  const b = av(root, BOY), d = av(root, DAD), m = av(root, MAYOR);
  const carried = makeSack(m.armR, 0.55, false); carried.position.set(0, -3.4, 0.1);
  const dropped = makeSack(root, 0.65, true); dropped.position.set(-32.6, 0.3, -29.6); dropped.rotation.z = 1.25;
  const coinG = new THREE.Group(); root.add(coinG); coinsPile(coinG, -31.0, -29.2, 22, 9);
  necklace(coinG).position.set(-30.6, 0.45, -28.8);
  return { w, root, update(t, T) {
    w.update(T);
    const caught = T >= 40.59, standUp = T >= 42.2;
    carried.visible = !caught; dropped.visible = caught; coinG.visible = caught;
    b.pose({ x: -35.6, y: 0.3, z: -21.0, ry: PI, scale: BS, t: T, face: standUp ? 'angry' : 'sneaky', armRx: standUp ? -1.6 : -0.9, armR: 0, armLx: standUp ? 0 : -0.9, lift: standUp ? 0.6 : 0 });
    d.pose({ x: -32.4, y: 0.3, z: -21.0, ry: PI, rx: standUp ? 0 : -0.32, t: T, face: standUp ? 'angry' : 'sneaky', armRx: standUp ? -1.6 : -0.9, armR: 0, armLx: standUp ? 0 : -0.9 });
    if (!caught) {
      const mz = lerp(-28.4, -31.2, prog(T, 38.3, 40.59));
      m.pose({ x: -33.4, y: 0.3, z: mz, ry: PI, t: T, face: 'sneaky', walk: T * 4.2, walkAmp: 0.32, armLx: -0.5, headYaw: Math.sin(T * 2.4) * 0.5 });
      CAMK = 1.1; look(-27.2, 7.8, -14.6, -33.6, 3.6, -28.0, 0, 42);
    } else {
      const lt = T - 40.59;
      m.pose({ x: -33.4, y: 0.3, z: -31.2, ry: 0.1, t: T, face: 'shock', armL: 2.6 + Math.sin(T * 10) * 0.1, armR: -2.6 - Math.sin(T * 10) * 0.1, lift: Math.max(0, Math.sin(clamp(lt / 0.35, 0, 1) * PI)) * 0.6 });
      if (!standUp) { CAMK = 1.0; look(-31.6, 5.3, lerp(-23.9, -24.6, easeOut(lt / 0.5)), -33.4, 4.5, -31.2, 0, lerp(52, 42, easeOut(lt / 0.45))); }
      else { CAMK = 1.1; const p = prog(T, 42.2, 43.84); look(lerp(-37.6, -36.8, p), 5.0, -28.6, -34.0, 4.1, -21.0, 0, 42); }
    }
  } };
};
// 14. The mayor is arrested
S.arrest = () => {
  const w = W_.townD(), root = addRoot(w);
  const m = av(root, MAYOR), c = av(root, COP);
  cuffs(m);
  const pc = carReal(root, 9.5, -8.5, '#f4f6fa', -0.35);
  const doorT = posterTex((g) => { g.fillStyle = '#1d3557'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#ffffff'; g.font = '900 64px IB'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POLICE', 256, 52); }, 512, 96);
  plane(6.5, 1.2, doorT, { y: 2.0, z: 2.62, parent: pc, transparent: false });
  box(3.2, 0.35, 1.4, '#222', { y: 4.45, x: -1.6, parent: pc });
  const red = box(1.4, 0.45, 1.2, '#ff2040', { x: -2.4, y: 4.75, parent: pc, em: '#ff2040', emi: 3, cast: false }), blue = box(1.4, 0.45, 1.2, '#2050ff', { x: -0.8, y: 4.75, parent: pc, em: '#2050ff', emi: 3, cast: false });
  const lr = new THREE.PointLight('#ff2040', 0, 30), lb = new THREE.PointLight('#2050ff', 0, 30); lr.position.set(7, 6, -6); lb.position.set(10, 6, -6); root.add(lr, lb);
  const crowd = [NPCS[0], NPCS[1], NPCS[2], NPCS[3], NPCS[4], NPCS[5], NPCS[0]].map(o => av(root, o));
  const cp = [[-6.5, -17.0], [-3.2, -18.0], [0.2, -18.4], [3.6, -18.0], [-8.6, -13.6], [5.4, -16.4], [-5.6, -20.4]];
  const b = av(root, BOY), d = av(root, DAD);
  return { w, root, update(t, T) {
    w.update(T);
    const on = Math.sin(T * 14) > 0;
    red.material.emissiveIntensity = on ? 4 : 0.3; blue.material.emissiveIntensity = on ? 0.3 : 4; lr.intensity = on ? 160 : 0; lb.intensity = on ? 0 : 160;
    const cheer = T > 46.0;
    m.pose({ x: -1.0, y: 0.3, z: -12.0, ry: 0.15, t: T, face: 'sad', armLx: -0.75, armL: -0.28, armRx: -0.75, armR: 0.28, headX: 0.28 });
    c.pose({ x: 1.6, y: 0.3, z: -12.6, ry: -0.35, t: T, face: 'smile', armLx: -1.0, armL: -0.25, armR: -0.06 });
    crowd.forEach((a, i) => { const [x, z] = cp[i]; const ry = Math.atan2(-1 - x, -12 - z); a.pose({ x, y: 0.3, z, ry, t: T + i, face: cheer ? 'happy' : 'angry', armL: cheer ? 2.6 + Math.sin(T * 8 + i) * 0.2 : 0.1, armR: cheer ? -2.6 - Math.sin(T * 8 + i) * 0.2 : -0.1, lift: cheer ? Math.abs(Math.sin(T * 6 + i)) * 0.5 : 0 }); });
    b.pose({ x: -5.0, y: 0.3, z: -8.6, ry: 2.4, scale: BS, t: T, face: 'happy', armL: cheer ? 2.6 : 0.1, armR: cheer ? -2.6 : -0.1, lift: cheer ? Math.abs(Math.sin(T * 7)) * 0.5 : 0 });
    d.pose({ x: -7.2, y: 0.3, z: -9.8, ry: 2.2, t: T, face: 'happy', armRx: cheer ? 0 : -1.0, armR: cheer ? -2.6 : 0, armL: cheer ? 2.6 : 0.1 });
    const p = ease(t / 4.2);
    look(lerp(0.6, 3.2, p), lerp(5.2, 6.8, p), lerp(-3.8, 2.0, p), lerp(0.2, -0.5, p), lerp(4.3, 3.8, p), -12, 0, 44);
  } };
};
// 15. Happy ending (day)
S.happy = () => {
  const w = W_.townD(), root = addRoot(w);
  const b = av(root, BOY), d = av(root, DAD);
  const walkers = [[NPCS[0], -14, 2.2, -2.2], [NPCS[2], 12, -1.8, -1.6], [NPCS[4], -6, 1.6, -3.0], [NPCS[5], 18, -2.4, -2.8], [NPCS[3], -20, 2.0, 2.2]].map(([o, x0, v, z]) => ({ a: av(root, o), x0, v, z }));
  const kids = [{ ...BOY, shirt: '#ff70a6', hair: 'buns', hairCol: '#7f4f24', detail: 'heart', detailCol: '#ffffff' }, { ...BOY, shirt: '#06d6a0', hair: 'bob', hairCol: '#ffb703' }].map(o => av(root, o));
  return { w, root, update(t, T) {
    w.update(T);
    b.pose({ x: -1.2, y: 0.3, z: 1.2, ry: 0.15, scale: BS, t: T, face: 'happy', armR: -2.5 - Math.sin(T * 9) * 0.35, armL: 0.1 });
    d.pose({ x: 1.5, y: 0.3, z: 0.8, ry: -0.15, t: T, face: 'happy', armL: 2.5 + Math.sin(T * 9 + 1) * 0.35, armR: -0.1 });
    walkers.forEach((k, i) => k.a.pose({ x: k.x0 + k.v * t, y: 0.3, z: k.z, ry: k.v > 0 ? PI / 2 : -PI / 2, walk: T * 6 + i, t: T + i, face: 'happy' }));
    kids.forEach((k, i) => k.pose({ x: -5.5 + i * 11, y: 0.3, z: -1.4, ry: i ? -0.4 : 0.4, scale: 0.7, t: T + i, face: 'happy', lift: Math.abs(Math.sin(T * 5 + i * 1.5)) * 1.4, armL: 2.4, armR: -2.4 }));
    const p = ease(t / 3.9);
    look(lerp(0.2, 0.6, p), lerp(4.4, 7.8, p), lerp(8.2, 14.5, p), 0, lerp(3.6, 4.6, p), 0, 0, 44);
  } };
};

const SCENES = [[0, 'speech'], [5.09, 'night1'], [8.01, 'sleeper'], [10.3, 'robbed'], [12.65, 'shrug'], [15.01, 'boybed'], [17.4, 'sneak'], [20.57, 'peek'], [23.52, 'loot'], [28.99, 'tell'], [34.26, 'plan'], [36.36, 'pretend'], [38.3, 'catchem'], [43.84, 'arrest'], [48.04, 'happy']];
const DIPS = [5.09, 8.01, 12.65, 15.01, 28.99, 36.36];
const END = 52.0;
function render(T) {
  CAMK = 1.45;
  let idx = 0; for (let i = 0; i < SCENES.length; i++) if (T >= SCENES[i][0]) idx = i;
  const [st, key] = SCENES[idx];
  const sc = getScene(key, S[key]);
  for (const k in built) built[k].root.visible = false;
  sc.root.visible = true;
  sc.update(T - st, T);
  renderer.render(sc.w.scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.filter = 'brightness(1.04) saturate(1.12) contrast(1.02)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none';
  vignette(0.18, '10,10,30');
  let dip = 0; for (const d of DIPS) dip = Math.max(dip, 1 - Math.abs(T - d) / 0.22);
  if (dip > 0) { ctx.fillStyle = `rgba(5,5,20,${0.9 * dip})`; ctx.fillRect(0, 0, W, H); }
  if (T < 0.35) { ctx.fillStyle = `rgba(0,0,0,${1 - T / 0.35})`; ctx.fillRect(0, 0, W, H); }
  captions(T);
  if (T > END - 0.45) { ctx.fillStyle = `rgba(0,0,0,${prog(T, END - 0.45, END)})`; ctx.fillRect(0, 0, W, H); }
}
window.render = render;
window.ready = (async () => { await document.fonts.load('800 60px IX'); await document.fonts.load('900 60px IB'); return true; })();
