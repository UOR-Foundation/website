

# Canonical API URL — Implementation Plan

## Overview

Replace every occurrence of the raw backend URL (`erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api`) with `https://api.uor.foundation/v1` across all documentation and code. Remove the "coming soon" note from the API page.

**Important prerequisite you must handle outside Lovable:** Set up a DNS record so that `api.uor.foundation` proxies to the backend. The simplest approach is a Cloudflare CNAME + proxy rule, or a Vercel/Netlify reverse proxy. The old URL will continue to work — existing integrations won't break.

---

## Files to Change

### 1. `src/pages/Api.tsx`
- **Line 21:** Change the `BASE` constant from the raw backend URL to `https://api.uor.foundation/v1`
- **Lines 942-944:** Remove the "Canonical URL at ... coming soon" paragraph entirely

Since the entire API page builds all curl examples from the `BASE` constant, this single constant change updates every endpoint example, every copy button, and every "Try it" link on the page automatically.

### 2. `public/openapi.json`
- **Line 25:** Update the server URL to `https://api.uor.foundation/v1`
- **Lines 1661, 1680, 1693, 1712, 1747:** Update all `docs` fields from the raw URL to `https://api.uor.foundation/v1/openapi.json`

### 3. `public/.well-known/uor.json`
- **Lines 103-105:** Update `uor:api.openapi`, `uor:api.base`, and `uor:api.navigate` to use `https://api.uor.foundation/v1`
- **Lines 127-128:** Update `verifyEndpoint` and `addressEndpoint` to use `https://api.uor.foundation/v1/verify`

### 4. `public/llms.md`
- **Line 12 (frontmatter):** Change `api_base` to `https://api.uor.foundation/v1`
- **Line 68:** Update the verify GET example
- **Line 106:** Update the `BASE_URL` example
- All other occurrences of the raw URL in this file

### 5. `public/llms-full.md`
- **Line 319:** Update the verify GET example
- **Line 334:** Update `BASE_URL`
- **Line 699:** Update `BASE_URL`
- All other occurrences (15 total in this file)

### 6. `public/llms.txt`
- **Line 16:** Update `Base URL` to `https://api.uor.foundation/v1`
- **Line 28:** Update the GET example URL

### 7. `index.html`
- **Line 210:** Update the noscript Base URL reference
- **Line 220:** Update the noscript verify link

### 8. `supabase/functions/uor-api/index.ts` (edge function)
- **Lines 169, 178, 186, 194, 202, 212:** Update all `docs` fields in error responses from the raw URL to `https://api.uor.foundation/v1/openapi.json`

### 9. `public/.well-known/ai-plugin.json`
- Update the `description_for_model` field and `api.url` to reference `https://api.uor.foundation/v1`

---

## What This Does NOT Change

- The actual backend routing — the edge function continues to run on the same infrastructure
- The `supabase/config.toml` project ID (that's internal config, not documentation)
- The `src/integrations/supabase/client.ts` (auto-generated, never edited)

## DNS Setup (External — Not Done in Lovable)

You need to create a DNS record at your domain registrar for `api.uor.foundation`:

- If using **Cloudflare**: Add a CNAME record `api` pointing to `erwfuxphwcvynxhfbvql.supabase.co`, with Proxy enabled. Then add a Transform Rule to rewrite the URL path, prepending `/functions/v1/uor-api` to all incoming requests.
- If using another provider: Set up a reverse proxy that forwards `https://api.uor.foundation/v1/*` to `https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api/*`

The `uor-verify` function references will also be updated to route through `api.uor.foundation/v1/verify` (or you can keep them as a separate path if preferred).

