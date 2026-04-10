/**
 * book-graph-bridge.ts — Emit KG triples for books to the Sovereign Graph Explorer.
 */

import type { CatalogBook } from "./book-catalog";

export interface KGTriple {
  subject: string;
  predicate: string;
  object: string;
}

/** Generate KG triples for a single book */
export function bookToTriples(book: CatalogBook): KGTriple[] {
  const subj = `uor:book:${book.id}`;
  const triples: KGTriple[] = [
    { subject: subj, predicate: "rdf:type", object: "uor:BookSummary" },
    { subject: subj, predicate: "uor:title", object: book.title },
    { subject: subj, predicate: "uor:author", object: book.author },
    { subject: subj, predicate: "uor:hasDomain", object: `uor:domain:${book.domain.replace(/\s+/g, "_")}` },
    { subject: subj, predicate: "uor:sourceUrl", object: book.source_url },
  ];

  for (const tag of book.tags) {
    triples.push({ subject: subj, predicate: "uor:hasTag", object: `uor:tag:${tag.replace(/\s+/g, "_")}` });
  }

  return triples;
}

/** Generate KG triples for the entire catalog */
export function catalogToTriples(books: CatalogBook[]): KGTriple[] {
  const triples: KGTriple[] = [];

  // Domain nodes
  const domains = new Set(books.map((b) => b.domain));
  for (const d of domains) {
    const dNode = `uor:domain:${d.replace(/\s+/g, "_")}`;
    triples.push({ subject: dNode, predicate: "rdf:type", object: "uor:KnowledgeDomain" });
    triples.push({ subject: dNode, predicate: "rdfs:label", object: d });
  }

  // Book nodes + edges
  for (const book of books) {
    triples.push(...bookToTriples(book));
  }

  // Cross-domain connections via shared tags
  const tagMap = new Map<string, string[]>();
  for (const book of books) {
    for (const tag of book.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push(book.id);
    }
  }
  for (const [tag, bookIds] of tagMap) {
    if (bookIds.length > 1) {
      const tagNode = `uor:tag:${tag.replace(/\s+/g, "_")}`;
      triples.push({ subject: tagNode, predicate: "rdf:type", object: "uor:SharedConcept" });
      triples.push({ subject: tagNode, predicate: "rdfs:label", object: tag });
    }
  }

  return triples;
}

/** Emit invariant-to-book edges when resonance patterns are discovered */
export function invariantToTriples(
  invariantName: string,
  bookIds: string[],
  domains: string[],
  resonance: number,
): KGTriple[] {
  const invNode = `uor:invariant:${invariantName.replace(/\s+/g, "_").toLowerCase()}`;
  const triples: KGTriple[] = [
    { subject: invNode, predicate: "rdf:type", object: "uor:CrossDomainInvariant" },
    { subject: invNode, predicate: "rdfs:label", object: invariantName },
    { subject: invNode, predicate: "uor:resonanceScore", object: String(resonance) },
  ];

  for (const bid of bookIds) {
    triples.push({ subject: invNode, predicate: "uor:connectsBook", object: `uor:book:${bid}` });
  }
  for (const d of domains) {
    triples.push({ subject: invNode, predicate: "uor:bridgesDomain", object: `uor:domain:${d.replace(/\s+/g, "_")}` });
  }

  return triples;
}
