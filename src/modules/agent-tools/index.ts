/**
 * agent-tools module barrel export.
 */

export { parseTerm } from "./parser";
export {
  uor_derive,
  uor_query,
  uor_verify,
  uor_correlate,
  uor_partition,
  uor_schema_bridge,
  uor_schema_coherence,
} from "./tools";
export type {
  DeriveInput,
  DeriveOutput,
  QueryInput,
  QueryOutput,
  VerifyInput,
  VerifyOutput,
  CorrelateInput,
  CorrelateOutput,
  PartitionInput,
  PartitionOutput,
  SchemaBridgeInput,
  SchemaBridgeOutput,
  SchemaCoherenceInput,
  SchemaCoherenceOutput,
} from "./tools";
// P33: Re-export fidelity engine types
export type {
  CorrelateResult,
  SkosRelation,
  NearDuplicatePair,
} from "@/modules/resolver/correlate-engine";
export {
  FIDELITY_THRESHOLDS,
  classifyFidelity,
} from "@/modules/resolver/correlate-engine";
export { default as AgentConsolePage } from "./pages/AgentConsolePage";
