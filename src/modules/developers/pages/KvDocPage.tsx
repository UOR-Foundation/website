import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const KvDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.kv}
      breadcrumbs={[{ label: "KV Store" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          KV Store
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Key-value storage with content-addressed values.
          Every write produces a cryptographic receipt. Every read is verifiable.
        </p>
        <p className="text-sm text-primary font-medium">Fast lookups · Verifiable writes · Receipts</p>
      </div>

      <DocCodeBlock
        label="Write a key"
        method="PUT"
        code={`const kv = new UnsKv();
const receipt = await kv.set("user:alice", { role: "admin" });
// receipt.verified === true`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Atomic Operations"
            description="Set, get, delete, and list keys with atomic consistency. Every mutation returns a receipt with input/output hashes."
            href="/developers/kv#operations"
            cta="Use operations"
          />
          <DocFeatureCard
            title="Cryptographic Receipts"
            description="Every write produces a receipt containing the content hash of the written value. Verify any historical write independently."
            href="/developers/kv#receipts"
            cta="Understand receipts"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          code={`const kv = new UnsKv();

// Write
await kv.set("config:theme", { mode: "dark" });

// Read
const value = await kv.get("config:theme");

// List
const keys = await kv.list("config:");

// Delete
await kv.delete("config:theme");`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="Object Store"
            description="Content-addressed blob storage for larger objects with IPFS integration."
            href="/developers/store"
          />
          <DocRelatedProduct
            title="Ledger"
            description="Relational queries with cryptographic proofs when you need more than key-value."
            href="/developers/ledger"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default KvDocPage;
