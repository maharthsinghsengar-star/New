import { cn } from '../../lib/utils'
import { Eyebrow } from './Eyebrow'
import { Reveal } from './Reveal'

export function SectionHeading({ eyebrow, title, description, align = 'center', className, titleId }) {
  const centered = align === 'center'
  return (
    <div className={cn('flex flex-col gap-5', centered ? 'items-center text-center' : 'items-start text-left', className)}>
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          id={titleId}
          className={cn(
            'font-display text-[clamp(2.25rem,5.4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance text-gradient-silver',
            centered && 'mx-auto max-w-4xl',
          )}
        >
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.12}>
          <p className={cn('max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg', centered && 'mx-auto')}>
            {description}
          </p>
        </Reveal>
      )}
    </div>
  )
}
