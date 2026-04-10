/**
 * HandoffReceiver — Listens for uor://handoff deep-links and
 * orchestrates the sign-in + state hydration flow.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle, Monitor } from "lucide-react";
import { onDeepLink, initDeepLinks, type DeepLinkAction } from "@/modules/data/sovereign-spaces/deep-link/handler";
import { redeemHandoff, type HandoffResult } from "@/modules/platform/desktop/lib/handoff";

type Phase = "idle" | "receiving" | "signing-in" | "hydrating" | "done" | "error";

interface Props {
  onHandoffComplete?: (result: HandoffResult) => void;
}

export default function HandoffReceiver({ onHandoffComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleHandoff = useCallback(async (handoffToken: string) => {
    setToken(handoffToken);
    setPhase("receiving");
    setError(null);

    try {
      setPhase("signing-in");
      const result = await redeemHandoff(handoffToken);

      setPhase("hydrating");
      // Brief pause for visual feedback
      await new Promise(r => setTimeout(r, 800));

      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        onHandoffComplete?.(result);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handoff failed");
      setPhase("error");
    }
  }, [onHandoffComplete]);

  // Listen for deep-link events
  useEffect(() => {
    const cleanup = onDeepLink((action: DeepLinkAction) => {
      if (action.type === "handoff") {
        handleHandoff(action.token);
      }
    });

    // Also check URL params on mount (browser fallback)
    const params = new URLSearchParams(window.location.search);
    const handoffParam = params.get("handoff");
    if (handoffParam) {
      handleHandoff(handoffParam);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("handoff");
      window.history.replaceState({}, "", url.toString());
    }

    initDeepLinks();
    return cleanup;
  }, [handleHandoff]);

  const retry = useCallback(() => {
    if (token) handleHandoff(token);
  }, [token, handleHandoff]);

  if (phase === "idle") return null;

  const phases: { key: Phase; label: string }[] = [
    { key: "receiving", label: "Receiving session from cloud…" },
    { key: "signing-in", label: "Authenticating…" },
    { key: "hydrating", label: "Restoring workspace…" },
    { key: "done", label: "Welcome to your local OS" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="handoff-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: "hsl(220 15% 6% / 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex flex-col items-center gap-8 max-w-md px-6">
          {/* Icon */}
          <motion.div
            animate={phase === "done" ? { scale: [1, 1.15, 1] } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            {phase === "error" ? (
              <AlertCircle size={48} style={{ color: "hsl(0 70% 60%)" }} />
            ) : phase === "done" ? (
              <Check size={48} style={{ color: "hsl(150 70% 55%)" }} strokeWidth={3} />
            ) : (
              <Monitor size={48} style={{ color: "hsl(210 100% 72%)" }} />
            )}
          </motion.div>

          {/* Title */}
          <h2
            className="text-xl font-semibold text-center"
            style={{ color: "hsl(0 0% 92%)" }}
          >
            {phase === "error" ? "Handoff Failed" : "Session Handoff"}
          </h2>

          {/* Progress steps */}
          {phase !== "error" && (
            <div className="flex flex-col gap-3 w-full">
              {phases.map(({ key, label }) => {
                const idx = phases.findIndex(p => p.key === key);
                const currentIdx = phases.findIndex(p => p.key === phase);
                const isDone = idx < currentIdx || phase === "done";
                const isCurrent = key === phase && phase !== "done";

                return (
                  <motion.div
                    key={key}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: isDone || isCurrent ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {isDone ? (
                        <Check size={14} style={{ color: "hsl(150 70% 55%)" }} strokeWidth={3} />
                      ) : isCurrent ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: "hsl(210 100% 72%)" }} />
                      ) : (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "hsl(0 0% 30%)" }}
                        />
                      )}
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: isDone || isCurrent ? "hsl(0 0% 80%)" : "hsl(0 0% 40%)" }}
                    >
                      {label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Error state */}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-center" style={{ color: "hsl(0 0% 55%)" }}>
                {error}
              </p>
              <button
                onClick={retry}
                className="px-5 py-2 text-sm font-medium rounded-lg transition-all"
                style={{
                  color: "hsl(210 100% 72%)",
                  border: "1px solid hsl(210 100% 72% / 0.3)",
                  background: "hsl(210 100% 72% / 0.08)",
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
