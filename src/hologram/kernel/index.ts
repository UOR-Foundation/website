/**
 * Q-Kernel Module — Public API
 *
 * The quantum operating system kernel, built from mathematical axioms up.
 * Directory structure mirrors Linux kernel source tree:
 *
 *   init/      — System initialization & identity (Linux: init/)
 *   kernel/    — Scheduler & syscall interface (Linux: kernel/)
 *   mm/        — Content-addressed virtual memory (Linux: mm/)
 *   fs/        — Virtual filesystem & vault (Linux: fs/)
 *   drivers/   — Storage backend drivers (Linux: drivers/)
 *   net/       — Networking & trust mesh (Linux: net/)
 *   ipc/       — Inter-process communication (Linux: ipc/)
 *   crypto/    — ECC & coherence verification (Linux: crypto/)
 *   arch/      — ISA, simulator & circuit compilation (Linux: arch/)
 *   security/  — Capability model & TEE (Linux: security/)
 *   agents/    — Autonomous AI processes (novel — no Linux equivalent)
 *   surface/   — Holographic projection surface (novel — no Linux equivalent)
 */

// ── init/ — System Initialization (Linux: init/) ─────────────────────
export {
  post, loadHardware, hydrateFirmware, createGenesisProcess, boot,
} from "./init/q-boot";
export type {
  PostCheck, PostResult, BootStage, QHardware, QFirmware, GenesisProcess, QKernelBoot,
} from "./init/q-boot";

export { QSovereignty } from "./init/q-sovereignty";
export type { AuthUser, SovereignIdentity, GenesisResult, SovereigntyStats } from "./init/q-sovereignty";

export { executeFoundingCeremony, verifyCollapseIntegrity } from "./init/q-ceremony";
export type {
  FoundingCeremony, SignedCeremony, CeremonyResult, CeremonyAttribute, CollapseVerification,
} from "./init/q-ceremony";

export { deriveThreeWordName, reverseThreeWordName, parseThreeWordDisplay, verifyThreeWordBijection } from "./init/q-three-word";
export type { ThreeWordName } from "./init/q-three-word";

// ── mm/ — Memory Management (Linux: mm/) ─────────────────────────────
export { QMmu } from "./mm/q-mmu";
export type { StorageTier, Datum, PageTableEntry, PageFault, MmuStats } from "./mm/q-mmu";

// ── fs/ — Virtual File System (Linux: fs/) ───────────────────────────
export { QFs } from "./fs/q-fs";
export type { InodeType, QInode, QPermissions, JournalEntry, JournalOp, MountPoint, FsStats } from "./fs/q-fs";

export { QVault } from "./fs/q-vault";
export type {
  VaultSlot, VaultManifest, VaultReadResult, VaultWriteResult, VaultExportBundle, VaultExportSlot, VaultStats,
} from "./fs/q-vault";

// ── drivers/ — Device Driver Framework (Linux: drivers/) ─────────────
export { QDriver, BlockDevice, MemoryBackend, IndexedDBBackend, SupabaseBackend, IpfsBackend } from "./drivers/q-driver";
export type {
  BackendType, DeviceState, Sector, BlockDeviceDescriptor, IoResult, DriverStats, DeviceEvent, StorageBackend,
} from "./drivers/q-driver";

// ── kernel/ — Process Scheduler & Syscall (Linux: kernel/) ───────────
export { QSched, classifyZone } from "./kernel/q-sched";
export type { CoherenceZone, ProcessState, QProcess, SchedStats, ContextSwitch } from "./kernel/q-sched";

export { QSyscall, STANDARD_MODALITIES } from "./kernel/q-syscall";
export type {
  MorphismType, SyscallResult, CompiledLens, LensBlueprint, PipelineStage, TrapTableEntry, SyscallStats, Modality,
} from "./kernel/q-syscall";

// ── crypto/ — Cryptographic Subsystem (Linux: crypto/) ───────────────
export { QEcc, CODE_N, CODE_K, CODE_D } from "./crypto/q-ecc";
export type { StabilizerGenerator, Syndrome, CorrectionResult, EccStats } from "./crypto/q-ecc";

export { HammingCoherenceHead, MultiHeadCoherence } from "./crypto/q-coherence-head";
export type { CoherenceVector, CoherenceHead, CoherenceContext } from "./crypto/q-coherence-head";

// ── arch/ — Architecture & ISA (Linux: arch/) ────────────────────────
export { QIsa } from "./arch/q-isa";
export type { GateTier, GateDef, GateOp, QCircuit, IsaStats, TransformElement } from "./arch/q-isa";

export {
  createState, applyOp, measure as simMeasure, simulateCircuit, formatStatevector,
  drawCircuitASCII, toOpenQASM, entanglementMap, quickRun, noNoise, realisticNoise,
} from "./arch/q-simulator";
export type { SimulatorState, SimOp, GateMatrix, NoiseModel } from "./arch/q-simulator";

export {
  zeroNoiseExtrapolation, buildCalibrationMatrix, applyMeasurementMitigation,
  randomizedCompiling, mitigateFull,
} from "./arch/q-error-mitigation";
export type {
  ExtrapolationMethod, ZneResult, CalibrationMatrix, MemResult, RcResult, FullMitigationResult, MitigationConfig,
} from "./arch/q-error-mitigation";

// ── net/ — Networking Stack (Linux: net/) ────────────────────────────
export { QNet } from "./net/q-net";
export type { QSocket, SocketState, QProtocol, QEnvelope, FanoNode, QRoute, FirewallRule, NetStats } from "./net/q-net";

export { QTrustMesh } from "./net/q-trust-mesh";
export type {
  TrustLevel, TrustAttestation, TrustEdge, TrustScore, MutualCeremony, TrustMeshStats,
} from "./net/q-trust-mesh";

// ── ipc/ — Inter-Process Communication (Linux: ipc/) ─────────────────
export { QIpc } from "./ipc/q-ipc";
export type { QMessage, QChannel, QSubscription, IpcStats } from "./ipc/q-ipc";

// ── security/ — Access Control & TEE (Linux: security/) ──────────────
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

// ── agents/ — Autonomous Processes (novel) ───────────────────────────
export { QAgent, QAgentMesh } from "./agents/q-agent";
export type {
  AgentState, ResourceEnvelope, SessionEntry, HScoreSample, AgentSnapshot, AgentStats, MeshStats,
} from "./agents/q-agent";

export { AgentProjector, ProjectionCompositor } from "./agents/q-agent-projection";
export type { AgentProjectionFrame } from "./agents/q-agent-projection";

// ── block/ — Block I/O Layer (Linux: block/) ─────────────────────────
export { QBio } from "./block/q-bio";
export type { IoDirection, IoPriority, BioRequest, BioStats } from "./block/q-bio";

// ── lib/ — Kernel Utility Library (Linux: lib/) ─────────────────────
export { cidFromBytes, cidSync, isValidCid } from "./lib/cid";
export { kernelPanic, kernelWarn, kernelAssert, assertNever, kernelClamp } from "./lib/invariants";
export { clamp, lerp, mod, emaUpdate, entropy, hammingDistance } from "./lib/math";

// ── include/ — Shared Type Definitions (Linux: include/) ─────────────
// Note: include/ types are canonical reference definitions.
// Subsystem modules re-export their own types; include/ provides
// the Linux-equivalent header interface for external consumers.
export type { ProcessDescriptor } from "./include/process";
export type { MmuStats as IncludeMmuStats } from "./include/memory";

// ── Kconfig — Kernel Configuration (Linux: Kconfig) ──────────────────
export { KCONFIG } from "./Kconfig";
export type { KconfigKey } from "./Kconfig";
