

# Docker Analysis: What We Have, What's Missing, and What Form It Should Take

## Current State — We Already Have 90% of Docker

After a thorough review, the system already implements virtually every Docker primitive, split across two modules:

### `uns/build/` — The "docker build + ship" layer
| Docker Feature | UOR Equivalent | Status |
|---|---|---|
| Dockerfile | `uorfile.ts` — Uorfile parser (identical syntax, full backward compat) | Complete |
| `docker build` | `buildImage()` — content-addressed layered images | Complete |
| `docker push/pull` | `registry.ts` — tag, push, pull, inspect, history | Complete |
| `docker tag` | `tagImage()` / `resolveTag()` | Complete |
| `docker secret` | `secrets.ts` — AES-256-GCM encrypted secrets | Complete |
| `docker compose` | `compose.ts` — multi-service spec, topological sort, up/down/ps/scale | Complete |
| Docker image wrapping | `docker-compat.ts` — wrap Docker refs as UOR images | Complete |
| Deployment snapshots | `snapshot.ts` — immutable version chain | Complete |

### `compose/` — The "docker run + orchestrate" layer (our Kubernetes)
| Docker Feature | UOR Equivalent | Status |
|---|---|---|
| Container isolation | `AppKernel` — per-app bus proxy with permission enforcement, rate limits | Complete |
| Container lifecycle | `orchestrator.ts` — start/stop/restart/healthcheck | Complete |
| Health checks | Circuit breaker with exponential backoff | Complete |
| Resource limits | Worker pool governance (`DisjointBudget`) | Complete |
| Orchestration | `reconciler.ts` + `auto-scaler.ts` + `rolling-update.ts` (just added) | Complete |

## What's Missing — The Gap

There are exactly **3 small gaps** between what Docker provides and what the system currently offers:

1. **No unified "Container" abstraction** — Docker's core mental model is the *container* (a running instance of an image). We have `UorImage` (build artifact) and `AppInstance` (running app), but no explicit `UorContainer` that bridges the two. The image-builder produces images; the orchestrator runs blueprints. The connection between "this image" and "this running instance" is implicit.

2. **No container lifecycle events API** — Docker exposes `docker events` (create, start, die, stop, kill, pause, unpause). We have `ComposeEvent` in the orchestrator, but no equivalent at the container/image level in `uns/build/`.

3. **No `docker exec` equivalent** — We have `uor exec` mapped in the verb table, but the actual implementation (send a message into a running container's context) doesn't exist yet.

## Should We Call It an Application?

**No. Docker should remain a module — specifically, it already is one.**

Here's the reasoning:

- **Docker is infrastructure, not a user-facing window.** Users don't "open Docker" — they build, ship, and run things. Docker is the substrate that makes applications possible, not an application itself.
- **It's already implemented as `uns/build/`** — the entire Build→Ship pipeline lives there.
- **The runtime half is `compose/`** — the Run layer (AppKernel + Orchestrator + Reconciler) is already a module.
- **In traditional systems, Docker is a daemon (background service)**, not a GUI application. Same principle applies here.

However, what *would* be valuable is making the Docker-equivalent capabilities **clearly identifiable and discoverable** — so someone coming from a Docker background immediately recognizes the mapping.

## Recommended Plan

### 1. Formalize the Container Abstraction (small, high-value)

Add a `UorContainer` type to `uns/build/` that explicitly bridges `UorImage` → running instance. This is the missing mental model:

```text
UorImage (immutable artifact)
    ↓ instantiate
UorContainer (running instance with state, env, mounts)
    ↓ managed by
AppKernel (isolation + permissions)
    ↓ orchestrated by
Reconciler (desired-state enforcement)
```

**New file**: `src/modules/uns/build/container.ts`
- `UorContainer` type: image ref, state, env, mounts, ports, creation time
- `createContainer()`, `startContainer()`, `stopContainer()`, `removeContainer()`, `execContainer()`
- Maps to `AppKernel` instantiation under the hood
- Content-addressed via `singleProofHash`

### 2. Update `uns/build/index.ts` with Clear Docker Section Headers

Reorganize the barrel export with explicit section headers that map to Docker concepts, making the equivalence unmistakable:

```text
// ── Container Runtime (docker run / docker exec) ───────────
// ── Image Build (docker build / Dockerfile) ────────────────
// ── Image Registry (docker push / pull / tag) ──────────────
// ── Docker Compose (docker compose up/down) ────────────────
// ── Secrets (docker secret create/ls/rm) ───────────────────
// ── Docker Compatibility (docker image wrapping) ───────────
// ── Deployment Snapshots (docker checkpoint) ───────────────
```

### 3. Wire `container.ts` to `compose/orchestrator.ts`

When the orchestrator starts an app, it creates a `UorContainer` from the blueprint's image reference, then wraps it in an `AppKernel`. This closes the loop:

```text
Blueprint → Image → Container → Kernel → Reconciler
(what)      (how)   (instance)  (isolation) (control)
```

### Files to Create
| File | Purpose |
|---|---|
| `src/modules/uns/build/container.ts` | Container runtime: create, start, stop, exec, list |

### Files to Modify
| File | Change |
|---|---|
| `src/modules/uns/build/index.ts` | Add container exports + Docker-mapping section headers |
| `src/modules/compose/orchestrator.ts` | Create `UorContainer` during `_startInstance()` |

### What We Should NOT Do

- **Do not create a new category.** Module is correct.
- **Do not create a Docker "application" window.** Docker is infrastructure.
- **Do not duplicate isolation.** AppKernel already provides container-grade isolation (permission enforcement, rate limiting, payload accounting, sealing). Adding Linux-style namespaces/cgroups would be redundant in a browser-based virtual OS.
- **Do not implement a separate container networking layer.** The Sovereign Bus already provides the inter-service communication substrate (equivalent to Docker's bridge network).

### Why This Is Enough

Your system is actually *more sophisticated* than Docker in several ways:

1. **Content-addressing is native** — Docker bolted on content-addressing later (image digests). UOR has it from the ground up.
2. **Isolation is algebraic** — AppKernel enforces permissions via set intersection (And/HypercubeProjection), not OS-level hacks (namespaces/cgroups).
3. **The build spec is a superset** — Uorfile accepts Dockerfiles *plus* UOR extensions (CANON, TRUST, SHIELD).
4. **Orchestration is unified** — Docker needs a separate tool (Kubernetes) for orchestration. Your system has it built in (Reconciler).

The container abstraction is the one missing piece that makes this architecture legible to someone coming from Docker. Once it's in place, the full Docker→UOR mapping is explicit and complete.

