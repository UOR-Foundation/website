/**
 * UOR Morphism Module — structure-preserving maps between rings.
 *
 * Barrel export for the morphism module.
 */

export { applyTransform, recordTransform, assertDisjointKind, enforceDisjointConstraints } from "./transform";
export type { MorphismKind, MappingRule, TransformRecord } from "./transform";

export { embedQ0toQ1, projectQ1toQ0, crossQuantumTransform } from "./cross-quantum";
export type { CrossQuantumResult } from "./cross-quantum";

export {
  coerceLiteral,
  coerceEntity,
  coerceUnionValue,
  canonicalizeUnionTypes,
  recordCoercionTransform,
  UNION_TYPE_RANGES,
} from "./union-type-canon";
export type { CoercionResult, UnionCanonResult, CoercionRecord } from "./union-type-canon";

// ── P23: Multi-Quantum Ring Engine ──────────────────────────────────────────
export {
  negQ, bnotQ, succQ, predQ,
  verifyCriticalIdentityQ,
  RINGS,
} from "./quantum";
export type { QuantumLevel, QuantumRingConfig } from "./quantum";

// ── P23: Formal Morphisms with CommutativityWitness ─────────────────────────
export {
  project as projectFormal,
  embed as embedFormal,
  identity as identityFormal,
  commutativityWitness,
} from "./morphism-formal";
export type { MorphismResult, MorphismType, CommutativityWitness } from "./morphism-formal";

// UorModule lifecycle wrapper
export { MorphismModule } from "./morphism-module";
