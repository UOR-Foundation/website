# kernel/lib/ — Kernel Utility Library

> **Linux equivalent**: `lib/`
>
> Shared helper functions used by multiple kernel subsystems.
> Everything here is pure computation — no side effects, no I/O.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `cid.ts` | Content-addressed identifier utilities | `lib/sha1.c`, `lib/crc32.c` |
| `invariants.ts` | Runtime assertion helpers | `lib/bug.c`, `BUG_ON()` |
| `math.ts` | Numerical utilities (clamp, lerp, mod) | `lib/math/` |
