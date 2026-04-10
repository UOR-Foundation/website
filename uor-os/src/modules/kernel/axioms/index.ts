/**
 * Design Axioms — Barrel Export
 * ═════════════════════════════════════════════════════════════════
 *
 * Declarative design constraints as content-addressed blueprints.
 * Import this module to access the Algebrica design system,
 * resolve axioms, and register the compliance gate.
 *
 * @module axioms
 */

// Register the compliance gate via side-effect
import "./gate";

// Types
export type {
  DesignAxiom,
  DesignSystem,
  AxiomCategory,
  AxiomConstraint,
  VerificationSpec,
  VerificationKind,
} from "./types";

// Registry
export {
  ALGEBRICA,
  ALGEBRICA_AXIOMS,
  getActiveDesignSystem,
  setActiveDesignSystem,
} from "./registry";

// Resolution
export {
  resolveAxiom,
  axiomsByCategory,
  allAxiomCodes,
  axiomCategoryCounts,
  exportAxiomsMarkdown,
  useAxiom,
  useDesignSystem,
} from "./resolve";
