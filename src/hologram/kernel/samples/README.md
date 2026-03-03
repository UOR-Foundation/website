# samples/ — Example Code & Usage Patterns

> **Linux equivalent**: `samples/`
>
> Working examples demonstrating how to use each kernel subsystem.
> Each sample is self-contained and can be run independently.

## Planned Samples

| Sample | Subsystem | Description |
|---|---|---|
| `boot-minimal.ts` | init/ | Minimal boot sequence to running state |
| `process-fork.ts` | kernel/ | Fork a child process, observe scheduling |
| `mmu-store-load.ts` | mm/ | Store, deduplicate, and load CID-addressed data |
| `fs-create-read.ts` | fs/ | Create files, read back, observe journaling |
| `net-mesh-route.ts` | net/ | Open sockets, route through Fano mesh |
| `crypto-ecc.ts` | crypto/ | Encode, inject error, decode with correction |
| `circuit-run.ts` | arch/ | Compile and simulate a quantum circuit |
| `agent-spawn.ts` | agents/ | Spawn an agent, observe H-score evolution |

> **Status**: Scaffold — samples will be populated as subsystems stabilize.
