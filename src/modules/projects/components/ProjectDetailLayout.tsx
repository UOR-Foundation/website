import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft, ShieldCheck, Bot, CheckCircle2, Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { generateCertificate, type UorCertificate } from "@/lib/uor-certificate";
import { canonicalJsonLd, computeCid } from "@/lib/uor-address";
import { verifyCertificateFull, type FullVerificationResult } from "@/modules/certificate/verify";
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
const CertificateReceipt = ({ certificate, name, sourceObject }: { certificate: UorCertificate; name: string; sourceObject: Record<string, unknown> }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [verifyResult, setVerifyResult] = useState<FullVerificationResult | null>(null);
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
    try {
      // FULL RE-DERIVATION: re-canonicalize source object via URDNA2015,
      // re-hash with SHA-256, generate fresh CID, compare byte-level.
      const result = await verifyCertificateFull(sourceObject, certificate);
      setVerifyResult(result);
      setStatus(result.authentic ? "verified" : "failed");
    } catch {
      setStatus("failed");
    }
  }, [certificate, sourceObject]);

  const handleOpen = useCallback((o: boolean) => {
    setOpen(o);
    if (o) {
      setStatus("idle");
      setVerifyResult(null);
    }
  }, []);

  return (
    <div className="mt-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <button
        onClick={() => handleOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/70 transition-colors"
      >
        <ShieldCheck size={16} strokeWidth={2} />
        View certificate
      </button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* Header */}
          <div className="border-b border-dashed border-border px-6 pt-7 pb-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-foreground/40 font-medium">
              Receipt of Authenticity
            </p>
            <p className="mt-2.5 text-xl font-semibold text-foreground">{name}</p>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Coordinates */}
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

            {/* Details */}
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Details</p>
              <div className="rounded-lg border border-border bg-card px-4 py-3.5 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-foreground/50">Subject</span>
                  <span className="text-sm font-medium text-foreground font-mono">{certificate["cert:subject"]}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-foreground/50">Issued</span>
                  <span className="text-sm font-medium text-foreground font-mono">
                    {(() => { const d = new Date(certificate["cert:issuedAt"]); return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0"); })()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-foreground/50">Fingerprint</span>
                  <span className="text-sm font-medium text-foreground font-mono">{certificate["cert:sourceHash"].slice(0, 16)}…</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-foreground/50">Structure</span>
                  <span className="text-sm font-medium text-foreground font-mono">{certificate["cert:boundary"].fieldCount} fields · {certificate["cert:boundary"].keys.length} keys</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-foreground/50">Content size</span>
                  <span className="text-sm font-medium text-foreground font-mono">{new TextEncoder().encode(certificate["cert:canonicalPayload"]).byteLength} bytes</span>
                </div>
              </div>
            </div>

            {/* Unique ID */}
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Unique ID</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                <code className="flex-1 font-mono text-sm break-all text-foreground/80 leading-relaxed">{cid}</code>
                <button onClick={() => copyValue(cid)} className="shrink-0 text-foreground/30 hover:text-foreground transition-colors">
                  {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Verification */}
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
              const d = new Date(verifyResult.verifiedAt);
              const ts = d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
              return (
                <div className={`rounded-lg border px-4 py-4 space-y-3 ${borderColor}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className={color} />
                    <span className={`text-lg font-semibold ${color}`}>
                      {match ? "Authentic" : "Mismatch"}
                    </span>
                  </div>

                  <div className="rounded-md border border-border bg-muted/30 px-3.5 py-3 space-y-1.5">
                    <code className={`block font-mono text-sm break-all leading-relaxed ${color}`}>
                      {verifyResult.recomputedCid}
                    </code>
                    <p className={`text-sm font-medium ${color}`}>
                      {match ? "✓ Match confirmed" : "✗ Does not match"}
                    </p>
                  </div>

                  <p className="text-sm text-foreground/40 font-mono">
                    {ts} · {verifyResult.elapsedMs}ms
                  </p>
                </div>
              );
            })()}
            {status === "failed" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4">
                <span className="text-base font-semibold text-destructive">Could not confirm</span>
                <p className="text-sm text-foreground/50 mt-1.5">
                  {verifyResult?.summary || "The content may have been modified since this receipt was issued."}
                </p>
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={runVerification}
              disabled={status === "verifying"}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors w-full disabled:opacity-50"
            >
              <RefreshCw size={14} className={status === "verifying" ? "animate-spin" : ""} />
              Verify certificate
            </button>
          </div>

          <div className="bg-muted/30 border-t border-dashed border-border px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-foreground/50">Content-addressed · Self-verifying</p>
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

          {certificate && sourceEnvelope && <CertificateReceipt certificate={certificate} name={name} sourceObject={sourceEnvelope} />}
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
