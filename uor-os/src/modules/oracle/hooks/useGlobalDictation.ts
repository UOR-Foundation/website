/**
 * useGlobalDictation — System-wide voice dictation hook.
 * ══════════════════════════════════════════════════════════
 *
 * Wispr Flow-style: activate from any text input across the OS.
 * Captures audio, streams to best available STT, runs AI cleanup,
 * and injects cleaned text into the focused input element.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  startElevenLabsScribe,
  isElevenLabsScribeAvailable,
  type ElevenLabsSttHandle,
} from "@/modules/uns/core/hologram/elevenlabs-stt";
import { getHologramStt } from "@/modules/uns/core/hologram/stt-engine";
import { cleanVoiceTranscript, detectVoiceContext, type VoiceContext } from "@/modules/oracle/lib/voice-cleanup";

export type DictationEngine = "elevenlabs" | "native" | "whisper";

export interface DictationState {
  /** Whether dictation is currently active */
  active: boolean;
  /** Current interim/partial transcript */
  interim: string;
  /** Accumulated committed transcript segments */
  committed: string;
  /** Audio level 0..1 */
  level: number;
  /** Which engine is being used */
  engine: DictationEngine;
  /** Privacy level */
  privacy: "local" | "cloud";
  /** Whether AI cleanup is running */
  cleaning: boolean;
}

export interface GlobalDictationActions {
  start: (context?: VoiceContext) => Promise<void>;
  stop: () => void;
  toggle: (context?: VoiceContext) => void;
  cancel: () => void;
}

/**
 * Attempts to insert text into the currently focused element.
 */
function insertTextIntoFocus(text: string): boolean {
  const el = document.activeElement;
  if (!el) return false;

  // Textarea or input
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const needsSpace = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n");
    el.value = before + (needsSpace ? " " : "") + text + after;
    const newPos = start + (needsSpace ? 1 : 0) + text.length;
    el.setSelectionRange(newPos, newPos);
    // Dispatch input event for React
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  // ContentEditable
  if (el instanceof HTMLElement && el.isContentEditable) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  }

  return false;
}

export function useGlobalDictation(): [DictationState, GlobalDictationActions] {
  const [state, setState] = useState<DictationState>({
    active: false,
    interim: "",
    committed: "",
    level: 0,
    engine: "native",
    privacy: "cloud",
    cleaning: false,
  });

  const handleRef = useRef<ElevenLabsSttHandle | { stop: () => void; abort: () => void } | null>(null);
  const contextRef = useRef<VoiceContext>("default");
  const committedRef = useRef("");
  const focusedElementRef = useRef<Element | null>(null);

  // Track ElevenLabs availability
  const elevenLabsAvailRef = useRef<boolean | null>(null);

  useEffect(() => {
    isElevenLabsScribeAvailable().then((avail) => {
      elevenLabsAvailRef.current = avail;
    });
  }, []);

  const start = useCallback(async (context?: VoiceContext) => {
    if (state.active) return;

    // Save the currently focused element
    focusedElementRef.current = document.activeElement;
    contextRef.current = context ?? detectVoiceContext();
    committedRef.current = "";

    // Try ElevenLabs first, then fall back to native
    if (elevenLabsAvailRef.current) {
      setState((s) => ({
        ...s,
        active: true,
        interim: "",
        committed: "",
        level: 0,
        engine: "elevenlabs",
        privacy: "cloud",
        cleaning: false,
      }));

      try {
        const handle = await startElevenLabsScribe({
          onPartial: (text) => {
            setState((s) => ({ ...s, interim: text }));
          },
          onCommitted: (text) => {
            committedRef.current += (committedRef.current ? " " : "") + text;
            setState((s) => ({
              ...s,
              committed: committedRef.current,
              interim: "",
            }));
          },
          onLevel: (level) => {
            setState((s) => ({ ...s, level }));
          },
          onError: (err) => {
            console.warn("[GlobalDictation] ElevenLabs error:", err);
          },
          onEnd: () => {
            // Will be handled by stop()
          },
        });
        handleRef.current = handle;
      } catch {
        // Fall back to native
        startNativeFallback();
      }
    } else {
      startNativeFallback();
    }
  }, [state.active]);

  const startNativeFallback = useCallback(() => {
    const stt = getHologramStt();
    stt.autoSelect();

    setState((s) => ({
      ...s,
      active: true,
      interim: "",
      committed: "",
      level: 0,
      engine: stt.activeStrategy === "whisper" ? "whisper" : "native",
      privacy: stt.privacy,
      cleaning: false,
    }));

    const handle = stt.startContinuousNative({
      onInterim: (text) => {
        setState((s) => ({ ...s, interim: text }));
      },
      onFinal: (text) => {
        committedRef.current = text;
        setState((s) => ({ ...s, committed: text, interim: "" }));
      },
      onEnd: () => {
        // handled by stop
      },
      onError: (err) => {
        console.warn("[GlobalDictation] Native STT error:", err);
        setState((s) => ({ ...s, active: false }));
      },
    });

    handleRef.current = handle;

    // Simulate audio levels for native (it has no level reporting)
    const levelInterval = setInterval(() => {
      setState((s) => {
        if (!s.active) {
          clearInterval(levelInterval);
          return s;
        }
        return { ...s, level: Math.random() * 0.4 + 0.1 };
      });
    }, 150);
  }, []);

  const stop = useCallback(async () => {
    if (!state.active) return;

    handleRef.current?.stop();
    handleRef.current = null;

    const rawText = committedRef.current.trim();
    if (!rawText) {
      setState((s) => ({ ...s, active: false, level: 0, interim: "", committed: "" }));
      return;
    }

    // Run AI cleanup
    setState((s) => ({ ...s, cleaning: true, level: 0 }));

    try {
      const cleaned = await cleanVoiceTranscript(rawText, contextRef.current);

      // Try to insert into the previously focused element
      if (focusedElementRef.current instanceof HTMLElement) {
        focusedElementRef.current.focus();
      }

      const inserted = insertTextIntoFocus(cleaned);
      if (!inserted) {
        // If no focused element, copy to clipboard as fallback
        try {
          await navigator.clipboard.writeText(cleaned);
        } catch {}
      }

      setState((s) => ({
        ...s,
        active: false,
        interim: "",
        committed: cleaned,
        level: 0,
        cleaning: false,
      }));
    } catch {
      // On cleanup error, use raw text
      if (focusedElementRef.current instanceof HTMLElement) {
        focusedElementRef.current.focus();
      }
      insertTextIntoFocus(rawText);
      setState((s) => ({ ...s, active: false, level: 0, cleaning: false }));
    }
  }, [state.active]);

  const cancel = useCallback(() => {
    handleRef.current?.abort();
    handleRef.current = null;
    committedRef.current = "";
    setState((s) => ({ ...s, active: false, interim: "", committed: "", level: 0, cleaning: false }));
  }, []);

  const toggle = useCallback(
    (context?: VoiceContext) => {
      if (state.active) {
        stop();
      } else {
        start(context);
      }
    },
    [state.active, start, stop]
  );

  // Escape to cancel
  useEffect(() => {
    if (!state.active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [state.active, cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleRef.current?.abort();
    };
  }, []);

  return [state, { start, stop, toggle, cancel }];
}
