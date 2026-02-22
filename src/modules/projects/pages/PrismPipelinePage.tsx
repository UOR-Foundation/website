import { useState, useEffect, useRef } from "react";
import Layout from "@/modules/core/components/Layout";
import { Play, CheckCircle2, XCircle, Clock, Loader2, Copy, Download } from "lucide-react";

const API = "https://api.uor.foundation/v1";
const EDGE = `https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-prism`;

const STAGE_NAMES = ["TYPE", "QUERY", "RESOLVE", "PARTITION", "OBSERVE", "CERTIFY", "TRACE", "STATE"] as const;
const STAGE_KEYS = [
  "stage1_type", "stage2_query", "stage3_resolve", "stage4_partition",
  "stage5_observe", "stage6_certify", "stage7_trace", "stage8_state",
] as const;

const STAGE_DESCS = [
  "Declare T ∈ 𝒯ₙ — verify ring coherence at quantum level n",
  "Construct query: CoordinateQuery | MetricQuery | RepresentationQuery",
  "Select Resolver ρ; compute Π(T) = ρ(T, n, K)",
  "Produce P=(Irr, Red, Unit, Ext); enforce |I|+|R|+|U|+|E| = 2ⁿ",
  "Compute observables from 7 observable categories (§5.2)",
  "Emit Certificate C (Transform | Isometry | Involution)",
  "Construct ComputationTrace τ; τ carries trace:certifiedBy → C",
  "Snapshot Frame; record Transition; create new Frame with Binding",
];

type Status = "pending" | "running" | "pass" | "fail";

function formatStageOutput(key: string, data: Record<string, unknown> | undefined): string {
  if (!data) return "—";
  switch (key) {
    case "stage1_type":
      return `R₈ = ℤ/256ℤ. ${data.elements} elements. ${data.coherent ? "Coherent." : "NOT coherent."}`;
    case "stage2_query":
      return `d=${data.datum}, σ=${data.stratum}, ς=${data.spectrum} (${String(data["@type"] || "CoordinateQuery").replace("query:", "")})`;
    case "stage3_resolve":
      return `${data.canonical_form}. Resolver: ${data.resolver}`;
    case "stage4_partition":
      return `Irr:${data.Irr} Red:${data.Red} Unit:${data.Unit} Ext:${data.Ext} Sum:${data.sum} ${data.sum === 256 ? "✓" : "✗"}`;
    case "stage5_observe":
      return `σ=${data.stratum}, dH=${data.hamming_metric ?? "—"}, CascadeLength=${data.cascade_length ?? "—"}`;
    case "stage6_certify":
      return `${String(data["@type"] || "")} issued. verified:${data.verified}`;
    case "stage7_trace":
      return `ComputationTrace. certifiedBy:${String(data.certifiedBy || "—").split("/").pop()}. drift:${data.hamming_drift}`;
    case "stage8_state":
      return `state:Transition. Grade ${data.grade}. derivation_id:${String(data.derivation_id || "").slice(0, 40)}…`;
    default:
      return JSON.stringify(data);
  }
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "pending": return <Clock className="w-5 h-5 text-muted-foreground" />;
    case "running": return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    case "pass": return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    case "fail": return <XCircle className="w-5 h-5 text-destructive" />;
  }
}

export default function PrismPipelinePage() {
  const [input, setInput] = useState("42");
  const [resolver, setResolver] = useState("CanonicalFormResolver");
  const [queryType, setQueryType] = useState("CoordinateQuery");
  const [statuses, setStatuses] = useState<Status[]>(Array(8).fill("pending"));
  const [stageData, setStageData] = useState<(Record<string, unknown> | undefined)[]>(Array(8).fill(undefined));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  async function runPrism() {
    setRunning(true);
    setError(null);
    setResult(null);
    setStageData(Array(8).fill(undefined));
    setStatuses(Array(8).fill("pending"));

    // Animate stages sequentially
    let currentStage = 0;
    const animPromise = new Promise<void>((resolve) => {
      intervalRef.current = setInterval(() => {
        if (currentStage < 8) {
          setStatuses((prev) => {
            const next = [...prev];
            if (currentStage > 0) next[currentStage - 1] = "running"; // keep running until data
            next[currentStage] = "running";
            return next;
          });
          currentStage++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          resolve();
        }
      }, 200);
    });

    try {
      const res = await fetch(EDGE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: Number(input), resolver, query_type: queryType }),
      });

      await animPromise;

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      const data = await res.json();
      setResult(data);

      // Fill stage data and statuses
      const prism = data.prism || {};
      const newData = STAGE_KEYS.map((k) => prism[k] || undefined);
      setStageData(newData);
      setStatuses(STAGE_KEYS.map((k, i) => {
        const d = prism[k];
        if (!d) return "fail";
        if (k === "stage1_type" && !d.coherent) return "fail";
        if (k === "stage4_partition" && d.sum !== 256 && d.sum !== 0) return "fail";
        return "pass";
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
      setStatuses((prev) => prev.map((s) => (s === "running" ? "fail" : s === "pending" ? "pending" : s)));
    } finally {
      setRunning(false);
    }
  }

  function downloadBundle() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prism-${input}.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          {/* Header */}
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-foreground mb-2">PRISM</h1>
          <p className="text-lg text-muted-foreground mb-10">
            Polymorphic Resolution and Isometric Symmetry Machine (§4).
            The canonical 8-stage pipeline for resolving UOR types into certified partitions.
          </p>

          {/* Input Area */}
          <div className="bg-card border border-border rounded-lg p-5 mb-10">
            <div className="flex flex-wrap gap-4 items-end">
              <label className="text-sm text-foreground">
                <span className="block mb-1 font-medium">Input (0–255)</span>
                <input
                  type="number" min={0} max={255} value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-24 bg-background border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="text-sm text-foreground">
                <span className="block mb-1 font-medium">Resolver</span>
                <select value={resolver} onChange={(e) => setResolver(e.target.value)}
                  className="bg-background border border-border rounded px-3 py-2 text-sm text-foreground">
                  <option>DihedralFactorizationResolver</option>
                  <option>CanonicalFormResolver</option>
                  <option>EvaluationResolver</option>
                </select>
              </label>
              <label className="text-sm text-foreground">
                <span className="block mb-1 font-medium">Query Type</span>
                <select value={queryType} onChange={(e) => setQueryType(e.target.value)}
                  className="bg-background border border-border rounded px-3 py-2 text-sm text-foreground">
                  <option>CoordinateQuery</option>
                  <option>MetricQuery</option>
                  <option>RepresentationQuery</option>
                </select>
              </label>
              <button
                onClick={runPrism} disabled={running}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run PRISM
              </button>
            </div>
          </div>

          {/* Pipeline Visual — 8 Stage Cards */}
          <div className="space-y-3 mb-10">
            {STAGE_NAMES.map((name, i) => {
              const status = statuses[i];
              const data = stageData[i];
              const isActive = status !== "pending";
              return (
                <div
                  key={name}
                  className={`border rounded-lg p-4 transition-all duration-300 ${
                    status === "pass" ? "border-green-500/40 bg-green-500/5" :
                    status === "fail" ? "border-destructive/40 bg-destructive/5" :
                    status === "running" ? "border-primary/40 bg-primary/5" :
                    "border-border bg-card"
                  } ${isActive ? "animate-fade-in" : "opacity-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={status} />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        Stage {i + 1}
                      </span>
                      <span className="font-bold text-foreground text-sm">{name}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-8">{STAGE_DESCS[i]}</p>
                  {data && (
                    <p className="text-sm text-foreground mt-2 ml-8 font-mono bg-muted/50 rounded px-3 py-1.5">
                      {formatStageOutput(STAGE_KEYS[i], data)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm mb-10">
              {error}
            </div>
          )}

          {/* Summary Card */}
          {result && (
            <div className="bg-card border border-border rounded-lg p-6 mb-10 animate-fade-in">
              <h2 className="font-['Playfair_Display'] text-xl font-semibold text-foreground mb-4">Resolution Summary</h2>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground">@type:</span>{" "}
                  <code className="text-foreground">state:ResolutionFrame</code>
                </div>
                <div>
                  <span className="text-muted-foreground">@id:</span>{" "}
                  <code className="text-foreground text-xs break-all">{String(result["@id"] || "")}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">allStagesPassed:</span>{" "}
                  <span className={result["state:allStagesPassed"] ? "text-green-600 dark:text-green-400 font-bold" : "text-destructive font-bold"}>
                    {String(result["state:allStagesPassed"])}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolver:</span>{" "}
                  <code className="text-foreground">{String(result["state:resolverUsed"] || "")}</code>
                </div>
                {result["state:transition"] && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Transition:</span>{" "}
                    <code className="text-xs text-foreground">
                      state:Frame → state:Frame | addedBindings: [{String(
                        ((result["state:transition"] as Record<string, unknown>)?.["state:addedBindings"] as Array<Record<string, unknown>>)?.[0]?.["state:address"] || ""
                      )}]
                    </code>
                  </div>
                )}
                {(result.prism as Record<string, Record<string, unknown>>)?.stage4_partition && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Partition invariant:</span>{" "}
                    <code className="text-foreground">
                      Irr+Red+Unit+Ext = {String((result.prism as Record<string, Record<string, unknown>>).stage4_partition.sum)}{" "}
                      {(result.prism as Record<string, Record<string, unknown>>).stage4_partition.sum === 256 ? "✓" : "✗"}
                    </code>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={downloadBundle}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 text-sm"
                >
                  <Download className="w-4 h-4" /> Download PRISM Bundle
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                  className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded hover:bg-muted text-sm"
                >
                  <Copy className="w-4 h-4" /> Copy JSON-LD
                </button>
              </div>
            </div>
          )}

          {/* Raw JSON-LD */}
          {result && (
            <details className="mb-10">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                Raw JSON-LD Response
              </summary>
              <pre className="mt-2 bg-card border border-border rounded-lg p-4 text-xs overflow-x-auto text-foreground max-h-96 overflow-y-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </Layout>
  );
}
