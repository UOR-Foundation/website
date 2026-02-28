import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { bootGenesis, type GenesisState } from "@/hologram/genesis/genesis";
import { buildArtifact, toBlob } from "@/hologram/genesis/artifact";
import type { PostCheck } from "@/hologram/genesis/axiom-post";
import { canonicalToTriword } from "@/lib/uor-triword";

// ── Check icon glyphs (no lucide import needed) ──────────
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
  </svg>
);

// ── Check descriptions ───────────────────────────────────
const CHECK_LABELS: Record<string, { title: string; desc: string }> = {
  "ring-coherence": { title: "Ring Coherence", desc: "neg(bnot(x)) ≡ succ(x) for all 256 elements" },
  "hash-kat": { title: "SHA-256 KAT", desc: "NIST known-answer test vector" },
  "cid-roundtrip": { title: "CID Round-Trip", desc: "Content-address → verify → match" },
  "codec-determinism": { title: "Codec Determinism", desc: "Key-order independent serialization" },
  "tau-involution": { title: "τ-Involution", desc: "τ(τ(x)) ≡ x for all 256 elements" },
  "mirror-coherence": { title: "Mirror Coherence", desc: "48 pairs, syndrome 0xFF for all elements" },
  "fano-integrity": { title: "Fano Integrity", desc: "PG(2,2): 7 points, 7 lines" },
};

type BootPhase = "idle" | "running" | "done";

interface VisibleCheck extends PostCheck {
  index: number;
  revealedAt: number;
}

export default function GenesisBootPage() {
  const [phase, setPhase] = useState<BootPhase>("idle");
  const [visibleChecks, setVisibleChecks] = useState<VisibleCheck[]>([]);
  const [genesis, setGenesis] = useState<GenesisState | null>(null);
  const [bootCount, setBootCount] = useState(0);

  const runBoot = useCallback(() => {
    setPhase("running");
    setVisibleChecks([]);
    setGenesis(null);

    // Boot is synchronous but we animate the reveal
    const result = bootGenesis();
    const checks = result.post.checks;

    // Stagger reveal of each check
    checks.forEach((check, i) => {
      setTimeout(() => {
        setVisibleChecks(prev => [
          ...prev,
          { ...check, index: i, revealedAt: performance.now() },
        ]);

        // After last check, reveal genesis state
        if (i === checks.length - 1) {
          setTimeout(() => {
            setGenesis(result);
            setPhase("done");
          }, 300);
        }
      }, 180 * (i + 1));
    });

    setBootCount(c => c + 1);
  }, []);

  // Auto-boot on mount
  useEffect(() => {
    const t = setTimeout(runBoot, 400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-hologram-bg text-hologram-text font-body">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-holo-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-holo-display tracking-tight mb-2">
            Genesis Boot
          </h1>
          <p className="text-hologram-text-muted text-holo-sm">
            Phase 0 — Axiom seed self-verification
          </p>
        </motion.div>
      </div>

      {/* POST Checks */}
      <div className="max-w-2xl mx-auto px-holo-6">
        <div className="rounded-lg border overflow-hidden"
          style={{
            background: "var(--hologram-glass)",
            borderColor: "var(--hologram-glass-border)",
          }}
        >
          {/* Title bar */}
          <div className="px-holo-4 py-holo-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--hologram-glass-border)" }}
          >
            <div className="flex items-center gap-holo-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-holo-xs text-hologram-text-muted ml-2 font-mono">
                POST — Power-On Self-Test
              </span>
            </div>
            {phase === "done" && genesis && (
              <span className="text-holo-xs font-mono text-hologram-gold">
                {genesis.post.durationMs.toFixed(1)}ms
              </span>
            )}
          </div>

          {/* Check list */}
          <div className="divide-y" style={{ borderColor: "var(--hologram-glass-border)" }}>
            {Object.entries(CHECK_LABELS).map(([key, { title, desc }], i) => {
              const revealed = visibleChecks.find(c => c.name === key);
              const isNext = phase === "running" && !revealed && visibleChecks.length === i;

              return (
                <div
                  key={key}
                  className="px-holo-4 py-holo-3 flex items-center gap-holo-3 transition-colors duration-300"
                  style={{
                    opacity: revealed ? 1 : isNext ? 0.6 : 0.25,
                    borderColor: "var(--hologram-glass-border)",
                  }}
                >
                  {/* Status indicator */}
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <AnimatePresence mode="wait">
                      {revealed ? (
                        <motion.span
                          key="result"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className={revealed.passed ? "text-emerald-400" : "text-red-400"}
                        >
                          {revealed.passed ? <CheckIcon /> : <XIcon />}
                        </motion.span>
                      ) : isNext ? (
                        <motion.span
                          key="spinner"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-hologram-gold"
                        >
                          <SpinnerIcon />
                        </motion.span>
                      ) : (
                        <span key="dot" className="w-1.5 h-1.5 rounded-full bg-hologram-text-muted/30" />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <span className="text-holo-sm font-mono block">{title}</span>
                    <span className="text-holo-xs text-hologram-text-muted block truncate">{desc}</span>
                  </div>

                  {/* Check number */}
                  <span className="text-holo-xs text-hologram-text-muted/50 font-mono flex-shrink-0">
                    {i + 1}/7
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Genesis CID Card */}
        <AnimatePresence>
          {phase === "done" && genesis?.alive && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-holo-6 rounded-lg border p-holo-6"
              style={{
                background: "linear-gradient(135deg, hsla(38, 40%, 62%, 0.08), hsla(280, 25%, 42%, 0.06))",
                borderColor: "hsla(38, 40%, 62%, 0.2)",
              }}
            >
              {/* Alive indicator */}
              <div className="flex items-center gap-holo-2 mb-holo-4">
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="text-holo-sm text-emerald-400 font-mono">KERNEL ALIVE</span>
              </div>

              {/* Triword Address */}
              <div className="space-y-holo-3">
                <div>
                  <span className="text-holo-xs text-hologram-text-muted block mb-1">Kernel Address</span>
                  <span className="text-holo-xl font-serif text-hologram-gold tracking-wide">
                    {canonicalToTriword(genesis.genesisCid.string).split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ")}
                  </span>
                </div>

                <div>
                  <span className="text-holo-xs text-hologram-text-muted block mb-1">Genesis CID</span>
                  <code className="text-holo-xs font-mono text-hologram-gold break-all leading-relaxed">
                    {genesis.genesisCid.string}
                  </code>
                </div>

                <div className="grid grid-cols-2 gap-holo-4">
                  <div>
                    <span className="text-holo-xs text-hologram-text-muted block mb-1">Glyph</span>
                    <span className="text-holo-2xl font-mono tracking-widest">
                      {genesis.genesisGlyph}
                    </span>
                  </div>
                  <div>
                    <span className="text-holo-xs text-hologram-text-muted block mb-1">Boot Time</span>
                    <span className="text-holo-lg font-mono text-hologram-gold">
                      {genesis.post.durationMs.toFixed(2)}ms
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-holo-xs text-hologram-text-muted block mb-1">IRI</span>
                  <code className="text-holo-xs font-mono text-hologram-text-muted break-all">
                    {genesis.genesisIri}
                  </code>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reboot button */}
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-holo-6 pb-16 flex justify-center gap-holo-3"
          >
            <button
              onClick={runBoot}
              className="px-holo-6 py-holo-3 rounded-md text-holo-sm font-mono transition-colors border"
              style={{
                borderColor: "var(--hologram-glass-border)",
                background: "var(--hologram-glass)",
              }}
            >
              Re-verify seed crystal ({bootCount})
            </button>
            <button
              onClick={() => {
                const artifact = buildArtifact();
                const blob = toBlob(artifact);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `genesis-${artifact.envelopeCid.slice(0, 12)}.uor`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-holo-6 py-holo-3 rounded-md text-holo-sm font-mono transition-colors border"
              style={{
                borderColor: "hsla(38, 40%, 62%, 0.3)",
                background: "hsla(38, 40%, 62%, 0.1)",
                color: "hsl(38, 40%, 62%)",
              }}
            >
              Export .uor
            </button>
          </motion.div>
        )}
      </div>

      {/* Cross-link */}
      <div className="mt-12 text-center">
        <Link
          to="/artifact"
          className="inline-flex items-center gap-2 font-mono text-sm transition-colors"
          style={{ color: "hsl(38, 40%, 62%)" }}
        >
          <span>→</span> Artifact Inspector
        </Link>
      </div>
    </div>
  );
}
