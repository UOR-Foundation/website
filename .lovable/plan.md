

# Deploy to GitHub Pages from UOR-Foundation/website

## Overview

The project is already syncing to `UOR-Foundation/website`. To serve it via GitHub Pages with your custom domain `uor.foundation`, we need three changes:

1. A GitHub Actions workflow to build and deploy
2. A SPA routing fix (GitHub Pages doesn't support client-side routing natively)
3. A CNAME file for the custom domain

---

## What Needs to Change

### 1. Add GitHub Actions Workflow

Create `.github/workflows/deploy.yml` that:
- Triggers on pushes to the `main` branch
- Installs dependencies, runs `npm run build`
- Deploys the `dist/` folder to GitHub Pages

### 2. Fix Client-Side Routing

This app uses React Router with `BrowserRouter`, which means routes like `/about` or `/research` will return a **404** on GitHub Pages when accessed directly or refreshed. Two fixes are needed:

- **Add `public/404.html`**: A small redirect script that converts the path into a query parameter and redirects to `index.html`. This is the standard GitHub Pages SPA workaround.
- **Add a redirect script in `index.html`**: A small `<script>` block that reads the query parameter and restores the original URL using `history.replaceState`.

### 3. Add CNAME File

Create `public/CNAME` containing `uor.foundation` so GitHub Pages knows to serve the site on your custom domain.

---

## DNS Configuration (on your domain registrar)

Once the site is deployed, configure DNS for `uor.foundation`:

| Type  | Name | Value                          |
|-------|------|--------------------------------|
| A     | @    | 185.199.108.153                |
| A     | @    | 185.199.109.153                |
| A     | @    | 185.199.110.153                |
| A     | @    | 185.199.111.153                |
| CNAME | www  | uor-foundation.github.io      |

These are GitHub's official IPs (not Lovable's). Then in the repo: **Settings -> Pages -> Custom domain** -> enter `uor.foundation`.

---

## Technical Details

### Files to Create

**`.github/workflows/deploy.yml`**
- Uses `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`
- Runs `npm ci` and `npm run build`
- Uploads `dist/` as the pages artifact

**`public/CNAME`**
- Single line: `uor.foundation`
- Vite copies everything in `public/` to `dist/` at build time, so this ends up in the right place

**`public/404.html`**
- A lightweight HTML page with a script that encodes the current path as a query parameter and redirects to the root (`/`)
- This is the widely-used [spa-github-pages](https://github.com/rafgraph/spa-github-pages) technique

### Files to Modify

**`index.html`**
- Add a small inline `<script>` in the `<head>` that checks for the redirect query parameter from `404.html` and restores the original URL via `history.replaceState`

### No changes needed to:
- `vite.config.ts` (no `base` path needed since we're using a custom domain, not a subpath like `github.io/website`)
- `App.tsx` (BrowserRouter stays as-is; the 404.html workaround handles routing)

---

## Deployment Flow

1. Code changes are made here in Lovable
2. Lovable auto-pushes to `UOR-Foundation/website` on GitHub
3. GitHub Actions builds the Vite project
4. Built files deploy to GitHub Pages
5. Site is live at `uor.foundation`

---

## Summary of Changes

| Action | File | Purpose |
|--------|------|---------|
| Create | `.github/workflows/deploy.yml` | Automated build and deploy |
| Create | `public/CNAME` | Custom domain for GitHub Pages |
| Create | `public/404.html` | SPA routing fix for direct URL access |
| Modify | `index.html` | Add redirect script for SPA routing |

