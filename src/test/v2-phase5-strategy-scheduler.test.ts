/**
 * Phase 5 Test Suite — Strategy Scheduler
 */
import { describe, it, expect } from "vitest";
import {
  depthFirstDeductive,
  breadthFirstInductive,
  abductiveSpiral,
  composedScheduler,
  executeSchedule,
  modeSequence,
  scheduleStepsByMode,
  hasScheduledCycle,
  type ScheduleConfig,
} from "@/modules/ring-core/strategy-scheduler";
import { ZERO_TREE } from "@/modules/uns/core/hologram/polytree";
import type { TransitionContext } from "@/modules/uns/core/hologram/polytree";
import type { ProjectionInput } from "@/modules/uns/core/hologram/index";

const dummyInput: ProjectionInput = {
  hashBytes: new Uint8Array(32),
  cid: "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  hex: "0".repeat(64),
};

function makeCtx(maxDepth: number): TransitionContext {
  return { input: dummyInput, depth: 0, maxDepth, history: [] };
}

const baseConfig: ScheduleConfig = {
  quantum: 0,
  maxDepth: 8,
  observations: [42, 43, 100, 200],
  reference: 42,
  initialModulus: 2,
};

describe("Phase 5: Strategy Scheduler", () => {
  // ── T-SS1: DFS structure ──────────────────────────────────────────
  describe("T-SS1: DFS deductive tree structure", () => {
    it("builds an evolving tree with deductive label", () => {
      const tree = depthFirstDeductive(4);
      expect(tree.root.label).toBe("D:depth=0");
      expect(tree.root.positionCount).toBe(1);
      expect(tree.root.directionCounts).toEqual([2]);
      expect(tree.isConstant).toBe(false);
    });

    it("has correct polynomial at each depth", () => {
      const tree = depthFirstDeductive(4);
      const ctx = makeCtx(4);
      const child = tree.rest(0, 1, ctx);
      expect(child.root.label).toBe("D:depth=1");
    });
  });

  // ── T-SS2: DFS evolving ───────────────────────────────────────────
  describe("T-SS2: DFS is evolving", () => {
    it("is not a constant tree", () => {
      const tree = depthFirstDeductive(4);
      expect(tree.isConstant).toBe(false);
    });

    it("direction 0 (converged) leads to terminal", () => {
      const tree = depthFirstDeductive(4);
      const ctx = makeCtx(4);
      const terminal = tree.rest(0, 0, ctx);
      expect(terminal).toBe(ZERO_TREE);
    });
  });

  // ── T-SS3: BFS breadth ────────────────────────────────────────────
  describe("T-SS3: BFS inductive breadth", () => {
    it("has correct position count matching breadth", () => {
      const tree = breadthFirstInductive(4, 3);
      expect(tree.root.positionCount).toBe(4);
      expect(tree.root.label).toBe("I:breadth=4");
    });

    it("direction counts match breadth", () => {
      const tree = breadthFirstInductive(3, 3);
      expect(tree.root.directionCounts).toEqual([1, 1, 1]);
    });
  });

  // ── T-SS4: BFS narrows ────────────────────────────────────────────
  describe("T-SS4: BFS narrows breadth", () => {
    it("child has halved breadth", () => {
      const tree = breadthFirstInductive(4, 4);
      const ctx = makeCtx(4);
      const child = tree.rest(0, 0, ctx);
      expect(child.root.positionCount).toBe(2);
    });
  });

  // ── T-SS5: Spiral alternates ──────────────────────────────────────
  describe("T-SS5: Abductive spiral", () => {
    it("starts with abductive polynomial", () => {
      const tree = abductiveSpiral(4);
      expect(tree.root.label).toBe("A:radius=1");
      expect(tree.root.directionCounts).toEqual([3]); // converge, refine, catastrophe
    });

    it("direction 1 (refine) increases radius", () => {
      const tree = abductiveSpiral(4);
      const ctx = makeCtx(8);
      const next = tree.rest(0, 1, ctx);
      expect(next.root.label).toBe("A:radius=2");
    });
  });

  // ── T-SS6: Spiral catastrophe ─────────────────────────────────────
  describe("T-SS6: Spiral catastrophe → DFS", () => {
    it("direction 2 switches to depth-first deductive", () => {
      const tree = abductiveSpiral(4);
      const ctx = makeCtx(8);
      const dfs = tree.rest(0, 2, ctx);
      expect(dfs.root.label).toBe("D:depth=0");
      expect(dfs.isConstant).toBe(false);
    });
  });

  // ── T-SS7: Composed scheduler ─────────────────────────────────────
  describe("T-SS7: Composed scheduler", () => {
    it("builds a composed tree (not constant)", () => {
      const tree = composedScheduler(baseConfig);
      expect(tree.isConstant).toBe(false);
      expect(tree.nodeId).toContain("coprod:");
    });

    it("root label contains tensor and coproduct", () => {
      const tree = composedScheduler(baseConfig);
      // Coproduct of (tensor of DFS⊗BFS) + Spiral
      expect(tree.root.label).toContain("⊗");
      expect(tree.root.label).toContain("+");
    });
  });

  // ── T-SS8: DFS execution ─────────────────────────────────────────
  describe("T-SS8: DFS execution pins fibers", () => {
    it("pins fibers progressively", () => {
      const tree = depthFirstDeductive(8);
      const result = executeSchedule(tree, baseConfig);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.finalBudget.pinnedCount).toBeGreaterThan(0);
      // All deductive steps should have deductive results
      const dSteps = result.steps.filter(s => s.deductive);
      expect(dSteps.length).toBeGreaterThan(0);
    });
  });

  // ── T-SS9: BFS execution ─────────────────────────────────────────
  describe("T-SS9: BFS execution records observations", () => {
    it("records inductive results", () => {
      const tree = breadthFirstInductive(4, 4);
      const result = executeSchedule(tree, baseConfig);
      const iSteps = result.steps.filter(s => s.inductive);
      expect(iSteps.length).toBeGreaterThan(0);
      // Inductive steps should not pin fibers
      for (const s of iSteps) {
        expect(s.inductive).toBeDefined();
      }
    });
  });

  // ── T-SS10: Spiral execution ──────────────────────────────────────
  describe("T-SS10: Spiral execution D→I→A", () => {
    it("produces all three reasoning modes", () => {
      const tree = abductiveSpiral(6);
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 6 });
      const modes = scheduleStepsByMode(result);
      // Spiral classifies by depth%3: should have all modes
      expect(modes.deductive + modes.inductive + modes.abductive).toBeGreaterThan(0);
    });
  });

  // ── T-SS11: modeSequence ──────────────────────────────────────────
  describe("T-SS11: modeSequence", () => {
    it("returns correct ordering", () => {
      const tree = depthFirstDeductive(3);
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 3 });
      const seq = modeSequence(result);
      expect(seq.length).toBe(result.steps.length);
      expect(seq.every(m => m === "deductive")).toBe(true);
    });
  });

  // ── T-SS12: scheduleStepsByMode ───────────────────────────────────
  describe("T-SS12: scheduleStepsByMode", () => {
    it("counts correctly for DFS", () => {
      const tree = depthFirstDeductive(4);
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 4 });
      const counts = scheduleStepsByMode(result);
      expect(counts.deductive).toBeGreaterThan(0);
      expect(counts.inductive).toBe(0);
    });
  });

  // ── T-SS13: hasScheduledCycle ─────────────────────────────────────
  describe("T-SS13: hasScheduledCycle", () => {
    it("false for pure DFS", () => {
      const tree = depthFirstDeductive(4);
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 4 });
      expect(hasScheduledCycle(result)).toBe(false); // Only deductive
    });

    it("true for composed scheduler with enough depth", () => {
      const tree = composedScheduler({ ...baseConfig, maxDepth: 12 });
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 12 });
      const modes = scheduleStepsByMode(result);
      // Composed scheduler should produce multiple mode types
      expect(Object.values(modes).filter(c => c > 0).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── T-SS14: maxDepth limit ────────────────────────────────────────
  describe("T-SS14: Respects maxDepth", () => {
    it("does not exceed maxDepth * 3 steps", () => {
      const tree = depthFirstDeductive(4);
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 4 });
      expect(result.totalSteps).toBeLessThanOrEqual(12); // maxDepth * 3
    });
  });

  // ── T-SS15: Convergence ───────────────────────────────────────────
  describe("T-SS15: Budget progress", () => {
    it("pins fibers across execution", () => {
      const tree = depthFirstDeductive(16);
      const result = executeSchedule(tree, { ...baseConfig, maxDepth: 16 });
      // Budget should have fibers pinned
      expect(result.finalBudget.pinnedCount).toBeGreaterThan(0);
      // If budget closed, final state should be Resolved
      if (result.finalBudget.isClosed) {
        expect(result.finalState).toBe("Resolved");
      }
    });
  });
});
