/**
 * UOR State Module — state: namespace barrel export.
 */

export { computeStateFrame, persistStateFrame, getRecentStateFrames } from "./state";
export type {
  StateFrame,
  StateBinding,
  StateTransition,
  EntryCondition,
  ExitCondition,
} from "./state";
