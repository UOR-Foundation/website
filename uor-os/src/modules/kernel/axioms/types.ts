/**
 * Design Axioms — Type Definitions
 * ═════════════════════════════════════════════════════════════════
 *
 * Declarative design constraints as content-addressed blueprints.
 * Each axiom is a machine-readable design law that can be verified
 * by a compliance gate.
 *
 * @module axioms/types
 */

// ── Categories ───────────────────────────────────────────────────────────

export type AxiomCategory = "visual" | "interaction" | "architecture" | "data";

// ── Verification Spec ────────────────────────────────────────────────────

export type VerificationKind =
  | "css-token-presence"
  | "css-value-pattern"
  | "file-pattern"
  | "module-manifest"
  | "import-analysis"
  | "constant-check"
  | "structural";

export interface VerificationSpec {
  readonly kind: VerificationKind;
  /** Human description of what is checked */
  readonly description: string;
  /** Tokens, patterns, or file globs to check */
  readonly targets?: readonly string[];
  /** Expected value pattern (regex string) */
  readonly pattern?: string;
  /** Minimum coverage ratio 0-1 */
  readonly minCoverage?: number;
}

// ── Constraint ───────────────────────────────────────────────────────────

export interface AxiomConstraint {
  /** One-line machine-readable rule */
  readonly rule: string;
  /** What is forbidden */
  readonly forbids?: readonly string[];
  /** What is required */
  readonly requires?: readonly string[];
}

// ── Design Axiom (the Blueprint) ─────────────────────────────────────────

export interface DesignAxiom {
  readonly "@id": string;
  readonly "@type": "uor:DesignAxiom";

  // Identity
  readonly label: string;
  readonly code: string;                    // e.g. "A1", "A2"
  readonly category: AxiomCategory;

  // Philosophy
  readonly principle: string;               // One-sentence law
  readonly rationale: string;               // WHY this constraint exists

  // Enforcement
  readonly constraint: AxiomConstraint;
  readonly verification: VerificationSpec;

  // Lineage
  readonly "uor:derivedFrom"?: string;
  readonly "skos:related"?: readonly string[];

  // Versioning
  readonly version: string;
  readonly supersedes?: string;
}

// ── Design System (Swappable Axiom Bundle) ───────────────────────────────

export interface DesignSystem {
  readonly "@id": string;
  readonly "@type": "uor:DesignSystem";
  readonly label: string;
  readonly version: string;
  readonly axioms: readonly DesignAxiom[];
  readonly cssTokens: Readonly<Record<string, string>>;
  readonly extends?: string;
}
