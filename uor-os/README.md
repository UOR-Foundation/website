# UOR OS

**A sovereign virtual operating system that runs in the browser and ships as a native desktop app.**

UOR OS is a local-first, privacy-preserving operating system built on content-addressed data and algebraic computation. Every object — a file, a message, an identity, a computation trace — gets a deterministic address derived from its content. This means data is portable, verifiable, and yours by default.

---

## Why

Modern operating systems tie your identity, data, and applications to a vendor's cloud. You can't move your messages between platforms. You can't verify that a computation actually happened. You can't own your namespace the way you own a domain name.

UOR OS replaces these assumptions. It gives you a self-contained environment where identity is content-addressed (not account-based), storage is encrypted at rest (AES-256-GCM), messaging is post-quantum secure, and every operation leaves an auditable derivation chain. It runs as a web app during development and compiles to a native binary via Tauri for production use.

## How It Works

The system is organized into six layers, each in its own directory under `src/modules/`:

```
Layer 0 — kernel/           Computation & Algebra
Layer 1 — identity/          Naming & Addressing
Layer 2 — platform/          OS Shell & Services
Layer 3 — data/              Storage & Knowledge
Layer 4 — intelligence/      AI, Agents & Communication
Layer 5 — research/          Experimental & Advanced
         interoperability/   Standards Compatibility (CNCF, OpenAPI)
```

### Layer 0 · Kernel

The mathematical foundation. A 256-element finite ring (R₈ = F₂[x]/(x⁸+1)) provides the algebraic substrate for content addressing, derivation proofs, and entity resolution. This is not a blockchain — it is a deterministic computation model where every result can be independently verified.

**Modules:** `engine` · `ring-core` · `axioms` · `derivation` · `resolver` · `morphism` · `state` · `observable`

### Layer 1 · Identity

Content-addressed naming. Every piece of data gets a canonical identifier (CID) that maps deterministically to an IPv6 address, a Unicode glyph, and a Braille representation. The Universal Name System (UNS) is the DNS equivalent — it resolves human-readable names to content addresses.

**Modules:** `uns` · `addressing` · `certificate` · `qr-cartridge`

### Layer 2 · Platform

The operating system shell. A windowed desktop environment with a dock, spotlight search, and theme engine. Applications are orchestrated through a service mesh (the "Bus") that provides typed RPC between modules. The Compose subsystem manages container-like app lifecycles.

**Modules:** `desktop` · `boot` · `bus` · `compose` · `app-store` · `app-builder` · `auth` · `core` · `landing` · `ontology`

### Layer 3 · Data

Encrypted, content-addressed storage. The Knowledge Graph stores RDF-compatible triples locally via GrafeoDB. Sovereign Spaces provide peer-to-peer sync with CRDT-based conflict resolution. All data can be exported via Takeout or rolled back via Time Machine.

**Modules:** `knowledge-graph` · `sovereign-vault` · `sovereign-spaces` · `sparql` · `jsonld` · `code-kg` · `takeout` · `time-machine`

### Layer 4 · Intelligence

AI assistant, encrypted messaging, and media. Oracle provides a multi-model AI interface with epistemic grading — every response carries a fidelity score and derivation proof. The Messenger uses post-quantum key exchange (ML-KEM) for end-to-end encryption. Agent Tools expose five canonical operations (derive, query, verify, correlate, partition) for MCP-compatible AI agents.

**Modules:** `oracle` · `agent-tools` · `mcp` · `messenger` · `epistemic` · `media` · `audio`

### Layer 5 · Research

Experimental modules. Quantum circuit simulation, topological atlas visualization, SHACL conformance testing, and a compliance dashboard that validates the system against its own axioms.

**Modules:** `quantum` · `atlas` · `qsvg` · `shacl` · `canonical-compliance`

---

## Quick Start

### Web (Development)

```bash
npm install
npm run dev
```

Open `http://localhost:8080`. The OS shell loads as the root route.

### Desktop (Production)

```bash
# Requires: Rust toolchain (rustup.rs)
npm run tauri:build
```

Produces native installers:
- **macOS** → `.dmg` in `src-tauri/target/release/bundle/dmg/`
- **Windows** → `.msi` in `src-tauri/target/release/bundle/msi/`
- **Linux** → `.AppImage` / `.deb` in `src-tauri/target/release/bundle/`

---

## Project Structure

```
uor-os/
├── src/
│   ├── modules/
│   │   ├── kernel/              ← Ring R₈, axioms, derivation, resolution
│   │   ├── identity/            ← UNS, content addressing, certificates
│   │   ├── platform/            ← Desktop shell, service bus, app lifecycle
│   │   ├── data/                ← Knowledge graph, encrypted vault, sync
│   │   ├── intelligence/        ← AI oracle, agents, encrypted messenger
│   │   ├── research/            ← Quantum sim, topology, compliance
│   │   ├── interoperability/    ← CNCF compat, API explorer
│   │   ├── uor-sdk/             ← Developer SDK
│   │   └── verify/              ← Audit & verification tools
│   ├── lib/                     ← Shared utilities (crypto, WASM bridge)
│   ├── types/                   ← UOR Foundation type declarations
│   └── integrations/            ← Backend client
├── supabase/                    ← Edge functions & database migrations
├── src-tauri/                   ← Rust desktop backend (Tauri 2)
└── public/                      ← Static assets & PWA manifest
```

## Configuration

Create a `.env` file (auto-generated in Lovable Cloud):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, Tailwind CSS 3, Radix UI |
| Build | Vite 5, TypeScript 5 |
| Desktop | Tauri 2 (Rust) |
| Crypto | AES-256-GCM, ML-KEM (post-quantum), SHA-256 |
| Data | GrafeoDB (RDF), SPARQL, JSON-LD |
| AI | Multi-model gateway (OpenAI, Gemini) |
| Backend | Supabase (Edge Functions, Postgres, Storage) |

## Contributing

Each subsystem directory contains a `README.md` describing its modules. Start there. The codebase follows these conventions:

- **Barrel exports** — Every module has an `index.ts` that defines its public API.
- **Bus registration** — Modules expose RPC methods via `src/modules/platform/bus/`.
- **Lazy loading** — Heavy modules (quantum, atlas, audio) are code-split and loaded on demand.
- **No circular deps** — Layers only import downward (intelligence → data → kernel), never upward.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the technical deep-dive.

## License

Apache License, Version 2.0. See [LICENSE](./LICENSE).
