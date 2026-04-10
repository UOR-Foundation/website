/**
 * HologramSttEngine. Unified Speech-to-Text for Hologram
 * ════════════════════════════════════════════════════════
 *
 * Three-tier STT strategy:
 *
 *   1. **ElevenLabs Scribe** (cloud, best quality)
 *      - Ultra-low latency streaming via WebSocket
 *      - 99+ languages, VAD built-in
 *      - Requires ELEVENLABS_API_KEY configured server-side
 *
 *   2. **Whisper ONNX** (local, fully sovereign)
 *      - On-device inference, audio never leaves the browser
 *      - Requires ~40MB model download (cached after first load)
 *
 *   3. **Native SpeechRecognition** (browser fallback)
 *      - Instant, zero download, all Chromium browsers
 *      - Audio processed by browser vendor cloud
 *
 * @module uns/core/hologram/stt-engine
 */

import { getWhisperEngine } from "./whisper-engine";

// ── Types ───────────────────────────────────────────────────────────────────

export type SttStrategy = "elevenlabs" | "whisper" | "native";

export type SttPrivacyLevel = "local" | "cloud";

export interface SttResult {
  text: string;
  confidence: number;
  strategy: SttStrategy;
  privacy: SttPrivacyLevel;
  inferenceTimeMs: number;
  inputCid?: string;
  outputCid?: string;
}

export interface SttEngineInfo {
  activeStrategy: SttStrategy;
  privacy: SttPrivacyLevel;
  whisperAvailable: boolean;
  nativeAvailable: boolean;
  elevenLabsAvailable: boolean;
  whisperModelId: string;
  privacyWarning: string | null;
}

// ── Native SpeechRecognition helpers ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => any;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

// ── ElevenLabs availability ─────────────────────────────────────────────────

let _elevenLabsAvail: boolean | null = null;

async function checkElevenLabsAvail(): Promise<boolean> {
  if (_elevenLabsAvail !== null) return _elevenLabsAvail;
  try {
    const { isElevenLabsScribeAvailable } = await import("./elevenlabs-stt");
    _elevenLabsAvail = await isElevenLabsScribeAvailable();
  } catch {
    _elevenLabsAvail = false;
  }
  return _elevenLabsAvail;
}

// Kick off availability check immediately
checkElevenLabsAvail();

// ── HologramSttEngine ──────────────────────────────────────────────────────

export class HologramSttEngine {
  private _activeStrategy: SttStrategy = "native";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _recognition: any = null;
  private _transcriptAcc = "";

  // ── Info ─────────────────────────────────────────────────────────────

  get activeStrategy(): SttStrategy { return this._activeStrategy; }

  get privacy(): SttPrivacyLevel {
    if (this._activeStrategy === "whisper") return "local";
    return "cloud";
  }

  get privacyWarning(): string | null {
    if (this._activeStrategy === "native") {
      return "Audio is processed by your browser's cloud speech service. For full privacy, load the Whisper model.";
    }
    if (this._activeStrategy === "elevenlabs") {
      return "Audio is processed by ElevenLabs cloud for best quality. For full privacy, load the Whisper model.";
    }
    return null;
  }

  get whisperAvailable(): boolean {
    return getWhisperEngine().isReady;
  }

  get nativeAvailable(): boolean {
    return !!getSpeechRecognitionCtor();
  }

  get elevenLabsAvailable(): boolean {
    return _elevenLabsAvail === true;
  }

  info(): SttEngineInfo {
    return {
      activeStrategy: this._activeStrategy,
      privacy: this.privacy,
      whisperAvailable: this.whisperAvailable,
      nativeAvailable: this.nativeAvailable,
      elevenLabsAvailable: this.elevenLabsAvailable,
      whisperModelId: getWhisperEngine().modelId,
      privacyWarning: this.privacyWarning,
    };
  }

  // ── Strategy selection ──────────────────────────────────────────────

  /**
   * Auto-select best strategy. Priority:
   *   1. Whisper ONNX (if loaded — maximum privacy)
   *   2. ElevenLabs Scribe (if available — best quality)
   *   3. Native SpeechRecognition (fallback)
   */
  autoSelect(): SttStrategy {
    if (this.whisperAvailable) {
      this._activeStrategy = "whisper";
    } else if (this.elevenLabsAvailable) {
      this._activeStrategy = "elevenlabs";
    } else if (this.nativeAvailable) {
      this._activeStrategy = "native";
    }
    console.log(`[HologramSTT] Strategy: ${this._activeStrategy} (privacy: ${this.privacy})`);
    return this._activeStrategy;
  }

  forceStrategy(strategy: SttStrategy): void {
    this._activeStrategy = strategy;
  }

  // ── Continuous recognition (native) ────────────────────────────────

  startContinuousNative(options: {
    lang?: string;
    onInterim?: (text: string) => void;
    onFinal?: (text: string) => void;
    onError?: (error: string) => void;
    onEnd?: (finalTranscript: string) => void;
  } = {}): { stop: () => void; abort: () => void; getTranscript: () => string } {
    const { lang = "en-US", onInterim, onFinal, onError, onEnd } = options;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.("SpeechRecognition not available");
      return { stop: () => {}, abort: () => {}, getTranscript: () => "" };
    }

    this._transcriptAcc = "";
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      this._transcriptAcc = finalText;
      if (interimText) onInterim?.((finalText + " " + interimText).trim());
      if (finalText) onFinal?.(finalText.trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      onError?.(event.error);
    };

    recognition.onend = () => {
      onEnd?.(this._transcriptAcc.trim());
    };

    this._recognition = recognition;
    recognition.start();

    return {
      stop: () => { try { recognition.stop(); } catch {} },
      abort: () => { try { recognition.abort(); } catch {} },
      getTranscript: () => this._transcriptAcc.trim(),
    };
  }

  // ── One-shot recognition (native) ──────────────────────────────────

  async recognizeOneShotNative(options: {
    timeoutMs?: number;
    lang?: string;
  } = {}): Promise<SttResult> {
    const { timeoutMs = 8000, lang = "en-US" } = options;
    const start = performance.now();

    return new Promise((resolve, reject) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return reject(new Error("SpeechRecognition not available"));

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) { settled = true; recognition.stop(); reject(new Error("STT timeout")); }
      }, timeoutMs);

      recognition.onresult = (event: any) => {
        let text = "";
        let confidence = 0;
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            text += event.results[i][0].transcript;
            confidence = Math.max(confidence, event.results[i][0].confidence);
          }
        }
        if (text && !settled) {
          settled = true;
          clearTimeout(timeout);
          resolve({
            text: text.trim(),
            confidence,
            strategy: "native",
            privacy: "cloud",
            inferenceTimeMs: Math.round(performance.now() - start),
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error(event.error)); }
      };

      recognition.onend = () => {
        if (!settled) { settled = true; clearTimeout(timeout); reject(new Error("No speech detected")); }
      };

      try { recognition.start(); } catch (err) { settled = true; clearTimeout(timeout); reject(err); }
    });
  }

  // ── Whisper transcription ──────────────────────────────────────────

  async transcribeWhisper(
    audio: Float32Array,
    sampleRate: number,
  ): Promise<SttResult> {
    const engine = getWhisperEngine();
    if (!engine.isReady) {
      throw new Error("Whisper ONNX not loaded. Use native STT or load the model first.");
    }

    const result = await engine.transcribe(audio, sampleRate);
    return {
      text: result.text,
      confidence: 1.0,
      strategy: "whisper",
      privacy: "local",
      inferenceTimeMs: result.inferenceTimeMs,
      inputCid: result.inputCid,
      outputCid: result.outputCid,
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────────

  abort(): void {
    try { this._recognition?.abort(); } catch {}
    this._recognition = null;
    this._transcriptAcc = "";
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _instance: HologramSttEngine | null = null;

export function getHologramStt(): HologramSttEngine {
  if (!_instance) {
    _instance = new HologramSttEngine();
    _instance.autoSelect();
  }
  return _instance;
}

/**
 * Quick check: is ANY STT engine available?
 */
export function isSttAvailable(): boolean {
  const stt = getHologramStt();
  return stt.elevenLabsAvailable || stt.whisperAvailable || stt.nativeAvailable;
}
