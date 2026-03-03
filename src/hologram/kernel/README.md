# Q-Kernel — Linux-Equivalent Quantum Operating System

> **One-sentence summary**: The Q-Kernel is a content-addressed operating system
> that runs entirely in the browser, using the holographic principle to map every object
> onto a canonical 256-bit hash surface — structured as a 1:1 mirror of the Linux kernel.

---

## Directory Structure (Linux ↔ Q-Kernel)

```
src/hologram/kernel/          ≡  /usr/src/linux/
├── init/                     ≡  init/          — Boot, PID 0, genesis process
│   ├── q-boot.ts                               POST → Hardware → Firmware → Genesis
│   ├── q-sovereignty.ts                        Identity binding (user ↔ kernel)
│   ├── q-ceremony.ts                           Founding ceremony (constitutional hash)
│   ├── q-ceremony-vault.ts                     Sealed vault execution
│   └── q-three-word.ts                         Human-readable identity derivation
│
├── kernel/                   ≡  kernel/        — Scheduler, syscall, core process mgmt
│   ├── q-sched.ts                              Coherence-priority CFS (H-score ≡ nice)
│   └── q-syscall.ts                            Lens morphism syscall interface
│
├── mm/                       ≡  mm/            — Virtual memory management
│   └── q-mmu.ts                                CID-addressed pages, demand paging, CoW
│
├── fs/                       ≡  fs/            — Virtual File System
│   ├── q-fs.ts                                 Journaled Merkle DAG filesystem
│   └── q-vault.ts                              Encrypted sealed storage (≡ dm-crypt)
│
├── drivers/                  ≡  drivers/       — Storage backend drivers
│   └── q-driver.ts                             Memory, IndexedDB, Supabase, IPFS
│
├── net/                      ≡  net/           — Networking stack
│   ├── q-net.ts                                Fano mesh topology, routing, firewall
│   └── q-trust-mesh.ts                         Cryptographic trust attestation
│
├── ipc/                      ≡  ipc/           — Inter-process communication
│   └── q-ipc.ts                                CID-linked message channels
│
├── crypto/                   ≡  crypto/        — Cryptographic subsystem
│   ├── q-ecc.ts                                [[15,1,3]] stabilizer error correction
│   └── q-coherence-head.ts                     Hamming distance coherence verification
│
├── arch/                     ≡  arch/          — Architecture & instruction set
│   ├── q-isa.ts                                Gate definitions, circuit structure
│   ├── q-simulator.ts                          Statevector execution engine
│   ├── q-error-mitigation.ts                   ZNE, measurement mitigation, RC
│   ├── circuit-compiler.ts                     High-level → gate-level compilation
│   ├── stabilizer-engine.ts                    Stabilizer tableau simulation
│   ├── qiskit/                                 Qiskit-compatible circuit API
│   └── quantum/                                PennyLane interpreter
│
├── security/                 ≡  security/      — Access control & TEE
│   ├── q-security.ts                           4-ring capability model (≡ LSM)
│   ├── q-disclosure.ts                         Selective attribute disclosure
│   ├── q-secure-mesh.ts                        Secure agent mesh orchestration
│   ├── tee-bridge.ts                           Trusted Execution Environment bridge
│   └── tee-inference.ts                        Confidential AI inference pipeline
│
├── agents/                   ★  NOVEL          — Autonomous AI processes
│   ├── q-agent.ts                              Agent lifecycle, mesh orchestration
│   ├── q-agent-projection.ts                   Agent → surface projection frames
│   ├── procedural-memory.ts                    Habit formation & reward learning
│   └── mirror-protocol.ts                      Inter-agent coherence bonding
│
└── surface/                  ★  NOVEL          — Holographic display server
    ├── holographic-surface.ts                  Self-verify / self-heal / self-improve
    ├── kernel-supervisor.ts                    Multi-kernel PID 0 orchestrator
    ├── projection-compositor.ts                N-kernel → 1 composite surface
    └── q-package-projector.ts                  Package management & projection
```

## Linux Equivalence Table

| Linux Concept | Linux Implementation | Q-Kernel Equivalent | Key Difference |
|---|---|---|---|
| `task_struct` | Process descriptor | `QProcess` | H-score replaces nice value |
| `fork()` / `clone()` | Process creation | `QSched.fork()` | Content-addressed session chain |
| CFS scheduler | `kernel/sched/fair.c` | `QSched` | Coherence-priority, not CPU-time fair |
| Page tables | `mm/mmap.c` | `QMmu` page table | CID-addressed, auto-dedup |
| VFS inodes | `fs/inode.c` | `QInode` | Immutable Merkle DAG nodes |
| Block drivers | `drivers/block/` | `BlockDevice` | Virtual: Memory/IndexedDB/IPFS |
| TCP/IP | `net/ipv4/` | `QNet` | Fano mesh (PG(2,2)), UOR IPv6 |
| `pipe()` / signals | `ipc/` | `QIpc` channels | Hash-linked CID message chains |
| LSM / capabilities | `security/` | `QSecurity` 4-ring | ECC-signed capability tokens |
| `crypto/` | AES, SHA, etc. | `QEcc` | [[15,1,3]] stabilizer codes |
| `arch/x86/` | x86 ISA | `QIsa` | Quantum gate instruction set |
| PID 1 (init) | systemd | Genesis process | H-score 1.0, constitutional hash |

## Hardware Virtualization

The fundamental innovation: **Q-Kernel virtualizes the entire hardware stack**.

| Physical Hardware | Q-Kernel Virtualization |
|---|---|
| CPU | Statevector simulator (`arch/q-simulator.ts`) |
| RAM | CID-addressed virtual memory (`mm/q-mmu.ts`) |
| Disk | Pluggable backends: Memory, IndexedDB, Supabase, IPFS (`drivers/q-driver.ts`) |
| NIC | Fano mesh overlay network (`net/q-net.ts`) |
| TPM / TEE | Software TEE bridge with attestation (`security/tee-bridge.ts`) |
| GPU | WebGPU compute pipeline (`../compute/`) |

This means Q-Kernel runs identically on desktop, mobile, edge, and cloud —
the same kernel binary, the same syscall interface, the same process model.

## Boot Sequence (Linux ↔ Q-Kernel)

```
Linux:     BIOS → GRUB → vmlinuz → start_kernel() → init (PID 1)
Q-Kernel:  POST → Hardware → Firmware → Genesis (PID 0) → Running
```

1. **POST** — Ring integrity check (Z/256Z critical identity) ≡ BIOS POST
2. **Hardware** — Atlas topology hydration (96 vertices, 7 Fano lines) ≡ ACPI/device enumeration
3. **Firmware** — Cayley-Dickson tower (ℝ→ℂ→ℍ→𝕆→𝕊) ≡ firmware/microcode loading
4. **Genesis** — PID 0 with H-score 1.0, constitutional hash ≡ start_kernel() + init
5. **Running** — Scheduler active, syscall interface ready ≡ userspace handoff

## Formal Definition

The Q-Kernel is:

> A monolithic, content-addressed operating system kernel that runs in browser
> privileged context, manages virtualized hardware resources, enforces isolation
> through a 4-ring capability model, and exposes a lens-morphism syscall interface
> that defines the execution environment for user-space agents and applications.

It is the **algebraic dual** of the Linux kernel: where Linux maps hardware
registers to process abstractions, Q-Kernel maps mathematical axioms
(Z/256Z ring, Fano plane, Cayley-Dickson tower) to the same abstractions.
The result is a kernel that is simultaneously:
- **Familiar** — any Linux developer can navigate it
- **Novel** — it runs without physical hardware
- **Verifiable** — every state transition is content-addressed and auditable
