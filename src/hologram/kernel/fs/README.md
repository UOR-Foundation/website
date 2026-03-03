# fs/ — Virtual File System

> **Linux equivalent**: `fs/`
>
> Journaled Merkle DAG filesystem with POSIX-like semantics
> and an encrypted vault layer (≡ dm-crypt).

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-fs.ts` | Journaled VFS with inodes, dentries, mount points | `fs/inode.c`, `fs/namei.c` |
| `q-vault.ts` | Encrypted sealed storage with key derivation | `dm-crypt`, `fs/crypto/` |

## Key Concepts

- **QInode** — content-addressed immutable nodes (≡ ext4 inodes but Merkle-linked)
- **Journal** — write-ahead log for crash recovery (≡ ext4 journal / jbd2)
- **Mount points** — virtual mount tree with namespace isolation
- **Vault** — encrypted blob storage with seal/unseal semantics
