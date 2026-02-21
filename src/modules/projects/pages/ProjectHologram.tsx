import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-hologram.jpg";

const ProjectHologram = () => (
  <ProjectDetailLayout
    name="Hologram"
    category="Frontier Technology"
    tagline="A software layer that turns your existing hardware into a high-performance computing engine. No new chips required."
    heroImage={heroImg}
    repoUrl="https://gethologram.ai/"
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              Hologram is a new kind of computing infrastructure. Instead of relying on expensive specialized hardware to run demanding workloads, Hologram creates a virtual compute layer that sits on top of whatever hardware you already have.
            </p>
            <p>
              Think of it like this: traditional computing runs instructions one after another, each step adding time and energy cost. Hologram reorganizes computation so that results can be looked up directly, turning multi-step calculations into single-step retrievals.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              High-performance computing today is expensive, energy-hungry, and locked to specific hardware. Running AI models, scientific simulations, or large data workloads typically requires powerful GPUs or cloud subscriptions that most individuals and organizations cannot afford.
            </p>
            <p>
              The result is a concentration of computing power in the hands of a few large companies, while researchers, developers, and smaller teams are left waiting in line or paying premium prices for access.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Hologram compiles computations into a fixed structure that can be resolved in a single step, regardless of how complex the original calculation was. The cost of running a workload becomes constant: it does not grow with the size of the input or the depth of the model.
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
      {
        heading: "Next steps",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Visit <a href="https://gethologram.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">gethologram.ai</a> to explore benchmarks and technical details.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Review the <a href="https://gethologram.ai/benchmarks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">published benchmarks</a> comparing Hologram against traditional compute.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Join the UOR Foundation community on Discord to connect with the Hologram team.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectHologram;
