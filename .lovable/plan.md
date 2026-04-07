

# Assessment: Canonical Codec + UNS Vision Alignment

## Current State — What's Already Working

The canonical codec (`src/lib/uor-codec.ts`) is now the single entry point. Every high-impact module (certificates, observables, Oracle, schema-org, content-registry) routes through `encode()` / `decode()`. The pipeline is:

```text
Content → URDNA2015 → SHA-256 → WASM Ring → Registry → 4 address forms
                                                         ├─ derivationId (256-bit, lossless)
                                                         ├─ CID (IPFS interop)
                                                         ├─ IPv6 ULA (80-bit routing)
                                                         └─ Triword (24-bit human)
```

This is fully aligned with the UNS vision on uor.foundation/projects/uns, which states: *"Every resource gets a real, routable IPv6 address derived from its content."*

## IPv6 as the Base Addressing System — Already There

The `/48` UOR prefix (`fd00:0075:6f72::/48`) is already the base layer. From the 256-bit SHA-256 hash:
- **80 content bits** fill 5 IPv6 hextets → 2^80 = ~1.2 quintillion unique addresses
- The triword is a human-readable projection of the **first 24 bits** of that same hash

The hierarchy is already correct:
```text
IPv6 (80 bits)  ← base addressing (machine-routable)
  └─ Triword (24 bits) ← human layer (first 3 bytes = subset of IPv6 content bytes)
```

Both are derived from the same SHA-256 hash, through the same `encode()` entry point. The triword's 3 bytes are literally the first 3 of the 10 IPv6 content bytes. No misalignment.

## UNS Vision Compatibility — Service by Service

From the UNS project page, the eleven services map to the current codec as follows:

| UNS Service | Current Status | Notes |
|---|---|---|
| **Resolver** | Implemented | `decode()` resolves triword/CID/derivationId → content |
| **Shield** | Future | Ring algebra (WASM) provides mathematical pattern analysis foundation |
| **Cache** | Future | Content-addressing = cache-by-CID, no stale data possible |
| **Compute** | Future | Every `encode()` already produces a verifiable trace (receipt) |
| **Store** | Partial | Registry is in-memory; persistent store needs backend |
| **Trust** | Partial | Certificates + WASM ring verification exist |
| **Conduit/Mesh/Agent** | Future | Network layer not yet implemented |

The codec is the correct foundation for all of these. No architectural changes needed.

## What Could Be Improved

### 1. Make IPv6 more prominent in the UNS Explainer page

The current `/uns` explainer page lists IPv6 as one of several machine-layer identifiers. Given your preference for IPv6 as the base, it should be promoted to the primary display — with the triword shown as "the human name for this IPv6 address."

### 2. Add IPv6 lookup to `decode()`

Currently `decode()` accepts triword, CID, or derivation ID. It should also accept IPv6 addresses (`fd00:0075:6f72:...`) since that's the base addressing system. This requires indexing registry entries by their IPv6 address too.

### 3. Surface the IPv6 → Triword relationship

Show users that the triword IS the first 3 bytes of the IPv6 content section. This makes the addressing hierarchy intuitive: the triword is a "shorthand" for the full IPv6 address, like saying "San Francisco" instead of "37.7749° N, 122.4194° W."

## Plan

### File: `src/modules/oracle/lib/receipt-registry.ts`
- In `computeAndRegister()`, also index by IPv6 address: `registry.set(enriched.ipv6, entry)`
- In `lookupReceipt()`, add IPv6 detection (starts with `fd00:0075:6f72`) for direct lookup

### File: `src/pages/UnsExplainer.tsx`
- Restructure the page to position IPv6 as the base addressing layer
- Add a section showing the IPv6 → Triword relationship visually: "Your content's IPv6 is `fd00:0075:6f72:a3b1:...` — its human name is `meadow · steep · keep`"
- Update the DNS vs UNS table: change "Machine layer" UNS entry to emphasize IPv6 as primary, CID as interop
- Add the eleven UNS services overview (from the foundation page) as a roadmap section

### File: `src/modules/oracle/pages/ResolvePage.tsx`
- Accept IPv6 addresses as input in the resolve bar (auto-detect `fd00:` prefix)
- Display IPv6 more prominently in results — show it as the "base address" with triword as the human label above it

