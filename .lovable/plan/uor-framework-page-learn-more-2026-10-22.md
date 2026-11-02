# UOR Framework page ("Learn more")

A new page at **/framework/** that the "Learn more" button (under the partner logos) opens. Written for someone who has never heard of UOR, readable by engineers and laypeople, and also published as plain text for AI agents.

## Page structure (Why, How, What, implicit)

1. **Opening** — label `// UOR FRAMEWORK`, title "Data that proves what it is.", one plain line: UOR gives every piece of content a permanent address made from the content itself, verifiable by anyone, anywhere. Buttons: **Read the docs**, **Try playground**, GitHub.
2. **On this page** strip — three anchors: The problem, How it works, What you get (jump links, also used by agents).
3. **// THE PROBLEM — "Same data, many labels."** (Why)
   Plain language: every system invents its own labels (web links, file paths, database keys, model IDs). Move or rename and they break or point elsewhere; the host decides what you get. Small diagram: label chips (URL, Path, DB key, Model ID, CID, Hash) → outcomes (v1 ok, v2 changed, 404 moved). Plus a "Fragmentation to unification" diagram: isolated systems (APIs, Databases, Files, AI Models, Graphs, Streams, Ledgers, Devices, Protocols) → UOR → one shared system.
4. **// HOW IT WORKS — "Addresses derived from content."** (How)
   Three numbered steps with a simple pipeline diagram: data → canonical form → SHA 256 fingerprint → address. Key line: same bytes, same address, on any machine, forever. Three short promises: No registry. No middleman. No single point of failure.
   Each step has a one line everyday analogy for laypeople (e.g. a fingerprint, not a name tag) and a precise technical line beneath.
5. **// WHAT YOU GET — "One call. Everything you need."** (What)
   Four output cards: canonical bytes, SHA 256 ID, routable address (IPv6, CID, human readable words), and a one line verifier. Short code sample using the existing prism-code install line and copy chip, linking to Playground.
6. **// WHO IT IS FOR** — three compact cards: AI agents and ML (verifiable outputs), open source and enterprise developers (stable references across systems), everyone (proof that data has not changed).
7. **Short glossary** — Canonical form, Content address, Hash, Verification, each one sentence.
8. **Closing** — "Start building." with **Read the docs** and **Join Discord** (rainbow glow), then the shared footer.

## Navigation and agents
- Shared top menu and footer; "UOR Framework" menu item stays on the home section, "Learn more" opens this page.
- Agents: the page also exists as `/framework.md`, listed in `llms.txt` and `llms-full.txt`, with Copy page and Markdown buttons like the blog and docs.
- Page title, description and share tags set for this page.

## Style
Graphite only, shared heading sizes, `//` labels, monospace tracked captions, diagrams drawn in clean lines (no images), no dashes in visible text, no links to the old site.

## Technical details
- New `src/framework/content.ts` (typed single source) and `src/framework/Framework.tsx`, lazy loaded in `App.tsx` like `/about/`, with `/framework` redirect.
- Extend the existing Vite plugin to emit `framework.md` and add it to llms files.
- Point the home "Learn more" button to `/framework/`.
- Add to the copy test so the no dash / no old site rule covers the new content.
- Verify at desktop and phone widths with Playwright.
