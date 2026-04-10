/**
 * Sovereign Vault Types
 */

export interface VaultDocument {
  id: string;
  user_id: string;
  cid: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number;
  source_type: "local" | "url" | "cloud";
  source_uri: string | null;
  chunk_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface VaultChunk {
  index: number;
  text: string;
  cid: string;
}

export interface VaultSearchResult {
  document: VaultDocument;
  chunk: VaultChunk;
  score: number;
}

export interface ExtractedContent {
  text: string;
  metadata: Record<string, string>;
}
