import { motion } from 'framer-motion'
import { EASE } from '../../lib/motion'

/** Fades, lifts (and optionally de-blurs) its children into view the first time they scroll on-screen. */
export function Reveal({ children, className, delay = 0, y = 28, amount = 0.2, blur = 0, duration = 0.95 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: blur ? `blur(${blur}px)` : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
