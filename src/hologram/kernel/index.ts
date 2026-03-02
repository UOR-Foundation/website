/**
 * Q-Kernel Module — Public API
 *
 * The quantum operating system kernel, built from mathematical axioms up.
 */

// Q-Boot: kernel initialization sequence
export {
  post,
  loadHardware,
  hydrateFirmware,
  createGenesisProcess,
  boot,
} from "./q-boot";
export type {
  PostCheck,
  PostResult,
  BootStage,
  QHardware,
  QFirmware,
  GenesisProcess,
  QKernelBoot,
} from "./q-boot";

// Q-MMU: content-addressed virtual memory
export { QMmu } from "./q-mmu";
export type {
  StorageTier,
  Datum,
  PageTableEntry,
  PageFault,
  MmuStats,
} from "./q-mmu";

// Q-Sched: coherence-priority scheduler
export { QSched, classifyZone } from "./q-sched";
export type {
  CoherenceZone,
  ProcessState,
  QProcess,
  SchedStats,
  ContextSwitch,
} from "./q-sched";

// Q-Syscall: lens-based trap table
export { QSyscall, STANDARD_MODALITIES } from "./q-syscall";
export type {
  MorphismType,
  SyscallResult,
  CompiledLens,
  LensBlueprint,
  PipelineStage,
  TrapTableEntry,
  SyscallStats,
  Modality,
} from "./q-syscall";

// Q-FS: Merkle DAG filesystem
export { QFs } from "./q-fs";
export type {
  InodeType,
  QInode,
  QPermissions,
  JournalEntry,
  JournalOp,
  MountPoint,
  FsStats,
} from "./q-fs";

// Q-ECC: [[96,48,2]] stabilizer error correction
export { QEcc, CODE_N, CODE_K, CODE_D } from "./q-ecc";
export type {
  StabilizerGenerator,
  Syndrome,
  CorrectionResult,
  EccStats,
} from "./q-ecc";

// Q-ISA: 96-gate quantum instruction set
export { QIsa } from "./q-isa";
export type {
  GateTier,
  GateDef,
  GateOp,
  QCircuit,
  IsaStats,
  TransformElement,
} from "./q-isa";

// Q-Net: Fano-topology networking
export { QNet } from "./q-net";
export type {
  QSocket,
  SocketState,
  QProtocol,
  QEnvelope,
  FanoNode,
  QRoute,
  FirewallRule,
  NetStats,
} from "./q-net";

// Q-IPC: Inter-process communication
export { QIpc } from "./q-ipc";
export type {
  QMessage,
  QChannel,
  QSubscription,
  IpcStats,
} from "./q-ipc";

// Q-Agent: Isolated agent runtime (containers/VMs)
export { QAgent, QAgentMesh } from "./q-agent";
export type {
  AgentState,
  ResourceEnvelope,
  SessionEntry,
  HScoreSample,
  AgentSnapshot,
  AgentStats,
  MeshStats,
} from "./q-agent";

// Q-Driver: Block device abstraction layer
export { QDriver, BlockDevice, MemoryBackend, IndexedDBBackend, SupabaseBackend, IpfsBackend } from "./q-driver";
export type {
  BackendType,
  DeviceState,
  Sector,
  BlockDeviceDescriptor,
  IoResult,
  DriverStats,
  DeviceEvent,
  StorageBackend,
} from "./q-driver";

// Q-Security: Capability-based access control
export { QSecurity, RING_NAMES } from "./q-security";
export type {
  IsolationRing,
  SecurityOp,
  CapabilityToken,
  ElevationRequest,
  SecurityEvent,
  SecurityStats,
} from "./q-security";

// TEE Bridge: Hardware Trusted Execution Environment
export { TEEBridge, getTEEBridge, resetTEEBridge } from "./tee-bridge";
export type {
  TEEProvider,
  TEECapabilities,
  TEEAttestationQuote,
  TEEAssertion,
  SealedEnvelope,
  TEEFusedAttestation,
} from "./tee-bridge";

export { QSecureMesh } from "./q-secure-mesh";
export type {
  SecureResult,
  SecureAgentInfo,
  SecureMeshStats,
} from "./q-secure-mesh";

// TEE Confidential Inference Pipeline
export { ConfidentialInferencePipeline, getConfidentialPipeline, resetConfidentialPipeline } from "./tee-inference";
export type {
  ConfidentialMessage,
  ConfidentialInferenceConfig,
  ConfidentialInferenceResult,
  ConfidentialReceipt,
  TEEInferenceStatus,
  ConfidentialPipelineStats,
} from "./tee-inference";

// Q-Simulator: Full statevector quantum simulator
// Q-CoherenceHead: Quantum-AI readiness interface
export { HammingCoherenceHead, MultiHeadCoherence } from "./q-coherence-head";
export type {
  CoherenceVector,
  CoherenceHead,
  CoherenceContext,
} from "./q-coherence-head";

// Q-Agent-Projection: Agent ↔ Frame bridge
export { AgentProjector, ProjectionCompositor } from "./q-agent-projection";
export type {
  AgentProjectionFrame,
} from "./q-agent-projection";

// Q-Simulator: Full statevector quantum simulator
export {
  createState,
  applyOp,
  measure as simMeasure,
  simulateCircuit,
  formatStatevector,
  drawCircuitASCII,
  toOpenQASM,
  entanglementMap,
  quickRun,
  noNoise,
  realisticNoise,
} from "./q-simulator";
export type {
  SimulatorState,
  SimOp,
  GateMatrix,
  NoiseModel,
} from "./q-simulator";

// Q-Error-Mitigation: ZNE, MEM, Randomized Compiling
export {
  zeroNoiseExtrapolation,
  buildCalibrationMatrix,
  applyMeasurementMitigation,
  randomizedCompiling,
  mitigateFull,
} from "./q-error-mitigation";
export type {
  ExtrapolationMethod,
  ZneResult,
  CalibrationMatrix,
  MemResult,
  RcResult,
  FullMitigationResult,
  MitigationConfig,
} from "./q-error-mitigation";

// Q-Sovereignty: Single entry point for sovereign identity
export { QSovereignty } from "./q-sovereignty";
export type {
  AuthUser,
  SovereignIdentity,
  GenesisResult,
  SovereigntyStats,
} from "./q-sovereignty";

// Q-Ceremony: Founding ceremony engine
export { executeFoundingCeremony, verifyCollapseIntegrity } from "./q-ceremony";
export type {
  FoundingCeremony,
  SignedCeremony,
  CeremonyResult,
  CeremonyAttribute,
  CollapseVerification,
} from "./q-ceremony";

// Q-Three-Word: Canonical three-word identity names
export {
  deriveThreeWordName,
  reverseThreeWordName,
  parseThreeWordDisplay,
  verifyThreeWordBijection,
} from "./q-three-word";
export type { ThreeWordName } from "./q-three-word";

// Q-Vault: Ring 0 encrypted sovereign storage
export { QVault } from "./q-vault";
export type {
  VaultSlot,
  VaultManifest,
  VaultReadResult,
  VaultWriteResult,
  VaultExportBundle,
  VaultExportSlot,
  VaultStats,
} from "./q-vault";

// Q-Trust-Mesh: Fano-topology trust attestation graph
export { QTrustMesh } from "./q-trust-mesh";
export type {
  TrustLevel,
  TrustAttestation,
  TrustEdge,
  TrustScore,
  MutualCeremony,
  TrustMeshStats,
} from "./q-trust-mesh";

// Q-Disclosure: Selective disclosure via lens morphisms
export { QDisclosure } from "./q-disclosure";
export type {
  AttributeVisibility,
  DisclosurePolicy,
  DisclosureRule,
  DisclosureProjection,
  DisclosedAttribute,
  DisclosureLayer,
  DisclosureStats,
} from "./q-disclosure";
