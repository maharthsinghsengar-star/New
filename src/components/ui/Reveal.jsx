import { motion } from 'framer-motion'
import { EASE } from '../../lib/motion'

/** Fades and lifts its children into view the first time they scroll on-screen. */
export function Reveal({ children, className, delay = 0, y = 28, amount = 0.2 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
