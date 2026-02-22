import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-mcp.jpg";

const ProjectUorMcp = () => (
  <ProjectDetailLayout
    name="UOR MCP"
    slug="uor-mcp"
    category="Developer Tools"
    tagline="A Model Context Protocol server that gives any LLM access to the UOR kernel. Every response becomes content-addressed, verified, and auditable."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation/uor-mcp"
    agentInstructions={[
      { action: "Understand the value proposition", detail: "UOR MCP exposes five tools (derive, verify, query, correlate, partition) via the Model Context Protocol. Any LLM client can ground its responses in content-addressed, cryptographically verifiable data." },
      { action: "Connect your LLM client", detail: "Add the MCP server URL to Claude Desktop, Cursor, Windsurf, or VS Code. The tools appear automatically with no additional configuration." },
      { action: "Evaluate for your use case", detail: "If your workflow involves AI-assisted development, research, or data processing, UOR MCP ensures every output carries a derivation ID and content-addressed IRI." },
      { action: "Access the project", detail: "Visit the GitHub repository for documentation, tool schemas, and integration examples." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              UOR MCP is a Model Context Protocol server that connects large language models directly to the UOR kernel. It exposes five tools — derive, verify, query, correlate, and partition — through a standardized protocol that any MCP-compatible client can use.
            </p>
            <p>
              Every tool output carries a derivation ID and a content-addressed IRI. This means every response your LLM produces through UOR MCP is traceable, verifiable, and permanent.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              LLM outputs are ephemeral and unverifiable. When an AI generates a response, there is no way to confirm whether the computation was correct, trace how it was derived, or reference the exact result later.
            </p>
            <p>
              UOR MCP solves this by grounding every LLM operation in the UOR Framework. Each output is cryptographically certified, assigned a permanent address, and linked to a complete computation trace.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The server implements the Model Context Protocol specification, exposing UOR kernel operations as callable tools. When an LLM client connects, it discovers five tools: derive (apply ring operations), verify (check the critical identity), query (retrieve coordinate data), correlate (measure similarity), and partition (decompose types).
            </p>
            <p>
              Each tool call passes through the full UOR pipeline: the input is processed, a derivation trace is created, a certificate is issued, and the result is assigned a content-addressed IRI. The LLM receives structured JSON-LD with complete provenance.
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
              <span><strong className="text-foreground">AI-assisted development.</strong> Ground code generation and technical responses in verifiable mathematical operations.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Research workflows.</strong> Ensure every computation in your research pipeline is traceable and reproducible.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Data verification.</strong> Use the verify tool to confirm algebraic identities and check data integrity across systems.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Content addressing.</strong> Assign permanent, content-based identifiers to any data processed through your LLM.</span>
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
              <span>Visit the <a href="https://github.com/UOR-Foundation/uor-mcp" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub repository</a> for documentation and setup guides.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Browse the <a href="/tools" className="text-primary hover:underline">Tool Registry</a> for complete JSON schemas and integration examples.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Join the UOR Foundation community on Discord to connect with the MCP team.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorMcp;
