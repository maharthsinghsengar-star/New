import { MotionConfig } from 'framer-motion'
import { CartDrawer } from './components/CartDrawer'
import { InfoDialog } from './components/InfoDialog'
import { Navbar } from './components/Navbar'
import { ProductModal } from './components/ProductModal'
import { Toast } from './components/Toast'
import { CartProvider } from './context/CartProvider'
import { UIProvider } from './context/UIProvider'
import { About } from './sections/About'
import { CtaBanner } from './sections/CtaBanner'
import { Features } from './sections/Features'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { Marquee } from './sections/Marquee'
import { Shop } from './sections/Shop'
import { Showcase } from './sections/Showcase'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <UIProvider>
        <CartProvider>
          <div className="relative overflow-x-clip">
            <Navbar />
            <main>
              <Hero />
              <Marquee />
              <About />
              <Shop />
              <Showcase />
              <Features />
              <CtaBanner />
            </main>
            <Footer />
          </div>

          <ProductModal />
          <CartDrawer />
          <InfoDialog />
          <Toast />

          <div aria-hidden="true" className="noise pointer-events-none fixed inset-0 z-[100] opacity-[0.035]" />
        </CartProvider>
      </UIProvider>
    </MotionConfig>
  )
}
