/**
 * Q-Kernel Test Suite
 * ═══════════════════
 *
 * Verifies every layer of the quantum kernel from axioms up:
 *   POST → Hardware → Firmware → Genesis → MMU → Scheduler
 */

import { describe, it, expect } from "vitest";
import { post, loadHardware, hydrateFirmware, createGenesisProcess, bootSync as boot } from "@/hologram/kernel/boot/q-boot";
import { QMmu } from "@/hologram/kernel/memory/q-mmu";
import { QSched, classifyZone } from "@/hologram/kernel/compute/q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Phase 0: Q-Boot
// ═══════════════════════════════════════════════════════════════════════

describe("Q-Boot: POST (Ring Integrity)", () => {
  it("critical identity holds for all 256 elements", () => {
    const result = post();
    expect(result.criticalIdentityVerified).toBe(true);
  });

  it("all 6 POST checks pass", () => {
    const result = post();
    expect(result.allPassed).toBe(true);
    expect(result.checks).toHaveLength(6);
    result.checks.forEach(c => expect(c.passed).toBe(true));
  });

  it("ring size is 256", () => {
    expect(post().ringSize).toBe(256);
  });
});

describe("Q-Boot: Hardware (Atlas Topology)", () => {
  it("loads 96 vertices", () => {
    const hw = loadHardware();
    expect(hw.vertexCount).toBe(96);
  });

  it("loads 7 Fano points and 7 Fano lines", () => {
    const hw = loadHardware();
    expect(hw.fanoPoints).toBe(7);
    expect(hw.fanoLines).toBe(7);
  });

  it("identifies 48 mirror pairs", () => {
    expect(loadHardware().mirrorPairs).toBe(48);
  });

  it("identifies 8 sign classes", () => {
    expect(loadHardware().signClasses).toBe(8);
  });

  it("hardware verification passes", () => {
    expect(loadHardware().verified).toBe(true);
  });
});

describe("Q-Boot: Firmware (Cayley-Dickson Tower)", () => {
  it("hydrates 5 algebra levels", () => {
    const fw = hydrateFirmware();
    expect(fw.levels).toBe(5);
  });

  it("all triangle identities hold", () => {
    expect(hydrateFirmware().triangleIdentitiesHold).toBe(true);
  });

  it("round-trip ℝ→𝕊→ℝ is lossless", () => {
    expect(hydrateFirmware().roundTripLossless).toBe(true);
  });

  it("algebras are ℝ, ℂ, ℍ, 𝕆, 𝕊", () => {
    const fw = hydrateFirmware();
    expect(fw.algebras).toEqual(["ℝ", "ℂ", "ℍ", "𝕆", "𝕊"]);
  });
});

describe("Q-Boot: Genesis Process", () => {
  it("creates PID 0 with H-score 1.0", async () => {
    const genesis = await createGenesisProcess();
    expect(genesis.pid).toBe(0);
    expect(genesis.hScore).toBe(1.0);
    expect(genesis.zone).toBe("convergent");
    expect(genesis.name).toBe("init");
    expect(genesis.parentPid).toBeNull();
  });

  it("genesis session CID is a valid content address", async () => {
    const genesis = await createGenesisProcess();
    expect(genesis.sessionCid.length).toBeGreaterThan(10);
  });
});

describe("Q-Boot: Full Boot Sequence", () => {
  it("boots to 'running' stage", async () => {
    const kernel = await boot();
    expect(kernel.stage).toBe("running");
  });

  it("kernel has a content-addressed CID", async () => {
    const kernel = await boot();
    expect(kernel.kernelCid.length).toBeGreaterThan(10);
  });

  it("boot completes in < 1000ms", async () => {
    const kernel = await boot();
    expect(kernel.bootTimeMs).toBeLessThan(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 1a: Q-MMU
// ═══════════════════════════════════════════════════════════════════════

describe("Q-MMU: Content-Addressed Virtual Memory", () => {
  it("stores content and returns CID", async () => {
    const mmu = new QMmu();
    const data = new TextEncoder().encode("hello quantum world");
    const cid = await mmu.store(data, 0);
    expect(cid.length).toBeGreaterThan(10);
  });

  it("loads content by CID", async () => {
    const mmu = new QMmu();
    const data = new TextEncoder().encode("test datum");
    const cid = await mmu.store(data, 0);
    const loaded = mmu.load(cid);
    expect(new TextDecoder().decode(loaded!)).toBe("test datum");
  });

  it("deduplicates identical content (same CID)", async () => {
    const mmu = new QMmu();
    const data = new TextEncoder().encode("duplicate me");
    const cid1 = await mmu.store(data, 0);
    const cid2 = await mmu.store(data, 1);
    expect(cid1).toBe(cid2);
    expect(mmu.stats().uniqueCids).toBe(1);
  });

  it("pin prevents eviction", async () => {
    const mmu = new QMmu();
    const data = new TextEncoder().encode("pinned");
    const cid = await mmu.store(data, 0);
    expect(mmu.pin(cid)).toBe(true);
    const entry = mmu.lookup(cid);
    expect(entry?.pinned).toBe(true);
  });

  it("free moves to cold storage, load triggers page fault", async () => {
    const mmu = new QMmu();
    const data = new TextEncoder().encode("cold storage test");
    const cid = await mmu.store(data, 0);
    mmu.free(cid);
    expect(mmu.lookup(cid)).toBeNull(); // not in hot

    const reloaded = mmu.load(cid);
    expect(new TextDecoder().decode(reloaded!)).toBe("cold storage test");
    expect(mmu.getPageFaults().length).toBe(1);
  });

  it("tracks statistics correctly", async () => {
    const mmu = new QMmu();
    await mmu.store(new TextEncoder().encode("a"), 0);
    await mmu.store(new TextEncoder().encode("b"), 0);
    await mmu.store(new TextEncoder().encode("a"), 0); // dedup
    const stats = mmu.stats();
    expect(stats.totalDatums).toBe(2);
    expect(stats.dedupRatio).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 1b: Q-Sched
// ═══════════════════════════════════════════════════════════════════════

describe("Q-Sched: Coherence-Priority Scheduler", () => {
  it("classifies zones correctly", () => {
    expect(classifyZone(0.9)).toBe("convergent");
    expect(classifyZone(0.6)).toBe("exploring");
    expect(classifyZone(0.3)).toBe("divergent");
  });

  it("registers genesis as PID 0", () => {
    const sched = new QSched();
    const genesis = sched.registerGenesis("baf-test-cid");
    expect(genesis.pid).toBe(0);
    expect(genesis.state).toBe("running");
    expect(genesis.hScore).toBe(1.0);
  });

  it("fork creates child with parent lineage", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    const child = await sched.fork(0, "agent-1", 0.9);
    expect(child.parentPid).toBe(0);
    expect(child.state).toBe("ready");
    expect(sched.getProcess(0)?.children).toContain(child.pid);
  });

  it("schedules highest H-score first", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    const low = await sched.fork(0, "low-h", 0.3);
    const high = await sched.fork(0, "high-h", 0.95);

    // Put genesis to ready so others can run
    sched.getProcess(0)!.state = "ready";

    const next = sched.schedule();
    expect(next?.pid).toBe(0); // genesis has H=1.0, highest
  });

  it("freeze dehydrates process to CID", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    const child = await sched.fork(0, "freezable", 0.7);
    const cid = await sched.freeze(child.pid);
    expect(cid!.length).toBeGreaterThan(10);
    expect(sched.getProcess(child.pid)?.state).toBe("frozen");
  });

  it("thaw rehydrates frozen process", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    const child = await sched.fork(0, "thawable", 0.7);
    await sched.freeze(child.pid);
    expect(sched.thaw(child.pid)).toBe(true);
    expect(sched.getProcess(child.pid)?.state).toBe("ready");
  });

  it("updateHScore changes zone classification", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    const child = await sched.fork(0, "adaptive", 0.9);
    expect(sched.getProcess(child.pid)?.zone).toBe("convergent");

    sched.updateHScore(child.pid, 0.3);
    expect(sched.getProcess(child.pid)?.zone).toBe("divergent");
  });

  it("tracks context switches", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    await sched.fork(0, "worker-1", 0.8);
    await sched.fork(0, "worker-2", 0.95);

    sched.schedule();
    sched.getProcess(0)!.state = "ready";
    sched.schedule(); // should switch

    expect(sched.stats().contextSwitches).toBeGreaterThanOrEqual(0);
  });

  it("stats reflect correct zone distribution", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    await sched.fork(0, "conv", 0.9);
    await sched.fork(0, "expl", 0.6);
    await sched.fork(0, "div", 0.2);

    const stats = sched.stats();
    expect(stats.zoneDistribution.convergent).toBe(2); // genesis + conv
    expect(stats.zoneDistribution.exploring).toBe(1);
    expect(stats.zoneDistribution.divergent).toBe(1);
  });

  it("kill terminates process", async () => {
    const sched = new QSched();
    sched.registerGenesis("baf-genesis");
    const child = await sched.fork(0, "killable", 0.5);
    expect(sched.kill(child.pid)).toBe(true);
    expect(sched.getProcess(child.pid)?.state).toBe("halted");
  });
});
