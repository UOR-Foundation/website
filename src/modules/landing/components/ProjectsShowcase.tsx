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
    <section className="py-24 md:py-32 bg-background">
      <div className="container max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-14 gap-4">
          <div>
             <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary/70 mb-4 font-body">
               UOR Ecosystem
             </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Featured Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="group flex items-center gap-2 text-foreground/40 hover:text-foreground text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 font-body"
          >
            View all projects
            <ArrowRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="h-px w-full bg-foreground/8" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="group p-6 md:p-8 border-b md:border-b-0 md:border-r border-foreground/8 last:border-r-0 last:border-b-0 flex flex-col gap-3 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${maturityDotColors[project.maturity]}`} />
                <span className="text-xs font-semibold text-foreground/30 font-body uppercase tracking-[0.15em]">
                  {project.maturity}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {project.name}
              </h3>
              <p className="text-foreground/40 font-body text-base leading-relaxed flex-1">
                {project.description}
              </p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground/25 font-body uppercase tracking-[0.15em]">
                    {project.category}
                  </span>
                  {project.license && (
                    <span className="text-xs font-mono text-foreground/25 border border-foreground/10 px-1.5 py-0.5">
                      {project.license}
                    </span>
                  )}
                </div>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/30 hover:text-foreground transition-colors"
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
