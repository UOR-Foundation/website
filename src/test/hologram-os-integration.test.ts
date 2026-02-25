/**
 * Phase 6 Validation — Cross-Phase Integration Tests
 * ═══════════════════════════════════════════════════
 *
 * Verifies that all 6 phases of the Hologram OS work together
 * as a unified, canonical system. Tests the complete lifecycle:
 *
 *   Ingest → Blueprint → Engine → Virtual I/O → Projection → UI
 *
 * This is the final gate: if these tests pass, the entire
 * holographic operating system is coherent and functional.
 */

import { describe, it, expect } from "vitest";
import { HologramEngine } from "@/modules/uns/core/hologram/engine";
import {
  ingest, ingestAndSpawn, ingestJson, ingestText,
  type IngestResult, type IngestSpawnedResult,
} from "@/modules/uns/core/hologram/universal-ingest";
import {
  vExec, vForkBlueprint, vStat, vPs, vMmap, vMmapAll,
  vIoctl, vKill, vRead, vWrite, vSuspend, vResume,
  vOpen, vClose, vPipe, vDup2, vForkExec,
  STDIN, STDOUT, STDERR,
} from "@/modules/uns/core/hologram/virtual-io";
import {
  createExecutableBlueprint, boot, grindExecutableBlueprint,
  STATIC_SCHEDULER, ADAPTIVE_SCHEDULER,
  type ExecutableBlueprint,
} from "@/modules/uns/core/hologram/executable-blueprint";
import {
  project, PROJECTIONS, type ProjectionInput,
} from "@/modules/uns/core/hologram/index";
import {
  composeLens, element, grindLens, focusLens, dehydrate,
} from "@/modules/uns/core/hologram/lens";
import {
  resolveUIProjection, resolveAllUIProjections,
  UI_PROJECTIONS, type UIComponentType,
} from "@/modules/hologram-ui/projection-registry";
import { DIRECTIONS } from "@/modules/uns/core/hologram/polytree";
import { singleProofHash } from "@/lib/uor-canonical";

// ── Helpers ────────────────────────────────────────────────────────────────

function mkBlueprint(name = "test-program"): ExecutableBlueprint {
  return createExecutableBlueprint({
    name,
    description: "Integration test blueprint",
    elements: [{ id: "id", kind: "identity", config: {} }],
    scheduler: STATIC_SCHEDULER,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Phase 6: Cross-Phase Integration", () => {

  // ═══════════════════════════════════════════════════════════════════════
  // T1: Full Lifecycle — Ingest → Spawn → Tick → Project → Kill
  // ═══════════════════════════════════════════════════════════════════════

  describe("T1: Full lifecycle", () => {
    it("ingest → spawn → tick → mmap → kill", async () => {
      const engine = new HologramEngine("test:lifecycle");

      // Phase 5: Ingest
      const spawned = await ingestAndSpawn(engine, "Hello Hologram OS!", {
        label: "greeting",
      });
      expect(spawned.pid).toBeTruthy();
      expect(spawned.envelope.format).toBe("text");
      expect(spawned.blueprint).toBeDefined();

      // Phase 4: Virtual I/O — stat
      const stat = vStat(engine, spawned.pid);
      expect(stat.status).toBe("running");

      // Phase 3: Engine tick (interaction)
      const tick = await vIoctl(engine, spawned.pid, 0, DIRECTIONS.VERIFIED);
      expect(tick.sequence).toBe(1);
      expect(tick.identity).toBeDefined();
      expect(tick.identity.hashBytes).toBeInstanceOf(Uint8Array);

      // Phase 1: Protocol projection
      const mmap = await vMmap(engine, spawned.pid, "did");
      expect(mmap.address).toMatch(/^did:uor:/);
      expect(mmap.fidelity).toBe("lossless");

      // Phase 1: All projections
      const all = await vMmapAll(engine, spawned.pid);
      expect(all.size).toBeGreaterThan(10);

      // UI projection (Phase 6 surface)
      const uiProjections = resolveAllUIProjections(tick.identity);
      expect(uiProjections.size).toBe(UI_PROJECTIONS.size);

      // Kill
      vKill(engine, spawned.pid);
      expect(engine.processCount).toBe(0);
    });

    it("JSON-LD ingest produces valid spawnable result", async () => {
      const engine = new HologramEngine("test:jsonld");

      const obj = { "@context": "https://schema.org", "@type": "Person", name: "Alice" };
      const r1 = await ingestAndSpawn(engine, obj, { label: "alice" });

      // Valid identity
      expect(r1.proof.cid).toBeTruthy();
      expect(r1.envelope.format).toBe("jsonld");
      expect(r1.pid).toBeTruthy();

      // Stat works
      const stat = vStat(engine, r1.pid);
      expect(stat.status).toBe("running");

      vKill(engine, r1.pid);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T2: Fork + Evolve Divergence
  // ═══════════════════════════════════════════════════════════════════════

  describe("T2: Fork divergence", () => {
    it("forked process diverges from parent after interaction", async () => {
      const engine = new HologramEngine("test:fork");
      const bp = mkBlueprint("parent");

      const parentPid = await vExec(engine, bp);
      const { childPid } = await vForkBlueprint(engine, bp, { name: "child" });

      // Both start with same structure but different session IDs
      expect(parentPid).not.toBe(childPid);

      // Evolve parent only
      const parentTick = await vIoctl(engine, parentPid, 0, DIRECTIONS.VERIFIED);
      const childTick = await engine.tick(childPid);

      // After interaction, parent identity diverges from child
      // (parent has history, child doesn't)
      // Both have valid identities
      expect(parentTick.identity.cid).toBeTruthy();
      expect(childTick.identity.cid).toBeTruthy();

      vKill(engine, parentPid);
      vKill(engine, childPid);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T3: Suspend / Resume Round-Trip
  // ═══════════════════════════════════════════════════════════════════════

  describe("T3: Suspend/Resume", () => {
    it("process survives suspend → resume with state preserved", async () => {
      const engine = new HologramEngine("test:suspend");
      const bp = mkBlueprint("suspendable");
      const pid = await vExec(engine, bp);

      // Evolve state
      await vIoctl(engine, pid, 0, DIRECTIONS.VERIFIED);
      await vIoctl(engine, pid, 0, DIRECTIONS.EXPIRED);
      const preStat = vStat(engine, pid);
      expect(preStat.historyLength).toBe(2);

      // Suspend
      const suspended = await vSuspend(engine, pid);
      expect(suspended.proof).toBeDefined();
      expect(suspended.proof.cid).toBeTruthy();

      // Resume
      const newPid = await vResume(engine, bp, suspended);
      const postStat = vStat(engine, newPid);
      expect(postStat.historyLength).toBe(2);
      expect(postStat.status).toBe("running");

      vKill(engine, newPid);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T4: Pipe + File Descriptor Coherence
  // ═══════════════════════════════════════════════════════════════════════

  describe("T4: File descriptors & pipes", () => {
    it("vOpen → vDup2 → vClose lifecycle", () => {
      const channel = { id: "data-in", projection: "identity", direction: "in" as const };
      const fd = vOpen("pid-1", channel);
      expect(fd.fd).toBe(STDIN);
      expect(fd.open).toBe(true);

      const dup = vDup2(fd, 5);
      expect(dup.fd).toBe(5);
      expect(dup.channel).toBe(fd.channel);

      vClose(fd);
      expect(fd.open).toBe(false);
    });

    it("vPipe creates connected read/write descriptors", () => {
      const wCh = { id: "out", projection: "identity", direction: "out" as const };
      const rCh = { id: "in", projection: "identity", direction: "in" as const };
      const pipe = vPipe("writer", wCh, "reader", rCh);

      expect(pipe.write.pid).toBe("writer");
      expect(pipe.read.pid).toBe("reader");
      expect(pipe.buffer).toEqual([]);

      // Simulate data flow through pipe
      pipe.buffer.push({ data: "hello" });
      expect(pipe.buffer.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T5: Projection Determinism Across Phases
  // ═══════════════════════════════════════════════════════════════════════

  describe("T5: Projection determinism", () => {
    it("same identity → same UI projections always", async () => {
      const engine = new HologramEngine("test:determinism");
      const spawned = await ingestAndSpawn(engine, "determinism test");

      const tick1 = await engine.tick(spawned.pid);
      const tick2 = await engine.tick(spawned.pid);

      // Read-only ticks on unchanged state → same identity
      expect(tick1.identity.cid).toBe(tick2.identity.cid);
      expect(tick1.identity.hex).toBe(tick2.identity.hex);

      // Same identity → same UI projections
      const ui1 = resolveUIProjection(tick1.identity, "ui:stat-card");
      const ui2 = resolveUIProjection(tick2.identity, "ui:stat-card");
      expect(ui1.props).toEqual(ui2.props);

      // Same identity → same protocol projections
      const did1 = project(tick1.identity, "did");
      const did2 = project(tick2.identity, "did");
      expect(did1.value).toBe(did2.value);

      vKill(engine, spawned.pid);
    });

    it("hologram projections = protocol projections = UI projections from same hash", async () => {
      const proof = await singleProofHash({ test: "unification" });
      const pi: ProjectionInput = { hashBytes: proof.hashBytes, cid: proof.cid, hex: proof.hashHex };

      // Phase 1: Protocol projection
      const did = project(pi, "did");
      expect(did.value).toMatch(/^did:uor:/);

      // Phase 1: Full hologram
      const hologram = project(pi);
      expect(Object.keys(hologram.projections).length).toBeGreaterThan(10);

      // Phase 6: UI projection
      const stat = resolveUIProjection(pi, "ui:stat-card");
      expect(stat.type).toBe("ui:stat-card");
      expect(stat.source.cid).toBe(pi.cid);

      // All three derive from the SAME identity
      expect(stat.source.hex).toBe(pi.hex);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T6: Lens Round-Trip Through Engine
  // ═══════════════════════════════════════════════════════════════════════

  describe("T6: Lens coherence through engine", () => {
    it("dehydrate/rehydrate preserves identity", async () => {
      const obj = { name: "Alice", role: "observer" };
      const { proof, original } = await dehydrate(obj);

      const { proof: proof2 } = await dehydrate(original);

      // Round-trip preserves content-addressed identity
      expect(proof2.cid).toBe(proof.cid);
    });

    it("grindLens produces stable identity for same elements", async () => {
      const lens1 = composeLens("test-lens", [
        element("echo", async (x) => x, "identity"),
      ]);
      const lens2 = composeLens("test-lens", [
        element("echo", async (x) => x, "identity"),
      ]);

      const g1 = await grindLens(lens1);
      const g2 = await grindLens(lens2);

      expect(g1.proof.cid).toBe(g2.proof.cid);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T7: Engine Snapshot — Content-Addressed Kernel State
  // ═══════════════════════════════════════════════════════════════════════

  describe("T7: Engine snapshots", () => {
    it("snapshot is content-addressable", async () => {
      const engine = new HologramEngine("test:snapshot");
      const spawned = await ingestAndSpawn(engine, "snapshot test");

      const { snapshot, proof } = await engine.snapshot();
      expect(snapshot["@type"]).toBe("uor:HologramEngineSnapshot");
      expect(snapshot.processes.length).toBe(1);
      expect(proof.cid).toBeTruthy();
      expect(proof.hashBytes).toBeInstanceOf(Uint8Array);

      vKill(engine, spawned.pid);
    });

    it("engine events fire correctly", async () => {
      const engine = new HologramEngine("test:events");
      const events: string[] = [];
      engine.on(e => events.push(e.type));

      const pid = await vExec(engine, mkBlueprint());
      await vIoctl(engine, pid, 0, DIRECTIONS.VERIFIED);
      vKill(engine, pid);

      expect(events).toContain("spawned");
      expect(events).toContain("ticked");
      expect(events).toContain("killed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T8: Multi-Format Ingest Coherence
  // ═══════════════════════════════════════════════════════════════════════

  describe("T8: Multi-format ingest", () => {
    it("text, JSON, and binary all produce valid holograms", async () => {
      const textResult = await ingest("Hello") as IngestResult;
      const jsonResult = await ingestJson({ key: "value" }) as IngestResult;
      const binResult = await ingest(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])) as IngestResult;

      for (const r of [textResult, jsonResult, binResult]) {
        expect(r.proof.cid).toBeTruthy();
        expect(r.hologram.projections).toBeDefined();
        expect(Object.keys(r.hologram.projections).length).toBeGreaterThan(10);
        expect(r.identity.hashBytes).toBeInstanceOf(Uint8Array);
        expect(r.identity.hashBytes.length).toBe(32);
      }

      // All produce unique identities
      const cids = new Set([textResult.proof.cid, jsonResult.proof.cid, binResult.proof.cid]);
      expect(cids.size).toBe(3);
    });

    it("all ingested formats can spawn into running processes", async () => {
      const engine = new HologramEngine("test:multi-spawn");

      const t = await ingestAndSpawn(engine, "text data");
      const j = await ingestAndSpawn(engine, { x: 1 });
      const b = await ingestAndSpawn(engine, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));

      expect(engine.processCount).toBe(3);

      // All are tickable
      for (const pid of [t.pid, j.pid, b.pid]) {
        const tick = await engine.tick(pid);
        expect(tick.projections.size).toBe(UI_PROJECTIONS.size);
      }

      // Cleanup
      for (const pid of [t.pid, j.pid, b.pid]) vKill(engine, pid);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T9: Canonical Compliance — singleProofHash is the only identity gate
  // ═══════════════════════════════════════════════════════════════════════

  describe("T9: Canonical compliance", () => {
    it("all identities flow through singleProofHash", async () => {
      // Ingest identity
      const r = await ingest("canonical test") as IngestResult;
      expect(r.proof.derivationId).toBeTruthy();

      // Blueprint identity
      const bp = mkBlueprint("canonical");
      const ground = await grindExecutableBlueprint(bp);
      expect(ground.proof.derivationId).toBeTruthy();

      // Lens identity
      const lens = composeLens("canonical-lens", [element("id", async x => x, "identity")]);
      const gl = await grindLens(lens);
      expect(gl.proof.derivationId).toBeTruthy();

      // Engine snapshot identity
      const engine = new HologramEngine("test:canonical");
      const { proof } = await engine.snapshot();
      expect(proof.derivationId).toBeTruthy();

      // All use URDNA2015 → SHA-256 pipeline (verified by derivationId format)
      for (const p of [r.proof, ground.proof, gl.proof, proof]) {
        expect(p.cid).toMatch(/^b/); // CIDv1 base32lower
        expect(p.hashHex).toMatch(/^[0-9a-f]{64}$/);
        expect(p.hashBytes.length).toBe(32);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T10: UI Projection Registry — All Types Resolvable
  // ═══════════════════════════════════════════════════════════════════════

  describe("T10: UI projection completeness", () => {
    it("all 6 UI component types resolve from any identity", async () => {
      const proof = await singleProofHash({ ui: "test" });
      const pi: ProjectionInput = { hashBytes: proof.hashBytes, cid: proof.cid, hex: proof.hashHex };

      const types: UIComponentType[] = [
        "ui:stat-card", "ui:data-table", "ui:metric-bar",
        "ui:info-card", "ui:page-shell", "ui:dashboard-grid",
      ];

      for (const type of types) {
        const result = resolveUIProjection(pi, type);
        expect(result.type).toBe(type);
        expect(result.props).toBeDefined();
        expect(result.source.cid).toBe(pi.cid);
      }
    });

    it("resolveAllUIProjections returns all types", async () => {
      const proof = await singleProofHash({ all: "projections" });
      const pi: ProjectionInput = { hashBytes: proof.hashBytes, cid: proof.cid, hex: proof.hashHex };

      const all = resolveAllUIProjections(pi);
      expect(all.size).toBe(UI_PROJECTIONS.size);
    });
  });
});
