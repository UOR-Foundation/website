import { useState } from "react";

const EXAMPLES = [
  {
    title: "Grade A: Mathematically Proven",
    subtitle: "The highest level of trust. This result was computed and verified by the system itself, not retrieved from any external source.",
    grade: "A",
    icon: "🟢",
    label: "Mathematically Proven",
    confidence: 98,
    verifiedVia: "Computed directly by the UOR system",
    receipt: "a3f8c1d902e6b74f",
    receiptFull: "a3f8c1d902e6b74f5e91d0c83a27b6e4f1d5a9c0e3b7f2d6a8c4e0b3f7d1a5e9",
    sources: [
      { claim: "neg(42) = 214 in ℤ/256ℤ", source: "UOR Ring Kernel", url: "https://uor.foundation/u/U00D6", grade: "A" },
      { claim: "Result fingerprint permanently recorded", source: "UOR Derivation Store", url: "urn:uor:derivation:sha256:a3f8c1d9…", grade: "A" },
    ],
    summary: "This answer was produced by a deterministic mathematical computation. It will always give the same result, on any machine, at any time. Anyone can independently re-run the same calculation to confirm it.",
  },
  {
    title: "Grade B: Verified from the Knowledge Graph",
    subtitle: "Strong trust. This information comes directly from the UOR knowledge graph, a structured, curated dataset with built-in integrity checks.",
    grade: "B",
    icon: "🔵",
    label: "Verified from Knowledge Graph",
    confidence: 85,
    verifiedVia: "Retrieved from the UOR knowledge graph",
    receipt: "7b2e4f91c8a3d605",
    receiptFull: "7b2e4f91c8a3d6051e90f3b7a2c8d4e6f0b5a9d3c7e1f4a8b2d6e0c4f8a3b7d1",
    sources: [
      { claim: "Element 42 has stratum [0,1,0,1,0,1,0,0]", source: "UOR Q0 Knowledge Graph", url: "https://uor.foundation/u/U002A", grade: "B" },
      { claim: "3 matching records found", source: "UOR Q0 Knowledge Graph", url: null, grade: "B" },
    ],
    summary: "This information was retrieved from a structured knowledge base with verified records. The data is consistent and traceable, though it reflects what is stored rather than what was independently computed.",
  },
  {
    title: "Grade C: Sourced from an External Reference",
    subtitle: "Moderate trust. The information was fetched from a named, linked source. You can click through to verify it yourself.",
    grade: "C",
    icon: "🟡",
    label: "Sourced from External Reference",
    confidence: 60,
    verifiedVia: "Fetched from a third-party source during this session",
    receipt: "e4c9a1b73f28d506",
    receiptFull: "e4c9a1b73f28d5061a7f3e9b2c84d0f6a5e1b9c3d7f2a8e4b0c6d3f7a1b5e9c2",
    sources: [
      { claim: "The Battle of Waterloo occurred on 18 June 1815", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", grade: "C" },
      { claim: "Coalition forces were led by Wellington and Blücher", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", grade: "C" },
      { claim: "Napoleon was exiled to Saint Helena after defeat", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", grade: "C" },
    ],
    summary: "This answer is based on a specific, named source that was accessed during this conversation. The source link is provided so you can read and evaluate the original material directly. It has not been independently verified by the UOR system.",
  },
  {
    title: "Grade D: From AI Training Data (Unverified)",
    subtitle: "Low trust. This answer comes from the AI model's training data. No external source was checked and no computation was performed.",
    grade: "D",
    icon: "🔴",
    label: "AI Training Data (Unverified)",
    confidence: 30,
    verifiedVia: "None. Generated from the AI model's memory.",
    receipt: "1f0a3b7c9e2d4f68",
    receiptFull: "1f0a3b7c9e2d4f685c8a1e3b7d0f2a6c4e9b5d1f7a3c8e0b4d6f2a9c1e5b3d7",
    sources: [
      { claim: "The Battle of Waterloo was a decisive Coalition victory", source: "AI training data", url: null, grade: "D" },
      { claim: "Approximately 40,000–50,000 casualties on the day", source: "AI training data", url: null, grade: "D" },
    ],
    summary: "This answer was generated entirely from the AI model's training data. No source was consulted and no verification was performed. The information may be accurate, but there is no way to confirm it from this response alone. Treat it as a starting point for further research.",
  },
];

const gradeColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  A: { bg: "bg-neutral-900/50", border: "border-neutral-700/50", text: "text-neutral-200", badge: "bg-neutral-800 text-neutral-200" },
  B: { bg: "bg-neutral-900/50", border: "border-neutral-700/50", text: "text-neutral-200", badge: "bg-neutral-800 text-neutral-200" },
  C: { bg: "bg-neutral-900/50", border: "border-neutral-700/50", text: "text-neutral-200", badge: "bg-neutral-800 text-neutral-200" },
  D: { bg: "bg-neutral-900/50", border: "border-neutral-700/50", text: "text-neutral-200", badge: "bg-neutral-800 text-neutral-200" },
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
      <p className="text-sm text-foreground/60 mt-1">{example.subtitle}</p>

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
              <td className="py-2 pr-4 text-muted-foreground font-medium">UOR Proof</td>
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
