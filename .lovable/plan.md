

## Assessment & Refinements for the Semantic Web Bridge

### Current State: What's Working

The pipeline is **correctly wired end-to-end through the WASM Rust crate**:

```text
URL → Firecrawl scrape → extractSemantics(rawHtml)
    → Build uor:WebPage JSON-LD
    → encode(sourceObj)
        → computeAndRegister()
            → singleProofHash()        ← URDNA2015 → SHA-256
            → enrichWithWasm()          ← WASM Rust ring (uor-foundation crate)
                → bridge.classifyByte() ← WASM or TS fallback
                → bridge.factorize()
                → bridge.verifyCriticalIdentity()
    → Registry indexed by CID, derivationId, triword, IPv6
```

The WASM bridge (`src/lib/wasm/uor-bridge.ts`) correctly lazy-loads the compiled Rust `uor-foundation` crate with a mathematically identical TypeScript fallback. Every web page encoding passes through this dual engine. **No changes needed to the WASM pipeline.**

### Critical Issue: Broken Canonicality

The current `handleWebEncode` includes **two non-deterministic fields** in the hashed object:

1. **`uor:scrapedAt`** — `new Date().toISOString()` changes every second
2. **`uor:linkedResources`** — array order may vary between scrapes

This means the **same page scraped twice gets different addresses**, violating the core UOR principle: same content = same address.

### Plan

#### 1. Fix canonical determinism in `ResolvePage.tsx`

Split the encoded object into two parts:
- **Canonical object** (hashed): only content-derived fields — `@type`, `uor:sourceUrl`, `uor:title`, `uor:description`, `uor:content`, `uor:existingSemantics`, `uor:semanticWebLayers`
- **Metadata envelope** (not hashed): `uor:scrapedAt`, `uor:linkedResources`, `uor:language`

The canonical object gets passed to `encode()`. The metadata is attached to the result display but does not affect the address. Additionally, sort `uor:linkedResources` alphabetically before display to ensure consistency.

#### 2. Add Semantic Web Tower visualization for WebPage results

After encoding a web page, show a compact vertical "tower" indicator next to the identity card, mapping each layer to its status:

```text
L6 Trust        ● deterministic-trust
L5 Proof        ● singleProofHash
L4 Logic        ● canonical-reduction
L3 Ontology     ● preserved (or none)
L2 RDF          ● urdna2015
L1 Schema       ● json-ld
L0 URI          ● content-addressed
⧫  Signature    ● CIDv1
```

Each layer shows a green dot if active, gray if not applicable. This is the "holy shit" visualization — users see exactly how UOR implements every layer of the W3C stack for their specific page.

Create a small `SemanticWebTower` component in `src/modules/oracle/components/SemanticWebTower.tsx` that takes the `uor:semanticWebLayers` object and renders this compact column. Show it in the WebPage result view.

#### 3. Add L4 (Logic) layer mapping

The current `uor:semanticWebLayers` object is missing L4. Add `"L4": "canonical-reduction"` to reflect that URDNA2015 canonicalization implements the logic layer (seven deterministic rules, always terminates).

#### 4. Show engine badge on WebPage results

Display a small badge showing whether WASM or TypeScript engine was used for encoding (already available in `receipt.engine`). This proves to the user that the Rust crate is active. Show it near the tower or identity card: "⚙ wasm · uor-foundation v0.x.x" or "⚙ typescript fallback".

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Split canonical vs metadata fields; add L4; remove `scrapedAt` from hashed object |
| `src/modules/oracle/components/SemanticWebTower.tsx` | New — compact layer status visualization |
| `src/modules/oracle/components/HumanContentView.tsx` | Render `SemanticWebTower` for WebPage type; show engine badge |

### Why This Is the Most Ingenious Showcase

The tower visualization directly maps every encoded page to the W3C Semantic Web specification diagram. Users paste a URL and instantly see: "This page is now content-addressed (L0), self-describing (L1), graph-structured (L2), canonically reduced (L4), cryptographically proven (L5), and trustlessly verifiable (L6) — powered by the Rust WASM ring engine." That's the "rewriting the internet" moment.

