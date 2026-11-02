# UOR Foundation

The UOR Foundation website: a lean, fast site for the UOR framework and the Prism SDK, built with React, Vite and Tailwind.

## Develop

```
bun install
bun run dev
```

## Deploy

The site deploys to GitHub Pages at https://uor.foundation from the `main` branch:

- Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes `dist/` to Pages.
- Every 6 hours, `.github/workflows/sync-prism-docs.yml` pulls the Prism SDK docs from the PrismPM docs-site branch and redeploys when they changed.
- Deep links work everywhere: the build emits a real `index.html` for every route plus a `404.html` fallback (`scripts/emit-pages.mjs`).

## Agent entry points

Machines and agents should start at `/llms.txt`, `/agents.md` and `/sitemap.xml`. Every page has a Markdown twin next to it.
