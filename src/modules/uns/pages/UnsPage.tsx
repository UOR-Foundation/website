import { Layout } from "@/modules/core";

/**
 * UoR Name Service (UNS) — Landing Page
 *
 * Placeholder page for the decentralized name resolution module.
 * Full implementation will include: name registration, forward/reverse
 * resolution, zone management, and record certification panels.
 */
const UnsPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background pt-[21px] md:pt-52 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Module v0.1.0 — Scaffold
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              UoR Name Service
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Decentralized name resolution via IPv6 content-addressing and UOR
              algebraic identity. DNS-equivalent services encoded within the UOR
              framework for secure, verifiable, location-independent routing.
            </p>
          </div>

          {/* Architecture Overview */}
          <div className="grid gap-6 md:grid-cols-2 mb-12">
            {[
              {
                title: "Forward Resolution",
                description:
                  "Resolve human-readable names to UOR identities — IPv6 ULA, CIDv1, Braille address, and full derivation ID.",
                endpoint: "/uns/resolve",
              },
              {
                title: "Reverse Resolution",
                description:
                  "Map IPv6 ULA addresses back to registered names, analogous to DNS PTR records but content-verified.",
                endpoint: "/uns/reverse",
              },
              {
                title: "Zone Management",
                description:
                  "Create and manage self-certifying zones. Each zone is anchored to a UOR address with a dedicated IPv6 /48 prefix.",
                endpoint: "/uns/zones",
              },
              {
                title: "Record Certification",
                description:
                  "Every record is issued a cert:UnsCertificate with derivation-based integrity proofs and epistemic grading.",
                endpoint: "/uns/certify",
              },
            ].map((item) => (
              <div
                key={item.endpoint}
                className="rounded-lg border border-border bg-card p-6"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {item.description}
                </p>
                <code className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded">
                  {item.endpoint}
                </code>
              </div>
            ))}
          </div>

          {/* Record Types */}
          <div className="rounded-lg border border-border bg-card p-6 mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              UNS Record Types
            </h2>
            <div className="grid gap-3">
              {[
                { type: "UAAA", analog: "A/AAAA", desc: "Name → IPv6 ULA address" },
                { type: "UCID", analog: "CNAME", desc: "Name → CIDv1 content identifier" },
                { type: "UGLP", analog: "—", desc: "Name → UOR Braille glyph address" },
                { type: "UPTR", analog: "PTR", desc: "IPv6 ULA → Name (reverse)" },
                { type: "UTXT", analog: "TXT", desc: "Arbitrary metadata" },
                { type: "UCRT", analog: "TLSA", desc: "Name → verification certificate" },
                { type: "USOA", analog: "SOA", desc: "Zone authority record" },
              ].map((r) => (
                <div
                  key={r.type}
                  className="flex items-center gap-4 p-3 rounded bg-muted/50"
                >
                  <code className="text-sm font-mono font-bold text-primary w-16">
                    {r.type}
                  </code>
                  <span className="text-xs text-muted-foreground w-16">
                    ≈ {r.analog}
                  </span>
                  <span className="text-sm text-foreground">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Module Dependencies
            </h2>
            <div className="flex flex-wrap gap-2">
              {["ring-core", "identity", "derivation", "resolver", "self-verify"].map(
                (dep) => (
                  <span
                    key={dep}
                    className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-mono"
                  >
                    {dep}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UnsPage;
