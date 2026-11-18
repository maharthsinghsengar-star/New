// First-person rigs (drawn in the VIEW pass): your hands and sleeves, car interiors with the hood ahead, motorbike,
// tuk-tuk, aircraft cockpits, the police-car back seat. Local frames: forward +Z, up +Y, vehicle origin on the ground.
import { THREE, RoundedBoxGeometry, mergeGeometries, STD, LAM, C, V3, TAU, clamp, lerp, canvasTex, cached } from './core.js';
import { carGeo, cabinBodyGeo, paint, TRIM, HEADM, GLASSP } from './vehicles.js';
const PA = (m, o) => { if (o.position) m.position.copy(o.position); return m; };
const NI = g => g.index ? g.toNonIndexed() : g;
const RB = (w, h, d, r = 0.02) => NI(new RoundedBoxGeometry(w, h, d, 2, r));
const SKIN = STD('#d9a27e', { roughness: 0.6 }), SLEEVE = STD('#26292e', { roughness: 0.85 }), DASH = STD('#25282d', { roughness: 0.75 }), DASH2 = STD('#3a3e45', { roughness: 0.7 }), HEADL = STD('#c9c5bd', { roughness: 0.9 });

// ---------- hands ----------
function handGeo(curl, thumb = 0.6) {
  const parts = [NI(new RoundedBoxGeometry(0.084, 0.03, 0.09, 2, 0.012))];
  for (let i = 0; i < 4; i++) { const x = -0.03 + i * 0.02, l1 = i === 0 || i === 3 ? 0.032 : 0.04, l2 = 0.03;
    const a = new THREE.CapsuleGeometry(0.0095, l1, 2, 6); a.rotateX(Math.PI / 2); a.translate(0, 0, l1 / 2); a.rotateX(curl * 0.55);
    const b = new THREE.CapsuleGeometry(0.009, l2, 2, 6); b.rotateX(Math.PI / 2); b.translate(0, 0, l2 / 2); b.rotateX(curl * 1.15); b.translate(0, -Math.sin(curl * 0.55) * l1, Math.cos(curl * 0.55) * l1);
    for (const g of [a, b]) { g.translate(x, 0, 0.045); parts.push(NI(g)); } }
  const t = new THREE.CapsuleGeometry(0.011, 0.04, 2, 6); t.rotateX(Math.PI / 2); t.translate(0, 0, 0.02); t.rotateY(-0.9 + thumb * 0.3); t.rotateX(curl * 0.4); t.translate(0.045, -0.006, 0.0); parts.push(NI(t));
  for (const p of parts) p.deleteAttribute('uv');
  return mergeGeometries(parts);
}
const HG = { grip: handGeo(1.45), open: handGeo(0.12, 1), relax: handGeo(0.6) };
const SLV = (() => { const g = new THREE.CapsuleGeometry(0.048, 0.42, 3, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, -0.27); return g; })();
const CUFF = (() => { const g = new THREE.CylinderGeometry(0.052, 0.052, 0.07, 14, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, -0.08); return g; })();
// an arm: hand at the group origin (fingers +Z, palm -Y), sleeve trailing back along -Z
export function makeArm(pose = 'grip', right = true) {
  const g = new THREE.Group(); const h = new THREE.Mesh(HG[pose], SKIN); if (!right) h.scale.x = -1; g.add(h); const s = new THREE.Mesh(SLV, SLEEVE); g.add(s);
  const cuff = new THREE.Mesh(CUFF, STD('#cfd3d8', { metalness: 0.9, roughness: 0.25 })); cuff.visible = false; g.add(cuff); g.userData = { hand: h, cuff, right };
  return g;
}
export function setPose(arm, pose) { arm.userData.hand.geometry = HG[pose]; }
// place an arm: hand at p (in parent space), pointing away from the shoulder sh, rolled by roll
const _t = new THREE.Vector3();
export function placeArm(arm, p, sh, roll = 0) { const par = arm.parent; arm.position.copy(p); _t.copy(p).multiplyScalar(2).sub(sh); if (par) { par.updateMatrixWorld(true); par.localToWorld(_t); } arm.lookAt(_t); arm.rotateZ(roll); }

// ---------- speedometer / instrument canvases ----------
export function gauge() { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, draw(v, units, rpm = 0.5) { const x = c.getContext('2d'); x.fillStyle = '#05080c'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#1f2a36'; x.lineWidth = 10; x.beginPath(); x.arc(70, 70, 48, Math.PI * 0.8, Math.PI * 2.2); x.stroke();
    x.strokeStyle = rpm > 0.85 ? '#ff3b30' : '#00d0ff'; x.beginPath(); x.arc(70, 70, 48, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * clamp(rpm))); x.stroke();
    x.fillStyle = '#fff'; x.font = '700 54px Poppins'; x.textAlign = 'center'; x.fillText(String(Math.round(v)), 178, 70); x.font = '500 20px Poppins'; x.fillStyle = '#9fb3c8'; x.fillText(units.toUpperCase(), 178, 100); x.fillText('RPM', 70, 76); t.needsUpdate = true; } }; }
const screenTex = (kind) => cached('scr' + kind, () => canvasTex(256, 192, (x, w, h) => { x.fillStyle = '#071018'; x.fillRect(0, 0, w, h);
  if (kind === 'pfd') { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2f7fd8'); g.addColorStop(0.5, '#2f7fd8'); g.addColorStop(0.5, '#8a5a2b'); g.addColorStop(1, '#6a4420'); x.fillStyle = g; x.fillRect(30, 20, 196, 152); x.strokeStyle = '#fff'; x.lineWidth = 2; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(100, 96 + i * 18); x.lineTo(156, 96 + i * 18); x.stroke(); } x.strokeStyle = '#ffd400'; x.lineWidth = 5; x.beginPath(); x.moveTo(80, 96); x.lineTo(115, 96); x.moveTo(141, 96); x.lineTo(176, 96); x.stroke(); }
  if (kind === 'nd') { x.strokeStyle = '#2bd96b'; x.lineWidth = 2; for (let r = 30; r < 100; r += 30) { x.beginPath(); x.arc(128, 150, r, Math.PI, TAU); x.stroke(); } x.strokeStyle = '#ff40d0'; x.beginPath(); x.moveTo(128, 150); x.lineTo(150, 30); x.stroke(); x.fillStyle = '#fff'; x.fillRect(122, 140, 12, 12); }
  if (kind === 'eng') { for (let i = 0; i < 4; i++) { x.strokeStyle = '#3a4a5a'; x.lineWidth = 8; x.beginPath(); x.arc(60 + (i % 2) * 130, 55 + Math.floor(i / 2) * 85, 30, Math.PI * 0.8, Math.PI * 2.2); x.stroke(); x.strokeStyle = '#2bd96b'; x.beginPath(); x.arc(60 + (i % 2) * 130, 55 + Math.floor(i / 2) * 85, 30, Math.PI * 0.8, Math.PI * (1.6 + i * 0.1)); x.stroke(); } }
  if (kind === 'map') { x.fillStyle = '#16324a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4f7fa8'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 150); x.quadraticCurveTo(120, 90, 256, 60); x.stroke(); x.fillStyle = '#ffd400'; x.beginPath(); x.moveTo(128, 120); x.lineTo(118, 140); x.lineTo(138, 140); x.fill(); }
  if (kind === 'hud') { x.clearRect(0, 0, w, h); x.strokeStyle = '#3dff7a'; x.fillStyle = '#3dff7a'; x.lineWidth = 3; x.beginPath(); x.arc(128, 96, 10, 0, TAU); x.stroke(); for (let i = -2; i <= 2; i++) { if (!i) continue; x.beginPath(); x.moveTo(70, 96 + i * 30); x.lineTo(110, 96 + i * 30); x.moveTo(146, 96 + i * 30); x.lineTo(186, 96 + i * 30); x.stroke(); } x.strokeRect(10, 70, 40, 52); x.strokeRect(206, 70, 40, 52); x.font = '700 16px monospace'; x.fillText('480', 14, 102); x.fillText('12K', 210, 102); }
}, true, false));
const scr = (kind, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screenTex(kind), toneMapped: false })); return m; };

// =====================================================================================
// car interior: the real exterior lower body (so you see the hood), plus dash, pillars, roof, seats, wheel and hands
// =====================================================================================
export function carRig(kind, opts = {}) {
  const G = carGeo(kind), S = G.S, g = new THREE.Group(), pm = paint(opts.color || opts.body || '#c62828'); const rhd = !!opts.rhd, dx = (rhd ? -1 : 1) * 0.4;
  const CB = cabinBodyGeo(kind), fy = CB.fy; const body = new THREE.Mesh(CB.g, [pm, pm]); g.add(body); g.add(new THREE.Mesh(G.trim, TRIM)); g.add(new THREE.Mesh(G.head, HEADM));
  const belt = S.gh[0][1], ghTop = Math.max(...S.gh.map(p => p[1])), Wg = S.W - 0.2, zf = S.gh[0][0], zb = S.gh[S.gh.length - 1][0];
  const eye = V3(dx, ghTop - 0.2, (S.doors[1] ?? (zf + zb) / 2) + 0.05); if (kind === 'super' || kind === 'coupe') eye.z = S.doors[1] + 0.25;
  // dashboard + instrument hood + screens (top of the dash sits ~0.2 m below your eyes so you see the hood)
  const zd0 = eye.z + 0.6, zd1 = zf + 0.05, dt = Math.min(eye.y - 0.21, belt + 0.16);
  g.add(PA(new THREE.Mesh(RB(Wg - 0.06, 0.22, zd1 - zd0, 0.06), DASH), { position: V3(0, dt - 0.11, (zd0 + zd1) / 2) }));
  g.add(PA(new THREE.Mesh(RB(0.4, 0.07, 0.2, 0.03), DASH), { position: V3(dx, dt + 0.03, zd0 + 0.12) }));
  const gg = gauge(); const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: gg.tex, toneMapped: false })); sp.position.set(dx, dt - 0.03, zd0 + 0.015); sp.rotation.order = 'YXZ'; sp.rotation.set(-0.35, Math.PI, 0); g.add(sp);
  const ms = scr('map', 0.2, 0.14); ms.position.set(0, dt - 0.06, zd0 + 0.1); ms.rotation.order = 'YXZ'; ms.rotation.set(-0.5, Math.PI, 0); g.add(ms);
  // pillars, roof, b-pillars, door panels (interior colour)
  const strip = (a, b, x, w = 0.09, t = 0.06, mat = DASH2) => { const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy); const m = new THREE.Mesh(RB(w, t, l + 0.04, 0.02), mat); m.position.set(x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2); m.rotation.x = -Math.atan2(dy, dz); g.add(m); };
  for (const s of [-1, 1]) { strip(S.gh[0], S.gh[1], s * (Wg / 2 - 0.02), 0.075, 0.06, DASH2); strip(S.gh[2], S.gh[3], s * (Wg / 2 - 0.02), 0.14, 0.07, DASH2);
    if (S.doors[1] !== undefined && S.doors.length > 2) g.add(PA(new THREE.Mesh(RB(0.06, ghTop - belt, 0.12), DASH2), { position: V3(s * (Wg / 2 - 0.02), (ghTop + belt) / 2, S.doors[1]) }));
    g.add(PA(new THREE.Mesh(RB(0.1, belt + 0.05 - fy, zf - zb + 0.1, 0.03), DASH), { position: V3(s * (S.W / 2 - 0.1), (belt + 0.05 + fy) / 2, (zf + zb) / 2) })); }
  g.add(PA(new THREE.Mesh(RB(S.W - 0.2, 0.03, zf - zb, 0.01), STD('#1d1f23', { roughness: 0.95 })), { position: V3(0, fy + 0.02, (zf + zb) / 2) }));
  g.add(PA(new THREE.Mesh(RB(Wg - 0.02, 0.05, S.gh[1][0] - S.gh[2][0] + 0.12), HEADL), { position: V3(0, ghTop - 0.01, (S.gh[1][0] + S.gh[2][0]) / 2) }));
  
  g.add(PA(new THREE.Mesh(RB(0.26, 0.07, 0.03), DASH), { position: V3(0, ghTop - 0.13, S.gh[1][0] - 0.12) }));
  // seats: the passenger's and the back bench (visible when you look around)
  for (const x of [dx, -dx]) { g.add(PA(new THREE.Mesh(RB(0.5, 0.14, 0.5, 0.05), DASH2), { position: V3(x, fy + 0.25, eye.z + 0.05) })); g.add(PA(new THREE.Mesh(RB(0.5, eye.y - 0.1 - fy - 0.3, 0.14, 0.06), DASH2), { position: V3(x, (eye.y - 0.1 + fy + 0.3) / 2, eye.z - 0.3) })); }
  g.add(PA(new THREE.Mesh(RB(0.26, 0.2, 0.12, 0.05), DASH2), { position: V3(-dx, eye.y + 0.02, eye.z - 0.3) }));
  if (zb < eye.z - 0.9) { g.add(PA(new THREE.Mesh(RB(Wg - 0.25, eye.y - 0.3 - fy - 0.25, 0.16, 0.06), DASH2), { position: V3(0, (eye.y - 0.3 + fy + 0.25) / 2, zb + 0.5) })); g.add(PA(new THREE.Mesh(RB(Wg - 0.25, 0.14, 0.5, 0.05), DASH2), { position: V3(0, fy + 0.25, zb + 0.8) })); }
  // windscreen: faint glass (and an optional crack)
  { const a = S.gh[0], b = S.gh[1], dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy); const ws = new THREE.Mesh(new THREE.PlaneGeometry(Wg - 0.1, l), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.05, depthWrite: false })); ws.position.set(0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2 - 0.02); ws.rotation.x = -Math.atan2(dy, dz) + Math.PI / 2; ws.rotation.y = 0; g.add(ws);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, opacity: 0.9 })); crack.position.copy(ws.position).add(V3(-dx * 0.6, 0.02, 0)); crack.rotation.copy(ws.rotation); crack.rotateY(Math.PI); crack.visible = false; g.add(crack); g.userData.crack = crack; }
  // steering wheel with hands
  const wheel = new THREE.Group(); wheel.position.set(dx, eye.y - 0.33, eye.z + 0.45); wheel.rotation.x = 0.45; g.add(wheel);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 10).rotateX(Math.PI / 2), DASH); col.position.set(dx, eye.y - 0.4, eye.z + 0.63); col.rotation.x = 0.45; g.add(col);
  const sw = new THREE.Group(); wheel.add(sw);
  sw.add(new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.019, 10, 40), STD('#1a1b1e', { roughness: 0.55 })));
  sw.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 18).rotateX(Math.PI / 2), DASH2));
  for (const a of [0.3, Math.PI - 0.3, -Math.PI / 2]) { const sp2 = new THREE.Mesh(RB(0.15, 0.03, 0.02, 0.01), DASH2); sp2.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); sp2.rotation.z = a; sw.add(sp2); }
  const L = makeArm('grip', false), Rr = makeArm('grip', true); sw.add(L, Rr);
  const rim = [Math.PI * 0.8, Math.PI * 0.2].map(a => V3(Math.cos(a) * 0.185, Math.sin(a) * 0.185, -0.02));
  const shoulders = [V3(dx + 0.21, eye.y - 0.28, eye.z - 0.1), V3(dx - 0.21, eye.y - 0.28, eye.z - 0.1)];
  return { g, eye, wheel: sw, gauge: gg, crack: g.userData.crack, kind: 'car', warms: [L, Rr], rim, shoulders };
}
function crackTex() { return cached('crack', () => canvasTex(512, 400, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.9)'; const cx = 260, cy = 210; let s = 7;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU + r() * 0.2; let px = cx, py = cy; x.lineWidth = 2.2; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += Math.cos(a + (r() - 0.5) * 0.5) * (20 + r() * 30); py += Math.sin(a + (r() - 0.5) * 0.5) * (20 + r() * 30); x.lineTo(px, py); } x.stroke(); }
  for (let rr = 20; rr < 120; rr += 26) { x.lineWidth = 1.2; x.beginPath(); for (let k = 0; k <= 22; k++) { const a = k / 22 * TAU; const q = rr * (0.8 + r() * 0.4); k ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(cx, cy, 10, 0, TAU); x.fill(); }, true, false)); }

// motorbike: tank, bars, clocks, little screen, fork & front wheel below
export function motoRig(opts = {}) {
  const g = new THREE.Group(), pm = paint(opts.color || '#e8261c');
  g.add(PA(new THREE.Mesh(RB(0.34, 0.24, 0.56, 0.1), pm), { position: V3(0, 0.92, 0.3) }));
  g.add(PA(new THREE.Mesh(RB(0.5, 0.3, 0.28, 0.1), pm), { position: V3(0, 1.08, 0.75) }));
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.22, depthWrite: false })); sc.position.set(0, 1.32, 0.86); sc.rotation.x = -0.45; g.add(sc);
  const gg = gauge(); const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: gg.tex, toneMapped: false })); cl.position.set(0, 1.235, 0.72); cl.rotation.set(-0.9, Math.PI, 0); cl.rotation.order = 'YXZ'; cl.rotation.set(-0.95, Math.PI, 0); g.add(cl);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.74, 8).rotateZ(Math.PI / 2), TRIM); bar.position.set(0, 1.16, 0.62); g.add(bar);
  for (const s of [-1, 1]) { const fk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), STD('#d8dce2', { metalness: 0.9, roughness: 0.25 })); fk.position.set(s * 0.1, 0.72, 0.98); fk.rotation.x = 0.42; g.add(fk);
    const mr = new THREE.Mesh(RB(0.1, 0.06, 0.02, 0.01), GLASSP); mr.position.set(s * 0.3, 1.4, 0.66); g.add(mr); g.add(PA(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 6), TRIM), { position: V3(s * 0.27, 1.28, 0.66) })); }
  g.add(PA(new THREE.Mesh(RB(0.2, 0.05, 0.6, 0.02), pm), { position: V3(0, 0.66, 1.12) }));
  const L = makeArm('grip', false), R = makeArm('grip', true); g.add(L, R);
  const eye = V3(0, 1.58, 0.05);
  return { g, eye, gauge: gg, arms: [L, R], grips: [V3(0.33, 1.16, 0.62), V3(-0.33, 1.16, 0.62)], kind: 'moto' };
}
export function tukRig(opts = {}) {
  const g = new THREE.Group(), c1 = paint(opts.color || '#2e7d32'), c2 = paint(opts.color2 || '#fdd835');
  g.add(PA(new THREE.Mesh(RB(1.0, 0.5, 0.5, 0.15), c2), { position: V3(0, 0.82, 1.0) }));
  g.add(PA(new THREE.Mesh(RB(1.38, 0.07, 2.3, 0.03), c1), { position: V3(0, 1.8, 0.05) }));
  for (const s of [-1, 1]) { g.add(PA(new THREE.Mesh(RB(0.05, 0.85, 0.05), TRIM), { position: V3(s * 0.55, 1.37, 1.0) })); g.add(PA(new THREE.Mesh(RB(0.06, 0.9, 0.06), TRIM), { position: V3(s * 0.63, 1.35, -0.9) })); }
  g.add(PA(new THREE.Mesh(RB(1.1, 0.06, 0.06), TRIM), { position: V3(0, 1.78, 1.0) }));
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.08, depthWrite: false })); ws.position.set(0, 1.4, 1.0); g.add(ws);
  const gg = gauge(); const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.09), new THREE.MeshBasicMaterial({ map: gg.tex, toneMapped: false })); cl.position.set(0, 1.09, 0.85); cl.rotation.order = 'YXZ'; cl.rotation.set(-0.7, Math.PI, 0); g.add(cl);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.66, 8).rotateZ(Math.PI / 2), TRIM); bar.position.set(0, 1.08, 0.68); g.add(bar);
  const L = makeArm('grip', false), R = makeArm('grip', true); g.add(L, R);
  return { g, eye: V3(0, 1.42, 0.12), gauge: gg, arms: [L, R], grips: [V3(0.3, 1.08, 0.68), V3(-0.3, 1.08, 0.68)], kind: 'tuk' };
}

// aircraft cockpits. eye at the origin of the craft frame offset; forward +Z
export function cockpitRig(kind, opts = {}) {
  const g = new THREE.Group(), frame = STD('#3b4048', { roughness: 0.6 }), ext = paint(opts.color || (kind === 'fighter' ? '#8a929b' : '#f4f6f8'));
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  let eye = V3(0.45, 0, 0), grips = [];
  if (kind === 'jet' || kind === 'twinprop' || kind === 'prop' || kind === 'airliner') { const W = kind === 'prop' ? 1.2 : 1.9, ex = kind === 'prop' ? 0.3 : 0.48; eye = V3(ex, 0, 0);
    add(RB(W, 0.5, 0.55, 0.05), DASH, 0, -0.66, 0.95); add(RB(W + 0.05, 0.08, 0.4, 0.03), DASH, 0, -0.36, 0.95);
    [['pfd', ex], ['nd', ex - 0.32], ['eng', 0], ['pfd', -ex], ['nd', -ex + 0.32]].forEach(([k, x]) => { if (kind === 'prop' && Math.abs(x) > 0.5) return; const m = scr(k, 0.24, 0.18); m.position.set(x, -0.54, 0.665); m.rotation.order = 'YXZ'; m.rotation.set(-0.15, Math.PI, 0); g.add(m); });
    for (const x of kind === 'prop' ? [-0.62, 0.62] : [-0.98, -0.02, 0.98]) { const p = add(RB(0.08, 0.75, 0.08), frame, x, 0.12, 0.95); p.rotation.x = -0.45; }
    add(RB(W + 0.1, 0.1, 0.1), frame, 0, 0.45, 0.78); add(RB(W, 0.06, 0.9), HEADL, 0, 0.52, 0.3);
    for (const s of [-1, 1]) { add(RB(0.06, 0.08, 1.3), frame, s * (W / 2 + 0.04), -0.15, 0.2); add(RB(0.06, 0.6, 0.08), frame, s * (W / 2 + 0.04), 0.15, -0.4); add(RB(0.06, 0.5, 1.4), DASH2, s * (W / 2 + 0.06), -0.6, 0.2); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 14, 0, TAU, 0, Math.PI / 2), ext); nose.rotation.x = Math.PI / 2; nose.scale.set(1, 1.6, 0.55); nose.position.set(0, -0.75, 1.15); g.add(nose);
    // yoke
    for (const x of kind === 'prop' ? [ex] : [ex, -ex]) { add(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8).rotateX(Math.PI / 2), DASH, x, -0.45, 0.62); const yk = add(RB(0.32, 0.05, 0.04), DASH, x, -0.42, 0.45); for (const s of [-1, 1]) add(RB(0.04, 0.13, 0.05), DASH, x + s * 0.15, -0.37, 0.45); }
    grips = [V3(ex + 0.15, -0.36, 0.43), V3(ex - 0.15, -0.36, 0.43)]; }
  if (kind === 'heli') { eye = V3(-0.35, 0, 0);
    add(RB(1.0, 0.32, 0.35, 0.06), DASH, 0, -0.62, 0.72); const m = scr('pfd', 0.2, 0.15); m.position.set(-0.2, -0.55, 0.54); m.rotation.y = Math.PI; m.rotation.x = 0.4; g.add(m); const m2 = scr('map', 0.2, 0.15); m2.position.set(0.15, -0.55, 0.54); m2.rotation.y = Math.PI; m2.rotation.x = 0.4; g.add(m2);
    for (const x of [-0.85, 0, 0.85]) { const p = add(RB(0.05, 1.2, 0.05), frame, x, 0.05, 0.9); p.rotation.x = -0.55 + (x === 0 ? -0.1 : 0); }
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.03, 6, 30, Math.PI), frame); arc.position.set(0, 0.35, 0.55); arc.rotation.x = -0.6; g.add(arc);
    for (const s of [-1, 1]) add(RB(0.04, 0.04, 1.6), frame, s * 0.95, -0.35, 0.1);
    add(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 8), DASH, -0.35, -0.85, 0.32);
    grips = [V3(-0.35, -0.58, 0.32), V3(0.25, -0.8, 0.1)]; }
  if (kind === 'fighter') { eye = V3(0, 0, 0);
    add(RB(0.85, 0.36, 0.4, 0.05), DASH, 0, -0.48, 0.78); for (const x of [-0.26, 0, 0.26]) { const m = scr(x ? 'nd' : 'pfd', 0.2, 0.16); m.position.set(x, -0.43, 0.575); m.rotation.y = Math.PI; m.rotation.x = 0.25; g.add(m); }
    const hud = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.21), new THREE.MeshBasicMaterial({ map: screenTex('hud'), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false })); hud.position.set(0, -0.1, 0.62); hud.rotation.y = Math.PI; hud.rotation.x = 0.15; g.add(hud);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.03, 6, 30, Math.PI), frame); bow.position.set(0, -0.2, 0.75); bow.rotation.x = -0.35; g.add(bow);
    for (const s of [-1, 1]) add(RB(0.05, 0.05, 2.2), frame, s * 0.52, -0.22, -0.2);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 4.2, 16, 1, true), ext); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.6, 2.9); g.add(nose);
    for (const s of [-1, 1]) { const wg = new THREE.Mesh(RB(4.5, 0.12, 2.6, 0.05), ext); wg.position.set(s * 3.0, -0.95, -2.6); wg.rotation.y = s * 0.35; g.add(wg); }
    add(new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8), DASH, 0, -0.75, 0.38); grips = [V3(-0.0, -0.56, 0.38), V3(0.3, -0.5, 0.15)]; }
  const R = makeArm('grip', true), L = makeArm('grip', false); g.add(R, L);
  return { g, eye, arms: [R, L], grips, kind: 'air', air: kind };
}

// back seat of a police car: cage, front seats, officers' heads, windscreen ahead
export function backseatRig() {
  const g = new THREE.Group(); const S = carGeo('sedan').S, belt = S.gh[0][1], ghTop = Math.max(...S.gh.map(p => p[1])), Wg = S.W - 0.2;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const body = new THREE.Mesh(cabinBodyGeo('sedan').g, [paint('#1c2230'), paint('#1c2230')]); g.add(body); for (const s of [-1, 1]) add(RB(0.1, belt + 0.05 - cabinBodyGeo('sedan').fy, 3.2, 0.03), DASH, s * (S.W / 2 - 0.1), (belt + 0.05 + cabinBodyGeo('sedan').fy) / 2, -0.4);
  add(RB(Wg - 0.06, 0.2, 0.7, 0.06), DASH, 0, belt + 0.05, S.gh[0][0] - 0.3);
  for (const s of [-1, 1]) { add(RB(0.52, 0.66, 0.16, 0.06), DASH2, s * 0.4, belt + 0.14, -0.15); add(RB(0.26, 0.2, 0.12, 0.05), DASH2, s * 0.4, belt + 0.55, -0.15);
    add(RB(0.1, 0.07, (S.gh[0][0] - S.gh[1][0]) * 1.6), DASH2, s * (Wg / 2 - 0.02), (S.gh[0][1] + S.gh[1][1]) / 2, (S.gh[0][0] + S.gh[1][0]) / 2).rotation.x = -0.6;
    add(RB(0.08, 0.32, 3.2, 0.03), DASH, s * (S.W / 2 - 0.12), belt - 0.1, -0.4); }
  add(RB(Wg, 0.05, 2.2), HEADL, 0, ghTop - 0.01, -0.35);
  const cage = new THREE.Mesh(new THREE.PlaneGeometry(Wg - 0.1, ghTop - belt + 0.1), new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.7, roughness: 0.4, alphaTest: 0.5, side: THREE.DoubleSide, map: cached('cage', () => canvasTex(128, 128, (x) => { x.clearRect(0, 0, 128, 128); x.fillStyle = '#fff'; for (let i = 0; i < 128; i += 32) { x.fillRect(i, 0, 3, 128); x.fillRect(0, i, 128, 3); } }, true, true)) }));
  cage.material.map.repeat.set(5, 2); cage.position.set(0, (ghTop + belt) / 2, -0.32); g.add(cage);
  // officers (heads with caps)
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.11, 16, 12), STD('#c68863'), s * 0.4, belt + 0.62, 0.05); add(new THREE.CylinderGeometry(0.11, 0.115, 0.08, 16), STD('#1b2233'), s * 0.4, belt + 0.72, 0.05); add(RB(0.36, 0.3, 0.2, 0.08), STD('#1b2233'), s * 0.4, belt + 0.3, 0.05); }
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(Wg, 0.6), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.05, depthWrite: false })); ws.position.set(0, 1.18, 0.6); ws.rotation.x = -0.9; g.add(ws);
  return { g, eye: V3(0.12, belt + 0.3, -0.95), kind: 'back' };
}
