import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-atlas.png";
import { GITHUB_ATLAS_URL } from "@/data/external-links";

const ProjectAtlasEmbeddings = () => (
  <ProjectDetailLayout
    name="Atlas Embeddings"
    category="Open Science"
    tagline="Research revealing that five of the most complex structures in mathematics share a single, simple origin, pointing to a deeper order beneath the surface."
    heroImage={heroImg}
    repoUrl={GITHUB_ATLAS_URL}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              Atlas Embeddings is a mathematical research project. It demonstrates that five exceptional structures in mathematics, long studied in isolation, can all be traced back to one shared starting point.
            </p>
            <p>
              In plain terms: patterns that mathematicians have treated as separate discoveries for decades turn out to be different views of the same underlying system. Atlas Embeddings is the proof.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Mathematics, like many fields, is fragmented. Researchers in one area often work with structures that are deeply related to structures in another area, but the connections are invisible because the frameworks are different.
            </p>
            <p>
              This fragmentation slows progress. Insights that could transfer across disciplines stay locked within them. Breakthroughs in one domain may have already been solved, in different language, somewhere else.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The research takes five well-known mathematical objects and shows that each one can be embedded, or mapped, into a single unified framework. The mapping preserves all the essential properties of each structure while revealing the common rules they share.
            </p>
            <p>
              This is not an approximation. It is a precise, formally verified result: the same algebra generates all five structures. Different inputs, same engine, same rules.
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
              <span><strong className="text-foreground">Cross-domain research.</strong> Enables researchers in different fields to recognize shared structure and transfer insights between disciplines.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Foundation for UOR.</strong> Provides the mathematical evidence that a single coordinate system can represent fundamentally different types of information.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Education.</strong> Offers a concrete example of mathematical unification that can be taught and explored at multiple levels.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI and data science.</strong> Suggests new approaches to organizing and comparing data from different domains using shared structural coordinates.</span>
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
              <span>Read the full research paper in the <a href={GITHUB_ATLAS_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Atlas Embeddings repository</a>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Explore the <a href="https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings/lean4" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Lean 4 formal verification</a> of the core claims.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Join the UOR Foundation community to discuss the implications and contribute to ongoing research.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectAtlasEmbeddings;
