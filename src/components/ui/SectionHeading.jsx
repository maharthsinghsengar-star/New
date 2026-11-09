import { motion } from 'framer-motion'
import { maskUp } from '../../lib/motion'
import { cn } from '../../lib/utils'
import { Eyebrow } from './Eyebrow'
import { Reveal } from './Reveal'

/**
 * Section title with an editorial eyebrow and a word-by-word masked reveal.
 * Each word carries its own gradient (avoids a Safari bug with background-clip
 * on transformed children).
 */
export function SectionHeading({ eyebrow, index, title, description, align = 'center', className, titleId }) {
  const centered = align === 'center'
  const words = title.split(' ')

  return (
    <div className={cn('flex flex-col gap-5 sm:gap-6', centered ? 'items-center text-center' : 'items-start text-left', className)}>
      {eyebrow && (
        <Reveal y={16}>
          <Eyebrow index={index}>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <motion.h2
        id={titleId}
        className={cn('font-display text-display font-semibold', centered && 'mx-auto max-w-4xl')}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        transition={{ staggerChildren: 0.06 }}
      >
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span variants={maskUp} className="text-gradient-silver inline-block pb-[0.04em]">
                {word}
              </motion.span>
            </span>
            {i < words.length - 1 && ' '}
          </span>
        ))}
      </motion.h2>
      {description && (
        <Reveal delay={0.15} y={18}>
          <p className={cn('max-w-2xl text-lead text-white/60', centered && 'mx-auto')}>{description}</p>
        </Reveal>
      )}
    </div>
  )
}
