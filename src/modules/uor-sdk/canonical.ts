/**
 * UOR SDK — Canonical identity re-exports.
 *
 * Delegates entirely to src/lib/uor-canonical.ts and src/lib/uor-address.ts.
 * These implement the Single Proof Hashing Standard:
 *   Object → URDNA2015 → SHA-256 → {derivation_id, CID, u:address, u:ipv6}
 *
 * Use for local content-addressing without hitting the live API.
 */

export {
  singleProofHash,
  canonicalizeToNQuads,
  verifySingleProof,
} from "@/lib/uor-canonical";

export type { SingleProofResult } from "@/lib/uor-canonical";

export {
  computeCid,
  computeUorAddress,
  computeIpv6Address,
  computeIpv6Full,
  verifyIpv6Address,
  computeModuleIdentity,
  canonicalJsonLd,
} from "@/lib/uor-address";

export type { ModuleIdentity } from "@/lib/uor-address";
