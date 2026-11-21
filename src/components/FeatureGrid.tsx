import { motion } from 'framer-motion'
import { Cpu, Layers, Radio, Sliders, Usb, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: Cpu,
    title: 'Zero-Latency DSP Core',
    description:
      'Runs natively on Web Audio API with 64-bit internal processing—no plugins, installs, or audio dropouts.',
    span: 'md:col-span-4',
    tag: 'SUB-4MS',
  },
  {
    icon: Sliders,
    title: 'Hardware-First Ergonomics',
    description:
      'Every slider, switch, and shortcut is keyboard-accessible and tuned for rapid live performance.',
    span: 'md:col-span-2',
    tag: 'A11Y',
  },
  {
    icon: Usb,
    title: 'WebMIDI Ready',
    description:
      'Plug in any USB MIDI controller and map knobs, pitch wheels, and pads directly in Chrome.',
    span: 'md:col-span-2',
    tag: 'MIDI 2.0',
  },
  {
    icon: Layers,
    title: '4 Stage-Tuned UI Themes',
    description:
      'Switch instantly between AMOLED studio palettes and high-contrast daylight mode with persistent localStorage.',
    span: 'md:col-span-4',
    tag: 'TAILWIND V4',
  },
  {
    icon: Radio,
    title: 'Analog Filter Modeling',
    description:
      'Self-oscillating 24dB/oct low-pass filter paired with a custom soft-clipping overdrive stage.',
    span: 'md:col-span-3',
    tag: '24DB/OCT',
  },
  {
    icon: Zap,
    title: 'Instant Patch Sharing',
    description:
      'Export lightweight JSON presets or share live URLs so collaborators hear your exact sound.',
    span: 'md:col-span-3',
    tag: 'CLOUD SYNC',
  },
]

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
          Architecture
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Built like a studio rack. Shipped like a modern web app.
        </h2>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-6">
        {FEATURES.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={`group rounded-2xl border border-edge bg-surface p-6 transition-colors hover:border-accent/50 ${item.span}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-md border border-edge bg-canvas px-2 py-0.5 font-mono text-[11px] text-muted">
                  {item.tag}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
