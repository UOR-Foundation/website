/**
 * UOR v2.0.0 — Canonical Operation Metadata
 *
 * Maps each of the 10 PrimitiveOps to its geometric character,
 * arity, and involution status. This is the runtime counterpart
 * of the OP_GEOMETRY constant in the foundation types.
 *
 * Pure data. Zero logic. Canonical source: op.rs
 */

import type { PrimitiveOp, GeometricCharacter } from "@/types/uor-foundation/enums";
import { OP_GEOMETRY } from "@/types/uor-foundation/kernel/op";

/** Runtime metadata for a single primitive operation. */
export interface OpMeta {
  readonly name: PrimitiveOp;
  readonly geometry: GeometricCharacter;
  readonly arity: 1 | 2;
  readonly involution: boolean;
}

/** Canonical metadata table — all 10 primitive operations. */
export const OP_TABLE: readonly OpMeta[] = [
  { name: "Neg",  geometry: "RingReflection",       arity: 1, involution: true  },
  { name: "Bnot", geometry: "HypercubeReflection",  arity: 1, involution: true  },
  { name: "Succ", geometry: "Rotation",             arity: 1, involution: false },
  { name: "Pred", geometry: "RotationInverse",      arity: 1, involution: false },
  { name: "Add",  geometry: "Translation",          arity: 2, involution: false },
  { name: "Sub",  geometry: "Translation",          arity: 2, involution: false },
  { name: "Mul",  geometry: "Scaling",              arity: 2, involution: false },
  { name: "Xor",  geometry: "HypercubeTranslation", arity: 2, involution: true  },
  { name: "And",  geometry: "HypercubeProjection",  arity: 2, involution: false },
  { name: "Or",   geometry: "HypercubeJoin",        arity: 2, involution: false },
] as const;

/** Lookup by PrimitiveOp name. */
export const OP_META: Record<PrimitiveOp, OpMeta> = Object.fromEntries(
  OP_TABLE.map((m) => [m.name, m])
) as Record<PrimitiveOp, OpMeta>;

/** Verify OP_META agrees with the foundation OP_GEOMETRY constant. */
export function verifyGeometryAlignment(): boolean {
  return OP_TABLE.every((m) => OP_GEOMETRY[m.name] === m.geometry);
}

/**
 * Dihedral group order for ring R_n = Z/(2^n)Z.
 * D_{2^n} has order 2 × 2^n = 2^(n+1).
 */
export function dihedralOrder(bits: number): bigint {
  return BigInt(1) << BigInt(bits + 1);
}
