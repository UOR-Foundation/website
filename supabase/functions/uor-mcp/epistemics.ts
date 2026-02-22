/**
 * UOR MCP Epistemic Metadata — trust scoring for every tool response.
 *
 * Attaches grade (A–D), confidence (0–1), sources, and reasoning chain
 * to every MCP tool result so consuming agents can assess trust.
 */

export type EpistemicGrade = "A" | "B" | "C" | "D";

export interface EpistemicMetadata {
  /** Trust grade: A (algebraic proof) → D (unverified). */
  grade: EpistemicGrade;
  /** Human-readable grade label. */
  grade_label: string;
  /** Numeric confidence 0–1 derived from grade + evidence. */
  confidence: number;
  /** Where the information comes from. */
  sources: EpistemicSource[];
  /** Step-by-step reasoning chain showing how the result was produced. */
  reasoning_chain: string[];
  /** Short natural-language trust summary for display. */
  trust_summary: string;
  /** SHA-256 verification receipt hash for this inference instance. */
  receipt_hash?: string;
}

export interface EpistemicSource {
  type: "algebraic_derivation" | "knowledge_graph" | "certificate" | "computation" | "user_input";
  label: string;
  /** Optional IRI or ID linking back to the provenance record. */
  reference?: string;
}

const GRADE_META: Record<EpistemicGrade, { label: string; base_confidence: number }> = {
  A: { label: "Algebraically Proven", base_confidence: 1.0 },
  B: { label: "Graph-Certified", base_confidence: 0.85 },
  C: { label: "Graph-Present", base_confidence: 0.6 },
  D: { label: "LLM-Generated / Unverified", base_confidence: 0.3 },
};

/** Build epistemic metadata for a uor_derive result. */
export function deriveEpistemics(
  data: Record<string, unknown>,
  term: string,
): EpistemicMetadata {
  const hasDerivationId = !!data.derivation_id;
  const grade: EpistemicGrade = hasDerivationId ? "A" : "D";
  const meta = GRADE_META[grade];

  return {
    grade,
    grade_label: meta.label,
    confidence: meta.base_confidence,
    sources: [
      { type: "user_input", label: `Input term: "${term}"` },
      ...(hasDerivationId
        ? [
            {
              type: "algebraic_derivation" as const,
              label: "Ring derivation with SHA-256 commitment",
              reference: String(data.derivation_id),
            },
          ]
        : []),
    ],
    reasoning_chain: [
      `1. Received term "${term}" for ring evaluation.`,
      "2. Canonicalized expression via AC-normalization.",
      "3. Evaluated through UOR ring kernel (ℤ/256ℤ).",
      hasDerivationId
        ? `4. SHA-256 derivation ID committed: ${String(data.derivation_id).slice(0, 24)}…`
        : "4. No derivation ID produced — result unverified.",
      hasDerivationId
        ? "5. Grade A assigned — algebraically proven, fully reproducible."
        : "5. Grade D assigned — treat as hypothesis.",
    ],
    trust_summary: hasDerivationId
      ? "This result is algebraically proven with a SHA-256 derivation ID. It can be independently verified by any agent using uor_verify."
      : "This result could not be committed to a derivation. Treat as unverified.",
  };
}

/** Build epistemic metadata for a uor_verify result. */
export function verifyEpistemics(
  data: Record<string, unknown>,
  derivationId: string,
): EpistemicMetadata {
  const verified = data.verified === true;
  const grade: EpistemicGrade = verified ? "A" : "D";
  const meta = GRADE_META[grade];

  return {
    grade,
    grade_label: meta.label,
    confidence: meta.base_confidence,
    sources: [
      { type: "user_input", label: `Derivation ID: ${derivationId.slice(0, 32)}…` },
      ...(verified
        ? [{ type: "algebraic_derivation" as const, label: "Verified against stored derivation", reference: derivationId }]
        : []),
    ],
    reasoning_chain: [
      `1. Received derivation ID for verification.`,
      "2. Looked up derivation in the UOR derivation store.",
      verified
        ? "3. Match found — original term, canonical form, and result IRI all consistent."
        : "3. No matching derivation found in the store.",
      verified
        ? "4. Grade A confirmed — this derivation is algebraically sound."
        : "4. Grade D assigned — derivation could not be verified.",
    ],
    trust_summary: verified
      ? "Derivation verified. The original computation is algebraically proven and reproducible."
      : "Derivation not found or inconsistent. This claim cannot be trusted without re-derivation.",
  };
}

/** Build epistemic metadata for a uor_query (SPARQL) result. */
export function queryEpistemics(
  data: Record<string, unknown>,
  sparql: string,
): EpistemicMetadata {
  const results = Array.isArray((data as { results?: { bindings?: unknown[] } }).results?.bindings)
    ? (data as { results: { bindings: unknown[] } }).results.bindings
    : [];
  const hasResults = results.length > 0;
  // SPARQL results from the graph are Grade B (graph-certified) if results exist
  const grade: EpistemicGrade = hasResults ? "B" : "C";
  const meta = GRADE_META[grade];

  return {
    grade,
    grade_label: meta.label,
    confidence: hasResults ? meta.base_confidence : 0.5,
    sources: [
      { type: "user_input", label: `SPARQL query (${sparql.length} chars)` },
      { type: "knowledge_graph", label: `UOR Q0 knowledge graph — ${results.length} binding(s) returned` },
    ],
    reasoning_chain: [
      "1. Received SPARQL 1.1 query.",
      "2. Parsed and validated query syntax.",
      `3. Executed against the UOR knowledge graph (Q0 instance).`,
      `4. ${results.length} result binding(s) returned.`,
      hasResults
        ? "5. Grade B assigned — results sourced from the certified knowledge graph."
        : "5. Grade C assigned — query executed but returned no bindings.",
    ],
    trust_summary: hasResults
      ? `${results.length} result(s) sourced directly from the UOR knowledge graph. Data is graph-certified.`
      : "Query returned no results. The absence of data does not constitute proof of absence.",
  };
}

/** Build epistemic metadata for a uor_correlate result. */
export function correlateEpistemics(
  data: Record<string, unknown>,
  a: number,
  b: number,
): EpistemicMetadata {
  const fidelity = typeof data.fidelity === "number" ? data.fidelity : null;
  const grade: EpistemicGrade = fidelity !== null ? "A" : "D";
  const meta = GRADE_META[grade];

  return {
    grade,
    grade_label: meta.label,
    confidence: fidelity !== null ? meta.base_confidence : 0.3,
    sources: [
      { type: "user_input", label: `Elements: a=${a}, b=${b}` },
      ...(fidelity !== null
        ? [{ type: "computation" as const, label: `Hamming fidelity computed: ${fidelity.toFixed(4)}` }]
        : []),
    ],
    reasoning_chain: [
      `1. Received elements a=${a}, b=${b} for correlation.`,
      "2. Computed Hamming distance between binary representations.",
      "3. Derived fidelity score (1 − normalised Hamming distance).",
      fidelity !== null
        ? `4. Fidelity = ${fidelity.toFixed(4)} — this is a deterministic algebraic computation.`
        : "4. Computation failed — no fidelity produced.",
      fidelity !== null
        ? "5. Grade A assigned — result is algebraically determined."
        : "5. Grade D assigned — result could not be computed.",
    ],
    trust_summary: fidelity !== null
      ? `Hamming fidelity of ${fidelity.toFixed(4)} computed algebraically. Fully deterministic and reproducible.`
      : "Correlation could not be computed. Result is unverified.",
  };
}

/** Build epistemic metadata for a uor_partition result. */
export function partitionEpistemics(
  data: Record<string, unknown>,
  seedSet: number[],
): EpistemicMetadata {
  const hasPartition = !!(data as Record<string, unknown>).units ||
    !!(data as Record<string, unknown>).irreducible;
  const grade: EpistemicGrade = hasPartition ? "A" : "D";
  const meta = GRADE_META[grade];

  return {
    grade,
    grade_label: meta.label,
    confidence: meta.base_confidence,
    sources: [
      { type: "user_input", label: `Seed set: [${seedSet.slice(0, 5).join(", ")}${seedSet.length > 5 ? "…" : ""}]` },
      ...(hasPartition
        ? [{ type: "computation" as const, label: "Ring partition classification (Units/Exterior/Irreducible/Reducible)" }]
        : []),
    ],
    reasoning_chain: [
      `1. Received seed set of ${seedSet.length} element(s).`,
      "2. Applied ring partition classification over ℤ/Qℤ.",
      "3. Classified each element: Units (invertible), Exterior (zero-divisors), Irreducible, Reducible.",
      hasPartition
        ? "4. Full partition computed — classification is algebraically determined."
        : "4. Partition computation failed.",
      hasPartition
        ? "5. Grade A assigned — partition is a deterministic algebraic property."
        : "5. Grade D assigned — no partition produced.",
    ],
    trust_summary: hasPartition
      ? "Partition classification is algebraically determined. Each element's category is a provable ring property."
      : "Partition could not be computed. Treat result as unverified.",
  };
}

/** Emoji for each grade. */
function gradeIcon(grade: EpistemicGrade): string {
  return { A: "🟢", B: "🔵", C: "🟡", D: "🔴" }[grade];
}

/** Confidence bar: filled/empty blocks for a quick visual read. */
function confidenceBar(confidence: number): string {
  const filled = Math.round(confidence * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

/** Generate a SHA-256 receipt hash for this inference instance. */
async function generateReceiptHash(meta: EpistemicMetadata): Promise<string> {
  const payload = JSON.stringify({
    grade: meta.grade,
    confidence: meta.confidence,
    sources: meta.sources.map(s => s.label),
    ts: new Date().toISOString(),
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Format epistemic metadata as a human-readable trust stamp for the MCP response. */
export async function formatEpistemicBlock(meta: EpistemicMetadata): Promise<string> {
  const pct = (meta.confidence * 100).toFixed(0);
  const icon = gradeIcon(meta.grade);
  const bar = confidenceBar(meta.confidence);
  const receiptHash = await generateReceiptHash(meta);

  const sourceLines = meta.sources.map((s, i) => {
    const link = s.reference
      ? `[${s.label}](${s.reference})`
      : s.label;
    return `${i + 1}. ${link} · Grade ${meta.grade}`;
  });

  const shortHash = receiptHash.slice(0, 16);
  const receiptUrn = `urn:uor:receipt:sha256:${receiptHash}`;

  const lines = [
    "",
    "---",
    "**UOR PRISM Trust Score**",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Grade | ${icon} ${meta.grade} — ${meta.grade_label} |`,
    `| Confidence | ${bar} ${pct}% |`,
    `| Verified via | ${meta.reasoning_chain.length > 1 ? meta.reasoning_chain[meta.reasoning_chain.length - 2].replace(/^\d+\.\s*/, "") : "UOR computation"} |`,
    `| Receipt | \`${shortHash}…\` · [Full hash](${receiptUrn}) |`,
    "",
    "**Sources**",
    ...sourceLines,
    "",
    `**Trust summary:** ${meta.trust_summary}`,
    "",
    "---",
  ];
  return lines.join("\n");
}
