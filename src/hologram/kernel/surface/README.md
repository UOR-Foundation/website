# surface/ — Holographic Display Server [NOVEL]

> **No Linux equivalent** — this is a novel extension.
> Nearest analogy: Linux DRM/KMS (`drivers/gpu/drm/`) + display server.
>
> The projection surface that composites multiple kernel instances
> into a single holographic output, managed by a supervisor process.

## Contents

| File | Purpose |
|---|---|
| `holographic-surface.ts` | Self-verify / self-heal / self-improve surface |
| `kernel-supervisor.ts` | Multi-kernel PID 0 orchestrator |
| `projection-compositor.ts` | N-kernel → 1 composite surface output |
| `q-package-projector.ts` | Package management and projection routing |

## Key Concepts

- **Compositor** — merges projection frames from N kernels into a single coherent output
- **Supervisor** — orchestrates multiple kernel instances (≡ hypervisor, but for Q-Kernels)
- **Self-verification** — surface continuously validates its own coherence
