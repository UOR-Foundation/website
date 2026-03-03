/**
 * Q-Net + Q-IPC Test Suite (Phase 4)
 * ════════════════════════════════════
 *
 * Verifies: Fano-topology networking, firewall, sockets,
 *           IPC channels, chain integrity, subscriptions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { QNet } from "@/hologram/kernel/network/q-net";
import { QIpc } from "@/hologram/kernel/network/q-ipc";

// ═══════════════════════════════════════════════════════════════════════
// Phase 4a: Q-Net
// ═══════════════════════════════════════════════════════════════════════

describe("Q-Net: Fano Topology", () => {
  it("has exactly 7 routing nodes", () => {
    const net = new QNet();
    expect(net.getNodes().length).toBe(7);
  });

  it("each node has exactly 3 Fano lines", () => {
    const net = new QNet();
    for (const node of net.getNodes()) {
      expect(node.lines.length).toBe(3);
    }
  });

  it("each Fano line has exactly 3 points", () => {
    const net = new QNet();
    for (const node of net.getNodes()) {
      for (const line of node.lines) {
        expect(line.length).toBe(3);
      }
    }
  });

  it("routing table covers all 42 non-self pairs", () => {
    const net = new QNet();
    // 7 nodes × 6 destinations = 42 routes
    expect(net.getRoutingTable().length).toBe(42);
  });

  it("max hop count is 2 on Fano plane", () => {
    const net = new QNet();
    for (const route of net.getRoutingTable()) {
      expect(route.hopCount).toBeLessThanOrEqual(2);
    }
  });

  it("adjacent nodes have 1-hop routes", () => {
    const net = new QNet();
    const route = net.lookupRoute(0, 1);
    expect(route).toBeDefined();
    expect(route!.hopCount).toBe(1);
  });
});

describe("Q-Net: Sockets", () => {
  it("creates sockets with IPv6 addresses", async () => {
    const net = new QNet();
    const sock = await net.createSocket(1, 8080);
    expect(sock.ipv6).toMatch(/^fd00:0075:6f72:/);
    expect(sock.state).toBe("unbound");
  });

  it("socket lifecycle: unbound → listening → connected → closed", async () => {
    const net = new QNet();
    const sock = await net.createSocket(1, 80);

    expect(net.listen(sock.id)).toBe(true);
    expect(net.getSocket(sock.id)!.state).toBe("listening");

    expect(net.connect(sock.id, "fd00::1")).toBe(true);
    expect(net.getSocket(sock.id)!.state).toBe("connected");

    expect(net.close(sock.id)).toBe(true);
    expect(net.getSocket(sock.id)!.state).toBe("closed");
  });
});

describe("Q-Net: Envelope Send/Receive", () => {
  it("sends and receives an envelope", async () => {
    const net = new QNet();
    const payload = new TextEncoder().encode("hello agent");
    const result = await net.send("cid:sender", "cid:receiver", payload, 0.9);

    expect(result.delivered).toBe(true);
    expect(result.envelope.hScore).toBe(0.9);
    expect(result.envelope.signature).toMatch(/^dilithium3:/);

    const received = net.receive("cid:receiver");
    expect(received.length).toBe(1);
    expect(received[0].envelopeId).toBe(result.envelope.envelopeId);
  });

  it("receive empties the inbox", async () => {
    const net = new QNet();
    await net.send("a", "b", new Uint8Array([1]), 0.9);
    expect(net.receive("b").length).toBe(1);
    expect(net.receive("b").length).toBe(0);
  });

  it("CID resolution produces valid IPv6", async () => {
    const net = new QNet();
    const ipv6 = await net.resolve("urn:uor:test:123");
    expect(ipv6).toMatch(/^fd00:0075:6f72:/);
  });
});

describe("Q-Net: Firewall", () => {
  it("rejects low-coherence envelopes", async () => {
    const net = new QNet();
    net.addFirewallRule("reject", 0.5, "*", null, 10);

    const result = await net.send("bad-agent", "good-agent", new Uint8Array([0]), 0.3);
    expect(result.delivered).toBe(false);
    expect(result.reason).toContain("firewall");
  });

  it("allows high-coherence envelopes", async () => {
    const net = new QNet();
    net.addFirewallRule("reject", 0.5, "*", null, 10);

    const result = await net.send("good", "other", new Uint8Array([1]), 0.9);
    expect(result.delivered).toBe(true);
  });

  it("can remove firewall rules", () => {
    const net = new QNet();
    const rule = net.addFirewallRule("drop", 0.8);
    expect(net.getFirewallRules().length).toBe(1);
    expect(net.removeFirewallRule(rule.id)).toBe(true);
    expect(net.getFirewallRules().length).toBe(0);
  });

  it("tracks statistics", async () => {
    const net = new QNet();
    net.addFirewallRule("reject", 0.5, "*", null, 10);
    await net.send("a", "b", new Uint8Array([1]), 0.9);
    await net.send("c", "d", new Uint8Array([2]), 0.2);

    const stats = net.stats();
    expect(stats.envelopesSent).toBe(2);
    expect(stats.firewallRejections).toBe(1);
    expect(stats.envelopesDropped).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 4b: Q-IPC
// ═══════════════════════════════════════════════════════════════════════

describe("Q-IPC: Channel Management", () => {
  it("creates a channel with CID", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("test-pipe", [0, 1]);
    expect(ch.channelCid).toBeTruthy();
    expect(ch.participants).toEqual([0, 1]);
    expect(ch.messages.length).toBe(0);
  });

  it("lists channels for a PID", async () => {
    const ipc = new QIpc();
    await ipc.createChannel("ch1", [0, 1]);
    await ipc.createChannel("ch2", [1, 2]);
    expect(ipc.channelsForPid(1).length).toBe(2);
    expect(ipc.channelsForPid(0).length).toBe(1);
  });

  it("closes a channel", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("closing", [0, 1]);
    expect(ipc.closeChannel(ch.channelCid)).toBe(true);
    expect(ipc.getChannel(ch.channelCid)!.closed).toBe(true);
  });
});

describe("Q-IPC: Message Passing", () => {
  it("sends and receives messages", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("pipe", [0, 1]);

    const result = await ipc.send(ch.channelCid, 0, new TextEncoder().encode("hello"), 0.9);
    expect(result.sent).toBe(true);
    expect(result.message!.sequenceNum).toBe(0);

    const msgs = ipc.receive(ch.channelCid);
    expect(msgs.length).toBe(1);
  });

  it("builds a hash-linked chain", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("chain", [0, 1]);

    const r1 = await ipc.send(ch.channelCid, 0, new TextEncoder().encode("msg1"), 0.9);
    const r2 = await ipc.send(ch.channelCid, 1, new TextEncoder().encode("msg2"), 0.8);

    expect(r1.message!.parentCid).toBeNull();
    expect(r2.message!.parentCid).toBe(r1.message!.messageCid);
  });

  it("rejects non-participants", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("exclusive", [0, 1]);
    const result = await ipc.send(ch.channelCid, 99, new Uint8Array([0]), 0.9);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not_participant");
  });

  it("rejects low H-score (semaphore gate)", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("gated", [0, 1], 0.7);
    const result = await ipc.send(ch.channelCid, 0, new Uint8Array([1]), 0.3);
    expect(result.sent).toBe(false);
    expect(result.reason).toContain("h_score_too_low");
  });

  it("rejects sends on closed channels", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("temp", [0, 1]);
    ipc.closeChannel(ch.channelCid);
    const result = await ipc.send(ch.channelCid, 0, new Uint8Array([1]), 0.9);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("channel_closed");
  });

  it("receives since a given CID", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("history", [0, 1]);
    const r1 = await ipc.send(ch.channelCid, 0, new TextEncoder().encode("a"), 0.9);
    await ipc.send(ch.channelCid, 1, new TextEncoder().encode("b"), 0.9);
    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("c"), 0.9);

    const since = ipc.receive(ch.channelCid, r1.message!.messageCid);
    expect(since.length).toBe(2);
  });

  it("head() returns latest message", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("latest", [0, 1]);
    expect(ipc.head(ch.channelCid)).toBeNull();

    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("first"), 0.9);
    const r2 = await ipc.send(ch.channelCid, 1, new TextEncoder().encode("second"), 0.8);
    expect(ipc.head(ch.channelCid)!.messageCid).toBe(r2.message!.messageCid);
  });
});

describe("Q-IPC: Subscriptions", () => {
  it("notifies subscribers on new messages", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("events", [0, 1]);
    const received: string[] = [];

    ipc.subscribe(1, ch.channelCid, (msg) => {
      received.push(msg.messageCid);
    });

    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("hello"), 0.9);
    expect(received.length).toBe(1);
  });

  it("does not notify sender (no echo)", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("noecho", [0, 1]);
    const received: string[] = [];

    ipc.subscribe(0, ch.channelCid, (msg) => {
      received.push(msg.messageCid);
    });

    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("self"), 0.9);
    expect(received.length).toBe(0); // sender not notified
  });

  it("unsubscribes correctly", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("unsub", [0, 1]);
    const received: string[] = [];

    ipc.subscribe(1, ch.channelCid, (msg) => received.push(msg.messageCid));
    expect(ipc.unsubscribe(1, ch.channelCid)).toBe(true);

    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("after"), 0.9);
    expect(received.length).toBe(0);
  });
});

describe("Q-IPC: Chain Integrity", () => {
  it("verifies a valid chain", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("verified", [0, 1]);
    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("a"), 0.9);
    await ipc.send(ch.channelCid, 1, new TextEncoder().encode("b"), 0.8);
    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("c"), 0.9);

    const result = ipc.verifyChain(ch.channelCid);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(3);
    expect(result.breaks.length).toBe(0);
  });

  it("stats reflect chain integrity", async () => {
    const ipc = new QIpc();
    const ch = await ipc.createChannel("stats", [0, 1]);
    await ipc.send(ch.channelCid, 0, new TextEncoder().encode("x"), 0.9);

    const stats = ipc.stats();
    expect(stats.totalChannels).toBe(1);
    expect(stats.totalMessages).toBe(1);
    expect(stats.chainIntegrityVerified).toBe(true);
  });
});
