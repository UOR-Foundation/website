/**
 * useMessageSearch — Client-side search across decrypted messages.
 * Since the server only has ciphertext, search must happen locally.
 */

import { useState, useMemo, useCallback } from "react";
import type { DecryptedMessage } from "./types";

export function useMessageSearch(messages: DecryptedMessage[]) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return messages.filter(
      (m) =>
        m.plaintext.toLowerCase().includes(q) &&
        m.plaintext !== "🔒 Encrypted",
    );
  }, [messages, query]);

  const highlightText = useCallback(
    (text: string): { before: string; match: string; after: string } | null => {
      if (!query.trim()) return null;
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return null;
      return {
        before: text.slice(0, idx),
        match: text.slice(idx, idx + query.length),
        after: text.slice(idx + query.length),
      };
    },
    [query],
  );

  return {
    query,
    setQuery,
    results,
    active,
    setActive,
    highlightText,
    resultCount: results.length,
  };
}
