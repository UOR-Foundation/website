

# App Builder — Docker-Style Build, Run, Ship Application

## What We're Building

A standalone desktop application called **App Builder** that presents the full Docker-equivalent pipeline (Build → Run → Ship) in one intuitive interface. Experienced Docker/K8s developers land here and immediately know what to do.

The app wires together the existing infrastructure that is already fully built but has no unified UI:
- **Build**: `image-builder.ts` (Uorfile → content-addressed image)
- **Run**: `container.ts` + `orchestrator.ts` + `app-kernel.ts` (create → start → running)
- **Ship**: `registry-ship.ts` (push to registry + deployment snapshot)

## UX Design

Three-tab layout mirroring the Docker workflow, plus an audit log:

```text
┌──────────────────────────────────────────────────────────┐
│  App Builder                                              │
│                                                          │
│  [ Build ]  [ Run ]  [ Ship ]              [ Audit Log ] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  BUILD tab:                                              │
│  ┌─────────────────────────────────┐                     │
│  │  Uorfile (editable)             │  Image Layers       │
│  │  FROM scratch                   │  ├─ base     4.2kB  │
│  │  LABEL app.name="my-app"        │  ├─ env      128B   │
│  │  ENV NODE_ENV="production"      │  └─ app.tsx  1.8kB  │
│  │  COPY src/ /app/src/            │                     │
│  │  EXPOSE 3000                    │  Canonical ID:      │
│  │  ENTRYPOINT ["serve", "/app"]   │  uor:sha256-a1b2... │
│  └─────────────────────────────────┘                     │
│                                                          │
│  [ Build Image ]                    Status: Ready        │
│                                                          │
│  RUN tab:                                                │
│  Container: my-app-1   State: running   Uptime: 2m 14s  │
│  Kernel: 3 namespaces · 7 ops · 42 calls · 0 denied     │
│  [ Start ] [ Stop ] [ Restart ] [ Inspect ]              │
│                                                          │
│  SHIP tab:                                               │
│  Registry: uor://registry/my-app:1.0.0                   │
│  Snapshot: snap-a1b2c3 (code + image + config)           │
│  [ Push to Registry ]              [ Export Snapshot ]   │
│                                                          │
│  AUDIT LOG (collapsible panel):                          │
│  12:03:01.234  BUILD   Uorfile parsed: 8 directives      │
│  12:03:01.289  BUILD   Layer 0: base (sha256:f4e2...)     │
│  12:03:01.312  BUILD   Image built: uor:sha256-a1b2...   │
│  12:03:01.450  RUN     Container created: my-app-1       │
│  12:03:01.462  RUN     Kernel started: 3ns/7ops          │
│  12:03:01.891  SHIP    Pushed: uor://registry/my-app:1.0 │
│  [ Export Log as JSON ]  [ Export Log as CSV ]            │
└──────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Create App Builder page component (~350 lines)
**File**: `src/modules/app-builder/pages/AppBuilderPage.tsx`

Three tabs plus persistent audit log:

- **Build tab**: Uorfile editor (monospace textarea), file source selector (blank template / pick from existing blueprints), "Build Image" button that calls `buildAppImage()` from `image-builder.ts`. Shows resulting layers, canonical ID, and image size.

- **Run tab**: Shows all containers from the container runtime. Start/stop/restart buttons calling `createContainer()`, `startContainer()`, `stopContainer()`. Live kernel metrics from `AppKernel` (ops, namespaces, call count, denied count, payload bytes). Container inspector inline.

- **Ship tab**: Push built image to registry via `shipApp()` from `registry-ship.ts`. Shows registry URL, tags applied, deployment snapshot with all components (code + image + config). Export snapshot as JSON.

- **Audit Log**: Every operation appends a timestamped entry. Log is exportable as JSON or CSV via download buttons. Each entry has: timestamp, phase (BUILD/RUN/SHIP), message, and optional canonical ID.

### 2. Register blueprint in static-blueprints.ts (~25 lines)
Add an `app-builder` blueprint to `STATIC_BLUEPRINTS` with:
- `requires`: build, container, registry, kernel operations
- `permissions`: `build/`, `container/`, `store/`, `kernel/`
- `category`: `"COMPUTE"` (it's a build/compute tool)
- `iconName`: `"Hammer"` (or `"PackageOpen"`)

### 3. Register in desktop-apps.ts (~4 lines)
- Add `Hammer` to `ICON_MAP`
- Add the lazy component path to `COMPONENT_MAP`

### 4. Update os-taxonomy.ts (~1 line)
Add `"app-builder"` to the `COMPUTE` category's `appIds` array.

## Files

| File | Action | Size |
|---|---|---|
| `src/modules/app-builder/pages/AppBuilderPage.tsx` | **Create** | ~350 lines |
| `src/modules/compose/static-blueprints.ts` | Update | +25 lines |
| `src/modules/desktop/lib/desktop-apps.ts` | Update | +4 lines |
| `src/modules/desktop/lib/os-taxonomy.ts` | Update | +1 line |

## Key Design Decisions

- **Real operations, not mock**: Build calls `buildAppImage()`, Run calls real container lifecycle, Ship calls `shipApp()` — all existing infrastructure.
- **Audit log is first-class**: Every single operation is logged with timestamps and canonical IDs. Export to JSON/CSV with one click.
- **Docker-familiar terminology**: "Image", "Container", "Registry", "Push", "Layers", "Tags" — no UOR jargon in the UI labels. UOR canonical IDs are shown as secondary metadata.
- **Uorfile editor**: Syntax mirrors Dockerfile exactly (FROM, COPY, ENV, EXPOSE, ENTRYPOINT). Developers see a Dockerfile and instantly know what to do.
- **No new infrastructure**: The app is pure UI wiring existing modules together into one cohesive workflow.

