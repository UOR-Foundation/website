/**
 * useAudioCapture — AudioWorklet-based mic capture with built-in VAD
 * ═══════════════════════════════════════════════════════════════════
 *
 * Replaces the deprecated ScriptProcessorNode with AudioWorklet for
 * zero-jank, compositor-thread audio capture. Includes built-in Voice
 * Activity Detection (VAD) that detects silence and auto-triggers
 * a callback — enabling hands-free voice input.
 *
 * Features:
 *   - AudioWorklet (off main thread) for perfectly timed PCM capture
 *   - Built-in VAD: detects 1.5s of silence → onSilence callback
 *   - Level metering via RMS (for waveform visualisation)
 *   - Graceful fallback to ScriptProcessorNode if AudioWorklet unsupported
 *   - Fully browser-native, zero dependencies, complete privacy
 *
 * @module hologram-ui/hooks/useAudioCapture
 */

import { useRef, useCallback, useState } from "react";

export interface AudioCaptureHandle {
  /** Start capturing audio from the user's microphone */
  start: () => Promise<void>;
  /** Stop capturing and return merged PCM Float32Array + sample rate */
  stop: () => Promise<{ audio: Float32Array; sampleRate: number } | null>;
  /** Cancel without returning audio */
  cancel: () => void;
  /** Whether currently capturing */
  isCapturing: boolean;
  /** Current audio level (0–1) for waveform display */
  audioLevel: number;
}

interface UseAudioCaptureOptions {
  /** Called when VAD detects silence (default 1.5s) */
  onSilence?: () => void;
  /** Silence threshold in seconds (default 1.5) */
  silenceAutoStopSec?: number;
  /** Called with audio level updates (0–1) */
  onLevel?: (level: number) => void;
}

let workletRegistered = false;

export function useAudioCapture(options: UseAudioCaptureOptions = {}): AudioCaptureHandle {
  const { onSilence, silenceAutoStopSec = 1.5, onLevel } = options;
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const fallbackProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const silenceCalledRef = useRef(false);

  const cleanup = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    fallbackProcessorRef.current?.disconnect();
    fallbackProcessorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current?.state !== "closed") {
      audioCtxRef.current?.close().catch(() => {});
    }
    audioCtxRef.current = null;
    setAudioLevel(0);
    setIsCapturing(false);
  }, []);

  const start = useCallback(async () => {
    chunksRef.current = [];
    silenceCalledRef.current = false;

    // Acquire mic — MUST be called directly from user gesture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);

    // Try AudioWorklet first (modern, off-thread)
    let useWorklet = false;
    if (audioCtx.audioWorklet) {
      try {
        if (!workletRegistered) {
          await audioCtx.audioWorklet.addModule("/audio-capture-worklet.js");
          workletRegistered = true;
        }
        const workletNode = new AudioWorkletNode(audioCtx, "audio-capture-processor", {
          processorOptions: {
            silenceThreshold: 0.01,
            silenceAutoStopSec,
          },
        });

        workletNode.port.onmessage = (e) => {
          const { type } = e.data;
          if (type === "pcm") {
            chunksRef.current.push(e.data.samples);
          } else if (type === "level") {
            const lvl = e.data.level;
            setAudioLevel(lvl);
            onLevel?.(lvl);
          } else if (type === "silence" && !silenceCalledRef.current) {
            silenceCalledRef.current = true;
            onSilence?.();
          }
        };

        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);
        workletNodeRef.current = workletNode;
        useWorklet = true;
      } catch (err) {
        console.warn("[AudioCapture] AudioWorklet failed, falling back to ScriptProcessor:", err);
      }
    }

    // Fallback: ScriptProcessorNode
    if (!useWorklet) {
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      let silentFrames = 0;

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(data));

        // Level metering
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const lvl = Math.min(rms * 5, 1);
        setAudioLevel(lvl);
        onLevel?.(lvl);

        // VAD
        if (rms < 0.01) {
          silentFrames++;
          const silenceSec = (silentFrames * 4096) / audioCtx.sampleRate;
          if (silenceSec >= silenceAutoStopSec && !silenceCalledRef.current) {
            silenceCalledRef.current = true;
            onSilence?.();
          }
        } else {
          silentFrames = 0;
          silenceCalledRef.current = false;
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      fallbackProcessorRef.current = processor;
    }

    setIsCapturing(true);
  }, [onSilence, onLevel, silenceAutoStopSec]);

  const stop = useCallback(async (): Promise<{ audio: Float32Array; sampleRate: number } | null> => {
    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    cleanup();

    if (!chunks.length) return null;

    // Merge PCM chunks into single Float32Array
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }

    // Skip very short recordings (< 0.3s)
    if (merged.length / sampleRate < 0.3) return null;

    return { audio: merged, sampleRate };
  }, [cleanup]);

  const cancel = useCallback(() => {
    chunksRef.current = [];
    cleanup();
  }, [cleanup]);

  return { start, stop, cancel, isCapturing, audioLevel };
}
