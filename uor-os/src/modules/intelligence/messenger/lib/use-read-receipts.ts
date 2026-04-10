/**
 * useReadReceipts — Mark messages as read using IntersectionObserver.
 * Sends lightweight UPDATEs for delivered_at and read_at.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DecryptedMessage } from "./types";

export function useReadReceipts(messages: DecryptedMessage[], sessionId: string | null) {
  const { user } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const markedRef = useRef(new Set<string>());

  const markAsRead = useCallback(
    async (messageId: string) => {
      if (markedRef.current.has(messageId) || !sessionId) return;
      markedRef.current.add(messageId);

      const now = new Date().toISOString();
      await supabase
        .from("encrypted_messages")
        .update({ read_at: now, delivered_at: now } as any)
        .eq("id", messageId)
        .is("read_at", null);
    },
    [sessionId],
  );

  /** Register a DOM element to observe for read receipt. */
  const observeMessage = useCallback(
    (element: HTMLElement | null, message: DecryptedMessage) => {
      if (!element || !user || message.sentByMe || message.readAt) return;

      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                const msgId = entry.target.getAttribute("data-msg-id");
                if (msgId) markAsRead(msgId);
              }
            }
          },
          { threshold: 0.8 },
        );
      }

      element.setAttribute("data-msg-id", message.id);
      observerRef.current.observe(element);
    },
    [user, markAsRead],
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { observeMessage };
}
