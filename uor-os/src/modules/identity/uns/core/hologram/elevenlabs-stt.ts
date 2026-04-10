/**
 * ElevenLabs Scribe Realtime STT — WebSocket streaming client.
 * ═══════════════════════════════════════════════════════════════
 *
 * Uses scribe_v2_realtime for ultra-low-latency streaming transcription.
 * Token management via edge function keeps API key server-side.
 *
 * @module uns/core/hologram/elevenlabs-stt
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────

export interface ElevenLabsSttCallbacks {
  onPartial?: (text: string) => void;
  onCommitted?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onLevel?: (level: number) => void;
}

export interface ElevenLabsSttHandle {
  stop: () => void;
  abort: () => void;
  isActive: () => boolean;
}

// ── Constants ───────────────────────────────────────────────────────────

const SCRIBE_WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";
const SAMPLE_RATE = 16000;
const CHUNK_MS = 250; // Send audio every 250ms

// ── Token cache ─────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getScribeToken(): Promise<string> {
  // Tokens last 15 min, refresh at 12 min
  if (_cachedToken && Date.now() < _tokenExpiresAt) {
    return _cachedToken;
  }

  const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
  if (error || !data?.token) {
    throw new Error(error?.message ?? "Failed to get scribe token");
  }

  _cachedToken = data.token;
  _tokenExpiresAt = Date.now() + 12 * 60 * 1000; // 12 min
  return data.token;
}

// ── Float32 PCM → base64 Int16 ──────────────────────────────────────────

function float32ToBase64Int16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── RMS level from Float32 samples ──────────────────────────────────────

function computeRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

// ── Main streaming function ─────────────────────────────────────────────

export async function startElevenLabsScribe(
  callbacks: ElevenLabsSttCallbacks
): Promise<ElevenLabsSttHandle> {
  let active = true;
  let ws: WebSocket | null = null;
  let stream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let pcmBuffer: Float32Array[] = [];
  let sendInterval: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    active = false;
    if (sendInterval) clearInterval(sendInterval);
    workletNode?.disconnect();
    audioCtx?.close().catch(() => {});
    stream?.getTracks().forEach((t) => t.stop());
    if (ws && ws.readyState <= WebSocket.OPEN) {
      // Send end-of-stream
      try {
        ws.send(JSON.stringify({ type: "close" }));
      } catch {}
      ws.close();
    }
    ws = null;
    stream = null;
    audioCtx = null;
    workletNode = null;
    pcmBuffer = [];
  };

  try {
    // 1. Get token
    const token = await getScribeToken();

    // 2. Get microphone
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: SAMPLE_RATE,
      },
    });

    // 3. Set up AudioWorklet for PCM capture
    audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    await audioCtx.audioWorklet.addModule("/audio-capture-worklet.js");

    const source = audioCtx.createMediaStreamSource(stream);
    workletNode = new AudioWorkletNode(audioCtx, "audio-capture-processor", {
      processorOptions: {
        silenceThreshold: 0.005,
        silenceAutoStopSec: 30,
      },
    });

    // Collect PCM samples and compute levels
    workletNode.port.onmessage = (event) => {
      if (!active) return;
      const { type, samples, level } = event.data;
      if (type === "pcm" && samples) {
        pcmBuffer.push(new Float32Array(samples));
      }
      if (type === "level" && level != null) {
        callbacks.onLevel?.(level);
      }
    };

    source.connect(workletNode);
    workletNode.connect(audioCtx.destination); // needed to keep worklet alive

    // 4. Open WebSocket
    const wsUrl = `${SCRIBE_WS_URL}?model_id=scribe_v2_realtime&token=${token}&sample_rate=${SAMPLE_RATE}&encoding=pcm_s16le&language_code=en`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!active) return;
      // Start sending audio chunks periodically
      sendInterval = setInterval(() => {
        if (!active || !ws || ws.readyState !== WebSocket.OPEN) return;
        if (pcmBuffer.length === 0) return;

        // Merge buffered samples
        const totalLen = pcmBuffer.reduce((sum, b) => sum + b.length, 0);
        const merged = new Float32Array(totalLen);
        let offset = 0;
        for (const buf of pcmBuffer) {
          merged.set(buf, offset);
          offset += buf.length;
        }
        pcmBuffer = [];

        // Compute and report level
        const rms = computeRMS(merged);
        callbacks.onLevel?.(Math.min(rms * 5, 1));

        // Send as base64 Int16
        const b64 = float32ToBase64Int16(merged);
        ws!.send(JSON.stringify({ audio: b64 }));
      }, CHUNK_MS);
    };

    ws.onmessage = (event) => {
      if (!active) return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "partial_transcript" && msg.text) {
          callbacks.onPartial?.(msg.text);
        } else if (msg.type === "committed_transcript" && msg.text) {
          callbacks.onCommitted?.(msg.text);
        } else if (msg.type === "error") {
          callbacks.onError?.(msg.message ?? "ElevenLabs STT error");
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      if (active) {
        callbacks.onError?.("WebSocket connection error");
        cleanup();
        callbacks.onEnd?.();
      }
    };

    ws.onclose = () => {
      if (active) {
        cleanup();
        callbacks.onEnd?.();
      }
    };
  } catch (err) {
    cleanup();
    const msg = err instanceof Error ? err.message : "Failed to start ElevenLabs STT";
    callbacks.onError?.(msg);
    callbacks.onEnd?.();
  }

  return {
    stop: () => {
      if (active) {
        cleanup();
        callbacks.onEnd?.();
      }
    },
    abort: () => {
      cleanup();
    },
    isActive: () => active,
  };
}

// ── Availability check ──────────────────────────────────────────────────

let _available: boolean | null = null;

export async function isElevenLabsScribeAvailable(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    const { data } = await supabase.functions.invoke("elevenlabs-scribe-token");
    _available = !!data?.token;
  } catch {
    _available = false;
  }
  return _available;
}

/**
 * Reset availability cache (e.g., after connecting ElevenLabs).
 */
export function resetElevenLabsAvailability(): void {
  _available = null;
  _cachedToken = null;
  _tokenExpiresAt = 0;
}
