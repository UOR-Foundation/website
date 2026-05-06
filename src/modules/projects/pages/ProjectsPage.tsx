import Layout from "@/modules/core/components/Layout";
import { ExternalLink, Send, CheckCircle2, Github, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import { projects as projectsData } from "@/data/projects";
import { DISCORD_URL, GITHUB_ORG_URL } from "@/data/external-links";
import { supabase } from "@/integrations/supabase/client";
import imgHologram from "@/assets/project-hologram.jpg";
import imgAtlas from "@/assets/project-atlas.png";
import imgAtomicLang from "@/assets/project-atomic-lang.jpg";
import imgPrism from "@/assets/project-prism.png";
import imgUns from "@/assets/project-uns.jpg";
import imgUorCertificate from "@/assets/project-uor-certificate.jpg";

const projectImageMap: Record<string, string> = {
  hologram: imgHologram,
  atlas: imgAtlas,
  atomicLang: imgAtomicLang,
  prism: imgPrism,
  uns: imgUns,
  uorCertificate: imgUorCertificate,
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

      {/* All Projects. flat grid */}
      <section id="projects-list" className="py-section-sm bg-background border-b border-border/40 scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            All Projects
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-10">Browse the Catalog</h2>
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
              <p className="text-xl text-section-dark-foreground/70 font-body mb-4">Your project has been submitted for review.</p>
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

const CATEGORY_ORDER = ["Core Infrastructure", "Systems", "Open Science"] as const;

const ProjectAwesomeList = () => {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof projectsData>();
    for (const p of projectsData) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    const known = CATEGORY_ORDER.filter((c) => map.has(c));
    const extras = [...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c as typeof CATEGORY_ORDER[number])).sort();
    return [...known, ...extras].map((c) => ({ category: c, items: map.get(c)! }));
  }, []);

  return (
    <div className="space-y-14">
      {grouped.map(({ category, items }) => (
        <div key={category}>
          <div className="flex items-baseline justify-between mb-5">
            <h3
              id={`cat-${category.toLowerCase().replace(/\s+/g, "-")}`}
              className="font-body text-fluid-label font-semibold tracking-[0.22em] uppercase text-primary/70 scroll-mt-28"
            >
              {category}
            </h3>
            <span className="font-mono text-[11px] text-foreground/30 tabular-nums">
              {String(items.length).padStart(2, "0")}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => {
              const img = p.imageKey ? projectImageMap[p.imageKey] : undefined;
              return (
                <article
                  key={p.slug}
                  className="group flex flex-col rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted/40">
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
                    <span className="absolute top-3 left-3 inline-flex items-center px-2 py-1 rounded-full bg-background/80 backdrop-blur border border-border/60 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/80 font-body">
                      {p.category}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <h4 className="font-display text-fluid-card-title font-semibold text-foreground leading-tight">
                      {p.name}
                    </h4>
                    <p className="mt-2 text-foreground/65 font-body text-fluid-body leading-relaxed flex-1">
                      {p.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                      <a
                        href={p.url ?? GITHUB_ORG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-fluid-label font-semibold uppercase tracking-[0.14em] text-foreground/80 hover:text-primary transition-colors font-body"
                      >
                        <Github size={14} strokeWidth={2} />
                        GitHub
                      </a>
                      <a
                        href={`/projects/${p.slug}`}
                        className="inline-flex items-center gap-1.5 text-fluid-label font-semibold uppercase tracking-[0.14em] text-primary/80 hover:text-primary transition-colors font-body"
                      >
                        Details
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
