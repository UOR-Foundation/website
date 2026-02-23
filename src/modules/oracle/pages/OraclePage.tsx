import { useState, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { Eye, RefreshCw, Database, Activity, Clock, Shield } from "lucide-react";

interface OracleEntry {
  id: string;
  entry_id: string;
  operation: string;
  object_type: string;
  object_label: string | null;
  derivation_id: string | null;
  uor_cid: string | null;
  pinata_cid: string | null;
  storacha_cid: string | null;
  gateway_url: string | null;
  sha256_hash: string | null;
  byte_length: number | null;
  epistemic_grade: string;
  source_endpoint: string;
  quantum_level: number;
  encoding_format: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface OracleStats {
  "oracle:totalEncodings": number;
  "oracle:byOperation": Record<string, number>;
  "oracle:byObjectType": Record<string, number>;
  "oracle:byEpistemicGrade": Record<string, number>;
  "oracle:latestEncoding": {
    "oracle:type": string;
    "oracle:operation": string;
    "oracle:timestamp": string;
  } | null;
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  C: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  D: "bg-red-500/20 text-red-300 border-red-500/30",
};

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-api`;

export default function OraclePage() {
  const [entries, setEntries] = useState<OracleEntry[]>([]);
  const [stats, setStats] = useState<OracleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/oracle/ledger?limit=100`),
        fetch(`${API_BASE}/oracle/stats`),
      ]);
      if (ledgerRes.ok) {
        const ledger = await ledgerRes.json();
        setEntries(ledger["oracle:entries"] ?? []);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (e) {
      console.error("[oracle] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEntries = filter === "all"
    ? entries
    : entries.filter((e) => e.operation === filter);

  const operations = [...new Set(entries.map((e) => e.operation))];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-[hsl(var(--section-dark))]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-accent blur-[100px]" />
          </div>
          <div className="relative container mx-auto px-6 py-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary-foreground/80 text-xs font-medium tracking-wide mb-6">
              <Eye className="w-3.5 h-3.5" />
              SINGLE SOURCE OF TRUTH
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--section-dark-foreground))] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              UOR Oracle
            </h1>
            <p className="text-lg text-[hsl(var(--section-dark-foreground))]/70 max-w-2xl mx-auto">
              Immutable ledger of every object encoded into UOR space.
              Every encoding, every pin, every derivation — logged permanently.
            </p>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="container mx-auto px-6 -mt-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Database className="w-5 h-5" />}
              label="Total Encodings"
              value={stats?.["oracle:totalEncodings"] ?? 0}
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Object Types"
              value={Object.keys(stats?.["oracle:byObjectType"] ?? {}).length}
            />
            <StatCard
              icon={<Shield className="w-5 h-5" />}
              label="Grade A/B"
              value={
                (stats?.["oracle:byEpistemicGrade"]?.["A"] ?? 0) +
                (stats?.["oracle:byEpistemicGrade"]?.["B"] ?? 0)
              }
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Latest"
              value={
                stats?.["oracle:latestEncoding"]
                  ? new Date(stats["oracle:latestEncoding"]["oracle:timestamp"]).toLocaleDateString()
                  : "—"
              }
              isText
            />
          </div>
        </section>

        {/* Controls */}
        <section className="container mx-auto px-6 mt-8">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="flex gap-1 flex-wrap">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="All"
              />
              {operations.map((op) => (
                <FilterChip
                  key={op}
                  active={filter === op}
                  onClick={() => setFilter(op)}
                  label={op}
                />
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Operation</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Label</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">CIDs</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bytes</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading oracle ledger…
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No entries yet. Encode objects via <code className="text-primary">/store/write</code> or <code className="text-primary">/schema-org/extend?store=true</code> to populate the Oracle.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-mono bg-accent/10 text-accent border border-accent/20">
                            {entry.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={entry.object_type}>
                          {entry.object_type}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[150px] truncate" title={entry.object_label ?? ""}>
                          {entry.object_label ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[entry.epistemic_grade] ?? GRADE_COLORS.D}`}>
                            {entry.epistemic_grade}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {entry.pinata_cid && (
                              <span className="text-xs font-mono text-muted-foreground" title={entry.pinata_cid}>
                                📌 {entry.pinata_cid.slice(0, 12)}…
                              </span>
                            )}
                            {entry.storacha_cid && (
                              <span className="text-xs font-mono text-muted-foreground" title={entry.storacha_cid}>
                                🗄️ {entry.storacha_cid.slice(0, 12)}…
                              </span>
                            )}
                            {!entry.pinata_cid && !entry.storacha_cid && entry.uor_cid && (
                              <span className="text-xs font-mono text-muted-foreground" title={entry.uor_cid}>
                                🔗 {entry.uor_cid.slice(0, 12)}…
                              </span>
                            )}
                            {!entry.pinata_cid && !entry.storacha_cid && !entry.uor_cid && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {entry.byte_length ? `${entry.byte_length.toLocaleString()} B` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            The UOR Oracle is an append-only ledger. Entries cannot be deleted or modified.
          </p>
        </section>

        <div className="h-16" />
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, isText }: { icon: React.ReactNode; label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-bold ${isText ? "text-lg" : "text-2xl"} text-foreground`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      {label}
    </button>
  );
}
