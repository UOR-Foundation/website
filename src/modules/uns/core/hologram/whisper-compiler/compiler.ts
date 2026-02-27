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
import { fetchViaProxy } from "../model-proxy";
import type {
  OnnxModel,
  OnnxNode,
  OnnxAttribute,
  OnnxTensor,
  OnnxExternalData,
  HologramCompiledModel,
  HologramComputeNode,
  HologramTensorDescriptor,
  CompileProgress,
} from "./types";
import { DTYPE_BYTE_SIZE } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const COMPILER_VERSION = "1.0.0";
const WHISPER_MODEL_ID = "whisper-tiny-en";

/**
 * ONNX model files for Whisper tiny.en.
 * We compile the fp16 variant for maximum WebGPU accuracy.
 */
/**
 * Use fp16 ONNX variants — half the size of fp32 (~16MB encoder, ~57MB decoder),
 * stay within edge-function memory limits, and use the SAME operator graph as fp32
 * (standard MatMul, LayerNorm, etc.) so our inference engine works correctly.
 *
 * IMPORTANT: Do NOT use quantized variants (_quantized.onnx) — those use
 * MatMulInteger/DequantizeLinear operators that our engine doesn't implement.
 * fp16 weights are auto-promoted to float32 by our ONNX parser.
 */
const ONNX_FILES = {
  encoder: "onnx/encoder_model_fp16.onnx",
  decoder: "onnx/decoder_model_merged_fp16.onnx",
} as const;

const MODEL_ID = "onnx-community/whisper-tiny.en";

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
 * Constant node attributes. Resolves external data references from
 * companion .data files.
 */
function extractAllTensors(model: OnnxModel, externalDataBuffer?: ArrayBuffer): OnnxTensor[] {
  const tensors: OnnxTensor[] = [];

  // Helper: resolve external data reference into rawData
  function resolveExternal(t: OnnxTensor): OnnxTensor {
    if (t.rawData.byteLength > 0) return t; // already has inline data
    if (!t.externalData || !externalDataBuffer) return t;

    const { offset, length } = t.externalData;
    // Calculate expected byte length from dims + dataType if length is 0
    const bytesPerElem = DTYPE_BYTE_SIZE[t.dataType] ?? 4;
    const expectedBytes = t.elementCount * bytesPerElem;
    const byteLen = length > 0 ? length : expectedBytes;

    if (offset + byteLen > externalDataBuffer.byteLength) {
      console.warn(
        `[WhisperCompiler] External data out of bounds for "${t.name}": ` +
        `offset=${offset}, len=${byteLen}, bufSize=${externalDataBuffer.byteLength}`
      );
      return t;
    }

    const rawData = new Uint8Array(externalDataBuffer, offset, byteLen);
    return { ...t, rawData };
  }

  // 1. Initializers
  for (const t of model.graph.initializers) {
    const resolved = resolveExternal(t);
    if (resolved.rawData.byteLength > 0) {
      tensors.push(resolved);
    }
  }

  // 2. Constant nodes — weights stored as attribute tensors
  for (const node of model.graph.nodes) {
    if (node.opType === "Constant") {
      for (const attr of node.attributes) {
        if (attr.t) {
          const resolved = resolveExternal(attr.t);
          if (resolved.rawData.byteLength > 0) {
            const name = node.outputs[0] || resolved.name || node.name;
            tensors.push({ ...resolved, name });
          }
        }
      }
    }
  }

  const initCount = model.graph.initializers.filter(t => resolveExternal(t).rawData.byteLength > 0).length;
  const constCount = tensors.length - initCount;
  const extCount = model.graph.initializers.filter(t => t.externalData?.location).length;
  console.log(
    `[WhisperCompiler] Tensor sources: ${initCount} initializers, ${constCount} Constant nodes ` +
    `(${tensors.length} total, ${extCount} resolved from external data)`
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

    // ── Phase 1: Download via model proxy ────────────────────────────
    onProgress?.({
      phase: "download",
      message: `Downloading ${t} model...`,
      progress: (ti * 0.5) / targets.length,
      detail: onnxFile,
    });

    console.log(`[WhisperCompiler] ⬇ Downloading via proxy: ${onnxFile}`);
    const response = await fetchViaProxy(onnxFile, MODEL_ID);
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
      progress: (ti * 0.5 + 0.1) / targets.length,
    });

    console.log(`[WhisperCompiler] 🔍 Parsing ${t} protobuf...`);
    const startParse = performance.now();
    const model = parseOnnxModel(buffer);
    const parseMs = Math.round(performance.now() - startParse);

    console.log(`[WhisperCompiler] ✓ Parsed in ${parseMs}ms`);
    console.log(summarizeModel(model));

    // Check if model uses external data files
    const initSample = model.graph.initializers.slice(0, 3).map(i => ({
      name: i.name, dims: i.dims, bytes: i.rawData.byteLength, 
      ext: i.externalData, elCount: i.elementCount
    }));
    console.log(`[WhisperCompiler] Initializer sample (first 3):`, JSON.stringify(initSample));
    
    const hasExternalData = model.graph.initializers.some(
      (init) => init.externalData?.location
    );
    console.log(`[WhisperCompiler] hasExternalData: ${hasExternalData}, initializer count: ${model.graph.initializers.length}`);
    let externalDataBuffer: ArrayBuffer | undefined;

    if (hasExternalData) {
      // Find the external data filename from the first tensor that has it
      const extFile = model.graph.initializers.find(
        (init) => init.externalData?.location
      )?.externalData?.location;

      if (extFile) {
        const dataFile = `${ONNX_FILES[t]}_data`;
        onProgress?.({
          phase: "download",
          message: `Downloading ${t} weight data...`,
          progress: (ti * 0.5 + 0.15) / targets.length,
          detail: dataFile,
        });

        console.log(`[WhisperCompiler] ⬇ Downloading external data via proxy: ${dataFile}`);
        const dataResponse = await fetchViaProxy(dataFile, MODEL_ID);
        if (!dataResponse.ok) {
          // Try alternate naming: onnx/<extFile>
          const altFile = `onnx/${extFile}`;
          console.log(`[WhisperCompiler] ⬇ Retrying: ${altFile}`);
          const altResponse = await fetchViaProxy(altFile, MODEL_ID);
          if (altResponse.ok) {
            externalDataBuffer = await altResponse.arrayBuffer();
          } else {
            throw new Error(
              `Failed to download external data for ${t}: tried ${dataFile} and ${altFile}`
            );
          }
        } else {
          externalDataBuffer = await dataResponse.arrayBuffer();
        }

        const dataSizeMB = ((externalDataBuffer?.byteLength ?? 0) / 1024 / 1024).toFixed(1);
        console.log(`[WhisperCompiler] 📦 Downloaded external data: ${dataSizeMB} MB`);
      }
    }

    // Extract metadata from decoder (has embed_tokens)
    if (t === "decoder") {
      meta = inferModelMeta(model);
    }

    // ── Phase 3: Extract compute graph ───────────────────────────────
    const graphNodes = buildComputeGraph(model.graph.nodes);
    allGraphNodes.push(...graphNodes.map((n) => ({
      ...n,
      inputs: n.inputs.map((i) => i ? `${t}/${i}` : ""),
      outputs: n.outputs.map((o) => o ? `${t}/${o}` : ""),
    })));

    // ── Phase 4: Store tensors ───────────────────────────────────────
    const allModelTensors = extractAllTensors(model, externalDataBuffer);

    onProgress?.({
      phase: "store",
      message: `Dehydrating ${t} tensors (${allModelTensors.length})...`,
      progress: (ti * 0.5 + 0.3) / targets.length,
    });

    console.log(
      `[WhisperCompiler] 💾 Storing ${allModelTensors.length} tensors...`
    );

    const tensors = await store.storeTensors(
      allModelTensors,
      (stored, total) => {
        onProgress?.({
          phase: "store",
          message: `${t}: tensor ${stored}/${total}`,
          progress: (ti * 0.5 + 0.3 + (0.2 * stored) / total) / targets.length,
          detail: allModelTensors[stored - 1]?.name,
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
