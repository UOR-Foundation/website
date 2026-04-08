/**
 * useMessages — fetches encrypted_messages for a session,
 * subscribes to realtime inserts for live updates.
 *
 * Note: Full client-side decryption requires the UmpSession with
 * the symmetric key. For now we display ciphertext status.
 * When sessions are cached locally, openMessage() will decrypt.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DecryptedMessage } from "./types";
import { getCachedSession } from "./messaging-protocol";
import { openMessage } from "@/modules/uns/trust/messaging";

export function useMessages(sessionId: string | null, sessionHash?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!sessionId || !user) { setMessages([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from("encrypted_messages")
      .select("id, sender_id, ciphertext, created_at, message_hash, envelope_cid, parent_hashes, session_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error || !data) { setLoading(false); return; }

    // Try to decrypt if we have the session key cached
    const session = sessionHash ? getCachedSession(sessionHash) : undefined;

    const msgs: DecryptedMessage[] = data.map((row) => {
      let plaintext = "🔒 Encrypted";

      if (session) {
        try {
          // Attempt decryption — openMessage is async but for display we do best-effort
          // In production, decrypt all in parallel
          plaintext = "🔒 Encrypted"; // Placeholder, real decryption below
        } catch {
          plaintext = "🔒 Encrypted";
        }
      }

      return {
        id: row.id,
        sessionId: row.session_id,
        senderId: row.sender_id,
        plaintext,
        createdAt: row.created_at,
        messageHash: row.message_hash,
        envelopeCid: row.envelope_cid,
        sentByMe: row.sender_id === user.id,
      };
    });

    // If session available, decrypt asynchronously
    if (session) {
      const decrypted = await Promise.all(
        data.map(async (row) => {
          try {
            const result = await openMessage(
              session,
              row.ciphertext,
              { envelope: {}, projections: { cid: row.envelope_cid } } as any,
              row.message_hash,
              row.parent_hashes as string[],
            );
            return result.plaintext;
          } catch {
            return "🔒 Encrypted";
          }
        })
      );
      setMessages(msgs.map((m, i) => ({ ...m, plaintext: decrypted[i] })));
    } else {
      setMessages(msgs);
    }

    setLoading(false);
  }, [sessionId, sessionHash, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!sessionId || !user) return;

    const channel = supabase
      .channel(`messages-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "encrypted_messages",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, user, fetchMessages]);

  return { messages, loading, refetch: fetchMessages };
}
