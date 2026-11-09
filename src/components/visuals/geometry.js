// Shared geometry for the vector product renders.

// The drawing spans y 0–600; the top 40 units are empty, so the viewBox starts at y=40.
export const BOTTLE_VB = { x: 0, y: 40, width: 240, height: 560 }
export const CX = 120
export const GROUND = 548
export const GAP = 5

// Brand studio lighting: electric-blue key rim on the left, plasma-purple rim on the right.
export const RIM_A = '#4aa8ff'
export const RIM_B = '#a78bfa'

const MODELS = {
  pulse: { w: 100, capH: 92, bodyH: 352, loop: true, statusDot: true, grip: true },
  mini: { w: 108, capH: 82, bodyH: 248, loop: true, statusDot: true, grip: true },
  flux: { w: 120, capH: 104, bodyH: 356, display: true },
  halo: { w: 96, capH: 96, bodyH: 364, touchRing: true, brushed: true },
}

/**
 * The bottle is drawn as a cylinder seen from slightly above: every horizontal
 * edge is an ellipse with radii (rx, ry). `*Top`/`*Bottom` values are the
 * ellipse centre lines; `base` is the lowest visible point of the body.
 */
export function getBottleGeometry(model = 'pulse') {
  const m = MODELS[model] ?? MODELS.pulse
  const rx = m.w / 2
  const ry = m.w * 0.1
  const L = CX - rx
  const R = CX + rx
  const base = GROUND - 3
  const bodyBottom = base - ry
  const bodyTop = bodyBottom - m.bodyH
  const capBottom = bodyTop - GAP
  const capTop = capBottom - m.capH
  return { ...m, rx, ry, L, R, base, bodyTop, bodyBottom, capTop, capBottom }
}

/** Y of the camera-facing edge of the ellipse centred on `yc`, at horizontal position `x`. */
export function frontY(g, yc, x) {
  const t = (x - CX) / g.rx
  return yc + g.ry * Math.sqrt(Math.max(0, 1 - t * t))
}

/** Front (camera-facing) half of an ellipse, drawn left → right. */
export function frontArc(L, R, y, rx, ry) {
  return `M${L},${y} A${rx},${ry} 0 0 0 ${R},${y}`
}

/** Side surface of a cylinder: curved top edge and curved bottom edge. */
export function cylinderPath(L, R, top, bottom, rx, ry) {
  return `M${L},${top} L${L},${bottom} A${rx},${ry} 0 0 0 ${R},${bottom} L${R},${top} A${rx},${ry} 0 0 1 ${L},${top} Z`
}

/** Band between two parallel front arcs (used for the glow ring and light spill). */
export function bandPath(L, R, top, bottom, rx, ry) {
  return `M${L},${top} A${rx},${ry} 0 0 0 ${R},${top} L${R},${bottom} A${rx},${ry} 0 0 1 ${L},${bottom} Z`
}

/**
 * Evenly spaced angles around the front half of a cylinder. Projected with
 * sin(θ), lines bunch up towards the edges like real ribs on a curved surface.
 */
export function cylinderStations(count) {
  return Array.from({ length: count }, (_, i) => -Math.PI / 2 + (Math.PI * (i + 0.5)) / count)
}

/** Hotspot anchor points for the showcase, as % of the bottle viewBox. */
export function getBottleHotspots(model) {
  const g = getBottleGeometry(model)
  const pct = (x, y) => ({
    x: ((x - BOTTLE_VB.x) / BOTTLE_VB.width) * 100,
    y: ((y - BOTTLE_VB.y) / BOTTLE_VB.height) * 100,
  })
  const ringX = g.L + g.w * 0.14
  return {
    cap: pct(CX + g.w * 0.2, g.capTop + g.capH * 0.62),
    ring: pct(ringX, frontY(g, g.capBottom + GAP / 2, ringX)),
    level: pct(CX + g.w * 0.22, g.bodyTop + g.bodyH * 0.44),
    interior: pct(CX - g.w * 0.2, g.bodyTop + g.bodyH * 0.6),
    base: pct(CX, g.bodyBottom - 4),
  }
}

/** Rectangle path with independent top / bottom corner radii. */
export function rrect(x, y, w, h, rt, rb) {
  return [
    `M${x},${y + rt}`,
    `Q${x},${y} ${x + rt},${y}`,
    `L${x + w - rt},${y}`,
    `Q${x + w},${y} ${x + w},${y + rt}`,
    `L${x + w},${y + h - rb}`,
    `Q${x + w},${y + h} ${x + w - rb},${y + h}`,
    `L${x + rb},${y + h}`,
    `Q${x},${y + h} ${x},${y + h - rb}`,
    'Z',
  ].join(' ')
}

export const RAMP_OFFSETS = [0, 0.18, 0.38, 0.72, 1]

/** Turn useId() output into something safe for url(#…) references. */
export const safeId = (raw) => raw.replace(/[^a-zA-Z0-9_-]/g, '')
