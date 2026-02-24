import { useState, useCallback, useEffect } from "react";
import Layout from "@/modules/core/components/Layout";
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, Copy, Check, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/core/ui/tooltip";

const API = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "erwfuxphwcvynxhfbvql"}.supabase.co/functions/v1`;
const UOR = "https://api.uor.foundation/v1";

/* ── shared helpers ──────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  const h = useCallback(() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1400); }, [text]);
  return <button onClick={h} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy">{c ? <Check size={13} className="text-primary" /> : <Copy size={13} />}</button>;
}

function Ref({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-xs font-mono text-primary/60 cursor-help border-b border-dotted border-primary/30">{label} <Info size={10} /></span>
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

function NumInput({ value, onChange, label, min = 0, max = 255 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-xs font-body text-muted-foreground mb-1">{label}</label>
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-24 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}

/* ── Section 1: Metric Theory Explainer ──────────────────── */

function MetricExplainer() {
  const [a, setA] = useState(42);
  const [b, setB] = useState(43);
  const [ringD, setRingD] = useState<number | null>(null);
  const [hamD, setHamD] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async (av: number, bv: number) => {
    setLoading(true);
    try {
      const [rr, hr] = await Promise.all([
        fetch(`${UOR}/bridge/observable/metric?a=${av}&b=${bv}&type=ring`).then(r => r.json()),
        fetch(`${UOR}/bridge/observable/metric?a=${av}&b=${bv}&type=hamming`).then(r => r.json()),
      ]);
      setRingD(rr?.distance ?? rr?.metric ?? rr?.value ?? null);
      setHamD(hr?.distance ?? hr?.metric ?? hr?.value ?? null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { compute(42, 43); }, [compute]);

  // Fallback local computation
  const ringLocal = Math.min(Math.abs(a - b), 256 - Math.abs(a - b));
  const hamLocal = (a ^ b).toString(2).split("").filter(c => c === "1").length;

  return (
    <Card>
      <SectionTitle>Two Metrics, One Ring</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="font-display text-sm font-bold text-foreground mb-2">
            Ring Metric d<sub>R</sub> <Ref label="Def 2.9" tip="dR(x,y) = min(|x−y|, 2ⁿ−|x−y|) — cyclic topology, like a clock face." />
          </h3>
          <p className="text-xs font-mono text-muted-foreground mb-2">d<sub>R</sub>(x,y) = min(|x−y|, 2ⁿ−|x−y|)</p>
          <p className="text-xs text-muted-foreground">Cyclic topology — shortest arc on the clock face.</p>
          <p className="text-xs font-mono text-primary mt-2">d<sub>R</sub>(250, 5) = min(245, 11) = <span className="font-bold">11</span></p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="font-display text-sm font-bold text-foreground mb-2">
            Hamming Metric d<sub>H</sub> <Ref label="Def 2.10" tip="dH(x,y) = popcount(x XOR y) — hypercube topology, counting differing bits." />
          </h3>
          <p className="text-xs font-mono text-muted-foreground mb-2">d<sub>H</sub>(x,y) = popcount(x XOR y)</p>
          <p className="text-xs text-muted-foreground">Hypercube topology — count differing bits.</p>
          <p className="text-xs font-mono text-primary mt-2">d<sub>H</sub>(42, 43) = popcount(1) = <span className="font-bold">1</span></p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic mb-5">
        Only ~1.27% of point pairs agree in both metrics at Q0. This incompatibility is the source of all nontrivial structure. <Ref label="§2.6" tip="The tension between ring (cyclic) and Hamming (hypercube) metrics drives the complexity of UOR arithmetic." />
      </p>

      {/* Live tool */}
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <p className="text-xs font-body font-medium text-foreground mb-3">Live Metric Calculator</p>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <NumInput value={a} onChange={v => { setA(v); compute(v, b); }} label="a" />
          <NumInput value={b} onChange={v => { setB(v); compute(a, v); }} label="b" />
          {loading && <Loader2 size={14} className="animate-spin text-primary mb-2" />}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm font-mono">
          <div>
            <span className="text-muted-foreground">d<sub>R</sub>({a}, {b}) = </span>
            <span className="text-primary font-bold">{ringD ?? ringLocal}</span>
          </div>
          <div>
            <span className="text-muted-foreground">d<sub>H</sub>({a}, {b}) = </span>
            <span className="text-primary font-bold">{hamD ?? hamLocal}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Section 2: Isometry Certificate Form ────────────────── */

function IsometryCertForm() {
  const [source, setSource] = useState(42);
  const [target, setTarget] = useState(170);
  const [metric, setMetric] = useState<"ring" | "hamming">("ring");
  const [pairs, setPairs] = useState<{ a: number; b: number }[]>([
    { a: 10, b: 20 }, { a: 50, b: 100 }, { a: 200, b: 250 },
    { a: 0, b: 128 }, { a: 77, b: 133 },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  const addPair = () => {
    if (pairs.length >= 16) return;
    setPairs([...pairs, { a: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) }]);
  };
  const removePair = (i: number) => {
    if (pairs.length <= 3) return;
    setPairs(pairs.filter((_, idx) => idx !== i));
  };
  const updatePair = (i: number, key: "a" | "b", v: number) => {
    const next = [...pairs];
    next[i] = { ...next[i], [key]: Math.max(0, Math.min(255, v)) };
    setPairs(next);
  };

  const issue = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/uor-cert-isometry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transform: { source, target, label: `T(x) = (x + ${((target - source) % 256 + 256) % 256}) mod 256` },
          metric,
          test_pairs: pairs,
        }),
      });
      setResult({ status: r.status, ...(await r.json()) });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [source, target, metric, pairs]);

  const isSuccess = result?.status === 200;
  const isBlocked = result?.status === 409;
  const isNotIso = result?.status === 422;

  return (
    <Card>
      <SectionTitle>Isometry Certificate</SectionTitle>
      <p className="text-sm text-muted-foreground mb-5">
        Test whether a cyclic shift preserves metric distances across distinct partition classes. <Ref label="§3.3" tip="cert:IsometryCertificate attests metric preservation — morphism:preservesMetric must be 'ring' or 'hamming'." />
      </p>

      {/* Transform */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <NumInput value={source} onChange={setSource} label="Source (0–255)" />
        <span className="text-muted-foreground font-mono text-lg mb-1">→</span>
        <NumInput value={target} onChange={setTarget} label="Target (0–255)" />
        <div>
          <label className="block text-xs font-body text-muted-foreground mb-1">Metric</label>
          <div className="flex gap-1">
            {(["ring", "hamming"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-2 rounded-lg border text-sm font-mono transition-colors ${metric === m ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                d<sub>{m === "ring" ? "R" : "H"}</sub>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs font-mono text-muted-foreground mb-3">
        T(x) = (x + {((target - source) % 256 + 256) % 256}) mod 256
      </p>

      {/* Test pairs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-body text-muted-foreground">Test pairs ({pairs.length}/16, min 3)</label>
          <button onClick={addPair} disabled={pairs.length >= 16} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-30">
            <Plus size={12} /> Add pair
          </button>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/50 w-4">{i + 1}</span>
              <input type="number" min={0} max={255} value={p.a} onChange={e => updatePair(i, "a", Number(e.target.value))}
                className="w-20 rounded border border-border bg-muted/50 px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <span className="text-muted-foreground/40 text-xs">,</span>
              <input type="number" min={0} max={255} value={p.b} onChange={e => updatePair(i, "b", Number(e.target.value))}
                className="w-20 rounded border border-border bg-muted/50 px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <button onClick={() => removePair(i)} disabled={pairs.length <= 3} className="text-muted-foreground/40 hover:text-destructive disabled:opacity-20">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={issue} disabled={loading}
        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mb-5">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Issue Certificate
      </button>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {isSuccess && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                <span className="font-display font-bold text-foreground">cert:IsometryCertificate issued</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div><span className="text-muted-foreground">preservesMetric:</span> <span className="text-foreground font-bold">{result["morphism:preservesMetric"]}</span></div>
                <div><span className="text-muted-foreground">pairsVerified:</span> <span className="text-foreground font-bold">{result["cert:pairsVerified"]}</span></div>
                <div><span className="text-muted-foreground">sourceClass:</span> <span className="text-foreground">{result["morphism:sourcePartitionClass"]}</span></div>
                <div><span className="text-muted-foreground">targetClass:</span> <span className="text-foreground">{result["morphism:targetPartitionClass"]}</span></div>
              </div>
              {result["@id"] && (
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground break-all">
                  <span>{result["@id"]}</span>
                  <CopyBtn text={result["@id"]} />
                </div>
              )}
            </div>
          )}

          {isBlocked && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="font-display font-bold text-foreground">BLOCKED — Trivial Identity</span>
              </div>
              <p className="text-xs text-muted-foreground">{result.reason}</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Source: {result["morphism:sourcePartitionClass"]} · Target: {result["morphism:targetPartitionClass"]}
              </p>
            </div>
          )}

          {isNotIso && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-destructive" />
                <span className="font-display font-bold text-foreground">NOT ISOMETRY</span>
              </div>
              <p className="text-xs text-muted-foreground">{result.reason}</p>
            </div>
          )}

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

/* ── Section 3: Involution Certificates ──────────────────── */

function InvolutionCerts() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showRaw, setShowRaw] = useState<Record<string, boolean>>({});

  const certify = useCallback(async (op: string) => {
    setLoading(prev => ({ ...prev, [op]: true }));
    try {
      const r = await fetch(`${UOR}/bridge/cert/involution?operation=${op}`);
      const data = await r.json();
      setResults(prev => ({ ...prev, [op]: data }));
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, [op]: false }));
  }, []);

  return (
    <Card>
      <SectionTitle>Involution Certificates</SectionTitle>
      <p className="text-sm text-muted-foreground mb-5">
        <span className="font-mono text-foreground">op:neg</span> and <span className="font-mono text-foreground">op:bnot</span> are involutions: f(f(x)) = x for all x ∈ ℤ/256ℤ. <Ref label="§3.3" tip="cert:InvolutionCertificate attests self-inverse property: op(op(x))=x verified exhaustively for all 256 elements." />
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {(["neg", "bnot"] as const).map(op => (
          <div key={op} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground">op:{op}</span>
              <button
                onClick={() => certify(op)}
                disabled={loading[op]}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading[op] ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Certify
              </button>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {op === "neg" ? "neg(neg(x)) = x — additive involution" : "bnot(bnot(x)) = x — bitwise involution"}
            </p>

            {results[op] && (
              <>
                <div className="flex items-center gap-2">
                  {(results[op]["cert:verified"] ?? results[op].verified) ? (
                    <><CheckCircle2 size={14} className="text-primary" /><span className="text-xs font-bold text-primary">VERIFIED</span></>
                  ) : (
                    <><XCircle size={14} className="text-destructive" /><span className="text-xs font-bold text-destructive">FAILED</span></>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {results[op]["cert:totalChecked"] ?? results[op].total_checked ?? 256}/256
                  </span>
                </div>
                {(results[op]["@id"] || results[op].certificate_id) && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground break-all">
                    <span>{results[op]["@id"] || results[op].certificate_id}</span>
                    <CopyBtn text={results[op]["@id"] || results[op].certificate_id} />
                  </div>
                )}
                <button onClick={() => setShowRaw(prev => ({ ...prev, [op]: !prev[op] }))} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {showRaw[op] ? <ChevronUp size={10} /> : <ChevronDown size={10} />} JSON-LD
                </button>
                {showRaw[op] && (
                  <pre className="bg-muted/50 rounded-lg p-3 overflow-x-auto text-[10px] font-mono text-foreground/80 leading-relaxed max-h-40">
                    {JSON.stringify(results[op], null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

const CertificatesPage = () => (
  <Layout>
    <section className="bg-[hsl(var(--primary))] py-12 md:py-16">
      <div className="container max-w-4xl">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={28} className="text-primary-foreground/80" />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
            Metric-Preserving Transform Verifier
          </h1>
        </div>
        <p className="text-sm md:text-base text-primary-foreground/70 font-body max-w-2xl">
          Issue cert:IsometryCertificate and cert:InvolutionCertificate — verify that transforms preserve ring or Hamming metrics across partition classes.
        </p>
      </div>
    </section>

    <section className="py-10 md:py-14">
      <div className="container max-w-4xl space-y-8">
        <MetricExplainer />
        <IsometryCertForm />
        <InvolutionCerts />
      </div>
    </section>
  </Layout>
);

export default CertificatesPage;
