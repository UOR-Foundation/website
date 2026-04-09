

## Plan: Perplexity-Style Contextual Sign-In Experience

### What We're Building

A reusable, modal-based sign-in prompt that appears contextually at moments of delight or friction during guest exploration. Instead of a generic "Sign in" message, the modal dynamically adapts its headline and benefit text based on what the guest was doing when prompted. The sign-in options mirror the Perplexity reference: Google OAuth, Apple OAuth, email/password, with a clean divider between social and credential flows.

### Architecture

```text
AuthPromptModal (new shared component)
├── Dynamic headline + benefit text (from context prop)
├── "Continue with Google" button (lovable.auth.signInWithOAuth)
├── "Continue with Apple" button (lovable.auth.signInWithOAuth)
├── ── or ── divider
├── Email input + "Continue with email" (email/password form)
├── Toggle: sign-in ↔ create account
├── Privacy policy link
└── Close button

SignInContext (enum-like prop):
  "react"      → "Sign in to react and engage"
  "vote"       → "Sign in to vote on contributions"
  "fork"       → "Sign in to fork and remix objects"
  "vault"      → "Sign in to persist your vault"
  "messenger"  → "Sign in for encrypted messaging"
  "comment"    → "Sign in to join the conversation"
  "save"       → "Sign in to save your progress"
  "identity"   → "Sign in to claim your sovereign identity"
  "transfer"   → "Sign in for encrypted session transfer"
  "default"    → "Sign in to unlock your full experience"
```

### Trigger Points (Delight-Based Prompting)

Replace all existing `toast("Sign in to X", { icon: "🔒" })` calls with the modal. Additionally, add new prompts at delight moments:

| Location | Trigger | Context | Current Behavior |
|---|---|---|---|
| AddressCommunity — react | Guest clicks reaction | `"react"` | Toast |
| AddressCommunity — vote | Guest clicks vote | `"vote"` | Toast |
| ResolvePage — fork | Guest clicks fork | `"fork"` | Toast |
| VaultPanel — guest banner | Guest sees banner | `"vault"` | Static text |
| VaultContextPicker | Guest opens vault picker | `"vault"` | Static text |
| Messenger | Guest opens messenger | `"messenger"` | Static text |
| QrPortalPanel | Guest uses transfer | `"transfer"` | Static text |
| After 3rd search query | Guest has explored 3+ queries | `"save"` | **New** — delight moment |
| After first comment | Guest posts a guest comment | `"comment"` | **New** — delight moment |

### Sign-In Options (Fully Functional)

1. **Continue with Google** — calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` (already working via Lovable Cloud managed credentials)
2. **Continue with Apple** — calls `lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })` (already supported)
3. **Email + Password** — uses `supabase.auth.signInWithPassword` for sign-in, `supabase.auth.signUp` for account creation (existing logic from SovereignIdentityPanel)

### Visual Design (Perplexity-Inspired)

- Centered modal overlay with `backdrop-blur` dimming
- Large serif-style headline (matching reference: "Sign in to save and collect threads")
- Subtle privacy policy link below headline
- Full-width rounded buttons: Google (dark fill), Apple (outlined)
- Thin `── or ──` divider
- Email input field + "Continue with email" button
- "Create account" / "Sign in" toggle at bottom
- Close button (X) top-right + "Close" text link at bottom
- Smooth fade-in/scale animation

### Implementation

**New file: `src/modules/auth/AuthPromptModal.tsx`**
- Reusable modal component accepting `open`, `onClose`, `context` (string key for dynamic text)
- Contains all three sign-in methods (Google, Apple, email/password)
- Mode toggle between sign-in and sign-up
- After successful auth, calls `onClose()` and the user continues where they were

**Modified file: `src/modules/oracle/components/SovereignIdentityPanel.tsx`**
- Replace the unauthenticated form section with the new `AuthPromptModal` style (or import it)
- Keep the authenticated profile view as-is

**Modified files (replace toast → modal):**
- `src/modules/oracle/components/AddressCommunity.tsx` — replace `toast("Sign in to react/vote")` with `setAuthPrompt("react"/"vote")`
- `src/modules/oracle/pages/ResolvePage.tsx` — replace fork toast with modal trigger
- `src/modules/sovereign-vault/components/VaultPanel.tsx` — replace guest banner with clickable prompt
- `src/modules/messenger/pages/MessengerPage.tsx` — replace static text with modal trigger
- `src/modules/oracle/components/QrPortalPanel.tsx` — replace static text with modal trigger

**Delight-moment triggers (new logic):**
- In ResolvePage or the search flow, track `guestQueryCount` in state. After the 3rd search, show modal with context `"save"` — "Sign in to save your search history"
- In AddressCommunity, after a guest successfully posts a comment, show the modal with context `"comment"` — "Sign in to get notified when someone replies"

### Post-Auth Flow

On successful sign-in, the auth state propagates via `useAuth()` context. All components re-render with `user` now defined, unlocking persistent vault, reactions, voting, forking, and messaging. The guest's session becomes a sovereign account.

### Files Modified
- **New**: `src/modules/auth/AuthPromptModal.tsx`
- `src/modules/oracle/components/SovereignIdentityPanel.tsx` — use shared auth UI
- `src/modules/oracle/components/AddressCommunity.tsx` — modal instead of toast
- `src/modules/oracle/pages/ResolvePage.tsx` — modal instead of toast + delight trigger
- `src/modules/sovereign-vault/components/VaultPanel.tsx` — clickable prompt
- `src/modules/messenger/pages/MessengerPage.tsx` — modal trigger
- `src/modules/oracle/components/QrPortalPanel.tsx` — modal trigger

