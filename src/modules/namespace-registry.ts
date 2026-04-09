/**
 * UOR Canonical Namespace Registry
 * ═══════════════════════════════════════════════════════════════════
 *
 * Maps the 14 canonical namespaces (from the v2.0.0 Tri-Space ontology)
 * to the runtime modules that implement them.
 *
 * Canonical source of truth: https://crates.io/crates/uor-foundation
 * API documentation: https://docs.rs/uor-foundation
 *
 * Tri-Space Layout:
 *   Kernel (3):  u/, schema/, op/
 *   Bridge (8):  query/, resolver/, partition/, observable/, proof/, derivation/, trace/, cert/
 *   User   (3):  type/, morphism/, state/
 *
 * Non-ontological modules (presentation, infra) remain outside this registry.
 *
 * @version 2.0.0
 * @see https://crates.io/crates/uor-foundation
 */

import { CRATE_DOCS_URL } from "@/data/external-links";

// ── Namespace Descriptor ───────────────────────────────────────────────────

export interface NamespaceDescriptor {
  /** Canonical namespace prefix (e.g., "u:", "proof:") */
  readonly prefix: string;
  /** Human-readable label */
  readonly label: string;
  /** Tri-Space domain */
  readonly space: "kernel" | "bridge" | "user";
  /** Runtime module directories consolidated under this namespace */
  readonly modules: readonly string[];
  /** Canonical import path */
  readonly barrel: string;
  /** Tzimtzum depth (higher = more specialized) */
  readonly depth: number;
  /** Icon glyph */
  readonly icon: string;
  /** docs.rs module path within the crate (e.g., "kernel/u/") */
  readonly crateModule: string;
  /** Sovereign Bus namespace (if wired to bus dispatch) */
  readonly busNs?: string;
  /** Bus operations available for this namespace */
  readonly busOperations?: readonly string[];
}

/** Build full docs.rs URL for a namespace */
export function crateUrl(ns: NamespaceDescriptor): string {
  return `${CRATE_DOCS_URL}/latest/uor_foundation/${ns.crateModule}`;
}

// ── The 14 Canonical Namespaces ────────────────────────────────────────────

export const CANONICAL_NAMESPACES: readonly NamespaceDescriptor[] = [
  // ── Kernel Space ──────────────────────────────────────────────────────
  {
    prefix: "u:",
    label: "Universal Ring",
    space: "kernel",
    modules: ["identity"],
    barrel: "@/modules/identity",
    depth: 1,
    icon: "∞",
    crateModule: "kernel/u/",
    busNs: "kernel",
    busOperations: ["encode", "decode", "verify", "derive"],
  },
  {
    prefix: "schema:",
    label: "Schema Primitives",
    space: "kernel",
    modules: ["ring-core", "datum", "triad", "jsonld"],
    barrel: "@/modules/ns/schema",
    depth: 1,
    icon: "📐",
    crateModule: "kernel/schema/",
  },
  {
    prefix: "op:",
    label: "Operations",
    space: "kernel",
    modules: ["ring-core"],
    barrel: "@/modules/ring-core",
    depth: 1,
    icon: "⚡",
    crateModule: "kernel/op/",
  },

  // ── Bridge Space ──────────────────────────────────────────────────────
  {
    prefix: "query:",
    label: "Query Engine",
    space: "bridge",
    modules: ["sparql", "shacl"],
    barrel: "@/modules/ns/query",
    depth: 2,
    icon: "🔍",
    crateModule: "bridge/query/",
  },
  {
    prefix: "resolver:",
    label: "Resolver",
    space: "bridge",
    modules: ["resolver"],
    barrel: "@/modules/resolver",
    depth: 2,
    icon: "🎯",
    crateModule: "bridge/resolver/",
  },
  {
    prefix: "partition:",
    label: "Partition",
    space: "bridge",
    modules: ["resolver"],
    barrel: "@/modules/resolver",
    depth: 2,
    icon: "🧩",
    crateModule: "bridge/partition/",
  },
  {
    prefix: "observable:",
    label: "Observable Geometry",
    space: "bridge",
    modules: ["observable"],
    barrel: "@/modules/observable",
    depth: 2,
    icon: "📐",
    crateModule: "bridge/observable/",
  },
  {
    prefix: "proof:",
    label: "Proof & Verification",
    space: "bridge",
    modules: ["verify", "epistemic"],
    barrel: "@/modules/ns/proof",
    depth: 3,
    icon: "🛡️",
    crateModule: "bridge/proof/",
    busNs: "cert",
    busOperations: ["issue", "verify", "chain"],
  },
  {
    prefix: "derivation:",
    label: "Derivation",
    space: "bridge",
    modules: ["derivation"],
    barrel: "@/modules/derivation",
    depth: 2,
    icon: "🔬",
    crateModule: "bridge/derivation/",
  },
  {
    prefix: "trace:",
    label: "Computation Trace",
    space: "bridge",
    modules: ["trace"],
    barrel: "@/modules/trace",
    depth: 2,
    icon: "📝",
    crateModule: "bridge/trace/",
  },
  {
    prefix: "cert:",
    label: "Certificate",
    space: "bridge",
    modules: ["certificate"],
    barrel: "@/modules/certificate",
    depth: 3,
    icon: "📜",
    crateModule: "bridge/cert/",
  },

  // ── User Space ────────────────────────────────────────────────────────
  {
    prefix: "type:",
    label: "Type Store",
    space: "user",
    modules: ["kg-store", "code-kg"],
    barrel: "@/modules/ns/type",
    depth: 2,
    icon: "🧠",
    crateModule: "user/type_/",
    busNs: "graph",
    busOperations: ["put", "get", "query", "similar", "stats", "verify", "compress", "summary"],
  },
  {
    prefix: "morphism:",
    label: "Morphism",
    space: "user",
    modules: ["morphism"],
    barrel: "@/modules/morphism",
    depth: 3,
    icon: "🔀",
    crateModule: "user/morphism/",
  },
  {
    prefix: "state:",
    label: "State",
    space: "user",
    modules: ["state"],
    barrel: "@/modules/state",
    depth: 3,
    icon: "⚙️",
    crateModule: "user/state/",
  },

  // ── Extended Namespaces ──────────────────────────────────────────────
  {
    prefix: "audio:",
    label: "Audio",
    space: "bridge",
    modules: ["audio"],
    barrel: "@/modules/ns/audio",
    depth: 2,
    icon: "🎵",
    crateModule: "bridge/",
  },
  {
    prefix: "tee:",
    label: "Trusted Execution Environment",
    space: "bridge",
    modules: ["tee-bridge"],
    barrel: "@/hologram/kernel/tee-bridge",
    depth: 3,
    icon: "🔐",
    crateModule: "bridge/",
  },
] as const;

// ── Lookup Helpers ─────────────────────────────────────────────────────────

/** Map from prefix ("u:", "proof:", etc.) to descriptor */
export const NS_BY_PREFIX = new Map(
  CANONICAL_NAMESPACES.map((ns) => [ns.prefix, ns])
);

/** Map from module directory name to the namespace(s) it belongs to */
export const NS_BY_MODULE = new Map<string, NamespaceDescriptor[]>();
for (const ns of CANONICAL_NAMESPACES) {
  for (const mod of ns.modules) {
    const list = NS_BY_MODULE.get(mod) ?? [];
    list.push(ns);
    NS_BY_MODULE.set(mod, list);
  }
}

/** All module dirs that are mapped to a canonical namespace */
export const ONTOLOGICAL_MODULES = new Set(
  CANONICAL_NAMESPACES.flatMap((ns) => ns.modules)
);

/** Count: canonical namespaces (14 original + audio + tee) */
export const NAMESPACE_COUNT = CANONICAL_NAMESPACES.length;

/**
 * Resolve a namespace prefix to its descriptor.
 * @throws if the prefix is not one of the 14 canonical namespaces
 */
export function resolveNamespace(prefix: string): NamespaceDescriptor {
  const ns = NS_BY_PREFIX.get(prefix);
  if (!ns) {
    throw new Error(
      `[namespace-registry] Unknown namespace "${prefix}". ` +
      `Valid: ${CANONICAL_NAMESPACES.map((n) => n.prefix).join(", ")}`
    );
  }
  return ns;
}
