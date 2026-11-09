import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { PRODUCT_MAP } from '../data/products'
import { FREE_SHIPPING_THRESHOLD, MAX_QTY, SHIPPING_FLAT } from '../data/store'
import { CartContext } from './contexts'

const STORAGE_KEY = 'aquora.cart.v1'

const lineKey = (id, finish) => `${id}:${finish}`
const clampQty = (qty) => Math.max(0, Math.min(MAX_QTY, Math.floor(qty)))

/** Read a previously saved cart, discarding anything that no longer matches the catalogue. */
function loadCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((line) => line && PRODUCT_MAP[line.id] && Number.isFinite(line.qty) && line.qty > 0)
      .map((line) => {
        const product = PRODUCT_MAP[line.id]
        const finish = product.finishes.includes(line.finish) ? line.finish : product.finishes[0]
        return { id: line.id, finish, qty: clampQty(line.qty) }
      })
  } catch {
    return []
  }
}

function cartReducer(lines, action) {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.id, action.finish)
      const existing = lines.find((line) => lineKey(line.id, line.finish) === key)
      if (existing) {
        return lines.map((line) =>
          line === existing ? { ...line, qty: clampQty(line.qty + action.qty) } : line,
        )
      }
      return [...lines, { id: action.id, finish: action.finish, qty: clampQty(action.qty) }]
    }
    case 'setQty': {
      const qty = clampQty(action.qty)
      if (qty === 0) return lines.filter((line) => lineKey(line.id, line.finish) !== action.key)
      return lines.map((line) => (lineKey(line.id, line.finish) === action.key ? { ...line, qty } : line))
    }
    case 'remove':
      return lines.filter((line) => lineKey(line.id, line.finish) !== action.key)
    case 'clear':
      return []
    default:
      return lines
  }
}

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, loadCart)
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Storage can be unavailable (private mode, blocked site data) — the cart still works in memory.
    }
  }, [lines])

  const addItem = useCallback((product, finish = product.finishes[0], qty = 1) => {
    dispatch({ type: 'add', id: product.id, finish, qty })
    setToast({ stamp: Date.now(), product, finish, qty })
  }, [])

  const setQty = useCallback((key, qty) => dispatch({ type: 'setQty', key, qty }), [])
  const removeItem = useCallback((key) => dispatch({ type: 'remove', key }), [])
  const clearCart = useCallback(() => dispatch({ type: 'clear' }), [])
  const openCart = useCallback(() => {
    setToast(null)
    setIsOpen(true)
  }, [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const value = useMemo(() => {
    const items = lines.map((line) => {
      const product = PRODUCT_MAP[line.id]
      return {
        ...line,
        key: lineKey(line.id, line.finish),
        product,
        lineTotal: product.price * line.qty,
      }
    })
    const count = items.reduce((sum, item) => sum + item.qty, 0)
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
    return {
      items,
      count,
      subtotal,
      shipping,
      total: subtotal + shipping,
      freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
      isOpen,
      toast,
      addItem,
      setQty,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      dismissToast,
    }
  }, [lines, isOpen, toast, addItem, setQty, removeItem, clearCart, openCart, closeCart, dismissToast])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
