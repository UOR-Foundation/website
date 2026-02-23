import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const AgentsDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.agents}
      breadcrumbs={[{ label: "Agent Gateway" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Agent Gateway
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Register AI agents, route typed messages between them, and
          detect prompt injection — algebraically, not heuristically.
        </p>
        <p className="text-sm text-primary font-medium">Agentic AI · Type-safe routing · Injection detection</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        The Agent Gateway provides typed message routing between registered AI agents.
        Messages are morphism-typed — the gateway verifies that message types are compatible
        before delivery. Prompt injection is detected using the same algebraic partition analysis
        as Shield, applied at the message level.
      </p>

      <DocCodeBlock
        label="Register an agent"
        method="POST"
        code={`const gw = new UnsAgentGateway();
await gw.registerAgent({
  agentId: "analyst-01",
  capabilities: ["summarize", "classify"],
  morphismTypes: [{ from: "text", to: "summary" }],
});`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Agent Registration"
            description="Register agents with their capabilities and morphism types. The gateway builds a routing table from declared type signatures."
            href="/developers/agents#registration"
            cta="Register agents"
          />
          <DocFeatureCard
            title="Typed Message Routing"
            description="Messages carry morphism types (e.g., text→summary). The gateway finds the best agent based on type compatibility — not string matching."
            href="/developers/agents#routing"
            cta="Route messages"
          />
          <DocFeatureCard
            title="Injection Detection"
            description="Every message is analysed for injection patterns using algebraic partition density. Alerts fire before the message reaches the target agent."
            href="/developers/agents#injection"
            cta="Configure detection"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          code={`import { UnsAgentGateway, buildAgentMessage } from "@uns/sdk";

const gw = new UnsAgentGateway();

// Register
await gw.registerAgent({
  agentId: "writer-01",
  capabilities: ["draft"],
  morphismTypes: [{ from: "outline", to: "draft" }],
});

// Route a message
const msg = buildAgentMessage("outline", { topic: "UOR" }, "writer-01");
const result = await gw.routeMessage(msg);
// result.delivered === true`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="Compute"
            description="Deploy the functions your agents invoke with deterministic execution traces."
            href="/developers/compute"
          />
          <DocRelatedProduct
            title="Shield (WAF)"
            description="The same algebraic analysis powering injection detection, applied at the network edge."
            href="/developers/shield"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default AgentsDocPage;
