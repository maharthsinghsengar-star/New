// WHAT IF YOUR WANTED LEVEL KEPT INCREASING? — 10-minute first-person 16:9 film. window.renderFrame(t) draws time t.
import { THREE, renderer, scene, camera, VIEW, vcam, sun, vsun, setSky, $, V3, C, LAM, clamp, smooth, lerp, TAU, wrapA, RNG, noise, linK, glow, STD, box, cyl, mesh, canvasTex, signTex, RoundedBoxGeometry, mergeGeometries, disposeTree, lam, std, cached, groundTex, SKYU_ } from './core.js';
import { buildWorld, STY } from './world.js';
import { makeCar, makeBoxy, makeAircraft, paint, SPECS, TRIM } from './vehicles.js';
import { Crowd, looks, gaitJ, POSE, freqOf, baseJ } from './people.js';
import { carRig, motoRig, tukRig, cockpitRig, backseatRig, makeArm, setPose, placeArm } from './rigs.js';
import { plan, SKIES, DURATION, COUNTRIES, FINAL } from './story.js';
import { drawMap, dist } from './globe.js';

await Promise.all(['900', '700', '500'].map(w => document.fonts.load(`${w} 40px Poppins`)));
const CH = plan(); window.DURATION = DURATION;
const EVENTS = CH.flatMap(c => c.ev).sort((a, b) => a.t - b.t);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), QY = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI);
const PA = (m, o) => { if (o.position) m.position.copy(o.position); return m; };
const isCar = k => !!SPECS[k];
const veh = (kind, o = {}) => isCar(kind) ? makeCar(kind, o) : makeBoxy(kind, o);
function hermite(keys) {   // keys: [t, V3]
  const n = keys.length, P = keys.map(k => k[1]), T = keys.map(k => k[0]);
  const M = P.map((p, i) => i === 0 || i === n - 1 ? V3() : P[i + 1].clone().sub(P[i - 1]).divideScalar(T[i + 1] - T[i - 1]));
  return t => { if (t <= T[0]) return P[0].clone(); if (t >= T[n - 1]) return P[n - 1].clone(); let i = 0; while (i < n - 2 && t > T[i + 1]) i++; const h = T[i + 1] - T[i], s = clamp((t - T[i]) / h), s2 = s * s, s3 = s2 * s;
    return V3().addScaledVector(P[i], 2 * s3 - 3 * s2 + 1).addScaledVector(M[i], (s3 - 2 * s2 + s) * h).addScaledVector(P[i + 1], -2 * s3 + 3 * s2).addScaledVector(M[i + 1], (s3 - s2) * h); };
}
function setPoseObj(o, p, yaw, pitch = 0, roll = 0) { o.position.copy(p); o.rotation.set(pitch, yaw, roll, 'YXZ'); }
// camera from a body pose + eye offset + head angles (head yaw > 0 = look left)
function placeCam(P, yaw, pitch, roll, eye, hy = 0, hp = 0, hr = 0, rig = null) {
  _e.set(pitch, yaw, roll, 'YXZ'); const qb = new THREE.Quaternion().setFromEuler(_e);
  camera.position.copy(eye).applyQuaternion(qb).add(P);
  camera.quaternion.copy(qb).multiply(QY).multiply(_q.setFromEuler(_e.set(hp, hy, hr, 'YXZ')));
  if (rig) { rig.position.copy(P); rig.quaternion.copy(qb); }
}
function flashUpd(o, t, cp) { if (!o.flash) return; const d = o.g.position.distanceTo(cp);
  for (const f of o.flash) { const ph = (t * 2.4 + o.phase) % 1, on = f.s < 0 ? ph < 0.5 : ph >= 0.5, st = on && ((t * 13 + o.phase * 3) % 1) < 0.62; f.m.emissiveIntensity = st ? 7 : 0.3; f.gl.material.opacity = st ? 0.95 : 0; f.gl.scale.setScalar(Math.min(1.6 + d * 0.035, 4.5)); } }
const spin = (o, s) => { for (const w of o.wheels || []) w.rotation.x = s / (o.R || 0.34); };

// ---------- HUD ----------
const STAR = (fill, stroke = '#000') => `<svg viewBox="0 0 24 24"><path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
let starKey = '';
function hud(t, S, seg) {
  const lv = EVENTS.filter(e => e.type === 'level' && e.t <= t).length, zero = EVENTS.find(e => e.type === 'zero');
  let shown = lv; if (zero && t > zero.t) shown = Math.max(0, lv - Math.floor((t - zero.t) / 0.16));
  const last = EVENTS.filter(e => e.type === 'level' && e.t <= t).at(-1), pop = last ? t - last.t : 99;
  const mx = t > CH[10].t0 + 4.6 && !(zero && t > zero.t), blink = mx && (t * 4) % 1 < 0.5;
  const key = shown + '|' + (pop < 0.6 ? Math.floor(pop * 20) : 'x') + blink;
  if (key !== starKey) { starKey = key; let h = ''; const N = Math.max(5, shown);
    for (let i = 0; i < N; i++) { const on = i < shown, isNew = on && i === lv - 1 && pop < 0.6; const sc = isNew ? 1 + 0.9 * Math.exp(-pop * 8) * Math.cos(pop * 20) : 1;
      h += `<span style="display:inline-block;transform:scale(${sc.toFixed(3)})">${STAR(on ? (blink ? '#ff3b3b' : '#ffd23f') : 'rgba(255,255,255,.18)', on ? '#000' : 'rgba(0,0,0,.6)')}</span>`; }
    $('stars').innerHTML = h; const sz = N > 10 ? 36 : N > 7 ? 44 : 52; for (const e of $('stars').querySelectorAll('svg')) { e.style.width = e.style.height = sz + 'px'; } }
  $('wanted').style.opacity = seg?.type === 'map' || (S.ch.ci === 0 && t < 4.6) ? 0 : 1;
  // level popup
  const pe = $('pop'); if (pop < 2.6 && last && seg?.type !== 'map') { pe.style.opacity = Math.min(1, pop * 5, (2.6 - pop) * 3); pe.querySelector('.big').textContent = last.why === 'MAXIMUM WANTED LEVEL' ? 'MAXIMUM WANTED LEVEL' : `WANTED LEVEL ${lv}`; pe.querySelector('.why').textContent = last.why === 'MAXIMUM WANTED LEVEL' ? 'EVERY POLICE FORCE + THE ARMY' : last.why; pe.style.transform = `scale(${(1 + 0.25 * Math.exp(-pop * 7)).toFixed(3)})`; } else pe.style.opacity = 0;
  // location tag
  const ch = S.ch, lt = t - ch.t0, l0 = ch.ci === 0 ? 0.6 : 0.8, l1 = ch.ci === 0 ? 4.4 : 5.2, le = $('loc');
  if (lt > l0 && lt < l1) { le.style.opacity = Math.min(1, (lt - l0) * 4, (l1 - lt) * 4); le.querySelector('.flag').textContent = ch.flag; le.querySelector('.cn').textContent = ch.name; le.querySelector('.pl').textContent = ch.place; le.style.transform = `translateX(${(-60 * (1 - smooth((lt - l0) * 3))).toFixed(1)}px)`; } else le.style.opacity = 0;
  $('title').style.opacity = ch.ci === 0 ? clamp(Math.min((lt - 0.2) * 3, (4.3 - lt) * 3)) : 0;
}

// ---------- chapter state ----------
let CUR = null;
function leave(S) { scene.remove(S.W.G); disposeTree(S.W.G); for (const o of S.objs) scene.remove(o); for (const o of S.view) VIEW.remove(o); S.crowd?.dispose(); }
const UNI = { usa: ['#1b2a4a', '#1b2a4a', '#111a2e'], mex: ['#1d2b4a', '#141a28', '#141a28'], esp: ['#1d2c55', '#1d2c55', '#1d2c55'], fra: ['#24325e', '#1b2440', '#1b2440'], uk: ['#141414', '#141414', '#f2f2f2'], ger: ['#1c3f94', '#2a2f3a', '#1c3f94'],
  uae: ['#5c6b3a', '#5c6b3a', '#5c6b3a'], ind: ['#c2a36b', '#b39462', '#8d6e3f'], chn: ['#1c2a4a', '#141a28', '#1c2a4a'], jpn: ['#1f2f5a', '#1f2f5a', '#1f2f5a'], end: ['#1b2a4a', '#1b2a4a', '#111a2e'] };
const SOLDIER = ['#55603a', '#4a5233', '#3d4430'];

function enter(i) {
  if (CUR && CUR.i === i) return CUR;
  if (CUR) leave(CUR);
  const ch = CH[i], S = { i, ch, objs: [], view: [], people: [] }; CUR = S;
  SKYU_.off.value = i * 3.7; setSky(SKIES[ch.sky]);
  const W = buildWorld(ch.world); scene.add(W.G); S.W = W; const R = W.R; S.R = R; const st = STY[ch.style] || STY.usa, rng = RNG(500 + i);
  const add = o => { scene.add(o); S.objs.push(o); return o; }, addV = o => { VIEW.add(o); S.view.push(o); o.visible = false; return o; };
  const side = ch.side || 1, uni = UNI[ch.id];
  const officer = (o = {}) => looks(rng, { shirt: C(uni[0]), trs: C(uni[1]), hat: 'cap', hatC: C(uni[2]), short: false, long: false, vest: ch.id === 'uk' ? C('#d7f000') : null, ...o });
  const soldier = (o = {}) => looks(rng, { shirt: C(SOLDIER[0]), trs: C(SOLDIER[1]), hat: 'helmet', hatC: C(SOLDIER[2]), short: false, long: false, rifle: true, vest: C('#3d4430'), gloves: C('#2a2a22'), ...o });
  if (ch.id === 'end') { enterFinal(S, add, addV, officer, soldier, rng); return S; }
  const T = ch.T, tD0 = ch.t0 + T.drive[0], tD1 = ch.t0 + T.drive[1], Dd = tD1 - tD0;
  S.youS = ta => ch.prof.s(clamp(ta - tD0, 0, Dd)); S.youD = ta => ch.lane(clamp(ta - tD0, 0, Dd));
  // --- your getaway vehicle (outside) + its interior rig
  const cv = ch.car, rhd = !ch.lhd, colr = cv.color || cv.body;
  S.car = add(veh(cv.kind, { ...cv }).g); S.carObj = null;
  S.rig = cv.kind === 'moto' ? motoRig(cv) : cv.kind === 'tuk' ? tukRig(cv) : carRig(cv.kind, { color: colr, body: cv.body, rhd }); addV(S.rig.g);
  // --- aircraft: the one you arrive in and the one you steal
  if (ch.prevCraft) { const pc = makeAircraft(ch.prevCraft, { ...(ch.prevCraftOpts || {}) }); S.inCraft = pc; add(pc.g); S.inRig = cockpitRig(ch.prevCraft, ch.prevCraftOpts || {}); addV(S.inRig.g); }
  const oc = makeAircraft(ch.craft, { door: true, ...(ch.craftOpts || {}) }); S.outCraft = oc; add(oc.g); if (side < 0) oc.g.scale.x = -1;
  S.outRig = cockpitRig(ch.craft, ch.craftOpts || {}); addV(S.outRig.g);
  // --- walking head rig (arms in camera space)
  S.head = addV(new THREE.Group()); S.arms = [makeArm('relax', true), makeArm('relax', false)]; S.head.add(...S.arms);
  // --- traffic
  const kinds = st.traffic;
  S.traffic = ch.traffic.map((c, k) => { let kind = kinds[(rng() * kinds.length) | 0]; const o = { color: st.colors[(rng() * st.colors.length) | 0] };
    if (kind === 'ddbus') o.color = '#d32f2f'; if (kind === 'bus') o.color = '#f9a825'; if (st.cab && rng() < 0.18 && kind === 'sedan') { o.livery = 'taxi'; o.body = '#f7c600'; }
    if (kind === 'cab' && ch.id === 'uk') o.color = '#111'; if (kind === 'tuk') { o.color = '#2e7d32'; o.color2 = '#fdd835'; }
    if (kind === 'truck') o.box = ['#eceff1', '#ffe082', '#90caf9'][(rng() * 3) | 0];
    const v = veh(kind, o); add(v.g); return { ...c, o: v }; });
  // --- chasing police
  S.chasers = ch.chasers.map((c, k) => { const o = veh(c.kind, { livery: c.livery, police: true, body: c.body, roof: c.livery === 'usa' ? '#f6f6f2' : c.livery === 'jpn' ? '#f7f7f4' : undefined, phase: c.phase }); add(o.g); return { ...c, k, o }; });
  // --- police / military helicopters
  S.helis = []; const hp = makeAircraft('heli', { police: true, color: ch.id === 'uk' ? '#f4f4f4' : '#1d2a44', accent: ch.id === 'uk' ? '#d7f000' : '#f4f4f4', searchlight: !!ch.night }); hp.phase = 0.3; hp.flash = hp.g.userData.flash; add(hp.g); S.helis.push({ o: hp, off: 0, dd: -side * 9, y: 30 });
  if (COUNTRIES[i]?.milheli) for (let k = 0; k < 2; k++) { const m = makeAircraft('milheli'); add(m.g); S.helis.push({ o: m, off: -40 - k * 30, dd: side * (14 + k * 10), y: 38 + k * 8, mil: true }); }
  // --- fighter escort (Germany onward) during the flight out
  S.fighters = []; if (i >= 5) for (let k = 0; k < (i >= 8 ? 2 : 1); k++) { const f = makeAircraft('fighter'); add(f.g); S.fighters.push(f); }
  // --- roadblock
  S.rbObjs = []; if (ch.rb) { const rb = ch.rb, n = ch.road.n;
    const place = (kind, o, d, sOff, yawOff, hit) => { const v = veh(kind, o); add(v.g); S.rbObjs.push({ o: v, d, s: rb.s + sOff, yaw: yawOff, hit }); };
    for (let l = 0; l < n; l++) { const d = ch.laneD(l); if (Math.abs(d - rb.d) < 0.5) continue; const near = Math.abs(d - rb.d) < 4;
      if (rb.mil >= 2 && !near && l % 2 === 0) place('tank', { color: '#5a6a38' }, d, 4, Math.PI / 2 + 0.2, false);
      else if (rb.mil >= 1 && !near && l % 2 === 1) place('armored', { color: rb.swat ? '#15171c' : '#4b5320', text: rb.swat ? 'SWAT' : 'ARMY', police: !!rb.swat }, d, 3, Math.PI / 2 - 0.15, false);
      else { const c = ch.chasers[l % ch.chasers.length]; place(c.kind, { livery: c.livery, police: true, body: c.body, roof: c.livery === 'usa' ? '#f6f6f2' : c.livery === 'jpn' ? '#f7f7f4' : undefined, phase: l * 0.37 }, d, (l % 2) * 2, Math.PI / 2 + (l % 2 ? -0.35 : 0.35), near ? Math.sign(d - rb.d) : 0); } }
    for (let l = 0; l < Math.min(2, n); l++) { const c = ch.chasers[(l + 1) % ch.chasers.length]; place(c.kind, { livery: c.livery, police: true, body: c.body, phase: 0.6 + l }, ch.onD(l), 3 + l * 3, Math.PI / 2 + 0.4, 0); }
    // officers / soldiers behind the block
    for (let k = 0; k < 7; k++) { const sol = rb.mil >= 1 && k % 2 === 1; const q = sol ? soldier() : officer(); const d = lerp(-ch.road.n * 3.5, ch.road.n * 3.5, (k + 0.5) / 7) + (rng() - 0.5); if (Math.abs(d - rb.d) < 1.6) continue; const s0 = rb.s + 7 + rng() * 3, pose = sol ? 'rifle' : k % 3 === 0 ? 'stop' : 'aim';
      q.frame = t => { const dodge = Math.abs(d - rb.d) < 4 ? Math.sign(d - rb.d) * 2.2 * smooth((t - rb.t + 0.9) / 0.5) : 0; const p = R.p(s0, d + dodge); const turned = smooth((t - rb.t - 0.3) / 0.6); return { x: p.x, z: p.z, y: 0, yaw: R.yaw(s0) + Math.PI + turned * Math.PI * 0.8 * Math.sign(d - rb.d + 0.01), J: POSE[pose](t, q.seed) }; }; S.people.push(q); } }
  // --- pedestrians on the city sidewalks
  for (const sc of ch.world.sections.filter(s => s.type === 'city')) for (let s = sc.s0 + 8; s < sc.s1 - 8; s += 5 + rng() * 9) { if (rng() < 0.35) continue; const sd = rng() < 0.5 ? 1 : -1, d0 = sd * (W.W + 1.3 + rng() * 2.6), dir = rng() < 0.5 ? 1 : -1, v = 1.1 + rng() * 0.5, q = looks(rng);
    if ((ch.world.reserve || []).some(([a, b, sd2]) => sd2 === sd && s > a - 6 && s < b + 6)) continue;
    q.frame = t => { const tt = t - ch.t0, ss = s + dir * v * tt, ys = S.youS(t), near = Math.abs(ys - ss) < 22 && t > tD0 && t < tD1 && Math.abs(S.youD(t) - d0) < 9;
      const p = R.p(ss, d0); if (near) { const sc2 = smooth((22 - Math.abs(ys - ss)) / 8); return { x: p.x, z: p.z, yaw: R.yaw(ss) + lerp(dir < 0 ? Math.PI : 0, sd > 0 ? -Math.PI / 2 : Math.PI / 2, sc2), J: POSE.scared(t, q.seed) }; }
      return { x: p.x, z: p.z, yaw: R.yaw(ss) + (dir < 0 ? Math.PI : 0), J: gaitJ(v, tt * v * 2.6 + q.seed, t, q.seed) }; }; S.people.push(q); }
  // --- plans for you on foot
  const doorOff = { jet: [6.2, 3.9, 1.6], twinprop: [4.4, 3.8, 1.7], prop: [1.0, 1.9, 0.4], heli: [1.0, 2.1, 0.3], fighter: [4.6, 2.4, 1.2] }[ch.craft];
  const cs = ch.sEnd + 14, P3 = (s, d, y = 0) => R.p(s, d, y);
  const carStop = { s: ch.sEnd, d: ch.lane(Dd) };
  const wingD = { jet: 9.5, twinprop: 10.5, prop: 7, heli: 7.5, fighter: 7 }[ch.craft], wingZ = { jet: -0.5, twinprop: 0.8, prop: 0.8, heli: 0, fighter: -2 }[ch.craft];
  S.board = hermite([[0, P3(carStop.s + 1.5, carStop.d - side * 1.3)], [0.7, P3(carStop.s + 4, carStop.d - side * 0.6)], [1.9, P3(cs + wingZ, side * Math.max(wingD + 1.2, Math.abs(carStop.d) - 1))],
    [2.8, P3(cs + doorOff[0] - 0.3, side * (doorOff[1] + 1.4))], [3.3, P3(cs + doorOff[0], side * doorOff[1], 0)], [3.6, P3(cs + doorOff[0] + 0.3, side * (doorOff[1] - 0.6), doorOff[2])]]);
  if (i > 0) { const cd = ch.carAt.d - side * 1.2; S.run = hermite([[0, P3(-132, side * 3.6)], [0.6, P3(-130, side * 5)], [2.6, P3(-119, (side * 5 + cd) / 2)], [4.0, P3(ch.carAt.s - 1.6, cd)], [4.4, P3(ch.carAt.s - 0.7, cd)]]); }
  // pre-chase spawns (landing chapters: police racing down the runway toward your plane)
  S.chasers.forEach((c, k) => { if (i === 0) { c.spawn = k === 0 ? { arr: [ch.t0 + 13.4, ch.t0 + 17.0], s0: 330, s1: 97, d: -2.4, park: 0.35 } : null; return; }
    c.spawn = { arr: [ch.t0 + 1.2 + k * 0.35, ch.t0 + 6.2 + k * 0.45], s0: 160 + k * 20, s1: -150 + (k % 3) * 14 + Math.floor(k / 3) * 9, d: -side * (9 + (k % 3) * 6 + Math.floor(k / 3) * 3), park: -side * 0.9 }; });
  S.chasers.forEach(c => { let js = tD0 + 0.25 + c.k * 0.32; if (c.spawn) { let tp = tD0; while (tp < tD1 && S.youS(tp) < c.spawn.s1 + 14) tp += 0.1; js = Math.max(js, tp + 0.4); } c.js = js; });
  if (i === 0) buildStore(S, add, addV, officer);
  S.crowd = new Crowd(scene, S.people); S.objs.push(...S.crowd.all);
  return S;
}

// ---------- the 24/7 store (USA) ----------
function buildStore(S, add, addV, officer) {
  const R = S.R, W = S.W.W, g = new THREE.Group(), s0 = 30, s1 = 48, d0 = W + 4.7, d1 = d0 + 13, rng = RNG(9);
  const yaw = R.yaw(39), c = R.p(39, (d0 + d1) / 2); g.position.copy(c); g.rotation.y = yaw; add(g);
  // local: x across (positive = toward the road? we use -d), z along s
  const L = (s, d, y = 0) => V3(-(d - (d0 + d1) / 2), y, s - 39);    // route frame -> store local (x = -d)
  const ws = 18, dp = 13, H = 4.2;
  const floorT = cached('tiles', () => canvasTex(256, 256, (x) => { x.fillStyle = '#e9e7e2'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#d6d3cc'; x.fillRect(0, 0, 128, 128); x.fillRect(128, 128, 128, 128); x.strokeStyle = 'rgba(0,0,0,.12)'; x.strokeRect(0, 0, 256, 256); }));
  floorT.repeat.set(6, 4.5);
  const fl = mesh(new THREE.BoxGeometry(dp, 0.1, ws), LAM(0xffffff, { map: floorT }), 0, 0.12, 0); g.add(fl);
  const wallM = LAM('#f3efe6', { side: THREE.DoubleSide });
  g.add(mesh(new THREE.BoxGeometry(0.2, H, ws), wallM, -dp / 2, H / 2, 0)); for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(dp, H, 0.2), wallM, 0, H / 2, s * ws / 2));
  g.add(mesh(new THREE.BoxGeometry(dp, 0.2, ws), lam('#d9d6cf'), 0, H + 0.1, 0));
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(1.2, 0.05, 2.6), STD('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.4 }), -k * 4 + 2, H - 0.02, s * 4, false));
  // front: glass wall with sliding doors and a sign
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9fc6e6, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.3, depthWrite: false });
  for (const s of [-1, 1]) g.add(PA(new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.0, 7.6), glassM), { position: V3(dp / 2, 1.65, s * 5.2) }));
  g.add(mesh(new THREE.BoxGeometry(0.3, 1.1, ws + 0.4), lam('#c62828'), dp / 2, H - 0.5, 0)); g.add(mesh(new THREE.BoxGeometry(0.3, 0.2, ws), lam('#2b2f34'), dp / 2, 0.2, 0));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.1), STD(0xffffff, { map: signTex('QUICK STOP  24/7', '#c62828', '#fff', 1024, 112), emissive: 0xffffff, emissiveMap: signTex('QUICK STOP  24/7', '#c62828', '#fff', 1024, 112), emissiveIntensity: 0.5 })); sign.position.set(dp / 2 + 0.17, H - 0.5, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  S.doors = [-1, 1].map(s => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.6, 1.4), glassM); d.position.set(dp / 2 + 0.05, 1.45, s * 0.7); g.add(d); return d; });
  // shelves with products
  const prodC = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#f4f4f4', '#6d4c41'];
  for (const z of [-5.5, -2, 2, 5.5]) { for (let x = -4.6; x < 2; x += 3.2) { g.add(mesh(new THREE.BoxGeometry(2.9, 1.7, 0.8), lam('#cfd3d8'), x, 0.95, z)); for (let lvl = 0; lvl < 4; lvl++) for (let k = 0; k < 7; k++) for (const sd of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.28, 0.26 + rng() * 0.1, 0.18), lam(prodC[(rng() * prodC.length) | 0]), x - 1.25 + k * 0.4, 0.38 + lvl * 0.42, z + sd * 0.42, false); g.add(b); } } }
  for (let k = 0; k < 5; k++) g.add(mesh(new THREE.BoxGeometry(0.8, 2.3, 1.7), STD('#dfe8ee', { emissive: '#bfe4ff', emissiveIntensity: 0.6 }), -dp / 2 + 0.6, 1.25, -7.5 + k * 1.8 > 7 ? 7 : -7.5 + k * 1.75));
  // counter + register + cash drawer
  g.add(mesh(new THREE.BoxGeometry(1.0, 1.05, 5), lam('#7a4b2a'), -dp / 2 + 2.6, 0.62, 0)); g.add(mesh(new THREE.BoxGeometry(1.1, 0.06, 5.1), lam('#efe9df'), -dp / 2 + 2.6, 1.17, 0));
  g.add(mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), lam('#2b2f34'), -dp / 2 + 2.6, 1.35, -0.45)); g.add(mesh(new THREE.BoxGeometry(0.04, 0.24, 0.34), STD('#1b6fd8', { emissive: '#1b6fd8', emissiveIntensity: 0.8 }), -dp / 2 + 2.82, 1.62, -0.45, false));
  const drawer = new THREE.Group(); drawer.position.set(-dp / 2 + 2.6, 1.13, -0.45); g.add(drawer); drawer.add(mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), lam('#2b2f34'), 0, 0, 0)); for (let k = 0; k < 5; k++) drawer.add(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.16), lam('#5fae57'), -0.14 + k * 0.07, 0.06, 0, false)); S.drawer = drawer;
  g.add(mesh(new THREE.BoxGeometry(0.4, 2.6, 4.5), lam('#d6c9b0'), -dp / 2 + 0.5, 1.3, 0));
  // alarm beacon
  S.alarm = glow(0xff2020, 3, 0); S.alarm.position.set(-dp / 2 + 0.4, H - 0.4, 2.5); g.add(S.alarm); S.alarmBox = mesh(new THREE.SphereGeometry(0.15, 10, 8), STD('#ff2020', { emissive: '#ff2020', emissiveIntensity: 0 }), -dp / 2 + 0.4, H - 0.4, 2.5, false); g.add(S.alarmBox);
  S.storeG = g; S.storeL = L;
  // cashier
  const q = looks(RNG(4), { shirt: C('#d32f2f'), long: true, hair: C('#3b2a1e') }); const cp = new THREE.Vector3(-dp / 2 + 1.7, 0.17, 0.6).applyMatrix4(g.matrixWorld);
  g.updateMatrixWorld(true); const cw = new THREE.Vector3(-dp / 2 + 1.7, 0.17, 0.6).applyMatrix4(g.matrixWorld);
  q.frame = t => ({ x: cw.x, y: 0.17, z: cw.z, yaw: yaw + Math.PI / 2, J: t > 8.9 && t < 14.5 ? POSE.handsUp(t, 1) : t >= 14.5 ? POSE.scared(t, 1) : POSE.idle(t, 1) });
  S.people.push(q);
  // gun + cash for your hands
  const gun = new THREE.Group(); gun.add(PA(new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.05, 0.2, 2, 0.008), STD('#1c1d20', { metalness: 0.6, roughness: 0.35 })), { position: V3(0, 0.03, 0.06) }));
  gun.add(PA(new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.11, 0.05, 2, 0.008), STD('#1c1d20', { roughness: 0.6 })), { position: V3(0, -0.03, -0.01) })); gun.rotation.x = 0.0;
  S.gun = gun; S.arms[0].add(gun); gun.position.set(0, 0.035, 0.02); gun.visible = false;
  const cash = mesh(new THREE.BoxGeometry(0.16, 0.05, 0.08), lam('#5fae57'), 0, 0.03, 0.06, false); S.arms[1].add(cash); cash.visible = false; S.cash = cash;
  // your car (the red sedan) parked at the curb, the arriving cruiser comes from ahead
}

// ---------- the final chapter: forced landing, surrounded, cuffed, back seat, cell ----------
function enterFinal(S, add, addV, officer, soldier, rng) {
  const ch = S.ch, R = (S.W.R); const T = ch.T;
  S.inCraft = makeAircraft('fighter'); add(S.inCraft.g); S.inRig = cockpitRig('fighter'); addV(S.inRig.g);
  S.head = addV(new THREE.Group()); S.arms = [makeArm('open', true), makeArm('open', false)]; S.head.add(...S.arms);
  for (const a of S.arms) a.userData.cuff.visible = false;
  S.back = backseatRig(); addV(S.back.g);
  S.fighters = [0, 1].map(() => { const f = makeAircraft('fighter'); add(f.g); return f; });
  // the welcome party: police cars lining the runway, a wall of tanks, soldiers, helicopters
  S.static = [];
  const liv = { livery: 'usa', police: true, body: '#1c2230', roof: '#f6f6f2' };
  for (let k = 0; k < 26; k++) { const sd = k % 2 ? 1 : -1, s = -900 + Math.floor(k / 2) * 52, o = veh(k % 5 === 4 ? 'suv' : 'sedan', k % 7 === 3 ? { livery: 'fbi', police: true, body: '#111' } : { ...liv, phase: k * 0.37 }); add(o.g); setPoseObj(o.g, R.p(s, sd * 30), R.yaw(s) + sd * 1.2); S.static.push(o); }
  for (let k = 0; k < 5; k++) { const o = veh('tank', { color: '#5a6a38' }); add(o.g); const d = (k - 2) * 9; setPoseObj(o.g, R.p(-262 + Math.abs(k - 2) * 3, d), R.yaw(0) + Math.PI + (k - 2) * 0.12); if (o.g.userData.turret) o.g.userData.turret.rotation.y = (2 - k) * 0.08; }
  for (let k = 0; k < 4; k++) { const o = veh('armored', { color: '#4b5320', text: 'ARMY' }); add(o.g); setPoseObj(o.g, R.p(-290 + k * 6, (k % 2 ? 1 : -1) * 19), R.yaw(0) + (k % 2 ? -2.2 : 2.2)); }
  for (let k = 0; k < 10; k++) { const o = veh(k % 3 ? 'sedan' : 'suv', k % 4 === 1 ? { livery: 'fbi', police: true, body: '#111' } : { ...liv, phase: k * 0.21 }); add(o.g); const a = -1.25 + k * 0.28; setPoseObj(o.g, R.p(-318 + Math.cos(a) * 26, 6 + Math.sin(a) * 26), R.yaw(0) + a + Math.PI / 2); S.static.push(o); }
  // people in a ring
  const ring = [];
  for (let k = 0; k < 22; k++) { const a = -1.35 + k * 0.128, sol = k % 3 === 1; const q = sol ? soldier() : officer(); const rr = 15 + (k % 2) * 3; const p = R.p(-322 + Math.cos(a) * rr, 6.5 + Math.sin(a) * rr); const yaw = Math.atan2(R.p(-322, 6.5).x - p.x, R.p(-322, 6.5).z - p.z);
    q.frame = t => t > ch.t0 + 6 && t < ch.t0 + T.cuffs[1] ? { x: p.x, z: p.z, yaw, J: POSE[sol ? 'rifle' : 'aim'](t, q.seed) } : null; S.people.push(q); }
  // two officers walk up and cuff you
  for (let k = 0; k < 2; k++) { const q = officer(); const sd = k ? 1 : -1; q.frame = t => { const tt = t - ch.t0; if (tt < 8 || tt > T.cuffs[1]) return null; const u = smooth((tt - 9) / 4); const p = R.p(lerp(-308, -321.2, u), 6.5 + sd * lerp(4, 0.75, u)); const yaw = R.yaw(0) + Math.PI + sd * 0.4 * u;
    return { x: p.x, z: p.z, yaw, J: u < 1 ? gaitJ(u > 0 && u < 1 ? 1.2 : 0, tt * 3.2, t, q.seed) : POSE.cuff(t, q.seed) }; }; S.people.push(q); }
  S.helis = [0, 1, 2].map(k => { const h = makeAircraft(k ? 'milheli' : 'heli', { police: !k, color: '#1d2a44', accent: '#f4f4f4', searchlight: true }); h.flash = h.g.userData.flash; h.phase = k; add(h.g); return h; });
  // escort convoy for the back-seat ride
  S.escort = [0, 1, 2].map(k => { const o = veh(k === 1 ? 'suv' : 'sedan', { ...liv, phase: k * 0.5 }); add(o.g); return o; });
  // the jail cell (far away)
  const J = new THREE.Group(); J.position.set(4000, 0, 4000); add(J); S.jail = J; const cw = LAMs('#b9b6ae');
  J.add(mesh(new THREE.BoxGeometry(4, 0.1, 5), lam('#8d8a84'), 0, 0, 0)); J.add(mesh(new THREE.BoxGeometry(4, 3, 0.2), cw, 0, 1.5, -2.5)); for (const s of [-1, 1]) J.add(mesh(new THREE.BoxGeometry(0.2, 3, 5), cw, s * 2, 1.5, 0)); J.add(mesh(new THREE.BoxGeometry(4, 0.2, 5), cw, 0, 3.05, 0));
  J.add(mesh(new THREE.BoxGeometry(1.8, 0.45, 0.6), lam('#6b6e73'), -1.0, 0.45, -2.1)); J.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), lam('#e8e8e8'), 1.5, 0.25, -2.1));
  J.add(mesh(new THREE.BoxGeometry(12, 0.1, 8), lam('#9a978f'), 0, -0.01, 6.5)); J.add(mesh(new THREE.BoxGeometry(12, 3, 0.2), cw, 0, 1.5, 10)); J.add(mesh(new THREE.BoxGeometry(0.6, 0.06, 2), STD('#fff', { emissive: '#fff8e0', emissiveIntensity: 1.5 }), 0, 3.0, 5, false));
  const barM = STD('#4a4d52', { metalness: 0.7, roughness: 0.4 });
  for (let k = 0; k < 9; k++) J.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 3, 8), barM, -2 + k * 0.25, 1.5, 2.5));
  const door = new THREE.Group(); door.position.set(0.25, 0, 2.58); J.add(door); for (let k = 0; k < 7; k++) door.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 8), barM, k * 0.25, 1.45, 0)); door.add(mesh(new THREE.BoxGeometry(1.7, 0.06, 0.06), barM, 0.75, 1.0, 0)); S.cellDoor = door;
  const guard = officer(); guard.frame = t => { const tt = t - ch.t0; if (tt < T.jail[0] || tt > T.jail[1]) return null; const u = smooth((tt - 27.6) / 3); const p = V3(4000 + 0.8 + u * 4, 0, 4000 + 3.4 + u * 2.6); return { x: p.x, z: p.z, yaw: u > 0 ? 1.0 : Math.PI, J: u > 0 && u < 1 ? gaitJ(1.3, tt * 3, t, 2) : POSE.idle(t, 2) }; }; S.people.push(guard);
  S.crowd = new Crowd(scene, S.people); S.objs.push(...S.crowd.all);
}
const LAMs = c => new THREE.MeshLambertMaterial({ color: c });

// =====================================================================================
// motion helpers
// =====================================================================================
const GEARY = { jet: 1.4, twinprop: 1.5, prop: 0.5, heli: 0, fighter: 1.4, airliner: 3.3 };
const EYE = { jet: V3(0.48, 2.45, 8.4), twinprop: V3(0.48, 2.35, 6.6), prop: V3(0.3, 1.75, 1.0), heli: V3(-0.35, 1.95, 1.65), fighter: V3(0, 2.55, 4.4) };
function landPose(kind, tt, sStop) {
  if (kind === 'heli') { const u = clamp(tt / 5.6); const s = lerp(sStop - 260, sStop, 1 - Math.pow(1 - u, 2.2)), y = 72 * Math.pow(1 - smooth(u), 1.4); return { s, y, pitch: -0.12 * Math.sin(u * Math.PI) * 1.4 + 0.05, roll: 0.04 * Math.sin(tt * 1.3), v: 50 * (1 - u) }; }
  const v0 = { jet: 68, twinprop: 58, prop: 40, fighter: 78 }[kind] || 60, tTD = 4.0, gy = GEARY[kind];
  const sTD = sStop - v0 * 1.3;
  if (tt < tTD) { const dt = tTD - tt; return { s: sTD - v0 * dt, y: gy + 0.11 * v0 * Math.pow(dt, 1.35) * 0.55, pitch: -0.05 - 0.05 * smooth(1 - dt / 1.2), roll: 0.05 * Math.sin(tt * 1.7) * clamp(dt / 2), v: v0 }; }
  const u = clamp((tt - tTD) / 2.6); return { s: sTD + v0 * 2.6 * (u - u * u / 2), y: gy, pitch: -0.1 * Math.exp(-(tt - tTD) * 5), roll: 0, v: v0 * (1 - u), bump: Math.exp(-(tt - tTD) * 6) };
}
function flyPose(kind, tt, s0) {
  if (kind === 'heli') { const lift = smooth(tt / 2.2), fw = Math.max(0, tt - 1.8); return { s: s0 + 4 * fw * fw, y: 13 * lift + 7 * fw * fw * 0.45 + fw * 4, pitch: 0.16 * smooth(fw / 1.2), roll: -0.15 * smooth((tt - 4) / 2), yawOff: -0.25 * smooth((tt - 4) / 3), v: 8 * fw }; }
  const a = { jet: 19, twinprop: 15, prop: 11, fighter: 28 }[kind] || 15, vr = { jet: 60, twinprop: 48, prop: 30, fighter: 72 }[kind] || 50, tr = vr / a, gy = GEARY[kind];
  if (tt < tr) return { s: s0 + 0.5 * a * tt * tt, y: gy, pitch: 0, roll: 0, v: a * tt, yawOff: 0 };
  const dt = tt - tr, k = kind === 'fighter' ? 2.2 : 1; return { s: s0 + 0.5 * a * tr * tr + vr * dt + 0.25 * a * dt * dt, y: gy + 3.2 * k * dt * dt + 4 * k * dt, pitch: -(kind === 'fighter' ? 0.32 : 0.2) * smooth(dt / 1.1), roll: -0.28 * smooth((dt - 1.5) / 1.5), yawOff: -0.22 * smooth((dt - 1.4) / 2.5), v: vr + a * dt * 0.5 };
}
function chaserPose(S, c, t) {
  const ch = S.ch, R = S.R, tD0 = ch.t0 + ch.T.drive[0], tD1 = ch.t0 + ch.T.drive[1], Dd = tD1 - tD0;
  const lagT = t => { const tau = clamp(t - c.lag - tD0, 0, Dd); let s = ch.prof.s(tau), d = ch.lane(tau) + c.off * smooth((tau - 1) / 2); const sStop = ch.sEnd - 15 - c.k * 8;
    if (s > sStop) { s = sStop; d = lerp(d, ch.lane(Dd) + ((c.k % 3) - 1) * 5, 0.7); } return { s, d }; };
  const a = lagT(t), b = lagT(t + 0.08); let p = R.p(a.s, a.d), yaw = R.yaw(a.s) - Math.atan2(b.d - a.d, Math.max(0.05, b.s - a.s)), vis = true, sp = a.s;
  if (Math.hypot(b.s - a.s, b.d - a.d) < 0.002) yaw = R.yaw(a.s) - Math.atan2(c.off, 6) * 0.5;
  const js = c.js, w = smooth((t - js) / 1.6);
  if (w < 1) { let q, qy, qv = true;
    if (c.spawn) { const sp0 = c.spawn, u = clamp((t - sp0.arr[0]) / (sp0.arr[1] - sp0.arr[0])), e = 1 - Math.pow(1 - u, 2.4); const s = lerp(sp0.s0, sp0.s1, e); q = R.p(s, sp0.d * (0.4 + 0.6 * e)); qy = R.yaw(s) + Math.PI + sp0.park * smooth((u - 0.75) / 0.25); sp = s; if (t < sp0.arr[0]) qv = false; }
    else { q = p; qy = yaw; qv = false; }
    p = q.clone().lerp(p, w); yaw = qy + wrapA(yaw - qy) * w; vis = qv || w > 0.6; }
  return { p, yaw, vis, s: sp };
}
const youSpeed = (ch, t) => ch.prof ? ch.prof.v(clamp(t - ch.t0 - ch.T.drive[0], 0, ch.T.drive[1] - ch.T.drive[0])) : 0;

// =====================================================================================
// frame
// =====================================================================================
const tint = $('tint'), fadeEl = $('fade'), flashEl = $('flash'), mapui = $('mapui'), endEl = $('end');
function chapterAt(t) { let i = CH.findIndex(c => t < c.t1); if (i < 0) i = CH.length - 1; return i; }
function cutFade(ch, t) { let f = 0; for (const s of ch.seg) for (const b of [s.t0]) { if (b === ch.t0) continue; const k = Math.abs(t - b); f = Math.max(f, 1 - smooth(k / 0.2)); } return f; }

window.renderFrame = function (t) {
  t = Math.min(t, DURATION - 1e-3);
  const ci = chapterAt(t), S = enter(ci), ch = S.ch, R = S.R, lt = t - ch.t0;
  const seg = ch.seg.find(s => t >= s.t0 && t < s.t1) || ch.seg.at(-1), st = t - seg.t0, sd = seg.t1 - seg.t0;
  for (const o of S.view) o.visible = false;
  for (const a of S.arms) { a.visible = true; a.userData.cuff.visible = false; }
  let fov = 62, focus = null, fade = cutFade(ch, t), shake = 0, flash = 0, tintC = null, tintA = 0, showView = true, mapMode = false, crackOn = false;
  camera.up.set(0, 1, 0);
  // level-up flash
  for (const e of EVENTS) if (e.type === 'level' && t >= e.t && t < e.t + 0.3) flash = Math.max(flash, 0.35 * (1 - (t - e.t) / 0.3));
  const cp = camera.position;
  // --- vehicles & people that live in the world ---
  const youS = S.youS ? S.youS(t) : 0;
  if (ch.id !== 'end') {
    const tD0 = ch.t0 + ch.T.drive[0], tD1 = ch.t0 + ch.T.drive[1], Dd = tD1 - tD0, tau = clamp(t - tD0, 0, Dd);
    // traffic
    for (const c of S.traffic) { const s = c.sAt0 + c.dir * c.v * (t - tD0); const vis = Math.abs(s - youS) < 420; c.o.g.visible = vis; if (!vis) continue; setPoseObj(c.o.g, R.p(s, c.d), R.yaw(s) + (c.dir < 0 ? Math.PI : 0)); spin(c.o, s); }
    // chasers
    for (const c of S.chasers) { const P = chaserPose(S, c, t); c.o.g.visible = P.vis; setPoseObj(c.o.g, P.p, P.yaw); spin(c.o, P.s); flashUpd(c.o, t, cp); }
    // roadblock (+ the cars you smash)
    if (ch.rb) for (const r of S.rbObjs) { let s = r.s, d = r.d, yaw = R.yaw(r.s) + r.yaw; if (r.hit && t > ch.rb.t - 0.05) { const u = clamp((t - ch.rb.t + 0.05) / 1.1), e = 1 - Math.pow(1 - u, 2); s += 9 * e; d += r.hit * 2.2 * e; yaw += r.hit * 1.4 * e; } setPoseObj(r.o.g, R.p(s, d), yaw); flashUpd(r.o, t, cp); }
    // helicopters
    const off = linK([[0, -75], [Dd * 0.35, -50], [Dd * 0.55, 25], [Dd * 0.72, 75], [Dd, 90]]);
    S.helis.forEach((h, k) => { let p, yaw, sH;
      if (t < tD0) { sH = -180 + k * 40; p = R.p(sH, h.dd * 5, h.y + 10 + 3 * Math.sin(t * 0.7 + k)); yaw = R.yaw(sH) + Math.PI + 0.4 * Math.sin(t * 0.3); }
      else { const o2 = off(tau) + h.off; sH = youS + o2; if (t > tD1) sH = ch.sEnd + 40 + h.off; p = R.p(sH, h.dd + 3 * Math.sin(t * 0.5 + k), h.y + 4 * Math.sin(t * 0.8 + k)); yaw = R.yaw(sH) + (o2 > 0 && !h.mil ? Math.PI * smooth(o2 / 40) : 0); }
      setPoseObj(h.o.g, p, yaw, 0.12, 0.05 * Math.sin(t)); for (const r of h.o.rotors) r.rotation.y = t * 38 + k; if (h.o.flash) flashUpd(h.o, t, cp); });
    // police tint when they're close behind you
    if (t > tD0 && t < tD1 + 2) { tintA = 0.06; tintC = (t * 2.4) % 1 < 0.5 ? '#ff1530' : '#1f5bff'; }
  }
  // =====================================================================================
  // you
  // =====================================================================================
  const type = seg.type;
  if (type === 'map') { mapMode = true; showView = false; }
  else if (ch.id === 'end') ({ fov, fade, shake } = finalFrame(S, t, seg, st, fade));
  else if (type === 'land' || type === 'fly') {
    const land = type === 'land', kind = land ? ch.prevCraft : ch.craft, rig = land ? S.inRig : S.outRig, craft = land ? S.inCraft : S.outCraft;
    const P = land ? landPose(kind, st, -135) : flyPose(kind, st, ch.sEnd + 14);
    const yaw = R.yaw(P.s) + (P.yawOff || 0), pos = R.p(P.s, 0, P.y);
    craft.g.visible = false; rig.g.visible = true;
    const eyeL = EYE[kind].clone(); eyeL.y -= GEARY[kind] === undefined ? 0 : 0; const rigEye = rig.eye;
    let hy = 0, hp = -0.04; if (!land && S.fighters.length && st > 4.4 && st < 6.8) hy = 0.95 * Math.sin(Math.PI * (st - 4.4) / 2.4);
    if (land && st > 4.2) hp += -0.03 * Math.sin(st * 30) * (P.bump || 0);
    placeCam(pos, yaw, P.pitch, P.roll, V3(rigEye.x + 0, EYE[kind].y, EYE[kind].z), hy, hp, 0, rig.g);
    // the rig's origin is the eye minus its local eye: offset the cockpit group so its eye sits at the camera
    const off = V3(0, EYE[kind].y, EYE[kind].z).applyQuaternion(rig.g.quaternion); rig.g.position.add(off);
    if (rig.grips) { const [gr, gl] = rig.grips; placeArm(rig.arms[0], gr, V3(rig.eye.x - 0.2 * Math.sign(gr.x - rig.eye.x || 1), -0.35, -0.1), 0.3); placeArm(rig.arms[1], gl, V3(rig.eye.x + 0.25, -0.4, -0.1), -0.3); }
    for (const r of craft.rotors) r.rotation.y = t * 40;
    if (land && S.inCraft) { /* landed craft sits on the runway afterwards */ }
    // escort fighters
    S.fighters.forEach((f, k) => { const sd2 = k ? -1 : 1; const lp = V3(sd2 * (24 + k * 6), 3 + k * 3, 14 - k * 8); _e.set(P.pitch, yaw, P.roll, 'YXZ'); const q = new THREE.Quaternion().setFromEuler(_e); f.g.visible = !land && st > 3.4; f.g.position.copy(lp.applyQuaternion(q).add(pos)); f.g.quaternion.copy(q); f.g.userData.burner.material.opacity = 0.8; });
    fov = 60; shake = land ? 0.004 * (P.bump || 0) * 8 + 0.0015 : 0.0018 + (kind === 'heli' ? 0.002 : 0);
  }
  else if (type === 'drive') {
    const Dd = sd, tau = st, pr = ch.prof, s = pr.s(tau), d = ch.lane(tau), v = pr.v(tau);
    const s2 = pr.s(tau + 0.06), d2 = ch.lane(tau + 0.06), s0 = pr.s(Math.max(0, tau - 0.06)), d0 = ch.lane(Math.max(0, tau - 0.06));
    const yawOf = (sa, da, sb, db) => R.yaw(sa) - Math.atan2(db - da, Math.max(0.03, sb - sa));
    const yaw = Math.hypot(s2 - s, d2 - d) > 0.004 ? yawOf(s, d, s2, d2) : R.yaw(s), yawP = Math.hypot(s - s0, d - d0) > 0.004 ? yawOf(s0, d0, s, d) : yaw;
    const yr = wrapA(yaw - yawP) / 0.06, acc = (pr.v(tau + 0.1) - pr.v(Math.max(0, tau - 0.1))) / 0.2;
    const pos = R.p(s, d), moto = ch.car.kind === 'moto';
    const roll = moto ? clamp(-yr * v * 0.03, -0.5, 0.5) : clamp(yr * v * 0.004, -0.06, 0.06), pitch = clamp(-acc * 0.004, -0.04, 0.05);
    S.car.visible = false; const rig = S.rig; rig.g.visible = true;
    // head: look into curves, glance back twice, look at the roadblock
    const lb = [0.4, 0.76].map(f => f * Dd); let hy = clamp(yr * 0.35, -0.35, 0.35), hp = -0.05;
    for (const a of lb) { const u = (tau - a) / 1.7; if (u > 0 && u < 1) { const k = Math.sin(Math.PI * u) ** 0.7; hy += (moto || ch.car.kind === 'tuk' ? 2.2 : 2.85) * k * (ch.lhd ? -1 : 1); hp += 0.06 * k; } }
    if (ch.rb) { const k = t - ch.rb.t; if (k > -0.05 && k < 0.6) shake += 0.03 * Math.exp(-k * 6); if (k > 0 && rig.crack && ch.ci === 0) crackOn = true; }
    shake += 0.0012 + v * 0.00004;
    placeCam(pos, yaw, pitch, roll, rig.eye, hy, hp, 0, rig.g);
    if (rig.wheel) { rig.wheel.rotation.z = clamp(-yr * 2.2, -1.6, 1.6); rig.g.updateMatrixWorld(true);
      rig.warms.forEach((a, k) => { const shw = rig.g.localToWorld(rig.shoulders[k].clone()); rig.wheel.updateMatrixWorld(true); const shl = rig.wheel.worldToLocal(shw); placeArm(a, rig.rim[k], shl, (k ? -1 : 1) * 1.9); }); }
    if (rig.arms) { const st2 = clamp(-yr * 0.35, -0.3, 0.3); rig.arms.forEach((a, k) => { const gp = rig.grips[k].clone(); gp.y += (k ? -1 : 1) * st2 * 0.12; placeArm(a, gp, V3((k ? -1 : 1) * 0.28, rig.eye.y - 0.45, rig.eye.z - 0.15), (k ? -1 : 1) * 0.35); }); }
    if (rig.crack) rig.crack.visible = crackOn || (ch.ci === 0 && ch.rb && t > ch.rb.t);
    rig.gauge.draw(v * (ch.units === 'mph' ? 2.237 : 3.6), ch.units, clamp(0.25 + (v % 22) / 26));
    fov = 66;
  }
  else {   // on foot: walk / rob / out / run / board
    let path, P, tan, run = 1, hy = 0, hp = -0.06, ph;
    if (type === 'run') path = S.run; else if (type === 'board') path = S.board;
    if (ch.ci === 0 && (type === 'walk' || type === 'rob' || type === 'out')) ({ P, tan, run, hy, hp } = usaFoot(S, t, lt));
    else { P = path(st); const P2 = path(st + 0.05); tan = P2.clone().sub(P); if (tan.lengthSq() < 1e-6) tan = path(st).sub(path(st - 0.05)); run = clamp(tan.length() / 0.05 / 5); }
    const yaw = Math.atan2(tan.x, tan.z); const spd = run;
    const dist = (t * (1.8 + 1.0 * spd)) * Math.PI;
    const bob = (0.025 + 0.04 * spd) * Math.abs(Math.sin(dist)), sway = (0.012 + 0.02 * spd) * Math.sin(dist / 2);
    const pos = V3(P.x, (P.y || 0) + 1.66 - 0.04 * spd + bob, P.z);
    placeCam(pos, yaw, 0, sway * 0.6, V3(sway, 0, 0), hy, hp + 0.02 * Math.sin(dist * 2) * spd, 0, null);
    S.head.visible = true; S.head.position.copy(camera.position); S.head.quaternion.copy(camera.quaternion);
    if (!(ch.ci === 0 && type === 'rob')) { const sw = Math.sin(dist / 2); S.arms.forEach((a, k) => { const sg = k ? -1 : 1, ph2 = sw * sg; setPose(a, spd > 0.4 ? 'grip' : 'relax');
      placeArm(a, V3(sg * 0.24, -0.5 + 0.16 * spd * Math.max(0, ph2) - 0.1 * (1 - spd), -0.32 - 0.12 * spd * ph2), V3(sg * 0.22, -0.55, 0.25), sg * 0.5); a.visible = spd > 0.35; }); }
    if (ch.ci === 0) usaHands(S, t, lt);
    // vehicles parked: your car (until you get in) and the craft you will steal
    const cpos = ch.ci === 0 ? { s: ch.carAt.s, d: ch.carAt.d } : type === 'board' ? { s: ch.sEnd, d: ch.lane(ch.T.drive[1] - ch.T.drive[0]) } : ch.carAt;
    S.car.visible = true; setPoseObj(S.car, R.p(cpos.s, cpos.d), R.yaw(cpos.s));
    fov = 64; shake = 0.001 + 0.002 * spd;
  }
  // aircraft parked on the ground (outside of their own flight segments)
  if (ch.id !== 'end') {
    if (S.inCraft && type !== 'land') { S.inCraft.g.visible = type !== 'map'; const P = landPose(ch.prevCraft, 9, -135); setPoseObj(S.inCraft.g, R.p(P.s, 0, P.y - GEARY[ch.prevCraft] * 0 - (GEARY[ch.prevCraft] ? 0 : 0)), R.yaw(P.s)); S.inCraft.g.position.y = 0; for (const r of S.inCraft.rotors) r.rotation.y = t * 6 * Math.max(0, 1 - (t - ch.t0 - 6.6) / 4); }
    if (type !== 'fly' && type !== 'map') { S.outCraft.g.visible = true; setPoseObj(S.outCraft.g, R.p(ch.sEnd + 14, 0), R.yaw(ch.sEnd + 14)); for (const r of S.outCraft.rotors) r.rotation.y = type === 'board' ? t * 30 * smooth(st / 3) : 0; }
    if (type !== 'drive' && type !== 'walk' && type !== 'rob' && type !== 'out' && type !== 'run' && type !== 'board') S.car.visible = type !== 'map' && type !== 'land' ? true : false;
    if (type === 'fly' || type === 'land' || type === 'map') { S.car.visible = type === 'fly'; if (type === 'fly') setPoseObj(S.car, R.p(ch.sEnd, ch.lane(ch.T.drive[1] - ch.T.drive[0])), R.yaw(ch.sEnd)); }
  }
  S.crowd.update(t);
  // shake
  if (shake) { camera.rotateX(shake * noise.noise(t * 23, 1.3)); camera.rotateY(shake * noise.noise(t * 21, 7.1)); }
  camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  vcam.fov = fov; vcam.position.copy(camera.position); vcam.quaternion.copy(camera.quaternion); vcam.updateProjectionMatrix(); vcam.updateMatrixWorld();
  // sun follows you
  const fwd = V3(0, 0, -1).applyQuaternion(camera.quaternion); focus = camera.position.clone().addScaledVector(fwd, 30); focus.y = Math.max(0, Math.min(focus.y, 30));
  sun.position.copy(focus).addScaledVector(SKYU_.sunDir.value, 300); sun.target.position.copy(focus); vsun.position.copy(SKYU_.sunDir.value).multiplyScalar(10).add(camera.position); vsun.target.position.copy(camera.position);
  // HUD + overlays
  hud(t, S, seg);
  let mapA = 0;
  if (mapMode) { const nx = CH[ci + 1]; const r = drawMapFor(ch, nx, st, sd); mapA = 1; const k = Math.min(st * 3, (sd - st) * 3); fade = Math.max(fade, 1 - clamp(k));
    mapui.style.opacity = clamp(Math.min((st - 0.5) * 3, (sd - st - 0.3) * 3)); mapui.querySelector('.cn').textContent = `${nx.flag} ${nx.name}`; mapui.querySelector('.km').textContent = `${r.km.toLocaleString('en-US')} km`; mapui.querySelector('.via').textContent = ch.craftName ? `in ${ch.craftName}` : ''; }
  else { mapui.style.opacity = 0; renderer.clear(); renderer.render(scene, camera); if (showView) { renderer.clearDepth(); renderer.render(VIEW, vcam); } }
  tint.style.background = tintC || '#000'; tint.style.opacity = tintC ? tintA : 0;
  flashEl.style.opacity = flash; fadeEl.style.opacity = clamp(fade);
};
function drawMapFor(ch, nx, st, sd) { renderer.clear(); return drawMap(ch.ll, nx.ll, ch.id, nx.id, st, sd); }

// ---------- USA: walking into the store, the robbery, running out ----------
function usaFoot(S, t, lt) {
  const R = S.R, W = S.W.W, ch = S.ch, sd = ch.side;
  if (!S.usaPath) { const d0 = W + 2.0, inD = W + 4.7;
    S.usaPath = hermite([[0, R.p(31.5, d0)], [3.6, R.p(37.4, d0 + 0.2)], [4.8, R.p(39, inD - 0.6)], [5.7, R.p(39, inD + 1.6)], [8.0, R.p(39.6, W + 4.7 + 13 - 4.0)], [8.3, R.p(39.6, W + 4.7 + 13 - 4.0)],
      [14.0, R.p(39.6, W + 4.7 + 13 - 4.0)], [14.6, R.p(39.4, W + 4.7 + 13 - 4.6)], [15.6, R.p(39, inD + 2)], [16.4, R.p(39.2, inD - 1.2)], [17.4, R.p(49, W - 1.2)], [18.2, R.p(57.5, ch.carAt.d - 1.6)], [18.6, R.p(60.3, ch.carAt.d - 1.25)]]); }
  const P = S.usaPath(lt), P2 = S.usaPath(lt + 0.05); let tan = P2.clone().sub(P); const spd = tan.length() / 0.05;
  if (spd < 0.05) tan = V3(0, 0, 0);
  // facing: along the path; at the counter face the cashier; turning around takes time
  const facingCounter = R.p(39.6, W + 30).sub(R.p(39.6, W)); let dir = tan.lengthSq() > 1e-8 ? tan : facingCounter;
  if (lt > 7.8 && lt < 14.2) dir = facingCounter;
  let hy = 0, hp = -0.06;
  if (lt > 10.0 && lt < 11.6) { hp = -0.32 * Math.sin(Math.PI * (lt - 10) / 1.6); hy = 0.12 * Math.sin(Math.PI * (lt - 10) / 1.6); }
  if (lt > 1.2 && lt < 3.4) hy = 0.35 * Math.sin(Math.PI * (lt - 1.2) / 2.2);   // glance at the shop sign
  if (lt > 15.6 && lt < 17.2) hy = 0.55 * Math.sin(Math.PI * (lt - 15.6) / 1.6) * -1;   // the cruiser arriving
  // store doors + alarm
  const open = (lt > 4.2 && lt < 6.4) || (lt > 14.8 && lt < 16.8); S.doors.forEach((d, k) => { d.position.z = (k ? 1 : -1) * (0.7 + 1.35 * smooth(open ? Math.min((lt - (lt > 10 ? 14.8 : 4.2)) / 0.6, 1) : 0)); });
  const al = lt > 11.2 && lt < 30 && (lt * 3) % 1 < 0.5; S.alarm.material.opacity = al ? 0.9 : 0; S.alarmBox.material.emissiveIntensity = al ? 4 : 0;
  S.drawer.position.x = -13 / 2 + 2.6 + 0.3 * smooth((lt - 9.6) / 0.5);
  return { P, tan: dir, run: clamp((spd - 1.2) / 3.5), hy, hp };
}
function usaHands(S, t, lt) {
  const [Rh, Lh] = S.arms; const g = lt > 8.4 && lt < 14.1; S.gun.visible = g;
  if (lt >= 8.0 && lt < 14.1) { const up = smooth((lt - 8.3) / 0.45) * (1 - smooth((lt - 13.6) / 0.5)); setPose(Rh, 'grip'); Rh.visible = true;
    placeArm(Rh, V3(0.13, lerp(-0.55, -0.17, up), lerp(-0.3, -0.5, up)), V3(0.24, -0.5, 0.2), 1.57); Rh.rotateZ(-1.57);
    const reach = smooth((lt - 10.0) / 0.6) * (1 - smooth((lt - 11.1) / 0.6)); const hold = lt > 10.8;
    setPose(Lh, reach > 0.5 ? 'open' : 'grip'); Lh.visible = reach > 0.02 || hold && lt < 13.8; placeArm(Lh, V3(lerp(-0.25, -0.05, reach), lerp(-0.55, -0.5, reach), lerp(-0.3, -0.8, reach)), V3(-0.24, -0.5, 0.2), -0.5);
    S.cash.visible = hold && lt < 13.8; }
  else { S.cash.visible = lt >= 14.1 && lt < 18.6 && false; }
}

// ---------- final chapter frame ----------
function finalFrame(S, t, seg, st, fade) {
  const ch = S.ch, R = S.R, T = ch.T, lt = t - ch.t0; let fov = 62, shake = 0.001;
  for (const h of S.helis) { const k = S.helis.indexOf(h); const p = R.p(-300 + k * 30 + 10 * Math.sin(t * 0.3 + k), (k - 1) * 30, 28 + k * 6 + 2 * Math.sin(t * 0.8)); setPoseObj(h.g, p, R.yaw(0) + Math.PI + 0.4 * (k - 1), 0.1, 0); for (const r of h.rotors) r.rotation.y = t * 38; if (h.flash) flashUpd(h, t, camera.position); }
  for (const o of S.static) flashUpd(o, t, camera.position);
  S.jail.visible = seg.type === 'jail';
  const fighterOnGround = () => { S.inCraft.g.visible = true; setPoseObj(S.inCraft.g, R.p(-330, 0), R.yaw(-330)); };
  for (const e of S.escort) e.g.visible = false;
  if (seg.type === 'land') { const P = landPose('fighter', st, -330); const pos = R.p(P.s, 0, P.y), yaw = R.yaw(P.s); S.inCraft.g.visible = false; S.inRig.g.visible = true;
    placeCam(pos, yaw, P.pitch, P.roll, V3(0, EYE.fighter.y, EYE.fighter.z), st > 0.8 && st < 3.2 ? 0.9 * Math.sin(Math.PI * (st - 0.8) / 2.4) : 0, -0.04, 0, S.inRig.g); S.inRig.g.position.add(V3(0, EYE.fighter.y, EYE.fighter.z).applyQuaternion(S.inRig.g.quaternion));
    const [gr, gl] = S.inRig.grips; placeArm(S.inRig.arms[0], gr, V3(-0.2, -0.35, -0.1), 0.3); placeArm(S.inRig.arms[1], gl, V3(0.25, -0.4, -0.1), -0.3);
    S.fighters.forEach((f, k) => { const sd2 = k ? -1 : 1; _e.set(P.pitch, yaw, P.roll, 'YXZ'); const q = new THREE.Quaternion().setFromEuler(_e); f.g.visible = st < 4.2; f.g.position.copy(V3(sd2 * (22 + k * 4), 4 + k * 2, 12 - k * 6 + st * 4).applyQuaternion(q).add(pos)); f.g.quaternion.copy(q); });
    shake = 0.002 + 0.03 * (P.bump || 0); for (const a of S.arms) a.visible = false; }
  else if (seg.type === 'standoff' || seg.type === 'cuffs') { fighterOnGround(); S.fighters.forEach(f => f.g.visible = false);
    const kneel = seg.type === 'cuffs' ? smooth(st / 1.2) : 0; const base = R.p(-326 + 4 * smooth((lt - 7) / 2.5), 6.5);
    const pos = V3(base.x, lerp(1.66, 1.02, kneel), base.z); let hy = 0, hp = -0.02;
    if (seg.type === 'standoff') { hy = 0.75 * Math.sin((lt - 8.2) * 0.9) * smooth((lt - 8) / 1); hp = 0.04 * Math.sin(lt * 0.7); }
    else hp = -lerp(0.0, 0.95, smooth((st - 0.6) / 1.2));
    placeCam(pos, R.yaw(-327), 0, 0.01 * Math.sin(lt * 2), V3(), hy, hp, 0, null); S.head.visible = true; S.head.position.copy(camera.position); S.head.quaternion.copy(camera.quaternion);
    if (seg.type === 'standoff') { const up = smooth((lt - 7.4) / 0.8); S.arms.forEach((a, k) => { const sg = k ? -1 : 1; setPose(a, 'open'); placeArm(a, V3(sg * 0.36, lerp(-0.6, 0.12, up), -0.42), V3(sg * 0.3, -0.5, 0.15), sg * -1.2); a.rotateX(-0.9); a.visible = true; }); }
    else { const c = smooth((st - 1.0) / 1.0); S.arms.forEach((a, k) => { const sg = k ? -1 : 1; setPose(a, 'relax'); placeArm(a, V3(sg * lerp(0.3, 0.065, c), lerp(0.1, -0.2, c), lerp(-0.42, -0.4, c)), V3(sg * 0.25, -0.6, 0.05), sg * 1.4); a.visible = true; a.userData.cuff.visible = st > 2.0; }); }
    fov = 64; }
  else if (seg.type === 'backseat') { S.inCraft.g.visible = false; S.fighters.forEach(f => f.g.visible = false); for (const a of S.arms) a.visible = false;
    const s = -60 + 22 * st + 1.2 * st * st, d = 5.25, pos = R.p(s, d), yaw = R.yaw(s); S.back.g.visible = true; placeCam(pos, yaw, 0, 0, S.back.eye, 0.1 * Math.sin(st * 0.6) + (st > 3.8 && st < 5.6 ? 0.9 * Math.sin(Math.PI * (st - 3.8) / 1.8) : 0), -0.02, 0, S.back.g);
    S.escort.forEach((e, k) => { e.g.visible = true; const es = s + (k === 2 ? -14 : 14 + k * 13), ed = k === 1 ? 1.75 : 5.25; setPoseObj(e.g, R.p(es, ed), R.yaw(es)); spin(e, es); flashUpd(e, t, camera.position); });
    for (const h of S.helis) { const k = S.helis.indexOf(h); setPoseObj(h.g, R.p(s + 40 + k * 25, -10 + k * 12, 35 + k * 5), yaw + Math.PI, 0.1, 0); }
    shake = 0.0025; fov = 64; }
  else if (seg.type === 'jail') { S.inCraft.g.visible = false; for (const a of S.arms) a.visible = false; const J = S.jail.position; const pos = V3(J.x + 0.3 + 0.1 * Math.sin(lt * 0.5), 1.62, J.z - 0.9);
    placeCam(pos, 0, 0, 0, V3(), 0.08 * Math.sin(lt * 0.4), -0.04, 0, null); S.cellDoor.position.x = 0.25 - 1.95 * (1 - smooth((lt - 26.6) / 0.6)) * (lt < 26.6 ? 1 : 1) ; if (lt < 26.6) S.cellDoor.position.x = -1.7;
    shake = lt > 27.2 && lt < 27.6 ? 0.01 : 0.0008; fov = 60;
    const e = smooth((lt - 28.0) / 0.6); endEl.style.opacity = e; endEl.querySelector('.sub').textContent = 'Wanted in 10 countries · 14 stars';
    fade = Math.max(fade, smooth((lt - 32.2) / 0.8)); }
  if (seg.type !== 'jail') endEl.style.opacity = 0;
  return { fov, fade, shake };
}

// =====================================================================================
// audio track (for music.py)
// =====================================================================================
window.TRACK = { duration: DURATION, chapters: CH.map(c => ({ id: c.id, t0: c.t0, t1: c.t1, craft: c.craft || null, prevCraft: c.prevCraft || null, car: c.car?.kind || null, night: !!c.night, rb: c.rb ? { t: c.rb.t, mil: c.rb.mil } : null,
  seg: c.seg.map(s => ({ type: s.type, t0: s.t0, t1: s.t1 })), speed: c.prof && c.T.drive ? Array.from({ length: Math.ceil((c.T.drive[1] - c.T.drive[0]) * 10) }, (_, k) => +c.prof.v(k / 10).toFixed(2)) : [] })),
  levels: EVENTS.filter(e => e.type === 'level').map(e => ({ t: e.t, why: e.why })) };
window.READY = true;
window.DBG = t => { window.renderFrame(t); const c = camera.position; const R = CUR.R; return JSON.stringify({ cam: [c.x, c.y, c.z].map(v => +v.toFixed(1)), rw: [-128, -115, -60, 0].map(s => R.p(s, 0).toArray().map(v => +v.toFixed(1))), secs: CUR.ch.world.sections.map(s => [s.type, Math.round(s.s0), Math.round(s.s1)]), ch: CUR.chasers.map(q => [q.o.g.visible, ...q.o.g.position.toArray().map(v => +v.toFixed(1))]) }); };
window.TOP = t => { window.renderFrame(t); const c = camera.position.clone(); camera.position.set(c.x, 160, c.z + 1); camera.up.set(0, 0, 1); camera.lookAt(c.x, 0, c.z); camera.fov = 70; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); renderer.clear(); renderer.render(scene, camera); camera.up.set(0, 1, 0); };
window.FP = (t, mode) => { window.renderFrame(t); renderer.clear(); if (mode !== 'view') renderer.render(scene, camera); if (mode !== 'world') { renderer.clearDepth(); renderer.render(VIEW, vcam); } const list = []; VIEW.traverse(o => { if (o.isMesh && o.visible) { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) list.push(o.geometry.type + ':' + (o.parent?.type || '')); } }); return list.slice(0, 30).join(','); };
window.FP2 = t => { window.renderFrame(t); const out = []; const cam = camera.position; const ray = new THREE.Raycaster(cam.clone(), V3(0, -1, 0)); const hits = ray.intersectObjects(CUR.W.G.children, true).slice(0, 4);
  for (const h of hits) out.push([h.distance.toFixed(2), h.object.material.map ? h.object.material.map.image?.width + 'x' + h.object.material.map.image?.height : 'nomap', h.object.material.color.getHexString(), h.face.normal.y.toFixed(2)].join(' '));
  return out.join(' | '); };
