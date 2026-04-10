

# Reflection + Plan: Local Twin Setup Wizard (Core OS Only)

## Reflection

You're right to separate these concerns. The core value proposition is **running the OS itself locally** — the sovereign knowledge graph, the delta engine, the UOR coordinate system. That's the "local twin." Ollama, local AI, and other extensions are **optional modules** that users can activate later when they're ready.

The architecture should mirror how real operating systems work: macOS doesn't ask you to install Xcode during setup. It boots, it works, it's beautiful. Developer tools come later, on demand.

```text
┌─────────────────────────────────────────────────┐
│              CORE LOCAL TWIN                    │
│  Knowledge Graph · Delta Engine · UOR Engine    │
│  Sovereign Vault · Boot Sequence · Bus          │
│  ─ runs everywhere: browser, Tauri, mobile ─    │
├─────────────────────────────────────────────────┤
│           OPTIONAL EXTENSION MODULES            │
│  Local AI (Ollama) · IPFS · P2P Sync           │
│  ─ activated via Settings, not setup wizard ─   │
└─────────────────────────────────────────────────┘
```

The "setup wizard" should therefore be a **Runtime Handoff** — a single, elegant screen that appears on first Tauri launch confirming: "Your local twin is ready. Everything runs on your machine." No Ollama prompts, no model downloads, no confusion.

## What This Unlocks

The clean separation means the same boot sequence works identically across all surfaces. The only difference is the **runtime detection layer** (which already exists in `src/lib/runtime.ts`). When Tauri is detected, the system silently upgrades storage from IndexedDB to SQLite and enables native IPC — no user action required.

## Plan — 3 Changes

### 1. Fix Build Error (vite.config.ts)

The PWA plugin's service worker build can't resolve `./container` from `src/modules/uns/build/index.ts`. Add the UNS build path to the `injectManifest.globIgnores` and add `src/modules/uns/build/**` pattern to exclude it from the SW precache, which sidesteps the resolution issue.

### 2. Create Local Twin Welcome Screen (`src/modules/desktop/components/LocalTwinWelcome.tsx`)

A single, elegant overlay that appears on first Tauri launch only:

- Detects runtime via `isLocal()` from `src/lib/runtime.ts`
- Shows platform-adaptive UI via `usePlatform()` (macOS pill shapes vs Windows squared corners)
- Three brief animated panels (auto-advance, no clicks required):
  1. **"Your Local Twin"** — "Everything runs on your machine. Your data never leaves."
  2. **"Sovereign Storage"** — "SQLite database, encrypted vault, delta-compressed graph."
  3. **"Ready"** — Fades into the desktop naturally
- Sets `localStorage("uor:local-twin-welcomed", "true")` so it never shows again
- Total duration: ~4 seconds, purely visual, no user input required
- If not Tauri (browser/PWA), this component never renders

### 3. Integrate into DesktopShell (`src/modules/desktop/DesktopShell.tsx`)

- After `BootSequence` completes, check if `isLocal() && !localStorage.getItem("uor:local-twin-welcomed")`
- If true, show `LocalTwinWelcome` before revealing the desktop
- The transition: Boot terminal → Welcome overlay (fade) → Desktop (fade)

### Files Summary

| File | Action | Purpose |
|---|---|---|
| `vite.config.ts` | Update | Fix PWA build error — exclude UNS build modules |
| `src/modules/desktop/components/LocalTwinWelcome.tsx` | Create | Elegant first-launch welcome for Tauri runtime |
| `src/modules/desktop/DesktopShell.tsx` | Update | Wire welcome screen into boot → desktop flow |

No Ollama setup. No model selection. Just: "Your local twin is sovereign and ready."

