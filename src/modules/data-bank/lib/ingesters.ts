/**
 * Multi-Modal Graph Ingesters — Domain → Triple Projection Operators
 * ═══════════════════════════════════════════════════════════════════
 *
 * Pure functions that convert typed domain objects into
 * CompressibleTriple[] arrays. These are the "projection operators"
 * that map N-dimensional modality data onto the 2D triple surface.
 *
 * Unlike the async projectors in fusion-graph.ts (which query the DB),
 * these are pure transformers: domain object in, triples out.
 * This enables:
 *   1. Ingestion at point-of-creation (not just at fusion time)
 *   2. Deterministic testing without DB
 *   3. Composable pipelines
 *
 * @module data-bank/lib/ingesters
 */

import type { CompressibleTriple } from "./graph-compression";

// ── Shared predicates (reuse static dictionary entries for 1-byte encoding) ──

const P = {
  TYPE: "rdf:type",
  NAME: "schema:name",
  DESC: "schema:description",
  URL: "schema:url",
  INTEREST: "uor:interestedIn",
  ROLE: "uor:hasRole",
  CREATED: "uor:createdAt",
  UPDATED: "uor:updatedAt",
  DERIVED: "uor:derivedFrom",
  CERTIFIED: "uor:certifiedBy",
  OBSERVES: "uor:observes",
  MEMBER: "uor:memberOf",
  H_SCORE: "delta:hScore",
  PHI: "delta:phi",
  SEQUENCE: "delta:sequence",
  ZONE: "delta:zone",
} as const;

// ══════════════════════════════════════════════════════════════════════
// AUDIO INGESTER
// ══════════════════════════════════════════════════════════════════════

/** Minimal audio track shape accepted by the ingester. */
export interface AudioTrackInput {
  trackCid: string;
  title: string;
  artist: string;
  genres?: string[];
  durationSeconds?: number;
}

/** Minimal audio feature shape accepted by the ingester. */
export interface AudioFeatureInput {
  trackCid: string;
  featureId: string;
  label: string;
  value: number;
  unit: string;
  confidence: number;
  lensId?: string;
  derivationId?: string;
}

/**
 * Ingest audio tracks into triples.
 * Each track becomes `audio:{cid}` with metadata predicates.
 */
export function ingestAudioTracks(tracks: AudioTrackInput[]): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  for (const t of tracks) {
    const s = `audio:${t.trackCid}`;
    triples.push({ subject: s, predicate: P.TYPE, object: "audio:track" });
    triples.push({ subject: s, predicate: P.NAME, object: t.title });
    triples.push({ subject: s, predicate: P.CREATED, object: t.artist });
    if (t.genres) {
      for (const g of t.genres.slice(0, 5)) {
        triples.push({ subject: s, predicate: P.INTEREST, object: g });
      }
    }
    if (t.durationSeconds !== undefined) {
      triples.push({ subject: s, predicate: P.DESC, object: `${t.durationSeconds}s` });
    }
  }
  return triples;
}

/**
 * Ingest audio features into triples.
 * Each feature becomes an observation triple on its parent track.
 */
export function ingestAudioFeatures(features: AudioFeatureInput[]): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  for (const f of features) {
    const s = `audio:${f.trackCid}`;
    triples.push({
      subject: s,
      predicate: P.OBSERVES,
      object: `${f.label}:${f.value}${f.unit}@${f.confidence.toFixed(2)}`,
    });
    if (f.derivationId) {
      triples.push({ subject: s, predicate: P.DERIVED, object: f.derivationId });
    }
  }
  return triples;
}

// ══════════════════════════════════════════════════════════════════════
// AGENT MEMORY INGESTER
// ══════════════════════════════════════════════════════════════════════

/** Minimal memory shape accepted by the ingester. */
export interface MemoryInput {
  memoryCid: string;
  memoryType: string;
  importance: number;
  storageTier: string;
  epistemicGrade: string;
  summary?: string | null;
  sessionCid?: string | null;
  compressed?: boolean;
  accessCount?: number;
}

/**
 * Ingest agent memories into triples.
 * Each memory becomes `mem:{cid}` with tier, grade, and importance metadata.
 * High-importance memories get their summary included for AI context.
 */
export function ingestMemories(memories: MemoryInput[]): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  for (const m of memories) {
    const s = `mem:${m.memoryCid}`;
    triples.push({ subject: s, predicate: P.TYPE, object: `mem:${m.memoryType}` });
    triples.push({ subject: s, predicate: P.H_SCORE, object: `${m.importance}` });
    triples.push({ subject: s, predicate: P.MEMBER, object: m.storageTier });
    triples.push({ subject: s, predicate: P.ROLE, object: m.epistemicGrade });
    if (m.summary) {
      // Truncate summaries to keep triples compact
      triples.push({ subject: s, predicate: P.DESC, object: m.summary.slice(0, 200) });
    }
    if (m.sessionCid) {
      triples.push({ subject: s, predicate: P.DERIVED, object: m.sessionCid });
    }
    if (m.compressed) {
      triples.push({ subject: s, predicate: P.CERTIFIED, object: "compressed" });
    }
  }
  return triples;
}

// ══════════════════════════════════════════════════════════════════════
// REASONING PROOF INGESTER
// ══════════════════════════════════════════════════════════════════════

/** Minimal proof step shape. */
export interface ProofStepInput {
  mode: string; // "deductive" | "inductive" | "abductive"
  rule: string;
  justification: string;
  curvature: number;
}

/** Minimal reasoning proof shape accepted by the ingester. */
export interface ReasoningProofInput {
  proofId: string;
  overallGrade: string;
  converged: boolean;
  iterations: number;
  finalCurvature: number;
  conclusion?: string | null;
  premises?: string[];
  steps?: ProofStepInput[];
}

/**
 * Ingest reasoning proofs into triples.
 * Each proof becomes `proof:{id}` with epistemic metadata.
 * Steps are encoded as indexed observation triples for chain reconstruction.
 */
export function ingestProofs(proofs: ReasoningProofInput[]): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  for (const p of proofs) {
    const s = `proof:${p.proofId}`;
    triples.push({ subject: s, predicate: P.TYPE, object: "proof:reasoning" });
    triples.push({ subject: s, predicate: P.ROLE, object: p.overallGrade });
    triples.push({ subject: s, predicate: P.CERTIFIED, object: `${p.converged}` });
    triples.push({ subject: s, predicate: P.SEQUENCE, object: `${p.iterations}` });
    triples.push({ subject: s, predicate: P.PHI, object: `${p.finalCurvature}` });
    if (p.conclusion) {
      triples.push({ subject: s, predicate: P.DESC, object: p.conclusion.slice(0, 200) });
    }
    if (p.premises) {
      for (const premise of p.premises.slice(0, 10)) {
        triples.push({ subject: s, predicate: P.DERIVED, object: premise });
      }
    }
    // Encode proof steps as indexed observations
    if (p.steps) {
      for (let i = 0; i < p.steps.length && i < 20; i++) {
        const step = p.steps[i];
        triples.push({
          subject: s,
          predicate: P.OBSERVES,
          object: `${i}:${step.mode}:${step.rule}:κ=${step.curvature.toFixed(4)}`,
        });
      }
    }
  }
  return triples;
}

// ══════════════════════════════════════════════════════════════════════
// SESSION CHECKPOINT INGESTER
// ══════════════════════════════════════════════════════════════════════

/** Minimal session checkpoint shape. */
export interface SessionCheckpointInput {
  sessionCid: string;
  parentCid?: string | null;
  sequenceNum: number;
  zone: string;
  hScore: number;
  observerPhi: number;
  memoryCount: number;
}

/**
 * Ingest session checkpoints (lightweight metadata only, not full state).
 * For full state delta compression, use compressSessionChain() instead.
 */
export function ingestCheckpoints(checkpoints: SessionCheckpointInput[]): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  for (const c of checkpoints) {
    const s = `session:${c.sessionCid}`;
    triples.push({ subject: s, predicate: P.TYPE, object: "session:checkpoint" });
    triples.push({ subject: s, predicate: P.SEQUENCE, object: `${c.sequenceNum}` });
    triples.push({ subject: s, predicate: P.ZONE, object: c.zone });
    triples.push({ subject: s, predicate: P.H_SCORE, object: `${c.hScore}` });
    triples.push({ subject: s, predicate: P.PHI, object: `${c.observerPhi}` });
    if (c.parentCid) {
      triples.push({ subject: s, predicate: P.DERIVED, object: c.parentCid });
    }
  }
  return triples;
}

// ══════════════════════════════════════════════════════════════════════
// RELATIONSHIP INGESTER
// ══════════════════════════════════════════════════════════════════════

/** Minimal relationship shape. */
export interface RelationshipInput {
  relationshipCid: string;
  targetId: string;
  relationshipType: string;
  trustScore: number;
  interactionCount: number;
}

/**
 * Ingest agent relationships into triples.
 */
export function ingestRelationships(rels: RelationshipInput[]): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  for (const r of rels) {
    const s = `rel:${r.relationshipCid}`;
    triples.push({ subject: s, predicate: P.TYPE, object: `rel:${r.relationshipType}` });
    triples.push({ subject: s, predicate: P.OBSERVES, object: r.targetId });
    triples.push({ subject: s, predicate: P.H_SCORE, object: `${r.trustScore}` });
    triples.push({ subject: s, predicate: P.SEQUENCE, object: `${r.interactionCount}` });
  }
  return triples;
}

// ══════════════════════════════════════════════════════════════════════
// UNIVERSAL UNION — Merge all modalities
// ══════════════════════════════════════════════════════════════════════

/**
 * Union multiple triple arrays into a single graph.
 * Deduplicates by (subject, predicate, object) identity.
 */
export function unionTriples(...sources: CompressibleTriple[][]): CompressibleTriple[] {
  const seen = new Set<string>();
  const result: CompressibleTriple[] = [];
  for (const source of sources) {
    for (const t of source) {
      const key = `${t.subject}\0${t.predicate}\0${t.object}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(t);
      }
    }
  }
  return result;
}
