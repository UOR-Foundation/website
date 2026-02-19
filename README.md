# UOR Foundation — Website

The official website for the **Universal Object Reference (UOR) Foundation**, live at [uor.foundation](https://uor.foundation).

The UOR Foundation develops an open data standard that gives every piece of digital content a single, permanent identifier based on *what it is* — not where it's stored. The same content always resolves to the same address, across every system, forever.

---

## What's in This Repo

This repository contains the full source code for the UOR Foundation website: a single-page application built with React, TypeScript, Vite, and Tailwind CSS, deployed to GitHub Pages.

### Site Structure

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero, mission overview, framework layers, and project highlights |
| About | `/about` | Team, history, and organizational mission |
| Standard | `/standard` | The UOR specification and technical pillars |
| Research | `/research` | Publications, blog posts, and research directions |
| Projects | `/projects` | Active projects built on the UOR framework |
| Donate | `/donate` | Support the foundation |

### Source Layout

```
src/
├── assets/          # Images, logos, and static media
├── components/      # Reusable React components (Navbar, Footer, sections, animations)
│   └── ui/          # Design system primitives (buttons, cards, dialogs, etc.)
├── hooks/           # Custom React hooks
├── lib/             # Shared utilities
├── pages/           # Route-level page components
└── test/            # Test configuration and specs

public/
├── .well-known/     # UOR discovery metadata (uor.json)
├── images/          # Team profile photos and public assets
├── 404.html         # SPA routing fallback for GitHub Pages
├── CNAME            # Custom domain configuration
├── llms.txt         # Machine-readable site summary for LLMs
├── llms-full.txt    # Comprehensive LLM reference
└── robots.txt       # Search engine crawling rules
```

---

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) ≥ 18

```sh
git clone https://github.com/UOR-Foundation/website.git
cd website
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

---

## Deployment

The site deploys automatically to GitHub Pages via GitHub Actions on every push to `main`.

**Pipeline:** `npm ci` → `npm run build` → deploy `dist/` to GitHub Pages

Custom domain (`uor.foundation`) is configured via `public/CNAME` and DNS A records pointing to GitHub's servers.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 18](https://react.dev) + [TypeScript](https://typescriptlang.org) |
| Build | [Vite](https://vite.dev) |
| Styling | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Routing | [React Router v6](https://reactrouter.com) |
| Animations | [Framer Motion](https://www.framer.com/motion/) patterns + CSS |
| Hosting | [GitHub Pages](https://pages.github.com) |

---

## Machine-Readable Access

The site provides structured metadata for AI agents and semantic web tooling:

- **JSON-LD** embedded in `index.html` (Organization + Framework schema)
- **`/llms.txt`** — concise site summary for language models
- **`/llms-full.txt`** — comprehensive reference
- **`/.well-known/uor.json`** — UOR discovery metadata
- **Ontology links** — JSON-LD, Turtle, and N-Triples formats

---

## Contributing

This project is maintained by the UOR Foundation. For questions or contributions, visit [github.com/UOR-Foundation](https://github.com/UOR-Foundation) or join our [Discord](https://discord.gg/ZwuZaNyuve).

---

## License

© UOR Foundation. All rights reserved.
