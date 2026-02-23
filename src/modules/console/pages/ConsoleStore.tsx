/**
 * UNS Console — Store Page
 */

import { ConsoleTable, CanonicalIdBadge, StatusBadge } from "../components/ConsoleUI";
import { useState } from "react";

const MOCK_BUCKETS = [
  { name: "assets", objects: 124 },
  { name: "models", objects: 18 },
  { name: "snapshots", objects: 342 },
];

const MOCK_OBJECTS = [
  { key: "logo.png",           canonicalId: "urn:uor:derivation:sha256:obj001aabbccdd", size: "24.3 KB", contentType: "image/png",        verified: true },
  { key: "model-v2.bin",       canonicalId: "urn:uor:derivation:sha256:obj002eeff0011", size: "4.2 MB",  contentType: "application/octet", verified: true },
  { key: "snapshot-2026-02.json", canonicalId: "urn:uor:derivation:sha256:obj003aabb2233", size: "1.1 MB",  contentType: "application/json",  verified: false },
];

export default function ConsoleStore() {
  const [bucket, setBucket] = useState("assets");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Store</h2>

      {/* Bucket list */}
      <div className="flex gap-2">
        {MOCK_BUCKETS.map((b) => (
          <button
            key={b.name}
            onClick={() => setBucket(b.name)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              bucket === b.name
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {b.name} <span className="ml-1 opacity-60">({b.objects})</span>
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">Drag & drop file to upload</p>
        <p className="text-xs text-muted-foreground mt-1">Returns canonical ID and IPv6 content address on completion</p>
      </div>

      {/* Object browser */}
      <ConsoleTable
        columns={[
          { key: "key", label: "Key", render: (v) => <span className="font-medium text-sm">{String(v)}</span> },
          { key: "canonicalId", label: "Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
          { key: "size", label: "Size", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
          { key: "contentType", label: "Type", render: (v) => <span className="text-xs">{String(v)}</span> },
          { key: "verified", label: "Verified", render: (v) => (
            <StatusBadge status={v ? "pass" : "error"} />
          )},
        ]}
        rows={MOCK_OBJECTS}
      />
    </div>
  );
}
