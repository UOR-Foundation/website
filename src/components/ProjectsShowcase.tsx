import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

const featuredProjects = [
  {
    name: "Hologram",
    category: "Frontier Technology",
    description: "A software-defined foundation for computation. High-performance virtual infrastructure built on a fundamentally new geometric computing paradigm.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://gethologram.ai/",
  },
  {
    name: "Atlas Embeddings",
    category: "Open Science",
    description: "A rigorous mathematical framework demonstrating how all five exceptional Lie groups emerge from a single initial object: the Atlas of Resonance Classes.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
  },
  {
    name: "Atomic Language Model",
    category: "Frontier Technology",
    description: "A mathematically rigorous, recursively complete language model implementing Chomsky's Minimalist Grammar via formal Merge and Move transformations.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://github.com/dkypuros/atomic-lang-model",
  },
  {
    name: "Prism",
    category: "Open Science",
    description: "A universal coordinate system for information. Prism provides a mathematically grounded framework for encoding, addressing, and navigating all forms of data.",
    maturity: "Sandbox" as MaturityLevel,
    url: "https://github.com/UOR-Foundation/prism",
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
            <p className="text-sm md:text-base font-medium tracking-widest uppercase text-section-dark-foreground/50 mb-3 font-body">
              Ecosystem
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="group flex items-center gap-2 text-section-dark-foreground/70 hover:text-section-dark-foreground text-base font-medium transition-all duration-300 font-body"
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
                    <h3 className="font-display text-xl md:text-2xl font-semibold text-section-dark-foreground transition-colors duration-300 group-hover:text-white">
                      {project.name}
                    </h3>
                    <span className={`text-base font-medium font-body ${maturityStyles[project.maturity]}`}>
                      {project.maturity}
                    </span>
                  </div>
                  <p className="text-section-dark-foreground/55 font-body text-base leading-relaxed max-w-lg">
                    {project.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 md:mt-1">
                  <span className="text-base font-medium text-section-dark-foreground/40 font-body uppercase tracking-wider">
                    {project.category}
                  </span>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-section-dark-foreground/50 hover:text-primary transition-colors duration-200 font-body"
                    >
                      Learn more <ExternalLink size={13} />
                    </a>
                  )}
                </div>
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
