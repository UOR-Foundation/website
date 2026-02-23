import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const GettingStartedDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars["getting-started"]}
      breadcrumbs={[{ label: "Getting Started" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "First API Call", id: "first-call" },
        { label: "Content Addressing", id: "addressing" },
        { label: "Endpoint Map", id: "endpoints" },
        { label: "Next Steps", id: "next" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Getting Started
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Zero to first API call in 5 minutes. No account. No SDK. Just curl.
        </p>
        <p className="text-sm text-primary font-medium">No prerequisites · No account required</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-8">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Base URL:</strong>{" "}
          <code className="text-primary font-mono">https://api.uor.foundation/v1</code>
        </p>
      </div>

      {/* Step 1 */}
      <div id="first-call">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
          Step 1 — Verify the foundation
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Before using an API, know it works. This call confirms the mathematical identity
          the addressing scheme is built on.
        </p>
        <DocCodeBlock
          label="Verify core identity"
          method="GET"
          code={`curl "https://api.uor.foundation/v1/kernel/op/verify?x=42"`}
        />
        <p className="text-xs text-muted-foreground mt-2">
          <code className="text-primary/80">holds: true</code> confirms the foundation is intact.{" "}
          <code className="text-primary/80">epistemic_grade: "A"</code> = algebraically proven.
        </p>
      </div>

      <div className="h-px bg-border/30 my-8" />

      {/* Step 2 */}
      <div id="addressing">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
          Step 2 — Get a content address
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Every piece of content gets a permanent address derived from that content.
          Same input → same address, on any system.
        </p>
        <DocCodeBlock
          label="Encode content"
          method="POST"
          code={`curl -X POST "https://api.uor.foundation/v1/kernel/address/encode" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello", "encoding": "utf8"}'`}
        />
      </div>

      <div className="h-px bg-border/30 my-8" />

      {/* Step 3 */}
      <div id="endpoints">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
          Step 3 — Explore the endpoint map
        </h2>
        <DocCodeBlock
          label="Navigate all endpoints"
          method="GET"
          code={`curl "https://api.uor.foundation/v1/navigate"`}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Returns the full index of all 48 endpoints, grouped by capability.
        </p>
      </div>

      <div className="h-px bg-border/30 my-8" />

      {/* Next steps */}
      <div id="next">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Next Steps</h2>
        <div className="space-y-3">
          {[
            { label: "API Reference", desc: "All 48 endpoints with examples", href: "/api" },
            { label: "Core Concepts", desc: "Content addressing, verification, trust", href: "/developers/concepts" },
            { label: "TypeScript SDK", desc: "Install @uns/sdk and start building", href: "/developers/sdk" },
          ].map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="group flex items-center justify-between rounded-lg border border-border/40 p-4 hover:border-primary/30 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground font-body">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default GettingStartedDocPage;
