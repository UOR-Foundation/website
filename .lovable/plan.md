

# Fix Build Error + Redesign Desktop Download Journey

## Step 1 — Fix the Build Error (blocking)

The previous "fix" was wrong — adding `.ts` to dynamic imports breaks Rollup. Vite resolves extensionless imports fine, but Rollup rejects explicit `.ts` extensions. The fix is to **remove** the `.ts` extension.

| File | Line | Current (broken) | Fix |
|------|------|-------------------|-----|
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | 223 | `import("@/modules/uns/build/container.ts")` | `import("@/modules/uns/build/container")` |
| `src/modules/compose/orchestrator.ts` | 501 | `import("@/modules/uns/build/container.ts")` | `import("@/modules/uns/build/container")` |

## Step 2 — Redesign Download Page with Module Transparency

The current `DownloadPage.tsx` has several problems:
- Uses Electron-style filenames (`UOR-Desktop-darwin-x64.zip`) but the app is Tauri
- No module transparency — user has no idea what gets installed
- No visual polish — looks like a generic template
- Wrapped in `Layout` (site nav) but should match the OS aesthetic since it's accessed from `/os`

**Redesign the page** to be a premium, OS-native-feeling installer preview:
- Auto-detect OS and show the primary download prominently (Windows first per your request)
- Show a **Module Inventory** checklist: UOR Kernel, Knowledge Graph (SQLite), Sovereign Vault, Content Bus, Identity System, Oracle (Cloud API), with Local LLM marked as "Coming Soon"
- Correct Tauri artifact filenames: `.msi`/`.exe` for Windows, `.dmg` for macOS, `.AppImage`/`.deb` for Linux
- Point download URLs to GitHub Releases pattern
- Remove the `Layout` wrapper — use a standalone dark page matching OS aesthetic
- Add smooth animations and a professional feel

## Step 3 — Improve Download CTA in OS Shell

The existing CTA in `DesktopWidgets.tsx` (line 412-431) is a small, subtle link. Upgrade it to be more prominent and contextual — a floating banner or card that appears when the user has been using the browser OS for a meaningful session, nudging them toward the sovereign local version.

## Step 4 — Create ModuleChecklist Component

A reusable component showing what gets installed, used on both the download page and in the first-launch `LocalTwinWelcome` overlay:

```text
✓ UOR Kernel          Ring R₈ computation engine
✓ Knowledge Graph     Local SQLite + GrafeoDB
✓ Sovereign Vault     Encrypted local storage
✓ Content Bus         Event orchestration layer
✓ Identity System     Content-addressed naming
✓ Oracle (Cloud)      AI via cloud API
○ Local LLM           Coming soon (Ollama)
```

## Step 5 — Enhance First-Launch Welcome

Upgrade `LocalTwinWelcome.tsx` to include the module checklist with animated verification steps during first boot, showing each module initializing in sequence.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/modules/desktop/components/ContainerBootOverlay.tsx` | Fix import (remove `.ts`) |
| `src/modules/compose/orchestrator.ts` | Fix import (remove `.ts`) |
| `src/modules/landing/pages/DownloadPage.tsx` | Full redesign with module transparency |
| `src/modules/desktop/components/ModuleChecklist.tsx` | New: reusable module inventory |
| `src/modules/desktop/DesktopWidgets.tsx` | Enhanced download CTA |
| `src/modules/desktop/components/LocalTwinWelcome.tsx` | Enhanced with module verification |

