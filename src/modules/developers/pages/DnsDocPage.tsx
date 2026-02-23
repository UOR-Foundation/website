import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const DnsDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.dns}
      breadcrumbs={[{ label: "Name Service (UNS)" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "The Problem", id: "problem" },
        { label: "What UNS Does", id: "what-uns-does" },
        { label: "How It Works", id: "how-it-works" },
        { label: "Platform Services", id: "services" },
        { label: "For AI Agents", id: "agents" },
        { label: "Get Started", id: "get-started" },
        { label: "Related", id: "related" },
      ]}
    >
      {/* Hero */}
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Name Service (UNS)
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          A complete network infrastructure platform built on IPv6 and the UOR Framework.
          Every resource gets a permanent, content-derived IPv6 address that makes it findable,
          verifiable, and protected across any network.
        </p>
        <p className="text-sm text-primary font-medium">Open protocol · IPv6 native · No account required</p>
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* The Problem */}
      <div id="problem" className="mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">The problem</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          When you visit a website, send an email, or call an API, your request passes through
          layers of infrastructure you cannot see or verify. A name is looked up in a directory.
          The directory points to a server. The server responds with data.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          At no point can you independently confirm that the name pointed to the right place,
          that the server is who it claims to be, or that the data you received is what was
          originally published.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every layer depends on a separate system to vouch for it: domain registrars for names,
          certificate authorities for identity, CDN providers for delivery. If any one of them
          fails, the entire chain breaks — and you have no way to detect it.
        </p>
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* What UNS does */}
      <div id="what-uns-does" className="mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">What UNS does</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          UNS combines the UOR Framework's content-addressing system with IPv6. The UOR Framework
          generates a unique mathematical fingerprint for any piece of content. UNS then projects
          that fingerprint into a standard IPv6 address, creating a direct link between <em>what
          something is</em> and <em>where it can be found</em> on the network.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Every resource gets a real, routable IPv6 address derived from its content. If the
          content changes, the address changes. If the address matches, the content is authentic.
          No external directory or certificate is needed. The address itself is the proof.
        </p>

        <DocCodeBlock
          label="Resolve a name"
          method="GET"
          code={`curl "https://api.uor.foundation/v1/resolve?name=alice.uor"
# Returns: IPv6 address, content ID, verification key, full identity`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* How it works */}
      <div id="how-it-works" className="mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">How it works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          UNS starts with the UOR Framework, which computes a unique fingerprint for any piece of
          content. That fingerprint is then mapped into four complementary forms:
        </p>

        <div className="space-y-4 mb-6">
          {[
            { title: "IPv6 address", desc: "For routing traffic across real networks. UNS uses a dedicated prefix (fd00:0075:6f72::/48) where every address is derived directly from content." },
            { title: "Content identifier", desc: "For retrieving exact data from any storage provider, ensuring you always get what you asked for." },
            { title: "Verification key", desc: "For confirming data has not been altered since it was published." },
            { title: "Full identity", desc: "The complete UOR fingerprint for lossless verification when maximum assurance is needed." },
          ].map(item => (
            <div key={item.title} className="rounded-lg border border-border/30 bg-card/20 px-4 py-3">
              <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          The IPv6 address handles routing. The full UOR identity handles verification. Together, they give
          every resource a network presence that is both globally reachable and independently verifiable.
          UNS also uses post-quantum cryptography (Dilithium-3) designed to remain secure against future
          quantum computers.
        </p>
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* Platform Services */}
      <div id="services">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Platform Services</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Resolver"
            description="Finds resources by name. Every lookup produces a verifiable answer you can check yourself — content ID, IPv6 address, verification key, and full identity."
            href="/developers/dns#how-it-works"
            cta="Learn more"
          />
          <DocFeatureCard
            title="Shield"
            description="Detects and blocks malicious traffic using mathematical pattern analysis, not signature databases that need constant updating."
            href="/developers/shield"
            cta="View Shield docs"
          />
          <DocFeatureCard
            title="Compute"
            description="Runs code at the network edge. Every execution produces a verifiable trace, so you can confirm exactly what ran and what it returned."
            href="/developers/compute"
            cta="View Compute docs"
          />
          <DocFeatureCard
            title="Store"
            description="Stores files and objects with permanent, content-derived addresses. Retrieval and verification are automatic."
            href="/developers/store"
            cta="View Store docs"
          />
          <DocFeatureCard
            title="Trust"
            description="Manages identity and access without passwords or external providers. Your identity is derived from your own credentials, verified mathematically."
            href="/developers/trust"
            cta="View Trust docs"
          />
          <DocFeatureCard
            title="KV & Ledger"
            description="Key-value storage and verifiable SQL ledger. Every read and write produces a cryptographic receipt."
            href="/developers/kv"
            cta="View KV docs"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* For AI Agents */}
      <div id="agents" className="mb-10">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">For AI Agents</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          UNS provides infrastructure that AI agents can trust. Every resource an agent resolves,
          retrieves, or computes is independently verifiable.
        </p>
        <div className="space-y-3">
          {[
            { step: "1", title: "Understand the value", desc: "UNS provides a full network infrastructure stack where every resource is identified by its content. Trust, routing, and verification are unified." },
            { step: "2", title: "Explore the services", desc: "Resolver, Shield, Compute, Store, KV, Ledger, Trust, Conduit, Mesh, and Agent Gateway — eleven services in one coherent system." },
            { step: "3", title: "Evaluate for your use case", desc: "If your system needs resilient, verifiable infrastructure where every response can be independently checked, UNS is designed for that." },
            { step: "4", title: "Access the module", desc: "Visit /uns for the module overview, service architecture, and API endpoints." },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{item.step}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* Get Started */}
      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Register your first name in three steps. No account, no coordination, no dependencies.
        </p>

        <h3 className="text-base font-display font-semibold text-foreground mt-6 mb-2">
          1. Generate a keypair
        </h3>
        <DocCodeBlock
          method="POST"
          code={`const keypair = await generateKeypair();
// Returns { publicKey, secretKey, algorithm: "dilithium3" }`}
        />

        <h3 className="text-base font-display font-semibold text-foreground mt-6 mb-2">
          2. Create a name record
        </h3>
        <DocCodeBlock
          method="POST"
          code={`const record = createRecord({
  name: "alice.uor",
  targets: [{ type: "ipv6", value: formatIpv6(contentHash) }],
  ttl: 3600,
});
const signed = signRecord(record, keypair);`}
        />

        <h3 className="text-base font-display font-semibold text-foreground mt-6 mb-2">
          3. Publish and resolve
        </h3>
        <DocCodeBlock
          method="POST"
          code={`await publishRecord(signed);
const result = await resolveByName("alice.uor");
// result.verified === true`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      {/* Related */}
      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="Trust & Auth"
            description="Post-quantum authentication and policy-based access control for name ownership verification."
            href="/developers/trust"
          />
          <DocRelatedProduct
            title="Shield (WAF)"
            description="Content analysis and filtering for name records using algebraic partition density."
            href="/developers/shield"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default DnsDocPage;
