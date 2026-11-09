import { useCallback, useMemo, useState } from 'react'
import { prefersReducedMotion } from '../lib/utils'
import { UIContext } from './contexts'

export function UIProvider({ children }) {
  const [category, setCategory] = useState('all')
  const [quickView, setQuickView] = useState(null) // { product, finish }
  const [infoTopic, setInfoTopic] = useState(null)
  // The intro preloader is skipped for people who prefer reduced motion.
  const [showPreloader] = useState(() => !prefersReducedMotion())
  const [introDone, setIntroDone] = useState(() => prefersReducedMotion())

  const openQuickView = useCallback((product, finish) => {
    setQuickView({ product, finish: finish ?? product.finishes[0] })
  }, [])
  const closeQuickView = useCallback(() => setQuickView(null), [])
  const openInfo = useCallback((topic) => setInfoTopic(topic), [])
  const closeInfo = useCallback(() => setInfoTopic(null), [])
  const completeIntro = useCallback(() => setIntroDone(true), [])

  const value = useMemo(
    () => ({
      category,
      setCategory,
      quickView,
      openQuickView,
      closeQuickView,
      infoTopic,
      openInfo,
      closeInfo,
      showPreloader,
      introDone,
      completeIntro,
    }),
    [category, quickView, openQuickView, closeQuickView, infoTopic, openInfo, closeInfo, showPreloader, introDone, completeIntro],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}
