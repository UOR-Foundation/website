## Goal

Turn the "See it work" demo on `/framework` into a true **encode ↔ decode round-trip**, so a visitor can see — not just read — that:

1. **Encode**: any object → one deterministic address derived from its own bytes.
2. **Decode**: that address → exactly the original object back.
3. **Determinism**: re-encoding the decoded object produces the same address.

This directly backs the claim that "data carries its own verifiable identity, no registry, no middleman."

Also fix the current schema.org error visible in the screenshot
(`Dereferencing a URL did not result in a valid JSON-LD object … https://schema.org`),
which currently masks the demo whenever a preset is selected.

---

## What changes (UI only — `src/modules/core/pages/StandardPage.tsx`)

Replace the single 2-column box with a 3-stage pipeline laid out top-to-bottom inside the existing "See it work" section:

```text
[ Presets: Person  Book  Recipe  Event  Product  LocalBusiness  Movie ]

┌─ 1. Content ─────────────────┐   ┌─ 2. Address (derived from bytes) ─┐
│  JSON-LD textarea            │ → │ derivation ID  urn:uor:…sha256:…  │
│  (editable)                  │   │ Braille glyph  ⡕⢦⣀…              │
│                              │   │ IPv6           fd00:0075:…        │
│                              │   │ CID            bafy…              │
└──────────────────────────────┘   └───────────────────────────────────┘

┌─ 3. Decode ──────────────────────────────────────────────────────────┐
│ Paste any address above (or click "Use derived address") → resolves  │
│ to the original JSON-LD. Round-trip badge: ✓ identical / ✗ mismatch  │
│ Re-encode check: address(decoded) == address shown above             │
└──────────────────────────────────────────────────────────────────────┘
```

### Stage 1 — Content (unchanged textarea)
- Keep current presets, JSON validation, and `validateUorInput`.

### Stage 2 — Address panel
- On valid input, call `encode(parsed)` from `@/lib/uor-codec` (instead of `singleProofHash` directly). This is the canonical entry point and **auto-registers** source ↔ address, which is what makes Stage 3 work.
- Display four derived forms from the returned `EnrichedReceipt`:
  - `derivationId`
  - `glyph`
  - `ipv6`
  - `cid`
- Each is a copy-on-click chip (reuse the `CopyableCommand` pattern, smaller variant).

### Stage 3 — Decode panel
- One input: address (accepts triword, CID, or derivation ID — `decode()` already handles all three).
- "Use derived address" button auto-fills the address from Stage 2.
- On change, call `decode(address)` from `@/lib/uor-codec`.
  - If found → pretty-print the resolved JSON-LD in a read-only block.
  - If not found → friendly message: "Address not in this session's registry. Encode something above first, or paste an address derived in this browser."
- Round-trip verification: when both Stage 2 result and Stage 3 decoded value exist, run `encode(decoded)` and compare its `derivationId` to Stage 2's. Show a small badge:
  - ✓ "Round-trip verified — same content, same address."
  - ✗ "Mismatch" (should never trigger; defensive).

### Caption update
Replace the existing one-liner with two short lines that mirror the claim:

> Encode: content → address. Decode: address → content. The address comes from the data itself — no registry, no middleman.

---

## Fix the schema.org dereference error

Current `createDocumentLoader` in `src/lib/uor-canonical.ts` falls through to the XHR loader for `https://schema.org`, which fails CORS in the browser → the error in the screenshot.

Add a local fallback in that loader so any `https://schema.org` (with or without trailing slash, with or without `/docs/jsonldcontext.jsonld`) is served from a tiny inline context:

```ts
if (url === "https://schema.org" || url === "https://schema.org/" ||
    url.startsWith("https://schema.org/docs/jsonldcontext")) {
  return {
    contextUrl: null,
    documentUrl: url,
    document: { "@context": { "@vocab": "https://schema.org/" } },
  };
}
```

This is sufficient for canonicalization: every schema.org term resolves to `https://schema.org/<term>`, which is exactly what URDNA2015 needs for deterministic N-Quads. No network, no CORS, identical hashes across machines.

This is the only change outside `StandardPage.tsx`, and it is strictly a loader fallback — it does not alter canonicalization semantics for any object that already canonicalized successfully.

---

## Out of scope

- No changes to encoding/decoding internals, the WASM bridge, or the registry.
- No new routes, no backend, no schema changes.
- Decoding cross-session/cross-device is intentionally not promised here — the registry is local, and the demo's honest claim is "the address is derived from the bytes; anyone with the bytes recomputes the same address." That is exactly the round-trip we show.

---

## Files touched

1. `src/modules/core/pages/StandardPage.tsx` — rebuild `LiveDemo` into the 3-stage encode/decode/verify layout.
2. `src/lib/uor-canonical.ts` — add the schema.org local fallback inside `createDocumentLoader`.
