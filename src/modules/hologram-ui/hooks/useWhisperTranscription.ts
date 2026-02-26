/**
 * useWhisperTranscription — Client-side Whisper STT via Transformers.js
 * ═════════════════════════════════════════════════════════════════════
 *
 * Fully open-source, offline-capable voice-to-text using OpenAI Whisper
 * running in the browser via @huggingface/transformers (ONNX/WebGPU).
 *
 * - Press ⌘+Shift+V to toggle recording
 * - Audio is captured via MediaRecorder, converted to Float32 PCM
 * - Transcribed by whisper-base pipeline
 * - Result is returned via onTranscript callback
 *
 * @module hologram-ui/hooks/useWhisperTranscription
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type WhisperStatus =
  | "idle"           // Nothing happening
  | "loading"        // Model downloading / warming up
  | "ready"          // Model loaded, waiting
  | "recording"      // Actively capturing audio
  | "transcribing";  // Processing captured audio

interface UseWhisperOptions {
  onTranscript: (text: string) => void;
  onStatusChange?: (status: WhisperStatus) => void;
}

// Singleton pipeline — loaded once, shared across hook instances
let pipelinePromise: Promise<any> | null = null;
let pipelineInstance: any = null;

async function getWhisperPipeline(onProgress?: (p: number) => void) {
  if (pipelineInstance) return pipelineInstance;
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        dtype: "q8",
        device: "wasm",
        progress_callback: (p: any) => {
          if (p.status === "progress" && onProgress) {
            onProgress(Math.round(p.progress ?? 0));
          }
        },
      },
    );
    pipelineInstance = transcriber;
    return transcriber;
  })();

  return pipelinePromise;
}

/**
 * Convert an audio Blob (webm/ogg) to Float32Array PCM at 16 kHz
 */
async function audioToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 16000);
  const decoded = await ctx.decodeAudioData(arrayBuf);

  // Resample to 16 kHz mono
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

export function useWhisperTranscription({ onTranscript, onStatusChange }: UseWhisperOptions) {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStatus = useCallback(
    (s: WhisperStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  // Pre-load model in background on first mount
  useEffect(() => {
    if (!pipelineInstance && !pipelinePromise) {
      // Don't set loading status — silent preload
      getWhisperPipeline((p) => setLoadProgress(p)).then(() => {
        // Model is cached in IndexedDB for next time
      });
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Ensure model is loaded
      if (!pipelineInstance) {
        updateStatus("loading");
        await getWhisperPipeline((p) => setLoadProgress(p));
      }

      updateStatus("recording");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up audio analyser for level metering
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animation loop for audio level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        // Calculate RMS-ish average, normalize to 0-1
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setAudioLevel(avg);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      // Start elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop analyser
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        analyserRef.current = null;
        setAudioLevel(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          updateStatus("ready");
          return;
        }

        updateStatus("transcribing");

        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const pcm = await audioToFloat32(blob);

          const transcriber = await getWhisperPipeline();
          const result = await transcriber(pcm, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
          });

          const text = (result?.text ?? "").trim();
          if (text) onTranscript(text);
        } catch (err) {
          console.error("[Whisper] Transcription error:", err);
        }

        updateStatus("ready");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect data every 250ms
    } catch (err) {
      console.error("[Whisper] Recording error:", err);
      updateStatus(pipelineInstance ? "ready" : "idle");
    }
  }, [onTranscript, updateStatus]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "ready") {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    status,
    loadProgress,
    audioLevel,
    elapsed,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing",
    isLoading: status === "loading",
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
