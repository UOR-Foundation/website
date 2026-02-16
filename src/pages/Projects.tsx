import Layout from "@/components/Layout";
import { ExternalLink, ArrowRight, ChevronRight, Send } from "lucide-react";
import { useState } from "react";

type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

interface Project {
  name: string;
  category: string;
  description: string;
  maturity: MaturityLevel;
}

const projects: Project[] = [
  {
    name: "UOR Core",
    category: "Infrastructure",
    description: "Reference implementation — content-addressed, composable data primitives.",
    maturity: "Graduated",
  },
  {
    name: "Developer SDK",
    category: "Developer Tools",
    description: "Client libraries for JavaScript/TypeScript, Python, and Rust.",
    maturity: "Graduated",
  },
  {
    name: "Semantic Bridge",
    category: "Interoperability",
    description: "Translates JSON-LD, RDF, and Protocol Buffers into UOR's coordinate system.",
    maturity: "Incubating",
  },
  {
    name: "Research Hub",
    category: "Distribution",
    description: "Publish, discover, and license research products with reproducibility guarantees.",
    maturity: "Incubating",
  },
  {
    name: "Frontier Coordinate Engine",
    category: "Frontier Technology & Research",
    description: "Content-addressed referencing and semantic search for frontier technology and research.",
    maturity: "Sandbox",
  },
  {
    name: "Open Science Toolkit",
    category: "Open Science",
    description: "Reproducible experiments, dataset management, and findings sharing on UOR.",
    maturity: "Sandbox",
  },
];

const maturityInfo: { level: MaturityLevel; tagline: string; description: string; criteria: string[] }[] = [
  {
    level: "Sandbox",
    tagline: "Early stage & experimental",
    description: "New projects with high potential. Open to anyone with an idea that aligns with the UOR standard.",
    criteria: [
      "Aligns with the UOR Foundation mission",
      "Has a clear problem statement",
      "At least one committed maintainer",
      "Open-source license (Apache 2.0 or MIT)",
    ],
  },
  {
    level: "Incubating",
    tagline: "Growing adoption & active development",
    description: "Projects with a clear roadmap, growing contributor base, and demonstrated value to the ecosystem.",
    criteria: [
      "Healthy contributor growth",
      "Production use by at least 2 organizations",
      "Clear governance model",
      "Passing CI/CD and documentation standards",
    ],
  },
  {
    level: "Graduated",
    tagline: "Production-ready & proven",
    description: "Stable, widely adopted projects with mature governance and long-term sustainability.",
    criteria: [
      "Broad adoption across the ecosystem",
      "Committer diversity from multiple organizations",
      "Security audit completed",
      "Stable release cadence with semantic versioning",
    ],
  },
];

const maturityColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary/15 text-primary border-primary/20",
  Incubating: "bg-accent/15 text-accent border-accent/20",
  Sandbox: "bg-muted text-muted-foreground border-border",
};

const maturityDotColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary",
  Incubating: "bg-accent",
  Sandbox: "bg-muted-foreground/50",
};

const maturityBgColors: Record<MaturityLevel, string> = {
  Graduated: "border-primary/20 bg-primary/5",
  Incubating: "border-accent/20 bg-accent/5",
  Sandbox: "border-border bg-muted/30",
};

const Projects = () => {
  const [formData, setFormData] = useState({
    projectName: "",
    repoUrl: "",
    contactEmail: "",
    description: "",
    problemStatement: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient py-24 md:py-32">
        <div className="container max-w-4xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-6 font-body animate-fade-in-up">
            Ecosystem
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] text-balance animate-fade-in-up">
            Project Maturity Framework
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl" style={{ animationDelay: "0.1s" }}>
            Every UOR project follows a clear progression from <strong className="text-foreground">Sandbox</strong> to{" "}
            <strong className="text-foreground">Incubating</strong> to{" "}
            <strong className="text-foreground">Graduated</strong> — mirroring proven open-source governance models.
          </p>
        </div>
      </section>

      {/* Visual Progression Flow */}
      <section className="py-16 md:py-20 bg-background border-b border-border">
        <div className="container">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            How Projects Evolve
          </h2>
          <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
            Projects enter as Sandbox experiments and mature through demonstrated adoption, governance, and community health.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0 max-w-5xl mx-auto">
            {maturityInfo.map((stage, idx) => (
              <div key={stage.level} className="relative flex flex-col">
                {/* Arrow connector (desktop) */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40">
                    <ChevronRight size={32} />
                  </div>
                )}
                {/* Arrow connector (mobile) */}
                {idx < 2 && (
                  <div className="md:hidden flex justify-center py-3 text-muted-foreground/40">
                    <ArrowRight size={24} className="rotate-90" />
                  </div>
                )}

                <div className={`rounded-2xl border p-6 md:p-8 flex-1 ${maturityBgColors[stage.level]} animate-fade-in-up`} style={{ animationDelay: `${idx * 0.12}s` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-3.5 h-3.5 rounded-full ${maturityDotColors[stage.level]}`} />
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {stage.level}
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-foreground/70 font-body mb-3 italic">
                    {stage.tagline}
                  </p>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed mb-5">
                    {stage.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider font-body">
                      Criteria
                    </p>
                    <ul className="space-y-1.5">
                      {stage.criteria.map((c) => (
                        <li key={c} className="text-xs text-muted-foreground font-body flex items-start gap-2">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${maturityDotColors[stage.level]}`} />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects by maturity */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container space-y-16">
          {(["Graduated", "Incubating", "Sandbox"] as MaturityLevel[]).map((level) => {
            const levelProjects = projects.filter((p) => p.maturity === level);
            if (levelProjects.length === 0) return null;
            return (
              <div key={level}>
                <div className="flex items-center gap-3 mb-6">
                  <span className={`w-3 h-3 rounded-full ${maturityDotColors[level]}`} />
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {level}
                  </h2>
                  <span className="text-sm text-muted-foreground font-body">
                    {levelProjects.length} {levelProjects.length === 1 ? "project" : "projects"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {levelProjects.map((project, index) => (
                    <div
                      key={project.name}
                      className="group bg-card rounded-2xl border border-border p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary font-body">
                          {project.category}
                        </span>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full border font-body ${maturityColors[project.maturity]}`}>
                          {project.maturity}
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
            );
          })}
        </div>
      </section>

      {/* Submit a Sandbox Project */}
      <section id="submit" className="section-dark py-20 md:py-28">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary font-body mb-4">
              <Send size={14} /> Open to everyone
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Submit a Project for Sandbox
            </h2>
            <p className="mt-4 text-section-dark-foreground/60 font-body leading-relaxed max-w-xl mx-auto">
              Have an idea that builds on the UOR standard? Submit it for Sandbox consideration. All you need is an open-source repo and a clear problem statement.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-16 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Send size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">
                Submission Received
              </h3>
              <p className="text-section-dark-foreground/60 font-body">
                We'll review your project and get back to you within 2 weeks. Join our{" "}
                <a href="https://discord.gg/ZwuZaNyuve" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Discord
                </a>{" "}
                to stay updated.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-section-dark-foreground font-body">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g. UOR Visualization Engine"
                    className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-section-dark-foreground font-body">
                    Repository URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.repoUrl}
                    onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-section-dark-foreground font-body">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="maintainer@example.com"
                  className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-section-dark-foreground font-body">
                  Short Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="One-line summary of what your project does"
                  className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-section-dark-foreground font-body">
                  Problem Statement *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  placeholder="What problem does your project solve? How does it relate to the UOR standard?"
                  className="w-full px-4 py-3 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                />
              </div>

              <div className="rounded-xl border border-section-dark-foreground/10 bg-section-dark-foreground/5 p-5">
                <p className="text-xs font-semibold text-section-dark-foreground/50 uppercase tracking-wider font-body mb-3">
                  Sandbox Requirements Checklist
                </p>
                <ul className="space-y-2">
                  {maturityInfo[0].criteria.map((c) => (
                    <li key={c} className="text-sm text-section-dark-foreground/60 font-body flex items-start gap-2.5">
                      <span className="mt-1 w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity font-body flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Submit for Sandbox Review
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
