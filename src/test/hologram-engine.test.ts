/**
 * Hologram Engine — Validation Test Suite
 * ════════════════════════════════════════
 *
 * Validates Phase 3: The Hologram OS Kernel.
 *
 * T0: Process Lifecycle — spawn → tick → kill
 * T1: Kernel Loop — tick applies interaction + produces UI projections
 * T2: Multi-Process — engine manages multiple concurrent processes
 * T3: Suspend/Resume — full state preservation through engine
 * T4: Event System — listeners receive correct lifecycle events
 * T5: Engine Snapshot — content-addressable kernel state
 * T6: Phase 1+2+3 Integration — blueprints with UI elements tick correctly
 * T7: Determinism — same blueprint + same ticks = same projections
 *
 * @module test/hologram-engine
 */

import { describe, it, expect } from "vitest";
import { HologramEngine } from "@/modules/uns/core/hologram/engine";
import type { EngineEvent } from "@/modules/uns/core/hologram/engine";
import {
  createExecutableBlueprint,
  ADAPTIVE_SCHEDULER,
  STATIC_SCHEDULER,
} from "@/modules/uns/core/hologram/executable-blueprint";
import { DIRECTIONS } from "@/modules/uns/core/hologram/polytree";
import type { ElementSpec } from "@/modules/uns/core/hologram/lens-blueprint";

// ── Fixtures ──────────────────────────────────────────────────────────────

const SIMPLE_ELEMENTS: ElementSpec[] = [
  { id: "entry", kind: "identity" },
];

const UI_ELEMENTS: ElementSpec[] = [
  { id: "entry", kind: "identity" },
  { id: "display", kind: "ui:stat-card", config: { label: "Trust Score" } },
];

function simpleBlueprint(name = "test-app") {
  return createExecutableBlueprint({
    name,
    elements: SIMPLE_ELEMENTS,
    scheduler: ADAPTIVE_SCHEDULER,
  });
}

function uiBlueprint(name = "visual-app") {
  return createExecutableBlueprint({
    name,
    elements: UI_ELEMENTS,
    scheduler: ADAPTIVE_SCHEDULER,
  });
}

// ── T0: Process Lifecycle ──────────────────────────────────────────────────

describe("T0: Process Lifecycle (spawn → tick → kill)", () => {
  it("spawn creates a process and returns a pid", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    expect(pid).toBeTruthy();
    expect(engine.processCount).toBe(1);
    expect(engine.listProcesses()).toContain(pid);

    engine.kill(pid);
  });

  it("kill removes the process from the table", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    engine.kill(pid);

    expect(engine.processCount).toBe(0);
    expect(() => engine.getProcessInfo(pid)).toThrow();
  });

  it("getProcessInfo returns correct metadata", async () => {
    const engine = new HologramEngine();
    const bp = simpleBlueprint("info-test");
    const pid = await engine.spawn(bp);

    const info = engine.getProcessInfo(pid);

    expect(info.pid).toBe(pid);
    expect(info.status).toBe("running");
    expect(info.tickCount).toBe(0);
    expect(info.blueprintCid).toBeTruthy();

    engine.kill(pid);
  });

  it("throws on invalid pid", () => {
    const engine = new HologramEngine();
    expect(() => engine.getProcessInfo("nonexistent")).toThrow("No process");
  });
});

// ── T1: Kernel Loop ────────────────────────────────────────────────────────

describe("T1: Kernel Loop (tick = interact + project)", () => {
  it("tick without interaction produces read-only projections", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const tick = await engine.tick(pid);

    expect(tick.pid).toBe(pid);
    expect(tick.interaction).toBeNull();
    expect(tick.projections.size).toBe(6); // All 6 UI types
    expect(tick.halted).toBe(false);
    expect(tick.sequence).toBe(1);

    engine.kill(pid);
  });

  it("tick with interaction evolves the scheduler", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const tick = await engine.tick(pid, 0, DIRECTIONS.VERIFIED);

    expect(tick.interaction).not.toBeNull();
    expect(tick.interaction!.interfaceChanged).toBe(true);
    expect(tick.sequence).toBe(1);

    engine.kill(pid);
  });

  it("tick sequence increments", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const t1 = await engine.tick(pid);
    const t2 = await engine.tick(pid, 0, DIRECTIONS.VERIFIED);
    const t3 = await engine.tick(pid);

    expect(t1.sequence).toBe(1);
    expect(t2.sequence).toBe(2);
    expect(t3.sequence).toBe(3);

    engine.kill(pid);
  });

  it("halting interaction marks tick as halted", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const tick = await engine.tick(pid, 0, DIRECTIONS.REVOKED);

    expect(tick.halted).toBe(true);
    expect(tick.interaction!.halted).toBe(true);
  });

  it("projections contain all 6 UI types", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());
    const tick = await engine.tick(pid);

    const types = [...tick.projections.keys()];
    expect(types).toContain("ui:stat-card");
    expect(types).toContain("ui:data-table");
    expect(types).toContain("ui:metric-bar");
    expect(types).toContain("ui:info-card");
    expect(types).toContain("ui:page-shell");
    expect(types).toContain("ui:dashboard-grid");

    engine.kill(pid);
  });
});

// ── T2: Multi-Process ──────────────────────────────────────────────────────

describe("T2: Multi-Process Management", () => {
  it("engine manages multiple concurrent processes", async () => {
    const engine = new HologramEngine();

    const pid1 = await engine.spawn(simpleBlueprint("app-1"));
    const pid2 = await engine.spawn(simpleBlueprint("app-2"));
    const pid3 = await engine.spawn(simpleBlueprint("app-3"));

    expect(engine.processCount).toBe(3);
    expect(engine.listProcesses().length).toBe(3);

    // Tick each independently
    const t1 = await engine.tick(pid1, 0, DIRECTIONS.VERIFIED);
    const t2 = await engine.tick(pid2);
    const t3 = await engine.tick(pid3, 0, DIRECTIONS.UPGRADED);

    expect(t1.interaction).not.toBeNull();
    expect(t2.interaction).toBeNull();
    expect(t3.interaction).not.toBeNull();

    engine.kill(pid1);
    engine.kill(pid2);
    engine.kill(pid3);
  });

  it("killing one process doesn't affect others", async () => {
    const engine = new HologramEngine();
    const pid1 = await engine.spawn(simpleBlueprint("a"));
    const pid2 = await engine.spawn(simpleBlueprint("b"));

    engine.kill(pid1);

    expect(engine.processCount).toBe(1);
    const info = engine.getProcessInfo(pid2);
    expect(info.status).toBe("running");

    engine.kill(pid2);
  });
});

// ── T3: Suspend/Resume ─────────────────────────────────────────────────────

describe("T3: Suspend/Resume through Engine", () => {
  it("suspend produces content-addressed session state", async () => {
    const engine = new HologramEngine();
    const bp = simpleBlueprint();
    const pid = await engine.spawn(bp);

    await engine.tick(pid, 0, DIRECTIONS.VERIFIED);
    const suspended = await engine.suspendProcess(pid);

    expect(suspended.proof.cid).toBeTruthy();
    expect(suspended.envelope["@type"]).toBe("uor:SuspendedSession");
    expect(suspended.envelope.history.length).toBe(1);
  });

  it("resume restores process in engine", async () => {
    const engine = new HologramEngine();
    const bp = simpleBlueprint();
    const pid1 = await engine.spawn(bp);

    await engine.tick(pid1, 0, DIRECTIONS.VERIFIED);
    await engine.tick(pid1, 0, DIRECTIONS.VERIFIED);
    const suspended = await engine.suspendProcess(pid1);

    const pid2 = await engine.resumeProcess(bp, suspended);

    expect(pid2).toBeTruthy();
    expect(engine.processCount).toBe(2); // Suspended + resumed
    const info = engine.getProcessInfo(pid2);
    expect(info.status).toBe("running");
    expect(info.historyLength).toBe(2);

    engine.kill(pid2);
  });
});

// ── T4: Event System ───────────────────────────────────────────────────────

describe("T4: Event System", () => {
  it("listeners receive spawn events", async () => {
    const engine = new HologramEngine();
    const events: EngineEvent[] = [];
    engine.on((e) => events.push(e));

    const pid = await engine.spawn(simpleBlueprint());

    expect(events.length).toBe(1);
    expect(events[0].type).toBe("spawned");
    if (events[0].type === "spawned") {
      expect(events[0].pid).toBe(pid);
    }

    engine.kill(pid);
  });

  it("listeners receive tick and halt events", async () => {
    const engine = new HologramEngine();
    const events: EngineEvent[] = [];
    engine.on((e) => events.push(e));

    const pid = await engine.spawn(simpleBlueprint());
    await engine.tick(pid, 0, DIRECTIONS.REVOKED);

    const types = events.map((e) => e.type);
    expect(types).toContain("spawned");
    expect(types).toContain("ticked");
    expect(types).toContain("halted");
  });

  it("unsubscribe stops event delivery", async () => {
    const engine = new HologramEngine();
    const events: EngineEvent[] = [];
    const unsub = engine.on((e) => events.push(e));

    await engine.spawn(simpleBlueprint("a"));
    unsub();
    await engine.spawn(simpleBlueprint("b"));

    // Only received events from first spawn
    expect(events.length).toBe(1);
  });
});

// ── T5: Engine Snapshot ────────────────────────────────────────────────────

describe("T5: Engine Snapshot (Content-Addressable Kernel State)", () => {
  it("snapshot captures all processes", async () => {
    const engine = new HologramEngine();
    await engine.spawn(simpleBlueprint("a"));
    await engine.spawn(simpleBlueprint("b"));

    const { snapshot, proof } = await engine.snapshot();

    expect(snapshot["@type"]).toBe("uor:HologramEngineSnapshot");
    expect(snapshot.processes.length).toBe(2);
    expect(proof.cid).toBeTruthy();
    expect(proof.derivationId).toMatch(/^urn:uor:derivation:sha256:/);
  });

  it("snapshot totalTicks is correct", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    await engine.tick(pid);
    await engine.tick(pid, 0, DIRECTIONS.VERIFIED);
    await engine.tick(pid);

    const { snapshot } = await engine.snapshot();
    expect(snapshot.totalTicks).toBe(3);
  });
});

// ── T6: Phase 1+2+3 Integration ───────────────────────────────────────────

describe("T6: Phase 1+2+3 Integration", () => {
  it("blueprint with UI elements spawns and ticks correctly", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(uiBlueprint());

    const tick = await engine.tick(pid, 0, DIRECTIONS.VERIFIED);

    expect(tick.projections.size).toBe(6);
    expect(tick.interaction!.interfaceChanged).toBe(true);

    // Verify stat-card projection has valid props
    const statCard = tick.projections.get("ui:stat-card");
    expect(statCard).toBeDefined();
    expect(statCard!.type).toBe("ui:stat-card");
    expect(statCard!.props).toBeDefined();

    engine.kill(pid);
  });

  it("execute runs data through the lens pipeline", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const result = await engine.execute(pid, { msg: "hello" });
    expect(result).toEqual({ msg: "hello" });

    engine.kill(pid);
  });

  it("project returns a specific UI projection with overrides", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const proj = await engine.project(pid, "ui:stat-card", { label: "Custom" });

    expect(proj.type).toBe("ui:stat-card");
    expect(proj.props.label).toBe("Custom");

    engine.kill(pid);
  });

  it("evolving state changes UI projections", async () => {
    const engine = new HologramEngine();
    const pid = await engine.spawn(simpleBlueprint());

    const tick1 = await engine.tick(pid);
    const tick2 = await engine.tick(pid, 0, DIRECTIONS.VERIFIED);

    // Identity should differ after evolution
    expect(tick1.identity.hex).not.toBe(tick2.identity.hex);

    // UI projections should reflect the changed identity
    const card1 = tick1.projections.get("ui:stat-card")!;
    const card2 = tick2.projections.get("ui:stat-card")!;
    expect(card1.source.hex).not.toBe(card2.source.hex);

    engine.kill(pid);
  });
});

// ── T7: Determinism ────────────────────────────────────────────────────────

describe("T7: Determinism (Same Inputs → Same Projections)", () => {
  it("static blueprint produces consistent projections across ticks", async () => {
    const engine = new HologramEngine();
    const bp = createExecutableBlueprint({
      name: "static-test",
      elements: SIMPLE_ELEMENTS,
      scheduler: STATIC_SCHEDULER,
    });

    const pid = await engine.spawn(bp);

    const tick1 = await engine.tick(pid);
    const tick2 = await engine.tick(pid);

    // With a static scheduler and no interactions, identity should be stable
    expect(tick1.identity.hex).toBe(tick2.identity.hex);

    const card1 = tick1.projections.get("ui:stat-card")!;
    const card2 = tick2.projections.get("ui:stat-card")!;
    expect(card1.props).toEqual(card2.props);

    engine.kill(pid);
  });
});
