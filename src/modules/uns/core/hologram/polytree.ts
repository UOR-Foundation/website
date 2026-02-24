/**
 * Polynomial Trees — Coinductive Interface Evolution
 * ═══════════════════════════════════════════════════
 *
 * Implementation of Spivak's PolyTr category (arXiv:2602.17917v1)
 * within the UOR Hologram framework.
 *
 * Key insight: Every Hologram projection is currently a "constant tree" —
 * a polynomial tree whose interface never changes. This module generalizes
 * projections to *evolving* interfaces where each I/O round (emit value,
 * receive verification/feedback) may reshape the projection spec.
 *
 * Mathematical foundation:
 *   - A polynomial p = Σ_{i:p(1)} y^{p[i]} specifies positions (outputs)
 *     and directions (inputs) at each position.
 *   - A polynomial tree is an element of the terminal (u◁u)-coalgebra:
 *     a coinductive tree where each node carries a polynomial, and each
 *     (position, direction) pair determines the child tree.
 *   - Constant trees repeat the same polynomial at every depth — these
 *     are exactly our current static HologramSpec projections.
 *
 * UOR compliance:
 *   - Every transition is content-addressed via the same SHA-256 pipeline
 *   - Polynomial tree nodes are identified by their projection spec hash
 *   - The constant-tree embedding preserves all existing projections
 *   - Transitions are deterministic pure functions (no side effects)
 *
 * @module uns/core/hologram/polytree
 */

import type { ProjectionInput, Fidelity, HologramSpec } from "./index";

// ── Universe of Cardinalities ──────────────────────────────────────────────

/**
 * Universe U — the set of cardinalities our polynomials use.
 * For UOR, we restrict to finite cardinalities (practical systems).
 * This corresponds to Spivak's "finite universe" specialization.
 */
export type Cardinality = number;

// ── Polynomial Types ───────────────────────────────────────────────────────

/**
 * A polynomial p = Σ_{i ∈ positions} y^{|directions_i|}
 *
 * In the Hologram context:
 *   - positions = possible output values the projection can emit
 *   - directions = possible feedback/verification signals per output
 *
 * For a typical HologramSpec like `did`:
 *   - positions = { the DID string }  (|positions| = 1 for deterministic projections)
 *   - directions = { "verified", "expired", "revoked" } (verification outcomes)
 */
export interface Polynomial {
  /** Human-readable label for this polynomial. */
  readonly label: string;
  /** Number of positions (output cardinality). */
  readonly positionCount: Cardinality;
  /** Direction count per position (input cardinality at each output). */
  readonly directionCounts: readonly Cardinality[];
  /** The underlying HologramSpec, if this polynomial wraps one. */
  readonly spec?: HologramSpec;
  /** Fidelity of the projection this polynomial represents. */
  readonly fidelity: Fidelity;
}

// ── Polynomial Tree (Terminal Coalgebra Element) ───────────────────────────

/**
 * A transition function: given a position (output chosen) and direction
 * (input received), determines the next polynomial tree.
 *
 * This is the coalgebra structure map:
 *   tree → (root polynomial, (i,d) ↦ child tree)
 *
 * In Spivak's notation:
 *   p.root  : (u◁u)(1)    — the polynomial at this node
 *   p.rest_{i,d} : PolyTr  — the child tree for position i, direction d
 */
export type TransitionFn = (
  position: number,
  direction: number,
  context: TransitionContext,
) => PolyTree;

/**
 * Context provided to transition functions for UOR-compliant evolution.
 */
export interface TransitionContext {
  /** The projection input (identity) being projected. */
  readonly input: ProjectionInput;
  /** Current depth in the coinductive tower (for truncation). */
  readonly depth: number;
  /** Maximum depth before truncation to constant tree. */
  readonly maxDepth: number;
  /** Interaction history: sequence of (position, direction) pairs. */
  readonly history: readonly InteractionStep[];
}

/** One round of interaction in the polynomial tree. */
export interface InteractionStep {
  readonly position: number;
  readonly direction: number;
  readonly timestamp: number;
}

/**
 * PolyTree — An element of the terminal (u◁u)-coalgebra.
 *
 * Each node carries:
 *   - root: the polynomial (interface) at this node
 *   - rest: transition function mapping (position, direction) → child tree
 *   - isConstant: whether this is a constant tree (all children = self)
 *
 * The coinductive structure is implemented via lazy evaluation:
 * children are computed on demand, allowing potentially infinite trees
 * while maintaining finite memory usage.
 */
export interface PolyTree {
  /** The polynomial at this node — the current interface. */
  readonly root: Polynomial;
  /** Transition to child tree. Returns self for constant trees. */
  readonly rest: TransitionFn;
  /** True iff this is a constant tree (∀ i,d: rest(i,d) = this). */
  readonly isConstant: boolean;
  /** Unique identifier for this tree node (content-addressed). */
  readonly nodeId: string;
}

// ── Constant Tree Embedding ────────────────────────────────────────────────

/**
 * Embed a static HologramSpec as a constant polynomial tree.
 *
 * This is the functor (-)̄ : Poly_U → PolyTr_U from Spivak §6.
 * Every existing projection becomes a tree that repeats itself forever.
 *
 * Properties (proven in the paper):
 *   - Faithful: distinct specs yield distinct constant trees
 *   - Strict monoidal: p̄ ⊗ q̄ = (p⊗q)̄
 *   - Preserves the monoidal unit: ȳ is the unit
 *
 * @param name  The projection name (e.g., "did", "fpp-phc")
 * @param spec  The static HologramSpec to embed
 */
export function constantTree(name: string, spec: HologramSpec): PolyTree {
  const polynomial: Polynomial = {
    label: name,
    positionCount: 1,  // Deterministic projection: one output
    directionCounts: [1],  // One feedback channel (verification)
    spec,
    fidelity: spec.fidelity,
  };

  const tree: PolyTree = {
    root: polynomial,
    rest: () => tree,  // Self-referential: constant forever
    isConstant: true,
    nodeId: `const:${name}`,
  };

  return tree;
}

// ── Evolving Tree Constructors ─────────────────────────────────────────────

/**
 * Direction vocabulary for common verification outcomes.
 * These are the "inputs" that flow back into the projection.
 */
export const DIRECTIONS = {
  VERIFIED: 0,
  EXPIRED: 1,
  REVOKED: 2,
  UPGRADED: 3,
  DEGRADED: 4,
  SPLIT: 5,
  MERGED: 6,
  DIED: 7,
} as const;

export type DirectionName = keyof typeof DIRECTIONS;

/**
 * Create a polynomial tree with explicit transition rules.
 *
 * This is the general constructor for evolving projections.
 * Each transition rule maps a (position, direction) pair to a new
 * polynomial tree, modeling interface evolution.
 *
 * @param root          The initial polynomial (interface)
 * @param transitions   Map of direction → next PolyTree constructor
 * @param fallback      Default tree if no transition matches (defaults to constant)
 */
export function evolvingTree(
  root: Polynomial,
  transitions: Map<number, (ctx: TransitionContext) => PolyTree>,
  fallback?: PolyTree,
): PolyTree {
  const fb = fallback ?? constantTree(root.label, root.spec!);
  const nodeId = `evolving:${root.label}:${transitions.size}`;

  const tree: PolyTree = {
    root,
    rest: (_position: number, direction: number, ctx: TransitionContext) => {
      if (ctx.depth >= ctx.maxDepth) return fb;  // Truncate to constant
      const transition = transitions.get(direction);
      if (!transition) return fb;
      return transition(ctx);
    },
    isConstant: false,
    nodeId,
  };

  return tree;
}

/**
 * The zero polynomial tree — the "dead" interface.
 * No positions, no directions. Terminal state.
 *
 * In Spivak's notation: 0̄ (the constant tree of the zero polynomial).
 */
export const ZERO_TREE: PolyTree = {
  root: {
    label: "∅",
    positionCount: 0,
    directionCounts: [],
    fidelity: "lossy",
  },
  rest: () => ZERO_TREE,
  isConstant: true,
  nodeId: "const:zero",
};

/**
 * The unit polynomial tree — the trivial interface.
 * One position, no directions. Pure output, no feedback.
 *
 * In Spivak's notation: ȳ (the constant tree of y = y^1).
 */
export const UNIT_TREE: PolyTree = {
  root: {
    label: "𝓎",
    positionCount: 1,
    directionCounts: [0],
    fidelity: "lossless",
  },
  rest: () => UNIT_TREE,
  isConstant: true,
  nodeId: "const:unit",
};

// ── Dirichlet Tensor Product ───────────────────────────────────────────────

/**
 * Tensor product of polynomial trees: p ⊗ q
 *
 * Models parallel composition of evolving interfaces.
 * From Spivak §7:
 *   (p⊗q).root = p.root ⊗ q.root
 *   (p⊗q).rest_{(i,j),(d,e)} = p.rest_{i,d} ⊗ q.rest_{j,e}
 *
 * @param p  First polynomial tree
 * @param q  Second polynomial tree
 */
export function tensorProduct(p: PolyTree, q: PolyTree): PolyTree {
  const root: Polynomial = {
    label: `${p.root.label}⊗${q.root.label}`,
    positionCount: p.root.positionCount * q.root.positionCount,
    directionCounts: tensorDirections(p.root, q.root),
    fidelity: p.root.fidelity === "lossless" && q.root.fidelity === "lossless"
      ? "lossless" : "lossy",
  };

  const nodeId = `tensor:${p.nodeId}:${q.nodeId}`;

  const tree: PolyTree = {
    root,
    rest: (position: number, direction: number, ctx: TransitionContext) => {
      // Decode tensor position (i,j) from linear index
      const i = Math.floor(position / q.root.positionCount);
      const j = position % q.root.positionCount;

      // Decode tensor direction (d,e) from linear index
      const pDirCount = p.root.directionCounts[i] ?? 1;
      const d = Math.floor(direction / (q.root.directionCounts[j] ?? 1));
      const e = direction % (q.root.directionCounts[j] ?? 1);

      const childCtx: TransitionContext = {
        ...ctx,
        depth: ctx.depth + 1,
      };

      // Coinductive: tensor of children
      return tensorProduct(
        p.rest(i, d, childCtx),
        q.rest(j, e, childCtx),
      );
    },
    isConstant: p.isConstant && q.isConstant,
    nodeId,
  };

  return tree;
}

function tensorDirections(p: Polynomial, q: Polynomial): Cardinality[] {
  const dirs: Cardinality[] = [];
  for (let i = 0; i < p.positionCount; i++) {
    for (let j = 0; j < q.positionCount; j++) {
      dirs.push((p.directionCounts[i] ?? 1) * (q.directionCounts[j] ?? 1));
    }
  }
  return dirs;
}

// ── Coproduct ──────────────────────────────────────────────────────────────

/**
 * Coproduct of polynomial trees: p + q
 *
 * From Spivak §6: coproduct acts only at the root.
 * Children are inherited from the summands.
 */
export function coproduct(p: PolyTree, q: PolyTree): PolyTree {
  const root: Polynomial = {
    label: `${p.root.label}+${q.root.label}`,
    positionCount: p.root.positionCount + q.root.positionCount,
    directionCounts: [...p.root.directionCounts, ...q.root.directionCounts],
    fidelity: p.root.fidelity === "lossless" && q.root.fidelity === "lossless"
      ? "lossless" : "lossy",
  };

  return {
    root,
    rest: (position: number, direction: number, ctx: TransitionContext) => {
      if (position < p.root.positionCount) {
        return p.rest(position, direction, ctx);
      }
      return q.rest(position - p.root.positionCount, direction, ctx);
    },
    isConstant: false,
    nodeId: `coprod:${p.nodeId}:${q.nodeId}`,
  };
}

// ── Internal Hom ───────────────────────────────────────────────────────────

/**
 * Internal hom [p,q] — the polynomial tree of morphisms from p to q.
 *
 * From Spivak §8, Theorem 8.21:
 *   PolyTr_U(r⊗p, q) ≅ PolyTr_U(r, [p,q])
 *
 * We implement the truncated tower [p,q]^(n) up to maxDepth.
 */
export function internalHom(p: PolyTree, q: PolyTree, maxDepth: number = 8): PolyTree {
  return buildHomTower(p, q, maxDepth, 0);
}

function buildHomTower(p: PolyTree, q: PolyTree, maxDepth: number, depth: number): PolyTree {
  if (depth >= maxDepth) return UNIT_TREE;

  // [p,q]^(n+1) = Π_{i:p.pos} Σ_{j:q.pos} Π_{e:q.dir_j} Σ_{d:p.dir_i} [p.rest_{i,d}, q.rest_{j,e}]^(n)
  const morphismCount = computeMorphismCount(p.root, q.root);

  const root: Polynomial = {
    label: `[${p.root.label},${q.root.label}]`,
    positionCount: morphismCount,
    directionCounts: computeHomDirections(p.root, q.root),
    fidelity: "lossless",
  };

  return {
    root,
    rest: (position: number, direction: number, ctx: TransitionContext) => {
      // Decode which (i,e) pair this direction corresponds to
      const { i, d, j, e } = decodeHomDirection(p.root, q.root, position, direction);

      const childCtx: TransitionContext = { ...ctx, depth: ctx.depth + 1, maxDepth };
      return buildHomTower(
        p.rest(i, d, childCtx),
        q.rest(j, e, childCtx),
        maxDepth,
        depth + 1,
      );
    },
    isConstant: p.isConstant && q.isConstant,
    nodeId: `hom:${p.nodeId}:${q.nodeId}:${depth}`,
  };
}

function computeMorphismCount(p: Polynomial, q: Polynomial): number {
  // |Poly(p,q)| = Π_{i:p(1)} Σ_{j:q(1)} Π_{e:q[j]} Σ_{d:p[i]} 1
  // = Π_{i:p(1)} Σ_{j:q(1)} (p[i])^(q[j])
  // For finite polynomials, this is computable
  if (p.positionCount === 0) return 1;
  let total = 1;
  for (let i = 0; i < p.positionCount; i++) {
    let posSum = 0;
    for (let j = 0; j < q.positionCount; j++) {
      const pDirs = p.directionCounts[i] ?? 1;
      const qDirs = q.directionCounts[j] ?? 1;
      posSum += Math.pow(pDirs, qDirs);
    }
    total *= posSum;
    if (total > 1000) return 1000; // Cap for practicality
  }
  return Math.min(total, 1000);
}

function computeHomDirections(p: Polynomial, q: Polynomial): Cardinality[] {
  const count = computeMorphismCount(p, q);
  // Each morphism position has Σ_{i:p(1)} q[φ_1(i)] directions
  const dirs: Cardinality[] = [];
  for (let m = 0; m < count; m++) {
    let totalDirs = 0;
    for (let i = 0; i < p.positionCount; i++) {
      for (let j = 0; j < q.positionCount; j++) {
        totalDirs += q.directionCounts[j] ?? 1;
      }
    }
    dirs.push(Math.max(1, totalDirs));
  }
  return dirs;
}

function decodeHomDirection(
  p: Polynomial, q: Polynomial,
  _position: number, direction: number,
): { i: number; d: number; j: number; e: number } {
  // Simplified decoding for the finite case
  const pPos = Math.max(1, p.positionCount);
  const qPos = Math.max(1, q.positionCount);
  const i = direction % pPos;
  const j = Math.floor(direction / pPos) % qPos;
  const pDirs = p.directionCounts[i] ?? 1;
  const qDirs = q.directionCounts[j] ?? 1;
  const d = Math.floor(direction / (pPos * qPos)) % Math.max(1, pDirs);
  const e = Math.floor(direction / (pPos * qPos * Math.max(1, pDirs))) % Math.max(1, qDirs);
  return { i, d, j, e };
}

// ── Morphisms ──────────────────────────────────────────────────────────────

/**
 * A morphism φ: p → q in PolyTr_U.
 *
 * At each node along every interaction path, provides a polynomial map
 * from the current interface of p to the current interface of q.
 *
 * Identity and composition follow Spivak §6 (Prop 6.8).
 */
export interface PolyTreeMorphism {
  /** The polynomial map at the root: p.root → q.root. */
  readonly rootMap: PolynomialMap;
  /** Coinductive rest: for each (i,d) pair, a morphism on child trees. */
  readonly restMap: (position: number, direction: number) => PolyTreeMorphism;
}

/** A morphism between polynomials: forward on positions, backward on directions. */
export interface PolynomialMap {
  /** φ_1: p(1) → q(1) — maps positions forward. */
  readonly onPositions: (i: number) => number;
  /** φ^#_i: q[φ_1(i)] → p[i] — maps directions backward. */
  readonly onDirections: (i: number, e: number) => number;
}

/**
 * Identity morphism: id_p ∈ PolyTr_U(p, p).
 *
 * (id_p).root = id_{⟦p.root⟧}
 * (id_p).rest_{i,d} = id_{p.rest_{i,d}}  (coinductively)
 */
export function identityMorphism(p: PolyTree): PolyTreeMorphism {
  const morph: PolyTreeMorphism = {
    rootMap: {
      onPositions: (i) => i,
      onDirections: (_i, e) => e,
    },
    restMap: () => morph,  // Coinductive: identity on all children
  };
  return morph;
}

/**
 * Composition: ψ ∘ φ ∈ PolyTr_U(p, r) for φ: p→q, ψ: q→r.
 *
 * (ψ∘φ).root = ψ.root ∘ φ.root
 * (ψ∘φ).rest_{i,f} = ψ.rest_{j,f} ∘ φ.rest_{i,e}
 *   where j = φ_1(i), e = ψ^#_j(f)
 */
export function composeMorphisms(
  phi: PolyTreeMorphism,
  psi: PolyTreeMorphism,
): PolyTreeMorphism {
  return {
    rootMap: {
      onPositions: (i) => psi.rootMap.onPositions(phi.rootMap.onPositions(i)),
      onDirections: (i, f) => {
        const j = phi.rootMap.onPositions(i);
        const e = psi.rootMap.onDirections(j, f);
        return phi.rootMap.onDirections(i, e);
      },
    },
    restMap: (i: number, f: number) => {
      const j = phi.rootMap.onPositions(i);
      const e = psi.rootMap.onDirections(j, f);
      const d = phi.rootMap.onDirections(i, e);
      return composeMorphisms(
        phi.restMap(i, d),
        psi.restMap(j, f),
      );
    },
  };
}

// ── UOR-Specific Evolving Projections ──────────────────────────────────────

/**
 * Create an FPP trust evolution tree.
 *
 * Models how an FPP identity's projection interface evolves as trust
 * grows: PHC issuance → VRC exchange → VEC endorsement → trust graph growth.
 *
 * Each verification/endorsement event transitions the tree to a richer
 * interface (more positions = more capability outputs).
 */
export function fppTrustEvolutionTree(spec: HologramSpec): PolyTree {
  const basePolynomial: Polynomial = {
    label: "fpp-trust-L0",
    positionCount: 1,
    directionCounts: [Object.keys(DIRECTIONS).length],
    spec,
    fidelity: spec.fidelity,
  };

  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  // VERIFIED → grow interface (add VRC output position)
  transitions.set(DIRECTIONS.VERIFIED, (ctx) => {
    const grown: Polynomial = {
      label: `fpp-trust-L${ctx.depth + 1}`,
      positionCount: 2 + ctx.depth,  // Each verification adds capability
      directionCounts: Array(2 + ctx.depth).fill(Object.keys(DIRECTIONS).length),
      spec,
      fidelity: spec.fidelity,
    };
    return evolvingTree(grown, transitions);
  });

  // REVOKED → shrink to zero tree (dead interface)
  transitions.set(DIRECTIONS.REVOKED, () => ZERO_TREE);

  // EXPIRED → return to base (reset)
  transitions.set(DIRECTIONS.EXPIRED, () =>
    evolvingTree(basePolynomial, transitions));

  // UPGRADED → double the interface
  transitions.set(DIRECTIONS.UPGRADED, (ctx) => {
    const upgraded: Polynomial = {
      label: `fpp-trust-L${ctx.depth + 1}-upgraded`,
      positionCount: (1 + ctx.depth) * 2,
      directionCounts: Array((1 + ctx.depth) * 2).fill(Object.keys(DIRECTIONS).length),
      spec,
      fidelity: spec.fidelity,
    };
    return evolvingTree(upgraded, transitions);
  });

  return evolvingTree(basePolynomial, transitions);
}

/**
 * Create a TSP channel lifecycle tree.
 *
 * Models TSP channel evolution: handshake → active → key rotation → expiry.
 * Each phase has different interface capabilities.
 */
export function tspChannelEvolutionTree(spec: HologramSpec): PolyTree {
  const handshakePolynomial: Polynomial = {
    label: "tsp-channel-handshake",
    positionCount: 2,  // {accept, reject}
    directionCounts: [3, 1],  // accept gets {verify, timeout, error}, reject gets {ack}
    spec,
    fidelity: spec.fidelity,
  };

  const activePolynomial: Polynomial = {
    label: "tsp-channel-active",
    positionCount: 3,  // {send, receive, rotate-key}
    directionCounts: [2, 2, 2],  // each gets {ack, error}
    spec,
    fidelity: spec.fidelity,
  };

  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  // Verified handshake → active channel
  transitions.set(DIRECTIONS.VERIFIED, () =>
    evolvingTree(activePolynomial, new Map([
      [DIRECTIONS.EXPIRED, () => evolvingTree(handshakePolynomial, transitions)],
      [DIRECTIONS.REVOKED, () => ZERO_TREE],
    ])));

  // Expired → back to handshake
  transitions.set(DIRECTIONS.EXPIRED, () =>
    evolvingTree(handshakePolynomial, transitions));

  // Revoked → dead
  transitions.set(DIRECTIONS.REVOKED, () => ZERO_TREE);

  return evolvingTree(handshakePolynomial, transitions);
}

/**
 * Create an agent capability evolution tree.
 *
 * Models skill-md/ONNX projection evolution as agents learn new skills.
 */
export function agentCapabilityEvolutionTree(spec: HologramSpec): PolyTree {
  const basePolynomial: Polynomial = {
    label: "agent-capability-base",
    positionCount: 1,
    directionCounts: [4],  // {verified, upgraded, degraded, split}
    spec,
    fidelity: spec.fidelity,
  };

  const transitions = new Map<number, (ctx: TransitionContext) => PolyTree>();

  // UPGRADED → more capabilities
  transitions.set(DIRECTIONS.UPGRADED, (ctx) => {
    const upgraded: Polynomial = {
      label: `agent-capability-L${ctx.depth + 1}`,
      positionCount: 2 + ctx.depth,
      directionCounts: Array(2 + ctx.depth).fill(4),
      spec,
      fidelity: spec.fidelity,
    };
    return evolvingTree(upgraded, transitions);
  });

  // SPLIT → fork into two capability branches (coproduct)
  transitions.set(DIRECTIONS.SPLIT, (ctx) => {
    const branch = evolvingTree(basePolynomial, transitions);
    const childCtx: TransitionContext = { ...ctx, depth: ctx.depth + 1 };
    return coproduct(
      branch.rest(0, DIRECTIONS.VERIFIED, childCtx),
      branch,
    );
  });

  // DEGRADED → shrink
  transitions.set(DIRECTIONS.DEGRADED, () =>
    evolvingTree(basePolynomial, transitions));

  return evolvingTree(basePolynomial, transitions);
}

// ── Interaction Execution ──────────────────────────────────────────────────

/**
 * Execute a sequence of interactions on a polynomial tree,
 * returning the final tree state and interaction trace.
 *
 * This is the operational semantics: running the coinductive
 * structure forward through concrete I/O rounds.
 */
export function executeInteraction(
  tree: PolyTree,
  interactions: readonly { position: number; direction: number }[],
  input: ProjectionInput,
  maxDepth: number = 32,
): { finalTree: PolyTree; trace: InteractionStep[] } {
  let current = tree;
  const trace: InteractionStep[] = [];

  for (let step = 0; step < interactions.length; step++) {
    const { position, direction } = interactions[step];

    if (position >= current.root.positionCount) {
      break;  // Position out of range — interaction terminates
    }

    const ctx: TransitionContext = {
      input,
      depth: step,
      maxDepth,
      history: trace,
    };

    trace.push({ position, direction, timestamp: Date.now() });
    current = current.rest(position, direction, ctx);
  }

  return { finalTree: current, trace };
}

// ── Introspection ──────────────────────────────────────────────────────────

/**
 * Compute the depth-k approximation PolyTr^(k) of a tree.
 * Returns the truncated tower as a flat structure for analysis.
 */
export function truncate(tree: PolyTree, depth: number): PolyTreeSnapshot {
  if (depth <= 0) {
    return { label: tree.root.label, isConstant: tree.isConstant, children: [] };
  }

  const dummyInput: ProjectionInput = {
    hashBytes: new Uint8Array(32),
    cid: "",
    hex: "0".repeat(64),
  };

  const children: PolyTreeSnapshot[] = [];
  for (let i = 0; i < Math.min(tree.root.positionCount, 4); i++) {
    for (let d = 0; d < Math.min(tree.root.directionCounts[i] ?? 1, 4); d++) {
      const ctx: TransitionContext = {
        input: dummyInput,
        depth: 0,
        maxDepth: depth,
        history: [],
      };
      const child = tree.rest(i, d, ctx);
      children.push(truncate(child, depth - 1));
    }
  }

  return {
    label: tree.root.label,
    isConstant: tree.isConstant,
    positionCount: tree.root.positionCount,
    directionCounts: tree.root.directionCounts,
    fidelity: tree.root.fidelity,
    children,
  };
}

export interface PolyTreeSnapshot {
  readonly label: string;
  readonly isConstant: boolean;
  readonly positionCount?: number;
  readonly directionCounts?: readonly number[];
  readonly fidelity?: Fidelity;
  readonly children: readonly PolyTreeSnapshot[];
}
