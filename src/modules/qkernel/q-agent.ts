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

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import { QMmu } from "./q-mmu";
import { QSched, classifyZone, type QProcess, type CoherenceZone } from "./q-sched";
import { QSyscall, type SyscallResult } from "./q-syscall";
import { QIpc, type QChannel, type QMessage } from "./q-ipc";
import { QNet } from "./q-net";

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
  readonly maxMemoryBytes: number;    // MMU page limit
  readonly maxCpuMs: number;          // Simulated CPU budget per tick
  readonly hScoreBudget: number;      // Min H-score before suspension
  readonly maxChannels: number;       // IPC channel limit
  readonly maxNetEnvelopes: number;   // Network send limit per tick
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

/** H-score feedback sample — measures output quality */
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
  readonly meshCoherence: number;  // aggregate coherence metric
}

// ═══════════════════════════════════════════════════════════════════════
// Default Resource Envelope
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_ENVELOPE: ResourceEnvelope = {
  maxMemoryBytes: 1024 * 1024,  // 1MB
  maxCpuMs: 100,                // 100ms per tick
  hScoreBudget: 0.3,            // Suspend below 0.3
  maxChannels: 16,
  maxNetEnvelopes: 64,
};

// ═══════════════════════════════════════════════════════════════════════
// Q-Agent — A Single Isolated Agent Instance
// ═══════════════════════════════════════════════════════════════════════

export class QAgent {
  readonly id: string;
  readonly name: string;
  readonly pid: number;
  readonly createdAt: number;
  readonly envelope: ResourceEnvelope;

  // Isolated kernel components (namespace isolation)
  readonly mmu: QMmu;
  readonly syscall: QSyscall;

  // Shared infrastructure (mesh-level)
  private ipc: QIpc;
  private net: QNet;
  private sched: QSched;

  // Agent-private state
  private _state: AgentState = "spawning";
  private _hScore: number;
  private sessionChain: SessionEntry[] = [];
  private hScoreSamples: HScoreSample[] = [];
  private channels: string[] = [];         // channel CIDs
  private syscallCount = 0;
  private messageCount = 0;
  private snapshotCid: string | null = null;
  private process: QProcess;

  constructor(
    id: string,
    name: string,
    process: QProcess,
    sched: QSched,
    ipc: QIpc,
    net: QNet,
    envelope: ResourceEnvelope = DEFAULT_ENVELOPE
  ) {
    this.id = id;
    this.name = name;
    this.pid = process.pid;
    this.createdAt = Date.now();
    this.envelope = envelope;
    this._hScore = process.hScore;
    this.process = process;

    // Isolated subsystems (own namespace)
    this.mmu = new QMmu();
    this.syscall = new QSyscall(this.mmu);

    // Shared infrastructure
    this.ipc = ipc;
    this.net = net;
    this.sched = sched;

    this._state = "active";
  }

  // ── Properties ──────────────────────────────────────────────────

  get state(): AgentState { return this._state; }
  get hScore(): number { return this._hScore; }
  get zone(): CoherenceZone { return classifyZone(this._hScore); }
  get sessionLength(): number { return this.sessionChain.length; }

  // ── Core Operations ─────────────────────────────────────────────

  /**
   * think — Execute a reasoning step.
   * The agent focuses on input, processes it via syscall, and
   * records the result in its session chain.
   */
  async think(input: unknown, action = "think"): Promise<SessionEntry> {
    this.assertActive();

    // Focus the input into canonical form
    const focusResult = await this.syscall.focus(input, this.pid);
    this.syscallCount++;

    // Record in session chain
    const entry = await this.appendSession(
      action,
      focusResult.cid,
      focusResult.cid,
    );

    return entry;
  }

  /**
   * respond — Generate output in a target modality.
   * Refracts a CID into a specific representation.
   */
  async respond(cid: string, modality: string = "compact-json"): Promise<SessionEntry> {
    this.assertActive();

    const refractResult = await this.syscall.refract(cid, modality as any, this.pid);
    this.syscallCount++;

    const outputCid = refractResult.cid;
    return this.appendSession("respond", cid, outputCid);
  }

  /**
   * communicate — Send a message to another agent via IPC.
   */
  async communicate(
    channelCid: string,
    payload: Uint8Array
  ): Promise<{ sent: boolean; entry?: SessionEntry; reason?: string }> {
    this.assertActive();

    const result = await this.ipc.send(channelCid, this.pid, payload, this._hScore);
    this.messageCount++;

    if (!result.sent) {
      return { sent: false, reason: result.reason };
    }

    const entry = await this.appendSession(
      "communicate",
      null,
      result.message?.messageCid ?? null,
    );

    return { sent: true, entry };
  }

  /**
   * listen — Read messages from a channel.
   */
  listen(channelCid: string): QMessage[] {
    const ch = this.ipc.getChannel(channelCid);
    if (!ch) return [];
    return ch.messages;
  }

  /**
   * openChannel — Create or join an IPC channel with another agent.
   */
  async openChannel(name: string, peerPids: number[], minH = 0.0): Promise<QChannel> {
    this.assertActive();

    if (this.channels.length >= this.envelope.maxChannels) {
      throw new Error(`Agent ${this.name}: channel limit reached (${this.envelope.maxChannels})`);
    }

    const ch = await this.ipc.createChannel(
      name,
      [this.pid, ...peerPids],
      minH
    );
    this.channels.push(ch.channelCid);
    return ch;
  }

  // ── H-Score Feedback Loop ───────────────────────────────────────

  /**
   * feedback — Submit an H-score sample for this agent's output.
   * This is the human-attention inversion: quality scores flow back
   * to adjust scheduling priority.
   */
  async feedback(
    outputCid: string,
    hScore: number,
    source: HScoreSample["source"] = "human"
  ): Promise<void> {
    const sampleBytes = new TextEncoder().encode(
      JSON.stringify({ agent: this.id, output: outputCid, h: hScore, src: source, t: Date.now() })
    );
    const hash = await sha256(sampleBytes);
    const sampleCid = await computeCid(hash);

    this.hScoreSamples.push({
      sampleCid,
      outputCid,
      hScore: Math.max(0, Math.min(1, hScore)),
      source,
      timestamp: Date.now(),
    });

    // Update running H-score (exponential moving average)
    const alpha = source === "human" ? 0.4 : source === "peer" ? 0.2 : 0.1;
    this._hScore = this._hScore * (1 - alpha) + hScore * alpha;
    this._hScore = Math.max(0, Math.min(1, this._hScore));

    // Propagate to scheduler
    this.sched.updateHScore(this.pid, this._hScore);

    // Check suspension threshold
    if (this._hScore < this.envelope.hScoreBudget && this._state === "active") {
      this._state = "suspended";
    }
  }

  /**
   * revive — Re-activate a suspended agent (after H-score recovery).
   */
  revive(): boolean {
    if (this._state !== "suspended") return false;
    if (this._hScore >= this.envelope.hScoreBudget) {
      this._state = "active";
      this.sched.thaw(this.pid);
      return true;
    }
    return false;
  }

  // ── Lifecycle Management ────────────────────────────────────────

  /**
   * freeze — Dehydrate the entire agent to a single CID.
   * This is the Docker image equivalent: one hash = entire agent state.
   */
  async freeze(): Promise<AgentSnapshot> {
    if (this._state === "terminated") {
      throw new Error(`Agent ${this.name}: cannot freeze terminated agent`);
    }

    const frozenAt = Date.now();
    const statePayload = {
      id: this.id,
      name: this.name,
      pid: this.pid,
      hScore: this._hScore,
      sessionLength: this.sessionChain.length,
      sessionHead: this.sessionChain.length > 0
        ? this.sessionChain[this.sessionChain.length - 1].entryCid
        : null,
      memoryPages: this.mmu.stats().uniqueCids,
      channelCount: this.channels.length,
      channels: this.channels,
      syscallCount: this.syscallCount,
      messageCount: this.messageCount,
      createdAt: this.createdAt,
      frozenAt,
    };

    const stateBytes = new TextEncoder().encode(JSON.stringify(statePayload));
    const hash = await sha256(stateBytes);
    const snapshotCid = await computeCid(hash);

    // Freeze in scheduler
    await this.sched.freeze(this.pid);

    this._state = "frozen";
    this.snapshotCid = snapshotCid;

    return {
      snapshotCid,
      agentId: this.id,
      name: this.name,
      hScore: this._hScore,
      zone: this.zone,
      sessionLength: this.sessionChain.length,
      memoryPageCount: this.mmu.stats().uniqueCids,
      channelCount: this.channels.length,
      createdAt: this.createdAt,
      frozenAt,
    };
  }

  /**
   * thaw — Rehydrate a frozen agent back to active.
   */
  thaw(): boolean {
    if (this._state !== "frozen") return false;
    this.sched.thaw(this.pid);
    this._state = "active";
    this.snapshotCid = null;
    return true;
  }

  /**
   * terminate — Permanently stop the agent.
   */
  terminate(): void {
    this.sched.kill(this.pid);
    this._state = "terminated";

    // Close all channels
    for (const cid of this.channels) {
      this.ipc.closeChannel(cid);
    }
  }

  // ── Introspection ───────────────────────────────────────────────

  /** Get the full session chain */
  getSessionChain(): readonly SessionEntry[] {
    return this.sessionChain;
  }

  /** Get H-score samples */
  getHScoreSamples(): readonly HScoreSample[] {
    return this.hScoreSamples;
  }

  /** Get agent statistics */
  stats(): AgentStats {
    const mmuStats = this.mmu.stats();
    const history = this.hScoreSamples.map(s => s.hScore);
    const recent = history.slice(-5);

    let trend: "rising" | "stable" | "falling" = "stable";
    if (recent.length >= 2) {
      const avg1 = recent.slice(0, Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(recent.length / 2);
      const avg2 = recent.slice(Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / (recent.length - Math.floor(recent.length / 2));
      if (avg2 - avg1 > 0.05) trend = "rising";
      else if (avg1 - avg2 > 0.05) trend = "falling";
    }

    return {
      agentId: this.id,
      name: this.name,
      state: this._state,
      hScore: this._hScore,
      zone: this.zone,
      sessionLength: this.sessionChain.length,
      totalSyscalls: this.syscallCount,
      totalMessages: this.messageCount,
      memoryPages: mmuStats.uniqueCids,
      memoryBytes: mmuStats.totalBytes,
      uptime: Date.now() - this.createdAt,
      hScoreHistory: history,
      hScoreTrend: trend,
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  private assertActive(): void {
    if (this._state !== "active") {
      throw new Error(`Agent ${this.name} is ${this._state}, cannot execute`);
    }
  }

  /** Append to the immutable session chain */
  private async appendSession(
    action: string,
    inputCid: string | null,
    outputCid: string | null,
  ): Promise<SessionEntry> {
    const parentCid = this.sessionChain.length > 0
      ? this.sessionChain[this.sessionChain.length - 1].entryCid
      : null;

    const seqNum = this.sessionChain.length;
    const entryBytes = new TextEncoder().encode(
      JSON.stringify({
        agent: this.id,
        parent: parentCid,
        seq: seqNum,
        action,
        input: inputCid,
        output: outputCid,
        h: this._hScore,
        t: Date.now(),
      })
    );
    const hash = await sha256(entryBytes);
    const entryCid = await computeCid(hash);

    const entry: SessionEntry = {
      entryCid,
      parentCid,
      sequenceNum: seqNum,
      action,
      inputCid,
      outputCid,
      hScore: this._hScore,
      zone: this.zone,
      timestamp: Date.now(),
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

  /**
   * spawn — Create a new agent in the mesh.
   * Like `docker run` or `kubectl apply`.
   */
  async spawn(
    name: string,
    hScore = 0.7,
    envelope: ResourceEnvelope = DEFAULT_ENVELOPE,
    parentPid = 0
  ): Promise<QAgent> {
    const agentId = `agent-${this.nextAgentNum++}-${name}`;

    // Fork a process in the scheduler
    const proc = await this.sched.fork(parentPid, name, hScore);

    // Create the agent instance
    const agent = new QAgent(
      agentId, name, proc,
      this.sched, this.ipc, this.net,
      envelope
    );

    this.agents.set(agentId, agent);
    return agent;
  }

  /**
   * despawn — Terminate and remove an agent.
   */
  despawn(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.terminate();
    this.agents.delete(agentId);
    return true;
  }

  /** Get an agent by ID */
  getAgent(agentId: string): QAgent | undefined {
    return this.agents.get(agentId);
  }

  /** Get all agents */
  allAgents(): QAgent[] {
    return Array.from(this.agents.values());
  }

  /** Get agents by zone */
  agentsByZone(zone: CoherenceZone): QAgent[] {
    return this.allAgents().filter(a => a.zone === zone);
  }

  /** Get agents sorted by H-score (highest first) */
  agentsByCoherence(): QAgent[] {
    return this.allAgents()
      .filter(a => a.state === "active" || a.state === "idle")
      .sort((a, b) => b.hScore - a.hScore);
  }

  /**
   * tick — Run one scheduling tick.
   * The mesh orchestrator: balance load, enforce H-score budgets,
   * suspend/freeze underperforming agents.
   */
  tick(): { scheduled: QAgent | null; suspended: string[]; frozen: string[] } {
    const suspended: string[] = [];
    const frozen: string[] = [];

    // Check all agents for H-score decay
    for (const agent of this.agents.values()) {
      if (agent.state === "active" && agent.hScore < 0.3) {
        // Agent coherence too low → suspend
        suspended.push(agent.id);
      }
      if (agent.state === "suspended" && agent.hScore < 0.15) {
        // Deeply divergent → auto-freeze to save resources
        frozen.push(agent.id);
      }
    }

    // Run scheduler
    const next = this.sched.schedule();
    let scheduledAgent: QAgent | null = null;
    if (next) {
      scheduledAgent = this.allAgents().find(a => a.pid === next.pid) ?? null;
    }

    return { scheduled: scheduledAgent, suspended, frozen };
  }

  /**
   * connect — Create an IPC channel between two agents.
   */
  async connect(agentA: QAgent, agentB: QAgent, minH = 0.0): Promise<QChannel> {
    return agentA.openChannel(
      `${agentA.name}↔${agentB.name}`,
      [agentB.pid],
      minH
    );
  }

  /**
   * broadcast — Send a message to all active agents via network.
   */
  async broadcast(
    senderAgent: QAgent,
    payload: Uint8Array
  ): Promise<{ delivered: number; rejected: number }> {
    let delivered = 0;
    let rejected = 0;

    for (const agent of this.agents.values()) {
      if (agent.id === senderAgent.id) continue;
      if (agent.state !== "active") continue;

      const result = await this.net.send(
        senderAgent.id, agent.id,
        payload, senderAgent.hScore
      );

      if (result.delivered) delivered++;
      else rejected++;
    }

    return { delivered, rejected };
  }

  /** Mesh-level statistics */
  stats(): MeshStats {
    const agents = this.allAgents();
    const zones: Record<CoherenceZone, number> = { convergent: 0, exploring: 0, divergent: 0 };
    let totalSyscalls = 0;
    let totalMessages = 0;
    let hSum = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let frozenCount = 0;
    let terminatedCount = 0;

    for (const a of agents) {
      const s = a.stats();
      zones[a.zone]++;
      totalSyscalls += s.totalSyscalls;
      totalMessages += s.totalMessages;
      if (a.state === "active" || a.state === "idle") {
        hSum += a.hScore;
        activeCount++;
      }
      if (a.state === "suspended") suspendedCount++;
      if (a.state === "frozen") frozenCount++;
      if (a.state === "terminated") terminatedCount++;
    }

    const meanH = activeCount > 0 ? hSum / activeCount : 0;

    return {
      totalAgents: agents.length,
      activeAgents: activeCount,
      suspendedAgents: suspendedCount,
      frozenAgents: frozenCount,
      terminatedAgents: terminatedCount,
      meanHScore: meanH,
      zoneDistribution: zones,
      totalSyscalls,
      totalMessages,
      meshCoherence: meanH, // aggregate coherence = mean H-score
    };
  }
}
