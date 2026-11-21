import { Code2 } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-edge bg-surface/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:flex-row sm:px-6">
        <p className="font-mono text-ink">AUDIOSYNTH // HZ</p>
        <p>Built with React, TypeScript, Tailwind CSS v4, Framer Motion &amp; Web Audio API.</p>
        <a
          href="https://github.com/Nannidan/neonsynth-playground"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-canvas px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          <Code2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          View Source
        </a>
      </div>
    </footer>
  )
}
