import { useState, useCallback, useEffect } from "react";
import { ShieldCheck, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  getAllModules,
  verifyAllModules,
  isRegistryInitialized,
  onRegistryInitialized,
} from "@/lib/uor-registry";

interface VerificationResult {
  name: string;
  cid: string;
  uorGlyph: string;
  verified: boolean;
}

/**
 * Unobtrusive verification badge rendered in the footer.
 * When clicked, runs full verification on all registered modules
 * and displays CID, UOR address, and pass/fail status.
 */
const UorVerification = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [ready, setReady] = useState(isRegistryInitialized());

  useEffect(() => {
    return onRegistryInitialized(() => setReady(true));
  }, []);

  const runVerification = useCallback(async () => {
    if (!isRegistryInitialized()) return;
    setLoading(true);

    const verifiedMap = await verifyAllModules();
    const modules = getAllModules();
    const output: VerificationResult[] = [];

    for (const [name, mod] of modules) {
      output.push({
        name,
        cid: mod.identity.cid,
        uorGlyph: mod.identity.uorAddress["u:glyph"].slice(0, 12) + "…",
        verified: verifiedMap.get(name) ?? false,
      });
    }

    setResults(output);
    setLoading(false);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    runVerification();
  };

  if (!ready) return null;

  return (
    <>
      {/* Badge trigger */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-body font-medium border border-section-dark-foreground/10 text-section-dark-foreground/40 hover:text-section-dark-foreground/70 hover:border-section-dark-foreground/25 transition-colors duration-200 cursor-pointer"
        title="Verify UOR module integrity"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        UOR Verified
      </button>

      {/* Verification panel */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-bold">
                  UOR Module Verification
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground font-body">
                    Computing verification hashes…
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r) => (
                    <div
                      key={r.name}
                      className="p-4 rounded-xl border border-border bg-muted/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-body font-semibold text-sm text-foreground">
                          {r.name}
                        </span>
                        {r.verified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-body font-medium text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-body font-medium text-destructive">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
                          <span className="text-muted-foreground/50">CID:</span>{" "}
                          {r.cid}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          <span className="text-muted-foreground/50">UOR:</span>{" "}
                          {r.uorGlyph}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <p className="text-[11px] font-body text-muted-foreground/50 text-center">
                Each module's CID is derived from its canonical JSON-LD manifest
                via SHA-256 / CIDv1 / dag-json. UOR addresses use Braille
                bijection encoding.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UorVerification;
