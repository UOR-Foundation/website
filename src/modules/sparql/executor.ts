/**
 * SPARQL Executor — translates parsed SPARQL AST into Supabase queries
 * against the uor_triples table.
 *
 * Every result row is enriched with an epistemic grade:
 *   - If the subject has a derivation → grade from derivation record
 *   - If subject is in uor_datums but no derivation → grade 'C'
 *   - Otherwise → grade 'D'
 *
 * Delegates to:
 *   - sparql/parser for AST
 *   - integrations/supabase/client for queries
 */

import { supabase } from "@/integrations/supabase/client";
import { parseSparql } from "./parser";
import type { ParsedSparql, TriplePattern, FilterClause } from "./parser";
import type { EpistemicGrade } from "@/types/uor";

// ── Result types ────────────────────────────────────────────────────────────

export interface SparqlResultRow {
  subject: string;
  predicate: string;
  object: string;
  graph_iri: string;
  epistemic_grade: EpistemicGrade;
}

export interface SparqlResult {
  rows: SparqlResultRow[];
  totalCount: number;
  executionTimeMs: number;
  query: string;
  parsed: ParsedSparql;
}

// ── Grade resolution cache ──────────────────────────────────────────────────

async function resolveGrades(
  subjects: string[]
): Promise<Map<string, EpistemicGrade>> {
  const gradeMap = new Map<string, EpistemicGrade>();
  if (subjects.length === 0) return gradeMap;

  const unique = [...new Set(subjects)];

  // Check derivations (grade from derivation table)
  const { data: derivations } = await supabase
    .from("uor_derivations")
    .select("result_iri, epistemic_grade")
    .in("result_iri", unique);

  if (derivations) {
    for (const d of derivations) {
      gradeMap.set(d.result_iri, d.epistemic_grade as EpistemicGrade);
    }
  }

  // Check datums (subject exists but no derivation → C)
  const ungraded = unique.filter((s) => !gradeMap.has(s));
  if (ungraded.length > 0) {
    const { data: datums } = await supabase
      .from("uor_datums")
      .select("iri")
      .in("iri", ungraded);

    if (datums) {
      for (const d of datums) {
        if (!gradeMap.has(d.iri)) {
          gradeMap.set(d.iri, "C");
        }
      }
    }
  }

  return gradeMap;
}

// ── Executor ────────────────────────────────────────────────────────────────

export async function executeSparql(query: string): Promise<SparqlResult> {
  const start = performance.now();
  const parsed = parseSparql(query);

  // Build Supabase query — use `any` to avoid deep type instantiation from chained .eq()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from("uor_triples").select("*", { count: "exact" });

  // Apply triple pattern constraints
  for (const pattern of parsed.patterns) {
    if (pattern.subject.kind === "iri") {
      q = q.eq("subject", pattern.subject.value);
    }
    if (pattern.predicate.kind === "iri" || pattern.predicate.kind === "literal") {
      q = q.eq("predicate", pattern.predicate.value);
    }
    if (pattern.object.kind === "iri" || pattern.object.kind === "literal") {
      q = q.eq("object", pattern.object.value);
    }
  }

  // Apply filters
  for (const filter of parsed.filters) {
    const col = varToColumn(filter.variable);
    if (col) {
      q = filter.operator === "=" ? q.eq(col, filter.value) : q.neq(col, filter.value);
    }
  }

  // Apply LIMIT/OFFSET
  const limit = parsed.limit ?? 100;
  const offset = parsed.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) throw new Error(`SPARQL execution failed: ${error.message}`);

  const triples = data ?? [];

  // Resolve epistemic grades
  const gradeMap = await resolveGrades(triples.map((t) => t.subject));

  const rows: SparqlResultRow[] = triples.map((t) => ({
    subject: t.subject,
    predicate: t.predicate,
    object: t.object,
    graph_iri: t.graph_iri,
    epistemic_grade: gradeMap.get(t.subject) ?? "D",
  }));

  return {
    rows,
    totalCount: count ?? rows.length,
    executionTimeMs: Math.round(performance.now() - start),
    query,
    parsed,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function varToColumn(variable: string): string | null {
  switch (variable) {
    case "?s": return "subject";
    case "?p": return "predicate";
    case "?o": return "object";
    case "?g": return "graph_iri";
    default: return null;
  }
}
