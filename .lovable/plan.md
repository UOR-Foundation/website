

# Structural Improvements: Less is More

A thorough audit of the full repository. The architecture is already strong -- modular, content-addressed, well-typed. The findings below are targeted refinements that reduce redundancy, tighten coupling, and eliminate dead weight without changing any visual behavior.

---

## 1. Dead Code: NavLink Component (Remove)

`src/modules/core/components/NavLink.tsx` is exported from `src/modules/core/index.ts` but **never imported anywhere** in the codebase. The Navbar uses standard `react-router-dom` `<Link>` directly. This is dead weight.

**Action:** Delete `NavLink.tsx` and remove its export from `core/index.ts`.

---

## 2. Redundant Alias in CTASection

`CTASection.tsx` imports `teamMembers` then immediately aliases it to `const members = teamMembers`. This adds a line for no reason.

**Action:** Use `teamMembers` directly throughout the component. Remove the alias.

---

## 3. Donate Page: Inline Data Not in Registry

`DonatePage.tsx` defines a `projects` array (3 donation initiatives with financials) inline. This is the only remaining page with significant inline data that is not extracted to `src/data/` and not registered in the content certificate registry.

**Action:** Extract to `src/data/donation-projects.ts`, register as `content:donation-projects` in the content registry, and import from the data file. This completes full UOR compliance -- every data object on the site becomes certified.

---

## 4. Standard Page: Inline Application Cards

`StandardPage.tsx` defines a 6-item "Where It Applies" array inline (Semantic Web, Proof Based Computation, etc.). This is uncertified.

**Action:** Extract to `src/data/applications.ts`, register as `content:applications` in the content registry.

---

## 5. API Page: 1,257 Lines in One File

`ApiPage.tsx` is the largest file in the codebase at 1,257 lines. It contains:
- All layer/endpoint data definitions (~600 lines of constants)
- Three reusable sub-components (`CopyButton`, `EndpointPanel`, `LayerSection`)
- The main page component

This violates the "less is more" principle. The data is already typed in `src/modules/api-explorer/types.ts` but the types are redeclared locally in the file instead of imported.

**Action:**
- Extract the layer/endpoint data constants into `src/data/api-layers.ts` and register as `content:api-layers` in the content registry
- Import the existing types from `types.ts` instead of redeclaring them
- Extract `CopyButton`, `EndpointPanel`, and `LayerSection` into `src/modules/api-explorer/components/`
- The page file should drop to ~200 lines: imports, inline styles, and section layout

---

## 6. Duplicated Type Declarations

Several module `types.ts` files define types that are also declared inline in their data files or components:

- `MaturityLevel` is defined in both `src/modules/projects/types.ts` AND `src/data/projects.ts`
- `Param`, `Endpoint`, `V2Stub`, `Layer`, `DiscoveryEndpoint` are defined in both `src/modules/api-explorer/types.ts` AND inline in `ApiPage.tsx`
- `TagType` is exported from `src/data/highlights.ts` but a similar type exists in `src/modules/landing/types.ts`

**Action:** Each type should live in exactly one place. The module `types.ts` files are the canonical source. Data files and components import from there. Remove all duplicate declarations.

---

## 7. Hardcoded External URLs

The Discord invite URL `https://discord.gg/ZwuZaNyuve` appears **65 times** across 10 files. The GitHub org URL `https://github.com/UOR-Foundation` appears **111 times** across 12 files. If either changes, it requires a multi-file search-and-replace.

**Action:** Create `src/data/external-links.ts` with named constants:
```
export const DISCORD_URL = "https://discord.gg/ZwuZaNyuve";
export const GITHUB_ORG_URL = "https://github.com/UOR-Foundation";
export const GITHUB_GOVERNANCE_URL = "...";
export const GITHUB_RESEARCH_URL = "...";
export const DONORBOX_URL = "...";
```
Replace all hardcoded instances with imports. One source of truth for every external URL.

---

## 8. Barrel Export Bloat

Module barrel files (`index.ts`) export internal components that are only used within the module itself. For example, `src/modules/landing/index.ts` exports `HeroSection`, `IntroSection`, `PillarsSection`, etc. -- but these are only imported by `IndexPage.tsx` within the same module. Only `IndexPage` is imported externally (by `App.tsx`).

**Action:** Each barrel file should only export what is consumed outside the module. Internal components stay internal. This reduces the public API surface of each module and makes dependencies clearer. Specifically:

- `landing/index.ts`: Keep only `IndexPage`
- `framework/index.ts`: Keep only `StandardPage`
- `community/index.ts`: Already correct (pages only)
- `core/index.ts`: Keep `Layout`, `AboutPage`, `NotFoundPage`, UI primitives, hooks, and `UorVerification`/`UorMetadata`. Remove `Navbar`, `Footer`, `ScrollProgress`, `NavLink` (internal only)

---

## 9. Sidebar CSS Variables (Unused)

`src/index.css` defines 7 sidebar CSS variables (`--sidebar-background`, `--sidebar-foreground`, etc.) in both light and dark themes. There is no sidebar component anywhere in the codebase. These are likely from the initial shadcn/ui scaffold.

**Action:** Remove all `--sidebar-*` CSS variables from both `:root` and `.dark` blocks.

---

## 10. ProjectsPage: Client-Side Form Submission Bypass

`ProjectsPage.tsx` still contains a client-side form submission using an image beacon hack to bypass CORS to a Google Apps Script URL with a hardcoded token (`uor-f0undati0n-s3cure-t0ken-2024x`). Meanwhile, a proper `project-submit` edge function already exists that handles validation, rate limiting, and secure token storage.

**Action:** Update the form to POST to the `project-submit` edge function instead of using the image beacon hack. Remove the hardcoded token from the client bundle entirely.

---

## Summary of Changes

| Category | Action | Impact |
|----------|--------|--------|
| Dead code | Remove `NavLink.tsx` | -28 lines |
| Redundant alias | Clean `CTASection.tsx` | -1 line, clearer intent |
| Uncertified data | Extract donate projects + application cards | +2 content certificates |
| Giant file | Split `ApiPage.tsx` into data + components | -1000 lines from single file |
| Duplicate types | Single source of truth per type | Fewer type declarations |
| Hardcoded URLs | Centralize in `external-links.ts` | 176 replacements, 1 source |
| Barrel bloat | Trim exports to public API only | Cleaner module boundaries |
| Unused CSS | Remove sidebar variables | -14 lines of dead CSS |
| Security | Use edge function for form submission | Remove hardcoded token |

Total net effect: fewer files touched at refactor time, every data object certified, no dead code, no duplicate types, no hardcoded secrets in the client.
