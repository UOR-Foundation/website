# Hologram Kernel — Rosetta Stone

> **One-sentence summary**: The Hologram Kernel is a content-addressed operating system
> that runs entirely in the browser, using the holographic principle to map every object
> onto a canonical 256-bit hash surface.

---

## Directory Structure

```
kernel/
├── boot/        ← System initialization & identity ceremony
├── memory/      ← Content-addressed storage & virtual memory
├── compute/     ← Execution, scheduling & error correction
├── network/     ← Inter-process & inter-node communication
├── security/    ← Access control, attestation & enclaves
├── agents/      ← Autonomous process containers & learning
├── surface/     ← Display server, composition & projection
├── hooks/       ← React hooks for UI integration
├── notebook/    ← Interactive computation workspace
└── __tests__/   ← Test suites for all subsystems
```

---

## Terminology Map

Every Hologram concept maps to a well-known systems concept.
Use this table when reading the codebase for the first time.

### boot/ — System Initialization

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Q-Boot** | BIOS POST + bootloader | Power-On Self-Test: verifies ring axioms, loads hardware descriptors, hydrates firmware, spawns genesis process |
| **Q-Sovereignty** | User session manager | Binds an authenticated user to a cryptographic identity (keypair + CID) |
| **Q-Ceremony** | Key ceremony / onboarding | One-time identity creation: generates PQC keypair, derives canonical CID, issues session token |
| **Q-Ceremony-Vault** | Secure enclave execution | Runs sensitive operations (key generation, signing) inside an isolated closure |
| **Q-Three-Word** | Human-readable identifier | Maps a 256-bit hash to a memorable 3-word name (like what3words for identity) |

### memory/ — Content-Addressed Storage

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Q-MMU** | Virtual memory / page table | Content-addressed memory management — every allocation is a CID-keyed page |
| **Q-FS** | Filesystem (ext4, ZFS) | Merkle DAG filesystem — files and directories are content-addressed inodes |
| **Q-Vault** | Encrypted volume | Encrypted-at-rest key-value store for sensitive data |
| **Q-Driver** | Block device driver | Abstraction over storage backends (memory, IndexedDB, cloud) with caching and I/O scheduling |

### compute/ — Execution & Scheduling

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Q-Sched** | Process scheduler | Prioritizes processes by coherence score (not just time-slicing); classifies into zones |
| **Q-Syscall** | System call interface | Typed morphism dispatch table — every syscall is a lens transformation |
| **Q-ISA** | Instruction set architecture | 96-gate instruction set for the kernel's computation model |
| **Q-ECC** | ECC memory / error correction | [[96,48,2]] stabilizer code — detects and corrects single-bit errors in kernel state |
| **Q-Simulator** | Statevector engine | Quantum circuit simulator: gates, measurement, noise models, OpenQASM export |
| **Q-Error-Mitigation** | Fault tolerance layer | Zero-noise extrapolation, measurement mitigation, randomized compiling |
| **Q-Coherence-Head** | Attention head (ML) | Computes coherence vectors across multiple observation modalities |
| **Circuit-Compiler** | JIT compiler | Compiles reasoning steps into executable gate sequences with convergence tracking |
| **Stabilizer-Engine** | ECC runtime | Applies stabilizer codes at runtime; projects error correction state |
| **Qiskit/** | Qiskit SDK (IBM) | Browser-native Qiskit-compatible API: QuantumCircuit, Aer simulator, transpiler |
| **Quantum/** | PennyLane interpreter | Variational quantum circuit interpreter with automatic differentiation |

### network/ — Communication

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Q-Net** | TCP/IP network stack | Fano-topology routing (7 nodes, 7 lines) with content-addressed packet delivery |
| **Q-IPC** | Inter-process communication | Typed channels with chain integrity verification — every message is hash-linked |
| **Q-Trust-Mesh** | Certificate authority / PKI | Decentralized trust graph — agents build and verify trust through mutual attestation |

### security/ — Access Control & Attestation

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Q-Security** | Capability-based access control | Isolation rings (Ring 0–3) with ECC-signed capability tokens |
| **Q-Disclosure** | Privacy policy engine | Rule-based system controlling what data is revealed to whom |
| **Q-Secure-Mesh** | Security orchestrator | Coordinates security policies across the agent mesh |
| **TEE-Bridge** | Trusted Execution Environment | Hardware/software attestation and sealed storage (with software fallback) |
| **TEE-Inference** | Confidential computing | Runs AI inference inside attestation boundary with proof generation |

### agents/ — Autonomous Processes

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Q-Agent** | Container / VM | Autonomous process with lifecycle (spawn → think → communicate → freeze/thaw) |
| **Q-Agent-Projection** | Agent render bridge | Projects agent state into the compositor for visualization |
| **Procedural-Memory** | Cerebellum / habit cache | Detects repeated action patterns, promotes them to fast-path habits |
| **Mirror-Protocol** | Mirror neurons / empathy | Tracks inter-agent coherence bonds, predicts partner state, shares habits |

### surface/ — Display & Composition

| Hologram Term | Traditional Equivalent | What It Does |
|---|---|---|
| **Holographic-Surface** | Display server (Wayland) | The 256-bit hash boundary everything projects onto — self-verifying, self-healing |
| **Projection-Compositor** | Window compositor | Merges multiple projection layers into a single coherent frame |
| **Kernel-Supervisor** | Process supervisor (systemd) | Manages child kernel instances, health monitoring, restart policies |
| **Q-Package-Projector** | Package manager (apt, npm) | Installs, resolves, and projects application packages |

---

## Key Concepts

### Lens = Codec / Serializer
A **Lens** is a bidirectional transform: `object ↔ canonical bytes`.
- **Focus** (dehydrate): Compile any object into its canonical UOR form
- **Refract** (rehydrate): Unpack canonical bytes into a specific modality (JSON-LD, Turtle, GraphQL, etc.)

### Projection = View / Render
A **Projection** maps a canonical object onto a target surface.
Think of it as `SELECT` + `FORMAT` — choose what to show and how to show it.

### Surface = Hash Boundary
The **Surface** is the 256-bit SHA-256 boundary that every object projects onto.
It's simultaneously the identity function (content → hash) and the display server (hash → pixels).

### Coherence = System Health
**Coherence score** (0–1) measures how well the system's state matches its canonical form.
The scheduler uses it for priority; the surface uses it for self-healing; agents use it for trust.

### Genesis = First Boot
The **Genesis process** is the first process spawned after boot.
It establishes the identity ceremony, derives the root CID, and seeds the trust mesh.

---

## External Dependencies

**All external imports enter through exactly ONE file**: `platform/bridge.ts`

```
grep -rn 'from "@/' src/hologram/ --include='*.ts' --include='*.tsx'
# Must return ONLY platform/bridge.ts
```

See [BOUNDARY.md](../BOUNDARY.md) for the complete dependency audit.

---

## Reading Order for New Developers

1. **This file** — understand the terminology
2. **`../genesis/`** — axiom layer (pure math, zero dependencies)
3. **`boot/q-boot.ts`** — see how the kernel starts
4. **`memory/q-mmu.ts`** — content-addressed memory model
5. **`compute/q-sched.ts`** — how processes are scheduled
6. **`surface/holographic-surface.ts`** — the projection boundary
7. **`../platform/bridge.ts`** — how external services connect
