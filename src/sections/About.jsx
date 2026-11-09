import { Cpu, Gem, Leaf } from 'lucide-react'
import { Bottle } from '../components/visuals/Bottle'
import { Reveal } from '../components/ui/Reveal'
import { SectionHeading } from '../components/ui/SectionHeading'
import { Stage } from '../components/ui/Stage'

const PILLARS = [
  {
    icon: Cpu,
    title: 'Intelligence that disappears',
    text: 'Sensors, light and haptics woven so seamlessly into the object that you only notice what they give back: energy, focus and clarity.',
  },
  {
    icon: Gem,
    title: 'Built for decades',
    text: 'Titanium, medical-grade ceramic and sapphire glass — materials chosen to outlast trends, and designed to be repaired rather than replaced.',
  },
  {
    icon: Leaf,
    title: 'Kinder by design',
    text: 'Every AQUORA replaces hundreds of single-use bottles a year. Plastic-free packaging and carbon-neutral delivery come as standard.',
  },
]

const STATS = [
  { value: '2021', label: 'Founded' },
  { value: '48', label: 'Prototypes before Pulse' },
  { value: '5 yr', label: 'Standard warranty' },
  { value: '100%', label: 'Plastic-free packaging' },
]

function AboutVisual() {
  return (
    <div className="gradient-border relative aspect-[4/5] overflow-hidden rounded-[2rem]">
      <Stage accent="#6d7cff">
        {/* Ripples on the studio floor */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-[8%] flex h-0 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-ripple absolute aspect-[4/1] w-[80%] rounded-[50%] border border-electric-300/30"
              style={{ animationDelay: `${i * 1.6}s` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end justify-center gap-0 pb-[6%]">
          <Bottle model="halo" finish="aurora" level={0.5} className="-mr-[6%] h-[74%] w-auto opacity-90" />
          <Bottle model="pulse" finish="arctic" level={0.8} className="relative h-[82%] w-auto" />
          <Bottle model="mini" finish="ember" level={0.6} className="-ml-[6%] h-[74%] w-auto opacity-90" />
        </div>
      </Stage>
      <div className="glass absolute left-5 top-5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/80">
        Est. 2021 · Studio designed
      </div>
    </div>
  )
}

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 -z-10 size-[40rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(43,127,255,0.14), transparent)' }}
      />
      <div className="shell">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
            <AboutVisual />
          </Reveal>

          <div className="lg:col-span-7">
            <SectionHeading
              align="left"
              eyebrow="Our story"
              title="Water is a ritual. We made it intelligent."
              titleId="about-title"
            />
            <Reveal delay={0.15}>
              <div className="mt-8 space-y-5 text-base leading-relaxed text-white/65 sm:text-lg">
                <p>
                  AQUORA began with a simple frustration. We tracked our steps, our sleep and our heart rate — yet the
                  most essential thing our bodies need was still guesswork. So a small team of industrial designers,
                  engineers and sports scientists set out to change that.
                </p>
                <p>
                  The result is a family of bottles that understand you. They notice when you drink, learn your rhythm
                  and gently glow when it’s time for more — without ever asking you to tap a screen.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <blockquote className="mt-10 border-l-2 border-ember-500/80 pl-6">
                <p className="font-display text-xl leading-snug text-white/90 sm:text-2xl">
                  “The best technology is the kind you feel rather than see.”
                </p>
                <footer className="mt-3 text-sm text-white/45">— AQUORA design principle №1</footer>
              </blockquote>
            </Reveal>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mt-28">
          {PILLARS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-linear-to-b from-white/[0.045] to-white/[0.01] p-7 transition duration-500 hover:-translate-y-1 hover:border-white/[0.15] sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute -right-16 -top-16 size-48 rounded-full opacity-0 transition duration-700 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.25), transparent)' }}
                />
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-electric-500/25 to-plasma-500/20 text-electric-300 ring-1 ring-white/10">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-sm text-white/25">0{i + 1}</span>
                </div>
                <h3 className="mt-8 font-display text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-6"
              >
                <dt className="mt-2 text-xs uppercase tracking-[0.14em] text-white/45">{stat.label}</dt>
                <dd className="text-gradient-cool font-display text-4xl font-semibold tracking-tight sm:text-5xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
