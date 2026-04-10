

# Cloud-to-Local Handoff via uor:// Deep-Link Protocol

## What Already Exists

- **`session_transfers` table** in the database with token, user_id, target_url, target_lens, used flag, 5-min TTL
- **`portal-transfer` edge function** — POST creates a token (authenticated), GET redeems it (returns magic link hashed_token + email for `verifyOtp`)
- **`QrPortalPanel`** — generates QR codes with portal tokens for cross-device transfer (browser-to-browser)
- **Deep-link handler** — parses `uor://space/`, `uor://resolve/`, `uor://app/`, `uor://search` but **no `handoff` type**
- **Tauri deep-link plugin** — already registered for `uor://` scheme in `tauri.conf.json`
- **Session snapshot system** — `createSnapshot()` captures windows, theme, app buffers, scroll positions

## What's Missing

1. No `handoff` action type in the deep-link parser
2. No desktop-side receiver that redeems a handoff token and signs the user in
3. No "Transfer to Desktop" button in the browser OS that generates a `uor://handoff/{token}` link
4. The QR panel currently generates browser URLs (`/search?portal=...`), not `uor://` deep-link URIs
5. No session snapshot bundling with the transfer token

## Implementation Plan

### Step 1 — Extend Deep-Link Parser

Add `handoff` action type to `DeepLinkAction` union in `src/modules/sovereign-spaces/deep-link/handler.ts`:
```
| { type: "handoff"; token: string }
```
Add parsing for `uor://handoff/{token}` in `parseDeepLink()`.

### Step 2 — Create Handoff Library

New file: `src/modules/desktop/lib/handoff.ts`

**`generateHandoffLink()`** (browser-side):
- Calls `portal-transfer` POST to create a token
- Captures current session snapshot via `createSnapshot()`
- Stores snapshot in `session_transfers` metadata (or a companion row)
- Returns `uor://handoff/{token}` URI string

**`redeemHandoff(token)`** (desktop-side):
- Calls `portal-transfer` GET to redeem token, receives `hashed_token` + `email`
- Signs user in via `supabase.auth.verifyOtp({ token_hash: hashed_token, email, type: 'magiclink' })`
- Fetches the session snapshot associated with the token
- Hydrates local sovereign store with the snapshot via `saveSnapshot()`
- Returns `{ targetUrl, targetLens, snapshot }` for navigation

### Step 3 — Create HandoffReceiver Component

New file: `src/modules/desktop/components/HandoffReceiver.tsx`

- Listens for `handoff` deep-link actions via `onDeepLink()`
- Shows a full-screen animated overlay: "Receiving session from browser..."
- Calls `redeemHandoff(token)` 
- On success: shows module checklist verification, then navigates to `targetUrl`
- On failure: shows clear error with retry option
- Auto-dismisses after successful hydration

### Step 4 — Add "Transfer to Desktop" Button

Modify `src/modules/desktop/DesktopWidgets.tsx`:

Below the existing "Go Sovereign — Download Desktop" CTA, add a "Transfer to Desktop" button (only shown when user is authenticated AND desktop app is detected/installed). This button:
- Calls `generateHandoffLink()`
- Displays the `uor://handoff/{token}` as a clickable link
- Also shows a QR code variant for scanning from desktop

### Step 5 — Wire HandoffReceiver into DesktopShell

In `src/modules/desktop/DesktopShell.tsx`:
- Import and render `<HandoffReceiver />` alongside `<LocalTwinWelcome />`
- It only activates when a `handoff` deep-link is received

### Step 6 — Update QrPortalPanel for Desktop Deep-Links

In `src/modules/oracle/components/QrPortalPanel.tsx`:
- Add option to generate `uor://handoff/{token}` URIs instead of browser URLs
- When the user has the desktop app, the QR code encodes the deep-link URI so scanning opens Tauri directly

## Database Changes

Add a `snapshot_data` JSONB column to `session_transfers` to carry the session snapshot alongside the auth token. This avoids a second table.

```sql
ALTER TABLE public.session_transfers
ADD COLUMN snapshot_data jsonb DEFAULT null;
```

Update the `portal-transfer` edge function to accept and return `snapshot_data`.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/modules/sovereign-spaces/deep-link/handler.ts` | Add `handoff` action type |
| `src/modules/desktop/lib/handoff.ts` | New: generate + redeem logic |
| `src/modules/desktop/components/HandoffReceiver.tsx` | New: deep-link receiver overlay |
| `src/modules/desktop/DesktopShell.tsx` | Wire HandoffReceiver |
| `src/modules/desktop/DesktopWidgets.tsx` | Add "Transfer to Desktop" CTA |
| `src/modules/oracle/components/QrPortalPanel.tsx` | Support `uor://` URI generation |
| `supabase/functions/portal-transfer/index.ts` | Accept/return snapshot_data |
| Migration | Add `snapshot_data` column to `session_transfers` |

## Flow Summary

```text
Browser OS                          Desktop (Tauri)
─────────                          ────────────────
User clicks "Transfer to Desktop"
  ↓
Capture session snapshot
  ↓
POST /portal-transfer
  → creates token + stores snapshot
  ↓
Generate uor://handoff/{token}
  → show as link + QR code
                                    User clicks link / scans QR
                                      ↓
                                    Tauri receives uor://handoff/{token}
                                      ↓
                                    GET /portal-transfer?token=...
                                      → validates, marks used
                                      → returns magic link + snapshot
                                      ↓
                                    verifyOtp() → user signed in
                                    saveSnapshot() → state hydrated
                                      ↓
                                    Desktop shows identical viewpoint
```

