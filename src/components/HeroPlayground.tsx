import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  FileAudio,
  Link2,
  PlayCircle,
  Power,
  Shuffle,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import {
  extractYouTubeId,
  useSynthAudio,
  type AudioSourceMode,
  type SynthWaveform,
} from '../hooks/useSynthAudio'

const WAVEFORMS: { id: SynthWaveform; label: string }[] = [
  { id: 'sine', label: 'SINE' },
  { id: 'saw', label: 'SAW' },
  { id: 'square', label: 'SQUARE' },
]

const SOURCES: { id: AudioSourceMode; label: string }[] = [
  { id: 'synth', label: 'SYNTH' },
  { id: 'youtube', label: 'YOUTUBE' },
  { id: 'mp3', label: 'MP3 FILE' },
]

interface PatchPreset {
  name: string
  waveform: SynthWaveform
  cutoff: number
  resonance: number
  drive: number
  arpeggiator: boolean
  overdrive: boolean
}

const PRESETS: PatchPreset[] = [
  { name: 'Blade Bass', waveform: 'saw', cutoff: 540, resonance: 72, drive: 68, arpeggiator: false, overdrive: true },
  { name: 'Acid Lead', waveform: 'square', cutoff: 1760, resonance: 86, drive: 55, arpeggiator: true, overdrive: true },
  { name: 'Lo-Fi Warmth', waveform: 'sine', cutoff: 820, resonance: 24, drive: 30, arpeggiator: true, overdrive: false },
  { name: 'Cyber Arp', waveform: 'saw', cutoff: 1480, resonance: 52, drive: 42, arpeggiator: true, overdrive: false },
]

function getInitialPatch() {
  if (typeof window === 'undefined') {
    return { waveform: 'sine' as SynthWaveform, cutoff: 1240, resonance: 48, drive: 35, arpeggiator: true, overdrive: false }
  }
  const q = new URLSearchParams(window.location.search)
  const wf = q.get('wf')
  const waveform: SynthWaveform = wf === 'sine' || wf === 'saw' || wf === 'square' ? wf : 'sine'
  const clamp = (val: string | null, min: number, max: number, fallback: number) => {
    const n = Number(val)
    return val !== null && !Number.isNaN(n) ? Math.min(max, Math.max(min, n)) : fallback
  }
  return {
    waveform,
    cutoff: clamp(q.get('cutoff'), 120, 2400, 1240),
    resonance: clamp(q.get('res'), 0, 100, 48),
    drive: clamp(q.get('drive'), 0, 100, 35),
    arpeggiator: q.has('arp') ? q.get('arp') === '1' : true,
    overdrive: q.has('od') ? q.get('od') === '1' : false,
  }
}

export function HeroPlayground() {
  const initial = useMemo(() => getInitialPatch(), [])

  const [powered, setPowered] = useState(true)
  const [sourceMode, setSourceMode] = useState<AudioSourceMode>('synth')
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=jfKfPfyJRdk')
  const [ytPlaying, setYtPlaying] = useState(false)
  const [mp3File, setMp3File] = useState<File | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const [waveform, setWaveform] = useState<SynthWaveform>(initial.waveform)
  const [cutoff, setCutoff] = useState(initial.cutoff)
  const [resonance, setResonance] = useState(initial.resonance)
  const [drive, setDrive] = useState(initial.drive)
  const [arpeggiator, setArpeggiator] = useState(initial.arpeggiator)
  const [overdrive, setOverdrive] = useState(initial.overdrive)

  const barRefs = useRef<(HTMLDivElement | null)[]>([])
  const youtubeId = useMemo(() => extractYouTubeId(youtubeUrl), [youtubeUrl])

  const { isPlaying: webAudioPlaying, audioError, toggleAudio, analyserRef } = useSynthAudio({
    sourceMode,
    mp3File,
    powered,
    waveform,
    cutoff,
    resonance,
    drive,
    arpeggiator,
    overdrive,
  })

  const isAnyAudioPlaying = sourceMode === 'youtube' ? ytPlaying && powered : webAudioPlaying

  const handlePlayToggle = useCallback(() => {
    if (!powered) setPowered(true)
    if (sourceMode === 'youtube') {
      if (!youtubeId) return
      setYtPlaying((prev) => !prev)
    } else {
      setYtPlaying(false)
      toggleAudio()
    }
  }, [powered, sourceMode, youtubeId, toggleAudio])

  const randomizePatch = useCallback(() => {
    const pick = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)].id
    setPowered(true)
    setWaveform(pick)
    setCutoff(Math.floor(Math.random() * 2100) + 200)
    setResonance(Math.floor(Math.random() * 90) + 10)
    setDrive(Math.floor(Math.random() * 95) + 5)
    setArpeggiator(Math.random() > 0.4)
    setOverdrive(Math.random() > 0.5)
  }, [])

  function applyPreset(preset: PatchPreset) {
    setPowered(true)
    setWaveform(preset.waveform)
    setCutoff(preset.cutoff)
    setResonance(preset.resonance)
    setDrive(preset.drive)
    setArpeggiator(preset.arpeggiator)
    setOverdrive(preset.overdrive)
  }

  async function copyPatchLink() {
    const params = new URLSearchParams({
      wf: waveform,
      cutoff: String(cutoff),
      res: String(resonance),
      drive: String(drive),
      arp: arpeggiator ? '1' : '0',
      od: overdrive ? '1' : '0',
    })
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', `?${params.toString()}`)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Fallback if clipboard API is restricted
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Keyboard shortcuts: Space = Play/Mute, R = Randomize
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayToggle()
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        randomizePatch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePlayToggle, randomizePatch])

  // Real-time 60fps AnalyserNode frequency visualizer loop
  useEffect(() => {
    if (!webAudioPlaying || !analyserRef.current) return

    const analyser = analyserRef.current
    const data = new Uint8Array(analyser.frequencyBinCount)
    let rafId = 0

    const renderFrame = () => {
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < 20; i++) {
        const el = barRefs.current[i]
        if (!el) continue
        const binIndex = Math.min(data.length - 1, Math.floor((i / 20) * data.length))
        const pct = Math.max(12, Math.round((data[binIndex] / 255) * 100))
        el.style.height = `${pct}%`
      }
      rafId = window.requestAnimationFrame(renderFrame)
    }

    rafId = window.requestAnimationFrame(renderFrame)
    return () => window.cancelAnimationFrame(rafId)
  }, [webAudioPlaying, analyserRef])

  function handleSourceChange(next: AudioSourceMode) {
    setSourceMode(next)
    if (next !== 'youtube') {
      setYtPlaying(false)
    }
  }

  const staticBars = useMemo(() => {
    const count = 20
    const freqFactor = cutoff / 800
    const resBoost = 1 + resonance / 140
    const driveFloor = drive / 220

    return Array.from({ length: count }, (_, i) => {
      if (!powered) return 8
      const t = (i / (count - 1)) * Math.PI * 2 * freqFactor
      let raw = 0
      if (waveform === 'sine') raw = (Math.sin(t) + 1) / 2
      else if (waveform === 'saw') raw = ((i * freqFactor) % 5) / 5
      else raw = Math.sin(t) >= 0 ? 0.92 : 0.2

      const boosted = Math.min(1, raw * resBoost + driveFloor + (overdrive ? 0.14 : 0))
      return Math.max(12, Math.round(boosted * 100))
    })
  }, [powered, waveform, cutoff, resonance, drive, overdrive])

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-12">
        {/* Left: Product Copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-5"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>v2.4 WEB AUDIO ENGINE</span>
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Sculpt analog tone directly in your browser.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted">
            NEONSYNTH K-01 pairs tactile hardware controls with zero-latency digital
            synthesis. Play the built-in synth, stream a YouTube track, or drop in an MP3
            file to warp it live through the DSP filter chain.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePlayToggle}
              disabled={sourceMode === 'youtube' && !youtubeId}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ boxShadow: '0 8px 30px var(--glow)' }}
            >
              {isAnyAudioPlaying ? (
                <>
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                  Mute Audio
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  Play {sourceMode === 'youtube' ? 'YouTube' : sourceMode === 'mp3' ? 'MP3' : 'Synth'}
                </>
              )}
              <kbd className="hidden rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                SPACE
              </kbd>
            </button>

            <button
              type="button"
              onClick={randomizePatch}
              className="inline-flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Shuffle className="h-4 w-4 text-accent" aria-hidden="true" />
              Randomize
              <kbd className="hidden rounded border border-edge bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
                R
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => void copyPatchLink()}
              className="inline-flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                  Link Copied
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 text-accent" aria-hidden="true" />
                  Share Patch
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right: Interactive Synth Console */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="lg:col-span-7"
        >
          <div
            className="rounded-2xl border border-edge bg-surface p-5 sm:p-6"
            style={{ boxShadow: '0 20px 60px -20px var(--glow)' }}
          >
            {/* Top Status Strip + Audio Source Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isAnyAudioPlaying
                      ? 'bg-accent animate-ping'
                      : powered
                        ? 'bg-accent'
                        : 'bg-muted/40'
                  }`}
                />
                <span className="font-mono text-xs font-semibold tracking-wider text-ink">
                  OSC-1 // {webAudioPlaying ? 'LIVE FFT SPECTRUM' : isAnyAudioPlaying ? 'AUDIO LIVE' : 'STANDBY'}
                </span>
              </div>

              <div
                role="group"
                aria-label="Audio input source"
                className="flex gap-1 rounded-lg border border-edge bg-canvas p-1"
              >
                {SOURCES.map((src) => {
                  const active = sourceMode === src.id
                  return (
                    <button
                      key={src.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSourceChange(src.id)}
                      className={`relative rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                        active ? 'text-accent-contrast' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sourcePill"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          className="absolute inset-0 rounded-md bg-accent"
                        />
                      )}
                      <span className="relative z-10">{src.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Factory Presets Strip */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[11px] text-muted">PRESETS:</span>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-md border border-edge bg-canvas/80 px-2.5 py-1 font-mono text-[11px] text-ink transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* YouTube Input Panel */}
            {sourceMode === 'youtube' && (
              <div className="mt-4 rounded-xl border border-edge bg-canvas/80 p-3.5">
                <label
                  htmlFor="youtube-url"
                  className="flex items-center gap-2 font-mono text-xs text-muted"
                >
                  <PlayCircle className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span>YOUTUBE TRACK URL</span>
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="youtube-url"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value)
                      setYtPlaying(false)
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-edge bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>
                {!youtubeId && youtubeUrl.trim().length > 0 && (
                  <p className="mt-1.5 font-mono text-[11px] text-rose-400">
                    Paste a valid YouTube link (watch?v=, youtu.be/, or shorts/).
                  </p>
                )}
                {ytPlaying && powered && youtubeId && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-edge">
                    <iframe
                      title="YouTube audio deck"
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                      allow="autoplay; encrypted-media"
                      className="h-24 w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Local MP3 Upload Panel */}
            {sourceMode === 'mp3' && (
              <div className="mt-4 rounded-xl border border-edge bg-canvas/80 p-3.5">
                <label
                  htmlFor="mp3-upload"
                  className="flex items-center justify-between gap-2 font-mono text-xs text-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <FileAudio className="h-4 w-4 text-accent" aria-hidden="true" />
                    <span>LOCAL MP3 / WAV (LIVE DSP FX ENABLED)</span>
                  </span>
                  {mp3File && (
                    <span className="max-w-[160px] truncate text-accent">{mp3File.name}</span>
                  )}
                </label>
                <input
                  id="mp3-upload"
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
                  onChange={(e) => setMp3File(e.target.files?.[0] ?? null)}
                  className="mt-2 block w-full cursor-pointer font-mono text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:text-accent hover:file:bg-accent/25"
                />
                {audioError && (
                  <p className="mt-1.5 font-mono text-[11px] text-rose-400">{audioError}</p>
                )}
              </div>
            )}

            {/* Live Visualizer Display */}
            <div
              aria-label="Live frequency spectrum visualizer"
              className="mt-4 flex h-40 items-end justify-between gap-1.5 rounded-xl border border-edge bg-canvas p-4"
            >
              {staticBars.map((height, idx) => (
                <div
                  key={idx}
                  ref={(el) => {
                    barRefs.current[idx] = el
                  }}
                  className="w-full rounded-t-md bg-accent transition-[height] duration-75"
                  style={{
                    height: `${height}%`,
                    opacity: powered ? 0.92 : 0.25,
                    boxShadow: powered ? '0 0 12px var(--glow)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Waveform Selector */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-xs text-muted">
                <span>WAVEFORM</span>
                {overdrive && powered && (
                  <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-accent">
                    <Zap className="h-3 w-3" aria-hidden="true" />
                    OD
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 rounded-lg border border-edge bg-canvas p-1">
                {WAVEFORMS.map((wf) => {
                  const selected = waveform === wf.id
                  return (
                    <button
                      key={wf.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setWaveform(wf.id)}
                      className={`relative rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                        selected ? 'text-accent-contrast' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="waveformPill"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          className="absolute inset-0 rounded-md bg-accent"
                        />
                      )}
                      <span className="relative z-10">{wf.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Interactive Sliders */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-edge bg-canvas/70 p-3">
                <div className="flex justify-between font-mono text-xs">
                  <label htmlFor="cutoff-slider" className="text-muted">
                    CUTOFF
                  </label>
                  <span className="text-ink">{cutoff} Hz</span>
                </div>
                <input
                  id="cutoff-slider"
                  type="range"
                  min={120}
                  max={2400}
                  step={20}
                  value={cutoff}
                  onChange={(e) => setCutoff(Number(e.target.value))}
                  className="mt-2.5 w-full cursor-pointer accent-[var(--accent)]"
                />
              </div>

              <div className="rounded-xl border border-edge bg-canvas/70 p-3">
                <div className="flex justify-between font-mono text-xs">
                  <label htmlFor="res-slider" className="text-muted">
                    RESONANCE
                  </label>
                  <span className="text-ink">{resonance}%</span>
                </div>
                <input
                  id="res-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={resonance}
                  onChange={(e) => setResonance(Number(e.target.value))}
                  className="mt-2.5 w-full cursor-pointer accent-[var(--accent)]"
                />
              </div>

              <div className="rounded-xl border border-edge bg-canvas/70 p-3">
                <div className="flex justify-between font-mono text-xs">
                  <label htmlFor="drive-slider" className="text-muted">
                    DRIVE
                  </label>
                  <span className="text-ink">{drive}%</span>
                </div>
                <input
                  id="drive-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={drive}
                  onChange={(e) => setDrive(Number(e.target.value))}
                  className="mt-2.5 w-full cursor-pointer accent-[var(--accent)]"
                />
              </div>
            </div>

            {/* Hardware Switches */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={arpeggiator}
                onClick={() => setArpeggiator((a) => !a)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  arpeggiator
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-edge bg-canvas/60 text-muted hover:text-ink'
                }`}
              >
                <span>ARP</span>
                <span>{arpeggiator ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={overdrive}
                onClick={() => setOverdrive((o) => !o)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  overdrive
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-edge bg-canvas/60 text-muted hover:text-ink'
                }`}
              >
                <span>OVERDRIVE</span>
                <span>{overdrive ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={powered}
                onClick={() => {
                  setPowered((p) => {
                    if (p) setYtPlaying(false)
                    return !p
                  })
                }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  powered
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-edge bg-canvas/60 text-muted hover:text-ink'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                  PWR
                </span>
                <span>{powered ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
