# UOR OS — Sovereign Virtual Operating System

A self-contained, local-first operating system built with React 18, Vite 5, Tailwind CSS, and Tauri 2.

## Quick Start (Web)

```bash
npm install
npm run dev
```

Open `http://localhost:8080` — the OS shell loads as the root route.

## Desktop Build (Tauri)

```bash
# Prerequisites: Rust toolchain (rustup.rs)
npm run tauri:build
```

This produces native installers:
- **Windows**: `.msi` / `.exe` in `src-tauri/target/release/bundle/msi/`
- **macOS**: `.dmg` in `src-tauri/target/release/bundle/dmg/`
- **Linux**: `.AppImage` / `.deb` in `src-tauri/target/release/bundle/`

## Architecture

```
src/
├── App.tsx              ← OS-only routes (/ = Desktop Shell)
├── main.tsx             ← Entry point with COI bootstrap
├── modules/
│   ├── desktop/         ← Shell, dock, windows, spotlight, themes
│   ├── boot/            ← Sovereign boot sequence
│   ├── engine/          ← Ring R₈ computation engine
│   ├── bus/             ← Service mesh (RPC bus)
│   ├── compose/         ← App orchestrator (Docker-equivalent)
│   ├── oracle/          ← AI assistant + search + library
│   ├── knowledge-graph/ ← Local SQLite + GrafeoDB
│   ├── sovereign-vault/ ← Encrypted local storage
│   ├── uns/             ← Universal Name System
│   ├── messenger/       ← Post-quantum encrypted messaging
│   └── ...              ← 30+ modules
├── lib/                 ← Shared utilities (crypto, WASM, ring)
├── types/               ← UOR Foundation type declarations
├── integrations/        ← Backend client (Supabase/Lovable Cloud)
└── assets/              ← Images, icons
src-tauri/               ← Rust backend (Tauri 2)
```

## Modules Installed Locally

| Module | Description |
|--------|-------------|
| UOR Kernel | Ring R₈ computation engine (256-element finite ring) |
| Knowledge Graph | Local SQLite + GrafeoDB (SPARQL-compatible) |
| Sovereign Vault | AES-256-GCM encrypted local storage |
| Content Bus | Event-driven service mesh |
| Identity System | Content-addressed naming (UNS) |
| Oracle (Cloud) | AI via cloud API |
| Local LLM | Coming soon (Ollama integration) |

## Environment Variables

Create a `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## License

See the UOR Foundation license terms.
