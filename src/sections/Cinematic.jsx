import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { Bottle } from '../components/visuals/Bottle'
import { EASE } from '../lib/motion'
import { cn } from '../lib/utils'

const SCENES = [
  {
    key: 'sense',
    label: 'Sense',
    title: 'It feels every sip.',
    text: 'Capacitive sensors log each sip to the millilitre — no buttons, no manual logging, no guesswork.',
    color: '#4aa8ff',
    level: 0.3,
    stat: '±1 ml',
    statLabel: 'Sip precision',
  },
  {
    key: 'read',
    label: 'Read',
    title: 'It reads every degree.',
    text: 'A sealed thermal probe watches your water and shifts the light from ice-blue to amber.',
    color: '#a78bfa',
    level: 0.6,
    stat: '±0.5°C',
    statLabel: 'Temperature accuracy',
  },
  {
    key: 'glow',
    label: 'Glow',
    title: 'It reminds you, softly.',
    text: 'When your body needs more, a halo of light appears — never a buzzing phone.',
    color: '#ff9a4d',
    level: 0.9,
    stat: '30 days',
    statLabel: 'Per charge',
  },
]

const BEAM = 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)'
const FEATHER = 'linear-gradient(90deg, transparent 5%, #000 40%, #000 60%, transparent 95%)'

/** One segment of the scene progress bar, filling as its scene scrolls past. */
function StepBar({ progress, index, total, label, active }) {
  const fill = useTransform(progress, [index / total, (index + 1) / total], [0, 1])
  return (
    <li className="flex flex-1 flex-col gap-2">
      <span className="relative h-[2px] overflow-hidden rounded-full bg-white/12">
        <motion.span style={{ scaleX: fill }} className="absolute inset-0 origin-left rounded-full bg-white" />
      </span>
      <span className={cn('font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-500', active ? 'text-white' : 'text-white/35')}>
        0{index + 1} {label}
      </span>
    </li>
  )
}

export function Cinematic() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [index, setIndex] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setIndex(Math.min(SCENES.length - 1, Math.max(0, Math.floor(v * SCENES.length))))
  })

  const scene = SCENES[index]
  const scale = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0.86, 1, 1, 0.94])
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, 3])
  const highlightX = useTransform(scrollYProgress, [0, 1], [-12, 12])
  const ghostX = useTransform(scrollYProgress, [0, 1], ['4%', '-52%'])

  return (
    <section id="discover" ref={ref} aria-labelledby="discover-title" className="relative h-[320svh]">
      <h2 id="discover-title" className="sr-only">
        How AQUORA works: it senses every sip, reads the temperature and reminds you with light.
      </h2>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Scene lighting — crossfades between electric blue, purple and ember */}
        {SCENES.map((s, i) => (
          <motion.div
            key={s.key}
            aria-hidden="true"
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: i === index ? 1 : 0 }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(55% 45% at 50% 52%, ${s.color}38, transparent 70%), radial-gradient(45% 30% at 50% 100%, ${s.color}26, transparent 70%)`,
              }}
            />
            <div
              className="animate-beam absolute -top-[10%] left-1/2 h-[90%] w-[80vmin] -translate-x-1/2 origin-top"
              style={{
                background: `linear-gradient(180deg, ${s.color}55, ${s.color}0d 60%, transparent 90%)`,
                clipPath: BEAM,
                maskImage: FEATHER,
                WebkitMaskImage: FEATHER,
              }}
            />
          </motion.div>
        ))}

        {/* Ghost lettering drifting with scroll */}
        <motion.p
          aria-hidden="true"
          style={{ x: ghostX }}
          className="text-ghost pointer-events-none absolute left-0 top-[30%] select-none whitespace-nowrap font-display text-[42vw] font-semibold leading-none tracking-[-0.05em] lg:top-1/2 lg:-translate-y-1/2 lg:text-[20rem]"
        >
          Sense · Read · Glow
        </motion.p>

        {/* Floor line */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-[22%] h-px bg-linear-to-r from-transparent via-white/15 to-transparent lg:bottom-[12%]" />

        {/* Bottle */}
        <div className="absolute inset-0 flex items-start justify-center pt-[calc(max(0.75rem,env(safe-area-inset-top))+6.5rem)] lg:items-center lg:pt-0">
          <motion.div style={{ scale, rotate }} className="h-[50svh] lg:h-[74svh]">
            <Bottle
              model="pulse"
              finish="midnight"
              led={scene.color}
              level={scene.level}
              live
              highlightX={highlightX}
              className="h-full w-auto"
              title={`AQUORA Pulse glowing ${scene.label.toLowerCase()} colour`}
            />
          </motion.div>
        </div>

        <div className="shell relative grid h-full grid-cols-1 lg:grid-cols-12">
          {/* Progress — top on phones, beside the stat on desktop */}
          <ol
            aria-hidden="true"
            className="absolute inset-x-5 top-[calc(max(0.75rem,env(safe-area-inset-top))+4.75rem)] flex gap-3 sm:inset-x-8 lg:hidden"
          >
            {SCENES.map((s, i) => (
              <StepBar key={s.key} progress={scrollYProgress} index={i} total={SCENES.length} label={s.label} active={i === index} />
            ))}
          </ol>

          {/* Caption */}
          <div className="flex flex-col justify-end pb-safe lg:col-span-4 lg:justify-center lg:pb-0">
            <div className="glass rounded-[1.75rem] p-5 lg:border-0 lg:bg-none lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={scene.key}
                  initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: scene.color }}>
                    0{index + 1} / 0{SCENES.length} — {scene.label}
                  </p>
                  <p className="mt-3 font-display text-title font-semibold lg:text-[3.4rem] lg:leading-[1.02]">{scene.title}</p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-white/60 lg:mt-5 lg:text-lead">{scene.text}</p>
                  <p className="mt-4 flex items-baseline gap-2 lg:hidden">
                    <span className="font-display text-2xl font-semibold tracking-tight">{scene.stat}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{scene.statLabel}</span>
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop stat + steps */}
          <div className="hidden lg:col-span-3 lg:col-start-10 lg:flex lg:flex-col lg:items-end lg:justify-center lg:text-right">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <p className="text-gradient-silver font-display text-6xl font-semibold tracking-[-0.04em]">{scene.stat}</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">{scene.statLabel}</p>
              </motion.div>
            </AnimatePresence>
            <ol aria-hidden="true" className="mt-12 flex w-64 gap-3">
              {SCENES.map((s, i) => (
                <StepBar key={s.key} progress={scrollYProgress} index={i} total={SCENES.length} label={s.label} active={i === index} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
