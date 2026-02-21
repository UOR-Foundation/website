import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ExternalLink, ChevronRight, ChevronDown, Send, FlaskConical, Rocket, GraduationCap, FolderGit2, SearchCheck, BadgeCheck, Users, Scale, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import projectHologramImg from "@/assets/project-hologram.jpg";
import projectAtlasImg from "@/assets/project-atlas.png";
import projectAtomicLangImg from "@/assets/project-atomic-lang.jpg";
import projectPrismImg from "@/assets/project-prism.png";
import { projects as projectsData, maturityInfo, type MaturityLevel, type ProjectData } from "@/data/projects";
import { DISCORD_URL } from "@/data/external-links";
import { supabase } from "@/integrations/supabase/client";

const imageMap: Record<string, string> = {
  hologram: projectHologramImg,
  atlas: projectAtlasImg,
  atomicLang: projectAtomicLangImg,
  prism: projectPrismImg,
};

type Project = ProjectData & { image?: string };

const projects: Project[] = projectsData.map(p => ({
  ...p,
  image: p.imageKey ? imageMap[p.imageKey] : undefined,
}));

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
    icon: FolderGit2,
    title: "1. Prepare Your Repository",
    description: "Ensure your project is open-source (Apache 2.0 or MIT), hosted on GitHub, and has a clear README with purpose, installation, and usage.",
  },
  {
    icon: SearchCheck,
    title: "2. Submit for Review",
    description: "Complete the form below with your project details and problem statement. Our technical committee reviews all submissions within 3 weeks.",
  },
  {
    icon: BadgeCheck,
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data, error } = await supabase.functions.invoke('project-submit', {
        body: {
          projectName: formData.projectName,
          repoUrl: formData.repoUrl,
          contactEmail: formData.contactEmail,
          description: formData.description,
          problemStatement: formData.problemStatement,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
      <section id="maturity" className="py-16 md:py-28 bg-background border-b border-border">
        <div className="container">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-16 text-center">
            Project Maturity Levels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto items-stretch">
            {maturityInfo.map((stage, idx) => {
              const StageIcon = [FlaskConical, Rocket, GraduationCap][idx];
              return (
                <div key={stage.level} className="relative flex flex-col">
                  {idx > 0 && (
                    <div className="md:hidden flex justify-center -mb-1 -mt-1 text-muted-foreground/30">
                      <ChevronRight size={24} className="rotate-90" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl border p-7 md:p-10 flex-1 flex flex-col transition-all duration-300 ${maturityBgColors[stage.level]} ${
                      idx === 2 ? 'border-primary/30 shadow-lg shadow-primary/5' : ''
                    } animate-fade-in-up`}
                    style={{ animationDelay: `${idx * 0.12}s` }}
                  >
                    <div className="flex items-center justify-between mb-7">
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
                    <div className="flex items-center gap-3 mb-5">
                      <span className={`w-3.5 h-3.5 rounded-full ${maturityDotColors[stage.level]} ${
                        idx === 0 ? 'opacity-40' : idx === 1 ? 'opacity-70' : 'opacity-100'
                      }`} />
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {stage.level}
                      </h3>
                    </div>
                    <p className="text-base font-medium text-foreground/70 font-body mb-4 italic md:min-h-[3rem]">
                      {stage.tagline}
                    </p>
                    <p className="text-base text-muted-foreground font-body leading-relaxed mb-7 md:min-h-[5.5rem]">
                      {stage.description}
                    </p>
                    <div className="space-y-3 mt-auto">
                      <p className="text-sm font-semibold text-foreground/50 uppercase tracking-wider font-body mb-1">
                        Criteria
                      </p>
                      <ul className="space-y-2.5">
                        {stage.criteria.map((c) => (
                          <li key={c} className="text-base text-muted-foreground font-body flex items-start gap-2">
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
      <section id="projects-list" className="py-16 md:py-28 bg-background scroll-mt-28">
        <div className="container max-w-5xl space-y-8">
          {(["Graduated", "Incubating", "Sandbox"] as MaturityLevel[]).map((level) => {
            const levelProjects = projects.filter((p) => p.maturity === level);
            const hasProjects = levelProjects.length > 0;
            return (
              <CollapsibleCategory key={level} level={level} count={levelProjects.length} dotColor={maturityDotColors[level]} disabled={!hasProjects}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {levelProjects.map((project, index) => (
                    <div
                      key={project.name}
                      className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up flex flex-col"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      {project.image && (
                        <div className={`w-full h-60 overflow-hidden relative ${project.maturity === 'Sandbox' ? 'project-card-glow' : ''}`}>
                          <img
                            src={project.image}
                            alt={project.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-7 md:p-9 flex flex-col flex-1">
                        <div className="flex items-center justify-between gap-2 mb-5">
                          <span className="text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body whitespace-nowrap truncate">
                            {project.category}
                          </span>
                          <span className={`text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full border font-body whitespace-nowrap shrink-0 ${maturityColors[project.maturity]}`}>
                            {project.maturity}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                          {project.name}
                        </h3>
                        <p className="text-muted-foreground font-body text-base leading-relaxed">
                          {project.description}
                        </p>
                        {project.url && (
                          <div className="mt-auto pt-6 flex items-center gap-4">
                            {(project as any).slug && (
                              <Link to={`/projects/${(project as any).slug}`} className="flex items-center gap-2 text-primary text-base font-medium transition-opacity font-body cursor-pointer hover:underline">
                                Learn more
                              </Link>
                            )}
                            <a href={project.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground text-sm font-medium transition-opacity font-body cursor-pointer hover:text-foreground hover:underline">
                              Repository <ExternalLink size={13} />
                            </a>
                          </div>
                        )}
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
      <section className="py-16 md:py-28 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary font-body mb-4">
              <Scale size={14} /> Open governance
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              How to Submit a Project
            </h2>
            <p className="text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
              Open source projects that align with the UOR standard. Reviewed by our technical committee against published criteria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {submissionSteps.map((step, idx) => (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-7 md:p-10 animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon size={20} className="text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">{step.title}</h3>
                </div>
                <p className="text-base text-muted-foreground font-body leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Submit Form */}
      <section id="submit" className="section-dark py-20 md:py-28">
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
            <div className="text-center py-20 md:py-28 animate-fade-in-up">
              <div className="relative w-28 h-28 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.94s' }} />
                <div className="absolute inset-2 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '1.94s', animationDelay: '0.3s' }} />
                <div className="relative w-28 h-28 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                  <CheckCircle2 size={48} className="text-primary" />
                </div>
              </div>

              <h3 className="font-display text-4xl md:text-5xl font-bold text-section-dark-foreground mb-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                You're In.
              </h3>
              <p className="text-xl md:text-2xl text-section-dark-foreground/70 font-body mb-4 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                Your project has been submitted for Sandbox review.
              </p>
              <p className="text-base text-section-dark-foreground/45 font-body max-w-md mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                Our technical committee will review your submission and respond within 3 weeks.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.65s' }}>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity font-body text-base"
                >
                  Join Our Discord
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ projectName: "", repoUrl: "", contactEmail: "", description: "", problemStatement: "" }); }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-section-dark-foreground/15 text-section-dark-foreground/60 font-medium hover:border-section-dark-foreground/30 transition-colors font-body text-base"
                >
                  Submit Another
                </button>
              </div>
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

              {submitError && (
                <p className="text-sm text-destructive font-body">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity font-body flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} className={submitting ? 'animate-pulse' : ''} />
                {submitting ? 'Submitting…' : 'Submit for Sandbox Review'}
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
