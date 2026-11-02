# Make Discord the clear, professional home of the UOR community

Goal: a new visitor (open source dev, ML engineer, enterprise dev or AI agent) lands in one place, understands why, how and what within two minutes, and knows exactly where to go next. Discord should look and read like the website: graphite, sharp, no clutter.

## Current state (from the channel map)
- 41 channels in 6 categories; 26 sit in ARCHIVE, several still active and off topic (spiritual-warfare, esoteric, ai-hype-stuff).
- Mixed naming: some channels have emoji and the "┊" divider, some don't (prism-projects, foundry-dev, rules).
- "rules" is uncategorized; overlap between projects, prism-projects, collaboration, project-sharing.
- About 207 members; #community carries most activity.

## 1. One canonical entry point
Use Discord Onboarding plus a locked **#start-here** as the single front door:
1. Rules screen (short, 5 points, also shown on the website).
2. Onboarding question "What brings you here?" → Open source contributor / ML engineer / Enterprise evaluator / Building agents. Each answer grants a role and reveals the matching channels.
3. #start-here holds three pinned cards, mirroring the site:
   - **Why**: the UOR one liner and the problem it solves.
   - **What**: UOR Framework and Prism SDK in one sentence each, links to Docs and Playground.
   - **How**: install line, first example, where to ask questions, how to contribute.
4. Server Guide "Resources" tiles link to Docs, Playground, GitHub, Blog, and llms.txt for agents.

## 2. Lean channel structure (same sections as the site)

```text
WELCOME      start-here · announcements · introductions · rules (merged into onboarding)
LEARN        docs-and-guides · faq
BUILD        prism-sdk (forum) · uor-framework (forum) · showcase (forum) · help (forum, tags: bug/question/idea)
AGENTS       agent-integrations (forum) · llms-and-mcp
COMMUNITY    general · events · lounge (voice)
FOUNDATION   governance (forum) · rfcs (forum) · moderators (private)
```
- Remove emoji and "┊" for a clean, uniform, lowercase style matching the site.
- Merge overlapping channels (projects, prism-projects, project-sharing → showcase; collaboration → help or rfcs).
- Hide ARCHIVE from new members; delete or export the off topic channels with your sign off.
- Every channel gets a one line topic describing exactly what belongs there.

## 3. Visual and content alignment
- Server icon: white wireframe UOR mark on graphite. Banner and invite splash: graphite with the spectrum line, matching the LinkedIn banner.
- Description and traits already match the site; keep them.
- Role colours limited to white and greys, one spectrum accent for maintainers.

## 4. Audience specific polish
- Enterprise: a #faq post covering licence, governance, security and contact.
- Open source (CNCF, Red Hat style): CONTRIBUTING summary, RFC forum template, good first issue feed from GitHub.
- ML engineers: Prism examples and Playground links pinned in prism-sdk.
- AI agents: a pinned post linking llms.txt, llms-full.txt and per page .md docs.

## 5. Website side
- Community section and header Discord icon point to a permanent invite that lands in #start-here.
- Optional: live member count on the site from the bot.

## How I can do it
- With the bot given Manage Channels, Manage Roles and Message Content permissions, I can rename, reorder, create channels, set topics and post the pinned start-here cards, after you approve the final map.
- Onboarding, Server Guide and icon or banner upload are set in Discord settings by you; I'll prepare the exact text and images.
- Nothing is deleted without your confirmation; archived channels are hidden first.

## Deliverables
1. Final channel map and wording document for your review.
2. Server icon, banner and invite splash images.
3. Applied changes on Discord, then a checklist for the settings only you can change.
