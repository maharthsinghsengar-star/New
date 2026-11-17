// Short, round cartoon soldiers (big head, stubby body, googly eyes, thick ink). Canvas puppet, feet at bottom centre.
export const CW = 640, CH = 1000;
const TAU = Math.PI * 2, INK = '#17111f';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function shade(c, k) { const n = parseInt(c.slice(1), 16); const f = v => clamp(Math.round(v * k), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
let LW = 10;
const ink = (x, w = LW) => { x.lineWidth = w; x.strokeStyle = INK; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(); };
const fillInk = (x, c, w = LW) => { x.fillStyle = c; x.fill(); ink(x, w); };
function capsule(x, x1, y1, x2, y2, r1, r2) { const a = Math.atan2(y2 - y1, x2 - x1), n = a + Math.PI / 2; x.beginPath(); x.moveTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1); x.lineTo(x2 + Math.cos(n) * r2, y2 + Math.sin(n) * r2); x.arc(x2, y2, r2, n, n + Math.PI, true); x.lineTo(x1 - Math.cos(n) * r1, y1 - Math.sin(n) * r1); x.arc(x1, y1, r1, n + Math.PI, n, true); x.closePath(); }
function rrect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const cel = (x, path, col, x0, k = 0.8) => { x.save(); path(); x.clip(); x.fillStyle = shade(col, k); x.fillRect(x0, -3000, 3000, 6000); x.restore(); };

export const SPECS = {
  MAJOR: { H: 900, skin: '#e8b48a', hair: '#1b1210', shirt: '#c9a46a', trouser: '#8a7a4a', boot: '#2a1e18', web: '#6f7a45', peaked: '#8f8257', badge: '#ffd23f', cast: true, rank: true, thinMoustache: true },
  SOLDIER: { H: 860, skin: '#c98a5a', hair: '#1b1210', shirt: '#b99a62', trouser: '#7f7244', boot: '#2a1e18', web: '#6f7a45', helmet: '#6b7a3c', moustache: true, rifle: true },
  SOLDIER2: { H: 870, skin: '#d99a6c', hair: '#1b1210', shirt: '#c2a066', trouser: '#857848', boot: '#2a1e18', web: '#6f7a45', helmet: '#73823f', rifle: true },
  SOLDIER3: { H: 850, skin: '#b9784a', hair: '#1b1210', shirt: '#bf9c60', trouser: '#7c7042', boot: '#2a1e18', web: '#6f7a45', helmet: '#66763a', moustache: true, rifle: true },
  RAIDER: { H: 880, silhouette: true },
};
export function defaultState() {
  return { yaw: 0, tilt: 0, lean: 0, breathe: 0, walk: -1, brow: 0, smile: 0.3, open: 1, mouth: 0, lookX: 0, lookY: 0, armL: [0.15, 0.3, 'fist'], armR: [0.15, 0.3, 'fist'], rifleOn: true };
}

export function drawPerson(x, S, st, t = 0) {
  const H = S.H, sw = H * 0.19, hipY = -H * 0.27, shY = -H * 0.6;
  x.save(); x.translate(CW / 2, CH - 26);
  const walk = st.walk >= 0, ph = st.walk;
  x.translate(0, -(walk ? Math.abs(Math.sin(ph)) * 14 : 0)); x.rotate(st.lean);
  if (S.silhouette) { silhouette(x, S, st, H, sw, hipY, shY, walk, ph); x.restore(); return; }
  legs(x, S, H, hipY, walk, ph);
  if (S.rifle && st.rifleOn && st.rifleSling) rifle(x, sw * 0.2, shY + 40, -0.5, 1.0, true);
  body(x, S, H, sw, hipY, shY, st);
  x.save(); x.translate(0, shY + 10); x.rotate(st.tilt); x.translate(0, -(shY + 10));
  head(x, S, st, H, shY - H * 0.17, t);
  x.restore();
  arm(x, S, H, sw, shY, -1, st.armR, st);
  arm(x, S, H, sw, shY, 1, st.armL, st);
  if (S.rifle && st.rifleOn && !st.rifleSling && st.armR.hand) { const [hx, hy] = st.armR.hand; rifle(x, hx - 40, hy - 6, st.rifleAim ? -0.08 : -1.1, 1.0, false); }
  if (S.cast) sling(x, st, H);
  x.restore();
}

function silhouette(x, S, st, H, sw, hipY, shY, walk, ph) {
  const col = '#2b2440', c2 = '#3b3356';
  for (const s of [-1, 1]) { const lift = walk ? Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 26 : 0; capsule(x, s * H * 0.07, hipY, s * H * 0.075, -30 - lift, H * 0.055, H * 0.05); x.fillStyle = col; x.fill(); }
  x.beginPath(); x.moveTo(-sw * 0.95, shY + 10); x.quadraticCurveTo(-sw * 1.2, -H * 0.2, -sw * 1.0, -H * 0.12); x.lineTo(sw * 1.0, -H * 0.12); x.quadraticCurveTo(sw * 1.2, -H * 0.2, sw * 0.95, shY + 10); x.quadraticCurveTo(0, shY - 30, -sw * 0.95, shY + 10); x.fillStyle = c2; x.fill();
  x.beginPath(); x.arc(0, shY - H * 0.17, H * 0.16, 0, TAU); x.fillStyle = col; x.fill();
  x.beginPath(); x.ellipse(0, shY - H * 0.28, H * 0.17, H * 0.09, 0, Math.PI, TAU); x.fillStyle = c2; x.fill();       // turban
  x.save(); x.translate(sw * 0.9, shY + 30); x.rotate(-1.0); x.fillStyle = col; x.fillRect(-10, -H * 0.35, 20, H * 0.5); x.restore();   // rifle shape
}

function legs(x, S, H, hipY, walk, ph) {
  const lw = H * 0.085, gap = H * 0.085;
  for (const s of [-1, 1]) {
    const lift = walk ? Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 34 : 0, lx = s * gap, ank = -H * 0.06 - lift;
    const p = () => { rrect(x, lx - lw, hipY - 10, lw * 2, ank - hipY + 14, lw * 0.6); };
    p(); x.fillStyle = S.trouser; x.fill(); cel(x, p, S.trouser, lx + lw * 0.3, 0.82); p(); ink(x);
    // puttees + boot
    x.beginPath(); rrect(x, lx - lw * 0.95, ank - lw * 0.9, lw * 1.9, lw * 0.9, 10); fillInk(x, S.web, 8);
    x.beginPath(); x.ellipse(lx + s * 10, ank + 16, lw * 1.25, lw * 0.6, 0, 0, TAU); fillInk(x, S.boot);
    x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(lx + s * 10 - lw * 0.4, ank + 8, lw * 0.35, lw * 0.15, 0, 0, TAU); x.fill();
  }
}

function body(x, S, H, sw, hipY, shY, st) {
  const p = () => { x.beginPath(); x.moveTo(-sw * 0.82, shY); x.quadraticCurveTo(-sw * 1.12, shY + 40, -sw * 1.1, (shY + hipY) / 2); x.quadraticCurveTo(-sw * 1.12, hipY + 20, -sw * 0.86, hipY + 26);
    x.lineTo(sw * 0.86, hipY + 26); x.quadraticCurveTo(sw * 1.12, hipY + 20, sw * 1.1, (shY + hipY) / 2); x.quadraticCurveTo(sw * 1.12, shY + 40, sw * 0.82, shY); x.quadraticCurveTo(0, shY - 34, -sw * 0.82, shY); x.closePath(); };
  p(); x.fillStyle = S.shirt; x.fill(); cel(x, p, S.shirt, sw * 0.45, 0.82); p(); ink(x);
  // pockets
  for (const s of [-1, 1]) { const px = s * sw * 0.48, py = shY + 70; x.beginPath(); rrect(x, px - 40, py, 80, 70, 12); fillInk(x, shade(S.shirt, 0.92), 6); x.beginPath(); rrect(x, px - 44, py - 6, 88, 26, 10); fillInk(x, shade(S.shirt, 0.86), 6); x.beginPath(); x.arc(px, py + 10, 6, 0, TAU); fillInk(x, '#d9b25a', 3); }
  // placket buttons
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(0, shY + 50 + i * 55, 7, 0, TAU); fillInk(x, '#d9b25a', 3); }
  // web belt + brass buckle + ammo pouches
  x.beginPath(); rrect(x, -sw * 1.08, hipY - 18, sw * 2.16, 38, 10); fillInk(x, S.web, 7);
  for (const s of [-1, 1]) { x.beginPath(); rrect(x, s * sw * 0.62 - 34, hipY - 34, 68, 56, 10); fillInk(x, shade(S.web, 1.08), 6); }
  x.beginPath(); rrect(x, -26, hipY - 22, 52, 46, 8); fillInk(x, '#e8c04a', 5);
  // epaulettes (+ rank pip for the major)
  for (const s of [-1, 1]) { x.beginPath(); rrect(x, s * sw * 0.6 - 34, shY - 14, 68, 24, 10); fillInk(x, shade(S.shirt, 0.88), 5); if (S.rank) { x.beginPath(); x.arc(s * sw * 0.6, shY - 2, 8, 0, TAU); fillInk(x, '#ffd23f', 3); } }
  // lanyard
  if (S.rank) { x.strokeStyle = '#2e5d3a'; x.lineWidth = 6; x.beginPath(); x.moveTo(-sw * 0.6, shY + 4); x.quadraticCurveTo(-sw * 0.3, shY + 110, -sw * 0.1, shY + 60); x.stroke(); }
}

function head(x, S, st, H, cy, t) {
  const R = H * 0.165, yaw = clamp(st.yaw, -1, 1), fx = yaw * R * 0.22;
  LW = 11;
  x.save(); x.translate(0, cy);
  // ears
  for (const s of [-1, 1]) { const v = 1 - Math.max(0, yaw * s) * 0.6; x.beginPath(); x.ellipse(s * R * 0.98 + fx * 0.3, R * 0.08, R * 0.17 * v, R * 0.22, 0, 0, TAU); fillInk(x, S.skin); }
  const face = () => { x.beginPath(); x.ellipse(fx * 0.2, 0, R, R * 0.97, 0, 0, TAU); };
  face(); x.fillStyle = S.skin; x.fill(); cel(x, face, S.skin, R * (0.55 - yaw * 0.3), 0.86);
  face(); ink(x);
  if (S.helmet) { x.strokeStyle = '#5a4a2a'; x.lineWidth = 7; x.beginPath(); x.moveTo(-R * 0.9, -R * 0.5); x.quadraticCurveTo(-R * 0.85, R * 0.8, 0, R * 0.93); x.quadraticCurveTo(R * 0.85, R * 0.8, R * 0.9, -R * 0.5); x.stroke(); }
  x.fillStyle = 'rgba(255,100,110,.3)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * R * 0.55 + fx, R * 0.32, R * 0.16, R * 0.1, 0, 0, TAU); x.fill(); }
  // eyes: big round googly eyes, touching
  const ey = -R * 0.02, er = R * 0.27, open = clamp(st.open, 0, 1);
  for (const s of [-1, 1]) {
    const cx = s * er * 1.0 + fx * 1.4;
    x.beginPath(); x.arc(cx, ey, er, 0, TAU); fillInk(x, '#ffffff', 8);
    if (open > 0.15) { const px = cx + (st.lookX * 0.45 + yaw * 0.3) * er, py = ey + st.lookY * 0.3 * er + er * 0.04;
      x.save(); x.beginPath(); x.arc(cx, ey, er - 4, 0, TAU); x.clip();
      x.beginPath(); x.arc(px, py, er * 0.42, 0, TAU); x.fillStyle = INK; x.fill(); x.beginPath(); x.arc(px - er * 0.14, py - er * 0.16, er * 0.13, 0, TAU); x.fillStyle = '#fff'; x.fill();
      const lid = 1 - open; if (lid > 0.01) { x.fillStyle = S.skin; x.fillRect(cx - er, ey - er, er * 2, er * 2 * lid); }
      x.restore(); }
    else { x.beginPath(); x.arc(cx, ey, er, 0, TAU); x.fillStyle = S.skin; x.fill(); ink(x, 8); x.beginPath(); x.moveTo(cx - er * 0.7, ey + 4); x.quadraticCurveTo(cx, ey + er * 0.45, cx + er * 0.7, ey + 4); ink(x, 7); }
    const b = st.brow, by = ey - er * 1.3 - b * er * 0.22, inner = -s;
    x.beginPath(); x.moveTo(cx + inner * er * 0.85, by + (b < 0 ? b * er * 0.5 : er * 0.06)); x.quadraticCurveTo(cx, by - er * 0.3, cx - inner * er * 0.9, by + er * 0.12 - (b < 0 ? b * er * 0.15 : 0)); ink(x, 14);
  }
  // nose
  const nx = fx * 1.6; x.beginPath(); x.ellipse(nx + R * 0.04, R * 0.3, R * 0.11, R * 0.085, 0, 0, TAU); fillInk(x, shade(S.skin, 0.95), 7);
  // moustache
  const my = R * 0.5, mx = fx * 1.4;
  if (S.moustache) { x.beginPath(); x.moveTo(mx, my - R * 0.06); x.bezierCurveTo(mx + R * 0.3, my - R * 0.14, mx + R * 0.48, my - R * 0.02, mx + R * 0.5, my + R * 0.08); x.bezierCurveTo(mx + R * 0.3, my + R * 0.02, mx + R * 0.1, my, mx, my + R * 0.02);
    x.bezierCurveTo(mx - R * 0.1, my, mx - R * 0.3, my + R * 0.02, mx - R * 0.5, my + R * 0.08); x.bezierCurveTo(mx - R * 0.48, my - R * 0.02, mx - R * 0.3, my - R * 0.14, mx, my - R * 0.06); x.fillStyle = S.hair; x.fill(); }
  if (S.thinMoustache) { x.beginPath(); x.moveTo(mx - R * 0.34, my + R * 0.04); x.quadraticCurveTo(mx, my - R * 0.1, mx + R * 0.34, my + R * 0.04); x.quadraticCurveTo(mx, my - R * 0.02, mx - R * 0.34, my + R * 0.04); x.closePath(); x.fillStyle = S.hair; x.fill(); }
  // mouth
  const mo = clamp(st.mouth, 0, 1.1), sm = st.smile, mw = R * (0.3 + sm * 0.05), mY = my + R * 0.13, cor = -sm * R * 0.08;
  if (mo > 0.08) { const h = R * (0.08 + mo * 0.26);
    const mp = () => { x.beginPath(); x.moveTo(mx - mw, mY + cor); x.quadraticCurveTo(mx, mY - R * 0.04, mx + mw, mY + cor); x.quadraticCurveTo(mx + mw * 0.6, mY + h * 1.3, mx, mY + h * 1.3); x.quadraticCurveTo(mx - mw * 0.6, mY + h * 1.3, mx - mw, mY + cor); x.closePath(); };
    mp(); x.fillStyle = '#7a1424'; x.fill(); x.save(); mp(); x.clip(); x.fillStyle = '#fff'; x.fillRect(mx - mw, mY - R * 0.05, mw * 2, R * 0.07); x.fillStyle = '#ff6b81'; x.beginPath(); x.ellipse(mx, mY + h * 1.25, mw * 0.55, h * 0.45, 0, 0, TAU); x.fill(); x.restore(); mp(); ink(x, 8);
  } else { x.beginPath(); x.moveTo(mx - mw, mY + cor); x.quadraticCurveTo(mx, mY + R * 0.02 + sm * R * 0.1, mx + mw, mY + cor); ink(x, 8); }
  // headgear
  if (S.helmet) {   // Brodie steel helmet
    x.beginPath(); x.ellipse(fx * 0.3, -R * 0.62, R * 1.42, R * 0.2, 0, 0, TAU); fillInk(x, shade(S.helmet, 0.9));
    const dome = () => { x.beginPath(); x.ellipse(fx * 0.3, -R * 0.66, R * 0.95, R * 0.62, 0, Math.PI, TAU); x.closePath(); };
    dome(); x.fillStyle = S.helmet; x.fill(); cel(x, dome, S.helmet, R * 0.4, 0.8); dome(); ink(x);
    x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 8; x.beginPath(); x.arc(fx * 0.3 - R * 0.2, -R * 0.82, R * 0.42, Math.PI * 1.15, Math.PI * 1.5); x.stroke();
  } else if (S.peaked) {   // officer's peaked service cap with a brass badge
    const crown = () => { x.beginPath(); x.moveTo(-R * 0.98 + fx * 0.3, -R * 0.5); x.bezierCurveTo(-R * 1.3, -R * 1.22, R * 1.3, -R * 1.22, R * 0.98 + fx * 0.3, -R * 0.5); x.closePath(); };
    crown(); x.fillStyle = S.peaked; x.fill(); cel(x, crown, S.peaked, R * 0.4, 0.82); crown(); ink(x);
    x.beginPath(); rrect(x, -R * 0.98 + fx * 0.3, -R * 0.66, R * 1.96, R * 0.24, 10); fillInk(x, '#5a4630', 7);
    x.beginPath(); x.moveTo(-R * 0.9 + fx * 0.6, -R * 0.44); x.quadraticCurveTo(fx * 0.6, -R * 0.12, R * 0.9 + fx * 0.6, -R * 0.44); x.lineTo(R * 0.84 + fx * 0.6, -R * 0.52); x.quadraticCurveTo(fx * 0.6, -R * 0.36, -R * 0.84 + fx * 0.6, -R * 0.52); x.closePath(); fillInk(x, '#2a1e18', 7);
    x.beginPath(); x.moveTo(fx * 0.4, -R * 0.98); x.lineTo(fx * 0.4 - R * 0.12, -R * 0.72); x.lineTo(fx * 0.4 + R * 0.12, -R * 0.72); x.closePath(); fillInk(x, S.badge, 5);
    x.beginPath(); x.arc(fx * 0.4, -R * 0.68, R * 0.06, 0, TAU); fillInk(x, S.badge, 4);
  } else if (S.beret) {
    x.beginPath(); x.moveTo(-R * 1.0 + fx * 0.3, -R * 0.42); x.bezierCurveTo(-R * 1.25, -R * 1.25, R * 0.4, -R * 1.45, R * 1.12 + fx * 0.3, -R * 0.75); x.quadraticCurveTo(R * 0.9, -R * 0.42, R * 0.6, -R * 0.5); x.quadraticCurveTo(0, -R * 0.6, -R * 1.0 + fx * 0.3, -R * 0.42); x.closePath(); fillInk(x, S.beret);
    x.beginPath(); rrect(x, -R * 1.0 + fx * 0.3, -R * 0.56, R * 1.85, R * 0.16, 8); fillInk(x, '#3a2a1a', 6);
    x.beginPath(); x.ellipse(-R * 0.45 + fx * 0.3, -R * 0.78, R * 0.14, R * 0.17, 0, 0, TAU); fillInk(x, S.badge, 5);
    // hair peeking at the sides
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * R * 0.95, -R * 0.4); x.quadraticCurveTo(s * R * 1.0, -R * 0.1, s * R * 0.9, R * 0.05); x.lineTo(s * R * 0.82, -R * 0.35); x.closePath(); fillInk(x, S.hair, 5); }
  }
  x.restore(); LW = 10;
}

function arm(x, S, H, sw, shY, side, armA, st) {
  const [a1, a2, hand] = armA, sx = side * sw * 0.92, sy = shY + 30;
  const uL = H * 0.13, fL = H * 0.12, r1 = H * 0.05, r2 = r1 * 0.92, r3 = r1 * 0.86;
  const d1 = Math.PI / 2 - a1 * side, ex = sx + Math.cos(d1) * uL, ey = sy + Math.sin(d1) * uL, d2 = d1 + a2 * side, hx = ex + Math.cos(d2) * fL, hy = ey + Math.sin(d2) * fL;
  capsule(x, sx, sy, ex, ey, r1, r2); x.fillStyle = S.shirt; x.fill(); ink(x);
  const isCast = S.cast && side > 0;
  capsule(x, ex, ey, hx, hy, isCast ? r2 * 1.18 : r2, isCast ? r3 * 1.15 : r3); x.fillStyle = isCast ? '#fbfbf7' : S.shirt; x.fill(); ink(x);
  if (isCast) { x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 4; for (let i = 1; i < 4; i++) { const k = i / 4, bx = ex + (hx - ex) * k, by = ey + (hy - ey) * k; x.beginPath(); x.moveTo(bx - Math.cos(d2 + Math.PI / 2) * r2, by - Math.sin(d2 + Math.PI / 2) * r2); x.lineTo(bx + Math.cos(d2 + Math.PI / 2) * r2, by + Math.sin(d2 + Math.PI / 2) * r2); x.stroke(); } }
  else { const cx = hx - Math.cos(d2) * r3 * 0.4, cy = hy - Math.sin(d2) * r3 * 0.4; capsule(x, cx - Math.cos(d2) * 14, cy - Math.sin(d2) * 14, cx, cy, r3 * 1.08, r3 * 1.08); x.fillStyle = shade(S.shirt, 0.88); x.fill(); ink(x, 7); }
  // round mitten hand
  x.save(); x.translate(hx, hy); x.rotate(d2 - Math.PI / 2);
  const W = r3 * 1.0;
  if (hand === 'point') { capsule(x, side * W * 0.15, W * 0.6, side * W * 0.2, W * 2.2, W * 0.32, W * 0.28); x.fillStyle = S.skin; x.fill(); ink(x, 7); }
  if (hand === 'thumb') { capsule(x, -side * W * 0.6, W * 0.5, -side * W * 0.9, -W * 0.5, W * 0.32, W * 0.28); x.fillStyle = S.skin; x.fill(); ink(x, 7); }
  x.beginPath(); x.ellipse(0, W * 0.75, W * (hand === 'open' ? 1.05 : 0.95), W * (hand === 'open' ? 1.15 : 0.92), 0, 0, TAU); x.fillStyle = isCast ? '#fbfbf7' : S.skin; x.fill(); ink(x, 8);
  if (hand === 'open') { x.beginPath(); for (let i = 0; i < 3; i++) { x.moveTo(-W * 0.45 + i * W * 0.45, W * 1.6); x.lineTo(-W * 0.42 + i * W * 0.44, W * 1.1); } ink(x, 5); }
  x.restore();
  armA.hand = [hx, hy];
}

function sling(x, st, H) {
  const sw = H * 0.19, shY = -H * 0.6;
  x.beginPath(); x.moveTo(-sw * 0.5, shY - 6); x.quadraticCurveTo(sw * 0.4, shY + 80, sw * 0.95, shY + 210); x.lineTo(sw * 0.7, shY + 240); x.quadraticCurveTo(sw * 0.1, shY + 120, -sw * 0.65, shY + 14); x.closePath(); x.fillStyle = '#ffffff'; x.fill(); ink(x, 7);
}

function rifle(x, px, py, ang, s, slung) {
  x.save(); x.translate(px, py); x.rotate(ang); x.scale(s, s);
  x.beginPath(); rrect(x, -14, -300, 28, 300, 10); x.fillStyle = '#8a4a1e'; x.fill(); ink(x, 8);         // wooden stock + fore-end
  x.beginPath(); rrect(x, -6, -380, 12, 120, 5); x.fillStyle = '#3a3a3a'; x.fill(); ink(x, 6);          // barrel
  x.beginPath(); rrect(x, -22, -10, 44, 80, 14); x.fillStyle = '#7a3e18'; x.fill(); ink(x, 8);          // butt
  x.beginPath(); x.arc(14, -150, 10, 0, TAU); x.fillStyle = '#3a3a3a'; x.fill(); ink(x, 5);              // bolt
  x.restore();
}
