import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowRight } from "lucide-react";

/* ── Example data ────────────────────────────────────────────── */
interface Example {
  id: string;
  label: string;
  tagline: string;
  code: string;
}

const examples: Example[] = [
  {
    id: "verify",
    label: "Verify Identity",
    tagline: "Every system can independently check the same mathematical rule — no trust required.",
    code: `curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"

# Response:
# {
#   "holds": true,
#   "neg_bnot": 43,
#   "succ": 43,
#   "epistemic_grade": "A",
#   "receipt": { ... }
# }
#
# holds: true means the foundation is intact.
# Grade "A" = algebraically proven.`,
  },
  {
    id: "address",
    label: "Content Address",
    tagline: "Same content → same address, on any machine, without coordination.",
    code: `curl -X POST "https://api.uor.foundation/v1/kernel/address/encode" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello", "encoding": "utf8"}'

# Response:
# {
#   "address": "uor:prime:2.3.5.7.11...",
#   "encoding": "utf8",
#   "deterministic": true
# }
#
# Identity derived from content, not location.
# Run it anywhere — you'll get the same address.`,
  },
  {
    id: "prove",
    label: "Generate Proof",
    tagline: "Get a portable, cryptographic proof for any value — anyone can verify it offline.",
    code: `curl "https://api.uor.foundation/v1/kernel/proof/critical?x=42"

# Response:
# {
#   "proven": true,
#   "proof": {
#     "neg_bnot": 43,
#     "succ": 43,
#     "identity_holds": true
#   },
#   "derivation_id": "d-abc123...",
#   "certificate": { ... }
# }
#
# A self-contained proof. Share it, cache it, verify it.`,
  },
  {
    id: "classify",
    label: "Classify Content",
    tagline: "Automatically resolve any value into its canonical algebraic type.",
    code: `curl "https://api.uor.foundation/v1/kernel/types/resolve?x=42"

# Response:
# {
#   "value": 42,
#   "type": "U7_Balanced",
#   "prime": false,
#   "factors": [2, 3, 7],
#   "quantum": 0,
#   "stratum": 3
# }
#
# Structural classification, not schema guessing.
# Works the same for every system that speaks UOR.`,
  },
  {
    id: "store",
    label: "Store to IPFS",
    tagline: "Pin any object to IPFS with a dual content address — algebraic + retrieval.",
    code: `curl -X POST "https://api.uor.foundation/v1/store/write" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/data.json"}'

# Response:
# {
#   "uor_cid": "bafk...",     ← algebraic identity
#   "gateway_cid": "Qm...",   ← IPFS retrieval
#   "gateway_url": "https://...",
#   "sha256": "a1b2c3...",
#   "byte_length": 1024
# }
#
# Two CIDs: one for math, one for retrieval.`,
  },
  {
    id: "correlate",
    label: "Correlate Objects",
    tagline: "Measure structural similarity between any two objects — no ML model needed.",
    code: `curl "https://api.uor.foundation/v1/kernel/correlate?x=42&y=43"

# Response:
# {
#   "fidelity": 0.92,
#   "hamming_distance": 1,
#   "recommendation": "closeMatch",
#   "skos_relation": "skos:closeMatch"
# }
#
# Algebraic proximity, not embeddings.
# Deterministic, explainable, reproducible.`,
  },
  {
    id: "hologram",
    label: "Hologram",
    tagline: "One object, one hash, every standard on earth — each a viewing angle of the same identity.",
    code: `# Every UOR object is a hologram: 17 projections from one SHA-256 hash.

curl "https://api.uor.foundation/v1/webfinger\\
  ?resource=acct:a1b2c3d4e5f67890@uor.foundation"

# Response (RFC 7033 JRD):
# {
#   "subject": "acct:a1b2c3d4e5f67890@uor.foundation",
#   "links": [
#     { "rel": "self",      "type": "application/did+ld+json",  "href": "did:uor:bafyrei..." },
#     { "rel": "self",      "type": "application/activity+json","href": "https://.../ap/objects/a1b2..." },
#     { "rel": "self",      "type": "application/json",         "href": "at://did:uor:.../app.uor.object" },
#     { "rel": "canonical", "type": "application/ld+json",      "href": "urn:uor:derivation:sha256:..." }
#   ]
# }
#
# DID, ActivityPub, AT Protocol, Solid, OIDC, GS1, OCI,
# SCITT, MLS, DNS-SD, STAC, Croissant — all from one hash.`,
  },
];

/* ── Copy button ─────────────────────────────────────────────── */
const CopyBtn = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const raw = text.split("\n").filter(l => !l.startsWith("#")).join("\n").trim();
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(raw); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors z-10"
      aria-label="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

/* ── Component ───────────────────────────────────────────────── */
const BuildWithUOR = () => {
  const [active, setActive] = useState(0);
  const current = examples[active];

  return (
    <section className="py-14">
      <div className="container max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
          Build with UOR
        </h2>

        <div className="flex flex-col md:flex-row gap-0 rounded-xl border border-border/40 overflow-hidden">
          {/* Left tabs */}
          <div className="md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-border/30 bg-card/10">
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible">
              {examples.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => setActive(i)}
                  className={`text-left px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    i === active
                      ? "text-primary bg-primary/8 border-l-2 border-l-primary"
                      : "text-foreground/60 hover:text-foreground hover:bg-card/20 border-l-2 border-l-transparent"
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right code panel */}
          <div className="flex-1 min-w-0 relative bg-card/5">
            {/* Tab bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
              <span className="text-xs font-mono text-muted-foreground">curl</span>
            </div>

            <CopyBtn text={current.code} />

            <pre className="p-5 text-[13px] font-mono leading-relaxed overflow-x-auto min-h-[280px]">
              <code>
                {current.code.split("\n").map((line, i) => (
                  <span key={i} className={line.trimStart().startsWith("#") ? "text-muted-foreground/50" : "text-foreground/90"}>
                    {line}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground max-w-md">{current.tagline}</p>
              <Link
                to="/api"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Try in API Explorer <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          No account, no API key — every response includes a cryptographic receipt.{" "}
          <Link to="/api" className="text-primary hover:underline">Full API reference →</Link>
        </p>
      </div>
    </section>
  );
};

export default BuildWithUOR;
