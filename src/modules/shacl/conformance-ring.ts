/**
 * Conformance Group 1: Ring Operations (op: namespace)
 *
 * Source: conformance/src/tests/fixtures/test1_ring_operations.rs
 * Validates the five signature operations of the UOR ring R_8 = Z/256Z.
 *
 * @see spec/src/namespaces/op.rs — Operation namespace definitions
 */

import { neg, bnot, succ } from "@/lib/uor-ring";
import type { ConformanceGroup } from "./conformance-types";
import { result } from "./conformance-types";

const FIX = "test1_ring_operations.rs";
const CIT = "spec/src/namespaces/op.rs";

export function testRingOperations(): ConformanceGroup {
  const r = [
    // C1.1  neg(0) = 0  (additive identity involution)
    result("C1.1", FIX, "op:Neg", neg(0) === 0, 0, neg(0), CIT),

    // C1.2  neg(neg(x)) = x  (involution for all x)
    (() => {
      let allPass = true;
      for (let x = 0; x < 256; x++) {
        if (neg(neg(x)) !== x) { allPass = false; break; }
      }
      return result("C1.2", FIX, "op:Neg", allPass, "neg(neg(x))=x ∀x", allPass ? "verified 256/256" : "FAILED", CIT);
    })(),

    // C1.3  bnot(bnot(x)) = x  (involution for all x)
    (() => {
      let allPass = true;
      for (let x = 0; x < 256; x++) {
        if (bnot(bnot(x)) !== x) { allPass = false; break; }
      }
      return result("C1.3", FIX, "op:Bnot", allPass, "bnot(bnot(x))=x ∀x", allPass ? "verified 256/256" : "FAILED", CIT);
    })(),

    // C1.4  neg(255) = 1  (255 + 1 = 256 ≡ 0, so neg(255) = 1)
    result("C1.4", FIX, "op:Neg", neg(255) === 1, 1, neg(255), CIT),

    // C1.5  bnot(0) = 255  (0 XOR 0xFF = 255)
    result("C1.5", FIX, "op:Bnot", bnot(0) === 255, 255, bnot(0), CIT),

    // C1.6  bnot(255) = 0  (255 XOR 0xFF = 0)
    result("C1.6", FIX, "op:Bnot", bnot(255) === 0, 0, bnot(255), CIT),

    // C1.7  succ(255) = 0  (ring wraps: 256 mod 256 = 0)
    result("C1.7", FIX, "op:Succ", succ(255) === 0, 0, succ(255), CIT),

    // C1.8  neg(bnot(0)) = succ(0) = 1  (critical identity at x=0)
    result("C1.8", FIX, "proof:CriticalIdentity", neg(bnot(0)) === succ(0), 1, neg(bnot(0)), CIT),
  ];

  return { id: "ring", name: "Ring Operations", fixtureRef: FIX, results: r };
}
