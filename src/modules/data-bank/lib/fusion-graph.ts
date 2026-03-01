/**
 * Universal Fusion Graph — Holographic Surface Assembler
 * ══════════════════════════════════════════════════════════
 *
 * Implements the graph union operation that merges multi-modal data
 * (user context, audio features, reasoning proofs, agent memories)
 * into a single UGC2-compressed triple graph for the Lumen AI
 * context window.
 *
 * The holographic principle: N-dimensional multi-modal experience
 * projected losslessly onto a finite 256-bit canonical surface.
 * Each modality is a "projection operator" that maps domain objects
 * into CompressibleTriple[] — the universal intermediate form.
 * The fusion graph is their union, compressed to approach the
 * Shannon entropy bound.
 *
 *   Audio Features  ─┐
 *   Proof Chains     ─┤→ CompressibleTriple[] → UGC2 blob → context window
 *   Agent Memories   ─┤
 *   User Context     ─┘
 *
 * @module data-bank/lib/fusion-graph
 */

import { supabase } from "@/integrations/supabase/client";
import type { CompressibleTriple, CompressionStats } from "./graph-compression";
import { compressToBase64, decompressFromBase64 } from "./graph-compression";
import { writeSlot, readSlot } from "./sync";

// ── Fusion Predicates ───────────────────────────────────────────────

const FP = {
  // Audio modality
  AUDIO_TITLE: "schema:name",
  AUDIO_ARTIST: "uor:createdAt",
  AUDIO_GENRE: "uor:interestedIn",
  AUDIO_FEATURE: "uor:observes",
  AUDIO_DURATION: "schema:description",

  // Proof modality
  PROOF_GRADE: "uor:hasRole",
  PROOF_CONVERGED: "uor:certifiedBy",
  PROOF_ITERATIONS: "uor:derivedFrom",
  PROOF_CURVATURE: "delta:phi",
  PROOF_CONCLUSION: "schema:description",

  // Memory modality
  MEMORY_TYPE: "rdf:type",
  MEMORY_IMPORTANCE: "delta:hScore",
  MEMORY_TIER: "uor:memberOf",
  MEMORY_SUMMARY: "schema:description",
  MEMORY_GRADE: "uor:hasRole",

  // Limbic modality (emotional memory)
  MEMORY_VALENCE: "limbic:valence",
  MEMORY_AROUSAL: "limbic:arousal",
  MEMORY_DOMINANCE: "limbic:dominance",
  MEMORY_EMOTION: "limbic:emotion",

  // Context modality (re-uses context predicates)
  CTX_INTEREST: "uor:interestedIn",
  CTX_TASK: "uor:activeTask",
  CTX_DOMAIN: "uor:visitedDomain",
  CTX_PHASE: "uor:phaseAffinity",

  // Fusion metadata
  FUSION_TIMESTAMP: "uor:updatedAt",
  FUSION_MODALITY: "rdf:type",
} as const;

// ── Modality Subjects (namespace isolation) ─────────────────────────

const NS = {
  audio: (cid: string) => `audio:${cid}`,
  proof: (id: string) => `proof:${id}`,
  memory: (cid: string) => `mem:${cid}`,
  context: (uid: string) => `ctx:${uid}`,
  fusion: (uid: string) => `fusion:${uid}`,
} as const;

// ── Projection Operators (domain → triples) ─────────────────────────

/**
 * Project audio tracks + features into triples.
 * Each track becomes a subject with feature observations.
 */
export async function projectAudio(userId: string, limit = 20): Promise<CompressibleTriple[]> {
  const triples: CompressibleTriple[] = [];

  const { data: tracks } = await supabase
    .from("audio_tracks")
    .select("track_cid, title, artist, genres, duration_seconds")
    .eq("user_id", userId)
    .order("ingested_at", { ascending: false })
    .limit(limit);

  if (!tracks?.length) return triples;

  for (const t of tracks) {
    const s = NS.audio(t.track_cid);
    triples.push({ subject: s, predicate: FP.FUSION_MODALITY, object: "audio:track" });
    triples.push({ subject: s, predicate: FP.AUDIO_TITLE, object: t.title });
    triples.push({ subject: s, predicate: FP.AUDIO_ARTIST, object: t.artist });
    if (t.genres?.length) {
      for (const g of t.genres.slice(0, 3)) {
        triples.push({ subject: s, predicate: FP.AUDIO_GENRE, object: g });
      }
    }
    triples.push({ subject: s, predicate: FP.AUDIO_DURATION, object: `${t.duration_seconds}s` });
  }

  // Top features across recent tracks
  const trackCids = tracks.map(t => t.track_cid);
  const { data: features } = await supabase
    .from("audio_features")
    .select("track_cid, label, value, unit, confidence")
    .in("track_cid", trackCids)
    .gte("confidence", 0.6)
    .order("confidence", { ascending: false })
    .limit(50);

  if (features) {
    for (const f of features) {
      triples.push({
        subject: NS.audio(f.track_cid),
        predicate: FP.AUDIO_FEATURE,
        object: `${f.label}:${f.value}${f.unit}`,
      });
    }
  }

  return triples;
}

/**
 * Project reasoning proofs into triples.
 * Each proof becomes a subject with epistemic metadata.
 */
export async function projectProofs(userId: string, limit = 30): Promise<CompressibleTriple[]> {
  const triples: CompressibleTriple[] = [];

  const { data: proofs } = await supabase
    .from("reasoning_proofs")
    .select("proof_id, overall_grade, converged, iterations, final_curvature, conclusion")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!proofs?.length) return triples;

  for (const p of proofs) {
    const s = NS.proof(p.proof_id);
    triples.push({ subject: s, predicate: FP.FUSION_MODALITY, object: "proof:reasoning" });
    triples.push({ subject: s, predicate: FP.PROOF_GRADE, object: p.overall_grade });
    triples.push({ subject: s, predicate: FP.PROOF_CONVERGED, object: `${p.converged}` });
    triples.push({ subject: s, predicate: FP.PROOF_ITERATIONS, object: `${p.iterations}` });
    triples.push({ subject: s, predicate: FP.PROOF_CURVATURE, object: `${p.final_curvature}` });
    if (p.conclusion) {
      triples.push({ subject: s, predicate: FP.PROOF_CONCLUSION, object: p.conclusion.slice(0, 200) });
    }
  }

  return triples;
}

/**
 * Project agent memories into triples.
 * Prioritizes hot-tier, high-importance memories.
 */
export async function projectMemories(agentId: string, limit = 50): Promise<CompressibleTriple[]> {
  const triples: CompressibleTriple[] = [];

  const { data: memories } = await supabase
    .from("agent_memories")
    .select("memory_cid, memory_type, importance, storage_tier, epistemic_grade, summary, valence, arousal, dominance")
    .eq("agent_id", agentId)
    .order("importance", { ascending: false })
    .limit(limit);

  if (!memories?.length) return triples;

  for (const m of memories) {
    const s = NS.memory(m.memory_cid);
    triples.push({ subject: s, predicate: FP.FUSION_MODALITY, object: "mem:agent" });
    triples.push({ subject: s, predicate: FP.MEMORY_TYPE, object: m.memory_type });
    triples.push({ subject: s, predicate: FP.MEMORY_IMPORTANCE, object: `${m.importance}` });
    triples.push({ subject: s, predicate: FP.MEMORY_TIER, object: m.storage_tier });
    triples.push({ subject: s, predicate: FP.MEMORY_GRADE, object: m.epistemic_grade });
    if (m.summary) {
      triples.push({ subject: s, predicate: FP.MEMORY_SUMMARY, object: m.summary.slice(0, 200) });
    }
    // Limbic emotional fingerprint
    triples.push({ subject: s, predicate: FP.MEMORY_VALENCE, object: `${m.valence}` });
    triples.push({ subject: s, predicate: FP.MEMORY_AROUSAL, object: `${m.arousal}` });
    triples.push({ subject: s, predicate: FP.MEMORY_DOMINANCE, object: `${m.dominance}` });
  }

  return triples;
}

/**
 * Project user context triples (already in triple form in DB).
 */
export async function projectContext(userId: string, limit = 200): Promise<CompressibleTriple[]> {
  const { data } = await supabase
    .from("uor_triples")
    .select("subject, predicate, object")
    .eq("graph_iri", `urn:uor:context:${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(t => ({
    subject: NS.context(userId),
    predicate: t.predicate,
    object: t.object,
  }));
}

// ── Fusion Graph Assembly ───────────────────────────────────────────

export interface FusionGraphStats {
  modalities: string[];
  triplesByModality: Record<string, number>;
  totalTriples: number;
  compression: CompressionStats;
}

export interface FusionGraphResult {
  encoded: string;
  stats: FusionGraphStats;
  triples: CompressibleTriple[];
}

/**
 * Assemble the universal fusion graph by projecting all modalities
 * and computing their union. The result is a single UGC2 blob
 * that encodes the entire multi-modal context surface.
 *
 * This is the holographic projection: N-dimensional experience
 * compressed onto a finite canonical surface.
 */
export async function assembleFusionGraph(
  userId: string,
  options?: {
    agentId?: string;
    audioLimit?: number;
    proofLimit?: number;
    memoryLimit?: number;
    contextLimit?: number;
  },
): Promise<FusionGraphResult> {
  const agentId = options?.agentId ?? userId;

  // Project all modalities in parallel
  const [audioTriples, proofTriples, memoryTriples, contextTriples] = await Promise.all([
    projectAudio(userId, options?.audioLimit ?? 20),
    projectProofs(userId, options?.proofLimit ?? 30),
    projectMemories(agentId, options?.memoryLimit ?? 50),
    projectContext(userId, options?.contextLimit ?? 200),
  ]);

  // Graph union: concatenate all projections
  const fusionSubject = NS.fusion(userId);
  const fusionMeta: CompressibleTriple[] = [
    { subject: fusionSubject, predicate: FP.FUSION_MODALITY, object: "fusion:holographic-surface" },
    { subject: fusionSubject, predicate: FP.FUSION_TIMESTAMP, object: new Date().toISOString() },
  ];

  const allTriples: CompressibleTriple[] = [
    ...fusionMeta,
    ...contextTriples,
    ...audioTriples,
    ...proofTriples,
    ...memoryTriples,
  ];

  // Compress to UGC2
  const { encoded, stats: compression } = compressToBase64(allTriples);

  const triplesByModality: Record<string, number> = {
    context: contextTriples.length,
    audio: audioTriples.length,
    proofs: proofTriples.length,
    memories: memoryTriples.length,
    meta: fusionMeta.length,
  };

  const modalities = Object.entries(triplesByModality)
    .filter(([, count]) => count > 0)
    .map(([name]) => name);

  const stats: FusionGraphStats = {
    modalities,
    triplesByModality,
    totalTriples: allTriples.length,
    compression,
  };

  console.debug(
    `[FusionGraph] Assembled: ${allTriples.length} triples across [${modalities.join(", ")}], ` +
    `${compression.rawBytes}B → ${compression.compressedBytes}B ` +
    `(${compression.ratio.toFixed(1)}x, objDict=${compression.objectDictSize} ` +
    `hits=${compression.objectDictHits})`
  );

  return { encoded, stats, triples: allTriples };
}

// ── Persist & Load ──────────────────────────────────────────────────

const FUSION_SLOT_KEY = "fusion-graph";

/**
 * Assemble, compress, and persist the fusion graph to the Data Bank.
 */
export async function persistFusionGraph(
  userId: string,
  options?: Parameters<typeof assembleFusionGraph>[1],
): Promise<FusionGraphStats> {
  const { encoded, stats } = await assembleFusionGraph(userId, options);
  await writeSlot(userId, FUSION_SLOT_KEY, encoded);
  return stats;
}

/**
 * Load the most recent fusion graph from the Data Bank.
 * Returns decompressed triples for immediate AI context injection.
 */
export async function loadFusionGraph(
  userId: string,
): Promise<{ triples: CompressibleTriple[]; age: number } | null> {
  const slot = await readSlot(userId, FUSION_SLOT_KEY);
  if (!slot?.value) return null;

  try {
    const triples = decompressFromBase64(slot.value);
    // Extract timestamp from fusion meta triple
    const tsMeta = triples.find(
      t => t.subject.startsWith("fusion:") && t.predicate === FP.FUSION_TIMESTAMP,
    );
    const age = tsMeta ? Date.now() - new Date(tsMeta.object).getTime() : Infinity;
    return { triples, age };
  } catch {
    return null;
  }
}

/**
 * Serialize the fusion graph triples into a compact text block
 * suitable for injection into an LLM context window.
 * Format: one triple per line as "subject predicate object"
 */
export function fusionToContextBlock(triples: CompressibleTriple[]): string {
  const lines = triples.map(t => `${t.subject} ${t.predicate} ${t.object}`);
  return `<uor-context>\n${lines.join("\n")}\n</uor-context>`;
}

/**
 * Get a fresh or cached fusion graph as an LLM-ready context block.
 * Rebuilds if older than maxAgeMs (default: 5 minutes).
 */
export async function getFusionContextBlock(
  userId: string,
  options?: Parameters<typeof assembleFusionGraph>[1] & { maxAgeMs?: number },
): Promise<{ block: string; stats: FusionGraphStats; fromCache: boolean }> {
  const maxAge = options?.maxAgeMs ?? 5 * 60 * 1000;

  // Try cache first
  const cached = await loadFusionGraph(userId);
  if (cached && cached.age < maxAge) {
    return {
      block: fusionToContextBlock(cached.triples),
      stats: {
        modalities: [],
        triplesByModality: {},
        totalTriples: cached.triples.length,
        compression: {
          tripleCount: cached.triples.length,
          rawBytes: 0,
          compressedBytes: 0,
          ratio: 0,
          subjectDictSize: 0,
          unknownPredicates: 0,
          objectDictSize: 0,
          objectDictHits: 0,
        },
      },
      fromCache: true,
    };
  }

  // Rebuild
  const result = await assembleFusionGraph(userId, options);
  // Persist async
  writeSlot(userId, FUSION_SLOT_KEY, result.encoded).catch(() => {});

  return {
    block: fusionToContextBlock(result.triples),
    stats: result.stats,
    fromCache: false,
  };
}
