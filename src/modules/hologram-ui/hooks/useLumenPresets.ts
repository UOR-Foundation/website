/**
 * useLumenPresets — Cloud-synced preset management for DJ Deck
 * ═══════════════════════════════════════════════════════════════
 *
 * Persists custom presets to the lumen_presets table when authenticated,
 * falls back to localStorage when anonymous.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DimensionPreset } from "@/modules/hologram-ui/engine/proModeDimensions";

const LOCAL_KEY = "uor-cloud-presets";

export function useLumenPresets() {
  const [presets, setPresets] = useState<DimensionPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load presets
  useEffect(() => {
    if (userId) {
      supabase
        .from("lumen_presets")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order")
        .then(({ data }) => {
          if (data) {
            setPresets(data.map((row: any) => ({
              id: row.preset_id,
              name: row.name,
              subtitle: row.subtitle,
              icon: row.icon,
              phase: row.phase as "learn" | "work" | "play",
              values: row.dimension_values as Record<string, number>,
              tags: row.tags ?? [],
              imported: true,
            })));
          }
          setLoading(false);
        });
    } else {
      try {
        setPresets(JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"));
      } catch { /* empty */ }
      setLoading(false);
    }
  }, [userId]);

  const savePreset = useCallback(async (preset: DimensionPreset) => {
    if (userId) {
      await supabase.from("lumen_presets").upsert({
        user_id: userId,
        preset_id: preset.id,
        name: preset.name,
        subtitle: preset.subtitle,
        icon: preset.icon,
        phase: preset.phase,
        tags: [...(preset.tags ?? [])],
        dimension_values: preset.values,
        is_favorite: false,
        sort_order: presets.length,
      }, { onConflict: "user_id,preset_id" });
    }
    setPresets((prev) => {
      const idx = prev.findIndex((p) => p.id === preset.id);
      const updated = idx >= 0 ? [...prev.slice(0, idx), preset, ...prev.slice(idx + 1)] : [...prev, preset];
      if (!userId) localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [userId, presets.length]);

  const deletePreset = useCallback(async (presetId: string) => {
    if (userId) {
      await supabase.from("lumen_presets").delete().eq("user_id", userId).eq("preset_id", presetId);
    }
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== presetId);
      if (!userId) localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [userId]);

  return { presets, loading, savePreset, deletePreset, isAuthenticated: !!userId };
}
