/**
 * UOR v2.0.0 — Proof Pre-Computation Engine
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Batch-generates claim-level proofs for common query patterns so that
 * future PGI lookups hit instantly without touching the LLM.
 *
 * Categories:
 *   • Definitions  — "What is X?"
 *   • Comparisons  — "X vs Y", "difference between X and Y"
 *   • Cause-Effect — "Why does X?", "How does X affect Y?"
 *   • Enumerations — "List types of X", "Examples of X"
 *   • Properties   — "Features of X", "Characteristics of X"
 *
 * Each pattern is scaffolded via buildScaffold(), decomposed into ClaimSlots,
 * and the slots are written to uor_inference_proofs so PGI can serve them
 * at O(1) in real queries.
 *
 * @module ring-core/proof-precompute
 */

import { buildScaffold } from "./neuro-symbolic";
import { decomposeToClaims, type ClaimSlot } from "./proof-gated-inference";
import { supabase } from "@/integrations/supabase/client";

// ── Dynamic Vocabulary Extraction ──────────────────────────────────────────

/**
 * Extract domain-specific terms from the live knowledge graph tables.
 * Pulls from: predicates, graph IRIs, lens names, derivation terms.
 */
export async function fetchDomainVocabulary(): Promise<{
  terms: string[];
  pairs: Array<[string, string]>;
}> {
  const [predicates, graphs, lenses, derivations] = await Promise.all([
    supabase.from("uor_triples").select("predicate").limit(500),
    supabase.from("uor_triples").select("graph_iri").limit(100),
    supabase.from("lens_blueprints").select("name, description").limit(50),
    supabase.from("uor_derivations").select("original_term, canonical_term").limit(100),
  ]);

  const extracted = new Set<string>();

  // Extract human-readable predicate names (strip namespace prefixes)
  for (const row of predicates.data ?? []) {
    const pred = row.predicate as string;
    const clean = pred.replace(/^(schema|proof|partition|rdf|rdfs|u):/, "");
    if (clean.length >= 3 && clean.length <= 40 && !/^[A-Z0-9]+$/.test(clean)) {
      extracted.add(clean.replace(/([A-Z])/g, " $1").trim().toLowerCase());
    }
  }

  // Extract graph IRI labels
  for (const row of graphs.data ?? []) {
    const iri = row.graph_iri as string;
    const match = iri.match(/graph:([^:]+)/);
    if (match) extracted.add(match[1]);
  }

  // Extract lens blueprint names and key terms from descriptions
  for (const row of lenses.data ?? []) {
    if (row.name) extracted.add(row.name as string);
    const desc = (row.description as string) ?? "";
    // Pull capitalized multi-word terms from descriptions
    const phrases = desc.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/g);
    if (phrases) phrases.forEach(p => extracted.add(p));
  }

  // Extract derivation operation names
  for (const row of derivations.data ?? []) {
    const orig = row.original_term as string;
    const op = orig.match(/^(\w+)\(/);
    if (op && op[1].length >= 3) extracted.add(op[1]);
  }

  const dynamicTerms = Array.from(extracted).filter(t => t.length >= 3);

  // Build dynamic pairs from first 16 terms (8 pairs)
  const dynamicPairs: Array<[string, string]> = [];
  for (let i = 0; i + 1 < dynamicTerms.length && dynamicPairs.length < 8; i += 2) {
    dynamicPairs.push([dynamicTerms[i], dynamicTerms[i + 1]]);
  }

  return { terms: dynamicTerms, pairs: dynamicPairs };
}

// ── Pattern Templates ──────────────────────────────────────────────────────

export interface QueryPattern {
  readonly id: string;
  readonly category: "definition" | "comparison" | "cause-effect" | "enumeration" | "property";
  readonly template: string;
  /** Variables to substitute (e.g., ["X", "Y"]). */
  readonly variables: string[];
}

/** Common reasoning patterns that appear across domains. */
export const COMMON_PATTERNS: QueryPattern[] = [
  // ── Definitions ──
  { id: "def-what-is",       category: "definition",   template: "What is {X}?",                          variables: ["X"] },
  { id: "def-define",        category: "definition",   template: "Define {X}",                             variables: ["X"] },
  { id: "def-meaning",       category: "definition",   template: "What does {X} mean?",                    variables: ["X"] },
  { id: "def-explain",       category: "definition",   template: "Explain {X}",                            variables: ["X"] },

  // ── Comparisons ──
  { id: "cmp-vs",            category: "comparison",   template: "What is the difference between {X} and {Y}?", variables: ["X", "Y"] },
  { id: "cmp-compare",       category: "comparison",   template: "Compare {X} and {Y}",                   variables: ["X", "Y"] },
  { id: "cmp-better",        category: "comparison",   template: "Is {X} better than {Y}?",               variables: ["X", "Y"] },

  // ── Cause-Effect ──
  { id: "ce-why",            category: "cause-effect",  template: "Why does {X} happen?",                  variables: ["X"] },
  { id: "ce-how-affect",     category: "cause-effect",  template: "How does {X} affect {Y}?",              variables: ["X", "Y"] },
  { id: "ce-consequence",    category: "cause-effect",  template: "What are the consequences of {X}?",     variables: ["X"] },
  { id: "ce-cause",          category: "cause-effect",  template: "What causes {X}?",                      variables: ["X"] },

  // ── Enumerations ──
  { id: "enum-types",        category: "enumeration",  template: "What are the types of {X}?",             variables: ["X"] },
  { id: "enum-examples",     category: "enumeration",  template: "Give examples of {X}",                   variables: ["X"] },
  { id: "enum-list",         category: "enumeration",  template: "List the main {X}",                      variables: ["X"] },

  // ── Properties ──
  { id: "prop-features",     category: "property",     template: "What are the features of {X}?",          variables: ["X"] },
  { id: "prop-how-works",    category: "property",     template: "How does {X} work?",                     variables: ["X"] },
  { id: "prop-advantages",   category: "property",     template: "What are the advantages of {X}?",        variables: ["X"] },
];

// ── Domain Terms ───────────────────────────────────────────────────────────

/** High-value terms to pre-compute across patterns. */
export const DOMAIN_TERMS: string[] = [
  // UOR / Framework
  "UOR", "content addressing", "canonical form", "SHA-256", "CID",
  "ring arithmetic", "fiber budget", "proof", "certificate",
  "epistemic grade", "hologram", "lens", "morphism",
  // AI / ML
  "neural network", "transformer", "attention mechanism", "inference",
  "training", "backpropagation", "embedding", "tokenization",
  "large language model", "reinforcement learning",
  // Cryptography
  "encryption", "hash function", "digital signature", "zero knowledge proof",
  "post-quantum cryptography", "lattice", "Dilithium",
  // General CS
  "algorithm", "data structure", "database", "API", "protocol",
  "distributed system", "consensus", "blockchain",
];

/** Term pairs for comparison patterns. */
export const TERM_PAIRS: Array<[string, string]> = [
  ["neural network", "symbolic AI"],
  ["deductive reasoning", "inductive reasoning"],
  ["encryption", "hashing"],
  ["SQL", "NoSQL"],
  ["REST", "GraphQL"],
  ["proof of work", "proof of stake"],
  ["classical computing", "quantum computing"],
  ["supervised learning", "unsupervised learning"],
];

// ── Batch Job ──────────────────────────────────────────────────────────────

/** Result of a single pattern precomputation. */
export interface PrecomputeResult {
  readonly patternId: string;
  readonly query: string;
  readonly claimsGenerated: number;
  readonly claimsStored: number;
  readonly alreadyCached: number;
}

/** Summary of a full batch precomputation run. */
export interface BatchResult {
  readonly totalPatterns: number;
  readonly totalClaims: number;
  readonly newClaimsStored: number;
  readonly alreadyCached: number;
  readonly durationMs: number;
  readonly results: PrecomputeResult[];
}

/**
 * Instantiate a query from a pattern + variable bindings.
 */
function instantiatePattern(pattern: QueryPattern, bindings: Record<string, string>): string {
  let query = pattern.template;
  for (const [key, value] of Object.entries(bindings)) {
    query = query.replace(`{${key}}`, value);
  }
  return query;
}

/**
 * Generate all query instances from patterns × terms.
 */
export function generateQueryInstances(
  patterns: QueryPattern[] = COMMON_PATTERNS,
  terms: string[] = DOMAIN_TERMS,
  pairs: Array<[string, string]> = TERM_PAIRS,
): Array<{ pattern: QueryPattern; query: string }> {
  const instances: Array<{ pattern: QueryPattern; query: string }> = [];

  for (const pattern of patterns) {
    if (pattern.variables.length === 1) {
      // Single-variable patterns: iterate over terms
      for (const term of terms) {
        instances.push({
          pattern,
          query: instantiatePattern(pattern, { X: term }),
        });
      }
    } else if (pattern.variables.length === 2) {
      // Two-variable patterns: use term pairs
      for (const [x, y] of pairs) {
        instances.push({
          pattern,
          query: instantiatePattern(pattern, { X: x, Y: y }),
        });
      }
    }
  }

  return instances;
}

/**
 * Pre-compute claim-level proofs for a single query.
 * Returns the claims generated (does NOT call the LLM — only scaffolds).
 */
export function precomputeScaffold(query: string): ClaimSlot[] {
  const scaffold = buildScaffold(query, 0);
  return decomposeToClaims(scaffold);
}

/**
 * Store pre-computed claim scaffolds as "structural" proofs.
 * These contain the constraint structure, not LLM output — they seed
 * the PGI cache so that future queries with identical constraints
 * can skip the decomposition step entirely.
 */
async function storeStructuralProofs(claims: ClaimSlot[]): Promise<{ stored: number; skipped: number }> {
  if (claims.length === 0) return { stored: 0, skipped: 0 };

  // Check which hashes already exist
  const hashes = claims.map(c => c.claimHash);
  const { data: existing } = await supabase
    .from("uor_inference_proofs")
    .select("input_hash")
    .in("input_hash", hashes);

  const existingSet = new Set((existing ?? []).map(e => e.input_hash));

  const newClaims = claims.filter(c => !existingSet.has(c.claimHash));
  if (newClaims.length === 0) return { stored: 0, skipped: claims.length };

  // Store structural proofs (output = constraint description, grade = B)
  const rows = newClaims.map(c => ({
    input_hash: c.claimHash,
    input_canonical: c.canonical,
    output_cached: c.constraint.description,
    output_hash: c.claimHash, // self-referential for structural proofs
    proof_id: `pgi:precompute:${c.claimHash}`,
    tool_name: "pgi:precompute",
    epistemic_grade: "B",
    hit_count: 0,
  }));

  const { error } = await supabase
    .from("uor_inference_proofs")
    .upsert(rows, { onConflict: "proof_id" });

  if (error) {
    console.warn("[precompute] batch store error:", error.message);
    return { stored: 0, skipped: claims.length };
  }

  return { stored: newClaims.length, skipped: existingSet.size };
}

/**
 * Run the full batch precomputation job.
 *
 * @param batchSize — Number of queries to process per tick (controls backpressure).
 * @param onProgress — Optional callback for progress reporting.
 */
export async function runPrecomputation(
  batchSize: number = 20,
  onProgress?: (done: number, total: number) => void,
): Promise<BatchResult> {
  const start = performance.now();

  // Merge static terms with live KG vocabulary
  let mergedTerms = [...DOMAIN_TERMS];
  let mergedPairs = [...TERM_PAIRS];
  try {
    const dynamic = await fetchDomainVocabulary();
    const termSet = new Set(mergedTerms.map(t => t.toLowerCase()));
    for (const t of dynamic.terms) {
      if (!termSet.has(t.toLowerCase())) {
        mergedTerms.push(t);
        termSet.add(t.toLowerCase());
      }
    }
    const pairSet = new Set(mergedPairs.map(([a, b]) => `${a}|${b}`));
    for (const p of dynamic.pairs) {
      const key = `${p[0]}|${p[1]}`;
      if (!pairSet.has(key)) {
        mergedPairs.push(p);
        pairSet.add(key);
      }
    }
    console.log(`[precompute] merged ${dynamic.terms.length} KG terms, ${dynamic.pairs.length} KG pairs`);
  } catch (e) {
    console.warn("[precompute] KG vocabulary fetch failed, using static terms only:", e);
  }

  const instances = generateQueryInstances(COMMON_PATTERNS, mergedTerms, mergedPairs);
  const results: PrecomputeResult[] = [];
  let totalClaims = 0;
  let newClaimsStored = 0;
  let alreadyCached = 0;

  // Process in batches to avoid overwhelming the DB
  for (let i = 0; i < instances.length; i += batchSize) {
    const batch = instances.slice(i, i + batchSize);

    // Generate all scaffolds in this batch (CPU-only, instant)
    const batchClaims: Array<{ instance: typeof batch[0]; claims: ClaimSlot[] }> = [];
    for (const inst of batch) {
      const claims = precomputeScaffold(inst.query);
      batchClaims.push({ instance: inst, claims });
    }

    // Flatten all claims and batch-store
    const allClaims = batchClaims.flatMap(bc => bc.claims);
    const { stored, skipped } = await storeStructuralProofs(allClaims);

    // Record per-pattern results
    for (const bc of batchClaims) {
      const r: PrecomputeResult = {
        patternId: bc.instance.pattern.id,
        query: bc.instance.query,
        claimsGenerated: bc.claims.length,
        claimsStored: stored > 0 ? Math.min(bc.claims.length, stored) : 0,
        alreadyCached: skipped > 0 ? Math.min(bc.claims.length, skipped) : 0,
      };
      results.push(r);
      totalClaims += bc.claims.length;
    }

    newClaimsStored += stored;
    alreadyCached += skipped;

    onProgress?.(Math.min(i + batchSize, instances.length), instances.length);
  }

  return {
    totalPatterns: instances.length,
    totalClaims,
    newClaimsStored,
    alreadyCached,
    durationMs: Math.round(performance.now() - start),
    results,
  };
}

/**
 * Get precomputation statistics from the proof store.
 */
export async function getPrecomputeStats(): Promise<{
  totalPrecomputed: number;
  totalHits: number;
  categories: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from("uor_inference_proofs")
    .select("tool_name, hit_count")
    .eq("tool_name", "pgi:precompute");

  if (error || !data) return { totalPrecomputed: 0, totalHits: 0, categories: {} };

  return {
    totalPrecomputed: data.length,
    totalHits: data.reduce((sum, d) => sum + d.hit_count, 0),
    categories: { precomputed: data.length },
  };
}
