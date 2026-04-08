/**
 * useVoiceShortcut — Global Ctrl+Shift+V (Cmd+Shift+V on Mac) shortcut
 * to toggle the voice overlay for hands-free dictation.
 */

import { useEffect, useState, useCallback } from "react";

export function useVoiceShortcut() {
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");

  const open = useCallback(() => setActive(true), []);
  const close = useCallback(() => { setActive(false); setTranscript(""); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+V or Cmd+Shift+V
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        e.stopPropagation();
        setActive((prev) => !prev);
      }
      if (e.key === "Escape" && active) {
        setActive(false);
        setTranscript("");
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [active]);

  return { active, open, close, transcript, setTranscript };
}
