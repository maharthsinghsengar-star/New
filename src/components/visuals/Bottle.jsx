import { useId } from 'react'
import { getFinish } from '../../data/finishes'
import { BOTTLE_VB, CX, GAP, GROUND, RAMP_OFFSETS, getBottleGeometry, rrect, safeId } from './geometry'

const SEGMENTS = 10
const VB_BOTTOM = BOTTLE_VB.y + BOTTLE_VB.height

/**
 * Original vector "studio render" of an AQUORA smart bottle.
 * Fully parametric: model shape, colour finish, LED fill level, glow and reflection.
 */
export function Bottle({
  model = 'pulse',
  finish = 'midnight',
  level = 0.7,
  animated = false,
  glow = true,
  reflection = true,
  temp = 7,
  sleeve = null,
  className,
  style,
  title,
}) {
  const uid = safeId(useId())
  const id = (name) => `${uid}-${name}`
  const url = (name) => `url(#${id(name)})`

  const f = getFinish(finish)
  const g = getBottleGeometry(model)
  const { L, w, bodyTop, bodyBottom, capTop, capBottom, bodyH, capH } = g

  const bodyPath = rrect(L, bodyTop, w, bodyH, 4, w * 0.2)
  const capPath = rrect(L, capTop, w, capH, w * 0.22, 3)

  const segTop = bodyTop + bodyH * 0.16
  const segBottom = bodyTop + bodyH * 0.72
  const segStep = (segBottom - segTop) / SEGMENTS
  const lit = Math.max(0, Math.min(SEGMENTS, Math.round(level * SEGMENTS)))
  const segX = CX + w * 0.22 - 2

  const sl = sleeve ? getFinish(sleeve) : null
  const sTop = bodyTop + bodyH * 0.46
  const sx = L - 3
  const sw = w + 6
  const sleevePath = sl ? rrect(sx, sTop, sw, bodyBottom + 1.5 - sTop, 6, w * 0.22) : null
  const win = { x: segX - 3, y: sTop + 12, w: 10, h: segBottom - sTop - 6 }

  const ribs = g.grip ? Array.from({ length: 23 }, (_, i) => L + 4 + (i * (w - 8)) / 22) : []
  const brushed = g.brushed ? Array.from({ length: 42 }, (_, i) => L + (((i * 37) % 97) / 97) * w) : []

  const ledColumn = (
    <>
      {lit > 0 && (
        <rect
          x={segX - 2}
          y={segBottom - lit * segStep}
          width="8"
          height={lit * segStep}
          rx="4"
          fill={f.led}
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
            fill={on ? f.led : '#ffffff'}
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
        {f.tint && (
          <linearGradient id={id('tint')} x1="0" y1="0" x2="0.4" y2="1">
            {f.tint.map((c, i) => (
              <stop key={i} offset={i / (f.tint.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        )}
        <linearGradient id={id('falloff')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={id('spec')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.12" stopColor="#fff" stopOpacity={f.spec} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={f.spec * 0.45} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('rim')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={f.rim} stopOpacity="0.9" />
          <stop offset="0.12" stopColor={f.rim} stopOpacity="0" />
          <stop offset="0.86" stopColor={f.rim} stopOpacity="0" />
          <stop offset="1" stopColor={f.rim} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={id('spill')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={f.led} stopOpacity="0.5" />
          <stop offset="1" stopColor={f.led} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('spillUp')} x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor={f.led} stopOpacity="0.38" />
          <stop offset="1" stopColor={f.led} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0" stopColor={f.led} stopOpacity="0.32" />
          <stop offset="0.55" stopColor={f.led} stopOpacity="0.08" />
          <stop offset="1" stopColor={f.led} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('pool')}>
          <stop offset="0" stopColor={f.led} stopOpacity="0.5" />
          <stop offset="1" stopColor={f.led} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('shadow')}>
          <stop offset="0" stopColor="#000" stopOpacity="0.85" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('screen')} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('reflFade')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask
          id={id('reflMask')}
          maskUnits="userSpaceOnUse"
          x="0"
          y={bodyBottom}
          width={BOTTLE_VB.width}
          height={VB_BOTTOM - bodyBottom}
        >
          <rect x="0" y={bodyBottom} width={BOTTLE_VB.width} height={VB_BOTTOM - bodyBottom} fill={url('reflFade')} />
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

      {/* Environment: back glow, light pool and contact shadow */}
      {glow && (
        <ellipse cx={CX} cy={(capTop + GROUND) / 2} rx={w * 1.3} ry={(GROUND - capTop) * 0.52} fill={url('glow')} />
      )}
      <ellipse cx={CX} cy={GROUND + 2} rx={w * 1.2} ry={20} fill={url('pool')} />
      <ellipse cx={CX} cy={GROUND} rx={w * 0.62} ry={7} fill={url('shadow')} />

      <g id={id('bottle')}>
        {/* Carry loop */}
        {g.loop && (
          <g>
            <path
              d={`M${CX - w * 0.2},${capTop + 8} C${CX - w * 0.2},${capTop - 34} ${CX + w * 0.2},${capTop - 34} ${CX + w * 0.2},${capTop + 8}`}
              fill="none"
              stroke={f.loop}
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d={`M${CX - w * 0.2 - 1.5},${capTop + 4} C${CX - w * 0.2 - 1.5},${capTop - 36} ${CX + w * 0.2 - 1.5},${capTop - 36} ${CX + w * 0.2 - 1.5},${capTop + 4}`}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.14"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Body */}
        <path d={bodyPath} fill={url('body')} />
        {f.tint && <path d={bodyPath} fill={url('tint')} opacity={f.tintOpacity} />}
        <g clipPath={url('bodyClip')}>
          {brushed.map((x, i) => (
            <line
              key={i}
              x1={x}
              x2={x}
              y1={bodyTop}
              y2={bodyBottom}
              stroke={i % 2 ? '#000' : '#fff'}
              strokeOpacity="0.05"
              strokeWidth="0.8"
            />
          ))}
          <rect x={L} y={bodyTop} width={w} height={bodyH} fill={url('falloff')} />
          <rect x={L} y={bodyTop} width={w} height={56} fill={url('spill')} />
          <rect
            x={L + w * 0.2}
            y={bodyTop + 10}
            width={w * 0.085}
            height={bodyH - 30}
            rx={w * 0.04}
            fill={url('spec')}
            filter={url('soft')}
          />
          <rect x={L + w * 0.07} y={bodyTop + 16} width={w * 0.025} height={bodyH - 44} fill={url('spec')} opacity="0.45" />
          <rect
            x={L + w * 0.9}
            y={bodyTop + 20}
            width={w * 0.03}
            height={bodyH - 50}
            fill={f.rim}
            opacity="0.35"
            filter={url('soft')}
          />
        </g>
        <path d={bodyPath} fill="none" stroke={url('rim')} strokeWidth="1.2" />

        {ledColumn}

        {/* Wordmark */}
        <text
          x={CX}
          y={bodyBottom - bodyH * 0.085}
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

        {/* Sport sleeve (accessory) */}
        {sl && (
          <g>
            <path
              d={`M${sx + 2},${sTop + 26} C${sx - 36},${sTop + 44} ${sx - 36},${sTop + 132} ${sx + 2},${sTop + 150}`}
              fill="none"
              stroke={sl.body[1]}
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d={`M${sx},${sTop + 30} C${sx - 32},${sTop + 46} ${sx - 32},${sTop + 128} ${sx},${sTop + 146}`}
              fill="none"
              stroke={sl.body[2]}
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d={sleevePath} fill={url('sleeve')} />
            <g clipPath={url('sleeveClip')}>
              <rect x={sx} y={sTop} width={sw} height={bodyBottom - sTop + 2} fill={url('hex')} />
              <rect x={sx} y={sTop} width={sw} height={bodyBottom - sTop + 2} fill={url('falloff')} />
              <rect
                x={sx + sw * 0.2}
                y={sTop + 8}
                width={sw * 0.08}
                height={bodyBottom - sTop - 20}
                rx={sw * 0.04}
                fill={url('spec')}
                filter={url('soft')}
                opacity="0.6"
              />
            </g>
            <path d={sleevePath} fill="none" stroke="#fff" strokeOpacity="0.12" />
            <rect x={sx} y={sTop} width={sw} height="3" rx="1.5" fill="#fff" opacity="0.2" />
            <rect x={sx - 3} y={sTop + 20} width="8" height="12" rx="3" fill={sl.body[0]} stroke="#fff" strokeOpacity="0.15" />
            <rect x={sx - 3} y={sTop + 144} width="8" height="12" rx="3" fill={sl.body[0]} stroke="#fff" strokeOpacity="0.15" />
            <rect x={win.x} y={win.y} width={win.w} height={win.h} rx="5" fill="#02030a" stroke="#fff" strokeOpacity="0.14" />
            <g clipPath={url('winClip')}>{ledColumn}</g>
          </g>
        )}

        {/* Cap */}
        <path d={capPath} fill={url('cap')} />
        <g clipPath={url('capClip')}>
          {ribs.map((x, i) => (
            <line
              key={i}
              x1={x}
              x2={x}
              y1={capTop + capH * 0.5}
              y2={capBottom}
              stroke={i % 2 ? '#000' : '#fff'}
              strokeOpacity={i % 2 ? 0.35 : 0.08}
              strokeWidth="1.2"
            />
          ))}
          <rect x={L} y={capTop} width={w} height={capH} fill={url('falloff')} opacity="0.7" />
          <rect x={L} y={capBottom - 30} width={w} height={30} fill={url('spillUp')} />
          <rect
            x={L + w * 0.2}
            y={capTop + 8}
            width={w * 0.085}
            height={capH - 14}
            rx={w * 0.04}
            fill={url('spec')}
            filter={url('soft')}
            opacity="0.8"
          />
        </g>
        <path d={capPath} fill="none" stroke={url('rim')} strokeWidth="1.2" />
        <rect x={L + w * 0.2} y={capTop + 1.5} width={w * 0.6} height="1.6" rx="0.8" fill="#fff" opacity="0.28" />

        {g.statusDot && (
          <g>
            <circle cx={CX} cy={capTop + capH * 0.3} r="8" fill={f.led} opacity="0.6" filter={url('bloom')} className="animate-glow" />
            <circle cx={CX} cy={capTop + capH * 0.3} r="2.8" fill={f.led} />
            <circle cx={CX} cy={capTop + capH * 0.3} r="1.1" fill="#fff" opacity="0.9" />
          </g>
        )}

        {g.display && (
          <g>
            <rect
              x={CX - w * 0.25}
              y={capTop + capH * 0.2}
              width={w * 0.5}
              height={capH * 0.32}
              rx="8"
              fill="#01030a"
              stroke="#fff"
              strokeOpacity="0.12"
            />
            <text
              x={CX}
              y={capTop + capH * 0.2 + 10}
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
              y={capTop + capH * 0.2 + capH * 0.32 - 7}
              textAnchor="middle"
              fontFamily="'Sora Variable', sans-serif"
              fontWeight="600"
              fontSize="16"
              fill={f.led}
            >
              {temp}°C
            </text>
            <rect
              x={CX - w * 0.25}
              y={capTop + capH * 0.2}
              width={w * 0.5}
              height={capH * 0.32}
              rx="8"
              fill={url('screen')}
            />
          </g>
        )}

        {g.touchRing && (
          <g>
            <rect x={L - 4} y={capTop + 14} width={w + 8} height="6" rx="3" fill={f.led} opacity="0.7" filter={url('bloom')} />
            <rect x={L + 1} y={capTop + 15.5} width={w - 2} height="3" fill={f.led} opacity="0.95" />
            <rect x={CX - w * 0.28} y={capTop + 16.3} width={w * 0.56} height="1" fill="#fff" opacity="0.8" />
          </g>
        )}

        {/* Glow ring between cap and body */}
        <rect
          x={L - 6}
          y={capBottom - 3}
          width={w + 12}
          height={GAP + 6}
          rx={(GAP + 6) / 2}
          fill={f.led}
          filter={url('bloom')}
          className="animate-glow"
        />
        <rect x={L + 0.5} y={capBottom} width={w - 1} height={GAP} fill="#02030a" />
        <rect x={L + 2} y={capBottom + 1.2} width={w - 4} height={GAP - 2.4} rx="1.2" fill={f.led} />
        <rect x={CX - w * 0.3} y={capBottom + 1.9} width={w * 0.6} height="1" fill="#fff" opacity="0.75" />
      </g>

      {/* Floor reflection */}
      {reflection && (
        <g mask={url('reflMask')}>
          <use href={`#${id('bottle')}`} transform={`translate(0 ${bodyBottom * 2}) scale(1 -1)`} />
        </g>
      )}
    </svg>
  )
}
