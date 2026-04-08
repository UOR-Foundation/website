

## Investigation Result: Why "ts fallback" appears

**The WASM engine IS loading successfully.** Browser console confirms: `[UOR] WASM engine loaded — uor-foundation v0.1.5`. The issue is a **race condition** — content gets encoded before WASM finishes loading, and the engine indicator is baked into the receipt at encode time.

### Root cause

Two things happen in parallel on page load in `ResolvePage.tsx`:

1. **Line 163**: `loadWasm()` starts (async, takes ~400ms)
2. **Line 166-169**: If URL has `?w=` params, `handleSearch()` runs immediately

Additionally, the content registry (`uor-content-registry.ts`) pre-registers site content on app load — this can also fire before WASM is ready.

When `encode()` is called before WASM loads, `bridge.engineType()` returns `"typescript"`, and this value is permanently stored in the receipt's `engine` field. Even after WASM loads, the already-created receipt still says "ts fallback".

### Fix plan

1. **Ensure WASM loads before any encoding** — In `ResolvePage.tsx`, make the URL-param search `useEffect` wait for `wasmReady` state before calling `handleSearch`. Gate the search on WASM readiness.

2. **Gate content registry initialization on WASM** — In `uor-content-registry.ts` or wherever `initializeContentRegistry` is called, await `loadWasm()` first so all pre-registered content gets WASM-enriched receipts.

3. **Add re-enrichment on WASM load** — In the receipt registry, add an optional `reEnrichAll()` function that re-computes the WASM ring fields for any receipts created with TS fallback once WASM becomes available. This ensures late-loaded WASM still upgrades existing receipts.

4. **Update ResolvePage search param effect** — Change from:
   ```
   useEffect(() => {
     const addr = searchParams.get("w") ...;
     if (addr) { setInput(addr); handleSearch(addr); }
   }, [searchParams]);
   ```
   To depend on `wasmReady`:
   ```
   useEffect(() => {
     if (!wasmReady) return;
     const addr = searchParams.get("w") ...;
     if (addr) { setInput(addr); handleSearch(addr); }
   }, [searchParams, wasmReady]);
   ```

### Files to modify

- `src/modules/oracle/pages/ResolvePage.tsx` — gate search on WASM readiness
- `src/modules/oracle/lib/receipt-registry.ts` — add `reEnrichAll()` safety net
- `src/lib/uor-content-registry.ts` — ensure `loadWasm()` before registry init (if not already)

### Impact

- No functional changes — same encoding pipeline, same results
- Receipts will consistently show `wasm ✓ 0.1.5` instead of `ts fallback`
- Slight delay on page load (~400ms) while WASM initializes before showing results

