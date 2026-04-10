import { Layout } from "@/modules/platform/core";

const UnsPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background pt-28 md:pt-52 pb-16">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Module v0.1.0
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              UoR Name Service
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A naming system where addresses come from the content itself.
              Look up any name, verify it independently, no central authority required.
            </p>
          </div>

          {/* Architecture Overview */}
          <div className="grid gap-6 md:grid-cols-2 mb-12">
            {[
              {
                title: "Forward Resolution",
                description:
                  "Turn a human-readable name into a verified address. One lookup, one result, fully traceable.",
                endpoint: "/uns/resolve",
              },
              {
                title: "Reverse Resolution",
                description:
                  "Go from an address back to its registered name. Like reverse DNS, but the result is self-verifying.",
                endpoint: "/uns/reverse",
              },
              {
                title: "Zone Management",
                description:
                  "Create and manage zones. Each zone has its own address space and verifies itself. no external certificate authority needed.",
                endpoint: "/uns/zones",
              },
              {
                title: "Record Certification",
                description:
                  "Every record comes with a built-in proof of integrity. Anyone can verify it, anywhere, without special tools.",
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
                { type: "UAAA", analog: "A/AAAA", desc: "Name → address" },
                { type: "UCID", analog: "CNAME", desc: "Name → content address" },
                { type: "UGLP", analog: "n/a", desc: "Name → compact visual address" },
                { type: "UPTR", analog: "PTR", desc: "Address → name (reverse)" },
                { type: "UTXT", analog: "TXT", desc: "Arbitrary metadata" },
                { type: "UCRT", analog: "TLSA", desc: "Name → integrity proof" },
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
