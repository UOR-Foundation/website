import { describe, it, expect } from "vitest";
import { QSched } from "../../kernel/q-sched";
import { QIpc } from "../../ipc/q-ipc";
import { QNet } from "../../net/q-net";
import { QAgent, QAgentMesh } from "../../agents/q-agent";
import { QTrustMesh } from "../../net/q-trust-mesh";
import { QDisclosure } from "../../security/q-disclosure";

describe("Crystallization Phase 3 — q-agent, q-trust-mesh, q-disclosure", () => {
  it("q-agent: think + respond are synchronous", () => {
    const sched = new QSched();
    const ipc = new QIpc();
    const net = new QNet();
    const proc = sched.fork(0, "test-agent", 0.8);
    const agent = new QAgent("a1", "tester", proc, sched, ipc, net);

    const entry = agent.think({ question: "hello" });
    expect(entry.entryCid).toBeTruthy();
    expect(entry.action).toBe("think");
    expect(agent.sessionLength).toBe(1);
  });

  it("q-agent: feedback is synchronous", () => {
    const sched = new QSched();
    const ipc = new QIpc();
    const net = new QNet();
    const proc = sched.fork(0, "fb-agent", 0.8);
    const agent = new QAgent("a2", "fb", proc, sched, ipc, net);

    agent.feedback("cid-1", 0.9, "human");
    expect(agent.hScore).toBeGreaterThan(0.8);
  });

  it("q-agent: freeze returns snapshot synchronously", () => {
    const sched = new QSched();
    const ipc = new QIpc();
    const net = new QNet();
    const proc = sched.fork(0, "freeze-agent", 0.7);
    const agent = new QAgent("a3", "freezer", proc, sched, ipc, net);

    agent.think("data");
    const snap = agent.freeze();
    expect(snap.snapshotCid).toBeTruthy();
    expect(agent.state).toBe("frozen");
  });

  it("q-agent-mesh: spawn + tick are synchronous", () => {
    const sched = new QSched();
    const ipc = new QIpc();
    const net = new QNet();
    const mesh = new QAgentMesh(sched, ipc, net);

    const agent = mesh.spawn("worker", 0.8);
    expect(agent.state).toBe("active");

    const tick = mesh.tick();
    expect(tick.scheduled).not.toBeNull();

    const stats = mesh.stats();
    expect(stats.totalAgents).toBe(1);
    expect(stats.activeAgents).toBe(1);
  });

  it("q-trust-mesh: attest + mutualCeremony are synchronous", () => {
    const net = new QNet();
    const trust = new QTrustMesh(net);

    const att = trust.attest("id:aa", "Alpha·Beta·Gamma", "id:bb", "Delta·Echo·Foxtrot", "trusted", "test");
    expect(att.attestationCid).toBeTruthy();
    expect(att.level).toBe("trusted");

    const { ceremony } = trust.mutualCeremony(
      { canonicalId: "id:cc", threeWord: "Golf·Hotel·India" },
      { canonicalId: "id:dd", threeWord: "Juliet·Kilo·Lima" },
      "acquaintance", "met at conference"
    );
    expect(ceremony.ceremonyCid).toBeTruthy();

    const score = trust.computeTrustScore("id:bb", "Delta·Echo·Foxtrot");
    expect(score.inboundCount).toBe(1);
    expect(score.highestLevel).toBe("trusted");
  });

  it("q-disclosure: createPolicy + project + verify are synchronous", () => {
    const disc = new QDisclosure();

    const policy = disc.createPolicy("owner:aa", [
      { attributeKey: "threeWord", visibility: "public", audienceCanonicalIds: [], expiresAt: null },
      { attributeKey: "canonicalId", visibility: "private", audienceCanonicalIds: [], expiresAt: null },
    ]);
    expect(policy.policyId).toBeTruthy();

    const projection = disc.project(
      policy.policyId,
      { threeWord: "Alpha·Beta·Gamma", canonicalId: "id:secret" },
      "recipient:bb",
      "full"
    );
    // threeWord is public, canonicalId is private (redacted)
    // "full" layer exposes threeWord + canonicalId from LAYER_ATTRIBUTES,
    // plus object keys (threeWord, canonicalId) — deduplication means threeWord appears once disclosed
    expect(projection.disclosedAttributes.length).toBeGreaterThanOrEqual(1);
    expect(projection.disclosedAttributes.find(a => a.key === "threeWord")).toBeTruthy();
    expect(projection.redactedCount).toBeGreaterThanOrEqual(1);

    const valid = disc.verifyProjection(projection);
    expect(valid).toBe(true);
  });
});
