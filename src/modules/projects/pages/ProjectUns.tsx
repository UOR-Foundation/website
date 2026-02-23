import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uns.jpg";

const ProjectUns = () => (
  <ProjectDetailLayout
    name="UOR Name Service (UNS)"
    slug="uns"
    category="Core Infrastructure"
    tagline="Semantic name resolution powered by IPv6 content-addressing and UOR algebraic identity. Every name maps to a verifiable, interoperable identity — enabling trust, resilience, and seamless connectivity across systems."
    heroImage={heroImg}
    repoUrl="/uns"
    agentInstructions={[
      { action: "Understand the value", detail: "UNS provides semantic name resolution where every name maps to a derivation ID, CIDv1, Braille address, and IPv6 ULA — all derived from the content itself, enabling trust and interoperability across systems." },
      { action: "Explore the record types", detail: "UNS defines seven record types (UAAA, UCID, UGLP, UPTR, UTXT, UCRT, USOA) that provide self-certifying, resilient name resolution with built-in verification." },
      { action: "Evaluate for your use case", detail: "If your system needs name resolution that is semantically grounded, interoperable, and resilient, UNS provides a verifiable alternative built on algebraic identity." },
      { action: "Access the module", detail: "Visit /uns for the module overview, API endpoints, and record type documentation." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              Today's naming systems were designed for a simpler internet. They map names to locations, not to meaning. When a name resolves, there is no built-in way to verify that the resource you received is the resource you expected — and no semantic link between the name and what it represents.
            </p>
            <p>
              As systems grow more interconnected, this gap creates fragility. Names break when infrastructure changes. Trust depends on external validation. And interoperability between systems requires custom integrations because names carry no inherent meaning.
            </p>
          </>
        ),
      },
      {
        heading: "What UNS does",
        content: (
          <>
            <p>
              UNS is a semantic name service where every name resolves to a content-addressed identity. A UNS name doesn't just point to a location — it points to what the resource <em>is</em>, creating a verifiable, meaningful link between names and the things they represent.
            </p>
            <p>
              When you resolve a name through UNS, you get four interoperable identity forms: an IPv6 ULA for network routing, a CIDv1 for content retrieval, a Braille glyph address for algebraic verification, and a full derivation ID for lossless identity. This makes every resolution trustworthy and resilient across systems.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              UNS maps human-readable names to UOR content-addressed identities using seven record types that mirror traditional DNS but are self-certifying:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">UAAA records</strong> map names to IPv6 ULA addresses within the UOR fd00:0075:6f72::/48 prefix.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">UCID records</strong> map names to CIDv1 content identifiers for decentralised retrieval.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">UPTR records</strong> provide reverse resolution — IPv6 back to name — for auditable routing.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">UCRT records</strong> link names directly to their verification certificates for instant trust assessment.</span>
              </li>
            </ul>
            <p>
              Every record is issued a certificate upon creation. Zones are self-certifying. Resolution is verifiable end-to-end.
            </p>
          </>
        ),
      },
      {
        heading: "Who this is for",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Infrastructure builders.</strong> Add semantic, verifiable name resolution to your systems with built-in interoperability.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Application developers.</strong> Give your users names that carry meaning, enabling trust and seamless connectivity across platforms.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI agents.</strong> Resolve and verify resources programmatically with semantically grounded, resilient name resolution.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUns;
