import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { featuredProjects, type MaturityLevel } from "@/data/featured-projects";

const maturityDotColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary",
  Incubating: "bg-accent",
  Sandbox: "bg-muted-foreground/50",
};

const ProjectsShowcase = () => {
  return (
    <section className="section-dark py-10 md:py-16">
      <div className="container max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-4">
          <div>
            <p className="text-sm md:text-base font-medium tracking-widest uppercase text-section-dark-foreground/50 mb-3 font-body">
              UOR Ecosystem
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Featured Projects
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="group rounded-xl border border-section-dark-foreground/10 bg-section-dark-foreground/[0.03] p-6 flex flex-col gap-3 hover:border-section-dark-foreground/20 hover:bg-section-dark-foreground/[0.06] transition-all duration-300 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${maturityDotColors[project.maturity]}`} />
                <span className="text-xs font-medium text-section-dark-foreground/40 font-body uppercase tracking-wider">
                  {project.maturity}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-section-dark-foreground">
                {project.name}
              </h3>
              <p className="text-section-dark-foreground/55 font-body text-sm leading-relaxed flex-1">
                {project.description}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-section-dark-foreground/30 font-body uppercase tracking-wider">
                    {project.category}
                  </span>
                  {project.license && (
                    <span className="text-[0.625rem] font-mono text-section-dark-foreground/35 border border-section-dark-foreground/10 rounded px-1.5 py-0.5">
                      {project.license}
                    </span>
                  )}
                </div>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-section-dark-foreground/40 hover:text-primary transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsShowcase;
