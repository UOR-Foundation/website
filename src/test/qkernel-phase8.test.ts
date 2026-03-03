import { describe, it, expect, beforeAll } from "vitest";
import { QSched } from "@/hologram/kernel/compute/q-sched";
import { QIpc } from "@/hologram/kernel/network/q-ipc";
import { QNet } from "@/hologram/kernel/network/q-net";
import { QEcc } from "@/hologram/kernel/compute/q-ecc";
import { QSecureMesh } from "@/hologram/kernel/security/q-secure-mesh";
import type { QAgent } from "@/hologram/kernel/agents/q-agent";

describe("Phase 8: Q-Security ↔ Agent Mesh Integration", () => {
  let mesh: QSecureMesh;
  const ORCH = 0; // orchestrator PID (Ring 0)

  async function freshMesh(): Promise<QSecureMesh> {
    const sched = new QSched();
    const ipc = new QIpc();
    const net = new QNet();
    const ecc = new QEcc();
    const m = new QSecureMesh(sched, ipc, net, ecc);
    await m.init();
    return m;
  }

  beforeAll(async () => {
    mesh = await freshMesh();
  });

  // ── Ring-Based Spawn Isolation ─────────────────────────────

  it("1. Ring-0 orchestrator can spawn agents", async () => {
    mesh = await freshMesh();
    const result = await mesh.spawn(ORCH, "worker-a", 0.7);
    expect(result.allowed).toBe(true);
    expect(result.eccVerified).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.name).toBe("worker-a");
  });

  it("2. Spawned agent defaults to Ring 3 (user)", async () => {
    mesh = await freshMesh();
    const result = await mesh.spawn(ORCH, "user-agent", 0.7);
    const info = mesh.getSecureAgentInfo(result.data!);
    expect(info.ring).toBe(3);
  });

  it("3. Ring-3 agent CANNOT spawn other agents (no 'spawn' capability)", async () => {
    mesh = await freshMesh();
    const r = await mesh.spawn(ORCH, "parent", 0.8);
    const parentPid = r.data!.pid;

    // Ring-3 agent tries to spawn — should be denied
    const denied = await mesh.spawn(parentPid, "child", 0.5);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain("denied");
  });

  it("4. Agent can be spawned at custom ring (e.g., Ring 2 = service)", async () => {
    mesh = await freshMesh();
    const result = await mesh.spawn(ORCH, "service-agent", 0.7, 2);
    expect(result.allowed).toBe(true);
    expect(mesh.getSecureAgentInfo(result.data!).ring).toBe(2);
  });

  // ── Capability-Gated IPC ───────────────────────────────────

  it("5. Ring-3 agents CAN open IPC channels (have ipc_send by default)", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "alice", 0.7)).data!;
    const b = (await mesh.spawn(ORCH, "bob", 0.7)).data!;

    const ch = await mesh.openChannel(a, "chat", [b.pid]);
    expect(ch.allowed).toBe(true);
    expect(ch.data).toBeDefined();
    expect(ch.data!.name).toBe("chat");
  });

  it("6. ECC-verified communicate() succeeds for authorized agents", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "sender", 0.7)).data!;
    const b = (await mesh.spawn(ORCH, "receiver", 0.7)).data!;

    const ch = await mesh.openChannel(a, "data", [b.pid]);
    const payload = new TextEncoder().encode('{"test": true}');
    const result = await mesh.communicate(a, ch.data!.channelCid, payload);
    expect(result.allowed).toBe(true);
    expect(result.eccVerified).toBe(true);
    expect(result.data!.sent).toBe(true);
  });

  // ── Secure Execution ───────────────────────────────────────

  it("7. Ring-3 agent CAN think() (has 'execute' capability)", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "thinker", 0.7)).data!;

    const result = await mesh.think(a, { query: "test" });
    expect(result.allowed).toBe(true);
    expect(result.eccVerified).toBe(true);
    expect(result.data!.entryCid).toBeTruthy();
  });

  // ── Ring-0 Gated Operations ────────────────────────────────

  it("8. Only Ring-0 can run scheduler tick", async () => {
    mesh = await freshMesh();
    await mesh.spawn(ORCH, "w1", 0.7);

    // Ring-0 tick succeeds
    const ok = mesh.tick(ORCH);
    expect(ok.allowed).toBe(true);

    // Ring-3 agent tick fails
    const agent = mesh.allAgents()[0];
    const denied = mesh.tick(agent.pid);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain("Ring 0");
  });

  it("9. Only Ring-0 can despawn agents", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "target", 0.7)).data!;
    const b = (await mesh.spawn(ORCH, "attacker", 0.7)).data!;

    // Ring-3 agent tries to kill another — denied
    const denied = await mesh.despawn(b.pid, a.id);
    expect(denied.allowed).toBe(false);

    // Ring-0 orchestrator can despawn
    const ok = await mesh.despawn(ORCH, a.id);
    expect(ok.allowed).toBe(true);
    expect(ok.data).toBe(true);
  });

  it("10. Only Ring-0 can broadcast", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "broadcaster", 0.7)).data!;
    const payload = new TextEncoder().encode("hello");

    // Ring-3 agent broadcast denied
    const denied = await mesh.broadcast(a.pid, a, payload);
    expect(denied.allowed).toBe(false);

    // Ring-0 broadcast succeeds
    const ok = await mesh.broadcast(ORCH, a, payload);
    expect(ok.allowed).toBe(true);
  });

  // ── Freeze/Thaw Lifecycle Gating ───────────────────────────

  it("11. Only Ring 0-1 can freeze agents", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "freezable", 0.7)).data!;
    const b = (await mesh.spawn(ORCH, "userland", 0.7)).data!;

    // Ring-3 agent tries to freeze — denied
    const denied = await mesh.freeze(b.pid, a);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain("Ring 3");

    // Ring-0 can freeze
    const ok = await mesh.freeze(ORCH, a);
    expect(ok.allowed).toBe(true);
    expect(ok.data!.snapshotCid).toBeTruthy();
  });

  it("12. Only Ring 0-1 can thaw agents", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "frozen-agent", 0.7)).data!;
    await mesh.freeze(ORCH, a);

    const b = (await mesh.spawn(ORCH, "other", 0.7)).data!;
    const denied = mesh.thaw(b.pid, a);
    expect(denied.allowed).toBe(false);

    const ok = mesh.thaw(ORCH, a);
    expect(ok.allowed).toBe(true);
    expect(ok.data).toBe(true);
  });

  // ── Ring Elevation ─────────────────────────────────────────

  it("13. Agent can elevate from Ring 3 → Ring 2 via ECC", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "elevating", 0.7)).data!;
    expect(mesh.getSecureAgentInfo(a).ring).toBe(3);

    const result = await mesh.elevate(a.pid, 2, "needs service-level access");
    expect(result.allowed).toBe(true);
    expect(result.ring).toBe(2);
  });

  it("14. Elevation to same or lower ring is denied", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "no-downgrade", 0.7)).data!;
    // Ring 3 trying to go to Ring 3 — denied
    const denied = await mesh.elevate(a.pid, 3, "no reason");
    expect(denied.allowed).toBe(false);
  });

  // ── Capability Granting ────────────────────────────────────

  it("15. Ring-0 can grant capabilities to Ring-3 agents", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "grantee", 0.7)).data!;

    const result = await mesh.grant(ORCH, a.pid, ["write", "create"], "fs:/*");
    expect(result.allowed).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.operations).toContain("write");
  });

  it("16. Ring-3 agent CANNOT grant capabilities (no 'grant' op)", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "granter", 0.7)).data!;
    const b = (await mesh.spawn(ORCH, "target", 0.7)).data!;

    const denied = await mesh.grant(a.pid, b.pid, ["execute"], "*");
    expect(denied.allowed).toBe(false);
  });

  // ── Combined Stats ─────────────────────────────────────────

  it("17. stats() returns combined mesh + security metrics", async () => {
    mesh = await freshMesh();
    await mesh.spawn(ORCH, "s1", 0.8);
    await mesh.spawn(ORCH, "s2", 0.6);

    const stats = mesh.stats();
    expect(stats.mesh.totalAgents).toBe(2);
    expect(stats.security.totalCapabilities).toBeGreaterThan(0);
    expect(stats.security.ringDistribution[0]).toBe(1); // orchestrator
    expect(stats.security.ringDistribution[3]).toBe(2); // two agents
  });

  it("18. Audit log captures denied grant operations", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "audited", 0.7)).data!;
    const b = (await mesh.spawn(ORCH, "target", 0.7)).data!;

    // Ring-3 agent tries to grant — denied, and QSecurity logs the event
    await mesh.grant(a.pid, b.pid, ["execute"], "*");

    const log = mesh.getAuditLog();
    const denials = log.filter(e => !e.allowed);
    expect(denials.length).toBeGreaterThan(0);
  });

  it("19. Elevated agent gains new capabilities", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "upgrade", 0.7)).data!;

    // Before elevation: Ring 3
    const infoBefore = mesh.getSecureAgentInfo(a);
    expect(infoBefore.ring).toBe(3);
    const opsBefore = infoBefore.capabilities.flatMap(c => c.operations);
    expect(opsBefore).not.toContain("spawn");

    // Elevate to Ring 2 (service)
    await mesh.elevate(a.pid, 2, "needs spawn");

    const infoAfter = mesh.getSecureAgentInfo(a);
    expect(infoAfter.ring).toBe(2);
    const opsAfter = infoAfter.capabilities.flatMap(c => c.operations);
    expect(opsAfter).toContain("spawn");
  });

  it("20. Ring-2 service agent CAN spawn after elevation", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "service", 0.7, 2)).data!;

    // Ring-2 has "spawn" capability
    const child = await mesh.spawn(a.pid, "child-of-service", 0.6);
    expect(child.allowed).toBe(true);
    expect(child.data!.name).toBe("child-of-service");
  });

  it("21. getSecureAgentInfo returns complete security context", async () => {
    mesh = await freshMesh();
    const a = (await mesh.spawn(ORCH, "introspect", 0.75)).data!;
    const info = mesh.getSecureAgentInfo(a);

    expect(info.agentId).toContain("introspect");
    expect(info.pid).toBe(a.pid);
    expect(info.ring).toBe(3);
    expect(info.capabilities.length).toBeGreaterThan(0);
    expect(info.state).toBe("active");
    expect(info.hScore).toBeCloseTo(0.75, 1);
    expect(info.zone).toBeDefined();
  });
});
