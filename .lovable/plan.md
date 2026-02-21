

# Canonical API URL Audit — Cleanup Plan

## Audit Result

The migration to `https://api.uor.foundation/v1` is **99% complete**. All documentation files, the API page, the OpenAPI spec, the edge function, and all discovery metadata already use the canonical URL. No old raw backend URLs remain in any user-facing file.

Two minor cleanup items remain:

---

## Changes

### 1. Edge function: Remove stale "uor-verify" language in /navigate response

**File:** `supabase/functions/uor-api/index.ts` (line 1227)

The `/navigate` endpoint description still says *"Start with uor-verify?x=42"* — a reference to the old standalone verify function name. This should read *"Start with /kernel/op/verify?x=42"* to match the canonical path structure.

**Before:**
```
"description": "Complete index of all 20 working endpoints. Start with uor-verify?x=42 for the simplest first call, or /kernel/op/verify?x=42 for the full proof."
```

**After:**
```
"description": "Complete index of all 20 working endpoints. Start with /kernel/op/verify?x=42 for the simplest first call."
```

### 2. CSP header: Add `https://api.uor.foundation` to connect-src

**File:** `index.html` (line 44)

The Content Security Policy `connect-src` currently allows `https://*.supabase.co` (needed for the backend). It should also allow `https://api.uor.foundation` so that any browser-based "Try it" calls on the API page can use the canonical domain directly.

**Before:**
```
connect-src 'self' https://*.supabase.co
```

**After:**
```
connect-src 'self' https://*.supabase.co https://api.uor.foundation
```

---

## What Does NOT Need Changing

- **`supabase/config.toml`** — Contains the project ID. This is auto-generated infrastructure config, not a documentation URL.
- **`src/integrations/supabase/client.ts`** — Auto-generated, never edited.
- **`.env`** — Auto-generated, contains internal backend URLs for the SDK.
- **All other files** — Already fully canonical. No duplicates or stale references found.

## Summary

Two single-line edits. After this, every reference across the entire codebase points to one canonical API URL with no duplicates, no stale names, and no unnecessary redirects.
