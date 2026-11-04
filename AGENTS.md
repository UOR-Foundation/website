# Presentation rules

* Foundation logos use static CDN asset pointers and scoped monochrome CSS, keeping supplied artwork with white logos legible on the graphite surface.
* Homepage spacing uses shared --fd-space-* tokens with breakpoint rules scoped to fd-home, one rhythm for mobile and desktop, tools and generated docs untouched.

# Architecture

* Lovable asset pointers keep a committed sibling file; a Vite plugin bundles that file instead of the CDN path, because GitHub Pages at uor.foundation cannot serve Lovable CDN URLs.
* The Pages deploy packs its own artifact tar so CNAME and /.well-known/ survive; upload-pages-artifact drops dot-paths.
* Every code block in the prism-sdk skill comes from EXAMPLES in src/agent/skill.ts and is run as written by src/test/skill-examples.test.ts against the pinned prism-code; deploy runs the tests first and checks the live digest afterwards, so the skill cannot ship an example that fails or a digest that does not match.

* App.tsx selects the static homepage or lazy loaded /playground/ without a router or backend, keeping editor dependencies off the homepage.
* Playground uses upstream Monaco, WebContainers and xterm in one shared runtime; examples use the published prism-code API, never invented Rust bindings.
* A service worker scoped only to /playground/ supplies credentialless cross origin isolation on static hosting; embedded previews offer a top level tab because parent isolation cannot be changed by the app.
* Playground projects persist locally and share through validated compressed URL fragments, avoiding server storage and excluding generated dependencies from exports.
* Docs live at /docs/ and render from src/docs/content.ts, whose page text is src/docs/prism.generated.ts written only by scripts/sync-prism-docs.mjs from the PrismPM docs-site branch (GitHub Action every 6 hours; sections appear only when upstream ships them), so the site never drifts through manual copies; a Vite plugin serves and emits llms.txt, llms-full.txt and per page .md files from the same source so humans and agents never diverge.
* The DocsGPT assistant loads on Docs pages only when src/docsgpt.ts has an API host and agent key; the ask box and Ask AI button drive the widget, and .dc-dgpt hides its launcher so no duplicate button shows.
* The Ask Prism header avatar imports the homepage UOR SVG, with scoped transparent contain styling so both placements share artwork without cropping.
* The blog lives at /blog/ and renders from src/blog/posts.data.ts; the same Vite plugin emits per post .md, blog/llms.txt and blog/rss.xml so readers and agents share one source.
* Headings, card titles and body copy take their size from the shared --fd-* type tokens in src/index.css, applied through the role classes in src/site/type.ts, so a heading stays the same size in every layout without repeating pixel values.
* The framework explainer lives at /framework/ and renders from src/framework/content.ts; the same Vite plugin emits framework.md and adds it to llms files so readers and agents share one source.
* The agent Discord page and Markdown twin share src/agent/discord.ts and the existing Vite generation plugin, preserving identical instructions without a second publishing mechanism.
* Docs use Docker's four sections (Get started, Guides, Manuals, Reference); upstream maps concepts to Manuals, examples and migration to Guides, sdks to Reference. Reference is a plain lookup by kind with no task groups or milestone entries and a five step golden path; roadmap features without pages show only as dimmed nav entries, never fake pages. The sync pulls get-started, guides, api, reference, sdks, concepts, examples and migration, falling back to docs/vocabulary.md on main when the docs-site branch lacks it.
* Visible docs copy is reworded from upstream prose by siteTerms and implicitTerms in src/docs/vocabulary.ts, which never name Docker and call the artifact an app, while leaving code spans, file names, slugs and schema paths untouched, so readable text and real identifiers never have to agree.
* Get started opens with an Overview group (Why Prism, How it works, What you can build), then the step pages; both come from the single OVERVIEW and STEPS sources in src/docs/content.ts, using only upstream API examples and no commands for unshipped steps, so the home cards, pages, Markdown twins and llms.txt never disagree.
* Docs search is a zero cost Pagefind full text index built from the same docs source in vite.config.ts (memory served at /pagefind/ in dev, static assets in the build); the palette merges Pagefind hits with instant title matches, so no search service or account exists anywhere.
* The Docs home page uses the dc-home-fit flex column in src/index.css with viewport-height clamps for padding, gaps, card heights and step text, so the ask box, five steps and roadmap always fit the first screen; a new section there must fit the same budget, not extend the page.

* PrismPM feature requests sync every 6 hours via scripts/sync-prism-requests.mjs into src/docs/requests.generated.ts and publish as /docs/requests.md and .json, so agents dedupe, vote and see shipped requests without a backend.
* The site deploys to https://uor.foundation from GitHub Pages built by .github/workflows/deploy.yml in UOR-Foundation/website (push to main); it is not hosted on Lovable in production. The canonical origin is ORIGIN in src/agent/site.ts; every build emits route index.html files and a 404.html fallback via scripts/emit-pages.mjs, so a new route must have a Markdown twin or an entry there or its deep links fall through to the SPA fallback.
