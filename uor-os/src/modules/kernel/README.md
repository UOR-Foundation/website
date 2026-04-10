# Layer 0 — Kernel

Computation and algebra. The mathematical foundation of UOR OS.

## Modules

| Module | Description |
|--------|-------------|
| `engine/` | Ring R₈ computation engine with WASM acceleration |
| `ring-core/` | Algebraic ring operations, triadic decomposition, proofs |
| `axioms/` | Axiom registry — the rules the system must satisfy |
| `derivation/` | Auditable derivation chains (every computation is traceable) |
| `resolver/` | Entity resolution, partition computation, semantic deduplication |
| `morphism/` | Structure-preserving transformations between types |
| `state/` | State machines and the UOR type system |
| `observable/` | Observer pattern, event streams, geometric observables |
| `triad/` | *(Absorbed into ring-core)* — Re-export stub for backward compatibility |

## Dependency Rule

Kernel modules have **no upward dependencies**. They import only from `@/lib/` and each other.
