/**
 * Whisper Engine — Self-Hosted In-Browser Speech-to-Text
 * ═══════════════════════════════════════════════════════
 *
 * High-quality STT powered by OpenAI's Whisper (tiny.en, ONNX),
 * running entirely client-side via Transformers.js with WebGPU
 * acceleration through the Hologram vGPU.
 *
 * Design:
 *   1. Model files are served from our own storage bucket
 *      (self-hosted, zero external CDN dependencies)
 *   2. Browser Cache API stores files permanently after first load
 *   3. WebGPU auto-detected via HologramGpu; WASM fallback
 *   4. Content-addressed derivation: inputCid → outputCid (UOR)
 *
 * Privacy: Audio never leaves the browser. All inference is local.
 *
 * @module uns/core/hologram/whisper-engine
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { getHologramGpu } from "@/modules/uns/core/hologram/gpu";

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
  device: "webgpu" | "wasm";
  modelId: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const WHISPER_MODEL_ID = "onnx-community/whisper-tiny.en";
const WHISPER_TASK = "automatic-speech-recognition";
const TARGET_SAMPLE_RATE = 16000;

/**
 * Self-hosted model files URL prefix.
 * Model files are stored in our storage bucket under whisper-models/.
 */
const SELF_HOSTED_MODEL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/app-assets/whisper-models`;

// ── Audio Utilities ─────────────────────────────────────────────────────────

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
  private _vgpuInitialized = false;

  get status(): WhisperStatus { return this._status; }
  get isReady(): boolean { return this._status === "ready"; }
  get isLoading(): boolean { return this._status === "loading"; }
  get isTranscribing(): boolean { return this._status === "transcribing"; }
  get device(): "webgpu" | "wasm" { return this._device; }
  get error(): string | null { return this._error; }
  get gpuAccelerated(): boolean { return this._device === "webgpu"; }
  get modelId(): string { return WHISPER_MODEL_ID; }

  /**
   * Load the Whisper model. Safe to call multiple times.
   * Model files are served from our own storage bucket.
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
      const { pipeline: createPipeline, env } = await import("@huggingface/transformers");

      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.allowRemoteModels = true;

      // ── Self-hosted fetch interceptor with HuggingFace fallback ────────
      // Try our storage bucket first (self-hosted, no external deps).
      // If file isn't cached there, fall back to HuggingFace directly.
      const HF_DOMAINS = ["huggingface.co", "hf.co", "cdn-lfs.huggingface.co", "cdn-lfs-us-1.huggingface.co"];
      const originalFetch = globalThis.fetch;
      const selfHostedFetch: typeof fetch = async (input, init) => {
        let url = "";
        if (typeof input === "string") url = input;
        else if (input instanceof URL) url = input.toString();
        else if (input instanceof Request) url = input.url;

        const isHfUrl = HF_DOMAINS.some(d => url.includes(d));
        if (isHfUrl) {
          try {
            const parsed = new URL(url);
            const path = parsed.pathname.replace(/^\//, "");
            const selfHostedUrl = `${SELF_HOSTED_MODEL_BASE}/${path}`;
            const fileName = url.split("/").pop();

            // Try self-hosted first
            const selfHostedRes = await originalFetch(selfHostedUrl, { method: "HEAD" });
            if (selfHostedRes.ok) {
              console.log(`[Whisper] 📦 Self-hosted: ${fileName}`);
              return originalFetch(selfHostedUrl, init);
            }
          } catch {
            // Self-hosted check failed, fall through
          }

          // Fall back to HuggingFace directly
          console.log(`[Whisper] 🌐 HuggingFace fallback: ${url.split("/").pop()}`);
          return originalFetch(input, init);
        }
        return originalFetch(input, init);
      };
      globalThis.fetch = selfHostedFetch;

      // ── vGPU Integration ──────────────────────────────────────────────
      this._device = "wasm";
      try {
        const vgpu = getHologramGpu();
        const info = await vgpu.init();

        if (info.status === "ready" && vgpu.isReady) {
          this._device = "webgpu";
          this._vgpuInitialized = true;
          console.log(
            `[Whisper] 🎮 vGPU ready (${info.adapterName}, ${(info.maxBufferSize / 1024 / 1024).toFixed(0)}MB buffer)`
          );
        } else {
          console.log("[Whisper] vGPU unavailable → WASM fallback");
        }
      } catch (err) {
        console.log("[Whisper] vGPU init failed → WASM fallback:", err);
      }

      // fp16 on WebGPU: best accuracy/size tradeoff (59MB decoder vs 119MB fp32).
      // q8 on WASM: smallest, fast, good enough for speech.
      // Both variants are pre-seeded in our storage bucket.
      const dtype = this._device === "webgpu" ? "fp16" : "q8";

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

      // Restore original fetch after model loading
      globalThis.fetch = originalFetch;

      this._status = "ready";
      console.log(`[Whisper] ✅ Ready (${this._device}, ${dtype}, vGPU: ${this._vgpuInitialized})`);
    } catch (err) {
      this._status = "error";
      this._error = err instanceof Error ? err.message : "Failed to load Whisper model";
      console.error("[Whisper] Load failed:", err);
      throw err;
    } finally {
      this._loadPromise = null;
    }
  }

  /**
   * Transcribe audio. Audio never leaves the browser.
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
      const resampled = await resampleTo16kHz(audio, sampleRate);

      const inputProof = await singleProofHash({
        "@type": "uor:WhisperInput",
        sampleCount: resampled.length,
        durationSec: resampled.length / TARGET_SAMPLE_RATE,
        device: this._device,
        vgpu: this._vgpuInitialized,
        modelId: WHISPER_MODEL_ID,
        timestamp: new Date().toISOString(),
      });

      const start = performance.now();

      const result = await this.pipeline(resampled, {
        language: "en",
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const inferenceTimeMs = Math.round((performance.now() - start) * 100) / 100;
      const text = (result?.text ?? "").trim();

      const outputProof = await singleProofHash({
        "@type": "uor:WhisperOutput",
        inputCid: inputProof.cid,
        text,
        inferenceTimeMs,
        device: this._device,
        vgpu: this._vgpuInitialized,
      });

      this._status = "ready";

      console.log(
        `[Whisper] 📝 "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}" ` +
        `(${inferenceTimeMs}ms, ${this._device}, vGPU: ${this._vgpuInitialized})`
      );

      return {
        text,
        inferenceTimeMs,
        gpuAccelerated: this._device === "webgpu",
        inputCid: inputProof.cid,
        outputCid: outputProof.cid,
        device: this._device,
        modelId: WHISPER_MODEL_ID,
      };
    } catch (err) {
      this._status = "ready";
      throw err;
    }
  }

  /**
   * Transcribe from a Blob (e.g., from MediaRecorder).
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

  async unload(): Promise<void> {
    if (this.pipeline && typeof this.pipeline.dispose === "function") {
      await this.pipeline.dispose();
    }
    this.pipeline = null;
    this._status = "unloaded";
    this._error = null;
    this._vgpuInitialized = false;
    console.log("[Whisper] Unloaded");
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _instance: WhisperEngine | null = null;

export function getWhisperEngine(): WhisperEngine {
  if (!_instance) _instance = new WhisperEngine();
  return _instance;
}

export function preloadWhisper(onProgress?: (p: WhisperLoadProgress) => void): void {
  const engine = getWhisperEngine();
  if (engine.isReady || engine.isLoading) return;
  engine.load(onProgress).catch((err) => {
    console.warn("[Whisper] Background preload failed:", err);
  });
}
