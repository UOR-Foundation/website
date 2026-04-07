

# Neuro-Symbolic UOR Oracle — Crate-Compiled WASM + AI Chat

## The Vision

Compile the actual `uor-foundation` Rust crate to WebAssembly and run it in the browser. Every algebraic operation the Oracle references is executed by the real Rust code, not a TypeScript approximation. The AI chatbot becomes a **neuro-symbolic system**: the neural layer (LLM) understands natural language questions, and the symbolic layer (Rust WASM) provides verified, canonical answers. When a user asks "How does UOR prevent identity fraud?", the Oracle doesn't just explain — it runs the actual crate functions live and shows the proof.

```text
┌──────────────────────────────────────────────────┐
│                  UOR Oracle                       │
│                                                   │
│  User: "Show me how content-addressing works"     │
│                                                   │
│  ┌─ Neural Layer (LLM) ────────────────────────┐  │
│  │ "Content-addressing derives identity from    │  │
│  │  content via the critical identity in R_8.   │  │
│  │  Let me demonstrate with your input..."      │  │
│  └──────────────────────────────────────────────┘  │
│           │ triggers                               │
│  ┌─ Symbolic Layer (WASM) ─────────────────────┐  │
│  │ uor_foundation::kernel::op::neg(bnot(42))   │  │
│  │ = 43 = succ(42) ✓                           │  │
│  │ Partition: ReducibleSet { 2 × 3 × 7 }       │  │
│  │ Triad: stratum=3, spectrum=[[1],[2],[4,2,1]] │  │
│  │ ─────────────────────────────────────────    │  │
│  │ Executed by: uor-foundation v0.1.5 (WASM)   │  │
│  │ Trait: kernel::op::Involution [docs.rs →]    │  │
│  └──────────────────────────────────────────────┘  │
│                                                   │
│  Preset starters:                                 │
│  [Identity Fraud] [Prompt Injection] [Data Verify]│
│  [Agent Coordination] [Content Quality] [Certs]   │
└──────────────────────────────────────────────────┘
```

## Why This Is Ingenious

1. **The website runs the actual crate.** Not a port, not a reimplementation — the same Rust code from `crates.io/crates/uor-foundation` compiled to WASM. Every computation on the site is canonically anchored by construction.

2. **Neuro-symbolic in the true sense.** The LLM reasons about "why" (neural), the WASM module computes "what" (symbolic). The Oracle can say "the partition of 42 is ReducibleSet" and prove it live, because the Rust `bridge::partition` module actually ran.

3. **Self-verifying responses.** Every claim the Oracle makes about UOR can be verified in real-time by the WASM module. The user sees the proof alongside the explanation. This is UOR demonstrating itself.

4. **33 namespaces, 442 traits, 896 properties — live.** The full ontology from the crate becomes queryable in the browser. The Oracle can traverse the actual trait hierarchy to answer questions.

## Architecture

### Phase 1: WASM Compilation (build-time)

- Clone `uor-foundation` crate, add a thin `wasm-bindgen` FFI layer exposing key functions:
  - Ring arithmetic: `neg`, `bnot`, `succ`, `pred`, `add`, `sub`, `mul`, `xor`, `and`, `or`
  - Critical identity verification
  - Partition classification
  - Triad decomposition
  - Term evaluation (`uor!` macro expressions)
  - Namespace/trait enumeration (expose the 33 module paths as a queryable registry)
- Compile with `wasm-pack --target web --release`
- Place `.wasm` in `public/wasm/`, JS glue in `src/lib/wasm/uor-foundation/`

### Phase 2: WASM Loader + TypeScript Bridge

**New file: `src/lib/wasm/uor-bridge.ts`**
- Lazy-loads the WASM module on first use
- Exposes a typed TypeScript API mirroring the Rust traits
- Falls back to the existing `uor-ring.ts` functions if WASM fails to load
- Provides a `wasmReady` promise for UI loading states

### Phase 3: Edge Function — UOR Oracle

**New file: `supabase/functions/uor-oracle/index.ts`**
- System prompt assembled from `llms.md` + `llms-full.md` content + the 6 application domains + the 33 crate module descriptions
- Instructs the model to: (a) identify which UOR layer/namespace solves the user's problem, (b) suggest a concrete WASM function call the frontend should execute, (c) link to the docs.rs trait, (d) cite `cargo add uor-foundation`
- Streams responses via SSE using the existing `quantum-inference-stream` pattern
- Uses `google/gemini-3-flash-preview` via Lovable AI Gateway
- Accepts full conversation history for multi-turn context

### Phase 4: Oracle UI

**New file: `src/modules/oracle/pages/OraclePage.tsx`**
- Split view: chat panel (left/top) + live computation panel (right/bottom)
- Chat panel: streaming markdown rendering with `react-markdown`, conversation history
- Computation panel: when the Oracle's response references a UOR operation, the WASM module executes it live and displays verified results with trait attribution
- 6 preset conversation starters mapped to the 6 problems UOR solves (from `llms-full.md`)
- WASM loading indicator with graceful fallback
- `cargo add uor-foundation` copy button
- Mobile-responsive: stacks vertically

**New file: `src/modules/oracle/components/OracleWidget.tsx`**
- Floating "Ask the Oracle" pill on landing page and framework page
- Opens slide-out chat panel
- Links to full `/oracle` page

### Phase 5: Landing Page Integration

**Modified: `src/modules/landing/components/CodeExampleSection.tsx`**
- Replace static code block with a mini Oracle teaser
- Shows a pre-filled question ("How does UOR give data a permanent identity?") with a streamed answer and a live WASM computation
- "Open Oracle" CTA below

**Modified: `src/App.tsx`**
- Add lazy route: `/oracle`

## Implementation Sequence

Since the WASM compilation of the actual crate requires access to the Rust source and `wasm-pack` toolchain, I'll need to:

1. Fetch the crate source from GitHub
2. Create a `wasm-bindgen` shim crate that depends on `uor-foundation` and exposes the FFI
3. Compile in the sandbox using `nix shell nixpkgs#rustc nixpkgs#cargo nixpkgs#wasm-pack nixpkgs#lld`
4. Copy artifacts to `public/wasm/` and `src/lib/wasm/`
5. Build the Oracle edge function and UI

## Files Changed/Created

| File | Action |
|------|--------|
| `/tmp/uor-wasm/` | Temporary: WASM shim crate + compilation |
| `public/wasm/uor_foundation_bg.wasm` | New: compiled WASM binary |
| `src/lib/wasm/uor-foundation/` | New: JS glue + TS bridge |
| `src/lib/wasm/uor-bridge.ts` | New: typed WASM loader with fallback |
| `supabase/functions/uor-oracle/index.ts` | New: AI edge function with framework system prompt |
| `src/modules/oracle/pages/OraclePage.tsx` | New: full Oracle chat page |
| `src/modules/oracle/components/OracleWidget.tsx` | New: floating trigger widget |
| `src/modules/oracle/lib/stream-oracle.ts` | New: SSE streaming client |
| `src/modules/landing/components/CodeExampleSection.tsx` | Modified: mini Oracle teaser |
| `src/App.tsx` | Modified: add `/oracle` route |

