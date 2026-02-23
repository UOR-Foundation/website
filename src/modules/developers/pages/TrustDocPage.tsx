import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { DocFeatureCard, DocRelatedProduct, DocCodeBlock } from "../components/DocComponents";
import { docSidebars } from "../data/doc-sidebars";

const TrustDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.trust}
      breadcrumbs={[{ label: "Trust & Auth" }]}
      tocItems={[
        { label: "Overview", id: "overview" },
        { label: "Features", id: "features" },
        { label: "Get Started", id: "get-started" },
        { label: "Related Services", id: "related" },
      ]}
    >
      <div id="overview" className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Trust & Auth
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          Post-quantum authentication with Dilithium-3 challenges and
          policy-based access control. Zero shared secrets.
        </p>
        <p className="text-sm text-primary font-medium">Post-quantum · Zero Trust · Policy-based</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        UOR Trust replaces traditional shared-secret authentication with content-derived identity.
        Authentication challenges use Dilithium-3 (NIST-standardized post-quantum signatures).
        Access policies are algebraically evaluated — no opaque ACL lists, no role explosion.
      </p>

      <DocCodeBlock
        label="Authenticate"
        method="POST"
        code={`const auth = new UnsAuthServer();
const challenge = await auth.createChallenge(publicKey);
const response = signChallenge(challenge, secretKey);
const session = await auth.verifyResponse(response);
// session.authenticated === true`}
      />

      <div className="h-px bg-border/30 my-10" />

      <div id="features">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Features</h2>
        <div className="divide-y divide-border/20">
          <DocFeatureCard
            title="Post-Quantum Auth"
            description="Challenge-response authentication using Dilithium-3 signatures. Quantum-resistant by design — not retrofitted."
            href="/developers/trust#auth"
            cta="Set up auth"
          />
          <DocFeatureCard
            title="Access Control"
            description="Define policies as algebraic rules. Evaluate access decisions deterministically — same request, same policy, same answer, always."
            href="/developers/trust#access"
            cta="Configure policies"
          />
          <DocFeatureCard
            title="Conduit (E2E Encryption)"
            description="End-to-end encrypted tunnels using Kyber key encapsulation. Forward secrecy with post-quantum key exchange."
            href="/developers/trust#conduit"
            cta="Create tunnels"
          />
        </div>
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="get-started">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Get Started</h2>
        <DocCodeBlock
          code={`import { UnsAuthServer, UnsAccessControl } from "@uns/sdk";

// 1. Create auth server
const auth = new UnsAuthServer();

// 2. Define access policy
const acl = new UnsAccessControl();
acl.addPolicy({
  resource: "documents/*",
  actions: ["read", "write"],
  condition: (session) => session.authenticated,
});

// 3. Evaluate access
const result = acl.evaluate(session, "documents/report.pdf", "read");
// result.allowed === true`}
        />
      </div>

      <div className="h-px bg-border/30 my-10" />

      <div id="related">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Related Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DocRelatedProduct
            title="Name Service"
            description="Content-addressed names secured with the same Dilithium-3 signatures."
            href="/developers/dns"
          />
          <DocRelatedProduct
            title="Shield (WAF)"
            description="Content-level analysis to complement identity-level authentication."
            href="/developers/shield"
          />
        </div>
      </div>
    </DocsLayout>
    <Footer />
  </>
);

export default TrustDocPage;
