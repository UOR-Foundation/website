import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { Q0, Q1, Q2 } from "@/modules/ring-core/ring";
import type { Term } from "@/modules/ring-core/canonicalization";
import { serializeTerm } from "@/modules/ring-core/canonicalization";
import { bytesToGlyph, contentAddress } from "@/modules/identity";
import { EpistemicBadge } from "@/modules/epistemic";
import { derive } from "../derivation";
import type { Derivation } from "../derivation";
import { issueCertificate } from "../certificate";
import type { Certificate } from "../certificate";
import { generateReceipt } from "../receipt";
import type { DerivationReceipt } from "../receipt";

const QUANTUM_OPTIONS = [
  { label: "Q0 (8-bit)", quantum: 0, max: 255 },
  { label: "Q1 (16-bit)", quantum: 1, max: 65535 },
] as const;

type OpType = "neg" | "bnot" | "succ" | "pred" | "xor" | "and" | "or";
const UNARY_OPS: OpType[] = ["neg", "bnot", "succ", "pred"];
const BINARY_OPS: OpType[] = ["xor", "and", "or"];
const ALL_OPS: OpType[] = [...UNARY_OPS, ...BINARY_OPS];

interface LabResult {
  derivation: Derivation;
  certificate: Certificate;
  receipt: DerivationReceipt;
  term: Term;
}

const DerivationLabPage = () => {
  const [quantumIdx, setQuantumIdx] = useState(0);
  const [op, setOp] = useState<OpType>("neg");
  const [operandA, setOperandA] = useState("85");
  const [operandB, setOperandB] = useState("170");
  const [result, setResult] = useState<LabResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qOpt = QUANTUM_OPTIONS[quantumIdx];
  const ring = quantumIdx === 0 ? Q0() : Q1();
  const isBinary = BINARY_OPS.includes(op);

  const runDerive = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      // Ensure ring coherence first (R4)
      if (!ring.coherenceVerified) {
        ring.verify();
      }

      const a = Math.max(0, Math.min(qOpt.max, parseInt(operandA) || 0));
      const b = Math.max(0, Math.min(qOpt.max, parseInt(operandB) || 0));

      // Build term
      let term: Term;
      if (isBinary) {
        term = {
          kind: "binary",
          op: op as "xor" | "and" | "or",
          args: [
            { kind: "const", value: a },
            { kind: "const", value: b },
          ],
        };
      } else {
        term = {
          kind: "unary",
          op: op as "neg" | "bnot" | "succ" | "pred",
          arg: { kind: "const", value: a },
        };
      }

      // Derive
      const derivation = await derive(ring, term);

      // Issue certificate
      const certificate = await issueCertificate(derivation, ring, term);

      // Generate self-verifying receipt
      const { receipt } = await generateReceipt("derivation-lab", ring, term);

      setResult({ derivation, certificate, receipt, term });
    } catch (e) {
      setError(String(e));
    }
    setRunning(false);
  }, [ring, op, operandA, operandB, qOpt.max, isBinary]);

  return (
    <Layout>
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Module 4 — Derivation & Certificate Engine
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Derivation Lab</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Every computation produces an auditable derivation record, a verifiable certificate,
              and a self-verifying canonical receipt. The system proves its own correctness.
            </p>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Quantum selector */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Quantum Level
              </label>
              <div className="flex gap-2">
                {QUANTUM_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.quantum}
                    onClick={() => setQuantumIdx(i)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      quantumIdx === i
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/25"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operation selector */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Operation
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_OPS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setOp(o)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 ${
                      op === o
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/25"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operands */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Operand A (0–{qOpt.max.toLocaleString()})
              </label>
              <input
                type="number"
                min={0}
                max={qOpt.max}
                value={operandA}
                onChange={(e) => setOperandA(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {isBinary && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Operand B (0–{qOpt.max.toLocaleString()})
                </label>
                <input
                  type="number"
                  min={0}
                  max={qOpt.max}
                  value={operandB}
                  onChange={(e) => setOperandB(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>

          {/* Derive button */}
          <button
            onClick={runDerive}
            disabled={running}
            className="btn-primary text-sm mb-8"
          >
            {running ? "Deriving…" : "Derive"}
          </button>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-8">
              <p className="text-sm text-destructive font-mono">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Derivation record */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">Derivation Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <Field label="Derivation ID" value={result.derivation.derivationId} mono />
                  <Field label="Epistemic Grade" value="" />
                  <div className="-mt-1"><EpistemicBadge grade={result.derivation.epistemicGrade} showLabel /></div>
                  <Field label="Original Term" value={result.derivation.originalTerm} mono />
                  <Field label="Canonical Term" value={result.derivation.canonicalTerm} mono highlight />
                  <Field label="Result Value" value={String(result.derivation.resultValue)} mono />
                  <Field label="Result IRI" value={result.derivation.resultIri} mono />
                  <Field
                    label="Result Glyph"
                    value={bytesToGlyph(ring.toBytes(result.derivation.resultValue))}
                    className="text-lg"
                  />
                  <Field
                    label="Reduction"
                    value={`${result.derivation.metrics.originalComplexity} → ${result.derivation.metrics.canonicalComplexity} nodes (${(result.derivation.metrics.reductionRatio * 100).toFixed(0)}% reduced)`}
                  />
                </div>
              </div>

              {/* Certificate */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">Certificate</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <Field label="Certificate ID" value={result.certificate.certificateId} mono />
                  <Field label="Certifies" value={result.certificate.certifies} mono />
                  <Field label="Derivation ID" value={result.certificate.derivationId} mono />
                  <Field
                    label="Valid"
                    value={result.certificate.valid ? "✓ VALID" : "✗ INVALID"}
                    className={result.certificate.valid ? "text-green-600 font-bold" : "text-destructive font-bold"}
                  />
                  <Field label="Cert Chain" value={result.certificate.certChain.join(" → ")} mono />
                </div>
              </div>

              {/* Self-verifying receipt */}
              <div className={`rounded-lg border p-5 ${
                result.receipt.selfVerified
                  ? "border-green-600/30 bg-green-600/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}>
                <h3 className="text-sm font-semibold mb-3">Canonical Receipt (Self-Verification)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <Field label="Receipt ID" value={result.receipt.receiptId} mono />
                  <Field label="Operation" value={result.receipt.operation} mono />
                  <Field label="Input Hash" value={result.receipt.inputHash} mono />
                  <Field label="Output Hash" value={result.receipt.outputHash} mono />
                  <Field label="Recompute Hash" value={result.receipt.recomputeHash} mono />
                  <div className="md:col-span-2 flex items-center gap-4">
                    <Field
                      label="Self-Verified"
                      value={result.receipt.selfVerified ? "✓ HASHES MATCH" : "✗ MISMATCH"}
                      className={result.receipt.selfVerified ? "text-green-600 font-bold" : "text-destructive font-bold"}
                    />
                    <Field
                      label="Ring Coherence"
                      value={result.receipt.coherenceVerified ? "✓ VERIFIED" : "○ NOT YET VERIFIED"}
                      className={result.receipt.coherenceVerified ? "text-green-600 font-bold" : "text-muted-foreground"}
                    />
                  </div>
                </div>
              </div>

              {/* Commutativity proof hint */}
              {isBinary && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    Commutativity Test
                  </p>
                  <p>
                    Try swapping operands A and B — the derivation ID must be identical
                    because the canonical form sorts operands. For example,{" "}
                    <span className="font-mono">xor(0x55, 0xAA)</span> and{" "}
                    <span className="font-mono">xor(0xAA, 0x55)</span> produce the same
                    derivation ID.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

// ── Field subcomponent ──────────────────────────────────────────────────────

function Field({
  label,
  value,
  mono,
  highlight,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p
        className={`${mono ? "font-mono" : ""} ${
          highlight ? "text-primary font-semibold" : "text-foreground"
        } ${className ?? ""} break-all`}
      >
        {value}
      </p>
    </div>
  );
}

export default DerivationLabPage;
