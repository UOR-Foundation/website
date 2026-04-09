/**
 * Sovereign Boot — Barrel Export
 * @module boot
 */

export type {
  BootPhase,
  BootProgress,
  BootProgressCallback,
  BootReceipt,
  DeviceProvenance,
  ExecutionContext,
  HardwareProfile,
  SealStatus,
  StackComponentStatus,
  UorSeal,
} from "./types";

export { sovereignBoot, getBootReceipt, stopSealMonitor } from "./sovereign-boot";
export { startSealMonitor } from "./seal-monitor";
export { useBootStatus } from "./useBootStatus";
export { default as EngineStatusIndicator } from "./EngineStatusIndicator";
export { TECH_STACK, validateStack } from "./tech-stack";
export type { StackEntry, StackHealth, StackValidationResult } from "./tech-stack";
