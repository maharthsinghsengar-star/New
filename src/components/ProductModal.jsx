import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react'
import { useCart, useUI } from '../context/contexts'
import { CATEGORIES } from '../data/products'
import { getFinish } from '../data/finishes'
import { formatPrice } from '../lib/utils'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { QuantityStepper } from './ui/QuantityStepper'
import { Rating } from './ui/Rating'
import { EASE } from '../lib/motion'
import { Stage } from './ui/Stage'
import { Swatches } from './ui/Swatches'
import { ProductBadge } from './ProductCard'
import { ProductVisual } from './visuals/ProductVisual'

const warrantyFor = (product) =>
  product.id === 'halo' ? '10-year warranty' : product.categories.includes('accessories') ? '2-year warranty' : '5-year warranty'

function ProductDetail({ product, initialFinish, onClose }) {
  const { addItem } = useCart()
  const [finish, setFinish] = useState(initialFinish)
  const [qty, setQty] = useState(1)
  const f = getFinish(finish)
  const category = CATEGORIES.find((c) => c.id === product.categories[product.categories.length - 1])

  const handleAdd = () => {
    addItem(product, finish, qty)
    onClose()
  }

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close product details"
        className="glass absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full text-white/80 transition hover:text-white"
      >
        <X className="size-5" />
      </button>

      <div className="relative h-[46svh] min-h-[300px] md:h-auto md:min-h-[600px]">
        <Stage accent={f.led}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={finish}
              className="absolute inset-0 px-8 pb-4 pt-12"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <ProductVisual product={product} finish={finish} animated />
            </motion.div>
          </AnimatePresence>
        </Stage>
        <ProductBadge label={product.badge} className="absolute left-5 top-5" />
      </div>

      <div className="flex flex-col gap-6 p-6 sm:p-10">
        <div className="pr-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-electric-300">{category?.label}</p>
          <h2 id="product-modal-title" className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {product.name}
          </h2>
          <p className="mt-2 text-white/55">{product.tagline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="font-display text-3xl font-semibold">{formatPrice(product.price)}</p>
          <Rating value={product.rating} count={product.reviews} className="text-sm" />
        </div>

        <p className="leading-relaxed text-white/65">{product.description}</p>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/55">
            {product.finishes.length > 1 ? 'Colour' : 'Finish'} — <span className="text-white">{f.name}</span>
          </p>
          {product.finishes.length > 1 && (
            <Swatches finishes={product.finishes} value={finish} onChange={setFinish} size="lg" label="Choose a colour" />
          )}
          <p className="text-sm text-white/45">{product.capacity}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <QuantityStepper value={qty} onChange={setQty} className="self-start sm:self-stretch" />
          <Button size="md" className="flex-1" onClick={handleAdd}>
            <ShoppingBag className="size-4" /> Add to cart · {formatPrice(product.price * qty)}
          </Button>
        </div>

        <ul className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-white/[0.07] pt-6 sm:grid-cols-2">
          {product.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-white/75">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-electric-500/20 text-electric-300">
                <Check className="size-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <ul className="grid grid-cols-3 gap-2 text-center text-[11px] leading-tight text-white/55 sm:text-xs">
          {[
            { icon: Truck, label: 'Free shipping over $150' },
            { icon: RotateCcw, label: '60-night trial' },
            { icon: ShieldCheck, label: warrantyFor(product) },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-2 py-3">
              <Icon className="size-4 text-white/70" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function ProductModal() {
  const { quickView, closeQuickView } = useUI()
  // Keep showing the last product while the dialog animates out.
  const [shown, setShown] = useState(quickView)
  if (quickView && quickView !== shown) setShown(quickView)

  return (
    <Modal open={Boolean(quickView)} onClose={closeQuickView} labelledBy="product-modal-title" className="sm:max-w-5xl">
      {shown && (
        <ProductDetail
          key={`${shown.product.id}-${shown.finish}`}
          product={shown.product}
          initialFinish={shown.finish}
          onClose={closeQuickView}
        />
      )}
    </Modal>
  )
}
