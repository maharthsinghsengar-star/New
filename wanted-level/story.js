// Story: 10 countries + the final arrest. Every chapter is planned from data: segments with absolute times, the
// driving profile (s(t), lane d(t)), traffic that never collides with you, chasing police, roadblocks, flights.
import { V3, RNG, clamp, smooth, lerp, linK } from './core.js';

// ---------- skies ----------
const P = (o) => ({ top: '#2a7be4', hor: '#b4dcff', bot: '#cfe6f7', sunDir: V3(-0.5, 0.55, 0.45), sunCol: '#fff3d6', cloudCol: '#ffffff', cloudShade: '#b9cde6', cover: 0.5, clouds: 1,
  fog: '#c4e0f6', fogD: 0.0011, hemiSky: '#d2eaff', hemiGnd: '#a39579', hemiI: 1.2, sunLight: '#fff1dc', sunI: 3.1, exposure: 1.12, envI: 0.9, ...o });
export const SKIES = {
  day: P({}),
  golden: P({ top: '#3b7fd4', hor: '#ffd9a8', sunDir: V3(-0.7, 0.32, 0.4), sunCol: '#ffcf8a', cloudShade: '#e0b090', fog: '#f3d9b8', sunLight: '#ffd29a', hemiSky: '#ffe6c4', sunI: 3.0, exposure: 1.1 }),
  med: P({ top: '#1766e0', hor: '#a9d8ff', cover: 0.62, sunDir: V3(0.4, 0.65, 0.5), fog: '#bfe0fb', fogD: 0.0009 }),
  soft: P({ top: '#3d84dc', hor: '#cfe3f4', cover: 0.38, cloudShade: '#a9bdd6', sunDir: V3(0.6, 0.5, -0.3), fog: '#d2e3f0', sunI: 2.6, hemiI: 1.35 }),
  cloudy: P({ top: '#5c8fd0', hor: '#d6e2ec', cover: 0.3, clouds: 1.2, cloudShade: '#9fb0c4', sunDir: V3(0.3, 0.55, 0.6), fog: '#d4dee8', fogD: 0.0013, sunI: 2.2, hemiI: 1.45 }),
  clear: P({ top: '#1f6fe0', hor: '#b9defc', cover: 0.66, sunDir: V3(-0.3, 0.7, -0.5) }),
  desert: P({ top: '#3c8fe0', hor: '#f5e6c8', bot: '#f0dcb4', cover: 0.75, sunDir: V3(0.5, 0.75, 0.3), fog: '#f1e2c4', fogD: 0.0013, hemiGnd: '#e0c890', sunI: 3.4, exposure: 1.05 }),
  haze: P({ top: '#4f8fd6', hor: '#ffdcae', cover: 0.6, sunDir: V3(-0.6, 0.4, 0.3), sunCol: '#ffd9a0', fog: '#efd6b0', fogD: 0.0016, sunLight: '#ffe0b0', hemiSky: '#ffe8cc', sunI: 2.9 }),
  neon: P({ top: '#060a26', hor: '#3a2a78', bot: '#120d2a', cover: 0.58, clouds: 0.4, cloudCol: '#3a2f6a', cloudShade: '#141030', sunDir: V3(0.4, 0.6, 0.3), sunCol: '#000000', stars: 1, fog: '#2a2050', fogD: 0.0018,
    hemiSky: '#7f8cff', hemiGnd: '#4a3060', hemiI: 1.5, sunLight: '#8fa0ff', sunI: 0.9, exposure: 1.25, envI: 0.7 }),
  dusk: P({ top: '#141c58', hor: '#ff6f91', bot: '#2a1a40', cover: 0.55, clouds: 0.7, cloudCol: '#ff9fb0', cloudShade: '#4a2a6a', sunDir: V3(0.6, 0.06, 0.6), sunCol: '#ff8a70', stars: 0.5, fog: '#6a4a8a', fogD: 0.0014,
    hemiSky: '#a99cff', hemiGnd: '#5a3a60', hemiI: 1.45, sunLight: '#ffb0a0', sunI: 1.2, exposure: 1.2, envI: 0.75 }),
  sunset: P({ top: '#2c3f9a', hor: '#ff9a50', bot: '#5a3a5a', cover: 0.55, cloudCol: '#ffc090', cloudShade: '#8a4a6a', sunDir: V3(-0.7, 0.1, 0.5), sunCol: '#ff9050', fog: '#e8a080', fogD: 0.0012, hemiSky: '#ffc8a0', hemiGnd: '#6a4a50', sunLight: '#ffb070', sunI: 2.6, exposure: 1.12 }),
};

// ---------- the countries ----------
// car: the getaway vehicle; craft: what you fly OUT of this country in
export const COUNTRIES = [
  { id: 'usa', name: 'USA', flag: '🇺🇸', place: 'Los Angeles, California', ll: [-118.24, 34.05], style: 'usa', sky: 'day', lhd: true, units: 'mph',
    car: { kind: 'sedan', color: '#e8261c' }, craft: 'jet', craftName: 'a stolen private jet', road: { n: 2, center: 'dyellow' }, vc: 17, vh: 38,
    police: { kinds: ['sedan', 'sedan', 'suv'], livery: 'usa', body: '#1c2230' }, n: 4, heli: true, roadblock: { mil: 0 }, landmarks: [] },
  { id: 'mex', name: 'MEXICO', flag: '🇲🇽', place: 'Mexico City', ll: [-99.13, 19.43], style: 'mex', sky: 'golden', lhd: true, units: 'km/h',
    car: { kind: 'pickup', livery: 'mex', police: true, body: '#f4f4f4' }, craft: 'twinprop', craftName: 'a stolen airliner', road: { n: 2, center: 'dyellow' }, vc: 18, vh: 36,
    police: { kinds: ['pickup', 'sedan', 'pickup'], livery: 'mex', body: '#f4f4f4' }, n: 5, heli: true, roadblock: { mil: 1 }, level: { at: 12.6, why: 'STOLE A POLICE TRUCK' },
    landmarks: [{ type: 'church', s: 260, d: -130, rot: Math.PI / 2 }, { type: 'mountains', s: 900, d: 2600, rot: -Math.PI / 2 }, { type: 'mountains', s: 300, d: -2800, rot: Math.PI / 2 }] },
  { id: 'esp', name: 'SPAIN', flag: '🇪🇸', place: 'Barcelona', ll: [2.17, 41.39], style: 'esp', sky: 'med', lhd: true, units: 'km/h',
    car: { kind: 'moto', color: '#e8261c' }, craft: 'prop', craftName: 'a stolen seaplane', road: { n: 2, center: 'white' }, vc: 18, vh: 40,
    police: { kinds: ['sedan', 'suv', 'hatch'], livery: 'esp', body: '#f7f7f7', alt: { livery: 'esp_gc', body: '#f4f4f4' } }, n: 5, heli: true, roadblock: { mil: 0 }, level: { at: 'rb', why: 'ESCAPED THE GUARDIA CIVIL' },
    landmarks: [{ type: 'sagrada', s: 380, d: 170, rot: 0 }] },
  { id: 'fra', name: 'FRANCE', flag: '🇫🇷', place: 'Paris', ll: [2.35, 48.86], style: 'fra', sky: 'soft', lhd: true, units: 'km/h',
    car: { kind: 'hatch', color: '#1e5bc6' }, craft: 'heli', craftName: 'a stolen helicopter', road: { n: 2, center: 'white' }, vc: 19, vh: 38,
    police: { kinds: ['hatch', 'sedan', 'van'], livery: 'fra', body: '#f6f6f6', alt: { livery: 'fra_g', body: '#1d2c55' } }, n: 6, heli: true, roadblock: { mil: 0 }, level: { at: 22, why: '180 KM/H PAST THE EIFFEL TOWER' },
    landmarks: [{ type: 'eiffel', s: 520, d: 330, rot: 0.3 }] },
  { id: 'uk', name: 'UNITED KINGDOM', flag: '🇬🇧', place: 'London', ll: [-0.13, 51.51], style: 'uk', sky: 'cloudy', lhd: false, units: 'mph',
    car: { kind: 'cab', color: '#141414' }, craft: 'heli', craftName: 'a stolen police helicopter', craftOpts: { police: true, color: '#f4f4f4', accent: '#1a3fb0' }, road: { n: 2, center: 'white' }, vc: 18, vh: 34,
    police: { kinds: ['sedan', 'hatch', 'suv'], livery: 'uk', body: '#f2f2f2' }, n: 6, heli: true, roadblock: { mil: 0 }, level: { at: 12.8, why: 'STOLE A LONDON TAXI' },
    landmarks: [{ type: 'bigben', s: 430, d: -260, rot: Math.PI / 2 }, { type: 'eye', s: 300, d: -420, rot: 0.4 }] },
  { id: 'ger', name: 'GERMANY', flag: '🇩🇪', place: 'Berlin · Autobahn', ll: [13.4, 52.52], style: 'ger', sky: 'clear', lhd: true, units: 'km/h',
    car: { kind: 'coupe', color: '#c9ccd1' }, craft: 'twinprop', craftName: 'a stolen airliner', road: { n: 3, center: 'none', median: 3, medC: '#f4f4ee' }, vc: 30, vh: 72, allHighway: true, scatter: 'mix',
    police: { kinds: ['suv', 'sedan', 'van'], livery: 'ger', body: '#d6d9dd' }, n: 6, heli: true, roadblock: { mil: 2 }, level: { at: 'rb', why: 'DODGED TANKS AT 260 KM/H' },
    landmarks: [{ type: 'tvtower', s: 1800, d: -500 }], turbines: [{ s: 200, ds: 140, n: 9, d: 260 }, { s: 500, ds: 170, n: 7, d: -330 }] },
  { id: 'uae', name: 'UAE', flag: '🇦🇪', place: 'Dubai', ll: [55.27, 25.2], style: 'uae', sky: 'desert', lhd: true, units: 'km/h',
    car: { kind: 'super', livery: 'uae', police: true, body: '#f7f7f7' }, craft: 'jet', craftName: 'a stolen private jet', road: { n: 3, center: 'none', median: 4, medC: '#f2c200' }, vc: 30, vh: 62, allHighway: true, towerP: 0.92, skyP: 0.6, skyH: 220,
    police: { kinds: ['super', 'suv', 'coupe'], livery: 'uae', body: '#f7f7f7' }, n: 6, heli: true, milheli: true, roadblock: { mil: 2 }, level: { at: 12.8, why: 'STOLE A POLICE SUPERCAR' },
    landmarks: [{ type: 'burj', s: 900, d: 420 }, { type: 'sail', s: 1300, d: -700, rot: 1.2 }] },
  { id: 'ind', name: 'INDIA', flag: '🇮🇳', place: 'Agra', ll: [78.0, 27.18], style: 'ind', sky: 'haze', lhd: false, units: 'km/h',
    car: { kind: 'tuk', color: '#2e7d32', color2: '#fdd835' }, craft: 'twinprop', craftName: 'a stolen cargo plane', road: { n: 2, center: 'white' }, vc: 14, vh: 20, allCity: true,
    police: { kinds: ['suv', 'suv', 'sedan'], livery: 'ind', body: '#f4f4f4' }, n: 6, heli: true, roadblock: { mil: 1 }, level: { at: 12.8, why: 'STOLE A TUK-TUK' },
    landmarks: [{ type: 'taj', s: 330, d: 360, rot: 0.2 }] },
  { id: 'chn', name: 'CHINA', flag: '🇨🇳', place: 'Shanghai', ll: [121.47, 31.23], style: 'chn', sky: 'neon', lhd: true, units: 'km/h', night: true,
    car: { kind: 'suv', color: '#1b1d22' }, craft: 'heli', craftName: 'a stolen helicopter', road: { n: 3, center: 'solid' }, vc: 22, vh: 40,
    police: { kinds: ['sedan', 'suv', 'van'], livery: 'chn', body: '#f4f4f4', alt: { livery: 'swat', body: '#15171c' } }, n: 7, heli: true, milheli: true, roadblock: { mil: 1, swat: true }, level: { at: 'rb', why: 'BROKE THROUGH A SWAT BLOCKADE' },
    landmarks: [{ type: 'pearl', s: 650, d: 300 }, { type: 'pagoda', s: 250, d: -160, rot: 0.6 }] },
  { id: 'jpn', name: 'JAPAN', flag: '🇯🇵', place: 'Tokyo', ll: [139.69, 35.69], style: 'jpn', sky: 'dusk', lhd: false, units: 'km/h', night: true,
    car: { kind: 'coupe', color: '#ff7a1a' }, craft: 'fighter', craftName: 'a stolen FIGHTER JET', road: { n: 2, center: 'white' }, vc: 20, vh: 42,
    police: { kinds: ['sedan', 'sedan', 'suv'], livery: 'jpn', body: '#141414' }, n: 7, heli: true, milheli: true, roadblock: { mil: 1 }, level: { at: 43.2, why: 'STOLE A FIGHTER JET' },
    landmarks: [{ type: 'tokyotower', s: 420, d: 260 }, { type: 'fuji', s: 1500, d: 7000 }, { type: 'torii', s: 120, d: 26, rot: Math.PI / 2 }] },
];
export const FINAL = { id: 'end', name: 'USA', flag: '🇺🇸', place: 'Los Angeles · back where it started', ll: [-118.4, 33.94], style: 'usa', sky: 'sunset', lhd: true };

// ---------- timeline ----------
export const T_USA = 60, T_CH = 57, T_END = 33;
export const DURATION = T_USA + 9 * T_CH + T_END;

// smooth speed profile -> s(t) table
function profile(keys, D, s0 = 0) { const v = linK(keys), dt = 1 / 60, N = Math.ceil(D / dt) + 2, S = new Float64Array(N), Vv = new Float64Array(N); let s = s0;
  for (let i = 0; i < N; i++) { const t = i * dt; S[i] = s; Vv[i] = v(t); s += v(t + dt / 2) * dt; }
  return { s: t => { const f = clamp(t / dt, 0, N - 1.001), i = Math.floor(f); return lerp(S[i], S[i + 1], f - i); }, v: t => v(clamp(t, 0, D)), end: S[Math.min(N - 1, Math.round(D / dt))] }; }

// lane plan: piecewise lane targets, eased
function lanePlan(keys) { return t => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) { const tr = Math.min(1.3, (b - a) * 0.6); return lerp(va, vb, smooth((t - (b - tr)) / tr)); } } return keys[keys.length - 1][1]; }; }

export function plan() {
  const chapters = []; let t0 = 0;
  COUNTRIES.forEach((c, ci) => {
    const first = ci === 0, D = first ? T_USA : T_CH, ch = { ...c, ci, t0, t1: t0 + D, seg: [], ev: [], rng: RNG(100 + ci * 17) };
    const r = ch.rng, side = c.lhd ? 1 : -1;   // forward lanes are on the right (d > 0) for right-hand traffic
    const n = c.road.n, lw = 3.5, med = c.road.median || 0;
    const laneD = i => side * (med / 2 + (i + 0.5) * lw);     // forward lane i (0 = inner)
    const onD = i => -side * (med / 2 + (i + 0.5) * lw);
    const prev = ci > 0 ? COUNTRIES[ci - 1] : null;
    // --- segment times (relative) ---
    let T;
    if (first) T = { walk: [0, 8.0], rob: [8.0, 14.0], out: [14.0, 18.6], drive: [18.6, 44.0], board: [44.0, 47.4], fly: [47.4, 54.0], map: [54.0, 60.0] };
    else T = { land: [0, 6.6], run: [6.6, 11.0], drive: [11.0, 40.0], board: [40.0, 43.6], fly: [43.6, 51.0], map: [51.0, 57.0] };
    ch.T = T; for (const k in T) ch.seg.push({ type: k, t0: t0 + T[k][0], t1: t0 + T[k][1] });
    const Dd = T.drive[1] - T.drive[0];
    // --- driving profile ---
    const vc = c.vc, vh = c.vh, tc = c.allHighway ? 0 : c.allCity ? Dd : Dd * (first ? 0.3 : 0.32);
    const keys = [[0, 0], [2.5, vc * 0.8], [Math.max(3, tc - 1), vc], [Math.min(Dd - 5, tc + 3), vh], [Dd - 4.2, vh], [Dd - 1.2, 9], [Dd, 0]];
    if (c.allHighway) keys.splice(1, 3, [3, vc], [6, vh]);
    keys.sort((a, b) => a[0] - b[0]);
    const startS = first ? 62 : -108;
    const pr = profile(keys, Dd, startS); ch.prof = pr; const sEnd = pr.end;
    ch.sStart = startS; ch.sEnd = sEnd;
    // --- world layout along the route ---
    const sCity = startS < 0 ? 0 : 0, sHwy = c.allHighway ? 0 : c.allCity ? sEnd - 60 : pr.s(tc) + 40;
    ch.world = { style: c.style, seed: 7 + ci * 13, night: !!c.night, road: c.road, landmarks: c.landmarks, turbines: c.turbines, towerP: c.towerP, skyP: c.skyP, skyH: c.skyH, scatter: c.scatter || (c.style === 'uae' ? 'desert' : 'town'),
      S0: -1500, S1: sEnd + 2600, turns: [], sections: [] };
    const len = sEnd - 60;
    const tw = []; for (let s = 120; s < len - 150; s += 220 + r() * 160) tw.push([s, s + 120 + r() * 60, (r() - 0.5) * (c.allHighway ? 0.5 : 0.9)]); ch.world.turns = tw;
    const secs = ch.world.sections; secs.push({ s0: -1500, s1: -115, type: 'runway' }, { s0: -115, s1: 0, type: 'apron' });
    if (sHwy > 0) secs.push({ s0: 0, s1: Math.min(sHwy, len), type: 'city' });
    if (sHwy < len) secs.push({ s0: Math.max(0, sHwy), s1: len, type: c.allHighway ? (c.style === 'uae' ? 'highway' : 'rural') : 'highway' });
    secs.push({ s0: len, s1: sEnd + 120, type: 'apron' }, { s0: sEnd + 120, s1: sEnd + 2600, type: 'runway' });
    if (first) ch.world.reserve = [[28, 54, 1]];
    // --- lane plan: weave between forward lanes, sometimes overtake on the other side ---
    const tStart = 0, lk = []; const d0 = first ? laneD(n - 1) : side * 13; lk.push([0, d0]);
    let t = 2.2, lane = n - 1; while (t < Dd - 4) { let nl; do { nl = (r() * n) | 0; } while (n > 1 && nl === lane); if (!c.allHighway && r() < 0.18 && t > 5) { lk.push([t, onD(0) * 0.7]); t += 1.6 + r(); } lane = nl; lk.push([t, laneD(lane)]); t += 2.4 + r() * 1.8; }
    lk.push([Dd - 3.2, laneD(0) * 0.4 + side * 4]); lk.push([Dd - 1, side * 12]);
    // roadblock: at ~60% of the drive, force your lane to the gap
    let rb = null;
    if (c.roadblock) { const trb = Dd * (first ? 0.62 : 0.6), gapLane = (r() * n) | 0, dg = laneD(gapLane); const srb = pr.s(trb);
      for (let i = lk.length - 1; i >= 0; i--) if (Math.abs(lk[i][0] - trb) < 2.2) lk.splice(i, 1);
      lk.push([trb - 2.2, dg], [trb + 1.6, dg]); lk.sort((a, b) => a[0] - b[0]);
      rb = { t: T.drive[0] + trb + t0, s: srb, d: dg, mil: c.roadblock.mil, swat: c.roadblock.swat }; }
    ch.rb = rb; ch.lane = lanePlan(lk); ch.laneD = laneD; ch.onD = onD; ch.side = side;
    // --- traffic (validated against your path) ---
    ch.traffic = [];
    const tAbs0 = t0 + T.drive[0], tAbs1 = t0 + T.drive[1];
    const youS = ta => pr.s(clamp(ta - tAbs0, 0, Dd)), youD = ta => ch.lane(clamp(ta - tAbs0, 0, Dd));
    const tryCar = (dir, d, v, sAt0) => {   // s(t) = sAt0 + dir * v * (t - tAbs0)
      const sOf = ta => sAt0 + dir * v * (ta - tAbs0);
      for (let ta = tAbs0; ta < tAbs1; ta += 0.05) { const ds = sOf(ta) - youS(ta); if (Math.abs(ds) < 6.5 && Math.abs(youD(ta) - d) < 2.6) return false; }
      if (rb) { for (let ta = t0; ta < ch.t1; ta += 0.25) { const s = sOf(ta); if (Math.abs(s - rb.s) < 14) return false; } }
      if (ch.traffic.some(o => o.d === d && Math.abs(o.sAt0 - sAt0) < 16)) return false;
      ch.traffic.push({ dir, d, v, sAt0, kind: null }); return true; };
    const lanesV = [vc * 0.55, vc * 0.75, vc * 0.85].map((v, i) => c.allHighway ? vh * (0.35 + i * 0.1) : v);
    for (let s = 0; s < sEnd + 200; s += 9 + r() * 22) { const i = (r() * n) | 0; if (r() < 0.55) tryCar(1, laneD(i), lanesV[i], s); else tryCar(-1, onD(i), lanesV[i] * 1.1, s + 200); }
    // --- chasing police ---
    ch.chasers = []; for (let i = 0; i < c.n; i++) { const alt = c.police.alt && i % 3 === 2; ch.chasers.push({ kind: c.police.kinds[i % c.police.kinds.length], livery: alt ? c.police.alt.livery : c.police.livery, body: alt ? c.police.alt.body : c.police.body,
      lag: 0.55 + i * 0.55 + r() * 0.25, off: (i % 3 === 0 ? 0 : i % 3 === 1 ? 2.6 : -2.6) * (0.7 + r() * 0.3), join: tAbs0 + 0.4 + i * 0.5, phase: r() * 6 }); }
    // --- events: wanted level ---
    const L = (at, why) => ch.ev.push({ type: 'level', t: t0 + at, why });
    if (first) { L(11.3, 'ARMED ROBBERY'); L(19.4, 'STOLE A CAR'); if (rb) L(rb.t - t0 + 0.25, 'SMASHED A POLICE ROADBLOCK'); L(46.2, 'STOLE A PRIVATE JET'); }
    else L(c.level.at === 'rb' && rb ? rb.t - t0 + 0.3 : c.level.at, c.level.why);
    // where the vehicles / aircraft are
    ch.carAt = first ? { s: startS, d: d0 } : { s: startS, d: d0 };
    ch.craftAt = { s: sEnd + 34, d: 0 };
    ch.prevCraft = prev ? prev.craft : null; ch.prevCraftOpts = prev ? prev.craftOpts : null;
    chapters.push(ch); t0 += D;
  });
  // final chapter
  const fe = { ...FINAL, ci: 10, t0, t1: t0 + T_END, seg: [], ev: [], rng: RNG(999), T: { land: [0, 7], standoff: [7, 14.5], cuffs: [14.5, 19], backseat: [19, 26], jail: [26, 33] } };
  for (const k in fe.T) fe.seg.push({ type: k, t0: t0 + fe.T[k][0], t1: t0 + fe.T[k][1] });
  fe.ev.push({ type: 'level', t: t0 + 4.6, why: 'MAXIMUM WANTED LEVEL' }); fe.ev.push({ type: 'zero', t: t0 + 29.5 });
  fe.world = { style: 'usa', seed: 77, night: false, road: { n: 3, center: 'dyellow' }, landmarks: [], S0: -1500, S1: 1400, turns: [[300, 500, 0.4]], skyP: 0.3,
    sections: [{ s0: -1500, s1: -200, type: 'runway' }, { s0: -200, s1: 0, type: 'apron' }, { s0: 0, s1: 1400, type: 'highway' }] };
  fe.prevCraft = 'fighter'; fe.prevCraft = 'fighter'; fe.prof = profile([[0, 6], [2, 22], [7, 24]], 7, -120); fe.lane = () => 5.25; fe.side = 1; fe.laneD = i => 1.75 + i * 3.5; fe.onD = i => -1.75 - i * 3.5;
  fe.chasers = []; fe.traffic = [];
  chapters.push(fe);
  return chapters;
}
