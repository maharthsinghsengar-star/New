import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { EASE } from '../../lib/motion'

/**
 * Counts the leading number of `value` up when it scrolls into view
 * ("48" → 0…48, "100%" → 0…100%, "2021" → 1991…2021). Screen readers get the final value.
 */
export function CountUp({ value, className, duration = 1.8 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const match = /^(\d+)(.*)$/.exec(value)
  const target = match ? Number(match[1]) : 0
  const start = target > 1000 ? target - 30 : 0
  const count = useMotionValue(start)
  const rounded = useTransform(count, (v) => Math.round(v))

  useEffect(() => {
    if (!inView || !match) return undefined
    const controls = animate(count, target, { duration, ease: EASE })
    return () => controls.stop()
  }, [inView, match, count, target, duration])

  if (!match) return <span className={className}>{value}</span>

  return (
    <span ref={ref} className={className} aria-label={value}>
      <motion.span aria-hidden="true">{rounded}</motion.span>
      <span aria-hidden="true">{match[2]}</span>
    </span>
  )
}
