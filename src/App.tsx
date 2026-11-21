import { MotionConfig } from 'framer-motion'
import { useTheme } from './hooks/useTheme'
import { Navbar } from './components/Navbar'
import { HeroPlayground } from './components/HeroPlayground'
import { FeatureGrid } from './components/FeatureGrid'
import { PricingToggle } from './components/PricingToggle'
import { Footer } from './components/Footer'

export default function App() {
  const { theme, setTheme } = useTheme()

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-accent-contrast">
        <Navbar theme={theme} onThemeChange={setTheme} />
        <main>
          <HeroPlayground />
          <FeatureGrid />
          <PricingToggle />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
