/**
 * useWhisperRecorder — Records audio and transcribes via Whisper vGPU
 * ═══════════════════════════════════════════════════════════════════
 *
 * Records raw PCM audio via AudioContext (not MediaRecorder) for
 * maximum compatibility and direct Float32Array output that Whisper
 * expects. Handles mic permissions, audio level metering, and
 * resampling automatically.
 *
 * Flow:
 *   startRecording() → user speaks → stopAndTranscribe() → transcript
 *
 * @module hologram-ui/hooks/useWhisperRecorder
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getWhisperEngine, type WhisperTranscription, type WhisperLoadProgress } from "@/modules/uns/core/hologram/whisper-engine";

export type WhisperRecorderStatus =
  | "idle"
  | "loading-model"
  | "recording"
  | "transcribing"
  | "error";

interface UseWhisperRecorderOptions {
  onTranscript?: (result: WhisperTranscription) => void;
  onError?: (error: string) => void;
  onLoadProgress?: (progress: WhisperLoadProgress) => void;
}

export function useWhisperRecorder({
  onTranscript,
  onError,
  onLoadProgress,
}: UseWhisperRecorderOptions = {}) {
  const [status, setStatus] = useState<WhisperRecorderStatus>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [modelProgress, setModelProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Recording state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    processorRef.current?.disconnect();
    processorRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current?.state !== "closed") {
      void audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;

    setAudioLevel(0);
  }, []);

  /**
   * Ensure the Whisper model is loaded (cached after first time).
   * Returns true if ready, false if failed.
   */
  const ensureModel = useCallback(async (): Promise<boolean> => {
    const engine = getWhisperEngine();
    if (engine.isReady) return true;

    setStatus("loading-model");
    try {
      await engine.load((p) => {
        const pct = p.progress ?? 0;
        setModelProgress(Math.round(pct));
        onLoadProgress?.(p);
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load Whisper model";
      onError?.(msg);
      setStatus("error");
      return false;
    }
  }, [onError, onLoadProgress]);

  /**
   * Start recording from the microphone.
   * Loads the Whisper model if not already cached.
   */
  const startRecording = useCallback(async () => {
    // Load model first (instant if cached)
    const ready = await ensureModel();
    if (!ready) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // Audio level metering
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const meterTick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioLevel(sum / dataArray.length / 255);
        rafRef.current = requestAnimationFrame(meterTick);
      };
      rafRef.current = requestAnimationFrame(meterTick);

      // Record raw PCM via ScriptProcessor (widely supported)
      // Buffer size 4096 = ~93ms at 44.1kHz
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

      setStatus("recording");
    } catch (err: any) {
      cleanup();
      if (err?.name === "NotAllowedError") {
        onError?.("Microphone permission denied");
      } else if (err?.name === "NotFoundError") {
        onError?.("No microphone found");
      } else {
        onError?.("Could not access microphone");
      }
      setStatus("error");
    }
  }, [ensureModel, cleanup, onError]);

  /**
   * Stop recording and transcribe the captured audio via Whisper.
   * Returns the transcript text, or empty string on failure.
   */
  const stopAndTranscribe = useCallback(async (): Promise<string> => {
    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    cleanup();

    const chunks = chunksRef.current;
    if (!chunks.length) {
      setStatus("idle");
      return "";
    }

    // Merge chunks into single Float32Array
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    chunksRef.current = [];

    // Skip very short recordings (< 0.3s)
    if (merged.length / sampleRate < 0.3) {
      setStatus("idle");
      return "";
    }

    setStatus("transcribing");

    try {
      const engine = getWhisperEngine();
      const result = await engine.transcribe(merged, sampleRate);
      onTranscript?.(result);
      setStatus("idle");
      return result.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      onError?.(msg);
      setStatus("idle");
      return "";
    }
  }, [cleanup, onTranscript, onError]);

  /** Cancel recording without transcribing */
  const cancel = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setStatus("idle");
  }, [cleanup]);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  return {
    status,
    audioLevel,
    elapsed,
    modelProgress,
    isIdle: status === "idle",
    isLoadingModel: status === "loading-model",
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    whisperReady: getWhisperEngine().isReady,
    gpuAccelerated: getWhisperEngine().gpuAccelerated,
    startRecording,
    stopAndTranscribe,
    cancel,
    ensureModel,
  };
}
