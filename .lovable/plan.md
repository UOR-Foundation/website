

## Fix: QR Portal Panel Not Working

### Root Cause Analysis

The QR Portal panel code has several issues that prevent it from working on the published `uor.foundation` site:

1. **`PUBLISHED_ORIGIN` is hardcoded** to `"https://univeral-coordinate-hub.lovable.app"` (line 54 in QrPortalPanel.tsx). When accessed from `uor.foundation`, the QR code would point to the wrong domain.

2. **`VITE_SUPABASE_PROJECT_ID` may be undefined** on the GitHub Actions-deployed `uor.foundation` site, causing the authenticated edge function call to hit `https://undefined.supabase.co/...` and fail silently.

3. **`supabase.auth.getSession()` may throw** on the external domain if the Supabase client is misconfigured for that origin, causing `generateToken` to fail before any UI state (loading/error/QR) is set.

4. **No console logging** — errors are caught but only shown in the panel UI, making debugging impossible from the health report.

### Changes

**File: `src/modules/oracle/components/QrPortalPanel.tsx`**

- Replace hardcoded `PUBLISHED_ORIGIN` with `window.location.origin` so the QR always points to the current domain
- Wrap `supabase.auth.getSession()` in a try-catch so it gracefully falls back to guest mode instead of throwing
- Add `console.warn` to the error handler for debuggability
- Use `VITE_SUPABASE_URL` (which is always available) instead of manually constructing the Supabase URL from project ID

### Technical Details

```text
Current flow:
  click → setPortalOpen(true) → generateToken()
    → supabase.auth.getSession()  ← may throw on uor.foundation
    → fetch(...undefined.supabase.co...)  ← broken URL
    → error swallowed, panel shows loading forever or empty

Fixed flow:
  click → setPortalOpen(true) → generateToken()
    → try getSession(), catch → guest mode
    → guest: use window.location.origin + targetUrl → QR generated
    → auth: use VITE_SUPABASE_URL for edge function URL → QR generated
    → console.warn on any error
```

