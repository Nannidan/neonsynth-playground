import { useEffect, useRef, useState } from 'react'

export type SynthWaveform = 'sine' | 'saw' | 'square'

interface SynthParams {
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

export function useSynthAudio(params: SynthParams) {
  const [isPlaying, setIsPlaying] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const shaperRef = useRef<WaveShaperNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const stepRef = useRef(0)

  function stopAudio() {
    if (oscRef.current) {
      try {
        oscRef.current.stop()
        oscRef.current.disconnect()
      } catch {
        // already stopped
      }
      oscRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }
    setIsPlaying(false)
  }

  function startAudio() {
    if (ctxRef.current) return

    const ctx = new window.AudioContext()
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const shaper = ctx.createWaveShaper()
    const gain = ctx.createGain()

    osc.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
    osc.frequency.value = 220

    filter.type = 'lowpass'
    filter.frequency.value = params.cutoff
    filter.Q.value = (params.resonance / 100) * 18

    shaper.curve = params.overdrive ? makeDistortionCurve(params.drive * 2) : null
    shaper.oversample = '4x'

    gain.gain.value = 0.08 + (params.drive / 100) * 0.12

    osc.connect(filter)
    filter.connect(shaper)
    shaper.connect(gain)
    gain.connect(ctx.destination)

    osc.start()

    ctxRef.current = ctx
    oscRef.current = osc
    filterRef.current = filter
    shaperRef.current = shaper
    gainRef.current = gain
    setIsPlaying(true)
  }

  function toggleAudio() {
    if (isPlaying) {
      stopAudio()
    } else {
      startAudio()
    }
  }

  // Stop audio automatically if synth power is turned off
  useEffect(() => {
    if (!params.powered && isPlaying) {
      stopAudio()
    }
  }, [params.powered, isPlaying])

  // Live-update oscillator, filter, and distortion when sliders move
  useEffect(() => {
    if (!isPlaying || !ctxRef.current || !oscRef.current || !filterRef.current || !shaperRef.current || !gainRef.current) {
      return
    }
    const now = ctxRef.current.currentTime
    oscRef.current.type = params.waveform === 'saw' ? 'sawtooth' : params.waveform
    filterRef.current.frequency.setTargetAtTime(params.cutoff, now, 0.02)
    filterRef.current.Q.setTargetAtTime((params.resonance / 100) * 18, now, 0.02)
    shaperRef.current.curve = params.overdrive ? makeDistortionCurve(params.drive * 2) : null
    gainRef.current.gain.setTargetAtTime(0.08 + (params.drive / 100) * 0.12, now, 0.02)
  }, [isPlaying, params.waveform, params.cutoff, params.resonance, params.drive, params.overdrive])

  // Arpeggiator loop
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

  // Clean up on unmount
  useEffect(() => {
    return () => stopAudio()
  }, [])

  return { isPlaying, toggleAudio }
}
