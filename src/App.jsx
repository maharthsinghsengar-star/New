import { MotionConfig } from 'framer-motion'
import { AmbientLight } from './components/AmbientLight'
import { CartDrawer } from './components/CartDrawer'
import { InfoDialog } from './components/InfoDialog'
import { Navbar } from './components/Navbar'
import { Preloader } from './components/Preloader'
import { ProductModal } from './components/ProductModal'
import { Toast } from './components/Toast'
import { CartProvider } from './context/CartProvider'
import { useUI } from './context/contexts'
import { UIProvider } from './context/UIProvider'
import { About } from './sections/About'
import { Cinematic } from './sections/Cinematic'
import { CtaBanner } from './sections/CtaBanner'
import { Features } from './sections/Features'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { Marquee } from './sections/Marquee'
import { Shop } from './sections/Shop'
import { Showcase } from './sections/Showcase'

function Site() {
  const { showPreloader } = useUI()
  return (
    <>
      <AmbientLight />
      <div className="relative overflow-x-clip">
        <Navbar />
        <main>
          <Hero />
          <Cinematic />
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
      {showPreloader && <Preloader />}

      <div aria-hidden="true" className="noise pointer-events-none fixed inset-0 z-[100] opacity-[0.035]" />
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <UIProvider>
        <CartProvider>
          <Site />
        </CartProvider>
      </UIProvider>
    </MotionConfig>
  )
}
