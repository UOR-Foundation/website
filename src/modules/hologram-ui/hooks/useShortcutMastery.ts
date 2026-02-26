/**
 * useShortcutMastery — Progressive Shortcut Hint System
 * ══════════════════════════════════════════════════════
 *
 * Tracks how often each keyboard shortcut is used via localStorage.
 * After a threshold of uses, the shortcut is considered "mastered"
 * and visual hints can be hidden to declutter the UI.
 *
 * Mastery levels:
 *   0 uses  → full opacity (learning)
 *   1-2     → slightly reduced
 *   3-5     → fading
 *   6+      → mastered (hidden)
 */

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hologram:shortcut-mastery";
const MASTERY_THRESHOLD = 6;

interface MasteryStore {
  [shortcutKey: string]: number; // usage count
}

// ── Singleton store with external subscription ──────────────────
let cache: MasteryStore | null = null;
const listeners = new Set<() => void>();

function read(): MasteryStore {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

function write(store: MasteryStore) {
  cache = store;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): MasteryStore {
  return read();
}

// ── Hook ────────────────────────────────────────────────────────

export function useShortcutMastery() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  /** Record that the user just used a shortcut (call from keydown handler) */
  const record = useCallback((key: string) => {
    const current = read();
    const count = (current[key] || 0) + 1;
    write({ ...current, [key]: count });
  }, []);

  /** Get the opacity multiplier for a hint (1 = fully visible, 0 = hidden) */
  const hintOpacity = useCallback(
    (key: string): number => {
      const count = store[key] || 0;
      if (count >= MASTERY_THRESHOLD) return 0;
      if (count >= 4) return 0.15;
      if (count >= 2) return 0.5;
      return 1;
    },
    [store],
  );

  /** Whether a shortcut is fully mastered (hint should be hidden) */
  const isMastered = useCallback(
    (key: string): boolean => (store[key] || 0) >= MASTERY_THRESHOLD,
    [store],
  );

  return { record, hintOpacity, isMastered };
}
