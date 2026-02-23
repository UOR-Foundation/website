/**
 * UNS Console — Overview Page
 */

import { StatCard, ConsoleTable, CanonicalIdBadge, StatusBadge, DensityGauge } from "../components/ConsoleUI";

const MOCK_RECORDS = [
  { name: "api.example.uns", target: "urn:uor:derivation:sha256:f1a2b3c4d5e60718293a4b5c6d7e8f90", status: "active" },
  { name: "app.demo.uns",    target: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff", status: "active" },
  { name: "old.test.uns",    target: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabb", status: "expired" },
];

const MOCK_ALERTS = [
  { type: "injection", detectedAt: "2026-02-23T09:12:00Z", messageId: "urn:uor:derivation:sha256:alert001" },
  { type: "rate-limit", detectedAt: "2026-02-23T08:45:00Z", messageId: "urn:uor:derivation:sha256:alert002" },
];

export default function ConsoleOverview() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Overview</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Records" value={42} sub="UNS name records" />
        <StatCard label="Shield Events (24h)" value="1,204" sub="Partition analysis" />
        <StatCard label="Compute Invocations" value={318} sub="Content-addressed functions" />
        <StatCard label="Store Objects" value="2.4k" sub="Deduplicated by canonical ID" />
      </div>

      {/* Density sparkline placeholder */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Partition Density (24h)</p>
        <div className="flex items-end gap-1 h-16">
          {Array.from({ length: 24 }, (_, i) => {
            const h = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
            return (
              <div key={i} className="flex-1 rounded-t bg-primary/70 transition-all" style={{ height: `${h}%` }} />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>00:00</span><span>12:00</span><span>Now</span>
        </div>
      </div>

      {/* Recent Records */}
      <div>
        <h3 className="text-sm font-medium mb-2">Recent Records</h3>
        <ConsoleTable
          columns={[
            { key: "name", label: "Name" },
            { key: "target", label: "Target", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
          ]}
          rows={MOCK_RECORDS}
        />
      </div>

      {/* Recent Alerts */}
      <div>
        <h3 className="text-sm font-medium mb-2">Recent Alerts</h3>
        <ConsoleTable
          columns={[
            { key: "type", label: "Type", render: (v) => <StatusBadge status={v === "injection" ? "block" : "warn"} /> },
            { key: "detectedAt", label: "Detected", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleTimeString()}</span> },
            { key: "messageId", label: "Message ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
          ]}
          rows={MOCK_ALERTS}
        />
      </div>
    </div>
  );
}
