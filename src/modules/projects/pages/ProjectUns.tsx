import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uns.jpg";

const ProjectUns = () => (
  <ProjectDetailLayout
    name="UOR Name Service (UNS)"
    slug="uns"
    category="Core Infrastructure"
    tagline="A complete network infrastructure platform built on IPv6 and the UOR Framework. Every resource gets a permanent, content-derived IPv6 address that makes it findable, verifiable, and protected across any network."
    heroImage={heroImg}
    repoUrl="/uns"
    agentInstructions={[
      { action: "Understand the value", detail: "UNS provides a full network infrastructure stack (name resolution, security, caching, compute, storage) where every resource is identified by its content. Trust, routing, and verification are unified into a single system." },
      { action: "Explore the services", detail: "UNS includes eleven services: Resolver (name lookup), Shield (protection), Compute (serverless functions), Cache (content delivery), Store (object storage), KV (key-value), Ledger (verifiable database), Trust (identity and access), Conduit (secure tunnels), Mesh (network routing), and Agent (AI gateway)." },
      { action: "Evaluate for your use case", detail: "If your system needs resilient, verifiable infrastructure where every response can be independently checked and every name carries meaning, UNS is designed for that." },
      { action: "Access the module", detail: "Visit /uns for the module overview, service architecture, and API endpoints." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              When you visit a website, send an email, or call an API, your request passes through layers of infrastructure you cannot see or verify. A name is looked up in a directory. The directory points to a server. The server responds with data. At no point can you independently confirm that the name pointed to the right place, that the server is who it claims to be, or that the data you received is what was originally published.
            </p>
            <p>
              This creates a fundamental trust gap. Every layer depends on a separate system to vouch for it: domain registrars for names, certificate authorities for identity, CDN providers for delivery. If any one of them fails, the entire chain breaks. And you have no way to detect it.
            </p>
          </>
        ),
      },
      {
        heading: "What UNS does",
        content: (
          <>
            <p>
              UNS combines the UOR Framework's content-addressing system with IPv6, the internet's native network protocol. The UOR Framework generates a unique mathematical fingerprint for any piece of content. UNS then projects that fingerprint into a standard IPv6 address, creating a direct link between what something is and where it can be found on the network.
            </p>
            <p>
              This means every resource gets a real, routable IPv6 address that is derived from its content. If the content changes, the address changes. If the address matches, the content is authentic. No external directory or certificate is needed to verify the connection. The address itself is the proof.
            </p>
            <p>
              UNS provides eleven integrated services that together replace the patchwork of systems most infrastructure depends on today:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Resolver.</strong> Finds resources by name. Every lookup produces a verifiable answer you can check yourself.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Shield.</strong> Detects and blocks malicious traffic using mathematical pattern analysis, not signature databases that need constant updating.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Cache.</strong> Delivers content from the nearest location. Because content is addressed by what it is, there is no risk of serving stale or incorrect data.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Compute.</strong> Runs code at the network edge. Every execution produces a verifiable trace, so you can confirm exactly what ran and what it returned.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Store.</strong> Stores files and objects. Every stored item gets a permanent address based on its content, making retrieval and verification automatic.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Trust.</strong> Manages identity and access without passwords or external identity providers. Your identity is derived from your own credentials, verified mathematically.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              UNS starts with the UOR Framework, which computes a unique fingerprint for any piece of content. That fingerprint is then mapped into four complementary forms:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">An IPv6 address</strong> for routing traffic across real networks. UNS uses a dedicated IPv6 prefix (fd00:0075:6f72::/48) where every address is derived directly from content, not assigned by a registry.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">A content identifier</strong> for retrieving the exact data from any storage provider, ensuring you always get what you asked for.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">A verification key</strong> for confirming the data has not been altered since it was published.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">A full identity</strong> (the complete UOR fingerprint) for lossless verification when maximum assurance is needed.</span>
              </li>
            </ul>
            <p>
              The IPv6 address handles routing. The full UOR identity handles verification. Together, they give every resource a network presence that is both globally reachable and independently verifiable. The platform also uses next-generation cryptography designed to remain secure against future quantum computers.
            </p>
          </>
        ),
      },
      {
        heading: "Why it matters",
        content: (
          <>
            <p>
              Today's internet infrastructure was built in layers, each solving one problem in isolation. Name resolution, security, delivery, storage, and identity are all handled by separate systems with separate trust models. The result is complexity, fragility, and invisible points of failure.
            </p>
            <p>
              UNS unifies these layers into a single, coherent system where:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Trust is verifiable.</strong> Every response carries proof of its authenticity. You never have to take someone's word for it.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Systems interoperate naturally.</strong> Because every resource uses the same addressing system, different services can find and verify each other's data without custom integrations.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Infrastructure is resilient.</strong> There is no single point of failure. If one path breaks, the content can still be found and verified through any other path.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Who this is for",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Infrastructure teams.</strong> Build on a unified platform where naming, security, delivery, and storage all share the same trust model.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Application developers.</strong> Ship products where every API response, every file, and every user session is verifiable by default.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI systems.</strong> Give agents infrastructure they can trust. Every resource an agent resolves, retrieves, or computes is independently verifiable.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Security-conscious organizations.</strong> Adopt infrastructure with built-in protection against both current and future threats, including quantum computing.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUns;
