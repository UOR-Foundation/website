# kernel/Documentation/ — Kernel Documentation

> **Linux equivalent**: `Documentation/`
>
> Structured documentation for each kernel subsystem.
> Follows the Linux kernel documentation convention.

## Subsystem Documentation

| Document | Subsystem | Description |
|---|---|---|
| [boot-sequence.md](./boot-sequence.md) | `init/` | POST → Hardware → Firmware → Genesis boot flow |
| [scheduler.md](./scheduler.md) | `kernel/` | Coherence-priority CFS equivalent |
| [memory-model.md](./memory-model.md) | `mm/` | CID-addressed virtual memory model |
| [filesystem.md](./filesystem.md) | `fs/` | Journaled Merkle DAG VFS |
| [networking.md](./networking.md) | `net/` | Fano mesh topology and routing |
| [security-model.md](./security-model.md) | `security/` | 4-ring capability model |
| [hardware-virtualization.md](./hardware-virtualization.md) | `arch/` + `drivers/` | How Q-Kernel virtualizes hardware |

## Key Architectural Distinction

The Q-Kernel virtualizes the entire hardware stack:

| Physical Hardware | Q-Kernel Virtualization |
|---|---|
| CPU | Statevector simulator (`arch/q-simulator.ts`) |
| RAM | CID-addressed virtual memory (`mm/q-mmu.ts`) |
| Disk | Pluggable backends: Memory, IndexedDB, Supabase, IPFS (`drivers/q-driver.ts`) |
| NIC | Fano mesh overlay network (`net/q-net.ts`) |
| TPM / TEE | Software TEE bridge with attestation (`security/tee-bridge.ts`) |

This means Q-Kernel runs identically on desktop, mobile, edge, and cloud —
the same kernel binary, the same syscall interface, the same process model.
