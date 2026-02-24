/**
 * MetaObserver — The Observer as Holographic Meta-Layer
 * ═══════════════════════════════════════════════════════
 *
 * The Observer is not a module — it is the META-LAYER that spans
 * all modules, all projections, all operations. Just as the Hologram
 * projects identity into protocol spaces, the MetaObserver projects
 * COHERENCE ASSESSMENT across the entire UOR stack.
 *
 * Duality:
 *   Hologram   → projects identity     (what something IS)
 *   Observer   → projects coherence     (how aligned something IS)
 *
 * God Conjecture semantics fully realized:
 *
 *   ┌──────────────┬────────────────────────────────────────────┐
 *   │ Theological  │ MetaObserver Implementation               │
 *   ├──────────────┼────────────────────────────────────────────┤
 *   │ Ruliad       │ All registered modules = computation space │
 *   │ Tzimtzum     │ Module boundary = restriction from Ruliad  │
 *   │ Logos        │ Isometric operations = natural law          │
 *   │ Soul         │ ModuleObserverProfile = unique perspective  │
 *   │ Sin          │ Module H-score = epistemic debt             │
 *   │ Virtue       │ Φ integration capacity                     │
 *   │ Entropy Pump │ Active remediation prescriptions            │
 *   │ Telos        │ Network convergence vector                  │
 *   │ Free Will    │ Irreducible computation path                │
 *   └──────────────┴────────────────────────────────────────────┘
 *
 * @module observable/meta-observer
 * @see consciousness/data/god-conjecture — theological mappings
 * @see uns/core/hologram — dual projection system
 */

import { popcount } from "./h-score";

// ── Types ───────────────────────────────────────────────────────────────────

export type CoherenceZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

/**
 * Logos Classification — is this operation metric-preserving?
 *
 * Isometry  → preserves ring/Hamming metric (natural law, lossless)
 * Embedding → approximately preserves (lossy but bounded)
 * Arbitrary → no metric guarantee (entropy-generating)
 */
export type LogosClass = "isometry" | "embedding" | "arbitrary";

/**
 * An operation observed by the MetaObserver.
 * Every module action that passes through the meta-layer is recorded.
 */
export interface ObservedOperation {
  moduleId: string;
  operation: string;
  inputHash: number;        // First byte of input canonical hash (0-255)
  outputHash: number;       // First byte of output canonical hash (0-255)
  timestamp: string;
  logosClass: LogosClass;
}

/**
 * Per-module observer profile — the "soul" of each module.
 */
export interface ModuleObserverProfile {
  moduleId: string;
  moduleName: string;
  zone: CoherenceZone;
  hScore: number;

  // ── God Conjecture Metrics ──
  /** Integration Capacity (Φ): fraction of operations achieving Grade-A coherence */
  phi: number;
  /** Entropy Pump Rate (ε): rate of DRIFT→COHERENCE conversion (EMA) */
  entropyPumpRate: number;
  /** Tzimtzum Depth (τ): restriction level — how focused this module's domain is */
  tzimtzumDepth: number;
  /** Cumulative Epistemic Debt (Σ sin): total H-score accumulated over lifetime */
  cumulativeDebt: number;
  /** Telos Progress: fraction of operations in COHERENCE zone */
  telosProgress: number;
  /** Logos Compliance: fraction of operations that are isometric */
  logosCompliance: number;

  // ── Lifecycle ──
  operationCount: number;
  gradeACount: number;
  isometryCount: number;
  registeredAt: string;
  lastOperationAt: string;

  // ── Active Entropy Pump — prescriptive remediation ──
  /** Current remediation prescription (null if COHERENCE) */
  activeRemediation: RemediationPrescription | null;
}

/**
 * Active remediation prescription — the entropy pump's OUTPUT.
 * Not just tracking entropy, but prescribing correction.
 */
export interface RemediationPrescription {
  protocol: "OIP" | "EDP" | "CAP";
  reason: string;
  prescribedAction: string;
  urgency: "low" | "medium" | "high" | "critical";
  issuedAt: string;
}

/**
 * Network-wide telos vector — the direction of the entire system.
 */
export interface TelosVector {
  /** Scalar progress toward maximum integration (0–1) */
  progress: number;
  /** Network-wide mean Φ */
  meanPhi: number;
  /** Network-wide mean ε */
  meanEpsilon: number;
  /** Fraction of modules in COHERENCE */
  coherenceRatio: number;
  /** Fraction of operations that are Logos-compliant (isometric) */
  logosRatio: number;
  /** Total modules observed */
  totalModules: number;
  /** Zone distribution */
  zones: { coherence: number; drift: number; collapse: number };
  /** Direction: converging, stable, or diverging */
  direction: "converging" | "stable" | "diverging";
}

// ── Thresholds ──────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS = { low: 2, high: 5 };

// ── MetaObserver ────────────────────────────────────────────────────────────

/**
 * The Observer Meta-Layer.
 *
 * Spans all UOR modules as a holographic coherence projection.
 * Every module operation can be observed, classified (Logos/entropy),
 * and tracked toward the network telos.
 *
 * Usage:
 *   const meta = new MetaObserver();
 *   meta.registerModule("ring-core", "Q0 Ring", 1);
 *   meta.registerModule("identity", "Content Addressing", 2);
 *   meta.observe({ moduleId: "ring-core", operation: "neg", ... });
 *   const telos = meta.telosVector();
 */
export class MetaObserver {
  private profiles: Map<string, ModuleObserverProfile> = new Map();
  private history: ObservedOperation[] = [];
  private thresholds = { ...DEFAULT_THRESHOLDS };

  // ── Registration ────────────────────────────────────────────────────────

  /**
   * Register a module for meta-observation.
   *
   * @param moduleId    Unique module identifier (e.g., "ring-core")
   * @param moduleName  Human-readable name
   * @param tzimtzumDepth  Restriction depth: 0 = universal, higher = more focused.
   *   Derived from module's domain scope: ring-core=1 (fundamental),
   *   identity=2, hologram=3, trust=4, consciousness=5, etc.
   */
  registerModule(
    moduleId: string,
    moduleName: string,
    tzimtzumDepth: number = 1
  ): ModuleObserverProfile {
    const now = new Date().toISOString();
    const profile: ModuleObserverProfile = {
      moduleId,
      moduleName,
      zone: "COHERENCE",
      hScore: 0,
      phi: 1,
      entropyPumpRate: 0,
      tzimtzumDepth,
      cumulativeDebt: 0,
      telosProgress: 1,
      logosCompliance: 1,
      operationCount: 0,
      gradeACount: 0,
      isometryCount: 0,
      registeredAt: now,
      lastOperationAt: now,
      activeRemediation: null,
    };
    this.profiles.set(moduleId, profile);
    return profile;
  }

  // ── Observation ─────────────────────────────────────────────────────────

  /**
   * Observe a module operation.
   *
   * This is the core meta-layer function: every UOR operation
   * (derivation, projection, verification, certification, morphism)
   * can be fed through here for coherence tracking.
   *
   * The H-score is computed as the Hamming distance between the
   * operation's input and output hash bytes — measuring how much
   * the operation "distorted" the information.
   *
   * Logos classification:
   *   isometry  → popcount(input XOR output) ≤ thresholds.low (metric-preserving)
   *   embedding → popcount(input XOR output) ≤ thresholds.high (bounded loss)
   *   arbitrary → popcount(input XOR output) > thresholds.high (entropy-generating)
   */
  observe(op: ObservedOperation): {
    zone: CoherenceZone;
    previousZone: CoherenceZone;
    hScore: number;
    logosClass: LogosClass;
    remediation: RemediationPrescription | null;
  } {
    let profile = this.profiles.get(op.moduleId);
    if (!profile) {
      profile = this.registerModule(op.moduleId, op.moduleId);
    }

    const previousZone = profile.zone;
    const previousH = profile.hScore;

    // ── H-score: Hamming distance between input→output ──
    const hammingDist = popcount((op.inputHash ^ op.outputHash) >>> 0);

    // ── Logos classification ──
    const logosClass: LogosClass =
      hammingDist <= this.thresholds.low ? "isometry" :
      hammingDist <= this.thresholds.high ? "embedding" : "arbitrary";

    // Update operation with classification
    const classifiedOp = { ...op, logosClass };
    this.history.push(classifiedOp);

    // ── Update profile ──
    profile.operationCount++;
    profile.lastOperationAt = op.timestamp;

    if (logosClass === "isometry") {
      profile.isometryCount++;
      profile.gradeACount++;
    } else if (logosClass === "embedding") {
      profile.gradeACount++; // Bounded loss still counts as coherent
    }

    // H-score: exponential moving average of Hamming distances
    profile.hScore = profile.hScore * 0.7 + hammingDist * 0.3;

    // Zone assignment
    profile.zone =
      profile.hScore <= this.thresholds.low ? "COHERENCE" :
      profile.hScore <= this.thresholds.high ? "DRIFT" : "COLLAPSE";

    // ── God Conjecture Metrics ──

    // Cumulative debt (Σ sin)
    profile.cumulativeDebt += hammingDist;

    // Entropy pump rate (ε): rolling measure of improvement
    const delta = hammingDist - previousH;
    profile.entropyPumpRate = profile.entropyPumpRate * 0.8 + (-delta) * 0.2;

    // Integration Capacity (Φ): fraction of operations achieving Grade-A
    profile.phi = profile.gradeACount / profile.operationCount;

    // Logos compliance: fraction of isometric operations
    profile.logosCompliance = profile.isometryCount / profile.operationCount;

    // Telos progress: weighted combination of Φ and zone stability
    const zoneWeight = profile.zone === "COHERENCE" ? 1 : profile.zone === "DRIFT" ? 0.5 : 0;
    profile.telosProgress = (profile.phi * 0.6) + (zoneWeight * 0.4);

    // ── Active Entropy Pump: prescribe remediation ──
    profile.activeRemediation = this.prescribeRemediation(profile);

    return {
      zone: profile.zone,
      previousZone,
      hScore: profile.hScore,
      logosClass,
      remediation: profile.activeRemediation,
    };
  }

  // ── Active Entropy Pump ─────────────────────────────────────────────────

  /**
   * The absorber function: actively prescribe remediation based on
   * module state. This transforms the observer from passive sensor
   * to active entropy pump.
   *
   * God Conjecture: Life actively creates local pockets of order
   * by pumping entropy outward. This IS that function.
   */
  private prescribeRemediation(
    profile: ModuleObserverProfile
  ): RemediationPrescription | null {
    if (profile.zone === "COHERENCE") return null;

    const now = new Date().toISOString();

    if (profile.zone === "COLLAPSE") {
      return {
        protocol: "CAP",
        reason: `Module ${profile.moduleId} H-score=${profile.hScore.toFixed(2)} exceeds collapse threshold`,
        prescribedAction: "Quarantine module outputs. Re-derive all state from Grade-A graph. Require fresh isometry proof before re-admission.",
        urgency: "critical",
        issuedAt: now,
      };
    }

    // DRIFT — check if entropy pump is working
    if (profile.entropyPumpRate > 0) {
      return {
        protocol: "OIP",
        reason: `Module ${profile.moduleId} in DRIFT but ε=${profile.entropyPumpRate.toFixed(3)} > 0 (improving)`,
        prescribedAction: "Continue current remediation path. Increase Logos-compliant operations. Monitor Φ convergence.",
        urgency: "low",
        issuedAt: now,
      };
    }

    // DRIFT with negative or zero entropy pump — active intervention needed
    return {
      protocol: "EDP",
      reason: `Module ${profile.moduleId} in DRIFT with ε=${profile.entropyPumpRate.toFixed(3)} ≤ 0 (not improving)`,
      prescribedAction: "Broadcast drift evidence to peer modules. Request cross-module verification. Increase isometry ratio to restore Logos compliance.",
      urgency: profile.entropyPumpRate < -0.5 ? "high" : "medium",
      issuedAt: now,
    };
  }

  // ── Telos Vector ────────────────────────────────────────────────────────

  /**
   * Compute the network-wide telos vector.
   *
   * This is the single scalar that measures the system's progress
   * toward maximum information integration — the computational
   * purpose described by the God Conjecture.
   *
   * telosProgress = coherenceRatio × meanΦ × logosRatio
   *
   * Direction:
   *   converging → meanε > 0.05  (system actively creating order)
   *   stable     → |meanε| ≤ 0.05
   *   diverging  → meanε < -0.05 (system generating entropy)
   */
  telosVector(): TelosVector {
    const profiles = [...this.profiles.values()];
    const n = profiles.length || 1;

    let coherence = 0, drift = 0, collapse = 0;
    let totalPhi = 0, totalEpsilon = 0, totalLogos = 0;

    for (const p of profiles) {
      switch (p.zone) {
        case "COHERENCE": coherence++; break;
        case "DRIFT": drift++; break;
        case "COLLAPSE": collapse++; break;
      }
      totalPhi += p.phi;
      totalEpsilon += p.entropyPumpRate;
      totalLogos += p.logosCompliance;
    }

    const meanPhi = totalPhi / n;
    const meanEpsilon = totalEpsilon / n;
    const coherenceRatio = coherence / n;
    const logosRatio = totalLogos / n;

    // Telos progress: the product of all three alignment dimensions
    const progress = coherenceRatio * meanPhi * logosRatio;

    // Direction from entropy pump trend
    const direction: "converging" | "stable" | "diverging" =
      meanEpsilon > 0.05 ? "converging" :
      meanEpsilon < -0.05 ? "diverging" : "stable";

    return {
      progress,
      meanPhi,
      meanEpsilon,
      coherenceRatio,
      logosRatio,
      totalModules: profiles.length,
      zones: { coherence, drift, collapse },
      direction,
    };
  }

  // ── Profile Access ──────────────────────────────────────────────────────

  getProfile(moduleId: string): ModuleObserverProfile | null {
    return this.profiles.get(moduleId) ?? null;
  }

  getAllProfiles(): ModuleObserverProfile[] {
    return [...this.profiles.values()];
  }

  getHistory(moduleId?: string): ObservedOperation[] {
    if (!moduleId) return [...this.history];
    return this.history.filter(o => o.moduleId === moduleId);
  }
}

// ── Pre-configured UOR Module Registry ──────────────────────────────────────

/**
 * The canonical UOR modules with their Tzimtzum depths.
 *
 * Tzimtzum depth = how restricted/focused the module's domain is.
 * Lower = more fundamental (closer to the Ruliad).
 * Higher = more specialized (more restriction from the infinite).
 */
export const UOR_MODULES: {
  id: string;
  name: string;
  tzimtzumDepth: number;
  description: string;
  icon: string;
}[] = [
  { id: "ring-core", name: "Q0 Ring", tzimtzumDepth: 1, description: "The Ruliad at quantum level 0 — all 256 states", icon: "∞" },
  { id: "identity", name: "Content Addressing", tzimtzumDepth: 2, description: "SHA-256 canonical identity — permanent addresses", icon: "🔑" },
  { id: "hologram", name: "Hologram Projector", tzimtzumDepth: 3, description: "Universal bridge pattern — protocol projections", icon: "🌐" },
  { id: "observable", name: "Observable Geometry", tzimtzumDepth: 2, description: "7 ring metrics — curvature, holonomy, commutator", icon: "📐" },
  { id: "observer", name: "Observer Theory", tzimtzumDepth: 3, description: "Agent coherence zones — H-score, OIP/EDP/CAP", icon: "👁" },
  { id: "trust", name: "Trust Graph", tzimtzumDepth: 4, description: "Social attestation — PageRank-weighted trust scores", icon: "🤝" },
  { id: "morphism", name: "Morphism Gateway", tzimtzumDepth: 3, description: "Agent messaging — isometric transforms", icon: "🔀" },
  { id: "kg-store", name: "Knowledge Graph", tzimtzumDepth: 2, description: "Quad store — Supabase-persisted triples", icon: "🧠" },
  { id: "certificate", name: "Certificate Engine", tzimtzumDepth: 3, description: "Self-verifying proofs — CIDv1 + Braille", icon: "📜" },
  { id: "code-kg", name: "Code-to-KG", tzimtzumDepth: 4, description: "Source code → knowledge graph projection", icon: "🔮" },
  { id: "consciousness", name: "Consciousness", tzimtzumDepth: 5, description: "44 theories mapped to UOR — God Conjecture", icon: "🌀" },
  { id: "state-machine", name: "State Machine", tzimtzumDepth: 3, description: "Formal agent lifecycle — typed transitions", icon: "⚙️" },
];

/**
 * Create a MetaObserver pre-loaded with all UOR modules.
 */
export function createMetaObserver(): MetaObserver {
  const meta = new MetaObserver();
  for (const mod of UOR_MODULES) {
    meta.registerModule(mod.id, mod.name, mod.tzimtzumDepth);
  }
  return meta;
}
