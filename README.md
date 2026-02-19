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

**To get started:** Fetch the JSON-LD ontology. It contains 14 namespaces, 82 classes, 120 properties, and 14 named individuals describing the complete UOR type system. All namespace IRIs resolve under `https://uor.foundation/`.

**To explore the framework:** Start with `/llms.txt` for a concise overview, or `/llms-full.txt` for the comprehensive specification. The `/.well-known/uor.json` endpoint provides discovery metadata with namespace classifications (kernel, bridge, and user spaces).

**To validate conformance:** Clone the [UOR Framework repository](https://github.com/UOR-Foundation/UOR-Framework) and run `cargo run --bin uor-conformance` (50 test suite).

---

## Governance

The UOR Foundation enforces a formal [governance framework](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md) (v2.0) across all repositories. It is the single source of truth for how code, proofs, and documentation are created, reviewed, versioned, secured, and retired.

### What It Achieves

- **Deterministic quality.** Every change is traceable to an author, linked to a reason, and verified by automated checks before merge.
- **Structural coherence.** All repositories connect into one navigable, self-consistent body of work through standardised naming, tagging, and dependency documentation.
- **Reversibility by default.** Force pushes are prohibited, release tags are immutable, and every deprecation includes a documented path back.

### How It Works

Repositories are classified into four tiers. Each tier determines the exact compliance obligations: required files, branch protection rules, review thresholds, and automated quality gates.

| Tier | Name | Governance | Examples |
|------|------|------------|----------|
| 1 | **Core Foundation** | Maximum: multi-reviewer, signed commits, formal proof verification | [UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework), atlas-embeddings, math |
| 2 | **Implementation** | High: required reviews, CI/CD, SemVer | hologram-prototypes-1, sigmatics |
| 3 | **Presentation** | Standard: required reviews, basic CI | .github, this website |
| 4 | **Experimental** | Baseline: README, LICENSE, status label | Early-stage experiments |

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| [GOVERNANCE.md](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md) | 16 sections + 4 appendices defining all standards, roles, and procedures | `.github/governance/` |
| [CONTRIBUTING.md](https://github.com/UOR-Foundation/.github/blob/main/CONTRIBUTING.md) | Contribution workflow, commit conventions, PR process | `.github/` (org-wide) |
| [CODE_OF_CONDUCT.md](https://github.com/UOR-Foundation/.github/blob/main/CODE_OF_CONDUCT.md) | Contributor Covenant v2.1 | `.github/` (org-wide) |
| [SECURITY.md](https://github.com/UOR-Foundation/.github/blob/main/SECURITY.md) | Vulnerability reporting with defined SLA response timelines | `.github/` (org-wide) |
| [STANDARDS.md](https://github.com/UOR-Foundation/.github/blob/main/STANDARDS.md) | Naming, versioning, and 5-category topic tag system | `.github/` (org-wide) |

### For AI Agents: Governance Entry Points

The governance framework is plain Markdown, readable, parseable, and linkable by section anchor.

| What You Need | Where To Look |
|---------------|---------------|
| Full governance framework | [`governance/GOVERNANCE.md`](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md) |
| Repository compliance checklist | [Appendix A](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md#appendix-a-repository-compliance-checklist): 14-item audit matrix |
| PR review requirements | [Appendix B](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md#appendix-b-pull-request-review-checklist): 10-item checklist by tier |
| Complete repository inventory | [Appendix C](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md#appendix-c-repository-inventory): all repos with tier, language, status |
| Tier classification rules | [Section 5](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md#5-repository-classification): 4-tier taxonomy |
| Contribution workflow | [Section 7](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md#7-change-control--contribution-workflow): 7-stage pipeline |
| Security response SLAs | [Section 12](https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md#12-security--incident-response): Critical: 72h patch, Low: next release |

The framework aligns with the [UOR ontology](https://uor-foundation.github.io/UOR-Framework/): the same principles of traceability, coherence, and verification that govern the mathematical framework also govern the organisation.

---

## Links

- **Website:** [uor.foundation](https://uor.foundation)
- **Research:** [github.com/UOR-Foundation/research](https://github.com/UOR-Foundation/research)
- **Framework:** [github.com/UOR-Foundation/UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework)
- **Organization:** [github.com/UOR-Foundation](https://github.com/UOR-Foundation)
- **Community:** [Discord](https://discord.gg/ZwuZaNyuve)

---

© UOR Foundation. All rights reserved.
