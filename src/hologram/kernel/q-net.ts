/**
 * Q-Net — Fano-Topology Network Stack
 * ═════════════════════════════════════
 *
 * Every Linux networking concept maps to a content-addressed equivalent.
 * The Fano plane PG(2,2) defines the routing topology: 7 points,
 * 7 lines, 3 points per line, 3 lines per point.
 *
 * @module qkernel/q-net
 */

import { toHex, encodeUtf8 } from "@/hologram/genesis/axiom-ring";
import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { canonicalEncode } from "@/hologram/genesis/axiom-codec";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface QSocket {
  readonly id: number;
  readonly ipv6: string;
  readonly ownerPid: number;
  readonly port: number;
  readonly state: SocketState;
  readonly protocol: QProtocol;
  readonly createdAt: number;
  readonly boundTo: string | null;
}

export type SocketState = "unbound" | "listening" | "connected" | "closed";
export type QProtocol = "coherence" | "stream" | "datagram";

export interface QEnvelope {
  readonly envelopeId: string;
  readonly sourceCid: string;
  readonly destCid: string;
  readonly sourceIpv6: string;
  readonly destIpv6: string;
  readonly payload: Uint8Array;
  readonly hScore: number;
  readonly signature: string;
  readonly hopCount: number;
  readonly maxHops: number;
  readonly createdAt: number;
  readonly ttl: number;
}

export interface FanoNode {
  readonly index: number;
  readonly ipv6Prefix: string;
  readonly neighbors: number[];
  readonly lines: number[][];
  readonly load: number;
}

export interface QRoute {
  readonly dest: number;
  readonly nextHop: number;
  readonly hopCount: number;
  readonly lineId: number;
}

export interface FirewallRule {
  readonly id: number;
  readonly action: "allow" | "reject" | "drop";
  readonly minHScore: number;
  readonly sourcePattern: string;
  readonly destPort: number | null;
  readonly priority: number;
}

export interface NetStats {
  readonly totalSockets: number;
  readonly activeSockets: number;
  readonly envelopesSent: number;
  readonly envelopesReceived: number;
  readonly envelopesDropped: number;
  readonly firewallRejections: number;
  readonly totalHops: number;
  readonly meanHopCount: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Fano Plane Topology
// ═══════════════════════════════════════════════════════════════════════

const FANO_LINES: readonly [number, number, number][] = [
  [0, 1, 3], [1, 2, 4], [2, 3, 5], [3, 4, 6],
  [4, 5, 0], [5, 6, 1], [6, 0, 2],
];

function fanoPrefix(index: number): string {
  return `fd00:0075:6f72:000${index}::/64`;
}

function fanoNeighbors(index: number): number[] {
  const nbrs = new Set<number>();
  for (const line of FANO_LINES) {
    if (line.includes(index)) {
      for (const p of line) { if (p !== index) nbrs.add(p); }
    }
  }
  return Array.from(nbrs).sort();
}

function fanoLinesForPoint(index: number): number[][] {
  return FANO_LINES.filter(line => line.includes(index)).map(line => [...line]);
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Net Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QNet {
  private nodes: FanoNode[] = [];
  private routingTable: QRoute[] = [];
  private sockets = new Map<number, QSocket>();
  private nextSocketId = 1;
  private firewallRules: FirewallRule[] = [];
  private nextRuleId = 1;

  private envelopesSent = 0;
  private envelopesReceived = 0;
  private envelopesDropped = 0;
  private firewallRejections = 0;
  private totalHops = 0;
  private deliveredCount = 0;

  private inbox = new Map<string, QEnvelope[]>();

  constructor() {
    this.buildTopology();
    this.computeRoutes();
  }

  private buildTopology(): void {
    for (let i = 0; i < 7; i++) {
      this.nodes.push({
        index: i,
        ipv6Prefix: fanoPrefix(i),
        neighbors: fanoNeighbors(i),
        lines: fanoLinesForPoint(i),
        load: 0,
      });
    }
  }

  private computeRoutes(): void {
    for (let src = 0; src < 7; src++) {
      for (let dst = 0; dst < 7; dst++) {
        if (src === dst) continue;
        const route = this.fanoShortestPath(src, dst);
        if (route) this.routingTable.push(route);
      }
    }
  }

  private fanoShortestPath(src: number, dst: number): QRoute | null {
    for (let i = 0; i < FANO_LINES.length; i++) {
      const line = FANO_LINES[i];
      if (line.includes(src) && line.includes(dst)) {
        return { dest: dst, nextHop: dst, hopCount: 1, lineId: i };
      }
    }
    const srcNbrs = fanoNeighbors(src);
    const dstNbrs = fanoNeighbors(dst);
    for (const mid of srcNbrs) {
      if (dstNbrs.includes(mid)) {
        const lineId = FANO_LINES.findIndex(l => l.includes(src) && l.includes(mid));
        return { dest: dst, nextHop: mid, hopCount: 2, lineId };
      }
    }
    return null;
  }

  // ── Socket API ──────────────────────────────────────────────────

  createSocket(ownerPid: number, port: number, protocol: QProtocol = "coherence"): QSocket {
    const pidBytes = encodeUtf8(`pid:${ownerPid}:${Date.now()}`);
    const hash = sha256(pidBytes);
    const hex = toHex(hash);
    const ipv6 = `fd00:0075:6f72:${hex.slice(0,4)}:${hex.slice(4,8)}:${hex.slice(8,12)}:${hex.slice(12,16)}:${hex.slice(16,20)}`;

    const sock: QSocket = {
      id: this.nextSocketId++, ipv6, ownerPid, port,
      state: "unbound", protocol, createdAt: Date.now(), boundTo: null,
    };
    this.sockets.set(sock.id, sock);
    return sock;
  }

  listen(socketId: number): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock || sock.state !== "unbound") return false;
    this.sockets.set(socketId, { ...sock, state: "listening" });
    return true;
  }

  connect(socketId: number, peerIpv6: string): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock || sock.state === "closed") return false;
    this.sockets.set(socketId, { ...sock, state: "connected", boundTo: peerIpv6 });
    return true;
  }

  close(socketId: number): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock) return false;
    this.sockets.set(socketId, { ...sock, state: "closed" });
    return true;
  }

  getSocket(id: number): QSocket | undefined { return this.sockets.get(id); }

  // ── Envelope Send/Receive ───────────────────────────────────────

  send(
    sourceCid: string, destCid: string, payload: Uint8Array,
    hScore: number, sourceNode = 0, destNode = 1
  ): { delivered: boolean; envelope: QEnvelope; reason?: string } {
    const envBytes = canonicalEncode({ src: sourceCid, dst: destCid, t: Date.now(), h: hScore });
    const envHash = sha256(envBytes);
    const envCidStr = createCid(envHash).string;

    const srcHex = toHex(envHash);
    const sourceIpv6 = `fd00:0075:6f72:${srcHex.slice(0,4)}::1`;
    const dstHash = sha256(encodeUtf8(destCid));
    const dstHex = toHex(dstHash);
    const destIpv6 = `fd00:0075:6f72:${dstHex.slice(0,4)}::1`;

    const route = this.routingTable.find(
      r => r.dest === destNode && this.nodes[sourceNode]?.neighbors.includes(r.nextHop)
    ) ?? this.routingTable.find(r => r.dest === destNode);

    const hopCount = route?.hopCount ?? 1;

    const envelope: QEnvelope = {
      envelopeId: envCidStr, sourceCid, destCid, sourceIpv6, destIpv6,
      payload, hScore, signature: `dilithium3:${srcHex.slice(0, 32)}`,
      hopCount, maxHops: 3, createdAt: Date.now(), ttl: 64,
    };

    this.envelopesSent++;

    const firewallResult = this.checkFirewall(envelope);
    if (firewallResult === "reject" || firewallResult === "drop") {
      this.firewallRejections++;
      this.envelopesDropped++;
      return { delivered: false, envelope, reason: `firewall:${firewallResult}` };
    }

    this.totalHops += hopCount;
    this.deliveredCount++;
    this.envelopesReceived++;

    const queue = this.inbox.get(destCid) ?? [];
    queue.push(envelope);
    this.inbox.set(destCid, queue);

    return { delivered: true, envelope };
  }

  receive(destCid: string): QEnvelope[] {
    const queue = this.inbox.get(destCid) ?? [];
    this.inbox.set(destCid, []);
    return queue;
  }

  // ── Firewall ────────────────────────────────────────────────────

  addFirewallRule(
    action: "allow" | "reject" | "drop", minHScore: number,
    sourcePattern = "*", destPort: number | null = null, priority = 0
  ): FirewallRule {
    const rule: FirewallRule = { id: this.nextRuleId++, action, minHScore, sourcePattern, destPort, priority };
    this.firewallRules.push(rule);
    this.firewallRules.sort((a, b) => b.priority - a.priority);
    return rule;
  }

  removeFirewallRule(ruleId: number): boolean {
    const idx = this.firewallRules.findIndex(r => r.id === ruleId);
    if (idx < 0) return false;
    this.firewallRules.splice(idx, 1);
    return true;
  }

  private checkFirewall(envelope: QEnvelope): "allow" | "reject" | "drop" {
    for (const rule of this.firewallRules) {
      if (rule.sourcePattern !== "*" && !envelope.sourceCid.startsWith(rule.sourcePattern)) continue;
      if (envelope.hScore < rule.minHScore) return rule.action;
    }
    return "allow";
  }

  getFirewallRules(): readonly FirewallRule[] { return this.firewallRules; }

  // ── Topology Introspection ──────────────────────────────────────

  getNodes(): readonly FanoNode[] { return this.nodes; }
  getNode(index: number): FanoNode | undefined { return this.nodes[index]; }
  getRoutingTable(): readonly QRoute[] { return this.routingTable; }

  lookupRoute(src: number, dst: number): QRoute | null {
    if (src === dst) return null;
    return this.routingTable.find(r => {
      const srcNeighbors = this.nodes[src]?.neighbors ?? [];
      return r.dest === dst && (r.nextHop === dst || srcNeighbors.includes(r.nextHop));
    }) ?? null;
  }

  // ── CID → IPv6 Resolution ──────────────────────────────────────

  resolve(cid: string): string {
    const hash = sha256(encodeUtf8(cid));
    const hex = toHex(hash);
    return `fd00:0075:6f72:${hex.slice(0,4)}:${hex.slice(4,8)}:${hex.slice(8,12)}:${hex.slice(12,16)}:${hex.slice(16,20)}`;
  }

  // ── Statistics ──────────────────────────────────────────────────

  stats(): NetStats {
    const activeSockets = Array.from(this.sockets.values()).filter(s => s.state !== "closed").length;
    return {
      totalSockets: this.sockets.size, activeSockets,
      envelopesSent: this.envelopesSent, envelopesReceived: this.envelopesReceived,
      envelopesDropped: this.envelopesDropped, firewallRejections: this.firewallRejections,
      totalHops: this.totalHops,
      meanHopCount: this.deliveredCount > 0 ? this.totalHops / this.deliveredCount : 0,
    };
  }
}
