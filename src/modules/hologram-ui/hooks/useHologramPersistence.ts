/**
 * useHologramPersistence — Dehydrate/Rehydrate Engine Sessions via Database
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The holographic principle applied to session persistence:
 *   Running Process → suspend() → SuspendedSession → database row
 *   Database row → SuspendedSession → resume() → Running Process
 *
 * Zero new primitives — uses the existing dehydrate/rehydrate pipeline
 * from executable-blueprint.ts. The database simply stores the canonical
 * envelope bytes that the engine already produces.
 *
 * @module hologram-ui/hooks/useHologramPersistence
 */

import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HologramEngine } from "@/modules/uns/core/hologram/engine";
import type {
  ExecutableBlueprint,
  SuspendedSession,
} from "@/modules/uns/core/hologram/executable-blueprint";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PersistedSession {
  id: string;
  session_cid: string;
  session_hex: string;
  blueprint: ExecutableBlueprint;
  envelope: SuspendedSession["envelope"];
  label: string;
  status: string;
  tick_count: number;
  created_at: string;
  updated_at: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useHologramPersistence() {
  const savingRef = useRef(false);

  /**
   * Suspend all running processes and persist them to the database.
   * Returns the number of sessions saved.
   */
  const saveAll = useCallback(async (
    engine: HologramEngine,
    blueprintMap: Map<string, ExecutableBlueprint>,
  ): Promise<number> => {
    if (savingRef.current) return 0;
    savingRef.current = true;

    try {
      const pids = engine.listProcesses();
      if (pids.length === 0) return 0;

      const rows: Array<{
        user_id: string;
        session_cid: string;
        session_hex: string;
        blueprint: unknown;
        envelope: unknown;
        label: string;
        status: string;
        tick_count: number;
      }> = [];

      for (const pid of pids) {
        const blueprint = blueprintMap.get(pid);
        if (!blueprint) continue;

        const info = engine.getProcessInfo(pid);
        // Suspend = dehydrate to canonical bytes (the existing pipeline)
        const suspended = await engine.suspendProcess(pid);

        rows.push({
          // Use a deterministic "anonymous" user ID for unauthenticated sessions
          user_id: "00000000-0000-0000-0000-000000000000",
          session_cid: suspended.proof.cid,
          session_hex: suspended.proof.hashHex,
          blueprint: blueprint as unknown,
          envelope: suspended.envelope as unknown,
          label: blueprint.name,
          status: info.status,
          tick_count: info.tickCount,
        });
      }

      if (rows.length === 0) return 0;

      // Clear old sessions and insert new ones (atomic state replacement)
      await supabase
        .from("hologram_sessions")
        .delete()
        .eq("user_id", "00000000-0000-0000-0000-000000000000");

      const { error } = await supabase
        .from("hologram_sessions")
        .insert(rows as any);

      if (error) {
        console.error("[HologramPersistence] Save error:", error.message);
        return 0;
      }

      return rows.length;
    } finally {
      savingRef.current = false;
    }
  }, []);

  /**
   * Load all persisted sessions and resume them in the engine.
   * Returns the resumed PIDs and their blueprints.
   */
  const loadAll = useCallback(async (
    engine: HologramEngine,
  ): Promise<{
    pids: string[];
    blueprintMap: Map<string, ExecutableBlueprint>;
  }> => {
    const { data, error } = await supabase
      .from("hologram_sessions")
      .select("*")
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return { pids: [], blueprintMap: new Map() };
    }

    const pids: string[] = [];
    const blueprintMap = new Map<string, ExecutableBlueprint>();

    for (const row of data) {
      try {
        const blueprint = row.blueprint as unknown as ExecutableBlueprint;
        const envelope = row.envelope as unknown as SuspendedSession["envelope"];

        // Reconstruct the SuspendedSession from stored envelope
        // The proof is recomputed from the envelope during resume (deterministic)
        const { singleProofHash } = await import("@/lib/uor-canonical");
        const proof = await singleProofHash(envelope);

        const suspended: SuspendedSession = { proof, envelope };

        // Resume = rehydrate from canonical bytes (the existing pipeline)
        const pid = await engine.resumeProcess(blueprint, suspended);
        pids.push(pid);
        blueprintMap.set(pid, blueprint);
      } catch (e) {
        console.warn("[HologramPersistence] Failed to resume session:", e);
      }
    }

    return { pids, blueprintMap };
  }, []);

  /**
   * Clear all persisted sessions.
   */
  const clearAll = useCallback(async (): Promise<void> => {
    await supabase
      .from("hologram_sessions")
      .delete()
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
  }, []);

  return { saveAll, loadAll, clearAll };
}
