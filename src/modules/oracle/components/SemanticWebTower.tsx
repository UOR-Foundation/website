/**
 * SemanticWebTower — Compact W3C Semantic Web layer status visualization.
 *
 * Maps each encoded page to the W3C Semantic Web Tower layers,
 * showing which layers are active for a given UOR-encoded web page.
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
  { key: "L6", label: "Trust", icon: "🛡" },
  { key: "L5", label: "Proof", icon: "📜" },
  { key: "L4", label: "Logic", icon: "⚙" },
  { key: "L3", label: "Ontology", icon: "🧬" },
  { key: "L2", label: "RDF", icon: "◆" },
  { key: "L1", label: "Schema", icon: "{ }" },
  { key: "L0", label: "URI", icon: "🔗" },
  { key: "Signature", label: "Signature", icon: "⧫" },
];

const SemanticWebTower: React.FC<SemanticWebTowerProps> = ({ layers, engine, crateVersion }) => {
  const [expanded, setExpanded] = useState(false);

  const activeCount = LAYER_ORDER.filter(l => layers[l.key] && layers[l.key] !== "none").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Collapsed summary */}
      <button
        onClick={() => setExpanded(!expanded)}
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
          Semantic Web Tower
        </span>
        <span
          style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4 }}
          className="bg-emerald-500/10 text-emerald-400"
        >
          {activeCount}/{LAYER_ORDER.length} active
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

      {/* Expanded tower */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                border: "1px solid hsl(var(--border) / 0.12)",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
              className="bg-muted/5"
            >
              {LAYER_ORDER.map((layer) => {
                const value = layers[layer.key];
                const isActive = value && value !== "none";
                return (
                  <div
                    key={layer.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "3px 0",
                    }}
                  >
                    {/* Status dot */}
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isActive
                          ? "hsl(142 70% 45%)"
                          : "hsl(var(--muted-foreground) / 0.15)",
                      }}
                    />
                    {/* Layer label */}
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "ui-monospace, monospace",
                        minWidth: 28,
                        flexShrink: 0,
                      }}
                      className={isActive ? "text-foreground/60" : "text-muted-foreground/25"}
                    >
                      {layer.key}
                    </span>
                    <span
                      style={{ fontSize: 11, minWidth: 70, flexShrink: 0 }}
                      className={isActive ? "text-foreground/50" : "text-muted-foreground/20"}
                    >
                      {layer.label}
                    </span>
                    {/* Value */}
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "ui-monospace, monospace",
                      }}
                      className={isActive ? "text-primary/50" : "text-muted-foreground/15"}
                    >
                      {value || "—"}
                    </span>
                  </div>
                );
              })}

              {/* Engine badge */}
              {engine && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px solid hsl(var(--border) / 0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 10 }} className="text-muted-foreground/30">
                    ⚙
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "ui-monospace, monospace",
                    }}
                    className={engine === "wasm" ? "text-emerald-400/60" : "text-muted-foreground/30"}
                  >
                    {engine === "wasm"
                      ? `wasm · uor-foundation${crateVersion ? ` v${crateVersion}` : ""}`
                      : "typescript fallback"}
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
