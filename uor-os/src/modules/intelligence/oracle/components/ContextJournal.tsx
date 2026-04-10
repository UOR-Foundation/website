/**
 * ContextJournal — Transparent private context window.
 *
 * Shows the user everything the coherence engine has learned about them.
 * Every observation is visible, editable, and exportable.
 * The user owns their data — full sovereignty.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download, Trash2, Eye, Brain, Clock, Target, Sparkles } from "lucide-react";
import {
  loadProfile,
  clearProfile,
  exportJournal,
  type AttentionEvent,
  type AttentionProfile,
} from "@/modules/intelligence/oracle/lib/attention-tracker";

interface ContextJournalProps {
  /** Whether to show inline (collapsed) or as a standalone panel */
  inline?: boolean;
}

function eventIcon(type: AttentionEvent["type"]) {
  switch (type) {
    case "dwell": return <Clock size={10} className="text-blue-400/60" />;
    case "scroll": return <Eye size={10} className="text-emerald-400/60" />;
    case "lens_switch": return <Sparkles size={10} className="text-amber-400/60" />;
    case "tower_expand": return <Target size={10} className="text-purple-400/60" />;
    case "source_click": return <Target size={10} className="text-primary/60" />;
    case "session_start": return <Brain size={10} className="text-primary/60" />;
    default: return <Eye size={10} className="text-muted-foreground/40" />;
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

const ContextJournal: React.FC<ContextJournalProps> = ({ inline = true }) => {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<AttentionProfile>(loadProfile);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Refresh profile when expanding
  const handleToggle = () => {
    if (!expanded) setProfile(loadProfile());
    setExpanded(!expanded);
  };

  const handleExport = () => {
    const data = exportJournal();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uor-context-journal-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearProfile();
    setProfile(loadProfile());
    setShowConfirmClear(false);
  };

  // Group journal by category
  const categories = useMemo(() => {
    const groups: Record<string, AttentionEvent[]> = {
      explorations: [],
      preferences: [],
      engagement: [],
    };
    for (const event of profile.journal) {
      if (event.type === "session_start") groups.explorations.push(event);
      else if (event.type === "lens_switch") groups.preferences.push(event);
      else groups.engagement.push(event);
    }
    return groups;
  }, [profile.journal]);

  const journalCount = profile.journal.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <Brain size={13} className="text-muted-foreground/40" />
        <span
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
          className="text-muted-foreground/50"
        >
          Your Context
        </span>
        {journalCount > 0 && (
          <span
            style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4 }}
            className="bg-primary/10 text-primary/60"
          >
            {journalCount} observations
          </span>
        )}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground/30"
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                border: "1px solid hsl(var(--border) / 0.12)",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
              className="bg-muted/5"
            >
              {/* Transparency notice */}
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.5,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid hsl(var(--primary) / 0.1)",
                }}
                className="bg-primary/[0.04] text-muted-foreground/60"
              >
                🔒 <strong className="text-foreground/70">This is your private context.</strong>{" "}
                Everything the system has observed about your exploration patterns is listed below.
                This data stays on your device and is used only to improve your signal-to-noise ratio.
                You can export, review, or delete it at any time.
              </div>

              {/* Summary stats */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Sessions", value: profile.sessionCount },
                  { label: "Reading time", value: `${Math.round(profile.totalDwellSeconds / 60)}m` },
                  { label: "Avg scroll", value: `${Math.round(profile.avgScrollDepth * 100)}%` },
                  { label: "Domains", value: new Set(profile.domainHistory.map(d => d.domain)).size },
                ].map((stat) => (
                  <div key={stat.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }} className="text-muted-foreground/35">
                      {stat.label}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600 }} className="text-foreground/70">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lens preferences */}
              {Object.keys(profile.lensPreferences).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }} className="text-muted-foreground/40">
                    Learned Lens Preferences
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(profile.lensPreferences).map(([domain, lens]) => (
                      <span
                        key={domain}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6 }}
                        className="bg-muted/15 text-foreground/60"
                      >
                        {domain} → {lens}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal entries by category */}
              {(["explorations", "preferences", "engagement"] as const).map((cat) => {
                const events = categories[cat];
                if (events.length === 0) return null;
                const labels = { explorations: "Explorations", preferences: "Preferences", engagement: "Engagement" };
                return (
                  <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }} className="text-muted-foreground/40">
                      {labels[cat]} ({events.length})
                    </span>
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {events.slice(-30).reverse().map((event, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 6px",
                            borderRadius: 6,
                          }}
                          className="hover:bg-muted/10"
                        >
                          {eventIcon(event.type)}
                          <span style={{ fontSize: 11, flex: 1 }} className="text-foreground/60">
                            {event.description}
                          </span>
                          <span style={{ fontSize: 9, flexShrink: 0 }} className="text-muted-foreground/30">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid hsl(var(--border) / 0.1)" }}>
                <button
                  onClick={handleExport}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    border: "1px solid hsl(var(--border) / 0.15)",
                    background: "none",
                    cursor: "pointer",
                  }}
                  className="text-foreground/60 hover:text-foreground/80 hover:bg-muted/10 transition-colors"
                >
                  <Download size={11} />
                  Export Journal
                </button>

                {showConfirmClear ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11 }} className="text-destructive/60">
                      Delete all context?
                    </span>
                    <button
                      onClick={handleClear}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                      className="bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                    >
                      Yes, clear
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        border: "none",
                        cursor: "pointer",
                      }}
                      className="text-muted-foreground/50 hover:text-muted-foreground/70"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      border: "1px solid hsl(var(--border) / 0.15)",
                      background: "none",
                      cursor: "pointer",
                    }}
                    className="text-muted-foreground/40 hover:text-destructive/60 hover:border-destructive/20 transition-colors"
                  >
                    <Trash2 size={11} />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContextJournal;
