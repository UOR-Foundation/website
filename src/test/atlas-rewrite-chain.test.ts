/**
 * Optimal Rewrite Chain Test Suite
 * ═════════════════════════════════
 * Verifies minimal-length transform compositions for circuit rewrites.
 */
import { describe, it, expect } from "vitest";
import {
  findOptimalChain,
  rewriteCircuit,
  computeReachability,
  CLIFFORD_T_SET,
  PAULI_SET,
  CLIFFORD_SET,
  FAULT_TOLERANT_SET,
} from "@/modules/atlas/rewrite-chain";
import { mapVerticesToGates } from "@/modules/atlas/quantum-isa";
import { applyTransform, IDENTITY } from "@/modules/atlas/transform-group";

describe("Optimal Rewrite Chain Engine", () => {
  const mappings = mapVerticesToGates();

  // Helper: find a vertex with a given gate name
  function vertexWithGate(name: string): number {
    const m = mappings.find(m => m.gate.name === name);
    if (!m) throw new Error(`No vertex with gate ${name}`);
    return m.vertexIndex;
  }

  describe("findOptimalChain", () => {
    it("returns trivial chain when source gate is already in target set", () => {
      const v = vertexWithGate("H");
      const chain = findOptimalChain(v, CLIFFORD_SET);
      expect(chain).not.toBeNull();
      expect(chain!.isTrivial).toBe(true);
      expect(chain!.length).toBe(0);
      expect(chain!.steps).toHaveLength(0);
    });

    it("finds a non-trivial chain for cross-tier rewrite", () => {
      const v = vertexWithGate("T");
      const chain = findOptimalChain(v, PAULI_SET);
      expect(chain).not.toBeNull();
      expect(chain!.length).toBeGreaterThan(0);
      expect(PAULI_SET.has(chain!.targetGate.name)).toBe(true);
    });

    it("chain transforms compose correctly to target vertex", () => {
      const v = vertexWithGate("T");
      const chain = findOptimalChain(v, PAULI_SET);
      expect(chain).not.toBeNull();

      // Verify step-by-step application matches
      let current = chain!.sourceVertex;
      for (const step of chain!.steps) {
        current = applyTransform(current, step.generator);
        expect(current).toBe(step.resultVertex);
      }
      expect(current).toBe(chain!.targetVertex);
    });

    it("composed transform maps source directly to target", () => {
      const v = vertexWithGate("S");
      const chain = findOptimalChain(v, PAULI_SET);
      expect(chain).not.toBeNull();
      if (!chain!.isTrivial) {
        const result = applyTransform(chain!.sourceVertex, chain!.composedTransform);
        expect(result).toBe(chain!.targetVertex);
      }
    });

    it("returns optimal (shortest) chain", () => {
      // Any gate to Clifford+T should be short since it's a large set
      const v = vertexWithGate("Rₓ(θ)");
      const chain = findOptimalChain(v, CLIFFORD_T_SET);
      expect(chain).not.toBeNull();
      // Clifford+T is large, so distance should be modest
      expect(chain!.length).toBeLessThanOrEqual(6);
    });

    it("identity source returns trivial chain for any set containing its gate", () => {
      const chain = findOptimalChain(0, new Set([mappings[0].gate.name]));
      expect(chain).not.toBeNull();
      expect(chain!.isTrivial).toBe(true);
    });
  });

  describe("rewriteCircuit", () => {
    it("rewrites a multi-gate circuit into Clifford+T", () => {
      const circuit = [
        vertexWithGate("T"),
        vertexWithGate("H"),
        vertexWithGate("CNOT"),
      ];
      const plan = rewriteCircuit(circuit, [...CLIFFORD_T_SET]);
      expect(plan.allRewritten).toBe(true);
      expect(plan.chains).toHaveLength(3);
      for (const chain of plan.chains) {
        expect(CLIFFORD_T_SET.has(chain.targetGate.name)).toBe(true);
      }
    });

    it("total cost equals sum of individual chain lengths", () => {
      const circuit = [0, 10, 20, 30];
      const plan = rewriteCircuit(circuit, [...PAULI_SET]);
      const sum = plan.chains
        .filter(c => isFinite(c.length))
        .reduce((s, c) => s + c.length, 0);
      expect(plan.totalCost).toBe(sum);
    });

    it("trivial gates contribute 0 cost", () => {
      const v = vertexWithGate("X");
      const plan = rewriteCircuit([v], [...PAULI_SET]);
      expect(plan.totalCost).toBe(0);
      expect(plan.chains[0].isTrivial).toBe(true);
    });

    it("maxChainLength tracks the hardest gate", () => {
      const circuit = [
        vertexWithGate("X"),   // trivial for Pauli
        vertexWithGate("T"),   // non-trivial for Pauli
      ];
      const plan = rewriteCircuit(circuit, [...PAULI_SET]);
      expect(plan.maxChainLength).toBeGreaterThan(0);
      expect(plan.maxChainLength).toBe(
        Math.max(...plan.chains.filter(c => isFinite(c.length)).map(c => c.length))
      );
    });
  });

  describe("computeReachability", () => {
    it("every gate is reachable from itself", () => {
      const report = computeReachability(6);
      for (const [gate, reachable] of report.reachableFrom) {
        expect(reachable.has(gate)).toBe(true);
      }
    });

    it("maxDistance is finite and > 0", () => {
      const report = computeReachability(6);
      expect(report.maxDistance).toBeGreaterThan(0);
      expect(report.maxDistance).toBeLessThanOrEqual(6);
    });

    it("avgDistance is between 0 and maxDistance", () => {
      const report = computeReachability(6);
      expect(report.avgDistance).toBeGreaterThan(0);
      expect(report.avgDistance).toBeLessThanOrEqual(report.maxDistance);
    });

    it("reports reachable pairs", () => {
      const report = computeReachability(6);
      expect(report.totalPairs).toBeGreaterThan(0);
    });
  });

  describe("predefined gate sets", () => {
    it("Clifford+T set has expected gates", () => {
      expect(CLIFFORD_T_SET.has("H")).toBe(true);
      expect(CLIFFORD_T_SET.has("T")).toBe(true);
      expect(CLIFFORD_T_SET.has("CNOT")).toBe(true);
    });

    it("Pauli set contains only self-adjoint gates", () => {
      for (const name of PAULI_SET) {
        const m = mappings.find(m => m.gate.name === name);
        if (m) expect(m.gate.selfAdjoint).toBe(true);
      }
    });

    it("fault-tolerant set contains logical gates", () => {
      expect(FAULT_TOLERANT_SET.has("X̄_L")).toBe(true);
      expect(FAULT_TOLERANT_SET.has("CNOT_L")).toBe(true);
    });
  });
});
