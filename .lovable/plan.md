
Evaluation of the live report

The published site’s degradation is most likely a client-side bootstrap bug, not a missing browser capability and not primarily a hosting problem.

Key errors I found in the code:
1. Permanent TS fallback lock-in
   - `src/modules/engine/adapter.ts` makes `getEngine()` create and store the TypeScript engine immediately.
   - That same `getEngine()` also kicks off `initEngine()`.
   - But `initEngine()` exits early if any engine already exists.
   - Result: the first pre-init caller can permanently prevent WASM from ever loading.

2. Boot order triggers that bug on the live site
   - `src/modules/boot/sovereign-boot.ts` runs `validateStack()` before `await initEngine()`.
   - `src/modules/boot/tech-stack.ts` validates “UOR Foundation” by calling `getEngine()`.
   - So boot itself is currently poisoning the engine into fallback mode before WASM gets a chance.

3. Monitoring/report code can also freeze stale state
   - `src/modules/engine/kernel-declaration.ts` caches a kernel table that captures whatever engine existed at first access.
   - `SystemMonitorApp` reads kernel/report data early, so monitoring can preserve stale fallback behavior.

4. The report has several inaccurate signals
   - “UOR Foundation: Active” can be true even when only TS fallback is running.
   - “WebAssembly Compile Cache: Active” is misleading because `wasm-cache.ts` exists but is not actually used by `adapter.ts`.
   - `computeWasmBinaryHash()` does not hash the actual `.wasm` bytes; it hashes a synthetic fingerprint or returns `ts-fallback`.
   - SIMD status is inconsistent because there are two separate detection paths (`sovereign-boot.ts` vs `wasm-cache.ts`), which explains why one section says SIMD is supported while another says missing.

Plan to fix it

1. Refactor engine initialization so fallback does not poison WASM
   - In `src/modules/engine/adapter.ts`, separate:
     - a non-persistent synchronous TS fallback object
     - the actual active engine state
     - initialization status and last error
   - Make `getEngine()` non-mutating.
   - Make `initEngine()` attempt WASM unless native WASM is already loaded.
   - Only commit to permanent TS fallback after the final WASM failure.

2. Reorder boot so native compute initializes first
   - In `src/modules/boot/sovereign-boot.ts`, move engine initialization ahead of stack validation, or make stack validation use a read-only engine status API instead of `getEngine()`.
   - This ensures the browser-native path is attempted before any reporting/telemetry code touches the engine.

3. Add explicit WASM diagnostics instead of generic “check CORS”
   - Track and expose:
     - wasm URL
     - fetch status
     - content type
     - cache hit/miss
     - load time
     - last init error
     - final engine mode (`loading`, `wasm`, `typescript-fallback`, `failed`)
   - Use this in the System Health Report so the degradation section names the real failure.

4. Fix the report so it reflects reality
   - In `src/modules/boot/tech-stack.ts` and `src/modules/boot/SystemMonitorApp.tsx`:
     - mark UOR Foundation as native only when `engine === "wasm"`
     - mark compile cache active only when it is actually wired in
     - show the real runtime engine in the kernel/decode row
     - replace the synthetic wasm hash with a true hash of `/wasm/uor_wasm_shim_bg.wasm`

5. Unify SIMD detection
   - Replace duplicate detection logic with one canonical helper shared by boot and reporting.
   - This removes the current contradiction where the capability matrix says SIMD is available but the tech stack says it is missing.

6. Either wire in compile caching or simplify it away
   - Since `src/modules/engine/wasm-cache.ts` already exists, the best path is to actually use it from the adapter.
   - If that proves too invasive, remove/rename the report claim so the system stops overstating current behavior.
   - Preference: wire it in, because it helps browser-only performance and keeps the implementation lean.

7. Remove stale engine capture in kernel verification
   - In `src/modules/engine/kernel-declaration.ts`, stop caching closures over the first engine instance.
   - Resolve the current engine at verification time so reporting cannot hold onto an old fallback engine.

Files to update
- `src/modules/engine/adapter.ts`
- `src/modules/boot/sovereign-boot.ts`
- `src/modules/boot/tech-stack.ts`
- `src/modules/engine/kernel-declaration.ts`
- `src/modules/boot/SystemMonitorApp.tsx`
- likely `src/modules/engine/wasm-cache.ts`

Acceptance criteria after implementation
- Published site reports `Engine Type: WASM`
- `WASM Binary Hash` is a real hash, not `ts-fallback`
- UOR Foundation no longer shows “active” when only TS fallback is running
- SIMD status is consistent across all report sections
- Compile cache status matches actual behavior
- Monitoring/reporting code no longer changes engine state
- Browser load remains fully client-side; no backend changes are needed for this fix
