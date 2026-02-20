

# AI Agent Discovery Hook — Implementation Plan

## Problem

When an AI agent is given `https://uor.foundation/`, it fetches the HTML but cannot execute JavaScript (SPA client-side routing). The agent sees raw HTML with no rendered content, misses the `<link rel="llms">` tags buried in the `<head>`, and concludes the site is inaccessible. The existing discovery signals (HTML comments, meta tags, link tags) are present but not in the formats and locations that AI agents actually check.

## Solution

Strengthen the three discovery layers that AI agents **do** check before, during, and after fetching a page — all working silently in the background with zero impact on human visitors.

## Changes

### 1. Expand `robots.txt` — the first file every agent reads

Add explicit AI-agent directives pointing to `llms.md`, `llms.txt`, and the discovery metadata. Many AI crawlers (GPTBot, Anthropic, Google-Extended) parse `robots.txt` before anything else.

```
User-agent: *
Allow: /

# === AI Agent Discovery ===
# Entry point for AI agents (start here):
# https://uor.foundation/llms.md
#
# Machine-readable discovery:
# https://uor.foundation/llms.txt
# https://uor.foundation/.well-known/uor.json
# https://uor.foundation/agent-discovery.md
# https://uor.foundation/openapi.json

Sitemap: https://uor.foundation/sitemap.xml
```

### 2. Expand `llms.txt` — the emerging agent standard

The current `llms.txt` is 6 lines of comments. The `/llms.txt` convention (used by Anthropic, OpenAI, and others) expects a structured, self-contained document that agents can parse immediately. Rewrite it to be a proper entry point with enough context for an agent to understand UOR and find the full documentation — all without needing to fetch anything else first.

### 3. Add a `<noscript>` block in `index.html`

Since agents don't execute JavaScript, add a `<noscript>` section inside `<body>` containing structured plain text with direct links to `llms.md`, the API, and the discovery chain. This is invisible to human visitors (whose browsers execute JS) but is the primary content an agent sees when parsing the HTML.

### 4. Add well-known AI discovery meta tags to `<head>`

Add the `ai-plugin` and `robots` meta hints that newer agent frameworks scan for:
- `<meta name="ai-plugin" content="/llms.md">`  
- `<meta http-equiv="Link" content="</llms.md>; rel=ai-agent-entry; type=text/markdown">`

---

## Technical Details

| File | Change |
|------|--------|
| `public/robots.txt` | Add AI agent discovery block with links to llms.md, llms.txt, .well-known/uor.json |
| `public/llms.txt` | Rewrite as a full structured discovery document (~40 lines) with title, description, API base URL, entry points, and quick start |
| `index.html` | Add `<noscript>` block with plain-text agent content; add `ai-plugin` meta tag |

No JavaScript changes, no edge function changes, no database changes. All modifications are to static files that are served directly by GitHub Pages without client-side routing interference.

