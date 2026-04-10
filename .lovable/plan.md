

# UOR Application Composition Engine — "Sovereign Compose"

## Vision

Three-layer composition model rooted in the existing UOR primitives:

```text
┌─────────────────────────────────────────────────────┐
│  Layer 3: Applications (AppBlueprint)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Oracle   │  │ Vault    │  │ AI-Generated App │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Layer 2: Modules (ModuleUnit)                       │
│  ┌────────┐ ┌─────────┐ ┌──────┐ ┌───────────┐    │
│  │ graph  │ │ oracle  │ │ cert │ │ resolver  │    │
│  └────────┘ └─────────┘ └──────┘ └───────────┘    │
├─────────────────────────────────────────────────────┤
│  Layer 1: Operations (bus ops — atomic)              │
│  kernel/derive  graph/query  cert/issue  store/put  │
│  ring/neg  oracle/ask  vault/encrypt  resolve/name  │
├─────────────────────────────────────────────────────┤
│  Layer 0: UOR Kernel (Fano P0-P6)                    │
│  encode  decode  compose  store  resolve  observe   │
│  seal                                                │
└─────────────────────────────────────────────────────┘
```

## Architecture — Inspired By

| Inspiration | What We Take | Our Equivalent |
|-------------|-------------|----------------|
| **Docker** | Content-addressed images, Dockerfile, layered builds | Already have: Uorfile, image-builder, registry, wasm-loader |
| **Unikraft** | Single-purpose kernel per app, only include what's needed | **AppKernel**: each app gets a minimal subset of bus operations, isolated in its own iframe sandbox |
| **Kubernetes** | Declarative desired-state, pod scheduling, service mesh | **Orchestrator**: declares apps as blueprints, schedules them on the desktop shell, routes inter-app morphisms |
| **OpenShift** | Templates, S2I (source-to-image), operator pattern | **Blueprint Templates**: static app definitions that declare which modules compose the app |

## Core Concepts

### 1. AppBlueprint — The "Pod Spec" for Applications

A declarative, content-addressed JSON-LD document that defines an application by listing which bus operations it requires, which UI component it renders, and what resources it needs.

```typescript
interface AppBlueprint {
  "@type": "uor:AppBlueprint";
  name: string;
  version: string;
  canonicalId: string;               // computed from blueprint content
  requires: string[];                 // bus operations: ["graph/query", "cert/issue"]
  ui: { component: string; lazy: true };
  resources: { memory?: string; workers?: number };
  permissions: string[];              // namespaces this app can access
  morphisms: MorphismInterface[];     // public API for other apps to call
  healthcheck?: { op: string; interval: number };
}
```

### 2. AppKernel — Unikraft-Inspired Isolation

Each running app gets a **minimal kernel** — a filtered view of the bus containing only the operations declared in `requires`. This provides:
- **Least-privilege**: app can only call operations it declared
- **Audit trail**: every call is traced through the bus middleware
- **Hot-swappable**: replace a module's implementation without affecting other apps

```typescript
class AppKernel {
  private allowedOps: Set<string>;
  
  async call(method: string, params: unknown) {
    if (!this.allowedOps.has(method)) throw new PermissionError(method);
    return bus.call(method, params);
  }
}
```

### 3. Orchestrator — Kubernetes-Inspired Scheduling

A singleton that manages the lifecycle of all running AppBlueprints:
- **Desired state reconciliation**: compare declared blueprints vs running instances
- **Dependency resolution**: ensure required modules are loaded before app starts
- **Health monitoring**: periodic healthcheck calls, auto-restart on failure
- **Resource accounting**: track memory/worker usage per app

### 4. AI Composer — Future Intent-Driven Assembly

An edge function that takes user intent + available bus operations and generates an AppBlueprint on-the-fly:

```text
User: "I need to verify a document's identity and share it encrypted"

AI receives: list of 80+ bus operations with descriptions
AI returns:  AppBlueprint { requires: ["kernel/derive", "cert/issue", "vault/encrypt", "store/put"] }

Orchestrator instantiates the blueprint → app appears on desktop
```

## Implementation Plan

### File Structure

```text
src/modules/compose/
  types.ts              — AppBlueprint, AppKernel, OrchestratorState types
  blueprint-registry.ts — Store/retrieve/verify blueprints (content-addressed)
  app-kernel.ts         — Minimal per-app bus proxy with permission enforcement
  orchestrator.ts       — Lifecycle manager: schedule, start, stop, healthcheck
  static-blueprints.ts  — Current 12 desktop apps declared as blueprints
  hooks.ts              — useOrchestrator, useAppKernel React hooks
  index.ts              — Barrel export
```

### Step 1: Types & Blueprint Registry (types.ts, blueprint-registry.ts)

Define `AppBlueprint` interface with content-addressing via `singleProofHash`. Registry stores blueprints in UnsKv, verifiable by canonical ID.

### Step 2: AppKernel — Per-App Isolation (app-kernel.ts)

Wraps `bus.call` with a permission filter. Each app receives its own AppKernel instance scoped to its declared `requires` list. All calls are traced.

### Step 3: Orchestrator — Lifecycle Manager (orchestrator.ts)

Singleton class that:
- Accepts blueprints and schedules them
- Resolves dependency order (topological sort on `requires`)
- Starts/stops apps, tracks running state
- Runs periodic healthchecks
- Exposes state as a reactive observable for UI binding

### Step 4: Static Blueprints (static-blueprints.ts)

Convert the existing 12 `DESKTOP_APPS` entries into `AppBlueprint` declarations. Each blueprint lists the exact bus operations that app uses. The existing `desktop-apps.ts` becomes a thin wrapper that reads from blueprints.

### Step 5: Desktop Integration (hooks.ts + desktop updates)

- `useOrchestrator()` hook provides orchestrator state to desktop shell
- App Hub shows blueprint metadata (required ops, permissions, health)
- System Monitor gains an "Apps" tab showing per-app resource usage

### Step 6: AI Composer (future — edge function)

An edge function that receives:
- User intent (natural language)
- Available bus operations (from `bus.listMethods()` with descriptions)
- Returns an AppBlueprint

The orchestrator validates the blueprint, instantiates it, and renders the UI.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/modules/compose/types.ts` | Create — core type definitions |
| `src/modules/compose/blueprint-registry.ts` | Create — content-addressed blueprint storage |
| `src/modules/compose/app-kernel.ts` | Create — per-app isolated bus proxy |
| `src/modules/compose/orchestrator.ts` | Create — lifecycle manager |
| `src/modules/compose/static-blueprints.ts` | Create — current apps as blueprints |
| `src/modules/compose/hooks.ts` | Create — React hooks |
| `src/modules/compose/index.ts` | Create — barrel export |
| `src/modules/desktop/lib/desktop-apps.ts` | Modify — derive from blueprints |

## What This Enables

**Today (static):** Apps are declared as blueprints with explicit `requires` lists. The orchestrator enforces least-privilege and provides lifecycle management. The system is auditable — you can see exactly which operations each app needs.

**Tomorrow (AI-driven):** The AI Composer generates blueprints from user intent. "I want to analyze my knowledge graph and export a report" produces a custom app on-the-fly that composes `graph/query`, `store/list`, `takeout/export`, and a generated UI. The app is ephemeral or persistable, content-addressed, and fully traceable.

