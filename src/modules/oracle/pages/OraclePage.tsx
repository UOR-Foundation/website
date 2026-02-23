import { useState, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  Eye, RefreshCw, Database, Activity, Clock, Shield, ExternalLink,
  Copy, Check, ArrowRight, Flame, Snowflake, HardDrive, Lock
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

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
  storage_source: string | null;
  storage_destination: string | null;
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

/* ── Constants ──────────────────────────────────────────────────────────── */

const OP_COLORS: Record<string, string> = {
  "sobridge-pin": "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "sobridge-canonicalize": "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "store-write": "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "kernel-derive": "bg-amber-500/15 text-amber-300 border-amber-500/25",
};

type ViewMode = "all" | "encoding" | "decoding";

const ENCODING_OPS = ["sobridge-pin", "sobridge-canonicalize", "store-write", "kernel-derive"];
const DECODING_OPS = ["store-read", "resolve", "decode"];

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-api`;

/* ── Helpers ────────────────────────────────────────────────────────────── */

function classifyMemoryTier(entry: OracleEntry): "hot" | "cold" {
  // Hot memory: entries with active IPFS gateway availability (Pinata).
  // Cold memory: entries also persisted to Filecoin via Storacha for long-term archival.
  if (entry.storacha_cid) return "cold";
  return "hot";
}

function getMemoryLabel(tier: "hot" | "cold"): string {
  return tier === "hot" ? "Hot (IPFS)" : "Cold (Filecoin)";
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function OraclePage() {
  const [entries, setEntries] = useState<OracleEntry[]>([]);
  const [stats, setStats] = useState<OracleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
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

  const filteredEntries = entries.filter((e) => {
    if (viewMode === "encoding") return ENCODING_OPS.includes(e.operation) || !DECODING_OPS.includes(e.operation);
    if (viewMode === "decoding") return DECODING_OPS.includes(e.operation);
    return true;
  });

  const hotCount = entries.filter((e) => classifyMemoryTier(e) === "hot").length;
  const coldCount = entries.filter((e) => classifyMemoryTier(e) === "cold").length;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-[hsl(var(--section-dark))] pt-20 md:pt-36">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-accent blur-[100px]" />
          </div>
          <div className="relative container mx-auto px-6 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary-foreground/80 text-xs font-medium tracking-wide mb-6">
              <Eye className="w-3.5 h-3.5" />
              PERSISTENT MEMORY
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--section-dark-foreground))] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              UOR Oracle
            </h1>
            <p className="text-base text-[hsl(var(--section-dark-foreground))]/70 max-w-2xl mx-auto leading-relaxed">
              A persistent, append-only record of every object encoded or decoded across the UOR system.
              Each entry is content-addressed and cryptographically verifiable,
              stored across two memory tiers for both speed and permanence.
            </p>
          </div>
        </section>

        {/* What is this? Explainer */}
        <section className="container mx-auto px-6 -mt-8 relative z-10">
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ExplainerCard
                icon={<Lock className="w-5 h-5 text-primary" />}
                title="What is this?"
                description="The Oracle is the system's memory. Every time an object is encoded (written to storage) or decoded (read from storage), it is recorded here with a cryptographic proof. Entries can never be deleted or changed."
              />
              <ExplainerCard
                icon={<Flame className="w-5 h-5 text-orange-400" />}
                title="Hot Memory (IPFS)"
                description={`Fast-access storage on IPFS via Pinata. Objects are immediately retrievable through a gateway URL. Currently ${hotCount} ${hotCount === 1 ? "entry" : "entries"} in hot memory.`}
              />
              <ExplainerCard
                icon={<Snowflake className="w-5 h-5 text-sky-400" />}
                title="Cold Memory (Filecoin)"
                description={`Long-term archival on Filecoin via Storacha. Objects are preserved permanently on a decentralized network, resistant to data loss. Currently ${coldCount} ${coldCount === 1 ? "entry" : "entries"} in cold memory.`}
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Database className="w-5 h-5" />} label="Total Records" value={stats?.["oracle:totalEncodings"] ?? 0} />
            <StatCard icon={<Activity className="w-5 h-5" />} label="Object Types" value={Object.keys(stats?.["oracle:byObjectType"] ?? {}).length} />
            <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="Hot Memory" value={hotCount} />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Latest Record"
              value={stats?.["oracle:latestEncoding"] ? new Date(stats["oracle:latestEncoding"]["oracle:timestamp"]).toLocaleDateString() : "—"}
              isText
            />
          </div>
        </section>

        {/* Controls */}
        <section className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden">
              {(["all", "encoding", "decoding"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {mode === "all" ? "All Records" : mode}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Memory Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Storage Path</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proof Address</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading oracle memory…
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No {viewMode !== "all" ? viewMode : ""} records yet. Encode an object to create a record.
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

          <div className="flex items-center justify-center gap-2 mt-5 text-sm text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            <span>Append-only ledger. Records are immutable and cryptographically sealed.</span>
          </div>
        </section>

        <div className="h-16" />
      </div>
    </Layout>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function ExplainerCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function OracleRow({ entry, expanded, onToggle }: { entry: OracleEntry; expanded: boolean; onToggle: () => void }) {
  const tier = classifyMemoryTier(entry);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
          {new Date(entry.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <span className={`px-2.5 py-1 rounded text-xs font-mono border ${OP_COLORS[entry.operation] ?? "bg-accent/10 text-accent border-accent/20"}`}>
            {entry.operation}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground max-w-[220px] truncate" title={entry.object_label ?? ""}>
              {entry.object_label ?? "—"}
            </span>
            <span className="text-xs font-mono text-muted-foreground max-w-[220px] truncate" title={entry.object_type}>
              {entry.object_type}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <MemoryTierBadge tier={tier} />
        </td>
        <td className="px-4 py-3">
          {(entry.storage_source || entry.storage_destination) ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="max-w-[100px] truncate" title={entry.storage_source ?? ""}>{entry.storage_source ?? "—"}</span>
              <ArrowRight className="w-3 h-3 shrink-0 text-primary/60" />
              <span className="max-w-[100px] truncate" title={entry.storage_destination ?? ""}>{entry.storage_destination ?? "—"}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {entry.uor_cid ? (
            <CopyableHash value={entry.uor_cid} />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-6 py-4">
            <EntryDetail entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
}

function MemoryTierBadge({ tier }: { tier: "hot" | "cold" }) {
  if (tier === "cold") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25" title="Persisted to Filecoin via Storacha for permanent archival">
        <Snowflake className="w-3 h-3" /> Cold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-500/15 text-orange-300 border border-orange-500/25" title="Stored on IPFS via Pinata for fast retrieval">
      <Flame className="w-3 h-3" /> Hot
    </span>
  );
}

function EntryDetail({ entry }: { entry: OracleEntry }) {
  const verifyUrl = entry.derivation_id
    ? `${API_BASE}/tools/verify?derivation_id=${encodeURIComponent(entry.derivation_id)}`
    : null;
  const tier = classifyMemoryTier(entry);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div className="space-y-2">
        <DetailRow label="Entry ID" value={entry.entry_id} mono />
        <DetailRow label="Operation" value={entry.operation} />
        <DetailRow label="Object Type" value={entry.object_type} mono />
        <DetailRow label="Object Label" value={entry.object_label ?? "—"} />
        <DetailRow label="Source" value={entry.source_endpoint} mono />
        <DetailRow label="Format" value={entry.encoding_format} />
        <DetailRow label="Quantum" value={`Q${entry.quantum_level}`} />
        <DetailRow label="Size" value={entry.byte_length ? `${entry.byte_length.toLocaleString()} bytes` : "—"} />
        <DetailRow label="Memory Tier" value={getMemoryLabel(tier)} />
      </div>
      <div className="space-y-2">
        <DetailRow label="Derivation ID" value={entry.derivation_id ?? "—"} mono copyable />
        <DetailRow label="UOR CID" value={entry.uor_cid ?? "—"} mono copyable />
        <DetailRow label="SHA-256" value={entry.sha256_hash ?? "—"} mono copyable />
        <DetailRow label="IPFS CID" value={entry.pinata_cid ?? "—"} mono copyable />
        <DetailRow label="Filecoin CID" value={entry.storacha_cid ?? "—"} mono copyable />
        <DetailRow label="Gateway" value={entry.gateway_url ?? "—"} link />
        {verifyUrl && (
          <div className="pt-2">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Shield className="w-3.5 h-3.5" /> Verify Derivation
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div className="md:col-span-2">
          <span className="text-muted-foreground font-medium">Metadata</span>
          <pre className="mt-1 p-3 rounded bg-background border border-border text-xs font-mono text-muted-foreground overflow-x-auto">
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
      <span className="text-muted-foreground font-medium min-w-[110px] shrink-0">{label}</span>
      {link && value !== "—" ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {value} <ExternalLink className="w-3.5 h-3.5 inline" />
        </a>
      ) : (
        <span className={`break-all ${mono ? "font-mono" : ""} text-foreground`}>{value}</span>
      )}
      {copyable && value !== "—" && (
        <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function CopyableHash({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = value.length > 16 ? value.slice(0, 8) + "…" + value.slice(-6) : value;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors group"
      title={value}
    >
      <span>{truncated}</span>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}

function StatCard({ icon, label, value, isText }: { icon: React.ReactNode; label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-bold ${isText ? "text-lg" : "text-2xl"} text-foreground`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
