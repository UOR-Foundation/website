/**
 * useWakeWord — "Hey Lumen" Wake Word Detection
 * ═══════════════════════════════════════════════
 *
 * Always-listening microphone monitor that detects the wake phrase
 * "Hey Lumen" using client-side Whisper transcription on short
 * audio windows. When detected, fires `onWake()` to trigger
 * the voice conversation loop.
 *
 * Architecture:
 *  1. Continuous mic stream at low quality (for efficiency)
 *  2. Voice Activity Detection (VAD) via audio level threshold
 *  3. When speech detected, buffer 2-3 seconds of audio
 *  4. Run Whisper on the short buffer
 *  5. If transcript contains the wake phrase → fire callback
 *  6. Return to passive listening
 *
 * Privacy:
 *  - All processing is 100% client-side (Whisper WASM)
 *  - No audio leaves the browser until wake word is confirmed
 *  - User must explicitly enable always-listening mode
 *
 * @module hologram-ui/hooks/useWakeWord
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type WakeWordStatus =
  | "off"         // Not listening at all
  | "standby"     // Mic open, waiting for speech
  | "detecting"   // Speech detected, buffering audio
  | "checking"    // Running Whisper on captured audio
  | "cooldown";   // Brief pause after check before re-listening

interface UseWakeWordOptions {
  /** Callback when wake word is detected */
  onWake: () => void;
  /** The wake phrase to listen for */
  wakePhrase?: string;
  /** Audio level threshold to trigger speech detection (0-1) */
  vadThreshold?: number;
  /** How long to buffer speech before checking (ms) */
  captureWindowMs?: number;
  /** Cooldown between checks (ms) */
  cooldownMs?: number;
  /** Whether wake word detection is enabled */
  enabled?: boolean;
}

// Reuse singleton pipeline from useWhisperTranscription
let wakeWordPipeline: any = null;
let wakeWordPipelineLoading: Promise<any> | null = null;

async function getWakeWordPipeline() {
  if (wakeWordPipeline) return wakeWordPipeline;
  if (wakeWordPipelineLoading) return wakeWordPipelineLoading;
  wakeWordPipelineLoading = (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      { dtype: "q8", device: "wasm" },
    );
    wakeWordPipeline = transcriber;
    return transcriber;
  })();
  return wakeWordPipelineLoading;
}

/** Convert audio blob to Float32 PCM at 16kHz */
async function blobToPCM(blob: Blob): Promise<Float32Array> {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 16000);
  const decoded = await ctx.decodeAudioData(arrayBuf);
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

/** Fuzzy match for wake phrase in transcript */
function containsWakePhrase(transcript: string, phrase: string): boolean {
  const t = transcript.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const p = phrase.toLowerCase().replace(/[^a-z\s]/g, "").trim();

  // Exact substring
  if (t.includes(p)) return true;

  // Common Whisper mishearings of "hey lumen"
  const variants = [
    "hey lumen", "hey luman", "hey looman", "hey lumin",
    "hey lemon", "hey loman", "a lumen", "hey lumun",
    "hei lumen", "hey limon", "hey lumen.", "hey, lumen",
    "helumen", "hey loom in", "halo men", "hey lumen!",
  ];
  return variants.some(v => t.includes(v));
}

/** Play a short synthesized chime using Web Audio API */
function playWakeChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Two-tone ascending chime (C5 → E5)
    const notes = [523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });

    // Clean up context after chime
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Audio context may be blocked — silent fallback
  }
}

export function useWakeWord({
  onWake,
  wakePhrase = "hey lumen",
  vadThreshold = 0.06,
  captureWindowMs = 2500,
  cooldownMs = 1500,
  enabled = false,
}: UseWakeWordOptions) {
  const [status, setStatus] = useState<WakeWordStatus>("off");
  const [audioLevel, setAudioLevel] = useState(0);
  const [wakeDetected, setWakeDetected] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const statusRef = useRef<WakeWordStatus>("off");

  const updateStatus = useCallback((s: WakeWordStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  /** Stop everything and release resources */
  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current?.state !== "closed") {
      audioCtxRef.current?.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
    updateStatus("off");
  }, [updateStatus]);

  /** Process captured audio through Whisper */
  const checkForWakeWord = useCallback(async (chunks: Blob[]) => {
    if (!activeRef.current || chunks.length === 0) {
      updateStatus("standby");
      return;
    }

    updateStatus("checking");
    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const pcm = await blobToPCM(blob);
      const transcriber = await getWakeWordPipeline();
      const result = await transcriber(pcm, {
        chunk_length_s: 5,
        stride_length_s: 1,
        return_timestamps: false,
      });

      const text = (result?.text ?? "").trim();
      if (text && containsWakePhrase(text, wakePhrase)) {
        console.log("[WakeWord] 🎯 Detected:", text);
        // Chime + haptic flash before triggering
        playWakeChime();
        setWakeDetected(true);
        // Brief visual moment before starting conversation
        await new Promise(r => setTimeout(r, 400));
        setWakeDetected(false);
        onWake();
        // Brief cooldown after wake to avoid double-trigger
        updateStatus("cooldown");
        await new Promise(r => setTimeout(r, cooldownMs * 2));
      }
    } catch (err) {
      console.error("[WakeWord] Check error:", err);
    }

    if (activeRef.current) {
      updateStatus("standby");
    }
  }, [wakePhrase, onWake, cooldownMs, updateStatus]);

  /** Start always-listening mode */
  const startListening = useCallback(async () => {
    if (activeRef.current) return;

    try {
      // Pre-load Whisper
      await getWakeWordPipeline();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      if (!stream) return;
      streamRef.current = stream;
      activeRef.current = true;
      updateStatus("standby");

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up recorder for capture
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const captured = [...chunksRef.current];
        chunksRef.current = [];

        if (activeRef.current && statusRef.current === "detecting") {
          await checkForWakeWord(captured);

          // Restart recording for next detection cycle
          if (activeRef.current && recorderRef.current && streamRef.current) {
            try {
              chunksRef.current = [];
              recorderRef.current = new MediaRecorder(streamRef.current, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                  ? "audio/webm;codecs=opus"
                  : "audio/webm",
              });
              recorderRef.current.ondataavailable = (ev) => {
                if (ev.data.size > 0) chunksRef.current.push(ev.data);
              };
              recorderRef.current.onstop = recorder.onstop;
            } catch {
              // Stream may have ended
            }
          }
        }
      };

      // VAD monitoring loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!activeRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = sum / dataArray.length / 255;
        setAudioLevel(level);

        const now = Date.now();

        if (statusRef.current === "standby") {
          // Speech onset detection
          if (level > vadThreshold) {
            speechStartRef.current = now;
            updateStatus("detecting");
            chunksRef.current = [];
            try {
              recorderRef.current?.start(100);
            } catch {
              // May already be recording
            }
          }
        } else if (statusRef.current === "detecting") {
          // Check if we've captured enough audio
          if (speechStartRef.current && now - speechStartRef.current > captureWindowMs) {
            speechStartRef.current = null;
            try {
              if (recorderRef.current?.state === "recording") {
                recorderRef.current.stop(); // triggers onstop → checkForWakeWord
              }
            } catch {
              updateStatus("standby");
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("[WakeWord] Start error:", err);
      activeRef.current = false;
      updateStatus("off");
    }
  }, [vadThreshold, captureWindowMs, checkForWakeWord, updateStatus]);

  /** Toggle always-listening on/off */
  const toggle = useCallback(() => {
    if (activeRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Auto-enable/disable based on `enabled` prop
  useEffect(() => {
    if (enabled && !activeRef.current) {
      startListening();
    } else if (!enabled && activeRef.current) {
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    status,
    audioLevel,
    isActive: status !== "off",
    isStandby: status === "standby",
    isDetecting: status === "detecting",
    isChecking: status === "checking",
    wakeDetected,
    toggle,
    startListening,
    stopListening,
  };
}
