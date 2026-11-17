// Painted human heads and clothed torsos (3/4 view, facing +x) for the stick-limbed characters.
// Ink outline + white paper halo, flat vibrant colours with one cel-shade, like the car-story figures.
const INK = '#141414';
const TAU = Math.PI * 2;
function shade(c, k) { const n = parseInt(c.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// a list of shapes is drawn twice: first a wide white halo for all of them, then fills + ink
function painter(x) {
  const list = [];
  return {
    add(path, fill, inkW = 6, extra) { list.push({ path, fill, inkW, extra }); },
    draw(halo = 16) {
      x.lineJoin = x.lineCap = 'round';
      for (const s of list) if (s.inkW > 0) { s.path(); x.lineWidth = halo + s.inkW; x.strokeStyle = '#ffffff'; x.stroke(); }
      for (const s of list) { s.path(); if (s.fill) { x.fillStyle = s.fill; x.fill(); } if (s.extra) s.extra(); if (s.inkW > 0) { s.path(); x.lineWidth = s.inkW; x.strokeStyle = INK; x.stroke(); } }
    },
  };
}
const ell = (x, cx, cy, rx, ry, rot = 0) => () => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, TAU); };

// ------------------------------------------------------------------ head (canvas 300 x 340, face centre at 150,200)
export const HEAD_W = 300, HEAD_H = 340;
export function drawHead(x, S, expr = 'smile') {
  const p = painter(x), cx = 150, cy = 200, rx = 76, ry = 86;
  const skin = S.skin;
  // back hair / veil behind the head
  if (S.veil) p.add(() => { x.beginPath(); x.moveTo(cx - 40, cy - 110); x.bezierCurveTo(cx - 140, cy - 90, cx - 140, cy + 60, cx - 110, cy + 140); x.lineTo(cx - 20, cy + 140); x.bezierCurveTo(cx - 70, cy + 40, cx - 40, cy - 40, cx + 40, cy - 96); x.closePath(); }, S.veil, 6);
  else if (S.longHair) p.add(() => { x.beginPath(); x.ellipse(cx - 34, cy + 10, 78, 108, 0, 0, TAU); }, S.hair, 6);
  // ear
  if (!S.veil) p.add(ell(x, cx - 66, cy + 6, 15, 21), skin, 5);
  // face
  const face = () => { x.beginPath(); x.moveTo(cx - 20, cy - ry); x.bezierCurveTo(cx + 50, cy - ry - 6, cx + rx + 10, cy - 40, cx + rx + 6, cy + 4);
    x.bezierCurveTo(cx + rx + 4, cy + 50, cx + 40, cy + ry + 2, cx + 6, cy + ry); x.bezierCurveTo(cx - 40, cy + ry - 4, cx - rx, cy + 50, cx - rx, cy);
    x.bezierCurveTo(cx - rx, cy - 50, cx - 60, cy - ry + 4, cx - 20, cy - ry); x.closePath(); };
  p.add(face, skin, 6, () => { x.save(); face(); x.clip(); x.fillStyle = shade(skin, 0.85); x.beginPath(); x.ellipse(cx - rx - 20, cy, 60, ry + 20, 0, 0, TAU); x.fill();
    if (S.female) { x.fillStyle = 'rgba(255,90,110,.35)'; x.beginPath(); x.ellipse(cx + 44, cy + 34, 18, 11, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx - 18, cy + 36, 14, 9, 0, 0, TAU); x.fill(); }
    x.restore(); });
  // beard / moustache
  if (S.beard) p.add(() => { x.beginPath(); x.moveTo(cx - rx + 6, cy + 10); x.bezierCurveTo(cx - rx + 4, cy + 70, cx - 20, cy + ry + 34, cx + 22, cy + ry + 26);
    x.bezierCurveTo(cx + 58, cy + ry + 12, cx + rx, cy + 50, cx + rx + 4, cy + 22); x.bezierCurveTo(cx + 60, cy + 46, cx + 40, cy + 40, cx + 10, cy + 52);
    x.bezierCurveTo(cx - 20, cy + 56, cx - 40, cy + 40, cx - rx + 6, cy + 10); x.closePath(); }, S.beard, 5);
  if (S.moustache || S.beard) p.add(() => { x.beginPath(); x.moveTo(cx + 2, cy + 44); x.quadraticCurveTo(cx + 34, cy + 26, cx + 64, cy + 44); x.quadraticCurveTo(cx + 36, cy + 40, cx + 30, cy + 48); x.quadraticCurveTo(cx + 18, cy + 40, cx + 2, cy + 44); x.closePath(); }, S.beard || S.hair, 4);
  // eyes (near eye on the right is larger)
  const eyes = [[cx + 4, cy - 12, 19], [cx + 50, cy - 12, 21]];
  for (const [ex, ey, er] of eyes) {
    if (expr === 'blink' || expr === 'happy') p.add(() => { x.beginPath(); x.arc(ex, ey + 4, er * 0.75, Math.PI * 1.1, Math.PI * 1.9); }, null, 5);
    else p.add(ell(x, ex, ey, er * 0.82, er), '#ffffff', 5, () => {
      const dx = expr === 'sad' ? 2 : 6, dy = expr === 'sad' ? 6 : expr === 'wow' ? -2 : 1;
      x.fillStyle = INK; x.beginPath(); x.arc(ex + dx, ey + dy, er * (expr === 'wow' ? 0.36 : 0.46), 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + dx - 4, ey + dy - 5, er * 0.15, 0, TAU); x.fill(); });
    if (S.female) p.add(() => { x.beginPath(); x.moveTo(ex + er * 0.6, ey - er * 0.8); x.lineTo(ex + er * 1.05, ey - er * 1.15); }, null, 4);
  }
  // brows
  const by = cy - 46;
  const brow = (x1, x2, tilt) => () => { x.beginPath(); x.moveTo(x1, by + tilt); x.quadraticCurveTo((x1 + x2) / 2, by - 10, x2, by - tilt); };
  const bt = expr === 'sad' ? -9 : expr === 'focus' ? 6 : expr === 'wow' ? -4 : 0;
  p.add(brow(cx - 12, cx + 20, -bt), null, S.female ? 5 : 9); p.add(brow(cx + 34, cx + 70, bt), null, S.female ? 5 : 9);
  if (expr === 'wow') { /* raised brows handled by bt */ }
  // nose (3/4: on the right of centre)
  p.add(() => { x.beginPath(); x.moveTo(cx + 30, cy - 2); x.quadraticCurveTo(cx + 46, cy + 24, cx + 36, cy + 30); x.quadraticCurveTo(cx + 30, cy + 32, cx + 26, cy + 28); }, null, 5);
  if (S.female) { p.add(ell(x, cx + 24, cy - 42, 6, 6), '#e0102f', 3); p.add(() => { x.beginPath(); x.arc(cx + 38, cy + 34, 9, -0.5, 4.6); }, null, 0);
    p.add(() => { x.beginPath(); x.arc(cx + 40, cy + 34, 9, -1.2, 3.4); }, null, 0, () => { x.lineWidth = 3.5; x.strokeStyle = '#ffc93c'; x.beginPath(); x.arc(cx + 40, cy + 36, 9, -1.4, 3.2); x.stroke(); }); }
  // mouth
  const mx = cx + 30, my = cy + 56;
  if (expr === 'happy' || expr === 'wow') p.add(() => { x.beginPath(); if (expr === 'wow') x.ellipse(mx, my + 4, 9, 12, 0, 0, TAU); else { x.moveTo(mx - 22, my - 4); x.quadraticCurveTo(mx, my - 6, mx + 24, my - 6); x.quadraticCurveTo(mx + 14, my + 22, mx - 4, my + 18); x.quadraticCurveTo(mx - 16, my + 12, mx - 22, my - 4); x.closePath(); } }, '#8a1c2a', 5);
  else if (expr === 'sad') p.add(() => { x.beginPath(); x.moveTo(mx - 16, my + 10); x.quadraticCurveTo(mx, my - 4, mx + 18, my + 8); }, null, 5);
  else if (expr === 'focus') p.add(() => { x.beginPath(); x.moveTo(mx - 14, my + 4); x.lineTo(mx + 16, my + 2); }, null, 5);
  else p.add(() => { x.beginPath(); x.moveTo(mx - 18, my); x.quadraticCurveTo(mx + 2, my + 14, mx + 22, my - 2); }, null, 5);
  if (S.female && expr !== 'happy' && expr !== 'wow') p.add(ell(x, mx + 2, my + 5, 9, 4), S.lips || '#d8264a', 0);
  if (expr === 'sad') p.add(() => { x.beginPath(); x.moveTo(cx + 52, cy + 10); x.quadraticCurveTo(cx + 44, cy + 26, cx + 52, cy + 30); x.quadraticCurveTo(cx + 60, cy + 26, cx + 52, cy + 10); x.closePath(); }, '#5ec8ff', 3);
  // hair / turban / veil on top
  if (S.turban) {
    const tb = () => { x.beginPath(); x.moveTo(cx - rx - 8, cy - 18); x.bezierCurveTo(cx - rx - 26, cy - 110, cx - 10, cy - 150, cx + 40, cy - 132);
      x.bezierCurveTo(cx + 84, cy - 118, cx + rx + 14, cy - 82, cx + rx + 4, cy - 46); x.bezierCurveTo(cx + 40, cy - 70, cx - 20, cy - 62, cx - rx - 8, cy - 18); x.closePath(); };
    p.add(tb, S.turban, 6, () => { x.save(); tb(); x.clip(); x.strokeStyle = shade(S.turban, 0.75); x.lineWidth = 6;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(cx - rx - 10, cy - 30 - i * 26); x.quadraticCurveTo(cx + 10, cy - 70 - i * 22, cx + rx + 10, cy - 60 - i * 18); x.stroke(); }
      if (S.turbanBand) { x.strokeStyle = S.turbanBand; x.lineWidth = 9; x.beginPath(); x.moveTo(cx - rx - 10, cy - 34); x.quadraticCurveTo(cx + 10, cy - 76, cx + rx + 10, cy - 64); x.stroke(); }
      x.restore(); });
    if (S.jewel) { p.add(ell(x, cx + 42, cy - 98, 13, 15), S.jewel, 4); p.add(() => { x.beginPath(); x.moveTo(cx + 40, cy - 110); x.bezierCurveTo(cx + 20, cy - 170, cx + 70, cy - 190, cx + 92, cy - 176); x.bezierCurveTo(cx + 60, cy - 166, cx + 52, cy - 140, cx + 48, cy - 110); x.closePath(); }, '#ffe08a', 4); }
  } else if (S.veil) {
    p.add(() => { x.beginPath(); x.moveTo(cx - rx - 14, cy + 40); x.bezierCurveTo(cx - rx - 30, cy - 90, cx - 10, cy - 128, cx + 50, cy - 104); x.bezierCurveTo(cx + 74, cy - 92, cx + rx + 8, cy - 74, cx + rx + 2, cy - 54);
      x.bezierCurveTo(cx + 40, cy - 80, cx - 30, cy - 70, cx - rx + 6, cy + 30); x.closePath(); }, S.veil, 6, () => { x.strokeStyle = '#ffc93c'; x.lineWidth = 7; x.beginPath(); x.moveTo(cx + rx + 2, cy - 54); x.bezierCurveTo(cx + 40, cy - 80, cx - 30, cy - 70, cx - rx + 6, cy + 30); x.stroke(); });
    p.add(() => { x.beginPath(); x.moveTo(cx - 10, cy - 76); x.quadraticCurveTo(cx + 30, cy - 92, cx + 60, cy - 72); x.quadraticCurveTo(cx + 20, cy - 66, cx - 10, cy - 76); x.closePath(); }, S.hair, 0);
    if (S.tikka) { p.add(ell(x, cx + 24, cy - 70, 8, 10), S.tikka, 3); }
  } else if (S.cap) {
    p.add(() => { x.beginPath(); x.moveTo(cx - rx - 4, cy - 40); x.bezierCurveTo(cx - rx, cy - 120, cx + rx, cy - 126, cx + rx + 6, cy - 46); x.lineTo(cx + rx + 50, cy - 40); x.lineTo(cx + rx + 40, cy - 30); x.lineTo(cx - rx - 4, cy - 30); x.closePath(); }, S.cap, 6);
  } else {
    p.add(() => { x.beginPath(); x.moveTo(cx - rx - 2, cy + 6); x.bezierCurveTo(cx - rx - 14, cy - 96, cx - 20, cy - 120, cx + 30, cy - 104); x.bezierCurveTo(cx + 74, cy - 94, cx + rx + 6, cy - 60, cx + rx + 2, cy - 36);
      x.bezierCurveTo(cx + 40, cy - 64, cx - 10, cy - 70, cx - 34, cy - 54); x.bezierCurveTo(cx - 50, cy - 30, cx - 56, cy - 10, cx - rx - 2, cy + 6); x.closePath(); }, S.hair, 6);
  }
  if (S.female) p.add(() => { x.beginPath(); x.moveTo(cx - 66, cy + 24); x.lineTo(cx - 72, cy + 54); x.lineTo(cx - 60, cy + 54); x.closePath(); }, '#ffc93c', 3);
  p.draw();
}

// ------------------------------------------------------------------ torso (canvas 300 x 520; hip line at y=330)
export const TORSO_W = 300, TORSO_H = 520, HIP_Y = 330;
export function drawTorso(x, S) {
  const p = painter(x), c = S.cloth, cx = 150, sh = 52, waist = 260;
  const neck = () => { x.beginPath(); x.rect(cx - 20, 6, 40, 56); };
  p.add(neck, S.skin, 5);
  const top = (bottom, flare) => () => { x.beginPath(); x.moveTo(cx - 40, sh - 8); x.quadraticCurveTo(cx - 74, sh - 6, cx - 76, sh + 30); x.lineTo(cx - 60, waist);
    x.lineTo(cx - 60 - flare, bottom); x.quadraticCurveTo(cx, bottom + 14, cx + 60 + flare, bottom); x.lineTo(cx + 60, waist); x.lineTo(cx + 76, sh + 30); x.quadraticCurveTo(cx + 74, sh - 6, cx + 40, sh - 8); x.closePath(); };
  const cel = (path, col) => () => { x.save(); path(); x.clip(); x.fillStyle = shade(col, 0.82); x.fillRect(0, 0, cx - 30, 600); x.restore(); };
  const dots = (path, col) => () => { x.save(); path(); x.clip(); x.fillStyle = col; for (let y = 70; y < 520; y += 26) for (let xx = 40; xx < 270; xx += 26) { x.beginPath(); x.arc(xx + ((y / 26) % 2) * 13, y, 3.5, 0, TAU); x.fill(); } x.restore(); };
  if (S.kind === 'jama' || S.kind === 'royal') {
    // fitted bodice + flared skirt to below the knee
    const bodice = top(waist, 0), skirt = () => { x.beginPath(); x.moveTo(cx - 60, waist - 4); x.lineTo(cx - 118, 505); x.quadraticCurveTo(cx, 522, cx + 118, 505); x.lineTo(cx + 60, waist - 4); x.closePath(); };
    p.add(skirt, c, 6, () => { cel(skirt, c)(); x.strokeStyle = shade(c, 0.7); x.lineWidth = 4; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(cx + i * 16, waist + 10); x.lineTo(cx + i * 34, 505); x.stroke(); }
      if (S.trim) { x.save(); skirt(); x.clip(); x.fillStyle = S.trim; x.fillRect(0, 486, 300, 24); x.restore(); } });
    p.add(bodice, c, 6, () => { cel(bodice, c)(); if (S.pattern) dots(bodice, S.pattern)(); x.strokeStyle = S.trim || shade(c, 0.6); x.lineWidth = 6; x.beginPath(); x.moveTo(cx - 30, sh - 6); x.quadraticCurveTo(cx + 20, sh + 80, cx + 54, sh + 150); x.stroke(); });
    p.add(() => { x.beginPath(); x.rect(cx - 64, waist - 18, 128, 30); }, S.sash, 5);
    p.add(() => { x.beginPath(); x.moveTo(cx + 20, waist + 8); x.lineTo(cx + 44, waist + 8); x.lineTo(cx + 50, 430); x.lineTo(cx + 14, 430); x.closePath(); }, S.sash, 5, () => { x.fillStyle = '#ffc93c'; x.fillRect(cx + 14, 414, 36, 12); });
    if (S.kind === 'royal') p.add(() => { x.beginPath(); x.moveTo(cx - 34, sh); x.quadraticCurveTo(cx, sh + 120, cx + 40, sh); }, null, 0, () => {
      for (let i = 0; i <= 14; i++) { const k = i / 14, px = (1 - k) * (1 - k) * (cx - 34) + 2 * (1 - k) * k * cx + k * k * (cx + 40), py = (1 - k) * (1 - k) * sh + 2 * (1 - k) * k * (sh + 120) + k * k * sh; x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke(); }
      x.fillStyle = '#e0102f'; x.beginPath(); x.arc(cx + 3, sh + 62, 11, 0, TAU); x.fill(); x.stroke(); });
  } else if (S.kind === 'lehenga') {
    const skirt = () => { x.beginPath(); x.moveTo(cx - 58, waist - 10); x.lineTo(cx - 134, 512); x.quadraticCurveTo(cx, 526, cx + 134, 512); x.lineTo(cx + 58, waist - 10); x.closePath(); };
    p.add(skirt, c, 6, () => { cel(skirt, c)(); if (S.pattern) dots(skirt, S.pattern)(); x.save(); skirt(); x.clip(); x.fillStyle = S.trim; x.fillRect(0, 486, 300, 30); x.restore(); });
    const bod = top(waist, 0); p.add(bod, S.top || S.trim, 6, cel(bod, S.top || S.trim));
    // veil falling over one shoulder
    p.add(() => { x.beginPath(); x.moveTo(cx - 76, sh + 10); x.quadraticCurveTo(cx - 20, sh + 140, cx + 70, waist + 30); x.lineTo(cx + 60, waist + 70); x.quadraticCurveTo(cx - 40, sh + 170, cx - 90, sh + 60); x.closePath(); }, S.veil, 5,
      () => { x.strokeStyle = '#ffc93c'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx + 60, waist + 70); x.quadraticCurveTo(cx - 40, sh + 170, cx - 90, sh + 60); x.stroke(); });
    p.add(() => { x.beginPath(); x.moveTo(cx - 30, sh); x.quadraticCurveTo(cx, sh + 60, cx + 34, sh); }, null, 0, () => { x.strokeStyle = '#ffc93c'; x.lineWidth = 8; x.beginPath(); x.moveTo(cx - 30, sh); x.quadraticCurveTo(cx, sh + 60, cx + 34, sh); x.stroke(); });
  } else if (S.kind === 'worker') {
    // kurta to mid-thigh over a white dhoti
    const dhoti = () => { x.beginPath(); x.moveTo(cx - 62, waist); x.lineTo(cx - 84, 470); x.lineTo(cx + 84, 470); x.lineTo(cx + 62, waist); x.closePath(); };
    p.add(dhoti, S.dhoti || '#fbf7ee', 6, () => { cel(dhoti, S.dhoti || '#fbf7ee')(); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 4; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(cx + i * 18, 380); x.lineTo(cx + i * 24, 470); x.stroke(); } });
    const k = top(390, 14); p.add(k, c, 6, () => { cel(k, c)(); if (S.pattern) dots(k, S.pattern)(); });
    if (S.sash) p.add(() => { x.beginPath(); x.rect(cx - 66, waist - 12, 132, 24); }, S.sash, 5);
  } else { // modern tourist: t-shirt / kurti + trousers hint
    const k = top(S.long ? 430 : 350, S.long ? 20 : 4); p.add(k, c, 6, () => { cel(k, c)(); if (S.pattern) dots(k, S.pattern)(); if (S.logo) { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + 12, 150, 24, 0, TAU); x.fill(); } });
    if (S.bag) p.add(() => { x.beginPath(); x.rect(cx - 96, 210, 44, 60); }, S.bag, 5);
  }
  // shoulders (arm sockets)
  for (const sx of [-1, 1]) p.add(ell(x, cx + sx * 66, sh + 22, 24, 22), S.kind === 'lehenga' ? (S.top || S.trim) : c, 5);
  p.draw();
}
