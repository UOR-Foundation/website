

# Fix Build Error: Re-create `container.ts`

The PWA plugin's `injectManifest` strategy runs a separate Rollup build for the service worker (`custom-sw.ts`). The `globIgnores` config only affects the precache file list — it does NOT prevent Rollup from resolving imports. When the SW build encounters `src/modules/uns/build/index.ts` (via transitive imports), it tries to resolve `"./container"` and fails.

The `container.ts` file shows in the directory listing but may not have been properly written to disk in a previous session. The fix is to re-write it cleanly.

## Single Change

| File | Action | Purpose |
|------|--------|---------|
| `src/modules/uns/build/container.ts` | **Re-create** | Ensure the file is valid and resolves all exports declared in `index.ts` |

The file implements an in-memory virtual container runtime with all 14 exported functions (`createContainer`, `startContainer`, `stopContainer`, etc.) and all 11 exported types (`ContainerState`, `UorContainer`, `ContainerConfig`, etc.) that `index.ts` re-exports.

No other files need changes.

