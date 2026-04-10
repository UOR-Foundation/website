

# Time Machine — Continuous Auto-Save & System Rollback

## Context

The system already has strong building blocks:
- **SessionSnapshot** (session-state.ts): captures window layout, app buffers, theme, scroll positions — but only keeps 10 in a ring buffer
- **GrafeoDB**: persists the knowledge graph to IndexedDB with export/import (N-Quads, JSON-LD)
- **SovereignStore**: KV persistence (Tauri or localStorage)
- **Orchestrator**: tracks all running app instances and their state
- **AppKernel.seal()**: content-addresses runtime state

What's missing is a **unified checkpoint** that captures *everything* atomically — desktop state, knowledge graph, orchestrator, vault state, and user settings — with configurable auto-save intervals and effortless rollback.

## Architecture

```text
┌────────────────────────────────────────────────────────────────┐
│  Time Machine App (standalone desktop app)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Visual Timeline · Checkpoint List · Settings Panel      │  │
│  │  [Rewind Slider] ─────●────────── [Now]                  │  │
│  │  #14 Today 3:42pm  ●  Auto-save                          │  │
│  │  #13 Today 3:27pm  ●  Auto-save                          │  │
│  │  #12 Today 3:12pm  ●  Manual checkpoint                  │  │
│  │  ...                                                      │  │
│  │  [Restore]  [Fork from here]  [Compare]                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## What a Checkpoint Captures (Exhaustive)

| Layer | Data Captured | Method |
|-------|--------------|--------|
| Desktop | Window positions, sizes, z-order, active window, theme | `useWindowManager` state |
| App Buffers | Scroll positions, draft content, cursor, active tabs | `AppBufferState[]` from continuity |
| Knowledge Graph | Full N-Quads dump (all quads, all graphs) | `grafeoStore.dumpNQuads()` |
| Orchestrator | Running instances, call counts, sealed hashes | `orchestrator.state()` snapshot |
| User Settings | Theme, autosave interval, preferences | SovereignStore KV dump |
| Vault Metadata | Encrypted file index (not raw files — those are immutable CID blobs) | Vault slot manifest |

A checkpoint is content-addressed via `singleProofHash`, producing a verifiable CID. Checkpoints form a chain (each references its parent CID), enabling both linear rollback and forking.

## Storage Strategy (Minimizing Overhead)

- **Incremental by default**: The first checkpoint stores the full N-Quads dump. Subsequent auto-save checkpoints store only a **delta** — the quads added/removed since the last checkpoint — computed by comparing quad counts and tracking change events.
- **Full snapshot on demand**: Manual "Create Checkpoint" always stores the full state for maximum safety.
- **Retention policy**: User-configurable max checkpoints (default 50). Oldest auto-saves are pruned first; manual checkpoints are never auto-pruned.
- **Storage**: IndexedDB via a dedicated `uor-time-machine` store (separate from the graph DB). Each checkpoint is ~10-50KB for desktop state + delta quads; full snapshots scale with graph size.

## Rollback Mechanics

**Restore** replaces the current system state with the checkpoint:
1. Pause the auto-save timer
2. Clear the knowledge graph (`grafeoStore.clear()`)
3. Reload N-Quads from the checkpoint (reconstructed from base + deltas)
4. Restore window layout via `useWindowManager` state injection
5. Restore orchestrator instance states
6. Resume auto-save timer with a fresh checkpoint as the new head

**Fork** creates a branch: the current state is preserved as a named branch, and the system restores to the selected checkpoint. The user can switch branches later.

## Implementation Plan

### Files to Create

| File | Purpose |
|------|---------|
| `src/modules/time-machine/types.ts` | `SystemCheckpoint`, `CheckpointMeta`, `TimeMachineConfig` types |
| `src/modules/time-machine/checkpoint-store.ts` | IndexedDB-backed checkpoint storage with retention policy |
| `src/modules/time-machine/checkpoint-capture.ts` | Captures full system state into a `SystemCheckpoint` |
| `src/modules/time-machine/checkpoint-restore.ts` | Restores system state from a checkpoint (graph, desktop, orchestrator) |
| `src/modules/time-machine/auto-save.ts` | Interval-based auto-save engine with user-configurable timing |
| `src/modules/time-machine/hooks.ts` | `useTimeMachine()`, `useCheckpointList()`, `useAutoSave()` React hooks |
| `src/modules/time-machine/index.ts` | Barrel export |
| `src/modules/time-machine/pages/TimeMachinePage.tsx` | Standalone app UI: timeline, restore, fork, settings |

### Files to Modify

| File | Change |
|------|--------|
| `src/modules/compose/static-blueprints.ts` | Add Time Machine blueprint (category OBSERVE, icon Clock) |
| `src/modules/desktop/lib/desktop-apps.ts` | Add `Clock` to icon map |

### Key Type: SystemCheckpoint

```typescript
interface SystemCheckpoint {
  id: string;                    // Content-addressed CID
  sequence: number;              // Monotonic sequence number
  parentId: string | null;       // Previous checkpoint CID (chain)
  branchName: string;            // "main" or user-defined fork name
  timestamp: string;             // ISO creation time
  type: "auto" | "manual";       // How it was created
  label?: string;                // User-defined label for manual checkpoints

  desktop: SessionSnapshot;      // Full desktop state
  graphNQuads: string;           // Full or delta N-Quads
  isDelta: boolean;              // If true, graphNQuads is a delta
  baseCheckpointId?: string;     // If delta, the full snapshot it's relative to
  orchestratorState: object;     // Serialized orchestrator instances
  settings: Record<string, unknown>; // User preferences KV
  sealHash: string;              // singleProofHash of the entire checkpoint
}
```

### Auto-Save Engine

- Default interval: 15 minutes (user-configurable: 5min / 10min / 15min / 30min / 1hr)
- Only saves if state has actually changed (compares seal hash of current state vs last checkpoint)
- Skips save during active drag/resize operations to avoid capturing transient state
- Emits a subtle toast notification ("Checkpoint saved") with no interruption

### Time Machine App UI

A standalone desktop app with:
- **Timeline view**: Vertical list of checkpoints, newest first, with sequence number, timestamp, and type badge (auto/manual)
- **Rewind slider**: Drag to scrub through checkpoints visually
- **Restore button**: One-click rollback with confirmation dialog
- **Fork button**: Creates a named branch from the selected checkpoint
- **Compare view**: Side-by-side diff of two checkpoints (quad count changes, window layout changes)
- **Settings panel**: Auto-save interval, max checkpoints, retention rules

### Performance Guardrails

- Auto-save runs in a `requestIdleCallback` to avoid blocking the UI
- N-Quads dump is the most expensive operation (~50-200ms for a large graph); only done for full snapshots
- Delta computation uses a lightweight change counter, not a full diff
- Checkpoint storage is in a separate IndexedDB database, so it doesn't compete with GrafeoDB I/O

