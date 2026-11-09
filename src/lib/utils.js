import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge resolves conflicts (e.g. `inline-flex` + `hidden`) so the
// class passed last always wins. Custom utilities from index.css are registered
// as their own groups so they are never merged away.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'text-fx': ['text-gradient', 'text-gradient-cool', 'text-gradient-silver', 'text-ghost'],
      'bg-fx': ['bg-grid', 'noise'],
      surface: ['glass', 'gradient-border', 'shell', 'no-scrollbar'],
    },
  },
})

export const cn = (...classes) => twMerge(clsx(classes))

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const formatPrice = (value) => currency.format(value)

export const formatCount = (value) => new Intl.NumberFormat('en-US').format(value)

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Smoothly scroll to a section by id ("home" scrolls to the very top). */
export function scrollToSection(id) {
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  if (id === 'home') {
    window.scrollTo({ top: 0, behavior })
  } else {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior, block: 'start' })
  }
  if (window.history?.replaceState) {
    window.history.replaceState(null, '', id === 'home' ? window.location.pathname : `#${id}`)
  }
}
