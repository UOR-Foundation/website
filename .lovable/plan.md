

## Cross-Device Portal — QR Code Session Bridge

### What It Does

A "Portal" button integrated into the address bar generates a QR code that, when scanned on mobile, opens the exact same page with an authenticated session transfer token. The mobile device picks up where the desktop left off — same content, same lens, same view.

### Architecture

The flow uses a short-lived, one-time session transfer token stored in the database:

```text
Desktop clicks Portal icon (in address bar)
  → Creates a session_transfer row in DB:
      { token (random UUID), user_id, target_url, created_at, used: false }
      (auto-expires after 5 minutes)
  → Generates QR code pointing to:
      https://{app}/resolve?portal={token}
  → Shows QR in an animated dropdown panel from the address bar

Mobile scans QR
  → App loads, reads ?portal= param
  → Edge function validates token (not expired, not used, marks used)
  → Returns a new session for that user_id
  → Mobile navigates to the target_url with active session
```

### Database Migration

New table `session_transfers`:
- `id` (uuid, PK)
- `token` (text, unique, indexed)
- `user_id` (uuid, references auth.users)
- `target_url` (text) — the current page path + search params
- `target_lens` (text) — current active lens
- `created_at` (timestamptz, default now())
- `used` (boolean, default false)
- RLS: users can only insert/read their own rows

### Edge Function: `portal-transfer`

- **POST** (create): Authenticated user creates a transfer token. Stores user_id, target URL, lens. Returns the token.
- **GET** (redeem): Receives token, validates (< 5 min old, not used), marks used, generates a new auth session for that user via `supabase.auth.admin.generateLink()` or creates a magic link. Returns redirect URL with session.

Since generating arbitrary sessions requires the service role key, the edge function handles this securely server-side.

### UI: QR Portal Panel in ReaderToolbar

Replace the existing no-op `Share2` button with a Portal button (using `QrCode` icon from lucide). On click, it:

1. Calls the edge function to create a transfer token
2. Uses the existing `qrcode` library to generate a QR data URL
3. Opens an animated dropdown panel (same style as the history dropdown) showing:
   - The QR code with a subtle animated glow border
   - "Scan to continue on mobile" label
   - A 5-minute countdown timer
   - A "Regenerate" button after expiry
   - Small lock icon + "Encrypted session transfer" text for trust

The panel animates in with the same `motion.div` pattern as `HistoryDropdown`.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/portal-transfer/index.ts` | New edge function — create and redeem session transfer tokens |
| **DB migration** | New `session_transfers` table with RLS |
| `src/modules/oracle/components/ReaderToolbar.tsx` | Add QR Portal button (replacing Share2), QR dropdown panel with countdown |
| `src/modules/oracle/components/QrPortalPanel.tsx` | New component — QR display with glow animation, countdown timer, status states |
| `src/modules/oracle/pages/ResolvePage.tsx` | Handle `?portal=` query param on load — call redeem endpoint, set session, navigate to target |

### Security

- Tokens are UUID v4 (unguessable)
- 5-minute TTL enforced server-side
- One-time use (marked `used` on redeem)
- Service role key stays in the edge function — never exposed to client
- RLS ensures users can only create tokens for themselves

### Visual Design

The QR panel uses the same frosted glass / dark immersive styling as the history dropdown. The QR code itself renders with a subtle `conic-gradient` animated border (like a scanning beam) to feel magical and alive. The countdown shows as a thin progress arc around the QR.

