import Layout from "@/components/Layout";
import { ExternalLink } from "lucide-react";

const projects = [
  {
    name: "UOR Core",
    category: "Infrastructure",
    status: "Active",
    description: "The reference implementation of the Universal Object Reference specification. Content-addressed, cryptographically verifiable, composable data primitives that form the backbone of the UOR ecosystem.",
  },
  {
    name: "Semantic Bridge",
    category: "Interoperability",
    status: "In Development",
    description: "Middleware translating between existing data formats (JSON-LD, RDF, Protocol Buffers) and UOR's universal coordinate system. Enables seamless adoption without rewriting existing systems.",
  },
  {
    name: "Research Hub",
    category: "Distribution",
    status: "Beta",
    description: "A platform for publishing, discovering, and licensing research products built on UOR-standard infrastructure. Features reproducibility guarantees and transparent attribution.",
  },
  {
    name: "Frontier Coordinate Engine",
    category: "Frontier Technology",
    status: "Research",
    description: "Applying the universal coordinate system to next-generation frontier technology — enabling content-addressed referencing, cross-platform interoperability, and semantic search.",
  },
  {
    name: "Open Science Toolkit",
    category: "Open Science",
    status: "Planning",
    description: "Tools and libraries for researchers to publish reproducible experiments, manage datasets, and share findings using the UOR standard for data integrity and provenance.",
  },
  {
    name: "Developer SDK",
    category: "Developer Tools",
    status: "Active",
    description: "SDKs and client libraries for building applications on the UOR standard. Available for JavaScript/TypeScript, Python, and Rust with comprehensive documentation.",
  },
];

const Projects = () => {
  return (
    <Layout>
      <section className="hero-gradient py-20 md:py-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Projects
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Explore the ecosystem of projects built on the UOR standard. Each project extends the foundation's mission of creating open, interoperable data infrastructure.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project, index) => (
              <div
                key={project.name}
                className="group bg-card rounded-2xl border border-border p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary font-body">
                    {project.category}
                  </span>
                  <span className="text-xs text-muted-foreground font-body px-3 py-1 rounded-full bg-secondary">
                    {project.status}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {project.name}
                </h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                  {project.description}
                </p>
                <div className="mt-5 flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity font-body cursor-pointer">
                  Learn more <ExternalLink size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
