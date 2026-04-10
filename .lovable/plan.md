

# Global Voice Shortcut + Voice-to-Voice Interaction

## What Exists Today

The system already has excellent infrastructure:
- **Global dictation** (`useGlobalDictation.ts`): ElevenLabs Scribe streaming STT → AI cleanup → inject text at cursor position
- **Ring+V shortcut**: Activates dictation, but requires two-step chord (Ctrl+. then V)
- **ElevenLabs TTS edge function**: Already deployed, produces high-quality speech via `elevenlabs-tts`
- **FloatingDictationPill**: Shows waveform + transcript while dictating

## Part 1: Direct Keyboard Shortcut

Add a **single-press** shortcut that bypasses the Ring system entirely:
- **Windows**: `Ctrl+Shift+V` (toggle dictation on/off)
- **Mac**: `⌘+Shift+V` (toggle dictation on/off)

This mirrors Wispr Flow's UX — one chord, instant activation anywhere.

**Modify: `useDesktopShortcuts.ts`**
- Add a direct shortcut listener (outside the Ring system) for `Ctrl/⌘+Shift+V`
- Calls `handlersRef.current.onVoice?.()` directly
- Ring+V still works as an alternative

## Part 2: Voice-to-Voice — TTS Response Engine

Create a **Hologram TTS engine** that mirrors the STT engine pattern: a unified client-side module that speaks text aloud using ElevenLabs, with Web Speech API as fallback.

### New file: `src/modules/uns/core/hologram/tts-client.ts`

Unified TTS client:
- `speak(text, options?)` → fetches audio from `elevenlabs-tts` edge function, plays via `Audio()` element
- Falls back to `window.speechSynthesis` if ElevenLabs is unavailable
- Supports: voice selection, speed control, interrupt (stop current speech)
- Audio queue: if multiple `speak()` calls, queues them sequentially
- `stop()` → immediately stops playback
- `isSpeaking` → boolean state
- Singleton pattern matching `getHologramStt()`

### New file: `src/modules/oracle/hooks/useVoiceToVoice.ts`

Orchestrates the full voice-to-voice loop:
1. User activates dictation (shortcut or button)
2. STT captures speech → AI cleanup → produces clean text
3. Text is sent to Oracle (the AI assistant) for a response
4. Oracle's response is spoken aloud via TTS client
5. User can interrupt at any time (press shortcut again or Escape)

State machine: `idle → listening → processing → speaking → idle`

### Modify: `src/modules/oracle/components/FloatingDictationPill.tsx`

Extend the pill to show voice-to-voice state:
- During `speaking` phase: show a speaker icon + waveform + "Speaking..." label
- Add a small toggle in the pill: "Reply with voice" on/off (persisted in localStorage)
- When voice reply is on, the pill stays visible during TTS playback

### Modify: `src/modules/desktop/DesktopShell.tsx`

- Wire the voice-to-voice hook alongside existing dictation
- When dictation completes and "voice reply" is enabled, route the transcript through Oracle and speak the response

## Part 3: Oracle Integration for Voice Conversations

### Modify: `src/modules/oracle/lib/oracle-engine.ts` (or equivalent)

Add a lightweight function:
- `askOracleForVoiceReply(transcript: string): Promise<string>`
- Sends the transcript to the AI with a system prompt optimized for spoken responses (concise, natural, conversational)
- Returns the text response (which then gets spoken by TTS)

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `useDesktopShortcuts.ts` | Modify | Add direct Ctrl/⌘+Shift+V shortcut |
| `uns/core/hologram/tts-client.ts` | Create | Unified TTS engine (ElevenLabs + Web Speech fallback) |
| `oracle/hooks/useVoiceToVoice.ts` | Create | Voice-to-voice state machine |
| `FloatingDictationPill.tsx` | Modify | Show speaking state + voice reply toggle |
| `DesktopShell.tsx` | Modify | Wire voice-to-voice into desktop |

No database migrations needed. The existing `elevenlabs-tts` edge function already handles TTS — we just need the client-side orchestration.

