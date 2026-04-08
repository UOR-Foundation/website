

## Sovereign Context Board — Inline Vault Picker

### What We're Building

A beautiful **"+" button** on the left side of the search input (both desktop immersive view and mobile search bar) that opens a compact **Context Picker** sheet. This lets users select vault documents as context for their search — like attaching files to a message. Selected documents appear as small pills below the search bar, and their content is passed along with the query.

### User Flow

1. User taps the **+** button (left of search input)
2. A slide-up sheet appears showing:
   - Their vault documents as a selectable list (checkbox-style)
   - A quick "Import" button (file or URL) at the bottom
   - A compact search bar to filter documents
3. User taps documents to toggle selection → pills appear below search input
4. User types their query and submits — selected vault docs are included as context
5. Tapping a pill removes it from context

### File Changes

**1. New component: `src/modules/sovereign-vault/components/VaultContextPicker.tsx`**
- A slide-up sheet/popover triggered by the + button
- Shows list of vault documents with checkboxes, file icons, and truncated CIDs
- Filter input at top to narrow down documents
- "Import file" and "Import URL" quick-actions at the bottom
- Uses `useVault()` for data, `AnimatePresence` for smooth transitions
- Returns selected document IDs via an `onSelectionChange` callback
- If not authenticated, shows a gentle "Sign in to use your Sovereign Vault" prompt

**2. New component: `src/modules/sovereign-vault/components/ContextPills.tsx`**
- Renders selected vault documents as small, dismissible pills below the search bar
- Each pill shows a Shield icon + truncated filename + X to remove
- Subtle primary/10 background with primary text — matches existing VaultContextBadge style

**3. Modify: `src/modules/oracle/components/ImmersiveSearchView.tsx`**
- Replace the existing top-bar "Encode" button with the new + button positioned **inside the search input**, on the left side
- Add state: `selectedVaultDocs: string[]` (array of document IDs)
- Render `VaultContextPicker` as a popover anchored to the + button
- Render `ContextPills` between the search input and the vault badge
- Pass selected doc IDs through `onSearch` (extend to include context)

**4. Modify: `src/modules/oracle/components/MobileSearchBar.tsx`**
- Replace the existing `onEncode` Plus button with the vault context picker trigger
- Same popover/sheet pattern, opening upward on mobile
- Render `ContextPills` in a row above the input bar when docs are selected

**5. Modify: `src/modules/sovereign-vault/components/VaultImportDialog.tsx`**
- Add an `embedded` prop variant for inline use within the context picker (compact mode, no Dialog wrapper)

### Design Details

- **+ button**: 36×36px rounded-full, `bg-white/10` on immersive, `bg-white/[0.06]` on mobile, with a smooth scale animation on tap
- **Sheet**: Rounded-2xl, backdrop-blur-xl, max-height 50vh, scrollable document list
- **Document rows**: 48px height, file icon + filename + chunk count + checkbox on right
- **Context pills**: 28px height, rounded-full, Shield icon + filename truncated to 12 chars + X button
- **Import actions**: Compact row at bottom of sheet with Upload and Link2 icons
- **Empty state**: Friendly message with Shield icon when vault is empty
- **Auth gate**: If not signed in, show a soft prompt to sign in

### Technical Notes

- The vault is already linked to the user's sovereign identity via `useAuth()` → `user.id` — persistence across devices is handled by the existing database layer
- No database changes needed — `sovereign_documents` table and RLS policies already exist
- Selected context will be stored in component state (not persisted) — it's per-search-session
- The `onSearch` callback signature doesn't change externally; context doc IDs are passed as a second parameter or via a shared context provider

