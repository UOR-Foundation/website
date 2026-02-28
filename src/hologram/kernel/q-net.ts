/**
 * Q-Net — Fano-Topology Network Stack
 * ═════════════════════════════════════
 *
 * Every Linux networking concept maps to a content-addressed equivalent:
 *
 *   ┌───────────────┬─────────────────────────────────────────────┐
 *   │ Linux         │ Q-Net                                        │
 *   ├───────────────┼─────────────────────────────────────────────┤
 *   │ Socket        │ UOR IPv6 endpoint (CID-derived address)      │
 *   │ Protocol      │ Coherence-verified message passing            │
 *   │ DNS           │ WebFinger → CID → IPv6 projection             │
 *   │ Packet        │ UOR envelope (content + sig + H-score)        │
 *   │ Routing       │ Fano topology (7-line shortest path)          │
 *   │ Firewall      │ Coherence gate (reject if H < threshold)     │
 *   │ ARP           │ CID → IPv6 address resolution                 │
 *   │ Interface     │ Fano vertex (one of 7 routing nodes)          │
 *   └───────────────┴─────────────────────────────────────────────┘
 *
 * The Fano plane PG(2,2) defines the routing topology: 7 points,
 * 7 lines, 3 points per line, 3 lines per point. The shortest path
 * between any two non-adjacent points traverses exactly one intermediate.
 *
 * @module qkernel/q-net
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A UOR network socket — IPv6 endpoint derived from CID */
export interface QSocket {
  readonly id: number;
  readonly ipv6: string;            // derived from owner CID
  readonly ownerPid: number;
  readonly port: number;            // logical port
  readonly state: SocketState;
  readonly protocol: QProtocol;
  readonly createdAt: number;
  readonly boundTo: string | null;  // peer IPv6 if connected
}

export type SocketState = "unbound" | "listening" | "connected" | "closed";
export type QProtocol = "coherence" | "stream" | "datagram";

/** A UOR network envelope — the packet type */
export interface QEnvelope {
  readonly envelopeId: string;       // CID of the envelope
  readonly sourceCid: string;        // sender CID
  readonly destCid: string;          // receiver CID
  readonly sourceIpv6: string;
  readonly destIpv6: string;
  readonly payload: Uint8Array;
  readonly hScore: number;           // sender's coherence score
  readonly signature: string;        // Dilithium-3 placeholder
  readonly hopCount: number;
  readonly maxHops: number;
  readonly createdAt: number;
  readonly ttl: number;
}

/** A Fano routing node (one of 7) */
export interface FanoNode {
  readonly index: number;            // 0–6
  readonly ipv6Prefix: string;       // /64 prefix
  readonly neighbors: number[];      // adjacent nodes (on Fano lines)
  readonly lines: number[][];        // the Fano lines this node belongs to
  readonly load: number;             // current traffic load
}

/** Route entry in the Fano routing table */
export interface QRoute {
  readonly dest: number;             // destination Fano node
  readonly nextHop: number;          // next Fano node toward dest
  readonly hopCount: number;
  readonly lineId: number;           // which Fano line this route uses
}

/** Firewall rule */
export interface FirewallRule {
  readonly id: number;
  readonly action: "allow" | "reject" | "drop";
  readonly minHScore: number;        // coherence threshold
  readonly sourcePattern: string;    // CID prefix pattern ("*" = any)
  readonly destPort: number | null;  // null = any port
  readonly priority: number;
}

/** Network statistics */
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
// Fano Plane Topology (7 points, 7 lines)
// ═══════════════════════════════════════════════════════════════════════

/** The 7 lines of the Fano plane PG(2,2) */
const FANO_LINES: readonly [number, number, number][] = [
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
];

/** Derive the UOR /64 prefix for a Fano node */
function fanoPrefix(index: number): string {
  return `fd00:0075:6f72:000${index}::/64`;
}

/** Build adjacency from Fano lines */
function fanoNeighbors(index: number): number[] {
  const nbrs = new Set<number>();
  for (const line of FANO_LINES) {
    if (line.includes(index)) {
      for (const p of line) {
        if (p !== index) nbrs.add(p);
      }
    }
  }
  return Array.from(nbrs).sort();
}

/** Get all Fano lines containing a given point */
function fanoLinesForPoint(index: number): number[][] {
  return FANO_LINES
    .filter(line => line.includes(index))
    .map(line => [...line]);
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

  // stats
  private envelopesSent = 0;
  private envelopesReceived = 0;
  private envelopesDropped = 0;
  private firewallRejections = 0;
  private totalHops = 0;
  private deliveredCount = 0;

  /** Delivery inbox: destCid → envelope queue */
  private inbox = new Map<string, QEnvelope[]>();

  constructor() {
    this.buildTopology();
    this.computeRoutes();
  }

  // ── Topology ────────────────────────────────────────────────────

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

  /** Compute full routing table using Fano shortest paths */
  private computeRoutes(): void {
    for (let src = 0; src < 7; src++) {
      for (let dst = 0; dst < 7; dst++) {
        if (src === dst) continue;
        const route = this.fanoShortestPath(src, dst);
        if (route) this.routingTable.push(route);
      }
    }
  }

  /** Find shortest path on Fano plane. Max 2 hops between any pair. */
  private fanoShortestPath(src: number, dst: number): QRoute | null {
    // Check direct adjacency (same Fano line)
    for (let i = 0; i < FANO_LINES.length; i++) {
      const line = FANO_LINES[i];
      if (line.includes(src) && line.includes(dst)) {
        return { dest: dst, nextHop: dst, hopCount: 1, lineId: i };
      }
    }

    // Two-hop: find intermediate node on intersecting lines
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

  /** Create a socket (like socket()) */
  async createSocket(
    ownerPid: number,
    port: number,
    protocol: QProtocol = "coherence"
  ): Promise<QSocket> {
    // Derive IPv6 from PID
    const pidBytes = new TextEncoder().encode(`pid:${ownerPid}:${Date.now()}`);
    const hash = await sha256(pidBytes);
    const hex = bytesToHex(hash);
    const ipv6 = `fd00:0075:6f72:${hex.slice(0,4)}:${hex.slice(4,8)}:${hex.slice(8,12)}:${hex.slice(12,16)}:${hex.slice(16,20)}`;

    const sock: QSocket = {
      id: this.nextSocketId++,
      ipv6,
      ownerPid,
      port,
      state: "unbound",
      protocol,
      createdAt: Date.now(),
      boundTo: null,
    };

    this.sockets.set(sock.id, sock);
    return sock;
  }

  /** Bind a socket to listen (like listen()) */
  listen(socketId: number): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock || sock.state !== "unbound") return false;
    this.sockets.set(socketId, { ...sock, state: "listening" });
    return true;
  }

  /** Connect to a peer (like connect()) */
  connect(socketId: number, peerIpv6: string): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock || sock.state === "closed") return false;
    this.sockets.set(socketId, { ...sock, state: "connected", boundTo: peerIpv6 });
    return true;
  }

  /** Close a socket */
  close(socketId: number): boolean {
    const sock = this.sockets.get(socketId);
    if (!sock) return false;
    this.sockets.set(socketId, { ...sock, state: "closed" });
    return true;
  }

  /** Get a socket by ID */
  getSocket(id: number): QSocket | undefined {
    return this.sockets.get(id);
  }

  // ── Envelope Send/Receive ───────────────────────────────────────

  /**
   * Send an envelope (like sendto()).
   * Routes through Fano topology and applies firewall rules.
   */
  async send(
    sourceCid: string,
    destCid: string,
    payload: Uint8Array,
    hScore: number,
    sourceNode = 0,
    destNode = 1
  ): Promise<{ delivered: boolean; envelope: QEnvelope; reason?: string }> {
    // Build envelope
    const envBytes = new TextEncoder().encode(
      JSON.stringify({ src: sourceCid, dst: destCid, t: Date.now(), h: hScore })
    );
    const envHash = await sha256(envBytes);
    const envCid = await computeCid(envHash);

    const srcHex = bytesToHex(envHash);
    const sourceIpv6 = `fd00:0075:6f72:${srcHex.slice(0,4)}::1`;
    const dstBytes = new TextEncoder().encode(destCid);
    const dstHash = await sha256(dstBytes);
    const dstHex = bytesToHex(dstHash);
    const destIpv6 = `fd00:0075:6f72:${dstHex.slice(0,4)}::1`;

    // Route lookup
    const route = this.routingTable.find(
      r => r.dest === destNode && this.nodes[sourceNode]?.neighbors.includes(r.nextHop)
    ) ?? this.routingTable.find(r => r.dest === destNode);

    const hopCount = route?.hopCount ?? 1;

    const envelope: QEnvelope = {
      envelopeId: envCid,
      sourceCid,
      destCid,
      sourceIpv6,
      destIpv6,
      payload,
      hScore,
      signature: `dilithium3:${srcHex.slice(0, 32)}`,
      hopCount,
      maxHops: 3,
      createdAt: Date.now(),
      ttl: 64,
    };

    this.envelopesSent++;

    // Firewall check
    const firewallResult = this.checkFirewall(envelope);
    if (firewallResult === "reject" || firewallResult === "drop") {
      this.firewallRejections++;
      this.envelopesDropped++;
      return { delivered: false, envelope, reason: `firewall:${firewallResult}` };
    }

    // Deliver
    this.totalHops += hopCount;
    this.deliveredCount++;
    this.envelopesReceived++;

    const queue = this.inbox.get(destCid) ?? [];
    queue.push(envelope);
    this.inbox.set(destCid, queue);

    return { delivered: true, envelope };
  }

  /**
   * Receive envelopes (like recvfrom()).
   * Returns all queued envelopes for the given CID.
   */
  receive(destCid: string): QEnvelope[] {
    const queue = this.inbox.get(destCid) ?? [];
    this.inbox.set(destCid, []);
    return queue;
  }

  // ── Firewall ────────────────────────────────────────────────────

  /** Add a firewall rule */
  addFirewallRule(
    action: "allow" | "reject" | "drop",
    minHScore: number,
    sourcePattern = "*",
    destPort: number | null = null,
    priority = 0
  ): FirewallRule {
    const rule: FirewallRule = {
      id: this.nextRuleId++,
      action,
      minHScore,
      sourcePattern,
      destPort,
      priority,
    };
    this.firewallRules.push(rule);
    // Sort by priority (higher = checked first)
    this.firewallRules.sort((a, b) => b.priority - a.priority);
    return rule;
  }

  /** Remove a firewall rule */
  removeFirewallRule(ruleId: number): boolean {
    const idx = this.firewallRules.findIndex(r => r.id === ruleId);
    if (idx < 0) return false;
    this.firewallRules.splice(idx, 1);
    return true;
  }

  /** Check envelope against firewall rules */
  private checkFirewall(envelope: QEnvelope): "allow" | "reject" | "drop" {
    for (const rule of this.firewallRules) {
      // Pattern match
      if (rule.sourcePattern !== "*" && !envelope.sourceCid.startsWith(rule.sourcePattern)) {
        continue;
      }

      // H-score coherence gate
      if (envelope.hScore < rule.minHScore) {
        return rule.action;
      }
    }
    return "allow"; // default: allow
  }

  /** Get all firewall rules */
  getFirewallRules(): readonly FirewallRule[] {
    return this.firewallRules;
  }

  // ── Topology Introspection ──────────────────────────────────────

  /** Get all Fano routing nodes */
  getNodes(): readonly FanoNode[] {
    return this.nodes;
  }

  /** Get a specific node */
  getNode(index: number): FanoNode | undefined {
    return this.nodes[index];
  }

  /** Get the full routing table */
  getRoutingTable(): readonly QRoute[] {
    return this.routingTable;
  }

  /** Look up the route between two Fano nodes */
  lookupRoute(src: number, dst: number): QRoute | null {
    if (src === dst) return null;
    return this.routingTable.find(r => {
      // Find a route from src to dst
      const srcNeighbors = this.nodes[src]?.neighbors ?? [];
      return r.dest === dst && (r.nextHop === dst || srcNeighbors.includes(r.nextHop));
    }) ?? null;
  }

  // ── CID → IPv6 Resolution (ARP equivalent) ─────────────────────

  /** Resolve a CID to an IPv6 address */
  async resolve(cid: string): Promise<string> {
    const cidBytes = new TextEncoder().encode(cid);
    const hash = await sha256(cidBytes);
    const hex = bytesToHex(hash);
    return `fd00:0075:6f72:${hex.slice(0,4)}:${hex.slice(4,8)}:${hex.slice(8,12)}:${hex.slice(12,16)}:${hex.slice(16,20)}`;
  }

  // ── Statistics ──────────────────────────────────────────────────

  stats(): NetStats {
    const activeSockets = Array.from(this.sockets.values())
      .filter(s => s.state !== "closed").length;

    return {
      totalSockets: this.sockets.size,
      activeSockets,
      envelopesSent: this.envelopesSent,
      envelopesReceived: this.envelopesReceived,
      envelopesDropped: this.envelopesDropped,
      firewallRejections: this.firewallRejections,
      totalHops: this.totalHops,
      meanHopCount: this.deliveredCount > 0 ? this.totalHops / this.deliveredCount : 0,
    };
  }
}
