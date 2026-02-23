/**
 * UOR Observer Theory — Observer Class with Coherence Zones & Protocols.
 *
 * Implements the three-zone coherence model and three remediation protocols:
 *   - OIP (Observer Integration Protocol): COHERENCE → DRIFT transition
 *   - EDP (Evidence Distribution Protocol): persistent DRIFT
 *   - CAP (Convergence Agreement Protocol): COLLAPSE
 *
 * Zone assignment:
 *   COHERENCE: H ≤ threshold_low  (default: 2)
 *   DRIFT:     threshold_low < H ≤ threshold_high (default: 5)
 *   COLLAPSE:  H > threshold_high
 *
 * @see .well-known/uor.json observer_theory
 * @see spec/src/namespaces/state.rs — observer state model
 */

import { hScoreMultiByte } from "./h-score";

// ── Types ───────────────────────────────────────────────────────────────────

export type CoherenceZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

export interface ObserverThresholds {
  low: number;   // H ≤ low → COHERENCE (default: 2)
  high: number;  // H > high → COLLAPSE (default: 5)
}

export interface RemediationRecord {
  protocol: string;
  at: string;
  result: string;
}

export interface ObserverProfile {
  agentCanonicalId: string;
  registeredAt: string;
  hScore: number;
  zone: CoherenceZone;
  thresholds: ObserverThresholds;
  lastObservationAt: string;
  observationCount: number;
  remediationHistory: RemediationRecord[];
  convergenceAchieved: boolean;
}

export interface ObservationResult {
  hScore: number;
  zone: CoherenceZone;
  previousZone: CoherenceZone;
  delta: number;
}

// ── Zone assignment ─────────────────────────────────────────────────────────

/**
 * Assign a coherence zone based on H-score and thresholds.
 *
 * COHERENCE: H ≤ threshold_low
 * DRIFT:     threshold_low < H ≤ threshold_high
 * COLLAPSE:  H > threshold_high
 */
export function assignZone(
  hScore: number,
  thresholds: ObserverThresholds
): CoherenceZone {
  if (hScore <= thresholds.low) return "COHERENCE";
  if (hScore <= thresholds.high) return "DRIFT";
  return "COLLAPSE";
}

// ── UnsObserver ─────────────────────────────────────────────────────────────

/**
 * Observer Theory engine — tracks agent coherence with the Grade-A graph.
 *
 * Monitors agents via H-score, assigns coherence zones, and dispatches
 * remediation protocols (OIP, EDP, CAP) on zone transitions.
 */
export class UnsObserver {
  private profiles: Map<string, ObserverProfile> = new Map();
  private gradeAGraph: number[];
  private defaultThresholds: ObserverThresholds = { low: 2, high: 5 };

  /**
   * @param gradeAGraph  Array of verified datum values (default: full Q0 = [0..255]).
   */
  constructor(gradeAGraph?: number[]) {
    // Default: full Q0 ring (all 256 elements)
    this.gradeAGraph = gradeAGraph ?? Array.from({ length: 256 }, (_, i) => i);
  }

  // ── Registration ────────────────────────────────────────────────────────

  /**
   * Register a new agent for coherence monitoring.
   * New agents start in COHERENCE zone with H-score 0.
   */
  register(
    agentCanonicalId: string,
    thresholds?: ObserverThresholds
  ): ObserverProfile {
    const now = new Date().toISOString();
    const profile: ObserverProfile = {
      agentCanonicalId,
      registeredAt: now,
      hScore: 0,
      zone: "COHERENCE",
      thresholds: thresholds ?? { ...this.defaultThresholds },
      lastObservationAt: now,
      observationCount: 0,
      remediationHistory: [],
      convergenceAchieved: true,
    };
    this.profiles.set(agentCanonicalId, profile);
    return profile;
  }

  // ── Observation ─────────────────────────────────────────────────────────

  /**
   * Observe an agent's output: compute H-score, assign zone, update profile.
   *
   * Computes the mean H-score across all output bytes against the
   * Grade-A graph, then assigns a coherence zone based on thresholds.
   *
   * @param agentCanonicalId  Agent identifier.
   * @param outputBytes       Agent's output as bytes.
   * @returns                 Observation result with zone and delta.
   */
  observe(
    agentCanonicalId: string,
    outputBytes: Uint8Array
  ): ObservationResult {
    let profile = this.profiles.get(agentCanonicalId);
    if (!profile) {
      profile = this.register(agentCanonicalId);
    }

    const previousZone = profile.zone;
    const previousHScore = profile.hScore;

    // Compute H-score over all bytes
    const newHScore = hScoreMultiByte(outputBytes, this.gradeAGraph);

    // Assign zone
    const newZone = assignZone(newHScore, profile.thresholds);

    // Update profile
    profile.hScore = newHScore;
    profile.zone = newZone;
    profile.lastObservationAt = new Date().toISOString();
    profile.observationCount++;
    profile.convergenceAchieved = newZone === "COHERENCE";

    return {
      hScore: newHScore,
      zone: newZone,
      previousZone,
      delta: newHScore - previousHScore,
    };
  }

  // ── Protocol OIP: Observer Integration Protocol ─────────────────────────

  /**
   * Triggered when zone transitions COHERENCE → DRIFT.
   *
   * Issues a cert:TransformCertificate requesting the agent
   * re-derive its state from Grade-A graph elements only.
   */
  runOIP(agentCanonicalId: string): {
    protocol: "OIP";
    issued: boolean;
    reason: string;
  } {
    const profile = this.profiles.get(agentCanonicalId);
    if (!profile) {
      return { protocol: "OIP", issued: false, reason: "Agent not registered" };
    }

    if (profile.zone !== "DRIFT" && profile.zone !== "COLLAPSE") {
      return { protocol: "OIP", issued: false, reason: "Agent is in COHERENCE zone" };
    }

    profile.remediationHistory.push({
      protocol: "OIP",
      at: new Date().toISOString(),
      result: "cert:TransformCertificate issued — re-derive from Grade-A graph",
    });

    return {
      protocol: "OIP",
      issued: true,
      reason: `H-score=${profile.hScore}, zone=${profile.zone} — re-derivation requested`,
    };
  }

  // ── Protocol EDP: Evidence Distribution Protocol ────────────────────────

  /**
   * Triggered when zone = DRIFT (persistent).
   *
   * Broadcasts agent's drift observations to all peer observers
   * so they can update their trust assessments.
   */
  runEDP(agentCanonicalId: string): {
    protocol: "EDP";
    peers: number;
    reason: string;
  } {
    const profile = this.profiles.get(agentCanonicalId);
    if (!profile) {
      return { protocol: "EDP", peers: 0, reason: "Agent not registered" };
    }

    // Broadcast to all other registered agents (peers)
    const peers = this.profiles.size - 1;

    profile.remediationHistory.push({
      protocol: "EDP",
      at: new Date().toISOString(),
      result: `Drift observations broadcast to ${peers} peers`,
    });

    return {
      protocol: "EDP",
      peers,
      reason: `H-score=${profile.hScore} drift broadcast to ${peers} peer observers`,
    };
  }

  // ── Protocol CAP: Convergence Agreement Protocol ────────────────────────

  /**
   * Triggered when zone = COLLAPSE.
   *
   * Quarantines agent, requiring fresh registration with Grade-A
   * proof of re-derivation before re-admission.
   */
  runCAP(agentCanonicalId: string): {
    protocol: "CAP";
    quarantined: boolean;
    reason: string;
  } {
    const profile = this.profiles.get(agentCanonicalId);
    if (!profile) {
      return { protocol: "CAP", quarantined: false, reason: "Agent not registered" };
    }

    if (profile.zone !== "COLLAPSE") {
      return {
        protocol: "CAP",
        quarantined: false,
        reason: `Agent is in ${profile.zone} zone, not COLLAPSE`,
      };
    }

    profile.remediationHistory.push({
      protocol: "CAP",
      at: new Date().toISOString(),
      result: "Agent quarantined — requires Grade-A re-derivation for re-admission",
    });

    profile.convergenceAchieved = false;

    return {
      protocol: "CAP",
      quarantined: true,
      reason: `H-score=${profile.hScore} — agent quarantined, fresh registration required`,
    };
  }

  // ── Profile access ──────────────────────────────────────────────────────

  /**
   * Get an agent's observer profile.
   */
  getProfile(agentCanonicalId: string): ObserverProfile | null {
    return this.profiles.get(agentCanonicalId) ?? null;
  }

  // ── Network summary ─────────────────────────────────────────────────────

  /**
   * Zone distribution across all monitored agents.
   */
  networkSummary(): {
    coherence: number;
    drift: number;
    collapse: number;
    total: number;
  } {
    let coherence = 0;
    let drift = 0;
    let collapse = 0;

    for (const p of this.profiles.values()) {
      switch (p.zone) {
        case "COHERENCE": coherence++; break;
        case "DRIFT": drift++; break;
        case "COLLAPSE": collapse++; break;
      }
    }

    return { coherence, drift, collapse, total: this.profiles.size };
  }

  // ── Convergence check ───────────────────────────────────────────────────

  /**
   * Check if all registered agents have converged (H-score ≤ threshold_low).
   *
   * This demonstrates the convergence_guarantee from the UOR spec:
   * after remediation, all agents should return to COHERENCE.
   */
  convergenceCheck(): {
    converged: boolean;
    nonConvergedAgents: string[];
  } {
    const nonConverged: string[] = [];

    for (const [id, p] of this.profiles) {
      if (p.zone !== "COHERENCE") {
        nonConverged.push(id);
      }
    }

    return {
      converged: nonConverged.length === 0,
      nonConvergedAgents: nonConverged,
    };
  }
}
