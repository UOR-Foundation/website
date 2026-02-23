import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const SdkDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.sdk}
      breadcrumbs={[{ label: "TypeScript SDK" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Installation", id: "installation" },
        { label: "Quick Start", id: "get-started" },
        { label: "Services", id: "services" },
        { label: "Related", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          TypeScript SDK
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          One <code className="text-primary/80">UnsClient</code> class wrapping all UOR services
          with full TypeScript type safety. Install, initialize, build.
        </p>
        <p className="text-sm text-primary font-medium">@uns/sdk · Type-safe · All services</p>
      </div>

      <div id="installation" className="mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Installation</h2>
        <DocCodeBlock
          label="Install"
          code={`npm install @uns/sdk`}
        />
      </div>

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Quick Start</h2>
        <DocCodeBlock
          code={`import { UnsClient, generateKeypair } from "@uns/sdk";

// Generate identity
const keypair = await generateKeypair();

// Initialize client
const client = new UnsClient({
  nodeUrl: "https://node.uor.foundation",
  identity: keypair,
});

// Derive a content address
const id = await client.computeCanonicalId({ hello: "world" });

// Store an object
const { cid } = await client.store.put({ message: "hello" });

// Resolve a name
const record = await client.dns.resolve("alice.uor");`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="services">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Services</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="client.dns"
            description="Name resolution — register, resolve, and verify content-addressed names."
            href="/developers/dns"
            cta="Name Service docs"
          />
          <DocFeatureCard
            title="client.compute"
            description="Edge functions — deploy, invoke, and verify deterministic computations."
            href="/developers/compute"
            cta="Compute docs"
          />
          <DocFeatureCard
            title="client.store"
            description="Object storage — content-addressed write, read, and verify."
            href="/developers/store"
            cta="Object Store docs"
          />
          <DocFeatureCard
            title="client.kv"
            description="Key-value storage — fast lookups with cryptographic receipts."
            href="/developers/kv"
            cta="KV Store docs"
          />
          <DocFeatureCard
            title="client.shield"
            description="Content analysis — algebraic partition density for injection detection."
            href="/developers/shield"
            cta="Shield docs"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="API Reference"
            description="48 endpoints with working curl examples and JSON-LD responses."
            href="/api"
          />
          <DocRelatedProduct
            title="Getting Started"
            description="First API call in 5 minutes — no SDK required."
            href="/developers/getting-started"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default SdkDocPage;
