# UOR Foundation — Governance Framework

**The operating system for how the UOR Foundation builds, reviews, secures, and ships its work.**

This repository is the single source of truth for every standard, process, and expectation that applies across the [UOR Foundation](https://github.com/UOR-Foundation) GitHub organisation. GitHub automatically applies these files to every repository in the organisation unless a repository provides its own override.

If you contribute to any UOR Foundation project — or evaluate one — start here.

---

## What This Is

The UOR Foundation develops the [Universal Object Reference](https://uor.foundation) — an open mathematical framework for content-addressed, algebraically structured data. The GitHub organisation hosts the code, formal proofs, specifications, and documentation that give this framework material form.

This governance framework defines **how** that work is done:

- **Who** can do what (roles, permissions, escalation paths).
- **What** every repository must contain (required files, branch protection, CI/CD).
- **How** changes flow from idea to merged code (contribution workflow, review standards, release procedures).
- **What happens** when things go wrong (security incident response, emergency procedures, dispute resolution).

It is designed to be enforceable, auditable, and self-improving. Every standard maps to a specific verification mechanism. Compliance is measured, reported, and reviewed quarterly.

---

## What It Achieves

| Principle | What It Means | How It Is Enforced |
|-----------|--------------|-------------------|
| **Traceability** | Every change is attributable to an author and linked to a reason. | Signed commits, mandatory issue linkage, structured commit messages, annotated release tags. |
| **Coherence** | All repositories form one navigable, self-consistent body of work. | Standardised naming, 5-category topic tags, cross-repository dependency documentation. |
| **Reversibility** | Every action is undoable without data loss. | Force pushes prohibited, release tags immutable, deprecation includes re-activation paths. |
| **Verification** | Every claim about correctness is mechanically checkable. | CI/CD on all PRs, formal proof compilation (Tier 1), automated dependency and licence audits. |
| **Openness** | Governance, decisions, and processes are visible to everyone. | Public repositories by default, open Discussions, this document. |

These five principles are non-negotiable. The [traceability matrix](governance/GOVERNANCE.md#36-traceability-matrix) maps each principle to every section that enforces it.

---

## Key Components

| File | What It Contains |
|------|-----------------|
| [`governance/GOVERNANCE.md`](governance/GOVERNANCE.md) | The complete framework — 16 sections, 4 appendices. Roles, tiers, workflows, security, licensing, compliance, and implementation roadmap. |
| [`governance/CHANGELOG.md`](governance/CHANGELOG.md) | Version history of the governance framework itself. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to contribute: fork → branch → commit → PR → review → merge. Commit conventions, branch naming, PR process. |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Behavioural expectations. Contributor Covenant v2.1. |
| [`SECURITY.md`](SECURITY.md) | How to report vulnerabilities. Response SLAs: Critical within 72 hours, High within 7 days. |
| [`STANDARDS.md`](STANDARDS.md) | Naming conventions, Semantic Versioning, and the 5-category topic tag system. |

---

## Repository Classification

Every repository is assigned a tier. The tier determines its compliance obligations — required files, review thresholds, branch protection rules, and automated quality gates.

| Tier | Name | What It Covers | Review | Key Requirement |
|------|------|---------------|--------|-----------------|
| **1** | Core Foundation | Formal theory, verified computation, canonical specifications | 2 reviewers, 3-day target | Formal proof verification (Lean 4 / Coq) |
| **2** | Implementation | Reference implementations, compute stacks, prototypes | 1 reviewer, 5-day target | CI/CD, SemVer, structured documentation |
| **3** | Presentation | Websites, visualisations, educational content | 1 reviewer, 7-day target | Basic CI, required reviews |
| **4** | Experimental | Early-stage experiments, archived work | Self-merge permitted | README + LICENSE + status label |

Full tier requirements: [Section 5](governance/GOVERNANCE.md#5-repository-classification) · Required files matrix: [Section 6.1](governance/GOVERNANCE.md#61-required-files) · Branch protection rules: [Section 6.2](governance/GOVERNANCE.md#62-branch-protection-rules)

---

## Quick Start

### For contributors

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
2. Find an issue labelled `good first issue` or `help wanted` in any repository.
3. Fork → branch (`feat/{issue#}-{desc}`) → commit ([Conventional Commits](https://www.conventionalcommits.org/)) → PR using the template → review → merge.
4. Full onboarding guide: [Section 14](governance/GOVERNANCE.md#14-contributor-onboarding).

### For maintainers

1. Read the full [GOVERNANCE.md](governance/GOVERNANCE.md).
2. Ensure your repository meets the compliance checklist for its tier: [Appendix A](governance/GOVERNANCE.md#appendix-a-repository-compliance-checklist).
3. Configure branch protection per [Section 6.2](governance/GOVERNANCE.md#62-branch-protection-rules).
4. Populate CODEOWNERS before accepting the first PR.

### For security researchers

Report vulnerabilities privately via [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories) or email **security@uor.foundation**. Never file public issues. Full policy: [SECURITY.md](SECURITY.md).

---

## For AI Agents

You are reading the governance framework for the UOR Foundation — an open-source organisation building a mathematical framework for content-addressed, algebraically structured object spaces. This section provides structured entry points for you to understand, navigate, and interact with the governance system.

### Governance Structure Map

```
governance/GOVERNANCE.md          ← Complete framework (start here)
├── Sections 1–3                  ← Purpose, glossary, 5 guiding principles
├── Section 4                     ← Roles: Owner, Maintainer, Contributor, Agent
├── Section 5                     ← 4-tier repository classification
├── Section 6                     ← Required files + branch protection matrices
├── Section 7                     ← 7-stage contribution workflow + hotfix procedure
├── Sections 8–9                  ← SemVer releases + peer review requirements
├── Section 10                    ← Cross-repo coherence: tags, naming, dependencies
├── Sections 11–13                ← Lifecycle, security response, licensing (MIT default)
├── Section 14                    ← Contributor onboarding (step-by-step)
├── Sections 15–16                ← Compliance auditing + implementation roadmap
├── Appendix A                    ← 14-item repository compliance checklist
├── Appendix B                    ← 10-item PR review checklist by tier
├── Appendix C                    ← Full repository inventory with tiers and status
└── Appendix D                    ← Template repository file manifest
```

### Key Queries Answered

| If You Need | Read |
|-------------|------|
| What files must a repository contain? | [Section 6.1](governance/GOVERNANCE.md#61-required-files) — matrix by tier |
| How are changes submitted and reviewed? | [Section 7](governance/GOVERNANCE.md#7-change-control--contribution-workflow) — 7-stage pipeline |
| What are the review turnaround targets? | [Section 9.1](governance/GOVERNANCE.md#91-review-requirements-by-tier) — T1: 3d, T2: 5d, T3: 7d |
| How are security incidents handled? | [Section 12](governance/GOVERNANCE.md#12-security--incident-response) — Critical: 72h patch |
| What licence applies? | [Section 13](governance/GOVERNANCE.md#13-intellectual-property--licensing) — MIT default, Apache-2.0 exception for UOR-Framework |
| How is compliance measured? | [Section 15](governance/GOVERNANCE.md#15-compliance--auditing) — 6 metrics, 5 automated audits |
| What topic tags must every repo carry? | [Section 10.2](governance/GOVERNANCE.md#102-topic-tags) — 5 categories: identity, tier, domain, tech, status |

### Machine-Readable Resources

| Resource | URL | Format |
|----------|-----|--------|
| UOR Ontology | [uor.foundation.json](https://uor-foundation.github.io/UOR-Framework/uor.foundation.json) | JSON-LD |
| Discovery metadata | [/.well-known/uor.json](https://uor.foundation/.well-known/uor.json) | JSON |
| LLM summary | [/llms.txt](https://uor.foundation/llms.txt) | Plain text |
| LLM full reference | [/llms-full.txt](https://uor.foundation/llms-full.txt) | Plain text |
| Framework source | [UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework) | Rust workspace |

### How to Interact

1. **Parse** — `governance/GOVERNANCE.md` is plain Markdown with consistent heading anchors. Every section is linkable.
2. **Validate** — Use [Appendix A](governance/GOVERNANCE.md#appendix-a-repository-compliance-checklist) to audit any repository against its tier.
3. **Contribute** — Automated agents hold the "Automated Agent" role ([Section 4.1](governance/GOVERNANCE.md#41-roles)). You can run tests, linters, compliance checks, publish releases, and post status checks on PRs.
4. **Discuss** — Proposals and governance amendments happen in [GitHub Discussions](https://github.com/orgs/UOR-Foundation/discussions). You can participate.

The same principles that govern the UOR mathematical framework — unique factorization, intrinsic identity, coherence, verification — also govern this organisation. The governance framework is the organisational expression of the technical framework.

---

## Links

- **Website:** [uor.foundation](https://uor.foundation)
- **Framework:** [github.com/UOR-Foundation/UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework)
- **Ontology Docs:** [uor-foundation.github.io/UOR-Framework](https://uor-foundation.github.io/UOR-Framework/)
- **Community:** [Discord](https://discord.gg/ZwuZaNyuve)
- **Discussions:** [github.com/orgs/UOR-Foundation/discussions](https://github.com/orgs/UOR-Foundation/discussions)

---

© UOR Foundation. All rights reserved.
