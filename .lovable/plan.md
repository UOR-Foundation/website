

# Standardized Container-First Application Boot Sequence

## Problem

1. **Build is broken**: `./container` cannot be resolved from `src/modules/uns/build/index.ts` — the file exists but Vite's module graph is stale.
2. **No boot sequence**: `DesktopWindow.tsx` line 209 mounts `<AppComponent />` directly, bypassing the entire AppKernel/Container/Orchestrator pipeline that is fully built but unwired.

## Solution

Wire the existing container infrastructure into the UI via a mandatory boot overlay that every application passes through before becoming interactive.

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/uns/build/index.ts` | Re-save (add trailing newline) | Fix stale module resolution |
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | **Create** | Terminal-style boot sequence overlay |
| `src/modules/desktop/components/ContainerInspector.tsx` | **Create** | On-demand `docker inspect` popover |
| `src/modules/desktop/DesktopWindow.tsx` | **Update** | Two-phase render: boot overlay then app mount |
| `src/modules/desktop/hooks/useWindowManager.ts` | **Update** | Add `booted` flag to WindowState |

## Implementation Details

### 1. Fix Build (`index.ts`)
Add a trailing newline/comment to force Vite to re-resolve the barrel file. The underlying `container.ts` file is intact with all exports.

### 2. ContainerBootOverlay (~180 lines)
A dark terminal-style overlay that runs the **real** orchestrator pipeline:

```text
Phase 1: INIT       → orchestrator.ensureRunning(appName)     ~10ms
Phase 2: CONTAINER  → Reads container ID + state from kernel  ~8ms
Phase 3: KERNEL     → Reads permissions, namespaces, ops      ~15ms
Phase 4: MOUNT      → Triggers Suspense lazy-load             ~40ms
Phase 5: SEAL       → kernel.seal() → content-addressed hash  ~20ms
Phase 6: READY      → Overlay fades out, app is interactive
```

Visual: monospace font, dark background matching window chrome, green checkmarks progressing through each phase with real timing. Shows container ID, image reference, kernel namespace count. Auto-dismisses after ~300-500ms total.

### 3. ContainerInspector (~120 lines)
A popover triggered by a small status pill in the window corner after boot completes. Shows:
- **Container**: ID, state, uptime, image ref
- **Kernel**: allowed ops, namespaces, call count, denied count, payload bytes
- **Requires**: the app's `requires` list from its blueprint (atoms/pipelines/modules)
- **Seal**: last seal hash

Supports two views: **list** (conventional table) and **graph** (tree showing namespace-to-operation hierarchy). Polls every 2s for live updates.

### 4. DesktopWindow Update (lines 200-211)
Replace the direct `<AppComponent />` mount with a two-phase render:
- If `!win.booted`: render `<ContainerBootOverlay>` which calls `onBooted(win.id)` when done
- If `win.booted`: render the existing `<Suspense>` + `<AppComponent>` with a subtle status pill overlay (bottom-left corner) that opens the ContainerInspector on click

### 5. WindowState Update
Add `booted: boolean` (default `false`) to the `WindowState` interface. Set to `true` after boot completes. Already-open windows skip boot on re-focus. Persisted to localStorage so reopened windows from a saved session also skip.

## Design Principles

- **No exceptions** — every app, same sequence, always
- **Real operations** — `orchestrator.ensureRunning()` + `kernel.seal()` are called, not simulated
- **Fast** — total ~300-500ms; the overlay auto-dismisses
- **Inspectable** — click the status pill anytime for full container/kernel transparency
- **Familiar** — phases map directly to Docker/K8s concepts; all labels use standard DevOps terminology

