import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { featuredProjects } from "@/data/featured-projects";

const EcosystemSection = () => {
  return (
    <section className="py-14 md:py-20 bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        {/* Featured Projects */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-golden-lg gap-golden-sm">
          <div>
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-sm">
              Projects
            </p>
            <h2 className="font-display font-bold text-foreground text-fluid-heading">
              Projects built on UOR.
            </h2>
          </div>
          <Link
            to="/projects"
            className="group flex items-center gap-2 text-foreground/60 hover:text-foreground font-semibold uppercase tracking-[0.15em] transition-all duration-300 font-body text-fluid-label"
          >
            View all projects
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="rule-prime" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {featuredProjects.map((project, index) => (
            <Link
              key={project.name}
              to={`/projects/${project.slug}`}
              className="group relative p-6 md:p-8 lg:p-10 border-b md:border-b-0 md:border-r border-foreground/8 last:border-r-0 last:border-b-0 flex flex-col gap-3 panel-active animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.11}s` }}
            >
              <h3 className="font-display font-semibold text-foreground text-fluid-card-title">{project.name}</h3>
              <p className="text-foreground/65 font-body leading-relaxed flex-1 text-fluid-lead">{project.description}</p>
              <div className="flex items-center justify-between mt-golden-sm">
                <span className="font-semibold text-foreground/45 font-body uppercase tracking-[0.15em] text-fluid-label">{project.category}</span>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/50 hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default EcosystemSection;
