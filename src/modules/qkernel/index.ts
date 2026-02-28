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

// Q-Secure Mesh: Phase 8 — Security ↔ Agent Mesh Integration
export { QSecureMesh } from "./q-secure-mesh";
export type {
  SecureResult,
  SecureAgentInfo,
  SecureMeshStats,
} from "./q-secure-mesh";

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
} from "./q-simulator";
export type {
  SimulatorState,
  SimOp,
  GateMatrix,
} from "./q-simulator";
