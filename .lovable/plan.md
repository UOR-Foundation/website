
# Standardized App Build & Run Pipeline — Docker/K8s Aligned

## Docker/K8s Alignment Audit

The pipeline must feel native to developers who know Docker + K8s. Here's the exact mapping:

### Docker Build Phase

| Docker Command | Our Equivalent | Module | Status |
|---|---|---|---|
| `Dockerfile` | `Uorfile` | uns/build/uorfile.ts | ✅ exists |
| `docker build -t myapp:1.0 .` | `buildImage(spec)` | uns/build/uorfile.ts | ✅ exists |
| `docker tag` | `tagImage(id, tag)` | uns/build/registry.ts | ✅ exists |
| `docker push` | `pushImage(id)` | uns/build/registry.ts | ✅ exists |
| `docker pull` | `pullImage(tag)` | uns/build/registry.ts | ✅ exists |
| `docker inspect <image>` | `inspectImage(id)` | uns/build/registry.ts | ✅ exists |
| `docker history` | `imageHistory(id)` | uns/build/registry.ts | ✅ exists |

### Docker Run Phase

| Docker Command | Our Equivalent | Module | Status |
|---|---|---|---|
| `docker create --name app myapp:1.0` | `createContainer(config)` | uns/build/container.ts | ✅ exists |
| `docker start app` | `startContainer(id)` | uns/build/container.ts | ✅ exists |
| `docker stop app` | `stopContainer(id)` | uns/build/container.ts | ✅ exists |
| `docker exec app cmd` | `execContainer(id, cmd)` | uns/build/container.ts | ✅ exists |
| `docker inspect app` | `inspectContainer(id)` | uns/build/container.ts | ✅ exists |
| `docker logs app` | `containerLogs(id)` | uns/build/container.ts | ✅ exists |
| `docker pause/unpause` | `pauseContainer()/unpauseContainer()` | uns/build/container.ts | ✅ exists |
| `docker rm` | `removeContainer(id)` | uns/build/container.ts | ✅ exists |

### Kubernetes Orchestration Phase

| K8s Concept | Our Equivalent | Module | Status |
|---|---|---|---|
| `Pod YAML` | `AppBlueprint` | compose/types.ts | ✅ exists |
| `kubectl apply -f` | `orchestrator.launch(blueprint)` | compose/orchestrator.ts | ✅ exists |
| Controller Manager | `SovereignReconciler` | compose/reconciler.ts | ✅ exists |
| HPA | `SovereignAutoScaler` | compose/reconciler.ts | ✅ exists |
| Rolling Update | `SovereignRollingUpdate` | compose/reconciler.ts | ✅ exists |
| cgroup/namespace | `AppKernel` | compose/app-kernel.ts | ✅ exists |
| `docker-compose.yml` | `ComposeSpec` | uns/build/compose.ts | ✅ exists |
| `kubectl create secret` | `createSecret()` | uns/build/secrets.ts | ✅ exists |
| `docker checkpoint` | `createSnapshot()` | uns/build/snapshot.ts | ✅ exists |

### Gap Analysis — What's Missing

All primitives exist. What's missing is the **unified pipeline controller** and **type alignment**:

1. **No enforced pipeline** — apps can skip validation, skip image build, or bypass kernel isolation
2. **Type mismatches** — orchestrator passes `memoryBytes` but container expects `memoryLimitMB`
3. **No `restartPolicy`** on containers — Docker has `--restart=always|on-failure|no`
4. **No serializable manifest** — no `docker inspect`-equivalent showing full running app anatomy
5. **No pipeline status visibility** — System Monitor doesn't show build/ship/run phases

## Implementation

### 1. `AppPipeline` — The `docker build && docker run` Equivalent
**File:** `src/modules/compose/pipeline.ts` (~200 lines)

Maps to Docker workflow:
- `Dockerfile` → Uorfile (blueprint) — "what to build"
- `docker build` → `AppPipeline.build()` — "create content-addressed image"
- `docker create` → `AppPipeline.create()` — "instantiate container from image"
- `docker start` → `AppPipeline.start()` — "start container + kernel isolation"
- `kubectl apply` → `AppPipeline.deploy()` — "full pipeline: validate→build→create→start→reconcile"

### 2. `BlueprintSchema` — The Admission Controller
**File:** `src/modules/compose/schema.ts` (~80 lines)

K8s admission controllers reject malformed Pod specs before they reach the scheduler. This is our equivalent.

### 3. `AppManifest` — The `docker inspect` / `kubectl describe` Equivalent
**File:** `src/modules/compose/manifest.ts` (~60 lines)

Complete JSON description of a running workload: blueprint, image digest, container state, kernel config, resource usage, dependency graph.

### 4. Fix Orchestrator Type Alignment
**File:** `src/modules/compose/orchestrator.ts` (update)

Wire `_startInstance` through `AppPipeline.deploy()`, fix type mismatches.

### 5. Add `restartPolicy` to Container Config
**File:** `src/modules/uns/build/container.ts` (update)

Add `--restart=always|unless-stopped|on-failure|no` equivalent.

### 6. Pipeline Status in System Monitor
**File:** `src/modules/boot/SystemMonitorApp.tsx` (update)

Per-app pipeline phases: `Validated ✓ → Built ✓ → Created ✓ → Running ✓ → Reconciled ✓`

## Naming Convention — Docker/K8s Verbs

Every public API uses verbs developers already know:
- `build()` not `compile()` — matches `docker build`
- `create()` not `instantiate()` — matches `docker create`
- `start()`/`stop()` — matches `docker start/stop`
- `deploy()` — matches `kubectl apply`
- `inspect()` — matches `docker inspect`
- `logs()` — matches `docker logs`
- `exec()` — matches `docker exec`
- `pull()`/`push()` — matches `docker pull/push`

## Files Summary

| File | Action | Docker/K8s Equivalent |
|---|---|---|
| `src/modules/compose/pipeline.ts` | Create | `docker build && docker run` unified CLI |
| `src/modules/compose/schema.ts` | Create | K8s Admission Controller |
| `src/modules/compose/manifest.ts` | Create | `docker inspect` / `kubectl describe` |
| `src/modules/compose/orchestrator.ts` | Update | Wire pipeline into scheduler |
| `src/modules/uns/build/container.ts` | Update | Add `--restart` policy |
| `src/modules/boot/SystemMonitorApp.tsx` | Update | Dashboard pipeline phase view |

~340 lines new, ~100 lines updated. All UOR-rooted, all Docker/K8s-familiar.
