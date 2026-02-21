/**
 * UOR Entity Deduplication — groups entities by derivation identity.
 *
 * Two entities with the same derivation_id are provably the same concept.
 * This replaces owl:sameAs assertions with computable equality.
 *
 * Delegates to kg-store for derivation lookups.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface DeduplicationGroup {
  derivationId: string;
  iris: string[];
  canonicalTerm: string;
  epistemicGrade: string;
}

export interface DeduplicationResult {
  groups: DeduplicationGroup[];
  totalEntities: number;
  uniqueConcepts: number;
  duplicateCount: number;
}

// ── deduplicateEntities ─────────────────────────────────────────────────────

/**
 * Group entities by their derivation ID.
 * Entities sharing a derivation_id are provably identical concepts.
 *
 * @param iris - list of UOR IRIs to check
 */
export async function deduplicateEntities(
  iris: string[]
): Promise<DeduplicationResult> {
  if (iris.length === 0) {
    return { groups: [], totalEntities: 0, uniqueConcepts: 0, duplicateCount: 0 };
  }

  // Look up derivations for these IRIs
  const { data, error } = await supabase
    .from("uor_derivations")
    .select("derivation_id, result_iri, canonical_term, epistemic_grade")
    .in("result_iri", iris);

  if (error) throw new Error(`deduplicateEntities failed: ${error.message}`);

  // Group by derivation_id
  const groupMap = new Map<string, DeduplicationGroup>();
  for (const d of data ?? []) {
    const existing = groupMap.get(d.derivation_id);
    if (existing) {
      existing.iris.push(d.result_iri);
    } else {
      groupMap.set(d.derivation_id, {
        derivationId: d.derivation_id,
        iris: [d.result_iri],
        canonicalTerm: d.canonical_term,
        epistemicGrade: d.epistemic_grade,
      });
    }
  }

  const groups = [...groupMap.values()];
  const totalEntities = iris.length;
  const uniqueConcepts = groups.length;
  const duplicateCount = groups.reduce((s, g) => s + Math.max(0, g.iris.length - 1), 0);

  return { groups, totalEntities, uniqueConcepts, duplicateCount };
}
