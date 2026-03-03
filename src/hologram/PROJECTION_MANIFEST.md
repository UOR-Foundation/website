# Projection Manifest — The Universal Integration Pattern

> **One pattern. Every protocol. Every AI model. Every application.**
>
> This document defines how ANY external system — AI model, protocol,
> application, or service — is integrated into the Hologram. There is
> exactly one way to do it: **as a projection**.

---

## The Core Principle

```
╔══════════════════════════════════════════════════════════════╗
║  The Hologram is a 256-bit canonical surface.               ║
║  Every external system is a VIEWING ANGLE on that surface.  ║
║  Integration = registering a new projection function.       ║
║                                                             ║
║  hash_bytes → projection_function → protocol_native_output  ║
╚══════════════════════════════════════════════════════════════╝
```

A "projection" is a **pure, deterministic function** that maps
canonical hash bytes to a protocol-native representation. Nothing
more. No state. No side effects. No network calls. Just math.

---

## The Three Integration Tiers

### Tier 1: Identity Projection (Stateless, Pure)

**For:** Protocols, standards, address formats, identifiers.

A Tier 1 projection is a `HologramSpec` registered in the projection
registry. It maps `ProjectionInput → string` with zero dependencies.

```typescript
// src/modules/uns/core/hologram/specs.ts
import { registerSpec } from "./specs";

registerSpec("my-protocol", {
  name:       "my-protocol",
  spec:       "https://example.com/spec",
  fidelity:   "lossless",           // or "lossy" if truncating
  project:    (input) => {
    // Pure function: hash bytes → protocol string
    return `myproto:${input.hex.slice(0, 40)}`;
  },
  lossWarning: undefined,           // set if lossy
});
```

**Invariants:**
- Same input → same output, always
- No I/O, no network, no state
- Returns a string
- Registered once at module load

**Examples:** DID, ActivityPub, AT Protocol, OIDC, Bitcoin address,
Zcash address, GS1 SGTIN, WebFinger, IPFS CID, Ethereum address.

---

### Tier 2: UI Projection (Stateless, Visual)

**For:** Dashboard components, visual representations, data views.

A Tier 2 projection maps `ProjectionInput → React props` and is
rendered by `DynamicProjection`. It composes Tier 1 projections
into visual forms.

```typescript
// src/modules/hologram-ui/projection-registry.ts
import { registerUIProjection } from "./projection-registry";

registerUIProjection("ui:my-widget", {
  resolve: (input, overrides) => ({
    type: "ui:my-widget",
    props: {
      title: input.cid.slice(0, 8),
      value: input.hashBytes[0],
      ...overrides,
    },
  }),
});
```

**Invariants:**
- Same identity → same visual output
- Props are serializable (no functions, no closures)
- Rendered via `<DynamicProjection>`, never directly

---

### Tier 3: Platform Projection (Stateful, Bridged)

**For:** AI models, databases, external APIs, hardware.

A Tier 3 projection requires I/O and therefore MUST go through
`bridge.ts`. It adds a new adapter interface to `HologramPlatform`
and a concrete implementation in `bridge.ts`.

```
Step 1: Define the interface    → platform/index.ts
Step 2: Implement via bridge    → platform/bridge.ts
Step 3: Wrap with audited()     → automatic audit trail
Step 4: Access via getPlatform() → kernel code stays pure
```

```typescript
// Step 1: platform/index.ts — add the interface
export interface AiModelAdapter {
  infer(prompt: string, options?: InferOptions): Promise<InferResult>;
  embed(text: string): Promise<Float32Array>;
  models(): string[];
}

export interface HologramPlatform {
  // ... existing adapters ...
  ai: AiModelAdapter;           // ← new adapter
}

// Step 2: platform/bridge.ts — implement it
const aiAdapter: AiModelAdapter = {
  infer: audited("ai", "infer", "bidirectional",
    async (prompt, options) => {
      // Call external AI service through edge function
      const { data } = await supabase.functions.invoke("ai-infer", {
        body: { prompt, ...options },
      });
      return data;
    }),
  embed: audited("ai", "embed", "bidirectional",
    async (text) => { /* ... */ }),
  models: () => ["gemini-2.5-flash", "gpt-5-mini"],
};
```

**Invariants:**
- ALL I/O goes through `bridge.ts` — no exceptions
- Every method wrapped with `audited()` for monitoring
- Kernel code accesses via `getPlatform().ai.infer()`
- Zero direct npm imports in kernel (beyond `react`)

---

## The Anatomy of a Well-Formed Projection

```
┌─────────────────────────────────────────────────────────┐
│                    PROJECTION SPEC                       │
│                                                         │
│  name         : string    — unique protocol identifier   │
│  spec         : URL       — link to external standard    │
│  fidelity     : enum      — "lossless" | "lossy"        │
│  project()    : function  — pure: bytes → string        │
│  lossWarning  : string?   — what data is lost if lossy  │
│                                                         │
│  + coherence  : auto      — H-score computed from SAME  │
│                             bytes (unified projection)   │
└─────────────────────────────────────────────────────────┘
```

Every projection automatically receives a **coherence assessment**
(H-score, zone, Φ) because coherence is computed from the same
hash bytes that produce the identity string. The projection IS
the observation. No separate step needed.

---

## Integration Checklist

When adding ANY new system, follow this checklist:

```
□ 1. Classify: Tier 1 (pure), Tier 2 (visual), or Tier 3 (I/O)?
□ 2. If Tier 3: Add adapter interface to platform/index.ts
□ 3. If Tier 3: Implement in bridge.ts with audited() wrappers
□ 4. If Tier 1: Register HologramSpec in specs.ts
□ 5. If Tier 2: Register UI projection in projection-registry.ts
□ 6. Verify: `grep -rn 'from \"@/' src/hologram/` returns ONLY bridge.ts
□ 7. Verify: No new npm imports inside src/hologram/ (use bridge re-exports)
□ 8. Document the projection in this manifest
```

---

## Why This Pattern?

### Security — Minimal Attack Surface

Every external dependency enters through ONE file. The entire
surface area for attack is `bridge.ts` (~400 lines). Audit one
file, secure the entire kernel.

### Portability — Rewrite One File

To move the Hologram to a standalone repo, a native app, a
different cloud provider, or even an embedded system: rewrite
`bridge.ts`. Everything else is self-contained.

### Coherence — Mathematical Consistency

Every projection produces both identity AND coherence from the
same bytes. No system can diverge from the canonical hash. All
representations are provably derived from one truth.

### Composability — Projections Compose

Tier 2 projections compose Tier 1 projections. Tier 3 projections
can invoke Tier 1 projections internally. The pipeline flows in
one direction: `genesis → kernel → projection → bridge → world`.

---

## Anti-Patterns (What NOT to Do)

```
✗ Direct npm import inside hologram/     → Use bridge re-export
✗ API call inside kernel code            → Use platform adapter
✗ Stateful projection function           → Keep projections pure
✗ Framework-specific code in kernel      → Abstract through bridge
✗ Multiple bridge files                  → ONE gateway, always
✗ Circular dependency (kernel → bridge)  → Bridge imports kernel, never reverse
```

---

## Registered Projections (Current)

| Name | Tier | Fidelity | Description |
|------|------|----------|-------------|
| did | 1 | lossless | W3C Decentralized Identifier |
| activitypub | 1 | lossy | ActivityPub actor URI |
| atproto | 1 | lossy | AT Protocol DID |
| oidc | 1 | lossy | OpenID Connect subject |
| bitcoin | 1 | lossy | Bitcoin P2PKH address |
| zcash | 1 | lossy | Zcash transparent address |
| ethereum | 1 | lossy | Ethereum address (EIP-55) |
| gs1 | 1 | lossy | GS1 SGTIN |
| ipfs | 1 | lossless | IPFS CIDv1 |
| webfinger | 1 | lossy | WebFinger acct: URI |
| ipv6 | 1 | lossy | UOR IPv6 address |
| ui:stat-card | 2 | — | Statistical summary card |
| ui:data-table | 2 | — | Tabular data view |
| ui:metric-bar | 2 | — | Progress/metric bar |
| ui:info-card | 2 | — | Information card |
| ui:page-shell | 2 | — | Page layout container |
| ui:dashboard-grid | 2 | — | Grid layout |
| backend | 3 | — | Database/auth/functions |
| identity | 3 | — | SHA-256 hashing + PQC signing |
| gpu | 3 | — | WebGPU compute |
| storage | 3 | — | Encrypted key-value |
| compression | 3 | — | Triple codec |

---

## The Elegant Invariant

```
∀ system S that interacts with the Hologram:
  ∃ exactly one projection P such that:
    P: hash_bytes → S_native_representation
    P is registered in the projection registry OR
    P is an adapter in platform/index.ts
    P enters through bridge.ts if it requires I/O
```

**One surface. Many projections. Zero exceptions.**
