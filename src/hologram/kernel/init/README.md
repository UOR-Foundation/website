# init/ — System Initialization

> **Linux equivalent**: `init/`
>
> Contains the kernel entry point and everything needed to bring
> the system from power-on to a running state with PID 0.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-boot.ts` | POST → Hardware → Firmware → Genesis → Running | `init/main.c` (`start_kernel()`) |
| `q-sovereignty.ts` | User ↔ kernel identity binding | `init/init_task.c` (initial creds) |
| `q-ceremony.ts` | Founding ceremony (constitutional hash) | First-boot identity setup |
| `q-ceremony-vault.ts` | Sealed vault execution for ceremony | Secure key ceremony |
| `q-three-word.ts` | Human-readable identity derivation | — (novel) |

## Boot Sequence

```
POST → Hardware → Firmware → Genesis (PID 0) → Running
 ≡       ≡          ≡           ≡                ≡
BIOS   ACPI      Microcode   start_kernel()   userspace
```
