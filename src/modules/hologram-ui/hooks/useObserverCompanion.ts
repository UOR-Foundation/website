/**
 * useObserverCompanion — React Hook for the Unified Observer Feed
 * ═══════════════════════════════════════════════════════════════
 *
 * Assembles a single ObserverBriefing from all five observer layers,
 * recomputing when any input changes. The briefing is passed to the
 * AI chat as ambient context in the system prompt.
 *
 * @module hologram-ui/hooks/useObserverCompanion
 */

import { useMemo } from "react";
import { assembleObserverBriefing, type ObserverBriefing } from "../engine/observerCompanion";
import type { UserContextProfile } from "../engine/signalRelevance";
import type { TLDR } from "../hooks/useFocusJournal";

interface ObserverCompanionInput {
  /** User context profile from useContextProjection */
  profile: UserContextProfile;
  /** Pending TLDR from useFocusJournal (null if none) */
  pendingTLDR: TLDR | null;
  /** Session SNR (null if not computed) */
  sessionSNR: number | null;
}

export function useObserverCompanion({
  profile,
  pendingTLDR,
  sessionSNR,
}: ObserverCompanionInput): ObserverBriefing {
  return useMemo(
    () => assembleObserverBriefing(profile, pendingTLDR, sessionSNR),
    [profile, pendingTLDR, sessionSNR],
  );
}
