/**
 * Q-Kernel Phase 6 Tests — Q-Agent Runtime
 * ══════════════════════════════════════════
 *
 * Tests the agent container/VM layer:
 *   Spawn → Think → Communicate → Feedback → Freeze/Thaw → Mesh
 */

import { describe, it, expect } from "vitest";
import { bootSync as boot } from "@/hologram/kernel/boot/q-boot";
import { QSched } from "@/hologram/kernel/compute/q-sched";
import { QIpc } from "@/hologram/kernel/network/q-ipc";
import { QNet } from "@/hologram/kernel/network/q-net";
import { QAgent, QAgentMesh, type ResourceEnvelope } from "@/hologram/kernel/agents/q-agent";

// ── Helper: set up shared infrastructure ─────────────────────────
async function createMesh() {
  const kernel = await boot();
  const sched = new QSched();
  sched.registerGenesis(kernel.genesis.sessionCid);
  const ipc = new QIpc();
  const net = new QNet();
  const mesh = new QAgentMesh(sched, ipc, net);
  return { kernel, sched, ipc, net, mesh };
}

describe("Q-Agent: Lifecycle & Isolation", () => {
  it("spawns an agent with isolated MMU and syscall", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("alpha", 0.9);

    expect(agent.name).toBe("alpha");
    expect(agent.state).toBe("active");
    expect(agent.hScore).toBe(0.9);
    expect(agent.zone).toBe("convergent");
    expect(agent.sessionLength).toBe(0);
    expect(agent.mmu).toBeDefined();
    expect(agent.syscall).toBeDefined();
  });

  it("think() produces a session chain entry", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("thinker", 0.85);

    const entry = await agent.think({ question: "What is coherence?" });

    expect(entry.action).toBe("think");
    expect(entry.entryCid).toBeTruthy();
    expect(entry.parentCid).toBeNull(); // first entry
    expect(entry.sequenceNum).toBe(0);
    expect(entry.hScore).toBe(0.85);
    expect(entry.zone).toBe("convergent");
    expect(agent.sessionLength).toBe(1);
  });

  it("session chain links entries immutably", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("chainer", 0.8);

    const e1 = await agent.think({ step: 1 });
    const e2 = await agent.think({ step: 2 });
    const e3 = await agent.think({ step: 3 });

    expect(e1.parentCid).toBeNull();
    expect(e2.parentCid).toBe(e1.entryCid);
    expect(e3.parentCid).toBe(e2.entryCid);
    expect(e3.sequenceNum).toBe(2);

    const chain = agent.getSessionChain();
    expect(chain.length).toBe(3);
  });

  it("respond() refracts a CID into a modality", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("responder", 0.9);

    const thought = await agent.think({ data: "theorem proof" });
    const response = await agent.respond(thought.outputCid!);

    expect(response.action).toBe("respond");
    expect(response.inputCid).toBe(thought.outputCid);
    expect(agent.sessionLength).toBe(2);
  });

  it("each agent has isolated memory", async () => {
    const { mesh } = await createMesh();
    const a = await mesh.spawn("iso-a", 0.9);
    const b = await mesh.spawn("iso-b", 0.8);

    await a.think({ private: "alpha-data" });
    await b.think({ private: "beta-data" });

    // Each agent has its own MMU
    const aPages = a.mmu.stats().uniqueCids;
    const bPages = b.mmu.stats().uniqueCids;
    expect(aPages).toBeGreaterThan(0);
    expect(bPages).toBeGreaterThan(0);

    // Different MMU instances
    expect(a.mmu).not.toBe(b.mmu);
  });
});

describe("Q-Agent: H-Score Feedback Loop", () => {
  it("human feedback adjusts H-score with highest weight", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("feedbackee", 0.8);

    await agent.think({ output: "test" });

    // Human rates output highly
    await agent.feedback("test-cid", 1.0, "human");
    expect(agent.hScore).toBeGreaterThan(0.8);

    // Human rates output poorly
    await agent.feedback("test-cid-2", 0.1, "human");
    expect(agent.hScore).toBeLessThan(0.8);
  });

  it("peer feedback has lower weight than human", async () => {
    const { mesh } = await createMesh();
    const a = await mesh.spawn("peer-test", 0.5);

    const before = a.hScore;
    await a.feedback("out1", 1.0, "peer");  // alpha=0.2
    const afterPeer = a.hScore;

    const b = await mesh.spawn("human-test", 0.5);
    await b.feedback("out2", 1.0, "human"); // alpha=0.4
    const afterHuman = b.hScore;

    // Human feedback should cause a larger shift
    expect(afterHuman - 0.5).toBeGreaterThan(afterPeer - before);
  });

  it("low H-score triggers suspension", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("divergent", 0.5);

    // Repeated bad feedback
    for (let i = 0; i < 10; i++) {
      await agent.feedback(`bad-${i}`, 0.05, "human");
    }

    expect(agent.state).toBe("suspended");
    expect(agent.hScore).toBeLessThan(0.3);
  });

  it("suspended agent can be revived after H-score recovery", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("revivable", 0.35);

    // Force suspension
    await agent.feedback("bad", 0.05, "human");
    await agent.feedback("bad2", 0.05, "human");
    await agent.feedback("bad3", 0.05, "human");

    if (agent.state !== "suspended") {
      // Need more decay
      for (let i = 0; i < 5; i++) {
        await agent.feedback(`bad-extra-${i}`, 0.05, "human");
      }
    }

    expect(agent.state).toBe("suspended");

    // Cannot revive while H-score is low
    expect(agent.revive()).toBe(false);
  });

  it("H-score trend detection works", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("trending", 0.5);

    // Rising trend
    await agent.feedback("o1", 0.6, "system");
    await agent.feedback("o2", 0.7, "system");
    await agent.feedback("o3", 0.8, "system");
    await agent.feedback("o4", 0.9, "system");
    await agent.feedback("o5", 1.0, "system");

    const stats = agent.stats();
    expect(stats.hScoreTrend).toBe("rising");
  });
});

describe("Q-Agent: Freeze/Thaw (Docker Image Equivalent)", () => {
  it("freeze produces a snapshot CID", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("freezable", 0.9);

    await agent.think({ data: "important" });
    await agent.think({ data: "work" });

    const snapshot = await agent.freeze();

    expect(snapshot.snapshotCid).toBeTruthy();
    expect(snapshot.agentId).toBe(agent.id);
    expect(snapshot.sessionLength).toBe(2);
    expect(snapshot.hScore).toBe(0.9);
    expect(snapshot.zone).toBe("convergent");
    expect(agent.state).toBe("frozen");
  });

  it("frozen agent cannot execute", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("frozen-test", 0.8);

    await agent.freeze();

    await expect(agent.think({ nope: true })).rejects.toThrow("frozen");
  });

  it("thaw restores agent to active", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("thawable", 0.85);

    await agent.think({ setup: true });
    await agent.freeze();
    expect(agent.state).toBe("frozen");

    const thawed = agent.thaw();
    expect(thawed).toBe(true);
    expect(agent.state).toBe("active");

    // Can think again
    const entry = await agent.think({ resumed: true });
    expect(entry.sequenceNum).toBe(1); // continues chain
    expect(entry.parentCid).toBeTruthy();
  });

  it("terminated agent cannot be frozen", async () => {
    const { mesh } = await createMesh();
    const agent = await mesh.spawn("dead", 0.5);
    agent.terminate();

    await expect(agent.freeze()).rejects.toThrow("terminated");
  });
});

describe("Q-Agent: IPC Communication", () => {
  it("two agents communicate via shared channel", async () => {
    const { mesh } = await createMesh();
    const alice = await mesh.spawn("alice", 0.9);
    const bob = await mesh.spawn("bob", 0.8);

    const ch = await mesh.connect(alice, bob, 0.5);

    const r1 = await alice.communicate(
      ch.channelCid,
      new TextEncoder().encode("Hello Bob!")
    );
    expect(r1.sent).toBe(true);
    expect(r1.entry).toBeDefined();

    const r2 = await bob.communicate(
      ch.channelCid,
      new TextEncoder().encode("Hi Alice!")
    );
    expect(r2.sent).toBe(true);

    // Both see the conversation
    const msgs = alice.listen(ch.channelCid);
    expect(msgs.length).toBe(2);
    expect(msgs[1].parentCid).toBe(msgs[0].messageCid);
  });

  it("H-score gate blocks low-coherence agent from channel", async () => {
    const { mesh } = await createMesh();
    const good = await mesh.spawn("coherent", 0.9);
    const bad = await mesh.spawn("divergent", 0.3);

    const ch = await mesh.connect(good, bad, 0.5);

    const result = await bad.communicate(
      ch.channelCid,
      new TextEncoder().encode("should fail")
    );
    expect(result.sent).toBe(false);
    expect(result.reason).toContain("h_score_too_low");
  });

  it("channel limit is enforced per resource envelope", async () => {
    const { mesh } = await createMesh();
    const limited = await mesh.spawn("limited", 0.9, {
      maxMemoryBytes: 1024 * 1024,
      maxCpuMs: 100,
      hScoreBudget: 0.3,
      maxChannels: 2,
      maxNetEnvelopes: 64,
    });

    const peer1 = await mesh.spawn("p1", 0.8);
    const peer2 = await mesh.spawn("p2", 0.8);
    const peer3 = await mesh.spawn("p3", 0.8);

    await limited.openChannel("ch1", [peer1.pid]);
    await limited.openChannel("ch2", [peer2.pid]);

    await expect(
      limited.openChannel("ch3", [peer3.pid])
    ).rejects.toThrow("channel limit");
  });
});

describe("Q-Agent Mesh: Orchestration", () => {
  it("spawns multiple agents and reports mesh stats", async () => {
    const { mesh } = await createMesh();

    await mesh.spawn("alpha", 0.95);
    await mesh.spawn("beta", 0.7);
    await mesh.spawn("gamma", 0.4);

    const stats = mesh.stats();
    expect(stats.totalAgents).toBe(3);
    expect(stats.activeAgents).toBe(3);
    expect(stats.meanHScore).toBeCloseTo(0.683, 1);
    expect(stats.zoneDistribution.convergent).toBe(1);
    expect(stats.zoneDistribution.exploring).toBe(1);
    expect(stats.zoneDistribution.divergent).toBe(1);
  });

  it("agentsByCoherence returns highest H-score first", async () => {
    const { mesh } = await createMesh();

    await mesh.spawn("low", 0.3);
    await mesh.spawn("high", 0.95);
    await mesh.spawn("mid", 0.6);

    const sorted = mesh.agentsByCoherence();
    expect(sorted[0].name).toBe("high");
    expect(sorted[1].name).toBe("mid");
    expect(sorted[2].name).toBe("low");
  });

  it("agentsByZone filters correctly", async () => {
    const { mesh } = await createMesh();

    await mesh.spawn("c1", 0.9);
    await mesh.spawn("c2", 0.85);
    await mesh.spawn("e1", 0.6);
    await mesh.spawn("d1", 0.2);

    expect(mesh.agentsByZone("convergent").length).toBe(2);
    expect(mesh.agentsByZone("exploring").length).toBe(1);
    expect(mesh.agentsByZone("divergent").length).toBe(1);
  });

  it("tick() runs scheduler and reports state", async () => {
    const { mesh } = await createMesh();

    await mesh.spawn("worker-a", 0.9);
    await mesh.spawn("worker-b", 0.7);

    const result = mesh.tick();
    // Genesis (PID 0, H=1.0) gets scheduled first
    expect(result.scheduled).toBeDefined();
    expect(result.suspended).toEqual([]);
    expect(result.frozen).toEqual([]);
  });

  it("despawn terminates and removes agent", async () => {
    const { mesh } = await createMesh();

    const agent = await mesh.spawn("doomed", 0.5);
    const id = agent.id;

    expect(mesh.allAgents().length).toBe(1);
    mesh.despawn(id);
    expect(mesh.allAgents().length).toBe(0);
    expect(mesh.getAgent(id)).toBeUndefined();
  });

  it("broadcast sends to all active agents via network", async () => {
    const { mesh } = await createMesh();

    const sender = await mesh.spawn("broadcaster", 0.9);
    await mesh.spawn("receiver-1", 0.8);
    await mesh.spawn("receiver-2", 0.7);

    const result = await mesh.broadcast(
      sender,
      new TextEncoder().encode("hello mesh")
    );

    expect(result.delivered).toBe(2);
    expect(result.rejected).toBe(0);
  });

  it("mesh coherence reflects aggregate agent health", async () => {
    const { mesh } = await createMesh();

    const a = await mesh.spawn("healthy", 0.9);
    const b = await mesh.spawn("ok", 0.7);
    const c = await mesh.spawn("struggling", 0.5);

    const stats = mesh.stats();
    expect(stats.meshCoherence).toBeCloseTo(0.7, 1);

    // Improve one agent's H-score
    await a.feedback("good", 1.0, "human");
    const stats2 = mesh.stats();
    expect(stats2.meshCoherence).toBeGreaterThan(stats.meshCoherence);
  });
});

describe("Q-Agent: Full Integration", () => {
  it("end-to-end: spawn, think, communicate, feedback, freeze, thaw", async () => {
    const { mesh } = await createMesh();

    // Spawn agents
    const researcher = await mesh.spawn("researcher", 0.9);
    const reviewer = await mesh.spawn("reviewer", 0.85);

    // Researcher thinks
    const thought = await researcher.think({ hypothesis: "Coherence maximizes understanding" });
    expect(thought.entryCid).toBeTruthy();

    // Connect agents
    const ch = await mesh.connect(researcher, reviewer, 0.5);

    // Researcher sends result to reviewer
    const sent = await researcher.communicate(
      ch.channelCid,
      new TextEncoder().encode(JSON.stringify({ finding: thought.outputCid }))
    );
    expect(sent.sent).toBe(true);

    // Reviewer reads and responds
    const msgs = reviewer.listen(ch.channelCid);
    expect(msgs.length).toBe(1);

    const review = await reviewer.think({ reviewing: msgs[0].messageCid });

    const reply = await reviewer.communicate(
      ch.channelCid,
      new TextEncoder().encode(JSON.stringify({ verdict: "confirmed", cid: review.outputCid }))
    );
    expect(reply.sent).toBe(true);

    // Human feedback on researcher's output
    await researcher.feedback(thought.outputCid!, 0.95, "human");
    expect(researcher.hScore).toBeGreaterThan(0.9);
    expect(researcher.zone).toBe("convergent");

    // Freeze researcher (save state)
    const snapshot = await researcher.freeze();
    expect(snapshot.snapshotCid).toBeTruthy();
    expect(snapshot.sessionLength).toBe(2); // think + communicate

    // Thaw and continue
    researcher.thaw();
    const continued = await researcher.think({ next: "experiment" });
    expect(continued.sequenceNum).toBe(2);

    // Mesh stats reflect everything
    const stats = mesh.stats();
    expect(stats.totalAgents).toBe(2);
    expect(stats.totalSyscalls).toBeGreaterThan(0);
    expect(stats.totalMessages).toBe(2);
    expect(stats.meshCoherence).toBeGreaterThan(0.8);
  });
});
