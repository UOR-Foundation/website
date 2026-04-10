import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuditStats {
  receipts: number;
  receiptPassRate: number;
  derivations: number;
  gradeARate: number;
  certificates: number;
  certValidRate: number;
  traces: number;
  loading: boolean;
}

const AuditSummaryCards = () => {
  const [stats, setStats] = useState<AuditStats>({
    receipts: 0, receiptPassRate: 0,
    derivations: 0, gradeARate: 0,
    certificates: 0, certValidRate: 0,
    traces: 0, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rRes, dRes, cRes, tRes] = await Promise.all([
          supabase.from("uor_receipts").select("self_verified", { count: "exact", head: false }),
          supabase.from("uor_derivations").select("epistemic_grade", { count: "exact", head: false }),
          supabase.from("uor_certificates").select("valid", { count: "exact", head: false }),
          supabase.from("uor_traces").select("trace_id", { count: "exact", head: true }),
        ]);
        if (cancelled) return;

        const receipts = rRes.data ?? [];
        const derivations = dRes.data ?? [];
        const certificates = cRes.data ?? [];

        const receiptPass = receipts.filter((r) => r.self_verified).length;
        const gradeA = derivations.filter((d) => d.epistemic_grade === "A").length;
        const certValid = certificates.filter((c) => c.valid).length;

        setStats({
          receipts: receipts.length,
          receiptPassRate: receipts.length > 0 ? Math.round((receiptPass / receipts.length) * 100) : 0,
          derivations: derivations.length,
          gradeARate: derivations.length > 0 ? Math.round((gradeA / derivations.length) * 100) : 0,
          certificates: certificates.length,
          certValidRate: certificates.length > 0 ? Math.round((certValid / certificates.length) * 100) : 0,
          traces: tRes.count ?? 0,
          loading: false,
        });
      } catch {
        if (!cancelled) setStats((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (stats.loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-3" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Receipts",
      value: stats.receipts,
      sub: `${stats.receiptPassRate}% self-verified`,
      accent: stats.receiptPassRate >= 80 ? "text-green-400" : stats.receiptPassRate > 0 ? "text-yellow-400" : "text-muted-foreground",
    },
    {
      label: "Derivations",
      value: stats.derivations,
      sub: `${stats.gradeARate}% Grade A`,
      accent: stats.gradeARate >= 80 ? "text-green-400" : stats.gradeARate > 0 ? "text-blue-400" : "text-muted-foreground",
    },
    {
      label: "Certificates",
      value: stats.certificates,
      sub: `${stats.certValidRate}% valid`,
      accent: stats.certValidRate >= 80 ? "text-green-400" : stats.certValidRate > 0 ? "text-yellow-400" : "text-muted-foreground",
    },
    {
      label: "Traces",
      value: stats.traces,
      sub: "computation logs",
      accent: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{c.label}</p>
          <p className="text-3xl font-display font-bold text-foreground">{c.value}</p>
          <p className={`text-xs mt-1 ${c.accent}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
};

export default AuditSummaryCards;
