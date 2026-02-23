/**
 * UOR State Module — state: namespace barrel export.
 */

export { computeStateFrame, persistStateFrame, getRecentStateFrames } from "./state";
export {
  createContext,
  addBinding,
  captureFrame,
  recordTransition,
  getContextFrames,
  getRecentContexts,
  getContextBindings,
  getContextTransitions,
} from "./state";
export type {
  StateFrame,
  StateBinding,
  StateTransition,
  EntryCondition,
  ExitCondition,
  EvalContext,
  EvalBinding,
  EvalFrame,
  EvalTransition,
} from "./state";
export { default as SessionsPage } from "./pages/SessionsPage";

// ── P28: Type System — type: namespace ──────────────────────────────────────
export {
  typeCheck,
  U8,
  U16,
  U32,
  ProductType,
  SumType,
  ConstrainedType,
} from "./type-system";
export type {
  UorType,
  UorTypeClass,
  QuantumLevel,
  TypeCheckResult,
} from "./type-system";

// ── P28: State Machine — formal agent lifecycle ─────────────────────────────
export { UnsStateMachine } from "./state-machine";
export type {
  MachineStateFrame,
  MachineStateBinding,
  StateTransitionRecord,
  PartitionClass,
} from "./state-machine";
