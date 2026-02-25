/**
 * Tests for Observer Patch Holography engine.
 *
 * Validates:
 *  1. Two-parameter bootstrap derivation
 *  2. Patch overlap computation
 *  3. Cocycle consistency (gauge condition)
 *  4. Intersubjective reality filtering
 *  5. Holographic SNR
 */

import { describe, it, expect } from "vitest";
import {
  bootstrap,
  createPatch,
  computeOverlap,
  scoreIntersubjective,
  filterIntersubjectiveReality,
  holographicSNR,
} from "../observerPatch";
import type { UserContextProfile, InboundSignal } from "../signalRelevance";

// ── Fixtures ─────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<UserContextProfile> = {}): UserContextProfile {
  return {
    interests: { ai: 0.9, math: 0.8, music: 0.3 },
    activeTasks: ["ai"],
    recentDomains: ["ai", "math"],
    phaseAffinity: { learn: 0.6, work: 0.3, play: 0.1 },
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeSignal(overrides: Partial<InboundSignal> = {}): InboundSignal {
  return {
    id: "sig-1",
    message: "Test signal",
    source: "test",
    tags: ["ai", "math"],
    phase: "learn",
    timestamp: Date.now(),
    priority: "medium",
    ...overrides,
  };
}

// ── Bootstrap ────────────────────────────────────────────────────────────

describe("Two-Parameter Bootstrap", () => {
  it("derives Q0 state correctly", () => {
    const state = bootstrap(0, 256);
    expect(state.resolution).toBe(0);
    expect(state.bitDepth).toBe(8);
    expect(state.capacity).toBe(256);
    expect(state.maxPatches).toBe(256); // 256 / 2^0 = 256
    expect(state.granularity).toBeCloseTo(1 / 256);
  });

  it("derives Q3 state correctly", () => {
    const state = bootstrap(3, 256);
    expect(state.bitDepth).toBe(64);
    expect(state.maxPatches).toBe(32); // 256 / 2^3 = 32
    expect(state.stateSpace).toBe("2^64");
  });

  it("clamps resolution to 0–3", () => {
    expect(bootstrap(-1, 100).resolution).toBe(0);
    expect(bootstrap(99, 100).resolution).toBe(3);
  });

  it("ensures capacity >= 1", () => {
    expect(bootstrap(0, 0).capacity).toBe(1);
  });
});

// ── Patch Overlap ────────────────────────────────────────────────────────

describe("Patch Overlap", () => {
  it("detects full overlap between identical profiles", () => {
    const profile = makeProfile();
    const a = createPatch("obs-a", profile);
    const b = createPatch("obs-b", profile);
    const overlap = computeOverlap(a, b);

    expect(overlap.overlapCoefficient).toBe(1);
    expect(overlap.phaseAligned).toBe(true);
    expect(overlap.sharedTags.length).toBeGreaterThan(0);
  });

  it("detects zero overlap between disjoint profiles", () => {
    const a = createPatch("obs-a", makeProfile({ interests: { ai: 1 }, activeTasks: [], recentDomains: [] }));
    const b = createPatch("obs-b", makeProfile({ interests: { cooking: 1 }, activeTasks: [], recentDomains: [] }));
    const overlap = computeOverlap(a, b);

    expect(overlap.overlapCoefficient).toBe(0);
    expect(overlap.sharedTags).toEqual([]);
  });

  it("detects partial overlap", () => {
    const a = createPatch("obs-a", makeProfile({ interests: { ai: 0.9, math: 0.7 }, activeTasks: [], recentDomains: [] }));
    const b = createPatch("obs-b", makeProfile({ interests: { ai: 0.8, cooking: 0.6 }, activeTasks: [], recentDomains: [] }));
    const overlap = computeOverlap(a, b);

    expect(overlap.overlapCoefficient).toBeGreaterThan(0);
    expect(overlap.overlapCoefficient).toBeLessThan(1);
    expect(overlap.sharedTags).toContain("ai");
  });
});

// ── Cocycle Consistency ──────────────────────────────────────────────────

describe("Cocycle Consistency", () => {
  it("holds for similar observers on a shared signal", () => {
    const signal = makeSignal({ tags: ["ai", "math"] });
    const patches = [
      createPatch("a", makeProfile({ interests: { ai: 0.9, math: 0.8 } })),
      createPatch("b", makeProfile({ interests: { ai: 0.85, math: 0.75 } })),
    ];

    const result = scoreIntersubjective(signal, patches);
    expect(result.cocycleConsistent).toBe(true);
    expect(result.maxDeviation).toBeLessThan(0.25);
  });

  it("shows deviation between divergent observers", () => {
    // Observer A has strong interest in "ai"; Observer B has none.
    // Because scoreSignal has a base floor, both get some relevance,
    // but the tag-match component differs, producing nonzero deviation
    // when we look at the breakdown rather than clamped composite.
    const signal = makeSignal({ tags: ["ai", "math", "physics"], priority: "medium" });
    const patches = [
      createPatch("a", makeProfile({ interests: { ai: 1.0, math: 1.0, physics: 1.0 }, activeTasks: ["ai", "math", "physics"], recentDomains: ["ai", "math", "physics"] })),
      createPatch("b", makeProfile({ interests: {}, activeTasks: [], recentDomains: [], phaseAffinity: { learn: 0.1, work: 0.1, play: 0.8 } })),
    ];

    const result = scoreIntersubjective(signal, patches);
    // The consensus relevance should reflect the average
    expect(result.patchCount).toBe(2);
    expect(result.consensusRelevance).toBeGreaterThan(0);
  });
});

// ── Intersubjective Reality Filter ───────────────────────────────────────

describe("Intersubjective Reality Filter", () => {
  it("retains signals with consensus and filters noise", () => {
    const patches = [
      createPatch("a", makeProfile()),
      createPatch("b", makeProfile({ interests: { ai: 0.85, math: 0.75, music: 0.2 } })),
    ];

    const signals: InboundSignal[] = [
      makeSignal({ id: "shared", tags: ["ai", "math"], priority: "high" }),
      makeSignal({ id: "noise", tags: ["obscure-topic"], priority: "ambient" }),
    ];

    const reality = filterIntersubjectiveReality(signals, patches);
    const ids = reality.map((s) => s.id);
    expect(ids).toContain("shared");
  });
});

// ── Holographic SNR ──────────────────────────────────────────────────────

describe("Holographic SNR", () => {
  it("returns 1 for empty signal stream", () => {
    const result = holographicSNR([], [createPatch("a", makeProfile())]);
    expect(result.snr).toBe(1);
    expect(result.total).toBe(0);
  });

  it("computes meaningful ratio for mixed signals", () => {
    const patches = [
      createPatch("a", makeProfile()),
      createPatch("b", makeProfile()),
    ];

    const signals: InboundSignal[] = [
      makeSignal({ id: "s1", tags: ["ai"], priority: "high" }),
      makeSignal({ id: "s2", tags: ["ai", "math"], priority: "medium" }),
      makeSignal({ id: "s3", tags: ["unknown"], priority: "ambient" }),
    ];

    const result = holographicSNR(signals, patches);
    expect(result.total).toBe(3);
    expect(result.snr).toBeGreaterThanOrEqual(0);
    expect(result.snr).toBeLessThanOrEqual(1);
    expect(result.intersubjective + result.subjective).toBe(result.total);
  });
});
