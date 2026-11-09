import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import {
  Activity,
  BatteryFull,
  BellRing,
  Droplets,
  Flame,
  Layers,
  Lock,
  PenTool,
  Smartphone,
  Snowflake,
  Thermometer,
} from 'lucide-react'
import { Bottle } from '../components/visuals/Bottle'
import { safeId } from '../components/visuals/geometry'
import { Reveal } from '../components/ui/Reveal'
import { EASE } from '../lib/motion'
import { SectionHeading } from '../components/ui/SectionHeading'
import { Stage } from '../components/ui/Stage'
import { Swatches } from '../components/ui/Swatches'
import { getFinish } from '../data/finishes'
import { cn } from '../lib/utils'

/** Card shell with a soft spotlight that follows the pointer. */
function FeatureCard({ className, children }) {
  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }
  return (
    <Reveal className={cn('h-full', className)}>
      <article
        onPointerMove={onPointerMove}
        className="group relative h-full overflow-hidden rounded-[2rem] border border-white/[0.07] bg-linear-to-b from-white/[0.045] to-white/[0.01] p-6 transition-colors duration-500 hover:border-white/[0.14] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(74,168,255,0.1), transparent 60%)',
          }}
        />
        <div className="relative h-full">{children}</div>
      </article>
    </Reveal>
  )
}

function CardHeader({ icon: Icon, kicker, title, text, accent = 'electric' }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-11 place-items-center rounded-2xl ring-1 ring-white/10',
            accent === 'ember' ? 'bg-ember-500/15 text-ember-400' : 'bg-electric-500/15 text-electric-300',
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">{kicker}</span>
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">{text}</p>
    </div>
  )
}

/* ── 1. Smart hydration tracking ───────────────────────────── */
const WEEK = [
  { day: 'Mon', value: 0.82 },
  { day: 'Tue', value: 0.95 },
  { day: 'Wed', value: 0.7 },
  { day: 'Thu', value: 1 },
  { day: 'Fri', value: 0.88 },
  { day: 'Sat', value: 0.6 },
  { day: 'Sun', value: 0.73, today: true },
]

const SIPS = [
  { time: '07:40', amount: '320 ml', note: 'Morning boost' },
  { time: '10:15', amount: '180 ml', note: 'Desk reminder' },
  { time: '12:30', amount: '400 ml', note: 'After training' },
]

function TrackingCard({ className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const litres = useMotionValue(0)
  const display = useTransform(litres, (v) => v.toFixed(2))
  const gid = `track-${safeId(useId())}`
  const r = 52
  const c = 2 * Math.PI * r

  useEffect(() => {
    if (!inView) return undefined
    const controls = animate(litres, 1.82, { duration: 2.2, ease: EASE })
    return () => controls.stop()
  }, [inView, litres])

  return (
    <FeatureCard className={className}>
      <div ref={ref} className="grid grid-cols-1 h-full gap-10 md:grid-cols-2">
        <div className="flex flex-col justify-between gap-8">
          <CardHeader
            icon={Activity}
            kicker="Smart tracking"
            title="Every sip, measured."
            text="Capacitive sensors log each sip to the millilitre and sync to the AQUORA app, adapting your goal to activity, weather and sleep."
          />
          <ul className="space-y-2.5">
            {SIPS.map((sip, i) => (
              <motion.li
                key={sip.time}
                initial={{ opacity: 0, x: -12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.6 + i * 0.15, duration: 0.6, ease: EASE }}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm"
              >
                <Droplets className="size-4 text-electric-300" aria-hidden="true" />
                <span className="tabular-nums text-white/45">{sip.time}</span>
                <span className="flex-1 text-white/75">{sip.note}</span>
                <span className="font-medium tabular-nums">{sip.amount}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center justify-center gap-8 rounded-[1.5rem] border border-white/[0.06] bg-ink-950/40 p-6">
          <div className="relative size-48 sm:size-52">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#4aa8ff" />
                  <stop offset="0.6" stopColor="#8b5cf6" />
                  <stop offset="1" stopColor="#ff7a1a" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              <motion.circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={`url(#${gid})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={inView ? { strokeDashoffset: c * (1 - 0.728) } : {}}
                transition={{ duration: 2.2, ease: EASE }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-4xl font-semibold tabular-nums tracking-tight">
                <motion.span>{display}</motion.span>
                <span className="text-xl text-white/50"> L</span>
              </p>
              <p className="mt-1 text-xs text-white/45">of 2.5 L daily goal</p>
            </div>
          </div>
          <div className="w-full">
            <div className="flex h-24 items-end gap-2.5" aria-label="Weekly hydration" role="img">
              {WEEK.map((d, i) => (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex h-full w-full items-end overflow-hidden rounded-full bg-white/[0.04]">
                    <motion.div
                      className={cn(
                        'w-full rounded-full',
                        d.today ? 'bg-linear-to-t from-electric-500 to-plasma-400' : 'bg-white/15',
                      )}
                      initial={{ height: 0 }}
                      animate={inView ? { height: `${d.value * 100}%` } : {}}
                      transition={{ delay: 0.3 + i * 0.07, duration: 1, ease: EASE }}
                    />
                  </div>
                  <span className={cn('text-[10px]', d.today ? 'text-white' : 'text-white/40')}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FeatureCard>
  )
}

/* ── 2. Temperature monitoring ─────────────────────────────── */
const TEMP_MODES = {
  cold: { label: 'Cold', temp: 6, title: 'Ice cold', note: 'Perfect after a workout', color: '#4aa8ff', icon: Snowflake },
  hot: { label: 'Hot', temp: 62, title: 'Tea-ready', note: 'Ideal for a slow infusion', color: '#ff7a1a', icon: Flame },
}

function TemperatureCard({ className }) {
  const [mode, setMode] = useState('cold')
  const m = TEMP_MODES[mode]
  const temp = useMotionValue(TEMP_MODES.cold.temp)
  const display = useTransform(temp, (v) => Math.round(v))
  const arc = 'M 20 100 A 80 80 0 0 1 180 100'

  useEffect(() => {
    const controls = animate(temp, m.temp, { duration: 1.1, ease: EASE })
    return () => controls.stop()
  }, [m.temp, temp])

  return (
    <FeatureCard className={className}>
      <div className="flex h-full flex-col justify-between gap-8">
        <CardHeader
          icon={Thermometer}
          kicker="Temperature"
          accent="ember"
          title="Know before you sip."
          text="A sealed thermal probe reads your water in real time. The glow ring turns ice-blue for cold and amber for hot."
        />

        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[16rem]">
            <svg viewBox="0 0 200 112" className="w-full" aria-hidden="true">
              <path d={arc} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
              <motion.path
                d={arc}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: Math.max(0.04, m.temp / 100), stroke: m.color }}
                transition={{ duration: 1.1, ease: EASE }}
                style={{ filter: `drop-shadow(0 0 10px ${m.color})` }}
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
              <p className="font-display text-5xl font-semibold tabular-nums tracking-tight" aria-live="polite">
                <motion.span>{display}</motion.span>
                <span className="text-2xl text-white/50">°C</span>
              </p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
            <m.icon className="size-4" style={{ color: m.color }} aria-hidden="true" />
            {m.title} · <span className="text-white/45">{m.note}</span>
          </p>
          <motion.div
            aria-hidden="true"
            className="mt-6 h-1.5 w-32 rounded-full"
            animate={{ backgroundColor: m.color, boxShadow: `0 0 24px 4px ${m.color}` }}
            transition={{ duration: 0.8 }}
          />
          <div role="radiogroup" aria-label="Water temperature" className="mt-7 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            {Object.entries(TEMP_MODES).map(([key, opt]) => {
              const selected = key === mode
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(key)}
                  className={cn(
                    'relative inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm transition-colors',
                    selected ? 'text-ink-950' : 'text-white/60 hover:text-white',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="temp-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <opt.icon className="relative size-3.5" />
                  <span className="relative">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </FeatureCard>
  )
}

/* ── 3. Premium materials ──────────────────────────────────── */
const LAYERS = [
  { id: 'shell', name: 'Titanium & steel shell', text: 'Grade-5 titanium or 18/8 steel. Scratch-resistant, recyclable, built for decades.', r: [96, 84], fill: 'url(#MAT-metal)' },
  { id: 'vacuum', name: 'Vacuum chamber', text: 'A sealed double wall that keeps water cold for 24 hours without condensation.', r: [84, 70], fill: '#05070f' },
  { id: 'ceramic', name: 'Ceramic interior', text: 'Medical-grade ceramic coating: no metallic taste, no lingering flavours.', r: [70, 62], fill: '#e9eef7' },
  { id: 'water', name: 'Pure water', text: 'Nothing between you and your water but materials that respect it.', r: [62, 0], fill: 'url(#MAT-water)' },
]

function MaterialsCard({ className }) {
  const [active, setActive] = useState('shell')
  const uid = safeId(useId())
  const fillFor = (fill) => fill.replace('MAT', uid)

  return (
    <FeatureCard className={className}>
      <div className="flex h-full flex-col gap-8">
        <CardHeader
          icon={Layers}
          kicker="Materials"
          title="Honest materials, nothing hidden."
          text="A cross-section of every AQUORA wall. Tap a layer to explore what keeps your water pure, cold and tasting of nothing but water."
        />
        <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[minmax(0,13rem)_1fr]">
          <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[13rem]" role="img" aria-label="Cross-section of the bottle wall">
            <defs>
              <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e3e7ee" />
                <stop offset="0.45" stopColor="#7d8492" />
                <stop offset="1" stopColor="#2a2e36" />
              </linearGradient>
              <radialGradient id={`${uid}-water`} cx="0.4" cy="0.35">
                <stop offset="0" stopColor="#8cc8ff" />
                <stop offset="0.6" stopColor="#2b7fff" />
                <stop offset="1" stopColor="#1d3fa8" />
              </radialGradient>
            </defs>
            {LAYERS.map((layer) => {
              const isActive = layer.id === active
              return (
                <g key={layer.id} onClick={() => setActive(layer.id)} className="cursor-pointer">
                  <circle cx="100" cy="100" r={layer.r[0]} fill={fillFor(layer.fill)} />
                  {layer.id === 'vacuum' && (
                    <circle cx="100" cy="100" r="77" fill="none" stroke="#fff" strokeOpacity="0.12" strokeDasharray="2 4" />
                  )}
                  <motion.circle
                    cx="100"
                    cy="100"
                    r={layer.r[0] - 0.75}
                    fill="none"
                    stroke="#ff9a4d"
                    strokeWidth="1.5"
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    style={{ filter: 'drop-shadow(0 0 6px #ff7a1a)' }}
                  />
                </g>
              )
            })}
            <ellipse cx="82" cy="76" rx="18" ry="10" fill="#fff" opacity="0.25" />
          </svg>
          <ul className="space-y-2">
            {LAYERS.map((layer, i) => {
              const isActive = layer.id === active
              return (
                <li key={layer.id}>
                  <button
                    type="button"
                    onClick={() => setActive(layer.id)}
                    onMouseEnter={() => setActive(layer.id)}
                    aria-pressed={isActive}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition duration-300',
                      isActive ? 'border-ember-500/40 bg-ember-500/[0.07]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('text-xs tabular-nums', isActive ? 'text-ember-400' : 'text-white/30')}>0{i + 1}</span>
                      <span className={cn('text-sm font-medium', isActive ? 'text-white' : 'text-white/70')}>{layer.name}</span>
                    </span>
                    {isActive && <span className="mt-1.5 block pl-7 text-xs leading-relaxed text-white/55">{layer.text}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </FeatureCard>
  )
}

/* ── 4. Modern design ──────────────────────────────────────── */
const DESIGN_FINISHES = ['arctic', 'midnight', 'ember', 'nebula']
const DESIGN_FACTS = ['One continuous form, no visible seams', 'Fits cup holders and bag pockets', 'Six finishes, from Arctic to Aurora']

function DesignCard({ className }) {
  const [finish, setFinish] = useState('arctic')
  const f = getFinish(finish)
  return (
    <FeatureCard className={className}>
      <div className="grid grid-cols-1 h-full gap-8 sm:grid-cols-[1fr_minmax(0,11rem)]">
        <div className="flex flex-col justify-between gap-8">
          <CardHeader
            icon={PenTool}
            kicker="Design"
            title="Seamless. Screwless. Timeless."
            text="A single uninterrupted silhouette with one touch surface. Designed to look as good on a boardroom table as it does at the trailhead."
          />
          <div>
            <ul className="space-y-2.5">
              {DESIGN_FACTS.map((fact) => (
                <li key={fact} className="flex items-center gap-3 text-sm text-white/70">
                  <span className="size-1.5 rounded-full bg-ember-400" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-4">
              <Swatches finishes={DESIGN_FINISHES} value={finish} onChange={setFinish} label="Preview a finish" />
              <span className="text-sm text-white/70">{f.name}</span>
            </div>
          </div>
        </div>
        <div className="relative h-72 overflow-hidden rounded-[1.5rem] border border-white/[0.06] sm:h-full sm:min-h-72">
          <Stage accent={f.led}>
            <motion.div
              key={finish}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute inset-0 flex items-center justify-center pt-6"
            >
              <Bottle model="mini" finish={finish} level={0.6} className="h-[86%] w-auto" title={`Pulse Mini in ${f.name}`} />
            </motion.div>
          </Stage>
        </div>
      </div>
    </FeatureCard>
  )
}

/* ── Supporting tiles ──────────────────────────────────────── */
const TILES = [
  { icon: BatteryFull, title: '30-day battery', text: 'Charge once a month on the magnetic dock.' },
  { icon: BellRing, title: 'Glow reminders', text: 'Gentle light cues instead of a buzzing phone.' },
  { icon: Lock, title: 'Leak-proof seal', text: 'Triple-gasket cap. Throw it in any bag.' },
  { icon: Smartphone, title: 'App & Health sync', text: 'Apple Health, Google Fit and Strava.' },
]

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="relative py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/3 -z-10 size-[44rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.13), transparent)' }}
      />
      <div className="shell">
        <SectionHeading
          eyebrow="Features"
          title="Smarter with every sip."
          description="Precise sensing, real-time temperature, honest materials and a design you’ll want to carry everywhere — perfected in one object."
          titleId="features-title"
        />

        <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <TrackingCard className="lg:col-span-4" />
          <TemperatureCard className="lg:col-span-2" />
          <MaterialsCard className="lg:col-span-3" />
          <DesignCard className="lg:col-span-3" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TILES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.06} className="h-full">
              <div className="h-full rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-5 transition duration-500 hover:-translate-y-1 hover:border-white/15 sm:p-6">
                <Icon className="size-5 text-electric-300" aria-hidden="true" />
                <h3 className="mt-4 font-display font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
