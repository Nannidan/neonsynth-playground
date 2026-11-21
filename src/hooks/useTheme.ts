import { useEffect, useState } from 'react'

export type ThemeId =
  | 'cyber-cyan'
  | 'synthwave-magenta'
  | 'studio-dark'
  | 'high-contrast-light'

export interface ThemeOption {
  id: ThemeId
  label: string
  swatch: string
}

export const THEMES: ThemeOption[] = [
  { id: 'cyber-cyan', label: 'Cyber Cyan', swatch: '#06b6d4' },
  { id: 'synthwave-magenta', label: 'Synthwave', swatch: '#ec4899' },
  { id: 'studio-dark', label: 'Studio Dark', swatch: '#10b981' },
  { id: 'high-contrast-light', label: 'High Contrast', swatch: '#1d4ed8' },
]

const STORAGE_KEY = 'neonsynth-theme'

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'cyber-cyan'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  const isValid = THEMES.some((t) => t.id === saved)
  return isValid ? (saved as ThemeId) : 'cyber-cyan'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return { theme, setTheme }
}
