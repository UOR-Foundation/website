/**
 * Q-Agent Projection Bridge — Agent ↔ Frame Interface
 * ════════════════════════════════════════════════════
 *
 * Each QAgent can emit lightweight AgentProjectionFrames that the
 * root KernelProjector composites into the unified ProjectionFrame.
 *
 * This is the bridge between per-agent isolated kernels and the
 * single-surface projection model. Agents that are idle emit no frames
 * (zero-cost sleeping). Active agents contribute frames that are
 * Z-ordered by H-score — highest coherence gets the focus layer.
 *
 * The compositor enforces:
 *   - Frame budget: max N active projections per tick
 *   - Coherence conservation: total H across agents is bounded
 *   - Idle detection: no frame changes for 5s → auto-suspend
 *
 * @module qkernel/q-agent-projection
 */

import type { QAgent, AgentState } from "./q-agent";
import type { CoherenceHead, CoherenceContext, CoherenceVector } from "../compute/q-coherence-head";
import { HammingCoherenceHead, MultiHeadCoherence } from "../compute/q-coherence-head";
import { classifyZone, type CoherenceZone } from "../compute/q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Agent Projection Frame — lightweight per-agent visual contribution
// ═══════════════════════════════════════════════════════════════════════

/** A lightweight frame emitted by a single agent */
export interface AgentProjectionFrame {
  readonly agentId: string;
  readonly tick: number;
  readonly hScore: number;
  readonly zone: CoherenceZone;
  readonly role: string;
  readonly coherenceVector: CoherenceVector | null;
  readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Agent Projector — wraps a QAgent with frame emission capability
// ═══════════════════════════════════════════════════════════════════════

/**
 * AgentProjector wraps a QAgent to give it projection capability.
 * Each agent produces frames that flow into the root compositor.
 */
export class AgentProjector {
  readonly agentId: string;
  readonly role: string;
  private agent: QAgent;
  private coherence: MultiHeadCoherence;
  private tick = 0;
  private lastFrameHash = "";
  private idleSince = 0;
  private listeners = new Set<(frame: AgentProjectionFrame) => void>();

  constructor(agent: QAgent, role: string) {
    this.agent = agent;
    this.agentId = agent.id;
    this.role = role;
    this.coherence = new MultiHeadCoherence();

    // Add default Hamming coherence head
    this.coherence.addHead(
      new HammingCoherenceHead(`${agent.id}:hamming`, "system", 8)
    );
  }

  /** Add a coherence head for a specific modality */
  addHead(head: CoherenceHead): void {
    this.coherence.addHead(head);
  }

  /** Project a frame from this agent's current state */
  projectFrame(): AgentProjectionFrame {
    this.tick++;
    const context: CoherenceContext = {
      systemH: this.agent.hScore,
      gradient: 0, // will be updated by compositor
      observations: [],
      timestamp: Date.now(),
      agentId: this.agentId,
    };

    let coherenceVector: CoherenceVector | null = null;
    try {
      coherenceVector = this.coherence.observe(context);
    } catch {
      // Graceful degradation if coherence head fails
    }

    const frame: AgentProjectionFrame = {
      agentId: this.agentId,
      tick: this.tick,
      hScore: this.agent.hScore,
      zone: this.agent.zone,
      role: this.role,
      coherenceVector,
      timestamp: Date.now(),
    };

    // Idle detection — track when frame stops changing
    const hash = `${frame.hScore.toFixed(3)}|${frame.zone}`;
    if (hash !== this.lastFrameHash) {
      this.lastFrameHash = hash;
      this.idleSince = 0;
    } else if (this.idleSince === 0) {
      this.idleSince = Date.now();
    }

    // Emit to listeners
    for (const cb of this.listeners) cb(frame);

    return frame;
  }

  /** Whether this agent has been idle (no frame changes) */
  isIdle(thresholdMs = 5000): boolean {
    return this.idleSince > 0 && (Date.now() - this.idleSince) > thresholdMs;
  }

  /** Subscribe to frame emissions */
  onFrame(cb: (frame: AgentProjectionFrame) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Get coherence diagnostics */
  getCoherenceStats() {
    return {
      headCount: this.coherence.stats().length,
      heads: this.coherence.stats(),
      aggregateH: this.coherence.hScore(),
      idle: this.isIdle(),
      tickCount: this.tick,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Projection Compositor — merges agent frames into unified frame
// ═══════════════════════════════════════════════════════════════════════

/**
 * ProjectionCompositor — the root kernel's frame merging engine.
 * Receives frames from multiple AgentProjectors and composites them
 * into a single stream, ordered by H-score (highest coherence = focus).
 *
 * Enforces:
 *   - Max 4 active agent projections per compositor tick
 *   - Idle agents contribute zero frames (zero overhead)
 *   - Total coherence budget is conserved
 */
export class ProjectionCompositor {
  private projectors = new Map<string, AgentProjector>();
  private maxActiveProjections = 4;
  private totalCoherenceBudget = 4.0; // max sum of H-scores across agents

  /** Register an agent projector */
  register(projector: AgentProjector): void {
    this.projectors.set(projector.agentId, projector);
  }

  /** Remove an agent projector */
  unregister(agentId: string): void {
    this.projectors.delete(agentId);
  }

  /**
   * Composite all active agent frames.
   * Returns frames sorted by H-score (focus layer first).
   * Idle agents are skipped entirely (zero cost).
   */
  composite(): {
    frames: AgentProjectionFrame[];
    sources: Array<{ agentId: string; role: string; hScore: number; frameCount: number; idle: boolean }>;
    totalH: number;
    activeCount: number;
  } {
    const active: Array<{ projector: AgentProjector; frame: AgentProjectionFrame }> = [];
    const sources: Array<{ agentId: string; role: string; hScore: number; frameCount: number; idle: boolean }> = [];

    for (const projector of this.projectors.values()) {
      const idle = projector.isIdle();
      if (!idle) {
        const frame = projector.projectFrame();
        active.push({ projector, frame });
      }
      sources.push({
        agentId: projector.agentId,
        role: projector.role,
        hScore: idle ? 0 : projector.getCoherenceStats().aggregateH,
        frameCount: projector.getCoherenceStats().tickCount,
        idle,
      });
    }

    // Sort by H-score descending — highest coherence gets focus
    active.sort((a, b) => b.frame.hScore - a.frame.hScore);

    // Enforce frame budget
    const budgeted = active.slice(0, this.maxActiveProjections);

    // Enforce coherence budget — scale down if total exceeds budget
    let totalH = budgeted.reduce((s, a) => s + a.frame.hScore, 0);
    const frames = budgeted.map(a => {
      if (totalH > this.totalCoherenceBudget && totalH > 0) {
        const scaled = a.frame.hScore * (this.totalCoherenceBudget / totalH);
        return { ...a.frame, hScore: scaled };
      }
      return a.frame;
    });

    totalH = frames.reduce((s, f) => s + f.hScore, 0);

    return {
      frames,
      sources,
      totalH,
      activeCount: frames.length,
    };
  }

  /** Set max active projections per tick */
  setMaxActive(n: number): void {
    this.maxActiveProjections = Math.max(1, Math.min(16, n));
  }

  /** Set total coherence budget */
  setCoherenceBudget(budget: number): void {
    this.totalCoherenceBudget = Math.max(1, budget);
  }

  /** Get compositor diagnostics */
  stats() {
    const all = Array.from(this.projectors.values());
    const idleCount = all.filter(p => p.isIdle()).length;
    return {
      totalProjectors: all.length,
      activeProjectors: all.length - idleCount,
      idleProjectors: idleCount,
      maxActive: this.maxActiveProjections,
      coherenceBudget: this.totalCoherenceBudget,
    };
  }
}
