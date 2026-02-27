/**
 * Hologram Diffusion Compiler
 * ════════════════════════════
 *
 * Compiles Stable Diffusion 1.5 ONNX models into Hologram's native format.
 * Mirrors the whisper-compiler architecture exactly:
 *
 *   ONNX files → onnx-parser → weight-store (content-addressed) → compute graph
 *
 * After compilation:
 *   - Zero ONNX dependency
 *   - Zero onnxruntime dependency
 *   - All weights in content-addressed IndexedDB
 *   - Inference via pure WGSL kernels on HologramGpu
 *
 * The content-addressing provides natural compression:
 *   - Identical weight tensors across repeated UNet blocks → same CID → stored once
 *   - Zero-initialized biases → single CID
 *   - Canonical deduplication at the byte level
 *
 * @module uns/core/hologram/diffusion/compiler
 */

import { parseOnnxModel, summarizeModel } from "../whisper-compiler/onnx-parser";
import { getWeightStore } from "../whisper-compiler/weight-store";
import { fetchViaProxy } from "../model-proxy";
import type {
  OnnxModel,
  OnnxTensor,
  OnnxAttribute,
  HologramCompiledModel,
  HologramComputeNode,
  HologramTensorDescriptor,
  CompileProgress,
} from "../whisper-compiler/types";
import { DTYPE_BYTE_SIZE } from "../whisper-compiler/types";

// ── Constants ──────────────────────────────────────────────────────────────

const COMPILER_VERSION = "1.0.0-diffusion";
const SD_MODEL_ID = "sd15-hologram";
const HF_MODEL_ID = "microsoft/stable-diffusion-v1.5-webnn";

/** SD 1.5 ONNX components */
const SD_COMPONENTS = {
  textEncoder: "text-encoder.onnx",
  unet: "unet.onnx",
  vaeDecoder: "vae-decoder.onnx",
} as const;

type SdComponent = keyof typeof SD_COMPONENTS;

// ── Helpers ────────────────────────────────────────────────────────────────

function extractNodeParams(attrs: OnnxAttribute[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const attr of attrs) {
    if (attr.f !== undefined) params[attr.name] = attr.f;
    else if (attr.i !== undefined) params[attr.name] = attr.i;
    else if (attr.s !== undefined) params[attr.name] = attr.s;
    else if (attr.ints && attr.ints.length > 0) params[attr.name] = attr.ints;
    else if (attr.floats && attr.floats.length > 0) params[attr.name] = attr.floats;
  }
  return params;
}

function extractAllTensors(model: OnnxModel): OnnxTensor[] {
  const tensors: OnnxTensor[] = [];

  // Initializers
  for (const t of model.graph.initializers) {
    if (t.rawData.byteLength > 0) tensors.push(t);
  }

  // Constant nodes
  for (const node of model.graph.nodes) {
    if (node.opType === "Constant") {
      for (const attr of node.attributes) {
        if (attr.t && attr.t.rawData.byteLength > 0) {
          const name = node.outputs[0] || attr.t.name || node.name;
          tensors.push({ ...attr.t, name });
        }
      }
    }
  }

  return tensors;
}

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Compiler ───────────────────────────────────────────────────────────────

export interface DiffusionCompileOptions {
  /** Which components to compile */
  components?: SdComponent[];
  /** Progress callback */
  onProgress?: (p: CompileProgress) => void;
  /** Force recompilation */
  force?: boolean;
  /** HuggingFace model ID (default: microsoft/stable-diffusion-v1.5-webnn) */
  modelId?: string;
}

/**
 * Compile SD 1.5 ONNX models into Hologram's native format.
 *
 * This is the one-time operation. After compilation:
 *   - ONNX files can be discarded
 *   - All weights are content-addressed in IndexedDB
 *   - Inference runs purely through WGSL compute kernels
 */
export async function compileDiffusionModel(
  options: DiffusionCompileOptions = {},
): Promise<HologramCompiledModel> {
  const {
    components = ["textEncoder", "unet", "vaeDecoder"],
    onProgress,
    force = false,
    modelId = HF_MODEL_ID,
  } = options;

  const store = getWeightStore();
  await store.init();

  const cacheKey = `${SD_MODEL_ID}-${components.sort().join("+")}`;

  if (!force) {
    const cached = await store.loadManifest<HologramCompiledModel>(cacheKey);
    if (cached) {
      console.log(`[DiffusionCompiler] ✅ Already compiled: ${cacheKey}`);
      onProgress?.({ phase: "finalize", message: "Already compiled", progress: 1 });
      return cached;
    }
  }

  const allTensors: HologramTensorDescriptor[] = [];
  const allGraphNodes: HologramComputeNode[] = [];
  let totalBytes = 0;
  let totalParams = 0;
  let dedupSaved = 0;
  const cidSet = new Set<string>();

  for (let ci = 0; ci < components.length; ci++) {
    const comp = components[ci];
    const onnxFile = SD_COMPONENTS[comp];
    const progressBase = ci / components.length;
    const progressScale = 1 / components.length;

    // ── Download ──────────────────────────────────────────────────
    onProgress?.({
      phase: "download",
      message: `Downloading ${comp}...`,
      progress: progressBase,
      detail: onnxFile,
    });

    console.log(`[DiffusionCompiler] ⬇ Downloading: ${onnxFile}`);
    const response = await fetchViaProxy(onnxFile, modelId);
    if (!response.ok) {
      throw new Error(`Failed to download ${comp}: HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(1);
    console.log(`[DiffusionCompiler] 📦 ${comp}: ${sizeMB} MB`);

    // ── Parse ─────────────────────────────────────────────────────
    onProgress?.({
      phase: "parse",
      message: `Parsing ${comp} protobuf...`,
      progress: progressBase + progressScale * 0.1,
    });

    const startParse = performance.now();
    const model = parseOnnxModel(buffer);
    const parseMs = Math.round(performance.now() - startParse);
    console.log(`[DiffusionCompiler] ✓ Parsed ${comp} in ${parseMs}ms`);
    console.log(summarizeModel(model));

    // ── Compute graph ─────────────────────────────────────────────
    const graphNodes: HologramComputeNode[] = model.graph.nodes.map((node) => ({
      op: node.opType,
      inputs: node.inputs.map((i) => i ? `${comp}/${i}` : ""),
      outputs: node.outputs.map((o) => o ? `${comp}/${o}` : ""),
      params: extractNodeParams(node.attributes),
    }));
    allGraphNodes.push(...graphNodes);

    // ── Store tensors (content-addressed) ─────────────────────────
    const tensors = extractAllTensors(model);

    onProgress?.({
      phase: "store",
      message: `Dehydrating ${comp} tensors (${tensors.length})...`,
      progress: progressBase + progressScale * 0.3,
    });

    const descriptors = await store.storeTensors(
      tensors,
      (stored, total) => {
        onProgress?.({
          phase: "store",
          message: `${comp}: tensor ${stored}/${total}`,
          progress: progressBase + progressScale * (0.3 + (0.6 * stored) / total),
          detail: tensors[stored - 1]?.name,
        });
      },
    );

    // Track deduplication
    for (const desc of descriptors) {
      if (cidSet.has(desc.cid)) {
        dedupSaved += desc.byteLength;
      } else {
        cidSet.add(desc.cid);
      }
    }

    const prefixed = descriptors.map((d) => ({
      ...d,
      name: `${comp}/${d.name}`,
    }));
    allTensors.push(...prefixed);
    totalBytes += descriptors.reduce((s, d) => s + d.byteLength, 0);
    totalParams += descriptors.reduce((s, d) => s + d.elementCount, 0);
  }

  // ── Finalize manifest ────────────────────────────────────────────────
  onProgress?.({
    phase: "finalize",
    message: "Building manifest...",
    progress: 0.95,
  });

  const manifestData = {
    sourceModelId: SD_MODEL_ID,
    compiledAt: new Date().toISOString(),
    compilerVersion: COMPILER_VERSION,
    tensors: allTensors,
    graph: allGraphNodes,
    totalWeightBytes: totalBytes,
    totalParameters: totalParams,
    meta: {
      encoderLayers: 0,
      decoderLayers: 0,
      attentionHeads: 8,
      hiddenSize: 768,
      vocabSize: 49408,
    },
  };

  const manifestCid = await sha256Hex(JSON.stringify(manifestData));

  const compiled: HologramCompiledModel = {
    manifestCid,
    ...manifestData,
  };

  await store.storeManifest(cacheKey, compiled);
  await store.storeGraph(cacheKey, allGraphNodes);

  const stats = await store.stats();
  const dedupPct = totalBytes > 0 ? ((dedupSaved / totalBytes) * 100).toFixed(1) : "0";

  console.log(
    `[DiffusionCompiler] ✅ Compilation complete!\n` +
    `  Model: ${cacheKey}\n` +
    `  Manifest CID: ${manifestCid.slice(0, 16)}…\n` +
    `  Tensors: ${allTensors.length} (${cidSet.size} unique CIDs)\n` +
    `  Parameters: ${totalParams.toLocaleString()}\n` +
    `  Weight size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB\n` +
    `  Dedup savings: ${(dedupSaved / 1024 / 1024).toFixed(1)} MB (${dedupPct}%)\n` +
    `  Graph nodes: ${allGraphNodes.length}\n` +
    `  Store: ${stats.tensorCount} tensors, ${stats.manifestCount} manifests`
  );

  onProgress?.({ phase: "finalize", message: "Complete", progress: 1 });

  return compiled;
}

/**
 * Check if SD 1.5 is compiled into Hologram.
 */
export async function isDiffusionCompiled(
  components: SdComponent[] = ["textEncoder", "unet", "vaeDecoder"],
): Promise<boolean> {
  const store = getWeightStore();
  await store.init();
  const cacheKey = `${SD_MODEL_ID}-${components.sort().join("+")}`;
  return store.hasModel(cacheKey);
}

/**
 * Load a previously compiled diffusion manifest.
 */
export async function loadCompiledDiffusion(
  components: SdComponent[] = ["textEncoder", "unet", "vaeDecoder"],
): Promise<HologramCompiledModel | null> {
  const store = getWeightStore();
  await store.init();
  const cacheKey = `${SD_MODEL_ID}-${components.sort().join("+")}`;
  return store.loadManifest<HologramCompiledModel>(cacheKey);
}

/**
 * Delete compiled diffusion model.
 */
export async function deleteCompiledDiffusion(
  components: SdComponent[] = ["textEncoder", "unet", "vaeDecoder"],
): Promise<void> {
  const store = getWeightStore();
  await store.init();
  const cacheKey = `${SD_MODEL_ID}-${components.sort().join("+")}`;
  const manifest = await store.loadManifest<HologramCompiledModel>(cacheKey);
  if (manifest) {
    await store.deleteModel(cacheKey, manifest.tensors.map((t) => t.cid));
  }
}
