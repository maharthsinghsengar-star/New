// Cartoon characters in an outlined 2D style (big round eyes, flat colours + one cel shadow, thick ink lines).
// Same API as people.js: drawPerson(ctx, spec, state, t) with feet at the canvas bottom centre.
export const CW = 760, CH = 1700;
const TAU = Math.PI * 2, INK = '#17111f';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function hexk(c, k) { const n = parseInt(c.slice(1), 16); const f = v => clamp(Math.round(v * k), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

export const SPECS = {
  J: { H: 1430, male: true, girth: 1.12, skin: '#c9844e', hair: '#1b1210', kurta: '#ff9a1f', jacket: '#c2185b', trim: '#ffd23f', pyjama: '#f6f0e4', shoe: '#6d3a1a', beard: true, hairStyle: 'side' },
  R: { H: 1450, male: true, girth: 1.0, skin: '#e8ad80', hair: '#1b1210', kurta: '#12a4b8', placket: '#ffd23f', pyjama: '#f6f0e4', shoe: '#5b3420', hairStyle: 'puff' },
  W: { H: 1380, male: false, girth: 0.92, skin: '#e6a87e', hair: '#1b1210', saree: '#ff2d7a', border: '#ffd23f', blouse: '#ffd23f', lips: '#d8264a', hairStyle: 'bun' },
};
export function defaultState() {
  return { yaw: 0, tilt: 0, lean: 0, breathe: 0, bob: 0, walk: -1, brow: 0, smile: 0.3, open: 1, mouth: 0, lookX: 0, lookY: 0,
    armL: [0.1, 0.2, 'relax'], armR: [0.1, 0.2, 'relax'], prop: null, shoulderUp: 0 };
}

let LW = 9;
function ink(ctx, w = LW) { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function fillInk(ctx, col, w = LW) { ctx.fillStyle = col; ctx.fill(); ink(ctx, w); }
function capsule(ctx, x1, y1, x2, y2, r1, r2) {
  const a = Math.atan2(y2 - y1, x2 - x1), n = a + Math.PI / 2;
  ctx.beginPath(); ctx.moveTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1); ctx.lineTo(x2 + Math.cos(n) * r2, y2 + Math.sin(n) * r2);
  ctx.arc(x2, y2, r2, n, n + Math.PI, true); ctx.lineTo(x1 - Math.cos(n) * r1, y1 - Math.sin(n) * r1); ctx.arc(x1, y1, r1, n + Math.PI, n, true); ctx.closePath();
}
// cel shadow: fill the path again, clipped to the right-hand side, in a darker tone
function cel(ctx, path, col, x0, k = 0.8) { ctx.save(); path(); ctx.clip(); ctx.fillStyle = hexk(col, k); ctx.fillRect(x0, -3000, 3000, 6000); ctx.restore(); }

export function drawPerson(ctx, S, st, t = 0) {
  const H = S.H, g = S.girth, sw = H * 0.125 * (1 + (g - 1) * 0.7);
  ctx.save(); ctx.translate(CW / 2, CH - 30);
  const walk = st.walk >= 0, ph = st.walk;
  ctx.translate(0, -((walk ? Math.abs(Math.sin(ph)) * 16 : 0) + st.bob)); ctx.rotate(st.lean);
  const shY = -H * 0.72 - st.shoulderUp * 10, hipY = -H * 0.42;
  legs(ctx, S, H, hipY, walk, ph);
  ctx.save(); ctx.translate(0, shY); ctx.scale(1, 1 + st.breathe * 0.01); ctx.translate(0, -shY);
  if (S.male) kurta(ctx, S, H, sw, shY); else saree(ctx, S, H, sw, shY);
  ctx.restore();
  // neck
  const nw = H * 0.042; ctx.beginPath(); ctx.rect(-nw, shY - H * 0.06, nw * 2, H * 0.075); fillInk(ctx, S.skin);
  ctx.save(); ctx.translate(0, shY - 10); ctx.rotate(st.tilt); ctx.translate(0, -(shY - 10));
  head(ctx, S, st, H, shY - H * 0.135, t);
  ctx.restore();
  arm(ctx, S, H, sw, shY, -1, st.armR); arm(ctx, S, H, sw, shY, 1, st.armL);
  if (st.prop === 'box' && st.armL.hand && st.armR.hand) box(ctx, (st.armL.hand[0] + st.armR.hand[0]) / 2, (st.armL.hand[1] + st.armR.hand[1]) / 2 - 18);
  ctx.restore();
}

function box(ctx, x, y) {
  const w = 240, h = 130; ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); fillInk(ctx, '#ff3d7f');
  ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, 26); fillInk(ctx, '#d81b60');
  ctx.beginPath(); ctx.rect(x - 14, y - h / 2, 28, h); fillInk(ctx, '#ffd23f', 6); ctx.beginPath(); ctx.rect(x - w / 2, y - 6, w, 16); fillInk(ctx, '#ffd23f', 6);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 30, y - h / 2 - 10, 34, 18, s * 0.4, 0, TAU); fillInk(ctx, '#ffd23f', 6); }
  ctx.fillStyle = '#fff'; ctx.font = '800 30px Pop, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('मिठाई', x + 64, y + 48);
}

function legs(ctx, S, H, hipY, walk, ph) {
  const lw = H * 0.058 * S.girth, gap = H * 0.05;
  for (const s of [-1, 1]) {
    const lift = walk ? Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 30 : 0, x = s * gap, ank = -H * 0.035 - lift;
    if (S.male) {
      const p = () => { ctx.beginPath(); ctx.moveTo(x - lw, hipY + 60); ctx.lineTo(x + lw, hipY + 60); ctx.lineTo(x + lw * 0.7, ank); ctx.lineTo(x - lw * 0.7, ank); ctx.closePath(); };
      p(); ctx.fillStyle = S.pyjama; ctx.fill(); cel(ctx, p, S.pyjama, x + lw * 0.25, 0.86); p(); ink(ctx);
      ctx.beginPath(); ctx.ellipse(x + s * 10, ank + 14, lw * 1.05, 22, 0, 0, TAU); fillInk(ctx, S.shoe);
    } else {
      ctx.beginPath(); ctx.ellipse(x + s * 10, -8 - lift, 34, 15, 0, 0, TAU); fillInk(ctx, S.skin);
    }
  }
}

function kurta(ctx, S, H, sw, shY) {
  const hem = -H * 0.2, waist = -H * 0.5, hw = sw * 0.92;
  const p = () => { ctx.beginPath(); ctx.moveTo(-sw * 0.3, shY - 4); ctx.quadraticCurveTo(-sw * 0.85, shY - 4, -sw, shY + 30);
    ctx.lineTo(-hw * 0.95, waist); ctx.lineTo(-hw * 1.12, hem); ctx.quadraticCurveTo(0, hem + 12, hw * 1.12, hem); ctx.lineTo(hw * 0.95, waist);
    ctx.lineTo(sw, shY + 30); ctx.quadraticCurveTo(sw * 0.85, shY - 4, sw * 0.3, shY - 4); ctx.closePath(); };
  p(); ctx.fillStyle = S.kurta; ctx.fill(); cel(ctx, p, S.kurta, sw * 0.45, 0.8); p(); ink(ctx);
  // side slits + fold lines
  ctx.lineWidth = 5; ctx.strokeStyle = INK; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * hw * 1.08, hem); ctx.lineTo(s * hw * 1.0, -H * 0.33); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-hw * 0.4, -H * 0.3); ctx.lineTo(-hw * 0.5, hem + 6); ctx.stroke();
  if (S.placket) { ctx.beginPath(); ctx.rect(-14, shY - 2, 28, H * 0.16); fillInk(ctx, S.placket, 5); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, shY + 26 + i * 50, 6, 0, TAU); fillInk(ctx, '#fff', 3); } }
  if (S.jacket) {
    const jh = -H * 0.4;
    for (const s of [-1, 1]) {
      const q = () => { ctx.beginPath(); ctx.moveTo(s * sw * 0.3, shY - 6); ctx.quadraticCurveTo(s * sw * 0.75, shY - 6, s * sw * 0.86, shY + 34);
        ctx.lineTo(s * hw * 0.9, waist + 20); ctx.lineTo(s * hw * 1.0, jh); ctx.lineTo(s * 6, jh + 14); ctx.lineTo(s * 6, shY + 40); ctx.closePath(); };
      q(); ctx.fillStyle = S.jacket; ctx.fill(); if (s > 0) cel(ctx, q, S.jacket, sw * 0.4, 0.78);
      ctx.save(); q(); ctx.clip(); ctx.fillStyle = 'rgba(255,210,63,.35)'; for (let y = shY; y < jh; y += 30) for (let x = -sw; x < sw; x += 30) { ctx.beginPath(); ctx.arc(x + ((y / 30) % 2) * 15, y, 4, 0, TAU); ctx.fill(); } ctx.restore();
      q(); ink(ctx);
    }
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(14, shY + 50 + i * 56, 7, 0, TAU); fillInk(ctx, S.trim, 3); }
    ctx.beginPath(); ctx.moveTo(sw * 0.4, shY + 104); ctx.lineTo(sw * 0.66, shY + 104); ctx.lineTo(sw * 0.58, shY + 80); ctx.lineTo(sw * 0.46, shY + 86); ctx.closePath(); fillInk(ctx, S.trim, 4);
  }
  // collar
  ctx.beginPath(); ctx.ellipse(0, shY - 4, sw * 0.32, 20, 0, Math.PI, TAU); fillInk(ctx, S.jacket || hexk(S.kurta, 0.85), 6);
}

function saree(ctx, S, H, sw, shY) {
  const waist = -H * 0.48, hipW = sw * 1.2;
  const sk = () => { ctx.beginPath(); ctx.moveTo(-sw * 0.8, waist); ctx.quadraticCurveTo(-hipW * 1.05, waist + 150, -hipW * 1.1, -2); ctx.quadraticCurveTo(0, 14, hipW * 1.1, -2);
    ctx.quadraticCurveTo(hipW * 1.05, waist + 150, sw * 0.8, waist); ctx.closePath(); };
  sk(); ctx.fillStyle = S.saree; ctx.fill(); cel(ctx, sk, S.saree, sw * 0.4, 0.8);
  ctx.save(); sk(); ctx.clip(); ctx.fillStyle = S.border; ctx.fillRect(-hipW * 1.3, -60, hipW * 2.6, 46);
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-hipW * 1.3, -60); ctx.lineTo(hipW * 1.3, -60); ctx.stroke();
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 10 + 14, waist + 40); ctx.lineTo(i * 34 + 20, -60); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,210,63,.6)'; for (let y = waist + 70; y < -90; y += 56) for (let x = -hipW; x < hipW; x += 48) { ctx.beginPath(); ctx.arc(x + ((y / 56) % 2) * 24, y, 5, 0, TAU); ctx.fill(); }
  ctx.restore(); sk(); ink(ctx);
  // midriff + blouse
  ctx.beginPath(); ctx.rect(-sw * 0.76, -H * 0.555, sw * 1.52, H * 0.08); fillInk(ctx, S.skin);
  const bl = () => { ctx.beginPath(); ctx.moveTo(-sw * 0.3, shY - 4); ctx.quadraticCurveTo(-sw * 0.85, shY - 6, -sw, shY + 30); ctx.lineTo(-sw * 0.78, -H * 0.555);
    ctx.lineTo(sw * 0.78, -H * 0.555); ctx.lineTo(sw, shY + 30); ctx.quadraticCurveTo(sw * 0.85, shY - 6, sw * 0.3, shY - 4); ctx.closePath(); };
  bl(); ctx.fillStyle = S.blouse; ctx.fill(); cel(ctx, bl, S.blouse, sw * 0.45, 0.82); bl(); ink(ctx);
  ctx.beginPath(); ctx.moveTo(-sw * 0.34, shY - 3); ctx.quadraticCurveTo(0, shY + 70, sw * 0.34, shY - 3); ctx.closePath(); fillInk(ctx, S.skin, 6);
  ctx.beginPath(); ctx.arc(0, shY + 48, 9, 0, TAU); fillInk(ctx, '#ffd23f', 4);
  // pallu over her left shoulder
  const pl = () => { ctx.beginPath(); ctx.moveTo(-sw * 0.85, waist + 10); ctx.lineTo(-sw * 0.3, waist + 24); ctx.quadraticCurveTo(sw * 0.35, shY + 150, sw * 1.04, shY + 34);
    ctx.lineTo(sw * 1.0, shY + 2); ctx.quadraticCurveTo(sw * 0.6, shY - 8, sw * 0.42, shY + 6); ctx.quadraticCurveTo(-sw * 0.3, shY + 120, -sw * 0.85, waist - 50); ctx.closePath(); };
  pl(); ctx.fillStyle = S.saree; ctx.fill(); cel(ctx, pl, S.saree, sw * 0.55, 0.82); pl(); ink(ctx);
  ctx.lineWidth = 12; ctx.strokeStyle = S.border; ctx.beginPath(); ctx.moveTo(-sw * 0.3, waist + 18); ctx.quadraticCurveTo(sw * 0.35, shY + 144, sw * 1.0, shY + 28); ctx.stroke();
}

function head(ctx, S, st, H, cy, t) {
  const hw = H * 0.1, hh = H * 0.115, yaw = clamp(st.yaw, -1, 1), fx = yaw * hw * 0.2;
  LW = 10;
  ctx.save(); ctx.translate(0, cy);
  // hair behind
  if (S.hairStyle === 'bun') { ctx.beginPath(); ctx.arc(-yaw * 26 - hw * 0.15, -hh * 0.75, hw * 0.55, 0, TAU); fillInk(ctx, S.hair);
    for (let i = 0; i < 8; i++) { const a = Math.PI * 0.95 + i * 0.16; ctx.beginPath(); ctx.arc(-yaw * 26 - hw * 0.15 + Math.cos(a) * hw * 0.6, -hh * 0.75 + Math.sin(a) * hw * 0.6, 9, 0, TAU); fillInk(ctx, '#fffaf0', 3); }
    ctx.beginPath(); ctx.ellipse(-yaw * 14, -hh * 0.2, hw * 1.1, hh * 0.92, 0, 0, TAU); fillInk(ctx, S.hair); }
  // ears
  for (const s of [-1, 1]) { const v = 1 - Math.max(0, yaw * s) * 0.7; ctx.beginPath(); ctx.ellipse(s * hw * 0.98 + fx * 0.3, hh * 0.05, hw * 0.17 * v, hh * 0.19, 0, 0, TAU); fillInk(ctx, S.skin);
    if (!S.male) { const ex = s * hw * 0.98 + fx * 0.3, ey = hh * 0.25, sw = Math.sin(t * 2.4 + s) * 4; ctx.beginPath(); ctx.moveTo(ex - 16 + sw, ey + 40); ctx.quadraticCurveTo(ex + sw, ey, ex + 16 + sw, ey + 40); ctx.closePath(); fillInk(ctx, '#ffd23f', 5); } }
  // face
  const face = () => { ctx.beginPath(); ctx.moveTo(fx * 0.2, -hh); ctx.bezierCurveTo(hw * 0.8, -hh, hw * 1.02, -hh * 0.55, hw * 1.0, -hh * 0.05);
    ctx.bezierCurveTo(hw * 0.98, hh * 0.55, hw * 0.6, hh * 1.0, fx * 0.6, hh * 1.02); ctx.bezierCurveTo(-hw * 0.6, hh * 1.0, -hw * 0.98, hh * 0.55, -hw * 1.0, -hh * 0.05);
    ctx.bezierCurveTo(-hw * 1.02, -hh * 0.55, -hw * 0.8, -hh, fx * 0.2, -hh); ctx.closePath(); };
  face(); ctx.fillStyle = S.skin; ctx.fill(); cel(ctx, face, S.skin, hw * (0.62 - yaw * 0.3), 0.86);
  if (S.beard) { ctx.save(); face(); ctx.clip(); ctx.beginPath(); ctx.moveTo(-hw * 1.1, hh * 0.1); ctx.quadraticCurveTo(-hw * 0.9, hh * 0.55, -hw * 0.45 + fx, hh * 0.5);
    ctx.quadraticCurveTo(fx, hh * 0.72, hw * 0.45 + fx, hh * 0.5); ctx.quadraticCurveTo(hw * 0.9, hh * 0.55, hw * 1.1, hh * 0.1); ctx.lineTo(hw * 1.1, hh * 1.2); ctx.lineTo(-hw * 1.1, hh * 1.2); ctx.closePath();
    ctx.fillStyle = S.hair; ctx.fill(); ctx.restore(); }
  face(); ink(ctx);
  if (!S.male) { ctx.fillStyle = 'rgba(255,90,110,.35)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * hw * 0.58 + fx, hh * 0.32, hw * 0.18, hh * 0.09, 0, 0, TAU); ctx.fill(); } }
  // eyes: big round whites with pupils
  const ey = -hh * 0.08, er = hw * 0.27, open = clamp(st.open, 0, 1);
  for (const s of [-1, 1]) {
    const cx = s * er * 1.02 + fx * 1.3;
    ctx.beginPath(); ctx.arc(cx, ey, er, 0, TAU); fillInk(ctx, '#ffffff', 8);
    if (open > 0.15) { const px = cx + (st.lookX * 0.45 + yaw * 0.3) * er, py = ey + st.lookY * 0.3 * er + er * 0.05;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, ey, er - 4, 0, TAU); ctx.clip();
      ctx.beginPath(); ctx.arc(px, py, er * 0.42, 0, TAU); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.arc(px - er * 0.15, py - er * 0.16, er * 0.13, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      // eyelid (blink / sleepy)
      const lid = 1 - open; if (lid > 0.01) { ctx.fillStyle = S.skin; ctx.fillRect(cx - er, ey - er, er * 2, er * 2 * lid); }
      ctx.restore(); if (lid > 0.01) { ctx.beginPath(); ctx.moveTo(cx - er, ey - er + er * 2 * lid); ctx.lineTo(cx + er, ey - er + er * 2 * lid); ink(ctx, 6); } }
    else { ctx.beginPath(); ctx.arc(cx, ey, er, 0, TAU); ctx.fillStyle = S.skin; ctx.fill(); ink(ctx, 8); ctx.beginPath(); ctx.moveTo(cx - er * 0.7, ey + 4); ctx.quadraticCurveTo(cx, ey + er * 0.45, cx + er * 0.7, ey + 4); ink(ctx, 7); }
    if (!S.male) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + s * (0.5 + i * 0.32); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * er, ey + Math.sin(a) * er); ctx.lineTo(cx + Math.cos(a) * er * 1.32, ey + Math.sin(a) * er * 1.32); ink(ctx, 6); }
    // brows
    const b = st.brow, by = ey - er * 1.38 - b * er * 0.25, inner = -s;
    ctx.beginPath(); ctx.moveTo(cx + inner * er * 0.85, by + (b < 0 ? b * er * 0.5 : er * 0.08)); ctx.quadraticCurveTo(cx, by - er * 0.32, cx - inner * er * 0.9, by + er * 0.12 - (b < 0 ? b * er * 0.15 : 0));
    ink(ctx, S.male ? 15 : 9);
  }
  // nose
  const nx = fx * 1.6, ny = hh * 0.28;
  ctx.beginPath(); ctx.moveTo(nx - hw * 0.05, ey + er * 0.85); ctx.quadraticCurveTo(nx + hw * 0.2, ny + hh * 0.05, nx - hw * 0.08, ny + hh * 0.09); ink(ctx, 7);
  // moustache
  const my = hh * 0.5, mx = fx * 1.4;
  if (S.beard) { ctx.beginPath(); ctx.moveTo(mx, my - hh * 0.07); ctx.bezierCurveTo(mx + hw * 0.3, my - hh * 0.14, mx + hw * 0.52, my - hh * 0.02, mx + hw * 0.56, my + hh * 0.08);
    ctx.bezierCurveTo(mx + hw * 0.3, my + hh * 0.02, mx + hw * 0.1, my, mx, my + hh * 0.02); ctx.bezierCurveTo(mx - hw * 0.1, my, mx - hw * 0.3, my + hh * 0.02, mx - hw * 0.56, my + hh * 0.08);
    ctx.bezierCurveTo(mx - hw * 0.52, my - hh * 0.02, mx - hw * 0.3, my - hh * 0.14, mx, my - hh * 0.07); ctx.fillStyle = S.hair; ctx.fill(); }
  // mouth
  const mo = clamp(st.mouth, 0, 1.1), sm = st.smile, mw = hw * (0.34 + sm * 0.06), mY = my + hh * 0.13, cor = -sm * hh * 0.08;
  if (mo > 0.08) {
    const h = hh * (0.1 + mo * 0.3);
    const mp = () => { ctx.beginPath(); ctx.moveTo(mx - mw, mY + cor); ctx.quadraticCurveTo(mx, mY - hh * 0.04, mx + mw, mY + cor); ctx.quadraticCurveTo(mx + mw * 0.6, mY + h * 1.3, mx, mY + h * 1.3); ctx.quadraticCurveTo(mx - mw * 0.6, mY + h * 1.3, mx - mw, mY + cor); ctx.closePath(); };
    mp(); ctx.fillStyle = '#7a1424'; ctx.fill();
    ctx.save(); mp(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(mx - mw, mY - hh * 0.05, mw * 2, hh * 0.07); ctx.fillStyle = '#ff6b81'; ctx.beginPath(); ctx.ellipse(mx, mY + h * 1.25, mw * 0.55, h * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
    mp(); ink(ctx, 8);
  } else {
    ctx.beginPath(); ctx.moveTo(mx - mw, mY + cor); ctx.quadraticCurveTo(mx, mY + hh * 0.02 + sm * hh * 0.1, mx + mw, mY + cor); ink(ctx, 8);
    if (S.lips) { ctx.beginPath(); ctx.ellipse(mx, mY + hh * 0.04 + sm * hh * 0.04, mw * 0.4, hh * 0.035, 0, 0, TAU); ctx.fillStyle = S.lips; ctx.fill(); }
  }
  if (!S.male) { ctx.beginPath(); ctx.arc(fx * 1.4, -hh * 0.52, 9, 0, TAU); fillInk(ctx, '#d0102f', 4); }
  frontHair(ctx, S, hw, hh, yaw, fx);
  ctx.restore(); LW = 9;
}

function frontHair(ctx, S, hw, hh, yaw, fx) {
  if (S.hairStyle === 'bun') {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx * 0.5, -hh * 1.05); ctx.bezierCurveTo(s * hw * 0.7, -hh * 1.08, s * hw * 1.12, -hh * 0.7, s * hw * 1.06, -hh * 0.05);
      ctx.bezierCurveTo(s * hw * 0.95, -hh * 0.35, s * hw * 0.7, -hh * 0.62, fx * 0.5 + s * hw * 0.2, -hh * 0.72); ctx.closePath(); fillInk(ctx, S.hair); }
    ctx.beginPath(); ctx.moveTo(fx * 0.5, -hh * 1.04); ctx.lineTo(fx * 0.5, -hh * 0.78); ink(ctx, 5); ctx.strokeStyle = '#d0102f'; ctx.lineWidth = 4; ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.moveTo(-hw * 1.02, -hh * 0.05);
  ctx.bezierCurveTo(-hw * 1.15, -hh * 0.95, -hw * 0.5, -hh * 1.3, fx * 0.3, -hh * 1.22);
  ctx.bezierCurveTo(hw * 0.7, -hh * 1.28, hw * 1.18, -hh * 0.9, hw * 1.02, -hh * 0.05);
  ctx.lineTo(hw * 0.92, -hh * 0.3);
  if (S.hairStyle === 'puff') { ctx.quadraticCurveTo(hw * 0.85, -hh * 0.62, hw * 0.4, -hh * 0.66); ctx.quadraticCurveTo(hw * 0.1, -hh * 0.82, -hw * 0.25, -hh * 0.68); ctx.quadraticCurveTo(-hw * 0.7, -hh * 0.72, -hw * 0.9, -hh * 0.3); }
  else { ctx.quadraticCurveTo(hw * 0.8, -hh * 0.65, hw * 0.1 + fx * 0.3, -hh * 0.72); ctx.quadraticCurveTo(-hw * 0.5, -hh * 0.82, -hw * 0.9, -hh * 0.3); }
  ctx.closePath(); fillInk(ctx, S.hair);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-hw * 0.5, -hh * 1.1); ctx.quadraticCurveTo(0, -hh * 1.2, hw * 0.4, -hh * 1.08); ctx.stroke();
}

function arm(ctx, S, H, sw, shY, side, armA) {
  const [a1, a2, hand] = armA, sx = side * sw * 0.86, sy = shY + 36;
  const uL = H * 0.16, fL = H * 0.14, r1 = H * 0.033 * Math.sqrt(S.girth), r2 = r1 * 0.88, r3 = r1 * 0.78;
  const d1 = Math.PI / 2 - a1 * side, ex = sx + Math.cos(d1) * uL, ey = sy + Math.sin(d1) * uL, d2 = d1 + a2 * side, hx = ex + Math.cos(d2) * fL, hy = ey + Math.sin(d2) * fL;
  const sleeve = S.male ? S.kurta : S.blouse;
  capsule(ctx, sx, sy, ex, ey, r1, r2); fillInk(ctx, sleeve);
  capsule(ctx, ex, ey, hx, hy, r2, r3); fillInk(ctx, S.male ? sleeve : S.skin);
  if (!S.male) for (let i = 0; i < 3; i++) { const k = 0.74 + i * 0.08, bx = ex + (hx - ex) * k, by = ey + (hy - ey) * k; ctx.beginPath(); ctx.ellipse(bx, by, r3 * 1.15, 6, d2 + Math.PI / 2, 0, TAU); fillInk(ctx, i % 2 ? '#d0102f' : '#ffd23f', 3); }
  // shoulder cap (like the reference's round shoulders)
  ctx.beginPath(); ctx.arc(sx, sy - 4, r1 * 1.12, 0, TAU); fillInk(ctx, S.male ? (S.jacket ? S.kurta : hexk(S.kurta, 0.9)) : S.blouse);
  handShape(ctx, S, hx, hy, d2, side, hand, r3);
  armA.hand = [hx, hy];
}

function handShape(ctx, S, x, y, dir, side, kind, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir - Math.PI / 2);
  const W = r * 1.15, Lh = r * 2.3, s = side;
  const mit = (len) => { ctx.beginPath(); ctx.moveTo(-W, 0); ctx.quadraticCurveTo(-W * 1.15, len * 0.7, -W * 0.4, len); ctx.quadraticCurveTo(0, len * 1.1, W * 0.5, len); ctx.quadraticCurveTo(W * 1.15, len * 0.7, W, 0); ctx.closePath(); fillInk(ctx, S.skin, 7); };
  const thumb = (x2, y2) => { capsule(ctx, -s * W * 0.7, Lh * 0.3, x2, y2, W * 0.32, W * 0.28); fillInk(ctx, S.skin, 7); };
  if (kind === 'point') { capsule(ctx, s * W * 0.3, Lh * 0.5, s * W * 0.35, Lh * 1.45, W * 0.3, W * 0.26); fillInk(ctx, S.skin, 7); mit(Lh * 0.8); }
  else if (kind === 'thumb') { mit(Lh * 0.85); thumb(-s * W * 0.9, -Lh * 0.35); }
  else if (kind === 'fist' || kind === 'hold') { mit(Lh * 0.85); ctx.beginPath(); for (let i = 0; i < 2; i++) { ctx.moveTo(-W * 0.3 + i * W * 0.55, Lh * 0.85); ctx.lineTo(-W * 0.3 + i * W * 0.55, Lh * 0.62); } ink(ctx, 5); }
  else if (kind === 'open') { mit(Lh * 1.2); thumb(-s * W * 1.55, Lh * 0.8); ctx.beginPath(); for (let i = 0; i < 2; i++) { ctx.moveTo(-W * 0.3 + i * W * 0.55, Lh * 1.15); ctx.lineTo(-W * 0.3 + i * W * 0.55, Lh * 0.75); } ink(ctx, 5); }
  else { mit(Lh * 1.1); thumb(-s * W * 0.8, Lh * 0.75); }
  ctx.restore();
}
