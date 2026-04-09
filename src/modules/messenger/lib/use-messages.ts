/**
 * useMessages — fetches encrypted_messages for a session,
 * subscribes to realtime inserts for live updates.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DecryptedMessage, MessageType, DeliveryStatus } from "./types";
import { getCachedSession } from "./messaging-protocol";
import { openMessage } from "@/modules/uns/trust/messaging";
import { anchorMessage } from "./kg-anchoring";

export function useMessages(sessionId: string | null, sessionHash?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!sessionId || !user) { setMessages([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from("encrypted_messages")
      .select("id, sender_id, ciphertext, created_at, message_hash, envelope_cid, parent_hashes, session_id, message_type, file_manifest, reply_to_hash, delivered_at, read_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error || !data) { setLoading(false); return; }

    const session = sessionHash ? getCachedSession(sessionHash) : undefined;

    const msgs: DecryptedMessage[] = data.map((row: any) => {
      const sentByMe = row.sender_id === user.id;
      let deliveryStatus: DeliveryStatus = "sent";
      if (sentByMe) {
        if (row.read_at) deliveryStatus = "read";
        else if (row.delivered_at) deliveryStatus = "delivered";
      }

      return {
        id: row.id,
        sessionId: row.session_id,
        senderId: row.sender_id,
        plaintext: "🔒 Encrypted",
        createdAt: row.created_at,
        messageHash: row.message_hash,
        envelopeCid: row.envelope_cid,
        sentByMe,
        messageType: (row.message_type ?? "text") as MessageType,
        deliveryStatus,
        deliveredAt: row.delivered_at,
        readAt: row.read_at,
        replyToHash: row.reply_to_hash,
        fileManifest: row.file_manifest,
        reactions: [],
      };
    });

    // Decrypt if session available
    if (session) {
      const decrypted = await Promise.all(
        data.map(async (row: any) => {
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
      const decryptedMsgs = msgs.map((m, i) => ({ ...m, plaintext: decrypted[i] }));
      setMessages(decryptedMsgs);

      // Anchor decrypted messages to knowledge graph (fire and forget)
      for (const msg of decryptedMsgs) {
        if (msg.plaintext !== "🔒 Encrypted" && sessionHash) {
          anchorMessage(msg, user.id, sessionHash).catch(() => {});
        }
      }
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
      .on("postgres_changes", {
        event: "UPDATE",
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
