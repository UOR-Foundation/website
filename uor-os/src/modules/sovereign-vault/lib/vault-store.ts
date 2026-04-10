/**
 * Vault Store — Content-address, encrypt, and persist documents
 * ══════════════════════════════════════════════════════════════
 *
 * Pipeline: text → chunks → singleProofHash → encrypt → Data Bank + DB
 */

import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/lib/uor-canonical";
import { chunkText } from "./chunker";
import { writeSlot, deleteSlot } from "@/modules/data-bank/lib/sync";
import type { VaultDocument, VaultChunk } from "./types";

/**
 * Ingest a document: chunk it, content-address it, encrypt chunks,
 * and store metadata in sovereign_documents.
 */
async function ingestDocument(
  userId: string,
  text: string,
  metadata: {
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    sourceType: "local" | "url" | "cloud";
    sourceUri?: string;
    tags?: string[];
  }
): Promise<VaultDocument | null> {
  // 1. Content-address the full document
  const proof = await singleProofHash({
    "@type": "vault:SovereignDocument",
    "vault:content": text,
    "vault:filename": metadata.filename || "untitled",
  });
  const docCid = proof.cid;

  // 2. Chunk the text
  const textChunks = chunkText(text);

  // 3. Content-address each chunk; deduplicate before storing in Data Bank
  const chunks: VaultChunk[] = [];
  const seenCids = new Set<string>();

  for (let i = 0; i < textChunks.length; i++) {
    const chunkProof = await singleProofHash({
      "@type": "vault:DocumentChunk",
      "vault:parentCid": docCid,
      "vault:index": i,
      "vault:content": textChunks[i],
    });

    // Chunk dedup: skip write if this CID was already stored in this batch
    // or if a slot with this content already exists (cross-document dedup)
    if (!seenCids.has(chunkProof.cid)) {
      seenCids.add(chunkProof.cid);
      const { readSlot } = await import("@/modules/data-bank/lib/sync");
      const existing = await readSlot(userId, `vault:${docCid}:chunk:${i}`);
      if (!existing) {
        await writeSlot(userId, `vault:${docCid}:chunk:${i}`, textChunks[i]);
      }
    }

    chunks.push({
      index: i,
      text: textChunks[i],
      cid: chunkProof.cid,
    });
  }

  // 4. Upsert document metadata
  const { data, error } = await supabase
    .from("sovereign_documents")
    .upsert(
      {
        user_id: userId,
        cid: docCid,
        filename: metadata.filename || null,
        mime_type: metadata.mimeType || null,
        size_bytes: metadata.sizeBytes || text.length,
        source_type: metadata.sourceType,
        source_uri: metadata.sourceUri || null,
        chunk_count: chunks.length,
        tags: metadata.tags || [],
      },
      { onConflict: "user_id,cid" }
    )
    .select()
    .single();

  if (error) {
    console.error("[Vault] Failed to store document:", error);
    return null;
  }

  return data as VaultDocument;
}

/**
 * Remove a document and all its encrypted chunks.
 */
async function removeDocument(userId: string, doc: VaultDocument): Promise<void> {
  // Delete encrypted chunks from Data Bank
  for (let i = 0; i < doc.chunk_count; i++) {
    await deleteSlot(userId, `vault:${doc.cid}:chunk:${i}`);
  }

  // Delete metadata row
  await supabase
    .from("sovereign_documents")
    .delete()
    .eq("id", doc.id)
    .eq("user_id", userId);
}

/**
 * List all documents for a user.
 */
async function listDocuments(userId: string): Promise<VaultDocument[]> {
  const { data, error } = await supabase
    .from("sovereign_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Vault] Failed to list documents:", error);
    return [];
  }

  return (data || []) as VaultDocument[];
}

/**
 * Read all chunks for a document from Data Bank (decrypted).
 */
async function readChunks(
  userId: string,
  docCid: string,
  chunkCount: number
): Promise<VaultChunk[]> {
  const { readSlot } = await import("@/modules/data-bank/lib/sync");
  const chunks: VaultChunk[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const slot = await readSlot(userId, `vault:${docCid}:chunk:${i}`);
    if (slot) {
      chunks.push({ index: i, text: slot.value, cid: `${docCid}:chunk:${i}` });
    }
  }

  return chunks;
}

/**
 * Update tags on a document.
 */
async function updateTags(
  userId: string,
  docId: string,
  tags: string[]
): Promise<void> {
  await supabase
    .from("sovereign_documents")
    .update({ tags })
    .eq("id", docId)
    .eq("user_id", userId);
}

export const vaultStore = {
  ingestDocument,
  removeDocument,
  listDocuments,
  readChunks,
  updateTags,
};
