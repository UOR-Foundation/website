/**
 * UOR Trace Module — trace: namespace barrel export.
 */

export { recordTrace, getTrace, getRecentTraces } from "./trace";
export type { ComputationTrace, TraceStep } from "./trace";

// UorModule lifecycle wrapper
export { TraceModule } from "./trace-module";
