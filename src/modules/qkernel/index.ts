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
