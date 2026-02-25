/**
 * UOR v2.0.0 — Constraint Algebra
 *
 * 4 constraint types aligned to MetricAxis, plus composite AND/OR.
 * Each constraint is a pure predicate: (value) → boolean.
 * FiberBudget integration via `applyConstraint` which pins resolved fibers.
 *
 * Pure functions. No classes. Canonical to type_.rs.
 */

import type { MetricAxis } from "@/types/uor-foundation/enums";
import type { Constraint } from "@/types/uor-foundation/user/type";
import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import { pinFiber } from "@/modules/ring-core/fiber-budget";

// ── Constraint record (plain data satisfying the Constraint interface) ─────

interface ConstraintData {
  constraintId: string;
  axis: MetricAxis;
  crossingCost: number;
  satisfies: (value: bigint) => boolean;
}

// ── Residue: x ≡ r (mod m) — Vertical axis ────────────────────────────────

export function residueConstraint(m: number, r: number, id?: string): ConstraintData {
  return {
    constraintId: id ?? `constraint:residue:${m}:${r}`,
    axis: "Vertical",
    crossingCost: m,
    satisfies: (v) => Number(v % BigInt(m)) === r,
  };
}

// ── Carry: binary carry pattern — Horizontal axis ──────────────────────────

export function carryConstraint(pattern: string, id?: string): ConstraintData {
  const bits = [...pattern].map(Number);
  return {
    constraintId: id ?? `constraint:carry:${pattern}`,
    axis: "Horizontal",
    crossingCost: bits.filter(Boolean).length,
    satisfies: (v) => {
      const n = Number(v);
      // Check if adding 1 at each bit position produces the expected carry
      for (let i = 0; i < bits.length; i++) {
        const bit = (n >> i) & 1;
        if (bit !== bits[bits.length - 1 - i]) return false;
      }
      return true;
    },
  };
}

// ── Depth: factorization depth bounds — Diagonal axis ──────────────────────

/** Count prime factors (with multiplicity) of n in standard integers. */
function factorizationDepth(n: number): number {
  if (n <= 1) return 0;
  let depth = 0;
  let v = n;
  for (let p = 2; p * p <= v; p++) {
    while (v % p === 0) { depth++; v /= p; }
  }
  if (v > 1) depth++;
  return depth;
}

export function depthConstraint(min: number, max: number, id?: string): ConstraintData {
  return {
    constraintId: id ?? `constraint:depth:${min}:${max}`,
    axis: "Diagonal",
    crossingCost: max - min + 1,
    satisfies: (v) => {
      const d = factorizationDepth(Number(v));
      return d >= min && d <= max;
    },
  };
}

// ── Composite: AND / OR ────────────────────────────────────────────────────

export function compositeConstraint(
  mode: "AND" | "OR",
  children: ConstraintData[],
  id?: string,
): ConstraintData {
  return {
    constraintId: id ?? `constraint:composite:${mode.toLowerCase()}:${children.length}`,
    axis: children[0]?.axis ?? "Vertical",
    crossingCost: children.reduce((s, c) => s + c.crossingCost, 0),
    satisfies: mode === "AND"
      ? (v) => children.every((c) => c.satisfies(v))
      : (v) => children.some((c) => c.satisfies(v)),
  };
}

// ── FiberBudget integration ────────────────────────────────────────────────

/**
 * Apply a constraint to a FiberBudget, pinning fibers that the constraint
 * resolves. Pins one fiber per bit position that the constraint determines.
 *
 * Strategy: for an n-bit value satisfying the constraint, each bit whose
 * value is fully determined by the constraint gets pinned.
 *
 * Simplified: pins `expectedPins` fibers starting from the lowest free fiber.
 */
export function applyConstraint(
  budget: FiberBudget,
  constraint: ConstraintData,
  expectedPins: number,
): FiberBudget {
  let b = budget;
  let pinned = 0;
  for (let i = 0; i < b.totalFibers && pinned < expectedPins; i++) {
    if (b.fibers[i].state === "Free") {
      b = pinFiber(b, i, constraint.constraintId);
      pinned++;
    }
  }
  return b;
}

/** Collect all values in [0, ringSize) that satisfy a constraint. */
export function filterByConstraint(constraint: ConstraintData, ringSize: number): number[] {
  const result: number[] = [];
  for (let x = 0; x < ringSize; x++) {
    if (constraint.satisfies(BigInt(x))) result.push(x);
  }
  return result;
}
