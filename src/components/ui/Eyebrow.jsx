import { cn } from '../../lib/utils'

export function Eyebrow({ children, className, dot = 'ember' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-white/70 backdrop-blur-md',
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          dot === 'ember' ? 'bg-ember-500 shadow-[0_0_12px_2px_rgba(255,122,26,0.7)]' : 'bg-electric-400 shadow-[0_0_12px_2px_rgba(74,168,255,0.7)]',
        )}
      />
      {children}
    </span>
  )
}
