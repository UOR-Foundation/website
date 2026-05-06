import Layout from "@/modules/core/components/Layout";
import { ExternalLink, Send, CheckCircle2, Github, LayoutGrid, List, Box, Cpu, Terminal, Atom, Bitcoin, ShieldCheck, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { projects as projectsData } from "@/data/projects";
import { DISCORD_URL, GITHUB_ORG_URL } from "@/data/external-links";
import { supabase } from "@/integrations/supabase/client";
import imgHologram from "@/assets/project-hologram.jpg";
import imgAtlas from "@/assets/project-atlas.png";
import imgAtomicLang from "@/assets/project-atomic-lang.jpg";
import imgAnunix from "@/assets/project-anunix.jpg";
import imgPrismBtc from "@/assets/project-prism-btc.jpg";
import imgSeveranceAi from "@/assets/project-severance-ai.jpg";

const projectImageMap: Record<string, string> = {
  hologram: imgHologram,
  atlas: imgAtlas,
  atomicLang: imgAtomicLang,
  anunix: imgAnunix,
  prismBtc: imgPrismBtc,
  severanceAi: imgSeveranceAi,
};

const projectIconMap: Record<string, LucideIcon> = {
  hologram: Box,
  atomicLang: Cpu,
  anunix: Terminal,
  atlas: Atom,
  prismBtc: Bitcoin,
  severanceAi: ShieldCheck,
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
            A curated catalog of open-source projects built on the UOR Framework. Each one is independently maintained and verifiable end-to-end. Explore the projects below, or submit your own for review.
          </p>
          <div
            className="mt-12 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#submit" className="btn-primary">
              Submit a Project
            </a>
          </div>
        </div>
      </section>

      {/* All Projects. flat grid */}
      <section id="projects-list" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            All Projects
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-10">Build with UOR</h2>
          <ProjectAwesomeList />
        </div>
      </section>

      {/* Submit a Project */}
      <section id="submit" className="section-dark py-section-sm scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="text-center mb-8">
            <h2 className="font-display text-fluid-heading font-bold">
              Submit a Project
            </h2>
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
              <p className="text-fluid-body text-section-dark-foreground/70 font-body mb-4">Your project has been submitted for review.</p>
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

const DISPLAY_ORDER = [
  "hologram",
  "atomic-language-model",
  "anunix",
  "atlas-embeddings",
  "prism-btc",
  "project-severance-ai",
];

const ProjectAwesomeList = () => {
  const [view, setView] = useState<"grid" | "list">("grid");

  const ordered = useMemo(() => {
    const bySlug = new Map(projectsData.map((p) => [p.slug, p]));
    const ranked = DISPLAY_ORDER.map((s) => bySlug.get(s)).filter(Boolean) as typeof projectsData;
    const extras = projectsData.filter((p) => !DISPLAY_ORDER.includes(p.slug));
    return [...ranked, ...extras];
  }, []);

  return (
    <div>
      <div className="flex justify-end mb-6">
        <div className="inline-flex items-center rounded-full border border-border/70 bg-card p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-fluid-label font-semibold uppercase tracking-[0.14em] font-body transition-colors ${view === "grid" ? "bg-primary/15 text-primary" : "text-foreground/60 hover:text-foreground"}`}
          >
            <LayoutGrid size={14} strokeWidth={2} />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-fluid-label font-semibold uppercase tracking-[0.14em] font-body transition-colors ${view === "list" ? "bg-primary/15 text-primary" : "text-foreground/60 hover:text-foreground"}`}
          >
            <List size={14} strokeWidth={2} />
            List
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-golden-lg gap-y-golden-xl">
          {ordered.map((p) => {
            const img = p.imageKey ? projectImageMap[p.imageKey] : undefined;
            return (
              <article
                key={p.slug}
                className="highlight-card group"
              >
                <div className="relative aspect-phi overflow-hidden bg-muted/40">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card via-card/40 to-transparent pointer-events-none" />
                </div>

                <div className="flex flex-col flex-1 p-5">
                  <h4 className="font-display text-fluid-card-title font-semibold text-foreground leading-tight">
                    {p.name}
                  </h4>
                  <p className="mt-2 text-foreground/65 font-body text-fluid-body leading-relaxed flex-1">
                    {p.description}
                  </p>

                  <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                    <span className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body">
                      {p.category}
                    </span>
                    <a
                      href={p.url ?? GITHUB_ORG_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-fluid-label font-semibold uppercase tracking-[0.14em] text-foreground/80 hover:text-primary transition-colors font-body"
                    >
                      <Github size={14} strokeWidth={2} />
                      GitHub
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <ul className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/70">
          {ordered.map((p, i) => {
            const Icon = (p.imageKey && projectIconMap[p.imageKey]) || Box;
            return (
              <li
                key={p.slug}
                className={`group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 px-5 md:px-6 py-4 md:py-5 transition-colors hover:bg-primary/[0.06] ${
                  i % 2 === 1 ? "bg-foreground/[0.025]" : "bg-transparent"
                }`}
              >
                <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                  <div className="shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-lg border border-border/70 bg-background/60 flex items-center justify-center text-primary/80 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-display text-fluid-card-title font-semibold text-foreground leading-tight">
                        {p.name}
                      </h4>
                      <span className="text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/70 font-body">
                        {p.category}
                      </span>
                    </div>
                    <p className="mt-1.5 text-foreground/65 font-body text-fluid-body leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </div>
                <a
                  href={p.url ?? GITHUB_ORG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-fluid-label font-semibold uppercase tracking-[0.14em] text-foreground/80 hover:text-primary transition-colors font-body shrink-0 self-start md:self-center pl-14 md:pl-0"
                >
                  <Github size={14} strokeWidth={2} />
                  GitHub
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
