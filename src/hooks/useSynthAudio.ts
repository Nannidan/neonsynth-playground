import { useEffect, useRef, useState } from 'react'

export type SynthWaveform = 'sine' | 'saw' | 'square' | 'triangle'
export type FilterMode = 'lowpass' | 'bandpass' | 'highpass'
export type AudioSourceMode = 'synth' | 'youtube' | 'mp3'

export type EqBands = [number, number, number, number, number] // 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz (-12..+12 dB)

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const
export const EQ_LABELS = ['60Hz', '230Hz', '910Hz', '3.6k', '14k'] as const

export interface SynthParams {
  sourceMode: AudioSourceMode
  mp3File: File | null
  powered: boolean
  waveform: SynthWaveform
  filterMode: FilterMode
  cutoff: number
  resonance: number
  drive: number
  bassBoost: number // 0..15 dB (Sub-Bass Low-Shelf Boost)
  tubeDrive: number // 0..100 % (Vacuum Tube Harmonic Saturation)
  stereoWidth: number // 0..100 % (Haas Stereo Widener)
  reverbMix: number // 0..100 % (Convolver Room Reverb)
  compression: number // 0..100 % (Dynamic Range Compressor)
  masterGain: number // 0..100 %
  eqBands: EqBands // 5-Band Multimodal EQ
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

// Asymmetric soft-clipping curve modelling 2nd-harmonic vacuum tube saturation
function makeVacuumTubeCurve(tubePercent: number) {
  if (tubePercent <= 0) return null
  const samples = 44100
  const curve = new Float32Array(samples)
  const drive = 1 + (tubePercent / 100) * 3.5
  const asym = (tubePercent / 100) * 0.18
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    const shifted = x + asym * (1 - x * x)
    curve[i] = Math.tanh(shifted * drive) / Math.tanh(drive)
  }
  return curve
}

// Synthesize a stereo exponential-decay impulse response for the ConvolverNode
function createReverbImpulse(ctx: AudioContext, durationSec = 2.2, decay = 2.4) {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * durationSec)
  const impulse = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay)
      channelData[i] = (Math.random() * 2 - 1) * env
    }
  }
  return impulse
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
  const bassFilterRef = useRef<BiquadFilterNode | null>(null)
  const eqNodesRef = useRef<BiquadFilterNode[]>([])
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const tubeShaperRef = useRef<WaveShaperNode | null>(null)
  const shaperRef = useRef<WaveShaperNode | null>(null)
  const stereoWetRef = useRef<GainNode | null>(null)
  const reverbDryRef = useRef<GainNode | null>(null)
  const reverbWetRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
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
    eqNodesRef.current = []
    analyserRef.current = null
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

      // 1. Dynamic Bass Boost (75Hz lowshelf)
      const bassFilter = ctx.createBiquadFilter()
      bassFilter.type = 'lowshelf'
      bassFilter.frequency.value = 75
      bassFilter.gain.value = params.bassBoost

      // 2. Multimodal 5-Band Equalizer
      const eqNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const node = ctx.createBiquadFilter()
        node.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking'
        node.frequency.value = freq
        node.Q.value = 1.15
        node.gain.value = params.eqBands[idx] ?? 0
        return node
      })

      // 3. Resonant VCF Filter (LPF / BPF / HPF)
      const filter = ctx.createBiquadFilter()
      filter.type = params.filterMode
      filter.frequency.value = params.cutoff
      filter.Q.value = (params.resonance / 100) * 18

      // 4. Vacuum Tube Modelling (2nd-harmonic warm saturation)
      const tubeShaper = ctx.createWaveShaper()
      tubeShaper.curve = makeVacuumTubeCurve(params.tubeDrive)
      tubeShaper.oversample = '2x'

      // 5. Hard Overdrive WaveShaper
      const shaper = ctx.createWaveShaper()
      shaper.curve = params.overdrive ? makeDistortionCurve(params.drive * 2) : null
      shaper.oversample = '4x'

      // 6. Stereo Widener (Haas micro-delay side expansion)
      const widenerIn = ctx.createGain()
      const widenerOut = ctx.createGain()
      const delayL = ctx.createDelay(0.05)
      const delayR = ctx.createDelay(0.05)
      delayL.delayTime.value = 0.008
      delayR.delayTime.value = 0.017
      const panL = ctx.createStereoPanner()
      const panR = ctx.createStereoPanner()
      panL.pan.value = -1
      panR.pan.value = 1
      const stereoWet = ctx.createGain()
      stereoWet.gain.value = (params.stereoWidth / 100) * 0.55

      widenerIn.connect(widenerOut) // dry center
      widenerIn.connect(delayL)
      widenerIn.connect(delayR)
      delayL.connect(panL)
      delayR.connect(panR)
      panL.connect(stereoWet)
      panR.connect(stereoWet)
      stereoWet.connect(widenerOut)

      // 7. Studio Reverb Convolver (Dry / Wet parallel bus)
      const convolver = ctx.createConvolver()
      convolver.buffer = createReverbImpulse(ctx, 2.2, 2.4)
      const reverbDry = ctx.createGain()
      const reverbWet = ctx.createGain()
      const reverbMixNorm = params.reverbMix / 100
      reverbDry.gain.value = 1 - reverbMixNorm * 0.45
      reverbWet.gain.value = reverbMixNorm * 0.85
      const reverbSum = ctx.createGain()

      widenerOut.connect(reverbDry)
      widenerOut.connect(convolver)
      convolver.connect(reverbWet)
      reverbDry.connect(reverbSum)
      reverbWet.connect(reverbSum)

      // 8. Dynamic Range Compressor / Limiter
      const compressor = ctx.createDynamicsCompressor()
      const compNorm = params.compression / 100
      compressor.threshold.value = -6 - compNorm * 34 // -6dB down to -40dB
      compressor.knee.value = 12
      compressor.ratio.value = 1 + compNorm * 11 // 1:1 up to 12:1
      compressor.attack.value = 0.005
      compressor.release.value = 0.18

      // 9. Master Output Gain & FFT Analyser
      const gain = ctx.createGain()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.78

      const baseLevel =
        params.sourceMode === 'mp3'
          ? 0.35 + (params.drive / 100) * 0.65
          : 0.08 + (params.drive / 100) * 0.14
      gain.gain.value = baseLevel * (params.masterGain / 100)

      // Wire the serial + parallel Multimodal DSP chain
      bassFilter.connect(eqNodes[0])
      for (let i = 0; i < eqNodes.length - 1; i++) {
        eqNodes[i].connect(eqNodes[i + 1])
      }
      eqNodes[eqNodes.length - 1].connect(filter)
      filter.connect(tubeShaper)
      tubeShaper.connect(shaper)
      shaper.connect(widenerIn)
      reverbSum.connect(compressor)
      compressor.connect(gain)
      gain.connect(analyser)
      analyser.connect(ctx.destination)

      if (params.sourceMode === 'mp3' && params.mp3File) {
        const rawBuffer = await params.mp3File.arrayBuffer()
        const decoded = await ctx.decodeAudioData(rawBuffer)
        const bufferSource = ctx.createBufferSource()
        bufferSource.buffer = decoded
        bufferSource.loop = true
        bufferSource.connect(bassFilter)
        bufferSource.start()
        sourceRef.current = bufferSource
        oscRef.current = null
      } else {
        const osc = ctx.createOscillator()
        osc.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
        osc.frequency.value = 220
        osc.connect(bassFilter)
        osc.start()
        sourceRef.current = osc
        oscRef.current = osc
      }

      ctxRef.current = ctx
      bassFilterRef.current = bassFilter
      eqNodesRef.current = eqNodes
      filterRef.current = filter
      tubeShaperRef.current = tubeShaper
      shaperRef.current = shaper
      stereoWetRef.current = stereoWet
      reverbDryRef.current = reverbDry
      reverbWetRef.current = reverbWet
      compressorRef.current = compressor
      gainRef.current = gain
      analyserRef.current = analyser
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

  useEffect(() => {
    if ((!params.powered || params.sourceMode === 'youtube') && isPlaying) {
      stopAudio()
    }
  }, [params.powered, params.sourceMode, isPlaying])

  useEffect(() => {
    if (isPlaying) {
      stopAudio()
    }
    setAudioError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sourceMode, params.mp3File])

  // Real-time parameter updates across the full Multimodal DSP signal chain
  useEffect(() => {
    if (!isPlaying || !ctxRef.current) return
    const now = ctxRef.current.currentTime

    if (oscRef.current) {
      oscRef.current.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
    }
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.setTargetAtTime(params.bassBoost, now, 0.02)
    }
    eqNodesRef.current.forEach((node, idx) => {
      node.gain.setTargetAtTime(params.eqBands[idx] ?? 0, now, 0.02)
    })
    if (filterRef.current) {
      filterRef.current.type = params.filterMode
      filterRef.current.frequency.setTargetAtTime(params.cutoff, now, 0.02)
      filterRef.current.Q.setTargetAtTime((params.resonance / 100) * 18, now, 0.02)
    }
    if (tubeShaperRef.current) {
      tubeShaperRef.current.curve = makeVacuumTubeCurve(params.tubeDrive)
    }
    if (shaperRef.current) {
      shaperRef.current.curve = params.overdrive ? makeDistortionCurve(params.drive * 2) : null
    }
    if (stereoWetRef.current) {
      stereoWetRef.current.gain.setTargetAtTime((params.stereoWidth / 100) * 0.55, now, 0.02)
    }
    if (reverbDryRef.current && reverbWetRef.current) {
      const mix = params.reverbMix / 100
      reverbDryRef.current.gain.setTargetAtTime(1 - mix * 0.45, now, 0.02)
      reverbWetRef.current.gain.setTargetAtTime(mix * 0.85, now, 0.02)
    }
    if (compressorRef.current) {
      const compNorm = params.compression / 100
      compressorRef.current.threshold.setTargetAtTime(-6 - compNorm * 34, now, 0.02)
      compressorRef.current.ratio.setTargetAtTime(1 + compNorm * 11, now, 0.02)
    }
    if (gainRef.current) {
      const baseLevel =
        params.sourceMode === 'mp3'
          ? 0.35 + (params.drive / 100) * 0.65
          : 0.08 + (params.drive / 100) * 0.14
      gainRef.current.gain.setTargetAtTime(baseLevel * (params.masterGain / 100), now, 0.02)
    }
  }, [
    isPlaying,
    params.sourceMode,
    params.waveform,
    params.filterMode,
    params.cutoff,
    params.resonance,
    params.drive,
    params.bassBoost,
    params.tubeDrive,
    params.stereoWidth,
    params.reverbMix,
    params.compression,
    params.masterGain,
    params.eqBands,
    params.overdrive,
  ])

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

  return { isPlaying, audioError, toggleAudio, stopAudio, analyserRef }
}
