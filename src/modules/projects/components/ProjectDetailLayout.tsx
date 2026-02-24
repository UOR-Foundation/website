import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft, ShieldCheck, Bot, CheckCircle2, Loader2, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { generateCertificate, type UorCertificate } from "@/lib/uor-certificate";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";
import { canonicalToTriword, formatTriword, triwordBreakdown } from "@/lib/uor-triword";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/ui/dialog";

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

/**
 * CertificateReceipt — Triword-based Receipt of Authenticity
 * Used on every project page. Same format as the ConsoleUI CanonicalIdBadge verify dialog.
 */
const CertificateReceipt = ({ certificate, name }: { certificate: UorCertificate; name: string }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [verifyTime, setVerifyTime] = useState<number | null>(null);
  const [verifyTimestamp, setVerifyTimestamp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cid = certificate["cert:cid"];
  const triword = canonicalToTriword(cid);
  const displayTriword = formatTriword(triword);
  const breakdown = triwordBreakdown(triword);

  const copyValue = useCallback((v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const runVerification = useCallback(async () => {
    setStatus("verifying");
    const t0 = performance.now();
    try {
      const payloadBytes = new TextEncoder().encode(certificate["cert:canonicalPayload"]);
      const recomputedCid = await computeCid(payloadBytes);
      const match = recomputedCid === cid;
      setVerifyTime(Math.round(performance.now() - t0));
      setVerifyTimestamp(new Date().toISOString());
      setStatus(match ? "verified" : "failed");
    } catch {
      setVerifyTime(Math.round(performance.now() - t0));
      setVerifyTimestamp(new Date().toISOString());
      setStatus("failed");
    }
  }, [certificate, cid]);

  const handleOpen = useCallback((o: boolean) => {
    setOpen(o);
    if (o && status === "idle") runVerification();
  }, [status, runVerification]);

  return (
    <div className="mt-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <button
        onClick={() => handleOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <ShieldCheck size={15} />
        View certificate
      </button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* Receipt header */}
          <div className="border-b border-dashed border-border px-6 pt-7 pb-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-foreground/60 font-semibold">
              Receipt of Authenticity
            </p>
            <p className="mt-3 text-3xl font-bold tracking-wide text-foreground">
              {displayTriword}
            </p>
            <p className="mt-1.5 text-base text-foreground/60">{name}</p>
          </div>

          <div className="px-6 py-6 space-y-5">
            <p className="text-base text-foreground/80 leading-relaxed">
              Identity derived from content. Verified by mathematics.
            </p>

            <div className="border-t border-dashed border-border" />

            {breakdown && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-foreground/60 font-semibold">Coordinates</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: "observer" as const, label: "Entity" },
                    { key: "observable" as const, label: "Property" },
                    { key: "context" as const, label: "Frame" },
                  ]).map(({ key, label }) => (
                    <div key={key} className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-xs text-foreground/60">{label}</p>
                      <p className="text-lg font-bold capitalize text-foreground mt-1">{breakdown[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-dashed border-border" />

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-foreground/60 font-semibold">Fingerprint</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <code className="flex-1 font-mono text-sm break-all text-foreground/90">{cid}</code>
                <button onClick={() => copyValue(cid)} className="shrink-0 text-foreground/50 hover:text-foreground transition-colors">
                  {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div className="border-t border-dashed border-border" />

            <div className="space-y-3">
              {status === "verifying" && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-4">
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-base text-foreground/70">Verifying…</span>
                </div>
              )}
              {status === "verified" && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-primary" />
                    <span className="text-lg font-bold text-primary">Authentic</span>
                  </div>
                  <p className="text-sm text-foreground/70">
                    Original content re-hashed with SHA-256. Recomputed fingerprint matches the stored CID. Content is untampered.
                  </p>
                  {verifyTime !== null && (
                    <p className="text-xs text-foreground/50 font-mono">
                      Verified in {verifyTime}ms · {verifyTimestamp}
                    </p>
                  )}
                </div>
              )}
              {status === "failed" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4">
                  <span className="text-lg font-bold text-destructive">⚠ Verification Failed</span>
                  <p className="text-sm text-foreground/70 mt-1">Content may have been modified.</p>
                </div>
              )}
              {status === "idle" && (
                <button onClick={runVerification} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors w-full">
                  <ShieldCheck size={18} />
                  Verify
                </button>
              )}
            </div>
          </div>

          <div className="bg-muted/30 border-t border-dashed border-border px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-foreground/60 font-medium">UOR · Content-Addressed · Self-Verifying</p>
            <button onClick={() => copyValue(cid)} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold">
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy ID</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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

          {certificate && <CertificateReceipt certificate={certificate} name={name} />}
        </div>
      </section>

      {/* Cover image */}
      <section className="border-b border-border">
        <div className="container max-w-4xl py-8">
          <div className="rounded-2xl overflow-hidden border border-border project-card-glow">
            <img
              src={heroImage}
              alt={name}
              className="w-full object-cover"
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
