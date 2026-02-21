/**
 * UOR SHACL Conformance Suite — 7 test scenarios from the UOR spec.
 *
 * 1. Ring — validates Ring properties
 * 2. Primitives — validates operation signatures
 * 3. TermGraph — validates term structure
 * 4. StateLifecycle — validates state transitions
 * 5. Partition — validates four-set partition
 * 6. CriticalIdentity — validates neg(bnot(x)) = succ(x)
 * 7. EndToEnd — validates full resolution cycle
 *
 * Delegates to existing modules — zero duplication of logic.
 */

import type { UORRing } from "@/modules/ring-core/ring";
import { Q0, fromBytes } from "@/modules/ring-core/ring";
import { computePartition } from "@/modules/resolver/partition";
import { resolve } from "@/modules/resolver/resolver";
import { contentAddress } from "@/modules/identity";
import { computeTriad } from "@/modules/triad";
import { DatumShape, PartitionShape } from "./shapes";
import type { Violation } from "./shapes";
import { bytesToGlyph } from "@/modules/identity";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ConformanceTest {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  violations: Violation[];
}

export interface ConformanceSuiteResult {
  tests: ConformanceTest[];
  allPassed: boolean;
  totalDurationMs: number;
  timestamp: string;
}

// ── Individual tests ────────────────────────────────────────────────────────

function testRing(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  // Ring must have valid quantum, width, bits, cycle
  if (ring.quantum < 0) violations.push({ shapeId: "Ring", property: "quantum", message: "quantum must be >= 0", severity: "error" });
  if (ring.width !== ring.quantum + 1) violations.push({ shapeId: "Ring", property: "width", message: "width must equal quantum + 1", severity: "error" });
  if (ring.bits !== 8 * ring.width) violations.push({ shapeId: "Ring", property: "bits", message: "bits must equal 8 × width", severity: "error" });
  if (ring.cycle !== BigInt(1) << BigInt(ring.bits)) violations.push({ shapeId: "Ring", property: "cycle", message: "cycle must equal 2^bits", severity: "error" });

  return { id: "ring", name: "Ring", description: "Validates ring configuration properties", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

function testPrimitives(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  // Test all 5 signature operations exist and produce correct-length output
  const testVal = ring.toBytes(42);
  const ops: [string, () => number[]][] = [
    ["neg", () => ring.neg(testVal)],
    ["bnot", () => ring.bnot(testVal)],
    ["xor", () => ring.xor(testVal, ring.toBytes(7))],
    ["band", () => ring.band(testVal, ring.toBytes(7))],
    ["bor", () => ring.bor(testVal, ring.toBytes(7))],
  ];

  for (const [name, fn] of ops) {
    const result = fn();
    if (result.length !== ring.width) {
      violations.push({ shapeId: "Primitives", property: name, message: `${name} output length ${result.length} != width ${ring.width}`, severity: "error" });
    }
  }

  // neg and bnot are involutions: f(f(x)) = x
  const negNeg = ring.neg(ring.neg(testVal));
  if (fromBytes(negNeg) !== fromBytes(testVal)) {
    violations.push({ shapeId: "Primitives", property: "neg", message: "neg is not an involution", severity: "error" });
  }
  const bnotBnot = ring.bnot(ring.bnot(testVal));
  if (fromBytes(bnotBnot) !== fromBytes(testVal)) {
    violations.push({ shapeId: "Primitives", property: "bnot", message: "bnot is not an involution", severity: "error" });
  }

  return { id: "primitives", name: "Primitives", description: "Validates operation signatures and involutions", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

function testTermGraph(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  // Validate that triads are well-formed for a sample of values
  for (const v of [0, 1, 42, 127, 128, 255]) {
    const bytes = ring.toBytes(v);
    const triad = computeTriad(bytes);

    if (triad.datum.length !== ring.width) {
      violations.push({ shapeId: "TermGraph", property: "datum", message: `Triad datum length wrong for v=${v}`, severity: "error" });
    }
    if (triad.stratum.length !== ring.width) {
      violations.push({ shapeId: "TermGraph", property: "stratum", message: `Triad stratum length wrong for v=${v}`, severity: "error" });
    }
    if (triad.spectrum.length !== ring.width) {
      violations.push({ shapeId: "TermGraph", property: "spectrum", message: `Triad spectrum length wrong for v=${v}`, severity: "error" });
    }
  }

  return { id: "termGraph", name: "TermGraph", description: "Validates triadic term structure", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

function testStateLifecycle(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  // State transitions: succ(pred(x)) = x and pred(succ(x)) = x
  for (const v of [0, 1, 42, 127, 128, 255]) {
    const b = ring.toBytes(v);
    const sp = fromBytes(ring.succ(ring.pred(b)));
    const ps = fromBytes(ring.pred(ring.succ(b)));

    if (sp !== v) {
      violations.push({ shapeId: "StateLifecycle", property: "succ∘pred", message: `succ(pred(${v})) = ${sp} ≠ ${v}`, severity: "error" });
    }
    if (ps !== v) {
      violations.push({ shapeId: "StateLifecycle", property: "pred∘succ", message: `pred(succ(${v})) = ${ps} ≠ ${v}`, severity: "error" });
    }
  }

  return { id: "stateLifecycle", name: "StateLifecycle", description: "Validates state transitions (succ∘pred = id)", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

function testPartition(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  const p = computePartition(ring, undefined, "graphClosed");
  const result = PartitionShape({
    units: p.units,
    exterior: p.exterior,
    irreducible: p.irreducible,
    reducible: p.reducible,
    bits: ring.bits,
  });

  violations.push(...result.violations);

  if (!p.closureVerified) {
    violations.push({ shapeId: "Partition", property: "closure", message: `Graph closure failed: ${p.closureErrors.length} error(s)`, severity: "error" });
  }

  return { id: "partition", name: "Partition", description: "Validates four-set partition with graph closure", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

function testCriticalIdentity(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  const max = Math.min(Number(ring.cycle), 256);
  for (let x = 0; x < max; x++) {
    const b = ring.toBytes(x);
    const negBnot = fromBytes(ring.neg(ring.bnot(b)));
    const succX = fromBytes(ring.succ(b));

    if (negBnot !== succX) {
      violations.push({
        shapeId: "CriticalIdentity",
        property: "neg(bnot(x))",
        message: `neg(bnot(${x})) = ${negBnot} ≠ succ(${x}) = ${succX}`,
        severity: "error",
      });
    }

    // Also verify via IRI: both should produce the same content address
    const iriNegBnot = contentAddress(ring, negBnot);
    const iriSucc = contentAddress(ring, succX);
    if (iriNegBnot !== iriSucc) {
      violations.push({
        shapeId: "CriticalIdentity",
        property: "IRI",
        message: `IRI mismatch for x=${x}: neg(bnot) → ${iriNegBnot}, succ → ${iriSucc}`,
        severity: "error",
      });
    }
  }

  return { id: "criticalIdentity", name: "CriticalIdentity", description: "Validates neg(bnot(x)) = succ(x) for all values + IRI consistency", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

function testEndToEnd(ring: UORRing): ConformanceTest {
  const start = performance.now();
  const violations: Violation[] = [];

  // Full resolution cycle: value → resolve → IRI → datum shape validation
  for (const v of [0, 1, 42, 128, 255]) {
    const r = resolve(ring, v);

    if (!r.canonicalIri.startsWith("https://uor.foundation/")) {
      violations.push({ shapeId: "EndToEnd", property: "canonicalIri", message: `Invalid IRI for v=${v}: ${r.canonicalIri}`, severity: "error" });
    }

    // Build a datum record and validate its shape
    const bytes = ring.toBytes(v);
    const triad = computeTriad(bytes);
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
      violations.push(...shapeResult.violations.map((v) => ({ ...v, shapeId: "EndToEnd" })));
    }
  }

  return { id: "endToEnd", name: "EndToEnd", description: "Validates full resolution cycle (value → IRI → datum shape)", passed: violations.length === 0, durationMs: performance.now() - start, violations };
}

// ── Suite runner ────────────────────────────────────────────────────────────

/**
 * Run all 7 SHACL conformance tests against the given ring.
 */
export function runConformanceSuite(ring?: UORRing): ConformanceSuiteResult {
  const r = ring ?? Q0();
  const start = performance.now();

  const tests: ConformanceTest[] = [
    testRing(r),
    testPrimitives(r),
    testTermGraph(r),
    testStateLifecycle(r),
    testPartition(r),
    testCriticalIdentity(r),
    testEndToEnd(r),
  ];

  return {
    tests,
    allPassed: tests.every((t) => t.passed),
    totalDurationMs: Math.round(performance.now() - start),
    timestamp: new Date().toISOString(),
  };
}
