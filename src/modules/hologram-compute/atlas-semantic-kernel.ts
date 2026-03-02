/**
 * Atlas Semantic Kernel — Meaning as Holographic Interference
 * ════════════════════════════════════════════════════════════
 *
 * Closes the syntax→semantics gap by treating word meaning as a
 * coherence pattern on the 96-vertex Atlas boundary surface.
 *
 * Three operations replace neural semantics:
 *   1. Composition  = Wave interference (constructive → meaningful)
 *   2. Entailment   = Pattern containment (A ⊇ B → A entails B)
 *   3. Contradiction = τ-mirror collision (both halves active)
 *
 * Architecture: 12 Semantic Domains × 8 Thematic Roles = 96 slots
 *
 * @module atlas-semantic-kernel
 */

// ══════════════════════════════════════════════════════════════
// §1  Semantic Type System
// ══════════════════════════════════════════════════════════════

export const SEMANTIC_DOMAINS = [
  "entity", "action", "property", "relation",
  "quantity", "time", "space", "cause",
  "modal", "epistemic", "social", "abstract",
] as const;

export type SemanticDomain = typeof SEMANTIC_DOMAINS[number];

export const THEMATIC_ROLES = [
  "agent", "patient", "theme", "goal",
  "source", "instrument", "experiencer", "beneficiary",
] as const;

export type ThematicRole = typeof THEMATIC_ROLES[number];

export const SEMANTIC_PRIMES = [
  "exist", "same", "other", "part", "whole",
  "move", "change", "begin", "end", "continue",
  "see", "hear", "feel", "think", "know", "want",
  "good", "bad", "big", "small",
  "one", "many", "all", "none",
  "cause", "if", "because", "can",
  "above", "below", "inside", "near", "far",
  "before", "after", "now", "duration",
  "person", "group", "say", "do",
  "true", "not", "and", "or",
] as const;

export type SemanticPrime = typeof SEMANTIC_PRIMES[number];

// ══════════════════════════════════════════════════════════════
// §2  Interfaces
// ══════════════════════════════════════════════════════════════

export interface SemanticSignature {
  readonly label: string;
  readonly activations: Float32Array;
  readonly domain: SemanticDomain;
  readonly defaultRole: ThematicRole;
  readonly primes: ReadonlySet<SemanticPrime>;
  readonly norm: number;
}

export interface CompositionResult {
  readonly signature: SemanticSignature;
  readonly coherence: number;
  readonly constructive: boolean;
  readonly interferenceKind: "constructive" | "neutral" | "destructive";
  readonly overlapCount: number;
  readonly mirrorViolations: number;
}

export interface EntailmentResult {
  readonly entails: boolean;
  readonly coverage: number;
  readonly residualEnergy: number;
  readonly confidence: number;
}

export interface ContradictionResult {
  readonly contradicts: boolean;
  readonly collisionCount: number;
  readonly collisionEnergy: number;
  readonly collisions: readonly [number, number][];
}

export interface SemanticLexEntry {
  readonly word: string;
  readonly domain: SemanticDomain;
  readonly role: ThematicRole;
  readonly primes: SemanticPrime[];
  readonly slots?: readonly [number, number, number][];
}

export interface SemanticKernelConfig {
  readonly coherenceThreshold: number;
  readonly entailmentMinCoverage: number;
  readonly contradictionMinCollisions: number;
  readonly primeScale: number;
}

export const DEFAULT_SEMANTIC_CONFIG: SemanticKernelConfig = {
  coherenceThreshold: 0.3,
  entailmentMinCoverage: 0.7,
  contradictionMinCollisions: 2,
  primeScale: 0.5,
};

export interface SemanticKernelSnapshot {
  readonly lexiconSize: number;
  readonly contextDepth: number;
  readonly currentCoherence: number;
  readonly compositionCount: number;
  readonly contradictionCount: number;
  readonly activeDomains: SemanticDomain[];
  readonly dominantRole: ThematicRole;
}

// ══════════════════════════════════════════════════════════════
// §3  Geometric Utilities
// ══════════════════════════════════════════════════════════════

export function semanticVertex(domain: SemanticDomain, role: ThematicRole): number {
  const d = SEMANTIC_DOMAINS.indexOf(domain);
  const r = THEMATIC_ROLES.indexOf(role);
  if (d < 0 || r < 0) return 0;
  return d * 8 + r;
}

export function vertexSemantics(v: number): { domain: SemanticDomain; role: ThematicRole } {
  const clamped = ((v % 96) + 96) % 96;
  return {
    domain: SEMANTIC_DOMAINS[Math.floor(clamped / 8)],
    role: THEMATIC_ROLES[clamped % 8],
  };
}

function mirrorOf(v: number): number {
  return (v + 48) % 96;
}

function l2Norm(a: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
  return Math.sqrt(sum);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 96; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 1e-12 ? dot / denom : 0;
}

function semanticHScore(sig: Float32Array): number {
  const n = sig.length;
  let sum = 0, max = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.abs(sig[i]);
    sum += v;
    if (v > max) max = v;
  }
  if (sum < 1e-12) return 0;
  const mean = sum / n;
  const concentration = max / (mean + 1e-12);
  return Math.min(1, concentration / n);
}

// ══════════════════════════════════════════════════════════════
// §4  Prime Resonance Map
// ══════════════════════════════════════════════════════════════

const PRIME_RESONANCE: Record<SemanticPrime, [number, number, number][]> = {
  exist:    [[0, 2, 1.0]],
  same:     [[3, 2, 0.8]],
  other:    [[3, 2, 0.6], [3, 1, 0.4]],
  part:     [[0, 2, 0.5], [3, 4, 0.5]],
  whole:    [[0, 2, 0.7], [3, 3, 0.5]],
  move:     [[1, 0, 0.8], [6, 2, 0.5]],
  change:   [[1, 1, 0.7], [1, 2, 0.5]],
  begin:    [[5, 4, 0.8], [1, 2, 0.4]],
  end:      [[5, 3, 0.8], [1, 2, 0.4]],
  continue: [[5, 2, 0.7], [1, 2, 0.5]],
  see:      [[2, 6, 0.8], [6, 2, 0.4]],
  hear:     [[2, 6, 0.7]],
  feel:     [[2, 6, 0.9]],
  think:    [[9, 6, 0.9], [11, 2, 0.3]],
  know:     [[9, 6, 1.0], [9, 2, 0.5]],
  want:     [[8, 6, 0.8], [8, 3, 0.5]],
  good:     [[2, 2, 0.8], [2, 7, 0.4]],
  bad:      [[2, 2, 0.8], [2, 1, 0.5]],
  big:      [[4, 2, 0.7], [2, 2, 0.5]],
  small:    [[4, 2, 0.5], [2, 2, 0.5]],
  one:      [[4, 2, 1.0]],
  many:     [[4, 2, 0.8], [4, 0, 0.3]],
  all:      [[4, 2, 0.9], [4, 3, 0.4]],
  none:     [[4, 2, 0.6], [4, 1, 0.5]],
  cause:    [[7, 0, 0.9], [7, 5, 0.5]],
  if:       [[7, 2, 0.7], [8, 2, 0.5]],
  because:  [[7, 4, 0.8], [7, 2, 0.5]],
  can:      [[8, 0, 0.8], [8, 2, 0.4]],
  above:    [[6, 3, 0.8]],
  below:    [[6, 4, 0.8]],
  inside:   [[6, 2, 0.8], [6, 3, 0.3]],
  near:     [[6, 2, 0.6], [3, 2, 0.4]],
  far:      [[6, 2, 0.6], [3, 1, 0.4]],
  before:   [[5, 4, 0.8], [5, 2, 0.4]],
  after:    [[5, 3, 0.8], [5, 2, 0.4]],
  now:      [[5, 2, 1.0]],
  duration: [[5, 2, 0.7], [4, 2, 0.4]],
  person:   [[10, 0, 0.9], [0, 0, 0.4]],
  group:    [[10, 0, 0.7], [4, 2, 0.4]],
  say:      [[10, 0, 0.7], [1, 0, 0.5]],
  do:       [[1, 0, 0.9]],
  true:     [[9, 2, 1.0], [11, 2, 0.5]],
  not:      [[11, 1, 0.8]],
  and:      [[11, 5, 0.6], [3, 2, 0.4]],
  or:       [[11, 5, 0.5], [8, 2, 0.4]],
};

// ══════════════════════════════════════════════════════════════
// §5  Signature Builder
// ══════════════════════════════════════════════════════════════

export function buildSignature(entry: SemanticLexEntry): SemanticSignature {
  const activations = new Float32Array(96);
  const primaryVertex = semanticVertex(entry.domain, entry.role);
  activations[primaryVertex] = 1.0;

  for (const prime of entry.primes) {
    const resonances = PRIME_RESONANCE[prime];
    if (!resonances) continue;
    for (const [dIdx, rIdx, weight] of resonances) {
      const v = dIdx * 8 + rIdx;
      if (v >= 0 && v < 96) activations[v] += weight * 0.5;
    }
  }

  if (entry.slots) {
    for (const [dIdx, rIdx, weight] of entry.slots) {
      const v = dIdx * 8 + rIdx;
      if (v >= 0 && v < 96) activations[v] = weight;
    }
  }

  const norm = l2Norm(activations);
  if (norm > 1e-12) {
    for (let i = 0; i < 96; i++) activations[i] /= norm;
  }

  return {
    label: entry.word,
    activations,
    domain: entry.domain,
    defaultRole: entry.role,
    primes: new Set(entry.primes),
    norm: l2Norm(activations),
  };
}

// ══════════════════════════════════════════════════════════════
// §6  Composition — Wave Interference
// ══════════════════════════════════════════════════════════════

export function compose(
  a: SemanticSignature,
  b: SemanticSignature,
  compositionRole?: ThematicRole,
): CompositionResult {
  const result = new Float32Array(96);
  let overlapCount = 0;
  let mirrorViolations = 0;

  for (let i = 0; i < 96; i++) {
    result[i] = a.activations[i] + b.activations[i];
    if (Math.abs(a.activations[i]) > 0.1 && Math.abs(b.activations[i]) > 0.1) overlapCount++;
  }

  for (let v = 0; v < 48; v++) {
    const mv = v + 48;
    if (Math.abs(result[v]) > 0.3 && Math.abs(result[mv]) > 0.3) {
      const tension = Math.abs(result[v] - result[mv]);
      if (tension < 0.2) {
        mirrorViolations++;
        result[v] *= 0.5;
        result[mv] *= 0.5;
      }
    }
  }

  const norm = l2Norm(result);
  if (norm > 1e-12) {
    for (let i = 0; i < 96; i++) result[i] /= norm;
  }

  const hBefore = (semanticHScore(a.activations) + semanticHScore(b.activations)) / 2;
  const hAfter = semanticHScore(result);
  const coherence = Math.min(1, Math.max(0, hAfter));

  const composedPrimes = new Set<SemanticPrime>([...a.primes, ...b.primes]);

  let interferenceKind: "constructive" | "neutral" | "destructive";
  if (hAfter > hBefore + 0.05) interferenceKind = "constructive";
  else if (hAfter < hBefore - 0.05) interferenceKind = "destructive";
  else interferenceKind = "neutral";

  let maxDomain = 0, maxDomainIdx = 0;
  for (let d = 0; d < 12; d++) {
    let domainEnergy = 0;
    for (let r = 0; r < 8; r++) domainEnergy += Math.abs(result[d * 8 + r]);
    if (domainEnergy > maxDomain) { maxDomain = domainEnergy; maxDomainIdx = d; }
  }

  const sig: SemanticSignature = {
    label: `(${a.label} ∘ ${b.label})`,
    activations: result,
    domain: SEMANTIC_DOMAINS[maxDomainIdx],
    defaultRole: compositionRole || b.defaultRole,
    primes: composedPrimes,
    norm: l2Norm(result),
  };

  return { signature: sig, coherence, constructive: coherence > 0.3, interferenceKind, overlapCount, mirrorViolations };
}

// ══════════════════════════════════════════════════════════════
// §7  Entailment — Pattern Containment
// ══════════════════════════════════════════════════════════════

export function checkEntailment(
  premise: SemanticSignature,
  conclusion: SemanticSignature,
  threshold: number = 0.1,
): EntailmentResult {
  let covered = 0, total = 0, residual = 0;

  for (let i = 0; i < 96; i++) {
    const bActive = Math.abs(conclusion.activations[i]) > threshold;
    if (bActive) {
      total++;
      if (Math.abs(premise.activations[i]) > threshold * 0.5) covered++;
      else residual += conclusion.activations[i] * conclusion.activations[i];
    }
  }

  const coverage = total > 0 ? covered / total : 1;
  const sim = cosine(premise.activations, conclusion.activations);
  const confidence = Math.min(1, (coverage * 0.6 + Math.max(0, sim) * 0.4));

  return { entails: coverage > 0.7 && sim > 0.2, coverage, residualEnergy: Math.sqrt(residual), confidence };
}

// ══════════════════════════════════════════════════════════════
// §8  Contradiction — τ-Mirror Collision
// ══════════════════════════════════════════════════════════════

export function detectContradiction(
  a: SemanticSignature,
  b: SemanticSignature,
  threshold: number = 0.15,
): ContradictionResult {
  const collisions: [number, number][] = [];
  let energy = 0;

  for (let v = 0; v < 48; v++) {
    const mv = mirrorOf(v);
    const aOnV = Math.abs(a.activations[v]) > threshold;
    const bOnMirror = Math.abs(b.activations[mv]) > threshold;
    const bOnV = Math.abs(b.activations[v]) > threshold;
    const aOnMirror = Math.abs(a.activations[mv]) > threshold;

    if ((aOnV && bOnMirror) || (bOnV && aOnMirror)) {
      const e = Math.min(
        Math.abs(a.activations[v]) + Math.abs(b.activations[mv]),
        Math.abs(b.activations[v]) + Math.abs(a.activations[mv]),
      );
      collisions.push([v, mv]);
      energy += e;
    }
  }

  return { contradicts: collisions.length >= 2 || energy > 0.5, collisionCount: collisions.length, collisionEnergy: energy, collisions };
}

// ══════════════════════════════════════════════════════════════
// §9  Grounded Lexicon
// ══════════════════════════════════════════════════════════════

export const GROUNDED_LEXICON: readonly SemanticLexEntry[] = [
  // Entities
  { word: "thing",     domain: "entity",   role: "theme",       primes: ["exist"] },
  { word: "person",    domain: "social",   role: "agent",       primes: ["person", "exist"] },
  { word: "man",       domain: "social",   role: "agent",       primes: ["person", "exist"] },
  { word: "woman",     domain: "social",   role: "agent",       primes: ["person", "exist"] },
  { word: "child",     domain: "social",   role: "agent",       primes: ["person", "small", "exist"] },
  { word: "animal",    domain: "entity",   role: "agent",       primes: ["exist", "move", "feel"] },
  { word: "body",      domain: "entity",   role: "theme",       primes: ["exist", "part", "whole"] },
  { word: "mind",      domain: "epistemic", role: "theme",      primes: ["think", "know", "feel"] },
  { word: "world",     domain: "space",    role: "theme",       primes: ["exist", "big", "all"] },
  { word: "place",     domain: "space",    role: "theme",       primes: ["exist", "near"] },
  { word: "time",      domain: "time",     role: "theme",       primes: ["duration", "now"] },
  { word: "water",     domain: "entity",   role: "theme",       primes: ["exist", "move"] },
  { word: "fire",      domain: "entity",   role: "agent",       primes: ["exist", "change", "cause"] },
  { word: "word",      domain: "abstract", role: "instrument",  primes: ["say", "exist"] },
  { word: "name",      domain: "abstract", role: "theme",       primes: ["same", "say"] },

  // Actions
  { word: "is",        domain: "relation", role: "theme",       primes: ["exist", "same"] },
  { word: "are",       domain: "relation", role: "theme",       primes: ["exist", "same", "many"] },
  { word: "was",       domain: "relation", role: "theme",       primes: ["exist", "same", "before"] },
  { word: "has",       domain: "relation", role: "agent",       primes: ["exist", "part"] },
  { word: "do",        domain: "action",   role: "agent",       primes: ["do"] },
  { word: "make",      domain: "action",   role: "agent",       primes: ["do", "cause", "exist"] },
  { word: "go",        domain: "action",   role: "agent",       primes: ["move"] },
  { word: "come",      domain: "action",   role: "agent",       primes: ["move", "near"] },
  { word: "move",      domain: "action",   role: "agent",       primes: ["move", "change"] },
  { word: "see",       domain: "action",   role: "experiencer", primes: ["see"] },
  { word: "hear",      domain: "action",   role: "experiencer", primes: ["hear"] },
  { word: "feel",      domain: "action",   role: "experiencer", primes: ["feel"] },
  { word: "think",     domain: "action",   role: "experiencer", primes: ["think"] },
  { word: "know",      domain: "epistemic", role: "experiencer", primes: ["know"] },
  { word: "want",      domain: "modal",    role: "experiencer", primes: ["want"] },
  { word: "say",       domain: "action",   role: "agent",       primes: ["say"] },
  { word: "give",      domain: "action",   role: "agent",       primes: ["do", "move"] },
  { word: "take",      domain: "action",   role: "agent",       primes: ["do", "move"] },
  { word: "live",      domain: "action",   role: "experiencer", primes: ["exist", "continue", "feel"] },
  { word: "die",       domain: "action",   role: "patient",     primes: ["exist", "end"] },
  { word: "begin",     domain: "action",   role: "theme",       primes: ["begin"] },
  { word: "end",       domain: "action",   role: "theme",       primes: ["end"] },
  { word: "change",    domain: "action",   role: "theme",       primes: ["change"] },
  { word: "become",    domain: "action",   role: "patient",     primes: ["change", "exist"] },
  { word: "cause",     domain: "cause",    role: "agent",       primes: ["cause"] },
  { word: "create",    domain: "action",   role: "agent",       primes: ["cause", "exist", "begin"] },
  { word: "destroy",   domain: "action",   role: "agent",       primes: ["cause", "end", "not"] },
  { word: "read",      domain: "action",   role: "experiencer", primes: ["see", "know"] },
  { word: "write",     domain: "action",   role: "agent",       primes: ["do", "say"] },

  // Properties
  { word: "good",      domain: "property", role: "theme",       primes: ["good"] },
  { word: "bad",       domain: "property", role: "theme",       primes: ["bad"] },
  { word: "big",       domain: "property", role: "theme",       primes: ["big"] },
  { word: "small",     domain: "property", role: "theme",       primes: ["small"] },
  { word: "new",       domain: "property", role: "theme",       primes: ["begin", "exist"] },
  { word: "old",       domain: "property", role: "theme",       primes: ["duration", "before"] },
  { word: "true",      domain: "epistemic", role: "theme",      primes: ["true"] },
  { word: "false",     domain: "epistemic", role: "theme",      primes: ["true", "not"] },
  { word: "real",      domain: "epistemic", role: "theme",      primes: ["exist", "true"] },
  { word: "same",      domain: "relation", role: "theme",       primes: ["same"] },
  { word: "other",     domain: "relation", role: "theme",       primes: ["other"] },

  // Quantifiers
  { word: "one",       domain: "quantity", role: "theme",       primes: ["one"] },
  { word: "two",       domain: "quantity", role: "theme",       primes: ["one", "one"] },
  { word: "many",      domain: "quantity", role: "theme",       primes: ["many"] },
  { word: "all",       domain: "quantity", role: "theme",       primes: ["all"] },
  { word: "some",      domain: "quantity", role: "theme",       primes: ["one", "many"] },
  { word: "no",        domain: "quantity", role: "theme",       primes: ["none"] },
  { word: "every",     domain: "quantity", role: "theme",       primes: ["all"] },

  // Spatial
  { word: "here",      domain: "space",   role: "theme",        primes: ["near", "now"] },
  { word: "there",     domain: "space",   role: "goal",         primes: ["far"] },
  { word: "above",     domain: "space",   role: "goal",         primes: ["above"] },
  { word: "below",     domain: "space",   role: "source",       primes: ["below"] },
  { word: "inside",    domain: "space",   role: "theme",        primes: ["inside"] },
  { word: "near",      domain: "space",   role: "theme",        primes: ["near"] },
  { word: "far",       domain: "space",   role: "theme",        primes: ["far"] },

  // Temporal
  { word: "now",       domain: "time",    role: "theme",        primes: ["now"] },
  { word: "before",    domain: "time",    role: "source",       primes: ["before"] },
  { word: "after",     domain: "time",    role: "goal",         primes: ["after"] },
  { word: "always",    domain: "time",    role: "theme",        primes: ["all", "duration"] },
  { word: "never",     domain: "time",    role: "theme",        primes: ["none", "duration"] },

  // Causal & Modal
  { word: "because",   domain: "cause",   role: "source",       primes: ["because"] },
  { word: "if",        domain: "cause",   role: "theme",        primes: ["if"] },
  { word: "can",       domain: "modal",   role: "agent",        primes: ["can"] },
  { word: "must",      domain: "modal",   role: "agent",        primes: ["can", "all"] },
  { word: "maybe",     domain: "modal",   role: "theme",        primes: ["can", "not"] },

  // Logical
  { word: "not",       domain: "abstract", role: "patient",     primes: ["not"] },
  { word: "and",       domain: "abstract", role: "instrument",  primes: ["and"] },
  { word: "or",        domain: "abstract", role: "instrument",  primes: ["or"] },
  { word: "but",       domain: "abstract", role: "instrument",  primes: ["and", "other"] },

  // Determiners & Pronouns
  { word: "the",       domain: "entity",  role: "theme",        primes: ["same", "exist"] },
  { word: "a",         domain: "entity",  role: "theme",        primes: ["one", "exist"] },
  { word: "this",      domain: "entity",  role: "theme",        primes: ["same", "near"] },
  { word: "that",      domain: "entity",  role: "theme",        primes: ["same", "far"] },
  { word: "I",         domain: "social",  role: "agent",        primes: ["person", "same"] },
  { word: "you",       domain: "social",  role: "patient",      primes: ["person", "other"] },
  { word: "we",        domain: "social",  role: "agent",        primes: ["person", "group", "same"] },
  { word: "they",      domain: "social",  role: "agent",        primes: ["person", "group", "other"] },
  { word: "it",        domain: "entity",  role: "theme",        primes: ["exist", "same"] },

  // Abstract / Epistemic
  { word: "truth",     domain: "epistemic", role: "theme",      primes: ["true", "exist"] },
  { word: "reason",    domain: "epistemic", role: "instrument", primes: ["think", "because"] },
  { word: "idea",      domain: "epistemic", role: "theme",      primes: ["think", "exist"] },
  { word: "meaning",   domain: "abstract",  role: "theme",      primes: ["know", "exist", "same"] },
  { word: "nature",    domain: "entity",    role: "theme",       primes: ["exist", "whole", "cause"] },
  { word: "consciousness", domain: "epistemic", role: "theme",  primes: ["think", "feel", "know", "exist"] },
  { word: "reality",   domain: "epistemic", role: "theme",      primes: ["exist", "true", "all"] },
  { word: "mathematics", domain: "abstract", role: "theme",     primes: ["true", "same", "all"] },
  { word: "language",  domain: "abstract",  role: "instrument", primes: ["say", "know", "same"] },
  { word: "coherence", domain: "abstract",  role: "theme",      primes: ["same", "whole", "good", "true"] },
];

// ══════════════════════════════════════════════════════════════
// §10  Atlas Semantic Kernel — Main Class
// ══════════════════════════════════════════════════════════════

export class AtlasSemanticKernel {
  private readonly config: SemanticKernelConfig;
  private readonly signatures = new Map<string, SemanticSignature>();
  private readonly contextStack: SemanticSignature[] = [];
  private compositionCount = 0;
  private contradictionCount = 0;

  constructor(config: Partial<SemanticKernelConfig> = {}) {
    this.config = { ...DEFAULT_SEMANTIC_CONFIG, ...config };
    this.loadLexicon(GROUNDED_LEXICON);
  }

  loadLexicon(entries: readonly SemanticLexEntry[]): void {
    for (const entry of entries) {
      this.signatures.set(entry.word.toLowerCase(), buildSignature(entry));
    }
  }

  lookup(word: string): SemanticSignature | undefined {
    return this.signatures.get(word.toLowerCase());
  }

  infer(word: string): SemanticSignature {
    const existing = this.lookup(word);
    if (existing) return existing;

    const lower = word.toLowerCase();
    const domain = this.inferDomain(lower);
    const role = this.inferRole(lower);

    const entry: SemanticLexEntry = { word: lower, domain, role, primes: ["exist"] };
    const sig = buildSignature(entry);

    if (this.contextStack.length > 0) {
      const ctx = this.contextStack[this.contextStack.length - 1];
      for (let i = 0; i < 96; i++) {
        (sig.activations as Float32Array)[i] = sig.activations[i] * 0.7 + ctx.activations[i] * 0.3;
      }
      const norm = l2Norm(sig.activations);
      if (norm > 1e-12) {
        for (let i = 0; i < 96; i++) (sig.activations as Float32Array)[i] /= norm;
      }
    }

    this.signatures.set(lower, sig);
    return sig;
  }

  composeWords(a: string, b: string): CompositionResult {
    return this.composeSignatures(this.infer(a), this.infer(b));
  }

  composeSignatures(a: SemanticSignature, b: SemanticSignature): CompositionResult {
    const result = compose(a, b);
    this.compositionCount++;
    if (result.mirrorViolations > 0) this.contradictionCount += result.mirrorViolations;
    this.contextStack.push(result.signature);
    if (this.contextStack.length > 32) this.contextStack.shift();
    return result;
  }

  entails(a: string, b: string): EntailmentResult {
    return checkEntailment(this.infer(a), this.infer(b));
  }

  contradicts(a: string, b: string): ContradictionResult {
    return detectContradiction(this.infer(a), this.infer(b));
  }

  scoreToken(word: string): number {
    const sig = this.infer(word);
    if (this.contextStack.length === 0) return 0.5;

    const recentCtx = this.contextStack.slice(-3);
    let totalScore = 0;

    for (const ctx of recentCtx) {
      const sim = cosine(sig.activations, ctx.activations);
      const contradiction = detectContradiction(sig, ctx);
      let s = (sim + 1) / 2;
      if (contradiction.contradicts) s *= 0.1;
      totalScore += s;
    }

    return totalScore / recentCtx.length;
  }

  getSemanticMask(): Float32Array {
    const mask = new Float32Array(96).fill(0.5);
    if (this.contextStack.length === 0) return mask;

    const ctx = this.contextStack[this.contextStack.length - 1];

    for (let i = 0; i < 96; i++) {
      if (Math.abs(ctx.activations[i]) > 0.1) {
        const domain = Math.floor(i / 8);
        for (let r = 0; r < 8; r++) {
          const v = domain * 8 + r;
          mask[v] = Math.min(1.0, mask[v] + 0.2);
        }
        const role = i % 8;
        const complement = [1, 0, 3, 2, 5, 4, 7, 6][role];
        for (let d = 0; d < 12; d++) {
          mask[d * 8 + complement] = Math.min(1.0, mask[d * 8 + complement] + 0.15);
        }
      }
    }

    for (let v = 0; v < 48; v++) {
      if (Math.abs(ctx.activations[v]) > 0.3) mask[v + 48] *= 0.3;
      if (Math.abs(ctx.activations[v + 48]) > 0.3) mask[v] *= 0.3;
    }

    return mask;
  }

  resetContext(): void { this.contextStack.length = 0; }

  pushContext(sig: SemanticSignature): void {
    this.contextStack.push(sig);
    if (this.contextStack.length > 32) this.contextStack.shift();
  }

  getCurrentContext(): SemanticSignature | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  getSnapshot(): SemanticKernelSnapshot {
    const ctx = this.getCurrentContext();
    const activeDomains = new Set<SemanticDomain>();

    if (ctx) {
      for (let d = 0; d < 12; d++) {
        let energy = 0;
        for (let r = 0; r < 8; r++) energy += Math.abs(ctx.activations[d * 8 + r]);
        if (energy > 0.3) activeDomains.add(SEMANTIC_DOMAINS[d]);
      }
    }

    let maxRole = 0, maxRoleIdx = 0;
    if (ctx) {
      for (let r = 0; r < 8; r++) {
        let roleEnergy = 0;
        for (let d = 0; d < 12; d++) roleEnergy += Math.abs(ctx.activations[d * 8 + r]);
        if (roleEnergy > maxRole) { maxRole = roleEnergy; maxRoleIdx = r; }
      }
    }

    return {
      lexiconSize: this.signatures.size,
      contextDepth: this.contextStack.length,
      currentCoherence: ctx ? semanticHScore(ctx.activations) : 0,
      compositionCount: this.compositionCount,
      contradictionCount: this.contradictionCount,
      activeDomains: [...activeDomains],
      dominantRole: THEMATIC_ROLES[maxRoleIdx],
    };
  }

  getLexicon(): ReadonlyMap<string, SemanticSignature> { return this.signatures; }

  private inferDomain(word: string): SemanticDomain {
    if (word.endsWith("tion") || word.endsWith("ment") || word.endsWith("ness")) return "abstract";
    if (word.endsWith("ing")) return "action";
    if (word.endsWith("ed")) return "action";
    if (word.endsWith("ly")) return "property";
    if (word.endsWith("ful") || word.endsWith("less") || word.endsWith("ous")) return "property";
    if (word.endsWith("er") || word.endsWith("or") || word.endsWith("ist")) return "social";
    if (word.endsWith("ity") || word.endsWith("ism")) return "abstract";
    return "entity";
  }

  private inferRole(word: string): ThematicRole {
    if (word.endsWith("er") || word.endsWith("or") || word.endsWith("ist")) return "agent";
    if (word.endsWith("ee")) return "patient";
    if (word.endsWith("ly")) return "instrument";
    if (word.endsWith("ward") || word.endsWith("wards")) return "goal";
    return "theme";
  }
}
