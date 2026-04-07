

# Single Canonical Codec: `encode()` / `decode()` — The Elegant Solution

## Architecture Assessment

After auditing the full codebase, here's the current state:

**SHA-256 implementations**: 3 separate `crypto.subtle.digest("SHA-256")` calls — in `src/lib/uor-canonical.ts`, `src/modules/uns/core/address.ts`, and inside `computeCid()`. All produce identical output (Web Crypto is a W3C standard, deterministic by spec). The WASM Rust crate does **not** expose SHA-256 — it only provides ring operations (neg, bnot, classify, factorize, popcount, basis).

**Encoding entry points**: 129 files import `singleProofHash` directly. Only 2 go through `computeAndRegister` (which adds WASM ring enrichment + registry storage). This means ~127 files produce addresses that can never be decoded back to content.

**The WASM question**: Should we add SHA-256 to the Rust crate? **No.** Web Crypto's SHA-256 is already canonical (hardware-accelerated, W3C-specified, identical output everywhere). The WASM crate's value is the **ring algebra** — the coherence verification layer that no browser API provides. Trying to move SHA-256 into WASM would add complexity without improving correctness, and would be slower than the native Web Crypto implementation.

The elegant architecture: **Web Crypto provides the hash. WASM Rust provides the algebra. The codec unifies both.**

## The Single Entry Point

**New file: `src/lib/uor-codec.ts`** — Two functions. That's it.

```typescript
import { computeAndRegister, lookupReceipt } from "@/modules/oracle/lib/receipt-registry";

// THE universal encoder. Content → Address.
export const encode = computeAndRegister;

// THE universal decoder. Address → Content.  
export function decode(address: string): unknown | undefined {
  return lookupReceipt(address)?.source;
}
```

Every file that currently calls `singleProofHash` directly and produces user-visible addresses should migrate to `encode()`. Internal computations (hologram projections, polytree evolution, trust graph) can keep using `singleProofHash` since they don't need registry storage.

## Human-Readable Addressing: Triword + IPv6

The triword system (3 bytes → 16.7M addresses) is already elegant but could be stronger. The IPv6 space (80 content bits) gives far more uniqueness. The solution: **triwords ARE the human layer over IPv6**.

**Extend triwords to 5 words (40 bits = 1 trillion addresses)** for higher collision resistance while keeping the human interface. The first 3 words remain the triality coordinates (Observer · Observable · Context), and 2 optional "precision" words narrow the address further — like a postal code after a city name.

But this is a future enhancement. For now, 3-word (24-bit) addresses with the full CID as the authoritative reference is correct and ships today.

## What Changes

### 1. Create the codec facade
**New file: `src/lib/uor-codec.ts`**
- `encode(obj)` → calls `computeAndRegister`, returns `EnrichedReceipt` with triword, CID, IPv6, WASM ring data
- `decode(address)` → looks up by triword, CID, or derivation ID, returns original source object
- `isEncoded(address)` → check if an address exists in the registry

### 2. Migrate high-impact producers to `encode()`
These files produce user-visible addresses and should register their content for decode:

| File | Current | Change |
|------|---------|--------|
| `src/modules/certificate/generate.ts` | `singleProofHash()` | `encode()` — certificates decodable |
| `src/modules/oracle/pages/OraclePage.tsx` | `computeAndRegister()` | `encode()` — same function, canonical import |
| `src/modules/observable/observable.ts` | `singleProofHash()` | `encode()` — observables decodable |
| `src/lib/uor-content-registry.ts` | `singleProofHash()` | `encode()` — all site content decodable |
| `src/modules/schema-org/functor.ts` | `singleProofHash()` | `encode()` — schema.org mappings decodable |

### 3. Update ResolvePage to use `decode()`
**File: `src/modules/oracle/pages/ResolvePage.tsx`**
- Import `encode` and `decode` from `@/lib/uor-codec` instead of direct registry calls
- Same UX, canonical imports

### 4. Add a UNS explainer page
**New file: `src/pages/UnsExplainer.tsx`** — A page explaining how UNS works as "DNS for meaning":
- UNS vs DNS comparison (location-based vs content-based)
- How triword addresses work (Observer · Observable · Context)
- The encode/decode cycle with a live demo widget
- Link from the main navigation

## Files Changed

| File | Change |
|------|--------|
| `src/lib/uor-codec.ts` | **New** — `encode()` / `decode()` / `isEncoded()` |
| `src/modules/certificate/generate.ts` | Use `encode()` |
| `src/modules/oracle/pages/OraclePage.tsx` | Use `encode()` |
| `src/modules/oracle/pages/ResolvePage.tsx` | Use `encode()` / `decode()` |
| `src/modules/observable/observable.ts` | Use `encode()` |
| `src/lib/uor-content-registry.ts` | Use `encode()` |
| `src/modules/schema-org/functor.ts` | Use `encode()` |
| `src/pages/UnsExplainer.tsx` | **New** — UNS explainer page |

