

## Render Encoded Web Pages at Original Fidelity

### Problem

The current Human view renders scraped content as **markdown via ReactMarkdown**, which strips all CSS, layout, images, and visual structure. The screenshots show raw `<br>` tags leaking into the rendered output and no visual resemblance to the original Wikipedia page.

### Approach: Shadow DOM + Sanitized rawHtml

The best solution avoids iframes entirely by rendering the **rawHtml** (already returned by Firecrawl) inside a **Shadow DOM** container. Shadow DOM provides complete CSS isolation — the page's original styles apply inside the shadow root without leaking into or being affected by the app's Tailwind styles.

No new backend or API is needed. Firecrawl already returns `rawHtml` with full CSS — we just need to store it and render it properly.

### Technical Design

```text
Firecrawl rawHtml → sanitize (strip scripts, event handlers)
                   → inject into Shadow DOM container
                   → original CSS renders inside isolated boundary
                   → user sees page as-is, no iframe needed
```

### Plan

#### 1. Store rawHtml in the source object (`ResolvePage.tsx`)

Currently `rawHtml` is fetched but discarded after semantic extraction. Add `"uor:rawHtml"` to the **volatile metadata** (not the canonical object — rawHtml changes with every scrape and should not affect the address). Also add it to the `LABEL_MAP` with empty string so it doesn't render as a generic entry.

#### 2. Create a `ShadowHtmlRenderer` component

New file: `src/modules/oracle/components/ShadowHtmlRenderer.tsx`

- Takes `html: string` and an optional `baseUrl: string`
- On mount, creates a shadow root (`attachShadow({ mode: 'open' })`) on a div ref
- Sanitizes the HTML: strips `<script>` tags, `on*` event attributes, and `javascript:` URLs
- Injects a `<base href="...">` tag so relative URLs (images, CSS) resolve correctly against the original domain
- Sets `innerHTML` on the shadow root
- Applies a max-height with scroll, and a subtle border to frame it

This gives pixel-perfect rendering of the original page's styles, images, and layout — completely isolated from the app's CSS.

#### 3. Add a Human/Original toggle in `HumanContentView.tsx`

For `WebPage` types, replace the current markdown renderer with a **two-mode toggle**:

- **"Original"** (default for WebPage): renders via `ShadowHtmlRenderer` using `uor:rawHtml`
- **"Readable"**: falls back to the current `ReactMarkdown` renderer for clean reading

This is a small pill toggle above the content area. When rawHtml is not available (e.g., older cached results), it falls back to markdown automatically.

#### 4. Exclude `uor:rawHtml` from generic body entries

Add `"uor:rawHtml"` to the filter list alongside `"uor:semanticWebLayers"` and `"uor:wikidata"` so it doesn't render as a raw text dump in the body entries.

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/components/ShadowHtmlRenderer.tsx` | New — Shadow DOM renderer with sanitization and base URL injection |
| `src/modules/oracle/pages/ResolvePage.tsx` | Store `rawHtml` in volatile metadata (`sourceObj["uor:rawHtml"]`) |
| `src/modules/oracle/components/HumanContentView.tsx` | Add Original/Readable toggle for WebPage; render ShadowHtmlRenderer when rawHtml available; hide `uor:rawHtml` from body entries |

### Why Shadow DOM over alternatives

- **iframe with srcdoc**: Works but has scrolling/sizing issues, accessibility problems, and the user explicitly wants to avoid iframes
- **dangerouslySetInnerHTML**: No CSS isolation — page styles would bleed into the app
- **Shadow DOM**: Perfect CSS boundary, no iframe overhead, native browser API, script-safe with sanitization
- **Firecrawl vs alternatives**: Firecrawl already returns the full rawHtml with inline styles — no tool change needed. The `screenshot` format could supplement as a fallback preview image but Shadow DOM rendering is superior for interactivity

