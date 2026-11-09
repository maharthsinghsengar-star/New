// Shared motion language: one easing curve and a few reusable variants,
// so every animation on the site feels like part of the same system.
export const EASE = [0.16, 1, 0.3, 1]
export const EASE_IN_OUT = [0.76, 0, 0.24, 1]

/** Parent variant that staggers its children when it enters view. */
export const stagger = (gap = 0.08, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

/** Child variant: rise + fade (+ optional blur) into place. */
export const rise = (y = 24, blur = 0) => ({
  hidden: { opacity: 0, y, filter: blur ? `blur(${blur}px)` : 'blur(0px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE } },
})

/** Child variant for masked text lines/words that slide up from below. */
export const maskUp = {
  hidden: { y: '115%' },
  show: { y: '0%', transition: { duration: 1, ease: EASE } },
}
