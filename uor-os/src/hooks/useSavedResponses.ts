/**
 * Hook for saving/unsaving high-trust AI responses.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnnotatedClaim, EpistemicGrade } from "@/modules/ring-core/neuro-symbolic";

interface SavePayload {
  messageContent: string;
  grade: EpistemicGrade;
  claims?: AnnotatedClaim[];
  curvature?: number;
  iterations?: number;
  converged?: boolean;
  userQuery?: string;
  conversationId?: string;
}

export function useSavedResponses() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load saved response content hashes on mount for quick lookup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("saved_responses")
        .select("message_content")
        .eq("user_id", user.id)
        .limit(500);
      if (data && !cancelled) {
        // Use a simple hash of content as the key for O(1) lookup
        const ids = new Set(data.map(r => simpleHash(r.message_content)));
        setSavedIds(ids);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isSaved = useCallback((content: string) => {
    return savedIds.has(simpleHash(content));
  }, [savedIds]);

  const save = useCallback(async (payload: SavePayload): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from("saved_responses").insert([{
        user_id: user.id,
        message_content: payload.messageContent,
        epistemic_grade: payload.grade,
        claims: (payload.claims ?? []) as unknown as import("@/integrations/supabase/types").Json,
        curvature: payload.curvature ?? 0,
        iterations: payload.iterations ?? 0,
        converged: payload.converged ?? false,
        user_query: payload.userQuery ?? null,
        conversation_id: payload.conversationId ?? null,
      }]);

      if (!error) {
        setSavedIds(prev => new Set(prev).add(simpleHash(payload.messageContent)));
        return true;
      }
      console.warn("Save failed:", error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsave = useCallback(async (content: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("saved_responses")
        .delete()
        .eq("user_id", user.id)
        .eq("message_content", content);

      if (!error) {
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(simpleHash(content));
          return next;
        });
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { isSaved, save, unsave, loading };
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 200); i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}
