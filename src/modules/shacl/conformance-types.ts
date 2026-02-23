/**
 * UOR Conformance Suite — Type Definitions
 *
 * Mirrors the Rust `uor-conformance` test fixture format.
 * Each result is traceable to a specific UOR ontology class/property
 * and a named Rust test fixture file.
 *
 * @see spec/src/namespaces/ — UOR ontology namespace definitions
 */

// ── Individual test result ──────────────────────────────────────────────────

export interface ConformanceResult {
  /** Unique test identifier, e.g. 'C1.1', 'C2.1'. */
  testId: string;
  /** Rust fixture file reference, e.g. 'test1_ring_operations.rs'. */
  fixtureRef: string;
  /** UOR ontology class/property reference, e.g. 'op:Operation'. */
  uorClassRef: string;
  /** Whether the test passed. */
  passed: boolean;
  /** Expected value/state. */
  expected: unknown;
  /** Actual value/state observed. */
  actual: unknown;
  /** Citation to spec source, e.g. 'spec/src/namespaces/op.rs'. */
  citation: string;
}

// ── Test group ──────────────────────────────────────────────────────────────

export interface ConformanceGroup {
  /** Group identifier, e.g. 'ring', 'criticalIdentity'. */
  id: string;
  /** Human-readable group name. */
  name: string;
  /** Rust fixture file this group corresponds to. */
  fixtureRef: string;
  /** Individual test results within this group. */
  results: ConformanceResult[];
}

// ── Full suite result ───────────────────────────────────────────────────────

export interface ConformanceSuiteResult {
  /** All test groups with their individual results. */
  groups: ConformanceGroup[];
  /** Flattened list of all individual results (convenience accessor). */
  results: ConformanceResult[];
  /** Number of passed tests. */
  passed: number;
  /** Number of failed tests. */
  failed: number;
  /** Total number of tests. */
  total: number;
  /** Whether ALL tests passed (passed === total). */
  allPassed: boolean;
  /** Total execution time in milliseconds. */
  totalDurationMs: number;
  /** ISO 8601 timestamp of when the suite was run. */
  timestamp: string;
}

// ── Legacy compatibility type (for existing consumers) ──────────────────────

export interface ConformanceTest {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  violations: Array<{
    shapeId: string;
    property: string;
    message: string;
    severity: "error" | "warning";
  }>;
}

// ── Helper to build a result ────────────────────────────────────────────────

export function result(
  testId: string,
  fixtureRef: string,
  uorClassRef: string,
  passed: boolean,
  expected: unknown,
  actual: unknown,
  citation: string
): ConformanceResult {
  return { testId, fixtureRef, uorClassRef, passed, expected, actual, citation };
}
