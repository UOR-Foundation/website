

## Plan: Perplexity-Style Unified Sign-In Modal

### What Changes

Redesign `AuthPromptModal.tsx` to match the Perplexity pattern exactly — a single canonical entry point that handles both sign-in and sign-up without the user needing to choose a mode upfront.

### Key Design Decisions

**1. Unified entry (no mode toggle)**
Instead of separate "sign in" / "create account" modes, the email flow works like Perplexity:
- Email input is always visible inline (not behind a button)
- User enters email, clicks "Continue with email"
- Password field slides in below
- On submit, we try `signInWithPassword` first. If it fails with "Invalid login credentials", we automatically try `signUp`. The user never has to pick a mode — the system figures it out.

**2. Layout matches the reference image exactly**
```text
┌──────────────────────────────────────┐
│                                    ✕ │
│                                      │
│    [Dynamic headline in Playfair]    │
│    Sign in or sign up to continue    │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ G  Continue with Google          ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │   Continue with Apple           ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │ Enter your email                 ││
│  └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐│
│  │ Continue with email              ││
│  └──────────────────────────────────┘│
│                                      │
│              Close                   │
│                                      │
│   By continuing you agree to our     │
│   Terms. A Preview Wallet will be    │
│   created for your account.          │
└──────────────────────────────────────┘
```

**3. Typography**
- Headline: `Playfair Display` (already loaded), warm cream color `#d4c5a9` matching the reference
- Subtitle: `DM Sans`, muted white
- Buttons: `DM Sans`, clean weight

**4. Interaction flow**
- Email input visible at all times (like the reference — no "Continue with email" gate)
- Clicking "Continue with email" → password field animates in
- Submit tries sign-in first, falls back to sign-up automatically
- Success feedback differs: "Signed in" vs "Check your email to confirm"
- After email sign-up, show inline confirmation message instead of closing

### Files Modified

**`src/modules/auth/AuthPromptModal.tsx`** — Full rewrite of the modal body:
- Remove `mode` state toggle (signin/signup) — replace with unified flow
- Remove `showEmailForm` gate — email input always visible
- Add `emailStep` state: `"email"` → `"password"` for progressive disclosure
- Unified submit: try `signInWithPassword`, on failure try `signUp`
- Headline uses `fontFamily: "'Playfair Display', serif"` with cream color
- Subtitle: "Sign in or sign up to continue"
- "Close" text link at bottom (matching reference)
- No divider line between OAuth and email (cleaner, matches latest Perplexity)

No other files change — the `AuthContext` type, `useAuthPrompt` hook, and all trigger points remain identical.

