

## Elevate Human-Readable Content View

### The Problem
The current `renderHumanView()` function renders content as a flat list of key-value pairs with minimal visual hierarchy. Every address — whether it's a Concept, Fork, Query, or Chain — gets the same basic treatment: small uppercase labels, monospace values, bullet lists. It reads like a debug panel, not a publication.

### Design Principles (from information design research)
- **Visual hierarchy via typographic scale**: Title (24px) → Section labels (11px uppercase) → Body (16-17px serif) → Metadata (13px mono). The eye naturally flows top-down.
- **Serif for long-form text**: Definitions, descriptions, and responses use a serif font (Georgia/system serif) for readability — proven to reduce cognitive load in sustained reading.
- **Generous whitespace**: Golden-ratio spacing between sections. Padding and line-height tuned for scan-ability.
- **Content-type awareness**: The renderer detects the `@type` and applies purpose-built layouts — a Concept gets a "dictionary entry" feel, a Fork gets provenance emphasis, a Query gets a dialogue format.
- **Pull-quote treatment for definitions**: Long text blocks get a left-border accent and slightly larger font, like a well-typeset article.
- **Progressive disclosure for nested objects**: Properties render as elegant cards rather than flat indented lines.

### Implementation

**Replace `renderHumanView()` with `HumanContentView` component** — a new file `src/modules/oracle/components/HumanContentView.tsx` that:

1. **Type-aware header**: Detects `@type` and renders it as a colored category pill at the top (e.g., "CONCEPT" in gold, "FORK" in purple, "QUERY" in blue)

2. **Title extraction**: If `uor:label`, `@id`, or `uor:query` exists, render it as a prominent title in 22-24px semibold — the first thing the eye hits

3. **Definition/long-text treatment**: Any string value > 100 chars gets:
   - Serif font family (Georgia, 'Times New Roman', serif)
   - 17px size, 1.75 line-height
   - Left border accent (2px primary color)
   - Subtle left padding
   - Proper paragraph spacing

4. **Properties section**: Arrays of key-value objects render as a clean two-column grid with alternating subtle backgrounds, like a well-designed spec sheet

5. **List items**: Bullet lists get numbered pills or dot indicators with proper indentation and breathing room

6. **Nested objects**: Render inside subtle bordered cards with their own label header — not flat indented text

7. **Metadata footer**: Timestamps, chain lengths, positions render in a quiet footer strip at the bottom

8. **Consistent across all types**: The same component handles every address — the type-detection just adjusts emphasis, not layout structure

### Typographic Spec

```text
Category pill:    11px, uppercase, tracking 0.15em, mono
Title:            22px, semibold, system sans, line-height 1.3
Label (section):  11px, uppercase, tracking 0.12em, muted
Body text:        17px, serif, line-height 1.75, foreground/80
Short value:      15px, sans, foreground/70
Mono value:       13px, mono, foreground/55
List bullet:      Primary/40 dot, 16px body text
```

### Files

- **New**: `src/modules/oracle/components/HumanContentView.tsx` — the complete human-readable renderer
- **Modified**: `src/modules/oracle/pages/ResolvePage.tsx` — import `HumanContentView`, replace `renderHumanView(result.source)` call with `<HumanContentView source={result.source} />`, keep `renderHumanContent()` (plain text for copy)

