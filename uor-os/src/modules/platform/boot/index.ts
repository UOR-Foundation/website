/**
 * Init System — Barrel Export
 * @ontology uor:InitSystem
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
export { TECH_STACK, SELECTION_POLICY, validateStack, validateMinimality } from "./tech-stack";
export type { StackEntry, StackHealth, StackValidationResult, SelectionCriteria, SelectionCriterion, MinimalityResult } from "./tech-stack";
