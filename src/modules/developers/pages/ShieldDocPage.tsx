import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const ShieldDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.shield}
      breadcrumbs={[{ label: "Shield (WAF)" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Shield (WAF)
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Algebraic content analysis using prime factorization density.
          No signature databases. No pattern updates. Mathematics doesn't go out of date.
        </p>
        <p className="text-sm text-primary font-medium">Zero-day resistant · Algebraic · Real-time</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Shield analyses content at the byte level using partition density — the ratio of
        novel (irreducible) bytes to repeated (reducible) bytes. Malicious payloads have
        distinct density signatures that algebraic analysis detects without needing
        prior knowledge of the attack pattern.
      </p>

      <DocCodeBlock
        label="Analyse content"
        method="POST"
        code={`curl -X POST "https://api.uor.foundation/v1/bridge/partition" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "SELECT * FROM users; DROP TABLE users;--"}'`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Content Analysis"
            description="Every piece of content is factored into its prime components. The density ratio reveals structural anomalies that signatures miss."
            href="/developers/shield#analysis"
            cta="Analyse content"
          />
          <DocFeatureCard
            title="Partition Density"
            description="A single score (0–1) measuring content novelty. Low density = repetitive patterns typical of injection attacks. High density = novel, legitimate content."
            href="/developers/shield#density"
            cta="Understand density"
          />
          <DocFeatureCard
            title="Middleware"
            description="Drop Shield into any request pipeline as middleware. Automatic analysis, configurable thresholds, zero-latency decisions."
            href="/developers/shield#middleware"
            cta="Add middleware"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          code={`import { shieldMiddleware } from "@uns/sdk";

// Add to your request pipeline
app.use(shieldMiddleware({
  threshold: 0.3,      // Block below this density
  action: "block",     // "block" | "log" | "challenge"
}));`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="Trust & Auth"
            description="Post-quantum authentication to complement Shield's content-level analysis."
            href="/developers/trust"
          />
          <DocRelatedProduct
            title="Agent Gateway"
            description="Detect prompt injection in AI agent messages using the same algebraic analysis."
            href="/developers/agents"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default ShieldDocPage;
