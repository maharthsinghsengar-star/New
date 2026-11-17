// Human-like 2D characters drawn procedurally on a canvas (front / three-quarter view), with a simple puppet rig.
// drawPerson(ctx, spec, state) draws a full figure with feet at (0,0), y up = negative canvas y.

export const CW = 760, CH = 1700;           // canvas size per character
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function hex(c, k = 1, add = 0) {            // scale / lift a #rrggbb colour
  const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(v * k + add), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function rgba(c, a) { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

export const SPECS = {
  J: { // Jitu bhaiya: mid-30s, broad, moustache, saffron kurta + maroon Nehru jacket
    H: 1500, sw: 0.128, girth: 1.12, skin: '#b9784f', hair: '#1a1210', jaw: 1.0, male: true,
    kurta: '#f39a1e', kurtaHem: 0.30, jacket: '#8e1b3a', jacketTrim: '#f4c64a', pyjama: '#f6efe2', shoe: '#7a3b1c',
    moustache: true, hairStyle: 'side', brow: 1.15,
  },
  R: { // Raj: early 30s, slim, light stubble, teal kurta with embroidered placket
    H: 1520, sw: 0.122, girth: 0.98, skin: '#c58a62', hair: '#15100e', jaw: 0.95, male: true,
    kurta: '#11869b', kurtaHem: 0.29, placket: '#f4c64a', pyjama: '#f3ece0', shoe: '#5b3420',
    stubble: true, hairStyle: 'wavy', brow: 1.05,
  },
  W: { // Raj's wife: saree (magenta + gold), bun, bindi, jhumkas, bangles
    H: 1440, sw: 0.108, girth: 0.92, skin: '#c98c66', hair: '#120c0b', jaw: 0.85, male: false,
    saree: '#d4145a', sareeDark: '#9c0c41', border: '#f2c14e', blouse: '#f2c14e', bangles: '#f2c14e',
    hairStyle: 'bun', brow: 0.85, lips: '#b8344a',
  },
};

// default state
export function defaultState() {
  return { yaw: 0, tilt: 0, lean: 0, breathe: 0, bob: 0, walk: -1, brow: 0, smile: 0.2, open: 1, mouth: 0, lookX: 0, lookY: 0,
    armL: [0.12, 0.25, 'relax'], armR: [0.12, 0.25, 'relax'], prop: null, shoulderUp: 0 };
}

// ------------------------------------------------------------------ shape helpers
function capsule(ctx, x1, y1, x2, y2, r1, r2) {
  const a = Math.atan2(y2 - y1, x2 - x1), n = a + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1);
  ctx.lineTo(x2 + Math.cos(n) * r2, y2 + Math.sin(n) * r2);
  ctx.arc(x2, y2, r2, n, n + Math.PI, true);
  ctx.lineTo(x1 - Math.cos(n) * r1, y1 - Math.sin(n) * r1);
  ctx.arc(x1, y1, r1, n + Math.PI, n, true);
  ctx.closePath();
}
function shadeFill(ctx, base, x0, y0, x1, y1, k0 = 1.12, k1 = 0.78) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, hex(base, k0)); g.addColorStop(0.55, hex(base, 1)); g.addColorStop(1, hex(base, k1));
  return g;
}

// ------------------------------------------------------------------ main draw
export function drawPerson(ctx, S, st, t = 0) {
  const H = S.H, sw = S.sw * H * (S.girth > 1 ? 1 + (S.girth - 1) * 0.6 : 1), g = S.girth;
  ctx.save();
  ctx.translate(CW / 2, CH - 30);
  // walking / breathing / lean
  const walk = st.walk >= 0, ph = st.walk;
  const bob = (walk ? Math.abs(Math.sin(ph)) * 14 : 0) + st.bob;
  ctx.translate(0, -bob);
  ctx.rotate(st.lean);
  const br = 1 + st.breathe * 0.008;

  const shY = -H * 0.815 - st.shoulderUp * 10, hipY = -H * 0.5, kneeY = -H * 0.27;
  const yawK = st.yaw;

  // ---------- back hair (bun/braid behind the head is drawn with the head)
  // ---------- legs
  drawLegs(ctx, S, st, H, hipY, kneeY, walk, ph);
  // ---------- torso / outfit
  ctx.save(); ctx.translate(0, shY); ctx.scale(1, br); ctx.translate(0, -shY);
  if (S.male) drawKurta(ctx, S, H, sw, shY, yawK); else drawSaree(ctx, S, H, sw, shY, yawK);
  ctx.restore();
  // ---------- neck + head
  const neckY = shY + 4, headC = -H * 0.912;
  drawNeck(ctx, S, H, shY, headC);
  ctx.save();
  ctx.translate(0, shY - 18); ctx.rotate(st.tilt); ctx.translate(0, -(shY - 18));
  drawHead(ctx, S, st, H, headC, t);
  ctx.restore();
  // ---------- arms (in front)
  drawArm(ctx, S, st, H, sw, shY, -1, st.armR);   // character's right arm = viewer's left
  drawArm(ctx, S, st, H, sw, shY, 1, st.armL);
  if (st.prop === 'box' && st.armL.hand && st.armR.hand) drawBox(ctx, (st.armL.hand[0] + st.armR.hand[0]) / 2, (st.armL.hand[1] + st.armR.hand[1]) / 2 - 20);
  ctx.restore();
}

function drawBox(ctx, x, y) {
  const w = 230, h = 120;
  ctx.fillStyle = '#e8336d'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = '#c21a55'; ctx.fillRect(x - w / 2, y - h / 2, w, 22);
  ctx.fillStyle = '#f7c548'; ctx.fillRect(x - 12, y - h / 2, 24, h); ctx.fillRect(x - w / 2, y - 6, w, 14);
  ctx.beginPath(); ctx.ellipse(x - 26, y - h / 2 - 6, 30, 16, -0.4, 0, Math.PI * 2); ctx.ellipse(x + 26, y - h / 2 - 6, 30, 16, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3c4'; ctx.font = '700 26px Pop, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('मिठाई', x + 62, y + 44);
}

function drawLegs(ctx, S, st, H, hipY, kneeY, walk, ph) {
  const legW = H * 0.055 * S.girth, gap = H * 0.045;
  for (const s of [-1, 1]) {
    const lift = walk ? Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 26 : 0;
    const x = s * gap;
    if (S.male) {
      // churidar pyjama: tapered leg with ankle bunching
      const top = hipY + 40, ank = -H * 0.035 - lift;
      ctx.fillStyle = shadeFill(ctx, S.pyjama, x - legW, 0, x + legW, 0, 1.03, 0.82);
      ctx.beginPath(); ctx.moveTo(x - legW * 1.15, top); ctx.lineTo(x + legW * 1.15, top);
      ctx.quadraticCurveTo(x + legW * 1.0, (top + ank) / 2, x + legW * 0.55, ank); ctx.lineTo(x - legW * 0.55, ank);
      ctx.quadraticCurveTo(x - legW * 1.0, (top + ank) / 2, x - legW * 1.15, top); ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,80,.25)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const y = ank - 12 - i * 16; ctx.beginPath(); ctx.ellipse(x, y, legW * (0.58 + i * 0.05), 5, 0, 0.15, Math.PI - 0.15); ctx.stroke(); }
      // jutti
      ctx.fillStyle = shadeFill(ctx, S.shoe, x - 40, ank, x + 40, ank + 30, 1.25, 0.7);
      ctx.beginPath(); ctx.ellipse(x + s * 6, ank + 14, legW * 0.95, 20, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(244,198,74,.85)'; ctx.beginPath(); ctx.ellipse(x + s * 6, ank + 8, legW * 0.5, 6, 0, 0, TAU); ctx.fill();
    } else {
      // feet peeking under the saree
      const ank = -6 - lift;
      ctx.fillStyle = hex(S.skin, 0.95); ctx.beginPath(); ctx.ellipse(x + s * 8, ank, 30, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = S.border; ctx.beginPath(); ctx.ellipse(x + s * 8, ank - 4, 24, 6, 0, Math.PI, TAU); ctx.fill();
    }
  }
}

function drawKurta(ctx, S, H, sw, shY, yaw) {
  const hem = -H * S.kurtaHem, waist = -H * 0.6, hw = sw * 0.92, collar = H * 0.034;
  // body of kurta
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-collar * 1.2, shY - 6);
    ctx.quadraticCurveTo(-sw * 0.7, shY - 6, -sw * 0.98, shY + 22);
    ctx.quadraticCurveTo(-sw * 1.02, shY + 90, -hw * 0.9, waist);
    ctx.quadraticCurveTo(-hw * 0.95, (waist + hem) / 2, -hw * 1.12, hem);
    ctx.quadraticCurveTo(0, hem + 14, hw * 1.12, hem);
    ctx.quadraticCurveTo(hw * 0.95, (waist + hem) / 2, hw * 0.9, waist);
    ctx.quadraticCurveTo(sw * 1.02, shY + 90, sw * 0.98, shY + 22);
    ctx.quadraticCurveTo(sw * 0.7, shY - 6, collar * 1.2, shY - 6);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = shadeFill(ctx, S.kurta, -sw, 0, sw, 0, 1.12, 0.74); ctx.fill();
  // vertical light falloff
  body(); const vg = ctx.createLinearGradient(0, shY, 0, hem); vg.addColorStop(0, 'rgba(255,255,255,.08)'); vg.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = vg; ctx.fill();
  // fabric folds
  ctx.save(); body(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 5;
  for (const x of [-0.55, -0.15, 0.3, 0.62]) { ctx.beginPath(); ctx.moveTo(x * hw, waist + 30); ctx.quadraticCurveTo(x * hw * 1.1 + 8, (waist + hem) / 2, x * hw * 1.25, hem); ctx.stroke(); }
  // side slits
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 4;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * hw * 1.0, hem + 4); ctx.lineTo(s * hw * 0.93, -H * 0.42); ctx.stroke(); }
  ctx.restore();
  // placket + mandarin collar
  const pk = S.placket || hex(S.kurta, 0.85);
  ctx.fillStyle = pk; ctx.fillRect(-14 + yaw * 10, shY - 4, 28, H * 0.17);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(yaw * 10, shY + 26 + i * 44, 5.5, 0, TAU); ctx.fill(); }
  if (S.placket) { ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(yaw * 10, shY + 10 + i * 24, 7, 0.2, Math.PI - 0.2); ctx.stroke(); } }
  ctx.fillStyle = hex(S.kurta, 0.9); ctx.beginPath(); ctx.ellipse(yaw * 6, shY - 6, collar * 1.35, 16, 0, Math.PI, TAU); ctx.fill();
  // Nehru jacket
  if (S.jacket) {
    const jh = -H * 0.47;
    const jk = s => { ctx.beginPath(); ctx.moveTo(s * collar * 1.2, shY - 8); ctx.quadraticCurveTo(s * sw * 0.62, shY - 8, s * sw * 0.86, shY + 26);
      ctx.quadraticCurveTo(s * sw * 0.8, shY + 120, s * hw * 0.88, waist + 10); ctx.lineTo(s * hw * 0.98, jh); ctx.quadraticCurveTo(s * hw * 0.5, jh + 10, s * 6, jh + 18);
      ctx.lineTo(s * 6, shY + 20); ctx.closePath(); };
    for (const s of [-1, 1]) {
      jk(s); ctx.fillStyle = shadeFill(ctx, S.jacket, -sw, 0, sw, 0, 1.25, 0.72); ctx.fill();
      // brocade dots
      ctx.save(); jk(s); ctx.clip(); ctx.fillStyle = rgba(S.jacketTrim, 0.22);
      for (let y = shY; y < jh; y += 26) for (let x = -sw; x < sw; x += 26) { ctx.beginPath(); ctx.arc(x + ((y / 26) % 2) * 13, y, 3.2, 0, TAU); ctx.fill(); }
      ctx.restore();
      jk(s); ctx.strokeStyle = S.jacketTrim; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.fillStyle = S.jacketTrim; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(10, shY + 40 + i * 52, 6, 0, TAU); ctx.fill(); }
    // pocket square
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(sw * 0.36, shY + 92); ctx.lineTo(sw * 0.64, shY + 92); ctx.lineTo(sw * 0.56, shY + 70); ctx.lineTo(sw * 0.44, shY + 76); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hex(S.jacket, 0.7); ctx.fillRect(sw * 0.34, shY + 92, sw * 0.32, 6);
    // collar band
    ctx.fillStyle = hex(S.jacket, 0.85); ctx.beginPath(); ctx.ellipse(0, shY - 8, collar * 1.45, 18, 0, Math.PI, TAU); ctx.fill();
  }
}

function drawSaree(ctx, S, H, sw, shY, yaw) {
  const waist = -H * 0.585, hipW = sw * 1.25, foot = -4;
  // pleated skirt
  const skirt = () => { ctx.beginPath(); ctx.moveTo(-sw * 0.82, waist); ctx.quadraticCurveTo(-hipW * 1.05, waist + 160, -hipW * 1.12, foot);
    ctx.quadraticCurveTo(0, foot + 18, hipW * 1.12, foot); ctx.quadraticCurveTo(hipW * 1.05, waist + 160, sw * 0.82, waist); ctx.closePath(); };
  skirt(); ctx.fillStyle = shadeFill(ctx, S.saree, -hipW, 0, hipW, 0, 1.15, 0.7); ctx.fill();
  ctx.save(); skirt(); ctx.clip();
  // pleats fan out from the waist
  for (let i = -4; i <= 4; i++) {
    const x0 = i * 9 + 10, x1 = i * 30 + 20;
    ctx.strokeStyle = i % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.12)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x0, waist + 30); ctx.quadraticCurveTo(x1 * 0.8, (waist + foot) / 2, x1, foot); ctx.stroke();
  }
  // gold border along the hem + motifs
  ctx.fillStyle = S.border; ctx.fillRect(-hipW * 1.2, foot - 54, hipW * 2.4, 40);
  ctx.fillStyle = S.sareeDark; for (let x = -hipW; x < hipW; x += 34) { ctx.beginPath(); ctx.moveTo(x, foot - 22); ctx.lineTo(x + 12, foot - 46); ctx.lineTo(x + 24, foot - 22); ctx.fill(); }
  ctx.fillStyle = rgba(S.border, 0.5); for (let y = waist + 80; y < foot - 80; y += 60) for (let x = -hipW; x < hipW; x += 50) { ctx.beginPath(); ctx.arc(x + ((y / 60) % 2) * 25, y, 4, 0, TAU); ctx.fill(); }
  ctx.restore();
  // midriff
  ctx.fillStyle = hex(S.skin, 0.92); ctx.beginPath(); ctx.moveTo(-sw * 0.78, waist + 6); ctx.quadraticCurveTo(-sw * 0.82, -H * 0.64, -sw * 0.72, -H * 0.665);
  ctx.lineTo(sw * 0.72, -H * 0.665); ctx.quadraticCurveTo(sw * 0.82, -H * 0.64, sw * 0.78, waist + 6); ctx.closePath(); ctx.fill();
  // blouse
  const bl = () => { ctx.beginPath(); ctx.moveTo(-20, shY - 6); ctx.quadraticCurveTo(-sw * 0.7, shY - 8, -sw * 0.98, shY + 24); ctx.quadraticCurveTo(-sw * 0.95, shY + 110, -sw * 0.75, -H * 0.66);
    ctx.lineTo(sw * 0.75, -H * 0.66); ctx.quadraticCurveTo(sw * 0.95, shY + 110, sw * 0.98, shY + 24); ctx.quadraticCurveTo(sw * 0.7, shY - 8, 20, shY - 6); ctx.closePath(); };
  bl(); ctx.fillStyle = shadeFill(ctx, S.blouse, -sw, 0, sw, 0, 1.15, 0.7); ctx.fill();
  // neckline (skin) + necklace
  ctx.fillStyle = hex(S.skin, 0.97); ctx.beginPath(); ctx.moveTo(-sw * 0.36, shY - 4); ctx.quadraticCurveTo(0, shY + 70, sw * 0.36, shY - 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-sw * 0.3, shY - 2); ctx.quadraticCurveTo(0, shY + 62, sw * 0.3, shY - 2); ctx.stroke();
  ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(0, shY + 46, 8, 0, TAU); ctx.fill();
  // pallu: diagonal band from her right waist (viewer left) over her left shoulder (viewer right)
  const pl = () => { ctx.beginPath(); ctx.moveTo(-sw * 0.85, waist + 20); ctx.lineTo(-sw * 0.35, waist + 30); ctx.quadraticCurveTo(sw * 0.3, shY + 160, sw * 1.02, shY + 30);
    ctx.lineTo(sw * 1.05, shY + 6); ctx.quadraticCurveTo(sw * 0.6, shY - 10, sw * 0.42, shY + 4); ctx.quadraticCurveTo(-sw * 0.3, shY + 120, -sw * 0.85, waist - 50); ctx.closePath(); };
  pl(); ctx.fillStyle = shadeFill(ctx, S.saree, -sw, waist, sw, shY, 0.85, 1.2); ctx.fill();
  ctx.save(); pl(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-sw * 0.8 + i * 18, waist + 10); ctx.quadraticCurveTo(sw * 0.1 + i * 10, shY + 150 - i * 20, sw * 0.95, shY + 20 + i * 4); ctx.stroke(); }
  ctx.restore();
  // pallu borders
  ctx.strokeStyle = S.border; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(-sw * 0.35, waist + 30); ctx.quadraticCurveTo(sw * 0.3, shY + 160, sw * 1.02, shY + 30); ctx.stroke();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-sw * 0.85, waist - 50); ctx.quadraticCurveTo(-sw * 0.3, shY + 120, sw * 0.42, shY + 4); ctx.stroke();
}

function drawNeck(ctx, S, H, shY, headC) {
  const nw = H * (S.male ? 0.037 : 0.03);
  ctx.fillStyle = shadeFill(ctx, S.skin, -nw, 0, nw, 0, 1.0, 0.78);
  ctx.beginPath(); ctx.moveTo(-nw, headC + H * 0.05); ctx.lineTo(nw, headC + H * 0.05); ctx.quadraticCurveTo(nw * 1.05, shY - 10, nw * 1.6, shY + 4);
  ctx.lineTo(-nw * 1.6, shY + 4); ctx.quadraticCurveTo(-nw * 1.05, shY - 10, -nw, headC + H * 0.05); ctx.fill();
  // jaw shadow on the neck
  const g = ctx.createLinearGradient(0, headC + H * 0.05, 0, headC + H * 0.09); g.addColorStop(0, 'rgba(60,25,15,.35)'); g.addColorStop(1, 'rgba(60,25,15,0)');
  ctx.fillStyle = g; ctx.fillRect(-nw, headC + H * 0.05, nw * 2, H * 0.05);
}

// ------------------------------------------------------------------ head & face
function drawHead(ctx, S, st, H, cy, t) {
  const hw = H * (S.male ? 0.064 : 0.06), hh = H * 0.08;  // half width / half height of face
  const yaw = clamp(st.yaw, -1, 1), fx = yaw * hw * 0.22;      // feature shift
  ctx.save(); ctx.translate(0, cy);
  // back hair (bun) for women
  if (S.hairStyle === 'bun') {
    ctx.fillStyle = S.hair; ctx.beginPath(); ctx.ellipse(-yaw * 30, -hh * 0.55, hw * 0.75, hw * 0.62, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-yaw * 20, -hh * 0.25, hw * 1.1, hh * 0.85, 0, 0, TAU); ctx.fill();
    // gajra (jasmine) around the bun
    ctx.fillStyle = '#fffaf0'; for (let i = 0; i < 9; i++) { const a = Math.PI * 1.05 + i * 0.13; ctx.beginPath(); ctx.arc(-yaw * 30 + Math.cos(a) * hw * 0.82, -hh * 0.55 + Math.sin(a) * hw * 0.68, 7, 0, TAU); ctx.fill(); }
  } else {
    ctx.fillStyle = S.hair; ctx.beginPath(); ctx.ellipse(-yaw * 6, -hh * 0.18, hw * 1.08, hh * 0.98, 0, 0, TAU); ctx.fill();
  }
  // ears
  for (const s of [-1, 1]) {
    const vis = 1 - Math.max(0, yaw * s) * 0.8;
    ctx.fillStyle = hex(S.skin, 0.9); ctx.beginPath(); ctx.ellipse(s * hw * 0.98 + fx * 0.3, -hh * 0.02, hw * 0.16 * vis, hh * 0.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,40,25,.35)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s * hw * 1.0 + fx * 0.3, -hh * 0.02, hw * 0.08 * vis, hh * 0.12, 0, 0, TAU); ctx.stroke();
    if (!S.male) { // jhumka earrings
      const ex = s * hw * 1.0 + fx * 0.3, ey = hh * 0.2, sway = Math.sin(t * 2.3 + s) * 3;
      ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex - 14 + sway, ey + 34); ctx.quadraticCurveTo(ex + sway, ey + 6, ex + 14 + sway, ey + 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(ex + sway, ey + 24, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff2c0'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(ex + sway + k * 6, ey + 38, 2.6, 0, TAU); ctx.fill(); }
    }
  }
  // face shape
  const face = () => {
    const jw = S.jaw;
    ctx.beginPath(); ctx.moveTo(0 + fx * 0.2, -hh);
    ctx.bezierCurveTo(hw * 0.75 + fx * 0.2, -hh, hw * 1.0, -hh * 0.6, hw * 0.98, -hh * 0.1);
    ctx.bezierCurveTo(hw * 0.97, hh * 0.35 * jw, hw * 0.7 * jw, hh * 0.78, hw * 0.26 + fx * 0.6, hh * 0.98);
    ctx.quadraticCurveTo(fx * 0.7, hh * 1.06, -hw * 0.26 + fx * 0.6, hh * 0.98);
    ctx.bezierCurveTo(-hw * 0.7 * jw, hh * 0.78, -hw * 0.97, hh * 0.35 * jw, -hw * 0.98, -hh * 0.1);
    ctx.bezierCurveTo(-hw * 1.0, -hh * 0.6, -hw * 0.75 + fx * 0.2, -hh, 0 + fx * 0.2, -hh);
    ctx.closePath();
  };
  face();
  const sg = ctx.createRadialGradient(-hw * 0.3 + fx, -hh * 0.3, hw * 0.2, fx * 0.5, 0, hw * 1.35);
  sg.addColorStop(0, hex(S.skin, 1.12)); sg.addColorStop(0.6, hex(S.skin, 1.0)); sg.addColorStop(1, hex(S.skin, 0.74));
  ctx.fillStyle = sg; ctx.fill();
  ctx.save(); face(); ctx.clip();
  // turned-away cheek shadow
  const side = yaw >= 0 ? -1 : 1, ss = Math.abs(yaw);
  const cg = ctx.createLinearGradient(side * hw, 0, side * hw * 0.2, 0); cg.addColorStop(0, `rgba(80,30,15,${0.18 + ss * 0.25})`); cg.addColorStop(1, 'rgba(80,30,15,0)');
  ctx.fillStyle = cg; ctx.fillRect(-hw * 1.2, -hh * 1.2, hw * 2.4, hh * 2.4);
  if (S.stubble) { ctx.fillStyle = 'rgba(40,25,20,.11)'; ctx.beginPath(); ctx.ellipse(fx * 0.7, hh * 0.62, hw * 0.88, hh * 0.5, 0, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx * 0.8, hh * 0.38, hw * 0.4, hh * 0.12, 0, 0, TAU); ctx.fill(); }
  if (!S.male) { ctx.fillStyle = 'rgba(230,90,90,.16)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * hw * 0.52 + fx, hh * 0.22, hw * 0.24, hh * 0.13, 0, 0, TAU); ctx.fill(); } }
  ctx.restore();
  // ---- eyes
  const ey = -hh * 0.12, ex = hw * 0.4, ew = hw * 0.25, eh = hh * 0.1;
  const open = clamp(st.open, 0, 1), lx = st.lookX * ew * 0.35 + yaw * ew * 0.25, ly = st.lookY * eh * 0.3;
  for (const s of [-1, 1]) {
    const cx = s * ex + fx * (s * yaw > 0 ? 0.9 : 1.15), w = ew * (1 - Math.max(0, -s * yaw) * 0.18);
    // socket shading
    ctx.fillStyle = 'rgba(90,40,25,.18)'; ctx.beginPath(); ctx.ellipse(cx, ey - eh * 0.2, w * 1.35, eh * 1.8, 0, 0, TAU); ctx.fill();
    const eye = () => { ctx.beginPath(); ctx.moveTo(cx - w, ey); ctx.quadraticCurveTo(cx - w * 0.1, ey - eh * 1.7 * open, cx + w, ey - eh * 0.15);
      ctx.quadraticCurveTo(cx + w * 0.1, ey + eh * 1.05 * Math.max(open, 0.25), cx - w, ey); ctx.closePath(); };
    if (open > 0.08) {
      eye(); ctx.fillStyle = '#f6f1ea'; ctx.fill();
      ctx.save(); eye(); ctx.clip();
      ctx.fillStyle = '#4a2a17'; ctx.beginPath(); ctx.arc(cx + lx, ey - eh * 0.25 + ly, eh * 1.0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0e08'; ctx.beginPath(); ctx.arc(cx + lx, ey - eh * 0.25 + ly, eh * 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(cx + lx - eh * 0.35, ey - eh * 0.6 + ly, eh * 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(80,40,20,.25)'; ctx.fillRect(cx - w, ey - eh * 2, w * 2, eh * 0.75);   // lid shadow
      ctx.restore();
    }
    // upper lid line + lashes
    ctx.strokeStyle = '#1b0f0b'; ctx.lineWidth = S.male ? 4.5 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 1.04, ey + 1); ctx.quadraticCurveTo(cx - w * 0.1, ey - eh * 1.75 * open, cx + w * 1.04, ey - eh * 0.15); ctx.stroke();
    if (!S.male) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + s * w * 0.95, ey - eh * 0.3); ctx.lineTo(cx + s * w * 1.25, ey - eh * 0.75); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(60,30,20,.45)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - w * 0.85, ey + eh * 0.35); ctx.quadraticCurveTo(cx, ey + eh * 1.05, cx + w * 0.9, ey + eh * 0.1); ctx.stroke();
    if (!S.male) { ctx.strokeStyle = '#1b0f0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w * 0.85, ey + eh * 0.3); ctx.quadraticCurveTo(cx, ey + eh * 0.95, cx + w * 0.95, ey + eh * 0.05); ctx.stroke(); }
    // eyebrows
    const bw = st.brow, by = ey - eh * 2.6 - bw * eh * 0.6, inner = s < 0 ? 1 : -1;
    ctx.strokeStyle = S.hair; ctx.lineWidth = 9 * S.brow; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + inner * w * 0.95, by + (bw < 0 ? bw * eh * 1.6 : 0) + eh * 0.3);
    ctx.quadraticCurveTo(cx, by - eh * 0.9 - Math.max(0, bw) * eh * 0.5, cx - inner * w * 1.1, by + eh * 0.4 - (bw < 0 ? bw * eh * 0.4 : 0)); ctx.stroke();
  }
  // ---- nose
  const nx = fx * 1.25, ny = hh * 0.3;
  ctx.strokeStyle = 'rgba(95,45,25,.55)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(nx - (yaw >= 0 ? -1 : 1) * hw * 0.1, -hh * 0.05); ctx.quadraticCurveTo(nx - (yaw >= 0 ? -1 : 1) * hw * 0.14, ny * 0.6, nx - (yaw >= 0 ? -1 : 1) * hw * 0.05, ny); ctx.stroke();
  ctx.fillStyle = 'rgba(90,40,22,.6)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(nx + s * hw * 0.11, ny + 3, hw * 0.055, hh * 0.028, s * 0.4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,230,210,.25)'; ctx.beginPath(); ctx.ellipse(nx - hw * 0.03, ny - hh * 0.08, hw * 0.05, hh * 0.05, 0, 0, TAU); ctx.fill();
  if (!S.male) { ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(nx + hw * 0.13, ny - 2, 3.5, 0, TAU); ctx.fill(); }
  // ---- moustache
  const my = hh * 0.53, mx = fx * 1.15;
  if (S.moustache) {
    ctx.fillStyle = S.hair; ctx.beginPath(); ctx.moveTo(mx, my - hh * 0.1);
    ctx.bezierCurveTo(mx + hw * 0.25, my - hh * 0.15, mx + hw * 0.42, my - hh * 0.06, mx + hw * 0.46, my + hh * 0.04);
    ctx.bezierCurveTo(mx + hw * 0.3, my, mx + hw * 0.12, my - hh * 0.02, mx, my - hh * 0.01);
    ctx.bezierCurveTo(mx - hw * 0.12, my - hh * 0.02, mx - hw * 0.3, my, mx - hw * 0.46, my + hh * 0.04);
    ctx.bezierCurveTo(mx - hw * 0.42, my - hh * 0.06, mx - hw * 0.25, my - hh * 0.15, mx, my - hh * 0.1); ctx.fill();
  }
  // ---- mouth
  const mo = clamp(st.mouth, 0, 1.1), sm = st.smile, mw = hw * (0.3 + sm * 0.06 + mo * 0.02), myy = my + hh * 0.07;
  const corner = -sm * hh * 0.07;
  if (mo > 0.06) {
    ctx.fillStyle = '#3a0e10'; ctx.beginPath(); ctx.moveTo(mx - mw, myy + corner);
    ctx.quadraticCurveTo(mx, myy - hh * 0.05 - mo * hh * 0.02, mx + mw, myy + corner);
    ctx.quadraticCurveTo(mx, myy + hh * 0.06 + mo * hh * 0.22, mx - mw, myy + corner); ctx.fill();
    ctx.fillStyle = '#f4efe6'; ctx.fillRect(mx - mw * 0.6, myy - hh * 0.04, mw * 1.2, hh * 0.035 + mo * hh * 0.02);
  }
  ctx.strokeStyle = S.lips || '#7a3a2c'; ctx.lineWidth = S.male ? 4 : 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(mx - mw, myy + corner); ctx.quadraticCurveTo(mx, myy - hh * 0.03 + sm * hh * 0.04 - mo * hh * 0.03, mx + mw, myy + corner); ctx.stroke();
  // lower lip
  ctx.fillStyle = S.lips ? rgba(S.lips, 0.85) : 'rgba(140,60,45,.45)';
  ctx.beginPath(); ctx.moveTo(mx - mw * 0.75, myy + hh * 0.015 + mo * hh * 0.2); ctx.quadraticCurveTo(mx, myy + hh * 0.09 + mo * hh * 0.24, mx + mw * 0.75, myy + hh * 0.015 + mo * hh * 0.2);
  ctx.quadraticCurveTo(mx, myy + hh * 0.04 + mo * hh * 0.2, mx - mw * 0.75, myy + hh * 0.015 + mo * hh * 0.2); ctx.fill();
  if (S.lips) { ctx.fillStyle = rgba(S.lips, 0.9); ctx.beginPath(); ctx.moveTo(mx - mw * 0.8, myy - 1 + corner * 0.5); ctx.quadraticCurveTo(mx - mw * 0.3, myy - hh * 0.07, mx, myy - hh * 0.035);
    ctx.quadraticCurveTo(mx + mw * 0.3, myy - hh * 0.07, mx + mw * 0.8, myy - 1 + corner * 0.5); ctx.quadraticCurveTo(mx, myy - hh * 0.01 - mo * hh * 0.03, mx - mw * 0.8, myy - 1 + corner * 0.5); ctx.fill(); }
  // chin highlight / dimples on smile
  if (sm > 0.4) { ctx.strokeStyle = 'rgba(90,40,25,.35)'; ctx.lineWidth = 2.5; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(mx + s * mw * 1.15, myy - hh * 0.02, hh * 0.05, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke(); } }
  // ---- bindi + front hair
  if (!S.male) { ctx.fillStyle = '#c4122f'; ctx.beginPath(); ctx.arc(fx * 1.1, -hh * 0.43, 7, 0, TAU); ctx.fill(); }
  drawFrontHair(ctx, S, hw, hh, yaw, fx);
  ctx.restore();
}

function drawFrontHair(ctx, S, hw, hh, yaw, fx) {
  ctx.fillStyle = S.hair;
  if (S.hairStyle === 'bun') {
    // centre parting, hair swept to the sides over the temples
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(fx * 0.5, -hh * 1.04);
      ctx.bezierCurveTo(s * hw * 0.6 + fx * 0.3, -hh * 1.06, s * hw * 1.08, -hh * 0.7, s * hw * 1.04, -hh * 0.05);
      ctx.bezierCurveTo(s * hw * 0.98, -hh * 0.25, s * hw * 0.82, -hh * 0.55, s * hw * 0.45 + fx * 0.4, -hh * 0.72);
      ctx.quadraticCurveTo(s * hw * 0.15 + fx * 0.4, -hh * 0.78, fx * 0.5, -hh * 0.86); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#c4122f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx * 0.5, -hh * 1.02); ctx.lineTo(fx * 0.5, -hh * 0.88); ctx.stroke();  // sindoor
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 3;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(fx * 0.5 + s * 10, -hh * (1.0 - i * 0.02)); ctx.quadraticCurveTo(s * hw * (0.6 + i * 0.1), -hh * 0.95, s * hw * (0.95 - i * 0.05), -hh * 0.3); ctx.stroke(); }
    return;
  }
  // men: hair mass with a hairline, side part / wavy top
  const top = -hh * 1.12, hl = -hh * 0.62;
  ctx.beginPath(); ctx.moveTo(-hw * 1.0, -hh * 0.08);
  ctx.bezierCurveTo(-hw * 1.12, -hh * 0.9, -hw * 0.6, top - hh * 0.1, fx * 0.3, top - hh * 0.05);
  ctx.bezierCurveTo(hw * 0.7, top - hh * 0.08, hw * 1.15, -hh * 0.85, hw * 1.0, -hh * 0.08);
  ctx.lineTo(hw * 0.9, -hh * 0.2); ctx.quadraticCurveTo(hw * 0.88, hl, hw * 0.55 + fx * 0.3, hl - hh * 0.04);
  if (S.hairStyle === 'side') { ctx.quadraticCurveTo(fx * 0.3, hl - hh * 0.2, -hw * 0.3 + fx * 0.3, hl - hh * 0.05); ctx.quadraticCurveTo(-hw * 0.75, hl - hh * 0.02, -hw * 0.88, -hh * 0.2); }
  else { for (let i = 0; i < 4; i++) { const x = hw * 0.5 - (i + 1) * hw * 0.32 + fx * 0.3; ctx.quadraticCurveTo(x + hw * 0.16, hl - hh * 0.02, x, hl + hh * 0.05 * ((i % 2) ? -1 : 1)); } ctx.quadraticCurveTo(-hw * 0.85, hl, -hw * 0.88, -hh * 0.2); }
  ctx.closePath(); ctx.fill();
  // sideburns
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * hw * 0.9, -hh * 0.3); ctx.lineTo(s * hw * 0.98, -hh * 0.3); ctx.lineTo(s * hw * 0.95, hh * 0.05); ctx.lineTo(s * hw * 0.88, hh * 0.02); ctx.fill(); }
  // sheen
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-hw * 0.6 + i * hw * 0.3, top + hh * 0.12); ctx.quadraticCurveTo(-hw * 0.4 + i * hw * 0.32, top + hh * 0.02, -hw * 0.1 + i * hw * 0.32, top + hh * 0.2); ctx.stroke(); }
  if (S.hairStyle === 'side') { ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-hw * 0.35 + fx * 0.3, top + hh * 0.05); ctx.quadraticCurveTo(-hw * 0.4, hl - hh * 0.15, -hw * 0.3, hl - hh * 0.08); ctx.stroke(); }
}

// ------------------------------------------------------------------ arms & hands
// arm = [a1 (shoulder: 0 = hanging, + = outward), a2 (elbow bend, + = forearm swings inward/up), hand]
function drawArm(ctx, S, st, H, sw, shY, side, arm) {
  const [a1, a2, hand] = arm;
  const sx = side * sw * 0.76, sy = shY + 34;
  const uL = H * 0.185, fL = H * 0.165, r1 = H * (S.male ? 0.031 : 0.025) * Math.sqrt(S.girth), r2 = r1 * 0.84, r3 = r1 * 0.7;
  const ang1 = a1 * side, dir1 = Math.PI / 2 - ang1;                 // canvas angle (down = +PI/2)
  const ex = sx + Math.cos(dir1) * uL, ey = sy + Math.sin(dir1) * uL;
  const dir2 = dir1 + a2 * side;
  const hx = ex + Math.cos(dir2) * fL, hy = ey + Math.sin(dir2) * fL;
  const sleeve = S.male ? (S.jacket ? S.kurta : S.kurta) : S.blouse;
  // upper arm
  capsule(ctx, sx, sy, ex, ey, r1, r2); ctx.fillStyle = shadeFill(ctx, sleeve, sx - r1, sy, sx + r1, sy, 1.12, 0.75); ctx.fill();
  if (!S.male) { // short blouse sleeve, then bare arm
    const k = 0.42, mx = sx + (ex - sx) * k, my = sy + (ey - sy) * k;
    capsule(ctx, mx, my, ex, ey, r2 * 0.92, r2 * 0.85); ctx.fillStyle = shadeFill(ctx, S.skin, mx - r1, my, mx + r1, my, 1.05, 0.8); ctx.fill();
    ctx.strokeStyle = S.border; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(mx - Math.cos(dir1 + Math.PI / 2) * r2, my - Math.sin(dir1 + Math.PI / 2) * r2); ctx.lineTo(mx + Math.cos(dir1 + Math.PI / 2) * r2, my + Math.sin(dir1 + Math.PI / 2) * r2); ctx.stroke();
  }
  // forearm
  capsule(ctx, ex, ey, hx, hy, r2, r3);
  ctx.fillStyle = S.male ? shadeFill(ctx, sleeve, ex - r2, ey, ex + r2, ey, 1.08, 0.72) : shadeFill(ctx, S.skin, ex - r2, ey, ex + r2, ey, 1.05, 0.8); ctx.fill();
  if (S.male) { // cuff
    const cx = hx - Math.cos(dir2) * r3 * 0.6, cy = hy - Math.sin(dir2) * r3 * 0.6;
    capsule(ctx, cx - Math.cos(dir2) * 10, cy - Math.sin(dir2) * 10, cx, cy, r3 * 1.05, r3 * 1.05); ctx.fillStyle = hex(sleeve, 0.85); ctx.fill();
  } else { // bangles
    for (let i = 0; i < 4; i++) { const k = 0.72 + i * 0.06, bx = ex + (hx - ex) * k, by = ey + (hy - ey) * k;
      ctx.strokeStyle = i % 2 ? '#c4122f' : S.bangles; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(bx, by, r3 * 1.15, 4, dir2 + Math.PI / 2, 0, TAU); ctx.stroke(); }
  }
  drawHand(ctx, S, hx, hy, dir2, side, hand, r3);
  arm.hand = [hx, hy, dir2];
}

function drawHand(ctx, S, x, y, dir, side, kind, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir - Math.PI / 2);   // hand points along +y after this
  const s = side, L = r * 2.5, W = r * 1.05;
  ctx.fillStyle = shadeFill(ctx, S.skin, -W, 0, W, 0, 1.08, 0.82);
  ctx.strokeStyle = 'rgba(95,45,25,.4)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const mitten = (len) => { ctx.beginPath(); ctx.moveTo(-W * 0.85, L * 0.05); ctx.bezierCurveTo(-W * 1.05, L * 0.4, -W * 0.95, len * 0.85, -W * 0.45, len);
    ctx.quadraticCurveTo(0, len * 1.08, W * 0.5, len * 0.98); ctx.bezierCurveTo(W * 0.95, len * 0.85, W * 1.0, L * 0.4, W * 0.85, L * 0.05); ctx.closePath(); ctx.fill(); };
  const thumb = (x1, y1, x2, y2) => { capsule(ctx, x1, y1, x2, y2, W * 0.3, W * 0.24); ctx.fill(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 * 0.7 + x1 * 0.3, y2 * 0.7 + y1 * 0.3); ctx.stroke(); };
  if (kind === 'point') {
    mitten(L * 0.75); thumb(-s * W * 0.7, L * 0.3, -s * W * 0.4, L * 0.72);
    capsule(ctx, s * W * 0.45, L * 0.6, s * W * 0.5, L * 1.45, W * 0.26, W * 0.22); ctx.fill();
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.6 + i * W * 0.45, L * 0.74); ctx.lineTo(-W * 0.55 + i * W * 0.45, L * 0.6); ctx.stroke(); }
  } else if (kind === 'fist' || kind === 'hold') {
    mitten(L * 0.8);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.55 + i * W * 0.5, L * 0.8); ctx.lineTo(-W * 0.5 + i * W * 0.5, L * 0.62); ctx.stroke(); }
    thumb(-s * W * 0.75, L * 0.3, -s * W * 0.2, L * 0.55);
  } else if (kind === 'thumb') {
    mitten(L * 0.8); thumb(-s * W * 0.6, L * 0.35, -s * W * 1.0, -L * 0.25);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.55 + i * W * 0.5, L * 0.8); ctx.lineTo(-W * 0.5 + i * W * 0.5, L * 0.62); ctx.stroke(); }
  } else if (kind === 'open') {
    mitten(L * 1.15);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.45 + i * W * 0.45, L * 1.12); ctx.lineTo(-W * 0.42 + i * W * 0.44, L * 0.72); ctx.stroke(); }
    thumb(-s * W * 0.8, L * 0.3, -s * W * 1.45, L * 0.75);
  } else { // relaxed
    mitten(L * 1.1);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.45 + i * W * 0.45, L * 1.08); ctx.lineTo(-W * 0.42 + i * W * 0.44, L * 0.8); ctx.stroke(); }
    thumb(-s * W * 0.8, L * 0.25, -s * W * 0.75, L * 0.75);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ small busts for the network scene
export function drawBust(ctx, spec, st, t) {
  ctx.save(); ctx.translate(0, spec.H * 0.62); drawPerson(ctx, spec, st, t); ctx.restore();
}
