import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  FileAudio,
  Link2,
  PlayCircle,
  Power,
  RotateCcw,
  Shuffle,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import {
  EQ_LABELS,
  extractYouTubeId,
  useSynthAudio,
  type AudioSourceMode,
  type EqBands,
  type FilterMode,
  type SynthWaveform,
} from '../hooks/useSynthAudio'

const WAVEFORMS: { id: SynthWaveform; label: string }[] = [
  { id: 'sine', label: 'SINE' },
  { id: 'saw', label: 'SAW' },
  { id: 'square', label: 'SQUARE' },
  { id: 'triangle', label: 'TRI' },
]

const FILTER_MODES: { id: FilterMode; label: string }[] = [
  { id: 'lowpass', label: 'LPF' },
  { id: 'bandpass', label: 'BPF' },
  { id: 'highpass', label: 'HPF' },
]

const SOURCES: { id: AudioSourceMode; label: string }[] = [
  { id: 'synth', label: 'SYNTH' },
  { id: 'youtube', label: 'YOUTUBE' },
  { id: 'mp3', label: 'MP3 FILE' },
]

type RackBay = 'synth' | 'mastering' | 'eq'

interface PatchPreset {
  name: string
  waveform: SynthWaveform
  filterMode: FilterMode
  cutoff: number
  resonance: number
  drive: number
  bassBoost: number
  tubeDrive: number
  stereoWidth: number
  reverbMix: number
  compression: number
  eqBands: EqBands
  arpeggiator: boolean
  overdrive: boolean
}

const PRESETS: PatchPreset[] = [
  {
    name: 'Blade Bass',
    waveform: 'saw',
    filterMode: 'lowpass',
    cutoff: 540,
    resonance: 72,
    drive: 68,
    bassBoost: 9,
    tubeDrive: 55,
    stereoWidth: 40,
    reverbMix: 18,
    compression: 60,
    eqBands: [6, 3, -2, 2, 4],
    arpeggiator: false,
    overdrive: true,
  },
  {
    name: 'Studio Master',
    waveform: 'saw',
    filterMode: 'lowpass',
    cutoff: 2100,
    resonance: 34,
    drive: 42,
    bassBoost: 8,
    tubeDrive: 64,
    stereoWidth: 78,
    reverbMix: 32,
    compression: 52,
    eqBands: [5, 2, 0, 4, 6],
    arpeggiator: true,
    overdrive: false,
  },
  {
    name: 'Vacuum Tube Warmth',
    waveform: 'triangle',
    filterMode: 'lowpass',
    cutoff: 1180,
    resonance: 28,
    drive: 36,
    bassBoost: 6,
    tubeDrive: 88,
    stereoWidth: 52,
    reverbMix: 28,
    compression: 45,
    eqBands: [4, 5, 2, -1, -2],
    arpeggiator: true,
    overdrive: false,
  },
  {
    name: 'Wide Hall Cathedral',
    waveform: 'sine',
    filterMode: 'lowpass',
    cutoff: 1640,
    resonance: 40,
    drive: 25,
    bassBoost: 4,
    tubeDrive: 30,
    stereoWidth: 95,
    reverbMix: 82,
    compression: 35,
    eqBands: [2, 0, -1, 3, 7],
    arpeggiator: true,
    overdrive: false,
  },
  {
    name: 'Acid Lead 303',
    waveform: 'square',
    filterMode: 'bandpass',
    cutoff: 1760,
    resonance: 88,
    drive: 74,
    bassBoost: 5,
    tubeDrive: 48,
    stereoWidth: 60,
    reverbMix: 24,
    compression: 70,
    eqBands: [3, -2, 5, 6, 2],
    arpeggiator: true,
    overdrive: true,
  },
]

const EQ_CURVES: { label: string; bands: EqBands }[] = [
  { label: 'Flat', bands: [0, 0, 0, 0, 0] },
  { label: 'Sub Slam', bands: [9, 5, -2, 1, 3] },
  { label: 'V-Clarity', bands: [6, 2, -4, 4, 7] },
  { label: 'Tube Mid', bands: [3, 5, 4, 1, -2] },
  { label: 'Vocal Air', bands: [-2, 1, 4, 6, 8] },
]

interface RotaryDialProps {
  id: string
  label: string
  sublabel?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (next: number) => void
}

function RotaryDial({
  id,
  label,
  sublabel,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: RotaryDialProps) {
  const norm = Math.min(1, Math.max(0, (value - min) / (max - min || 1)))
  const angle = -135 + norm * 270
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75
  const dashOffset = arcLength * (1 - norm)

  return (
    <div className="rounded-xl border border-edge bg-canvas/70 p-3 transition-colors hover:border-accent/40">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <label
            htmlFor={id}
            className="block truncate font-mono text-[11px] font-semibold tracking-wider text-muted"
          >
            {label}
          </label>
          {sublabel && (
            <span className="block truncate font-mono text-[10px] text-muted/70">{sublabel}</span>
          )}
        </div>

        {/* Tactile SVG Rotary Dial Indicator */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <svg className="h-11 w-11 -rotate-[225deg]" viewBox="0 0 44 44" aria-hidden="true">
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
              className="text-edge"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.2"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div
            className="pointer-events-none absolute inset-1.5 rounded-full border border-edge bg-surface shadow-inner"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <span className="mx-auto mt-1 block h-2 w-0.5 rounded-full bg-accent" />
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between font-mono text-xs">
        <span className="text-[10px] text-muted">
          {min}
          {unit}
        </span>
        <span className="font-bold text-ink">
          {value > 0 && min < 0 ? `+${value}` : value}
          {unit}
        </span>
        <span className="text-[10px] text-muted">
          {max}
          {unit}
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full cursor-pointer accent-[var(--accent)]"
      />
    </div>
  )
}

function getInitialPatch() {
  const defaults = {
    waveform: 'saw' as SynthWaveform,
    filterMode: 'lowpass' as FilterMode,
    cutoff: 1240,
    resonance: 48,
    drive: 35,
    bassBoost: 6,
    tubeDrive: 45,
    stereoWidth: 50,
    reverbMix: 24,
    compression: 40,
    masterGain: 85,
    eqBands: [3, 1, 0, 2, 4] as EqBands,
    arpeggiator: true,
    overdrive: false,
  }
  if (typeof window === 'undefined') return defaults

  const q = new URLSearchParams(window.location.search)
  const wf = q.get('wf')
  const waveform: SynthWaveform =
    wf === 'sine' || wf === 'saw' || wf === 'square' || wf === 'triangle' ? wf : defaults.waveform
  const fm = q.get('fm')
  const filterMode: FilterMode =
    fm === 'lowpass' || fm === 'bandpass' || fm === 'highpass' ? fm : defaults.filterMode

  const clamp = (val: string | null, min: number, max: number, fallback: number) => {
    const n = Number(val)
    return val !== null && !Number.isNaN(n) ? Math.min(max, Math.max(min, n)) : fallback
  }

  let eqBands: EqBands = defaults.eqBands
  const eqRaw = q.get('eq')
  if (eqRaw) {
    const parts = eqRaw.split(',').map((n) => Number(n))
    if (parts.length === 5 && parts.every((n) => !Number.isNaN(n))) {
      eqBands = parts.map((n) => Math.min(12, Math.max(-12, n))) as EqBands
    }
  }

  return {
    waveform,
    filterMode,
    cutoff: clamp(q.get('cutoff'), 120, 4800, defaults.cutoff),
    resonance: clamp(q.get('res'), 0, 100, defaults.resonance),
    drive: clamp(q.get('drive'), 0, 100, defaults.drive),
    bassBoost: clamp(q.get('bass'), 0, 15, defaults.bassBoost),
    tubeDrive: clamp(q.get('tube'), 0, 100, defaults.tubeDrive),
    stereoWidth: clamp(q.get('wide'), 0, 100, defaults.stereoWidth),
    reverbMix: clamp(q.get('rev'), 0, 100, defaults.reverbMix),
    compression: clamp(q.get('comp'), 0, 100, defaults.compression),
    masterGain: clamp(q.get('gain'), 10, 100, defaults.masterGain),
    eqBands,
    arpeggiator: q.has('arp') ? q.get('arp') === '1' : defaults.arpeggiator,
    overdrive: q.has('od') ? q.get('od') === '1' : defaults.overdrive,
  }
}

export function HeroPlayground() {
  const initial = useMemo(() => getInitialPatch(), [])

  const [powered, setPowered] = useState(true)
  const [rackBay, setRackBay] = useState<RackBay>('synth')
  const [sourceMode, setSourceMode] = useState<AudioSourceMode>('synth')
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=jfKfPfyJRdk')
  const [ytPlaying, setYtPlaying] = useState(false)
  const [mp3File, setMp3File] = useState<File | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const [waveform, setWaveform] = useState<SynthWaveform>(initial.waveform)
  const [filterMode, setFilterMode] = useState<FilterMode>(initial.filterMode)
  const [cutoff, setCutoff] = useState(initial.cutoff)
  const [resonance, setResonance] = useState(initial.resonance)
  const [drive, setDrive] = useState(initial.drive)
  const [bassBoost, setBassBoost] = useState(initial.bassBoost)
  const [tubeDrive, setTubeDrive] = useState(initial.tubeDrive)
  const [stereoWidth, setStereoWidth] = useState(initial.stereoWidth)
  const [reverbMix, setReverbMix] = useState(initial.reverbMix)
  const [compression, setCompression] = useState(initial.compression)
  const [masterGain, setMasterGain] = useState(initial.masterGain)
  const [eqBands, setEqBands] = useState<EqBands>(initial.eqBands)
  const [arpeggiator, setArpeggiator] = useState(initial.arpeggiator)
  const [overdrive, setOverdrive] = useState(initial.overdrive)

  const barRefs = useRef<(HTMLDivElement | null)[]>([])
  const youtubeId = useMemo(() => extractYouTubeId(youtubeUrl), [youtubeUrl])

  const { isPlaying: webAudioPlaying, audioError, toggleAudio, analyserRef } = useSynthAudio({
    sourceMode,
    mp3File,
    powered,
    waveform,
    filterMode,
    cutoff,
    resonance,
    drive,
    bassBoost,
    tubeDrive,
    stereoWidth,
    reverbMix,
    compression,
    masterGain,
    eqBands,
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
    const pickWf = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)].id
    const pickFm = FILTER_MODES[Math.floor(Math.random() * FILTER_MODES.length)].id
    setPowered(true)
    setWaveform(pickWf)
    setFilterMode(pickFm)
    setCutoff(Math.floor(Math.random() * 3800) + 240)
    setResonance(Math.floor(Math.random() * 85) + 10)
    setDrive(Math.floor(Math.random() * 90) + 10)
    setBassBoost(Math.floor(Math.random() * 14))
    setTubeDrive(Math.floor(Math.random() * 95))
    setStereoWidth(Math.floor(Math.random() * 95))
    setReverbMix(Math.floor(Math.random() * 75))
    setCompression(Math.floor(Math.random() * 80) + 10)
    setEqBands([
      Math.floor(Math.random() * 16) - 6,
      Math.floor(Math.random() * 16) - 6,
      Math.floor(Math.random() * 16) - 6,
      Math.floor(Math.random() * 16) - 6,
      Math.floor(Math.random() * 16) - 6,
    ])
    setArpeggiator(Math.random() > 0.35)
    setOverdrive(Math.random() > 0.45)
  }, [])

  function applyPreset(preset: PatchPreset) {
    setPowered(true)
    setWaveform(preset.waveform)
    setFilterMode(preset.filterMode)
    setCutoff(preset.cutoff)
    setResonance(preset.resonance)
    setDrive(preset.drive)
    setBassBoost(preset.bassBoost)
    setTubeDrive(preset.tubeDrive)
    setStereoWidth(preset.stereoWidth)
    setReverbMix(preset.reverbMix)
    setCompression(preset.compression)
    setEqBands(preset.eqBands)
    setArpeggiator(preset.arpeggiator)
    setOverdrive(preset.overdrive)
  }

  function updateEqBand(index: number, db: number) {
    setEqBands((prev) => {
      const next = [...prev] as EqBands
      next[index] = db
      return next
    })
  }

  async function copyPatchLink() {
    const params = new URLSearchParams({
      wf: waveform,
      fm: filterMode,
      cutoff: String(cutoff),
      res: String(resonance),
      drive: String(drive),
      bass: String(bassBoost),
      tube: String(tubeDrive),
      wide: String(stereoWidth),
      rev: String(reverbMix),
      comp: String(compression),
      gain: String(masterGain),
      eq: eqBands.join(','),
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
    const driveFloor = (drive + tubeDrive * 0.6 + bassBoost * 3) / 320

    return Array.from({ length: count }, (_, i) => {
      if (!powered) return 8
      const t = (i / (count - 1)) * Math.PI * 2 * freqFactor
      let raw = 0
      if (waveform === 'sine') raw = (Math.sin(t) + 1) / 2
      else if (waveform === 'saw') raw = ((i * freqFactor) % 5) / 5
      else if (waveform === 'triangle') raw = 1 - Math.abs(((i * freqFactor) % 2) - 1)
      else raw = Math.sin(t) >= 0 ? 0.92 : 0.2

      const eqIdx = Math.min(4, Math.floor((i / count) * 5))
      const eqOffset = (eqBands[eqIdx] ?? 0) / 36
      const boosted = Math.min(
        1,
        raw * resBoost + driveFloor + eqOffset + (overdrive ? 0.14 : 0),
      )
      return Math.max(12, Math.round(boosted * 100))
    })
  }, [powered, waveform, cutoff, resonance, drive, tubeDrive, bassBoost, eqBands, overdrive])

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
            <span>v3.0 MULTIMODAL WEB AUDIO DSP</span>
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Sculpt analog tone &amp; DSP mastering in your browser.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted">
            AUDIOSYNTH // HZ pairs zero-latency synthesis with a full studio mastering
            signal chain: Dynamic Bass Boost, Vacuum Tube Saturation, Haas Stereo Widener,
            Convolver Room Reverb, DRC Limiter, and a 5-Band Multimodal Equalizer.
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

        {/* Right: Interactive Synth & Multimodal DSP Console */}
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
                  DSP-CHAIN // {webAudioPlaying ? 'LIVE 60FPS FFT' : isAnyAudioPlaying ? 'AUDIO LIVE' : 'STANDBY'}
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
                    <span>LOCAL MP3 / WAV (LIVE DSP CHAIN ACTIVE)</span>
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
              className="mt-4 flex h-36 items-end justify-between gap-1.5 rounded-xl border border-edge bg-canvas p-4"
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

            {/* DSP Rack Bay Switcher */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-edge pb-3">
              <div className="flex items-center gap-1.5 font-mono text-xs text-muted">
                <Sliders className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>DSP RACK BAY</span>
              </div>

              <div className="flex gap-1 rounded-lg border border-edge bg-canvas p-1">
                {(
                  [
                    { id: 'synth', label: 'SYNTH & VCF' },
                    { id: 'mastering', label: 'MASTERING // FX' },
                    { id: 'eq', label: '5-BAND EQ' },
                  ] as { id: RackBay; label: string }[]
                ).map((bay) => {
                  const active = rackBay === bay.id
                  return (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => setRackBay(bay.id)}
                      className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                        active
                          ? 'bg-accent text-accent-contrast'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {bay.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* BAY 1: SYNTH & VCF */}
            {rackBay === 'synth' && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Waveform Selector */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">OSC:</span>
                    <div className="flex gap-1 rounded-lg border border-edge bg-canvas p-1">
                      {WAVEFORMS.map((wf) => {
                        const selected = waveform === wf.id
                        return (
                          <button
                            key={wf.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setWaveform(wf.id)}
                            className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                              selected
                                ? 'bg-accent text-accent-contrast'
                                : 'text-muted hover:text-ink'
                            }`}
                          >
                            {wf.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Filter Mode Selector */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">VCF:</span>
                    <div className="flex gap-1 rounded-lg border border-edge bg-canvas p-1">
                      {FILTER_MODES.map((fm) => {
                        const selected = filterMode === fm.id
                        return (
                          <button
                            key={fm.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setFilterMode(fm.id)}
                            className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                              selected
                                ? 'bg-accent text-accent-contrast'
                                : 'text-muted hover:text-ink'
                            }`}
                          >
                            {fm.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <RotaryDial
                    id="cutoff-dial"
                    label="VCF CUTOFF"
                    sublabel="Filter Frequency"
                    value={cutoff}
                    min={120}
                    max={4800}
                    step={20}
                    unit=" Hz"
                    onChange={setCutoff}
                  />
                  <RotaryDial
                    id="resonance-dial"
                    label="RESONANCE"
                    sublabel="Filter Q Peak"
                    value={resonance}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={setResonance}
                  />
                  <RotaryDial
                    id="drive-dial"
                    label="OVERDRIVE"
                    sublabel="Harmonic Clip"
                    value={drive}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={setDrive}
                  />
                  <RotaryDial
                    id="bass-quick-dial"
                    label="DYNAMIC BASS"
                    sublabel="75Hz Sub Shelf"
                    value={bassBoost}
                    min={0}
                    max={15}
                    unit=" dB"
                    onChange={setBassBoost}
                  />
                  <RotaryDial
                    id="tube-quick-dial"
                    label="VACUUM TUBE"
                    sublabel="2nd Harmonic Drive"
                    value={tubeDrive}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={setTubeDrive}
                  />
                  <RotaryDial
                    id="wide-quick-dial"
                    label="STEREO WIDENER"
                    sublabel="Haas Soundstage"
                    value={stereoWidth}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={setStereoWidth}
                  />
                </div>
              </div>
            )}

            {/* BAY 2: MASTERING // FX (Full Mastering Suite) */}
            {rackBay === 'mastering' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <RotaryDial
                  id="dsp-bass-dial"
                  label="DYNAMIC BASS"
                  sublabel="75Hz Low-Shelf Boost"
                  value={bassBoost}
                  min={0}
                  max={15}
                  unit=" dB"
                  onChange={setBassBoost}
                />
                <RotaryDial
                  id="dsp-tube-dial"
                  label="VACUUM TUBE"
                  sublabel="Analog Warmth Saturation"
                  value={tubeDrive}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={setTubeDrive}
                />
                <RotaryDial
                  id="dsp-wide-dial"
                  label="STEREO WIDENER"
                  sublabel="Haas M/S Expansion"
                  value={stereoWidth}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={setStereoWidth}
                />
                <RotaryDial
                  id="dsp-reverb-dial"
                  label="ROOM REVERB"
                  sublabel="Convolver Impulse Mix"
                  value={reverbMix}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={setReverbMix}
                />
                <RotaryDial
                  id="dsp-comp-dial"
                  label="DRC LIMITER"
                  sublabel="Dynamic Range Comp"
                  value={compression}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={setCompression}
                />
                <RotaryDial
                  id="dsp-gain-dial"
                  label="OUTPUT GAIN"
                  sublabel="Master Post-DSP Level"
                  value={masterGain}
                  min={10}
                  max={100}
                  unit="%"
                  onChange={setMasterGain}
                />
              </div>
            )}

            {/* BAY 3: 5-BAND MULTIMODAL EQ */}
            {rackBay === 'eq' && (
              <div className="mt-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-muted">CURVES:</span>
                    {EQ_CURVES.map((curve) => (
                      <button
                        key={curve.label}
                        type="button"
                        onClick={() => setEqBands(curve.bands)}
                        className="rounded-md border border-edge bg-canvas/80 px-2 py-0.5 font-mono text-[11px] text-ink transition-colors hover:border-accent/60 hover:text-accent"
                      >
                        {curve.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEqBands([0, 0, 0, 0, 0])}
                    className="inline-flex items-center gap-1 rounded-md border border-edge bg-canvas px-2 py-0.5 font-mono text-[11px] text-muted hover:text-ink"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>FLAT</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {EQ_LABELS.map((label, idx) => (
                    <RotaryDial
                      key={label}
                      id={`eq-band-${idx}`}
                      label={label}
                      sublabel={idx === 0 ? 'Sub' : idx === 4 ? 'Air' : 'Peak'}
                      value={eqBands[idx]}
                      min={-12}
                      max={12}
                      step={1}
                      unit=" dB"
                      onChange={(val) => updateEqBand(idx, val)}
                    />
                  ))}
                </div>
              </div>
            )}

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
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  OVERDRIVE
                </span>
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
