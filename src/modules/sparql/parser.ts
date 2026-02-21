/**
 * SPARQL-like Query Parser — translates basic SPARQL SELECT into structured AST.
 *
 * Supported syntax:
 *   PREFIX ns: <uri>
 *   SELECT ?var1 ?var2 WHERE { pattern } LIMIT n OFFSET m
 *
 * Pattern types:
 *   { ?s ?p ?o }           — all triples
 *   { <iri> ?p ?o }        — fixed subject
 *   { ?s <predicate> ?o }  — fixed predicate
 *   { ?s ?p "literal" }    — fixed object
 *
 * FILTER:
 *   FILTER(?var = "value")
 *   FILTER(?var != "value")
 *
 * This parser is intentionally minimal — it covers the patterns needed
 * for querying the uor_triples table via Supabase.
 */

// ── AST types ───────────────────────────────────────────────────────────────

export interface SparqlPrefix {
  prefix: string;
  uri: string;
}

export type TermKind = "variable" | "iri" | "literal";

export interface PatternTerm {
  kind: TermKind;
  value: string;
}

export interface TriplePattern {
  subject: PatternTerm;
  predicate: PatternTerm;
  object: PatternTerm;
}

export interface FilterClause {
  variable: string;
  operator: "=" | "!=";
  value: string;
}

export interface ParsedSparql {
  prefixes: SparqlPrefix[];
  variables: string[];       // e.g. ["?s", "?p", "?o"]
  patterns: TriplePattern[];
  filters: FilterClause[];
  limit?: number;
  offset?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Split triple patterns on `.` separators while preserving dots inside
 * angle-bracket IRIs and quoted literals.
 */
function splitPatterns(body: string): string[] {
  const patterns: string[] = [];
  let current = "";
  let inAngle = false;
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inAngle) {
      current += ch;
      if (ch === ">") inAngle = false;
    } else if (inQuote) {
      current += ch;
      if (ch === quoteChar) inQuote = false;
    } else if (ch === "<") {
      inAngle = true;
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === ".") {
      patterns.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) patterns.push(current);
  return patterns;
}


function parseTerm(token: string, prefixes: SparqlPrefix[]): PatternTerm {
  if (token.startsWith("?")) {
    return { kind: "variable", value: token };
  }
  if (token.startsWith("<") && token.endsWith(">")) {
    return { kind: "iri", value: token.slice(1, -1) };
  }
  if (token.startsWith('"') && token.endsWith('"')) {
    return { kind: "literal", value: token.slice(1, -1) };
  }
  if (token.startsWith("'") && token.endsWith("'")) {
    return { kind: "literal", value: token.slice(1, -1) };
  }
  // Check for prefixed name (e.g. schema:value)
  const colonIdx = token.indexOf(":");
  if (colonIdx > 0) {
    const pfx = token.slice(0, colonIdx);
    const local = token.slice(colonIdx + 1);
    const match = prefixes.find((p) => p.prefix === pfx);
    if (match) {
      return { kind: "iri", value: match.uri + local };
    }
  }
  // Fallback: treat as literal
  return { kind: "literal", value: token };
}

// ── Parser ──────────────────────────────────────────────────────────────────

export function parseSparql(query: string): ParsedSparql {
  const prefixes: SparqlPrefix[] = [];
  const variables: string[] = [];
  const patterns: TriplePattern[] = [];
  const filters: FilterClause[] = [];
  let limit: number | undefined;
  let offset: number | undefined;

  // Normalize whitespace
  const normalized = query.replace(/\s+/g, " ").trim();

  // Extract PREFIX declarations
  const prefixRe = /PREFIX\s+(\w+):\s*<([^>]+)>/gi;
  let pfxMatch: RegExpExecArray | null;
  while ((pfxMatch = prefixRe.exec(normalized)) !== null) {
    prefixes.push({ prefix: pfxMatch[1], uri: pfxMatch[2] });
  }

  // Extract SELECT variables
  const selectRe = /SELECT\s+([\?\w\s*]+?)\s+WHERE/i;
  const selectMatch = normalized.match(selectRe);
  if (selectMatch) {
    const vars = selectMatch[1].trim();
    if (vars === "*") {
      variables.push("?s", "?p", "?o");
    } else {
      variables.push(...vars.split(/\s+/).filter((v) => v.startsWith("?")));
    }
  }

  // Extract WHERE { ... } body
  const whereRe = /WHERE\s*\{([^}]+)\}/i;
  const whereMatch = normalized.match(whereRe);
  if (whereMatch) {
    const body = whereMatch[1].trim();

    // Extract FILTER clauses
    const filterRe = /FILTER\s*\(\s*(\?\w+)\s*(=|!=)\s*"([^"]*)"\s*\)/gi;
    let fMatch: RegExpExecArray | null;
    while ((fMatch = filterRe.exec(body)) !== null) {
      filters.push({
        variable: fMatch[1],
        operator: fMatch[2] as "=" | "!=",
        value: fMatch[3],
      });
    }

    // Remove FILTER from body to parse triple patterns
    const cleanBody = body.replace(/FILTER\s*\([^)]+\)/gi, "").trim();

    // Split into triple patterns — use ` . ` (dot surrounded by spaces or at end)
    // to avoid splitting on dots inside IRIs like <https://example.com/1>
    const patternStrs = splitPatterns(cleanBody);
    for (const ps of patternStrs) {
      const trimmed = ps.trim();
      if (!trimmed) continue;

      // Tokenize: handle <iri>, "literal", 'literal', ?var, prefixed:name, plain words
      const tokens: string[] = [];
      const tokenRe = /<[^>]+>|"[^"]*"|'[^']*'|\?\w+|\w+:\w+|\w+/g;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tokenRe.exec(trimmed)) !== null) {
        tokens.push(tMatch[0]);
      }

      if (tokens.length >= 3) {
        patterns.push({
          subject: parseTerm(tokens[0], prefixes),
          predicate: parseTerm(tokens[1], prefixes),
          object: parseTerm(tokens[2], prefixes),
        });
      }
    }
  }

  // Extract LIMIT
  const limitRe = /LIMIT\s+(\d+)/i;
  const limitMatch = normalized.match(limitRe);
  if (limitMatch) limit = parseInt(limitMatch[1]);

  // Extract OFFSET
  const offsetRe = /OFFSET\s+(\d+)/i;
  const offsetMatch = normalized.match(offsetRe);
  if (offsetMatch) offset = parseInt(offsetMatch[1]);

  return { prefixes, variables, patterns, filters, limit, offset };
}
