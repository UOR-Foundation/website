# Hologram — A Browser-Native Operating System

> **One sentence**: A self-contained OS that runs in your browser,
> structured exactly like Linux, built on mathematical axioms instead of silicon.

---

## What is this?

Hologram is a **virtual operating system** with a real kernel, filesystem,
process scheduler, memory manager, and security model. If you know Linux,
you already know how to navigate this codebase.

The key innovation: where Linux builds on x86 registers and physical RAM,
Hologram builds on a mathematical foundation (algebraic ring, SHA-256, 
Cayley-Dickson tower). The abstractions above that foundation are identical
to Linux — the same concepts, the same directory layout, the same mental model.

---

## Directory Structure — Linux OS Mapping

```
src/hologram/                     ≡  A Linux Distribution
│
├── genesis/                      ≡  /firmware/          — BIOS/UEFI ROM
│   ├── axiom-ring.ts                                     Z/256Z algebraic ring
│   ├── axiom-hash.ts                                     SHA-256 hash primitive
│   ├── axiom-cid.ts                                      Content identifier
│   ├── axiom-codec.ts                                    Encode/decode
│   ├── axiom-mirror.ts                                   Mirror/inverse operation
│   ├── axiom-signal.ts                                   Post-quantum signatures
│   ├── axiom-post.ts                                     Power-on self-test
│   ├── axiom-constitution.ts                             8 immutable laws
│   └── genesis.ts                                        Fuse axioms → identity
│
├── kernel/                       ≡  /usr/src/linux/     — Kernel source tree
│   ├── init/                     ≡  init/                Boot, PID 0, genesis
│   ├── kernel/                   ≡  kernel/              Scheduler, syscalls
│   ├── mm/                       ≡  mm/                  Virtual memory (CID-addressed)
│   ├── fs/                       ≡  fs/                  Journaled filesystem + vault
│   ├── block/                    ≡  block/               I/O scheduling
│   ├── drivers/                  ≡  drivers/             Storage backends
│   ├── net/                      ≡  net/                 Fano mesh networking
│   ├── ipc/                      ≡  ipc/                 Message channels
│   ├── crypto/                   ≡  crypto/              Error correction codes
│   ├── arch/                     ≡  arch/                Quantum gate ISA
│   ├── security/                 ≡  security/            4-ring capabilities + TEE
│   ├── lib/                      ≡  lib/                 Kernel utilities
│   ├── include/                  ≡  include/             Shared type headers
│   ├── certs/                    ≡  certs/               Certificate management
│   ├── samples/                  ≡  samples/             Usage examples
│   ├── scripts/                  ≡  scripts/             Build & verification
│   ├── tools/                    ≡  tools/               Tests & diagnostics
│   ├── Documentation/            ≡  Documentation/       Subsystem docs
│   ├── agents/                   ★  NOVEL                Autonomous AI processes
│   ├── surface/                  ★  NOVEL                Holographic display server
│   ├── Kconfig.ts                ≡  Kconfig              Configuration manifest
│   ├── MAINTAINERS               ≡  MAINTAINERS          Subsystem ownership
│   └── index.ts                  ≡  vmlinux              Public API (barrel export)
│
├── platform/                     ≡  /hal/               — Hardware Abstraction Layer
│   ├── bridge.ts                                         THE SINGLE GATEWAY (all I/O)
│   ├── index.ts                                          Adapter interfaces
│   ├── foundation-types.ts                               Core type definitions
│   ├── identity-types.ts                                 Identity primitives
│   ├── geometric-coherence.ts                            Coherence computation
│   ├── reward-circuit.ts                                 Reward signal processing
│   ├── triword.ts                                        Three-word name vocabulary
│   └── utils.ts                                          Platform utilities
│
├── usr/                          ≡  /usr/               — User space
│   ├── bin/                      ≡  /usr/bin/            User programs
│   │   ├── QShellPage.tsx                                Terminal emulator
│   │   ├── QShellEmbed.tsx                               Embedded shell widget
│   │   ├── CeremonyPage.tsx                              Identity ceremony UI
│   │   └── notebook/                                     Jupyter-equivalent notebook
│   └── lib/                      ≡  /usr/lib/            Shared libraries
│       ├── useQShell.ts                                  Shell state management
│       ├── useSovereignty.ts                             Identity lifecycle
│       ├── useDataBank.ts                                Encrypted storage
│       ├── useScreenTheme.ts                             Theme management
│       └── components/                                   Shared UI components
│
├── BOUNDARY.md                   — Dependency isolation rules
├── PROJECTION_MANIFEST.md        — Universal integration pattern
├── manifest.json                 — System manifest (UOR metadata)
└── README.md                     — You are here
```

---

## The Four Layers

```
┌─────────────────────────────────────────────────────┐
│                 USER SPACE (usr/)                     │
│  Shell, notebook, ceremony UI, hooks, components     │
├─────────────────────────────────────────────────────┤
│                 KERNEL (kernel/)                      │
│  20 subsystems mirroring Linux kernel source tree     │
│  init/ kernel/ mm/ fs/ block/ drivers/ net/ ipc/      │
│  crypto/ arch/ security/ lib/ include/ certs/         │
│  samples/ scripts/ tools/ Documentation/              │
│  + agents/ surface/ (novel extensions)                │
├─────────────────────────────────────────────────────┤
│             PLATFORM BRIDGE (platform/)               │
│  ONE file (bridge.ts) handles ALL external I/O        │
├─────────────────────────────────────────────────────┤
│               FIRMWARE (genesis/)                     │
│  8 mathematical axioms fused to kernel identity       │
│  Ring · Hash · CID · Codec · Mirror · Signal · POST   │
│  + Constitution (8 immutable laws)                    │
└─────────────────────────────────────────────────────┘
```

---

## For Experienced Developers

**If you know Linux**, here's the mental model:

- `genesis/` is the BIOS ROM — mathematical axioms that the kernel trusts implicitly
- `kernel/` is the kernel source tree — same directory layout as `/usr/src/linux/`
- `platform/bridge.ts` is the HAL — one file abstracts all hardware (browser APIs, cloud, GPU)
- `usr/` is userspace — applications that consume kernel services via hooks

**If you know OS design**, the key differences from Linux:

| Concept | Linux | Hologram |
|---|---|---|
| Hardware | Silicon registers | Algebraic axioms (Z/256Z) |
| Process priority | `nice` value (-20 to 19) | H-score (0.0 to 1.0) |
| Memory addressing | Virtual → Physical pages | Content-addressed (CID) |
| Deduplication | Optional (KSM) | Automatic (same content = same CID) |
| Filesystem integrity | fsck after crash | Self-verifying (CID mismatch = corrupt) |
| Network topology | Physical ethernet/wifi | Fano plane PG(2,2) mesh |
| Security model | DAC + MAC (SELinux) | 4-ring capability tokens |
| System calls | int 0x80 / syscall | Lens morphisms (encode/decode/transform) |

**If you're skeptical**, start here:

1. Read `kernel/init/q-boot.ts` — it's a boot sequence, just like `start_kernel()`
2. Read `kernel/kernel/q-sched.ts` — it's a scheduler, just like CFS
3. Read `kernel/mm/q-mmu.ts` — it's a page table, just like Linux's mm
4. Run `npm test` — 33+ kernel tests verify everything works

---

## Key Properties

| Property | Evidence |
|---|---|
| **Self-contained** | Kernel has zero external imports. One bridge file connects to the world. |
| **Deterministic** | Same input → same output. Every operation is a pure function of content. |
| **Portable** | Runs in any modern browser. Rewrite `bridge.ts` for any other environment. |
| **Verifiable** | Every state transition is content-addressed. Tampered state is detectable. |
| **Auditable** | Every cross-boundary call logged with timestamps and payload sizes. |
| **Linux-equivalent** | Same directory structure, same concepts, same mental model. |

---

## Further Reading

- **[kernel/README.md](./kernel/README.md)** — Complete kernel source tree with Linux equivalences
- **[BOUNDARY.md](./BOUNDARY.md)** — How the single-gateway architecture works
- **[PROJECTION_MANIFEST.md](./PROJECTION_MANIFEST.md)** — How to integrate any external system
- **[kernel/Documentation/](./kernel/Documentation/)** — Deep-dive subsystem documentation
