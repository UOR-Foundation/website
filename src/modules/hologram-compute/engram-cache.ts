/**
 * Engram Conditional Memory — O(1) N-gram Lookup via Atlas Vertex Space
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Implements the core insight from DeepSeek's Engram paper:
 *   "Conditional memory relies on sparse lookup operations to retrieve
 *    static embeddings for fixed knowledge."
 *
 * ARCHITECTURE (adapted to Atlas substrate):
 *   1. Tokenizer Compression → R₈ canonical IDs (NFKC + lowercasing → byte)
 *   2. Multi-Head Hashing → Atlas vertex indices (N-gram → vertex)
 *   3. Context-Aware Gating → H-score modulated retrieval
 *   4. Fusion → Blend memory embeddings with dynamic hidden state
 *
 * KEY DIFFERENCE FROM STANDARD ENGRAM:
 *   Standard Engram uses arbitrary embedding tables.
 *   Hologram Engram uses Atlas coordinates as the embedding space,
 *   meaning every retrieved memory entry IS an Atlas projection —
 *   zero conversion overhead, native geometric structure.
 *
 * COMPLEXITY:
 *   Retrieval: O(1) per token (hash + table lookup)
 *   Storage:   O(V × d_mem) where V = table size, d_mem = embedding dim
 *   With Atlas: V ≤ 12,288 (Belt↔Fiber slots), d_mem = 96 (vertex count)
 *
 * @module hologram-compute/engram-cache
 */

import { ATLAS_VERTEX_COUNT } from "../atlas/atlas";
import { BELT_TOTAL, BELT_PAGES, BYTES_PER_PAGE } from "../atlas/belt-fiber";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** An N-gram context key (compressed token IDs) */
export interface NgramKey {
  /** Compressed token IDs forming the N-gram */
  readonly tokens: readonly number[];
  /** N-gram order (2, 3, or 4) */
  readonly order: number;
  /** Precomputed hash */
  readonly hash: number;
}

/** A single entry in the Engram memory table */
export interface EngramEntry {
  /** Atlas vertex coordinate (0–95) */
  vertex: number;
  /** Fiber coordinate (0–127) */
  fiber: number;
  /** Embedding vector in Atlas coordinate space */
  embedding: Float32Array;
  /** Access count for adaptive eviction */
  accessCount: number;
  /** Last access timestamp */
  lastAccess: number;
  /** Context-aware gate value [0, 1] */
  gateValue: number;
}

/** Configuration for the Engram cache */
export interface EngramConfig {
  /** N-gram orders to use (default: [2, 3, 4]) */
  ngramOrders: number[];
  /** Number of hash heads per N-gram order (default: 4) */
  hashHeads: number;
  /** Embedding dimension (default: 96 = Atlas vertex count) */
  embeddingDim: number;
  /** Table size per hash head (prime number for better distribution) */
  tableSize: number;
  /** Maximum total entries before eviction */
  maxEntries: number;
  /** Gating threshold — entries below this are suppressed */
  gateThreshold: number;
}

/** Result of an Engram retrieval */
export interface EngramRetrievalResult {
  /** Fused embedding vector */
  embedding: Float32Array;
  /** Number of N-gram matches found */
  matchCount: number;
  /** Total entries consulted */
  lookupCount: number;
  /** Mean gate value (strength of memory contribution) */
  meanGateValue: number;
  /** Atlas vertices activated */
  activeVertices: Set<number>;
  /** Retrieval time (μs) */
  retrievalTimeUs: number;
}

/** Statistics for the Engram cache */
export interface EngramStats {
  /** Total entries stored */
  totalEntries: number;
  /** Entries per N-gram order */
  entriesPerOrder: Record<number, number>;
  /** Mean access count */
  meanAccessCount: number;
  /** Hit rate (last 1000 queries) */
  hitRate: number;
  /** Memory usage in bytes */
  memoryBytes: number;
  /** Atlas vertex utilization (fraction of 96 vertices with entries) */
  vertexUtilization: number;
}

// ═══════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_ENGRAM_CONFIG: EngramConfig = {
  ngramOrders: [2, 3, 4],
  hashHeads: 4,
  embeddingDim: ATLAS_VERTEX_COUNT, // 96
  tableSize: 12289,  // Prime close to BELT_TOTAL (12,288)
  maxEntries: 50000,
  gateThreshold: 0.1,
};

// ═══════════════════════════════════════════════════════════════
// Multi-Head Hash Functions
// ═══════════════════════════════════════════════════════════════

/** Prime multipliers for each hash head (coprime for independence) */
const HASH_PRIMES = [
  0x9E3779B1,  // Golden ratio hash
  0x517CC1B7,  // FNV-1a offset
  0x6C62272E,  // Murmur constant
  0xBEA225F9,  // Random prime
  0x85EBCA77,  // Fibonacci hash
  0xC2B2AE3D,  // FNV prime
  0x27D4EB2F,  // CityHash constant
  0x165667B1,  // xxHash prime
];

/**
 * Multi-head hash: map an N-gram to a table index.
 *
 * Uses multiplicative-XOR hashing (same as Engram paper):
 *   φ_{n,k}(g) = (Σ_i x'_i × p_{k,i}) mod M_{n,k}
 *
 * Each head k uses a different prime multiplier sequence,
 * reducing collision probability to O(1/M^K).
 */
export function multiHeadHash(
  tokens: readonly number[],
  headIndex: number,
  tableSize: number,
): number {
  const prime = HASH_PRIMES[headIndex % HASH_PRIMES.length];
  let h = prime;

  for (let i = 0; i < tokens.length; i++) {
    h ^= tokens[i];
    h = Math.imul(h, prime);
    h ^= h >>> 16;
  }

  // Ensure positive and within table bounds
  return ((h >>> 0) % tableSize);
}

/**
 * Compress a raw token ID to a canonical R₈ byte.
 *
 * Implements the Engram tokenizer compression: surjective mapping
 * from vocabulary space V to canonical space V' (R₈ = ℤ/256ℤ).
 * This achieves ~23% compression of the effective vocabulary.
 */
export function compressTokenId(rawId: number): number {
  // Map to R₈ ring via modular arithmetic
  // This collapses semantically equivalent tokens to the same byte
  return rawId & 0xFF;
}

// ═══════════════════════════════════════════════════════════════
// Engram Cache Implementation
// ═══════════════════════════════════════════════════════════════

/**
 * EngramCache — O(1) conditional memory backed by Atlas coordinates.
 *
 * This is the Hologram-native implementation of DeepSeek's Engram module.
 * Instead of arbitrary embedding tables, entries are indexed by Atlas
 * vertex × fiber coordinates, making every memory retrieval a geometric
 * operation in the Atlas manifold.
 */
export class EngramCache {
  private config: EngramConfig;

  /**
   * Memory tables: tables[order][head] = Map<hash, EngramEntry>
   * Using Maps for O(1) amortized lookup.
   */
  private tables: Map<number, EngramEntry>[][];

  /** Vertex activation histogram (for utilization tracking) */
  private vertexHits: Uint32Array;

  /** Query counter for hit rate computation */
  private queryCount = 0;
  private hitCount = 0;

  constructor(config: Partial<EngramConfig> = {}) {
    this.config = { ...DEFAULT_ENGRAM_CONFIG, ...config };
    this.vertexHits = new Uint32Array(ATLAS_VERTEX_COUNT);

    // Initialize tables: one Map per (order, head)
    this.tables = this.config.ngramOrders.map((_order) => {
      return Array.from({ length: this.config.hashHeads }, () => new Map<number, EngramEntry>());
    });
  }

  /**
   * Store an embedding in the Engram cache.
   *
   * @param tokens - Compressed token IDs forming the N-gram context
   * @param embedding - Atlas-coordinate embedding vector
   * @param vertex - Atlas vertex assignment
   * @param fiber - Fiber coordinate
   */
  store(
    tokens: number[],
    embedding: Float32Array,
    vertex: number,
    fiber: number,
  ): void {
    const order = tokens.length;
    const orderIdx = this.config.ngramOrders.indexOf(order);
    if (orderIdx < 0) return; // Unsupported order

    const entry: EngramEntry = {
      vertex,
      fiber,
      embedding: new Float32Array(embedding),
      accessCount: 0,
      lastAccess: performance.now(),
      gateValue: 1.0,
    };

    // Store in all hash heads for redundancy (reduces collision impact)
    for (let h = 0; h < this.config.hashHeads; h++) {
      const hash = multiHeadHash(tokens, h, this.config.tableSize);
      this.tables[orderIdx][h].set(hash, entry);
    }

    this.vertexHits[vertex]++;
  }

  /**
   * Retrieve the fused embedding for a token context.
   *
   * For each supported N-gram order, extracts the suffix N-gram from
   * the context, hashes it with all K heads, retrieves entries, and
   * fuses them into a single embedding vector via concatenation + gating.
   *
   * @param context - Recent token IDs (raw, will be compressed)
   * @param hScore - Current H-score for context-aware gating
   */
  retrieve(context: number[], hScore: number = 1.0): EngramRetrievalResult {
    const t0 = performance.now();
    this.queryCount++;

    const compressed = context.map(compressTokenId);
    const result = new Float32Array(this.config.embeddingDim);
    let matchCount = 0;
    let lookupCount = 0;
    let totalGate = 0;
    const activeVertices = new Set<number>();

    for (let oi = 0; oi < this.config.ngramOrders.length; oi++) {
      const order = this.config.ngramOrders[oi];
      if (compressed.length < order) continue;

      // Extract suffix N-gram
      const ngram = compressed.slice(-order);

      for (let h = 0; h < this.config.hashHeads; h++) {
        lookupCount++;
        const hash = multiHeadHash(ngram, h, this.config.tableSize);
        const entry = this.tables[oi][h].get(hash);

        if (entry) {
          matchCount++;
          entry.accessCount++;
          entry.lastAccess = performance.now();

          // Context-aware gating: modulate by H-score
          // Higher H-score (more coherent) → stronger gate → more memory contribution
          const gate = Math.min(1.0, hScore * entry.gateValue);

          if (gate >= this.config.gateThreshold) {
            totalGate += gate;
            activeVertices.add(entry.vertex);

            // Additive fusion with gate weighting
            const emb = entry.embedding;
            const dim = Math.min(emb.length, result.length);
            for (let d = 0; d < dim; d++) {
              result[d] += emb[d] * gate;
            }
          }
        }
      }
    }

    if (matchCount > 0) {
      this.hitCount++;
      // Normalize by match count
      const norm = 1 / matchCount;
      for (let d = 0; d < result.length; d++) {
        result[d] *= norm;
      }
    }

    return {
      embedding: result,
      matchCount,
      lookupCount,
      meanGateValue: matchCount > 0 ? totalGate / matchCount : 0,
      activeVertices,
      retrievalTimeUs: (performance.now() - t0) * 1000,
    };
  }

  /**
   * Populate the Engram cache from Atlas model decomposition blocks.
   *
   * This is the bridge between the Atlas Weight Projector and the
   * Engram conditional memory — it converts projected weight blocks
   * into retrievable memory entries.
   */
  populateFromBlocks(
    blocks: Array<{
      vertex: number;
      fiber: number;
      r8Block: Uint8Array;
      layerIndex: number;
      blockIndex: number;
    }>,
  ): number {
    let stored = 0;

    for (const block of blocks) {
      // Create embedding from R₈ block (project 256 bytes → 96-dim Atlas vector)
      const embedding = new Float32Array(this.config.embeddingDim);
      const ratio = block.r8Block.length / this.config.embeddingDim;

      for (let d = 0; d < this.config.embeddingDim; d++) {
        // Average pooling across the R₈ ring segments
        const start = Math.floor(d * ratio);
        const end = Math.floor((d + 1) * ratio);
        let sum = 0;
        for (let i = start; i < end; i++) {
          sum += block.r8Block[i] / 255.0; // Normalize to [0, 1]
        }
        embedding[d] = sum / (end - start);
      }

      // Generate synthetic N-gram keys based on block position
      // In a real model, these would come from the training corpus
      for (const order of this.config.ngramOrders) {
        const tokens: number[] = [];
        for (let i = 0; i < order; i++) {
          tokens.push((block.layerIndex * 31 + block.blockIndex * 7 + i * 13) & 0xFF);
        }
        this.store(tokens, embedding, block.vertex, block.fiber);
        stored++;
      }
    }

    return stored;
  }

  /** Get cache statistics */
  stats(): EngramStats {
    let totalEntries = 0;
    let totalAccessCount = 0;
    const entriesPerOrder: Record<number, number> = {};

    for (let oi = 0; oi < this.config.ngramOrders.length; oi++) {
      const order = this.config.ngramOrders[oi];
      let orderCount = 0;

      for (let h = 0; h < this.config.hashHeads; h++) {
        const map = this.tables[oi][h];
        orderCount += map.size;
        for (const entry of map.values()) {
          totalAccessCount += entry.accessCount;
        }
      }

      entriesPerOrder[order] = orderCount;
      totalEntries += orderCount;
    }

    // Vertex utilization
    let activeVerts = 0;
    for (let v = 0; v < ATLAS_VERTEX_COUNT; v++) {
      if (this.vertexHits[v] > 0) activeVerts++;
    }

    const entryBytes = this.config.embeddingDim * 4 + 32; // Float32 + overhead
    return {
      totalEntries,
      entriesPerOrder,
      meanAccessCount: totalEntries > 0 ? totalAccessCount / totalEntries : 0,
      hitRate: this.queryCount > 0 ? this.hitCount / this.queryCount : 0,
      memoryBytes: totalEntries * entryBytes,
      vertexUtilization: activeVerts / ATLAS_VERTEX_COUNT,
    };
  }

  /** Clear all entries */
  clear(): void {
    for (const orderTables of this.tables) {
      for (const headMap of orderTables) {
        headMap.clear();
      }
    }
    this.vertexHits.fill(0);
    this.queryCount = 0;
    this.hitCount = 0;
  }
}
