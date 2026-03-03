# ipc/ — Inter-Process Communication

> **Linux equivalent**: `ipc/`
>
> CID-linked message channels with hash-chained history,
> pub/sub subscriptions, and typed message delivery.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-ipc.ts` | Message channels, subscriptions, delivery | `ipc/msg.c`, `ipc/shm.c` |

## Key Concepts

- **QChannel** — named message pipe with sender/receiver PIDs (≡ `msgget()`)
- **Hash-chained history** — every message links to its predecessor CID
- **QSubscription** — pub/sub pattern for event-driven IPC (≡ `epoll` + signals)
