import { useState, useCallback } from "react";
import {
  Activity, ArrowRight, Cpu, Layers, Play,
} from "lucide-react";
import { Q0, Q1, UORRing } from "@/modules/ring-core/ring";
import { computeStateFrame, persistStateFrame } from "@/modules/state/state";
import type { StateFrame, StateTransition } from "@/modules/state/state";
import { withVerifiedReceipt } from "@/modules/self-verify";
import { EpistemicBadge } from "@/modules/epistemic";

const SessionsPage = () => {
  const [value, setValue] = useState("42");
  const [quantum, setQuantum] = useState(0);
  const [frame, setFrame] = useState<StateFrame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<boolean | null>(null);

  const getRing = (q: number) => q === 0 ? Q0() : q === 1 ? Q1() : new UORRing(q);

  const handleCompute = useCallback(async () => {
    setLoading(true); setError(null); setReceiptStatus(null);
    try {
      const x = parseInt(value);
      const ring = getRing(quantum);
      const m = Number(ring.cycle);
      if (isNaN(x) || x < 0 || x >= m) {
        setError(`Value must be 0–${m - 1}`);
        setLoading(false);
        return;
      }

      const { result, receipt } = await withVerifiedReceipt(
        "state",
        `computeStateFrame(${x})`,
        () => computeStateFrame(ring, x),
        () => ({ value: x, quantum }),
        ring.coherenceVerified
      );

      setFrame(result);
      setReceiptStatus(receipt.selfVerified);

      try { await persistStateFrame(result); } catch { /* non-fatal */ }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [value, quantum]);

  const handleTransition = (t: StateTransition) => {
    setValue(String(t["state:toState"]));
    setTimeout(() => {
      const ring = getRing(quantum);
      const f = computeStateFrame(ring, t["state:toState"]);
      setFrame(f);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            MODULE 14 — STATE LIFECYCLE
          </p>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            State Explorer
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Compute state:Frame objects — evaluation contexts with bindings, entry/exit conditions,
            and all possible transitions. Every frame is self-verified via canonical receipt.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Value</label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border border-border bg-muted/20 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Quantum</label>
              <div className="flex gap-1">
                {[0, 1, 2].map((q) => (
                  <button key={q} onClick={() => setQuantum(q)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${
                      quantum === q
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    Q{q} ({q === 0 ? "8" : q === 1 ? "16" : "24"}-bit)
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={handleCompute} disabled={loading}
                className="btn-primary flex items-center gap-2 !py-2 disabled:opacity-50">
                <Play size={14} />
                {loading ? "Computing…" : "Compute Frame"}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive mt-2 font-mono">{error}</p>}
        </div>

        {/* Frame result */}
        {frame && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-semibold flex items-center gap-2">
                  <Cpu size={14} className="text-primary" /> State Frame
                </h2>
                <div className="flex items-center gap-2">
                  <EpistemicBadge grade="A" size="sm" />
                  {receiptStatus !== null && (
                    <span className={`text-[10px] font-mono ${receiptStatus ? "text-green-400" : "text-red-400"}`}>
                      Receipt: {receiptStatus ? "✓ Self-verified" : "✗ Failed"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <MiniCard label="Value" value={String(frame.summary.value)} />
                <MiniCard label="Component" value={frame.summary.component.replace("partition:", "")} />
                <MiniCard label="Stable Entry" value={frame.summary.stable_entry ? "Yes" : "No"} />
                <MiniCard label="Critical Identity" value={frame.summary.critical_identity_holds ? "✓ Holds" : "✗ Fails"} />
              </div>

              {/* Binding */}
              <div className="rounded-lg border border-border/50 p-3 mb-3">
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-2">state:Binding</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Quantum:</span> <span className="font-mono text-foreground">{frame["state:binding"]["state:quantum"]}</span></div>
                  <div><span className="text-muted-foreground">Ring Modulus:</span> <span className="font-mono text-foreground">{frame["state:binding"]["state:ringModulus"]}</span></div>
                  <div><span className="text-muted-foreground">Irreducible:</span> <span className="font-mono text-foreground">{frame["state:binding"]["state:isIrreducible"] ? "Yes" : "No"}</span></div>
                  <div><span className="text-muted-foreground">Reason:</span> <span className="font-mono text-foreground truncate">{frame["state:binding"]["state:componentReason"]}</span></div>
                </div>
              </div>

              {/* Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg border border-border/50 p-3">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">Entry Condition</h3>
                  <p className={`text-xs font-mono ${frame["state:entryCondition"]["state:isStableEntry"] ? "text-green-400" : "text-muted-foreground"}`}>
                    {frame["state:entryCondition"]["state:isStableEntry"] ? "✓ Stable Entry" : "○ Not Stable Entry"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{frame["state:entryCondition"]["state:reason"]}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-3">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">Exit Condition</h3>
                  <p className={`text-xs font-mono ${frame["state:exitCondition"]["state:isPhaseBoundary"] ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {frame["state:exitCondition"]["state:isPhaseBoundary"] ? "⚠ Phase Boundary" : "○ Interior"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{frame["state:exitCondition"]["state:reason"]}</p>
                </div>
              </div>
            </div>

            {/* Transitions */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
                <Activity size={14} className="text-primary" /> Transitions ({frame["state:transitionCount"]})
              </h2>
              <div className="space-y-2">
                {frame["state:transitions"].map((t, i) => (
                  <button key={i} onClick={() => handleTransition(t)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
                    <span className="text-xs font-mono text-primary w-16 shrink-0">
                      {t["state:operation"].replace("op:", "")}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {t["state:fromState"]}
                    </span>
                    <ArrowRight size={12} className="text-muted-foreground" />
                    <span className="text-xs font-mono text-foreground font-semibold">
                      {t["state:toState"]}
                    </span>
                    <span className={`text-[10px] font-mono ml-auto ${t["state:componentChanged"] ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {t["state:toComponent"].replace("partition:", "")}
                      {t["state:componentChanged"] && " ⚡"}
                    </span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </button>
                ))}
              </div>
            </div>

            {/* Reachable components */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
                <Layers size={14} className="text-primary" /> Reachable Components
              </h2>
              <div className="flex gap-2 flex-wrap">
                {frame["state:reachableComponents"].map((c) => (
                  <span key={c} className="px-3 py-1.5 rounded-lg border border-border bg-muted/20 text-xs font-mono text-foreground">
                    {c.replace("partition:", "")}
                  </span>
                ))}
              </div>
            </div>

            {/* JSON-LD */}
            <details className="rounded-xl border border-border bg-card">
              <summary className="px-5 py-3 text-sm font-display font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                Raw JSON-LD
              </summary>
              <pre className="px-5 pb-4 text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-80">
                {JSON.stringify(frame, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-mono font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  );
}

export default SessionsPage;
