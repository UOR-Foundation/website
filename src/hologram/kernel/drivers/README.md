# drivers/ — Device Driver Framework

> **Linux equivalent**: `drivers/`
>
> Pluggable storage backend drivers that abstract the physical
> (or virtual) storage layer behind a uniform block device interface.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-driver.ts` | BlockDevice abstraction + 4 backends | `drivers/block/`, `drivers/nvme/` |

## Supported Backends

| Backend | Description | Linux Equivalent |
|---|---|---|
| `MemoryBackend` | In-process RAM storage | `drivers/block/brd.c` (ramdisk) |
| `IndexedDBBackend` | Browser-persistent storage | `drivers/block/loop.c` (loopback) |
| `SupabaseBackend` | Cloud-persistent storage | `drivers/nvme/` (network storage) |
| `IpfsBackend` | Content-addressed distributed storage | — (novel, nearest: NFS) |
