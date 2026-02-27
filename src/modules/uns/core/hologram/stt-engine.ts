/**
 * HologramSttEngine — Unified Speech-to-Text for Hologram
 * ════════════════════════════════════════════════════════
 *
 * Single abstraction over two STT strategies:
 *
 *   1. **Native SpeechRecognition** (browser-native)
 *      - Instant, zero download, works in all Chromium browsers
 *      - ⚠️ Audio leaves the device (processed by browser vendor cloud)
 *      - Privacy level: "cloud" — user should be informed
 *
 *   2. **Whisper ONNX** (self-hosted, vGPU-accelerated)
 *      - True on-device inference, audio never leaves the browser
 *      - Requires ~40MB model (cached permanently after first load)
 *      - Privacy level: "local" — fully sovereign
 *
 * The engine selects the best available strategy automatically:
 *   - If Whisper ONNX is cached → use it (maximum privacy)
 *   - Otherwise → use native STT with privacy indicator
 *
 * @module uns/core/hologram/stt-engine
 */

import { getWhisperEngine } from "./whisper-engine";

// ── Types ───────────────────────────────────────────────────────────────────

export type SttStrategy = "whisper" | "native";

export type SttPrivacyLevel = "local" | "cloud";

export interface SttResult {
  text: string;
  confidence: number;
  strategy: SttStrategy;
  privacy: SttPrivacyLevel;
  inferenceTimeMs: number;
  /** Content-addressed proof (Whisper only) */
  inputCid?: string;
  outputCid?: string;
}

export interface SttEngineInfo {
  activeStrategy: SttStrategy;
  privacy: SttPrivacyLevel;
  whisperAvailable: boolean;
  nativeAvailable: boolean;
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

// ── HologramSttEngine ──────────────────────────────────────────────────────

export class HologramSttEngine {
  private _activeStrategy: SttStrategy = "native";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _recognition: any = null;
  private _transcriptAcc = "";

  // ── Info ─────────────────────────────────────────────────────────────

  get activeStrategy(): SttStrategy { return this._activeStrategy; }

  get privacy(): SttPrivacyLevel {
    return this._activeStrategy === "whisper" ? "local" : "cloud";
  }

  get privacyWarning(): string | null {
    if (this._activeStrategy === "native") {
      return "Audio is processed by your browser's cloud speech service. For full privacy, load the Whisper model.";
    }
    return null;
  }

  get whisperAvailable(): boolean {
    return getWhisperEngine().isReady;
  }

  get nativeAvailable(): boolean {
    return !!getSpeechRecognitionCtor();
  }

  info(): SttEngineInfo {
    return {
      activeStrategy: this._activeStrategy,
      privacy: this.privacy,
      whisperAvailable: this.whisperAvailable,
      nativeAvailable: this.nativeAvailable,
      whisperModelId: getWhisperEngine().modelId,
      privacyWarning: this.privacyWarning,
    };
  }

  // ── Strategy selection ──────────────────────────────────────────────

  /**
   * Auto-select the best strategy based on availability.
   * Prioritizes Whisper (local privacy) over native (cloud).
   */
  autoSelect(): SttStrategy {
    if (this.whisperAvailable) {
      this._activeStrategy = "whisper";
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

  /**
   * Start continuous native SpeechRecognition.
   * Audio is sent to browser vendor's cloud for processing.
   *
   * @returns A handle to get accumulated transcript and stop
   */
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

  /**
   * Run a single utterance recognition via native SpeechRecognition.
   */
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

  /**
   * Transcribe audio via self-hosted Whisper ONNX on the vGPU.
   * Audio never leaves the device — full sovereignty.
   */
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
  return stt.whisperAvailable || stt.nativeAvailable;
}
