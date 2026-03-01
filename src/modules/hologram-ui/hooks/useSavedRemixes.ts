/**
 * useSavedRemixes — localStorage-backed persistence for favorite remixed responses
 */
import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "lumen:saved-remixes";

export interface SavedRemix {
  id: string;
  thought: string;
  original: string;
  originalMix: string;
  remixed: string;
  remixMix: string;
  grade?: string;
  savedAt: string;
}

function loadRemixes(): SavedRemix[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistRemixes(remixes: SavedRemix[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remixes));
}

export function useSavedRemixes() {
  const [remixes, setRemixes] = useState<SavedRemix[]>(loadRemixes);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRemixes(loadRemixes());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const saveRemix = useCallback((remix: Omit<SavedRemix, "savedAt">) => {
    setRemixes(prev => {
      // Prevent duplicates by id
      if (prev.some(r => r.id === remix.id)) return prev;
      const next = [{ ...remix, savedAt: new Date().toISOString() }, ...prev];
      persistRemixes(next);
      return next;
    });
  }, []);

  const removeRemix = useCallback((id: string) => {
    setRemixes(prev => {
      const next = prev.filter(r => r.id !== id);
      persistRemixes(next);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => {
    return remixes.some(r => r.id === id);
  }, [remixes]);

  return { remixes, saveRemix, removeRemix, isSaved };
}
