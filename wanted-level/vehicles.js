// Vehicles: realistic-ish cars from extruded side profiles (wheel arches, glass cabin, lights, rims), police liveries
// per country, military vehicles, aircraft. Forward is +Z, ground at y = 0.
import { THREE, RoundedBoxGeometry, mergeGeometries, STD, LAM, C, canvasTex, TAU, cached, RNG, glow, lerp } from './core.js';
const lerp2 = lerp;
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
const mergeG = gs => mergeRaw(gs.map(g => g.index ? g.toNonIndexed() : g), true);
const NI = g => { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };

// ---------- shared materials ----------
export const GLASS = STD(0x0c141c, { metalness: 0.9, roughness: 0.07, envMapIntensity: 1.6 });
export const TRIM = STD(0x16181b, { roughness: 0.55 });
const TYRE = STD(0x1b1b1c, { roughness: 0.92 });
const RIM = STD(0xd4d7dc, { metalness: 0.75, roughness: 0.3 });
const RIMD = STD(0x2a2d31, { metalness: 0.7, roughness: 0.35 });
export const HEADM = STD(0xf3ecd8, { emissive: 0xfff3dc, emissiveIntensity: 0.25, roughness: 0.25 });
export const TAILM = STD(0xb3000c, { emissive: 0xff1020, emissiveIntensity: 0.5, roughness: 0.3 });
const INDM = STD(0xff9800, { emissive: 0xff8a00, emissiveIntensity: 0.2, roughness: 0.3 });
const PLATE = STD(0xf2f2ee, { roughness: 0.5 });
const CHROME = STD(0xe0e4ea, { metalness: 1, roughness: 0.18 });
const paints = new Map();
export const paint = c => { const k = String(c); if (!paints.has(k)) paints.set(k, STD(c, { metalness: 0.12, roughness: 0.42, envMapIntensity: 1.0 })); return paints.get(k); };

// ---------- profiles (side silhouettes, front = +x) ----------
// up: outline over the top from front-bottom to rear-bottom; gh: greenhouse (glass) polygon; wx: wheel x's; R: wheel radius
export const SPECS = {
  sedan: { L: 4.8, W: 1.82, yb: 0.32, R: 0.33, wx: [1.45, -1.4], up: [[2.4, 0.36], [2.42, 0.62], [2.38, 0.8], [2.2, 0.86], [0.85, 0.94], [-1.5, 0.96], [-2.25, 0.95], [-2.4, 0.86], [-2.42, 0.36]], gh: [[0.85, 0.93], [0.28, 1.4], [-1.0, 1.42], [-1.52, 0.95]], doors: [0.85, -0.2, -1.3] },
  coupe: { L: 4.5, W: 1.92, yb: 0.24, R: 0.35, wx: [1.38, -1.38], up: [[2.25, 0.27], [2.31, 0.44], [2.22, 0.6], [1.9, 0.7], [1.0, 0.83], [0.72, 0.86], [-1.4, 0.92], [-1.72, 0.95], [-2.15, 0.9], [-2.28, 0.7], [-2.29, 0.45], [-2.22, 0.27]], gh: [[0.75, 0.85], [-0.12, 1.26], [-0.75, 1.27], [-1.78, 0.93]], doors: [0.72, -0.6] },
  super: { L: 4.6, W: 2.0, yb: 0.17, R: 0.35, wx: [1.42, -1.38], up: [[2.3, 0.21], [2.37, 0.36], [2.2, 0.52], [1.2, 0.7], [0.6, 0.77], [-1.6, 0.88], [-2.2, 0.9], [-2.33, 0.64], [-2.3, 0.24]], gh: [[0.65, 0.76], [-0.25, 1.12], [-0.9, 1.13], [-1.85, 0.87]], doors: [0.6, -0.55] },
  suv: { L: 4.9, W: 1.96, yb: 0.42, R: 0.4, wx: [1.46, -1.46], up: [[2.45, 0.45], [2.49, 0.76], [2.43, 0.96], [2.2, 1.05], [1.25, 1.12], [1.05, 1.14], [-2.25, 1.2], [-2.43, 1.15], [-2.48, 0.9], [-2.45, 0.45]], gh: [[1.08, 1.12], [0.35, 1.68], [-2.12, 1.72], [-2.36, 1.2]], doors: [1.05, -0.1, -1.3] },
  hatch: { L: 4.1, W: 1.78, yb: 0.3, R: 0.32, wx: [1.25, -1.25], up: [[2.05, 0.32], [2.09, 0.55], [2.0, 0.72], [1.75, 0.82], [1.0, 0.92], [0.9, 0.94], [-1.85, 1.0], [-2.0, 0.95], [-2.06, 0.6], [-2.02, 0.32]], gh: [[0.92, 0.93], [0.1, 1.42], [-1.6, 1.45], [-1.96, 1.0]], doors: [0.9, -0.2, -1.2] },
  cab: { L: 4.6, W: 1.95, yb: 0.33, R: 0.36, wx: [1.4, -1.4], up: [[2.3, 0.35], [2.36, 0.62], [2.26, 0.82], [1.9, 0.92], [1.2, 0.98], [-2.05, 1.02], [-2.25, 0.95], [-2.33, 0.7], [-2.3, 0.35]], gh: [[1.2, 0.97], [0.6, 1.62], [-1.9, 1.66], [-2.12, 1.02]], doors: [1.2, 0.0, -1.2] },
  pickup: { L: 5.6, W: 2.0, yb: 0.45, R: 0.42, wx: [1.75, -1.75], up: [[2.8, 0.48], [2.83, 0.85], [2.76, 1.08], [2.4, 1.15], [1.4, 1.2], [1.25, 1.22], [-2.75, 1.25], [-2.82, 1.1], [-2.8, 0.48]], gh: [[1.27, 1.2], [0.6, 1.8], [-0.55, 1.82], [-0.64, 1.25]], doors: [1.25, 0.2, -0.64] },
  van: { L: 5.2, W: 2.0, yb: 0.38, R: 0.38, wx: [1.85, -1.6], up: [[2.6, 0.4], [2.66, 0.8], [2.56, 1.05], [2.2, 1.2], [1.7, 1.3], [0.9, 1.32], [0.85, 2.25], [-2.55, 2.27], [-2.62, 2.0], [-2.62, 0.4]], gh: [[1.68, 1.3], [1.0, 2.2], [0.88, 2.23], [0.88, 1.31]], doors: [1.68, 0.88, -0.6] },
  humvee: { L: 4.9, W: 2.2, yb: 0.5, R: 0.45, wx: [1.6, -1.6], up: [[2.45, 0.55], [2.5, 1.05], [2.3, 1.15], [1.0, 1.2], [-2.4, 1.3], [-2.48, 0.55]], gh: [[1.0, 1.19], [0.75, 1.85], [-1.5, 1.88], [-1.55, 1.25]], doors: [1.0, -0.2, -1.4] },
};

// livery canvases (side caps): u along length front->rear mirrored per side so text reads correctly, v up
function sideTex(kind, lv, col) {
  return cached('side' + kind + lv + col, () => { const S = SPECS[kind], Wd = 1024, Hd = 256, top = Math.max(...S.up.map(p => p[1])) + 0.02;
    const X = x => (S.L / 2 - x) / S.L * Wd, Y = y => (1 - y / top) * Hd;    // front at the left of the canvas
    return canvasTex(Wd, Hd, (c) => {
      c.fillStyle = col; c.fillRect(0, 0, Wd, Hd);
      const band = (y0, y1, f) => { c.fillStyle = f; c.fillRect(0, Y(y1), Wd, Y(y0) - Y(y1)); };
      const txt = (s, x, y, size, f, font = 'Poppins', stroke) => { c.font = `900 ${size}px ${font}, 'WenQuanYi Zen Hei', 'IPAGothic', 'DejaVu Sans', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; if (stroke) { c.lineWidth = 6; c.strokeStyle = stroke; c.strokeText(s, x, y); } c.fillStyle = f; c.fillText(s, x, y, Wd * 0.5); };
      const dx0 = X(S.doors[0]), dx1 = X(S.doors[S.doors.length - 1]), mid = (dx0 + dx1) / 2, belt = S.gh[0][1];
      if (lv === 'usa') { c.fillStyle = '#f6f6f2'; c.fillRect(dx0, Y(belt), dx1 - dx0, Y(S.yb) - Y(belt)); txt('POLICE', mid, Y(belt * 0.7), 64, '#111'); txt('911', mid + 150, Y(belt * 0.35), 30, '#111'); c.fillStyle = '#c8a64a'; c.beginPath(); c.arc(mid - 170, Y(belt * 0.55), 22, 0, TAU); c.fill(); }
      if (lv === 'mex') { band(S.yb + 0.05, S.yb + 0.25, '#1d4fb8'); band(S.yb + 0.25, S.yb + 0.3, '#e8eef8'); txt('POLICÍA', mid, Y(belt * 0.7), 64, '#1d4fb8'); }
      if (lv === 'esp') { band(belt * 0.42, belt * 0.62, '#1d3f9c'); txt('POLICÍA', mid, Y(belt * 0.52), 54, '#fff'); band(belt * 0.36, belt * 0.42, '#f5c400'); }
      if (lv === 'esp_gc') { band(S.yb, belt * 0.55, '#0e5b2c'); txt('GUARDIA CIVIL', mid, Y(belt * 0.75), 44, '#0e5b2c'); }
      if (lv === 'fra') { band(belt * 0.38, belt * 0.62, '#1f3a93'); band(belt * 0.33, belt * 0.38, '#e3262f'); txt('POLICE', mid, Y(belt * 0.5), 58, '#fff'); }
      if (lv === 'fra_g') { txt('GENDARMERIE', mid, Y(belt * 0.6), 50, '#fff'); band(S.yb + 0.04, S.yb + 0.1, '#e3262f'); }
      if (lv === 'uk') { const y0 = Y(belt * 0.62), y1 = Y(S.yb + 0.04), n = 14, cw = Wd / n; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#1a3fb0' : '#d7f000'; c.fillRect(i * cw, y0 + j * (y1 - y0) / 2, cw + 1, (y1 - y0) / 2 + 1); } txt('POLICE', mid, Y(belt * 0.82), 50, '#1a3fb0'); }
      if (lv === 'ger') { c.fillStyle = '#1c3f94'; c.fillRect(dx0, Y(belt * 0.85), dx1 - dx0, Y(S.yb) - Y(belt * 0.85)); txt('POLIZEI', mid, Y(belt * 0.55), 62, '#fff'); }
      if (lv === 'uae') { band(belt * 0.3, belt * 0.42, '#0a7a3a'); band(belt * 0.42, belt * 0.48, '#e2b100'); txt('POLICE  شرطة', mid, Y(belt * 0.72), 46, '#0a7a3a'); }
      if (lv === 'ind') { band(belt * 0.38, belt * 0.48, '#c62828'); band(belt * 0.48, belt * 0.58, '#1e4fb8'); txt('POLICE', mid, Y(belt * 0.78), 56, '#1e4fb8'); }
      if (lv === 'chn') { band(belt * 0.35, belt * 0.62, '#1a3fa8'); txt('公安  POLICE', mid, Y(belt * 0.49), 50, '#fff'); }
      if (lv === 'swat') { txt('特警  SWAT', mid, Y(belt * 0.6), 52, '#f5f5f5'); }
      if (lv === 'jpn') { band(belt * 0.55, belt + 0.1, '#f7f7f4'); txt('警察', mid, Y(belt * 0.78), 60, '#111'); c.fillStyle = '#d4a017'; c.beginPath(); c.arc(mid - 130, Y(belt * 0.75), 16, 0, TAU); c.fill(); }
      if (lv === 'fbi') { txt('FBI', mid, Y(belt * 0.6), 54, '#e8c34a'); }
      if (lv === 'army') { txt('ARMY', mid, Y(belt * 0.6), 52, '#d8d3b0'); }
      if (lv === 'taxi') { c.fillStyle = '#111'; for (let i = 0; i < 24; i++) c.fillRect(i * 44, Y(belt * 0.5), 22, 14); c.fillRect(0, Y(belt * 0.5) + 14, Wd, 3); txt('TAXI', mid, Y(belt * 0.74), 48, '#111'); }
      // door seams, handles, sill shading
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 3;
      for (const d of S.doors) { c.beginPath(); c.moveTo(X(d), Y(S.yb + 0.04)); c.lineTo(X(d) + (d === S.doors[0] ? 6 : 0), Y(belt + 0.02)); c.stroke(); }
      for (let i = 0; i < S.doors.length - 1; i++) { c.fillStyle = 'rgba(20,20,20,.75)'; c.fillRect(X(S.doors[i]) + 30, Y(belt - 0.12), 34, 8); }
      const g = c.createLinearGradient(0, Y(S.yb + 0.22), 0, Hd); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); c.fillStyle = g; c.fillRect(0, Y(S.yb + 0.22), Wd, Hd);
      const g2 = c.createLinearGradient(0, Y(belt), 0, Y(belt - 0.12)); g2.addColorStop(0, 'rgba(255,255,255,.22)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(0, Y(belt), Wd, Y(belt - 0.12) - Y(belt));
    }, true, false); });
}

// ---------- geometry builders ----------
function bodyShape(S) {
  const sh = new THREE.Shape(), [f, ...rest] = S.up; const ar = S.R + 0.08;
  sh.moveTo(f[0], f[1]); for (const p of rest) sh.lineTo(p[0], p[1]);
  const xs = [...S.wx].sort((a, b) => a - b);     // rear wheel first, walking toward the front along the bottom
  for (const xw of xs) { sh.lineTo(xw - ar, S.yb); sh.lineTo(xw - ar, S.R); sh.absarc(xw, S.R, ar, Math.PI, 0, true); sh.lineTo(xw + ar, S.yb); }
  sh.lineTo(f[0], S.yb); sh.closePath(); return sh;
}
function extrudeX(shape, width, bev, lenL, top, mirrorUV) {   // extrude along z (width), centred, then rotate so x (length) -> +z
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(width - 2 * bev) / 2);
  if (mirrorUV) { const p = g.attributes.position, uv = g.attributes.uv, gr = g.groups[0]; for (let i = gr.start; i < gr.start + gr.count; i++) { const x = p.getX(i), y = p.getY(i), u = (lenL / 2 - x) / lenL; uv.setXY(i, p.getZ(i) > 0 ? 1 - u : u, y / top); } }
  g.rotateY(-Math.PI / 2); return g;
}
function polyShape(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); s.closePath(); return s; }
function wheelGeo(R, w) {
  const tyre = new THREE.CylinderGeometry(R, R, w, 28); tyre.rotateZ(Math.PI / 2);
  const side = new THREE.TorusGeometry(R * 0.86, w * 0.16, 8, 28); side.rotateY(Math.PI / 2); const side2 = side.clone(); side.translate(w / 2 - 0.02, 0, 0); side2.translate(-w / 2 + 0.02, 0, 0);
  const parts = [];
  for (const s of [-1, 1]) { const d = new THREE.CylinderGeometry(R * 0.6, R * 0.64, 0.05, 28); d.rotateZ(Math.PI / 2); d.translate(s * (w / 2 + 0.01), 0, 0); parts.push(d);
    const hub = new THREE.SphereGeometry(R * 0.2, 14, 8); hub.scale(0.4, 1, 1); hub.translate(s * (w / 2 + 0.035), 0, 0); parts.push(hub); }
  return mergeG([mergeGeometries([tyre, side, side2].map(NI)), mergeGeometries(parts.map(NI))]);
}
const RB = (w, h, d, r = 0.04) => NI(new RoundedBoxGeometry(w, h, d, 2, r));

// inset a convex polygon (CCW) by d, and clip it to x-ranges (for side windows split by the B-pillar)
function insetPoly(P, d) { const n = P.length, L = [];
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * d, ny = dx / l * d; L.push([[a[0] + nx, a[1] + ny], [dx, dy]]); }
  return L.map((_, i) => { const [p1, d1] = L[(i + n - 1) % n], [p2, d2] = L[i]; const den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) return p2; const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den; return [p1[0] + d1[0] * t, p1[1] + d1[1] * t]; }); }
function clipX(P, x0, x1) { let out = P; for (const [lim, sgn] of [[x0, 1], [x1, -1]]) { const inp = out; out = []; for (let i = 0; i < inp.length; i++) { const a = inp[i], b = inp[(i + 1) % inp.length], ia = sgn * (a[0] - lim) >= 0, ib = sgn * (b[0] - lim) >= 0;
  if (ia) out.push(a); if (ia !== ib) { const t = (lim - a[0]) / (b[0] - a[0]); out.push([lim, a[1] + (b[1] - a[1]) * t]); } } if (out.length < 3) return null; } return out; }
// a flat quad along a profile edge a->b (windscreen / rear screen), offset outward, spanning +-hw across
function edgeQuad(a, b, inset, off, hw) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), tx = dx / l, ty = dy / l, ox = ty * off, oy = -tx * off;
  const p = [[a[0] + tx * inset + ox, a[1] + ty * inset + oy], [b[0] - tx * inset + ox, b[1] - ty * inset + oy]];
  const v = [p[0][0], p[0][1], -hw, p[1][0], p[1][1], -hw, p[1][0], p[1][1], hw, p[0][0], p[0][1], -hw, p[1][0], p[1][1], hw, p[0][0], p[0][1], hw];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); g.rotateY(-Math.PI / 2); return NI(g); }
const GLASSP = STD(0x22303c, { metalness: 0.2, roughness: 0.08, envMapIntensity: 1.8, side: THREE.DoubleSide });
export { GLASSP };

// cached per kind: { body, cabin (body colour), windows, trim, head, tail, ind, plate, wheel, wheels }
const GEO = new Map();
// the body with the cabin opened up (used for the first-person interior): the top drops to a floor between the windscreen and the rear screen
const interpY = (up, x) => { for (let i = 0; i < up.length - 1; i++) { const a = up[i], b = up[i + 1]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return up[0][1]; };
const CBG = new Map();
export function cabinBodyGeo(kind) {
  if (CBG.has(kind)) return CBG.get(kind);
  const S = SPECS[kind], x0 = S.gh[0][0] + 0.03, x1 = S.gh[S.gh.length - 1][0] - 0.03, fy = S.yb + 0.28, up = [];
  for (let i = 0; i < S.up.length; i++) { const p = S.up[i]; if (p[0] < x0 && p[0] > x1) continue; up.push(p);
    if (p[0] >= x0 && i + 1 < S.up.length && S.up[i + 1][0] < x0) up.push([x0, interpY(S.up, x0)], [x0, fy], [x1, fy], [x1, interpY(S.up, x1)]); }
  const top = Math.max(...S.up.map(p => p[1])) + 0.02; const g = extrudeX(bodyShape({ ...S, up }), S.W, 0.05, S.L, top, false); const r = { g, fy }; CBG.set(kind, r); return r;
}
export function carGeo(kind) {
  if (GEO.has(kind)) return GEO.get(kind);
  const S = SPECS[kind], top = Math.max(...S.up.map(p => p[1])) + 0.02, W = S.W, Wg = W - 0.2, bev = 0.05;
  const body = extrudeX(bodyShape(S), W, bev, S.L, top, true);
  const ghTop = Math.max(...S.gh.map(p => p[1])) + bev;
  const cabin = extrudeX(polyShape(S.gh), Wg, bev, S.L, 2, false);
  // windows set into the body-coloured cabin: side panes split by the B-pillar, windscreen, rear screen
  const inner = insetPoly(S.gh, 0.075), bx = S.doors[1] ?? -9, win = [];
  for (const P of [clipX(inner, bx + 0.05, 99), clipX(inner, -99, bx - 0.05)]) { if (!P) continue;
    for (const s of [-1, 1]) { const g = new THREE.ShapeGeometry(polyShape(P)); g.translate(0, 0, s * (Wg / 2 + 0.006)); g.rotateY(-Math.PI / 2); win.push(NI(g)); } }
  win.push(edgeQuad(S.gh[0], S.gh[1], 0.06, bev + 0.006, Wg / 2 - 0.1)); win.push(edgeQuad(S.gh[2], S.gh[3], 0.06, bev + 0.006, Wg / 2 - 0.1));
  const windows = mergeGeometries(win);
  // front & rear: black grille, wide black bumpers, boxy headlights, indicators, mirrors on the doors
  const fx = S.up[0][0], rx = S.up[S.up.length - 1][0], hf = S.up[2][1], hy = hf - 0.13, ty = S.up[S.up.length - 3][1] - 0.12;
  const t = [RB(W * 0.46, 0.2, 0.08, 0.02).translate(0, hy, fx + 0.02),
    RB(W + 0.06, 0.17, 0.2, 0.03).translate(0, S.yb + 0.1, fx + 0.04), RB(W + 0.06, 0.17, 0.2, 0.03).translate(0, S.yb + 0.1, rx - 0.04)];
  for (const s of [-1, 1]) { t.push(RB(0.06, 0.12, 0.17, 0.02).translate(s * (W / 2 + 0.07), S.gh[0][1] + 0.08, S.gh[0][0] - 0.16)); t.push(RB(0.06, 0.04, 0.05, 0.01).translate(s * (W / 2 + 0.03), S.gh[0][1] + 0.02, S.gh[0][0] - 0.12)); }
  const trim = mergeGeometries(t);
  const head = mergeGeometries([-1, 1].map(s => RB(0.4, 0.24, 0.1, 0.03).translate(s * (W / 2 - 0.28), hy, fx + 0.02)));
  const tail = mergeGeometries([-1, 1].map(s => RB(0.44, 0.16, 0.08, 0.02).translate(s * (W / 2 - 0.28), ty, rx - 0.01)));
  const ind = mergeGeometries([-1, 1].map(s => RB(0.18, 0.07, 0.06, 0.01).translate(s * (W / 2 - 0.27), hy - 0.15, fx + 0.03)));
  const plate = mergeGeometries([RB(0.5, 0.12, 0.03, 0.01).translate(0, S.yb + 0.1, fx + 0.15), RB(0.5, 0.12, 0.03, 0.01).translate(0, S.yb + 0.28, rx - 0.04)]);
  const wheels = S.wx.flatMap(x => [-1, 1].map(s => [s * (W / 2 - 0.12), S.R, x]));
  const res = { S, top, ghTop, body, cabin, windows, trim, head, tail, ind, plate, wheel: wheelGeo(S.R, 0.25), wheels };
  GEO.set(kind, res); return res;
}

// ---------- light bars ----------
const BARC = { rb: [0xff1530, 0x1f5bff], bb: [0x1f5bff, 0x1f5bff], rr: [0xff1530, 0xff1530], ab: [0xffa000, 0x1f5bff] };
export const LIGHTBAR = { usa: 'rb', mex: 'rb', esp: 'bb', esp_gc: 'bb', fra: 'bb', fra_g: 'bb', uk: 'bb', ger: 'bb', uae: 'rb', ind: 'rb', chn: 'rb', swat: 'rb', jpn: 'rr', fbi: 'rb', army: null };
function addBar(g, y, z, W, type, flash) {
  const [c1, c2] = BARC[type];
  const base = new THREE.Mesh(NI(new RoundedBoxGeometry(W * 0.72, 0.09, 0.3, 2, 0.03)), TRIM); base.position.set(0, y, z); g.add(base);
  const lights = [];
  for (const s of [-1, 1]) { const c = s < 0 ? c1 : c2; const m = STD(c, { emissive: c, emissiveIntensity: 0.3, roughness: 0.25, transparent: false });
    const l = new THREE.Mesh(NI(new RoundedBoxGeometry(W * 0.33, 0.1, 0.26, 2, 0.04)), m); l.position.set(s * W * 0.18, y + 0.06, z); g.add(l);
    const gl = glow(c, 2.4, 0); gl.position.set(s * W * 0.2, y + 0.1, z); g.add(gl); lights.push({ m, gl, s }); }
  flash.push(...lights);
}

// ---------- public: build a vehicle ----------
// opts: { color, livery, police, phase }
export function makeCar(kind, opts = {}) {
  const G = carGeo(kind), S = G.S, g = new THREE.Group(); const col = opts.color || '#c62828';
  const pm = paint(opts.livery ? (opts.body || col) : col);
  const sm = opts.livery ? STD(0xffffff, { map: sideTex(kind, opts.livery, opts.body || col), metalness: 0.12, roughness: 0.42 }) : paint(col);
  const add = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = false; g.add(m); return m; };
  add(G.body, [sm, pm]); add(G.cabin, paint(opts.roof || opts.body || col)); add(G.windows, GLASSP, false);
  add(G.trim, TRIM); add(G.head, HEADM, false); add(G.tail, TAILM, false); add(G.ind, INDM, false); add(G.plate, PLATE, false);
  const wheels = G.wheels.map(([x, y, z]) => { const w = new THREE.Mesh(G.wheel, [TYRE, opts.dark ? RIMD : RIM]); w.position.set(x, y, z); w.castShadow = true; g.add(w); return w; });
  const flash = [];
  if (opts.police && LIGHTBAR[opts.livery]) addBar(g, G.ghTop + 0.08, (S.gh[1][0] + S.gh[2][0]) / 2, S.W, LIGHTBAR[opts.livery], flash);
  if (opts.livery === 'taxi') { const s = new THREE.Mesh(RB(0.6, 0.18, 0.25, 0.03), STD(0xfff6c0, { emissive: 0xffe680, emissiveIntensity: 0.4 })); s.position.set(0, G.ghTop + 0.12, (S.gh[1][0] + S.gh[2][0]) / 2); g.add(s); }
  return { g, wheels, flash, L: S.L, W: S.W, R: S.R, H: G.top, kind, phase: opts.phase ?? 0 };
}

// boxy bodies: buses, trucks, military, tuk-tuk
function boxyTex(kind, col, lv) {
  return cached('bx' + kind + col + lv, () => canvasTex(1024, 256, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h);
    const win = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#182430'); g.addColorStop(0.5, '#5d7891'); g.addColorStop(1, '#141c25'); c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0); };
    if (kind === 'bus') { for (let i = 0; i < 7; i++) win(70 + i * 130, 40, 180 + i * 130, 130); c.fillStyle = '#f5f5f5'; c.fillRect(0, 150, w, 14); }
    if (kind === 'ddbus') { for (let i = 0; i < 7; i++) { win(60 + i * 132, 22, 178 + i * 132, 92); win(60 + i * 132, 132, 178 + i * 132, 196); } c.fillStyle = '#f2d200'; c.font = '900 30px Poppins'; c.fillText('LONDON', 420, 120); }
    if (kind === 'truck') { c.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 20; i++) c.fillRect(i * 52, 0, 4, h); c.fillStyle = '#fff'; c.font = '900 64px Poppins'; c.textAlign = 'center'; c.fillText(lv || 'CARGO', 512, 150); }
    if (kind === 'armored') { c.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 6; i++) c.fillRect(100 + i * 150, 60, 110, 8); c.fillStyle = lv === 'police' ? '#fff' : '#d8d3b0'; c.font = '900 56px Poppins'; c.textAlign = 'center'; c.fillText(lv === 'police' ? 'POLICE' : (lv || ''), 512, 170); }
    for (let i = 0; i < 2000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.04)'; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  }, true, false));
}
function sideBox(L, H, W, y0, mat, top) { const g = NI(new RoundedBoxGeometry(W, H, L, 3, 0.12)); g.translate(0, y0 + H / 2, 0);
  // uv: side faces get length/height mapping
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const u = (L / 2 - p.getZ(i)) / L; uv.setXY(i, n.getX(i) > 0 ? 1 - u : u, (p.getY(i) - y0) / H); }
  return g; }
export function makeBoxy(kind, opts = {}) {
  const g = new THREE.Group(), col = opts.color || '#e53935', flash = [], wheels = [];
  const add = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, typeof mat === 'number' || typeof mat === 'string' ? paint(mat) : mat); m.position.set(x, y, z); m.castShadow = cast; g.add(m); return m; };
  const wheel = (R, w, x, z, cnt = 1) => { const geo = wheelGeo(R, w); for (const s of [-1, 1]) { const m = new THREE.Mesh(geo, [TYRE, opts.military ? RIMD : RIM]); m.position.set(s * x, R, z); m.castShadow = true; g.add(m); wheels.push(m); } };
  let L = 4, W = 2, H = 2, R = 0.5;
  if (kind === 'bus' || kind === 'ddbus') { L = kind === 'bus' ? 11 : 10.5; W = 2.55; H = kind === 'bus' ? 3.0 : 4.3; R = 0.5;
    const m = STD(0xffffff, { map: boxyTex(kind, col), roughness: 0.4, metalness: 0.2 }); add(sideBox(L, H - 0.35, W, 0.35, m), m);
    add(RB(W - 0.2, H * 0.42, 0.06, 0.03), GLASS, 0, H * 0.55, L / 2 + 0.02, false); add(RB(W - 0.1, 0.16, 0.1), TRIM, 0, 0.45, L / 2 + 0.01);
    add(RB(0.5, 0.14, 0.06), HEADM, -0.85, 0.75, L / 2 + 0.03, false); add(RB(0.5, 0.14, 0.06), HEADM, 0.85, 0.75, L / 2 + 0.03, false); add(RB(0.3, 0.3, 0.06), TAILM, -1.0, 1.0, -L / 2 - 0.03, false); add(RB(0.3, 0.3, 0.06), TAILM, 1.0, 1.0, -L / 2 - 0.03, false);
    wheel(R, 0.32, W / 2 - 0.25, L / 2 - 2.2); wheel(R, 0.32, W / 2 - 0.25, -L / 2 + 2.6); }
  if (kind === 'truck') { L = 8.5; W = 2.5; H = 3.6; R = 0.55;
    add(sideBox(2.3, 2.3, W, 0.6, paint(col)), paint(col), 0, 0, L / 2 - 1.15); add(RB(W - 0.25, 0.9, 0.06), GLASS, 0, 2.2, L / 2 + 0.01, false);
    const m = STD(0xffffff, { map: boxyTex('truck', opts.box || '#eceff1', opts.text), roughness: 0.6 }); add(sideBox(6.0, 2.8, W, 0.8, m), m, 0, 0, -1.2);
    add(RB(0.4, 0.2, 0.06), HEADM, -0.85, 1.0, L / 2 + 0.01, false); add(RB(0.4, 0.2, 0.06), HEADM, 0.85, 1.0, L / 2 + 0.01, false);
    wheel(R, 0.34, W / 2 - 0.3, L / 2 - 1.3); wheel(R, 0.34, W / 2 - 0.3, -L / 2 + 1.6); wheel(R, 0.34, W / 2 - 0.3, -L / 2 + 2.8); }
  if (kind === 'armored') { L = 6.8; W = 2.7; H = 2.6; R = 0.6; const c = opts.color || '#4b5320';
    const m = STD(0xffffff, { map: boxyTex('armored', c, opts.text), roughness: 0.75 });
    const hull = new THREE.Shape(); hull.moveTo(3.4, 0.7); hull.lineTo(3.4, 1.4); hull.lineTo(2.5, 2.3); hull.lineTo(-3.3, 2.4); hull.lineTo(-3.4, 0.7); hull.closePath();
    add(extrudeX(hull, W, 0.08, L, 2.4, true), [m, paint(c)]); add(RB(1.0, 0.5, 1.2, 0.1), paint(c), 0, 2.6, -0.4); add(RB(0.12, 0.12, 1.5, 0.03), TRIM, 0, 2.7, 0.6);
    add(RB(W * 0.6, 0.4, 0.05), GLASS, 0, 1.75, 2.95, false); add(RB(0.3, 0.12, 0.06), HEADM, -0.9, 1.2, 3.42, false); add(RB(0.3, 0.12, 0.06), HEADM, 0.9, 1.2, 3.42, false);
    for (const z of [2.2, 0.7, -0.8, -2.3]) wheel(R, 0.42, W / 2 - 0.2, z);
    if (opts.police) addBar(g, 2.45, 1.0, W * 0.8, 'rb', flash); }
  if (kind === 'tank') { L = 7.5; W = 3.5; H = 2.5; R = 0.4; const c = opts.color || '#556b2f';
    const hull = new THREE.Shape(); hull.moveTo(3.8, 0.6); hull.lineTo(3.2, 1.6); hull.lineTo(-3.6, 1.65); hull.lineTo(-3.8, 0.7); hull.lineTo(-3.4, 0.35); hull.lineTo(3.4, 0.35); hull.closePath();
    add(extrudeX(hull, W * 0.82, 0.06, L, 1.7, false), paint(c));
    const tr = STD(0x2a2a26, { roughness: 0.9, map: canvasTex(64, 64, (x) => { x.fillStyle = '#2b2b27'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#1a1a17'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 8, 64, 4); }) }); tr.map.repeat.set(1, 12);
    for (const s of [-1, 1]) { add(RB(0.65, 0.95, L - 0.2, 0.35), tr, s * (W / 2 - 0.33), 0.5, 0); add(RB(0.75, 0.08, L - 0.3, 0.02), paint(c), s * (W / 2 - 0.33), 1.05, 0); }
    const tur = new THREE.Group(); tur.position.set(0, 1.65, -0.3); g.add(tur); const tm = new THREE.Mesh(RB(2.4, 0.75, 3.0, 0.2), paint(c)); tm.position.y = 0.37; tm.castShadow = true; tur.add(tm);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.2, 12).rotateX(Math.PI / 2), paint(c)); gun.position.set(0, 0.42, 3.4); gun.castShadow = true; tur.add(gun); g.userData.turret = tur; }
  if (kind === 'tuk') { L = 2.75; W = 1.35; H = 1.8; R = 0.24; const c = opts.color || '#2e7d32', c2 = opts.color2 || '#fdd835';
    add(RB(W, 0.55, 1.6, 0.12), paint(c2), 0, 0.55, -0.45); add(RB(0.9, 0.7, 0.9, 0.2), paint(c2), 0, 0.68, 0.8); add(RB(W + 0.05, 0.08, 2.3, 0.04), paint(c), 0, 1.78, 0.05);
    add(RB(1.0, 0.55, 0.04, 0.03), GLASS, 0, 1.35, 0.95, false); for (const s of [-1, 1]) { add(RB(0.05, 0.85, 0.05), TRIM, s * 0.55, 1.35, 1.0); add(RB(0.05, 0.85, 0.05), TRIM, s * 0.62, 1.35, -1.1); }
    add(RB(0.22, 0.12, 0.06), HEADM, 0, 0.98, 1.27, false);
    const geo = wheelGeo(R, 0.16); const f = new THREE.Mesh(geo, [TYRE, RIM]); f.position.set(0, R, 1.05); g.add(f); wheels.push(f); for (const s of [-1, 1]) { const m = new THREE.Mesh(geo, [TYRE, RIM]); m.position.set(s * 0.6, R, -0.8); g.add(m); wheels.push(m); } }
  if (kind === 'moto') { L = 2.1; W = 0.8; H = 1.2; R = 0.31; const c = opts.color || '#e8261c';
    const geo = wheelGeo(R, 0.16); for (const z of [0.72, -0.72]) { const m = new THREE.Mesh(geo, [TYRE, RIMD]); m.position.set(0, R, z); m.castShadow = true; g.add(m); wheels.push(m); }
    add(RB(0.3, 0.22, 0.5, 0.08), paint(c), 0, 0.88, 0.2); add(RB(0.26, 0.1, 0.55, 0.04), TRIM, 0, 0.86, -0.32); add(RB(0.22, 0.3, 0.5, 0.05), TRIM, 0, 0.55, 0.0); add(RB(0.32, 0.32, 0.6, 0.12), paint(c), 0, 0.75, -0.55);
    for (const sd of [-1, 1]) add(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8), CHROME, sd * 0.09, 0.66, 0.85).rotation.x = -0.45;
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.68, 8).rotateZ(Math.PI / 2), TRIM, 0, 1.05, 0.62); add(RB(0.14, 0.12, 0.08, 0.03), HEADM, 0, 0.95, 0.9, false); add(RB(0.12, 0.06, 0.05, 0.02), TAILM, 0, 0.82, -0.88, false);
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 10).rotateX(Math.PI / 2), CHROME, 0.18, 0.38, -0.45); }
  return { g, wheels, flash, L, W, R, H, kind };
}

// ---------- aircraft ----------
function lathe(prof, seg = 24) { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.rotateX(Math.PI / 2); return NI(g); }   // axis along +z
export function makeAircraft(kind, opts = {}) {
  const g = new THREE.Group(), body = paint(opts.color || '#f4f6f8'), acc = paint(opts.accent || '#1e4fb8'), rotors = [];
  const add = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; g.add(m); return m; };
  const wing = (span, root, tip, sweep, th, y, z, dih = 0) => { const s = new THREE.Shape(); s.moveTo(0, root / 2); s.lineTo(span, root / 2 - sweep); s.lineTo(span, root / 2 - sweep - tip); s.lineTo(0, -root / 2); s.closePath();
    const a = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: th * 0.3, bevelSize: th * 0.3, bevelSegments: 2 }); a.rotateX(Math.PI / 2); a.translate(0, y + th / 2, z); const b = a.clone(); b.scale(-1, 1, 1);
    if (dih) { a.rotateZ(dih); b.rotateZ(-dih); } return mergeGeometries([NI(a), NI(b)]); };
  let L = 10, gearY = 0;
  if (kind === 'jet' || kind === 'airliner') { const k = kind === 'jet' ? 1 : 2.1; L = 20 * k; const r = 1.05 * k;
    const prof = [[0.02, 10 * k], [0.45 * k, 9.6 * k], [0.8 * k, 8.9 * k], [r, 7.8 * k], [r, -4 * k], [0.75 * k, -7.5 * k], [0.25 * k, -10 * k], [0.02, -10.1 * k]];
    gearY = 1.0 * k + (kind === 'airliner' ? 1.2 : 0.4);
    add(lathe(prof), body, 0, gearY, 0); add(RB(1.3 * k, 0.32 * k, 0.6 * k, 0.1), GLASS, 0, gearY + 0.45 * k, 8.75 * k, false);
    add(RB(0.08, 0.32 * k, 7 * k, 0.03), GLASS, r - 0.02, gearY + 0.25 * k, 1 * k, false); add(RB(0.08, 0.32 * k, 7 * k, 0.03), GLASS, -r + 0.02, gearY + 0.25 * k, 1 * k, false);
    add(wing(kind === 'jet' ? 7 : 16, 3.2 * k, 1.1 * k, 2.4 * k, 0.22 * k, gearY - 0.45 * k, -0.5 * k, 0.06), body);
    add(wing(3.2 * k, 1.8 * k, 0.8 * k, 1.4 * k, 0.12 * k, gearY + 0.3 * k, -8.4 * k), body);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(3.0 * k, 0); fin.lineTo(1.4 * k, 3.4 * k); fin.lineTo(0.6 * k, 3.4 * k); fin.closePath(); const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.18 * k, bevelEnabled: false }); fg.translate(0, 0, -0.09 * k); fg.rotateY(Math.PI / 2); add(NI(fg), acc, 0, gearY + 0.6 * k, -6.8 * k);
    add(RB(0.08, 0.5 * k, 34 * k * 0.55, 0.02), acc, r - 0.02, gearY - 0.2 * k, 0, false); add(RB(0.08, 0.5 * k, 34 * k * 0.55, 0.02), acc, -r + 0.02, gearY - 0.2 * k, 0, false);
    const eng = lathe([[0.02, 1.4], [0.55, 1.3], [0.62, 0.6], [0.6, -1.0], [0.4, -1.5], [0.02, -1.5]]);
    if (kind === 'jet') for (const s of [-1, 1]) { const e = add(eng.clone(), body, s * 1.6, gearY + 0.45, -5.5); }
    else for (const s of [-1, 1]) { const e = add(eng.clone().scale(1.9, 1.9, 1.9), body, s * 7.5, gearY - 1.6, 1.8); }
    for (const z of [7 * k, -1 * k]) for (const s of (z > 0 ? [0] : [-1, 1])) { add(new THREE.CylinderGeometry(0.06, 0.06, gearY, 6), TRIM, s * 1.6 * k, gearY / 2, z, false); const w = wheelGeo(0.4 * k, 0.3 * k); add(w, [TYRE, RIM], s * 1.6 * k, 0.4 * k, z); }
    if (opts.door) { const st = new THREE.Group(); for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(RB(0.9, 0.08, 0.32), paint('#d6d9de')); m.position.set(0, (i + 0.5) * gearY / 8 + 0.3, -i * 0.3); st.add(m); } st.position.set(-r - 0.6, 0, 6.2 * k); st.rotation.y = Math.PI / 2; g.add(st); add(RB(0.06, 1.7, 0.9), TRIM, -r + 0.01, gearY + 0.3, 6.6 * k, false); }
  }
  if (kind === 'twinprop') { L = 17; gearY = 1.5; const red = paint(opts.color || '#e8452c');
    const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24, z = 8.6 - u * 17.2; let r = 1.25;
      if (z > 5.2) r = 1.25 * Math.sqrt(Math.max(0, 1 - Math.pow((z - 5.2) / 3.45, 2))); if (z < -3.5) r = lerp2(1.25, 0.32, Math.pow((-3.5 - z) / 5.1, 1.4)); prof.push([Math.max(0.02, r), z]); }
    const fg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40); fg.rotateX(Math.PI / 2); const fuse = NI(fg);
    { const p = fuse.attributes.position, uv = fuse.attributes.uv; for (let i = 0; i < p.count; i++) { let a = Math.atan2(p.getX(i), -p.getY(i)) / TAU; if (a < 0) a += 1; uv.setXY(i, (p.getZ(i) + 8.6) / 17.2, a); } }
    const ft = cached('twinprop' + (opts.color || ''), () => canvasTex(1024, 512, (c, w, h) => { c.fillStyle = opts.color || '#e8452c'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fbfbf8'; c.fillRect(0, h * 0.27, w * 0.83, h * 0.46); c.fillStyle = '#fbfbf8'; c.beginPath(); c.ellipse(w * 0.83, h * 0.5, w * 0.06, h * 0.19, 0, 0, TAU); c.fill();
      for (const a of [0.33, 0.67]) { for (let k = 0; k < 13; k++) { c.fillStyle = '#26324a'; c.beginPath(); c.roundRect(w * (0.22 + k * 0.042), h * a - 14, 22, 28, 8); c.fill(); } }
      c.fillStyle = '#1d2a44'; c.beginPath(); c.roundRect(w * 0.885, h * 0.40, 40, h * 0.2, 10); c.fill(); for (const a of [0.36, 0.64]) { c.beginPath(); c.roundRect(w * 0.875, h * a - 18, 46, 30, 8); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, h * 0.265, w * 0.8, 4); c.fillRect(0, h * 0.73, w * 0.8, 4); }, true, false));
    add(fuse, STD(0xffffff, { map: ft, roughness: 0.45, metalness: 0.08 }), 0, gearY + 0.6, 0);
    const wingG = (span, root, tip, sweep, th) => { const s = new THREE.Shape(); s.moveTo(0, root / 2); s.lineTo(span, root / 2 - sweep); s.lineTo(span, root / 2 - sweep - tip); s.lineTo(0, -root / 2); s.closePath();
      const a = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: th * 0.45, bevelSize: th * 0.45, bevelSegments: 3 }); a.rotateX(Math.PI / 2); a.translate(0, th / 2, 0); const b = a.clone(); b.scale(-1, 1, 1); return mergeGeometries([NI(a), NI(b)]); };
    const wgm = add(wingG(8.5, 3.0, 1.5, 0.6, 0.22), red, 0, gearY + 0.05, 0.8); 
    add(wingG(3.0, 1.9, 0.9, 0.5, 0.12), red, 0, gearY + 1.0, -7.0);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.6, 0); fin.quadraticCurveTo(1.3, 1.6, 0.9, 3.0); fin.lineTo(0.3, 3.0); fin.closePath();
    const fgg = new THREE.ExtrudeGeometry(fin, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }); fgg.translate(0, 0, -0.08); fgg.rotateY(Math.PI / 2); add(NI(fgg), red, 0, gearY + 1.4, -6.3);
    const nac = lathe([[0.02, 2.1], [0.45, 1.9], [0.62, 1.2], [0.6, -0.8], [0.35, -2.2], [0.02, -2.3]]);
    for (const s of [-1, 1]) { add(nac.clone(), red, s * 3.1, gearY + 0.15, 1.6);
      const spin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8).scale(1, 1, 1.4), TRIM); spin.position.set(s * 3.1, gearY + 0.15, 3.75); g.add(spin);
      const pr = new THREE.Group(); pr.position.set(s * 3.1, gearY + 0.15, 3.8); for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(RB(0.16, 1.3, 0.05, 0.02), TRIM); bl.position.y = 0.65; const h = new THREE.Group(); h.rotation.z = i * TAU / 3; h.add(bl); pr.add(h); } g.add(pr); rotors.push(pr);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); disc.position.set(s * 3.1, gearY + 0.15, 3.82); g.add(disc); }
    for (const [x, z] of [[0, 6.2], [-3.1, 1.2], [3.1, 1.2]]) { add(new THREE.CylinderGeometry(0.07, 0.07, gearY, 8), TRIM, x, gearY / 2 + 0.2, z, false); add(wheelGeo(0.42, 0.28), [TYRE, RIM], x, 0.42, z); }
    if (opts.door) { const st = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(RB(0.9, 0.08, 0.32), paint('#d6d9de')); m.position.set(0, (i + 0.5) * 0.3 + 0.05, -i * 0.3); st.add(m); } st.position.set(-1.9, 0, 4.4); st.rotation.y = Math.PI / 2; g.add(st); add(RB(0.06, 1.6, 0.85), TRIM, -1.2, gearY + 0.75, 4.4, false); }
  }
  if (kind === 'prop') { L = 8.3; gearY = 0.5;
    add(lathe([[0.02, 4.1], [0.45, 3.8], [0.6, 2.8], [0.65, 0.5], [0.5, -1.0], [0.18, -4.0], [0.02, -4.2]]), body, 0, 1.1, 0);
    add(RB(1.1, 0.55, 1.6, 0.15), GLASS, 0, 1.75, 1.0, false);
    add(wing(5.5, 1.6, 1.1, 0.1, 0.12, 2.1, 0.8), body); add(wing(1.8, 1.0, 0.6, 0.3, 0.08, 1.2, -3.6), body);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(1.4, 0); fin.lineTo(0.5, 1.4); fin.lineTo(0, 1.4); fin.closePath(); const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false }); fg.translate(0, 0, -0.04); fg.rotateY(Math.PI / 2); add(NI(fg), acc, 0, 1.4, -3.0);
    add(RB(0.1, 0.25, 6.5, 0.02), acc, 0.62, 1.05, 0.2, false); add(RB(0.1, 0.25, 6.5, 0.02), acc, -0.62, 1.05, 0.2, false);
    for (const s of [-1, 1]) add(RB(0.06, 1.2, 0.08), TRIM, s * 1.4, 1.55, 0.9).rotation.z = s * 0.7;
    const prop = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); prop.position.set(0, 1.1, 4.2); g.add(prop);
    for (const [x, z] of [[0, 3.2], [-1.0, 0.2], [1.0, 0.2]]) { add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), TRIM, x, 0.6, z, false); add(wheelGeo(0.25, 0.14), [TYRE, RIM], x, 0.25, z); }
  }
  if (kind === 'heli' || kind === 'milheli') { L = 12; const mil = kind === 'milheli';
    const bm = mil ? paint(opts.color || '#3f4a2c') : body;
    add(lathe([[0.02, 2.4], [0.7, 2.1], [1.05, 1.2], [1.1, -0.6], [0.8, -1.8], [0.35, -2.4], [0.02, -2.5]]), bm, 0, 1.5, 0);
    add(RB(1.6, 1.0, 1.4, 0.4), GLASS, 0, 1.85, 1.6, false);
    add(lathe([[0.32, 0], [0.18, -6.2], [0.02, -6.3]]), bm, 0, 1.75, -1.8);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(1.0, 0); fin.lineTo(0.4, 1.3); fin.lineTo(0, 1.3); fin.closePath(); const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false }); fg.translate(0, 0, -0.04); fg.rotateY(Math.PI / 2); add(NI(fg), mil ? bm : acc, 0, 1.75, -7.6);
    if (!mil) add(RB(2.25, 0.28, 3.0, 0.1), acc, 0, 1.25, -0.2, false);
    else for (const s of [-1, 1]) { add(RB(1.6, 0.12, 0.6, 0.03), bm, s * 1.5, 1.4, 0); add(new THREE.CylinderGeometry(0.17, 0.17, 1.4, 10).rotateX(Math.PI / 2), TRIM, s * 1.9, 1.2, 0.1); }
    for (const s of [-1, 1]) { add(RB(0.08, 0.08, 3.2, 0.03), TRIM, s * 0.95, 0.12, 0.3); add(RB(0.06, 0.55, 0.06, 0.02), TRIM, s * 0.85, 0.4, 1.0); add(RB(0.06, 0.55, 0.06, 0.02), TRIM, s * 0.85, 0.4, -0.6); }
    add(new THREE.CylinderGeometry(0.15, 0.2, 0.5, 10), TRIM, 0, 2.75, 0);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(5.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x15171a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); disc.position.set(0, 3.0, 0); g.add(disc);
    const blades = new THREE.Group(); blades.position.set(0, 3.02, 0); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(RB(0.32, 0.04, 5.5, 0.015), TRIM); b.position.z = 2.75; const h = new THREE.Group(); h.rotation.y = i * TAU / 4; h.add(b); blades.add(h); } g.add(blades);
    const tr = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ color: 0x15171a, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })); tr.rotation.y = Math.PI / 2; tr.position.set(0.22, 2.3, -7.6); g.add(tr);
    rotors.push(blades);
    if (opts.police) { const fl = []; addBar(g, 0.95, 1.6, 0.9, 'rb', fl); g.userData.flash = fl; }
    if (opts.searchlight) { const sl = glow(0xfff4d0, 3, 0.9); sl.position.set(0, 0.9, 2.2); g.add(sl); }
  }
  if (kind === 'fighter') { L = 17; gearY = 1.4; const m = paint(opts.color || '#8a929b');
    add(lathe([[0.02, 8.5], [0.35, 7.6], [0.75, 5.8], [0.95, 3.5], [1.05, 0], [1.0, -5.5], [0.75, -8.2], [0.02, -8.3]]), m, 0, gearY, 0);
    add(lathe([[0.02, 1.4], [0.42, 0.9], [0.5, -0.4], [0.35, -1.6], [0.02, -1.7]]).scale(1, 1.1, 1), STD(0x2a2414, { metalness: 0.95, roughness: 0.05, envMapIntensity: 1.8 }), 0, gearY + 0.75, 4.6, false);
    add(wing(5.2, 7.5, 1.4, 5.2, 0.14, gearY - 0.1, -2.0), m); add(wing(2.6, 2.4, 0.8, 1.6, 0.08, gearY, -7.0), m);
    for (const s of [-1, 1]) { const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.6, 0); fin.lineTo(1.4, 2.6); fin.lineTo(0.6, 2.6); fin.closePath(); const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.1, bevelEnabled: false }); fg.translate(0, 0, -0.05); fg.rotateY(Math.PI / 2); fg.rotateZ(s * 0.35); add(NI(fg), m, s * 0.9, gearY + 0.6, -5.5); }
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.5, 0.55, 0.6, 16).rotateX(Math.PI / 2), TRIM, s * 0.55, gearY - 0.1, -8.4);
    const ab = glow(0xff9a40, 3.5, 0); ab.position.set(0, gearY - 0.1, -9); g.add(ab); g.userData.burner = ab;
  }
  return { g, rotors, L, kind, gearY };
}
