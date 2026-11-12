# Rewrite the Prism docs from the documentation report

Audience: developers and AI agents building with Prism SDK v0.4. Plain words, every command runnable today, nothing untested.

## Decisions
- The report replaces the text copied from the PrismPM repo. The 6-hourly copy of page text stops; the feature-request sync stays.
- The docs are branded **Prism SDK v0.4**. One version table explains the real numbers: prism-code 0.7.2, PrismPM 0.3.0, LexLean 0.3.0, Lean v4.32.1.
- Only capabilities the report marks **Verified** are kept. Anything "Documented only" or "Unclear" is removed.

## New docs structure

**Get started**
1. Why Prism / How it works / What you can build (kept short and rewritten from the report's summary)
2. Set up: what `npx prism-code@latest setup` changes (skill, agent connections, link handler, backups), and a clear note that checks upload `src/` to a hosted checker that anyone with the draft ID can read
3. Try the sample: inspect, replay examples and run the bundled Calculator, using the report's real output
4. Build with your agent: one sentence becomes a spec, then proofs, then an app (the guided flow setup installs)
5. Share: push and pull, using the report's verified output
- A visible note: every app is safety level P0 today, so the default policy refuses unsigned apps. The page shows the exact setting to use.

**Guides** (verified tasks only)
- Scaffold a project (`init`), check/prove/build in tiers, detect changed behaviour (`history`, `replay`), generate a typed client, use an app from code

**Reference**
- Core concepts: model, spec, property, rule, example, holo, fingerprint, guest, world, capability set, each defined once
- Commands: only the verified `prism-code` commands, each with its real output
- Agent tools: the seven tools, the workflow, and how to report what was proved and what was only tested
- Exit codes
- Versions: the version table

**Changelog**: the placeholder v1.0/v0.9 entries are replaced by real entries from the report (or removed where it has no data).

## Removed
- The "v1.0 API" banner, "Coming in M6 v1.0" labels and planned `prism ...` CLI commands
- Pages describing 0.2.0, "Coming from containers", and the dimmed roadmap-only nav entries
- Ask-box suggestion "What ships in v1.0?" (becomes v0.4 questions)
- Any capability the report did not run successfully

## Technical details
- The new page content goes in a hand-written source file under src/docs; content.ts reads from it instead of prism.generated.ts. scripts/sync-prism-docs.mjs and its workflow step stop writing page text. The skill file sync stays as is because deploy checks depend on it.
- llms.txt, llms-full.txt, the per-page .md files, search and the sitemap come from the same source, so humans and agents see identical text.
- Update src/docs/AGENTS.md (docs now come from the report source, not the sync) and the docs tests (docs.test.ts, agent.test.ts) to match the new pages and to fail if an unverified command appears.
- Run vitest, then check /docs in the preview on desktop and mobile.
