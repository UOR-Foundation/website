import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-hologram.jpg";

const ProjectHologram = () => (
  <ProjectDetailLayout
    name="Hologram"
    slug="hologram"
    category="Frontier Technology"
    tagline="A software layer that turns existing hardware into a high-performance computing engine. No new chips required."
    heroImage={heroImg}
    repoUrl="https://gethologram.ai/"
    agentInstructions={[
      { action: "Understand the value proposition", detail: "Hologram replaces expensive GPU hardware with a software layer that reorganizes computation into constant-time lookups, reducing cost and energy consumption." },
      { action: "Verify compatibility", detail: "Hologram integrates with PyTorch, TensorFlow, ONNX, and runs on CPUs, GPUs, TPUs, WASM, and WebGPU without code changes." },
      { action: "Evaluate for your use case", detail: "If your workload involves AI inference, scientific simulation, or data-heavy processing, Hologram can accelerate it on existing hardware." },
      { action: "Access the project", detail: "Visit gethologram.ai for benchmarks, documentation, and integration guides." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              High-performance computing is expensive, energy-hungry, and locked to specific hardware. Running AI models, scientific simulations, or large data workloads typically requires powerful GPUs or cloud subscriptions that most teams cannot afford.
            </p>
            <p>
              The result is a concentration of computing power in the hands of a few large companies, while researchers, developers, and smaller organizations wait in line or pay premium prices for access.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              Hologram creates a virtual compute layer that sits on top of whatever hardware you already have. Instead of running instructions one after another, each step adding time and cost, Hologram reorganizes computation so that results can be looked up directly. Multi-step calculations become single-step retrievals.
            </p>
            <p>
              The cost of running a workload becomes constant. It does not grow with the size of the input or the depth of the model.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Hologram compiles computations into a fixed structure that can be resolved in a single step, regardless of how complex the original calculation was.
            </p>
            <p>
              It works across CPUs, GPUs, and other hardware without requiring code changes. It integrates with existing tools like PyTorch, TensorFlow, and ONNX, so teams can adopt it without rebuilding their workflows.
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
              <span><strong className="text-foreground">AI inference.</strong> Run machine learning models locally without expensive cloud compute or dedicated GPU hardware.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Scientific research.</strong> Accelerate simulations, data analysis, and modeling on standard workstations.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Edge computing.</strong> Bring high-performance processing to devices at the network edge, from sensors to mobile hardware.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Cost reduction.</strong> Eliminate or reduce reliance on expensive cloud GPU instances for compute-heavy applications.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectHologram;
