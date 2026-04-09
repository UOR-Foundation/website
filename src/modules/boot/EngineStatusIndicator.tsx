/**
 * EngineStatusIndicator — Fixed seal status indicator.
 *
 * Shows a dot indicating system integrity:
 *   Green  = Sealed (nominal)
 *   Amber  = Degraded (TS fallback or partial modules)
 *   Red    = Unsealed / Broken
 *
 * Click opens a diagnostic panel with seal details.
 *
 * @module boot/EngineStatusIndicator
 */

import { useState, useMemo } from "react";
import { useBootStatus } from "./useBootStatus";
import type { SealStatus } from "./types";
import { motion, AnimatePresence } from "framer-motion";

interface EngineStatusIndicatorProps {
  isLight?: boolean;
}

const STATUS_CONFIG: Record<
  SealStatus | "booting" | "failed",
  { color: string; label: string; pulse: boolean }
> = {
  sealed: { color: "#22c55e", label: "Sealed", pulse: false },
  degraded: { color: "#f59e0b", label: "Degraded", pulse: true },
  unsealed: { color: "#ef4444", label: "Unsealed", pulse: true },
  broken: { color: "#ef4444", label: "BROKEN", pulse: true },
  booting: { color: "#6b7280", label: "Booting", pulse: true },
  failed: { color: "#ef4444", label: "Failed", pulse: true },
};

export default function EngineStatusIndicator({ isLight = false }: EngineStatusIndicatorProps) {
  const { receipt, status, lastVerified } = useBootStatus();
  const [open, setOpen] = useState(false);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.booting;

  const truncatedId = useMemo(() => {
    if (!receipt?.seal.derivationId) return "…";
    const hex = receipt.seal.derivationId.replace("urn:uor:derivation:sha256:", "");
    return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
  }, [receipt]);

  const provenanceLabel = useMemo(() => {
    if (!receipt) return null;
    const ctx = receipt.provenance.context;
    if (ctx === "local") return "Running locally on this device";
    if (ctx === "remote") return `Projected from: ${receipt.provenance.hostname}`;
    return `Hybrid: ${receipt.provenance.hostname}`;
  }, [receipt]);

  return (
    <div className="relative">
      {/* Status dot */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-150
          ${isLight
            ? "bg-black/[0.08] hover:bg-black/[0.12] border border-black/[0.08]"
            : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08]"
          }
        `}
        title={`System: ${config.label}`}
      >
        <div className="relative">
          <div
            className="w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {config.pulse && (
            <div
              className="absolute inset-0 w-[7px] h-[7px] rounded-full animate-ping"
              style={{ backgroundColor: config.color, opacity: 0.4 }}
            />
          )}
        </div>
      </button>

      {/* Diagnostic panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-8 z-[9000] w-64 rounded-lg border p-3 text-[10px] leading-relaxed font-mono
              ${isLight
                ? "bg-white/95 border-black/10 text-black/70 shadow-lg"
                : "bg-black/90 border-white/10 text-white/70 shadow-2xl"
              }
            `}
            style={{ backdropFilter: "blur(24px)" }}
          >
            {/* Status header */}
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <span className={`font-semibold text-[11px] ${isLight ? "text-black/80" : "text-white/80"}`}>
                {config.label}
              </span>
            </div>

            {receipt ? (
              <div className="space-y-1.5">
                {/* Seal ID + Glyph */}
                <Row label="Seal" value={`${truncatedId}  ${receipt.seal.glyph}`} />

                {/* Device provenance — always visible, not dismissible */}
                <div className={`px-1.5 py-1 rounded text-[9px] ${
                  receipt.provenance.context === "local"
                    ? (isLight ? "bg-green-50 text-green-700" : "bg-green-900/30 text-green-400")
                    : (isLight ? "bg-amber-50 text-amber-700" : "bg-amber-900/30 text-amber-400")
                }`}>
                  {provenanceLabel}
                  <div className="opacity-60 mt-0.5">Self-reported device context</div>
                </div>

                <Row label="Engine" value={receipt.engineType} />
                <Row label="Modules" value={String(receipt.moduleCount)} />
                <Row label="Boot" value={`${receipt.bootTimeMs}ms`} />
                <Row label="Cores" value={String(receipt.provenance.hardware.cores)} />
                {lastVerified && (
                  <Row
                    label="Verified"
                    value={new Date(lastVerified).toLocaleTimeString()}
                  />
                )}
                <div className={`mt-1.5 pt-1.5 border-t text-[8px] opacity-40 ${
                  isLight ? "border-black/5" : "border-white/5"
                }`}>
                  Lattice-hash sealed · 128-bit preimage resistance
                </div>
              </div>
            ) : (
              <div className="opacity-50">Initializing…</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-50">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
