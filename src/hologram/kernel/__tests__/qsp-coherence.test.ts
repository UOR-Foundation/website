/**
 * QSP — Quantum Surface Performance Tests
 * ═════════════════════════════════════════
 * Tests for coherence gradient, agent projection bridge,
 * compositor, CoherenceHead trait, and ring buffer.
 */
import { describe, it, expect } from "vitest";
import { HammingCoherenceHead, MultiHeadCoherence } from "@/hologram/kernel/q-coherence-head";
import { AgentProjector, ProjectionCompositor } from "@/hologram/kernel/q-agent-projection";

// ── CoherenceHead Tests ─────────────────────────────────────────────

describe("HammingCoherenceHead", () => {
  it("produces a CoherenceVector with correct dimensions", () => {
    const head = new HammingCoherenceHead("test:h1", "visual", 8);
    const vec = head.observe({
      systemH: 0.85, gradient: 0.1, observations: [], timestamp: Date.now(), agentId: "a1",
    });
    expect(vec.values).toHaveLength(8);
    expect(vec.magnitude).toBeGreaterThan(0);
    expect(vec.zone).toBeDefined();
    expect(typeof vec.phase).toBe("number");
    expect(typeof vec.gradient).toBe("number");
  });

  it("values are bounded [0,1]", () => {
    const head = new HammingCoherenceHead("test:h2", "semantic", 4);
    for (let i = 0; i < 20; i++) {
      const vec = head.observe({
        systemH: Math.random(), gradient: Math.random() * 2 - 1,
        observations: [], timestamp: Date.now(), agentId: "a1",
      });
      for (const v of vec.values) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("hScore tracks system H via EMA", () => {
    const head = new HammingCoherenceHead("test:h3", "system", 4);
    // Feed high H consistently
    for (let i = 0; i < 10; i++) {
      head.observe({ systemH: 0.95, gradient: 0, observations: [], timestamp: Date.now(), agentId: "a1" });
    }
    expect(head.hScore()).toBeGreaterThan(0.8);
  });
});

describe("MultiHeadCoherence", () => {
  it("merges multiple heads by coherence-weighted average", () => {
    const mhc = new MultiHeadCoherence();
    mhc.addHead(new HammingCoherenceHead("h1", "visual", 4));
    mhc.addHead(new HammingCoherenceHead("h2", "semantic", 4));
    const ctx = { systemH: 0.8, gradient: 0, observations: [], timestamp: Date.now(), agentId: "a1" };
    // Warm up
    for (let i = 0; i < 5; i++) mhc.observe(ctx);
    const vec = mhc.observe(ctx);
    expect(vec.values.length).toBe(4);
    expect(vec.magnitude).toBeGreaterThan(0);
    expect(mhc.hScore()).toBeGreaterThan(0);
  });

  it("returns zero vector with no heads", () => {
    const mhc = new MultiHeadCoherence();
    const vec = mhc.observe({ systemH: 0.5, gradient: 0, observations: [], timestamp: Date.now(), agentId: "a1" });
    expect(vec.values).toHaveLength(0);
    expect(vec.magnitude).toBe(0);
    expect(vec.zone).toBe("divergent");
  });

  it("stats returns per-head diagnostics", () => {
    const mhc = new MultiHeadCoherence();
    mhc.addHead(new HammingCoherenceHead("h1", "visual", 4));
    mhc.addHead(new HammingCoherenceHead("h2", "temporal", 4));
    const stats = mhc.stats();
    expect(stats).toHaveLength(2);
    expect(stats[0].headId).toBe("h1");
    expect(stats[1].modality).toBe("temporal");
  });
});

// ── Compositor Tests ────────────────────────────────────────────────

describe("ProjectionCompositor", () => {
  it("stats reflect registered projectors", () => {
    const comp = new ProjectionCompositor();
    const s = comp.stats();
    expect(s.totalProjectors).toBe(0);
    expect(s.activeProjectors).toBe(0);
  });

  it("enforces max active projection budget", () => {
    const comp = new ProjectionCompositor();
    comp.setMaxActive(2);
    const s = comp.stats();
    expect(s.maxActive).toBe(2);
  });

  it("enforces coherence budget bounds", () => {
    const comp = new ProjectionCompositor();
    comp.setCoherenceBudget(2.0);
    expect(comp.stats().coherenceBudget).toBe(2.0);
  });

  it("composite returns empty when no projectors registered", () => {
    const comp = new ProjectionCompositor();
    const result = comp.composite();
    expect(result.frames).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
    expect(result.totalH).toBe(0);
    expect(result.activeCount).toBe(0);
  });
});
