/**
 * FocusJournal — Missed-Event Capture & TLDR System
 * ══════════════════════════════════════════════════
 *
 * Captures events that were suppressed during focus mode and presents
 * a structured TLDR when the user returns to diffuse.
 *
 * UOR Alignment:
 *   - Journal = append-only session chain (like agent_session_chains)
 *   - Each entry = an Observable that didn't collapse during focus
 *   - TLDR = a compression morphism (like agent_compression_witnesses)
 *     that preserves essential properties while reducing information
 *   - The journal itself has a CID-like session boundary (focus start/end)
 *
 * Lifecycle:
 *   1. User enters focus → journal opens a new session
 *   2. Suppressed events are scored and appended
 *   3. User exits focus → journal compresses entries into TLDR
 *   4. TLDR overlay appears with grouped, relevance-sorted summary
 *   5. User acknowledges → journal clears for next session
 *
 * @module hologram-ui/hooks/useFocusJournal
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { useAttentionMode, type DistractionPriority } from "./useAttentionMode";
import {
  scoreSignal,
  computeBatchSNR,
  loadContextProfile,
  type InboundSignal,
  type ScoredSignal,
  type UserContextProfile,
} from "../engine/signalRelevance";

// ── Types ────────────────────────────────────────────────────────────────

export interface JournalEntry extends ScoredSignal {
  /** Was this suppressed by the focus gate? */
  suppressed: boolean;
}

export interface JournalSession {
  /** When focus mode was entered */
  startedAt: number;
  /** When focus mode was exited (null if still active) */
  endedAt: number | null;
  /** All captured entries */
  entries: JournalEntry[];
  /** Aggregate SNR for the session */
  snr: number;
  /** Peak aperture during session */
  peakAperture: number;
}

export interface TLDRGroup {
  /** Group label (source or phase) */
  label: string;
  /** Icon hint for the group */
  icon: string;
  /** Entries sorted by relevance (highest first) */
  entries: JournalEntry[];
  /** Count of entries */
  count: number;
  /** Average relevance */
  avgRelevance: number;
}

export interface TLDR {
  /** Session duration in ms */
  duration: number;
  /** Total suppressed events */
  totalSuppressed: number;
  /** Events that were signal (relevant) */
  signalCount: number;
  /** Events that were noise (irrelevant) */
  noiseCount: number;
  /** Aggregate SNR */
  snr: number;
  /** Grouped entries */
  groups: TLDRGroup[];
  /** Top 5 most relevant items across all groups */
  highlights: JournalEntry[];
}

interface FocusJournalContextValue {
  /** Whether a focus session is active */
  isSessionActive: boolean;
  /** Current session (null if no active session) */
  session: JournalSession | null;
  /** Log an event to the journal (called by toast system, etc.) */
  log: (signal: Omit<InboundSignal, "id" | "timestamp">, suppressed: boolean) => void;
  /** Pending TLDR to show (non-null when user just exited focus) */
  pendingTLDR: TLDR | null;
  /** Dismiss the TLDR overlay */
  dismissTLDR: () => void;
  /** Number of entries in current/last session */
  entryCount: number;
}

// ── TLDR Compilation ─────────────────────────────────────────────────────

function compileTLDR(session: JournalSession): TLDR {
  const suppressed = session.entries.filter((e) => e.suppressed);
  const signals = suppressed.filter((e) => e.isSignal);
  const noise = suppressed.filter((e) => !e.isSignal);

  // Group by source
  const groupMap = new Map<string, JournalEntry[]>();
  for (const entry of suppressed) {
    const key = entry.source;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(entry);
  }

  const SOURCE_ICONS: Record<string, string> = {
    chat: "💬",
    notification: "🔔",
    system: "⚙️",
    agent: "🤖",
    calendar: "📅",
    email: "✉️",
    task: "✅",
    social: "👥",
  };

  const groups: TLDRGroup[] = Array.from(groupMap.entries())
    .map(([label, entries]) => ({
      label,
      icon: SOURCE_ICONS[label] ?? "📌",
      entries: entries.sort((a, b) => b.relevance - a.relevance),
      count: entries.length,
      avgRelevance:
        entries.reduce((s, e) => s + e.relevance, 0) / entries.length,
    }))
    .sort((a, b) => b.avgRelevance - a.avgRelevance);

  const highlights = [...suppressed]
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);

  return {
    duration: (session.endedAt ?? Date.now()) - session.startedAt,
    totalSuppressed: suppressed.length,
    signalCount: signals.length,
    noiseCount: noise.length,
    snr: session.snr,
    groups,
    highlights,
  };
}

// ── Context ──────────────────────────────────────────────────────────────

const FocusJournalContext = createContext<FocusJournalContextValue | null>(null);

let entryCounter = 0;

export function FocusJournalProvider({ children }: { children: ReactNode }) {
  const { aperture, preset } = useAttentionMode();
  const [session, setSession] = useState<JournalSession | null>(null);
  const [pendingTLDR, setPendingTLDR] = useState<TLDR | null>(null);
  const prevPreset = useRef<string>(preset);
  const profileRef = useRef<UserContextProfile>(loadContextProfile());

  // Reload profile periodically (it's updated by other hooks)
  useEffect(() => {
    const interval = setInterval(() => {
      profileRef.current = loadContextProfile();
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Track peak aperture
  useEffect(() => {
    if (session && aperture > session.peakAperture) {
      setSession((s) =>
        s ? { ...s, peakAperture: aperture } : s,
      );
    }
  }, [aperture, session]);

  // Detect focus → diffuse transition
  useEffect(() => {
    const wasFocused = prevPreset.current === "focus";
    const nowDiffuse = preset === "diffuse";
    prevPreset.current = preset;

    if (wasFocused && nowDiffuse && session && session.entries.length > 0) {
      // End session, compile TLDR
      const ended = { ...session, endedAt: Date.now() };
      ended.snr = computeBatchSNR(ended.entries);
      setPendingTLDR(compileTLDR(ended));
      setSession(null);
    } else if (!wasFocused && preset === "focus" && !session) {
      // Start new session
      setSession({
        startedAt: Date.now(),
        endedAt: null,
        entries: [],
        snr: 1,
        peakAperture: aperture,
      });
    }
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const log = useCallback(
    (
      signal: Omit<InboundSignal, "id" | "timestamp">,
      suppressed: boolean,
    ) => {
      const full: InboundSignal = {
        ...signal,
        id: `journal-${++entryCounter}-${Date.now()}`,
        timestamp: Date.now(),
      };
      const scored = scoreSignal(full, profileRef.current);
      const entry: JournalEntry = { ...scored, suppressed };

      setSession((s) => {
        if (!s) return s;
        const entries = [...s.entries, entry];
        return { ...s, entries, snr: computeBatchSNR(entries) };
      });
    },
    [],
  );

  const dismissTLDR = useCallback(() => setPendingTLDR(null), []);

  const value = useMemo<FocusJournalContextValue>(
    () => ({
      isSessionActive: session !== null,
      session,
      log,
      pendingTLDR,
      dismissTLDR,
      entryCount: session?.entries.length ?? 0,
    }),
    [session, log, pendingTLDR, dismissTLDR],
  );

  return (
    <FocusJournalContext.Provider value={value}>
      {children}
    </FocusJournalContext.Provider>
  );
}

export function useFocusJournal(): FocusJournalContextValue {
  const ctx = useContext(FocusJournalContext);
  if (!ctx) {
    return {
      isSessionActive: false,
      session: null,
      log: () => {},
      pendingTLDR: null,
      dismissTLDR: () => {},
      entryCount: 0,
    };
  }
  return ctx;
}
