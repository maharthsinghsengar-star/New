import { useEffect, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useUI } from '../context/contexts'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { EASE, EASE_IN_OUT } from '../lib/motion'
import { LogoMark } from './ui/Logo'

const LETTERS = 'AQUORA'.split('')
const MIN_DURATION = 1300 // ms — long enough to feel intentional, short enough not to annoy
const MAX_DURATION = 4000 // ms — never block the page if fonts are slow

/**
 * Intro loading transition. Waits for the web fonts (min 1.3 s, max 4 s), then
 * lifts away with a curtain wipe while the hero starts its entrance.
 */
export function Preloader() {
  const { completeIntro } = useUI()
  const [visible, setVisible] = useState(true)
  const progress = useMotionValue(0)
  const percent = useTransform(progress, (v) => String(Math.round(v * 100)).padStart(3, '0'))
  useLockBodyScroll(visible)

  useEffect(() => {
    let cancelled = false
    const fill = animate(progress, 0.86, { duration: MIN_DURATION / 1000, ease: [0.3, 0, 0.2, 1] })
    const fonts = document.fonts?.ready ?? Promise.resolve()
    const minWait = new Promise((resolve) => setTimeout(resolve, MIN_DURATION))
    const maxWait = new Promise((resolve) => setTimeout(resolve, MAX_DURATION))

    Promise.race([Promise.all([fonts, minWait]), maxWait]).then(() => {
      if (cancelled) return
      animate(progress, 1, { duration: 0.35, ease: EASE }).then(() => {
        if (cancelled) return
        completeIntro()
        setVisible(false)
      })
    })

    return () => {
      cancelled = true
      fill.stop()
    }
  }, [progress, completeIntro])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          data-preloader=""
          role="status"
          aria-label="Loading AQUORA"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-ink-950"
          initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 1.05, ease: EASE_IN_OUT }}
        >
          <div aria-hidden="true" className="absolute inset-0">
            <div
              className="animate-aurora absolute -left-1/4 top-1/4 size-[70vmax] rounded-full"
              style={{ background: 'radial-gradient(closest-side, rgba(43,127,255,0.22), transparent 70%)' }}
            />
            <div
              className="animate-aurora-reverse absolute -right-1/4 -top-1/4 size-[70vmax] rounded-full"
              style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.2), transparent 70%)' }}
            />
          </div>

          <motion.div
            className="relative flex flex-col items-center"
            exit={{ opacity: 0, y: -48, scale: 0.97 }}
            transition={{ duration: 0.6, ease: EASE_IN_OUT }}
          >
            <div className="relative grid place-items-center">
              <motion.span
                aria-hidden="true"
                className="absolute size-28 rounded-full"
                style={{ background: 'radial-gradient(closest-side, rgba(74,168,255,0.45), rgba(139,92,246,0.15) 60%, transparent)' }}
                animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                initial={{ scale: 0.55, opacity: 0, filter: 'blur(14px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, ease: EASE }}
              >
                <LogoMark className="size-14" />
              </motion.div>
            </div>

            <p className="mt-7 flex overflow-hidden font-display text-xl font-semibold tracking-[0.42em] text-white" aria-hidden="true">
              {LETTERS.map((letter, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease: EASE }}
                >
                  {letter}
                </motion.span>
              ))}
            </p>

            <div className="mt-10 h-px w-44 overflow-hidden rounded-full bg-white/10">
              <motion.div
                style={{ scaleX: progress }}
                className="h-full origin-left bg-[linear-gradient(90deg,#4aa8ff,#8b5cf6,#ff7a1a)]"
              />
            </div>
            <div className="mt-3 flex w-44 justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              <span>Calibrating</span>
              <motion.span className="tabular-nums text-white/70">{percent}</motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
