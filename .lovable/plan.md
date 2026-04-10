

# Priority Fix + Lean Decision

## Step 1 — Fix the build error (blocking)

The PWA service worker's Rollup build fails on line 223 of `ContainerBootOverlay.tsx`:
```
const { getContainer } = await import("@/modules/uns/build/container");
```

The file `container.ts` exists, but Rollup's module resolution in the PWA `injectManifest` pass doesn't append `.ts`. Fix: add explicit extension to the dynamic import path.

| File | Change |
|------|--------|
| `src/modules/desktop/components/ContainerBootOverlay.tsx` line 223 | Change import path to `"@/modules/uns/build/container.ts"` |

## Step 2 — Lean implementation (if approved)

Given the honest tradeoffs above, proceed only if you want the formal verification layer for future ring generalization or external audit purposes.

If yes: create `uor-lean/` with Ring, CriticalIdentity, Involution, and Partition proofs as previously planned, plus artifact generation and conformance suite annotations.

If no: the current 256-element exhaustive conformance suite is already mathematically complete for R_8.

## Technical Details

The build error is specifically in the PWA plugin's `injectManifest` strategy, which runs a **separate Rollup build** for the service worker. This second Rollup pass uses different resolution rules than Vite's main build, which is why the main app works but the PWA build fails. The `globIgnores` pattern `**/modules/uns/build/**` only affects precache file listing, not import resolution.

