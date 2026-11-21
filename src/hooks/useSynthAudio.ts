import { useEffect, useRef, useState } from 'react'

export type SynthWaveform = 'sine' | 'saw' | 'square'
export type AudioSourceMode = 'synth' | 'youtube' | 'mp3'

interface SynthParams {
  sourceMode: AudioSourceMode
  mp3File: File | null
  powered: boolean
  waveform: SynthWaveform
  cutoff: number
  resonance: number
  drive: number
  arpeggiator: boolean
  overdrive: boolean
}

const ARP_NOTES = [220, 261.63, 329.63, 392.0, 440, 392.0, 329.63, 261.63]

function makeDistortionCurve(amount: number) {
  const samples = 44100
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1).split('/')[0]
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
    const vParam = url.searchParams.get('v')
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam

    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live')
    if (idx !== -1 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
      return parts[idx + 1]
    }
  } catch {
    return null
  }
  return null
}

export function useSynthAudio(params: SynthParams) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<OscillatorNode | AudioBufferSourceNode | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const shaperRef = useRef<WaveShaperNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const stepRef = useRef(0)

  function stopAudio() {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop()
        sourceRef.current.disconnect()
      } catch {
        // already stopped
      }
      sourceRef.current = null
      oscRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }
    setIsPlaying(false)
  }

  async function startAudio() {
    if (ctxRef.current) return
    setAudioError(null)

    if (params.sourceMode === 'mp3' && !params.mp3File) {
      setAudioError('Choose an MP3 or WAV file first.')
      return
    }

    try {
      const ctx = new window.AudioContext()
      const filter = ctx.createBiquadFilter()
      const shaper = ctx.createWaveShaper()
      const gain = ctx.createGain()

      filter.type = 'lowpass'
      filter.frequency.value = params.cutoff
      filter.Q.value = (params.resonance / 100) * 18

      shaper.curve = params.overdrive ? makeDistortionCurve(params.drive * 2) : null
      shaper.oversample = '4x'

      gain.gain.value =
        params.sourceMode === 'mp3'
          ? 0.35 + (params.drive / 100) * 0.65
          : 0.08 + (params.drive / 100) * 0.12

      filter.connect(shaper)
      shaper.connect(gain)
      gain.connect(ctx.destination)

      if (params.sourceMode === 'mp3' && params.mp3File) {
        const rawBuffer = await params.mp3File.arrayBuffer()
        const decoded = await ctx.decodeAudioData(rawBuffer)
        const bufferSource = ctx.createBufferSource()
        bufferSource.buffer = decoded
        bufferSource.loop = true
        bufferSource.connect(filter)
        bufferSource.start()
        sourceRef.current = bufferSource
        oscRef.current = null
      } else {
        const osc = ctx.createOscillator()
        osc.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
        osc.frequency.value = 220
        osc.connect(filter)
        osc.start()
        sourceRef.current = osc
        oscRef.current = osc
      }

      ctxRef.current = ctx
      filterRef.current = filter
      shaperRef.current = shaper
      gainRef.current = gain
      setIsPlaying(true)
    } catch {
      stopAudio()
      setAudioError('Could not decode that audio file. Try a standard MP3 or WAV.')
    }
  }

  function toggleAudio() {
    if (isPlaying) {
      stopAudio()
    } else {
      void startAudio()
    }
  }

  // Stop Web Audio if power is turned off or source changes
  useEffect(() => {
    if ((!params.powered || params.sourceMode === 'youtube') && isPlaying) {
      stopAudio()
    }
  }, [params.powered, params.sourceMode, isPlaying])

  // Reset playback if user swaps MP3 files or switches between synth/mp3
  useEffect(() => {
    if (isPlaying) {
      stopAudio()
    }
    setAudioError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sourceMode, params.mp3File])

  // Live-update DSP nodes when sliders move (works for both Synth and MP3)
  useEffect(() => {
    if (!isPlaying || !ctxRef.current || !filterRef.current || !shaperRef.current || !gainRef.current) {
      return
    }
    const now = ctxRef.current.currentTime
    if (oscRef.current) {
      oscRef.current.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
    }
    filterRef.current.frequency.setTargetAtTime(params.cutoff, now, 0.02)
    filterRef.current.Q.setTargetAtTime((params.resonance / 100) * 18, now, 0.02)
    shaperRef.current.curve = params.overdrive ? makeDistortionCurve(params.drive * 2) : null
    const targetGain =
      params.sourceMode === 'mp3'
        ? 0.35 + (params.drive / 100) * 0.65
        : 0.08 + (params.drive / 100) * 0.12
    gainRef.current.gain.setTargetAtTime(targetGain, now, 0.02)
  }, [
    isPlaying,
    params.sourceMode,
    params.waveform,
    params.cutoff,
    params.resonance,
    params.drive,
    params.overdrive,
  ])

  // Arpeggiator loop (synth mode only)
  useEffect(() => {
    if (!isPlaying || !oscRef.current || !ctxRef.current) return

    if (!params.arpeggiator) {
      oscRef.current.frequency.setTargetAtTime(220, ctxRef.current.currentTime, 0.02)
      return
    }

    const interval = window.setInterval(() => {
      if (!oscRef.current || !ctxRef.current) return
      const note = ARP_NOTES[stepRef.current % ARP_NOTES.length]
      oscRef.current.frequency.setTargetAtTime(note, ctxRef.current.currentTime, 0.015)
      stepRef.current += 1
    }, 180)

    return () => window.clearInterval(interval)
  }, [isPlaying, params.arpeggiator])

  useEffect(() => {
    return () => stopAudio()
  }, [])

  return { isPlaying, audioError, toggleAudio, stopAudio }
}
