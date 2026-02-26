/**
 * useDataBank — React Hook for the Data Bank Box
 * ════════════════════════════════════════════════
 *
 * Provides transparent encrypted sync between localStorage (L1)
 * and the cloud database (L2). Zero-knowledge: the server
 * only ever sees AES-256-GCM ciphertext.
 *
 * Usage:
 *   const { get, set, remove, sync, status } = useDataBank();
 *   await set("preferences", JSON.stringify({ theme: "dark" }));
 *   const prefs = await get("preferences");
 *
 * @module data-bank/hooks/useDataBank
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  writeSlot,
  readSlot,
  deleteSlot,
  fullSync,
  getSyncStatus,
  type DataBankSlot,
  type DataBankSyncStatus,
} from "../lib/sync";

export interface DataBankHandle {
  /** Whether the user is authenticated (bank is persistent) */
  authenticated: boolean;
  /** Whether initial sync is in progress */
  syncing: boolean;
  /** Current sync status */
  status: DataBankSyncStatus;
  /** Read a slot by key */
  get: (key: string) => Promise<string | null>;
  /** Write a value to a slot (encrypts + syncs automatically) */
  set: (key: string, value: string) => Promise<void>;
  /** Delete a slot */
  remove: (key: string) => Promise<void>;
  /** Force a full cloud ↔ local sync */
  sync: () => Promise<void>;
  /** Get a typed JSON value from a slot */
  getJSON: <T = unknown>(key: string) => Promise<T | null>;
  /** Set a typed JSON value to a slot */
  setJSON: <T = unknown>(key: string, value: T) => Promise<void>;
}

export function useDataBank(): DataBankHandle {
  const [userId, setUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<DataBankSyncStatus>(getSyncStatus);
  const mounted = useRef(true);

  // Resolve auth
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && mounted.current) {
        setUserId(session.user.id);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted.current) {
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Initial sync on auth
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setSyncing(true);
      try {
        await fullSync(userId);
      } finally {
        if (mounted.current) {
          setSyncing(false);
          setStatus(getSyncStatus());
        }
      }
    })();
  }, [userId]);

  const get = useCallback(
    async (key: string): Promise<string | null> => {
      if (!userId) {
        // Fallback to local-only for unauthenticated
        try {
          const raw = localStorage.getItem(`uor:databank:${key}`);
          if (!raw) return null;
          return JSON.parse(raw).value ?? null;
        } catch {
          return null;
        }
      }
      const slot = await readSlot(userId, key);
      return slot?.value ?? null;
    },
    [userId]
  );

  const set = useCallback(
    async (key: string, value: string): Promise<void> => {
      if (!userId) {
        // Local-only fallback
        localStorage.setItem(
          `uor:databank:${key}`,
          JSON.stringify({ key, value, updatedAt: new Date().toISOString() })
        );
        return;
      }
      await writeSlot(userId, key, value);
      if (mounted.current) setStatus(getSyncStatus());
    },
    [userId]
  );

  const remove = useCallback(
    async (key: string): Promise<void> => {
      if (!userId) {
        localStorage.removeItem(`uor:databank:${key}`);
        return;
      }
      await deleteSlot(userId, key);
      if (mounted.current) setStatus(getSyncStatus());
    },
    [userId]
  );

  const sync = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      await fullSync(userId);
    } finally {
      if (mounted.current) {
        setSyncing(false);
        setStatus(getSyncStatus());
      }
    }
  }, [userId]);

  const getJSON = useCallback(
    async <T = unknown>(key: string): Promise<T | null> => {
      const raw = await get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    [get]
  );

  const setJSON = useCallback(
    async <T = unknown>(key: string, value: T): Promise<void> => {
      await set(key, JSON.stringify(value));
    },
    [set]
  );

  return {
    authenticated: !!userId,
    syncing,
    status,
    get,
    set,
    remove,
    sync,
    getJSON,
    setJSON,
  };
}
