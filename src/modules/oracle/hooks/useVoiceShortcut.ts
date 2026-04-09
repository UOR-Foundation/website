/**
 * useVoiceShortcut — Global Ctrl+Shift+V (Cmd+Shift+V on Mac) shortcut
 * to toggle the voice overlay for hands-free dictation.
 */

import { useEffect, useState, useCallback } from "react";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

export function useVoiceShortcut() {
  const { modKeyCode } = usePlatform();
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");

  const open = useCallback(() => setActive(true), []);
  const close = useCallback(() => { setActive(false); setTranscript(""); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e[modKeyCode] && e.key.toLowerCase() === "v") {
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
  }, [active, modKeyCode]);

  return { active, open, close, transcript, setTranscript };
}
