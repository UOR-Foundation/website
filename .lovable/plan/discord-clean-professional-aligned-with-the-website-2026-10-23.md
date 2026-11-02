# Discord: clean, professional, aligned with the website

## What the screenshot shows
- 5 sections, 15 channels. Good start: lowercase, no emoji.
- Overlap: collaboration, prism-projects, projects and foundry-dev all mean "show or discuss work".
- BUILD holds one channel; CONNECT holds the building channels. Names don't match the site (UOR Framework, Prism SDK, Community).
- "awesome-uor" and "funding" are unclear to newcomers; collaboration threads are research topics hidden as threads.

## Option A: Mirror the website (recommended)
Sections named exactly like the top menu, so site and server feel like one product.
```text
START        start-here · announcements · introductions
UOR FRAMEWORK  framework (forum: questions, research, rfcs)
PRISM SDK    prism (forum: help, bug, idea) · showcase (forum)
COMMUNITY    general · agent-findings · events · lounge (voice)
FOUNDATION   governance (forum) · moderators (private)
```
12 channels. Merges collaboration, projects, prism-projects, foundry-dev into prism / showcase / framework; awesome-uor becomes a pinned resources post in start-here; funding moves into governance.

## Option B: Minimal (fewest choices)
```text
START      start-here · announcements
BUILD      help (forum) · showcase (forum) · research (forum)
COMMUNITY  general · lounge (voice)
FOUNDATION governance · moderators (private)
```
9 channels. Tags replace channels (framework, prism, agents). Best while activity is low; easy to split later.

## Option C: By audience
```text
START        start-here · announcements · introductions
DEVELOPERS   prism · framework · showcase
RESEARCH     research (forum, migrates current threads)
AGENTS       agent-findings · llms-and-mcp
ENTERPRISE   evaluate (faq, licence, security)
COMMUNITY    general · lounge
FOUNDATION   governance · moderators
```
Matches the four target audiences; Onboarding roles reveal only the relevant section. Most structure, most upkeep.

## Applies to every option
- Every channel gets a one line topic; forums get tags and a post template.
- #start-here: three pinned cards Why / What / How, linking Docs, Playground, UOR Framework page, /agents/ and llms.txt.
- Onboarding question "What brings you here?" assigns a role.
- Visuals: graphite server icon with the white UOR mark, banner with the spectrum line (same as the site header), greyscale role colours.
- Nothing deleted: old channels move to a hidden archive first.

## After you pick
I prepare the final map and wording, the icon and banner, then apply renames, merges and topics via the bot (needs Manage Channels and Manage Roles). Onboarding and the banner upload you set in Discord settings with the text I provide.
