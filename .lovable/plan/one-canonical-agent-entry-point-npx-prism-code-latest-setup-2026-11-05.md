# One canonical agent entry point: `npx prism-code@latest setup`

## What the agent feedback shows
An agent summarising uor.foundation came away with a muddled picture:
- It reported `npm install prism-code` (0.2.0) as the way to start, and `npx skills add https://uor.foundation` as the skill install. Both still appear on the site and in agent files.
- It found three overlapping "start here" files (llms.txt, agents.md, agents.json) with no single clear first action.
- It described docs for a "planned v1.0" with many unshipped features, so it could not tell what to actually run.
- It listed the LexLean MCP server at mcp.uor.foundation as a live capability, but nothing on the site describes it, so the agent pieced that together from elsewhere.

## Goal
Every agent that lands anywhere on the site sees the same three things within its first screen of text: what UOR and Prism are, the single command to start (`npx prism-code@latest setup`), and what tools and capabilities it gets.

## Changes

**1. One command, everywhere**
- `npx prism-code@latest setup` becomes the only start action in the hero, Prism section, llms.txt, agents.md, agents.json, page twins, share.md, playground notes, skill files and docs Get started.
- Remove every "npm install prism-code" step, the humans/agents install split, and the `npx skills add` line from site copy and agent files.

**2. A sharp front door**
- `/llms.txt` opens with: one line on what UOR is, one line on Prism, the command in a code block, then "What you get" (capabilities and tools) and "Where to read next". Everything else moves below.
- `/agents.md` becomes the full manual in the same order: Start, Capabilities, Tools, Rules, Feedback. No duplicated text with llms.txt beyond the opening.
- `/.well-known/agents.json` gets a top-level `start` field holding the command, plus `capabilities` and `tools` lists matching agents.md.
- Every page twin (`/index.md`, `/docs.md`, `/framework.md`, …) starts with a two-line banner: the command and a link to `/agents.md`.

**3. Describe tools and capabilities plainly**
- A single "Capabilities" list (what Prism setup gives an agent: build, run and check self-verifying apps; content identity; the Prism skill) and a "Tools" list, from one source used by llms.txt, agents.md, agents.json and the homepage.
- Question for you below on whether the LexLean MCP server belongs here.

**4. Docs without confusion**
- Get started step 1 becomes "Set up: `npx prism-code@latest setup`"; the install page and the status table stop mentioning npm install.
- Upstream doc text synced every six hours still contains `npm install prism-code` (11 places). The existing docs rewording layer will replace that install line with the setup command on display, so the site stays consistent even before upstream changes. Code blocks other than the install line are left as written.

**5. Guard rails**
- Tests: no visible copy, agent file or docs page contains `npm install prism-code` or `npx skills add`; llms.txt, agents.md and agents.json each contain the setup command in their opening lines; agents.json `start` matches the homepage command.
- Check: fetch llms.txt, agents.md, agents.json, a docs page twin and the homepage in the preview as plain text; screenshot the homepage desktop and mobile.

## Technical details
- New single source `START` (command, capabilities, tools) in `src/site/copy.ts`; drop `HERO.install` / `FRAMEWORK.install`; consumers in `src/agent/site.ts`, `share.ts`, `skill.ts`, `src/docs/content.ts` (STEPS, status row, install task) read it.
- `src/docs/vocabulary.ts`: rule mapping the `npm install prism-code` install line to the setup command.
- Update `src/test/skill.test.ts` and `src/test/copy.test.ts` expectations; add assertions in `src/test/agent.test.ts`.
- The skill-examples test (runs examples against the pinned package) stays as is internally; only the shown install step changes.

## Open question
The agent cited the LexLean MCP server (mcp.uor.foundation) as a live tool. The site currently says "no remote MCP server yet". Should agents.md list it as an available tool, or leave it out to keep the focus on Prism?
