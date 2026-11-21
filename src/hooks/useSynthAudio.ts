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
  stereoWidth: number // 0..100 % (Stereo Chorus / Haas Widener)
  reverbMix: number // 0..100 % (Convolver Room Reverb)
  compression: number // 0..100 % (Dynamic Range Compressor)
  masterGain: number // 0..100 %
  eqBands: EqBands // 5-Band Multimodal EQ
  arpeggiator: boolean
  overdrive: boolean
}

// Multi-octave synthwave arpeggio pattern (A2 -> E3 -> A3 -> C4 -> E4 -> G4 -> A4 -> C5)
const ARP_NOTES = [110.0, 164.81, 220.0, 261.63, 329.63, 392.0, 440.0, 523.25]

// Aggressive analog stompbox overdrive / wavefolder curve
function makeOverdriveCurve(drivePercent: number, enabled: boolean) {
  if (!enabled && drivePercent <= 5) return null
  const samples = 44100
  const curve = new Float32Array(samples)
  const k = enabled ? 18 + (drivePercent / 100) * 140 : (drivePercent / 100) * 28
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    if (enabled) {
      // Hard asymmetric fuzz + foldback bite when OVERDRIVE switch is ON
      const driven = x * (1 + k * 0.08)
      curve[i] = Math.tanh(driven) * 0.85 + Math.sin(driven * 1.4) * 0.15
    } else {
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
    }
  }
  return curve
}

// Asymmetric 2nd/3rd-harmonic vacuum tube saturation curve
function makeVacuumTubeCurve(tubePercent: number) {
  if (tubePercent <= 1) return null
  const samples = 44100
  const curve = new Float32Array(samples)
  const drive = 1 + (tubePercent / 100) * 6.5
  const asym = (tubePercent / 100) * 0.28
  const norm = Math.tanh(drive)
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    const shifted = x + asym * (1 - x * x)
    curve[i] = Math.tanh(shifted * drive) / norm
  }
  return curve
}

// Rich stereo hall impulse response with early reflections + late decay
function createReverbImpulse(ctx: AudioContext, durationSec = 2.8, decay = 2.1) {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * durationSec)
  const impulse = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const t = i / length
      const env = Math.pow(1 - t, decay)
      // Add distinct early reflection taps at 18ms, 37ms, 64ms
      const early =
        i === Math.floor(rate * 0.018) ||
        i === Math.floor(rate * 0.037) ||
        i === Math.floor(rate * 0.064)
          ? 0.65
          : 0
      channelData[i] = ((Math.random() * 2 - 1) * env + early) * 0.9
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
  const oscMainRef = useRef<OscillatorNode | null>(null)
  const oscUnisonRef = useRef<OscillatorNode | null>(null)
  const oscSubRef = useRef<OscillatorNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)
  const subGainRef = useRef<GainNode | null>(null)
  const preDriveGainRef = useRef<GainNode | null>(null)
  const tubeShaperRef = useRef<WaveShaperNode | null>(null)
  const shaperRef = useRef<WaveShaperNode | null>(null)
  const bassFilterRef = useRef<BiquadFilterNode | null>(null)
  const eqNodesRef = useRef<BiquadFilterNode[]>([])
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const stereoWetRef = useRef<GainNode | null>(null)
  const lfoDepthLRef = useRef<GainNode | null>(null)
  const lfoDepthRRef = useRef<GainNode | null>(null)
  const reverbDryRef = useRef<GainNode | null>(null)
  const reverbWetRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const stepRef = useRef(0)

  function stopAudio() {
    for (const node of [
      sourceRef.current,
      oscUnisonRef.current,
      oscSubRef.current,
      lfoRef.current,
    ]) {
      if (node) {
        try {
          node.stop()
          node.disconnect()
        } catch {
          // already stopped
        }
      }
    }
    sourceRef.current = null
    oscMainRef.current = null
    oscUnisonRef.current = null
    oscSubRef.current = null
    lfoRef.current = null

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

      // 1. Pre-Drive & Vacuum Tube + Overdrive Stage (placed BEFORE filter & EQ so harmonics are sculpted!)
      const preDriveGain = ctx.createGain()
      const preBoost =
        1 + (params.drive / 100) * 1.6 + (params.tubeDrive / 100) * 1.2 + (params.overdrive ? 1.8 : 0)
      preDriveGain.gain.value = preBoost

      const tubeShaper = ctx.createWaveShaper()
      tubeShaper.curve = makeVacuumTubeCurve(params.tubeDrive)
      tubeShaper.oversample = '2x'

      const shaper = ctx.createWaveShaper()
      shaper.curve = makeOverdriveCurve(params.drive, params.overdrive)
      shaper.oversample = '4x'

      // 2. Dynamic Bass Boost (80Hz resonant lowshelf + punch)
      const bassFilter = ctx.createBiquadFilter()
      bassFilter.type = 'lowshelf'
      bassFilter.frequency.value = 85
      bassFilter.gain.value = params.bassBoost * 1.4

      // 3. Resonant VCF Filter (LPF / BPF / HPF) with high-Q scream capability
      const filter = ctx.createBiquadFilter()
      filter.type = params.filterMode
      filter.frequency.value = params.cutoff
      filter.Q.value = 0.7 + (params.resonance / 100) * 24

      // 4. Multimodal 5-Band Equalizer (amplified +/-15dB authority)
      const eqNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const node = ctx.createBiquadFilter()
        node.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking'
        node.frequency.value = freq
        node.Q.value = 0.95
        node.gain.value = (params.eqBands[idx] ?? 0) * 1.35
        return node
      })

      // 5. LFO-Modulated Stereo Dimension Widener / Chorus
      const widenerIn = ctx.createGain()
      const widenerOut = ctx.createGain()
      const delayL = ctx.createDelay(0.08)
      const delayR = ctx.createDelay(0.08)
      delayL.delayTime.value = 0.011
      delayR.delayTime.value = 0.019

      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.85
      const lfoDepthL = ctx.createGain()
      const lfoDepthR = ctx.createGain()
      const widthNorm = params.stereoWidth / 100
      lfoDepthL.gain.value = widthNorm * 0.0035
      lfoDepthR.gain.value = -widthNorm * 0.0035
      lfo.connect(lfoDepthL)
      lfo.connect(lfoDepthR)
      lfoDepthL.connect(delayL.delayTime)
      lfoDepthR.connect(delayR.delayTime)
      lfo.start()

      const panL = ctx.createStereoPanner()
      const panR = ctx.createStereoPanner()
      panL.pan.value = -1
      panR.pan.value = 1
      const stereoWet = ctx.createGain()
      stereoWet.gain.value = widthNorm * 0.95

      widenerIn.connect(widenerOut)
      widenerIn.connect(delayL)
      widenerIn.connect(delayR)
      delayL.connect(panL)
      delayR.connect(panR)
      panL.connect(stereoWet)
      panR.connect(stereoWet)
      stereoWet.connect(widenerOut)

      // 6. Studio Hall Convolver Reverb (Parallel Dry / Wet bus)
      const convolver = ctx.createConvolver()
      convolver.buffer = createReverbImpulse(ctx, 2.8, 2.1)
      const reverbDry = ctx.createGain()
      const reverbWet = ctx.createGain()
      const reverbMixNorm = params.reverbMix / 100
      reverbDry.gain.value = Math.max(0.2, 1 - reverbMixNorm * 0.65)
      reverbWet.gain.value = reverbMixNorm * 1.35
      const reverbSum = ctx.createGain()

      widenerOut.connect(reverbDry)
      widenerOut.connect(convolver)
      convolver.connect(reverbWet)
      reverbDry.connect(reverbSum)
      reverbWet.connect(reverbSum)

      // 7. Dynamic Range Compressor / Limiter + Make-up Gain
      const compressor = ctx.createDynamicsCompressor()
      const compNorm = params.compression / 100
      compressor.threshold.value = -8 - compNorm * 36
      compressor.knee.value = 10
      compressor.ratio.value = 1.5 + compNorm * 14
      compressor.attack.value = 0.003
      compressor.release.value = 0.14

      // 8. Master Output Gain & FFT Analyser
      const gain = ctx.createGain()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.72

      const compMakeup = 1 + compNorm * 0.55
      const baseLevel = params.sourceMode === 'mp3' ? 0.55 : 0.22
      gain.gain.value = baseLevel * compMakeup * (params.masterGain / 100)

      // Wire the complete chain:
      // Source -> PreDrive -> Tube -> Overdrive -> BassBoost -> VCF -> 5-Band EQ -> Widener -> Reverb -> DRC -> Gain -> Analyser
      preDriveGain.connect(tubeShaper)
      tubeShaper.connect(shaper)
      shaper.connect(bassFilter)
      bassFilter.connect(filter)
      filter.connect(eqNodes[0])
      for (let i = 0; i < eqNodes.length - 1; i++) {
        eqNodes[i].connect(eqNodes[i + 1])
      }
      eqNodes[eqNodes.length - 1].connect(widenerIn)
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
        bufferSource.connect(preDriveGain)
        bufferSource.start()
        sourceRef.current = bufferSource
        oscMainRef.current = null
      } else {
        // Rich 3-Oscillator Analog Voice: Main + Detuned Unison Harmonics + Sub-Octave Bass
        const oscMain = ctx.createOscillator()
        const oscUnison = ctx.createOscillator()
        const oscSub = ctx.createOscillator()

        const mainGain = ctx.createGain()
        const unisonGain = ctx.createGain()
        const subGain = ctx.createGain()

        oscMain.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
        // Unison oscillator adds upper-harmonic shimmer even when Main is on Sine
        oscUnison.type = params.waveform === 'sine' ? 'triangle' : 'sawtooth'
        oscSub.type = 'sawtooth'

        oscMain.frequency.value = 220
        oscUnison.frequency.value = params.arpeggiator ? 220 : 329.63 // Fifth interval chord when ARP is off!
        oscUnison.detune.value = 9
        oscSub.frequency.value = 110

        mainGain.gain.value = 0.65
        unisonGain.gain.value = 0.32
        subGain.gain.value = 0.35 + (params.bassBoost / 15) * 0.55

        oscMain.connect(mainGain)
        oscUnison.connect(unisonGain)
        oscSub.connect(subGain)

        mainGain.connect(preDriveGain)
        unisonGain.connect(preDriveGain)
        subGain.connect(preDriveGain)

        oscMain.start()
        oscUnison.start()
        oscSub.start()

        sourceRef.current = oscMain
        oscMainRef.current = oscMain
        oscUnisonRef.current = oscUnison
        oscSubRef.current = oscSub
        subGainRef.current = subGain
      }

      ctxRef.current = ctx
      lfoRef.current = lfo
      preDriveGainRef.current = preDriveGain
      tubeShaperRef.current = tubeShaper
      shaperRef.current = shaper
      bassFilterRef.current = bassFilter
      eqNodesRef.current = eqNodes
      filterRef.current = filter
      stereoWetRef.current = stereoWet
      lfoDepthLRef.current = lfoDepthL
      lfoDepthRRef.current = lfoDepthR
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

  // Real-time parameter updates across every dial and toggle
  useEffect(() => {
    if (!isPlaying || !ctxRef.current) return
    const now = ctxRef.current.currentTime

    if (oscMainRef.current) {
      oscMainRef.current.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
    }
    if (oscUnisonRef.current) {
      oscUnisonRef.current.type = params.waveform === 'sine' ? 'triangle' : 'sawtooth'
    }
    if (subGainRef.current) {
      subGainRef.current.gain.setTargetAtTime(0.35 + (params.bassBoost / 15) * 0.55, now, 0.02)
    }
    if (preDriveGainRef.current) {
      const preBoost =
        1 + (params.drive / 100) * 1.6 + (params.tubeDrive / 100) * 1.2 + (params.overdrive ? 1.8 : 0)
      preDriveGainRef.current.gain.setTargetAtTime(preBoost, now, 0.02)
    }
    if (tubeShaperRef.current) {
      tubeShaperRef.current.curve = makeVacuumTubeCurve(params.tubeDrive)
    }
    if (shaperRef.current) {
      shaperRef.current.curve = makeOverdriveCurve(params.drive, params.overdrive)
    }
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.setTargetAtTime(params.bassBoost * 1.4, now, 0.02)
    }
    if (filterRef.current) {
      filterRef.current.type = params.filterMode
      filterRef.current.frequency.setTargetAtTime(params.cutoff, now, 0.02)
      filterRef.current.Q.setTargetAtTime(0.7 + (params.resonance / 100) * 24, now, 0.02)
    }
    eqNodesRef.current.forEach((node, idx) => {
      node.gain.setTargetAtTime((params.eqBands[idx] ?? 0) * 1.35, now, 0.02)
    })
    if (stereoWetRef.current && lfoDepthLRef.current && lfoDepthRRef.current) {
      const widthNorm = params.stereoWidth / 100
      stereoWetRef.current.gain.setTargetAtTime(widthNorm * 0.95, now, 0.02)
      lfoDepthLRef.current.gain.setTargetAtTime(widthNorm * 0.0035, now, 0.02)
      lfoDepthRRef.current.gain.setTargetAtTime(-widthNorm * 0.0035, now, 0.02)
    }
    if (reverbDryRef.current && reverbWetRef.current) {
      const mix = params.reverbMix / 100
      reverbDryRef.current.gain.setTargetAtTime(Math.max(0.2, 1 - mix * 0.65), now, 0.02)
      reverbWetRef.current.gain.setTargetAtTime(mix * 1.35, now, 0.02)
    }
    if (compressorRef.current) {
      const compNorm = params.compression / 100
      compressorRef.current.threshold.setTargetAtTime(-8 - compNorm * 36, now, 0.02)
      compressorRef.current.ratio.setTargetAtTime(1.5 + compNorm * 14, now, 0.02)
    }
    if (gainRef.current) {
      const compNorm = params.compression / 100
      const compMakeup = 1 + compNorm * 0.55
      const baseLevel = params.sourceMode === 'mp3' ? 0.55 : 0.22
      gainRef.current.gain.setTargetAtTime(
        baseLevel * compMakeup * (params.masterGain / 100),
        now,
        0.02,
      )
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

  // Arpeggiator + Filter Pluck Envelope vs. Sustained Power-Chord Drone when ARP is toggled
  useEffect(() => {
    if (!isPlaying || !oscMainRef.current || !ctxRef.current) return

    if (!params.arpeggiator) {
      const now = ctxRef.current.currentTime
      oscMainRef.current.frequency.setTargetAtTime(220, now, 0.02)
      if (oscUnisonRef.current) {
        oscUnisonRef.current.frequency.setTargetAtTime(329.63, now, 0.02) // A3 + E4 fifth chord
      }
      if (oscSubRef.current) {
        oscSubRef.current.frequency.setTargetAtTime(110, now, 0.02)
      }
      return
    }

    const interval = window.setInterval(() => {
      if (!oscMainRef.current || !ctxRef.current) return
      const now = ctxRef.current.currentTime
      const note = ARP_NOTES[stepRef.current % ARP_NOTES.length]
      oscMainRef.current.frequency.setTargetAtTime(note, now, 0.012)
      if (oscUnisonRef.current) {
        oscUnisonRef.current.frequency.setTargetAtTime(note * 1.004, now, 0.012)
      }
      if (oscSubRef.current) {
        oscSubRef.current.frequency.setTargetAtTime(note * 0.5, now, 0.012)
      }
      // Subtle rhythmic filter envelope pluck on each arpeggiator step
      if (filterRef.current) {
        const pluckPeak = Math.min(6000, params.cutoff * 1.45)
        filterRef.current.frequency.setValueAtTime(pluckPeak, now)
        filterRef.current.frequency.exponentialRampToValueAtTime(
          Math.max(80, params.cutoff),
          now + 0.14,
        )
      }
      stepRef.current += 1
    }, 165)

    return () => window.clearInterval(interval)
  }, [isPlaying, params.arpeggiator, params.cutoff])

  useEffect(() => {
    return () => stopAudio()
  }, [])

  return { isPlaying, audioError, toggleAudio, stopAudio, analyserRef }
}
