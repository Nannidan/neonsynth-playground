# AUDIOSYNTH // HZ — Web Audio API Synthesizer & JamesDSP Mastering Console

[![CI](https://github.com/Nannidan/neonsynth-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/Nannidan/neonsynth-playground/actions)
**Live Demo:** [https://neonsynth-playground.vercel.app/](https://neonsynth-playground.vercel.app/)

Browser-native modular audio synthesizer and JamesDSP-inspired mastering rack built with **React 19**, **TypeScript**, **Web Audio API**, **Tailwind CSS v4**, and **Framer Motion**.

---

## Signal Chain Architecture

```text
[Oscillator / Local MP3]
   │
   ▼
[75Hz Dynamic Bass Boost (BiquadFilterNode: lowshelf)]
   │
   ▼
[5-Band Multimodal EQ (60Hz / 230Hz / 910Hz / 3.6kHz / 14kHz)]
   │
   ▼
[Resonant VCF Filter (LPF / BPF / HPF)]
   │
   ▼
[Vacuum Tube Modelling (2x Oversampled Asymmetric WaveShaperNode)]
   │
   ▼
[Hard Overdrive Stage (4x Oversampled WaveShaperNode)]
   │
   ▼
[Haas Stereo Widener (Dual Micro-Delay + StereoPanner L/R Expansion)]
   │
   ▼
[Studio Room Reverb (Parallel Dry/Wet ConvolverNode Impulse Response)]
   │
   ▼
[Dynamic Range Compressor / Limiter (DynamicsCompressorNode)]
   │
   ▼
[Master Output Gain] ──► [60fps AnalyserNode FFT Visualizer] ──► [AudioContext.destination]
```

## Key Engineering Features

- **Tactile SVG Rotary Dials (`<RotaryDial />`):** Custom 270° SVG arc + rotating needle indicators synchronized with accessible range inputs across 3 switchable DSP rack bays (`SYNTH & VCF`, `JAMESDSP // STAGE`, `5-BAND EQ`).
- **60fps Direct-DOM FFT Spectrum Visualizer:** Reads `AnalyserNode.getByteFrequencyData()` inside a `requestAnimationFrame` loop and mutates bar heights via React refs to avoid 60Hz React re-render overhead.
- **Shareable Patch URLs:** Full DSP state (`wf`, `fm`, `cutoff`, `res`, `drive`, `bass`, `tube`, `wide`, `rev`, `comp`, `gain`, `eq`, `arp`, `od`) is serialized into `URLSearchParams` for 1-click patch sharing.

## Local Development

```bash
npm install
npm run dev
npm run lint
npm run build
```
