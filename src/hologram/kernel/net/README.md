# net/ — Networking Stack

> **Linux equivalent**: `net/`
>
> Fano-topology mesh networking with cryptographic routing,
> coherence-gated firewall, and trust attestation.

## Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `q-net.ts` | Socket layer, Fano mesh routing, firewall | `net/ipv4/`, `net/core/sock.c` |
| `q-trust-mesh.ts` | Cryptographic trust attestation between nodes | `net/tls/`, certificate pinning |

## Key Concepts

- **Fano plane PG(2,2)** — 7-node topology where any two nodes are ≤2 hops apart
- **UOR IPv6** — node addresses derived from content identifiers
- **Firewall** — coherence-gated packet filtering (≡ netfilter/iptables)
- **Trust attestation** — mutual ceremony-based authentication (≡ mTLS)
