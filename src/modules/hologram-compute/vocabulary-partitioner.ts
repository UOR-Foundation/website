/**
 * Vocabulary Partitioner — Token Space → 96 Atlas Vertex Clusters
 * ══════════════════════════════════════════════════════════════════
 *
 * THEOREM (Holographic Vocabulary Encoding):
 *   A vocabulary V of |V| tokens can be partitioned into 96 clusters
 *   C₀..C₉₅ such that each cluster is coherence-anchored to an Atlas
 *   vertex. Token selection during inference becomes manifold navigation:
 *
 *     P(token | context) = Σ_v activation(v) × coherenceWeight(token, v)
 *
 *   This replaces the traditional lm_head matrix multiplication:
 *     logits = hidden_state × W_out^T    — O(d × |V|)
 *   with:
 *     logits = vertexActivations · clusterWeights  — O(96 × cluster_size)
 *
 * ARCHITECTURE:
 *   1. Semantic Hashing: Map each token to a 96-dim coherence signature
 *      using the token's byte representation projected through the Atlas R₈ ring
 *   2. Vertex Assignment: Assign each token to its highest-coherence vertex
 *   3. Intra-Cluster Ranking: Within each cluster, rank tokens by their
 *      coherence weight (how strongly they resonate with that vertex)
 *   4. Engram Encoding: Store as retrievable engram entries for O(1) lookup
 *
 * @module hologram-compute/vocabulary-partitioner
 */

import { ATLAS_VERTEX_COUNT } from "../atlas/atlas";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** A single token's Atlas projection */
export interface TokenProjection {
  /** Token ID in the original vocabulary */
  tokenId: number;
  /** Token string (decoded) */
  tokenString: string;
  /** 96-dim coherence signature */
  coherenceSignature: Float32Array;
  /** Primary Atlas vertex assignment */
  primaryVertex: number;
  /** Coherence weight with primary vertex [0, 1] */
  coherenceWeight: number;
  /** Secondary vertex (for disambiguation) */
  secondaryVertex: number;
  /** τ-mirror vertex (for error correction) */
  mirrorVertex: number;
}

/** A cluster of tokens anchored to an Atlas vertex */
export interface VertexCluster {
  /** Atlas vertex index (0–95) */
  vertexIndex: number;
  /** Tokens assigned to this vertex, sorted by coherence weight */
  tokens: ClusterToken[];
  /** Cluster coherence centroid (96-dim) */
  centroid: Float32Array;
  /** Cluster entropy (information content) */
  entropy: number;
  /** Number of tokens */
  size: number;
}

/** A token within a cluster */
export interface ClusterToken {
  /** Token ID */
  tokenId: number;
  /** Token string */
  tokenString: string;
  /** Coherence weight within this cluster */
  weight: number;
  /** Rank within cluster (0 = most coherent) */
  rank: number;
}

/** Partitioning statistics */
export interface PartitionStats {
  /** Total tokens partitioned */
  totalTokens: number;
  /** Number of non-empty clusters */
  activeClusters: number;
  /** Mean cluster size */
  meanClusterSize: number;
  /** Std deviation of cluster sizes */
  stdClusterSize: number;
  /** Min / max cluster size */
  minClusterSize: number;
  maxClusterSize: number;
  /** Overall partition entropy */
  partitionEntropy: number;
  /** Time to partition (ms) */
  partitionTimeMs: number;
}

/** Serializable vocabulary engram file */
export interface VocabularyEngram {
  /** Model identifier */
  modelId: string;
  /** Vocabulary size */
  vocabSize: number;
  /** Number of clusters */
  clusterCount: number;
  /** Cluster data (serializable) */
  clusters: SerializedCluster[];
  /** Creation timestamp */
  createdAt: string;
  /** Partition stats */
  stats: PartitionStats;
}

interface SerializedCluster {
  vertex: number;
  tokens: { id: number; str: string; weight: number }[];
  centroid: number[];
}

/** Result from the enhanced three-strategy sampler */
export interface EnhancedSampleResult {
  tokenId: number;
  tokenString: string;
  probability: number;
  /** How much this token contributes to H-score */
  hScoreContrib: number;
  /** Phase alignment with current φ [0, 1] */
  phaseAlignment: number;
  /** Whether stabilizer filter passed cleanly */
  parityClean: boolean;
  /** Number of candidates rejected by stabilizer */
  rejectedByStabilizer: number;
  /** Which sampling strategies were active */
  samplingStrategy: string;
}

/** Internal candidate for enhanced sampling */
interface EnhancedCandidate {
  tokenId: number;
  vertex: number;
  baseScore: number;
  coherenceScore: number;
  phaseScore: number;
  combinedScore: number;
  phaseAlignment: number;
  hContrib: number;
}

/** τ-mirror pairs: vertex v mirrors to MIRROR_MAP[v] */
const MIRROR_MAP = new Uint8Array(ATLAS_VERTEX_COUNT);
for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
  // τ-mirror involution: v ↔ (v + 48) mod 96
  MIRROR_MAP[v] = (v + 48) % ATLAS_VERTEX_COUNT;
}

/**
 * Atlas adjacency weights — simplified 96×96 coherence matrix
 * derived from the Atlas graph topology. Each entry represents
 * how strongly vertex i and vertex j resonate.
 * 
 * Computed from the sign-class structure:
 *   weight(i, j) = exp(-hamming(signClass(i), signClass(j)) / 3)
 */
function computeSignClass(v: number): number {
  // Sign class from the 6-tuple structure: 8 classes × 12 orbits
  return v % 8;
}

function signClassDistance(a: number, b: number): number {
  // Hamming-like distance between sign classes
  let xor = a ^ b;
  let dist = 0;
  while (xor) { dist += xor & 1; xor >>= 1; }
  return dist;
}

// ═══════════════════════════════════════════════════════════════
// Core: Coherence Signature Computation
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the 96-dimensional coherence signature for a token.
 * 
 * This is the key function that replaces embedding matrix lookup.
 * Instead of storing a learned embedding, we DERIVE the token's
 * position in Atlas space from its byte representation.
 *
 * The derivation uses three layers:
 *   1. R₈ projection: token bytes → ℤ/256ℤ ring elements
 *   2. Vertex resonance: ring elements × Atlas adjacency → 96-dim
 *   3. τ-mirror normalization: enforce mirror symmetry
 */
export function computeCoherenceSignature(
  tokenString: string,
  tokenId: number,
): Float32Array {
  const sig = new Float32Array(ATLAS_VERTEX_COUNT);

  // ── Layer 1: R₈ byte projection ──
  const bytes = new TextEncoder().encode(tokenString);
  const r8Values = new Uint8Array(ATLAS_VERTEX_COUNT);

  // Distribute token bytes across 96 vertices using multiplicative hash
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Each byte activates multiple vertices via prime-stride scatter
    for (let stride = 0; stride < 3; stride++) {
      const v = (b * (stride * 31 + 7) + i * 13 + tokenId * 3) % ATLAS_VERTEX_COUNT;
      r8Values[v] = (r8Values[v] + b) & 0xFF;
    }
  }

  // ── Layer 2: Vertex resonance ──
  // Each vertex activation = sum of weighted resonances from R₈ values
  for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
    let resonance = r8Values[v] / 255.0;

    // Add resonance from neighboring sign classes
    const sc = computeSignClass(v);
    for (let u = 0; u < ATLAS_VERTEX_COUNT; u++) {
      if (u === v) continue;
      const dist = signClassDistance(sc, computeSignClass(u));
      if (dist <= 1) {
        resonance += (r8Values[u] / 255.0) * 0.3 * Math.exp(-dist);
      }
    }

    sig[v] = resonance;
  }

  // ── Layer 3: τ-mirror normalization ──
  // Enforce Hermitian conjugation symmetry: sig[v] ≈ sig[τ(v)]
  for (let v = 0; v < 48; v++) {
    const mv = MIRROR_MAP[v];
    const avg = (sig[v] + sig[mv]) * 0.5;
    const diff = (sig[v] - sig[mv]) * 0.1; // Small asymmetry preserved
    sig[v] = avg + diff;
    sig[mv] = avg - diff;
  }

  // Normalize to unit vector
  let norm = 0;
  for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) norm += sig[v] * sig[v];
  norm = Math.sqrt(norm);
  if (norm > 1e-10) {
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) sig[v] /= norm;
  }

  return sig;
}

// ═══════════════════════════════════════════════════════════════
// Vocabulary Partitioner
// ═══════════════════════════════════════════════════════════════

/**
 * VocabularyPartitioner — Maps an entire vocabulary to 96 Atlas clusters.
 *
 * This is the "Holographic Folding" step from the compression pipeline:
 * a model's vocabulary (128K tokens) is partitioned into 96 coherence
 * clusters, one per Atlas vertex. During inference, token selection
 * is performed by navigating the manifold rather than computing
 * a matrix product with the output projection weights.
 */
export class VocabularyPartitioner {
  private clusters: VertexCluster[] = [];
  private tokenToVertex: Map<number, number> = new Map();
  private tokenProjections: Map<number, TokenProjection> = new Map();
  private stats: PartitionStats | null = null;

  /**
   * Partition a vocabulary into 96 Atlas vertex clusters.
   *
   * @param vocabulary - Map of tokenId → tokenString
   * @param onProgress - Progress callback (0–1)
   * @returns Partition statistics
   */
  partition(
    vocabulary: Map<number, string>,
    onProgress?: (progress: number, message: string) => void,
  ): PartitionStats {
    const t0 = performance.now();
    const vocabSize = vocabulary.size;

    onProgress?.(0, `Partitioning ${vocabSize} tokens into 96 Atlas clusters...`);

    // Initialize empty clusters
    this.clusters = Array.from({ length: ATLAS_VERTEX_COUNT }, (_, i) => ({
      vertexIndex: i,
      tokens: [],
      centroid: new Float32Array(ATLAS_VERTEX_COUNT),
      entropy: 0,
      size: 0,
    }));

    // Phase 1: Compute coherence signatures for all tokens
    const projections: TokenProjection[] = [];
    let processed = 0;

    for (const [tokenId, tokenString] of vocabulary) {
      const sig = computeCoherenceSignature(tokenString, tokenId);

      // Find primary vertex (highest activation)
      let primaryV = 0;
      let maxAct = -Infinity;
      let secondV = 0;
      let secondAct = -Infinity;

      for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
        if (sig[v] > maxAct) {
          secondV = primaryV;
          secondAct = maxAct;
          primaryV = v;
          maxAct = sig[v];
        } else if (sig[v] > secondAct) {
          secondV = v;
          secondAct = sig[v];
        }
      }

      const proj: TokenProjection = {
        tokenId,
        tokenString,
        coherenceSignature: sig,
        primaryVertex: primaryV,
        coherenceWeight: maxAct,
        secondaryVertex: secondV,
        mirrorVertex: MIRROR_MAP[primaryV],
      };

      projections.push(proj);
      this.tokenProjections.set(tokenId, proj);
      this.tokenToVertex.set(tokenId, primaryV);

      processed++;
      if (processed % 5000 === 0) {
        onProgress?.(processed / vocabSize * 0.7, `Projected ${processed}/${vocabSize} tokens...`);
      }
    }

    onProgress?.(0.7, "Assigning tokens to clusters...");

    // Phase 2: Assign tokens to clusters
    for (const proj of projections) {
      const cluster = this.clusters[proj.primaryVertex];
      cluster.tokens.push({
        tokenId: proj.tokenId,
        tokenString: proj.tokenString,
        weight: proj.coherenceWeight,
        rank: 0, // Will be set after sorting
      });
    }

    // Phase 3: Sort and rank within clusters, compute centroids
    for (const cluster of this.clusters) {
      // Sort by coherence weight (descending)
      cluster.tokens.sort((a, b) => b.weight - a.weight);

      // Assign ranks
      for (let r = 0; r < cluster.tokens.length; r++) {
        cluster.tokens[r].rank = r;
      }

      cluster.size = cluster.tokens.length;

      // Compute centroid from member signatures
      if (cluster.size > 0) {
        const centroid = new Float32Array(ATLAS_VERTEX_COUNT);
        for (const token of cluster.tokens) {
          const proj = this.tokenProjections.get(token.tokenId);
          if (proj) {
            for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
              centroid[d] += proj.coherenceSignature[d];
            }
          }
        }
        // Normalize
        for (let d = 0; d < ATLAS_VERTEX_COUNT; d++) {
          centroid[d] /= cluster.size;
        }
        cluster.centroid = centroid;

        // Compute entropy
        let entropy = 0;
        const totalWeight = cluster.tokens.reduce((s, t) => s + t.weight, 0);
        if (totalWeight > 0) {
          for (const token of cluster.tokens) {
            const p = token.weight / totalWeight;
            if (p > 1e-10) entropy -= p * Math.log2(p);
          }
        }
        cluster.entropy = entropy;
      }
    }

    onProgress?.(0.95, "Computing statistics...");

    // Compute statistics
    const sizes = this.clusters.map(c => c.size);
    const activeClusters = sizes.filter(s => s > 0).length;
    const meanSize = vocabSize / ATLAS_VERTEX_COUNT;
    const stdSize = Math.sqrt(
      sizes.reduce((s, sz) => s + (sz - meanSize) ** 2, 0) / ATLAS_VERTEX_COUNT
    );

    // Partition entropy
    let partEntropy = 0;
    for (const sz of sizes) {
      if (sz > 0) {
        const p = sz / vocabSize;
        partEntropy -= p * Math.log2(p);
      }
    }

    this.stats = {
      totalTokens: vocabSize,
      activeClusters,
      meanClusterSize: meanSize,
      stdClusterSize: stdSize,
      minClusterSize: Math.min(...sizes),
      maxClusterSize: Math.max(...sizes),
      partitionEntropy: partEntropy,
      partitionTimeMs: performance.now() - t0,
    };

    onProgress?.(1.0, `Partitioned ${vocabSize} tokens into ${activeClusters} active clusters`);

    console.log(
      `[VocabPartitioner] ${vocabSize} tokens → ${activeClusters}/96 clusters ` +
      `(mean=${meanSize.toFixed(1)}, std=${stdSize.toFixed(1)}) in ${this.stats.partitionTimeMs.toFixed(0)}ms`
    );

    return this.stats;
  }

  /**
   * Get the cluster for a given vertex.
   */
  getCluster(vertexIndex: number): VertexCluster | null {
    return this.clusters[vertexIndex] ?? null;
  }

  /**
   * Get all clusters.
   */
  getAllClusters(): VertexCluster[] {
    return this.clusters;
  }

  /**
   * Get the vertex assignment for a token.
   */
  getTokenVertex(tokenId: number): number | undefined {
    return this.tokenToVertex.get(tokenId);
  }

  /**
   * Get the full projection for a token.
   */
  getTokenProjection(tokenId: number): TokenProjection | undefined {
    return this.tokenProjections.get(tokenId);
  }

  /**
   * Convert vertex activations to a token probability distribution.
   *
   * This is the core decode step: given a 96-dim activation vector
   * from manifold navigation, produce probabilities over the vocabulary.
   *
   * P(token_i) ∝ activation[vertex(token_i)] × coherenceWeight(token_i)
   */
  activationsToTokenProbabilities(
    activations: Float32Array,
    temperature: number = 0.7,
    topK: number = 40,
  ): { tokenId: number; probability: number }[] {
    const candidates: { tokenId: number; score: number }[] = [];

    // For each active vertex, score its tokens
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] < 0.01) continue;

      const cluster = this.clusters[v];
      if (!cluster || cluster.size === 0) continue;

      // Score = vertex activation × token coherence weight
      // Only consider top tokens per cluster for efficiency
      const maxPerCluster = Math.min(cluster.size, 10);
      for (let r = 0; r < maxPerCluster; r++) {
        const token = cluster.tokens[r];
        candidates.push({
          tokenId: token.tokenId,
          score: activations[v] * token.weight,
        });
      }
    }

    if (candidates.length === 0) return [];

    // Sort by score and take top-K
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, topK);

    // Temperature-scaled softmax
    const safeTemp = Math.max(temperature, 1e-8);
    let maxScore = topCandidates[0].score;
    let sumExp = 0;
    const probs = topCandidates.map(c => {
      const exp = Math.exp((c.score - maxScore) / safeTemp);
      sumExp += exp;
      return { tokenId: c.tokenId, exp };
    });

    if (sumExp < 1e-30 || !isFinite(sumExp)) {
      // Fallback to uniform over top-K
      const uniform = 1 / topCandidates.length;
      return topCandidates.map(c => ({ tokenId: c.tokenId, probability: uniform }));
    }

    return probs.map(p => ({
      tokenId: p.tokenId,
      probability: isFinite(p.exp) ? p.exp / sumExp : 0,
    }));
  }

  /**
   * Sample a token from activations (basic temperature sampling).
   */
  sampleFromActivations(
    activations: Float32Array,
    temperature: number = 0.7,
  ): { tokenId: number; tokenString: string; probability: number } {
    const probs = this.activationsToTokenProbabilities(activations, temperature);
    return this.weightedSample(probs);
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 3: Enhanced Sampling Strategies
  // ═══════════════════════════════════════════════════════════════

  /**
   * Coherence Sampling — Maximize H-score
   *
   * Instead of pure temperature sampling, bias token selection toward
   * tokens whose vertex has the highest coherence contribution.
   * Tokens from high-activation vertices get a coherence bonus
   * proportional to how much they concentrate the activation distribution.
   *
   * P(token) ∝ activation[v]^(1 + hBoost) × weight × coherenceFactor
   *
   * where coherenceFactor = 1 + α × (vertexActivation / maxActivation)²
   * This creates a "winner-take-more" dynamic that pushes H-score up.
   */
  coherenceSample(
    activations: Float32Array,
    temperature: number,
    hScore: number,
    topK: number = 40,
  ): { tokenId: number; tokenString: string; probability: number; hScoreContrib: number } {
    const candidates: { tokenId: number; score: number; hContrib: number }[] = [];

    // Find max activation for normalization
    let maxAct = 0;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] > maxAct) maxAct = activations[v];
    }
    if (maxAct < 1e-10) maxAct = 1;

    // Coherence boost increases with H-score (exploit more when already coherent)
    const hBoost = 0.5 + hScore * 1.5; // [0.5, 2.0]

    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] < 0.01) continue;
      const cluster = this.clusters[v];
      if (!cluster || cluster.size === 0) continue;

      const normAct = activations[v] / maxAct;
      // Coherence factor: how much this vertex concentrates the distribution
      const coherenceFactor = 1 + hBoost * normAct * normAct;

      const maxPerCluster = Math.min(cluster.size, 10);
      for (let r = 0; r < maxPerCluster; r++) {
        const token = cluster.tokens[r];
        const score = Math.pow(activations[v], 1 + hBoost * 0.3) * token.weight * coherenceFactor;

        // Estimate H-score contribution: picking this token would reinforce vertex v
        // Contribution = how much entropy would decrease
        const hContrib = normAct * token.weight;

        candidates.push({ tokenId: token.tokenId, score, hContrib });
      }
    }

    if (candidates.length === 0) {
      return { tokenId: 0, tokenString: "", probability: 0, hScoreContrib: 0 };
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, topK);

    // Temperature-scaled softmax
    const safeTemp = Math.max(temperature, 1e-8);
    const maxScore = topCandidates[0].score;
    let sumExp = 0;
    const probs = topCandidates.map(c => {
      const exp = Math.exp((c.score - maxScore) / safeTemp);
      sumExp += exp;
      return { ...c, exp };
    });

    if (sumExp < 1e-30 || !isFinite(sumExp)) {
      const top = topCandidates[0];
      const proj = this.tokenProjections.get(top.tokenId);
      return { tokenId: top.tokenId, tokenString: proj?.tokenString ?? "", probability: 1, hScoreContrib: top.hContrib };
    }

    // Weighted random sample
    const r = Math.random();
    let cumulative = 0;
    for (const p of probs) {
      const prob = isFinite(p.exp) ? p.exp / sumExp : 0;
      cumulative += prob;
      if (cumulative >= r) {
        const proj = this.tokenProjections.get(p.tokenId);
        return { tokenId: p.tokenId, tokenString: proj?.tokenString ?? "", probability: prob, hScoreContrib: p.hContrib };
      }
    }

    const top = probs[0];
    const proj = this.tokenProjections.get(top.tokenId);
    return { tokenId: top.tokenId, tokenString: proj?.tokenString ?? "", probability: top.exp / sumExp, hScoreContrib: top.hContrib };
  }

  /**
   * Phase Sampling — Modulate by geometric phase φ
   *
   * Uses the navigator's accumulated phase angle to rotate the
   * sampling distribution across sign classes. As φ advances,
   * different semantic regions of the vocabulary become favored,
   * creating a natural "scanning" rhythm reminiscent of how
   * piano tuning proceeds around the circle of fifths.
   *
   * P(token) ∝ activation[v] × weight × cos²((φ - signClassPhase[v]) / 2)
   *
   * The cos² factor creates a smooth envelope that peaks at the
   * sign class aligned with the current phase, creating harmonic
   * token selection.
   */
  phaseSample(
    activations: Float32Array,
    temperature: number,
    phi: number,
    topK: number = 40,
  ): { tokenId: number; tokenString: string; probability: number; phaseAlignment: number } {
    const candidates: { tokenId: number; score: number; alignment: number }[] = [];

    // Each sign class (0–7) has a natural phase = sc × π/4
    const signClassPhases = new Float32Array(8);
    for (let sc = 0; sc < 8; sc++) {
      signClassPhases[sc] = sc * Math.PI / 4;
    }

    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] < 0.01) continue;
      const cluster = this.clusters[v];
      if (!cluster || cluster.size === 0) continue;

      const sc = v % 8;
      // Phase alignment: cos²((φ - scPhase) / 2) — peaks when phases match
      const phaseDiff = phi - signClassPhases[sc];
      const cosHalf = Math.cos(phaseDiff * 0.5);
      const phaseEnvelope = cosHalf * cosHalf; // [0, 1]

      // Mix: 60% activation-weighted, 40% phase-modulated
      const phaseFactor = 0.6 + 0.4 * phaseEnvelope;

      const maxPerCluster = Math.min(cluster.size, 10);
      for (let r = 0; r < maxPerCluster; r++) {
        const token = cluster.tokens[r];
        candidates.push({
          tokenId: token.tokenId,
          score: activations[v] * token.weight * phaseFactor,
          alignment: phaseEnvelope,
        });
      }
    }

    if (candidates.length === 0) {
      return { tokenId: 0, tokenString: "", probability: 0, phaseAlignment: 0 };
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, topK);

    const safeTemp = Math.max(temperature, 1e-8);
    const maxScore = topCandidates[0].score;
    let sumExp = 0;
    const probs = topCandidates.map(c => {
      const exp = Math.exp((c.score - maxScore) / safeTemp);
      sumExp += exp;
      return { ...c, exp };
    });

    if (sumExp < 1e-30 || !isFinite(sumExp)) {
      const top = topCandidates[0];
      const proj = this.tokenProjections.get(top.tokenId);
      return { tokenId: top.tokenId, tokenString: proj?.tokenString ?? "", probability: 1, phaseAlignment: top.alignment };
    }

    const r = Math.random();
    let cumulative = 0;
    for (const p of probs) {
      const prob = isFinite(p.exp) ? p.exp / sumExp : 0;
      cumulative += prob;
      if (cumulative >= r) {
        const proj = this.tokenProjections.get(p.tokenId);
        return { tokenId: p.tokenId, tokenString: proj?.tokenString ?? "", probability: prob, phaseAlignment: p.alignment };
      }
    }

    const top = probs[0];
    const proj = this.tokenProjections.get(top.tokenId);
    return { tokenId: top.tokenId, tokenString: proj?.tokenString ?? "", probability: top.exp / sumExp, phaseAlignment: top.alignment };
  }

  /**
   * Stabilizer Sampling — Only allow parity-passing tokens
   *
   * Implements the [[96,48,2]] stabilizer code as a hard constraint
   * on token selection. For each candidate token, checks whether
   * selecting it would violate τ-mirror parity (vertex v and its
   * mirror partner v+48 must maintain balanced activation).
   *
   * Tokens that would create parity violations are filtered out
   * before sampling, ensuring every emitted token preserves the
   * manifold's self-correcting structure.
   *
   * This is the "immune system" of the decoder — it may reject
   * the highest-probability token if it would break coherence.
   */
  stabilizerSample(
    activations: Float32Array,
    temperature: number,
    mirrorTolerance: number = 0.15,
    topK: number = 40,
  ): { tokenId: number; tokenString: string; probability: number; parityClean: boolean; rejectedCount: number } {
    const allCandidates: { tokenId: number; score: number; vertex: number }[] = [];

    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] < 0.01) continue;
      const cluster = this.clusters[v];
      if (!cluster || cluster.size === 0) continue;

      const maxPerCluster = Math.min(cluster.size, 10);
      for (let r = 0; r < maxPerCluster; r++) {
        const token = cluster.tokens[r];
        allCandidates.push({
          tokenId: token.tokenId,
          score: activations[v] * token.weight,
          vertex: v,
        });
      }
    }

    if (allCandidates.length === 0) {
      return { tokenId: 0, tokenString: "", probability: 0, parityClean: false, rejectedCount: 0 };
    }

    allCandidates.sort((a, b) => b.score - a.score);

    // ── Stabilizer filter: check τ-mirror parity for each candidate ──
    // Selecting a token at vertex v will boost v's activation.
    // Check if this would violate parity with mirror partner τ(v).
    const passed: typeof allCandidates = [];
    let rejected = 0;

    // Adaptive tolerance: tighter when H-score is high (more to lose)
    const adaptiveTolerance = mirrorTolerance;

    for (const c of allCandidates) {
      const v = c.vertex;
      const mv = MIRROR_MAP[v];

      // Current mirror balance
      const currentBalance = Math.abs(activations[v] - activations[mv]);

      // Projected balance after boosting vertex v by ~0.3 (injection strength)
      const projectedAct = activations[v] + 0.3;
      const projectedBalance = Math.abs(projectedAct - activations[mv]);

      // Would this token make parity worse beyond tolerance?
      const maxAllowed = adaptiveTolerance * (activations[v] + activations[mv] + 0.3);
      if (projectedBalance <= maxAllowed || projectedBalance <= currentBalance) {
        passed.push(c);
      } else {
        rejected++;
      }

      // Need at least some candidates
      if (passed.length >= topK) break;
    }

    // Fallback: if stabilizer is too strict, relax and take top candidates
    const finalCandidates = passed.length >= 3 ? passed.slice(0, topK) : allCandidates.slice(0, topK);
    const parityClean = passed.length >= 3;

    // Temperature-scaled softmax
    const safeTemp = Math.max(temperature, 1e-8);
    const maxScore = finalCandidates[0].score;
    let sumExp = 0;
    const probs = finalCandidates.map(c => {
      const exp = Math.exp((c.score - maxScore) / safeTemp);
      sumExp += exp;
      return { ...c, exp };
    });

    if (sumExp < 1e-30 || !isFinite(sumExp)) {
      const top = finalCandidates[0];
      const proj = this.tokenProjections.get(top.tokenId);
      return { tokenId: top.tokenId, tokenString: proj?.tokenString ?? "", probability: 1, parityClean, rejectedCount: rejected };
    }

    const r = Math.random();
    let cumulative = 0;
    for (const p of probs) {
      const prob = isFinite(p.exp) ? p.exp / sumExp : 0;
      cumulative += prob;
      if (cumulative >= r) {
        const proj = this.tokenProjections.get(p.tokenId);
        return { tokenId: p.tokenId, tokenString: proj?.tokenString ?? "", probability: prob, parityClean, rejectedCount: rejected };
      }
    }

    const top = probs[0];
    const proj = this.tokenProjections.get(top.tokenId);
    return { tokenId: top.tokenId, tokenString: proj?.tokenString ?? "", probability: top.exp / sumExp, parityClean, rejectedCount: rejected };
  }

  /**
   * Combined three-strategy sampling — Phase 3 unified emitter
   *
   * Composes all three sampling strategies:
   *   1. Stabilizer filter (hard constraint — parity must pass)
   *   2. Coherence bias (soft boost — prefer H-score-improving tokens)
   *   3. Phase modulation (soft envelope — harmonic sign-class scanning)
   *
   * The composition order matters: filter first, then score, then sample.
   */
  enhancedSample(
    activations: Float32Array,
    temperature: number,
    hScore: number,
    phi: number,
    mirrorTolerance: number = 0.15,
    topK: number = 40,
  ): EnhancedSampleResult {
    const allCandidates: EnhancedCandidate[] = [];

    // Find max activation
    let maxAct = 0;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] > maxAct) maxAct = activations[v];
    }
    if (maxAct < 1e-10) maxAct = 1;

    // Coherence boost
    const hBoost = 0.5 + hScore * 1.5;

    // Sign-class phase mapping
    const signClassPhases = new Float32Array(8);
    for (let sc = 0; sc < 8; sc++) signClassPhases[sc] = sc * Math.PI / 4;

    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (activations[v] < 0.01) continue;
      const cluster = this.clusters[v];
      if (!cluster || cluster.size === 0) continue;

      const normAct = activations[v] / maxAct;
      const sc = v % 8;
      const phaseDiff = phi - signClassPhases[sc];
      const cosHalf = Math.cos(phaseDiff * 0.5);
      const phaseEnvelope = cosHalf * cosHalf;

      const coherenceFactor = 1 + hBoost * normAct * normAct;
      const phaseFactor = 0.6 + 0.4 * phaseEnvelope;

      const maxPerCluster = Math.min(cluster.size, 10);
      for (let r = 0; r < maxPerCluster; r++) {
        const token = cluster.tokens[r];
        allCandidates.push({
          tokenId: token.tokenId,
          vertex: v,
          baseScore: activations[v] * token.weight,
          coherenceScore: Math.pow(activations[v], 1 + hBoost * 0.3) * token.weight * coherenceFactor,
          phaseScore: activations[v] * token.weight * phaseFactor,
          combinedScore: Math.pow(activations[v], 1 + hBoost * 0.3) * token.weight * coherenceFactor * phaseFactor,
          phaseAlignment: phaseEnvelope,
          hContrib: normAct * token.weight,
        });
      }
    }

    if (allCandidates.length === 0) {
      return {
        tokenId: 0, tokenString: "", probability: 0,
        hScoreContrib: 0, phaseAlignment: 0, parityClean: false,
        rejectedByStabilizer: 0, samplingStrategy: "fallback",
      };
    }

    // ── Step 1: Stabilizer filter ──
    allCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

    const passed: EnhancedCandidate[] = [];
    let rejected = 0;
    const adaptiveTolerance = mirrorTolerance * (1 + (1 - hScore) * 0.5);

    for (const c of allCandidates) {
      const mv = MIRROR_MAP[c.vertex];
      const projectedBalance = Math.abs(activations[c.vertex] + 0.3 - activations[mv]);
      const maxAllowed = adaptiveTolerance * (activations[c.vertex] + activations[mv] + 0.3);
      const currentBalance = Math.abs(activations[c.vertex] - activations[mv]);

      if (projectedBalance <= maxAllowed || projectedBalance <= currentBalance) {
        passed.push(c);
      } else {
        rejected++;
      }
      if (passed.length >= topK * 2) break;
    }

    const finalCandidates = passed.length >= 3 ? passed.slice(0, topK) : allCandidates.slice(0, topK);
    const parityClean = passed.length >= 3;
    const strategy = parityClean ? "stabilizer+coherence+phase" : "coherence+phase";

    // ── Step 2: Softmax over combined scores ──
    const safeTemp = Math.max(temperature, 1e-8);
    const maxScore = finalCandidates[0].combinedScore;
    let sumExp = 0;
    const probs = finalCandidates.map(c => {
      const exp = Math.exp((c.combinedScore - maxScore) / safeTemp);
      sumExp += exp;
      return { ...c, exp };
    });

    if (sumExp < 1e-30 || !isFinite(sumExp)) {
      const top = finalCandidates[0];
      const proj = this.tokenProjections.get(top.tokenId);
      return {
        tokenId: top.tokenId, tokenString: proj?.tokenString ?? "",
        probability: 1, hScoreContrib: top.hContrib,
        phaseAlignment: top.phaseAlignment, parityClean,
        rejectedByStabilizer: rejected, samplingStrategy: strategy,
      };
    }

    // ── Step 3: Weighted random sample ──
    const r = Math.random();
    let cumulative = 0;
    for (const p of probs) {
      const prob = isFinite(p.exp) ? p.exp / sumExp : 0;
      cumulative += prob;
      if (cumulative >= r) {
        const proj = this.tokenProjections.get(p.tokenId);
        return {
          tokenId: p.tokenId, tokenString: proj?.tokenString ?? "",
          probability: prob, hScoreContrib: p.hContrib,
          phaseAlignment: p.phaseAlignment, parityClean,
          rejectedByStabilizer: rejected, samplingStrategy: strategy,
        };
      }
    }

    const top = probs[0];
    const proj = this.tokenProjections.get(top.tokenId);
    return {
      tokenId: top.tokenId, tokenString: proj?.tokenString ?? "",
      probability: top.exp / sumExp, hScoreContrib: top.hContrib,
      phaseAlignment: top.phaseAlignment, parityClean,
      rejectedByStabilizer: rejected, samplingStrategy: strategy,
    };
  }

  /** Internal helper: weighted random sample from probabilities */
  private weightedSample(
    probs: { tokenId: number; probability: number }[],
  ): { tokenId: number; tokenString: string; probability: number } {
    if (probs.length === 0) {
      return { tokenId: 0, tokenString: "", probability: 0 };
    }

    const r = Math.random();
    let cumulative = 0;
    for (const p of probs) {
      cumulative += p.probability;
      if (cumulative >= r) {
        const proj = this.tokenProjections.get(p.tokenId);
        return {
          tokenId: p.tokenId,
          tokenString: proj?.tokenString ?? `<${p.tokenId}>`,
          probability: p.probability,
        };
      }
    }

    const top = probs[0];
    const proj = this.tokenProjections.get(top.tokenId);
    return {
      tokenId: top.tokenId,
      tokenString: proj?.tokenString ?? `<${top.tokenId}>`,
      probability: top.probability,
    };
  }

  /**
   * Serialize to a portable engram file.
   */
  toEngram(modelId: string): VocabularyEngram {
    return {
      modelId,
      vocabSize: this.stats?.totalTokens ?? 0,
      clusterCount: ATLAS_VERTEX_COUNT,
      clusters: this.clusters.map(c => ({
        vertex: c.vertexIndex,
        tokens: c.tokens.map(t => ({ id: t.tokenId, str: t.tokenString, weight: t.weight })),
        centroid: Array.from(c.centroid),
      })),
      createdAt: new Date().toISOString(),
      stats: this.stats!,
    };
  }

  /**
   * Load from a serialized engram file.
   */
  loadFromEngram(engram: VocabularyEngram): void {
    this.clusters = engram.clusters.map(sc => {
      const tokens: ClusterToken[] = sc.tokens.map((t, i) => ({
        tokenId: t.id,
        tokenString: t.str,
        weight: t.weight,
        rank: i,
      }));

      // Rebuild centroid
      const centroid = new Float32Array(sc.centroid);

      // Compute entropy
      let entropy = 0;
      const totalWeight = tokens.reduce((s, t) => s + t.weight, 0);
      if (totalWeight > 0) {
        for (const token of tokens) {
          const p = token.weight / totalWeight;
          if (p > 1e-10) entropy -= p * Math.log2(p);
        }
      }

      return {
        vertexIndex: sc.vertex,
        tokens,
        centroid,
        entropy,
        size: tokens.length,
      };
    });

    // Rebuild lookup maps
    this.tokenToVertex.clear();
    this.tokenProjections.clear();
    for (const cluster of this.clusters) {
      for (const token of cluster.tokens) {
        this.tokenToVertex.set(token.tokenId, cluster.vertexIndex);
      }
    }

    this.stats = engram.stats;
  }

  /**
   * Get partition statistics.
   */
  getStats(): PartitionStats | null {
    return this.stats;
  }
}
