import { cn } from '../../lib/utils'

export function Eyebrow({ children, className, dot = 'ember', index }) {
  return (
    <span
      className={cn(
        'glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-label font-medium uppercase text-white/75',
        className,
      )}
    >
      {index ? (
        <span className="font-mono text-[0.65rem] tracking-normal text-ember-400">{index}</span>
      ) : (
        <span className="relative flex size-1.5">
          <span
            className={cn(
              'animate-pulse-dot absolute inset-0 rounded-full',
              dot === 'ember' ? 'bg-ember-500/70' : 'bg-electric-400/70',
            )}
          />
          <span
            className={cn(
              'relative size-1.5 rounded-full',
              dot === 'ember' ? 'bg-ember-500 shadow-[0_0_12px_2px_rgba(255,122,26,0.7)]' : 'bg-electric-400 shadow-[0_0_12px_2px_rgba(74,168,255,0.7)]',
            )}
          />
        </span>
      )}
      {index && <span aria-hidden="true" className="h-3 w-px bg-white/20" />}
      {children}
    </span>
  )
}
