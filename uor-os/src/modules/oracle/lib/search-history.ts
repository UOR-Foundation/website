/**
 * search-history — Read/write user search history for contextual personalization.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SearchHistoryEntry {
  keyword: string;
  cid?: string | null;
  wiki_qid?: string | null;
  searched_at?: string;
}

/** Fetch the user's recent search history (most recent first). */
export async function getSearchHistory(limit = 20): Promise<SearchHistoryEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("search_history" as any)
    .select("keyword, cid, wiki_qid, searched_at")
    .eq("user_id", user.id)
    .order("searched_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as SearchHistoryEntry[];
}

/** Record a search to the user's history. Silent failure if not authenticated. */
export async function recordSearch(entry: {
  keyword: string;
  cid?: string | null;
  wiki_qid?: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("search_history" as any)
    .insert({
      user_id: user.id,
      keyword: entry.keyword,
      cid: entry.cid || null,
      wiki_qid: entry.wiki_qid || null,
    } as any);
}

/** Find the most recent search entry matching a keyword exactly (case-insensitive). */
export async function findByKeyword(keyword: string): Promise<SearchHistoryEntry | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("search_history" as any)
    .select("keyword, cid, wiki_qid, searched_at")
    .eq("user_id", user.id)
    .ilike("keyword", keyword.trim())
    .order("searched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as SearchHistoryEntry;
}

/** Get just the keywords from recent history (for context passing). */
export async function getRecentKeywords(limit = 15): Promise<string[]> {
  const history = await getSearchHistory(limit);
  // Deduplicate, preserve order
  const seen = new Set<string>();
  return history
    .map(h => h.keyword.toLowerCase())
    .filter(k => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}
