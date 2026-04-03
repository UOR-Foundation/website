

# Projects Page Redesign: Clean, CNCF-Style Project Landscape

## Goal
Streamline the Projects page to match the clean, scannable feel of the Docs and Community pages. Make it immediately familiar to CNCF/Linux Foundation developers: clear maturity model, flat project catalog, simple submission flow.

## Current Issues
- "How to Contribute" 3-step section is redundant with similar content on Community page
- Collapsible maturity categories add interaction complexity for a small catalog (all 11 projects are Sandbox)
- Large project card images (h-60) make the page very tall and harder to scan
- The "Project Journey" maturity section with criteria lists is dense
- Submit form has a hidden `problemStatement: "N/A"` field that was removed from UI but still sent

## New Structure

### Section 1: Hero (simplified, consistent with Docs/Community)
- Title: "Projects"
- Subtitle: "Open-source tools and infrastructure built on the UOR Framework. Browse the catalog, or submit your own."
- Two buttons: "Submit a Project" (anchor to #submit) and "View on GitHub" (→ GitHub org)

### Section 2: Maturity Model (compact, inline)
- Title: "Project Maturity"
- Three compact cards in a row: Sandbox, Incubating, Graduated
- Each card: colored dot, level name, one-line tagline. No criteria lists. No icons.
- Keep it as a quick visual reference, not a deep-dive section

### Section 3: Project Catalog (flat grid, no collapsibles)
- Title: "All Projects"
- Remove the collapsible category wrappers entirely. Show all projects in a flat 3-column grid.
- Smaller, more compact cards: no cover images (remove the large hero images), just category tag, maturity badge, project name, one-line description, and a "Learn more" link.
- This makes the catalog scannable like a CNCF landscape table. Projects are few enough (11) to show all at once without pagination or "show more."
- Keep the Link to individual project detail pages.

### Section 4: Submit a Project (keep form, simplify wrapper)
- Keep the dark section with the submission form as-is (it works well)
- Simplify the heading copy slightly

## Technical Changes

| File | Change |
|---|---|
| `src/modules/projects/pages/ProjectsPage.tsx` | Remove "How to Contribute" section. Simplify maturity section (remove criteria lists, icons). Replace collapsible catalog with flat 3-column grid of compact cards (no images). Remove `CollapsibleCategory` and `ProjectCategorySection` components. Keep submit form. |

No new files. No data changes needed.

## Key Principles
- Flat, scannable catalog over nested collapsibles
- Compact cards without large images for quick browsing (detail pages still have images)
- Consistent page structure with Docs and Community: hero → quick context → content → CTA
- Remove the "How to Contribute" section (Community page already covers contribution pathways)

