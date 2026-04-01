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
    <section className="py-section-md bg-background">
      <div className="container max-w-[1600px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-golden-lg gap-golden-sm">
          <div>
            <div className="flex items-center gap-3 mb-golden-sm">
              <span className="font-mono text-fluid-body tracking-[0.12em] text-foreground/25">§5</span>
              <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead">
                UOR Ecosystem
              </p>
            </div>
            <h2 className="font-display font-bold text-foreground text-fluid-heading">
              Featured Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="group flex items-center gap-2 text-foreground/60 hover:text-foreground font-semibold uppercase tracking-[0.15em] transition-all duration-300 font-body text-fluid-label"
          >
            View all projects
            <ArrowRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="rule-prime" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="group relative p-6 md:p-8 lg:p-10 border-b md:border-b-0 md:border-r border-foreground/8 last:border-r-0 last:border-b-0 flex flex-col gap-3 panel-active animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.11}s` }}
            >
              <span className="absolute top-4 right-4 font-mono text-[0.625rem] text-foreground/[0.08]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${maturityDotColors[project.maturity]}`} />
                <span className="font-semibold text-foreground/50 font-body uppercase tracking-[0.15em] text-fluid-label">
                  {project.maturity}
                </span>
              </div>
              <h3 className="font-display font-semibold text-foreground text-fluid-card-title">
                {project.name}
              </h3>
              <p className="text-foreground/65 font-body leading-relaxed flex-1 text-fluid-lead">
                {project.description}
              </p>
              <div className="flex items-center justify-between mt-golden-sm">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground/45 font-body uppercase tracking-[0.15em] text-fluid-label">
                    {project.category}
                  </span>
                  {project.license && (
                    <span className="text-xs font-mono text-foreground/45 border border-foreground/15 px-1.5 py-0.5">
                      {project.license}
                    </span>
                  )}
                </div>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/50 hover:text-foreground transition-colors"
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
