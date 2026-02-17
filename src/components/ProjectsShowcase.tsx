import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

const featuredProjects = [
  {
    name: "UOR Core",
    category: "Infrastructure",
    description: "Reference implementation of content-addressed, composable data primitives.",
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
  Graduated: "text-primary",
  Incubating: "text-accent",
  Sandbox: "text-muted-foreground",
};

const ProjectsShowcase = () => {
  return (
    <section className="section-dark py-10 md:py-16">
      <div className="container max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div>
            <p className="text-sm md:text-base font-medium tracking-widest uppercase text-primary mb-3 font-body">
              Ecosystem
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="group flex items-center gap-2 text-primary text-base font-medium transition-all duration-300 font-body"
          >
            View all projects{" "}
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="space-y-0">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {index === 0 && <div className="h-px w-full bg-section-dark-foreground/10" />}
              <div className="group py-8 md:py-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-8 items-start transition-all duration-300 hover:pl-2">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-xl md:text-2xl font-semibold transition-colors duration-300 group-hover:text-primary">
                      {project.name}
                    </h3>
                    <span className={`text-sm font-medium font-body ${maturityStyles[project.maturity]}`}>
                      {project.maturity}
                    </span>
                  </div>
                  <p className="text-section-dark-foreground/55 font-body text-base leading-relaxed max-w-lg">
                    {project.description}
                  </p>
                </div>
                <span className="text-sm font-medium text-section-dark-foreground/40 font-body uppercase tracking-wider md:mt-1">
                  {project.category}
                </span>
              </div>
              <div className="h-px w-full bg-section-dark-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsShowcase;
