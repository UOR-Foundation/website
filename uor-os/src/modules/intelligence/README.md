# Layer 4 — Intelligence

AI, agents, and communication.

## Modules

| Module | Description |
|--------|-------------|
| `oracle/` | Multi-model AI assistant with epistemic grading and citation |
| `agent-tools/` | Five canonical agent operations: derive, query, verify, correlate, partition |
| `mcp/` | Model Context Protocol gateway for external AI agents |
| `messenger/` | Post-quantum encrypted messaging (ML-KEM-768 + AES-256-GCM) |
| `epistemic/` | Knowledge grading engine — scores claims A through F |
| `media/` | Audio/video streaming and media management |
| `audio/` | Audio engine — HLS streaming, spectral analysis, genre fingerprinting |

## Dependency Rule

Intelligence modules may depend on **kernel/**, **identity/**, and **data/**. They should not depend on **platform/** except for UI rendering via lazy-loaded page components.
