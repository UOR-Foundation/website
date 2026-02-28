/**
 * Q-Kernel Integration Test — Full System Coherence
 * ═══════════════════════════════════════════════════
 *
 * Exercises the ENTIRE kernel as one unified system:
 *   Boot → MMU → Sched → Syscall → FS → ECC → ISA → Net → IPC
 */

import { describe, it, expect } from "vitest";
import { boot } from "@/modules/qkernel/q-boot";
import { QMmu } from "@/modules/qkernel/q-mmu";
import { QSched } from "@/modules/qkernel/q-sched";
import { QSyscall } from "@/modules/qkernel/q-syscall";
import { QFs } from "@/modules/qkernel/q-fs";
import { QEcc, CODE_K } from "@/modules/qkernel/q-ecc";
import { QIsa } from "@/modules/qkernel/q-isa";
import { QNet } from "@/modules/qkernel/q-net";
import { QIpc } from "@/modules/qkernel/q-ipc";

describe("Q-Kernel: Full System Boot & Integration", () => {
  it("boots and exercises all 8 subsystems end-to-end", async () => {
    // ── Stage 0: Boot ────────────────────────────────────────────
    const kernel = await boot();
    expect(kernel.stage).toBe("running");
    expect(kernel.post.allPassed).toBe(true);
    expect(kernel.hardware.vertexCount).toBe(96);
    expect(kernel.hardware.fanoLines).toBe(7);
    expect(kernel.hardware.mirrorPairs).toBe(48);
    expect(kernel.firmware.triangleIdentitiesHold).toBe(true);
    expect(kernel.firmware.roundTripLossless).toBe(true);
    expect(kernel.genesis.pid).toBe(0);
    expect(kernel.genesis.hScore).toBe(1.0);
    expect(kernel.kernelCid).toBeTruthy();

    // ── Stage 1: MMU + Scheduler ─────────────────────────────────
    const mmu = new QMmu();
    const sched = new QSched();
    sched.registerGenesis(kernel.genesis.sessionCid);

    const agentA = await sched.fork(0, "agent-alpha", 0.9);
    const agentB = await sched.fork(0, "agent-beta", 0.7);

    // Same content = same CID → FREE dedup
    const content = new TextEncoder().encode("shared knowledge");
    const cidA = await mmu.store(content, agentA.pid);
    const cidB = await mmu.store(content, agentB.pid);
    expect(cidA).toBe(cidB);

    // Schedule: genesis runs first (PID 0, H=1.0), then alpha
    sched.schedule(); // genesis gets its tick
    const initProc = sched.getProcess(0)!;
    initProc.state = "blocked"; // simulate init yielding
    const next = sched.schedule();
    expect(next!.pid).toBe(agentA.pid);

    // ── Stage 2: Syscall + Filesystem ────────────────────────────
    const syscall = new QSyscall(mmu);

    // focus (read)
    const focused = await syscall.focus({ type: "knowledge", data: "theorem" }, 0);
    expect(focused.morphism).toBe("morphism:Isometry");
    expect(focused.cid).toBeTruthy();

    // refract (write)
    const refracted = await syscall.refract(focused.cid, "compact-json", 0);
    expect(refracted.morphism).toBe("morphism:Transform");

    // resolve (open)
    const resolved = await syscall.resolve(focused.cid, 0);
    expect(resolved.morphism).toBe("morphism:Isometry");

    // compileLens (exec)
    const compiled = await syscall.compileLens(
      { name: "test-lens", version: "1.0", modalities: ["identity"], pipeline: [{ name: "pass", morphism: "morphism:Isometry" }] },
      0
    );
    expect(compiled.morphism).toBe("morphism:Action");

    // Syscall stats
    const sysStats = syscall.stats();
    expect(sysStats.totalCalls).toBe(4);

    // Filesystem
    const fs = new QFs(mmu);
    await fs.mkfs(0);

    const researchDir = await fs.mkdir("/", "research", 0);
    expect(researchDir.type).toBe("directory");

    const fileInode = await fs.createFile("/research", "paper.md", content, 0);
    expect(fileInode.contentCid).toBeTruthy();

    // Read back
    const stat = fs.stat("/research/paper.md");
    expect(stat).toBeDefined();
    expect(stat!.contentCid).toBeTruthy();

    // Journal integrity
    const journal = fs.getJournal();
    expect(journal.length).toBeGreaterThanOrEqual(3); // mkfs + mkdir + create

    // ── Stage 3: ECC + ISA ───────────────────────────────────────
    const ecc = new QEcc();
    const isa = new QIsa(ecc);

    // Encode, corrupt, correct
    const logical = new Array(CODE_K).fill(0);
    logical[0] = 1;
    logical[42] = 1;
    const physical = ecc.encode(logical);

    const gen = ecc.getGenerators()[0];
    physical[gen.qubitA] ^= 1;

    const corrected = ecc.correct(physical);
    expect(corrected.corrected).toBe(true);
    expect(ecc.decode(corrected.codeword)).toEqual(logical);

    // Compile & execute circuit
    const circuit = isa.compile("bell", 2, [
      { gate: "H", targets: [0] },
      { gate: "CNOT", targets: [1], controls: [0] },
    ], false);
    expect(circuit.gateCount).toBe(2);
    const result = isa.execute(circuit, [0, 0]);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1);

    expect(isa.transformGroupSize()).toBe(192);

    // ── Stage 4: Net + IPC ───────────────────────────────────────
    const net = new QNet();
    const ipc = new QIpc();

    expect(net.getNodes().length).toBe(7);
    expect(net.getRoutingTable().length).toBe(42);

    // Firewall: require H ≥ 0.5
    net.addFirewallRule("reject", 0.5, "*", null, 10);

    // Agent alpha communicates
    const sent = await net.send(
      agentA.sessionCid, agentB.sessionCid,
      new TextEncoder().encode("hello beta"),
      agentA.hScore
    );
    expect(sent.delivered).toBe(true);

    // IPC channel
    const channel = await ipc.createChannel("alpha-beta", [agentA.pid, agentB.pid], 0.5);

    const msg1 = await ipc.send(channel.channelCid, agentA.pid, new TextEncoder().encode("proposal"), 0.9);
    expect(msg1.sent).toBe(true);

    const msg2 = await ipc.send(channel.channelCid, agentB.pid, new TextEncoder().encode("accepted"), 0.7);
    expect(msg2.sent).toBe(true);
    expect(msg2.message!.parentCid).toBe(msg1.message!.messageCid);

    const integrity = ipc.verifyChain(channel.channelCid);
    expect(integrity.valid).toBe(true);
    expect(integrity.length).toBe(2);

    // ── Full System Stats ────────────────────────────────────────
    expect(mmu.stats().uniqueCids).toBeGreaterThan(0);
    expect(sched.stats().totalProcesses).toBe(3);
    expect(fs.stats().totalInodes).toBeGreaterThan(0);
    expect(ecc.stats().errorsCorrected).toBe(1);
    expect(isa.stats().totalGates).toBe(96);
    expect(net.stats().envelopesSent).toBe(1);
    expect(ipc.stats().chainIntegrityVerified).toBe(true);
  });

  it("context switch preserves state across freeze/thaw", async () => {
    const kernel = await boot();
    const sched = new QSched();
    sched.registerGenesis(kernel.genesis.sessionCid);

    const proc = await sched.fork(0, "freezable", 0.85);
    const frozenCid = await sched.freeze(proc.pid);
    expect(frozenCid).toBeTruthy();
    expect(sched.getProcess(proc.pid)!.state).toBe("frozen");

    expect(sched.thaw(proc.pid)).toBe(true);
    expect(sched.getProcess(proc.pid)!.state).toBe("ready");
    expect(sched.getProcess(proc.pid)!.hScore).toBe(0.85);
  });

  it("firewall blocks divergent agents from network", async () => {
    const net = new QNet();
    net.addFirewallRule("drop", 0.5, "*", null, 10);

    const blocked = await net.send("bad", "good", new Uint8Array([1]), 0.2);
    expect(blocked.delivered).toBe(false);

    const passed = await net.send("good", "other", new Uint8Array([1]), 0.95);
    expect(passed.delivered).toBe(true);

    expect(net.stats().firewallRejections).toBe(1);
  });

  it("IPC H-score gate enforces coherence for messaging", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("gated", [0, 1], 0.6);

    const rejected = await ipc.send(ch.channelCid, 0, new Uint8Array([1]), 0.3);
    expect(rejected.sent).toBe(false);

    const accepted = await ipc.send(ch.channelCid, 0, new Uint8Array([1]), 0.8);
    expect(accepted.sent).toBe(true);

    expect(ipc.stats().rejectedMessages).toBe(1);
  });

  it("ECC protects ISA circuit execution end-to-end", () => {
    const ecc = new QEcc();
    const isa = new QIsa(ecc);

    const logical = new Array(48).fill(0);
    logical[0] = 1;
    const encoded = ecc.encode(logical);

    const circuit = isa.compile("ecc-protected", 96, [
      { gate: "I", targets: [0] },
    ], true);

    const result = isa.execute(circuit, [...encoded]);
    const decoded = ecc.decode(result);
    expect(decoded[0]).toBe(1);
  });

  it("filesystem journal forms an immutable hash chain", async () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    await fs.mkfs(0);
    await fs.mkdir("/", "logs", 0);
    await fs.createFile("/logs", "boot.log", new TextEncoder().encode("kernel booted"), 0);
    await fs.createFile("/logs", "net.log", new TextEncoder().encode("network up"), 0);

    const journal = fs.getJournal();
    expect(journal.length).toBe(4); // mkfs + mkdir + 2 creates

    // Each entry links to predecessor via prevEntryCid
    for (let i = 1; i < journal.length; i++) {
      expect(journal[i].prevEntryCid).toBeTruthy();
    }
    expect(journal[0].prevEntryCid).toBeNull(); // genesis
  });

  it("syscall pipeline preserves morphism types", async () => {
    const mmu = new QMmu();
    const syscall = new QSyscall(mmu);

    const focus = await syscall.focus({ x: 1 }, 0);
    expect(focus.morphism).toBe("morphism:Isometry");

    const refract = await syscall.refract(focus.cid, "identity", 0);
    expect(refract.morphism).toBe("morphism:Transform");

    const resolve = await syscall.resolve(focus.cid, 0);
    expect(resolve.morphism).toBe("morphism:Isometry");

    const compile = await syscall.compileLens(
      { name: "t", version: "1.0", modalities: ["identity"], pipeline: [{ name: "id", morphism: "morphism:Isometry" }] },
      0
    );
    expect(compile.morphism).toBe("morphism:Action");

    expect(syscall.stats().totalCalls).toBe(4);
  });
});
