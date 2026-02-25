/**
 * Phase 6 Test Suite — Hologram OS Integration
 *
 * T6.1: ComputationTrace → Process
 * T6.2: Context/Binding/Frame → Directory/File/FileSystem
 * T6.3: FiberBudget → ProgressTracker
 * T6.4: MetricAxis panels receive correct observable subtypes
 * T6.5: Constraint composition → Attestation
 * T6.6: Resolution tracker shows fiber pinning state
 * T6.7: Full round-trip: create type → resolve → certify → display
 */
import { describe, it, expect } from "vitest";
import {
  createProcess,
  createDirectory,
  createFileSystem,
  createPanel,
  groupByAxis,
  createTracker,
  createAttestation,
  createHologramState,
} from "@/modules/hologram-os/runtime";
import { createFiberBudget, pinFiber } from "@/modules/ring-core/fiber-budget";
import { resolve } from "@/modules/ring-core/resolver";
import { residueConstraint, depthConstraint } from "@/modules/ring-core/constraint";
import { involutionCertificate } from "@/modules/ring-core/certificate";
import { Q0 } from "@/modules/ring-core/ring";
import {
  stratum, ringMetric, hammingMetric, curvature, catastropheThreshold,
} from "@/modules/ring-core/observable-factory";

describe("Phase 6: Hologram OS Integration", () => {
  // ── T6.1: Process ───────────────────────────────────────────────────────
  describe("T6.1: ComputationTrace → Process", () => {
    it("creates a process from trace steps", () => {
      const proc = createProcess("trace:001", 0, [
        { index: 0, operation: "neg", input: 42, output: 214, certified: true },
        { index: 1, operation: "bnot", input: 214, output: 41, certified: true },
      ]);
      expect(proc.pid).toBe("trace:001");
      expect(proc.steps).toHaveLength(2);
      expect(proc.status).toBe("completed");
      expect(proc.allCertified).toBe(true);
    });

    it("empty steps → running status", () => {
      const proc = createProcess("trace:002", 0, []);
      expect(proc.status).toBe("running");
    });

    it("uncertified step → allCertified false", () => {
      const proc = createProcess("trace:003", 0, [
        { index: 0, operation: "add", input: 100, output: 200, certified: false },
      ]);
      expect(proc.allCertified).toBe(false);
    });
  });

  // ── T6.2: FileSystem ────────────────────────────────────────────────────
  describe("T6.2: Context/Binding → Directory/File", () => {
    it("creates directories with files", () => {
      const dir = createDirectory("ctx:root", 0, 256, [
        { name: "x", address: "urn:uor:datum:q0:42", bindingType: "value" },
        { name: "f", address: "urn:uor:op:neg", bindingType: "function" },
      ]);
      expect(dir.files).toHaveLength(2);
      expect(dir.capacity).toBe(256);
    });

    it("filesystem aggregates directories", () => {
      const fs = createFileSystem([
        createDirectory("ctx:a", 0, 256, [{ name: "x", address: "a", bindingType: "value" }]),
        createDirectory("ctx:b", 1, 65536, []),
      ]);
      expect(fs.directories).toHaveLength(2);
      expect(fs.totalFiles).toBe(1);
      expect(fs.totalCapacity).toBe(256 + 65536);
    });
  });

  // ── T6.3: ProgressTracker ──────────────────────────────────────────────
  describe("T6.3: FiberBudget → ProgressTracker", () => {
    it("tracks resolution progress", () => {
      let b = createFiberBudget(0);
      expect(createTracker(b).ratio).toBe(0);

      b = pinFiber(b, 0, "c1");
      b = pinFiber(b, 1, "c2");
      const t = createTracker(b);
      expect(t.resolved).toBe(2);
      expect(t.ratio).toBe(0.25);
      expect(t.closed).toBe(false);
    });

    it("closed when fully resolved", () => {
      let b = createFiberBudget(0);
      for (let i = 0; i < 8; i++) b = pinFiber(b, i, `c${i}`);
      expect(createTracker(b).closed).toBe(true);
    });
  });

  // ── T6.4: Dashboard panels by MetricAxis ───────────────────────────────
  describe("T6.4: MetricAxis panels", () => {
    it("groups panels by axis", () => {
      const panels = [
        createPanel("StratumObservable", "Vertical", 42),
        createPanel("RingMetric", "Vertical", 10),
        createPanel("HammingMetric", "Horizontal", 5),
        createPanel("CurvatureObservable", "Diagonal", 0),
        createPanel("CatastropheThreshold", "Diagonal", 0.015625),
      ];
      const grouped = groupByAxis(panels);
      expect(grouped.Vertical).toHaveLength(2);
      expect(grouped.Horizontal).toHaveLength(1);
      expect(grouped.Diagonal).toHaveLength(2);
    });

    it("panel IDs are unique", () => {
      const p1 = createPanel("Stratum", "Vertical", 1, 0);
      const p2 = createPanel("Stratum", "Vertical", 1, 1);
      expect(p1.id).not.toBe(p2.id);
    });
  });

  // ── T6.5: Attestation ──────────────────────────────────────────────────
  describe("T6.5: Certificate → Attestation", () => {
    it("creates transform attestation", () => {
      const a = createAttestation("cert:1", "morphism:embed", true, "transform");
      expect(a.valid).toBe(true);
      expect(a.kind).toBe("transform");
    });

    it("creates involution attestation from certificate", () => {
      const ring = Q0();
      const cert = involutionCertificate(ring, "Neg", ring.neg.bind(ring));
      const a = createAttestation(cert.certificateId(), cert.certifiesIri(), cert.valid(), "involution");
      expect(a.valid).toBe(true);
      expect(a.kind).toBe("involution");
    });
  });

  // ── T6.6: Resolution tracker ───────────────────────────────────────────
  describe("T6.6: Resolution tracker state", () => {
    it("resolver snapshots map to tracker progression", () => {
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 4 },
        { ...depthConstraint(1, 3), pinsPerStep: 4 },
      ];
      const snapshots = resolve(0, steps);
      const trackers = snapshots.map((s) => createTracker(s.budget));

      expect(trackers[0].ratio).toBe(0);
      expect(trackers[1].ratio).toBe(0.5);
      expect(trackers[2].ratio).toBe(1);
      expect(trackers[2].closed).toBe(true);
    });
  });

  // ── T6.7: Full round-trip ──────────────────────────────────────────────
  describe("T6.7: Full round-trip", () => {
    it("create → resolve → certify → display", () => {
      const ring = Q0();

      // 1. Create a process
      const proc = createProcess("trace:rt", 0, [
        { index: 0, operation: "neg", input: 42, output: 214, certified: true },
      ]);

      // 2. Resolve via constraints
      const steps = [
        { ...residueConstraint(2, 0), pinsPerStep: 4 },
        { ...depthConstraint(1, 3), pinsPerStep: 4 },
      ];
      const snapshots = resolve(0, steps);
      const finalBudget = snapshots[snapshots.length - 1].budget;

      // 3. Certify
      const cert = involutionCertificate(ring, "Neg", ring.neg.bind(ring));
      const attestation = createAttestation(
        cert.certificateId(), cert.certifiesIri(), cert.valid(), "involution",
      );

      // 4. Assemble Hologram state
      const state = createHologramState({
        processes: [proc],
        directories: [
          createDirectory("ctx:root", 0, 256, [
            { name: "x", address: "urn:uor:datum:q0:42", bindingType: "value" },
          ]),
        ],
        panels: [
          createPanel("StratumObservable", "Vertical", 42),
          createPanel("HammingMetric", "Horizontal", 5),
          createPanel("CurvatureObservable", "Diagonal", 0),
        ],
        budget: finalBudget,
        attestations: [attestation],
      });

      // Verify complete state
      expect(state.processes).toHaveLength(1);
      expect(state.processes[0].allCertified).toBe(true);
      expect(state.fileSystem.totalFiles).toBe(1);
      expect(state.dashboard.Vertical).toHaveLength(1);
      expect(state.dashboard.Horizontal).toHaveLength(1);
      expect(state.dashboard.Diagonal).toHaveLength(1);
      expect(state.tracker.closed).toBe(true);
      expect(state.attestations[0].valid).toBe(true);
    });
  });
});
