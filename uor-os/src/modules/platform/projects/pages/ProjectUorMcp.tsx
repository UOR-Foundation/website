import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-mcp.jpg";
import SetupGuide from "@/modules/intelligence/mcp/components/SetupGuide";

const ProjectUorMcp = () => (
  <ProjectDetailLayout
    name="UOR MCP"
    slug="uor-mcp"
    category="Developer Tools"
    tagline="A server that connects AI models to the UOR verification engine. Every response is graded, traceable, and independently verifiable."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation/uor-mcp"
    agentInstructions={[
      { action: "Understand the value", detail: "UOR MCP exposes eight verification tools via the Model Context Protocol. Any AI client can ground its responses in content-addressed, verifiable data." },
      { action: "Connect your client", detail: "Add the MCP server URL to Claude Desktop, Cursor, Windsurf, or VS Code. The tools appear automatically." },
      { action: "Evaluate for your use case", detail: "If your workflow involves AI-assisted development, research, or data processing, UOR MCP ensures every output carries a derivation ID and certificate." },
      { action: "Access the project", detail: "Visit the GitHub repository for documentation, tool schemas, and integration examples." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              When you ask an AI a question, you get an answer. But you have no way to know where that answer came from, whether it was computed or recalled from training data, or whether someone else asking the same question would get the same result.
            </p>
            <p>
              There is no receipt, no proof, and no way to check. You are asked to trust the output on faith.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              UOR MCP connects your AI assistant to a verification engine. It adds eight tools that your assistant can call during any conversation. When used, every answer comes back with a trust grade, a proof hash, and a clear label telling you exactly how that answer was produced.
            </p>
            <ul className="space-y-3 mt-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Trust grade.</strong> Grade A means mathematically computed and verified. Grade D means answered from memory with no verification.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Proof hash.</strong> A unique fingerprint of the computation. Anyone can use this to independently re-verify the result.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Knowledge gaps.</strong> When the AI doesn't know something or made an assumption, it tells you explicitly.</span>
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
              Your AI client connects to the UOR MCP server and discovers eight tools automatically. No configuration, no API keys, no accounts.
            </p>
            <p>
              When you ask a question, the AI decides whether to use these tools. If it does, the input is processed through the UOR pipeline: a derivation trace is created, a certificate is issued, and the result is assigned a permanent, content-based address. The AI then formats a trust scorecard showing exactly what happened.
            </p>
            <div className="mt-6">
              <SetupGuide />
            </div>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Developers.</strong> Ground AI-generated code in verifiable computations. Know whether a result was proven or guessed.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Researchers.</strong> Make every step in your AI-assisted pipeline traceable, reproducible, and independently verifiable.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Teams needing accountability.</strong> When an AI produces a result that drives a decision, the proof trail shows exactly how that result was derived.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Anyone skeptical of AI.</strong> If you don't trust AI outputs by default, this gives you the tools to verify them yourself.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectUorMcp;
