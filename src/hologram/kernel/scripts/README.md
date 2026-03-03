# scripts/ — Build & Verification Scripts

> **Linux equivalent**: `scripts/`
>
> Build tooling, configuration generators, code quality checks,
> and subsystem verification utilities.

## Planned Scripts

| Script | Purpose | Linux Equivalent |
|---|---|---|
| `checkpatch.ts` | Code style and convention checker | `scripts/checkpatch.pl` |
| `verify-boot.ts` | End-to-end boot sequence verification | `scripts/kconfig/` |
| `audit-rls.ts` | Security policy audit tool | `scripts/selinux/` |
| `gen-types.ts` | Auto-generate include/ type headers | `scripts/headers_install.sh` |
| `benchmark.ts` | Kernel subsystem performance benchmarks | `tools/perf/` |

> **Status**: Scaffold — scripts will be populated as the build pipeline matures.
