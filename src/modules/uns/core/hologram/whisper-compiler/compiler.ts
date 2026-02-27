/**
 * Whisper ONNX → Hologram Compiler
 * ═════════════════════════════════
 *
 * Downloads an ONNX model file ONCE, parses it with our inline
 * protobuf decoder, extracts all weight tensors into content-addressed
 * storage, and produces a HologramCompiledModel manifest.
 *
 * After compilation, the ONNX file and all external dependencies
 * are no longer needed. Inference will run purely through
 * Hologram vGPU WGSL compute kernels (Phase 2).
 *
 * @module uns/core/hologram/whisper-compiler/compiler
 */

import { parseOnnxModel, summarizeModel } from "./onnx-parser";
import { getWeightStore } from "./weight-store";
import type {
  OnnxModel,
  OnnxNode,
  OnnxAttribute,
  OnnxTensor,
  HologramCompiledModel,
  HologramComputeNode,
  HologramTensorDescriptor,
  CompileProgress,
} from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const COMPILER_VERSION = "1.0.0";
const WHISPER_MODEL_ID = "whisper-tiny-en";

/**
 * ONNX model files for Whisper tiny.en.
 * We compile the fp16 variant for maximum WebGPU accuracy.
 */
const ONNX_FILES = {
  encoder: "onnx/encoder_model.onnx",
  decoder: "onnx/decoder_model_merged.onnx",
} as const;

const HF_BASE = "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main";

// ── Attribute Extraction Helpers ───────────────────────────────────────────

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

/**
 * Extract all weight tensors from the model — both initializers AND
 * Constant node attributes (some ONNX exports store weights in Constant ops).
 */
function extractAllTensors(model: OnnxModel): OnnxTensor[] {
  const tensors: OnnxTensor[] = [];

  // 1. Initializers (may have data or just metadata)
  for (const t of model.graph.initializers) {
    if (t.rawData.byteLength > 0) {
      tensors.push(t);
    }
  }

  // 2. Constant nodes — weights stored as attribute tensors
  for (const node of model.graph.nodes) {
    if (node.opType === "Constant") {
      for (const attr of node.attributes) {
        if (attr.t && attr.t.rawData.byteLength > 0) {
          // Use the node's output name as the tensor name
          const name = node.outputs[0] || attr.t.name || node.name;
          tensors.push({ ...attr.t, name });
        }
      }
    }
  }

  const initCount = model.graph.initializers.filter(t => t.rawData.byteLength > 0).length;
  const constCount = tensors.length - initCount;
  console.log(
    `[WhisperCompiler] Tensor sources: ${initCount} from initializers, ${constCount} from Constant nodes (${tensors.length} total)`
  );

  return tensors;
}

function buildComputeGraph(nodes: OnnxNode[]): HologramComputeNode[] {
  return nodes.map((node) => ({
    op: node.opType,
    inputs: node.inputs,
    outputs: node.outputs,
    params: extractNodeParams(node.attributes),
  }));
}

// ── Model Metadata Extraction ──────────────────────────────────────────────

/**
 * Infer Whisper architecture metadata from the compute graph.
 * Whisper tiny.en: 4 encoder layers, 4 decoder layers, 6 heads, 384 hidden.
 */
function inferModelMeta(model: OnnxModel) {
  const nodes = model.graph.nodes;

  // Count attention layers (MultiHeadAttention or custom attention patterns)
  const layerNorms = nodes.filter((n) => n.opType === "LayerNormalization");
  // Whisper encoder has 2 LN per layer + 1 final LN
  // Whisper decoder has 3 LN per layer + 1 final LN
  // For tiny.en: encoder = 4 layers (9 LN), decoder = 4 layers (13 LN)

  // Infer from weight shapes
  const initializers = model.graph.initializers;

  let hiddenSize = 384; // default for tiny
  let vocabSize = 51865; // default for en

  // Try to find actual values from weight shapes
  for (const t of initializers) {
    if (t.name.includes("embed_tokens") && t.dims.length === 2) {
      vocabSize = t.dims[0];
      hiddenSize = t.dims[1];
    }
    if (t.name.includes("embed_positions") && t.dims.length === 2) {
      hiddenSize = t.dims[1];
    }
  }

  return {
    encoderLayers: 4,
    decoderLayers: 4,
    attentionHeads: 6,
    hiddenSize,
    vocabSize,
  };
}

// ── SHA-256 for manifest CID ───────────────────────────────────────────────

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Compiler ───────────────────────────────────────────────────────────────

export interface CompileOptions {
  /** Model variant: "encoder" or "decoder" or "both" */
  target?: "encoder" | "decoder" | "both";
  /** Progress callback */
  onProgress?: (p: CompileProgress) => void;
  /** Force recompilation even if cached */
  force?: boolean;
}

/**
 * Compile an ONNX Whisper model into Hologram's native format.
 *
 * This is the one-time operation that bridges ONNX → Hologram.
 * After this runs, the ONNX file can be discarded.
 *
 * @returns The compiled model manifest
 */
export async function compileWhisperModel(
  options: CompileOptions = {},
): Promise<HologramCompiledModel> {
  const { target = "both", onProgress, force = false } = options;

  const store = getWeightStore();
  await store.init();

  // Check cache
  const modelId = `${WHISPER_MODEL_ID}-${target}`;
  if (!force) {
    const cached = await store.loadManifest<HologramCompiledModel>(modelId);
    if (cached) {
      console.log(`[WhisperCompiler] ✅ Already compiled: ${modelId}`);
      onProgress?.({
        phase: "finalize",
        message: "Model already compiled",
        progress: 1,
      });
      return cached;
    }
  }

  const allTensors: HologramTensorDescriptor[] = [];
  const allGraphNodes: HologramComputeNode[] = [];
  let totalBytes = 0;
  let totalParams = 0;
  let meta = { encoderLayers: 4, decoderLayers: 4, attentionHeads: 6, hiddenSize: 384, vocabSize: 51865 };

  const targets = target === "both"
    ? (["encoder", "decoder"] as const)
    : [target];

  for (let ti = 0; ti < targets.length; ti++) {
    const t = targets[ti];
    const onnxFile = ONNX_FILES[t];
    const url = `${HF_BASE}/${onnxFile}`;

    // ── Phase 1: Download ────────────────────────────────────────────
    onProgress?.({
      phase: "download",
      message: `Downloading ${t} model...`,
      progress: (ti * 0.5) / targets.length,
      detail: url,
    });

    console.log(`[WhisperCompiler] ⬇ Downloading: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${t}: HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(1);
    console.log(`[WhisperCompiler] 📦 Downloaded ${t}: ${sizeMB} MB`);

    // ── Phase 2: Parse ───────────────────────────────────────────────
    onProgress?.({
      phase: "parse",
      message: `Parsing ${t} ONNX protobuf...`,
      progress: (ti * 0.5 + 0.15) / targets.length,
    });

    console.log(`[WhisperCompiler] 🔍 Parsing ${t} protobuf...`);
    const startParse = performance.now();
    const model = parseOnnxModel(buffer);
    const parseMs = Math.round(performance.now() - startParse);

    console.log(`[WhisperCompiler] ✓ Parsed in ${parseMs}ms`);
    console.log(summarizeModel(model));

    // Extract metadata from decoder (has embed_tokens)
    if (t === "decoder") {
      meta = inferModelMeta(model);
    }

    // ── Phase 3: Extract compute graph ───────────────────────────────
    const graphNodes = buildComputeGraph(model.graph.nodes);
    allGraphNodes.push(...graphNodes.map((n) => ({
      ...n,
      // Prefix node names with component for disambiguation
      inputs: n.inputs.map((i) => i ? `${t}/${i}` : ""),
      outputs: n.outputs.map((o) => o ? `${t}/${o}` : ""),
    })));

    // ── Phase 4: Store tensors ───────────────────────────────────────
    onProgress?.({
      phase: "store",
      message: `Dehydrating ${t} tensors (${model.graph.initializers.length})...`,
      progress: (ti * 0.5 + 0.3) / targets.length,
    });

    console.log(
      `[WhisperCompiler] 💾 Storing ${model.graph.initializers.length} tensors...`
    );

    const tensors = await store.storeTensors(
      model.graph.initializers,
      (stored, total) => {
        onProgress?.({
          phase: "store",
          message: `${t}: tensor ${stored}/${total}`,
          progress: (ti * 0.5 + 0.3 + (0.2 * stored) / total) / targets.length,
          detail: model.graph.initializers[stored - 1]?.name,
        });
      },
    );

    // Prefix tensor names with component
    const prefixedTensors = tensors.map((d) => ({
      ...d,
      name: `${t}/${d.name}`,
    }));

    allTensors.push(...prefixedTensors);
    totalBytes += tensors.reduce((s, d) => s + d.byteLength, 0);
    totalParams += tensors.reduce((s, d) => s + d.elementCount, 0);
  }

  // ── Phase 5: Finalize manifest ───────────────────────────────────────

  onProgress?.({
    phase: "finalize",
    message: "Building manifest...",
    progress: 0.95,
  });

  const manifestData = {
    sourceModelId: WHISPER_MODEL_ID,
    compiledAt: new Date().toISOString(),
    compilerVersion: COMPILER_VERSION,
    tensors: allTensors,
    graph: allGraphNodes,
    totalWeightBytes: totalBytes,
    totalParameters: totalParams,
    meta,
  };

  // Content-address the manifest itself
  const manifestJson = JSON.stringify(manifestData);
  const manifestCid = await sha256Hex(manifestJson);

  const compiled: HologramCompiledModel = {
    manifestCid,
    ...manifestData,
  };

  // Persist
  await store.storeManifest(modelId, compiled);
  await store.storeGraph(modelId, allGraphNodes);

  const stats = await store.stats();

  console.log(
    `[WhisperCompiler] ✅ Compilation complete!\n` +
    `  Model: ${modelId}\n` +
    `  Manifest CID: ${manifestCid.slice(0, 16)}…\n` +
    `  Tensors: ${allTensors.length}\n` +
    `  Parameters: ${totalParams.toLocaleString()}\n` +
    `  Weight size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB\n` +
    `  Graph nodes: ${allGraphNodes.length}\n` +
    `  Store: ${stats.tensorCount} tensors, ${stats.manifestCount} manifests`
  );

  onProgress?.({
    phase: "finalize",
    message: "Compilation complete",
    progress: 1,
  });

  return compiled;
}

/**
 * Check if Whisper is already compiled into Hologram.
 */
export async function isWhisperCompiled(
  target: "encoder" | "decoder" | "both" = "both",
): Promise<boolean> {
  const store = getWeightStore();
  await store.init();
  const modelId = `${WHISPER_MODEL_ID}-${target}`;
  return store.hasModel(modelId);
}

/**
 * Load a previously compiled model manifest.
 */
export async function loadCompiledWhisper(
  target: "encoder" | "decoder" | "both" = "both",
): Promise<HologramCompiledModel | null> {
  const store = getWeightStore();
  await store.init();
  const modelId = `${WHISPER_MODEL_ID}-${target}`;
  return store.loadManifest<HologramCompiledModel>(modelId);
}

/**
 * Delete compiled model and free storage.
 */
export async function deleteCompiledWhisper(
  target: "encoder" | "decoder" | "both" = "both",
): Promise<void> {
  const store = getWeightStore();
  await store.init();
  const modelId = `${WHISPER_MODEL_ID}-${target}`;
  const manifest = await store.loadManifest<HologramCompiledModel>(modelId);
  if (manifest) {
    const cids = manifest.tensors.map((t) => t.cid);
    await store.deleteModel(modelId, cids);
    console.log(`[WhisperCompiler] 🗑 Deleted: ${modelId}`);
  }
}
