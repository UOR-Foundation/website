# Prism docs: focused, Docker familiar, roadmap true

Goal: someone who knows Docker gets a self-verifying app running in minutes, and every page maps to a Docker feature that the v1.0 roadmap actually ships.

## Where the docs are today
- 18 upstream pages, all under Reference (12 API, 6 formats). Get started holds only "Coming from Docker". Guides and Manuals are empty "Coming" cards.
- The page titles use API verbs (load, instantiate, dispatch), not the tasks a Docker user is looking for.
- The roadmap milestones (M1 to M7) are already synced every 6 hours.

## 1. One golden path on Home
Replace the four equal cards with one clear sequence, like Docker's "Get started" flow:

```text
1 Install      npm install prism-code              Today
2 Run a holo   load + instantiate + dispatch       Today
3 Verify it    verify                              Today
4 Build        prism build                         M2 v0.5
5 Share        prism push / pull                   M4
```
Each step links to its page and shows its availability badge. The ask box stays above. The roadmap strip stays below.

## 2. Docker shaped navigation, roadmap driven
- Sidebar groups follow Docker's manuals: Build, Run, Inspect and logs, Verify (new to Prism), Share (registry), Agents (as a tool).
- Each existing upstream page goes into the group that matches its Docker task. For example, instantiate and dispatch go under Run, history and replay go under Inspect and logs.
- A Docker feature with no page yet appears once, dimmed, with its milestone, for example "Push to a registry, M4". Readers see the whole Docker surface without mistaking plans for features.
- Docker features that are not on the roadmap at all, such as Compose, Swarm and volumes, are left out completely. This keeps the docs lean.

## 3. Task first labels
- In the sidebar, each page is labelled with its Docker task first and the Prism API second, for example "Run a container (instantiate)". Upstream text is not rewritten.
- Search keeps the Docker synonyms.

## 4. Fewer things on every page
- The full release table becomes a single line with a link to the full table: "Documents v1.0 · npm 0.2.0 · CLI not shipped".
- The "Available in" badge sits next to the title.
- Previous and Next links follow the golden path order.

## 5. Upstream request (PrismPM)
I'll give you a ready-to-paste prompt for PrismPM asking for:
- a `get-started/quickstart.md` page covering the five steps above
- one `guides/` page per golden path step
- `manuals/` pages for Build, Run, Verify and Share

The site picks these up automatically on the next pull and fills the dimmed slots.

## For agents
- `/docs/llms.txt` and `/docs/docker.md` follow the same task order.
- `/docs/roadmap.json` lists each Docker feature with its status: today, a milestone, or not planned.

## Not changing
The design, the Playground, the 6-hour sync, and the upstream page text.

## Technical details
- `src/docs/vocabulary.ts`: add `DOCKER_FEATURES`, a list of `{ task, dockerCmd, prismSlug?, verb?, milestone }`. Milestones are matched as they are today, and features no milestone mentions are dropped.
- `src/docs/content.ts`:
  - Group pages by feature instead of folder.
  - Add the task first label and a `GOLDEN_PATH` order.
  - Dimmed placeholders are navigation entries only, with no fake pages.
- `src/docs/Docs.tsx`:
  - A golden path component on Home.
  - A compact release line.
  - Sidebar rendering for the dimmed entries.
- Tests:
  - Every golden path step resolves to a page or a milestone.
  - Features that are not planned never appear.
  - Every page twin still links to the release status.
- Update the docs rule in AGENTS.md.
