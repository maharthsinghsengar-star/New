import { cn } from '../../lib/utils'

// Deterministic dust motes: [left %, top %, delay s]
const MOTES = [
  [12, 78, 0], [22, 62, -2.2], [31, 86, -5], [44, 72, -1.4], [57, 90, -6.1], [66, 64, -3.3],
  [74, 82, -7.2], [83, 70, -4.4], [90, 88, -2.8], [38, 56, -8], [61, 50, -5.6], [18, 92, -3.7],
]

const BEAM_SHAPE = 'polygon(44% 0, 56% 0, 100% 100%, 0 100%)'
// Feathers the beam's side edges so it reads as volumetric light, not a hard shape.
const BEAM_FEATHER = 'linear-gradient(90deg, transparent 6%, #000 38%, #000 62%, transparent 94%)'

/**
 * Cinematic "photo studio" backdrop: deep gradient, top spotlight, optional
 * animated electric-blue / purple light beams and floating dust motes, a
 * coloured bounce light, soft studio floor and vignette.
 */
export function Stage({ accent = '#4aa8ff', className, children, spotlight = true, beams = false, particles = false, floor = true }) {
  return (
    <div className={cn('relative isolate h-full w-full overflow-hidden', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(130% 90% at 50% 0%, #141e44 0%, #080b19 52%, #03040a 100%)' }}
      />
      {spotlight && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-3/4"
          style={{ background: 'radial-gradient(45% 55% at 50% 0%, rgba(255,255,255,0.14), transparent 72%)' }}
        />
      )}
      {beams && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div
            className="animate-beam absolute -top-[8%] left-[2%] h-[100%] w-[52%] origin-top"
            style={{
              background: 'linear-gradient(180deg, rgba(74,168,255,0.36), rgba(74,168,255,0.06) 58%, transparent 86%)',
              clipPath: BEAM_SHAPE,
              maskImage: BEAM_FEATHER,
              WebkitMaskImage: BEAM_FEATHER,
            }}
          />
          <div
            className="animate-beam-reverse absolute -top-[8%] right-[2%] h-[100%] w-[52%] origin-top"
            style={{
              background: 'linear-gradient(180deg, rgba(167,139,250,0.34), rgba(139,92,246,0.06) 58%, transparent 86%)',
              clipPath: BEAM_SHAPE,
              maskImage: BEAM_FEATHER,
              WebkitMaskImage: BEAM_FEATHER,
            }}
          />
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 transition-[background] duration-700"
        style={{ background: `radial-gradient(42% 38% at 50% 62%, ${accent}3d, transparent 72%)` }}
      />
      {floor && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-[36%]"
          style={{
            background:
              'radial-gradient(55% 40% at 50% 38%, rgba(255,255,255,0.055), transparent 70%), linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
          }}
        />
      )}
      {particles && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {MOTES.map(([x, y, delay], i) => (
            <span
              key={i}
              className="animate-mote absolute size-[3px] rounded-full bg-white/70"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s`, boxShadow: '0 0 6px rgba(140,200,255,0.9)' }}
            />
          ))}
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
      />
      {children}
    </div>
  )
}
