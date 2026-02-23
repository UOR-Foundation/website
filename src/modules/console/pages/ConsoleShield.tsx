/**
 * UNS Console — Shield Page
 */

import { ConsoleTable, CanonicalIdBadge, StatusBadge, DensityGauge } from "../components/ConsoleUI";

const ACTION_DIST = [
  { action: "PASS", count: 892, pct: 74 },
  { action: "WARN", count: 180, pct: 15 },
  { action: "CHALLENGE", count: 96, pct: 8 },
  { action: "BLOCK", count: 36, pct: 3 },
];

const MOCK_WAF = [
  { canonicalId: "urn:uor:derivation:sha256:waf001aabb", pattern: "SQL injection (algebraic)", action: "block", hits: 14 },
  { canonicalId: "urn:uor:derivation:sha256:waf002ccdd", pattern: "XSS via payload drift",     action: "challenge", hits: 28 },
  { canonicalId: "urn:uor:derivation:sha256:waf003eeff", pattern: "Path traversal",             action: "block", hits: 7 },
];

const MOCK_RATE = [
  { identity: "urn:uor:derivation:sha256:agent001", rate: 42, limit: 60, status: "pass" },
  { identity: "urn:uor:derivation:sha256:agent002", rate: 58, limit: 60, status: "warn" },
  { identity: "urn:uor:derivation:sha256:agent003", rate: 61, limit: 60, status: "block" },
];

export default function ConsoleShield() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Shield</h2>

      {/* Density histogram */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Partition Density Distribution</p>
        <div className="flex items-end gap-2 h-24">
          {[3, 5, 12, 28, 45, 62, 48, 30, 15, 8].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-primary/70" style={{ height: `${h}%` }} />
              <span className="text-[9px] text-muted-foreground">{(i / 10).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic distribution */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Traffic Action Distribution</p>
        <div className="flex gap-4">
          {ACTION_DIST.map((d) => (
            <div key={d.action} className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <StatusBadge status={d.action.toLowerCase()} />
                <span className="text-xs font-mono text-muted-foreground">{d.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WAF Rules */}
      <div>
        <h3 className="text-sm font-medium mb-2">WAF Rules</h3>
        <ConsoleTable
          columns={[
            { key: "canonicalId", label: "Rule ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "pattern", label: "Pattern" },
            { key: "action", label: "Action", render: (v) => <StatusBadge status={String(v)} /> },
            { key: "hits", label: "Hits", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
          ]}
          rows={MOCK_WAF}
        />
      </div>

      {/* Rate Limits */}
      <div>
        <h3 className="text-sm font-medium mb-2">Rate Limits</h3>
        <ConsoleTable
          columns={[
            { key: "identity", label: "Identity", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "rate", label: "Rate", render: (v) => <span className="font-mono text-xs">{String(v)}/min</span> },
            { key: "limit", label: "Limit", render: (v) => <span className="font-mono text-xs">{String(v)}/min</span> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
          ]}
          rows={MOCK_RATE}
        />
      </div>
    </div>
  );
}
