# Mobile polish: clean, fast, delightful

Make every page (Home, UOR Framework, About, Blog, Docs) feel native on phones while keeping the desktop look untouched.

## Audit first
- Capture every page at 375, 390 and 430 px wide (and a tablet at 768) to list real problems: wrapping headings, crowded rows, tap targets, overflow, spacing.

## What changes
1. **Menu on phone**: today the menu links simply disappear below tablet width. Add a sleek menu button that opens a full screen graphite sheet with the three items, GitHub and Discord, large tap targets, staggered fade in, closes on tap or swipe. Shared by all pages.
2. **Header**: slightly shorter on phone, logo and name sized to fit one row, spectrum line kept.
3. **Hero**: tighter top spacing, headline balanced over even lines, the "For humans / For agents" switch and install pill fit the screen width without clipping (long command scrolls or wraps cleanly).
4. **Stats**: two by two grid with hairline dividers instead of a tall single column.
5. **Sections**: smaller vertical spacing on phone (consistent rhythm), headings even out (fix "Agentic development…" one word per line), buttons full width and stacked where side by side gets cramped.
6. **Highlights cards**: swipeable horizontal row with snap and a peek of the next card, instead of a long stack.
7. **Contributors**: tidy three across grid sized for thumbs.
8. **Footer wordmark**: scales to the screen width with the prime point line intact.
9. **Inner pages**: same treatment for UOR Framework, About cards, Blog list and posts, and Docs side menu as a slide in drawer.
10. **Magic touches**: press feedback on every tap (subtle scale), smooth anchor jumps that land below the header, safe area spacing for notched phones, no tap flash, all motion respects reduced motion settings.

## Speed
- Load images lazily with fixed sizes so nothing jumps while loading; preload the hero font; keep the home page free of heavy code (Docs, Playground stay separate).
- Check with a Lighthouse mobile run before and after, target 90+ performance.

## Check
- Screenshots of every page at phone widths after the change, no sideways scrolling anywhere, wording check still passes.

## Technical details
- Mobile menu as a new shared component used by `FoundationHome` and `SiteHeader`; scroll lock while open.
- Responsive tweaks via Tailwind breakpoints and the shared `--fd-*` type tokens in `src/index.css` (phone values), no new colors.
- Cards carousel with CSS scroll snap, no new library.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` padding; `-webkit-tap-highlight-color: transparent`.
