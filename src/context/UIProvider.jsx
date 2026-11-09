import { useCallback, useMemo, useState } from 'react'
import { UIContext } from './contexts'

export function UIProvider({ children }) {
  const [category, setCategory] = useState('all')
  const [quickView, setQuickView] = useState(null) // { product, finish }
  const [infoTopic, setInfoTopic] = useState(null)

  const openQuickView = useCallback((product, finish) => {
    setQuickView({ product, finish: finish ?? product.finishes[0] })
  }, [])
  const closeQuickView = useCallback(() => setQuickView(null), [])
  const openInfo = useCallback((topic) => setInfoTopic(topic), [])
  const closeInfo = useCallback(() => setInfoTopic(null), [])

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
    }),
    [category, quickView, openQuickView, closeQuickView, infoTopic, openInfo, closeInfo],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}
