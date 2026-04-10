/**
 * SemanticWebTower — Animated stacked mini-tower visualization
 * matching the W3C Semantic Web Tower architecture.
 *
 * Collapsed: horizontal "semantic health meter" with colored segments.
 * Expanded: stacked colored bars with pulse-on-load animation.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface SemanticWebTowerProps {
  layers: Record<string, string>;
  engine?: string;
  crateVersion?: string | null;
}

const LAYER_ORDER = [
  { key: "L6", label: "Trust",     color: "hsl(300, 55%, 78%)",  darkText: true  },
  { key: "L5", label: "Proof",     color: "hsl(260, 40%, 60%)",  darkText: false },
  { key: "L4", label: "Logic",     color: "hsl(210, 70%, 50%)",  darkText: false },
  { key: "L3", label: "Ontology",  color: "hsl(90, 60%, 48%)",   darkText: true  },
  { key: "L2", label: "RDF",       color: "hsl(42, 95%, 55%)",   darkText: true  },
  { key: "L1", label: "Schema",    color: "hsl(14, 85%, 50%)",   darkText: false },
  { key: "L0", label: "URI",       color: "hsl(220, 12%, 30%)",  darkText: false },
  { key: "Signature", label: "Signature", color: "hsl(25, 40%, 38%)", darkText: false },
];

const SemanticWebTower: React.FC<SemanticWebTowerProps> = ({ layers, engine, crateVersion }) => {
  const [expanded, setExpanded] = useState(false);

  const activeCount = LAYER_ORDER.filter(l => layers[l.key] && layers[l.key] !== "none").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Collapsed: horizontal health meter */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
            flexShrink: 0,
          }}
          className="text-muted-foreground/50"
        >
          Semantic Web
        </span>

        {/* Mini horizontal bar segments */}
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {LAYER_ORDER.map((layer) => {
            const isActive = layers[layer.key] && layers[layer.key] !== "none";
            return (
              <motion.div
                key={layer.key}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: LAYER_ORDER.indexOf(layer) * 0.05, duration: 0.3 }}
                style={{
                  width: 12,
                  height: 8,
                  borderRadius: 2,
                  background: isActive ? layer.color : "hsl(var(--muted-foreground) / 0.1)",
                  opacity: isActive ? 1 : 0.4,
                  transition: "background 0.3s",
                }}
                title={`${layer.label}: ${layers[layer.key] || "—"}`}
              />
            );
          })}
        </div>

        <span
          style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4 }}
          className="bg-emerald-500/10 text-emerald-400"
        >
          {activeCount}/{LAYER_ORDER.length}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground/30"
          style={{ fontSize: 10 }}
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      {/* Expanded: stacked tower */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                border: "1px solid hsl(var(--border) / 0.12)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
              className="bg-muted/5"
            >
              {LAYER_ORDER.map((layer, i) => {
                const value = layers[layer.key];
                const isActive = value && value !== "none";
                // Wider bars at the bottom (URI), narrower at top (Trust)
                const widthPct = 100 - (i * 6);

                return (
                  <motion.div
                    key={layer.key}
                    initial={{ opacity: 0, x: -12, scaleX: 0.7 }}
                    animate={{ opacity: 1, x: 0, scaleX: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: "easeOut" }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      width: `${widthPct}%`,
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  >
                    {/* Colored bar */}
                    <div
                      style={{
                        flex: 1,
                        height: 26,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingLeft: 10,
                        paddingRight: 10,
                        background: isActive ? layer.color : "hsl(var(--muted-foreground) / 0.06)",
                        opacity: isActive ? 1 : 0.35,
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 0.3s",
                      }}
                    >
                      {/* Pulse glow on active */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 1.5, delay: i * 0.06 }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "white",
                            borderRadius: 4,
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: isActive ? (layer.darkText ? "hsl(220, 20%, 12%)" : "white") : "hsl(var(--muted-foreground) / 0.3)",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {layer.key === "Signature" ? "⧫" : layer.key} · {layer.label}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "ui-monospace, monospace",
                          color: isActive ? (layer.darkText ? "hsl(220, 20%, 12% / 0.6)" : "rgba(255,255,255,0.65)") : "hsl(var(--muted-foreground) / 0.15)",
                          position: "relative",
                          zIndex: 1,
                          maxWidth: "50%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {value || "—"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Engine badge */}
              {engine && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid hsl(var(--border) / 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "ui-monospace, monospace",
                    }}
                    className={engine === "wasm" ? "text-emerald-400/60" : "text-muted-foreground/30"}
                  >
                    {engine === "wasm"
                      ? `⚙ wasm · uor-foundation${crateVersion ? ` v${crateVersion}` : ""}`
                      : "⚙ typescript fallback"}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SemanticWebTower;
