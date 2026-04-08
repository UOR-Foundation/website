

# Unified Context Hub for the Desktop Home Screen

## Overview

The "+" button on the home screen search bar is currently inert — it renders but does nothing. The uploaded reference image (Notion-style "+ New" menu) confirms the desired pattern: a clean dropdown with structured options for adding context, differentiated by user type (guest vs. sovereign ID holder).

The goal is to wire the existing `ContextMenu` component (from sovereign-vault) into the desktop home screen, then extend it with two new capabilities: **Workspace/Project creation** and **Folder organization** — all canonically mapped through the UOR framework via `singleProofHash`.

## Architecture

```text
DesktopWidgets (home screen)
  └─ [+] button ── opens ContextMenu (already built)
       ├── Upload File      → guest: in-memory / sovereign: vault
       ├── Paste Text        → guest: in-memory / sovereign: vault
       ├── Import from URL   → guest: in-memory / sovereign: vault
       ├── ─────────────────
       ├── New Workspace     → creates a UOR-addressed workspace container
       ├── New Folder         → organizes context items into groups
       ├── ─────────────────
       └── Sovereign Vault   → (sovereign users only) persistent encrypted docs
       └── [guest notice]    → (guests only) "session-only" reminder
```

Every item ingested — file, paste, URL, workspace — gets a canonical UOR address via `singleProofHash`, making it part of the unified knowledge graph alongside internet-sourced content.

## Changes

### 1. Wire ContextMenu into DesktopWidgets.tsx

- Import `useContextManager` and `ContextMenu` from sovereign-vault
- Add state for `contextMenuOpen` toggled by the "+" button
- Add `ContextPills` below the search bar to show active context items
- Position the ContextMenu anchored above the "+" button

### 2. Extend ContextMenu with Workspace and Folder options

In `sovereign-vault/components/ContextMenu.tsx`:

- Add two new menu items between the URL import and the divider:
  - **New Workspace** — creates a named container (UOR type `vault:Workspace`) that groups context items. For guests, stored in memory; for sovereign users, persisted to the vault.
  - **New Folder** — creates a named folder (UOR type `vault:Folder`) for organizing items hierarchically.
- Add sub-views for each with a simple name input field
- Both create UOR-addressed objects via `singleProofHash` so they join the unified knowledge graph

### 3. Extend useContextManager with workspace/folder support

In `sovereign-vault/hooks/useContextManager.ts`:

- Add `addWorkspace(name: string)` and `addFolder(name: string)` methods
- For guests: create in-memory items via `guestContext`
- For sovereign users: persist via `vaultStore`
- Each gets a canonical CID derived from its name + creation timestamp

### 4. Extend guest-context.ts with workspace/folder types

In `sovereign-vault/lib/guest-context.ts`:

- Add `addWorkspace(name: string)` and `addFolder(name: string)` methods
- These create `GuestContextItem` entries with source types `"workspace"` and `"folder"`
- Same ephemeral in-memory pattern as existing items

### 5. Update ContextPills to show workspace/folder icons

In `sovereign-vault/components/ContextPills.tsx`:

- Add icon variants for `workspace` and `folder` source types (FolderOpen, Layout icons)
- Differentiate visually from file/paste/url pills

### 6. Update ContextItem type

In `useContextManager.ts`, extend the `ContextItem.source` union:

```typescript
source: "file" | "paste" | "url" | "vault" | "workspace" | "folder";
```

## Guest vs. Sovereign Differentiation

- **Guests**: All context is session-only (in-memory). The ContextMenu already shows a "session-only" notice with a prompt to create a Sovereign ID. No changes needed here — the existing UX handles this gracefully.
- **Sovereign users**: Context persists in the encrypted vault. The "Sovereign Vault" menu item appears, giving access to persistent documents.
- Both user types get the same top-level options (Upload, Paste, URL, Workspace, Folder) — the difference is persistence, not capability.

## UOR Canonical Mapping

Every context item — regardless of type — flows through the same pipeline:

```text
Content → singleProofHash({@type, content, metadata})
        → CID + IPv6 + Glyph + CanonicalId
        → Unified Knowledge Graph node
```

This means user-uploaded files, pasted text, scraped URLs, workspaces, and folders all live in the same address space as internet-sourced knowledge articles — enabling cross-referencing, search, and coherence scoring across the entire graph.

## Files Changed

| File | Change |
|------|--------|
| `src/modules/desktop/DesktopWidgets.tsx` | Wire useContextManager, open ContextMenu from "+" button, show ContextPills |
| `src/modules/sovereign-vault/components/ContextMenu.tsx` | Add Workspace + Folder menu items and sub-views |
| `src/modules/sovereign-vault/hooks/useContextManager.ts` | Add addWorkspace/addFolder methods, extend ContextItem type |
| `src/modules/sovereign-vault/lib/guest-context.ts` | Add addWorkspace/addFolder to guest store |
| `src/modules/sovereign-vault/components/ContextPills.tsx` | Add workspace/folder icon variants |

