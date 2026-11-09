import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Menu, ShoppingBag, X } from 'lucide-react'
import { useCart } from '../context/contexts'
import { NAV_LINKS, SECTION_IDS } from '../data/navigation'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { cn, scrollToSection } from '../lib/utils'
import { Button } from './ui/Button'
import { Logo } from './ui/Logo'
import { EASE } from '../lib/motion'

export function Navbar() {
  const { count, openCart } = useCart()
  const active = useActiveSection(SECTION_IDS)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24))
  useLockBodyScroll(menuOpen)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false)
    const onResize = () => window.innerWidth >= 1024 && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  const go = (id) => {
    setMenuOpen(false)
    requestAnimationFrame(() => scrollToSection(id))
  }

  const linkProps = (id) => ({
    href: `#${id}`,
    onClick: (event) => {
      event.preventDefault()
      go(id)
    },
    'aria-current': active === id ? 'location' : undefined,
  })

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="absolute inset-x-0 top-0 z-10 h-[2px] origin-left bg-[linear-gradient(90deg,#4aa8ff,#8b5cf6,#ff7a1a)]"
      />
      <div
        className={cn(
          'border-b transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled || menuOpen
            ? 'border-white/[0.06] bg-ink-950/75 backdrop-blur-xl'
            : 'border-transparent bg-transparent',
        )}
      >
        <nav className="shell flex h-16 items-center justify-between lg:h-[72px]" aria-label="Main">
          <a {...linkProps('home')} aria-current={undefined} aria-label="AQUORA — back to top" className="rounded-full">
            <Logo />
          </a>

          <ul className="hidden items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 backdrop-blur-md lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  {...linkProps(link.id)}
                  className={cn(
                    'relative block rounded-full px-4 py-2 text-sm transition-colors duration-300',
                    active === link.id ? 'text-white' : 'text-white/60 hover:text-white',
                  )}
                >
                  {active === link.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.09] ring-1 ring-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button to="shop" size="sm" className="hidden md:inline-flex">
              Shop now
            </Button>
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
              className="relative grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <ShoppingBag className="size-[1.15rem]" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white shadow-[0_0_14px_rgba(255,122,26,0.8)]"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-ink-950/95 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="shell flex min-h-full flex-col justify-between gap-10 pb-10 pt-6">
              <ul className="flex flex-col">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.6, ease: EASE }}
                    className="border-b border-white/[0.06]"
                  >
                    <a
                      {...linkProps(link.id)}
                      className="flex items-center justify-between py-5 font-display text-3xl font-semibold tracking-tight"
                    >
                      <span className={active === link.id ? 'text-gradient' : 'text-white/85'}>{link.label}</span>
                      <ArrowUpRight className="size-6 text-white/30" />
                    </a>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
                className="flex flex-col gap-3"
              >
                <Button size="lg" onClick={() => go('shop')}>
                  Shop the collection <ArrowRight className="size-4" />
                </Button>
                <p className="text-center text-xs text-white/40">Free shipping over $150 · 60-night trial</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
