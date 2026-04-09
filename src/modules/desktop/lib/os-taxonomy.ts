/**
 * UOR OS Taxonomy — Maps the 9 canonical OS categories
 * to UOR Foundation v0.2.0 modules and desktop apps.
 *
 * Each category is a functional slice of the virtual operating system,
 * grounded in specific UOR namespaces from the Rust crate.
 *
 * @see .lovable/plan.md — OS Component ↔ UOR v0.2.0 Module Mapping
 * @see https://docs.rs/uor-foundation/0.2.0
 */

// ── Category Definition ────────────────────────────────────────────────────

/**
 * OsCategory — a functional grouping of OS capabilities,
 * each grounded in specific UOR v0.2.0 namespaces.
 */
export type OsCategory =
  | "RESOLVE"
  | "IDENTITY"
  | "ENFORCE"
  | "COMPUTE"
  | "OBSERVE"
  | "TRANSFORM"
  | "EXCHANGE"
  | "STRUCTURE"
  | "FAILURE";

/**
 * OsCategoryDescriptor — full metadata for an OS category.
 */
export interface OsCategoryDescriptor {
  /** Category identifier. */
  id: OsCategory;
  /** Human-readable label. */
  label: string;
  /** One-line description of the category's function. */
  description: string;
  /** UOR v0.2.0 namespace modules backing this category. */
  uorModules: string[];
  /** Desktop app IDs that belong to this category. */
  appIds: string[];
  /** Whether this category is user-facing (false = internal framework). */
  userFacing: boolean;
}

// ── Canonical Taxonomy ─────────────────────────────────────────────────────

/**
 * OS_TAXONOMY — the complete mapping from OS categories to UOR modules.
 *
 * This is the single source of truth for how the virtual OS's
 * capabilities map to the algebraic substrate.
 */
export const OS_TAXONOMY: Record<OsCategory, OsCategoryDescriptor> = {
  RESOLVE: {
    id: "RESOLVE",
    label: "Resolve",
    description: "Query resolution, search, and knowledge retrieval",
    uorModules: ["query", "resolver", "reduction"],
    appIds: ["search", "oracle", "library"],
    userFacing: true,
  },
  IDENTITY: {
    id: "IDENTITY",
    label: "Identity",
    description: "Cryptographic identity, proof verification, and trust",
    uorModules: ["proof", "cert", "conformance"],
    appIds: ["vault"],
    userFacing: true,
  },
  ENFORCE: {
    id: "ENFORCE",
    label: "Enforce",
    description: "Validation, grounding discipline, and access control",
    uorModules: ["enforcement", "boundary", "predicate"],
    appIds: ["settings"],
    userFacing: true,
  },
  COMPUTE: {
    id: "COMPUTE",
    label: "Compute",
    description: "Cascade execution, parallel composition, and streaming",
    uorModules: ["cascade", "monoidal", "parallel", "stream"],
    appIds: [],
    userFacing: false,
  },
  OBSERVE: {
    id: "OBSERVE",
    label: "Observe",
    description: "Metrics, traces, and real-time system observation",
    uorModules: ["observable", "trace", "derivation"],
    appIds: [],
    userFacing: false,
  },
  TRANSFORM: {
    id: "TRANSFORM",
    label: "Transform",
    description: "Morphisms, effects, and algebraic transformations",
    uorModules: ["morphism", "effect", "carry", "convergence"],
    appIds: [],
    userFacing: false,
  },
  EXCHANGE: {
    id: "EXCHANGE",
    label: "Exchange",
    description: "Multi-entity interaction, messaging, and session state",
    uorModules: ["interaction", "boundary", "state"],
    appIds: ["messenger"],
    userFacing: true,
  },
  STRUCTURE: {
    id: "STRUCTURE",
    label: "Structure",
    description: "Topological structure: homology, cohomology, operads",
    uorModules: ["homology", "cohomology", "operad", "region"],
    appIds: ["files"],
    userFacing: true,
  },
  FAILURE: {
    id: "FAILURE",
    label: "Failure",
    description: "Error handling, recovery, and resource discipline",
    uorModules: ["failure", "recursion", "linear"],
    appIds: [],
    userFacing: false,
  },
} as const;

// ── Utility Functions ──────────────────────────────────────────────────────

/** Get the category for a given app ID. Returns undefined if the app has no category. */
export function getCategoryForApp(appId: string): OsCategory | undefined {
  for (const [cat, desc] of Object.entries(OS_TAXONOMY)) {
    if (desc.appIds.includes(appId)) return cat as OsCategory;
  }
  return undefined;
}

/** Get all user-facing categories. */
export function getUserFacingCategories(): OsCategoryDescriptor[] {
  return Object.values(OS_TAXONOMY).filter(c => c.userFacing);
}

/** Get all UOR modules across all categories (deduplicated). */
export function getAllUorModules(): string[] {
  const modules = new Set<string>();
  for (const desc of Object.values(OS_TAXONOMY)) {
    for (const m of desc.uorModules) modules.add(m);
  }
  return Array.from(modules).sort();
}

/** All categories as an ordered array. */
export const OS_CATEGORIES: OsCategory[] = [
  "RESOLVE", "IDENTITY", "ENFORCE", "COMPUTE",
  "OBSERVE", "TRANSFORM", "EXCHANGE", "STRUCTURE", "FAILURE",
];
