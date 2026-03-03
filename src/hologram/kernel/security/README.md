# security/ — Access Control & Trusted Execution

> **Linux equivalent**: `security/`
>
> Capability-based access control with 4 isolation rings,
> selective disclosure, TEE bridge, and confidential inference.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-security.ts` | 4-ring capability model, token auth | `security/security.c` (LSM framework) |
| `q-disclosure.ts` | Selective attribute disclosure policies | — (novel, nearest: SELinux labels) |
| `q-secure-mesh.ts` | Secure agent mesh orchestration | `security/apparmor/` (profile enforcement) |
| `tee-bridge.ts` | Trusted Execution Environment bridge | `drivers/misc/sgx/` (Intel SGX) |
| `tee-inference.ts` | Confidential AI inference pipeline | — (novel) |

## Isolation Rings

| Ring | Name | Linux Equivalent | Access Level |
|---|---|---|---|
| 0 | Kernel | Ring 0 (kernel mode) | Full hardware access |
| 1 | Driver | Ring 1 (unused in Linux) | Device driver access |
| 2 | Service | Ring 2 (unused in Linux) | Service-level access |
| 3 | User | Ring 3 (user mode) | Restricted, capability-gated |
