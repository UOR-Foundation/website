# kernel/include/ — Kernel Header Definitions

> **Linux equivalent**: `include/`
>
> Centralized type definitions and interface contracts shared
> across kernel subsystems. Like Linux headers, these define
> the structural contracts without implementation.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `process.ts` | Process descriptor types | `include/linux/sched.h` |
| `memory.ts` | Memory management types | `include/linux/mm_types.h` |
| `fs.ts` | Filesystem types | `include/linux/fs.h` |
| `net.ts` | Networking types | `include/net/sock.h` |
| `security.ts` | Security & capability types | `include/linux/security.h` |
