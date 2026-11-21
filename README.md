# AUDIOSYNTH // HZ

An interactive, browser-based modular synthesizer and product landing page built with **React**, **TypeScript**, **Tailwind CSS v4**, **Framer Motion**, and the native **Web Audio API**.

**Live Demo:** [neonsynth-playground.vercel.app](https://neonsynth-playground.vercel.app/)

---

## Key Features

- **Real-Time Web Audio DSP Engine:** Synthesizes live Sine, Sawtooth, and Square waves routed through a `BiquadFilterNode` (Cutoff & Resonance), a custom `WaveShaperNode` overdrive curve, and an interactive Arpeggiator loop.
- **3-Mode Audio Source Switcher:**
  - **Synth:** Playable browser oscillator with one-click patch randomization.
  - **Local MP3 / WAV:** Decodes user-uploaded audio files via `AudioBufferSourceNode` and routes them live through the synth's filter and overdrive chain.
  - **YouTube Deck:** Parses standard, `youtu.be`, and Shorts URLs into an embedded player.
- **4 Persistent Stage-Tuned Themes:** Instant switching between *Cyber Cyan*, *Synthwave Magenta*, *Studio Dark*, and *High-Contrast Light* using Tailwind v4 `@theme inline` CSS variables persisted in `localStorage`.
- **Hardware-First UI & Motion:** Responsive Bento feature grid, animated monthly/annual pricing toggle, spring-physics pill transitions (`layoutId`), and accessible keyboard/ARIA switch states.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 (`@theme inline` design tokens) |
| Animation | Framer Motion |
| Audio DSP | Native Web Audio API (`AudioContext`, `BiquadFilterNode`, `WaveShaperNode`) |
| Icons | Lucide React |
| Deployment | Vercel (CI/CD via GitHub) |

---

## Local Development

```bash
git clone [https://github.com/Nannidan/neonsynth-playground.git](https://github.com/Nannidan/neonsynth-playground.git)
cd neonsynth-playground
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```
