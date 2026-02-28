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
