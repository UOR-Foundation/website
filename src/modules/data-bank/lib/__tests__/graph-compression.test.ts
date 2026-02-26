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
  ingestRelationships,
  unionTriples,
} from "@/modules/data-bank/lib/ingesters";
import { fusionToContextBlock } from "@/modules/data-bank/lib/fusion-graph";

// ── Test data with heavy repetition (zones, booleans, grades, tiers) ──

const REPEATED_TRIPLES: CompressibleTriple[] = [
  { subject: "s:1", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:2", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:3", predicate: "delta:zone", object: "DRIFT" },
  { subject: "s:4", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:5", predicate: "delta:zone", object: "COHERENCE" },
  { subject: "s:6", predicate: "delta:zone", object: "DRIFT" },
  { subject: "s:1", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:2", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:3", predicate: "uor:certifiedBy", object: "false" },
  { subject: "s:4", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:5", predicate: "uor:certifiedBy", object: "true" },
  { subject: "s:1", predicate: "uor:hasRole", object: "A" },
  { subject: "s:2", predicate: "uor:hasRole", object: "A" },
  { subject: "s:3", predicate: "uor:hasRole", object: "B" },
  { subject: "s:4", predicate: "uor:hasRole", object: "A" },
  { subject: "s:5", predicate: "uor:hasRole", object: "C" },
  { subject: "s:6", predicate: "uor:hasRole", object: "A" },
  { subject: "s:1", predicate: "uor:memberOf", object: "hot" },
  { subject: "s:2", predicate: "uor:memberOf", object: "hot" },
  { subject: "s:3", predicate: "uor:memberOf", object: "cold" },
  { subject: "s:4", predicate: "uor:memberOf", object: "hot" },
  { subject: "s:1", predicate: "delta:hScore", object: "0.85" },
  { subject: "s:2", predicate: "delta:hScore", object: "0.85" },
  { subject: "s:3", predicate: "delta:hScore", object: "0.72" },
  { subject: "s:4", predicate: "delta:hScore", object: "0.85" },
  { subject: "s:1", predicate: "rdf:type", object: "mem:factual" },
  { subject: "s:2", predicate: "rdf:type", object: "mem:factual" },
  { subject: "s:3", predicate: "rdf:type", object: "mem:episodic" },
  { subject: "s:4", predicate: "rdf:type", object: "mem:factual" },
  { subject: "s:5", predicate: "rdf:type", object: "mem:relational" },
  { subject: "s:6", predicate: "rdf:type", object: "mem:factual" },
];

// ═══════════════════════════════════════════════════════════════════
// UGC2 Compression Round-Trip
// ═══════════════════════════════════════════════════════════════════

describe("UGC2 Graph Compression — Round-Trip", () => {
  it("losslessly round-trips triples with repeated object values", () => {
    const { buffer, stats } = compressTriples(REPEATED_TRIPLES);
    const decompressed = decompressTriples(buffer);

    expect(decompressed).toHaveLength(REPEATED_TRIPLES.length);
    for (let i = 0; i < REPEATED_TRIPLES.length; i++) {
      expect(decompressed[i]).toEqual(REPEATED_TRIPLES[i]);
    }
    expect(stats.tripleCount).toBe(REPEATED_TRIPLES.length);
    expect(stats.ratio).toBeGreaterThan(1);
    expect(stats.objectDictSize).toBeGreaterThan(0);
    expect(stats.objectDictHits).toBeGreaterThan(0);
  });

  it("losslessly round-trips via Base64", () => {
    const { encoded } = compressToBase64(REPEATED_TRIPLES);
    const decompressed = decompressFromBase64(encoded);
    expect(decompressed).toEqual(REPEATED_TRIPLES);
  });

  it("object dictionary captures high-frequency values", () => {
    const { stats } = compressTriples(REPEATED_TRIPLES);
    expect(stats.objectDictSize).toBeGreaterThanOrEqual(6);
    expect(stats.objectDictHits).toBeGreaterThan(stats.tripleCount * 0.5);
  });

  it("handles empty triple array", () => {
    const { buffer, stats } = compressTriples([]);
    expect(stats.tripleCount).toBe(0);
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

// ═══════════════════════════════════════════════════════════════════
// Ingesters — Correct Projection & Round-Trip
// ═══════════════════════════════════════════════════════════════════

describe("Ingesters → UGC2 Round-Trip", () => {
  it("memories round-trip through compression", () => {
    const triples = ingestMemories([
      { memoryCid: "cid1", memoryType: "factual", importance: 0.9, storageTier: "hot", epistemicGrade: "A", summary: "Key fact" },
      { memoryCid: "cid2", memoryType: "factual", importance: 0.7, storageTier: "hot", epistemicGrade: "A" },
      { memoryCid: "cid3", memoryType: "episodic", importance: 0.3, storageTier: "cold", epistemicGrade: "C" },
    ]);
    const restored = decompressFromBase64(compressToBase64(triples).encoded);
    expect(restored).toEqual(triples);
  });

  it("memories produce correct predicates", () => {
    const triples = ingestMemories([
      { memoryCid: "x", memoryType: "factual", importance: 0.9, storageTier: "hot", epistemicGrade: "A", summary: "S", sessionCid: "ses:1", compressed: true },
    ]);
    const subjects = triples.filter(t => t.subject === "mem:x");
    expect(subjects.find(t => t.predicate === "rdf:type")?.object).toBe("mem:factual");
    expect(subjects.find(t => t.predicate === "delta:hScore")?.object).toBe("0.9");
    expect(subjects.find(t => t.predicate === "uor:memberOf")?.object).toBe("hot");
    expect(subjects.find(t => t.predicate === "uor:hasRole")?.object).toBe("A");
    expect(subjects.find(t => t.predicate === "schema:description")?.object).toBe("S");
    expect(subjects.find(t => t.predicate === "uor:derivedFrom")?.object).toBe("ses:1");
    expect(subjects.find(t => t.predicate === "uor:certifiedBy")?.object).toBe("compressed");
  });

  it("proofs with steps round-trip through compression", () => {
    const triples = ingestProofs([{
      proofId: "proof-001",
      overallGrade: "A",
      converged: true,
      iterations: 3,
      finalCurvature: 0.0012,
      conclusion: "Simply connected",
      premises: ["axiom:1", "lemma:2"],
      steps: [
        { mode: "deductive", rule: "modus_ponens", justification: "from axiom:1", curvature: 0.05 },
        { mode: "inductive", rule: "pattern_match", justification: "5 cases", curvature: 0.02 },
      ],
    }]);
    const restored = decompressFromBase64(compressToBase64(triples).encoded);
    expect(restored).toEqual(triples);
  });

  it("proofs encode step observations with correct format", () => {
    const triples = ingestProofs([{
      proofId: "p1", overallGrade: "B", converged: false, iterations: 1, finalCurvature: 0.1,
      steps: [{ mode: "deductive", rule: "mp", justification: "j", curvature: 0.05 }],
    }]);
    const stepTriple = triples.find(t => t.predicate === "uor:observes");
    expect(stepTriple?.object).toBe("0:deductive:mp:κ=0.0500");
  });

  it("checkpoints round-trip and dict-encode repeated zones", () => {
    const triples = ingestCheckpoints([
      { sessionCid: "s1", sequenceNum: 0, zone: "COHERENCE", hScore: 0.9, observerPhi: 1.0, memoryCount: 5 },
      { sessionCid: "s2", parentCid: "s1", sequenceNum: 1, zone: "COHERENCE", hScore: 0.88, observerPhi: 0.99, memoryCount: 7 },
      { sessionCid: "s3", parentCid: "s2", sequenceNum: 2, zone: "DRIFT", hScore: 0.6, observerPhi: 0.85, memoryCount: 8 },
    ]);
    const { encoded, stats } = compressToBase64(triples);
    expect(decompressFromBase64(encoded)).toEqual(triples);
    expect(stats.objectDictHits).toBeGreaterThan(0);
  });

  it("audio tracks with genres project correctly", () => {
    const triples = ingestAudioTracks([
      { trackCid: "t1", title: "Alpha", artist: "UOR", genres: ["ambient", "electronic"], durationSeconds: 240 },
      { trackCid: "t2", title: "Beta", artist: "UOR", genres: ["ambient"] },
    ]);
    expect(triples.filter(t => t.predicate === "rdf:type")).toHaveLength(2);
    expect(triples.filter(t => t.predicate === "uor:interestedIn")).toHaveLength(3); // 2 + 1
    expect(triples.find(t => t.subject === "audio:t1" && t.predicate === "schema:description")?.object).toBe("240s");
    // Round-trip
    expect(decompressFromBase64(compressToBase64(triples).encoded)).toEqual(triples);
  });

  it("audio features with derivation project correctly", () => {
    const triples = ingestAudioFeatures([
      { trackCid: "t1", featureId: "rms", label: "RMS", value: 0.42, unit: "amp", confidence: 0.95, derivationId: "d:1" },
      { trackCid: "t1", featureId: "bpm", label: "BPM", value: 120, unit: "bpm", confidence: 0.88 },
    ]);
    expect(triples.filter(t => t.predicate === "uor:observes")).toHaveLength(2);
    expect(triples.filter(t => t.predicate === "uor:derivedFrom")).toHaveLength(1);
    expect(decompressFromBase64(compressToBase64(triples).encoded)).toEqual(triples);
  });

  it("relationships project correctly", () => {
    const triples = ingestRelationships([
      { relationshipCid: "r1", targetId: "agent:bob", relationshipType: "collaboration", trustScore: 0.95, interactionCount: 12 },
      { relationshipCid: "r2", targetId: "agent:alice", relationshipType: "collaboration", trustScore: 0.8, interactionCount: 5 },
    ]);
    expect(triples.filter(t => t.predicate === "rdf:type" && t.object === "rel:collaboration")).toHaveLength(2);
    expect(triples.find(t => t.subject === "rel:r1" && t.predicate === "delta:hScore")?.object).toBe("0.95");
    expect(decompressFromBase64(compressToBase64(triples).encoded)).toEqual(triples);
  });
});

// ═══════════════════════════════════════════════════════════════════
// unionTriples — Deduplication
// ═══════════════════════════════════════════════════════════════════

describe("unionTriples deduplication", () => {
  it("removes exact duplicates across sources", () => {
    const a: CompressibleTriple[] = [
      { subject: "s:1", predicate: "rdf:type", object: "test" },
      { subject: "s:2", predicate: "rdf:type", object: "test" },
    ];
    const b: CompressibleTriple[] = [
      { subject: "s:1", predicate: "rdf:type", object: "test" }, // dup
      { subject: "s:3", predicate: "rdf:type", object: "other" },
    ];
    const merged = unionTriples(a, b);
    expect(merged).toHaveLength(3);
  });

  it("preserves insertion order (first source wins)", () => {
    const a: CompressibleTriple[] = [{ subject: "x", predicate: "p", object: "a-first" }];
    const b: CompressibleTriple[] = [{ subject: "y", predicate: "p", object: "b-second" }];
    const merged = unionTriples(a, b);
    expect(merged[0].object).toBe("a-first");
    expect(merged[1].object).toBe("b-second");
  });

  it("handles empty sources gracefully", () => {
    const a: CompressibleTriple[] = [{ subject: "s", predicate: "p", object: "o" }];
    expect(unionTriples(a, [], [])).toHaveLength(1);
    expect(unionTriples([], [], [])).toHaveLength(0);
  });

  it("deduplicates within a single source", () => {
    const a: CompressibleTriple[] = [
      { subject: "s", predicate: "p", object: "o" },
      { subject: "s", predicate: "p", object: "o" },
    ];
    expect(unionTriples(a)).toHaveLength(1);
  });

  it("multi-modal union compresses efficiently", () => {
    const audio = ingestAudioTracks([
      { trackCid: "trk:1", title: "Resonance", artist: "UOR", genres: ["ambient", "electronic"] },
      { trackCid: "trk:2", title: "Coherence", artist: "UOR", genres: ["ambient"] },
    ]);
    const features = ingestAudioFeatures([
      { trackCid: "trk:1", featureId: "rms", label: "RMS", value: 0.42, unit: "amp", confidence: 0.95 },
      { trackCid: "trk:2", featureId: "rms", label: "RMS", value: 0.38, unit: "amp", confidence: 0.91 },
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
  });
});

// ═══════════════════════════════════════════════════════════════════
// fusionToContextBlock — LLM Context Serialization
// ═══════════════════════════════════════════════════════════════════

describe("fusionToContextBlock", () => {
  it("serializes triples into <uor-context> block", () => {
    const triples: CompressibleTriple[] = [
      { subject: "s:1", predicate: "rdf:type", object: "test" },
      { subject: "s:2", predicate: "schema:name", object: "hello world" },
    ];
    const block = fusionToContextBlock(triples);
    expect(block).toContain("<uor-context>");
    expect(block).toContain("</uor-context>");
    expect(block).toContain("s:1 rdf:type test");
    expect(block).toContain("s:2 schema:name hello world");
  });

  it("handles empty triples", () => {
    const block = fusionToContextBlock([]);
    expect(block).toBe("<uor-context>\n\n</uor-context>");
  });
});
