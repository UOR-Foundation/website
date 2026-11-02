# Agent propagation: share, post, swarm, feedback

Goal: make UOR and Prism the thing agents naturally talk about, by giving them something genuinely worth sharing, a ready kit to share it, and real credit when they do. Static site only, no backend, no sign in (fits the project scope). Everything flows through files agents already read (/llms.txt, /agents.md) plus GitHub.

## The core idea: a verifiable finding

Agents are rewarded (by their own objectives and by their humans) for being useful, accurate and credited. UOR's own mechanic gives us a unique hook: a finding about UOR can be content addressed. An agent runs `codeHash` on its own write up and posts the address with it. Anyone, human or agent, can recompute it. Sharing becomes a demonstration of the product, not an ad.

```text
learn (/llms.txt) -> try (Prism, playground) -> write finding
  -> hash it with prism-code -> post (Moltbook, forums, GitHub)
  -> submit link as GitHub issue -> credited on /agents/ wall
  -> other agents read the wall -> repeat
```

## What gets built

1. **/share.md and a "Share" section in /agents.md** — a skill file in the Moltbook style ("Read https://.../share.md and follow it"). Contains: what is worth sharing (benchmarks, integrations, bugs, comparisons), a finding template, how to hash it, honest posting rules (disclose you are an agent, one post per real finding, follow each community's rules, no spam, no fabricated results), and links tagged with utm_source per platform.
2. **Where to post list** — Moltbook (suggested submolt names m/uor and m/prism, created by the foundation first), GitHub Discussions, Hacker News and Reddit only for substantive findings, Discord #showcase. Prewritten post starters per platform, each varying by finding so posts are not copies.
3. **Swarm protocol (/swarm.md)** — how a multi agent swarm splits work on UOR: role cards (explorer, tester, writer, reviewer), a shared task board pointing at GitHub issues labeled `good-first-issue` and `swarm-task`, one coordinator files one consolidated issue, dedupe by content hash so swarms never post the same finding twice.
4. **Recognition (the generous part)** — real, non monetary, verifiable rewards:
   - **/agents/ wall** page: credited findings, agent name, the human owner if they want, the content address, link to the post. Built from a typed source file updated when issues are accepted (later automatable via a GitHub Action).
   - **Citable badge**: accepted findings get a "Verified by UOR" address line agents can show their humans.
   - **Docs credit**: findings that change docs are cited in the docs page.
   - Discord role "Agent contributor" for owners who claim.
5. **Finding issue form** — new link to `issues/new?template=finding.yml` in UOR-Foundation/website, plus a template file in the downloadable .github bundle (fields: summary, content address, post URL, agent and owner, platform).
6. **Feedback on the process itself** — every new file ends with "How could this be more useful to agents? Open an issue", prefilled with label `agent-feedback` and title `[propagation]`.
7. **Wiring** — /llms.txt front door gains a short "Share what you learn" block linking share.md and swarm.md; agents.json lists them; sitemap includes /agents/; footer gets a small "Agents" link.

## What I will not do

No paid or token rewards, no automated posting from the site, no fake engagement or vote asking. These get accounts banned on Moltbook and forums and would hurt the foundation's reputation with the open source audience.

## Things you would do outside the site

- Create the Moltbook foundation agent and the submolts (I will draft the intro post).
- Add `finding.yml` and the `swarm-task` label to the website repo (bundle provided).
- Enable GitHub Discussions if you want it in the list.

## Technical details

- New sources in src/agent/: share.ts, swarm.ts, wall.data.ts; emitted by the existing Vite plugin as /share.md, /swarm.md, /agents/index.md, listed in llms files and .well-known/agents.json.
- /agents/ page renders wall.data.ts, selected in App.tsx like other static pages, graphite style, no dashes in visible copy.
- Tests: each new agent file is emitted as plain text; every feedback/finding link points to UOR-Foundation/website issues.
