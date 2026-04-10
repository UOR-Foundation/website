/**
 * Health Gate Runner — Pluggable System Integrity Engine
 * ═══════════════════════════════════════════════════════
 *
 * Registry of gates that produce structured reports.
 * Each gate is a pure function: () => GateResult.
 * New gates are registered once and run via runAllGates().
 *
 * @module canonical-compliance/gates/gate-runner
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface GateFinding {
  readonly severity: "error" | "warning" | "info";
  readonly title: string;
  readonly detail: string;
  readonly file?: string;
  readonly recommendation?: string;
}

export interface GateResult {
  readonly id: string;
  readonly name: string;
  readonly status: "pass" | "warn" | "fail";
  readonly score: number; // 0-100
  readonly findings: readonly GateFinding[];
  readonly timestamp: string;
}

export interface GateReport {
  readonly timestamp: string;
  readonly gates: readonly GateResult[];
  readonly compositeScore: number;
}

export type Gate = () => GateResult;
export type AsyncGate = () => Promise<GateResult>;

// ── Registry ──────────────────────────────────────────────────────────────

const GATE_REGISTRY: Gate[] = [];
const ASYNC_GATE_REGISTRY: AsyncGate[] = [];

/** Register a synchronous gate function. */
export function registerGate(gate: Gate): void {
  GATE_REGISTRY.push(gate);
}

/** Register an async gate function (e.g. IndexedDB readers). */
export function registerAsyncGate(gate: AsyncGate): void {
  ASYNC_GATE_REGISTRY.push(gate);
}

/** Run all registered gates (sync only) and produce a combined report. */
export function runAllGates(): GateReport {
  const gates = GATE_REGISTRY.map((g) => g());
  const compositeScore =
    gates.length > 0
      ? Math.round(gates.reduce((sum, g) => sum + g.score, 0) / gates.length)
      : 100;

  return {
    timestamp: new Date().toISOString(),
    gates,
    compositeScore,
  };
}

/** Run all gates (sync + async) and produce a combined report. */
export async function runAllGatesAsync(): Promise<GateReport> {
  const syncResults = GATE_REGISTRY.map((g) => g());
  const asyncResults = await Promise.all(ASYNC_GATE_REGISTRY.map((g) => g()));
  const gates = [...syncResults, ...asyncResults];
  const compositeScore =
    gates.length > 0
      ? Math.round(gates.reduce((sum, g) => sum + g.score, 0) / gates.length)
      : 100;

  return {
    timestamp: new Date().toISOString(),
    gates,
    compositeScore,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Compute status from score. */
export function scoreToStatus(score: number): "pass" | "warn" | "fail" {
  if (score >= 90) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

/** Build a GateResult from parts. */
export function buildGateResult(
  id: string,
  name: string,
  findings: GateFinding[],
  maxDeductions?: { error: number; warning: number; info: number },
): GateResult {
  const d = maxDeductions ?? { error: 10, warning: 4, info: 1 };
  const deductions = findings.reduce((sum, f) => sum + d[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return {
    id,
    name,
    status: scoreToStatus(score),
    score,
    findings,
    timestamp: new Date().toISOString(),
  };
}

// ── Markdown Export ───────────────────────────────────────────────────────

export function exportGatesMarkdown(report: GateReport): string {
  const lines: string[] = [
    `# Health Gate Report`,
    ``,
    `**Generated**: ${report.timestamp}`,
    `**Composite Score**: ${report.compositeScore}/100`,
    ``,
    `---`,
    ``,
  ];

  for (const gate of report.gates) {
    const icon = gate.status === "pass" ? "✅" : gate.status === "warn" ? "⚠️" : "❌";
    lines.push(`## ${icon} ${gate.name} — ${gate.score}/100 (${gate.status.toUpperCase()})`);
    lines.push(``);

    if (gate.findings.length === 0) {
      lines.push(`No findings.`);
    } else {
      for (const f of gate.findings) {
        const sev = f.severity === "error" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵";
        lines.push(`- ${sev} **${f.title}**`);
        lines.push(`  ${f.detail}`);
        if (f.file) lines.push(`  *File*: \`${f.file}\``);
        if (f.recommendation) lines.push(`  *Fix*: ${f.recommendation}`);
      }
    }
    lines.push(``);
  }

  return lines.join("\n");
}
