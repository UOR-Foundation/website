/**
 * Resonance Panel — Sovereign Data Transparency
 * ═══════════════════════════════════════════════
 *
 * A user-viewable panel that shows what Lumen has learned about their
 * communication patterns. Full transparency — the user owns this data.
 *
 * The panel visualizes the four cybernetic feedback loops and all
 * resonance dimensions, making the invisible visible.
 *
 * @module hologram-ui/components/lumen/ResonancePanel
 */

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Brain, Eye, RefreshCw, Shield, Trash2, X } from "lucide-react";
import {
  loadResonanceProfile,
  getResonanceDiagnostic,
  resetResonanceProfile,
  type ResonanceProfile,
} from "@/modules/hologram-ui/engine/resonanceObserver";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import KnowledgeGraphInput from "./KnowledgeGraphInput";
import KnowledgeGraphExplorer from "./KnowledgeGraphExplorer";

interface ResonancePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ResonancePanel({ open, onClose }: ResonancePanelProps) {
  const [profile, setProfile] = useState<ResonanceProfile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProfile(loadResonanceProfile());
      setConfirmReset(false);
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id ?? null);
      });
    }
  }, [open]);

  const handleReset = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetResonanceProfile();
    setProfile(loadResonanceProfile());
    setConfirmReset(false);
  }, [confirmReset]);

  if (!profile) return null;
  const diag = getResonanceDiagnostic(profile);

  const statusColor = (s: "calibrating" | "adapting" | "resonant") =>
    s === "resonant" ? "hsl(142, 40%, 55%)" :
    s === "adapting" ? "hsl(38, 50%, 55%)" :
    "hsl(30, 10%, 55%)";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "hsla(25, 8%, 4%, 0.85)", backdropFilter: "blur(12px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className="w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto rounded-2xl border"
            style={{
              background: "hsl(25, 8%, 8%)",
              borderColor: "hsla(38, 30%, 40%, 0.15)",
              scrollbarWidth: "none",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 p-6 pb-4" style={{ background: "hsl(25, 8%, 8%)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: `hsla(38, 50%, 55%, 0.1)` }}
                  >
                    <Brain size={16} style={{ color: "hsl(38, 50%, 55%)" }} />
                  </div>
                  <div>
                    <h2
                      className="text-sm font-medium tracking-wide"
                      style={{ color: "hsl(38, 15%, 82%)", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Resonance Profile
                    </h2>
                    <p className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>
                      Your sovereign communication data
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "hsl(30, 10%, 55%)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Overall status */}
              <div
                className="mt-4 p-3 rounded-xl flex items-center justify-between"
                style={{ background: "hsla(38, 30%, 40%, 0.06)" }}
              >
                <div>
                  <span className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>Status</span>
                  <p className="text-sm font-medium" style={{ color: "hsl(38, 50%, 55%)" }}>
                    {diag.label}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>Resonance</span>
                  <p className="text-sm font-medium" style={{ color: "hsl(38, 15%, 82%)" }}>
                    {Math.round(diag.resonanceScore * 100)}%
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>Confidence</span>
                  <p className="text-sm font-medium" style={{ color: "hsl(38, 15%, 82%)" }}>
                    {Math.round(diag.confidence * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-6">
              {/* Feedback Loops */}
              <section>
                <h3
                  className="text-xs font-medium tracking-widest uppercase mb-3 flex items-center gap-2"
                  style={{ color: "hsl(30, 10%, 55%)" }}
                >
                  <RefreshCw size={12} /> Feedback Loops
                </h3>
                <div className="space-y-2">
                  {diag.loopHealth.map(loop => (
                    <div
                      key={loop.loop}
                      className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{ background: "hsla(38, 30%, 40%, 0.04)" }}
                    >
                      <div>
                        <p className="text-sm" style={{ color: "hsl(38, 15%, 82%)" }}>
                          {loop.loop}
                        </p>
                        <p className="text-xs" style={{ color: "hsl(30, 8%, 42%)" }}>
                          {loop.detail}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          color: statusColor(loop.status),
                          background: `${statusColor(loop.status)}15`,
                        }}
                      >
                        {loop.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Dimensions */}
              <section>
                <h3
                  className="text-xs font-medium tracking-widest uppercase mb-3 flex items-center gap-2"
                  style={{ color: "hsl(30, 10%, 55%)" }}
                >
                  <Eye size={12} /> Communication Dimensions
                </h3>
                <div className="space-y-3">
                  {diag.dimensions.map(dim => (
                    <div key={dim.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>
                          {dim.name}
                        </span>
                        <span className="text-xs font-medium" style={{ color: "hsl(38, 50%, 55%)" }}>
                          {dim.label}
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "hsla(38, 30%, 40%, 0.1)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dim.value * 100}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, hsl(38, 35%, 48%), hsl(38, 50%, 55%))`,
                          }}
                        />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "hsl(30, 8%, 42%)" }}>
                        {dim.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Session Insights */}
              <section>
                <h3
                  className="text-xs font-medium tracking-widest uppercase mb-3 flex items-center gap-2"
                  style={{ color: "hsl(30, 10%, 55%)" }}
                >
                  <Activity size={12} /> Session Insights
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {diag.sessionInsights.map(insight => (
                    <div
                      key={insight.label}
                      className="p-2.5 rounded-lg text-center"
                      style={{ background: "hsla(38, 30%, 40%, 0.04)" }}
                    >
                      <p className="text-xs" style={{ color: "hsl(30, 10%, 55%)" }}>
                        {insight.label}
                      </p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: "hsl(38, 15%, 82%)" }}>
                        {insight.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Knowledge Graph Explorer */}
              {userId && <KnowledgeGraphExplorer userId={userId} />}

              {/* Knowledge Graph Input */}
              {userId && <KnowledgeGraphInput userId={userId} />}

              {/* Sovereignty notice + reset */}
              <section
                className="p-3 rounded-xl border"
                style={{
                  background: "hsla(38, 30%, 40%, 0.03)",
                  borderColor: "hsla(38, 30%, 40%, 0.08)",
                }}
              >
                <div className="flex items-start gap-2 mb-3">
                  <Shield size={14} style={{ color: "hsl(38, 50%, 55%)", marginTop: 2, flexShrink: 0 }} />
                  <p className="text-xs leading-relaxed" style={{ color: "hsl(30, 8%, 42%)" }}>
                    This data is encrypted with AES-256-GCM and stored in your sovereign Data Bank. 
                    The server never sees plaintext. You own this data completely.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: confirmReset ? "hsl(0, 60%, 60%)" : "hsl(30, 10%, 55%)",
                    background: confirmReset ? "hsla(0, 60%, 60%, 0.1)" : "transparent",
                  }}
                >
                  <Trash2 size={12} />
                  {confirmReset ? "Confirm reset — this cannot be undone" : "Reset resonance profile"}
                </button>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
