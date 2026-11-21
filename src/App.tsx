import { useTheme } from './hooks/useTheme'
import { Navbar } from './components/Navbar'
import { HeroPlayground } from './components/HeroPlayground'

export default function App() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-accent-contrast">
      <Navbar theme={theme} onThemeChange={setTheme} />
      <main>
        <HeroPlayground />
      </main>
    </div>
  )
}
