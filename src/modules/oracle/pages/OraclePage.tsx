import { useState, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { Eye, RefreshCw, Database, Activity, Clock, Shield, ExternalLink, Copy, Check } from "lucide-react";

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

const OP_COLORS: Record<string, string> = {
  "sobridge-pin": "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "sobridge-canonicalize": "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "store-write": "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "kernel-derive": "bg-amber-500/15 text-amber-300 border-amber-500/25",
};

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-api`;

export default function OraclePage() {
  const [entries, setEntries] = useState<OracleEntry[]>([]);
  const [stats, setStats] = useState<OracleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/oracle/ledger?limit=200`),
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
              META-OBSERVER · SINGLE SOURCE OF TRUTH
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--section-dark-foreground))] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              UOR Oracle
            </h1>
            <p className="text-lg text-[hsl(var(--section-dark-foreground))]/70 max-w-2xl mx-auto">
              Immutable ledger of every object encoded into UOR space.
              Every encoding, every derivation, every pin — logged permanently with proof addresses.
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
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
              {operations.map((op) => (
                <FilterChip key={op} active={filter === op} onClick={() => setFilter(op)} label={op} />
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Object</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Derivation ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">UOR Proof Address</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">IPFS CIDs</th>
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
                        No entries yet. Encode objects via <code className="text-primary">/store/write</code>, <code className="text-primary">/kernel/derive</code>, or <code className="text-primary">/schema-org/extend</code> to populate the Oracle.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <OracleRow
                        key={entry.id}
                        entry={entry}
                        expanded={expanded === entry.id}
                        onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            The UOR Oracle is an append-only meta-observer. Entries cannot be deleted or modified. Every encoding and derivation in UOR space is logged here.
          </p>
        </section>

        <div className="h-16" />
      </div>
    </Layout>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function OracleRow({ entry, expanded, onToggle }: { entry: OracleEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {new Date(entry.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded text-xs font-mono border ${OP_COLORS[entry.operation] ?? "bg-accent/10 text-accent border-accent/20"}`}>
            {entry.operation}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground max-w-[180px] truncate" title={entry.object_label ?? ""}>
              {entry.object_label ?? "—"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground max-w-[180px] truncate" title={entry.object_type}>
              {entry.object_type}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[entry.epistemic_grade] ?? GRADE_COLORS.D}`}>
            {entry.epistemic_grade}
          </span>
        </td>
        <td className="px-4 py-3">
          {entry.derivation_id ? (
            <CopyableHash value={entry.derivation_id} prefix="urn:uor:derivation:" />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {entry.uor_cid ? (
            <CopyableHash value={entry.uor_cid} prefix="" />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            {entry.pinata_cid && (
              <CidBadge label="📌 Pinata" cid={entry.pinata_cid} gatewayUrl={`https://uor.mypinata.cloud/ipfs/${entry.pinata_cid}`} />
            )}
            {entry.storacha_cid && (
              <CidBadge label="🗄️ Storacha" cid={entry.storacha_cid} gatewayUrl={entry.gateway_url} />
            )}
            {!entry.pinata_cid && !entry.storacha_cid && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-6 py-4">
            <EntryDetail entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
}

function EntryDetail({ entry }: { entry: OracleEntry }) {
  const verifyUrl = entry.derivation_id
    ? `${API_BASE}/tools/verify?derivation_id=${encodeURIComponent(entry.derivation_id)}`
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div className="space-y-2">
        <DetailRow label="Entry ID" value={entry.entry_id} mono />
        <DetailRow label="Operation" value={entry.operation} />
        <DetailRow label="Object Type" value={entry.object_type} mono />
        <DetailRow label="Object Label" value={entry.object_label ?? "—"} />
        <DetailRow label="Source Endpoint" value={entry.source_endpoint} mono />
        <DetailRow label="Encoding Format" value={entry.encoding_format} />
        <DetailRow label="Quantum Level" value={`Q${entry.quantum_level}`} />
        <DetailRow label="Byte Length" value={entry.byte_length ? `${entry.byte_length.toLocaleString()} bytes` : "—"} />
      </div>
      <div className="space-y-2">
        <DetailRow label="Derivation ID" value={entry.derivation_id ?? "—"} mono copyable />
        <DetailRow label="UOR CID (Proof Address)" value={entry.uor_cid ?? "—"} mono copyable />
        <DetailRow label="SHA-256 Hash" value={entry.sha256_hash ?? "—"} mono copyable />
        <DetailRow label="Pinata CID" value={entry.pinata_cid ?? "—"} mono copyable />
        <DetailRow label="Storacha CID" value={entry.storacha_cid ?? "—"} mono copyable />
        <DetailRow label="Gateway URL" value={entry.gateway_url ?? "—"} link />
        {verifyUrl && (
          <div className="pt-2">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Shield className="w-3 h-3" /> Verify Derivation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div className="md:col-span-2">
          <span className="text-muted-foreground font-medium">Metadata</span>
          <pre className="mt-1 p-2 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground overflow-x-auto">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, copyable, link }: { label: string; value: string; mono?: boolean; copyable?: boolean; link?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground font-medium min-w-[120px] shrink-0">{label}</span>
      {link && value !== "—" ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {value} <ExternalLink className="w-3 h-3 inline" />
        </a>
      ) : (
        <span className={`break-all ${mono ? "font-mono" : ""} text-foreground`}>{value}</span>
      )}
      {copyable && value !== "—" && (
        <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

function CopyableHash({ value, prefix }: { value: string; prefix: string }) {
  const [copied, setCopied] = useState(false);
  const display = prefix ? value.replace(prefix, "") : value;
  const truncated = display.length > 16 ? display.slice(0, 8) + "…" + display.slice(-6) : display;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
      title={value}
    >
      <span>{truncated}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}

function CidBadge({ label, cid, gatewayUrl }: { label: string; cid: string; gatewayUrl?: string | null }) {
  return (
    <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1" title={cid}>
      {label}: {cid.slice(0, 10)}…
      {gatewayUrl && (
        <a
          href={gatewayUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:text-primary/80"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </span>
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
