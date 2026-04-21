import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { featuredProjects, type MaturityLevel } from "@/data/featured-projects";
import ProjectCard from "@/modules/projects/components/ProjectCard";

const EcosystemSection = () => {
  return (
    <section className="py-[clamp(3.5rem,10vw,5rem)] md:py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        {/* Featured Projects */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-golden-lg gap-golden-sm">
          <div>
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-sm">
              Our Projects
            </p>
            <h2 className="font-display font-bold text-foreground text-fluid-heading">
              Featured Projects
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-golden-md">
          {featuredProjects.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              variant="compact"
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.11}s`, animationFillMode: "forwards" }}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default EcosystemSection;
