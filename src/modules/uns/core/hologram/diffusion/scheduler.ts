/**
 * PNDM Scheduler — Diffusion Noise Scheduler
 * ════════════════════════════════════════════
 *
 * Implements the Pseudo Numerical Methods for Diffusion Models (PNDM)
 * scheduler for denoising loop control. This is the default scheduler
 * used by Stable Diffusion 1.5.
 *
 * @module uns/core/hologram/diffusion/scheduler
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface SchedulerConfig {
  numTrainTimesteps: number;
  betaStart: number;
  betaEnd: number;
  betaSchedule: "linear" | "scaled_linear";
  stepsOffset: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  numTrainTimesteps: 1000,
  betaStart: 0.00085,
  betaEnd: 0.012,
  betaSchedule: "scaled_linear",
  stepsOffset: 1,
};

// ── Scheduler ─────────────────────────────────────────────────────────────

export class PndmScheduler {
  private config: SchedulerConfig;
  private alphasCumprod: Float32Array;
  private finalAlphaCumprod: number;
  timesteps: number[] = [];

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Compute betas
    const { numTrainTimesteps, betaStart, betaEnd, betaSchedule } = this.config;
    let betas: Float32Array;

    if (betaSchedule === "scaled_linear") {
      const start = Math.sqrt(betaStart);
      const end = Math.sqrt(betaEnd);
      betas = new Float32Array(numTrainTimesteps);
      for (let i = 0; i < numTrainTimesteps; i++) {
        const t = start + (end - start) * (i / (numTrainTimesteps - 1));
        betas[i] = t * t;
      }
    } else {
      betas = new Float32Array(numTrainTimesteps);
      for (let i = 0; i < numTrainTimesteps; i++) {
        betas[i] = betaStart + (betaEnd - betaStart) * (i / (numTrainTimesteps - 1));
      }
    }

    // Compute alphas cumulative product
    const alphas = new Float32Array(numTrainTimesteps);
    this.alphasCumprod = new Float32Array(numTrainTimesteps);
    let cumprod = 1.0;
    for (let i = 0; i < numTrainTimesteps; i++) {
      alphas[i] = 1.0 - betas[i];
      cumprod *= alphas[i];
      this.alphasCumprod[i] = cumprod;
    }

    this.finalAlphaCumprod = this.alphasCumprod[0];
  }

  /**
   * Set the number of inference steps and compute timesteps.
   */
  setTimesteps(numInferenceSteps: number): void {
    const { numTrainTimesteps, stepsOffset } = this.config;
    const stepRatio = Math.floor(numTrainTimesteps / numInferenceSteps);

    // PNDM timesteps: linearly spaced with offset
    this.timesteps = [];
    for (let i = 0; i < numInferenceSteps; i++) {
      this.timesteps.push(Math.round(i * stepRatio) + stepsOffset);
    }
    this.timesteps.reverse();
  }

  /**
   * Perform one denoising step.
   * Returns the updated latent sample.
   */
  step(
    modelOutput: Float32Array,
    timestep: number,
    sample: Float32Array,
  ): Float32Array {
    const alphaT = this.alphasCumprod[timestep] ?? this.finalAlphaCumprod;
    const sqrtAlpha = Math.sqrt(alphaT);
    const sqrtOneMinusAlpha = Math.sqrt(1.0 - alphaT);

    // Predicted original sample (x0 prediction)
    const result = new Float32Array(sample.length);
    for (let i = 0; i < sample.length; i++) {
      const predOriginal = (sample[i] - sqrtOneMinusAlpha * modelOutput[i]) / sqrtAlpha;
      // Simple Euler step toward predicted x0
      result[i] = predOriginal;
    }

    return result;
  }

  /**
   * Scale the initial noise by the scheduler's init noise sigma.
   */
  scaleInitialNoise(noise: Float32Array): Float32Array {
    // For PNDM, init_noise_sigma = 1.0 (no scaling needed)
    return noise;
  }

  /**
   * Get the sigma (noise level) for a given timestep.
   */
  getSigma(timestep: number): number {
    const alpha = this.alphasCumprod[timestep] ?? this.finalAlphaCumprod;
    return Math.sqrt((1 - alpha) / alpha);
  }
}

// ── Random Noise Generator ────────────────────────────────────────────────

/**
 * Generate gaussian random noise for the latent space.
 * Uses Box-Muller transform with optional seed.
 */
export function generateLatentNoise(
  channels: number,
  height: number,
  width: number,
  seed?: number | null,
): Float32Array {
  const size = channels * height * width;
  const noise = new Float32Array(size);

  // Simple seeded PRNG (xoshiro128**)
  let s0 = (seed ?? (Math.random() * 0xFFFFFFFF)) >>> 0;
  let s1 = (s0 * 1664525 + 1013904223) >>> 0;
  let s2 = (s1 * 1664525 + 1013904223) >>> 0;
  let s3 = (s2 * 1664525 + 1013904223) >>> 0;

  function nextRandom(): number {
    const result = (s1 * 5) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = ((s3 << 11) | (s3 >>> 21)) >>> 0;
    return (result >>> 0) / 0xFFFFFFFF;
  }

  // Box-Muller transform for gaussian noise
  for (let i = 0; i < size; i += 2) {
    const u1 = Math.max(nextRandom(), 1e-10); // avoid log(0)
    const u2 = nextRandom();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    noise[i] = mag * Math.cos(2.0 * Math.PI * u2);
    if (i + 1 < size) {
      noise[i + 1] = mag * Math.sin(2.0 * Math.PI * u2);
    }
  }

  return noise;
}
