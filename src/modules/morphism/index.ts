/**
 * UOR Morphism Module — structure-preserving maps between rings.
 *
 * Barrel export for the morphism module.
 */

export { applyTransform, recordTransform } from "./transform";
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
