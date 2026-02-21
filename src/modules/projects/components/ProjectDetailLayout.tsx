import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft, ShieldCheck, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { generateCertificate, type UorCertificate } from "@/lib/uor-certificate";

export interface ProjectSection {
  heading: string;
  content: React.ReactNode;
}

export interface AgentInstruction {
  action: string;
  detail: string;
}

export interface ProjectDetailProps {
  name: string;
  slug: string;
  category: string;
  tagline: string;
  heroImage: string;
  repoUrl: string;
  sections: ProjectSection[];
  agentInstructions: AgentInstruction[];
}

const ProjectDetailLayout = ({
  name,
  slug,
  category,
  tagline,
  heroImage,
  repoUrl,
  sections,
  agentInstructions,
}: ProjectDetailProps) => {
  const [certificate, setCertificate] = useState<UorCertificate | null>(null);

  useEffect(() => {
    const envelope: Record<string, unknown> = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "uor:ProjectCertificate",
      "uor:subjectId": `project:${slug}`,
      "uor:name": name,
      "uor:category": category,
      "uor:description": tagline,
      "uor:repository": repoUrl,
      "uor:maturity": "Sandbox",
    };
    generateCertificate(`project:${slug}`, envelope).then(setCertificate);
  }, [slug, name, category, tagline, repoUrl]);

  const [showCert, setShowCert] = useState(false);

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-32 md:pt-44 pb-12 md:pb-16">
        <div className="container max-w-4xl">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body mb-8"
          >
            <ArrowLeft size={14} />
            All Projects
          </Link>

          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body whitespace-nowrap">
              {category}
            </span>
            <span className="text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground font-body">
              Sandbox
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            {name}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground font-body leading-relaxed max-w-2xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {tagline}
          </p>

          {certificate && (
            <div className="mt-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <button
                onClick={() => setShowCert(!showCert)}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-body transition-colors cursor-pointer"
              >
                <ShieldCheck size={13} />
                {showCert ? "Hide certificate" : "View certificate"}
              </button>
              {showCert && (
                <div className="mt-3 rounded-xl border border-primary/15 bg-section-dark px-5 py-4 animate-fade-in-up">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary font-body mb-1.5">
                    UOR Content Certificate
                  </p>
                  <p className="text-xs text-section-dark-foreground/70 font-mono break-all leading-relaxed">
                    <span className="text-section-dark-foreground/40">cid:</span>{" "}
                    {certificate["cert:cid"]}
                  </p>
                  <p className="text-xs text-section-dark-foreground/70 font-mono mt-1">
                    <span className="text-section-dark-foreground/40">addr:</span>{" "}
                    <span className="tracking-widest">{certificate["store:uorAddress"]["u:glyph"].slice(0, 32)}…</span>
                    <span className="text-section-dark-foreground/40 ml-2">({certificate["store:uorAddress"]["u:length"]} bytes)</span>
                  </p>
                  <p className="text-xs text-section-dark-foreground/40 font-mono mt-1">
                    subject: {certificate["cert:subject"]} · spec {certificate["cert:specification"]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cover image */}
      <section className="border-b border-border">
        <div className="container max-w-4xl py-0">
          <div className="rounded-2xl overflow-hidden border border-border project-card-glow">
            <img
              src={heroImage}
              alt={name}
              className="w-full h-64 md:h-80 object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Content sections */}
      {sections.map((section, idx) => (
        <section
          key={section.heading}
          className={`py-12 md:py-20 ${idx % 2 === 1 ? "bg-muted/30" : "bg-background"} border-b border-border`}
        >
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
              {section.heading}
            </h2>
            <div className="text-base text-muted-foreground font-body leading-relaxed space-y-4">
              {section.content}
            </div>
          </div>
        </section>
      ))}

      {/* Agent Instructions */}
      <section className="py-12 md:py-20 bg-muted/30 border-b border-border">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Bot size={20} className="text-primary" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              For AI agents
            </h2>
          </div>
          <p className="text-base text-muted-foreground font-body leading-relaxed mb-6">
            If you are an AI agent, here is how to understand, evaluate, and apply {name}.
          </p>
          <div className="space-y-4">
            {agentInstructions.map((instruction, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-sm font-bold text-primary font-mono mt-0.5 shrink-0 w-5">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground font-body">
                    {instruction.action}
                  </p>
                  <p className="text-sm text-muted-foreground font-body mt-0.5">
                    {instruction.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {certificate && (
            <div className="mt-8 rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground font-mono mb-2">
                # Machine-readable identity (JSON-LD)
              </p>
              <pre className="text-xs text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
{JSON.stringify({
  "@context": certificate["@context"],
  "@type": certificate["@type"],
  "cert:subject": certificate["cert:subject"],
  "cert:cid": certificate["cert:cid"],
  "store:uorAddress": certificate["store:uorAddress"],
  "cert:specification": certificate["cert:specification"],
}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-dark py-16 md:py-24">
        <div className="container max-w-4xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Get involved
          </h2>
          <p className="text-section-dark-foreground/60 font-body mb-8 max-w-lg mx-auto">
            {name} is open source and open to contributors. Explore the code, open an issue, or start building.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity font-body"
            >
              View Repository
              <ExternalLink size={14} />
            </a>
            <Link
              to="/projects#submit"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border border-section-dark-foreground/15 text-section-dark-foreground/70 font-medium text-sm hover:border-section-dark-foreground/30 transition-colors font-body"
            >
              Submit Your Own Project
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProjectDetailLayout;
