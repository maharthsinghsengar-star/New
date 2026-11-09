import { useId } from 'react'
import { motion } from 'framer-motion'
import { getFinish } from '../../data/finishes'
import {
  BOTTLE_VB,
  CX,
  GAP,
  GROUND,
  RAMP_OFFSETS,
  RIM_A,
  RIM_B,
  bandPath,
  cylinderPath,
  cylinderStations,
  frontArc,
  getBottleGeometry,
  safeId,
} from './geometry'

const SEGMENTS = 10
const VB_BOTTOM = BOTTLE_VB.y + BOTTLE_VB.height
const SKEW = Math.tan((12 * Math.PI) / 180)

/**
 * Original 3D-style "studio render" of an AQUORA smart bottle.
 *
 * - model / finish / level / temp / sleeve: what is drawn
 * - animated: LED level segments light up one by one
 * - live: continuous lighting (pulsing rims, glowing ring, light sweep) — keep
 *   it for hero-sized renders so small cards stay cheap on iPhone
 * - highlightX: optional MotionValue (user units) that slides the reflections,
 *   making the bottle feel like it turns with the pointer or scroll
 * - led: optional colour override for the glow ring / LEDs
 */
export function Bottle({
  model = 'pulse',
  finish = 'midnight',
  level = 0.7,
  animated = false,
  live = false,
  glow = true,
  reflection = true,
  temp = 7,
  sleeve = null,
  led,
  highlightX,
  className,
  style,
  title,
}) {
  const uid = safeId(useId())
  const id = (name) => `${uid}-${name}`
  const url = (name) => `url(#${id(name)})`

  const f = getFinish(finish)
  const g = getBottleGeometry(model)
  const { L, R, w, rx, ry, bodyTop, bodyBottom, base, capTop, capBottom, bodyH, capH } = g
  const ledColor = led ?? f.led

  const bodyPath = cylinderPath(L, R, bodyTop, bodyBottom, rx, ry)
  const capPath = cylinderPath(L, R, capTop, capBottom, rx, ry)
  const ringPath = bandPath(L, R, capBottom, bodyTop, rx, ry)
  const ringMid = frontArc(L, R, capBottom + GAP / 2, rx, ry)

  const segTop = bodyTop + bodyH * 0.16
  const segBottom = bodyTop + bodyH * 0.72
  const segStep = (segBottom - segTop) / SEGMENTS
  const lit = Math.max(0, Math.min(SEGMENTS, Math.round(level * SEGMENTS)))
  const segX = CX + w * 0.22 - 2

  const ribs = g.grip ? cylinderStations(26) : []
  const brushed = g.brushed ? cylinderStations(56) : []

  const sl = sleeve ? getFinish(sleeve) : null
  const sTop = bodyTop + bodyH * 0.46
  const sx = L - 3
  const sw = w + 6
  const sleevePath = sl ? cylinderPath(sx, sx + sw, sTop, bodyBottom + 1.5, sw / 2, ry * 1.03) : null
  const win = { x: segX - 3, y: sTop + ry + 10, w: 10, h: segBottom - sTop - ry - 4 }

  const liveClass = (cls) => (live ? cls : undefined)

  // Environment reflections that slide with highlightX (key softbox, hot line, fill).
  const reflections = (top, height) => (
    <motion.g style={highlightX ? { x: highlightX } : undefined}>
      <rect x={L + w * 0.16} y={top} width={w * 0.15} height={height} rx={w * 0.07} fill={url('spec')} opacity={f.spec * 0.75} filter={url('soft')} />
      <rect x={L + w * 0.215} y={top + 6} width={w * 0.028} height={height - 12} rx={w * 0.014} fill={url('spec')} opacity={Math.min(1, f.spec * 1.5)} />
      <rect x={L + w * 0.6} y={top} width={w * 0.13} height={height} rx={w * 0.06} fill={url('spec')} opacity={f.spec * 0.22} filter={url('soft')} />
    </motion.g>
  )

  // Coloured studio rim lights — fixed to the camera, pulsing when live.
  const rims = (top, height) => (
    <>
      <rect x={L + w * 0.02} y={top} width={w * 0.05} height={height} fill={url('rimA')} filter={url('soft')} className={liveClass('animate-rim-a')} opacity="0.75" />
      <rect x={L + w * 0.9} y={top} width={w * 0.06} height={height} fill={url('rimB')} filter={url('soft')} className={liveClass('animate-rim-b')} opacity="0.75" />
    </>
  )

  // Cinematic light sweep (live only).
  const sweep = (top, height) =>
    live ? (
      <g transform={`translate(${(top + height / 2) * SKEW} 0) skewX(-12)`}>
        <rect className="bottle-sweep" x={L - w * 0.45 - 40} y={top - 20} width={w * 0.45} height={height + 40} fill={url('sweep')} />
      </g>
    ) : null

  const ledColumn = (
    <>
      {lit > 0 && (
        <rect
          x={segX - 2}
          y={segBottom - lit * segStep}
          width="8"
          height={lit * segStep}
          rx="4"
          fill={ledColor}
          opacity="0.55"
          filter={url('bloom')}
        />
      )}
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const on = i < lit
        return (
          <rect
            key={i}
            x={segX}
            y={segBottom - (i + 1) * segStep + 1.5}
            width="4"
            height={segStep - 3}
            rx="2"
            fill={on ? ledColor : '#ffffff'}
            opacity={on ? 1 : 0.1}
            className={on && animated ? 'animate-seg-in' : undefined}
            style={on && animated ? { animationDelay: `${0.5 + i * 0.12}s` } : undefined}
          />
        )
      })}
    </>
  )

  return (
    <svg
      viewBox={`${BOTTLE_VB.x} ${BOTTLE_VB.y} ${BOTTLE_VB.width} ${BOTTLE_VB.height}`}
      className={className}
      style={{ aspectRatio: `${BOTTLE_VB.width} / ${BOTTLE_VB.height}`, overflow: 'visible', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={id('body')} x1="0" x2="1" y1="0" y2="0">
          {f.body.map((c, i) => (
            <stop key={i} offset={RAMP_OFFSETS[i]} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={id('cap')} x1="0" x2="1" y1="0" y2="0">
          {f.cap.map((c, i) => (
            <stop key={i} offset={RAMP_OFFSETS[i]} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={id('capTop')} x1="0" x2="0.35" y1="0" y2="1">
          <stop offset="0" stopColor={f.cap[2]} />
          <stop offset="1" stopColor={f.cap[1]} />
        </linearGradient>
        {f.tint && (
          <linearGradient id={id('tint')} x1="0" y1="0" x2="0.4" y2="1">
            {f.tint.map((c, i) => (
              <stop key={i} offset={i / (f.tint.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        )}
        <linearGradient id={id('falloff')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={id('spec')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.08" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('rimA')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={RIM_A} stopOpacity="0" />
          <stop offset="0.2" stopColor={RIM_A} stopOpacity="0.9" />
          <stop offset="0.8" stopColor={RIM_A} stopOpacity="0.6" />
          <stop offset="1" stopColor={RIM_A} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('rimB')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={RIM_B} stopOpacity="0" />
          <stop offset="0.25" stopColor={RIM_B} stopOpacity="0.85" />
          <stop offset="0.85" stopColor={RIM_B} stopOpacity="0.6" />
          <stop offset="1" stopColor={RIM_B} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('edge')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={RIM_A} stopOpacity="0.95" />
          <stop offset="0.14" stopColor={RIM_A} stopOpacity="0" />
          <stop offset="0.86" stopColor={RIM_B} stopOpacity="0" />
          <stop offset="1" stopColor={RIM_B} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={id('sweep')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('core')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.12" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.88" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('spill')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ledColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={ledColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('spillUp')} x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor={ledColor} stopOpacity="0.4" />
          <stop offset="1" stopColor={ledColor} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0" stopColor={ledColor} stopOpacity="0.3" />
          <stop offset="0.55" stopColor={ledColor} stopOpacity="0.07" />
          <stop offset="1" stopColor={ledColor} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('ambA')}>
          <stop offset="0" stopColor={RIM_A} stopOpacity="0.22" />
          <stop offset="1" stopColor={RIM_A} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('ambB')}>
          <stop offset="0" stopColor={RIM_B} stopOpacity="0.22" />
          <stop offset="1" stopColor={RIM_B} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('pool')}>
          <stop offset="0" stopColor={ledColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={ledColor} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('shadow')}>
          <stop offset="0" stopColor="#000" stopOpacity="0.9" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('screen')} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('reflFade')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={id('reflMask')} maskUnits="userSpaceOnUse" x="0" y={base} width={BOTTLE_VB.width} height={VB_BOTTOM - base}>
          <rect x="0" y={base} width={BOTTLE_VB.width} height={VB_BOTTOM - base} fill={url('reflFade')} />
        </mask>
        <clipPath id={id('bodyClip')}>
          <path d={bodyPath} />
        </clipPath>
        <clipPath id={id('capClip')}>
          <path d={capPath} />
        </clipPath>
        {sl && (
          <>
            <linearGradient id={id('sleeve')} x1="0" x2="1" y1="0" y2="0">
              {sl.body.map((c, i) => (
                <stop key={i} offset={RAMP_OFFSETS[i]} stopColor={c} />
              ))}
            </linearGradient>
            <pattern id={id('hex')} width="8" height="7" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="1.75" r="1.5" fill="#000" fillOpacity="0.32" />
              <circle cx="6" cy="5.25" r="1.5" fill="#000" fillOpacity="0.32" />
              <circle cx="1.6" cy="1.35" r="0.7" fill="#fff" fillOpacity="0.12" />
              <circle cx="5.6" cy="4.85" r="0.7" fill="#fff" fillOpacity="0.12" />
            </pattern>
            <clipPath id={id('sleeveClip')}>
              <path d={sleevePath} />
            </clipPath>
            <clipPath id={id('winClip')}>
              <rect x={win.x} y={win.y} width={win.w} height={win.h} rx="5" />
            </clipPath>
          </>
        )}
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={id('bloom')} x="-50%" y="-300%" width="200%" height="700%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Environment: brand-coloured ambient light, glow, light pool and contact shadows */}
      {glow && (
        <>
          <ellipse cx={CX - w * 0.75} cy={(capTop + GROUND) / 2} rx={w * 1.1} ry={(GROUND - capTop) * 0.45} fill={url('ambA')} className={liveClass('animate-rim-a')} />
          <ellipse cx={CX + w * 0.75} cy={(capTop + GROUND) / 2 + 30} rx={w * 1.1} ry={(GROUND - capTop) * 0.45} fill={url('ambB')} className={liveClass('animate-rim-b')} />
          <ellipse cx={CX} cy={(capTop + GROUND) / 2} rx={w * 1.25} ry={(GROUND - capTop) * 0.5} fill={url('glow')} />
        </>
      )}
      <ellipse cx={CX} cy={GROUND + 2} rx={w * 1.25} ry={20} fill={url('pool')} />
      <ellipse cx={CX} cy={GROUND} rx={w * 0.95} ry={12} fill={url('shadow')} opacity="0.55" />
      <ellipse cx={CX} cy={GROUND - 1} rx={w * 0.58} ry={5} fill={url('shadow')} />

      <g id={id('bottle')}>
        {/* ── Body ── */}
        <path d={bodyPath} fill={url('body')} />
        {f.tint && <path d={bodyPath} fill={url('tint')} opacity={f.tintOpacity} />}
        <g clipPath={url('bodyClip')}>
          {brushed.map((t, i) => (
            <line
              key={i}
              x1={CX + rx * Math.sin(t)}
              x2={CX + rx * Math.sin(t)}
              y1={bodyTop - ry}
              y2={base}
              stroke={i % 2 ? '#000' : '#fff'}
              strokeOpacity={0.06 * Math.cos(t) + 0.015}
              strokeWidth="0.8"
            />
          ))}
          <rect x={L} y={bodyTop - ry} width={w} height={bodyH + ry * 2} fill={url('falloff')} />
          <path d={bandPath(L, R, bodyTop, bodyTop + 58, rx, ry)} fill={url('spill')} />
          {reflections(bodyTop + 4, bodyH - 10)}
          {rims(bodyTop + 6, bodyH - 8)}
          {sweep(bodyTop, bodyH + ry)}
          <path d={frontArc(L, R, bodyBottom - 2, rx, ry)} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="14" filter={url('soft')} />
        </g>
        <path d={bodyPath} fill="none" stroke={url('edge')} strokeWidth="1.2" />
        <path d={frontArc(L + 2, R - 2, bodyBottom - 1, rx - 2, ry - 0.5)} fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="0.9" />

        {ledColumn}

        {/* Wordmark */}
        <text
          x={CX}
          y={bodyBottom - bodyH * 0.075}
          textAnchor="middle"
          fontFamily="'Sora Variable', 'Inter Variable', sans-serif"
          fontWeight="600"
          fontSize={w * 0.085}
          letterSpacing={w * 0.045}
          fill={f.ink}
          fillOpacity={f.inkOpacity}
        >
          AQUORA
        </text>

        {/* ── Sport sleeve (accessory) ── */}
        {sl && (
          <g>
            <path
              d={`M${sx + 2},${sTop + 30} C${sx - 36},${sTop + 48} ${sx - 36},${sTop + 136} ${sx + 2},${sTop + 154}`}
              fill="none"
              stroke={sl.body[1]}
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d={`M${sx},${sTop + 34} C${sx - 32},${sTop + 50} ${sx - 32},${sTop + 132} ${sx},${sTop + 150}`}
              fill="none"
              stroke={sl.body[2]}
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d={sleevePath} fill={url('sleeve')} />
            <g clipPath={url('sleeveClip')}>
              <rect x={sx} y={sTop - ry} width={sw} height={base - sTop + ry * 2} fill={url('hex')} />
              <rect x={sx} y={sTop - ry} width={sw} height={base - sTop + ry * 2} fill={url('falloff')} />
              {rims(sTop, base - sTop)}
              <rect x={sx + sw * 0.2} y={sTop + 8} width={sw * 0.08} height={base - sTop - 20} rx={sw * 0.04} fill={url('spec')} filter={url('soft')} opacity="0.45" />
            </g>
            <path d={sleevePath} fill="none" stroke="#fff" strokeOpacity="0.12" />
            <path d={frontArc(sx, sx + sw, sTop, sw / 2, ry * 1.03)} fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.6" />
            <rect x={sx - 3} y={sTop + 24} width="8" height="12" rx="3" fill={sl.body[0]} stroke="#fff" strokeOpacity="0.15" />
            <rect x={sx - 3} y={sTop + 148} width="8" height="12" rx="3" fill={sl.body[0]} stroke="#fff" strokeOpacity="0.15" />
            <rect x={win.x} y={win.y} width={win.w} height={win.h} rx="5" fill="#02030a" stroke="#fff" strokeOpacity="0.14" />
            <g clipPath={url('winClip')}>{ledColumn}</g>
          </g>
        )}

        {/* ── Glow ring between cap and body ── */}
        <path d={ringMid} fill="none" stroke={ledColor} strokeWidth={GAP + 10} filter={url('bloom')} opacity="0.9" className={liveClass('animate-glow')} />
        <path d={ringPath} fill={ledColor} />
        <path d={ringMid} fill="none" stroke={url('core')} strokeWidth="1.1" />
        <path d={frontArc(L, R, capBottom, rx, ry)} fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="0.8" />
        <path d={frontArc(L, R, bodyTop, rx, ry)} fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="0.8" />

        {/* ── Cap side ── */}
        <path d={capPath} fill={url('cap')} />
        <g clipPath={url('capClip')}>
          {ribs.map((t, i) => {
            const x = CX + rx * Math.sin(t)
            const c = Math.cos(t)
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={capTop + capH * 0.46 + ry * c} y2={capBottom + ry * c} stroke="#000" strokeOpacity={0.12 + 0.3 * c} strokeWidth="1.3" />
                <line x1={x + 1.1 * c} x2={x + 1.1 * c} y1={capTop + capH * 0.46 + ry * c} y2={capBottom + ry * c} stroke="#fff" strokeOpacity={0.09 * c} strokeWidth="0.8" />
              </g>
            )
          })}
          <rect x={L} y={capTop} width={w} height={capH + ry} fill={url('falloff')} opacity="0.7" />
          <path d={bandPath(L, R, capBottom - 34, capBottom, rx, ry)} fill={url('spillUp')} />
          {reflections(capTop + 4, capH)}
          {rims(capTop + 6, capH)}
          {sweep(capTop, capH + ry)}
        </g>
        <path d={capPath} fill="none" stroke={url('edge')} strokeWidth="1.2" />

        {/* ── Cap top surface ── */}
        <ellipse cx={CX} cy={capTop} rx={rx} ry={ry} fill={url('capTop')} />
        <ellipse cx={CX - rx * 0.25} cy={capTop - ry * 0.25} rx={rx * 0.5} ry={ry * 0.45} fill="#fff" opacity="0.07" />
        <path d={frontArc(L, R, capTop, rx, ry)} fill="none" stroke="#fff" strokeOpacity="0.34" strokeWidth="1.2" />
        <path d={`M${L},${capTop} A${rx},${ry} 0 0 1 ${R},${capTop}`} fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="0.8" />

        {g.display && (
          <ellipse cx={CX} cy={capTop} rx={rx * 0.32} ry={ry * 0.32} fill="#000" fillOpacity="0.4" stroke="#fff" strokeOpacity="0.12" strokeWidth="0.6" />
        )}

        {g.touchRing && (
          <g>
            <ellipse cx={CX} cy={capTop} rx={rx * 0.66} ry={ry * 0.66} fill="#04070f" fillOpacity="0.75" />
            <ellipse cx={CX} cy={capTop} rx={rx * 0.66} ry={ry * 0.66} fill="none" stroke={ledColor} strokeWidth="5" opacity="0.7" filter={url('bloom')} className={liveClass('animate-glow')} />
            <ellipse cx={CX} cy={capTop} rx={rx * 0.66} ry={ry * 0.66} fill="none" stroke={ledColor} strokeWidth="1.4" />
            <ellipse cx={CX - rx * 0.12} cy={capTop - ry * 0.18} rx={rx * 0.3} ry={ry * 0.2} fill="#fff" opacity="0.12" />
          </g>
        )}

        {g.loop && (
          <g>
            <ellipse cx={CX - w * 0.2} cy={capTop - 0.5} rx="5.5" ry="2.4" fill={f.loop} />
            <ellipse cx={CX + w * 0.2} cy={capTop - 0.5} rx="5.5" ry="2.4" fill={f.loop} />
            <path
              d={`M${CX - w * 0.2},${capTop - 1} C${CX - w * 0.2},${capTop - 40} ${CX + w * 0.2},${capTop - 40} ${CX + w * 0.2},${capTop - 1}`}
              fill="none"
              stroke={f.loop}
              strokeWidth="8.5"
              strokeLinecap="round"
            />
            <path
              d={`M${CX - w * 0.2 - 2},${capTop - 4} C${CX - w * 0.2 - 2},${capTop - 41} ${CX + w * 0.2 - 2},${capTop - 41} ${CX + w * 0.2 - 2},${capTop - 4}`}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.16"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d={`M${CX - w * 0.2 - 3.6},${capTop - 1} C${CX - w * 0.2 - 3.6},${capTop - 43} ${CX + w * 0.2 + 3.6},${capTop - 43} ${CX + w * 0.2 + 3.6},${capTop - 1}`}
              pathLength="1"
              strokeDasharray="0.42 1"
              fill="none"
              stroke={RIM_A}
              strokeOpacity="0.5"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        )}

        {g.statusDot && (
          <g>
            <circle cx={CX} cy={capTop + capH * 0.36} r="8" fill={ledColor} opacity="0.6" filter={url('bloom')} className={liveClass('animate-glow')} />
            <circle cx={CX} cy={capTop + capH * 0.36} r="2.8" fill={ledColor} />
            <circle cx={CX} cy={capTop + capH * 0.36} r="1.1" fill="#fff" opacity="0.9" />
          </g>
        )}

        {g.display && (
          <g>
            <rect x={CX - w * 0.25} y={capTop + capH * 0.24} width={w * 0.5} height={capH * 0.32} rx="8" fill="#01030a" stroke="#fff" strokeOpacity="0.12" />
            <text
              x={CX}
              y={capTop + capH * 0.24 + 10}
              textAnchor="middle"
              fontFamily="'Inter Variable', sans-serif"
              fontSize="5.5"
              letterSpacing="1.6"
              fill="#fff"
              fillOpacity="0.45"
            >
              TEMP
            </text>
            <text
              x={CX}
              y={capTop + capH * 0.24 + capH * 0.32 - 7}
              textAnchor="middle"
              fontFamily="'Sora Variable', sans-serif"
              fontWeight="600"
              fontSize="16"
              fill={ledColor}
            >
              {temp}°C
            </text>
            <rect x={CX - w * 0.25} y={capTop + capH * 0.24} width={w * 0.5} height={capH * 0.32} rx="8" fill={url('screen')} />
          </g>
        )}
      </g>

      {/* Floor reflection */}
      {reflection && (
        <g mask={url('reflMask')}>
          <use href={`#${id('bottle')}`} transform={`translate(0 ${base * 2}) scale(1 -1)`} />
        </g>
      )}
    </svg>
  )
}
