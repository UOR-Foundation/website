

## Align Blog Posts with Homepage Style + Normalize `/blog/*` URLs

Two coordinated changes: (1) restyle the article shell so titles, kickers, and section headers feel like they came from the homepage, and (2) move every blog page under `uor.foundation/blog/`.

### Part 1 — Make blog posts feel like the homepage

The homepage's signature treatment is unmistakable:
- **Section eyebrows** in `font-body`, `font-semibold`, **uppercase**, `tracking-[0.2em]`, primary-tinted (`text-primary/70`).
- **Display headlines** in `font-display`, **uppercase**, with wide letter-spacing (`tracking-[0.05em]–[0.06em]`) and the heroic "MAKE DATA IDENTITY / UNIVERSAL" feel.
- **Prime-rule dividers** (`.rule-prime`) flanking each section.
- **Lead paragraphs** at `text-fluid-lead` with relaxed `leading-[1.75]–[1.85]`.
- Color story: deep midnight bg, gold-amber accents, soft `foreground/70` body text.

Right now the article shell uses sentence-case h1 with tight tracking and a generic kicker — it reads like a different publication. I'll align it.

**Changes to `src/modules/core/components/ArticleLayout.tsx`:**
- **Kicker (eyebrow):** swap to homepage-style — `font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-[12.5px] xl:text-[13.5px]`. Drop the dimmer `foreground/80` look.
- **Headline:** match homepage display treatment — `font-display font-bold uppercase tracking-[0.05em] leading-[1.08]`, fluid `clamp(1.9rem, 2.7vw, 3.6rem)`. Keep the compact hero height we just set.
- **Byline divider:** add a thin `.rule-prime` segment above the author line so the hero closes the same way homepage sections do.
- **Deck (standfirst):** lift to `text-fluid-lead`, `text-foreground/70`, `leading-[1.75]`, with a subtle bottom margin separator.
- **Related strip header:** restyle "Read next" to match homepage eyebrows (`text-primary/70 tracking-[0.2em]`), and bracket the related section with `.rule-prime` top/bottom for homepage rhythm.
- **Source line:** keep, but use the same eyebrow style for the "Source:" label.

**Changes to `src/index.css` (`.prose-article` block):**
- **`h2`**: switch to homepage section-heading vibe — `font-display`, `font-bold`, `uppercase`, `tracking-[0.04em]`, fluid sizes already in place. Add a short gold underline (1px × 40px, `hsl(var(--primary)/0.6)`) below each `h2` instead of the current top-border, mirroring how homepage section titles sit above content.
- **`h3`**: `font-display`, weight 700, sentence case, slightly tighter tracking.
- **First-of-type paragraph (lead)**: keep current sizes; bump weight to 500 and color to `foreground/85` so it reads like an IntroSection lead.
- **Blockquote**: add a subtle gold left rule (`border-l-2 border-primary/50`) to echo the homepage's amber accents.
- **Section spacing**: nudge `section + section` to feel closer to the homepage's `py-golden-md` rhythm.

Result: hero kicker, headline, body lead, section headings, and dividers all visually echo the IntroSection/HeroSection pattern — one publication, one voice.

### Part 2 — Consolidate blog URLs under `/blog/*`

Today three posts live at `/blog/*` but **one post is at `/universal-data-passport`** (the Canonical Rust Crate / Universal Data Passport post). I'll move it under `/blog/`.

**Changes to `src/App.tsx`:**
- Add new canonical route: `/blog/universal-data-passport` → `BlogCanonicalRustCrate`.
- Convert existing `/universal-data-passport` to a `<Navigate>` redirect to `/blog/universal-data-passport` (preserves any inbound links / shares).
- Existing `/blog/canonical-rust-crate` redirect now points to `/blog/universal-data-passport` (already does).

**Changes to `src/data/route-table.ts`:**
- Replace any `/universal-data-passport` entry with `/blog/universal-data-passport`.

**Changes to internal references:**
- Search & update any `Link to="/universal-data-passport"` (e.g. ResearchPage, blog cards, related lists) to point at `/blog/universal-data-passport`.

**Final `/blog/*` URL set (all under `uor.foundation/blog/`):**
```
/blog/building-the-internets-knowledge-graph
/blog/universal-mathematical-language
/blog/uor-framework-launch
/blog/universal-data-passport
```

### Files to change
1. `src/modules/core/components/ArticleLayout.tsx` — restyle kicker, headline, deck, divider, related-strip header.
2. `src/index.css` — update `.prose-article` h2/h3, blockquote, lead paragraph, section spacing.
3. `src/App.tsx` — add `/blog/universal-data-passport`, redirect old slug.
4. `src/data/route-table.ts` — update entry.
5. Any component still linking to `/universal-data-passport` — repoint to `/blog/universal-data-passport`.

### Verification
Snapshot one blog post at 1920×1080 and 390×844 after changes, confirm the hero kicker, headline, and section H2s visually match homepage IntroSection/HeroSection treatments, and confirm `/universal-data-passport` redirects correctly.

