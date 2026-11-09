import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Check, Eye, Plus } from 'lucide-react'
import { useCart, useUI } from '../context/contexts'
import { getFinish } from '../data/finishes'
import { EASE } from '../lib/motion'
import { cn, formatPrice } from '../lib/utils'
import { Rating } from './ui/Rating'
import { Stage } from './ui/Stage'
import { Swatches } from './ui/Swatches'
import { ProductVisual } from './visuals/ProductVisual'

const BADGE_STYLES = {
  Bestseller: 'bg-electric-500/90 text-white shadow-[0_0_20px_rgba(43,127,255,0.55)]',
  New: 'bg-ember-500 text-white shadow-[0_0_20px_rgba(255,122,26,0.6)]',
  Limited: 'bg-[linear-gradient(110deg,#2b7fff,#8b5cf6,#ff7a1a)] text-white',
  Eco: 'bg-white/90 text-ink-950',
}

const TILT_SPRING = { stiffness: 200, damping: 20, mass: 0.6 }

export function ProductBadge({ label, className }) {
  if (!label) return null
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em]',
        BADGE_STYLES[label] ?? 'bg-white/10 text-white',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart()
  const { openQuickView } = useUI()
  const [finish, setFinish] = useState(product.finishes[0])
  const [preview, setPreview] = useState(null)
  const [added, setAdded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const shown = preview ?? finish
  const accent = getFinish(shown).led

  // Pointer position over the card (0–1) drives tilt, glare and reflections.
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), TILT_SPRING)
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), TILT_SPRING)
  const highlightX = useSpring(useTransform(px, [0, 1], [-8, 8]), TILT_SPRING)
  const glareX = useTransform(px, (v) => `${v * 100}%`)
  const glareY = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(340px circle at ${glareX} ${glareY}, rgba(255,255,255,0.13), transparent 60%)`

  useEffect(() => {
    if (!added) return undefined
    const timer = setTimeout(() => setAdded(false), 1600)
    return () => clearTimeout(timer)
  }, [added])

  const handleAdd = () => {
    addItem(product, finish, 1)
    setAdded(true)
  }

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    px.set((event.clientX - rect.left) / rect.width)
    py.set((event.clientY - rect.top) / rect.height)
  }
  const onPointerEnter = (event) => {
    if (event.pointerType === 'mouse') setHovered(true)
  }
  const onPointerLeave = () => {
    px.set(0.5)
    py.set(0.5)
    setHovered(false)
    setPreview(null)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.65, ease: EASE, delay: Math.min(index, 8) * 0.05 }}
      className="relative [perspective:1100px]"
    >
      <motion.div
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        whileTap={{ scale: 0.985 }}
        style={{ rotateX, rotateY, '--glow-opacity': hovered ? 1 : 0 }}
        className={cn(
          'glass-card glow-border group relative flex h-full flex-col rounded-[1.6rem] p-2 transition-shadow duration-500 sm:p-2.5',
          hovered && 'shadow-[0_45px_100px_-35px_rgba(43,127,255,0.55)]',
        )}
      >
        <motion.div
          aria-hidden="true"
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        <button
          type="button"
          onClick={() => openQuickView(product, finish)}
          className="relative block aspect-[4/5] w-full overflow-hidden rounded-[1.25rem]"
          aria-label={`Quick view: ${product.name}`}
        >
          <Stage accent={accent} beams={hovered}>
            <motion.div
              className="absolute inset-0 pt-5"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 1, ease: EASE }}
            >
              <div className="h-full transition-transform duration-700 ease-out-expo group-hover:-translate-y-1.5 group-hover:scale-[1.07]">
                <ProductVisual product={product} finish={shown} live={hovered} highlightX={highlightX} />
              </div>
            </motion.div>
          </Stage>
          <ProductBadge label={product.badge} className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3" />
          <span className="glass absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full p-1.5 text-[11px] font-medium text-white/90 sm:right-3 sm:top-3 sm:px-2.5 lg:translate-y-1 lg:opacity-0 lg:transition lg:duration-300 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            <Eye className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Quick view</span>
          </span>
          <span className="glass absolute bottom-3 left-3 hidden rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/80 sm:inline-flex lg:translate-y-2 lg:opacity-0 lg:transition lg:duration-500 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            {product.capacity}
          </span>
        </button>

        <div className="flex flex-1 flex-col gap-3 px-1.5 pb-1.5 pt-3.5 sm:px-2.5 sm:pt-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-[0.95rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.08rem]">
                {product.name}
              </h3>
              <p className="mt-1 hidden text-sm text-white/50 sm:block">{product.tagline}</p>
            </div>
            <p className="font-display text-sm font-semibold text-white/90 sm:text-lg">{formatPrice(product.price)}</p>
          </div>

          <div className="flex min-h-7 items-center justify-between gap-2">
            {product.finishes.length > 1 ? (
              <Swatches
                size="sm"
                finishes={product.finishes}
                value={finish}
                onChange={setFinish}
                onPreview={setPreview}
                label={`${product.name} colour`}
                className="gap-1.5"
              />
            ) : (
              <span className="text-xs text-white/45">{product.capacity}</span>
            )}
            <Rating value={product.rating} count={product.reviews} className="hidden sm:inline-flex" />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${product.name} in ${getFinish(finish).name} to cart`}
            className={cn(
              'relative mt-auto inline-flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-full text-xs font-semibold transition-all duration-300 active:scale-[0.97] sm:text-sm',
              added
                ? 'bg-electric-500/15 text-electric-300 ring-1 ring-electric-400/40'
                : 'bg-white text-ink-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] hover:bg-electric-300',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span
                  key="added"
                  className="inline-flex items-center gap-1.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="size-4" /> Added
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  className="inline-flex items-center gap-1.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="size-4" /> Add to cart
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.div>
    </motion.article>
  )
}
