

# Anytype-Inspired Sovereign Sync — Local-First Spaces with UOR-Anchored Collaboration

## Anytype's Key Architectural Insights

After deep analysis of the `any-sync` protocol, five patterns stand out as directly compatible with our UOR framework:

### 1. Spaces as ACL-Scoped Graph Partitions
Anytype's **Space** is a collection of objects with a shared Access Control List. Each space is encrypted with its own symmetric key, and only members who hold the key can read/write. Spaces sync independently — your private journal doesn't touch the same sync channel as your team workspace.

**Our equivalent:** Named graph IRIs. We already partition by `graph_iri` (per-device). The leap is: treat `graph_iri` as a **Space** — a permission-scoped, independently-syncable partition of the knowledge graph. Each Space gets its own encryption key derived from UOR content-addressing.

### 2. Change-DAG with Content-Addressed History
Every object in Anytype is a DAG of changes, each node content-addressed. Merging is deterministic: topological sort by hash. No central server decides order.

**Our advantage:** We already content-address everything via `singleProofHash`. Our triples are naturally idempotent (same content = same CID = automatic dedup). We extend this by wrapping mutations in a **Change** envelope that chains to its parent via CID.

### 3. Hybrid Peer Retrieval (mDNS + Cloud)
Anytype uses mDNS for LAN discovery and cloud relay for WAN. Devices on the same WiFi sync directly; remote devices sync via relay nodes.

**Our implementation path:** In Tauri (local), we can use mDNS natively. In browser, we use BroadcastChannel for same-origin tab sync and the existing cloud sync bridge for cross-device. The `runtime.ts` layer determines which transport to activate.

### 4. Creator-Controlled Keys (No Email Registry)
Users generate their own keypair. The system never asks for email. Identity = keypair. This aligns perfectly with our existing `identity/derive` bus operation and Dilithium-3 signatures.

### 5. Snapshots for Fast State Reconstruction
Rather than replaying the full change DAG, Anytype periodically creates snapshots. This is the equivalent of our existing GrafeoDB persistence — the current state is always available locally.

---

## What We Build

### Feature 1: Sovereign Spaces

A **Space** is a named, permission-scoped partition of the knowledge graph. Every user starts with a **Personal Space** (private, single-owner). They can create **Shared Spaces** to collaborate.

**New files:**
| File | Purpose |
|------|---------|
| `src/modules/sovereign-spaces/types.ts` | Space, SpaceMember, SpaceACL types |
| `src/modules/sovereign-spaces/space-manager.ts` | Create, join, leave, list spaces; ACL enforcement |
| `src/modules/sovereign-spaces/space-keys.ts` | Per-space symmetric key derivation (from UOR hash of space metadata + owner pubkey) |
| `src/modules/sovereign-spaces/components/SpaceSwitcher.tsx` | UI: dropdown in the tab bar to switch active space context |
| `src/modules/sovereign-spaces/components/SpaceSettings.tsx` | UI: manage members, permissions, space metadata |

**How it works:**
- Each Space maps to a `graph_iri` prefix: `urn:uor:space:{spaceCid}`
- All knowledge graph operations (ingest, query, daily notes) are scoped to the active space
- Space membership is an ACL stored as a content-addressed DAG (like Anytype)
- ACL changes require cloud consensus validation (prevents split-brain permission conflicts)
- Personal Space = `urn:uor:space:personal:{userId}` — always exists, never shared

**Database migration:**
```sql
CREATE TABLE sovereign_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cid TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_type TEXT NOT NULL DEFAULT 'personal', -- personal | shared | public
  graph_iri TEXT NOT NULL UNIQUE,
  encrypted_key TEXT, -- encrypted symmetric key for E2E
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES sovereign_spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'reader', -- owner | writer | reader
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, user_id)
);
```

### Feature 2: Change-DAG Sync Engine

Replace the current "push all pending / pull all missing" sync with a **change-DAG** model where each mutation is a content-addressed change that references its parent(s).

**Modified files:**
| File | Change |
|------|--------|
| `src/modules/knowledge-graph/sync-bridge.ts` | Rewrite: change-DAG push/pull with head comparison |
| `src/modules/knowledge-graph/types.ts` | Add `ChangeEnvelope` type |

**New files:**
| File | Purpose |
|------|---------|
| `src/modules/sovereign-spaces/sync/change-dag.ts` | Change envelope creation, DAG traversal, head merge |
| `src/modules/sovereign-spaces/sync/transport.ts` | Transport abstraction: cloud, BroadcastChannel, Tauri IPC |

**How sync works (Anytype-style):**
1. Each mutation (triple insert/delete) is wrapped in a `ChangeEnvelope`: `{ parentCids: [...], payload, authorDeviceId, signature }`
2. The envelope is content-addressed: `singleProofHash(envelope) → changeCid`
3. Sync = compare heads. Device A says "my head is X", Device B says "mine is Y". If X ≠ Y, exchange the missing changes and merge heads.
4. Merge = topological sort by CID (deterministic, same on every device)
5. Content-addressing guarantees: same change on two devices = same CID = automatic dedup

### Feature 3: Multi-Transport Peer Discovery

**New file: `src/modules/sovereign-spaces/sync/peer-discovery.ts`**

Three transports, selected by `runtime.ts`:

| Transport | Environment | Discovery | Sync Channel |
|-----------|------------|-----------|--------------|
| `BroadcastChannel` | Browser (same origin) | Automatic | Shared memory |
| `Cloud Relay` | Any (authenticated) | Cloud DB | Lovable Cloud (existing) |
| `Tauri mDNS` | Local (Tauri) | mDNS | TCP direct |

All transports implement the same interface:
```typescript
interface SyncTransport {
  announce(spaceId: string, head: string): void;
  onHeadUpdate(cb: (peerId: string, spaceId: string, head: string) => void): void;
  requestChanges(peerId: string, since: string[]): Promise<ChangeEnvelope[]>;
}
```

### Feature 4: Space-Scoped UI Integration

**Modified files:**
| File | Change |
|------|--------|
| `src/modules/desktop/TabBar.tsx` | Add SpaceSwitcher to the left of the wordmark |
| `src/modules/oracle/components/DailyNotes.tsx` | Scope daily notes to active space |
| `src/modules/knowledge-graph/grafeo-store.ts` | Add `withSpace(graphIri)` query scoping |
| `src/modules/bus/modules/graph.ts` | Add `graph/space-create`, `graph/space-switch` ops |

### Feature 5: Sync Status Indicator

A small pill in the tab bar showing real-time sync state per-space:

```
● Synced (3 devices)  |  ○ 2 pending  |  ◌ Offline (local)
```

**New file: `src/modules/sovereign-spaces/components/SyncIndicator.tsx`**

Uses the existing `syncBridge.subscribeSyncState()` pattern, extended with device count and per-space granularity.

---

## Files Summary

| File | Action |
|------|--------|
| `src/modules/sovereign-spaces/types.ts` | Create |
| `src/modules/sovereign-spaces/space-manager.ts` | Create |
| `src/modules/sovereign-spaces/space-keys.ts` | Create |
| `src/modules/sovereign-spaces/sync/change-dag.ts` | Create |
| `src/modules/sovereign-spaces/sync/transport.ts` | Create |
| `src/modules/sovereign-spaces/sync/peer-discovery.ts` | Create |
| `src/modules/sovereign-spaces/components/SpaceSwitcher.tsx` | Create |
| `src/modules/sovereign-spaces/components/SpaceSettings.tsx` | Create |
| `src/modules/sovereign-spaces/components/SyncIndicator.tsx` | Create |
| `src/modules/knowledge-graph/sync-bridge.ts` | Modify — change-DAG model |
| `src/modules/knowledge-graph/types.ts` | Modify — add ChangeEnvelope |
| `src/modules/knowledge-graph/grafeo-store.ts` | Modify — space-scoped queries |
| `src/modules/desktop/TabBar.tsx` | Modify — SpaceSwitcher + SyncIndicator |
| `src/modules/bus/modules/graph.ts` | Modify — space operations |
| Database migration | Create `sovereign_spaces` and `space_members` tables with RLS |

## What This Does NOT Include (Future Phases)

- Full Tauri mDNS transport (requires native Rust; scaffolded as interface only)
- WebRTC direct peer connections for global P2P (requires signaling server)
- Multi-user real-time co-editing within a space (needs operational transform on top of change-DAG)
- Space-scoped file storage (Vault documents partitioned by space)

## Design Principle

Anytype's genius is that **the network is optional but sync is automatic**. Our implementation follows the same rule: every operation works locally first. Sync is background, invisible, and deterministic. Spaces give users sovereign control over who sees what — enforced cryptographically by UOR-derived keys, not by server-side access checks alone.

