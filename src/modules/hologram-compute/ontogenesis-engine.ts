/**
 * Ontogenesis Engine — Self-Organizing Ontology via Coherence Crystallization
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Enables the system to generate its own ontologies from first principles.
 * No predefined categories are required — concepts emerge organically from
 * the geometric structure of the 96-vertex Atlas manifold.
 *
 * Inspired by three physical phenomena:
 *   1. Crystal nucleation — ordered structure from disordered solution
 *   2. Synaptic pruning  — frequently-used pathways stabilize
 *   3. Holographic emergence — bulk geometry from boundary entanglement
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────┐
 *   │  Observer Interaction (thermal energy)           │
 *   │       ↓                                         │
 *   │  Activation Trace Buffer (solution)             │
 *   │       ↓                                         │
 *   │  Nucleation Detector (supersaturation check)    │
 *   │       ↓                                         │
 *   │  Concept Crystal (stable activation pattern)    │
 *   │       ↓                                         │
 *   │  Relation Grower (edge crystallization)         │
 *   │       ↓                                         │
 *   │  Gap Detector (periodic table interpolation)    │
 *   │       ↓                                         │
 *   │  Self-Propagation (spontaneous ontology growth) │
 *   └─────────────────────────────────────────────────┘
 *
 * The τ-mirror involution acts as the crystal lattice symmetry,
 * ensuring every concept has a coherent dual (every "hot" has a "cold").
 *
 * @module ontogenesis-engine
 */

import type { SemanticSignature, SemanticDomain, ThematicRole } from "./atlas-semantic-kernel";
import { SEMANTIC_DOMAINS, THEMATIC_ROLES, buildSignature, compose, checkEntailment, detectContradiction } from "./atlas-semantic-kernel";

// ══════════════════════════════════════════════════════════════
// §1  Types
// ══════════════════════════════════════════════════════════════

/**
 * An activation trace — a snapshot of manifold state at one moment.
 * The engine accumulates these and looks for recurring patterns.
 */
export interface ActivationTrace {
  /** 96-dim activation vector (what the manifold looked like) */
  readonly activations: Float32Array;
  /** When this was observed (monotonic counter) */
  readonly tick: number;
  /** Optional: the token/word that produced this activation */
  readonly sourceLabel?: string;
  /** H-score at the time of observation */
  readonly hScore: number;
}

/**
 * A ConceptCrystal — a pattern that has nucleated into a stable concept.
 * This is the fundamental unit of a self-generated ontology.
 */
export interface ConceptCrystal {
  /** Unique ID for this concept */
  readonly id: string;
  /** Auto-generated label (can be refined by observer) */
  label: string;
  /** The crystallized activation pattern (centroid of all observations) */
  readonly centroid: Float32Array;
  /** Semantic signature derived from the centroid */
  readonly signature: SemanticSignature;
  /** Primary domain (most energetic region) */
  readonly domain: SemanticDomain;
  /** Primary role */
  readonly role: ThematicRole;
  /** Number of observations that contributed to nucleation */
  observationCount: number;
  /** Coherence stability: how consistent the pattern is across observations */
  stability: number;
  /** Tick when this concept first nucleated */
  readonly nucleatedAt: number;
  /** Tick of most recent reinforcement */
  lastReinforcedAt: number;
  /** Whether this was observer-seeded or self-generated */
  readonly origin: "observer" | "crystallized" | "interpolated";
}

/**
 * A relation between two concepts — an edge in the ontology graph.
 */
export interface OntologyRelation {
  /** Source concept ID */
  readonly from: string;
  /** Target concept ID */
  readonly to: string;
  /** Relation type, discovered from geometric properties */
  readonly kind: RelationKind;
  /** Strength of the relation (0-1) */
  strength: number;
  /** Coherence of the composed pair */
  readonly compositionCoherence: number;
}

export type RelationKind =
  | "entails"       // A's pattern contains B's
  | "contradicts"   // τ-mirror collision
  | "composes"      // Constructive interference
  | "complements"   // Activates complementary roles
  | "mirrors"       // τ-mirror duals (hot↔cold, up↔down)
  | "sibling";      // Same domain, different role

/**
 * A hypothesized concept from gap detection — the system predicts
 * a concept SHOULD exist based on manifold geometry.
 */
export interface ConceptHypothesis {
  /** Predicted activation pattern */
  readonly predictedCentroid: Float32Array;
  /** Why the system thinks this should exist */
  readonly reason: string;
  /** The geometric gap that generated this hypothesis */
  readonly gapType: "mirror-missing" | "domain-sparse" | "role-sparse" | "interpolation";
  /** Confidence (0-1) */
  readonly confidence: number;
  /** Suggested domain */
  readonly domain: SemanticDomain;
  /** Suggested role */
  readonly role: ThematicRole;
}

/**
 * Configuration for the ontogenesis engine.
 */
export interface OntogenesisConfig {
  /** Min observations before a pattern can nucleate (default: 3) */
  readonly nucleationThreshold: number;
  /** Min cosine similarity for two traces to be "same pattern" (default: 0.7) */
  readonly patternSimilarity: number;
  /** Min stability for a crystal to be considered solid (default: 0.6) */
  readonly stabilityThreshold: number;
  /** Max traces to keep in buffer (default: 512) */
  readonly traceBufferSize: number;
  /** How often to run crystallization sweep (in ticks, default: 10) */
  readonly crystallizationInterval: number;
  /** How often to run gap detection (in ticks, default: 50) */
  readonly gapDetectionInterval: number;
  /** Min energy for a vertex to be considered "active" (default: 0.1) */
  readonly activationThreshold: number;
  /** Max concepts the engine can hold (default: 1024) */
  readonly maxConcepts: number;
}

export const DEFAULT_ONTOGENESIS_CONFIG: OntogenesisConfig = {
  nucleationThreshold: 3,
  patternSimilarity: 0.7,
  stabilityThreshold: 0.6,
  traceBufferSize: 512,
  crystallizationInterval: 10,
  gapDetectionInterval: 50,
  activationThreshold: 0.1,
  maxConcepts: 1024,
};

/**
 * Snapshot for diagnostics.
 */
export interface OntogenesisSnapshot {
  readonly conceptCount: number;
  readonly relationCount: number;
  readonly traceBufferUsage: number;
  readonly totalObservations: number;
  readonly lastCrystallizationTick: number;
  readonly hypothesesPending: number;
  readonly domainCoverage: Record<string, number>;
  readonly meanStability: number;
  readonly selfGeneratedCount: number;
}

// ══════════════════════════════════════════════════════════════
// §2  Geometric Utilities
// ══════════════════════════════════════════════════════════════

function l2Norm(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 96; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 1e-12 ? dot / d : 0;
}

function peakVertex(a: Float32Array): number {
  let max = 0, idx = 0;
  for (let i = 0; i < 96; i++) {
    if (Math.abs(a[i]) > max) { max = Math.abs(a[i]); idx = i; }
  }
  return idx;
}

function vertexToDomainRole(v: number): { domain: SemanticDomain; role: ThematicRole } {
  return {
    domain: SEMANTIC_DOMAINS[Math.floor(v / 8)],
    role: THEMATIC_ROLES[v % 8],
  };
}

/** Generate a short concept ID */
function conceptId(tick: number, vertex: number): string {
  return `c_${tick.toString(36)}_v${vertex}`;
}

/**
 * Auto-label a concept from its dominant domain and role.
 * Produces labels like "entity.agent", "epistemic.theme"
 * until the observer provides a better name.
 */
function autoLabel(domain: SemanticDomain, role: ThematicRole, idx: number): string {
  return `${domain}.${role}#${idx}`;
}

// ══════════════════════════════════════════════════════════════
// §3  Trace Clustering — Finding Recurring Patterns
// ══════════════════════════════════════════════════════════════

interface TraceCluster {
  centroid: Float32Array;
  members: number[]; // indices into trace buffer
  count: number;
  stability: number; // mean pairwise similarity
  lastTick: number;
}

/**
 * Single-pass incremental clustering of activation traces.
 * Uses a nearest-centroid approach with a similarity threshold.
 */
function clusterTraces(
  traces: ActivationTrace[],
  threshold: number,
): TraceCluster[] {
  const clusters: TraceCluster[] = [];

  for (let i = 0; i < traces.length; i++) {
    const t = traces[i];
    let bestCluster = -1;
    let bestSim = -1;

    // Find nearest existing cluster
    for (let c = 0; c < clusters.length; c++) {
      const sim = cosine(t.activations, clusters[c].centroid);
      if (sim > bestSim) { bestSim = sim; bestCluster = c; }
    }

    if (bestSim >= threshold && bestCluster >= 0) {
      // Add to existing cluster and update centroid (running average)
      const cl = clusters[bestCluster];
      const n = cl.count;
      for (let j = 0; j < 96; j++) {
        cl.centroid[j] = (cl.centroid[j] * n + t.activations[j]) / (n + 1);
      }
      cl.members.push(i);
      cl.count++;
      cl.lastTick = Math.max(cl.lastTick, t.tick);

      // Update stability (exponential moving average of pairwise similarity)
      cl.stability = cl.stability * 0.9 + bestSim * 0.1;
    } else {
      // New cluster
      const centroid = new Float32Array(96);
      centroid.set(t.activations);
      clusters.push({
        centroid,
        members: [i],
        count: 1,
        stability: 1.0,
        lastTick: t.tick,
      });
    }
  }

  return clusters;
}

// ══════════════════════════════════════════════════════════════
// §4  Ontogenesis Engine
// ══════════════════════════════════════════════════════════════

export class OntogenesisEngine {
  private readonly config: OntogenesisConfig;

  // The ontology
  private readonly concepts = new Map<string, ConceptCrystal>();
  private readonly relations: OntologyRelation[] = [];
  private readonly hypotheses: ConceptHypothesis[] = [];

  // Observation buffer
  private readonly traceBuffer: ActivationTrace[] = [];
  private tick = 0;
  private totalObservations = 0;
  private lastCrystallizationTick = 0;
  private lastGapDetectionTick = 0;

  // Event callbacks
  private onCrystallize?: (crystal: ConceptCrystal) => void;
  private onRelation?: (relation: OntologyRelation) => void;
  private onHypothesis?: (hypothesis: ConceptHypothesis) => void;

  constructor(config: Partial<OntogenesisConfig> = {}) {
    this.config = { ...DEFAULT_ONTOGENESIS_CONFIG, ...config };
  }

  // ── Event Subscription ──────────────────────────────────

  onConceptCrystallized(cb: (crystal: ConceptCrystal) => void): void {
    this.onCrystallize = cb;
  }

  onRelationDiscovered(cb: (relation: OntologyRelation) => void): void {
    this.onRelation = cb;
  }

  onConceptHypothesized(cb: (hypothesis: ConceptHypothesis) => void): void {
    this.onHypothesis = cb;
  }

  // ── Observation ─────────────────────────────────────────

  /**
   * Observe an activation pattern from the manifold.
   * This is the primary input — called during inference,
   * during user interaction, or from any coherence operation.
   *
   * The engine accumulates observations and periodically
   * attempts crystallization (pattern → concept).
   */
  observe(activations: Float32Array, hScore: number, sourceLabel?: string): void {
    this.tick++;
    this.totalObservations++;

    // Only record if the pattern has meaningful energy
    const norm = l2Norm(activations);
    if (norm < 0.01) return;

    // Normalize before storing
    const normalized = new Float32Array(96);
    for (let i = 0; i < 96; i++) normalized[i] = activations[i] / norm;

    this.traceBuffer.push({
      activations: normalized,
      tick: this.tick,
      sourceLabel,
      hScore,
    });

    // Enforce buffer limit (FIFO)
    while (this.traceBuffer.length > this.config.traceBufferSize) {
      this.traceBuffer.shift();
    }

    // Reinforce existing concepts if this observation matches one
    this.reinforceMatching(normalized);

    // Periodic crystallization attempt
    if (this.tick - this.lastCrystallizationTick >= this.config.crystallizationInterval) {
      this.crystallize();
      this.lastCrystallizationTick = this.tick;
    }

    // Periodic gap detection (less frequent)
    if (this.tick - this.lastGapDetectionTick >= this.config.gapDetectionInterval) {
      this.detectGaps();
      this.lastGapDetectionTick = this.tick;
    }
  }

  /**
   * Observer seeds a concept explicitly.
   * The observer can name patterns they recognize,
   * bootstrapping the ontology with guided knowledge.
   */
  seedConcept(label: string, activations: Float32Array): ConceptCrystal {
    const norm = l2Norm(activations);
    const normalized = new Float32Array(96);
    for (let i = 0; i < 96; i++) normalized[i] = norm > 1e-12 ? activations[i] / norm : 0;

    const v = peakVertex(normalized);
    const { domain, role } = vertexToDomainRole(v);
    const id = conceptId(this.tick, v);

    const sig = this.centroidToSignature(label, normalized, domain, role);

    const crystal: ConceptCrystal = {
      id,
      label,
      centroid: normalized,
      signature: sig,
      domain,
      role,
      observationCount: 1,
      stability: 1.0,
      nucleatedAt: this.tick,
      lastReinforcedAt: this.tick,
      origin: "observer",
    };

    this.concepts.set(id, crystal);
    this.growRelations(crystal);
    this.onCrystallize?.(crystal);

    return crystal;
  }

  // ── Crystallization ─────────────────────────────────────

  /**
   * Attempt to crystallize new concepts from the trace buffer.
   *
   * Clusters the accumulated traces and promotes clusters
   * that have enough observations and sufficient stability
   * into full ConceptCrystals.
   */
  private crystallize(): void {
    if (this.traceBuffer.length < this.config.nucleationThreshold) return;
    if (this.concepts.size >= this.config.maxConcepts) return;

    const clusters = clusterTraces(this.traceBuffer, this.config.patternSimilarity);

    for (const cluster of clusters) {
      // Check nucleation threshold
      if (cluster.count < this.config.nucleationThreshold) continue;
      if (cluster.stability < this.config.stabilityThreshold) continue;

      // Check if this pattern already matches an existing concept
      let alreadyExists = false;
      for (const existing of this.concepts.values()) {
        if (cosine(cluster.centroid, existing.centroid) > this.config.patternSimilarity) {
          alreadyExists = true;
          break;
        }
      }
      if (alreadyExists) continue;

      // Nucleate!
      const v = peakVertex(cluster.centroid);
      const { domain, role } = vertexToDomainRole(v);
      const id = conceptId(this.tick, v);

      // Auto-label from most common source label in cluster, or geometric position
      const sourceLabels = cluster.members
        .map(i => this.traceBuffer[i]?.sourceLabel)
        .filter(Boolean) as string[];
      const label = sourceLabels.length > 0
        ? mostFrequent(sourceLabels)
        : autoLabel(domain, role, this.concepts.size);

      const sig = this.centroidToSignature(label, cluster.centroid, domain, role);

      const crystal: ConceptCrystal = {
        id,
        label,
        centroid: cluster.centroid,
        signature: sig,
        domain,
        role,
        observationCount: cluster.count,
        stability: cluster.stability,
        nucleatedAt: this.tick,
        lastReinforcedAt: cluster.lastTick,
        origin: "crystallized",
      };

      this.concepts.set(id, crystal);
      this.growRelations(crystal);
      this.onCrystallize?.(crystal);
    }
  }

  /**
   * Reinforce existing concepts when a matching observation arrives.
   * Like Hebbian learning: neurons that fire together wire together.
   */
  private reinforceMatching(activations: Float32Array): void {
    for (const crystal of this.concepts.values()) {
      const sim = cosine(activations, crystal.centroid);
      if (sim > this.config.patternSimilarity) {
        crystal.observationCount++;
        crystal.lastReinforcedAt = this.tick;
        // Slowly update centroid toward new observation (Hebbian drift)
        const alpha = 0.05;
        for (let i = 0; i < 96; i++) {
          (crystal.centroid as Float32Array)[i] =
            crystal.centroid[i] * (1 - alpha) + activations[i] * alpha;
        }
        // Re-normalize
        const norm = l2Norm(crystal.centroid);
        if (norm > 1e-12) {
          for (let i = 0; i < 96; i++) {
            (crystal.centroid as Float32Array)[i] /= norm;
          }
        }
        // Update stability (running average of match quality)
        crystal.stability = crystal.stability * 0.95 + sim * 0.05;
      }
    }
  }

  // ── Relation Growth ─────────────────────────────────────

  /**
   * Discover relations between a new concept and all existing ones.
   *
   * Relations are geometric properties of the concept pair:
   * - Entailment: pattern containment
   * - Contradiction: τ-mirror collision
   * - Composition: constructive interference
   * - Complement: activates complementary roles
   * - Mirror: τ-dual pair
   * - Sibling: same domain, different role
   */
  private growRelations(newCrystal: ConceptCrystal): void {
    for (const existing of this.concepts.values()) {
      if (existing.id === newCrystal.id) continue;

      // Check all relation types
      const sim = cosine(newCrystal.centroid, existing.centroid);

      // Sibling: same domain
      if (newCrystal.domain === existing.domain && newCrystal.role !== existing.role) {
        this.addRelation(newCrystal.id, existing.id, "sibling", Math.abs(sim), sim);
      }

      // Mirror: τ-dual (peak vertices are 48 apart)
      const vNew = peakVertex(newCrystal.centroid);
      const vExisting = peakVertex(existing.centroid);
      if (Math.abs(vNew - vExisting) === 48 || Math.abs(vNew - vExisting) === 48) {
        this.addRelation(newCrystal.id, existing.id, "mirrors", 0.8, sim);
      }

      // Complement: complementary roles (agent↔patient, source↔goal)
      const roleComplements: Record<string, string> = {
        agent: "patient", patient: "agent",
        source: "goal", goal: "source",
        theme: "experiencer", experiencer: "theme",
        instrument: "beneficiary", beneficiary: "instrument",
      };
      if (roleComplements[newCrystal.role] === existing.role) {
        this.addRelation(newCrystal.id, existing.id, "complements", 0.7, sim);
      }

      // Entailment & Contradiction (use semantic kernel operations)
      const entailment = checkEntailment(newCrystal.signature, existing.signature);
      if (entailment.entails) {
        this.addRelation(newCrystal.id, existing.id, "entails", entailment.confidence, sim);
      }

      const contradiction = detectContradiction(newCrystal.signature, existing.signature);
      if (contradiction.contradicts) {
        this.addRelation(newCrystal.id, existing.id, "contradicts", 
          Math.min(1, contradiction.collisionEnergy), sim);
      }

      // Composition: try composing and check for constructive interference
      if (sim > 0.2 && sim < 0.9) { // Not too similar (redundant) or too different (noise)
        const comp = compose(newCrystal.signature, existing.signature);
        if (comp.constructive) {
          this.addRelation(newCrystal.id, existing.id, "composes", comp.coherence, comp.coherence);
        }
      }
    }
  }

  private addRelation(from: string, to: string, kind: RelationKind, strength: number, coherence: number): void {
    // Avoid duplicate relations
    const exists = this.relations.some(r =>
      r.from === from && r.to === to && r.kind === kind
    );
    if (exists) return;

    const rel: OntologyRelation = {
      from, to, kind, strength,
      compositionCoherence: coherence,
    };
    this.relations.push(rel);
    this.onRelation?.(rel);
  }

  // ── Gap Detection — Periodic Table Interpolation ────────

  /**
   * Detect geometric gaps in the ontology and hypothesize
   * missing concepts.
   *
   * Three gap types:
   * 1. Mirror-missing: concept exists at v but not at v+48
   *    → predicts the τ-dual concept
   * 2. Domain-sparse: a domain has few concepts
   *    → predicts concepts should exist there
   * 3. Interpolation: two related concepts lack a "bridge"
   *    → predicts an intermediate concept
   */
  private detectGaps(): void {
    this.hypotheses.length = 0; // Clear old hypotheses

    // 1. Mirror-missing gaps
    this.detectMirrorGaps();

    // 2. Domain sparsity gaps
    this.detectDomainGaps();

    // 3. Interpolation gaps
    this.detectInterpolationGaps();
  }

  private detectMirrorGaps(): void {
    for (const crystal of this.concepts.values()) {
      const v = peakVertex(crystal.centroid);
      const mv = (v + 48) % 96;

      // Does a concept exist at the mirror vertex?
      let hasMirror = false;
      for (const other of this.concepts.values()) {
        if (peakVertex(other.centroid) === mv) { hasMirror = true; break; }
      }

      if (!hasMirror && crystal.stability > this.config.stabilityThreshold) {
        // Predict the mirror concept
        const predicted = new Float32Array(96);
        for (let i = 0; i < 48; i++) {
          predicted[i + 48] = crystal.centroid[i];
          predicted[i] = crystal.centroid[i + 48];
        }
        const { domain, role } = vertexToDomainRole(mv);

        this.hypotheses.push({
          predictedCentroid: predicted,
          reason: `τ-mirror dual of "${crystal.label}" (v${v} → v${mv})`,
          gapType: "mirror-missing",
          confidence: crystal.stability * 0.8,
          domain, role,
        });
        this.onHypothesis?.(this.hypotheses[this.hypotheses.length - 1]);
      }
    }
  }

  private detectDomainGaps(): void {
    // Count concepts per domain
    const domainCount = new Map<SemanticDomain, number>();
    for (const d of SEMANTIC_DOMAINS) domainCount.set(d, 0);
    for (const c of this.concepts.values()) {
      domainCount.set(c.domain, (domainCount.get(c.domain) || 0) + 1);
    }

    if (this.concepts.size < 6) return; // Too few concepts to detect sparsity

    const mean = this.concepts.size / 12;

    for (const [domain, count] of domainCount) {
      if (count < mean * 0.3 && count < 2) {
        // This domain is notably sparse — predict a concept should exist
        const dIdx = SEMANTIC_DOMAINS.indexOf(domain);
        const predicted = new Float32Array(96);
        // Uniform activation across all roles in this domain
        for (let r = 0; r < 8; r++) {
          predicted[dIdx * 8 + r] = 1.0 / Math.sqrt(8);
        }

        this.hypotheses.push({
          predictedCentroid: predicted,
          reason: `Domain "${domain}" has only ${count} concepts (mean: ${mean.toFixed(1)})`,
          gapType: "domain-sparse",
          confidence: Math.min(0.9, mean / (count + 1) * 0.3),
          domain,
          role: "theme", // Default
        });
        this.onHypothesis?.(this.hypotheses[this.hypotheses.length - 1]);
      }
    }
  }

  private detectInterpolationGaps(): void {
    // Find pairs of concepts that compose well but have no intermediate concept
    const conceptList = [...this.concepts.values()];

    for (let i = 0; i < conceptList.length; i++) {
      for (let j = i + 1; j < conceptList.length; j++) {
        const a = conceptList[i];
        const b = conceptList[j];
        const sim = cosine(a.centroid, b.centroid);

        // Look for "medium distance" pairs (related but distinct)
        if (sim > 0.3 && sim < 0.6) {
          // Does an intermediate concept exist?
          const midpoint = new Float32Array(96);
          for (let k = 0; k < 96; k++) {
            midpoint[k] = (a.centroid[k] + b.centroid[k]) / 2;
          }
          const midNorm = l2Norm(midpoint);
          if (midNorm > 1e-12) {
            for (let k = 0; k < 96; k++) midpoint[k] /= midNorm;
          }

          // Check if any existing concept is near the midpoint
          let hasIntermediate = false;
          for (const c of conceptList) {
            if (cosine(midpoint, c.centroid) > 0.75) { hasIntermediate = true; break; }
          }

          if (!hasIntermediate) {
            const v = peakVertex(midpoint);
            const { domain, role } = vertexToDomainRole(v);

            this.hypotheses.push({
              predictedCentroid: midpoint,
              reason: `Interpolation between "${a.label}" and "${b.label}" (sim: ${sim.toFixed(2)})`,
              gapType: "interpolation",
              confidence: sim * 0.6,
              domain, role,
            });
            this.onHypothesis?.(this.hypotheses[this.hypotheses.length - 1]);
          }
        }
      }
    }
  }

  // ── Self-Propagation ────────────────────────────────────

  /**
   * Promote the highest-confidence hypothesis to a real concept.
   * This is how the ontology grows autonomously.
   *
   * Returns the new crystal if one was promoted, undefined otherwise.
   */
  propagate(): ConceptCrystal | undefined {
    if (this.hypotheses.length === 0) return undefined;
    if (this.concepts.size >= this.config.maxConcepts) return undefined;

    // Find highest-confidence hypothesis
    let best = this.hypotheses[0];
    let bestIdx = 0;
    for (let i = 1; i < this.hypotheses.length; i++) {
      if (this.hypotheses[i].confidence > best.confidence) {
        best = this.hypotheses[i];
        bestIdx = i;
      }
    }

    // Only promote if confidence is sufficient
    if (best.confidence < 0.4) return undefined;

    const v = peakVertex(best.predictedCentroid);
    const id = conceptId(this.tick, v);
    const label = autoLabel(best.domain, best.role, this.concepts.size);

    const sig = this.centroidToSignature(label, best.predictedCentroid, best.domain, best.role);

    const crystal: ConceptCrystal = {
      id,
      label,
      centroid: best.predictedCentroid,
      signature: sig,
      domain: best.domain,
      role: best.role,
      observationCount: 0,
      stability: best.confidence,
      nucleatedAt: this.tick,
      lastReinforcedAt: this.tick,
      origin: "interpolated",
    };

    this.concepts.set(id, crystal);
    this.growRelations(crystal);
    this.hypotheses.splice(bestIdx, 1);
    this.onCrystallize?.(crystal);

    return crystal;
  }

  // ── Domain Projection ───────────────────────────────────

  /**
   * Project the current ontology onto a specific domain.
   *
   * Returns all concepts and relations relevant to that domain,
   * enabling the system to "focus" its ontology on any topic
   * the observer wishes to explore.
   */
  projectOntoDomain(domain: SemanticDomain): {
    concepts: ConceptCrystal[];
    relations: OntologyRelation[];
    coverage: number;
  } {
    const domainConcepts = [...this.concepts.values()].filter(c => c.domain === domain);
    const conceptIds = new Set(domainConcepts.map(c => c.id));

    // Include relations that touch domain concepts
    const domainRelations = this.relations.filter(r =>
      conceptIds.has(r.from) || conceptIds.has(r.to)
    );

    // Coverage: how many of the 8 roles are represented?
    const rolesPresent = new Set(domainConcepts.map(c => c.role));
    const coverage = rolesPresent.size / 8;

    return { concepts: domainConcepts, relations: domainRelations, coverage };
  }

  // ── Query Interface ─────────────────────────────────────

  /** Get all concepts */
  getAllConcepts(): ConceptCrystal[] {
    return [...this.concepts.values()];
  }

  /** Get all relations */
  getAllRelations(): OntologyRelation[] {
    return [...this.relations];
  }

  /** Get pending hypotheses */
  getHypotheses(): ConceptHypothesis[] {
    return [...this.hypotheses];
  }

  /** Find concepts similar to an activation pattern */
  findSimilar(activations: Float32Array, topK: number = 5): ConceptCrystal[] {
    const scored = [...this.concepts.values()]
      .map(c => ({ crystal: c, sim: cosine(activations, c.centroid) }))
      .sort((a, b) => b.sim - a.sim);
    return scored.slice(0, topK).map(s => s.crystal);
  }

  /** Get concept by ID */
  getConcept(id: string): ConceptCrystal | undefined {
    return this.concepts.get(id);
  }

  /** Get relations for a concept */
  getRelationsFor(conceptId: string): OntologyRelation[] {
    return this.relations.filter(r => r.from === conceptId || r.to === conceptId);
  }

  /** Rename a concept (observer refinement) */
  renameConcept(id: string, newLabel: string): boolean {
    const c = this.concepts.get(id);
    if (!c) return false;
    c.label = newLabel;
    return true;
  }

  // ── Diagnostics ─────────────────────────────────────────

  getSnapshot(): OntogenesisSnapshot {
    const domainCoverage: Record<string, number> = {};
    for (const d of SEMANTIC_DOMAINS) domainCoverage[d] = 0;
    let totalStability = 0;
    let selfGenerated = 0;

    for (const c of this.concepts.values()) {
      domainCoverage[c.domain] = (domainCoverage[c.domain] || 0) + 1;
      totalStability += c.stability;
      if (c.origin !== "observer") selfGenerated++;
    }

    return {
      conceptCount: this.concepts.size,
      relationCount: this.relations.length,
      traceBufferUsage: this.traceBuffer.length / this.config.traceBufferSize,
      totalObservations: this.totalObservations,
      lastCrystallizationTick: this.lastCrystallizationTick,
      hypothesesPending: this.hypotheses.length,
      domainCoverage,
      meanStability: this.concepts.size > 0 ? totalStability / this.concepts.size : 0,
      selfGeneratedCount: selfGenerated,
    };
  }

  // ── Private Helpers ─────────────────────────────────────

  private centroidToSignature(
    label: string,
    centroid: Float32Array,
    domain: SemanticDomain,
    role: ThematicRole,
  ): SemanticSignature {
    return {
      label,
      activations: new Float32Array(centroid),
      domain,
      defaultRole: role,
      primes: new Set(),
      norm: l2Norm(centroid),
    };
  }
}

// ── Utility ───────────────────────────────────────────────

function mostFrequent(arr: string[]): string {
  const counts = new Map<string, number>();
  let best = arr[0], bestCount = 0;
  for (const s of arr) {
    const c = (counts.get(s) || 0) + 1;
    counts.set(s, c);
    if (c > bestCount) { bestCount = c; best = s; }
  }
  return best;
}
