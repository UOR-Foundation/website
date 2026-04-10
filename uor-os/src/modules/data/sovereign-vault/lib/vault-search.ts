/**
 * Vault Search — Client-side TF-IDF semantic search
 * ══════════════════════════════════════════════════
 *
 * Searches across all vault chunks using term-frequency scoring.
 * Everything runs client-side on decrypted data. Zero-knowledge.
 */

import { vaultStore } from "./vault-store";
import type { VaultDocument, VaultSearchResult } from "./types";

/** Tokenize and normalize text for matching */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/** Compute TF-IDF-like score for a query against a chunk */
function scoreChunk(queryTokens: string[], chunkText: string): number {
  const chunkTokens = tokenize(chunkText);
  if (chunkTokens.length === 0) return 0;

  let matches = 0;
  const chunkSet = new Set(chunkTokens);

  for (const qt of queryTokens) {
    if (chunkSet.has(qt)) {
      // Count frequency for TF component
      const freq = chunkTokens.filter(t => t === qt).length;
      matches += freq / chunkTokens.length;
    }
  }

  // Bonus for phrase matching (consecutive query words found together)
  const chunkLower = chunkText.toLowerCase();
  const queryStr = queryTokens.join(" ");
  if (chunkLower.includes(queryStr)) {
    matches += 2;
  }

  return matches;
}

/**
 * Search the vault for chunks matching the query.
 * Returns top results sorted by relevance score.
 */
export async function searchVault(
  userId: string,
  query: string,
  maxResults = 5
): Promise<VaultSearchResult[]> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const documents = await vaultStore.listDocuments(userId);
  const results: VaultSearchResult[] = [];

  for (const doc of documents) {
    const chunks = await vaultStore.readChunks(userId, doc.cid, doc.chunk_count);

    for (const chunk of chunks) {
      const score = scoreChunk(queryTokens, chunk.text);
      if (score > 0) {
        results.push({ document: doc, chunk, score });
      }
    }
  }

  // Sort by score descending, take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}
