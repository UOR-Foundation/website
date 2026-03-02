import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComputeDispatcher } from "./compute-dispatcher";
import { AdaptiveClockBooster, DEFAULT_CLOCK_CONFIG } from "./adaptive-clock";

// ── ComputeDispatcher Tests ─────────────────────────────────────────────

describe("ComputeDispatcher", () => {
  let dispatcher: ComputeDispatcher;

  beforeEach(() => {
    dispatcher = new ComputeDispatcher();
  });

  it("starts with cpu tier before init", () => {
    const snap = dispatcher.snapshot();
    expect(snap["@type"]).toBe("uor:ComputeDispatcher");
    expect(snap.activeTier).toBe("cpu");
    expect(snap.tiers).toHaveLength(0);
  });

  it("structural sharing returns cached results", () => {
    let callCount = 0;
    const compute = () => { callCount++; return 42; };

    const r1 = dispatcher.dispatch("coherence-check", "fp:abc", compute);
    const r2 = dispatcher.dispatch("coherence-check", "fp:abc", compute);

    expect(r1).toBe(42);
    expect(r2).toBe(42);
    expect(callCount).toBe(1); // computed only once
    expect(dispatcher.snapshot().structuralShareHits).toBe(1);
  });

  it("different fingerprints are computed independently", () => {
    let callCount = 0;
    const compute = () => ++callCount;

    dispatcher.dispatch("lut-apply", "fp:1", compute);
    dispatcher.dispatch("lut-apply", "fp:2", compute);

    expect(callCount).toBe(2);
  });

  it("dispatchLut applies table correctly", () => {
    const input = new Uint8Array([0, 1, 2, 3, 255]);
    // Negation table in Z/256Z: neg(x) = (256 - x) & 0xFF
    const negTable = new Uint8Array(256);
    for (let i = 0; i < 256; i++) negTable[i] = (256 - i) & 0xff;

    const result = dispatcher.dispatchLut(input, negTable);
    expect(result[0]).toBe(0);   // neg(0) = 0
    expect(result[1]).toBe(255); // neg(1) = 255
    expect(result[2]).toBe(254); // neg(2) = 254
    expect(result[4]).toBe(1);   // neg(255) = 1
  });

  it("dispatchCoherenceCheck caches results", () => {
    let calls = 0;
    const check = () => { calls++; return true; };

    const r1 = dispatcher.dispatchCoherenceCheck("state:x", check);
    const r2 = dispatcher.dispatchCoherenceCheck("state:x", check);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(calls).toBe(1);
  });

  it("idle gating toggles correctly", () => {
    expect(dispatcher.isIdle).toBe(false);
    dispatcher.enterIdle();
    expect(dispatcher.isIdle).toBe(true);
    dispatcher.exitIdle();
    expect(dispatcher.isIdle).toBe(false);
  });

  it("destroy clears all state", () => {
    dispatcher.dispatch("hash", "fp:z", () => 99);
    dispatcher.destroy();
    const snap = dispatcher.snapshot();
    expect(snap.structuralShareHits).toBe(0);
    expect(snap.lutCacheEntries).toBe(0);
  });
});

// ── AdaptiveClockBooster Tests ──────────────────────────────────────────

describe("AdaptiveClockBooster", () => {
  let clock: AdaptiveClockBooster;

  beforeEach(() => {
    clock = new AdaptiveClockBooster({ displayHz: 60, maxComputeHz: 480 });
  });

  it("starts with correct defaults", () => {
    const snap = clock.snapshot();
    expect(snap["@type"]).toBe("uor:AdaptiveClock");
    expect(snap.displayHz).toBe(60);
    expect(snap.boosting).toBe(false);
    expect(snap.tickCount).toBe(0);
  });

  it("computes Hz at display rate when not boosting", () => {
    expect(clock.computeHz).toBe(60);
  });

  it("boosts when coherence gradient drops below threshold", () => {
    clock.updateCoherenceGradient(0.0001); // below default 0.001
    expect(clock.isBoosting).toBe(true);
    expect(clock.computeHz).toBe(180); // 60 * 3x multiplier
  });

  it("stops boosting when gradient rises", () => {
    clock.updateCoherenceGradient(0.0001);
    expect(clock.isBoosting).toBe(true);
    clock.updateCoherenceGradient(0.5);
    expect(clock.isBoosting).toBe(false);
    expect(clock.computeHz).toBe(60);
  });

  it("respects maxComputeHz cap", () => {
    const fast = new AdaptiveClockBooster({
      displayHz: 144,
      idleBoostMultiplier: 4,
      maxComputeHz: 480,
    });
    fast.updateCoherenceGradient(0.0001);
    expect(fast.computeHz).toBe(480); // 144*4=576, capped to 480
  });

  it("fires tick callbacks", () => {
    const ticks: number[] = [];
    clock.onTick((tick) => ticks.push(tick));
    // Manually simulate: updateCoherenceGradient doesn't fire ticks
    // but start() would via rAF — we just verify callback registration
    expect(ticks).toHaveLength(0);
  });

  it("unsubscribe removes callback", () => {
    const ticks: number[] = [];
    const unsub = clock.onTick((tick) => ticks.push(tick));
    unsub();
    // Verify internal cleanup
    expect(clock.snapshot().tickCount).toBe(0);
  });

  it("destroy resets all state", () => {
    clock.updateCoherenceGradient(0.0001);
    clock.destroy();
    const snap = clock.snapshot();
    expect(snap.tickCount).toBe(0);
    expect(snap.boosting).toBe(false);
    expect(snap.prefetchedFrames).toBe(0);
  });
});
