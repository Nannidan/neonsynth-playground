import { motion } from 'framer-motion'
import { AudioWaveform } from 'lucide-react'
import { THEMES, type ThemeId } from '../hooks/useTheme'

interface NavbarProps {
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
}

export function Navbar({ theme, onThemeChange }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 text-accent">
            <AudioWaveform className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold tracking-wider text-ink">
              NEONSYNTH // K-01
            </span>
            <p className="text-xs text-muted">Browser Modular Engine</p>
          </div>
        </div>

        <nav aria-label="Theme switcher" className="flex flex-wrap items-center gap-1.5">
          {THEMES.map((option) => {
            const isActive = theme === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onThemeChange(option.id)}
                className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive ? 'text-accent-contrast' : 'text-muted hover:text-ink'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeThemePill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                )}
                <span
                  className="relative z-10 h-2 w-2 rounded-full border border-black/20"
                  style={{ backgroundColor: option.swatch }}
                  aria-hidden="true"
                />
                <span className="relative z-10">{option.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
