

## Wikipedia-Style Article Layout for Knowledge Cards

### What We're Building

Transforming the KnowledgeCard content view from the current "accent-bordered markdown blob" into a Wikipedia-style article layout — with a two-column design featuring an infobox sidebar, a table of contents, properly styled section headers, and familiar typographic conventions.

### Current State

Right now, when you search "dog" in Oracle:
- The AI synthesis returns ~500-700 words of markdown with `##` headers
- `HumanContentView` renders it inside a single left-bordered `<ReactMarkdown>` block
- Wikipedia data (thumbnail, description, taxonomy) is shown as small cards above the content
- No table of contents, no sidebar infobox, no Wikipedia-style visual structure

### Design

The layout mirrors Wikipedia's two-column approach:

```text
┌─────────────────────────────────────────────────┐
│  Dog                                            │
│  Domesticated species of canid (italic desc)    │
├─────────────────────────────────────────────────┤
│                                                 │
│  From UOR Knowledge, the universal encyclopedia │
│                                                 │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │ Contents        │  │   Dog                │  │
│  │ 1 Taxonomy      │  │   ┌──────────────┐   │  │
│  │ 2 Anatomy       │  │   │  [thumbnail] │   │  │
│  │ 3 Behavior      │  │   └──────────────┘   │  │
│  │ 4 History        │  │  Scientific class.  │  │
│  │ 5 Significance  │  │  Kingdom: Animalia   │  │
│  └─────────────────┘  │  Phylum: Chordata    │  │
│                        │  ...                 │  │
│  The dog (Canis        │  Wikidata: Q144      │  │
│  familiaris) is a      └──────────────────────┘  │
│  domesticated...                                 │
│                                                 │
│  ## Taxonomy                                    │
│  ─────────────                                  │
│  Dogs are domesticated members...               │
│                                                 │
│  ## Anatomy and Physiology                      │
│  ─────────────────────────                      │
│  ...                                            │
│                                                 │
│  ── Sources ──                                  │
│  [wikipedia] [wikidata]                         │
└─────────────────────────────────────────────────┘
```

### Technical Approach

#### 1. Update AI prompt to generate Wikipedia-style sections (edge function)

Change the system prompt in `uor-knowledge/index.ts` to produce richer, more Wikipedia-like content:
- Request 8-12 sections with `##` headers (matching Wikipedia's section depth)
- Increase `max_tokens` to 2400 (Wikipedia articles are substantial)
- Instruct the model to write an encyclopedic opening paragraph (no header), followed by structured sections like Taxonomy, Description, History, Behavior, Significance, etc.
- Bold the subject name on first mention (Wikipedia convention)

#### 2. Create a new `WikiArticleView` component

New file: `src/modules/oracle/components/WikiArticleView.tsx`

This replaces the current KnowledgeCard rendering branch in `HumanContentView`. Key elements:

- **Infobox sidebar** (right-floated, ~280px): thumbnail image, scientific classification/taxonomy table, quick facts (Wikidata QID link, description). Styled with a light border, slightly tinted background — exactly like Wikipedia's infobox.
- **Table of Contents**: Parses `##` headers from the markdown, generates a clickable TOC box with numbered entries. Clicking scrolls to the section. Collapsible.
- **Section rendering**: Each `##` becomes a full-width heading with a bottom border (Wikipedia's characteristic thin line under section headers). Body text uses serif font (Georgia), 16-17px, generous line height.
- **"From UOR Knowledge"** tagline under the title (mirrors "From Wikipedia, the free encyclopedia").
- **Opening paragraph** rendered without a header, in slightly larger text.

#### 3. Update `HumanContentView` to delegate to `WikiArticleView`

In the `isKnowledgeCard && contentMarkdown` branch (lines 329-380), replace the current bordered markdown rendering with `<WikiArticleView>`. Pass it:
- `contentMarkdown` (the AI synthesis)
- `wikidata` (thumbnail, taxonomy, description, QID)
- `title` (the label)
- `sources` array

#### 4. Style details (matching Wikipedia)

- Section headers: `font-size: 1.35rem`, `font-weight: 600`, `border-bottom: 1px solid hsl(var(--border) / 0.3)`, `padding-bottom: 4px`, `margin-top: 1.5rem`
- Body paragraphs: Georgia serif, 16px, `line-height: 1.8`, `color: foreground/85`
- Infobox: `float: right` on desktop, `width: 280px`, `margin-left: 1.5rem`, `border: 1px solid border/20`, `border-radius: 8px`, stacks full-width on mobile
- TOC box: bordered container, numbered list, `font-size: 14px`, monospace numbering
- Remove the gold accent `borderLeft` — Wikipedia doesn't use it

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/uor-knowledge/index.ts` | Richer prompt, more sections, higher token limit |
| `src/modules/oracle/components/WikiArticleView.tsx` | **New** — Wikipedia-style renderer with infobox, TOC, sections |
| `src/modules/oracle/components/HumanContentView.tsx` | Delegate KnowledgeCard rendering to `WikiArticleView` |

