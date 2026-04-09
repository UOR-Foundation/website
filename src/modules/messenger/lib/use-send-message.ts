/**
 * useSendMessage — encrypts plaintext via UMP and inserts into encrypted_messages.
 * Supports text, file, voice, image, and reply message types.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getCachedSession } from "./messaging-protocol";
import { sealMessage } from "@/modules/uns/trust/messaging";
import { sha256 } from "@noble/hashes/sha2.js";
import { enqueueMessage, flushQueue } from "./offline-queue";
import type { MessageType, FileManifest } from "./types";

interface SendOptions {
  messageType?: MessageType;
  fileManifest?: FileManifest;
  replyToHash?: string;
}

export function useSendMessage(sessionId: string | null, sessionHash?: string) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const send = async (plaintext: string, options: SendOptions = {}) => {
    if (!sessionId || !user || !plaintext.trim()) return;
    setSending(true);

    const { messageType = "text", fileManifest, replyToHash } = options;

    try {
      const session = sessionHash ? getCachedSession(sessionHash) : undefined;
      const encoder = new TextEncoder();

      let ciphertext: string;
      let messageHash: string;
      let envelopeCid: string;
      let parentHashes: string[] = [];

      if (session) {
        const senderVid = session.participants.find(v => v.vid.includes(user.id)) ?? session.creatorVid;
        const receiverVid = session.participants.find(v => v !== senderVid) ?? session.participants[0];
        const sealed = await sealMessage(session, plaintext, senderVid, receiverVid);
        ciphertext = sealed.ciphertext;
        messageHash = sealed.messageHash;
        envelopeCid = sealed.envelope.projections.cid;
        parentHashes = sealed.parentHashes;
      } else {
        // Fallback: base64 encode for demo
        const bytes = encoder.encode(plaintext);
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);
        ciphertext = btoa(bin);

        const hashBytes = sha256(new Uint8Array(encoder.encode(plaintext + Date.now())));
        messageHash = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
        envelopeCid = `urn:ump:envelope:${messageHash.slice(0, 16)}`;
      }

      const row = {
        session_id: sessionId,
        sender_id: user.id,
        ciphertext,
        message_hash: messageHash,
        envelope_cid: envelopeCid,
        parent_hashes: parentHashes,
        message_type: messageType,
        file_manifest: fileManifest ?? null,
        reply_to_hash: replyToHash ?? null,
      };

      if (!navigator.onLine) {
        await enqueueMessage({
          id: messageHash,
          sessionId,
          senderId: user.id,
          ciphertext,
          messageHash,
          envelopeCid,
          parentHashes,
          messageType,
          fileManifest,
          replyToHash,
          queuedAt: Date.now(),
        });
      } else {
        const { error } = await supabase.from("encrypted_messages").insert(row as any);
        if (error) throw error;

        // Also flush any queued messages
        flushQueue().catch(() => {});
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return { send, sending };
}
