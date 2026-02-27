/**
 * Piper TTS — Sovereign client-side text-to-speech
 * ═══════════════════════════════════════════════════
 *
 * @module hologram/piper-tts
 */

export {
  PiperTtsEngine,
  getPiperTtsEngine,
  PIPER_VOICES,
  DEFAULT_VOICE_ID,
} from "./engine";

export type {
  PiperVoice,
  PiperStatus,
  PiperDownloadProgress,
  PiperEngineState,
} from "./engine";
