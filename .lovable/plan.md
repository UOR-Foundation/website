

## High-Quality Voice Input with Keyboard Shortcut

### Current State

The project already has a sophisticated dual-engine STT system (`HologramSttEngine`) that auto-selects between:
- **Whisper ONNX** (local, GPU-accelerated, ~40MB cached model, audio never leaves device)
- **Native SpeechRecognition** (browser cloud, instant, no download)

However, the `VoiceInput` component used in the search bar bypasses this entirely — it directly uses the raw Web Speech API with no quality controls, no privacy awareness, and no keyboard shortcut.

### Plan

#### 1. Upgrade VoiceInput to Use HologramSttEngine
**File: `src/modules/oracle/components/VoiceInput.tsx`**

Replace the raw `SpeechRecognition` usage with `getHologramStt()`:
- Uses Whisper ONNX when available (highest quality, fully local)
- Falls back to native SpeechRecognition with interim results
- Shows a tiny privacy indicator: a green dot (local) or amber dot (cloud) so the user knows where audio goes
- Continuous mode with interim transcription display

#### 2. Global Keyboard Shortcut
**File: `src/modules/oracle/hooks/useVoiceShortcut.ts` (new)**

Register a global keyboard shortcut to activate voice input from anywhere:
- **`Ctrl+Shift+V`** (or **`Cmd+Shift+V`** on Mac) — toggle voice listening
- When activated: focuses the search bar if not focused, starts listening, shows a subtle full-screen overlay with a pulsing mic icon and live transcript
- When speech ends: auto-submits the query
- **`Escape`** cancels listening
- The shortcut works from any page state (reading an article, browsing, idle)

#### 3. Voice Overlay — Immersive Dictation UI
**File: `src/modules/oracle/components/VoiceOverlay.tsx` (new)**

A full-screen translucent overlay that appears during voice input (triggered by shortcut):
- Centered pulsing microphone orb with audio level visualization (using the existing `AudioCaptureProcessor` worklet for RMS levels)
- Live transcript appears below the orb, interim text in lighter opacity, final text in full
- Privacy badge: "On-device" (green) or "Cloud" (amber) — transparent about where audio goes
- Subtle waveform or breathing animation responding to audio levels
- Auto-dismisses after speech ends and submits the query
- Tap anywhere outside or press Escape to cancel

#### 4. Wire Into ResolvePage
**File: `src/modules/oracle/pages/ResolvePage.tsx`**

- Import and use the `useVoiceShortcut` hook
- Render `VoiceOverlay` when the shortcut is active
- Connect overlay output to the existing `handleVoiceTranscript` → `handleSearch` flow
- Show a tiny keyboard shortcut hint on the mic button tooltip: "Voice search (Ctrl+Shift+V)"

#### 5. Whisper Model Auto-Load Prompt
**File: `VoiceOverlay.tsx`**

If Whisper ONNX is not yet cached and native STT is being used:
- Show a small non-intrusive banner at the bottom of the overlay: "Using cloud speech. Download Whisper model (40MB) for private on-device recognition?"
- One tap to trigger `compileWhisperModel()` with a progress bar
- Once cached, all future sessions use local Whisper automatically

### Files Changed

| File | Change |
|------|--------|
| `VoiceInput.tsx` | Rewrite to use `HologramSttEngine`, add privacy dot indicator |
| `useVoiceShortcut.ts` | **New** — Global `Ctrl+Shift+V` keyboard shortcut hook |
| `VoiceOverlay.tsx` | **New** — Full-screen immersive voice dictation overlay with live transcript and audio visualization |
| `ResolvePage.tsx` | Wire up shortcut hook + overlay |

### Quality Assessment

The Whisper ONNX engine already built into this project is the highest-quality in-browser STT available — it runs the same Whisper model used by OpenAI, compiled to WGSL compute shaders for GPU acceleration. With the native SpeechRecognition fallback, every browser is covered. The keyboard shortcut makes activation instant and hands-free.

