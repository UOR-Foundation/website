# Hardware Virtualization

> **The fundamental innovation of Q-Kernel.**

## Problem

Traditional operating systems require physical hardware:
- CPU registers and instruction pipelines
- Physical RAM with MMU page tables
- Block storage devices
- Network interface cards

This creates hardware lock-in and deployment complexity.

## Solution: Virtual Hardware Abstraction

Q-Kernel virtualizes the **entire** hardware stack, enabling deployment
on any device that runs a browser (or any JavaScript runtime):

| Physical Hardware | Q-Kernel Virtualization | Module |
|---|---|---|
| CPU | Statevector simulator engine | `arch/q-simulator.ts` |
| Instruction Set | Quantum gate definitions | `arch/q-isa.ts` |
| RAM | CID-addressed virtual pages | `mm/q-mmu.ts` |
| Disk | Pluggable backends | `drivers/q-driver.ts` |
| NIC | Fano mesh overlay | `net/q-net.ts` |
| TPM / TEE | Software attestation | `security/tee-bridge.ts` |
| Interrupt Controller | Event-driven I/O model | `block/q-bio.ts` |

## Deployment Equivalence

Because hardware is virtualized, Q-Kernel runs **identically** on:
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile browsers (iOS Safari, Android Chrome)
- Edge devices (IoT, embedded Chromium)
- Cloud workers (Deno Deploy, Cloudflare Workers)
- Server-side runtimes (Node.js, Bun, Deno)

Same kernel binary. Same syscall interface. Same process model.
Zero hardware-specific code paths.

## Driver Model

Storage backends implement the `StorageBackend` interface:

```typescript
interface StorageBackend {
  read(sector: number): Promise<Uint8Array | null>;
  write(sector: number, data: Uint8Array): Promise<void>;
  sync(): Promise<void>;
}
```

Available drivers:
- `MemoryBackend` — In-memory (volatile, fastest)
- `IndexedDBBackend` — Browser-local persistence
- `SupabaseBackend` — Cloud-synced storage
- `IpfsBackend` — Content-addressed distributed storage
