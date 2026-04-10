/**
 * Canonical Compliance — UOR Atomic Primitives Registry
 * ═════════════════════════════════════════════════════════════════
 *
 * The "periodic table" of UOR: every allowable type, operation,
 * and identity pipeline step declared by the uor-foundation crate.
 *
 * Each atom is canonically rooted in the Rust crate's namespace
 * hierarchy and mapped to its TypeScript projection. The firmware
 * version tracks which crate release these atoms derive from.
 *
 * @version 2.0.0
 */

import { CRATE_MANIFEST } from "@/modules/engine/crate-manifest";

// ── Firmware Version ────────────────────────────────────────────

/** The crate version these atoms are synced to. */
export const FIRMWARE_VERSION = CRATE_MANIFEST.version;

// ── Atom Categories ─────────────────────────────────────────────

export type AtomCategory =
  | "PrimitiveOp"
  | "Space"
  | "CoreType"
  | "IdentityPipeline"
  | "Morphism"
  | "Algebraic"
  | "Enforcement"
  | "Certificate"
  | "Observable";

export interface UorAtom {
  id: string;
  label: string;
  category: AtomCategory;
  description: string;
  humanDescription: string;
  foundationPath: string;
  crateNamespace: string;
  rustType: string;
  tsProjection: string;
}

// ── 1. Primitive Ring Operations (R₈ = Z/256Z) ─────────────────

export const PRIMITIVE_OPS: UorAtom[] = [
  { id: "op:neg",  label: "Neg",  category: "PrimitiveOp", description: "Additive inverse in R₈", humanDescription: "Flips a byte to its opposite value in modular arithmetic, like turning +5 into -5 within a 256-value ring.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "UnaryOp::Neg", tsProjection: "kernel/op" },
  { id: "op:bnot", label: "Bnot", category: "PrimitiveOp", description: "Bitwise complement in R₈", humanDescription: "Flips every bit in a byte — every 0 becomes 1 and every 1 becomes 0.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "UnaryOp::Bnot", tsProjection: "kernel/op" },
  { id: "op:succ", label: "Succ", category: "PrimitiveOp", description: "Successor (+1 mod 256)", humanDescription: "Adds 1 to a byte, wrapping around from 255 back to 0.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "UnaryOp::Succ", tsProjection: "kernel/op" },
  { id: "op:pred", label: "Pred", category: "PrimitiveOp", description: "Predecessor (-1 mod 256)", humanDescription: "Subtracts 1 from a byte, wrapping from 0 to 255.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "UnaryOp::Pred", tsProjection: "kernel/op" },
  { id: "op:add",  label: "Add",  category: "PrimitiveOp", description: "Addition mod 256", humanDescription: "Combines two bytes by adding their values, wrapping around at 256.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "BinaryOp::Add", tsProjection: "kernel/op" },
  { id: "op:sub",  label: "Sub",  category: "PrimitiveOp", description: "Subtraction mod 256", humanDescription: "Subtracts one byte from another in modular arithmetic.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "BinaryOp::Sub", tsProjection: "kernel/op" },
  { id: "op:mul",  label: "Mul",  category: "PrimitiveOp", description: "Multiplication mod 256", humanDescription: "Multiplies two bytes together in the 256-element ring.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "BinaryOp::Mul", tsProjection: "kernel/op" },
  { id: "op:xor",  label: "Xor",  category: "PrimitiveOp", description: "Bitwise XOR", humanDescription: "Combines two bytes bit-by-bit — outputs 1 only where bits differ.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "BinaryOp::Xor", tsProjection: "kernel/op" },
  { id: "op:and",  label: "And",  category: "PrimitiveOp", description: "Bitwise AND", humanDescription: "Combines two bytes bit-by-bit — outputs 1 only where both bits are 1.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "BinaryOp::And", tsProjection: "kernel/op" },
  { id: "op:or",   label: "Or",   category: "PrimitiveOp", description: "Bitwise OR", humanDescription: "Combines two bytes bit-by-bit — outputs 1 where either bit is 1.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "BinaryOp::Or", tsProjection: "kernel/op" },
  { id: "op:involution", label: "Involution", category: "PrimitiveOp", description: "Self-inverse operation", humanDescription: "An operation that undoes itself when applied twice — f(f(x)) = x.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "Involution", tsProjection: "kernel/op" },
  { id: "op:identity", label: "Identity", category: "PrimitiveOp", description: "No-op identity operation", humanDescription: "Does nothing — returns the input unchanged. The neutral element of composition.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "IdentityOp", tsProjection: "kernel/op" },
  { id: "op:dihedral", label: "Dihedral", category: "PrimitiveOp", description: "Dihedral group element", humanDescription: "Rotation and reflection symmetries acting on data structures.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "DihedralGroup", tsProjection: "kernel/op" },
  { id: "op:dispatch", label: "Dispatch", category: "PrimitiveOp", description: "Dynamic operation dispatch", humanDescription: "Routes computation to the right handler based on input type at runtime.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "DispatchOperation", tsProjection: "kernel/op" },
];

// ── 2. Spaces ───────────────────────────────────────────────────

export const SPACES: UorAtom[] = [
  { id: "space:kernel", label: "Kernel",      category: "Space", description: "Immutable algebraic substrate", humanDescription: "The bedrock layer — pure mathematics that never changes. All operations and types derive from here.", foundationPath: "kernel", crateNamespace: "uor_foundation::kernel", rustType: "Space::Kernel", tsProjection: "kernel" },
  { id: "space:bridge", label: "Bridge",      category: "Space", description: "Kernel-computed verification & resolution", humanDescription: "The middleware layer — turns raw kernel math into queries, proofs, and verifiable observations.", foundationPath: "bridge", crateNamespace: "uor_foundation::bridge", rustType: "Space::Bridge", tsProjection: "bridge" },
  { id: "space:user",   label: "User",        category: "Space", description: "Application-facing surface", humanDescription: "The application layer — types, morphisms, and state that users interact with directly.", foundationPath: "user", crateNamespace: "uor_foundation::user", rustType: "Space::User", tsProjection: "user" },
  { id: "space:enforcement", label: "Enforcement", category: "Space", description: "Validation and constraint enforcement", humanDescription: "The guardian layer — ensures all data and transformations comply with declared rules.", foundationPath: "enforcement", crateNamespace: "uor_foundation::enforcement", rustType: "Module", tsProjection: "enforcement" },
];

// ── 3. Core Types (Kernel) ──────────────────────────────────────

export const CORE_TYPES: UorAtom[] = [
  { id: "type:address",     label: "Address",     category: "CoreType", description: "Content-addressed identity", humanDescription: "A unique fingerprint derived from data content — same data always produces the same address.", foundationPath: "kernel/address", crateNamespace: "uor_foundation::kernel::address", rustType: "Address", tsProjection: "kernel/address" },
  { id: "type:glyph",       label: "Glyph",       category: "CoreType", description: "Human-readable address encoding", humanDescription: "A visual Braille representation of an address that humans can read and compare at a glance.", foundationPath: "kernel/address", crateNamespace: "uor_foundation::kernel::address", rustType: "Glyph", tsProjection: "kernel/address" },
  { id: "type:datum",       label: "Datum",        category: "CoreType", description: "Atomic data quantum", humanDescription: "The smallest unit of structured data — a single fact or value with a defined schema.", foundationPath: "kernel/schema", crateNamespace: "uor_foundation::kernel::schema", rustType: "Datum", tsProjection: "kernel/schema" },
  { id: "type:term",        label: "Term",         category: "CoreType", description: "Schema term expression", humanDescription: "A typed expression in the schema language — variables, applications, and literals.", foundationPath: "kernel/schema", crateNamespace: "uor_foundation::kernel::schema", rustType: "Term", tsProjection: "kernel/schema" },
  { id: "type:triad",       label: "Triad",        category: "CoreType", description: "Subject-predicate-object triple", humanDescription: "The fundamental relationship unit: X relates-to Y via predicate Z.", foundationPath: "kernel/schema", crateNamespace: "uor_foundation::kernel::schema", rustType: "Triad", tsProjection: "kernel/schema" },
  { id: "type:literal",     label: "Literal",      category: "CoreType", description: "Literal value in schema", humanDescription: "A concrete value — a number, string, or boolean embedded directly in the schema.", foundationPath: "kernel/schema", crateNamespace: "uor_foundation::kernel::schema", rustType: "Literal", tsProjection: "kernel/schema" },
  { id: "type:ring",        label: "Ring",         category: "CoreType", description: "Ring structure (W16/W32)", humanDescription: "An algebraic ring — a set with addition and multiplication that obey specific laws.", foundationPath: "kernel/schema", crateNamespace: "uor_foundation::kernel::schema", rustType: "W16Ring", tsProjection: "kernel/schema" },
  { id: "type:operation",   label: "Operation",    category: "CoreType", description: "Named transformation on data", humanDescription: "A declared computation step — takes inputs and produces outputs according to rules.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "Operation", tsProjection: "kernel/op" },
  { id: "type:group",       label: "Group",        category: "CoreType", description: "Algebraic group structure", humanDescription: "A set with a reversible operation — every element has an inverse.", foundationPath: "kernel/op", crateNamespace: "uor_foundation::kernel::op", rustType: "Group", tsProjection: "kernel/op" },
  { id: "type:carry",       label: "Carry",        category: "CoreType", description: "Carry-bit propagation chain", humanDescription: "Tracks how arithmetic carries ripple through multi-byte computations.", foundationPath: "kernel/carry", crateNamespace: "uor_foundation::kernel::carry", rustType: "CarryChain", tsProjection: "kernel/carry" },
  { id: "type:cascade",     label: "Cascade",      category: "CoreType", description: "Cascade composition map", humanDescription: "A chain of transformations applied in sequence — each step feeds the next.", foundationPath: "kernel/cascade", crateNamespace: "uor_foundation::kernel::cascade", rustType: "CascadeMap", tsProjection: "kernel/cascade" },
  { id: "type:convergence", label: "Convergence",  category: "CoreType", description: "Convergence tower", humanDescription: "Tracks whether a sequence of refinements is approaching a stable result.", foundationPath: "kernel/convergence", crateNamespace: "uor_foundation::kernel::convergence", rustType: "ConvergenceTower", tsProjection: "kernel/convergence" },
  { id: "type:division",    label: "Division",     category: "CoreType", description: "Normed division algebra", humanDescription: "An algebraic structure where division is always possible — generalizes complex numbers.", foundationPath: "kernel/division", crateNamespace: "uor_foundation::kernel::division", rustType: "NormedDivisionAlgebra", tsProjection: "kernel/division" },
  { id: "type:effect",      label: "Effect",       category: "CoreType", description: "Side-effect descriptor", humanDescription: "Declares what a computation does beyond returning a value — writes, signals, mutations.", foundationPath: "kernel/effect", crateNamespace: "uor_foundation::kernel::effect", rustType: "Effect", tsProjection: "kernel/effect" },
  { id: "type:failure",     label: "Failure",      category: "CoreType", description: "Typed failure descriptor", humanDescription: "A structured error — describes what went wrong and how to potentially recover.", foundationPath: "kernel/failure", crateNamespace: "uor_foundation::kernel::failure", rustType: "Failure", tsProjection: "kernel/failure" },
  { id: "type:linear",      label: "Linear",       category: "CoreType", description: "Linear resource tracking", humanDescription: "Ensures a resource is used exactly once — prevents duplication and leaks.", foundationPath: "kernel/linear", crateNamespace: "uor_foundation::kernel::linear", rustType: "LinearResource", tsProjection: "kernel/linear" },
  { id: "type:predicate",   label: "Predicate",    category: "CoreType", description: "Boolean-valued type guard", humanDescription: "A yes/no question about data — used to filter, validate, or branch logic.", foundationPath: "kernel/predicate", crateNamespace: "uor_foundation::kernel::predicate", rustType: "Predicate", tsProjection: "kernel/predicate" },
  { id: "type:recursion",   label: "Recursion",    category: "CoreType", description: "Recursive computation bound", humanDescription: "Controls how deeply a self-referencing computation can nest before stopping.", foundationPath: "kernel/recursion", crateNamespace: "uor_foundation::kernel::recursion", rustType: "RecursiveComputation", tsProjection: "kernel/recursion" },
  { id: "type:reduction",   label: "Reduction",    category: "CoreType", description: "Rewrite/simplification rule", humanDescription: "A rule that simplifies complex expressions into simpler equivalent forms.", foundationPath: "kernel/reduction", crateNamespace: "uor_foundation::kernel::reduction", rustType: "ReductionRule", tsProjection: "kernel/reduction" },
  { id: "type:region",      label: "Region",       category: "CoreType", description: "Bounded address sub-space", humanDescription: "A defined zone within the address space — groups related data together.", foundationPath: "kernel/region", crateNamespace: "uor_foundation::kernel::region", rustType: "Region", tsProjection: "kernel/region" },
  { id: "type:stream",      label: "Stream",       category: "CoreType", description: "Ordered element sequence", humanDescription: "A flow of data elements arriving over time — like a pipe carrying values.", foundationPath: "kernel/stream", crateNamespace: "uor_foundation::kernel::stream", rustType: "Stream", tsProjection: "kernel/stream" },
  { id: "type:parallel",    label: "Parallel",     category: "CoreType", description: "Parallel task composition", humanDescription: "Runs multiple computations simultaneously and combines their results.", foundationPath: "kernel/parallel", crateNamespace: "uor_foundation::kernel::parallel", rustType: "ParallelComposition", tsProjection: "kernel/parallel" },
  // Bridge types
  { id: "type:proof",       label: "Proof",        category: "CoreType", description: "Verification witness", humanDescription: "Mathematical evidence that a claim is true — can be checked without re-doing the work.", foundationPath: "bridge/proof", crateNamespace: "uor_foundation::bridge::proof", rustType: "Proof", tsProjection: "bridge/proof" },
  { id: "type:derivation",  label: "Derivation",   category: "CoreType", description: "Content-addressed derivation chain", humanDescription: "A recorded sequence of steps showing exactly how a result was computed.", foundationPath: "bridge/derivation", crateNamespace: "uor_foundation::bridge::derivation", rustType: "Derivation", tsProjection: "bridge/derivation" },
  { id: "type:query",       label: "Query",        category: "CoreType", description: "Structured resolution request", humanDescription: "A formal question asked to the system — 'find me the thing matching these criteria.'", foundationPath: "bridge/query", crateNamespace: "uor_foundation::bridge::query", rustType: "Query", tsProjection: "bridge/query" },
  { id: "type:resolver",    label: "Resolver",     category: "CoreType", description: "Name-to-address resolution engine", humanDescription: "Translates human-readable names into content addresses — the system's DNS.", foundationPath: "bridge/resolver", crateNamespace: "uor_foundation::bridge::resolver", rustType: "Resolver", tsProjection: "bridge/resolver" },
  { id: "type:partition",   label: "Partition",    category: "CoreType", description: "Data space partition", humanDescription: "Divides a set into non-overlapping groups — every element belongs to exactly one part.", foundationPath: "bridge/partition", crateNamespace: "uor_foundation::bridge::partition", rustType: "Partition", tsProjection: "bridge/partition" },
  { id: "type:trace",       label: "Trace",        category: "CoreType", description: "Computation trace record", humanDescription: "A detailed log of every step in a computation — for debugging and auditing.", foundationPath: "bridge/trace", crateNamespace: "uor_foundation::bridge::trace", rustType: "ComputationTrace", tsProjection: "bridge/trace" },
  // User types
  { id: "type:context",     label: "Context",      category: "CoreType", description: "Scoped execution environment", humanDescription: "The environment a computation runs in — its variables, permissions, and state.", foundationPath: "user/state", crateNamespace: "uor_foundation::user::state", rustType: "Context", tsProjection: "user/state" },
  { id: "type:session",     label: "Session",      category: "CoreType", description: "Authenticated temporal scope", humanDescription: "A time-bounded authenticated interaction — tracks who is doing what and when.", foundationPath: "user/state", crateNamespace: "uor_foundation::user::state", rustType: "Session", tsProjection: "user/state" },
  { id: "type:transition",  label: "Transition",   category: "CoreType", description: "State machine edge", humanDescription: "A valid move from one state to another — the building block of workflows.", foundationPath: "user/state", crateNamespace: "uor_foundation::user::state", rustType: "Transition", tsProjection: "user/state" },
  { id: "type:typedef",     label: "TypeDef",      category: "CoreType", description: "Runtime type definition", humanDescription: "A declared data shape — specifies what fields and constraints a value must satisfy.", foundationPath: "user/type", crateNamespace: "uor_foundation::user::type_def", rustType: "TypeDefinition", tsProjection: "user/type" },
  { id: "type:frame",       label: "Frame",        category: "CoreType", description: "Execution stack frame", humanDescription: "A snapshot of the current execution context — like a bookmark in a running computation.", foundationPath: "user/state", crateNamespace: "uor_foundation::user::state", rustType: "Frame", tsProjection: "user/state" },
];

// ── 4. Morphism Types ───────────────────────────────────────────

export const MORPHISMS: UorAtom[] = [
  { id: "morph:transform",  label: "Transform",  category: "Morphism", description: "General structure-preserving map", humanDescription: "A function that reshapes data while preserving its essential structure.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "Transform", tsProjection: "user/morphism" },
  { id: "morph:isometry",   label: "Isometry",   category: "Morphism", description: "Distance-preserving bijection", humanDescription: "A perfect copy operation — preserves all distances and relationships exactly.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "Isometry", tsProjection: "user/morphism" },
  { id: "morph:embedding",  label: "Embedding",  category: "Morphism", description: "Injective structure map", humanDescription: "Places a smaller structure inside a larger one without losing information.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "Embedding", tsProjection: "user/morphism" },
  { id: "morph:action",     label: "Action",     category: "Morphism", description: "Group action on a set", humanDescription: "A symmetry operation applied to data — rotate, reflect, permute.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "Action", tsProjection: "user/morphism" },
  { id: "morph:composition",label: "Composition",category: "Morphism", description: "Sequential morphism chain", humanDescription: "Chains two transformations together — the output of the first feeds the second.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "Composition", tsProjection: "user/morphism" },
  { id: "morph:functor",    label: "Functor",    category: "Morphism", description: "Category-preserving map", humanDescription: "A transformation that preserves the structure between entire categories of objects.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "FunctorMorphism", tsProjection: "user/morphism" },
  { id: "morph:natural",    label: "NatTrans",   category: "Morphism", description: "Natural transformation", humanDescription: "A systematic way to convert between two functors — coherent across all objects.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "NaturalTransformation", tsProjection: "user/morphism" },
  { id: "morph:grounding",  label: "Grounding",  category: "Morphism", description: "Grounding map to concrete values", humanDescription: "Maps abstract symbols to concrete data — turns variables into actual values.", foundationPath: "user/morphism", crateNamespace: "uor_foundation::user::morphism", rustType: "GroundingMap", tsProjection: "user/morphism" },
];

// ── 5. Identity Pipeline Steps ──────────────────────────────────

export const IDENTITY_PIPELINE: UorAtom[] = [
  { id: "pipe:urdna2015",   label: "URDNA2015",   category: "IdentityPipeline", description: "RDF dataset canonicalization", humanDescription: "Normalizes data into a single canonical form — ensures identical content always produces identical bytes.", foundationPath: "bridge/derivation", crateNamespace: "uor_foundation::bridge::derivation", rustType: "DerivationStep", tsProjection: "bridge/derivation" },
  { id: "pipe:sha256",      label: "SHA-256",      category: "IdentityPipeline", description: "Cryptographic hash", humanDescription: "Produces a unique 256-bit fingerprint of any data — practically impossible to forge.", foundationPath: "kernel/address", crateNamespace: "uor_foundation::kernel::address", rustType: "Address", tsProjection: "kernel/address" },
  { id: "pipe:cid",         label: "CID",          category: "IdentityPipeline", description: "Content Identifier (multihash)", humanDescription: "A self-describing content address that includes the hash algorithm used.", foundationPath: "kernel/address", crateNamespace: "uor_foundation::kernel::address", rustType: "Address", tsProjection: "kernel/address" },
  { id: "pipe:ipv6",        label: "IPv6",         category: "IdentityPipeline", description: "128-bit routable address", humanDescription: "Maps content addresses to the IPv6 address space for network routing.", foundationPath: "kernel/address", crateNamespace: "uor_foundation::kernel::address", rustType: "Address", tsProjection: "kernel/address" },
  { id: "pipe:braille",     label: "Braille",      category: "IdentityPipeline", description: "Human-readable glyph encoding", humanDescription: "Encodes addresses as Braille characters for compact human-readable display.", foundationPath: "kernel/address", crateNamespace: "uor_foundation::kernel::address", rustType: "Glyph", tsProjection: "kernel/address" },
];

// ── 6. Algebraic Structures ────────────────────────────────────

export const ALGEBRAIC: UorAtom[] = [
  { id: "alg:ring",       label: "Ring",       category: "Algebraic", description: "R₈ = Z/256Z commutative ring", humanDescription: "The fundamental number system — 256 values with addition and multiplication that wrap around.", foundationPath: "kernel/schema", crateNamespace: "uor_foundation::kernel::schema", rustType: "Ring", tsProjection: "kernel/schema" },
  { id: "alg:monoidal",   label: "Monoidal",   category: "Algebraic", description: "Monoidal category structure", humanDescription: "A way to combine things in parallel with an identity element — like tensor products.", foundationPath: "kernel/monoidal", crateNamespace: "uor_foundation::kernel::monoidal", rustType: "MonoidalCategory", tsProjection: "kernel/monoidal" },
  { id: "alg:operad",     label: "Operad",     category: "Algebraic", description: "Multi-input composition algebra", humanDescription: "A structure for composing operations with multiple inputs — generalizes function composition.", foundationPath: "kernel/operad", crateNamespace: "uor_foundation::kernel::operad", rustType: "Operad", tsProjection: "kernel/operad" },
  { id: "alg:linear",     label: "Linear",     category: "Algebraic", description: "Linear map over ring", humanDescription: "A transformation that preserves addition and scaling — the backbone of linear algebra.", foundationPath: "kernel/linear", crateNamespace: "uor_foundation::kernel::linear", rustType: "LinearResource", tsProjection: "kernel/linear" },
  { id: "alg:recursion",  label: "Recursion",  category: "Algebraic", description: "Recursive fixed-point scheme", humanDescription: "A computation that calls itself with smaller inputs until reaching a base case.", foundationPath: "kernel/recursion", crateNamespace: "uor_foundation::kernel::recursion", rustType: "RecursiveComputation", tsProjection: "kernel/recursion" },
  { id: "alg:reduction",  label: "Reduction",  category: "Algebraic", description: "Rewrite / simplification rule", humanDescription: "A rule that replaces complex patterns with simpler equivalent ones.", foundationPath: "kernel/reduction", crateNamespace: "uor_foundation::kernel::reduction", rustType: "ReductionPipeline", tsProjection: "kernel/reduction" },
];

// ── 7. Observables ──────────────────────────────────────────────

export const OBSERVABLES: UorAtom[] = [
  { id: "obs:observable",  label: "Observable",  category: "Observable", description: "Reactive observation stream", humanDescription: "A value that can be watched for changes — notifies subscribers when it updates.", foundationPath: "bridge/observable", crateNamespace: "uor_foundation::bridge::observable", rustType: "Observable", tsProjection: "bridge/observable" },
  { id: "obs:metric",      label: "Metric",      category: "Observable", description: "Metric measurement", humanDescription: "A numerical measurement along a defined axis — distance, curvature, entropy.", foundationPath: "bridge/observable", crateNamespace: "uor_foundation::bridge::observable", rustType: "MetricObservable", tsProjection: "bridge/observable" },
  { id: "obs:spectral",    label: "Spectral",    category: "Observable", description: "Spectral gap analysis", humanDescription: "Measures the gap between eigenvalues — reveals structural properties of the system.", foundationPath: "bridge/observable", crateNamespace: "uor_foundation::bridge::observable", rustType: "SpectralObservable", tsProjection: "bridge/observable" },
  { id: "obs:entropy",     label: "Entropy",     category: "Observable", description: "Information entropy measure", humanDescription: "Quantifies uncertainty or information content — higher means more unpredictable.", foundationPath: "bridge/observable", crateNamespace: "uor_foundation::bridge::observable", rustType: "EntropyObservable", tsProjection: "bridge/observable" },
  { id: "obs:convergence", label: "Convergence", category: "Observable", description: "Convergence tracking", humanDescription: "Monitors whether an iterative process is stabilizing toward a final answer.", foundationPath: "bridge/observable", crateNamespace: "uor_foundation::bridge::observable", rustType: "ConvergenceObservable", tsProjection: "bridge/observable" },
];

// ── 8. Certificates ─────────────────────────────────────────────

export const CERTIFICATES: UorAtom[] = [
  { id: "cert:certificate",  label: "Certificate",  category: "Certificate", description: "Trust assertion binding", humanDescription: "A signed statement binding an identity to a claim — the foundation of trust.", foundationPath: "bridge/cert", crateNamespace: "uor_foundation::bridge::cert", rustType: "Certificate", tsProjection: "bridge/cert" },
  { id: "cert:transform",    label: "TransformCert", category: "Certificate", description: "Certified transformation", humanDescription: "Proves a transformation was applied correctly — auditable computation.", foundationPath: "bridge/cert", crateNamespace: "uor_foundation::bridge::cert", rustType: "TransformCertificate", tsProjection: "bridge/cert" },
  { id: "cert:isometry",     label: "IsometryCert",  category: "Certificate", description: "Certified distance preservation", humanDescription: "Proves that a copy operation preserved all structural properties.", foundationPath: "bridge/cert", crateNamespace: "uor_foundation::bridge::cert", rustType: "IsometryCertificate", tsProjection: "bridge/cert" },
  { id: "cert:geodesic",     label: "GeodesicCert",  category: "Certificate", description: "Certified shortest path", humanDescription: "Proves that a computed path is genuinely the shortest route.", foundationPath: "bridge/cert", crateNamespace: "uor_foundation::bridge::cert", rustType: "GeodesicCertificate", tsProjection: "bridge/cert" },
  { id: "cert:chain",        label: "CertChain",     category: "Certificate", description: "Certificate chain of trust", humanDescription: "A sequence of certificates where each one vouches for the next.", foundationPath: "bridge/cert", crateNamespace: "uor_foundation::bridge::cert", rustType: "CertificateChain", tsProjection: "bridge/cert" },
  { id: "cert:session",      label: "SessionCert",   category: "Certificate", description: "Session authentication cert", humanDescription: "Proves a session was legitimately established and authenticated.", foundationPath: "bridge/cert", crateNamespace: "uor_foundation::bridge::cert", rustType: "SessionCertificate", tsProjection: "bridge/cert" },
];

// ── 9. Enforcement ──────────────────────────────────────────────

export const ENFORCEMENT: UorAtom[] = [
  { id: "enf:validated",     label: "Validated",     category: "Enforcement", description: "Validated enforcement datum", humanDescription: "Data that has passed all validation rules — proven compliant.", foundationPath: "enforcement", crateNamespace: "uor_foundation::enforcement", rustType: "Validated", tsProjection: "enforcement" },
  { id: "enf:assertion",     label: "Assertion",     category: "Enforcement", description: "Runtime assertion check", humanDescription: "A condition that must be true — the system halts if it fails.", foundationPath: "enforcement", crateNamespace: "uor_foundation::enforcement", rustType: "Assertion", tsProjection: "enforcement" },
  { id: "enf:grounding",     label: "Grounding",     category: "Enforcement", description: "Variable grounding check", humanDescription: "Ensures all abstract variables are bound to concrete values before execution.", foundationPath: "enforcement", crateNamespace: "uor_foundation::enforcement", rustType: "Grounding", tsProjection: "enforcement" },
  { id: "enf:fiberbudget",   label: "FiberBudget",   category: "Enforcement", description: "Resource budget enforcement", humanDescription: "Limits how many resources a computation can consume — prevents runaway processes.", foundationPath: "enforcement", crateNamespace: "uor_foundation::enforcement", rustType: "EnforcementFiberBudget", tsProjection: "enforcement" },
  { id: "enf:term",          label: "EnfTerm",       category: "Enforcement", description: "Enforcement term expression", humanDescription: "A formal expression in the enforcement language — conditions and constraints.", foundationPath: "enforcement", crateNamespace: "uor_foundation::enforcement", rustType: "EnforcementTerm", tsProjection: "enforcement" },
];

// ── Complete Atom Table ─────────────────────────────────────────

export const ALL_ATOMS: UorAtom[] = [
  ...PRIMITIVE_OPS,
  ...SPACES,
  ...CORE_TYPES,
  ...MORPHISMS,
  ...IDENTITY_PIPELINE,
  ...ALGEBRAIC,
  ...OBSERVABLES,
  ...CERTIFICATES,
  ...ENFORCEMENT,
];

/** O(1) lookup by atom ID. */
export const ATOM_INDEX: ReadonlyMap<string, UorAtom> = new Map(
  ALL_ATOMS.map((a) => [a.id, a]),
);

/** Verify an atom ID exists in the registry. */
export function isValidAtom(id: string): boolean {
  return ATOM_INDEX.has(id);
}
