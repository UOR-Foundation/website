/**
 * UoR Name Service (UNS) — Module barrel export.
 *
 * Decentralized name resolution via IPv6 content-addressing
 * and UOR algebraic identity. All public API surfaces are
 * re-exported here to enforce module encapsulation.
 */

// Types (re-export all for consumer modules)
export type {
  UnsRecordType,
  UnsRecord,
  UnsZone,
  UnsResolveRequest,
  UnsResolveResponse,
  UnsReverseResolveRequest,
  UnsReverseResolveResponse,
  UnsRegisterRequest,
  UnsRegisterResponse,
  UnsCertificate,
  UnsHealth,
} from "./types";
