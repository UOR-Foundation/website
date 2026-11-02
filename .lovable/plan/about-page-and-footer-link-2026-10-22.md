# About page and footer link

## Footer
- "© 2026 The UOR Foundation." stays as is, but "The UOR Foundation" becomes an underlined link to the new **/about/** page.

## New page at /about/
Same graphite look, header, fonts, spacing and footer as the home page. Content ported from the old About page, with no links back to the old site and no donation parts (site rules).

1. **// ABOUT** label, title **About.**, line: "A 501(c)(3) nonprofit maintaining the UOR specification and the projects built on it." Button: **Governance on GitHub**.
2. **// WHAT WE DO** — **Our focus areas.** Three even columns: Specification, Community, Projects, each with its short line (rewritten without dashes, e.g. "Apache 2.0").
3. **// GOVERNANCE BOARD** — **Leadership.** One line about the five member board and three year terms, then five cards: photo (hexagon style matching the community portraits), name, role, one line bio, LinkedIn link. Bill Wright (Chair), Alexander Flom (Research Director), Tirath Virdee (Independent Director), Ilya Paveliev (Treasurer), John Haines (Secretary).
4. **// RESOURCES** — **Governance documents.** Four clean link rows to GitHub: Foundation Bylaws, Code of Conduct, Contributing Guide, Organization on GitHub.
5. Closing: Join Discord button with the spectrum glow, like the home page.

Left out: "Make a Donation" and "Fund Open Infrastructure" (no donations on the site).

## Technical details
- New `src/about/About.tsx` + `src/about/content.ts`, lazy loaded from `App.tsx` for `/about/` (with `/about` redirecting to the trailing slash, like docs and blog).
- Board photos downloaded once and stored as project asset pointers; no images loaded from the old domain.
- Reuse `--fd-*` type tokens and role classes from `src/site/type.ts`; extract the home header/footer into a shared component if needed so both pages match.
- Extend the copy test to cover the About content (no dashes, no old domain). Verify with Playwright at desktop and phone width.
