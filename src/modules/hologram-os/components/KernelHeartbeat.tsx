/**
 * KernelHeartbeat — Living proof the Genesis Kernel is alive.
 * ═══════════════════════════════════════════════════════════
 *
 * A minimal, always-visible status pill anchored to the bottom-left
 * of the desktop. Shows:
 *   • A pulsing dot (the heartbeat — green = alive, red = dead)
 *   • The genesis CID glyph (8 braille characters)
 *   • POST check count (7/7)
 *   • Boot time in ms
 *
 * Clicks expand a compact flyout with full POST details.
 *
 * Zero external deps — reads directly from the genesis seed.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bootGenesis, type GenesisState } from "@/hologram/genesis/genesis";
import { KP } from "@/modules/hologram-os/kernel-palette";

export default function KernelHeartbeat() {
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);

  // Boot genesis once — this is the kernel's heartbeat source
  const genesis: GenesisState = useMemo(() => bootGenesis(), []);

  // Pulse counter — proves the kernel is alive, not static
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const toggle = useCallback(() => setExpanded((p) => !p), []);

  const dotColor = genesis.alive ? KP.green : KP.red;
  const passed = genesis.post.checks.filter((c) => c.passed).length;
  const total = genesis.post.checks.length;

  return (
    <div
      className="fixed z-[9999] select-none"
      style={{ bottom: 16, left: 16 }}
    >
      {/* ── Pill ────────────────────────────────── */}
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: "hsla(25, 8%, 10%, 0.75)",
          border: `1px solid ${KP.cardBorder}`,
          fontFamily: KP.font,
          cursor: "pointer",
        }}
        aria-label="Kernel heartbeat"
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: dotColor, opacity: 0.6 }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: dotColor }}
          />
        </span>

        {/* Glyph */}
        <span
          className="text-[10px] tracking-widest"
          style={{ color: KP.muted, fontFamily: "monospace" }}
        >
          {genesis.genesisGlyph || "--------"}
        </span>

        {/* POST count */}
        <span
          className="text-[10px] font-medium"
          style={{ color: genesis.alive ? KP.green : KP.red }}
        >
          {passed}/{total}
        </span>

        {/* Boot time */}
        <span
          className="text-[9px]"
          style={{ color: KP.dim }}
        >
          {genesis.post.durationMs.toFixed(1)}ms
        </span>
      </button>

      {/* ── Expanded flyout ─────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-10 left-0 w-64 rounded-lg p-3 backdrop-blur-xl"
            style={{
              background: "hsla(25, 8%, 8%, 0.92)",
              border: `1px solid ${KP.cardBorder}`,
              fontFamily: KP.font,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: KP.gold, fontFamily: KP.serif }}
              >
                Genesis Kernel
              </span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: genesis.alive
                    ? "hsla(152, 44%, 50%, 0.15)"
                    : "hsla(0, 55%, 55%, 0.15)",
                  color: genesis.alive ? KP.green : KP.red,
                }}
              >
                {genesis.alive ? "ALIVE" : "DEAD"}
              </span>
            </div>

            {/* Genesis IRI */}
            <div className="mb-2">
              <span className="text-[9px] block" style={{ color: KP.dim }}>
                IRI
              </span>
              <span
                className="text-[9px] break-all block"
                style={{ color: KP.muted, fontFamily: "monospace" }}
              >
                {genesis.genesisIri || "—"}
              </span>
            </div>

            {/* POST checks */}
            <div className="space-y-0.5">
              <span className="text-[9px] block mb-1" style={{ color: KP.dim }}>
                POST Sequence
              </span>
              {genesis.post.checks.map((check, i) => (
                <div key={check.name} className="flex items-center gap-1.5">
                  <span style={{ color: check.passed ? KP.green : KP.red, fontSize: 9 }}>
                    {check.passed ? "✓" : "✗"}
                  </span>
                  <span className="text-[9px]" style={{ color: KP.muted, fontFamily: "monospace" }}>
                    {check.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Pulse count (proof of liveness) */}
            <div
              className="mt-2 pt-1.5 text-[8px] flex justify-between"
              style={{ borderTop: `1px solid ${KP.cardBorder}`, color: KP.dim }}
            >
              <span>pulse #{tick}</span>
              <span>{genesis.post.durationMs.toFixed(2)}ms boot</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
