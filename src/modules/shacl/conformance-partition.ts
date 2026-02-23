/**
 * Conformance Group 3: Partition (partition: namespace)
 *
 * Source: conformance/src/tests/fixtures/test2_partition.rs
 * Validates the four-set partition of R_8 = Z/256Z.
 *
 * RESOLVED DISCREPANCY (P21):
 *   ExteriorSet = {0, 128} → cardinality 2.
 *   128 is the unique fixed point of negation (neg(128)=128) and the
 *   maximal zero divisor (128 × 2 ≡ 0 mod 256). It generates the
 *   unique maximal ideal ⟨128⟩ = {0, 128} in Z/256Z.
 *
 * Canonical cardinalities for R_8:
 *   ExteriorSet:    2   ({0, 128})
 *   UnitSet:        2   ({1, 255})
 *   IrreducibleSet: 126 (odd, ∉ {1, 255})
 *   ReducibleSet:   126 (even, ∉ {0, 128})
 *   Total:          256 ✓
 *
 * @see spec/src/namespaces/partition.rs — ExteriorSet definition
 * @see src/lib/uor-ring.ts line 219-227 — classifyByte implementation
 */

import { classifyByte } from "@/lib/uor-ring";
import type { ConformanceGroup } from "./conformance-types";
import { result } from "./conformance-types";

const FIX = "test2_partition.rs";
const CIT = "spec/src/namespaces/partition.rs — ExteriorSet = {0, m/2}";

/** Canonical partition cardinalities for R_8 = Z/256Z. */
export const CANONICAL_PARTITION = {
  exterior: 2,     // {0, 128}
  unit: 2,         // {1, 255}
  irreducible: 126, // odd, not in {1, 255}
  reducible: 126,   // even, not in {0, 128}
} as const;

export function testPartition(): ConformanceGroup {
  // Classify all 256 elements
  const counts = { exterior: 0, unit: 0, irreducible: 0, reducible: 0 };
  const exteriorValues: number[] = [];
  const unitValues: number[] = [];

  for (let b = 0; b < 256; b++) {
    const c = classifyByte(b, 8);
    switch (c.component) {
      case "partition:ExteriorSet":
        counts.exterior++;
        exteriorValues.push(b);
        break;
      case "partition:UnitSet":
        counts.unit++;
        unitValues.push(b);
        break;
      case "partition:IrreducibleSet":
        counts.irreducible++;
        break;
      case "partition:ReducibleSet":
        counts.reducible++;
        break;
    }
  }

  const total = counts.exterior + counts.unit + counts.irreducible + counts.reducible;

  const r = [
    // C3.1  Four classes sum to exactly 256
    result("C3.1", FIX, "partition:Partition", total === 256, 256, total, CIT),

    // C3.2  ExteriorSet cardinality = 2 (resolved: {0, 128})
    result("C3.2", FIX, "partition:ExteriorSet", counts.exterior === CANONICAL_PARTITION.exterior,
      CANONICAL_PARTITION.exterior, counts.exterior, CIT),

    // C3.3  UnitSet cardinality = 2 ({1, 255})
    result("C3.3", FIX, "partition:UnitSet", counts.unit === CANONICAL_PARTITION.unit,
      CANONICAL_PARTITION.unit, counts.unit, CIT),

    // C3.4  IrreducibleSet cardinality = 126
    result("C3.4", FIX, "partition:IrreducibleSet",
      counts.irreducible === CANONICAL_PARTITION.irreducible,
      CANONICAL_PARTITION.irreducible, counts.irreducible, CIT),

    // C3.5  ReducibleSet cardinality = 126
    result("C3.5", FIX, "partition:ReducibleSet",
      counts.reducible === CANONICAL_PARTITION.reducible,
      CANONICAL_PARTITION.reducible, counts.reducible, CIT),

    // C3.6  0 ∈ ExteriorSet
    result("C3.6", FIX, "partition:ExteriorSet",
      classifyByte(0, 8).component === "partition:ExteriorSet",
      "partition:ExteriorSet", classifyByte(0, 8).component, CIT),

    // C3.7  1 ∈ UnitSet, 255 ∈ UnitSet
    result("C3.7", FIX, "partition:UnitSet",
      classifyByte(1, 8).component === "partition:UnitSet" &&
      classifyByte(255, 8).component === "partition:UnitSet",
      "1 ∈ UnitSet ∧ 255 ∈ UnitSet",
      `1→${classifyByte(1, 8).component}, 255→${classifyByte(255, 8).component}`, CIT),

    // C3.8  3 ∈ IrreducibleSet (first odd prime)
    result("C3.8", FIX, "partition:IrreducibleSet",
      classifyByte(3, 8).component === "partition:IrreducibleSet",
      "partition:IrreducibleSet", classifyByte(3, 8).component, CIT),

    // C3.9  4 ∈ ReducibleSet (even, not 0 or 128)
    result("C3.9", FIX, "partition:ReducibleSet",
      classifyByte(4, 8).component === "partition:ReducibleSet",
      "partition:ReducibleSet", classifyByte(4, 8).component, CIT),
  ];

  return { id: "partition", name: "Partition", fixtureRef: FIX, results: r };
}
