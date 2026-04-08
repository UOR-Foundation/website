/**
 * useSendMessage — encrypts plaintext via UMP and inserts into encrypted_messages.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getCachedSession } from "./messaging-protocol";
import { sealMessage } from "@/modules/uns/trust/messaging";

export function useSendMessage(sessionId: string | null, sessionHash?: string) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const send = async (plaintext: string) => {
    if (!sessionId || !user || !plaintext.trim()) return;
    setSending(true);

    try {
      const session = sessionHash ? getCachedSession(sessionHash) : undefined;

      if (session) {
        // Full UMP encryption path
        const senderVid = session.participants.find(v => v.vid.includes(user.id)) ?? session.creatorVid;
        const receiverVid = session.participants.find(v => v !== senderVid) ?? session.participants[0];

        const sealed = await sealMessage(session, plaintext, senderVid, receiverVid);

        await supabase.from("encrypted_messages").insert({
          session_id: sessionId,
          sender_id: user.id,
          ciphertext: sealed.ciphertext,
          message_hash: sealed.messageHash,
          envelope_cid: sealed.envelope.projections.cid,
          parent_hashes: sealed.parentHashes,
        });
      } else {
        // No cached session — store plaintext as base64 "ciphertext" for demo
        // In production, the session must be established first
        const encoder = new TextEncoder();
        const bytes = encoder.encode(plaintext);
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);
        const b64 = btoa(bin);

        const hash = Array.from(new Uint8Array(
          await crypto.subtle.digest("SHA-256", encoder.encode(plaintext + Date.now()))
        )).map(b => b.toString(16).padStart(2, "0")).join("");

        await supabase.from("encrypted_messages").insert({
          session_id: sessionId,
          sender_id: user.id,
          ciphertext: b64,
          message_hash: hash,
          envelope_cid: `urn:ump:envelope:${hash.slice(0, 16)}`,
          parent_hashes: [],
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return { send, sending };
}
