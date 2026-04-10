

# Standardized Application Boot Sequence — Container-First Launch

## Current State

The infrastructure is fully built but **not wired to the UI**:
- **AppKernel** exists (`compose/app-kernel.ts`) — per-app unikernel with permissions, rate limiting, call budgets, circuit breakers, and seal verification.
- **UorContainer** exists (`uns/build/container.ts`) — Docker-equivalent lifecycle (create → start → running).
- **Orchestrator** exists (`compose/orchestrator.ts`) — Kubernetes-equivalent scheduler that creates containers and kernels via `_startInstance()`.

But `DesktopWindow.tsx` line 209 simply does `{AppComponent && <AppComponent />}` — it mounts the React component directly, bypassing the entire container/kernel pipeline.

## Solution

Insert a **Container Boot Overlay** between window creation and component mounting. Every app launch goes through the same deterministic sequence — visible to the user as a brief boot animation, and wired to real orchestrator/kernel/container operations.

### Boot Sequence (per application)

```text
Phase 1: INIT        → Orchestrator.ensureRunning(appName)
Phase 2: CONTAINER   → createContainer() + startContainer()
Phase 3: KERNEL      → AppKernel.start() (permissions, rate limits)
Phase 4: MOUNT       → Load React component (existing Suspense)
Phase 5: SEAL        → Kernel runtime seal verification
Phase 6: READY       → Overlay fades, app is interactive
```

Each phase takes ~50-100ms of real work. The overlay shows a compact terminal-style log with green dots progressing through each phase — identical for every app, creating the standardized experience.

### On-Demand Introspection

After boot completes, a small status pill appears in the app window corner (e.g., "● oracle — 6 ops · 3 ns"). Clicking it reveals the **Container Inspector** — showing:
- Container ID, state, image, uptime
- Kernel: allowed operations, namespaces, call count, denied count
- Modules/pipelines/atoms the app is using (from blueprint `requires`)
- Live call rate and payload accounting

This mirrors `docker inspect` / `kubectl describe pod`.

## Implementation

### 1. Fix Build Error (`src/modules/uns/build/index.ts`)
Add a trivial whitespace change to force Vite module re-resolution for `./container`.

### 2. Create `ContainerBootOverlay.tsx` (~180 lines)
New component in `src/modules/desktop/components/`.

- Accepts `appId`, `blueprint`, `onReady` callback
- Runs the real boot sequence:
  1. Calls `orchestrator.ensureRunning(appName)` — this creates the AppKernel + UorContainer
  2. Reads container state and kernel metrics
  3. Computes a runtime seal hash
- Renders a compact terminal overlay showing each phase with timing
- Auto-dismisses after boot completes (~300-500ms total)
- Stores boot receipt in state for the inspector

```text
┌─────────────────────────────────────────┐
│  ▸ Booting oracle                       │
│                                         │
│  ✓ init         orchestrator    12ms    │
│  ✓ container    uor:oracle-1    8ms    │
│  ✓ kernel       3 ns · 7 ops   15ms    │
│  ✓ mount        OraclePage      45ms    │
│  ● seal         verifying...            │
│                                         │
│  Container: oracle-1                    │
│  Image: bp:oracle                       │
│  Kernel: AppKernel [3 namespaces]       │
└─────────────────────────────────────────┘
```

### 3. Create `ContainerInspector.tsx` (~120 lines)
New component in `src/modules/desktop/components/`.

- Small popover triggered by the status pill
- Shows container details: ID, state, uptime, image reference
- Shows kernel details: allowed ops, namespaces, call count, denied calls, payload bytes
- Shows the app's `requires` list mapped to atom/pipeline/module levels (using provenance-map data if available)
- Real-time updates via polling kernel metrics

### 4. Update `DesktopWindow.tsx` (~40 lines changed)
Replace the direct `<Suspense>` mount with a two-phase render:

```typescript
// Phase 1: Boot overlay (runs orchestrator + container + kernel)
// Phase 2: App component (after boot completes)
const [booted, setBooted] = useState(false);

{!booted && app && (
  <ContainerBootOverlay
    appId={win.appId}
    blueprint={app.blueprint}
    onReady={() => setBooted(true)}
  />
)}
{booted && (
  <Suspense fallback={<Spinner />}>
    <ContainerInspectorProvider appId={win.appId}>
      {AppComponent && <AppComponent />}
    </ContainerInspectorProvider>
  </Suspense>
)}
```

### 5. Update `useWindowManager.ts` (~10 lines)
Add `booted: boolean` to `WindowState` so boot state persists across re-renders. When a window is re-focused (already open), skip boot.

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/uns/build/index.ts` | Touch | Fix stale module resolution |
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | Create | Standardized boot sequence UI |
| `src/modules/desktop/components/ContainerInspector.tsx` | Create | On-demand container/kernel introspection |
| `src/modules/desktop/DesktopWindow.tsx` | Update | Two-phase render: boot → mount |
| `src/modules/desktop/hooks/useWindowManager.ts` | Update | Add `booted` to WindowState |

## Design Principles

- **Every app, same sequence** — no exceptions, no shortcuts
- **Real operations** — not simulated; the orchestrator actually creates kernels and containers
- **Fast** — total boot ~300-500ms; overlay auto-dismisses
- **Inspectable on demand** — the status pill is always there, click to see the "docker inspect" view
- **Familiar to DevOps** — phases map to Docker/K8s concepts (init → container → runtime → seal)

