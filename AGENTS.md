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
* Docs rules live in src/docs/AGENTS.md.
* The Ask Prism header avatar imports the homepage UOR SVG, with scoped transparent contain styling so both placements share artwork without cropping.
* The blog lives at /blog/ and renders from src/blog/posts.data.ts; the same Vite plugin emits per post .md, blog/llms.txt and blog/rss.xml so readers and agents share one source.
* Headings, card titles and body copy take their size from the shared --fd-* type tokens in src/index.css, applied through the role classes in src/site/type.ts, so a heading stays the same size in every layout without repeating pixel values.
* The framework explainer lives at /framework/ and renders from src/framework/content.ts; the same Vite plugin emits framework.md and adds it to llms files so readers and agents share one source.
* The agent Discord page and Markdown twin share src/agent/discord.ts and the existing Vite generation plugin, preserving identical instructions without a second publishing mechanism.

* The site deploys to https://uor.foundation from GitHub Pages built by .github/workflows/deploy.yml in UOR-Foundation/website (push to main); it is not hosted on Lovable in production. The canonical origin is ORIGIN in src/agent/site.ts; every build emits route index.html files and a 404.html fallback via scripts/emit-pages.mjs, so a new route must have a Markdown twin or an entry there or its deep links fall through to the SPA fallback.
