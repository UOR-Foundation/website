/**
 * useFocusToast — Focus-aware notification wrapper
 * ═════════════════════════════════════════════════
 *
 * Wraps the sonner `toast()` API with automatic distraction gating.
 * Notifications are suppressed when their priority doesn't pass the
 * current attention gate.
 *
 * UOR Alignment:
 *   Notifications are observables. An observable only "collapses"
 *   (renders) when the observer's field includes its stratum level.
 *   In deep focus, only critical observables (system errors) manifest.
 *
 * Usage:
 *   const notify = useFocusToast();
 *   notify.show("File saved", { priority: "low" });
 *   notify.error("Connection lost", { priority: "critical" });
 *
 * @module hologram-ui/hooks/useFocusToast
 */

import { useCallback, useMemo } from "react";
import { toast, type ExternalToast } from "sonner";
import { useAttentionMode, type DistractionPriority } from "./useAttentionMode";

interface FocusToastOptions extends ExternalToast {
  priority?: DistractionPriority;
}

interface FocusToastAPI {
  show: (message: string | React.ReactNode, opts?: FocusToastOptions) => void;
  success: (message: string | React.ReactNode, opts?: FocusToastOptions) => void;
  error: (message: string | React.ReactNode, opts?: FocusToastOptions) => void;
  warning: (message: string | React.ReactNode, opts?: FocusToastOptions) => void;
  info: (message: string | React.ReactNode, opts?: FocusToastOptions) => void;
}

function stripPriority(opts?: FocusToastOptions): ExternalToast | undefined {
  if (!opts) return undefined;
  const { priority: _, ...rest } = opts;
  return rest;
}

export function useFocusToast(): FocusToastAPI {
  const { shouldShow } = useAttentionMode();

  return useMemo<FocusToastAPI>(() => ({
    show: (msg, opts) => {
      if (shouldShow(opts?.priority ?? "medium")) toast(msg, stripPriority(opts));
    },
    success: (msg, opts) => {
      if (shouldShow(opts?.priority ?? "medium")) toast.success(msg, stripPriority(opts));
    },
    error: (msg, opts) => {
      if (shouldShow(opts?.priority ?? "critical")) toast.error(msg, stripPriority(opts));
    },
    warning: (msg, opts) => {
      if (shouldShow(opts?.priority ?? "high")) toast.warning(msg, stripPriority(opts));
    },
    info: (msg, opts) => {
      if (shouldShow(opts?.priority ?? "low")) toast.info(msg, stripPriority(opts));
    },
  }), [shouldShow]);
}
