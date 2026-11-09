import { cn } from '../lib/utils'

const ITEMS = [
  'Intelligent hydration',
  'Grade-5 titanium',
  '30-day battery',
  'Sip tracking to ±1 ml',
  'Live temperature',
  'Plastic-free packaging',
  'App connected',
]

function Row({ reverse = false, ghost = false }) {
  return (
    <div aria-hidden="true" className={cn('flex w-max hover:[animation-play-state:paused]', reverse ? 'animate-marquee-reverse' : 'animate-marquee')}>
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0 items-center">
          {ITEMS.map((item, i) => (
            <li
              key={item}
              className="flex items-center gap-8 whitespace-nowrap px-4 font-display text-[1.6rem] font-semibold tracking-[-0.03em] sm:gap-10 sm:px-5 sm:text-[2.6rem]"
            >
              <span className={(i + (ghost ? 1 : 0)) % 2 ? 'text-ghost' : 'text-white/80'}>{item}</span>
              <span className="size-2 rounded-full bg-[linear-gradient(135deg,#4aa8ff,#8b5cf6,#ff7a1a)] shadow-[0_0_14px_rgba(139,92,246,0.7)]" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

export function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.07] bg-white/[0.015] py-6 sm:py-8">
      <p className="sr-only">{ITEMS.join(', ')}</p>
      <div className="flex flex-col gap-3 sm:gap-4">
        <Row />
        <Row reverse ghost />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-ink-950 to-transparent sm:w-32" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-ink-950 to-transparent sm:w-32" />
    </div>
  )
}
