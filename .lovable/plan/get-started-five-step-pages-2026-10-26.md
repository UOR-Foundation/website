# Get started: five step pages

## Goal
Turn the five Docs home cards into a clickable Get started path that anyone can follow, whether it's a developer or an agent, without knowing anything about UOR or Prism first. Each page reads as one short story: why it matters, how to do it, then what you get. These are never shown as labels. The words and order follow the container workflow developers already know: Install, Build, Run, Verify, Share.

## Pages

```text
Get started
  1 Install   available    npm install prism-code
  2 Build     coming M6    package your code into one app (like an image build)
  3 Run       available    load, start, send a request (like run / exec)
  4 Verify    available    check the receipt every reply carries (new to Prism)
  5 Share     coming M4    push / pull through a registry
  ---
  Coming from containers
```

## Page shape (every step)
1. **Step counter and title**: "Step 3 of 5", then "Run".
2. **Opening (why)**: two plain sentences that say what this step is and why it matters, in everyday words. The first page explains what an app is, and every later page builds on that.
3. **Do it (how)**: a short task heading such as "Start an app", one line saying what the code does, then a copyable code block using the real prism-code commands from Reference.
4. **You should see (what)**: the real expected output.
5. **Hand-off note**: one line linking to the next step ("Every reply carries a receipt. Next, you will check it.").
6. **Footer**: Previous and Next buttons, plus "Full detail in Reference".

## Steps that aren't available yet (Build, Share)
- The same page shape, with a clear "Coming in M6 v1.0" tag (or M4) at the top.
- The opening explains what the step will do and which familiar container step it matches.
- No made-up commands. Instead of a code block: "Until then, run a ready-made app" with a link to Run, plus a link to the roadmap item.
- These stay dimmed in the sidebar with their tags, as they are today.

## Wiring
- Each Docs home card links to its step page.
- The sidebar shows the numbered steps above "Coming from containers".
- Search and Ask AI suggestions include the step pages.

## For agents
- Each step page gets its own Markdown copy, such as /docs/get-started/run.md, plus the usual copy buttons.
- llms.txt lists the five step pages as the starting path, in order, each marked as available or coming.
- roadmap.json links each step to its page and its availability.
- Agents are told plainly not to suggest Build or Share commands until they ship.

## Copy rules
- Never use dashes in visible text, never write "Docker", and call the artifact an "app" in prose.
- Explain each new word the first time it appears: app, receipt, verify.
- Keep every page to about one screen.

## Technical details
- Add a STEPS source in src/docs/content.ts. Each entry has its slug, title, opening text, task heading, code, output, hand-off line, availability, milestone and Reference slug. Use it to generate the pages `get-started/{install,build,run,verify,share}` and their Markdown copies, so people and agents always read the same text.
- Code and output come from the synced upstream API pages (`api/load`, `instantiate`, `dispatch`, `verify`), not invented ones. If an upstream example is missing, show the Reference link instead.
- When upstream later ships its own get-started pages, the synced pages override these.
- Docs.tsx gets a step layout with the counter, hand-off note and Previous/Next buttons, using the existing type tokens and card styles.
- GOLDEN_PATH cards point to the step slugs.
- Tests check five steps in container order, that Build and Share are marked coming and have no code block, that every step has its own Markdown copy and llms.txt entry, and that there are no visible dashes or "Docker".
- Add an AGENTS.md rule saying Get started steps come from one STEPS source.
