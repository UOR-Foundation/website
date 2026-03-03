/**
 * Q-Kernel Module — Public API
 *
 * The quantum operating system kernel, built from mathematical axioms up.
 *
 * Directory structure:
 *   boot/     — System initialization & identity (q-boot, q-sovereignty, q-ceremony)
 *   memory/   — Content-addressed storage (q-mmu, q-fs, q-vault, q-driver)
 *   compute/  — Execution & scheduling (q-sched, q-ecc, q-isa, q-simulator)
 *   network/  — Communication (q-net, q-ipc, q-trust-mesh)
 *   security/ — Access control & TEE (q-security, tee-bridge, q-disclosure)
 *   agents/   — Autonomous processes (q-agent, procedural-memory, mirror-protocol)
 *   surface/  — Holographic surface & projection (holographic-surface, compositor)
 */

// ── boot/ — System Initialization ────────────────────────────────────
export {
  post, loadHardware, hydrateFirmware, createGenesisProcess, boot,
} from "./boot/q-boot";
export type {
  PostCheck, PostResult, BootStage, QHardware, QFirmware, GenesisProcess, QKernelBoot,
} from "./boot/q-boot";

export { QSovereignty } from "./boot/q-sovereignty";
export type { AuthUser, SovereignIdentity, GenesisResult, SovereigntyStats } from "./boot/q-sovereignty";

export { executeFoundingCeremony, verifyCollapseIntegrity } from "./boot/q-ceremony";
export type {
  FoundingCeremony, SignedCeremony, CeremonyResult, CeremonyAttribute, CollapseVerification,
} from "./boot/q-ceremony";

export { deriveThreeWordName, reverseThreeWordName, parseThreeWordDisplay, verifyThreeWordBijection } from "./boot/q-three-word";
export type { ThreeWordName } from "./boot/q-three-word";

// ── memory/ — Content-Addressed Storage ──────────────────────────────
export { QMmu } from "./memory/q-mmu";
export type { StorageTier, Datum, PageTableEntry, PageFault, MmuStats } from "./memory/q-mmu";

export { QFs } from "./memory/q-fs";
export type { InodeType, QInode, QPermissions, JournalEntry, JournalOp, MountPoint, FsStats } from "./memory/q-fs";

export { QVault } from "./memory/q-vault";
export type {
  VaultSlot, VaultManifest, VaultReadResult, VaultWriteResult, VaultExportBundle, VaultExportSlot, VaultStats,
} from "./memory/q-vault";

export { QDriver, BlockDevice, MemoryBackend, IndexedDBBackend, SupabaseBackend, IpfsBackend } from "./memory/q-driver";
export type {
  BackendType, DeviceState, Sector, BlockDeviceDescriptor, IoResult, DriverStats, DeviceEvent, StorageBackend,
} from "./memory/q-driver";

// ── compute/ — Execution & Scheduling ────────────────────────────────
export { QSched, classifyZone } from "./compute/q-sched";
export type { CoherenceZone, ProcessState, QProcess, SchedStats, ContextSwitch } from "./compute/q-sched";

export { QSyscall, STANDARD_MODALITIES } from "./compute/q-syscall";
export type {
  MorphismType, SyscallResult, CompiledLens, LensBlueprint, PipelineStage, TrapTableEntry, SyscallStats, Modality,
} from "./compute/q-syscall";

export { QEcc, CODE_N, CODE_K, CODE_D } from "./compute/q-ecc";
export type { StabilizerGenerator, Syndrome, CorrectionResult, EccStats } from "./compute/q-ecc";

export { QIsa } from "./compute/q-isa";
export type { GateTier, GateDef, GateOp, QCircuit, IsaStats, TransformElement } from "./compute/q-isa";

export {
  createState, applyOp, measure as simMeasure, simulateCircuit, formatStatevector,
  drawCircuitASCII, toOpenQASM, entanglementMap, quickRun, noNoise, realisticNoise,
} from "./compute/q-simulator";
export type { SimulatorState, SimOp, GateMatrix, NoiseModel } from "./compute/q-simulator";

export {
  zeroNoiseExtrapolation, buildCalibrationMatrix, applyMeasurementMitigation,
  randomizedCompiling, mitigateFull,
} from "./compute/q-error-mitigation";
export type {
  ExtrapolationMethod, ZneResult, CalibrationMatrix, MemResult, RcResult, FullMitigationResult, MitigationConfig,
} from "./compute/q-error-mitigation";

export { HammingCoherenceHead, MultiHeadCoherence } from "./compute/q-coherence-head";
export type { CoherenceVector, CoherenceHead, CoherenceContext } from "./compute/q-coherence-head";

// ── network/ — Communication ─────────────────────────────────────────
export { QNet } from "./network/q-net";
export type { QSocket, SocketState, QProtocol, QEnvelope, FanoNode, QRoute, FirewallRule, NetStats } from "./network/q-net";

export { QIpc } from "./network/q-ipc";
export type { QMessage, QChannel, QSubscription, IpcStats } from "./network/q-ipc";

export { QTrustMesh } from "./network/q-trust-mesh";
export type {
  TrustLevel, TrustAttestation, TrustEdge, TrustScore, MutualCeremony, TrustMeshStats,
} from "./network/q-trust-mesh";

// ── security/ — Access Control & TEE ─────────────────────────────────
export { QSecurity, RING_NAMES } from "./security/q-security";
export type {
  IsolationRing, SecurityOp, CapabilityToken, ElevationRequest, SecurityEvent, SecurityStats,
} from "./security/q-security";

export { TEEBridge, getTEEBridge, resetTEEBridge } from "./security/tee-bridge";
export type {
  TEEProvider, TEECapabilities, TEEAttestationQuote, TEEAssertion, SealedEnvelope, TEEFusedAttestation,
} from "./security/tee-bridge";

export { ConfidentialInferencePipeline, getConfidentialPipeline, resetConfidentialPipeline } from "./security/tee-inference";
export type {
  ConfidentialMessage, ConfidentialInferenceConfig, ConfidentialInferenceResult,
  ConfidentialReceipt, TEEInferenceStatus, ConfidentialPipelineStats,
} from "./security/tee-inference";

export { QSecureMesh } from "./security/q-secure-mesh";
export type { SecureResult, SecureAgentInfo, SecureMeshStats } from "./security/q-secure-mesh";

export { QDisclosure } from "./security/q-disclosure";
export type {
  AttributeVisibility, DisclosurePolicy, DisclosureRule, DisclosureProjection,
  DisclosedAttribute, DisclosureLayer, DisclosureStats,
} from "./security/q-disclosure";

// ── agents/ — Autonomous Processes ───────────────────────────────────
export { QAgent, QAgentMesh } from "./agents/q-agent";
export type {
  AgentState, ResourceEnvelope, SessionEntry, HScoreSample, AgentSnapshot, AgentStats, MeshStats,
} from "./agents/q-agent";

export { AgentProjector, ProjectionCompositor } from "./agents/q-agent-projection";
export type { AgentProjectionFrame } from "./agents/q-agent-projection";
