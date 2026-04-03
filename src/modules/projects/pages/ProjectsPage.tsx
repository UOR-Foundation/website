import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ExternalLink, ChevronRight, ChevronDown, Send, FlaskConical, Rocket, GraduationCap, FolderGit2, SearchCheck, BadgeCheck, Users, Scale, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import projectHologramImg from "@/assets/project-hologram.jpg";
import projectAtlasImg from "@/assets/project-atlas.png";
import projectAtomicLangImg from "@/assets/project-atomic-lang.jpg";
import projectPrismImg from "@/assets/project-prism.png";
import projectUorMcpImg from "@/assets/project-uor-mcp.jpg";
import projectUnsImg from "@/assets/project-uns.jpg";
import projectQrCartridgeImg from "@/assets/project-qr-cartridge.jpg";
import projectHologramSdkImg from "@/assets/project-hologram-sdk.jpg";
import projectUorIdentityImg from "@/assets/project-uor-identity.jpg";
import projectUorPrivacyImg from "@/assets/project-uor-privacy.jpg";
import projectUorCertificateImg from "@/assets/project-uor-certificate.jpg";
import { projects as projectsData, maturityInfo, type MaturityLevel, type ProjectData } from "@/data/projects";
import { DISCORD_URL } from "@/data/external-links";
import { supabase } from "@/integrations/supabase/client";

const imageMap: Record<string, string> = {
  hologram: projectHologramImg,
  atlas: projectAtlasImg,
  atomicLang: projectAtomicLangImg,
  prism: projectPrismImg,
  uorMcp: projectUorMcpImg,
  uns: projectUnsImg,
  qrCartridge: projectQrCartridgeImg,
  hologramSdk: projectHologramSdkImg,
  uorIdentity: projectUorIdentityImg,
  uorPrivacy: projectUorPrivacyImg,
  uorCertificate: projectUorCertificateImg,
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

const CollapsibleCategory = ({ level, count, dotColor, children, disabled }: { level: string; count: number; dotColor: string; children: React.ReactNode; disabled?: boolean }) => {
  const [open, setOpen] = useState(true);
  const canToggle = !disabled;
  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      <button
        onClick={() => canToggle && setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-4 md:px-8 md:py-6 transition-colors ${canToggle ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`w-3 h-3 rounded-full ${dotColor}`} />
        <h2 className="font-display text-fluid-heading font-bold text-foreground">{level}</h2>
        {count > 0 && (
          <span className="text-fluid-body text-foreground/70 font-body">{count} {count === 1 ? "project" : "projects"}</span>
        )}
        <ChevronDown size={20} className={`ml-auto text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 md:px-8 md:pb-8">{children}</div>}
    </div>
  );
};

const INITIAL_VISIBLE = 6;

const ProjectCategorySection = ({ level, levelProjects, hasProjects }: { level: MaturityLevel; levelProjects: Project[]; hasProjects: boolean }) => {
  const [showAll, setShowAll] = useState(levelProjects.length <= INITIAL_VISIBLE);
  const visibleProjects = showAll ? levelProjects : levelProjects.slice(0, INITIAL_VISIBLE);
  const remaining = levelProjects.length - INITIAL_VISIBLE;

  return (
    <CollapsibleCategory level={level} count={levelProjects.length} dotColor={maturityDotColors[level]} disabled={!hasProjects}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {visibleProjects.map((project, index) => (
          <Link
            key={project.name}
            to={`/projects/${project.slug}`}
            className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up flex flex-col cursor-pointer"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {project.image && (
              <div className={`w-full h-60 overflow-hidden relative ${project.maturity === 'Sandbox' ? 'project-card-glow' : ''}`}>
                <img src={project.image} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            )}
            <div className="p-5 md:p-9 flex flex-col flex-1">
              <div className="flex items-center justify-between gap-2 mb-5">
                <span className="text-fluid-label font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body whitespace-nowrap truncate">{project.category}</span>
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full border font-body whitespace-nowrap shrink-0 ${maturityColors[project.maturity]}`}>{project.maturity}</span>
              </div>
              <h3 className="font-display text-fluid-card-title font-semibold text-foreground mb-4">{project.name}</h3>
              <p className="text-foreground/70 font-body text-fluid-body leading-relaxed">{project.description}</p>
              <div className="mt-auto pt-6">
                <span className="flex items-center gap-1.5 text-primary text-fluid-body font-medium font-body hover:underline">Learn more <ChevronRight size={16} /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!showAll && remaining > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-muted-foreground font-medium font-body text-fluid-label hover:border-primary/30 hover:text-foreground transition-all duration-200"
          >
            Show {remaining} more {remaining === 1 ? 'project' : 'projects'}
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </CollapsibleCategory>
  );
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
      <section className="hero-gradient pt-28 md:pt-36 pb-8 md:pb-12">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            UOR Projects
          </h1>
          <p className="mt-6 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-4xl" style={{ animationDelay: "0.15s" }}>
            Open-source projects built on the UOR specification, organized by maturity level.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#submit" className="btn-primary">
              Submit Your Project
            </a>
            <a href="#maturity" className="btn-outline">
              How Maturity Works
            </a>
          </div>
        </div>
      </section>

      {/* Content A: Project Catalog */}
      <section id="projects-list" className="py-section-sm bg-background scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] space-y-8">
          {(["Sandbox", "Incubating", "Graduated"] as MaturityLevel[]).map((level) => {
            const levelProjects = projects.filter((p) => p.maturity === level);
            return (
              <ProjectCategorySection key={level} level={level} levelProjects={levelProjects} hasProjects={levelProjects.length > 0} />
            );
          })}
        </div>
      </section>

      {/* Content B: Submit a Project — maturity levels + process + form merged */}
      <section id="submit" className="section-dark py-section-sm scroll-mt-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          {/* Maturity levels — compact reference row */}
          <div id="maturity" className="mb-golden-lg scroll-mt-28">
            <p className="text-fluid-label font-body font-medium tracking-widest uppercase text-section-dark-foreground/50 mb-6">
              Project Maturity Levels
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {maturityInfo.map((stage, idx) => {
                const StageIcon = [FlaskConical, Rocket, GraduationCap][idx];
                return (
                  <div
                    key={stage.level}
                    className={`rounded-2xl border p-6 flex flex-col ${maturityBgColors[stage.level]} ${idx === 2 ? 'border-primary/30' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <StageIcon size={18} className={idx === 2 ? 'text-primary' : 'text-section-dark-foreground/50'} />
                      <span className={`w-2.5 h-2.5 rounded-full ${maturityDotColors[stage.level]}`} />
                      <h3 className="font-display text-fluid-card-title font-bold text-foreground">{stage.level}</h3>
                    </div>
                    <p className="text-fluid-body text-foreground/70 font-body leading-relaxed mb-3">{stage.tagline}</p>
                    <ul className="space-y-1.5 mt-auto">
                      {stage.criteria.map((c) => (
                        <li key={c} className="text-fluid-label text-foreground/60 font-body flex items-start gap-2">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${maturityDotColors[stage.level]}`} />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit form */}
          <div className="pt-golden-lg border-t border-section-dark-foreground/10">
            <div className="text-center mb-8">
              <h2 className="font-display text-fluid-heading font-bold">
                Submit for Sandbox Review
              </h2>
              <p className="mt-4 text-section-dark-foreground/60 font-body leading-relaxed max-w-xl mx-auto">
                All you need is an open-source repository and a clear problem statement. Our technical committee reviews every submission within 3 weeks.
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
                  {submitting ? 'Submitting…' : 'Submit for Sandbox Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
