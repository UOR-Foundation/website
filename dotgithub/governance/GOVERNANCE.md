# UOR Foundation — GitHub Organisational Governance Framework

| Property | Value |
|----------|-------|
| Version | 2.0 |
| Status | Approved for Implementation |
| Classification | Public |
| Effective Date | February 2026 |
| Owner | UOR Foundation — Organisation Owners |
| Review Cycle | Quarterly (next: May 2026) |
| Location | `github.com/UOR-Foundation/.github/governance/` |
| Supersedes | Version 1.0 (February 2026) |

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Glossary](#2-glossary)
3. [Guiding Principles](#3-guiding-principles)
4. [Roles, Teams & Escalation](#4-roles-teams--escalation)
5. [Repository Classification](#5-repository-classification)
6. [Repository Standards](#6-repository-standards)
7. [Change Control & Contribution Workflow](#7-change-control--contribution-workflow)
8. [Version Management & Releases](#8-version-management--releases)
9. [Peer Review & Quality Assurance](#9-peer-review--quality-assurance)
10. [Cross-Repository Coherence](#10-cross-repository-coherence)
11. [Repository Lifecycle Management](#11-repository-lifecycle-management)
12. [Security & Incident Response](#12-security--incident-response)
13. [Intellectual Property & Licensing](#13-intellectual-property--licensing)
14. [Contributor Onboarding](#14-contributor-onboarding)
15. [Compliance & Auditing](#15-compliance--auditing)
16. [Implementation Roadmap](#16-implementation-roadmap)
- [A. Repository Compliance Checklist](#appendix-a-repository-compliance-checklist)
- [B. Pull Request Review Checklist](#appendix-b-pull-request-review-checklist)
- [C. Repository Inventory](#appendix-c-repository-inventory)
- [D. Template Repository Manifest](#appendix-d-template-repository-manifest)

---

## 1. Purpose & Scope

### 1.1 Purpose

This document establishes the authoritative governance framework for the UOR Foundation's GitHub organisational space (`github.com/UOR-Foundation`). It defines the norms, standards, and operational procedures that govern how repositories are created, structured, maintained, versioned, reviewed, secured, and retired.

The UOR Foundation is building a foundational substrate protocol for the open internet. The GitHub organisation is where this substrate takes material form — as code, formal proofs, specifications, and documentation. The governance of this space must reflect the same rigour, determinism, and integrity that the Foundation demands of its technical outputs.

### 1.2 Scope

This framework applies to all repositories, teams, workflows, and artefacts under `github.com/UOR-Foundation`. Specifically:

- All public and private repositories, including forks and archives.
- All contributors: members, external collaborators, and automated systems (CI bots, deployment agents).
- All content: source code, formal proofs, documentation, configuration, media, and release artefacts.
- All lifecycle stages: proposal, creation, active development, maintenance, deprecation, archival, and re-activation.

### 1.3 Audience

This document is written for four audiences:

- **Organisation Owners** — structural decisions and compliance enforcement.
- **Repository Maintainers** — repository management and contribution review.
- **Contributors** (internal and external) — understanding expectations when submitting work.
- **Researchers and evaluators** — assessing the Foundation's governance maturity.

No prior knowledge of GitHub, version control, or software engineering is assumed. All technical terms are defined in the [Glossary (Section 2)](#2-glossary).

### 1.4 Authority & Amendments

This framework is maintained by the UOR Foundation's GitHub Organisation Owners. It is stored in the `.github` repository as the single source of truth. It is versioned using the same semantic versioning standard it mandates for all repositories ([Section 8](#8-version-management--releases)).

Amendments follow the change control procedure in [Section 7](#7-change-control--contribution-workflow) and the amendment process in [Section 15.3](#153-framework-amendment-process).

---

## 2. Glossary

| Term | Definition |
|------|------------|
| Branch | A parallel version of a repository's code, used to develop changes without affecting `main`. |
| Branch Protection | GitHub settings preventing direct pushes, force pushes, or merges without review on protected branches. |
| CI/CD | Continuous Integration / Continuous Delivery. Automated testing and deployment on every code change. |
| CODEOWNERS | A file mapping file paths to responsible reviewers. |
| Commit | A snapshot of changes with a unique hash, author, timestamp, and message. |
| Conventional Commits | Standardised commit format (e.g., `feat(atlas): add construction`) enabling automated changelogs. |
| DOI | Digital Object Identifier. A permanent, unique identifier for a published work. Used to make research outputs citable. |
| Fork | A copy of a repository under a different owner, used to propose changes. |
| GitHub Actions | GitHub's built-in automation platform. Used to run CI/CD pipelines, automated tests, and compliance checks. |
| GitHub Discussions | A forum feature within a GitHub organisation or repository. Used for proposals, Q&A, and governance decisions. |
| Issue | A tracked item (bug, feature, task) with number, labels, and assignees. |
| Lean 4 / Coq | Formal proof assistants — software tools that mathematically verify the correctness of proofs and code. Used in Tier 1 repositories. |
| Main Branch | The default, production-ready branch (named `main`). |
| Merge | The act of combining changes from one branch into another. In this framework, merges to `main` require a Pull Request and review. |
| Pull Request (PR) | A proposal to merge changes from one branch into another, including review. |
| Repository (Repo) | A storage space on GitHub containing a project's files, revision history, issues, and configuration. |
| SemVer | Semantic Versioning: `MAJOR.MINOR.PATCH` (see [semver.org](https://semver.org)). |
| Signed Commit | A commit cryptographically signed by its author, proving authenticity and integrity. |
| Squash-and-Merge | Merge strategy combining all branch commits into one clean commit on `main`. |
| Tag | A named reference to a specific commit, marking release points (e.g., `v1.0.0`). |
| Tier | Classification level (1–4) determining governance obligations. See [Section 5](#5-repository-classification). |
| Topic Tag | A keyword label applied to a GitHub repository for discoverability and categorisation. |
| Zenodo | An open-access repository hosted by CERN that assigns DOIs to research outputs, including software releases. |

---

## 3. Guiding Principles

Five non-negotiable principles underpin every standard in this framework.

### 3.1 Traceability

Every change, artefact, and decision must be attributable to a specific author, linked to a specific reason, and recorded in an immutable audit trail. Enforced by: signed commits, mandatory issue linkage, structured commit messages, annotated release tags, and changelogs.

### 3.2 Coherence

All repositories must form a self-consistent whole. No repository exists in isolation. Enforced by: organisation-level README as index, standardised topic tags, cross-repository dependency documentation, and consistent naming conventions.

### 3.3 Reversibility

Every operational action must be reversible without data loss. Enforced by: branch protection preventing force pushes, immutable release tags, documented deprecation procedures, and re-activation paths.

### 3.4 Verification

Every claim about correctness must be mechanically checkable. Enforced by: CI/CD on all PRs, formal proof verification for Tier 1, automated dependency and licence audits, and the compliance checklist.

### 3.5 Openness

Governance documents, decision rationales, and contribution processes are visible, documented, and accessible to anyone. Enforced by: public repositories by default, open Discussions, documented contribution guidelines, and this governance document.

### 3.6 Traceability Matrix

| Principle | Sec 4 | Sec 5 | Sec 6 | Sec 7 | Sec 8 | Sec 9 | Sec 10 | Sec 11 | Sec 12 | Sec 13 | Sec 14 | Sec 15 |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Traceability | | | ✓ | ✓ | ✓ | | | | | | | ✓ |
| Coherence | | | ✓ | | | | ✓ | | | | | ✓ |
| Reversibility | | | ✓ | ✓ | ✓ | | | ✓ | | | | |
| Verification | | | ✓ | | | ✓ | | | ✓ | | | ✓ |
| Openness | ✓ | ✓ | ✓ | | | | | | | ✓ | ✓ | |

---

## 4. Roles, Teams & Escalation

### 4.1 Roles

| Role | Permissions | Responsibilities | Min Count |
|------|-------------|-----------------|-----------|
| **Organisation Owner** | Full administrative control. | Approve repos and tiers. Approve governance amendments. Manage teams. Final escalation. | 2 (continuity) |
| **Repository Maintainer** | Admin on assigned repos. | Enforce standards. Triage issues. Review and merge. Manage releases. Maintain CODEOWNERS. | 1 per active repo |
| **Core Contributor** | Write access to assigned repos. | Develop code, proofs, docs. Follow conventions. Maintain test coverage. | No minimum |
| **External Contributor** | Fork access only. | Follow CONTRIBUTING.md. Sign off commits. Read onboarding guide before first contribution. | No minimum |
| **Automated Agent** | Workflow-defined. | Run tests, linters, compliance checks. Publish releases. Post status checks. | 1 CI system per T1–2 |

### 4.2 Teams

| Team | Scope | Access |
|------|-------|--------|
| `@UOR-Foundation/owners` | All repositories | Owner |
| `@UOR-Foundation/core-math` | Tier 1 (formal theory, proofs) | Maintain |
| `@UOR-Foundation/core-engineering` | Tier 2 (implementations) | Maintain |

### 4.3 Decision-Making

- **Operational decisions** (merging PRs, triaging issues): Repository Maintainer.
- **Structural decisions** (new repos, tier changes, governance amendments): Proposal filed as Discussion in `.github` → 7-day review → approval by 2 Owners → recorded in governance changelog.

### 4.4 Escalation

| Situation | Action | Timeline |
|-----------|--------|----------|
| PR review not started | Contributor pings CODEOWNERS. If no response after 2 more business days, escalate to Maintainer. | Target + 2 days |
| Technical disagreement | Both parties document positions. Maintainer decides. If Maintainer is a party, escalate to Owners. | 5 business days |
| Maintainer unresponsive | Escalation Discussion in `.github`. Owners reassign. | 14-day trigger |
| Governance amendment disputed | Extended 21-day review. If no consensus, Owners vote (majority decides). | 21 days |
| Code of Conduct violation | Report via SECURITY.md. Owners investigate within 72 hours. Outcomes: warning, temp ban, permanent ban. | 72-hour response |

---

## 5. Repository Classification

### 5.1 Tier Definitions

| Tier | Name | Description | Governance Level |
|------|------|-------------|-----------------|
| 1 | **Core Foundation** | Formal theory, verified computation, algebraic foundations, canonical specifications. | Maximum: multi-reviewer, signed commits, formal verification, DOI. |
| 2 | **Implementation** | Prototype software, compute stacks, reference implementations. | High: required reviews, CI/CD, SemVer, structured docs. |
| 3 | **Presentation** | Documentation sites, visualisations, educational content. | Standard: required reviews, basic CI. |
| 4 | **Experimental** | Early-stage experiments, archived work, forks awaiting resolution. | Baseline: README, LICENSE, status label. |

### 5.2 Assignment & Reclassification

1. Proposer recommends a tier when creating a repository ([Section 11](#11-repository-lifecycle-management)).
2. Organisation Owners approve.
3. Tiers are reviewed quarterly ([Section 15](#15-compliance--auditing)).
4. A tier change automatically changes compliance obligations across Sections 6–12 and 15.

---

## 6. Repository Standards

### 6.1 Required Files

| Item | Description | T1 | T2 | T3 | T4 |
|------|-------------|:---:|:---:|:---:|:---:|
| README.md | Purpose, build instructions, badges, UOR relationship. | Req | Req | Req | Req |
| LICENSE | MIT by default. Deviation requires Owner approval. | Req | Req | Req | Req |
| CONTRIBUTING.md | Dev setup, PR process, commit conventions. | Req | Req | Rec | Opt |
| CODE_OF_CONDUCT.md | Contributor Covenant v2.1. | Req | Req | Rec | Opt |
| SECURITY.md | Vulnerability reporting with contact and response time. | Req | Req | Opt | Opt |
| CHANGELOG.md | Human-readable per-version log. Refs PR/Issue. | Req | Req | Rec | Opt |
| CITATION.cff | Machine-readable citation. DOI when available. | Req | Rec | Opt | Opt |
| .github/CODEOWNERS | Maps file paths to reviewers. | Req | Req | Opt | Opt |
| .github/pull_request_template.md | PR checklist ([Appendix B](#appendix-b-pull-request-review-checklist)). | Req | Req | Rec | Opt |
| .github/ISSUE_TEMPLATE/ | Bug, feature, question templates. | Req | Rec | Opt | Opt |
| .github/workflows/ | CI/CD: lint, test, build on every PR. | Req | Req | Rec | Opt |
| .gitignore | Excludes build artefacts, secrets, env files. | Req | Req | Req | Req |

**Req** = Required · **Rec** = Recommended · **Opt** = Optional

### 6.2 Branch Protection Rules

| Rule | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|------|:---:|:---:|:---:|:---:|
| Require PR before merging | Yes | Yes | Yes | Rec |
| Required approving reviews | 2 | 1 | 1 | — |
| Dismiss stale reviews on new push | Yes | Yes | Rec | — |
| Require signed commits | Yes | Rec | Opt | — |
| Require status checks to pass | Yes | Yes | Yes | — |
| Require branch to be up to date | Yes | Yes | Rec | — |
| Restrict pushes to main | Maintainers only | Maintainers only | Maintainers only | — |
| Allow force pushes | Never | Never | Never | — |
| Allow deletion of main | Never | Never | Never | — |

---

## 7. Change Control & Contribution Workflow

### 7.1 Standard Workflow

| Stage | Action | Who | Output |
|-------|--------|-----|--------|
| 1 | **Identify** — File a GitHub Issue. | Any contributor | Issue using template |
| 2 | **Plan** — Scope, assign, link to project board. | Contributor + Maintainer | Labelled, assigned Issue |
| 3 | **Branch** — Create from `main`. | Contributor | `feat/{issue#}-{desc}` |
| 4 | **Develop** — Small, logical commits. | Contributor | Commits on branch |
| 5 | **Submit** — PR against `main` using template. | Contributor | Open PR linking Issue |
| 6 | **Review** — Peers + CODEOWNERS + CI. | Reviewers + CI | Approved PR, checks pass |
| 7 | **Merge** — Squash-and-merge. Issue auto-closes. | Maintainer | Merged commit on `main` |

### 7.2 Branch Naming

```
feat/{issue#}-{description}
fix/{issue#}-{description}
docs/{issue#}-{description}
chore/{issue#}-{description}
proof/{issue#}-{description}
```

### 7.3 Commit Messages

[Conventional Commits v1.0.0](https://www.conventionalcommits.org/): `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `proof`, `ci`, `perf`

### 7.4 Emergency / Hotfix Procedure

For critical bugs or security vulnerabilities requiring immediate remediation:

1. **Declare** — Notify Maintainer + Owner. Label issue `critical`.
2. **Branch** — `fix/{issue#}-{desc}` from `main`.
3. **Fix** — Minimal change to resolve.
4. **Review** — At least 1 reviewer. CI must pass. 4-hour availability window.
5. **Merge** — Squash-and-merge. Patch release tagged immediately.
6. **Document** — Within 48 hours: retroactive Issue, CHANGELOG update, post-incident note (root cause, fix, prevention).

---

## 8. Version Management & Releases

### 8.1 Semantic Versioning

All Tier 1–2 repositories follow [SemVer 2.0.0](https://semver.org/):

| Component | Increment When |
|-----------|---------------|
| **MAJOR** | Incompatible API changes, removal of deprecated features. |
| **MINOR** | New backward-compatible functionality. |
| **PATCH** | Backward-compatible bug fixes, doc corrections. |

### 8.2 Release Procedure

1. All targeted PRs merged. CI green on `main`. CHANGELOG updated.
2. Create annotated tag: `git tag -a v1.2.3 -m "Release v1.2.3: summary"`
3. Push tag. Create GitHub Release with notes and artefacts.
4. Tier 1: Submit to Zenodo for DOI. Update CITATION.cff.
5. Announce in GitHub Discussions.

### 8.3 Changelog Standard

Follow [Keep a Changelog](https://keepachangelog.com/). Categories: Added, Changed, Deprecated, Removed, Fixed, Security. Every entry references a PR or Issue.

---

## 9. Peer Review & Quality Assurance

### 9.1 Review Requirements by Tier

| Aspect | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|--------|
| Minimum reviewers | 2 (incl. 1 CODEOWNER) | 1 (CODEOWNER pref.) | 1 | 0 (self-merge ok) |
| Formal proof verification | Required (Lean 4 / Coq) | If applicable | N/A | N/A |
| CI status checks | All must pass | All must pass | All must pass | Recommended |
| Documentation review | Required | Required | Required | Optional |
| Review turnaround target | 3 business days | 5 business days | 7 business days | — |

If the review turnaround target is exceeded, the escalation path in [Section 4.4](#44-escalation) applies.

### 9.2 Review Checklist

See [Appendix B](#appendix-b-pull-request-review-checklist).

### 9.3 Automated Quality Gates

| Check | Tool | T1 | T2 | T3 |
|-------|------|:---:|:---:|:---:|
| Formatting | rustfmt / prettier / black | Req | Req | Rec |
| Linting | clippy (pedantic) / eslint / flake8 | Req | Req | Rec |
| Unit tests | cargo test / pytest / jest | Req | Req | Req |
| Integration tests | Repo-specific | Req | Req | Rec |
| Doc build | rustdoc / typedoc / sphinx | Req | Req | Opt |
| Proof compilation | Lean 4 (`lake build`) / Coq | Req (if applicable) | If applicable | N/A |
| Dependency audit | cargo audit / npm audit | Weekly + on PR | Weekly | Monthly |
| Licence scan | REUSE / licence-checker | Monthly | Monthly | Quarterly |

---

## 10. Cross-Repository Coherence

### 10.1 Organisation-Level README

The `.github` repository contains a `profile/README.md` serving as the organisation's landing page. It must include a categorised table of all active repositories (grouped by tier), links to this governance framework, and links to the contributing guidelines and code of conduct. It is updated whenever a repository is created, archived, or reclassified.

### 10.2 Topic Tags

| Category | Required Tags | When |
|----------|--------------|------|
| Identity | `uor`, `uor-foundation` | Every repository |
| Tier | `tier-1-core`, `tier-2-impl`, `tier-3-presentation`, `tier-4-experimental` | Exactly one per repo |
| Domain | `math`, `cryptography`, `computation`, `visualisation`, `documentation`, `governance`, `protocol` | All that apply |
| Technology | `rust`, `python`, `typescript`, `lean4`, `coq`, `latex` | Primary languages |
| Status | `active`, `maintenance`, `deprecated`, `archived` | Exactly one per repo |

### 10.3 Naming Conventions

- All lowercase with hyphens. Preferred: `uor-{domain}-{function}` (e.g., `uor-math-formalization`).
- No version numbers in repo names (use tags).
- Forks retain original name with clear README note explaining relationship to upstream.

### 10.4 Fork & Upstream Policy

Forks introduce governance complexity. The following rules apply:

- **When to fork vs. branch**: Fork only when the variant will diverge significantly from upstream and serve a distinct purpose. For incremental improvements, contribute to the original via PR.
- **Upstream sync**: If the fork is intended to stay aligned with upstream, the Maintainer must sync at least monthly and document the sync in the CHANGELOG.
- **Fork retirement**: When a fork's purpose is fulfilled (changes merged upstream or project archived), the fork follows the deprecation procedure ([Section 11.3](#113-deprecation)).
- **Current forks**: Hologram-APEX (fork of atlas-embeddings) must document its divergence purpose in its README and declare its upstream sync policy.

### 10.5 Dependency Documentation

- **Code dependencies**: Declared in package manifest (`Cargo.toml`, `package.json`). Pin to specific versions, never "latest."
- **Conceptual dependencies**: Documented in README under "Relationship to UOR." All repositories implementing or extending the [UOR Framework](https://github.com/UOR-Foundation/UOR-Framework) must reference the specific ontology namespaces and classes they depend on (see the [UOR ontology](https://uor-foundation.github.io/UOR-Framework/)).
- **Shared workflows**: Stored in `.github` repo, referenced via `uses: UOR-Foundation/.github/.github/workflows/shared.yml@main`.

---

## 11. Repository Lifecycle Management

### 11.1 Lifecycle Stages

| Stage | Description | Entry | Exit |
|-------|-------------|-------|------|
| Proposal | Idea stage. Not yet a repository. | Discussion filed in `.github`. | Approved by 2 Owners. |
| Active Development | Primary work phase. | Repository created from template. | Maintainer declares feature-complete or shifts focus. |
| Maintenance | Bug fixes and security patches only. | Status change Discussion. | Maintainer proposes deprecation. |
| Deprecation | 90-day transition period. | Deprecation Discussion approved. | 90 days elapsed. Dependents migrated. |
| Archival | Read-only. Permanent record. | Archival Discussion approved. | Terminal (or re-activation). |

### 11.2 Creating a New Repository

1. File Discussion in `.github` with: name, purpose, relationship to existing repos, proposed tier, proposed maintainer(s).
2. Open for comment for 7 days.
3. Approved by 2 Owners.
4. Created from template repo ([Appendix D](#appendix-d-template-repository-manifest)). Branch protection per tier. Topic tags applied.
5. Announced in Discussions. Organisation README updated.

### 11.3 Deprecation

1. Prominent "DEPRECATED" banner in README with link to successor.
2. Stop accepting new Issues and PRs. Pin an explanatory Issue.
3. Update dependent repos to point to successor.
4. 90-day waiting period before archival.

### 11.4 Archival & Re-activation

- Final release tag with CHANGELOG entry documenting rationale. Repository set to "Archived."
- Archived repositories are never deleted.
- Re-activation requires 2 Owner approvals and compliance with current [Section 6](#6-repository-standards) standards before new work is merged.

### 11.5 Emergency Archival

A single Owner may archive immediately if a repository poses an immediate risk (exposed secrets, licence violation). Retroactive Discussion filed within 48 hours.

---

## 12. Security & Incident Response

Full policy: [SECURITY.md](/SECURITY.md).

### 12.1 Vulnerability Disclosure

Tier 1–2 repositories must include SECURITY.md. Reports must use private channels (GitHub Security Advisories or email) — never public Issues.

### 12.2 Incident Response Procedure

1. **Acknowledge** — Receipt within 24 hours.
2. **Triage** — Severity assessed (Critical / High / Medium / Low) within 48 hours.
3. **Remediate** — Fix developed using the [Emergency Procedure (Section 7.4)](#74-emergency--hotfix-procedure). Critical and High vulnerabilities patched within 7 days.
4. **Release** — Patch release published. Affected versions noted in GitHub Security Advisory.
5. **Disclose** — After patch available, advisory made public with credit to reporter.
6. **Review** — Post-incident review within 14 days, documented in a Discussion.

### 12.3 Response Timelines

| Severity | Acknowledge | Triage | Patch Released | Disclosure |
|----------|:-----------:|:------:|:--------------:|:----------:|
| Critical | 24 hours | 24 hours | 72 hours | After patch |
| High | 24 hours | 48 hours | 7 days | After patch |
| Medium | 48 hours | 5 days | 30 days | After patch |
| Low | 5 days | 14 days | Next release | With notes |

---

## 13. Intellectual Property & Licensing

### 13.1 Default Licence

MIT. Chosen for simplicity, permissiveness, and compatibility with academic and commercial use.

### 13.2 Exceptions

Different licence requires Discussion in `.github`, rationale, and 2 Owner approvals. Documented in repository README. Current exception: [UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework) uses Apache-2.0.

### 13.3 Contributor Expectations

By submitting a PR, the contributor represents they have the right to licence their contribution under the repository's licence and that it does not infringe third-party IP. Documented in CONTRIBUTING.md. No formal CLA is currently required.

### 13.4 Third-Party Dependencies

All dependencies must carry licences compatible with MIT. Monthly licence compliance scan verifies this. Incompatible dependencies must be replaced before the next release.

---

## 14. Contributor Onboarding

### 14.1 Before You Start

1. Read this governance framework (Sections 2, 3, 7).
2. Read [CONTRIBUTING.md](/CONTRIBUTING.md) for the repository you wish to contribute to.
3. Read [CODE_OF_CONDUCT.md](/CODE_OF_CONDUCT.md).
4. Review the repository's README, open Issues, and recent PRs.

### 14.2 Your First Contribution

1. Find an issue labelled `good first issue` or `help wanted`.
2. Comment your intent. Wait for Maintainer acknowledgement.
3. Fork the repository.
4. Create a branch following naming conventions ([Section 7.2](#72-branch-naming)).
5. Make changes following commit standards ([Section 7.3](#73-commit-messages)).
6. Open a PR using the template. Complete the checklist ([Appendix B](#appendix-b-pull-request-review-checklist)). Link the Issue.
7. Respond constructively to review feedback.

### 14.3 Getting Help

Post in the repository's Discussion tab or [organisation-level Discussions](https://github.com/orgs/UOR-Foundation/discussions).

---

## 15. Compliance & Auditing

### 15.1 Audit Schedule

| Audit | Frequency | Scope | Owner | Output |
|-------|-----------|-------|-------|--------|
| Repo structure | Monthly (auto) | All repos: files, protection, tags ([Appendix A](#appendix-a-repository-compliance-checklist)). | CI bot | Report in Discussions |
| Dependency security | Weekly (auto) | Tier 1–2: cargo audit / npm audit. | CI bot | Issue auto-filed |
| Licence compliance | Monthly (auto) | All repos: REUSE / licence-checker. | CI bot | Report + Issue |
| Governance review | Quarterly (manual) | Full framework. | Owners | Changelog entry |
| Strategic review | Annually (manual) | Tiers, lifecycle, effectiveness, community health. | Owners + Maintainers | New framework version |

### 15.2 Compliance Metrics

- Structure compliance rate: % of repos passing automated audit.
- PR review turnaround: Median time from PR to first review.
- CI pass rate: % of PRs where all checks pass on first attempt.
- Issue resolution time: Median time from creation to closure.
- Dependency freshness: % of dependencies within one minor version of latest.
- Changelog completeness: % of releases with complete CHANGELOG entries.

### 15.3 Framework Amendment Process

1. Any contributor may propose an amendment via Discussion in `.github`.
2. Amendments are reviewed against the five guiding principles.
3. The traceability matrix ([Section 3.6](#36-traceability-matrix)) must be updated if enforcement coverage changes.
4. Approved amendments are merged and the framework version incremented.
5. The annual strategic review is the formal opportunity for structural changes.

---

## 16. Implementation Roadmap

| Phase | Timeline | Objective | Key Actions |
|-------|----------|-----------|-------------|
| 1 | Wks 1–2 | Foundation | Create template repo ([Appendix D](#appendix-d-template-repository-manifest)). Update `.github` org README. Enable branch protection on Tier 1. Apply tier and status tags to all repos. |
| 2 | Wks 3–4 | Standardise | Audit all repos against [Section 6](#6-repository-standards) (use [Appendix A](#appendix-a-repository-compliance-checklist)). Add missing files. Configure shared CI workflows. Enable org-level Discussions. Apply naming conventions. |
| 3 | Wks 5–8 | Enforce | Deploy monthly compliance scan. Configure Conventional Commits enforcement. Set up Zenodo for Tier 1. Create CODEOWNERS for Tier 1–2. Publish onboarding guide ([Section 14](#14-contributor-onboarding)). |
| 4 | Ongoing | Evolve | Quarterly governance reviews. Annual strategic review. Archive inactive repos. Promote experimental repos. Refine metrics. |

### 16.1 Immediate Actions (Week 1)

1. Apply topic tags to all repositories.
2. Enable branch protection on all Tier 1 and 2 repos.
3. Update `.github` profile README with full repo index.
4. Add LICENSE to any repo missing one.
5. Create template repository from [Appendix D](#appendix-d-template-repository-manifest).

---

## Appendix A: Repository Compliance Checklist

| # | Item | Criteria | Tiers |
|---|------|----------|-------|
| 1 | README.md | Present, non-empty, follows [Section 6](#6-repository-standards) structure. | All |
| 2 | LICENSE | Present, MIT (or approved exception per [Section 13](#13-intellectual-property--licensing)). | All |
| 3 | CONTRIBUTING.md | Present. Describes workflow, commit conventions. | T1–2 |
| 4 | CODE_OF_CONDUCT.md | Present. Contributor Covenant v2.1. | T1–2 |
| 5 | SECURITY.md | Present. Contact method and response time. | T1–2 |
| 6 | CHANGELOG.md | Present. Entries for each release. | T1–2 |
| 7 | CODEOWNERS | Present. Maps paths to reviewers. | T1–2 |
| 8 | PR template | Present. Includes review checklist. | T1–2 |
| 9 | Issue templates | Present. Bug, feature, question. | T1 |
| 10 | CI workflows | Present. Runs on PR. | T1–2 |
| 11 | Branch protection | Enabled per [Section 6.2](#62-branch-protection-rules) for assigned tier. | T1–3 |
| 12 | Topic tags | All required tags present ([Section 10.2](#102-topic-tags)). | All |
| 13 | .gitignore | Present, appropriate for tech stack. | All |
| 14 | CITATION.cff | Present. Valid metadata. | T1 |

---

## Appendix B: Pull Request Review Checklist

This checklist is implemented in [`.github/pull_request_template.md`](/.github/pull_request_template.md).

| Item | Criteria | Tiers |
|------|----------|-------|
| Linked Issue | PR references an Issue (`Closes #___`). | All |
| Description | PR explains what changed and why. | All |
| Tests | New/updated tests cover changes. All pass. | T1–3 |
| CI Passing | All automated checks green. | T1–3 |
| Documentation | Public API changes documented. README updated. | T1–2 |
| CHANGELOG | Entry added. | T1–2 |
| Compatibility | No breaking changes, or `BREAKING CHANGE` documented. | T1–2 |
| Security | No secrets committed. Dependencies audited. | T1–2 |
| Proof Verification | Lean 4 / Coq compiles with zero sorrys. | T1 proofs |
| Commit History | Conventional Commits followed. History clean. | T1–2 |

---

## Appendix C: Repository Inventory

All repositories as of February 2026. Refreshed quarterly ([Section 15](#15-compliance--auditing)).

| Repository | Tier | Language | Status | Stars | Open Issues |
|------------|------|----------|--------|:-----:|:-----------:|
| [UOR-Framework](https://github.com/UOR-Foundation/UOR-Framework) | 1: Core | Rust | Active | 0 | 0 |
| [atlas-embeddings](https://github.com/UOR-Foundation/atlas-embeddings) | 1: Core | Rust | Active | 22 | 2 |
| [math](https://github.com/UOR-Foundation/math) | 1: Core | TeX | Active | — | 0 |
| [UOR-H1-HPO-Candidate](https://github.com/UOR-Foundation/UOR-H1-HPO-Candidate) | 1: Core | TeX/Coq | Active | — | — |
| [OOO](https://github.com/UOR-Foundation/OOO) | 1: Core | TeX | Active | — | — |
| [hologram-prototypes-1](https://github.com/UOR-Foundation/hologram-prototypes-1) | 2: Impl | Rust | Active | 6 | 98 |
| [Hologram-APEX](https://github.com/UOR-Foundation/Hologram-APEX) | 2: Impl | Rust | Active (fork) | 1 | 0 |
| [hologram-archive](https://github.com/UOR-Foundation/hologram-archive) | 2: Impl | Python | Maintenance | 1 | 2 |
| [sigmatics](https://github.com/UOR-Foundation/sigmatics) | 2: Impl | TypeScript | Active | 3 | 0 |
| [uorcontent](https://github.com/UOR-Foundation/uorcontent) | 2: Impl | TypeScript | Maintenance | — | 5 |
| [.github](https://github.com/UOR-Foundation/.github) | 3: Pres | — | Active | — | 0 |
| [website](https://github.com/UOR-Foundation/website) | 3: Pres | TypeScript | Active | — | 0 |
| [Math-Universe-Vis](https://github.com/UOR-Foundation/Math-Universe-Vis) | 3: Pres | HTML | Maintenance | — | 0 |
| [CS](https://github.com/UOR-Foundation/CS) | 3: Pres | HTML | Maintenance | — | 0 |
| (remaining repos) | 4: Exp | Various | Evaluate | — | — |

---

## Appendix D: Template Repository Manifest

All new repositories are created from the organisation template, which contains:

| File | Contents | Notes |
|------|----------|-------|
| README.md | Skeleton with badge placeholders, section headers, UOR relationship. | Maintainer fills specifics. |
| LICENSE | MIT, pre-filled with UOR Foundation as copyright holder. | Change only with Owner approval ([Section 13](#13-intellectual-property--licensing)). |
| CONTRIBUTING.md | Generic guide referencing this governance framework. | Maintainer may add repo-specifics. |
| CODE_OF_CONDUCT.md | Contributor Covenant v2.1. | Do not modify. |
| SECURITY.md | Template with placeholder contact and 24-hour acknowledgement. | Maintainer fills contact details. |
| CHANGELOG.md | Empty with `## [Unreleased]` header. | Entries added per release. |
| .github/CODEOWNERS | Template with instructions. | Must be populated before first PR. |
| .github/pull_request_template.md | Full PR checklist from [Appendix B](#appendix-b-pull-request-review-checklist). | Pre-populated. |
| .github/ISSUE_TEMPLATE/bug_report.md | Structured bug report. | Pre-populated. |
| .github/ISSUE_TEMPLATE/feature_request.md | Structured feature request. | Pre-populated. |
| .github/ISSUE_TEMPLATE/question.md | Question template directing to Discussions. | Pre-populated. |
| .github/workflows/ci.yml | Minimal CI workflow: lint, test, build. | Maintainer configures for language. |
| .gitignore | Composite for Rust, Python, TypeScript, Node.js, TeX. | Maintainer prunes as needed. |
| CITATION.cff | Skeleton with placeholders. | Required for Tier 1. |

---

*UOR Foundation · [github.com/UOR-Foundation](https://github.com/UOR-Foundation) · [uor.foundation](https://uor.foundation)*

*This framework is version-controlled in `.github/governance/` and governed by its own change control process ([Section 7](#7-change-control--contribution-workflow)).*
