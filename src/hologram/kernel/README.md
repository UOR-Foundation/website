# Q-Kernel — Linux-Equivalent Quantum Operating System

> **One-sentence summary**: A content-addressed operating system kernel that runs
> entirely in the browser, structured as a 1:1 mirror of the Linux kernel source tree,
> built on the holographic principle where every object maps to a canonical 256-bit hash.

---

## Directory Structure

```
src/hologram/kernel/              ≡  /usr/src/linux/
│
├── MAINTAINERS                   ≡  MAINTAINERS      — Subsystem ownership
├── Kconfig.ts                    ≡  Kconfig           — Kernel configuration
├── index.ts                      ≡  vmlinux (exports) — Public API surface
├── README.md                     ≡  README            — This file
│
├── init/                         ≡  init/             — Boot & PID 0
│   ├── q-boot.ts                                       POST → Hardware → Firmware → Genesis
│   ├── q-sovereignty.ts                                Identity binding (user ↔ kernel)
│   ├── q-ceremony.ts                                   Founding ceremony (constitutional hash)
│   ├── q-ceremony-vault.ts                             Sealed vault execution
│   └── q-three-word.ts                                 Human-readable identity derivation
│
├── kernel/                       ≡  kernel/            — Scheduler & syscalls
│   ├── q-sched.ts                                      Coherence-priority CFS
│   └── q-syscall.ts                                    Lens morphism syscall interface
│
├── mm/                           ≡  mm/               — Virtual memory
│   └── q-mmu.ts                                        CID-addressed pages, demand paging
│
├── fs/                           ≡  fs/               — Virtual filesystem
│   ├── q-fs.ts                                         Journaled Merkle DAG filesystem
│   └── q-vault.ts                                      Encrypted sealed storage (≡ dm-crypt)
│
├── block/                        ≡  block/            — Block I/O layer
│   └── q-bio.ts                                        I/O request queue and scheduler
│
├── drivers/                      ≡  drivers/          — Device drivers
│   └── q-driver.ts                                     Memory, IndexedDB, Supabase, IPFS
│
├── net/                          ≡  net/              — Networking stack
│   ├── q-net.ts                                        Fano mesh topology, routing, firewall
│   └── q-trust-mesh.ts                                 Cryptographic trust attestation
│
├── ipc/                          ≡  ipc/              — Inter-process communication
│   └── q-ipc.ts                                        CID-linked message channels
│
├── crypto/                       ≡  crypto/           — Cryptographic subsystem
│   ├── q-ecc.ts                                        [[15,1,3]] stabilizer ECC
│   └── q-coherence-head.ts                             Hamming coherence verification
│
├── arch/                         ≡  arch/             — Architecture & ISA
│   ├── q-isa.ts                                        Gate definitions, circuit structure
│   ├── q-simulator.ts                                  Statevector execution engine
│   ├── q-error-mitigation.ts                           ZNE, measurement mitigation, RC
│   ├── circuit-compiler.ts                             High-level → gate-level compilation
│   ├── stabilizer-engine.ts                            Stabilizer tableau simulation
│   ├── qiskit/                   ≡  arch/x86/          Qiskit-compatible ISA backend
│   └── quantum/                  ≡  arch/arm/          PennyLane ISA backend
│
├── security/                     ≡  security/         — Access control & TEE
│   ├── q-security.ts                                   4-ring capability model (≡ LSM)
│   ├── q-disclosure.ts                                 Selective attribute disclosure
│   ├── q-secure-mesh.ts                                Secure agent mesh orchestration
│   ├── tee-bridge.ts                                   TEE bridge (≡ Intel SGX)
│   └── tee-inference.ts                                Confidential inference pipeline
│
├── lib/                          ≡  lib/              — Kernel utilities
│   ├── cid.ts                                          Content identifier functions
│   ├── invariants.ts                                   BUG_ON, WARN_ON, assertions
│   └── math.ts                                         clamp, lerp, mod, EMA, entropy
│
├── include/                      ≡  include/          — Shared type headers
│   ├── process.ts                                      ProcessDescriptor (≡ sched.h)
│   └── memory.ts                                       MmuStats (≡ mm_types.h)
│
├── certs/                        ≡  certs/            — Certificate management [scaffold]
├── samples/                      ≡  samples/          — Usage examples [scaffold]
├── scripts/                      ≡  scripts/          — Build & verification tools [scaffold]
│
├── tools/                        ≡  tools/            — Tests & diagnostics
│   └── testing/                                        Kernel subsystem test suites
│
├── Documentation/                ≡  Documentation/    — Subsystem documentation
│   ├── boot-sequence.md                                Boot flow deep-dive
│   ├── hardware-virtualization.md                      Virtual hardware mapping
│   └── security-model.md                               4-ring security architecture
│
├── agents/                       ★  NOVEL             — Autonomous AI processes
│   ├── q-agent.ts                                      Agent lifecycle & mesh orchestration
│   ├── q-agent-projection.ts                           Agent → surface projection
│   ├── procedural-memory.ts                            Habit formation & reward learning
│   └── mirror-protocol.ts                              Inter-agent coherence bonding
│
└── surface/                      ★  NOVEL             — Holographic display server
    ├── holographic-surface.ts                          Self-verify / self-heal / self-improve
    ├── kernel-supervisor.ts                            Multi-kernel PID 0 orchestrator
    ├── projection-compositor.ts                        N-kernel → 1 composite surface
    └── q-package-projector.ts                          Package management & projection
```

## Userspace

```
src/hologram/usr/                 ≡  /usr/             — User space
├── bin/                          ≡  /usr/bin/          — User programs
│   ├── QShellPage.tsx                                   Terminal emulator
│   ├── QShellEmbed.tsx                                  Embedded shell widget
│   ├── CeremonyPage.tsx                                 Identity ceremony UI
│   └── notebook/                                        Jupyter-equivalent notebook
└── lib/                          ≡  /usr/lib/          — Shared userspace libraries
    ├── useQShell.ts                                     Shell state management
    ├── useSovereignty.ts                                Identity lifecycle hook
    ├── useDataBank.ts                                   Encrypted storage hook
    ├── useScreenTheme.ts                                Theme management hook
    └── components/                                      Shared UI components
```

## Linux ↔ Q-Kernel Equivalence

| Linux Concept | Linux File | Q-Kernel Equivalent | Key Difference |
|---|---|---|---|
| `task_struct` | `include/linux/sched.h` | `QProcess` | H-score replaces nice value |
| `fork()` | `kernel/fork.c` | `QSched.fork()` | Content-addressed session chain |
| CFS scheduler | `kernel/sched/fair.c` | `QSched` | Coherence-priority, not CPU-fair |
| Page tables | `mm/mmap.c` | `QMmu` | CID-addressed, auto-dedup |
| VFS inodes | `fs/inode.c` | `QInode` | Immutable Merkle DAG |
| Block drivers | `drivers/block/` | `BlockDevice` | Virtual: Memory/IDB/IPFS |
| TCP/IP stack | `net/ipv4/` | `QNet` | Fano mesh PG(2,2) |
| `pipe()` | `ipc/pipe.c` | `QIpc` | Hash-linked CID chains |
| LSM framework | `security/security.c` | `QSecurity` | 4-ring capability tokens |
| Crypto API | `crypto/` | `QEcc` | [[15,1,3]] stabilizer codes |
| x86 ISA | `arch/x86/` | `QIsa` | Quantum gate instruction set |
| `Kconfig` | `Kconfig` | `Kconfig.ts` | TypeScript config manifest |
| `MAINTAINERS` | `MAINTAINERS` | `MAINTAINERS` | Subsystem ownership |

## Hardware Virtualization

| Physical Hardware | Q-Kernel Virtualization |
|---|---|
| CPU | Statevector simulator (`arch/q-simulator.ts`) |
| RAM | CID-addressed virtual memory (`mm/q-mmu.ts`) |
| Disk | Pluggable backends (`drivers/q-driver.ts`) |
| NIC | Fano mesh overlay (`net/q-net.ts`) |
| TPM / TEE | Software TEE bridge (`security/tee-bridge.ts`) |

## Boot Sequence

```
Linux:     BIOS → GRUB → vmlinuz → start_kernel() → init (PID 1)
Q-Kernel:  POST → Hardware → Firmware → Genesis (PID 0) → Running
```

## Design Principles

1. **Familiar** — any Linux kernel developer can navigate this tree instantly
2. **Novel** — runs without physical hardware, built on algebraic axioms
3. **Verifiable** — every state transition is content-addressed and auditable
4. **Complete** — all 15 Linux subsystem directories present, even if scaffolded
