/**
 * useContextManager — Unified context manager merging guest + vault items.
 */

import { useState, useEffect, useCallback } from "react";
import { useVault, type VaultHandle } from "./useVault";
import { guestContext, type GuestContextItem } from "../lib/guest-context";

export interface ContextItem {
  id: string;
  filename: string;
  text?: string;
  isGuest: boolean;
  source: "file" | "paste" | "url" | "vault" | "workspace" | "folder";
  createdAt: number;
  size: number;
}

export interface ContextManagerHandle {
  vault: VaultHandle;
  isGuest: boolean;
  /** All selected context items (guest + vault) */
  contextItems: ContextItem[];
  /** Guest items in memory */
  guestItems: GuestContextItem[];
  /** Selected vault doc IDs */
  selectedVaultIds: string[];
  /** Add a file (goes to guest store if not authed, vault if authed) */
  addFile: (file: File) => Promise<void>;
  /** Add pasted text (always guest) */
  addPaste: (text: string, label?: string) => void;
  /** Add URL (goes to guest store if not authed, vault if authed) */
  addUrl: (url: string) => Promise<void>;
  /** Add a workspace container */
  addWorkspace: (name: string) => void;
  /** Add a folder container */
  addFolder: (name: string) => void;
  /** Remove a context item by id */
  remove: (id: string) => void;
  /** Toggle a vault doc selection */
  toggleVaultDoc: (docId: string) => void;
  /** Get all context text for search */
  getContextTexts: () => string[];
  /** Get context doc IDs (vault only) for search */
  getContextDocIds: () => string[] | undefined;
}

export function useContextManager(): ContextManagerHandle {
  const vault = useVault();
  const [guestItems, setGuestItems] = useState<GuestContextItem[]>(() => guestContext.getAll());
  const [selectedVaultIds, setSelectedVaultIds] = useState<string[]>([]);

  useEffect(() => {
    return guestContext.subscribe(() => setGuestItems(guestContext.getAll()));
  }, []);

  const isGuest = !vault.ready;

  const addFile = useCallback(async (file: File) => {
    await guestContext.addFile(file);
  }, []);

  const addPaste = useCallback((text: string, label?: string) => {
    guestContext.addPaste(text, label);
  }, []);

  const addUrl = useCallback(async (url: string) => {
    await guestContext.addUrl(url);
  }, []);

  const addWorkspace = useCallback((name: string) => {
    guestContext.addWorkspace(name);
  }, []);

  const addFolder = useCallback((name: string) => {
    guestContext.addFolder(name);
  }, []);

  const remove = useCallback((id: string) => {
    if (id.startsWith("guest-")) {
      guestContext.remove(id);
    } else {
      setSelectedVaultIds((prev) => prev.filter((vid) => vid !== id));
    }
  }, []);

  const toggleVaultDoc = useCallback((docId: string) => {
    setSelectedVaultIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }, []);

  const contextItems: ContextItem[] = [
    ...guestItems.map((g): ContextItem => ({
      id: g.id,
      filename: g.filename,
      text: g.text,
      isGuest: true,
      source: g.source,
      createdAt: g.createdAt,
      size: g.size,
    })),
    ...vault.documents
      .filter((d) => selectedVaultIds.includes(d.id))
      .map((d): ContextItem => ({
        id: d.id,
        filename: d.filename || "Untitled",
        isGuest: false,
        source: "vault",
        createdAt: new Date(d.created_at || Date.now()).getTime(),
        size: d.size_bytes || 0,
      })),
  ];

  const getContextTexts = useCallback(() => {
    return guestItems.map((g) => g.text);
  }, [guestItems]);

  const getContextDocIds = useCallback(() => {
    return selectedVaultIds.length > 0 ? selectedVaultIds : undefined;
  }, [selectedVaultIds]);

  return {
    vault,
    isGuest,
    contextItems,
    guestItems,
    selectedVaultIds,
    addFile,
    addPaste,
    addUrl,
    addWorkspace,
    addFolder,
    remove,
    toggleVaultDoc,
    getContextTexts,
    getContextDocIds,
  };
}
