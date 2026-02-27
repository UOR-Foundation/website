/**
 * Whisper Compiler + Inference Engine — Module Barrel
 * ════════════════════════════════════════════════════
 *
 * Complete ONNX → Hologram pipeline:
 *   Phase 1: Compile ONNX → content-addressed weights
 *   Phase 2: WGSL compute kernels
 *   Phase 3: Inference engine (mel → encoder → decoder → tokens)
 *
 * Usage:
 *   import { compileWhisperModel, getWhisperEngine } from "./whisper-compiler";
 *
 *   // One-time compilation
 *   await compileWhisperModel({ onProgress: console.log });
 *
 *   // Inference
 *   const engine = getWhisperEngine();
 *   await engine.init();
 *   const tokens = await engine.transcribe(audioFloat32);
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

// Inference engine (Phase 3)
export { WhisperEngine, getWhisperEngine } from "./inference-engine";
export type { InferenceProgress } from "./inference-engine";

// Mel spectrogram
export {
  computeMelSpectrogram,
  resampleTo16kHz,
  SAMPLE_RATE,
  N_MELS,
  N_FRAMES,
  HOP_LENGTH,
} from "./mel-spectrogram";

// ONNX parser (exposed for debugging / inspection)
export { parseOnnxModel, summarizeModel } from "./onnx-parser";

// Weight store
export { HologramWeightStore, getWeightStore } from "./weight-store";

// Tokenizer (decode token IDs → text)
export { WhisperTokenizer, getWhisperTokenizer } from "./tokenizer";
export type { TokenizerInfo } from "./tokenizer";

// GPU dispatch (Phase 4)
export { GpuDispatch, getGpuDispatch } from "./gpu-dispatch";
export type { GpuDispatchStats } from "./gpu-dispatch";

// Proto decoder (exposed for testing)
export { ProtoReader } from "./proto-decoder";

// WGSL inference kernels
export {
  WHISPER_KERNELS,
  WGSL_MATMUL,
  WGSL_LAYER_NORM,
  WGSL_GELU,
  WGSL_SOFTMAX,
  WGSL_SDPA,
  cpuMatmul,
  cpuLayerNorm,
  cpuGelu,
  cpuSoftmax,
  cpuScaledDotProductAttention,
} from "./wgsl-kernels";
export type { WhisperKernelName } from "./wgsl-kernels";

// Types
export type {
  OnnxTensor,
  OnnxAttribute,
  OnnxNode,
  OnnxGraph,
  OnnxModel,
  OnnxExternalData,
  HologramTensorDescriptor,
  HologramComputeNode,
  HologramCompiledModel,
  CompileProgress,
} from "./types";
export { OnnxDataType, DTYPE_BYTE_SIZE, DTYPE_NAME } from "./types";
