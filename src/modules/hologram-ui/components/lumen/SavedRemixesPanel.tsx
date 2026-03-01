/**
 * SavedRemixesPanel — Drawer for viewing saved favorite remixes
 */
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, X, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { SavedRemix } from "../../hooks/useSavedRemixes";

const C = {
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;

interface Props {
  remixes: SavedRemix[];
  onRemove: (id: string) => void;
  onReplay: (thought: string) => void;
}

function SavedRemixesPanel({ remixes, onRemove, onReplay }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (remixes.length === 0) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300"
        style={{
          background: open ? "hsla(38, 25%, 20%, 0.15)" : "transparent",
          border: "1px solid hsla(38, 20%, 30%, 0.08)",
          color: "hsla(38, 40%, 60%, 0.6)",
        }}
        title="Saved remixes"
      >
        <Bookmark className="w-3.5 h-3.5" fill={open ? "currentColor" : "none"} />
        <span className="text-[9px] tracking-[0.12em] uppercase" style={{ fontFamily: C.font }}>
          {remixes.length} saved
        </span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 rounded-xl p-3 space-y-2"
              style={{
                background: "hsla(25, 8%, 7%, 0.5)",
                border: "1px solid hsla(38, 15%, 22%, 0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "hsla(38, 20%, 55%, 0.4)", fontFamily: C.font }}>
                  Saved Remixes
                </p>
                <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-[hsla(38,15%,25%,0.08)]">
                  <X className="w-3 h-3" style={{ color: "hsla(38, 15%, 50%, 0.3)" }} />
                </button>
              </div>

              {remixes.map((r) => {
                const isExpanded = expandedId === r.id;
                const savedDate = new Date(r.savedAt);
                const dateStr = savedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });

                return (
                  <motion.div
                    key={r.id}
                    layout
                    className="rounded-lg overflow-hidden"
                    style={{
                      background: "hsla(25, 8%, 10%, 0.4)",
                      border: "1px solid hsla(38, 15%, 22%, 0.06)",
                    }}
                  >
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all duration-200 hover:bg-[hsla(38,15%,25%,0.05)]"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: "hsla(38, 35%, 55%, 0.4)" }} />
                        : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "hsla(38, 35%, 55%, 0.4)" }} />
                      }
                      <span
                        className="text-[11px] leading-snug truncate flex-1"
                        style={{ color: "hsla(30, 12%, 70%, 0.7)", fontFamily: C.font }}
                      >
                        {r.thought.length > 60 ? r.thought.slice(0, 60) + "…" : r.thought}
                      </span>
                      <span className="text-[8px] flex-shrink-0" style={{ color: "hsla(30, 10%, 50%, 0.25)" }}>
                        {dateStr}
                      </span>
                      {r.grade && (
                        <span className="text-[8px] tracking-wider flex-shrink-0" style={{
                          color: r.grade === "A" ? "hsla(152, 50%, 60%, 0.6)" : "hsla(38, 40%, 55%, 0.5)"
                        }}>
                          {r.grade}
                        </span>
                      )}
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2">
                            {/* Mix labels */}
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded" style={{
                                color: "hsla(38, 30%, 60%, 0.5)",
                                background: "hsla(38, 20%, 25%, 0.08)",
                              }}>
                                {r.originalMix}
                              </span>
                              <span className="text-[9px]" style={{ color: "hsla(30, 10%, 50%, 0.2)" }}>→</span>
                              <span className="text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded" style={{
                                color: "hsla(200, 40%, 65%, 0.6)",
                                background: "hsla(200, 20%, 25%, 0.08)",
                              }}>
                                {r.remixMix}
                              </span>
                            </div>

                            {/* Remixed text preview */}
                            <p className="text-[11px] leading-[1.75]" style={{
                              color: "hsla(30, 12%, 68%, 0.55)",
                              fontFamily: C.font,
                              fontWeight: 350,
                            }}>
                              {r.remixed.length > 300 ? r.remixed.slice(0, 300) + "…" : r.remixed}
                            </p>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => onReplay(r.thought)}
                                className="text-[8px] tracking-wider uppercase px-2 py-1 rounded-md transition-all duration-200 hover:bg-[hsla(200,20%,25%,0.1)]"
                                style={{ color: "hsla(200, 45%, 60%, 0.5)", border: "1px solid hsla(200, 25%, 35%, 0.1)" }}
                              >
                                Re-ask
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(r.remixed);
                                }}
                                className="text-[8px] tracking-wider uppercase px-2 py-1 rounded-md transition-all duration-200 hover:bg-[hsla(38,15%,25%,0.08)]"
                                style={{ color: "hsla(38, 25%, 55%, 0.4)" }}
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => onRemove(r.id)}
                                className="ml-auto p-1 rounded-md transition-all duration-200 hover:bg-[hsla(0,30%,25%,0.1)]"
                                title="Remove from saved"
                              >
                                <Trash2 className="w-3 h-3" style={{ color: "hsla(0, 35%, 55%, 0.35)" }} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(SavedRemixesPanel);
