import { ArrowRight, Leaf, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { Bottle } from '../components/visuals/Bottle'
import { Button } from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Eyebrow'
import { Reveal } from '../components/ui/Reveal'

const PERKS = [
  { icon: Truck, label: 'Free shipping over $150' },
  { icon: RotateCcw, label: '60-night trial' },
  { icon: ShieldCheck, label: '5-year warranty' },
  { icon: Leaf, label: 'Carbon-neutral delivery' },
]

export function CtaBanner() {
  return (
    <section aria-labelledby="cta-title" className="relative pb-20 pt-4 sm:pb-24">
      <div className="shell">
        <Reveal>
          <div className="gradient-border relative overflow-hidden rounded-[2.25rem] bg-navy-950">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 80% at 85% 30%, rgba(43,127,255,0.35), transparent 70%), radial-gradient(40% 60% at 70% 100%, rgba(255,122,26,0.22), transparent 70%), radial-gradient(50% 70% at 0% 0%, rgba(139,92,246,0.25), transparent 70%)',
              }}
            />
            <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-40" />

            <div className="relative grid grid-cols-1 items-center gap-10 px-6 pt-14 sm:px-12 lg:grid-cols-2 lg:px-16 lg:pt-0">
              <div className="text-center lg:py-20 lg:text-left">
                <Eyebrow>Start today</Eyebrow>
                <h2
                  id="cta-title"
                  className="mt-6 font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em]"
                >
                  Your best-hydrated self <span className="text-gradient">starts today.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-white/65 sm:text-lg lg:mx-0">
                  Join thousands who’ve turned drinking water into a ritual they actually look forward to.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Button to="shop" size="lg" variant="light">
                    Shop the collection <ArrowRight className="size-4" />
                  </Button>
                  <Button to="technology" size="lg" variant="secondary">
                    Compare models
                  </Button>
                </div>
              </div>

              <div className="relative mx-auto flex h-[340px] w-full max-w-md items-end justify-center sm:h-[420px] lg:h-[480px]">
                <Bottle model="mini" finish="nebula" level={0.5} reflection={false} className="relative -mr-[4%] h-[64%] w-auto" />
                <Bottle model="flux" finish="midnight" level={0.9} reflection={false} temp={6} className="relative z-10 h-[94%] w-auto" />
                <Bottle model="pulse" finish="ember" level={0.6} reflection={false} className="relative -ml-[4%] h-[78%] w-auto" />
              </div>
            </div>

            <ul className="relative grid grid-cols-2 border-t border-white/[0.08] lg:grid-cols-4">
              {PERKS.map(({ icon: Icon, label }, i) => (
                <li
                  key={label}
                  className={`flex items-center justify-center gap-2.5 px-4 py-5 text-center text-xs text-white/70 sm:text-sm ${
                    i % 2 === 0 ? 'border-r border-white/[0.08]' : ''
                  } ${i < 2 ? 'border-b border-white/[0.08] lg:border-b-0' : ''} ${i === 1 ? 'lg:border-r' : ''}`}
                >
                  <Icon className="size-4 shrink-0 text-electric-300" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
