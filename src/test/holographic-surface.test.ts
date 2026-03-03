/**
 * Tests for HolographicSurface — self-verification, self-healing, self-improvement.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  HolographicSurface,
  resetHolographicSurface,
  type ProjectionReceipt,
  type SurfaceGradient,
} from "@/hologram/kernel/holographic-surface";

describe("HolographicSurface", () => {
  let surface: HolographicSurface;

  beforeEach(() => {
    resetHolographicSurface();
    surface = new HolographicSurface();
  });

  // ── Self-Verification ───────────────────────────────────────────────

  describe("self-verification (project)", () => {
    it("produces a receipt for every transit", () => {
      const receipt = surface.project(0.5, 0.6, "test:op");
      expect(receipt.id).toContain("surface:");
      expect(receipt.operation).toBe("test:op");
      expect(receipt.coherenceBefore).toBe(0.5);
      expect(receipt.coherenceAfter).toBe(0.6);
      expect(receipt.verified).toBe(true);
    });

    it("marks invalid coherence as unverified", () => {
      const receipt = surface.project(0.5, 1.5, "test:invalid");
      expect(receipt.verified).toBe(false);
    });

    it("marks NaN coherence as unverified", () => {
      const receipt = surface.project(0.5, NaN, "test:nan");
      expect(receipt.verified).toBe(false);
    });

    it("accumulates receipts", () => {
      surface.project(0.5, 0.6);
      surface.project(0.6, 0.7);
      surface.project(0.7, 0.8);
      expect(surface.getReceipts()).toHaveLength(3);
    });

    it("tracks verification rate", () => {
      surface.project(0.5, 0.6); // valid
      surface.project(0.6, 1.5); // invalid
      const grad = surface.gradient();
      expect(grad.verificationRate).toBe(0.5);
    });
  });

  // ── Self-Healing (Refocus) ──────────────────────────────────────────

  describe("self-healing (refocus)", () => {
    it("triggers refocus on steep coherence drop", () => {
      // Build up some history first
      surface.project(0.8, 0.8, "setup1");
      surface.project(0.8, 0.7, "setup2");
      surface.project(0.7, 0.6, "setup3");

      // Now a steep drop — should trigger refocus
      const receipt = surface.project(0.6, 0.1, "steep:drop");
      // Refocused means coherenceAfter is blended back toward before
      expect(receipt.refocused).toBe(true);
      expect(receipt.coherenceAfter).toBeGreaterThan(0.1);
      expect(receipt.coherenceAfter).toBeLessThanOrEqual(0.6);
    });

    it("does NOT refocus on gentle decline", () => {
      surface.project(0.8, 0.8, "s1");
      surface.project(0.8, 0.79, "s2");
      surface.project(0.79, 0.78, "s3");
      const receipt = surface.project(0.78, 0.77, "gentle:decline");
      expect(receipt.refocused).toBe(false);
    });

    it("counts refocus events", () => {
      surface.project(0.8, 0.8, "s1");
      surface.project(0.8, 0.3, "s2");
      surface.project(0.3, 0.1, "s3");
      surface.project(0.1, 0.0, "crash");
      const grad = surface.gradient();
      expect(grad.refocusCount).toBeGreaterThan(0);
    });
  });

  // ── Self-Improvement (Gradient) ─────────────────────────────────────

  describe("self-improvement (gradient)", () => {
    it("detects evolving trend on rising coherence", () => {
      for (let i = 0; i < 20; i++) {
        const h = 0.3 + i * 0.03;
        surface.project(h, h + 0.03, `rise:${i}`);
      }
      const grad = surface.gradient();
      expect(grad.trend).toBe("evolving");
      expect(grad.longTerm).toBeGreaterThan(0);
    });

    it("detects stable trend on flat coherence", () => {
      for (let i = 0; i < 20; i++) {
        surface.project(0.7, 0.7, `flat:${i}`);
      }
      const grad = surface.gradient();
      expect(grad.trend).toBe("stable");
    });

    it("detects refocusing trend on falling coherence", () => {
      // Use custom surface with lenient refocus threshold so drops aren't healed
      const lenientSurface = new HolographicSurface({ refocusThreshold: -1 });
      for (let i = 0; i < 20; i++) {
        const h = 0.9 - i * 0.03;
        lenientSurface.project(h, h - 0.03, `fall:${i}`);
      }
      const grad = lenientSurface.gradient();
      expect(grad.trend).toBe("refocusing");
      expect(grad.longTerm).toBeLessThan(0);
    });
  });

  // ── Human Feedback ──────────────────────────────────────────────────

  describe("human feedback absorption", () => {
    it("absorbs positive human signal", () => {
      surface.project(0.5, 0.5, "init");
      const receipt = surface.absorbHumanSignal(1.0, "click:save");
      expect(receipt.humanSignal).toBe(true);
      expect(receipt.coherenceAfter).toBeGreaterThan(0.5);
    });

    it("absorbs negative human signal", () => {
      surface.project(0.5, 0.5, "init");
      const receipt = surface.absorbHumanSignal(-1.0, "undo");
      expect(receipt.humanSignal).toBe(true);
      expect(receipt.coherenceAfter).toBeLessThan(0.5);
    });

    it("clamps extreme signals", () => {
      surface.project(0.5, 0.5, "init");
      const receipt = surface.absorbHumanSignal(100, "extreme");
      expect(receipt.coherenceAfter).toBeLessThanOrEqual(1.0);
    });
  });

  // ── State & History ─────────────────────────────────────────────────

  describe("state and history", () => {
    it("tracks coherence history", () => {
      surface.project(0.3, 0.4);
      surface.project(0.4, 0.5);
      surface.project(0.5, 0.6);
      const history = surface.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0]).toBe(0.4);
      expect(history[2]).toBe(0.6);
    });

    it("reports healthy state when not refocusing", () => {
      surface.project(0.5, 0.6);
      expect(surface.getState().isHealthy).toBe(true);
    });

    it("ring buffer wraps correctly", () => {
      const small = new HolographicSurface({ historyDepth: 4, refocusThreshold: -1 });
      for (let i = 0; i < 10; i++) {
        small.project(0.5, 0.5 + i * 0.01);
      }
      const history = small.getHistory();
      expect(history).toHaveLength(4);
    });

    it("subscription fires on transit", () => {
      let called = false;
      surface.onStateChange(() => { called = true; });
      surface.project(0.5, 0.6);
      expect(called).toBe(true);
    });

    it("unsubscribe stops notifications", () => {
      let count = 0;
      const unsub = surface.onStateChange(() => { count++; });
      surface.project(0.5, 0.6);
      unsub();
      surface.project(0.6, 0.7);
      expect(count).toBe(1);
    });
  });
});
