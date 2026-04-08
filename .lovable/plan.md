

## Fork & Provenance for UOR Addresses

### Concept

Every address profile gets a **"Fork"** button. When clicked, it creates a new content-addressed object that wraps the original source with provenance metadata — a `uor:Fork` type containing `uor:forkedFrom` (parent CID), `uor:forkedAt` (timestamp), and the user's modifications. Because the fork is itself content-addressed, changing anything produces a different CID, creating an **immutable chain of proofs** back to the origin — like Git/GitHub forks but without mining or consensus.

The parent profile shows **fork count** and links to forks. The forked profile shows a **provenance banner** linking back to the parent. This is recursive — forks of forks build a tree.

### Database

**New table: `address_forks`**
- `id` (uuid, PK)
- `parent_cid` (text, NOT NULL) — the CID being forked
- `child_cid` (text, NOT NULL) — the new forked CID
- `user_id` (uuid, references auth.users) — who forked
- `fork_note` (text) — optional annotation ("remixed for…")
- `created_at` (timestamptz)
- Unique constraint on `(parent_cid, child_cid)`
- RLS: anyone can read, authenticated users can insert their own

Enable realtime for live fork count updates.

### Fork Data Model

When a user forks an address, the system creates a new JSON-LD object:

```json
{
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:Fork",
  "uor:forkedFrom": {
    "uor:cid": "<parent-cid>",
    "uor:triword": "<parent-triword>",
    "uor:forkedAt": "<ISO timestamp>"
  },
  "uor:content": { /* clone of original source, user can modify */ },
  "uor:forkNote": "remixed for..."
}
```

This gets encoded via the existing `encode()` pipeline → new CID, new triword, new identity. The `uor:forkedFrom` field is part of the content, so it's **baked into the hash** — provenance is cryptographically inseparable from the fork.

### Edge Function Update

Extend `address-social` with two new actions:
- `POST { action: "fork", parentCid, childCid, note? }` — Record a fork relationship
- `GET ?cid=...` response gains `forkCount` and `forkedFrom` (if this CID is itself a fork)

### UI Changes

**1. Fork Button in Action Bar** (`ResolvePage.tsx`)
- New button: `⑂ Fork` alongside existing actions
- Click opens a minimal modal: shows the source content (read-only), an optional "Fork note" text field, and a "Create Fork" button
- On submit: clones source, wraps in `uor:Fork` envelope, encodes via `encode()`, records in `address_forks`, navigates to the new address profile

**2. Provenance Banner** (`ResolvePage.tsx`)
- If the resolved object has `@type: "uor:Fork"`, show a banner under the profile header:
  `"⑂ Forked from Alpha · Bravo · Charlie"` with a clickable link to the parent
- Recursive: if parent is also a fork, the chain is walkable

**3. Fork Count in Social Stats** (`AddressCommunity.tsx`)
- Add fork count to the stats line: `"47 visitors · 12 reactions · 3 forks"`
- Clicking "3 forks" shows a dropdown listing child forks with their triwords

**4. Provenance Tree** (new section on profile)
- Below Identity Card, if forks exist, show a minimal tree:
  ```
  ⑂ Provenance
  └─ Parent · Triword · Link  (if this is a fork)
  └─ 3 forks: Child1, Child2, Child3  (if others forked this)
  ```

### Files to Create/Modify

- **New migration**: `address_forks` table with RLS + realtime
- **Modified**: `supabase/functions/address-social/index.ts` — add fork recording and fork count to GET response
- **Modified**: `src/modules/oracle/pages/ResolvePage.tsx` — Fork button in action bar, provenance banner, fork modal
- **Modified**: `src/modules/oracle/components/AddressCommunity.tsx` — fork count in stats line

### Why This Works

Content-addressing makes provenance **trustless** — the `uor:forkedFrom` field is hashed into the CID, so it cannot be added or removed after creation. Every fork is a cryptographic commitment to its parent. Walking the chain from any node back to the root requires no authority, no blockchain, no mining — just hash verification. The `address_forks` table is an index for convenience (fast fork counts), but the provenance itself lives in the content.

