/**
 * UNS Console — DNS Records Page
 */

import { ConsoleTable, CanonicalIdBadge, IPv6Badge, StatusBadge, CoherenceProofPanel } from "../components/ConsoleUI";
import { useState } from "react";

const MOCK_RECORDS = [
  { name: "api.example.uns", ipv6: "fd00:0075:6f72:f1a2:b3c4::1", services: "HTTP:443, gRPC:9090", validUntil: "2027-01-01", status: "active", canonicalId: "urn:uor:derivation:sha256:f1a2b3c4d5e60718293a4b5c6d7e8f90aabbccdd00112233445566778899aabb" },
  { name: "app.demo.uns",    ipv6: "fd00:0075:6f72:0011:2233::1", services: "HTTP:443",            validUntil: "2026-12-15", status: "active", canonicalId: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff00112233445566778899aabbccddeeff" },
  { name: "old.legacy.uns",  ipv6: "fd00:0075:6f72:dead:beef::1", services: "HTTP:80",             validUntil: "2025-06-01", status: "expired", canonicalId: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb" },
];

const MOCK_PROOF = { "@type": "proof:CoherenceProof", "proof:verified": true, "proof:density": 0.847, "proof:timestamp": "2026-02-23T10:00:00Z" };

export default function ConsoleDns() {
  const [selected, setSelected] = useState<typeof MOCK_RECORDS[0] | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">DNS Records</h2>
        <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          New Record
        </button>
      </div>

      <ConsoleTable
        columns={[
          { key: "name", label: "Name", render: (v) => <span className="font-medium">{String(v)}</span> },
          { key: "ipv6", label: "Target IPv6", render: (v) => <IPv6Badge address={String(v)} /> },
          { key: "services", label: "Services", render: (v) => <span className="text-xs">{String(v)}</span> },
          { key: "validUntil", label: "Valid Until", render: (v) => <span className="text-xs">{String(v)}</span> },
          { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
          { key: "canonicalId", label: "Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
        ]}
        rows={MOCK_RECORDS.map(r => ({ ...r, _click: () => setSelected(r) }))}
      />

      {selected && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <CanonicalIdBadge id={selected.canonicalId} chars={64} />
          <CoherenceProofPanel proof={MOCK_PROOF} />
        </div>
      )}
    </div>
  );
}
