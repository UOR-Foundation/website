import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { featuredProjects, type MaturityLevel } from "@/data/featured-projects";
import { teamMembers } from "@/data/team-members";

const maturityDotColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary",
  Incubating: "bg-accent",
  Sandbox: "bg-muted-foreground/50",
};


const EcosystemSection = () => {
  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        {/* Featured Projects */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-golden-lg gap-golden-sm">
          <div>
            <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-sm">
              UOR Ecosystem
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="group relative p-6 md:p-8 lg:p-10 border-b md:border-b-0 md:border-r border-foreground/8 last:border-r-0 last:border-b-0 flex flex-col gap-3 panel-active animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.11}s` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${maturityDotColors[project.maturity]}`} />
                <span className="font-semibold text-foreground/50 font-body uppercase tracking-[0.15em] text-fluid-label">{project.maturity}</span>
              </div>
              <h3 className="font-display font-semibold text-foreground text-fluid-card-title">{project.name}</h3>
              <p className="text-foreground/65 font-body leading-relaxed flex-1 text-fluid-lead">{project.description}</p>
              <div className="flex items-center justify-between mt-golden-sm">
                <span className="font-semibold text-foreground/45 font-body uppercase tracking-[0.15em] text-fluid-label">{project.category}</span>
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-foreground transition-colors">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Community members — compact */}
        <div className="mt-golden-lg pt-golden-lg border-t border-foreground/8">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead mb-golden-md">
            UOR Community
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 justify-items-center gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center text-center animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.1 + idx * 0.03}s` }}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 mb-2 group-hover:scale-105 transition-transform duration-300" style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}>
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover object-top" loading="lazy" />
                </div>
                <p className="font-body font-semibold text-foreground leading-tight text-xs md:text-sm">{member.name.split(" ")[0]}</p>
                <p className="font-body text-foreground/55 leading-snug mt-0.5 text-xs">{member.role}</p>
              </a>
            ))}
            <div className="flex flex-col items-center text-center justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 border border-foreground/10 flex items-center justify-center mb-2" style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}>
                <span className="font-mono text-foreground/50 text-sm">+</span>
              </div>
              <p className="font-mono text-foreground/50 text-xs">150+</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;
