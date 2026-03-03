# kernel/block/ — Block I/O Layer

> **Linux equivalent**: `block/`
>
> The block I/O layer sits between the filesystem (`fs/`) and
> device drivers (`drivers/`). It handles I/O request scheduling,
> queue management, and buffer coordination.
>
> In Q-Kernel, all storage is content-addressed, so the block layer
> manages CID-based I/O batching, write coalescing, and read-ahead
> prefetching across virtual storage backends.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-bio.ts` | Block I/O request queue and scheduler | `block/blk-mq.c` |
