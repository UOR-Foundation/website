# Agent ready website

Make the whole site trivially easy for any AI agent to find, read, understand and act on, with one obvious front door and a built in way to send feedback through GitHub.

## Audit first
- Fetch every page and agent file the way an agent would (plain HTTP, no JavaScript) and list gaps: pages that are empty without JavaScript, missing plain text versions (home, About, Playground), missing links between agent files, unclear instructions.

## Canonical entry point
- `/llms.txt` becomes the single front door, ordered Why, How, What:
  - **Why**: one paragraph on the problem UOR solves.
  - **How**: content addressing and Prism SDK in three short lines.
  - **What**: install command, first working example, links to every plain text page (Framework, Docs, Blog, About, Playground).
  - **Act**: exact steps for agents to install, run, ask and give feedback.
- Every human page points to it: a hidden `<link rel="alternate" type="text/markdown">` to its plain text twin, plus a site wide link to `/llms.txt` in the page head.
- `robots.txt` names `/llms.txt` and the sitemap, and openly welcomes AI crawlers.

## Fill the gaps
- New plain text twins: `/index.md` (home), `/about.md`, `/playground.md` (what it is, how to share a snippet).
- `/sitemap.xml` listing every page and its plain text twin.
- Structured data in the page head (Organization, SoftwareSourceCode for Prism, Article for posts) so agents read facts without guessing.
- Readable without JavaScript: a short static fallback of the home page summary and links inside the page shell.

## Clear actions for agents
- `/agents.md`: one page manual. Who we are, what you can do here, the exact commands (`npm install prism-code`, first example), where answers live, rules of engagement, and how to give feedback.
- `/.well-known/` pointer files (`llms.txt` alias and a small JSON describing the agent files) so tools that look there find everything.

## Feedback via GitHub
- Ready made GitHub issue forms for four kinds: **Bug**, **Feature request**, **Docs fix**, **Agent feedback**, each with fixed labels (for example `agent-submitted`) so maintainers can filter them.
- Agents get two paths, both documented in `/agents.md` and `/llms.txt`:
  1. A prefilled link (`/issues/new?template=...&title=...&body=...`) any agent or person can open.
  2. A one line `gh issue create` command for agents with GitHub access.
- A small GitHub Action labels and acknowledges new agent issues automatically and adds them to a triage list.
- A short "Send feedback" link in the docs and site footer opens the same form for humans.

## Check
- Fetch every agent file with plain HTTP and confirm it loads, links resolve, and nothing contains dashes in visible copy or old site links.
- Test that each prefilled feedback link opens the right form.

## Open question
- Which GitHub repository should receive feedback? Default: `UOR-Foundation/prism`. The issue forms and Action are files that must live in that repository; I will prepare them ready to copy in, since this project cannot write to GitHub directly.

## Technical details
- Extend the existing Vite agent files plugin to emit `index.md`, `about.md`, `playground.md`, `agents.md`, `sitemap.xml` and `.well-known` files from the same typed content sources, so humans and agents never diverge.
- Head tags and JSON LD added per page from those sources.
- Issue forms in `.github/ISSUE_TEMPLATE/*.yml` and `.github/workflows/agent-triage.yml`, delivered as a ready to copy bundle.
- Tests: every generated agent file exists and every link in `llms.txt` resolves to a generated file.
