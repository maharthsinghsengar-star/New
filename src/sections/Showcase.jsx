import { useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ChevronDown, Plus, ShoppingBag, Zap } from 'lucide-react'
import { Bottle } from '../components/visuals/Bottle'
import { BOTTLE_VB, getBottleHotspots } from '../components/visuals/geometry'
import { Button } from '../components/ui/Button'
import { Reveal } from '../components/ui/Reveal'
import { EASE } from '../lib/motion'
import { SectionHeading } from '../components/ui/SectionHeading'
import { Stage } from '../components/ui/Stage'
import { Swatches } from '../components/ui/Swatches'
import { useCart, useUI } from '../context/contexts'
import { getFinish } from '../data/finishes'
import { PRODUCT_MAP } from '../data/products'
import { SHOWCASE_MODELS } from '../data/showcase'
import { cn, formatPrice } from '../lib/utils'

export function Showcase() {
  const { addItem } = useCart()
  const { openQuickView } = useUI()
  const [modelId, setModelId] = useState(SHOWCASE_MODELS[0].id)
  const model = SHOWCASE_MODELS.find((m) => m.id === modelId)
  const product = PRODUCT_MAP[model.productId]
  const [finish, setFinish] = useState(product.finishes[0])
  const [activePart, setActivePart] = useState('cap')

  const f = getFinish(finish)
  // Pointer over the stage slides the bottle's reflections and tilts it slightly.
  const pointer = useMotionValue(0)
  const smooth = useSpring(pointer, { stiffness: 80, damping: 20 })
  const highlightX = useTransform(smooth, [-1, 1], [-10, 10])
  const tilt = useTransform(smooth, [-1, 1], [-6, 6])
  const spots = getBottleHotspots(product.visual.model)
  const activeIndex = model.hotspots.findIndex((h) => h.part === activePart)
  const activeSpot = model.hotspots[activeIndex]
  const activePos = spots[activePart]

  const selectModel = (id) => {
    const next = SHOWCASE_MODELS.find((m) => m.id === id)
    setModelId(id)
    setFinish(PRODUCT_MAP[next.productId].finishes[0])
    setActivePart('cap')
  }

  return (
    <section id="technology" aria-labelledby="tech-title" className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(10,18,48,0.55) 30%, rgba(10,18,48,0.55) 70%, transparent)' }}
      />
      <div className="shell">
        <SectionHeading
          eyebrow="Product showcase"
          index="03"
          title="Engineered down to the last drop."
          description="Explore the technology inside every AQUORA. Choose a model, then tap the hotspots to see how each detail works."
          titleId="tech-title"
        />

        <Reveal>
          <div className="mt-10 flex justify-center">
            <div role="tablist" aria-label="Choose a model" className="glass inline-flex gap-1 rounded-full p-1">
              {SHOWCASE_MODELS.map((m) => {
                const selected = m.id === modelId
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    id={`tab-${m.id}`}
                    aria-selected={selected}
                    aria-controls="showcase-panel"
                    onClick={() => selectModel(m.id)}
                    className={cn(
                      'relative h-10 rounded-full px-5 text-sm font-medium transition-colors duration-300 sm:px-7',
                      selected ? 'text-ink-950' : 'text-white/65 hover:text-white',
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="model-pill"
                        className="absolute inset-0 rounded-full bg-white"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Reveal>

        <div
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`tab-${modelId}`}
          className="mt-12 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
        >
          {/* Stage with hotspots */}
          <Reveal>
            <div
              className="gradient-border relative h-[min(128vw,620px)] overflow-hidden rounded-[2rem] lg:h-[680px]"
              onPointerMove={(event) => {
                if (event.pointerType !== 'mouse') return
                const rect = event.currentTarget.getBoundingClientRect()
                pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1)
              }}
              onPointerLeave={() => pointer.set(0)}
            >
              <Stage accent={f.led} beams particles>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={model.id}
                    aria-hidden="true"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="text-ghost pointer-events-none absolute inset-x-0 top-[38%] select-none text-center font-display text-[26vw] font-semibold uppercase leading-none tracking-[-0.05em] lg:text-[11rem]"
                  >
                    {model.id}
                  </motion.p>
                </AnimatePresence>

                <div className="absolute inset-0 flex items-center justify-center pb-2 pt-8">
                  <motion.div
                    className="relative h-[90%]"
                    style={{ aspectRatio: `${BOTTLE_VB.width} / ${BOTTLE_VB.height}`, rotateY: tilt, transformPerspective: 1200 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${model.id}-${finish}`}
                        className="absolute inset-0"
                        initial={{ opacity: 0, y: 30, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.98 }}
                        transition={{ duration: 0.55, ease: EASE }}
                      >
                        <Bottle
                          model={product.visual.model}
                          finish={finish}
                          level={0.8}
                          live
                          highlightX={highlightX}
                          temp={6}
                          className="h-full w-full"
                          title={`${product.name} in ${f.name}`}
                        />
                      </motion.div>
                    </AnimatePresence>

                    {model.hotspots.map((h, i) => {
                      const pos = spots[h.part]
                      const isActive = h.part === activePart
                      return (
                        <button
                          key={h.part}
                          type="button"
                          onClick={() => setActivePart(h.part)}
                          onMouseEnter={() => setActivePart(h.part)}
                          aria-label={`${i + 1}. ${h.title}`}
                          aria-pressed={isActive}
                          className="absolute z-10 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center"
                          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        >
                          <span
                            className={cn('animate-ripple absolute inset-0 rounded-full', isActive ? 'bg-white/35' : 'bg-white/15')}
                            style={{ animationDelay: `${i * 0.4}s` }}
                          />
                          <span
                            className={cn(
                              'relative grid size-6 place-items-center rounded-full border transition duration-300',
                              isActive
                                ? 'scale-110 border-white bg-white text-ink-950 shadow-[0_0_24px_rgba(255,255,255,0.7)]'
                                : 'border-white/60 bg-ink-950/60 text-white backdrop-blur',
                            )}
                          >
                            <Plus className={cn('size-3.5 transition-transform duration-300', isActive && 'rotate-45')} />
                          </span>
                        </button>
                      )
                    })}

                    {/* Floating label next to the active hotspot */}
                    <AnimatePresence mode="wait">
                      {activeSpot && (
                        <motion.div
                          key={`${model.id}-${activePart}`}
                          initial={{ opacity: 0, x: activePos.x > 50 ? -8 : 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="glass pointer-events-none absolute z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium text-white sm:block"
                          style={
                            activePos.x > 50
                              ? { left: `calc(${activePos.x}% + 26px)`, top: `${activePos.y}%` }
                              : { right: `calc(${100 - activePos.x}% + 26px)`, top: `${activePos.y}%` }
                          }
                        >
                          {activeSpot.title}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-xs text-white/50">
                  <span>
                    AQUORA {model.label} · <span className="text-white/80">{f.name}</span>
                  </span>
                  <span className="tabular-nums">
                    0{activeIndex + 1} / 0{model.hotspots.length}
                  </span>
                </div>
              </Stage>
            </div>
          </Reveal>

          {/* Details */}
          <div className="flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-electric-300">{product.name}</p>
                <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
                  {model.headline}
                </h3>
                <p className="mt-5 leading-relaxed text-white/60 sm:text-lg">{model.description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="text-sm text-white/50">Finish</span>
              <Swatches finishes={product.finishes} value={finish} onChange={setFinish} label={`${product.name} finish`} />
              <span className="text-sm text-white/80">{f.name}</span>
            </div>

            <ul className="mt-8 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {model.hotspots.map((h, i) => {
                const isActive = h.part === activePart
                return (
                  <li key={h.part}>
                    <button
                      type="button"
                      onClick={() => setActivePart(h.part)}
                      aria-expanded={isActive}
                      className="flex w-full items-start gap-4 py-4 text-left"
                    >
                      <span
                        className={cn(
                          'mt-1 text-xs tabular-nums transition-colors',
                          isActive ? 'text-ember-400' : 'text-white/30',
                        )}
                      >
                        0{i + 1}
                      </span>
                      <span className="flex-1">
                        <span
                          className={cn(
                            'block font-display text-lg font-medium transition-colors duration-300',
                            isActive ? 'text-white' : 'text-white/55 hover:text-white/80',
                          )}
                        >
                          {h.title}
                        </span>
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.span
                              key="text"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.35, ease: EASE }}
                              className="block overflow-hidden"
                            >
                              <span className="block pt-2 text-sm leading-relaxed text-white/55">{h.text}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      <ChevronDown
                        className={cn('mt-1.5 size-4 text-white/40 transition-transform duration-300', isActive && 'rotate-180')}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={() => addItem(product, finish, 1)}>
                <ShoppingBag className="size-4" /> Add to cart — {formatPrice(product.price)}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => openQuickView(product, finish)}>
                View details
              </Button>
            </div>
          </div>
        </div>

        {/* Smart technology highlights */}
        <Reveal>
          <ul className="mt-16 flex flex-wrap justify-center gap-2.5" aria-label="Smart technology highlights">
            {model.tech.map((t) => (
              <li
                key={t}
                className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/75"
              >
                <Zap className="size-3.5 text-ember-400" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Specifications */}
        <Reveal>
          <div className="glass-card mt-6 rounded-[2rem] p-6 sm:p-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Technical specifications</h3>
              <p className="text-sm text-white/45">{product.name}</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.dl
                key={model.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-5"
              >
                {model.specs.map((spec) => (
                  <div key={spec.label} className="border-t border-white/[0.07] pt-4">
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-white/40">{spec.label}</dt>
                    <dd className="mt-1.5 text-sm font-medium text-white/90 sm:text-base">{spec.value}</dd>
                  </div>
                ))}
              </motion.dl>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
