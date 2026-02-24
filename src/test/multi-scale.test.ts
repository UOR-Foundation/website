/**
 * Multi-Scale Observer Tests — 12 verifications
 *
 * Validates the holographic zoom engine across all 6 levels:
 * L0 Byte, L1 Datum, L2 Operation, L3 Module, L4 Projection, L5 Network.
 */
import { describe, it, expect } from "vitest";
import {
  MultiScaleObserver,
  observeByte,
  observeDatum,
  observeOperation,
  observeModule,
  observeProjection,
  observeNetwork,
  createFullStackObservation,
  SCALE_LABELS,
} from "@/modules/observable/multi-scale";

describe("Multi-Scale Observer", () => {
  // ── L0: Byte ──────────────────────────────────────────────────────────

  it("L0: byte in full Q0 graph → COHERENCE, H=0", () => {
    const obs = observeByte(42);
    expect(obs.level).toBe(0);
    expect(obs.hScore).toBe(0);
    expect(obs.zone).toBe("COHERENCE");
    expect(obs.phi).toBe(1);
  });

  it("L0: byte in sparse graph → H > 0", () => {
    const obs = observeByte(1, [0, 2, 4]); // 1 is 1 bit from 0
    expect(obs.hScore).toBe(1);
    expect(obs.zone).toBe("COHERENCE"); // H=1 ≤ 2
  });

  // ── L1: Datum ─────────────────────────────────────────────────────────

  it("L1: datum triad coherence with full graph", () => {
    const obs = observeDatum(42);
    expect(obs.level).toBe(1);
    expect(obs.hScore).toBe(0); // All elements in full graph
    expect(obs.zone).toBe("COHERENCE");
    expect(obs.meta.criticalIdentityHolds).toBe(1);
  });

  it("L1: datum has 3 byte children", () => {
    const obs = observeDatum(42);
    expect(obs.children).toHaveLength(3);
    expect(obs.children).toContain("byte:42");
  });

  // ── L2: Operation ─────────────────────────────────────────────────────

  it("L2: isometric operation (input===output) → H=0", () => {
    const obs = observeOperation("op1", "neg", 42, 42);
    expect(obs.level).toBe(2);
    expect(obs.hScore).toBe(0);
    expect(obs.zone).toBe("COHERENCE");
    expect(obs.meta.logosClass).toBe("isometry");
  });

  it("L2: high-distortion operation → COLLAPSE", () => {
    const obs = observeOperation("op2", "corrupt", 0, 0xff);
    expect(obs.hScore).toBe(8);
    expect(obs.zone).toBe("COLLAPSE");
    expect(obs.meta.logosClass).toBe("arbitrary");
  });

  // ── L3: Module ────────────────────────────────────────────────────────

  it("L3: module composed from coherent ops → COHERENCE", () => {
    const ops = [
      observeOperation("a", "neg", 10, 10),
      observeOperation("b", "bnot", 20, 20),
    ];
    const mod = observeModule("ring-core", "Q0 Ring", ops);
    expect(mod.level).toBe(3);
    expect(mod.hScore).toBe(0);
    expect(mod.zone).toBe("COHERENCE");
    expect(mod.phi).toBe(1);
  });

  // ── L4: Projection ───────────────────────────────────────────────────

  it("L4: projection composed from modules", () => {
    const ops = [observeOperation("x", "t", 0, 0)];
    const m1 = observeModule("m1", "Mod1", ops);
    const m2 = observeModule("m2", "Mod2", ops);
    const proj = observeProjection("p1", "Foundation", [m1, m2]);
    expect(proj.level).toBe(4);
    expect(proj.zone).toBe("COHERENCE");
    expect(proj.children).toHaveLength(2);
  });

  // ── L5: Network ──────────────────────────────────────────────────────

  it("L5: network telos from coherent projections", () => {
    const ops = [observeOperation("x", "t", 0, 0)];
    const mod = observeModule("m1", "Mod1", ops);
    const proj = observeProjection("p1", "Foundation", [mod]);
    const net = observeNetwork([proj]);
    expect(net.level).toBe(5);
    expect(net.zone).toBe("COHERENCE");
    expect(net.meta.telosProgress).toBe(1);
  });

  // ── Cross-Scale ──────────────────────────────────────────────────────

  it("Cross-scale coherence: coherent scenario is consistent", () => {
    const mso = createFullStackObservation("coherent");
    const cs = mso.crossScaleCoherence();
    expect(cs.levels).toHaveLength(6);
    // All populated levels should exist
    const populated = cs.levels.filter(l => l.count > 0);
    expect(populated.length).toBeGreaterThanOrEqual(4);
  });

  it("Zoom in/out navigation works", () => {
    const mso = createFullStackObservation("coherent");
    const network = mso.getLevel(5);
    expect(network.length).toBe(1);
    // Zoom into network children
    const children = mso.zoomIn(network[0].entityId);
    expect(children.length).toBeGreaterThan(0);
    // Zoom back out
    const parents = mso.zoomOut(children[0].entityId);
    expect(parents.length).toBeGreaterThan(0);
  });

  it("SCALE_LABELS covers all 6 levels", () => {
    for (let l = 0; l <= 5; l++) {
      expect(SCALE_LABELS[l as 0|1|2|3|4|5]).toBeDefined();
      expect(SCALE_LABELS[l as 0|1|2|3|4|5].name).toBeTruthy();
    }
  });
});
