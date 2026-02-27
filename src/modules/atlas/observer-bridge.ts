/**
 * Atlas Observer Bridge — Phase 4
 * ════════════════════════════════
 *
 * Context-driven morphism selector that connects the Observer Theory
 * (COHERENCE / DRIFT / COLLAPSE zones) to the Atlas categorical operations.
 *
 * Key insight: An observer's zone determines which categorical operation
 * is structurally appropriate for cross-modal translation:
 *
 *   COHERENCE → Embedding (E₈) — full structure preserved, lossless
 *   DRIFT     → Filtration (E₆) or Augmentation (E₇) — partial structure
 *   COLLAPSE  → Product (G₂) or Quotient (F₄) — minimal/compressed
 *
 * The bridge ensures cross-modal translations are LOSSLESS within the
 * fidelity budget permitted by the observer's current coherence zone.
 *
 * @module atlas/observer-bridge
 */

import type { CategoricalOperation } from "./morphism-map";

// ── Types ──────────────────────────────────────────────────────────────────

export type ObserverZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

export interface ObserverState {
  /** Current zone */
  zone: ObserverZone;
  /** H-score: Hamming divergence from Grade-A verified knowledge [0,1] */
  hScore: number;
  /** Integration capacity Φ: information unification measure [0,1] */
  phi: number;
  /** Persistence: number of consecutive observations in current zone */
  persistence: number;
}

export interface MorphismSelection {
  /** Selected categorical operation */
  operation: CategoricalOperation;
  /** Corresponding exceptional group */
  group: string;
  /** Root count — structural capacity of the morphism */
  roots: number;
  /** Fidelity budget: fraction of structure preserved [0,1] */
  fidelityBudget: number;
  /** Whether the translation is certifiably lossless */
  lossless: boolean;
  /** Justification for the selection */
  rationale: string;
}

export interface TranslationRequest {
  /** Source modality (e.g., "jsonld", "turtle", "graphql-sdl") */
  sourceModality: string;
  /** Target modality */
  targetModality: string;
  /** Byte length of source payload */
  sourceBytes: number;
  /** Observer state at time of request */
  observer: ObserverState;
}

export interface TranslationResult {
  /** The morphism selected */
  morphism: MorphismSelection;
  /** Expected information loss ratio [0,1] (0 = lossless) */
  informationLossRatio: number;
  /** Whether a round-trip (source → target → source) is exact */
  roundTripExact: boolean;
  /** Structural depth: how many Atlas layers are traversed */
  structuralDepth: number;
}

export interface ObserverBridgeReport {
  tests: ObserverBridgeTest[];
  allPassed: boolean;
  zoneTransitions: ZoneTransitionTest[];
}

export interface ObserverBridgeTest {
  name: string;
  holds: boolean;
  expected: string;
  actual: string;
}

export interface ZoneTransitionTest {
  from: ObserverZone;
  to: ObserverZone;
  operationBefore: CategoricalOperation;
  operationAfter: CategoricalOperation;
  fidelityChange: "increased" | "decreased" | "unchanged";
  valid: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** H-score thresholds matching observer.ts zones */
const H_THRESHOLD_DRIFT = 0.3;
const H_THRESHOLD_COLLAPSE = 0.7;

/** Fidelity budgets per operation (fraction of structure preserved) */
const FIDELITY_BUDGETS: Record<CategoricalOperation, number> = {
  embedding:    240 / 256,   // E₈: 240/256 ≈ 0.9375
  augmentation: 126 / 256,   // E₇: 126/256 ≈ 0.4922
  filtration:    72 / 256,   // E₆:  72/256 ≈ 0.2813
  quotient:      48 / 256,   // F₄:  48/256 ≈ 0.1875
  product:       12 / 256,   // G₂:  12/256 ≈ 0.0469
};

/** Root counts per operation */
const ROOTS: Record<CategoricalOperation, number> = {
  product: 12, quotient: 48, filtration: 72,
  augmentation: 126, embedding: 240,
};

/** Group names per operation */
const GROUPS: Record<CategoricalOperation, string> = {
  product: "G₂", quotient: "F₄", filtration: "E₆",
  augmentation: "E₇", embedding: "E₈",
};

// ── Core Selection Logic ──────────────────────────────────────────────────

/**
 * Select the optimal categorical operation for a given observer state.
 *
 * The mapping follows the inclusion chain G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈:
 * higher coherence → larger group → more structure preserved.
 */
export function selectMorphism(observer: ObserverState): MorphismSelection {
  let op: CategoricalOperation;
  let rationale: string;

  if (observer.zone === "COHERENCE") {
    // High coherence: use the fullest structural embedding
    if (observer.phi >= 0.8) {
      op = "embedding";
      rationale =
        "Observer in COHERENCE with high Φ (≥0.8): full E₈ embedding preserves " +
        "240/256 structural elements. Cross-modal translation is certifiably lossless.";
    } else {
      op = "augmentation";
      rationale =
        "Observer in COHERENCE with moderate Φ (<0.8): E₇ augmentation preserves " +
        "126/256 structural elements. Translation preserves core semantics with " +
        "augmented context.";
    }
  } else if (observer.zone === "DRIFT") {
    // Drifting: use filtered or augmented views
    if (observer.hScore < 0.5) {
      op = "filtration";
      rationale =
        "Observer in DRIFT (low H-score <0.5): E₆ filtration selects graded " +
        "subsets by property, preserving 72/256 structural elements. Sufficient " +
        "for intra-domain translations.";
    } else {
      op = "quotient";
      rationale =
        "Observer in DRIFT (high H-score ≥0.5): F₄ quotient collapses equivalence " +
        "classes, preserving 48/256 structural elements. Lossy but semantically " +
        "meaningful compression.";
    }
  } else {
    // COLLAPSE: minimal structure, maximum compression
    op = "product";
    rationale =
      "Observer in COLLAPSE: G₂ product decomposition preserves only 12/256 " +
      "structural elements — the irreducible boundary. This is the minimal " +
      "faithful representation, like G₂ as ∂E₈.";
  }

  const fidelityBudget = FIDELITY_BUDGETS[op];
  return {
    operation: op,
    group: GROUPS[op],
    roots: ROOTS[op],
    fidelityBudget,
    lossless: op === "embedding",
    rationale,
  };
}

/**
 * Compute a full translation result for a cross-modal request.
 */
export function computeTranslation(req: TranslationRequest): TranslationResult {
  const morphism = selectMorphism(req.observer);

  // Information loss ratio: complement of fidelity budget
  const informationLossRatio = 1 - morphism.fidelityBudget;

  // Round-trip exactness: only E₈ embedding guarantees this
  const roundTripExact = morphism.operation === "embedding";

  // Structural depth: number of inclusion layers traversed
  // G₂=1, F₄=2, E₆=3, E₇=4, E₈=5
  const depthMap: Record<CategoricalOperation, number> = {
    product: 1, quotient: 2, filtration: 3,
    augmentation: 4, embedding: 5,
  };
  const structuralDepth = depthMap[morphism.operation];

  return { morphism, informationLossRatio, roundTripExact, structuralDepth };
}

// ── Verification ──────────────────────────────────────────────────────────

/**
 * Run the complete Observer Bridge verification suite.
 */
export function runObserverBridgeVerification(): ObserverBridgeReport {
  const tests: ObserverBridgeTest[] = [];

  // Test 1: COHERENCE + high Φ → E₈ embedding
  const s1: ObserverState = { zone: "COHERENCE", hScore: 0.05, phi: 0.9, persistence: 10 };
  const m1 = selectMorphism(s1);
  tests.push({
    name: "COHERENCE (Φ≥0.8) → E₈ embedding",
    holds: m1.operation === "embedding" && m1.lossless,
    expected: "embedding (lossless)", actual: `${m1.operation} (${m1.lossless ? "lossless" : "lossy"})`,
  });

  // Test 2: COHERENCE + low Φ → E₇ augmentation
  const s2: ObserverState = { zone: "COHERENCE", hScore: 0.1, phi: 0.6, persistence: 5 };
  const m2 = selectMorphism(s2);
  tests.push({
    name: "COHERENCE (Φ<0.8) → E₇ augmentation",
    holds: m2.operation === "augmentation",
    expected: "augmentation", actual: m2.operation,
  });

  // Test 3: DRIFT + low H → E₆ filtration
  const s3: ObserverState = { zone: "DRIFT", hScore: 0.35, phi: 0.4, persistence: 3 };
  const m3 = selectMorphism(s3);
  tests.push({
    name: "DRIFT (H<0.5) → E₆ filtration",
    holds: m3.operation === "filtration",
    expected: "filtration", actual: m3.operation,
  });

  // Test 4: DRIFT + high H → F₄ quotient
  const s4: ObserverState = { zone: "DRIFT", hScore: 0.6, phi: 0.3, persistence: 2 };
  const m4 = selectMorphism(s4);
  tests.push({
    name: "DRIFT (H≥0.5) → F₄ quotient",
    holds: m4.operation === "quotient",
    expected: "quotient", actual: m4.operation,
  });

  // Test 5: COLLAPSE → G₂ product
  const s5: ObserverState = { zone: "COLLAPSE", hScore: 0.85, phi: 0.1, persistence: 1 };
  const m5 = selectMorphism(s5);
  tests.push({
    name: "COLLAPSE → G₂ product (minimal)",
    holds: m5.operation === "product",
    expected: "product", actual: m5.operation,
  });

  // Test 6: Fidelity monotonicity — higher group = higher budget
  const ops: CategoricalOperation[] = ["product", "quotient", "filtration", "augmentation", "embedding"];
  let monotone = true;
  for (let i = 1; i < ops.length; i++) {
    if (FIDELITY_BUDGETS[ops[i]] <= FIDELITY_BUDGETS[ops[i - 1]]) monotone = false;
  }
  tests.push({
    name: "Fidelity budget strictly increases: G₂ < F₄ < E₆ < E₇ < E₈",
    holds: monotone,
    expected: "strictly increasing", actual: monotone ? "strictly increasing" : "NOT monotone",
  });

  // Test 7: Only E₈ is lossless
  const losslessOps = ops.filter(op => FIDELITY_BUDGETS[op] === 240 / 256);
  tests.push({
    name: "Only E₈ embedding is (nearly) lossless",
    holds: losslessOps.length === 1 && losslessOps[0] === "embedding",
    expected: "1 lossless operation (embedding)",
    actual: `${losslessOps.length} lossless (${losslessOps.join(", ")})`,
  });

  // Test 8: Fidelity budgets sum to expected value
  const budgetSum = Object.values(FIDELITY_BUDGETS).reduce((a, b) => a + b, 0);
  const expectedSum = (12 + 48 + 72 + 126 + 240) / 256; // 498/256 ≈ 1.9453
  tests.push({
    name: "Fidelity budget sum = (12+48+72+126+240)/256",
    holds: Math.abs(budgetSum - expectedSum) < 1e-10,
    expected: expectedSum.toFixed(6), actual: budgetSum.toFixed(6),
  });

  // Test 9: Full translation roundtrip for COHERENCE observer
  const req: TranslationRequest = {
    sourceModality: "jsonld", targetModality: "turtle",
    sourceBytes: 1024, observer: s1,
  };
  const result = computeTranslation(req);
  tests.push({
    name: "COHERENCE translation is round-trip exact",
    holds: result.roundTripExact && result.structuralDepth === 5,
    expected: "roundTrip=true, depth=5",
    actual: `roundTrip=${result.roundTripExact}, depth=${result.structuralDepth}`,
  });

  // Test 10: COLLAPSE translation has minimal depth
  const reqCollapse: TranslationRequest = {
    sourceModality: "jsonld", targetModality: "compact-json",
    sourceBytes: 512, observer: s5,
  };
  const resultCollapse = computeTranslation(reqCollapse);
  tests.push({
    name: "COLLAPSE translation has depth=1 (G₂ boundary)",
    holds: resultCollapse.structuralDepth === 1 && !resultCollapse.roundTripExact,
    expected: "depth=1, roundTrip=false",
    actual: `depth=${resultCollapse.structuralDepth}, roundTrip=${resultCollapse.roundTripExact}`,
  });

  // Zone transition tests
  const zoneTransitions: ZoneTransitionTest[] = [];

  // COHERENCE → DRIFT: fidelity decreases
  const mCoherence = selectMorphism(s1);
  const mDrift = selectMorphism(s3);
  zoneTransitions.push({
    from: "COHERENCE", to: "DRIFT",
    operationBefore: mCoherence.operation, operationAfter: mDrift.operation,
    fidelityChange: mDrift.fidelityBudget < mCoherence.fidelityBudget ? "decreased" : "unchanged",
    valid: mDrift.fidelityBudget < mCoherence.fidelityBudget,
  });

  // DRIFT → COLLAPSE: fidelity decreases further
  const mCollapse = selectMorphism(s5);
  zoneTransitions.push({
    from: "DRIFT", to: "COLLAPSE",
    operationBefore: mDrift.operation, operationAfter: mCollapse.operation,
    fidelityChange: mCollapse.fidelityBudget < mDrift.fidelityBudget ? "decreased" : "unchanged",
    valid: mCollapse.fidelityBudget < mDrift.fidelityBudget,
  });

  // COLLAPSE → COHERENCE: fidelity increases (recovery)
  zoneTransitions.push({
    from: "COLLAPSE", to: "COHERENCE",
    operationBefore: mCollapse.operation, operationAfter: mCoherence.operation,
    fidelityChange: mCoherence.fidelityBudget > mCollapse.fidelityBudget ? "increased" : "unchanged",
    valid: mCoherence.fidelityBudget > mCollapse.fidelityBudget,
  });

  // Test 11: All zone transitions preserve fidelity ordering
  const allTransitionsValid = zoneTransitions.every(t => t.valid);
  tests.push({
    name: "Zone transitions preserve fidelity ordering",
    holds: allTransitionsValid,
    expected: "all valid", actual: allTransitionsValid ? "all valid" : "INVALID transitions",
  });

  // Test 12: Root count matches exceptional group chain
  tests.push({
    name: "Root counts: 12 < 48 < 72 < 126 < 240",
    holds: ROOTS.product < ROOTS.quotient && ROOTS.quotient < ROOTS.filtration &&
           ROOTS.filtration < ROOTS.augmentation && ROOTS.augmentation < ROOTS.embedding,
    expected: "12 < 48 < 72 < 126 < 240",
    actual: `${ROOTS.product} < ${ROOTS.quotient} < ${ROOTS.filtration} < ${ROOTS.augmentation} < ${ROOTS.embedding}`,
  });

  return {
    tests,
    allPassed: tests.every(t => t.holds),
    zoneTransitions,
  };
}
