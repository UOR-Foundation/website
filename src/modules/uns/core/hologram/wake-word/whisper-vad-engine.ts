/**
 * WhisperVadWakeWordEngine — Sovereign Whisper-based Wake Word Fallback
 * ════════════════════════════════════════════════════════════════════
 *
 * Uses client-side Whisper transcription on short audio windows to detect
 * wake phrases. No API keys required — fully sovereign.
 *
 * Trade-offs vs Porcupine:
 *   - Higher latency (~2-3s vs <20ms)
 *   - Higher CPU (~40MB model vs ~1MB)
 *   - No API key required
 *   - More flexible phrase matching (fuzzy)
 *
 * @module uns/core/hologram/wake-word/whisper-vad-engine
 */

import type {
  IWakeWordEngine,
  WakeWordEngineCallbacks,
  WakeWordStatus,
} from "./types";
import { installModelProxy } from "../model-proxy";

export interface WhisperVadConfig {
  /** The wake phrase to listen for */
  wakePhrase?: string;
  /** Audio level threshold for speech detection (0-1) */
  vadThreshold?: number;
  /** How long to buffer speech before checking (ms) */
  captureWindowMs?: number;
  /** Cooldown between checks (ms) */
  cooldownMs?: number;
}

// Singleton Whisper pipeline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipelineLoading: Promise<any> | null = null;

async function getWhisperPipeline() {
  if (_pipeline) return _pipeline;
  if (_pipelineLoading) return _pipelineLoading;
  _pipelineLoading = (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const restoreFetch = installModelProxy();
    try {
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-base",
        { dtype: "q8", device: "wasm" },
      );
      _pipeline = transcriber;
      return transcriber;
    } finally {
      restoreFetch();
    }
  })();
  return _pipelineLoading;
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
  if (t.includes(p)) return true;

  const variants = [
    "hey lumen", "hey luman", "hey looman", "hey lumin",
    "hey lemon", "hey loman", "a lumen", "hey lumun",
    "hei lumen", "hey limon", "hey lumen.", "hey, lumen",
    "helumen", "hey loom in", "halo men", "hey lumen!",
    "alumina", "a lumina", "aloomina", "a luminah",
    "aluminah", "alumena", "a loomina",
  ];
  return variants.some(v => t.includes(v));
}

export class WhisperVadWakeWordEngine implements IWakeWordEngine {
  readonly backend = "whisper-vad" as const;

  private _status: WakeWordStatus = "off";
  private _callbacks: WakeWordEngineCallbacks | null = null;
  private _config: Required<WhisperVadConfig>;
  private _ready = false;
  private _active = false;

  // Audio resources
  private _stream: MediaStream | null = null;
  private _audioCtx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _recorder: MediaRecorder | null = null;
  private _chunks: Blob[] = [];
  private _raf: number | null = null;
  private _speechStart: number | null = null;

  constructor(config: WhisperVadConfig = {}) {
    this._config = {
      wakePhrase: config.wakePhrase ?? "hey lumen",
      vadThreshold: config.vadThreshold ?? 0.06,
      captureWindowMs: config.captureWindowMs ?? 2500,
      cooldownMs: config.cooldownMs ?? 1500,
    };
  }

  get isReady() { return this._ready; }
  get status() { return this._status; }

  private _setStatus(s: WakeWordStatus) {
    this._status = s;
    this._callbacks?.onStatusChange(s);
  }

  async init(callbacks: WakeWordEngineCallbacks): Promise<boolean> {
    this._callbacks = callbacks;
    try {
      await getWhisperPipeline();
      this._ready = true;
      console.log("[WhisperVAD] ✓ Pipeline loaded (sovereign mode)");
      return true;
    } catch (err) {
      console.error("[WhisperVAD] Init failed:", err);
      callbacks.onError(`Whisper VAD init failed: ${err}`);
      return false;
    }
  }

  async start(): Promise<void> {
    if (this._active) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      this._stream = stream;
      this._active = true;
      this._setStatus("standby");

      const audioCtx = new AudioContext();
      this._audioCtx = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      this._analyser = analyser;

      this._setupRecorder(stream);
      this._startVadLoop(analyser);

      console.log("[WhisperVAD] 🎤 Listening for wake phrase...");
    } catch (err) {
      console.error("[WhisperVAD] Start failed:", err);
      this._callbacks?.onError(`Whisper VAD start failed: ${err}`);
      this._active = false;
      this._setStatus("off");
    }
  }

  async stop(): Promise<void> {
    this._active = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._recorder?.state === "recording") {
      try { this._recorder.stop(); } catch {}
    }
    this._recorder = null;
    this._stream?.getTracks().forEach(t => t.stop());
    this._stream = null;
    if (this._audioCtx?.state !== "closed") {
      await this._audioCtx?.close().catch(() => {});
    }
    this._audioCtx = null;
    this._analyser = null;
    this._setStatus("off");
    console.log("[WhisperVAD] ⏹ Stopped listening");
  }

  async destroy(): Promise<void> {
    await this.stop();
    this._callbacks = null;
    this._ready = false;
  }

  // ── Internal ───────────────────────────────────────────────────────

  private _setupRecorder(stream: MediaStream) {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this._chunks.push(e.data);
    };
    recorder.onstop = async () => {
      const captured = [...this._chunks];
      this._chunks = [];
      if (this._active && this._status === "detecting") {
        await this._checkForWakeWord(captured);
        // Re-create recorder for next cycle
        if (this._active && this._stream) {
          this._setupRecorder(this._stream);
        }
      }
    };
    this._recorder = recorder;
  }

  private _startVadLoop(analyser: AnalyserNode) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!this._active) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const level = sum / dataArray.length / 255;
      this._callbacks?.onAudioLevel?.(level);

      const now = Date.now();
      if (this._status === "standby" && level > this._config.vadThreshold) {
        this._speechStart = now;
        this._setStatus("detecting");
        this._chunks = [];
        try { this._recorder?.start(100); } catch {}
      } else if (this._status === "detecting") {
        if (this._speechStart && now - this._speechStart > this._config.captureWindowMs) {
          this._speechStart = null;
          try {
            if (this._recorder?.state === "recording") this._recorder.stop();
          } catch { this._setStatus("standby"); }
        }
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  private async _checkForWakeWord(chunks: Blob[]) {
    if (!this._active || chunks.length === 0) {
      this._setStatus("standby");
      return;
    }

    this._setStatus("checking");
    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const pcm = await blobToPCM(blob);
      const transcriber = await getWhisperPipeline();
      const result = await transcriber(pcm, {
        chunk_length_s: 5,
        stride_length_s: 1,
        return_timestamps: false,
      });

      const text = (result?.text ?? "").trim();
      if (text && containsWakePhrase(text, this._config.wakePhrase)) {
        console.log(`[WhisperVAD] 🎯 Detected: "${text}"`);
        this._callbacks?.onDetection({
          backend: "whisper-vad",
          keyword: this._config.wakePhrase,
          timestamp: Date.now(),
          confidence: 0.85,
        });

        this._setStatus("cooldown");
        await new Promise(r => setTimeout(r, this._config.cooldownMs * 2));
      }
    } catch (err) {
      console.error("[WhisperVAD] Check error:", err);
    }

    if (this._active) this._setStatus("standby");
  }
}
