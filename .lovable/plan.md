

# Standardize All Pages to Match Home Page Format

## Problem

The site has ~17 pages using 3 different incompatible header/section formats. The well-formatted pages (About, Projects, Community, Framework, MCP, Donate) follow a clear pattern. The remaining pages break visual continuity.

## The Standard Pattern (from Home Page / About / Projects / Framework)

Every page follows this structure:

```text
┌──────────────────────────────────────────────┐
│ hero-gradient  pt-44 md:pt-56  pb-16 md:pb-24│
│                                              │
│ H1: font-display text-fluid-page-title       │
│ Subtitle: text-fluid-body text-foreground/70 │
│ CTA buttons (if applicable)                  │
├──────────────────────────────────────────────┤
│ SECTION (py-section-sm border-b border/40)   │
│                                              │
│ PRE-LABEL: uppercase tracking-[0.2em]        │
│            text-primary/70 text-fluid-lead   │
│ H2: font-display text-fluid-heading font-bold│
│ Content...                                   │
├──────────────────────────────────────────────┤
│ SECTION (repeat pattern)                     │
│ ...                                          │
└──────────────────────────────────────────────┘
```

Key tokens:
- **Hero**: `hero-gradient pt-44 md:pt-56 pb-16 md:pb-24`
- **H1**: `font-display text-fluid-page-title font-bold text-foreground`
- **Subtitle**: `mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed max-w-4xl`
- **Section**: `py-section-sm bg-background border-b border-border/40`
- **Pre-label**: `font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md`
- **H2**: `font-display text-fluid-heading font-bold text-foreground mb-8`
- **Container**: `container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]`

## Pages to Update

### Group A: "Module N" header style → standard hero (6 pages)
These use `py-20 md:py-28` with raw `text-3xl` headings and "Module N" labels.

| Page | Current Title | New Title |
|------|--------------|-----------|
| `RingExplorerPage.tsx` | "Module 1. Ring Arithmetic Core" + "Ring Explorer" | "Ring Explorer" |
| `DerivationLabPage.tsx` | "Module 4. Derivation & Certificate Engine" + "Derivation Lab" | "Derivation Lab" |
| `KnowledgeGraphPage.tsx` | "Module 6. Knowledge Graph Store" + "Knowledge Graph" | "Knowledge Graph" |
| `SparqlEditorPage.tsx` | "Module 8. SPARQL Query Interface" + "SPARQL Editor" | "SPARQL Editor" |
| `AgentConsolePage.tsx` | (inline header) | "Agent Console" |
| `CodeKnowledgeGraphPage.tsx` | (Module label) | "Code Knowledge Graph" |

**Changes**: Replace the `<section className="py-20 md:py-28">` + `<div className="mb-12">` pattern with the standard hero section. Remove "Module N." prefixes. Apply fluid typography tokens. Wrap content sections in `py-section-sm` with pre-labels and H2s.

### Group B: Primary-colored header → standard hero (4 pages)
These use `bg-[hsl(var(--primary))] py-12 md:py-16` for a colored banner.

| Page | Current Title |
|------|--------------|
| `VerifyPage.tsx` | "UOR Critical Identity Verifier" → "Identity Verifier" |
| `EpistemicPage.tsx` | "Epistemic Grading Console" → "Epistemic Grading" |
| `CertificatesPage.tsx` | (primary banner) → "Certificates" |
| `SparqlPage.tsx` | (primary banner) → "SPARQL Console" |

**Changes**: Replace the primary-colored `<section>` with `hero-gradient` hero. Move quantum selector pills into the first content section if needed. Wrap content cards in standard section dividers.

### Group C: Full-screen / custom layouts → standard hero + sections (7 pages)
These use `min-h-screen bg-background` or similar custom wrappers.

| Page | New Title |
|------|-----------|
| `UnsPage.tsx` | "Name Service" |
| `AppStorePage.tsx` | "App Store" |
| `ToolRegistryPage.tsx` | "Tool Registry" |
| `CartridgePage.tsx` | "QR Cartridge" |
| `PrismPipelinePage.tsx` | "Prism Pipeline" |
| `TrustScorePreview.tsx` | "Trust Score" |
| `MessengerPage.tsx` | "Messenger" |

**Changes**: Add standard hero section at top. Move existing content into properly sectioned containers with pre-labels and H2s.

### Group D: Minor alignment fixes (3 pages)
| Page | Issue |
|------|-------|
| `StandardPage.tsx` | Hero uses `pt-48 md:pt-64 pb-20 md:pb-32` instead of standard `pt-44 md:pt-56 pb-16 md:pb-24` |
| `ClaimIdentityPage.tsx` | Hero uses `pt-28 md:pt-52` — align to standard |
| `SandboxPage.tsx` | Hero uses `pt-28 md:pt-52` — align to standard |

### Pages NOT touched
- `IndexPage.tsx` (home page — the reference model)
- `OraclePage.tsx` (full-screen chat interface — unique by nature)
- `ResolvePage.tsx` (full-screen chat interface)
- `AtlasVisualizationPage.tsx` (full-screen 3D visualization)
- `QuantumDashboardPage.tsx` (full-screen research dashboard)
- `ComplianceDashboardPage.tsx` (full-screen dashboard)
- `DailyNotesPage.tsx`, `LibraryPage.tsx` (Oracle sub-pages)
- Blog posts (article format, different by design)
- Already-standard pages (About, Projects, Community, Donate, Framework, MCP, SemanticWeb, Interoperability)

## Label Guidelines

- Remove all "Module N." prefixes — they add noise
- Use short, self-explanatory page titles (1-3 words)
- Pre-labels describe the category, not the module number
- Example: pre-label "Developer Tools" + H2 "Ring Explorer", not "Module 1. Ring Arithmetic Core"

## Implementation Approach

Each page update follows the same mechanical pattern:
1. Replace header section with standard hero
2. Wrap content blocks in `py-section-sm` sections with `border-b`
3. Add gold pre-label + H2 to each section
4. Apply fluid typography tokens throughout
5. Ensure `max-w-4xl` constraint where content is prose-heavy (tool pages keep full width for tables/grids)

Estimated: ~20 files modified, no new files created, no logic changes — purely presentational alignment.

