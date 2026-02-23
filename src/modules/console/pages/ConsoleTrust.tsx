/**
 * UNS Console — Trust Page
 */

import { ConsoleTable, CanonicalIdBadge, StatusBadge } from "../components/ConsoleUI";

const MOCK_IDENTITY = {
  canonicalId: "urn:uor:derivation:sha256:op001aabbccddeeff00112233445566778899aabbccddeeff0011223344556677",
  algorithm: "CRYSTALS-Dilithium-3",
  publicKeyHash: "sha256:aabbccdd…",
};

const MOCK_SESSIONS = [
  { sessionId: "sess-001", identity: "urn:uor:derivation:sha256:agent001aabb", expiresAt: "2026-02-23T12:00:00Z", status: "active" },
  { sessionId: "sess-002", identity: "urn:uor:derivation:sha256:agent002ccdd", expiresAt: "2026-02-23T11:30:00Z", status: "active" },
  { sessionId: "sess-003", identity: "urn:uor:derivation:sha256:agent003eeff", expiresAt: "2026-02-22T23:00:00Z", status: "expired" },
];

const MOCK_POLICIES = [
  { resource: "urn:uor:derivation:sha256:res001", rules: 3, validUntil: "2027-01-01" },
  { resource: "urn:uor:derivation:sha256:res002", rules: 1, validUntil: "2026-12-31" },
];

export default function ConsoleTrust() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Trust</h2>

      {/* Identity panel */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Operator Identity</p>
        <div className="flex items-center gap-3">
          <CanonicalIdBadge id={MOCK_IDENTITY.canonicalId} chars={32} />
        </div>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <span>Algorithm: <code className="text-foreground">{MOCK_IDENTITY.algorithm}</code></span>
          <span>Key: <code className="text-foreground">{MOCK_IDENTITY.publicKeyHash}</code></span>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h3 className="text-sm font-medium mb-2">Active Sessions</h3>
        <ConsoleTable
          columns={[
            { key: "sessionId", label: "Session", render: (v) => <code className="text-xs font-mono">{String(v)}</code> },
            { key: "identity", label: "Identity", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "expiresAt", label: "Expires", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleString()}</span> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
          ]}
          rows={MOCK_SESSIONS}
        />
      </div>

      {/* Policies */}
      <div>
        <h3 className="text-sm font-medium mb-2">Access Policies</h3>
        <ConsoleTable
          columns={[
            { key: "resource", label: "Resource", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "rules", label: "Rules", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
            { key: "validUntil", label: "Valid Until", render: (v) => <span className="text-xs">{String(v)}</span> },
          ]}
          rows={MOCK_POLICIES}
        />
      </div>
    </div>
  );
}
