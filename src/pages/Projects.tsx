import Layout from "@/components/Layout";
import { ExternalLink, ChevronRight, ChevronDown, Send, FlaskConical, Rocket, GraduationCap, FileCheck, GitBranch, Users, Scale, ClipboardCheck } from "lucide-react";
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

const submissionSteps = [
  {
    icon: GitBranch,
    title: "1. Prepare Your Repository",
    description: "Ensure your project is open-source (Apache 2.0 or MIT), hosted on GitHub, and has a clear README with purpose, installation, and usage.",
  },
  {
    icon: FileCheck,
    title: "2. Submit for Review",
    description: "Complete the form below with your project details and problem statement. Our technical committee reviews all submissions within 3 weeks.",
  },
  {
    icon: ClipboardCheck,
    title: "3. Enter Sandbox",
    description: "Accepted projects join the Sandbox tier, gain visibility in the UOR ecosystem, and receive community support to grow toward Incubation.",
  },
];

const CollapsibleCategory = ({ level, count, dotColor, children, disabled }: { level: string; count: number; dotColor: string; children: React.ReactNode; disabled?: boolean }) => {
  const [open, setOpen] = useState(!disabled);
  const canToggle = !disabled;
  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      <button
        onClick={() => canToggle && setOpen(!open)}
        className={`w-full flex items-center gap-3 px-6 py-5 md:px-8 md:py-6 transition-colors ${canToggle ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`w-3 h-3 rounded-full ${dotColor}`} />
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          {level}
        </h2>
        {count > 0 && (
          <span className="text-sm text-muted-foreground font-body">
            {count} {count === 1 ? "project" : "projects"}
          </span>
        )}
        <ChevronDown
          size={20}
          className={`ml-auto text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 md:px-8 md:pb-8">
          {children}
        </div>
      )}
    </div>
  );
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
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Project Maturity Framework
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl" style={{ animationDelay: "0.15s" }}>
            An open, transparent path for community projects built on the UOR standard. Every project enters as a <strong className="text-foreground">Sandbox</strong> experiment, grows through <strong className="text-foreground">Incubation</strong> with real-world adoption, and earns <strong className="text-foreground">Graduated</strong> status through proven governance and stability.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#projects-list" className="btn-primary">
              Explore UOR Projects
            </a>
            <a href="#submit" className="btn-outline">
              Submit Your Project
            </a>
          </div>
        </div>
      </section>

      {/* Visual Progression Flow */}
      <section id="maturity" className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-12 text-center">
            Project Maturity Levels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto items-stretch">
            {maturityInfo.map((stage, idx) => {
              const StageIcon = [FlaskConical, Rocket, GraduationCap][idx];
              return (
                <div key={stage.level} className="relative flex flex-col">
                  {/* Mobile arrow connector */}
                  {idx > 0 && (
                    <div className="md:hidden flex justify-center -mb-1 -mt-1 text-muted-foreground/30">
                      <ChevronRight size={24} className="rotate-90" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl border p-6 md:p-8 flex-1 flex flex-col transition-all duration-300 ${maturityBgColors[stage.level]} ${
                      idx === 2 ? 'border-primary/30 shadow-lg shadow-primary/5' : ''
                    } animate-fade-in-up`}
                    style={{ animationDelay: `${idx * 0.12}s` }}
                  >
                    {/* Icon + Stage label */}
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        idx === 0 ? 'bg-muted-foreground/10 text-muted-foreground/60' :
                        idx === 1 ? 'bg-primary/10 text-primary/70' :
                        'bg-primary/15 text-primary'
                      }`}>
                        <StageIcon size={20} />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground/40 font-body uppercase tracking-widest">
                        Stage {idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <span className={`w-3.5 h-3.5 rounded-full ${maturityDotColors[stage.level]} ${
                        idx === 0 ? 'opacity-40' : idx === 1 ? 'opacity-70' : 'opacity-100'
                      }`} />
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {stage.level}
                      </h3>
                    </div>

                    <p className="text-base font-medium text-foreground/70 font-body mb-3 italic md:min-h-[3rem]">
                      {stage.tagline}
                    </p>
                    <p className="text-base text-muted-foreground font-body leading-relaxed mb-5 md:min-h-[5.5rem]">
                      {stage.description}
                    </p>
                    <div className="space-y-2 mt-auto">
                      <p className="text-sm font-semibold text-foreground/50 uppercase tracking-wider font-body">
                        Criteria
                      </p>
                      <ul className="space-y-1.5">
                        {stage.criteria.map((c) => (
                          <li key={c} className="text-sm text-muted-foreground font-body flex items-start gap-2">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${maturityDotColors[stage.level]}`} />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Projects by maturity */}
      <section id="projects-list" className="py-12 md:py-20 bg-background scroll-mt-28">
        <div className="container space-y-6">
          {(["Graduated", "Incubating", "Sandbox"] as MaturityLevel[]).map((level) => {
            const levelProjects = projects.filter((p) => p.maturity === level);
            const hasProjects = levelProjects.length > 0;
            return (
              <CollapsibleCategory key={level} level={level} count={levelProjects.length} dotColor={maturityDotColors[level]} disabled={!hasProjects}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {levelProjects.map((project, index) => (
                    <div
                      key={project.name}
                      className="group bg-card rounded-2xl border border-border p-6 md:p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary font-body">
                          {project.category}
                        </span>
                        <span className={`text-sm font-medium px-3 py-1 rounded-full border font-body ${maturityColors[project.maturity]}`}>
                          {project.maturity}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                        {project.name}
                      </h3>
                      <p className="text-muted-foreground font-body text-base leading-relaxed">
                        {project.description}
                      </p>
                      <div className="mt-5 flex items-center gap-2 text-primary text-base font-medium opacity-0 group-hover:opacity-100 transition-opacity font-body cursor-pointer">
                        Learn more <ExternalLink size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleCategory>
            );
          })}
        </div>
      </section>

      {/* Submission Process */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary font-body mb-4">
              <Scale size={14} /> Open governance
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              How to Submit a Project
            </h2>
            <p className="text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
              The UOR Foundation accepts projects that advance the open data standard for the semantic web, open science, and frontier technology and research. All submissions are reviewed by our technical committee against published criteria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {submissionSteps.map((step, idx) => (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <step.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Submit Form */}
      <section id="submit" className="section-dark py-16 md:py-22">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-section-dark-foreground/50 font-body mb-4">
              <Send size={14} /> Open to everyone
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Submit for Sandbox Review
            </h2>
            <p className="mt-4 text-section-dark-foreground/60 font-body leading-relaxed max-w-xl mx-auto">
              All you need is an open-source repository and a clear problem statement. Our technical committee reviews every submission and responds within 3 weeks.
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
                We'll review your project and get back to you within 3 weeks. Join our{" "}
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
                  <label className="text-base font-medium text-section-dark-foreground font-body">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g. UOR Visualization Engine"
                    className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium text-section-dark-foreground font-body">
                    Repository URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.repoUrl}
                    onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium text-section-dark-foreground font-body">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="maintainer@example.com"
                  className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium text-section-dark-foreground font-body">
                  Short Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="One-line summary of what your project does"
                  className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium text-section-dark-foreground font-body">
                  Problem Statement *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  placeholder="What problem does your project solve? How does it relate to the UOR standard?"
                  className="w-full px-4 py-3 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                />
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
