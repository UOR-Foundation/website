import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const LedgerDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.ledger}
      breadcrumbs={[{ label: "Ledger" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Ledger
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Verifiable SQL. Every query returns a cryptographic proof of its result set.
          Every state transition is traceable.
        </p>
        <p className="text-sm text-primary font-medium">SQL · Cryptographic proofs · State transitions</p>
      </div>

      <DocCodeBlock
        label="Query with proof"
        method="GET"
        code={`const ledger = new UnsLedger();
const result = await ledger.query("SELECT * FROM records WHERE owner = 'alice'");
// result.proof.verified === true
// result.rows === [...]`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Queries & Proofs"
            description="Every SQL query returns both the result set and a cryptographic proof. Verify that the results came from the declared state — no trust required."
            href="/developers/ledger#queries"
            cta="Run queries"
          />
          <DocFeatureCard
            title="State Transitions"
            description="Every write is a state transition with a before-hash and after-hash. The complete history is an auditable chain of verifiable transitions."
            href="/developers/ledger#transitions"
            cta="Track transitions"
          />
          <DocFeatureCard
            title="Schema Migrations"
            description="Migrations are versioned state transitions. Each migration is content-addressed — same migration, same ID, across all environments."
            href="/developers/ledger#migrations"
            cta="Manage schema"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          code={`const ledger = new UnsLedger();

// Create table
await ledger.migrate({
  version: 1,
  sql: "CREATE TABLE notes (id TEXT PRIMARY KEY, content TEXT, owner TEXT)",
});

// Insert
await ledger.execute("INSERT INTO notes VALUES ('n1', 'Hello', 'alice')");

// Query with proof
const result = await ledger.query("SELECT * FROM notes WHERE owner = 'alice'");
console.log(result.proof.stateHash); // cryptographic proof of result`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="KV Store"
            description="Simpler key-value storage when you don't need SQL queries."
            href="/developers/kv"
          />
          <DocRelatedProduct
            title="Object Store"
            description="Content-addressed blob storage for unstructured data."
            href="/developers/store"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default LedgerDocPage;
