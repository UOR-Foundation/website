/**
 * Canonical Namespace Barrels — the 14 UOR namespaces.
 *
 * These are the CANONICAL import paths for ontological consumers.
 * Non-ontological modules (UI, infra) import from their module dirs directly.
 *
 * Usage:
 *   import { validate, assignGrade } from "@/modules/ns/proof";
 *   import { executeSparql } from "@/modules/ns/query";
 *   import { ingestDatum, analyzeTypeScript } from "@/modules/ns/type";
 *   import { computeTriad, emitDatum } from "@/modules/ns/schema";
 */

// Only re-export the 4 merged namespaces that have dedicated barrels.
// The remaining 10 namespaces import directly from their module dirs:
//   u:          → @/modules/ring-core
//   op:         → @/modules/ring-core (op-meta)
//   resolver:   → @/modules/resolver
//   partition:  → @/modules/resolver
//   observable: → @/modules/observable
//   derivation: → @/modules/derivation
//   trace:      → @/modules/trace
//   cert:       → @/modules/certificate
//   morphism:   → @/modules/morphism
//   state:      → @/modules/state

export * as proof from "./proof";
export * as query from "./query";
export * as type from "./type";
export * as schema from "./schema";
export * as audio from "./audio";
