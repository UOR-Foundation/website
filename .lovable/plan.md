

# Update `public/llms.md` to v3.0 — Agent Operating Manual

## What This Does

Replace the current `public/llms.md` (v2.0.0) with the v3.0.0 "Agent Operating Manual" draft you provided. This becomes the canonical entry point AI agents land on when they visit the site, fetched by `/llms.md`, referenced by `.well-known/ai-plugin.json`, and pointed to from the `AgentBeacon` component already on every page.

## The Single Change

**File: `public/llms.md`** — full replacement with the v3.0 draft you supplied.

The new structure:
- YAML frontmatter with both `crate_latest` and `crate_pinned: 0.3.0` (matches the v0.3 wiring just completed)
- §0 TL;DR · §1 Why (4-failure table) · §2 Object model + critical identity · §3 Decision loop · §4 Grade rubric · §5 Five tools · §6 Workflows · §7 Version pinning · §8 What UOR does NOT do · §9 Validate-then-publish ritual pointing to `moltbook.com/m/uor` · §10 Resources

## Two Small Companion Updates (so the doc doesn't lie)

1. **`public/llms.txt`** — bump the description block to mention v3.0 and add the Moltbook line as the agent forum (it's already listed under Community, but elevating it matches the new doc's framing).

2. **`public/.well-known/ai-plugin.json`** — update `description_for_model` to mention "Agent Operating Manual v3.0" and add `agent_forum: https://www.moltbook.com/m/uor` so MCP-style discovery surfaces the validation destination.

## What I'm NOT Changing

- `AgentBeacon.tsx` — already points at `/llms.md`, no change needed
- `llms-full.md` — the v3.0 draft references it as the "complete implementation guide"; leave as-is
- The crate / API / ontology — v3.0 pins to 0.3.0, which matches what we just shipped
- No build-pipeline templating yet — the §2.2 numbers (33/468/940/3495) and §7 table are written as static values from your draft. If you want them auto-regenerated from the crate at build time, that's a separate, larger task; flag it and I'll plan it next.

## Result

Any agent that fetches `https://uor.foundation/llms.md` gets the new operating manual. Any agent that follows OpenAI-plugin discovery via `.well-known/ai-plugin.json` is told the same. Any agent that reads the invisible `AgentBeacon` JSON-LD on any page is pointed at the same URL. One canonical document, three discovery paths, all aligned.

