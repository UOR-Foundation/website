# arch/ — Architecture & Instruction Set

> **Linux equivalent**: `arch/`
>
> Defines the quantum gate instruction set, statevector execution
> engine, error mitigation, and architecture-specific backends.
> Sub-directories map to specific instruction set architectures
> (like `arch/x86/`, `arch/arm/` in Linux).

## Contents

| File / Dir | Purpose | Linux Equivalent |
|---|---|---|
| `q-isa.ts` | Gate definitions, circuit structure | `arch/x86/include/asm/` (ISA defs) |
| `q-simulator.ts` | Statevector execution engine | CPU microarchitecture execution |
| `q-error-mitigation.ts` | ZNE, measurement mitigation, RC | — (novel, nearest: ECC in hardware) |
| `circuit-compiler.ts` | High-level → gate-level compilation | `arch/x86/kernel/` (instruction encoding) |
| `stabilizer-engine.ts` | Stabilizer tableau simulation | — (novel) |
| `qiskit/` | Qiskit-compatible circuit API | `arch/x86/` (ISA implementation) |
| `quantum/` | PennyLane interpreter backend | `arch/arm/` (alt ISA implementation) |

## Architecture Backends

| Backend | Description | Linux Analogy |
|---|---|---|
| `qiskit/` | IBM Qiskit circuit compatibility layer | `arch/x86/` — dominant ISA |
| `quantum/` | PennyLane differentiable quantum interpreter | `arch/arm/` — alternative ISA |
