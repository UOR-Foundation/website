/**
 * Atlas Cross-Model Translation — Verification Suite
 * ════════════════════════════════════════════════════
 *
 * Proves that the Atlas R₈ substrate enables faithful translation
 * between different model embedding spaces.
 *
 * T6.1: Decomposition correctness — embeddings map to valid R₈ coordinates
 * T6.2: Reconstruction fidelity — same-dim round-trip is near-lossless
 * T6.3: Cross-model translation — different dims produce valid embeddings
 * T6.4: Sign class preservation — R₈ structural invariants hold
 * T6.5: Universal invariants — all 8 invariants verified across model pairs
 * T6.6: Round-trip convergence — A→B→A preserves structure
 * T6.7: Embedding injectivity — small→large is lossless on shared dims
 * T6.8: Entropy conservation — sign class distribution stays uniform
 */
import { describe, it, expect } from "vitest";
import { MODEL_CATALOG } from "@/modules/atlas/convergence";
import {
  createTestEmbedding,
  decomposeToAtlas,
  reconstructFromAtlas,
  computeFidelity,
  translate,
  translatePair,
  runCrossModelTranslation,
} from "@/modules/atlas/translation";

const GPT2 = MODEL_CATALOG.find(m => m.name === "GPT-2")!;
const LLAMA7B = MODEL_CATALOG.find(m => m.name === "LLaMA-7B")!;
const GEMINI_FLASH = MODEL_CATALOG.find(m => m.name === "Gemini-Flash")!;
const MISTRAL = MODEL_CATALOG.find(m => m.name === "Mistral-7B")!;
const PHI3 = MODEL_CATALOG.find(m => m.name === "Phi-3-Mini")!;

describe("Phase 6: Cross-Model Translation", () => {
  // ── T6.1: Decomposition correctness ─────────────────────────────────────
  describe("T6.1: Decomposition to R₈ coordinates", () => {
    it("embedding decomposes to correct R₈ dimension", () => {
      const emb = createTestEmbedding(GPT2);
      const coords = decomposeToAtlas(emb);
      expect(coords.r8Bytes.length).toBe(GPT2.embeddingDim);
      expect(coords.sourceDim).toBe(768);
    });

    it("R₈ bytes are in valid range [0, 255]", () => {
      const emb = createTestEmbedding(LLAMA7B);
      const coords = decomposeToAtlas(emb);
      for (let i = 0; i < coords.r8Bytes.length; i++) {
        expect(coords.r8Bytes[i]).toBeGreaterThanOrEqual(0);
        expect(coords.r8Bytes[i]).toBeLessThanOrEqual(255);
      }
    });

    it("complete rings = floor(d / 256)", () => {
      const emb = createTestEmbedding(LLAMA7B);
      const coords = decomposeToAtlas(emb);
      expect(coords.completeRings).toBe(Math.floor(4096 / 256));
      expect(coords.residual).toBe(4096 % 256);
    });

    it("sign class distribution sums to dim", () => {
      const emb = createTestEmbedding(GEMINI_FLASH);
      const coords = decomposeToAtlas(emb);
      const total = coords.signClassDistribution.reduce((a, b) => a + b, 0);
      expect(total).toBe(GEMINI_FLASH.embeddingDim);
    });

    it("sign class distribution has 8 classes", () => {
      const emb = createTestEmbedding(GPT2);
      const coords = decomposeToAtlas(emb);
      expect(coords.signClassDistribution).toHaveLength(8);
    });
  });

  // ── T6.2: Same-dimension round-trip fidelity ───────────────────────────
  describe("T6.2: Same-dim round-trip fidelity", () => {
    it("LLaMA-7B ↔ Mistral-7B (same dim 4096): near-lossless", () => {
      const result = translatePair(LLAMA7B, MISTRAL);
      expect(result.direction).toBe("isometry");
      expect(result.forwardFidelity.cosineSimilarity).toBeGreaterThan(0.98);
    });

    it("LLaMA-7B ↔ Claude-3-Haiku (same dim 4096): near-lossless", () => {
      const haiku = MODEL_CATALOG.find(m => m.name === "Claude-3-Haiku")!;
      const result = translatePair(LLAMA7B, haiku);
      expect(result.direction).toBe("isometry");
      expect(result.roundTripFidelity.cosineSimilarity).toBeGreaterThan(0.98);
    });

    it("same-dim translation is classified as lossless or near-lossless", () => {
      const result = translatePair(LLAMA7B, MISTRAL);
      expect(["lossless", "near-lossless"]).toContain(result.forwardFidelity.fidelityClass);
    });
  });

  // ── T6.3: Cross-dimension translation ──────────────────────────────────
  describe("T6.3: Cross-dimension translation", () => {
    it("GPT-2 (768) → LLaMA-7B (4096): embedding direction", () => {
      const result = translatePair(GPT2, LLAMA7B);
      expect(result.direction).toBe("embed");
      expect(result.forwardFidelity.cosineSimilarity).toBeGreaterThan(0.9);
    });

    it("LLaMA-7B (4096) → GPT-2 (768): projection direction", () => {
      const result = translatePair(LLAMA7B, GPT2);
      expect(result.direction).toBe("project");
      // Projection is lossy but structured
      expect(result.forwardFidelity.structuralFidelity).toBeCloseTo(768 / 4096, 1);
    });

    it("Phi-3 (3072) → Gemini-Flash (4096): different families", () => {
      const result = translatePair(PHI3, GEMINI_FLASH);
      expect(result.direction).toBe("embed");
      expect(result.forwardFidelity.cosineSimilarity).toBeGreaterThan(0.9);
    });

    it("target embedding has correct dimension", () => {
      const emb = createTestEmbedding(GPT2);
      const result = translate(emb, GPT2, LLAMA7B);
      expect(result.target.dim).toBe(4096);
      expect(result.target.values.length).toBe(4096);
    });

    it("target embedding is unit-normalized", () => {
      const emb = createTestEmbedding(GPT2);
      const result = translate(emb, GPT2, LLAMA7B);
      const norm = Math.sqrt(result.target.values.reduce((s, v) => s + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 3);
    });
  });

  // ── T6.4: Sign class preservation ──────────────────────────────────────
  describe("T6.4: Sign class preservation", () => {
    it("same-dim translation preserves sign classes", () => {
      const result = translatePair(LLAMA7B, MISTRAL);
      expect(result.forwardFidelity.signClassPreserved).toBe(true);
    });

    it("sign class entropy is well-distributed (≥ 1.5 bits of 3 max)", () => {
      const emb = createTestEmbedding(LLAMA7B);
      const coords = decomposeToAtlas(emb);
      const total = coords.signClassDistribution.reduce((a, b) => a + b, 0);
      let h = 0;
      for (const c of coords.signClassDistribution) {
        if (c > 0) {
          const p = c / total;
          h -= p * Math.log2(p);
        }
      }
      // 8 sign classes → max entropy = 3.0 bits; ≥1.5 = well-distributed
      expect(h).toBeGreaterThan(1.5);
    });
  });

  // ── T6.5: Universal invariants ─────────────────────────────────────────
  describe("T6.5: Universal translation invariants", () => {
    it("all 8 invariants hold across model pairs", () => {
      const report = runCrossModelTranslation();
      const failing = report.invariants.filter(i => !i.holds);
      if (failing.length > 0) {
        console.log("Failing invariants:", failing.map(i => `${i.name}: ${i.description}`));
      }
      for (const inv of report.invariants) {
        expect(inv.holds, `Invariant "${inv.name}" failed: ${inv.description}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
    });

    it("total verified invariants = 8", () => {
      const report = runCrossModelTranslation();
      expect(report.totalVerified).toBe(8);
    });
  });

  // ── T6.6: Round-trip convergence ───────────────────────────────────────
  describe("T6.6: Round-trip convergence", () => {
    it("A→B→A round-trip: same-dim > 0.95, cross-dim > 0.3", () => {
      const report = runCrossModelTranslation();
      for (const pair of report.pairs) {
        if (pair.direction === "isometry") {
          expect(pair.roundTripFidelity.cosineSimilarity).toBeGreaterThan(0.95);
        } else {
          expect(pair.roundTripFidelity.cosineSimilarity).toBeGreaterThan(0.3);
        }
      }
    });

    it("same-dim round-trip has MSE < 0.01", () => {
      const result = translatePair(LLAMA7B, MISTRAL);
      expect(result.roundTripFidelity.normalizedMSE).toBeLessThan(0.01);
    });
  });

  // ── T6.7: Embedding injectivity ────────────────────────────────────────
  describe("T6.7: Embedding injectivity", () => {
    it("small→large preserves structure on shared dimensions", () => {
      const report = runCrossModelTranslation();
      const embedPairs = report.pairs.filter(p => p.direction === "embed");
      for (const pair of embedPairs) {
        expect(pair.forwardFidelity.cosineSimilarity).toBeGreaterThan(0.95);
      }
    });
  });

  // ── T6.8: Entropy conservation ─────────────────────────────────────────
  describe("T6.8: Entropy conservation", () => {
    it("all translations maintain sign class entropy ≥ 1.5", () => {
      const report = runCrossModelTranslation();
      for (const pair of report.pairs) {
        expect(pair.atlasStats.signClassEntropy).toBeGreaterThanOrEqual(1.5);
      }
    });

    it("R₈ element count matches source dimension", () => {
      const report = runCrossModelTranslation();
      for (const pair of report.pairs) {
        expect(pair.atlasStats.r8Elements).toBe(pair.sourceDim);
      }
    });
  });
});
