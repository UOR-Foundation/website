/**
 * UNS Shield — Module barrel export.
 *
 * Ring-arithmetic traffic classification, injection detection,
 * and HTTP middleware stack (WAF, rate limiting, PoW bot management).
 */

// ── Partition Analysis (Phase 2-A) ─────────────────────────────────────────
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

// ── Derivation Trace (Phase 2-A) ───────────────────────────────────────────
export type {
  TraceStep,
  DerivationTrace,
} from "./derivation-trace";

export {
  buildDerivationTrace,
  detectInjection,
} from "./derivation-trace";

// ── HTTP Middleware (Phase 2-B) ────────────────────────────────────────────
export type {
  ShieldRequest,
  ShieldResponse,
  ShieldContext,
  ShieldMiddleware,
  UnsWafRule,
  WafVerdict,
  PowChallenge,
} from "./middleware";

export {
  partitionMiddleware,
  WafEngine,
  wafMiddleware,
  RateLimiter,
  rateLimitMiddleware,
  PowManager,
  powMiddleware,
  verifyPow,
  unsShield,
  runShield,
} from "./middleware";
