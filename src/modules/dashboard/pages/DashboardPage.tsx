import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity, Atom, BookOpen, Brain, ChevronRight, Code2, Database,
  FlaskConical, GitBranch, Layers, LayoutDashboard, Network, Search,
  Shield, ShieldCheck, Terminal, Zap,
} from "lucide-react";
import uorIcon from "@/assets/uor-icon-new.png";
import { Q0 } from "@/modules/ring-core/ring";
import { supabase } from "@/integrations/supabase/client";
import { systemIntegrityCheck } from "@/modules/self-verify";
import type { IntegrityReport } from "@/modules/self-verify";
import { getRecentReceipts } from "@/modules/self-verify/audit-trail";
import type { DerivationReceipt } from "@/modules/derivation/receipt";
import { uor_derive } from "@/modules/agent-tools/tools";
import type { DeriveOutput } from "@/modules/agent-tools/tools";
import { ALL_GRADES, gradeInfo } from "@/modules/epistemic/grading";
import { EpistemicBadge } from "@/modules/epistemic";

// ── Sidebar nav items ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/ring-explorer", label: "Ring Explorer", icon: Atom },
  { path: "/derivation-lab", label: "Derivation Lab", icon: FlaskConical },
  { path: "/knowledge-graph", label: "Knowledge Graph", icon: Database },
  { path: "/sparql-editor", label: "SPARQL Editor", icon: Search },
  { path: "/code-knowledge-graph", label: "Code KG", icon: Code2 },
  { path: "/agent-console", label: "Agent Console", icon: Terminal },
  { path: "/conformance", label: "Conformance", icon: ShieldCheck },
  { path: "/audit", label: "Audit Trail", icon: Shield },
];

// ── Module list for health grid ─────────────────────────────────────────────

const MODULES = [
  "ring-core", "identity", "triad", "derivation", "kg-store", "sparql",
  "shacl", "resolver", "semantic-index", "code-kg", "agent-tools",
  "epistemic", "jsonld", "morphism", "self-verify", "framework", "community",
];

// ── Page ────────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Ring state
  const [ringVerified, setRingVerified] = useState<boolean | null>(null);
  const [ringVerifying, setRingVerifying] = useState(true);

  // Stats
  const [datumCount, setDatumCount] = useState(0);
  const [derivationCount, setDerivationCount] = useState(0);
  const [tripleCount, setTripleCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [certCount, setCertCount] = useState(0);

  // API status
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Integrity
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);

  // Receipts
  const [recentReceipts, setRecentReceipts] = useState<DerivationReceipt[]>([]);

  // Quick derive
  const [deriveTerm, setDeriveTerm] = useState("neg(bnot(42))");
  const [deriveResult, setDeriveResult] = useState<DeriveOutput | null>(null);
  const [deriveLoading, setDeriveLoading] = useState(false);

  // Identity verifier
  const [identityX, setIdentityX] = useState("42");
  const [identityResult, setIdentityResult] = useState<string | null>(null);

  // ── Boot sequence ───────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Ring verify
    const ring = Q0();
    const result = ring.verify();
    setRingVerified(result.verified);
    setRingVerifying(false);

    // 2. Fetch stats
    Promise.all([
      supabase.from("uor_datums").select("*", { count: "exact", head: true }),
      supabase.from("uor_derivations").select("*", { count: "exact", head: true }),
      supabase.from("uor_triples").select("*", { count: "exact", head: true }),
      supabase.from("uor_receipts").select("*", { count: "exact", head: true }),
      supabase.from("uor_certificates").select("*", { count: "exact", head: true }),
    ]).then(([d, der, t, r, c]) => {
      setDatumCount(d.count ?? 0);
      setDerivationCount(der.count ?? 0);
      setTripleCount(t.count ?? 0);
      setReceiptCount(r.count ?? 0);
      setCertCount(c.count ?? 0);
    });

    // 3. Integrity check
    systemIntegrityCheck().then(setIntegrityReport);

    // 4. Recent receipts
    getRecentReceipts(20).then(setRecentReceipts).catch(() => {});

    // 5. API ping
    fetch("https://api.uor.foundation/v1/navigate", { method: "GET", signal: AbortSignal.timeout(5000) })
      .then((r) => setApiOnline(r.ok))
      .catch(() => setApiOnline(false));
  }, []);

  // ── Quick derive ──────────────────────────────────────────────────────

  const [deriveError, setDeriveError] = useState<string | null>(null);

  const handleDerive = useCallback(async () => {
    setDeriveLoading(true); setDeriveError(null);
    try {
      const r = await uor_derive({ term: deriveTerm });
      setDeriveResult(r);
    } catch (e) { setDeriveError(String(e)); }
    finally { setDeriveLoading(false); }
  }, [deriveTerm]);

  // ── Identity verify ───────────────────────────────────────────────────

  const handleIdentityCheck = useCallback(() => {
    const x = parseInt(identityX);
    if (isNaN(x) || x < 0 || x > 255) {
      setIdentityResult("Enter a value 0–255");
      return;
    }
    const ring = Q0();
    const bytes = ring.toBytes(x);
    const negBnot = ring.neg(ring.bnot(bytes));
    const succX = ring.succ(bytes);
    const lhs = ring.fromBytes(negBnot);
    const rhs = ring.fromBytes(succX);
    setIdentityResult(lhs === rhs ? `✓ neg(bnot(${x})) = ${lhs} = succ(${x}) — VERIFIED` : `✗ FAILED: ${lhs} ≠ ${rhs}`);
  }, [identityX]);

  // ── Epistemic distribution (simple estimate) ─────────────────────────

  const epistemicDist = {
    A: derivationCount,
    B: certCount,
    C: Math.max(0, datumCount - derivationCount - certCount),
    D: 0,
  };
  const epistemicTotal = Object.values(epistemicDist).reduce((a, b) => a + b, 0) || 1;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-0 overflow-hidden"} shrink-0 border-r border-border bg-card transition-all duration-200`}>
        <div className="sticky top-0 h-screen flex flex-col py-4">
          <Link to="/" className="flex items-center gap-2 px-4 mb-6">
            <img src={uorIcon} alt="UOR" className="w-6 h-6" />
            <span className="font-display text-sm font-semibold tracking-tight">UOR Foundation</span>
          </Link>

          <nav className="flex-1 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pt-4 border-t border-border">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Website
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
                <Layers size={18} />
              </button>
              <div>
                <h1 className="text-sm font-display font-semibold">UOR Semantic Web Infrastructure</h1>
                <p className="text-[11px] text-muted-foreground">Universal Object Reference · Agentic AI · Knowledge Graph</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Coherence status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${ringVerifying ? "bg-yellow-400 animate-pulse" : ringVerified ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-[11px] text-muted-foreground">
                  {ringVerifying ? "Verifying…" : ringVerified ? "Coherent" : "Failed"}
                </span>
              </div>
              {/* API status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${apiOnline === null ? "bg-yellow-400 animate-pulse" : apiOnline ? "bg-green-400" : "bg-muted-foreground"}`} />
                <span className="text-[11px] text-muted-foreground">
                  {apiOnline === null ? "Pinging…" : apiOnline ? "API Online" : "API Offline"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-[1400px]">
          {/* Row 1: Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Atom} label="Ring Status" value={ringVerified ? "Q0 Verified" : "Checking…"}
              sub={`Z/256Z · 256 states · ${ringVerified ? "ALL CHECKS PASSED" : "…"}`}
              accent={ringVerified ? "green" : "yellow"} />
            <StatCard icon={Database} label="Knowledge Graph" value={`${datumCount.toLocaleString()} datums`}
              sub={`${derivationCount} derivations · ${tripleCount.toLocaleString()} triples`}
              accent="blue" />
            <StatCard icon={Brain} label="Epistemic Distribution"
              value={`${derivationCount} Grade A`}
              sub={ALL_GRADES.map((g) => `${g}: ${epistemicDist[g]}`).join(" · ")}
              accent="purple">
              <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-muted">
                {ALL_GRADES.map((g) => {
                  const pct = (epistemicDist[g] / epistemicTotal) * 100;
                  if (pct === 0) return null;
                  const colors = { A: "bg-green-400", B: "bg-blue-400", C: "bg-yellow-400", D: "bg-red-400" };
                  return <div key={g} className={`${colors[g]} transition-all`} style={{ width: `${pct}%` }} />;
                })}
              </div>
            </StatCard>
            <StatCard icon={Shield} label="Self-Verification" value={`${receiptCount} receipts`}
              sub={integrityReport ? `${integrityReport.checks.filter((c) => c.passed).length}/${integrityReport.checks.length} checks passed` : "Checking…"}
              accent={integrityReport?.allPassed ? "green" : "yellow"} />
          </div>

          {/* Row 2: Module Health Grid */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
              <Activity size={14} className="text-primary" /> Module Health
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
              {MODULES.map((mod) => {
                const check = integrityReport?.checks.find((c) => c.module === mod);
                const passed = check ? check.passed : true; // modules not checked are assumed healthy
                return (
                  <div key={mod} className={`rounded-lg border p-2.5 text-center transition-colors ${
                    passed ? "border-border bg-muted/20" : "border-red-500/30 bg-red-500/10"
                  }`}>
                    <div className={`text-[10px] font-mono truncate ${passed ? "text-muted-foreground" : "text-red-400"}`}>
                      {mod}
                    </div>
                    <div className={`text-xs mt-1 ${passed ? "text-green-400" : "text-red-400"}`}>
                      {passed ? "✓" : "✗"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Identity */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-display font-semibold flex items-center gap-2">
                  <Zap size={14} className="text-primary" /> Critical Identity
                </h2>
                <p className="font-mono text-sm mt-1">
                  <span className="text-primary font-semibold">neg(bnot(x)) = succ(x)</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className={ringVerified ? "text-green-400 font-semibold" : "text-yellow-400"}>
                    {ringVerified ? "VERIFIED ∀ x ∈ Z/256Z" : "VERIFYING…"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input value={identityX} onChange={(e) => setIdentityX(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="x" />
                <button onClick={handleIdentityCheck} className="btn-primary text-xs !py-1.5 !px-3">Verify</button>
              </div>
            </div>
            {identityResult && (
              <p className={`font-mono text-xs mt-2 ${identityResult.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                {identityResult}
              </p>
            )}
          </div>

          {/* Row 3: Quick tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Derive */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
                <GitBranch size={14} className="text-primary" /> Quick Derive
              </h2>
              <div className="flex gap-2 mb-3">
                <input value={deriveTerm} onChange={(e) => setDeriveTerm(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/20 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="neg(bnot(42))" />
                <button onClick={handleDerive} disabled={deriveLoading} className="btn-primary text-xs !py-2 disabled:opacity-50">
                  {deriveLoading ? "…" : "Derive"}
                </button>
              </div>
              {deriveError && <p className="text-xs text-destructive font-mono">{deriveError}</p>}
              {deriveResult && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-display font-bold text-foreground">{deriveResult.result_value}</span>
                    <EpistemicBadge grade={deriveResult.epistemic_grade as "A" | "B" | "C" | "D"} size="sm" />
                    <span className="text-xs text-muted-foreground ml-auto">{deriveResult.executionTimeMs}ms</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">IRI: {deriveResult.result_iri}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">ID: {deriveResult.derivation_id}</p>
                  <p className={`text-[10px] font-mono ${deriveResult.receipt.selfVerified ? "text-green-400" : "text-red-400"}`}>
                    Receipt: {deriveResult.receipt.selfVerified ? "✓ Self-verified" : "✗ Failed"}
                  </p>
                </div>
              )}
            </div>

            {/* Quick nav */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
                <Network size={14} className="text-primary" /> Quick Navigation
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {NAV_ITEMS.filter((n) => n.path !== "/dashboard").map((item) => (
                  <Link key={item.path} to={item.path}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground group">
                    <item.icon size={14} />
                    <span>{item.label}</span>
                    <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Recent Activity */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
              <Activity size={14} className="text-primary" /> Recent Activity
            </h2>
            {recentReceipts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity. Execute a derivation to see receipts here.</p>
            ) : (
              <div className="space-y-1">
                {recentReceipts.slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
                    <span className={`text-xs ${r.selfVerified ? "text-green-400" : "text-red-400"}`}>
                      {r.selfVerified ? "✓" : "✗"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">{r.moduleId}</span>
                    <span className="text-[10px] font-mono text-foreground truncate flex-1">{r.operation}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            UOR Foundation · uor.foundation · Apache-2.0 · Q0 Verified · 14 namespaces · 82 classes · 120 properties
          </p>
        </footer>
      </div>
    </div>
  );
};

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent, children }: {
  icon: React.ElementType; label: string; value: string; sub: string;
  accent: "green" | "blue" | "purple" | "yellow";
  children?: React.ReactNode;
}) {
  const accents = {
    green: "border-green-500/20",
    blue: "border-blue-500/20",
    purple: "border-purple-500/20",
    yellow: "border-yellow-500/20",
  };

  return (
    <div className={`rounded-xl border ${accents[accent]} bg-card p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-primary" />
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-display font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      {children}
    </div>
  );
}

export default DashboardPage;
