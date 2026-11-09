import { useEffect, useEffectEvent } from 'react'
import { useLockBodyScroll } from './useLockBodyScroll'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog behaviour: locks page scroll, moves focus into the panel,
 * traps Tab, closes on Escape and restores focus when closed.
 */
export function useDialog({ open, onClose, panelRef }) {
  useLockBodyScroll(open)
  const handleClose = useEffectEvent(() => onClose())

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const getFocusable = () => Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])

    const frame = requestAnimationFrame(() => {
      const target = getFocusable()[0] ?? panelRef.current
      target?.focus({ preventScroll: true })
    })

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [open, panelRef])
}
