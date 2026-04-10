/**
 * Hologram TTS Client — Unified text-to-speech engine.
 * ═══════════════════════════════════════════════════════
 *
 * Speaks text aloud using ElevenLabs (high quality) with
 * Web Speech API as fallback. Singleton pattern.
 *
 * @module uns/core/hologram/tts-client
 */

export interface TTSOptions {
  voiceId?: string;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export interface TTSClient {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
  readonly isSpeaking: boolean;
  readonly engine: "elevenlabs" | "native" | "none";
}

// ── ElevenLabs availability ────────────────────────────────────────────

let _elevenLabsTTSAvailable: boolean | null = null;

async function checkElevenLabsTTS(): Promise<boolean> {
  if (_elevenLabsTTSAvailable !== null) return _elevenLabsTTSAvailable;
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: "test" }),
    });
    // 503 = not configured, 200 = good, anything else = maybe ok
    _elevenLabsTTSAvailable = resp.status !== 503;
  } catch {
    _elevenLabsTTSAvailable = false;
  }
  return _elevenLabsTTSAvailable;
}

// ── Core implementation ────────────────────────────────────────────────

class HologramTTSClient implements TTSClient {
  private _speaking = false;
  private _engine: "elevenlabs" | "native" | "none" = "none";
  private _audio: HTMLAudioElement | null = null;
  private _queue: Array<{ text: string; options?: TTSOptions }> = [];
  private _processing = false;

  get isSpeaking() { return this._speaking; }
  get engine() { return this._engine; }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    if (!text.trim()) return;
    this._queue.push({ text, options });
    if (!this._processing) this._processQueue();
  }

  stop(): void {
    this._queue = [];
    this._speaking = false;
    this._processing = false;

    // Stop ElevenLabs audio
    if (this._audio) {
      this._audio.pause();
      this._audio.src = "";
      this._audio = null;
    }

    // Stop Web Speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  private async _processQueue(): Promise<void> {
    if (this._processing) return;
    this._processing = true;

    while (this._queue.length > 0) {
      const item = this._queue.shift()!;
      await this._speakSingle(item.text, item.options);
    }

    this._processing = false;
  }

  private async _speakSingle(text: string, options?: TTSOptions): Promise<void> {
    this._speaking = true;
    options?.onStart?.();

    const elevenLabsOk = await checkElevenLabsTTS();

    if (elevenLabsOk) {
      try {
        await this._speakElevenLabs(text, options);
        return;
      } catch (err) {
        console.warn("[TTS] ElevenLabs failed, falling back to native:", err);
      }
    }

    // Fallback to Web Speech API
    if (window.speechSynthesis) {
      try {
        await this._speakNative(text, options);
        return;
      } catch (err) {
        console.warn("[TTS] Native speech failed:", err);
        options?.onError?.("Speech synthesis unavailable");
      }
    } else {
      options?.onError?.("No TTS engine available");
    }

    this._speaking = false;
    this._engine = "none";
    options?.onEnd?.();
  }

  private async _speakElevenLabs(text: string, options?: TTSOptions): Promise<void> {
    this._engine = "elevenlabs";
    const voiceId = options?.voiceId ?? "onwK4e9ZLuTAKqWW03F9"; // Daniel

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!resp.ok) {
      throw new Error(`ElevenLabs TTS returned ${resp.status}`);
    }

    const blob = await resp.blob();
    const audioUrl = URL.createObjectURL(blob);

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(audioUrl);
      this._audio = audio;

      if (options?.speed && options.speed !== 1) {
        audio.playbackRate = options.speed;
      }

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this._audio = null;
        this._speaking = false;
        options?.onEnd?.();
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        this._audio = null;
        this._speaking = false;
        reject(new Error("Audio playback failed"));
      };

      audio.play().catch(reject);
    });
  }

  private _speakNative(text: string, options?: TTSOptions): Promise<void> {
    this._engine = "native";

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (options?.speed) utterance.rate = options.speed;

      utterance.onend = () => {
        this._speaking = false;
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        this._speaking = false;
        options?.onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

// ── Singleton ──────────────────────────────────────────────────────────

let _instance: HologramTTSClient | null = null;

export function getHologramTts(): TTSClient {
  if (!_instance) _instance = new HologramTTSClient();
  return _instance;
}
