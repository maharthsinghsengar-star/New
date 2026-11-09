import { useEffect, useId, useRef } from 'react'
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, BellRing, Snowflake } from 'lucide-react'
import { Bottle } from '../components/visuals/Bottle'
import { safeId } from '../components/visuals/geometry'
import { Button } from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Eyebrow'
import { useUI } from '../context/contexts'
import { EASE } from '../lib/motion'
import { cn, scrollToSection } from '../lib/utils'

const HERO_STATS = [
  { value: '30 days', label: 'Battery life' },
  { value: '±1 ml', label: 'Sip precision' },
  { value: '24 h', label: 'Ice cold' },
]

const BEAM = 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)'
const FEATHER = 'linear-gradient(90deg, transparent 5%, #000 40%, #000 60%, transparent 95%)'

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
        style={{ background: 'radial-gradient(closest-side, rgba(255,122,26,0.18), transparent 70%)', animationDelay: '-9s' }}
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

function Chip({ className, delay, play, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(6px)' }}
      animate={play ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : undefined}
      transition={{ delay, duration: 0.9, ease: EASE }}
      className={cn(
        'glass absolute flex items-center gap-2.5 rounded-2xl p-2 pr-3.5 sm:gap-3 sm:p-3 sm:pr-5',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

function GoalRing({ value = 0.72, play }) {
  const gid = `goal-${safeId(useId())}`
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="size-8 -rotate-90 sm:size-10" aria-hidden="true">
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
        animate={play ? { strokeDashoffset: c * (1 - value) } : undefined}
        transition={{ delay: 1.2, duration: 1.6, ease: EASE }}
      />
    </svg>
  )
}

function HeroVisual({ sx, sy, play }) {
  const rotateY = useTransform(sx, [-1, 1], [-10, 10])
  const rotateX = useTransform(sy, [-1, 1], [7, -7])
  const x = useTransform(sx, [-1, 1], [-14, 14])
  const highlightX = useTransform(sx, [-1, 1], [-9, 9])
  const chipX = useTransform(sx, [-1, 1], [20, -20])
  const chipY = useTransform(sy, [-1, 1], [12, -12])

  return (
    <div
      className="relative mx-auto h-[clamp(300px,49svh,470px)] w-full max-w-[560px] sm:h-[580px] lg:h-[min(80vh,700px)]"
      style={{ perspective: 1200 }}
    >
      {/* Light beams from above */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ duration: 1.6, delay: 0.2 }}
      >
        <div
          className="animate-beam absolute -top-[20%] left-[6%] h-[110%] w-[50%] origin-top"
          style={{
            background: 'linear-gradient(180deg, rgba(74,168,255,0.42), rgba(74,168,255,0.06) 60%, transparent 88%)',
            clipPath: BEAM,
            maskImage: FEATHER,
            WebkitMaskImage: FEATHER,
          }}
        />
        <div
          className="animate-beam-reverse absolute -top-[20%] right-[6%] h-[110%] w-[50%] origin-top"
          style={{
            background: 'linear-gradient(180deg, rgba(167,139,250,0.4), rgba(139,92,246,0.06) 60%, transparent 88%)',
            clipPath: BEAM,
            maskImage: FEATHER,
            WebkitMaskImage: FEATHER,
          }}
        />
      </motion.div>

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
          style={{ background: 'radial-gradient(circle, rgba(43,127,255,0.3), rgba(139,92,246,0.14) 42%, transparent 70%)' }}
        />
      </div>

      {/* Floor light line */}
      <div aria-hidden="true" className="absolute inset-x-[12%] bottom-[5.5%] h-px bg-linear-to-r from-transparent via-electric-300/50 to-transparent" />
      <div
        aria-hidden="true"
        className="absolute inset-x-[20%] bottom-[2%] h-[8%] rounded-[50%]"
        style={{ background: 'radial-gradient(closest-side, rgba(74,168,255,0.28), transparent)' }}
      />

      {/* Bottle */}
      <motion.div style={{ rotateY, rotateX, x }} className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9, filter: 'blur(16px)' }}
          animate={play ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 1.6, ease: EASE, delay: 0.15 }}
          className="h-[92%]"
        >
          <div className="animate-float h-full">
            <Bottle
              model="pulse"
              finish="midnight"
              level={0.72}
              animated={play}
              live
              highlightX={highlightX}
              className="h-full w-auto"
              title="AQUORA Pulse smart bottle in Midnight"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Floating data chips */}
      <motion.div style={{ x: chipX, y: chipY }} className="pointer-events-none absolute inset-0">
        <Chip play={play} delay={1} className="left-0 top-[12%] sm:left-[2%]">
          <GoalRing play={play} />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/50 sm:text-[10px]">Daily goal</p>
            <p className="font-display text-[0.8rem] font-semibold sm:text-base">
              1.8 <span className="text-white/45">/ 2.5 L</span>
            </p>
          </div>
        </Chip>
        <Chip play={play} delay={1.2} className="right-0 top-[52%] sm:right-[2%] sm:top-[44%]">
          <span className="grid size-8 place-items-center rounded-xl bg-electric-500/20 text-electric-300 sm:size-10">
            <Snowflake className="size-4 sm:size-5" />
          </span>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/50 sm:text-[10px]">Water temp</p>
            <p className="font-display text-[0.8rem] font-semibold sm:text-base">6°C · Ice cold</p>
          </div>
        </Chip>
        <Chip play={play} delay={1.4} className="hidden sm:flex sm:bottom-[20%] sm:left-0 lg:-left-[4%]">
          <span className="grid size-10 place-items-center rounded-xl bg-ember-500/20 text-ember-400">
            <BellRing className="size-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Glow reminder</p>
            <p className="font-display text-base font-semibold">Next sip in 12 min</p>
          </div>
        </Chip>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const ref = useRef(null)
  const { introDone: play } = useUI()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const visualY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 0.9])
  const textY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })

  // Touch screens have no pointer: give the bottle a slow, living sway instead.
  useEffect(() => {
    if (!play || window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    const swayX = animate(mx, [-0.55, 0.55], { duration: 6.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' })
    const swayY = animate(my, [0.3, -0.3], { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' })
    return () => {
      swayX.stop()
      swayY.stop()
    }
  }, [play, mx, my])

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse' || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mx.set(((event.clientX - rect.left) / rect.width) * 2 - 1)
    my.set(((event.clientY - rect.top) / rect.height) * 2 - 1)
  }
  const resetPointer = (event) => {
    if (event.pointerType !== 'mouse') return
    mx.set(0)
    my.set(0)
  }

  const fadeIn = (delay) => ({
    initial: { opacity: 0, y: 22, filter: 'blur(8px)' },
    animate: play ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined,
    transition: { duration: 1, ease: EASE, delay },
  })

  return (
    <section
      id="home"
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={resetPointer}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh items-center overflow-hidden pb-16 pt-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] lg:pb-16 lg:pt-28"
    >
      <HeroBackground />

      <div className="shell grid grid-cols-1 items-center gap-x-6 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
        {/* Intro: eyebrow + headline */}
        <motion.div
          style={{ y: textY, opacity: fade }}
          className="relative z-10 flex flex-col items-center text-center lg:col-span-6 lg:row-start-1 lg:items-start lg:self-end lg:text-left"
        >
          <motion.div {...fadeIn(0.1)}>
            <Eyebrow>New · Flux thermal edition</Eyebrow>
          </motion.div>
          <h1 id="hero-title" className="mt-5 font-display text-hero font-semibold sm:mt-7">
            {[
              { text: 'Hydration,', cls: 'text-gradient-silver', delay: 0.15 },
              { text: 'Reimagined.', cls: 'text-gradient', delay: 0.28 },
            ].map((line) => (
              <span key={line.text} className="block overflow-hidden pb-[0.1em] first:-mb-[0.06em]">
                <motion.span
                  className="block"
                  initial={{ y: '110%' }}
                  animate={play ? { y: '0%' } : undefined}
                  transition={{ duration: 1.2, ease: EASE, delay: line.delay }}
                >
                  <span className={cn(line.cls, 'inline-block pb-[0.1em]')}>{line.text}</span>
                </motion.span>
              </span>
            ))}
          </h1>
        </motion.div>

        {/* Product */}
        <motion.div
          style={{ y: visualY, scale: visualScale }}
          className="relative -mt-1 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:mt-0"
        >
          <HeroVisual sx={sx} sy={sy} play={play} />
        </motion.div>

        {/* Details: copy, actions, stats */}
        <motion.div
          style={{ y: textY, opacity: fade }}
          className="relative z-10 flex flex-col items-center text-center lg:col-span-6 lg:row-start-2 lg:items-start lg:self-start lg:text-left"
        >
          <motion.p {...fadeIn(0.45)} className="order-2 mt-6 max-w-xl text-lead text-white/65 lg:order-1">
            AQUORA bottles measure every sip, read your water’s temperature and glow softly when your body needs more.
            Intelligent hydration that turns a daily habit into a ritual.
          </motion.p>

          <motion.div {...fadeIn(0.6)} className="order-1 mt-1 grid w-full grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:flex sm:w-auto lg:order-2 lg:mt-9">
            <Button to="shop" size="lg" className="h-13 px-5 sm:px-8">
              Shop Now <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button to="discover" size="lg" variant="secondary" className="h-13 px-5 sm:px-8">
              Discover More
            </Button>
          </motion.div>

          <motion.dl
            {...fadeIn(0.75)}
            className="glass order-3 mt-8 grid w-full max-w-md grid-cols-3 divide-x divide-white/10 rounded-2xl py-4 sm:mt-10"
          >
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse px-3 text-center sm:px-5 lg:text-left">
                <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45 sm:text-[10px]">{stat.label}</dt>
                <dd className="font-display text-lg font-semibold tracking-tight sm:text-2xl">{stat.value}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>

      <motion.a
        href="#discover"
        onClick={(event) => {
          event.preventDefault()
          scrollToSection('discover')
        }}
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white/80 lg:flex"
        aria-label="Scroll to discover how AQUORA works"
      >
        <span className="flex h-9 w-5 justify-center rounded-full border border-white/25 pt-2">
          <span className="animate-scroll-dot size-1 rounded-full bg-white/80" />
        </span>
        Scroll
      </motion.a>
    </section>
  )
}
