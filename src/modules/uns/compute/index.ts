/**
 * UNS Compute — Content-Addressed Edge Functions
 *
 * Functions are content-addressed. Every execution produces a signed,
 * verifiable computation trace. Sandbox prevents escape.
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
