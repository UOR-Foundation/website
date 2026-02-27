/**
 * Whisper Compiler — Module Barrel
 * ═════════════════════════════════
 *
 * ONNX → Hologram compilation pipeline.
 *
 * Usage:
 *   import { compileWhisperModel, isWhisperCompiled } from "./whisper-compiler";
 *
 *   if (!await isWhisperCompiled()) {
 *     const model = await compileWhisperModel({
 *       onProgress: (p) => console.log(p.message),
 *     });
 *   }
 *
 * After compilation, ONNX dependencies are no longer needed.
 * Phase 2 will add WGSL inference kernels.
 *
 * @module uns/core/hologram/whisper-compiler
 */

// Compiler entry points
export {
  compileWhisperModel,
  isWhisperCompiled,
  loadCompiledWhisper,
  deleteCompiledWhisper,
} from "./compiler";
export type { CompileOptions } from "./compiler";

// ONNX parser (exposed for debugging / inspection)
export { parseOnnxModel, summarizeModel } from "./onnx-parser";

// Weight store
export { HologramWeightStore, getWeightStore } from "./weight-store";

// Proto decoder (exposed for testing)
export { ProtoReader } from "./proto-decoder";

// Types
export type {
  OnnxTensor,
  OnnxAttribute,
  OnnxNode,
  OnnxGraph,
  OnnxModel,
  HologramTensorDescriptor,
  HologramComputeNode,
  HologramCompiledModel,
  CompileProgress,
} from "./types";
export { OnnxDataType, DTYPE_BYTE_SIZE, DTYPE_NAME } from "./types";
