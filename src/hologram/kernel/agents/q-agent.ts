/**
 * Q-Agent — Isolated Kernel Runtime for Autonomous Agents
 * ════════════════════════════════════════════════════════
 *
 * The Q-Agent is the container/VM equivalent: each agent gets its own
 * isolated kernel instance with private MMU, syscall interface, IPC
 * channels, and session chain — orchestrated by a mesh scheduler.
 *
 *   ┌─────────────────┬───────────────────────────────────────────┐
 *   │ Linux           │ Q-Agent                                    │
 *   ├─────────────────┼───────────────────────────────────────────┤
 *   │ Container       │ Agent kernel (isolated Cayley-Dickson inst)│
 *   │ VM              │ Full Q-Kernel instance (own ring+topology) │
 *   │ Orchestrator    │ Agent mesh (PolyTree-scheduled, H-balanced)│
 *   │ Docker image    │ Dehydrated kernel CID (one hash = OS state)│
 *   │ Cgroup          │ Resource envelope (memory, CPU, H-budget)  │
 *   │ Namespace       │ Isolated MMU + FS + Net address space      │
 *   │ Health check    │ H-score feedback loop (continuous)         │
 *   │ Eviction        │ H-score decay → deprioritize → freeze      │
 *   └─────────────────┴───────────────────────────────────────────┘
 *
 * The Human-Attention Inversion:
 *   Classical AI makes humans attend to machine output.
 *   Q-Linux inverts this — agents attend to human coherence.
 *   H-score measures how well output serves human reasoning.
 *   Agents with low H-scores get deprioritized by Q-Sched.
 *
 * @module qkernel/q-agent
 */

import { toHex, encodeUtf8 } from "../../genesis/axiom-ring";
import { sha256 } from "../../genesis/axiom-hash";
import { createCid } from "../../genesis/axiom-cid";
import { canonicalEncode } from "../../genesis/axiom-codec";
import { QMmu } from "../mm/q-mmu";
import { QSched, classifyZone, type QProcess, type CoherenceZone } from "../kernel/q-sched";
import { QSyscall, type SyscallResult } from "../kernel/q-syscall";
import { QIpc, type QChannel, type QMessage } from "../ipc/q-ipc";
import { QNet } from "../net/q-net";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Agent lifecycle state */
export type AgentState =
  | "spawning"     // Being created
  | "active"       // Running, processing
  | "idle"         // Waiting for work
  | "suspended"    // Temporarily paused (low H-score)
  | "frozen"       // Dehydrated to CID
  | "terminated";  // Permanently stopped

/** Resource envelope — cgroup equivalent */
export interface ResourceEnvelope {
  readonly maxMemoryBytes: number;
  readonly maxCpuMs: number;
  readonly hScoreBudget: number;
  readonly maxChannels: number;
  readonly maxNetEnvelopes: number;
}

/** A session chain entry — the agent's immutable history */
export interface SessionEntry {
  readonly entryCid: string;
  readonly parentCid: string | null;
  readonly sequenceNum: number;
  readonly action: string;
  readonly inputCid: string | null;
  readonly outputCid: string | null;
  readonly hScore: number;
  readonly zone: CoherenceZone;
  readonly timestamp: number;
}

/** H-score feedback sample */
export interface HScoreSample {
  readonly sampleCid: string;
  readonly outputCid: string;
  readonly hScore: number;
  readonly source: "self" | "peer" | "human" | "system";
  readonly timestamp: number;
}

/** Agent snapshot — the Docker image equivalent */
export interface AgentSnapshot {
  readonly snapshotCid: string;
  readonly agentId: string;
  readonly name: string;
  readonly hScore: number;
  readonly zone: CoherenceZone;
  readonly sessionLength: number;
  readonly memoryPageCount: number;
  readonly channelCount: number;
  readonly createdAt: number;
  readonly frozenAt: number;
}

/** Agent statistics */
export interface AgentStats {
  readonly agentId: string;
  readonly name: string;
  readonly state: AgentState;
  readonly hScore: number;
  readonly zone: CoherenceZone;
  readonly sessionLength: number;
  readonly totalSyscalls: number;
  readonly totalMessages: number;
  readonly memoryPages: number;
  readonly memoryBytes: number;
  readonly uptime: number;
  readonly hScoreHistory: number[];
  readonly hScoreTrend: "rising" | "stable" | "falling";
}

/** Mesh-level statistics */
export interface MeshStats {
  readonly totalAgents: number;
  readonly activeAgents: number;
  readonly suspendedAgents: number;
  readonly frozenAgents: number;
  readonly terminatedAgents: number;
  readonly meanHScore: number;
  readonly zoneDistribution: Record<CoherenceZone, number>;
  readonly totalSyscalls: number;
  readonly totalMessages: number;
  readonly meshCoherence: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Default Resource Envelope
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_ENVELOPE: ResourceEnvelope = {
  maxMemoryBytes: 1024 * 1024,
  maxCpuMs: 100,
  hScoreBudget: 0.3,
  maxChannels: 16,
  maxNetEnvelopes: 64,
};

// ═══════════════════════════════════════════════════════════════════════
// Q-Agent — A Single Isolated Agent Instance (all sync now)
// ═══════════════════════════════════════════════════════════════════════

export class QAgent {
  readonly id: string;
  readonly name: string;
  readonly pid: number;
  readonly createdAt: number;
  readonly envelope: ResourceEnvelope;

  readonly mmu: QMmu;
  readonly syscall: QSyscall;

  private ipc: QIpc;
  private net: QNet;
  private sched: QSched;

  private _state: AgentState = "spawning";
  private _hScore: number;
  private sessionChain: SessionEntry[] = [];
  private hScoreSamples: HScoreSample[] = [];
  private channels: string[] = [];
  private syscallCount = 0;
  private messageCount = 0;
  private snapshotCid: string | null = null;
  private process: QProcess;

  constructor(
    id: string, name: string, process: QProcess,
    sched: QSched, ipc: QIpc, net: QNet,
    envelope: ResourceEnvelope = DEFAULT_ENVELOPE
  ) {
    this.id = id;
    this.name = name;
    this.pid = process.pid;
    this.createdAt = Date.now();
    this.envelope = envelope;
    this._hScore = process.hScore;
    this.process = process;
    this.mmu = new QMmu();
    this.syscall = new QSyscall(this.mmu);
    this.ipc = ipc;
    this.net = net;
    this.sched = sched;
    this._state = "active";
  }

  get state(): AgentState { return this._state; }
  get hScore(): number { return this._hScore; }
  get zone(): CoherenceZone { return classifyZone(this._hScore); }
  get sessionLength(): number { return this.sessionChain.length; }

  // ── Core Operations (now sync) ──────────────────────────────────

  think(input: unknown, action = "think"): SessionEntry {
    this.assertActive();
    const focusResult = this.syscall.focus(input, this.pid);
    this.syscallCount++;
    return this.appendSession(action, focusResult.cid, focusResult.cid);
  }

  respond(cid: string, modality: string = "compact-json"): SessionEntry {
    this.assertActive();
    const refractResult = this.syscall.refract(cid, modality as any, this.pid);
    this.syscallCount++;
    return this.appendSession("respond", cid, refractResult.cid);
  }

  communicate(
    channelCid: string, payload: Uint8Array
  ): { sent: boolean; entry?: SessionEntry; reason?: string } {
    this.assertActive();
    const result = this.ipc.send(channelCid, this.pid, payload, this._hScore);
    this.messageCount++;
    if (!result.sent) return { sent: false, reason: result.reason };
    const entry = this.appendSession("communicate", null, result.message?.messageCid ?? null);
    return { sent: true, entry };
  }

  listen(channelCid: string): QMessage[] {
    const ch = this.ipc.getChannel(channelCid);
    return ch ? ch.messages : [];
  }

  openChannel(name: string, peerPids: number[], minH = 0.0): QChannel {
    this.assertActive();
    if (this.channels.length >= this.envelope.maxChannels) {
      throw new Error(`Agent ${this.name}: channel limit reached (${this.envelope.maxChannels})`);
    }
    const ch = this.ipc.createChannel(name, [this.pid, ...peerPids], minH);
    this.channels.push(ch.channelCid);
    return ch;
  }

  // ── H-Score Feedback Loop (now sync) ────────────────────────────

  feedback(outputCid: string, hScore: number, source: HScoreSample["source"] = "human"): void {
    const sampleBytes = canonicalEncode({
      agent: this.id, output: outputCid, h: hScore, src: source, t: Date.now(),
    });
    const hash = sha256(sampleBytes);
    const sampleCid = createCid(hash).string;

    this.hScoreSamples.push({
      sampleCid, outputCid,
      hScore: Math.max(0, Math.min(1, hScore)),
      source, timestamp: Date.now(),
    });

    const alpha = source === "human" ? 0.4 : source === "peer" ? 0.2 : 0.1;
    this._hScore = this._hScore * (1 - alpha) + hScore * alpha;
    this._hScore = Math.max(0, Math.min(1, this._hScore));

    this.sched.updateHScore(this.pid, this._hScore);

    if (this._hScore < this.envelope.hScoreBudget && this._state === "active") {
      this._state = "suspended";
    }
  }

  revive(): boolean {
    if (this._state !== "suspended") return false;
    if (this._hScore >= this.envelope.hScoreBudget) {
      this._state = "active";
      this.sched.thaw(this.pid);
      return true;
    }
    return false;
  }

  // ── Lifecycle (now sync) ────────────────────────────────────────

  freeze(): AgentSnapshot {
    if (this._state === "terminated") throw new Error(`Agent ${this.name}: cannot freeze terminated agent`);

    const frozenAt = Date.now();
    const statePayload = canonicalEncode({
      id: this.id, name: this.name, pid: this.pid,
      hScore: this._hScore, sessionLength: this.sessionChain.length,
      sessionHead: this.sessionChain.length > 0 ? this.sessionChain[this.sessionChain.length - 1].entryCid : null,
      memoryPages: this.mmu.stats().uniqueCids,
      channelCount: this.channels.length, channels: this.channels,
      syscallCount: this.syscallCount, messageCount: this.messageCount,
      createdAt: this.createdAt, frozenAt,
    });
    const hash = sha256(statePayload);
    const snapshotCid = createCid(hash).string;

    this.sched.freeze(this.pid);
    this._state = "frozen";
    this.snapshotCid = snapshotCid;

    return {
      snapshotCid, agentId: this.id, name: this.name,
      hScore: this._hScore, zone: this.zone,
      sessionLength: this.sessionChain.length,
      memoryPageCount: this.mmu.stats().uniqueCids,
      channelCount: this.channels.length,
      createdAt: this.createdAt, frozenAt,
    };
  }

  thaw(): boolean {
    if (this._state !== "frozen") return false;
    this.sched.thaw(this.pid);
    this._state = "active";
    this.snapshotCid = null;
    return true;
  }

  terminate(): void {
    this.sched.kill(this.pid);
    this._state = "terminated";
    for (const cid of this.channels) this.ipc.closeChannel(cid);
  }

  // ── Introspection ───────────────────────────────────────────────

  getSessionChain(): readonly SessionEntry[] { return this.sessionChain; }
  getHScoreSamples(): readonly HScoreSample[] { return this.hScoreSamples; }

  stats(): AgentStats {
    const mmuStats = this.mmu.stats();
    const history = this.hScoreSamples.map(s => s.hScore);
    const recent = history.slice(-5);
    let trend: "rising" | "stable" | "falling" = "stable";
    if (recent.length >= 2) {
      const mid = Math.floor(recent.length / 2);
      const avg1 = recent.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const avg2 = recent.slice(mid).reduce((a, b) => a + b, 0) / (recent.length - mid);
      if (avg2 - avg1 > 0.05) trend = "rising";
      else if (avg1 - avg2 > 0.05) trend = "falling";
    }
    return {
      agentId: this.id, name: this.name, state: this._state,
      hScore: this._hScore, zone: this.zone,
      sessionLength: this.sessionChain.length,
      totalSyscalls: this.syscallCount, totalMessages: this.messageCount,
      memoryPages: mmuStats.uniqueCids, memoryBytes: mmuStats.totalBytes,
      uptime: Date.now() - this.createdAt, hScoreHistory: history, hScoreTrend: trend,
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  private assertActive(): void {
    if (this._state !== "active") throw new Error(`Agent ${this.name} is ${this._state}, cannot execute`);
  }

  private appendSession(action: string, inputCid: string | null, outputCid: string | null): SessionEntry {
    const parentCid = this.sessionChain.length > 0
      ? this.sessionChain[this.sessionChain.length - 1].entryCid
      : null;

    const seqNum = this.sessionChain.length;
    const entryBytes = canonicalEncode({
      agent: this.id, parent: parentCid, seq: seqNum,
      action, input: inputCid, output: outputCid,
      h: this._hScore, t: Date.now(),
    });
    const hash = sha256(entryBytes);
    const entryCid = createCid(hash).string;

    const entry: SessionEntry = {
      entryCid, parentCid, sequenceNum: seqNum, action,
      inputCid, outputCid, hScore: this._hScore,
      zone: this.zone, timestamp: Date.now(),
    };

    this.sessionChain.push(entry);
    return entry;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Agent Mesh — The Orchestrator (Kubernetes equivalent)
// ═══════════════════════════════════════════════════════════════════════

export class QAgentMesh {
  private agents = new Map<string, QAgent>();
  private sched: QSched;
  private ipc: QIpc;
  private net: QNet;
  private nextAgentNum = 0;

  constructor(sched: QSched, ipc: QIpc, net: QNet) {
    this.sched = sched;
    this.ipc = ipc;
    this.net = net;
  }

  spawn(name: string, hScore = 0.7, envelope: ResourceEnvelope = DEFAULT_ENVELOPE, parentPid = 0): QAgent {
    const agentId = `agent-${this.nextAgentNum++}-${name}`;
    const proc = this.sched.fork(parentPid, name, hScore);
    const agent = new QAgent(agentId, name, proc, this.sched, this.ipc, this.net, envelope);
    this.agents.set(agentId, agent);
    return agent;
  }

  despawn(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.terminate();
    this.agents.delete(agentId);
    return true;
  }

  getAgent(agentId: string): QAgent | undefined { return this.agents.get(agentId); }
  allAgents(): QAgent[] { return Array.from(this.agents.values()); }
  agentsByZone(zone: CoherenceZone): QAgent[] { return this.allAgents().filter(a => a.zone === zone); }
  agentsByCoherence(): QAgent[] {
    return this.allAgents().filter(a => a.state === "active" || a.state === "idle").sort((a, b) => b.hScore - a.hScore);
  }

  tick(): { scheduled: QAgent | null; suspended: string[]; frozen: string[] } {
    const suspended: string[] = [];
    const frozen: string[] = [];
    for (const agent of this.agents.values()) {
      if (agent.state === "active" && agent.hScore < 0.3) suspended.push(agent.id);
      if (agent.state === "suspended" && agent.hScore < 0.15) frozen.push(agent.id);
    }
    const next = this.sched.schedule();
    let scheduledAgent: QAgent | null = null;
    if (next) scheduledAgent = this.allAgents().find(a => a.pid === next.pid) ?? null;
    return { scheduled: scheduledAgent, suspended, frozen };
  }

  connect(agentA: QAgent, agentB: QAgent, minH = 0.0): QChannel {
    return agentA.openChannel(`${agentA.name}↔${agentB.name}`, [agentB.pid], minH);
  }

  broadcast(senderAgent: QAgent, payload: Uint8Array): { delivered: number; rejected: number } {
    let delivered = 0;
    let rejected = 0;
    for (const agent of this.agents.values()) {
      if (agent.id === senderAgent.id || agent.state !== "active") continue;
      const result = this.net.send(senderAgent.id, agent.id, payload, senderAgent.hScore);
      if (result.delivered) delivered++; else rejected++;
    }
    return { delivered, rejected };
  }

  stats(): MeshStats {
    const agents = this.allAgents();
    const zones: Record<CoherenceZone, number> = { convergent: 0, exploring: 0, divergent: 0 };
    let totalSyscalls = 0, totalMessages = 0, hSum = 0;
    let activeCount = 0, suspendedCount = 0, frozenCount = 0, terminatedCount = 0;
    for (const a of agents) {
      const s = a.stats();
      zones[a.zone]++;
      totalSyscalls += s.totalSyscalls;
      totalMessages += s.totalMessages;
      if (a.state === "active" || a.state === "idle") { hSum += a.hScore; activeCount++; }
      if (a.state === "suspended") suspendedCount++;
      if (a.state === "frozen") frozenCount++;
      if (a.state === "terminated") terminatedCount++;
    }
    return {
      totalAgents: agents.length, activeAgents: activeCount,
      suspendedAgents: suspendedCount, frozenAgents: frozenCount,
      terminatedAgents: terminatedCount,
      meanHScore: activeCount > 0 ? hSum / activeCount : 0,
      zoneDistribution: zones, totalSyscalls, totalMessages,
      meshCoherence: activeCount > 0 ? hSum / activeCount : 0,
    };
  }
}
