import { cn, scrollToSection } from '../../lib/utils'

const BASE =
  'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-semibold tracking-tight transition-all duration-300 ease-out-expo active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'

const VARIANTS = {
  primary:
    'bg-[linear-gradient(110deg,#2b7fff_0%,#5b6cff_45%,#8b5cf6_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_40px_-12px_rgba(43,127,255,0.85)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_18px_54px_-10px_rgba(109,92,255,0.95)] hover:-translate-y-0.5',
  secondary:
    'glass text-white hover:bg-white/[0.1] hover:-translate-y-0.5',
  light:
    'bg-white text-ink-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.12),0_12px_40px_-14px_rgba(255,255,255,0.6)] hover:bg-electric-300 hover:-translate-y-0.5',
  ghost: 'text-white/80 hover:text-white hover:bg-white/[0.06]',
}

const SIZES = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
}

/**
 * Button that renders a <button>, an <a href>, or — with `to` — a link that
 * smoothly scrolls to a section on the page.
 */
export function Button({ variant = 'primary', size = 'md', to, href, className, children, onClick, ...props }) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className)
  const content = (
    <>
      {variant === 'primary' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100"
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  )

  if (to) {
    return (
      <a
        href={`#${to}`}
        className={classes}
        onClick={(event) => {
          event.preventDefault()
          onClick?.(event)
          scrollToSection(to)
        }}
        {...props}
      >
        {content}
      </a>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...props}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...props}>
      {content}
    </button>
  )
}
