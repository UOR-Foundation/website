import { describe, it, expect } from "vitest";
import {
  constantTree, evolvingTree, tensorProduct, coproduct, internalHom,
  identityMorphism, composeMorphisms, executeInteraction, truncate,
  fppTrustEvolutionTree, tspChannelEvolutionTree, agentCapabilityEvolutionTree,
  ZERO_TREE, UNIT_TREE, DIRECTIONS,
  type TransitionContext,
} from "@/modules/uns/core/hologram/polytree";
import type { HologramSpec, ProjectionInput } from "@/modules/uns/core/hologram";
import { SPECS } from "@/modules/uns/core/hologram/specs";
import { coherenceGate } from "@/modules/uns/core/hologram/coherence-gate";

const dummySpec: HologramSpec = {
  project: ({ hex }) => `urn:test:${hex}`,
  fidelity: "lossless",
  spec: "https://example.com",
};

const dummyInput: ProjectionInput = {
  hashBytes: new Uint8Array(32).fill(42),
  cid: "bafytest",
  hex: "2a".repeat(32),
};

describe("Polynomial Trees", () => {
  // ── Constant Tree Embedding ─────────────────────────────────────────
  describe("Constant tree embedding (Spivak §6)", () => {
    it("creates a constant tree from a HologramSpec", () => {
      const tree = constantTree("test", dummySpec);
      expect(tree.isConstant).toBe(true);
      expect(tree.root.label).toBe("test");
      expect(tree.root.fidelity).toBe("lossless");
    });

    it("constant tree self-references on all transitions", () => {
      const tree = constantTree("test", dummySpec);
      const ctx: TransitionContext = { input: dummyInput, depth: 0, maxDepth: 10, history: [] };
      const child = tree.rest(0, 0, ctx);
      expect(child).toBe(tree); // Same object reference
    });

    it("ZERO_TREE is constant with 0 positions", () => {
      expect(ZERO_TREE.isConstant).toBe(true);
      expect(ZERO_TREE.root.positionCount).toBe(0);
    });

    it("UNIT_TREE is constant with 1 position, 0 directions", () => {
      expect(UNIT_TREE.isConstant).toBe(true);
      expect(UNIT_TREE.root.positionCount).toBe(1);
      expect(UNIT_TREE.root.directionCounts[0]).toBe(0);
    });
  });

  // ── Tensor Product ──────────────────────────────────────────────────
  describe("Dirichlet tensor product (Spivak §7)", () => {
    it("tensor of constant trees is constant (Corollary 7.18)", () => {
      const p = constantTree("p", dummySpec);
      const q = constantTree("q", dummySpec);
      const pq = tensorProduct(p, q);
      expect(pq.isConstant).toBe(true);
      expect(pq.root.label).toBe("p⊗q");
    });

    it("tensor position count = product of position counts", () => {
      const p = constantTree("p", { ...dummySpec, project: ({ hex }) => hex.slice(0, 8) });
      const q = constantTree("q", dummySpec);
      const pq = tensorProduct(p, q);
      expect(pq.root.positionCount).toBe(p.root.positionCount * q.root.positionCount);
    });

    it("unit tree is tensor identity", () => {
      const p = constantTree("p", dummySpec);
      const up = tensorProduct(UNIT_TREE, p);
      expect(up.root.positionCount).toBe(p.root.positionCount);
    });
  });

  // ── Coproduct ───────────────────────────────────────────────────────
  describe("Coproduct (Spivak §6)", () => {
    it("coproduct position count = sum", () => {
      const p = constantTree("p", dummySpec);
      const q = constantTree("q", dummySpec);
      const pq = coproduct(p, q);
      expect(pq.root.positionCount).toBe(2);
    });

    it("zero tree is coproduct identity", () => {
      const p = constantTree("p", dummySpec);
      const zp = coproduct(ZERO_TREE, p);
      expect(zp.root.positionCount).toBe(p.root.positionCount);
    });
  });

  // ── Morphisms ───────────────────────────────────────────────────────
  describe("Morphisms (Spivak §6, Prop 6.8)", () => {
    it("identity morphism maps positions and directions to themselves", () => {
      const p = constantTree("p", dummySpec);
      const id = identityMorphism(p);
      expect(id.rootMap.onPositions(0)).toBe(0);
      expect(id.rootMap.onDirections(0, 0)).toBe(0);
    });

    it("composition of identities is identity", () => {
      const p = constantTree("p", dummySpec);
      const id = identityMorphism(p);
      const composed = composeMorphisms(id, id);
      expect(composed.rootMap.onPositions(0)).toBe(0);
      expect(composed.rootMap.onDirections(0, 0)).toBe(0);
    });
  });

  // ── Evolving Trees ──────────────────────────────────────────────────
  describe("Evolving trees", () => {
    it("FPP trust evolution tree is not constant", () => {
      const tree = fppTrustEvolutionTree(dummySpec);
      expect(tree.isConstant).toBe(false);
      expect(tree.root.label).toBe("fpp-trust-L0");
    });

    it("FPP tree grows on VERIFIED direction", () => {
      const tree = fppTrustEvolutionTree(dummySpec);
      const ctx: TransitionContext = { input: dummyInput, depth: 0, maxDepth: 10, history: [] };
      const grown = tree.rest(0, DIRECTIONS.VERIFIED, ctx);
      expect(grown.root.positionCount).toBeGreaterThan(tree.root.positionCount);
    });

    it("FPP tree dies on REVOKED direction", () => {
      const tree = fppTrustEvolutionTree(dummySpec);
      const ctx: TransitionContext = { input: dummyInput, depth: 0, maxDepth: 10, history: [] };
      const dead = tree.rest(0, DIRECTIONS.REVOKED, ctx);
      expect(dead.root.positionCount).toBe(0);
      expect(dead).toBe(ZERO_TREE);
    });

    it("TSP channel evolution starts with handshake", () => {
      const tree = tspChannelEvolutionTree(dummySpec);
      expect(tree.root.label).toBe("tsp-channel-handshake");
      expect(tree.isConstant).toBe(false);
    });

    it("agent capability tree upgrades on UPGRADED", () => {
      const tree = agentCapabilityEvolutionTree(dummySpec);
      const ctx: TransitionContext = { input: dummyInput, depth: 0, maxDepth: 10, history: [] };
      const upgraded = tree.rest(0, DIRECTIONS.UPGRADED, ctx);
      expect(upgraded.root.positionCount).toBeGreaterThan(tree.root.positionCount);
    });
  });

  // ── Interaction Execution ───────────────────────────────────────────
  describe("Interaction execution", () => {
    it("executes a sequence and returns trace", () => {
      const tree = fppTrustEvolutionTree(dummySpec);
      const { finalTree, trace } = executeInteraction(tree, [
        { position: 0, direction: DIRECTIONS.VERIFIED },
        { position: 0, direction: DIRECTIONS.VERIFIED },
      ], dummyInput);
      expect(trace).toHaveLength(2);
      expect(finalTree.root.positionCount).toBeGreaterThan(tree.root.positionCount);
    });
  });

  // ── Truncation / Snapshot ───────────────────────────────────────────
  describe("Truncation", () => {
    it("depth-0 truncation has no children", () => {
      const tree = constantTree("p", dummySpec);
      const snap = truncate(tree, 0);
      expect(snap.children).toHaveLength(0);
    });

    it("depth-2 truncation shows tree structure", () => {
      const tree = fppTrustEvolutionTree(dummySpec);
      const snap = truncate(tree, 2);
      expect(snap.label).toBe("fpp-trust-L0");
      expect(snap.children.length).toBeGreaterThan(0);
    });
  });

  // ── SPECS Registration ──────────────────────────────────────────────
  describe("SPECS registration", () => {
    it("all 3 polytree projections are registered", () => {
      expect(SPECS.has("polytree-node")).toBe(true);
      expect(SPECS.has("polytree-morphism")).toBe(true);
      expect(SPECS.has("polytree-tensor")).toBe(true);
    });
  });

  // ── Coherence Gate Integration ──────────────────────────────────────
  describe("Coherence gate integration", () => {
    const report = coherenceGate();

    it("discovers polynomial-tree cluster", () => {
      const clusterNames = report.clusters.map(c => c.name);
      expect(clusterNames).toContain("polynomial-tree");
    });

    it("polytree projections have synergies", () => {
      const ptSynergies = report.synergies.filter(
        s => s.projections.some(p => p.startsWith("polytree-"))
      );
      expect(ptSynergies.length).toBeGreaterThan(0);
    });
  });
});
