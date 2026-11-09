import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { ProductCard } from '../components/ProductCard'
import { Button } from '../components/ui/Button'
import { Reveal } from '../components/ui/Reveal'
import { SectionHeading } from '../components/ui/SectionHeading'
import { useUI } from '../context/contexts'
import { CATEGORIES, PRODUCTS, SORT_OPTIONS } from '../data/products'
import { cn } from '../lib/utils'

const COUNTS = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.id === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.categories.includes(c.id)).length]),
)

const SORTERS = {
  featured: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
}

export function Shop() {
  const { category, setCategory } = useUI()
  const [sort, setSort] = useState('featured')

  const products = useMemo(() => {
    const filtered = category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.categories.includes(category))
    return [...filtered].sort(SORTERS[sort])
  }, [category, sort])

  return (
    <section id="shop" aria-labelledby="shop-title" className="relative py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60rem]"
        style={{ background: 'radial-gradient(50% 40% at 50% 0%, rgba(43,127,255,0.12), transparent 70%)' }}
      />
      <div className="shell">
        <SectionHeading
          eyebrow="The collection"
          index="02"
          title="Choose your ritual."
          description="Smart bottles, thermal flagships and the accessories that complete them. Free carbon-neutral shipping on every order over $150."
          titleId="shop-title"
        />

        <Reveal>
          <div className="mt-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="glass-card overflow-hidden rounded-full p-1">
            <div
              role="group"
              aria-label="Filter products by category"
              className="no-scrollbar flex gap-1 overflow-x-auto"
            >
              {CATEGORIES.map((c) => {
                const active = category === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-300',
                      active ? 'text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="filter-pill"
                        className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,rgba(43,127,255,0.95),rgba(139,92,246,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_30px_-8px_rgba(43,127,255,0.8)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{c.label}</span>
                    <span className={cn('relative font-mono text-[10px] tabular-nums', active ? 'text-white/85' : 'text-white/35')}>
                      {COUNTS[c.id]}
                    </span>
                  </button>
                )
              })}
            </div>
            </div>

            <div className="flex items-center justify-between gap-4 pl-2 md:pl-0">
              <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-white/45" aria-live="polite">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </p>
              <label className="glass-card relative inline-flex h-12 min-w-0 items-center gap-2 rounded-full pl-4 pr-9 text-sm text-white/80 transition focus-within:border-electric-400/60 hover:border-white/25">
                <SlidersHorizontal className="size-4 text-white/50" aria-hidden="true" />
                <span className="sr-only">Sort products</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="min-w-0 appearance-none truncate bg-transparent pr-1 text-white outline-none focus-visible:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id} className="bg-ink-900 text-white">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 size-4 text-white/50" aria-hidden="true" />
              </label>
            </div>
          </div>
        </Reveal>

        <motion.div layout className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {products.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-white/[0.07] p-12 text-center">
            <p className="text-white/60">No products match this filter yet.</p>
            <Button variant="secondary" onClick={() => setCategory('all')}>
              Show all products
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
