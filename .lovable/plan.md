

# Simplify UOR Resolve to Two Things: Address ↔ Content

## The Problem

The current Resolve page is cluttered with Identity cards, WASM Ring Verification grids, N-Quads sections, and multiple panels. The user wants a Google-search experience: **one input, one answer**. Two things only:

1. **The Address** (triword)
2. **The Content** (the data that lives at that address)

Everything else is noise.

## The Design

A single-screen experience with no scrolling needed. Like Google: a search bar at the top, the result below. Bidirectional:

- **Address → Content**: Paste a triword (or CID) → see the original data
- **Content → Address**: Paste JSON → see its deterministic address

```text
┌──────────────────────────────────────────────────┐
│                                                  │
│              ⠕⠗⠁⠉⠇⠑                             │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  meadow.steep.keep                    ⏎  │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   Address → Content  |  Content → Address        │
│                                                  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                  │
│   ADDRESS                                        │
│   Meadow · Steep · Keep                          │
│   bafy2bzace…                        ● WASM ✓   │
│                                                  │
│   CONTENT                                        │
│   ┌────────────────────────────────────────┐     │
│   │ {                                      │     │
│   │   "@type": "oracle:Claim",             │     │
│   │   "oracle:text": "Memory involves…",   │     │
│   │   "oracle:grade": "A"                  │     │
│   │ }                                      │     │
│   └────────────────────────────────────────┘     │
│                                                  │
└──────────────────────────────────────────────────┘
```

## What Changes

**File: `src/modules/oracle/pages/ResolvePage.tsx`** — Complete rewrite to ~200 lines:

- Remove: Identity card (CID/Derivation/Glyph/IPv6 rows), WASM Ring Verification grid, N-Quads section, VerifyCell component, IdentityRow component
- Keep: Search bar, resolve/encode logic, WASM loading, registry lookup, `computeAndRegister` (all WASM-anchored)
- Result view becomes two simple blocks:
  - **ADDRESS**: Triword (large, beautiful), CID below it in small mono text, tiny WASM verified badge
  - **CONTENT**: Pretty-printed JSON of the source object in a clean code block
- The mode toggle ("Address → Content" / "Content → Address") replaces the current Resolve/Encode tabs — same functionality, clearer labels
- Single input field that auto-detects: if it looks like JSON → encode mode; if it looks like an address → resolve mode
- Re-derive button stays as a subtle link at the bottom ("Verify determinism")
- Everything fits on one screen without scrolling

## Technical

- All encoding still goes through `computeAndRegister()` → `singleProofHash()` → WASM bridge
- Registry lookup unchanged
- No new dependencies, no new files — just a dramatic simplification of ResolvePage.tsx

