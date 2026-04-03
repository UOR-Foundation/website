import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ExternalLink, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { projects as projectsData, maturityInfo, type MaturityLevel, type ProjectData } from "@/data/projects";
import { DISCORD_URL, GITHUB_ORG_URL } from "@/data/external-links";
import { supabase } from "@/integrations/supabase/client";

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
    problemStatement: "N/A",
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
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            Projects
          </h1>
          <p className="mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-4xl" style={{ animationDelay: "0.15s" }}>
            Open-source tools and infrastructure built on the UOR Framework. Browse the catalog, or submit your own.
          </p>
          <div
            className="mt-12 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#submit" className="btn-primary">
              Submit a Project
            </a>
            <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center gap-2">
              View on GitHub <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Maturity Model. compact inline reference */}
      <section id="maturity" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Project Maturity
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maturityInfo.map((stage, idx) => (
              <div
                key={stage.level}
                className={`rounded-2xl border p-5 flex items-start gap-3 ${maturityBgColors[stage.level]} animate-fade-in-up opacity-0`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <span className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${maturityDotColors[stage.level]}`} />
                <div>
                  <h3 className="font-display text-fluid-card-title font-bold text-foreground">{stage.level}</h3>
                  <p className="text-fluid-body text-foreground/70 font-body leading-relaxed mt-1">{stage.tagline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Projects. flat grid */}
      <section id="projects-list" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            All Projects
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsData.map((project, index) => (
              <Link
                key={project.slug}
                to={`/projects/${project.slug}`}
                className="group rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up opacity-0 flex flex-col"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-fluid-label font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body truncate">{project.category}</span>
                  <span className={`text-fluid-label font-medium px-2 py-0.5 rounded-full border font-body shrink-0 ${maturityColors[project.maturity]}`}>{project.maturity}</span>
                </div>
                <h3 className="font-display text-fluid-card-title font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                <p className="text-foreground/65 font-body text-fluid-body leading-relaxed flex-1">{project.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-primary text-fluid-label font-medium font-body group-hover:gap-2 transition-all">
                    Learn more <ChevronRight size={14} />
                  </span>
                  {project.url && (
                    <span
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(project.url, "_blank"); }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink size={14} />
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Submit a Project */}
      <section id="submit" className="section-dark py-section-sm scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="text-center mb-8">
            <h2 className="font-display text-fluid-heading font-bold">
              Submit a Project
            </h2>
            <p className="mt-4 text-section-dark-foreground/60 font-body leading-relaxed max-w-xl mx-auto">
              All you need is an open-source repository and a clear description. Our technical committee reviews every submission within 3 weeks.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-16 animate-fade-in-up">
              <div className="relative w-28 h-28 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.94s' }} />
                <div className="relative w-28 h-28 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                  <CheckCircle2 size={48} className="text-primary" />
                </div>
              </div>
              <h3 className="font-display text-fluid-page-title font-bold text-section-dark-foreground mb-5">You're In.</h3>
              <p className="text-xl text-section-dark-foreground/70 font-body mb-4">Your project has been submitted for Sandbox review.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity font-body">
                  Join Our Discord <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ projectName: "", repoUrl: "", contactEmail: "", description: "", problemStatement: "N/A" }); }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-section-dark-foreground/15 text-section-dark-foreground/60 font-medium hover:border-section-dark-foreground/30 transition-colors font-body"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-fluid-body font-medium text-section-dark-foreground font-body">Project Name *</label>
                  <input type="text" required value={formData.projectName} onChange={(e) => setFormData({ ...formData, projectName: e.target.value })} placeholder="e.g. UOR Visualization Engine" className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-fluid-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-fluid-body font-medium text-section-dark-foreground font-body">Repository URL *</label>
                  <input type="url" required value={formData.repoUrl} onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })} placeholder="https://github.com/..." className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-fluid-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-fluid-body font-medium text-section-dark-foreground font-body">Contact Email *</label>
                <input type="email" required value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} placeholder="maintainer@example.com" className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-fluid-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-fluid-body font-medium text-section-dark-foreground font-body">Short Description *</label>
                <input type="text" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="One-line summary of what your project does" className="w-full h-11 px-4 rounded-xl border border-section-dark-foreground/15 bg-section-dark-foreground/5 text-section-dark-foreground placeholder:text-section-dark-foreground/30 font-body text-fluid-body focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
              {submitError && <p className="text-fluid-label text-destructive font-body">{submitError}</p>}
              <button type="submit" disabled={submitting} className="w-full md:w-auto px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity font-body flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={16} className={submitting ? 'animate-pulse' : ''} />
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
