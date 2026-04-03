

# Community Page Redesign: Clean, CNCF-Style Developer Hub

## Goal
Simplify the Community page (`/community`) to feel immediately familiar to open-source developers from CNCF, Linux Foundation, and similar ecosystems. Clear pathways, minimal noise, recognizable terminology.

## Current Issues
- "Research Areas" with 12 filterable categories (10 disabled) feels cluttered and speculative
- "How to Participate" section uses generic language
- "Blog & Events" merged section is dense
- Overall structure doesn't match what open-source developers expect from a community page

## New Structure

### Section 1: Hero (simplified)
- Title: "Community"
- Subtitle: "Propose ideas, contribute code, review research, and ship projects in the open."
- Two buttons: "Join Discord" and "Contribute on GitHub"

### Section 2: Get Involved (3-card grid, CNCF-style)
Three cards with clear, recognizable open-source pathways:
1. **Discuss** - "Ask questions, share ideas, and connect with contributors on Discord." → Discord
2. **Contribute** - "Browse open issues, submit pull requests, and review code on GitHub." → GitHub org
3. **Propose Research** - "Submit a paper, get peer review, and publish results openly." → Discord / GitHub research

### Section 3: Research (streamlined)
- Remove the 12-category filter bar entirely. Most categories are disabled and it creates false expectations.
- Show all published research as a flat list/grid. Currently there are only 5 papers across 2 active categories. Present them simply.
- Keep the "Submit Your Research" card and GitHub link.

### Section 4: Blog
- Keep the 3 blog post cards as-is (already clean).
- Remove the "Blog & Events" merged heading. Separate them visually.

### Section 5: Events
- Keep the event list as-is but with its own clean heading: "Events"

### Section 6: CTA (keep as-is)
- "Join the Community" with Discord and GitHub buttons. Already clean.

## Technical Changes

| File | Change |
|---|---|
| `src/modules/community/pages/ResearchPage.tsx` | Remove research category filter bar and `selectedCategory` state. Flatten all published research into a single grid. Separate Blog and Events into distinct subsections. Simplify hero subtitle. |

No new files. No data file changes needed (research-papers.ts and blog-posts.ts stay the same).

## Key Principles
- Use terms developers recognize: "Contribute," "Issues," "Pull Requests," "Peer Review"
- Remove disabled/placeholder categories that add noise
- Let the content speak for itself without elaborate filtering UI
- Match the clean, scannable feel we achieved on the Docs page

