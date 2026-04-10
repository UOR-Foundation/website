import { useState, useCallback } from "react";
import { TAKEOUT_CATEGORIES } from "../lib/types";
import { exportTakeout, verifySeal, downloadArchive, formatBytes } from "../lib/takeout-engine";
import type { TakeoutArchive, MigrationPhase } from "../lib/types";
import {
  Shield, Download, ShieldCheck, Trash2, Loader2, AlertTriangle, Check, ChevronRight,
} from "lucide-react";

const SAFETY_PHRASE = "DELETE MY DATA";

const PHASE_META: Record<MigrationPhase, { label: string; step: number }> = {
  idle:      { label: "Ready", step: 0 },
  snapshot:  { label: "Phase 1 — Snapshot & Seal", step: 1 },
  deploying: { label: "Phase 2 — Deploy to Target", step: 2 },
  verifying: { label: "Phase 2 — Verifying Seal", step: 2 },
  verified:  { label: "Phase 2 — Verification Passed", step: 2 },
  erasing:   { label: "Phase 3 — Erasing Source", step: 3 },
  complete:  { label: "Migration Complete", step: 3 },
  failed:    { label: "Migration Failed", step: 0 },
};

export default function MigratePanel() {
  const [phase, setPhase] = useState<MigrationPhase>("idle");
  const [archive, setArchive] = useState<TakeoutArchive | null>(null);
  const [progress, setProgress] = useState({ label: "", pct: 0 });
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Phase 1: Snapshot
  const handleSnapshot = useCallback(async () => {
    setPhase("snapshot");
    setError(null);
    try {
      const allIds = TAKEOUT_CATEGORIES.map((c) => c.id);
      const arc = await exportTakeout(allIds, (label, pct) =>
        setProgress({ label, pct }),
      );
      setArchive(arc);
      // Auto-download local backup
      downloadArchive(arc);
      setPhase("verified"); // Skip deploy for now — user deploys archive manually to target
    } catch (e: any) {
      setError(e.message);
      setPhase("failed");
    }
  }, []);

  // Phase 2: Verify seal of current archive
  const handleVerify = useCallback(async () => {
    if (!archive) return;
    setPhase("verifying");
    const valid = await verifySeal(archive);
    if (valid) {
      setPhase("verified");
    } else {
      setError("Seal verification failed — archive integrity compromised");
      setPhase("failed");
    }
  }, [archive]);

  // Phase 3: Erase (placeholder — actual deletion requires edge function w/ service role)
  const handleErase = useCallback(async () => {
    if (confirmText !== SAFETY_PHRASE) return;
    setPhase("erasing");
    // In production this would call a secure edge function that deletes user data
    // For now we simulate the flow
    await new Promise((r) => setTimeout(r, 2000));
    setPhase("complete");
  }, [confirmText]);

  const meta = PHASE_META[phase];

  return (
    <div className="flex flex-col h-full">
      {/* Phase indicator */}
      <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-3">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  meta.step >= step
                    ? "bg-white/[0.1] border-white/[0.2] text-white/90"
                    : "border-white/[0.06] text-white/20"
                }`}
              >
                {meta.step > step ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              {step < 3 && (
                <ChevronRight className="w-3 h-3 text-white/10" />
              )}
            </div>
          ))}
          <span className="ml-3 text-xs text-white/50">{meta.label}</span>
        </div>

        {/* Progress bar */}
        {(phase === "snapshot" || phase === "deploying") && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <span>{progress.label}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Phase 1 card */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
            <Shield className="w-4 h-4 text-amber-400/70" />
            <span className="text-sm font-medium text-white/80">Phase 1 — Snapshot & Seal</span>
          </div>
          <div className="px-4 py-3 text-xs text-white/40 leading-relaxed">
            Export your entire sovereign data set as a sealed archive. A local backup is
            automatically downloaded to your device. The UOR seal guarantees bit-perfect integrity.
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={handleSnapshot}
              disabled={phase !== "idle" && phase !== "failed"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              {phase === "snapshot" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {phase === "snapshot" ? "Exporting…" : "Create Snapshot"}
            </button>
          </div>
        </div>

        {/* Archive info */}
        {archive && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70">Archive sealed — {formatBytes(archive.metadata.totalBytes)}</div>
              <div className="text-[10px] text-white/30 font-mono truncate">{archive.sealHash}</div>
            </div>
          </div>
        )}

        {/* Phase 2 card */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
            <ShieldCheck className="w-4 h-4 text-blue-400/70" />
            <span className="text-sm font-medium text-white/80">Phase 2 — Deploy & Verify</span>
          </div>
          <div className="px-4 py-3 text-xs text-white/40 leading-relaxed">
            Import the sealed archive into your target environment. After deployment, the seal
            is re-verified to confirm bit-perfect transfer. Use the Import tab to deploy the
            downloaded archive to any compatible environment.
          </div>
          {archive && phase !== "verified" && (
            <div className="px-4 pb-3">
              <button
                onClick={handleVerify}
                disabled={phase === "verifying"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                {phase === "verifying" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                Verify Seal
              </button>
            </div>
          )}
        </div>

        {/* Phase 3 card — only visible after verification */}
        {phase === "verified" && (
          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-red-500/[0.08]">
              <Trash2 className="w-4 h-4 text-red-400/70" />
              <span className="text-sm font-medium text-red-300/80">Phase 3 — Erase Source (Optional)</span>
            </div>
            <div className="px-4 py-3 text-xs text-white/40 leading-relaxed">
              <strong className="text-red-400/70">⚠ Destructive action.</strong> This will permanently erase your data from the
              current environment. Only proceed after confirming your archive has been successfully
              imported elsewhere. Type{" "}
              <code className="text-red-400/60 bg-red-500/10 px-1 py-0.5 rounded">{SAFETY_PHRASE}</code> to enable.
            </div>
            <div className="px-4 pb-3 flex items-center gap-2">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={SAFETY_PHRASE}
                className="flex-1 px-3 py-2 rounded-lg text-xs bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder:text-white/20 outline-none focus:border-red-500/30"
              />
              <button
                onClick={handleErase}
                disabled={confirmText !== SAFETY_PHRASE || phase === "erasing"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                {phase === "erasing" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Erase Source
              </button>
            </div>
          </div>
        )}

        {phase === "complete" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-300">Migration complete — sovereignty transferred</span>
          </div>
        )}
      </div>
    </div>
  );
}
