/**
 * Native STT — Browser SpeechRecognition Wrapper
 * ════════════════════════════════════════════════
 *
 * Fallback STT engine using the browser's built-in SpeechRecognition API
 * (Web Speech API). Used when Whisper ONNX model fails to load (e.g.,
 * network restrictions blocking HuggingFace CDN).
 *
 * This provides immediate, zero-download speech-to-text that works
 * in all modern Chromium browsers without any model files.
 *
 * @module uns/core/hologram/native-stt
 */

export interface NativeSttResult {
  text: string;
  confidence: number;
  engine: "native-speech-recognition";
  isFinal: boolean;
}

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

/**
 * Run native SpeechRecognition on an active microphone.
 * Returns a promise that resolves with the transcript once speech ends.
 *
 * @param options.timeoutMs  Max time to listen (default 10000ms)
 * @param options.lang       Language code (default "en-US")
 * @param options.onInterim  Called with interim results for live feedback
 */
export function recognizeNative(options: {
  timeoutMs?: number;
  lang?: string;
  onInterim?: (text: string) => void;
} = {}): Promise<NativeSttResult> {
  const { timeoutMs = 10000, lang = "en-US", onInterim } = options;

  return new Promise((resolve, reject) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      reject(new Error("SpeechRecognition API not available in this browser"));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = !!onInterim;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        recognition.stop();
        reject(new Error("Native STT timed out"));
      }
    }, timeoutMs);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let bestConfidence = 0;

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (result.isFinal) {
          finalText += alt.transcript;
          bestConfidence = Math.max(bestConfidence, alt.confidence);
        } else {
          onInterim?.(alt.transcript);
        }
      }

      if (finalText && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          text: finalText.trim(),
          confidence: bestConfidence,
          engine: "native-speech-recognition",
          isFinal: true,
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`Native STT error: ${event.error}`));
      }
    };

    recognition.onend = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error("Native STT ended without result"));
      }
    };

    try {
      recognition.start();
    } catch (err) {
      settled = true;
      clearTimeout(timeout);
      reject(err);
    }
  });
}
