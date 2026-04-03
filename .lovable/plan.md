

# Make the Website Instantly Discoverable by AI Agents

## What already exists

The site has excellent machine-readable infrastructure: `robots.txt` with per-bot directives, `llms.txt`, `llms.md`, `llms-full.md`, `.well-known/ai-plugin.json`, `.well-known/uor.json`, `<meta>` and `<link>` tags in `index.html`, a `<noscript>` block with full semantic HTML, and an HTML comment block in `<body>`. The `UorMetadata` component injects a JSON-LD module graph into every page.

## What's missing

1. **No crawlable semantic content on the rendered homepage.** The SPA renders only visual UI. Agents that browse the live page (ChatGPT with browsing, Perplexity, Grok) see the React-rendered DOM, not the `<noscript>` block or HTML comments. There is no visible or hidden-but-crawlable text that explains the "Why/How/What" of UOR on the rendered page.

2. **No universal beacon on every page.** `UorMetadata` injects the module graph, but not an agent-oriented entry-point description. An agent landing on `/about` or `/projects` has no crawlable pointer back to the canonical entry point.

3. **No human-abstract link to the machine layer.** The footer and navbar have no link to the specification or agent onboarding material. A subtle "Open Standard" link would serve both curious developers and agents.

## The approach: Agent Beacon

A single invisible-but-crawlable component rendered on every page via `Layout`. It outputs:

- A **visually hidden `<aside>`** (using `sr-only`) containing a concise plain-HTML summary: what UOR is, why it matters, how to use it, and the canonical entry point URL. Screen readers skip it (via `aria-hidden`), humans never see it, but every web-browsing agent and crawler reads it in the DOM.
- A **JSON-LD `EntryPoint`** action on the Organization node, pointing to `/llms.md` as the canonical agent onboarding URL, following schema.org conventions.

This is the "ingenious" part: one invisible `<aside>` that turns every page of the SPA into a self-describing document for any agent, without any visual change for humans.

Additionally, a subtle **"Open Standard"** text link in the footer gives humans a path to the spec while doubling as another crawlable anchor for agents.

---

## Technical plan

### 1. New component: `src/modules/core/components/AgentBeacon.tsx`

A render-null-visually component that outputs:

```text
<aside aria-hidden="true" class="sr-only">
  <h2>About the UOR Framework</h2>
  <p>[Why] Digital infrastructure lacks a universal coordinate system...</p>
  <p>[What] Universal Object Reference gives every digital object a single,
     permanent, content-derived address...</p>
  <p>[How] Six composable layers: Kernel, Type, Resolver, Partition,
     Observable, Certificate...</p>
  <p>Canonical entry point: https://uor.foundation/llms.md</p>
  <nav>
    <a href="/llms.md">Agent Quick Card</a>
    <a href="/llms-full.md">Full Guide</a>
    ...
  </nav>
</aside>
<script type="application/ld+json">
  { "@type": "WebSite", "potentialAction": { "@type": "EntryPoint", ... } }
</script>
```

The `<aside>` uses `aria-hidden="true"` + Tailwind `sr-only` so it is:
- Invisible to sighted users
- Skipped by screen readers (aria-hidden)
- Fully present in the DOM for crawlers and browsing agents

### 2. Edit `src/modules/core/components/Layout.tsx`

Import and render `<AgentBeacon />` inside `<main>`, alongside `{children}`. One line addition.

### 3. Edit `src/modules/core/components/Footer.tsx`

Add a subtle "Open Standard" link next to the copyright line, pointing to `/llms.md`. Styled identically to the copyright text (`text-foreground/40`, uppercase, tracked). Humans see it as a generic spec link; agents follow it to the canonical entry point.

### 4. Enhance `index.html` JSON-LD

Add an `EntryPoint` action to the existing `WebSite` node:

```json
"potentialAction": [
  { existing SearchAction... },
  {
    "@type": "ReadAction",
    "target": "https://uor.foundation/llms.md",
    "name": "Agent Onboarding",
    "description": "Canonical machine-readable entry point for AI agents and LLMs"
  }
]
```

---

**Files changed:** 4 (1 new component, 3 edits)  
**Visual impact:** Zero on existing pages. One subtle footer link added.  
**Agent impact:** Every page becomes self-describing and points to the canonical entry point.

