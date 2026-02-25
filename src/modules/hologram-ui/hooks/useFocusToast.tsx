/**
 * useFocusToast — Focus-aware notification wrapper with journal logging
 * ════════════════════════════════════════════════════════════════════
 *
 * Wraps the sonner `toast()` API with automatic distraction gating.
 * Suppressed notifications are logged to the FocusJournal for the
 * TLDR summary when the user exits focus mode.
 *
 * UOR Alignment:
 *   Notifications are observables. An observable only "collapses"
 *   (renders) when the observer's field includes its stratum level.
 *   In deep focus, only critical observables (system errors) manifest.
 *   Suppressed observables are captured as journal entries (compressed
 *   witnesses) for later decompression in the TLDR.
 *
 * @module hologram-ui/hooks/useFocusToast
 */

import { useMemo } from "react";
import { toast, type ExternalToast } from "sonner";
import { useAttentionMode, type DistractionPriority } from "./useAttentionMode";
import { useFocusJournal } from "./useFocusJournal";

interface FocusToastOptions extends ExternalToast {
  priority?: DistractionPriority;
  /** Tags for signal relevance scoring */
  tags?: string[];
  /** Source system identifier */
  source?: string;
  /** Triadic phase */
  phase?: string;
}

function stripExtras(opts?: FocusToastOptions): ExternalToast | undefined {
  if (!opts) return undefined;
  const { priority: _, tags: _t, source: _s, phase: _p, ...rest } = opts;
  return rest;
}

export function useFocusToast() {
  const { shouldShow } = useAttentionMode();
  const { log } = useFocusJournal();

  return useMemo(() => {
    const makeHandler = (
      method: typeof toast | typeof toast.success,
      defaultPriority: DistractionPriority,
    ) => {
      return (message: string | React.ReactNode, opts?: FocusToastOptions) => {
        const priority = opts?.priority ?? defaultPriority;
        const passes = shouldShow(priority);
        const msgStr = typeof message === "string" ? message : "Notification";

        // Always log to journal when in a focus session
        log(
          {
            message: msgStr,
            source: opts?.source ?? "notification",
            tags: opts?.tags ?? [],
            phase: opts?.phase,
            priority,
          },
          !passes, // suppressed = did NOT pass the gate
        );

        if (passes) {
          method(message, stripExtras(opts));
        }
      };
    };

    return {
      show: makeHandler(toast, "medium"),
      success: makeHandler(toast.success, "medium"),
      error: makeHandler(toast.error, "critical"),
      warning: makeHandler(toast.warning, "high"),
      info: makeHandler(toast.info, "low"),
    };
  }, [shouldShow, log]);
}
