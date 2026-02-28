/**
 * KernelHeartbeat — Living proof the Genesis Kernel is alive.
 * ═══════════════════════════════════════════════════════════
 *
 * A minimal, always-visible status pill anchored to the bottom-left
 * of the desktop. Shows:
 *   • A pulsing dot (the heartbeat — driven by kernel tick rate)
 *   • The genesis CID glyph (braille characters cycling at kernel Hz)
 *   • Triword address
 *   • POST check count (7/7)
 *   • Boot time in ms
 *
 * The pill itself breathes with the kernel's coherence —
 * its glow, pulse rate, and border luminance all derive from
 * the actual H-score and tick count of the running kernel.
 *
 * Zero external deps — reads directly from the genesis seed + kernel frame.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bootGenesis, type GenesisState } from "@/hologram/genesis/genesis";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { canonicalToTriword } from "@/lib/uor-triword";
import TriwordAddress from "@/components/TriwordAddress";
import { useKernel } from "@/modules/hologram-os/hooks/useKernel";

// Braille block chars for the living glyph animation
const GLYPH_CHARS = "⠁⠂⠄⡀⠈⠐⠠⢀⠃⠅⠆⡁⡂⡄⠉⠊⠑⠒⠔⠘⠡⠢⠤⠨⠰⢁⢂⢄⢈⢐⢠⣀⠇⡃⡅⡆⡈⡉⡊⡐⡑⡒⡔⡘⡠⡡⡢⡤⡨⡰⠋⠍⠎⠓⠕⠖⠙⠚⠜⠣⠥⠦⠩⠪⠬⠱⠲⠴⠸⢃⢅⢆⢉⢊⢌⢑⢒⢔⢘⢡⢢⢤⢨⢰⣁⣂⣄⣈⣐⣠".split("");

export default function KernelHeartbeat() {
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);
  const [glyphIdx, setGlyphIdx] = useState(0);

  // ── Kernel frame for live coherence data ────────────────
  const { frame } = useKernel();
  const kernelTick = frame?.tick ?? 0;
  const meanH = frame?.systemCoherence?.meanH ?? 0.85;
  const zone = frame?.systemCoherence?.zone ?? "exploring";

  // ── Drag state ──────────────────────────────────────────
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const dragging = React.useRef(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const didDrag = React.useRef(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    didDrag.current = false;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    didDrag.current = true;
    const rect = rootRef.current;
    if (!rect) return;
    const elW = rect.offsetWidth;
    const elH = rect.offsetHeight;
    const newLeft = e.clientX - dragOffset.current.x;
    const newBottom = window.innerHeight - e.clientY - (elH - dragOffset.current.y);
    const clampedLeft = Math.max(0, Math.min(newLeft, window.innerWidth - elW));
    const clampedBottom = Math.max(0, Math.min(newBottom, window.innerHeight - elH));
    setPos({ x: clampedLeft, y: clampedBottom });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Boot genesis once
  const genesis: GenesisState = useMemo(() => bootGenesis(), []);

  // Pulse counter — rate driven by coherence (higher H = calmer pulse)
  const pulseRate = useMemo(() => {
    // H=1 → 3s (serene), H=0.5 → 1.2s (alert), H=0 → 0.6s (urgent)
    return 600 + meanH * 2400;
  }, [meanH]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), pulseRate);
    return () => clearInterval(id);
  }, [pulseRate]);

  // Living glyph — cycles at kernel-proportional rate
  const glyphRate = useMemo(() => 400 + meanH * 600, [meanH]);
  useEffect(() => {
    const id = setInterval(() => setGlyphIdx((i) => (i + 1) % GLYPH_CHARS.length), glyphRate);
    return () => clearInterval(id);
  }, [glyphRate]);

  const toggle = useCallback(() => {
    if (didDrag.current) return;
    setExpanded((p) => !p);
  }, []);

  // ── Derived visual state from kernel ────────────────────
  const alive = genesis.alive;
  const dotColor = alive ? KP.green : KP.red;
  const passed = genesis.post.checks.filter((c) => c.passed).length;
  const total = genesis.post.checks.length;
  const triword = alive ? canonicalToTriword(genesis.genesisCid.string) : null;
  const livingGlyph = GLYPH_CHARS[glyphIdx];

  // Glow intensity driven by coherence zone
  const glowIntensity = zone === "convergent" ? 0.35 : zone === "exploring" ? 0.2 : 0.08;
  const glowHue = zone === "convergent" ? 152 : zone === "exploring" ? 38 : 0;
  const borderLuminance = 0.06 + meanH * 0.06; // 0.06 → 0.12 based on H

  return (
    <div
      ref={rootRef}
      className="fixed z-[9999] select-none"
      style={{ bottom: pos.y, left: pos.x, cursor: dragging.current ? "grabbing" : "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* ── Pill ────────────────────────────────── */}
      <button
        onClick={toggle}
        className="relative flex items-center gap-2.5 px-3.5 py-2 rounded-full transition-all duration-500 hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: `hsla(25, 10%, 12%, 0.45)`,
          backdropFilter: "blur(40px) saturate(1.4)",
          WebkitBackdropFilter: "blur(40px) saturate(1.4)",
          border: `1px solid hsla(${glowHue}, 20%, 80%, ${borderLuminance})`,
          boxShadow: [
            `0 0 ${20 + meanH * 20}px -4px hsla(${glowHue}, 40%, 55%, ${glowIntensity})`,
            `inset 0 1px 0 hsla(38, 25%, 90%, 0.06)`,
            `0 4px 16px -4px hsla(25, 10%, 0%, 0.2)`,
          ].join(", "),
          fontFamily: KP.font,
          cursor: "pointer",
          transition: "box-shadow 1.5s ease, border-color 1.5s ease, background 0.5s ease",
        }}
        aria-label="Kernel heartbeat"
      >
        {/* Breathing glow underlay — reacts to kernel coherence */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, hsla(${glowHue}, 40%, 55%, ${glowIntensity * 0.5}) 0%, transparent 70%)`,
            animation: `ring-breathe ${pulseRate * 2}ms ease-in-out infinite`,
            transition: "background 2s ease",
          }}
        />

        {/* Pulsing dot — glow driven by kernel coherence */}
        <span className="relative flex h-2.5 w-2.5">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: dotColor, opacity: 0.5 }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: pulseRate / 1000, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-[-2px] rounded-full"
            style={{ background: "transparent", boxShadow: `0 0 8px 2px ${dotColor}` }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: pulseRate / 1000, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="relative inline-flex rounded-full h-2.5 w-2.5"
            style={{ background: dotColor }}
          />
        </span>

        {/* Living glyph — proves continuous self-verification */}
        <motion.span
          key={glyphIdx}
          initial={{ opacity: 0.2, scale: 0.85 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="text-[11px]"
          style={{ color: `hsla(${glowHue}, 20%, 70%, 0.6)`, fontFamily: "monospace" }}
        >
          {livingGlyph}
        </motion.span>

        {/* Triword address */}
        <span
          className="text-[11px] font-medium"
          style={{ color: KP.gold, fontFamily: KP.serif, letterSpacing: "0.03em" }}
        >
          {triword || "----.----.----"}
        </span>

        {/* POST count */}
        <span
          className="text-[10px] font-semibold"
          style={{ color: alive ? KP.green : KP.red, opacity: 0.85 }}
        >
          {passed}/{total}
        </span>

        {/* Boot time */}
        <span
          className="text-[9px] tabular-nums"
          style={{ color: KP.dim, opacity: 0.7 }}
        >
          {genesis.post.durationMs.toFixed(0)}ms
        </span>
      </button>

      {/* ── Expanded flyout ─────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-12 left-0 w-72 rounded-2xl p-4"
            style={{
              background: "hsla(25, 10%, 10%, 0.55)",
              backdropFilter: "blur(48px) saturate(1.5)",
              WebkitBackdropFilter: "blur(48px) saturate(1.5)",
              border: `1px solid hsla(${glowHue}, 20%, 80%, ${borderLuminance})`,
              boxShadow: [
                `0 16px 48px -12px hsla(25, 10%, 0%, 0.3)`,
                `0 0 ${30 + meanH * 30}px -8px hsla(${glowHue}, 40%, 55%, ${glowIntensity * 0.7})`,
                `inset 0 1px 0 hsla(38, 25%, 90%, 0.08)`,
              ].join(", "),
              fontFamily: KP.font,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: KP.gold, fontFamily: KP.serif }}
              >
                Genesis Kernel
              </span>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: alive
                    ? `hsla(152, 44%, 50%, 0.12)`
                    : "hsla(0, 55%, 55%, 0.12)",
                  color: alive ? KP.green : KP.red,
                  border: `1px solid ${alive ? "hsla(152, 44%, 50%, 0.2)" : "hsla(0, 55%, 55%, 0.2)"}`,
                }}
              >
                {alive ? "ALIVE" : "DEAD"}
              </span>
            </div>

            {/* Kernel metrics */}
            <div className="flex items-center gap-3 mb-3 py-2 px-2.5 rounded-xl"
              style={{ background: `hsla(${glowHue}, 15%, 50%, 0.06)` }}
            >
              <div className="flex flex-col items-center">
                <span className="text-[16px] font-light tabular-nums" style={{ color: KP.gold, fontFamily: "'Playfair Display', serif" }}>
                  {(meanH * 100).toFixed(0)}
                </span>
                <span className="text-[8px] uppercase tracking-widest" style={{ color: KP.dim }}>H-Score</span>
              </div>
              <div className="w-px h-6" style={{ background: `hsla(38, 20%, 80%, 0.1)` }} />
              <div className="flex flex-col items-center">
                <span className="text-[16px] font-light tabular-nums" style={{ color: KP.muted, fontFamily: "'Playfair Display', serif" }}>
                  {kernelTick}
                </span>
                <span className="text-[8px] uppercase tracking-widest" style={{ color: KP.dim }}>Tick</span>
              </div>
              <div className="w-px h-6" style={{ background: `hsla(38, 20%, 80%, 0.1)` }} />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-medium uppercase tracking-wider"
                  style={{
                    color: zone === "convergent" ? KP.green
                      : zone === "exploring" ? KP.gold
                      : KP.red
                  }}
                >
                  {zone}
                </span>
                <span className="text-[8px] uppercase tracking-widest" style={{ color: KP.dim }}>Zone</span>
              </div>
            </div>

            {/* Triword address with copy + reveal */}
            {triword && (
              <div className="mb-3">
                <TriwordAddress
                  canonicalId={genesis.genesisCid.string}
                  glyph={genesis.genesisGlyph}
                  label="Address"
                  size="sm"
                  color={KP.gold}
                  mutedColor={KP.dim}
                  variant="hologram"
                />
              </div>
            )}

            {/* Living Glyph + IRI */}
            <div className="mb-3 flex items-center gap-2">
              <motion.span
                key={glyphIdx}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.35 }}
                className="text-[14px] tracking-widest"
                style={{ color: `hsla(${glowHue}, 20%, 70%, 0.5)` }}
              >
                {livingGlyph}
              </motion.span>
              <span
                className="text-[8px] break-all flex-1"
                style={{ color: KP.dim, fontFamily: "monospace", opacity: 0.7 }}
              >
                {genesis.genesisIri || "—"}
              </span>
            </div>

            {/* POST checks */}
            <div className="space-y-1">
              <span className="text-[9px] block mb-1.5 uppercase tracking-widest" style={{ color: KP.dim }}>
                POST Sequence
              </span>
              {genesis.post.checks.map((check) => (
                <div key={check.name} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px]"
                    style={{
                      background: check.passed ? "hsla(152, 44%, 50%, 0.1)" : "hsla(0, 55%, 55%, 0.1)",
                      color: check.passed ? KP.green : KP.red,
                    }}
                  >
                    {check.passed ? "✓" : "✗"}
                  </span>
                  <span className="text-[9px]" style={{ color: KP.muted, fontFamily: "monospace" }}>
                    {check.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Pulse count + boot time */}
            <div
              className="mt-3 pt-2 text-[8px] flex justify-between items-center"
              style={{ borderTop: `1px solid hsla(38, 20%, 80%, 0.06)`, color: KP.dim }}
            >
              <span className="flex items-center gap-1.5">
                <motion.span
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ background: dotColor }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: pulseRate / 1000, repeat: Infinity }}
                />
                pulse #{tick}
              </span>
              <span className="tabular-nums">{genesis.post.durationMs.toFixed(1)}ms boot</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
