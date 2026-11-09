import { useId } from 'react'
import { getFinish } from '../../data/finishes'
import { RAMP_OFFSETS, RIM_A, RIM_B, rrect, safeId } from './geometry'

const VB = '0 0 320 320'
const DARK_CAP = getFinish('midnight').cap

function useIds() {
  const uid = safeId(useId())
  return {
    id: (name) => `${uid}-${name}`,
    url: (name) => `url(#${uid}-${name})`,
  }
}

function Ramp({ id, colors, vertical = false }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      {colors.map((c, i) => (
        <stop key={i} offset={RAMP_OFFSETS[i] ?? i / (colors.length - 1)} stopColor={c} />
      ))}
    </linearGradient>
  )
}

/** Shared lighting defs: falloff, specular, bloom, glow pool, contact shadow. */
function CommonDefs({ id, f }) {
  return (
    <>
      <linearGradient id={id('rimA')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={RIM_A} stopOpacity="0" />
        <stop offset="0.3" stopColor={RIM_A} stopOpacity="0.9" />
        <stop offset="1" stopColor={RIM_A} stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id={id('rimB')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={RIM_B} stopOpacity="0" />
        <stop offset="0.3" stopColor={RIM_B} stopOpacity="0.9" />
        <stop offset="1" stopColor={RIM_B} stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id={id('falloff')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.06" />
        <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id={id('spec')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.2" stopColor="#fff" stopOpacity={f.spec} />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={id('pool')}>
        <stop offset="0" stopColor={f.led} stopOpacity="0.45" />
        <stop offset="1" stopColor={f.led} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id('shadow')}>
        <stop offset="0" stopColor="#000" stopOpacity="0.85" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id('glow')}>
        <stop offset="0" stopColor={f.led} stopOpacity="0.3" />
        <stop offset="1" stopColor={f.led} stopOpacity="0" />
      </radialGradient>
      <filter id={id('bloom')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </>
  )
}

function svgProps(className, style, title) {
  return {
    viewBox: VB,
    className,
    style: { aspectRatio: '1 / 1', overflow: 'visible', ...style },
    role: title ? 'img' : undefined,
    'aria-label': title,
    'aria-hidden': title ? undefined : true,
  }
}

/* ── Smart cap ─────────────────────────────────────────────── */
export function CapVisual({ finish = 'midnight', live = false, className, style, title }) {
  const { id, url } = useIds()
  const f = getFinish(finish)
  const side = 'M74,112 L74,214 A86,22 0 0 0 246,214 L246,112 Z'
  const ribs = Array.from({ length: 30 }, (_, i) => 78 + i * 5.6)

  return (
    <svg {...svgProps(className, style, title)}>
      <defs>
        <CommonDefs id={id} f={f} />
        <Ramp id={id('side')} colors={f.body} />
        <linearGradient id={id('top')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={f.body[2]} />
          <stop offset="1" stopColor={f.body[1]} />
        </linearGradient>
        <clipPath id={id('sideClip')}>
          <path d={side} />
        </clipPath>
      </defs>

      <ellipse cx="160" cy="170" rx="150" ry="130" fill={url('glow')} />
      <ellipse cx="160" cy="250" rx="140" ry="24" fill={url('pool')} />
      <ellipse cx="160" cy="246" rx="96" ry="12" fill={url('shadow')} />

      {/* Loop */}
      <path d="M124,108 C118,36 202,36 196,108" fill="none" stroke={f.loop} strokeWidth="13" strokeLinecap="round" />
      <path d="M121,100 C116,40 200,40 193,100" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />

      {/* Side */}
      <path d={side} fill={url('side')} />
      <g clipPath={url('sideClip')}>
        {ribs.map((x, i) => (
          <line
            key={i}
            x1={x}
            x2={x}
            y1="150"
            y2="240"
            stroke={i % 2 ? '#000' : '#fff'}
            strokeOpacity={i % 2 ? 0.3 : 0.08}
            strokeWidth="1.4"
          />
        ))}
        <rect x="74" y="100" width="172" height="150" fill={url('falloff')} />
        <rect x="104" y="116" width="14" height="110" rx="7" fill={url('spec')} filter={url('soft')} />
        <rect x="76" y="112" width="8" height="120" fill={url('rimA')} filter={url('soft')} opacity="0.8" />
        <rect x="235" y="112" width="9" height="120" fill={url('rimB')} filter={url('soft')} opacity="0.8" />
      </g>

      {/* Glow ring */}
      <path d="M74,212 A86,22 0 0 0 246,212" fill="none" stroke={f.led} strokeWidth="9" filter={url('bloom')} className={live ? 'animate-glow' : undefined} />
      <path d="M74,212 A86,22 0 0 0 246,212" fill="none" stroke={f.led} strokeWidth="3" />
      <path d="M110,229 A86,22 0 0 0 210,229" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" />

      {/* Top surface */}
      <ellipse cx="160" cy="112" rx="86" ry="22" fill={url('top')} />
      <ellipse cx="160" cy="112" rx="86" ry="22" fill="none" stroke="#fff" strokeOpacity="0.22" />
      <ellipse cx="160" cy="113" rx="54" ry="13.5" fill="#000" fillOpacity="0.25" stroke="#fff" strokeOpacity="0.18" />
      <ellipse cx="160" cy="113" rx="9" ry="3" fill={f.led} opacity="0.7" filter={url('bloom')} className={live ? 'animate-glow' : undefined} />
      <ellipse cx="160" cy="113" rx="3.6" ry="1.4" fill={f.led} />
    </svg>
  )
}

/* ── Charging dock ─────────────────────────────────────────── */
export function DockVisual({ finish = 'midnight', live = false, className, style, title }) {
  const { id, url } = useIds()
  const f = getFinish(finish)
  const side = 'M48,176 L48,202 A112,30 0 0 0 272,202 L272,176 Z'

  return (
    <svg {...svgProps(className, style, title)}>
      <defs>
        <CommonDefs id={id} f={f} />
        <Ramp id={id('side')} colors={f.body} />
        <linearGradient id={id('top')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={f.body[2]} />
          <stop offset="1" stopColor={f.body[1]} />
        </linearGradient>
        <clipPath id={id('sideClip')}>
          <path d={side} />
        </clipPath>
      </defs>

      <ellipse cx="160" cy="170" rx="160" ry="120" fill={url('glow')} />
      <ellipse cx="160" cy="214" rx="150" ry="28" fill={url('pool')} />
      <ellipse cx="160" cy="212" rx="122" ry="16" fill={url('shadow')} />

      {/* Cable */}
      <path d="M262,196 C298,204 306,244 290,282" fill="none" stroke={f.body[1]} strokeWidth="7" strokeLinecap="round" />
      <path d="M263,193 C297,201 304,240 289,276" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />

      {/* Side */}
      <path d={side} fill={url('side')} />
      <g clipPath={url('sideClip')}>
        <rect x="48" y="170" width="224" height="70" fill={url('falloff')} />
        <rect x="50" y="172" width="12" height="44" fill={url('rimA')} filter={url('soft')} opacity="0.8" />
        <rect x="258" y="172" width="12" height="44" fill={url('rimB')} filter={url('soft')} opacity="0.8" />
      </g>
      <ellipse cx="160" cy="226" rx="6" ry="2" fill={f.led} opacity="0.9" filter={url('soft')} />

      {/* Top */}
      <ellipse cx="160" cy="176" rx="112" ry="30" fill={url('top')} />
      <path d="M48,176 A112,30 0 0 0 272,176" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.2" />
      <ellipse cx="160" cy="176" rx="76" ry="20" fill="#03050c" fillOpacity="0.88" stroke="#fff" strokeOpacity="0.08" />
      <ellipse cx="160" cy="176" rx="64" ry="16.8" fill="none" stroke={f.led} strokeWidth="7" filter={url('bloom')} className={live ? 'animate-glow' : undefined} />
      <ellipse cx="160" cy="176" rx="64" ry="16.8" fill="none" stroke={f.led} strokeWidth="2.2" />
      <ellipse cx="160" cy="176" rx="4" ry="1.5" fill={f.led} />
    </svg>
  )
}

/* ── Filter pods ───────────────────────────────────────────── */
const GRANULES = [
  [0.3, 0.82], [0.55, 0.88], [0.72, 0.8], [0.42, 0.74], [0.62, 0.7],
  [0.25, 0.66], [0.5, 0.62], [0.78, 0.9], [0.36, 0.9], [0.68, 0.6],
]

function Pod({ cx, top, w, h, ids }) {
  const { url } = ids
  const x = cx - w / 2
  const liquidTop = top + h * 0.4
  const capH = 26
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} rx={w / 2} fill={url('glass')} />
      <g clipPath={`url(#${ids.clip(cx)})`}>
        <rect x={x} y={liquidTop} width={w} height={h} fill={url('liquid')} />
        <ellipse cx={cx} cy={liquidTop} rx={w / 2 - 2} ry="3.5" fill="#8cc8ff" fillOpacity="0.55" />
        {GRANULES.map(([gx, gy], i) => (
          <circle key={i} cx={x + gx * w} cy={top + gy * h} r={2.4 + (i % 3) * 0.8} fill="#0b0f1e" fillOpacity="0.75" />
        ))}
        <rect x={x + w * 0.18} y={top + 30} width={w * 0.12} height={h - 50} rx={w * 0.06} fill={url('spec')} filter={url('soft')} />
      </g>
      <rect x={x} y={top} width={w} height={h} rx={w / 2} fill="none" stroke="#fff" strokeOpacity="0.28" />
      <path d={rrect(x, top, w, capH, w / 2, 3)} fill={url('podCap')} />
      <rect x={x + 1} y={top + capH} width={w - 2} height="2.5" fill="#4aa8ff" />
      <rect x={x - 3} y={top + capH - 2} width={w + 6} height="6" rx="3" fill="#4aa8ff" opacity="0.6" filter={url('bloom')} />
    </g>
  )
}

export function PodsVisual({ finish = 'arctic', className, style, title }) {
  const { id, url } = useIds()
  const f = getFinish(finish)
  const pods = [
    { cx: 98, top: 118, w: 52, h: 126 },
    { cx: 222, top: 118, w: 52, h: 126 },
    { cx: 160, top: 96, w: 62, h: 156 },
  ]
  const ids = { url, clip: (cx) => id(`clip${cx}`) }

  return (
    <svg {...svgProps(className, style, title)}>
      <defs>
        <CommonDefs id={id} f={f} />
        <linearGradient id={id('glass')} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id={id('liquid')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4aa8ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#1d5ef0" stopOpacity="0.85" />
        </linearGradient>
        <Ramp id={id('podCap')} colors={DARK_CAP} />
        {pods.map((p) => (
          <clipPath key={p.cx} id={id(`clip${p.cx}`)}>
            <rect x={p.cx - p.w / 2} y={p.top} width={p.w} height={p.h} rx={p.w / 2} />
          </clipPath>
        ))}
      </defs>

      <ellipse cx="160" cy="170" rx="160" ry="130" fill={url('glow')} />
      <ellipse cx="160" cy="258" rx="140" ry="22" fill={url('pool')} />
      <ellipse cx="160" cy="252" rx="112" ry="12" fill={url('shadow')} />

      {pods.map((p) => (
        <Pod key={p.cx} {...p} ids={ids} />
      ))}
    </svg>
  )
}
