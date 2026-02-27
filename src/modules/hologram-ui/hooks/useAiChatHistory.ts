/**
 * useAiChatHistory — Persist AI chat conversations to the database
 * ═══════════════════════════════════════════════════════════════════
 *
 * Provides CRUD operations for AI conversations and messages,
 * scoped to the authenticated user via RLS.
 *
 * @module hologram-ui/hooks/useAiChatHistory
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  model_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAiChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /** Fetch all conversations for the current user. */
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from("ai_conversations" as any)
        .select("*")
        .order("updated_at", { ascending: false }) as any)
        .limit(50);

      if (error) throw error;
      setConversations((data as unknown as Conversation[]) ?? []);
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load conversations when user changes
  useEffect(() => {
    if (userId) fetchConversations();
    else setConversations([]);
  }, [userId, fetchConversations]);

  /** Create a new conversation. Returns the new conversation ID. */
  const createConversation = useCallback(async (title?: string, modelId?: string): Promise<string | null> => {
    if (!userId) return null;
    try {
      const { data, error } = await (supabase
        .from("ai_conversations" as any)
        .insert({
          user_id: userId,
          title: title ?? "New Conversation",
          model_id: modelId ?? null,
        }) as any)
        .select("id")
        .single();

      if (error) throw error;
      const id = (data as unknown as { id: string }).id;
      await fetchConversations();
      setActiveConversationId(id);
      return id;
    } catch (e) {
      console.error("Failed to create conversation:", e);
      return null;
    }
  }, [userId, fetchConversations]);

  /** Update conversation title. */
  const updateConversationTitle = useCallback(async (convId: string, title: string) => {
    try {
      await (supabase
        .from("ai_conversations" as any) as any)
        .update({ title })
        .eq("id", convId);
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
    } catch (e) {
      console.error("Failed to update title:", e);
    }
  }, []);

  /** Delete a conversation. */
  const deleteConversation = useCallback(async (convId: string) => {
    try {
      await (supabase
        .from("ai_conversations" as any) as any)
        .delete()
        .eq("id", convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) setActiveConversationId(null);
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  }, [activeConversationId]);

  /** Load messages for a conversation. */
  const loadMessages = useCallback(async (convId: string): Promise<PersistedMessage[]> => {
    try {
      const { data, error } = await (supabase
        .from("ai_messages" as any)
        .select("*")
        .eq("conversation_id", convId) as any)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as unknown as PersistedMessage[]) ?? [];
    } catch (e) {
      console.error("Failed to load messages:", e);
      return [];
    }
  }, []);

  /** Save a single message to a conversation. */
  const saveMessage = useCallback(async (
    convId: string,
    role: "user" | "assistant" | "system",
    content: string,
    meta?: Record<string, unknown>,
  ): Promise<string | null> => {
    try {
      const { data, error } = await (supabase
        .from("ai_messages" as any)
        .insert({
          conversation_id: convId,
          role,
          content,
          meta: meta ?? null,
        }) as any)
        .select("id")
        .single();

      if (error) throw error;

      // Touch the conversation's updated_at
      await (supabase
        .from("ai_conversations" as any) as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      return (data as unknown as { id: string }).id;
    } catch (e) {
      console.error("Failed to save message:", e);
      return null;
    }
  }, []);

  /** Auto-title a conversation from its first user message. */
  const autoTitle = useCallback(async (convId: string, firstUserMessage: string) => {
    const title = firstUserMessage.length > 40
      ? firstUserMessage.slice(0, 40) + "…"
      : firstUserMessage;
    await updateConversationTitle(convId, title);
  }, [updateConversationTitle]);

  /**
   * Build a lightweight context summary from recent conversations.
   * Returns topic titles from past conversations so the AI understands
   * what the user has previously discussed — without sending full message content.
   * Authenticated users only; returns empty string for guests.
   */
  const getConversationContext = useCallback((): string => {
    if (!userId || conversations.length <= 1) return "";
    const recent = conversations
      .filter(c => c.id !== activeConversationId)
      .slice(0, 15)
      .map(c => c.title);
    if (recent.length === 0) return "";
    return `The user has previously discussed these topics with you (most recent first): ${recent.join("; ")}. Use this to understand their interests and context silently — never enumerate these topics back to the user.`;
  }, [userId, conversations, activeConversationId]);

  /** Structured context topics with voice/text source for UI display. */
  const getContextTopics = useCallback((): { title: string; source: "voice" | "text" }[] => {
    if (!userId || conversations.length <= 1) return [];
    return conversations
      .filter(c => c.id !== activeConversationId)
      .slice(0, 10)
      .map(c => ({
        title: c.title,
        source: (c.model_id === "voice" ? "voice" : "text") as "voice" | "text",
      }));
  }, [userId, conversations, activeConversationId]);

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    userId,
    isAuthenticated: !!userId,
    fetchConversations,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    loadMessages,
    saveMessage,
    autoTitle,
    getConversationContext,
    getContextTopics,
  };
}
