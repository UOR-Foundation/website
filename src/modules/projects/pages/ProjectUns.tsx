import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uns.jpg";

const ProjectUns = () => (
  <ProjectDetailLayout
    name="UoR Name Service (UNS)"
    slug="uns"
    category="Core Infrastructure"
    tagline="Decentralized name resolution powered by IPv6 content-addressing and UOR algebraic identity. Every name maps to a verifiable, content-addressed identity — no central authority required."
    heroImage={heroImg}
    repoUrl="/uns"
    agentInstructions={[
      { action: "Understand the value", detail: "UNS replaces centralised DNS with content-addressed name resolution. Every name maps to a derivation ID, CIDv1, Braille address, and IPv6 ULA — all derived from the content itself, not assigned by an authority." },
      { action: "Explore the record types", detail: "UNS defines seven record types (UAAA, UCID, UGLP, UPTR, UTXT, UCRT, USOA) that mirror DNS records but are self-certifying and immutable." },
      { action: "Evaluate for your use case", detail: "If your system needs name resolution that is verifiable, decentralised, and does not depend on DNS infrastructure, UNS provides a drop-in alternative grounded in algebraic identity." },
      { action: "Access the module", detail: "Visit /uns for the module overview, API endpoints, and record type documentation." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              The internet's naming system — DNS — is centralised, fragile, and trust-based. You ask a server for an address, and you trust the answer. There is no way to independently verify that the name you requested actually maps to the resource you received.
            </p>
            <p>
              DNS can be hijacked, censored, or manipulated. Names are rented, not owned. And the entire system depends on a small number of root servers controlled by a small number of organisations.
            </p>
          </>
        ),
      },
      {
        heading: "What UNS does",
        content: (
          <>
            <p>
              UNS is a decentralised name service where every name resolves to a content-addressed identity. Instead of pointing to an IP address controlled by a hosting provider, a UNS name points to what the resource <em>is</em> — its algebraic identity derived from its content.
            </p>
            <p>
              When you resolve a name through UNS, you get four identity forms: an IPv6 ULA for network routing, a CIDv1 for content retrieval, a Braille glyph address for algebraic verification, and a full derivation ID for lossless identity. Each is independently verifiable.
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
              <span><strong className="text-foreground">Infrastructure builders.</strong> Replace DNS dependencies with content-addressed, verifiable name resolution.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Decentralised application developers.</strong> Give your users names that resolve to content, not servers.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI agents.</strong> Resolve and verify resources programmatically without trusting a central naming authority.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUns;
