# Layer 2 — Platform

The operating system shell and core services.

## Modules

| Module | Description |
|--------|-------------|
| `desktop/` | Windowed desktop shell — dock, windows, spotlight, themes |
| `boot/` | Sovereign boot sequence — WASM init, seal verification |
| `bus/` | Service mesh — typed RPC between all modules |
| `compose/` | App orchestrator — container-like lifecycle management |
| `app-store/` | Application marketplace and installation |
| `app-builder/` | Docker-style app build pipeline |
| `auth/` | Authentication providers (email, OAuth, wallet) |
| `core/` | Design system — UI primitives, dialogs, toasts, tooltips |
| `landing/` | Download page and public-facing landing |
| `ontology/` | SKOS vocabulary registry |
| `ceremony/` | Identity ceremony flow |

## Dependency Rule

Platform modules depend on **kernel/** and **identity/**. The `bus/` module is the only module that cross-cuts all layers (it dispatches calls to any registered handler).
