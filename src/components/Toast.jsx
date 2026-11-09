import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, X } from 'lucide-react'
import { useCart } from '../context/contexts'
import { getFinish } from '../data/finishes'
import { EASE } from '../lib/motion'
import { Stage } from './ui/Stage'
import { ProductVisual } from './visuals/ProductVisual'

export function Toast() {
  const { toast, dismissToast, openCart } = useCart()

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(dismissToast, 4000)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.stamp}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/90 p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
              <Stage accent={getFinish(toast.finish).led} spotlight={false}>
                <div className="absolute inset-0 p-1">
                  <ProductVisual product={toast.product} finish={toast.finish} bottleClassName="h-[96%]" accessoryClassName="w-full" />
                </div>
              </Stage>
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-electric-300">
                <CircleCheck className="size-3.5" /> Added to cart
              </p>
              <p className="truncate text-sm font-medium">{toast.product.name}</p>
              <p className="text-xs text-white/50">
                {getFinish(toast.finish).name} · Qty {toast.qty}
              </p>
            </div>
            <button
              type="button"
              onClick={openCart}
              className="h-9 shrink-0 rounded-full bg-white px-4 text-xs font-semibold text-ink-950 transition hover:bg-electric-300"
            >
              View cart
            </button>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
