/**
 * Piper TTS Engine — Sovereign client-side text-to-speech
 * ═══════════════════════════════════════════════════════════
 *
 * Runs Piper VITS models locally in the browser via ONNX Runtime Web.
 * Models are cached in OPFS (Origin Private File System) after first download.
 *
 * Architecture mirrors the Whisper compiler:
 *   - Model download + OPFS caching
 *   - ONNX inference via WASM
 *   - espeak-ng WASM for phonemization
 *   - WAV blob output → HTMLAudioElement playback
 *
 * @module hologram/piper-tts/engine
 */

import * as tts from "@diffusionstudio/vits-web";
import type { VoiceId } from "@diffusionstudio/vits-web";

// ── Voice catalog ───────────────────────────────────────────────────────────

export interface PiperVoice {
  id: string;
  label: string;
  language: string;
  quality: "low" | "medium" | "high";
  /** Approximate model size in MB */
  sizeMb: number;
  description: string;
}

/**
 * Curated high-quality English voices.
 * Full catalog: https://huggingface.co/rhasspy/piper-voices
 */
export const PIPER_VOICES: PiperVoice[] = [
  {
    id: "en_US-hfc_female-medium",
    label: "Clara (Female)",
    language: "en-US",
    quality: "medium",
    sizeMb: 75,
    description: "Warm, clear female voice — best balance of quality and speed",
  },
  {
    id: "en_US-hfc_male-medium",
    label: "Marcus (Male)",
    language: "en-US",
    quality: "medium",
    sizeMb: 75,
    description: "Natural male voice — conversational and articulate",
  },
  {
    id: "en_US-lessac-high",
    label: "Lessac (High Quality)",
    language: "en-US",
    quality: "high",
    sizeMb: 75,
    description: "Studio-quality voice — highest fidelity, slightly larger model",
  },
  {
    id: "en_US-lessac-medium",
    label: "Lessac (Medium)",
    language: "en-US",
    quality: "medium",
    sizeMb: 25,
    description: "Good quality with smaller footprint",
  },
  {
    id: "en_GB-alan-medium",
    label: "Alan (British Male)",
    language: "en-GB",
    quality: "medium",
    sizeMb: 25,
    description: "British English male — clear and measured",
  },
  {
    id: "en_US-amy-medium",
    label: "Amy (Female)",
    language: "en-US",
    quality: "medium",
    sizeMb: 25,
    description: "Friendly female voice — natural cadence",
  },
];

export const DEFAULT_VOICE_ID: VoiceId = "en_US-lessac-high";

// ── Engine state ────────────────────────────────────────────────────────────

export type PiperStatus =
  | "unloaded"
  | "downloading"
  | "ready"
  | "synthesizing"
  | "error";

export interface PiperDownloadProgress {
  url: string;
  loaded: number;
  total: number;
  percent: number;
}

export interface PiperEngineState {
  status: PiperStatus;
  activeVoiceId: string | null;
  downloadProgress: PiperDownloadProgress | null;
  error: string | null;
  cachedVoices: string[];
}

// ── Engine class ────────────────────────────────────────────────────────────

export class PiperTtsEngine {
  private _status: PiperStatus = "unloaded";
  private _activeVoiceId: VoiceId | null = null;
  private _downloadProgress: PiperDownloadProgress | null = null;
  private _error: string | null = null;
  private _cachedVoices: string[] = [];
  private _listeners = new Set<() => void>();

  // ── Public getters ──────────────────────────────────────────────────

  get status(): PiperStatus { return this._status; }
  get activeVoiceId(): VoiceId | null { return this._activeVoiceId; }
  get downloadProgress(): PiperDownloadProgress | null { return this._downloadProgress; }
  get error(): string | null { return this._error; }
  get cachedVoices(): string[] { return this._cachedVoices; }
  get isReady(): boolean { return this._status === "ready"; }

  get state(): PiperEngineState {
    return {
      status: this._status,
      activeVoiceId: this._activeVoiceId,
      downloadProgress: this._downloadProgress,
      error: this._error,
      cachedVoices: this._cachedVoices,
    };
  }

  // ── Subscription ────────────────────────────────────────────────────

  subscribe(fn: () => void): () => void {
    this._listeners.add(fn);
    return () => { this._listeners.delete(fn); };
  }

  private _notify(): void {
    this._listeners.forEach(fn => fn());
  }

  // ── Core operations ─────────────────────────────────────────────────

  /**
   * Download and cache a voice model.
   * Idempotent — skips if already cached.
   */
  async loadVoice(voiceId: VoiceId = DEFAULT_VOICE_ID): Promise<void> {
    try {
      // Check if already cached
      const stored = await tts.stored();
      this._cachedVoices = stored;

      if (stored.includes(voiceId)) {
        this._activeVoiceId = voiceId;
        this._status = "ready";
        this._error = null;
        this._notify();
        return;
      }

      this._status = "downloading";
      this._downloadProgress = { url: "", loaded: 0, total: 0, percent: 0 };
      this._notify();

      await tts.download(voiceId, (progress) => {
        this._downloadProgress = {
          url: progress.url ?? "",
          loaded: progress.loaded ?? 0,
          total: progress.total ?? 0,
          percent: progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0,
        };
        this._notify();
      });

      this._activeVoiceId = voiceId;
      this._status = "ready";
      this._downloadProgress = null;
      this._error = null;
      this._cachedVoices = await tts.stored();
      this._notify();
    } catch (err) {
      this._status = "error";
      this._error = err instanceof Error ? err.message : "Failed to load Piper voice model";
      this._downloadProgress = null;
      this._notify();
      throw err;
    }
  }

  /**
   * Synthesize text to a playable WAV Blob.
   */
  async synthesize(text: string, voiceId?: VoiceId): Promise<Blob> {
    const vid: VoiceId = (voiceId ?? this._activeVoiceId ?? DEFAULT_VOICE_ID) as VoiceId;

    if (this._status !== "ready" || this._activeVoiceId !== vid) {
      await this.loadVoice(vid);
    }

    this._status = "synthesizing";
    this._notify();

    try {
      const wav = await tts.predict({ text, voiceId: vid });
      this._status = "ready";
      this._notify();
      return wav;
    } catch (err) {
      this._status = "error";
      this._error = err instanceof Error ? err.message : "Synthesis failed";
      this._notify();
      throw err;
    }
  }

  /**
   * Synthesize and immediately play.
   * Returns a Promise that resolves when playback ends.
   */
  async speak(text: string, voiceId?: VoiceId): Promise<void> {
    const wav = await this.synthesize(text, voiceId);
    const url = URL.createObjectURL(wav);

    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Audio playback failed"));
      };
      audio.play().catch(reject);
    });
  }

  /**
   * List cached voice models.
   */
  async refreshCachedVoices(): Promise<string[]> {
    this._cachedVoices = await tts.stored();
    this._notify();
    return this._cachedVoices;
  }

  /**
   * Remove a cached voice from OPFS.
   */
  async removeVoice(voiceId: VoiceId): Promise<void> {
    await tts.remove(voiceId);
    this._cachedVoices = await tts.stored();
    if (this._activeVoiceId === voiceId) {
      this._activeVoiceId = null;
      this._status = "unloaded";
    }
    this._notify();
  }

  /**
   * Remove all cached voices.
   */
  async removeAllVoices(): Promise<void> {
    await tts.flush();
    this._cachedVoices = [];
    this._activeVoiceId = null;
    this._status = "unloaded";
    this._notify();
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _instance: PiperTtsEngine | null = null;

export function getPiperTtsEngine(): PiperTtsEngine {
  if (!_instance) _instance = new PiperTtsEngine();
  return _instance;
}
