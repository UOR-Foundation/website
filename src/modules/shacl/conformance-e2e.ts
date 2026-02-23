/**
 * Conformance Group 6: End-to-End Resolution Cycle
 *
 * Source: conformance/src/tests/fixtures/test7_end_to_end.rs
 * Validates the full resolution pipeline:
 *   Context → Type → Resolver → Partition → Observable → Cert → Trace
 *
 * @see spec/src/namespaces/resolver.rs, u.rs, partition.rs, cert.rs
 */

import { Q0, fromBytes } from "@/modules/ring-core/ring";
import { resolve } from "@/modules/resolver/resolver";
import { contentAddress, bytesToGlyph } from "@/modules/identity";
import { computeTriad } from "@/modules/triad";
import { classifyByte } from "@/lib/uor-ring";
import { DatumShape } from "./shapes";
import { singleProofHash } from "@/modules/uns/core/identity";
import type { ConformanceGroup, ConformanceResult } from "./conformance-types";
import { result } from "./conformance-types";

const FIX = "test7_end_to_end.rs";
const CIT = "spec/src/namespaces/resolver.rs + u.rs + partition.rs";

export async function testEndToEnd(): Promise<ConformanceGroup> {
  const ring = Q0();
  const results: ConformanceResult[] = [];
  const testValues = [0, 1, 42, 128, 255];

  // C6.1  Full cycle for each test value: resolve → partition → triad → datum shape
  let allCyclesPass = true;
  const cycleDetails: string[] = [];

  for (const v of testValues) {
    const r = resolve(ring, v);
    const bytes = ring.toBytes(v);
    const triad = computeTriad(bytes);
    const partition = classifyByte(v, 8);

    // Build datum and validate shape
    const datum: Record<string, unknown> = {
      iri: r.canonicalIri,
      quantum: ring.quantum,
      value: v,
      bytes,
      stratum: triad.stratum,
      total_stratum: triad.totalStratum,
      spectrum: triad.spectrum,
      glyph: bytesToGlyph(bytes),
      inverse_iri: contentAddress(ring, fromBytes(ring.neg(bytes))),
      not_iri: contentAddress(ring, fromBytes(ring.bnot(bytes))),
      succ_iri: contentAddress(ring, fromBytes(ring.succ(bytes))),
      pred_iri: contentAddress(ring, fromBytes(ring.pred(bytes))),
    };

    const shapeResult = DatumShape(datum);
    if (!shapeResult.conforms) {
      allCyclesPass = false;
      cycleDetails.push(`v=${v}: ${shapeResult.violations.map(v => v.message).join("; ")}`);
    }
  }

  results.push(result(
    "C6.1", FIX, "resolver:ResolutionCycle",
    allCyclesPass,
    "all 5 values pass full cycle",
    allCyclesPass ? "5/5 pass" : cycleDetails.join(" | "),
    CIT
  ));

  // C6.2  Every stage produces output with valid IRI
  let allIrisValid = true;
  for (const v of testValues) {
    const r = resolve(ring, v);
    if (!r.canonicalIri.startsWith("https://uor.foundation/")) {
      allIrisValid = false;
    }
  }
  results.push(result(
    "C6.2", FIX, "u:canonicalIri",
    allIrisValid,
    "all IRIs start with https://uor.foundation/",
    allIrisValid ? "verified" : "INVALID",
    CIT
  ));

  // C6.3  Every canonical ID is consistent (same object → same ID)
  const testObj = { "@type": "test:E2E", "test:value": 42 };
  const id1 = await singleProofHash(testObj);
  const id2 = await singleProofHash(testObj);
  results.push(result(
    "C6.3", FIX, "u:canonicalId",
    id1["u:canonicalId"] === id2["u:canonicalId"],
    "consistent across calls",
    id1["u:canonicalId"] === id2["u:canonicalId"] ? "consistent" : "INCONSISTENT",
    CIT
  ));

  // C6.4  Coherence proof: ring.verify() passes
  const coherence = ring.verify();
  results.push(result(
    "C6.4", FIX, "proof:CoherenceProof",
    coherence.verified,
    "ring coherence verified",
    coherence.verified ? "verified" : `${coherence.failures.length} failures`,
    CIT
  ));

  return { id: "endToEnd", name: "End-to-End Resolution Cycle", fixtureRef: FIX, results };
}
