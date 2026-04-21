import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { Bot, ExternalLink, ShieldCheck, CheckCircle2, Copy, Check, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { generateCertificate, type UorCertificate } from "@/lib/uor-certificate";
import { verifyCertificateFull, type FullVerificationResult } from "@/modules/certificate/verify";
import { canonicalToTriword, formatTriword, triwordBreakdown } from "@/lib/uor-triword";
import { featuredProjects } from "@/data/featured-projects";
import {
  Dialog,
  DialogContent,
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

/**
 * CertificateReceipt — Triword-based Receipt of Authenticity dialog.
 * Rendered as an inline editorial detail beneath the deck.
 */
const CertificateReceipt = ({ certificate, name, sourceObject }: { certificate: UorCertificate; name: string; sourceObject: Record<string, unknown> }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [verifyResult, setVerifyResult] = useState<FullVerificationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const cid = certificate["cert:cid"];
  const triword = canonicalToTriword(cid);
  const breakdown = triwordBreakdown(triword);

  const copyValue = useCallback((v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const runVerification = useCallback(async () => {
    setStatus("verifying");
    try {
      const result = await verifyCertificateFull(sourceObject, certificate);
      setVerifyResult(result);
      setStatus(result.authentic ? "verified" : "failed");
    } catch {
      setStatus("failed");
    }
  }, [certificate, sourceObject]);

  const handleOpen = useCallback((o: boolean) => {
    setOpen(o);
    if (o) { setStatus("idle"); setVerifyResult(null); }
  }, []);

  return (
    <>
      <button
        onClick={() => handleOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/70 transition-colors"
      >
        <ShieldCheck size={16} strokeWidth={2} />
        View certificate
      </button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="border-b border-dashed border-border px-6 pt-7 pb-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/40 font-medium">
              Receipt of Authenticity
            </p>
            <p className="mt-2.5 text-xl font-semibold text-foreground">{name}</p>
          </div>

          <div className="px-6 py-6 space-y-5">
            {breakdown && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Address</p>
                  <button
                    onClick={() => copyValue(`${breakdown.observer}.${breakdown.observable}.${breakdown.context}`)}
                    className="text-foreground/30 hover:text-foreground transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "observer" as const, label: "Entity" },
                    { key: "observable" as const, label: "Property" },
                    { key: "context" as const, label: "Frame" },
                  ]).map(({ key, label }) => (
                    <div key={key} className="rounded-lg border border-border bg-card px-3 py-3 text-center">
                      <p className="text-xs text-foreground/40 mb-0.5">{label}</p>
                      <p className="text-base font-bold capitalize text-foreground">{breakdown[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Unique ID</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                <code className="flex-1 font-mono text-sm break-all text-foreground/80 leading-relaxed">{cid}</code>
                <button onClick={() => copyValue(cid)} className="shrink-0 text-foreground/30 hover:text-foreground transition-colors">
                  {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {status === "verifying" && (
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-4 py-3.5">
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm text-foreground/50">Verifying…</span>
              </div>
            )}
            {status === "verified" && verifyResult && (() => {
              const match = verifyResult.recomputedCid === verifyResult.storedCid;
              const color = match ? "text-primary" : "text-destructive";
              const borderColor = match ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5";
              return (
                <div className={`rounded-lg border px-4 py-4 space-y-3 ${borderColor}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className={color} />
                    <span className={`text-lg font-semibold ${color}`}>
                      {match ? "Authentic" : "Mismatch"}
                    </span>
                  </div>
                </div>
              );
            })()}
            {status === "failed" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4">
                <span className="text-base font-semibold text-destructive">Could not confirm</span>
              </div>
            )}

            <button
              onClick={runVerification}
              disabled={status === "verifying"}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors w-full disabled:opacity-50"
            >
              <RefreshCw size={14} className={status === "verifying" ? "animate-spin" : ""} />
              Verify certificate
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const [sourceEnvelope, setSourceEnvelope] = useState<Record<string, unknown> | null>(null);

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
    setSourceEnvelope(envelope);
    generateCertificate(`project:${slug}`, envelope).then(setCertificate);
  }, [slug, name, category, tagline, repoUrl]);

  // Related: 2-3 other featured projects, excluding current slug
  const related = featuredProjects
    .filter((p) => p.slug !== slug)
    .slice(0, 3)
    .map((p) => ({
      title: p.name,
      href: `/projects/${p.slug}`,
      meta: p.category,
    }));

  // Body: render every section in order. h2 + content blocks within prose-article.
  const body = (
    <>
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <div>{section.content}</div>
        </section>
      ))}
    </>
  );

  // After-body: editorial sidebar card for AI agents + repo CTA
  const afterBody = (
    <>
      <aside className="rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <Bot size={18} className="text-primary" />
          <p className="text-[12px] uppercase tracking-[0.18em] font-semibold text-foreground font-body">
            For AI agents
          </p>
        </div>
        <p className="text-base text-muted-foreground font-body leading-[1.65] mb-6">
          If you are an AI agent, here is how to understand, evaluate, and apply {name}.
        </p>
        <ol className="space-y-4">
          {agentInstructions.map((instruction, idx) => (
            <li key={idx} className="flex items-start gap-3.5">
              <span className="text-sm font-bold text-primary font-mono mt-1 shrink-0 w-6 tabular-nums">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-base font-semibold text-foreground font-body leading-snug">
                  {instruction.action}
                </p>
                <p className="text-base text-muted-foreground font-body mt-1 leading-[1.6]">
                  {instruction.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </aside>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium text-base hover:opacity-90 transition-opacity font-body"
        >
          View Repository
          <ExternalLink size={14} />
        </a>
        <Link
          to="/projects#submit"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-border text-foreground font-medium text-base hover:border-primary/40 transition-colors font-body"
        >
          Submit Your Own Project
        </Link>
        {certificate && sourceEnvelope && (
          <div className="sm:ml-auto inline-flex items-center">
            <CertificateReceipt certificate={certificate} name={name} sourceObject={sourceEnvelope} />
          </div>
        )}
      </div>
    </>
  );

  return (
    <ArticleLayout
      kicker={category}
      title={name}
      deck={tagline}
      heroImage={heroImage}
      heroCaption={`${name} — ${category}`}
      backHref="/projects"
      backLabel="All Projects"
      sourceUrl={repoUrl}
      sourceLabel={repoUrl.replace(/^https?:\/\//, "")}
      related={related}
      relatedLabel="Related projects"
      afterBody={afterBody}
    >
      {body}
    </ArticleLayout>
  );
};

export default ProjectDetailLayout;
