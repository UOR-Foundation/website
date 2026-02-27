/**
 * Whisper Engine — Self-Hosted In-Browser Speech-to-Text
 * ═══════════════════════════════════════════════════════
 *
 * High-quality STT powered by OpenAI's Whisper (tiny.en, ONNX),
 * running entirely client-side via Transformers.js with WebGPU
 * acceleration through the Hologram vGPU.
 *
 * Design:
 *   1. Model files are cached permanently in the browser's Cache API
 *      after first load — subsequent visits are instant (zero download).
 *   2. WebGPU is auto-detected; falls back to WASM on unsupported devices.
 *   3. Audio is resampled to 16kHz mono Float32Array for Whisper input.
 *   4. Content-addressed derivation: inputCid → outputCid for every
 *      transcription (UOR compliance).
 *
 * Architecture:
 *   User audio → AudioContext resample → Float32Array (16kHz)
 *     → Whisper ONNX (WebGPU/WASM) → transcript string
 *
 * @module uns/core/hologram/whisper-engine
 */

import { singleProofHash } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

export type WhisperStatus = "unloaded" | "loading" | "ready" | "transcribing" | "error";

export interface WhisperLoadProgress {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface WhisperTranscription {
  text: string;
  inferenceTimeMs: number;
  gpuAccelerated: boolean;
  inputCid: string;
  outputCid: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Whisper tiny.en — English-only, ~40MB quantized, optimal for real-time STT.
 * Pre-optimized for Transformers.js + WebGPU by onnx-community.
 */
const WHISPER_MODEL_ID = "onnx-community/whisper-tiny.en";
const WHISPER_TASK = "automatic-speech-recognition";
const TARGET_SAMPLE_RATE = 16000;

// ── Audio Utilities ─────────────────────────────────────────────────────────

/**
 * Resample audio to 16kHz mono Float32Array as required by Whisper.
 * Uses OfflineAudioContext for high-quality resampling.
 */
async function resampleTo16kHz(
  audioData: Float32Array,
  sourceSampleRate: number,
): Promise<Float32Array> {
  if (sourceSampleRate === TARGET_SAMPLE_RATE) return audioData;

  const duration = audioData.length / sourceSampleRate;
  const targetLength = Math.ceil(duration * TARGET_SAMPLE_RATE);

  const offlineCtx = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE);
  const buffer = offlineCtx.createBuffer(1, audioData.length, sourceSampleRate);
  buffer.getChannelData(0).set(audioData);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

// ── Whisper Engine ──────────────────────────────────────────────────────────

export class WhisperEngine {
  private pipeline: any = null;
  private _status: WhisperStatus = "unloaded";
  private _device: "webgpu" | "wasm" = "wasm";
  private _error: string | null = null;
  private _loadPromise: Promise<void> | null = null;
  private _onProgress: ((p: WhisperLoadProgress) => void) | null = null;

  // ── Getters ─────────────────────────────────────────────────────────────

  get status(): WhisperStatus { return this._status; }
  get isReady(): boolean { return this._status === "ready"; }
  get isLoading(): boolean { return this._status === "loading"; }
  get isTranscribing(): boolean { return this._status === "transcribing"; }
  get device(): "webgpu" | "wasm" { return this._device; }
  get error(): string | null { return this._error; }
  get gpuAccelerated(): boolean { return this._device === "webgpu"; }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Load the Whisper model. Safe to call multiple times —
   * returns the existing promise if already loading.
   *
   * After first load, the browser's Cache API stores all model files
   * permanently. Subsequent calls resolve near-instantly from cache.
   */
  async load(onProgress?: (p: WhisperLoadProgress) => void): Promise<void> {
    if (this._status === "ready") return;
    if (this._loadPromise) {
      this._onProgress = onProgress ?? this._onProgress;
      return this._loadPromise;
    }

    this._onProgress = onProgress ?? null;
    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  private async _doLoad(): Promise<void> {
    this._status = "loading";
    this._error = null;

    try {
      // Dynamic import — only loads Transformers.js when Whisper is needed
      const { pipeline: createPipeline, env } = await import("@huggingface/transformers");

      // Use HuggingFace CDN; Cache API handles persistence
      env.allowLocalModels = false;
      // Enable caching (default, but explicit)
      env.useBrowserCache = true;

      // Detect WebGPU via vGPU
      this._device = "wasm";
      try {
        if (typeof navigator !== "undefined" && "gpu" in navigator) {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            this._device = "webgpu";
            console.log("[Whisper] 🎮 WebGPU available — using vGPU acceleration");
          }
        }
      } catch {
        console.log("[Whisper] WebGPU not available, using WASM fallback");
      }

      const dtype = this._device === "webgpu" ? "fp32" : "q8";

      this._onProgress?.({ status: "downloading", progress: 0 });

      this.pipeline = await createPipeline(WHISPER_TASK, WHISPER_MODEL_ID, {
        device: this._device,
        dtype,
        progress_callback: (p: any) => {
          this._onProgress?.({
            status: p.status ?? "downloading",
            file: p.file,
            progress: p.progress,
            loaded: p.loaded,
            total: p.total,
          });
        },
      });

      this._status = "ready";
      console.log(`[Whisper] ✅ Model ready (${this._device}, ${dtype})`);
    } catch (err) {
      this._status = "error";
      this._error = err instanceof Error ? err.message : "Failed to load Whisper model";
      console.error("[Whisper] Load failed:", err);
      throw err;
    } finally {
      this._loadPromise = null;
    }
  }

  // ── Transcription ─────────────────────────────────────────────────────

  /**
   * Transcribe a Float32Array of audio samples.
   *
   * @param audio  PCM audio samples (any sample rate — will be resampled)
   * @param sampleRate  Source sample rate of the audio
   * @returns Transcription with text, timing, and UOR derivation proof
   */
  async transcribe(
    audio: Float32Array,
    sampleRate: number = TARGET_SAMPLE_RATE,
  ): Promise<WhisperTranscription> {
    if (!this.pipeline) {
      throw new Error("Whisper model not loaded. Call load() first.");
    }

    this._status = "transcribing";

    try {
      // Resample to 16kHz if needed
      const resampled = await resampleTo16kHz(audio, sampleRate);

      // Content-address the input audio (hash a summary, not entire audio)
      const inputProof = await singleProofHash({
        "@type": "uor:WhisperInput",
        sampleCount: resampled.length,
        durationSec: resampled.length / TARGET_SAMPLE_RATE,
        device: this._device,
        timestamp: new Date().toISOString(),
      });

      const start = performance.now();

      // Run Whisper inference
      const result = await this.pipeline(resampled, {
        language: "en",
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const inferenceTimeMs = Math.round((performance.now() - start) * 100) / 100;
      const text = (result?.text ?? "").trim();

      // Content-address the output
      const outputProof = await singleProofHash({
        "@type": "uor:WhisperOutput",
        inputCid: inputProof.cid,
        text,
        inferenceTimeMs,
        device: this._device,
      });

      this._status = "ready";

      console.log(
        `[Whisper] 📝 "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}" ` +
        `(${inferenceTimeMs}ms, ${this._device})`
      );

      return {
        text,
        inferenceTimeMs,
        gpuAccelerated: this._device === "webgpu",
        inputCid: inputProof.cid,
        outputCid: outputProof.cid,
      };
    } catch (err) {
      this._status = "ready"; // Recover to ready state
      throw err;
    }
  }

  /**
   * Transcribe from a Blob (e.g., from MediaRecorder).
   * Decodes the audio and resamples automatically.
   */
  async transcribeBlob(blob: Blob): Promise<WhisperTranscription> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    await audioCtx.close();
    return this.transcribe(channelData, sampleRate);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  async unload(): Promise<void> {
    if (this.pipeline && typeof this.pipeline.dispose === "function") {
      await this.pipeline.dispose();
    }
    this.pipeline = null;
    this._status = "unloaded";
    this._error = null;
    console.log("[Whisper] Unloaded");
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _instance: WhisperEngine | null = null;

/** Get the singleton Whisper engine instance. */
export function getWhisperEngine(): WhisperEngine {
  if (!_instance) _instance = new WhisperEngine();
  return _instance;
}

/**
 * Pre-load the Whisper model in the background.
 * Call this early (e.g., on page load) so the model is ready
 * before the user clicks "Speak".
 */
export function preloadWhisper(onProgress?: (p: WhisperLoadProgress) => void): void {
  const engine = getWhisperEngine();
  if (engine.isReady || engine.isLoading) return;
  engine.load(onProgress).catch((err) => {
    console.warn("[Whisper] Background preload failed (will retry on demand):", err);
  });
}
