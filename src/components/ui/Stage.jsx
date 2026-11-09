import { cn } from '../../lib/utils'

/**
 * Cinematic "photo studio" backdrop: deep gradient, top spotlight,
 * a coloured bounce light and a floor fade.
 */
export function Stage({ accent = '#4aa8ff', className, children, spotlight = true }) {
  return (
    <div className={cn('relative isolate h-full w-full overflow-hidden', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(130% 90% at 50% 0%, #131c3e 0%, #080b19 52%, #03040a 100%)' }}
      />
      {spotlight && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-3/4"
          style={{ background: 'radial-gradient(45% 55% at 50% 0%, rgba(255,255,255,0.13), transparent 72%)' }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 transition-[background] duration-700"
        style={{ background: `radial-gradient(42% 38% at 50% 62%, ${accent}38, transparent 72%)` }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/4 bg-linear-to-t from-black/70 to-transparent" />
      {children}
    </div>
  )
}
