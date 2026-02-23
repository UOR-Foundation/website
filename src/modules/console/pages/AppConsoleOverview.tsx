/**
 * App Console — Overview Page (P13)
 *
 * 4 stat cards + density sparkline + recent deployments + security events.
 * Integrates with SDK for live data where available.
 */

import {
  StatCard,
  ConsoleTable,
  CanonicalIdBadge,
  ZoneBadge,
  DensityGauge,
  StatusBadge,
} from "../components/ConsoleUI";

const MOCK_APPS = [
  { name: "my-saas-app", canonicalId: "urn:uor:derivation:sha256:a1b2c3d4e5f6071829abcdef01234567890abcdef01234567890abcdef012345", zone: "COHERENCE", deployedAt: "2026-02-22T14:00:00Z" },
  { name: "ai-chatbot", canonicalId: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb", zone: "DRIFT", deployedAt: "2026-02-21T10:30:00Z" },
  { name: "data-viz-tool", canonicalId: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff00112233445566778899aabbccddeeff", zone: "COHERENCE", deployedAt: "2026-02-20T08:15:00Z" },
];

const MOCK_SECURITY = [
  { type: "partition_block", count: 3, detectedAt: "2026-02-23T09:12:00Z" },
  { type: "injection_detect", count: 1, detectedAt: "2026-02-23T08:45:00Z" },
];

export default function AppConsoleOverview() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">App Console — Overview</h2>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Deployed Apps" value={3} sub="Content-addressed" />
        <StatCard label="Certified Users" value={127} sub="Solid Pod bindings" />
        <StatCard label="Revenue (30d)" value="$2,847.60" sub="80/20 split" />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Observer Zone</p>
          <div className="mt-2">
            <ZoneBadge zone="COHERENCE" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">H-score: 0</p>
        </div>
      </div>

      {/* Execution density sparkline (24h) */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Execution Density (24h)</p>
        <div className="flex items-end gap-1 h-16">
          {Array.from({ length: 24 }, (_, i) => {
            const h = 30 + Math.sin(i * 0.4) * 20 + Math.cos(i * 0.7) * 10;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70 transition-all hover:bg-primary"
                style={{ height: `${Math.max(10, h)}%` }}
                title={`${String(i).padStart(2, "0")}:00 — ${Math.round(h)}% density`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
        </div>
      </div>

      {/* Recent Deployments */}
      <div>
        <h3 className="text-sm font-medium mb-2">Recent Deployments</h3>
        <ConsoleTable
          columns={[
            { key: "name", label: "App Name", render: (v) => <span className="font-medium">{String(v)}</span> },
            { key: "canonicalId", label: "Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "zone", label: "Zone", render: (v) => <ZoneBadge zone={String(v) as "COHERENCE" | "DRIFT" | "COLLAPSE"} /> },
            { key: "deployedAt", label: "Deployed", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleDateString()}</span> },
          ]}
          rows={MOCK_APPS}
        />
      </div>

      {/* Security Events */}
      <div>
        <h3 className="text-sm font-medium mb-2">Security Events (24h)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Partition Blocks</p>
            <p className="text-2xl font-semibold text-foreground">{MOCK_SECURITY[0].count}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Injection Detections</p>
            <p className="text-2xl font-semibold text-destructive">{MOCK_SECURITY[1].count}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
