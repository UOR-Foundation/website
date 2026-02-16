import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const featuredProjects = [
  {
    name: "UOR Core",
    category: "Infrastructure",
    description: "The reference implementation of the Universal Object Reference specification — content-addressed, composable data primitives.",
    status: "Active",
  },
  {
    name: "Semantic Bridge",
    category: "Interoperability",
    description: "Middleware layer translating between existing data formats and UOR's universal coordinate system for seamless integration.",
    status: "In Development",
  },
  {
    name: "Research Hub",
    category: "Distribution",
    description: "Platform for publishing, discovering, and licensing research products built on UOR-standard data infrastructure.",
    status: "Beta",
  },
];

const ProjectsShowcase = () => {
  return (
    <section className="section-dark py-20 md:py-28">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Featured Projects
            </h2>
            <p className="mt-3 text-section-dark-foreground/70 font-body text-lg max-w-xl">
              Projects built on the UOR standard, driving real-world adoption of universal data infrastructure.
            </p>
          </div>
          <Link
            to="/projects"
            className="flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all font-body"
          >
            View all projects <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredProjects.map((project, index) => (
            <div
              key={project.name}
              className="group rounded-2xl border border-section-dark-foreground/10 p-7 hover:border-primary/30 transition-all duration-300 bg-section-dark-foreground/5 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/15 text-primary font-body">
                  {project.category}
                </span>
                <span className="text-xs text-section-dark-foreground/50 font-body">
                  {project.status}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                {project.name}
              </h3>
              <p className="text-section-dark-foreground/60 font-body text-sm leading-relaxed">
                {project.description}
              </p>
              <div className="mt-5 flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity font-body">
                Learn more <ExternalLink size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsShowcase;
