/**
 * App Console — App Detail Page (P13)
 *
 * 6 tabs: Traces, Users, Revenue, Versions, Security, Composition.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  CanonicalIdBadge,
  IPv6Badge,
  ZoneBadge,
  DensityGauge,
  ConsoleTable,
  RevenueCard,
  ExecutionTraceRow,
  StatCard,
  MorphismBadge,
} from "../components/ConsoleUI";

const TABS = ["Traces", "Users", "Revenue", "Versions", "Security", "Composition"] as const;
type TabName = typeof TABS[number];

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_TRACES = [
  { "trace:method": "POST", "trace:path": "/api/chat", "trace:statusCode": 200, "trace:durationMs": 142, "trace:partitionDensity": 0.72, "trace:injectionDetected": false, "trace:executedAt": "2026-02-23T10:15:00Z", "trace:hammingDrift": 2, "u:canonicalId": "urn:uor:derivation:sha256:trace001aabb" },
  { "trace:method": "GET", "trace:path": "/api/users", "trace:statusCode": 200, "trace:durationMs": 23, "trace:partitionDensity": 0.85, "trace:injectionDetected": false, "trace:executedAt": "2026-02-23T10:12:00Z", "trace:hammingDrift": 0, "u:canonicalId": "urn:uor:derivation:sha256:trace002ccdd" },
  { "trace:method": "POST", "trace:path": "/api/payment", "trace:statusCode": 200, "trace:durationMs": 310, "trace:partitionDensity": 0.91, "trace:injectionDetected": false, "trace:executedAt": "2026-02-23T10:10:00Z", "trace:hammingDrift": 1, "u:canonicalId": "urn:uor:derivation:sha256:trace003eeff" },
];

const MOCK_USERS = [
  { userId: "urn:uor:derivation:sha256:user001aabb", podUrl: "https://pod.uor.app/user001/", boundAt: "2026-02-20T09:00:00Z" },
  { userId: "urn:uor:derivation:sha256:user002ccdd", podUrl: "https://pod.uor.app/user002/", boundAt: "2026-02-21T14:30:00Z" },
];

const MOCK_VERSIONS = [
  { version: "1.2.0", canonicalId: "urn:uor:derivation:sha256:a1b2c3d4e5f6071829abcdef01234567890abcdef01234567890abcdef012345", deployedAt: "2026-02-22T14:00:00Z" },
  { version: "1.1.0", canonicalId: "urn:uor:derivation:sha256:prev001aabbccddeeff00112233445566778899aabbccddeeff00112233445566", deployedAt: "2026-02-18T10:00:00Z" },
  { version: "1.0.0", canonicalId: "urn:uor:derivation:sha256:orig001aabbccddeeff00112233445566778899aabbccddeeff0011223344556677", deployedAt: "2026-02-15T08:00:00Z" },
];

const MOCK_MORPHISMS = [
  { endpoint: "ai-inference", type: "morphism:Transform", calls: 245 },
  { endpoint: "data-export", type: "morphism:Isometry", calls: 42 },
  { endpoint: "webhook", type: "morphism:Action", calls: 18 },
];

export default function AppConsoleDetail() {
  const { canonicalId } = useParams<{ canonicalId: string }>();
  const [activeTab, setActiveTab] = useState<TabName>("Traces");
  const decodedId = canonicalId ? decodeURIComponent(canonicalId) : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">my-saas-app</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <CanonicalIdBadge id={decodedId || "urn:uor:derivation:sha256:unknown"} chars={28} />
            <IPv6Badge address="fd00:0075:6f72:a1b2:c3d4::1" />
            <ZoneBadge zone="COHERENCE" />
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Traces" && <TracesTab />}
      {activeTab === "Users" && <UsersTab />}
      {activeTab === "Revenue" && <RevenueTab />}
      {activeTab === "Versions" && <VersionsTab />}
      {activeTab === "Security" && <SecurityTab />}
      {activeTab === "Composition" && <CompositionTab />}
    </div>
  );
}

// ── Tab Components ──────────────────────────────────────────────────────────

function TracesTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Execution traces — every HTTP request creates an auditable trace.</p>

      {/* Density chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Partition Density Distribution</p>
        <div className="flex items-end gap-1 h-20">
          {[0.72, 0.85, 0.91, 0.68, 0.77, 0.93, 0.81, 0.89, 0.75, 0.88, 0.94, 0.70].map((d, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${d >= 0.7 ? "bg-emerald-500/70" : d >= 0.4 ? "bg-amber-500/70" : "bg-destructive/70"}`}
              style={{ height: `${d * 100}%` }}
              title={`Density: ${d.toFixed(3)}`}
            />
          ))}
        </div>
      </div>

      {/* Trace rows */}
      <div className="rounded-lg border border-border overflow-hidden">
        {MOCK_TRACES.map((trace, i) => (
          <ExecutionTraceRow key={i} trace={trace as unknown as Record<string, unknown>} />
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Certified Users" value={MOCK_USERS.length} sub="Active pod bindings" />
        <StatCard label="Total Interactions" value={342} sub="Certificate-bound" />
      </div>

      <ConsoleTable
        columns={[
          { key: "userId", label: "User Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
          { key: "podUrl", label: "Pod URL", render: (v) => <code className="text-xs text-muted-foreground">{String(v)}</code> },
          { key: "boundAt", label: "Bound", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleDateString()}</span> },
        ]}
        rows={MOCK_USERS}
      />
    </div>
  );
}

function RevenueTab() {
  return (
    <div className="space-y-4">
      <RevenueCard gross={2847.60} net={2278.08} platformFee={569.52} />

      <h3 className="text-sm font-medium">Payment History</h3>
      <ConsoleTable
        columns={[
          { key: "date", label: "Date" },
          { key: "amount", label: "Amount", render: (v) => <span className="font-mono">${Number(v).toFixed(2)}</span> },
          { key: "user", label: "User", render: (v) => <CanonicalIdBadge id={String(v)} chars={16} /> },
          { key: "gate", label: "Gate" },
        ]}
        rows={[
          { date: "2026-02-23", amount: 9.99, user: "urn:uor:derivation:sha256:user001aabb", gate: "premium" },
          { date: "2026-02-22", amount: 29.99, user: "urn:uor:derivation:sha256:user002ccdd", gate: "pro-tier" },
          { date: "2026-02-21", amount: 9.99, user: "urn:uor:derivation:sha256:user003eeff", gate: "premium" },
        ]}
      />
    </div>
  );
}

function VersionsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Immutable version chain — every deploy creates a new content-addressed identity.</p>

      <div className="space-y-2">
        {MOCK_VERSIONS.map((v, i) => (
          <div key={v.canonicalId} className={`flex items-center gap-4 rounded-lg border bg-card p-3 ${i === 0 ? "border-primary/30" : "border-border"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">v{v.version}</span>
                {i === 0 && <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold">CURRENT</span>}
              </div>
              <CanonicalIdBadge id={v.canonicalId} chars={32} />
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(v.deployedAt).toLocaleString()}</p>
            </div>
            {i > 0 && (
              <button className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                Rollback
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Injection Alerts" value={1} sub="Last 24h" />
        <StatCard label="WAF Events" value={3} sub="Partition blocks" />
        <StatCard label="Deployment Scans" value="✓ Pass" sub="Latest scan" />
      </div>

      <h3 className="text-sm font-medium">Recent Alerts</h3>
      <ConsoleTable
        columns={[
          { key: "type", label: "Type" },
          { key: "severity", label: "Severity", render: (v) => (
            <span className={`text-xs font-semibold ${v === "high" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
              {String(v).toUpperCase()}
            </span>
          ) },
          { key: "detectedAt", label: "Detected", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleString()}</span> },
          { key: "traceId", label: "Trace", render: (v) => <CanonicalIdBadge id={String(v)} chars={16} /> },
        ]}
        rows={[
          { type: "Hamming Drift", severity: "medium", detectedAt: "2026-02-23T09:12:00Z", traceId: "urn:uor:derivation:sha256:alert001" },
          { type: "Partition Block", severity: "high", detectedAt: "2026-02-23T08:45:00Z", traceId: "urn:uor:derivation:sha256:alert002" },
        ]}
      />
    </div>
  );
}

function CompositionTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Morphism interfaces — typed, certified app-to-app communication.</p>

      <h3 className="text-sm font-medium">Registered Interfaces</h3>
      <ConsoleTable
        columns={[
          { key: "endpoint", label: "Endpoint", render: (v) => <span className="font-medium">{String(v)}</span> },
          { key: "type", label: "Type", render: (v) => <MorphismBadge type={String(v)} /> },
          { key: "calls", label: "Calls (30d)", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
        ]}
        rows={MOCK_MORPHISMS}
      />

      <h3 className="text-sm font-medium">Recent Calls</h3>
      <ConsoleTable
        columns={[
          { key: "from", label: "From", render: (v) => <CanonicalIdBadge id={String(v)} chars={16} /> },
          { key: "endpoint", label: "Endpoint" },
          { key: "type", label: "Type", render: (v) => <MorphismBadge type={String(v)} /> },
          { key: "at", label: "Time", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleTimeString()}</span> },
        ]}
        rows={[
          { from: "urn:uor:derivation:sha256:callerapp001", endpoint: "ai-inference", type: "morphism:Transform", at: "2026-02-23T10:14:00Z" },
          { from: "urn:uor:derivation:sha256:callerapp002", endpoint: "data-export", type: "morphism:Isometry", at: "2026-02-23T10:10:00Z" },
        ]}
      />
    </div>
  );
}
