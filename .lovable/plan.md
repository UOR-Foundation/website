

# Voice-to-Text Overhaul: Wispr Flow-Inspired Sovereign Dictation

## Current State Assessment

After thorough evaluation, the existing voice system has **significant functionality gaps**:

### What Exists
1. **HologramSttEngine** — dual-strategy abstraction (Whisper ONNX local / native `SpeechRecognition` cloud)
2. **VoiceInput** — small mic button embedded in search bars
3. **VoiceOverlay** — full-screen dictation overlay with pulsing orb
4. **AudioCaptureWorklet** — exists in `/public` but is **never imported or used** by any component
5. **ElevenLabs connector** — API key is configured but only used for TTS, **not STT**

### Critical Problems

| Issue | Severity |
|-------|----------|
| **VoiceInput always calls `startContinuousNative` even when Whisper is selected** — the `autoSelect()` runs but the actual transcription path ignores it. Whisper path is never used in practice. | Critical |
| **VoiceOverlay simulates audio levels with `Math.random()`** (line 82-84) instead of using the real AudioCaptureWorklet | Embarrassing |
| **Voice only works in Oracle search** — not available in notes, code editor, vault, or any other text input across the OS | Major gap |
| **No AI text cleanup** — raw transcript dumps directly into input; no filler removal, no punctuation correction, no tone adaptation (the core Wispr Flow feature) | Major gap |
| **No ElevenLabs Scribe integration** — we have the API key for ElevenLabs which offers `scribe_v2_realtime` (ultra-low-latency streaming STT) but it's completely unused for transcription | Missed opportunity |
| **No global hotkey activation** — Ring+V opens the overlay, but only on ResolvePage. Not system-wide. | UX gap |
| **No dictation-into-focused-input mode** — Wispr Flow's killer feature is dictating directly into whatever text field you're in, not just a search bar | Missing |

## What Wispr Flow Gets Right (Our Design Targets)

1. **Activate anywhere** — single hotkey, works in any text field on the OS
2. **AI auto-edits** — raw speech is cleaned up by an LLM: filler words removed, punctuation added, tone matched to context
3. **Streaming interim display** — see words appear as you speak, with a subtle waveform
4. **Personal dictionary** — learns your names, jargon, acronyms
5. **Context-aware tone** — adapts output style to where you're typing (email vs code comment vs chat)
6. **Delightful UX** — minimal floating indicator, not a full-screen takeover for quick dictation

## Implementation Plan

### 1. Add ElevenLabs Scribe Realtime STT as Primary Engine

Replace browser `SpeechRecognition` as the default cloud tier with ElevenLabs `scribe_v2_realtime`. This gives us:
- Ultra-low latency streaming via WebSocket
- 99+ languages with auto-detection
- Far superior accuracy vs browser native STT
- VAD (voice activity detection) built-in

**New files:**
- `src/modules/uns/core/hologram/elevenlabs-stt.ts` — WebSocket client for `scribe_v2_realtime` with token management
- `supabase/functions/elevenlabs-scribe-token/index.ts` — Edge function to mint single-use tokens (keeps API key server-side)

**Modify:**
- `src/modules/uns/core/hologram/stt-engine.ts` — Add `"elevenlabs"` as third strategy tier: ElevenLabs (best quality) > Whisper ONNX (local/private) > Native (fallback)

### 2. AI Text Cleanup Pipeline (The Wispr Flow Core)

After transcription, pass raw text through an AI model for cleanup: remove filler words, fix punctuation, adapt tone to context.

**New file:**
- `src/modules/oracle/lib/voice-cleanup.ts` — Calls Lovable AI (gemini-2.5-flash) with a prompt like: "Clean up this dictated text. Remove filler words (um, uh, like, you know). Fix punctuation and grammar. Preserve meaning. Context: {appContext}. Output ONLY the cleaned text."

**How context-awareness works:** The cleanup prompt receives the active app ID (e.g., "notes", "code-editor", "chat") to adapt tone. Code context gets technical formatting; notes get natural prose; chat gets casual tone.

### 3. Global Dictation Mode (Wispr Flow-style "Dictate Anywhere")

Instead of only working in the Oracle search bar, voice dictation should work in **any focused text input** across the OS.

**New files:**
- `src/modules/oracle/components/FloatingDictationPill.tsx` — Small floating pill that appears near the cursor/focused input when dictation is active. Shows waveform + interim text. Not a full-screen overlay.
- `src/modules/oracle/hooks/useGlobalDictation.ts` — Hook that: detects the currently focused input element, captures audio via the existing AudioCaptureWorklet, streams to ElevenLabs Scribe, runs AI cleanup on the final result, and injects the cleaned text into the focused input

**Modify:**
- `src/modules/desktop/DesktopShell.tsx` — Mount the global dictation provider at the shell level so it works everywhere
- `src/modules/desktop/hooks/useDesktopShortcuts.ts` — Ring+V triggers global dictation (already wired, just needs to call the new global hook instead of the overlay-only one)
- `src/modules/oracle/hooks/useVoiceShortcut.ts` — Extend to support both overlay mode (for search) and inline dictation mode (for any input)

### 4. Real Audio Level Visualization

Replace the `Math.random()` fake levels with real audio data from `AudioCaptureWorklet`.

**Modify:**
- `src/modules/oracle/components/VoiceOverlay.tsx` — Connect to real AudioWorklet for waveform data, fix the fake level simulation
- `src/modules/oracle/components/FloatingDictationPill.tsx` — Use real audio levels for a mini waveform visualization

### 5. Fix the Whisper ONNX Integration

The VoiceInput component currently ignores the Whisper strategy even after selecting it. Fix the actual dispatch.

**Modify:**
- `src/modules/oracle/components/VoiceInput.tsx` — When strategy is `"whisper"`, capture audio via AudioWorklet, collect PCM samples, and call `stt.transcribeWhisper()` instead of always using `startContinuousNative()`

### 6. STT Strategy Tier Update

**Updated strategy priority:**

```text
1. ElevenLabs Scribe (best quality, streaming, 99+ languages)
2. Whisper ONNX (on-device, private, requires 40MB model download)
3. Native SpeechRecognition (zero-setup fallback)
```

User can override via a privacy preference: if they want fully sovereign/local, force Whisper. Otherwise ElevenLabs is default.

## Files Summary

| File | Action |
|------|--------|
| `src/modules/uns/core/hologram/elevenlabs-stt.ts` | Create — ElevenLabs Scribe WebSocket client |
| `supabase/functions/elevenlabs-scribe-token/index.ts` | Create — Token minting edge function |
| `src/modules/oracle/lib/voice-cleanup.ts` | Create — AI text cleanup pipeline |
| `src/modules/oracle/components/FloatingDictationPill.tsx` | Create — Wispr Flow-style floating dictation UI |
| `src/modules/oracle/hooks/useGlobalDictation.ts` | Create — System-wide dictation hook |
| `src/modules/uns/core/hologram/stt-engine.ts` | Modify — Add ElevenLabs as primary strategy |
| `src/modules/oracle/components/VoiceOverlay.tsx` | Modify — Real audio levels, connect to new engine |
| `src/modules/oracle/components/VoiceInput.tsx` | Modify — Fix Whisper path, connect ElevenLabs |
| `src/modules/desktop/DesktopShell.tsx` | Modify — Mount global dictation provider |
| `src/modules/desktop/hooks/useDesktopShortcuts.ts` | Modify — Wire Ring+V to global dictation |
| `src/modules/oracle/hooks/useVoiceShortcut.ts` | Modify — Support inline + overlay modes |

## What This Achieves

- **Actually functional** STT that uses the best available engine (ElevenLabs Scribe) instead of broken browser native API
- **Wispr Flow-quality UX** — dictate into any text field, see words stream in, get AI-cleaned output
- **Three-tier privacy** — choose between cloud quality, on-device privacy, or zero-setup fallback
- **Real audio visualization** instead of fake random noise
- **System-wide availability** — voice input everywhere in the OS, not just Oracle search

