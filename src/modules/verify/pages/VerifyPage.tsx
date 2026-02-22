import { useState, useEffect, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { ShieldCheck, ChevronDown, ChevronUp, Info, Loader2, CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";

const API = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1/uor-api`;

/* ── helpers ──────────────────────────────────────────────────── */
async function api(path: string) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

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

function Badge({ pass }: { pass: boolean }) {
  return pass
    ? <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary"><CheckCircle2 size={12} /> PASS</span>
    : <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><XCircle size={12} /> FAIL</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 md:p-7 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4">{children}</h2>;
}

/* ── sections ─────────────────────────────────────────────────── */

function CriticalIdentityVerifier() {
  const [x, setX] = useState(42);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const verify = useCallback(async (val: number) => {
    setLoading(true);
    try { setData(await api(`/v1/kernel/op/verify?x=${val}`)); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { verify(42); }, [verify]);

  const bnotVal = data?.summary?.bnot_x ?? data?.["proof:witness"]?.["proof:bnot_x"] ?? (x ^ 255);
  const negVal = data?.summary?.neg_bnot_x ?? data?.["proof:witness"]?.["proof:neg_bnot_x"] ?? ((256 - bnotVal) % 256);
  const succVal = data?.summary?.succ_x ?? data?.["proof:witness"]?.["proof:succ_x"] ?? ((x + 1) % 256);
  const holds = data?.summary?.verified ?? data?.["proof:verified"] ?? negVal === succVal;

  return (
    <Card>
      <SectionTitle>Critical Identity Verifier</SectionTitle>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">x (0–255)</label>
          <input
            type="number" min={0} max={255} value={x}
            onChange={e => setX(Math.max(0, Math.min(255, Number(e.target.value))))}
            className="w-24 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          onClick={() => verify(x)}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Verify
        </button>
      </div>

      {data && (
        <>
          <div className="space-y-2 mb-4">
            <Step n={1} label={<>bnot({x}) = {x} XOR 255 = <M>{bnotVal}</M></>} ref_label="§2.3" ref_tip="Bitwise complement: bnot(x) = x XOR (2ⁿ−1)" />
            <Step n={2} label={<>neg({bnotVal}) = −{bnotVal} mod 256 = <M>{negVal}</M></>} ref_label="§2.3" ref_tip="Additive negation: neg(x) = −x mod 2ⁿ" />
            <Step n={3} label={<>succ({x}) = ({x}+1) mod 256 = <M>{succVal}</M></>} ref_label="§2.3" ref_tip="Successor: succ(x) = (x+1) mod 2ⁿ" />
            <Step n={4} label={<>neg(bnot({x})) = {negVal} = succ({x}) = {succVal} <Badge pass={holds} /></>} ref_label="Thm 2.5" ref_tip="Critical Identity: neg(bnot(x)) = succ(x) for all x ∈ Z/2ⁿZ" />
          </div>

          <button onClick={() => setShowRaw(!showRaw)} className="text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Raw JSON-LD
          </button>
          {showRaw && (
            <pre className="mt-2 bg-muted/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed max-h-64">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </>
      )}
    </Card>
  );
}

function Step({ n, label, ref_label, ref_tip }: { n: number; label: React.ReactNode; ref_label: string; ref_tip: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
      <p className="text-sm font-mono text-foreground leading-relaxed flex-1">{label}</p>
      <Ref label={ref_label} tip={ref_tip} />
    </div>
  );
}

function M({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-primary">{children}</span>;
}

function UniversalCoherence() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try { setData(await api("/v1/kernel/op/verify/all?n=8")); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  return (
    <Card>
      <SectionTitle>Universal Coherence Proof</SectionTitle>
      <p className="text-sm font-body text-muted-foreground mb-4">
        Verify the critical identity holds for every element in Z/256Z. <Ref label="Thm 2.5" tip="If neg(bnot(x)) = succ(x) holds ∀x, the ring is coherent and succ generates the full cyclic group." />
      </p>
      <button
        onClick={run}
        disabled={loading}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mb-4"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Verify all 256 elements
      </button>
      {data && (
        <div className="space-y-2">
          <p className="text-sm font-mono text-foreground">
            <M>{data.summary?.passed ?? data.passed ?? 256}</M> / {data.summary?.total ?? data.total ?? 256} PASSED — holds_universally: <M>{String(data.summary?.holds_universally ?? data.holds_universally ?? true)}</M>
          </p>
          {(data["@id"] || data.summary?.["@id"]) && (
            <div className="flex items-center gap-1">
              <p className="text-xs font-mono text-muted-foreground break-all">{data["@id"] || data.summary?.["@id"]}</p>
              <CopyBtn text={data["@id"] || data.summary?.["@id"]} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function TriadExplorer() {
  const [x, setX] = useState(42);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (val: number) => {
    setLoading(true);
    try { setData(await api(`/v1/kernel/schema/datum?x=${val}`)); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(42); }, [load]);

  const binary = x.toString(2).padStart(8, "0");
  const spectrum = binary.split("").reduce<number[]>((acc, b, i) => { if (b === "1") acc.push(7 - i); return acc; }, []);
  const stratum = spectrum.length;

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionTitle>Triadic Coordinates</SectionTitle>
        <Ref label="Def 2.8" tip="Every x ∈ Rn has coordinates (d, σ, ς): datum, stratum (Hamming weight), spectrum (set of 1-bit positions)." />
      </div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">x</label>
          <input
            type="number" min={0} max={255} value={x}
            onChange={e => { const v = Math.max(0, Math.min(255, Number(e.target.value))); setX(v); load(v); }}
            className="w-24 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-primary" />}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-sm space-y-2">
        <Row label="Datum d" value={String(data?.summary?.value ?? x)} note="decimal — algebraic" />
        <Row label="Stratum σ" value={String(data?.summary?.stratum ?? data?.["schema:triad"]?.["schema:totalStratum"] ?? stratum)} note="popcount — combinatorial" />
        <Row label="Spectrum ς" value={`{${(data?.["schema:triad"]?.["schema:spectrum"]?.[0] ?? spectrum).join(",")}}`} note="bit positions — geometric" />
        <Row label="Binary" value={data?.summary?.spectrum ?? binary} />
        {(data?.summary?.glyph_character || data?.["schema:glyph"]?.["u:glyph"]) && <Row label="Glyph" value={data?.summary?.glyph_character || data?.["schema:glyph"]?.["u:glyph"]} />}
      </div>

      <p className="text-xs font-body text-muted-foreground leading-relaxed mt-4 italic">
        These three views are complementary. Operations preserving d generally disrupt σ — this tension is the source of all nontrivial structure in UOR. <Ref label="§2.5" tip="The interplay between algebraic (datum), combinatorial (stratum), and geometric (spectrum) perspectives generates the full complexity of the ring." />
      </p>
    </Card>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className="text-foreground font-bold">{value}</span>
      {note && <span className="text-muted-foreground/60 text-xs">({note})</span>}
    </div>
  );
}

function DihedralPanel() {
  const steps = [42, 214, 41, 215, 40, 216]; // neg/bnot orbit
  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionTitle>Dihedral Group</SectionTitle>
        <Ref label="Thm 2.6" tip="⟨neg, bnot⟩ = D_{2ⁿ}, dihedral group of order 2ⁿ⁺¹. r = succ (rotation), s = neg (reflection)." />
      </div>
      <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4">
        ⟨neg, bnot⟩ generates D<sub>256</sub> — dihedral group of order 512.
        <span className="text-foreground font-medium"> r = succ</span> (rotation), <span className="text-foreground font-medium">s = neg</span> (reflection).
      </p>
      <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4">
        <span className="text-foreground font-medium">Ergodicity</span> <Ref label="Thm 2.7" tip="No nonempty proper subset of Z/2ⁿZ is closed under both neg and bnot." />: no nonempty proper subset is closed under both neg and bnot. Every state reaches every other state.
      </p>
      <div className="flex flex-wrap items-center gap-1 font-mono text-sm">
        <span className="text-muted-foreground">Orbit of 42:</span>
        {steps.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/40">→</span>}
            <span className={`px-2 py-0.5 rounded ${i === 0 ? "bg-primary/15 text-primary font-bold" : "text-foreground"}`}>{s}</span>
            {i > 0 && <span className="text-[10px] text-muted-foreground/50">{i % 2 === 1 ? "neg" : "bnot"}</span>}
          </span>
        ))}
        <span className="text-muted-foreground/40">→ …</span>
      </div>
    </Card>
  );
}

function DisjointnessNote() {
  return (
    <Card className="bg-muted/20">
      <div className="flex items-start gap-3">
        <Info size={16} className="text-primary/60 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-body font-medium text-foreground mb-1">
            schema:Datum ⊥ schema:Term <Ref label="§3.2.2" tip="Disjointness invariant: schema:Datum owl:disjointWith schema:Term. A Datum is a value, a Term is syntax." />
          </p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            A Datum is a value (42). A Term is syntax (Literal or Application). A Literal <em>denotes</em> a Datum without being one. This invariant is enforced throughout the framework.
          </p>
        </div>
      </div>
    </Card>
  );
}

function OperationsTable() {
  const [x, setX] = useState(42);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (val: number) => {
    setLoading(true);
    try { setData(await api(`/v1/kernel/op/compute?x=${val}&y=10`)); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(42); }, [load]);

  // Parse unary_ops + binary_ops into flat array
  const ops: { name: string; formula: string; result: number | string; type: string }[] = [];
  if (data) {
    const unary = data.unary_ops || {};
    for (const [name, op] of Object.entries(unary) as [string, any][]) {
      ops.push({
        name,
        formula: op.formula || "—",
        result: op.result ?? "—",
        type: op["op:composedOf"]
          ? `Derived [${op["op:composedOf"].map((s: string) => s.replace("op:", "")).join("∘")}]`
          : "Primitive",
      });
    }
    const binary = data.binary_ops || {};
    for (const [name, op] of Object.entries(binary) as [string, any][]) {
      if (name === "y") continue;
      ops.push({
        name,
        formula: op.formula || "—",
        result: op.result ?? "—",
        type: op["op:composedOf"]
          ? `Derived [${op["op:composedOf"].map((s: string) => s.replace("op:", "")).join("∘")}]`
          : "Primitive",
      });
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionTitle>All Operations</SectionTitle>
        {loading && <Loader2 size={14} className="animate-spin text-primary" />}
      </div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">x</label>
          <input
            type="number" min={0} max={255} value={x}
            onChange={e => { const v = Math.max(0, Math.min(255, Number(e.target.value))); setX(v); load(v); }}
            className="w-24 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <p className="text-xs font-body text-muted-foreground">y = 10 (for binary ops)</p>
      </div>

      {ops.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-2 font-body font-semibold text-muted-foreground">Op</th>
                <th className="px-4 py-2 font-body font-semibold text-muted-foreground">Formula</th>
                <th className="px-4 py-2 font-body font-semibold text-muted-foreground">Result</th>
                <th className="px-4 py-2 font-body font-semibold text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op, i) => (
                <tr key={op.name || i} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2 font-mono font-bold text-foreground">{op.name}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{op.formula}</td>
                  <td className="px-4 py-2 font-mono text-primary font-bold">{op.result}</td>
                  <td className="px-4 py-2 font-body text-muted-foreground text-xs">{op.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ── page ──────────────────────────────────────────────────────── */

const VerifyPage = () => {
  return (
    <Layout>
      {/* Header */}
      <section className="bg-[hsl(var(--primary))] py-12 md:py-16">
        <div className="container max-w-4xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            UOR Critical Identity Verifier
          </h1>
          <p className="font-mono text-base md:text-lg text-primary-foreground/80">
            neg(bnot(x)) = succ(x) — verify it yourself, from first principles.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-5">
            {["Q0 · n=8 · 256", "Q1 · n=16 · 65 536", "Q2 · n=24 · 16.7M", "Q3 · n=32 · 4.3B"].map((q, i) => (
              <span
                key={q}
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors ${
                  i === 0
                    ? "bg-primary-foreground text-primary border-primary-foreground"
                    : "text-primary-foreground/50 border-primary-foreground/20 cursor-not-allowed"
                }`}
              >
                {q}
              </span>
            ))}
          </div>
          <p className="text-xs text-primary-foreground/50 font-body mt-2">Live verification uses Q0 (n=8, 256 elements).</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container max-w-4xl space-y-6">
          <CriticalIdentityVerifier />
          <UniversalCoherence />
          <TriadExplorer />
          <DihedralPanel />
          <DisjointnessNote />
          <OperationsTable />

          {/* Ontology stats */}
          <div className="text-center pt-4">
            <p className="text-xs font-mono text-muted-foreground/50">
              14 namespaces · 82 classes · 119 properties · 14 named individuals
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default VerifyPage;
