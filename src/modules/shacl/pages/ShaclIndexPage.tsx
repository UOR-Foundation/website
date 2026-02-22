import Layout from "@/modules/core/components/Layout";
import { Copy, ExternalLink, AlertTriangle } from "lucide-react";

const SHAPES = [
  { file: "datum-term-disjoint.ttl", name: "Datum/Term Disjointness", ref: "§3.2.2", invariant: "schema:Datum and schema:Term are owl:disjointWith — values and syntax strictly separated", gap: false },
  { file: "succ-composition.ttl", name: "Succ Composition", ref: "§3.2.3", invariant: "op:succ must have op:composedOf [op:neg, op:bnot] — critical identity in ontology", gap: false },
  { file: "partition-cardinality.ttl", name: "Partition Cardinality", ref: "§4.1", invariant: "|Irr|+|Red|+|Unit|+|Ext| = 2ⁿ. At Q0, sum must equal 256", gap: true },
  { file: "cert-required-fields.ttl", name: "Certificate Required Fields", ref: "§3.3", invariant: "cert:Certificate must have cert:verified (boolean) and cert:quantum (integer)", gap: false },
  { file: "trace-certifiedby.ttl", name: "Trace CertifiedBy", ref: "§3.3", invariant: "trace:ComputationTrace must have trace:certifiedBy → cert:Certificate", gap: false },
  { file: "transition-frames.ttl", name: "Transition Frames", ref: "§3.4", invariant: "state:Transition must have state:from and state:to (both state:Frame)", gap: false },
  { file: "critical-identity-proof.ttl", name: "Critical Identity Proof", ref: "§2.3", invariant: "proof:CriticalIdentityProof must have proof:verified = true", gap: false },
  { file: "derivation-id-format.ttl", name: "Derivation ID Format", ref: "§3.3", invariant: "derivation_id must match urn:uor:derivation:sha256:[a-f0-9]{64}", gap: false },
  { file: "partition-density-range.ttl", name: "Partition Density Range", ref: "§4.1", invariant: "partition:density must be in [0.0, 1.0]", gap: false },
];

export default function ShaclIndexPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-foreground mb-3">SHACL Constraint Shapes</h1>
          <p className="text-muted-foreground text-lg mb-8">
            9 SHACL shapes encoding foundational UOR invariants from the whitepaper.
            Each shape validates a structural requirement of the framework.
          </p>

          {/* Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-foreground font-semibold">Shape</th>
                  <th className="text-left py-3 px-2 text-foreground font-semibold">File</th>
                  <th className="text-left py-3 px-2 text-foreground font-semibold">§</th>
                  <th className="text-left py-3 px-2 text-foreground font-semibold">Invariant</th>
                </tr>
              </thead>
              <tbody>
                {SHAPES.map((s, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium text-foreground">
                      {s.name}
                      {s.gap && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Gap
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <a href={`/shacl/${s.file}`} target="_blank" className="text-primary hover:underline font-mono text-xs flex items-center gap-1">
                        {s.file} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{s.ref}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{s.invariant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Conformance gap note */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Conformance Gap: partition-cardinality.ttl</p>
                <p className="text-xs text-muted-foreground">
                  Whitepaper §4.1 defines UnitSet as "multiplicatively invertible elements — in Rₙ, the odd integers."
                  At Q0 (R₈), there are 128 odd integers (1, 3, 5, …, 255) that are units.
                  The current API returns unit cardinality = 2 (only 1 and 255). This shape flags the gap.
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            <a href="/conformance" className="text-sm px-4 py-2 border border-border rounded hover:bg-muted transition-colors text-foreground">
              PRISM Q0 Conformance Testing →
            </a>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            These shapes are discoverable via{" "}
            <a href="/.well-known/uor.json" target="_blank" className="text-primary hover:underline">/.well-known/uor.json</a>{" "}
            under the <code>shacl_shapes</code> key.
          </p>
        </div>
      </div>
    </Layout>
  );
}
