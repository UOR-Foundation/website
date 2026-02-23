/**
 * UNS Trust — Zero Trust Identity & Access Control (Phase 4-A)
 *
 * No CA. No X.509. No OCSP. The ring arithmetic is the CA.
 */

export { UnsAuthServer, signChallenge } from "./auth";
export type { UnsChallenge, UnsSession } from "./auth";

export { UnsAccessControl, trustMiddleware } from "./policy";
export type {
  UnsAccessPolicy,
  UnsAccessRule,
  EvaluationResult,
  MiddlewareHandler,
} from "./policy";
