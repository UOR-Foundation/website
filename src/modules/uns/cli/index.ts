/**
 * UNS CLI — Module Barrel Export (Phase 5-C)
 *
 * Re-exports all CLI command handlers for the `uns` command-line tool.
 * Each command follows the UOR Framework's canonical identity pipeline
 * and produces both human-readable and JSON output.
 */

export type { CliResult } from "./commands";

export {
  // Identity management
  identityNew,
  identityShow,

  // Verification
  verifyFile,
  verifyRecord,

  // Name resolution
  resolve,
  nameRegister,
  nameList,

  // Compute
  computeDeploy,
  computeInvoke,
  computeVerify,

  // Store
  storePut,
  storeGet,

  // Records
  recordGet,

  // Node
  nodeStart,

  // Help
  help,

  // State management
  clearCliState,
  getStoredKeypair,
} from "./commands";
