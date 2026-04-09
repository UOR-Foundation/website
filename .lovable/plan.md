

## Plan: Privy Embedded Wallet Integration — Unified Sign-In + Web3 Wallet

### What We're Building

When a user signs in via Google, Apple, or email through the existing AuthPromptModal, a Privy embedded wallet is automatically created in the background — no extra steps, no separate sign-in. The user gets a sovereign web3 wallet (Ethereum + optionally Solana) as a side effect of their normal authentication flow. This bridges the existing Supabase auth with Privy's wallet infrastructure so every authenticated user has an on-chain identity.

### How It Works

```text
User clicks "Continue with Google"
  │
  ├── 1. Lovable Cloud OAuth completes (existing flow)
  │     └── Supabase session established
  │
  ├── 2. Post-auth hook triggers Privy login
  │     └── privy.loginWithCustomAccessToken(supabase_jwt)
  │           └── Privy creates embedded wallet automatically
  │
  └── 3. Wallet address stored in profiles table
        └── UPDATE profiles SET wallet_address = '0x...' WHERE user_id = ...
```

The key insight: Privy supports **custom auth integration** — you pass your existing Supabase JWT to Privy, and it creates/retrieves an embedded wallet for that user. No second login flow. No modal. No friction.

### Architecture

**PrivyProvider wraps the app** alongside the existing AuthProvider. Configuration:
- `createOnLogin: 'all-users'` — every authenticated user gets a wallet
- Custom access token provider using the Supabase JWT
- Whitelabel mode (no Privy UI — our AuthPromptModal stays as-is)

**Post-auth wallet sync** in `useAuth`:
- After Supabase session is established, call `privy.loginWithCustomAccessToken`
- On wallet creation, store `wallet_address` in the `profiles` table
- Expose `wallet` in the auth context for downstream components

### Required Setup

1. **Privy Account**: Create app at dashboard.privy.io, get App ID
2. **Secret**: Store `PRIVY_APP_ID` as a VITE_ env var (it's a publishable key, safe for client)
3. **Database**: Add `wallet_address` column to `profiles` table
4. **Privy Custom Auth**: Configure Privy to accept Supabase JWTs (set JWKS URL in Privy dashboard to Supabase's JWKS endpoint)

### Disclosure

The AuthPromptModal's terms line updates to: "By continuing, you agree to our Terms of Service and Privacy Policy. A Preview Wallet will be created for your account."

### Changes

**1. Install `@privy-io/react-auth`**

**2. New file: `src/modules/auth/PrivyWalletProvider.tsx`**
- Wraps `PrivyProvider` with config: embedded wallets on login, custom JWT from Supabase session
- Exports `useWalletContext()` hook exposing wallet address, sign/send functions

**3. Modify `src/hooks/use-auth.tsx`**
- After session is set, trigger Privy login with the Supabase access token
- Add `walletAddress: string | null` to AuthState
- Store wallet address in profiles on first creation

**4. Modify `src/modules/auth/AuthPromptModal.tsx`**
- Update terms disclosure text
- No UI changes — wallet creation is invisible/automatic

**5. Modify `src/App.tsx`**
- Wrap app with `PrivyWalletProvider` inside `AuthProvider`

**6. Database migration**
- `ALTER TABLE profiles ADD COLUMN wallet_address text;`

**7. Bridge to existing ethereum-bridge.ts**
- The embedded wallet can sign transactions for the existing EIP-4844 blob witness, Account Abstraction, and other Ethereum bridge pillars already built in the codebase

### Regarding the SharedArrayBuffer Issue

The health report shows SAB as "Missing" because the preview host (`lovableproject.com`) is classified as a preview environment, skipping the COI service worker. This is separate from Privy integration but will be addressed in the same pass:
- Fix the host detection in `main.tsx` to allow COI registration on `lovableproject.com` production URLs (only skip for `id-preview--*` subdomains)
- This restores SharedArrayBuffer availability and moves that health metric to active

### Files Modified
- **New**: `src/modules/auth/PrivyWalletProvider.tsx`
- `src/hooks/use-auth.tsx` — post-auth Privy login + wallet state
- `src/modules/auth/AuthPromptModal.tsx` — disclosure text
- `src/App.tsx` — add PrivyWalletProvider
- `src/main.tsx` — fix COI host detection
- Database migration: add `wallet_address` to profiles

### Prerequisites (User Action Required)
- Create a Privy app at dashboard.privy.io
- Configure custom auth in Privy dashboard (set Supabase JWKS URL)
- Provide the Privy App ID (publishable, stored in codebase)

