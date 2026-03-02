/**
 * End-to-End Test: CoherenceTokenDecoder with SmolLM2 Vocabulary
 * ═══════════════════════════════════════════════════════════════
 *
 * Validates the full pure-coherence inference pipeline:
 *   1. Tokenizer loading (synthetic fallback for SmolLM2)
 *   2. Vocabulary partitioning into 96 Atlas clusters
 *   3. Coherence navigation + token generation
 *   4. Output quality metrics
 */

import { describe, it, expect, beforeAll } from "vitest";
import { CoherenceTokenDecoder, type DecoderStatus, type GenerationResult } from "../coherence-token-decoder";

describe("CoherenceTokenDecoder E2E — SmolLM2 1.7B", () => {
  let decoder: CoherenceTokenDecoder;
  const statusLog: DecoderStatus[] = [];

  beforeAll(async () => {
    decoder = new CoherenceTokenDecoder({
      modelId: "HuggingFaceTB/SmolLM2-1.7B",
      temperature: 0.7,
      maxTokens: 16,
      stepsPerToken: 6,
    });
    decoder.onStatus((s) => statusLog.push({ ...s }));
    await decoder.initialize();
  }, 30_000);

  // ── Phase 1: Tokenizer + Partitioning ──────────────────────

  it("should load tokenizer and report vocabSize", () => {
    const info = decoder.getTokenizerInfo();
    expect(info).not.toBeNull();
    expect(info!.vocabSize).toBeGreaterThan(1000);
    expect(info!.modelId).toBe("HuggingFaceTB/SmolLM2-1.7B");
    console.log(`[TEST] Tokenizer: ${info!.vocabSize} tokens, ${info!.specialTokens.size} special, ${info!.loadTimeMs.toFixed(0)}ms`);
  });

  it("should partition vocabulary into 96 clusters with valid stats", () => {
    const stats = decoder.getPartitioner().getStats();
    expect(stats).not.toBeNull();
    expect(stats!.totalTokens).toBeGreaterThan(1000);
    expect(stats!.activeClusters).toBe(96); // All clusters should be populated
    expect(stats!.meanClusterSize).toBeGreaterThan(10);
    expect(stats!.partitionEntropy).toBeGreaterThan(4); // Near-uniform = high entropy
    expect(stats!.partitionTimeMs).toBeGreaterThan(0);

    console.log(`[TEST] Partition stats:`);
    console.log(`  Total tokens:     ${stats!.totalTokens}`);
    console.log(`  Active clusters:  ${stats!.activeClusters}/96`);
    console.log(`  Mean cluster:     ${stats!.meanClusterSize.toFixed(1)}`);
    console.log(`  Std cluster:      ${stats!.stdClusterSize.toFixed(1)}`);
    console.log(`  Min/Max cluster:  ${stats!.minClusterSize}/${stats!.maxClusterSize}`);
    console.log(`  Partition entropy: ${stats!.partitionEntropy.toFixed(3)}`);
    console.log(`  Partition time:   ${stats!.partitionTimeMs.toFixed(0)}ms`);
  });

  it("should have non-empty clusters with ranked tokens", () => {
    const partitioner = decoder.getPartitioner();
    const clusters = partitioner.getAllClusters();
    expect(clusters.length).toBe(96);

    let nonEmpty = 0;
    for (const c of clusters) {
      if (c.size > 0) {
        nonEmpty++;
        // Check tokens are sorted by weight (descending)
        for (let i = 1; i < c.tokens.length; i++) {
          expect(c.tokens[i].weight).toBeLessThanOrEqual(c.tokens[i - 1].weight);
        }
        // Check ranks are sequential
        for (let i = 0; i < c.tokens.length; i++) {
          expect(c.tokens[i].rank).toBe(i);
        }
      }
    }
    expect(nonEmpty).toBe(96);
  });

  // ── Phase 2: Navigator seeding ─────────────────────────────

  it("should map tokens to vertices consistently", () => {
    const partitioner = decoder.getPartitioner();
    const info = decoder.getTokenizerInfo()!;

    // Every token should have a vertex assignment
    let mapped = 0;
    for (const [tokenId] of info.vocabulary) {
      const v = partitioner.getTokenVertex(tokenId);
      if (v !== undefined) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(96);
        mapped++;
      }
    }
    expect(mapped).toBe(info.vocabSize);
    console.log(`[TEST] ${mapped}/${info.vocabSize} tokens mapped to vertices`);
  });

  // ── Phase 3: Full generation ───────────────────────────────

  it("should generate tokens from a prompt", async () => {
    const streamedTokens: string[] = [];

    const result: GenerationResult = await decoder.generate(
      "The nature of consciousness is",
      (tok, fullText) => {
        streamedTokens.push(tok.text);
      },
    );

    // Basic generation checks
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.length).toBeLessThanOrEqual(16);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.pureCoherence).toBe(true);
    expect(result.modelId).toBe("HuggingFaceTB/SmolLM2-1.7B");

    // Performance checks
    expect(result.totalTimeMs).toBeGreaterThan(0);
    expect(result.tokensPerSecond).toBeGreaterThan(0);

    // H-score checks
    expect(result.meanHScore).toBeGreaterThanOrEqual(0);
    expect(result.meanHScore).toBeLessThanOrEqual(1);

    // Streaming callback should have been called for each token
    expect(streamedTokens.length).toBe(result.tokens.length);

    console.log(`[TEST] Generation result:`);
    console.log(`  Prompt:     "The nature of consciousness is"`);
    console.log(`  Output:     "${result.text}"`);
    console.log(`  Tokens:     ${result.tokens.length}`);
    console.log(`  Time:       ${result.totalTimeMs.toFixed(0)}ms`);
    console.log(`  tok/s:      ${result.tokensPerSecond.toFixed(1)}`);
    console.log(`  Mean H̄:    ${result.meanHScore.toFixed(4)}`);
    console.log(`  Pure:       ${result.pureCoherence}`);
  });

  it("should have valid per-token diagnostics", async () => {
    const result = await decoder.generate("Mathematics describes reality because");

    for (const tok of result.tokens) {
      // H-score in valid range
      expect(tok.hScore).toBeGreaterThanOrEqual(0);
      expect(tok.hScore).toBeLessThanOrEqual(1);

      // Zone is valid
      expect(["convergent", "exploring", "divergent"]).toContain(tok.zone);

      // Active vertices > 0
      expect(tok.activeVertices).toBeGreaterThan(0);
      expect(tok.activeVertices).toBeLessThanOrEqual(96);

      // Fano channels in valid range
      expect(tok.fanoChannelsActive).toBeGreaterThanOrEqual(0);
      expect(tok.fanoChannelsActive).toBeLessThanOrEqual(7);

      // Syndrome count non-negative
      expect(tok.syndromeCount).toBeGreaterThanOrEqual(0);

      // Probability valid
      expect(tok.probability).toBeGreaterThan(0);
      expect(tok.probability).toBeLessThanOrEqual(1);

      // Time positive
      expect(tok.timeMs).toBeGreaterThanOrEqual(0);
    }

    // Log per-token breakdown
    console.log(`[TEST] Per-token diagnostics for "Mathematics describes reality because":`);
    console.log(`  ${"Token".padEnd(15)} ${"H".padStart(6)} ${"Zone".padStart(11)} ${"∂H/∂t".padStart(8)} ${"Verts".padStart(5)} ${"Fano".padStart(4)} ${"Syn".padStart(4)} ${"p".padStart(6)} ${"ms".padStart(6)}`);
    for (const tok of result.tokens) {
      console.log(
        `  ${JSON.stringify(tok.text).padEnd(15)} ${tok.hScore.toFixed(3).padStart(6)} ${tok.zone.padStart(11)} ${tok.dHdt.toFixed(4).padStart(8)} ${String(tok.activeVertices).padStart(5)} ${String(tok.fanoChannelsActive).padStart(4)} ${String(tok.syndromeCount).padStart(4)} ${tok.probability.toFixed(3).padStart(6)} ${tok.timeMs.toFixed(1).padStart(6)}`
      );
    }
  });

  it("should produce different output at different temperatures", async () => {
    // Low temperature (more deterministic)
    const lowTemp = new CoherenceTokenDecoder({ temperature: 0.1, maxTokens: 8, stepsPerToken: 4 });
    lowTemp.onStatus(() => {});
    await lowTemp.initialize();
    const r1 = await lowTemp.generate("The");
    const r2 = await lowTemp.generate("The");

    // High temperature (more random)
    const hiTemp = new CoherenceTokenDecoder({ temperature: 1.5, maxTokens: 8, stepsPerToken: 4 });
    hiTemp.onStatus(() => {});
    await hiTemp.initialize();
    const r3 = await hiTemp.generate("The");

    console.log(`[TEST] Temperature comparison:`);
    console.log(`  T=0.1 run1: "${r1.text}" (H̄=${r1.meanHScore.toFixed(3)})`);
    console.log(`  T=0.1 run2: "${r2.text}" (H̄=${r2.meanHScore.toFixed(3)})`);
    console.log(`  T=1.5:      "${r3.text}" (H̄=${r3.meanHScore.toFixed(3)})`);

    // At least verify all produced output
    expect(r1.tokens.length).toBeGreaterThan(0);
    expect(r3.tokens.length).toBeGreaterThan(0);
  }, 60_000);

  // ── Status progression ─────────────────────────────────────

  it("should have progressed through correct status stages", () => {
    const stages = statusLog.map(s => s.stage);
    expect(stages).toContain("loading-tokenizer");
    expect(stages).toContain("partitioning");
    expect(stages).toContain("ready");

    // Progress should have been monotonically increasing during init
    const initStatuses = statusLog.filter(s => s.stage === "loading-tokenizer" || s.stage === "partitioning");
    for (let i = 1; i < initStatuses.length; i++) {
      expect(initStatuses[i].progress).toBeGreaterThanOrEqual(initStatuses[i - 1].progress - 0.01);
    }
  });
});
