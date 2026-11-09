import { Sparkles } from 'lucide-react'

const ITEMS = [
  'Intelligent hydration',
  'Grade-5 titanium',
  '30-day battery',
  'Sip tracking to ±1 ml',
  'Live temperature',
  'Plastic-free packaging',
  'App connected',
]

export function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-ink-900/60 py-5">
      <p className="sr-only">{ITEMS.join(', ')}</p>
      <div aria-hidden="true" className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-10 whitespace-nowrap px-5 font-display text-lg tracking-tight text-white/60 sm:text-2xl"
              >
                <span>{item}</span>
                <Sparkles className="size-4 text-ember-400" />
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-ink-950 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-ink-950 to-transparent" />
    </div>
  )
}
