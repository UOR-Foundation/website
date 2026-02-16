import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

const featuredProjects = [
  {
    name: "UOR Core",
    category: "Infrastructure",
    description: "Reference implementation — content-addressed, composable data primitives.",
    maturity: "Graduated" as MaturityLevel,
  },
  {
    name: "Semantic Bridge",
    category: "Interoperability",
    description: "Translates existing data formats into UOR's universal coordinate system.",
    maturity: "Incubating" as MaturityLevel,
  },
  {
    name: "Frontier Coordinate Engine",
    category: "Research",
    description: "Content-addressed referencing and semantic search for frontier research.",
    maturity: "Sandbox" as MaturityLevel,
  },
];

const maturityStyles: Record<MaturityLevel, string> = {
  Graduated: "text-primary border-primary/30",
  Incubating: "text-accent border-accent/30",
  Sandbox: "text-muted-foreground border-border",
};

const ProjectsShowcase = () => {
  return (
    <section className="section-dark py-16 md:py-28">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-4">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3 font-body">
              Ecosystem
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="flex items-center gap-2 text-primary text-sm font-medium hover:gap-3 transition-all font-body"
          >
            View all projects <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="rounded-xl border border-section-dark-foreground/10 p-6 md:p-7 hover:border-section-dark-foreground/20 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-medium text-section-dark-foreground/50 font-body uppercase tracking-wider">
                  {project.category}
                </span>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border font-body ${maturityStyles[project.maturity]}`}>
                  {project.maturity}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                {project.name}
              </h3>
              <p className="text-section-dark-foreground/55 font-body text-sm leading-relaxed">
                {project.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsShowcase;