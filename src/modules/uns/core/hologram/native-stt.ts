/**
 * Native STT — Browser SpeechRecognition Utilities
 * ═════════════════════════════════════════════════
 *
 * Low-level utilities for the browser's Web Speech API.
 * Used by HologramSttEngine as the "cloud" privacy tier.
 *
 * ⚠️ PRIVACY NOTE: Audio is processed by the browser vendor's cloud
 * service (e.g., Google for Chrome). For fully sovereign STT,
 * use Whisper ONNX via HologramSttEngine.
 *
 * @module uns/core/hologram/native-stt
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => any;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isNativeSttAvailable(): boolean {
  return !!getSpeechRecognitionCtor();
}

export interface NativeSttResult {
  text: string;
  confidence: number;
  engine: "native-speech-recognition";
  isFinal: boolean;
}

/**
 * One-shot native SpeechRecognition. Resolves with transcript.
 * ⚠️ Audio leaves the device for cloud processing.
 */
export function recognizeNative(options: {
  timeoutMs?: number;
  lang?: string;
  onInterim?: (text: string) => void;
} = {}): Promise<NativeSttResult> {
  const { timeoutMs = 10000, lang = "en-US", onInterim } = options;

  return new Promise((resolve, reject) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return reject(new Error("SpeechRecognition not available"));

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = !!onInterim;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; recognition.stop(); reject(new Error("Native STT timed out")); }
    }, timeoutMs);

    recognition.onresult = (event: any) => {
      let finalText = "";
      let bestConfidence = 0;
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          bestConfidence = Math.max(bestConfidence, result[0].confidence);
        } else {
          onInterim?.(result[0].transcript);
        }
      }
      if (finalText && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ text: finalText.trim(), confidence: bestConfidence, engine: "native-speech-recognition", isFinal: true });
      }
    };

    recognition.onerror = (event: any) => {
      if (!settled) { settled = true; clearTimeout(timeout); reject(new Error(`Native STT: ${event.error}`)); }
    };

    recognition.onend = () => {
      if (!settled) { settled = true; clearTimeout(timeout); reject(new Error("No speech detected")); }
    };

    try { recognition.start(); } catch (err) { settled = true; clearTimeout(timeout); reject(err); }
  });
}
