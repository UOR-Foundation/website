import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-prism.png";
import { GITHUB_PRISM_URL } from "@/data/external-links";

const ProjectPrism = () => (
  <ProjectDetailLayout
    name="Prism"
    slug="prism"
    category="Core Infrastructure"
    tagline="The working engine behind the UOR Framework. Prism turns the framework's rules into running code: encoding data, assigning addresses, and verifying computations."
    heroImage={heroImg}
    repoUrl={GITHUB_PRISM_URL}
    agentInstructions={[
      { action: "Understand the role", detail: "Prism is the reference implementation of UOR. It encodes any digital value into a unique triadic coordinate (datum, stratum, spectrum) derived from the value itself." },
      { action: "Verify the algebra", detail: "Run 'python prism.py --verbose' to check every algebraic law against every value in the 8-bit space. If it passes, the system is proven coherent." },
      { action: "Use for content addressing", detail: "Prism assigns content-derived addresses. Two independent systems encoding the same value will always produce the same coordinate, enabling cross-system data matching." },
      { action: "Trace computations", detail: "Every operation produces a derivation certificate. Use these to audit, reproduce, and verify any computation without re-running it." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              Prism is the reference implementation of the UOR Framework. If the Framework is the rulebook, Prism is the machine that runs those rules. It takes any piece of digital data and assigns it a permanent, unique address based on what that data actually is, not where it is stored.
            </p>
            <p>
              Think of it like GPS for information. GPS gives every point on Earth a unique coordinate. Prism gives every piece of data a unique coordinate. Two different systems encoding the same value will always produce the same address, independently, without needing to communicate.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Today, data identity depends on location: file paths, database keys, URLs. If you move data, the identity breaks. If two systems store the same information, they have no way of knowing it is the same without a translation layer.
            </p>
            <p>
              This creates a world where data is fragmented by infrastructure. Scientific research stays siloed because data formats are incompatible. AI models cannot reliably compare information across systems. Verification of results requires re-running entire experiments because there is no shared reference frame.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Prism resolves every value through three independent measurements, called a triad: the value itself, how many bits are active, and which specific bits are active. When all three are known, there is exactly one point in the system that matches. No ambiguity.
            </p>
            <p>
              Every operation Prism performs produces a certificate: a verifiable record of what went in, what came out, and what rule was applied. The same computation always produces the same certificate, regardless of when or where it runs. This makes every result independently auditable.
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
              <span><strong className="text-foreground">Cross-system data matching.</strong> Two databases with different formats can project their records into Prism coordinates. Identical values automatically resolve to the same point.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI transparency.</strong> Map internal model states to coordinates, track transformations step by step, and measure similarity between any two states.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Verifiable computation.</strong> Every result carries a certificate. Independent parties can confirm correctness without re-running the work.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Open science.</strong> Researchers can publish results with permanent, content-addressed identifiers that do not depend on any particular platform or institution.</span>
            </li>
          </ul>
        ),
      },
      {
        heading: "Next steps",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Clone the <a href={GITHUB_PRISM_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Prism repository</a> and run <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-sm">python prism.py --verbose</code> to verify the algebra.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Try the quickstart example to assign coordinates, navigate the space, and measure distance between values.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Run the mapping example to see how ASCII, RGB, and database records all resolve to the same coordinate system.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Read the <a href="https://uor-foundation.github.io/UOR-Framework/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">UOR Framework specification</a> to understand the rules that Prism implements.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectPrism;
