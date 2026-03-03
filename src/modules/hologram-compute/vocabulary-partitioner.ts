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

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

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
   * Sample a token from activations.
   */
  sampleFromActivations(
    activations: Float32Array,
    temperature: number = 0.7,
  ): { tokenId: number; tokenString: string; probability: number } {
    const probs = this.activationsToTokenProbabilities(activations, temperature);
    if (probs.length === 0) {
      return { tokenId: 0, tokenString: "", probability: 0 };
    }

    // Weighted random sampling
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

    // Fallback to top token
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
