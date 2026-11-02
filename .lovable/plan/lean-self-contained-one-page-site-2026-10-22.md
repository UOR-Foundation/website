# Lean, self contained one page site

Keep only the graphite home page. Everything else from the old website goes: pages, tools, APIs, backend, and every mention of uor.foundation.

## What the visitor sees

- One page at `/`. Any other address shows the home page too.
- The header, hero, stats, About section, Prism SDK section, community section and footer all stay as they are now.
- Changes on the page:
  - **Top banner:** the "Read the docs" link and the Prism SDK "Read the docs" button now open the Prism GitHub repository, because the `/prism` page is gone.
  - **Prism SDK card:** links to the same GitHub repository.
  - **Highlights (news cards):** removed, because the news and blog pages are gone.
  - **Footer:** reads "© 2026 The UOR Foundation." as plain text with no link, because the About page is gone.
- Discord and GitHub links stay. They are outside services, not the old website.

## What gets removed

- All other pages: Prism, About, News and blog, Framework, Projects, Donate, Download, Oracle, OS desktop, Messenger, Library, App Store, Compliance, Resolve, UNS, Semantic Web, and every project page.
- All tool and engine code: about 50 old modules (atlas, oracle, desktop, quantum, knowledge graph, SDK, bus, boot and so on), plus any shared hooks, data, components and assets that only those modules use.
- Backend: sign in, Privy wallet, saved data, and all server functions. The backend link is removed from the code.
- Every `uor.foundation` reference in code, page tags (`index.html`), `public/` files (sitemaps, llms.txt, AI beacons, manifests) and data files.
- Packages that nothing uses any more.

## Technical details

- `App.tsx` gets a single route to `FoundationHome` with a catch-all, and no Auth, Privy, Query or Tooltip providers, bus boot, or lazy routes.
- Keep: `src/modules/landing/foundation/{FoundationHome,BrandIcons,content}`, `src/data/external-links.ts` (cut down to Discord, GitHub org, Prism repo), the `index.css` foundation tokens, the assets the home page uses (uor-icon.svg, foundation-hero.jpg, aaif/nanda/contributors asset pointers), and the shadcn base only if it is still imported.
- Delete: every other module under `src/modules`, `src/pages`, unused `src/components`, `src/hooks`, `src/lib`, `src/data` and `src/assets`, `supabase/functions/*`, unused tests. Remove `PROJECTS`, `RIBBON.link` to `/prism`, and the news imports from the home page.
- Backend client files under `src/integrations/supabase` are generated automatically. They stay on disk, but nothing will import them.
- Drop unused dependencies with `bun remove`. Before removing each package, check with `rg` that nothing still imports it.
- `index.html`: set a lean title, description and og tags with no uor.foundation URLs. Remove canonical and alternate links to the old domain.
- Update `src/test/prism-copy.test.ts` so it covers only the foundation content. Run it, confirm the build log shows the build is OK, and take a Playwright screenshot of `/`.
- Update the AGENTS.md rule: the site is a single static page with no backend.
- Update memory: the old architecture memories (OS, Oracle, kernel and so on) no longer apply. Replace them with one Core rule saying the site is a lean single home page with no backend and no uor.foundation references.
