import { useId, useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, BellRing, Snowflake } from 'lucide-react'
import { Bottle } from '../components/visuals/Bottle'
import { safeId } from '../components/visuals/geometry'
import { Button } from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Eyebrow'
import { EASE } from '../lib/motion'
import { cn, scrollToSection } from '../lib/utils'

const HERO_STATS = [
  { value: '30 days', label: 'Battery life' },
  { value: '±1 ml', label: 'Sip precision' },
  { value: '24 h', label: 'Ice cold' },
]

function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 70% 10%, #0d1a45 0%, #050a1c 45%, #02030a 82%)' }}
      />
      <div
        className="animate-aurora absolute -left-[25%] -top-[15%] size-[85vmax] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(43,127,255,0.36), transparent 70%)' }}
      />
      <div
        className="animate-aurora-reverse absolute -right-[30%] top-[0%] size-[75vmax] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.32), transparent 70%)' }}
      />
      <div
        className="animate-aurora absolute -bottom-[35%] left-[25%] size-[60vmax] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(255,122,26,0.2), transparent 70%)', animationDelay: '-9s' }}
      />
      <div
        className="bg-grid absolute inset-0"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 60% at 60% 40%, #000 25%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 60% 40%, #000 25%, transparent 78%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-ink-950 to-transparent" />
    </div>
  )
}

function Chip({ className, delay, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.9, ease: EASE }}
      className={cn(
        'glass absolute flex items-center gap-3 rounded-2xl p-2.5 pr-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] sm:p-3 sm:pr-5',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

function GoalRing({ value = 0.72 }) {
  const gid = `goal-${safeId(useId())}`
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="size-9 -rotate-90 sm:size-10" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0" stopColor="#4aa8ff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <motion.circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={{ delay: 1.4, duration: 1.6, ease: EASE }}
      />
    </svg>
  )
}

function HeroVisual({ sx, sy }) {
  const rotateY = useTransform(sx, [-1, 1], [-9, 9])
  const rotateX = useTransform(sy, [-1, 1], [7, -7])
  const x = useTransform(sx, [-1, 1], [-14, 14])
  const chipX = useTransform(sx, [-1, 1], [22, -22])
  const chipY = useTransform(sy, [-1, 1], [14, -14])

  return (
    <div
      className="relative mx-auto h-[min(122vw,540px)] w-full max-w-[560px] sm:h-[600px] lg:h-[min(80vh,700px)]"
      style={{ perspective: 1200 }}
    >
      {/* Orbits */}
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
        <div className="aspect-square w-[96%] rounded-full border border-white/[0.05]" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
        <div className="aspect-square w-[72%] rounded-full border border-dashed border-white/[0.08]" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
        <div
          className="animate-spin-slow aspect-square w-[84%] rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(74,168,255,0.9) 50deg, rgba(139,92,246,0.8) 120deg, transparent 170deg, transparent 230deg, rgba(255,122,26,0.85) 290deg, transparent 330deg)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))',
          }}
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
        <div
          className="aspect-square w-[78%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(43,127,255,0.32), rgba(139,92,246,0.14) 42%, transparent 70%)' }}
        />
      </div>

      {/* Bottle */}
      <motion.div style={{ rotateY, rotateX, x }} className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 70, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.5, ease: EASE, delay: 0.25 }}
          className="h-[90%]"
        >
          <div className="animate-float h-full">
            <Bottle
              model="pulse"
              finish="midnight"
              level={0.72}
              animated
              className="h-full w-auto"
              title="AQUORA Pulse smart bottle in Midnight"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Floating data chips */}
      <motion.div style={{ x: chipX, y: chipY }} className="pointer-events-none absolute inset-0">
        <Chip delay={1.1} className="left-0 top-[14%] sm:left-[2%]">
          <GoalRing />
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Daily goal</p>
            <p className="font-display text-sm font-semibold sm:text-base">
              1.8 <span className="text-white/45">/ 2.5 L</span>
            </p>
          </div>
        </Chip>
        <Chip delay={1.3} className="right-0 top-[44%] sm:right-[2%]">
          <span className="grid size-9 place-items-center rounded-xl bg-electric-500/20 text-electric-300 sm:size-10">
            <Snowflake className="size-4 sm:size-5" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Water temp</p>
            <p className="font-display text-sm font-semibold sm:text-base">6°C · Ice cold</p>
          </div>
        </Chip>
        <Chip delay={1.5} className="hidden sm:flex sm:bottom-[20%] sm:left-0 lg:-left-[4%]">
          <span className="grid size-9 place-items-center rounded-xl bg-ember-500/20 text-ember-400 sm:size-10">
            <BellRing className="size-4 sm:size-5" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Glow reminder</p>
            <p className="font-display text-sm font-semibold sm:text-base">Next sip in 12 min</p>
          </div>
        </Chip>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const visualY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const textY = useTransform(scrollYProgress, [0, 1], [0, 70])
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mx.set(((event.clientX - rect.left) / rect.width) * 2 - 1)
    my.set(((event.clientY - rect.top) / rect.height) * 2 - 1)
  }
  const resetPointer = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <section
      id="home"
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPointer}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh items-center overflow-hidden pb-20 pt-24 lg:pb-16 lg:pt-24"
    >
      <HeroBackground />

      <div className="shell grid grid-cols-1 items-center gap-4 lg:grid-cols-12 lg:gap-6">
        <motion.div
          style={{ y: textY, opacity: fade }}
          className="relative z-10 flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left"
        >
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}>
            <Eyebrow>New · Flux thermal edition</Eyebrow>
          </motion.div>

          <h1
            id="hero-title"
            className="mt-7 font-display text-[clamp(3.1rem,9.5vw,7.4rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
          >
            <span className="block overflow-hidden pb-[0.08em]">
              <motion.span
                className="block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
              >
                <span className="text-gradient-silver inline-block pb-[0.1em]">Hydration,</span>
              </motion.span>
            </span>
            <span className="-mt-[0.1em] block overflow-hidden pb-[0.12em]">
              <motion.span
                className="block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.34 }}
              >
                <span className="text-gradient inline-block pb-[0.12em]">Reimagined.</span>
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg"
          >
            AQUORA bottles measure every sip, read your water’s temperature and glow softly when your body needs more.
            Intelligent hydration that turns a daily habit into a ritual.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
            className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <Button to="shop" size="lg">
              Shop Now <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button to="about" size="lg" variant="secondary">
              Discover More
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
            className="mt-10 grid w-full max-w-md grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/[0.07] bg-white/[0.025] py-4 backdrop-blur-md"
          >
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse px-3 text-center sm:px-5 lg:text-left">
                <dt className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">{stat.label}</dt>
                <dd className="font-display text-lg font-semibold sm:text-2xl">{stat.value}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div style={{ y: visualY }} className="relative lg:col-span-6">
          <HeroVisual sx={sx} sy={sy} />
        </motion.div>
      </div>

      <a
        href="#about"
        onClick={(event) => {
          event.preventDefault()
          scrollToSection('about')
        }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 transition hover:text-white/80 lg:flex"
        aria-label="Scroll to our story"
      >
        <span className="flex h-9 w-5 justify-center rounded-full border border-white/25 pt-2">
          <span className="animate-scroll-dot size-1 rounded-full bg-white/80" />
        </span>
        Scroll
      </a>
    </section>
  )
}
