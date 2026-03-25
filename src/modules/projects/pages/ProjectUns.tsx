import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uns.jpg";

const ProjectUns = () => (
  <ProjectDetailLayout
    name="UOR Name Service (UNS)"
    slug="uns"
    category="Core Infrastructure"
    tagline="A complete network infrastructure platform where every resource is findable, verifiable, and protected. Trust is built into the address itself."
    heroImage={heroImg}
    repoUrl="/uns"
    agentInstructions={[
      { action: "Understand the value", detail: "UNS provides a full network infrastructure stack where every resource is identified by its content. Trust, routing, and verification are unified into a single system." },
      { action: "Explore the services", detail: "UNS includes eleven services: Resolver, Shield, Compute, Cache, Store, KV, Ledger, Trust, Conduit, Mesh, and Agent." },
      { action: "Evaluate for your use case", detail: "If your system needs resilient, verifiable infrastructure where every response can be independently checked, UNS is designed for that." },
      { action: "Access the module", detail: "Visit /uns for the module overview, service architecture, and API endpoints." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              When you visit a website, send an email, or call an API, your request passes through layers of infrastructure you cannot see or verify. A name is looked up in a directory. The directory points to a server. At no point can you independently confirm that the name pointed to the right place or that the data you received is what was originally published.
            </p>
            <p>
              Every layer depends on a separate system to vouch for it: domain registrars for names, certificate authorities for identity, CDN providers for delivery. If any one fails, the entire chain breaks.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              UNS combines content-addressing with IPv6, the internet's native network protocol. Every resource gets a real, routable IPv6 address derived from its content. If the content changes, the address changes. If the address matches, the content is authentic.
            </p>
            <p>
              UNS provides eleven integrated services that together replace the patchwork of systems most infrastructure depends on:
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Resolver.</strong> Finds resources by name. Every lookup produces a verifiable answer.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Shield.</strong> Detects and blocks malicious traffic using mathematical pattern analysis.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Cache.</strong> Delivers content from the nearest location. Content-addressing means no risk of serving stale data.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Compute.</strong> Runs code at the network edge. Every execution produces a verifiable trace.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Store.</strong> Stores files and objects with permanent, content-based addresses.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Trust.</strong> Manages identity and access without passwords or external identity providers.</span>
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
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">An IPv6 address</strong> for routing traffic across real networks.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">A content identifier</strong> for retrieving the exact data from any storage provider.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">A verification key</strong> for confirming the data has not been altered.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">A full identity</strong> for lossless verification when maximum assurance is needed.</span>
              </li>
            </ul>
            <p>
              The IPv6 address handles routing. The full identity handles verification. Together, they give every resource a network presence that is both globally reachable and independently verifiable.
            </p>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Infrastructure teams.</strong> Build on a unified platform where naming, security, delivery, and storage share the same trust model.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Application developers.</strong> Ship products where every API response, file, and user session is verifiable by default.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI systems.</strong> Give agents infrastructure they can trust. Every resource an agent resolves or retrieves is independently verifiable.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Security-conscious organizations.</strong> Infrastructure with built-in protection against both current and future threats.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUns;
