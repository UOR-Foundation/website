/**
 * Canonical Compliance — UOR Atomic Primitives Registry
 * ═════════════════════════════════════════════════════════════════
 *
 * The "periodic table" of UOR: every allowable type, operation,
 * and identity pipeline step declared by the framework.
 *
 * Nothing exists outside these atoms. Every upstream module must
 * trace its provenance back to one or more entries here.
 *
 * @version 1.0.0
 */

// ── Atom Categories ─────────────────────────────────────────────

export type AtomCategory =
  | "PrimitiveOp"
  | "Space"
  | "CoreType"
  | "IdentityPipeline"
  | "Morphism"
  | "Algebraic";

export interface UorAtom {
  id: string;
  label: string;
  category: AtomCategory;
  description: string;
  foundationPath: string; // path in uor-foundation types
}

// ── 1. Primitive Ring Operations (R₈ = Z/256Z) ─────────────────

export const PRIMITIVE_OPS: UorAtom[] = [
  { id: "op:neg",  label: "Neg",  category: "PrimitiveOp", description: "Additive inverse in R₈",        foundationPath: "kernel/op" },
  { id: "op:bnot", label: "Bnot", category: "PrimitiveOp", description: "Bitwise complement in R₈",      foundationPath: "kernel/op" },
  { id: "op:succ", label: "Succ", category: "PrimitiveOp", description: "Successor (+1 mod 256)",         foundationPath: "kernel/op" },
  { id: "op:pred", label: "Pred", category: "PrimitiveOp", description: "Predecessor (-1 mod 256)",       foundationPath: "kernel/op" },
  { id: "op:add",  label: "Add",  category: "PrimitiveOp", description: "Addition mod 256",               foundationPath: "kernel/op" },
  { id: "op:sub",  label: "Sub",  category: "PrimitiveOp", description: "Subtraction mod 256",            foundationPath: "kernel/op" },
  { id: "op:mul",  label: "Mul",  category: "PrimitiveOp", description: "Multiplication mod 256",         foundationPath: "kernel/op" },
  { id: "op:xor",  label: "Xor",  category: "PrimitiveOp", description: "Bitwise XOR",                   foundationPath: "kernel/op" },
  { id: "op:and",  label: "And",  category: "PrimitiveOp", description: "Bitwise AND",                   foundationPath: "kernel/op" },
  { id: "op:or",   label: "Or",   category: "PrimitiveOp", description: "Bitwise OR",                    foundationPath: "kernel/op" },
];

// ── 2. Spaces ───────────────────────────────────────────────────

export const SPACES: UorAtom[] = [
  { id: "space:kernel", label: "Kernel",  category: "Space", description: "Immutable algebraic substrate",           foundationPath: "kernel" },
  { id: "space:bridge", label: "Bridge",  category: "Space", description: "Kernel-computed verification & resolution", foundationPath: "bridge" },
  { id: "space:user",   label: "User",    category: "Space", description: "Application-facing surface",              foundationPath: "user" },
];

// ── 3. Core Types ───────────────────────────────────────────────

export const CORE_TYPES: UorAtom[] = [
  { id: "type:address",     label: "Address",     category: "CoreType", description: "Content-addressed identity",               foundationPath: "kernel/address" },
  { id: "type:datum",        label: "Datum",        category: "CoreType", description: "Atomic data quantum",                     foundationPath: "kernel/schema" },
  { id: "type:triad",        label: "Triad",        category: "CoreType", description: "Subject-predicate-object triple",         foundationPath: "kernel/schema" },
  { id: "type:operation",    label: "Operation",    category: "CoreType", description: "Named transformation on data",            foundationPath: "kernel/op" },
  { id: "type:proof",        label: "Proof",        category: "CoreType", description: "Verification witness",                    foundationPath: "bridge/proof" },
  { id: "type:certificate",  label: "Certificate",  category: "CoreType", description: "Trust assertion binding",                 foundationPath: "bridge/cert" },
  { id: "type:derivation",   label: "Derivation",   category: "CoreType", description: "Content-addressed derivation chain",      foundationPath: "bridge/derivation" },
  { id: "type:observable",   label: "Observable",   category: "CoreType", description: "Reactive observation stream",             foundationPath: "bridge/observable" },
  { id: "type:query",        label: "Query",        category: "CoreType", description: "Structured resolution request",           foundationPath: "bridge/query" },
  { id: "type:resolver",     label: "Resolver",     category: "CoreType", description: "Name-to-address resolution engine",       foundationPath: "bridge/resolver" },
  { id: "type:context",      label: "Context",      category: "CoreType", description: "Scoped execution environment",            foundationPath: "user/context" },
  { id: "type:session",      label: "Session",      category: "CoreType", description: "Authenticated temporal scope",            foundationPath: "user/session" },
  { id: "type:effect",       label: "Effect",       category: "CoreType", description: "Side-effect descriptor",                  foundationPath: "kernel/effect" },
  { id: "type:stream",       label: "Stream",       category: "CoreType", description: "Ordered element sequence",                foundationPath: "kernel/stream" },
  { id: "type:predicate",    label: "Predicate",    category: "CoreType", description: "Boolean-valued type guard",               foundationPath: "kernel/predicate" },
  { id: "type:region",       label: "Region",       category: "CoreType", description: "Bounded address sub-space",               foundationPath: "kernel/region" },
  { id: "type:transition",   label: "Transition",   category: "CoreType", description: "State machine edge",                      foundationPath: "user/transition" },
  { id: "type:envelope",     label: "Envelope",     category: "CoreType", description: "Sealed transport container",              foundationPath: "user/envelope" },
];

// ── 4. Morphism Types ───────────────────────────────────────────

export const MORPHISMS: UorAtom[] = [
  { id: "morph:transform",  label: "Transform",  category: "Morphism", description: "General structure-preserving map",     foundationPath: "kernel/op" },
  { id: "morph:isometry",   label: "Isometry",   category: "Morphism", description: "Distance-preserving bijection",        foundationPath: "kernel/op" },
  { id: "morph:embedding",  label: "Embedding",  category: "Morphism", description: "Injective structure map",              foundationPath: "kernel/op" },
  { id: "morph:action",     label: "Action",     category: "Morphism", description: "Group action on a set",                foundationPath: "kernel/op" },
  { id: "morph:functor",    label: "Functor",    category: "Morphism", description: "Category-preserving map",              foundationPath: "kernel/op" },
];

// ── 5. Identity Pipeline Steps ──────────────────────────────────

export const IDENTITY_PIPELINE: UorAtom[] = [
  { id: "pipe:urdna2015",   label: "URDNA2015",   category: "IdentityPipeline", description: "RDF dataset canonicalization",  foundationPath: "bridge/derivation" },
  { id: "pipe:sha256",      label: "SHA-256",      category: "IdentityPipeline", description: "Cryptographic hash",            foundationPath: "kernel/address" },
  { id: "pipe:cid",         label: "CID",          category: "IdentityPipeline", description: "Content Identifier (multihash)", foundationPath: "kernel/address" },
  { id: "pipe:ipv6",        label: "IPv6",         category: "IdentityPipeline", description: "128-bit routable address",      foundationPath: "kernel/address" },
  { id: "pipe:braille",     label: "Braille",      category: "IdentityPipeline", description: "Human-readable glyph encoding", foundationPath: "kernel/address" },
];

// ── 6. Algebraic Structures ────────────────────────────────────

export const ALGEBRAIC: UorAtom[] = [
  { id: "alg:ring",       label: "Ring",       category: "Algebraic", description: "R₈ = Z/256Z commutative ring",    foundationPath: "kernel/op" },
  { id: "alg:monoidal",   label: "Monoidal",   category: "Algebraic", description: "Monoidal category structure",     foundationPath: "kernel/monoidal" },
  { id: "alg:operad",     label: "Operad",     category: "Algebraic", description: "Multi-input composition",         foundationPath: "kernel/operad" },
  { id: "alg:linear",     label: "Linear",     category: "Algebraic", description: "Linear map over ring",            foundationPath: "kernel/linear" },
  { id: "alg:recursion",  label: "Recursion",  category: "Algebraic", description: "Recursive fixed-point scheme",    foundationPath: "kernel/recursion" },
  { id: "alg:reduction",  label: "Reduction",  category: "Algebraic", description: "Rewrite / simplification rule",   foundationPath: "kernel/reduction" },
];

// ── Complete Atom Table ─────────────────────────────────────────

export const ALL_ATOMS: UorAtom[] = [
  ...PRIMITIVE_OPS,
  ...SPACES,
  ...CORE_TYPES,
  ...MORPHISMS,
  ...IDENTITY_PIPELINE,
  ...ALGEBRAIC,
];

/** O(1) lookup by atom ID. */
export const ATOM_INDEX: ReadonlyMap<string, UorAtom> = new Map(
  ALL_ATOMS.map((a) => [a.id, a]),
);

/** Verify an atom ID exists in the registry. */
export function isValidAtom(id: string): boolean {
  return ATOM_INDEX.has(id);
}
