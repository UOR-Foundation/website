# The UOR Foundation Website

**[uor.foundation](https://uor.foundation)**

The Universal Object Reference (UOR) Framework is an open data standard that gives every piece of digital content a single, permanent identifier based on what it is, not where it is stored. Identical content always resolves to the same address, across every system, forever.

This eliminates the fragmentation that plagues modern data infrastructure. Instead of maintaining countless integrations between incompatible systems, UOR provides one universal coordinate system for information: content addressed, mathematically verifiable, and lossless by construction.

---

## Why It Matters

Today, the same data exists in dozens of formats across hundreds of platforms, each with its own identifiers, schemas, and assumptions. Every integration is a new point of failure. Every migration risks data loss.

UOR solves this by deriving identity from content itself. Two systems that have never communicated will independently produce the same identifier for the same object. Verification is intrinsic. Interoperability is a mathematical guarantee, not an engineering effort.

This matters for the semantic web, open science, neuro symbolic AI, and any domain where reliable, portable, verifiable data is essential.

## How It Works

Six layers, each building on the one below it.

### Layer 0: The Foundation

The base layer. It defines a small set of mathematical rules that every object in the system must obey. These rules guarantee that anything built on top behaves predictably and never loses information. Without these constraints, nothing above can work. With them, every layer above is inevitable.

The rules are four axioms:

1. **Unique Factorization.** Every object breaks down into exactly one set of irreducible parts. No ambiguity, no duplication.
2. **Intrinsic Primes.** The smallest building blocks are determined by the structure itself, not assigned by convention.
3. **Coherence Norms.** Measurable quantities that track how faithfully a representation preserves the original object.
4. **Trilateral Coherence.** Every valid transformation must preserve algebraic, geometric, and computational structure simultaneously.

### Layer 1: Identity

Every object gets a permanent address based on what it contains, not where it is stored. The same content always produces the same address, regardless of which system holds it. This is what makes UOR content addressed: identity comes from substance, not location.

### Layer 2: Structure

Objects combine, decompose, and transform through precise rules. Every complex structure can be broken into its simplest parts and rebuilt without loss. Composition is always lossless and reversible.

### Layer 3: Resolution

Find any object by describing what you need, not by knowing where it lives. The system locates the right data and extracts exactly the information required.

### Layer 4: Verification

Every operation is mathematically provable. Proofs confirm correctness, certificates attest to properties, derivations show each step, and traces provide a complete audit trail. Trust is built into the system, not bolted on.

### Layer 5: Transformation

Objects move between representations while preserving their essential properties. Measurable quantities track structural fidelity. State management handles context and lifecycle transitions across systems.

Together, these layers produce a unified computational substrate where objects can be composed, decomposed, transformed, and verified with mathematical certainty.

## Where It Applies

- **Semantic Web.** Content referenced by what it is enables universal linking without centralized registries.
- **Open Science.** Reproducible, verifiable datasets with permanent identifiers that survive platform changes.
- **Neuro Symbolic AI.** Deterministic symbolic representations that AI agents can navigate, verify, and reason over.
- **Cross Domain Unification.** A single coordinate space that replaces bespoke integrations between incompatible systems.

---

## For AI Agents

This website and the UOR Framework are designed for both human and machine consumption. The following entry points provide structured, machine readable access to the full ontology:

| Resource | URL | Format |
|----------|-----|--------|
| Ontology (JSON-LD) | [uor.foundation.json](https://uor-foundation.github.io/UOR-Framework/uor.foundation.json) | JSON-LD |
| Ontology (Turtle) | [uor.foundation.ttl](https://uor-foundation.github.io/UOR-Framework/uor.foundation.ttl) | Turtle |
| Ontology (N-Triples) | [uor.foundation.nt](https://uor-foundation.github.io/UOR-Framework/uor.foundation.nt) | N-Triples |
| Discovery metadata | [/.well-known/uor.json](https://uor.foundation/.well-known/uor.json) | JSON |
| LLM summary | [/llms.txt](https://uor.foundation/llms.txt) | Plain text |
| LLM full reference | [/llms-full.txt](https://uor.foundation/llms-full.txt) | Plain text |
| Framework source | [github.com/UOR-Foundation/UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework) | GitHub |

**To get started:** Fetch the JSON-LD ontology. It contains 14 namespaces, 82 classes, 119 properties, and 14 named individuals describing the complete UOR type system. All namespace IRIs resolve under `https://uor.foundation/`.

**To explore the framework:** Start with `/llms.txt` for a concise overview, or `/llms-full.txt` for the comprehensive specification. The `/.well-known/uor.json` endpoint provides discovery metadata with namespace classifications (kernel, bridge, and user spaces).

**To validate conformance:** Clone the [UOR Framework repository](https://github.com/UOR-Foundation/UOR-Framework) and run `cargo run --bin uor-conformance` (50 test suite).

---

## Links

- **Website:** [uor.foundation](https://uor.foundation)
- **Research:** [github.com/UOR-Foundation/research](https://github.com/UOR-Foundation/research)
- **Framework:** [github.com/UOR-Foundation/UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework)
- **Organization:** [github.com/UOR-Foundation](https://github.com/UOR-Foundation)
- **Community:** [Discord](https://discord.gg/ZwuZaNyuve)

---

© UOR Foundation. All rights reserved.
