# Architecture

This document covers the internal design of UOR OS for contributors and integrators.

## Tri-Space Ontology

The system organizes all objects into three ontological spaces, following the UOR Foundation specification:

| Space | Prefixes | Purpose |
|-------|----------|---------|
| **Kernel** | `u:`, `schema:`, `op:` | Algebraic primitives — the ring, schemas, and operations |
| **Bridge** | `query:`, `resolver:`, `observable:`, `proof:`, `derivation:`, `trace:`, `cert:` | Transformations between kernel objects and user-facing entities |
| **User** | `type:`, `morphism:`, `state:` | Application-level types, structure-preserving maps, and state machines |

The namespace registry (`src/modules/namespace-registry.ts`) maps these 14 canonical prefixes to runtime modules.

## Ring R₈

The computation engine operates over R₈ = F₂[x]/(x⁸+1), a 256-element finite ring where every byte is a valid element. This gives us:

- **Deterministic content addressing** — Hash any byte sequence to a ring element, then map to CID → IPv6 → Unicode glyph.
- **Algebraic verification** — Addition and multiplication are closed operations; every computation result can be checked independently.
- **Triadic decomposition** — Elements decompose into (observer, process, object) triples via popcount stratification.

The ring is implemented in both TypeScript (`kernel/ring-core/`) and Rust/WASM (`lib/wasm/`).

## Content Addressing Pipeline

```
Raw Bytes → SHA-256 → CID (multihash) → IPv6 Address → Braille → Unicode Glyph
```

Every object in the system follows this pipeline. The result is a canonical, human-inspectable address. The `identity/addressing/` module implements the full chain; the `identity/qr-cartridge/` module encodes addresses as scannable QR codes.

## Module Lifecycle

1. **Boot** — `platform/boot/sovereign-boot.ts` initializes the WASM runtime and seals the computation engine.
2. **Bus Init** — `platform/bus/` sets up the service mesh with timing and logging middleware.
3. **Module Registration** — Each module registers its RPC handlers with the bus via side-effect imports in `platform/bus/modules/`.
4. **Lazy Load** — UI-heavy modules (oracle, quantum, atlas) are code-split via `React.lazy()` and loaded on first navigation.

## Service Bus (RPC)

All inter-module communication goes through the bus:

```typescript
import { bus } from "@/modules/platform/bus";

// Call a registered handler
const result = await bus.call("kernel/derive", { content: "hello" });

// Register a handler
bus.register("mymodule/process", async (params) => {
  return { ok: true, data: processData(params) };
});
```

The bus supports middleware (timing, logging, auth), batched calls, and introspection (`bus.listMethods()`).

## Derivation Chains

Every computation produces a derivation record:

```typescript
{
  derivationId: string,     // Content-addressed ID of this step
  parentId: string | null,  // Previous step in the chain
  operation: string,        // What was done
  inputs: CID[],            // Input content addresses
  output: CID,              // Output content address
  timestamp: string,        // ISO 8601
  witness: string,          // Cryptographic witness
}
```

Chains are append-only and verifiable. The `kernel/derivation/` module manages creation and validation; the `intelligence/epistemic/` module grades chains for epistemic quality (A through F).

## WASM Integration

Performance-critical ring operations run in WebAssembly. The bridge is at `lib/wasm/uor-bridge.ts`:

```typescript
import { loadWasm } from "@/lib/wasm/uor-bridge";

await loadWasm();  // Loads the .wasm binary, falls back to JS if unavailable
```

The WASM module is compiled from the Rust crate at `src-tauri/` and provides identical semantics to the TypeScript implementation.

## Encryption Model

- **At rest** — Sovereign Vault uses AES-256-GCM with per-slot keys derived from user credentials.
- **In transit** — Messenger uses ML-KEM-768 (post-quantum) for key exchange, then AES-256-GCM for message encryption.
- **Key storage** — Keys never leave the device. The vault is sealed with a master key derived from the user's passphrase via Argon2id.

## Data Layer

The knowledge graph stores RDF-compatible triples:

```
(subject: CID, predicate: IRI, object: CID | Literal)
```

Backed by GrafeoDB (in-browser) with SPARQL query support. JSON-LD is the serialization format for import/export. All triples are content-addressed — modifying a triple produces a new triple with a new CID, preserving the original.

## Edge Functions

47 serverless functions in `supabase/functions/` handle operations that require a backend: AI model proxying, matrix bridge, audio transcoding, certificate issuance. See `docs/EDGE-FUNCTIONS.md` for the full index.
