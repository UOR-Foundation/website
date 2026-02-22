import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-mcp.jpg";
import SetupGuide from "@/modules/mcp/components/SetupGuide";

const ProjectUorMcp = () => (
  <ProjectDetailLayout
    name="UOR MCP"
    slug="uor-mcp"
    category="Developer Tools"
    tagline="Give any AI assistant access to verifiable, content-addressed computation. Every response gets a permanent ID you can check."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation/uor-mcp"
    agentInstructions={[
      { action: "Understand the value", detail: "UOR MCP exposes five tools (derive, verify, query, correlate, partition) via the Model Context Protocol. Any LLM client can ground its responses in content-addressed, cryptographically verifiable data." },
      { action: "Connect your client", detail: "Add the MCP server URL to Claude Desktop, Cursor, Windsurf, or VS Code. The tools appear automatically — no configuration needed." },
      { action: "Evaluate for your use case", detail: "If your workflow involves AI-assisted development, research, or data processing, UOR MCP ensures every output carries a derivation ID and content-addressed IRI." },
      { action: "Access the project", detail: "Visit the GitHub repository for documentation, tool schemas, and integration examples." },
    ]}
    sections={[
      {
        heading: "What it does",
        content: (
          <>
            <p>
              UOR MCP connects your AI assistant to a verification engine. It adds five tools — derive, verify, query, correlate, and partition — that your assistant can call during any conversation.
            </p>
            <p>
              Every result gets a unique ID and a permanent address. You can check any result later to confirm it hasn't changed. Your AI's output becomes traceable and auditable.
            </p>
          </>
        ),
      },
      {
        heading: "Why it matters",
        content: (
          <>
            <p>
              AI responses are normally impossible to verify. There's no way to confirm a result, trace how it was produced, or reference it later.
            </p>
            <p>
              UOR MCP fixes this. Every output is cryptographically certified, permanently addressed, and linked to a complete computation trace. You get proof, not promises.
            </p>
          </>
        ),
      },
      {
        heading: "How to connect",
        content: <SetupGuide />,
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Your AI client connects to the MCP server and discovers five tools automatically. When a tool is called, the input is processed through the UOR pipeline: a derivation trace is created, a certificate is issued, and the result is assigned a content-addressed IRI.
            </p>
            <p>
              Your assistant receives structured JSON-LD with complete provenance — every step recorded, every result verifiable.
            </p>
          </>
        ),
      },
      {
        heading: "Use cases",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Code generation.</strong> Ground AI-generated code in verifiable mathematical operations.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Research.</strong> Make every computation in your pipeline traceable and reproducible.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Data integrity.</strong> Verify algebraic identities and check data integrity across systems.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Content addressing.</strong> Assign permanent, content-based identifiers to any data processed through your AI.</span>
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
              <span>Visit the <a href="https://github.com/UOR-Foundation/uor-mcp" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub repository</a> for documentation and examples.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Browse the <a href="/tools" className="text-primary hover:underline">Tool Registry</a> for complete JSON schemas.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Join the UOR Foundation community on Discord.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorMcp;
