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
      breadcrumbs={[{ label: "Name Service" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      {/* Hero */}
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Name Service
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Register, resolve, and verify content-addressed names on the UOR network.
          Your identity derived from your content — not assigned by a registry.
        </p>
        <p className="text-sm text-primary font-medium">Open protocol · No account required</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        The UOR Name Service maps human-readable names to content-addressed identifiers.
        Every name resolves to a cryptographically verifiable record — same content, same address,
        on any system. Names are signed with post-quantum Dilithium-3 keys and distributed
        across a Kademlia DHT for decentralized resolution.
      </p>

      <DocCodeBlock
        label="Resolve a name"
        method="GET"
        code={`curl "https://api.uor.foundation/v1/resolve?name=alice.uor"`}
      />

      <div className="h-px bg-border/30 my-10" />

      {/* Features */}
      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>

        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Name Records"
            description="Create mutable pointers to content-addressed resources. Records include targets, services, TTL, and cryptographic signatures — all verified on resolution."
            href="/developers/dns#records"
            cta="Create records"
          />
          <DocFeatureCard
            title="Content Verification"
            description="Every resolved name returns a consistency proof. Any peer can independently verify that the name points to authentic content without shared state."
            href="/developers/dns#verification"
            cta="Verify names"
          />
          <DocFeatureCard
            title="DHT Resolution"
            description="Names are distributed across a Kademlia DHT. Resolution is decentralized — no single point of failure, no central registry."
            href="/developers/dns#resolution"
            cta="Understand resolution"
          />
          <DocFeatureCard
            title="IPv6 Content Routing"
            description="UOR names map directly to IPv6 addresses derived from content hashes. Network routing and content identity are unified at the protocol level."
            href="/developers/dns#routing"
            cta="Learn about routing"
          />
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
