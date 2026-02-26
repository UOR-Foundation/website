/**
 * UOR Canonical Namespace Registry
 * ═══════════════════════════════════════════════════════════════════
 *
 * Maps the 14 canonical namespaces (from the v2.0.0 Tri-Space ontology)
 * to the runtime modules that implement them.
 *
 * Tri-Space Layout:
 *   Kernel (3):  u/, schema/, op/
 *   Bridge (8):  query/, resolver/, partition/, observable/, proof/, derivation/, trace/, cert/
 *   User   (3):  type/, morphism/, state/
 *
 * Non-ontological modules (presentation, infra) remain outside this registry.
 *
 * @version 2.0.0
 */

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
}

// ── The 14 Canonical Namespaces ────────────────────────────────────────────

export const CANONICAL_NAMESPACES: readonly NamespaceDescriptor[] = [
  // ── Kernel Space ──────────────────────────────────────────────────────
  {
    prefix: "u:",
    label: "Universal Ring",
    space: "kernel",
    modules: ["ring-core", "identity"],
    barrel: "@/modules/ring-core",
    depth: 1,
    icon: "∞",
  },
  {
    prefix: "schema:",
    label: "Schema Primitives",
    space: "kernel",
    modules: ["triad", "jsonld"],
    barrel: "@/modules/ns/schema",
    depth: 1,
    icon: "📐",
  },
  {
    prefix: "op:",
    label: "Operations",
    space: "kernel",
    modules: ["ring-core"], // op-meta lives inside ring-core
    barrel: "@/modules/ring-core",
    depth: 1,
    icon: "⚡",
  },

  // ── Bridge Space ──────────────────────────────────────────────────────
  {
    prefix: "query:",
    label: "Query Engine",
    space: "bridge",
    modules: ["sparql"],
    barrel: "@/modules/ns/query",
    depth: 2,
    icon: "🔍",
  },
  {
    prefix: "resolver:",
    label: "Resolver",
    space: "bridge",
    modules: ["resolver"],
    barrel: "@/modules/resolver",
    depth: 2,
    icon: "🎯",
  },
  {
    prefix: "partition:",
    label: "Partition",
    space: "bridge",
    modules: ["resolver"], // partition logic lives inside resolver
    barrel: "@/modules/resolver",
    depth: 2,
    icon: "🧩",
  },
  {
    prefix: "observable:",
    label: "Observable Geometry",
    space: "bridge",
    modules: ["observable"],
    barrel: "@/modules/observable",
    depth: 2,
    icon: "📐",
  },
  {
    prefix: "proof:",
    label: "Proof & Verification",
    space: "bridge",
    modules: ["verify", "epistemic", "shacl"],
    barrel: "@/modules/ns/proof",
    depth: 3,
    icon: "🛡️",
  },
  {
    prefix: "derivation:",
    label: "Derivation",
    space: "bridge",
    modules: ["derivation"],
    barrel: "@/modules/derivation",
    depth: 2,
    icon: "🔬",
  },
  {
    prefix: "trace:",
    label: "Computation Trace",
    space: "bridge",
    modules: ["trace"],
    barrel: "@/modules/trace",
    depth: 2,
    icon: "📝",
  },
  {
    prefix: "cert:",
    label: "Certificate",
    space: "bridge",
    modules: ["certificate"],
    barrel: "@/modules/certificate",
    depth: 3,
    icon: "📜",
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
  },
  {
    prefix: "morphism:",
    label: "Morphism",
    space: "user",
    modules: ["morphism"],
    barrel: "@/modules/morphism",
    depth: 3,
    icon: "🔀",
  },
  {
    prefix: "state:",
    label: "State",
    space: "user",
    modules: ["state"],
    barrel: "@/modules/state",
    depth: 3,
    icon: "⚙️",
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

/** Count: should be 14 */
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
