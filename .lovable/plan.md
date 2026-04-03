

# Uniform Two-Tier Section Headers

## The pattern (from Community page)
Every content section follows: **gold pre-label** (uppercase, tracked) + **bold h2 heading** underneath. The pre-label categorizes; the h2 describes in plain language.

```text
GET INVOLVED          ← gold pre-label
Start Contributing    ← bold h2 heading
```

## What's missing

### About page (4 sections need h2 headings added)
| Pre-label | Missing h2 (to add) |
|---|---|
| What We Do | Our Focus Areas |
| Governance Board | *(already has descriptive paragraph, add h2)* → Leadership |
| Resources | Governance Documents |
| Support the Foundation | Fund Open Infrastructure |

### Projects page (2 sections need h2 headings added)
| Pre-label | Missing h2 (to add) |
|---|---|
| Project Maturity | How Projects Advance |
| All Projects | Browse the Catalog |

### Docs page — already correct
All three sections (Getting Started → "Start here", Key Concepts → "Framework Layers", Where It Applies → "Use Cases") already have the two-tier pattern.

## Implementation

### File: `src/modules/core/pages/AboutPage.tsx`
Add an `<h2>` with class `font-display text-fluid-heading font-bold text-foreground mb-8` below each pre-label `<p>` in all four sections:
- "What We Do" → add `<h2>Our Focus Areas</h2>`
- "Governance Board" → add `<h2>Leadership</h2>`
- "Resources" → add `<h2>Governance Documents</h2>`
- "Support the Foundation" → add `<h2>Fund Open Infrastructure</h2>`

### File: `src/modules/projects/pages/ProjectsPage.tsx`
Add the same `<h2>` pattern:
- "Project Maturity" → add `<h2>How Projects Advance</h2>`
- "All Projects" → add `<h2>Browse the Catalog</h2>`

Two files edited total. No structural or data changes.

