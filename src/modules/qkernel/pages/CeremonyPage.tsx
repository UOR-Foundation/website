/**
 * Founding Ceremony Page — /ceremony
 * ═══════════════════════════════════
 *
 * The ceremonial entry point to sovereign identity.
 * A meditative, animated experience where the user witnesses
 * their identity crystallize from mathematical primitives.
 *
 * Flow:
 *   1. Auth gate (must be logged in)
 *   2. "Begin Ceremony" — contemplative countdown
 *   3. Genesis execution with live status updates
 *   4. Three-word name reveal (dramatic)
 *   5. Identity card display
 *   6. Founding receipt + redirect to /your-space
 *
 * @module qkernel/pages/CeremonyPage
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint, Shield, Sparkles, Check, ArrowRight,
  Loader2, AlertCircle, Lock, Cpu, Globe, Hash,
} from "lucide-react";
import { useSovereignty } from "../hooks/useSovereignty";
import type { GenesisResult } from "../q-sovereignty";

// ── Ceremony Phases ─────────────────────────────────────────────────

type CeremonyPhase =
  | "waiting"         // waiting for user to begin
  | "ecc-check"       // verifying kernel integrity
  | "keypair"         // generating post-quantum keypair
  | "identity"        // deriving canonical identity
  | "collapse-guard"  // observer-collapse verification
  | "three-word"      // deriving three-word name
  | "mounting"        // mounting to kernel filesystem
  | "registering"     // Ring 0 process registration
  | "complete"        // done — showing results
  | "error";          // something failed

const PHASE_LABELS: Record<CeremonyPhase, string> = {
  waiting: "Ready to begin",
  "ecc-check": "Verifying kernel integrity…",
  keypair: "Generating post-quantum keypair…",
  identity: "Deriving canonical identity…",
  "collapse-guard": "Observer-collapse verification…",
  "three-word": "Crystallizing three-word name…",
  mounting: "Mounting identity to kernel…",
  registering: "Ring 0 process registration…",
  complete: "Identity crystallized",
  error: "Ceremony interrupted",
};

const PHASE_ICONS: Record<CeremonyPhase, React.ElementType> = {
  waiting: Fingerprint,
  "ecc-check": Cpu,
  keypair: Lock,
  identity: Hash,
  "collapse-guard": Shield,
  "three-word": Sparkles,
  mounting: Globe,
  registering: Shield,
  complete: Check,
  error: AlertCircle,
};

const PHASE_SEQUENCE: CeremonyPhase[] = [
  "ecc-check", "keypair", "identity", "collapse-guard",
  "three-word", "mounting", "registering",
];

// ── Component ───────────────────────────────────────────────────────

export default function CeremonyPage() {
  const navigate = useNavigate();
  const {
    authUser, isLoading, needsCeremony, error: sovereigntyError,
    runGenesis, persistGenesis, isCeremonyActive,
  } = useSovereignty();

  const [phase, setPhase] = useState<CeremonyPhase>("waiting");
  const [completedPhases, setCompletedPhases] = useState<CeremonyPhase[]>([]);
  const [genesisResult, setGenesisResult] = useState<GenesisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !authUser) {
      navigate("/claim-identity");
    }
  }, [isLoading, authUser, navigate]);

  // Redirect if already has identity
  useEffect(() => {
    if (!isLoading && authUser && !needsCeremony) {
      navigate("/your-space");
    }
  }, [isLoading, authUser, needsCeremony, navigate]);

  // ── Animated Phase Progression ──────────────────────────────────
  const simulatePhases = useCallback(async () => {
    for (const p of PHASE_SEQUENCE) {
      setPhase(p);
      // Variable timing — some steps feel faster, some more contemplative
      const delay = p === "collapse-guard" ? 1800
        : p === "three-word" ? 2200
        : p === "keypair" ? 1500
        : 900;
      await new Promise(r => setTimeout(r, delay));
      setCompletedPhases(prev => [...prev, p]);
    }
  }, []);

  // ── Begin Ceremony ──────────────────────────────────────────────
  const handleBegin = useCallback(async () => {
    setErrorMessage(null);

    // Run phase animation and genesis in parallel
    const [, result] = await Promise.all([
      simulatePhases(),
      runGenesis(),
    ]);

    if (result) {
      setGenesisResult(result);
      setPhase("complete");

      // Persist to profile
      await persistGenesis(result);
    } else {
      setPhase("error");
      setErrorMessage(sovereigntyError ?? "Genesis ceremony failed");
    }
  }, [simulatePhases, runGenesis, persistGenesis, sovereigntyError]);

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  const PhaseIcon = PHASE_ICONS[phase];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <AnimatePresence mode="wait">
          {/* ── Waiting Phase ──────────────────────────────────── */}
          {phase === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Fingerprint className="w-10 h-10 text-primary" />
              </motion.div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  Founding Ceremony
                </h1>
                <p className="text-muted-foreground text-lg max-w-md">
                  Your sovereign identity is about to crystallize from pure mathematics.
                  This process is irreversible and quantum-resistant.
                </p>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground w-full max-w-sm">
                {[
                  "Post-quantum Dilithium-3 keypair generation",
                  "Observer-collapse anti-interception guard",
                  "Three-word canonical name derivation",
                  "Ring 0 kernel process registration",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleBegin}
                disabled={isCeremonyActive}
                className="mt-4 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-lg
                           hover:bg-primary/90 transition-colors disabled:opacity-50
                           flex items-center gap-2"
              >
                Begin Ceremony
                <Sparkles className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* ── Active Phases ──────────────────────────────────── */}
          {phase !== "waiting" && phase !== "complete" && phase !== "error" && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              {/* Spinning ring */}
              <div className="relative w-24 h-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <PhaseIcon className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div>
                <p className="text-lg font-medium text-foreground">
                  {PHASE_LABELS[phase]}
                </p>
              </div>

              {/* Phase checklist */}
              <div className="space-y-2 w-full max-w-xs text-left">
                {PHASE_SEQUENCE.map((p) => {
                  const completed = completedPhases.includes(p);
                  const current = phase === p;
                  const Icon = PHASE_ICONS[p];
                  return (
                    <motion.div
                      key={p}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 py-1.5 text-sm transition-colors ${
                        completed ? "text-primary" : current ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {completed ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : current ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4 opacity-30" />
                      )}
                      <span>{PHASE_LABELS[p]}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Complete Phase ─────────────────────────────────── */}
          {phase === "complete" && genesisResult && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center text-center space-y-8"
            >
              {/* Success ring */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-primary" />
              </motion.div>

              {/* Three-word name reveal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <p className="text-sm text-muted-foreground uppercase tracking-widest">
                  You are
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-primary">
                  {genesisResult.sovereign.threeWordName.display}
                </h1>
              </motion.div>

              {/* Identity card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-widest">
                  <span>Sovereign Identity</span>
                  <span className="text-primary flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Quantum-Resistant
                  </span>
                </div>

                <div className="space-y-3 text-left">
                  <IdentityRow
                    label="Glyph"
                    value={genesisResult.sovereign.identity["u:glyph"]}
                    mono
                  />
                  <IdentityRow
                    label="CID"
                    value={genesisResult.sovereign.identity["u:cid"]}
                    truncate
                    mono
                  />
                  <IdentityRow
                    label="IPv6"
                    value={genesisResult.sovereign.identity["u:ipv6"]}
                    truncate
                    mono
                  />
                  <IdentityRow
                    label="Ceremony"
                    value={genesisResult.sovereign.ceremonyCid}
                    truncate
                    mono
                  />
                  <IdentityRow
                    label="Collapse"
                    value={genesisResult.sovereign.collapseIntact ? "Intact ✓" : "COMPROMISED ✗"}
                  />
                </div>
              </motion.div>

              {/* Continue button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                onClick={() => navigate("/your-space?welcome=1")}
                className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-lg
                           hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Enter Your Space
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* ── Error Phase ────────────────────────────────────── */}
          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold">Ceremony Interrupted</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {errorMessage ?? "An unexpected error occurred during the founding ceremony."}
                </p>
              </div>

              <button
                onClick={() => {
                  setPhase("waiting");
                  setCompletedPhases([]);
                  setErrorMessage(null);
                }}
                className="px-6 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm
                           hover:bg-muted/80 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function IdentityRow({
  label,
  value,
  truncate = false,
  mono = false,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span
        className={`text-sm text-foreground text-right ${mono ? "font-mono" : ""} ${
          truncate ? "truncate max-w-[200px]" : ""
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
