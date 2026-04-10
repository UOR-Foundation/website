

# Audit: Landing → Download → Install → Local Instance Journey

## Current State Assessment

I traced the full user journey and found several **gaps and broken links** that need fixing:

```text
USER JOURNEY (current state)
═══════════════════════════════════════════════════════════════
1. Landing page (/) ─── "Download for macOS/Windows/Linux" button ✓ EXISTS
2. Button links to /releases/{file} ─── ✗ NO ROUTE, NO FILES (404)
3. [user somehow installs Tauri app] ─── ✗ NO GUIDANCE
4. Tauri app boots → BootSequence ✓ WORKS
5. LocalTwinWelcome overlay ✓ WORKS (first launch only)
6. DesktopShell renders ✓ WORKS
7. Mobile → MobileShell ✓ WORKS
═══════════════════════════════════════════════════════════════
```

**Critical issues found:**

1. **Download links are dead** — `/releases/{file}` has no route in the router and no actual files in `public/`. The button looks great but goes nowhere.
2. **No install guidance page** — After downloading, users get a zip/tar.gz with zero instructions. No install page, no "Getting Started" flow.
3. **Mobile download button shows on phones** — Offering "Download for macOS" on a phone is confusing. Mobile should instead show "Try in Browser" or "Open Web App" pointing to `/os`.
4. **No `/download` or `/get` dedicated page** — Best practice is a dedicated page with system requirements, checksums, and install steps per OS.
5. **No fallback for unsupported OS** — Linux users get a generic tar.gz link with no context.

## Plan — 4 Changes

### 1. Create a dedicated Download page (`src/modules/landing/pages/DownloadPage.tsx`)

A polished, informative (not technical) page with:
- OS auto-detection highlighting the right download card
- Three cards: macOS, Windows, Linux — each with icon, file size placeholder, and one-click download button
- Brief, friendly install instructions per OS (expand/collapse):
  - **macOS**: "Open the zip, drag to Applications, double-click to launch"
  - **Windows**: "Extract the zip, run the installer, follow prompts"
  - **Linux**: "Extract, run `./uor-desktop`, or use the AppImage"
- System requirements (minimal: 4GB RAM, 500MB disk)
- SHA-256 checksum display for verification
- "Or try it in your browser" link to `/os` as fallback
- Platform-adaptive styling via `usePlatform()` (pill buttons on Mac, squared on Windows)

### 2. Update HeroSection download buttons (`src/modules/landing/components/HeroSection.tsx`)

- **Desktop**: Change download `href` from `/releases/{file}` to `/download` (the new dedicated page)
- **Mobile**: Replace "Download for {os}" with "Try It Now" linking to `/os` — installing a desktop app from a phone makes no sense

### 3. Add route for `/download` (`src/App.tsx`)

- Lazy-load `DownloadPage`
- Add `<Route path="/download" element={<DownloadPage />} />`

### 4. Add a placeholder `/releases/` static directory note

- Create `public/releases/.gitkeep` so the path exists
- Add a comment in `DownloadPage` noting that actual binaries should be placed in `public/releases/` or served from a CDN/GitHub Releases URL
- The download page buttons will link to the actual file paths (`/releases/UOR-Desktop-darwin-x64.zip` etc.) which will work once binaries are deployed

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/modules/landing/pages/DownloadPage.tsx` | Create | Dedicated download page with OS detection, install guides, system requirements |
| `src/modules/landing/components/HeroSection.tsx` | Update | Point desktop CTA to `/download`, mobile CTA to `/os` |
| `src/App.tsx` | Update | Add `/download` route |
| `public/releases/.gitkeep` | Create | Placeholder for binary hosting |

## What This Achieves

- **Zero dead links** — every button leads somewhere useful
- **Context-appropriate CTAs** — desktop users get download, mobile users get the web app
- **Delightful install guidance** — friendly, non-technical instructions per OS with expand/collapse
- **Professional presentation** — system requirements, checksums, and verification build trust
- **Seamless transition** — Download page → install → Tauri boot → LocalTwinWelcome → Desktop Shell is a complete, unbroken chain

