import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const StoreDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.store}
      breadcrumbs={[{ label: "Object Store" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Object Store
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Content-addressed storage where every object gets a permanent ID
          derived from its content. Every byte accounted for, every object verifiable.
        </p>
        <p className="text-sm text-primary font-medium">IPFS-compatible · Content-addressed · Verifiable</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        The UOR Object Store writes data to content-addressed storage backed by IPFS.
        Objects are identified by their canonical content hash — store the same data twice
        and you get the same ID. Retrieval includes a verification proof that the content
        matches its address.
      </p>

      <DocCodeBlock
        label="Write an object"
        method="POST"
        code={`curl -X POST "https://api.uor.foundation/v1/store/write" \\
  -H "Content-Type: application/json" \\
  -d '{"content": {"hello": "world"}, "encoding": "json"}'`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Content Addressing"
            description="Every object's ID is derived from its content using SHA-256. Same content always produces the same ID — no registries, no coordination."
            href="/developers/store#addressing"
            cta="Learn addressing"
          />
          <DocFeatureCard
            title="IPFS Integration"
            description="Objects are pinned to IPFS for decentralized persistence. Retrieve through any IPFS gateway or directly via the UOR API."
            href="/developers/store#ipfs"
            cta="Configure IPFS"
          />
          <DocFeatureCard
            title="Verification"
            description="Every read returns a verification proof. Independently confirm that the content matches its declared address."
            href="/developers/store#verification"
            cta="Verify objects"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          method="POST"
          code={`// Write
const store = new UnsObjectStore();
const { cid } = await store.put({ message: "hello" });

// Read
const obj = await store.get(cid);
// obj.verified === true`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="KV Store"
            description="Key-value storage for fast lookups with content-addressed values and cryptographic receipts."
            href="/developers/kv"
          />
          <DocRelatedProduct
            title="Ledger"
            description="Verifiable SQL with cryptographic proofs for every query result set."
            href="/developers/ledger"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default StoreDocPage;
