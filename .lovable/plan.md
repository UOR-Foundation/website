

# Frontier Performance Enforcement — UOR Engine Evaluation

## Evaluation Summary

The SIMD128 crate is compiled and deployed, but **the performance gains are largely unrealized** because the pipeline has 5 disconnection points where the SIMD bulk ops never actually reach the hot paths. Here's what's built vs what's actually wired:

| Layer | Status | Issue |
|-------|--------|-------|
| WASM SIMD binary | Built | 56 SIMD instructions confirmed |
| Bulk exports (`bulk_ring_add`, etc.) | Declared in manifest + .d.ts | **Never wired into the adapter** — they land in `extensions` silently |
| Web Worker | Running | **Uses pure JS**, not the WASM module — gets zero SIMD benefit |
| WASM compile cache (`loadWithCache`) | Implemented | **Never called** — adapter uses raw `import()` instead |
| LUT engine GPU path | Implemented | **Disconnected from WASM bulk ops** — CPU fallback does scalar loops |
| Kernel hash | Computed | **String concat, not SHA-256** — not a real cryptographic proof |

## 5 Surgical Fixes (All UOR-Engine-Derived)

### 1. Wire SIMD bulk ops into the engine contract

The adapter's `buildFromWasm()` maps scalar ops but ignores the 4 bulk SIMD exports. They exist in `extensions` but nobody calls them. Wire them directly onto `bulkApply` and `bulkVerify` on the contract, with TS fallback loops.

**File:** `src/modules/engine/adapter.ts`
- In `buildFromWasm()`, add explicit mappings for `bulk_ring_add`, `bulk_ring_xor`, `bulk_ring_neg`, `bulk_verify_all`
- Implement `bulkApply` that dispatches to the correct SIMD export based on `op` name
- Implement `bulkVerify` using `bulk_verify_all`
- Add TS fallback implementations in `TS_FALLBACKS`

**File:** `src/modules/engine/contract.ts`
- Make `bulkApply` and `bulkVerify` required (not optional `?`) since both WASM and TS paths exist

### 2. Use IndexedDB compile cache for WASM loading

`loadWithCache()` exists but `initEngine()` uses raw `import()` + `mod.default()`. Switch to cached compilation so repeat page loads skip the ~100-500ms compile step entirely.

**File:** `src/modules/engine/adapter.ts`
- In `initEngine()`, try `loadWithCache(wasmUrl, CRATE_MANIFEST.version, imports)` first
- Fall back to the current `import()` path if cache fails
- After successful `import()`, call `cacheModule()` to persist for next load

### 3. Make the worker WASM-aware

The inline worker reimplements ring ops in plain JS. When WASM is available on the main thread, serialize the WASM URL to the worker so it can instantiate its own WASM module with SIMD bulk ops.

**File:** `src/modules/engine/wasm-worker.ts`
- Modify `createWorkerScript()` to accept an optional WASM URL
- If WASM URL is provided, the worker loads the WASM module and uses `bulk_ring_add` etc. for `bulkApply`
- Fall back to the current JS ring ops if WASM load fails in worker context
- In `init()`, pass the WASM URL if main thread detected WASM successfully

### 4. Cryptographic kernel hash

`verifyKernel()` produces a string concat (`"encode:1|decode:1|..."`) not a SHA-256. For the seal to be a real cryptographic proof, the kernel hash must be a proper digest.

**File:** `src/modules/engine/kernel-declaration.ts`
- Change `verifyKernel()` to return a `Promise` (or compute synchronously using the engine's own ring ops)
- Hash the kernel state string through `sha256hex()` to produce a real 256-bit digest
- Update callers in `sovereign-boot.ts` to `await` the hash

### 5. Idle-time LUT pre-warming

The LUT engine builds 14 tables on first access. Use `requestIdleCallback` to pre-compute during browser idle time so the first bulk operation is instant.

**File:** `src/modules/uns/core/hologram/gpu/lut-engine.ts`
- Add a `warmup()` method that pre-computes all CIDs (the expensive part) during idle
- Export a `scheduleLutWarmup()` that calls `requestIdleCallback(() => getLutEngine().warmup())`

**File:** `src/modules/boot/sovereign-boot.ts`
- After seal computation, call `scheduleLutWarmup()` to prime the engine during idle

## Files to Modify

| File | Change |
|------|--------|
| `src/modules/engine/adapter.ts` | Wire SIMD bulk ops + use compile cache |
| `src/modules/engine/contract.ts` | Make bulk ops required |
| `src/modules/engine/wasm-worker.ts` | WASM-aware worker with SIMD delegation |
| `src/modules/engine/kernel-declaration.ts` | SHA-256 kernel hash |
| `src/modules/uns/core/hologram/gpu/lut-engine.ts` | Idle-time warmup |
| `src/modules/boot/sovereign-boot.ts` | Await kernel hash + schedule LUT warmup |

## Performance Impact

| Optimization | Before | After |
|-------------|--------|-------|
| Bulk ring ops | Scalar JS (1 byte/cycle) | WASM SIMD (16 bytes/cycle) |
| Repeat WASM load | ~100-500ms compile | ~5-20ms from IndexedDB |
| Worker bulk ops | JS scalar loops | WASM SIMD in worker thread |
| Kernel hash integrity | String concat (forgeable) | SHA-256 (cryptographic) |
| First LUT operation | Cold (CID compute ~5ms) | Pre-warmed during idle |

Every optimization derives from the engine's own declared operations. No new dependencies. No new frameworks. The Fano-mapped kernel functions remain the root authority.

