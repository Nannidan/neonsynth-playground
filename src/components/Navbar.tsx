import { motion } from 'framer-motion'
import { ArrowLeft, AudioWaveform } from 'lucide-react'
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
          <a
            href="https://portfolio-hub-44jc.vercel.app/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-2.5 py-1.5 font-mono text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Portfolio</span>
          </a>
          <div className="h-5 w-px bg-edge" aria-hidden="true" />
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 text-accent">
            <AudioWaveform className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold tracking-wider text-ink">
              AUDIOSYNTH // HZ
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
          <a
            href="https://github.com/Nannidan/neonsynth-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-canvas px-3 py-1.5 font-mono text-xs font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
            title="View Source on GitHub"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
