/**
 * useContextProjection — React Hook for the Context Projection Engine
 * ════════════════════════════════════════════════════════════════════
 *
 * Provides the projected UserContextProfile and methods to append
 * context triples. Automatically fetches on mount when authenticated.
 *
 * Architecture:
 *   Auth session → userId + profile.uor_cid → fetch triples → project
 *   localStorage acts as L1 cache; database is source of truth.
 *
 * @module hologram-ui/hooks/useContextProjection
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserContextProfile } from "../engine/signalRelevance";
import { loadContextProfile } from "../engine/signalRelevance";
import {
  fetchAndProject,
  recordInterest,
  recordTask,
  recordDomainVisit,
  recordInteraction,
} from "../engine/contextProjection";

export interface ContextProjectionHandle {
  /** The projected user context profile */
  profile: UserContextProfile;
  /** Whether the projection is loading from the database */
  loading: boolean;
  /** Whether the user is authenticated (context is persistent) */
  authenticated: boolean;
  /** Record an interest tag */
  addInterest: (tag: string, weight?: number) => Promise<void>;
  /** Record an active task */
  addTask: (task: string) => Promise<void>;
  /** Record a domain visit */
  addDomain: (domain: string) => Promise<void>;
  /** Record an entity interaction */
  addInteraction: (targetCid: string) => Promise<void>;
  /** Force re-projection from database */
  refresh: () => Promise<void>;
}

export function useContextProjection(): ContextProjectionHandle {
  const [profile, setProfile] = useState<UserContextProfile>(loadContextProfile);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCid, setUserCid] = useState<string | null>(null);
  const mounted = useRef(true);

  // Resolve auth + UOR CID
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted.current) return;
      setUserId(session.user.id);

      const { data: p } = await supabase
        .from("profiles")
        .select("uor_cid")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (p?.uor_cid && mounted.current) {
        setUserCid(p.uor_cid);
      }
    })();
    return () => { mounted.current = false; };
  }, []);

  // Project on mount when we have auth
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const projected = await fetchAndProject(userId);
      if (mounted.current) setProfile(projected);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) refresh();
  }, [userId, refresh]);

  // Writers (no-op if unauthenticated)
  const addInterest = useCallback(async (tag: string, weight = 0.5) => {
    if (!userId || !userCid) return;
    await recordInterest(userId, userCid, tag, weight);
    await refresh();
  }, [userId, userCid, refresh]);

  const addTask = useCallback(async (task: string) => {
    if (!userId || !userCid) return;
    await recordTask(userId, userCid, task);
    await refresh();
  }, [userId, userCid, refresh]);

  const addDomain = useCallback(async (domain: string) => {
    if (!userId || !userCid) return;
    await recordDomainVisit(userId, userCid, domain);
    await refresh();
  }, [userId, userCid, refresh]);

  const addInteraction = useCallback(async (targetCid: string) => {
    if (!userId || !userCid) return;
    await recordInteraction(userId, userCid, targetCid);
    await refresh();
  }, [userId, userCid, refresh]);

  return {
    profile,
    loading,
    authenticated: !!userId,
    addInterest,
    addTask,
    addDomain,
    addInteraction,
    refresh,
  };
}
