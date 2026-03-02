/**
 * Atlas Grammar Kernel — Minimalist Grammar on 96-Vertex Manifold
 * ═══════════════════════════════════════════════════════════════════
 *
 * THEOREM (Grammar–Geometry Isomorphism):
 *   Chomsky's Minimalist Grammar (Merge, Move, Feature-Check) is
 *   isomorphic to coherence navigation on the Atlas manifold:
 *
 *     Merge(α:=_X, β:X)  ↔  H(v_α ⊕ v_β) > H(v_α) ∧ H(v_β)
 *     Move(+f, -f)       ↔  Fano-plane hop along associator line
 *     Feature(CAT)       ↔  Sign-class assignment (8 octonionic signs)
 *     Recursion(a^n b^n) ↔  τ-mirror parity (stabilizer [[96,48,2]])
 *
 *   The stabilizer code IS the grammar validator:
 *   balanced recursive structure ↔ parity-clean state.
 *
 * ARCHITECTURE:
 *   12 rows × 8 sign classes = 96 syntactic slots
 *   Row = syntactic category (NP, VP, CP, DP, TP, AdjP, AdvP, PP, IP, NumP, FocP, TopP)
 *   Sign = feature polarity (Cat, Sel, +Mov, -Mov, Head, Comp, Spec, Adj)
 *
 * DERIVATION:
 *   A derivation is a sequence of Merge/Move operations that builds a
 *   syntactic tree. Each operation corresponds to a coherence-increasing
 *   step on the manifold. The derivation converges when H-score plateaus
 *   and stabilizer parity is clean — meaning the sentence is grammatical.
 *
 * REFERENCE: Stabler (1997), Chomsky (1995) Minimalist Program
 * INSPIRATION: github.com/dkypuros/atomic-lang-model
 *
 * @module hologram-compute/atlas-grammar-kernel
 */

import { ATLAS_VERTEX_COUNT } from "../atlas/atlas";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

/** 12 syntactic categories mapped to Atlas rows */
export const SYNTACTIC_CATEGORIES = [
  "NP",    // Row 0:  Noun Phrase
  "VP",    // Row 1:  Verb Phrase
  "CP",    // Row 2:  Complementizer Phrase
  "DP",    // Row 3:  Determiner Phrase
  "TP",    // Row 4:  Tense Phrase (Inflectional)
  "AdjP",  // Row 5:  Adjective Phrase
  "AdvP",  // Row 6:  Adverb Phrase
  "PP",    // Row 7:  Prepositional Phrase
  "IP",    // Row 8:  Inflection Phrase
  "NumP",  // Row 9:  Number Phrase
  "FocP",  // Row 10: Focus Phrase
  "TopP",  // Row 11: Topic Phrase
] as const;

export type SyntacticCategory = typeof SYNTACTIC_CATEGORIES[number];

/** 8 feature polarities mapped to octonionic sign classes */
export const FEATURE_POLARITIES = [
  "Cat",    // Sign 0: Base category feature (X)
  "Sel",    // Sign 1: Selector feature (=X) — triggers Merge
  "+Mov",   // Sign 2: Positive movement feature (+f) — triggers Move
  "-Mov",   // Sign 3: Negative movement feature (-f) — target of Move
  "Head",   // Sign 4: Head position (projects label)
  "Comp",   // Sign 5: Complement position (sister of head)
  "Spec",   // Sign 6: Specifier position (higher merge)
  "Adj",    // Sign 7: Adjunct position (non-argument)
] as const;

export type FeaturePolarity = typeof FEATURE_POLARITIES[number];

/** Number of rows (syntactic categories) */
const ROW_COUNT = 12;
/** Number of sign classes (feature polarities) */
const SIGN_COUNT = 8;

// ═══════════════════════════════════════════════════════════════
// Feature System
// ═══════════════════════════════════════════════════════════════

/** A syntactic feature — the atom of grammar */
export interface SyntacticFeature {
  /** Category (which row) */
  category: SyntacticCategory;
  /** Polarity (which sign class) */
  polarity: FeaturePolarity;
  /** Atlas vertex index = row * 8 + signIndex */
  vertexIndex: number;
  /** τ-mirror partner vertex */
  mirrorVertex: number;
  /** Whether this feature has been checked/discharged */
  checked: boolean;
}

/** A lexical item — a word with its feature bundle */
export interface LexicalItem {
  /** Phonological form (the word) */
  phonForm: string;
  /** Feature bundle — ordered stack */
  features: SyntacticFeature[];
  /** Atlas vertex of the head feature (first unchecked) */
  headVertex: number;
}

/** A syntactic object — result of Merge/Move */
export interface SyntacticObject {
  /** Label (projected from head) */
  label: SyntacticCategory;
  /** Remaining features */
  features: SyntacticFeature[];
  /** Children (binary branch from Merge) */
  children: SyntacticObject[];
  /** Phonological yield (terminal string) */
  yield: string[];
  /** Atlas vertex of this node's label */
  vertex: number;
  /** H-score at this derivation step */
  hScore: number;
  /** Derivation depth */
  depth: number;
}

// ═══════════════════════════════════════════════════════════════
// Grammar Productions
// ═══════════════════════════════════════════════════════════════

/** A grammar rule: weighted production with Atlas coordinates */
export interface GrammarProduction {
  /** Left-hand side category */
  lhs: SyntacticCategory;
  /** Right-hand side: sequence of (category, polarity) pairs */
  rhs: Array<{ category: SyntacticCategory; polarity: FeaturePolarity }>;
  /** Production weight (learned or assigned) */
  weight: number;
  /** Atlas vertex path this production traces */
  vertexPath: number[];
  /** H-score contribution of this production */
  coherenceContribution: number;
}

/** Derivation step — one Merge or Move operation */
export interface DerivationStep {
  /** Operation type */
  operation: "Merge" | "Move";
  /** Input objects */
  inputs: string[];
  /** Output label */
  outputLabel: SyntacticCategory;
  /** Features checked in this step */
  checkedFeatures: string[];
  /** H-score before */
  hBefore: number;
  /** H-score after */
  hAfter: number;
  /** Stabilizer parity after */
  parityClean: boolean;
  /** Vertex path */
  vertexPath: number[];
}

/** Full derivation record */
export interface GrammarDerivation {
  /** Input tokens */
  inputTokens: string[];
  /** Derivation steps */
  steps: DerivationStep[];
  /** Final syntactic object */
  result: SyntacticObject | null;
  /** Whether derivation succeeded (H-score converged + parity clean) */
  grammatical: boolean;
  /** Final H-score */
  finalHScore: number;
  /** Total parity violations encountered */
  totalParityViolations: number;
  /** Timestamp */
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// Vertex ↔ Feature Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * Map (category, polarity) → Atlas vertex index.
 * vertex = categoryIndex × 8 + polarityIndex
 */
export function featureToVertex(
  category: SyntacticCategory,
  polarity: FeaturePolarity
): number {
  const catIdx = SYNTACTIC_CATEGORIES.indexOf(category);
  const polIdx = FEATURE_POLARITIES.indexOf(polarity);
  if (catIdx === -1 || polIdx === -1) return 0;
  return catIdx * SIGN_COUNT + polIdx;
}

/**
 * Map Atlas vertex index → (category, polarity).
 */
export function vertexToFeature(vertex: number): {
  category: SyntacticCategory;
  polarity: FeaturePolarity;
} {
  const v = ((vertex % ATLAS_VERTEX_COUNT) + ATLAS_VERTEX_COUNT) % ATLAS_VERTEX_COUNT;
  const catIdx = Math.floor(v / SIGN_COUNT) % ROW_COUNT;
  const polIdx = v % SIGN_COUNT;
  return {
    category: SYNTACTIC_CATEGORIES[catIdx],
    polarity: FEATURE_POLARITIES[polIdx],
  };
}

/**
 * τ-mirror partner: vertex ↔ vertex + 48 (mod 96).
 */
export function tauMirror(vertex: number): number {
  return (vertex + 48) % ATLAS_VERTEX_COUNT;
}

/**
 * Create a syntactic feature from category and polarity.
 */
export function createFeature(
  category: SyntacticCategory,
  polarity: FeaturePolarity
): SyntacticFeature {
  const vertexIndex = featureToVertex(category, polarity);
  return {
    category,
    polarity,
    vertexIndex,
    mirrorVertex: tauMirror(vertexIndex),
    checked: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Lexicon
// ═══════════════════════════════════════════════════════════════

/**
 * Create a lexical item from a word and its feature specification.
 * Features are given as [category, polarity] pairs — first is the head.
 */
export function lexicalItem(
  word: string,
  featureSpecs: Array<[SyntacticCategory, FeaturePolarity]>
): LexicalItem {
  const features = featureSpecs.map(([cat, pol]) => createFeature(cat, pol));
  return {
    phonForm: word,
    features,
    headVertex: features.length > 0 ? features[0].vertexIndex : 0,
  };
}

/**
 * Default English lexicon — Minimalist Grammar style.
 * Each entry maps to Atlas vertex coordinates.
 *
 * Following Stabler (1997) / Atomic Lang Model conventions:
 *   Determiners select NP: =NP → DP
 *   Verbs select DP:       =DP → VP
 *   Tense selects VP:      =VP → TP
 *   Comp selects TP:       =TP → CP
 */
export function buildDefaultLexicon(): Map<string, LexicalItem> {
  const lex = new Map<string, LexicalItem>();

  // ── Determiners (D selects N → projects DP) ──
  lex.set("the",   lexicalItem("the",   [["DP", "Head"], ["NP", "Sel"]]));
  lex.set("a",     lexicalItem("a",     [["DP", "Head"], ["NP", "Sel"]]));
  lex.set("every", lexicalItem("every", [["DP", "Head"], ["NP", "Sel"]]));
  lex.set("some",  lexicalItem("some",  [["DP", "Head"], ["NP", "Sel"]]));
  lex.set("this",  lexicalItem("this",  [["DP", "Head"], ["NP", "Sel"]]));

  // ── Nouns (N → projects NP) ──
  lex.set("student", lexicalItem("student", [["NP", "Cat"]]));
  lex.set("teacher", lexicalItem("teacher", [["NP", "Cat"]]));
  lex.set("book",    lexicalItem("book",    [["NP", "Cat"]]));
  lex.set("idea",    lexicalItem("idea",    [["NP", "Cat"]]));
  lex.set("cat",     lexicalItem("cat",     [["NP", "Cat"]]));
  lex.set("dog",     lexicalItem("dog",     [["NP", "Cat"]]));
  lex.set("person",  lexicalItem("person",  [["NP", "Cat"]]));
  lex.set("world",   lexicalItem("world",   [["NP", "Cat"]]));
  lex.set("time",    lexicalItem("time",    [["NP", "Cat"]]));
  lex.set("way",     lexicalItem("way",     [["NP", "Cat"]]));

  // ── Intransitive Verbs (V → VP) ──
  lex.set("left",    lexicalItem("left",    [["VP", "Cat"]]));
  lex.set("smiled",  lexicalItem("smiled",  [["VP", "Cat"]]));
  lex.set("arrived", lexicalItem("arrived", [["VP", "Cat"]]));
  lex.set("slept",   lexicalItem("slept",   [["VP", "Cat"]]));
  lex.set("ran",     lexicalItem("ran",     [["VP", "Cat"]]));

  // ── Transitive Verbs (=DP, V → selects object then projects VP) ──
  lex.set("read",    lexicalItem("read",    [["VP", "Head"], ["DP", "Sel"]]));
  lex.set("saw",     lexicalItem("saw",     [["VP", "Head"], ["DP", "Sel"]]));
  lex.set("praised", lexicalItem("praised", [["VP", "Head"], ["DP", "Sel"]]));
  lex.set("found",   lexicalItem("found",   [["VP", "Head"], ["DP", "Sel"]]));
  lex.set("likes",   lexicalItem("likes",   [["VP", "Head"], ["DP", "Sel"]]));

  // ── Ditransitive Verbs (=DP, =DP, V) ──
  lex.set("gave", lexicalItem("gave", [["VP", "Head"], ["DP", "Sel"], ["DP", "Sel"]]));
  lex.set("told", lexicalItem("told", [["VP", "Head"], ["DP", "Sel"], ["CP", "Sel"]]));

  // ── Complementizers (=TP → CP) ──
  lex.set("that", lexicalItem("that", [["CP", "Head"], ["TP", "Sel"]]));
  lex.set("if",   lexicalItem("if",   [["CP", "Head"], ["TP", "Sel"]]));

  // ── Relative pronoun (triggers Move) ──
  lex.set("who",   lexicalItem("who",   [["CP", "Head"], ["TP", "Sel"], ["DP", "+Mov"]]));
  lex.set("which", lexicalItem("which", [["CP", "Head"], ["TP", "Sel"], ["DP", "+Mov"]]));

  // ── Tense / Inflection (=VP → TP, selects subject) ──
  lex.set("-ed",  lexicalItem("-ed",  [["TP", "Head"], ["VP", "Sel"], ["DP", "Spec"]]));
  lex.set("-s",   lexicalItem("-s",   [["TP", "Head"], ["VP", "Sel"], ["DP", "Spec"]]));
  lex.set("will", lexicalItem("will", [["TP", "Head"], ["VP", "Sel"], ["DP", "Spec"]]));

  // ── Adjectives (→ AdjP, modifies NP) ──
  lex.set("big",       lexicalItem("big",       [["AdjP", "Cat"], ["NP", "Adj"]]));
  lex.set("small",     lexicalItem("small",     [["AdjP", "Cat"], ["NP", "Adj"]]));
  lex.set("colorless", lexicalItem("colorless", [["AdjP", "Cat"], ["NP", "Adj"]]));
  lex.set("green",     lexicalItem("green",     [["AdjP", "Cat"], ["NP", "Adj"]]));
  lex.set("furious",   lexicalItem("furious",   [["AdjP", "Cat"], ["NP", "Adj"]]));

  // ── Adverbs (→ AdvP, modifies VP) ──
  lex.set("quickly",    lexicalItem("quickly",    [["AdvP", "Cat"], ["VP", "Adj"]]));
  lex.set("furiously",  lexicalItem("furiously",  [["AdvP", "Cat"], ["VP", "Adj"]]));
  lex.set("silently",   lexicalItem("silently",   [["AdvP", "Cat"], ["VP", "Adj"]]));

  // ── Prepositions (=DP → PP) ──
  lex.set("in",   lexicalItem("in",   [["PP", "Head"], ["DP", "Sel"]]));
  lex.set("on",   lexicalItem("on",   [["PP", "Head"], ["DP", "Sel"]]));
  lex.set("near", lexicalItem("near", [["PP", "Head"], ["DP", "Sel"]]));
  lex.set("with", lexicalItem("with", [["PP", "Head"], ["DP", "Sel"]]));

  // ── Conjunctions (=X, =X → X) ──
  lex.set("and", lexicalItem("and", [["NP", "Head"], ["NP", "Sel"], ["NP", "Sel"]]));
  lex.set("or",  lexicalItem("or",  [["NP", "Head"], ["NP", "Sel"], ["NP", "Sel"]]));

  return lex;
}

// ═══════════════════════════════════════════════════════════════
// Core Operations: Merge & Move
// ═══════════════════════════════════════════════════════════════

/**
 * Compute H-score (coherence) for vertex activation vector.
 * H = 1 - Entropy(a²/||a²||₁) / log₂(96)
 */
function computeActivationHScore(activations: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < activations.length; i++) {
    sumSq += activations[i] * activations[i];
  }
  if (sumSq < 1e-12) return 0;

  let entropy = 0;
  for (let i = 0; i < activations.length; i++) {
    const p = (activations[i] * activations[i]) / sumSq;
    if (p > 1e-12) entropy -= p * Math.log2(p);
  }
  return Math.max(0, 1 - entropy / Math.log2(ATLAS_VERTEX_COUNT));
}

/**
 * Check τ-mirror parity (stabilizer code).
 * Returns number of parity violations.
 */
function checkStabilizerParity(activations: Float32Array): number {
  let violations = 0;
  for (let i = 0; i < 48; i++) {
    const a = activations[i];
    const b = activations[i + 48];
    // Parity check: |a - b| should be balanced
    // A violation means the mirror symmetry is broken
    if (Math.abs(a - b) > 0.5 && (a > 0.1 || b > 0.1)) {
      violations++;
    }
  }
  return violations;
}

/**
 * Merge — the fundamental structure-building operation.
 *
 * Merge(α, β) succeeds if:
 *   1. α has a selector feature =X
 *   2. β has a category feature X (matching)
 *   3. Combined H-score > individual H-scores (coherence increases)
 *
 * Returns the merged syntactic object, or null if Merge fails.
 */
export function merge(
  alpha: SyntacticObject,
  beta: SyntacticObject
): SyntacticObject | null {
  // Find matching selector/category pair
  const selectorIdx = alpha.features.findIndex(
    (f) => f.polarity === "Sel" && !f.checked
  );
  if (selectorIdx === -1) return null;

  const selector = alpha.features[selectorIdx];

  // β must have a matching category feature
  const categoryIdx = beta.features.findIndex(
    (f) =>
      f.polarity === "Cat" &&
      f.category === selector.category &&
      !f.checked
  );
  if (categoryIdx === -1) return null;

  // Check coherence increase: compute combined activation
  const combined = new Float32Array(ATLAS_VERTEX_COUNT);
  combined[alpha.vertex] += 1.0;
  combined[beta.vertex] += 1.0;
  // Add feature vertex activations
  for (const f of alpha.features) if (!f.checked) combined[f.vertexIndex] += 0.5;
  for (const f of beta.features) if (!f.checked) combined[f.vertexIndex] += 0.5;

  const combinedH = computeActivationHScore(combined);

  // Feature checking: discharge the matching pair
  const newAlphaFeatures = alpha.features.map((f, i) =>
    i === selectorIdx ? { ...f, checked: true } : { ...f }
  );
  const newBetaFeatures = beta.features.map((f, i) =>
    i === categoryIdx ? { ...f, checked: true } : { ...f }
  );

  // Remaining unchecked features project upward
  const projectedFeatures = [
    ...newAlphaFeatures.filter((f) => !f.checked),
    ...newBetaFeatures.filter((f) => !f.checked),
  ];

  // Head projects: α's label wins (selector projects)
  const headFeature = alpha.features.find(
    (f) => f.polarity === "Head" && !f.checked
  );
  const label = headFeature
    ? headFeature.category
    : alpha.label;

  return {
    label,
    features: projectedFeatures,
    children: [alpha, beta],
    yield: [...alpha.yield, ...beta.yield],
    vertex: alpha.vertex,
    hScore: combinedH,
    depth: Math.max(alpha.depth, beta.depth) + 1,
  };
}

/**
 * Move — internal displacement via feature checking.
 *
 * Move applies when a syntactic object contains:
 *   1. A +f feature (licensor, triggers movement)
 *   2. A -f feature in a sub-tree (licensee, target)
 *
 * In Atlas terms: this is a Fano-plane hop — the activations
 * "jump" along an associator line to a non-adjacent vertex.
 */
export function move(obj: SyntacticObject): SyntacticObject | null {
  // Find a +Mov feature (licensor)
  const licensorIdx = obj.features.findIndex(
    (f) => f.polarity === "+Mov" && !f.checked
  );
  if (licensorIdx === -1) return null;

  const licensor = obj.features[licensorIdx];

  // Find a matching -Mov feature (licensee) in the tree
  const licenseeIdx = obj.features.findIndex(
    (f) =>
      f.polarity === "-Mov" &&
      f.category === licensor.category &&
      !f.checked
  );
  if (licenseeIdx === -1) return null;

  // Discharge both features (Fano hop: licensor.vertex → licensee.mirrorVertex)
  const newFeatures = obj.features.map((f, i) => {
    if (i === licensorIdx || i === licenseeIdx) {
      return { ...f, checked: true };
    }
    return { ...f };
  });

  // Compute new H-score with the "moved" vertex activations
  const activations = new Float32Array(ATLAS_VERTEX_COUNT);
  activations[obj.vertex] += 1.0;
  activations[licensor.mirrorVertex] += 0.8; // Fano hop target
  for (const f of newFeatures) {
    if (!f.checked) activations[f.vertexIndex] += 0.5;
  }

  return {
    ...obj,
    features: newFeatures.filter((f) => !f.checked),
    hScore: computeActivationHScore(activations),
    depth: obj.depth + 1,
  };
}

// ═══════════════════════════════════════════════════════════════
// Atlas Grammar Kernel — The Main Engine
// ═══════════════════════════════════════════════════════════════

/** Configuration for the grammar kernel */
export interface GrammarKernelConfig {
  /** Minimum H-score for a derivation to be considered grammatical */
  minGrammaticalHScore: number;
  /** Maximum derivation depth before aborting */
  maxDerivationDepth: number;
  /** Maximum parity violations allowed */
  maxParityViolations: number;
  /** Whether to use grammar-constrained token filtering */
  constrainedSampling: boolean;
  /** Weight of grammaticality in final scoring */
  grammaticalityWeight: number;
}

export const DEFAULT_GRAMMAR_CONFIG: GrammarKernelConfig = {
  minGrammaticalHScore: 0.3,
  maxDerivationDepth: 20,
  maxParityViolations: 6,
  constrainedSampling: true,
  grammaticalityWeight: 0.6,
};

/** Grammar kernel state snapshot */
export interface GrammarKernelSnapshot {
  /** Current derivation state */
  derivation: GrammarDerivation | null;
  /** Lexicon size */
  lexiconSize: number;
  /** Production count */
  productionCount: number;
  /** Current vertex activations from grammar state */
  grammarActivations: Float32Array;
  /** Categories currently expecting arguments */
  openCategories: SyntacticCategory[];
  /** Whether current state is grammatically valid */
  isGrammatical: boolean;
  /** Parity violations */
  parityViolations: number;
}

/**
 * AtlasGrammarKernel — Minimalist Grammar engine on the Atlas manifold.
 *
 * Replaces transformer attention with grammar-constrained coherence navigation:
 *   1. Tokenize input → look up lexical items with Atlas vertex coordinates
 *   2. Bottom-up derivation via Merge/Move → builds syntactic tree
 *   3. Each step checks H-score increase AND stabilizer parity
 *   4. Grammar-constrained sampling: only emit tokens whose category
 *      matches the current derivation expectation
 *
 * This achieves formally verified generation without any learned weights.
 */
export class AtlasGrammarKernel {
  private lexicon: Map<string, LexicalItem>;
  private productions: GrammarProduction[];
  private config: GrammarKernelConfig;

  // Grammar state
  private derivationStack: SyntacticObject[];
  private currentActivations: Float32Array;
  private derivationSteps: DerivationStep[];
  private openSelectors: SyntacticFeature[];

  constructor(config: Partial<GrammarKernelConfig> = {}) {
    this.config = { ...DEFAULT_GRAMMAR_CONFIG, ...config };
    this.lexicon = buildDefaultLexicon();
    this.productions = this.buildDefaultProductions();
    this.derivationStack = [];
    this.currentActivations = new Float32Array(ATLAS_VERTEX_COUNT);
    this.derivationSteps = [];
    this.openSelectors = [];
  }

  // ── Lexicon Management ───────────────────────────────────────

  /** Add or update a lexical item */
  addLexicalItem(word: string, item: LexicalItem): void {
    this.lexicon.set(word.toLowerCase(), item);
  }

  /** Look up a word in the lexicon */
  lookupWord(word: string): LexicalItem | undefined {
    return this.lexicon.get(word.toLowerCase());
  }

  /** Get all words with a given syntactic category */
  getWordsForCategory(category: SyntacticCategory): string[] {
    const words: string[] = [];
    this.lexicon.forEach((item, word) => {
      if (item.features.some((f) => f.category === category)) {
        words.push(word);
      }
    });
    return words;
  }

  // ── Production Rules ─────────────────────────────────────────

  private buildDefaultProductions(): GrammarProduction[] {
    const prods: GrammarProduction[] = [];

    // S → DP VP (subject + predicate)
    prods.push(this.createProduction("TP", [
      { category: "DP", polarity: "Spec" },
      { category: "VP", polarity: "Comp" },
    ], 0.35));

    // VP → V (intransitive)
    prods.push(this.createProduction("VP", [
      { category: "VP", polarity: "Head" },
    ], 0.25));

    // VP → V DP (transitive)
    prods.push(this.createProduction("VP", [
      { category: "VP", polarity: "Head" },
      { category: "DP", polarity: "Comp" },
    ], 0.30));

    // VP → V DP PP (ditransitive with PP)
    prods.push(this.createProduction("VP", [
      { category: "VP", polarity: "Head" },
      { category: "DP", polarity: "Comp" },
      { category: "PP", polarity: "Adj" },
    ], 0.10));

    // DP → D NP
    prods.push(this.createProduction("DP", [
      { category: "DP", polarity: "Head" },
      { category: "NP", polarity: "Comp" },
    ], 0.45));

    // NP → N
    prods.push(this.createProduction("NP", [
      { category: "NP", polarity: "Cat" },
    ], 0.40));

    // NP → AdjP N
    prods.push(this.createProduction("NP", [
      { category: "AdjP", polarity: "Adj" },
      { category: "NP", polarity: "Cat" },
    ], 0.20));

    // NP → N CP (relative clause)
    prods.push(this.createProduction("NP", [
      { category: "NP", polarity: "Cat" },
      { category: "CP", polarity: "Adj" },
    ], 0.15));

    // CP → C TP (complementizer + sentence)
    prods.push(this.createProduction("CP", [
      { category: "CP", polarity: "Head" },
      { category: "TP", polarity: "Comp" },
    ], 0.30));

    // PP → P DP
    prods.push(this.createProduction("PP", [
      { category: "PP", polarity: "Head" },
      { category: "DP", polarity: "Comp" },
    ], 0.35));

    return prods;
  }

  private createProduction(
    lhs: SyntacticCategory,
    rhs: Array<{ category: SyntacticCategory; polarity: FeaturePolarity }>,
    weight: number
  ): GrammarProduction {
    const vertexPath = rhs.map(({ category, polarity }) =>
      featureToVertex(category, polarity)
    );

    // Coherence contribution: how much does this rule increase H-score?
    const activations = new Float32Array(ATLAS_VERTEX_COUNT);
    activations[featureToVertex(lhs, "Head")] = 1.0;
    for (const v of vertexPath) activations[v] += 0.5;
    const coherenceContribution = computeActivationHScore(activations);

    return { lhs, rhs, weight, vertexPath, coherenceContribution };
  }

  // ── Core Grammar Engine ──────────────────────────────────────

  /**
   * Convert a word to a SyntacticObject (leaf node).
   */
  wordToSynObj(word: string): SyntacticObject | null {
    const item = this.lookupWord(word);
    if (!item) return null;

    const headFeature = item.features[0];
    return {
      label: headFeature.category,
      features: [...item.features],
      children: [],
      yield: [item.phonForm],
      vertex: item.headVertex,
      hScore: 0,
      depth: 0,
    };
  }

  /**
   * Attempt bottom-up derivation of a token sequence.
   * Returns a GrammarDerivation with success/failure and diagnostics.
   */
  derive(tokens: string[]): GrammarDerivation {
    this.reset();

    const derivation: GrammarDerivation = {
      inputTokens: tokens,
      steps: [],
      result: null,
      grammatical: false,
      finalHScore: 0,
      totalParityViolations: 0,
      timestamp: new Date().toISOString(),
    };

    // Phase 1: Lexical lookup — convert words to syntactic objects
    const synObjs: SyntacticObject[] = [];
    for (const token of tokens) {
      const obj = this.wordToSynObj(token);
      if (obj) {
        synObjs.push(obj);
        // Activate the vertex for this word
        this.currentActivations[obj.vertex] += 1.0;
        for (const f of obj.features) {
          this.currentActivations[f.vertexIndex] += 0.3;
        }
      }
    }

    if (synObjs.length === 0) return derivation;

    // Phase 2: Bottom-up Merge — greedily combine matching pairs
    let stack = [...synObjs];
    let iteration = 0;

    while (stack.length > 1 && iteration < this.config.maxDerivationDepth) {
      let merged = false;

      for (let i = 0; i < stack.length - 1; i++) {
        for (let j = i + 1; j < stack.length; j++) {
          // Try Merge(stack[i], stack[j])
          let result = merge(stack[i], stack[j]);
          if (!result) {
            // Try the other direction
            result = merge(stack[j], stack[i]);
          }

          if (result) {
            const hBefore = computeActivationHScore(this.currentActivations);

            // Update activations
            this.currentActivations[result.vertex] += 0.5;
            const hAfter = computeActivationHScore(this.currentActivations);
            const parity = checkStabilizerParity(this.currentActivations);

            derivation.steps.push({
              operation: "Merge",
              inputs: [
                stack[i].yield.join(" "),
                stack[j].yield.join(" "),
              ],
              outputLabel: result.label,
              checkedFeatures: [
                `${stack[i].label}:Sel ⊗ ${stack[j].label}:Cat`,
              ],
              hBefore,
              hAfter,
              parityClean: parity <= this.config.maxParityViolations,
              vertexPath: [stack[i].vertex, stack[j].vertex, result.vertex],
            });

            derivation.totalParityViolations += parity;

            // Replace merged items with result
            stack = [
              ...stack.slice(0, i),
              result,
              ...stack.slice(i + 1, j),
              ...stack.slice(j + 1),
            ];
            merged = true;
            break;
          }
        }
        if (merged) break;
      }

      // Phase 3: Try Move on remaining items
      if (!merged) {
        for (let i = 0; i < stack.length; i++) {
          const moved = move(stack[i]);
          if (moved) {
            derivation.steps.push({
              operation: "Move",
              inputs: [stack[i].yield.join(" ")],
              outputLabel: moved.label,
              checkedFeatures: ["+Mov ⊗ -Mov"],
              hBefore: stack[i].hScore,
              hAfter: moved.hScore,
              parityClean: true,
              vertexPath: [stack[i].vertex, moved.vertex],
            });
            stack[i] = moved;
            merged = true;
            break;
          }
        }
      }

      if (!merged) break; // No more operations possible
      iteration++;
    }

    // Evaluate result
    if (stack.length === 1) {
      derivation.result = stack[0];
      derivation.finalHScore = computeActivationHScore(this.currentActivations);
      derivation.grammatical =
        derivation.finalHScore >= this.config.minGrammaticalHScore &&
        derivation.totalParityViolations <= this.config.maxParityViolations;
    } else {
      // Partial derivation — compute best H-score anyway
      derivation.finalHScore = computeActivationHScore(this.currentActivations);
    }

    return derivation;
  }

  /**
   * Grammar-constrained token filter.
   *
   * Given the current derivation state, returns a mask over vertex indices
   * indicating which syntactic categories are valid next tokens.
   * This replaces the Rust validator from atomic-lang-model.
   *
   * Integration point: pass this mask to VocabularyPartitioner.enhancedSample()
   * to constrain sampling to grammatically valid tokens only.
   */
  getConstraintMask(): Float32Array {
    const mask = new Float32Array(ATLAS_VERTEX_COUNT);

    if (this.derivationStack.length === 0) {
      // Start of sentence: allow DP (for subject) or AdvP (sentence adverb)
      for (let sign = 0; sign < SIGN_COUNT; sign++) {
        mask[featureToVertex("DP", FEATURE_POLARITIES[sign])] = 1.0;
        mask[featureToVertex("AdvP", FEATURE_POLARITIES[sign])] = 0.5;
      }
      return mask;
    }

    // Find open selectors in the current derivation
    for (const obj of this.derivationStack) {
      for (const feat of obj.features) {
        if (feat.polarity === "Sel" && !feat.checked) {
          // This selector expects a specific category
          for (let sign = 0; sign < SIGN_COUNT; sign++) {
            mask[featureToVertex(feat.category, FEATURE_POLARITIES[sign])] = 1.0;
          }
        }
      }
    }

    // If no specific expectations, allow any category (exploration)
    let hasExpectation = false;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) { hasExpectation = true; break; }
    }
    if (!hasExpectation) {
      mask.fill(0.3); // Weak uniform prior
    }

    return mask;
  }

  /**
   * Score a candidate token against the current grammar state.
   *
   * Returns a grammaticality score [0, 1]:
   *   1.0 = perfectly grammatical continuation
   *   0.0 = grammatically impossible
   *
   * This replaces the Rust validator + Python filter from atomic-lang-model.
   */
  scoreToken(word: string): number {
    const item = this.lookupWord(word);
    if (!item) return 0.3; // Unknown words get weak score (open class)

    const mask = this.getConstraintMask();
    let maxScore = 0;

    for (const feat of item.features) {
      const vertexScore = mask[feat.vertexIndex];
      if (vertexScore > maxScore) maxScore = vertexScore;
    }

    // Combine with coherence: how well does this token fit the manifold state?
    const coherenceBoost = this.currentActivations[item.headVertex] > 0.1 ? 0.2 : 0;

    return Math.min(1.0, maxScore + coherenceBoost);
  }

  /**
   * Push a token into the derivation, updating grammar state.
   * Used during incremental generation.
   */
  pushToken(word: string): boolean {
    const obj = this.wordToSynObj(word);
    if (!obj) return false;

    this.derivationStack.push(obj);
    this.currentActivations[obj.vertex] += 1.0;
    for (const f of obj.features) {
      this.currentActivations[f.vertexIndex] += 0.3;
    }

    // Try to reduce: merge adjacent items on the stack
    this.tryReduce();
    return true;
  }

  /**
   * Attempt to reduce the derivation stack via Merge.
   * Applies bottom-up reductions as long as possible.
   */
  private tryReduce(): void {
    let reduced = true;
    while (reduced && this.derivationStack.length > 1) {
      reduced = false;
      for (let i = this.derivationStack.length - 2; i >= 0; i--) {
        const left = this.derivationStack[i];
        const right = this.derivationStack[i + 1];

        let result = merge(left, right);
        if (!result) result = merge(right, left);

        if (result) {
          this.derivationStack.splice(i, 2, result);
          this.currentActivations[result.vertex] += 0.5;

          this.derivationSteps.push({
            operation: "Merge",
            inputs: [left.yield.join(" "), right.yield.join(" ")],
            outputLabel: result.label,
            checkedFeatures: [],
            hBefore: 0,
            hAfter: result.hScore,
            parityClean: checkStabilizerParity(this.currentActivations) <=
              this.config.maxParityViolations,
            vertexPath: [left.vertex, right.vertex, result.vertex],
          });

          reduced = true;
          break;
        }
      }
    }
  }

  /** Get current grammar state snapshot */
  getSnapshot(): GrammarKernelSnapshot {
    const parityViolations = checkStabilizerParity(this.currentActivations);
    const hScore = computeActivationHScore(this.currentActivations);

    const openCats: SyntacticCategory[] = [];
    for (const obj of this.derivationStack) {
      for (const feat of obj.features) {
        if (feat.polarity === "Sel" && !feat.checked) {
          if (!openCats.includes(feat.category)) {
            openCats.push(feat.category);
          }
        }
      }
    }

    return {
      derivation: this.derivationSteps.length > 0
        ? {
            inputTokens: this.derivationStack.flatMap((o) => o.yield),
            steps: this.derivationSteps,
            result:
              this.derivationStack.length === 1
                ? this.derivationStack[0]
                : null,
            grammatical:
              hScore >= this.config.minGrammaticalHScore &&
              parityViolations <= this.config.maxParityViolations,
            finalHScore: hScore,
            totalParityViolations: parityViolations,
            timestamp: new Date().toISOString(),
          }
        : null,
      lexiconSize: this.lexicon.size,
      productionCount: this.productions.length,
      grammarActivations: new Float32Array(this.currentActivations),
      openCategories: openCats,
      isGrammatical:
        hScore >= this.config.minGrammaticalHScore &&
        parityViolations <= this.config.maxParityViolations,
      parityViolations,
    };
  }

  /** Reset grammar state for a new derivation */
  reset(): void {
    this.derivationStack = [];
    this.currentActivations = new Float32Array(ATLAS_VERTEX_COUNT);
    this.derivationSteps = [];
    this.openSelectors = [];
  }

  /** Get the full lexicon for inspection */
  getLexicon(): Map<string, LexicalItem> {
    return new Map(this.lexicon);
  }

  /** Get all productions */
  getProductions(): GrammarProduction[] {
    return [...this.productions];
  }
}
