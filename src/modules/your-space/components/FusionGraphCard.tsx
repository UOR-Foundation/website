/**
 * FusionGraphCard — Visualizes fusion graph stats in the Data Bank panel.
 * Shows modality breakdown, triple counts, compression ratio, and dict hit rate.
 */

import { useState, useCallback } from "react";
import { Loader2, Layers, Zap, BookOpen, Activity } from "lucide-react";
import { assembleFusionGraph, type FusionGraphStats } from "@/modules/data-bank";
import { supabase } from "@/integrations/supabase/client";

export function FusionGraphCard() {
  const [stats, setStats] = useState<FusionGraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assemble = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setError("Not signed in"); return; }
      const { stats: s } = await assembleFusionGraph(session.user.id);
      setStats(s);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const ratio = stats?.compression.ratio ?? 0;
  const dictHits = stats?.compression.objectDictHits ?? 0;
  const dictSize = stats?.compression.objectDictSize ?? 0;
  const hitRate = dictSize > 0 ? Math.round((dictHits / (dictHits + (stats?.totalTriples ?? 0) - dictHits)) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground font-body text-sm font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Fusion Graph
        </h4>
        <button
          onClick={assemble}
          disabled={loading}
          className="text-[10px] px-2 py-1 rounded-md border border-border bg-card hover:bg-muted/50 text-muted-foreground transition-colors disabled:opacity-50 font-body"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assemble"}
        </button>
      </div>

      {error && (
        <p className="text-destructive text-xs font-body">{error}</p>
      )}

      {!stats && !loading && !error && (
        <p className="text-muted-foreground text-xs font-body italic">
          Press Assemble to project the multi-modal context surface.
        </p>
      )}

      {stats && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            <KPI icon={<Activity className="w-3 h-3" />} label="Triples" value={`${stats.totalTriples}`} />
            <KPI icon={<Zap className="w-3 h-3" />} label="Ratio" value={`${ratio.toFixed(1)}x`} />
            <KPI icon={<BookOpen className="w-3 h-3" />} label="Dict Hits" value={`${hitRate}%`} />
          </div>

          {/* Modality breakdown */}
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[10px] font-body uppercase tracking-wide">
              Modality Breakdown
            </p>
            {stats.modalities.map((mod) => {
              const count = stats.triplesByModality[mod] ?? 0;
              const pct = stats.totalTriples > 0 ? (count / stats.totalTriples) * 100 : 0;
              return (
                <div key={mod} className="flex items-center gap-2">
                  <span className="text-foreground text-xs font-body w-20 truncate capitalize">
                    {mod}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[10px] font-mono w-10 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Compression detail */}
          <div className="text-[10px] text-muted-foreground font-mono leading-relaxed">
            {formatBytes(stats.compression.rawBytes)} → {formatBytes(stats.compression.compressedBytes)}
            {" · "}{stats.compression.subjectDictSize} subjects
            {" · "}{stats.compression.objectDictSize} obj-dict entries
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-muted/50 border border-border">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-foreground text-sm font-body font-semibold">{value}</span>
      <span className="text-muted-foreground text-[10px] font-body">{label}</span>
    </div>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
