import { useState, useCallback } from "react";
import { getRecentDerivations } from "@/modules/verify";
import type { AuditDerivation } from "@/modules/verify";
import { AuditField } from "./AuditField";

const DerivationPanel = () => {
  const [derivations, setDerivations] = useState<AuditDerivation[]>([]);
  const [selected, setSelected] = useState<AuditDerivation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getRecentDerivations(50, sourceFilter || undefined);
      setDerivations(d);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [sourceFilter]);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-display font-semibold">Derivation Log</h2>
        <div className="flex gap-2">
          <input
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            placeholder="Filter by source…"
            className="px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
          />
          <button onClick={load} disabled={loading} className="btn-outline text-sm disabled:opacity-50">
            {loading ? "Loading…" : "Load Derivations"}
          </button>
        </div>
      </div>

      {derivations.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">Click "Load Derivations" to view the canonical derivation log across all modules.</p>
      )}

      {derivations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Grade</th>
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Source</th>
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Original Term</th>
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Timestamp</th>
                <th className="py-2 text-muted-foreground font-medium text-xs">Details</th>
              </tr>
            </thead>
            <tbody>
              {derivations.map((d, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(d)}>
                  <td className="py-2 pr-3">
                    <span className={`text-xs font-mono font-bold ${
                      d.epistemicGrade === "A" ? "text-green-400" :
                      d.epistemicGrade === "B" ? "text-blue-400" :
                      d.epistemicGrade === "C" ? "text-yellow-400" : "text-muted-foreground"
                    }`}>
                      {d.epistemicGrade}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                    {(d.metrics as Record<string, string>).source ?? "—"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs truncate max-w-[200px]">{d.originalTerm}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-xs text-primary cursor-pointer">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-semibold">Derivation Detail</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-4 ${
              selected.epistemicGrade <= "B" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            }`}>
              GRADE {selected.epistemicGrade}
            </div>
            <div className="space-y-3 text-sm">
              <AuditField label="Derivation ID" value={selected.derivationId} />
              <AuditField label="Original Term" value={selected.originalTerm} />
              <AuditField label="Canonical Term" value={selected.canonicalTerm} />
              <AuditField label="Result IRI" value={selected.resultIri} />
              <AuditField label="Quantum" value={String(selected.quantum)} />
              <AuditField label="Timestamp" value={new Date(selected.createdAt).toLocaleString()} />
              <AuditField label="Metrics" value={JSON.stringify(selected.metrics, null, 2)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DerivationPanel;
