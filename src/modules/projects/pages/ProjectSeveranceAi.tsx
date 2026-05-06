import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-severance-ai.jpg";

const ProjectSeveranceAi = () => (
  <ProjectDetailLayout
    name="Project Severance AI"
    slug="project-severance-ai"
    category="Core Infrastructure"
    tagline="A post-quantum homomorphic encryption framework for federated computing. Achieves 85–94% operation reduction through connection optimization while preserving full data privacy across organizations."
    heroImage={heroImg}
    repoUrl="https://github.com/dkypuros/Project_Severance_AI"
    agentInstructions={[
      { action: "Understand the concept", detail: "Project Severance AI lets multiple parties collaborate on encrypted data using Microsoft SEAL homomorphic encryption, never exposing the raw inputs." },
      { action: "Run a demo", detail: "Install requirements.txt then run federated_seal_core.py for a quick proof, or federated_neural_homomorphic_seal.py for an end-to-end neural inference." },
      { action: "Optimize a workload", detail: "Use the connection optimization engine to skip weak edges, reducing 85–94% of homomorphic operations on real workloads." },
      { action: "Verify the math", detail: "Inspect the Lean 4 proofs under /proofs to confirm correctness of connection strength, multi-party aggregation, and end-to-end framework guarantees." },
    ]}
    sections={[
      {
        heading: "Why",
        content: (
          <>
            <p>
              Healthcare, finance, and genomics teams hold data they cannot legally share, yet the most valuable insights only appear when their datasets are combined. Today this means either breaking privacy rules or losing the analysis entirely.
            </p>
            <p>
              Existing homomorphic encryption protects data but is too slow for real workloads, and emerging quantum hardware threatens the cryptography that today's federated systems depend on.
            </p>
          </>
        ),
      },
      {
        heading: "How",
        content: (
          <>
            <p>
              Project Severance AI combines Microsoft SEAL CKKS/BFV encryption with a connection optimization engine that decides, at runtime, which encrypted operations actually matter for the result.
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Encrypt.</strong> Each party encrypts their data locally with 128-bit post-quantum SEAL parameters before anything leaves the device.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Score connections.</strong> The framework computes connection strength between encrypted states and prunes weak links, eliminating 85–94% of expensive operations.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Aggregate.</strong> A multi-party aggregation step combines the surviving encrypted contributions while preserving each party's privacy.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Prove.</strong> Lean 4 proofs formally verify connection strength accuracy, privacy preservation, and end-to-end correctness of the framework.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "What",
        content: (
          <>
            <p>
              A production-ready Python framework that turns federated computing from a research demo into a working system: real Microsoft SEAL encryption, sub-second to a few-second execution times, error rates under 10⁻⁶, and formally verified mathematics.
            </p>
            <p>
              The repository ships with end-to-end examples for financial risk assessment, genomic classification, and homomorphic neural network inference, plus benchmarks comparing real SEAL performance against mock baselines.
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
              <span><strong className="text-foreground">Healthcare collaboration.</strong> Multi-hospital medical image classification with HIPAA-compliant patient privacy and 93.8% operation reduction.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Financial risk assessment.</strong> GDPR/PCI-DSS compliant credit risk modeling across multiple banks in roughly three seconds.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Genomic analysis.</strong> Disease risk prediction across clinics while keeping every DNA record encrypted end-to-end.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Federated learning.</strong> Train and run neural networks on encrypted contributions from many parties without ever decrypting their inputs.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectSeveranceAi;
