/**
 * Hologram Compute — Module Barrel
 * ═════════════════════════════════
 *
 * Provider-agnostic compute substrate.
 * Local vGPU today, cloud + P2P tomorrow.
 *
 * @module hologram-compute
 */

export {
  ComputeOrchestrator,
  LocalGpuProvider,
  CloudProvider,
  PeerProvider,
  getOrchestrator,
} from "./providers";

export type {
  ProviderKind,
  ProviderStatus,
  ComputeCapabilities,
  ProviderSnapshot,
  ComputeJob,
  ComputeJobResult,
  ComputeProvider,
  CpuLutBenchmarkResult,
} from "./providers";

export {
  MUL_TABLE,
  MUL_TABLE_BYTES,
  BIT_TABLE,
  BIT_TABLE_Q4_BYTES,
  lutMatmul,
  standardMatmul,
  gpuMatmul,
  gpuLastPath,
  buildCoQuantLut,
  coQuantMatVecCpu,
  coQuantLinearGpu,
  quantize,
  verifyCoQuant,
  HologramComputeCache,
  seededMatrix,
  fingerprint,
  matrixChecksum,
} from "./hologram-matmul";

export type {
  PrecomputeStats,
  BitPrecision,
  BitTableDescriptor,
  QuantBits,
  CoQuantLut,
  CentroidEntry,
  CentroidRetrievalResult,
  CentroidCacheStats,
} from "./hologram-matmul";

// Atlas Model Projection — weight decomposition into Atlas coordinates
export {
  projectModel,
  generateProjectionReport,
  LLAMA_31_8B_MANIFEST,
  mirrorVertex,
  assignVertex,
  quantizeToR8,
  dequantizeFromR8,
  detectMirrorPattern,
  synthesizeWeights,
} from "./atlas-model-projector";
export type {
  ProjectableArchitecture,
  ModelManifest,
  AtlasWeightBlock,
  WeightMatrixType,
  MirrorPatternKind,
  AtlasModelDecomposition,
} from "./atlas-model-projector";

// Engram Conditional Memory — O(1) N-gram lookup via Atlas vertex space
export {
  EngramCache,
  DEFAULT_ENGRAM_CONFIG,
  multiHeadHash,
  compressTokenId,
} from "./engram-cache";
export type {
  NgramKey,
  EngramEntry,
  EngramConfig,
  EngramRetrievalResult,
  EngramStats,
} from "./engram-cache";

// Coherence Inference Engine — H-score gradient navigation
export {
  CoherenceInferenceEngine,
  DEFAULT_INFERENCE_CONFIG,
  computeHScore,
  computeGradient,
  classifyZone,
} from "./coherence-inference";
export type {
  CoherenceState,
  CoherenceInferenceConfig,
  InferenceStep,
  InferenceResult,
} from "./coherence-inference";

// Full Projection Pipeline — end-to-end model → Atlas → inference
export {
  AtlasProjectionPipeline,
  DEFAULT_PIPELINE_CONFIG,
  quickProject,
  MODEL_MANIFESTS,
} from "./projection-pipeline";
export type {
  ProjectionPipelineConfig,
  PipelineStatus,
  PipelineReport,
} from "./projection-pipeline";

// Holographic Codec — scale-invariant compression via holographic principle
export {
  holographicEncode,
  holographicDecode,
  generateHolographicReport,
  reconstructMirror,
  ATLAS_HORIZON_AREA,
  ATLAS_PLANCK_AREA,
  BEKENSTEIN_BOUND_BITS,
  BEKENSTEIN_BOUND_BYTES,
  RT_SURFACE_COUNT,
  MSS_GRADIENT_BOUND,
  SCRAMBLING_HOPS,
  SCRAMBLING_TIME,
  DEFAULT_CODEC_CONFIG,
} from "./holographic-codec";
export type {
  HolographicBlock,
  HolographicEncoding,
  HolographicCodecConfig,
  PhaseStats,
} from "./holographic-codec";

// Compute Dispatcher — tiered GPU/vGPU/CPU cascade with structural sharing
export {
  ComputeDispatcher,
  getDispatcher,
} from "./compute-dispatcher";
export type {
  ComputeTier,
  TierCapability,
  DispatchDecision,
  DispatcherSnapshot,
  OperationKind,
} from "./compute-dispatcher";

// Adaptive Clock Booster — decoupled compute clock with idle overclocking
export {
  AdaptiveClockBooster,
  getClock,
  DEFAULT_CLOCK_CONFIG,
} from "./adaptive-clock";
export type {
  ClockConfig,
  ClockSnapshot,
  ClockCallback,
} from "./adaptive-clock";

// HuggingFace Model Bridge — real model loading for Atlas projection
export {
  loadHFModel,
  tokenize,
  detokenize,
  baselineInference,
  getNextTokenLogits,
  computePerplexity,
  computePerTokenNLL,
  BROWSER_MODELS,
} from "./hf-model-bridge";
export type {
  ModelLoadStatus,
  LoadedHFModel,
  BrowserModelProfile,
} from "./hf-model-bridge";

// HoloMem — Holographic Virtual Memory (browser-native SDM)
export {
  HoloMem,
  getHoloMem,
  PAGE_SIZE,
} from "./holomem";
export type {
  HoloMemConfig,
  HoloMemStats,
} from "./holomem";

// SharedRingBuffer — Zero-copy cross-thread tensor transfer
export {
  SharedRingBuffer,
} from "./shared-ring-buffer";

// Projection Worker — Off-main-thread Belt-Fiber decomposition
export {
  ProjectionWorkerPool,
  getProjectionPool,
} from "./projection-worker";
export type {
  ProjectionResult,
  ProjectionProgress,
} from "./projection-worker";

// GPU Coherence Streamer — real-time Atlas inference via WebGPU
export {
  GpuCoherenceStreamer,
} from "./gpu-coherence-streamer";
export type {
  StreamToken,
  StreamerConfig,
  StreamerStats,
} from "./gpu-coherence-streamer";

// Quantum Inference Engine — three-layer architecture
export {
  QuantumInferenceEngine,
} from "./quantum-inference-engine";
export type {
  QuantumToken,
  QuantumInferenceStats,
  QuantumEngineConfig,
  LayerStatus,
  HardwareBackend,
  QubitSubstrateState,
} from "./quantum-inference-engine";

// Vocabulary Partitioner — Token Space → 96 Atlas Vertex Clusters
export {
  VocabularyPartitioner,
  computeCoherenceSignature,
} from "./vocabulary-partitioner";
export type {
  TokenProjection,
  VertexCluster,
  ClusterToken,
  PartitionStats,
  VocabularyEngram,
} from "./vocabulary-partitioner";

// Tokenizer Bridge — Load real vocabularies for Atlas partitioning
export {
  loadTokenizerVocabulary,
  simpleEncode,
  simpleDecode,
} from "./tokenizer-bridge";
export type {
  TokenizerInfo,
  TokenizerLoadProgress,
} from "./tokenizer-bridge";

// Coherence Token Decoder — Pure manifold navigation → token emission
export {
  CoherenceTokenDecoder,
  DEFAULT_DECODER_CONFIG,
} from "./coherence-token-decoder";
export type {
  DecoderConfig,
  DecoderStatus,
  GenerationToken,
  GenerationResult,
} from "./coherence-token-decoder";
