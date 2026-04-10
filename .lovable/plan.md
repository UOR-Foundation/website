

# Why the GitHub Repo Is Not Booting — Analysis and Fix Plan

## Root Causes Identified

There are **three independent issues** preventing the repo from booting when deployed standalone.

### 1. Missing Environment Variables (Primary Boot Blocker)

The `src/integrations/supabase/client.ts` in the GitHub repo has placeholder fallbacks:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-key';
```

When deployed outside Lovable, there is **no `.env` file** in the repo (it's gitignored). The Supabase client initializes with `placeholder.supabase.co`, and any auth or data call fails silently or throws, which can cascade into a blank screen if the boot sequence or AuthProvider depends on a valid Supabase connection.

**Fix:** Add a `.env.example` file documenting the required variables, and ensure whoever deploys the repo creates a `.env` with real values — or makes Supabase entirely optional so the app boots without it.

### 2. Supabase Client Hardcoded as Required

The `AuthProvider` (in `use-auth.tsx`) and the `sovereignBoot` sequence both import and use the Supabase client. If Supabase is unreachable (placeholder URL), the boot may hang or error silently, preventing the React tree from rendering.

**Fix:** Add a guard in the Supabase client that detects placeholder values and skips network calls, or make the AuthProvider resilient to connection failures.

### 3. `@/modules/uns/build/container` TypeScript Error (This Repo)

The build error `Cannot find module '@/modules/uns/build/container'` is in the **parent Lovable project** at `src/modules/app-builder/pages/AppBuilderPage.tsx` (old flat path). This file still uses `@/modules/uns/build/container` instead of `@/modules/identity/uns/build/container`. The `uor-os/` copy was fixed, but the parent repo's copy was not.

**Fix:** Update the parent repo's `src/modules/app-builder/pages/AppBuilderPage.tsx` to use the correct path, or since the `uor-os/` directory has already been ported, simply delete the old flat-path file.

---

## Implementation Steps

| Step | What | Details |
|------|------|---------|
| 1 | Fix parent repo build error | Update `src/modules/app-builder/pages/AppBuilderPage.tsx` to reference `@/modules/identity/uns/build/container` (or delete it since it belongs to the old flat structure) |
| 2 | Add `.env.example` to `uor-os/` | Document `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
| 3 | Make Supabase optional for standalone boot | Guard the Supabase client so it returns a no-op client when env vars are placeholders; make `AuthProvider` and `sovereignBoot` resilient to missing Supabase |
| 4 | Sync fix to GitHub | Push updated files |

## What the User Needs to Do on GitHub

After we apply these fixes here:
1. Set up environment variables in their deployment environment (Vercel, Netlify, etc.) with a real Supabase project's URL and anon key — OR — use the standalone-safe guards we'll add
2. Run `npm install && npm run build` to verify the build passes

