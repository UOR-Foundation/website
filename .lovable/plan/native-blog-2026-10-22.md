# Native Blog

A clean, self contained blog at `/blog/`, built the same way as the docs: one source feeds both the pages people read and the plain text files agents read.

## Posts ported (all 9)

1. Same Data, Different Bytes: Integrity Checks That Survive Reserialization (Oct 21, 2026)
2. Agents don't need more pages. They need objects they can trust. (Aug 10, 2026)
3. The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit (May 6, 2026)
4. uor-foundation v0.3.1 is live on crates.io (May 5, 2026)
5. A Universal Data Fingerprint for Your AI Agent (Apr 21, 2026)
6. What If Every Piece of Data Had One Permanent Address? (Feb 19, 2026)
7. Unveiling a Universal Mathematical Language (Oct 10, 2025)
8. UOR: Building the Internet's Knowledge Graph (Dec 21, 2023)
9. The UOR Framework: Everything Is an Object (Jul 13, 2022)

Full article text, headings, quotes, code and images are copied over. Cover and inline images are re-hosted on this site. Any links back to the old website are removed. Visible dashes are rewritten to fit the site's wording rule (e.g. "Re-Serialization" becomes "Reserialization"), keeping the existing exceptions.

## What people see

- **Blog index** `/blog/`: `// BLOG` eyebrow, large "Writing." title, category filter chips (All, Open Research, Field Notes, Engineering, Standards, Vision, Origin), newest first. First post is a wide featured card; the rest sit in a clean three column grid with cover, category, title, date.
- **Post page** `/blog/<slug>/`: back link, category and date, large title, cover image, comfortable reading column (about 68 characters wide), sticky "On this page" on wide screens, reading time, Copy page and Markdown buttons, and Previous / Next posts at the end.
- **Navigation**: "Blog" added to the top menu; the three Highlights cards on the home page become links to their posts, plus a quiet "All posts" link.
- Graphite look, same fonts, spacing and section title style as the rest of the site. Phone layout checked.

## What agents get

- Every post also at `/blog/<slug>.md` (plain markdown with title, date, category, summary up front).
- `/blog/llms.txt` index, and blog posts added to the site's `/llms.txt` and `/llms-full.txt`.
- `/blog/rss.xml` feed, page titles, descriptions and article metadata for search and sharing.

## Technical details

- `src/blog/posts.ts`: typed array (slug, title, category, date, summary, cover, body as markdown blocks), single source of truth.
- `src/blog/Blog.tsx` lazy loaded from App.tsx for `/blog/` paths (no router added, matching docs/playground pattern); trailing slash redirect.
- Extend the existing Vite docs plugin to emit blog `.md`, `llms.txt` entries and `rss.xml` at build and serve them in dev.
- Images fetched from the old site, uploaded via lovable-assets, referenced by pointer.
- Update `POSTS` in content.ts with slugs; update copy test to cover posts.ts; add a test that every post has a unique slug and a matching `.md` output.
- Record the blog structure rule in AGENTS.md and widen the scope line in memory to include the blog.

## Verification

Open index, a post, filters, `.md` and `llms.txt` in the browser at desktop and phone widths; run the wording and blog tests; confirm clean build.
