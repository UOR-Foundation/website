import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { systemIntegrityCheck, getRecentReceipts, exportAuditTrail } from "@/modules/self-verify";
import type { IntegrityReport } from "@/modules/self-verify";
import type { DerivationReceipt } from "@/modules/derivation/receipt";

const AuditPage = () => {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [receipts, setReceipts] = useState<DerivationReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<DerivationReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [filterModule, setFilterModule] = useState("");
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await systemIntegrityCheck();
      setReport(r);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  const loadReceipts = useCallback(async () => {
    setReceiptLoading(true);
    try {
      const r = await getRecentReceipts(50);
      setReceipts(r);
    } catch { /* non-fatal */ }
    finally { setReceiptLoading(false); }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const trail = await exportAuditTrail(start, now.toISOString());
      const blob = new Blob([JSON.stringify(trail, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `uor-audit-trail-${now.toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* non-fatal */ }
  }, []);

  const filteredReceipts = filterModule
    ? receipts.filter((r) => r.moduleId.toLowerCase().includes(filterModule.toLowerCase()))
    : receipts;

  return (
    <Layout>
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            System Audit
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Self-verification dashboard — every operation in the system produces a canonical
            receipt that proves its own correctness. The system is its own auditor.
          </p>

          {/* Integrity Check */}
          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">System Integrity</h2>
              <button onClick={runCheck} disabled={loading} className="btn-primary text-sm disabled:opacity-50">
                {loading ? "Checking…" : "Run Integrity Check"}
              </button>
            </div>

            {error && <p className="text-sm text-destructive font-mono mb-3">{error}</p>}

            {report && (
              <div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold mb-4 ${
                  report.allPassed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {report.allPassed ? "✓ ALL CHECKS PASSED" : "✗ SOME CHECKS FAILED"}
                  <span className="text-muted-foreground font-normal ml-2">{report.totalDurationMs}ms</span>
                </div>

                <div className="space-y-2">
                  {report.checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded border border-border bg-muted/20">
                      <span className={`mt-0.5 text-sm ${check.passed ? "text-green-400" : "text-red-400"}`}>
                        {check.passed ? "✓" : "✗"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{check.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{check.module}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{check.durationMs}ms</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!report && !loading && (
              <p className="text-sm text-muted-foreground">Click "Run Integrity Check" to verify system coherence across all modules.</p>
            )}
          </div>

          {/* Receipt Log */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-display font-semibold">Receipt Log</h2>
              <div className="flex gap-2">
                <input
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  placeholder="Filter by module…"
                  className="px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
                />
                <button onClick={loadReceipts} disabled={receiptLoading} className="btn-outline text-sm disabled:opacity-50">
                  {receiptLoading ? "Loading…" : "Load Receipts"}
                </button>
                <button onClick={handleExport} className="btn-outline text-sm">Export JSON</button>
              </div>
            </div>

            {receipts.length === 0 && !receiptLoading && (
              <p className="text-sm text-muted-foreground">Click "Load Receipts" to view the canonical receipt log.</p>
            )}

            {filteredReceipts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Status</th>
                      <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Module</th>
                      <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Operation</th>
                      <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Timestamp</th>
                      <th className="py-2 text-muted-foreground font-medium text-xs">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedReceipt(r)}>
                        <td className="py-2 pr-3">
                          <span className={`text-xs font-mono ${r.selfVerified ? "text-green-400" : "text-red-400"}`}>
                            {r.selfVerified ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.moduleId}</td>
                        <td className="py-2 pr-3 font-mono text-xs truncate max-w-[200px]">{r.operation}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 text-xs text-primary cursor-pointer">View</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Receipt Detail Modal */}
          {selectedReceipt && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReceipt(null)}>
              <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-display font-semibold">Receipt Detail</h3>
                  <button onClick={() => setSelectedReceipt(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-4 ${
                  selectedReceipt.selfVerified ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {selectedReceipt.selfVerified ? "✓ SELF-VERIFIED" : "✗ VERIFICATION FAILED"}
                </div>
                <div className="space-y-3 text-sm">
                  <Field label="Receipt ID" value={selectedReceipt.receiptId} />
                  <Field label="Module" value={selectedReceipt.moduleId} />
                  <Field label="Operation" value={selectedReceipt.operation} />
                  <Field label="Input Hash" value={selectedReceipt.inputHash} />
                  <Field label="Output Hash" value={selectedReceipt.outputHash} />
                  <Field label="Recompute Hash" value={selectedReceipt.recomputeHash || "(stored receipts omit recompute)"} />
                  <Field label="Coherence" value={selectedReceipt.coherenceVerified ? "✓ Ring coherent" : "✗ Not verified"} />
                  <Field label="Timestamp" value={new Date(selectedReceipt.timestamp).toLocaleString()} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-mono text-xs text-foreground break-all">{value}</p>
    </div>
  );
}

export default AuditPage;
