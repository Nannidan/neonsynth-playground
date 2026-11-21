import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, CreditCard, Loader2, Lock, Sparkles, X } from 'lucide-react'

interface Plan {
  name: string
  monthly: number
  annual: number
  description: string
  features: string[]
  highlighted: boolean
}

const PLANS: Plan[] = [
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

function generateDemoKey(planName: string) {
  const prefix = planName === 'Label Team' ? 'LBL' : planName === 'Studio Pro' ? 'PRO' : 'FREE'
  const block = () => Math.random().toString(36).substring(2, 6).toUpperCase()
  return `K01-${prefix}-${block()}-${block()}`
}

export function PricingToggle() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [email, setEmail] = useState('')
  const [cardName, setCardName] = useState('')
  const [status, setStatus] = useState<'form' | 'processing' | 'success'>('form')
  const [licenseKey, setLicenseKey] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)

  function openCheckout(plan: Plan) {
    setActivePlan(plan)
    setStatus('form')
    setLicenseKey('')
    setCopiedKey(false)
  }

  function closeCheckout() {
    setActivePlan(null)
    setStatus('form')
  }

  function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activePlan) return
    setStatus('processing')
    window.setTimeout(() => {
      setLicenseKey(generateDemoKey(activePlan.name))
      setStatus('success')
    }, 900)
  }

  async function copyLicense() {
    if (!licenseKey) return
    try {
      await navigator.clipboard.writeText(licenseKey)
    } catch {
      // ignore if clipboard blocked
    }
    setCopiedKey(true)
    window.setTimeout(() => setCopiedKey(false), 1800)
  }

  const activePrice = activePlan
    ? billing === 'annual'
      ? activePlan.annual
      : activePlan.monthly
    : 0

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
                onClick={() => openCheckout(plan)}
                className={`mt-8 w-full rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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

      {/* Interactive Demo Checkout Modal */}
      <AnimatePresence>
        {activePlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCheckout}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkout-title"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-edge bg-surface p-6 shadow-2xl"
              style={{ boxShadow: '0 24px 70px -15px var(--glow)' }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-edge pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    INTERACTIVE DEMO CHECKOUT
                  </span>
                  <h3 id="checkout-title" className="mt-2 text-xl font-bold text-ink">
                    {activePlan.name} Plan
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={closeCheckout}
                  className="rounded-lg border border-edge bg-canvas p-1.5 text-muted hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {status === 'success' ? (
                <div className="mt-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent">
                    <Check className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h4 className="mt-4 text-lg font-bold text-ink">
                    {activePlan.name} Unlocked
                  </h4>
                  <p className="mt-1 text-sm text-muted">
                    Simulated checkout complete. No real payment was processed.
                  </p>

                  <div className="mt-5 rounded-xl border border-edge bg-canvas p-3.5 text-left">
                    <span className="font-mono text-[11px] text-muted">DEMO LICENSE KEY</span>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <code className="font-mono text-sm font-bold text-accent">{licenseKey}</code>
                      <button
                        type="button"
                        onClick={() => void copyLicense()}
                        className="inline-flex items-center gap-1 rounded-lg border border-edge bg-surface px-2.5 py-1 font-mono text-xs text-ink hover:border-accent/60"
                      >
                        {copiedKey ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeCheckout}
                    className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast"
                  >
                    Back to Synth Console
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="mt-5 space-y-4">
                  {/* Order Summary */}
                  <div className="flex items-center justify-between rounded-xl border border-edge bg-canvas px-4 py-3 font-mono text-xs">
                    <div>
                      <p className="font-semibold text-ink">{activePlan.name}</p>
                      <p className="text-muted capitalize">{billing} billing</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-accent">
                        ${activePrice === 0 ? '0' : billing === 'annual' ? activePrice * 12 : activePrice}
                      </p>
                      <p className="text-[11px] text-muted">
                        {activePrice === 0 ? 'Free forever' : billing === 'annual' ? 'billed yearly' : 'per month'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-email" className="block font-mono text-xs text-muted">
                      EMAIL ADDRESS
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="producer@studio.dev"
                      className="mt-1.5 w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
                    />
                  </div>

                  {activePrice > 0 && (
                    <>
                      <div>
                        <label htmlFor="checkout-name" className="block font-mono text-xs text-muted">
                          NAME ON CARD
                        </label>
                        <input
                          id="checkout-name"
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Alex Rivera"
                          className="mt-1.5 w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div className="rounded-xl border border-edge bg-canvas/70 p-3">
                        <div className="flex items-center justify-between font-mono text-[11px] text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                            SANDBOX TEST CARD
                          </span>
                          <span className="text-accent">NO CHARGE</span>
                        </div>
                        <p className="mt-1.5 font-mono text-xs text-ink">
                          4242 •••• •••• 4242 &nbsp;|&nbsp; 12/29 &nbsp;|&nbsp; 424
                        </p>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'processing'}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast disabled:opacity-70"
                  >
                    {status === 'processing' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Activating License...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        {activePrice === 0 ? 'Activate Free License' : 'Complete Demo Checkout'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
