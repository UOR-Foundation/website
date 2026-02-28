/**
 * Categorical Quantum Circuit Compiler
 * ═════════════════════════════════════
 *
 * Takes a sequence of Atlas morphisms, decomposes them into categorical
 * primitives (cup/cap/dagger/identity/compose), then optimizes the
 * resulting circuit using the rewrite chain engine.
 *
 * COMPILATION PIPELINE:
 *   1. PARSE:      Sequence of vertex pairs → Morphism[]
 *   2. DECOMPOSE:  Each morphism → categorical primitives (cup, cap, †, id, ∘)
 *   3. OPTIMIZE:   Apply rewrite chain to minimize gate count
 *   4. EMIT:       Output optimized circuit as gate sequence
 *
 * CATEGORICAL PRIMITIVES:
 *   - Identity:    id_A : A → A
 *   - Compose:     g ∘ f : A → C  (from f: A→B, g: B→C)
 *   - Dagger:      f† : B → A     (from f: A→B)
 *   - Cup (η):     I → A ⊗ A*     (Bell state creation)
 *   - Cap (ε):     A ⊗ A* → I     (Bell state annihilation)
 *
 * OPTIMIZATION RULES (categorical identities):
 *   - Snake: (id⊗ε)∘(η⊗id) = id  (zigzag elimination)
 *   - Dagger cancel: f†∘f = id when f is unitary
 *   - Identity elimination: id∘f = f∘id = f
 *   - Cup-cap fusion: adjacent η-ε on same object cancel
 *
 * @module atlas/categorical-compiler
 */

import {
  type Morphism,
  type CupMorphism,
  type CapMorphism,
  dagger,
  daggerMorphism,
  composeMorphisms,
  identityMorphism,
  findMorphism,
  constructCups,
  constructCaps,
} from "./dagger-compact";

import {
  findOptimalChain,
  rewriteCircuit,
  CLIFFORD_T_SET,
  CLIFFORD_SET,
  PAULI_SET,
  type RewriteChain,
  type CircuitRewritePlan,
} from "./rewrite-chain";

import {
  mapVerticesToGates,
  type QuantumGate,
  type VertexGateMapping,
} from "./quantum-isa";

import { ATLAS_VERTEX_COUNT } from "./atlas";

// ══════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════

/** Categorical primitive type. */
export type PrimitiveKind = "identity" | "compose" | "dagger" | "cup" | "cap" | "edge";

/** A single categorical primitive in the decomposition. */
export interface CategoricalPrimitive {
  /** Primitive type. */
  readonly kind: PrimitiveKind;
  /** Source vertex (or -1 for cup/cap from unit). */
  readonly source: number;
  /** Target vertex (or -1 for cup/cap to unit). */
  readonly target: number;
  /** For compose: the intermediate vertex. */
  readonly intermediate?: number;
  /** For cup/cap: the mirror pair object. */
  readonly pairObject?: number;
  /** For dagger: the original morphism being daggered. */
  readonly originalSource?: number;
  /** For dagger: the original morphism target. */
  readonly originalTarget?: number;
  /** Human-readable label. */
  readonly label: string;
  /** Depth in the decomposition tree. */
  readonly depth: number;
}

/** A decomposed morphism: the original + its categorical primitives. */
export interface DecomposedMorphism {
  /** Original morphism. */
  readonly morphism: Morphism;
  /** Categorical primitives (in execution order). */
  readonly primitives: CategoricalPrimitive[];
  /** Total primitive count. */
  readonly primitiveCount: number;
  /** Whether this morphism involves a dagger (mirror crossing). */
  readonly involvesDagger: boolean;
  /** Whether this morphism can be expressed as cup-cap (Bell teleportation). */
  readonly isTeleportation: boolean;
}

/** An optimized gate in the output circuit. */
export interface CompiledGate {
  /** Gate from the quantum ISA. */
  readonly gate: QuantumGate;
  /** Atlas vertex this gate corresponds to. */
  readonly vertex: number;
  /** Position in the circuit (time step). */
  readonly timeStep: number;
  /** Whether this gate resulted from a rewrite (not original). */
  readonly isRewritten: boolean;
  /** Rewrite chain length (0 if trivial/not rewritten). */
  readonly rewriteDepth: number;
}

/** The complete compilation result. */
export interface CompilationResult {
  /** Input: sequence of morphisms. */
  readonly inputMorphisms: Morphism[];
  /** Decomposition into categorical primitives. */
  readonly decomposition: DecomposedMorphism[];
  /** Total primitives before optimization. */
  readonly totalPrimitives: number;
  /** Optimized output circuit. */
  readonly outputCircuit: CompiledGate[];
  /** Target gate set used for optimization. */
  readonly targetGateSet: string;
  /** Rewrite plan from the rewrite chain engine. */
  readonly rewritePlan: CircuitRewritePlan;
  /** Optimization statistics. */
  readonly stats: CompilationStats;
  /** Human-readable summary. */
  readonly summary: string;
}

/** Compilation statistics. */
export interface CompilationStats {
  /** Number of input morphisms. */
  readonly inputMorphismCount: number;
  /** Total edge steps across all morphisms. */
  readonly totalEdgeSteps: number;
  /** Total categorical primitives generated. */
  readonly totalPrimitives: number;
  /** Primitives by kind. */
  readonly primitivesByKind: Record<PrimitiveKind, number>;
  /** Number of dagger operations. */
  readonly daggerCount: number;
  /** Number of cup operations (Bell creations). */
  readonly cupCount: number;
  /** Number of cap operations (Bell annihilations). */
  readonly capCount: number;
  /** Gates before optimization. */
  readonly gatesBefore: number;
  /** Gates after optimization (rewrite). */
  readonly gatesAfter: number;
  /** Optimization ratio (gatesAfter / gatesBefore). */
  readonly optimizationRatio: number;
  /** Snake eliminations applied. */
  readonly snakeEliminations: number;
  /** Dagger cancellations applied. */
  readonly daggerCancellations: number;
  /** Identity eliminations applied. */
  readonly identityEliminations: number;
}

// ══════════════════════════════════════════════════════════════════════════
// Step 1: Parse — build morphisms from vertex pairs
// ══════════════════════════════════════════════════════════════════════════

/**
 * Parse a sequence of (source, target) vertex pairs into Morphisms.
 * Uses BFS pathfinding from dagger-compact module.
 */
export function parseMorphisms(pairs: [number, number][]): Morphism[] {
  return pairs.map(([s, t]) => {
    const m = findMorphism(s, t);
    if (!m) throw new Error(`No path from vertex ${s} to ${t}`);
    return m;
  });
}

/**
 * Parse a chain of vertices [v0, v1, v2, ...] into consecutive morphisms.
 */
export function parseChain(vertices: number[]): Morphism[] {
  const morphisms: Morphism[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const m = findMorphism(vertices[i], vertices[i + 1]);
    if (!m) throw new Error(`No path from vertex ${vertices[i]} to ${vertices[i + 1]}`);
    morphisms.push(m);
  }
  return morphisms;
}

// ══════════════════════════════════════════════════════════════════════════
// Step 2: Decompose — morphisms → categorical primitives
// ══════════════════════════════════════════════════════════════════════════

/**
 * Decompose a single morphism into categorical primitives.
 *
 * Strategy:
 * 1. Identity morphisms → single identity primitive
 * 2. Single-edge morphisms → single edge primitive
 * 3. Multi-edge morphisms → composed sequence of edge primitives
 * 4. If path crosses a mirror pair → insert dagger primitive
 * 5. If endpoints are a mirror pair → express as cup-cap (teleportation)
 */
export function decomposeMorphism(m: Morphism): DecomposedMorphism {
  const primitives: CategoricalPrimitive[] = [];
  let involvesDagger = false;
  let isTeleportation = false;

  // Case 1: Identity
  if (m.source === m.target) {
    primitives.push({
      kind: "identity",
      source: m.source,
      target: m.target,
      label: `id(${m.source})`,
      depth: 0,
    });
    return { morphism: m, primitives, primitiveCount: 1, involvesDagger: false, isTeleportation: false };
  }

  // Check if endpoints are a mirror pair → teleportation via cup-cap
  if (dagger(m.source) === m.target) {
    isTeleportation = true;
    involvesDagger = true;

    // Teleportation: η creates |source, target⟩, then ε annihilates
    primitives.push({
      kind: "cup",
      source: -1,
      target: m.source,
      pairObject: m.source,
      label: `η(${m.source}): I → ${m.source}⊗${m.target}`,
      depth: 0,
    });
    primitives.push({
      kind: "dagger",
      source: m.target,
      target: m.source,
      originalSource: m.source,
      originalTarget: m.target,
      label: `†: ${m.source} ↔ ${m.target}`,
      depth: 1,
    });
    primitives.push({
      kind: "cap",
      source: m.target,
      target: -1,
      pairObject: m.source,
      label: `ε(${m.source}): ${m.source}⊗${m.target} → I`,
      depth: 0,
    });
  } else {
    // Decompose path into edge primitives
    for (let i = 0; i < m.path.length - 1; i++) {
      const from = m.path[i];
      const to = m.path[i + 1];

      // Check if this edge crosses a mirror boundary
      if (dagger(from) === to) {
        involvesDagger = true;
        primitives.push({
          kind: "dagger",
          source: to,
          target: from,
          originalSource: from,
          originalTarget: to,
          label: `†(${from}→${to})`,
          depth: i,
        });
      } else {
        primitives.push({
          kind: "edge",
          source: from,
          target: to,
          label: `e(${from}→${to})`,
          depth: i,
        });
      }
    }

    // Wrap multi-step paths in compose primitives
    if (primitives.length > 1) {
      const composed: CategoricalPrimitive = {
        kind: "compose",
        source: m.source,
        target: m.target,
        intermediate: m.path.length > 2 ? m.path[1] : undefined,
        label: `∘(${m.source}→${m.target})[${primitives.length} steps]`,
        depth: 0,
      };
      primitives.unshift(composed);
    }
  }

  return {
    morphism: m,
    primitives,
    primitiveCount: primitives.length,
    involvesDagger,
    isTeleportation,
  };
}

/**
 * Decompose a sequence of morphisms.
 */
export function decomposeAll(morphisms: Morphism[]): DecomposedMorphism[] {
  return morphisms.map(decomposeMorphism);
}

// ══════════════════════════════════════════════════════════════════════════
// Step 3: Optimize — apply categorical identities + rewrite chain
// ══════════════════════════════════════════════════════════════════════════

/**
 * Apply categorical optimization rules to a primitive sequence.
 *
 * Rules:
 * 1. Identity elimination: remove id primitives adjacent to other ops
 * 2. Dagger cancellation: f† ∘ f = id (consecutive dagger + edge to same pair)
 * 3. Snake elimination: cup followed by cap on same object = id
 */
export function optimizePrimitives(
  decompositions: DecomposedMorphism[],
): { optimized: CategoricalPrimitive[]; snakeElims: number; daggerCancels: number; idElims: number } {
  // Flatten all primitives
  let all: CategoricalPrimitive[] = [];
  for (const d of decompositions) {
    all.push(...d.primitives);
  }

  let snakeElims = 0;
  let daggerCancels = 0;
  let idElims = 0;

  // Pass 1: Identity elimination
  const noId = all.filter(p => {
    if (p.kind === "identity") { idElims++; return false; }
    return true;
  });
  all = noId;

  // Pass 2: Dagger cancellation (f† immediately followed by f, or vice versa)
  const afterDagger: CategoricalPrimitive[] = [];
  let i = 0;
  while (i < all.length) {
    if (i + 1 < all.length) {
      const a = all[i];
      const b = all[i + 1];
      if (a.kind === "dagger" && b.kind === "edge" &&
          a.originalSource === b.source && a.originalTarget === b.target) {
        daggerCancels++;
        i += 2;
        continue;
      }
      if (a.kind === "edge" && b.kind === "dagger" &&
          a.source === b.originalSource && a.target === b.originalTarget) {
        daggerCancels++;
        i += 2;
        continue;
      }
    }
    afterDagger.push(all[i]);
    i++;
  }
  all = afterDagger;

  // Pass 3: Snake elimination (cup followed by cap on same object)
  const afterSnake: CategoricalPrimitive[] = [];
  i = 0;
  while (i < all.length) {
    if (i + 1 < all.length) {
      const a = all[i];
      const b = all[i + 1];
      if (a.kind === "cup" && b.kind === "cap" && a.pairObject === b.pairObject) {
        snakeElims++;
        i += 2;
        continue;
      }
    }
    afterSnake.push(all[i]);
    i++;
  }

  return { optimized: afterSnake, snakeElims, daggerCancels, idElims };
}

// ══════════════════════════════════════════════════════════════════════════
// Step 4: Emit — produce optimized gate circuit
// ══════════════════════════════════════════════════════════════════════════

/** Target gate set options. */
export type TargetGateSetName = "clifford+t" | "clifford" | "pauli";

function getTargetSet(name: TargetGateSetName): Set<string> {
  switch (name) {
    case "clifford+t": return CLIFFORD_T_SET;
    case "clifford": return CLIFFORD_SET;
    case "pauli": return PAULI_SET;
  }
}

/**
 * Extract vertex indices from optimized primitives for rewriting.
 */
function extractVertices(primitives: CategoricalPrimitive[]): number[] {
  const vertices: number[] = [];
  for (const p of primitives) {
    if (p.kind === "edge" || p.kind === "dagger") {
      if (p.source >= 0) vertices.push(p.source);
      if (p.target >= 0) vertices.push(p.target);
    } else if (p.kind === "cup" || p.kind === "cap") {
      if (p.pairObject !== undefined) {
        vertices.push(p.pairObject);
        vertices.push(dagger(p.pairObject));
      }
    } else if (p.kind === "compose") {
      if (p.source >= 0) vertices.push(p.source);
      if (p.target >= 0) vertices.push(p.target);
    }
  }
  // Deduplicate while preserving order
  const seen = new Set<number>();
  return vertices.filter(v => {
    if (seen.has(v)) return false;
    seen.add(v);
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════════════
// Main Compiler Entry Point
// ══════════════════════════════════════════════════════════════════════════

/**
 * Compile a sequence of Atlas morphisms into an optimized quantum circuit.
 *
 * @param morphisms  Input morphisms (vertex-to-vertex paths)
 * @param targetSet  Target gate set for optimization
 * @returns          Complete compilation result with decomposition + optimization
 */
export function compile(
  morphisms: Morphism[],
  targetSet: TargetGateSetName = "clifford+t",
): CompilationResult {
  const mappings = mapVerticesToGates();
  const target = getTargetSet(targetSet);

  // Step 2: Decompose into categorical primitives
  const decomposition = decomposeAll(morphisms);
  const totalPrimitives = decomposition.reduce((s, d) => s + d.primitiveCount, 0);

  // Step 3: Optimize primitives (categorical identities)
  const { optimized, snakeElims, daggerCancels, idElims } = optimizePrimitives(decomposition);

  // Extract vertex sequence for rewrite engine
  const vertexSequence = extractVertices(optimized);
  const gatesBefore = vertexSequence.length;

  // Step 4: Apply rewrite chain engine
  const rewritePlan = rewriteCircuit(vertexSequence, [...target]);

  // Build output circuit
  const outputCircuit: CompiledGate[] = rewritePlan.chains.map((chain, i) => ({
    gate: chain.targetGate,
    vertex: chain.targetVertex,
    timeStep: i,
    isRewritten: !chain.isTrivial,
    rewriteDepth: chain.length,
  }));

  // Count primitives by kind
  const primitivesByKind: Record<PrimitiveKind, number> = {
    identity: 0, compose: 0, dagger: 0, cup: 0, cap: 0, edge: 0,
  };
  for (const d of decomposition) {
    for (const p of d.primitives) {
      primitivesByKind[p.kind]++;
    }
  }

  const stats: CompilationStats = {
    inputMorphismCount: morphisms.length,
    totalEdgeSteps: morphisms.reduce((s, m) => s + m.length, 0),
    totalPrimitives,
    primitivesByKind,
    daggerCount: primitivesByKind.dagger,
    cupCount: primitivesByKind.cup,
    capCount: primitivesByKind.cap,
    gatesBefore,
    gatesAfter: outputCircuit.length,
    optimizationRatio: gatesBefore > 0 ? outputCircuit.length / gatesBefore : 1,
    snakeEliminations: snakeElims,
    daggerCancellations: daggerCancels,
    identityEliminations: idElims,
  };

  const summary = [
    `Categorical Quantum Circuit Compiler`,
    `═════════════════════════════════════`,
    ``,
    `INPUT:`,
    `  Morphisms:          ${stats.inputMorphismCount}`,
    `  Total edge steps:   ${stats.totalEdgeSteps}`,
    ``,
    `DECOMPOSITION (categorical primitives):`,
    `  Total primitives:   ${stats.totalPrimitives}`,
    `  Edges:              ${primitivesByKind.edge}`,
    `  Compositions:       ${primitivesByKind.compose}`,
    `  Daggers (†):        ${primitivesByKind.dagger}`,
    `  Cups (η):           ${primitivesByKind.cup}`,
    `  Caps (ε):           ${primitivesByKind.cap}`,
    `  Identities:         ${primitivesByKind.identity}`,
    ``,
    `OPTIMIZATION (categorical identities):`,
    `  Snake eliminations:   ${snakeElims}`,
    `  Dagger cancellations: ${daggerCancels}`,
    `  Identity removals:    ${idElims}`,
    ``,
    `REWRITE (→ ${targetSet}):`,
    `  Gates before:       ${stats.gatesBefore}`,
    `  Gates after:        ${stats.gatesAfter}`,
    `  Ratio:              ${(stats.optimizationRatio * 100).toFixed(1)}%`,
    `  All rewritten:      ${rewritePlan.allRewritten ? '✓' : '✗'}`,
    `  Total rewrite cost: ${rewritePlan.totalCost}`,
    `  Max chain length:   ${rewritePlan.maxChainLength}`,
    ``,
    `OUTPUT CIRCUIT:`,
    ...outputCircuit.map(g =>
      `  [t=${g.timeStep}] ${g.gate.name} (v${g.vertex})${g.isRewritten ? ` ← rewrite(${g.rewriteDepth})` : ''}`
    ),
  ].join('\n');

  return {
    inputMorphisms: morphisms,
    decomposition,
    totalPrimitives,
    outputCircuit,
    targetGateSet: targetSet,
    rewritePlan,
    stats,
    summary,
  };
}

/**
 * Convenience: compile from vertex pairs.
 */
export function compileFromPairs(
  pairs: [number, number][],
  targetSet: TargetGateSetName = "clifford+t",
): CompilationResult {
  return compile(parseMorphisms(pairs), targetSet);
}

/**
 * Convenience: compile from a vertex chain.
 */
export function compileFromChain(
  vertices: number[],
  targetSet: TargetGateSetName = "clifford+t",
): CompilationResult {
  return compile(parseChain(vertices), targetSet);
}
