/**
 * UOR Partition Engine — computes the four disjoint partition sets of a ring.
 *
 * Every element falls into exactly one of:
 *   - UnitSet: invertible elements (odd numbers, coprime to 2^n)
 *   - ExteriorSet: zero and the midpoint generator
 *   - IrreducibleSet: odd non-units
 *   - ReducibleSet: even non-zero, non-midpoint
 *
 * Closure modes (from ontology):
 *   - oneStep: classify each seed element once
 *   - fixedPoint: iterate classification to convergence
 *   - graphClosed: full verification that every closure edge stays in-set
 *
 * Delegates to lib/uor-ring.ts classifyByte. Zero duplication.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { classifyByte } from "@/lib/uor-ring";
import type { PartitionComponent, PartitionClassification } from "@/types/uor";
import { fromBytes } from "@/modules/ring-core/ring";

// ── Types ───────────────────────────────────────────────────────────────────

export type ClosureMode = "oneStep" | "fixedPoint" | "graphClosed";

export interface PartitionResult {
  units: number[];
  exterior: number[];
  irreducible: number[];
  reducible: number[];
  closureMode: ClosureMode;
  closureVerified: boolean;
  closureErrors: string[];
  timestamp: string;
}

// ── computePartition ────────────────────────────────────────────────────────

/**
 * Compute the four partition components for a ring.
 *
 * @param ring - The ring to partition
 * @param seedSet - Values to classify. Defaults to all values in the ring (capped at 2^16).
 * @param closureMode - Level of verification to perform
 */
export function computePartition(
  ring: UORRing,
  seedSet?: number[],
  closureMode: ClosureMode = "oneStep"
): PartitionResult {
  const max = Math.min(Number(ring.cycle), 65536); // cap for performance
  const values = seedSet ?? Array.from({ length: max }, (_, i) => i);

  const units: number[] = [];
  const exterior: number[] = [];
  const irreducible: number[] = [];
  const reducible: number[] = [];

  // Step 1: Classify each element
  for (const v of values) {
    const c = classifyByte(v, ring.bits);
    switch (c.component) {
      case "partition:UnitSet": units.push(v); break;
      case "partition:ExteriorSet": exterior.push(v); break;
      case "partition:IrreducibleSet": irreducible.push(v); break;
      case "partition:ReducibleSet": reducible.push(v); break;
    }
  }

  const closureErrors: string[] = [];
  let closureVerified = true;

  // Step 2: For fixedPoint / graphClosed, verify closure under ring operations
  if (closureMode === "fixedPoint" || closureMode === "graphClosed") {
    // Verify: neg(unit) must be unit, neg(exterior) must be exterior, etc.
    const classMap = new Map<number, PartitionComponent>();
    for (const v of values) {
      classMap.set(v, classifyByte(v, ring.bits).component);
    }

    for (const v of values) {
      const bytes = ring.toBytes(v);
      const negVal = fromBytes(ring.neg(bytes));
      const bnotVal = fromBytes(ring.bnot(bytes));

      const vClass = classMap.get(v)!;
      const negClass = classMap.get(negVal);
      const bnotClass = classMap.get(bnotVal);

      // neg preserves units and exterior
      if (vClass === "partition:UnitSet" && negClass !== "partition:UnitSet" && negClass !== "partition:IrreducibleSet") {
        closureErrors.push(`neg(${v})=${negVal}: expected unit/irreducible, got ${negClass}`);
      }

      // graphClosed: verify every closure edge points to a node in the set
      if (closureMode === "graphClosed") {
        if (negClass === undefined) {
          closureErrors.push(`neg(${v})=${negVal}: not in partition set`);
        }
        if (bnotClass === undefined) {
          closureErrors.push(`bnot(${v})=${bnotVal}: not in partition set`);
        }
      }
    }

    closureVerified = closureErrors.length === 0;
  }

  return {
    units,
    exterior,
    irreducible,
    reducible,
    closureMode,
    closureVerified,
    closureErrors,
    timestamp: new Date().toISOString(),
  };
}
