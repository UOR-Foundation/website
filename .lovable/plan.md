

# UOR Canonical Encoder/Decoder + Resolve Page

## Overview

Two deliverables:
1. **WASM-anchored receipts**: Every UOR receipt generated in the Oracle X-Ray must pass through the WASM Rust ring engine to produce an algebraic signature alongside the CID.
2. **`/resolve` page**: A clean, Google-search-style page where any UOR address (CID, derivation ID) can be pasted to decode and display the original data, all four identity forms, and WASM verification status.

## Current State

- Receipts are generated via `singleProofHash()` (URDNA2015 → SHA-256 → CID/Braille/IPv6) — pure TypeScript. The WASM ring engine (`bridge.classifyByte`, `bridge.factorize`, `bridge.verifyCriticalIdentity`) is used in the X-Ray *display* but not embedded in the receipt itself.
- No `/resolve` route exists. Receipt badges are hover-only tooltips with no navigation.
- No shared receipt registry exists for cross-page lookup.

## Plan

### 1. Receipt Registry Module

**New file: `src/modules/oracle/lib/receipt-registry.ts`**

A module-level `Map<string, { source: unknown; receipt: EnrichedReceipt }>` that stores each receipt's original JSON-LD object keyed by CID. This allows the Resolve page to look up and re-derive any receipt.

```typescript
interface EnrichedReceipt {
  cid: string;
  derivationId: string;
  glyph: string;
  ipv6: string;
  nquads: string;
  ringByte: number;
  ringPartition: string;
  ringFactors: number[];
  ringCriticalIdentity: boolean;
  wasmEngine: string | null; // e.g. "uor-foundation v0.1.0" or null if TS fallback
}
```

### 2. WASM-Anchor Receipt Generation

**File: `OraclePage.tsx`** — Update the async receipt generation block (~lines 318-379):

- After each `singleProofHash()` call, take `hashBytes[0]` and run:
  - `bridge.classifyByte(byte)` → partition
  - `bridge.factorize(byte)` → prime factors
  - `bridge.verifyCriticalIdentity(byte)` → boolean
  - `bridge.engineType()` → "wasm" or "typescript"
  - `bridge.crateVersion()` → version string
- Extend `UorReceipt` to include `ringByte`, `ringPartition`, `ringFactors`, `ringVerified`, `engine`.
- Store source object + enriched receipt in the registry.

### 3. Clickable Receipt Badges

**File: `OraclePage.tsx`** — Update `ReceiptBadge` component:

- Import `useNavigate` from react-router-dom.
- On click, navigate to `/resolve?cid={cid}`.
- Add pointer cursor and subtle hover glow.

### 4. Resolve Page

**New file: `src/modules/oracle/pages/ResolvePage.tsx`**

Layout (dark theme, matching Oracle):

- **Empty state**: Centered search bar with placeholder "Paste a CID or derivation ID…", UOR glyph above, subtle tagline below.
- **On submit**: Look up CID in the registry. If found, display:
  - **Original Data**: Pretty-printed JSON-LD of the source object.
  - **Identity**: All four forms (CID, derivation ID, Braille glyph, IPv6).
  - **WASM Verification**: Ring byte, partition, factors, critical identity, engine version.
- **If not found**: Allow the user to paste raw JSON and encode it live — run `singleProofHash()` + WASM ring on the input, display all identity forms. This makes the page a universal encoder/decoder.
- **Re-derive button**: Always re-computes from the source object to prove determinism (same input → same output).

### 5. Route Registration

**File: `App.tsx`** — Add:
```
const ResolvePage = lazy(() => import("@/modules/oracle/pages/ResolvePage"));
<Route path="/resolve" element={<ResolvePage />} />
```

### 6. Minimal CSS

**File: `index.css`** — Add `.resolve-search-input` styling (large centered input, dark glass bg) and `.resolve-identity-card` for the result panels.

## Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/receipt-registry.ts` | New — shared receipt store |
| `src/modules/oracle/pages/OraclePage.tsx` | Enrich receipts with WASM ring data, store in registry, make badges clickable |
| `src/modules/oracle/pages/ResolvePage.tsx` | New — the resolve/encode/decode page |
| `src/App.tsx` | Add `/resolve` route |
| `src/index.css` | Resolve page styles |

