// Shared geometry for the vector product renders.

// The drawing spans y 0–600; the top 40 units are empty, so the viewBox starts at y=40.
export const BOTTLE_VB = { x: 0, y: 40, width: 240, height: 560 }
export const CX = 120
export const GROUND = 548
export const GAP = 5

const MODELS = {
  pulse: { w: 100, capH: 92, bodyH: 352, loop: true, statusDot: true, grip: true },
  mini: { w: 108, capH: 82, bodyH: 248, loop: true, statusDot: true, grip: true },
  flux: { w: 120, capH: 104, bodyH: 356, display: true },
  halo: { w: 96, capH: 96, bodyH: 364, touchRing: true, brushed: true },
}

export function getBottleGeometry(model = 'pulse') {
  const m = MODELS[model] ?? MODELS.pulse
  const L = CX - m.w / 2
  const R = CX + m.w / 2
  const bodyBottom = GROUND - 4
  const bodyTop = bodyBottom - m.bodyH
  const capBottom = bodyTop - GAP
  const capTop = capBottom - m.capH
  return { ...m, L, R, bodyTop, bodyBottom, capTop, capBottom, ringY: bodyTop - GAP / 2 }
}

/** Hotspot anchor points for the showcase, as % of the bottle viewBox. */
export function getBottleHotspots(model) {
  const g = getBottleGeometry(model)
  const pct = (x, y) => ({
    x: ((x - BOTTLE_VB.x) / BOTTLE_VB.width) * 100,
    y: ((y - BOTTLE_VB.y) / BOTTLE_VB.height) * 100,
  })
  return {
    cap: pct(CX + g.w * 0.2, g.capTop + g.capH * 0.62),
    ring: pct(g.L + g.w * 0.14, g.ringY),
    level: pct(CX + g.w * 0.22, g.bodyTop + g.bodyH * 0.44),
    interior: pct(CX - g.w * 0.2, g.bodyTop + g.bodyH * 0.6),
    base: pct(CX, g.bodyBottom - 14),
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
