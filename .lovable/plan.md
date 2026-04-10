

# Complete uor-os/ for Standalone Lovable Deployment

## Problem

The `uor-os/` folder is missing several files needed for Lovable compatibility and standalone deployment:

1. **Build error**: The PWA `injectManifest` Rollup pass fails because it cannot resolve `@/modules/uns/build/container` — this is a path alias issue in the PWA's separate Rollup build. The `globIgnores` pattern should exclude the file from processing entirely.
2. **Missing Lovable files**: `lovable-tagger` dev dependency, `componentTagger()` plugin in vite.config, `components.json`, `.gitignore`, split tsconfig files (`tsconfig.app.json`, `tsconfig.node.json`), `eslint.config.js`, `vitest.config.ts`
3. **Missing supabase/**: Edge functions, migrations, and `config.toml` are not in `uor-os/`
4. **Missing Apache 2.0 LICENSE file**
5. **Missing .env handling**: Lovable auto-generates `.env` but the new repo needs awareness of it

## Plan

### Step 1 — Fix the Build Error

The PWA `injectManifest` uses a separate Rollup build that does not understand Vite's `@/` alias. The `globIgnores` only affects precache listing, not import resolution. The actual fix: make the dynamic import in `ContainerBootOverlay.tsx` conditional so the PWA Rollup pass does not try to resolve it. Wrap it in a try/catch with a runtime-only path — OR — add the container module path to `build.rollupOptions.external` in the vite config so the SW build skips it entirely.

Simplest fix: the `injectManifest` rollup config needs the same `alias` and `external` settings. Since we can't easily configure the inner Rollup, the pragmatic fix is to make `ContainerBootOverlay.tsx` not statically analyzable by Rollup's SW pass — use a variable for the import path:

```typescript
const mod = "@/modules/uns/build/container";
const { getContainer } = await import(/* @vite-ignore */ mod);
```

This prevents Rollup from resolving the import at build time.

### Step 2 — Add Apache 2.0 LICENSE

Create `uor-os/LICENSE` with the standard Apache License, Version 2.0 text.

### Step 3 — Add Lovable-Specific Files

| File | Purpose |
|------|---------|
| `uor-os/components.json` | shadcn/ui config (aliases point to `@/modules/core`) |
| `uor-os/.gitignore` | Standard Vite gitignore |
| `uor-os/tsconfig.app.json` | App-level TS config with vitest globals |
| `uor-os/tsconfig.node.json` | Node-level TS config for vite.config |
| `uor-os/eslint.config.js` | ESLint flat config |
| `uor-os/vitest.config.ts` | Vitest configuration |

Update `uor-os/tsconfig.json` to use project references (matching the parent repo pattern).

Update `uor-os/vite.config.ts` to include `lovable-tagger` (`componentTagger()` plugin in dev mode).

Update `uor-os/package.json` to add `lovable-tagger` to devDependencies.

### Step 4 — Copy Supabase Directory

Copy the entire `supabase/` directory (config.toml, migrations/, functions/) into `uor-os/supabase/`. This includes all 47 edge functions, all migrations, and the config.

### Step 5 — Fix the Same Build Error in Main Repo

Apply the same `/* @vite-ignore */` fix to `src/modules/desktop/components/ContainerBootOverlay.tsx` and `src/modules/compose/orchestrator.ts` in the main repo to resolve the current build failure.

## Files Created/Modified

| File | Action |
|------|--------|
| `uor-os/LICENSE` | New: Apache 2.0 |
| `uor-os/components.json` | New: shadcn config |
| `uor-os/.gitignore` | New: standard Vite ignore |
| `uor-os/tsconfig.json` | Update: project references |
| `uor-os/tsconfig.app.json` | New: app TS config |
| `uor-os/tsconfig.node.json` | New: node TS config |
| `uor-os/eslint.config.js` | New: ESLint config |
| `uor-os/vitest.config.ts` | New: Vitest config |
| `uor-os/vite.config.ts` | Update: add lovable-tagger |
| `uor-os/package.json` | Update: add lovable-tagger |
| `uor-os/supabase/` | New: full copy of supabase dir |
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | Fix: `@vite-ignore` on dynamic import |
| `src/modules/compose/orchestrator.ts` | Fix: `@vite-ignore` on dynamic import |
| `uor-os/src/modules/desktop/components/ContainerBootOverlay.tsx` | Fix: same |
| `uor-os/src/modules/compose/orchestrator.ts` | Fix: same |

