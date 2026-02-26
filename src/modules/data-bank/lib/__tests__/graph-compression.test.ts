import { describe, it, expect } from "vitest";
import {
  compressTriples,
  decompressTriples,
  compressToBase64,
  decompressFromBase64,
  type CompressibleTriple,
} from "@/modules/data-bank/lib/graph-compression";
import {
  ingestMemories,
  ingestProofs,
  ingestCheckpoints,
  ingestAudioTracks,
  ingestAudioFeatures,
  unionTriples,
} from "@/modules/data-bank/lib/ingesters";

// ── Test data with heavy repetition (zones, booleans, grades, tiers) ──

const REPEATED_TRIPLES: CompressibleTriple[] = [
  // Zone strings repeat heavily
  { subject: "s:1", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:2", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:3", predicate: "delta:zone", object: "DRIFT" },
  { subject: "s:4", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:5", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:6", predicate: "delta:zone", object: "DRIFT" },
  // Boolean flags
  { subject: "s:1", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:2", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:3", predicate: "uor:certifiedBy", object: "false" },
  { subject: "s:4", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:5", predicate: "uor:certifiedBy", object: "true" },
  // Epistemic grades
  { subject: "s:1", predicate: "uor:hasRole", object: "A" },
  { subject: "s:2", predicate: "uor:hasRole", object: "A" },
  { subject: "s:3", predicate: "uor:hasRole", object: "B" },
  { subject: "s:4", predicate: "uor:hasRole", object: "A" },
  { subject: "s:5", predicate: "uor:hasRole", object: "C" },
  { subject: "s:6", predicate: "uor:hasRole", object: "A" },
  // Storage tiers
  { subject: "s:1", predicate: "uor:memberOf", object: "hot" },
  { subject: "s:2", predicate: "uor:memberOf", object: "hot" },
  { subject: "s:3", predicate: "uor:memberOf", object: "cold" },
  { subject: "s:4", predicate: "uor:memberOf", object: "hot" },
  // Numeric weights (repeated patterns)
  { subject: "s:1", predicate: "delta:hScore", object: "0.85" },
  { subject: "s:2", predicate: "delta:hScore", object: "0.85" },
  { subject: "s:3", predicate: "delta:hScore", object: "0.72" },
  { subject: "s:4", predicate: "delta:hScore", object: "0.85" },
  // Type markers
  { subject: "s:1", predicate: "rdf:type", object: "mem:factual" },
  { subject: "s:2", predicate: "rdf:type", object: "mem:factual" },
  { subject: "s:3", predicate: "rdf:type", object: "mem:episodic" },
  { subject: "s:4", predicate: "rdf:type", object: "mem:factual" },
  { subject: "s:5", predicate: "rdf:type", object: "mem:relational" },
  { subject: "s:6", predicate: "rdf:type", object: "mem:factual" },
];

describe("UGC2 Graph Compression — Round-Trip", () => {
  it("losslessly round-trips triples with repeated object values", () => {
    const { buffer, stats } = compressTriples(REPEATED_TRIPLES);
    const decompressed = decompressTriples(buffer);

    expect(decompressed).toHaveLength(REPEATED_TRIPLES.length);
    for (let i = 0; i < REPEATED_TRIPLES.length; i++) {
      expect(decompressed[i].subject).toBe(REPEATED_TRIPLES[i].subject);
      expect(decompressed[i].predicate).toBe(REPEATED_TRIPLES[i].predicate);
      expect(decompressed[i].object).toBe(REPEATED_TRIPLES[i].object);
    }

    // Verify stats
    expect(stats.tripleCount).toBe(REPEATED_TRIPLES.length);
    expect(stats.ratio).toBeGreaterThan(1);
    expect(stats.objectDictSize).toBeGreaterThan(0);
    expect(stats.objectDictHits).toBeGreaterThan(0);

    console.log(
      `[UGC2] ${stats.tripleCount} triples: ${stats.rawBytes}B → ${stats.compressedBytes}B ` +
      `(${stats.ratio.toFixed(1)}x), objDict=${stats.objectDictSize}, hits=${stats.objectDictHits}`
    );
  });

  it("losslessly round-trips via Base64", () => {
    const { encoded, stats } = compressToBase64(REPEATED_TRIPLES);
    const decompressed = decompressFromBase64(encoded);

    expect(decompressed).toEqual(REPEATED_TRIPLES);
    expect(stats.objectDictHits).toBeGreaterThan(10);
  });

  it("object dictionary captures high-frequency values", () => {
    const { stats } = compressTriples(REPEATED_TRIPLES);

    // "COHERENCE" appears 4x, "true" 4x, "A" 4x, "hot" 3x, "mem:factual" 4x, "0.85" 3x
    expect(stats.objectDictSize).toBeGreaterThanOrEqual(6);
    // Most triples should hit the dict
    expect(stats.objectDictHits).toBeGreaterThan(stats.tripleCount * 0.5);
  });

  it("handles empty triple array", () => {
    const { buffer, stats } = compressTriples([]);
    expect(stats.tripleCount).toBe(0);
    expect(stats.compressedBytes).toBeGreaterThan(0); // header only

    const decompressed = decompressTriples(buffer);
    expect(decompressed).toEqual([]);
  });

  it("handles triples with no repeated objects (all inline)", () => {
    const unique: CompressibleTriple[] = Array.from({ length: 10 }, (_, i) => ({
      subject: `s:${i}`,
      predicate: "schema:name",
      object: `unique-value-${i}-${Math.random().toString(36)}`,
    }));

    const { buffer, stats } = compressTriples(unique);
    const decompressed = decompressTriples(buffer);

    expect(decompressed).toEqual(unique);
    expect(stats.objectDictSize).toBe(0);
    expect(stats.objectDictHits).toBe(0);
  });
});

describe("Ingesters → UGC2 Round-Trip", () => {
  it("memories round-trip through compression", () => {
    const triples = ingestMemories([
      { memoryCid: "cid1", memoryType: "factual", importance: 0.9, storageTier: "hot", epistemicGrade: "A", summary: "Key fact about topology" },
      { memoryCid: "cid2", memoryType: "factual", importance: 0.7, storageTier: "hot", epistemicGrade: "A", summary: "Another important fact" },
      { memoryCid: "cid3", memoryType: "episodic", importance: 0.3, storageTier: "cold", epistemicGrade: "C" },
    ]);

    const { encoded } = compressToBase64(triples);
    const restored = decompressFromBase64(encoded);
    expect(restored).toEqual(triples);
  });

  it("proofs with steps round-trip through compression", () => {
    const triples = ingestProofs([{
      proofId: "proof-001",
      overallGrade: "A",
      converged: true,
      iterations: 3,
      finalCurvature: 0.0012,
      conclusion: "The manifold is simply connected",
      premises: ["axiom:1", "lemma:2"],
      steps: [
        { mode: "deductive", rule: "modus_ponens", justification: "from axiom:1", curvature: 0.05 },
        { mode: "inductive", rule: "pattern_match", justification: "observed in 5 cases", curvature: 0.02 },
      ],
    }]);

    const { encoded } = compressToBase64(triples);
    const restored = decompressFromBase64(encoded);
    expect(restored).toEqual(triples);
  });

  it("checkpoints round-trip through compression", () => {
    const triples = ingestCheckpoints([
      { sessionCid: "ses:1", sequenceNum: 0, zone: "COHERENCE", hScore: 0.9, observerPhi: 1.0, memoryCount: 5 },
      { sessionCid: "ses:2", parentCid: "ses:1", sequenceNum: 1, zone: "COHERENCE", hScore: 0.88, observerPhi: 0.99, memoryCount: 7 },
      { sessionCid: "ses:3", parentCid: "ses:2", sequenceNum: 2, zone: "DRIFT", hScore: 0.6, observerPhi: 0.85, memoryCount: 8 },
    ]);

    const { encoded, stats } = compressToBase64(triples);
    const restored = decompressFromBase64(encoded);
    expect(restored).toEqual(triples);
    // "COHERENCE" appears 2x, "session:checkpoint" 3x → should be dict-encoded
    expect(stats.objectDictHits).toBeGreaterThan(0);
  });

  it("unionTriples deduplicates correctly", () => {
    const a: CompressibleTriple[] = [
      { subject: "s:1", predicate: "rdf:type", object: "test" },
      { subject: "s:2", predicate: "rdf:type", object: "test" },
    ];
    const b: CompressibleTriple[] = [
      { subject: "s:1", predicate: "rdf:type", object: "test" }, // duplicate
      { subject: "s:3", predicate: "rdf:type", object: "other" },
    ];

    const merged = unionTriples(a, b);
    expect(merged).toHaveLength(3);
  });

  it("multi-modal union compresses efficiently", () => {
    const audio = ingestAudioTracks([
      { trackCid: "trk:1", title: "Resonance", artist: "UOR", genres: ["ambient", "electronic"] },
      { trackCid: "trk:2", title: "Coherence", artist: "UOR", genres: ["ambient"] },
    ]);
    const features = ingestAudioFeatures([
      { trackCid: "trk:1", featureId: "rms:mean", label: "RMS", value: 0.42, unit: "amp", confidence: 0.95 },
      { trackCid: "trk:2", featureId: "rms:mean", label: "RMS", value: 0.38, unit: "amp", confidence: 0.91 },
    ]);
    const memories = ingestMemories([
      { memoryCid: "m:1", memoryType: "factual", importance: 0.9, storageTier: "hot", epistemicGrade: "A" },
      { memoryCid: "m:2", memoryType: "factual", importance: 0.8, storageTier: "hot", epistemicGrade: "A" },
    ]);
    const proofs = ingestProofs([
      { proofId: "p:1", overallGrade: "A", converged: true, iterations: 2, finalCurvature: 0.001 },
    ]);

    const merged = unionTriples(audio, features, memories, proofs);
    const { encoded, stats } = compressToBase64(merged);
    const restored = decompressFromBase64(encoded);

    expect(restored).toEqual(merged);
    expect(stats.ratio).toBeGreaterThan(2);
    expect(stats.objectDictSize).toBeGreaterThan(0);

    console.log(
      `[MultiModal] ${stats.tripleCount} triples: ${stats.rawBytes}B → ${stats.compressedBytes}B ` +
      `(${stats.ratio.toFixed(1)}x), objDict=${stats.objectDictSize}, hits=${stats.objectDictHits}`
    );
  });
});
