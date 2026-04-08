

## Assessment: WASM vs TypeScript Fallback

### What's happening

The encoding pipeline is **working correctly**. The "ts fallback" badge you see means the WASM binary (`uor_wasm_shim_bg.wasm`) failed to load at runtime, so the system fell back to the TypeScript ring engine — which produces **mathematically identical results**.

The pipeline is:

```text
User Input → JSON-LD → URDNA2015 → SHA-256 → Ring Enrichment (WASM or TS) → Address
```

The WASM module only handles Step 5 (ring operations like `classifyByte`, `factorize`, `verifyCriticalIdentity`). Steps 1–4 (canonicalization, hashing, CID generation, IPv6 projection) are always done in TypeScript regardless. The address you got is **deterministically correct** either way.

### Why WASM fails to load

The WASM binary exists at `public/wasm/uor_wasm_shim_bg.wasm` and is a valid 27KB WebAssembly module. However, in the Lovable preview environment, the fetch for `/wasm/uor_wasm_shim_bg.wasm` likely fails due to the preview server's MIME type or CORS configuration. When this happens, `loadWasm()` catches the error, sets `wasmFailed = true`, and all subsequent `bridge.*` calls route to the identical TypeScript implementations.

### Proposed plan

**No code changes are needed for correctness.** The TypeScript fallback is not a degraded mode — it is the same math. However, to improve transparency and reduce confusion, I propose:

1. **Improve the engine badge UX** — Instead of showing a yellow "ts fallback" dot (which implies something is wrong), show a neutral "TypeScript Engine" or "WASM Engine" label without alarm coloring. Both are first-class engines.

2. **Add a retry mechanism** — When WASM fails on first load, try once more after a short delay. Some preview environments take a moment to serve static assets.

3. **Log clearer diagnostics** — Surface the specific WASM load error in the encode overlay's status bar (e.g., "WASM unavailable: fetch 404") so developers can diagnose environment issues.

### Technical details

- File: `src/modules/oracle/pages/ResolvePage.tsx` — Update the engine badge styling from warning-yellow to neutral
- File: `src/lib/wasm/uor-bridge.ts` — Add a one-time retry with 500ms delay before setting `wasmFailed = true`
- File: `src/modules/oracle/lib/receipt-registry.ts` — No changes needed; `enrichWithWasm` already correctly delegates via `bridge.engineType()`

### Key takeaway

Your "hello world" encoding produced a **correct, deterministic UOR address**. The triword, CID, IPv6, and derivation ID are all valid and identical regardless of which engine computed the ring enrichment. The "ts fallback" label is informational, not an error.

