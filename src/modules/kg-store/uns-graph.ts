/**
 * UNS Knowledge Graph — In-Memory Quad Store with Named Graphs.
 *
 * Provides a SPARQL 1.1-compatible knowledge graph over the UOR ring substrate.
 * Two canonical named graphs:
 *   - Ontology graph: https://uor.foundation/graph/ontology
 *   - Q0 instance graph: https://uor.foundation/graph/q0
 *
 * Each datum in Q0 is materialized as a set of triples capturing:
 *   - @type, schema:value, schema:stratum, u:partitionClass
 *   - op:neg, op:bnot, op:succ, op:pred links
 *
 * This is a pure in-memory store — no external dependencies.
 * For persistent storage, use kg-store/store.ts (Supabase-backed).
 *
 * @see spec/src/namespaces/partition.rs — partition classification
 * @see .well-known/uor.json — quantum_levels, graph definitions
 */

import { neg, bnot, succ, pred, bytePopcount } from "@/lib/uor-ring";

// ── Constants ──────────────────────────────────────────────────────────────

export const ONTOLOGY_GRAPH = "https://uor.foundation/graph/ontology";
export const Q0_GRAPH = "https://uor.foundation/graph/q0";

const UOR = "https://uor.foundation/";
const SCHEMA = `${UOR}schema/`;
const OP = `${UOR}op/`;
const U = `${UOR}u/`;
const PARTITION = `${UOR}partition/`;
const PROOF = `${UOR}proof/`;
const UNS = `${UOR}uns/`;

// ── Quad type ──────────────────────────────────────────────────────────────

/** A single quad: subject-predicate-object in a named graph. */
export interface Quad {
  subject: string;
  predicate: string;
  object: string;
  graph: string;
}

// ── Partition classification (mirrors shield/partition.ts) ──────────────────

function classifyByteQ0(b: number): "EXTERIOR" | "UNIT" | "IRREDUCIBLE" | "REDUCIBLE" {
  if (b === 0 || b === 128) return "EXTERIOR";
  if (b === 1 || b === 255) return "UNIT";
  if (b % 2 === 1) return "IRREDUCIBLE";
  return "REDUCIBLE";
}

// ── UnsGraph ───────────────────────────────────────────────────────────────

/**
 * In-memory quad store for the UNS knowledge graph.
 *
 * Supports named graphs, SPARQL SELECT/CONSTRUCT/ASK,
 * and Q0 materialization (all 256 ring elements).
 */
export class UnsGraph {
  private quads: Quad[] = [];

  // ── Graph loading ──────────────────────────────────────────────────────

  /**
   * Load UOR ontology triples into the ontology named graph.
   *
   * Materializes the 82 core UOR classes and key properties.
   * @returns Number of triples loaded.
   */
  loadOntologyGraph(): number {
    const g = ONTOLOGY_GRAPH;
    const before = this.quads.length;

    // Core UOR classes (82 from vocabulary)
    const classes = [
      "schema:Datum", "schema:Triad", "schema:Ring",
      "op:Operation", "op:Neg", "op:Bnot", "op:Succ", "op:Pred",
      "op:Add", "op:Sub", "op:Mul", "op:Xor", "op:And", "op:Or",
      "partition:ExteriorSet", "partition:UnitSet",
      "partition:IrreducibleSet", "partition:ReducibleSet",
      "derivation:Record", "derivation:RingDerivation",
      "cert:Certificate", "cert:Signature", "cert:InvolutionCertificate",
      "proof:CoherenceProof", "proof:CriticalIdentityProof",
      "u:Address", "u:CanonicalId", "u:Cid", "u:Ipv6",
      "uns:NameRecord", "uns:ResolutionResult", "uns:Zone",
      "morphism:Transform", "morphism:Isometry", "morphism:Embedding",
      "morphism:Action", "morphism:RingHomomorphism",
      "morphism:ProjectionHomomorphism", "morphism:InclusionHomomorphism",
      "morphism:IdentityHomomorphism",
      "trace:ComputationTrace", "trace:AuditTrail",
      "state:Frame", "state:Transition", "state:Context",
      "observer:Observer", "observer:Output", "observer:FieldOfObservation",
      "trust:Session", "trust:Policy", "trust:Conduit",
      "shield:PartitionResult", "shield:DensityThreshold",
      "compute:Function", "compute:ExecutionResult",
      "store:Object", "store:KvEntry", "store:Cache",
      "ledger:Table", "ledger:QueryProof",
      "mesh:Node", "mesh:Route", "mesh:BgpPeer",
      "graph:NamedGraph", "graph:VoIDDataset",
      "epistemic:GradeA", "epistemic:GradeB",
      "epistemic:GradeC", "epistemic:GradeD",
      // W3C alignment classes
      "rdfs:Class", "rdfs:Property", "owl:Class", "owl:ObjectProperty",
      "prov:Activity", "prov:Entity", "prov:Agent",
      "skos:Concept", "skos:ConceptScheme",
      "void:Dataset", "void:Linkset",
      // Additional ontology classes
      "uns:Resolver", "uns:Dht", "uns:Mesh",
      "uns:Shield", "uns:Compute", "uns:Store",
      "uns:Ledger", "uns:Trust",
    ];

    for (const cls of classes) {
      const iri = `${UOR}class/${cls.replace(":", "/")}`;
      this.quads.push({ subject: iri, predicate: "rdf:type", object: "rdfs:Class", graph: g });
      this.quads.push({ subject: iri, predicate: "rdfs:label", object: cls, graph: g });
    }

    // Key properties
    const properties = [
      "schema:value", "schema:quantum", "schema:width", "schema:bits",
      "schema:bytes", "schema:stratum", "schema:spectrum", "schema:glyph",
      "op:neg", "op:bnot", "op:succ", "op:pred",
      "u:canonicalId", "u:cid", "u:ipv6", "u:glyph", "u:partitionClass",
      "partition:component", "partition:density",
      "derivation:derivationId", "derivation:resultIri",
      "cert:certifies", "cert:algorithm", "cert:signatureBytes",
      "proof:verified", "proof:element",
      "uns:name", "uns:target", "uns:ttl", "uns:zone",
      "morphism:from", "morphism:to", "morphism:preservesMetric",
      "epistemic:grade", "epistemic:reason",
    ];

    for (const prop of properties) {
      const iri = `${UOR}property/${prop.replace(":", "/")}`;
      this.quads.push({ subject: iri, predicate: "rdf:type", object: "rdf:Property", graph: g });
      this.quads.push({ subject: iri, predicate: "rdfs:label", object: prop, graph: g });
    }

    return this.quads.length - before;
  }

  /**
   * Materialize all 256 Q0 ring elements as datum nodes in the Q0 graph.
   *
   * Each datum gets triples for: @type, value, stratum, partitionClass,
   * neg, bnot, succ, pred links, and critical identity witness.
   *
   * @returns Number of datum nodes materialized (always 256).
   */
  materializeQ0(): number {
    const g = Q0_GRAPH;

    for (let n = 0; n < 256; n++) {
      const id = `${UOR}datum/q0/${n}`;
      const partClass = classifyByteQ0(n);
      const stratum = bytePopcount(n);

      // Core datum triples
      this.quads.push({ subject: id, predicate: "rdf:type", object: `${SCHEMA}Datum`, graph: g });
      this.quads.push({ subject: id, predicate: `${SCHEMA}value`, object: String(n), graph: g });
      this.quads.push({ subject: id, predicate: `${SCHEMA}stratum`, object: String(stratum), graph: g });
      this.quads.push({ subject: id, predicate: `${U}partitionClass`, object: partClass, graph: g });

      // Ring operation links
      this.quads.push({ subject: id, predicate: `${OP}neg`, object: `${UOR}datum/q0/${neg(n)}`, graph: g });
      this.quads.push({ subject: id, predicate: `${OP}bnot`, object: `${UOR}datum/q0/${bnot(n)}`, graph: g });
      this.quads.push({ subject: id, predicate: `${OP}succ`, object: `${UOR}datum/q0/${succ(n)}`, graph: g });
      this.quads.push({ subject: id, predicate: `${OP}pred`, object: `${UOR}datum/q0/${pred(n)}`, graph: g });

      // Critical identity witness: neg(bnot(n)) === succ(n)
      const negBnot = neg(bnot(n));
      const succN = succ(n);
      const holds = negBnot === succN;
      const witnessId = `${PROOF}critical-identity/x${n}`;
      this.quads.push({ subject: witnessId, predicate: "rdf:type", object: `${PROOF}CriticalIdentityProof`, graph: g });
      this.quads.push({ subject: witnessId, predicate: `${PROOF}element`, object: String(n), graph: g });
      this.quads.push({ subject: witnessId, predicate: `${PROOF}neg_bnot_x`, object: String(negBnot), graph: g });
      this.quads.push({ subject: witnessId, predicate: `${PROOF}succ_x`, object: String(succN), graph: g });
      this.quads.push({ subject: witnessId, predicate: `${PROOF}verified`, object: String(holds), graph: g });
    }

    return 256;
  }

  /**
   * Insert a UNS NameRecord into the graph as triples.
   */
  insertRecord(record: {
    "@type"?: string;
    "uns:name"?: string;
    "uns:target"?: { "u:canonicalId"?: string };
    [key: string]: unknown;
  }): void {
    const g = Q0_GRAPH;
    const name = record["uns:name"] ?? "unknown";
    const id = `${UNS}record/${name}`;

    this.quads.push({ subject: id, predicate: "rdf:type", object: `${UNS}NameRecord`, graph: g });
    this.quads.push({ subject: id, predicate: `${UNS}name`, object: name, graph: g });

    const target = record["uns:target"]?.["u:canonicalId"];
    if (target) {
      this.quads.push({ subject: id, predicate: `${UNS}target`, object: target, graph: g });
    }
  }

  // ── SPARQL queries ─────────────────────────────────────────────────────

  /**
   * Execute a SPARQL SELECT query against the quad store.
   *
   * Supports basic triple patterns with optional GRAPH clause,
   * variable bindings, and FILTER conditions.
   *
   * @returns Array of variable bindings (Record<string, string>).
   */
  sparqlSelect(query: string): Array<Record<string, string>> {
    const { patterns, filters, graphIri, limit } = this.parseQuery(query);
    let bindings = this.matchPatterns(patterns, graphIri);

    // Apply filters
    for (const filter of filters) {
      bindings = bindings.filter((b) => {
        const val = b[filter.variable];
        if (filter.operator === "=") return val === filter.value;
        return val !== filter.value;
      });
    }

    // Apply limit
    if (limit !== undefined) {
      bindings = bindings.slice(0, limit);
    }

    return bindings;
  }

  /**
   * Execute a SPARQL CONSTRUCT query — returns matching quads.
   */
  sparqlConstruct(query: string): Quad[] {
    const { patterns, graphIri } = this.parseQuery(query);
    return this.matchQuads(patterns, graphIri);
  }

  /**
   * Execute a SPARQL ASK query — returns true if any match exists.
   */
  sparqlAsk(query: string): boolean {
    const { patterns, graphIri } = this.parseQuery(query);
    return this.matchPatterns(patterns, graphIri).length > 0;
  }

  // ── Statistics ─────────────────────────────────────────────────────────

  /**
   * Get triple counts by named graph.
   */
  stats(): { ontologyTriples: number; q0Triples: number; totalTriples: number } {
    let ontology = 0;
    let q0 = 0;
    for (const q of this.quads) {
      if (q.graph === ONTOLOGY_GRAPH) ontology++;
      else if (q.graph === Q0_GRAPH) q0++;
    }
    return { ontologyTriples: ontology, q0Triples: q0, totalTriples: this.quads.length };
  }

  /**
   * Get a single datum by value (0-255).
   */
  getDatum(n: number): Record<string, string> | null {
    const id = `${UOR}datum/q0/${n}`;
    const triples = this.quads.filter((q) => q.subject === id && q.graph === Q0_GRAPH);
    if (triples.length === 0) return null;

    const result: Record<string, string> = { "@id": id };
    for (const t of triples) {
      // Use short predicate key
      const key = t.predicate.startsWith(UOR)
        ? t.predicate.slice(UOR.length)
        : t.predicate;
      result[key] = t.object;
    }
    return result;
  }

  /**
   * Get all quads in the store (for export/serialization).
   */
  allQuads(): Quad[] {
    return [...this.quads];
  }

  // ── Internal query engine ──────────────────────────────────────────────

  private parseQuery(query: string): {
    patterns: ParsedPattern[];
    filters: { variable: string; operator: string; value: string }[];
    graphIri?: string;
    limit?: number;
  } {
    const patterns: ParsedPattern[] = [];
    const filters: { variable: string; operator: string; value: string }[] = [];
    let graphIri: string | undefined;
    let limit: number | undefined;

    const normalized = query.replace(/\s+/g, " ").trim();

    // Extract GRAPH clause
    const graphMatch = normalized.match(/GRAPH\s*<([^>]+)>/i);
    if (graphMatch) graphIri = graphMatch[1];

    // Extract LIMIT
    const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) limit = parseInt(limitMatch[1]);

    // Find the innermost brace content (the actual triple patterns)
    // For nested GRAPH { ... }, we want the innermost { ... }
    let body = "";
    const braceStack: number[] = [];
    let innermostStart = -1;
    let innermostEnd = -1;
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] === "{") {
        braceStack.push(i);
      } else if (normalized[i] === "}") {
        const start = braceStack.pop();
        if (start !== undefined && innermostStart === -1) {
          // First closing brace = innermost block
          innermostStart = start + 1;
          innermostEnd = i;
        }
      }
    }
    if (innermostStart >= 0 && innermostEnd >= 0) {
      body = normalized.slice(innermostStart, innermostEnd).trim();
    } else {
      body = normalized;
    }

    // Extract FILTER clauses
    const filterRe = /FILTER\s*\(\s*(\?\w+)\s*(=|!=)\s*"([^"]*)"\s*\)/gi;
    let fMatch: RegExpExecArray | null;
    while ((fMatch = filterRe.exec(body)) !== null) {
      filters.push({ variable: fMatch[1], operator: fMatch[2], value: fMatch[3] });
    }

    // Parse triple patterns — split on `.` but not inside <> or ""
    const cleanBody = body.replace(/FILTER\s*\([^)]+\)/gi, "").replace(/GRAPH\s*<[^>]+>\s*\{/gi, "").trim();
    const patternStrs = this.safeSplitPatterns(cleanBody);

    for (const ps of patternStrs) {
      const tokens: string[] = [];
      const tokenRe = /<[^>]+>|"[^"]*"|'[^']*'|\?\w+|[^\s]+/g;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tokenRe.exec(ps)) !== null) {
        tokens.push(tMatch[0]);
      }

      if (tokens.length >= 3) {
        patterns.push({
          subject: this.parseToken(tokens[0]),
          predicate: this.parseToken(tokens[1]),
          object: this.parseToken(tokens[2]),
        });
      }
    }

    return { patterns, filters, graphIri, limit };
  }

  /** Split triple patterns on `.` while preserving dots inside `<>` and `""`. */
  private safeSplitPatterns(body: string): string[] {
    const patterns: string[] = [];
    let current = "";
    let inAngle = false;
    let inQuote = false;

    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (inAngle) {
        current += ch;
        if (ch === ">") inAngle = false;
      } else if (inQuote) {
        current += ch;
        if (ch === '"') inQuote = false;
      } else if (ch === "<") {
        inAngle = true;
        current += ch;
      } else if (ch === '"') {
        inQuote = true;
        current += ch;
      } else if (ch === ".") {
        if (current.trim()) patterns.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) patterns.push(current.trim());
    return patterns;
  }

  private parseToken(token: string): PatternToken {
    if (token.startsWith("?")) return { kind: "variable", value: token };
    if (token.startsWith("<") && token.endsWith(">")) return { kind: "iri", value: token.slice(1, -1) };
    if (token.startsWith('"') && token.endsWith('"')) return { kind: "literal", value: token.slice(1, -1) };
    // Treat as literal
    return { kind: "literal", value: token };
  }

  private matchPatterns(
    patterns: ParsedPattern[],
    graphIri?: string
  ): Array<Record<string, string>> {
    if (patterns.length === 0) return [];

    // Start with first pattern
    let bindings = this.matchSinglePattern(patterns[0], graphIri);

    // Join with subsequent patterns
    for (let i = 1; i < patterns.length; i++) {
      const nextBindings: Array<Record<string, string>> = [];
      for (const binding of bindings) {
        const resolved = this.resolvePattern(patterns[i], binding);
        const matches = this.matchSinglePattern(resolved, graphIri);
        for (const m of matches) {
          nextBindings.push({ ...binding, ...m });
        }
      }
      bindings = nextBindings;
    }

    return bindings;
  }

  private matchSinglePattern(
    pattern: ParsedPattern,
    graphIri?: string
  ): Array<Record<string, string>> {
    const results: Array<Record<string, string>> = [];

    for (const q of this.quads) {
      if (graphIri && q.graph !== graphIri) continue;

      const binding: Record<string, string> = {};
      if (!this.matchToken(pattern.subject, q.subject, binding)) continue;
      if (!this.matchToken(pattern.predicate, q.predicate, binding)) continue;
      if (!this.matchToken(pattern.object, q.object, binding)) continue;

      results.push(binding);
    }

    return results;
  }

  private matchToken(token: PatternToken, value: string, binding: Record<string, string>): boolean {
    if (token.kind === "variable") {
      if (token.value in binding) {
        return binding[token.value] === value;
      }
      binding[token.value] = value;
      return true;
    }
    return token.value === value;
  }

  private resolvePattern(pattern: ParsedPattern, binding: Record<string, string>): ParsedPattern {
    return {
      subject: this.resolveToken(pattern.subject, binding),
      predicate: this.resolveToken(pattern.predicate, binding),
      object: this.resolveToken(pattern.object, binding),
    };
  }

  private resolveToken(token: PatternToken, binding: Record<string, string>): PatternToken {
    if (token.kind === "variable" && token.value in binding) {
      return { kind: "iri", value: binding[token.value] };
    }
    return token;
  }

  private matchQuads(patterns: ParsedPattern[], graphIri?: string): Quad[] {
    const bindings = this.matchPatterns(patterns, graphIri);
    const matchedQuads: Quad[] = [];

    for (const binding of bindings) {
      for (const q of this.quads) {
        if (graphIri && q.graph !== graphIri) continue;
        // Check if this quad contributed to any binding
        let matches = true;
        for (const pattern of patterns) {
          const s = pattern.subject.kind === "variable" ? binding[pattern.subject.value] : pattern.subject.value;
          const p = pattern.predicate.kind === "variable" ? binding[pattern.predicate.value] : pattern.predicate.value;
          const o = pattern.object.kind === "variable" ? binding[pattern.object.value] : pattern.object.value;
          if (q.subject === s && q.predicate === p && q.object === o) {
            matchedQuads.push(q);
          }
        }
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return matchedQuads.filter((q) => {
      const key = `${q.subject}|${q.predicate}|${q.object}|${q.graph}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// ── Internal types ──────────────────────────────────────────────────────────

interface PatternToken {
  kind: "variable" | "iri" | "literal";
  value: string;
}

interface ParsedPattern {
  subject: PatternToken;
  predicate: PatternToken;
  object: PatternToken;
}
