

# Tech Stack Manifest v2 — Selection Criteria + Framework Audit

## Selection Criteria (to be inscribed in the manifest)

Every framework in the canonical tech stack must satisfy **all** of these criteria:

| Criterion | Definition |
|---|---|
| **Open Source** | OSI-approved license (MIT, Apache 2.0, BSD). No proprietary dependencies. |
| **Interoperability** | W3C/IETF/ISO standards-based. Speaks standard protocols (HTTP, RDF, SPARQL, WebSocket). No vendor lock-in. |
| **Performance** | Battle-tested at scale by large organizations. WASM-capable or near-native where applicable. |
| **Portability** | Runs identically on edge (Service Worker), local (browser/desktop), and cloud (Node/Deno/Bun). |
| **Maturity** | 3+ years in production use, active maintenance, >1000 GitHub stars or equivalent adoption signal. |
| **Minimality** | One framework per function. No overlapping responsibilities. |
| **Future-Proof** | Aligned with emerging standards (Web Components, WASM, HTTP/3, post-quantum). |

## Current Audit Findings

### Already Canonical (keep as-is)

| Framework | Role | Meets All Criteria |
|---|---|---|
| Oxigraph 0.5.x | SPARQL 1.1 quad store | Yes — Rust/WASM, W3C SPARQL, Apache 2.0 |
| UOR Foundation | Ring algebra engine | Yes — custom Rust crate, WASM |
| Web Crypto API | SHA-256 + randomness | Yes — W3C native, every browser/runtime |
| jsonld 9.x | URDNA2015 canonicalization | Yes — W3C standard, BSD |
| React 18 | UI rendering | Yes — MIT, 230k+ stars, concurrent mode |
| Vite 5 | Build + HMR | Yes — MIT, ESM-native, 70k+ stars |
| TanStack Query 5 | Server state | Yes — MIT, 45k+ stars, framework-agnostic core |
| Tailwind CSS 3 | Utility CSS | Yes — MIT, 85k+ stars |
| @noble/post-quantum | PQ crypto | Yes — MIT, audited, pure JS, no native deps |
| IndexedDB | Local persistence | Yes — W3C standard, every browser |

### Replace or Consolidate

| Current | Issue | Proposed Replacement | Rationale |
|---|---|---|---|
| `framer-motion` (130KB) | Heavy animation lib, 20+ imports but mostly just fade/slide | **CSS animations + `motion` (mini framer fork, 2.5KB)** | Framer Motion is excellent but oversized for our usage pattern. The `motion` package by Matt Perry (same author) provides identical API at 1/50th the size. Alternatively, we mark framer-motion as the canonical animation choice and document it. |
| `Three.js + R3F` (1.2MB) | Only used in 1 file (`AtlasManifold3D.tsx`) | **Keep but mark as lazy-loaded optional** | Massive bundle for one view. Already optional in manifest. No replacement needed — Three.js is the canonical WebGL framework. |
| `d3-force` | Used in 3 components for graph layout | **Keep — canonical for force-directed layout** | MIT, battle-tested, minimal. Used correctly. |
| `canvas-confetti` | Used in 1 file for celebration effect | **Remove** | Trivial effect, can be done with CSS or kept as lazy import |
| `@dnd-kit` | Used in 1 file only | **Keep as lazy optional** | MIT, accessible DnD. Low usage but no better alternative. |

### Missing from Manifest (should be declared)

| Framework | Role | Category |
|---|---|---|
| `framer-motion` | Animation engine | `animation` |
| `Radix UI` | Accessible headless components | `a11y-primitives` |
| `react-router-dom` | Client-side routing | `routing` |
| `Zod` (not installed but should be) | Runtime schema validation | `validation` |
| `fflate` | Compression (gzip/deflate) | `compression` |
| `hls.js` | Adaptive media streaming | `media` |

## Implementation Plan

### Step 1: Expand StackEntry with Selection Criteria

Add a `criteria` field to `StackEntry` so each framework self-documents WHY it was chosen:

```typescript
interface SelectionCriteria {
  license: string;           // "MIT" | "Apache-2.0" | "BSD-3" | "W3C"
  standard?: string;         // "W3C SPARQL 1.1" | "IETF RFC 8446" etc
  portability: string[];     // ["browser", "node", "deno", "edge-worker"]
  adoptionSignal: string;    // "85k GitHub stars" | "W3C native API"
  replacedBy?: never;        // If set, this entry is deprecated
}
```

### Step 2: Add Missing Entries to Manifest

Add entries for: `framer-motion`, `Radix UI`, `react-router-dom`, `fflate`, `hls.js`, `@diffusionstudio/vits-web`, `@chenglou/pretext`.

### Step 3: Evaluate framer-motion → motion swap

Framer Motion is used in ~30 files but mostly for `motion.div` with simple opacity/translate. The `motion` mini-package (by the same author, Matt Perry) provides the same API at 2.5KB vs 130KB. We will evaluate if this swap is feasible or if we keep framer-motion as-is and just declare it canonical.

**Decision: Keep framer-motion** — it's MIT, battle-tested, and the import tree-shakes well with Vite. The mini version lacks `AnimatePresence` which we use extensively. Mark as canonical.

### Step 4: Update `tech-stack.ts`

Rewrite the manifest with:
- Selection criteria on every entry
- New category types for missing categories
- All 16 canonical frameworks declared
- A `SELECTION_POLICY` constant documenting the 7 criteria

### Step 5: Update EngineStatusIndicator

Show the selection criteria summary in the diagnostic panel header so the system literally self-declares its policy.

---

## Files to Modify

| Action | File | Purpose |
|---|---|---|
| Modify | `src/modules/boot/tech-stack.ts` | Add criteria fields, new entries, SELECTION_POLICY constant |
| Modify | `src/modules/boot/EngineStatusIndicator.tsx` | Show policy + criteria in diagnostic panel |

