import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDialog } from '../../hooks/useDialog'
import { cn } from '../../lib/utils'
import { EASE } from '../../lib/motion'

const PANEL_VARIANTS = {
  center: {
    initial: { opacity: 0, y: 48, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 32, scale: 0.98 },
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
}

/** Accessible overlay used for the product quick view, info dialogs and the cart drawer. */
export function Modal({ open, onClose, labelledBy, variant = 'center', className, children }) {
  const panelRef = useRef(null)
  useDialog({ open, onClose, panelRef })
  const motionProps = PANEL_VARIANTS[variant]

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-[80] flex',
            variant === 'right' ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-6',
          )}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={cn(
              'glass-strong relative flex flex-col outline-none',
              variant === 'right'
                ? 'h-full w-full max-w-md border-l'
                : 'max-h-[92svh] w-full overflow-y-auto overscroll-contain rounded-t-[2rem] border sm:rounded-[2rem]',
              className,
            )}
            initial={motionProps.initial}
            animate={motionProps.animate}
            exit={motionProps.exit}
            transition={{ duration: 0.55, ease: EASE }}
          >
            {variant === 'center' && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-white/30 sm:hidden"
              />
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
