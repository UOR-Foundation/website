

## Plan: Local-First Deployment via Tauri + Multi-Device Sync

### Anytype's Genius — What We Steal

Anytype's architecture has three key insights relevant to us:

1. **Local-first, sync-second**: Data lives on-device in an embedded database. The network is a replication layer, not a dependency. You work offline; sync happens when peers are available.
2. **CRDT-based conflict resolution**: Every change is a CRDT operation — no merge conflicts, no "last write wins." Devices converge automatically.
3. **Peer-to-peer sync (no central server required)**: Devices find each other via a DHT and sync directly. A relay server helps with NAT traversal but never sees plaintext data.

We already have pieces 1 and 2: IndexedDB via GrafeoDB gives us local-first storage, and our UOR content-addressing gives us automatic deduplication (same content = same address = no conflict). What we need is the **desktop shell** and the **multi-device sync protocol**.

### Why Tauri (Not Electron)

Tauri is the right choice for this project:

- **~5MB binary** vs Electron's ~150MB (ships no browser — uses the OS WebView)
- **Rust backend** — aligns perfectly with our `uor-foundation` Rust crate; we can compile the crate directly into the Tauri sidecar
- **Same frontend** — our entire React app runs unchanged in Tauri's WebView
- **Security model** — Tauri's allowlist is capability-based, matching our sovereign security philosophy
- **Mobile support** — Tauri 2.0 supports iOS and Android via the same codebase

### Implementation (3 Phases)

#### Phase 1: Tauri Desktop Shell (This Sprint)

Add Tauri configuration alongside the existing Vite project so the same codebase produces both a web app and a native desktop app.

**New files:**
| File | Purpose |
|------|---------|
| `src-tauri/Cargo.toml` | Rust dependencies (tauri, uor-foundation) |
| `src-tauri/tauri.conf.json` | Window config, allowlist, app metadata |
| `src-tauri/src/main.rs` | Tauri entry point with IPC commands |
| `src-tauri/build.rs` | Build script |

**Modified files:**
| File | Change |
|------|--------|
| `package.json` | Add `tauri:dev` and `tauri:build` scripts |
| `vite.config.ts` | Add conditional `base: './'` for Tauri builds |
| `src/lib/runtime.ts` (new) | Runtime detection: `isLocal()`, `isWeb()`, `isMobile()` |

**What the Tauri shell provides:**
- Native window chrome with system tray icon
- File system access for local knowledge graph persistence (SQLite via GrafeoDB)
- IPC bridge: `invoke('uor_engine_op', { op: 'neg', args: [42] })` calls the Rust crate directly — no WASM overhead
- Auto-updater for seamless version bumps
- `base: './'` only when building for Tauri (env flag), web builds remain `base: '/'`

#### Phase 2: Runtime Abstraction Layer

Create a thin abstraction so the app doesn't care whether it's running in browser or Tauri.

**New file: `src/lib/runtime.ts`**

```text
Runtime Detection
├── isLocal()     → true if window.__TAURI__ exists
├── isWeb()       → true if running in browser
├── isMobile()    → true if Capacitor/Tauri mobile
├── getStorageBackend() → 'indexeddb' | 'sqlite' | 'hybrid'
└── getPlatform() → { type, version, deviceId }
```

**Modified: `src/modules/knowledge-graph/sync-bridge.ts`**
- When local: sync to SQLite (via Tauri fs commands) as primary, cloud as secondary
- When web: sync to IndexedDB as primary, cloud as secondary
- Both: same `syncBridge.sync()` API, same UOR content-addressing for conflict-free merge

**Modified: Boot sequence (`BootSequence.tsx`)**
- Show "Local" vs "Remote" provenance (already partially implemented per your screenshot)
- When Tauri detected: provenance = "Local · [hostname]" with green indicator

#### Phase 3: Mesh Sync Foundation (Future — Design Now)

Leverage the existing `UnsNode` and DHT infrastructure (`src/modules/uns/core/dht.ts`) for device-to-device sync:

```text
┌──────────────┐     UOR DHT      ┌──────────────┐
│  Desktop     │◄────────────────►│  Mobile      │
│  (Tauri)     │  content-addressed│  (PWA/Tauri) │
│  SQLite+KG   │  triple sync     │  IndexedDB   │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       └────────────┬────────────────────┘
                    │ Cloud (optional)
              ┌─────▼─────┐
              │  Lovable   │
              │  Cloud DB  │
              └────────────┘
```

- Each device registers as a `UnsNode` with a keypair
- Sync uses the existing `graph_iri` per-device namespacing
- Content-addressed triples = automatic deduplication across devices
- No central server required for device-to-device (WebRTC data channels for LAN sync)

### What Gets Built Now (Phase 1 Only)

1. **Tauri scaffold** (`src-tauri/`) with Rust entry point and IPC commands for UOR engine operations
2. **Runtime detection** (`src/lib/runtime.ts`) so the app knows where it's running
3. **Package scripts** — `npm run tauri:dev` to launch locally, `npm run build` for web (unchanged)
4. **Boot sequence update** — show "Local" provenance when running in Tauri
5. **README section** — instructions for local deployment: `git clone → npm install → npm run tauri:dev`

### What Does NOT Change

- The web experience remains identical — no regressions
- IndexedDB + GrafeoDB remains the browser storage layer
- Cloud sync via Lovable Cloud remains the web sync path
- All existing PWA functionality preserved

### User Experience

After implementation, deploying locally is:

```bash
git clone <repo>
npm install
npm run tauri:dev    # Opens native window with full OS
```

The boot sequence shows "Local · yourmachine.local" instead of "Remote · uor.foundation", and the knowledge graph persists to the local filesystem. When online, it syncs to cloud. When offline, it keeps working.

### Files Summary

| File | Action |
|------|--------|
| `src-tauri/Cargo.toml` | Create — Rust manifest |
| `src-tauri/tauri.conf.json` | Create — Tauri config |
| `src-tauri/src/main.rs` | Create — IPC bridge to uor-foundation crate |
| `src-tauri/build.rs` | Create — Build script |
| `src/lib/runtime.ts` | Create — Runtime detection layer |
| `package.json` | Modify — Add tauri scripts |
| `vite.config.ts` | Modify — Conditional base path |
| `src/modules/desktop/BootSequence.tsx` | Modify — Local provenance display |

