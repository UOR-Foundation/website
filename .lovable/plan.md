

# Sovereign Portal — Full Tauri-Native Local-First OS Experience

## Vision

Every device becomes a **portal** into a single, persistent sovereign space. When you open UOR OS on your laptop, phone, or cloud instance, you see the exact same desktop — windows in the same position, documents mid-edit, tabs open, AI conversations mid-thread. No "setting up" a new device. You authenticate, and your entire environment materializes.

## What Tauri Gives Us (Unused Today)

We currently use 6 of ~20 available Tauri 2 plugins. The untapped capabilities map directly to the sovereign space vision:

| Plugin | Purpose for UOR OS |
|--------|-------------------|
| **`store`** | Persistent key-value store for session state, preferences, space snapshots — survives app restarts |
| **`stronghold`** | Hardware-grade encrypted vault for space keys, identity keypairs, credentials — never touches disk unencrypted |
| **`autostart`** | Launch UOR OS at boot — your sovereign space is always ready |
| **`clipboard-manager`** | Cross-device clipboard via space sync — copy on laptop, paste on phone |
| **`notification`** | Native OS notifications for sync events, collaboration invites, mesh peer arrivals |
| **`deep-link`** | `uor://space/{cid}` protocol handler — click a link anywhere, opens directly in your space |
| **`single-instance`** | Prevent duplicate instances; refocus existing window |
| **`sql`** | Native SQLite for local-first knowledge graph persistence (replaces IndexedDB) |
| **`window-state`** | Remember window position/size across restarts |

## Implementation Plan

### 1. Session Continuity Engine (the core of "pick up where you left off")

**What it does:** Captures complete desktop state — open windows, positions, active tabs, scroll positions, draft content, theme — and persists it locally via Tauri `store` + syncs to cloud as a content-addressed snapshot.

**New files:**
- `src/modules/sovereign-spaces/continuity/session-state.ts` — Serializes/deserializes the full `WindowState[]`, active app states, scroll positions, and draft buffers into a content-addressed snapshot
- `src/modules/sovereign-spaces/continuity/state-sync.ts` — Pushes session snapshots to the change-DAG so other devices can reconstruct the exact environment
- `src/modules/sovereign-spaces/continuity/native-store.ts` — Tauri `store` adapter with IndexedDB fallback for browser

**Modify:**
- `src/modules/desktop/hooks/useWindowManager.ts` — Replace `localStorage` with the continuity engine; auto-save every 5s + on blur/close
- `src/modules/desktop/DesktopShell.tsx` — On mount, restore session snapshot from continuity engine

**How it works:**
```text
┌──────────────┐   save every 5s   ┌─────────────────┐   change-DAG   ┌──────────┐
│ WindowManager │ ───────────────▶ │ Session Snapshot │ ─────────────▶ │  Cloud   │
│ (React state) │                  │ (content-CID)    │                │  Relay   │
└──────────────┘   ◀─────────────  └─────────────────┘   ◀───────────  └──────────┘
                   restore on boot                        pull on login
```

### 2. Stronghold-Backed Key Vault

**What it does:** Replaces browser `crypto.subtle` key storage with Tauri Stronghold — an encrypted, memory-hard vault that stores space encryption keys, identity keypairs, and session tokens in a tamper-proof binary vault file.

**New files:**
- `src/modules/sovereign-spaces/keys/stronghold-adapter.ts` — Wraps `@tauri-apps/plugin-stronghold` with fallback to `crypto.subtle` in browser
- Modify `src/modules/sovereign-spaces/space-keys.ts` — Use stronghold adapter for key derivation and storage in Tauri, existing Web Crypto in browser

**Rust side:**
- Add `tauri-plugin-stronghold = "2"` to `Cargo.toml`
- Register in `main.rs`

### 3. Native SQLite Knowledge Graph

**What it does:** In Tauri, stores the knowledge graph in a local SQLite database via `tauri-plugin-sql` instead of IndexedDB. SQLite is faster, supports complex queries, and persists reliably across app restarts.

**New files:**
- `src/modules/knowledge-graph/stores/sqlite-store.ts` — Implements the same store interface as the existing IndexedDB grafeo-store, but using native SQLite via Tauri SQL plugin
- `src/modules/knowledge-graph/stores/store-factory.ts` — Returns SQLite store in Tauri, IndexedDB store in browser (uses `runtime.ts` detection)

**Modify:**
- `src/modules/knowledge-graph/grafeo-store.ts` — Delegate to store factory

**Rust side:**
- Add `tauri-plugin-sql = "2"` to `Cargo.toml`

### 4. Cross-Device Clipboard Sync

**What it does:** When you copy text/data on one device, it becomes available on all devices in your sovereign space. Uses the clipboard-manager plugin locally and syncs via the change-DAG.

**New files:**
- `src/modules/sovereign-spaces/clipboard/clipboard-sync.ts` — Watches clipboard changes in Tauri, wraps them as space change envelopes, and applies incoming clipboard changes from other devices
- `src/modules/bus/modules/clipboard.ts` — Bus operations: `clipboard/read`, `clipboard/write`, `clipboard/history`

**Rust side:**
- Add `tauri-plugin-clipboard-manager = "2"` to `Cargo.toml`

### 5. Deep Link Protocol Handler (`uor://`)

**What it does:** Registers `uor://` as a system-wide protocol. Clicking `uor://space/{spaceCid}` or `uor://resolve/{canonicalId}` from anywhere (browser, email, chat) opens UOR OS directly to that content.

**New files:**
- `src/modules/sovereign-spaces/deep-link/handler.ts` — Parses incoming deep link URLs, routes to the correct space/content/app
- Add deep-link configuration to `tauri.conf.json`

**Rust side:**
- Add `tauri-plugin-deep-link = "2"` to `Cargo.toml`
- Configure URL scheme in `tauri.conf.json`

### 6. System Tray + Autostart (Always-On Portal)

**What it does:** UOR OS starts at system boot (optional) and lives in the system tray. Even when the main window is closed, sync continues in the background. The tray shows sync status and quick actions.

**Modify:**
- `src-tauri/src/main.rs` — Add tray menu with: "Open UOR OS", "Sync Status", "Quick Capture", separator, "Quit"
- `tauri.conf.json` — Already has tray icon configured; enhance with menu

**Rust side:**
- Add `tauri-plugin-autostart = "2"` and `tauri-plugin-single-instance = "2"` to `Cargo.toml`

### 7. Native Notifications for Sync Events

**What it does:** OS-level notifications when a collaborator joins your space, when sync completes on a new device, when a conflict needs resolution, or when an AI inference finishes.

**New files:**
- `src/modules/sovereign-spaces/notify/native-notify.ts` — Wraps `@tauri-apps/plugin-notification` with web Notification API fallback
- Integrate into `sync/peer-discovery.ts` — Notify on new peer arrival
- Integrate into `sync/change-dag.ts` — Notify on merge conflicts

**Rust side:**
- Add `tauri-plugin-notification = "2"` to `Cargo.toml`

### 8. Window State Persistence (Native)

**What it does:** Tauri's `window-state` plugin remembers exact window position, size, and monitor placement across app restarts — without any custom code.

**Rust side:**
- Add `tauri-plugin-window-state = "2"` to `Cargo.toml`
- Register plugin in `main.rs`

---

## Files Summary

| File | Action |
|------|--------|
| `src/modules/sovereign-spaces/continuity/session-state.ts` | Create — snapshot serialization |
| `src/modules/sovereign-spaces/continuity/state-sync.ts` | Create — cross-device session sync |
| `src/modules/sovereign-spaces/continuity/native-store.ts` | Create — Tauri store + IndexedDB adapter |
| `src/modules/sovereign-spaces/keys/stronghold-adapter.ts` | Create — encrypted key vault |
| `src/modules/sovereign-spaces/clipboard/clipboard-sync.ts` | Create — cross-device clipboard |
| `src/modules/sovereign-spaces/deep-link/handler.ts` | Create — `uor://` protocol handler |
| `src/modules/sovereign-spaces/notify/native-notify.ts` | Create — native notification bridge |
| `src/modules/knowledge-graph/stores/sqlite-store.ts` | Create — native SQLite graph store |
| `src/modules/knowledge-graph/stores/store-factory.ts` | Create — runtime-aware store selection |
| `src/modules/bus/modules/clipboard.ts` | Create — clipboard bus operations |
| `src-tauri/Cargo.toml` | Modify — add 7 new plugins |
| `src-tauri/src/main.rs` | Modify — register plugins, tray menu, autostart |
| `src-tauri/tauri.conf.json` | Modify — deep-link scheme, window-state config |
| `src/modules/desktop/hooks/useWindowManager.ts` | Modify — use continuity engine |
| `src/modules/desktop/DesktopShell.tsx` | Modify — restore session on mount |
| `src/modules/sovereign-spaces/space-keys.ts` | Modify — stronghold adapter |
| `src/modules/knowledge-graph/grafeo-store.ts` | Modify — store factory delegation |
| `src/modules/bus/modules/index.ts` | Modify — register clipboard module |

## Architectural Principle

Every new capability follows the same dual-dispatch pattern established by `ring-engine.ts` and `local-llm-engine.ts`:

```text
isLocal() ? NativeTauriPlugin : WebBrowserFallback
```

The browser version always works. The Tauri version is faster, more capable, and more deeply integrated. The user never notices the difference — they just see their sovereign space, everywhere.

