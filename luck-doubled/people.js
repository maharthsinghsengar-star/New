// People: articulated instanced figures (faces, hair, hats, rifles). Each person q has q.frame(t) -> { x, y, z, yaw, J } or null.
import { THREE, RoundedBoxGeometry, mergeGeometries, clamp, smooth, lerp, TAU, C, STD, RNG, noise, mT, mRX, mRY, mRZ, mS, ZERO } from './helpers.js';

const PG = (() => {
  const cap = (r, l, y, rs = 10) => { const g = new THREE.CapsuleGeometry(r, l, 3, rs).deleteAttribute('uv'); g.translate(0, y, 0); return g; };
  const torso = cap(0.15, 0.3, 0.3, 14); { const p = torso.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1.18 + 0.16 * smooth((y - 0.28) / 0.25); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * 0.74); } torso.computeVertexNormals(); }
  const sk = new THREE.SphereGeometry(0.105, 20, 14).deleteAttribute('uv'); sk.scale(0.9, 1.07, 0.97); sk.translate(0, 0.14, 0);
  const neck = new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10).deleteAttribute('uv'); neck.translate(0, 0.02, 0);
  const nose = new THREE.SphereGeometry(0.018, 8, 6).deleteAttribute('uv'); nose.scale(0.8, 1.05, 1.1); nose.translate(0, 0.128, 0.099);
  const ears = [-1, 1].map(s => { const e = new THREE.SphereGeometry(0.024, 8, 6).deleteAttribute('uv'); e.scale(0.45, 1, 0.75); e.translate(s * 0.094, 0.138, -0.004); return e; });
  const head = mergeGeometries([sk, neck, nose, ...ears]);
  const hc = new THREE.SphereGeometry(0.112, 20, 12, 0, TAU, 0, Math.PI * 0.56).deleteAttribute('uv'); hc.rotateX(-0.5); hc.scale(0.93, 1.06, 1.0); hc.translate(0, 0.143, -0.006);
  const hairS = hc.clone();
  const back = new RoundedBoxGeometry(0.21, 0.3, 0.07, 2, 0.03).deleteAttribute('uv'); back.translate(0, 0.03, -0.072);
  const hairL = mergeGeometries([hc.clone(), back]);
  const capTop = new THREE.CylinderGeometry(0.105, 0.112, 0.08, 18).deleteAttribute('uv'); capTop.translate(0, 0.245, 0); const brim = new THREE.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, -Math.PI / 2, Math.PI).deleteAttribute('uv'); brim.scale(1, 1, 1.1); brim.translate(0, 0.21, 0.05);
  const hatCap = mergeGeometries([capTop, brim]);
  const helm = new THREE.SphereGeometry(0.135, 18, 10, 0, TAU, 0, Math.PI * 0.55).deleteAttribute('uv'); helm.translate(0, 0.16, -0.01);
  const eyeW = new THREE.SphereGeometry(0.019, 10, 8).deleteAttribute('uv'); eyeW.scale(1, 0.85, 0.6);
  const iris = new THREE.SphereGeometry(0.0115, 8, 6).deleteAttribute('uv'); iris.scale(1, 1, 0.5);
  const mouth = new THREE.SphereGeometry(0.021, 12, 6).deleteAttribute('uv'); mouth.scale(1, 0.3, 0.45);
  const thigh = cap(0.072, 0.31, -0.215), shin = mergeGeometries([cap(0.058, 0.32, -0.215), new RoundedBoxGeometry(0.1, 0.07, 0.24, 2, 0.03).deleteAttribute('uv').translate(0, -0.44, 0.045)]);
  const uarm = cap(0.052, 0.2, -0.145), farm = cap(0.044, 0.19, -0.135), hand = new THREE.SphereGeometry(0.046, 8, 6).deleteAttribute('uv'); hand.scale(0.8, 1.2, 0.6); hand.translate(0, -0.3, 0);
  const rifle = mergeGeometries([new THREE.BoxGeometry(0.05, 0.09, 0.75).deleteAttribute('uv'), new THREE.BoxGeometry(0.04, 0.16, 0.06).deleteAttribute('uv').translate(0, -0.1, 0.05), new THREE.BoxGeometry(0.05, 0.12, 0.22).deleteAttribute('uv').translate(0, -0.03, -0.42)]);
  const vest = new THREE.CylinderGeometry(0.205, 0.19, 0.42, 14).deleteAttribute('uv'); vest.scale(1.05, 1, 0.78); vest.translate(0, 0.32, 0);
  return { torso, head, hairS, hairL, hatCap, helm, eyeW, iris, mouth, thigh, shin, uarm, farm, hand, rifle, vest };
})();

export const JK = ['hipY', 'lean', 'twist', 'headP', 'headY', 'headR', 'lh', 'rh', 'lk', 'rk', 'ls', 'rs', 'la', 'ra', 'le', 're', 'mo'];
export const baseJ = () => ({ hipY: 0.86, lean: 0.02, twist: 0, headP: 0, headY: 0, headR: 0, lh: 0, rh: 0, lk: 0.05, rk: 0.05, ls: 0, rs: 0, la: 0.07, ra: 0.07, le: 0.15, re: 0.15, mo: 0 });
export const blendJ = (a, b, w) => { const o = {}; for (const k of JK) o[k] = lerp(a[k], b[k], w); return o; };
export const freqOf = sp => sp < 0.05 ? 0 : 0.5 + 0.21 * sp;
export function gaitJ(sp, ph, t, seed = 0) {
  const J = baseJ(), a = clamp((sp - 1.9) / 2.4), g = clamp(sp / 0.7), amp = lerp(0.34, 0.85, a) * g, s1 = Math.sin(ph);
  J.lh = s1 * amp + 0.22 * a; J.rh = -s1 * amp + 0.22 * a;
  J.lk = 0.06 + lerp(0.1, 0.3, a) * g + Math.max(0, Math.sin(ph + 1.9)) * lerp(0.55, 1.5, a) * g;
  J.rk = 0.06 + lerp(0.1, 0.3, a) * g + Math.max(0, Math.sin(ph + Math.PI + 1.9)) * lerp(0.55, 1.5, a) * g;
  J.ls = -s1 * amp * lerp(0.7, 1.05, a); J.rs = s1 * amp * lerp(0.7, 1.05, a); J.le = J.re = lerp(0.2, 1.5, a * g); J.lean = lerp(0.03, 0.3, a);
  J.hipY = 0.86 - 0.05 * amp - 0.05 * a + Math.abs(Math.cos(ph)) * lerp(0.02, 0.06, a) * g;
  const idle = 1 - g; J.twist += idle * 0.05 * Math.sin(t * 0.7 + seed); J.headY += idle * 0.25 * Math.sin(t * 0.43 + seed * 3); J.headP += idle * 0.05 * Math.sin(t * 0.31 + seed);
  return J;
}
export const POSE = {
  idle: (t, s) => gaitJ(0, 0, t, s),
  handsUp(t, s) { const J = baseJ(); Object.assign(J, { ls: 2.9, rs: 2.9, la: 0.45, ra: 0.45, le: 0.5, re: 0.5, headP: -0.05 + 0.03 * Math.sin(t * 7 + s), mo: 0.5, lean: -0.04 + 0.02 * Math.sin(t * 9 + s) }); return J; },
  stop(t, s) { const J = baseJ(); Object.assign(J, { rs: 1.55, re: 0.05, ra: 0.1, ls: 0.1, le: 0.3, headY: 0.1 * Math.sin(t * 2 + s), mo: 0.5 + 0.4 * Math.sin(t * 12 + s) }); J.rs += 0.15 * Math.sin(t * 8 + s); return J; },
  aim(t, s) { const J = baseJ(); Object.assign(J, { rs: 1.5, re: 0.15, ra: -0.05, ls: 1.45, le: 0.5, la: -0.35, twist: -0.25, headY: 0.18, lean: 0.06, lh: 0.25, rh: -0.15, lk: 0.2, rk: 0.1 }); return J; },
  rifle(t, s) { const J = baseJ(); Object.assign(J, { rs: 0.9, re: 1.35, ra: 0.05, ls: 1.1, le: 0.9, la: -0.25, twist: -0.1, headP: 0.04 + 0.02 * Math.sin(t + s), headY: 0.1 * Math.sin(t * 0.5 + s) }); return J; },
  point(t, s) { const J = baseJ(); Object.assign(J, { rs: 1.6, re: 0.05, ra: 0.25, ls: 0.15, le: 0.2, headY: 0.1, mo: 0.6 + 0.3 * Math.sin(t * 10 + s) }); return J; },
  scared(t, s) { const J = baseJ(); Object.assign(J, { ls: 1.2, rs: 1.25, le: 1.9, re: 1.95, la: 0.2, ra: 0.2, lean: -0.08, headP: -0.08, mo: 0.8, hipY: 0.84 }); J.twist = 0.05 * Math.sin(t * 9 + s); return J; },
  cuff(t, s) { const J = baseJ(); Object.assign(J, { rs: 0.9, re: 1.5, ls: 0.9, le: 1.5, la: -0.1, ra: -0.1, headP: 0.3, lean: 0.1 }); return J; },
  cheer(t, s) { const J = baseJ(), b = Math.sin(t * 7 + s), b2 = Math.sin(t * 7 + s + 2.2); Object.assign(J, { ls: 2.6 + 0.25 * b, rs: 2.6 + 0.25 * b2, la: 0.4, ra: 0.4, le: 0.3, re: 0.3, headP: -0.12, mo: 0.7, hipY: 0.86 + 0.02 * Math.abs(b) }); return J; },
  clap(t, s) { const J = baseJ(), c = Math.sin(t * 13 + s); Object.assign(J, { ls: 1.25, rs: 1.25, la: -0.25 + 0.2 * c, ra: -0.25 + 0.2 * c, le: 1.05, re: 1.05, headP: -0.05 + 0.03 * Math.sin(t * 2 + s), mo: 0.6, twist: 0.05 * Math.sin(t + s) }); return J; },
  wave(t, s) { const J = baseJ(); Object.assign(J, { rs: 2.6, ra: 0.35 + 0.3 * Math.sin(t * 9 + s), re: 0.6, ls: 0.1, le: 0.25, headP: -0.03, mo: 0.55 }); return J; },
  phone(t, s) { const J = baseJ(); Object.assign(J, { rs: 0.55, re: 1.95, ra: 0.06, ls: 0.06, le: 0.25, headP: 0.42 + 0.03 * Math.sin(t * 0.7 + s), headY: 0.05 * Math.sin(t * 0.5 + s) }); return J; },
};

export const SKINS = ['#f1c7a5', '#e0ac85', '#c68863', '#9c6644', '#6e4630', '#f5d2b8'].map(C);
export const HAIRS = ['#2b1d14', '#3b2a1e', '#0f0d0c', '#6b4325', '#c99a4e', '#a33a1f', '#1a1a1a'].map(C);
export const SHIRTS = ['#ffca28', '#29b6f6', '#f48fb1', '#ab47bc', '#ff7043', '#ec407a', '#90caf9', '#ffffff', '#5c6bc0', '#ffa726', '#8d6e63', '#212121', '#7e57c2'].map(C);
export const PANTS = ['#283593', '#37474f', '#212121', '#4e342e', '#1565c0', '#795548', '#f5f5f5', '#455a64'].map(C);
const IRIS = ['#3b2414', '#2a1a10', '#2f5d8a', '#3f6b3a', '#1a1a1a'].map(C), MOUTH = C('#7a2e2e'), SCL = C('#f4f2ee');
export function looks(r, o = {}) {
  const fem = r() < 0.5, pk = a => a[(r() * a.length) | 0];
  return { skin: pk(SKINS), hair: pk(HAIRS), long: fem && r() < 0.75, shirt: pk(SHIRTS), trs: pk(PANTS), iris: pk(IRIS), sc: fem ? 0.92 + r() * 0.06 : 0.98 + r() * 0.08, seed: r() * 10, short: r() < 0.45, ...o };
}

export class Crowd {
  constructor(parent, people) {
    const n = Math.max(1, people.length); this.p = people;
    const body = new THREE.MeshStandardMaterial({ roughness: 0.68 }), face = new THREE.MeshStandardMaterial({ roughness: 0.3 });
    const M = (g, cnt, mat) => { const m = new THREE.InstancedMesh(g, mat, cnt); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; for (let i = 0; i < cnt; i++) { m.setMatrixAt(i, ZERO); m.setColorAt(i, C('#ffffff')); } parent.add(m); return m; };
    Object.assign(this, { T: M(PG.torso, n, body), V: M(PG.vest, n, body), H: M(PG.head, n, body), HS: M(PG.hairS, n, body), HL: M(PG.hairL, n, body), HC: M(PG.hatCap, n, body), HM: M(PG.helm, n, body),
      EW: M(PG.eyeW, 2 * n, face), EI: M(PG.iris, 2 * n, face), MO: M(PG.mouth, n, face), TH: M(PG.thigh, 2 * n, body), SH: M(PG.shin, 2 * n, body), UA: M(PG.uarm, 2 * n, body), FA: M(PG.farm, 2 * n, body), HA: M(PG.hand, 2 * n, body),
      RF: M(PG.rifle, n, STD(0x202224, { roughness: 0.5, metalness: 0.4 })) });
    this.all = [this.T, this.V, this.H, this.HS, this.HL, this.HC, this.HM, this.EW, this.EI, this.MO, this.TH, this.SH, this.UA, this.FA, this.HA, this.RF];
  }
  dispose() { for (const m of this.all) { m.parent?.remove(m); m.dispose(); } }
  update(t) {
    const { T, V, H, HS, HL, HC, HM, EW, EI, MO, TH, SH, UA, FA, HA, RF } = this;
    this.p.forEach((q, i) => {
      const st = q.frame(t);
      const z1 = [T, V, H, HS, HL, HC, HM, MO, RF], z2 = [EW, EI, TH, SH, UA, FA, HA];
      if (!st) { for (const m of z1) m.setMatrixAt(i, ZERO); for (const m of z2) { m.setMatrixAt(2 * i, ZERO); m.setMatrixAt(2 * i + 1, ZERO); } return; }
      const J = st.J, sc = q.sc, Bm = mT(st.x, st.y || 0, st.z).multiply(mRY(st.yaw)).multiply(mS(sc, sc, sc));
      const hip = Bm.clone().multiply(mT(0, J.hipY, 0)), tor = hip.clone().multiply(mRY(J.twist)).multiply(mRX(J.lean));
      T.setMatrixAt(i, tor); T.setColorAt(i, q.shirt); V.setMatrixAt(i, q.vest ? tor : ZERO); if (q.vest) V.setColorAt(i, q.vest);
      const hd = tor.clone().multiply(mT(0, 0.6, 0)).multiply(mRY(J.headY)).multiply(mRX(J.headP)).multiply(mRZ(J.headR));
      H.setMatrixAt(i, hd); H.setColorAt(i, q.skin);
      HS.setMatrixAt(i, q.long || q.hat ? ZERO : hd); HL.setMatrixAt(i, q.long && !q.hat ? hd : ZERO); HS.setColorAt(i, q.hair); HL.setColorAt(i, q.hair);
      HC.setMatrixAt(i, q.hat === 'cap' ? hd : ZERO); HM.setMatrixAt(i, q.hat === 'helmet' ? hd : ZERO); if (q.hat) { HC.setColorAt(i, q.hatC || q.shirt); HM.setColorAt(i, q.hatC || q.shirt); }
      for (const k of [0, 1]) { const s = k ? -1 : 1; EW.setMatrixAt(2 * i + k, hd.clone().multiply(mT(s * 0.034, 0.153, 0.084))); EI.setMatrixAt(2 * i + k, hd.clone().multiply(mT(s * 0.034, 0.151, 0.0985))); EW.setColorAt(2 * i + k, SCL); EI.setColorAt(2 * i + k, q.iris); }
      MO.setMatrixAt(i, hd.clone().multiply(mT(0, 0.091 - 0.006 * J.mo, 0.094)).multiply(mS(1 - 0.15 * J.mo, 1 + 4.5 * J.mo, 1))); MO.setColorAt(i, MOUTH);
      for (const k of [0, 1]) { const s = k ? -1 : 1, hf = k ? J.rh : J.lh, kn = k ? J.rk : J.lk, sf = k ? J.rs : J.ls, el = k ? J.re : J.le, ab = k ? J.ra : J.la;
        const th = hip.clone().multiply(mT(s * 0.09, 0, 0)).multiply(mRX(-hf)); TH.setMatrixAt(i * 2 + k, th); SH.setMatrixAt(i * 2 + k, th.clone().multiply(mT(0, -0.43, 0)).multiply(mRX(kn)));
        const ua = tor.clone().multiply(mT(s * 0.2, 0.52, 0)).multiply(mRZ(s * ab)).multiply(mRX(-sf)); UA.setMatrixAt(i * 2 + k, ua);
        const fa = ua.clone().multiply(mT(0, -0.29, 0)).multiply(mRX(-el)); FA.setMatrixAt(i * 2 + k, fa); HA.setMatrixAt(i * 2 + k, fa);
        if (k === 1) RF.setMatrixAt(i, q.rifle ? fa.clone().multiply(mT(0.02, -0.3, 0.12)).multiply(mRX(Math.PI / 2 - 0.1)) : ZERO);
        TH.setColorAt(i * 2 + k, q.trs); SH.setColorAt(i * 2 + k, q.trs); UA.setColorAt(i * 2 + k, q.shirt); FA.setColorAt(i * 2 + k, q.short ? q.skin : q.shirt); HA.setColorAt(i * 2 + k, q.gloves || q.skin); }
    });
    for (const m of this.all) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}

// world position of a hand (k = 0 left, 1 right) for a person q in state st (same chain as Crowd.update)
export function handPos(q, st, k) {
  const J = st.J, sc = q.sc, Bm = mT(st.x, st.y || 0, st.z).multiply(mRY(st.yaw)).multiply(mS(sc, sc, sc));
  const tor = Bm.clone().multiply(mT(0, J.hipY, 0)).multiply(mRY(J.twist)).multiply(mRX(J.lean));
  const s = k ? -1 : 1, sf = k ? J.rs : J.ls, el = k ? J.re : J.le, ab = k ? J.ra : J.la;
  const ua = tor.clone().multiply(mT(s * 0.2, 0.52, 0)).multiply(mRZ(s * ab)).multiply(mRX(-sf)); const fa = ua.clone().multiply(mT(0, -0.29, 0)).multiply(mRX(-el));
  return { p: new THREE.Vector3(0, -0.3, 0).applyMatrix4(fa), m: fa };
}
export function headPos(q, st) {
  const J = st.J, sc = q.sc, Bm = mT(st.x, st.y || 0, st.z).multiply(mRY(st.yaw)).multiply(mS(sc, sc, sc));
  const hd = Bm.multiply(mT(0, J.hipY, 0)).multiply(mRY(J.twist)).multiply(mRX(J.lean)).multiply(mT(0, 0.6, 0)).multiply(mRY(J.headY)).multiply(mRX(J.headP));
  return new THREE.Vector3(0, 0.14, 0).applyMatrix4(hd);
}
