// ---------- story scenes ----------
const CAPTAIN = { skin: '#ffd23f', shirt: '#f8f9fa', pants: '#1d2b53', hair: 'captain', detail: 'captain', mustache: true, beard: true, shoe: '#111111' };
const CWIFE = { skin: '#ffd23f', shirt: '#e76f51', pants: '#f4a261', hair: 'long', hairCol: '#f2c14e', detail: 'heart', detailCol: '#ffffff' };
const CKID = { skin: '#ffd23f', shirt: '#ffd60a', pants: '#3a86ff', hair: 'buns', hairCol: '#f2c14e', detail: 'star', detailCol: '#ff4d6d' };
const BOY = { skin: '#ffd23f', shirt: '#ffffff', pants: '#1d3557', hair: 'spiky', hairCol: '#5a3a1a', detail: 'sailor', detailCol: '#1d3557' };
const MOM = { skin: '#ffd23f', shirt: '#ff70a6', pants: '#3d348b', hair: 'bob', hairCol: '#7f4f24', detail: 'heart', detailCol: '#ffffff' };
const DAD = { skin: '#ffd23f', shirt: '#3a86ff', pants: '#5c4033', hair: 'flat', hairCol: '#3b2416', detail: 'plaid', detailCol: '#1d3557' };
const BS = 0.78, KS = 0.72, D = DECK_Y;
const built = {}, worldsC = {};
const getWorld = (k, fn) => worldsC[k] ??= fn();
const W_ = {
  sea: () => getWorld('sea', makeSea), dining: () => getWorld('dining', makeDining),
  corD: () => getWorld('corD', () => makeCorridor(false)), corN: () => getWorld('corN', () => makeCorridor(true)),
  baseD: () => getWorld('baseD', () => makeBasement(false)), baseN: () => getWorld('baseN', () => makeBasement(true)),
  cabin: () => getWorld('cabin', makeCabin), bridge: () => getWorld('bridge', makeBridge), island: () => getWorld('island', makeIsland),
};
function addRoot(w) { const g = new THREE.Group(); w.scene.add(g); return g; }
function getScene(key, fn) { return built[key] ??= fn(); }
function av(root, o) { const a = new Avatar(o); root.add(a.group); return a; }
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
function seatPerson(a, x, z, ry, t, extra = {}) { a.pose({ x, y: 0.1, z, ry, sit: true, t, ...extra }); }
function flashlight(a) { const G = new THREE.Group(); G.position.set(0, -1.75, 0.3); a.armR.add(G); cyl(0.22, 0.22, 1.2, '#222', { rx: PI / 2, parent: G }); cyl(0.3, 0.3, 0.1, '#fff', { z: 0.62, rx: PI / 2, parent: G, em: '#fff8d0', emi: 4, cast: false }); const sl = new THREE.SpotLight('#fff4d0', 900, 60, 0.45, 0.5, 1.2); sl.position.set(0, 0, 0.6); const tg = new THREE.Object3D(); tg.position.set(0, -0.6, 10); G.add(sl, tg); sl.target = tg; return sl; }
function heldCrate(a) { const c = crate(a.body, 0, 2.6, 1.6, 0.55); return c; }
function hut(root, x, z, col) { const y = islandH(x, z); const G = new THREE.Group(); G.position.set(x, y, z); root.add(G); cyl(4, 4, 5, '#d9b27a', { y: 2.5, parent: G, seg: 20, rough: 0.9 }); cone(5.6, 4.2, '#c9a46a', { y: 7.1, parent: G, seg: 20, rough: 1 }); box(1.8, 3.4, 0.3, '#5a3d2b', { y: 1.7, z: 3.95, parent: G }); box(1.2, 1.2, 0.2, col, { x: 2.2, y: 3.2, z: 3.6, ry: 0.5, parent: G }); return G; }
const S = {};
const PAX = [NPCS[0], NPCS[1], NPCS[2], NPCS[3], NPCS[4], NPCS[5]];

// A. The endless ship
S.shipwide = () => {
  const w = W_.sea(), root = addRoot(w);
  return { w, root, update(t, T) { w.island.visible = false; w.update(T); const p = t / 2.9; look(lerp(330, 300, p), lerp(46, 52, p), lerp(170, 140, p), lerp(30, 20, p), 26, 0, 0, 50); } };
};
S.deckLife = () => {
  const w = W_.sea(), root = addRoot(w);
  const a = av(root, PAX[0]), b = av(root, PAX[3]), boy = av(root, BOY), k = av(root, { ...CKID, shirt: '#06d6a0', hair: 'spiky', hairCol: '#222' }), c = av(root, PAX[5]);
  return { w, root, update(t, T) {
    w.island.visible = false; w.update(T);
    a.pose({ x: 86, y: D, z: -5, ry: 1.2, t: T, face: 'talk', armR: -0.3, armRx: -0.6 + Math.sin(T * 5) * 0.2 });
    b.pose({ x: 89.5, y: D, z: -3.6, ry: -1.7, t: T + 2, face: 'happy' });
    const bx = lerp(80, 90, t / 2.8); boy.pose({ x: bx, y: D, z: 5, ry: PI / 2, scale: BS, walk: T * 6, t: T, face: 'smile' });
    k.pose({ x: 92, y: D, z: 9, ry: -0.6, scale: KS, t: T, face: 'happy', lift: Math.abs(Math.sin(T * 5)) * 1.2, armL: 2.5, armR: -2.5 });
    c.pose({ x: 84, y: D, z: 10, ry: 0.6, t: T + 1, face: 'smile', armL: 0.1 });
    const p = t / 2.8; look(lerp(76, 78, p), 34.5, lerp(20, 18.5, p), 89, 31, 2, 0, 46);
  } };
};
// B. Captain's claim
S.captainTalk = () => {
  const w = W_.sea(), root = addRoot(w);
  const cap = av(root, CAPTAIN);
  const pax = [PAX[1], MOM, DAD, PAX[4], PAX[2], PAX[0]].map(o => av(root, o)); const boy = av(root, BOY);
  const pp = [[78, -6], [79, -1.5], [79.5, 3], [83, -4], [83.5, 1.5], [84, 6]];
  return { w, root, update(t, T) {
    w.island.visible = false; w.update(T);
    const sweep = T > 8.7;
    cap.pose({ x: 64, y: D + 10.5, z: 0, ry: PI / 2, t: T, face: 'talk', armRx: sweep ? -1.6 : -1.2 - Math.sin(T * 4) * 0.35, armR: sweep ? -0.9 + Math.sin(T * 1.5) * 0.4 : -0.2, armL: 0.08 });
    pax.forEach((a, i) => a.pose({ x: pp[i][0], y: D, z: pp[i][1], ry: faceTo(pp[i][0], pp[i][1], 64, 0), t: T + i, face: ['smile', 'smile', 'doubt', 'smile', 'happy', 'smile'][i], lookY: -0.7, headX: -0.25 + (sweep ? Math.sin(T * 3 + i) * 0.08 : 0) }));
    boy.pose({ x: 77.5, y: D, z: 1.0, ry: faceTo(77.5, 1, 64, 0), scale: BS, t: T, face: 'doubt', lookY: -0.8, headX: -0.3 });
    if (!sweep) { const p = prog(T, 5.68, 8.7); look(lerp(75, 74, p), D + 13.6, lerp(5.5, 4, p), 64, D + 14.4, 0, 0, 42); }
    else { const p = prog(T, 8.7, 11.98); look(lerp(72.4, 72.8, p), D + 10.2, lerp(-5.5, -4.5, p), 81, D + 3.4, 0.5, 0, 50); }
  } };
};
// C. Only fish
S.dining = () => {
  const w = W_.dining(), root = addRoot(w);
  const ppl = [[BOY, -6, -4.4, BS], [MOM, -10.4, 0.8, 1], [DAD, -1.6, 0.6, 1], [PAX[1], -6, 4.6, 1], [PAX[0], 9, 3.6, 1], [PAX[4], 4.5, -1.4, 1], [PAX[2], 13.5, -1.4, 1]];
  const tabs = [[-6, 0], [9, -1]];
  const people = ppl.map(([o, x, z, s]) => { const a = av(root, o); const tc = Math.abs(x - tabs[0][0]) < 6 ? tabs[0] : tabs[1]; return { a, x, z, s, tc }; });
  for (const p of people) { const dx = p.tc[0] - p.x, dz = p.tc[1] - p.z, l = Math.hypot(dx, dz); const px = p.x + dx / l * 2.3, pz = p.z + dz / l * 2.3; cyl(0.9, 0.75, 0.12, '#ffffff', { x: px, y: 3.2, z: pz, parent: root }); const f = new THREE.Group(); f.position.set(px, 3.38, pz); f.rotation.y = Math.atan2(dx, dz) + PI / 2; root.add(f); sphere(0.5, '#f4a261', { parent: f, rough: 0.5 }).scale.set(1.6, 0.45, 0.65); cone(0.38, 0.6, '#e76f51', { x: -0.95, rz: PI / 2, parent: f }).scale.z = 0.4; sphere(0.07, '#111', { x: 0.6, y: 0.08, z: 0.18, parent: f }); sphere(0.18, '#ffd23f', { x: 0.2, y: 0.05, z: 0.55, parent: f }).scale.y = 0.3; }
  for (const p of people) { const c = new THREE.Group(); c.position.set(p.x, 0, p.z); c.rotation.y = Math.atan2(p.tc[0] - p.x, p.tc[1] - p.z); root.add(c); box(2.2, 0.3, 2.2, '#9c6644', { y: 2.05 * p.s + (1 - p.s) * 0.5, parent: c }); box(2.2, 3, 0.3, '#9c6644', { y: 3.4, z: -1.1, parent: c }); }
  return { w, root, update(t, T) {
    people.forEach((p, i) => { const ry = Math.atan2(p.tc[0] - p.x, p.tc[1] - p.z); p.a.pose({ x: p.x, y: 0.15 + (1 - p.s) * 0.45, z: p.z, ry, sit: true, scale: p.s, t: T + i, face: i === 0 ? 'sad' : ['smile', 'doubt', 'smile', 'talk', 'smile', 'happy'][i % 6], armRx: -1.0 - Math.max(0, Math.sin(T * 3 + i)) * 0.6, armR: 0.1, armLx: -0.8, headX: i === 0 ? 0.25 : 0 }); });
    const p = t / 2.8; look(lerp(-2.5, -3.5, p), 9.2, lerp(12.5, 11.5, p), -6, 3.6, -2.4, 0, 44);
  } };
};
// D. Boy notices something strange
S.notice = () => {
  const w = W_.corD(), root = addRoot(w);
  const boy = av(root, BOY), kid = av(root, CKID);
  return { w, root, update(t, T) {
    const stop = t > 1.5;
    const bx = stop ? -2.5 : lerp(-11, -2.5, t / 1.5);
    boy.pose({ x: bx, y: 0, z: 1.2, ry: PI / 2, scale: BS, walk: stop ? undefined : T * 6, t: T, face: stop ? 'doubt' : 'smile', headYaw: stop ? lerp(0, 0.9, ease(prog(t, 1.5, 2.2))) : 0, lookX: stop ? -0.4 : 0 });
    w.door.rotation.y = -0.5;
    kid.group.visible = t < 1.9;
    kid.pose({ x: lerp(8.4, 7.6, t / 1.9), y: 0, z: lerp(-3.0, -5.0, t / 1.9), ry: PI, scale: KS, walk: T * 6, t: T, face: 'sneaky' });
    const p = t / 3.5; look(lerp(13.5, 13.0, p), 4.6, -3.4, lerp(-4, -2.5, p), 3.3, 1.2, 0, 48);
  } };
};
// E. The secret basement
S.door = () => {
  const w = W_.corD(), root = addRoot(w);
  const cap = av(root, CAPTAIN), wife = av(root, CWIFE), kid = av(root, CKID), boy = av(root, BOY);
  const key = new THREE.Group(); key.position.set(0, -2.0, 0.4); cap.armR.add(key); cyl(0.08, 0.08, 0.7, '#e0b030', { rx: PI / 2, parent: key, metal: 1 }); mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), mat('#e0b030', { metal: 1 }), { z: -0.4, parent: key });
  return { w, root, update(t, T) {
    const second = T >= 20.9;
    w.door.rotation.y = -1.15 * ease(prog(T, 19.7, 20.6));
    cap.pose({ x: 9.6, y: 0, z: -3.2, ry: PI + 0.25, t: T, face: 'sneaky', armRx: -1.4, armR: 0.1 });
    wife.pose({ x: 5.4, y: 0, z: -1.0, ry: faceTo(5.4, -1, 0, 6), t: T, face: 'sneaky', headYaw: Math.sin(T * 2.2) * 0.5 });
    kid.pose({ x: 12.6, y: 0, z: -0.6, ry: -0.3, scale: KS, t: T, face: 'sneaky', headYaw: Math.sin(T * 2.6 + 1) * 0.5 });
    boy.group.visible = second;
    boy.pose({ x: 20.6, y: 0, z: 0.8, ry: -PI / 2, scale: BS, t: T, face: 'shock', headZ: -0.18, headYaw: 0.15, lookX: -0.6, armLx: -0.4 });
    if (!second) { const p = prog(T, 18.32, 20.9); look(lerp(7.2, 8.4, p), 6.0, lerp(12.5, 11, p), 8.4, 4.0, -2.2, 0, 46); }
    else { const p = prog(T, 20.9, 23.58); look(lerp(13.6, 14.2, p), 4.4, lerp(6.4, 5.8, p), 20.4, 3.5, 0.8, 0, 44); }
  } };
};
// F. Captain's family eating fresh fruit
S.fruit = () => {
  const w = W_.baseD(), root = addRoot(w);
  const cap = av(root, CAPTAIN), wife = av(root, CWIFE), kid = av(root, CKID), boy = av(root, BOY);
  const capBan = banana(cap.armR, 0, -1.9, 0.5, PI / 2); const wifeApple = sphere(0.4, '#e63946', { y: -2.0, z: 0.45, parent: wife.armR, rough: 0.35 }); const kidMelon = watermelon(kid.armL, 0, -2.0, 0.5, 0);
  return { w, root, update(t, T) {
    w.update(T);
    const second = T >= 25.6;
    const bite = (o) => -1.3 - Math.max(0, Math.sin(T * 3.2 + o)) * 0.9;
    seatPerson(cap, -14, -2.8, 0, T, { face: 'happy', armRx: bite(0), armR: 0.15 });
    seatPerson(wife, -18.6, 0.6, PI / 2, T, { face: 'happy', armRx: bite(1.5), armR: 0.1 });
    kid.pose({ x: -9.4, y: 0.6, z: 0.8, ry: -PI / 2, sit: true, scale: KS, t: T, face: 'happy', armLx: bite(3), armL: -0.1 });
    boy.group.visible = second;
    boy.pose({ x: -2.4, y: 0, z: -6.9, ry: 0.15, scale: BS, t: T, face: 'shock', armRx: -0.6, headZ: 0.12 });
    if (!second) { const p = prog(T, 23.58, 25.6); look(lerp(-10.5, -11.5, p), 7.2, lerp(11, 10, p), -14.2, 3.9, -0.4, 0, 46); }
    else { const p = prog(T, 25.6, 27.34); look(-1.0, 4.3, lerp(1.6, 0.6, p), -2.6, 3.5, -6.9, 0, 44); }
  } };
};
// G/H. Telling the parents, convincing them
S.cabin = () => {
  const w = W_.cabin(), root = addRoot(w);
  const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD);
  return { w, root, update(t, T) {
    const ph = T < 29.2 ? 0 : T < 30.99 ? 1 : T < 33.25 ? 2 : 3;
    const wave = Math.sin(T * 7);
    const boyPose = ph === 0 ? { face: 'talk', armL: 0.7 + wave * 0.4, armR: -0.7 + wave * 0.4, armLx: -0.6, armRx: -0.6, lift: Math.abs(Math.sin(T * 7)) * 0.15 }
      : ph === 1 ? { face: 'sad', armL: 0.1, armR: -0.1 }
      : ph === 2 ? { face: 'sad', armLx: -1.25, armL: -0.42, armRx: -1.25, armR: 0.42, lift: Math.abs(Math.sin(T * 5)) * 0.25 }
      : { face: 'happy', armL: 2.4, armR: -2.4, lift: Math.abs(Math.sin(T * 6)) * 0.4 };
    boy.pose({ x: -1.6, y: 0, z: 2.0, ry: 0.75, scale: BS, t: T, ...boyPose });
    const doubt = ph === 1 || ph === 2;
    const nod = ph === 3 ? Math.sin(T * 8) * 0.18 : 0;
    const look2 = ph === 3 && T < 34.0;
    mom.pose({ x: 2.6, y: 0, z: 0.4, ry: look2 ? 0.9 : -0.75, t: T, face: ph === 3 ? 'happy' : doubt ? 'doubt' : 'smile', armLx: doubt ? -1.3 : 0, armL: doubt ? -0.62 : 0.06, armRx: doubt ? -1.15 : 0, armR: doubt ? 0.62 : -0.06, headYaw: ph === 1 ? Math.sin(T * 6) * 0.3 : 0, headX: nod });
    dad.pose({ x: 5.4, y: 0, z: 1.4, ry: look2 ? -1.6 : -1.0, t: T, face: ph === 3 ? 'happy' : doubt ? 'doubt' : 'smile', armLx: doubt ? -1.25 : 0, armL: doubt ? -0.6 : 0.06, armRx: doubt ? -1.1 : 0, armR: doubt ? 0.6 : -0.06, headYaw: doubt ? Math.sin(T * 7 + 1) * 0.35 : 0, headX: nod });
    if (ph === 0 || ph === 2) { const p = ph === 0 ? prog(T, 27.34, 29.2) : prog(T, 30.99, 33.25); look(lerp(6.4, 5.8, p), 5.4, lerp(8.2, 7.4, p), -1.4, 3.1, 1.8, 0, 42); }
    else { const p = ph === 1 ? prog(T, 29.2, 30.99) : prog(T, 33.25, 35.34); look(lerp(-3.2, -2.6, p), 5.7, lerp(9.2, 8.4, p), 4.0, 4.4, 0.9, 0, 42); }
  } };
};
// I. Night: sneaking in, discovering the speedboat
S.sneakIn = () => {
  const w = W_.corN(), root = addRoot(w);
  const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD); flashlight(dad);
  return { w, root, update(t, T) {
    w.door.rotation.y = -1.15 * ease(prog(t, 1.4, 2.2));
    const f = t / 2.26, step = T * 4.5;
    const bx = lerp(-1, 5, f);
    boy.pose({ x: bx, y: 0, z: 1.4, ry: PI / 2 - 0.2, scale: BS, walk: step + 2, walkAmp: 0.3, t: T, face: 'sneaky', armLx: -0.5, armRx: -0.5, headYaw: 0.3 });
    dad.pose({ x: bx - 3.6, y: 0, z: 1.0, ry: PI / 2 - 0.15, walk: step, walkAmp: 0.3, t: T, face: 'sneaky', armRx: -1.4, armR: 0.1, armLx: -0.4 });
    mom.pose({ x: bx - 7.2, y: 0, z: 1.6, ry: PI / 2 - 0.2, walk: step + 1, walkAmp: 0.3, t: T, face: 'sneaky', armLx: -0.5, armRx: -0.5, headYaw: 0.4 });
    look(bx + 7.5, 5.2, 10.5, bx - 3.2, 3.6, 1.2, 0, 50);
  } };
};
S.discover = () => {
  const w = W_.baseN(), root = addRoot(w);
  const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD); const sl = flashlight(dad); const sl2 = flashlight(mom);
  return { w, root, update(t, T) {
    const react = T >= 38.9;
    dad.pose({ x: 8.6, y: 0, z: 7.6, ry: PI - 0.55, t: T, face: react ? 'shock' : 'sneaky', armRx: -1.45, armR: 0.05, armL: react ? 0.9 : 0.06 });
    mom.pose({ x: 5.0, y: 0, z: 8.2, ry: PI - 0.75, t: T, face: react ? 'shock' : 'sneaky', armRx: -1.4, armR: 0.05, armL: react ? 2.2 : 0.1 });
    boy.pose({ x: 11.6, y: 0, z: 8.0, ry: PI - 0.25, scale: BS, t: T, face: react ? 'shock' : 'sneaky', armL: react ? 2.5 : 0.1, armR: react ? -2.5 : -0.1, lift: react ? Math.abs(Math.sin(T * 6)) * 0.3 : 0 });
    if (!react) { const p = prog(T, 37.6, 38.9); look(lerp(24, 22.5, p), 10.5, lerp(19, 17.5, p), 11.0, 3.4, 1.5, 0, 52); }
    else { const p = prog(T, 38.9, 40.24); look(lerp(11.6, 11.2, p), 6.6, lerp(3.4, 3.8, p), 8.2, 4.2, 8.0, 0, 52); }
  } };
};
// J. Captain's secret trips
S.boatRide = () => {
  const w = W_.sea(), root = addRoot(w);
  const bg = new THREE.Group(); root.add(bg); speedboat(bg, '#e63946');
  const cap = av(bg, CAPTAIN); const crt = crate(bg, -4.5, 2.9, 0, 0.6);
  return { w, root, update(t, T) {
    w.island.visible = true; w.update(T);
    const bx = lerp(40, 170, t / 3.56);
    bg.position.set(bx, 0.3 + Math.sin(T * 5) * 0.15, 118); bg.rotation.z = Math.sin(T * 4) * 0.02; bg.rotation.x = Math.sin(T * 3) * 0.02;
    cap.pose({ x: 0.2, y: 2.9, z: 0, ry: PI / 2, t: T, face: 'sneaky', armRx: -1.2, armLx: -1.2, armR: 0.2, armL: -0.2 });
    look(bx + 15, 8.5, 136, bx - 2, 4.6, 118, 0, 46);
  } };
};
S.collect = () => {
  const w = W_.island(), root = addRoot(w);
  const cap = av(root, CAPTAIN); const kid = av(root, CKID);
  const tx = 18, tz = 48, gy = islandH(tx, tz + 4);
  const c = crate(root, tx + 3.2, islandH(tx + 3.2, tz + 6), tz + 6, 0.9);
  const boatHolder = new THREE.Group(); boatHolder.position.set(-14, 0.4, -13); boatHolder.rotation.y = 0.5; root.add(boatHolder); speedboat(boatHolder);
  const orange = sphere(0.45, '#ff9f1c', { y: -2.0, z: 0.45, parent: cap.armR, rough: 0.35 });
  return { w, root, update(t, T) {
    w.update(T);
    const reach = Math.sin(T * 2.4);
    cap.pose({ x: tx - 0.5, y: islandH(tx - 0.5, tz + 5), z: tz + 5, ry: PI - 0.3, t: T, face: 'happy', armRx: -2.4 - reach * 0.35, armR: 0.2, armL: 0.1 });
    kid.pose({ x: tx + 6.5, y: islandH(tx + 6.5, tz + 8), z: tz + 8, ry: -0.9, scale: KS, t: T, face: 'happy', armL: 2.4, armR: -2.4, lift: Math.abs(Math.sin(T * 5)) * 0.8 });
    const p = t / 3.64; look(lerp(28, 25, p), gy + 7, lerp(68, 66, p), tx + 1, gy + 5.5, tz + 5, 0, 46);
  } };
};
// K/L. Exposed and the furious passengers
function crowdOnDeck(root) {
  const list = [PAX[0], PAX[1], PAX[2], PAX[3], PAX[4], PAX[5], { ...PAX[1], shirt: '#ff006e' }, { ...PAX[4], shirt: '#ffd23f', hair: 'bob', hairCol: '#222' }].map(o => av(root, o));
  return list;
}
S.expose = () => {
  const w = W_.sea(), root = addRoot(w);
  const cap = av(root, CAPTAIN); heldCrate(cap);
  const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD);
  const crowd = crowdOnDeck(root);
  const cp = [[84, -10], [86, -6], [88, -2], [90, 2], [85, 7], [91, -9], [93, -4], [88, 8]];
  return { w, root, update(t, T) {
    w.island.visible = false; w.update(T);
    const second = T >= 49.8;
    cap.pose({ x: 74.5, y: D, z: -11, ry: faceTo(74.5, -11, 84, 0), t: T, face: second ? 'shock' : 'sneaky', armLx: -1.1, armRx: -1.1, armL: -0.25, armR: 0.25, sweat: second, lift: second ? Math.max(0, Math.sin(clamp((T - 49.8) / 0.3, 0, 1) * PI)) * 0.5 : 0 });
    boy.pose({ x: 81.5, y: D, z: -3.5, ry: faceTo(81.5, -3.5, 74.5, -11), scale: BS, t: T, face: 'angry', armRx: -1.6, armR: 0 });
    mom.pose({ x: 83.5, y: D, z: -0.8, ry: faceTo(83.5, -0.8, 74.5, -11), t: T, face: second ? 'shock' : 'angry', armL: second ? 2.2 : 0.1 });
    dad.pose({ x: 80.0, y: D, z: 0.2, ry: faceTo(80, 0.2, 74.5, -11), t: T, face: 'angry', armRx: second ? -1.6 : 0 });
    crowd.forEach((a, i) => a.pose({ x: cp[i][0], y: D, z: cp[i][1], ry: faceTo(cp[i][0], cp[i][1], 74.5, -11), t: T + i, face: second ? 'shock' : 'doubt', armL: second && i % 2 ? 2.3 : 0.08, armR: second && i % 2 === 0 ? -2.3 : -0.08 }));
    if (!second) { const p = prog(T, 47.44, 49.8); look(lerp(75.5, 76.5, p), D + 4.2, lerp(-5, -4.2, p), 81.5, D + 3.2, -3.5, 0, 46); }
    else { const p = prog(T, 49.8, 52.47); look(lerp(85.5, 84.5, p), D + 5.6, lerp(-2.5, -3.5, p), 74.5, D + 4.2, -11, 0, 46); }
  } };
};
S.furious = () => {
  const w = W_.sea(), root = addRoot(w);
  const cap = av(root, CAPTAIN); const crowd = crowdOnDeck(root); const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD);
  const cx = 78, cz = -6;
  const ring = crowd.concat([mom, dad]).map((a, i, arr) => { const ang = -1.15 + i / (arr.length - 1) * 2.3; const r = 7.5 + (i % 2) * 2.4; return { a, x: cx + Math.cos(ang) * r, z: cz + Math.sin(ang) * r }; });
  return { w, root, update(t, T) {
    w.island.visible = false; w.update(T);
    cap.pose({ x: cx, y: D, z: cz, ry: PI / 2, t: T, face: 'shock', sweat: true, armL: 1.2 + Math.sin(T * 9) * 0.15, armLx: -1.0, armR: -1.2 - Math.sin(T * 9) * 0.15, armRx: -1.0, lift: Math.abs(Math.sin(T * 4)) * 0.15 });
    ring.forEach((o, i) => { const shake = Math.sin(T * 10 + i * 1.3) * 0.25; o.a.pose({ x: o.x, y: D, z: o.z, ry: faceTo(o.x, o.z, cx, cz), t: T + i, face: 'angry', armR: -2.6 - shake, armL: i % 2 ? 2.6 + shake : 0.1, lift: Math.abs(Math.sin(T * 6 + i)) * 0.3 }); });
    boy.pose({ x: cx + 5.2, y: D, z: cz + 1.6, ry: faceTo(cx + 5.2, cz + 1.6, cx, cz), scale: BS, t: T, face: 'angry', armRx: -1.6 });
    const a = lerp(0.7, -0.3, ease(t / 4.32)); const r = 19;
    look(cx + Math.cos(a) * r, D + 12.5, cz + Math.sin(a) * r, cx + 3, D + 3.2, cz, 0, 50);
  } };
};
// M. Sailing to the island
S.steer = () => {
  const w = W_.bridge(), root = addRoot(w);
  const cap = av(root, CAPTAIN);
  return { w, root, update(t, T) {
    w.wheel.rotation.z = -Math.sin(T * 1.6) * 1.2;
    cap.pose({ x: 0, y: 0, z: -0.4, ry: PI, t: T, face: 'sad', armLx: -1.35 + Math.sin(T * 1.6) * 0.2, armRx: -1.35 - Math.sin(T * 1.6) * 0.2, armL: -0.3, armR: 0.3, headX: 0.15 });
    const p = t / 2.1; look(lerp(5.6, 5.0, p), 6.4, lerp(-4.4, -4.0, p), 0, 4.4, -0.3, 0, 50);
  } };
};
S.toIsland = () => {
  const w = W_.sea(), root = addRoot(w);
  return { w, root, update(t, T) { w.island.visible = true; w.update(T); const p = t / 2.03; look(lerp(-300, -270, p), lerp(80, 74, p), lerp(110, 95, p), 400, 20, -30, 0, 46); } };
};
// N. Stepping onto land
S.landing = () => {
  const w = W_.island(), root = addRoot(w);
  const walkers = [PAX[0], PAX[1], PAX[2], PAX[3], PAX[4], PAX[5], { ...PAX[0], shirt: '#ff006e' }].map(o => av(root, o));
  const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD);
  return { w, root, update(t, T) {
    w.update(T);
    const second = T >= 63.9;
    walkers.forEach((a, i) => {
      const lane = (i % 2 ? 1.6 : -1.6), z0 = -32 - i * 6.5, z = z0 + (T - 60.93) * 5.2;
      const onPier = z < -7.5;
      a.group.visible = !second;
      a.pose({ x: lane + (onPier ? 0 : (i - 3) * 2.2), y: onPier ? 2.5 : islandH(lane, z), z: Math.min(z, 6 + i), ry: 0, walk: T * 6 + i, t: T + i, face: ['shock', 'happy', 'shock', 'happy', 'shock', 'happy', 'shock'][i], headYaw: Math.sin(T * 1.5 + i) * 0.4 });
    });
    const ext = (a, x, z, s, f) => a.pose({ x, y: islandH(x, z), z, ry: 0.1 * Math.sign(-x), scale: s, t: T, ...f });
    const amazed = T >= 65.6;
    [boy, mom, dad].forEach(a => a.group.visible = second);
    ext(boy, 0, 4, BS, { face: amazed ? 'happy' : 'shock', armL: amazed ? 2.5 : 0.4, armR: amazed ? -2.5 : -0.4, lift: amazed ? Math.abs(Math.sin(T * 6)) * 0.5 : 0, headYaw: amazed ? 0 : Math.sin(T * 2) * 0.5 });
    ext(mom, -3.6, 2.6, 1, { face: amazed ? 'happy' : 'shock', armLx: amazed ? 0 : -1.6, armL: amazed ? 2.3 : -0.3, headYaw: Math.sin(T * 1.6 + 1) * 0.35 });
    ext(dad, 3.8, 2.4, 1, { face: amazed ? 'happy' : 'shock', armR: amazed ? -2.3 : -0.2, headYaw: Math.sin(T * 1.4 + 2) * 0.35 });
    if (!second) { const p = prog(T, 60.93, 63.9); look(lerp(9, 7, p), islandH(8, 22) + 7.5, lerp(26, 23, p), 0, 4.5, -18, 0, 46); }
    else { const p = prog(T, 63.9, 67.22); look(lerp(-1, 1, p), islandH(0, 15) + 5.6, lerp(15.5, 14, p), 0, islandH(0, 3) + 3.6, 2.6, 0, 46); }
  } };
};
// O. Settling on land; captain's family stays aboard
S.village = () => {
  const w = W_.island(), root = addRoot(w);
  hut(root, -16, 60, '#ff70a6'); hut(root, 14, 64, '#3a86ff'); hut(root, -2, 74, '#ffd23f'); hut(root, 30, 56, '#06d6a0');
  const by = islandH(0, 44);
  mesh(new THREE.PlaneGeometry(9, 7), mat('#e63946', { rough: 1 }), { rx: -PI / 2, x: 0, y: by + 0.08, z: 44, parent: root, cast: false });
  mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ map: texRep(canvas(32, 32, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16); g.fillRect(16, 16, 16, 16); }), 6, 4), transparent: true, opacity: 0.6 }), { rx: -PI / 2, x: 0, y: by + 0.1, z: 44, parent: root, cast: false });
  fruitSpread(root, 0, by - 0.9, 44);
  const boy = av(root, BOY), mom = av(root, MOM), dad = av(root, DAD);
  const kids = [{ ...CKID, shirt: '#ff70a6', hair: 'bob', hairCol: '#7f4f24' }, { ...BOY, shirt: '#06d6a0', detail: 'star' }].map(o => av(root, o));
  const others = [PAX[2], PAX[4]].map(o => av(root, o));
  const melon = watermelon(boy.armR, 0, -2.0, 0.5, 0);
  return { w, root, update(t, T) {
    w.update(T);
    boy.pose({ x: 1.0, y: by, z: 48.6, ry: PI, sit: true, scale: BS, t: T, face: 'happy', armRx: -1.4 - Math.max(0, Math.sin(T * 3)) * 0.8 });
    mom.pose({ x: -3.6, y: by, z: 46.6, ry: PI - 1.1, sit: true, t: T, face: 'happy', armRx: -1.0 });
    dad.pose({ x: 4.6, y: by, z: 46.2, ry: PI + 1.1, sit: true, t: T, face: 'talk', armL: 0.4 });
    kids.forEach((k, i) => { const a = T * 1.6 + i * PI; const x = -10 + Math.cos(a) * 4, z = 52 + Math.sin(a) * 3; k.pose({ x, y: islandH(x, z) + Math.abs(Math.sin(T * 7 + i)) * 0.8, z, ry: a + PI / 2 * (i ? -1 : 1), scale: KS, walk: T * 8, t: T + i, face: 'happy', armL: 1.8, armR: -1.8 }); });
    others.forEach((o, i) => { const x = 12 + i * 4, z = 50 - i; o.pose({ x, y: islandH(x, z), z, ry: -0.6 + i, t: T + i, face: 'happy', armRx: i ? 0 : -2.4, armR: 0.2 }); });
    const p = t / 3.18; look(lerp(3, 1.5, p), by + lerp(9.5, 10.5, p), lerp(31, 29.5, p), 0, by + 3, 48, 0, 50);
  } };
};
S.farewell = () => {
  const w = W_.sea(), root = addRoot(w);
  const cap = av(root, CAPTAIN), wife = av(root, CWIFE), kid = av(root, CKID);
  return { w, root, update(t, T) {
    w.island.visible = true; w.update(T);
    cap.pose({ x: 142, y: D, z: -6.6, ry: -PI / 2 - 0.25, t: T, face: 'smile', armR: -2.5 - Math.sin(T * 8) * 0.35 });
    wife.pose({ x: 142.5, y: D, z: -2.4, ry: -PI / 2 + 0.25, t: T, face: 'happy', armL: 2.5 + Math.sin(T * 8 + 1) * 0.35 });
    kid.pose({ x: 140, y: D, z: -4.6, ry: -PI / 2, scale: KS, t: T, face: 'happy', armL: 2.5, armR: -2.5, lift: Math.abs(Math.sin(T * 6)) * 0.4 });
    const p = ease(t / 3.3); look(lerp(130, 121, p), D + lerp(6, 12, p), lerp(-13, -22, p), 142, D + 4, -4.4, 0, 46);
  } };
};

const SCENES = [[0, 'shipwide'], [2.9, 'deckLife'], [5.68, 'captainTalk'], [11.98, 'dining'], [14.79, 'notice'], [18.32, 'door'], [23.58, 'fruit'], [27.34, 'cabin'], [35.34, 'sneakIn'], [37.6, 'discover'], [40.24, 'boatRide'], [43.8, 'collect'], [47.44, 'expose'], [52.47, 'furious'], [56.79, 'steer'], [58.9, 'toIsland'], [60.93, 'landing'], [67.22, 'village'], [70.4, 'farewell']];
const DIPS = [11.98, 30.99, 35.34, 40.24, 47.44, 60.93, 67.22];
const END = 73.7;
function render(T) {
  CAMK = 1;
  let idx = 0; for (let i = 0; i < SCENES.length; i++) if (T >= SCENES[i][0]) idx = i;
  const [st, key] = SCENES[idx];
  const sc = getScene(key, S[key]);
  for (const k in built) built[k].root.visible = false;
  sc.root.visible = true;
  sc.update(T - st, T);
  renderer.render(sc.w.scene, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.filter = 'brightness(1.05) saturate(1.2) contrast(1.03)'; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none';
  vignette(0.15, '10,10,30');
  let dip = 0; for (const d of DIPS) dip = Math.max(dip, 1 - Math.abs(T - d) / 0.2);
  if (dip > 0) { ctx.fillStyle = `rgba(5,5,20,${0.85 * dip})`; ctx.fillRect(0, 0, W, H); }
  if (T < 0.35) { ctx.fillStyle = `rgba(0,0,0,${1 - T / 0.35})`; ctx.fillRect(0, 0, W, H); }
  captions(T);
  if (T > END - 0.45) { ctx.fillStyle = `rgba(0,0,0,${prog(T, END - 0.45, END)})`; ctx.fillRect(0, 0, W, H); }
}
window.render = render;
window.ready = (async () => { await document.fonts.load('800 60px IX'); await document.fonts.load('900 60px IB'); return true; })();
