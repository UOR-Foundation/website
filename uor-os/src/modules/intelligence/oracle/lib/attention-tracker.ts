/**
 * attention-tracker — Lightweight client-side implicit feedback tracker.
 *
 * Tracks dwell time, scroll depth, and lens preferences per session.
 * All observations are transparently logged to the user's context journal.
 * No data leaves the device without explicit user awareness.
 */

const STORAGE_KEY = "uor:attention-profile";

export interface AttentionEvent {
  /** What was observed */
  type: "dwell" | "scroll" | "lens_switch" | "tower_expand" | "source_click" | "session_start";
  /** The topic/keyword being explored */
  topic: string;
  /** Numeric value (seconds for dwell, % for scroll, lens id for switch) */
  value: number | string;
  /** ISO timestamp */
  timestamp: string;
  /** Human-readable description of what we observed */
  description: string;
}

export interface AttentionProfile {
  /** Lens preferences by domain: { physics: "expert", art: "magazine" } */
  lensPreferences: Record<string, string>;
  /** Recent domains explored (last 50) */
  domainHistory: Array<{ domain: string; timestamp: string }>;
  /** Current session dwell times by topic */
  sessionDwells: Record<string, number>;
  /** Total sessions tracked */
  sessionCount: number;
  /** Total dwell seconds across all sessions */
  totalDwellSeconds: number;
  /** Average scroll depth (0–1) */
  avgScrollDepth: number;
  /** Transparent journal of all observations — the user sees everything */
  journal: AttentionEvent[];
}

const DEFAULT_PROFILE: AttentionProfile = {
  lensPreferences: {},
  domainHistory: [],
  sessionDwells: {},
  sessionCount: 0,
  totalDwellSeconds: 0,
  avgScrollDepth: 0.5,
  journal: [],
};

/** Load the attention profile from localStorage. */
export function loadProfile(): AttentionProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE, journal: [] };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE, journal: [] };
  }
}

/** Save profile to localStorage. */
function saveProfile(profile: AttentionProfile): void {
  // Keep journal to last 200 entries to bound storage
  if (profile.journal.length > 200) {
    profile.journal = profile.journal.slice(-200);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** Record an attention event and return the updated profile. */
export function recordEvent(event: Omit<AttentionEvent, "timestamp">): AttentionProfile {
  const profile = loadProfile();
  const fullEvent: AttentionEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  profile.journal.push(fullEvent);

  // Update aggregates based on event type
  switch (event.type) {
    case "dwell": {
      const seconds = typeof event.value === "number" ? event.value : 0;
      profile.sessionDwells[event.topic] =
        (profile.sessionDwells[event.topic] || 0) + seconds;
      profile.totalDwellSeconds += seconds;
      break;
    }
    case "lens_switch": {
      const lensId = String(event.value);
      // Track which lens this domain prefers
      profile.lensPreferences[event.topic] = lensId;
      break;
    }
    case "scroll": {
      const depth = typeof event.value === "number" ? event.value : 0;
      profile.avgScrollDepth =
        profile.avgScrollDepth * 0.9 + depth * 0.1; // exponential moving avg
      break;
    }
    case "session_start": {
      profile.sessionCount++;
      profile.sessionDwells = {}; // reset per-session dwells
      break;
    }
  }

  saveProfile(profile);
  return profile;
}

/** Record a domain visit. */
export function recordDomainVisit(domain: string): void {
  const profile = loadProfile();
  profile.domainHistory.push({ domain, timestamp: new Date().toISOString() });
  // Keep last 50
  if (profile.domainHistory.length > 50) {
    profile.domainHistory = profile.domainHistory.slice(-50);
  }
  saveProfile(profile);
}

/** Get the user's preferred lens for a domain, if any. */
export function getPreferredLens(domain: string): string | null {
  const profile = loadProfile();
  return profile.lensPreferences[domain] || null;
}

/** Export the full journal as a JSON string (for user download). */
export function exportJournal(): string {
  const profile = loadProfile();
  return JSON.stringify(profile.journal, null, 2);
}

/** Clear all attention data. */
export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get journal entries as human-readable text. */
export function journalToText(): string {
  const profile = loadProfile();
  return profile.journal
    .map(
      (e) =>
        `[${new Date(e.timestamp).toLocaleString()}] ${e.description}`
    )
    .join("\n");
}
