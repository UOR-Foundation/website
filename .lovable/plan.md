

## Plan: Offline-First Coherence — Unified Connectivity Context + Feature Awareness

### Current State

**Already works offline:**
- Knowledge Graph (IndexedDB): full CRUD, traversal, search, reasoning, blueprint decomposition/materialization
- Graph compute: semantic similarity, deductive/inductive/abductive queries, compression, coherence verification
- Data Bank L1: localStorage read/write with pending-write queue
- Content ingestion: entity extraction, column mapping, blueprint generation
- All UOR hashing, canonicalization, and content-addressing

**Requires online:**
- Oracle (LLM streaming) — needs backend edge function
- KG cloud sync (sync-bridge) — pushes/pulls triples
- Data Bank L2 — encrypted cloud sync
- Semantic Web Bridge (Firecrawl scraping) — URL ingestion
- Voice input (Picovoice) — downloads model on first use
- Authentication — Supabase auth

**Current UI feedback:** Single Wifi icon with green/red dot in the menu bar. No per-feature awareness.

### What's Missing

1. **A shared connectivity context** — multiple components independently check `navigator.onLine`; there's no single reactive source of truth that also tracks *what's degraded*
2. **Per-feature offline hints** — users don't know which features need the network until they fail
3. **Graceful degradation in the Oracle** — currently just errors with "Failed to connect"

### Changes

**1. New: `src/modules/desktop/hooks/useConnectivity.tsx`**

A React context + provider that centralizes connectivity state:

```
ConnectivityState {
  online: boolean;
  features: {
    oracle: { available: boolean; offlineReason: "Requires internet for AI responses" }
    kgSync: { available: boolean; offlineReason: "Graph syncs when back online" }
    dataBank: { available: boolean; offlineReason: "Data saved locally, syncs when online" }
    webBridge: { available: boolean; offlineReason: "URL ingestion requires internet" }
    voice: { available: boolean; offlineReason: "Voice model may need initial download" }
    auth: { available: boolean; offlineReason: "Sign-in requires internet" }
  }
}
```

- Listens to `online`/`offline` events
- Computes feature availability from `online` + auth state
- Exposes `useConnectivity()` hook for any component
- Exposes `isFeatureAvailable(featureId)` helper

**2. Update: `src/modules/desktop/DesktopMenuBar.tsx`**

- Replace inline `online` state with `useConnectivity()`
- On click of the Wifi icon, show a small popover/tooltip listing feature status (not a full modal — keep it light)
- Each feature shows a tiny dot (green/amber/red) + one-line status
- The popover disappears on click-outside; acts as a quick status glance

**3. Update: `src/modules/oracle/pages/OraclePage.tsx` and `OracleOverlay.tsx`**

- Before streaming, check `useConnectivity().features.oracle.available`
- When offline, show a gentle inline message in the chat area: "You're offline. The Oracle needs an internet connection to respond. Your knowledge graph, local search, and saved data are all still available."
- Disable the send button with a subtle offline indicator (not error-red, just muted)
- Keep the input visible so users can still type (queue for when online returns)

**4. Update: `src/modules/oracle/lib/stream-oracle.ts`**

- Add an early `navigator.onLine` check before `fetch()` — surface a friendlier error: "You're currently offline. The Oracle will be available when your connection returns."

**5. Update: `src/modules/knowledge-graph/sync-bridge.ts`**

- When sync is attempted offline, queue the intent and auto-trigger when `online` event fires (already partially done)
- Add a `pendingSync` flag to state so UI can show "Will sync when online"

**6. Update: `src/modules/desktop/DesktopShell.tsx`**

- Wrap the inner shell with `ConnectivityProvider`
- Pass connectivity down naturally via context (no prop drilling)

**7. Update: `src/modules/desktop/DesktopWidgets.tsx`** (home screen)

- When offline, show a subtle ambient banner at the bottom of the widget area: "Offline mode — your local knowledge graph and data are fully available"
- Use a calm, reassuring tone — not an error banner

**8. New: `src/modules/desktop/components/ConnectivityPopover.tsx`**

Small popover triggered by clicking the Wifi icon in the menu bar:
- Header: "System Status" with green/red dot
- Feature list with per-feature status dots
- When online: all green, shows "All systems operational"
- When offline: shows which features are available (green) vs degraded (amber)
- Includes KG stats (node count, edge count) as reassurance that local data is intact
- Footer: "Last synced: 2 min ago" from sync-bridge state

### Files Summary

| File | Action |
|------|--------|
| `src/modules/desktop/hooks/useConnectivity.tsx` | New — centralized connectivity context |
| `src/modules/desktop/components/ConnectivityPopover.tsx` | New — status popover for menu bar |
| `src/modules/desktop/DesktopMenuBar.tsx` | Use connectivity context, wire popover |
| `src/modules/desktop/DesktopShell.tsx` | Wrap with ConnectivityProvider |
| `src/modules/desktop/DesktopWidgets.tsx` | Subtle offline banner on home |
| `src/modules/oracle/lib/stream-oracle.ts` | Early offline check with friendly error |
| `src/modules/oracle/pages/OraclePage.tsx` | Offline-aware chat UI |
| `src/modules/oracle/components/OracleOverlay.tsx` | Offline-aware overlay |
| `src/modules/knowledge-graph/sync-bridge.ts` | Expose pendingSync flag |

### Design Principles

- **Reassuring, not alarming**: offline mode shows what IS available, not what isn't
- **Contextual, not global**: feature hints appear only where relevant (Oracle input shows Oracle status, not a global banner)
- **One glance**: the menu bar Wifi icon click gives full system status in 2 seconds
- **Zero friction**: no modals, no blocking dialogs, no red error screens
- **Local-first confidence**: emphasize that the KG, data, and search all work perfectly offline

