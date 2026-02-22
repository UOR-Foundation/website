import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-mcp.jpg";
import SetupGuide from "@/modules/mcp/components/SetupGuide";

const ProjectUorMcp = () => (
  <ProjectDetailLayout
    name="UOR MCP"
    slug="uor-mcp"
    category="Developer Tools"
    tagline="Know whether to trust your AI's answer. UOR MCP adds a verifiable proof trail to every response, so you never have to guess."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation/uor-mcp"
    agentInstructions={[
      { action: "Understand the value", detail: "UOR MCP exposes eight tools (derive, verify, resolve, certify, trace, query, correlate, partition) via the Model Context Protocol. Any LLM client can ground its responses in content-addressed, cryptographically verifiable data." },
      { action: "Connect your client", detail: "Add the MCP server URL to Claude Desktop, Cursor, Windsurf, or VS Code. The tools appear automatically." },
      { action: "Evaluate for your use case", detail: "If your workflow involves AI-assisted development, research, or data processing, UOR MCP ensures every output carries a derivation ID, certificate, and content-addressed IRI." },
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
        heading: "What UOR MCP does",
        content: (
          <>
            <p>
              UOR MCP connects your AI assistant to a verification engine. It adds eight tools that your assistant can call during any conversation. When your AI uses them, every answer comes back with a trust score, a proof hash, and a clear label telling you exactly how that answer was produced.
            </p>
            <p className="font-medium text-foreground">
              The scorecard at the bottom of each response tells you:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">The trust grade.</strong> Grade A means the result was mathematically computed and verified. Grade D means the AI answered from memory with no verification.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">The confidence level.</strong> A visual indicator of how much you should rely on this particular answer.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">The proof.</strong> A unique fingerprint (hash) of the computation. Anyone can use this to independently re-verify the result.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">The sources.</strong> Named, linked references showing exactly where the information came from.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Why it matters",
        content: (
          <>
            <p>
              AI is increasingly used to make decisions: in code, research, finance, and operations. But without a way to verify outputs, every answer carries hidden risk. Was the data real? Was the logic correct? Would you get the same answer tomorrow?
            </p>
            <p>
              UOR MCP makes every answer checkable. If the AI computed something, you get a mathematical proof. If it pulled from a knowledge base, you get a link. If it guessed from training data, you know that too. No ambiguity. No hidden assumptions.
            </p>
            <p>
              The result is simple: you can tell the difference between an answer you should act on and one you should verify further.
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
              Your AI client connects to the UOR MCP server and discovers eight tools automatically. No configuration, no API keys, no accounts.
            </p>
            <p>
              When you ask a question, the AI decides whether to use these tools. If it does, the input is processed through the UOR pipeline: a derivation trace is created, a certificate is issued, and the result is assigned a permanent, content-based address. The AI then formats a trust scorecard showing exactly what happened.
            </p>
            <p>
              If the AI answers without using the tools (for example, a general knowledge question), the scorecard still appears, clearly labeled as Grade D: unverified, from training data. You always know what you're getting.
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
              <span><strong className="text-foreground">Developers.</strong> Ground AI-generated code in verifiable computations. Know whether a result was proven or guessed.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Researchers.</strong> Make every step in your AI-assisted pipeline traceable, reproducible, and independently verifiable.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Teams that need accountability.</strong> When an AI produces a result that drives a decision, the proof trail shows exactly how that result was derived.</span>
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
