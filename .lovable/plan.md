

# Full UOR Compliance: Content-Addressed Certificates for All Key Components

## Current Compliance Gap

The registry currently certifies **only the 7 module manifests**. All other key data objects -- navigation items, route tables, framework layers, pillars, projects, research categories, blog posts, highlights, and team descriptions -- exist as plain JavaScript arrays with no mathematical proof of authenticity. They are uncertified and therefore non-compliant with the UOR framework.

## What Changes

We will create a centralized **content registry** that generates UOR verification certificates for every significant data object on the site, then expose those certificates in both the verification UI and the machine-readable JSON-LD metadata.

---

### 1. Create `src/lib/uor-content-registry.ts`

A new file that defines all certifiable content objects as JSON-LD-compatible structures, generates certificates for each at startup, and exposes them alongside the module registry.

Certifiable content objects (each becomes a formally addressed, verifiable entity):

| Subject ID | Source | Description |
|---|---|---|
| `content:route-table` | App.tsx route config | All routes as a canonical array |
| `content:nav-items` | Navbar.tsx navItems | Navigation contract |
| `content:pillars` | PillarsSection.tsx | Three-pillar data |
| `content:highlights` | HighlightsSection.tsx | Community highlights data |
| `content:featured-projects` | ProjectsShowcase.tsx | Homepage project showcase |
| `content:framework-layers` | FrameworkLayers.tsx | Six UOR layers definition |
| `content:research-categories` | ResearchPage.tsx | 12 research domain categories |
| `content:blog-posts` | ResearchPage.tsx | Blog post metadata |
| `content:projects` | ProjectsPage.tsx | Full project catalog |
| `content:maturity-model` | ProjectsPage.tsx | Sandbox/Incubating/Graduated criteria |
| `content:governance-principles` | AboutPage.tsx | Six governance principles |

Each object will be canonicalized via `canonicalJsonLd`, hashed via SHA-256/CIDv1/dag-json, and assigned a UOR Braille address -- the same pipeline used for module manifests and the edge function's stored objects.

### 2. Extract Data Constants into Certifiable Modules

Currently, data arrays like `pillars`, `navItems`, `layers`, `highlights`, `featuredProjects`, `researchCategories`, and `blogPosts` are defined inline inside component files. To make them certifiable:

- Create `src/data/nav-items.ts` -- exports `navItems` array
- Create `src/data/pillars.ts` -- exports `pillars` array
- Create `src/data/highlights.ts` -- exports `highlights` array
- Create `src/data/featured-projects.ts` -- exports `featuredProjects` array
- Create `src/data/framework-layers.ts` -- exports `layers` array (the 6-layer definitions)
- Create `src/data/research-categories.ts` -- exports `researchCategories` array
- Create `src/data/blog-posts.ts` -- exports `blogPosts` array
- Create `src/data/projects.ts` -- exports full `projects` array and `maturityInfo`
- Create `src/data/governance.ts` -- exports governance principles
- Create `src/data/route-table.ts` -- exports canonical route definitions

Each file exports a plain data object (no JSX, no icons -- just serializable attributes). The component files will import from these data files and attach icons/rendering at the component level.

### 3. Update `src/lib/uor-content-registry.ts` Initialization

On app startup (called from `App.tsx` alongside `initializeRegistry`), this new registry will:

1. Import all data constants from `src/data/*`
2. For each, wrap it in a JSON-LD envelope with `@context` and `@type`
3. Call `generateCertificate(subjectId, attributes)` to produce a UOR certificate
4. Store the certificate in a `Map<string, ContentCertificate>`
5. Expose `getAllContentCertificates()` and `getContentCertificate(id)` APIs

### 4. Update `UorVerification.tsx`

The verification panel currently shows only the 7 module certificates. It will be extended with a second section: **"Content Certificates"** that lists all content objects with their CID, UOR address, and verification status. This turns the badge from a module-only checker into a full-site integrity dashboard.

### 5. Update `UorMetadata.tsx`

The JSON-LD `<script>` injected into `<head>` will be extended to include a `contentCertificates` array alongside the existing `modules` array, making all content certificates machine-readable.

### 6. Update Component Files

Each component that currently defines data inline will be updated to import from the corresponding `src/data/*` file:

- `Navbar.tsx` -- imports from `src/data/nav-items.ts`
- `PillarsSection.tsx` -- imports from `src/data/pillars.ts`
- `HighlightsSection.tsx` -- imports from `src/data/highlights.ts`
- `ProjectsShowcase.tsx` -- imports from `src/data/featured-projects.ts`
- `FrameworkLayers.tsx` -- imports from `src/data/framework-layers.ts`
- `ResearchPage.tsx` -- imports from `src/data/research-categories.ts` and `src/data/blog-posts.ts`
- `ProjectsPage.tsx` -- imports from `src/data/projects.ts`
- `AboutPage.tsx` -- imports from `src/data/governance.ts`

The data files contain only serializable values (strings, numbers, booleans). Icons (Lucide components) are mapped at the component level by referencing a key/slug.

### 7. Update `App.tsx`

Add a call to `initializeContentRegistry()` alongside the existing `initializeRegistry()` call so both module and content certificates are computed at startup.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/data/nav-items.ts` | Navigation items data |
| `src/data/pillars.ts` | Three pillars data |
| `src/data/highlights.ts` | Community highlights data |
| `src/data/featured-projects.ts` | Homepage featured projects |
| `src/data/framework-layers.ts` | Six UOR layers (serializable) |
| `src/data/research-categories.ts` | Research domain categories |
| `src/data/blog-posts.ts` | Blog post metadata |
| `src/data/projects.ts` | Full project catalog + maturity model |
| `src/data/governance.ts` | Governance principles |
| `src/data/route-table.ts` | Canonical route definitions |
| `src/lib/uor-content-registry.ts` | Content certificate registry |

## Files to Modify

| File | Changes |
|---|---|
| `src/App.tsx` | Add `initializeContentRegistry()` call |
| `src/modules/core/components/Navbar.tsx` | Import `navItems` from data file |
| `src/modules/landing/components/PillarsSection.tsx` | Import `pillars` from data file |
| `src/modules/landing/components/HighlightsSection.tsx` | Import `highlights` from data file |
| `src/modules/landing/components/ProjectsShowcase.tsx` | Import `featuredProjects` from data file |
| `src/modules/framework/components/FrameworkLayers.tsx` | Import `layers` from data file |
| `src/modules/community/pages/ResearchPage.tsx` | Import categories and blog posts from data files |
| `src/modules/projects/pages/ProjectsPage.tsx` | Import projects and maturity model from data files |
| `src/modules/core/pages/AboutPage.tsx` | Import governance principles from data file |
| `src/modules/core/components/UorVerification.tsx` | Add content certificates section |
| `src/modules/core/components/UorMetadata.tsx` | Include content certificates in JSON-LD |

## What Does Not Change

- Visual design, layout, animations, or styling
- The UOR addressing library (`uor-address.ts`)
- The certificate generation library (`uor-certificate.ts`)
- The module registry (`uor-registry.ts`)
- Edge function code
- Any user-facing behavior beyond the expanded verification panel

