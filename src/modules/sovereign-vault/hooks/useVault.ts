/**
 * useVault — React hook for the Sovereign Context Vault
 * ═════════════════════════════════════════════════════
 *
 * Provides file import, listing, search, and removal
 * with automatic encryption and UOR content-addressing.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { vaultStore } from "../lib/vault-store";
import { extractText, extractFromUrl } from "../lib/extract";
import { searchVault as doSearch } from "../lib/vault-search";
import type { VaultDocument, VaultSearchResult } from "../lib/types";

export interface VaultHandle {
  /** Whether the vault is available (user is authenticated) */
  ready: boolean;
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

export function useVault(): VaultHandle {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const docs = await vaultStore.listDocuments(userId);
    if (mounted.current) setDocuments(docs);
  }, [userId]);

  // Load documents on auth
  useEffect(() => {
    if (userId) refresh();
  }, [userId, refresh]);

  const importFile = useCallback(async (file: File, tags?: string[]): Promise<VaultDocument | null> => {
    if (!userId) return null;
    setImporting(true);
    setImportStatus(`Extracting text from ${file.name}…`);
    try {
      const { text, metadata } = await extractText(file);
      setImportStatus(`Content-addressing & encrypting…`);
      const doc = await vaultStore.ingestDocument(userId, text, {
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
  }, [userId, refresh]);

  const importUrl = useCallback(async (url: string, tags?: string[]): Promise<VaultDocument | null> => {
    if (!userId) return null;
    setImporting(true);
    setImportStatus(`Fetching ${url}…`);
    try {
      const { text, metadata } = await extractFromUrl(url);
      setImportStatus(`Content-addressing & encrypting…`);
      const doc = await vaultStore.ingestDocument(userId, text, {
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
  }, [userId, refresh]);

  const search = useCallback(async (query: string): Promise<VaultSearchResult[]> => {
    if (!userId) return [];
    return doSearch(userId, query);
  }, [userId]);

  const remove = useCallback(async (doc: VaultDocument): Promise<void> => {
    if (!userId) return;
    await vaultStore.removeDocument(userId, doc);
    await refresh();
  }, [userId, refresh]);

  const updateTags = useCallback(async (docId: string, tags: string[]): Promise<void> => {
    if (!userId) return;
    await vaultStore.updateTags(userId, docId, tags);
    await refresh();
  }, [userId, refresh]);

  return {
    ready: !!userId,
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
