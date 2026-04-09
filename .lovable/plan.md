

# Self-Declared Virtual OS Kernel — UOR Engine as Root Authority

## Core Insight

The system already has the right architecture but declares its components externally (manually listing entries in `tech-stack.ts` and `manifest.ts`). The user's request is to **invert this**: let the UOR engine itself declare what functions are required, and derive the entire tech stack + bus manifest from that declaration.

The Rust crate already exports `list_namespaces()`, `list_enums()`, and `list_enforcement_structs()`. These are the engine's self-declaration of its ontological surface. The virtual OS kernel should be derived from these — not from a hand-curated list.

## Architecture: Engine-Derived Kernel

```text
┌─────────────────────────────────────────────┐
│            UOR Engine (WASM/TS)              │
│                                             │
│  list_namespaces() → 33 namespaces          │
│  list_enums()      → algebraic types        │
│  list_enforcement_structs() → constraints   │
│  ring ops          → 10 operations          │
│  verify            → critical identity      │
│  factorize/classify → analysis              │
│                                             │
│  ═══════════════════════════════════════     │
│  THE ENGINE IS THE DECLARATION.             │
│  Nothing exists that it does not declare.   │
└─────────────┬───────────────────────────────┘
              │ derives
              ▼
┌─────────────────────────────────────────────┐
│         Kernel Function Table               │
│                                             │
│  7 primitive functions (from ring ops):     │
│    1. ENCODE  (content → identity)          │
│    2. DECODE  (identity → verification)     │
│    3. COMPOSE (morphism composition)        │
│    4. STORE   (graph persistence)           │
│    5. RESOLVE (name → content)              │
│    6. OBSERVE (event subscription)          │
│    7. SEAL    (integrity proof)             │
│                                             │
│  These map 1:1 to the 7 Fano points.       │
│  Every higher function is a composition.    │
└─────────────┬───────────────────────────────┘
              │ instantiates
              ▼
┌─────────────────────────────────────────────┐
│         Minimal Tech Stack                  │
│  (one framework per kernel function)        │
│                                             │
│  ENCODE:   Web Crypto + jsonld              │
│  DECODE:   UOR Engine (WASM)                │
│  COMPOSE:  Pure functions (no framework)    │
│  STORE:    Oxigraph (graph) + IndexedDB     │
│  RESOLVE:  UNS (built-in)                   │
│  OBSERVE:  EventTarget (native API)         │
│  SEAL:     singleProofHash (built-in)       │
│                                             │
│  UI Shell: React + Vite + Tailwind          │
│  (presentation layer, not kernel)           │
└─────────────────────────────────────────────┘
```

## What Changes

### 1. New file: `src/modules/engine/kernel-declaration.ts`

The engine self-declares its kernel function table. This is the root authority — every bus operation, tech stack entry, and module must trace back to one of these 7 kernel functions.

Each kernel function is defined as:
- **Name**: The primitive operation
- **Ring basis**: Which ring operation(s) it derives from
- **Fano point**: Its position in the 7-point projective plane
- **Required framework**: The ONE framework that implements it
- **Verification**: How to prove it works

The 7 kernel functions are derived from the engine's own `list_namespaces()` output, grouped by algebraic role:

| # | Kernel Function | Derives From | Fano Point | Framework |
|---|---|---|---|---|
| 0 | `encode` | neg, bnot → SHA-256 | P₀ | Web Crypto API |
| 1 | `decode` | verifyCriticalIdentity | P₁ | UOR Engine |
| 2 | `compose` | mul, add → morphism | P₂ | Pure TS (no dep) |
| 3 | `store` | xor, and → quad graph | P₃ | Oxigraph |
| 4 | `resolve` | succ, pred → traversal | P₄ | UNS (built-in) |
| 5 | `observe` | or → event union | P₅ | EventTarget |
| 6 | `seal` | all ops → proof | P₆ | singleProofHash |

### 2. Modify: `src/modules/boot/tech-stack.ts`

Add a `kernelFunction` field to `StackEntry` linking each framework to the kernel function it serves. Entries that cannot trace to a kernel function are marked `presentation` (UI layer) or `optimization` (performance tier).

Add a `validateMinimality()` function that ensures:
- No two `critical` entries share the same `kernelFunction`
- Every kernel function has exactly one framework
- No orphan entries exist (every entry traces to a kernel function or is explicitly `presentation`/`optimization`)

### 3. Modify: `src/modules/bus/manifest.ts`

Add a `kernelFunction` field to `ManifestModule` so every bus namespace traces back to a kernel primitive. The manifest becomes engine-derived rather than hand-curated.

### 4. Modify: `src/modules/boot/sovereign-boot.ts`

Add a Phase 0.25: "Kernel Declaration" that:
1. Reads `list_namespaces()` from the engine
2. Verifies the 7 kernel functions are present
3. Hashes the kernel declaration into the seal

This makes the seal **self-referential** — the engine declares what it needs, the boot verifies those declarations exist, and the seal proves the verification.

### 5. Modify: `src/modules/boot/EngineStatusIndicator.tsx`

Show the kernel function table in the diagnostic panel with their Fano mappings and framework assignments.

## Files to Create/Modify

| Action | File | Purpose |
|---|---|---|
| **Create** | `src/modules/engine/kernel-declaration.ts` | Self-declared kernel function table |
| Modify | `src/modules/boot/tech-stack.ts` | Add kernelFunction traceability + minimality check |
| Modify | `src/modules/bus/manifest.ts` | Link bus namespaces to kernel functions |
| Modify | `src/modules/boot/sovereign-boot.ts` | Add kernel declaration verification phase |
| Modify | `src/modules/boot/EngineStatusIndicator.tsx` | Display kernel function table |
| Modify | `src/modules/engine/index.ts` | Export kernel declaration |

## Minimality Audit

After implementation, the system can answer: "For every framework in the stack, which kernel function does it serve?" Any framework that cannot answer this question is either:
1. **Presentation layer** (React, Tailwind, Framer Motion) — explicitly tagged
2. **Optimization tier** (SIMD, compile cache) — explicitly tagged
3. **Redundant** — should be removed

This is the leanest possible architecture: 7 kernel functions, one framework each, everything else is either UI shell or performance optimization.

