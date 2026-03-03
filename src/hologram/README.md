# Hologram

**A virtual operating system that runs entirely in your browser.**

No installation. No server. No trust required.  
Open a tab — you're running an OS.

---

## What problem does this solve?

Today, your digital identity is scattered across dozens of services.
Your files live on someone else's server. Your data is locked inside
apps you don't control. If a platform shuts down, you lose everything.

Hologram eliminates this dependency.

It gives you a **self-contained computing environment** — with a real
kernel, filesystem, process scheduler, and security model — that runs
entirely in your browser. Your identity is mathematically derived, not
assigned by a company. Your data is encrypted and portable. Every
operation is verifiable.

**You own the machine. The machine runs on math, not on permission.**

---

## What does it actually do?

Hologram is a browser-native operating system built from first
principles. It provides:

### 🔐 Sovereign Identity
Your identity is a SHA-256 hash of your credentials — not a username
in someone's database. This hash is your permanent, portable address
across every protocol: DID, ActivityPub, IPFS, Ethereum, Bitcoin, and
more. One identity, recognized everywhere, owned by nobody but you.

### 💻 A Real Kernel
Not a metaphor. Hologram implements the core primitives of an
operating system:

| What you know | Hologram equivalent |
|---|---|
| Boot sequence + POST | `q-boot` — hardware checks, firmware load, genesis process |
| Process scheduler | `q-sched` — coherence-priority scheduling with three zones |
| Virtual memory | `q-mmu` — content-addressed page tables with tiered storage |
| Filesystem | `q-fs` — journaled, content-addressed, POSIX-like |
| System calls | `q-syscall` — lens morphisms (encode/decode/transform) |
| Network stack | `q-net` — mesh topology with cryptographic routing |
| Security rings | `q-security` — 4-ring capability-based access control |
| Device drivers | `q-driver` — memory, IndexedDB, cloud, and IPFS backends |

Every subsystem runs in the browser. No server-side kernel.

### 📡 Universal Protocol Support
A single identity projects into native addresses for 15+ protocols.
The same hash produces a valid DID, an ActivityPub handle, a Bitcoin
address, an Ethereum address, an IPFS CID — simultaneously and
deterministically. No bridges. No translation layers. Just math.

### 🛡️ Post-Quantum Security
Identity and signing use Dilithium-3 (ML-DSA-65), a lattice-based
algorithm that resists quantum attacks. Your identity is secure
against both classical and quantum adversaries today.

### 🤖 Autonomous Agents
AI agents run as first-class kernel processes. They follow the same
scheduler, the same security model, the same memory management as
human-driven processes. Agents build procedural habits, share
knowledge through mirror protocols, and optimize for your coherence
— not their own confidence scores.

### 🔒 Privacy by Architecture
Selective disclosure is built into the kernel. You control exactly
which attributes are visible to which context. The system redacts
by default and reveals by permission — never the reverse.

---

## How does it work?

Three layers. Bottom-up.

### Layer 1: Genesis (the mathematical foundation)

Eight axioms define the algebraic substrate: a ring (`Z/256Z`),
a hash function (SHA-256), a codec, a content identifier, a mirror
operation, a signal primitive, a post-quantum signature scheme, and
a constitution of eight non-overridable laws. These axioms are fused
to the kernel's identity — if any axiom is tampered with, the system
refuses to boot.

→ `src/hologram/genesis/`

### Layer 2: Kernel (the operating system)

Built on the genesis axioms, the kernel implements boot, memory,
compute, networking, security, agents, and a holographic surface
for rendering. Every operation produces a verifiable receipt. The
kernel is the single source of truth for all system state.

→ `src/hologram/kernel/`

### Layer 3: Platform Bridge (the single gateway)

The kernel is 100% self-contained. It has **zero** external imports.
Every connection to the outside world — database, authentication,
GPU, storage — passes through exactly one file: `bridge.ts`. To
port Hologram to any environment, you rewrite that single file.
Everything else comes along unchanged.

→ `src/hologram/platform/bridge.ts`

```
┌─────────────────────────────────────────────────┐
│              HOST ENVIRONMENT                    │
│  (Browser, Server, Embedded, Native App)         │
└────────────────────┬────────────────────────────┘
                     │
                bridge.ts  ← one file, all I/O
                     │
┌────────────────────┴────────────────────────────┐
│              HOLOGRAM KERNEL                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Genesis  │→│  Kernel  │→│ Surface / Agents │ │
│  │ (axioms) │ │ (OS)     │ │ (UI / AI)        │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│            Zero external dependencies            │
└──────────────────────────────────────────────────┘
```

---

## What can you build with it?

- **Self-sovereign applications** — apps where users own their data
- **Cross-protocol identity** — one login, every network
- **Verifiable AI** — agents whose reasoning is auditable
- **Offline-first tools** — the OS works without a network
- **Privacy-preserving workflows** — selective disclosure by default
- **Content-addressed storage** — files identified by what they contain, not where they live

---

## Key properties

| Property | What it means |
|---|---|
| **Self-contained** | The entire kernel has zero external imports. One bridge file connects it to the world. |
| **Deterministic** | Same input → same output, always. Every projection is a pure function of the canonical hash. |
| **Portable** | Runs in any modern browser. Rewrite `bridge.ts` to run it anywhere else. |
| **Verifiable** | Every operation produces a cryptographic receipt. Tampered state is detectable. |
| **Quantum-resistant** | Dilithium-3 signatures protect against future quantum attacks. |
| **Auditable** | Every cross-boundary call is logged with timestamps and payload sizes. |

---

## Project structure

```
src/hologram/
├── genesis/              ← Mathematical axioms (hash, ring, codec, CID, constitution)
├── kernel/               ← Operating system (boot, memory, compute, network, security, agents)
│   ├── boot/             ← System initialization, identity, ceremony
│   ├── memory/           ← Content-addressed storage, filesystem, vault, drivers
│   ├── compute/          ← Scheduler, syscalls, ECC, ISA, quantum simulation
│   ├── network/          ← Mesh networking, IPC, trust mesh
│   ├── security/         ← Capability rings, TEE bridge, disclosure engine
│   ├── agents/           ← Autonomous AI processes, mirror protocol
│   └── surface/          ← Holographic rendering surface
├── platform/             ← Adapter interfaces + bridge.ts (the single gateway)
├── BOUNDARY.md           ← Dependency boundary rules and verification
├── PROJECTION_MANIFEST.md ← How to add any new protocol, model, or system
└── README.md             ← You are here
```

---

## Further reading

- **[BOUNDARY.md](./BOUNDARY.md)** — The single-gateway architecture and how to verify it
- **[PROJECTION_MANIFEST.md](./PROJECTION_MANIFEST.md)** — The universal pattern for integrating any external system
- **[kernel/README.md](./kernel/README.md)** — Rosetta Stone: holographic terminology ↔ traditional OS concepts

---

## One sentence

Hologram is a mathematically-grounded, self-verifying, portable
operating system that runs in your browser, gives you sovereign
control over your identity and data, and treats every external
system as a projection of one canonical truth.
