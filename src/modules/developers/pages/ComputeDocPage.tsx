import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const ComputeDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.compute}
      breadcrumbs={[{ label: "Compute" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Compute
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Deploy sandboxed functions with deterministic execution traces.
          Every invocation produces a signed, verifiable computation record.
        </p>
        <p className="text-sm text-primary font-medium">Content-addressed · Deterministic · Verifiable</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        UOR Compute runs your functions in a sandboxed environment where every input, output,
        and execution step is content-addressed. The same function with the same input always
        produces the same trace — making computation independently verifiable by any peer.
      </p>

      <DocCodeBlock
        label="Deploy a function"
        method="POST"
        code={`const fn = await deployFunction({
  name: "hash-content",
  code: \`(input) => computeCid(JSON.stringify(input))\`,
  runtime: "sandbox-v1",
});`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Edge Functions"
            description="Content-addressed functions deployed to the edge. Each function gets a canonical ID derived from its code — same code, same ID, always."
            href="/developers/compute#functions"
            cta="Deploy functions"
          />
          <DocFeatureCard
            title="Execution Traces"
            description="Every function invocation produces a computation trace with input hash, output hash, duration, and verification status. Traces are independently auditable."
            href="/developers/compute#traces"
            cta="View traces"
          />
          <DocFeatureCard
            title="Verification"
            description="Verify any computation by replaying the same input. If the output hash matches, the computation is proven correct. No trust required."
            href="/developers/compute#verification"
            cta="Verify computations"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          method="POST"
          code={`// 1. Deploy
const fn = await deployFunction({ name: "greet", code: '(x) => "Hello " + x' });

// 2. Invoke
const result = await invokeFunction(fn.canonicalId, "World");
// result.output === "Hello World"

// 3. Verify
const valid = await verifyExecution(result.trace);
// valid === true`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="Agent Gateway"
            description="Route typed messages between AI agents with algebraic injection detection."
            href="/developers/agents"
          />
          <DocRelatedProduct
            title="Object Store"
            description="Store function outputs as content-addressed objects for permanent retrieval."
            href="/developers/store"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default ComputeDocPage;
