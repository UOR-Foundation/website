/**
 * UNS Console — Agents Page
 */

import { ConsoleTable, CanonicalIdBadge, MorphismBadge, StatusBadge } from "../components/ConsoleUI";

const MOCK_AGENTS = [
  { canonicalId: "urn:uor:derivation:sha256:agentA001aabbccdd", model: "gpt-5", registeredAt: "2026-02-20" },
  { canonicalId: "urn:uor:derivation:sha256:agentB002eeff0011", model: "gemini-3-pro", registeredAt: "2026-02-21" },
  { canonicalId: "urn:uor:derivation:sha256:agentC003aabb2233", model: "claude-opus", registeredAt: "2026-02-22" },
];

const MOCK_MESSAGES = [
  { from: "urn:uor:derivation:sha256:agentA001aabbccdd", to: "urn:uor:derivation:sha256:agentB002eeff0011", type: "morphism:Isometry", time: "10:15:32" },
  { from: "urn:uor:derivation:sha256:agentB002eeff0011", to: "urn:uor:derivation:sha256:agentC003aabb2233", type: "morphism:Transform", time: "10:15:34" },
  { from: "urn:uor:derivation:sha256:agentC003aabb2233", to: "urn:uor:derivation:sha256:agentA001aabbccdd", type: "morphism:Embedding", time: "10:15:36" },
  { from: "urn:uor:derivation:sha256:agentA001aabbccdd", to: "morphism:broadcast", type: "morphism:Action", time: "10:15:38" },
];

const MOCK_ALERTS = [
  { messageId: "urn:uor:derivation:sha256:alert-msg-001", sender: "urn:uor:derivation:sha256:agentA001aabbccdd", drift: 6.8, threshold: 4.2, detectedAt: "10:12:00" },
];

export default function ConsoleAgents() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agents</h2>
        {MOCK_ALERTS.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
            {MOCK_ALERTS.length} Alert{MOCK_ALERTS.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Registered agents */}
      <div>
        <h3 className="text-sm font-medium mb-2">Registered Agents</h3>
        <ConsoleTable
          columns={[
            { key: "canonicalId", label: "Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "model", label: "Model", render: (v) => <code className="text-xs">{String(v)}</code> },
            { key: "registeredAt", label: "Registered", render: (v) => <span className="text-xs">{String(v)}</span> },
          ]}
          rows={MOCK_AGENTS}
        />
      </div>

      {/* Message feed */}
      <div>
        <h3 className="text-sm font-medium mb-2">Message Feed</h3>
        <div className="space-y-1.5">
          {MOCK_MESSAGES.map((m, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              <span className="text-muted-foreground font-mono">{m.time}</span>
              <CanonicalIdBadge id={m.from} chars={12} />
              <span className="text-muted-foreground">→</span>
              <CanonicalIdBadge id={m.to} chars={12} />
              <MorphismBadge type={m.type} />
            </div>
          ))}
        </div>
      </div>

      {/* Injection alerts */}
      <div>
        <h3 className="text-sm font-medium mb-2">Injection Alerts</h3>
        <ConsoleTable
          columns={[
            { key: "messageId", label: "Message ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "sender", label: "Sender", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "drift", label: "Drift", render: (v) => <span className="font-mono text-xs text-destructive">{String(v)}</span> },
            { key: "threshold", label: "Threshold", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
            { key: "detectedAt", label: "Detected", render: (v) => <span className="text-xs">{String(v)}</span> },
          ]}
          rows={MOCK_ALERTS}
        />
      </div>
    </div>
  );
}
