/**
 * Hologram Diffusion Pipeline — Sovereign SD 1.5 in Browser
 * ══════════════════════════════════════════════════════════
 *
 * Full Stable Diffusion 1.5 inference pipeline running entirely in the
 * browser via ONNX Runtime Web + WebGPU. No server required after model
 * files are seeded.
 *
 * Pipeline flow:
 *   Prompt → CLIP Tokenizer → Text Encoder → UNet Denoising Loop → VAE Decoder → Image
 *
 * @module uns/core/hologram/diffusion/pipeline
 */

import * as ort from "onnxruntime-web";
import { buildProxyUrl } from "../model-proxy";
import { ClipTokenizer } from "./clip-tokenizer";
import { PndmScheduler, generateLatentNoise } from "./scheduler";
import type {
  DiffusionConfig,
  DiffusionProgress,
  DiffusionResult,
  DiffusionSessions,
} from "./types";
import { DEFAULT_DIFFUSION_CONFIG } from "./types";

// ── Pipeline ──────────────────────────────────────────────────────────────

export class DiffusionPipeline {
  private config: DiffusionConfig;
  private sessions: Partial<DiffusionSessions> = {};
  private tokenizer: ClipTokenizer;
  private scheduler: PndmScheduler;
  private loaded = false;

  constructor(config: Partial<DiffusionConfig> = {}) {
    this.config = { ...DEFAULT_DIFFUSION_CONFIG, ...config };
    this.tokenizer = new ClipTokenizer();
    this.scheduler = new PndmScheduler();
  }

  /**
   * Load all model components (text encoder, UNet, VAE decoder).
   * Files are fetched via model-seeder proxy (lazy-cached).
   */
  async load(onProgress?: (p: DiffusionProgress) => void): Promise<void> {
    if (this.loaded) return;

    const startTime = performance.now();
    const { modelId, executionProvider } = this.config;

    // Configure ONNX Runtime
    ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
    ort.env.wasm.simd = true;

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: [executionProvider as any],
      graphOptimizationLevel: "all" as any,
    };

    // 1. Load tokenizer
    onProgress?.({
      phase: "loading-tokenizer",
      progress: 0.0,
      message: "Loading CLIP tokenizer...",
    });
    await this.tokenizer.load(modelId);

    // 2. Load text encoder (~250MB)
    onProgress?.({
      phase: "loading-text-encoder",
      progress: 0.1,
      message: "Loading text encoder (~250MB)...",
    });
    const textEncoderUrl = buildProxyUrl("text-encoder.onnx", modelId);
    this.sessions.textEncoder = await ort.InferenceSession.create(
      textEncoderUrl,
      sessionOptions,
    );
    console.log("[DiffusionPipeline] ✅ Text encoder loaded");

    // 3. Load UNet (~1.7GB — largest component)
    onProgress?.({
      phase: "loading-unet",
      progress: 0.3,
      message: "Loading UNet (~1.7GB)... this may take a moment",
    });
    const unetUrl = buildProxyUrl("unet.onnx", modelId);
    this.sessions.unet = await ort.InferenceSession.create(
      unetUrl,
      sessionOptions,
    );
    console.log("[DiffusionPipeline] ✅ UNet loaded");

    // 4. Load VAE decoder (~100MB)
    onProgress?.({
      phase: "loading-vae",
      progress: 0.8,
      message: "Loading VAE decoder (~100MB)...",
    });
    const vaeUrl = buildProxyUrl("vae-decoder.onnx", modelId);
    this.sessions.vaeDecoder = await ort.InferenceSession.create(
      vaeUrl,
      sessionOptions,
    );
    console.log("[DiffusionPipeline] ✅ VAE decoder loaded");

    this.loaded = true;
    const elapsed = performance.now() - startTime;
    onProgress?.({
      phase: "idle",
      progress: 1.0,
      message: `All models loaded in ${(elapsed / 1000).toFixed(1)}s`,
      elapsedMs: elapsed,
    });
  }

  /**
   * Generate an image from a text prompt.
   */
  async generate(
    prompt: string,
    negativePrompt?: string,
    onProgress?: (p: DiffusionProgress) => void,
  ): Promise<DiffusionResult> {
    if (!this.loaded) {
      await this.load(onProgress);
    }

    const startTime = performance.now();
    const { numSteps, guidanceScale, width, height, seed } = this.config;
    const latentHeight = height / 8;
    const latentWidth = width / 8;
    const latentChannels = 4;
    const actualSeed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);

    // ── Phase 1: Text Encoding ────────────────────────────────────────
    onProgress?.({ phase: "encoding-text", progress: 0.0, message: "Encoding prompt..." });

    const { inputIds } = this.tokenizer.encode(prompt);
    const { inputIds: uncondInputIds } = this.tokenizer.encode(negativePrompt || "");

    // Run text encoder for prompt
    const textEncoderInputs = {
      input_ids: new ort.Tensor("int64", inputIds, [1, 77]),
    };
    const textOutput = await this.sessions.textEncoder!.run(textEncoderInputs);
    const promptEmbedding = textOutput.last_hidden_state ?? textOutput[Object.keys(textOutput)[0]];

    // Run text encoder for negative prompt (classifier-free guidance)
    const uncondInputs = {
      input_ids: new ort.Tensor("int64", uncondInputIds, [1, 77]),
    };
    const uncondOutput = await this.sessions.textEncoder!.run(uncondInputs);
    const uncondEmbedding = uncondOutput.last_hidden_state ?? uncondOutput[Object.keys(uncondOutput)[0]];

    // Concatenate [uncond, cond] embeddings for CFG
    const promptData = promptEmbedding.data as Float32Array;
    const uncondData = uncondEmbedding.data as Float32Array;
    const batchedEmbedding = new Float32Array(promptData.length * 2);
    batchedEmbedding.set(uncondData, 0);
    batchedEmbedding.set(promptData, uncondData.length);

    const textEmbeddingTensor = new ort.Tensor(
      "float32",
      batchedEmbedding,
      [2, 77, promptData.length / 77],
    );

    // ── Phase 2: Denoising Loop ───────────────────────────────────────
    this.scheduler.setTimesteps(numSteps);
    let latents = generateLatentNoise(latentChannels, latentHeight, latentWidth, actualSeed);
    latents = this.scheduler.scaleInitialNoise(latents);

    for (let i = 0; i < this.scheduler.timesteps.length; i++) {
      const t = this.scheduler.timesteps[i];

      onProgress?.({
        phase: "denoising",
        progress: i / this.scheduler.timesteps.length,
        step: i + 1,
        totalSteps: numSteps,
        message: `Denoising step ${i + 1}/${numSteps}...`,
      });

      // Duplicate latents for CFG (batch of 2)
      const latentInput = new Float32Array(latents.length * 2);
      latentInput.set(latents, 0);
      latentInput.set(latents, latents.length);

      const latentTensor = new ort.Tensor(
        "float32",
        latentInput,
        [2, latentChannels, latentHeight, latentWidth],
      );

      const timestepTensor = new ort.Tensor("int64", BigInt64Array.from([BigInt(t)]), [1]);

      // Run UNet
      const unetOutput = await this.sessions.unet!.run({
        sample: latentTensor,
        timestep: timestepTensor,
        encoder_hidden_states: textEmbeddingTensor,
      });

      const noisePred = unetOutput.out_sample ?? unetOutput[Object.keys(unetOutput)[0]];
      const noiseData = noisePred.data as Float32Array;

      // Apply classifier-free guidance
      const halfLen = noiseData.length / 2;
      const guidedNoise = new Float32Array(halfLen);
      for (let j = 0; j < halfLen; j++) {
        const uncond = noiseData[j];
        const cond = noiseData[j + halfLen];
        guidedNoise[j] = uncond + guidanceScale * (cond - uncond);
      }

      // Scheduler step
      latents = this.scheduler.step(guidedNoise, t, latents);
    }

    // ── Phase 3: VAE Decoding ─────────────────────────────────────────
    onProgress?.({ phase: "decoding", progress: 0.9, message: "Decoding image..." });

    // Scale latents (1/0.18215)
    const scaledLatents = new Float32Array(latents.length);
    for (let i = 0; i < latents.length; i++) {
      scaledLatents[i] = latents[i] / 0.18215;
    }

    const latentTensor = new ort.Tensor(
      "float32",
      scaledLatents,
      [1, latentChannels, latentHeight, latentWidth],
    );

    const vaeOutput = await this.sessions.vaeDecoder!.run({
      latent_sample: latentTensor,
    });

    const decodedImage = vaeOutput.sample ?? vaeOutput[Object.keys(vaeOutput)[0]];
    const imageData = this.tensorToImageData(decodedImage.data as Float32Array, width, height);

    const elapsedMs = performance.now() - startTime;

    onProgress?.({
      phase: "complete",
      progress: 1.0,
      message: `Generated in ${(elapsedMs / 1000).toFixed(1)}s`,
      elapsedMs,
    });

    return {
      imageData,
      meta: {
        prompt,
        negativePrompt,
        config: this.config,
        elapsedMs,
        seed: actualSeed,
      },
    };
  }

  /**
   * Convert VAE output tensor to ImageData.
   * VAE outputs [-1, 1] range, 3 channels (RGB).
   */
  private tensorToImageData(
    data: Float32Array,
    width: number,
    height: number,
  ): ImageData {
    const pixels = new Uint8ClampedArray(width * height * 4);
    const channelSize = width * height;

    for (let i = 0; i < channelSize; i++) {
      const r = data[i];                     // channel 0
      const g = data[i + channelSize];       // channel 1
      const b = data[i + channelSize * 2];   // channel 2

      // Clamp from [-1, 1] to [0, 255]
      pixels[i * 4 + 0] = Math.min(255, Math.max(0, Math.round((r + 1) * 127.5)));
      pixels[i * 4 + 1] = Math.min(255, Math.max(0, Math.round((g + 1) * 127.5)));
      pixels[i * 4 + 2] = Math.min(255, Math.max(0, Math.round((b + 1) * 127.5)));
      pixels[i * 4 + 3] = 255; // alpha
    }

    return new ImageData(pixels, width, height);
  }

  /**
   * Release all ONNX sessions to free GPU/WASM memory.
   */
  async dispose(): Promise<void> {
    for (const session of Object.values(this.sessions)) {
      if (session) await session.release?.();
    }
    this.sessions = {};
    this.loaded = false;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }
}
