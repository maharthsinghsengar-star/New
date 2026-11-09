import { InstagramIcon, TikTokIcon, XIcon, YouTubeIcon } from '../components/icons/SocialIcons'
import { Newsletter } from '../components/Newsletter'
import { Logo } from '../components/ui/Logo'
import { useUI } from '../context/contexts'
import { scrollToSection } from '../lib/utils'

const YEAR = new Date().getFullYear()

const SHOP_LINKS = [
  { label: 'All products', category: 'all' },
  { label: 'Smart bottles', category: 'smart' },
  { label: 'Thermal', category: 'thermal' },
  { label: 'Limited edition', category: 'limited' },
  { label: 'Accessories', category: 'accessories' },
]

const EXPLORE_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'Our story', id: 'about' },
  { label: 'Technology', id: 'technology' },
  { label: 'Features', id: 'features' },
]

const SUPPORT_LINKS = [
  { label: 'Shipping & delivery', topic: 'shipping' },
  { label: '60-night trial & returns', topic: 'returns' },
  { label: 'Warranty', topic: 'warranty' },
  { label: 'FAQ', topic: 'faq' },
]

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/', icon: InstagramIcon },
  { label: 'X', href: 'https://x.com/', icon: XIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/', icon: YouTubeIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/', icon: TikTokIcon },
]

const linkClass = 'text-sm text-white/55 transition-colors duration-300 hover:text-white'

function Column({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">{title}</h3>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  )
}

export function Footer() {
  const { setCategory, openInfo } = useUI()

  const goTo = (event, id) => {
    event.preventDefault()
    scrollToSection(id)
  }

  const shopCategory = (event, category) => {
    event.preventDefault()
    setCategory(category)
    scrollToSection('shop')
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[30rem]"
        style={{ background: 'radial-gradient(60% 60% at 50% 100%, rgba(43,127,255,0.14), transparent 70%)' }}
      />
      <div className="shell">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <a href="#home" onClick={(event) => goTo(event, 'home')} aria-label="AQUORA — back to top" className="inline-block rounded-full">
              <Logo />
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              Premium smart bottles that measure every sip, monitor temperature and glow when it’s time to drink.
            </p>
            <div className="mt-10">
              <Newsletter />
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:pl-10">
            <Column title="Shop">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <a href="#shop" className={linkClass} onClick={(event) => shopCategory(event, link.category)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </Column>
            <Column title="Explore">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} className={linkClass} onClick={(event) => goTo(event, link.id)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </Column>
            <Column title="Support">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.topic}>
                  <button type="button" className={`${linkClass} text-left`} onClick={() => openInfo(link.topic)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </Column>
          </nav>
        </div>

        <div className="mt-16 flex flex-col-reverse gap-6 border-t border-white/[0.06] py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 text-sm text-white/40 sm:flex-row sm:items-center sm:gap-6">
            <p>© {YEAR} AQUORA Hydration. All rights reserved.</p>
            <div className="flex gap-5">
              <button type="button" className="transition hover:text-white" onClick={() => openInfo('privacy')}>
                Privacy
              </button>
              <button type="button" className="transition hover:text-white" onClick={() => openInfo('terms')}>
                Terms
              </button>
            </div>
          </div>
          <ul className="flex items-center gap-2" aria-label="Social media">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                  className="grid size-10 place-items-center rounded-full border border-white/10 text-white/60 transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon className="size-[1.1rem]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="text-ghost pointer-events-none -mb-[3vw] select-none whitespace-nowrap text-center font-display text-[19vw] font-semibold leading-[0.9] tracking-[-0.06em]"
      >
        AQUORA
      </p>
    </footer>
  )
}
