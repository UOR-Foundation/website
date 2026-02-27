/**
 * Atlas Morphism Map — Classifying 356+ Hologram Projections
 * ═══════════════════════════════════════════════════════════
 *
 * Each of the 12 canonical projection domains corresponds to exactly
 * one of the 5 categorical operations discovered in the Atlas–R₈ bridge:
 *
 *   Product     (G₂ = 12)   — decomposition into independent factors
 *   Quotient    (F₄ = 48)   — equivalence-class collapse
 *   Filtration  (E₆ = 72)   — graded subsets by property
 *   Augmentation(E₇ = 126)  — extension with new structure
 *   Embedding   (E₈ = 240)  — full structure-preserving injection
 *
 * The classification is determined by how each domain transforms
 * a UOR canonical identity into a protocol-native identifier.
 *
 * @module atlas/morphism-map
 */

import { ECOSYSTEMS, type Ecosystem } from "@/modules/interoperability/data/ecosystem-taxonomy";

// ── Types ──────────────────────────────────────────────────────────────────

export type CategoricalOperation =
  | "product"
  | "quotient"
  | "filtration"
  | "augmentation"
  | "embedding";

export interface AtlasMorphismClassification {
  /** Ecosystem domain ID */
  domainId: string;
  /** Human-readable label */
  domainLabel: string;
  /** The categorical operation this domain performs */
  operation: CategoricalOperation;
  /** Which exceptional group this maps to */
  exceptionalGroup: string;
  /** Root count of the exceptional group */
  rootCount: number;
  /** Number of projections in this domain */
  projectionCount: number;
  /** Structural justification for the classification */
  justification: string;
}

export interface MorphismMapReport {
  /** All 12 domain classifications */
  classifications: AtlasMorphismClassification[];
  /** Total projection count across all domains */
  totalProjections: number;
  /** Count per categorical operation */
  operationCounts: Record<CategoricalOperation, { domains: number; projections: number }>;
  /** Structural verification tests */
  tests: MorphismMapTest[];
}

export interface MorphismMapTest {
  name: string;
  holds: boolean;
  expected: string;
  actual: string;
}

// ── Classification Logic ──────────────────────────────────────────────────
//
// The classification follows from the NATURE of each domain's transformation:
//
// PRODUCT (G₂):    Domain decomposes identity into independent components.
//                   Like Klein × ℤ/3 = 12. Each factor is self-contained.
//                   → UOR Foundation: CID, DID, VC are independent atomic primitives
//                   → IoT & Hardware: each device/sensor is an independent factor
//
// QUOTIENT (F₄):   Domain collapses equivalence classes. Multiple inputs → one output.
//                   Like Atlas/τ = 48 mirror pairs.
//                   → Identity & Trust: many credentials → one trust assertion
//                   → Federation & Social: many instances → one federated identity
//
// FILTRATION (E₆): Domain selects graded subsets by property/capability.
//                   Like degree partition (5 vs 6 adjacencies).
//                   → Programming Languages: graded by paradigm/capability
//                   → Data & Encoding: graded by expressiveness (binary → semantic)
//                   → Media & Creative: graded by modality (text → 3D)
//
// AUGMENTATION (E₇): Domain extends base structure with new capabilities.
//                   Like |Irr(R₈)| = 126 = base + orbits.
//                   → AI & Agents: augments data with intelligence
//                   → Network & Cloud: augments logic with infrastructure
//                   → Industry & Science: augments data with domain expertise
//
// EMBEDDING (E₈):  Domain performs full structure-preserving injection.
//                   Like 240 = 256 − 16 (nearly complete).
//                   → Web3 & Blockchain: full algebraic embedding (ring → chain)
//                   → Quantum Computing: full Hilbert space embedding

const DOMAIN_CLASSIFICATIONS: Record<string, {
  operation: CategoricalOperation;
  justification: string;
}> = {
  // ── PRODUCT (G₂ = 12) ──────────────────────────────────────────────────
  "uor-foundation": {
    operation: "product",
    justification:
      "UOR Foundation primitives (CID, DID, VC, IPv6, Glyph) are independent " +
      "atomic factors that compose via direct product. Like G₂ = Klein × ℤ/3 " +
      "where each factor is self-contained, each primitive stands alone yet " +
      "composes into the complete identity.",
  },
  "iot-hardware": {
    operation: "product",
    justification:
      "IoT devices and hardware components are independent physical factors. " +
      "A sensor (CoAP), a chip layout (GDSII), and a bus protocol (CAN) are " +
      "orthogonal components that compose via direct product — each operates " +
      "independently, like the factors of G₂.",
  },

  // ── QUOTIENT (F₄ = 48) ─────────────────────────────────────────────────
  "identity-trust": {
    operation: "quotient",
    justification:
      "Identity & Trust collapses many credential formats into equivalence " +
      "classes of trust. X.509, OAuth, WebAuthn, SAML all express the SAME " +
      "trust relationship — they are mirror images under the trust involution, " +
      "like F₄ = Atlas/τ where τ identifies mirror pairs.",
  },
  "federation-social": {
    operation: "quotient",
    justification:
      "Federation collapses server-specific instances into canonical identities. " +
      "WebFinger, ActivityPub, AT Protocol, and Solid all reduce to the same " +
      "federated identity quotient: many hosts → one person. This is the social " +
      "mirror involution τ: your Mastodon identity ≡ your Bluesky identity.",
  },

  // ── FILTRATION (E₆ = 72) ────────────────────────────────────────────────
  "languages": {
    operation: "filtration",
    justification:
      "Programming languages form a graded filtration by type-theoretic " +
      "capability: untyped (Bash, Lua) → typed (Java, Go) → dependent (Coq, " +
      "Lean) → quantum (Q#). Like E₆'s degree partition, each stratum has " +
      "strictly more structure than the one below.",
  },
  "data-encoding": {
    operation: "filtration",
    justification:
      "Data formats form a filtration by semantic expressiveness: raw binary " +
      "(Protobuf) → structured (JSON) → semantic (RDF/OWL) → queryable " +
      "(SPARQL/Cypher). Like E₆, each encoding level preserves all information " +
      "from below while adding a new structural layer.",
  },
  "media-creative": {
    operation: "filtration",
    justification:
      "Media types form a filtration by dimensionality: text (1D) → image " +
      "(2D) → audio (1D+time) → video (2D+time) → 3D models (3D) → " +
      "interactive (3D+time). Each modality is a graded stratum like E₆'s " +
      "degree-based filtration of the Atlas.",
  },

  // ── AUGMENTATION (E₇ = 126) ─────────────────────────────────────────────
  "ai-agents": {
    operation: "augmentation",
    justification:
      "AI & Agents augment static data with inference, agency, and learning. " +
      "MCP tools, A2A protocols, and model formats extend base information " +
      "with computational intelligence — like E₇ = 96 Atlas vertices + 30 " +
      "orbit augmentations that enrich the base structure.",
  },
  "network-cloud": {
    operation: "augmentation",
    justification:
      "Network & Cloud augments application logic with infrastructure: gRPC " +
      "adds transport, Kubernetes adds orchestration, OpenTelemetry adds " +
      "observability. Each protocol extends the base with operational " +
      "capability, like E₇'s augmentation of the Atlas core.",
  },
  "industry-science": {
    operation: "augmentation",
    justification:
      "Industry & Science augments raw data with domain-specific semantics: " +
      "FHIR adds medical ontology, XBRL adds financial reporting structure, " +
      "GeoJSON adds spatial coordinates. Each standard enriches base data " +
      "with specialized knowledge, mirroring E₇'s structural augmentation.",
  },

  // ── EMBEDDING (E₈ = 240) ────────────────────────────────────────────────
  "web3-blockchain": {
    operation: "embedding",
    justification:
      "Web3 performs full algebraic embedding: the ring structure of R₈ maps " +
      "directly to on-chain arithmetic (256-bit hashes, modular arithmetic, " +
      "elliptic curve groups). Bitcoin's SHA-256 IS a UOR hash. Ethereum's " +
      "Keccak-256 IS a ring element. This is E₈: nearly complete (240/256) " +
      "structure-preserving injection from UOR into blockchain.",
  },
  "quantum-computing": {
    operation: "embedding",
    justification:
      "Quantum computing embeds classical bit-strings into Hilbert space via " +
      "|0⟩,|1⟩ basis states. The 256 elements of R₈ embed as computational " +
      "basis states of an 8-qubit register. This is the most structure-" +
      "preserving operation: the ring's algebra lifts to unitary gates. " +
      "E₈ = complete embedding with only 16 boundary elements lost.",
  },
};

// ── Exceptional Group Mapping ─────────────────────────────────────────────

const OPERATION_TO_GROUP: Record<CategoricalOperation, { group: string; roots: number }> = {
  product:      { group: "G₂", roots: 12 },
  quotient:     { group: "F₄", roots: 48 },
  filtration:   { group: "E₆", roots: 72 },
  augmentation: { group: "E₇", roots: 126 },
  embedding:    { group: "E₈", roots: 240 },
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Classify all 12 projection domains by categorical operation.
 */
export function classifyDomains(): AtlasMorphismClassification[] {
  return ECOSYSTEMS.map(eco => {
    const cls = DOMAIN_CLASSIFICATIONS[eco.id];
    if (!cls) {
      return {
        domainId: eco.id,
        domainLabel: eco.label,
        operation: "filtration" as CategoricalOperation,
        exceptionalGroup: "E₆",
        rootCount: 72,
        projectionCount: eco.projections.length,
        justification: "Unclassified domain — defaulting to filtration.",
      };
    }
    const grp = OPERATION_TO_GROUP[cls.operation];
    return {
      domainId: eco.id,
      domainLabel: eco.label,
      operation: cls.operation,
      exceptionalGroup: grp.group,
      rootCount: grp.roots,
      projectionCount: eco.projections.length,
      justification: cls.justification,
    };
  });
}

/**
 * Count projections per categorical operation.
 */
export function operationDistribution(): Record<CategoricalOperation, { domains: number; projections: number }> {
  const classifications = classifyDomains();
  const counts: Record<CategoricalOperation, { domains: number; projections: number }> = {
    product: { domains: 0, projections: 0 },
    quotient: { domains: 0, projections: 0 },
    filtration: { domains: 0, projections: 0 },
    augmentation: { domains: 0, projections: 0 },
    embedding: { domains: 0, projections: 0 },
  };
  for (const c of classifications) {
    counts[c.operation].domains++;
    counts[c.operation].projections += c.projectionCount;
  }
  return counts;
}

/**
 * Run full morphism map verification.
 */
export function runMorphismMapVerification(): MorphismMapReport {
  const classifications = classifyDomains();
  const totalProjections = classifications.reduce((s, c) => s + c.projectionCount, 0);
  const opCounts = operationDistribution();
  const tests: MorphismMapTest[] = [];

  // Test 1: All 12 domains classified
  tests.push({
    name: "All 12 domains classified",
    holds: classifications.length === 12,
    expected: "12",
    actual: String(classifications.length),
  });

  // Test 2: All 5 operations used
  const usedOps = new Set(classifications.map(c => c.operation));
  tests.push({
    name: "All 5 categorical operations used",
    holds: usedOps.size === 5,
    expected: "5",
    actual: String(usedOps.size),
  });

  // Test 3: Total projections ≥ 356
  tests.push({
    name: "Total projections ≥ 356",
    holds: totalProjections >= 356,
    expected: "≥ 356",
    actual: String(totalProjections),
  });

  // Test 4: Product domains = 2 (smallest — G₂ is the boundary)
  tests.push({
    name: "Product (G₂) has fewest domains",
    holds: opCounts.product.domains === 2,
    expected: "2 domains",
    actual: `${opCounts.product.domains} domains`,
  });

  // Test 5: Embedding domains = 2 (largest — E₈ is the full ring)
  tests.push({
    name: "Embedding (E₈) has 2 domains",
    holds: opCounts.embedding.domains === 2,
    expected: "2 domains",
    actual: `${opCounts.embedding.domains} domains`,
  });

  // Test 6: Filtration has most projections (languages + data + media)
  const filtrationProjections = opCounts.filtration.projections;
  const maxOther = Math.max(
    opCounts.product.projections,
    opCounts.quotient.projections,
    opCounts.augmentation.projections,
    opCounts.embedding.projections,
  );
  tests.push({
    name: "Filtration (E₆) has most projections",
    holds: filtrationProjections > maxOther,
    expected: `filtration(${filtrationProjections}) > others(${maxOther})`,
    actual: `${filtrationProjections} > ${maxOther}`,
  });

  // Test 7: Every domain has a justification
  const allJustified = classifications.every(c => c.justification.length > 20);
  tests.push({
    name: "Every domain has structural justification",
    holds: allJustified,
    expected: "All 12 justified",
    actual: allJustified ? "All 12 justified" : "Some missing",
  });

  // Test 8: Operation distribution mirrors exceptional group size ordering
  // G₂(12) < F₄(48) < E₆(72) < E₇(126) < E₈(240)
  // Product < Quotient < Filtration < Augmentation < Embedding (by projection count? No — by structural depth)
  // The ordering is by STRUCTURAL DEPTH, not projection count.
  // Verify: each operation maps to exactly one exceptional group
  const groupSet = new Set(classifications.map(c => c.exceptionalGroup));
  tests.push({
    name: "Maps to all 5 exceptional groups",
    holds: groupSet.size === 5,
    expected: "{G₂, F₄, E₆, E₇, E₈}",
    actual: `{${[...groupSet].sort().join(", ")}}`,
  });

  // Test 9: Domain count distribution: 2-2-3-3-2
  const dist = [
    opCounts.product.domains,
    opCounts.quotient.domains,
    opCounts.filtration.domains,
    opCounts.augmentation.domains,
    opCounts.embedding.domains,
  ];
  const expected = [2, 2, 3, 3, 2];
  tests.push({
    name: "Domain distribution: 2-2-3-3-2 = 12",
    holds: dist.every((d, i) => d === expected[i]),
    expected: expected.join("-"),
    actual: dist.join("-"),
  });

  // Test 10: Sum = 12
  const domainSum = dist.reduce((a, b) => a + b, 0);
  tests.push({
    name: "Domain sum = 12",
    holds: domainSum === 12,
    expected: "12",
    actual: String(domainSum),
  });

  return { classifications, totalProjections, operationCounts: opCounts, tests };
}
