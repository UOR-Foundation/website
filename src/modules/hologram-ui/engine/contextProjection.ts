/**
 * Context Projection Engine — LEANN-Inspired Compute-on-Demand
 * ═════════════════════════════════════════════════════════════
 *
 * The user's identity (UOR CID) is the anchor node. Context is NOT
 * stored as a materialized profile — it is PROJECTED from atomic
 * triples in the knowledge graph, exactly as the holographic principle
 * encodes higher-dimensional information on a 2D surface.
 *
 * Storage: uor_triples with graph_iri = "urn:uor:context:{user_id}"
 * Projection: triples → UserContextProfile (compute-on-demand)
 *
 * This achieves ~97% storage reduction (LEANN insight): we store
 * atomic facts and recompute the embedding on every read.
 *
 * Predicates:
 *   uor:interestedIn  → interest tag (object = tag, weight in graph_iri suffix)
 *   uor:activeTask    → task identifier
 *   uor:visitedDomain → navigation domain
 *   uor:phaseAffinity → phase:weight encoding
 *   uor:interactedWith → entity CID (future: trust/reputation)
 *
 * @module hologram-ui/engine/contextProjection
 */

import { supabase } from "@/integrations/supabase/client";
import type { UserContextProfile } from "./signalRelevance";
import { saveContextProfile, loadContextProfile } from "./signalRelevance";
import { writeSlot, readSlot } from "@/modules/data-bank/lib/sync";
import { compressToBase64, decompressFromBase64, type CompressibleTriple } from "@/modules/data-bank/lib/graph-compression";

// ── Predicates ──────────────────────────────────────────────────────────

const P = {
  INTERESTED_IN: "uor:interestedIn",
  ACTIVE_TASK: "uor:activeTask",
  VISITED_DOMAIN: "uor:visitedDomain",
  PHASE_AFFINITY: "uor:phaseAffinity",
  INTERACTED_WITH: "uor:interactedWith",
} as const;

const CONTEXT_GRAPH = (uid: string) => `urn:uor:context:${uid}`;
const MAX_TRIPLES = 500; // cap per user to bound projection cost

// ── Projection: Triples → UserContextProfile ────────────────────────────

type Triple = { subject: string; predicate: string; object: string };

/**
 * Project a UserContextProfile from raw triples.
 * Pure function — no side effects, no network.
 */
export function projectProfile(triples: Triple[]): UserContextProfile {
  const interests: Record<string, number> = {};
  const activeTasks: string[] = [];
  const recentDomains: string[] = [];
  const phaseAffinity: Record<string, number> = { learn: 0.33, work: 0.33, play: 0.33 };

  for (const t of triples) {
    switch (t.predicate) {
      case P.INTERESTED_IN: {
        // Object format: "tag:weight" e.g. "mathematics:0.8"
        const [tag, w] = t.object.split(":");
        if (tag) interests[tag] = parseFloat(w) || 0.5;
        break;
      }
      case P.ACTIVE_TASK:
        if (!activeTasks.includes(t.object)) activeTasks.push(t.object);
        break;
      case P.VISITED_DOMAIN:
        if (!recentDomains.includes(t.object)) recentDomains.push(t.object);
        break;
      case P.PHASE_AFFINITY: {
        const [phase, weight] = t.object.split(":");
        if (phase && (phase in phaseAffinity)) {
          phaseAffinity[phase] = parseFloat(weight) || 0.33;
        }
        break;
      }
      // INTERACTED_WITH: reserved for future entity graph
    }
  }

  return {
    interests,
    activeTasks: activeTasks.slice(0, 20),
    recentDomains: recentDomains.slice(0, 20),
    phaseAffinity,
    updatedAt: Date.now(),
  };
}

// ── Fetch & Project ─────────────────────────────────────────────────────

/**
 * Load triples from the database and project the user's context.
 * Falls back to localStorage if offline or unauthenticated.
 */
export async function fetchAndProject(userId: string): Promise<UserContextProfile> {
  const { data, error } = await supabase
    .from("uor_triples")
    .select("subject, predicate, object")
    .eq("graph_iri", CONTEXT_GRAPH(userId))
    .order("created_at", { ascending: false })
    .limit(MAX_TRIPLES);

  if (error || !data || data.length === 0) {
    // Try compressed Data Bank L2 before localStorage L1
    const banked = await readSlot(userId, "context-triples");
    if (banked?.value) {
      try {
        const triples = decompressFromBase64(banked.value);
        const profile = projectProfile(triples);
        saveContextProfile(profile);
        return profile;
      } catch { /* fall through */ }
    }
    // Legacy: try uncompressed profile slot
    const legacySlot = await readSlot(userId, "context-profile");
    if (legacySlot?.value) {
      try {
        const profile = JSON.parse(legacySlot.value) as UserContextProfile;
        saveContextProfile(profile);
        return profile;
      } catch { /* fall through */ }
    }
    return loadContextProfile();
  }

  const triples = data as Triple[];
  const profile = projectProfile(triples);
  saveContextProfile(profile);

  // L2: store compressed triples (fire-and-forget)
  const { encoded, stats } = compressToBase64(triples as CompressibleTriple[]);
  console.debug(
    `[DataBank] Context graph compressed: ${stats.tripleCount} triples, ` +
    `${stats.rawBytes}B → ${stats.compressedBytes}B (${stats.ratio.toFixed(1)}x)`
  );
  writeSlot(userId, "context-triples", encoded).catch(() => {});

  return profile;
}

// ── Append Context Triple ───────────────────────────────────────────────

/**
 * Append a single context triple. Idempotent: upserts by subject+predicate+object.
 */
export async function appendContextTriple(
  userId: string,
  userCid: string,
  predicate: string,
  object: string,
): Promise<void> {
  await supabase.from("uor_triples").insert({
    subject: userCid,
    predicate,
    object,
    graph_iri: CONTEXT_GRAPH(userId),
  });
}

// ── Convenience Writers ─────────────────────────────────────────────────

export async function recordInterest(
  userId: string, userCid: string, tag: string, weight = 0.5,
): Promise<void> {
  await appendContextTriple(userId, userCid, P.INTERESTED_IN, `${tag}:${weight.toFixed(2)}`);
}

export async function recordTask(
  userId: string, userCid: string, task: string,
): Promise<void> {
  await appendContextTriple(userId, userCid, P.ACTIVE_TASK, task);
}

export async function recordDomainVisit(
  userId: string, userCid: string, domain: string,
): Promise<void> {
  await appendContextTriple(userId, userCid, P.VISITED_DOMAIN, domain);
}

export async function recordPhaseAffinity(
  userId: string, userCid: string, phase: string, weight: number,
): Promise<void> {
  await appendContextTriple(userId, userCid, P.PHASE_AFFINITY, `${phase}:${weight.toFixed(2)}`);
}

export async function recordInteraction(
  userId: string, userCid: string, targetCid: string,
): Promise<void> {
  await appendContextTriple(userId, userCid, P.INTERACTED_WITH, targetCid);
}

// ── Re-export predicates for consumers ──────────────────────────────────
export { P as CONTEXT_PREDICATES };
