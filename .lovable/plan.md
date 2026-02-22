
# Repo Coherence Overhaul: Discipline, Clarity, Trust

## Assessment Summary

After a thorough audit, the repo is structurally sound at its core: 26 modules registered, UOR certificates computed, content-addressing working. But it has accumulated entropy in three areas that undermine the visceral feeling of self-discipline: **hardcoded URLs violating the single-source-of-truth principle**, **barrel-bypassing imports breaking encapsulation**, and **duplicated inline SVGs creating maintenance debt**. These are fixable with surgical precision.

---

## Issue 1: Hardcoded URLs (violates `external-links.ts` centralization)

The project defines a `src/data/external-links.ts` file as the single source of truth for all external URLs. Yet 8 components hardcode Discord, GitHub, and LinkedIn URLs directly.

**Files with hardcoded URLs (should import from `external-links.ts`):**
- `src/modules/core/components/Navbar.tsx` (Discord x2, GitHub x2, LinkedIn x2)
- `src/modules/core/components/Footer.tsx` (GitHub, Discord, Governance)
- `src/modules/landing/components/CTASection.tsx` (Discord, GitHub)
- `src/modules/community/pages/BlogPost1.tsx`
- `src/modules/community/pages/BlogPost2.tsx`
- `src/modules/community/pages/BlogPost3.tsx`
- `src/modules/community/pages/ResearchPaperAtlasEmbeddings.tsx`
- `src/modules/core/pages/AboutPage.tsx`

**Fix:** Replace all hardcoded URLs with imports from `external-links.ts`. Every external link in the repo will trace to one file.

---

## Issue 2: Barrel-bypassing imports (violates module encapsulation)

The project enforces a rule: modules expose their public API through `index.ts` barrel exports. But `App.tsx` and `DashboardPage.tsx` both reach directly into module internals.

**In `App.tsx` (lines 25, 27):**
```typescript
import AuditPage from "@/modules/self-verify/pages/AuditPage";  // bypasses barrel
import SessionsPage from "@/modules/state/pages/SessionsPage";    // bypasses barrel
```

**In `DashboardPage.tsx` (lines 9, 13-16, 17, 19-20):**
```typescript
import { Q0 } from "@/modules/ring-core/ring";                    // bypasses barrel
import { getRecentReceipts } from "@/modules/self-verify/audit-trail"; // bypasses barrel
import { uor_derive } from "@/modules/agent-tools/tools";         // bypasses barrel
import type { DeriveOutput } from "@/modules/agent-tools/tools";  // bypasses barrel
import { ALL_GRADES, gradeInfo } from "@/modules/epistemic/grading"; // bypasses barrel
import { executeSparql } from "@/modules/sparql/executor";         // bypasses barrel
import type { SparqlResult } from "@/modules/sparql/executor";     // bypasses barrel
```

**Fix:**
1. Add `AuditPage` export to `src/modules/self-verify/index.ts`
2. Add `SessionsPage` export to `src/modules/state/index.ts`
3. Update `App.tsx` to import from barrel exports
4. Add any missing exports to barrel files (`Q0` in ring-core, `getRecentReceipts` in self-verify, `ALL_GRADES`/`gradeInfo` in epistemic, `executeSparql`/`SparqlResult` in sparql)
5. Update `DashboardPage.tsx` to import exclusively from barrel exports

---

## Issue 3: Duplicated Discord SVG icon

The Discord SVG path (60+ characters of path data) is copy-pasted 4 times across Navbar.tsx (desktop + mobile). This is a maintenance risk and adds visual noise to the code.

**Fix:** Extract a `DiscordIcon` component into `src/modules/core/components/icons/DiscordIcon.tsx` and import it where needed. One icon, one definition.

---

## Implementation Sequence

### Step 1: Create `DiscordIcon` component
New file: `src/modules/core/components/icons/DiscordIcon.tsx`
- Single, clean SVG component with configurable `size` prop

### Step 2: Fix Navbar.tsx
- Import `DISCORD_URL`, `GITHUB_ORG_URL`, `LINKEDIN_URL` from `external-links.ts`
- Import `DiscordIcon` instead of inline SVG
- Replace all 6 hardcoded URLs

### Step 3: Fix Footer.tsx
- Import `DISCORD_URL`, `GITHUB_ORG_URL`, `GITHUB_GOVERNANCE_URL`, `GITHUB_RESEARCH_URL` from `external-links.ts`
- Replace all 4 hardcoded URLs

### Step 4: Fix CTASection.tsx
- Import `DISCORD_URL`, `GITHUB_ORG_URL` from `external-links.ts`
- Replace 2 hardcoded URLs

### Step 5: Fix BlogPost1.tsx, BlogPost2.tsx, BlogPost3.tsx, ResearchPaperAtlasEmbeddings.tsx, AboutPage.tsx
- Import relevant URLs from `external-links.ts`
- Replace all hardcoded URLs

### Step 6: Fix barrel exports
- Add `AuditPage` to `self-verify/index.ts`
- Add `SessionsPage` to `state/index.ts`
- Ensure `Q0`, `ALL_GRADES`, `gradeInfo`, `executeSparql`, `SparqlResult`, `getRecentReceipts`, `DerivationReceipt`, `uor_derive`, `DeriveOutput` are all available through their module barrel exports

### Step 7: Fix App.tsx imports
- Change `AuditPage` and `SessionsPage` imports to use barrel exports

### Step 8: Fix DashboardPage.tsx imports
- Change all 7 barrel-bypassing imports to use module barrel exports

---

## What This Does NOT Change

- Module manifests (already normalized in prior session)
- UOR Registry (already registers all 26 modules)
- Edge function structure (already modular by endpoint)
- UorMetadata / UorVerification (automatically reads from registry)
- Any CSS, layout, or visual behavior
- Any API endpoints or backend logic

---

## Verification

After implementation:
- `grep -r "discord.gg" src/` should return matches only in `external-links.ts`
- `grep -r "github.com/UOR-Foundation" src/` should return matches only in `external-links.ts` and data files (`projects.ts`, `featured-projects.ts`) where URLs are content data
- `grep -r "from.*@/modules/.*/pages/" src/App.tsx` should return zero matches
- `grep -r "from.*@/modules/.*/[a-z]" src/modules/dashboard/` should show only barrel imports (from `index.ts` or `index`)
- The site renders identically: zero visual changes
