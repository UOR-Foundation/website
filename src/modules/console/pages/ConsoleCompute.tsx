/**
 * UNS Console — Compute Page
 */

import { ConsoleTable, CanonicalIdBadge, CoherenceProofPanel, DensityGauge } from "../components/ConsoleUI";
import { useState } from "react";

const MOCK_FUNCTIONS = [
  { name: "hash-verify",    canonicalId: "urn:uor:derivation:sha256:fn001aabbccdd", deployedAt: "2026-02-20T14:00:00Z", invocations: 142 },
  { name: "json-transform", canonicalId: "urn:uor:derivation:sha256:fn002eeffaabb", deployedAt: "2026-02-21T10:30:00Z", invocations: 87 },
  { name: "sparql-proxy",   canonicalId: "urn:uor:derivation:sha256:fn003ccddee00", deployedAt: "2026-02-22T08:15:00Z", invocations: 315 },
];

const MOCK_TRACE = {
  "@type": "trace:ComputationTrace",
  "trace:functionCanonicalId": "urn:uor:derivation:sha256:fn001aabbccdd",
  "trace:duration": "12ms",
  "trace:density": 0.891,
  "cert:signature": { "@type": "cert:Signature", "cert:algorithm": "CRYSTALS-Dilithium-3", "cert:signedAt": "2026-02-23T10:00:00Z" },
};

export default function ConsoleCompute() {
  const [showDeploy, setShowDeploy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compute</h2>
        <button
          onClick={() => setShowDeploy(!showDeploy)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Deploy Function
        </button>
      </div>

      {showDeploy && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Paste JavaScript source:</p>
          <textarea
            className="w-full h-28 rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="export default function handler(input) { return { result: input }; }"
          />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            Submit
          </button>
        </div>
      )}

      {/* Functions */}
      <ConsoleTable
        columns={[
          { key: "name", label: "Name", render: (v) => <span className="font-medium">{String(v)}</span> },
          { key: "canonicalId", label: "Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
          { key: "deployedAt", label: "Deployed", render: (v) => <span className="text-xs">{new Date(String(v)).toLocaleDateString()}</span> },
          { key: "invocations", label: "Invocations", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
        ]}
        rows={MOCK_FUNCTIONS}
      />

      {/* Trace detail */}
      <div>
        <h3 className="text-sm font-medium mb-2">Latest Trace</h3>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Function:</span>
            <CanonicalIdBadge id={MOCK_TRACE["trace:functionCanonicalId"]} />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-mono">{MOCK_TRACE["trace:duration"]}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Density:</span>
            <DensityGauge value={MOCK_TRACE["trace:density"]} />
          </div>
          <CoherenceProofPanel proof={MOCK_TRACE} />
        </div>
      </div>
    </div>
  );
}
