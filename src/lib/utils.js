import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge resolves conflicts (e.g. `inline-flex` + `hidden`) so the
// class passed last always wins. Custom utilities from index.css are registered
// as their own groups so they are never merged away.
const twMerge = extendTailwindMerge({
  extend: {
    // Custom fluid type scale from @theme in index.css (text-hero, text-display…)
    theme: { text: ['hero', 'display', 'title', 'lead', 'label'] },
    classGroups: {
      'text-fx': ['text-gradient', 'text-gradient-cool', 'text-gradient-silver', 'text-ghost', 'text-shimmer'],
      'bg-fx': ['bg-grid', 'noise'],
      surface: ['glass', 'glass-strong', 'glass-card', 'glass-nav', 'shell', 'no-scrollbar'],
      'border-fx': ['gradient-border', 'glow-border'],
      'glow-fx': ['glow-live'],
      safe: ['pt-safe', 'pb-safe'],
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
  try {
    // Keep the URL shareable; some embedded/sandboxed frames refuse history updates.
    window.history.replaceState(null, '', id === 'home' ? window.location.pathname : `#${id}`)
  } catch {
    // Scrolling already happened — the URL hash is a nice-to-have.
  }
}
