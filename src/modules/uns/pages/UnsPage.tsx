import { Layout } from "@/modules/core";

const UnsPage = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Infrastructure
          </p>
          <h1 className="font-display text-fluid-page-title font-bold text-foreground">
            Name Service
          </h1>
          <p className="mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed max-w-4xl">
            A naming system where addresses come from the content itself.
            Look up any name, verify it independently, no central authority required.
          </p>
        </div>
      </section>

      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl">

          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Architecture
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            Core Capabilities
          </h2>
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
        </div>
      </section>

      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Reference
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            Record Types
          </h2>
          <div className="rounded-lg border border-border bg-card p-6">
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
        </div>
      </section>

      <section className="py-section-sm bg-background">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Dependencies
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
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
      </section>
    </Layout>
  );
};

export default UnsPage;
