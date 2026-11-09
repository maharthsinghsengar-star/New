import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CircleCheck, Lock, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import { useCart } from '../context/contexts'
import { getFinish } from '../data/finishes'
import { FREE_SHIPPING_THRESHOLD } from '../data/store'
import { formatPrice, scrollToSection } from '../lib/utils'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { QuantityStepper } from './ui/QuantityStepper'
import { EASE } from '../lib/motion'
import { Stage } from './ui/Stage'
import { ProductVisual } from './visuals/ProductVisual'

function CartLine({ item, onQty, onRemove }) {
  const finish = getFinish(item.finish)
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex gap-4 py-5"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-white/[0.06]">
        <Stage accent={finish.led} spotlight={false}>
          <div className="absolute inset-0 p-1.5">
            <ProductVisual product={item.product} finish={item.finish} bottleClassName="h-[94%]" accessoryClassName="w-full" />
          </div>
        </Stage>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display font-semibold tracking-tight">{item.product.name}</p>
            <p className="mt-0.5 text-sm text-white/50">{finish.name}</p>
          </div>
          <p className="shrink-0 font-medium tabular-nums">{formatPrice(item.lineTotal)}</p>
        </div>
        <div className="flex items-center justify-between">
          <QuantityStepper size="sm" min={1} value={item.qty} onChange={onQty} label={`Quantity of ${item.product.name}`} />
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-white/45 transition hover:bg-white/[0.06] hover:text-ember-400"
            aria-label={`Remove ${item.product.name} (${finish.name}) from cart`}
          >
            <Trash2 className="size-3.5" /> Remove
          </button>
        </div>
      </div>
    </motion.li>
  )
}

export function CartDrawer() {
  const cart = useCart()
  const [order, setOrder] = useState(null)

  const close = () => {
    cart.closeCart()
    if (order) setTimeout(() => setOrder(null), 500)
  }

  const browse = () => {
    close()
    setTimeout(() => scrollToSection('shop'), 80)
  }

  const checkout = () => {
    setOrder({
      number: `AQ-${Math.floor(100000 + Math.random() * 900000)}`,
      total: cart.total,
      count: cart.count,
    })
    cart.clearCart()
  }

  const progress = Math.min(1, cart.subtotal / FREE_SHIPPING_THRESHOLD)

  return (
    <Modal open={cart.isOpen} onClose={close} labelledBy="cart-title" variant="right">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
        <h2 id="cart-title" className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
          Your cart
          {cart.count > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70">{cart.count}</span>
          )}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close cart"
          className="grid size-10 place-items-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      {order ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center"
          role="status"
        >
          <div className="grid size-20 place-items-center rounded-full bg-electric-500/15 text-electric-300 ring-1 ring-electric-400/30 shadow-[0_0_60px_rgba(43,127,255,0.35)]">
            <CircleCheck className="size-9" />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">Order confirmed</p>
            <p className="mt-2 text-white/60">
              Thank you! Order <span className="font-medium text-white">{order.number}</span> — {order.count}{' '}
              {order.count === 1 ? 'item' : 'items'}, {formatPrice(order.total)}.
            </p>
            <p className="mt-4 text-xs text-white/40">This is a demo store — no payment was taken and nothing will ship.</p>
          </div>
          <Button variant="secondary" onClick={browse}>
            Continue shopping
          </Button>
        </motion.div>
      ) : cart.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="grid size-20 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/50">
            <ShoppingBag className="size-8" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold">Your cart is empty</p>
            <p className="mt-2 text-sm text-white/55">Discover the bottle that learns how you hydrate.</p>
          </div>
          <Button onClick={browse}>
            Explore the collection <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="border-b border-white/[0.07] px-6 py-4">
            <p className="flex items-center gap-2 text-sm text-white/70" aria-live="polite">
              <Truck className="size-4 text-electric-300" />
              {cart.freeShippingRemaining > 0 ? (
                <span>
                  You’re <span className="font-medium text-white">{formatPrice(cart.freeShippingRemaining)}</span> away from free shipping
                </span>
              ) : (
                <span>You’ve unlocked free carbon-neutral shipping</span>
              )}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#4aa8ff,#8b5cf6,#ff7a1a)]"
                initial={false}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            </div>
          </div>

          <ul className="flex-1 divide-y divide-white/[0.06] overflow-y-auto overscroll-contain px-6">
            <AnimatePresence initial={false}>
              {cart.items.map((item) => (
                <CartLine
                  key={item.key}
                  item={item}
                  onQty={(qty) => cart.setQty(item.key, qty)}
                  onRemove={() => cart.removeItem(item.key)}
                />
              ))}
            </AnimatePresence>
          </ul>

          <div className="border-t border-white/[0.07] bg-ink-950/60 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-white">{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-white/60">
                <dt>Shipping</dt>
                <dd className="tabular-nums text-white">{cart.shipping === 0 ? 'Free' : formatPrice(cart.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/[0.07] pt-3 text-base">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-lg font-semibold tabular-nums">{formatPrice(cart.total)}</dd>
              </div>
            </dl>
            <Button size="lg" className="mt-5 w-full" onClick={checkout}>
              <Lock className="size-4" /> Checkout · {formatPrice(cart.total)}
            </Button>
            <button
              type="button"
              onClick={close}
              className="mt-3 w-full rounded-full py-2 text-sm text-white/55 transition hover:text-white"
            >
              Continue shopping
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
