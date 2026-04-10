/**
 * useVoiceShortcut — Voice overlay state.
 * Keyboard activation is now handled by the Ring shortcut system (Ring + V).
 */

import { useState, useCallback, useEffect } from "react";

export function useVoiceShortcut() {
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");

  const open = useCallback(() => setActive(true), []);
  const close = useCallback(() => { setActive(false); setTranscript(""); }, []);
  const toggle = useCallback(() => setActive(prev => !prev), []);

  // Escape still closes voice overlay directly
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && active) {
        setActive(false);
        setTranscript("");
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [active]);

  return { active, open, close, toggle, transcript, setTranscript };
}
