/**
 * Whisper Compiler — Type Definitions
 * ════════════════════════════════════
 *
 * Types for the ONNX→Hologram compilation pipeline.
 * No external dependencies.
 *
 * @module uns/core/hologram/whisper-compiler/types
 */

// ── ONNX Data Types ────────────────────────────────────────────────────────

/** ONNX TensorProto.DataType enum (subset we care about) */
export const OnnxDataType = {
  FLOAT:    1,
  UINT8:    2,
  INT8:     3,
  INT16:    5,
  INT32:    6,
  INT64:    7,
  FLOAT16: 10,
  DOUBLE:  11,
  BFLOAT16: 16,
} as const;

export type OnnxDataTypeValue = (typeof OnnxDataType)[keyof typeof OnnxDataType];

/** Bytes per element for each supported ONNX data type */
export const DTYPE_BYTE_SIZE: Record<number, number> = {
  [OnnxDataType.FLOAT]:    4,
  [OnnxDataType.UINT8]:    1,
  [OnnxDataType.INT8]:     1,
  [OnnxDataType.INT16]:    2,
  [OnnxDataType.INT32]:    4,
  [OnnxDataType.INT64]:    8,
  [OnnxDataType.FLOAT16]:  2,
  [OnnxDataType.DOUBLE]:   8,
  [OnnxDataType.BFLOAT16]: 2,
};

/** Human-readable names for data types */
export const DTYPE_NAME: Record<number, string> = {
  [OnnxDataType.FLOAT]:    "float32",
  [OnnxDataType.UINT8]:    "uint8",
  [OnnxDataType.INT8]:     "int8",
  [OnnxDataType.INT16]:    "int16",
  [OnnxDataType.INT32]:    "int32",
  [OnnxDataType.INT64]:    "int64",
  [OnnxDataType.FLOAT16]:  "float16",
  [OnnxDataType.DOUBLE]:   "float64",
  [OnnxDataType.BFLOAT16]: "bfloat16",
};

// ── Parsed ONNX Structures ─────────────────────────────────────────────────

export interface OnnxTensor {
  name: string;
  dims: number[];
  dataType: number;
  /** Raw bytes — zero-copy view into the original ONNX ArrayBuffer */
  rawData: Uint8Array;
  /** Total number of elements */
  elementCount: number;
}

export interface OnnxAttribute {
  name: string;
  type: number;
  f?: number;         // float
  i?: number;         // int
  s?: string;         // string (decoded from bytes)
  t?: OnnxTensor;     // tensor
  floats?: number[];  // repeated float
  ints?: number[];    // repeated int
}

export interface OnnxNode {
  inputs: string[];
  outputs: string[];
  name: string;
  opType: string;
  attributes: OnnxAttribute[];
}

export interface OnnxGraph {
  name: string;
  nodes: OnnxNode[];
  initializers: OnnxTensor[];
  inputNames: string[];
  outputNames: string[];
}

export interface OnnxModel {
  irVersion: number;
  opsetVersion: number;
  graph: OnnxGraph;
}

// ── Hologram Compiled Model ────────────────────────────────────────────────

/** Content-addressed tensor descriptor (stored in manifest) */
export interface HologramTensorDescriptor {
  /** Tensor name from original ONNX graph */
  name: string;
  /** Content-addressed ID (SHA-256 hex of raw bytes) */
  cid: string;
  /** Tensor dimensions */
  dims: number[];
  /** Original ONNX data type */
  dataType: number;
  /** Human-readable dtype */
  dtypeName: string;
  /** Size in bytes */
  byteLength: number;
  /** Total elements */
  elementCount: number;
}

/** A node in the Hologram compute graph (maps 1:1 to ONNX ops) */
export interface HologramComputeNode {
  /** ONNX op type (e.g., "MatMul", "LayerNormalization", "Conv") */
  op: string;
  /** Input tensor/activation names */
  inputs: string[];
  /** Output tensor/activation names */
  outputs: string[];
  /** Op-specific parameters (kernel size, epsilon, etc.) */
  params: Record<string, unknown>;
}

/** The complete compiled model — ready for Phase 2 WGSL dispatch */
export interface HologramCompiledModel {
  /** Content-addressed ID of this manifest */
  manifestCid: string;
  /** Source model identifier */
  sourceModelId: string;
  /** Compilation timestamp */
  compiledAt: string;
  /** Compilation version (for cache invalidation) */
  compilerVersion: string;
  /** Weight tensor descriptors */
  tensors: HologramTensorDescriptor[];
  /** Compute graph (topologically ordered) */
  graph: HologramComputeNode[];
  /** Total weight bytes */
  totalWeightBytes: number;
  /** Total parameter count */
  totalParameters: number;
  /** Model metadata */
  meta: {
    encoderLayers: number;
    decoderLayers: number;
    attentionHeads: number;
    hiddenSize: number;
    vocabSize: number;
  };
}

/** Progress callback for compilation */
export interface CompileProgress {
  phase: "download" | "parse" | "extract" | "store" | "finalize";
  message: string;
  progress: number; // 0-1
  detail?: string;
}
