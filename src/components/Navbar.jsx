import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import { ArrowRight, ArrowUpRight, ShoppingBag } from 'lucide-react'
import { useCart, useUI } from '../context/contexts'
import { NAV_LINKS, SECTION_IDS } from '../data/navigation'
import { PRODUCT_MAP } from '../data/products'
import { SOCIAL_LINKS } from '../data/social'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { EASE } from '../lib/motion'
import { cn, formatPrice, scrollToSection } from '../lib/utils'
import { Button } from './ui/Button'
import { Logo } from './ui/Logo'
import { Stage } from './ui/Stage'
import { Bottle } from './visuals/Bottle'

const FEATURED = PRODUCT_MAP.flux

/** Two-line icon that morphs into an X. */
function MenuIcon({ open }) {
  return (
    <span className="relative block h-3.5 w-5" aria-hidden="true">
      <span
        className={cn(
          'absolute left-0 top-0 h-[1.5px] w-5 rounded-full bg-white transition-transform duration-500 ease-out-expo',
          open && 'translate-y-[6.25px] rotate-45',
        )}
      />
      <span
        className={cn(
          'absolute bottom-0 right-0 h-[1.5px] rounded-full bg-white transition-all duration-500 ease-out-expo',
          open ? 'w-5 -translate-y-[6.25px] -rotate-45' : 'w-3.5',
        )}
      />
    </span>
  )
}

function CartButton({ count, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className={cn(
        'relative grid size-11 place-items-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition hover:bg-white/[0.12] active:scale-95',
        className,
      )}
    >
      <ShoppingBag className="size-[1.1rem]" />
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
  )
}

export function Navbar() {
  const { count, openCart } = useCart()
  const { introDone, openQuickView } = useUI()
  const active = useActiveSection(SECTION_IDS)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0
    setScrolled(y > 24)
    // On phones the bar tucks away while reading down and returns when scrolling up.
    if (window.innerWidth >= 1024) {
      setHidden(false)
      return
    }
    if (Math.abs(y - previous) < 4) return
    setHidden(y > previous && y > 320)
  })

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

  const showBar = !hidden || menuOpen

  return (
    <>
      <motion.header
        className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-safe sm:px-5"
        animate={{ y: showBar ? '0%' : '-130%' }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <motion.nav
          aria-label="Main"
          initial={{ y: -28, opacity: 0 }}
          animate={introDone ? { y: 0, opacity: 1 } : undefined}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
          style={{ backgroundColor: scrolled || menuOpen ? 'rgb(5 7 15 / 0.72)' : undefined }}
          className="glass-nav pointer-events-auto relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-[1.35rem] pl-4 pr-1.5 transition-[background-color] duration-500 sm:h-16 sm:rounded-full sm:pl-6 sm:pr-2"
        >
          <a {...linkProps('home')} aria-current={undefined} aria-label="AQUORA — back to top" className="rounded-full">
            <Logo markClassName="size-6 sm:size-7" />
          </a>

          <ul className="hidden items-center gap-0.5 rounded-full bg-white/[0.035] p-1 ring-1 ring-white/[0.06] lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  {...linkProps(link.id)}
                  className={cn(
                    'relative block rounded-full px-4 py-2 text-sm transition-colors duration-300',
                    active === link.id ? 'text-white' : 'text-white/55 hover:text-white',
                  )}
                >
                  {active === link.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button to="shop" size="sm" className="hidden md:inline-flex">
              Shop now
            </Button>
            <CartButton count={count} onClick={openCart} />
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition hover:bg-white/[0.12] active:scale-95 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>

          <span aria-hidden="true" className="absolute inset-x-6 -bottom-px h-px overflow-hidden rounded-full">
            <motion.span
              style={{ scaleX: progress }}
              className="block h-full origin-left bg-[linear-gradient(90deg,#4aa8ff,#8b5cf6,#ff7a1a)]"
            />
          </span>
        </motion.nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.12 } }}
            transition={{ duration: 0.35 }}
          >
            <div aria-hidden="true" className="glass-strong absolute inset-0 border-0" />
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
              <div
                className="animate-aurora absolute -left-1/3 top-1/4 size-[120vw] rounded-full"
                style={{ background: 'radial-gradient(closest-side, rgba(43,127,255,0.25), transparent 70%)' }}
              />
              <div
                className="animate-aurora-reverse absolute -right-1/3 -top-10 size-[110vw] rounded-full"
                style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.24), transparent 70%)' }}
              />
              <div
                className="bg-grid absolute inset-0 opacity-50"
                style={{
                  maskImage: 'linear-gradient(180deg, transparent, #000 30%, transparent 85%)',
                  WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 30%, transparent 85%)',
                }}
              />
            </div>

            <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain px-5 pb-safe pt-[calc(max(0.75rem,env(safe-area-inset-top))+5rem)] sm:px-8">
              <motion.p
                className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Navigate
              </motion.p>
              <ul className="mt-3">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.id}
                    className="relative"
                    initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -14, transition: { duration: 0.2, delay: (NAV_LINKS.length - i) * 0.025 } }}
                    transition={{ delay: 0.08 + i * 0.06, duration: 0.75, ease: EASE }}
                  >
                    <a {...linkProps(link.id)} className="group flex items-center gap-4 py-3.5">
                      <span className="w-6 font-mono text-xs text-white/35">0{i + 1}</span>
                      <span
                        className={cn(
                          'font-display text-[2.35rem] font-semibold leading-none tracking-[-0.04em] transition-transform duration-300 group-active:translate-x-1',
                          active === link.id ? 'text-gradient' : 'text-white/90',
                        )}
                      >
                        {link.label}
                      </span>
                      {active === link.id && (
                        <span className="size-1.5 rounded-full bg-ember-500 shadow-[0_0_10px_2px_rgba(255,122,26,0.7)]" />
                      )}
                      <ArrowUpRight className="ml-auto size-5 text-white/30" />
                    </a>
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-px origin-left bg-white/[0.08]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.9, ease: EASE }}
                    />
                  </motion.li>
                ))}
              </ul>

              <motion.button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openQuickView(FEATURED)
                }}
                className="glass mt-7 flex items-center gap-4 rounded-[1.6rem] p-2.5 pr-4 text-left active:scale-[0.98]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ delay: 0.42, duration: 0.7, ease: EASE }}
              >
                <span className="relative block h-24 w-20 shrink-0 overflow-hidden rounded-[1.1rem]">
                  <Stage accent="#4aa8ff" spotlight={false}>
                    <span className="absolute inset-0 flex items-center justify-center pt-1">
                      <Bottle model="flux" finish="midnight" reflection={false} className="h-[92%] w-auto" />
                    </span>
                  </Stage>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ember-400">New arrival</span>
                  <span className="mt-1 block font-display text-lg font-semibold tracking-tight">{FEATURED.name}</span>
                  <span className="block text-sm text-white/55">Live temperature · {formatPrice(FEATURED.price)}</span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-white/40" />
              </motion.button>

              <motion.div
                className="mt-auto pt-8"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
              >
                <div className="flex gap-3">
                  <Button size="lg" className="flex-1" onClick={() => go('shop')}>
                    Shop the collection <ArrowRight className="size-4" />
                  </Button>
                  <CartButton
                    count={count}
                    className="size-14"
                    onClick={() => {
                      setMenuOpen(false)
                      openCart()
                    }}
                  />
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <ul className="flex gap-2" aria-label="Social media">
                    {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                      <li key={label}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${label} (opens in a new tab)`}
                          className="grid size-10 place-items-center rounded-full text-white/55 ring-1 ring-white/10 transition hover:text-white"
                        >
                          <Icon className="size-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-white/35">
                    Free shipping $150+
                    <br />
                    60-night trial
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
