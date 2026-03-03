# kernel/ — Core Kernel Subsystem

> **Linux equivalent**: `kernel/`
>
> The scheduler, syscall interface, and core process management.
> This is the heart of the kernel — it decides what runs and when.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-sched.ts` | Coherence-priority scheduler (H-score ≡ nice) | `kernel/sched/fair.c` (CFS) |
| `q-syscall.ts` | Lens morphism syscall interface | `kernel/sys.c`, `kernel/syscall.c` |

## Key Concepts

- **H-score** replaces Linux's `nice` value — higher coherence = higher priority
- **Zones** (convergent/exploring/divergent) replace Linux scheduling classes (RT/CFS/IDLE)
- **Lens morphisms** are the syscall primitives — every operation is a structure-preserving transform
