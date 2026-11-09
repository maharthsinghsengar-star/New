import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Eye, Plus } from 'lucide-react'
import { useCart, useUI } from '../context/contexts'
import { getFinish } from '../data/finishes'
import { cn, formatPrice } from '../lib/utils'
import { Rating } from './ui/Rating'
import { EASE } from '../lib/motion'
import { Stage } from './ui/Stage'
import { Swatches } from './ui/Swatches'
import { ProductVisual } from './visuals/ProductVisual'

const BADGE_STYLES = {
  Bestseller: 'bg-electric-500/90 text-white shadow-[0_0_20px_rgba(43,127,255,0.55)]',
  New: 'bg-ember-500 text-white shadow-[0_0_20px_rgba(255,122,26,0.6)]',
  Limited: 'bg-[linear-gradient(110deg,#2b7fff,#8b5cf6,#ff7a1a)] text-white',
  Eco: 'bg-white/90 text-ink-950',
}

export function ProductBadge({ label, className }) {
  if (!label) return null
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
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
  const [added, setAdded] = useState(false)
  const accent = getFinish(finish).led

  useEffect(() => {
    if (!added) return undefined
    const timer = setTimeout(() => setAdded(false), 1600)
    return () => clearTimeout(timer)
  }, [added])

  const handleAdd = () => {
    addItem(product, finish, 1)
    setAdded(true)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.55, ease: EASE, delay: Math.min(index, 8) * 0.04 }}
      className="group relative flex flex-col rounded-[1.6rem] border border-white/[0.07] bg-linear-to-b from-white/[0.05] to-white/[0.012] p-2 transition-[border-color,box-shadow] duration-500 hover:border-white/[0.16] hover:shadow-[0_30px_80px_-30px_rgba(43,127,255,0.45)] sm:p-2.5"
    >
      <button
        type="button"
        onClick={() => openQuickView(product, finish)}
        className="relative block aspect-[4/5] w-full overflow-hidden rounded-[1.25rem]"
        aria-label={`Quick view: ${product.name}`}
      >
        <Stage accent={accent}>
          <div className="absolute inset-0 pt-5 transition-transform duration-700 ease-out-expo group-hover:-translate-y-1 group-hover:scale-[1.06]">
            <ProductVisual product={product} finish={finish} />
          </div>
        </Stage>
        <ProductBadge label={product.badge} className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3" />
        <span className="glass absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full p-1.5 text-[11px] font-medium text-white/90 sm:right-3 sm:top-3 sm:px-2.5 lg:translate-y-1 lg:opacity-0 lg:transition lg:duration-300 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
          <Eye className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Quick view</span>
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 px-1.5 pb-1.5 pt-3 sm:px-2.5 sm:pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold tracking-tight text-white sm:text-[1.05rem]">{product.name}</h3>
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
            'mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all duration-300 active:scale-[0.97] sm:h-11 sm:text-sm',
            added
              ? 'bg-electric-500/15 text-electric-300 ring-1 ring-electric-400/40'
              : 'bg-white text-ink-950 hover:bg-electric-300',
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
    </motion.article>
  )
}
