/**
 * Fusion Graph Projection — Sovereign Documents Modality
 * ═══════════════════════════════════════════════════════
 *
 * Projects vault documents into the Fusion Graph as triples,
 * making personal context available to LLM inference.
 */

import { vaultStore } from "./vault-store";
import type { VaultDocument } from "./types";

export interface DocumentTriple {
  subject: string;
  predicate: string;
  object: string;
}

/**
 * Project sovereign documents into semantic triples
 * for injection into the LLM context window.
 *
 * @param userId - The authenticated user's ID
 * @param maxChunks - Maximum number of chunks to project (context budget)
 */
export async function projectDocuments(
  userId: string,
  maxChunks = 20
): Promise<DocumentTriple[]> {
  const documents = await vaultStore.listDocuments(userId);
  const triples: DocumentTriple[] = [];
  let chunkBudget = maxChunks;

  for (const doc of documents) {
    if (chunkBudget <= 0) break;

    // Document-level triples
    triples.push({
      subject: `doc:${doc.cid}`,
      predicate: "rdf:type",
      object: "vault:SovereignDocument",
    });

    if (doc.filename) {
      triples.push({
        subject: `doc:${doc.cid}`,
        predicate: "schema:name",
        object: doc.filename,
      });
    }

    if (doc.source_uri) {
      triples.push({
        subject: `doc:${doc.cid}`,
        predicate: "vault:source",
        object: doc.source_uri,
      });
    }

    for (const tag of doc.tags) {
      triples.push({
        subject: `doc:${doc.cid}`,
        predicate: "vault:tag",
        object: tag,
      });
    }

    // Chunk-level triples (within budget)
    const chunksToRead = Math.min(doc.chunk_count, chunkBudget);
    const chunks = await vaultStore.readChunks(userId, doc.cid, chunksToRead);

    for (const chunk of chunks) {
      triples.push({
        subject: `doc:${doc.cid}`,
        predicate: "vault:chunk",
        object: chunk.text.slice(0, 500), // Truncate for context window
      });
      chunkBudget--;
    }
  }

  return triples;
}

/**
 * Format document triples as a context block string
 * suitable for injection into an LLM prompt.
 */
export function formatDocumentContext(triples: DocumentTriple[]): string {
  if (triples.length === 0) return "";

  const lines = ["<sovereign-context>"];

  // Group by document
  const byDoc = new Map<string, DocumentTriple[]>();
  for (const t of triples) {
    const group = byDoc.get(t.subject) || [];
    group.push(t);
    byDoc.set(t.subject, group);
  }

  for (const [subject, docTriples] of byDoc) {
    const name = docTriples.find(t => t.predicate === "schema:name")?.object;
    lines.push(`\n[${name || subject}]`);

    for (const t of docTriples) {
      if (t.predicate === "vault:chunk") {
        lines.push(t.object);
      }
    }
  }

  lines.push("</sovereign-context>");
  return lines.join("\n");
}
