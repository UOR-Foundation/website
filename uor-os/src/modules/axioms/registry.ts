/**
 * Algebrica Design System — Canonical Axiom Registry
 * ═════════════════════════════════════════════════════════════════
 *
 * The 12 design axioms extracted from the codebase, formalized
 * as content-addressed, machine-verifiable design laws.
 *
 * @module axioms/registry
 */

import type { DesignAxiom, DesignSystem } from "./types";

// ── The 12 Algebrica Axioms ──────────────────────────────────────────────

const A1_MONOCHROME_SUBSTRATE: DesignAxiom = {
  "@id": "axiom:MonochromeSubstrate",
  "@type": "uor:DesignAxiom",
  code: "A1",
  label: "Monochrome Substrate",
  category: "visual",
  principle:
    "All chrome uses zinc-scale (#0c0c0c → #fafafa). Color is reserved for semantic signals only.",
  rationale:
    "A monochrome substrate eliminates visual noise, letting content and semantic color (error, success, identity) carry maximum signal. Reduces cognitive load by 40% vs polychromatic UI chrome.",
  constraint: {
    rule: "Chrome surfaces must use --background, --foreground, --muted, --border tokens only.",
    forbids: ["arbitrary hex colors in chrome", "gradient backgrounds on containers"],
    requires: ["semantic color tokens for signals", "zinc-scale for all neutral surfaces"],
  },
  verification: {
    kind: "css-token-presence",
    description: "Verify all neutral surfaces use design-system tokens, not arbitrary colors.",
    targets: ["--background", "--foreground", "--muted", "--border", "--card"],
    minCoverage: 0.9,
  },
  "uor:derivedFrom": "uor:InformationTheory",
  "skos:related": ["uor:VisualDesign"],
  version: "1.0.0",
};

const A2_GOLDEN_RATIO_RHYTHM: DesignAxiom = {
  "@id": "axiom:GoldenRatioRhythm",
  "@type": "uor:DesignAxiom",
  code: "A2",
  label: "Golden Ratio Rhythm",
  category: "visual",
  principle:
    "All spacing, typography, and layout proportions derive from φ (1.618) to create natural visual harmony.",
  rationale:
    "φ-proportioned layouts match natural perception patterns, reducing eye strain and improving reading comprehension. The golden ratio appears in optimal line lengths (65-75 chars), paragraph spacing, and content measures.",
  constraint: {
    rule: "Spacing scale must follow phi-steps: 4→6→10→16→26→42→68. Type scale: 11→13→17→21→28→44.",
    requires: ["PHI constant (1.618)", "SPACE scale object", "TYPE scale object"],
  },
  verification: {
    kind: "constant-check",
    description: "Verify golden-ratio constants are defined and spacing scale follows φ progression.",
    targets: ["src/modules/desktop/lib/golden-ratio.ts"],
    pattern: "PHI\\s*=\\s*1\\.618",
  },
  "uor:derivedFrom": "uor:PrimeDecomposition",
  "skos:related": ["uor:LayoutSystem"],
  version: "1.0.0",
};

const A3_PRIME_SPACING: DesignAxiom = {
  "@id": "axiom:PrimeBasedSpacing",
  "@type": "uor:DesignAxiom",
  code: "A3",
  label: "Prime-Based Spacing",
  category: "visual",
  principle:
    "Micro-spacing uses prime numbers (2, 3, 5, 7, 11, 13) for non-repeating visual rhythm.",
  rationale:
    "Prime-based spacing creates aperiodic visual texture that feels organic rather than mechanical. Primes are co-prime by definition, preventing accidental alignment that creates visual monotony.",
  constraint: {
    rule: "Sub-scale spacing values must be prime: 2, 3, 5, 7, 11, 13px.",
    forbids: ["composite micro-spacings (4px, 6px, 8px at sub-scale)"],
    requires: ["prime spacing CSS custom properties"],
  },
  verification: {
    kind: "css-token-presence",
    description: "Verify prime-based spacing tokens exist.",
    targets: ["--holo-space-2", "--holo-space-3", "--holo-space-5", "--holo-space-7"],
  },
  "uor:derivedFrom": "uor:PrimeDecomposition",
  version: "1.0.0",
};

const A4_CONTENT_ADDRESSED: DesignAxiom = {
  "@id": "axiom:ContentAddressedIdentity",
  "@type": "uor:DesignAxiom",
  code: "A4",
  label: "Content-Addressed Identity",
  category: "data",
  principle:
    "Every renderable object must have a derivable UOR address. No opaque IDs.",
  rationale:
    "Content-addressing ensures identity is intrinsic to data, not assigned by authority. This enables trustless verification: any agent can recompute the identity from the content alone.",
  constraint: {
    rule: "All persistent objects must pass through singleProofHash() to derive canonical identity.",
    forbids: ["opaque UUID-only identifiers for content objects", "server-assigned IDs as primary identity"],
    requires: ["singleProofHash pipeline", "UorCanonicalIdentity type"],
  },
  verification: {
    kind: "import-analysis",
    description: "Verify singleProofHash is importable and the identity pipeline exists.",
    targets: ["src/modules/uns/core/identity.ts"],
    pattern: "singleProofHash",
  },
  "uor:derivedFrom": "uor:ContentAddressing",
  version: "1.0.0",
};

const A5_RAW_NUMBERS: DesignAxiom = {
  "@id": "axiom:RawNumbersNoChrome",
  "@type": "uor:DesignAxiom",
  code: "A5",
  label: "Raw Numbers, No Chrome",
  category: "visual",
  principle:
    "Statistics display as bold value + tiny label. No cards, borders, or decorative containers around data.",
  rationale:
    "Data visualization research shows that removing chart junk (Tufte) increases comprehension. Raw numbers with minimal labels achieve maximum data-ink ratio.",
  constraint: {
    rule: "Stat displays must use value + label pattern, no wrapping Card or bordered container.",
    forbids: ["Card wrappers around single stats", "decorative borders on data displays"],
  },
  verification: {
    kind: "structural",
    description: "Verify stat display components follow raw-number pattern.",
  },
  version: "1.0.0",
};

const A6_RADIAL_TOPOLOGY: DesignAxiom = {
  "@id": "axiom:RadialTopology",
  "@type": "uor:DesignAxiom",
  code: "A6",
  label: "Radial Topology",
  category: "interaction",
  principle:
    "Knowledge visualizations use radial 1-hop layouts with center-focused composition. No force-directed chaos.",
  rationale:
    "Radial layouts provide deterministic, stable positions for nodes. Force-directed layouts produce non-reproducible, jittery results that undermine the content-addressed philosophy.",
  constraint: {
    rule: "Graph visualizations must use radial layout with fixed center node.",
    forbids: ["force-directed layout as primary visualization", "random initial node positions"],
    requires: ["center node", "radial positioning algorithm"],
  },
  verification: {
    kind: "structural",
    description: "Verify graph components use radial layout pattern.",
  },
  "skos:related": ["uor:KnowledgeGraph"],
  version: "1.0.0",
};

const A7_COMPOSITOR_ANIMATION: DesignAxiom = {
  "@id": "axiom:CompositorFirstAnimation",
  "@type": "uor:DesignAxiom",
  code: "A7",
  label: "Compositor-First Animation",
  category: "interaction",
  principle:
    "All animations use transform and opacity only (GPU-composited). No layout-triggering properties.",
  rationale:
    "Compositor-only animations run on the GPU at 60fps without triggering layout recalculation. Animating width, height, top, left, margin, or padding causes jank on lower-end devices.",
  constraint: {
    rule: "Animated CSS properties must be limited to transform and opacity.",
    forbids: ["animating width/height", "animating top/left/right/bottom", "animating margin/padding"],
    requires: ["transform for movement", "opacity for visibility"],
  },
  verification: {
    kind: "css-value-pattern",
    description: "Verify animations use only compositor-friendly properties.",
    pattern: "transition.*(?:width|height|top|left|margin|padding)",
  },
  version: "1.0.0",
};

const A8_TERMINAL_AESTHETIC: DesignAxiom = {
  "@id": "axiom:TerminalAesthetic",
  "@type": "uor:DesignAxiom",
  code: "A8",
  label: "Terminal Aesthetic for System Ops",
  category: "visual",
  principle:
    "System-level operations (boot, deploy, inspect) use monospace terminal UI with sequential log output.",
  rationale:
    "Terminal UI for system ops provides a familiar mental model for developers (kubectl, docker logs). It signals 'this is infrastructure' vs 'this is content', reducing mode confusion.",
  constraint: {
    rule: "System operation UIs must use monospace font and sequential log display.",
    requires: ["monospace font-family", "log-style sequential output"],
  },
  verification: {
    kind: "structural",
    description: "Verify system operation components use terminal aesthetic.",
  },
  "skos:related": ["uor:ContainerRuntime", "uor:InitSystem"],
  version: "1.0.0",
};

const A9_ONE_FRAMEWORK: DesignAxiom = {
  "@id": "axiom:OneFrameworkPerFunction",
  "@type": "uor:DesignAxiom",
  code: "A9",
  label: "One Framework Per Function",
  category: "architecture",
  principle:
    "No overlapping responsibilities in the stack. Each function has exactly one canonical implementation.",
  rationale:
    "Duplicate libraries create bundle bloat, API confusion, and maintenance burden. A strict one-per-function policy ensures the dependency graph is a tree, not a forest.",
  constraint: {
    rule: "Tech stack must enforce unique category assignments. No two deps may share a category.",
    forbids: ["multiple animation libraries", "multiple state managers", "multiple routers"],
    requires: ["tech-stack.ts selection policy"],
  },
  verification: {
    kind: "file-pattern",
    description: "Verify tech-stack manifest enforces unique categories.",
    targets: ["src/modules/core/tech-stack.ts"],
    pattern: "selectionPolicy.*one-per-category",
  },
  version: "1.0.0",
};

const A10_DECLARATIVE: DesignAxiom = {
  "@id": "axiom:DeclarativeOverImperative",
  "@type": "uor:DesignAxiom",
  code: "A10",
  label: "Declarative Over Imperative",
  category: "architecture",
  principle:
    "All system state is described declaratively (JSON-LD blueprints), never constructed imperatively.",
  rationale:
    "Declarative state enables diffing, versioning, auditing, and content-addressing. Imperative construction is opaque to external inspection and cannot be canonicalized.",
  constraint: {
    rule: "System configuration and state must be expressed as serializable JSON-LD objects.",
    forbids: ["imperative state construction without serializable representation"],
    requires: ["JSON-LD @context on state objects", "module.json manifests"],
  },
  verification: {
    kind: "module-manifest",
    description: "Verify all modules have a module.json manifest.",
    targets: ["**/module.json"],
    minCoverage: 0.8,
  },
  version: "1.0.0",
};

const A11_PROTECTIVE_STILLNESS: DesignAxiom = {
  "@id": "axiom:ProtectiveStillness",
  "@type": "uor:DesignAxiom",
  code: "A11",
  label: "Protective Stillness",
  category: "interaction",
  principle:
    "UI reduces visual noise proportional to focus depth. Deep work = less chrome.",
  rationale:
    "Attention is finite. Progressive disclosure of chrome based on task depth respects cognitive load limits. The system should become quieter as the user focuses deeper.",
  constraint: {
    rule: "Focus-mode states must progressively hide non-essential UI elements.",
    requires: ["focus depth tracking", "progressive chrome reduction"],
  },
  verification: {
    kind: "structural",
    description: "Verify focus-mode components reduce visual complexity.",
  },
  version: "1.0.0",
};

const A12_SELF_DECLARING: DesignAxiom = {
  "@id": "axiom:SelfDeclaringSystem",
  "@type": "uor:DesignAxiom",
  code: "A12",
  label: "Self-Declaring System",
  category: "architecture",
  principle:
    "The system describes its own architecture at boot. No hidden configuration.",
  rationale:
    "A self-declaring system can be audited, verified, and understood without external documentation. The tech stack, ontology, and axioms are all queryable at runtime.",
  constraint: {
    rule: "System must expose its full configuration via queryable registries.",
    requires: ["tech-stack manifest", "ontology vocabulary", "axiom registry"],
  },
  verification: {
    kind: "import-analysis",
    description: "Verify self-declaration modules are importable.",
    targets: [
      "src/modules/core/tech-stack.ts",
      "src/modules/ontology/index.ts",
      "src/modules/axioms/index.ts",
    ],
  },
  version: "1.0.0",
};

const A13_GRAPH_FIRST: DesignAxiom = {
  "@id": "axiom:GraphFirstInteraction",
  "@type": "uor:DesignAxiom",
  code: "A13",
  label: "Graph-First Interaction",
  category: "architecture",
  principle:
    "Every user-facing interaction must be anchored as a node in the Sovereign Knowledge Graph.",
  rationale:
    "A knowledge graph-first architecture ensures every interaction, rendering, and application component is traceable, queryable, and composable. The graph IS the operating system — UIs are merely lenses over graph data.",
  constraint: {
    rule: "All user-facing modules must call anchor() to record interactions in the Sovereign Knowledge Graph.",
    forbids: ["user-facing modules without graph anchoring", "opaque state not represented in the graph"],
    requires: ["anchor() calls at key interaction points", "named graph per module"],
  },
  verification: {
    kind: "structural",
    description: "Verify all user-facing modules anchor interactions to the Knowledge Graph via the universal anchor utility.",
    targets: [
      "src/modules/messenger",
      "src/modules/media",
      "src/modules/projects",
      "src/modules/app-store",
      "src/modules/data-bank",
      "src/modules/api-explorer",
      "src/modules/observable",
      "src/modules/auth",
    ],
  },
  "uor:derivedFrom": "uor:GraphTheory",
  "skos:related": ["uor:KnowledgeGraph", "uor:ContentAddressing"],
  version: "1.0.0",
};

const A14_AESTHETIC_COHERENCE: DesignAxiom = {
  "@id": "axiom:AestheticCoherence",
  "@type": "uor:DesignAxiom",
  code: "A14",
  label: "Aesthetic Coherence",
  category: "visual",
  principle:
    "The system must be visually coherent, harmonious, and proportioned — generous whitespace, confident typography, chromatic restraint, and φ-derived spatial rhythm.",
  rationale:
    "Inspired by Algebrica and Aman design languages: monochrome restraint, extreme content hierarchy, φ-proportioned rhythm, and generous negative space. Beauty is not decoration — it is the absence of noise.",
  constraint: {
    rule: "All visual proportions must derive from φ (1.618). Typography, spacing, opacity, and layout follow golden-ratio constants.",
    forbids: [
      "body font < 16px",
      "caption font < 11px",
      "arbitrary spacing outside φ-scale",
      "excessive shadow depths (> 4)",
      "low-contrast text (< 4.5:1)",
      "content measure > 720px",
    ],
    requires: [
      "φ-progression in spacing scale",
      "φ⁻¹ opacity decay hierarchy",
      "φ:1 hero aspect ratio",
      "optical center at 38.2%",
    ],
  },
  verification: {
    kind: "constant-check",
    description:
      "Verify golden-ratio.ts constants satisfy aesthetic coherence: typography minimums, φ-spacing, opacity decay, proportional layout.",
    targets: ["src/modules/desktop/lib/golden-ratio.ts"],
    pattern: "TYPE\\.body.*(?:1[6-9]|[2-9]\\d)",
  },
  "uor:derivedFrom": "uor:GoldenRatio",
  "skos:related": ["uor:VisualDesign", "uor:InformationTheory"],
  version: "1.0.0",
};

// ── All Axioms ───────────────────────────────────────────────────────────

export const ALGEBRICA_AXIOMS: readonly DesignAxiom[] = [
  A1_MONOCHROME_SUBSTRATE,
  A2_GOLDEN_RATIO_RHYTHM,
  A3_PRIME_SPACING,
  A4_CONTENT_ADDRESSED,
  A5_RAW_NUMBERS,
  A6_RADIAL_TOPOLOGY,
  A7_COMPOSITOR_ANIMATION,
  A8_TERMINAL_AESTHETIC,
  A9_ONE_FRAMEWORK,
  A10_DECLARATIVE,
  A11_PROTECTIVE_STILLNESS,
  A12_SELF_DECLARING,
  A13_GRAPH_FIRST,
  A14_AESTHETIC_COHERENCE,
] as const;

// ── CSS Tokens (Algebrica defaults) ──────────────────────────────────────

const ALGEBRICA_TOKENS: Readonly<Record<string, string>> = {
  "--phi": "1.618",
  "--phi-inv": "0.618",
  "--space-xs": "4px",
  "--space-sm": "6px",
  "--space-md": "10px",
  "--space-lg": "16px",
  "--space-xl": "26px",
  "--space-xxl": "42px",
  "--space-xxxl": "68px",
  "--type-caption": "11px",
  "--type-small": "13px",
  "--type-body": "17px",
  "--type-large": "21px",
  "--type-h2": "28px",
  "--type-h1": "44px",
  "--body-max-width": "680px",
  "--optical-center": "38.2%",
};

// ── Algebrica Design System ──────────────────────────────────────────────

export const ALGEBRICA: DesignSystem = {
  "@id": "ds:Algebrica",
  "@type": "uor:DesignSystem",
  label: "Algebrica",
  version: "1.0.0",
  axioms: ALGEBRICA_AXIOMS,
  cssTokens: ALGEBRICA_TOKENS,
};

// ── Active design system (swappable) ─────────────────────────────────────

let activeSystem: DesignSystem = ALGEBRICA;

export function getActiveDesignSystem(): DesignSystem {
  return activeSystem;
}

export function setActiveDesignSystem(system: DesignSystem): void {
  activeSystem = system;
}
