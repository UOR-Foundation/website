# Prism Docs: enclosed template

A self contained docs experience at /docs/, in the same graphite look as the home page, modelled on the Fern docs structure. Template only: placeholder pages and sections, real content added later.

## What you will see

**Top bar (always visible)**
- UOR wordmark linking home, a centred Search field with a ⌘K hint, an "Ask AI" pill (placeholder for now), and a white "Playground" button on the right.
- Tab row beneath: Home, Docs, API Reference, SDKs, Changelog. The active tab gets a thin white underline.

**Docs Home**
- `// OVERVIEW` eyebrow, large title "Prism documentation.", one line intro.
- Three cards with subtle animated graphite patterns (dots, grid, lines): Get started, API Reference, SDKs.
- A faint pixel grid glow in the top right corner, very restrained.

**Docs / API Reference / SDKs pages (three column layout)**
- Left: grouped sidebar (Get started, Concepts, Guides...) with the current page highlighted; collapses into a menu on phones.
- Centre: breadcrumb, title, summary, read time and updated date, then the article with clean headings and copyable code blocks; Previous / Next links at the bottom.
- Right: "On this page" list that tracks your scroll position.
- SDKs overview shows a tidy grid of language cards (TypeScript first) with version and package name.

**Changelog**
- "What's new." with a vertical timeline: date, version, Feature / Fix tag, title, short note.

**Search (⌘K)**
- A clean command palette that finds any page or heading instantly, fully keyboard driven.

## Made for agents too
- Every page is also available as plain Markdown (add `.md` to the address), with a "Copy page" and "View as Markdown" button on each page.
- A `/llms.txt` index and `/llms-full.txt` with all docs in one file, generated from the same source as the pages.
- Proper semantic structure, stable heading anchors, and readable addresses like `/docs/get-started/quickstart`.

## Placeholder content
Each page uses short neutral placeholder text that follows the no dash rule; I will mark it clearly as placeholder so it is easy to replace.

## Links
- "Read the docs" in the top banner and the Prism SDK section will open /docs/ instead of GitHub.

## Technical details
- Content lives in one typed source (`src/docs/content.ts`): nav tree, pages as Markdown strings, changelog entries. Pages render from it; a small Vite build step writes `public/llms.txt`, `public/llms-full.txt` and per page `.md` files from the same source.
- `App.tsx` adds a lazy `/docs/` branch (no router dependency, same pattern as Playground); paths parsed from `location.pathname`, history pushState for in app navigation.
- Markdown rendered with a lightweight renderer plus Shiki for code; heading ids slugified for the TOC; IntersectionObserver for scroll spy.
- Styling via `.foundation` graphite tokens in `index.css`; no new colours, reduced motion respected.
- Update copy test to cover docs content; add `AGENTS.md` rule for the single docs source.
