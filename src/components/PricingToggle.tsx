import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Hobbyist',
    monthly: 0,
    annual: 0,
    description: 'Everything you need to jam and design patches in the browser.',
    features: ['Single-oscillator K-01 engine', '4 built-in UI themes', '10 local patch slots'],
    highlighted: false,
  },
  {
    name: 'Studio Pro',
    monthly: 14,
    annual: 11,
    description: 'For producers who want multi-voice polyphony and WAV export.',
    features: [
      '8-voice polyphonic engine',
      'Direct 24-bit WAV & MIDI export',
      'Unlimited cloud patch sync',
      'WebMIDI hardware mapping',
    ],
    highlighted: true,
  },
  {
    name: 'Label Team',
    monthly: 39,
    annual: 31,
    description: 'Shared sound libraries and live browser sessions for studios.',
    features: [
      'Up to 10 studio seats',
      'Shared preset vaults',
      'Custom VST3 bridge access',
      'Priority engineering support',
    ],
    highlighted: false,
  },
]

export function PricingToggle() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Start free. Scale when you ship.
          </h2>
        </div>

        {/* Animated Monthly / Annual Switch */}
        <div
          role="group"
          aria-label="Billing interval"
          className="inline-flex rounded-xl border border-edge bg-surface p-1"
        >
          {(['monthly', 'annual'] as const).map((mode) => {
            const active = billing === mode
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => setBilling(mode)}
                className={`relative rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  active ? 'text-accent-contrast' : 'text-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="billingPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-accent"
                  />
                )}
                <span className="relative z-10">
                  {mode === 'annual' ? 'Annual (Save 20%)' : 'Monthly'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = billing === 'annual' ? plan.annual : plan.monthly
          return (
            <div
              key={plan.name}
              className={`flex flex-col justify-between rounded-2xl border p-6 ${
                plan.highlighted
                  ? 'border-accent bg-surface'
                  : 'border-edge bg-surface/60'
              }`}
              style={
                plan.highlighted ? { boxShadow: '0 16px 50px -20px var(--glow)' } : undefined
              }
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
                      MOST POPULAR
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <motion.span
                    key={price}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-4xl font-extrabold text-ink"
                  >
                    ${price}
                  </motion.span>
                  <span className="text-sm text-muted">/mo</span>
                </div>

                <p className="mt-3 text-sm text-muted">{plan.description}</p>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-ink">
                      <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={`mt-8 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  plan.highlighted
                    ? 'bg-accent text-accent-contrast'
                    : 'border border-edge bg-canvas text-ink hover:border-accent/50'
                }`}
              >
                {price === 0 ? 'Launch Free' : `Choose ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
