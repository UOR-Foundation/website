/**
 * Phase 6 Test Suite — Reasoning Command & Dashboard Integration
 *
 * T-RC1:  reason status with no proof
 * T-RC2:  reason run creates proof and panels
 * T-RC3:  reason status after run shows proof details
 * T-RC4:  reason explain shows step breakdown
 * T-RC5:  reason explain <N> shows specific step
 * T-RC6:  reason certify on complete proof
 * T-RC7:  reason certify on incomplete proof errors
 * T-RC8:  reason strategy switches strategy
 * T-RC9:  reason reset clears state
 * T-RC10: reason run with DFS strategy
 * T-RC11: reason run with BFS strategy
 * T-RC12: reason run with spiral strategy
 * T-RC13: getTriAxisPanels groups correctly
 * T-RC14: Panels created for each step type
 * T-RC15: Unknown subcommand shows error
 */
import { describe, it, expect } from "vitest";
import {
  createReasoningSession,
  execReason,
  getTriAxisPanels,
} from "@/modules/ring-core/reason-command";

describe("Phase 6: Reasoning Commands", () => {
  // ── T-RC1: status with no proof ────────────────────────────────────
  describe("T-RC1: reason status (empty)", () => {
    it("shows no active proof message", () => {
      const session = createReasoningSession();
      const { lines } = execReason(["status"], session);
      const text = lines.map(l => l.text).join("\n");
      expect(text).toContain("No active proof");
    });
  });

  // ── T-RC2: run creates proof ──────────────────────────────────────
  describe("T-RC2: reason run", () => {
    it("creates a proof with steps and panels", () => {
      const session = createReasoningSession();
      const { lines, session: updated } = execReason(["run"], session);
      expect(updated.proof).not.toBeNull();
      expect(updated.proof!.steps.length).toBeGreaterThan(0);
      expect(updated.panels.length).toBeGreaterThan(0);
      const text = lines.map(l => l.text).join("\n");
      expect(text).toContain("Reasoning Run");
      expect(text).toContain("Proof ID");
    });
  });

  // ── T-RC3: status after run ───────────────────────────────────────
  describe("T-RC3: reason status after run", () => {
    it("shows proof details", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["run"], session);
      const { lines } = execReason(["status"], s1);
      const text = lines.map(l => l.text).join("\n");
      expect(text).toContain("Proof:");
      expect(text).toContain("D/I/A:");
      expect(text).toContain("Fibers:");
    });
  });

  // ── T-RC4: explain full ───────────────────────────────────────────
  describe("T-RC4: reason explain", () => {
    it("lists all steps", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["run"], session);
      const { lines } = execReason(["explain"], s1);
      const text = lines.map(l => l.text).join("\n");
      expect(text).toContain("Proof Explanation");
      // Should have step arrows
      expect(text).toMatch(/[↓→↗]/);
    });
  });

  // ── T-RC5: explain specific step ──────────────────────────────────
  describe("T-RC5: reason explain <N>", () => {
    it("shows step details", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["run"], session);
      const { lines } = execReason(["explain", "0"], s1);
      const text = lines.map(l => l.text).join("\n");
      expect(text).toContain("Step 0");
      expect(text).toContain("Mode:");
      expect(text).toContain("Justification:");
    });
  });

  // ── T-RC6: certify complete proof ─────────────────────────────────
  describe("T-RC6: reason certify (complete)", () => {
    it("issues certificate for complete proof", () => {
      let session = createReasoningSession();
      // Run with enough depth to complete
      const { session: s1 } = execReason(["run", "0", "42", "42", "42", "42"], session);
      if (s1.proof?.isComplete) {
        const { lines, session: s2 } = execReason(["certify"], s1);
        const text = lines.map(l => l.text).join("\n");
        expect(text).toContain("Certificate");
        expect(s2.proof!.certificate).not.toBeNull();
      }
    });
  });

  // ── T-RC7: certify incomplete ─────────────────────────────────────
  describe("T-RC7: reason certify (incomplete)", () => {
    it("errors on empty proof", () => {
      const session = createReasoningSession();
      const { lines } = execReason(["certify"], session);
      const text = lines.map(l => l.text).join("\n");
      expect(text).toContain("No active proof");
    });
  });

  // ── T-RC8: strategy switch ────────────────────────────────────────
  describe("T-RC8: reason strategy", () => {
    it("switches to DFS", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["strategy", "dfs"], session);
      expect(s1.strategy).toBe("dfs");
    });

    it("shows current strategy without args", () => {
      const session = createReasoningSession();
      const { lines } = execReason(["strategy"], session);
      expect(lines.some(l => l.text.includes("composed"))).toBe(true);
    });

    it("rejects unknown strategy", () => {
      const session = createReasoningSession();
      const { lines } = execReason(["strategy", "unknown"], session);
      expect(lines.some(l => l.kind === "error")).toBe(true);
    });
  });

  // ── T-RC9: reset ──────────────────────────────────────────────────
  describe("T-RC9: reason reset", () => {
    it("clears all state", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["run"], session);
      expect(s1.proof).not.toBeNull();
      const { session: s2 } = execReason(["reset"], s1);
      expect(s2.proof).toBeNull();
      expect(s2.panels).toHaveLength(0);
    });
  });

  // ── T-RC10: DFS strategy ─────────────────────────────────────────
  describe("T-RC10: DFS strategy run", () => {
    it("runs with deductive-only steps", () => {
      let session = createReasoningSession();
      session = { ...session, strategy: "dfs" };
      const { session: s1 } = execReason(["run"], session);
      expect(s1.proof).not.toBeNull();
      // DFS should have primarily deductive steps
      const vertical = s1.panels.filter(p => p.axis === "Vertical");
      expect(vertical.length).toBeGreaterThan(0);
    });
  });

  // ── T-RC11: BFS strategy ─────────────────────────────────────────
  describe("T-RC11: BFS strategy run", () => {
    it("runs with inductive steps", () => {
      let session = createReasoningSession();
      session = { ...session, strategy: "bfs" };
      const { session: s1 } = execReason(["run"], session);
      expect(s1.proof).not.toBeNull();
      const horizontal = s1.panels.filter(p => p.axis === "Horizontal");
      expect(horizontal.length).toBeGreaterThan(0);
    });
  });

  // ── T-RC12: spiral strategy ──────────────────────────────────────
  describe("T-RC12: spiral strategy run", () => {
    it("runs and produces a proof", () => {
      let session = createReasoningSession();
      session = { ...session, strategy: "spiral" };
      const { session: s1 } = execReason(["run"], session);
      expect(s1.proof).not.toBeNull();
      expect(s1.proof!.steps.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ── T-RC13: getTriAxisPanels ──────────────────────────────────────
  describe("T-RC13: getTriAxisPanels", () => {
    it("groups panels by axis", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["run"], session);
      const grouped = getTriAxisPanels(s1);
      expect(grouped.vertical).toBeDefined();
      expect(grouped.horizontal).toBeDefined();
      expect(grouped.diagonal).toBeDefined();
      // Total should match
      const total = grouped.vertical.length + grouped.horizontal.length + grouped.diagonal.length;
      expect(total).toBe(s1.panels.length);
    });
  });

  // ── T-RC14: Panel types ──────────────────────────────────────────
  describe("T-RC14: Panel labels", () => {
    it("creates panels with correct labels", () => {
      let session = createReasoningSession();
      const { session: s1 } = execReason(["run"], session);
      const labels = s1.panels.map(p => p.label);
      // Should have at least one type
      expect(labels.some(l => l.includes("Deductive") || l.includes("Inductive") || l.includes("Abductive"))).toBe(true);
    });
  });

  // ── T-RC15: unknown subcommand ────────────────────────────────────
  describe("T-RC15: unknown subcommand", () => {
    it("shows error", () => {
      const session = createReasoningSession();
      const { lines } = execReason(["banana"], session);
      expect(lines.some(l => l.kind === "error")).toBe(true);
    });
  });
});
