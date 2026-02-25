/**
 * Lens Blueprint Database Hooks
 * ═════════════════════════════
 *
 * CRUD operations for persisting lens blueprints as content-addressed objects.
 * Blueprints are publicly readable, author-scoped for writes.
 *
 * @module lens-inspector/hooks/use-lens-blueprints
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LensBlueprint } from "@/modules/uns/core/hologram/lens-blueprint";
import { grindBlueprint } from "@/modules/uns/core/hologram/lens-blueprint";

export interface StoredBlueprint {
  id: string;
  uor_cid: string;
  uor_address: string;
  derivation_id: string;
  name: string;
  description: string | null;
  problem_statement: string | null;
  version: string;
  morphism: string;
  tags: string[];
  blueprint: LensBlueprint;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["lens-blueprints"];

/**
 * Fetch all saved lens blueprints.
 */
export function useLensBlueprints() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<StoredBlueprint[]> => {
      const { data, error } = await supabase
        .from("lens_blueprints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as StoredBlueprint[];
    },
  });
}

/**
 * Save a lens blueprint to the database.
 * Computes the UOR address automatically.
 */
export function useSaveBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blueprint: LensBlueprint) => {
      const ground = await grindBlueprint(blueprint);

      // Get current user (optional — blueprints can be saved anonymously)
      const { data: { user } } = await supabase.auth.getUser();

      const row = {
        uor_cid: ground.proof.cid,
        uor_address: ground.proof.uorAddress["u:glyph"],
        derivation_id: ground.proof.derivationId,
        name: blueprint.name,
        description: blueprint.description ?? null,
        problem_statement: blueprint.problem ?? null,
        version: blueprint.version,
        morphism: blueprint.morphism,
        tags: blueprint.tags ? [...blueprint.tags] : [],
        blueprint: blueprint as any,
        author_id: user?.id ?? null,
      };

      const { data, error } = await supabase
        .from("lens_blueprints")
        .upsert(row, { onConflict: "uor_cid" })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StoredBlueprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Delete a lens blueprint by ID.
 */
export function useDeleteBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lens_blueprints")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
