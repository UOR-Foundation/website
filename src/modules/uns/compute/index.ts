/**
 * UNS Compute — Content-Addressed Edge Functions & Agent Gateway
 *
 * Functions are content-addressed. Every execution produces a signed,
 * verifiable computation trace. Sandbox prevents escape.
 * Agent Gateway routes morphism-typed inter-agent messages.
 */

export type { ComputeFunction } from "./registry";
export {
  deployFunction,
  getFunction,
  listFunctions,
  clearRegistry,
} from "./registry";

export type { ComputationTrace, ExecutionResult } from "./executor";
export { invokeFunction, verifyExecution } from "./executor";

// ── Agent Gateway (Phase 5-A) ──────────────────────────────────────────────
export { UnsAgentGateway, buildAgentMessage } from "./agent-gateway";
export type {
  MorphismType, AgentMessage, AgentRegistration,
  RouteResult, InjectionAlert,
} from "./agent-gateway";
