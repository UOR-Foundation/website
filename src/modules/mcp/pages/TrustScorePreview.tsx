import { useState } from "react";

const EXAMPLES = [
  {
    title: "Grade A — Algebraically Proven (UOR Tool Result)",
    grade: "A",
    icon: "🟢",
    label: "Algebraically Proven",
    confidence: 98,
    verifiedVia: "uor_derive — ring evaluation over ℤ/256ℤ",
    receipt: "a3f8c1d902e6b74f",
    receiptFull: "a3f8c1d902e6b74f5e91d0c83a27b6e4f1d5a9c0e3b7f2d6a8c4e0b3f7d1a5e9",
    sources: [
      { claim: "neg(42) = 214 in ℤ/256ℤ", source: "UOR Ring Kernel", url: "https://uor.foundation/u/U00D6", grade: "A" },
      { claim: "SHA-256 derivation committed", source: "UOR Derivation Store", url: "urn:uor:derivation:sha256:a3f8c1d9…", grade: "A" },
    ],
    summary: "This result is algebraically proven with a SHA-256 derivation ID. It can be independently verified by any agent using uor_verify.",
  },
  {
    title: "Grade B — Graph-Certified (SPARQL Query)",
    grade: "B",
    icon: "🔵",
    label: "Graph-Certified",
    confidence: 85,
    verifiedVia: "uor_query — SPARQL 1.1 over UOR knowledge graph",
    receipt: "7b2e4f91c8a3d605",
    receiptFull: "7b2e4f91c8a3d6051e90f3b7a2c8d4e6f0b5a9d3c7e1f4a8b2d6e0c4f8a3b7d1",
    sources: [
      { claim: "Element 42 has stratum [0,1,0,1,0,1,0,0]", source: "UOR Q0 Knowledge Graph", url: "https://uor.foundation/u/U002A", grade: "B" },
      { claim: "3 result bindings returned", source: "UOR Q0 Knowledge Graph", url: null, grade: "B" },
    ],
    summary: "3 result(s) sourced directly from the UOR knowledge graph. Data is graph-certified.",
  },
  {
    title: "Grade C — External Source (Web Fetch)",
    grade: "C",
    icon: "🟡",
    label: "Graph-Present / External Source",
    confidence: 60,
    verifiedVia: "mcp_web_fetch — content retrieved in-session",
    receipt: "e4c9a1b73f28d506",
    receiptFull: "e4c9a1b73f28d5061a7f3e9b2c84d0f6a5e1b9c3d7f2a8e4b0c6d3f7a1b5e9c2",
    sources: [
      { claim: "The Battle of Waterloo occurred on 18 June 1815", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", grade: "C" },
      { claim: "Coalition forces were led by Wellington and Blücher", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", grade: "C" },
      { claim: "Napoleon was exiled to Saint Helena after defeat", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", grade: "C" },
    ],
    summary: "Source identified but not algebraically verified. Use uor_derive for Grade A.",
  },
  {
    title: "Grade D — LLM Training Data (Unverified)",
    grade: "D",
    icon: "🔴",
    label: "LLM Training Data / Unverified",
    confidence: 30,
    verifiedVia: "None",
    receipt: "1f0a3b7c9e2d4f68",
    receiptFull: "1f0a3b7c9e2d4f685c8a1e3b7d0f2a6c4e9b5d1f7a3c8e0b4d6f2a9c1e5b3d7",
    sources: [
      { claim: "The Battle of Waterloo was a decisive Coalition victory", source: "LLM training data", url: null, grade: "D" },
      { claim: "Approximately 40,000–50,000 casualties on the day", source: "LLM training data", url: null, grade: "D" },
    ],
    summary: "This claim is unverified. Use uor_derive to establish algebraic proof.",
  },
];

const gradeColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  A: { bg: "bg-green-950/40", border: "border-green-700/50", text: "text-green-400", badge: "bg-green-900/60 text-green-300" },
  B: { bg: "bg-blue-950/40", border: "border-blue-700/50", text: "text-blue-400", badge: "bg-blue-900/60 text-blue-300" },
  C: { bg: "bg-yellow-950/40", border: "border-yellow-700/50", text: "text-yellow-400", badge: "bg-yellow-900/60 text-yellow-300" },
  D: { bg: "bg-red-950/40", border: "border-red-700/50", text: "text-red-400", badge: "bg-red-900/60 text-red-300" },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const filled = Math.round(confidence / 10);
  return (
    <span className="font-mono text-sm tracking-wider">
      {"█".repeat(filled)}
      <span className="opacity-30">{"░".repeat(10 - filled)}</span>
      {" "}{confidence}%
    </span>
  );
}

function TrustScoreCard({ example }: { example: typeof EXAMPLES[0] }) {
  const colors = gradeColors[example.grade];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-5 space-y-4`}>
      <h3 className={`text-lg font-semibold ${colors.text}`}>{example.title}</h3>

      <div className="border-t border-white/10 pt-4">
        <p className={`text-xs uppercase tracking-widest mb-3 ${colors.text} opacity-70`}>
          UOR PRISM Trust Score
        </p>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-white/5">
            <tr>
              <td className="py-2 pr-4 text-muted-foreground font-medium w-32">Grade</td>
              <td className="py-2">
                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-semibold ${colors.badge}`}>
                  {example.icon} {example.grade} — {example.label}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-muted-foreground font-medium">Confidence</td>
              <td className="py-2"><ConfidenceBar confidence={example.confidence} /></td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-muted-foreground font-medium">Verified via</td>
              <td className="py-2 text-foreground/90 font-mono text-xs">{example.verifiedVia}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-muted-foreground font-medium">Receipt</td>
              <td className="py-2">
                <code className="text-xs font-mono text-foreground/80 bg-white/5 px-1.5 py-0.5 rounded">{example.receipt}…</code>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`ml-2 text-xs underline underline-offset-2 ${colors.text} hover:opacity-80`}
                >
                  {expanded ? "Hide" : "Full hash"}
                </button>
                {expanded && (
                  <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[11px] text-foreground/70 break-all">
                    urn:uor:receipt:sha256:{example.receiptFull}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Sources</p>
        <ol className="space-y-1.5">
          {example.sources.map((s, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">{i + 1}.</span>
              <span className="text-foreground/90">
                {s.claim}
                <span className="text-muted-foreground"> — </span>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${colors.text} hover:opacity-80`}>
                    {s.source}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">{s.source}</span>
                )}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${colors.badge}`}>Grade {s.grade}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="text-sm text-foreground/80">
          <span className="font-medium text-foreground">Trust summary:</span> {example.summary}
        </p>
      </div>
    </div>
  );
}

export default function TrustScorePreview() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2 mb-10">
          <h1 className="text-3xl font-bold">UOR PRISM Trust Score — Preview</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            This is how the trust report appears at the bottom of every MCP response. Each grade level is shown below.
          </p>
        </div>

        {EXAMPLES.map((ex, i) => (
          <TrustScoreCard key={i} example={ex} />
        ))}

        <p className="text-center text-xs text-muted-foreground pt-6">
          This is a preview page. The actual trust score is rendered as markdown in your LLM client (Cursor, Claude Desktop, etc.).
        </p>
      </div>
    </div>
  );
}
