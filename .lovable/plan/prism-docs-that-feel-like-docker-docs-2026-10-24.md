# Prism docs that feel like Docker docs

Anyone who knows Docker should feel at home in Prism docs straight away, whether they are a developer or an agent. Prism v1.0 is leaner than Docker, so the docs should say plainly what exists today and what is coming, and nothing should feel missing by accident.

## The core idea: the docs translate Docker into Prism

Prism already maps itself onto Docker in PrismPM's vocabulary page, `docs/vocabulary.md`. For example, a model is like a Dockerfile, a holo is like an image, an instance is like a container, and `prism build` is like `docker build`. The site makes that mapping the backbone of the docs, so every reader starts from what they already know.

```text
Docker           Prism
Dockerfile   ->  model
image        ->  holo
container    ->  instance
registry     ->  registry
docker build ->  prism build      (Available in M2 v0.5)
docker run   ->  prism run        (Available in M3 v0.6)
docker push  ->  prism push       (Available in M4 v1.0-beta.1)
```

## 1. Same four sections as Docker

The top tabs follow Docker's order and names:
- **Get started**: install, the first holo, and "Coming from Docker".
- **Guides**: task walkthroughs such as building, checking and sharing a holo, or using a holo as an agent tool.
- **Manuals**: one page per product area: the prism-code runtime, the prism CLI, Registry and Deploy.
- **Reference**: CLI, the prism-code API, file formats (holo, manifest, lockfile), attestations, errors, Vocabulary and SDKs.

The current API Reference and Reference pages move under Reference, with API as a group inside it, exactly where Docker keeps its API docs. Changelog stays as a tab named "What's new".

Pages still come only from the docs-site branch. The site maps upstream folders onto these four sections: `get-started/` goes to Get started, `guides/` to Guides, `manuals/` to Manuals, and `api/`, `reference/` and `sdks/` to Reference. A section appears once it has pages.

## 2. "Coming from Docker" as the first thing you read

- One page with a two column table, Docker on one side and Prism on the other, covering nouns and verbs. It's generated automatically from upstream `vocabulary.md`, so it is never retyped by hand.
- Each row shows when that feature arrives, taken from the roadmap milestones, for example: `prism build`, Available in M2 v0.5.
- It's linked from the Home card "Get started" and from the ask box suggestions.

## 3. A Docker hint inside every page

- The first mention of a Prism term on a page, such as holo, instance or capability set, gets a subtle dotted underline. Hovering or tapping shows "Like a Docker image" and links to the Vocabulary page.
- The search box understands Docker words. Typing "container", "image" or "docker run" finds the matching Prism page.

## 4. Lean, honest scope ("Available in")

- Every page already shows Available in, read from the upstream frontmatter. It becomes a small badge naming the milestone, for example "M3 v0.6", and links to that milestone on GitHub.
- On the Reference CLI page, verbs that haven't shipped appear dimmed with their milestone badge. Readers see the full Docker shaped surface without mistaking plans for features.
- The release status table stays on every page.

## 5. Home page like Docker's

- "How can we help?" ask box. The suggested questions become Docker shaped, for example:
  - How do I get started with Prism?
  - What is a holo, compared with a Docker image?
  - How do I run a holo?
  - Can my AI agent call a holo as a tool?
  - What ships in v1.0?
- Four cards in Docker's order: Get started, Guides, Manuals, Reference.
- **Roadmap strip**: the seven milestones (M1 Foundation to M7 Runtimes and plugins) as a slim timeline showing due dates and progress, pulled every 6 hours from public GitHub milestones.
- **What's new feed**: the latest dated entries, as on Docker's home page, taken from upstream changelog.md once it exists.

## 6. For agents

- **`/docs/docker.md`**: the Docker to Prism mapping as plain text. An agent that knows Docker can translate any task with it, for example: "to do `docker run`, call `prism run` (Available in M3), or today use prism-code `load` + `dispatch`".
- **`/docs/llms.txt`** is grouped by the same four sections, and each line carries its Docker equivalent and availability.
- **`/docs/roadmap.json`**: the milestones, their status, and which verbs each one unlocks. Agents never suggest a command that has not shipped.
- `/agents.md` gains one line: "Know Docker? Read /docs/docker.md first."

## Not changing

- The site's design, the Playground, the release table, the 6 hour sync, the uor.foundation predicate identifier, and the agent files beyond what is listed above.

## Technical details

- **Sync**: `scripts/sync-prism-docs.mjs` also pulls `vocabulary.md` (from the docs-site root, or `docs/vocabulary.md` on main as the seed). It also pulls milestones from the GitHub API (`/repos/UOR-Foundation/PrismPM/milestones`: title, due date, open and closed counts, URL). Both go into `prism.generated.ts`.
- **Vocabulary parser**: a small parser in `src/docs/vocabulary.ts` turns the Nouns and Verbs tables into typed data `{ prism, docker, note, milestone? }`. The milestone comes from matching a verb against milestone descriptions, with "Planned" rows flagged.
- **Navigation**: `content.ts` rewires TAB_DEFS to Get started, Guides, Manuals and Reference, with a folder to section map. Reference holds groups CLI, API (prism-code), Formats, Errors, Vocabulary and SDKs.
- **Rendering**:
  - The Markdown renderer gets a term pass: the first occurrence per page becomes a `<abbr>` style tooltip.
  - The search index gets Docker synonym keys.
  - The Available in badge links to the milestone.
  - The Home page gets a `Roadmap` and a `WhatsNew` component.
- **Agent files**: the Vite plugin emits `docs/docker.md` and `docs/roadmap.json`, and `/docs/llms.txt` is regrouped.
- **Tests**:
  - The vocabulary parser maps holo to image and instance to container.
  - Every tab is one of the four Docker sections.
  - Every page twin contains the release status.
  - `docker.md` lists every verb with an availability.
  - `roadmap.json` has the seven milestones.
- **Docs-site branch**: upstream should add `manuals/` alongside the existing folders. I'll list this in my reply as the one request for the PrismPM side.
