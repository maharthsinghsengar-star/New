// ARE GHOSTS REAL? — minimalist 2D stickman story on a soft, muted palette (16:9, canvas 2D).
// Fully deterministic: window.renderFrame(t) draws the frame for time t (seconds).
const W = 1920, H = 1080;
const X = document.getElementById('c').getContext('2d');
const TL = await (await fetch('build/timeline.json')).json();
await Promise.all([document.fonts.load('500 40px Poppins'), document.fonts.load('600 40px Poppins')]);
let NOW = 0;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   // overshoot pop
const popIn = (t, t0, len = 0.35) => back(seg(t, t0, t0 + len));
const TAU = Math.PI * 2;
function RNG(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixC = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(',')})`; };

// soft, slightly muted palette: neither neon nor grey
const C = {
  paper: '#ede6d8', paper2: '#e1d8c6', ink: '#2c2b31', head: '#f8f4ec', line: '#cfc4ae',
  teal: '#6c9fa2', coral: '#d4876f', mustard: '#d8b15c', sage: '#9db38c', lav: '#9b94c2', rose: '#c98b97', brown: '#9a7458', grey: '#9c9ca6',
  night: '#5d6886', night2: '#4c5675', nightFloor: '#414a66', sky: '#2f3852', moon: '#efe6c8', lamp: '#f2d49b',
  warmWall: '#e8d6b8', warmFloor: '#c9ab86', ghost: '#f7f4ee',
};

// ---------- drawing primitives (world space) ----------
function cam(cx, cy, z = 1, sway = 1) {
  const s = 4 * sway; X.setTransform(z, 0, 0, z, W / 2 - (cx + Math.sin(NOW * 0.6) * s) * z, H / 2 - (cy + Math.sin(NOW * 0.8 + 1) * s) * z);
}
const camL = (a, b, u, f = smooth) => { const k = f(u); cam(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), a[3] ?? 1); };
function fillAll(col) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = col; X.fillRect(0, 0, W, H); X.restore(); }
function path(pts, close = false) { X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]); if (close) X.closePath(); }
function stroke(col = C.ink, w = 8) { X.lineWidth = w; X.strokeStyle = col; X.lineCap = 'round'; X.lineJoin = 'round'; X.stroke(); }
function fill(col) { X.fillStyle = col; X.fill(); }
function line(pts, col = C.ink, w = 8) { path(pts); stroke(col, w); }
function poly(pts, f, s = C.ink, w = 7) { path(pts, true); if (f) fill(f); if (s) stroke(s, w); }
function circ(x, y, r, f, s = C.ink, w = 7) { X.beginPath(); X.arc(x, y, Math.max(0.1, r), 0, TAU); if (f) fill(f); if (s) stroke(s, w); }
function ell(x, y, rx, ry, f, s = C.ink, w = 7, rot = 0) { X.beginPath(); X.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); if (f) fill(f); if (s) stroke(s, w); }
function rect(x, y, w, h, f, s = C.ink, lw = 7, r = 0) { X.beginPath(); X.roundRect(x, y, w, h, r); if (f) fill(f); if (s) stroke(s, lw); }
function text(str, x, y, size = 48, col = C.ink, weight = 600, align = 'center', alpha = 1) {
  X.save(); X.globalAlpha *= alpha; X.font = `${weight} ${size}px Poppins`; X.textAlign = align; X.textBaseline = 'middle'; X.fillStyle = col; X.fillText(str, x, y); X.restore();
}
function at(x, y, s, rot, fn, alpha = 1) { if (s <= 0.001 || alpha <= 0.001) return; X.save(); X.translate(x, y); X.rotate(rot); X.scale(s, s); X.globalAlpha *= alpha; fn(); X.restore(); }
function glow(x, y, r, col, a = 0.5) { const g = X.createRadialGradient(x, y, 0, x, y, r); const [R, G_, B_] = hex(col); g.addColorStop(0, `rgba(${R},${G_},${B_},${a})`); g.addColorStop(1, `rgba(${R},${G_},${B_},0)`); X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); }
const shadow = (x, y, w = 70, a = 0.14) => { X.save(); X.globalAlpha = a; ell(x, y + 2, w, w * 0.16, '#000', null); X.restore(); };
function label(str, x, y, t, t0, size = 44, col = C.ink, w = 600) { const k = popIn(t, t0); at(x, y, k, 0, () => text(str, 0, 0, size, col, w)); }
function tag(str, x, y, t, t0, bg = C.mustard, size = 40, col = C.ink) {   // rounded pill with text
  const k = popIn(t, t0); if (k <= 0) return; at(x, y, k, 0, () => { X.font = `600 ${size}px Poppins`; const w = X.measureText(str).width + size * 1.1; rect(-w / 2, -size * 0.85, w, size * 1.7, bg, C.ink, 5, size * 0.85); text(str, 0, 2, size, col); });
}
function bubble(x, y, w, h, t, t0, fn, tailX = -40, tailY = 90) {   // thought bubble
  const k = popIn(t, t0, 0.4); if (k <= 0) return;
  at(x, y, k, 0, () => { circ(tailX * 0.55, tailY * 0.55, 12, '#fbf8f1', C.ink, 5); circ(tailX, tailY, 7, '#fbf8f1', C.ink, 4); ell(0, 0, w / 2, h / 2, '#fbf8f1', C.ink, 6); fn(); });
}

// ---------- the stickman ----------
// angles: 0 = straight down, positive = towards where he faces. arms are relative to the torso, legs to the world.
function stick(o) {
  const s = o.s ?? 1, d = o.dir ?? 1, dd = d === 0 ? 1 : d, col = o.col ?? C.ink, lw = (o.lw ?? 9) * s, lean = o.lean ?? 0;
  const Lt = 72 * s, Ls = 68 * s, To = 106 * s, Ua = 54 * s, Fa = 52 * s, R = 31 * s;
  const v = (th, len) => [Math.sin(th) * dd * len, Math.cos(th) * len], up = (th, len) => [Math.sin(th) * dd * len, -Math.cos(th) * len], add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const hip = o.hipAt ? [o.hipAt[0], o.hipAt[1]] : [o.x, o.y - (Lt + Ls) + (o.drop ?? 0) * s + (o.bob ?? 0)];
  const neck = add(hip, up(lean, To)), sh = add(hip, up(lean, To * 0.9)), hc = add(neck, up(lean + (o.tilt ?? 0), R + 6 * s));
  const leg = (l) => { const k = add(hip, v(l[0], Lt)); return [hip, k, add(k, v(l[0] - (l[1] ?? 0), Ls))]; };
  const arm = (a) => { const e = add(sh, v(a[0] - lean, Ua)); return [sh, e, add(e, v(a[0] + (a[1] ?? 0) - lean, Fa))]; };
  const st = (pts, c = col) => { path(pts); stroke(c, lw); };
  const lL = o.lL ?? [0.1, 0], lR = o.lR ?? [-0.1, 0], aL = o.aL ?? [0.22, 0.12], aR = o.aR ?? [-0.18, 0.12];
  X.save(); X.globalAlpha *= o.alpha ?? 1;
  if (!o.noLegs) { st(leg(lL)); st(leg(lR)); }
  st([hip, neck]);
  if (o.coat) { const a = add(sh, v(-lean + 0.5, 0)), w = 34 * s; poly([add(sh, [-w * 0.55, -4 * s]), add(sh, [w * 0.55, -4 * s]), add(hip, [w, 34 * s]), add(hip, [-w, 34 * s])], o.coat, col, lw * 0.6); st([hip, neck]); }
  if (o.toga) { poly([add(sh, [-20 * s, 0]), add(sh, [22 * s, 4 * s]), add(hip, [30 * s, 46 * s]), add(hip, [-30 * s, 46 * s])], o.toga, col, lw * 0.6); line([add(sh, [-18 * s, 2 * s]), add(hip, [26 * s, 20 * s])], C.coral, 7 * s); }
  const A = arm(aL), B = arm(aR); st(A); st(B);
  head(hc, R, o, d, col, lw * 0.8);
  if (o.propR) { const a = Math.atan2(B[2][1] - B[1][1], B[2][0] - B[1][0]); o.propR(B[2], a); }
  if (o.propL) { const a = Math.atan2(A[2][1] - A[1][1], A[2][0] - A[1][0]); o.propL(A[2], a); }
  X.restore();
  return { hip, neck, hc, hR: B[2], hL: A[2] };
}
function head(hc, R, o, d, col, lw) {
  const [x, y] = hc, s = R / 31, fx = d * 7 * s;
  if (o.hair === 'messy') for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 6); line([[x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7], [x + Math.cos(a) * R * 1.45, y + Math.sin(a) * R * 1.45]], col, lw * 0.9); }
  if (o.hair === 'bun') circ(x - d * 22 * s, y - 24 * s, 13 * s, col, null);
  circ(x, y, R, o.headFill ?? C.head, col, lw);
  if (o.hair === 'bun' || o.hair === 'cap') { X.save(); X.beginPath(); X.arc(x, y, R, 0, TAU); X.clip(); ell(x - d * 6 * s, y - R * 0.85, R * 1.15, R * 0.55, o.hair === 'cap' ? (o.capCol ?? C.teal) : col, null); X.restore(); circ(x, y, R, null, col, lw); }
  if (o.beard) { X.save(); X.beginPath(); X.arc(x, y, R, 0, TAU); X.clip(); ell(x + fx * 0.5, y + R * 0.8, R * 0.95, R * 0.6, col, null); X.restore(); circ(x, y, R, null, col, lw); }
  if (o.laurel) for (let i = -3; i <= 3; i++) ell(x + i * 9 * s, y - R * 0.95 + Math.abs(i) * 2.5 * s, 7 * s, 4 * s, C.sage, C.ink, 2.5 * s, i * 0.4);
  if (o.noFace) return;
  const face = o.face ?? 'neutral', ex = [x + fx - 10 * s, x + fx + 10 * s], ey = y - 4 * s, lk = o.look ?? [0, 0];
  const blink = face !== 'sleep' && ((NOW * 1.0 + (o.seed ?? 0) * 1.37) % 3.9) < 0.11;
  X.fillStyle = col;
  if (face === 'sleep' || face === 'happy' || blink) ex.forEach((e, i) => { if (o.wink && i === 1 && face === 'sleep') { circ(e, ey, 3.8 * s, col, null); return; } X.beginPath(); if (face === 'happy') X.arc(e, ey + 3 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9); else { X.moveTo(e - 6 * s, ey); X.lineTo(e + 6 * s, ey); } stroke(col, 3.6 * s); });
  else if (face === 'scared' || face === 'shock') ex.forEach(e => { circ(e, ey, 8 * s, '#fff', col, 2.6 * s); circ(e + lk[0] * s, ey + lk[1] * s, 3.4 * s, col, null); });
  else ex.forEach(e => circ(e + lk[0] * s, ey + lk[1] * s, 3.8 * s, col, null));
  if (face === 'worried' || face === 'scared') ex.forEach((e, i) => line([[e - 6 * s, ey - 13 * s + (i ? -3 : 3) * s * (face === 'worried' ? -1 : 1)], [e + 6 * s, ey - 13 * s + (i ? 3 : -3) * s * (face === 'worried' ? -1 : 1)]], col, 3 * s));
  if (face === 'think') line([[ex[1] - 6 * s, ey - 14 * s], [ex[1] + 7 * s, ey - 17 * s]], col, 3 * s);
  const mx = x + fx, my = y + 12 * s;
  if (face === 'smile' || face === 'happy') { X.beginPath(); X.arc(mx, my - 4 * s, 8 * s, Math.PI * 0.15, Math.PI * 0.85); stroke(col, 3.4 * s); }
  else if (face === 'scared' || face === 'shock' || face === 'oh') ell(mx, my + 1 * s, 4.6 * s, 6 * s, col, null);
  else if (face === 'worried') { X.beginPath(); X.arc(mx, my + 6 * s, 7 * s, Math.PI * 1.2, Math.PI * 1.8); stroke(col, 3.2 * s); }
  else if (face === 'think') line([[mx - 6 * s, my + 1 * s], [mx + 5 * s, my - 2 * s]], col, 3.2 * s);
  else if (face === 'sleep') line([[mx - 3 * s, my], [mx + 3 * s, my]], col, 3 * s);
  else line([[mx - 5 * s, my], [mx + 5 * s, my]], col, 3.2 * s);
  if (o.talk) { const k = 0.5 + 0.5 * Math.sin(NOW * 22); ell(mx, my + 1 * s, 5 * s, (2 + 4 * k) * s, col, null); }
  if (o.glasses) { ex.forEach(e => circ(e, ey, 10 * s, null, col, 2.8 * s)); line([[ex[0] + 10 * s, ey], [ex[1] - 10 * s, ey]], col, 2.8 * s); }
}
const walkP = (ph, amp = 1) => ({ lL: [0.42 * Math.sin(ph) * amp, Math.max(0, -Math.cos(ph)) * 0.75 * amp], lR: [-0.42 * Math.sin(ph) * amp, Math.max(0, Math.cos(ph)) * 0.75 * amp], aL: [-0.38 * Math.sin(ph) * amp, 0.35], aR: [0.38 * Math.sin(ph) * amp, 0.35], bob: -Math.abs(Math.cos(ph)) * 5 * amp });
const sitP = { lL: [1.45, 1.45], lR: [1.55, 1.55], drop: 62 };
const SCRATCH = [2.55, 1.55];
function mark(str, x, y, t, t0, size = 64, col = C.ink) { label(str, x, y, t, t0, size, col); }
function sweat(x, y, s = 1, ph = 0) { const k = (NOW * 0.9 + ph) % 1; at(x, y + k * 24, s, 0, () => poly([[0, -16], [8, 0], [0, 7], [-8, 0]], '#9fc6d8', C.ink, 3), 1 - k * 0.6); }
function shiver(x, y, s = 1) { for (let i = -1; i <= 1; i += 2) { const o = Math.sin(NOW * 30) * 2; line([[x + i * 50 * s + o, y - 20 * s], [x + i * 58 * s + o, y - 8 * s], [x + i * 50 * s + o, y + 4 * s]], C.ink, 3.5 * s); } }

// ---------- other characters & props ----------
function ghost(x, y, s = 1, o = {}) {
  const t = NOW + (o.ph ?? 0);
  at(x, y + Math.sin(t * 2.2) * 8 * s, s, o.rot ?? 0, () => {
    X.beginPath(); X.moveTo(-70, 0); X.lineTo(-70, -110); X.arc(0, -110, 70, Math.PI, 0); X.lineTo(70, 0);
    for (let i = 0; i < 4; i++) { const x0 = 70 - i * 35; X.quadraticCurveTo(x0 - 17.5, 20 + 7 * Math.sin(t * 5 + i), x0 - 35, 0); }
    X.closePath(); fill(o.fill ?? C.ghost); stroke(C.ink, 7);
    ell(-24, -116, 10, 15, C.ink, null); ell(24, -116, 10, 15, C.ink, null);
    if (o.mouth !== false) ell(0, -80, 8, 11, C.ink, null);
    if (o.arms) { line([[-68, -60], [-96, -84 + 8 * Math.sin(t * 4)]], C.ink, 7); line([[68, -60], [96, -84 - 8 * Math.sin(t * 4)]], C.ink, 7); }
  }, o.alpha ?? 1);
}
function cat(x, y, s = 1, dir = -1, o = {}) {
  at(x, y, s, 0, () => {
    X.scale(dir, 1);
    line([[-50, -30], [-82, -60], [-78, -100 + 6 * Math.sin(NOW * 3)]], C.ink, 8);
    ell(0, -32, 55, 30, '#7b7f90', C.ink, 6);
    line([[-34, -6], [-34, 0]], C.ink, 8); line([[30, -6], [30, 0]], C.ink, 8);
    const pw = o.paw ?? 0; line([[44, -18], [44 + 30 * pw, -8 - 16 * pw]], C.ink, 8);
    poly([[30, -78], [36, -110], [52, -84]], '#7b7f90', C.ink, 5); poly([[60, -84], [76, -108], [78, -76]], '#7b7f90', C.ink, 5);
    circ(56, -66, 30, '#7b7f90', C.ink, 6);
    if (o.happy) { X.beginPath(); X.arc(48, -66, 5, Math.PI * 1.1, Math.PI * 1.9); stroke(C.ink, 3); X.beginPath(); X.arc(68, -66, 5, Math.PI * 1.1, Math.PI * 1.9); stroke(C.ink, 3); }
    else { ell(48, -68, 4, 6, '#e8d36a', C.ink, 2); ell(68, -68, 4, 6, '#e8d36a', C.ink, 2); }
    line([[56, -56], [52, -52]], C.ink, 3); line([[56, -56], [60, -52]], C.ink, 3);
  });
}
function coatShape(x, y, dark, s = 1) {   // coat + hat on a hook: reads like a tall person in the dark
  at(x, y, s, 0, () => {
    const c = dark > 0.5 ? '#262a3b' : '#8f735c', hc = dark > 0.5 ? '#20232f' : '#4d4a55', st = dark > 0.5 ? '#1c1e28' : C.ink;
    line([[0, -660], [0, -630]], st, 8); circ(0, -664, 8, null, st, 6);
    poly([[-58, -560], [58, -560], [88, -470], [96, -140], [-96, -140], [-88, -470]], c, st, 6);
    poly([[-88, -470], [-122, -440], [-126, -240], [-100, -240], [-96, -420]], c, st, 6); poly([[88, -470], [122, -440], [126, -240], [100, -240], [96, -420]], c, st, 6);
    poly([[-58, -560], [0, -500], [58, -560], [36, -598], [-36, -598]], c, st, 6);
    if (dark <= 0.5) { line([[0, -500], [0, -150]], st, 4); [-420, -340, -260].forEach(yy => circ(14, yy, 6, '#d8b15c', st, 3)); }
    ell(0, -612, 92, 16, hc, st, 6); rect(-52, -700, 104, 90, hc, st, 6, 18);
  });
}
function bed(x, y, o = {}) {   // headboard on the left, mattress top at y - 140
  rect(x - 300, y - 330, 34, 330, C.brown, C.ink, 7, 8); rect(x + 300, y - 210, 30, 210, C.brown, C.ink, 7, 8);
  rect(x - 290, y - 150, 600, 70, o.sheet ?? '#e9e2d4', C.ink, 7, 10); rect(x - 290, y - 90, 600, 40, C.brown, C.ink, 7, 6);
  rect(x - 268, y - 196, 120, 48, '#f4efe4', C.ink, 6, 22);
}
function blanket(x, y, col = C.teal, lift = 0, bumpX = 120) {
  X.beginPath(); X.moveTo(x - 160, y - 150 - lift * 30); X.bezierCurveTo(x - 60, y - 200 - lift * 30, x + bumpX - 40, y - 190, x + bumpX, y - 176); X.bezierCurveTo(x + 220, y - 168, x + 300, y - 160, x + 316, y - 140); X.lineTo(x + 316, y - 70); X.lineTo(x - 160, y - 70); X.closePath(); fill(col); stroke(C.ink, 7);
  line([[x - 150, y - 150 - lift * 30 + 18], [x + 300, y - 132]], 'rgba(0,0,0,0.12)', 4);
}
function windowFrame(x, y, w, h, night = 1, open = 0, curtain = C.rose) {
  rect(x, y, w, h, night ? C.sky : '#b9d3dc', C.ink, 8, 6);
  if (night) { circ(x + w * 0.68, y + h * 0.3, 30, C.moon, null); glow(x + w * 0.68, y + h * 0.3, 90, C.moon, 0.35); const r = RNG(9); for (let i = 0; i < 9; i++) circ(x + 15 + r() * (w - 30), y + 15 + r() * (h * 0.6), 2.2, '#f2ecd8', null); }
  else { ell(x + w * 0.3, y + h * 0.35, 40, 16, '#f4f1ea', null); }
  if (open > 0) { poly([[x + w / 2, y], [x + w / 2 + open * 60, y + 18], [x + w / 2 + open * 60, y + h - 18], [x + w / 2, y + h]], night ? '#3a4562' : '#cfe1e6', C.ink, 6); }
  line([[x + w / 2, y], [x + w / 2, y + h]], C.ink, 7); line([[x, y + h / 2], [x + w, y + h / 2]], C.ink, 7);
  const fl = Math.sin(NOW * 3.1) * 14 * open;
  poly([[x - 36, y - 20], [x + 30 + fl, y - 20], [x + 14 + fl * 1.6, y + h + 30], [x - 36, y + h + 30]], curtain, C.ink, 6);
  poly([[x + w + 36, y - 20], [x + w - 30 + fl, y - 20], [x + w - 14 + fl * 1.6, y + h + 30], [x + w + 36, y + h + 30]], curtain, C.ink, 6);
  rect(x - 50, y - 34, w + 100, 16, C.brown, C.ink, 5, 8);
}
function clockDigital(x, y, str, lit = 1) { rect(x - 70, y - 44, 140, 72, '#3a3a44', C.ink, 6, 12); text(str, x, y - 6, 42, mixC('#7a6a4a', '#f0c46a', lit), 600); glow(x, y - 6, 90, '#f0c46a', 0.18 * lit); }
function lampSmall(x, y, on) { line([[x, y], [x, y - 70]], C.ink, 6); poly([[x - 40, y - 70], [x + 40, y - 70], [x + 24, y - 125], [x - 24, y - 125]], on ? '#f3dca8' : '#cbb994', C.ink, 6); if (on) glow(x, y - 90, 260, C.lamp, 0.4); }
function door(x, y, w, h, open = 0, dark = '#272c3e', col = C.brown) {
  rect(x, y - h, w, h, dark, C.ink, 8, 4);
  const ow = w * (1 - open * 0.8); poly([[x, y - h], [x + ow, y - h + open * 26], [x + ow, y - open * 26], [x, y]], col, C.ink, 7); circ(x + ow - 22, y - h / 2, 7, C.mustard, C.ink, 3);
}
function moonbeam(x0, y0, w0, x1, y1, w1, a = 0.12) { X.save(); X.globalAlpha = a; poly([[x0, y0], [x0 + w0, y0], [x1 + w1, y1], [x1, y1]], C.moon, null); X.restore(); }
function bedroom(lit = 0, o = {}) {   // shared bedroom: bed at x = 0, window left, door right
  const wall = o.warm ? mixC(C.night, '#b8a585', o.warm) : mixC(C.night, C.warmWall, lit), floor = o.warm ? mixC(C.nightFloor, '#8f7a62', o.warm) : mixC(C.nightFloor, C.warmFloor, lit);
  fillAll(wall); rect(-3000, 0, 6000, 900, floor, null); line([[-3000, 0], [3000, 0]], C.ink, 7);
  for (let i = -3; i < 6; i++) line([[i * 260 - 120, 0], [i * 260 - 300, 400]], 'rgba(0,0,0,0.08)', 4);
  windowFrame(-760, -640, 250, 290, 1, o.open ?? 0, mixC('#8a6a7c', C.rose, lit));
  if (!lit && !o.warm) moonbeam(-760, -350, 250, -500, 0, 400, 0.1);
  door(560, 0, 200, 500, o.door ?? 0);
  rect(-520, -170, 170, 170, C.brown, C.ink, 7, 6); line([[-520, -110], [-350, -110]], C.ink, 5); circ(-435, -140, 6, C.mustard, C.ink, 3);
  rect(-900, -820, 1800, 0, null, null);
  bed(0, 0);
}
function hallway(lit = 0, o = {}) {   // dark hallway: door frame on the left (Sam's room), coat at x = 250, window right
  const wall = mixC('#4a5470', C.warmWall, lit), floor = mixC('#363e57', C.warmFloor, lit);
  fillAll(wall); rect(-3000, 0, 6000, 900, floor, null); line([[-3000, 0], [3000, 0]], C.ink, 7);
  for (let i = -6; i < 10; i++) line([[i * 150, 0], [i * 150 - 60, 600]], 'rgba(0,0,0,0.07)', 4);
  rect(-3000, -60, 6000, 60, mixC('#3d4560', '#d9c6a4', lit), C.ink, 6);
  line([[-3000, -820], [3000, -820]], mixC('#2e3549', '#b4a07e', lit), 30);   // pipe along the ceiling
  for (let i = -5; i < 8; i++) rect(i * 380 - 12, -838, 24, 36, mixC('#2e3549', '#9c8a6a', lit), C.ink, 4, 4);
  windowFrame(720, -620, 220, 280, 1, o.open ?? 0, mixC('#7a6272', C.rose, lit));
  rect(-470, -440, 34, 56, '#efe8da', C.ink, 5, 6); line([[-453, -425], [-453, -410 + (lit > 0.5 ? 12 : 0)]], C.ink, 6);   // light switch
  coatShape(250, 0, lit > 0.5 ? 0 : 1);
  if (lit > 0) { X.save(); X.globalAlpha = lit * 0.5; glow(0, -840, 900, '#fff1cc', 0.6); X.restore(); circ(0, -790, 26, mixC('#888', '#fff3c8', lit), C.ink, 5); line([[0, -820], [0, -815]], C.ink, 6); }
}
function nightVignette(a = 0.35) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); const g = X.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(10,12,25,0)'); g.addColorStop(1, `rgba(10,12,25,${a})`); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore(); }
function paper(col = C.paper) { fillAll(col); }
function house(x, y, o = {}) {   // cut-away two-storey house with a basement; floors at y-380 (upstairs), y (ground), basement below
  const wall = o.wall ?? '#e4d7bf', room = o.room ?? '#efe5d1';
  poly([[x - 420, y - 760], [x, y - 1040], [x + 420, y - 760]], C.coral, C.ink, 8);
  rect(x - 380, y - 760, 760, 1030, wall, C.ink, 8);
  rect(x - 350, y - 730, 700, 330, room, C.ink, 6); rect(x - 350, y - 370, 700, 350, room, C.ink, 6); rect(x - 350, y + 20, 700, 230, o.base ?? '#cdbfa6', C.ink, 6);
  for (let i = 0; i < 6; i++) line([[x - 330 + i * 46, y - 20 - i * 58], [x - 284 + i * 46, y - 20 - i * 58]], C.ink, 6);   // stairs
  line([[x - 330, y - 20], [x - 46, y - 368]], C.ink, 5);
  rect(x + 170, y - 660, 120, 120, '#b9d3dc', C.ink, 6, 4); rect(x + 170, y - 300, 120, 120, '#b9d3dc', C.ink, 6, 4);
}
function thermo(x, y, k, label_) {
  rect(x - 22, y - 300, 44, 300, '#fbf8f1', C.ink, 6, 22); circ(x, y + 10, 36, C.coral, C.ink, 6); rect(x - 10, y - 280 * k, 20, 280 * k + 6, C.coral, null, 0, 10);
  for (let i = 1; i < 6; i++) line([[x + 22, y - i * 50], [x + 40, y - i * 50]], C.ink, 4); if (label_) text(label_, x + 90, y - 280 * k, 40, C.ink, 600, 'left');
}
function brainIcon(x, y, s = 1, col = C.rose) {
  at(x, y, s, 0, () => {
    X.beginPath(); X.moveTo(-90, 20); X.bezierCurveTo(-130, 10, -130, -60, -90, -70); X.bezierCurveTo(-90, -120, -20, -130, 0, -100); X.bezierCurveTo(20, -130, 90, -120, 90, -70); X.bezierCurveTo(130, -60, 130, 10, 90, 20); X.bezierCurveTo(70, 60, -70, 60, -90, 20); X.closePath(); fill(col); stroke(C.ink, 7);
    line([[0, -100], [0, 40]], C.ink, 5); X.beginPath(); X.arc(-50, -40, 26, 0.3, 2.6); stroke(C.ink, 5); X.beginPath(); X.arc(50, -40, 26, 0.6, 2.9); stroke(C.ink, 5); X.beginPath(); X.arc(-45, 10, 18, 3.5, 5.8); stroke(C.ink, 5); X.beginPath(); X.arc(48, 12, 18, 3.6, 6.0); stroke(C.ink, 5);
  });
}
function sparkle(x, y, s, ph = 0) { const k = 0.5 + 0.5 * Math.sin(NOW * 6 + ph); at(x, y, s * (0.5 + 0.5 * k), NOW + ph, () => poly([[0, -30], [7, -7], [30, 0], [7, 7], [0, 30], [-7, 7], [-30, 0], [-7, -7]], '#f4e3a6', C.ink, 3)); }
function fire(x, y, s = 1) { at(x, y, s, 0, () => { for (let i = 0; i < 3; i++) line([[-40 + i * 40, 10], [40 - i * 40, -6]], C.brown, 12); const f = (h, w, c) => { X.beginPath(); X.moveTo(-w, 0); X.quadraticCurveTo(-w * 1.1, -h * 0.6, 0, -h); X.quadraticCurveTo(w * 1.1, -h * 0.6, w, 0); X.closePath(); fill(c); stroke(C.ink, 5); }; f(110 + 10 * Math.sin(NOW * 9), 46, C.coral); f(70 + 8 * Math.sin(NOW * 11 + 1), 26, C.mustard); glow(0, -50, 240, '#f2b36a', 0.35); }); }
function tree(x, y, s = 1, c = C.sage) { at(x, y, s, 0, () => { rect(-14, -120, 28, 120, C.brown, C.ink, 6, 6); circ(0, -170, 80, c, C.ink, 7); circ(-55, -130, 50, c, C.ink, 7); circ(55, -130, 50, c, C.ink, 7); circ(0, -170, 78, c, null); }); }
function tiger(x, y, s = 1, dir = 1, o = {}) {
  at(x, y, s, 0, () => {
    X.scale(dir, 1); const b = '#d39a5e';
    line([[-90, -70], [-140, -110], [-150, -150 + 10 * Math.sin(NOW * 4)]], C.ink, 9);
    [-60, -20, 40, 80].forEach((lx, i) => { const w = o.run ? Math.sin(NOW * 16 + i * 1.6) * 0.5 : 0; line([[lx, -50], [lx + Math.sin(w) * 30, 0]], C.ink, 10); });
    ell(0, -70, 110, 48, b, C.ink, 7); for (let i = -2; i <= 2; i++) line([[i * 36, -116], [i * 36 + 8, -86]], C.ink, 7);
    poly([[92, -146], [100, -176], [120, -152]], b, C.ink, 5); poly([[140, -150], [158, -172], [160, -142]], b, C.ink, 5);
    circ(124, -116, 42, b, C.ink, 7); circ(116, -122, 5, C.ink, null); circ(140, -122, 5, C.ink, null); circ(150, -104, 6, C.ink, null);
    line([[108, -150], [112, -138]], C.ink, 5); line([[126, -156], [126, -144]], C.ink, 5);
  });
}
function bush(x, y, s = 1, shake = 0) { at(x, y, s, Math.sin(NOW * 30) * 0.02 * shake, () => { circ(-70, -60, 70, '#8aa77a', C.ink, 7); circ(70, -60, 70, '#8aa77a', C.ink, 7); circ(0, -100, 85, '#8aa77a', C.ink, 7); rect(-130, -60, 260, 60, '#8aa77a', null); line([[-140, 0], [140, 0]], C.ink, 7); circ(0, -100, 83, '#8aa77a', null); circ(-70, -60, 68, '#8aa77a', null); circ(70, -60, 68, '#8aa77a', null); }); }
function fan(x, y, s, a) { at(x, y, s, 0, () => { circ(0, 0, 110, '#d9d4c8', C.ink, 7); for (let i = 0; i < 4; i++) { const r = a + i * Math.PI / 2; ell(Math.cos(r) * 52, Math.sin(r) * 52, 46, 18, '#b8b2a4', C.ink, 4, r); } circ(0, 0, 16, C.ink, null); for (let i = 0; i < 8; i++) line([[0, 0], [Math.cos(i * Math.PI / 4) * 108, Math.sin(i * Math.PI / 4) * 108]], 'rgba(0,0,0,0.25)', 3); }); }
function waves(x, y, t, n = 4, col = C.teal, maxR = 420) { for (let i = 0; i < n; i++) { const k = ((t * 0.5 + i / n) % 1); X.save(); X.globalAlpha = (1 - k) * 0.8; X.beginPath(); X.arc(x, y, 40 + k * maxR, -0.7, 0.7); stroke(col, 7); X.restore(); } }
function furnace(x, y, broken = 0) { rect(x - 90, y - 260, 180, 260, '#9a9aa6', C.ink, 7, 10); rect(x - 50, y - 140, 100, 70, '#3a3a44', C.ink, 6, 6); glow(x, y - 105, 70 + 10 * Math.sin(NOW * 8), '#f08a4a', 0.6); rect(x - 30, y - 400, 60, 140, '#8a8a96', C.ink, 6); if (broken) { line([[x - 20, y - 330], [x, y - 310], [x - 16, y - 290]], C.ink, 4); } }
function smoke(x, y, t, a = 1, n = 9) { for (let i = 0; i < n; i++) { const k = (t * 0.25 + i / n) % 1; X.save(); X.globalAlpha = a * (1 - k) * 0.55; circ(x + Math.sin(i * 2.3 + t) * 60 * k, y - k * 520, 34 + k * 60, '#8c8c96', null); X.restore(); } }
function socket(x, y, s) { at(x, y, s, 0, () => { rect(-90, -110, 180, 220, '#f4efe4', C.ink, 7, 22); rect(-34, -50, 14, 46, C.ink, null, 0, 4); rect(20, -50, 14, 46, C.ink, null, 0, 4); X.beginPath(); X.arc(0, 44, 16, Math.PI, 0); X.closePath(); fill(C.ink); }); }
function cloudFace(x, y, s) { at(x, y, s, 0, () => { const c = '#f6f3ee'; circ(-70, 10, 60, c, C.ink, 7); circ(70, 10, 60, c, C.ink, 7); circ(0, -30, 80, c, C.ink, 7); rect(-120, 0, 240, 70, c, null); line([[-130, 70], [130, 70]], C.ink, 7); circ(-70, 10, 58, c, null); circ(70, 10, 58, c, null); circ(0, -30, 78, c, null); X.save(); X.globalAlpha = 0.45; ell(-30, -10, 12, 16, C.ink, null); ell(30, -10, 12, 16, C.ink, null); X.beginPath(); X.arc(0, 18, 26, 0.2, Math.PI - 0.2); stroke(C.ink, 7); X.restore(); }); }
function padlock(x, y, s) { at(x, y, s, 0, () => { X.beginPath(); X.arc(0, -40, 34, Math.PI, 0); stroke(C.ink, 10); rect(-50, -40, 100, 80, C.mustard, C.ink, 7, 10); circ(0, -6, 9, C.ink, null); rect(-4, -4, 8, 22, C.ink, null); }); }
function flashBeam(x, y, ang, len = 700, a = 0.25) { X.save(); X.globalAlpha = a; X.translate(x, y); X.rotate(ang); const g = X.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)'); X.fillStyle = g; X.beginPath(); X.moveTo(0, -10); X.lineTo(len, -160); X.lineTo(len, 160); X.lineTo(0, 10); X.closePath(); X.fill(); X.restore(); }
const torch = ([x, y], a) => at(x, y, 1, a, () => rect(-6, -10, 46, 20, '#5a5a66', C.ink, 4, 5));

// ---------- grain + vignette overlay (soft printed-paper feel) ----------
const grain = document.createElement('canvas'); grain.width = W; grain.height = H;
{ const g = grain.getContext('2d'), id = g.createImageData(W, H), r = RNG(42); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 70; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }
function overlay() {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 0.05; X.globalCompositeOperation = 'overlay'; X.drawImage(grain, 0, 0); X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1;
  const g = X.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(40,30,20,0)'); g.addColorStop(1, 'rgba(40,30,20,0.22)'); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
}

// ---------- shots: one per narration beat. t = seconds into the beat, d = its length, l(k)/e(k) = start/end of line k ----------
const SAM_BED = [-80, -150];
function samLying(face = 'neutral', o = {}) { stick({ hipAt: SAM_BED, lean: -1.42, face, dir: 0, noLegs: true, aL: [0, 0], aR: [0, 0], seed: 1, ...o }); }
const SHOT = {
  title(t, d) {
    paper(); camL([0, -380, 1.04], [0, -380, 1], t / d);
    rect(-3000, 0, 6000, 900, C.paper2, null); line([[-3000, 0], [3000, 0]], C.line, 6);
    label('Are Ghosts Real?', 0, -640, t, 0.35, 124, C.ink, 600);
    shadow(-420, 0); stick({ x: -420, y: 0, dir: 1, face: 'think', aR: SCRATCH, look: [2, -3], seed: 2 }); mark('?', -330, -420, t, 0.9, 90, C.coral);
    X.save(); X.globalAlpha = seg(t, 0.6, 1.4); shadow(420, 0, 60, 0.1); ghost(420, -60, 1.15, { arms: true }); X.restore();
  },
  night(t, d, l, e) {
    bedroom(0); camL([-120, -330, 0.95], [-220, -230, 1.75], seg(t, 0.2, e(0)));
    clockDigital(-435, -230, '2:00'); lampSmall(-390, -170, false);
    samLying('neutral', { look: t > l(1) ? [Math.sin((t - l(1)) * 5) * 4, 0] : [0, 0] }); blanket(0, 0);
    nightVignette(0.4);
  },
  creak(t, d, l) {
    const up = smooth(seg(t, l(0) + 1.0, l(0) + 1.6));
    bedroom(0, { door: 0.12 }); camL([20, -340, 1.15], [120, -360, 1.0], t / d);
    clockDigital(-435, -230, '2:00'); lampSmall(-390, -170, false);
    stick({ hipAt: SAM_BED, lean: lerp(-1.42, 0.08, up), face: up > 0.5 ? 'scared' : 'neutral', dir: up > 0.5 ? 1 : 0, noLegs: true, aL: [lerp(0, 0.7, up), 0.5], aR: [lerp(0, 0.9, up), 0.6], look: [3, 0], seed: 1 }); blanket(0, 0, C.teal, up * 0.3);
    if (up > 0.5) { sweat(-20, -420, 1); mark('!', -10, -470, t, l(0) + 1.4, 80, C.coral); }
    X.save(); X.globalAlpha = seg(t, l(0) + 1.2, l(0) + 1.5) * (1 - seg(t, l(1) - 0.2, l(1) + 0.3)); text('creak...', 660, -560, 46, '#efe6d0', 500); X.restore();
    for (let i = 0; i < 4; i++) { const t0 = l(1) + 0.1 + i * 0.55; X.save(); X.globalAlpha = seg(t, t0, t0 + 0.1) * (1 - seg(t, t0 + 0.9, t0 + 1.4)); text('tap', 640 + (i % 2) * 70, -440 + i * 60, 40, '#efe6d0', 500); X.restore(); }
    nightVignette(0.4);
  },
  figure(t, d, l) {
    hallway(0); const k = smooth(seg(t, l(1) - 0.2, l(1) + 1.6));
    camL([-160, -390, 1.0], [250, -520, 1.75], k);
    const s = stick({ x: -585, y: 0, dir: 1, lean: 0.33, face: 'scared', look: [4, -1], aR: [1.25, 0.5], seed: 1 });
    rect(-3000, -1200, 2470, 1200, '#3e4762', null); rect(-600, -1200, 70, 1200, C.brown, C.ink, 7);   // door frame hides his body
    for (let i = 0; i < 5; i++) { const kk = (t * 0.7 + i / 5) % 1; X.save(); X.globalAlpha = (1 - kk) * 0.5 * seg(t, 0.4, 1.2); circ(s.hc[0] + 40 + kk * 70, s.hc[1] + 14 - kk * 30, 6 + kk * 14, '#e8eef4', null); X.restore(); }
    X.save(); X.globalAlpha = 0.5 * seg(t, 0.4, 1.6); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = RNG(i)(); line([[Math.cos(a) * 1200 - 160, Math.sin(a) * 700 - 390], [Math.cos(a) * (1000 - r * 140) - 160, Math.sin(a) * (560 - r * 90) - 390]], '#cfe0ee', 4); } X.restore();
    if (t > l(1) + 0.3) { const g = popIn(t, l(1) + 0.3, 0.2); circ(222, -650, 6 * g, '#e9e3cf', null); circ(278, -650, 6 * g, '#e9e3cf', null); }
    nightVignette(0.5);
  },
  question(t, d, l) {
    const sw = smooth(seg(t, l(1) - 0.25, l(1) + 0.35));
    if (sw < 1) {
      bedroom(0); cam(-40, -260, 1.5); clockDigital(-435, -230, '2:01'); lampSmall(-390, -170, false);
      const sh = Math.sin(NOW * 34) * 3; at(sh, 0, 1, 0, () => { blanket(0, 0, C.teal, 2.2, -60); });
      at(-170 + sh, -235, 1, 0, () => { circ(-12, 0, 9, '#fff', C.ink, 3); circ(12, 0, 9, '#fff', C.ink, 3); circ(-9, 1, 3.6, C.ink, null); circ(15, 1, 3.6, C.ink, null); });
      nightVignette(0.45);
    }
    if (sw > 0) { X.save(); X.globalAlpha = sw; paper(); cam(0, -380, lerp(1.08, 1, seg(t, l(1), d))); rect(-3000, 0, 6000, 900, C.paper2, null); line([[-3000, 0], [3000, 0]], C.line, 6);
      label('Are ghosts real?', 0, -620, t, l(1) + 0.4, 112); ghost(0, -110, 1.25, {}); mark('?', 150, -360, t, l(1) + 0.9, 110, C.coral); X.restore(); }
  },
  history(t, d, l, e) {
    paper(); const P = [0, 1500, 2700, 4150], m = l(1) + 3.4;
    let cx = 0, z = 1;
    if (t < l(1)) cx = 0; else if (t < m) cx = lerp(0, P[1], smooth(seg(t, l(1) - 0.3, l(1) + 0.5))); else if (t < l(2)) cx = lerp(P[1], P[2], smooth(seg(t, m - 0.2, m + 0.6))); else { cx = lerp(P[2], P[3], smooth(seg(t, l(2) - 0.3, l(2) + 0.6))); z = lerp(1, 0.9, seg(t, l(2), d)); }
    cam(cx, -380, z);
    rect(-2000, 0, 8000, 900, C.paper2, null); line([[-2000, 0], [6200, 0]], C.line, 6);
    line([[-900, 120], [5000, 120]], C.ink, 5); poly([[5000, 104], [5030, 120], [5000, 136]], C.ink, null);
    P.forEach((x, i) => circ(x, 120, 12, [C.coral, C.mustard, C.teal, C.sage][i], C.ink, 4));
    // campfire stories
    fire(0, 0, 1);
    [[-260, 1, 'smile'], [260, -1, 'oh'], [-120, 1, 'scared']].forEach(([x, dir, f], i) => { if (i === 2) return; stick({ x, y: 0, dir, ...sitP, face: f, aR: i === 0 ? [1.6 + 0.2 * Math.sin(NOW * 4), 0.6] : [0.6, 1.2], talk: i === 0 && t < e(0), seed: i + 3 }); });
    X.save(); X.globalAlpha = 0.55 * seg(t, 0.8, 2.0); ghost(0, -230 - (t % 4) * 4, 0.7, { mouth: false }); X.restore();
    label('Thousands of years of ghost stories', 0, -700, t, 0.5, 46);
    // Mesopotamia
    at(P[1] - 120, -150, popIn(t, l(1) + 0.3), -0.05, () => { rect(-110, -150, 220, 280, '#c9a477', C.ink, 7, 26); for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) poly([[-70 + c * 46, -110 + r * 42], [-52 + c * 46, -100 + r * 42], [-70 + c * 46, -90 + r * 42]], C.ink, null); });
    stick({ x: P[1] + 160, y: 0, dir: -1, face: 'scared', beard: true, aR: [1.4, 0.4], aL: [0.4, 0.3], seed: 6 }); X.save(); X.globalAlpha = 0.7 * seg(t, l(1) + 0.8, l(1) + 1.4); ghost(P[1] + 20, -470, 0.65, { mouth: true }); X.restore();
    label('Ancient Mesopotamia', P[1], -700, t, l(1) + 0.3, 46);
    // Rome: the Lemuria festival
    at(P[2] - 260, 0, popIn(t, m), 0, () => { [-60, 60].forEach(cx_ => { rect(cx_ - 26, -360, 52, 360, '#efe7d6', C.ink, 6); for (let i = 0; i < 3; i++) line([[cx_ - 12 + i * 12, -340], [cx_ - 12 + i * 12, -20]], C.line, 3); }); poly([[-130, -360], [130, -360], [0, -440]], '#efe7d6', C.ink, 6); });
    const toss = (t - m) % 1.3; stick({ x: P[2] + 20, y: 0, dir: 1, face: 'worried', toga: '#f2ece0', laurel: true, aR: [toss < 0.3 ? 2.2 : 1.0, 0.3], seed: 7 });
    if (t > m) { for (let i = 0; i < 3; i++) { const k = ((t - m) * 0.9 + i / 3) % 1; circ(P[2] + 90 + k * 260, -260 - Math.sin(k * Math.PI) * 120, 7, C.ink, null); } X.save(); X.globalAlpha = 0.75 * (0.6 + 0.4 * Math.sin(t * 3)); ghost(P[2] + 420 + Math.min(240, (t - m) * 40), -60, 0.75, { mouth: true, arms: true }); X.restore(); }
    label('Rome: the Lemuria festival', P[2] + 80, -700, t, m, 46);
    // the whole world
    at(P[3], -380, popIn(t, l(2) + 0.1, 0.5), NOW * 0.08, () => { circ(0, 0, 230, '#8fb4b8', C.ink, 8); ell(-70, -60, 90, 60, C.sage, C.ink, 5, 0.4); ell(90, 40, 70, 100, C.sage, C.ink, 5, -0.3); ell(-40, 120, 60, 36, C.sage, C.ink, 5); });
    [[-330, -560], [300, -620], [380, -200], [-360, -150], [10, -720]].forEach(([gx, gy], i) => { const k = popIn(t, l(2) + 0.5 + i * 0.5); at(P[3] + gx, -380 + gy + 380, k, 0, () => ghost(0, 0, 0.42, { ph: i, fill: [C.ghost, '#e3eef0', '#efe3e6', '#f1ead8', '#e6e6f2'][i] })); });
    label('Every culture has its ghosts', P[3], -760, t, l(2) + 0.3, 46);
  },
  today(t, d, l) {
    paper(); cam(0, -400, lerp(1.0, 1.05, t / d)); rect(-3000, 0, 6000, 900, C.paper2, null); line([[-3000, 0], [3000, 0]], C.line, 6);
    const believe = [1, 4, 8, 10, 13], felt = [4, 10, 13], t1 = l(1) + 1.2, t2 = l(1) + 5.0;
    for (let i = 0; i < 15; i++) {
      const r = Math.floor(i / 5), c = i % 5, x = (c - 2) * 230 + (r % 2) * 60 - 30, y = -r * 70 + 40, s = 0.78 - r * 0.06, b = believe.includes(i) && t > t1;
      X.save(); X.translate(0, 0);
      stick({ x, y: y - 40, s, dir: 0, col: b ? '#7a3e30' : C.ink, headFill: b ? '#f3d6c8' : C.head, face: b ? (felt.includes(i) && t > t2 ? 'scared' : 'smile') : 'neutral', aR: b ? [2.9, 0.1] : undefined, seed: i * 3 });
      if (felt.includes(i) && t > t2) { at(x + 70 * s, y - 330 * s - 40, popIn(t, t2 + i * 0.05) * 0.32, 0, () => ghost(0, 0, 1, { ph: i })); shiver(x, y - 220 * s - 40, s); }
      X.restore();
    }
    label('Many people still believe', 0, -820, t, 0.4, 50);
    tag('about 1 in 3 believe in ghosts', -360, -700, t, t1, '#efc9bb', 40); tag('nearly 1 in 5 felt one nearby', 380, -700, t, t2, '#d7e3e4', 40);
  },
  science(t, d, l) {
    paper('#e6dfd0'); camL([0, -400, 1.0], [80, -420, 1.08], t / d); rect(-3000, 0, 6000, 900, C.paper2, null); line([[-3000, 0], [3000, 0]], C.line, 6);
    const idea = t > l(3) + 0.6;
    shadow(-520, 0); stick({ x: -520, y: 0, dir: 1, face: idea ? 'smile' : t > l(2) ? 'worried' : 'think', glasses: true, coat: '#f6f3ec', aR: t < l(1) ? SCRATCH : [1.0, 0.7], aL: [0.6, 1.6], look: [3, -1], propL: ([x, y]) => rect(x - 10, y - 60, 70, 90, '#f2e6c7', C.ink, 5, 6), seed: 4 });
    label('What does science say?', 0, -780, t, 0.3, 54);
    at(-200, 0, popIn(t, l(1) + 1.0), 0, () => { line([[0, 0], [-40, -240]], C.ink, 6); line([[0, 0], [40, -240]], C.ink, 6); line([[0, 0], [0, -240]], C.ink, 6); rect(-70, -330, 140, 90, '#55555f', C.ink, 6, 10); circ(0, -285, 30, '#8fb4b8', C.ink, 5); circ(56, -312, 7, C.coral, null); });
    at(40, -120, popIn(t, l(1) + 2.0), 0, () => { rect(-60, -80, 120, 140, C.mustard, C.ink, 6, 12); line([[30, -80], [50, -170]], C.ink, 5); circ(50, -170, 10, C.coral, C.ink, 4); X.beginPath(); X.arc(0, -10, 36, Math.PI * 1.1, Math.PI * 1.9); stroke(C.ink, 4); line([[0, -10], [Math.cos(-1.2 + 0.15 * Math.sin(t * 7)) * 34, -10 + Math.sin(-1.2 + 0.15 * Math.sin(t * 7)) * 34]], C.coral, 4); });
    at(220, 0, popIn(t, l(1) + 3.0), 0, () => thermo(0, -60, 0.55));
    at(560, -320, popIn(t, l(1) + 4.2, 0.4), 0, () => { rect(-230, -170, 460, 300, '#3b3f4c', C.ink, 8, 16); rect(-30, 130, 60, 100, '#55555f', C.ink, 6); const fl = t > l(2) + 0.3;
      X.save(); X.beginPath(); X.rect(-210, -150, 420, 260); X.clip(); X.beginPath(); for (let i = 0; i <= 60; i++) { const xx = -210 + i * 7, yy = fl ? 0 : Math.sin(i * 0.9 + t * 8) * 30 * Math.sin(i * 0.3); i ? X.lineTo(xx, yy) : X.moveTo(xx, yy); } stroke('#9fd3b2', 5); X.restore();
      if (fl) text('NO GHOST DETECTED', 0, -100, 34, '#9fd3b2', 600); });
    if (idea) { at(-520, -440, popIn(t, l(3) + 0.6), 0, () => { circ(0, 0, 40, '#f4e3a6', C.ink, 6); rect(-18, 38, 36, 26, C.grey, C.ink, 5, 4); for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + i * 0.16); line([[Math.cos(a) * 56, Math.sin(a) * 56], [Math.cos(a) * 76, Math.sin(a) * 76]], C.ink, 5); } }); tag('the experiences are real', 0, -660, t, l(3) + 1.6, '#efc9bb', 40); }
  },
  creaks(t, d, l) {
    const z = smooth(seg(t, l(1) - 0.3, l(1) + 1.0));
    fillAll(mixC('#cfc6b6', '#4d5672', seg(t, 0.4, 2.2))); camL([0, -500, 0.62], [-80, -560, 1.6], z);
    circ(-760, -1050, 50, C.moon, C.ink, 5); glow(-760, -1050, 160, C.moon, 0.3 * seg(t, 0.8, 2.2));
    rect(-3000, 270, 6000, 900, '#6f6656', null); line([[-3000, 270], [3000, 270]], C.ink, 7);
    house(0, 0, { room: mixC('#efe5d1', '#c9bca4', seg(t, 0.4, 2.5)) });
    thermo(620, -260, lerp(0.75, 0.35, smooth(seg(t, 0.8, l(1)))), `${Math.round(lerp(22, 13, smooth(seg(t, 0.8, l(1)))))}°C`);
    const sh = Math.sin(t * 9) * 2 * z; for (let i = 0; i < 8; i++) rect(-330 + i * 84 + (i % 2 ? sh : -sh), -400, 80, 22, '#b08a62', C.ink, 4, 3);   // floorboards
    rect(-340, -456, 650, 22, '#9a9aa6', C.ink, 5, 10); line([[310, -445], [310, -720]], '#9a9aa6', 18); line([[310, -445], [310, -720]], C.ink, 3);
    if (z > 0.5) { [[-200, -460, 'shrink'], [60, -500, 'settle']].forEach(([x, y, s]) => { line([[x - 50, y - 30], [x - 20, y - 30]], C.ink, 4); line([[x + 50, y - 30], [x + 20, y - 30]], C.ink, 4); text(s, x, y - 64, 26, C.ink, 500); }); }
    label('creak!', -120, -560, t, l(1) + 1.5, 44, '#f4ead2'); label('creak!', 150, -600, t, l(1) + 2.6, 44, '#f4ead2');
    for (let i = 0; i < 4; i++) { const t0 = l(1) + 3.2 + i * 0.35; X.save(); X.globalAlpha = seg(t, t0, t0 + 0.1) * 0.7; ell(-260 + i * 120, -428 + (i % 2) * 10, 16, 8, '#3a3240', null); X.restore(); }
  },
  faces(t, d, l, e) {
    paper(); cam(0, -400, 1.0); rect(-3000, 0, 6000, 900, C.paper2, null); line([[-3000, 0], [3000, 0]], C.line, 6);
    if (t < l(1) - 0.2) {
      brainIcon(-460, -420, 1.4); const r = RNG(5); for (let i = 0; i < 40; i++) circ(80 + r() * 700, -760 + r() * 640, 8 + r() * 10, '#c9bfae', null);
      const k = popIn(t, 2.0, 0.4); at(430, -460, k, 0, () => { circ(-60, -40, 22, C.ink, null); circ(60, -40, 22, C.ink, null); X.beginPath(); X.arc(0, 20, 70, 0.3, Math.PI - 0.3); stroke(C.ink, 14); circ(0, 0, 170, null, C.coral, 7); });
      label('our brains hunt for faces', -460, -720, t, 0.5, 44);
    } else {
      at(-560, -440, popIn(t, l(1) + 0.1), 0, () => cloudFace(0, 0, 1.1));
      at(0, -420, popIn(t, l(1) + 1.0), 0, () => socket(0, 0, 1.25));
      at(560, -10, popIn(t, l(1) + 2.2), 0, () => { rect(-140, -720, 280, 720, C.brown, C.ink, 7, 4); circ(100, -360, 10, C.mustard, C.ink, 4); coatShape(0, 0, 0, 0.85); });
      if (t > l(2)) { X.save(); X.globalAlpha = 0.85; X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = 'rgba(237,230,216,0.6)'; X.fillRect(0, 0, W, H); X.restore(); cam(0, -400, 1); }
      label('pareidolia', 0, -460, t, l(2) + 0.3, 120, C.ink); label('(pair-eye-DOH-lee-uh)', 0, -350, t, l(2) + 0.6, 40, '#6b6a72', 500);
    }
  },
  tiger(t, d, l, e) {
    fillAll('#e9dcc0'); const run = t > e(0) - 2.9 && t < l(1), sp = e(0) - 5.8;
    rect(-4000, 0, 8000, 900, '#c7c08f', null); line([[-4000, 0], [4000, 0]], C.ink, 7); circ(700, -760, 70, '#efd59a', C.ink, 6);
    if (t < l(1)) {
      cam(0, -380, 1);
      tree(-760, 0, 1.1); for (let i = 0; i < 9; i++) line([[-900 + i * 230, 0], [-910 + i * 230, -36], [-890 + i * 230, -26]], '#7e8a5a', 5);
      const cx = t < sp ? lerp(-560, -180, t / sp) : run ? lerp(-180, -900, seg(t, e(0) - 2.9, e(0) - 0.6)) : -180;
      const wk = walkP(t * (run ? 15 : 8), run ? 1.3 : 1);
      if (cx > -1000) stick({ x: cx, y: 0, dir: run ? -1 : 1, face: run ? 'scared' : t > sp ? 'shock' : 'neutral', hair: 'messy', ...wk, propR: ([x, y], a) => at(x, y, 1, a + Math.PI / 2, () => line([[0, -150], [0, 90]], C.brown, 7)), seed: 8 });
      bush(260, 0, 1.1, t > sp - 0.6 && t < sp + 1 ? 1 : 0);
      bubble(-60, -620, 280, 190, t, sp + 0.05, () => tiger(-20, 70, 0.55, 1), -40, 110);
      if (t > e(0) - 3.0) { tag('safe!', -560, -720, t, e(0) - 1.6, '#cfe0c4', 40); }
    } else {
      cam(0, -400, 1); brainIcon(0, -470, 1.6);
      tag('someone is there!', 0, -760, t, l(1) + 0.3, '#efc9bb', 44); label('...questions later', 0, -170, t, l(1) + 2.6, 44, '#6b6a72', 500);
      if (t > l(1) + 0.3 && t < l(1) + 2.4) { X.save(); X.globalAlpha = 0.5 + 0.5 * Math.sin(NOW * 18); circ(0, -510, 230, null, C.coral, 8); X.restore(); }
    }
  },
  infra(t, d, l, e) {
    fillAll('#d9d4cc'); const p2 = t > l(2) - 0.2;
    rect(-3000, 0, 6000, 900, '#b9b0a2', null); line([[-3000, 0], [3000, 0]], C.ink, 7);
    if (t < l(1) - 0.2) {
      cam(0, -400, 1);
      at(-200, -430, popIn(t, 0.4), 0, () => { X.beginPath(); X.moveTo(-40, -90); X.bezierCurveTo(60, -130, 110, -20, 40, 30); X.bezierCurveTo(10, 60, 30, 100, -10, 110); stroke(C.ink, 12); X.beginPath(); X.arc(0, -20, 34, Math.PI * 1.2, Math.PI * 0.5); stroke(C.ink, 8); line([[-110, -140], [110, 140]], C.coral, 14); });
      waves(120, -430, t, 4, C.teal, 380); label('too low to hear', 0, -760, t, 1.3, 46);
    } else {
      camL([-80, -400, 1.0], [360, -520, 1.5], seg(t, l(2) - 0.2, l(2) + 1.4));
      rect(-640, -230, 520, 30, C.brown, C.ink, 6, 4); line([[-600, -200], [-600, 0]], C.ink, 7); line([[-160, -200], [-160, 0]], C.ink, 7);
      rect(-560, -360, 170, 130, '#3b3f4c', C.ink, 6, 10); rect(-500, -230, 50, 10, C.ink, null);
      const turn = t > l(1) + 6.6 && t < l(1) + 7.6;
      stick({ x: -260, y: 0, dir: turn ? -1 : -1, ...sitP, face: t > l(1) + 3.4 ? (turn ? 'scared' : 'worried') : 'neutral', glasses: true, coat: '#f6f3ec', aR: [1.4, 0.6], aL: [1.2, 0.8], tilt: turn ? 0 : 0.05, seed: 9 });
      rect(-330, -140, 140, 22, '#7b7f90', C.ink, 5, 6); line([[-300, -118], [-300, 0]], C.ink, 6);
      if (t > l(1) + 3.4) { sweat(-220, -390, 0.9); shiver(-260, -360, 0.9); }
      const gA = seg(t, l(1) + 4.6, l(1) + 5.6) * (1 - seg(t, l(1) + 6.7, l(1) + 7.0)); if (gA > 0) { X.save(); X.globalAlpha = gA * 0.45; X.filter = 'blur(6px)'; ghost(-880, -60, 1.6, { mouth: false, fill: '#9a9aa6' }); X.filter = 'none'; X.restore(); }
      label('1998', -380, -720, t, l(1) + 0.4, 60);
      const a = t * 18; fan(420, -560, 0.95, a); if (p2) { waves(500, -560, t * 1.3, 5, C.teal, 600); X.save(); X.globalAlpha = 0.35; waves(-120, -380, t * 1.3, 3, C.teal, 260); X.restore(); }
      if (p2) tag('about 19 Hz', 420, -760, t, l(2) + 0.9, '#d7e3e4', 40);
    }
  },
  carbon(t, d, l) {
    paper('#e6dccb'); const dn = smooth(seg(t, l(1) - 0.3, l(1) + 1.0));
    camL([0, -380, 0.78], [0, 60, 1.25], dn);
    rect(-3000, 270, 6000, 900, '#a49681', null); line([[-3000, 270], [3000, 270]], C.ink, 7);
    house(0, 0, { base: '#bcae95' });
    label('1921', -560, -820, t, 0.3, 60);
    const fam = [[-120, 'neutral', {}], [60, 'worried', { hair: 'bun' }], [200, 'scared', { s: 0.68 }]];
    fam.forEach(([x, f, o], i) => { const hold = t > 4.5; stick({ x, y: -20, dir: i === 0 ? 1 : -1, face: t > 2.0 ? (i === 2 ? 'scared' : 'worried') : 'neutral', aR: hold ? [2.6, 1.6] : undefined, aL: hold ? [2.5, 1.7] : undefined, seed: 10 + i, ...o, s: (o.s ?? 0.82) }); if (hold) shiver(x, -240 * (o.s ?? 0.82) - 20, o.s ?? 0.82); });
    for (let i = 0; i < 4; i++) { const t0 = 2.5 + i * 0.55; X.save(); X.globalAlpha = seg(t, t0, t0 + 0.1) * (1 - seg(t, t0 + 1.5, t0 + 2.2)); ell(-200 + i * 110, -395, 14, 7, '#3a3240', null); X.restore(); }
    X.save(); X.globalAlpha = 0.35 * seg(t, 6.0, 7.0); stick({ x: 300, y: -20, dir: -1, col: '#4a4656', headFill: '#4a4656', noFace: true, alpha: 1, s: 0.95 }); X.restore();
    furnace(160, 250, 1); smoke(160, 0, t, seg(t, 1.0, 4.0) * 0.8 + dn * 0.4);
    if (dn > 0.3) { tag('carbon monoxide (CO)', -150, 120, t, l(1) + 0.9, '#d6d6de', 36); }
  },
  paralysis(t, d, l) {
    bedroom(0); camL([-40, -300, 1.15], [-60, -280, 1.35], t / d); clockDigital(-435, -230, '3:17'); lampSmall(-390, -170, false);
    samLying(t > 1.5 ? 'scared' : 'sleep', { look: [Math.sin(t * 3) * 3, 0] }); blanket(0, 0);
    bubble(140, -560, 280, 170, t, 0.6, () => { for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(-60 + i * 60, 0, 22, NOW * 2 + i, NOW * 2 + i + 4.5); stroke(C.lav, 6); } }, -90, 120);
    if (t > l(0) + 4.0) padlock(60, -260, popIn(t, l(0) + 4.0) * 0.8);
    label('sleep paralysis', -60, -690, t, 0.7, 46, '#efe6d0');
    if (t > l(1)) { const a = seg(t, l(1), l(1) + 1.5); X.save(); X.globalAlpha = a * 0.6; X.filter = 'blur(3px)'; stick({ x: 420, y: 0, s: 1.25, dir: -1, col: '#1f2233', headFill: '#1f2233', noFace: true, lean: 0.1 }); X.filter = 'none'; X.restore(); X.save(); X.globalAlpha = a * 0.5; ell(0, -205, 120, 50, '#1f2233', null); X.restore(); }
    nightVignette(0.55);
  },
  expect(t, d, l) {
    hallway(0); const wk = walkP(t * 6, 0.6), x = lerp(-450, 0, seg(t, 0, l(1)));
    camL([-200, -400, 1.0], [-60, -420, 1.1], t / d);
    rect(-140, -620, 230, 110, '#efe6d0', C.ink, 6, 8); text('HAUNTED?', -25, -566, 38, C.coral, 600);
    const s = stick({ x, y: 0, dir: 1, face: 'worried', ...wk, aR: [1.5, 0.1], look: [3, -1], propR: torch, seed: 1 });
    flashBeam(s.hR[0] + 40, s.hR[1], -0.05 + 0.18 * Math.sin(t * 1.3), 800, 0.35);
    tag('?!', 690, -700, t, l(0) + 2.2, '#efc9bb', 44); tag('?!', 430, -120, t, l(0) + 3.0, '#efc9bb', 44); tag('?!', 250, -760, t, l(0) + 3.8, '#efc9bb', 44);
    if (t > l(1)) bubble(x - 80, -560, 240, 170, t, l(1) + 0.3, () => ghost(0, 55, 0.5, {}), 40, 110);
    nightVignette(0.45);
  },
  light(t, d, l, e) {
    const on = t > e(0) - 0.6, lit = smooth(seg(t, e(0) - 0.6, e(0) - 0.35)), win = l(1) + 4.7, shut = smooth(seg(t, l(1) + 6.0, l(1) + 6.8));
    hallway(lit, { open: 1 - shut });
    let cx = -300, z = 1.15; if (t > l(1)) { if (t < l(1) + 2.3) { cx = 220; z = 1.2; } else if (t < win) { cx = 0; z = 1.3; } else { cx = 600; z = 1.2; } }
    cam(cx, t > l(1) + 2.3 && t < win ? -620 : -420, z);
    const reach = smooth(seg(t, 0.3, e(0) - 0.7)), atWin = t > win;
    const x = atWin ? lerp(-380, 560, seg(t, win, win + 1.0)) : -380, wk = atWin && t < win + 1.0 ? walkP(t * 9) : {};
    stick({ x, y: 0, dir: atWin ? 1 : -1, face: on ? (t > l(1) + 0.8 ? 'smile' : 'oh') : 'worried', aR: atWin ? (t > l(1) + 6.0 ? [2.0 - shut * 0.5, 0.3] : wk.aR) : [lerp(0.2, 2.15, reach), 0.2], ...wk, seed: 1 });
    if (on && !atWin) { if (lit < 1) { X.save(); X.globalAlpha = 1 - lit; nightVignette(0.5); X.restore(); } }
    tag('just a coat', 250, -760, t, l(1) + 0.3, '#f2e3bd', 40);
    if (t > l(1) + 2.3 && t < win) { for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; X.save(); X.globalAlpha = 1 - k; line([[-60 + i * 60, -790 + k * 20], [-50 + i * 60, -770 + k * 30]], C.ink, 4); X.restore(); } tag('pipes cooling down', 0, -700, t, l(1) + 2.5, '#d7e3e4', 38); }
    if (atWin) tag('an open window', 830, -720, t, win + 0.3, '#d7e3e4', 38);
    if (!on) nightVignette(0.5);
  },
  answer(t, d, l) {
    paper(); cam(0, -400, lerp(1.04, 1, seg(t, 0, 2))); rect(-3000, 0, 6000, 900, C.paper2, null); line([[-3000, 0], [3000, 0]], C.line, 6);
    label('So... are ghosts real?', 0, -780, t, 0.3, 60);
    shadow(-80, 0); stick({ x: -80, y: 0, dir: 0, face: t > l(2) ? 'happy' : 'think', aR: t < l(2) ? SCRATCH : [0.4, 0.2], aL: [0.3, 0.2], seed: 1 });
    const fade = seg(t, l(1) + 0.4, l(1) + 2.2); X.save(); X.globalAlpha = 1 - fade; ghost(420, -40, 1.0, { arms: true }); X.restore();
    if (t > l(1)) tag('no scientific evidence', 420, -560, t, l(1) + 0.2, '#efc9bb', 40);
    if (t > l(2)) { brainIcon(-80, -470, popIn(t, l(2) + 0.3, 0.45) * 0.8); [[-260, -560, 0], [110, -600, 1.5], [-200, -360, 3]].forEach(([x, y, p]) => t > l(2) + 0.6 && sparkle(x, y, 0.9, p)); tag('a pattern-hunting brain', -80, -680, t, l(2) + 1.4, '#d7e3e4', 40); }
  },
  ending(t, d, l, e) {
    const crash = e(1) - 0.8, off = t > e(2) + 0.8, cardA = seg(t, e(2) + 1.3, e(2) + 2.0);
    bedroom(0, { warm: off ? 0 : 0.55 }); cam(0, -330, 1.0, 0.5);
    clockDigital(-435, -230, '2:24'); lampSmall(-390, -170, !off);
    rect(700, -330, 260, 330, C.brown, C.ink, 7, 6); line([[700, -220], [960, -220]], C.ink, 5);
    const fall = seg(t, crash - 0.35, crash), cupX = 760 - 70 * fall, cupY = -330 + 330 * fall * fall;
    if (t < crash) { at(cupX, cupY, 1, fall * 2.5, () => { rect(-24, -50, 48, 50, '#e7dccb', C.ink, 5, 6); X.beginPath(); X.arc(26, -26, 12, -1.4, 1.4); stroke(C.ink, 5); }); }
    else { at(700, 0, 1, 0, () => { poly([[-40, -8], [-14, -26], [6, -8]], '#e7dccb', C.ink, 4); poly([[10, -6], [30, -24], [44, -4]], '#e7dccb', C.ink, 4); }); }
    cat(870, -330, 0.9, -1, { paw: t > crash - 1.0 && t < crash ? Math.abs(Math.sin((t - crash) * 6)) : 0, happy: t > crash + 0.9 });
    if (t < 1.6) { const wk = walkP(t * 9); stick({ x: lerp(420, 120, seg(t, 0, 1.4)), y: 0, dir: -1, face: 'smile', ...wk, seed: 1 }); bed(0, 0); blanket(0, 0, C.teal, 0); }
    else { const awake = t > crash + 0.1 && t < e(2) + 0.6; samLying(awake ? (t > crash + 1.2 ? 'happy' : 'oh') : 'sleep', { wink: awake && t < crash + 1.2, look: [3, 0] }); blanket(0, 0, C.teal, smooth(seg(t, 1.6, 2.6)) * -0.2); }
    if (t > crash && t < crash + 1.0) mark('CRASH!', 820, -520, t, crash, 54, C.coral);
    if (off) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = 'rgba(14,16,30,0.45)'; X.fillRect(0, 0, W, H); X.restore(); text('Z', -150 + Math.sin(t * 2) * 6, -300 - (t % 2) * 20, 40, '#efe6d0', 600, 'center', 0.8); text('z', -120 + Math.sin(t * 2 + 1) * 6, -350 - (t % 2) * 20, 30, '#efe6d0', 600, 'center', 0.7); }
    nightVignette(0.35);
    if (cardA > 0) { X.save(); X.globalAlpha = cardA; X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = 'rgba(20,22,36,0.6)'; X.fillRect(0, 0, W, H); X.restore(); X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = cardA; text('Are Ghosts Real?', W / 2, H / 2 - 40, 96, '#efe6d0', 600); text('Sweet dreams.', W / 2, H / 2 + 60, 44, '#cfc6b0', 500); X.restore(); }
  },
};

// ---------- frame loop ----------
window.renderFrame = (T) => {
  T = clamp(T, 0, TL.duration - 1e-3); NOW = T;
  let i = TL.beats.findIndex(b => T < b.end); if (i < 0) i = TL.beats.length - 1;
  const b = TL.beats[i], t = T - b.start, d = b.end - b.start, ln = (k) => b.lines[Math.min(k, b.lines.length - 1)] ?? { t0: b.start, t1: b.end };
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none';
  SHOT[b.id](t, d, (k) => ln(k).t0 - b.start, (k) => ln(k).t1 - b.start);
  overlay();
  // short dip-to-paper between beats, fade from black at the start and to black at the end
  let f = 0; if (t < 0.18 && i > 0) f = 1 - t / 0.18; if (d - t < 0.18 && i < TL.beats.length - 1) f = Math.max(f, 1 - (d - t) / 0.18);
  X.setTransform(1, 0, 0, 1, 0, 0);
  if (f > 0) { X.globalAlpha = f * 0.55; X.fillStyle = '#1a1b24'; X.fillRect(0, 0, W, H); }
  const k = Math.max(1 - T / 0.8, seg(T, TL.duration - 0.8, TL.duration)); if (k > 0) { X.globalAlpha = k; X.fillStyle = '#000'; X.fillRect(0, 0, W, H); }
  X.globalAlpha = 1;
};
window.DURATION = TL.duration;
window.renderFrame(0);
window.READY = true;
