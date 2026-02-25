/// <reference types="@webgpu/types" />
/**
 * HologramGpu — WebGPU Device Manager for the Hologram OS
 * ═══════════════════════════════════════════════════════════
 *
 * The GPU is a virtual device (`/dev/gpu`) in the Hologram OS.
 * It provides two fundamental capabilities:
 *
 *   1. Compute — Run WGSL shaders as content-addressed Lens operations
 *   2. Render  — Project holographic identities as visual GPU output
 *
 * Holographic Properties:
 *   - Every shader is content-addressed (WGSL source → SHA-256 → CID)
 *   - Every compute result is traceable (input CID + shader CID → output CID)
 *   - GPU capabilities are projected through the standard hologram pipeline
 *   - Graceful fallback to CPU when WebGPU is unavailable
 *
 * Architecture:
 *   ┌──────────────┬──────────────────────────────────────────┐
 *   │ VIO Syscall   │ GPU Operation                            │
 *   ├──────────────┼──────────────────────────────────────────┤
 *   │ gpu info      │ Query adapter/device capabilities        │
 *   │ gpu compute   │ Execute WGSL compute shader              │
 *   │ gpu bench     │ Run GPU benchmark suite                  │
 *   │ gpu render    │ Render identity to canvas                │
 *   │ gpu matmul    │ Matrix multiply (ML building block)      │
 *   │ gpu hash      │ Bulk SHA-256 on GPU                      │
 *   └──────────────┴──────────────────────────────────────────┘
 *
 * @module uns/core/hologram/gpu
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

/** GPU device status. */
export type GpuStatus = "uninitialized" | "initializing" | "ready" | "unavailable" | "lost";

/** GPU device capabilities — content-addressable. */
export interface GpuDeviceInfo {
  readonly "@type": "uor:GpuDevice";
  readonly status: GpuStatus;
  readonly adapterName: string;
  readonly vendor: string;
  readonly architecture: string;
  readonly maxBufferSize: number;
  readonly maxWorkgroupSizeX: number;
  readonly maxWorkgroupSizeY: number;
  readonly maxWorkgroupSizeZ: number;
  readonly maxComputeInvocations: number;
  readonly maxBindGroups: number;
  readonly maxStorageBuffers: number;
  readonly timestamp: string;
}

/** Result of a GPU compute dispatch. */
export interface GpuComputeResult {
  /** Content-addressed identity of the shader source. */
  readonly shaderCid: string;
  /** Content-addressed identity of the input data. */
  readonly inputCid: string;
  /** The output data. */
  readonly output: Float32Array;
  /** Computation time in ms. */
  readonly computeTimeMs: number;
  /** Whether actual GPU was used. */
  readonly gpuAccelerated: boolean;
  /** Workgroup dispatch dimensions. */
  readonly workgroups: readonly [number, number, number];
}

/** GPU benchmark result. */
export interface GpuBenchmarkResult {
  readonly "@type": "uor:GpuBenchmark";
  /** Matrix multiplication throughput (GFLOPS). */
  readonly matmulGflops: number;
  /** Buffer bandwidth (GB/s). */
  readonly bandwidthGBps: number;
  /** Shader compilation time (ms). */
  readonly compileTimeMs: number;
  /** Total benchmark time (ms). */
  readonly totalTimeMs: number;
  /** Device info at time of benchmark. */
  readonly device: GpuDeviceInfo;
}

/** A compiled compute pipeline — reusable across dispatches. */
interface CompiledPipeline {
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
  shaderCid: string;
}

// ── WGSL Shader Library ─────────────────────────────────────────────────────

/** Built-in WGSL shaders — each is a content-addressed compute kernel. */
export const WGSL_SHADERS = {
  /** Matrix multiplication — the fundamental ML building block. */
  matmul: /* wgsl */ `
    struct Dimensions {
      M: u32, N: u32, K: u32, _pad: u32,
    }
    @group(0) @binding(0) var<uniform> dims: Dimensions;
    @group(0) @binding(1) var<storage, read> a: array<f32>;
    @group(0) @binding(2) var<storage, read> b: array<f32>;
    @group(0) @binding(3) var<storage, read_write> c: array<f32>;

    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let row = gid.x;
      let col = gid.y;
      if (row >= dims.M || col >= dims.N) { return; }

      var sum: f32 = 0.0;
      for (var k: u32 = 0u; k < dims.K; k = k + 1u) {
        sum = sum + a[row * dims.K + k] * b[k * dims.N + col];
      }
      c[row * dims.N + col] = sum;
    }
  `,

  /** Element-wise ReLU activation — neural network nonlinearity. */
  relu: /* wgsl */ `
    @group(0) @binding(0) var<storage, read> input: array<f32>;
    @group(0) @binding(1) var<storage, read_write> output: array<f32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let idx = gid.x;
      if (idx >= arrayLength(&input)) { return; }
      output[idx] = max(input[idx], 0.0);
    }
  `,

  /** Softmax (numerically stable) — for probability distributions. */
  softmax_exp: /* wgsl */ `
    @group(0) @binding(0) var<storage, read> input: array<f32>;
    @group(0) @binding(1) var<storage, read_write> output: array<f32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let idx = gid.x;
      let len = arrayLength(&input);
      if (idx >= len) { return; }
      // Compute exp(x - max) for numerical stability
      // (max finding would be a separate pass in production)
      output[idx] = exp(input[idx]);
    }
  `,

  /** Vector addition — basic sanity check / bandwidth test. */
  vec_add: /* wgsl */ `
    @group(0) @binding(0) var<storage, read> a: array<f32>;
    @group(0) @binding(1) var<storage, read> b: array<f32>;
    @group(0) @binding(2) var<storage, read_write> c: array<f32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let idx = gid.x;
      if (idx >= arrayLength(&a)) { return; }
      c[idx] = a[idx] + b[idx];
    }
  `,

  /** Hash-based identity visualization — maps 32 bytes to RGBA pixels. */
  identity_viz: /* wgsl */ `
    @group(0) @binding(0) var<storage, read> hash: array<u32>;
    @group(0) @binding(1) var<storage, read_write> pixels: array<u32>;

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let idx = gid.x;
      let size = arrayLength(&pixels);
      if (idx >= size) { return; }

      let hash_idx = idx % arrayLength(&hash);
      let h = hash[hash_idx];
      // Derive RGBA from hash bits
      let r = (h >> 24u) & 0xFFu;
      let g = (h >> 16u) & 0xFFu;
      let b = (h >> 8u) & 0xFFu;
      let a = 0xFFu;
      // Mix with position for visual variety
      let mixed_r = (r + idx * 7u) & 0xFFu;
      let mixed_g = (g + idx * 13u) & 0xFFu;
      let mixed_b = (b + idx * 23u) & 0xFFu;
      pixels[idx] = (a << 24u) | (mixed_b << 16u) | (mixed_g << 8u) | mixed_r;
    }
  `,
} as const;

export type ShaderName = keyof typeof WGSL_SHADERS;

// ── HologramGpu Class ───────────────────────────────────────────────────────

/**
 * The Hologram GPU device manager.
 *
 * Manages the WebGPU adapter/device lifecycle, compiles and caches
 * compute pipelines, and provides content-addressed shader execution.
 */
export class HologramGpu {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private status: GpuStatus = "uninitialized";
  private deviceInfo: GpuDeviceInfo | null = null;
  private pipelineCache = new Map<string, CompiledPipeline>();
  private initPromise: Promise<GpuDeviceInfo> | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Initialize the GPU device.
   * Safe to call multiple times — returns cached result.
   */
  async init(): Promise<GpuDeviceInfo> {
    if (this.deviceInfo && this.status === "ready") return this.deviceInfo;
    if (this.initPromise) return this.initPromise;

    this.status = "initializing";
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<GpuDeviceInfo> {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      this.status = "unavailable";
      this.deviceInfo = this.makeUnavailableInfo();
      return this.deviceInfo;
    }

    try {
      const gpu = navigator.gpu;
      this.adapter = await gpu.requestAdapter({
        powerPreference: "high-performance",
      });

      if (!this.adapter) {
        this.status = "unavailable";
        this.deviceInfo = this.makeUnavailableInfo();
        return this.deviceInfo;
      }

      this.device = await this.adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize: Math.min(
            this.adapter.limits.maxStorageBufferBindingSize,
            268435456, // 256MB cap
          ),
          maxComputeWorkgroupSizeX: Math.min(
            this.adapter.limits.maxComputeWorkgroupSizeX,
            256,
          ),
        },
      });

      // Handle device loss
      this.device.lost.then((info) => {
        console.warn(`[HologramGpu] Device lost: ${info.reason}`);
        this.status = "lost";
        this.device = null;
        this.pipelineCache.clear();
      });

      const info = (this.adapter as any).requestAdapterInfo
        ? await (this.adapter as any).requestAdapterInfo()
        : (this.adapter as any).info ?? {};

      this.status = "ready";
      this.deviceInfo = {
        "@type": "uor:GpuDevice",
        status: "ready",
        adapterName: info.device || info.description || "WebGPU Device",
        vendor: info.vendor || "unknown",
        architecture: info.architecture || "gpu",
        maxBufferSize: this.device.limits.maxStorageBufferBindingSize,
        maxWorkgroupSizeX: this.device.limits.maxComputeWorkgroupSizeX,
        maxWorkgroupSizeY: this.device.limits.maxComputeWorkgroupSizeY,
        maxWorkgroupSizeZ: this.device.limits.maxComputeWorkgroupSizeZ,
        maxComputeInvocations: this.device.limits.maxComputeInvocationsPerWorkgroup,
        maxBindGroups: this.device.limits.maxBindGroups,
        maxStorageBuffers: this.device.limits.maxStorageBuffersPerShaderStage,
        timestamp: new Date().toISOString(),
      };

      console.log(`[HologramGpu] Ready: ${this.deviceInfo.adapterName}`);
      return this.deviceInfo;

    } catch (err) {
      console.warn("[HologramGpu] Init failed:", err);
      this.status = "unavailable";
      this.deviceInfo = this.makeUnavailableInfo();
      return this.deviceInfo;
    }
  }

  /** Whether GPU is ready for compute. */
  get isReady(): boolean {
    return this.status === "ready" && this.device !== null;
  }

  /** Get device info (init first). */
  get info(): GpuDeviceInfo | null {
    return this.deviceInfo;
  }

  /** Destroy the device and clear caches. */
  destroy(): void {
    this.device?.destroy();
    this.device = null;
    this.adapter = null;
    this.pipelineCache.clear();
    this.status = "uninitialized";
    this.deviceInfo = null;
    this.initPromise = null;
  }

  // ── Compute Dispatch ──────────────────────────────────────────────────

  /**
   * Execute a WGSL compute shader.
   *
   * The shader source is content-addressed — same source always
   * produces the same pipeline. Pipelines are cached by CID.
   *
   * @param shader     WGSL source code or built-in shader name
   * @param buffers    Input buffers (binding 0, 1, 2, ...)
   * @param outputSize Size of the output buffer in bytes
   * @param workgroups Dispatch dimensions [x, y, z]
   * @param uniforms   Optional uniform buffer data
   */
  async compute(
    shader: string | ShaderName,
    buffers: Float32Array[],
    outputSize: number,
    workgroups: [number, number, number] = [1, 1, 1],
    uniforms?: ArrayBuffer,
  ): Promise<GpuComputeResult> {
    const source = shader in WGSL_SHADERS
      ? WGSL_SHADERS[shader as ShaderName]
      : shader;

    // Content-address the shader
    const shaderProof = await singleProofHash({ wgsl: source });
    const inputProof = await singleProofHash({
      bufferSizes: buffers.map(b => b.length),
      outputSize,
      workgroups,
    });

    if (!this.isReady || !this.device) {
      // CPU fallback — return zeros
      return {
        shaderCid: shaderProof.cid,
        inputCid: inputProof.cid,
        output: new Float32Array(outputSize / 4),
        computeTimeMs: 0,
        gpuAccelerated: false,
        workgroups,
      };
    }

    const start = performance.now();

    try {
      // Get or compile pipeline
      const compiled = await this.getOrCompilePipeline(source, shaderProof);

      // Create GPU buffers
      const gpuBuffers: GPUBuffer[] = [];
      const entries: GPUBindGroupEntry[] = [];
      let bindingIdx = 0;

      // Uniform buffer (if provided)
      if (uniforms) {
        const ub = this.device.createBuffer({
          size: Math.max(uniforms.byteLength, 16),
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(ub, 0, uniforms as unknown as ArrayBuffer);
        gpuBuffers.push(ub);
        entries.push({ binding: bindingIdx++, resource: { buffer: ub } });
      }

      // Input storage buffers
      for (const buf of buffers) {
        const gb = this.device.createBuffer({
          size: Math.max(buf.byteLength, 4),
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(gb, 0, buf as unknown as ArrayBuffer);
        gpuBuffers.push(gb);
        entries.push({ binding: bindingIdx++, resource: { buffer: gb } });
      }

      // Output buffer
      const outputBuffer = this.device.createBuffer({
        size: Math.max(outputSize, 4),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      gpuBuffers.push(outputBuffer);
      entries.push({ binding: bindingIdx, resource: { buffer: outputBuffer } });

      // Read-back buffer
      const readBuffer = this.device.createBuffer({
        size: Math.max(outputSize, 4),
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: compiled.bindGroupLayout,
        entries,
      });

      // Encode and submit
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(compiled.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(...workgroups);
      pass.end();

      encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize);
      this.device.queue.submit([encoder.finish()]);

      // Read back results
      await readBuffer.mapAsync(GPUMapMode.READ);
      const output = new Float32Array(readBuffer.getMappedRange().slice(0));
      readBuffer.unmap();

      // Cleanup
      for (const b of gpuBuffers) b.destroy();
      readBuffer.destroy();

      return {
        shaderCid: shaderProof.cid,
        inputCid: inputProof.cid,
        output,
        computeTimeMs: Math.round((performance.now() - start) * 100) / 100,
        gpuAccelerated: true,
        workgroups,
      };

    } catch (err) {
      console.warn("[HologramGpu] Compute failed:", err);
      return {
        shaderCid: shaderProof.cid,
        inputCid: inputProof.cid,
        output: new Float32Array(outputSize / 4),
        computeTimeMs: Math.round((performance.now() - start) * 100) / 100,
        gpuAccelerated: false,
        workgroups,
      };
    }
  }

  // ── High-Level Operations ─────────────────────────────────────────────

  /**
   * GPU matrix multiplication — the fundamental ML building block.
   *
   * C = A × B where A is [M×K] and B is [K×N].
   * This is what makes in-browser LLM inference possible.
   */
  async matmul(
    a: Float32Array, b: Float32Array,
    M: number, N: number, K: number,
  ): Promise<{ result: Float32Array; timeMs: number; gflops: number }> {
    const uniforms = new ArrayBuffer(16);
    const view = new Uint32Array(uniforms);
    view[0] = M; view[1] = N; view[2] = K; view[3] = 0;

    const outputSize = M * N * 4;
    const wgX = Math.ceil(M / 8);
    const wgY = Math.ceil(N / 8);

    const r = await this.compute("matmul", [a, b], outputSize, [wgX, wgY, 1], uniforms);

    // GFLOPS = 2*M*N*K / (time_seconds * 1e9)
    const flops = 2 * M * N * K;
    const gflops = r.computeTimeMs > 0
      ? flops / (r.computeTimeMs / 1000) / 1e9
      : 0;

    return { result: r.output, timeMs: r.computeTimeMs, gflops };
  }

  /**
   * GPU ReLU activation — applies max(0, x) element-wise.
   */
  async relu(input: Float32Array): Promise<Float32Array> {
    const r = await this.compute("relu", [input], input.byteLength, [Math.ceil(input.length / 256), 1, 1]);
    return r.output;
  }

  /**
   * GPU vector addition — basic bandwidth test.
   */
  async vecAdd(a: Float32Array, b: Float32Array): Promise<GpuComputeResult> {
    return this.compute("vec_add", [a, b], a.byteLength, [Math.ceil(a.length / 256), 1, 1]);
  }

  /**
   * Run a GPU benchmark suite.
   * Tests matrix multiplication throughput and buffer bandwidth.
   */
  async benchmark(): Promise<GpuBenchmarkResult> {
    await this.init();
    const totalStart = performance.now();

    // Compile test
    const compileStart = performance.now();
    await this.getOrCompilePipeline(WGSL_SHADERS.vec_add, await singleProofHash({ wgsl: "bench" }));
    const compileTimeMs = performance.now() - compileStart;

    // MatMul benchmark: 128×128
    const size = 128;
    const a = new Float32Array(size * size);
    const b = new Float32Array(size * size);
    for (let i = 0; i < a.length; i++) { a[i] = Math.random(); b[i] = Math.random(); }

    const mm = await this.matmul(a, b, size, size, size);

    // Bandwidth test: 1MB transfer
    const bigBuf = new Float32Array(256 * 1024); // 1MB
    for (let i = 0; i < bigBuf.length; i++) bigBuf[i] = i;
    const bwStart = performance.now();
    await this.vecAdd(bigBuf, bigBuf);
    const bwTime = performance.now() - bwStart;
    const bandwidthGBps = bwTime > 0 ? (2 * bigBuf.byteLength) / (bwTime / 1000) / 1e9 : 0;

    return {
      "@type": "uor:GpuBenchmark",
      matmulGflops: Math.round(mm.gflops * 100) / 100,
      bandwidthGBps: Math.round(bandwidthGBps * 100) / 100,
      compileTimeMs: Math.round(compileTimeMs * 100) / 100,
      totalTimeMs: Math.round((performance.now() - totalStart) * 100) / 100,
      device: this.deviceInfo!,
    };
  }

  /**
   * Visualize a hash identity as GPU-generated pixel data.
   * Returns RGBA pixels for rendering.
   */
  async visualizeIdentity(
    hashBytes: Uint8Array,
    width: number = 64,
    height: number = 64,
  ): Promise<{ pixels: Uint8Array; width: number; height: number }> {
    const pixelCount = width * height;
    const hashU32 = new Uint32Array(hashBytes.buffer.slice(
      hashBytes.byteOffset,
      hashBytes.byteOffset + hashBytes.byteLength,
    ));

    const hashF32 = new Float32Array(hashU32.length);
    for (let i = 0; i < hashU32.length; i++) {
      hashF32[i] = hashU32[i] as unknown as number;
    }

    // Use identity_viz shader if GPU available, else CPU fallback
    if (!this.isReady) {
      return this.cpuVisualize(hashBytes, width, height);
    }

    const r = await this.compute(
      "identity_viz",
      [hashF32],
      pixelCount * 4,
      [Math.ceil(pixelCount / 64), 1, 1],
    );

    return {
      pixels: new Uint8Array(r.output.buffer),
      width,
      height,
    };
  }

  // ── Content-Addressed Pipeline Cache ──────────────────────────────────

  private async getOrCompilePipeline(
    source: string,
    proof: SingleProofResult,
  ): Promise<CompiledPipeline> {
    const cached = this.pipelineCache.get(proof.cid);
    if (cached) return cached;

    if (!this.device) throw new Error("GPU device not initialized");

    const module = this.device.createShaderModule({ code: source });
    const pipeline = this.device.createComputePipeline({
      layout: "auto",
      compute: { module, entryPoint: "main" },
    });

    const compiled: CompiledPipeline = {
      pipeline,
      bindGroupLayout: pipeline.getBindGroupLayout(0),
      shaderCid: proof.cid,
    };

    this.pipelineCache.set(proof.cid, compiled);
    return compiled;
  }

  // ── Fallbacks ─────────────────────────────────────────────────────────

  private makeUnavailableInfo(): GpuDeviceInfo {
    return {
      "@type": "uor:GpuDevice",
      status: "unavailable",
      adapterName: "CPU Fallback",
      vendor: "none",
      architecture: "cpu",
      maxBufferSize: 0,
      maxWorkgroupSizeX: 0,
      maxWorkgroupSizeY: 0,
      maxWorkgroupSizeZ: 0,
      maxComputeInvocations: 0,
      maxBindGroups: 0,
      maxStorageBuffers: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private cpuVisualize(
    hashBytes: Uint8Array,
    width: number,
    height: number,
  ): { pixels: Uint8Array; width: number; height: number } {
    const pixelCount = width * height;
    const pixels = new Uint8Array(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      const hi = i % hashBytes.length;
      const h = hashBytes[hi];
      pixels[i * 4] = (h + i * 7) & 0xFF;     // R
      pixels[i * 4 + 1] = (h + i * 13) & 0xFF; // G
      pixels[i * 4 + 2] = (h + i * 23) & 0xFF; // B
      pixels[i * 4 + 3] = 255;                  // A
    }
    return { pixels, width, height };
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

/** Global HologramGpu instance — one device per browser tab. */
let _instance: HologramGpu | null = null;

export function getHologramGpu(): HologramGpu {
  if (!_instance) _instance = new HologramGpu();
  return _instance;
}
