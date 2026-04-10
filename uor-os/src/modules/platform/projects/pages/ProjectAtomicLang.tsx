import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-atomic-lang.jpg";

const ProjectAtomicLang = () => (
  <ProjectDetailLayout
    name="Atomic Language Model"
    slug="atomic-language-model"
    category="Frontier Technology"
    tagline="A language model where every output follows defined rules and is fully traceable. No black boxes. Fits in under 50 kilobytes."
    heroImage={heroImg}
    repoUrl="https://github.com/dkypuros/atomic-lang-model"
    agentInstructions={[
      { action: "Understand the approach", detail: "Unlike statistical language models, this model uses formal grammar to generate and parse language with provable correctness." },
      { action: "Evaluate the tradeoffs", detail: "At under 50KB, it is 14,000,000x smaller than GPT-3. It trades breadth of knowledge for provable correctness and full explainability." },
      { action: "Test it yourself", detail: "Clone the repository and run 'cargo run --release' to see recursive grammar generation and parsing in action." },
      { action: "Consider integration", detail: "Ideal for embedded systems, edge devices, or any context where explainability and auditability are required." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              Today's AI language models are powerful but opaque. They require enormous computing resources, consume significant energy, and produce outputs that cannot be fully explained or verified. When a model generates an answer, there is no way to trace exactly why it chose those words.
            </p>
            <p>
              In high-stakes applications like medicine, law, or scientific research, you need to know not just what the answer is, but why. Current models cannot reliably provide that.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              The Atomic Language Model uses a small set of precise grammatical rules to generate and understand language, instead of learning patterns from massive datasets.
            </p>
            <p>
              The entire model fits in under 50 kilobytes. For comparison, GPT-3 is roughly 14 million times larger. Despite this size difference, the Atomic Language Model can parse sentences, generate structured language, and prove its own correctness.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The model is built on Chomsky's Minimalist Grammar, a well-established theory of how human language is structured. Every sentence it produces follows explicit rules that can be inspected and verified.
            </p>
            <p>
              Because the rules are formal and finite, the model can mathematically prove that its outputs are correct. It does not guess or approximate. Every prediction comes with a clear explanation.
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
              <span><strong className="text-foreground">Trustworthy AI.</strong> Applications where every output must be explainable and auditable: legal documents, medical reports, regulatory compliance.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Resource-constrained environments.</strong> Runs on devices as small as a smartwatch. No cloud, no GPU, no internet connection required.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Education and linguistics.</strong> A hands-on tool for studying how formal grammar works, with real-time parsing and generation.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Embedded systems.</strong> Language processing on IoT devices, sensors, and offline hardware where bandwidth and power are limited.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectAtomicLang;
