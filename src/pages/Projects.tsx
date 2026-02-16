import Layout from "@/components/Layout";
import { ExternalLink } from "lucide-react";

type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

interface Project {
  name: string;
  category: string;
  description: string;
  maturity: MaturityLevel;
}

const projects: Project[] = [
  {
    name: "UOR Core",
    category: "Infrastructure",
    description: "Reference implementation — content-addressed, composable data primitives.",
    maturity: "Graduated",
  },
  {
    name: "Developer SDK",
    category: "Developer Tools",
    description: "Client libraries for JavaScript/TypeScript, Python, and Rust.",
    maturity: "Graduated",
  },
  {
    name: "Semantic Bridge",
    category: "Interoperability",
    description: "Translates JSON-LD, RDF, and Protocol Buffers into UOR's coordinate system.",
    maturity: "Incubating",
  },
  {
    name: "Research Hub",
    category: "Distribution",
    description: "Publish, discover, and license research products with reproducibility guarantees.",
    maturity: "Incubating",
  },
  {
    name: "Frontier Coordinate Engine",
    category: "Frontier Technology & Research",
    description: "Content-addressed referencing and semantic search for frontier technology and research.",
    maturity: "Sandbox",
  },
  {
    name: "Open Science Toolkit",
    category: "Open Science",
    description: "Reproducible experiments, dataset management, and findings sharing on UOR.",
    maturity: "Sandbox",
  },
];

const maturityLevels: { level: MaturityLevel; description: string }[] = [
  {
    level: "Graduated",
    description: "Production-ready. Proven adoption and stable governance.",
  },
  {
    level: "Incubating",
    description: "Growing adoption. Active development with clear roadmap.",
  },
  {
    level: "Sandbox",
    description: "Early stage. Experimental projects with high potential.",
  },
];

const maturityColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary/15 text-primary border-primary/20",
  Incubating: "bg-accent/15 text-accent border-accent/20",
  Sandbox: "bg-muted text-muted-foreground border-border",
};

const maturityDotColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary",
  Incubating: "bg-accent",
  Sandbox: "bg-muted-foreground/50",
};

const Projects = () => {
  return (
    <Layout>
      <section className="hero-gradient py-20 md:py-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Projects
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            The ecosystem building on the UOR standard.
          </p>
        </div>
      </section>

      {/* Maturity model legend */}
      <section className="py-12 bg-background border-b border-border">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {maturityLevels.map((item) => (
              <div key={item.level} className="flex items-start gap-3">
                <span className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${maturityDotColors[item.level]}`} />
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{item.level}</h3>
                  <p className="text-sm text-muted-foreground font-body">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects by maturity */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container space-y-16">
          {maturityLevels.map(({ level }) => {
            const levelProjects = projects.filter((p) => p.maturity === level);
            if (levelProjects.length === 0) return null;
            return (
              <div key={level}>
                <div className="flex items-center gap-3 mb-6">
                  <span className={`w-3 h-3 rounded-full ${maturityDotColors[level]}`} />
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {level}
                  </h2>
                  <span className="text-sm text-muted-foreground font-body">
                    {levelProjects.length} {levelProjects.length === 1 ? "project" : "projects"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {levelProjects.map((project, index) => (
                    <div
                      key={project.name}
                      className="group bg-card rounded-2xl border border-border p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary font-body">
                          {project.category}
                        </span>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full border font-body ${maturityColors[project.maturity]}`}>
                          {project.maturity}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                        {project.name}
                      </h3>
                      <p className="text-muted-foreground font-body text-sm leading-relaxed">
                        {project.description}
                      </p>
                      <div className="mt-5 flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity font-body cursor-pointer">
                        Learn more <ExternalLink size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
