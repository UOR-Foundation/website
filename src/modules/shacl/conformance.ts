/**
 * UOR Conformance Suite — Authoritative Mathematical Checkpoint
 *
 * TypeScript equivalent of the Rust `cargo run --bin uor-conformance` suite.
 * Every test is traceable to a named Rust fixture file and a UOR ontology
 * class or property.
 *
 * The suite is the mathematical integrity gate for the entire UNS platform.
 * No service may deploy if this suite fails.
 *
 * Test Groups:
 *   1. Ring Operations     (op: namespace)        — 8 tests
 *   2. Critical Identity   (proof: namespace)     — 1 test (256 elements)
 *   3. Partition           (partition: namespace)  — 9 tests
 *   4. Resolver            (resolver:, u:)        — 6 tests (async)
 *   5. Certificates        (cert: namespace)      — 4 tests (async)
 *   6. End-to-End          (full cycle)           — 4 tests (async)
 *   7. Involution Certs    (cert:Involution)      — 3 tests
 *
 * @see conformance/src/tests/fixtures/ — Rust fixture equivalents
 */

import type { ConformanceSuiteResult, ConformanceTest } from "./conformance-types";
import { testRingOperations } from "./conformance-ring";
import { testCriticalIdentity } from "./conformance-critical";
import { testPartition } from "./conformance-partition";
import { testResolver } from "./conformance-resolver";
import { testCertificates } from "./conformance-certificates";
import { testEndToEnd } from "./conformance-e2e";
import { testInvolutions } from "./conformance-involutions";

// Re-export types for backward compatibility
export type { ConformanceTest, ConformanceSuiteResult };

/**
 * Run the full UOR conformance suite.
 *
 * This is the authoritative mathematical checkpoint. If any test fails,
 * the algebraic foundation is unsound and no downstream service can be trusted.
 *
 * @returns Complete suite results with per-test traceability.
 */
export async function runConformanceSuite(): Promise<ConformanceSuiteResult> {
  const start = performance.now();

  // Groups 1, 2, 3, 7 are synchronous
  const ringGroup = testRingOperations();
  const criticalGroup = testCriticalIdentity();
  const partitionGroup = testPartition();
  const involutionGroup = testInvolutions();

  // Groups 4, 5, 6 are asynchronous (use URDNA2015 / crypto)
  const [resolverGroup, certGroup, e2eGroup] = await Promise.all([
    testResolver(),
    testCertificates(),
    testEndToEnd(),
  ]);

  const groups = [
    ringGroup,
    criticalGroup,
    partitionGroup,
    resolverGroup,
    certGroup,
    e2eGroup,
    involutionGroup,
  ];

  const results = groups.flatMap((g) => g.results);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    groups,
    results,
    passed,
    failed,
    total: results.length,
    allPassed: failed === 0,
    totalDurationMs: Math.round(performance.now() - start),
    timestamp: new Date().toISOString(),
  };
}
