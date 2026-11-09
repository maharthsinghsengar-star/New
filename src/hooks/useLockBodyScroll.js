import { useEffect } from 'react'

// Reference-counted so several overlays can lock scrolling at once.
const lockState = { count: 0 }

export function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return undefined
    const root = document.documentElement
    lockState.count += 1
    if (lockState.count === 1) root.style.overflow = 'hidden'
    return () => {
      lockState.count -= 1
      if (lockState.count === 0) root.style.overflow = ''
    }
  }, [active])
}
