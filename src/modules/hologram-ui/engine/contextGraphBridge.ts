/**
 * Context Graph Bridge — Resonance ↔ Knowledge Graph Integration
 * ═══════════════════════════════════════════════════════════════
 *
 * Bidirectional bridge between the Resonance Observer and the user's
 * private knowledge graph (messenger_context_graph).
 *
 * Write path: Resonance observations → graph triples
 *   After each self-reflection (Ω-loop), the profile dimensions are
 *   projected as RDF-style triples into the context graph. This means
 *   any system component reading the graph gets resonance awareness.
 *
 * Read path: Graph triples → resonance enrichment
 *   On boot or periodically, the bridge queries the graph for triples
 *   about the user's interests, expertise, preferences, and relationships.
 *   These are compiled into a "graph context" fragment that enriches
 *   the AI prompt alongside the resonance directive.
 *
 * The graph is private to the user (RLS-protected) and provides a
 * richer, more structured understanding than the EMA-based profile alone.
 *
 * @module hologram-ui/engine/contextGraphBridge
 */

import { supabase } from "@/integrations/supabase/client";
import type { ResonanceProfile } from "./resonanceObserver";

// ── Triple Schemas ────────────────────────────────────────────────────

const SOURCE_TYPE = "resonance-observer";
const SUBJECT_PREFIX = "user:self";

/** Predicates used by the resonance → graph projection */
const RESONANCE_PREDICATES = {
  expertise: "resonance:expertise-level",
  density: "resonance:density-preference",
  formality: "resonance:formality-register",
  warmth: "resonance:warmth-preference",
  pace: "resonance:pace-preference",
  resonanceScore: "resonance:score",
  peakTime: "resonance:peak-time",
  primaryDomain: "resonance:primary-domain",
  satisfactionRate: "resonance:satisfaction-rate",
  convergenceRate: "resonance:convergence-rate",
} as const;

/** Predicates the bridge reads FROM the graph to enrich context */
const ENRICHMENT_PREDICATES = [
  "knows-about",
  "interested-in",
  "works-on",
  "prefers",
  "expertise-in",
  "goal",
  "context",
  "relationship",
  "project",
  "skill",
  // Also read our own resonance triples for cross-device consistency
  ...Object.values(RESONANCE_PREDICATES),
];

// ── Write Path: Profile → Graph Triples ───────────────────────────────

interface TripleUpsert {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}

function profileToTriples(profile: ResonanceProfile): TripleUpsert[] {
  const triples: TripleUpsert[] = [];
  const confidence = Math.min(1, profile.observationCount / 20);

  // Dimension labels
  const dimLabel = (v: number, low: string, mid: string, high: string) =>
    v < 0.35 ? low : v > 0.65 ? high : mid;

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.expertise,
    object: dimLabel(profile.expertiseLevel, "accessible", "balanced", "technical"),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.density,
    object: dimLabel(profile.densityPreference, "concise", "balanced", "thorough"),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.formality,
    object: dimLabel(profile.formalityRegister, "casual", "balanced", "formal"),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.warmth,
    object: dimLabel(profile.warmthPreference, "analytical", "balanced", "warm"),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.pace,
    object: dimLabel(profile.pacePreference, "exploratory", "balanced", "direct"),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.resonanceScore,
    object: profile.resonanceScore.toFixed(3),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.satisfactionRate,
    object: profile.satisfactionRate.toFixed(3),
    confidence,
  });

  triples.push({
    subject: SUBJECT_PREFIX,
    predicate: RESONANCE_PREDICATES.convergenceRate,
    object: profile.convergenceRate.toFixed(4),
    confidence,
  });

  // Peak time preference
  const timeLabels = ["morning", "afternoon", "evening", "night"];
  const peakSlot = profile.temporalPreference.indexOf(Math.max(...profile.temporalPreference));
  if (profile.sessionCount > 2) {
    triples.push({
      subject: SUBJECT_PREFIX,
      predicate: RESONANCE_PREDICATES.peakTime,
      object: timeLabels[peakSlot],
      confidence,
    });
  }

  // Top domain interests
  const topDomains = Object.entries(profile.domainInterests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  for (const [domain, count] of topDomains) {
    triples.push({
      subject: SUBJECT_PREFIX,
      predicate: RESONANCE_PREDICATES.primaryDomain,
      object: domain,
      confidence: Math.min(1, count / 10),
    });
  }

  return triples;
}

/**
 * Project the resonance profile into the context graph.
 * Called after self-reflection (Ω-loop) — debounced to avoid excessive writes.
 */
let graphSyncTimer: ReturnType<typeof setTimeout> | null = null;

export async function projectProfileToGraph(
  userId: string,
  profile: ResonanceProfile,
): Promise<void> {
  if (graphSyncTimer) clearTimeout(graphSyncTimer);

  graphSyncTimer = setTimeout(async () => {
    try {
      const triples = profileToTriples(profile);

      // Upsert each triple — delete old resonance triples first, then insert fresh
      await supabase
        .from("messenger_context_graph")
        .delete()
        .eq("user_id", userId)
        .eq("source_type", SOURCE_TYPE);

      const rows = triples.map(t => ({
        user_id: userId,
        triple_subject: t.subject,
        triple_predicate: t.predicate,
        triple_object: t.object,
        confidence: t.confidence,
        source_type: SOURCE_TYPE,
        source_id: `resonance:v2:${profile.profileVersion}`,
      }));

      if (rows.length > 0) {
        await supabase.from("messenger_context_graph").insert(rows);
      }
    } catch {
      // Silent — graph sync is best-effort
    }
  }, 8000); // 8 second debounce
}

// ── Read Path: Graph Triples → Context Enrichment ─────────────────────

export interface GraphContext {
  /** Structured knowledge about the user from the graph */
  knowledgeTriples: { predicate: string; object: string; confidence: number }[];
  /** Compiled natural language summary for the AI prompt */
  contextFragment: string;
  /** When this context was last refreshed */
  refreshedAt: number;
}

let cachedGraphContext: GraphContext | null = null;
const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Query the user's context graph for enrichment triples.
 * Cached to avoid excessive DB reads during rapid exchanges.
 */
export async function loadGraphContext(userId: string): Promise<GraphContext> {
  // Return cache if fresh
  if (cachedGraphContext && (Date.now() - cachedGraphContext.refreshedAt) < GRAPH_CACHE_TTL) {
    return cachedGraphContext;
  }

  try {
    const { data } = await supabase
      .from("messenger_context_graph")
      .select("triple_predicate, triple_object, confidence, source_type")
      .eq("user_id", userId)
      .order("confidence", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      const empty: GraphContext = { knowledgeTriples: [], contextFragment: "", refreshedAt: Date.now() };
      cachedGraphContext = empty;
      return empty;
    }

    // Separate resonance triples from user-authored graph triples
    const userTriples = data.filter(t => t.source_type !== SOURCE_TYPE);
    const resonanceTriples = data.filter(t => t.source_type === SOURCE_TYPE);

    const knowledgeTriples = data.map(t => ({
      predicate: t.triple_predicate,
      object: t.triple_object,
      confidence: t.confidence,
    }));

    // Compile user-authored triples into a context fragment
    const contextFragment = compileGraphFragment(userTriples, resonanceTriples);

    const ctx: GraphContext = {
      knowledgeTriples,
      contextFragment,
      refreshedAt: Date.now(),
    };

    cachedGraphContext = ctx;
    return ctx;
  } catch {
    const empty: GraphContext = { knowledgeTriples: [], contextFragment: "", refreshedAt: Date.now() };
    cachedGraphContext = empty;
    return empty;
  }
}

/**
 * Compile graph triples into a natural language context fragment
 * that enriches the AI's understanding without feeling mechanical.
 */
function compileGraphFragment(
  userTriples: { triple_predicate: string; triple_object: string; confidence: number }[],
  _resonanceTriples: { triple_predicate: string; triple_object: string; confidence: number }[],
): string {
  if (userTriples.length === 0) return "";

  const parts: string[] = [];
  parts.push("═══ CONTEXTUAL AWARENESS (from knowledge graph) ═══");
  parts.push("The following context comes from the user's private knowledge graph. Use it to provide more relevant, personalized responses. Never mention the graph directly.");

  // Group by predicate type
  const groups: Record<string, string[]> = {};
  for (const t of userTriples) {
    const key = t.triple_predicate;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t.triple_object);
  }

  // Interests and expertise
  const interests = [
    ...(groups["interested-in"] || []),
    ...(groups["knows-about"] || []),
  ];
  if (interests.length > 0) {
    parts.push(`They have demonstrated interest and knowledge in: ${interests.join(", ")}.`);
  }

  // Projects and work
  const projects = [
    ...(groups["works-on"] || []),
    ...(groups["project"] || []),
  ];
  if (projects.length > 0) {
    parts.push(`They are working on or involved with: ${projects.join(", ")}.`);
  }

  // Skills
  const skills = groups["skill"] || groups["expertise-in"] || [];
  if (skills.length > 0) {
    parts.push(`Known skills and expertise: ${skills.join(", ")}.`);
  }

  // Goals
  const goals = groups["goal"] || [];
  if (goals.length > 0) {
    parts.push(`Their stated goals include: ${goals.join(", ")}.`);
  }

  // Preferences
  const prefs = groups["prefers"] || [];
  if (prefs.length > 0) {
    parts.push(`Known preferences: ${prefs.join(", ")}.`);
  }

  // General context
  const contexts = groups["context"] || [];
  if (contexts.length > 0) {
    parts.push(`Additional context: ${contexts.join("; ")}.`);
  }

  // Catch-all for other predicates
  const handled = new Set(["interested-in", "knows-about", "works-on", "project", "skill", "expertise-in", "goal", "prefers", "context", "relationship"]);
  for (const [pred, objects] of Object.entries(groups)) {
    if (!handled.has(pred) && !pred.startsWith("resonance:")) {
      parts.push(`${pred}: ${objects.join(", ")}.`);
    }
  }

  parts.push("═══ END CONTEXTUAL AWARENESS ═══");

  return "\n\n" + parts.join("\n");
}

/**
 * Invalidate the graph context cache.
 * Call this when the user updates their graph manually.
 */
export function invalidateGraphCache(): void {
  cachedGraphContext = null;
}
