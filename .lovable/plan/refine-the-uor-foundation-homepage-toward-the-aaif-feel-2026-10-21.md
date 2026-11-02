# Refine the UOR Foundation homepage toward the AAIF feel

The homepage already uses an AAIF inspired base (dark navy, electric blue). This pass makes it closer to AAIF's sharp, focused, delightful finish without adding content.

## What changes

1. **Study pass**: capture aaif.io screenshots (desktop and mobile) and note exact spacing rhythm, type scale, section structure, card treatment and motion.
2. **Header**: slimmer, more air, crisp hairline under it on scroll; UOR mark, menu (UOR Framework, Prism SDK, Ecosystem), GitHub and Discord icons stay.
3. **Hero**: one large, tight headline, one short line, two buttons; prism image kept, softened so the headline leads. Stats move into a quiet single row of hairline divided numbers.
4. **Sections**: every section uses the same pattern: small label, headline, one line, content. Generous, consistent vertical spacing; hairline borders instead of filled panels.
5. **Cards** (Prism quick start, news): flat, thin border, subtle lift and accent border on hover, image zoom on news covers.
6. **Delight**: gentle fade up as sections enter view, respecting reduced motion settings. No new text or elements.
7. **Footer**: compact, quiet, aligned to the same grid.
8. **Check**: screenshot desktop and mobile side by side with AAIF, confirm no dashes in visible text, all menu links still jump correctly.

## Technical details

- Edits limited to `src/modules/landing/foundation/FoundationHome.tsx`, `foundation/content.ts` (copy unchanged unless trimming), and theme tokens in `src/index.css`.
- Motion via IntersectionObserver plus CSS transitions; no new libraries.
- Existing no dash copy test must keep passing.
