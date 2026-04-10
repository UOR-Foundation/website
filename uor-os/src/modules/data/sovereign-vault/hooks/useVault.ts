/**
 * useVault — React hook for the Sovereign Context Vault
 * ═════════════════════════════════════════════════════
 *
 * Provides file import, listing, search, and removal.
 * For authenticated users: persists to Supabase + Data Bank.
 * For guests: fully functional with in-memory ephemeral storage.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { vaultStore } from "../lib/vault-store";
import { extractText, extractFromUrl } from "../lib/extract";
import { searchVault as doSearch } from "../lib/vault-search";
import type { VaultDocument, VaultSearchResult } from "../lib/types";
import { singleProofHash } from "@/lib/uor-canonical";
import { chunkText } from "../lib/chunker";

export interface VaultHandle {
  /** Whether the vault is available */
  ready: boolean;
  /** Whether the user is a guest (ephemeral storage) */
  isGuest: boolean;
  /** Whether an import is in progress */
  importing: boolean;
  /** Import progress message */
  importStatus: string;
  /** All documents in the vault */
  documents: VaultDocument[];
  /** Total document count */
  count: number;
  /** Import a local file */
  importFile: (file: File, tags?: string[]) => Promise<VaultDocument | null>;
  /** Import content from a URL */
  importUrl: (url: string, tags?: string[]) => Promise<VaultDocument | null>;
  /** Search across all vault content */
  search: (query: string) => Promise<VaultSearchResult[]>;
  /** Remove a document */
  remove: (doc: VaultDocument) => Promise<void>;
  /** Update tags on a document */
  updateTags: (docId: string, tags: string[]) => Promise<void>;
  /** Refresh the document list */
  refresh: () => Promise<void>;
}

// ── Guest in-memory store ────────────────────────────────────────────────

interface GuestChunk {
  index: number;
  text: string;
  cid: string;
}

interface GuestEntry {
  doc: VaultDocument;
  chunks: GuestChunk[];
}

let guestDocs: GuestEntry[] = [];
let guestIdCounter = 0;

function guestSearch(query: string): VaultSearchResult[] {
  const q = query.toLowerCase();
  const results: VaultSearchResult[] = [];
  for (const entry of guestDocs) {
    for (const chunk of entry.chunks) {
      if (chunk.text.toLowerCase().includes(q)) {
        results.push({
          document: entry.doc,
          chunk: { index: chunk.index, text: chunk.text, cid: chunk.cid },
          score: 1,
        });
      }
    }
  }
  return results;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useVault(): VaultHandle {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isGuest = !userId;
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (isGuest) {
      if (mounted.current) setDocuments(guestDocs.map(e => e.doc));
      return;
    }
    const docs = await vaultStore.listDocuments(userId!);
    if (mounted.current) setDocuments(docs);
  }, [userId, isGuest]);

  // Load documents on auth change or mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const importFile = useCallback(async (file: File, tags?: string[]): Promise<VaultDocument | null> => {
    setImporting(true);
    setImportStatus(`Extracting text from ${file.name}…`);
    try {
      if (isGuest) {
        const { text, metadata } = await extractText(file);
        setImportStatus(`Content-addressing…`);
        const proof = await singleProofHash({
          "@type": "vault:SovereignDocument",
          "vault:content": text,
          "vault:filename": file.name,
        });
        const chunks = chunkText(text).map((t, i) => ({
          index: i, text: t, cid: `${proof.cid}:chunk:${i}`,
        }));
        const doc: VaultDocument = {
          id: `guest-${++guestIdCounter}`,
          user_id: "guest",
          cid: proof.cid,
          filename: file.name,
          mime_type: file.type || metadata.mimeType || null,
          size_bytes: file.size,
          source_type: "local",
          source_uri: null,
          chunk_count: chunks.length,
          tags: tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        guestDocs = [...guestDocs, { doc, chunks }];
        await refresh();
        return doc;
      }
      const { text, metadata } = await extractText(file);
      setImportStatus(`Content-addressing & encrypting…`);
      const doc = await vaultStore.ingestDocument(userId!, text, {
        filename: file.name,
        mimeType: file.type || metadata.mimeType,
        sizeBytes: file.size,
        sourceType: "local",
        tags,
      });
      await refresh();
      return doc;
    } finally {
      if (mounted.current) {
        setImporting(false);
        setImportStatus("");
      }
    }
  }, [userId, isGuest, refresh]);

  const importUrl = useCallback(async (url: string, tags?: string[]): Promise<VaultDocument | null> => {
    setImporting(true);
    setImportStatus(`Fetching ${url}…`);
    try {
      if (isGuest) {
        const { text, metadata } = await extractFromUrl(url);
        setImportStatus(`Content-addressing…`);
        const proof = await singleProofHash({
          "@type": "vault:SovereignDocument",
          "vault:content": text,
          "vault:filename": metadata.title || url,
        });
        const chunks = chunkText(text).map((t, i) => ({
          index: i, text: t, cid: `${proof.cid}:chunk:${i}`,
        }));
        const doc: VaultDocument = {
          id: `guest-${++guestIdCounter}`,
          user_id: "guest",
          cid: proof.cid,
          filename: metadata.title || url,
          mime_type: "text/html",
          size_bytes: text.length,
          source_type: "url",
          source_uri: url,
          chunk_count: chunks.length,
          tags: tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        guestDocs = [...guestDocs, { doc, chunks }];
        await refresh();
        return doc;
      }
      const { text, metadata } = await extractFromUrl(url);
      setImportStatus(`Content-addressing & encrypting…`);
      const doc = await vaultStore.ingestDocument(userId!, text, {
        filename: metadata.title || url,
        mimeType: "text/html",
        sizeBytes: text.length,
        sourceType: "url",
        sourceUri: url,
        tags,
      });
      await refresh();
      return doc;
    } finally {
      if (mounted.current) {
        setImporting(false);
        setImportStatus("");
      }
    }
  }, [userId, isGuest, refresh]);

  const search = useCallback(async (query: string): Promise<VaultSearchResult[]> => {
    if (isGuest) return guestSearch(query);
    return doSearch(userId!, query);
  }, [userId, isGuest]);

  const remove = useCallback(async (doc: VaultDocument): Promise<void> => {
    if (isGuest) {
      guestDocs = guestDocs.filter(e => e.doc.id !== doc.id);
      await refresh();
      return;
    }
    await vaultStore.removeDocument(userId!, doc);
    await refresh();
  }, [userId, isGuest, refresh]);

  const updateTags = useCallback(async (docId: string, tags: string[]): Promise<void> => {
    if (isGuest) {
      guestDocs = guestDocs.map(e =>
        e.doc.id === docId ? { ...e, doc: { ...e.doc, tags } } : e
      );
      await refresh();
      return;
    }
    await vaultStore.updateTags(userId!, docId, tags);
    await refresh();
  }, [userId, isGuest, refresh]);

  return {
    ready: true, // Always ready — guests use in-memory
    isGuest,
    importing,
    importStatus,
    documents,
    count: documents.length,
    importFile,
    importUrl,
    search,
    remove,
    updateTags,
    refresh,
  };
}
