# crypto/ — Cryptographic Subsystem

> **Linux equivalent**: `crypto/`
>
> Quantum error correction codes and coherence verification
> primitives used throughout the kernel.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-ecc.ts` | [[15,1,3]] stabilizer error correction code | `crypto/sha256_generic.c` |
| `q-coherence-head.ts` | Hamming-distance coherence verification | `crypto/hash.h` |

## Key Concepts

- **Stabilizer codes** — quantum error correction using Pauli group generators
- **Syndrome decoding** — detect and correct errors in encoded codewords
- **Coherence head** — multi-dimensional coherence scoring via Hamming distance
