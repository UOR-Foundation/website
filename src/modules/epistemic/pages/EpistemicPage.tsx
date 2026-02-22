import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { ShieldCheck, Loader2, CheckCircle2, Info, ChevronDown, ChevronUp, Copy, Check, Award, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";
import { EpistemicBadge } from "@/modules/epistemic/components/EpistemicBadge";
import type { EpistemicGrade } from "@/types/uor";

const GRADE_FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-grade`;
const API = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-api`;

/* ── helpers ──────────────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  const h = useCallback(() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1400); }, [text]);
  return <button onClick={h} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy">{c ? <Check size={13} className="text-primary" /> : <Copy size={13} />}</button>;
}

function Ref({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-xs font-mono text-primary/60 cursor-help border-b border-dotted border-primary/30">
          {label} <Info size={10} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
    </Tooltip>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 md:p-7 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4">{children}</h2>;
}

type EvidenceType = "algebraic" | "isometric" | "empirical" | "none";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500/15 text-green-400 border-green-500/30",
  B: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  D: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TRUST_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-red-500",
};

/* ── Section 1: Grade Assessor ───────────────────────────── */

function GradeAssessor() {
  const [claim, setClaim] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("algebraic");
  const [derivationId, setDerivationId] = useState("");
  const [operation, setOperation] = useState("neg");
  const [coherence, setCoherence] = useState(0.8);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  const assess = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const evidence: any = {};
      if (evidenceType === "algebraic") evidence.derivation_id = derivationId;
      if (evidenceType === "isometric") { evidence.operation = operation; evidence.coherence_score = coherence; }
      if (evidenceType === "empirical") evidence.source_url = sourceUrl;

      const r = await fetch(GRADE_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claim || "Untitled claim", evidence_type: evidenceType, evidence }),
      });
      setResult(await r.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [claim, evidenceType, derivationId, operation, coherence, sourceUrl]);

  const grade = result?.["cert:grade"] as EpistemicGrade | undefined;
  const trust = result?.["cert:trustLevel"];

  return (
    <Card>
      <SectionTitle>Grade Assessor</SectionTitle>
      <p className="text-sm text-muted-foreground mb-5">
        Submit a claim with evidence to receive an epistemic grade (A–D) and a cert: certificate. <Ref label="§3.3" tip="The cert: namespace defines three certificate subclasses. Grades C and D extend the namespace." />
      </p>

      {/* Claim */}
      <div className="mb-4">
        <label className="block text-xs font-body text-muted-foreground mb-1">Claim</label>
        <textarea
          value={claim}
          onChange={e => setClaim(e.target.value)}
          placeholder="neg(bnot(x)) = succ(x) holds for all x in Z/256Z"
          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[60px] resize-y"
        />
      </div>

      {/* Evidence type */}
      <div className="mb-4">
        <label className="block text-xs font-body text-muted-foreground mb-2">Evidence type</label>
        <div className="flex flex-wrap gap-2">
          {([
            ["algebraic", "Algebraic", "I have a derivation_id"],
            ["isometric", "Isometric", "Metric preservation verified"],
            ["empirical", "Empirical", "I have a source URL"],
            ["none", "None", "No evidence"],
          ] as const).map(([val, label, desc]) => (
            <button
              key={val}
              onClick={() => setEvidenceType(val)}
              className={`px-3 py-2 rounded-lg border text-sm font-body transition-colors text-left ${
                evidenceType === val
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className="block text-[10px] text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional inputs */}
      {evidenceType === "algebraic" && (
        <div className="mb-4">
          <label className="block text-xs font-body text-muted-foreground mb-1">Derivation ID</label>
          <input
            value={derivationId}
            onChange={e => setDerivationId(e.target.value)}
            placeholder="urn:uor:derivation:sha256:abc123..."
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}
      {evidenceType === "isometric" && (
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-xs font-body text-muted-foreground mb-1">Operation</label>
            <select
              value={operation}
              onChange={e => setOperation(e.target.value)}
              className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="neg">neg</option>
              <option value="bnot">bnot</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-body text-muted-foreground mb-1">Coherence score: {coherence.toFixed(2)}</label>
            <input
              type="range" min={0} max={1} step={0.01} value={coherence}
              onChange={e => setCoherence(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}
      {evidenceType === "empirical" && (
        <div className="mb-4">
          <label className="block text-xs font-body text-muted-foreground mb-1">Source URL</label>
          <input
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://example.com/evidence"
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      <button
        onClick={assess}
        disabled={loading}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mb-5"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />} Assess Grade
      </button>

      {/* Result */}
      {result && grade && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <EpistemicBadge grade={grade} showLabel size="lg" />
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${GRADE_COLORS[grade]}`}>
              {result["@type"]}
            </span>
            {result["cert:certType"] && (
              <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${
                result["cert:certType"] === "whitepaper-defined"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}>
                {result["cert:certType"]}
              </span>
            )}
          </div>

          {/* Trust bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Trust Level</span>
              <span className="font-mono font-bold">{(trust * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${TRUST_COLORS[grade]}`}
                style={{ width: `${trust * 100}%` }}
              />
            </div>
          </div>

          <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Raw JSON-LD
          </button>
          {showRaw && (
            <div className="relative">
              <pre className="bg-muted/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed max-h-64">
                {JSON.stringify(result, null, 2)}
              </pre>
              <div className="absolute top-2 right-2"><CopyBtn text={JSON.stringify(result, null, 2)} /></div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Section 2: Cert Taxonomy ────────────────────────────── */

const CERT_CARDS: { grade: EpistemicGrade; certClass: string; label: string; desc: string; whitepaper: boolean; trust: number }[] = [
  { grade: "A", certClass: "cert:TransformCertificate", label: "Algebraically Derived", desc: "Attests source-to-target mapping correctness. Evidence: derivation_id (urn:uor:derivation:sha256:...). Trace-replayable.", whitepaper: true, trust: 1.0 },
  { grade: "B", certClass: "cert:IsometryCertificate", label: "Metric-Preserving", desc: "Attests metric preservation (morphism:Isometry verified). Evidence: involution cert or coherence ≥ 0.7.", whitepaper: true, trust: 0.75 },
  { grade: "C", certClass: "cert:EmpiricalAttestation", label: "Empirically Attested", desc: "Empirically attested, not algebraically derived. Evidence: source URL (external attestation).", whitepaper: false, trust: 0.5 },
  { grade: "D", certClass: "cert:UnverifiedAssertion", label: "Unverified", desc: "Claim made without supporting evidence. No derivation, no certificate. Hypothesis only.", whitepaper: false, trust: 0.1 },
];

function CertTaxonomy() {
  return (
    <Card>
      <SectionTitle>Certificate Taxonomy</SectionTitle>
      <p className="text-sm text-muted-foreground mb-5">
        Three <span className="font-mono text-foreground">cert:</span> classes are defined in the UOR whitepaper (§3.3). Grades C and D extend the <span className="font-mono text-foreground">cert:</span> namespace beyond the whitepaper. <Ref label="§3.3" tip="cert:TransformCertificate, cert:IsometryCertificate, cert:InvolutionCertificate are whitepaper-defined." />
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {CERT_CARDS.map(c => (
          <div key={c.grade} className={`rounded-xl border p-4 ${GRADE_COLORS[c.grade]}`}>
            <div className="flex items-center gap-2 mb-2">
              <EpistemicBadge grade={c.grade} size="lg" />
              <span className="font-mono text-xs font-bold">{c.certClass}</span>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{c.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{c.desc}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                c.whitepaper ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border"
              }`}>
                {c.whitepaper ? "whitepaper-defined" : "framework extension"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">trust={c.trust}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Section 3: Get a Grade A Certificate ────────────────── */

function GradeADemo() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [derivationId, setDerivationId] = useState("");
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  const runDemo = useCallback(async () => {
    setLoading(true);
    setStep(1);
    setGradeResult(null);

    try {
      // Step 1: derive
      const deriveRes = await fetch(`${API}/v1/kernel/derive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: { op: "neg", args: [42] } }),
      });
      const deriveData = await deriveRes.json();
      const dId = deriveData.derivation_id || deriveData["derivation:derivationId"] || "";
      setDerivationId(dId);
      setStep(2);

      // Step 2: assess grade
      const gradeRes = await fetch(GRADE_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: "neg(42) = 214 — algebraically derived via ring negation in Z/256Z",
          evidence_type: "algebraic",
          evidence: { derivation_id: dId },
        }),
      });
      const gradeData = await gradeRes.json();
      setGradeResult(gradeData);
      setStep(3);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  return (
    <Card>
      <SectionTitle>Get a Grade A Certificate</SectionTitle>
      <p className="text-sm text-muted-foreground mb-4">
        Three steps to earn the highest epistemic grade — fully automated below.
      </p>

      <div className="space-y-3 mb-5">
        <StepItem n={1} done={step >= 1} active={step === 1 && loading}>
          Run: <span className="font-mono text-foreground">POST /kernel/derive</span> with <span className="font-mono text-foreground">{`{"term":{"op":"neg","args":[42]}}`}</span>
        </StepItem>
        <StepItem n={2} done={step >= 2} active={step === 2 && loading}>
          Copy the <span className="font-mono text-foreground">derivation_id</span> from the response
          {derivationId && (
            <span className="block mt-1 text-xs font-mono text-primary/80 break-all">{derivationId} <CopyBtn text={derivationId} /></span>
          )}
        </StepItem>
        <StepItem n={3} done={step >= 3} active={false}>
          Submit to Grade Assessor → receive <span className="font-mono text-foreground">cert:TransformCertificate</span> (Grade A)
        </StepItem>
      </div>

      <button
        onClick={runDemo}
        disabled={loading}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Run Full Demo
      </button>

      {gradeResult && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <EpistemicBadge grade={gradeResult["cert:grade"] as EpistemicGrade} showLabel size="lg" />
            <span className="text-xs font-mono text-muted-foreground">{gradeResult["@type"]}</span>
            <CheckCircle2 size={16} className="text-green-400" />
          </div>

          <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Raw JSON-LD
          </button>
          {showRaw && (
            <pre className="bg-muted/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed max-h-64">
              {JSON.stringify(gradeResult, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}

function StepItem({ n, done, active, children }: { n: number; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 transition-colors ${
        done ? "bg-primary/15 text-primary" : active ? "bg-primary/10 text-primary animate-pulse" : "bg-muted text-muted-foreground"
      }`}>
        {done && !active ? <CheckCircle2 size={12} /> : n}
      </span>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{children}</p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

const EpistemicPage = () => (
  <Layout>
    <section className="bg-[hsl(var(--primary))] py-12 md:py-16">
      <div className="container max-w-4xl">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={28} className="text-primary-foreground/80" />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
            Epistemic Grading Console
          </h1>
        </div>
        <p className="text-sm md:text-base text-primary-foreground/70 font-body max-w-2xl">
          Every fact carries a trust level. Submit claims with evidence to receive cert: certificates — from Grade A (algebraically proven) to Grade D (unverified).
        </p>
      </div>
    </section>

    <section className="py-10 md:py-14">
      <div className="container max-w-4xl space-y-8">
        <GradeAssessor />
        <CertTaxonomy />
        <GradeADemo />
      </div>
    </section>
  </Layout>
);

export default EpistemicPage;
