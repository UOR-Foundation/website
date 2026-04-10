import { useCallback, useState } from "react";
import { readArchiveFile, verifySeal, importTakeout } from "../lib/takeout-engine";
import type { TakeoutArchive } from "../lib/types";
import { TAKEOUT_CATEGORIES } from "../lib/types";
import { Upload, ShieldCheck, ShieldAlert, Loader2, Check, AlertTriangle } from "lucide-react";

export default function ImportPanel() {
  const [archive, setArchive] = useState<TakeoutArchive | null>(null);
  const [sealValid, setSealValid] = useState<boolean | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ label: "", pct: 0 });
  const [result, setResult] = useState<{ success: boolean; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setSealValid(null);
    try {
      const a = await readArchiveFile(file);
      setArchive(a);
      const valid = await verifySeal(a);
      setSealValid(valid);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const handleImport = async () => {
    if (!archive) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await importTakeout(archive, (label, pct) =>
        setProgress({ label, pct }),
      );
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const catKeys = archive ? Object.keys(archive.categories) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Upload zone */}
      <div className="p-5 border-b border-white/[0.06]">
        <label className="flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-white/[0.08] rounded-2xl hover:border-white/[0.15] transition-colors cursor-pointer bg-white/[0.01]">
          <Upload className="w-6 h-6 text-white/30" />
          <span className="text-sm text-white/50">
            {archive ? archive.exportedAt.slice(0, 10) + " archive loaded" : "Drop or click to load .uor-takeout.json"}
          </span>
          <input
            type="file"
            accept=".json,.uor-takeout.json"
            className="hidden"
            onChange={handleFile}
          />
        </label>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </div>
        )}
      </div>

      {/* Archive details */}
      {archive && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Seal badge */}
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
              sealValid
                ? "bg-emerald-500/10 border-emerald-500/20"
                : sealValid === false
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-white/[0.02] border-white/[0.06]"
            }`}
          >
            {sealValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            )}
            <div className="flex-1">
              <div className="text-xs text-white/70">
                {sealValid ? "Seal verified — archive integrity confirmed" : "Seal mismatch — archive may be corrupted"}
              </div>
              <div className="text-[10px] text-white/30 font-mono truncate">
                {archive.sealHash}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Rows", value: archive.metadata.totalRows.toLocaleString() },
              { label: "Categories", value: archive.metadata.categoryCount },
              { label: "Source", value: archive.metadata.sourceProvider },
            ].map((m) => (
              <div key={m.label} className="py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="text-sm font-mono text-white/80">{m.value}</div>
                <div className="text-[10px] text-white/30">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Category list */}
          <div className="space-y-1">
            {catKeys.map((catId) => {
              const cat = TAKEOUT_CATEGORIES.find((c) => c.id === catId);
              const tables = archive.categories[catId];
              const rows = tables.reduce((s, t) => s + t.rowCount, 0);
              return (
                <div
                  key={catId}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="text-sm">{cat?.icon ?? "📦"}</span>
                  <span className="flex-1 text-xs text-white/70">{cat?.label ?? catId}</span>
                  <span className="text-xs font-mono text-white/40">{rows} rows</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import action */}
      {archive && sealValid && (
        <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
          {importing && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
                <span>{progress.label}</span>
                <span>{progress.pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-300"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}
          {result && (
            <div className={`mb-3 text-xs ${result.success ? "text-emerald-400" : "text-red-400"}`}>
              {result.success
                ? "✓ Import complete — all data deployed successfully"
                : `⚠ ${result.errors.length} error(s): ${result.errors[0]}`}
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={importing || (result?.success ?? false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white/90 border border-white/[0.08] disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : result?.success ? (
              <Check className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {importing ? "Deploying…" : result?.success ? "Imported" : "Import into this environment"}
          </button>
        </div>
      )}
    </div>
  );
}
