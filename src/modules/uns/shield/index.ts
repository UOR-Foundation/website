/**
 * UNS Shield — Module barrel export.
 *
 * Ring-arithmetic traffic classification and injection detection.
 * The mathematical core of UNS DDoS protection.
 */

export type {
  PartitionClass,
  ShieldAction,
  PartitionResult,
  PartitionResultFast,
} from "./partition";

export {
  classifyByte,
  analyzePayload,
  analyzePayloadFast,
} from "./partition";

export type {
  TraceStep,
  DerivationTrace,
} from "./derivation-trace";

export {
  buildDerivationTrace,
  detectInjection,
} from "./derivation-trace";
