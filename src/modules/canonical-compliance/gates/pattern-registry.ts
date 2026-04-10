/**
 * Pattern Registry — Declarative Anti-Pattern Definitions
 * ════════════════════════════════════════════════════════
 *
 * Each entry defines a signature to scan for across the codebase.
 * When `promotedToGate` is set, the Pattern Sentinel skips it
 * (a dedicated gate now handles enforcement).
 *
 * @module canonical-compliance/gates/pattern-registry
 */

export interface PatternEntry {
  readonly id: string;
  readonly label: string;
  readonly pattern: RegExp;
  readonly severity: "error" | "warning" | "info";
  readonly threshold: number;
  readonly description: string;
  readonly recommendation: string;
  readonly promotedToGate?: string;
}

/**
 * Starter registry — grows as the system discovers new clusters.
 */
export const PATTERN_REGISTRY: PatternEntry[] = [
  // ── Pre-promoted (dedicated gate exists) ──────────────────────
  {
    id: "bypass-keyword",
    label: "bypass",
    pattern: /\bbypass\b/i,
    severity: "warning",
    threshold: 3,
    description: "Bypass keywords may indicate skipped validation or security checks.",
    recommendation: "Already tracked by the Canonical Pipeline Gate.",
    promotedToGate: "canonical-pipeline",
  },

  // ── Type Safety ───────────────────────────────────────────────
  {
    id: "unsafe-any",
    label: "as any",
    pattern: /\bas\s+any\b/,
    severity: "warning",
    threshold: 5,
    description: "Type casts to `any` erode TypeScript safety guarantees.",
    recommendation: "Promote to a dedicated Type Safety Gate when count exceeds 20.",
  },
  {
    id: "type-any",
    label: ": any",
    pattern: /:\s*any\b/,
    severity: "warning",
    threshold: 5,
    description: "Explicit `any` annotations weaken type coverage.",
    recommendation: "Combine with unsafe-any into a Type Safety Gate.",
  },

  // ── Suppressed Warnings ───────────────────────────────────────
  {
    id: "eslint-disable",
    label: "eslint-disable",
    pattern: /eslint-disable/,
    severity: "warning",
    threshold: 3,
    description: "Suppressed linter rules may hide real issues.",
    recommendation: "Promote to a Lint Compliance Gate if count exceeds 10.",
  },
  {
    id: "ts-ignore",
    label: "@ts-ignore / @ts-expect-error",
    pattern: /@ts-(ignore|expect-error)/,
    severity: "warning",
    threshold: 3,
    description: "TypeScript directive suppressions bypass compile-time checks.",
    recommendation: "Resolve underlying type issues instead of suppressing.",
  },

  // ── Unfinished Work ───────────────────────────────────────────
  {
    id: "todo-markers",
    label: "TODO / FIXME / HACK",
    pattern: /\b(TODO|FIXME|HACK)\b/,
    severity: "info",
    threshold: 5,
    description: "Unfinished work markers indicate incomplete implementation.",
    recommendation: "Promote to a Tech Debt Gate when count exceeds 30.",
  },

  // ── Debug Leaks ───────────────────────────────────────────────
  {
    id: "console-log",
    label: "console.log",
    pattern: /console\.log\(/,
    severity: "info",
    threshold: 10,
    description: "Debug logging left in production code.",
    recommendation: "Replace with structured logging or remove.",
  },

  // ── XSS Surface ───────────────────────────────────────────────
  {
    id: "dangerous-html",
    label: "dangerouslySetInnerHTML",
    pattern: /dangerouslySetInnerHTML/,
    severity: "error",
    threshold: 1,
    description: "Raw HTML injection creates XSS attack surface.",
    recommendation: "Promote to a Security Surface Gate immediately.",
  },

  // ── Memory Leaks ──────────────────────────────────────────────
  {
    id: "unguarded-timers",
    label: "setTimeout/setInterval",
    pattern: /\b(setTimeout|setInterval)\s*\(/,
    severity: "info",
    threshold: 5,
    description: "Timers without cleanup references risk memory leaks in React.",
    recommendation: "Ensure all timers are cleared in useEffect cleanup.",
  },

  // ── Deep Imports ──────────────────────────────────────────────
  {
    id: "deep-relative-imports",
    label: "Deep relative imports (../../..)",
    pattern: /from\s+['"]\.\.\/\.\.\/\.\.\//,
    severity: "info",
    threshold: 5,
    description: "Deep relative imports make refactoring fragile.",
    recommendation: "Use path aliases (@/modules/...) instead.",
  },
];

/** Get only active (non-promoted) patterns. */
export function getActivePatterns(): PatternEntry[] {
  return PATTERN_REGISTRY.filter((p) => !p.promotedToGate);
}
