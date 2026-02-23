/**
 * P26 — Observer Theory — 14 verification tests.
 *
 * Tests H-Score, coherence zones, OIP/EDP/CAP protocols,
 * and convergence guarantee.
 */
import { describe, it, expect } from "vitest";
import { popcount, hScore, hScoreMultiByte } from "@/modules/observable/h-score";
import {
  UnsObserver,
  assignZone,
} from "@/modules/observable/observer";

describe("P26 — Observer Theory", () => {
  // Test 1: popcount(0b10110100) === 4
  it("1. popcount(0b10110100) === 4", () => {
    expect(popcount(0b10110100)).toBe(4);
  });

  // Test 2: popcount(0) === 0, popcount(255) === 8
  it("2. popcount(0) === 0, popcount(255) === 8", () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(255)).toBe(8);
  });

  // Test 3: hScore(42, [42]) === 0 (exact match)
  it("3. hScore(42, [42]) === 0 (exact match)", () => {
    expect(hScore(42, [42])).toBe(0);
  });

  // Test 4: hScore(42, [43]) === 1 (1-bit difference)
  it("4. hScore(42, [43]) === 1", () => {
    // 42 = 0b00101010, 43 = 0b00101011 → XOR = 0b00000001 → popcount = 1
    expect(hScore(42, [43])).toBe(1);
  });

  // Test 5: hScore(42, [0..255]) === 0 (full Q0 graph)
  it("5. hScore(42, [0..255]) === 0", () => {
    const fullQ0 = Array.from({ length: 256 }, (_, i) => i);
    expect(hScore(42, fullQ0)).toBe(0);
  });

  // Test 6: register() → zone === 'COHERENCE'
  it("6. register() → profile.zone === 'COHERENCE'", () => {
    const observer = new UnsObserver();
    const profile = observer.register("agent:test-1");
    expect(profile.zone).toBe("COHERENCE");
    expect(profile.hScore).toBe(0);
  });

  // Test 7: observe with Grade-A consistent bytes → COHERENCE
  it("7. observe() with Grade-A bytes → zone stays COHERENCE", () => {
    const observer = new UnsObserver();
    observer.register("agent:test-2");
    // Bytes that are in the full Q0 graph → H-score = 0
    const result = observer.observe("agent:test-2", new Uint8Array([42, 100, 200]));
    expect(result.zone).toBe("COHERENCE");
    expect(result.hScore).toBe(0);
  });

  // Test 8: observe with anomalous bytes on sparse graph → hScore > 0
  it("8. observe() with anomalous bytes on sparse graph → hScore > 0", () => {
    // Sparse graph: only even numbers
    const sparseGraph = Array.from({ length: 128 }, (_, i) => i * 2);
    const observer = new UnsObserver(sparseGraph);
    observer.register("agent:test-3");
    // Observe odd bytes: nearest even is 1 bit away
    const result = observer.observe("agent:test-3", new Uint8Array([1, 3, 5, 7]));
    expect(result.hScore).toBeGreaterThan(0);
  });

  // Test 9: Zone transition COHERENCE → DRIFT
  it("9. Zone transition: COHERENCE → DRIFT when hScore > threshold_low", () => {
    // Very sparse graph: only [0] → most bytes have high H-score
    const observer = new UnsObserver([0]);
    observer.register("agent:test-4", { low: 2, high: 5 });
    // Observe byte 255 = 0b11111111, XOR with 0 = popcount(255) = 8
    const result = observer.observe("agent:test-4", new Uint8Array([7]));
    // 7 = 0b00000111, XOR with 0 = popcount(7) = 3 → DRIFT (3 > 2, 3 ≤ 5)
    expect(result.hScore).toBe(3);
    expect(result.zone).toBe("DRIFT");
    expect(result.previousZone).toBe("COHERENCE");
  });

  // Test 10: runOIP returns issued:true for DRIFT agent
  it("10. runOIP() returns issued:true for DRIFT agent", () => {
    const observer = new UnsObserver([0]);
    observer.register("agent:oip-test", { low: 2, high: 5 });
    observer.observe("agent:oip-test", new Uint8Array([7])); // H=3 → DRIFT
    const oip = observer.runOIP("agent:oip-test");
    expect(oip.protocol).toBe("OIP");
    expect(oip.issued).toBe(true);
  });

  // Test 11: runCAP returns quarantined:true for COLLAPSE agent
  it("11. runCAP() returns quarantined:true for COLLAPSE agent", () => {
    const observer = new UnsObserver([0]);
    observer.register("agent:cap-test", { low: 2, high: 5 });
    // Observe byte 255: popcount(255 XOR 0) = 8 → COLLAPSE (8 > 5)
    observer.observe("agent:cap-test", new Uint8Array([255]));
    const cap = observer.runCAP("agent:cap-test");
    expect(cap.protocol).toBe("CAP");
    expect(cap.quarantined).toBe(true);
  });

  // Test 12: convergenceCheck returns converged:true when all COHERENCE
  it("12. convergenceCheck() returns converged:true when all agents COHERENCE", () => {
    const observer = new UnsObserver(); // Full Q0 graph
    observer.register("agent:c1");
    observer.register("agent:c2");
    observer.observe("agent:c1", new Uint8Array([42]));
    observer.observe("agent:c2", new Uint8Array([100]));
    const check = observer.convergenceCheck();
    expect(check.converged).toBe(true);
    expect(check.nonConvergedAgents).toEqual([]);
  });

  // Test 13: networkSummary counts match
  it("13. networkSummary() counts match registered agent distribution", () => {
    const observer = new UnsObserver([0]);
    observer.register("agent:s1", { low: 2, high: 5 });
    observer.register("agent:s2", { low: 2, high: 5 });
    observer.register("agent:s3", { low: 2, high: 5 });
    observer.observe("agent:s1", new Uint8Array([0]));    // H=0 → COHERENCE
    observer.observe("agent:s2", new Uint8Array([7]));    // H=3 → DRIFT
    observer.observe("agent:s3", new Uint8Array([255]));  // H=8 → COLLAPSE
    const summary = observer.networkSummary();
    expect(summary.coherence).toBe(1);
    expect(summary.drift).toBe(1);
    expect(summary.collapse).toBe(1);
    expect(summary.total).toBe(3);
  });

  // Test 14: H-score convergence after OIP remediation
  it("14. After OIP remediation, re-observe with Grade-A bytes → hScore=0", () => {
    const observer = new UnsObserver([0]);
    observer.register("agent:converge", { low: 2, high: 5 });
    // First: drift
    const drift = observer.observe("agent:converge", new Uint8Array([7]));
    expect(drift.zone).toBe("DRIFT");
    // OIP remediation
    observer.runOIP("agent:converge");
    // Re-observe with Grade-A consistent byte (0 is in graph)
    const converged = observer.observe("agent:converge", new Uint8Array([0]));
    expect(converged.hScore).toBe(0);
    expect(converged.zone).toBe("COHERENCE");
    // Convergence achieved
    const profile = observer.getProfile("agent:converge");
    expect(profile!.convergenceAchieved).toBe(true);
  });

  // Bonus: assignZone function
  it("bonus: assignZone correctly classifies zones", () => {
    const t = { low: 2, high: 5 };
    expect(assignZone(0, t)).toBe("COHERENCE");
    expect(assignZone(2, t)).toBe("COHERENCE");
    expect(assignZone(3, t)).toBe("DRIFT");
    expect(assignZone(5, t)).toBe("DRIFT");
    expect(assignZone(6, t)).toBe("COLLAPSE");
  });
});
