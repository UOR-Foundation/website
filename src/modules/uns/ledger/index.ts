/**
 * UNS Ledger — Verifiable SQL with QueryProofs
 *
 * Every query produces a Dilithium-3 signed proof.
 * Schema history is an auditable chain of signed migrations.
 */

export type {
  QueryProof,
  QueryResult,
  StateTransition,
  SchemaMigration,
} from "./ledger";

export { UnsLedger } from "./ledger";
