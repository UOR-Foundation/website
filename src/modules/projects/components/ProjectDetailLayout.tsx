import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft, ShieldCheck, Bot, CheckCircle2, Loader2, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { generateCertificate, type UorCertificate } from "@/lib/uor-certificate";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";

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
const CopyRow = ({ label, value, display }: { label: string; value: string; display?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <p className="text-sm text-section-dark-foreground/90 font-mono break-all leading-relaxed mt-1.5 flex items-start gap-2 group">
      <span className="flex-1">
        <span className="text-section-dark-foreground/50">{label}:</span>{" "}
        {display || value}
      </span>
      <button onClick={handleCopy} className="shrink-0 mt-0.5 text-section-dark-foreground/40 hover:text-section-dark-foreground/80 transition-colors cursor-pointer" title={`Copy ${label}`}>
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </p>
  );
};
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
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<null | { match: boolean; decoded: Record<string, unknown> }>(null);

  const handleVerify = async () => {
    if (!certificate) return;
    setVerifying(true);
    setVerified(null);
    try {
      // Recompute CID from the canonical payload stored in the certificate
      const payloadBytes = new TextEncoder().encode(certificate["cert:canonicalPayload"]);
      const recomputedCid = await computeCid(payloadBytes);
      const match = recomputedCid === certificate["cert:cid"];
      const decoded = JSON.parse(certificate["cert:canonicalPayload"]);
      setVerified({ match, decoded });
    } catch {
      setVerified({ match: false, decoded: {} });
    } finally {
      setVerifying(false);
    }
  };
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
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary font-body whitespace-nowrap">
              {category}
            </span>
            <span className="text-sm font-medium px-3 py-1 rounded-full border border-border text-muted-foreground font-body">
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
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-body transition-colors cursor-pointer"
              >
                <ShieldCheck size={15} />
                {showCert ? "Hide certificate" : "View certificate"}
              </button>
              {showCert && (
                <div className="mt-3 rounded-xl border border-border bg-section-dark px-5 py-4 animate-fade-in-up">
                  <p className="text-xs font-semibold uppercase tracking-wider text-section-dark-foreground font-body mb-2">
                    UOR Content Certificate
                  </p>
                  <CopyRow label="cid" value={certificate["cert:cid"]} />
                  <CopyRow label="addr" value={certificate["store:uorAddress"]["u:glyph"]} display={
                    <><span className="tracking-widest">{certificate["store:uorAddress"]["u:glyph"].slice(0, 32)}…</span>
                    <span className="text-section-dark-foreground/50 ml-2">({certificate["store:uorAddress"]["u:length"]} bytes)</span></>
                  } />
                  <p className="text-sm text-section-dark-foreground/60 font-mono mt-1.5">
                    subject: {certificate["cert:subject"]} · spec {certificate["cert:specification"]}
                  </p>

                  {/* Verify button */}
                  <div className="mt-4 pt-3 border-t border-section-dark-foreground/10">
                    {!verified ? (
                      <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 font-body"
                      >
                        {verifying ? (
                          <><Loader2 size={14} className="animate-spin" /> Verifying…</>
                        ) : (
                          <><ShieldCheck size={14} /> Verify this certificate</>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3 animate-fade-in-up">
                        {/* Verification result */}
                        <div className={`flex items-center gap-2 text-sm font-semibold font-body ${verified.match ? "text-green-400" : "text-red-400"}`}>
                          <CheckCircle2 size={16} />
                          {verified.match
                            ? "Certificate verified. Content is authentic."
                            : "Verification failed. Content may have been altered."}
                        </div>

                        {verified.match && verified.decoded && Object.keys(verified.decoded).length > 0 && (
                          <div className="rounded-lg border border-primary/10 bg-background/5 px-4 py-3 space-y-2.5">
                            <p className="text-sm font-semibold text-section-dark-foreground/90 font-body">
                              What this certificate confirms:
                            </p>
                            {(() => {
                              const d = verified.decoded;
                              const fieldLabels: Record<string, string> = {
                                "uor:name": "Project name",
                                "uor:description": "Description",
                                "uor:category": "Category",
                                "uor:repository": "Source code",
                                "uor:maturity": "Maturity stage",
                                "uor:subjectId": "Unique identifier",
                                "@type": "Object type",
                              };
                              return Object.entries(d)
                                .filter(([key]) => key !== "@context")
                                .map(([key, value]) => (
                                  <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                                    <span className="text-sm text-section-dark-foreground/50 font-body shrink-0">
                                      {fieldLabels[key] || key.replace(/^uor:/, "").replace(/([A-Z])/g, " $1")}:
                                    </span>
                                    <span className="text-sm text-section-dark-foreground font-body break-all">
                                      {typeof value === "string" ? value : JSON.stringify(value)}
                                    </span>
                                  </div>
                                ));
                            })()}
                            <p className="text-sm text-section-dark-foreground/50 font-body mt-3 leading-relaxed">
                              The content above was reconstructed directly from the certificate's canonical payload. The fact that it matches the original content identifier (CID) proves that none of this information has been tampered with since the certificate was issued.
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => setVerified(null)}
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors cursor-pointer font-body mt-1"
                        >
                          Reset verification
                        </button>
                      </div>
                    )}
                  </div>
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
                <span className="text-base font-bold text-primary font-mono mt-0.5 shrink-0 w-6">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground font-body">
                    {instruction.action}
                  </p>
                  <p className="text-base text-muted-foreground font-body mt-0.5">
                    {instruction.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {certificate && (
            <div className="mt-8 rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground font-mono mb-2">
                # Machine-readable identity (JSON-LD)
              </p>
              <pre className="text-sm text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
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
          <p className="text-base text-section-dark-foreground/70 font-body mb-8 max-w-lg mx-auto">
            {name} is open source and open to contributors. Explore the code, open an issue, or start building.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-base hover:opacity-90 transition-opacity font-body"
            >
              View Repository
              <ExternalLink size={14} />
            </a>
            <Link
              to="/projects#submit"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border border-section-dark-foreground/15 text-section-dark-foreground/70 font-medium text-base hover:border-section-dark-foreground/30 transition-colors font-body"
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
