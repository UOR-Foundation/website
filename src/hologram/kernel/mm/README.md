# mm/ — Memory Management

> **Linux equivalent**: `mm/`
>
> Content-addressed virtual memory with automatic deduplication,
> tiered storage, and demand paging via page faults.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-mmu.ts` | CID-addressed page table, hot/cold tiers, CoW | `mm/mmap.c`, `mm/memory.c` |

## Key Concepts

- **CID addressing** — every datum is identified by its content hash (≡ page frame number)
- **Automatic dedup** — identical content shares a single physical page
- **Tiered storage** — hot (in-memory) → cold (evicted) with demand paging on access
- **Page faults** — accessing cold data triggers transparent reload (≡ Linux major/minor faults)
