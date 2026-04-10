import { useState, useCallback } from "react";
import { getRecentCertificates } from "@/modules/verify";
import type { AuditCertificate } from "@/modules/verify";
import { AuditField } from "./AuditField";

const CertificatePanel = () => {
  const [certs, setCerts] = useState<AuditCertificate[]>([]);
  const [selected, setSelected] = useState<AuditCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [validOnly, setValidOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getRecentCertificates(50, validOnly);
      setCerts(c);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [validOnly]);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-display font-semibold">Certificate Log</h2>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={validOnly}
              onChange={(e) => setValidOnly(e.target.checked)}
              className="rounded border-border"
            />
            Valid only
          </label>
          <button onClick={load} disabled={loading} className="btn-outline text-sm disabled:opacity-50">
            {loading ? "Loading…" : "Load Certificates"}
          </button>
        </div>
      </div>

      {certs.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">Click "Load Certificates" to view issued UOR certificates.</p>
      )}

      {certs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Status</th>
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Certificate ID</th>
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Certifies</th>
                <th className="py-2 pr-3 text-muted-foreground font-medium text-xs">Issued</th>
                <th className="py-2 text-muted-foreground font-medium text-xs">Details</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(c)}>
                  <td className="py-2 pr-3">
                    <span className={`text-xs font-mono ${c.valid ? "text-green-400" : "text-red-400"}`}>
                      {c.valid ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground truncate max-w-[180px]">{c.certificateId}</td>
                  <td className="py-2 pr-3 font-mono text-xs truncate max-w-[200px]">{c.certifiesIri}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.issuedAt).toLocaleString()}
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
              <h3 className="text-sm font-display font-semibold">Certificate Detail</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-4 ${
              selected.valid ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              {selected.valid ? "✓ VALID" : "✗ INVALID"}
            </div>
            <div className="space-y-3 text-sm">
              <AuditField label="Certificate ID" value={selected.certificateId} />
              <AuditField label="Certifies IRI" value={selected.certifiesIri} />
              <AuditField label="Derivation ID" value={selected.derivationId ?? "(none)"} />
              <AuditField label="Cert Chain" value={JSON.stringify(selected.certChain)} />
              <AuditField label="Issued At" value={new Date(selected.issuedAt).toLocaleString()} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatePanel;
